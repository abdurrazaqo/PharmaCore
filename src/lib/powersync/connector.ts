import { PowerSyncBackendConnector, PowerSyncDatabase, UpdateType } from '@powersync/web';
import { supabase } from '../../../services/supabaseClient';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session }, error } = await supabase!.auth.getSession();
    if (error) {
      throw error;
    }

    const endpoint = import.meta.env.VITE_POWERSYNC_URL;
    if (!endpoint) {
      console.warn('⚠️ VITE_POWERSYNC_URL is not configured. PowerSync sync will not work.');
    }

    return {
      endpoint: endpoint || '',
      token: session?.access_token ?? ''
    };
  }

  async uploadData(database: PowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      for (const op of transaction.crud) {
        const { table, op: opType, id, opData } = op;
        
        switch (opType) {
          case UpdateType.PUT:
            const { error: putError } = await supabase!
              .from(table)
              .upsert({ id, ...opData });
            if (putError) throw putError;
            break;
          case UpdateType.PATCH:
            const { error: patchError } = await supabase!
              .from(table)
              .update(opData)
              .eq('id', id);
            if (patchError) throw patchError;
            break;
          case UpdateType.DELETE:
            const { error: deleteError } = await supabase!
              .from(table)
              .delete()
              .eq('id', id);
            if (deleteError) throw deleteError;
            break;
        }
      }

      await transaction.complete();
    } catch (error) {
      console.error('PowerSync upload error:', error);
      // Not calling transaction.complete() so PowerSync retries
    }
  }
}
