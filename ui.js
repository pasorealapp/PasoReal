// js/ui.js

// =====================================================
// ZONA 0: CONTENEDOR GENERAL DEL ARCHIVO
// =====================================================
// Función:
// - Encapsular el módulo UI
// - Evitar contaminar el ámbito global
//
// >>> NO BORRAR el inicio ni el final.
// >>> Este archivo expone funciones globales como:
// >>> - openCountriesSelector
// >>> - openStatesSelector
// >>> - openCitiesSelector
// >>> - openRoutesSelector
// >>> - renderModeSelector
(() => {
  "use strict";

  // =====================================================
  // ZONA 1: UTILIDAD BASE DOM
  // =====================================================
  // Función:
  // - Buscar elementos por id rápidamente
  //
  // >>> ZONA SEGURA.
  const $ = (id) => document.getElementById(id);


  // =====================================================
  // ZONA 2: SEGURIDAD HTML
  // =====================================================
  // Función:
  // - Escapar texto antes de meterlo en innerHTML
  // - Evitar romper HTML o meter contenido no seguro
  //
  // >>> NO BORRAR si sigues usando innerHTML en renderList().
  // >>> Si los nombres vienen de Firestore o datos externos, esto protege.
  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // =====================================================
  // ZONA 3: CAMBIO SEGURO DE PANTALLA
  // =====================================================
  // Función:
  // - Mostrar una pantalla usando showScreen si existe
  // - Si no existe, hacerlo manualmente
  //
  // >>> MUY PARECIDA a safeShow() de app.js.
  // >>> Si luego quieres, conviene unificar ambas para no duplicar lógica.
  // >>> NO QUITAR el fallback manual.
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


  // =====================================================
  // ZONA 4: RENDERIZADO GENÉRICO DE LISTAS
  // =====================================================
  // Función:
  // - Dibujar tarjetas dentro de selectorList
  // - Ejecutar onClick al elegir una opción
  //
  // >>> AQUÍ SE PINTAN:
  // >>> - países
  // >>> - estados
  // >>> - ciudades
  // >>> - rutas
  //
  // >>> Si el selector sale vacío o mal renderizado, revisa este bloque.
  // >>> Si quieres cambiar diseño de cada tarjeta, empieza aquí.
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


  // =====================================================
  // ZONA 5: FILTRO DE PAÍSES PERMITIDOS
  // =====================================================
  // Función:
  // - Limitar países según accountConfig.allowedCountries
  //
  // >>> Si no aparecen todos los países, revisa este bloque
  // >>> y la configuración accountConfig.
  function getAllowedCountries(allCountryKeys) {
    const allowed = window.accountConfig?.allowedCountries;
    if (!Array.isArray(allowed) || allowed.length === 0) return allCountryKeys;
    return allCountryKeys.filter((key) => allowed.includes(key));
  }


  // =====================================================
  // ZONA 6: FILTRO DE ESTADOS PERMITIDOS
  // =====================================================
  // Función:
  // - Limitar estados según accountConfig.allowedStates
  //
  // >>> Igual que arriba pero para estados.
  function getAllowedStates(allStateKeys) {
    const allowed = window.accountConfig?.allowedStates;
    if (!Array.isArray(allowed) || allowed.length === 0) return allStateKeys;
    return allStateKeys.filter((key) => allowed.includes(key));
  }


  // =====================================================
  // ZONA 7: ESTADO DE NAVEGACIÓN DEL SELECTOR
  // =====================================================
  // Función:
  // - Guardar countryKey, stateKey, cityKey y routeKey actuales
  //
  // >>> ZONA IMPORTANTE para el botón "atrás".
  // >>> Si el selector se pierde o regresa mal, revisa aquí.
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


  // =====================================================
  // ZONA 8: SELECTOR DE PAÍSES
  // =====================================================
  // Función:
  // - Leer países desde APP_DATA
  // - Filtrarlos
  // - Pintar lista de países
  // - Mandar al nivel de estados
  //
  // >>> PRIMER NIVEL DEL SELECTOR.
  // >>> Si btnChooseRoute entra al selector, normalmente empieza aquí.
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


  // =====================================================
  // ZONA 9: SELECTOR DE ESTADOS
  // =====================================================
  // Función:
  // - Leer estados del país elegido
  // - Filtrarlos
  // - Pintar lista
  // - Mandar al nivel de ciudades
  //
  // >>> SEGUNDO NIVEL DEL SELECTOR.
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


  // =====================================================
  // ZONA 10: SELECTOR DE CIUDADES
  // =====================================================
  // Función:
  // - Leer ciudades del estado elegido
  // - Pintar lista
  // - Mandar al nivel de rutas
  //
  // >>> TERCER NIVEL DEL SELECTOR.
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


  // =====================================================
  // ZONA 11: SELECTOR DE RUTAS
  // =====================================================
  // Función:
  // - Leer rutas de la ciudad elegida
  // - Pintarlas
  // - Guardar currentRoute
  // - Ejecutar startRoute(route)
  //
  // >>> CUARTO NIVEL DEL SELECTOR.
  // >>> Si al elegir ruta no inicia nada, revisa este bloque y startRoute.
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


  // =====================================================
  // ZONA 12: SELECTOR DE MODOS
  // =====================================================
  // Función:
  // - Pintar botones de modo permitidos
  // - Guardar el modo activo en APP_STATE.mode
  // - Re-renderizar botones al cambiar de modo
  //
  // >>> Si no salen los botones de modo, revisa:
  // >>> - modeSelector
  // >>> - modeButtons
  // >>> - accountConfig.allowedModes
  // >>> - APP_STATE.mode
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


  // =====================================================
  // ZONA 13: BOTÓN ATRÁS DEL SELECTOR
  // =====================================================
  // Función:
  // - Saber a qué nivel regresar según lastSelectorLevel y nav
  //
  // >>> ZONA CLAVE para navegación escalonada.
  // >>> Si el botón atrás se comporta raro, revisa aquí.
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


  // =====================================================
  // ZONA 14: INICIALIZACIÓN DE UI
  // =====================================================
  // Función:
  // - Conectar eventos básicos del selector y home
  // - Renderizar selector de modos
  //
  // >>> AQUÍ SE ENGANCHAN eventos visuales de este archivo.
  // >>> OJO: btnChooseRoute también se conecta en app.js.
  // >>> Eso puede generar doble listener si no lo controlas.
  function init() {
    $("selectorBack")?.addEventListener("click", handleSelectorBack);

    $("goToHistory")?.addEventListener("click", () => safeShowScreen("historyScreen"));

    renderModeSelector();
  }


  // =====================================================
  // ZONA 15: AUTOARRANQUE AL CARGAR EL DOM
  // =====================================================
  // Función:
  // - Ejecutar init() cuando el HTML ya esté listo
  //
  // >>> NO BORRAR.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }


  // =====================================================
  // ZONA 16: EXPOSICIÓN GLOBAL DE FUNCIONES UI
  // =====================================================
  // Función:
  // - Hacer accesibles funciones desde otros archivos
  //
  // >>> app.js usa openCountriesSelector y renderModeSelector.
  // >>> NO CAMBIAR nombres sin revisar dependencias.
  window.openCountriesSelector = openCountriesSelector;
  window.openStatesSelector = openStatesSelector;
  window.openCitiesSelector = openCitiesSelector;
  window.openRoutesSelector = openRoutesSelector;
  window.renderModeSelector = renderModeSelector;

})();
// =====================================================
// FIN DEL ARCHIVO
// =====================================================