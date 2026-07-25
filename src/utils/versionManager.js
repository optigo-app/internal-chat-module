/**
 * versionManager.js
 *
 * Central utility for:
 *   1. Fetching the current production version from /version.json
 *   2. Comparing semver strings
 *   3. Multi-tab synchronization via BroadcastChannel + localStorage fallback
 *   4. Safe service-worker unregistration (CRA apps that previously had SWs)
 */

// ── Config ────────────────────────────────────────────────────────────────────

const VERSION_URL = `${process.env.PUBLIC_URL || ''}/version.json`;
const STORAGE_KEY = 'app_version_current';
const BROADCAST_CHANNEL_NAME = 'app_version_sync';
const BROADCAST_MSG_NEW_VERSION = 'NEW_VERSION_DETECTED';

// Cache-bust query param so we always get the latest version.json
const cacheBustUrl = () => `${VERSION_URL}?t=${Date.now()}`;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} VersionInfo
 * @property {string} version   - Semver string e.g. "1.0.15"
 * @property {string} buildTime - ISO-8601 timestamp
 */

// ── Fetching ──────────────────────────────────────────────────────────────────

/**
 * Fetch the current version.json from the server (cache-busted).
 * @returns {Promise<VersionInfo|null>}
 */
export async function fetchServerVersion() {
  try {
    const res = await fetch(cacheBustUrl(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.version !== 'string') return null;
    return { version: data.version, buildTime: data.buildTime || '' };
  } catch (err) {
    console.warn('[versionManager] Failed to fetch version.json:', err);
    return null;
  }
}

// ── Comparison ────────────────────────────────────────────────────────────────

/**
 * Compare two semver strings.
 * @returns {number} -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a, b) {
  if (!a || !b) return 0;
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/**
 * Returns true if `serverVersion` is newer than `currentVersion`.
 */
export function isNewerVersion(serverVersion, currentVersion) {
  return compareVersions(serverVersion, currentVersion) > 0;
}

// ── LocalStorage persistence ──────────────────────────────────────────────────

export function getStoredVersion() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Synchronous helper to get the current app version.
 * Reads from localStorage (populated by useVersionCheck on mount).
 * Falls back to '0.0.0' if not yet stored.
 * @returns {string}
 */
export function getAppVersion() {
  return getStoredVersion() || '0.0.0';
}

export function setStoredVersion(version) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    /* ignore */
  }
}

// ── Multi-tab synchronization ─────────────────────────────────────────────────

let broadcastChannel = null;
let broadcastListeners = new Set();

function getBroadcastChannel() {
  if (broadcastChannel !== null) return broadcastChannel;
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event?.data?.type === BROADCAST_MSG_NEW_VERSION) {
        const { version, buildTime } = event.data;
        broadcastListeners.forEach((cb) => {
          try { cb({ version, buildTime }); } catch { /* ignore */ }
        });
      }
    };
    return broadcastChannel;
  } catch {
    broadcastChannel = false; // mark as unsupported
    return false;
  }
}

/**
 * Listen for version-update notifications from other tabs.
 * @param {(info: VersionInfo) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onCrossTabVersionNotification(callback) {
  broadcastListeners.add(callback);
  const channel = getBroadcastChannel();

  // Fallback: localStorage event (for browsers without BroadcastChannel)
  const storageHandler = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        callback({ version: event.newValue, buildTime: '' });
      } catch { /* ignore */ }
    }
  };

  if (!channel) {
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    broadcastListeners.delete(callback);
    if (!channel) {
      window.removeEventListener('storage', storageHandler);
    }
  };
}

/**
 * Notify all other tabs that a new version was detected.
 * @param {VersionInfo} info
 */
export function notifyOtherTabs(info) {
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage({
      type: BROADCAST_MSG_NEW_VERSION,
      version: info.version,
      buildTime: info.buildTime,
    });
  }
  // localStorage fallback: writing the value triggers 'storage' events
  // in *other* tabs (not the current one)
  setStoredVersion(info.version);
}

// ── Service worker cleanup ────────────────────────────────────────────────────

/**
 * Unregister any existing service workers.
 *
 * CRA apps that were previously created with a service worker (or where
 * someone experimented with workbox) can end up with a stale SW that
 * serves old cached HTML/JS, preventing updates entirely.
 *
 * This function runs on app boot and unregisters all registrations.
 * It is safe to call even when no SW exists.
 */
export async function unregisterStaleServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) return;

    console.info(
      `[versionManager] Found ${registrations.length} service worker(s) — unregistering to prevent stale cache issues.`
    );

    await Promise.all(
      registrations.map(async (reg) => {
        try {
          await reg.unregister();
          console.info('[versionManager] Unregistered SW:', reg.scope);
        } catch (err) {
          console.warn('[versionManager] Failed to unregister SW:', err);
        }
      })
    );

    // Clear any cached SW-related caches to avoid serving stale assets
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      if (cacheNames.length > 0) {
        console.info(`[versionManager] Cleared ${cacheNames.length} cache(s).`);
      }
    }
  } catch (err) {
    console.warn('[versionManager] SW cleanup error:', err);
  }
}
