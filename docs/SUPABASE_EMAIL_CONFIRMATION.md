# Fixing Email Confirmation Issues

If you're getting a 400 error when trying to login, it's likely because **email confirmation is required** in your Supabase project settings.

## Quick Fix: Disable Email Confirmation (for Development)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet
2. Navigate to **Authentication** → **Settings** (or **Auth** → **Settings**)
3. Scroll down to **Email Auth** section
4. Find **"Enable email confirmations"** toggle
5. **Turn it OFF** (disable it) for development
6. Click **Save**

Now you can sign up and immediately log in without email confirmation.

## Alternative: Keep Email Confirmation Enabled

If you want to keep email confirmation enabled:

1. After signing up, check your email inbox (and spam folder)
2. Click the confirmation link in the email
3. Then you can log in

## For Production

In production, you should:
- Keep email confirmation **enabled** for security
- Set up proper email templates
- Configure your email provider (SMTP settings)

## Testing Without Email

If you want to test without email confirmation during development:

1. Disable email confirmation (steps above)
2. Sign up with any email (doesn't need to be real)
3. You'll be immediately logged in
4. Session will persist across page refreshes

## Common Error Messages

- **400 Bad Request**: Usually means email confirmation is required
- **Invalid login credentials**: Wrong email/password or account doesn't exist
- **Email not confirmed**: User needs to click confirmation link in email
