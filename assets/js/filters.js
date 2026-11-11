/* filters.js — 篩選、排序、搜尋建議、網址參數同步。
 * 規則：不同欄位之間是 AND，同一欄位內是 OR。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const { norm, isBlank } = FM.util;

  const SORTS = {
    rating: { label: '評分高→低', fn: (a, b) => (b.rating || 0) - (a.rating || 0) },
    visited: { label: '最近造訪', fn: (a, b) => String(b.visited || '').localeCompare(String(a.visited || '')) },
    updated: { label: '最近更新', fn: (a, b) => String(b.updated || '').localeCompare(String(a.updated || '')) },
    price: { label: '價位低→高', fn: (a, b) => (a.price_level || 9) - (b.price_level || 9) },
    name: { label: '店名', fn: (a, b) => a.displayName.localeCompare(b.displayName, 'zh-Hant-TW') },
  };

  function defaults() {
    return { region: '', city: '', district: '', tags: [], prices: [], q: '', sort: 'rating', showClosed: false };
  }

  function isDefault(st) {
    const d = defaults();
    return !st.region && !st.city && !st.district && !st.tags.length && !st.prices.length &&
      !st.q && st.sort === d.sort && !st.showClosed;
  }

  /** 檢查從 localStorage／網址讀來的狀態，丟掉已經不存在的值 */
  function sanitize(input) {
    const st = Object.assign(defaults(), input || {});
    const { index } = FM.data;
    const region = index.regions.find((r) => r.id === st.region);
    if (!region) st.region = '';
    const c = index.cities.get(st.city);
    if (!c || (st.region && c.region.id !== st.region)) st.city = '';
    if (!st.city || !c || !c.city.districts.some((d) => d.name === st.district)) st.district = '';
    st.tags = Array.isArray(st.tags) ? st.tags.filter((t) => typeof t === 'string' && t) : [];
    st.prices = Array.isArray(st.prices) ? st.prices.map(Number).filter((p) => p >= 1 && p <= 4) : [];
    st.q = typeof st.q === 'string' ? st.q.slice(0, 60) : '';
    if (!SORTS[st.sort]) st.sort = 'rating';
    st.showClosed = !!st.showClosed;
    return st;
  }

  function matches(s, st) {
    if (!st.showClosed && s.status === 'closed') return false;
    if (st.region && s.region !== st.region) return false;
    if (st.city && s.city !== st.city) return false;
    if (st.district && s.district !== st.district) return false;
    if (st.tags.length && !st.tags.some((t) => s.tags.includes(t))) return false;
    if (st.prices.length && !st.prices.includes(s.price_level)) return false;
    if (st.q) {
      const words = norm(st.q).split(/\s+/).filter(Boolean);
      if (!words.every((w) => s.search.includes(w))) return false;
    }
    return true;
  }

  function apply(shops, st) {
    const list = shops.filter((s) => matches(s, st));
    const sort = SORTS[st.sort] || SORTS.rating;
    return list.sort((a, b) => sort.fn(a, b) || a.displayName.localeCompare(b.displayName, 'zh-Hant-TW'));
  }

  /** 搜尋建議：地點（縣市、區）＋店家 */
  function suggest(q) {
    const nq = norm(q);
    if (!nq) return { places: [], shops: [] };
    const { index, shops } = FM.data;
    const places = [];
    for (const r of index.regions) {
      for (const c of r.cities) {
        const short = c.name.slice(0, -1); // 「臺北」也能找到「臺北市」
        if (c.name.includes(nq) || (nq.length >= 2 && short.includes(nq)) || c.slug.includes(nq)) {
          places.push({ type: 'city', region: r.id, city: c.name, label: c.name, sub: r.name });
        }
        for (const d of c.districts) {
          const dShort = d.name.length > 2 ? d.name.slice(0, -1) : d.name;
          if (d.name.includes(nq) || (nq.length >= 2 && dShort.includes(nq)) || (c.name + d.name).includes(nq) || d.slug === nq) {
            places.push({ type: 'district', region: r.id, city: c.name, district: d.name, label: `${c.name} ${d.name}`, sub: r.name });
          }
        }
      }
    }
    const words = nq.split(/\s+/).filter(Boolean);
    const shopHits = shops.filter((s) => words.every((w) => s.search.includes(w)));
    return { places: places.slice(0, 6), shops: shopHits.slice(0, 6) };
  }

  /* —— 網址同步：?region=north&city=臺北市&tags=宵夜,飲料 —— */
  function readUrl() {
    try {
      const p = new URLSearchParams(window.location.search);
      if (![...p.keys()].length) return null;
      const list = (k) => (p.get(k) ? p.get(k).split(',').filter(Boolean) : []);
      return {
        region: p.get('region') || '', city: p.get('city') || '', district: p.get('district') || '',
        tags: list('tags'), prices: list('price').map(Number), q: p.get('q') || '',
        sort: p.get('sort') || 'rating', showClosed: p.get('closed') === '1',
      };
    } catch (e) {
      return null;
    }
  }

  function writeUrl(st) {
    if (window.FOODMAP_PREVIEW) return; // 預覽環境不允許改網址
    try {
      const p = new URLSearchParams();
      if (st.region) p.set('region', st.region);
      if (st.city) p.set('city', st.city);
      if (st.district) p.set('district', st.district);
      if (st.tags.length) p.set('tags', st.tags.join(','));
      if (st.prices.length) p.set('price', st.prices.join(','));
      if (st.q) p.set('q', st.q);
      if (st.sort !== 'rating') p.set('sort', st.sort);
      if (st.showClosed) p.set('closed', '1');
      const qs = p.toString();
      const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
      window.history.replaceState(null, '', url);
    } catch (e) { /* 忽略 */ }
  }

  FM.filters = { SORTS, defaults, isDefault, sanitize, apply, suggest, readUrl, writeUrl, isBlank };
})();
