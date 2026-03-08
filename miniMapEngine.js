// js/miniMapEngine.js
let miniMap = null;
let miniMarker = null;

let routeCoordinates = [];
let segmentDistances = [];
let cumulativeDistances = [];
let totalRouteDistance = 0;

let fullRouteLine = null;
let progressRouteLine = null;
let miniMapToggleHooked = false;

function isValidGeoJSONRoute(geojson) {
  return !!(
    geojson &&
    Array.isArray(geojson.features) &&
    geojson.features[0] &&
    geojson.features[0].geometry &&
    geojson.features[0].geometry.type === "LineString" &&
    Array.isArray(geojson.features[0].geometry.coordinates) &&
    geojson.features[0].geometry.coordinates.length >= 2
  );
}

function createMiniMap(geojson) {
  const container = document.getElementById("miniMapContainer");
  if (!container) return;

  if (!isValidGeoJSONRoute(geojson)) {
    console.warn("GeoJSON inválido para mini mapa");
    container.style.display = "none";
    destroyMiniMap();
    return;
  }

  container.style.display = "block";

  routeCoordinates = geojson.features[0].geometry.coordinates.map((coord) => [
    coord[1],
    coord[0]
  ]);

  setTimeout(() => {
    try {
      if (!routeCoordinates.length) return;

      if (miniMap) {
        miniMap.remove();
        miniMap = null;
      }

      fullRouteLine = null;
      progressRouteLine = null;
      miniMarker = null;

      miniMap = L.map("miniMap", {
        zoomControl: false,
        attributionControl: false
      }).setView(routeCoordinates[0], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(miniMap);

      fullRouteLine = L.polyline(routeCoordinates, {
        color: "#cccccc",
        weight: 5,
        opacity: 0.7
      }).addTo(miniMap);

      progressRouteLine = L.polyline([routeCoordinates[0]], {
        color: "#00c3ff",
        weight: 6
      }).addTo(miniMap);

      miniMarker = L.marker(routeCoordinates[0], {
        icon: L.divIcon({
          className: "walking-icon walking",
          html: "🚶",
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(miniMap);

      calculateSegments();
      setupMiniMapToggle();

      setTimeout(() => {
        if (miniMap) miniMap.invalidateSize();
      }, 50);
    } catch (err) {
      console.error("Error creando mini mapa:", err);
      destroyMiniMap();
    }
  }, 150);
}

function calculateSegments() {
  segmentDistances = [];
  cumulativeDistances = [];
  totalRouteDistance = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const start = routeCoordinates[i];
    const end = routeCoordinates[i + 1];
    const dist = getDistance(start[0], start[1], end[0], end[1]);

    segmentDistances.push(dist);
    totalRouteDistance += dist;
    cumulativeDistances.push(totalRouteDistance);
  }
}

function updateMiniMap(distanceMeters) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return;
  if (!progressRouteLine || !miniMarker) return;
  if (!Number.isFinite(totalRouteDistance) || totalRouteDistance <= 0) return;

  if (window.APP_STATE?.mode === window.APP_MODES?.EXPLORER) return;

  const distance = Math.max(0, Number(distanceMeters) || 0);
  if (distance <= 0) return;

  const progress = Math.min(distance, totalRouteDistance);

  let segmentIndex = 0;
  while (
    segmentIndex < cumulativeDistances.length &&
    cumulativeDistances[segmentIndex] < progress
  ) {
    segmentIndex++;
  }

  if (segmentIndex >= routeCoordinates.length - 1) {
    segmentIndex = routeCoordinates.length - 2;
  }

  const segmentStart = routeCoordinates[segmentIndex];
  const segmentEnd = routeCoordinates[segmentIndex + 1];

  const prevDistance = segmentIndex === 0 ? 0 : cumulativeDistances[segmentIndex - 1];
  const segmentLength = segmentDistances[segmentIndex] || 1;
  const segmentProgress = Math.max(
    0,
    Math.min(1, (progress - prevDistance) / segmentLength)
  );

  const lat = segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * segmentProgress;
  const lng = segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * segmentProgress;
  const currentPosition = [lat, lng];

  const progressCoords = routeCoordinates.slice(0, segmentIndex + 1);
  progressCoords.push(currentPosition);

  progressRouteLine.setLatLngs(progressCoords);
  miniMarker.setLatLng(currentPosition);
}

function updateMiniMapIcon(speed) {
  if (!miniMarker) return;

  const el = miniMarker.getElement();
  if (!el) return;

  el.innerHTML = Number(speed) > 5 ? "🏃‍♂️" : "🚶";
}

function destroyMiniMap() {
  const container = document.getElementById("miniMapContainer");
  if (container) {
    container.style.display = "none";
    container.style.width = "";
    container.style.height = "";
  }

  if (miniMap) {
    miniMap.remove();
    miniMap = null;
  }

  miniMarker = null;
  fullRouteLine = null;
  progressRouteLine = null;
  routeCoordinates = [];
  segmentDistances = [];
  cumulativeDistances = [];
  totalRouteDistance = 0;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function setupMiniMapToggle() {
  if (miniMapToggleHooked) return;

  const container = document.getElementById("miniMapContainer");
  const toggleBtn = document.getElementById("miniMapToggle");
  if (!container || !toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const isCollapsed = container.style.width === "60px";

    if (isCollapsed) {
      container.style.width = "160px";
      container.style.height = "160px";
      toggleBtn.innerText = "−";
    } else {
      container.style.width = "60px";
      container.style.height = "60px";
      toggleBtn.innerText = "+";
    }

    setTimeout(() => {
      if (miniMap) miniMap.invalidateSize();
    }, 200);
  });

  miniMapToggleHooked = true;
}

window.createMiniMap = createMiniMap;
window.updateMiniMap = updateMiniMap;
window.updateMiniMapIcon = updateMiniMapIcon;
window.destroyMiniMap = destroyMiniMap;