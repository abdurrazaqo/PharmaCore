import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useReactToPrint } from 'react-to-print';
import Receipt from './Receipt';
import { ReceiptTransaction, ReceiptWidth } from '../types/receipt';
import { getTransactionForReceipt } from '../services/receiptService';
import { useAuth } from '../contexts/AuthContext';

interface PrintReceiptProps {
  transactionId: string;
  onClose: () => void;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({ transactionId, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [transaction, setTransaction] = useState<ReceiptTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${transactionId}`,
    pageStyle: `
      @page {
        size: 80mm;
        margin: 0;
      }
      @media print {
        html, body {
          height: auto !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading transaction:', transactionId);
      const data = await getTransactionForReceipt(transactionId);
      console.log('Transaction data loaded:', data);
      if (data) {
        setTransaction(data);
      } else {
        setError('Transaction not found');
      }
    } catch (err) {
      console.error('Error loading transaction:', err);
      setError('Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const onPrintClick = () => {
    console.log('Print button clicked');
    console.log('Receipt ref:', receiptRef.current);
    console.log('Transaction:', transaction);
    
    if (!receiptRef.current) {
      console.error('Receipt ref is null');
      return;
    }
    
    if (handlePrint) {
      handlePrint();
    } else {
      console.error('handlePrint is not available');
    }
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] bg-black/50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-surface-dark p-8 rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading receipt...</p>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (error || !transaction) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
        <div className="modal-content bg-white dark:bg-surface-dark p-8 rounded-xl max-w-md">
          <div className="text-center">
            <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
            <h3 className="text-xl font-bold mb-2 dark:text-white">Error</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="bg-slate-200 dark:bg-slate-700 px-6 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-50 dark:bg-surface-dark rounded-3xl max-w-md w-full max-h-[90vh] shadow-2xl shadow-primary/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-white dark:bg-surface-dark/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
               <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
            <div>
              <h2 className="text-xl font-black dark:text-white tracking-tight">Print Receipt</h2>
              <p className="text-xs font-semibold text-slate-500">Preview & Print Document</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Preview */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar flex-1 relative">
           <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none"></div>
          <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden mx-auto border border-slate-200 dark:border-slate-700 relative z-10" style={{ width: 'fit-content' }}>
            <Receipt 
              ref={receiptRef} 
              transaction={transaction} 
              width="80mm"
              tenantName={profile?.tenant?.name}
              branchName={profile?.branch?.name}
              address={profile?.branch?.location}
              phone={profile?.tenant?.phone}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-surface-dark/95 border-t border-slate-200 dark:border-slate-800 p-5 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={onPrintClick}
            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95 font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Print Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrintReceipt;
