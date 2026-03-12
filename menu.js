// js/menu.js
(() => {
  "use strict";

  let isHooked = false;

  const $ = (id) => document.getElementById(id);

  function openMenu() {
    const overlay = $("menuOverlay");
    if (overlay) overlay.style.display = "flex";

    if (window.APP_STATE?.ui) {
      window.APP_STATE.ui.menuOpen = true;
    }
  }

  function closeMenu() {
    const overlay = $("menuOverlay");
    if (overlay) overlay.style.display = "none";

    if (window.APP_STATE?.ui) {
      window.APP_STATE.ui.menuOpen = false;
    }
  }

  function refresh(user, profile) {
    const fullName = [profile?.nombre, profile?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();

    const displayName =
      fullName ||
      profile?.publicId ||
      user?.displayName ||
      user?.email ||
      "Usuario";

    const displayId =
      profile?.publicId ||
      user?.uid ||
      "—";

    if ($("menuName")) $("menuName").textContent = displayName;
    if ($("menuUid")) $("menuUid").textContent = displayId;
  }

  function init() {
    if (isHooked) return;
    isHooked = true;

    $("openMenu")?.addEventListener("click", openMenu);
    $("closeMenu")?.addEventListener("click", closeMenu);

    $("menuOverlay")?.addEventListener("click", (e) => {
      if (e.target?.id === "menuOverlay") {
        closeMenu();
      }
    });

    $("menuGoProfile")?.addEventListener("click", () => {
      closeMenu();
      window.showScreen?.("profileScreen");
      window.ProfileUI?.open?.();
    });

    $("menuGoHistory")?.addEventListener("click", () => {
      closeMenu();
      window.showScreen?.("historyScreen");
      window.HistoryUI?.renderHistory?.();
    });

    $("menuGoMembership")?.addEventListener("click", () => {
      closeMenu();
      window.showScreen?.("membershipScreen");
    });

    $("menuLogout")?.addEventListener("click", async () => {
      closeMenu();

      try {
        await window.AuthAPI?.logout?.();
      } catch (err) {
        console.warn("No se pudo cerrar sesión:", err);
      }

      if ($("menuName")) $("menuName").textContent = "Usuario";
      if ($("menuUid")) $("menuUid").textContent = "—";

      window.showScreen?.("login");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.MenuUI = { refresh, openMenu, closeMenu };
})();
