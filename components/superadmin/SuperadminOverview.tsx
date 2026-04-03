import React, { useState, useEffect } from 'react';
import { getPlatformMetrics, getOnboardingRequests, PlatformMetrics, OnboardingRequest, generateBetaInvite } from '../../services/superadminService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ToastContainer';

const SuperadminOverview: React.FC = () => {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [recentRequests, setRecentRequests] = useState<OnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, r] = await Promise.all([
        getPlatformMetrics(),
        getOnboardingRequests('pending')
      ]);
      setMetrics(m);
      setRecentRequests(r.slice(0, 5));
    } catch (err) {
      console.error('Failed to load superadmin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 md:h-32 bg-white rounded-2xl md:rounded-3xl border border-slate-100"></div>
          ))}
        </div>
        <div className="h-64 bg-white rounded-3xl border border-slate-100"></div>
      </div>
    );
  }

  const metricCards = [
    { label: 'Total Pharmacies', value: metrics?.totalPharmacies, icon: 'domain', color: 'bg-blue-50 text-blue-600' },
    { label: 'Active', value: metrics?.activePharmacies, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
    { 
      label: 'Pending Approvals', 
      value: metrics?.pendingApprovals, 
      icon: 'pending', 
      color: metrics?.pendingApprovals && metrics.pendingApprovals > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400',
      highlight: metrics?.pendingApprovals && metrics.pendingApprovals > 0
    },
    { label: 'In Trial', value: metrics?.inTrial, icon: 'timer', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Grace Period', value: metrics?.inGracePeriod, icon: 'event_repeat', color: 'bg-orange-50 text-orange-600' },
    { label: 'Total Revenue', value: `₦${metrics?.totalRevenue?.toLocaleString()}`, icon: 'payments', color: 'bg-[#006C75]/10 text-[#006C75]' },
  ];

  return (
    <div className="space-y-10 font-inter pb-12">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Platform Overview</h2>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">Real-time metrics & recent activity</p>
        </div>
        <button 
          onClick={async () => {
            setIsGenerating(true);
            try {
              const link = await generateBetaInvite();
              setGeneratedLink(link);
              loadData();
            } catch (err) {
              console.error('Failed to generate invite:', err);
              showToast('Failed to generate invite. Please check console for details.', 'error');
            } finally {
              setIsGenerating(false);
            }
          }}
          disabled={isGenerating}
          className="bg-[#006C75] text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 hover:bg-[#005a61] hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-xl">add_link</span>
          )}
          Generate Beta Invite
        </button>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-3 md:gap-6">
        {metricCards.map((card, i) => (
          <div key={i} className={`bg-white p-2.5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md ${card.highlight ? 'ring-2 ring-amber-400/20' : ''} flex flex-col items-center text-center md:items-start md:text-left min-w-0`}>
            <div className={`w-8 h-8 md:w-10 md:h-10 ${card.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-4 shrink-0`}>
              <span className="material-symbols-outlined text-lg md:text-2xl">{card.icon}</span>
            </div>
            <p className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-[0.05em] md:tracking-widest leading-tight whitespace-normal break-words w-full h-6 md:h-auto flex items-center justify-center md:justify-start">
              {card.label}
            </p>
            <h3 className="text-xs md:text-2xl font-black text-slate-800 mt-1 truncate w-full">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Pending Approvals */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006C75] text-lg">approval</span>
              Recent Pending Approvals
            </h3>
            <button onClick={() => navigate('/superadmin/pending')} className="text-[10px] font-black uppercase tracking-wider text-[#006C75] hover:text-[#005a61] transition-colors">View Queue &rarr;</button>
          </div>
          <div className="flex-1 p-0 overflow-x-auto">
            {recentRequests.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pharmacy Details</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Access Code</th>
                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <p className="font-bold text-sm text-slate-800">{req.pharmacy_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{req.contact_person_name}</p>
                      </td>
                      <td className="py-4 px-6">
                         <span className="bg-teal-50 text-[#006C75] text-[10px] font-black px-2 py-1 rounded-lg border border-teal-100">PHC-{req.access_code.slice(-4)}</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => navigate('/superadmin/pending')}
                          className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl group-hover:bg-[#006C75] group-hover:border-[#006C75] group-hover:text-white transition-all shadow-sm"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <p className="font-bold text-slate-800">No pending approvals 🎉</p>
                <p className="text-xs text-slate-500 mt-1">Everything is up to date.</p>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for platform activity */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006C75]">monitoring</span>
              Platform Activity
            </h3>
            <button onClick={() => navigate('/superadmin/audit-logs')} className="text-xs font-bold text-[#006C75] hover:underline">Full Logs &rarr;</button>
          </div>
          <div className="flex-1 p-12 text-center bg-slate-50/20">
             <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">history</span>
             <p className="text-sm text-slate-400 italic">Audit log stream loading...</p>
          </div>
        </div>
      </div>

      {/* Generated Link Modal */}
      {generatedLink && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setGeneratedLink(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="w-16 h-16 bg-teal-50 text-[#006C75] rounded-2xl flex items-center justify-center mb-6 border border-teal-100/50 shadow-inner">
              <span className="material-symbols-outlined text-3xl">link</span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-2">Beta Invite Generated!</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">
              Share this unique link to allow a new tenant to bypass payment and start a beta trial immediately. This link expires in 30 days.
            </p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center gap-3 relative group">
              <div className="flex-1 overflow-x-auto custom-scrollbar pb-1">
                 <code className="text-sm text-slate-600 font-mono whitespace-nowrap pl-2 select-all break-all">{generatedLink}</code>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  showToast('Copied to clipboard!', 'success');
                }}
                className="w-12 h-12 bg-white border border-slate-200 text-[#006C75] rounded-xl flex items-center justify-center shadow-sm hover:border-[#006C75] hover:bg-teal-50 hover:-translate-y-0.5 transition-all active:scale-95 shrink-0"
                title="Copy Link"
              >
                <span className="material-symbols-outlined text-xl">content_copy</span>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
               <button onClick={() => setGeneratedLink(null)} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest px-4 py-2 hover:bg-slate-50 rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperadminOverview;
