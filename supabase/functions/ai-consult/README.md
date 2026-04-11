# AI Consult Edge Function

This Supabase Edge Function provides drug information by fetching data from OpenFDA and RxNorm APIs, then summarizing it using Groq's LLM.

## Quick Start

### 1. Check Supabase CLI
```bash
supabase --version
```

If not installed:
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to your project
```bash
supabase link --project-ref your-project-ref
```

### 4. Set Groq API Key
```bash
supabase secrets set GROQ_API_KEY=your-groq-api-key-here
```

Get your Groq API key from: https://console.groq.com/

### 5. Deploy the function
```bash
supabase functions deploy ai-consult
```

### 6. Test the deployment
```bash
# View logs
supabase functions logs ai-consult --follow

# Or test directly
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/ai-consult' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"query":"Aspirin"}'
```

## Troubleshooting

### Error: "Function not found" or 404
- Run: `supabase functions deploy ai-consult`
- Verify deployment: `supabase functions list`

### Error: "AI service not configured"
- Check secrets: `supabase secrets list`
- Set Groq key: `supabase secrets set GROQ_API_KEY=your-key`

### Error: "Unauthorized" or 401
- Ensure user is logged in on frontend
- Check that Authorization header is being sent

### Error: "Non-2xx status code"
- Check function logs: `supabase functions logs ai-consult`
- Look for specific error messages in logs
- Verify all environment variables are set

## Testing Without Groq

If you want to test the OpenFDA/RxNorm integration without Groq:

1. Temporarily replace `index.ts` with `test-version.ts`
2. Deploy: `supabase functions deploy ai-consult`
3. Test the basic API flow
4. Restore `index.ts` and set up Groq

## API Flow

```
User Query → Frontend → Supabase Edge Function → OpenFDA + RxNorm → Groq → Frontend
```

## Request Format

```json
{
  "query": "Amoxicillin"
}
```

## Response Format

```json
{
  "response": "Structured summary of drug information..."
}
```

## Error Response Format

```json
{
  "error": "Error message",
  "hint": "Helpful hint for fixing",
  "details": "Additional details"
}
```

## External APIs Used

- **OpenFDA**: https://api.fda.gov/drug/label.json
- **RxNorm**: https://rxnav.nlm.nih.gov/REST/
- **Groq**: https://api.groq.com/openai/v1/chat/completions

## Environment Variables

Set in Supabase (not in .env files):
- `GROQ_API_KEY` - Your Groq API key
- `SUPABASE_URL` - Auto-set by Supabase
- `SUPABASE_ANON_KEY` - Auto-set by Supabase
