// ==UserScript==
// @name         OM kitöltő inyr.hu-hoz (v5.0.1)
// @namespace    acsdaniel87
// @version      5.0.1
// @description  OM azonosítók automatikus kitöltése és kezelése az inyr.hu oldalon, több nyelven, datalist támogatással
// @author       Ács Dániel
// @match        https://www.inyr.hu/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
  'use strict';

  if (location.pathname.includes("/Account/Login")) return;
  if (!document.querySelector('input[id="Omkod"]')) return;

  const HU = {
    invalidOmAlert: "Hibás OM azonosító!",
    confirmDelete: "Biztosan törlöd ezt az OM azonosítót?",
    settingsTitle: "Beállítások",
    addLabel: "Új OM hozzáadása",
    deleteLabel: "Törlés",
    shareLink: "Megosztási link másolása",
    openKirint: "KIRINT Intézménykereső",
    closePanel: "Bezárás",
    inputPlaceholder: "pl. 202797",
    reloadAlert: "Az oldal újratöltése...",
    selectLanguageLabel: "Felület nyelve"
  };

  const storedLang = GM_getValue("uiLang", null);
  const langCode = (storedLang || navigator.language || "hu").slice(0, 2);
  const listUrl = "https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/lang/list.js";
  let availableLangs = {};

  fetch(listUrl)
    .then(res => res.ok ? res.text() : Promise.reject("List fetch error"))
    .then(txt => {
      eval(txt);
      availableLangs = window.AvailableLanguages || {};
      const selectedLang = availableLangs.hasOwnProperty(langCode) ? langCode : "hu";
      loadLanguage(selectedLang);
    })
    .catch(err => {
      console.warn("🔴 Nyelvlista betöltése sikertelen:", err);
      loadLanguage("hu");
    });

  function loadLanguage(code) {
    const url = `https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/lang/${code}.js`;
    fetch(url)
      .then(res => res.ok ? res.text() : Promise.reject("Lang file not found"))
      .then(txt => {
        eval(txt);
        const labels = window.OMLabels || HU;
        initPanel(labels, code);
      })
      .catch(err => {
        console.warn(`⚠️ ${code}.js betöltése sikertelen:`, err);
        initPanel(HU, "hu");
      });
  }

  function injectDatalist(oms) {
    const datalistId = "omkod-list";
    if (!document.getElementById(datalistId)) {
      const dl = document.createElement("datalist");
      dl.id = datalistId;
      oms.forEach(om => {
        const opt = document.createElement("option");
        opt.value = om;
        dl.appendChild(opt);
      });
      document.body.appendChild(dl);
    }
  }

  function attachOMInput() {
    const input = document.querySelector('input[id="Omkod"]');
    if (input) input.setAttribute("list", "omkod-list");
  }

  function initPanel(labels, currentLang) {
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
      if (code === currentLang) opt.selected = true;
      langSelect.appendChild(opt);
    }
    langSelect.onchange = () => {
      GM_setValue("uiLang", langSelect.value);
      alert(labels.reloadAlert);
      location.reload();
    };
    panel.appendChild(langSelect);

    const select = document.createElement("select");
    select.style.width = "100%"; select.style.marginTop = "10px";
    saved.forEach(om => {
      const opt = document.createElement("option");
      opt.value = om;
      opt.textContent = om;
      if (om === active) opt.selected = true;
      select.appendChild(opt);
    });
    panel.appendChild(select);

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
      alert(labels.reloadAlert);
      location.reload();
    };
    panel.appendChild(addBtn);

    const delBtn = document.createElement("button");
    delBtn.textContent = labels.deleteLabel;
    delBtn.onclick = () => {
      if (!confirm(labels.confirmDelete)) return;
      const sel = select.value;
      const list = GM_getValue("oms", []).filter(v => v !== sel);
      GM_setValue("oms", list);
      const newActive = list.includes(active) ? active : (list[0] || "");
      GM_setValue("activeOm", newActive);
      alert(labels.reloadAlert);
      location.reload();
    };
    panel.appendChild(delBtn);

    const share = document.createElement("button");
    share.textContent = labels.shareLink;
    share.onclick = () => {
      GM_setClipboard("https://github.com/acsdaniel87/OM-autofill");
      const originalText = share.textContent;
      share.textContent = "✔";
      share.style.color = "#28a745";
      setTimeout(() => {
        share.textContent = originalText;
        share.style.color = "";
      }, 1500);
    };
    panel.appendChild(share);

    const kir = document.createElement("div");
    kir.innerHTML = `<a href="https://kirint.kir.hu/IntezmenyKereso/" target="_blank" style="color:#007b5e;">🔗 ${labels.openKirint}</a>`;
    kir.style.marginTop = "12px"; kir.style.fontSize = "12px"; kir.style.textAlign = "center";
    panel.appendChild(kir);

    button.onclick = () => {
      panelVisible = !panelVisible;
      panel.style.right = panelVisible ? "6px" : "-270px";
    };

    document.body.appendChild(button);
    document.body.appendChild(panel);

    const omkod = GM_getValue("activeOm", "");
    const targetInput = document.querySelector('input[id="Omkod"]');
    if (targetInput && omkod) targetInput.value = omkod;

    injectDatalist(saved);
    attachOMInput();
  }
})();
