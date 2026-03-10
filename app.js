// js/app.js

// =====================================================
// ZONA 0: CONTENEDOR GENERAL DEL ARCHIVO
// =====================================================
// Función:
// - Encapsular todo el archivo
// - Evitar conflictos con otros scripts
//
// >>> NO BORRAR el inicio ni el cierre de esta función.
// >>> Todo app.js vive dentro de esta cápsula.
(() => {
  "use strict";

  // =====================================================
  // ZONA 1: UTILIDADES BASE
  // =====================================================
  // Función:
  // - Evitar doble arranque de la app
  // - Crear helper corto para buscar elementos HTML por id
  //
  // >>> TOCAR SOLO SI entiendes que $ se usa en casi todo el archivo.
  // >>> Puedes agregar aquí helpers pequeños reutilizables.
  let isBooted = false;

  const $ = (id) => document.getElementById(id);

  // >>> AQUÍ AGREGAR helpers simples si luego los necesitas
  // Ejemplo:
  // const hasText = (v) => String(v || "").trim().length > 0;


  // =====================================================
  // ZONA 2: ESTADO GLOBAL DE LA APP
  // =====================================================
  // Función:
  // - Crear APP_STATE si no existe
  // - Inicializar estructura mínima segura
  //
  // >>> NO BORRAR propiedades base sin revisar toda la app.
  // >>> TOCAR SOLO SI vas a agregar nuevas llaves de estado.
  // >>> Este bloque sostiene navegación, modo y ruta actual.
  function ensureAppState() {
    if (!window.APP_STATE || typeof window.APP_STATE !== "object") {
      window.APP_STATE = {};
    }

    window.APP_STATE.nav ||= {
      countryKey: null,
      stateKey: null,
      cityKey: null,
      routeKey: null
    };

    window.APP_STATE.ui ||= {
      currentScreen: "login",
      selectorOpen: false,
      menuOpen: false
    };

    if (!window.APP_STATE.mode) {
      window.APP_STATE.mode = window.APP_MODES?.TREADMILL || "TREADMILL";
    }

    if (typeof window.APP_STATE.currentRoute === "undefined") {
      window.APP_STATE.currentRoute = null;
    }

    if (typeof window.APP_STATE.lastSelectorLevel === "undefined") {
      window.APP_STATE.lastSelectorLevel = "home";
    }

    // >>> AQUÍ AGREGAR nuevas ramas globales del estado
    // Ejemplo:
    // window.APP_STATE.settings ||= { sound: true, vibration: false };
  }


  // =====================================================
  // ZONA 3: MENSAJES VISUALES DE AUTH
  // =====================================================
  // Función:
  // - Mostrar mensajes de login y registro
  //
  // >>> ZONA SEGURA para cambiar textos, color o estilo básico.
  // >>> Riesgo bajo mientras no cambies ids HTML.
  function setAuthMsg(msg, isError = false) {
    const el = $("authMsg");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#ff8a8a" : "#fff";
  }

  function setRegMsg(msg, isError = false) {
    const el = $("regMsg");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#ff8a8a" : "#fff";
  }
  
  function setForgotMsg(msg, isError = false) {
    const el = $("forgotMsg");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#ff8a8a" : "#fff";
  }

  function togglePassword(inputId, buttonId) {
    const input = $(inputId);
    const btn = $(buttonId);
    if (!input || !btn) return;

    btn.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.textContent = isPassword ? "🙈" : "👁";
    });
  }


  // =====================================================
  // ZONA 4: CAMBIO DE PANTALLAS
  // =====================================================
  // Función:
  // - Mostrar una pantalla concreta
  // - Usar showScreen() si existe
  // - Si no existe, hacerlo manualmente
  //
  // >>> TOCAR SOLO SI vas a modificar navegación entre screens.
  // >>> NO QUITES el fallback manual.
  // >>> Si algo "no aparece", muchas veces el problema está aquí o en los ids HTML.
  function safeShow(screenId) {
    if (typeof window.showScreen === "function") {
      window.showScreen(screenId);
      return;
    }

    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.remove("active");
      s.style.display = "none";
    });

    const el = $(screenId);
    if (el) {
      el.classList.add("active");
      el.style.display = "block";
    }
  }


  // =====================================================
  // ZONA 5: VIDEO DEL LOGIN
  // =====================================================
  // Función:
  // - Cargar y reproducir el video de fondo
  // - Detenerlo cuando ya no se necesita
  //
  // >>> ZONA SEGURA para cambiar comportamiento visual del video.
  // >>> NO BORRAR el catch del play() porque evita errores silenciosos.
  function loadLoginVideo() {
    const v = $("bgVideo");
    if (!v) return;

    v.muted = true;
    v.loop = true;

    const p = v.play?.();
    if (p && typeof p.catch === "function") {
      p.catch(() => {});
    }
  }

  function stopLoginVideo() {
    const v = $("bgVideo");
    if (v) v.pause();
  }


  // =====================================================
  // ZONA 6: FIREBASE READY
  // =====================================================
  // Función:
  // - Esperar a que Firebase termine de inicializar
  //
  // >>> NO BORRAR.
  // >>> TOCAR SOLO SI estás reestructurando firebase.js.
  // >>> Si sale "Firebase no está listo", revisa primero firebase.js, no este bloque.
  async function ensureFirebaseReady() {
    if (!window.FirebaseReady) {
      throw new Error("Firebase no está listo. Revisa js/firebase.js");
    }

    await window.FirebaseReady;

    if (window.FirebaseInitError) {
      throw window.FirebaseInitError;
    }
  }


  // =====================================================
  // ZONA 7: REGLAS DE MEMBRESÍA
  // =====================================================
  // Función:
  // - Preguntar si el perfil tiene membresía activa
  //
  // >>> Si cambia la lógica de membresías, probablemente empieces aquí
  // >>> o en Roles.isMembershipActive().
  function membershipIsActive(profile) {
    return !!window.Roles?.isMembershipActive?.(profile);
  }


  // =====================================================
  // ZONA 8: PERFIL DE USUARIO EN FIRESTORE
  // =====================================================
  // Función:
  // - Buscar el perfil del usuario
  // - Si no existe, crearlo
  // - Asegurar email actualizado
  //
  // >>> ZONA MUY DELICADA.
  // >>> NO CAMBIAR colección/doc sin revisar reglas y demás módulos.
  // >>> AQUÍ AGREGAR campos nuevos del perfil si se necesitan.
  // >>> Si el registro "sí crea auth pero no crea perfil", revisa aquí.
  async function getOrCreateUserProfile(user, fallback = {}) {
    await ensureFirebaseReady();

    if (!user?.uid) {
      throw new Error("Usuario inválido para perfil.");
    }

    const db = window.DB;
    if (!db) throw new Error("DB no existe");

    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();

    if (snap.exists) {
      const data = snap.data() || {};

      if (data.email !== user.email) {
        try {
          await ref.update({ email: user.email || null });
        } catch {}
      }

      return data;
    }

    const nombre = String(fallback.nombre || "").trim();
    const apellido = String(fallback.apellido || "").trim();

    const publicId = await window.Roles.generateAndReservePublicId({
      nombre,
      apellido,
      email: user.email || ""
    });

    const base = {
      uid: user.uid,
      email: user.email || null,
      nombre,
      apellido,
      publicId,
      status: "pending",
      paidUntil: null,
      createdAt: window.firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date()

      // >>> AQUÍ AGREGAR CAMPOS NUEVOS DE PERFIL
      // Ejemplo:
      // role: "user",
      // avatarUrl: null,
      // phone: null
    };

    await ref.set(base, { merge: true });
    return base;
  }


  // =====================================================
  // ZONA 9: HOME UI
  // =====================================================
  // Función:
  // - Actualizar saludo principal del home
  //
  // >>> ZONA SEGURA para cambiar copy/textos del home.
  function updateHomeTexts() {
    const profile = window.APP_STATE.profile || null;
    const user = window.APP_STATE.user || null;

    const fullName = [profile?.nombre, profile?.apellido].filter(Boolean).join(" ").trim();
    const greetingName = fullName || profile?.publicId || user?.email || "—";

    if ($("homeGreeting")) {
      $("homeGreeting").textContent = `¿Dónde quieres caminar hoy, ${greetingName}?`;
    }

    if ($("homeSubGreeting")) {
      $("homeSubGreeting").textContent = "Elige una experiencia real";
    }
  }


  // =====================================================
  // ZONA 10: PANTALLA DE MEMBRESÍA UI
  // =====================================================
  // Función:
  // - Pintar datos y mensajes en la pantalla membership
  //
  // >>> ZONA MEDIA: puedes cambiar textos y formato con cuidado.
  // >>> Si cambias ids en HTML, actualízalos aquí.
  // >>> Si la fecha sale rara, revisar paidUntil aquí.
  function fillMembershipScreen() {
    const u = window.APP_STATE.user || null;
    const p = window.APP_STATE.profile || {};
    const active = membershipIsActive(p) || !!window.APP_STATE.isAdmin;

    if ($("memberName")) {
      $("memberName").textContent = [p.nombre || "Usuario", p.apellido || ""].join(" ").trim();
    }

    if ($("memberUid")) {
      $("memberUid").textContent = `UID: ${u?.uid || "—"}`;
    }

    let paidUntilText = "No activa";

    if (p.paidUntil) {
      if (p.paidUntil.seconds) {
        paidUntilText = new Date(p.paidUntil.seconds * 1000).toLocaleDateString("es-MX");
      } else {
        const d = new Date(p.paidUntil);
        paidUntilText = Number.isNaN(d.getTime()) ? String(p.paidUntil) : d.toLocaleDateString("es-MX");
      }
    }

    if ($("memberPaidUntil")) {
      $("memberPaidUntil").textContent = `Vence: ${paidUntilText}`;
    }

    if ($("memberMsg")) {
      $("memberMsg").textContent = active
        ? "Tu membresía está activa."
        : "Tu acceso aún no está activo. Envía tu comprobante para activarlo.";
    }

    const titleEl = $("membershipTitle");
    const topTextEl = $("membershipTopText");

    if (active) {
      if (titleEl) titleEl.textContent = "✅ Membresía activa";
      if (topTextEl) {
        topTextEl.innerHTML = `
          Tu cuenta ya tiene <strong>acceso activo</strong>.
          Puedes seguir usando PasoReal normalmente mientras tu membresía esté vigente.
        `;
      }
    } else {
      if (titleEl) titleEl.textContent = "🔒 Membresía requerida";
      if (topTextEl) {
        topTextEl.innerHTML = `
          Tu cuenta está <strong>desactivada</strong> por defecto.
          Cuando hagas tu pago, envía tu comprobante y el admin activará tu acceso.
        `;
      }
    }
  }


  // =====================================================
  // ZONA 11: REFRESH DE PERFIL
  // =====================================================
  // Función:
  // - Volver a leer users/{uid}
  // - Refrescar APP_STATE.profile
  //
  // >>> Si un cambio hecho por admin no se refleja, revisar este bloque.
  async function refreshProfile() {
    await ensureFirebaseReady();

    const user = window.APP_STATE.user;
    if (!user?.uid) return null;

    const snap = await window.DB.collection("users").doc(user.uid).get();
    const profile = snap.exists ? (snap.data() || {}) : null;

    window.APP_STATE.profile = profile;
    return profile;
  }


  // =====================================================
  // ZONA 12: CATÁLOGO DINÁMICO
  // =====================================================
  // Función:
  // - Intentar leer catálogo desde Firestore
  // - Si no se puede, usar data.js
  //
  // >>> ZONA DELICADA.
  // >>> Si el catálogo no se actualiza desde admin, revisar aquí.
  // >>> Si da error, la app intenta sobrevivir usando data.js.
  async function tryLoadCatalogFromFirestore() {
    const profile = window.APP_STATE.profile || null;
    const isAdmin = !!window.APP_STATE.isAdmin;
    const canRead = isAdmin || membershipIsActive(profile);

    if (!canRead) {
      console.warn("Usuario sin membresía, usando data.js");
      return false;
    }

    try {
      const snap = await window.DB.collection("catalog").doc("v1").get();
      if (snap.exists && snap.data()?.APP_DATA) {
        window.APP_DATA = snap.data().APP_DATA;
        console.log("✅ Catálogo cargado de Firestore (catalog/v1)");
        return true;
      }
    } catch (e) {
      console.warn("No pude cargar catálogo de Firestore, usando data.js", e?.code || e);
    }

    return false;
  }


  // =====================================================
  // ZONA 13: BOTONES DE MEMBRESÍA
  // =====================================================
  // Función:
  // - WhatsApp comprobante
  // - Email comprobante
  // - Refresh membresía
  // - Logout desde membership
  //
  // >>> AQUÍ TOCAR si quieres cambiar acciones de botones membership.
  // >>> Si el botón no hace nada, revisar id HTML y este bloque.
  function setupMembershipButtons() {
    $("btnSendProofWhatsApp")?.addEventListener("click", () => {
      const cfg = window.accountConfig || {};
      const phone = cfg.adminWhatsapp || "5210000000000";
      const uid = window.APP_STATE.user?.uid || "";
      const email = window.APP_STATE.user?.email || "";
      const msg = encodeURIComponent(
        `Hola, envío comprobante de pago PasoReal.\nUID: ${uid}\nCorreo: ${email}`
      );
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    });

    $("btnSendProofEmail")?.addEventListener("click", () => {
      const cfg = window.accountConfig || {};
      const to = cfg.adminEmail || "admin@pasoreal.com";
      const uid = window.APP_STATE.user?.uid || "";
      const email = window.APP_STATE.user?.email || "";
      const subject = encodeURIComponent("Comprobante de pago PasoReal");
      const body = encodeURIComponent(`Hola,\nAdjunto comprobante.\nUID: ${uid}\nCorreo: ${email}\n`);
      window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
    });

    $("btnRefreshMembership")?.addEventListener("click", async () => {
      try {
        await refreshProfile();
        fillMembershipScreen();

        if (window.APP_STATE.isAdmin || membershipIsActive(window.APP_STATE.profile)) {
          updateHomeTexts();
          safeShow("home");
        }
      } catch {
        if ($("memberMsg")) {
          $("memberMsg").textContent = "No pude actualizar. Intenta de nuevo.";
        }
      }
    });

    $("btnLogoutFromMembership")?.addEventListener("click", async () => {
      try {
        await window.AuthAPI.logout();
      } catch {}

      safeShow("login");
      loadLoginVideo();
    });
  }


  // =====================================================
  // ZONA 14: BOTONES DEL HOME
  // =====================================================
  // Función:
  // - Elegir ruta
  // - Ir a historial
  // - Logout
  //
  // >>> Si "Elegir ruta" falla, empieza revisando este bloque.
  // >>> Aquí se decide si manda a membership o deja pasar.
  function setupHomeButtons() {
    $("btnChooseRoute")?.addEventListener("click", async () => {
      const active = window.APP_STATE.isAdmin || membershipIsActive(window.APP_STATE.profile);

      if (!active) {
        fillMembershipScreen();
        safeShow("membershipScreen");
        return;
      }

      const modes = window.accountConfig?.allowedModes || [];

      if (modes.length > 1 && !window.APP_STATE.mode) {
        alert("Por favor, selecciona un modo.");
        return;
      }

      await tryLoadCatalogFromFirestore();

      if (typeof window.openCountriesSelector === "function") {
        window.openCountriesSelector();
      } else {
        alert("Selector no está listo (revisa ui.js)");
      }
    });

    $("goToHistory")?.addEventListener("click", () => {
      safeShow("historyScreen");
      window.HistoryUI?.renderHistory?.();
    });

    $("btnLogout")?.addEventListener("click", async () => {
      try {
        await window.AuthAPI.logout();
      } catch {}

      safeShow("login");
      loadLoginVideo();
    });
  }


  // =====================================================
  // ZONA 15: LOGIN / REGISTRO
  // =====================================================
  // Función:
  // - Navegar entre login, register y forgot
  // - Iniciar sesión
  // - Recuperar contraseña
  // - Crear cuenta
  // - Activar toggle de contraseñas
  //
  // >>> ZONA MUY DELICADA.
  // >>> Si un botón no responde, revisar aquí y los ids HTML.
  // >>> Si crea auth pero no perfil, revisar getOrCreateUserProfile().
  function setupRegisterLoginNav() {

    // -------------------------------------------------
    // SUBZONA 15.1: navegación entre login y register
    // -------------------------------------------------
    $("goToRegister")?.addEventListener("click", () => safeShow("register"));
    $("goToLogin")?.addEventListener("click", () => safeShow("login"));

    // -------------------------------------------------
    // SUBZONA 15.2: abrir pantalla forgot password
    // -------------------------------------------------
    $("btnForgot")?.addEventListener("click", () => {
      setForgotMsg("");

      const loginEmail = ($("loginEmail")?.value || "").trim();
      if ($("forgotEmail") && loginEmail) {
        $("forgotEmail").value = loginEmail;
      }

      safeShow("forgotScreen");
    });

    // -------------------------------------------------
    // SUBZONA 15.3: volver de forgot a login
    // -------------------------------------------------
    $("backToLoginFromForgot")?.addEventListener("click", () => {
      safeShow("login");
    });

    // -------------------------------------------------
    // SUBZONA 15.4: enviar correo de recuperación
    // -------------------------------------------------
    $("btnSendReset")?.addEventListener("click", async () => {
      try {
        setForgotMsg("Enviando enlace...");
        const email = ($("forgotEmail")?.value || "").trim();

        if (!email) {
          return setForgotMsg("Escribe tu correo.", true);
        }

        await window.AuthAPI.sendPasswordReset(email);
        setForgotMsg("Te envié un correo para restablecer tu contraseña.");
      } catch (e) {
        setForgotMsg(window.AuthAPI.friendlyError(e), true);
      }
    });

    // -------------------------------------------------
    // SUBZONA 15.5: iniciar sesión
    // -------------------------------------------------
    $("btnLogin")?.addEventListener("click", async () => {
      try {
        setAuthMsg("Entrando...");
        const email = ($("loginEmail")?.value || "").trim();
        const pass = $("loginPassword")?.value || "";

        await window.AuthAPI.loginWithEmail(email, pass);
        setAuthMsg("");
      } catch (e) {
        setAuthMsg(window.AuthAPI.friendlyError(e), true);
      }
    });

    // -------------------------------------------------
    // SUBZONA 15.6: registrar usuario
    // -------------------------------------------------
    $("btnRegister")?.addEventListener("click", async () => {
      try {
        setRegMsg("Registrando...");

        const nombre = ($("regNombre")?.value || "").trim();
        const apellido = ($("regApellido")?.value || "").trim();
        const email = ($("regEmail")?.value || "").trim();
        const pass = $("regPassword")?.value || "";

        if (!nombre || !apellido) {
          return setRegMsg("Escribe nombre y apellido.", true);
        }

        if (!email || !pass) {
          return setRegMsg("Escribe correo y contraseña.", true);
        }

        if (!window.AuthAPI.isStrongPassword(pass)) {
          return setRegMsg(
            "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.",
            true
          );
        }

        const cred = await window.AuthAPI.registerWithEmail(email, pass);
        await getOrCreateUserProfile(cred.user, { nombre, apellido });

        await refreshProfile();

        if (window.APP_STATE?.user && window.APP_STATE?.profile) {
          try { window.MenuUI?.refresh?.(window.APP_STATE.user, window.APP_STATE.profile); } catch {}
          try { window.ProfileUI?.refresh?.(window.APP_STATE.user, window.APP_STATE.profile); } catch {}
          fillMembershipScreen();
        }

        setRegMsg("Cuenta creada ✅");
      } catch (e) {
        setRegMsg(window.AuthAPI.friendlyError(e), true);
      }
    });

    // -------------------------------------------------
    // SUBZONA 15.7: toggles de visibilidad de contraseña
    // -------------------------------------------------
    togglePassword("loginPassword", "toggleLoginPassword");
    togglePassword("regPassword", "toggleRegPassword");
  }


  // =====================================================
  // ZONA 16: ACCESO OCULTO ADMIN
  // =====================================================
  // Función:
  // - Detectar taps ocultos
  // - Validar admin
  // - Abrir adminScreen
  //
  // >>> ZONA ÚTIL si quieres cambiar cantidad de taps o tiempo.
  // >>> Si no abre admin, revisar secretFooter, Roles.isAdmin y adminScreen.
  function setupSecretAdminTap() {
    const footer = $("secretFooter");
    if (!footer) return;

    let taps = 0;
    let t0 = 0;

    footer.addEventListener("click", async () => {
      const now = Date.now();
      if (now - t0 > 1500) taps = 0;
      t0 = now;
      taps++;

      if (taps >= 7) {
        taps = 0;

        const user = window.APP_STATE.user;
        if (!user) return;

        const ok = await window.Roles.isAdmin(user.uid);
        if (!ok) return;

        await tryLoadCatalogFromFirestore();
        safeShow("adminScreen");
        window.AdminUI?.open?.();
      }
    });
  }


  // =====================================================
  // ZONA 17: ORQUESTADOR DE AUTH
  // =====================================================
  // Función:
  // - Reaccionar al login/logout real
  // - Cargar perfil
  // - Saber si es admin
  // - Refrescar UI global
  // - Mandar a home o membership
  //
  // >>> CEREBRO PRINCIPAL.
  // >>> TOCAR SOLO SI de verdad sabes qué flujo quieres cambiar.
  // >>> Si "entra pero se regresa", "no abre home", "no reconoce admin",
  // >>> normalmente el problema está aquí.
  async function handleAuthState(user) {
    console.log("=== handleAuthState INICIO ===");
    console.log("Usuario auth:", user);

    // -------------------------------------------------
    // SUBZONA 17.1: limpieza base del estado auth
    // -------------------------------------------------
    window.APP_STATE.user = user || null;
    window.APP_STATE.profile = null;
    window.APP_STATE.isAdmin = false;

    // -------------------------------------------------
    // SUBZONA 17.2: usuario no autenticado
    // -------------------------------------------------
    if (!user) {
      console.log("No hay usuario autenticado");
      safeShow("login");
      loadLoginVideo();
      return;
    }

    // -------------------------------------------------
    // SUBZONA 17.3: preparación inicial al autenticarse
    // -------------------------------------------------
    stopLoginVideo();

    try {
      // -------------------------------------------------
      // SUBZONA 17.4: cargar perfil y permisos
      // -------------------------------------------------
      console.log("1. Antes de getOrCreateUserProfile");
      const profile = await getOrCreateUserProfile(user, {});
      console.log("2. Perfil cargado/creado OK:", profile);

      console.log("3. Antes de Roles.isAdmin");
      const isAdmin = await window.Roles.isAdmin(user.uid);
      console.log("4. isAdmin OK:", isAdmin);

      // -------------------------------------------------
      // SUBZONA 17.5: guardar estado global auth
      // -------------------------------------------------
      window.APP_STATE.user = user;
      window.APP_STATE.profile = profile;
      window.APP_STATE.isAdmin = isAdmin;

      // -------------------------------------------------
      // SUBZONA 17.6: sincronías secundarias de UI/Storage
      // -------------------------------------------------
      try {
        window.StorageAPI?.ensureAccountForUser?.(user, profile);
        console.log("5. StorageAPI OK");
      } catch (e) {
        console.warn("StorageAPI error:", e);
      }

      try {
        window.MenuUI?.refresh?.(user, profile);
        console.log("6. MenuUI OK");
      } catch (e) {
        console.warn("MenuUI error:", e);
      }

      try {
        window.ProfileUI?.refresh?.(user, profile);
        console.log("7. ProfileUI OK");
      } catch (e) {
        console.warn("ProfileUI error:", e);
      }

      // -------------------------------------------------
      // SUBZONA 17.7: refresco visual principal
      // -------------------------------------------------
      updateHomeTexts();
      fillMembershipScreen();

      // -------------------------------------------------
      // SUBZONA 17.8: decisión de pantalla principal
      // -------------------------------------------------
      if (isAdmin || membershipIsActive(profile)) {
        console.log("8. Ir a home");
        safeShow("home");
      } else {
        console.log("8. Ir a membershipScreen");
        safeShow("membershipScreen");
      }

      // -------------------------------------------------
      // SUBZONA 17.9: selector de modo
      // -------------------------------------------------
      if (typeof window.renderModeSelector === "function") {
        window.renderModeSelector();
        console.log("9. renderModeSelector OK");
      }

      console.log("=== handleAuthState FIN OK ===");
    } catch (e) {
      console.error("ERROR REAL EN handleAuthState:", e);
      throw e;
    }
  }


  // =====================================================
  // ZONA 18: BOOT PRINCIPAL
  // =====================================================
  // Función:
  // - Arrancar la app una sola vez
  // - Preparar APP_STATE
  // - Conectar todos los listeners
  // - Esperar Firebase
  // - Suscribirse a cambios de auth
  //
  // >>> CEREBRO DE ARRANQUE.
  // >>> Si la app "no inicia bien", revisar aquí.
  // >>> AQUÍ AGREGAR nuevas inicializaciones generales.
  async function boot() {
    if (isBooted) return;
    isBooted = true;

    ensureAppState();
    window.APP_STATE.refreshProfile = refreshProfile;

    loadLoginVideo();

    // >>> AQUÍ SE CONECTAN LOS BLOQUES PRINCIPALES DE EVENTOS
    setupRegisterLoginNav();
    setupHomeButtons();
    setupMembershipButtons();
    setupSecretAdminTap();

    // >>> AQUÍ SE ENGANCHAN MÓDULOS SECUNDARIOS
    window.HistoryUI?.hookHistoryUI?.();

    await ensureFirebaseReady();

    // >>> AQUÍ INICIA LA ESCUCHA REAL DEL ESTADO DE AUTH
    await window.AuthAPI.onAuthStateChanged(async (user) => {
      try {
        await handleAuthState(user);
      } catch (e) {
        console.error(e);
        safeShow("login");
        loadLoginVideo();
        setAuthMsg("Error iniciando. Revisa consola.", true);
      }
    });
  }


  // =====================================================
  // ZONA 19: DISPARO AUTOMÁTICO AL CARGAR EL DOM
  // =====================================================
  // Función:
  // - Ejecutar boot() cuando el HTML ya está listo
  //
  // >>> NO BORRAR.
  // >>> Si quitas esto, la app no arrancará sola.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot().catch(console.error), { once: true });
  } else {
    boot().catch(console.error);
  }

})();
// =====================================================
// FIN DEL ARCHIVO
// =====================================================