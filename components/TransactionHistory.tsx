import React, { useState, useEffect } from 'react';
import { getTransactions } from '../services/database';
import PrintReceipt from './PrintReceipt';
import ReturnModal from './ReturnModal';
import { useAuth, Permission } from '../contexts/AuthContext';

interface TransactionHistoryProps {
  onClose: () => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ onClose }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const { hasPermission } = useAuth();
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printTransactionId, setPrintTransactionId] = useState<string | null>(null);
  const [returnTransactionId, setReturnTransactionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, dateRange]);

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        startDate.setDate(now.getDate() - 30);
      }

      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.createdAt || tx.dateTime);
        return txDate >= startDate;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(tx =>
        tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.amount.toString().includes(searchTerm)
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions(50); // Get last 50 transactions
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-surface-dark rounded-xl max-w-6xl w-full h-[90vh] lg:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold dark:text-white">Transaction History</h2>
                <p className="text-xs lg:text-sm text-slate-500">Complete list of all transactions</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by invoice, customer, or amount..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Date Range Filter */}
              <div className="flex gap-2">
                {[
                  { value: 'today', label: 'Today' },
                  { value: '7days', label: '7 Days' },
                  { value: '30days', label: '30 Days' },
                  { value: 'all', label: 'All' }
                ].map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setDateRange(range.value as any)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      dateRange === range.value
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading transactions...</p>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">receipt_long</span>
                  <p className="text-slate-500">No transactions found</p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="lg:hidden p-4 space-y-3">
                  {paginatedTransactions.map((tx) => {
                    const dateTimeParts = tx.dateTime.split(' at ');
                    const datePart = dateTimeParts[0] || tx.dateTime;
                    const timePart = dateTimeParts[1] || '';
                    
                    return (
                      <div key={tx.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-mono text-xs text-slate-500 mb-1">{tx.id}</p>
                            <p className="font-bold text-lg dark:text-white">₦{tx.amount.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {tx.status === 'Completed' && hasPermission(Permission.SALES_REFUND) && (
                              <button
                                onClick={() => setReturnTransactionId(tx.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                title="Process Return"
                              >
                                <span className="material-symbols-outlined">undo</span>
                              </button>
                            )}
                            <button
                              onClick={() => setPrintTransactionId(tx.id)}
                              className="p-2 text-slate-400 hover:text-primary transition-colors"
                              title="Print Receipt"
                            >
                              <span className="material-symbols-outlined">print</span>
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex flex-col">
                            <span className="font-medium dark:text-white">{datePart}</span>
                            {timePart && <span className="text-slate-500">{timePart}</span>}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                              tx.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              tx.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              tx.paymentMethod === 'Transfer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              <span className="material-symbols-outlined text-xs">
                                {tx.paymentMethod === 'Cash' ? 'payments' : tx.paymentMethod === 'Card' ? 'credit_card' : tx.paymentMethod === 'Transfer' ? 'swap_horiz' : 'help'}
                              </span>
                              {tx.paymentMethod || 'Cash'}
                            </span>
                            
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-semibold ${
                              tx.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' :
                              tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <table className="w-full hidden lg:table">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-widest sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left">Invoice ID</th>
                      <th className="px-6 py-3 text-left">Customer</th>
                      <th className="px-6 py-3 text-left">Date & Time</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Payment</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedTransactions.map((tx) => {
                      const dateTimeParts = tx.dateTime.split(' at ');
                      const datePart = dateTimeParts[0] || tx.dateTime;
                      const timePart = dateTimeParts[1] || '';
                      
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-3 font-mono text-sm dark:text-slate-300">{tx.id}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                {tx.initials}
                              </div>
                              <span className="text-sm font-medium dark:text-white">{tx.customer}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium dark:text-white">{datePart}</span>
                              {timePart && <span className="text-[10px] text-slate-500">{timePart}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm font-bold dark:text-white">₦{tx.amount.toFixed(2)}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                              tx.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              tx.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              tx.paymentMethod === 'Transfer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              <span className="material-symbols-outlined text-xs">
                                {tx.paymentMethod === 'Cash' ? 'payments' : tx.paymentMethod === 'Card' ? 'credit_card' : tx.paymentMethod === 'Transfer' ? 'swap_horiz' : 'help'}
                              </span>
                              {tx.paymentMethod || 'Cash'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tx.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' :
                              tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400' :
                              'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {tx.status === 'Completed' && hasPermission(Permission.SALES_REFUND) && (
                                <button
                                  onClick={() => setReturnTransactionId(tx.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Process Return"
                                >
                                  <span className="material-symbols-outlined text-xl">undo</span>
                                </button>
                              )}
                              <button
                                onClick={() => setPrintTransactionId(tx.id)}
                                className="text-slate-400 hover:text-primary transition-colors"
                                title="Print Receipt"
                              >
                                <span className="material-symbols-outlined text-xl">print</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredTransactions.length > 0 && (
            <div className="px-4 lg:px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <p className="text-xs lg:text-sm text-slate-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2 py-1 rounded text-xs font-medium min-w-[28px] ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Receipt Modal */}
      {printTransactionId && (
        <PrintReceipt
          transactionId={printTransactionId}
          onClose={() => setPrintTransactionId(null)}
        />
      )}

      {/* Return Modal */}
      {returnTransactionId && (
        <ReturnModal
          transactionId={returnTransactionId}
          onClose={() => {
            setReturnTransactionId(null);
            loadTransactions(); // Reload transactions after return
          }}
        />
      )}
    </>
  );
};

export default TransactionHistory;
