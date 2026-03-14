export enum UserRole {
  SUPERADMIN = 'superadmin',
  TENANT_ADMIN = 'tenant_admin',
  STAFF = 'staff'
}

export interface UserProfile {
  id: string; // Auth UID
  tenant_id: string; // Tenant identifier
  role: UserRole;
  branch_id?: string;
  display_name?: string;
  // Joined data
  tenant?: {
    id: string;
    name: string;
    subdomain?: string;
  };
  branch?: {
    id: string;
    name: string;
    location?: string;
  };
}

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
  paymentMethod?: string;
}

export interface Product {
  id: string;
  name: string;
  brandName?: string;
  category: string;
  dosageForm?: string;
  strength?: string;
  unit: string;
  batchNo: string;
  barcode?: string;
  manufacturingDate?: string;
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
