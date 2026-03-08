// js/ui.js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeShowScreen(id) {
    if (typeof window.showScreen === "function") {
      return window.showScreen(id);
    }

    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.remove("active");
      s.style.display = "none";
    });

    const el = $(id);
    if (el) {
      el.classList.add("active");
      el.style.display = "block";
    }
  }

  function renderList(items, onClick) {
    const list = $("selectorList");
    if (!list) return;

    list.innerHTML = "";

    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "option-card";
      card.innerHTML = `
        <strong>${escapeHtml(it.title)}</strong>
        <small>${escapeHtml(it.subtitle || "")}</small>
      `;
      card.addEventListener("click", () => onClick(it));
      list.appendChild(card);
    });
  }

  function getAllowedCountries(allCountryKeys) {
    const allowed = window.accountConfig?.allowedCountries;
    if (!Array.isArray(allowed) || allowed.length === 0) return allCountryKeys;
    return allCountryKeys.filter((key) => allowed.includes(key));
  }

  function getAllowedStates(allStateKeys) {
    const allowed = window.accountConfig?.allowedStates;
    if (!Array.isArray(allowed) || allowed.length === 0) return allStateKeys;
    return allStateKeys.filter((key) => allowed.includes(key));
  }

  function setNavState(countryKey = null, stateKey = null, cityKey = null, routeKey = null) {
    if (!window.APP_STATE) return;

    if (!window.APP_STATE.nav) {
      window.APP_STATE.nav = {};
    }

    window.APP_STATE.nav.countryKey = countryKey;
    window.APP_STATE.nav.stateKey = stateKey;
    window.APP_STATE.nav.cityKey = cityKey;
    window.APP_STATE.nav.routeKey = routeKey;
  }

  function openCountriesSelector() {
    const data = window.APP_DATA || {};
    const countryKeys = getAllowedCountries(Object.keys(data));

    const items = countryKeys.map((k) => ({
      key: k,
      title: data[k]?.name || k,
      subtitle: "Ver estados"
    }));

    const titleEl = $("selectorTitle");
    const subtitleEl = $("selectorSubtitle");

    if (titleEl) titleEl.textContent = "País";
    if (subtitleEl) subtitleEl.textContent = "Elige un país";

    setNavState(null, null, null, null);
    if (window.APP_STATE) window.APP_STATE.lastSelectorLevel = "countries";

    renderList(items, (it) => openStatesSelector(it.key));
    safeShowScreen("selector");
  }

  function openStatesSelector(countryKey) {
    const country = window.APP_DATA?.[countryKey];
    const states = country?.states || {};
    const stateKeys = getAllowedStates(Object.keys(states));

    const items = stateKeys.map((k) => ({
      key: k,
      title: states[k]?.name || k,
      subtitle: "Ver ciudades"
    }));

    const titleEl = $("selectorTitle");
    const subtitleEl = $("selectorSubtitle");

    if (titleEl) titleEl.textContent = "Estado";
    if (subtitleEl) subtitleEl.textContent = "Elige un estado";

    setNavState(countryKey, null, null, null);
    if (window.APP_STATE) window.APP_STATE.lastSelectorLevel = "states";

    renderList(items, (it) => openCitiesSelector(countryKey, it.key));
    safeShowScreen("selector");
  }

  function openCitiesSelector(countryKey, stateKey) {
    const cities = window.APP_DATA?.[countryKey]?.states?.[stateKey]?.cities || {};

    const items = Object.keys(cities).map((k) => ({
      key: k,
      title: cities[k]?.name || k,
      subtitle: "Ver rutas"
    }));

    const titleEl = $("selectorTitle");
    const subtitleEl = $("selectorSubtitle");

    if (titleEl) titleEl.textContent = "Ciudad";
    if (subtitleEl) subtitleEl.textContent = "Elige una ciudad";

    setNavState(countryKey, stateKey, null, null);
    if (window.APP_STATE) window.APP_STATE.lastSelectorLevel = "cities";

    renderList(items, (it) => openRoutesSelector(countryKey, stateKey, it.key));
    safeShowScreen("selector");
  }

  function openRoutesSelector(countryKey, stateKey, cityKey) {
    const routes = window.APP_DATA?.[countryKey]?.states?.[stateKey]?.cities?.[cityKey]?.routes || {};

    const items = Object.keys(routes).map((k) => ({
      key: k,
      title: routes[k]?.name || k,
      subtitle: "Iniciar recorrido",
      route: routes[k]
    }));

    const titleEl = $("selectorTitle");
    const subtitleEl = $("selectorSubtitle");

    if (titleEl) titleEl.textContent = "Ruta";
    if (subtitleEl) subtitleEl.textContent = "Elige una ruta";

    setNavState(countryKey, stateKey, cityKey, null);
    if (window.APP_STATE) window.APP_STATE.lastSelectorLevel = "routes";

    renderList(items, (it) => {
      if (window.APP_STATE) {
        window.APP_STATE.currentRoute = it.route || null;
        if (window.APP_STATE.nav) {
          window.APP_STATE.nav.routeKey = it.key;
        }
      }

      if (typeof window.startRoute === "function") {
        window.startRoute(it.route);
      } else {
        alert("startRoute no existe (revisa route360.js)");
      }
    });

    safeShowScreen("selector");
  }

  function renderModeSelector() {
    const modeSelector = $("modeSelector");
    const modeButtons = $("modeButtons");

    if (!modeSelector || !modeButtons) return;

    const allowedModes = Array.isArray(window.accountConfig?.allowedModes)
      ? window.accountConfig.allowedModes
      : [];

    modeButtons.innerHTML = "";

    if (!allowedModes.length) {
      modeSelector.style.display = "none";
      return;
    }

    const modeLabels = {
      TREADMILL: "Caminadora",
      EXPLORER: "Explorador"
    };

    allowedModes.forEach((mode) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary";
      btn.textContent = modeLabels[mode] || mode;

      if (window.APP_STATE?.mode === mode) {
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        if (window.APP_STATE) {
          window.APP_STATE.mode = mode;
        }
        renderModeSelector();
      });

      modeButtons.appendChild(btn);
    });

    modeSelector.style.display = "block";
  }

  function handleSelectorBack() {
    const level = window.APP_STATE?.lastSelectorLevel || "home";
    const nav = window.APP_STATE?.nav || {};

    if (level === "routes" && nav.countryKey && nav.stateKey) {
      openCitiesSelector(nav.countryKey, nav.stateKey);
      return;
    }

    if (level === "cities" && nav.countryKey) {
      openStatesSelector(nav.countryKey);
      return;
    }

    if (level === "states") {
      openCountriesSelector();
      return;
    }

    safeShowScreen("home");
  }

  function init() {
    $("selectorBack")?.addEventListener("click", handleSelectorBack);

    $("btnChooseRoute")?.addEventListener("click", openCountriesSelector);
    $("goToHistory")?.addEventListener("click", () => safeShowScreen("historyScreen"));

    renderModeSelector();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.openCountriesSelector = openCountriesSelector;
  window.openStatesSelector = openStatesSelector;
  window.openCitiesSelector = openCitiesSelector;
  window.openRoutesSelector = openRoutesSelector;
  window.renderModeSelector = renderModeSelector;
})();