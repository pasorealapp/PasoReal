// js/app.js
(() => {
  "use strict";

  let isBooted = false;

  const $ = (id) => document.getElementById(id);

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
  }

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

  async function ensureFirebaseReady() {
    if (!window.FirebaseReady) {
      throw new Error("Firebase no está listo. Revisa js/firebase.js");
    }

    await window.FirebaseReady;

    if (window.FirebaseInitError) {
      throw window.FirebaseInitError;
    }
  }

  function membershipIsActive(profile) {
    return !!window.Roles?.isMembershipActive?.(profile);
  }

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
    };

    await ref.set(base, { merge: true });
    return base;
  }

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

  async function refreshProfile() {
    await ensureFirebaseReady();

    const user = window.APP_STATE.user;
    if (!user?.uid) return null;

    const snap = await window.DB.collection("users").doc(user.uid).get();
    const profile = snap.exists ? (snap.data() || {}) : null;

    window.APP_STATE.profile = profile;
    return profile;
  }

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

  function setupRegisterLoginNav() {
    $("goToRegister")?.addEventListener("click", () => safeShow("register"));
    $("goToLogin")?.addEventListener("click", () => safeShow("login"));

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

    $("btnForgot")?.addEventListener("click", async () => {
      try {
        const email = ($("loginEmail")?.value || "").trim();
        if (!email) {
          return setAuthMsg("Escribe tu correo primero.", true);
        }

        await window.AuthAPI.sendPasswordReset(email);
        setAuthMsg("Te envié un correo para restablecer tu contraseña.");
      } catch (e) {
        setAuthMsg(window.AuthAPI.friendlyError(e), true);
      }
    });

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

        const cred = await window.AuthAPI.registerWithEmail(email, pass);
        await getOrCreateUserProfile(cred.user, { nombre, apellido });

        setRegMsg("Cuenta creada ✅");
      } catch (e) {
        setRegMsg(window.AuthAPI.friendlyError(e), true);
      }
    });
  }

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

  async function handleAuthState(user) {
  console.log("=== handleAuthState INICIO ===");
  console.log("Usuario auth:", user);

  window.APP_STATE.user = user || null;
  window.APP_STATE.profile = null;
  window.APP_STATE.isAdmin = false;

  if (!user) {
    console.log("No hay usuario autenticado");
    safeShow("login");
    loadLoginVideo();
    return;
  }

  stopLoginVideo();

  try {
    console.log("1. Antes de getOrCreateUserProfile");
    const profile = await getOrCreateUserProfile(user, {});
    console.log("2. Perfil cargado/creado OK:", profile);

    console.log("3. Antes de Roles.isAdmin");
    const isAdmin = await window.Roles.isAdmin(user.uid);
    console.log("4. isAdmin OK:", isAdmin);

    window.APP_STATE.user = user;
    window.APP_STATE.profile = profile;
    window.APP_STATE.isAdmin = isAdmin;

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

    updateHomeTexts();
    fillMembershipScreen();

    if (isAdmin || membershipIsActive(profile)) {
      console.log("8. Ir a home");
      safeShow("home");
    } else {
      console.log("8. Ir a membershipScreen");
      safeShow("membershipScreen");
    }

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

  async function boot() {
    if (isBooted) return;
    isBooted = true;

    ensureAppState();
    window.APP_STATE.refreshProfile = refreshProfile;

    loadLoginVideo();

    setupRegisterLoginNav();
    setupHomeButtons();
    setupMembershipButtons();
    setupSecretAdminTap();

    window.HistoryUI?.hookHistoryUI?.();

    await ensureFirebaseReady();

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => boot().catch(console.error), { once: true });
  } else {
    boot().catch(console.error);
  }
})();
