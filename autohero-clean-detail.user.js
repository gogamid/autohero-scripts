// ==UserScript==
// @name         Autohero - Clean Detail Page + Pin Properties
// @namespace    https://github.com/gogamid/autohero-scripts
// @version      2.0
// @description  Remove clutter from autohero car detail pages, and pin key vehicle properties to the top
// @author       gogamid
// @match        https://www.autohero.com/de/v1/*/id/*
// @icon         https://www.autohero.com/favicon.ico
// @updateURL    https://cdn.jsdelivr.net/gh/gogamid/autohero-scripts@main/autohero-clean-detail.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/gogamid/autohero-scripts@main/autohero-clean-detail.user.js
// @supportURL   https://github.com/gogamid/autohero-scripts/issues
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'ah_pinned_props';

    // ─── Hide clutter via CSS (safe for React hydration) ───────────
    GM_addStyle(`
        /* Hide price sidebar / conversion area */
        section[class*="conversionArea"] { display: none !important; }

        /* Hide USP bar */
        [class*="usps___"] { display: none !important; }

        /* Hide Trustpilot widget and its wrapper */
        iframe[src*="trustpilot"] { display: none !important; }
        iframe[src*="trustpilot"] ~ div, iframe[src*="trustpilot"] + * { display: none !important; }



        /* Hide navigation menu links */
        #menu-link-vehicle-condition,
        #menu-link-financing-calculator-section,
        #menu-link-delivery,
        #menu-link-warranty,
        #menu-link-trade-in-widget,
        #menu-link-personalized-recommendations,
        #menu-link-how-it-works,
        #menu-link-faq {
            display: none !important;
        }

        /* Hide content sections */
        #vehicle-condition,
        #financing-calculator-section,
        #delivery,
        #warranty,
        #trade-in-widget,
        #personalized-recommendations,
        #how-it-works,
        #faq {
            display: none !important;
        }

        /* ─── Pinned bar styles ─── */
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
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 99999 !important;
            padding: 11px 18px !important;
            border: none !important;
            border-radius: 8px !important;
            background: #0f3460 !important;
            color: #fff !important;
            cursor: pointer !important;
            font: 600 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            white-space: nowrap !important;
            box-shadow: 0 2px 12px rgba(0,0,0,0.3) !important;
            transition: background .15s !important;
        }
        #ah-copy-btn:hover { background: #1a5276 !important; }
        #ah-copy-btn.copied { background: #27ae60 !important; }
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

    // ── Extract ALL visible car details ───────────────────────────
    function extractCarDetails() {
        const lines = [];
        const push = (s) => { if (s) lines.push(s); };

        // Helper: get text by data-qa-selector
        const qaText = (sel) => document.querySelector(`[data-qa-selector="${sel}"]`)?.textContent?.trim() || '';

        // 1. Title block
        const title = qaText('vehicle-info-title') || document.querySelector('h1')?.textContent?.trim() || '';
        const subtitle = qaText('vehicle-info-subtitle');
        const price = qaText('vehicle-info-price');
        if (title) push(`# ${title}`);
        if (subtitle) push(`**${subtitle}**`);
        if (price) {
            const monthly = qaText('vehicle-info-monthly-price');
            const oldP = qaText('old-price');
            const parts = [`**Preis:** ${price}`];
            if (oldP) parts.push(`statt ${oldP}`);
            if (monthly) parts.push(`monatlich: ${monthly}`);
            push(parts.join(' — '));
        }
        push('');

        // 2. Fahrzeugdetails — motor info tiles
        const motorMap = {
            'builtYear': 'Erstzulassung',
            'mileage': 'Kilometerstand',
            'power': 'Leistung',
            'gearType': 'Getriebe',
            'carPreownerCount': 'Anzahl Vorbesitzer',
            'lastService': 'Letzter Service',
            'accident': 'Fahrzeugzustand',
        };
        push('**Fahrzeugdetails**');
        const motorData = [];
        Object.entries(motorMap).forEach(([k, label]) => {
            const el = document.querySelector(`[data-qa-selector="motor-info-element-${k}"]`);
            if (el && el.textContent.trim()) {
                motorData.push(`${label}: ${el.textContent.trim()}`);
            }
        });
        if (motorData.length) push(motorData.join(' · '));
        push('');

        // 3. All feature-section-item properties, grouped by section
        const propSections = document.querySelectorAll('[class*="section___iCVPH"]');
        if (propSections.length) {
            propSections.forEach(section => {
                const heading = section.querySelector('h2, h3');
                if (heading) push(`**${heading.textContent.trim()}**`);
                const items = section.querySelectorAll('[class*="item___qtMsT"]');
                items.forEach(item => {
                    const titleEl = item.querySelector('[data-qa-selector$="-title"]');
                    const bodyEl = item.querySelector('[data-qa-selector$="-body"]');
                    if (titleEl && bodyEl) {
                        const t = titleEl.textContent.trim();
                        const v = bodyEl.textContent.trim();
                        if (t && v) push(`${t}: ${v}`);
                    }
                });
                push('');
            });
        } else {
            // Fallback: just get all feature items flat
            const props = getAllProperties();
            const vals = Object.values(props).filter(p => p.title && p.value);
            if (vals.length) {
                vals.forEach(p => push(`${p.title}: ${p.value}`));
                push('');
            }
        }

        // 4. Ausstattung — equipment with sub-section labels
        const equipSections = [
            { qa: 'collapse-highlights', label: 'Highlights' },
            { qa: 'collapse-comfort', label: 'Komfort' },
            { qa: 'collapse-multimedia', label: 'Multimedia' },
            { qa: 'collapse-light-and-sight', label: 'Licht und Sicht' },
            { qa: 'collapse-security', label: 'Sicherheit' },
            { qa: 'collapse-additional', label: 'Weiteres' },
        ];
        let hasEquipment = false;
        equipSections.forEach(({ qa, label }) => {
            const section = document.querySelector(`[data-qa-selector="${qa}"]`);
            if (!section) return;
            const items = section.querySelectorAll('[data-qa-selector="equipment-value"]');
            if (!items.length) return;
            if (!hasEquipment) {
                push('**Ausstattung**');
                hasEquipment = true;
            }
            push(`### ${label}`);
            items.forEach(item => {
                const text = item.textContent.trim();
                if (text) push(`- ${text}`);
            });
        });
        if (hasEquipment) push('');

        // 5. Service history — extract service records from car-history-section
        const historySection = document.querySelector('[data-qa-selector="car-history-section"]');
        if (historySection) {
            const records = historySection.querySelectorAll('[data-qa-selector="collapse-wrapper"]');
            const serviceEntries = [];
            records.forEach(w => {
                const header = w.querySelector('[data-qa-selector="ah-collapse-header"]');
                const item = w.querySelector('[data-qa-selector="car-history-item"]');
                if (!header || !item) return;
                const hText = header.textContent.trim();
                if (!hText.match(/\d{2}\.\d{4}/)) return;

                // Parse header
                const dateMatch = hText.match(/(\d{2}\.\d{4})/);
                const date = dateMatch ? dateMatch[1] : '';

                // Extract everything after the date
                const afterDate = hText.substring(date.length).trim();

                // Extract mileage
                const kmMatch = afterDate.match(/Kilometerstand[:\s]*([\d.]+)\s*km/i);
                const mileage = kmMatch ? kmMatch[1] + ' km' : '';

                // Extract inspection line (e.g., "Allgemeine Inspektion: Bestanden")
                const inspMatch = afterDate.match(/(Allgemeine\s+Inspektion|Hauptuntersuchung|Sicherheitsprüfung)[:\s]*(\S+)/i);
                const inspection = inspMatch ? inspMatch[0].trim() : '';

                // The workshop is anything between date and kilometer/mileage info
                let workshop = afterDate;
                if (kmMatch) workshop = afterDate.substring(0, kmMatch.index).trim();
                else if (inspection) workshop = afterDate.substring(0, afterDate.indexOf(inspMatch[1])).trim();
                // Clean up workshop: remove duplicate words and extra whitespace
                workshop = workshop.replace(/Kilometerstand.*$/, '').replace(/\s+/g, ' ').trim();
                // Remove duplicate words like "Autohero Autohero"
                workshop = workshop.replace(/\b(\w+)\s+\1\b/g, '$1');

                if (date) serviceEntries.push(`**${date}**`);
                if (workshop) serviceEntries.push(`Ort: ${workshop}`);
                if (mileage) serviceEntries.push(`km: ${mileage}`);
                if (inspection) serviceEntries.push(`Status: ${inspection.replace(/:/g, ': ')}`);

                // Extract tasks from car-history-item
                const taskDivs = [];
                item.querySelectorAll(':scope > div').forEach(c => {
                    const t = c.textContent.trim();
                    if (t) taskDivs.push(t);
                });

                // Pair tasks with status words (Erneuert, Bestanden, Geprüft, Ersetzt)
                const statusWords = ['Erneuert', 'Bestanden', 'Geprüft', 'Ersetzt', 'Neu'];
                let i = 0;
                while (i < taskDivs.length) {
                    const task = taskDivs[i];
                    const next = i + 1 < taskDivs.length ? taskDivs[i + 1] : '';
                    if (next && statusWords.includes(next)) {
                        serviceEntries.push(`  - ${task} (${next})`);
                        i += 2;
                    } else {
                        serviceEntries.push(`  - ${task}`);
                        i += 1;
                    }
                }
                serviceEntries.push('');
            });
            if (serviceEntries.length) {
                push('**Service & Wartungs-Historie**');
                serviceEntries.forEach(line => push(line));
            }
        }

        // 6. Check for a secondary wheelset / special notes
        const secondWheels = document.querySelector('[data-qa-selector="secondary-wheels-section"], [class*="secondaryWheel"]');
        if (secondWheels) {
            push('**Zweiter Radsatz**');
            push(secondWheels.textContent.trim().substring(0, 300));
            push('');
        }

        // 7. URL
        push(`🔗 ${window.location.href.split('?')[0]}`);
        return lines.join('\n');
    }

    // ── Floating copy button ──────────────────────────────────────
    function setupCopyButton() {
        if (document.getElementById('ah-copy-btn')) return;

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
        document.body.appendChild(btn);
    }

    // ── Hide text-based clutter that CSS can't catch ──────────────
    // This runs after React hydrates, using inline style (still safe)
    function hideTextClutter() {
        ['Benachrichtigung bei Preisreduzierung', 'Passe deine Bestellung an', 'Kontaktiere uns'].forEach(text => {
            try {
                const el = document.evaluate(
                    '//*[contains(text(),"' + text + '")]',
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
                ).singleNodeValue;
                if (el) {
                    // Use style instead of remove to keep React happy
                    el.style.display = 'none';
                    // Also hide parent container if it's a wrapper
                    const section = el.closest('[class*="conversionArea"], [class*="informationalContent"], div');
                    if (section && section !== document.body) section.style.display = 'none';
                }
            } catch(e) {}
        });

        // Hide "Stolz, einer der besten Autohändler von Autobild" — CSS fallback
        try {
            const h3 = document.evaluate(
                '//h3[contains(text(),"Autobild")]',
                document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            ).singleNodeValue;
            if (h3) {
                h3.style.display = 'none';
                const wrapper = h3.closest('[class*="wrapper"]');
                if (wrapper) wrapper.style.display = 'none';
            }
        } catch(e) {}
    }

    function init() {
        // Wait for React to finish hydrating before any DOM changes
        setTimeout(() => {
            hideTextClutter();
            updatePinnedBar();
            updatePinButtons();
            setupCopyButton();
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
