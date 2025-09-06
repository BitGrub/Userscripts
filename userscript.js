// ==UserScript==
// @name         Nexus Mods – Updated & Downloaded Mod Highlighter (All Views)
// @version      1.0.0
// @description  Highlight mods with "Update available" (yellow) or "Downloaded" (green) across Standard, List, and Compact views
// @author       Flimbo
// @match        https://*.nexusmods.com/games/*/mods*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const STYLE_ID  = 'nm-highlighter-style';
  const HL_UPDATE = 'nm-update-card';
  const HL_DOWN   = 'nm-downloaded-card';

  // Explicit tile wrappers (covers mod-tile, mod-tile-list, mod-tile-standard, mod-tile-compact)
  const TILE_SELECTOR = '[data-e2eid="mod-tile"],[data-e2eid="mod-tile-list"],[data-e2eid="mod-tile-standard"],[data-e2eid="mod-tile-compact"]';

  function injectCSS() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes nm-glow {
      0%, 100% { box-shadow: 0 0 6px rgba(255,213,0,0.6); }
      50%      { box-shadow: 0 0 14px rgba(255,213,0,1); }
    }

    .${HL_UPDATE} {
      outline: 3px solid rgba(255,213,0,.85) !important;
      outline-offset: 2px;
      border-radius: 10px;
      animation: nm-glow 2s ease-in-out infinite;
    }

    .${HL_DOWN} {
      outline: 3px solid rgba(0,200,0,.8) !important;
      outline-offset: 2px;
      border-radius: 10px;
    }
  `;
  document.head.appendChild(s);
}

  function clearHighlights() {
    document.querySelectorAll(TILE_SELECTOR).forEach(t => {
      t.classList.remove(HL_UPDATE, HL_DOWN);
    });
  }

  function applyFromBadges() {
    // Mark updates first (so update beats downloaded)
    document.querySelectorAll('[data-e2eid="mod-tile-update-available"]').forEach(b => {
      const tile = b.closest(TILE_SELECTOR);
      if (tile) tile.classList.add(HL_UPDATE);
    });

    // Then mark downloaded where update isn't present
    document.querySelectorAll('[data-e2eid="mod-tile-downloaded"]').forEach(b => {
      const tile = b.closest(TILE_SELECTOR);
      if (tile && !tile.classList.contains(HL_UPDATE)) tile.classList.add(HL_DOWN);
    });
  }

  let debounceTimer = null;
  function markAllDebounced() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      clearHighlights();
      applyFromBadges();
    }, 80);
  }

  function boot() {
    injectCSS();
    // initial pass
    markAllDebounced();

    // observe DOM for badges/tiles being added (infinite scroll / hydration)
    const mo = new MutationObserver(markAllDebounced);
    mo.observe(document.body, { childList: true, subtree: true });

    // SPA navigation hooks
    const _push = history.pushState, _replace = history.replaceState;
    history.pushState = function() { const r = _push.apply(this, arguments); markAllDebounced(); return r; };
    history.replaceState = function() { const r = _replace.apply(this, arguments); markAllDebounced(); return r; };
    addEventListener('popstate', markAllDebounced);
  }

  if (document.readyState === 'loading') {
    addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();