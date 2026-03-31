import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Product, Transaction, TransactionStatus } from '../types';

// Helper to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Helper to convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      if (obj[key] === undefined) return result;
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

const checkDatabase = () => {
  if (!isSupabaseConfigured()) {
    console.error('❌ Database: Supabase not configured');
    throw new Error('Supabase not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
  }
};

// Tenant & Branch querying helpers
const withTenantAndBranch = (query: any, tenantId: string, branchId?: string) => {
  let q = query.eq('tenant_id', tenantId);
  if (branchId) q = q.eq('branch_id', branchId);
  return q;
};

// Users & Subscriptions
export const getUsersByTenant = async (tenantId: string, branchId?: string) => {
  checkDatabase();
  let query = supabase!.from('users').select('*').eq('tenant_id', tenantId);
  if (branchId) query = query.eq('branch_id', branchId);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  
  return toCamelCase(data);
};

export const getTenantSubscription = async (tenantId: string) => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('tenants')
    .select('id, plan, billing_cycle, subscription_expires_at, trial_ends_at, status, pending_plan')
    .eq('id', tenantId)
    .single();
    
  if (error) throw error;
  return toCamelCase(data);
};

// Generate next sequential invoice ID
export const getNextInvoiceId = async (tenantId: string, branchId?: string): Promise<string> => {
  checkDatabase();
  const query = withTenantAndBranch(supabase!.from('transactions').select('id'), tenantId, branchId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1);
  
  if (error) throw error;
  
  if (!data || data.length === 0) return 'INV-001';
  
  const lastId = data[0].id;
  const match = lastId.match(/INV-(\d+)/);
  
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return `INV-${nextNum.toString().padStart(3, '0')}`;
  }
  return 'INV-001';
};

// Generate next sequential customer ID
export const getNextCustomerId = async (tenantId: string): Promise<string> => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (!data || data.length === 0) return 'PAT-001';
  
  const lastId = data[0].id;
  const match = lastId.match(/PAT-(\d+)/);
  
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return `PAT-${nextNum.toString().padStart(3, '0')}`;
  }
  return 'PAT-001';
};

// Products
export const getProducts = async (tenantId: string, branchId?: string) => {
  checkDatabase();
  const query = withTenantAndBranch(supabase!.from('products').select('*'), tenantId, branchId);
  const { data, error } = await query.order('name');
  
  if (error) throw error;
  return toCamelCase(data) as Product[];
};

export const addProduct = async (product: Omit<Product, 'id'>, tenantId: string, branchId?: string) => {
  checkDatabase();
  const snakeProduct = toSnakeCase({ ...product, tenantId, branchId });
  const { data, error } = await supabase!
    .from('products')
    .insert([snakeProduct])
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data) as Product;
};

export const updateProduct = async (id: string, updates: Partial<Product>, tenantId: string, branchId?: string) => {
  checkDatabase();
  const snakeUpdates = toSnakeCase(updates);
  const query = withTenantAndBranch(supabase!.from('products').update(snakeUpdates), tenantId, branchId).eq('id', id);
  const { data, error } = await query.select().single();
  
  if (error) throw error;
  return toCamelCase(data) as Product;
};

export const deleteProduct = async (id: string, tenantId: string, branchId?: string) => {
  checkDatabase();
  const query = withTenantAndBranch(supabase!.from('products').delete(), tenantId, branchId).eq('id', id);
  const { error } = await query;
  if (error) throw error;
};

// Transactions
export const getTransactions = async (tenantId: string, branchId?: string, limit = 10) => {
  checkDatabase();
  const query = withTenantAndBranch(supabase!.from('transactions').select('*'), tenantId, branchId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  
  if (error) throw error;
  return toCamelCase(data) as Transaction[];
};

export const addTransaction = async (transaction: Transaction, tenantId: string, branchId?: string) => {
  checkDatabase();
  const snakeTransaction = toSnakeCase({ ...transaction, tenantId, branchId });
  const { data, error } = await supabase!
    .from('transactions')
    .insert([snakeTransaction])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data) as Transaction;
};

export const addSalesItems = async (transactionId: string, items: Array<{productId: string, quantity: number, unitPrice: number, totalPrice: number}>, tenantId: string) => {
  checkDatabase();
  
  const salesData = items.map(item => ({
    transaction_id: transactionId,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    tenant_id: tenantId
  }));

  const { data, error } = await supabase!
    .from('sales')
    .insert(salesData)
    .select();

  if (error) throw error;
  
  for (const item of items) {
    const { data: product, error: fetchError } = await supabase!
      .from('products')
      .select('total_units, last_restock_quantity')
      .eq('id', item.productId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching product for inventory update:', fetchError);
      continue;
    }
    
    const newQuantity = Math.max(0, product.total_units - item.quantity);
    
    const { error: updateError } = await supabase!
      .from('products')
      .update({ total_units: newQuantity })
      .eq('id', item.productId)
      .eq('tenant_id', tenantId);
    
    if (updateError) console.error('Error updating inventory:', updateError);
  }
  
  return data;
};

// Customers
export const getCustomers = async (tenantId: string) => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  
  if (error) throw error;
  return toCamelCase(data);
};

export const addCustomer = async (customer: any, tenantId: string) => {
  checkDatabase();
  const snakeCustomer = toSnakeCase({ ...customer, tenantId });
  const { data, error } = await supabase!
    .from('customers')
    .insert([snakeCustomer])
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data);
};

export const updateCustomer = async (id: string, updates: any, tenantId: string) => {
  checkDatabase();
  const snakeUpdates = toSnakeCase(updates);
  const { data, error } = await supabase!
    .from('customers')
    .update(snakeUpdates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data);
};

export const deleteCustomer = async (id: string, tenantId: string) => {
  checkDatabase();
  const { error } = await supabase!
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  
  if (error) throw error;
};

// Sales Analytics
export const getSalesData = async (tenantId: string, branchId?: string, days = 7) => {
  checkDatabase();
  const query = withTenantAndBranch(supabase!.from('transactions').select('amount, created_at'), tenantId, branchId);
  const { data, error } = await query
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .eq('status', 'Completed');
  
  if (error) throw error;
  return data;
};

export const getWeeklySalesTrend = async (tenantId: string, branchId?: string) => {
  checkDatabase();
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weekData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const query = withTenantAndBranch(supabase!.from('transactions').select('amount'), tenantId, branchId);
    const { data, error } = await query
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDay.toISOString())
      .eq('status', 'Completed');
    
    if (error) throw error;
    
    const dayTotal = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    weekData.push({ name: daysOfWeek[date.getDay()], sales: dayTotal });
  }
  
  return weekData;
};

export const getDashboardStats = async (tenantId: string, branchId?: string) => {
  checkDatabase();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  const todayQuery = withTenantAndBranch(supabase!.from('transactions').select('amount'), tenantId, branchId)
    .gte('created_at', today.toISOString())
    .eq('status', 'Completed');
    
  const monthQuery = withTenantAndBranch(supabase!.from('transactions').select('amount'), tenantId, branchId)
    .gte('created_at', firstDayOfMonth.toISOString())
    .eq('status', 'Completed');
    
  const productsQuery = withTenantAndBranch(supabase!.from('products').select('price, total_units, cost_price, last_restock_quantity, expiry_date'), tenantId, branchId);
  
  const [
    { data: todaySales, error: salesError },
    { data: monthSales, error: monthError },
    { data: allProducts, error: productsError }
  ] = await Promise.all([ todayQuery, monthQuery, productsQuery ]);
  
  if (salesError) throw salesError;
  if (monthError) throw monthError;
  if (productsError) throw productsError;
  
  const totalSales = todaySales?.reduce((sum, t) => sum + t.amount, 0) || 0;
  const monthlyRevenue = monthSales?.reduce((sum, t) => sum + t.amount, 0) || 0;
  
  const lowStockCount = allProducts?.filter(p => {
    const percentageRemaining = (p.total_units / (p.last_restock_quantity || 1)) * 100;
    return percentageRemaining <= 25;
  }).length || 0;
  
  const expiringSoon = allProducts?.filter(p => {
    const expiryDate = new Date(p.expiry_date);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
  }).length || 0;
  
  if (!allProducts || allProducts.length === 0 || monthlyRevenue === 0) {
    return { totalSales, monthlyRevenue, profitMargin: 0, lowStockCount, expiringSoon };
  }
  
  const totalRevenue = allProducts.reduce((sum, p) => sum + (p.price * p.total_units), 0);
  const totalCost = allProducts.reduce((sum, p) => sum + ((p.cost_price || p.price * 0.755) * p.total_units), 0);
  const profitMargin = totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100) : 0;
  
  return {
    totalSales,
    monthlyRevenue,
    profitMargin: Math.round(profitMargin * 10) / 10,
    lowStockCount,
    expiringSoon
  };
};
