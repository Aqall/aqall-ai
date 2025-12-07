# Supabase Email Confirmation Setup

## Quick Setup (No Redirect URL Needed for Localhost)

For **localhost development**, you don't need to add `http://localhost:3000/auth/confirm` to redirect URLs. Supabase will work with the default configuration.

### Step 1: Set Site URL

1. Go to: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet/auth/url-configuration
2. Set **Site URL** to: `http://localhost:3000`
3. Click **Save**

That's it! You don't need to add anything to "Redirect URLs" for localhost.

### Step 2: Enable Email Confirmation

1. Go to: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet/auth/settings
2. Make sure **"Enable email confirmations"** is **ON**
3. Click **Save**

### Step 3: (Optional) Customize Email Template

If you want the confirmation link to go directly to `/auth/confirm`:

1. Go to: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet/auth/templates
2. Click on **"Confirm Signup"** template
3. Find the confirmation link in the template (usually looks like):
   ```html
   <a href="{{ .ConfirmationURL }}">Confirm your email</a>
   ```
4. Replace it with:
   ```html
   <a href="{{ .SiteURL }}/auth/confirm{{ .TokenHash }}">Confirm your email</a>
   ```
   Or keep it as is - the default will work too.

## How It Works

1. **User signs up** → Sees "Check Your Email" message
2. **User clicks email link** → Supabase redirects to your Site URL with tokens in the URL hash
3. **Our `/auth/confirm` page** → Extracts tokens from URL and verifies
4. **Auto-login** → User is signed in and redirected to dashboard

## For Production

When deploying to production:

1. Set **Site URL** to your production domain: `https://yourdomain.com`
2. Add to **Redirect URLs**: `https://yourdomain.com/auth/confirm`
3. Update the email template if needed

## Testing

1. Sign up at: http://localhost:3000/auth?mode=signup
2. Check your email inbox
3. Click the confirmation link
4. You should be redirected to `/auth/confirm` → then auto-redirected to `/dashboard`

## Troubleshooting

**If the confirmation link doesn't work:**
- Make sure Site URL is set to `http://localhost:3000`
- Check browser console for errors
- Verify email confirmation is enabled in Supabase settings
- The link expires after 1 hour by default

**If you get "Invalid or expired confirmation link":**
- The link might have expired (try signing up again)
- The token format might be different (check browser console for the actual URL)
