// ==UserScript==
// @name         Autohero - Search Filters
// @namespace    https://github.com/gogamid/autohero-scripts
// @version      3.1
// @description  Filter search cards by prior damage, owners, HU/AU expiry and commercial use
// @match        https://www.autohero.com/de/search/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const CARD_SELECTOR = 'a[data-qa-selector="ad-card-link"][href*="/id/"]';
    const CACHE_PREFIX = 'ah-search-details-v3:';
    const SETTINGS_KEY = 'ah-search-filters-settings-v1';
    const CACHE_AGE_MS = 12 * 60 * 60 * 1000;
    const CONCURRENCY = 3;
    const currentYear = new Date().getFullYear();
    const tuvYears = [currentYear, currentYear + 1, currentYear + 2];
    const queue = [];
    const queued = new Set();
    const results = new Map();
    const retryAfter = new Map();
    const settings = {
        hideDamage: true, maxOwners: 2, minTuvYear: currentYear + 2,
        hideCommercial: true, panelCollapsed: false,
    };
    let running = 0;
    let scanTimer;

    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (typeof saved?.hideDamage === 'boolean') settings.hideDamage = saved.hideDamage;
        if (saved?.maxOwners === 1 || saved?.maxOwners === 2) settings.maxOwners = saved.maxOwners;
        if (tuvYears.includes(saved?.minTuvYear)) settings.minTuvYear = saved.minTuvYear;
        if (typeof saved?.hideCommercial === 'boolean') settings.hideCommercial = saved.hideCommercial;
        if (typeof saved?.panelCollapsed === 'boolean') settings.panelCollapsed = saved.panelCollapsed;
    } catch (_) { /* Use defaults if storage is unavailable. */ }

    const style = document.createElement('style');
    style.textContent = `
        .ah-search-filter-hidden { visibility: hidden !important; }
        #ah-search-filters {
            position: fixed; z-index: 99990; right: 16px; bottom: 16px;
            display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
            max-width: calc(100vw - 32px);
            color: white;
            font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        #ah-search-filter-panel {
            display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
            padding: 10px 14px; border-radius: 8px;
            background: #1d3557; color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,.25);
        }
        #ah-search-filter-panel[hidden] { display: none !important; }
        #ah-search-filter-toggle {
            border: 0; border-radius: 8px; padding: 9px 14px;
            background: #1d3557; color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,.25);
            font: inherit; font-weight: 600; cursor: pointer;
        }
        #ah-search-filter-panel button, #ah-search-filter-panel select {
            border: 1px solid #b9c9d8; border-radius: 5px;
            padding: 5px 8px; background: white; color: #1d3557;
            font: inherit; cursor: pointer;
        }
        #ah-search-filter-panel button[aria-pressed="true"] {
            background: #dbf5e7; border-color: #69b88d;
        }
        #ah-search-filter-panel label { display: flex; align-items: center; gap: 6px; }
    `;
    document.head.appendChild(style);

    const controls = document.createElement('div');
    controls.id = 'ah-search-filters';
    const panel = document.createElement('div');
    panel.id = 'ah-search-filter-panel';
    const toggleButton = document.createElement('button');
    toggleButton.id = 'ah-search-filter-toggle';
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-controls', panel.id);
    const damageButton = document.createElement('button');
    damageButton.type = 'button';
    damageButton.title = 'Autos mit reparierten Vorschäden ausblenden';
    const ownerLabel = document.createElement('label');
    ownerLabel.textContent = 'Max. Vorbesitzer';
    const ownerSelect = document.createElement('select');
    ownerSelect.setAttribute('aria-label', 'Maximale Anzahl Vorbesitzer');
    for (const count of [1, 2]) {
        const option = document.createElement('option');
        option.value = String(count);
        option.textContent = String(count);
        ownerSelect.appendChild(option);
    }
    ownerLabel.appendChild(ownerSelect);
    const tuvLabel = document.createElement('label');
    tuvLabel.textContent = 'HU/AU gültig bis mind.';
    const tuvSelect = document.createElement('select');
    tuvSelect.setAttribute('aria-label', 'HU/AU gültig bis mindestens Jahr');
    for (const year of tuvYears) {
        const option = document.createElement('option');
        option.value = String(year);
        option.textContent = String(year);
        tuvSelect.appendChild(option);
    }
    tuvLabel.appendChild(tuvSelect);
    const commercialButton = document.createElement('button');
    commercialButton.type = 'button';
    commercialButton.title = 'Autos mit gewerblicher Nutzung ausblenden';
    panel.append(damageButton, ownerLabel, tuvLabel, commercialButton);
    controls.append(panel, toggleButton);
    document.body.appendChild(controls);

    function updateControls() {
        damageButton.textContent = `Vorschaden: ${settings.hideDamage ? 'Ausblenden' : 'Anzeigen'}`;
        damageButton.setAttribute('aria-pressed', String(settings.hideDamage));
        ownerSelect.value = String(settings.maxOwners);
        tuvSelect.value = String(settings.minTuvYear);
        commercialButton.textContent = `Gewerblich: ${settings.hideCommercial ? 'Ausblenden' : 'Anzeigen'}`;
        commercialButton.setAttribute('aria-pressed', String(settings.hideCommercial));
        panel.hidden = settings.panelCollapsed;
        const activeCount = 2 + Number(settings.hideDamage) + Number(settings.hideCommercial);
        toggleButton.textContent = `Filter · ${activeCount} aktiv ${settings.panelCollapsed ? '▲' : '▼'}`;
        toggleButton.setAttribute('aria-expanded', String(!settings.panelCollapsed));
        toggleButton.setAttribute('aria-label', `Autohero-Filter ${settings.panelCollapsed ? 'öffnen' : 'schließen'}`);
    }

    function saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* Ignore. */ }
        updateControls();
        scan();
    }

    damageButton.addEventListener('click', () => {
        settings.hideDamage = !settings.hideDamage;
        saveSettings();
    });
    ownerSelect.addEventListener('change', () => {
        settings.maxOwners = Number(ownerSelect.value);
        saveSettings();
    });
    tuvSelect.addEventListener('change', () => {
        settings.minTuvYear = Number(tuvSelect.value);
        saveSettings();
    });
    commercialButton.addEventListener('click', () => {
        settings.hideCommercial = !settings.hideCommercial;
        saveSettings();
    });
    toggleButton.addEventListener('click', () => {
        settings.panelCollapsed = !settings.panelCollapsed;
        saveSettings();
    });
    updateControls();

    function cachedResult(id) {
        try {
            const entry = JSON.parse(localStorage.getItem(CACHE_PREFIX + id));
            if (entry && Date.now() - entry.checkedAt < CACHE_AGE_MS &&
                typeof entry.damaged === 'boolean' && Number.isInteger(entry.owners) &&
                (entry.inspectionYear === null || Number.isInteger(entry.inspectionYear)) &&
                typeof entry.commercial === 'boolean') return entry;
        } catch (_) { /* Storage may be unavailable. */ }
        return undefined;
    }

    function saveResult(id, damaged, owners, inspectionYear, commercial) {
        const entry = { damaged, owners, inspectionYear, commercial, checkedAt: Date.now() };
        results.set(id, entry);
        try {
            localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(entry));
        } catch (_) { /* Filtering still works without persistent storage. */ }
    }

    function scan() {
        if (location.pathname !== '/de/search/') return;

        document.querySelectorAll(CARD_SELECTOR).forEach(link => {
            const id = link.id;
            const card = link.parentElement; // Autohero's virtualized grid cell.
            if (!/^[0-9a-f-]{36}$/i.test(id) || !card) return;

            let details = results.get(id);
            if (details === undefined) {
                details = cachedResult(id);
                if (details !== undefined) results.set(id, details);
            }
            card.classList.toggle('ah-search-filter-hidden', !!details &&
                ((settings.hideDamage && details.damaged) ||
                    details.owners > settings.maxOwners ||
                    (details.inspectionYear !== null && details.inspectionYear < settings.minTuvYear) ||
                    (settings.hideCommercial && details.commercial)));

            if (details === undefined && !queued.has(id) && Date.now() >= (retryAfter.get(id) || 0)) {
                const url = new URL(link.href, location.href);
                if (url.origin !== location.origin || !url.pathname.includes(`/id/${id}/`)) return;
                queue.push({ id, url: url.href });
                queued.add(id);
            }
        });
        pump();
    }

    async function checkCar({ id, url }) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });
            if (!response.ok || !response.url.includes(`/id/${id}/`) ||
                !response.headers.get('content-type')?.includes('text/html')) return;

            const html = await response.text();
            // This is the car's own field in Autohero's embedded detail-page state.
            // Do not search for the word "Vorschaden": generic help text also contains it.
            const damage = [...html.matchAll(/wasInAccident\\?":(true|false)/g)];
            const owners = [...html.matchAll(/carPreownerCount\\?":(\d+)/g)];
            const inspection = [...html.matchAll(/inspectionExpiryDate\\?":(?:\\?"(\d{4})-\d{2}-\d{2}\\?"|null)/g)];
            const commercial = [...html.matchAll(/wasInCommercialUse\\?":(true|false)/g)];
            if (damage.length !== 1 || owners.length !== 1 ||
                inspection.length !== 1 || commercial.length !== 1) return; // Unknown: leave visible.
            // Autohero stores zero-based carPreownerCount; its UI displays this value + 1.
            saveResult(id, damage[0][1] === 'true', Number(owners[0][1]) + 1,
                inspection[0][1] ? Number(inspection[0][1]) : null,
                commercial[0][1] === 'true');
        } catch (_) {
            // Network errors leave cards visible; a later scan can retry.
        } finally {
            clearTimeout(timeout);
            queued.delete(id);
            if (!results.has(id)) retryAfter.set(id, Date.now() + 60000);
            scheduleScan();
        }
    }

    function pump() {
        while (running < CONCURRENCY && queue.length) {
            const car = queue.shift();
            running++;
            checkCar(car).finally(() => {
                running--;
                pump();
            });
        }
    }

    function scheduleScan() {
        clearTimeout(scanTimer);
        scanTimer = setTimeout(scan, 100);
    }

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
})();
