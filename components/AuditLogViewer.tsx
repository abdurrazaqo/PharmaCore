import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auditLog } from '../services/auditLog';
import { Permission } from '../hooks/usePermissions';
import PermissionGate from './PermissionGate';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  created_at: string;
  user?: { email: string };
  metadata?: any;
}

const AuditLogViewer: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [profile]);

  const loadLogs = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      const data = await auditLog.getTenantLogs(profile.tenant_id);
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.resource_type.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <PermissionGate permission={Permission.VIEW_REPORTS}>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Audit Logs</h2>
        
        <input
          type="text"
          placeholder="Filter by action or resource..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-4 px-4 py-2 border rounded-lg w-full"
        />

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Resource</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2 text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {log.user?.email || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm">{log.action}</td>
                    <td className="px-4 py-2 text-sm">
                      {log.resource_type}
                      {log.resource_id && ` (${log.resource_id.slice(0, 8)}...)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PermissionGate>
  );
};

export default AuditLogViewer;
