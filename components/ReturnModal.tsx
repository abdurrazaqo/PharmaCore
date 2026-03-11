import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastContainer';

interface ReturnModalProps {
  transactionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  returnedQuantity: number;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ transactionId, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadTransactionItems();
  }, [transactionId]);

  const loadTransactionItems = async () => {
    try {
      setLoading(true);
      
      // Get sale items for this transaction
      const { data: salesData, error: salesError } = await supabase!
        .from('sales')
        .select('id, product_id, quantity, unit_price, total_price')
        .eq('transaction_id', transactionId);

      if (salesError) throw salesError;

      if (!salesData || salesData.length === 0) {
        showToast('No items found for this transaction.', 'error');
        onClose();
        return;
      }

      // Get product details
      const productIds = salesData.map(s => s.product_id);
      const { data: productsData, error: productsError } = await supabase!
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsError) throw productsError;

      // Combine data
      const itemsWithNames = salesData.map(sale => {
        const product = productsData?.find(p => p.id === sale.product_id);
        return {
          id: sale.id,
          productId: sale.product_id,
          productName: product?.name || 'Unknown Product',
          quantity: sale.quantity,
          unitPrice: sale.unit_price,
          totalPrice: sale.total_price,
          returnedQuantity: 0
        };
      });

      setItems(itemsWithNames);
      
      // Initialize return quantities to empty (not prefilled)
      const initialQuantities: { [key: string]: number } = {};
      itemsWithNames.forEach(item => {
        initialQuantities[item.id] = 0;
      });
      setReturnQuantities(initialQuantities);
      
    } catch (error) {
      console.error('Error loading transaction items:', error);
      showToast('Failed to load transaction items. Please try again.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, value: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Ensure value is between 0 and available quantity
    const validValue = Math.max(0, Math.min(value, item.quantity));
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: validValue
    }));
  };

  const handleProcessReturn = async () => {
    try {
      // Check if any items are selected for return
      const itemsToReturn = Object.entries(returnQuantities).filter(([_, qty]) => qty > 0);
      
      if (itemsToReturn.length === 0) {
        showToast('Please select at least one item to return.', 'warning');
        return;
      }

      setProcessing(true);

      // Process each returned item
      for (const [itemId, returnQty] of itemsToReturn) {
        const item = items.find(i => i.id === itemId);
        if (!item) continue;

        // Get current stock
        const { data: product, error: fetchError } = await supabase!
          .from('products')
          .select('total_units')
          .eq('id', item.productId)
          .single();

        if (fetchError) throw fetchError;

        // Update product stock (add back returned quantity)
        const { error: stockError } = await supabase!
          .from('products')
          .update({
            total_units: product.total_units + returnQty
          })
          .eq('id', item.productId);

        if (stockError) throw stockError;
      }

      // Calculate refund amount
      const refundAmount = itemsToReturn.reduce((sum, [itemId, returnQty]) => {
        const item = items.find(i => i.id === itemId);
        return sum + (item ? item.unitPrice * returnQty : 0);
      }, 0);

      // Update transaction status to Refunded
      const { error: txError } = await supabase!
        .from('transactions')
        .update({ status: 'Refunded' })
        .eq('id', transactionId);

      if (txError) throw txError;

      showToast(`Return processed successfully! Refund Amount: ₦${refundAmount.toFixed(2)}`, 'success');
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error processing return:', error);
      showToast('Failed to process return. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const totalRefund = Object.entries(returnQuantities).reduce((sum, [itemId, returnQty]) => {
    const item = items.find(i => i.id === itemId);
    return sum + (item ? item.unitPrice * returnQty : 0);
  }, 0);

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold dark:text-white">Process Return</h2>
            <p className="text-xs text-slate-500">{transactionId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading items...</div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm dark:text-white">{item.productName}</h4>
                        <p className="text-xs text-slate-500">
                          {item.quantity} units @ ₦{item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm dark:text-white">₦{item.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Return:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnQuantities[item.id] || ''}
                        placeholder="0"
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                      />
                      <span className="text-xs text-slate-500">of {item.quantity}</span>
                      {returnQuantities[item.id] > 0 && (
                        <span className="ml-auto text-xs font-semibold text-primary">
                          ₦{(item.unitPrice * returnQuantities[item.id]).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Refund */}
              {totalRefund > 0 && (
                <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-3 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Total Refund:</span>
                  <span className="text-xl font-bold text-primary">₦{totalRefund.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleProcessReturn}
            disabled={processing || loading || totalRefund === 0}
            className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {processing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                Processing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">undo</span>
                Process Return
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnModal;
