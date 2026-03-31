import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTenantSubscription } from '../services/database';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContainer';
import PaystackPop from '@paystack/inline-js';
import { useTenantGuard } from '../hooks/useTenantGuard';

const FALLBACK_PRICES: Record<string, { monthly: number, annual: number }> = {
  basic: { monthly: 10000, annual: 100000 },
  pro: { monthly: 20000, annual: 200000 },
  enterprise: { monthly: 0, annual: 0 }
};

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    'Single branch support',
    'Up to 5 users',
    'Basic inventory management',
    'POS & billing',
    'AI Consult Assistant',
    'Email support',
    'Daily backups'
  ],
  pro: [
    'Up to 3 branches',
    'Up to 15 users',
    'Advanced inventory & expiry tracking',
    'Real-time analytics dashboard',
    'AI Consult Assistant (Advanced)',
    'Role-based access control',
    'Priority support',
    'Audit logs'
  ],
  enterprise: [
    'Unlimited branches',
    'Unlimited users',
    'AI Consult Assistant (Premium)',
    'Custom integrations',
    'Dedicated account manager',
    '24/7 phone support',
    'Custom training',
    'SLA guarantee'
  ]
};

const SubscriptionPage: React.FC = () => {
  const { profile, user, isTenantAdmin, isSuperAdmin, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { isExpiredGifted } = useTenantGuard();
  
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  
  const [prices, setPrices] = useState<Record<string, { monthly: number, annual: number }>>(FALLBACK_PRICES);
  const [pricingLoading, setPricingLoading] = useState(true);

  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (profile?.tenant_id) {
      loadSubscription();
      loadPricing();
      loadHistory();
    }
  }, [profile?.tenant_id]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const data = await getTenantSubscription(profile!.tenant_id!);
      setSubscription(data);
      if (data.billingCycle === 'monthly' || data.billing_cycle === 'monthly') {
          setBillingCycle('monthly');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      showToast('Failed to load subscription details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPricing = async () => {
    try {
      setPricingLoading(true);
      const { data, error } = await supabase.from('pricing_config').select('*').eq('is_active', true);
      if (error) throw error;
      
      if (data && data.length > 0) {
        const newPrices: any = { basic: { monthly: 0, annual: 0 }, pro: { monthly: 0, annual: 0 }, enterprise: { monthly: 0, annual: 0 }};
        data.forEach(item => {
          if (!newPrices[item.plan]) newPrices[item.plan] = {};
          newPrices[item.plan][item.billing_cycle] = item.amount_naira;
        });
        setPrices(newPrices);
      }
    } catch (e) {
      console.error('Failed to load dynamic pricing, using fallbacks', e);
      setPrices(FALLBACK_PRICES);
    } finally {
      setPricingLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', profile!.tenant_id!)
        .in('action', ['subscription.renewed', 'subscription.upgraded', 'subscription.trial_started'])
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePaystackCheckout = (action: 'renew' | 'upgrade', targetPlan: string, amount: number) => {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      showToast('Payment gateway is not configured', 'error');
      return;
    }

    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: paystackKey,
      email: user?.email || '',
      amount: amount * 100, // Convert to Kobo
      ref: `PHRX_${action.toUpperCase()}_${Date.now()}`,
      onSuccess: async (transaction: any) => {
        setIsProcessing(true);
        try {
          const functionName = action === 'upgrade' ? 'process-upgrade' : 'process-renewal';
          const payload = action === 'upgrade' 
            ? { paystack_reference: transaction.reference, tenant_id: profile!.tenant_id, new_plan: targetPlan }
            : { paystack_reference: transaction.reference, tenant_id: profile!.tenant_id, plan: targetPlan, billing_cycle: billingCycle };

          const { data, error } = await supabase.functions.invoke(functionName, {
            body: payload
          });

          if (error || data?.error) {
            throw error || new Error(data?.error);
          }

          showToast(`Successfully ${action === 'upgrade' ? 'upgraded' : 'renewed'} subscription!`, 'success');
          await loadSubscription();
          await loadHistory();
          await refreshProfile();
        } catch (error: any) {
          console.error(`Payment ${action} failed:`, error);
          showToast(`Payment processed, but ${action} failed. Contact support.`, 'error');
        } finally {
          setIsProcessing(false);
        }
      },
      onCancel: () => {
        showToast('Payment cancelled', 'info');
      }
    });
  };

  if (!isTenantAdmin() && !isSuperAdmin()) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <span className="material-symbols-outlined text-red-500 text-4xl mb-2">lock</span>
          <h3 className="text-lg font-bold text-red-700 mb-2">Access Denied</h3>
          <p className="text-sm text-red-600">
            You must be a Tenant Administrator to manage subscriptions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading subscription data...</div>;
  }

  const currentPlan = subscription?.plan || 'basic';
  const currentStatus = subscription?.status || 'trialing';
  const isTrialing = currentStatus === 'trialing';
  const rawStatus = (subscription?.status || '').replace('_', ' ');

  const tEnds = subscription?.trialEndsAt || subscription?.trial_ends_at;
  const sEnds = subscription?.subscriptionExpiresAt || subscription?.subscription_expires_at;
  
  const expiryDate = isTrialing ? (tEnds ? new Date(tEnds) : null) : (sEnds ? new Date(sEnds) : null);
  const now = new Date();
  
  let daysRemaining = 0;
  if (expiryDate) {
    daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const handleActionClick = (targetPlan: string) => {
    if (targetPlan === currentPlan) {
      handlePaystackCheckout('renew', targetPlan, prices[targetPlan]?.[billingCycle] || 0);
    } else {
      handlePaystackCheckout('upgrade', targetPlan, prices[targetPlan]?.[billingCycle] || 0);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Expired Beta Widget */}
      {isExpiredGifted && (
        <div className="p-8 rounded-3xl border-2 bg-amber-50 border-amber-200 text-amber-900 flex flex-col md:flex-row items-center justify-between text-left gap-8 shadow-xl shadow-amber-900/5">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-4xl text-amber-500">stars</span>
                <h3 className="text-3xl font-black">Your Beta Period Has Ended</h3>
             </div>
             <p className="font-medium text-amber-800 text-base max-w-xl">
               Thank you for participating in the PharmaCore beta! Your gifted access has now concluded. 
               Choose a plan below to keep your data and continue using your workspace.
             </p>
          </div>
          <button onClick={() => window.scrollTo({ top: 400, behavior: 'smooth'})} className="animate-bounce shrink-0 w-14 h-14 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all">
             <span className="material-symbols-outlined text-xl">arrow_downward</span>
          </button>
        </div>
      )}

      {/* Trial Countdown Widget */}
      {isTrialing && !isExpiredGifted && (
        <div className={`p-8 rounded-3xl border-2 flex flex-col md:flex-row items-center gap-8 ${
          daysRemaining <= 3 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-white border-blue-100 shadow-xl shadow-blue-50 text-slate-800'
        }`}>
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-2">
                <span className={`material-symbols-outlined text-3xl ${daysRemaining <= 3 ? 'text-red-500' : 'text-blue-500'}`}>
                  {daysRemaining <= 3 ? 'warning' : 'timer'}
                </span>
                <h3 className="text-2xl font-black">Free Trial Status</h3>
             </div>
             <p className={`font-medium ${daysRemaining <= 3 ? 'text-red-600' : 'text-slate-500'}`}>
               {daysRemaining <= 3 
                 ? "Subscribe now to keep your data and avoid interruption."
                 : "You're currently exploring PharmaCore on a free trial."}
             </p>
          </div>
          <div className="w-full md:w-auto flex flex-col items-center min-w-[200px]">
             <span className={`text-6xl font-black ${daysRemaining <= 3 ? 'text-red-600' : 'text-blue-600'}`}>{daysRemaining}</span>
             <span className="text-sm font-bold uppercase tracking-widest opacity-80 mt-1">Days Remaining</span>
             <div className="w-full h-2 bg-slate-200 rounded-full mt-4 overflow-hidden">
               <div 
                 className={`h-full rounded-full transition-all duration-1000 ${daysRemaining <= 3 ? 'bg-red-500' : 'bg-blue-500'}`} 
                 style={{ width: `${Math.min(100, Math.max(0, ((30 - daysRemaining) / 30) * 100))}%` }}
               ></div>
             </div>
          </div>
          {daysRemaining <= 3 && (
            <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth'})} className="animate-bounce w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-red-200 hover:bg-red-700">
               <span className="material-symbols-outlined">arrow_downward</span>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Subscription & Billing</h2>
          <p className="text-sm text-slate-500">Manage your organization's subscription plan</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-[#006C75] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${billingCycle === 'annual' ? 'bg-white text-[#006C75] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Annually (Save 20%)
          </button>
        </div>
      </div>

      {/* Current Subscription Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#006C75]/10 text-[#006C75] rounded-xl">
              <span className="material-symbols-outlined text-3xl">workspace_premium</span>
            </div>
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-2xl font-black capitalize text-slate-800">{currentPlan} Plan</h3>
                 <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    currentStatus === 'active' ? 'bg-green-100 text-green-700' :
                    currentStatus === 'trialing' ? 'bg-blue-100 text-blue-700' :
                    currentStatus === 'grace_period' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                 }`}>{rawStatus}</span>
               </div>
               <p className="text-sm text-slate-500">
                 {isTrialing ? `Trial ends in ${daysRemaining} days` : `Renews in ${daysRemaining} days on ${expiryDate?.toLocaleDateString()}`}
               </p>
            </div>
          </div>
          
          <div className="w-full md:w-auto">
             <button 
               onClick={() => handleActionClick(currentPlan)}
               disabled={isProcessing}
               className="w-full md:w-auto px-6 py-3 bg-[#006C75] text-white rounded-xl font-bold shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] transition-all disabled:opacity-50"
             >
               {isProcessing ? 'Processing...' : (isTrialing ? 'Subscibe Now' : 'Renew Subscription')}
             </button>
          </div>
        </div>
        
        {subscription?.pending_plan && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex items-center gap-2">
            <span className="material-symbols-outlined">info</span>
            Your plan will automatically change to the <strong>{subscription.pending_plan}</strong> plan at the end of your billing cycle.
          </div>
        )}
      </div>

      {/* Plans Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['basic', 'pro', 'enterprise'].map((planKey) => {
          const isCurrent = currentPlan === planKey;
          const targetPrice = prices[planKey]?.[billingCycle] || 0;
          
          return (
            <div key={planKey} className={`relative bg-white rounded-3xl border-2 transition-all flex flex-col mt-4 ${
              isCurrent ? 'border-[#006C75] shadow-2xl shadow-[#006C75]/10 scale-100 z-10' : 'border-slate-100 hover:border-slate-200 opacity-90 hover:opacity-100'
            }`}>
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#006C75] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#006C75]/30">
                  Current Plan
                </div>
              )}
              
              <div className="p-8 flex-1">
                <h3 className="text-2xl font-black capitalize mb-6 text-slate-800">{planKey}</h3>
                <div className="mb-8 min-h-[60px]">
                  {pricingLoading ? (
                    <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-lg"></div>
                  ) : planKey === 'enterprise' ? (
                    <span className="text-4xl font-black text-slate-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-black text-slate-900">₦{targetPrice.toLocaleString()}</span>
                      <span className="text-slate-500 font-bold ml-1">/{billingCycle === 'annual' ? 'year' : 'mo'}</span>
                    </>
                  )}
                </div>
                
                <ul className="space-y-4 mb-8">
                  {PLAN_FEATURES[planKey].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                      <span className="material-symbols-outlined text-[#006C75] text-lg bg-[#006C75]/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">check</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-8 pt-0 mt-auto">
                 <button 
                   onClick={() => handleActionClick(planKey)}
                   disabled={isCurrent || isProcessing}
                   className={`w-full py-4 rounded-xl font-bold transition-all ${
                     isCurrent 
                       ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                       : 'bg-[#006C75] text-white hover:bg-[#005a62] shadow-xl shadow-[#006C75]/20'
                   }`}
                 >
                   {isCurrent ? 'Current Plan' : planKey === 'enterprise' ? 'Contact Sales' : `Select ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`}
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment History Table */}
      <div className="mt-16 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
           <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
             <span className="material-symbols-outlined text-slate-400">history</span>
             Payment History
           </h3>
         </div>
         {historyLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl"></div>)}
            </div>
         ) : paymentHistory.length === 0 ? (
            <div className="p-16 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-200 mb-3">receipt_long</span>
              <p className="text-slate-500 font-medium">No payment history yet.</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr>
                    <th className="py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Date</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Event</th>
                    <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Plan Details</th>
                    <th className="py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Reference / User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentHistory.map((log) => {
                    let displayEvent = log.action;
                    if (log.action === 'subscription.renewed') displayEvent = 'Subscription Renewed';
                    if (log.action === 'subscription.upgraded') displayEvent = 'Plan Upgraded';
                    if (log.action === 'subscription.trial_started') displayEvent = 'Trial Started';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-5 px-8">
                          <span className="text-sm font-bold text-slate-700">{new Date(log.created_at).toLocaleDateString()}</span>
                        </td>
                        <td className="py-5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#006C75]/10 text-[#006C75]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006C75]"></span>
                            {displayEvent}
                          </span>
                        </td>
                        <td className="py-5 px-4">
                           <span className="text-sm font-medium text-slate-500">-</span>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded">{log.user_id ? log.user_id.split('-')[0] : 'System'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
         )}
      </div>

    </div>
  );
};

export default SubscriptionPage;
