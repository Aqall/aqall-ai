# Fixing 404 on Netlify - Next.js App Router

## The Problem

Next.js App Router apps need special configuration on Netlify. Without it, you get 404 errors.

## Solution: Install Netlify Next.js Plugin

### Step 1: Install the Plugin

Run this command in your project:

```bash
npm install --save-dev @netlify/plugin-nextjs
```

### Step 2: I've Created `netlify.toml`

I've created a `netlify.toml` file in your project root. This tells Netlify how to handle Next.js.

### Step 3: Redeploy on Netlify

1. **Commit and push** the changes:
   ```bash
   git add netlify.toml package.json package-lock.json
   git commit -m "Add Netlify Next.js configuration"
   git push
   ```

2. **Or manually redeploy** in Netlify dashboard:
   - Go to your Netlify site
   - Click "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"

### Step 4: Verify Build Settings in Netlify

In your Netlify dashboard:
- Go to **Site settings** → **Build & deploy**
- Make sure:
  - **Build command**: `npm run build` (or `npm run build`)
  - **Publish directory**: `.next` (or leave empty, plugin handles it)

---

## What the `netlify.toml` Does

- Tells Netlify to use the Next.js plugin
- Configures redirects for App Router
- Ensures all routes go through Next.js

---

## After Fix

Your app should work correctly on Netlify! ✅

