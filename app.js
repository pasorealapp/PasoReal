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

// Variables globales
let currentRoute = null;
let lastRoutesScreen = null;
let currentEstado = null;

// Variables para manejo de permisos iOS
let motionPermissionGranted = false;
let isIOS = false;

// ================================
// DETECCIÓN Y MANEJO DE iOS
// ================================

// Función para detectar iOS
function detectIOS() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isWebKit = 'WebkitAppearance' in document.documentElement.style;
  
  return (isIOSDevice || isSafari || isWebKit);
}

// Función para verificar si necesita permisos
function needsMotionPermission() {
  if (!isIOS) return false;
  return typeof DeviceMotionEvent !== 'undefined' && 
         typeof DeviceMotionEvent.requestPermission === 'function';
}

// Función para mostrar/ocultar overlay de permisos
function showIOSPermissionOverlay(show) {
  const overlay = document.getElementById('iosPermissionOverlay');
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

// Configurar A-Frame para iOS
function configureAFrameForIOS() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  
  scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
  
  const camera = document.querySelector('a-camera');
  if (camera) {
    camera.setAttribute('look-controls', {
      enabled: true,
      touchEnabled: true,
      mouseEnabled: true,
      pointerLockEnabled: false
    });
  }
}

// Solicitar permisos de movimiento
async function requestMotionPermission() {
  try {
    if (typeof DeviceMotionEvent.requestPermission !== 'function') {
      return 'unsupported';
    }
    
    const response = await DeviceMotionEvent.requestPermission();
    
    if (response === 'granted') {
      motionPermissionGranted = true;
      
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          await DeviceOrientationEvent.requestPermission();
        } catch (orientationErr) {
          console.warn('⚠️ No se pudo obtener permiso de orientación:', orientationErr);
        }
      }
      
      configureAFrameForIOS();
      return 'granted';
    } else {
      return 'denied';
    }
  } catch (error) {
    console.error('❌ Error solicitando permiso de movimiento:', error);
    return 'error';
  }
}

// ================================
// INICIO DE VIDEO CON PERMISOS iOS
// ================================
async function startVideoWithPermissions() {
  console.log('🎬 Iniciando video con manejo de permisos...');
  
  isIOS = detectIOS();
  console.log(`📱 Es iOS: ${isIOS}`);
  
  if (isIOS) {
    configureAFrameForIOS();
    
    if (needsMotionPermission()) {
      console.log('📱 iOS detectado, necesita permisos de movimiento');
      
      setTimeout(() => {
        showIOSPermissionOverlay(true);
        
        const enableBtn = document.getElementById('enableMotion');
        const skipBtn = document.getElementById('skipMotion');
        
        if (enableBtn) {
          enableBtn.onclick = async () => {
            console.log('📱 Solicitando permiso de movimiento...');
            const result = await requestMotionPermission();
            
            if (result === 'granted') {
              showIOSPermissionOverlay(false);
              console.log('✅ Permiso concedido, video 360° activado');
              
              if (malecon360.paused) {
                try {
                  await malecon360.play();
                  videoStarted = true;
                } catch (e) {
                  console.error('❌ Error iniciando video:', e);
                }
              }
            } else {
              alert('Para la experiencia 360° completa, necesitas conceder permisos de movimiento.');
            }
          };
        }
        
        if (skipBtn) {
          skipBtn.onclick = () => {
            console.log('📱 Usuario omitió permisos 360°');
            showIOSPermissionOverlay(false);
            setupManualControls();
          };
        }
      }, 1000);
    }
  } else {
    showIOSPermissionOverlay(false);
    const scene = document.querySelector('a-scene');
    if (scene) {
      scene.setAttribute('vr-mode-ui', 'enabled: true');
    }
  }
}

// ================================
// VARIABLES GLOBALES
// ================================
const login    = document.getElementById("login");
const register = document.getElementById("register");
const recover  = document.getElementById("recover");
const home     = document.getElementById("home");
const states   = document.getElementById("states");

// ================================
// VIDEO DE FONDO LOGIN
// ================================
const bgVideo = document.getElementById("bgVideo");

function loadLoginVideo() {
  if (!bgVideo) return;
  if (bgVideo.src) return;

  bgVideo.src =
    "https://customer-cw0heb9gadqlxjsv.cloudflarestream.com/f456f64d303feeb7969b16dfa9c83ca4/manifest/video.m3u8";

  bgVideo.style.display = "block";
  bgVideo.play().catch(() => {});
}

function stopLoginVideo() {
  if (!bgVideo) return;

  bgVideo.pause();
  bgVideo.removeAttribute("src");
  bgVideo.load();
  bgVideo.style.display = "none";
}

// ================================
// NAVEGACIÓN LOGIN
// ================================
document.getElementById("goRegisterBtn").onclick = () => {
  login.classList.remove("active");
  register.classList.add("active");
  loadLoginVideo();
};

document.getElementById("goLoginBtn").onclick = () => {
  register.classList.remove("active");
  login.classList.add("active");
  loadLoginVideo();
};

document.getElementById("recoverBtn").onclick = () => {
  login.classList.remove("active");
  recover.classList.add("active");
  loadLoginVideo();
};

document.getElementById("cancelRecoverBtn").onclick = () => {
  recover.classList.remove("active");
  login.classList.add("active");
  loadLoginVideo();
};

// ================================
// LOGIN CORRECTO → HOME
// ================================
document.querySelector("#login .primary").onclick = () => {
  login.classList.remove("active");
  home.classList.add("active");
  stopLoginVideo();
};

// ================================
// LOGOUT → LOGIN
// ================================
document.querySelector(".logout-btn").onclick = () => {
  home.classList.remove("active");
  login.classList.add("active");
  loadLoginVideo();
};

// ================================
// HOME → STATES
// ================================
document.querySelector(".primary-card").onclick = () => {
  home.classList.remove("active");
  states.classList.add("active");
};

document.getElementById("backHomeFromStates").onclick = () => {
  states.classList.remove("active");
  home.classList.add("active");
};

// ================================
// INICIO AUTOMÁTICO
// ================================
if (login.classList.contains("active")) {
  loadLoginVideo();
}

// ================================
// SISTEMA DE NAVEGACIÓN JERÁRQUICO
// ================================

// Configuración completa de navegación
const navegacionCompleta = {
  estados: {
    "Aguascalientes": { 
      id: "aguascalientes", 
      back: "backToStatesFromAgs"
    },
    
    "Baja California": { 
      id: "bajaCalifornia", 
      back: "backToStatesFromBC",
      estadoKey: "baja_california",
      municipios: {
        "Tijuana": { 
          id: "tijuanaRutas", 
          back: "backToBCFromTijuana",
          rutas: true
        },
        "Mexicali": { id: "mexicaliRutas", back: "backToBCFromMexicali" },
        "Ensenada": { id: "ensenadaRutas", back: "backToBCFromEnsenada" },
        "Tecate": { id: "tecateRutas", back: "backToBCFromTecate" },
        "Playas de Rosarito": { id: "rosaritoRutas", back: "backToBCFromRosarito" },
        "San Quintín": { id: "sanQuintinRutas", back: "backToBCFromSanQuintin" },
        "San Felipe": { id: "sanFelipeRutas", back: "backToBCFromSanFelipe" }
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
            },
            "Todos Santos": { 
              id: "todosSantosRutas", 
              back: "backToLaPazZonasFromTodosSantos" 
            }
          }
        },
        "Los Cabos": { 
          id: "losCabos", 
          back: "backToBCSFromLosCabos",
          zonas: {
            "Cabo San Lucas": { 
              id: "caboSanLucasRutas", 
              back: "backToLosCabosFromCSL" 
            },
            "San José del Cabo": { 
              id: "sanJoseDelCaboRutas", 
              back: "backToLosCabosFromSJC" 
            }
          }
        },
        "Comondú": { id: "comonduRutas", back: "backToBCSFromComondu" },
        "Loreto": { id: "loretoRutas", back: "backToBCSFromLoreto" },
        "Mulegé": { id: "mulegeRutas", back: "backToBCSFromMulege" }
      }
    },
    
    // Configuración para los demás estados...
    "Campeche": { id: "campeche", back: "backToStatesFromCampeche" },
    "Chiapas": { id: "chiapas", back: "backToStatesFromChiapas" },
    "Chihuahua": { id: "chihuahua", back: "backToStatesFromChihuahua" },
    "Ciudad de México": { id: "cdmx", back: "backToStatesFromCDMX" },
    "Coahuila": { id: "coahuila", back: "backToStatesFromCoahuila" },
    "Colima": { id: "colima", back: "backToStatesFromColima" },
    "Durango": { id: "durango", back: "backToStatesFromDurango" },
    "Estado de México": { id: "edomex", back: "backToStatesFromEdomex" },
    "Guanajuato": { id: "guanajuato", back: "backToStatesFromGuanajuato" },
    "Guerrero": { id: "guerrero", back: "backToStatesFromGuerrero" },
    "Hidalgo": { id: "hidalgo", back: "backToStatesFromHidalgo" },
    "Jalisco": { id: "jalisco", back: "backToStatesFromJalisco" },
    "Michoacán": { id: "michoacan", back: "backToStatesFromMichoacan" },
    "Morelos": { id: "morelos", back: "backToStatesFromMorelos" },
    "Nayarit": { id: "nayarit", back: "backToStatesFromNayarit" },
    "Nuevo León": { id: "nuevoLeon", back: "backToStatesFromNuevoLeon" },
    "Oaxaca": { id: "oaxaca", back: "backToStatesFromOaxaca" },
    "Puebla": { id: "puebla", back: "backToStatesFromPuebla" },
    "Querétaro": { id: "queretaro", back: "backToStatesFromQueretaro" },
    "Quintana Roo": { id: "quintanaRoo", back: "backToStatesFromQuintanaRoo" },
    "San Luis Potosí": { id: "sanLuisPotosi", back: "backToStatesFromSLP" },
    "Sinaloa": { id: "sinaloa", back: "backToStatesFromSinaloa" },
    "Sonora": { id: "sonora", back: "backToStatesFromSonora" },
    "Tabasco": { id: "tabasco", back: "backToStatesFromTabasco" },
    "Tamaulipas": { id: "tamaulipas", back: "backToStatesFromTamaulipas" },
    "Tlaxcala": { id: "tlaxcala", back: "backToStatesFromTlaxcala" },
    "Veracruz": { id: "veracruz", back: "backToStatesFromVeracruz" },
    "Yucatán": { id: "yucatan", back: "backToStatesFromYucatan" },
    "Zacatecas": { id: "zacatecas", back: "backToStatesFromZacatecas" }
  }
};

// Función para configurar navegación
function configurarNavegacion(config, nivel = "states", padre = null) {
  Object.entries(config).forEach(([nombre, info]) => {
    const { id, back, estadoKey } = info;
    
    // Configurar navegación hacia adelante
    document.querySelectorAll(`#${nivel} .option-card`).forEach(card => {
      if (card.innerText.trim() === nombre) {
        card.onclick = () => {
          document.querySelector(`#${nivel}`).classList.remove("active");
          document.getElementById(id).classList.add("active");
          
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
          document.getElementById(id).classList.remove("active");
          document.querySelector(`#${nivel}`).classList.add("active");
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

// Inicializar navegación
configurarNavegacion(navegacionCompleta.estados);

// ================================
// CONFIGURACIÓN DE BOTONES DE RUTAS
// ================================

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

// ================================
// RUTAS DE VIDEO - VARIABLES
// ================================
const maleconLaPazRuta = document.getElementById("maleconLaPazRuta");
const malecon360  = document.getElementById("malecon360");
const videoSphere = document.getElementById("videoSphere");
const speedRange  = document.getElementById("speedRange");
const speedValue  = document.getElementById("speedValue");
const endRouteBtn = document.getElementById("endRoute");
const stepsValue    = document.getElementById("stepsValue");
const distanceValue = document.getElementById("distanceValue");

let hls = null;
let videoReady = false;
let videoStarted = false;
let finishMap = null;
let leafletMap = null;
let routeLine = null;

// ================================
// INICIAR CUALQUIER RUTA
// ================================
function startRoute(routeKey, estado) {
  if (!RUTAS[estado]) {
    console.error(`Estado no encontrado en RUTAS: ${estado}`);
    return;
  }
  
  if (!RUTAS[estado][routeKey]) {
    console.error(`Ruta no encontrada: ${routeKey} en estado ${estado}`);
    return;
  }
  
  currentRoute = RUTAS[estado][routeKey];
  currentEstado = estado;

  const currentScreen = document.querySelector('.screen.active');
  if (currentScreen) {
    currentScreen.classList.remove("active");
  }
  
  maleconLaPazRuta.classList.add("active");

  // Reset métricas
  steps = 0;
  distance = 0;
  elapsedSeconds = 0;
  videoReady = false;
  videoStarted = false;

  videoSphere.removeAttribute("src");
  speedRange.value = 0;
  speedValue.textContent = "0";

  initHLS(currentRoute.video);
  
  setTimeout(() => {
    startVideoWithPermissions();
  }, 500);
  
  initMiniMap();
}

// ================================
// HLS INIT
// ================================
function initHLS(videoUrl) {
  if (!Hls.isSupported()) {
    console.error("HLS no soportado");
    
    if (malecon360.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('📱 Usando HLS nativo de iOS');
      malecon360.src = videoUrl;
      
      malecon360.oncanplay = () => {
        videoReady = true;
        console.log("✅ Video listo (canplay - iOS nativo)");
      };
      
      malecon360.onended = () => {
        goToRouteFinish();
      };
      
      return;
    }
    
    return;
  }

  if (hls) {
    hls.destroy();
    hls = null;
  }

  hls = new Hls({ 
    lowLatencyMode: true,
    enableWorker: true
  });
  
  hls.loadSource(videoUrl);
  hls.attachMedia(malecon360);

  malecon360.oncanplay = () => {
    videoReady = true;
    console.log("✅ Video listo (canplay)");
  };

  malecon360.onended = () => {
    goToRouteFinish();
  };
}

// ================================
// CONTROLES TÁCTILES MANUALES (para iOS sin permisos)
// ================================
let isDraggingVideo = false;
let lastTouchX = 0;
let currentRotationY = -90;

function setupManualControls() {
  const videoContainer = document.querySelector('.video-container');
  if (!videoContainer) return;
  
  videoContainer.style.cursor = 'grab';
  
  videoContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
  videoContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  videoContainer.addEventListener('touchend', handleTouchEnd);
  
  console.log('👆 Controles táctiles manuales habilitados');
  
  // Mostrar instrucciones
  const instructions = document.createElement('div');
  instructions.id = 'touchInstructions';
  instructions.style.cssText = `
    position: absolute;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 10px;
    text-align: center;
    z-index: 1000;
    font-size: 14px;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  instructions.innerHTML = '👆 Desliza para girar la vista 360°';
  
  videoContainer.appendChild(instructions);
  
  setTimeout(() => {
    instructions.style.opacity = '0';
    setTimeout(() => {
      if (instructions.parentNode) {
        instructions.parentNode.removeChild(instructions);
      }
    }, 1000);
  }, 5000);
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    isDraggingVideo = true;
    lastTouchX = e.touches[0].clientX;
    e.preventDefault();
  }
}

function handleTouchMove(e) {
  if (!isDraggingVideo || e.touches.length !== 1) return;
  
  const touchX = e.touches[0].clientX;
  const deltaX = touchX - lastTouchX;
  currentRotationY += deltaX * 0.5;
  
  const videoSphere = document.getElementById('videoSphere');
  if (videoSphere) {
    videoSphere.setAttribute('rotation', `0 ${currentRotationY} 0`);
  }
  
  lastTouchX = touchX;
  e.preventDefault();
}

function handleTouchEnd() {
  isDraggingVideo = false;
}

// ================================
// CAMINADORA / VELOCIDAD
// ================================
speedRange.addEventListener("input", async () => {
  const speed = Number(speedRange.value);
  speedValue.textContent = speed;

  if (!videoReady) return;

  if (speed === 0) {
    malecon360.pause();
    return;
  }

  if (!videoStarted) {
    try {
      await malecon360.play();
      videoSphere.setAttribute("src", "#malecon360");
      videoSphere.setAttribute("rotation", "0 -90 0");
      videoStarted = true;
    } catch (e) {
      console.error("No se pudo iniciar video", e);
      return;
    }
  }

  malecon360.playbackRate = speed / 3;
});

// ================================
// GAME LOGIC
// ================================
let steps = 0;
let distance = 0;
let lastTime = null;
const STEP_KM = 0.00075;
let elapsedSeconds = 0;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  const speed = parseFloat(speedRange.value);

  if (speed > 0 && videoStarted) {
    elapsedSeconds += delta;

    const kmThisFrame = (speed / 3600) * delta;
    distance += kmThisFrame;
    steps += kmThisFrame / STEP_KM;

    stepsValue.textContent = Math.floor(steps);
    distanceValue.textContent = distance.toFixed(2);
    updateMiniMap(distance);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// ================================
// MINI MAPA
// ================================
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

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  const { start } = currentRoute;

  leafletMap = L.map("minileafletMap", {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false
  }).setView(start, 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(leafletMap);

  routeLine = L.polyline([start], {
    color: "#0ea5e9",
    weight: 4,
    lineCap: "round"
  }).addTo(leafletMap);

  setTimeout(() => leafletMap.invalidateSize(), 200);
}

// ================================
// ARRASTRAR MINIMAPA
// ================================
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

const miniMap = document.querySelector(".mini-map");

if (miniMap) {
  miniMap.addEventListener("touchstart", e => {
    isDragging = true;
    const touch = e.touches[0];
    offsetX = touch.clientX - miniMap.offsetLeft;
    offsetY = touch.clientY - miniMap.offsetTop;
  });

  miniMap.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const touch = e.touches[0];
    miniMap.style.left = touch.clientX - offsetX + "px";
    miniMap.style.top = touch.clientY - offsetY + "px";
    miniMap.style.right = "auto";
  });

  miniMap.addEventListener("touchend", () => {
    isDragging = false;
  });
}

const closeBtn = document.querySelector(".map-close");
if (closeBtn) {
  closeBtn.onclick = () => {
    miniMap.style.display = "none";
  };
}

// ================================
// FINALIZAR RUTA
// ================================
function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

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

function goToRouteFinish() {
  if (!currentRoute) return;

  malecon360.pause();
  maleconLaPazRuta.classList.remove("active");

  document.getElementById("finishSteps").innerText = Math.floor(steps);
  document.getElementById("finishDistance").innerText = distance.toFixed(2) + " km";
  document.getElementById("finishTime").innerText = formatTime(elapsedSeconds);
  
  const routeNameElement = document.querySelector("#routeFinish .route-summary .summary-row:last-child strong");
  if (routeNameElement) {
    routeNameElement.textContent = currentRoute.name;
  }
  
  if (currentRoute.achievement) {
    document.getElementById("achievementTitle").textContent = currentRoute.achievement.title;
    document.getElementById("achievementDesc").textContent = currentRoute.achievement.description;
  }

  const finishScreen = document.getElementById("routeFinish");
  finishScreen.classList.add("active");

  setTimeout(() => {
    renderFinishMap(distance);
  }, 300);
}

endRouteBtn.addEventListener("click", () => {
  goToRouteFinish();
});

function renderFinishMap(distanceKm) {
  const mapContainer = document.getElementById("leafletMap");
  if (!mapContainer || !currentRoute) return;

  mapContainer.style.height = "220px";
  mapContainer.style.width = "100%";

  const { start, end, maxKm } = currentRoute;
  const progress = Math.min(distanceKm / maxKm, 1);

  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;
  const endPoint = [lat, lng];

  if (window.finishMap) {
    window.finishMap.remove();
    window.finishMap = null;
  }

  window.finishMap = L.map("leafletMap", {
    zoomControl: false,
    attributionControl: false
  }).setView(start, 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
  }).addTo(window.finishMap);

  const line = L.polyline([start, endPoint], {
    color: "#0ea5e9",
    weight: 6,
    lineCap: "round"
  }).addTo(window.finishMap);
  
  L.marker(start, { icon: startIcon })
    .addTo(window.finishMap)
    .bindPopup("Inicio");

  L.marker(endPoint, { icon: endIcon })
    .addTo(window.finishMap)
    .bindPopup("Fin del recorrido");

  window.finishMap.fitBounds(line.getBounds(), {
    padding: [30, 30]
  });

  setTimeout(() => {
    window.finishMap.invalidateSize();
  }, 100);
}

// ================================
// NAVEGACIÓN RUTA FINALIZADA
// ================================
document.getElementById("backToRoutes").onclick = () => {
  const finishScreen = document.getElementById("routeFinish");
  finishScreen.classList.remove("active");
  
  if (lastRoutesScreen && document.getElementById(lastRoutesScreen)) {
    document.getElementById(lastRoutesScreen).classList.add("active");
  } else {
    states.classList.add("active");
  }
};

document.getElementById("repeatRoute").onclick = () => {
  const finishScreen = document.getElementById("routeFinish");
  finishScreen.classList.remove("active");
  
  steps = 0;
  distance = 0;
  elapsedSeconds = 0;
  videoReady = false;
  videoStarted = false;
  
  maleconLaPazRuta.classList.add("active");
  
  setTimeout(() => {
    if (currentRoute) {
      initHLS(currentRoute.video);
      initMiniMap();
    }
  }, 100);
};

// ================================
// INICIALIZACIÓN
// ================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 PasoReal cargado');
  isIOS = detectIOS();
  console.log(`📱 Plataforma: ${isIOS ? 'iOS' : 'No iOS'}`);
});