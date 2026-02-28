import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import PrintReceipt from './PrintReceipt';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
}

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ isOpen, onClose, customerName }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printTransactionId, setPrintTransactionId] = useState<string | null>(null);
  const [viewDetailsTransactionId, setViewDetailsTransactionId] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && customerName) {
      loadCustomerTransactions();
    }
  }, [isOpen, customerName]);

  const loadCustomerTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase!
        .from('transactions')
        .select('*')
        .eq('customer', customerName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Convert snake_case to camelCase
      const camelData = data?.map((tx: any) => ({
        id: tx.id,
        customer: tx.customer,
        initials: tx.initials,
        dateTime: tx.date_time,
        amount: tx.amount,
        status: tx.status,
        createdAt: tx.created_at
      })) || [];
      
      setTransactions(camelData);
    } catch (error) {
      console.error('Error loading customer transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionDetails = async (transactionId: string) => {
    try {
      setLoadingDetails(true);
      
      // Get sale items for this transaction
      const { data: salesData, error: salesError } = await supabase!
        .from('sales')
        .select('id, product_id, quantity, unit_price, total_price')
        .eq('transaction_id', transactionId);

      if (salesError) throw salesError;

      if (!salesData || salesData.length === 0) {
        setSaleItems([]);
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
          productName: product?.name || 'Unknown Product',
          quantity: sale.quantity,
          unitPrice: sale.unit_price,
          totalPrice: sale.total_price
        };
      });

      setSaleItems(itemsWithNames);
    } catch (error) {
      console.error('Error loading transaction details:', error);
      setSaleItems([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (transactionId: string) => {
    setViewDetailsTransactionId(transactionId);
    loadTransactionDetails(transactionId);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-surface-dark rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold dark:text-white">Prescription History</h2>
              <p className="text-sm text-slate-500">Transaction history for {customerName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading history...</p>
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">receipt_long</span>
                  <p className="text-slate-500">No prescription history found</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Mobile Layout */}
                    <div className="lg:hidden space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-mono text-xs text-slate-500">{tx.id}</p>
                          <p className="text-sm font-bold dark:text-white mt-1">₦{tx.amount.toFixed(2)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' :
                          tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{tx.dateTime}</p>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleViewDetails(tx.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          View
                        </button>
                        <button
                          onClick={() => setPrintTransactionId(tx.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">print</span>
                          Print
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:grid lg:grid-cols-5 lg:gap-4 lg:items-center">
                      <div className="font-mono text-sm dark:text-slate-300">{tx.id}</div>
                      <div className="text-sm text-slate-500">{tx.dateTime}</div>
                      <div className="text-sm font-bold dark:text-white">₦{tx.amount.toFixed(2)}</div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' :
                          tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(tx.id)}
                          className="text-slate-400 hover:text-primary transition-colors"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-xl">visibility</span>
                        </button>
                        <button
                          onClick={() => setPrintTransactionId(tx.id)}
                          className="text-slate-400 hover:text-primary transition-colors"
                          title="Print Receipt"
                        >
                          <span className="material-symbols-outlined text-xl">print</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Receipt Modal */}
      {printTransactionId && (
        <PrintReceipt
          transactionId={printTransactionId}
          onClose={() => setPrintTransactionId(null)}
        />
      )}

      {/* View Details Modal */}
      {viewDetailsTransactionId && (
        <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
          <div className="modal-content bg-white dark:bg-surface-dark rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold dark:text-white">Invoice Details</h3>
                <p className="text-xs text-slate-500">{viewDetailsTransactionId}</p>
              </div>
              <button
                onClick={() => setViewDetailsTransactionId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingDetails ? (
                <div className="text-center py-8 text-slate-500">Loading details...</div>
              ) : saleItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No items found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {saleItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-sm dark:text-white">{item.productName}</td>
                        <td className="px-4 py-3 text-sm text-center dark:text-slate-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right dark:text-slate-300">₦{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-right text-primary">₦{item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-right dark:text-white">Total:</td>
                      <td className="px-4 py-3 text-lg font-bold text-right text-primary">
                        ₦{saleItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerHistoryModal;
