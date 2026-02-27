export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptTransaction {
  id: string;
  receiptNumber: string;
  createdAt: string;
  cashier: string;
  patientName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
}

export type ReceiptWidth = '80mm' | '58mm';
