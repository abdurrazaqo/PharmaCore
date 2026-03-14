import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContainer';

interface PatientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  onUpdateBalance: (id: string, newBalance: number, action: string, amount: number, reason: string) => Promise<void>;
  initialTab?: 'update' | 'history';
}

interface BalanceChange {
  id: string;
  customerId: string;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  changeType: 'add' | 'subtract' | 'set';
  reason: string;
  createdAt: string;
  createdBy: string;
}

const PatientBalanceModal: React.FC<PatientBalanceModalProps> = ({ 
  isOpen, 
  onClose, 
  customer, 
  onUpdateBalance,
  initialTab = 'update'
}) => {
  const [activeTab, setActiveTab] = useState<'update' | 'history'>(initialTab);
  const [history, setHistory] = useState<BalanceChange[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (activeTab === 'history' || initialTab === 'history') {
        loadBalanceHistory();
      }
    }
  }, [isOpen, customer?.id]);

  useEffect(() => {
    if (activeTab === 'history' && customer?.id) {
      loadBalanceHistory();
    }
  }, [activeTab]);

  const loadBalanceHistory = async () => {
    if (!customer?.id) return;
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase!
        .from('balance_history')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const camelData = data?.map((item: any) => ({
        id: item.id,
        customerId: item.customer_id,
        previousBalance: item.previous_balance,
        newBalance: item.new_balance,
        changeAmount: item.change_amount,
        changeType: item.change_type,
        reason: item.reason || '',
        createdAt: item.created_at,
        createdBy: item.created_by || 'System'
      })) || [];
      
      setHistory(camelData);
    } catch (error) {
      console.error('Error loading balance history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const action = formData.get('action') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const reason = formData.get('reason') as string;
    
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setProcessing(true);
    try {
      let newBalance = customer.balance;
      if (action === 'add') {
        newBalance += amount;
      } else if (action === 'subtract') {
        newBalance = Math.max(0, newBalance - amount);
      } else if (action === 'set') {
        newBalance = amount;
      }

      await onUpdateBalance(customer.id, newBalance, action, amount, reason);
      // Reload history if we're moving to history tab or just for fresh data
      await loadBalanceHistory();
      setActiveTab('history');
    } catch (error) {
      console.error('Error submitting balance update:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isOpen || !customer) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="text-lg font-bold dark:text-white leading-tight">Patient Balance</h3>
                <p className="text-xs text-slate-500 font-medium">{customer.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Current Balance Display */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-700 flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Balance</span>
            {(() => {
              const lastAdd = history.find(h => h.changeType === 'add' || h.changeType === 'set');
              const reference = lastAdd ? lastAdd.newBalance : customer.balance;
              const isLow = customer.balance > 0 && customer.balance < (reference * 0.3);
              const colorClass = customer.balance === 0 
                ? 'text-slate-900 dark:text-white' 
                : isLow ? 'text-rose-500' : 'text-emerald-500';
              
              return <span className={`text-xl font-black ${colorClass}`}>₦{customer.balance.toFixed(2)}</span>;
            })()}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('update')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'update' 
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Update
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history' 
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">history</span>
              History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {activeTab === 'update' ? (
            <form onSubmit={handleFormSubmit} className="flex flex-col h-full">
              <div className="flex-1 space-y-4 pb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'add', label: 'Add', icon: 'add_circle' },
                      { id: 'subtract', label: 'Subtract', icon: 'remove_circle' },
                      { id: 'set', label: 'Set New', icon: 'dataset' }
                    ].map((act) => (
                      <label 
                        key={act.id}
                        className="cursor-pointer flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-transparent bg-slate-50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
                      >
                        <input type="radio" name="action" value={act.id} defaultChecked={act.id === 'add'} className="hidden peer" />
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 peer-checked:bg-primary/20 peer-checked:text-primary transition-colors">
                          <span className="material-symbols-outlined text-lg">{act.icon}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 peer-checked:text-primary uppercase tracking-tighter">{act.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Amount (₦)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-bold">₦</span>
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0"
                      required
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-primary focus:ring-0 transition-colors font-bold dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Reason / Note</label>
                  <textarea
                    name="reason"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl focus:border-primary focus:ring-0 transition-colors text-sm dark:text-white resize-none"
                    placeholder="e.g., Payment received via Transfer, Manual Adjustment, etc."
                  />
                </div>
              </div>

              <div className="sticky bottom-0 pt-4 bg-white dark:bg-surface-dark border-t border-slate-100 dark:border-slate-800 mt-auto z-10 -mx-5 px-5">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mb-1"
                >
                  {processing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-medium">Fetching history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <span className="material-symbols-outlined text-4xl">history</span>
                  </div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No history found</p>
                  <p className="text-xs text-slate-400 mt-1">Updates will appear here once made</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                      item.changeType === 'add' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 
                      item.changeType === 'subtract' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20' : 
                      'bg-amber-100 text-amber-600 dark:bg-amber-900/20'
                    }`}>
                      <span className="material-symbols-outlined text-sm font-bold">
                        {item.changeType === 'add' ? 'add' : item.changeType === 'subtract' ? 'remove' : 'edit'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="font-bold text-xs dark:text-white truncate">
                          {item.changeType === 'add' ? 'Balance Added' : 
                           item.changeType === 'subtract' ? 'Balance Deducted' : 
                           'Balance Reference Set'}
                        </p>
                        <span className={`font-black text-sm ${
                          item.changeType === 'add' ? 'text-emerald-500' : 
                          item.changeType === 'subtract' ? 'text-rose-500' : 
                          'text-amber-500'
                        }`}>
                          {item.changeType === 'subtract' ? '-' : '+'}₦{Math.abs(item.changeAmount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mb-1.5">{formatDateTime(item.createdAt)}</p>
                      
                      <div className="bg-white/50 dark:bg-slate-800 p-2 rounded-lg text-[10px] space-y-1 mb-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Previous: ₦{item.previousBalance.toFixed(2)}</span>
                          <span className="text-slate-600 dark:text-slate-300 font-bold">New: ₦{item.newBalance.toFixed(2)}</span>
                        </div>
                      </div>

                      {item.reason && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-800/80 px-2 py-1.5 rounded-lg border-l-2 border-primary/30">
                          "{item.reason}"
                        </p>
                      )}
                      
                      <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1 font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[10px]">person</span>
                        {item.createdBy}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PatientBalanceModal;
