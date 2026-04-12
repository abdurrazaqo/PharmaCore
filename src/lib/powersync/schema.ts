import { column, Schema, Table } from '@powersync/web';

export const AppSchema = new Schema({
  products: new Table({
    tenant_id: column.text,
    branch_id: column.text,
    name: column.text,
    generic: column.text,
    category: column.text,
    unit: column.text,
    batch_no: column.text,
    expiry_date: column.text,
    expiry_months_left: column.text,
    stock_level: column.integer,
    total_units: column.integer,
    last_restock_quantity: column.integer,
    cost_price: column.real,
    price: column.real,
    image: column.text
  }),
  customers: new Table({
    tenant_id: column.text,
    branch_id: column.text,
    name: column.text,
    phone: column.text,
    visits: column.integer,
    balance: column.real,
    insurance: column.text,
    initials: column.text,
    created_at: column.text
  }),
  sales: new Table({
    tenant_id: column.text,
    branch_id: column.text,
    transaction_id: column.text,
    product_id: column.text,
    quantity: column.integer,
    unit_price: column.real,
    total_price: column.real
  }),
  transactions: new Table({
    tenant_id: column.text,
    branch_id: column.text,
    customer_id: column.text,
    user_id: column.text,
    customer: column.text,
    initials: column.text,
    date_time: column.text,
    amount: column.real,
    status: column.text,
    payment_method: column.text,
    staff_name: column.text
  }),
  branches: new Table({
    tenant_id: column.text,
    name: column.text,
    location: column.text,
    phone: column.text
  }),
  users: new Table({
    tenant_id: column.text,
    branch_id: column.text,
    role: column.text,
    display_name: column.text,
    is_suspended: column.integer
  }),
  tenants: new Table({
    name: column.text,
    plan: column.text,
    status: column.text,
    billing_cycle: column.text,
    onboarding_completed: column.integer,
    logo_url: column.text
  })
});

export type Database = (typeof AppSchema)['types'];
