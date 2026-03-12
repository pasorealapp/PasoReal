// js/roles.js

// =====================================================
// ZONA 0: CONTENEDOR GENERAL DEL ARCHIVO
// =====================================================
// Función:
// - Encapsular el módulo de roles/permisos
// - Evitar contaminar el ámbito global
//
// >>> NO BORRAR el inicio ni el final.
// >>> Este archivo expone window.Roles.
(function () {

  // =====================================================
  // ZONA 1: ESPERA SEGURA DE FIRESTORE
  // =====================================================
  // Función:
  // - Esperar a que Firebase termine de iniciar
  // - Verificar que no haya error de init
  // - Verificar que DB exista
  //
  // >>> ZONA MUY DELICADA.
  // >>> Casi todas las funciones de Roles dependen de esto.
  // >>> Si falla aquí, el problema suele venir de firebase.js.
  async function waitDb() {
    if (!window.FirebaseReady) {
      throw new Error("FirebaseReady no existe.");
    }

    await window.FirebaseReady;

    if (window.FirebaseInitError) {
      throw window.FirebaseInitError;
    }

    if (!window.DB) {
      throw new Error("DB no inicializado.");
    }
  }


  // =====================================================
  // ZONA 2: CONVERSIÓN DE paidUntil A MILISEGUNDOS
  // =====================================================
  // Función:
  // - Tomar profile.paidUntil en varios formatos
  // - Convertirlo a milisegundos comparables
  //
  // >>> ZONA CLAVE para membresía.
  // >>> Si la membresía sale vencida cuando no debería,
  // >>> o la fecha sale rara, revisa aquí.
  function parsePaidUntilMs(profile) {
    const v = profile?.paidUntil;

    if (!v) return 0;

    // -------------------------------------------------
    // SUBZONA 2.1: Firestore Timestamp
    // -------------------------------------------------
    if (typeof v === "object" && typeof v.seconds === "number") {
      return v.seconds * 1000;
    }

    // -------------------------------------------------
    // SUBZONA 2.2: Date nativo
    // -------------------------------------------------
    if (v instanceof Date) {
      return v.getTime();
    }

    // -------------------------------------------------
    // SUBZONA 2.3: número ya en milisegundos
    // -------------------------------------------------
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }

    // -------------------------------------------------
    // SUBZONA 2.4: string parseable (ISO u otro válido)
    // -------------------------------------------------
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : 0;
  }


  // =====================================================
  // ZONA 3: CÁLCULO DE DÍAS RESTANTES
  // =====================================================
  // Función:
  // - Calcular cuántos días le quedan a la membresía
  //
  // >>> Si quieres mostrar "te quedan X días", esta es la base.
  function daysLeft(profile) {
    const diff = parsePaidUntilMs(profile) - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }


  // =====================================================
  // ZONA 4: GENERADOR BASE DE publicId
  // =====================================================
  // Función:
  // - Limpiar nombre/apellido
  // - Quitar acentos y símbolos
  // - Crear una base segura para publicId
  //
  // >>> ZONA SEGURA para ajustar estilo del publicId.
  // >>> Si quieres IDs más cortos o distintos, empieza aquí.
  function slugifyPublicId(text) {
    return String(text || "usuario")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
      .slice(0, 20) || "usuario";
  }


  // =====================================================
  // ZONA 5: API PÚBLICA DE ROLES Y MEMBRESÍA
  // =====================================================
  // Función:
  // - Exponer helpers globales para permisos, membresía y perfiles
  //
  // >>> CEREBRO PÚBLICO DE ESTE ARCHIVO.
  // >>> app.js depende mucho de:
  // >>> - isAdmin()
  // >>> - isMembershipActive()
  // >>> - generateAndReservePublicId()
  window.Roles = {

    // =================================================
    // SUBZONA 5.1: ASEGURAR DB LISTA
    // =================================================
    // Función:
    // - Alias público de waitDb()
    //
    // >>> Útil si otro módulo quiere esperar DB sin duplicar lógica.
    async ensureReady() {
      await waitDb();
    },

    // =================================================
    // SUBZONA 5.2: VALIDAR SI ES ADMIN
    // =================================================
    // Función:
    // - Revisar si existe admins/{uid}
    //
    // >>> ZONA MUY IMPORTANTE.
    // >>> Si el usuario sí debería ser admin pero no entra,
    // >>> revisa este bloque y la colección "admins".
    async isAdmin(uid) {
      await waitDb();
      if (!uid) return false;

      const snap = await window.DB.collection("admins").doc(uid).get();
      return snap.exists;
    },

    // =================================================
    // SUBZONA 5.3: VALIDAR SI LA MEMBRESÍA ESTÁ ACTIVA
    // =================================================
    // Función:
    // - Comparar paidUntil contra la fecha actual
    //
    // >>> app.js usa esto para decidir si deja pasar a home.
    isMembershipActive(profile) {
      return parsePaidUntilMs(profile) > Date.now();
    },

    // =================================================
    // SUBZONA 5.4: DÍAS RESTANTES DE MEMBRESÍA
    // =================================================
    // Función:
    // - Obtener días restantes como número entero
    //
    // >>> Útil para mostrar info al usuario o admin.
    membershipDaysLeft(profile) {
      return daysLeft(profile);
    },

    // =================================================
    // SUBZONA 5.5: OBTENER PERFIL DE USUARIO
    // =================================================
    // Función:
    // - Leer users/{uid}
    //
    // >>> Si necesitas traer perfil manualmente desde otro módulo, es aquí.
    async getProfile(uid) {
      await waitDb();
      if (!uid) return null;

      const snap = await window.DB.collection("users").doc(uid).get();
      return snap.exists ? snap.data() : null;
    },

    // =================================================
    // SUBZONA 5.6: ASEGURAR PERFIL EN users/{uid}
    // =================================================
    // Función:
    // - Crear perfil si no existe
    // - Mezclar defaults iniciales
    //
    // >>> ZONA DELICADA.
    // >>> Similar en intención a getOrCreateUserProfile() de app.js,
    // >>> pero no igual.
    // >>> OJO: aquí hay posible duplicidad conceptual con app.js.
    async ensureProfile(uid, defaults = {}) {
      await waitDb();
      if (!uid) throw new Error("UID requerido para ensureProfile.");

      const ref = window.DB.collection("users").doc(uid);
      const snap = await ref.get();

      if (snap.exists) {
        return snap.data();
      }

      const base = {
        createdAt: window.firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date(),
        status: "pending",
        paidUntil: null,
        ...defaults
      };

      await ref.set(base, { merge: true });
      return base;
    },

    // =================================================
    // SUBZONA 5.7: GENERAR publicId ÚNICO
    // =================================================
    // Función:
    // - Crear un publicId limpio basado en nombre/apellido
    // - Verificar que no exista ya en users
    // - Reintentar varias veces
    //
    // >>> app.js usa esto al crear perfil nuevo.
    // >>> Si salen ids raros o duplicados, revisa aquí.
    async generateAndReservePublicId(userInfo) {
      await waitDb();

      const nombre = userInfo?.nombre || "usuario";
      const apellido = userInfo?.apellido || "";
      const base = `${nombre}${apellido}`;
      const slug = slugifyPublicId(base);

      for (let attempt = 0; attempt < 5; attempt++) {
        const random = Math.floor(Math.random() * 10000);
        const candidate = `${slug}${String(random).padStart(4, "0")}`;

        const q = await window.DB
          .collection("users")
          .where("publicId", "==", candidate)
          .limit(1)
          .get();

        if (q.empty) {
          return candidate;
        }
      }

      return `${slug}${Date.now()}`;
    }
  };

})();
// =====================================================
// FIN DEL ARCHIVO
// =====================================================
