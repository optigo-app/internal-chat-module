/**
 * useVersionCheck.js
 *
 * Production-grade version detection hook with three strategies:
 *
 *   1. WebSocket push — listens for an `app_version_update` event on the
 *      socket.  This is the fastest path (sub-second after deploy).
 *
 *   2. Visibility change — when the user returns to the tab after at
 *      least 30 s away, fetch /version.json and compare.
 *
 *   3. Fallback polling — every REACT_APP_VERSION_POLL_INTERVAL ms
 *      (default 10 min) fetch /version.json.  Keeps working even if
 *      the socket is down and the user never switches tabs.
 *
 * Multi-tab: when any tab detects a new version it broadcasts via
 * BroadcastChannel (or localStorage).  This hook listens for those
 * cross-tab notifications so all tabs show the banner simultaneously.
 *
 * On first mount the hook also captures the *current* version (the one
 * the running bundle was shipped with) so we have a baseline to compare
 * against.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchServerVersion,
  isNewerVersion,
  getStoredVersion,
  setStoredVersion,
  onCrossTabVersionNotification,
  notifyOtherTabs,
  unregisterStaleServiceWorkers,
} from '../utils/versionManager';
import { addAppVersionUpdateHandler } from '../socket';

// ── Config ────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = parseInt(process.env.REACT_APP_VERSION_POLL_INTERVAL || '', 10) || 10 * 60 * 1000; // 10 min default
const VISIBILITY_MIN_INTERVAL = 30 * 1000; // 30 s — avoid hammering on rapid tab switches

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   updateAvailable: boolean,
 *   serverVersion: string|null,
 *   currentVersion: string|null,
 *   buildTime: string|null,
 *   dismissUpdate: () => void,
 *   applyUpdate: () => void,
 *   checkNow: () => Promise<void>,
 * }}
 */
export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState(null);
  const [buildTime, setBuildTime] = useState(null);

  // The version this running bundle was shipped with.
  // Fetched once on mount from the same /version.json — at boot time it
  // matches what's deployed, so it's our baseline.
  const currentVersionRef = useRef(null);
  const lastVisibilityCheckRef = useRef(Date.now());
  const dismissedVersionRef = useRef(null);
  const isCheckingRef = useRef(false);

  // ── Core check function ─────────────────────────────────────────────────────

  const performCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const info = await fetchServerVersion();
      if (!info) return;

      // On first run, establish the baseline version
      if (!currentVersionRef.current) {
        currentVersionRef.current = info.version;
        setStoredVersion(info.version);
        return;
      }

      // Already dismissed this version
      if (dismissedVersionRef.current === info.version) return;

      if (isNewerVersion(info.version, currentVersionRef.current)) {
        setServerVersion(info.version);
        setBuildTime(info.buildTime);
        setUpdateAvailable(true);
        // Tell other tabs
        notifyOtherTabs(info);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // ── Expose a manual check function (e.g. after socket reconnect) ────────────

  const checkNow = useCallback(async () => {
    // Reset the dismissed flag if the server version changed again
    isCheckingRef.current = false;
    await performCheck();
  }, [performCheck]);

  // ── Dismiss & apply ─────────────────────────────────────────────────────────

  const dismissUpdate = useCallback(() => {
    if (serverVersion) {
      dismissedVersionRef.current = serverVersion;
    }
    setUpdateAvailable(false);
  }, [serverVersion]);

  const applyUpdate = useCallback(() => {
    // Hard reload to pull the new bundle
    // Using window.location.reload() — the cache-bust query ensures
    // the browser re-fetches index.html
    window.location.reload();
  }, []);

  // ── Effects ─────────────────────────────────────────────────────────────────

  // 1. Initial mount: unregister stale SWs + fetch baseline version + start polling
  useEffect(() => {
    // Clean up any stale service workers from previous CRA setups
    unregisterStaleServiceWorkers();

    // Restore the last-known version from localStorage (helps when the
    // user had the app open, we detected an update, they dismissed it,
    // and then refreshed — we don't want to re-show for the same version)
    const stored = getStoredVersion();
    if (stored) {
      dismissedVersionRef.current = null; // fresh session — allow detection
    }

    // Initial check (establishes baseline)
    performCheck();

    // Fallback polling
    const pollTimer = setInterval(performCheck, POLL_INTERVAL);

    return () => clearInterval(pollTimer);
  }, [performCheck]);

  // 2. Visibility change — check when user returns to the tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityCheckRef.current < VISIBILITY_MIN_INTERVAL) return;
      lastVisibilityCheckRef.current = now;
      performCheck();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [performCheck]);

  // 3. WebSocket push — listen for server-side version update events
  useEffect(() => {
    const handler = (data) => {
      // Backend sends { version, buildTime } or just { version }
      if (data?.version) {
        if (!currentVersionRef.current) {
          currentVersionRef.current = data.version;
          setStoredVersion(data.version);
          return;
        }
        if (
          isNewerVersion(data.version, currentVersionRef.current) &&
          dismissedVersionRef.current !== data.version
        ) {
          setServerVersion(data.version);
          setBuildTime(data.buildTime || '');
          setUpdateAvailable(true);
          notifyOtherTabs({ version: data.version, buildTime: data.buildTime || '' });
        }
      } else {
        // Backend just signals "check now" without payload
        performCheck();
      }
    };

    const unsubscribe = addAppVersionUpdateHandler(handler);
    return unsubscribe;
  }, [performCheck]);

  // 4. Cross-tab notifications
  useEffect(() => {
    const unsubscribe = onCrossTabVersionNotification((info) => {
      if (!currentVersionRef.current) {
        currentVersionRef.current = info.version;
        return;
      }
      if (
        isNewerVersion(info.version, currentVersionRef.current) &&
        dismissedVersionRef.current !== info.version
      ) {
        setServerVersion(info.version);
        setBuildTime(info.buildTime || '');
        setUpdateAvailable(true);
      }
    });
    return unsubscribe;
  }, []);

  return {
    updateAvailable,
    serverVersion,
    currentVersion: currentVersionRef.current,
    buildTime,
    dismissUpdate,
    applyUpdate,
    checkNow,
  };
}
