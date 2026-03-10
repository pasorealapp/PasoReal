// js/firebase.js

// =====================================================
// ZONA 0: CONTENEDOR GENERAL DEL ARCHIVO
// =====================================================
// Función:
// - Encapsular todo el módulo Firebase
// - Evitar contaminar el ámbito global
//
// >>> NO BORRAR el inicio ni el final.
// >>> Este archivo deja listas variables globales como:
// >>> - window.FirebaseReady
// >>> - window.AUTH
// >>> - window.DB
(function () {

  // =====================================================
  // ZONA 1: PROTECCIÓN CONTRA DOBLE INICIALIZACIÓN
  // =====================================================
  // Función:
  // - Evitar que Firebase se inicialice dos veces
  //
  // >>> NO BORRAR.
  // >>> Si este bloque detecta FirebaseReady, sale del archivo.
  // >>> Muy útil para evitar errores por scripts duplicados.
  if (window.FirebaseReady) {
    console.log("Firebase ya estaba inicializado");
    return;
  }


  // =====================================================
  // ZONA 2: CARGA DINÁMICA DE SCRIPTS FIREBASE
  // =====================================================
  // Función:
  // - Cargar scripts externos de Firebase desde la CDN
  // - Evitar volver a cargar el mismo script si ya existe
  //
  // >>> ZONA DELICADA.
  // >>> Si Firebase no carga, muchas veces el problema empieza aquí.
  // >>> TOCAR SOLO SI vas a cambiar versión de Firebase o forma de carga.
  // >>> Si un SDK falla, revisa la URL exacta del src.
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);

      // -------------------------------------------------
      // SUBZONA 2.1: si el script ya existe en el DOM
      // -------------------------------------------------
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("No se pudo cargar Firebase SDK: " + src)),
          { once: true }
        );
        return;
      }

      // -------------------------------------------------
      // SUBZONA 2.2: si el script no existe, crearlo
      // -------------------------------------------------
      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };

      script.onerror = () => {
        reject(new Error("No se pudo cargar Firebase SDK: " + src));
      };

      document.head.appendChild(script);
    });
  }


  // =====================================================
  // ZONA 3: PROMESA GLOBAL DE FIREBASE READY
  // =====================================================
  // Función:
  // - Crear una promesa global que representa:
  //   "Firebase ya terminó de cargar e inicializar"
  //
  // >>> CEREBRO PRINCIPAL DE ESTE ARCHIVO.
  // >>> auth.js y app.js dependen de esta promesa.
  // >>> NO CAMBIAR el nombre window.FirebaseReady sin cambiar todo lo demás.
  window.FirebaseReady = (async () => {
    try {

      // =================================================
      // SUBZONA 3.1: CARGA DE SDKs FIREBASE
      // =================================================
      // Función:
      // - Cargar app, auth y firestore compat
      //
      // >>> AQUÍ CAMBIAR versión de Firebase si un día la actualizas.
      // >>> Mantén consistencia: las 3 URLs deben ser de la misma versión.
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js");

      // =================================================
      // SUBZONA 3.2: VALIDACIÓN DEL OBJETO GLOBAL FIREBASE
      // =================================================
      // Función:
      // - Verificar que la librería sí haya quedado disponible
      //
      // >>> Si aquí truena, los scripts no cargaron bien.
      if (!window.firebase) {
        throw new Error("Firebase SDK no quedó disponible en window.firebase");
      }

      // =================================================
      // SUBZONA 3.3: CONFIGURACIÓN DEL PROYECTO FIREBASE
      // =================================================
      // Función:
      // - Definir credenciales públicas de conexión del proyecto
      //
      // >>> ZONA MUY DELICADA.
      // >>> TOCAR SOLO SI vas a conectar otro proyecto Firebase.
      // >>> Si pegas credenciales incorrectas, auth y firestore no funcionarán.
      const firebaseConfig = {
        apiKey: "AIzaSyBxXQEkYMwJXMqP54UHxDogDKCf0WKqvUo",
        authDomain: "pasoreal-aa592.firebaseapp.com",
        projectId: "pasoreal-aa592",
        storageBucket: "pasoreal-aa592.firebasestorage.app",
        messagingSenderId: "1047181343053",
        appId: "1:1047181343053:web:cff5b3915654109cbb9f04"
      };

      // =================================================
      // SUBZONA 3.4: INICIALIZACIÓN DE LA APP FIREBASE
      // =================================================
      // Función:
      // - Inicializar Firebase solo una vez
      //
      // >>> NO QUITAR la validación !firebase.apps.length
      // >>> Sirve para evitar doble initializeApp().
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      // =================================================
      // SUBZONA 3.5: CREACIÓN DE SERVICIOS PRINCIPALES
      // =================================================
      // Función:
      // - Crear instancias de Auth y Firestore
      //
      // >>> AQUÍ NACEN AUTH y DB.
      const auth = firebase.auth();
      const db = firebase.firestore();

      // =================================================
      // SUBZONA 3.6: EXPOSICIÓN GLOBAL DE AUTH Y DB
      // =================================================
      // Función:
      // - Guardar Auth y Firestore en window para otros archivos
      //
      // >>> auth.js usa window.AUTH
      // >>> app.js usa window.DB
      // >>> NO CAMBIAR nombres sin revisar todo.
      window.AUTH = auth;
      window.DB = db;
      window.FirebaseInitError = null;

      // =================================================
      // SUBZONA 3.7: PERSISTENCIA DE SESIÓN
      // =================================================
      // Función:
      // - Mantener sesión iniciada entre recargas/cierres del navegador
      //
      // >>> Si el usuario se sale al recargar, revisar este bloque.
      // >>> Si falla, no siempre rompe todo; solo avisa por consola.
      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } catch (e) {
        console.warn("Persistencia LOCAL no disponible:", e);
      }

      // =================================================
      // SUBZONA 3.8: FIN EXITOSO DE INICIALIZACIÓN
      // =================================================
      // Función:
      // - Confirmar que Firebase quedó conectado
      // - Devolver referencias útiles
      console.log("🔥 Firebase conectado correctamente");
      return {
        firebase,
        AUTH: auth,
        DB: db
      };

    } catch (error) {

      // =================================================
      // SUBZONA 3.9: MANEJO DE ERROR DE INICIALIZACIÓN
      // =================================================
      // Función:
      // - Limpiar globals si falló la inicialización
      // - Guardar el error para otros módulos
      //
      // >>> MUY IMPORTANTE.
      // >>> auth.js y app.js consultan window.FirebaseInitError.
      window.AUTH = null;
      window.DB = null;
      window.FirebaseInitError = error;

      console.error("❌ Error iniciando Firebase:", error);
      throw error;
    }
  })();

})();
// =====================================================
// FIN DEL ARCHIVO
// =====================================================