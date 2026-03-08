// js/finish.js
let finishMap = null;
let finishHooked = false;

function hasValidRouteGeoJSON(route) {
  return !!(
    route &&
    route.geojson &&
    Array.isArray(route.geojson.features) &&
    route.geojson.features[0] &&
    route.geojson.features[0].geometry &&
    route.geojson.features[0].geometry.type === "LineString" &&
    Array.isArray(route.geojson.features[0].geometry.coordinates) &&
    route.geojson.features[0].geometry.coordinates.length >= 2
  );
}

function destroyFinishMap() {
  if (finishMap) {
    finishMap.remove();
    finishMap = null;
  }
}

function renderFinishMap(route) {
  const el = document.getElementById("finishMap");
  if (!el) return;

  destroyFinishMap();

  if (!hasValidRouteGeoJSON(route)) {
    console.warn("Ruta sin GeoJSON válido para finishMap");
    return;
  }

  const coords = route.geojson.features[0].geometry.coordinates.map((c) => [c[1], c[0]]);

  finishMap = L.map("finishMap", {
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(finishMap);

  const line = L.polyline(coords, {
    color: "#0ea5e9",
    weight: 5
  }).addTo(finishMap);

  finishMap.fitBounds(line.getBounds(), { padding: [10, 10] });

  setTimeout(() => {
    if (finishMap) finishMap.invalidateSize();
  }, 250);
}

function showFinishScreen(route, stats = {}) {
  window.showScreen?.("finishScreen");

  const elapsedTime = Number(stats.elapsedTime) || 0;
  const steps = Math.round(Number(stats.steps) || 0);
  const distanceKm = Number(stats.distanceKm) || 0;

  const formatTime =
    window.Utils?.formatTime ||
    ((sec) => {
      const s = Math.max(0, Math.floor(Number(sec) || 0));
      const m = Math.floor(s / 60);
      return `${m}:${String(s % 60).padStart(2, "0")}`;
    });

  const subtitleEl = document.getElementById("finishSubtitle");
  const timeEl = document.getElementById("finishTime");
  const stepsEl = document.getElementById("finishSteps");
  const distanceEl = document.getElementById("finishDistance");
  const routeEl = document.getElementById("finishRoute");
  const achievementTitleEl = document.getElementById("finishAchievementTitle");
  const achievementDescEl = document.getElementById("finishAchievementDesc");

  if (subtitleEl) {
    subtitleEl.textContent = `Has finalizado tu recorrido por ${route?.name || "la ruta seleccionada"}.`;
  }

  if (timeEl) timeEl.textContent = formatTime(elapsedTime);
  if (stepsEl) stepsEl.textContent = String(steps);
  if (distanceEl) distanceEl.textContent = `${distanceKm.toFixed(2)} km`;
  if (routeEl) routeEl.textContent = route?.name || "—";

  const title = route?.achievement?.title || "Logro desbloqueado";
  const desc = route?.achievement?.description || "¡Buen trabajo!";

  if (achievementTitleEl) achievementTitleEl.textContent = title;
  if (achievementDescEl) achievementDescEl.textContent = desc;

  setTimeout(() => {
    try {
      renderFinishMap(route);
    } catch (e) {
      console.warn("Finish map error:", e);
    }
  }, 50);
}

function hookFinishButtons() {
  if (finishHooked) return;
  finishHooked = true;

  document.getElementById("backToRoutes")?.addEventListener("click", async () => {
    try {
      destroyFinishMap();

      if (typeof window.tryLoadCatalogFromFirestore === "function") {
        await window.tryLoadCatalogFromFirestore();
      }

      if (typeof window.openCountriesSelector === "function") {
        window.openCountriesSelector();
      } else {
        window.showScreen?.("home");
      }
    } catch (e) {
      console.error("Error al volver a rutas:", e);
      window.showScreen?.("home");
    }
  });

  document.getElementById("repeatRoute")?.addEventListener("click", () => {
    try {
      const route = window.APP_STATE?.currentRoute || null;
      destroyFinishMap();

      if (route && typeof window.startRoute === "function") {
        window.startRoute(route);
      } else {
        window.showScreen?.("home");
      }
    } catch (e) {
      console.error("Error al repetir recorrido:", e);
      window.showScreen?.("home");
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hookFinishButtons, { once: true });
} else {
  hookFinishButtons();
}

window.showFinishScreen = showFinishScreen;
window.renderFinishMap = renderFinishMap;
window.destroyFinishMap = destroyFinishMap;