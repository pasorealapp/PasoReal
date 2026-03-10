// js/storage.js
(function () {
  const KEY_ACCOUNTS = "pasoreal_accounts_v1";
  const KEY_ACTIVE = "pasoreal_active_account_v1";

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("localStorage corrupto:", key);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("No se pudo escribir localStorage:", key, e);
    }
  }

  function historyKey(accId) {
    return `pasoreal_history_${accId}_v1`;
  }

  function sortHistory(items) {
    return [...(items || [])].sort((a, b) => {
      const aTime = Date.parse(a?.finishedAt || a?.createdAt || a?.date || 0) || 0;
      const bTime = Date.parse(b?.finishedAt || b?.createdAt || b?.date || 0) || 0;
      return bTime - aTime;
    });
  }

  function listHistory(accId) {
    return sortHistory(readJSON(historyKey(accId), []));
  }

  function writeHistory(accId, items) {
    writeJSON(historyKey(accId), sortHistory(items || []));
  }

  function clearHistory(accId) {
    try {
      localStorage.removeItem(historyKey(accId));
    } catch (e) {
      console.warn("No se pudo limpiar historial:", accId, e);
    }
  }

  function mergeHistoryItems(oldItems, newItems) {
    const map = new Map();

    [...(oldItems || []), ...(newItems || [])].forEach((item) => {
      const key =
        item?.sessionId ||
        `${item?.routeId || ""}_${item?.finishedAt || item?.createdAt || Math.random()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return sortHistory([...map.values()]);
  }

  function addHistoryItem(accId, item) {
    if (!accId || !item) return;

    const arr = listHistory(accId);

    if (item.sessionId && arr.some((i) => i.sessionId === item.sessionId)) {
      return;
    }

    arr.push(item);
    writeHistory(accId, arr);
  }

  function upsertAccount(acc) {
    if (!acc?.id) return null;

    const accounts = readJSON(KEY_ACCOUNTS, []);
    const idx = accounts.findIndex((a) => a.id === acc.id);

    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        ...acc,
        createdAtISO: accounts[idx].createdAtISO || acc.createdAtISO || new Date().toISOString()
      };
    } else {
      accounts.push({
        ...acc,
        createdAtISO: acc.createdAtISO || new Date().toISOString()
      });
    }

    writeJSON(KEY_ACCOUNTS, accounts);
    localStorage.setItem(KEY_ACTIVE, acc.id);
    return accounts.find((a) => a.id === acc.id) || acc;
  }

  function migrateAccountId(oldId, newId, newLabel) {
    if (!oldId || !newId || oldId === newId) return;

    const oldItems = listHistory(oldId);
    const newItems = listHistory(newId);

    if (oldItems.length > 0) {
      const merged = mergeHistoryItems(oldItems, newItems);
      writeHistory(newId, merged);
    }

    clearHistory(oldId);

    const accounts = readJSON(KEY_ACCOUNTS, []);
    const oldIdx = accounts.findIndex((a) => a.id === oldId);
    const newIdx = accounts.findIndex((a) => a.id === newId);

    if (oldIdx >= 0 && newIdx < 0) {
      accounts[oldIdx] = {
        ...accounts[oldIdx],
        id: newId,
        label: newLabel || accounts[oldIdx].label
      };
    } else if (newIdx >= 0) {
      accounts[newIdx] = {
        ...accounts[newIdx],
        label: newLabel || accounts[newIdx].label
      };

      if (oldIdx >= 0) {
        accounts.splice(oldIdx, 1);
      }
    }

    writeJSON(KEY_ACCOUNTS, accounts);

    const activeId = localStorage.getItem(KEY_ACTIVE);
    if (activeId === oldId) {
      localStorage.setItem(KEY_ACTIVE, newId);
    }
  }

  function getActiveAccount() {
    const accounts = readJSON(KEY_ACCOUNTS, []);
    const activeId = localStorage.getItem(KEY_ACTIVE);

    if (!activeId) return null;
    return accounts.find((a) => a.id === activeId) || null;
  }

  function ensureAccountForUser(user, profile) {
    const oldId = user?.uid ? `U_${user.uid}` : "guest";

    const label =
      profile?.displayName ||
      [profile?.nombre, profile?.apellido].filter(Boolean).join(" ").trim() ||
      profile?.publicId ||
      user?.displayName ||
      user?.email ||
      (user?.isAnonymous ? "Invitado" : "Guest");

    const newId = profile?.publicId ? String(profile.publicId) : oldId;

    if (newId !== oldId) {
      migrateAccountId(oldId, newId, label);
    }

    return upsertAccount({
      id: newId,
      label
    });
  }

  window.StorageAPI = {
    ensureAccountForUser,
    getActiveAccount,
    listHistory,
    addHistoryItem,
    clearHistory
  };
})();