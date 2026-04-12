import React, { useState, useEffect } from 'react';
import { usePowerSyncStatus } from '@powersync/react';
import { useTenantGuard } from '../../hooks/useTenantGuard';

export const SyncStatusBar: React.FC = () => {
  const status = usePowerSyncStatus();
  const { isDemo } = useTenantGuard();
  const [showBanner, setShowBanner] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;
    
    // If browser is online, or PowerSync is not configured, or we are in demo mode, or we are already connected, don't show the banner
    // WE PRIORITIZE navigator.onLine here - if the browser thinks it's online, we don't show "Offline" banner.
    if (!powersyncUrl || isDemo || status.connected || isBrowserOnline) {
      setShowBanner(false);
      return;
    }

    // Add a small delay (2.5 seconds) before showing the offline banner to avoid flickering during initial connection
    const timer = setTimeout(() => {
      // Re-verify that we are still disconnected and the browser is truly offline
      if (!status.connected && !window.navigator.onLine) {
        setShowBanner(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [status.connected, isDemo, isBrowserOnline]);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="w-full bg-yellow-400 dark:bg-yellow-500 text-yellow-950 px-4 py-2 text-center text-sm font-bold shadow-md flex items-center justify-center gap-2 border-b border-yellow-600/20 animate-in slide-in-from-top duration-300">
      <span className="material-symbols-outlined text-lg">cloud_off</span>
      <span className="hidden xs:inline">You're offline — changes will sync when your connection is restored</span>
      <span className="xs:hidden">Offline — Syncing paused</span>
    </div>
  );
};
