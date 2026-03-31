export enum UserRole {
  SUPERADMIN = 'superadmin',
  TENANT_ADMIN = 'tenant_admin',
  BRANCH_ADMIN = 'branch_admin',
  PHARMACIST = 'pharmacist',
  PHARMACY_TECHNICIAN = 'pharmacy_technician',
  CASHIER = 'cashier'
}

export enum TenantStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  GRACE_PERIOD = 'grace_period',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export enum SubscriptionPlan {
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

export interface UserProfile {
  id: string; // Auth UID
  tenant_id: string; // Tenant identifier
  role: UserRole;
  branch_id?: string;
  display_name?: string;
  is_suspended?: boolean;
  // Joined data
  tenant?: {
    id: string;
    name: string;
    subdomain?: string;
    status: TenantStatus;
    plan: SubscriptionPlan;
    billing_cycle: BillingCycle;
    subscription_expires_at?: string | null;
    trial_ends_at?: string | null;
    pending_plan?: string | null;
    logo_url?: string | null;
    is_gifted?: boolean;
    gifted_until?: string | null;
    onboarding_completed?: boolean;
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

export * from './receipt';
