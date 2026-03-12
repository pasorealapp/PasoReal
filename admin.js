// js/admin.js

// =====================================================
// ZONA 0: CONTENEDOR GENERAL DEL ARCHIVO
// =====================================================
// Función:
// - Encapsular el módulo admin
// - Evitar contaminar el ámbito global
//
// >>> NO BORRAR el inicio ni el final.
// >>> Este archivo expone window.AdminUI.
(() => {
  "use strict";

  // =====================================================
  // ZONA 1: CONTROL DE HOOKS / LISTENERS
  // =====================================================
  // Función:
  // - Evitar conectar eventos dos veces
  //
  // >>> NO BORRAR.
  // >>> Si init() se dispara dos veces, esto evita listeners duplicados.
  let isHooked = false;


  // =====================================================
  // ZONA 2: UTILIDAD BASE DOM
  // =====================================================
  // Función:
  // - Buscar elementos por id
  //
  // >>> ZONA SEGURA.
  const $ = (id) => document.getElementById(id);


  // =====================================================
  // ZONA 3: SEGURIDAD HTML
  // =====================================================
  // Función:
  // - Escapar texto para usarlo dentro de innerHTML
  //
  // >>> NO BORRAR mientras uses innerHTML en tarjetas de usuarios.
  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // =====================================================
  // ZONA 4: MENSAJES DEL PANEL ADMIN
  // =====================================================
  // Función:
  // - Mostrar mensajes en adminMsg
  //
  // >>> ZONA SEGURA para cambiar textos/estilo básico.
  function msg(text, isError = false) {
    const el = $("adminMsg");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = isError ? "#ff8a8a" : "#fff";
  }


  // =====================================================
  // ZONA 5: VALIDACIÓN DE ADMIN REAL
  // =====================================================
  // Función:
  // - Esperar Roles/DB
  // - Verificar sesión activa
  // - Verificar permiso admin
  //
  // >>> ZONA MUY DELICADA.
  // >>> Casi todas las acciones fuertes del panel pasan por aquí.
  // >>> Si no abre admin, revisa este bloque y roles.js.
  async function ensureAdmin() {
    if (!window.Roles?.ensureReady) {
      throw new Error("Roles.ensureReady no existe. Revisa js/roles.js y js/router.js");
    }

    await window.Roles.ensureReady();

    const u = window.APP_STATE?.user;
    if (!u) throw new Error("No hay sesión");

    const ok = await window.Roles.isAdmin(u.uid);
    if (!ok) throw new Error("No eres admin");

    return u;
  }


  // =====================================================
  // ZONA 6: FORMATO DE FECHA DE MEMBRESÍA
  // =====================================================
  // Función:
  // - Convertir paidUntil en texto legible
  // - Mostrar "SIN MEMBRESÍA" o "Fecha inválida" cuando toque
  //
  // >>> Si la fecha se ve rara en admin, revisa aquí.
  function formatPaidUntil(paidUntil) {
    if (!paidUntil) return "SIN MEMBRESÍA";

    let date = null;

    if (paidUntil?.seconds) {
      date = new Date(paidUntil.seconds * 1000);
    } else {
      date = new Date(paidUntil);
    }

    if (Number.isNaN(date.getTime())) {
      return "Fecha inválida";
    }

    return `Vence: ${date.toLocaleDateString("es-MX")}`;
  }


  // =====================================================
  // ZONA 7: ACTUALIZAR MEMBRESÍA DE USUARIO
  // =====================================================
  // Función:
  // - Activar membresía hasta una fecha dada
  // - O desactivarla poniendo paidUntil = null
  //
  // >>> ZONA CRÍTICA.
  // >>> Aquí de verdad modificas users/{uid}.
  // >>> Si un usuario no se activa bien, revisa este bloque.
  async function setPaidUntil(uid, newDate) {
    await ensureAdmin();

    if (!uid) throw new Error("UID inválido.");

    if (!newDate) {
      await window.DB.collection("users").doc(uid).set(
        { paidUntil: null, status: "pending" },
        { merge: true }
      );
      return;
    }

    const timestamp = window.firebase.firestore.Timestamp.fromDate(newDate);

    await window.DB.collection("users").doc(uid).set(
      {
        paidUntil: timestamp,
        status: "active"
      },
      { merge: true }
    );
  }


  // =====================================================
  // ZONA 8: LISTADO DE USUARIOS
  // =====================================================
  // Función:
  // - Cargar hasta 50 usuarios
  // - Pintar tarjeta por usuario
  // - Permitir sumar días o desactivar membresía
  //
  // >>> CEREBRO DE LA VISTA DE USUARIOS.
  // >>> Si el panel usuarios falla, casi siempre está aquí.
  async function listUsers() {
    await ensureAdmin();
    msg("Cargando usuarios...");

    const list = $("adminUsersList");
    if (list) {
      list.innerHTML = "<p style='opacity:0.7;'>Cargando...</p>";
    }

    let snap;
    try {
      snap = await window.DB.collection("users").orderBy("createdAt", "desc").limit(50).get();
    } catch (e) {
      console.warn("No se pudo ordenar por createdAt, usando sin orden", e);
      snap = await window.DB.collection("users").limit(50).get();
    }

    msg(`Usuarios: ${snap.size}`);

    if (list) list.innerHTML = "";

    snap.forEach((doc) => {
      const u = doc.data() || {};
      const uid = doc.id;

      const div = document.createElement("div");
      div.className = "option-card";
      div.style.textAlign = "left";

      const fullName = `${u.nombre || "Usuario"} ${u.apellido || ""}`.trim();
      const vencTxt = formatPaidUntil(u.paidUntil);

      div.innerHTML = `
        <strong>${escapeHtml(fullName)}</strong>
        <div style="opacity:.8; font-size:12px; word-break:break-all;">${escapeHtml(u.email || "")}</div>
        <div style="opacity:.85; margin-top:6px; font-size:12px; word-break:break-all;">UID: ${escapeHtml(uid)}</div>
        <div style="margin-top:8px; font-weight:700;">${escapeHtml(vencTxt)}</div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <button class="primary" data-add="7">+7 días</button>
          <button class="primary" data-add="30">+30 días</button>
          <button class="primary" data-add="365">+365 días</button>
          <button class="link2" data-clear="1">Desactivar</button>
        </div>
      `;

      // -------------------------------------------------
      // SUBZONA 8.1: botones para sumar días
      // -------------------------------------------------
      div.querySelectorAll("button[data-add]").forEach((b) => {
        b.addEventListener("click", async () => {
          const add = parseInt(b.getAttribute("data-add"), 10);

          try {
            msg("Actualizando membresía...");

            let baseDate;
            if (u.paidUntil?.seconds) {
              baseDate = new Date(u.paidUntil.seconds * 1000);
            } else if (u.paidUntil) {
              baseDate = new Date(u.paidUntil);
            } else {
              baseDate = new Date();
            }

            if (Number.isNaN(baseDate.getTime()) || baseDate < new Date()) {
              baseDate = new Date();
            }

            baseDate.setDate(baseDate.getDate() + add);

            await setPaidUntil(uid, baseDate);
            await listUsers();
            msg("Listo ✅");
          } catch (e) {
            console.error(e);
            msg(e.message || "Error", true);
          }
        });
      });

      // -------------------------------------------------
      // SUBZONA 8.2: botón desactivar membresía
      // -------------------------------------------------
      div.querySelector("button[data-clear]")?.addEventListener("click", async () => {
        try {
          msg("Desactivando...");
          await setPaidUntil(uid, null);
          await listUsers();
          msg("Listo ✅");
        } catch (e) {
          console.error(e);
          msg(e.message || "Error", true);
        }
      });

      list?.appendChild(div);
    });
  }


  // =====================================================
  // ZONA 9: CARGAR CATÁLOGO AL EDITOR JSON
  // =====================================================
  // Función:
  // - Leer catalog/v1 desde Firestore
  // - Meter APP_DATA en el textarea editor
  //
  // >>> Si el editor JSON sale vacío o raro, revisa aquí.
  async function loadCatalogToEditor() {
    await ensureAdmin();
    msg("Cargando catálogo...");

    const snap = await window.DB.collection("catalog").doc("v1").get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const appData = data.APP_DATA || window.APP_DATA || {};

    const editor = $("adminCatalogJSON");
    if (!editor) throw new Error("No existe adminCatalogJSON en el DOM.");

    editor.value = JSON.stringify(appData, null, 2);
    msg("Catálogo listo ✅");
  }


  // =====================================================
  // ZONA 10: GUARDAR CATÁLOGO DESDE EL EDITOR JSON
  // =====================================================
  // Función:
  // - Leer JSON del textarea
  // - Parsearlo
  // - Guardarlo en Firestore
  // - Actualizar window.APP_DATA
  //
  // >>> ZONA MUY DELICADA.
  // >>> Aquí puedes romper o reparar todo el catálogo.
  // >>> Si pegas JSON malo, falla aquí.
  async function saveCatalogFromEditor() {
    await ensureAdmin();

    try {
      const raw = $("adminCatalogJSON")?.value || "{}";
      const parsed = JSON.parse(raw);

      await window.DB.collection("catalog").doc("v1").set(
        { APP_DATA: parsed },
        { merge: true }
      );

      window.APP_DATA = parsed;
      msg("Catálogo guardado ✅");
    } catch (e) {
      console.error(e);
      msg("JSON inválido o error al guardar", true);
    }
  }


  // =====================================================
  // ZONA 11: UTILIDAD DE CLONADO PROFUNDO
  // =====================================================
  // Función:
  // - Hacer copia independiente del objeto APP_DATA
  //
  // >>> OJO: sirve mientras APP_DATA sea JSON puro.
  // >>> Si un día guardas funciones o tipos raros, esto ya no bastaría.
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }


  // =====================================================
  // ZONA 12: ASEGURAR ESTRUCTURA DE RUTA EN APP_DATA
  // =====================================================
  // Función:
  // - Garantizar que existan país, estado y ciudad antes de escribir
  //
  // >>> ZONA IMPORTANTE para quickAddState/City/Route.
  // >>> Si una alta rápida falla por path inexistente, revisa aquí.
  function ensurePath(APP_DATA, cKey, sKey, ctKey) {
    APP_DATA[cKey] ||= { name: cKey, states: {} };
    APP_DATA[cKey].states ||= {};

    if (sKey) {
      APP_DATA[cKey].states[sKey] ||= { name: sKey, cities: {} };
      APP_DATA[cKey].states[sKey].cities ||= {};
    }

    if (sKey && ctKey) {
      APP_DATA[cKey].states[sKey].cities[ctKey] ||= { name: ctKey, routes: {} };
      APP_DATA[cKey].states[sKey].cities[ctKey].routes ||= {};
    }

    return APP_DATA;
  }


  // =====================================================
  // ZONA 13: ALTAS RÁPIDAS DE CATÁLOGO
  // =====================================================
  // Función:
  // - Agregar país
  // - Agregar estado
  // - Agregar ciudad
  // - Agregar ruta
  //
  // >>> ZONA MUY ÚTIL para construir catálogo sin editar JSON completo.
  // >>> Si no refleja cambios, revisa window.APP_DATA y catalog/v1.
  async function quickAddCountry() {
    await ensureAdmin();

    const cKey = ($("cKey")?.value || "").trim();
    const cName = ($("cName")?.value || "").trim();

    if (!cKey || !cName) return msg("Falta countryKey o nombre", true);

    const appData = deepClone(window.APP_DATA || {});
    appData[cKey] ||= { name: cName, states: {} };
    appData[cKey].name = cName;

    await window.DB.collection("catalog").doc("v1").set({ APP_DATA: appData }, { merge: true });
    window.APP_DATA = appData;

    await loadCatalogToEditor();
    msg("País agregado ✅");
  }

  async function quickAddState() {
    await ensureAdmin();

    const cKey = ($("sCountryKey")?.value || "").trim();
    const sKey = ($("sKey")?.value || "").trim();
    const sName = ($("sName")?.value || "").trim();

    if (!cKey || !sKey || !sName) return msg("Faltan datos de estado", true);

    const appData = deepClone(window.APP_DATA || {});
    ensurePath(appData, cKey, sKey);
    appData[cKey].states[sKey].name = sName;

    await window.DB.collection("catalog").doc("v1").set({ APP_DATA: appData }, { merge: true });
    window.APP_DATA = appData;

    await loadCatalogToEditor();
    msg("Estado agregado ✅");
  }

  async function quickAddCity() {
    await ensureAdmin();

    const cKey = ($("ctCountryKey")?.value || "").trim();
    const sKey = ($("ctStateKey")?.value || "").trim();
    const ctKey = ($("ctKey")?.value || "").trim();
    const ctName = ($("ctName")?.value || "").trim();

    if (!cKey || !sKey || !ctKey || !ctName) return msg("Faltan datos de ciudad", true);

    const appData = deepClone(window.APP_DATA || {});
    ensurePath(appData, cKey, sKey, ctKey);
    appData[cKey].states[sKey].cities[ctKey].name = ctName;

    await window.DB.collection("catalog").doc("v1").set({ APP_DATA: appData }, { merge: true });
    window.APP_DATA = appData;

    await loadCatalogToEditor();
    msg("Ciudad agregada ✅");
  }

  async function quickAddRoute() {
    await ensureAdmin();

    const cKey = ($("rCountryKey")?.value || "").trim();
    const sKey = ($("rStateKey")?.value || "").trim();
    const ctKey = ($("rCityKey")?.value || "").trim();
    const rKey = ($("rKey")?.value || "").trim();
    const rName = ($("rName")?.value || "").trim();
    const video = ($("rVideo")?.value || "").trim();
    const geoRaw = ($("rGeoJSON")?.value || "").trim();

    if (!cKey || !sKey || !ctKey || !rKey || !rName) {
      return msg("Faltan datos de ruta", true);
    }

    let geo = null;
    if (geoRaw) {
      try {
        geo = JSON.parse(geoRaw);
      } catch {
        return msg("GeoJSON inválido", true);
      }
    }

    const appData = deepClone(window.APP_DATA || {});
    ensurePath(appData, cKey, sKey, ctKey);

    appData[cKey].states[sKey].cities[ctKey].routes[rKey] ||= {
      id: rKey,
      name: rName,
      achievement: {
        title: `Explorador de ${rName}`,
        description: `Ruta completada en ${rName}`
      }
    };

    appData[cKey].states[sKey].cities[ctKey].routes[rKey].id = rKey;
    appData[cKey].states[sKey].cities[ctKey].routes[rKey].name = rName;

    if (video) {
      appData[cKey].states[sKey].cities[ctKey].routes[rKey].video = video;
    }

    if (geo) {
      appData[cKey].states[sKey].cities[ctKey].routes[rKey].geojson = geo;
    }

    await window.DB.collection("catalog").doc("v1").set({ APP_DATA: appData }, { merge: true });
    window.APP_DATA = appData;

    await loadCatalogToEditor();
    msg("Ruta agregada ✅");
  }


  // =====================================================
  // ZONA 14: NAVEGACIÓN INTERNA DE TABS ADMIN
  // =====================================================
  // Función:
  // - Mostrar solo una pestaña admin a la vez
  //
  // >>> Si no cambia de tab, revisa ids adminTabUsers/adminTabCatalog.
  function showTab(tabId) {
    if ($("adminTabUsers")) $("adminTabUsers").style.display = "none";
    if ($("adminTabCatalog")) $("adminTabCatalog").style.display = "none";
    if ($(tabId)) $(tabId).style.display = "block";
  }


  // =====================================================
  // ZONA 15: APERTURA DEL PANEL ADMIN
  // =====================================================
  // Función:
  // - Validar admin
  // - Abrir tab inicial
  // - Cargar usuarios
  //
  // >>> app.js llama window.AdminUI.open().
  async function open() {
    try {
      await ensureAdmin();

      showTab("adminTabUsers");
      await listUsers();
    } catch (e) {
      console.error(e);
      msg(e.message || "Error abriendo admin", true);
    }
  }


  // =====================================================
  // ZONA 16: INICIALIZACIÓN DE EVENTOS ADMIN
  // =====================================================
  // Función:
  // - Conectar botones y acciones del panel admin
  //
  // >>> Si un botón no responde, revisa aquí y el id HTML.
  function init() {
    if (isHooked) return;
    isHooked = true;

    $("adminBtnUsers")?.addEventListener("click", async () => {
      showTab("adminTabUsers");
      await listUsers();
    });

    $("adminBtnCatalog")?.addEventListener("click", async () => {
      showTab("adminTabCatalog");
      await loadCatalogToEditor();
    });

    $("adminBackHome")?.addEventListener("click", () => {
      showTab("adminTabUsers");
      window.showScreen?.("home");
    });

    $("adminRefreshUsers")?.addEventListener("click", listUsers);
    $("adminSaveCatalogJSON")?.addEventListener("click", saveCatalogFromEditor);

    $("adminAddCountry")?.addEventListener("click", quickAddCountry);
    $("adminAddState")?.addEventListener("click", quickAddState);
    $("adminAddCity")?.addEventListener("click", quickAddCity);
    $("adminAddRoute")?.addEventListener("click", quickAddRoute);
  }


  // =====================================================
  // ZONA 17: AUTOARRANQUE AL CARGAR EL DOM
  // =====================================================
  // Función:
  // - Ejecutar init() cuando el HTML ya está listo
  //
  // >>> NO BORRAR.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }


  // =====================================================
  // ZONA 18: EXPOSICIÓN GLOBAL DEL PANEL ADMIN
  // =====================================================
  // Función:
  // - Permitir uso desde otros archivos
  //
  // >>> app.js usa AdminUI.open()
  window.AdminUI = { open, listUsers, loadCatalogToEditor };
})();
