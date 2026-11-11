/* data.js — 讀取 api/shops.json 與 api/meta.json，並把每間店整理成統一格式。
 * 店家檔的所有欄位都是選填，這裡負責補上預設值、從地址推算縣市與區。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const { norm, isBlank } = FM.util;

  const FALLBACK_TAG = { emoji: '🏷️', color: '#A68A64', group: '其他', preset: false };
  const DEFAULT_TAG = { name: '美食', emoji: '🍽️', color: '#D9822B', group: '其他' };
  const TW_BOUNDS = { s: 21.7, w: 117.8, n: 26.6, e: 122.6 };

  async function fetchJson(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path} 讀取失敗（${res.status}）`);
    return res.json();
  }

  async function loadRaw() {
    // 預覽版會把資料直接塞在 window.FOODMAP_DATA，正式站從 api/ 讀取
    if (window.FOODMAP_DATA) return window.FOODMAP_DATA;
    const [shops, meta] = await Promise.all([fetchJson('api/shops.json'), fetchJson('api/meta.json')]);
    return { shops, meta };
  }

  function buildIndex(meta) {
    const cities = new Map(); // 縣市名 → { city, region }
    const regions = meta.regions || [];
    for (const r of regions) {
      for (const c of r.cities) cities.set(c.name, { city: c, region: r });
    }
    const tags = new Map();
    for (const t of meta.tags || []) tags.set(t.name, t);
    // 依長度排序，避免「新竹市」被「新竹縣」之類的短字串誤判
    const cityNames = [...cities.keys()].sort((a, b) => b.length - a.length);
    return { regions, cities, cityNames, tags };
  }

  function tagObj(index, name) {
    return index.tags.get(name) || Object.assign({ name }, FALLBACK_TAG);
  }

  /** 從地址推算縣市與區（地址開頭可以有郵遞區號） */
  function inferPlace(index, address) {
    const a = norm(address).replace(/^\d{3,6}\s*/, '');
    for (const name of index.cityNames) {
      if (a.startsWith(name)) {
        const rest = a.slice(name.length);
        const { city } = index.cities.get(name);
        const d = city.districts.find((x) => rest.startsWith(x.name));
        return { city: name, district: d ? d.name : null };
      }
    }
    return { city: null, district: null };
  }

  function toNum(v) {
    if (isBlank(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function toList(v) {
    if (isBlank(v)) return [];
    if (Array.isArray(v)) return v.filter((x) => !isBlank(x));
    if (typeof v === 'string') return v.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
    return [];
  }

  function normalizeShop(index, raw) {
    const s = Object.assign({}, raw);
    s.slug = String(s.slug || '').trim();
    s.displayName = isBlank(s.name) ? '未命名店家' : String(s.name).trim();
    s.status = ['open', 'temp-closed', 'closed'].includes(s.status) ? s.status : 'open';

    // 位置：明確寫的優先，其次從地址推算
    const guess = inferPlace(index, s.address);
    s.city = isBlank(s.city) ? guess.city : norm(s.city).replace(/\s/g, '');
    s.district = isBlank(s.district) ? guess.district : norm(s.district).replace(/\s/g, '');
    const cityInfo = s.city ? index.cities.get(s.city) : null;
    if (!cityInfo) s.city = null;
    s.region = cityInfo ? cityInfo.region.id : null;
    if (cityInfo && s.district && !cityInfo.city.districts.some((d) => d.name === s.district)) {
      s.district = null;
    }

    s.lat = toNum(s.lat);
    s.lng = toNum(s.lng);
    s.hasCoords = s.lat !== null && s.lng !== null &&
      s.lat >= TW_BOUNDS.s && s.lat <= TW_BOUNDS.n && s.lng >= TW_BOUNDS.w && s.lng <= TW_BOUNDS.e;
    s.coords_approx = s.coords_approx === true || s.coords_approx === 'true';

    s.price_level = toNum(s.price_level);
    if (!(s.price_level >= 1 && s.price_level <= 4)) s.price_level = null;
    s.rating = toNum(s.rating);
    if (!(s.rating >= 1 && s.rating <= 5)) s.rating = null;

    s.tags = toList(s.tags).map(String);
    s.tagObjs = s.tags.map((t) => tagObj(index, t));
    s.primaryTag = s.tagObjs[0] || DEFAULT_TAG;

    s.dishes = toList(s.dishes).map((d) => (typeof d === 'string' ? { name: d } : d)).filter((d) => d && !isBlank(d.name));
    s.photos = toList(s.photos).map((p) => (typeof p === 'string' ? { file: p } : p)).filter((p) => p && !isBlank(p.file));
    s.links = toList(s.links).filter((l) => l && !isBlank(l.url));
    s.body = isBlank(s.body) ? '' : s.body;

    s.search = norm([
      s.name, s.branch, s.address, s.city, s.district,
      s.tags.join(' '), s.dishes.map((d) => d.name).join(' '),
    ].filter(Boolean).join(' '));
    return s;
  }

  async function load() {
    const raw = await loadRaw();
    const index = buildIndex(raw.meta);
    const shops = (raw.shops || []).filter((s) => s && s.slug).map((s) => normalizeShop(index, s));
    const bySlug = new Map(shops.map((s) => [s.slug, s]));
    FM.data = { shops, bySlug, index, meta: raw.meta, tagObj: (n) => tagObj(index, n), inferPlace: (a) => inferPlace(index, a) };
    return FM.data;
  }

  function photoUrl(shop, file) {
    return `assets/images/shops/${encodeURIComponent(shop.slug)}/${encodeURIComponent(file)}`;
  }

  FM.loadData = load;
  FM.photoUrl = photoUrl;
})();
