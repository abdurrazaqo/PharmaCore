# Demo Data Seeding

## Overview
This folder contains scripts for seeding demo data into the PharmaCore demo tenant.

## Seeding Demo Data

To populate the demo environment with sample products, customers, and transactions:

```bash
npm run seed-demo
```

This script will:
1. Delete all existing demo data (products, customers, transactions, sales)
2. Generate fresh seed data with realistic Nigerian pharmaceutical products
3. Insert the new data into the database

## When to Run

Run the seed script:
- After initial database setup
- When demo data needs to be refreshed
- Before showcasing the demo to users
- If demo data becomes corrupted or outdated

## Requirements

Make sure your `.env` or `.env.local` file contains:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Demo Tenant ID

The demo tenant uses a fixed UUID: `00000000-0000-0000-0000-000000000001`

All demo data is scoped to this tenant ID.
