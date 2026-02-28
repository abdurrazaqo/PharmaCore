import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface BalanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
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

const BalanceHistoryModal: React.FC<BalanceHistoryModalProps> = ({ isOpen, onClose, customerId, customerName }) => {
  const [history, setHistory] = useState<BalanceChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && customerId) {
      loadBalanceHistory();
    }
  }, [isOpen, customerId]);

  const loadBalanceHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase!
        .from('balance_history')
        .select('*')
        .eq('customer_id', customerId)
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
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white dark:bg-surface-dark rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Balance History</h2>
            <p className="text-sm text-slate-500">{customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">history</span>
              <p className="text-slate-500">No balance changes recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.changeAmount > 0 ? 'bg-green-100 text-green-600' : 
                        item.changeAmount < 0 ? 'bg-red-100 text-red-600' : 
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {item.changeAmount > 0 ? 'add' : item.changeAmount < 0 ? 'remove' : 'edit'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm dark:text-white">
                          {item.changeType === 'add' ? 'Added to Balance' : 
                           item.changeType === 'subtract' ? 'Subtracted from Balance' : 
                           'Balance Set'}
                        </p>
                        <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${
                        item.changeAmount > 0 ? 'text-green-600' : 
                        item.changeAmount < 0 ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {item.changeAmount > 0 ? '+' : ''}₦{Math.abs(item.changeAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Previous: ₦{item.previousBalance.toFixed(2)}</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    <span>New: ₦{item.newBalance.toFixed(2)}</span>
                  </div>
                  
                  {item.reason && (
                    <div className="mt-2 text-xs text-slate-500 italic">
                      Note: {item.reason}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-slate-400">
                    By: {item.createdBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceHistoryModal;
