# Environment Variables Setup

This document describes all required environment variables for the Aqall AI application.

## Required Environment Variables

### Supabase Configuration

These variables are required for authentication and database operations.

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to find:**
1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** and **anon/public** key

**Example:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### OpenAI Configuration

This variable is required for AI-powered website generation.

```bash
OPENAI_API_KEY=your_openai_api_key
```

**Where to find:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys** section
3. Create a new API key or use an existing one

**Important:**
- This is a **server-side only** variable (not prefixed with `NEXT_PUBLIC_`)
- Never expose this key to the client-side code
- Keep it secure and never commit it to version control

**Example:**
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Setup Instructions

### 1. Create `.env.local` File

Create a `.env.local` file in the root of your project:

```bash
touch .env.local
```

### 2. Add Environment Variables

Add all required variables to `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Restart Development Server

After adding or modifying environment variables, restart your development server:

```bash
npm run dev
```

## Environment File Structure

```
aqall-ai/
├── .env.local          # Local development (git-ignored)
├── .env.example        # Example file (optional, for documentation)
└── ...
```

## Security Notes

### ✅ Safe to Commit
- `.env.example` (with placeholder values)
- Documentation files

### ❌ Never Commit
- `.env.local`
- `.env`
- Any file containing actual API keys or secrets

### Git Ignore

Make sure `.env.local` is in your `.gitignore`:

```gitignore
# Environment variables
.env.local
.env*.local
```

## Verification

To verify your environment variables are loaded correctly:

1. **Check Supabase connection:**
   - Try logging in/signing up
   - If authentication works, Supabase variables are correct

2. **Check OpenAI connection:**
   - Try generating a website in BuildChat
   - If generation works, OpenAI variable is correct

3. **Check console for errors:**
   - Open browser DevTools
   - Look for any "Missing environment variable" errors

## Troubleshooting

### "Missing Supabase environment variables"
- Verify `.env.local` exists in project root
- Check variable names are exactly as shown (case-sensitive)
- Restart dev server after adding variables

### "OPENAI_API_KEY environment variable is not set"
- Verify `OPENAI_API_KEY` is in `.env.local` (without `NEXT_PUBLIC_` prefix)
- Check the key is valid and has sufficient credits
- Restart dev server

### Variables not loading
- Ensure file is named `.env.local` (not `.env` or `.env.development`)
- Check for typos in variable names
- Restart dev server completely (stop and start again)

## Production Deployment

For production (e.g., Vercel):

1. **Vercel:**
   - Go to Project Settings → Environment Variables
   - Add all required variables
   - Redeploy after adding

2. **Other platforms:**
   - Follow platform-specific instructions for environment variables
   - Ensure all variables are set before deployment

## Cost Considerations

### OpenAI API
- GPT-4.1 (latest coding-optimized model) is used for website generation
- Monitor usage in [OpenAI Dashboard](https://platform.openai.com/usage)
- Consider setting usage limits to control costs

### Supabase
- Free tier includes generous limits
- Monitor usage in Supabase Dashboard
