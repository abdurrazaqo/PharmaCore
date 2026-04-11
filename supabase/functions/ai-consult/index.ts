import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenFDAResponse {
  results?: Array<{
    indications_and_usage?: string[]
    dosage_and_administration?: string[]
    warnings?: string[]
    contraindications?: string[]
    adverse_reactions?: string[]
    openfda?: {
      brand_name?: string[]
      generic_name?: string[]
    }
  }>
}

interface RxNormRxcuiResponse {
  idGroup?: {
    rxnormId?: string[]
  }
}

interface RxNormInteractionResponse {
  interactionTypeGroup?: Array<{
    interactionType?: Array<{
      interactionPair?: Array<{
        description?: string
        interactionConcept?: Array<{
          minConceptItem?: {
            name?: string
          }
          sourceConceptItem?: {
            name?: string
          }
        }>
      }>
    }>
  }>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== AI Consult Request ===')
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Optional authentication - verify if header is present
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (authHeader) {
      // Only verify if auth header is provided
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      
      try {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        
        if (user) {
          console.log('Authenticated user:', user.email)
        } else {
          console.log('Auth verification failed:', userError?.message)
        }
      } catch (authError) {
        console.error('Auth check error:', authError)
        // Continue anyway - don't block on auth errors
      }
    }

    const { query } = await req.json()
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing query:', query)

    // Verify Groq API Key early
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not configured in Supabase secrets')
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured. Please set GROQ_API_KEY in Supabase secrets.',
          hint: 'Run: supabase secrets set GROQ_API_KEY=your-key'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Extract Drug Names via Groq
    console.log('Sending extraction task to Groq...')
    const extractResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Extract all drug names from the following query. Return only a JSON array of drug name strings, nothing else. Example: ["warfarin", "ibuprofen"]'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.1,
        max_tokens: 1024,
      })
    })

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text()
      console.error('Groq Extraction API error:', extractResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Groq Extraction API error: ${extractResponse.status}`,
          details: errorText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const extractData = await extractResponse.json()
    let extractedContent = extractData.choices?.[0]?.message?.content || '[]'
    
    // Clean potential markdown blocks
    extractedContent = extractedContent.trim()
    if (extractedContent.startsWith('```')) {
      extractedContent = extractedContent.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim()
    }

    let drugNames: string[] = []
    try {
      drugNames = JSON.parse(extractedContent)
      if (!Array.isArray(drugNames)) {
        drugNames = []
      }
    } catch (e) {
      console.error('Failed to parse drug names array from Groq output:', extractedContent)
      drugNames = []
    }

    console.log('Extracted drug names:', drugNames)

    if (drugNames.length === 0) {
      return new Response(
        JSON.stringify({ 
          response: 'No drug information found for that query. Please check the drug names and try again.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2 & 3: Iterate and Fetch API Data for all extracted drugs
    const allContextParts: string[] = []

    for (const drugName of drugNames) {
      console.log(`\n--- Fetching data for drug: ${drugName} ---`)
      let fdaData = null
      
      // OpenFDA Brand Name
      try {
        const brandResponse = await fetch(
          `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"&limit=1`
        )
        if (brandResponse.ok) {
          const data: OpenFDAResponse = await brandResponse.json()
          if (data.results && data.results.length > 0) {
            fdaData = data.results[0]
            console.log(`Found drug data by brand name for ${drugName}`)
          }
        }
      } catch (error) {
        console.error(`OpenFDA brand_name search error for ${drugName}:`, error)
      }

      // OpenFDA Generic Name (fallback)
      if (!fdaData) {
        try {
          const genericResponse = await fetch(
            `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`
          )
          if (genericResponse.ok) {
            const data: OpenFDAResponse = await genericResponse.json()
            if (data.results && data.results.length > 0) {
              fdaData = data.results[0]
              console.log(`Found drug data by generic name for ${drugName}`)
            }
          }
        } catch (error) {
          console.error(`OpenFDA generic_name search error for ${drugName}:`, error)
        }
      }

      // RxNorm
      let interactionsText = ''
      try {
        console.log(`Fetching RxCUI from RxNorm for ${drugName}...`)
        const rxcuiResponse = await fetch(
          `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`
        )
        
        if (rxcuiResponse.ok) {
          const rxcuiData: RxNormRxcuiResponse = await rxcuiResponse.json()
          const rxcui = rxcuiData?.idGroup?.rxnormId?.[0]
          
          if (rxcui) {
            console.log(`Found RxCUI: ${rxcui} for ${drugName}`)
            const interactionsResponse = await fetch(
              `https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`
            )
            
            if (interactionsResponse.ok) {
              const interactionsData: RxNormInteractionResponse = await interactionsResponse.json()
              const interactions = interactionsData?.interactionTypeGroup?.[0]?.interactionType?.[0]?.interactionPair || []
              
              if (interactions.length > 0) {
                interactionsText = '\n\nDRUG INTERACTIONS:\n'
                interactions.slice(0, 10).forEach((pair, idx) => {
                  const desc = pair.description || 'No description available'
                  const interactionNames = pair.interactionConcept?.map(c => 
                    c.minConceptItem?.name || c.sourceConceptItem?.name
                  ).filter(Boolean).join(' + ') || 'Unknown drugs'
                  interactionsText += `${idx + 1}. ${interactionNames}: ${desc}\n`
                })
              } else {
                interactionsText = '\n\nDRUG INTERACTIONS: No known interactions found in database.\n'
              }
            }
          } else {
            console.log(`No RxCUI found for ${drugName}, skipping interactions`)
            interactionsText = '\n\nDRUG INTERACTIONS: Unable to retrieve interaction data.\n'
          }
        }
      } catch (error) {
        console.error(`RxNorm interaction fetch error for ${drugName}:`, error)
        interactionsText = '\n\nDRUG INTERACTIONS: Error retrieving interaction data.\n'
      }

      // Format string for this drug
      const drugContextParts = []
      drugContextParts.push(`\n--- ${drugName.toUpperCase()} ---`)
      
      if (fdaData) {
        if (fdaData.openfda?.brand_name?.[0]) {
          drugContextParts.push(`BRAND NAME: ${fdaData.openfda.brand_name[0]}`)
        }
        if (fdaData.openfda?.generic_name?.[0]) {
          drugContextParts.push(`GENERIC NAME: ${fdaData.openfda.generic_name[0]}`)
        }
        if (fdaData.indications_and_usage) {
          drugContextParts.push(`\nINDICATIONS AND USAGE:\n${fdaData.indications_and_usage.join('\n')}`)
        }
        if (fdaData.dosage_and_administration) {
          drugContextParts.push(`\nDOSAGE AND ADMINISTRATION:\n${fdaData.dosage_and_administration.join('\n')}`)
        }
        if (fdaData.contraindications) {
          drugContextParts.push(`\nCONTRAINDICATIONS:\n${fdaData.contraindications.join('\n')}`)
        }
        if (fdaData.warnings) {
          drugContextParts.push(`\nWARNINGS:\n${fdaData.warnings.join('\n')}`)
        }
        if (fdaData.adverse_reactions) {
          drugContextParts.push(`\nADVERSE REACTIONS:\n${fdaData.adverse_reactions.join('\n')}`)
        }
      } else {
        drugContextParts.push(`No FDA label data found for this specific drug.`)
      }

      drugContextParts.push(interactionsText)
      allContextParts.push(drugContextParts.join('\n'))
    }

    const contextString = allContextParts.join('\n\n')
    console.log(`Final Context string length: ${contextString.length}`)

    // Step 4: Send to Groq for summarization
    console.log('Sending final answering task to Groq...')
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical pharmacy assistant. Using only the provided drug reference data, give a clear, structured summary covering: indications, dosage, contraindications, key warnings, adverse effects, and drug interactions. Be concise and professional. Never invent information not present in the data.'
          },
          {
            role: 'user',
            content: `${contextString}\n\nOriginal Query: ${query}\n\nPlease provide a structured summary of this drug information and answer the specific question requested in the query.`
          }
        ],
        temperature: 0.5,
        max_tokens: 2048,
      })
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq Final Summary API error:', groqResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Groq Final Summary API error: ${groqResponse.status}`,
          details: errorText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqData = await groqResponse.json()
    const responseText = groqData.choices?.[0]?.message?.content || 'Unable to generate summary'
    
    console.log('Successfully generated complete response')
    
    return new Response(
      JSON.stringify({ response: responseText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Edge Function Exception:', err)
    console.error('Error stack:', err.stack)
    return new Response(
      JSON.stringify({ 
        error: err.message || 'An error occurred',
        type: err.name,
        stack: err.stack
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
