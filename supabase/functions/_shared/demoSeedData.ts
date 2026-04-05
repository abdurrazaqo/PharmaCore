// demoSeedData.ts
// Pure JS/TS pure constants representing real world Nigerian Pharmaceutical demo data.
// Safe to import in both Deno (Edge Functions) and Node (Seed Script)

export const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000002';

// 50 Nigerian Pharmacy Realistic Products
export const PRODUCT_TEMPLATES = [
  // Antibiotics
  { name: 'Augmentin 625mg', category: 'Antibiotics', price: 4500, cost: 3100 },
  { name: 'Amoxicillin 500mg Caps', category: 'Antibiotics', price: 1200, cost: 700 },
  { name: 'Ciprofloxacin 500mg', category: 'Antibiotics', price: 1800, cost: 1100 },
  { name: 'Azithromycin 500mg', category: 'Antibiotics', price: 2500, cost: 1600 },
  { name: 'Metronidazole 400mg', category: 'Antibiotics', price: 800, cost: 450 },
  { name: 'Cefuroxime 500mg', category: 'Antibiotics', price: 3200, cost: 2100 },
  
  // Analgesics (Pain)
  { name: 'Panadol Extra', category: 'Analgesics', price: 800, cost: 500 },
  { name: 'Ibuprofen 400mg', category: 'Analgesics', price: 600, cost: 350 },
  { name: 'Diclofenac 50mg', category: 'Analgesics', price: 750, cost: 400 },
  { name: 'Paracetamol 500mg', category: 'Analgesics', price: 500, cost: 300 },
  { name: 'Tramadol 50mg', category: 'Analgesics', price: 1500, cost: 900 },
  
  // Antimalaria
  { name: 'Coartem 80/480mg', category: 'Antimalaria', price: 3500, cost: 2400 },
  { name: 'Lonart DS', category: 'Antimalaria', price: 2800, cost: 1900 },
  { name: 'Amatem Forte', category: 'Antimalaria', price: 2600, cost: 1750 },
  { name: 'Artemether Injection', category: 'Antimalaria', price: 1200, cost: 800 },
  { name: 'Camosunate', category: 'Antimalaria', price: 2200, cost: 1500 },

  // Vitamins & Supplements
  { name: 'Vitamin C 1000mg', category: 'Supplements', price: 1500, cost: 900 },
  { name: 'Emvite Multivitamin', category: 'Supplements', price: 1200, cost: 800 },
  { name: 'Wellwoman Original', category: 'Supplements', price: 6500, cost: 4800 },
  { name: 'Wellman Original', category: 'Supplements', price: 6500, cost: 4800 },
  { name: 'Zinc Tablets 20mg', category: 'Supplements', price: 1000, cost: 600 },
  { name: 'Folic Acid 5mg', category: 'Supplements', price: 400, cost: 200 },
  { name: 'Osteocare', category: 'Supplements', price: 4500, cost: 3100 },
  { name: 'B-Complex', category: 'Supplements', price: 800, cost: 500 },

  // Antihypertensives
  { name: 'Amlodipine 5mg', category: 'Antihypertensives', price: 1200, cost: 800 },
  { name: 'Lisinopril 10mg', category: 'Antihypertensives', price: 1500, cost: 900 },
  { name: 'Losartan 50mg', category: 'Antihypertensives', price: 1800, cost: 1100 },
  { name: 'Co-Diovan 160/12.5mg', category: 'Antihypertensives', price: 6500, cost: 4500 },
  { name: 'Nifedipine 20mg Retard', category: 'Antihypertensives', price: 1400, cost: 950 },

  // Antidiabetics
  { name: 'Metformin 500mg', category: 'Antidiabetics', price: 1000, cost: 650 },
  { name: 'Glibenclamide 5mg', category: 'Antidiabetics', price: 800, cost: 500 },
  { name: 'Glucophage 1000mg', category: 'Antidiabetics', price: 3500, cost: 2400 },
  { name: 'Diamicron MR 60mg', category: 'Antidiabetics', price: 4200, cost: 2900 },

  // Gastrointestinal
  { name: 'Omeprazole 20mg', category: 'Gastrointestinal', price: 1100, cost: 700 },
  { name: 'Gestid Suspension', category: 'Gastrointestinal', price: 2000, cost: 1300 },
  { name: 'Gaviscon Liquid', category: 'Gastrointestinal', price: 3500, cost: 2450 },
  { name: 'Dulcolax Tabs', category: 'Gastrointestinal', price: 1500, cost: 1000 },
  { name: 'Loperamide 2mg', category: 'Gastrointestinal', price: 800, cost: 500 },
  
  // Respiratory / Cough
  { name: 'Benylin with Codeine', category: 'Cough/Cold', price: 2500, cost: 1700 },
  { name: 'Tricold Tablets', category: 'Cough/Cold', price: 800, cost: 500 },
  { name: 'Loratadine 10mg', category: 'Cough/Cold', price: 1200, cost: 800 },
  { name: 'Ventolin Inhaler', category: 'Respiratory', price: 4500, cost: 3100 },
  { name: 'Salbutamol Tablets', category: 'Respiratory', price: 500, cost: 300 },
  
  // OTC & Others
  { name: 'Deep Heat Rub', category: 'Dermatology', price: 2200, cost: 1500 },
  { name: 'Funbact-A Cream', category: 'Dermatology', price: 1200, cost: 800 },
  { name: 'Dettol Antiseptic 250ml', category: 'First Aid', price: 2500, cost: 1700 },
  { name: 'Methylated Spirit 100ml', category: 'First Aid', price: 600, cost: 350 },
  { name: 'Cotton Wool 100g', category: 'First Aid', price: 800, cost: 500 },
  { name: 'Plaster Roll', category: 'First Aid', price: 500, cost: 300 },
  { name: 'Thermometer (Digital)', category: 'Medical Device', price: 2000, cost: 1300 },
];

export const CUSTOMER_NAMES = [
  'Adebayo Ogunlesi', 'Chioma Okafor', 'Fatima Abubakar', 'Emeka Nwachukwu', 'Folake Ojo',
  'Ibrahim Musa', 'Ngozi Eze', 'Chinedu Obi', 'Aisha Bello', 'Tunde Bakare',
  'Titilayo Awolowo', 'Yusuf Danjuma', 'Oluchi Chigozie', 'Aminu Kano', 'Grace Uche',
  'Segun Arinze', 'Binta Garba', 'Kehinde Ayoola', 'Halima Sani', 'Dayo Olatunji'
];

export const INSURANCE_PROVIDERS = ['NHIS', 'Hygeia HMO', 'AXA Mansard', 'Leadway Health', 'Reliance HMO'];

export const STAFF_NAMES = ['Kemi (Pharmacist)', 'Chucks (Cashier)', 'Hassan (Manager)'];

export function generateSeedData() {
  const products = PRODUCT_TEMPLATES.map((p, index) => {
    // Create some low stock items (10% of products)
    const isLowStock = index % 10 === 0;
    // Create some expiring items (15% of products)
    const isExpiringSoon = index % 7 === 0;
    
    let stock_level;
    let total_units;
    let expiry_date;
    let months_to_add;
    let expiryMonthsLeft;
    
    if (isLowStock) {
      // Low stock: 1-9 units
      stock_level = Math.floor(Math.random() * 9) + 1;
      total_units = stock_level + Math.floor(Math.random() * 20) + 10;
    } else {
      // Normal stock: 20-200 units
      stock_level = Math.floor(Math.random() * 181) + 20;
      total_units = stock_level + Math.floor(Math.random() * 151) + 50;
    }
    
    if (isExpiringSoon) {
      // Expiring soon: 1-3 months
      expiry_date = new Date();
      months_to_add = Math.floor(Math.random() * 3) + 1; // 1 to 3 months
      expiry_date.setMonth(expiry_date.getMonth() + months_to_add);
      expiryMonthsLeft = months_to_add === 1 ? 'Critical' : 'Expiring Soon';
    } else {
      // Normal expiry: 6-24 months
      expiry_date = new Date();
      months_to_add = Math.floor(Math.random() * 19) + 6; // 6 to 24 months
      expiry_date.setMonth(expiry_date.getMonth() + months_to_add);
      
      // Calculate expiry months left
      const now = new Date();
      const monthsLeft = Math.round((expiry_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
      expiryMonthsLeft = monthsLeft > 12 ? 'New' : `${monthsLeft} months`;
    }
    
    // Extract generic name from product name (first word or before dosage)
    const genericName = p.name.split(/\s+\d/)[0].trim();
    
    return {
      id: crypto.randomUUID(),
      tenant_id: DEMO_TENANT_ID,
      branch_id: DEMO_BRANCH_ID,
      name: p.name,
      generic: genericName,
      category: p.category,
      unit: 'units',
      batch_no: `BN2026-${String(index + 1).padStart(3, '0')}`,
      expiry_date: expiry_date.toISOString().split('T')[0],
      expiry_months_left: expiryMonthsLeft,
      stock_level,
      total_units,
      last_restock_quantity: Math.floor(Math.random() * 151) + 50,
      cost_price: p.cost,
      price: p.price,
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop',
    };
  });

  const customers = CUSTOMER_NAMES.map((name, index) => {
    const hasInsurance = Math.random() > 0.5;
    const parts = name.split(' ');
    const initials = `${parts[0][0]}${parts[1][0]}`;
    return {
      id: `PAT-DEM-${String(index + 1).padStart(3, '0')}`,
      tenant_id: DEMO_TENANT_ID,
      name,
      phone: `080${Math.floor(10000000 + Math.random() * 90000000)}`,
      visits: Math.floor(Math.random() * 15) + 1,
      balance: Math.floor(Math.random() * 5000),
      insurance: hasInsurance ? INSURANCE_PROVIDERS[Math.floor(Math.random() * INSURANCE_PROVIDERS.length)] : 'Uninsured',
      initials,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000).toISOString(),
    };
  });

  const transactions = [];
  const salesItems = [];

  // Generate transactions over the last 30 days
  let txCount = 0;
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    // More transactions for "today" and recent days
    let transactionsPerDay;
    if (dayOffset === 0) transactionsPerDay = Math.floor(Math.random() * 6) + 8; // 8-13 for today
    else if (dayOffset < 7) transactionsPerDay = Math.floor(Math.random() * 5) + 4; // 4-8 for this week
    else transactionsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 for older days

    for (let j = 0; j < transactionsPerDay; j++) {
      txCount++;
      const txDate = new Date();
      txDate.setDate(txDate.getDate() - dayOffset);
      txDate.setHours(8 + Math.floor(Math.random() * 12)); // 8AM to 8PM
      txDate.setMinutes(Math.floor(Math.random() * 60));

      const txnId = `TXN-${String(txCount).padStart(4, '0')}`;
      const numItems = Math.floor(Math.random() * 4) + 1;
      let totalAmount = 0;
      
      for (let k = 0; k < numItems; k++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const totalPrice = prod.price * qty;
        totalAmount += totalPrice;

        salesItems.push({
          id: crypto.randomUUID(),
          tenant_id: DEMO_TENANT_ID,
          transaction_id: txnId,
          product_id: prod.id,
          quantity: qty,
          unit_price: prod.price,
          total_price: totalPrice,
        });
      }

      const randStatus = Math.random();
      const status = randStatus > 0.10 ? 'Completed' : (randStatus > 0.05 ? 'Pending' : 'Refunded');
      const randPayment = Math.random();
      const paymentMethod = randPayment > 0.40 ? 'Cash' : (randPayment > 0.15 ? 'Transfer' : 'Card');
      const customer = Math.random() > 0.3 ? customers[Math.floor(Math.random() * customers.length)] : null;

      transactions.push({
        id: txnId,
        tenant_id: DEMO_TENANT_ID,
        branch_id: DEMO_BRANCH_ID,
        customer: customer ? customer.name : 'Walk-in Customer',
        initials: customer ? customer.initials : 'WC',
        date_time: txDate.toISOString(),
        amount: totalAmount,
        status,
        payment_method: paymentMethod,
        staff_name: STAFF_NAMES[Math.floor(Math.random() * STAFF_NAMES.length)],
      });
    }
  }

  // Sort transactions descending by date_time
  transactions.sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());

  return { products, customers, transactions, salesItems };
}
