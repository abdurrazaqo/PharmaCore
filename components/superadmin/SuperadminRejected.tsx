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
          className="flex items-center gap-2 text-[#006C75] font-bold text-sm hover:underline transition-all"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Pending Requests
        </button>
        <h2 className="text-xl font-bold text-slate-800">Rejected Applications</h2>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
             {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50/50 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pharmacy Details</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Person</th>
                  <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rejection Reason</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-5 px-8">
                      <p className="font-bold text-sm text-slate-800">{req.pharmacy_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{req.pharmacy_email}</p>
                    </td>
                    <td className="py-5 px-4 font-medium text-slate-600 text-sm">
                      {req.contact_person_name}
                    </td>
                    <td className="py-5 px-4">
                      <p className="text-[10px] text-red-500 italic max-w-xs font-medium leading-relaxed bg-red-50 p-2 rounded-lg border border-red-100/50 inline-block shadow-sm">
                        {req.rejection_reason || 'No reason provided'}
                      </p>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <button 
                        onClick={() => handleReconsider(req.id)}
                        disabled={isProcessing === req.id}
                        className="bg-teal-50 border border-teal-100 text-[#006C75] text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-[#006C75] hover:text-white transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isProcessing === req.id ? 'Processing...' : 'Reconsider'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-200">history_toggle_off</span>
            </div>
            <p className="font-bold text-slate-400 uppercase text-xs tracking-[0.2em]">No rejected applications found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminRejected;
