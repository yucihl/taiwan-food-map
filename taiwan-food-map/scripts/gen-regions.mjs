// 由 assets/geo/taiwan-towns.topo.json 產生 _data/regions.json
// 用法：node scripts/gen-regions.mjs（需要先 npm install）
// 只有在行政區劃變動時才需要重跑；平常新增店家不用執行。
import fs from 'node:fs';
import { feature } from 'topojson-client';

const topo = JSON.parse(fs.readFileSync('assets/geo/taiwan-towns.topo.json', 'utf8'));
const towns = feature(topo, topo.objects.towns).features;
const counties = feature(topo, topo.objects.counties).features;

const norm = (s) => s.replace(/台/g, '臺');

// 區域與縣市順序（國發會區域劃分＋離島）
const REGIONS = [
  { id: 'north', name: '北部', cities: ['臺北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'] },
  { id: 'central', name: '中部', cities: ['苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣'] },
  { id: 'south', name: '南部', cities: ['嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣'] },
  { id: 'east', name: '東部', cities: ['花蓮縣', '臺東縣'] },
  { id: 'islands', name: '離島', cities: ['澎湖縣', '金門縣', '連江縣'] },
];
const CITY_SLUG = {
  '臺北市': 'taipei', '新北市': 'new-taipei', '基隆市': 'keelung', '桃園市': 'taoyuan',
  '新竹市': 'hsinchu-city', '新竹縣': 'hsinchu-county', '宜蘭縣': 'yilan', '苗栗縣': 'miaoli',
  '臺中市': 'taichung', '彰化縣': 'changhua', '南投縣': 'nantou', '雲林縣': 'yunlin',
  '嘉義市': 'chiayi-city', '嘉義縣': 'chiayi-county', '臺南市': 'tainan', '高雄市': 'kaohsiung',
  '屏東縣': 'pingtung', '花蓮縣': 'hualien', '臺東縣': 'taitung', '澎湖縣': 'penghu',
  '金門縣': 'kinmen', '連江縣': 'lienchiang',
};

function bbox(geom) {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (c) => {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else c.forEach(walk);
  };
  walk(geom.coordinates);
  return [minY, minX, maxY, maxX]; // [south, west, north, east]
}
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const slugify = (eng) => eng.replace(/\s+(District|Township|City|County)$/i, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const out = { regions: [] };
for (const r of REGIONS) {
  const region = { id: r.id, name: r.name, cities: [] };
  for (const cityName of r.cities) {
    const cf = counties.find((f) => norm(f.properties.COUNTYNAME) === cityName);
    if (!cf) throw new Error('找不到縣市 ' + cityName);
    const b = bbox(cf.geometry);
    const districts = towns
      .filter((f) => norm(f.properties.COUNTYNAME) === cityName)
      .map((f) => {
        const tb = bbox(f.geometry);
        return {
          name: norm(f.properties.TOWNNAME),
          slug: slugify(f.properties.TOWNENG),
          bounds: tb.map(r5),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant-TW'));
    region.cities.push({
      name: cityName,
      slug: CITY_SLUG[cityName],
      bounds: b.map(r5),
      districts,
    });
  }
  out.regions.push(region);
}
fs.writeFileSync('_data/regions.json', JSON.stringify(out, null, 1) + '\n');
console.log('寫入 _data/regions.json：', out.regions.map((r) => `${r.name} ${r.cities.length} 縣市`).join('、'));
