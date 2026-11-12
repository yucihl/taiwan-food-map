/* util.js — 共用小工具。所有模組都掛在 window.FM 底下。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  /** 把任何值轉成可以安全放進 HTML 的字串 */
  function h(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  /** 搜尋用正規化：台→臺、全形空白、英文小寫、去頭尾空白 */
  function norm(s) {
    return String(s || '')
      .replace(/台/g, '臺')
      .replace(/　/g, ' ')
      .toLowerCase()
      .trim();
  }

  function isBlank(v) {
    return v === null || v === undefined || (typeof v === 'string' && v.trim() === '') ||
      (Array.isArray(v) && v.length === 0);
  }

  // 評分與價位標準（AGENTS.md 第 5 節）。說明文字的中英版本在 i18n.js 的 rating.* / price.*
  const t = (k, v) => FM.t(k, v);
  const PRICE = {};
  [1, 2, 3, 4].forEach((n) => {
    PRICE[n] = { sign: '$'.repeat(n), get text() { return t('price.' + n); } };
  });
  const RATING = {};
  [1, 2, 3, 4, 5].forEach((n) => {
    RATING[n] = { get title() { return t(`rating.${n}.title`); }, get text() { return t(`rating.${n}.text`); } };
  });

  /** 星星評分 HTML；沒有評分回傳淡色文字 */
  function starsHtml(rating, opts) {
    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      return opts && opts.hideEmpty ? '' : `<span class="stars stars-empty">${h(t('stars.none'))}</span>`;
    }
    const n = Math.round(r);
    return `<span class="stars" role="img" aria-label="${h(t('stars.aria', { n, title: RATING[n].title }))}">` +
      '<span class="on">' + '★'.repeat(n) + '</span>' +
      '<span class="off">' + '★'.repeat(5 - n) + '</span></span>';
  }

  function priceSign(level) {
    return PRICE[level] ? PRICE[level].sign : '';
  }

  /** 卡片、標題用的價位文字 */
  function priceText(shop) {
    const parts = [];
    if (PRICE[shop.price_level]) parts.push(PRICE[shop.price_level].sign);
    if (!isBlank(shop.price_note)) parts.push(shop.price_note);
    return parts.join(' · ');
  }

  /** 標籤膠囊 */
  function tagChipHtml(tag, extraClass) {
    return `<span class="tag-chip ${extraClass || ''}" style="--tag:${h(tag.color)}">` +
      `<span aria-hidden="true">${h(tag.emoji)}</span>${h(FM.i18n.tagName(tag))}</span>`;
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* —— 時間（一律以台灣時間計算）—— */
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayName = (d) => t('day.' + d);
  const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  function taipeiNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei', weekday: 'short', hour: '2-digit', minute: '2-digit',
      year: 'numeric', month: '2-digit', day: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value;
    const wd = get('weekday').toLowerCase().slice(0, 3);
    const hour = Number(get('hour')) % 24;
    return {
      day: wd,
      minutes: hour * 60 + Number(get('minute')),
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${String(hour).padStart(2, '0')}:${get('minute')}`,
    };
  }

  /** "11:00-14:00, 17:00-21:00" → [[660,840],[1020,1260]]；公休 → []；無法解析 → null */
  function parseRanges(str) {
    if (isBlank(str)) return null;
    const s = String(str).trim();
    if (/公休|休息|closed/i.test(s)) return [];
    if (/未知/.test(s)) return null;
    const out = [];
    const re = /(\d{1,2}):(\d{2})\s*[-–~～至]\s*(\d{1,2}):(\d{2})/g;
    let m;
    while ((m = re.exec(s))) {
      out.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
    }
    return out.length ? out : null;
  }

  /** 回傳 'open' | 'closed' | 'unknown' */
  function openState(hours) {
    if (!hours || typeof hours !== 'object') return 'unknown';
    const now = taipeiNow();
    const idx = DAY_KEYS.indexOf(now.day);
    const today = parseRanges(hours[now.day]);
    const yesterday = parseRanges(hours[DAY_KEYS[(idx + 6) % 7]]);
    let known = false;
    if (today) {
      known = true;
      for (const [a, b] of today) {
        if (b > a ? now.minutes >= a && now.minutes < b : now.minutes >= a) return 'open';
      }
    }
    if (yesterday) {
      for (const [a, b] of yesterday) {
        if (b <= a && now.minutes < b) return 'open'; // 昨天跨夜的時段
      }
    }
    return known ? 'closed' : 'unknown';
  }

  function hasAnyHours(hours) {
    return !!hours && WEEK_ORDER.some((d) => !isBlank(hours[d]));
  }

  function fmtDate(d) {
    if (isBlank(d)) return '';
    const s = String(d).slice(0, 10);
    const [y, m, day] = s.split('-');
    return y && m && day ? `${y}/${Number(m)}/${Number(day)}` : s;
  }

  function toast(html, ms) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = html;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => (el.hidden = true), 300);
    }, ms || 3000);
  }

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const old = btn.textContent;
        btn.textContent = t('copied');
        setTimeout(() => (btn.textContent = old), 1500);
      }
    } catch (e) {
      toast(h(t('copyFail')));
    }
  }

  FM.util = {
    h, norm, isBlank, PRICE, RATING, starsHtml, priceSign, priceText, tagChipHtml, debounce,
    dayName, WEEK_ORDER, taipeiNow, parseRanges, openState, hasAnyHours, fmtDate, toast, copyText,
  };
})();
