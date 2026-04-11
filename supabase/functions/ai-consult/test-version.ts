// Simplified test version without authentication
// Use this to test if the basic API flow works
// Replace index.ts with this temporarily for testing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== AI Consult Test Version ===')
    
    const { query } = await req.json()
    console.log('Query received:', query)
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Test OpenFDA
    console.log('Testing OpenFDA...')
    const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(query)}"&limit=1`
    console.log('FDA URL:', fdaUrl)
    
    const fdaResponse = await fetch(fdaUrl)
    console.log('FDA Status:', fdaResponse.status)
    
    if (!fdaResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenFDA API error',
          status: fdaResponse.status,
          response: 'Drug not found or API error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fdaData = await fdaResponse.json()
    console.log('FDA Results:', fdaData.results?.length || 0)

    // Return simple response without Groq for testing
    return new Response(
      JSON.stringify({ 
        response: `Test successful! Found drug data for: ${query}. OpenFDA returned ${fdaData.results?.length || 0} results.`,
        debug: {
          query,
          fdaStatus: fdaResponse.status,
          resultsCount: fdaData.results?.length || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ 
        error: err.message,
        stack: err.stack
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
