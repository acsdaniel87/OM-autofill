// ==UserScript==
// @name         OM kitöltő inyr.hu-hoz (v5.0)
// @namespace    acsdaniel87
// @version      5.0
// @description  OM azonosító automatikus kitöltése és kezelése az inyr.hu oldalon, több nyelven
// @author       Ács Dániel
// @match        https://www.inyr.hu/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/OM%20kit%C3%B6lt%C5%91%20inyr.hu-hoz-5.0.user.js
// @downloadURL  https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/OM%20kit%C3%B6lt%C5%91%20inyr.hu-hoz-5.0.user.js
// ==/UserScript==

(function() {
  'use strict';

  /** 🌍 Alapértelmezett magyar nyelvi szövegek (fallback) */
  const HU = {
    invalidOmAlert: "Hibás OM azonosító!",
    confirmDelete: "Biztosan törlöd ezt az OM azonosítót?",
    settingsTitle: "Beállítások",
    addLabel: "Új OM hozzáadása",
    deleteLabel: "Törlés",
    shareLink: "Megosztási link másolása",
    openKirint: "KIRINT Intézménykereső",
    closePanel: "Bezárás"
  };

  /** 🌐 Nyelvi betöltés GitHub-ról */
  const langCode = (navigator.language || 'hu').slice(0, 2);
  const supportedLangs = ['en', 'de', 'fr'];
  const isExternal = supportedLangs.includes(langCode);
  const langUrl = `https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/lang/${langCode}.js`;

  /** 🤖 Nyelvi betöltés + inicializálás */
  fetch(langUrl)
    .then(r => r.ok ? r.text() : Promise.reject("Not found"))
    .then(code => {
      eval(code); // feltételezzük, hogy window.OMLabels-t definiál
      if (!window.OMLabels) throw "Missing OMLabels";
      initPanel(window.OMLabels);
    })
    .catch(err => {
      console.warn("Nyelvi fájl betöltése nem sikerült, magyar nyelv használata.");
      initPanel(HU);
    });

  /** 🛠️ Panel inicializáló függvény */
  function initPanel(labels) {
    // OM lista betöltés
    const saved = GM_getValue("oms", []);
    const active = GM_getValue("activeOm", "");
    let panelVisible = false;

    // Létrehozás
    const button = document.createElement("button");
    button.textContent = "⚙";
    Object.assign(button.style, {
      position: "fixed", top: "80px", right: "6px", zIndex: 9999,
      fontSize: "20px", borderRadius: "50%", padding: "6px 10px", cursor: "pointer"
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "fixed", top: "60px", right: "-260px", width: "250px",
      background: "#f5f5f5", border: "1px solid #ccc", padding: "10px",
      fontSize: "14px", fontFamily: "sans-serif", zIndex: 9998, transition: "right 0.3s"
    });

    // ❌ Bezáró gomb
    const closeBtn = document.createElement("div");
    closeBtn.textContent = "❌";
    Object.assign(closeBtn.style, {
      position: "absolute", top: "6px", right: "8px", fontSize: "14px", cursor: "pointer"
    });
    closeBtn.onclick = () => { panel.style.right = "-260px"; panelVisible = false; };
    panel.appendChild(closeBtn);

    // Cím
    const title = document.createElement("h3");
    title.textContent = labels.settingsTitle;
    panel.appendChild(title);

    // OM mezők
    const select = document.createElement("select");
    select.style.width = "100%";
    saved.forEach(om => {
      const opt = document.createElement("option");
      opt.value = om;
      opt.textContent = om;
      if (om === active) opt.selected = true;
      select.appendChild(opt);
    });
    panel.appendChild(select);

    // Input + hozzáadás
    const input = document.createElement("input");
    input.placeholder = "pl. 202797";
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
      location.reload();
    };
    panel.appendChild(addBtn);

    // Törlés
    const delBtn = document.createElement("button");
    delBtn.textContent = labels.deleteLabel;
    delBtn.onclick = () => {
      if (!confirm(labels.confirmDelete)) return;
      const sel = select.value;
      const list = GM_getValue("oms", []).filter(v => v !== sel);
      GM_setValue("oms", list);
      GM_setValue("activeOm", list[0] || "");
      location.reload();
    };
    panel.appendChild(delBtn);

    // Megosztási link
    const share = document.createElement("button");
    share.textContent = labels.shareLink;
    share.onclick = () => GM_setClipboard(location.href);
    panel.appendChild(share);

    // 🔗 KIRINT link (mindig magyar)
    const kir = document.createElement("div");
    kir.innerHTML = `<a href="https://kirint.kir.hu/IntezmenyKereso/" target="_blank" style="color:#007b5e;">🔗 ${labels.openKirint}</a>`;
    kir.style.marginTop = "12px"; kir.style.fontSize = "12px"; kir.style.textAlign = "center";
    panel.appendChild(kir);

    // Panel gomb
    button.onclick = () => {
      panelVisible = !panelVisible;
      panel.style.right = panelVisible ? "6px" : "-260px";
    };

    document.body.appendChild(button);
    document.body.appendChild(panel);

    // OM kitöltés
    const omkod = GM_getValue("activeOm", "");
    const targetInput = document.querySelector('input[id="Omkod"]');
    if (targetInput && omkod) targetInput.value = omkod;
  }
})();
