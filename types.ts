
export enum TransactionStatus {
  COMPLETED = 'Completed',
  PENDING = 'Pending',
  REFUNDED = 'Refunded'
}

export interface Transaction {
  id: string;
  customer: string;
  initials: string;
  dateTime: string;
  amount: number;
  status: TransactionStatus;
}

export interface Product {
  id: string;
  name: string;
  generic: string;
  category: string;
  batchNo: string;
  barcode?: string;
  expiryDate: string;
  expiryMonthsLeft: string;
  stockLevel: number;
  totalUnits: number;
  lastRestockQuantity: number;
  costPrice: number;
  price: number;
  image: string;
}

export enum Page {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  POS = 'pos',
  DOCS = 'docs',
  CUSTOMERS = 'customers',
  REPORTS = 'reports',
  SETTINGS = 'settings'
}
