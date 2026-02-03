// AL INICIO DEL ARCHIVO app.js, después de las variables globales:

// ================================
// BLOQUEO TOTAL DE ZOOM
// ================================
document.addEventListener('wheel', function(e) {
  if (e.ctrlKey) {
    e.preventDefault();
    return false;
  }
}, { passive: false });

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) || e.key === 'F11') {
    e.preventDefault();
    return false;
  }
});

// También prevenir el zoom táctil en desktop
document.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('gesturestart', function(e) {
  e.preventDefault();
});


// ================================
// CONFIGURACIÓN DE RUTAS POR ESTADO (UNIFICADO)
// ================================

// OBJETO ÚNICO DE RUTAS
const RUTAS = {
  // BAJA CALIFORNIA
  baja_california: {
    tijuanaRevolucion: {
      name: "Av. Revolución",
      video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/TU_VIDEO_TIJUANA_1/manifest/video.m3u8",
      start: [32.5331, -117.0382],
      end: [32.5348, -117.0361],
      maxKm: 1.4,
      achievement: {
        title: "Explorador de Tijuana",
        description: "Recorrido completado por la Avenida Revolución"
      }
    },

    tijuanaPlayas: {
      name: "Playas de Tijuana",
      video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/TU_VIDEO_TIJUANA_2/manifest/video.m3u8",
      start: [32.5280, -117.1236],
      end: [32.5260, -117.1200],
      maxKm: 2.0,
      achievement: {
        title: "Caminante del Pacífico",
        description: "Recorrido completado en Playas de Tijuana"
      }
    },

    tijuanaCentro: {
      name: "Centro de Tijuana",
      video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/TU_VIDEO_TIJUANA_3/manifest/video.m3u8",
      start: [32.5310, -117.0390],
      end: [32.5335, -117.0365],
      maxKm: 1.2,
      achievement: {
        title: "Corazón de Tijuana",
        description: "Recorrido completado por el centro de la ciudad"
      }
    }
  },

  // BAJA CALIFORNIA SUR
  baja_california_sur: {
    maleconLaPaz: {
      name: "Malecón de La Paz",
      video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/8aa913ae75d3814cce9a27bd280d2c4a/manifest/video.m3u8",
      start: [24.15555, -110.3224],
      end: [24.1679, -110.3091],
      maxKm: 3,
      achievement: {
        title: "Explorador del Malecón",
        description: "Primera caminata completada en el Malecón de La Paz"
      }
    },

    centroHistorico: {
      name: "Centro Histórico",
      video: "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/8aa913ae75d3814cce9a27bd280d2c4a/manifest/video.m3u8",
      start: [24.1605, -110.3128],
      end: [24.1630, -110.3095],
      maxKm: 1.2,
      achievement: {
        title: "Explorador del Centro Histórico",
        description: "Recorrido completado por el Centro Histórico"
      }
    }
  }
};




// ================================
// VARIABLES GLOBALES
// ================================
let currentRoute = null;
let currentEstado = null;
let lastRoutesScreen = null;

let login, register, recover, home, states;
let bgVideo;

let maleconLaPazRuta, malecon360, videoSphere;
let speedRange, speedValue;
let startBtn, pauseBtn, endRouteBtn;
let stepsValue, distanceValue;

let hls = null;
let videoReady = false;
let videoStarted = false;

// Métricas
let steps = 0;
let distance = 0;
let elapsedSeconds = 0;
let lastTime = null;
const STEP_KM = 0.00075;

// iOS
let isIOS = false;

// ================================
// UTILIDADES
// ================================
function checkOrientation() {
  const overlay = document.getElementById("rotateOverlay");
  if (!overlay) return;

  if (window.innerWidth < window.innerHeight) {
    // Vertical
    overlay.style.display = "flex";
  } else {
    // Horizontal
    overlay.style.display = "none";
  }
}


function detectIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function hideTapOverlay() {
  const tap = document.getElementById("tapToStart");
  if (tap) tap.style.display = "none";
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ================================
// INICIALIZAR ELEMENTOS
// ================================
function initElements() {
  login = document.getElementById("login");
  register = document.getElementById("register");
  recover = document.getElementById("recover");
  home = document.getElementById("home");
  states = document.getElementById("states");

  bgVideo = document.getElementById("bgVideo");

  maleconLaPazRuta = document.getElementById("maleconLaPazRuta");
  malecon360 = document.getElementById("malecon360");
  videoSphere = document.getElementById("videoSphere");

  speedRange = document.getElementById("speedRange");
  speedValue = document.getElementById("speedValue");

  startBtn = document.getElementById("startRoute");
  pauseBtn = document.getElementById("pauseRoute");
  endRouteBtn = document.getElementById("endRoute");

  stepsValue = document.getElementById("stepsValue");
  distanceValue = document.getElementById("distanceValue");
}

// ================================
// LOGIN VIDEO
// ================================
function loadLoginVideo() {
  if (!bgVideo || bgVideo.src) return;
  bgVideo.src = "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/f456f64d303feeb7969b16dfa9c83ca4/manifest/video.m3u8";
  bgVideo.style.display = "block";
  bgVideo.play().catch(()=>{});
}

function stopLoginVideo() {
  if (!bgVideo) return;
  bgVideo.pause();
  bgVideo.removeAttribute("src");
  bgVideo.load();
  bgVideo.style.display = "none";
}

// ================================
// NAVEGACIÓN SIMPLE (LOGIN)
// ================================
function setupLogin() {
  document.querySelector("#login .primary").onclick = () => {
    login.classList.remove("active");
    home.classList.add("active");
    stopLoginVideo();
  };

  document.querySelector(".logout-btn").onclick = () => {
    home.classList.remove("active");
    login.classList.add("active");
    loadLoginVideo();
  };

  document.querySelector(".primary-card").onclick = () => {
    home.classList.remove("active");
    states.classList.add("active");
  };

  document.getElementById("backHomeFromStates").onclick = () => {
    states.classList.remove("active");
    home.classList.add("active");
  };
}

// ================================
// NAVEGACIÓN JERÁRQUICA DE ESTADOS
// ================================

// Configuración de navegación
const navegacionCompleta = {
  estados: {
    "Baja California": { 
      id: "bajaCalifornia", 
      back: "backToStatesFromBC",
      estadoKey: "baja_california",
      municipios: {
        "Tijuana": { 
          id: "tijuanaRutas", 
          back: "backToBCFromTijuana",
          rutas: true
        }
      }
    },
    
    "Baja California Sur": { 
      id: "bajaCaliforniaSur", 
      back: "backToStatesFromBCS",
      estadoKey: "baja_california_sur",
      municipios: {
        "La Paz": { 
          id: "laPazZonas", 
          back: "backToBCSFromLaPazZonas",
          zonas: {
            "La Paz (Ciudad)": { 
              id: "laPazCiudadRutas", 
              back: "backToLaPazZonasFromCiudad",
              rutas: true
            }
          }
        }
      }
    }
  }
};

// Función para configurar navegación
function configurarNavegacion(config, nivel = "states", padre = null) {
  Object.entries(config).forEach(([nombre, info]) => {
    const { id, back, estadoKey } = info;
    
    // Configurar navegación hacia adelante
    const cards = document.querySelectorAll(`#${nivel} .option-card`);
    cards.forEach(card => {
      if (card.innerText.trim() === nombre) {
        card.onclick = () => {
          const currentScreen = document.querySelector(`#${nivel}`);
          const targetScreen = document.getElementById(id);
          
          if (currentScreen) currentScreen.classList.remove("active");
          if (targetScreen) targetScreen.classList.add("active");
          
          if (info.rutas) {
            lastRoutesScreen = id;
            currentEstado = estadoKey || padre;
          }
        };
      }
    });
    
    // Configurar botón de regreso
    if (back) {
      const backBtn = document.getElementById(back);
      if (backBtn) {
        backBtn.onclick = () => {
          const targetScreen = document.getElementById(id);
          const parentScreen = document.querySelector(`#${nivel}`);
          
          if (targetScreen) targetScreen.classList.remove("active");
          if (parentScreen) parentScreen.classList.add("active");
        };
      }
    }
    
    // Configurar niveles inferiores
    if (info.municipios) {
      configurarNavegacion(info.municipios, id, estadoKey);
    }
    
    if (info.zonas) {
      configurarNavegacion(info.zonas, id, estadoKey);
    }
  });
}

// ================================
// CONFIGURACIÓN DE BOTONES DE RUTAS
// ================================
function setupRouteButtons() {
  // Tijuana
  const tijuanaRutasConfig = {
    "Av. Revolución": { id: "goToTijuanaRevolucion", rutaKey: "tijuanaRevolucion" },
    "Playas de Tijuana": { id: "goToTijuanaPlayas", rutaKey: "tijuanaPlayas" },
    "Centro de Tijuana": { id: "goToTijuanaCentro", rutaKey: "tijuanaCentro" }
  };

  Object.entries(tijuanaRutasConfig).forEach(([rutaNombre, config]) => {
    const btn = document.getElementById(config.id);
    if (btn) {
      btn.onclick = () => {
        startRoute(config.rutaKey, "baja_california");
      };
    }
  });

  // La Paz
  const laPazRutasConfig = {
    "Malecón de La Paz": { id: "goToMalecon", rutaKey: "maleconLaPaz" },
    "Centro Histórico": { id: "goToCentro", rutaKey: "centroHistorico" }
  };

  Object.entries(laPazRutasConfig).forEach(([rutaNombre, config]) => {
    const btn = document.getElementById(config.id);
    if (btn) {
      btn.onclick = () => {
        startRoute(config.rutaKey, "baja_california_sur");
      };
    }
  });
}

// ================================
// INICIAR RUTA (ÚNICO PUNTO)
// ================================
function startRoute(routeKey, estado) {
  if (!RUTAS[estado] || !RUTAS[estado][routeKey]) return;

  currentRoute = RUTAS[estado][routeKey];
  currentEstado = estado;

  lastRoutesScreen = document.querySelector(".screen.active")?.id || null;

  document.querySelectorAll(".screen.active").forEach(s => s.classList.remove("active"));
  maleconLaPazRuta.classList.add("active");

  steps = 0;
  distance = 0;
  elapsedSeconds = 0;
  videoReady = false;
  videoStarted = false;

  speedRange.value = 0;
  speedValue.textContent = "0";
  
  // ✅ SOLUCIÓN 1: Ocultar overlay de "toca para iniciar" al entrar a la ruta
  hideTapOverlay();

  initHLS(currentRoute.video);
  initMiniMap();

  // ✅ SOLUCIÓN 1 (seguro): Ocultar después de un pequeño delay para asegurar
  setTimeout(() => {
    hideTapOverlay();
  }, 100);
}

// ================================
// HLS / VIDEO
// ================================
function initHLS(url) {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (Hls.isSupported() && !isIOS) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(malecon360);
  } else {
    malecon360.src = url;
  }

  // ✅ SOLUCIÓN 2: Configuración esencial para iOS
  malecon360.muted = true;
  malecon360.playsInline = true; // ✅ Impide que Safari iOS tome control completo
  malecon360.load();
  
  setTimeout(() => {
  if (!videoReady) videoReady = true;
}, 800);

  malecon360.onloadeddata = () => {
    videoReady = true;
  };

  malecon360.onended = goToRouteFinish;
}

// ================================
// BOTÓN INICIAR (CLAVE iOS)
// ================================


// ================================
// CONTROLES
// ================================
function setupControls() {
  speedRange.addEventListener("input", async () => {
  const speed = Number(speedRange.value);
  speedValue.textContent = speed;

  // ⛔ si está en 0, pausamos
  if (speed === 0) {
    if (!malecon360.paused) malecon360.pause();
    return;
  }

  // ✅ PRIMER GESTO = INICIAR VIDEO
  if (!videoStarted && videoReady) {
    try {
      malecon360.muted = true;
      await malecon360.play();

      videoSphere.setAttribute("src", "#malecon360");
      videoSphere.setAttribute("rotation", "0 -90 0");

      malecon360.muted = false;
      videoStarted = true;

      hideTapOverlay(); // ⬅️ MUY IMPORTANTE
    } catch (e) {
      console.warn("Esperando gesto válido", e);
      return;
    }
  }

  // 🎚️ controlar velocidad
  malecon360.playbackRate = speed / 3;
});

  endRouteBtn.onclick = goToRouteFinish;
}

// ================================
// MINI MAPA
// ================================
let leafletMap = null;
let routeLine = null;

function updateMiniMap(distanceKm) {
  if (!leafletMap || !routeLine || !currentRoute) return;

  const { start, end, maxKm } = currentRoute;
  const progress = Math.min(distanceKm / maxKm, 1);

  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;

  routeLine.setLatLngs([start, [lat, lng]]);
  leafletMap.setView([lat, lng], 16);
}

function initMiniMap() {
  if (!currentRoute) return;

  // Limpiar mapa anterior
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  const mapContainer = document.getElementById("minileafletMap");
  if (!mapContainer) return;

  const { start } = currentRoute;

  leafletMap = L.map("minileafletMap", {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false
  }).setView(start, 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(leafletMap);

  routeLine = L.polyline([start], {
    color: "#0ea5e9",
    weight: 4,
    lineCap: "round"
  }).addTo(leafletMap);
}

// ================================
// GAME LOOP
// ================================
function gameLoop(ts) {
  if (!lastTime) lastTime = ts;
  const delta = (ts - lastTime) / 1000;
  lastTime = ts;

  if (videoStarted && !malecon360.paused) {
    elapsedSeconds += delta;
    const km = (Number(speedRange.value) / 3600) * delta;
    distance += km;
    steps += km / STEP_KM;

    stepsValue.textContent = Math.floor(steps);
    distanceValue.textContent = distance.toFixed(2);
    updateMiniMap(distance);
  }

  requestAnimationFrame(gameLoop);
}

// ================================
// FINALIZAR RUTA
// ================================
function goToRouteFinish() {
  malecon360.pause();
  maleconLaPazRuta.classList.remove("active");

  document.getElementById("finishSteps").innerText = Math.floor(steps);
  document.getElementById("finishDistance").innerText = distance.toFixed(2) + " km";
  document.getElementById("finishTime").innerText = formatTime(elapsedSeconds);

  // Actualizar nombre de la ruta
  if (currentRoute) {
    const routeNameElement = document.querySelector("#routeFinish .route-summary .summary-row:last-child strong");
    if (routeNameElement) {
      routeNameElement.textContent = currentRoute.name;
    }
    
    // Actualizar logro si existe
    if (currentRoute.achievement) {
      const achievementTitle = document.getElementById("achievementTitle");
      const achievementDesc = document.getElementById("achievementDesc");
      if (achievementTitle) achievementTitle.textContent = currentRoute.achievement.title;
      if (achievementDesc) achievementDesc.textContent = currentRoute.achievement.description;
    }
  }

  document.getElementById("routeFinish").classList.add("active");
  
  // Renderizar mapa final
  setTimeout(() => {
    renderFinishMap(distance);
  }, 300);
}

// ================================
// MAPA FINAL
// ================================
let finishMap = null;

function renderFinishMap(distanceKm) {
  const mapContainer = document.getElementById("leafletMap");
  if (!mapContainer || !currentRoute) return;

  const { start, end, maxKm } = currentRoute;
  const progress = Math.min(distanceKm / maxKm, 1);

  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;
  const endPoint = [lat, lng];

  // Limpiar mapa anterior
  if (finishMap) {
    finishMap.remove();
    finishMap = null;
  }

  finishMap = L.map("leafletMap", {
    zoomControl: false,
    attributionControl: false
  }).setView(start, 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(finishMap);

  // Iconos para marcadores
  const startIcon = L.divIcon({
    className: "start-pin",
    html: "🟢",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const endIcon = L.divIcon({
    className: "end-pin",
    html: "🔴",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const line = L.polyline([start, endPoint], {
    color: "#0ea5e9",
    weight: 6,
    lineCap: "round"
  }).addTo(finishMap);
  
  L.marker(start, { icon: startIcon })
    .addTo(finishMap)
    .bindPopup("Inicio");

  L.marker(endPoint, { icon: endIcon })
    .addTo(finishMap)
    .bindPopup("Fin del recorrido");

  finishMap.fitBounds(line.getBounds(), {
    padding: [30, 30]
  });
}

// ================================
// NAVEGACIÓN RUTA FINALIZADA
// ================================
function setupFinishNavigation() {
  const backToRoutes = document.getElementById("backToRoutes");
  const repeatRoute = document.getElementById("repeatRoute");

  if (backToRoutes) {
    backToRoutes.onclick = () => {
      const finishScreen = document.getElementById("routeFinish");
      if (finishScreen) finishScreen.classList.remove("active");
      
      if (lastRoutesScreen && document.getElementById(lastRoutesScreen)) {
        document.getElementById(lastRoutesScreen).classList.add("active");
      } else if (states) {
        states.classList.add("active");
      }
    };
  }

  if (repeatRoute) {
    repeatRoute.onclick = () => {
      const finishScreen = document.getElementById("routeFinish");
      if (finishScreen) finishScreen.classList.remove("active");
      
      steps = 0;
      distance = 0;
      elapsedSeconds = 0;
      videoReady = false;
      videoStarted = false;
      
      if (maleconLaPazRuta) {
        maleconLaPazRuta.classList.add("active");
      }
      
      setTimeout(() => {
        if (currentRoute) {
          initHLS(currentRoute.video);
          initMiniMap();
        }
      }, 100);
    };
  }
}

// ================================
// INIT
// ================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Detectar iOS
  isIOS = detectIOS();
  
  // 2. Inicializar elementos
  initElements();
  
  // 3. Configurar navegación
  setupLogin();
  configurarNavegacion(navegacionCompleta.estados);
  setupRouteButtons();
  
  // 4. Configurar controles
  
  setupControls();
  setupFinishNavigation();
  
  // 5. Iniciar game loop
  requestAnimationFrame(gameLoop);
  
  // 6. Cargar video de login si está activo
  if (login && login.classList.contains("active")) {
    loadLoginVideo();
  }
  // 🔄 orientación
  checkOrientation();
  window.addEventListener("resize", checkOrientation);
  window.addEventListener("orientationchange", checkOrientation);
  
  
});