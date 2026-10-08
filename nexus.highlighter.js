// ==UserScript==
// @name         NexusMods – Highlight Updated & Downloaded Mods on Nexus
// @version      1.1.1
// @license      GPL-3.0-or-later
// @description  Highlights mods with "Update available" (yellow) or "Downloaded" (green) across Standard, List, and Compact views
// @author       Flimbo
// @match        https://*.nexusmods.com/games/*/mods*
// @match        https://*.nexusmods.com/profile/*/mods*
// @grant        none
// @run-at       document-idle
// @homepageURL  https://github.com/BitGrub/Userscripts
// @homepage     https://github.com/BitGrub/Userscripts
// @supportURL   https://github.com/BitGrub/Userscripts/issues
// @downloadURL  https://raw.githubusercontent.com/BitGrub/Userscripts/main/nexus.highlighter.js
// @updateURL    https://raw.githubusercontent.com/BitGrub/Userscripts/main/nexus.highlighter.js
// ==/UserScript==

(() => {
    'use strict';

    const STYLE_ID = 'nm-highlighter-style';
    const HL_UPDATE = 'nm-update-card';
    const HL_DOWN = 'nm-downloaded-card';

    // ---- Badge selectors ----
    const UPDATE_BADGE_SELECTORS = [
        '[data-e2eid="mod-tile-update-available"]',
        '[data-e2eid*="update-available"]',
        '[data-e2eid*="update_available"]',
        '[aria-label*="update available" i]',
        '[title*="update available" i]',
        '[class*="update-available" i]',
    ];
    const DOWN_BADGE_SELECTORS = [
        '[data-e2eid="mod-tile-downloaded"]',
        '[data-e2eid*="downloaded"]',
        '[aria-label*="downloaded" i]',
        '[title*="downloaded" i]',
        '[class*="downloaded" i]',
    ];

    const CARD_SELECTORS = [
        '[data-e2eid="mod-tile"]',
        '[data-e2eid="mod-tile-list"]',
        '[data-e2eid="mod-tile-standard"]',
        '[data-e2eid="mod-tile-compact"]',
        '.group\\/mod-tile',
        '[class*="@container/mod-tile"]',
        '[data-mod-id]',
        'article',
    ];

    const MIN_CARD_WIDTH = 150;
    const MOD_LINK_SELECTOR = 'a[href*="/mods/"]';

    const UPDATE_TEXT_RE = /(update available|update verfügbar|mise à jour disponible|aggiornamento disponibile)/i;
    const DOWN_TEXT_RE = /(\bdownloaded\b|heruntergeladen|téléchargé|scaricato)/i;

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
        outline: 4px solid rgba(255,213,0,.85) !important;
        outline-offset: 2px;
        border-radius: 6px;
        animation: nm-glow 2s ease-in-out infinite;
      }
      .${HL_DOWN} {
        outline: 4px solid rgba(0,200,0,.8) !important;
        outline-offset: 2px;
        border-radius: 6px;
      }
    `;
        document.head.appendChild(s);
    }

    function clearHighlights() {
        document
            .querySelectorAll('.' + HL_UPDATE + ',.' + HL_DOWN)
            .forEach(t => t.classList.remove(HL_UPDATE, HL_DOWN));
    }

    function isVisible(el) {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }

    function findCardFromBadge(badge) {
        for (const sel of CARD_SELECTORS) {
            let card = null;
            try { card = badge.closest(sel); } catch (_) { /* ignore */ }
            if (card && card !== badge) return card;
        }

        let el = badge.parentElement;
        let depth = 0;
        while (el && el !== document.body && depth < 15) {
            const hasModLink = el.querySelector(MOD_LINK_SELECTOR);
            const wideEnough = el.getBoundingClientRect().width >= MIN_CARD_WIDTH;
            if (hasModLink && wideEnough) return el;
            el = el.parentElement;
            depth++;
        }
        return badge.parentElement;
    }

    function findAny(root, selectors) {
        for (const sel of selectors) {
            try {
                const el = root.querySelector(sel);
                if (el) return el;
            } catch (_) { /* ignore invalid selector */ }
        }
        return null;
    }

    function findBadgeByText(scope, re) {
        const candidates = scope.querySelectorAll('span, div, p, small, strong, em, a');
        for (const el of candidates) {
            if (el.querySelector('span, div, p, small, strong, em, a')) continue;
            const txt = (el.textContent || '').trim();
            if (txt && txt.length < 40 && re.test(txt)) return el;
        }
        return null;
    }

    function applyFromBadges() {
        const updateBadges = new Set();
        for (const sel of UPDATE_BADGE_SELECTORS) {
            try {
                document.querySelectorAll(sel).forEach(b => updateBadges.add(b));
            } catch (_) { /* ignore */ }
        }
        document.querySelectorAll('article, li, [data-e2eid*="mod-card"]').forEach(card => {
            const b = findBadgeByText(card, UPDATE_TEXT_RE);
            if (b) updateBadges.add(b);
        });
        updateBadges.forEach(badge => {
            if (!isVisible(badge)) return;
            const card = findCardFromBadge(badge);
            if (card && card !== badge) card.classList.add(HL_UPDATE);
        });

        const downBadges = new Set();
        for (const sel of DOWN_BADGE_SELECTORS) {
            try {
                document.querySelectorAll(sel).forEach(b => downBadges.add(b));
            } catch (_) { /* ignore */ }
        }
        document.querySelectorAll('article, li, [data-e2eid*="mod-card"]').forEach(card => {
            const b = findBadgeByText(card, DOWN_TEXT_RE);
            if (b) downBadges.add(b);
        });
        downBadges.forEach(badge => {
            if (!isVisible(badge)) return;
            const card = findCardFromBadge(badge);
            if (card && card !== badge && !card.classList.contains(HL_UPDATE)) {
                card.classList.add(HL_DOWN);
            }
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
        markAllDebounced();

        const mo = new MutationObserver(markAllDebounced);
        mo.observe(document.body, { childList: true, subtree: true });

        const _push = history.pushState;
        const _replace = history.replaceState;
        history.pushState = function () {
            const r = _push.apply(this, arguments);
            markAllDebounced();
            return r;
        };
        history.replaceState = function () {
            const r = _replace.apply(this, arguments);
            markAllDebounced();
            return r;
        };
        addEventListener('popstate', markAllDebounced);
    }

    if (document.readyState === 'loading') {
        addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
