import React from 'react';
import { usePowerSyncStatus } from '@powersync/react';
import { useTenantGuard } from '../../hooks/useTenantGuard';

export const SyncStatusBar: React.FC = () => {
  const status = usePowerSyncStatus();
  const { isDemo } = useTenantGuard();

  if (status.connected || isDemo) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full z-[9999] animate-in slide-in-from-top duration-300">
      <div className="bg-yellow-400 dark:bg-yellow-500 text-yellow-950 px-4 py-2 text-center text-sm font-bold shadow-md flex items-center justify-center gap-2 border-b border-yellow-600/20">
        <span className="material-symbols-outlined text-lg">cloud_off</span>
        <span className="hidden xs:inline">You're offline — changes will sync when your connection is restored</span>
        <span className="xs:hidden">Offline — Syncing paused</span>
      </div>
    </div>
  );
};
