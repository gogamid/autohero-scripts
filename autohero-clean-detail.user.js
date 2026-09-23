// ==UserScript==
// @name         Autohero - Clean Detail Page + Pin Properties
// @namespace    https://github.com/gogamid/autohero-scripts
// @version      2.7
// @description  Clean car detail pages, pin properties, and copy complete details as Markdown
// @author       gogamid
// @match        https://www.autohero.com/de/*/id/*
// @icon         https://www.autohero.com/favicon.ico
// @updateURL    https://cdn.jsdelivr.net/gh/gogamid/autohero-scripts@main/autohero-clean-detail.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/gogamid/autohero-scripts@main/autohero-clean-detail.user.js
// @supportURL   https://github.com/gogamid/autohero-scripts/issues
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "ah_pinned_props";
  const PINNED_BAR_HIDDEN_KEY = "ah_pinned_bar_hidden";

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
            padding: 6px 10px; display: flex; flex-wrap: wrap; gap: 4px 8px;
            font: 12px/1.25 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-shadow: 0 2px 12px rgba(0,0,0,0.25);
            align-items: center;
        }
        #ah-pinned-bar .ah-pin-item {
            display: inline-flex; align-items: center; gap: 4px;
            background: #16213e; padding: 2px 6px; border-radius: 6px;
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
        #ah-actions {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        #ah-actions button {
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
        #ah-pins-toggle { background: #16213e !important; }
        #ah-pins-toggle:hover { background: #24395e !important; }
        #ah-pins-toggle:disabled { opacity: .6; cursor: default !important; }
        #ah-copy-btn:hover { background: #1a5276 !important; }
        #ah-copy-btn.copied { background: #27ae60 !important; }
        #ah-wheel-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
            gap: 16px; max-width: 1100px; margin: 24px auto;
            padding: 0 16px; box-sizing: border-box;
        }
        #ah-wheel-grid article {
            border: 1px solid #dce3ea; border-radius: 10px;
            overflow: hidden; background: #fff; color: #243447;
        }
        #ah-wheel-grid img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
        #ah-wheel-grid h3 { margin: 14px 14px 8px; font-size: 18px; }
        #ah-wheel-grid ul { list-style: none; padding: 0 14px 14px; margin: 0; }
        #ah-wheel-grid li {
            display: flex; justify-content: space-between; gap: 12px;
            padding: 5px 0; border-bottom: 1px solid #edf0f3; font-size: 13px;
        }
        #ah-wheel-grid li span:last-child { text-align: right; font-weight: 600; }
        #ah-damage-gallery {
            padding: 20px 16px; max-width: 1600px; margin: 0 auto;
            box-sizing: border-box; color: #243447;
        }
        #ah-damage-gallery .ah-damage-header {
            display: flex; align-items: center; justify-content: space-between;
            gap: 12px; margin-bottom: 12px;
        }
        #ah-damage-gallery h2 { margin: 0; font-size: 22px; }
        #ah-damage-gallery .ah-damage-controls { display: flex; gap: 8px; }
        #ah-damage-gallery button {
            border: 1px solid #c8d5e1; background: #fff; color: #003e70;
            border-radius: 6px; padding: 5px 12px; cursor: pointer; font-size: 20px;
        }
        #ah-damage-gallery button:disabled { opacity: .4; cursor: default; }
        #ah-damage-track {
            display: grid; grid-auto-flow: column; grid-template-rows: repeat(2, 1fr);
            grid-auto-columns: clamp(170px, 20vw, 230px); gap: 10px;
            overflow-x: auto; overscroll-behavior-inline: contain;
            scroll-snap-type: x mandatory; padding-bottom: 8px; cursor: grab;
        }
        #ah-damage-track:active { cursor: grabbing; }
        #ah-damage-track figure {
            margin: 0; border: 1px solid #dce3ea; border-radius: 8px;
            overflow: hidden; background: #fff; scroll-snap-align: start;
        }
        #ah-damage-track img {
            display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
        }
        #ah-damage-track figcaption { padding: 7px 9px; font-size: 12px; line-height: 1.3; }
    `);

  function getPinnedKeys() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function savePinnedKeys(keys) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  }

  function isPinnedBarHidden() {
    return localStorage.getItem(PINNED_BAR_HIDDEN_KEY) !== "false";
  }

  function getAllProperties() {
    const props = {};
    const titles = document.querySelectorAll(
      '[data-qa-selector^="feature-section-item-"][data-qa-selector$="-title"]',
    );
    titles.forEach((titleEl) => {
      const qa = titleEl.getAttribute("data-qa-selector");
      const key = qa.replace("feature-section-item-", "").replace("-title", "");
      const parent = titleEl.parentElement;
      const bodyEl = parent.querySelector('[data-qa-selector$="-body"]');
      props[key] = {
        title: propertyTitle(titleEl),
        value: bodyEl ? bodyEl.textContent.trim() : "",
        titleEl: titleEl,
      };
    });
    return props;
  }

  function propertyTitle(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('.ah-pin-btn, [class*="footnoteNumber"]').forEach((el) => el.remove());
    return copy.textContent.trim().replace(/\s+/g, " ");
  }

  function propertyValue(element) {
    return (element.innerText || element.textContent || "")
      .split(/\n+/)
      .map((line) => line.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .join("; ");
  }

  function carState() {
    const adId = window.location.pathname.match(/\/id\/([0-9a-f-]{36})\//i)?.[1];
    const script = [...document.scripts].find((element) =>
      element.textContent.includes("window.__APOLLO_STATE__"));
    const encoded = script?.textContent.match(
      /window\.__APOLLO_STATE__\s*=\s*("(?:\\.|[^"\\])*")\s*;/,
    )?.[1];
    if (!adId || !encoded) return null;

    try {
      const state = JSON.parse(JSON.parse(encoded));
      const car = Object.values(state.ROOT_QUERY || {}).find((value) =>
        value?.__typename === "CarDetailsStoreAdProjection" && value.adId === adId);
      return car ? { state, car } : null;
    } catch {
      return null;
    }
  }

  function usageMarks() {
    const data = carState();
    if (!Array.isArray(data?.car.damages)) return null;
    const groups = new Map();
    data.car.damages.forEach((ref) => {
      const damage = data.state[ref.__ref];
      const type = damage?.type?.trim();
      const part = damage?.part?.trim();
      if (!type || !part) return;
      if (!groups.has(type)) groups.set(type, new Set());
      groups.get(type).add(part);
    });
    return groups;
  }

  function setupDamageGallery() {
    const gallery = document.querySelector('[data-qa-selector="gallery-section"]');
    const data = carState();
    if (!gallery || document.getElementById("ah-damage-gallery") ||
        !Array.isArray(data?.car.damages) || !data.car.damages.length) return;

    const section = document.createElement("section");
    section.id = "ah-damage-gallery";
    const header = document.createElement("div");
    header.className = "ah-damage-header";
    const heading = document.createElement("h2");
    heading.textContent = "Gebrauchsspuren";
    const controls = document.createElement("div");
    controls.className = "ah-damage-controls";
    const track = document.createElement("div");
    track.id = "ah-damage-track";
    track.tabIndex = 0;
    track.setAttribute("aria-label", "Gebrauchsspuren, horizontal scrollen");
    const buttons = [-1, 1].map((direction) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = direction < 0 ? "‹" : "›";
      button.setAttribute("aria-label", direction < 0 ? "Vorherige Gebrauchsspuren" : "Nächste Gebrauchsspuren");
      button.addEventListener("click", () =>
        track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" }));
      controls.appendChild(button);
      return button;
    });

    data.car.damages.forEach((ref) => {
      const damage = data.state[ref.__ref];
      const image = data.state[damage?.image?.__ref];
      if (!damage?.part || !damage?.type || !image?.fullUrl) return;
      const caption = `${damage.part} | ${damage.type}`;
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = image.fullUrl.replace("{size}", "992x744-");
      img.alt = caption;
      img.loading = "lazy";
      img.draggable = false;
      const label = document.createElement("figcaption");
      label.textContent = caption;
      figure.append(img, label);
      track.appendChild(figure);
    });
    if (!track.children.length) return;
    const updateButtons = () => {
      buttons[0].disabled = track.scrollLeft < 2;
      buttons[1].disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    track.addEventListener("scroll", updateButtons, { passive: true });
    let dragStart = null;
    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      dragStart = { x: event.clientX, scroll: track.scrollLeft };
      track.style.scrollSnapType = "none";
      track.setPointerCapture(event.pointerId);
    });
    track.addEventListener("pointermove", (event) => {
      if (!dragStart) return;
      if (Math.abs(event.clientX - dragStart.x) > 3) event.preventDefault();
      track.scrollLeft = dragStart.scroll + dragStart.x - event.clientX;
    });
    const stopDragging = () => {
      dragStart = null;
      track.style.scrollSnapType = "";
    };
    track.addEventListener("pointerup", stopDragging);
    track.addEventListener("pointercancel", stopDragging);
    track.addEventListener("lostpointercapture", stopDragging);
    window.addEventListener("resize", updateButtons);
    header.append(heading, controls);
    section.append(header, track);
    gallery.parentElement.insertAdjacentElement("afterend", section);
    updateButtons();
  }

  async function setupSecondaryWheels() {
    const section = document.querySelector('[data-qa-selector="secondary-wheels-section"]');
    const adId = window.location.pathname.match(/\/id\/([0-9a-f-]{36})\//i)?.[1];
    if (!section || !adId || document.getElementById("ah-wheel-grid")) return;

    try {
      const response = await fetch("/v1/retail-customer-gateway/graphql/getCarDetailsStoreAd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationName: "getCarDetailsStoreAd",
          variables: { id: adId, locale: "de-DE" },
          query: "query getCarDetailsStoreAd($id: UUID!, $locale: String!) { carDetails: getCarDetailsStoreAd(adId: $id, locale: $locale) { secondaryWheels { wheels damageCondition } } }",
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()).data?.carDetails?.secondaryWheels;
      if (!data?.wheels || !section.isConnected) return;

      const images = carState()?.car.carDetailsImageComposites?.ad_secondary_wheels || [];
      const positions = [
        ["FRONT_LEFT", "Vordere linke Details", "secondary-fwl"],
        ["FRONT_RIGHT", "Vordere rechte Details", "secondary-fwr"],
        ["REAR_LEFT", "Hintere linke Details", "secondary-bwl"],
        ["REAR_RIGHT", "Hintere rechte Details", "secondary-bwr"],
      ];

      const grid = document.createElement("div");
      grid.id = "ah-wheel-grid";
      positions.forEach(([key, title, imagePart]) => {
        const wheel = data.wheels[key];
        if (!wheel) return;
        const card = document.createElement("article");
        const image = images.find((entry) => entry.part === imagePart);
        if (image?.ahUrl) {
          const img = document.createElement("img");
          img.src = image.ahUrl.replace("{size}", "1024x768-");
          img.alt = title.replace(" Details", "");
          img.loading = "lazy";
          card.appendChild(img);
        }
        const heading = document.createElement("h3");
        heading.textContent = title;
        card.appendChild(heading);
        const list = document.createElement("ul");
        const damageText = (damages) => Array.isArray(damages) && damages.length
          ? damages.map((damage) => typeof damage === "string" ? damage
            : Object.values(damage).filter((value) => typeof value === "string").join(" – "))
            .filter(Boolean).join(", ")
          : "";
        const details = [
          ["Felgenzustand", data.damageCondition],
          ["Felgenschäden", damageText(wheel.rimDamages)],
          ["Felgengröße", wheel.rimRadius && `${wheel.rimRadius} Zoll`],
          ["Felgentyp", wheel.rimType],
          ["Reifensaison", wheel.tireSeason],
          ["Reifenschäden", damageText(wheel.tireDamages)],
          ["Reifenprofiltiefe", wheel.treadDepth != null && `${wheel.treadDepth} mm`],
          ["Reifenhersteller", wheel.tireManufacturer],
          ["Reifengröße", wheel.tireWidth && wheel.tireHeight && wheel.rimRadius &&
            `${wheel.tireWidth}/${wheel.tireHeight} R${wheel.rimRadius}`],
          ["Tragfähigkeitsindex", wheel.loadIndex],
          ["Geschwindigkeitsindex", wheel.speedIndex],
        ];
        details.forEach(([label, value]) => {
          if (value == null || value === "") return;
          const row = document.createElement("li");
          const name = document.createElement("span");
          name.textContent = label;
          const description = document.createElement("span");
          description.textContent = String(value);
          row.append(name, description);
          list.appendChild(row);
        });
        card.appendChild(list);
        grid.appendChild(card);
      });
      if (grid.children.length) section.appendChild(grid);
    } catch {
      // Keep Autohero's original wheel gallery available if the request fails.
    }
  }

  function updatePinnedBar() {
    let bar = document.getElementById("ah-pinned-bar");
    const pinnedKeys = getPinnedKeys();
    const props = getAllProperties();
    const available = pinnedKeys.filter((key) => props[key]?.value);
    const hidden = isPinnedBarHidden();
    const toggle = document.getElementById("ah-pins-toggle");
    if (toggle) {
      toggle.textContent = available.length === 0
        ? "📌 Keine Pins"
        : hidden ? `📌 ${available.length} anzeigen` : "📌 Ausblenden";
      toggle.disabled = available.length === 0;
      toggle.setAttribute("aria-expanded", String(!hidden && available.length > 0));
      toggle.setAttribute("aria-controls", "ah-pinned-bar");
    }

    if (hidden || available.length === 0) {
      bar?.remove();
      return;
    }

    if (!bar) {
      bar = document.createElement("div");
      bar.id = "ah-pinned-bar";
      document.body.prepend(bar);
    }
    bar.replaceChildren();

    available.forEach((key) => {
      const prop = props[key];
      const item = document.createElement("span");
      item.className = "ah-pin-item";
      item.innerHTML = `<span class="ah-label">${prop.title}:</span> <span class="ah-value">${prop.value}</span> <span class="ah-unpin" data-key="${key}">✕</span>`;
      bar.appendChild(item);
    });

    bar.querySelectorAll(".ah-unpin").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        savePinnedKeys(getPinnedKeys().filter((k) => k !== key));
        updatePinnedBar();
        updatePinButtons();
      });
    });
  }

  function updatePinButtons() {
    const pinnedKeys = getPinnedKeys();
    const props = getAllProperties();
    document.querySelectorAll(".ah-pin-btn").forEach((el) => el.remove());

    Object.entries(props).forEach(([key, prop]) => {
      if (!prop.titleEl) return;
      const isPinned = pinnedKeys.includes(key);
      const btn = document.createElement("span");
      btn.className = "ah-pin-btn" + (isPinned ? " is-pinned" : "");
      btn.textContent = isPinned ? "📌" : "📍";
      btn.title = isPinned ? "Unpin from top" : "Pin to top bar";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        let keys = getPinnedKeys();
        if (keys.includes(key)) {
          keys = keys.filter((k) => k !== key);
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

  // ── Extract car details as standalone Markdown ────────────────
  async function extractCarDetails() {
    const lines = [];
    const push = (s) => lines.push(s);

    // Helper: get text by data-qa-selector
    const qaText = (sel) =>
      document
        .querySelector(`[data-qa-selector="${sel}"]`)
        ?.textContent?.trim() || "";

    // 1. Title block
    const title =
      qaText("vehicle-info-title") ||
      document.querySelector("h1")?.textContent?.trim() ||
      "";
    const subtitle = qaText("vehicle-info-subtitle");
    const price = qaText("vehicle-info-price");
    if (title) push(`# ${title}`);
    if (subtitle) push(`**${subtitle}**`);
    if (price) {
      const monthly = qaText("vehicle-info-monthly-price");
      const oldP = document.querySelector('[data-qa-selector="vehicle-info-price"]')
        ?.parentElement?.querySelector('[data-qa-selector="old-price"]')?.textContent.trim();
      const parts = [`- **Preis:** ${price}`];
      if (oldP) parts.push(`statt ${oldP}`);
      if (monthly) parts.push(`monatlich: ${monthly}`);
      push(parts.join(" — "));
    }
    push("");

    // 2. Fahrzeugdetails — motor info tiles
    const motorMap = {
      builtYear: "Erstzulassung",
      mileage: "Kilometerstand",
      power: "Leistung",
      gearType: "Getriebe",
      carPreownerCount: "Anzahl Vorbesitzer",
      lastService: "Letzter Service",
      accident: "Fahrzeugzustand",
    };
    push("## Fahrzeugdetails");
    Object.entries(motorMap).forEach(([k, label]) => {
      const el = document.querySelector(
        `[data-qa-selector="motor-info-element-${k}"]`,
      );
      const value = el?.querySelector(`[data-qa-selector="motor-info-title-${k}"]`)
        ?.textContent.trim();
      if (value) push(`- **${label}:** ${value}`);
    });
    push("");

    // 3. All feature-section-item properties, grouped by section
    const featureHeadings = document.querySelectorAll(
      '[data-qa-selector="features-section-section"] h2',
    );
    if (featureHeadings.length) {
      featureHeadings.forEach((heading) => {
        push(`## ${heading.textContent.trim()}`);
        heading.parentElement.querySelectorAll(
          '[data-qa-selector^="feature-section-item-"][data-qa-selector$="-title"]',
        ).forEach((titleEl) => {
          const bodyEl = titleEl.parentElement.querySelector('[data-qa-selector$="-body"]');
          const title = propertyTitle(titleEl);
          const value = bodyEl && propertyValue(bodyEl);
          if (title && value) push(`- **${title}:** ${value}`);
        });
        push("");
      });
    } else {
      // Fallback: just get all feature items flat
      const props = getAllProperties();
      const vals = Object.values(props).filter((p) => p.title && p.value);
      if (vals.length) {
        vals.forEach((p) => push(`- **${p.title}:** ${p.value}`));
        push("");
      }
    }

    const marks = usageMarks();
    if (marks) {
      push("## Gebrauchsspuren");
      if (marks.size) {
        marks.forEach((parts, type) => push(`- **${type}:** ${[...parts].join(", ")}`));
      } else {
        push("Keine Gebrauchsspuren dokumentiert.");
      }
      push("");
    }

    // 4. Ausstattung — equipment with sub-section labels
    const equipSections = [
      { qa: "collapse-highlights", label: "Highlights" },
      { qa: "collapse-comfort", label: "Komfort" },
      { qa: "collapse-multimedia", label: "Multimedia" },
      { qa: "collapse-light-and-sight", label: "Licht und Sicht" },
      { qa: "collapse-security", label: "Sicherheit" },
      { qa: "collapse-additional", label: "Weiteres" },
    ];
    let hasEquipment = false;
    equipSections.forEach(({ qa, label }) => {
      const section = document.querySelector(`[data-qa-selector="${qa}"]`);
      if (!section) return;
      const items = section.querySelectorAll(
        '[data-qa-selector="equipment-value"]',
      );
      if (!items.length) return;
      if (!hasEquipment) {
        push("## Ausstattung");
        hasEquipment = true;
      }
      push(`### ${label}`);
      items.forEach((item) => {
        const text = item.textContent.trim();
        if (text) push(`- ${text}`);
      });
    });
    if (hasEquipment) push("");

    // 5. Service history — extract service records from car-history-section
    const historySection = document.querySelector(
      '[data-qa-selector="car-history-section"]',
    );
    if (historySection) {
      const records = historySection.querySelectorAll(
        '[data-qa-selector="collapse-wrapper"]',
      );
      const serviceEntries = [];
      records.forEach((w) => {
        const header = w.querySelector(
          '[data-qa-selector="ah-collapse-header"]',
        );
        const item = w.querySelector('[data-qa-selector="car-history-item"]');
        if (!header || !item) return;
        const hText = header.textContent.trim();
        if (!hText.match(/\d{2}\.\d{4}/)) return;

        // Parse header
        const dateMatch = hText.match(/(\d{2}\.\d{4})/);
        const date = dateMatch ? dateMatch[1] : "";

        // Extract everything after the date
        const afterDate = hText.substring(date.length).trim();

        // Extract mileage
        const kmMatch = afterDate.match(/Kilometerstand[:\s]*([\d.]+)\s*km/i);
        const mileage = kmMatch ? kmMatch[1] + " km" : "";

        // Extract inspection line (e.g., "Allgemeine Inspektion: Bestanden")
        const inspMatch = afterDate.match(
          /(Allgemeine\s+Inspektion|Hauptuntersuchung|Sicherheitsprüfung)[:\s]*(\S+)/i,
        );
        const inspection = inspMatch ? inspMatch[0].trim() : "";

        // The workshop is anything between date and kilometer/mileage info
        let workshop = afterDate;
        if (kmMatch) workshop = afterDate.substring(0, kmMatch.index).trim();
        else if (inspection)
          workshop = afterDate
            .substring(0, afterDate.indexOf(inspMatch[1]))
            .trim();
        // Clean up workshop: remove duplicate words and extra whitespace
        workshop = workshop
          .replace(/Kilometerstand.*$/, "")
          .replace(/\s+/g, " ")
          .trim();
        // Remove duplicate words like "Autohero Autohero"
        workshop = workshop.replace(/\b(\w+)\s+\1\b/g, "$1");

        if (date) serviceEntries.push(`### ${date}`);
        if (workshop) serviceEntries.push(`- **Ort:** ${workshop}`);
        if (mileage) serviceEntries.push(`- **Kilometerstand:** ${mileage}`);
        if (inspection)
          serviceEntries.push(`- **Status:** ${inspection.replace(/:/g, ": ")}`);

        // Extract tasks from car-history-item
        const taskDivs = [];
        item.querySelectorAll(":scope > div").forEach((c) => {
          const t = c.textContent.trim();
          if (t) taskDivs.push(t);
        });

        // Pair tasks with status words (Erneuert, Bestanden, Geprüft, Ersetzt)
        const statusWords = [
          "Erneuert",
          "Bestanden",
          "Geprüft",
          "Ersetzt",
          "Neu",
        ];
        let i = 0;
        while (i < taskDivs.length) {
          const task = taskDivs[i];
          const next = i + 1 < taskDivs.length ? taskDivs[i + 1] : "";
          if (next && statusWords.includes(next)) {
            serviceEntries.push(`- ${task} (${next})`);
            i += 2;
          } else {
            serviceEntries.push(`- ${task}`);
            i += 1;
          }
        }
        serviceEntries.push("");
      });
      if (serviceEntries.length) {
        push("## Service & Wartungs-Historie");
        serviceEntries.forEach((line) => push(line));
      }
    }

    // 6. Check for a secondary wheelset / special notes
    const secondWheels = document.querySelector(
      '[data-qa-selector="secondary-wheels-section"], [class*="secondaryWheel"]',
    );
    if (secondWheels) {
      push("## Zweiter Radsatz");
      secondWheels.querySelectorAll("p").forEach((paragraph) => {
        const text = paragraph.textContent.trim();
        if (text) push(text);
      });
      const details = await secondaryWheelDetails();
      details.forEach(push);
      push("");
    }

    // 7. URL
    push(`Quelle: ${window.location.href.split("?")[0]}`);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  async function secondaryWheelDetails() {
    const inlineCards = document.querySelectorAll("#ah-wheel-grid article");
    if (inlineCards.length) {
      return [...inlineCards].flatMap((card) => [
        `### ${card.querySelector("h3").textContent.trim()}`,
        ...[...card.querySelectorAll("li")].map((item) =>
          `- **${item.children[0].textContent.trim()}:** ${item.children[1].textContent.trim()}`),
        "",
      ]);
    }
    const findGallery = () => [...document.querySelectorAll('[role="dialog"]')]
      .find((dialog) => dialog.textContent.includes("Galerie für den sekundären Radsatz") &&
        dialog.querySelector("h2"));
    let gallery = findGallery();
    const openedByCopy = !gallery;
    if (openedByCopy) {
      const button = document.querySelector('[data-qa-selector="secondary-wheels-button"]');
      if (!button) return [];
      button.click();
      gallery = await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const found = findGallery();
          if (found) { observer.disconnect(); clearTimeout(timeout); resolve(found); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const timeout = setTimeout(() => { observer.disconnect(); resolve(findGallery()); }, 3000);
        const found = findGallery();
        if (found) { observer.disconnect(); clearTimeout(timeout); resolve(found); }
      });
    }

    const lines = [];
    if (gallery) {
      gallery.querySelectorAll("h2").forEach((heading) => {
        const items = heading.parentElement.querySelectorAll("li");
        if (!items.length) return;
        lines.push(`### ${heading.textContent.trim()}`);
        items.forEach((item) => {
          const fields = [...item.children].map((element) => element.textContent.trim());
          if (fields.length >= 2 && fields[0] && fields[1])
            lines.push(`- **${fields[0]}:** ${fields[1]}`);
        });
        lines.push("");
      });
      if (openedByCopy) gallery.querySelector('[data-qa-selector="sideMenuClose"]')?.click();
    }
    return lines;
  }

  // ── Floating actions ──────────────────────────────────────────
  function setupCopyButton() {
    if (document.getElementById("ah-actions")) return;

    const actions = document.createElement("div");
    actions.id = "ah-actions";
    const toggle = document.createElement("button");
    toggle.id = "ah-pins-toggle";
    toggle.type = "button";
    toggle.addEventListener("click", () => {
      localStorage.setItem(PINNED_BAR_HIDDEN_KEY, String(!isPinnedBarHidden()));
      updatePinnedBar();
    });
    actions.appendChild(toggle);

    const btn = document.createElement("button");
    btn.id = "ah-copy-btn";
    btn.type = "button";
    btn.textContent = "📋 Copy";
    btn.addEventListener("click", async () => {
      const text = await extractCarDetails();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "✅ Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "📋 Copy";
          btn.classList.remove("copied");
        }, 2000);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        btn.textContent = "✅ Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "📋 Copy";
          btn.classList.remove("copied");
        }, 2000);
      }
    });
    actions.appendChild(btn);
    document.body.appendChild(actions);
    updatePinnedBar();
  }

  // ── Hide text-based clutter that CSS can't catch ──────────────
  // This runs after React hydrates, using inline style (still safe)
  function hideTextClutter() {
    [
      "Benachrichtigung bei Preisreduzierung",
      "Passe deine Bestellung an",
      "Kontaktiere uns",
    ].forEach((text) => {
      try {
        const el = document.evaluate(
          '//*[contains(text(),"' + text + '")]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue;
        if (el) {
          // Use style instead of remove to keep React happy
          el.style.display = "none";
          // Also hide parent container if it's a wrapper
          const section = el.closest(
            '[class*="conversionArea"], [class*="informationalContent"], div',
          );
          if (section && section !== document.body)
            section.style.display = "none";
        }
      } catch (e) {}
    });

    // Hide "Stolz, einer der besten Autohändler von Autobild" — CSS fallback
    try {
      const h3 = document.evaluate(
        '//h3[contains(text(),"Autobild")]',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue;
      if (h3) {
        h3.style.display = "none";
        const wrapper = h3.closest('[class*="wrapper"]');
        if (wrapper) wrapper.style.display = "none";
      }
    } catch (e) {}
  }

  function init() {
    // Wait for React to finish hydrating before any DOM changes
    setTimeout(() => {
      hideTextClutter();
      updatePinnedBar();
      updatePinButtons();
      setupCopyButton();
      setupDamageGallery();
      setupSecondaryWheels();
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
