#!/bin/bash

# Test script for ai-consult edge function
# Usage: ./test-edge-function.sh

echo "Testing ai-consult edge function..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if function exists
if [ ! -d "supabase/functions/ai-consult" ]; then
    echo "❌ ai-consult function directory not found"
    exit 1
fi

echo "✅ Function directory exists"
echo ""

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy ai-consult --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully"
else
    echo "❌ Function deployment failed"
    exit 1
fi

echo ""
echo "🔍 Checking function logs..."
echo "Run: supabase functions logs ai-consult --follow"
echo ""
echo "🧪 Test the function from the app by:"
echo "1. Opening the AI Consult panel"
echo "2. Entering a drug name like 'Aspirin'"
echo "3. Checking the browser console for detailed errors"
