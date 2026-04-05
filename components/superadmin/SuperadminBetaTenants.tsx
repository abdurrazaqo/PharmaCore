import React, { useState, useEffect } from 'react';
import { getTenants } from '../../services/superadminService';

const SuperadminBetaTenants: React.FC = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadBetaTenants();
  }, []);

  const loadBetaTenants = async () => {
    setIsLoading(true);
    try {
      // Filter the API call by 'is_gifted: true'
      // Requires small modification in getTenants if using supabase, or fetch all and filter in memory
      const data = await getTenants({ is_gifted: true });
      setTenants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.pharmacy_email?.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();

  return (
    <div className="space-y-4 lg:space-y-8 pb-12 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Widget */}
      <div className="bg-gradient-to-br from-[#006C75] to-teal-800 rounded-3xl p-8 lg:p-10 shadow-xl overflow-hidden relative">
         <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
            <div className="flex gap-5 items-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                <span className="material-symbols-outlined text-4xl text-emerald-300">stars</span>
              </div>
               <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2">Beta Tenants</h1>
                  <p className="text-teal-100 font-medium max-w-xl text-sm lg:text-base leading-relaxed">
                    Monitor tenants currently navigating on gifted beta access. Watch out for expiring accounts.
                  </p>
               </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Search Bar */}
      <div className="flex bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm transition-all">
        <div className="flex-1 relative group w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#006C75] transition-colors">search</span>
          <input 
            type="text" 
            placeholder="Search beta tenants..."
            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#006C75]/20 focus:outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="space-y-4 p-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredTenants.length > 0 ? (
          <div className="p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="py-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pharmacy Details</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Beta Expiry Date</th>
                    <th className="py-5 px-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Days Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTenants.map((tenant) => {
                     const expiryDate = tenant.gifted_until ? new Date(tenant.gifted_until) : null;
                     let daysRemaining = 0;
                     if (expiryDate) {
                       daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                     }

                     let pillColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                     let pillText = 'Active';
                     let accentColor = 'bg-emerald-500';

                     if (daysRemaining <= 0) {
                        pillColor = 'bg-red-50 text-red-600 border-red-100';
                        pillText = 'Expired';
                        accentColor = 'bg-red-500';
                     } else if (daysRemaining <= 7) {
                        pillColor = 'bg-amber-50 text-amber-600 border-amber-100';
                        pillText = 'Expiring Soon';
                        accentColor = 'bg-amber-500';
                     }

                     return (
                      <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group border-l-4 border-l-transparent hover:border-l-[#006C75]">
                        <td className="py-6 px-8">
                          <p className="font-semibold text-sm text-slate-800 mb-1 group-hover:text-[#006C75] transition-colors">{tenant.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium font-mono">{tenant.pharmacy_email}</p>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-slate-300">event</span>
                              {expiryDate ? expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Automatic Expiry</span>
                          </div>
                        </td>
                        <td className="py-6 px-8 text-right">
                          <div className="flex justify-end items-center gap-4">
                             <div className="text-right">
                               <p className="text-xl font-bold text-slate-800 leading-none mb-1">
                                 {daysRemaining < 0 ? 0 : daysRemaining}
                               </p>
                               <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${pillColor} uppercase tracking-widest flex items-center gap-1`}>
                                 {pillText}
                               </span>
                             </div>
                             <div className="w-1.5 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                <div 
                                  className={`w-full ${accentColor} transition-all duration-1000`} 
                                  style={{ height: `${Math.min(100, Math.max(0, (daysRemaining / 30) * 100))}%` }}
                                />
                             </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 bg-slate-50/30">
               {filteredTenants.map((tenant) => {
                  const expiryDate = tenant.gifted_until ? new Date(tenant.gifted_until) : null;
                  let daysRemaining = 0;
                  if (expiryDate) {
                    daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  }

                  let pillColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  let pillText = 'Active';
                  let accentColor = 'bg-emerald-500';

                  if (daysRemaining <= 0) {
                     pillColor = 'bg-red-50 text-red-600 border-red-100';
                     pillText = 'Expired';
                     accentColor = 'bg-red-500';
                  } else if (daysRemaining <= 7) {
                     pillColor = 'bg-amber-50 text-amber-600 border-amber-100';
                     pillText = 'Expiring';
                     accentColor = 'bg-amber-500';
                  }

                  return (
                    <div key={tenant.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm overflow-hidden relative group">
                       <div className={`absolute top-0 left-0 w-1.5 h-full ${accentColor}`} />
                       
                       <div className="flex justify-between items-start mb-6">
                          <div className="flex-1 min-w-0 pr-4">
                             <h3 className="font-bold text-slate-800 text-lg truncate mb-1">{tenant.name}</h3>
                             <p className="text-[10px] text-slate-400 font-semibold font-mono truncate">{tenant.pharmacy_email}</p>
                          </div>
                          <div className="text-right shrink-0">
                             <p className="text-2xl font-bold text-slate-800 leading-none">{daysRemaining < 0 ? 0 : daysRemaining}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Days Left</p>
                          </div>
                       </div>

                       <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                             <span className="material-symbols-outlined text-lg text-slate-300">event_busy</span>
                             <span className="text-xs font-semibold text-slate-500">
                                {expiryDate ? expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
                             </span>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${pillColor} uppercase tracking-widest`}>
                             {pillText}
                          </span>
                       </div>
                    </div>
                  );
               })}
            </div>
          </div>
        ) : (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 font-light">search_off</span>
            <p className="font-semibold text-slate-500 italic uppercase tracking-wider">No beta tenants found</p>
          </div>
        )}
      </div>
    </div>

  );
};

export default SuperadminBetaTenants;
