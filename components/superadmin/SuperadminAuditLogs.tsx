import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../services/superadminService';
import { format } from 'date-fns';

const SuperadminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const { logs: data, total: count } = await getAuditLogs(page);
      setLogs(data);
      setTotal(count);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4 font-mono"><p className="text-slate-400">Tailing logs...</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-4 px-8 text-[10px] font-bold uppercase tracking-wider text-slate-500">Timestamp</th>
                  <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Administrator</th>
                  <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Action Type</th>
                  <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Target Resource</th>
                  <th className="py-4 px-8 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors text-xs">
                    <td className="py-4 px-8 font-mono text-[10px] text-slate-400 font-medium">
                      {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                    </td>
                    <td className="py-4 px-4 font-bold text-sm text-slate-700">
                      {log.users?.display_name || 'System'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-teal-50 text-[#006C75] px-3 py-1 rounded-full text-[10px] font-black border border-teal-100 uppercase tracking-widest shadow-sm">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-bold text-xs tracking-tight">
                      {log.resource_type} <span className="text-[10px] font-mono opacity-50 ml-1 font-medium select-all">#{log.resource_id.slice(0, 8)}</span>
                    </td>
                    <td className="py-4 px-8 text-right">
                      <button 
                         onClick={() => setSelectedLog(log)}
                         className="p-1.5 text-slate-400 hover:text-[#006C75] hover:bg-teal-50 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 lg:p-4">
          <div className="bg-white rounded-2xl lg:rounded-[32px] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] lg:max-h-[90vh]">
            <header className="p-4 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex-1 min-w-0">
                 <h3 className="text-lg lg:text-xl font-black text-slate-800 truncate">Event Details</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{selectedLog.action} • {format(new Date(selectedLog.created_at), 'dd MMM yyyy')}</p>
               </div>
               <button onClick={() => setSelectedLog(null)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                  <span className="material-symbols-outlined">close</span>
               </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Executor</p>
                    <p className="font-bold text-slate-700 text-sm lg:text-base">{selectedLog.users?.display_name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</p>
                    <p className="font-bold text-slate-700 uppercase text-xs lg:text-sm">{selectedLog.users?.role || 'system'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Resource</p>
                    <p className="font-bold text-slate-700 tracking-tighter text-xs lg:text-sm truncate">{selectedLog.resource_type} <span className="text-[10px] font-mono text-slate-400">({selectedLog.resource_id})</span></p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Value Changes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Old State</p>
                        <pre className="bg-slate-900 text-slate-300 p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] overflow-x-auto border border-slate-800 font-mono min-h-[80px] lg:min-h-[100px]">
                           {JSON.stringify(selectedLog.old_values, null, 2) || '// No previous values'}
                        </pre>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-[#006C75] uppercase tracking-widest px-2">New State</p>
                        <pre className="bg-slate-900 text-teal-100 p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] overflow-x-auto border border-[#006C75]/20 font-mono min-h-[80px] lg:min-h-[100px]">
                           {JSON.stringify(selectedLog.new_values, null, 2) || '// No new values'}
                        </pre>
                     </div>
                  </div>
               </div>

               {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                 <div className="space-y-4">
                   <h4 className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Metadata</h4>
                   <pre className="bg-slate-50 text-slate-600 p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] overflow-x-auto border border-slate-100 font-mono">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                   </pre>
                 </div>
               )}
            </div>
            
            <footer className="p-4 lg:p-6 bg-slate-50/50 border-t border-slate-100 text-right">
               <button 
                 onClick={() => setSelectedLog(null)}
                 className="w-full lg:w-auto bg-slate-800 text-white font-bold px-8 py-3 rounded-xl lg:rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-900/10 text-sm"
               >
                 Close Detail View
               </button>
            </footer>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Showing {logs.length} of {total} events
        </p>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-3 bg-white border border-slate-200 rounded-2xl disabled:opacity-30 hover:shadow-md transition-all shadow-sm flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button 
            disabled={page * 50 >= total}
            onClick={() => setPage(p => p + 1)}
            className="p-3 bg-white border border-slate-200 rounded-2xl disabled:opacity-30 hover:shadow-md transition-all shadow-sm flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperadminAuditLogs;
