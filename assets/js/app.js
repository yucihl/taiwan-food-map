/* app.js — 進入點：讀資料、依網址的 #hash 切換頁面。
 *   #          首頁（地圖）
 *   #<slug>    店家頁
 *   #add       新增店家
 *   #about     關於
 * 也負責 index.html 上的固定文字（data-i18n）和語言切換按鈕。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const VIEWS = ['home', 'shop', 'add', 'about', '404'];
  let homeScroll = 0, current = null;
  const t = (k, v) => FM.t(k, v);

  /** 把 index.html 上有 data-i18n 的固定文字換成目前語言 */
  function applyStaticText() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    const btn = document.getElementById('lang-toggle');
    btn.setAttribute('aria-label', t('lang.toggleLabel'));
    btn.querySelectorAll('[data-lang]').forEach((el) => el.classList.toggle('on', el.dataset.lang === FM.i18n.lang));
    if (FM.data && FM.data.meta.built) document.getElementById('built-at').textContent = t('footer.built', { time: FM.data.meta.built });
    const b = document.getElementById('preview-banner');
    if (window.FOODMAP_PREVIEW) { b.hidden = false; b.textContent = t('preview.banner'); }
  }

  /** 切換語言：更新固定文字，拆掉已畫好的頁面，再依網址重畫目前這一頁 */
  function onLangChange() {
    applyStaticText();
    if (!FM.data) return; // 資料還沒讀完：等一下 route() 會直接用新語言畫
    FM.views.home.reset();
    FM.views.add.reset();
    const y = window.scrollY;
    if (current === 'home') homeScroll = y;
    route();
    window.scrollTo(0, y);
  }

  function showView(name) {
    if (current === 'home') homeScroll = window.scrollY;
    VIEWS.forEach((v) => { document.getElementById('view-' + v).hidden = v !== name; });
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === name);
    });
    current = name;
  }

  function route() {
    const key = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!key || key === 'home' || key === 'map') {
      showView('home');
      FM.views.home.show();
      document.title = t('site.title');
      window.scrollTo(0, homeScroll);
      return;
    }
    if (key === 'add' || key === 'about') {
      showView(key);
      FM.views[key].show();
    } else if (FM.data.bySlug.has(key)) {
      showView('shop');
      FM.views.shop.show(key);
    } else {
      showView('404');
      document.getElementById('view-404').innerHTML =
        `<div class="empty card"><p class="big">🍙</p><p>${FM.util.h(t('notFound.text'))}</p><a class="btn" href="#" data-nav="home">${FM.util.h(t('notFound.back'))}</a></div>`;
      document.title = t('site.title');
    }
    window.scrollTo(0, 0);
  }

  function goHome(e) {
    // 「回到地圖」用 hash 清空，避免把 #home 留在網址上
    e.preventDefault();
    if (window.location.hash && window.FOODMAP_PREVIEW) {
      window.location.hash = '';
      return;
    }
    if (window.location.hash) {
      try {
        history.pushState(null, '', window.location.pathname + window.location.search);
      } catch (err) {
        window.location.hash = '';
      }
    }
    route();
  }

  async function start() {
    document.getElementById('year').textContent = new Date().getFullYear();
    applyStaticText();
    document.getElementById('lang-toggle').addEventListener('click', () => {
      FM.i18n.setLang(FM.i18n.isEn() ? 'zh' : 'en');
    });
    FM.i18n.onChange(onLangChange);
    try {
      await FM.loadData();
    } catch (err) {
      document.getElementById('main').innerHTML =
        `<div class="empty card"><p class="big">😵</p><p>${FM.util.h(t('error.load', { msg: err.message }))}</p></div>`;
      return;
    }
    applyStaticText();
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-nav="home"]');
      if (a) goHome(e);
    });
    window.addEventListener('hashchange', route);
    window.addEventListener('popstate', route);
    route();
  }

  start();
})();
