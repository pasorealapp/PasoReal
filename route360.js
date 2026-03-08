// js/route360.js
let lastVideoTime = 0;
let steps = 0;
let distance = 0; // metros
let speed = 0;

let animationId = null;
let simulationRunning = false;
let elapsedTime = 0;
let hasFinished = false;

function getCurrentMode() {
  return window.APP_STATE?.mode || window.APP_MODES?.TREADMILL || "TREADMILL";
}

function resetRouteStats() {
  lastVideoTime = 0;
  steps = 0;
  distance = 0;
  elapsedTime = 0;
  hasFinished = false;
}

function updateHUD() {
  const stepsEl = document.getElementById("stepsValue");
  const distanceEl = document.getElementById("distanceValue");

  if (stepsEl) stepsEl.textContent = String(Math.round(steps));
  if (distanceEl) distanceEl.textContent = `${(distance / 1000).toFixed(2)} km`;
}

function stopSimulation() {
  simulationRunning = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function startSimulation(video) {
  if (!video) return;

  stopSimulation();
  simulationRunning = true;

  function tick() {
    if (!simulationRunning) return;

    if (!video.paused) {
      const currentTime = Number(video.currentTime) || 0;
      const delta = Math.max(0, currentTime - lastVideoTime);
      lastVideoTime = currentTime;

      const effectiveSpeed = Math.max(Number(speed) || 0, 0.5);
      const metersPerSecond = (effectiveSpeed * 1000) / 3600;
      distance += metersPerSecond * delta;

      const stepsPerMinute = effectiveSpeed * 30;
      const stepsPerSecond = stepsPerMinute / 60;
      steps += stepsPerSecond * delta;

      elapsedTime += delta;

      updateHUD();

      if (typeof window.updateMiniMap === "function") {
        window.updateMiniMap(distance);
      }
    }

    animationId = requestAnimationFrame(tick);
  }

  animationId = requestAnimationFrame(tick);
}

function buildSceneHtml(videoSrc) {
  return `
    <a-scene embedded vr-mode-ui="enabled: true">
      <a-assets>
        <video
          id="video360"
          src="${videoSrc}"
          muted
          loop
          playsinline
          webkit-playsinline
          crossorigin="anonymous"
        ></video>
      </a-assets>
      <a-camera look-controls="magicWindowTrackingEnabled: true"></a-camera>
      <a-videosphere src="#video360" rotation="0 -90 0"></a-videosphere>
    </a-scene>
  `;
}

function startRoute(route) {
  if (!route) return;

  if (!route.video) {
    alert("La ruta no tiene video configurado.");
    return;
  }

  if (!window.APP_STATE) window.APP_STATE = {};
  window.APP_STATE.currentRoute = route;
  window.APP_STATE.mode = getCurrentMode();

  resetRouteStats();
  stopSimulation();

  const container = document.getElementById("route360Container");
  if (!container) return;

  container.innerHTML = buildSceneHtml(route.video);

  if (typeof window.destroyMiniMap === "function") {
    window.destroyMiniMap();
  }

  if (typeof window.destroyFinishMap === "function") {
    window.destroyFinishMap();
  }

  if (route.geojson && typeof window.createMiniMap === "function") {
    window.createMiniMap(route.geojson);
  }

  if (typeof window.showScreen === "function") {
    window.showScreen("routeScreen");
  }

  const overlay = document.getElementById("startOverlay");
  const video = document.getElementById("video360");
  const speedControl = document.getElementById("speedControl");

  if (speedControl) {
    speedControl.value = "0";
  }
  speed = 0;

  updateHUD();

  if (!overlay) return;

  overlay.style.display = "flex";
  overlay.textContent = "Toca la pantalla para comenzar";

  overlay.onclick = async () => {
    resetRouteStats();
    updateHUD();

    if (video) {
      video.currentTime = 0;
      lastVideoTime = 0;
      video.pause();
    }

    overlay.style.display = "none";

    if (typeof window.updateMiniMap === "function") {
      window.updateMiniMap(0);
    }

    const mode = getCurrentMode();

    if (mode === (window.APP_MODES?.EXPLORER || "EXPLORER")) {
      if (video) {
        try {
          video.playbackRate = 1;
          await video.play();
        } catch (e) {
          console.warn("No se pudo reproducir video en EXPLORER:", e);
        }
      }
      return;
    }

    if (video) {
      try {
        const initialSpeed = Math.max(Number(speed) || 0, 1);
        speed = initialSpeed;

        if (speedControl && Number(speedControl.value) <= 0) {
          speedControl.value = String(initialSpeed);
        }

        video.playbackRate = initialSpeed / 4;
        await video.play();
      } catch (e) {
        console.warn("No se pudo reproducir video en TREADMILL:", e);
      }
    }

    startSimulation(video);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const speedControl = document.getElementById("speedControl");
  const finishBtn = document.getElementById("finishBtn");

  if (speedControl) {
    speedControl.addEventListener("input", async (e) => {
      speed = parseFloat(e.target.value || "0");

      const video = document.getElementById("video360");
      if (!video) return;

      const mode = getCurrentMode();

      if (mode === (window.APP_MODES?.EXPLORER || "EXPLORER")) {
        return;
      }

      if (speed <= 0) {
        video.pause();
      } else {
        try {
          video.playbackRate = speed / 4;
          await video.play();
        } catch (err) {
          console.warn("No se pudo ajustar reproducción:", err);
        }
      }

      if (typeof window.updateMiniMapIcon === "function") {
        window.updateMiniMapIcon(speed);
      }
    });
  }

  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      if (hasFinished) return;
      hasFinished = true;

      const route = window.APP_STATE?.currentRoute || null;
      const profile = window.APP_STATE?.profile || null;
      const user = window.AUTH?.currentUser || null;
      const video = document.getElementById("video360");

      if (video) video.pause();
      stopSimulation();

      if (window.StorageAPI) {
        const acc = window.StorageAPI.ensureAccountForUser?.(user, profile);

        if (acc) {
          const item = {
            sessionId: "S" + Date.now(),
            dateISO: new Date().toISOString(),
            routeId: route?.id || "unknown",
            routeName: route?.name || "Ruta",
            mode: getCurrentMode(),
            durationSec: elapsedTime,
            steps: Math.round(steps),
            distanceMeters: distance
          };

          window.StorageAPI.addHistoryItem(acc.id, item);
        }
      }

      if (typeof window.showFinishScreen === "function") {
        window.showFinishScreen(route, {
          elapsedTime,
          steps: Math.round(steps),
          distanceKm: distance / 1000
        });
      }
    });
  }
});

window.startRoute = startRoute;
window.mount360 = startRoute;
window.stopSimulation = stopSimulation;