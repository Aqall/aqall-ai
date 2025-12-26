# How to Deploy to Netlify

## Option 1: Git Deployment (Recommended - Automatic)

If your Netlify site is connected to Git:

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Fix build errors and add Netlify config"
   git push
   ```

2. **Netlify will automatically deploy** when you push to your connected branch (usually `main` or `master`)

3. **Check deployment status:**
   - Go to your Netlify dashboard
   - Click your site
   - Go to "Deploys" tab
   - You'll see the new deployment starting automatically

---

## Option 2: Manual Deploy via Netlify Dashboard

If you're not using Git or want to deploy manually:

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Click on your site

2. **Manual Deploy**
   - Click "Deploys" tab
   - Click "Trigger deploy" button
   - Select "Deploy site"
   - If asked, choose your branch or upload files

---

## Option 3: Netlify CLI (Advanced)

If you have Netlify CLI installed:

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

---

## What Files to Deploy

Make sure these files are included:
- ✅ `netlify.toml` (I created this)
- ✅ `package.json` (updated with Netlify plugin)
- ✅ All your source files
- ✅ `.env.local` is **NOT** deployed (add environment variables in Netlify dashboard instead)

---

## Environment Variables in Netlify

**Important:** Add environment variables in Netlify dashboard:

1. Go to your site → **Site settings** → **Environment variables**
2. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `NETLIFY_API_TOKEN` (for future deployment feature)

---

## Quick Check After Deploy

After deployment completes:
- ✅ Site should load without 404 errors
- ✅ Check your domain - it should work now
- ✅ Try logging in/signing up

---

**Most common method:** Just `git push` if you have Git connected! 🚀

