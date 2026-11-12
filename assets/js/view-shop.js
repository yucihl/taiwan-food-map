/* view-shop.js — 店家頁（網址：index.html#<slug>）。
 * 所有欄位都是選填：有資料就顯示，沒有就顯示淡色的「尚未記錄」。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const U = FM.util;
  const { h } = U;
  const t = (k, v) => FM.t(k, v);

  let mini = null;

  // 文字在 i18n.js 的 status.*
  const STATUS = {
    open: { cls: 'green', key: 'status.open' },
    shut: { cls: 'red', key: 'status.shut' },
    unknown: { cls: 'gray', key: 'status.unknown' },
    'temp-closed': { cls: 'gray', key: 'status.tempClosed' },
    closed: { cls: 'gray', key: 'status.closed' },
  };

  const empty = (text) => `<span class="muted soft">${h(text || t('empty'))}</span>`;

  /** 營業時間的值：英文模式下把「公休」「未知」換成英文，其他照原文 */
  function hoursText(v) {
    const s = String(v).trim();
    if (s === '公休') return t('hours.closed');
    if (s === '未知') return t('hours.unknown');
    return s;
  }

  function statusBadge(s) {
    if (s.status !== 'open') return STATUS[s.status];
    const o = U.openState(s.hours);
    return o === 'open' ? STATUS.open : o === 'closed' ? STATUS.shut : STATUS.unknown;
  }

  function photosHtml(s) {
    if (!s.photos.length) {
      return `<div class="hero-ph" style="--c:${h(s.primaryTag.color)}"><span>${h(s.primaryTag.emoji)}</span><small>${h(t('shop.noPhoto'))}</small></div>`;
    }
    return `<div class="carousel" tabindex="0" aria-label="${h(t('shop.carousel'))}">` +
      s.photos.map((p, i) => `<figure><img ${i ? 'loading="lazy"' : ''} src="${h(FM.photoUrl(s, p.file))}" alt="${h(p.alt || t('shop.photoAlt', { name: s.displayName, n: i + 1 }))}">` +
        (p.alt ? `<figcaption>${h(p.alt)}</figcaption>` : '') + '</figure>').join('') +
      `</div>${s.photos.length > 1 ? `<p class="carousel-hint muted">${h(t('shop.photoCount', { n: s.photos.length }))}</p>` : ''}`;
  }

  function hoursHtml(s) {
    if (!U.hasAnyHours(s.hours)) {
      return empty(t('shop.noHours')) + (s.hours && s.hours.note ? `<p class="hours-note">${h(s.hours.note)}</p>` : '');
    }
    const today = U.taipeiNow().day;
    const rows = U.WEEK_ORDER.map((d) => {
      const v = s.hours[d];
      return `<tr class="${d === today ? 'today' : ''}"><th>${h(U.dayName(d))}${d === today ? h(t('shop.today')) : ''}</th><td>${U.isBlank(v) ? empty('—') : h(hoursText(v))}</td></tr>`;
    }).join('');
    return `<table class="hours">${rows}</table>` +
      (s.hours.note ? `<p class="hours-note">💡 ${h(s.hours.note)}</p>` : '') +
      (s.hours_checked ? `<p class="muted small">${h(t('shop.hoursChecked', { date: U.fmtDate(s.hours_checked) }))}</p>` : '');
  }

  function dishesHtml(s) {
    if (!s.dishes.length) return `<p>${empty(t('shop.noDishes'))}</p>`;
    return '<ul class="dishes">' + s.dishes.map((d) => `<li>
      <div class="dish-top"><b>${h(FM.dishName(d))}</b>${U.isBlank(d.price) ? '' : `<span class="dish-price">NT$${h(d.price)}</span>`}</div>
      ${d.note ? `<p>${h(d.note)}</p>` : ''}</li>`).join('') + '</ul>';
  }

  function nearbyHtml(s) {
    const others = FM.data.shops.filter((x) => x.slug !== s.slug && x.status !== 'closed' &&
      ((s.district && x.district === s.district && x.city === s.city) || (!s.district && s.city && x.city === s.city)));
    if (!others.length) return '';
    return `<section class="card section"><h2>${h(t('shop.nearby'))}</h2><div class="mini-list">` +
      others.slice(0, 3).map((x) => `<a href="#${h(x.slug)}" class="mini-item"><span class="mi-emoji" style="--c:${h(x.primaryTag.color)}">${h(x.primaryTag.emoji)}</span>` +
        `<span><b>${h(x.displayName)}</b><br>${U.starsHtml(x.rating)}</span></a>`).join('') + '</div></section>';
  }

  function render(s) {
    const st = statusBadge(s);
    const price = U.priceText(s);
    const place = FM.place.parts(s).join(t('sep.placeLong'));
    const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([s.name, s.address].filter(Boolean).join(' '));
    const ratingNote = s.rating ? `<span class="muted small">${h(U.RATING[s.rating].title)}${t('sep.note')}${h(U.RATING[s.rating].text)}</span>` : '';

    return `
      <a href="#" class="back-link" data-nav="home">${h(t('shop.back'))}</a>
      <article class="shop">
        <div class="shop-hero">${photosHtml(s)}</div>

        <header class="shop-head card">
          <div class="shop-title">
            <h1>${h(s.displayName)}${s.branch ? ` <small>${h(s.branch)}</small>` : ''}</h1>
            <span class="badge ${st.cls}">${h(t(st.key))}</span>
          </div>
          <p class="shop-place muted">${place ? `📍 ${h(place)}` : ''}</p>
          <div class="shop-rating">${U.starsHtml(s.rating)} ${ratingNote}</div>
          <p class="shop-price">${price ? `💰 ${h(price)}` : empty(t('shop.noPrice'))}</p>
          <div class="tags">${s.tagObjs.length ? s.tagObjs.map((tg) => U.tagChipHtml(tg)).join('') : empty(t('shop.noTags'))}</div>
        </header>

        <div class="shop-grid">
          <section class="card section">
            <h2>${h(t('shop.info'))}</h2>
            <dl class="info">
              <dt>${h(t('shop.address'))}</dt>
              <dd>${s.address ? `${s.zip ? `<span class="muted">${h(s.zip)}</span> ` : ''}${h(s.address)}<br><a href="${h(mapsUrl)}" target="_blank" rel="noopener">${h(t('shop.openMaps'))}</a>` : empty()}</dd>
              <dt>${h(t('shop.hours'))}</dt>
              <dd>${hoursHtml(s)}</dd>
              <dt>${h(t('shop.visited'))}</dt>
              <dd>${s.visited ? h(U.fmtDate(s.visited)) : empty()}</dd>
              ${s.links.length ? `<dt>${h(t('shop.links'))}</dt><dd>${s.links.map((l) => `<a href="${h(l.url)}" target="_blank" rel="noopener">${h(l.label || l.url)} ↗</a>`).join('<br>')}</dd>` : ''}
            </dl>
          </section>

          <section class="card section">
            <h2>${h(t('shop.dishes'))}</h2>
            ${dishesHtml(s)}
          </section>
        </div>

        <section class="card section">
          <h2>${h(t('shop.notes'))}</h2>
          <div class="prose">${s.bodyHtml || `<p>${empty(t('shop.noNotes'))}</p>`}</div>
        </section>

        <section class="card section">
          <h2>${h(t('shop.location'))}</h2>
          ${s.hasCoords
            ? `<div id="mini-map" class="map mini"></div>${s.coords_approx ? `<p class="muted small">${h(t('shop.approx'))}</p>` : ''}`
            : `<p>${empty(t('shop.noCoords'))}</p><p class="muted small">${h(t('shop.coordsTip'))}</p>`}
        </section>

        ${nearbyHtml(s)}

        <p class="muted small updated">${s.updated ? h(t('shop.updated', { date: U.fmtDate(s.updated) })) : ''}</p>
      </article>`;
  }

  function show(slug) {
    const root = document.getElementById('view-shop');
    const s = FM.data.bySlug.get(slug);
    if (mini) { mini.remove(); mini = null; }
    root.innerHTML = render(s);
    document.title = t('site.titleSuffix', { name: s.displayName });
    if (s.hasCoords) mini = FM.map.createMini(root.querySelector('#mini-map'), s);
  }

  FM.views = FM.views || {};
  FM.views.shop = { show };
})();
