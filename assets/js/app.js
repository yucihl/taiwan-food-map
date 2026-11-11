/* app.js — 進入點：讀資料、依網址的 #hash 切換頁面。
 *   #          首頁（地圖）
 *   #<slug>    店家頁
 *   #add       新增店家
 *   #about     關於 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const VIEWS = ['home', 'shop', 'add', 'about', '404'];
  let homeScroll = 0, current = null;

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
      document.title = '我的台灣美食圖鑑';
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
        '<div class="empty card"><p class="big">🍙</p><p>找不到這一頁，可能是店家網址打錯了</p><a class="btn" href="#">回到地圖</a></div>';
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
    try {
      await FM.loadData();
    } catch (err) {
      document.getElementById('main').innerHTML =
        `<div class="empty card"><p class="big">😵</p><p>資料讀取失敗：${FM.util.h(err.message)}</p></div>`;
      return;
    }
    if (FM.data.meta.built) document.getElementById('built-at').textContent = `資料更新於 ${FM.data.meta.built}`;
    if (window.FOODMAP_PREVIEW) {
      const b = document.getElementById('preview-banner');
      b.hidden = false;
      b.textContent = '👀 預覽版：這裡無法載入街道圖磚，所以底圖只畫出行政區界線；上傳到 GitHub Pages 後會顯示完整的街道地圖。';
    }
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
