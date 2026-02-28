import React, { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import Receipt from './Receipt';
import { ReceiptTransaction, ReceiptWidth } from '../types/receipt';
import { getTransactionForReceipt } from '../services/receiptService';

interface PrintReceiptProps {
  transactionId: string;
  onClose: () => void;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({ transactionId, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [transaction, setTransaction] = useState<ReceiptTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTransactionForReceipt(transactionId);
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

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${transactionId}`,
    pageStyle: `
      @page {
        size: 80mm auto;
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        * {
          break-inside: avoid;
        }
      }
    `,
  });

  if (loading) {
    return (
      <div className="modal-overlay bg-black/50 flex items-center justify-center">
        <div className="modal-content bg-white dark:bg-surface-dark p-8 rounded-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading receipt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="modal-overlay bg-black/50 flex items-center justify-center">
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

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="modal-content bg-white dark:bg-surface-dark rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Print Receipt</h2>
            <p className="text-sm text-slate-500">Preview and print thermal receipt</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Preview */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mx-auto" style={{ width: 'fit-content' }}>
            <Receipt ref={receiptRef} transaction={transaction} width="80mm" />
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-700 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => handlePrint()}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium flex items-center gap-2"
          >
            <span className="material-symbols-outlined">print</span>
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintReceipt;
