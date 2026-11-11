/* storage.js — 唯一可以碰 localStorage 的地方。
 * 無痕模式、空間滿了或被瀏覽器封鎖時，網站照常運作，只是不會記住狀態。 */
(function () {
  'use strict';
  const FM = (window.FM = window.FM || {});
  const PREFIX = 'foodmap:v1:';

  function load(key, fallback) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      window.localStorage.setItem(PREFIX + 'savedAt', JSON.stringify(new Date().toISOString()));
      return true;
    } catch (e) {
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch (e) { /* 忽略 */ }
  }

  FM.storage = { load, save, remove };
})();
