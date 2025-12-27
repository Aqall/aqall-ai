# Netlify Deployment Setup Guide

## Environment Variables Needed

### For Netlify API Integration

You'll need to add **ONE** new environment variable to your `.env.local`:

```bash
NETLIFY_API_TOKEN=your_netlify_api_token_here
```

**This is server-side only** (no `NEXT_PUBLIC_` prefix) - keep it secure!

---

## How to Get Your Netlify API Token

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Log in to your account

2. **Navigate to User Settings**
   - Click your profile icon (top right)
   - Select **"User settings"** or **"Team settings"**

3. **Get API Token**
   - Go to **"Applications"** tab
   - Click **"New access token"**
   - Give it a name (e.g., "Aqall AI Deployment")
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't see it again!)

4. **Add to `.env.local`**
   ```bash
   NETLIFY_API_TOKEN=your_copied_token_here
   ```

---

## Current Environment Variables (Already Set)

You should already have these in `.env.local`:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (already configured)
OPENAI_API_KEY=your_openai_key

# Netlify (NEW - add this)
NETLIFY_API_TOKEN=your_netlify_api_token
```

---

## Where to Add Environment Variables

### Local Development (.env.local)
✅ Already doing this - just add `NETLIFY_API_TOKEN`

### Production Deployment (Vercel/Railway/Render/etc.)

**If deploying your Next.js app:**

You'll need to add the environment variable to your hosting platform:

- **Vercel**: Project Settings → Environment Variables
- **Railway**: Variables tab
- **Render**: Environment tab
- **Any platform**: Add `NETLIFY_API_TOKEN` to production environment

**Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

---

## What About Render?

**Render** is just a hosting platform - you don't need anything special for Render itself.

The Netlify API token is only needed to deploy **TO** Netlify (where your generated sites will be hosted).

Think of it like this:
- **Render/Vercel/etc.** = Where YOUR Next.js app runs (Aqall AI itself)
- **Netlify** = Where the GENERATED websites get deployed (what users create)

---

## Summary

1. ✅ **Get Netlify API token** from Netlify dashboard
2. ✅ **Add to `.env.local`** for local development
3. ✅ **Add to production platform** (Render/Vercel/etc.) when you deploy your Next.js app

That's it! Just one new environment variable. 🎉



