import { supabase } from './supabaseClient';
import { ReceiptTransaction } from '../types/receipt';

export const getTransactionForReceipt = async (transactionId: string): Promise<ReceiptTransaction | null> => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    // Fetch transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError) throw txError;
    if (!transaction) return null;

    // Fetch sales items for this transaction
    const { data: salesItems, error: salesError } = await supabase
      .from('sales')
      .select(`
        quantity,
        unit_price,
        total_price,
        products (
          name
        )
      `)
      .eq('transaction_id', transactionId);

    if (salesError) throw salesError;

    // Transform to receipt format
    const items = (salesItems || []).map((item: any) => ({
      name: item.products?.name || 'Unknown Item',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.total_price
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vat = subtotal * 0.075; // 7.5% VAT
    const discount = 0; // Can be calculated if you have discount logic
    const total = subtotal + vat - discount;

    const receipt: ReceiptTransaction = {
      id: transaction.id,
      receiptNumber: transaction.id,
      createdAt: transaction.created_at,
      cashier: 'Pharm. Abdurrazaq O.', // Can be fetched from auth if needed
      patientName: transaction.customer,
      items,
      subtotal,
      discount,
      vat,
      total: transaction.amount,
      paymentMethod: transaction.payment_method || 'Cash',
      amountPaid: transaction.amount,
      change: 0
    };

    return receipt;
  } catch (error) {
    console.error('Error fetching transaction for receipt:', error);
    throw error;
  }
};
