// js/router.js
// Router simple por pantallas

(function () {
  const SCREEN_IDS = [
    "login",
    "register",
    "forgotScreen",
    "home",
    "membershipScreen",
    "profileScreen",
    "historyScreen",
    "selector",
    "routeScreen",
    "finishScreen",
    "adminScreen"
  ];

  function getScreen(id) {
    return document.getElementById(id);
  }

  function hideAllScreens() {
    SCREEN_IDS.forEach((id) => {
      const el = getScreen(id);
      if (!el) return;
      el.classList.remove("active");
      el.style.display = "none";
    });
  }

  function showScreen(screenId) {
    hideAllScreens();

    const screen = getScreen(screenId);
    if (!screen) {
      console.warn("Pantalla no encontrada:", screenId);
      return false;
    }

    screen.style.display = "block";
    screen.classList.add("active");

    if (window.APP_STATE?.ui) {
      window.APP_STATE.ui.currentScreen = screenId;
    }

    return true;
  }

  function getCurrentScreen() {
    return window.APP_STATE?.ui?.currentScreen || null;
  }

  window.showScreen = showScreen;
  window.hideAllScreens = hideAllScreens;
  window.getCurrentScreen = getCurrentScreen;
})();
