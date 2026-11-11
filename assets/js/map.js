/* map.js — Leaflet 地圖：底圖、店家標記、依縮放等級切換標記樣式。
 *  縮放 ≤ 10 ：群集泡泡（數字）
 *  縮放 11–13：圓點（主標籤 emoji）
 *  縮放 ≥ 14 ：膠囊標記（emoji＋店名，下方列出所有標籤 emoji） */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const { h, starsHtml, priceText } = FM.util;

  const TAIWAN = [[21.85, 119.95], [25.35, 122.05]];
  const MAX_BOUNDS = [[21.7, 117.8], [26.6, 122.6]];
  const CLUSTER_UNTIL = 10;
  const PILL_FROM = 14;

  /* —— 底圖 —— */
  let townsPromise = null;
  function loadTowns() {
    if (!townsPromise) {
      townsPromise = window.FOODMAP_TOWNS
        ? Promise.resolve(window.FOODMAP_TOWNS)
        : fetch('assets/geo/taiwan-towns.topo.json').then((r) => r.json());
    }
    return townsPromise;
  }

  /** 備用底圖：用行政區界線畫出台灣（圖磚載不到、或在預覽環境時使用） */
  function addFallbackBase(map) {
    map.getContainer().classList.add('is-fallback');
    const renderer = L.canvas({ padding: 0.3 });
    loadTowns().then((topo) => {
      const towns = topojson.feature(topo, topo.objects.towns);
      L.geoJSON(towns, {
        renderer,
        style: { color: '#D6C1A0', weight: 0.8, fillColor: '#F6EBD6', fillOpacity: 1 },
        onEachFeature: (f, layer) => {
          const p = f.properties;
          layer.bindTooltip(`${p.COUNTYNAME.replace(/台/g, '臺')} ${p.TOWNNAME.replace(/台/g, '臺')}`, { sticky: true, className: 'town-tip', direction: 'top' });
          layer.on('mouseover', () => layer.setStyle({ fillColor: '#F1DFC0' }));
          layer.on('mouseout', () => layer.setStyle({ fillColor: '#F6EBD6' }));
        },
      }).addTo(map).bringToBack();
      const borders = topojson.mesh(topo, topo.objects.counties, (a, b) => a !== b);
      L.geoJSON(borders, { renderer, interactive: false, style: { color: '#B99868', weight: 1.6, dashArray: '4 3' } }).addTo(map);
    }).catch(() => { /* 連備用底圖都讀不到就只顯示標記 */ });
  }

  function addBase(map) {
    if (window.FOODMAP_PREVIEW) return addFallbackBase(map);
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 貢獻者',
    });
    let ok = 0, fail = 0;
    tiles.on('tileload', () => ok++);
    tiles.on('tileerror', () => {
      fail++;
      if (fail >= 4 && ok === 0) {
        map.removeLayer(tiles);
        addFallbackBase(map);
      }
    });
    tiles.addTo(map);
  }

  /* —— 標記樣式 —— */
  function band(zoom) {
    return zoom >= PILL_FROM ? 'pill' : 'dot';
  }

  function iconFor(shop, b) {
    const t = shop.primaryTag;
    const cls = ['mk', shop.status === 'closed' ? 'is-closed' : ''].join(' ');
    if (b === 'pill') {
      const more = shop.tagObjs.map((x) => `<span style="--c:${h(x.color)}">${h(x.emoji)}${h(x.name)}</span>`).join('');
      return L.divIcon({
        className: cls,
        iconSize: null,
        html: `<div class="mk-pill" style="--c:${h(t.color)}"><span class="mk-emoji">${h(t.emoji)}</span><b>${h(shop.displayName)}</b></div>` +
          (shop.tagObjs.length ? `<div class="mk-tags">${more}</div>` : ''),
      });
    }
    return L.divIcon({
      className: cls,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14],
      html: `<div class="mk-dot" style="--c:${h(t.color)}">${h(t.emoji)}</div>`,
    });
  }

  function popupHtml(shop) {
    const cover = shop.photos[0]
      ? `<img src="${h(FM.photoUrl(shop, shop.photos[0].file))}" alt="${h(shop.photos[0].alt || shop.displayName)}">`
      : `<div class="pp-ph" style="--c:${h(shop.primaryTag.color)}">${h(shop.primaryTag.emoji)}</div>`;
    const price = priceText(shop);
    return `<div class="pp">${cover}<div class="pp-body">
      <strong class="pp-name">${h(shop.displayName)}${shop.branch ? ` <small>${h(shop.branch)}</small>` : ''}</strong>
      <div class="pp-meta">${starsHtml(shop.rating)}${price ? ` · ${h(price)}` : ''}</div>
      <div class="pp-tags">${shop.tagObjs.map((t) => FM.util.tagChipHtml(t, 'sm')).join('')}</div>
      ${shop.coords_approx ? '<div class="pp-note">📍 位置為估計，可能差一點點</div>' : ''}
      <a class="pp-link" href="#${h(shop.slug)}">查看店家頁 →</a></div></div>`;
  }

  function clusterIcon(cluster) {
    const n = cluster.getChildCount();
    const size = n < 10 ? 38 : n < 50 ? 46 : 54;
    return L.divIcon({ html: `<div class="mk-cluster"><span>${n}</span></div>`, className: 'mk', iconSize: [size, size] });
  }

  /* —— 首頁地圖 —— */
  let map, cluster, markers = new Map(), currentBand = null;

  function mobileDragControl(m) {
    if (!L.Browser.mobile) return;
    m.dragging.disable();
    const Ctl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const btn = L.DomUtil.create('button', 'map-drag-btn');
        btn.type = 'button';
        btn.textContent = '✋ 拖曳地圖';
        L.DomEvent.disableClickPropagation(btn);
        btn.addEventListener('click', () => {
          const on = !m.dragging.enabled();
          on ? m.dragging.enable() : m.dragging.disable();
          btn.classList.toggle('on', on);
          btn.textContent = on ? '🔒 固定地圖' : '✋ 拖曳地圖';
        });
        return btn;
      },
    });
    new Ctl().addTo(m);
  }

  function createHome(el, opts) {
    map = L.map(el, {
      maxBounds: MAX_BOUNDS,
      maxBoundsViscosity: 0.8,
      minZoom: 6,
      maxZoom: 18,
      zoomSnap: 0.5,
      scrollWheelZoom: true,
      tap: true,
    });
    addBase(map);
    mobileDragControl(map);

    cluster = L.markerClusterGroup({
      // 縮小時大範圍合併；放大後只合併「疊在一起」的店，點一下就會展開
      disableClusteringAtZoom: 18,
      maxClusterRadius: (z) => (z <= CLUSTER_UNTIL ? 48 : z < PILL_FROM ? 26 : 60),
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: clusterIcon,
    });
    map.addLayer(cluster);

    if (opts && opts.view) map.setView([opts.view.lat, opts.view.lng], opts.view.zoom);
    else map.fitBounds(TAIWAN);
    currentBand = band(map.getZoom());

    map.on('zoomend', () => {
      const b = band(map.getZoom());
      if (b !== currentBand) {
        currentBand = b;
        markers.forEach((m, slug) => m.setIcon(iconFor(FM.data.bySlug.get(slug), b)));
      }
    });
    if (opts && opts.onMove) {
      map.on('moveend', () => {
        const c = map.getCenter();
        opts.onMove({ lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), zoom: map.getZoom() });
      });
    }
    return map;
  }

  function setShops(list) {
    cluster.clearLayers();
    markers = new Map();
    const b = band(map.getZoom());
    const layers = [];
    for (const s of list) {
      if (!s.hasCoords) continue;
      const m = L.marker([s.lat, s.lng], { icon: iconFor(s, b), title: s.displayName, riseOnHover: true });
      m.bindPopup(() => popupHtml(s), { className: 'pp-wrap', maxWidth: 260, minWidth: 220 });
      markers.set(s.slug, m);
      layers.push(m);
    }
    cluster.addLayers(layers);
  }

  function boundsFromArr(b) {
    return L.latLngBounds([b[0], b[1]], [b[2], b[3]]);
  }

  /** 依篩選條件移動地圖 */
  function fitTo(st, list) {
    const { index } = FM.data;
    let bounds = null;
    if (st.city) {
      const c = index.cities.get(st.city).city;
      const d = st.district && c.districts.find((x) => x.name === st.district);
      bounds = boundsFromArr((d || c).bounds);
    } else if (st.region) {
      const r = index.regions.find((x) => x.id === st.region);
      r.cities.forEach((c) => {
        const cb = boundsFromArr(c.bounds);
        bounds = bounds ? bounds.extend(cb) : cb;
      });
    }
    if (!bounds) {
      const pts = list.filter((s) => s.hasCoords).map((s) => [s.lat, s.lng]);
      bounds = pts.length && (st.q || st.tags.length || st.prices.length) ? L.latLngBounds(pts) : L.latLngBounds(TAIWAN);
    }
    map.flyToBounds(bounds, { padding: [30, 30], maxZoom: 16, duration: 0.8 });
  }

  function focusShop(slug) {
    const m = markers.get(slug);
    if (!m) return false;
    map.flyTo(m.getLatLng(), 16, { duration: 0.8 });
    map.once('moveend', () => cluster.zoomToShowLayer(m, () => m.openPopup()));
    return true;
  }

  function highlight(slug, on) {
    const m = markers.get(slug);
    const el = m && m.getElement && m.getElement();
    if (el) el.classList.toggle('is-hot', !!on);
  }

  function invalidate() {
    if (map) setTimeout(() => map.invalidateSize(), 0);
  }

  /* —— 店家頁小地圖 —— */
  function createMini(el, shop) {
    const m = L.map(el, {
      center: [shop.lat, shop.lng], zoom: 16, maxBounds: MAX_BOUNDS,
      dragging: !L.Browser.mobile, scrollWheelZoom: false, zoomControl: true, attributionControl: true,
    });
    addBase(m);
    L.marker([shop.lat, shop.lng], { icon: iconFor(shop, 'pill'), interactive: false }).addTo(m);
    return m;
  }

  FM.map = { createHome, setShops, fitTo, focusShop, highlight, invalidate, createMini };
})();
