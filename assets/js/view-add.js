/* view-add.js — 新增店家表單（網址：index.html#add）。
 * 填完會產生 _shops/<slug>.md 的內容讓我複製。所有欄位都是選填。
 * 表單內容會自動存成草稿（localStorage: foodmap:v1:addDraft），下次打開自動帶回。
 * 注意：GitHub Pages 是靜態網站，這個頁面不會直接寫入網站。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const U = FM.util;
  const { h } = U;
  const t = (k, v) => FM.t(k, v);

  let root, built = false, draft, rootBound = false, relang = false;
  const $ = (s) => root.querySelector(s);
  const blankDraft = () => ({ f: {}, tags: [], newTags: [], dishes: [{}], photos: [], savedAt: null });

  // [欄位, i18n key]；標籤是 add.<key>，提示是 add.<key>Ph
  const FIELDS_TOP = [
    ['name', 'name'],
    ['name_en', 'nameEn'],
    ['branch', 'branch'],
    ['slugPart', 'slugPart'],
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
    const all = (FM.data.meta.tags || []).concat(draft.newTags.map((tg) => Object.assign({ group: '新標籤' }, tg)));
    return all.map((tg) => {
      const on = draft.tags.includes(tg.name);
      return `<button type="button" class="chip tag ${on ? 'on' : ''}" style="--tag:${h(tg.color || '#A68A64')}" data-pick="${h(tg.name)}" aria-pressed="${on}"><span aria-hidden="true">${h(tg.emoji)}</span>${h(FM.i18n.tagName(tg))}</button>`;
    }).join('');
  }

  function dishRows() {
    const inp = (d, k, label, extra) => `<input data-k="${k}" value="${h(d[k] || '')}" placeholder="${h(t(label))}" aria-label="${h(t(label))}" ${extra || ''}>`;
    return draft.dishes.map((d, i) => `<div class="row-3 dish" data-dish="${i}">
      ${inp(d, 'name', 'add.dishName')}
      ${inp(d, 'name_en', 'add.dishNameEn')}
      ${inp(d, 'price', 'add.dishPrice', 'inputmode="numeric"')}
      ${inp(d, 'note', 'add.dishNote')}
      <button type="button" class="icon-btn" data-del-dish="${i}" aria-label="${h(t('add.dishDel'))}">✕</button></div>`).join('');
  }

  function photoRows() {
    return draft.photos.map((p, i) => `<div class="row-3 two" data-photo="${i}">
      <input data-k="file" value="${h(p.file || '')}" placeholder="${h(t('add.photoFilePh'))}" aria-label="${h(t('add.photoFile'))}">
      <input data-k="alt" value="${h(p.alt || '')}" placeholder="${h(t('add.photoAltPh'))}" aria-label="${h(t('add.photoAlt'))}">
      <button type="button" class="icon-btn" data-del-photo="${i}" aria-label="${h(t('add.photoDel'))}">✕</button></div>`).join('');
  }

  function skeleton() {
    const days = U.WEEK_ORDER.map((d) => field('h_' + d, U.dayName(d), 'text', t('add.hoursPh'))).join('');
    const sep = t('sep.colon');
    root.innerHTML = `
      <div class="page-head">
        <h1>${h(t('add.title'))}</h1>
        <p class="muted">${t('add.intro')}</p>
        <p class="draft-note" id="draft-note" hidden></p>
      </div>
      <form id="add-form" class="add-form" novalidate>
        <fieldset class="card section"><legend>${h(t('add.basic'))}</legend>
          <div class="grid-2">${FIELDS_TOP.map(([k, key]) => field(k, t('add.' + key), 'text', t('add.' + key + 'Ph'))).join('')}
          ${select('status', t('add.status'), [['open', t('add.status.open')], ['temp-closed', t('add.status.tempClosed')], ['closed', t('add.status.closed')]])}</div>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.location'))}</legend>
          <div class="grid-2">
            ${field('address', t('add.address'), 'text', t('add.addressPh'), 'class="wide"')}
            ${field('zip', t('add.zip'), 'text', '100', 'inputmode="numeric"')}
            <p class="auto-place muted small" id="auto-place"></p>
            ${field('lat', t('add.lat'), 'text', '25.04425', 'inputmode="decimal"')}
            ${field('lng', t('add.lng'), 'text', '121.53060', 'inputmode="decimal"')}
          </div>
          <label class="check"><input type="checkbox" name="coords_approx" ${draft.f.coords_approx ? 'checked' : ''}> ${h(t('add.approx'))}</label>
          <p class="muted small">${h(t('add.coordsTip'))}</p>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.ratingPrice'))}</legend>
          <div class="grid-2">
            ${select('rating', t('add.rating'), [['', t('add.noRating')]].concat([5, 4, 3, 2, 1].map((n) => [n, `${'★'.repeat(n)} ${U.RATING[n].title}${sep}${U.RATING[n].text}`])))}
            ${select('price_level', t('add.priceLevel'), [['', t('add.noPrice')]].concat([1, 2, 3, 4].map((n) => [n, `${U.PRICE[n].sign}　${U.PRICE[n].text}`])))}
            ${field('price_note', t('add.priceNote'), 'text', t('add.priceNotePh'))}
          </div>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.tags'))}</legend>
          <p class="muted small">${h(t('add.tagsTip'))}</p>
          <div class="chips" id="tag-picker">${tagPicker()}</div>
          <div class="new-tag">
            <input id="nt-emoji" placeholder="😺" aria-label="${h(t('add.ntEmoji'))}" maxlength="4">
            <input id="nt-name" placeholder="${h(t('add.ntNamePh'))}" aria-label="${h(t('add.ntName'))}">
            <input id="nt-name-en" placeholder="${h(t('add.ntNameEnPh'))}" aria-label="${h(t('add.ntNameEn'))}">
            <button type="button" class="btn" id="nt-add">${h(t('add.ntAdd'))}</button>
          </div>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.hours'))}</legend>
          <div class="grid-days">${days}</div>
          <div class="grid-2">${field('h_note', t('add.hoursNote'), 'text', t('add.hoursNotePh'))}${field('hours_checked', t('add.hoursChecked'), 'date', '')}</div>
          <button type="button" class="link-btn" id="copy-mon">${h(t('add.copyMon'))}</button>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.dishes'))}</legend>
          <div id="dishes">${dishRows()}</div>
          <button type="button" class="btn" id="add-dish">${h(t('add.addDish'))}</button>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.photos'))}</legend>
          <p class="muted small">${t('add.photosTip')}</p>
          <div id="photos">${photoRows()}</div>
          <button type="button" class="btn" id="add-photo">${h(t('add.addPhoto'))}</button>
        </fieldset>

        <fieldset class="card section"><legend>${h(t('add.notes'))}</legend>
          <div class="grid-2">${field('visited', t('add.visited'), 'date', '')}</div>
          <label class="field"><span>${h(t('add.body'))}</span><textarea name="body" rows="6" placeholder="${h(t('add.bodyPh'))}">${h(draft.f.body || '')}</textarea></label>
          <label class="field"><span>${h(t('add.bodyEn'))}</span><textarea name="body_en" rows="4" placeholder="${h(t('add.bodyEnPh'))}">${h(draft.f.body_en || '')}</textarea></label>
        </fieldset>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${h(t('add.generate'))}</button>
          <button type="button" class="btn ghost" id="clear-draft">${h(t('add.clearDraft'))}</button>
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
      name_en: row.querySelector('[data-k=name_en]').value,
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
    const place = p.city
      ? FM.place.city(p.city) + (p.district ? ' ' + FM.place.district(p.city, p.district) : t('add.placeNoDistrict'))
      : '';
    $('#auto-place').textContent = draft.f.address
      ? (p.city ? t('add.placeOk', { place }) : t('add.placeFail'))
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
    put('name_en', f.name_en);
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
        if (filled(d.name_en)) L.push(`    name_en: ${q(d.name_en)}`);
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
    // 英文心得放在 <!-- en --> 下面（AGENTS.md 第 4 節）
    if (filled(f.body_en)) L.push('<!-- en -->', '', String(f.body_en).trim(), '');
    return L.join('\n');
  }

  function renderOutput() {
    const slug = slugFor();
    const md = buildMarkdown();
    const newTags = draft.newTags.filter((t) => draft.tags.includes(t.name));
    // 新標籤 JSON 一定附 name_en（沒填就留空字串，提醒 AI 補翻譯）
    const tagJson = newTags.map((tg) => JSON.stringify({ name: tg.name, name_en: tg.name_en || '', emoji: tg.emoji, color: tg.color, group: '特色', preset: false })).join(',\n');
    const missing = [];
    if (!filled(draft.f.name)) missing.push(t('add.missName'));
    if (!filled(draft.f.slugPart)) missing.push(t('add.missSlug'));
    if (!filled(draft.f.lat) || !filled(draft.f.lng)) missing.push(t('add.missCoords'));
    const prompt = `${t('add.prompt', { slug })}\n\n${md}` +
      (tagJson ? `\n${t('add.promptTags')}\n${tagJson}\n` : '');
    const copyBtn = (k, primary) => `<button type="button" class="btn btn-sm ${primary ? 'btn-primary' : ''}" data-copy="${k}">${h(t('add.copy'))}</button>`;
    const out = $('#output');
    out.hidden = false;
    out.innerHTML = `<h2>${h(t('add.done'))}</h2>
      ${missing.length ? `<p class="warn-box">${h(t('add.missing', { list: missing.join(t('listSep')) }))}</p>` : ''}
      <p>${h(t('add.path'))}<code>_shops/${h(slug)}.md</code></p>
      <div class="out-block"><div class="out-head"><b>${h(t('add.outMd'))}</b>${copyBtn('md')}</div><pre id="out-md">${h(md)}</pre></div>
      ${tagJson ? `<div class="out-block"><div class="out-head"><b>${h(t('add.outTags'))}</b>${copyBtn('tags')}</div><pre id="out-tags">${h(tagJson)}</pre></div>` : ''}
      <div class="out-block"><div class="out-head"><b>${h(t('add.outPrompt'))}</b>${copyBtn('prompt', true)}</div><pre id="out-prompt">${h(prompt)}</pre></div>`;
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
      const el = e.target;
      const form = $('#add-form');
      const pick = el.closest('[data-pick]');
      if (pick) {
        const n = pick.dataset.pick;
        draft.tags = draft.tags.includes(n) ? draft.tags.filter((x) => x !== n) : draft.tags.concat(n);
        $('#tag-picker').innerHTML = tagPicker();
        saveDraft();
        return;
      }
      if (el.id === 'nt-add') {
        const clean = (v) => v.trim().replace(/\p{Extended_Pictographic}/gu, '').trim();
        const name = clean($('#nt-name').value);
        const nameEn = clean($('#nt-name-en').value);
        const emoji = $('#nt-emoji').value.trim() || '🏷️';
        if (!name) { U.toast(h(t('add.ntNeedName'))); return; }
        const exists = (FM.data.meta.tags || []).some((x) => x.name === name) || draft.newTags.some((x) => x.name === name);
        if (!exists) {
          const palette = ['#A68A64', '#C98B5A', '#8A9A5B', '#B5543C', '#7A6290', '#D48A9C'];
          draft.newTags.push({ name, name_en: nameEn, emoji, color: palette[draft.newTags.length % palette.length] });
        }
        if (!draft.tags.includes(name)) draft.tags.push(name);
        $('#nt-name').value = ''; $('#nt-name-en').value = ''; $('#nt-emoji').value = '';
        $('#tag-picker').innerHTML = tagPicker();
        saveDraft();
      } else if (el.id === 'add-dish') {
        readForm(); draft.dishes.push({}); $('#dishes').innerHTML = dishRows(); saveDraft();
      } else if (el.dataset.delDish !== undefined) {
        readForm(); draft.dishes.splice(Number(el.dataset.delDish), 1); $('#dishes').innerHTML = dishRows(); saveDraft();
      } else if (el.id === 'add-photo') {
        readForm(); draft.photos.push({ file: String(draft.photos.length + 1).padStart(2, '0') + '.webp' }); $('#photos').innerHTML = photoRows(); saveDraft();
      } else if (el.dataset.delPhoto !== undefined) {
        readForm(); draft.photos.splice(Number(el.dataset.delPhoto), 1); $('#photos').innerHTML = photoRows(); saveDraft();
      } else if (el.id === 'copy-mon') {
        const mon = form.querySelector('[name=h_mon]').value;
        U.WEEK_ORDER.forEach((d) => { form.querySelector(`[name=h_${d}]`).value = mon; });
        readForm(); saveDraft();
      } else if (el.id === 'clear-draft') {
        FM.storage.remove('addDraft');
        draft = blankDraft();
        skeleton(); bindForm(); updateAutoPlace();
        U.toast(h(t('add.draftCleared')));
      } else if (el.dataset.copy) {
        U.copyText($('#output')._texts[el.dataset.copy], el);
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
      if (!rootBound) { rootBound = true; bindRoot(); }
      updateAutoPlace();
      if (saved && saved.savedAt && !relang) {
        const d = new Date(saved.savedAt);
        const note = $('#draft-note');
        note.hidden = false;
        const time = d.toLocaleString(FM.i18n.isEn() ? 'en-US' : 'zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        note.textContent = t('add.draftLoaded', { time });
      }
      relang = false;
    }
    document.title = t('site.titleSuffix', { name: t('add.pageTitle') });
  }

  /** 切換語言時呼叫：草稿已存好，清掉畫面讓下次 show() 用新語言重建 */
  function reset() {
    if (!built) return;
    readForm();
    FM.storage.save('addDraft', draft);
    root.innerHTML = '';
    built = false;
    relang = true;
  }

  FM.views = FM.views || {};
  FM.views.add = { show, reset };
})();
