# Demo Data Setup Guide

## Overview

The demo tenant requires fresh transaction data daily to showcase the dashboard's sales trends and analytics features. This guide explains how to set up automated daily resets.

## How Demo Data Works

The `reset-demo-data` edge function:
- Generates 30 days of transaction history (always relative to current date)
- Creates 8-13 transactions for "today"
- Creates 4-8 transactions for the past 7 days
- Creates 1-3 transactions for older days (8-30 days ago)
- Includes realistic Nigerian pharmacy products, customers, and sales

## Setup Automated Daily Reset

### Option 1: Supabase Cron Jobs (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Cron Jobs** (or use pg_cron extension)
3. Create a new cron job:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reset at 2 AM UTC
SELECT cron.schedule(
  'reset-demo-data-daily',
  '0 2 * * *',  -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-demo-data',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_CRON_SECRET',
        'Content-Type', 'application/json'
      )
    );
  $$
);
```

4. Set the `CRON_SECRET` environment variable in your Supabase project settings

### Option 2: External Cron Service

Use services like:
- **Cron-job.org** (free)
- **EasyCron**
- **GitHub Actions**

Example GitHub Actions workflow (`.github/workflows/reset-demo-data.yml`):

```yaml
name: Reset Demo Data Daily

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Allow manual trigger

jobs:
  reset-demo:
    runs-on: ubuntu-latest
    steps:
      - name: Call Reset Function
        run: |
          curl -X POST \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-demo-data \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

### Option 3: Manual Reset Script

Run the seed script manually:

```bash
# Install dependencies if needed
npm install

# Run the seed script
npm run seed:demo
```

Or use the edge function directly:

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/reset-demo-data \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Environment Variables Required

Add these to your Supabase Edge Functions environment:

- `CRON_SECRET` - Secret token for authenticating cron requests
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

## Verifying the Setup

After setup, check:

1. **Dashboard Sales Trend Chart** - Should show data for the last 7 days
2. **Today's Sales** - Should have 8-13 transactions
3. **Recent Transactions** - Should show current timestamps

## Troubleshooting

### No recent transactions showing

- Check if the cron job is running (check Supabase logs)
- Verify the `CRON_SECRET` matches in both the cron job and edge function
- Manually trigger the reset to test: `npm run seed:demo`

### Transactions have old dates

- The seed data generates dates relative to when it runs
- If the cron job hasn't run recently, dates will be stale
- Trigger a manual reset to fix immediately

### Edge function errors

- Check Supabase Edge Function logs
- Verify all environment variables are set
- Ensure the demo tenant ID exists: `00000000-0000-0000-0000-000000000001`

## Demo Tenant Details

- **Tenant ID:** `00000000-0000-0000-0000-000000000001`
- **Branch ID:** `00000000-0000-0000-0000-000000000002`
- **Products:** 50 realistic Nigerian pharmacy items
- **Customers:** 20 sample patients
- **Transactions:** ~150-200 over 30 days

## Notes

- The reset is destructive - it deletes all existing demo data
- Only affects the demo tenant (ID: `00000000-0000-0000-0000-000000000001`)
- Other tenants are not affected
- Audit logs are created for each reset
