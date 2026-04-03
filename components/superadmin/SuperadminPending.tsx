import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getOnboardingRequests, OnboardingRequest } from '../../services/superadminService';
import { supabase } from '../../services/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useToast } from '../ToastContainer';

const SuperadminPending: React.FC = () => {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<OnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(() => {
      loadRequests(false);
      setLastUpdated(0);
    }, 60000);

    const timer = setInterval(() => setLastUpdated(prev => prev + 1), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, []);

  const loadRequests = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await getOnboardingRequests('pending');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(selectedRequest.id);
    try {
      console.log('Starting approval for request:', selectedRequest.id);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'exists' : 'missing');
      
      if (!session) {
        throw new Error("You are not logged in. Please refresh and try again.");
      }
      
      console.log('Calling approve-onboarding Edge Function...');
      const { data, error } = await supabase.functions.invoke('approve-onboarding', {
        body: { request_id: selectedRequest.id }
      });

      console.log('Edge Function response:', { data, error });

      if (error) {
        console.error('Edge Function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || error.toString() || "Approval failed");
      }
      
      if (!data || !data.success) {
        const errorMsg = data?.error || data?.details || "Approval failed";
        console.error('Approval failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setModalType(null);
      showToast('Onboarding request approved successfully', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    setIsProcessing(selectedRequest.id);
    try {
      const { data, error } = await supabase.functions.invoke('reject-onboarding', {
        body: { request_id: selectedRequest.id, rejection_reason: rejectionReason }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || "Rejection failed");
      }
      
      if (!data.success) {
        throw new Error(data?.error || "Rejection failed");
      }

      setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
      setModalType(null);
      setRejectionReason('');
      showToast('Onboarding request rejected', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">Loading Super Admin queue...</div>;
  }

  return (
    <div className="space-y-4 lg:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm gap-4">
        <div className="flex items-center gap-4 lg:gap-6 w-full sm:w-auto justify-between sm:justify-start">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            {60 - lastUpdated}s
          </div>
          <button onClick={() => loadRequests()} className="text-[#006C75] font-black text-xs lg:text-sm hover:underline flex items-center gap-1 uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
        
        <Link 
          to="/superadmin/rejected" 
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-lg">history_toggle_off</span>
          Rejected Applications
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-12 lg:p-20 text-center shadow-sm">
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl lg:text-5xl">verified</span>
          </div>
          <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-2 font-inter">Queue is Empty!</h3>
          <p className="text-sm text-slate-500 font-inter">All caught up. No pending registrations to review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="py-4 px-8 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pharmacy Details</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Person</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">PCN Number</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Submitted</th>
                    <th className="py-4 px-8 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</th>
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
                        <div className="flex flex-col">
                           <span className="font-bold">{req.contact_person_name}</span>
                           <span className="text-[10px] text-slate-400">{req.pharmacy_phone}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">
                          {req.pcn_number || 'UNVERIFIED'}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => { setSelectedRequest(req); setModalType('approve'); }}
                            className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-2"
                          >
                             <span className="material-symbols-outlined text-base">check_circle</span>
                             Approve
                          </button>
                          <button 
                            onClick={() => { setSelectedRequest(req); setModalType('reject'); }}
                            className="bg-white border border-slate-200 text-red-400 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                          >
                             <span className="material-symbols-outlined text-base">cancel</span>
                             Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-6xl">receipt</span>
                </div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-xl font-black text-slate-800 leading-tight pr-8">{req.pharmacy_name}</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">
                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                  </span>
                </div>

                <div className="space-y-3 mb-6 relative z-10">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="material-symbols-outlined text-lg text-slate-300">person</span>
                    <span className="font-bold">{req.contact_person_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="material-symbols-outlined text-lg text-slate-300">mail</span>
                    <span className="truncate font-medium">{req.pharmacy_email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="material-symbols-outlined text-lg text-slate-300">badge</span>
                    <span className="uppercase text-[10px] font-black tracking-widest bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                      {req.pcn_number || 'UNVERIFIED'}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 flex gap-3 relative z-10">
                  <button 
                    onClick={() => { setSelectedRequest(req); setModalType('approve'); }}
                    className="flex-1 bg-[#006C75] text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] transition-all flex items-center justify-center gap-2"
                  >
                     <span className="material-symbols-outlined text-base">check_circle</span>
                     Approve
                  </button>
                  <button 
                    onClick={() => { setSelectedRequest(req); setModalType('reject'); }}
                    className="px-4 py-3 border border-red-100 text-red-400 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center"
                    title="Reject"
                  >
                     <span className="material-symbols-outlined text-xl">cancel</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {modalType === 'approve' && selectedRequest && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Confirm Approval</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">
              You are approving <strong>{selectedRequest.pharmacy_name}</strong>. Their admin will receive a setup link at <strong>{selectedRequest.pharmacy_email}</strong>.
            </p>
            
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8 space-y-2">
              <p className="text-emerald-800 font-bold mb-1 tracking-tight">Access Token Validated</p>
              <div className="flex justify-between text-xs text-emerald-600 font-bold uppercase tracking-widest">
                <span>Access Code</span>
                <span>{selectedRequest.access_code}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setModalType(null)} 
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleApprove}
                disabled={!!isProcessing}
                className="flex-[2] bg-[#006C75] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing === selectedRequest.id ? 'Processing...' : 'Approve & Send Email'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reject Modal */}
      {modalType === 'reject' && selectedRequest && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl p-8">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Reject Application</h3>
            <p className="text-slate-500 mb-6">Tell the pharmacy why their application was rejected. This is required.</p>
            
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rejection Reason</label>
            <textarea 
              autoFocus
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 focus:outline-none transition-all placeholder-slate-300 mb-8"
              placeholder="e.g. Your PCN registration could not be verified. Please re-upload your document."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div className="flex gap-4">
              <button 
                onClick={() => setModalType(null)} 
                className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!!isProcessing || !rejectionReason.trim()}
                className="flex-[2] bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {isProcessing === selectedRequest.id ? 'Processing...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SuperadminPending;
