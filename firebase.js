// js/firebase.js
(function () {
  if (window.FirebaseReady) {
    console.log("Firebase ya estaba inicializado");
    return;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);

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

  window.FirebaseReady = (async () => {
    try {
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js");

      if (!window.firebase) {
        throw new Error("Firebase SDK no quedó disponible en window.firebase");
      }

      const firebaseConfig = {
        apiKey: "AIzaSyBxXQEkYMwJXMqP54UHxDogDKCf0WKqvUo",
        authDomain: "pasoreal-aa592.firebaseapp.com",
        projectId: "pasoreal-aa592",
        storageBucket: "pasoreal-aa592.firebasestorage.app",
        messagingSenderId: "1047181343053",
        appId: "1:1047181343053:web:cff5b3915654109cbb9f04"
      };

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      const auth = firebase.auth();
      const db = firebase.firestore();

      window.AUTH = auth;
      window.DB = db;
      window.FirebaseInitError = null;

      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } catch (e) {
        console.warn("Persistencia LOCAL no disponible:", e);
      }

      console.log("🔥 Firebase conectado correctamente");
      return {
        firebase,
        AUTH: auth,
        DB: db
      };
    } catch (error) {
      window.AUTH = null;
      window.DB = null;
      window.FirebaseInitError = error;

      console.error("❌ Error iniciando Firebase:", error);
      throw error;
    }
  })();
})();