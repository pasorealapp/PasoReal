// js/utils.js
// Utilidades pequeñas (sin dependencias)

(function () {
  const Utils = {
    clamp(v, min, max) {
      const value = Number(v);
      const minValue = Number(min);
      const maxValue = Number(max);

      if (Number.isNaN(value)) return minValue;
      return Math.max(minValue, Math.min(maxValue, value));
    },

    formatTime(totalSeconds) {
      const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
      const mm = Math.floor(s / 60);
      const ss = String(s % 60).padStart(2, "0");
      return `${mm}:${ss}`;
    },

    safeJSONParse(raw, fallback = null) {
      if (raw == null || raw === "") return fallback;
      if (typeof raw === "object") return raw;

      try {
        return JSON.parse(raw);
      } catch (err) {
        return fallback;
      }
    },

    isoNowPlusDays(days) {
      const d = new Date();
      d.setDate(d.getDate() + Number(days || 0));
      return d.toISOString();
    },

    isNonEmptyString(value) {
      return typeof value === "string" && value.trim().length > 0;
    }
  };

  window.Utils = Object.freeze(Utils);
})();
