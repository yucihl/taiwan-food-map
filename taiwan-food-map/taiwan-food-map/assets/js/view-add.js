/* view-add.js — 新增店家表單（網址：index.html#add）。
 * 填完會產生 _shops/<slug>.md 的內容讓我複製。所有欄位都是選填。
 * 表單內容會自動存成草稿（localStorage: foodmap:v1:addDraft），下次打開自動帶回。
 * 注意：GitHub Pages 是靜態網站，這個頁面不會直接寫入網站。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const U = FM.util;
  const { h } = U;

  let root, built = false, draft;
  const $ = (s) => root.querySelector(s);
  const blankDraft = () => ({ f: {}, tags: [], newTags: [], dishes: [{}], photos: [], savedAt: null });

  const FIELDS_TOP = [
    ['name', '店名', 'text', '例：丸舢拉麵'],
    ['branch', '分店名', 'text', '例：八德店'],
    ['slugPart', '網址名稱（英文或拼音）', 'text', '例：wanshan-ramen'],
  ];

  function field(key, label, type, ph, extra) {
    const v = draft.f[key] === undefined ? '' : draft.f[key];
    return `<label class="field"><span>${h(label)}</span><input name="${key}" type="${type}" value="${h(v)}" placeholder="${h(ph || '')}" ${extra || ''}></label>`;
  }

  function select(key, label, options) {
    const v = draft.f[key] || '';
    return `<label class="field"><span>${h(label)}</span><select name="${key}">` +
      options.map(([val, text]) => `<option value="${h(val)}" ${String(v) === String(val) ? 'selected' : ''}>${h(text)}</option>`).join('') + '</select></label>';
  }

  function tagPicker() {
    const all = (FM.data.meta.tags || []).concat(draft.newTags.map((t) => Object.assign({ group: '新標籤' }, t)));
    return all.map((t) => {
      const on = draft.tags.includes(t.name);
      return `<button type="button" class="chip tag ${on ? 'on' : ''}" style="--tag:${h(t.color || '#A68A64')}" data-pick="${h(t.name)}" aria-pressed="${on}"><span aria-hidden="true">${h(t.emoji)}</span>${h(t.name)}</button>`;
    }).join('');
  }

  function dishRows() {
    return draft.dishes.map((d, i) => `<div class="row-3" data-dish="${i}">
      <input data-k="name" value="${h(d.name || '')}" placeholder="餐點名稱" aria-label="餐點名稱">
      <input data-k="price" value="${h(d.price || '')}" placeholder="價格" inputmode="numeric" aria-label="價格">
      <input data-k="note" value="${h(d.note || '')}" placeholder="一句話心得" aria-label="一句話心得">
      <button type="button" class="icon-btn" data-del-dish="${i}" aria-label="刪除這道">✕</button></div>`).join('');
  }

  function photoRows() {
    return draft.photos.map((p, i) => `<div class="row-3 two" data-photo="${i}">
      <input data-k="file" value="${h(p.file || '')}" placeholder="檔名，例：01.webp" aria-label="照片檔名">
      <input data-k="alt" value="${h(p.alt || '')}" placeholder="照片說明，例：招牌拉麵特寫" aria-label="照片說明">
      <button type="button" class="icon-btn" data-del-photo="${i}" aria-label="刪除這張">✕</button></div>`).join('');
  }

  function skeleton() {
    const days = U.WEEK_ORDER.map((d) => field('h_' + d, U.DAY_NAMES[d], 'text', '11:00-21:00／公休')).join('');
    root.innerHTML = `
      <div class="page-head">
        <h1>＋ 新增店家</h1>
        <p class="muted">每個欄位都可以留空。填完按「產生」，把結果交給 AI，或自己存成 <code>_shops/</code> 裡的檔案。</p>
        <p class="draft-note" id="draft-note" hidden></p>
      </div>
      <form id="add-form" class="add-form" novalidate>
        <fieldset class="card section"><legend>🏠 基本資料</legend>
          <div class="grid-2">${FIELDS_TOP.map((f) => field(...f)).join('')}
          ${select('status', '營業狀態', [['open', '營業中'], ['temp-closed', '暫停營業'], ['closed', '已歇業']])}</div>
        </fieldset>

        <fieldset class="card section"><legend>📍 位置</legend>
          <div class="grid-2">
            ${field('address', '地址（縣市、區會自動判斷）', 'text', '例：臺北市中正區八德路一段48號', 'class="wide"')}
            ${field('zip', '郵遞區號', 'text', '100', 'inputmode="numeric"')}
            <p class="auto-place muted small" id="auto-place"></p>
            ${field('lat', '緯度', 'text', '25.04425', 'inputmode="decimal"')}
            ${field('lng', '經度', 'text', '121.53060', 'inputmode="decimal"')}
          </div>
          <label class="check"><input type="checkbox" name="coords_approx" ${draft.f.coords_approx ? 'checked' : ''}> 座標是估計的</label>
          <p class="muted small">小技巧：在 Google 地圖對店家按右鍵 → 點第一行的數字，就會複製「緯度, 經度」，可以直接貼到緯度欄。</p>
        </fieldset>

        <fieldset class="card section"><legend>⭐ 評分與價位</legend>
          <div class="grid-2">
            ${select('rating', '評分', [['', '先不評分']].concat([5, 4, 3, 2, 1].map((n) => [n, `${'★'.repeat(n)} ${U.RATING[n].title}：${U.RATING[n].text}`])))}
            ${select('price_level', '價位（每人一餐）', [['', '先不填']].concat([1, 2, 3, 4].map((n) => [n, `${U.PRICE[n].sign}　${U.PRICE[n].text}`])))}
            ${field('price_note', '價位補充', 'text', '例：每人約 NT$250')}
          </div>
        </fieldset>

        <fieldset class="card section"><legend>🏷️ 標籤</legend>
          <p class="muted small">點選套用，第一個選的會是「主標籤」（決定地圖上的 emoji 和顏色）。</p>
          <div class="chips" id="tag-picker">${tagPicker()}</div>
          <div class="new-tag">
            <input id="nt-emoji" placeholder="😺" aria-label="新標籤的 emoji" maxlength="4">
            <input id="nt-name" placeholder="自己打一個新標籤，例：有店貓" aria-label="新標籤名稱">
            <button type="button" class="btn" id="nt-add">加入</button>
          </div>
        </fieldset>

        <fieldset class="card section"><legend>🕒 營業時間</legend>
          <div class="grid-days">${days}</div>
          <div class="grid-2">${field('h_note', '備註', 'text', '例：售完提早打烊')}${field('hours_checked', '確認日期', 'date', '')}</div>
          <button type="button" class="link-btn" id="copy-mon">把週一的時間套用到每一天</button>
        </fieldset>

        <fieldset class="card section"><legend>🍽️ 推薦餐點</legend>
          <div id="dishes">${dishRows()}</div>
          <button type="button" class="btn" id="add-dish">＋ 再加一道</button>
        </fieldset>

        <fieldset class="card section"><legend>📷 照片</legend>
          <p class="muted small">照片請放在 <code>assets/images/shops/&lt;網址名稱&gt;/</code>，這裡只填檔名和說明。</p>
          <div id="photos">${photoRows()}</div>
          <button type="button" class="btn" id="add-photo">＋ 加一張照片</button>
        </fieldset>

        <fieldset class="card section"><legend>📝 心得</legend>
          <div class="grid-2">${field('visited', '造訪日期', 'date', '')}</div>
          <label class="field"><span>心得（可以用 Markdown）</span><textarea name="body" rows="6" placeholder="湯頭、麵條、氣氛、服務……想到什麼寫什麼">${h(draft.f.body || '')}</textarea></label>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">產生 Markdown</button>
          <button type="button" class="btn ghost" id="clear-draft">清除草稿</button>
        </div>
      </form>
      <section id="output" class="card section output" hidden></section>`;
  }

  /* —— 讀取表單 → draft —— */
  function readForm() {
    const form = $('#add-form');
    form.querySelectorAll('[name]').forEach((el) => {
      draft.f[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    draft.dishes = [...form.querySelectorAll('[data-dish]')].map((row) => ({
      name: row.querySelector('[data-k=name]').value,
      price: row.querySelector('[data-k=price]').value,
      note: row.querySelector('[data-k=note]').value,
    }));
    draft.photos = [...form.querySelectorAll('[data-photo]')].map((row) => ({
      file: row.querySelector('[data-k=file]').value,
      alt: row.querySelector('[data-k=alt]').value,
    }));
    // 「25.04425, 121.53060」整串貼進緯度欄時自動拆開
    const m = String(draft.f.lat || '').match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (m) {
      draft.f.lat = m[1]; draft.f.lng = m[2];
      form.querySelector('[name=lat]').value = m[1];
      form.querySelector('[name=lng]').value = m[2];
    }
  }

  const saveDraft = U.debounce(() => {
    draft.savedAt = new Date().toISOString();
    FM.storage.save('addDraft', draft);
  }, 500);

  function updateAutoPlace() {
    const p = FM.data.inferPlace(draft.f.address || '');
    $('#auto-place').textContent = draft.f.address
      ? (p.city ? `✓ 判斷為：${p.city}${p.district ? ' ' + p.district : '（區未判斷出來）'}` : '⚠️ 看不出縣市，請確認地址以縣市開頭（例：臺北市…）')
      : '';
  }

  /* —— 產生 Markdown —— */
  const q = (v) => JSON.stringify(String(v).trim());
  const filled = (v) => !U.isBlank(v) && String(v).trim() !== '';

  function slugFor() {
    const p = FM.data.inferPlace(draft.f.address || '');
    const parts = [];
    const c = p.city && FM.data.index.cities.get(p.city).city;
    if (c) parts.push(c.slug);
    if (c && p.district) parts.push(c.districts.find((d) => d.name === p.district).slug);
    const tail = String(draft.f.slugPart || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    parts.push(tail || 'new-shop');
    return parts.join('-');
  }

  function buildMarkdown() {
    const f = draft.f;
    const L = ['---'];
    const put = (k, v, raw) => { if (filled(v)) L.push(`${k}: ${raw ? String(v).trim() : q(v)}`); };
    put('name', f.name);
    put('branch', f.branch);
    if (f.status && f.status !== 'open') L.push(`status: ${f.status}`);
    put('address', f.address);
    put('zip', f.zip);
    const lat = Number(f.lat), lng = Number(f.lng);
    if (filled(f.lat) && Number.isFinite(lat)) L.push(`lat: ${lat.toFixed(5)}`);
    if (filled(f.lng) && Number.isFinite(lng)) L.push(`lng: ${lng.toFixed(5)}`);
    if (f.coords_approx) L.push('coords_approx: true');
    put('price_level', f.price_level, true);
    put('price_note', f.price_note);
    put('rating', f.rating, true);
    if (draft.tags.length) L.push(`tags: [${draft.tags.map(q).join(', ')}]`);
    const hrs = U.WEEK_ORDER.filter((d) => filled(f['h_' + d]));
    if (hrs.length || filled(f.h_note)) {
      L.push('hours:');
      hrs.forEach((d) => L.push(`  ${d}: ${q(f['h_' + d])}`));
      if (filled(f.h_note)) L.push(`  note: ${q(f.h_note)}`);
    }
    put('hours_checked', f.hours_checked, true);
    const dishes = draft.dishes.filter((d) => filled(d.name));
    if (dishes.length) {
      L.push('dishes:');
      dishes.forEach((d) => {
        L.push(`  - name: ${q(d.name)}`);
        const p = Number(String(d.price || '').replace(/[^\d.]/g, ''));
        if (filled(d.price) && p) L.push(`    price: ${p}`);
        if (filled(d.note)) L.push(`    note: ${q(d.note)}`);
      });
    }
    const photos = draft.photos.filter((p) => filled(p.file));
    if (photos.length) {
      L.push('photos:');
      photos.forEach((p) => {
        L.push(`  - file: ${q(p.file)}`);
        if (filled(p.alt)) L.push(`    alt: ${q(p.alt)}`);
      });
    }
    put('visited', f.visited, true);
    L.push(`updated: ${U.taipeiNow().date}`);
    L.push('---', '');
    if (filled(f.body)) L.push(String(f.body).trim(), '');
    return L.join('\n');
  }

  function renderOutput() {
    const slug = slugFor();
    const md = buildMarkdown();
    const newTags = draft.newTags.filter((t) => draft.tags.includes(t.name));
    const tagJson = newTags.map((t) => JSON.stringify({ name: t.name, emoji: t.emoji, color: t.color, group: '特色', preset: false })).join(',\n');
    const missing = [];
    if (!filled(draft.f.name)) missing.push('店名');
    if (!filled(draft.f.slugPart)) missing.push('網址名稱（目前用 new-shop）');
    if (!filled(draft.f.lat) || !filled(draft.f.lng)) missing.push('座標（沒有就不會出現在地圖上）');
    const prompt = `請依照 AGENTS.md 新增一間店，檔案路徑 _shops/${slug}.md，內容如下：\n\n${md}` +
      (tagJson ? `\n另外請把這些新標籤加到 _data/tags.json：\n${tagJson}\n` : '');
    const out = $('#output');
    out.hidden = false;
    out.innerHTML = `<h2>✅ 產生完成</h2>
      ${missing.length ? `<p class="warn-box">還沒填：${missing.map(h).join('、')}。不填也可以，之後再補。</p>` : ''}
      <p>檔案路徑：<code>_shops/${h(slug)}.md</code></p>
      <div class="out-block"><div class="out-head"><b>Markdown</b><button type="button" class="btn btn-sm" data-copy="md">複製</button></div><pre id="out-md">${h(md)}</pre></div>
      ${tagJson ? `<div class="out-block"><div class="out-head"><b>新標籤（加到 _data/tags.json）</b><button type="button" class="btn btn-sm" data-copy="tags">複製</button></div><pre id="out-tags">${h(tagJson)}</pre></div>` : ''}
      <div class="out-block"><div class="out-head"><b>直接貼給 AI 的訊息</b><button type="button" class="btn btn-sm btn-primary" data-copy="prompt">複製</button></div><pre id="out-prompt">${h(prompt)}</pre></div>`;
    out._texts = { md, tags: tagJson, prompt };
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* —— 事件 —— */
  function bindForm() {
    const form = $('#add-form');
    form.addEventListener('input', () => { readForm(); updateAutoPlace(); saveDraft(); });
    form.addEventListener('change', () => { readForm(); saveDraft(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); readForm(); saveDraft(); renderOutput(); });
  }

  function bindRoot() {
    root.addEventListener('click', (e) => {
      const t = e.target;
      const form = $('#add-form');
      const pick = t.closest('[data-pick]');
      if (pick) {
        const n = pick.dataset.pick;
        draft.tags = draft.tags.includes(n) ? draft.tags.filter((x) => x !== n) : draft.tags.concat(n);
        $('#tag-picker').innerHTML = tagPicker();
        saveDraft();
        return;
      }
      if (t.id === 'nt-add') {
        const name = $('#nt-name').value.trim().replace(/\p{Extended_Pictographic}/gu, '').trim();
        const emoji = $('#nt-emoji').value.trim() || '🏷️';
        if (!name) { U.toast('先輸入標籤名稱喔'); return; }
        const exists = (FM.data.meta.tags || []).some((x) => x.name === name) || draft.newTags.some((x) => x.name === name);
        if (!exists) {
          const palette = ['#A68A64', '#C98B5A', '#8A9A5B', '#B5543C', '#7A6290', '#D48A9C'];
          draft.newTags.push({ name, emoji, color: palette[draft.newTags.length % palette.length] });
        }
        if (!draft.tags.includes(name)) draft.tags.push(name);
        $('#nt-name').value = ''; $('#nt-emoji').value = '';
        $('#tag-picker').innerHTML = tagPicker();
        saveDraft();
      } else if (t.id === 'add-dish') {
        readForm(); draft.dishes.push({}); $('#dishes').innerHTML = dishRows(); saveDraft();
      } else if (t.dataset.delDish !== undefined) {
        readForm(); draft.dishes.splice(Number(t.dataset.delDish), 1); $('#dishes').innerHTML = dishRows(); saveDraft();
      } else if (t.id === 'add-photo') {
        readForm(); draft.photos.push({ file: String(draft.photos.length + 1).padStart(2, '0') + '.webp' }); $('#photos').innerHTML = photoRows(); saveDraft();
      } else if (t.dataset.delPhoto !== undefined) {
        readForm(); draft.photos.splice(Number(t.dataset.delPhoto), 1); $('#photos').innerHTML = photoRows(); saveDraft();
      } else if (t.id === 'copy-mon') {
        const mon = form.querySelector('[name=h_mon]').value;
        U.WEEK_ORDER.forEach((d) => { form.querySelector(`[name=h_${d}]`).value = mon; });
        readForm(); saveDraft();
      } else if (t.id === 'clear-draft') {
        FM.storage.remove('addDraft');
        draft = blankDraft();
        skeleton(); bindForm(); updateAutoPlace();
        U.toast('草稿已清除');
      } else if (t.dataset.copy) {
        U.copyText($('#output')._texts[t.dataset.copy], t);
      }
    });
  }

  function show() {
    root = document.getElementById('view-add');
    if (!built) {
      built = true;
      const saved = FM.storage.load('addDraft', null);
      draft = Object.assign(blankDraft(), saved && typeof saved === 'object' ? saved : {});
      if (!Array.isArray(draft.dishes) || !draft.dishes.length) draft.dishes = [{}];
      skeleton();
      bindForm();
      bindRoot();
      updateAutoPlace();
      if (saved && saved.savedAt) {
        const d = new Date(saved.savedAt);
        const note = $('#draft-note');
        note.hidden = false;
        note.textContent = `📌 已帶入 ${d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 的草稿`;
      }
    }
    document.title = '新增店家｜我的台灣美食圖鑑';
  }

  FM.views = FM.views || {};
  FM.views.add = { show };
})();
