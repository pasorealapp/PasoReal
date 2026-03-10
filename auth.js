// js/auth.js

// =====================================================
// ZONA 0: CONTENEDOR GENERAL DEL ARCHIVO
// =====================================================
// Función:
// - Encapsular el módulo auth
// - Evitar contaminar el ámbito global
//
// >>> NO BORRAR el inicio ni el final.
// >>> Este archivo termina exponiendo window.AuthAPI.
(function () {

  // =====================================================
  // ZONA 1: VALIDACIÓN BÁSICA DE FIREBASE
  // =====================================================
  // Función:
  // - Verificar que exista window.FirebaseReady
  //
  // >>> Si falla aquí, normalmente el problema está en js/firebase.js.
  // >>> Esto no espera Firebase todavía; solo valida que exista la base.
  function ensureFirebase() {
    if (!window.FirebaseReady) {
      throw new Error("Firebase no está listo. Revisa js/firebase.js");
    }
  }


  // =====================================================
  // ZONA 2: NORMALIZACIÓN DE CORREO
  // =====================================================
  // Función:
  // - Limpiar espacios
  // - Convertir a minúsculas
  //
  // >>> ZONA SEGURA.
  // >>> Muy útil para evitar errores por mayúsculas y espacios.
  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }


  // =====================================================
  // ZONA 3: VALIDACIÓN DE CONTRASEÑA FUERTE
  // =====================================================
  // Función:
  // - Verificar que la contraseña cumpla reglas mínimas:
  //   - 8 caracteres o más
  //   - 1 minúscula
  //   - 1 mayúscula
  //   - 1 número
  //   - 1 carácter especial
  //
  // >>> ZONA IMPORTANTE para el registro.
  // >>> Si quieres cambiar la fuerza requerida, empieza aquí.
  // >>> Esta validación es local, antes de mandar a Firebase.
  function isStrongPassword(password) {
    const value = String(password || "");
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
  }


  // =====================================================
  // ZONA 4: TRADUCTOR DE ERRORES AMIGABLES
  // =====================================================
  // Función:
  // - Convertir errores técnicos a mensajes claros para el usuario
  // - Incluir el caso especial de contraseña débil personalizada
  //
  // >>> ZONA SEGURA para personalizar mensajes.
  // >>> AQUÍ AGREGAR nuevos códigos si aparecen.
  // >>> Si un error se ve feo o técnico, revisa aquí.
  function friendlyError(err) {
    const code = err?.code || "";
    const message = err?.message || "";

    if (message.includes("PASSWORD_WEAK_CUSTOM")) {
      return "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.";
    }

    if (code.includes("auth/invalid-email")) return "Correo inválido.";
    if (code.includes("auth/wrong-password")) return "Contraseña incorrecta.";
    if (code.includes("auth/user-not-found")) return "No existe una cuenta con ese correo.";
    if (code.includes("auth/email-already-in-use")) return "Ese correo ya está registrado.";
    if (code.includes("auth/weak-password")) return "Contraseña débil.";
    if (code.includes("auth/missing-password")) return "Ingresa tu contraseña.";
    if (code.includes("auth/too-many-requests")) return "Demasiados intentos. Intenta más tarde.";
    if (code.includes("auth/network-request-failed")) return "Error de red. Revisa tu conexión.";
    if (code.includes("auth/invalid-login-credentials")) return "Correo o contraseña incorrectos.";
    if (code.includes("permission-denied")) return "Permiso denegado.";

    return err?.message || "Ocurrió un error.";
  }


  // =====================================================
  // ZONA 5: ESPERA SEGURA DE FIREBASE AUTH
  // =====================================================
  // Función:
  // - Esperar a que Firebase termine de inicializar
  // - Validar que AUTH exista
  // - Lanzar error claro si algo salió mal
  //
  // >>> ZONA DELICADA.
  // >>> Todas las acciones auth pasan por aquí primero.
  // >>> Si AUTH sale undefined, revisar js/firebase.js.
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


  // =====================================================
  // ZONA 6: API PÚBLICA DE AUTENTICACIÓN
  // =====================================================
  // Función:
  // - Exponer funciones globales usadas por otros archivos
  //
  // >>> CEREBRO PÚBLICO DE ESTE ARCHIVO.
  // >>> app.js depende de estos métodos.
  // >>> NO CAMBIAR nombres sin revisar dependencias.
  window.AuthAPI = {
    friendlyError,
    isStrongPassword,

    // =================================================
    // SUBZONA 6.1: INIT DE AUTH STATE
    // =================================================
    // Función:
    // - Esperar Firebase Auth
    // - Conectar listener de usuario autenticado
    //
    // >>> TOCAR SOLO SI cambias la forma de escuchar auth state.
    async init(onUser) {
      await waitReady();

      if (typeof onUser !== "function") {
        throw new Error("onUser debe ser una función.");
      }

      return window.AUTH.onAuthStateChanged(onUser);
    },

    // =================================================
    // SUBZONA 6.2: ALIAS onAuthStateChanged
    // =================================================
    // Función:
    // - Mantener una forma clara de invocar el listener
    //
    // >>> Solo llama a init().
    async onAuthStateChanged(onUser) {
      return this.init(onUser);
    },

    // =================================================
    // SUBZONA 6.3: REGISTRO CON EMAIL Y PASSWORD
    // =================================================
    // Función:
    // - Limpiar correo
    // - Validar correo y contraseña
    // - Verificar fuerza de contraseña
    // - Crear cuenta en Firebase Auth
    //
    // >>> ZONA MUY IMPORTANTE.
    // >>> Aquí está la nueva regla de contraseña fuerte.
    // >>> OJO: esto solo crea auth, no el perfil Firestore.
    async registerWithEmail(email, password) {
      await waitReady();

      const cleanEmail = normalizeEmail(email);
      const cleanPassword = String(password || "");

      if (!cleanEmail) throw new Error("Ingresa tu correo.");
      if (!cleanPassword) throw new Error("Ingresa tu contraseña.");

      if (!isStrongPassword(cleanPassword)) {
        throw new Error("PASSWORD_WEAK_CUSTOM");
      }

      return window.AUTH.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
    },

    // =================================================
    // SUBZONA 6.4: LOGIN CON EMAIL Y PASSWORD
    // =================================================
    // Función:
    // - Limpiar correo
    // - Validar email y password
    // - Iniciar sesión con Firebase Auth
    //
    // >>> Si no entra login, revisar aquí y js/firebase.js.
    async loginWithEmail(email, password) {
      await waitReady();

      const cleanEmail = normalizeEmail(email);
      const cleanPassword = String(password || "");

      if (!cleanEmail) throw new Error("Ingresa tu correo.");
      if (!cleanPassword) throw new Error("Ingresa tu contraseña.");

      return window.AUTH.signInWithEmailAndPassword(cleanEmail, cleanPassword);
    },

    // =================================================
    // SUBZONA 6.5: LOGOUT
    // =================================================
    // Función:
    // - Cerrar sesión actual
    //
    // >>> ZONA SIMPLE.
    async logout() {
      await waitReady();
      return window.AUTH.signOut();
    },

    // =================================================
    // SUBZONA 6.6: RECUPERACIÓN DE CONTRASEÑA
    // =================================================
    // Función:
    // - Enviar correo de recuperación
    //
    // >>> Si el usuario dice que no le llega el correo, revisa aquí.
    async sendPasswordReset(email) {
      await waitReady();

      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail) throw new Error("Ingresa tu correo para recuperar tu contraseña.");

      return window.AUTH.sendPasswordResetEmail(cleanEmail);
    }
  };

})();
// =====================================================
// FIN DEL ARCHIVO
// =====================================================