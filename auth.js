// js/auth.js
(function () {
  function ensureFirebase() {
    if (!window.FirebaseReady) {
      throw new Error("Firebase no está listo. Revisa js/firebase.js");
    }
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function friendlyError(err) {
    const code = err?.code || "";

    if (code.includes("auth/invalid-email")) return "Correo inválido.";
    if (code.includes("auth/wrong-password")) return "Contraseña incorrecta.";
    if (code.includes("auth/user-not-found")) return "No existe una cuenta con ese correo.";
    if (code.includes("auth/email-already-in-use")) return "Ese correo ya está registrado.";
    if (code.includes("auth/weak-password")) return "Contraseña débil (mínimo 6 caracteres).";
    if (code.includes("auth/missing-password")) return "Ingresa tu contraseña.";
    if (code.includes("auth/too-many-requests")) return "Demasiados intentos. Intenta más tarde.";
    if (code.includes("auth/network-request-failed")) return "Error de red. Revisa tu conexión.";
    if (code.includes("auth/invalid-login-credentials")) return "Correo o contraseña incorrectos.";
    if (code.includes("permission-denied")) return "Permiso denegado (Firestore Rules).";

    return err?.message || "Ocurrió un error.";
  }

  async function waitReady() {
    ensureFirebase();

    try {
      await window.FirebaseReady;
    } catch (err) {
      throw window.FirebaseInitError || err || new Error("Firebase no pudo inicializar.");
    }

    if (window.FirebaseInitError) {
      throw window.FirebaseInitError;
    }

    if (!window.AUTH) {
      throw new Error("Firebase AUTH no inicializado.");
    }
  }

  window.AuthAPI = {
    friendlyError,

    async init(onUser) {
      await waitReady();

      if (typeof onUser !== "function") {
        throw new Error("onUser debe ser una función.");
      }

      return window.AUTH.onAuthStateChanged(onUser);
    },

    async onAuthStateChanged(onUser) {
      return this.init(onUser);
    },

    async registerWithEmail(email, password) {
      await waitReady();

      const cleanEmail = normalizeEmail(email);
      const cleanPassword = String(password || "");

      if (!cleanEmail) throw new Error("Ingresa tu correo.");
      if (!cleanPassword) throw new Error("Ingresa tu contraseña.");
      if (cleanPassword.length < 6) {
        throw new Error("Contraseña débil (mínimo 6 caracteres).");
      }

      return window.AUTH.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
    },

    async loginWithEmail(email, password) {
      await waitReady();

      const cleanEmail = normalizeEmail(email);
      const cleanPassword = String(password || "");

      if (!cleanEmail) throw new Error("Ingresa tu correo.");
      if (!cleanPassword) throw new Error("Ingresa tu contraseña.");

      return window.AUTH.signInWithEmailAndPassword(cleanEmail, cleanPassword);
    },

    async logout() {
      await waitReady();
      return window.AUTH.signOut();
    },

    async sendPasswordReset(email) {
      await waitReady();

      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail) throw new Error("Ingresa tu correo para recuperar tu contraseña.");

      return window.AUTH.sendPasswordResetEmail(cleanEmail);
    }
  };
})();