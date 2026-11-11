/* view-shop.js — 店家頁（網址：index.html#<slug>）。
 * 所有欄位都是選填：有資料就顯示，沒有就顯示淡色的「尚未記錄」。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const U = FM.util;
  const { h } = U;

  let mini = null;

  const STATUS = {
    open: { cls: 'green', text: '🟢 營業中' },
    shut: { cls: 'red', text: '🔴 休息中' },
    unknown: { cls: 'gray', text: '⚪ 營業狀態未知' },
    'temp-closed': { cls: 'gray', text: '⏸️ 暫停營業' },
    closed: { cls: 'gray', text: '🕯️ 已歇業' },
  };

  const empty = (text) => `<span class="muted soft">${h(text || '尚未記錄')}</span>`;

  function statusBadge(s) {
    if (s.status !== 'open') return STATUS[s.status];
    const o = U.openState(s.hours);
    return o === 'open' ? STATUS.open : o === 'closed' ? STATUS.shut : STATUS.unknown;
  }

  function photosHtml(s) {
    if (!s.photos.length) {
      return `<div class="hero-ph" style="--c:${h(s.primaryTag.color)}"><span>${h(s.primaryTag.emoji)}</span><small>還沒有照片</small></div>`;
    }
    return `<div class="carousel" tabindex="0" aria-label="照片，可左右滑動">` +
      s.photos.map((p, i) => `<figure><img ${i ? 'loading="lazy"' : ''} src="${h(FM.photoUrl(s, p.file))}" alt="${h(p.alt || s.displayName + ' 照片 ' + (i + 1))}">` +
        (p.alt ? `<figcaption>${h(p.alt)}</figcaption>` : '') + '</figure>').join('') +
      `</div>${s.photos.length > 1 ? `<p class="carousel-hint muted">共 ${s.photos.length} 張，左右滑動看更多 →</p>` : ''}`;
  }

  function hoursHtml(s) {
    if (!U.hasAnyHours(s.hours)) {
      return empty('營業時間未記錄') + (s.hours && s.hours.note ? `<p class="hours-note">${h(s.hours.note)}</p>` : '');
    }
    const today = U.taipeiNow().day;
    const rows = U.WEEK_ORDER.map((d) => {
      const v = s.hours[d];
      return `<tr class="${d === today ? 'today' : ''}"><th>${U.DAY_NAMES[d]}${d === today ? '（今天）' : ''}</th><td>${U.isBlank(v) ? empty('—') : h(v)}</td></tr>`;
    }).join('');
    return `<table class="hours">${rows}</table>` +
      (s.hours.note ? `<p class="hours-note">💡 ${h(s.hours.note)}</p>` : '') +
      (s.hours_checked ? `<p class="muted small">營業時間確認於 ${h(U.fmtDate(s.hours_checked))}</p>` : '');
  }

  function dishesHtml(s) {
    if (!s.dishes.length) return `<p>${empty('還沒有記錄推薦餐點')}</p>`;
    return '<ul class="dishes">' + s.dishes.map((d) => `<li>
      <div class="dish-top"><b>${h(d.name)}</b>${U.isBlank(d.price) ? '' : `<span class="dish-price">NT$${h(d.price)}</span>`}</div>
      ${d.note ? `<p>${h(d.note)}</p>` : ''}</li>`).join('') + '</ul>';
  }

  function nearbyHtml(s) {
    const others = FM.data.shops.filter((x) => x.slug !== s.slug && x.status !== 'closed' &&
      ((s.district && x.district === s.district && x.city === s.city) || (!s.district && s.city && x.city === s.city)));
    if (!others.length) return '';
    return `<section class="card section"><h2>🧭 同一區的其他店</h2><div class="mini-list">` +
      others.slice(0, 3).map((x) => `<a href="#${h(x.slug)}" class="mini-item"><span class="mi-emoji" style="--c:${h(x.primaryTag.color)}">${h(x.primaryTag.emoji)}</span>` +
        `<span><b>${h(x.displayName)}</b><br>${U.starsHtml(x.rating)}</span></a>`).join('') + '</div></section>';
  }

  function render(s) {
    const st = statusBadge(s);
    const price = U.priceText(s);
    const place = [s.city, s.district].filter(Boolean).join(' ');
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([s.name, s.address].filter(Boolean).join(' '));
    const ratingNote = s.rating ? `<span class="muted small">${h(U.RATING[s.rating].title)}・${h(U.RATING[s.rating].text)}</span>` : '';

    return `
      <a href="#" class="back-link" data-nav="home">← 回到地圖</a>
      <article class="shop">
        <div class="shop-hero">${photosHtml(s)}</div>

        <header class="shop-head card">
          <div class="shop-title">
            <h1>${h(s.displayName)}${s.branch ? ` <small>${h(s.branch)}</small>` : ''}</h1>
            <span class="badge ${st.cls}">${st.text}</span>
          </div>
          <p class="shop-place muted">${place ? `📍 ${h(place)}` : ''}</p>
          <div class="shop-rating">${U.starsHtml(s.rating)} ${ratingNote}</div>
          <p class="shop-price">${price ? `💰 ${h(price)}` : empty('價位未記錄')}</p>
          <div class="tags">${s.tagObjs.length ? s.tagObjs.map((t) => U.tagChipHtml(t)).join('') : empty('還沒有標籤')}</div>
        </header>

        <div class="shop-grid">
          <section class="card section">
            <h2>📒 店家資訊</h2>
            <dl class="info">
              <dt>地址</dt>
              <dd>${s.address ? `${s.zip ? `<span class="muted">${h(s.zip)}</span> ` : ''}${h(s.address)}<br><a href="${h(mapsUrl)}" target="_blank" rel="noopener">在 Google 地圖開啟 ↗</a>` : empty()}</dd>
              <dt>營業時間</dt>
              <dd>${hoursHtml(s)}</dd>
              <dt>造訪</dt>
              <dd>${s.visited ? h(U.fmtDate(s.visited)) : empty()}</dd>
              ${s.links.length ? `<dt>連結</dt><dd>${s.links.map((l) => `<a href="${h(l.url)}" target="_blank" rel="noopener">${h(l.label || l.url)} ↗</a>`).join('<br>')}</dd>` : ''}
            </dl>
          </section>

          <section class="card section">
            <h2>🍽️ 推薦餐點</h2>
            ${dishesHtml(s)}
          </section>
        </div>

        <section class="card section">
          <h2>📝 我的心得</h2>
          <div class="prose">${s.body || `<p>${empty('還沒寫心得，下次吃完記得補上 ✍️')}</p>`}</div>
        </section>

        <section class="card section">
          <h2>🗺️ 位置</h2>
          ${s.hasCoords
            ? `<div id="mini-map" class="map mini"></div>${s.coords_approx ? '<p class="muted small">📍 這個位置是估計值，可能和實際店面差一點點。</p>' : ''}`
            : `<p>${empty('還沒有座標，所以地圖上看不到這間店。')}</p><p class="muted small">在 Google 地圖對店家按右鍵，點選第一行的數字就能複製座標。</p>`}
        </section>

        ${nearbyHtml(s)}

        <p class="muted small updated">${s.updated ? `最後更新 ${h(U.fmtDate(s.updated))}` : ''}</p>
      </article>`;
  }

  function show(slug) {
    const root = document.getElementById('view-shop');
    const s = FM.data.bySlug.get(slug);
    if (mini) { mini.remove(); mini = null; }
    root.innerHTML = render(s);
    document.title = `${s.displayName}｜我的台灣美食圖鑑`;
    if (s.hasCoords) mini = FM.map.createMini(root.querySelector('#mini-map'), s);
  }

  FM.views = FM.views || {};
  FM.views.shop = { show };
})();
