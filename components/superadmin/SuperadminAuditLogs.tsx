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
      <div className="bg-white rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="p-8 space-y-4 font-mono">
             {[1,2,3,4,5,6].map(i => (
               <div key={i} className="h-12 bg-slate-50/50 rounded-xl animate-pulse flex items-center px-6 gap-8">
                  <div className="w-24 h-2 bg-slate-100 rounded"></div>
                  <div className="w-32 h-2 bg-slate-100 rounded"></div>
                  <div className="flex-1 h-2 bg-slate-100 rounded"></div>
               </div>
             ))}
          </div>
        ) : (
          <div className="p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="py-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Timestamp</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Administrator</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action Type</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Resource</th>
                    <th className="py-5 px-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group border-l-4 border-l-transparent hover:border-l-[#006C75]">
                      <td className="py-4 px-8 font-mono text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase group-hover:bg-[#006C75] group-hover:text-white transition-all">
                              {log.users?.display_name?.[0] || 'S'}
                           </div>
                           <span className="font-semibold text-sm text-slate-700">{log.users?.display_name || 'System'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-[#006C75]/5 text-[#006C75] px-3 py-1 rounded-full text-[10px] font-bold border border-[#006C75]/10 uppercase tracking-widest shadow-sm">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                           <span className="text-slate-500 font-semibold text-xs tracking-tight uppercase tracking-widest text-[10px]">{log.resource_type}</span>
                           <span className="text-[10px] font-mono opacity-50 font-medium select-all">#{log.resource_id.slice(0, 16)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8 text-right">
                        <button 
                           onClick={() => setSelectedLog(log)}
                           className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#006C75] hover:bg-teal-50 rounded-xl transition-all shadow-sm active:scale-95 ml-auto"
                        >
                          <span className="material-symbols-outlined text-xl">manage_search</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 bg-slate-50/30">
               {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                    onClick={() => setSelectedLog(log)}
                  >
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                           <p className="text-[10px] font-bold text-slate-400 font-mono mb-1">
                              {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                           </p>
                           <h3 className="font-bold text-slate-800 text-sm truncate uppercase tracking-widest">{log.action}</h3>
                        </div>
                        <button className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 group-hover:text-[#006C75] transition-all">
                           <span className="material-symbols-outlined">visibility</span>
                        </button>
                     </div>

                     <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div className="flex justify-between items-center text-xs">
                           <span className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Administrator</span>
                           <span className="font-bold text-slate-700">{log.users?.display_name || 'System'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Resource</span>
                           <span className="font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{log.resource_type}</span>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 lg:p-4">
          <div className="bg-white rounded-2xl lg:rounded-[32px] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] lg:max-h-[90vh]">
            <header className="p-4 lg:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex-1 min-w-0">
                 <h3 className="text-lg lg:text-xl font-bold text-slate-800 truncate">Event Details</h3>
                 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">{selectedLog.action} • {format(new Date(selectedLog.created_at), 'dd MMM yyyy')}</p>
               </div>
               <button onClick={() => setSelectedLog(null)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors shrink-0">
                  <span className="material-symbols-outlined">close</span>
               </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 bg-slate-50 p-4 lg:p-6 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Executor</p>
                    <p className="font-semibold text-slate-700 text-sm lg:text-base">{selectedLog.users?.display_name || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</p>
                    <p className="font-semibold text-slate-700 uppercase text-xs lg:text-sm">{selectedLog.users?.role || 'system'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Resource</p>
                    <p className="font-semibold text-slate-700 tracking-tighter text-xs lg:text-sm truncate">{selectedLog.resource_type} <span className="text-[10px] font-mono text-slate-400">({selectedLog.resource_id})</span></p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Value Changes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Old State</p>
                        <pre className="bg-slate-900 text-slate-300 p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] overflow-x-auto border border-slate-800 font-mono min-h-[80px] lg:min-h-[100px]">
                           {JSON.stringify(selectedLog.old_values, null, 2) || '// No previous values'}
                        </pre>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-bold text-[#006C75] uppercase tracking-widest px-2">New State</p>
                        <pre className="bg-slate-900 text-teal-100 p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] overflow-x-auto border border-[#006C75]/20 font-mono min-h-[80px] lg:min-h-[100px]">
                           {JSON.stringify(selectedLog.new_values, null, 2) || '// No new values'}
                        </pre>
                     </div>
                  </div>
               </div>

               {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                 <div className="space-y-4">
                   <h4 className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Metadata</h4>
                   <pre className="bg-slate-50 text-slate-600 p-3 lg:p-4 rounded-xl text-[9px] lg:text-[10px] overflow-x-auto border border-slate-100 font-mono">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                   </pre>
                 </div>
               )}
            </div>
            
            <footer className="p-4 lg:p-6 bg-slate-50/50 border-t border-slate-100 text-right">
               <button 
                 onClick={() => setSelectedLog(null)}
                 className="w-full lg:w-auto bg-slate-800 text-white font-semibold px-8 py-3 rounded-xl lg:rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-900/10 text-sm"
               >
                 Close Detail View
               </button>
            </footer>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center px-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
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
