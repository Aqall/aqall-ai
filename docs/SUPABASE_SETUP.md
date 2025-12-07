# Supabase Setup Guide

This guide explains how to set up Supabase authentication for Aqall.

## Prerequisites

- A Supabase project (region: EU–Frankfurt or any region)
- Access to your Supabase project dashboard

## Step 1: Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Step 2: Set Environment Variables

Create a `.env.local` file in the root of your project (if it doesn't exist) and add:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Example:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important:** 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The `NEXT_PUBLIC_` prefix makes these variables available in the browser
- These are safe to expose client-side (the anon key has RLS policies protecting your data)

## Step 3: Set Up Database Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/schema.sql` from this project
4. Uncomment and run the **PROFILES TABLE** section:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This will:
- Create the `profiles` table
- Set up Row Level Security (RLS) policies
- Automatically create a profile when a user signs up (via trigger)

## Step 4: Install Dependencies

Run:
```bash
npm install
```

This will install `@supabase/supabase-js` which is required for Supabase integration.

## Step 5: Verify Setup

1. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

2. Try signing up a new user at `/auth?mode=signup`
3. Check your Supabase Dashboard → **Authentication** → **Users** to see the new user
4. Check **Table Editor** → **profiles** to see the automatically created profile

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Make sure `.env.local` exists in the project root
- Verify the variable names are exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server after adding environment variables

### Error: "relation 'profiles' does not exist"
- You need to run the SQL schema from Step 3
- Make sure you're running it in the correct Supabase project

### Error: "new row violates row-level security policy"
- The RLS policies might not be set up correctly
- Re-run the policies section from Step 3

### Users can sign up but profile is not created
- Check if the trigger `on_auth_user_created` exists
- The `ensureProfile` function in the code will also create profiles as a fallback

## Next Steps

After authentication is working:
- Projects and builds integration (Phase 3 of roadmap)
- File storage setup
- OpenAI API integration

## Security Notes

- The `anon` key is safe to expose client-side because:
  - Row Level Security (RLS) policies protect your data
  - Users can only access their own data
  - Never use the `service_role` key in client-side code

## Support

For Supabase-specific issues, check:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
