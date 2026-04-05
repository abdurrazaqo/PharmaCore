# Scripts

## Overview
This folder contains utility scripts for managing PharmaCore data.

## Available Scripts

### 1. Seeding Demo Data

To populate the demo environment with sample products, customers, and transactions:

```bash
npm run seed-demo
```

This script will:
1. Delete all existing demo data (products, customers, transactions, sales)
2. Generate fresh seed data with realistic Nigerian pharmaceutical products
3. Insert the new data into the database

### 2. Cleanup Beta Data

To clear all beta access codes and registered pharmacies (clean slate):

```bash
npm run cleanup-beta
```

This script will:
1. Delete all non-demo tenants and their associated data
2. Remove all users from deleted tenants
3. Clear all onboarding requests
4. Delete all access codes (beta and regular)
5. Preserve the demo tenant and its data

⚠️ **Warning**: This is a destructive operation. Use with caution in production environments.

## When to Run

### Seed Demo
Run the seed script:
- After initial database setup
- When demo data needs to be refreshed
- Before showcasing the demo to users
- If demo data becomes corrupted or outdated

### Cleanup Beta
Run the cleanup script:
- When resetting the beta testing environment
- Before starting a new beta testing phase
- To remove all test pharmacies and start fresh
- When cleaning up after development/testing

## Requirements

Make sure your `.env` or `.env.local` file contains:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_SERVICE_ROLE_KEY` (required for cleanup script)

## Demo Tenant ID

The demo tenant uses a fixed UUID: `00000000-0000-0000-0000-000000000001`

All demo data is scoped to this tenant ID and is preserved during cleanup operations.

