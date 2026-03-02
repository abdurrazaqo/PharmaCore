# PharmaCore Deployment Guide

## Deploying to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import Project to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Vite configuration

### Step 3: Configure Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important:** 
- Add these variables for ALL environments (Production, Preview, Development)
- Click "Add" after entering each variable
- Make sure variable names are EXACTLY as shown (case-sensitive)

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployed site

### Step 5: Verify AI Consult
1. Open the deployed app
2. Click the AI Assistant button
3. Try asking a medical query
4. If you see "API key not configured", check that:
   - Environment variables are set correctly in Vercel
   - Variable names match exactly: `VITE_GEMINI_API_KEY`
   - You've redeployed after adding variables

### Troubleshooting

#### AI Consult Not Working
**Problem:** "API key not configured" error

**Solution:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `VITE_GEMINI_API_KEY` exists and has the correct value
3. Make sure it's enabled for "Production" environment
4. Redeploy: Deployments → Three dots menu → Redeploy

#### Environment Variables Not Loading
**Problem:** Variables work locally but not on Vercel

**Solution:**
1. Ensure all variable names start with `VITE_` prefix
2. Check that variables are added to the correct environment
3. Trigger a new deployment after adding variables
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

#### Build Fails
**Problem:** Build errors during deployment

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure `package.json` has correct build script
3. Verify all dependencies are in `package.json`
4. Try building locally: `npm run build`

### Redeploying After Changes

**Option 1: Git Push (Automatic)**
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Vercel will automatically deploy.

**Option 2: Manual Redeploy**
1. Go to Vercel Dashboard → Deployments
2. Click three dots on latest deployment
3. Click "Redeploy"

### Custom Domain Setup

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed by Vercel
4. Wait for DNS propagation (can take up to 48 hours)

### Performance Optimization

The app is already optimized with:
- ✅ Vite build optimization
- ✅ Code splitting
- ✅ Asset compression
- ✅ Font preloading
- ✅ Image optimization
- ✅ Skeleton loaders for better perceived performance

### Security Checklist for Production

- [ ] Enable Supabase Row Level Security (RLS)
- [ ] Implement user authentication
- [ ] Restrict database access by IP
- [ ] Use secure API keys (never commit to Git)
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Set up monitoring and error tracking
- [ ] Regular database backups
- [ ] Implement rate limiting for API calls

### Monitoring

**Vercel Analytics:**
1. Go to Vercel Dashboard → Analytics
2. View real-time traffic and performance metrics

**Supabase Monitoring:**
1. Go to Supabase Dashboard → Database → Logs
2. Monitor database queries and errors

### Support

If you encounter issues:
1. Check Vercel build logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Contact: hello@365health.online

---

**PharmaCore** - Built with ❤️ by 365Health
