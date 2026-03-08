// js/roles.js
(function () {
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

  function parsePaidUntilMs(profile) {
    const v = profile?.paidUntil;

    if (!v) return 0;

    // Firestore Timestamp
    if (typeof v === "object" && typeof v.seconds === "number") {
      return v.seconds * 1000;
    }

    // Date nativo
    if (v instanceof Date) {
      return v.getTime();
    }

    // número ya en ms
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }

    // string ISO o parseable
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : 0;
  }

  function daysLeft(profile) {
    const diff = parsePaidUntilMs(profile) - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  function slugifyPublicId(text) {
    return String(text || "usuario")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
      .slice(0, 20) || "usuario";
  }

  window.Roles = {
    async ensureReady() {
      await waitDb();
    },

    async isAdmin(uid) {
      await waitDb();
      if (!uid) return false;

      const snap = await window.DB.collection("admins").doc(uid).get();
      return snap.exists;
    },

    isMembershipActive(profile) {
      return parsePaidUntilMs(profile) > Date.now();
    },

    membershipDaysLeft(profile) {
      return daysLeft(profile);
    },

    async getProfile(uid) {
      await waitDb();
      if (!uid) return null;

      const snap = await window.DB.collection("users").doc(uid).get();
      return snap.exists ? snap.data() : null;
    },

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