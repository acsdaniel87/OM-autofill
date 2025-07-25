// ==UserScript==
// @name         OM kitöltő inyr.hu-hoz (v6.0)
// @namespace    acsdaniel87
// @version      6.0
// @description  OM azonosítók automatikus kitöltése az inyr.hu oldalon, intézménynévvel bővítve
// @author       Ács Dániel
// @match        https://www.inyr.hu/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// ==/UserScript==

(async function() {
  'use strict';

  if (location.pathname.includes("/Account/Login")) return;
  const targetInput = document.querySelector('input[id="Omkod"]');
  if (!targetInput) return;

  // 🌐 Nyelvi fájl betöltése
  const storedLang = GM_getValue("uiLang", null);
  const langCode = (storedLang || navigator.language || "hu").slice(0, 2);
  const listUrl = "https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/lang/list.js";
  const langBase = "https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/lang/";
  const csvUrl = "https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/azonositok/kir_mukodo_intezmenyek_2025_07_23.csv";

  let labels = {};
  let availableLangs = {};
  let institutionMap = {};

  // 🔽 CSV betöltés – OM ➝ Intézmény
  async function loadInstitutionMap() {
    try {
      const res = await fetch(csvUrl);
      const text = await res.text();
      const rows = text.trim().split("\n");
      for (let i = 1; i < rows.length; i++) {
        const [om, name] = rows[i].split(";");
        if (om && name) institutionMap[om.trim()] = name.trim();
      }
    } catch (err) {
      console.warn("📄 Intézménytérkép betöltési hiba:", err);
    }
  }

  // 🔤 Nyelv betöltése
  async function loadLabels(current) {
    try {
      const res = await fetch(listUrl);
      const txt = await res.text();
      eval(txt);
      availableLangs = window.AvailableLanguages || {};

      const langFile = availableLangs[current] ? current : "hu";
      const langRes = await fetch(`${langBase}${langFile}.js`);
      const code = await langRes.text();
      eval(code);
      labels = window.OMLabels || {};
    } catch (err) {
      console.warn("🌐 Nyelvi fájl betöltése sikertelen:", err);
      labels = {
        settingsTitle: "Beállítások",
        addLabel: "Új OM hozzáadása",
        deleteLabel: "Törlés",
        shareLink: "Megosztási link másolása",
        openKirint: "KIRINT Intézménykereső",
        closePanel: "Bezárás",
        invalidOmAlert: "Hibás OM azonosító!",
        inputPlaceholder: "pl. 202797",
        reloadAlert: "Az oldal újratöltése...",
        selectLanguageLabel: "Felület nyelve"
      };
    }
  }

  // 📋 Panel inicializálás
  async function initPanel(langCode) {
    const saved = GM_getValue("oms", []);
    const active = GM_getValue("activeOm", "");

    let panelVisible = false;
    const button = document.createElement("button");
    button.textContent = "⚙";
    Object.assign(button.style, {
      position: "fixed", top: "80px", right: "6px", zIndex: 9999,
      fontSize: "20px", borderRadius: "50%", padding: "6px 10px", cursor: "pointer"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed", top: "60px", right: "-270px", width: "260px",
      background: "#f5f5f5", border: "1px solid #ccc", padding: "10px",
      fontSize: "14px", fontFamily: "sans-serif", zIndex: 9998, transition: "right 0.3s"
    });

    const closeBtn = document.createElement("div");
    closeBtn.textContent = "❌";
    Object.assign(closeBtn.style, {
      position: "absolute", top: "6px", right: "8px", fontSize: "14px", cursor: "pointer"
    });
    closeBtn.onclick = () => { panel.style.right = "-270px"; panelVisible = false; };
    panel.appendChild(closeBtn);

    const title = document.createElement("h3");
    title.textContent = labels.settingsTitle;
    panel.appendChild(title);

    // 🔤 Nyelvválasztó
    const langLabel = document.createElement("label");
    langLabel.textContent = labels.selectLanguageLabel || "Felület nyelve";
    langLabel.style.display = "block"; langLabel.style.marginTop = "10px";
    panel.appendChild(langLabel);

    const langSelect = document.createElement("select");
    langSelect.style.width = "100%";
    for (const [code, name] of Object.entries(availableLangs)) {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = `${name} (${code})`;
      if (code === langCode) opt.selected = true;
      langSelect.appendChild(opt);
    }
    langSelect.onchange = () => {
      GM_setValue("uiLang", langSelect.value);
      alert(labels.reloadAlert);
      location.reload();
    };
    panel.appendChild(langSelect);

    // 📄 OM kiválasztó intézménynévvel
    const select = document.createElement("select");
    select.style.width = "100%"; select.style.marginTop = "10px";
    saved.forEach(om => {
      const opt = document.createElement("option");
      opt.value = om;
      const name = institutionMap[om];
      opt.textContent = name ? `${name} (${om})` : om;
      if (om === active) opt.selected = true;
      select.appendChild(opt);
    });
    panel.appendChild(select);

    // 📥 Új OM
    const input = document.createElement("input");
    input.placeholder = labels.inputPlaceholder;
    input.style.width = "100%";
    panel.appendChild(input);

    const addBtn = document.createElement("button");
    addBtn.textContent = labels.addLabel;
    addBtn.onclick = () => {
      const val = input.value.trim();
      if (!/^\d{6}$/.test(val)) return alert(labels.invalidOmAlert);
      const list = GM_getValue("oms", []);
      if (!list.includes(val)) list.push(val);
      GM_setValue("oms", list);
      GM_setValue("activeOm", val);
      alert(labels.reloadAlert);
      location.reload();
    };
    panel.appendChild(addBtn);

    // 🗑️ OM törlés
    const delBtn = document.createElement("button");
    delBtn.textContent = labels.deleteLabel;
    delBtn.onclick = () => {
      if (!confirm(labels.confirmDelete)) return;
      const sel = select.value;
      const list = GM_getValue("oms", []).filter(v => v !== sel);
      GM_setValue("oms", list);
      GM_setValue("activeOm", list[0] || "");
      alert(labels.reloadAlert);
      location.reload();
    };
    panel.appendChild(delBtn);

    // 🔗 Megosztási gomb ✅ pipa visszajelzéssel
    const share = document.createElement("button");
    share.textContent = labels.shareLink;
    share.onclick = () => {
      GM_setClipboard("https://github.com/acsdaniel87/OM-autofill");
      const original = share.textContent;
      share.textContent = "✔";
      share.style.color = "#28a745";
      setTimeout(() => {
        share.textContent = original;
        share.style.color = "";
      }, 1500);
    };
    panel.appendChild(share);

    // 🏫 KIRINT link
    const kir = document.createElement("div");
    kir.innerHTML = `<a href="    kir.innerHTML = `<a href="https://kirint.kir.hu/IntezmenyKereso/" target="_blank" style="color:#007b5e;">🔗 ${labels.openKirint}</a>`;
    kir.style.marginTop = "12px"; kir.style.fontSize = "12px"; kir.style.textAlign = "center";
    panel.appendChild(kir);

    // ⚙️ Panel gomb megjelenítése
    button.onclick = () => {
      panelVisible = !panelVisible;
      panel.style.right = panelVisible ? "6px" : "-270px";
    };

    document.body.appendChild(button);
    document.body.appendChild(panel);

    // 📤 OM mező automatikus kitöltése
    const omkod = GM_getValue("activeOm", "");
    if (targetInput && omkod) targetInput.value = omkod;
  }

  // 🚀 Elindítás: nyelv + intézménytérkép betöltése
  await loadInstitutionMap();
  await loadLabels(langCode);
  await initPanel(langCode);
})();
