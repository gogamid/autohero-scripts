// ==UserScript==
// @name         Autohero - Mark Commercial Listings 💼 (Auto)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Automatically marks autohero.com search listings with "Gewerbliche Nutzung: Ja" using a 💼 badge
// @author       You
// @match        https://www.autohero.com/de/*
// @icon         https://www.autohero.com/favicon.ico
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      autohero.com
// ==/UserScript==

(function() {
    'use strict';

    const CONCURRENCY = 4;
    let commercialIds = new Set();

    GM_addStyle(`
        .ah-badge {
            position: absolute !important;
            top: 8px !important; left: 8px !important;
            z-index: 100 !important;
            background: #e63946 !important; color: #fff !important;
            border-radius: 6px !important;
            padding: 3px 7px !important;
            font: 600 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;
            pointer-events: none !important; user-select: none !important;
            display: inline-flex !important; align-items: center !important;
            gap: 3px !important;
        }
        #ah-progress {
            position: fixed !important; top: 80px !important; right: 20px !important;
            z-index: 99998 !important;
            padding: 8px 14px !important; background: #1d3557 !important; color: #fff !important;
            border-radius: 6px !important;
            font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
            transition: opacity .4s !important;
        }
    `);

    function getCards() {
        const links = document.querySelectorAll('a[data-qa-selector="ad-card-link"]');
        return Array.from(links).map(link => {
            let cardEl = link.parentElement;
            while (cardEl && (!cardEl.style || cardEl.style.position !== 'absolute')) {
                cardEl = cardEl.parentElement;
            }
            return {
                uuid: link.id,
                cardEl: cardEl || link.parentElement,
                href: (link.href || '').split('?')[0],
            };
        }).filter(c => c.uuid && c.uuid.length === 36);
    }

    function addBadge(cardEl) {
        if (!cardEl || cardEl.querySelector('.ah-badge')) return;
        const badge = document.createElement('div');
        badge.className = 'ah-badge';
        badge.textContent = '💼 Gewerblich';
        cardEl.appendChild(badge);
    }

    function progress(msg, done) {
        let el = document.getElementById('ah-progress');
        if (!el) { el = document.createElement('div'); el.id = 'ah-progress'; document.body.appendChild(el); }
        el.textContent = msg;
        if (done) {
            setTimeout(() => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 500);
            }, 4000);
        }
    }

    // Fetch a detail page and check for "wasInCommercialUse":true
    function checkCommercialUse(uuid, href) {
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: href,
                headers: { 'Accept': 'text/html' },
                timeout: 10000,
                onload: resp => {
                    const html = resp.responseText || '';
                    // Look for "wasInCommercialUse":true in embedded JSON/state
                    const idx = html.indexOf('"wasInCommercialUse"');
                    if (idx === -1) return resolve(false);
                    const snippet = html.substring(idx, idx + 30);
                    // Check for :true (with any whitespace)
                    resolve(/:true\b/.test(snippet));
                },
                onerror: () => resolve(false),
                ontimeout: () => resolve(false),
            });
        });
    }

    async function scanAndMark() {
        const cards = getCards();
        if (cards.length === 0) {
            // Retry after a moment in case listings load asynchronously
            setTimeout(scanAndMark, 1500);
            return;
        }

        progress(`Scanning ${cards.length} listings…`);
        let marked = 0;

        for (let i = 0; i < cards.length; i += CONCURRENCY) {
            const batch = cards.slice(i, i + CONCURRENCY);
            const results = await Promise.all(
                batch.map(c => checkCommercialUse(c.uuid, c.href))
            );
            results.forEach((isCommercial, idx) => {
                if (isCommercial) {
                    addBadge(batch[idx].cardEl);
                    commercialIds.add(batch[idx].uuid);
                    marked++;
                }
            });
            const done = Math.min(i + CONCURRENCY, cards.length);
            progress(`Scanning ${done}/${cards.length}…`);
        }

        progress(marked > 0 ? `✅ ${marked} commercial listing(s) marked 💼` : '✅ No commercial listings found', true);
    }

    // Wait for listings to render, then auto-scan
    function autoScan() {
        const cards = getCards();
        if (cards.length > 0) {
            scanAndMark();
        } else {
            // Use MutationObserver to wait for listings to appear
            const observer = new MutationObserver(() => {
                if (getCards().length > 0) {
                    observer.disconnect();
                    scanAndMark();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            // Also set a fallback timeout
            setTimeout(() => {
                observer.disconnect();
                if (getCards().length > 0) scanAndMark();
                else progress('No listings found', true);
            }, 5000);
        }
    }

    // Also re-scan when listings change (pagination, scroll load)
    function watchForNewListings() {
        let lastCount = 0;
        new MutationObserver(() => {
            const count = document.querySelectorAll('a[data-qa-selector="ad-card-link"]').length;
            if (count > 0 && count !== lastCount) {
                lastCount = count;
                // Check if any new cards appeared that are not yet marked
                const cards = getCards();
                const unmarked = cards.filter(c => c.cardEl && !c.cardEl.querySelector('.ah-badge') && !commercialIds.has(c.uuid));
                if (unmarked.length > 0) {
                    scanAndMark();
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { autoScan(); watchForNewListings(); });
    } else {
        autoScan();
        watchForNewListings();
    }

})();
