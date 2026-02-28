import React, { forwardRef } from 'react';
import { ReceiptTransaction, ReceiptWidth } from '../types/receipt';
import Logo from './Logo';

interface ReceiptProps {
  transaction: ReceiptTransaction;
  width?: ReceiptWidth;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ transaction, width = '80mm' }, ref) => {
    const formatCurrency = (amount: number) => `₦${amount.toFixed(2)}`;
    const formatDateTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString('en-GB'),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      };
    };

    const { date, time } = formatDateTime(transaction.createdAt);
    const isCompact = width === '58mm';

    return (
      <div
        ref={ref}
        className="bg-white text-black font-mono"
        style={{
          width: width,
          padding: isCompact ? '8mm' : '10mm',
          fontSize: isCompact ? '11px' : '13px',
          lineHeight: '1.4',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div className="text-center mb-4 break-inside-avoid">
          <div className="font-bold text-lg mb-1">Main Pharmacy</div>
          <div className="text-xs mb-2">Terminal #01</div>
          <div className="text-xs">123 Medical Plaza, Lagos</div>
          <div className="text-xs">Tel: +234 800 123 4567</div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-3"></div>

        {/* Transaction Details */}
        <div className="text-xs mb-3 break-inside-avoid">
          <div className="flex justify-between">
            <span>Receipt No:</span>
            <span className="font-bold">{transaction.receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{date}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{time}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{transaction.cashier}</span>
          </div>
          {transaction.patientName && (
            <div className="flex justify-between">
              <span>Patient:</span>
              <span>{transaction.patientName}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-3"></div>

        {/* Items */}
        <div className="mb-3 break-inside-avoid">
          {transaction.items.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="break-words">{item.name}</div>
              <div className="flex justify-between text-xs">
                <span>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </span>
                <span className="font-bold">{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-3"></div>

        {/* Totals */}
        <div className="text-xs mb-3 break-inside-avoid">
          <div className="flex justify-between mb-1">
            <span>Subtotal:</span>
            <span>{formatCurrency(transaction.subtotal)}</span>
          </div>
          {transaction.discount > 0 && (
            <div className="flex justify-between mb-1">
              <span>Discount:</span>
              <span>-{formatCurrency(transaction.discount)}</span>
            </div>
          )}
          <div className="flex justify-between mb-1">
            <span>VAT (7.5%):</span>
            <span>{formatCurrency(transaction.vat)}</span>
          </div>
          <div className="border-t border-black my-2"></div>
          <div className="flex justify-between font-bold text-base mb-3">
            <span>TOTAL:</span>
            <span>{formatCurrency(transaction.total)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Payment:</span>
            <span>{transaction.paymentMethod}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Amount Paid:</span>
            <span>{formatCurrency(transaction.amountPaid)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change:</span>
            <span>{formatCurrency(transaction.change)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-black my-3"></div>

        {/* Footer */}
        <div className="text-center text-xs break-inside-avoid">
          <div className="mb-2">Thank you for your patronage!</div>
          <div className="mb-3">Get well soon</div>
          <div className="text-[10px] opacity-60 mb-1">Powered by</div>
          <div className="flex justify-center">
            <Logo size="sm" className="text-black opacity-70" />
          </div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;
