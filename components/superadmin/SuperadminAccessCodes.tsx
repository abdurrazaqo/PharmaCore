import React, { useState, useEffect } from 'react';
import { getAccessCodes } from '../../services/superadminService';
import { useToast } from '../ToastContainer';

const SuperadminAccessCodes: React.FC = () => {
  const { showToast } = useToast();
  const [codes, setCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const data = await getAccessCodes();
      setCodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'used': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'unused': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'expired': return 'bg-slate-100 text-slate-400 border-slate-200';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const filteredCodes = codes.filter(c => 
    c.buyer_email.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex-1 relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search by email or code..."
            className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#006C75]/20'"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        {isLoading ? (
          <div className="p-8 space-y-4">
             {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-50/50 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 border-b border-slate-100">
                    <th className="py-5 px-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">Access Code</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Buyer Email</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Plan Details</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Amount Paid</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="py-5 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Expiry Date</th>
                    <th className="py-5 px-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="py-6 px-8">
                        <code className="font-mono font-bold text-[#006C75] bg-teal-50 px-4 py-2 rounded-xl border border-teal-100 text-sm tracking-[0.1em] shadow-sm group-hover:shadow-[#006C75]/10 transition-all select-all">
                          {code.code}
                        </code>
                      </td>
                      <td className="py-6 px-4">
                        <p className="text-sm font-semibold text-slate-700">{code.buyer_email}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Verified Payment</p>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-1">{code.plan}</span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                            {code.billing_cycle}ly Cycle
                          </span>
                        </div>
                      </td>
                      <td className="py-6 px-4 text-center">
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                          ₦{Number(code.amount_paid).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-6 px-4">
                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border shadow-sm ${getStatusColor(code.status)} uppercase tracking-widest`}>
                          {code.status}
                        </span>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-600">
                            {new Date(code.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Valid until</span>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`https://pharmacore.365health.online/onboard?token=${code.token}`);
                            showToast('Onboarding link copied!', 'success');
                          }}
                          className="w-10 h-10 flex items-center justify-center text-[#006C75] bg-teal-50 border border-teal-100 rounded-xl hover:bg-[#006C75] hover:text-white transition-all shadow-sm transform active:scale-95 ml-auto"
                          title="Copy Link"
                        >
                          <span className="material-symbols-outlined text-xl">link</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/50">
               {filteredCodes.map((code) => (
                 <div key={code.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12`}>
                       <span className="material-symbols-outlined text-[120px]">loyalty</span>
                    </div>

                    <div className="flex justify-between items-start mb-6">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2 mb-2">
                             <code className="font-mono font-bold text-[#006C75] text-lg tracking-widest select-all">{code.code}</code>
                             <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(code.status)} uppercase tracking-widest`}>
                               {code.status}
                             </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{code.buyer_email}</p>
                       </div>
                       <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`https://pharmacore.365health.online/onboard?token=${code.token}`);
                            showToast('Onboarding link copied!', 'success');
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-[#006C75] text-white rounded-2xl shadow-lg shadow-[#006C75]/20 hover:scale-110 active:scale-90 transition-all shrink-0"
                       >
                          <span className="material-symbols-outlined text-xl">content_copy</span>
                       </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plan</p>
                          <p className="text-xs font-bold text-slate-800 uppercase">{code.plan} ({code.billing_cycle})</p>
                       </div>
                       <div className="space-y-1 text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount</p>
                          <p className="text-sm font-bold text-emerald-600">₦{Number(code.amount_paid).toLocaleString()}</p>
                       </div>
                       <div className="col-span-2 pt-2">
                          <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                             <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Expires</span>
                             <span className="text-[10px] font-bold text-slate-600">{new Date(code.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminAccessCodes;
