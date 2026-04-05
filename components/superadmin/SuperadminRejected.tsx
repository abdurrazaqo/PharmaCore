import React, { useState, useEffect } from 'react';
import { getOnboardingRequests, reconsiderOnboardingRequest, OnboardingRequest } from '../../services/superadminService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ToastContainer';
const SuperadminRejected: React.FC = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await getOnboardingRequests('rejected');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconsider = async (id: string) => {
    setIsProcessing(id);
    try {
      await reconsiderOnboardingRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      showToast('Request moved back to pending queue', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 font-inter">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/superadmin/pending')}
          className="flex items-center gap-2 text-[#006C75] font-semibold text-sm hover:underline transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Pending Requests
        </button>
        <h2 className="text-xl font-semibold text-slate-800">Rejected Applications</h2>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="p-8 space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50/50 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : requests.length > 0 ? (
          <div className="p-0">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pharmacy Details</th>
                    <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Person</th>
                    <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Rejection Reason</th>
                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-red-50/20 transition-all group border-l-4 border-l-transparent hover:border-l-red-500">
                      <td className="py-6 px-8">
                        <p className="font-semibold text-sm text-slate-800 mb-0.5">{req.pharmacy_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium font-mono">{req.pharmacy_email}</p>
                      </td>
                      <td className="py-6 px-4">
                         <div className="flex flex-col">
                            <span className="font-semibold text-slate-600 text-sm">{req.contact_person_name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{req.pharmacy_phone}</span>
                         </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 max-w-xs group-hover:bg-red-50 group-hover:border-red-200 transition-all">
                          <p className="text-[10px] text-red-600 italic font-semibold leading-relaxed">
                            "{req.rejection_reason || 'No reason provided'}"
                          </p>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right">
                        <button 
                          onClick={() => handleReconsider(req.id)}
                          disabled={isProcessing === req.id}
                          className="bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-[#006C75] hover:text-white hover:border-[#006C75] transition-all disabled:opacity-50 shadow-sm active:scale-95 flex items-center gap-2 ml-auto"
                        >
                          {isProcessing === req.id ? (
                            <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">history_edu</span>
                          )}
                          {isProcessing === req.id ? 'Processing' : 'Reconsider'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 bg-slate-50/30">
               {requests.map((req) => (
                  <div key={req.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                     <div className="absolute top-0 left-0 w-1 h-full bg-red-400 opacity-50" />
                     
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 min-w-0 pr-4">
                           <h3 className="font-bold text-slate-800 text-lg truncate mb-1">{req.pharmacy_name}</h3>
                           <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest truncate">{req.pharmacy_email}</p>
                        </div>
                     </div>

                     <div className="space-y-4 mb-6">
                        <div className="space-y-1">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rejection Reason</p>
                           <p className="text-xs font-semibold text-red-600 bg-red-50/50 p-3 rounded-xl border border-red-100 italic">
                             "{req.rejection_reason || 'No reason provided'}"
                           </p>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</span>
                              <span className="text-xs font-bold text-slate-700">{req.contact_person_name}</span>
                           </div>
                           <span className="material-symbols-outlined text-slate-200">contact_mail</span>
                        </div>
                     </div>

                     <button 
                        onClick={() => handleReconsider(req.id)}
                        disabled={isProcessing === req.id}
                        className="w-full bg-[#006C75] text-white font-bold text-[10px] uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-[#006C75]/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                     >
                        {isProcessing === req.id ? 'Processing...' : 'Move to Pending Queue'}
                     </button>
                  </div>
               ))}
            </div>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-200">history_toggle_off</span>
            </div>
            <p className="font-semibold text-slate-400 uppercase text-xs tracking-[0.2em]">No rejected applications found</p>
          </div>
        )}
      </div>
    </div>

  );
};

export default SuperadminRejected;
