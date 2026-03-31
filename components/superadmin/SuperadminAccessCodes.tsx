import React, { useState, useEffect } from 'react';
import { getAccessCodes } from '../../services/superadminService';

const SuperadminAccessCodes: React.FC = () => {
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

      <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
             {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-4 px-8 text-[10px] font-bold uppercase tracking-wider text-slate-500">Access Code</th>
                <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Buyer Email</th>
                <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Plan Details</th>
                <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount Paid</th>
                <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Date</th>
                <th className="py-4 px-8 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCodes.map((code) => (
                <tr key={code.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-5 px-8">
                    <code className="font-mono font-black text-[#006C75] bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50 text-xs tracking-widest shadow-sm">{code.code}</code>
                  </td>
                  <td className="py-5 px-4 text-sm font-bold text-slate-700">{code.buyer_email}</td>
                  <td className="py-5 px-4 font-medium">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{code.plan}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-[10px] text-slate-300">sync</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{code.billing_cycle}ly Cycle</p>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-sm font-black text-emerald-700">
                      ₦{Number(code.amount_paid).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm ${getStatusColor(code.status)} uppercase tracking-widest`}>
                      {code.status}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                    {new Date(code.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-5 px-8 text-right">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`https://pharmacore.365health.online/onboard?token=${code.token}`);
                        alert('Onboarding link copied!');
                      }}
                      className="text-[#006C75] p-2 hover:bg-teal-50 border border-transparent hover:border-teal-100 rounded-xl transition-all shadow-sm active:scale-95"
                      title="Copy Onboarding Link"
                    >
                      <span className="material-symbols-outlined text-xl">content_copy</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminAccessCodes;
