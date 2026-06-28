// ==UserScript==
// @name         Autohero - Clean Detail Page + Pin Properties
// @namespace    https://github.com/gogamid/autohero-scripts
// @version      1.4
// @description  Remove clutter from autohero car detail pages, and pin key vehicle properties to the top
// @author       gogamid
// @match        https://www.autohero.com/de/v1/*/id/*
// @match        https://www.autohero.com/de/*/id/*
// @icon         https://www.autohero.com/favicon.ico
// @updateURL    https://cdn.jsdelivr.net/gh/gogamid/autohero-scripts@main/autohero-clean-detail.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/gogamid/autohero-scripts@main/autohero-clean-detail.user.js
// @supportURL   https://github.com/gogamid/autohero-scripts/issues
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'ah_pinned_props';

    GM_addStyle(`
        #ah-pinned-bar {
            position: sticky; top: 0; z-index: 9999;
            background: #1a1a2e; color: #fff;
            padding: 10px 20px; display: flex; flex-wrap: wrap; gap: 12px 24px;
            font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 2px 12px rgba(0,0,0,0.25);
            align-items: center;
            min-height: 32px;
        }
        #ah-pinned-bar .ah-pin-item {
            display: inline-flex; align-items: center; gap: 4px;
            background: #16213e; padding: 4px 10px; border-radius: 6px;
        }
        #ah-pinned-bar .ah-pin-item .ah-label {
            color: #a0aec0; font-weight: 500;
        }
        #ah-pinned-bar .ah-pin-item .ah-value {
            color: #fff; font-weight: 700;
        }
        #ah-pinned-bar .ah-unpin {
            cursor: pointer; opacity: 0.6; margin-left: 2px; font-size: 11px;
        }
        #ah-pinned-bar .ah-unpin:hover { opacity: 1; }
        #ah-pinned-bar.ah-empty {
            color: #a0aec0; font-size: 12px; padding: 6px 20px; min-height: auto;
        }
        .ah-pin-btn {
            cursor: pointer; opacity: 0.4; font-size: 12px; margin-left: 4px;
            display: inline-flex; align-items: center; user-select: none;
            transition: opacity .15s;
        }
        .ah-pin-btn:hover { opacity: 1; }
        .ah-pin-btn.is-pinned { opacity: 1; }
        [data-qa-selector$="-title"] {
            display: inline-flex; align-items: center;
        }
        #ah-copy-btn {
            margin-left: auto; padding: 5px 12px; border: none; border-radius: 6px;
            background: #0f3460; color: #fff; cursor: pointer;
            font: 600 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            white-space: nowrap; transition: background .15s;
        }
        #ah-copy-btn:hover { background: #1a5276; }
        #ah-copy-btn.copied { background: #27ae60; }
    `);

    function getPinnedKeys() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
    }
    function savePinnedKeys(keys) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }

    function getAllProperties() {
        const props = {};
        const titles = document.querySelectorAll('[data-qa-selector^="feature-section-item-"][data-qa-selector$="-title"]');
        titles.forEach(titleEl => {
            const qa = titleEl.getAttribute('data-qa-selector');
            const key = qa.replace('feature-section-item-', '').replace('-title', '');
            const parent = titleEl.parentElement;
            const bodyEl = parent.querySelector('[data-qa-selector$="-body"]');
            props[key] = {
                title: titleEl.textContent.trim(),
                value: bodyEl ? bodyEl.textContent.trim() : '',
                titleEl: titleEl,
            };
        });
        return props;
    }

    function updatePinnedBar() {
        let bar = document.getElementById('ah-pinned-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'ah-pinned-bar';
            document.body.prepend(bar);
        }

        const pinnedKeys = getPinnedKeys();
        const props = getAllProperties();

        bar.innerHTML = '';
        bar.classList.remove('ah-empty');

        if (pinnedKeys.length === 0) {
            bar.textContent = '📍 Click the pin icon next to any property to pin it here';
            bar.classList.add('ah-empty');
            return;
        }

        let foundAny = false;
        pinnedKeys.forEach(key => {
            const prop = props[key];
            if (!prop || !prop.value) return;
            foundAny = true;
            const item = document.createElement('span');
            item.className = 'ah-pin-item';
            item.innerHTML = `<span class="ah-label">${prop.title}:</span> <span class="ah-value">${prop.value}</span> <span class="ah-unpin" data-key="${key}">✕</span>`;
            bar.appendChild(item);
        });

        if (!foundAny) {
            bar.textContent = '📌 Pinned properties not found on this page';
            bar.classList.add('ah-empty');
        }

        bar.querySelectorAll('.ah-unpin').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-key');
                savePinnedKeys(getPinnedKeys().filter(k => k !== key));
                updatePinnedBar();
                updatePinButtons();
            });
        });
    }

    function updatePinButtons() {
        const pinnedKeys = getPinnedKeys();
        const props = getAllProperties();
        document.querySelectorAll('.ah-pin-btn').forEach(el => el.remove());

        Object.entries(props).forEach(([key, prop]) => {
            if (!prop.titleEl) return;
            const isPinned = pinnedKeys.includes(key);
            const btn = document.createElement('span');
            btn.className = 'ah-pin-btn' + (isPinned ? ' is-pinned' : '');
            btn.textContent = isPinned ? '📌' : '📍';
            btn.title = isPinned ? 'Unpin from top' : 'Pin to top bar';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                let keys = getPinnedKeys();
                if (keys.includes(key)) {
                    keys = keys.filter(k => k !== key);
                } else {
                    keys.push(key);
                }
                savePinnedKeys(keys);
                updatePinnedBar();
                updatePinButtons();
            });
            prop.titleEl.appendChild(btn);
        });
    }

    function removeClutter() {
        // ─── Sidebar / Conversion ───
        const conv = document.querySelector('section[class*="conversionArea"]');
        if (conv) conv.remove();

        document.querySelectorAll('[class*="usp___"]').forEach(el => {
            const p = el.closest('[class*="usps___"]');
            if (p) p.remove(); else el.remove();
        });

        const tp = document.querySelector('iframe[src*="trustpilot"]');
        if (tp) {
            const w = tp.closest('div, section, aside') || tp.parentElement;
            if (w) w.remove();
        }

        const legend = document.querySelector('legend');
        if (legend) {
            const fs = legend.closest('fieldset, div[class*="container"]');
            if (fs) fs.remove();
        }

        ['Benachrichtigung bei Preisreduzierung', 'Passe deine Bestellung an', 'Kontaktiere uns'].forEach(text => {
            try {
                const el = document.evaluate('//*[contains(text(),"' + text + '")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (el) {
                    const section = el.closest('[class*="conversionArea"], [class*="informationalContent"]');
                    if (section) section.remove(); else el.remove();
                }
            } catch(e) {}
        });

        // ─── Navigation menu links (keep Fahrzeugdetails, Ausstattung, Service-Historie) ───
        const menuIds = [
            'menu-link-vehicle-condition',        // Unsere Qualitätsstandards
            'menu-link-financing-calculator-section', // Finanzieren
            'menu-link-delivery',                 // Lieferung und Abholung
            'menu-link-warranty',                 // Garantie
            'menu-link-trade-in-widget',          // Inzahlungnahme
            'menu-link-personalized-recommendations', // Empfehlungen
            'menu-link-how-it-works',             // So funktioniert's
            'menu-link-faq',                      // Hilfe & FAQ
        ];
        menuIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // ─── Content sections ───
        const sectionIds = [
            'vehicle-condition',        // Qualitätsstandard block
            'financing-calculator-section', // Finanzierung individuell gestalten
            'delivery',                 // Lieferung und Abholung
            'warranty',                 // Steig auf Premium (Garantie)
            'trade-in-widget',          // Was ist dein Auto noch wert?
            'personalized-recommendations', // Empfehlungen
            'how-it-works',             // So funktioniert's
            'faq',                      // Hilfe & FAQ
        ];
        sectionIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // Autobild heading (standalone)
        try {
            const autobild = document.evaluate('//h3[contains(text(),"Autobild")]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (autobild) {
                const wrapper = autobild.closest('[class*="wrapper"]');
                if (wrapper) wrapper.remove();
            }
        } catch(e) {}
    }

    // ── Extract all car details as formatted text ─────────────────
    function extractCarDetails() {
        const props = getAllProperties();
        const title = document.querySelector('h1')?.textContent?.trim() || '';
        const subtitle = document.querySelector('[data-qa-selector="vehicle-info-subtitle"], h2, h3')?.textContent?.trim() || '';
        const price = document.querySelector('[data-qa-selector="vehicle-info-price"]')?.textContent?.trim() || '';

        const lines = [];
        if (title) lines.push(`# ${title}`);
        if (price) lines.push(`**Preis:** ${price}`);
        lines.push('');
        lines.push('| Eigenschaft | Wert |');
        lines.push('|---|---|');
        Object.values(props).forEach(p => {
            if (p.title && p.value) lines.push(`| ${p.title} | ${p.value} |`);
        });
        lines.push('');
        lines.push(`🔗 ${window.location.href.split('?')[0]}`);
        return lines.join('\n');
    }

    // ── Copy button handler ────────────────────────────────────────
    function setupCopyButton() {
        const bar = document.getElementById('ah-pinned-bar');
        if (!bar || document.getElementById('ah-copy-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ah-copy-btn';
        btn.textContent = '📋 Copy';
        btn.addEventListener('click', async () => {
            const text = extractCarDetails();
            try {
                await navigator.clipboard.writeText(text);
                btn.textContent = '✅ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '📋 Copy';
                    btn.classList.remove('copied');
                }, 2000);
            } catch {
                // Fallback for older browsers
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed'; ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                btn.textContent = '✅ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '📋 Copy';
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
        bar.appendChild(btn);
    }

    function init() {
        removeClutter();
        setTimeout(() => {
            updatePinnedBar();
            updatePinButtons();
            setupCopyButton();
        }, 200);
        new MutationObserver(() => {
            if (document.querySelector('iframe[src*="trustpilot"]')) removeClutter();
        }).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
