/* view-about.js — 關於頁（網址：index.html#about）。評分與價位說明和 AGENTS.md 第 5 節同步。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const U = FM.util;
  const { h } = U;

  function show() {
    const root = document.getElementById('view-about');
    const tags = (FM.data.meta.tags || []).filter((t) => t.preset);
    root.innerHTML = `
      <div class="page-head">
        <h1>關於這本圖鑑</h1>
        <p class="muted">這裡記錄我在台灣吃過的店。好吃的想再去，踩雷的也記下來提醒自己。所有評分都是我個人的主觀感受。</p>
      </div>
      <div class="about-grid">
        <section class="card section">
          <h2>⭐ 評分標準</h2>
          <table class="std">${[5, 4, 3, 2, 1].map((n) => `<tr><th>${U.starsHtml(n)}</th><td><b>${h(U.RATING[n].title)}</b><br><span class="muted">${h(U.RATING[n].text)}</span></td></tr>`).join('')}</table>
        </section>
        <section class="card section">
          <h2>💰 價位標準（每人一餐）</h2>
          <table class="std">${[1, 2, 3, 4].map((n) => `<tr><th class="price-sign">${U.PRICE[n].sign}</th><td>${h(U.PRICE[n].text)}</td></tr>`).join('')}</table>
          <h2 class="mt">🏷️ 基本標籤</h2>
          <div class="tags">${tags.map((t) => U.tagChipHtml(t)).join('')}</div>
          <p class="muted small">另外也可以自己建立新標籤，例如「🐱 有店貓」。</p>
        </section>
        <section class="card section">
          <h2>🗺️ 怎麼用</h2>
          <ul class="howto">
            <li>上方可以依<b>區域 → 縣市 → 區</b>篩選，也可以直接打地名或店名搜尋（「台」和「臺」都可以）。</li>
            <li>地圖放大到街道，就會看到店名和每間店的標籤。</li>
            <li>你上次用的篩選條件和地圖位置會自動記住（只存在這台裝置的瀏覽器裡）。</li>
          </ul>
        </section>
      </div>`;
    document.title = '關於｜我的台灣美食圖鑑';
  }

  FM.views = FM.views || {};
  FM.views.about = { show };
})();
