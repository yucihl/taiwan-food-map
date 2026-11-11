// 開發工具：檢查店家檔，並產生「單一檔案」的預覽版網站。
//   npm run check    → 只檢查 _shops/*.md 的格式，列出警告
//   npm run preview  → 檢查＋輸出 preview/index.html（所有 CSS/JS/資料都內嵌，可直接用瀏覽器打開）
// 正式網站不需要這支程式：GitHub Pages 會用 Jekyll 自動產生 api/*.json。
// 這裡模擬的是 api/shops.json、api/meta.json 的輸出格式，兩邊要保持一致。
import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CHECK_ONLY = process.argv.includes('--check');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const FIELDS = ['name', 'branch', 'status', 'address', 'zip', 'city', 'district', 'lat', 'lng', 'coords_approx',
  'price_level', 'price_note', 'rating', 'tags', 'hours', 'hours_checked', 'dishes', 'photos', 'visited', 'updated', 'links'];

const tags = JSON.parse(read('_data/tags.json'));
const regions = JSON.parse(read('_data/regions.json')).regions;
const tagNames = new Set(tags.map((t) => t.name));
const cityNames = new Set(regions.flatMap((r) => r.cities.map((c) => c.name)));

// js-yaml 會把日期轉成 Date；Jekyll 的 jsonify 輸出是 "YYYY-MM-DD"
const plain = (v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v === undefined ? null : v;
};

const warnings = [];
const warn = (file, msg) => warnings.push(`  ⚠️  ${file}：${msg}`);

const shops = [];
for (const file of fs.readdirSync(path.join(ROOT, '_shops')).filter((f) => f.endsWith('.md')).sort()) {
  const src = read('_shops/' + file);
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) { warn(file, '找不到 front matter（檔案開頭要是 ---）'); continue; }
  let data;
  try {
    data = yaml.load(m[1]) || {};
  } catch (e) {
    warn(file, 'YAML 格式錯誤：' + e.message.split('\n')[0]);
    continue;
  }
  const slug = file.replace(/\.md$/, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) warn(file, '檔名只能用小寫英文、數字和 -');
  if (data.slug && data.slug !== slug) warn(file, `front matter 的 slug「${data.slug}」和檔名不同（以檔名為準）`);
  for (const t of [].concat(data.tags || [])) {
    if (!tagNames.has(t)) warn(file, `標籤「${t}」還沒登記在 _data/tags.json`);
    if (/\p{Extended_Pictographic}/u.test(String(t))) warn(file, `標籤「${t}」不要包含 emoji`);
  }
  if (data.city && !cityNames.has(String(data.city).replace(/台/g, '臺'))) warn(file, `city「${data.city}」不在 regions.json`);
  if (data.rating !== undefined && data.rating !== null && !(Number.isInteger(data.rating) && data.rating >= 1 && data.rating <= 5)) warn(file, 'rating 要是 1–5 的整數');
  if (data.price_level !== undefined && data.price_level !== null && !(Number.isInteger(data.price_level) && data.price_level >= 1 && data.price_level <= 4)) warn(file, 'price_level 要是 1–4 的整數');
  if (data.lat != null && (data.lat < 21.7 || data.lat > 26.6)) warn(file, 'lat 超出台灣範圍');
  if (data.lng != null && (data.lng < 117.8 || data.lng > 122.6)) warn(file, 'lng 超出台灣範圍');
  if (data.lat == null || data.lng == null) warn(file, '沒有座標，地圖上不會顯示（不影響其他功能）');
  for (const p of [].concat(data.photos || [])) {
    const f = typeof p === 'string' ? p : p && p.file;
    if (f && !fs.existsSync(path.join(ROOT, 'assets/images/shops', slug, f))) warn(file, `找不到照片 assets/images/shops/${slug}/${f}`);
    if (p && typeof p === 'object' && !p.alt) warn(file, `照片 ${f} 沒有 alt 說明`);
  }
  const shop = { slug };
  for (const f of FIELDS) shop[f] = plain(data[f]);
  shop.body = marked.parse(m[2] || '').trim();
  shops.push(shop);
}

console.log(`讀取 ${shops.length} 間店家`);
console.log(warnings.length ? warnings.join('\n') : '  ✅ 沒有問題');
if (CHECK_ONLY) process.exit(0);

/* —— 產生單一檔案預覽 —— */
const now = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const meta = { title: '我的台灣美食圖鑑', built: now, tags, regions };
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const towns = read('assets/geo/taiwan-towns.topo.json');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="(assets\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}\n</style>`);
html = html.replace(/<script src="(assets\/[^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p).replace(/<\/script/gi, '<\\/script')}\n</script>`);
html = html.replace('<!-- 載入順序很重要',
  `<script>window.FOODMAP_PREVIEW = true;\nwindow.FOODMAP_DATA = ${json({ shops, meta })};\nwindow.FOODMAP_TOWNS = ${towns.trim()};</script>\n  <!-- 載入順序很重要`);

fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'preview/index.html'), html);
console.log(`輸出 preview/index.html（${(html.length / 1024).toFixed(0)} KB）`);
