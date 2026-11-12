/* view-about.js — 關於頁（網址：index.html#about）。評分與價位說明和 AGENTS.md 第 5 節同步。
 * 所有文字都在 i18n.js 的 about.*、rating.*、price.* */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const U = FM.util;
  const { h } = U;
  const t = (k, v) => FM.t(k, v);

  function show() {
    const root = document.getElementById('view-about');
    const tags = (FM.data.meta.tags || []).filter((tg) => tg.preset);
    root.innerHTML = `
      <div class="page-head">
        <h1>${h(t('about.title'))}</h1>
        <p class="muted">${h(t('about.intro'))}</p>
      </div>
      <div class="about-grid">
        <section class="card section">
          <h2>${h(t('about.rating'))}</h2>
          <table class="std">${[5, 4, 3, 2, 1].map((n) => `<tr><th>${U.starsHtml(n)}</th><td><b>${h(U.RATING[n].title)}</b><br><span class="muted">${h(U.RATING[n].text)}</span></td></tr>`).join('')}</table>
        </section>
        <section class="card section">
          <h2>${h(t('about.price'))}</h2>
          <table class="std">${[1, 2, 3, 4].map((n) => `<tr><th class="price-sign">${U.PRICE[n].sign}</th><td>${h(U.PRICE[n].text)}</td></tr>`).join('')}</table>
          <h2 class="mt">${h(t('about.tags'))}</h2>
          <div class="tags">${tags.map((tg) => U.tagChipHtml(tg)).join('')}</div>
          <p class="muted small">${h(t('about.tagsNote'))}</p>
        </section>
        <section class="card section">
          <h2>${h(t('about.howto'))}</h2>
          <ul class="howto">
            <li>${t('about.howto1')}</li>
            <li>${h(t('about.howto2'))}</li>
            <li>${h(t('about.howto3'))}</li>
          </ul>
        </section>
      </div>`;
    document.title = t('site.titleSuffix', { name: t('about.pageTitle') });
  }

  FM.views = FM.views || {};
  FM.views.about = { show };
})();
