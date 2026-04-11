import React, { useEffect, useRef, useMemo } from 'react';
import { PowerSyncContext } from '@powersync/react';
import { db } from './database';
import { SupabaseConnector } from './connector';

export const PowerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const connector = useRef(new SupabaseConnector());

  useEffect(() => {
    // Only connect if PowerSync URL is configured
    const powersyncUrl = import.meta.env.VITE_POWERSYNC_URL;
    
    if (powersyncUrl) {
      db.connect(connector.current);
    } else {
      console.warn('⚠️ PowerSync is not configured. App will work without offline sync.');
    }

    return () => {
      if (powersyncUrl) {
        db.disconnect();
      }
    };
  }, []);

  return <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
};
