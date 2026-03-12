// js/variables.js
// Estado global mínimo centralizado (sin frameworks)

window.APP_MODES = Object.freeze({
  TREADMILL: "TREADMILL",
  EXPLORER: "EXPLORER"
});

window.APP_STATE = {
  mode: window.APP_MODES.TREADMILL,

  nav: {
    countryKey: null,
    stateKey: null,
    cityKey: null,
    routeKey: null
  },

  currentRoute: null,

  lastSelectorLevel: "home", // home | countries | states | cities | routes

  ui: {
    currentScreen: "login",
    selectorOpen: false,
    menuOpen: false
  },

  session: {
    user: null,
    isAdmin: false,
    isMemberActive: false
  },

  routeProgress: {
    startedAt: null,
    finishedAt: null,
    steps: 0,
    distanceKm: 0,
    durationSec: 0
  }
};
