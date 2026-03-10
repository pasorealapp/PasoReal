// js/profile.js
(() => {
  "use strict";

  let isHooked = false;

  const $ = (id) => document.getElementById(id);

  function setMsg(text, isError = false) {
    const el = $("profileMsg");
    if (!el) return;

    el.textContent = text || "";
    el.style.color = isError ? "#ff8a8a" : "#fff";
  }

  function normalizeNumber(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }

  function refresh(user, profile) {
    if ($("profileEmail")) $("profileEmail").textContent = user?.email || "—";
    if ($("profilePublicId")) $("profilePublicId").textContent = profile?.publicId || user?.uid || "—";

    if ($("profileNombre")) $("profileNombre").value = profile?.nombre || "";
    if ($("profileApellido")) $("profileApellido").value = profile?.apellido || "";
    if ($("profileTelefono")) $("profileTelefono").value = profile?.telefono || "";
    if ($("profileEdad")) $("profileEdad").value = profile?.edad ?? "";
    if ($("profilePeso")) $("profilePeso").value = profile?.peso ?? "";
    if ($("profileAltura")) $("profileAltura").value = profile?.altura ?? "";
  }

  function open() {
    setMsg("");

    const u = window.APP_STATE?.user || null;
    const p = window.APP_STATE?.profile || null;

    if (!u) {
      setMsg("No hay sesión activa.", true);
      return;
    }

    refresh(u, p);
  }

  async function save() {
    try {
      setMsg("Guardando...");

      if (!window.Roles?.ensureReady) {
        throw new Error("Roles.ensureReady no existe. Revisa js/roles.js y js/router.js");
      }

      await window.Roles.ensureReady();

      const u = window.APP_STATE?.user;
      if (!u) {
        setMsg("No hay sesión activa.", true);
        return;
      }

      const payload = {
        nombre: ($("profileNombre")?.value || "").trim(),
        apellido: ($("profileApellido")?.value || "").trim(),
        telefono: ($("profileTelefono")?.value || "").trim(),
        edad: normalizeNumber($("profileEdad")?.value),
        peso: normalizeNumber($("profilePeso")?.value),
        altura: normalizeNumber($("profileAltura")?.value),
        updatedAt: window.firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString()
      };

      await window.DB.collection("users").doc(u.uid).set(payload, { merge: true });

      if (typeof window.APP_STATE?.refreshProfile === "function") {
        await window.APP_STATE.refreshProfile();
      } else {
        window.APP_STATE = window.APP_STATE || {};
        window.APP_STATE.profile = {
          ...(window.APP_STATE.profile || {}),
          ...payload
        };
      }

      refresh(window.APP_STATE?.user || u, window.APP_STATE?.profile || payload);
      window.MenuUI?.refresh?.(window.APP_STATE?.user || u, window.APP_STATE?.profile || payload);

      setMsg("Perfil guardado ✅");
    } catch (e) {
      console.error("Error guardando perfil:", e);
      setMsg(e?.message || "No pude guardar el perfil.", true);
    }
  }

  function init() {
    if (isHooked) return;
    isHooked = true;

    $("saveProfile")?.addEventListener("click", save);
    $("backToHomeFromProfile")?.addEventListener("click", () => {
      window.showScreen?.("home");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.ProfileUI = { open, refresh, save };
})();