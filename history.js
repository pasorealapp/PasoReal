// js/history.js
// UI de historial (lista simple) - compatible con StorageAPI

(function () {
  let isHooked = false;

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatDate(value) {
    if (!value) return "—";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);

    return d.toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getItemDate(item) {
    return item?.dateISO || item?.finishedAt || item?.createdAt || item?.date || "";
  }

  function getAccountOrNull() {
    if (!window.StorageAPI) return null;
    const acc = window.StorageAPI.getActiveAccount?.();
    return acc || null;
  }

  function renderHistory() {
    const acc = getAccountOrNull();

    const labelEl = document.getElementById("historyAccountLabel");
    const listEl = document.getElementById("historyList");

    if (!listEl) return;

    if (!acc) {
      if (labelEl) labelEl.textContent = "No hay cuenta activa.";
      listEl.innerHTML = `
        <div class="option-card primary-card" style="opacity:.8;">
          <strong>Sin datos</strong>
          <small>Inicia sesión y completa una ruta para ver tu historial.</small>
        </div>
      `;
      return;
    }

    if (labelEl) {
      labelEl.textContent = `Cuenta: ${acc.label} · ${acc.id}`;
    }

    const items = window.StorageAPI
      .listHistory(acc.id)
      .slice()
      .sort((a, b) => String(getItemDate(b)).localeCompare(String(getItemDate(a))));

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="option-card primary-card" style="opacity:.8;">
          <strong>Aún no hay caminatas</strong>
          <small>Finaliza una ruta para que aparezca aquí.</small>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map((item) => {
      const km = ((Number(item.distanceMeters) || 0) / 1000).toFixed(2);
      const time = formatTime(item.durationSec || 0);
      const date = formatDate(getItemDate(item));
      const routeName = escapeHtml(item.routeName || "Ruta");
      const sessionId = escapeHtml(item.sessionId || "");

      return `
        <div class="option-card primary-card" data-session="${sessionId}">
          <strong>${routeName}</strong>
          <small>${escapeHtml(date)} · ${km} km · ${time}</small>
        </div>
      `;
    }).join("");
  }

  function openModal(sessionId, accId) {
    const modal = document.getElementById("historyModal");
    const body = document.getElementById("historyModalBody");
    if (!modal || !body) return;

    const items = window.StorageAPI.listHistory(accId);
    const item = items.find((x) => String(x.sessionId) === String(sessionId));
    if (!item) return;

    const km = ((Number(item.distanceMeters) || 0) / 1000).toFixed(2);
    const time = formatTime(item.durationSec || 0);
    const date = formatDate(getItemDate(item));

    body.innerHTML = `
      <div><strong>Ruta:</strong> ${escapeHtml(item.routeName || "Ruta")}</div>
      <div><strong>Fecha:</strong> ${escapeHtml(date)}</div>
      <div><strong>Modo:</strong> ${escapeHtml(item.mode || "—")}</div>
      <div><strong>Distancia:</strong> ${km} km</div>
      <div><strong>Tiempo:</strong> ${time}</div>
      <div><strong>Pasos:</strong> ${Number(item.steps) || 0}</div>
    `;

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    const modal = document.getElementById("historyModal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  function hookHistoryUI() {
    if (isHooked) return;
    isHooked = true;

    document.getElementById("goToHistory")?.addEventListener("click", () => {
      window.showScreen?.("historyScreen");
      renderHistory();
    });

    document.getElementById("backToHomeFromHistory")?.addEventListener("click", () => {
      window.showScreen?.("home");
    });

    document.getElementById("closeHistoryModal")?.addEventListener("click", closeModal);

    document.getElementById("historyModal")?.addEventListener("click", (e) => {
      if (e.target && e.target.id === "historyModal") {
        closeModal();
      }
    });

    document.getElementById("historyList")?.addEventListener("click", (e) => {
      const card = e.target.closest("[data-session]");
      if (!card) return;

      const acc = getAccountOrNull();
      if (!acc) return;

      openModal(card.getAttribute("data-session"), acc.id);
    });
  }

  window.HistoryUI = {
    hookHistoryUI,
    renderHistory,
    openModal,
    closeModal
  };
})();
