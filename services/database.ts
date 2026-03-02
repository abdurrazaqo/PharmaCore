import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Product, Transaction, TransactionStatus } from '../types';

// Helper to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  if (obj !== null && obj.constructor === Object) {
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
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Check if database is available
const checkDatabase = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
  }
};

// Generate next sequential invoice ID
export const getNextInvoiceId = async (): Promise<string> => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('transactions')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (!data || data.length === 0) {
    return 'INV-001';
  }
  
  // Extract number from last invoice (e.g., "INV-005" -> 5)
  const lastId = data[0].id;
  const match = lastId.match(/INV-(\d+)/);
  
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return `INV-${nextNum.toString().padStart(3, '0')}`;
  }
  
  return 'INV-001';
};

// Generate next sequential customer ID
export const getNextCustomerId = async (): Promise<string> => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('customers')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (!data || data.length === 0) {
    return 'PAT-001';
  }
  
  // Extract number from last customer ID (e.g., "PAT-005" -> 5)
  const lastId = data[0].id;
  const match = lastId.match(/PAT-(\d+)/);
  
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return `PAT-${nextNum.toString().padStart(3, '0')}`;
  }
  
  return 'PAT-001';
};

// Products
export const getProducts = async () => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('products')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return toCamelCase(data) as Product[];
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
  checkDatabase();
  const snakeProduct = toSnakeCase(product);
  const { data, error } = await supabase!
    .from('products')
    .insert([snakeProduct])
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data) as Product;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  checkDatabase();
  const snakeUpdates = toSnakeCase(updates);
  const { data, error } = await supabase!
    .from('products')
    .update(snakeUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data) as Product;
};

export const deleteProduct = async (id: string) => {
  checkDatabase();
  const { error } = await supabase!
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Transactions
export const getTransactions = async (limit = 10) => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return toCamelCase(data) as Transaction[];
};

export const addTransaction = async (transaction: Transaction) => {
  checkDatabase();
  const snakeTransaction = toSnakeCase(transaction);
  const { data, error } = await supabase!
    .from('transactions')
    .insert([snakeTransaction])
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data) as Transaction;
};

// Add sales items for a transaction
export const addSalesItems = async (transactionId: string, items: Array<{productId: string, quantity: number, unitPrice: number, totalPrice: number}>) => {
  checkDatabase();
  
  const salesData = items.map(item => ({
    transaction_id: transactionId,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice
  }));

  const { data, error } = await supabase!
    .from('sales')
    .insert(salesData)
    .select();

  if (error) throw error;
  
  // Update inventory - deduct sold quantities
  for (const item of items) {
    const { data: product, error: fetchError } = await supabase!
      .from('products')
      .select('total_units')
      .eq('id', item.productId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching product for inventory update:', fetchError);
      continue;
    }
    
    const newQuantity = Math.max(0, product.total_units - item.quantity);
    
    const { error: updateError } = await supabase!
      .from('products')
      .update({ total_units: newQuantity })
      .eq('id', item.productId);
    
    if (updateError) {
      console.error('Error updating inventory:', updateError);
    }
  }
  
  return data;
};

// Customers
export const getCustomers = async () => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('customers')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return toCamelCase(data);
};

export const addCustomer = async (customer: any) => {
  checkDatabase();
  const snakeCustomer = toSnakeCase(customer);
  const { data, error } = await supabase!
    .from('customers')
    .insert([snakeCustomer])
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data);
};

export const updateCustomer = async (id: string, updates: any) => {
  checkDatabase();
  const snakeUpdates = toSnakeCase(updates);
  const { data, error } = await supabase!
    .from('customers')
    .update(snakeUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return toCamelCase(data);
};

export const deleteCustomer = async (id: string) => {
  checkDatabase();
  const { error } = await supabase!
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Sales Analytics
export const getSalesData = async (days = 7) => {
  checkDatabase();
  const { data, error } = await supabase!
    .from('transactions')
    .select('amount, created_at')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .eq('status', 'Completed');
  
  if (error) throw error;
  return data;
};

// Get weekly sales trend for chart
export const getWeeklySalesTrend = async () => {
  checkDatabase();
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const weekData = [];
  
  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const { data, error } = await supabase!
      .from('transactions')
      .select('amount')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDay.toISOString())
      .eq('status', 'Completed');
    
    if (error) throw error;
    
    const dayTotal = data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    
    weekData.push({
      name: daysOfWeek[date.getDay()],
      sales: dayTotal
    });
  }
  
  return weekData;
};

// Dashboard Stats
export const getDashboardStats = async () => {
  checkDatabase();
  
  // Get today's sales
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: todaySales, error: salesError } = await supabase!
    .from('transactions')
    .select('amount')
    .gte('created_at', today.toISOString())
    .eq('status', 'Completed');
  
  if (salesError) throw salesError;
  
  const totalSales = todaySales?.reduce((sum, t) => sum + t.amount, 0) || 0;
  
  // Get this month's revenue
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const { data: monthSales, error: monthError } = await supabase!
    .from('transactions')
    .select('amount')
    .gte('created_at', firstDayOfMonth.toISOString())
    .eq('status', 'Completed');
  
  if (monthError) throw monthError;
  
  const monthlyRevenue = monthSales?.reduce((sum, t) => sum + t.amount, 0) || 0;
  
  // Calculate actual profit margin from products
  // Get all products and calculate average margin
  const { data: products, error: productsError } = await supabase!
    .from('products')
    .select('price, total_units, cost_price');
  
  if (productsError) throw productsError;
  
  // Get low stock count (25% or less remaining)
  const { data: allProducts, error: allProductsError } = await supabase!
    .from('products')
    .select('total_units, last_restock_quantity');
  
  if (allProductsError) throw allProductsError;
  
  const lowStockCount = allProducts?.filter(p => {
    const percentageRemaining = (p.total_units / p.last_restock_quantity) * 100;
    return percentageRemaining <= 25;
  }).length || 0;
  
  // Get expiring soon count (within 30 days)
  const { data: expiryProducts, error: expiryError } = await supabase!
    .from('products')
    .select('expiry_date');
  
  if (expiryError) throw expiryError;
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  const expiringSoon = expiryProducts?.filter(p => {
    const expiryDate = new Date(p.expiry_date);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
  }).length || 0;
  
  // If no products, return 0% margin
  if (!products || products.length === 0) {
    return {
      totalSales,
      monthlyRevenue,
      profitMargin: 0,
      lowStockCount: lowStockCount || 0,
      expiringSoon
    };
  }
  
  // Calculate profit margin from actual sales this month
  // If no sales, return 0% margin
  if (monthlyRevenue === 0) {
    return {
      totalSales,
      monthlyRevenue,
      profitMargin: 0,
      lowStockCount: lowStockCount || 0,
      expiringSoon
    };
  }
  
  // Calculate actual profit margin from inventory
  // Total revenue potential vs total cost
  const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.total_units), 0);
  const totalCost = products.reduce((sum, p) => sum + ((p.cost_price || p.price * 0.755) * p.total_units), 0);
  const profitMargin = totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100) : 0;
  
  return {
    totalSales,
    monthlyRevenue,
    profitMargin: Math.round(profitMargin * 10) / 10, // Round to 1 decimal
    lowStockCount: lowStockCount || 0,
    expiringSoon
  };
};

