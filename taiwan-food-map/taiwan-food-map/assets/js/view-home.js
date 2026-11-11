/* view-home.js — 首頁：搜尋、篩選列、地圖、店家列表。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const { h, starsHtml, priceText, tagChipHtml, PRICE, debounce, toast } = FM.util;
  const F = FM.filters;

  let root, st, built = false, lastLocKey = '';
  const $ = (sel) => root.querySelector(sel);

  /* —— 狀態 —— */
  const persist = debounce(() => FM.storage.save('filters', st), 300);

  function setState(patch, opts) {
    st = F.sanitize(Object.assign({}, st, patch));
    persist();
    F.writeUrl(st);
    refresh(opts);
  }

  function locKey(s) {
    return [s.region, s.city, s.district, s.q, s.tags.join(), s.prices.join()].join('|');
  }

  /* —— 版面 —— */
  function skeleton() {
    const { shops } = FM.data;
    const cityCount = new Set(shops.map((s) => s.city).filter(Boolean)).size;
    root.innerHTML = `
      <div class="home-top">
        <div class="intro">
          <h1>我的台灣美食圖鑑</h1>
          <p class="muted">目前收錄 <b>${shops.length}</b> 間店，分布在 <b>${cityCount}</b> 個縣市。慢慢吃，慢慢記 🍚</p>
        </div>
        <div class="search" id="search">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input id="q" type="search" autocomplete="off" enterkeyhint="search"
            placeholder="搜尋店名、地名、餐點或標籤（例：中正區、拉麵）"
            role="combobox" aria-expanded="false" aria-controls="suggest" aria-autocomplete="list" aria-label="搜尋">
          <div id="suggest" class="suggest" role="listbox" hidden></div>
        </div>
      </div>

      <section class="filters card" aria-label="篩選">
        <div class="f-row">
          <span class="f-label">區域</span>
          <div class="chips" id="f-region" role="group" aria-label="區域"></div>
        </div>
        <div class="f-row">
          <span class="f-label">縣市・區</span>
          <div class="selects">
            <select id="f-city" aria-label="縣市"></select>
            <select id="f-district" aria-label="鄉鎮市區"></select>
          </div>
        </div>
        <button type="button" class="f-more" id="f-more" aria-expanded="false" aria-controls="f-extra">更多篩選 ▾</button>
        <div class="f-extra" id="f-extra">
          <div class="f-row">
            <span class="f-label">標籤</span>
            <div id="f-tags" class="tag-groups"></div>
          </div>
          <div class="f-row">
            <span class="f-label">價位</span>
            <div class="chips" id="f-price" role="group" aria-label="價位"></div>
            <label class="switch"><input type="checkbox" id="f-closed"><span></span>顯示已歇業</label>
          </div>
        </div>
        <div class="f-active" id="f-active" hidden></div>
      </section>

      <section class="map-shell card" aria-label="地圖">
        <div id="home-map" class="map"></div>
        <p class="map-hint muted">滾輪或雙指縮放；放大到街道會看到店名和標籤</p>
      </section>

      <section aria-label="店家列表">
        <div class="list-head">
          <h2>共 <b id="count">0</b> 間</h2>
          <label class="sort">排序
            <select id="f-sort">${Object.entries(F.SORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
          </label>
        </div>
        <div id="list" class="cards"></div>
      </section>`;
  }

  /* —— 篩選列 —— */
  function countBy(fn) {
    const m = new Map();
    for (const s of FM.data.shops) {
      if (!st.showClosed && s.status === 'closed') continue;
      const k = fn(s);
      if (k) m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }

  function renderRegion() {
    const counts = countBy((s) => s.region);
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const btn = (id, name, n) =>
      `<button type="button" class="chip ${st.region === id ? 'on' : ''}" data-region="${id}" aria-pressed="${st.region === id}">${name}<span class="n">${n}</span></button>`;
    $('#f-region').innerHTML = btn('', '全部', total) +
      FM.data.index.regions.map((r) => btn(r.id, r.name, counts.get(r.id) || 0)).join('');
  }

  function renderSelects() {
    const { regions, cities } = FM.data.index;
    const cityCounts = countBy((s) => s.city);
    const opt = (v, label, n, sel) => `<option value="${h(v)}" ${sel ? 'selected' : ''}>${h(label)}${n !== undefined ? `（${n}）` : ''}</option>`;
    const list = st.region ? regions.filter((r) => r.id === st.region) : regions;
    let html = opt('', '全部縣市', undefined, !st.city);
    for (const r of list) {
      html += `<optgroup label="${h(r.name)}">` +
        r.cities.map((c) => opt(c.name, c.name, cityCounts.get(c.name) || 0, st.city === c.name)).join('') + '</optgroup>';
    }
    $('#f-city').innerHTML = html;

    const dsel = $('#f-district');
    if (!st.city) {
      dsel.innerHTML = opt('', '先選縣市', undefined, true);
      dsel.disabled = true;
    } else {
      const dCounts = countBy((s) => (s.city === st.city ? s.district : null));
      const ds = cities.get(st.city).city.districts.slice()
        .sort((a, b) => (dCounts.get(b.name) || 0) - (dCounts.get(a.name) || 0));
      dsel.innerHTML = opt('', '全部區域', undefined, !st.district) +
        ds.map((d) => opt(d.name, d.name, dCounts.get(d.name) || 0, st.district === d.name)).join('');
      dsel.disabled = false;
    }
  }

  function renderTags() {
    const { meta, shops } = FM.data;
    const used = new Set(shops.flatMap((s) => s.tags));
    const tags = (meta.tags || []).filter((t) => t.preset || used.has(t.name));
    // 店家用了、但還沒登記到 tags.json 的標籤也要能篩選
    for (const name of used) if (!tags.some((t) => t.name === name)) tags.push(FM.data.tagObj(name));
    const counts = countBy(() => null);
    shops.forEach((s) => s.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    const groups = [];
    for (const t of tags) {
      let g = groups.find((x) => x.name === t.group);
      if (!g) groups.push((g = { name: t.group || '其他', tags: [] }));
      g.tags.push(t);
    }
    $('#f-tags').innerHTML = groups.map((g) => `<div class="tag-group"><span class="tg-name">${h(g.name)}</span><div class="chips">` +
      g.tags.map((t) => {
        const on = st.tags.includes(t.name);
        return `<button type="button" class="chip tag ${on ? 'on' : ''}" style="--tag:${h(t.color)}" data-tag="${h(t.name)}" aria-pressed="${on}">` +
          `<span aria-hidden="true">${h(t.emoji)}</span>${h(t.name)}${counts.get(t.name) ? `<span class="n">${counts.get(t.name)}</span>` : ''}</button>`;
      }).join('') + '</div></div>').join('');
  }

  function renderPrice() {
    $('#f-price').innerHTML = Object.entries(PRICE).map(([lv, p]) => {
      const on = st.prices.includes(Number(lv));
      return `<button type="button" class="chip ${on ? 'on' : ''}" data-price="${lv}" aria-pressed="${on}" title="每人 ${p.text}">${p.sign}<span class="sub">${p.text.replace('NT$', '')}</span></button>`;
    }).join('');
    $('#f-closed').checked = st.showClosed;
    $('#f-sort').value = st.sort;
    if ($('#q') !== document.activeElement) $('#q').value = st.q;
  }

  function renderActive() {
    const items = [];
    const regionName = st.region && FM.data.index.regions.find((r) => r.id === st.region).name;
    if (st.q) items.push(['q', `🔍「${st.q}」`]);
    if (regionName && !st.city) items.push(['region', regionName]);
    if (st.city) items.push(['city', st.city]);
    if (st.district) items.push(['district', st.district]);
    st.tags.forEach((t) => items.push(['tag:' + t, `${FM.data.tagObj(t).emoji} ${t}`]));
    st.prices.forEach((p) => items.push(['price:' + p, PRICE[p].sign]));
    if (st.showClosed) items.push(['closed', '含已歇業']);
    const el = $('#f-active');
    el.hidden = !items.length;
    el.innerHTML = items.length
      ? '<span class="f-label">已選</span>' + items.map(([k, label]) => `<button type="button" class="chip removable" data-remove="${h(k)}">${h(label)} <span aria-hidden="true">×</span><span class="sr-only">移除</span></button>`).join('') +
        '<button type="button" class="link-btn" data-remove="all">清除全部</button>'
      : '';
  }

  /* —— 列表 —— */
  function cardHtml(s) {
    const cover = s.photos[0]
      ? `<img loading="lazy" src="${h(FM.photoUrl(s, s.photos[0].file))}" alt="${h(s.photos[0].alt || s.displayName)}">`
      : `<div class="ph" style="--c:${h(s.primaryTag.color)}"><span>${h(s.primaryTag.emoji)}</span></div>`;
    const place = [s.city, s.district].filter(Boolean).join('・') || '地點未記錄';
    const price = priceText(s);
    const badges = [];
    if (s.status === 'closed') badges.push('<span class="badge gray">已歇業</span>');
    if (s.status === 'temp-closed') badges.push('<span class="badge gray">暫停營業</span>');
    if (!s.hasCoords) badges.push('<span class="badge warn">📍 缺座標</span>');
    return `<a class="shop-card ${s.status === 'closed' ? 'is-closed' : ''}" href="#${h(s.slug)}" data-slug="${h(s.slug)}">
      <div class="cover">${cover}${badges.length ? `<div class="badges">${badges.join('')}</div>` : ''}</div>
      <div class="body">
        <h3>${h(s.displayName)}${s.branch ? ` <small>${h(s.branch)}</small>` : ''}</h3>
        <p class="place">${h(place)}</p>
        <p class="meta">${starsHtml(s.rating)}${price ? `<span class="price">${h(price)}</span>` : ''}</p>
        <div class="tags">${s.tagObjs.slice(0, 3).map((t) => tagChipHtml(t, 'sm')).join('')}</div>
      </div></a>`;
  }

  function renderList(list) {
    $('#count').textContent = list.length;
    $('#list').innerHTML = list.length
      ? list.map(cardHtml).join('')
      : `<div class="empty card"><p class="big">🍂</p><p>沒有符合條件的店家</p>
          <button type="button" class="btn" data-remove="all">清除篩選</button></div>`;
  }

  function refresh(opts) {
    renderRegion();
    renderSelects();
    renderTags();
    renderPrice();
    renderActive();
    const list = F.apply(FM.data.shops, st);
    renderList(list);
    FM.map.setShops(list);
    const k = locKey(st);
    if (!(opts && opts.noFly) && k !== lastLocKey) FM.map.fitTo(st, list);
    lastLocKey = k;
  }

  /* —— 搜尋建議 —— */
  let sugItems = [], sugIdx = -1;
  function renderSuggest() {
    const q = $('#q').value;
    const box = $('#suggest');
    const { places, shops } = F.suggest(q);
    sugItems = [...places.map((p) => ({ kind: 'place', p })), ...shops.map((s) => ({ kind: 'shop', s }))];
    sugIdx = -1;
    if (!q.trim()) { box.hidden = true; $('#q').setAttribute('aria-expanded', 'false'); return; }
    let html = '';
    let i = 0;
    if (places.length) {
      html += '<div class="sg-head">📍 地點</div>' + places.map((p) =>
        `<div class="sg-item" role="option" id="sg-${i}" data-i="${i++}"><b>${h(p.label)}</b><span class="muted">${h(p.sub)}</span></div>`).join('');
    }
    if (shops.length) {
      html += '<div class="sg-head">🍽️ 店家</div>' + shops.map((s) =>
        `<div class="sg-item" role="option" id="sg-${i}" data-i="${i++}"><b>${h(s.primaryTag.emoji)} ${h(s.displayName)}</b><span class="muted">${h([s.city, s.district].filter(Boolean).join(' '))}</span></div>`).join('');
    }
    if (!html) html = `<div class="sg-empty muted">找不到「${h(q)}」，按 Enter 用關鍵字篩選</div>`;
    box.innerHTML = html;
    box.hidden = false;
    $('#q').setAttribute('aria-expanded', 'true');
  }

  function pickSuggest(i) {
    const it = sugItems[i];
    if (!it) return;
    $('#suggest').hidden = true;
    if (it.kind === 'place') {
      $('#q').value = '';
      setState({ q: '', region: it.p.region, city: it.p.city, district: it.p.district || '' });
    } else {
      $('#q').value = '';
      setState({ q: '' }, { noFly: true });
      setTimeout(() => {
        if (!FM.map.focusShop(it.s.slug)) location.hash = it.s.slug;
      }, 50);
    }
  }

  function moveSuggest(d) {
    const items = root.querySelectorAll('.sg-item');
    if (!items.length) return;
    sugIdx = (sugIdx + d + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('on', i === sugIdx));
    $('#q').setAttribute('aria-activedescendant', 'sg-' + sugIdx);
  }

  /* —— 事件 —— */
  function bind() {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-region],[data-tag],[data-price],[data-remove],.sg-item,#f-more');
      if (!t) return;
      if (t.id === 'f-more') {
        const open = !$('.filters').classList.contains('expanded');
        $('.filters').classList.toggle('expanded', open);
        t.setAttribute('aria-expanded', open);
        t.textContent = open ? '收起篩選 ▴' : '更多篩選 ▾';
      } else if (t.dataset.region !== undefined) {
        setState({ region: t.dataset.region, city: '', district: '' });
      } else if (t.dataset.tag !== undefined) {
        const tags = st.tags.includes(t.dataset.tag) ? st.tags.filter((x) => x !== t.dataset.tag) : st.tags.concat(t.dataset.tag);
        setState({ tags });
      } else if (t.dataset.price !== undefined) {
        const p = Number(t.dataset.price);
        setState({ prices: st.prices.includes(p) ? st.prices.filter((x) => x !== p) : st.prices.concat(p) });
      } else if (t.dataset.remove !== undefined) {
        const k = t.dataset.remove;
        if (k === 'all') { $('#q').value = ''; setState(F.defaults()); }
        else if (k === 'q') { $('#q').value = ''; setState({ q: '' }); }
        else if (k === 'region') setState({ region: '', city: '', district: '' });
        else if (k === 'city') setState({ city: '', district: '' });
        else if (k === 'district') setState({ district: '' });
        else if (k === 'closed') setState({ showClosed: false });
        else if (k.startsWith('tag:')) setState({ tags: st.tags.filter((x) => x !== k.slice(4)) });
        else if (k.startsWith('price:')) setState({ prices: st.prices.filter((x) => x !== Number(k.slice(6))) });
      } else if (t.classList.contains('sg-item')) {
        pickSuggest(Number(t.dataset.i));
      }
    });

    $('#f-city').addEventListener('change', (e) => {
      const name = e.target.value;
      const info = FM.data.index.cities.get(name);
      setState({ city: name, district: '', region: info ? info.region.id : st.region });
    });
    $('#f-district').addEventListener('change', (e) => setState({ district: e.target.value }));
    $('#f-sort').addEventListener('change', (e) => setState({ sort: e.target.value }, { noFly: true }));
    $('#f-closed').addEventListener('change', (e) => setState({ showClosed: e.target.checked }, { noFly: true }));

    const q = $('#q');
    q.addEventListener('input', debounce(renderSuggest, 120));
    q.addEventListener('focus', renderSuggest);
    q.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSuggest(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSuggest(-1); }
      else if (e.key === 'Escape') { $('#suggest').hidden = true; }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (sugIdx >= 0) pickSuggest(sugIdx);
        else { $('#suggest').hidden = true; setState({ q: q.value.trim() }); }
      }
    });
    q.addEventListener('search', () => { if (!q.value) setState({ q: '' }); });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search')) $('#suggest').hidden = true;
    });

    const list = $('#list');
    list.addEventListener('mouseover', (e) => {
      const c = e.target.closest('.shop-card');
      if (c) FM.map.highlight(c.dataset.slug, true);
    });
    list.addEventListener('mouseout', (e) => {
      const c = e.target.closest('.shop-card');
      if (c) FM.map.highlight(c.dataset.slug, false);
    });
  }

  /* —— 對外 —— */
  function show() {
    root = document.getElementById('view-home');
    if (!built) {
      built = true;
      skeleton();
      const fromUrl = F.readUrl();
      const stored = FM.storage.load('filters', null);
      st = F.sanitize(fromUrl || stored || F.defaults());
      const view = !fromUrl ? FM.storage.load('mapView', null) : null;
      const validView = view && Number.isFinite(view.lat) && Number.isFinite(view.lng) && Number.isFinite(view.zoom) ? view : null;
      FM.map.createHome($('#home-map'), {
        view: validView,
        onMove: debounce((v) => FM.storage.save('mapView', v), 300),
      });
      lastLocKey = validView ? locKey(st) : '';
      bind();
      refresh();
      if (!fromUrl && stored && !F.isDefault(st)) {
        toast('已帶入上次的篩選條件 <button type="button" class="link-btn" id="reset-filters">重設</button>', 4000);
        const btn = document.getElementById('reset-filters');
        if (btn) btn.addEventListener('click', () => { $('#q').value = ''; setState(F.defaults()); });
      }
    }
    FM.map.invalidate();
  }

  FM.views = FM.views || {};
  FM.views.home = { show };
})();
