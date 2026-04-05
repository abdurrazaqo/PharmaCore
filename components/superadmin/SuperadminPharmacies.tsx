import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getTenants, suspendTenant, reactivateTenant, changeTenantPlan, extendSubscription, deleteTenant } from '../../services/superadminService';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../ToastContainer';

const SuperadminPharmacies: React.FC = () => {
  const { filter } = useParams();
  const { showToast } = useToast();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(filter || 'all');
  
  // Modal states
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [actionModal, setActionModal] = useState<'suspend' | 'plan' | 'extend' | 'delete' | 'details' | 'notify' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form states
  const [reason, setReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [extensionDays, setExtensionDays] = useState(30);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [notificationType, setNotificationType] = useState('trial_reminder');
  
  // Dropdown states
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTenants();
  }, [statusFilter]);

  const loadTenants = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 1. Fetch Tenants
      const data = await getTenants({ status: statusFilter === 'all' ? null : statusFilter });
      console.log('PharmaCore Debug: Tenants data received:', data);
      
      // 2. Fetch Active Users across all tenants to compute precise counts
      // This bypasses the schema relationship issue
      const { data: userData, error: usersError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('is_suspended', false);
      
      if (!usersError && userData) {
        const counts: Record<string, number> = {};
        userData.forEach(u => {
          if (u.tenant_id) {
            counts[u.tenant_id] = (counts[u.tenant_id] || 0) + 1;
          }
        });
        setUserCounts(counts);
      }

      setTenants(data || []);
    } catch (err: any) {
      console.error('PharmaCore Debug: Error loading tenants:', err);
      setLoadError(err.message || 'Failed to load pharmacy data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setIsProcessing(true);
    try {
      await action();
      showToast(successMsg, 'success');
      setActionModal(null);
      loadTenants();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendNotification = async () => {
    setIsProcessing(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('Session expired. Please log in again.', 'error');
      setIsProcessing(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-renewal-notification', {
        body: { tenant_id: selectedTenant.id, notification_type: notificationType },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (error || data?.error) throw error || new Error(data?.error);
      showToast(`Notification sent successfully to ${selectedTenant.pharmacy_email}`, 'success');
      setActionModal(null);
    } catch (err: any) {
      console.error('Notification Error:', err);
      let errMsg = err.message;
      if (err.context) {
        try {
          const body = await err.context.json();
          errMsg = body.error || body.message || errMsg;
        } catch (e) { /* ignore */ }
      }
      showToast(`Failed: ${errMsg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'suspended': return 'bg-red-50 text-red-600 border-red-100';
      case 'grace_period': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'trial': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'deleted': return 'bg-slate-100 text-slate-400 border-slate-200';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-amber-600 text-white';
      case 'pro': return 'bg-[#006C75] text-white';
      case 'basic': return 'bg-slate-500 text-white';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.pharmacy_email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 lg:space-y-8 pb-12">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm transition-all">
        <div className="flex-1 relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#006C75] transition-colors">search</span>
          <input 
            type="text" 
            placeholder="Search by pharmacy name or email..."
            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-[#006C75]/20 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 min-w-0">
          <div className="relative flex-1 md:w-48 md:flex-none">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full flex items-center gap-2 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-[#006C75]/20 truncate justify-between"
            >
              <span className="truncate">
                {statusFilter === 'all' ? 'All Statuses' : 
                 statusFilter === 'active' ? 'Active' :
                 statusFilter === 'trial' ? 'In Trial' :
                 statusFilter === 'suspended' ? 'Suspended' :
                 statusFilter === 'grace_period' ? 'Grace Period' :
                 statusFilter === 'deleted' ? 'Deleted' : 'All Statuses'}
              </span>
              <span className="material-symbols-outlined text-[20px] text-slate-400">expand_more</span>
            </button>
            
            {showStatusDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white text-slate-800 rounded-xl shadow-2xl py-2 overflow-hidden border border-slate-200 z-20">
                  {[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'trial', label: 'In Trial' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'grace_period', label: 'Grace Period' },
                    { value: 'deleted', label: 'Deleted' }
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => { setStatusFilter(status.value); setShowStatusDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex justify-between items-center transition-colors ${
                        statusFilter === status.value ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{status.label}</span>
                      {statusFilter === status.value && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="space-y-4 p-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredTenants.length > 0 ? (
          <div className="p-0">
            {/* Adaptive Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="py-5 px-4 lg:px-8 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Pharmacy Details</th>
                    <th className="py-5 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 hidden sm:table-cell">Plan</th>
                    <th className="py-5 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">Status</th>
                    <th className="py-5 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center hidden lg:table-cell">Users</th>
                    <th className="py-5 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 hidden md:table-cell">Expiry / Trial</th>
                    <th className="py-5 px-4 lg:px-8 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} 
                        className="hover:bg-[#006C75]/[0.02] transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-[#006C75]"
                        onClick={() => { setSelectedTenant(tenant); setActionModal('details'); }}
                    >
                      <td className="py-6 px-4 lg:px-8">
                        <p className="font-semibold text-xs lg:text-sm text-slate-800 mb-0.5 group-hover:text-[#006C75] transition-colors truncate max-w-[120px] lg:max-w-none">{tenant.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium font-mono truncate max-w-[120px] lg:max-w-none">{tenant.pharmacy_email}</p>
                      </td>
                      <td className="py-6 px-4 hidden sm:table-cell">
                        <span className={`text-[9px] lg:text-[10px] font-semibold px-2 py-0.5 lg:py-1 rounded-full uppercase tracking-widest shadow-sm ${getPlanColor(tenant.plan)}`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-center">
                        <span className={`text-[9px] lg:text-[10px] font-semibold px-2 py-0.5 lg:py-1 rounded-full border shadow-sm ${getStatusColor(tenant.status)} uppercase tracking-widest`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-center hidden lg:table-cell">
                        <div className="flex items-center justify-center gap-2">
                           <span className="material-symbols-outlined text-[18px] text-slate-300">group</span>
                           <span className="text-sm font-semibold text-slate-600 font-mono">
                             {userCounts[tenant.id] || 0}
                           </span>
                        </div>
                      </td>
                      <td className="py-6 px-4 hidden md:table-cell">
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-slate-600">
                            {tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 
                             tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
                          </p>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter">
                            {tenant.subscription_expires_at ? 'Subscription' : 'Trial Period'}
                          </p>
                        </div>
                      </td>
                      <td className="py-6 px-4 lg:px-8 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative group/menu inline-block">
                          <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-[#006C75] shadow-sm hover:shadow-md">
                            <span className="material-symbols-outlined text-xl">more_vert</span>
                          </button>
                          <div className="absolute right-0 top-full pt-1 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all z-[30]">
                             <div className="bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 w-48">
                               <button onClick={() => { setSelectedTenant(tenant); setActionModal('details'); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
                                 <span className="material-symbols-outlined text-lg text-slate-400">visibility</span> View Details
                               </button>
                               <button onClick={() => { setSelectedTenant(tenant); setActionModal('notify'); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50">
                                 <span className="material-symbols-outlined text-lg text-slate-400">mail</span> Send Notification
                               </button>
                               {tenant.status !== 'suspended' && tenant.status !== 'deleted' && (
                                 <button onClick={() => { setSelectedTenant(tenant); setActionModal('suspend'); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 flex items-center gap-3">
                                   <span className="material-symbols-outlined text-lg">block</span> Suspend
                                 </button>
                               )}
                               {tenant.status === 'suspended' && (
                                 <button onClick={() => handleAction(() => reactivateTenant(tenant.id), "Tenant reactivated")} className="w-full text-left px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-3">
                                   <span className="material-symbols-outlined text-lg">check_circle</span> Reactivate
                                 </button>
                               )}
                               <button onClick={() => { setSelectedTenant(tenant); setActionModal('plan'); setNewPlan(tenant.plan); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-[#006C75] hover:bg-[#006C75]/5 flex items-center gap-3">
                                 <span className="material-symbols-outlined text-lg">swap_horiz</span> Plan change
                               </button>
                               <button onClick={() => { setSelectedTenant(tenant); setActionModal('extend'); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center gap-3 border-b border-slate-50">
                                 <span className="material-symbols-outlined text-lg">more_time</span> Extend Access
                               </button>
                               <button onClick={() => { setSelectedTenant(tenant); setActionModal('delete'); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-colors">
                                 <span className="material-symbols-outlined text-lg">delete</span> Delete
                               </button>
                             </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : loadError ? (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-5xl text-rose-500 mb-4">error</span>
            <p className="font-semibold text-slate-800 mb-2">Connection Error</p>
            <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto">{loadError}</p>
            <button 
              onClick={loadTenants}
              className="mt-6 px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 font-light">search_off</span>
            <p className="font-semibold text-slate-500 italic uppercase tracking-wider">No matching pharmacies found</p>
          </div>
        )}
      </div>


      {/* Modals */}
      {actionModal === 'suspend' && selectedTenant && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-2">Suspend Service</h3>
            <p className="text-slate-500 mb-6 font-medium">Enter the reason for suspension. This will be shown to the pharmacy users.</p>
            <textarea 
              autoFocus
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-red-500 focus:outline-none transition-all mb-8"
              placeholder="e.g. Account overdue for more than 30 days."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setActionModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl">Cancel</button>
              <button 
                onClick={() => handleAction(() => suspendTenant(selectedTenant.id, reason), "Tenant suspended")}
                disabled={isProcessing || !reason.trim()}
                className="flex-[2] bg-red-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {actionModal === 'notify' && selectedTenant && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-2">Send Notification</h3>
            <p className="text-slate-500 mb-6 font-medium">Manually send an official billing lifecycle email to <strong>{selectedTenant.pharmacy_email}</strong>.</p>
            
            <div className="space-y-4 mb-8">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">Notification Type</label>
              <div className="relative">
                <button
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="w-full flex items-center gap-2 py-4 px-5 bg-slate-50 border border-slate-200 rounded-2xl focus:border-[#006C75] focus:ring-1 focus:ring-[#006C75] font-semibold text-slate-700 justify-between"
                >
                  <span className="font-semibold">
                    {notificationType === 'trial_reminder' ? 'Trial Reminder Notice' :
                     notificationType === 'renewal_reminder' ? 'Subscription Renewal Reminder' :
                     notificationType === 'grace_period' ? 'Grace Period (Expired) Notice' :
                     notificationType === 'suspended' ? 'Account Suspension Notice' : 'Select Type'}
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-slate-400">expand_more</span>
                </button>
                
                {showNotificationDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNotificationDropdown(false)} />
                    <div className="absolute left-0 top-full mt-2 w-full bg-white text-slate-800 rounded-xl shadow-2xl py-2 overflow-hidden border border-slate-200 z-20">
                      {[
                        { value: 'trial_reminder', label: 'Trial Reminder Notice' },
                        { value: 'renewal_reminder', label: 'Subscription Renewal Reminder' },
                        { value: 'grace_period', label: 'Grace Period (Expired) Notice' },
                        { value: 'suspended', label: 'Account Suspension Notice' }
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => { setNotificationType(type.value); setShowNotificationDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex justify-between items-center transition-colors ${
                            notificationType === type.value ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="font-semibold">{type.label}</span>
                          {notificationType === type.value && <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setActionModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
              <button 
                onClick={handleSendNotification}
                disabled={isProcessing}
                className="flex-[2] bg-[#006C75] text-white font-semibold py-4 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {isProcessing ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {actionModal === 'plan' && selectedTenant && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
               <span className="material-symbols-outlined text-3xl text-[#006C75]">loyalty</span>
               Change Subscription Plan
            </h3>
            <div className="space-y-3 mb-10">
              {['basic', 'pro', 'enterprise'].map(p => (
                <button 
                  key={p}
                  onClick={() => setNewPlan(p)}
                  className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group 
                    ${newPlan === p ? 'border-[#006C75] bg-[#006C75]/5' : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="text-left">
                    <p className={`font-semibold uppercase tracking-widest text-sm ${newPlan === p ? 'text-[#006C75]' : 'text-slate-600'}`}>{p}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Change to {p} plan immediately</p>
                  </div>
                  {newPlan === p && <span className="material-symbols-outlined text-[#006C75]">check_circle</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setActionModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl">Cancel</button>
              <button 
                onClick={() => handleAction(() => changeTenantPlan(selectedTenant.id, newPlan), "Plan changed")}
                disabled={isProcessing || newPlan === selectedTenant.plan}
                className="flex-[2] bg-[#006C75] text-white font-semibold py-4 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50"
              >
                Update Plan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {actionModal === 'extend' && selectedTenant && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
               <span className="material-symbols-outlined text-3xl text-indigo-600">more_time</span>
               Extend Subscription
            </h3>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
               <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Number of days to add</label>
               <input 
                 type="number" 
                 autoFocus
                 className="w-full text-4xl font-semibold text-slate-800 bg-transparent border-none focus:ring-0 p-0 mb-2"
                 value={extensionDays}
                 onChange={(e) => setExtensionDays(parseInt(e.target.value) || 0)}
               />
               <p className="text-xs font-semibold text-slate-400">Default extension is 30 days.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setActionModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl">Cancel</button>
              <button 
                onClick={() => handleAction(() => extendSubscription(selectedTenant.id, extensionDays), "Subscription extended")}
                disabled={isProcessing || extensionDays <= 0}
                className="flex-[2] bg-indigo-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {actionModal === 'delete' && selectedTenant && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 lg:p-8 animate-in fade-in zoom-in duration-300">
            <h3 className="text-xl lg:text-2xl font-semibold text-red-600 mb-2">Delete Pharmacy?</h3>
            <p className="text-slate-500 mb-8 leading-relaxed text-sm lg:text-base">
              This will soft-delete the pharmacy and block all users. To confirm, type the pharmacy name exactly: <strong>{selectedTenant.name}</strong>
            </p>
            <input 
              type="text" 
              autoFocus
              className="w-full p-5 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-semibold mb-8 focus:ring-2 focus:ring-red-200 outline-none"
              placeholder="Type pharmacy name to confirm"
              value={confirmDeleteName}
              onChange={(e) => setConfirmDeleteName(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setActionModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-4 rounded-2xl">Cancel</button>
              <button 
                onClick={() => handleAction(() => deleteTenant(selectedTenant.id), "Tenant deleted")}
                disabled={isProcessing || confirmDeleteName !== selectedTenant.name}
                className="flex-[2] bg-red-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50"
              >
                Delete Pharmacy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Slide-over */}
      {actionModal === 'details' && selectedTenant && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
             <header className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold text-white text-xl ${getPlanColor(selectedTenant.plan)}`}>
                    {selectedTenant.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800">{selectedTenant.name}</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{selectedTenant.plan} Plan • {selectedTenant.status}</p>
                  </div>
                </div>
                <button onClick={() => setActionModal(null)} className="w-10 h-10 rounded-full hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined">close</span>
                </button>
             </header>

             <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 lg:space-y-12 custom-scrollbar">
                <div className="space-y-6">
                   <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Business Details</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                        <p className="font-semibold text-slate-700 break-all">{selectedTenant.pharmacy_email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                        <p className="font-semibold text-slate-700">{selectedTenant.pharmacy_phone}</p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Pharmacy Address</p>
                        <p className="font-semibold text-slate-700 break-words">{selectedTenant.pharmacy_address}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">PCN Number</p>
                        <p className="font-semibold text-slate-700 uppercase">{selectedTenant.pcn_number || 'N/A'}</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Subscription History</h4>
                   <div className="bg-slate-50 rounded-2xl p-5 lg:p-6 space-y-4">
                      <div className="flex justify-between items-center text-sm font-semibold gap-4">
                        <span className="text-slate-400">Approval Date</span>
                        <span className="text-slate-700 text-right">{selectedTenant.approved_at ? new Date(selectedTenant.approved_at).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold gap-4">
                        <span className="text-slate-400">Trial Ends</span>
                        <span className="text-slate-700 text-right">{selectedTenant.trial_ends_at ? new Date(selectedTenant.trial_ends_at).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold gap-4">
                        <span className="text-slate-400">Current Expiry</span>
                        <span className="text-[#006C75] text-right">{selectedTenant.subscription_expires_at ? new Date(selectedTenant.subscription_expires_at).toLocaleDateString('en-GB') : 'Active Trial'}</span>
                      </div>
                   </div>
                </div>
                
                {selectedTenant.status === 'suspended' && (
                  <div className="bg-red-50 p-5 lg:p-6 rounded-2xl border border-red-100 animate-pulse">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span> Suspension Reason
                    </p>
                    <p className="text-sm font-semibold text-red-800 italic break-words">"{selectedTenant.suspended_reason || 'No reason provided'}"</p>
                  </div>
                )}
             </div>

             <footer className="p-8 border-t border-slate-100 bg-slate-50/30 flex gap-4">
                <button 
                  onClick={() => setActionModal('suspend')}
                  className="flex-1 border border-red-200 text-red-500 font-semibold py-4 rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">block</span> Suspend
                </button>
                <button 
                  onClick={() => setActionModal('extend')}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">more_time</span> Extend
                </button>
             </footer>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SuperadminPharmacies;
