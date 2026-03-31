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
                  <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Beta Tenants</h1>
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

      <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="space-y-4 p-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredTenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-5 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Pharmacy Details</th>
                  <th className="py-5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Beta Expiry Date</th>
                  <th className="py-5 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Days Remaining</th>
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
                   if (daysRemaining <= 0) {
                      pillColor = 'bg-red-50 text-red-600 border-red-100';
                      pillText = 'Expired';
                   } else if (daysRemaining <= 7) {
                      pillColor = 'bg-amber-50 text-amber-600 border-amber-100';
                      pillText = 'Expiring Soon';
                   }

                   return (
                    <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-5 px-8">
                        <p className="font-bold text-sm text-slate-800 mb-1">{tenant.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium font-mono">{tenant.pharmacy_email}</p>
                      </td>
                      <td className="py-5 px-4 font-medium">
                        <span className="text-sm font-bold text-slate-600 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-slate-400">event</span>
                          {expiryDate ? expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-right">
                        <div className="flex justify-end items-center gap-3">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-full border shadow-sm ${pillColor} uppercase tracking-widest flex items-center gap-1`}>
                             {daysRemaining <= 0 ? <span className="material-symbols-outlined text-sm">block</span> : null}
                             {daysRemaining > 0 && daysRemaining <= 7 ? <span className="material-symbols-outlined text-sm">warning</span> : null}
                             {pillText}
                           </span>
                           <span className="text-xl font-black text-slate-800 w-12 text-right">
                             {daysRemaining < 0 ? 0 : daysRemaining}
                           </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 font-light">search_off</span>
            <p className="font-bold text-slate-500 italic uppercase tracking-wider">No beta tenants found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminBetaTenants;
