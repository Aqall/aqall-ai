# Email Not Being Received - Troubleshooting

If you see "Check Your Email" but don't receive an email, follow these steps:

## Step 1: Check Supabase Email Settings

1. Go to: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet/auth/settings
2. Check **"Enable email confirmations"** - it should be **ON**
3. Scroll down to **"SMTP Settings"**
4. Check if SMTP is configured:
   - If it says "Using Supabase SMTP" → Emails should work (check spam)
   - If it says "Not configured" → You need to set up SMTP or use Supabase's default

## Step 2: Check Email Logs in Supabase

1. Go to: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet/auth/logs
2. Look for recent signup attempts
3. Check if emails were sent (you'll see "Email sent" status)
4. If you see errors, that's the issue

## Step 3: Check Spam Folder

- Supabase emails often go to spam
- Check your spam/junk folder
- Look for emails from `noreply@mail.app.supabase.io` or similar

## Step 4: Verify Email Address

- Make sure you're using a **real email address** (not a fake one)
- Some email providers block Supabase emails
- Try with a Gmail account for testing

## Step 5: Check Browser Console

1. Open browser console (F12)
2. Look for any errors when signing up
3. Check the console logs - you should see:
   - "Email confirmation required - email should be sent to: your@email.com"

## Quick Test: Disable Email Confirmation

For immediate testing, you can disable email confirmation:

1. Go to: https://supabase.com/dashboard/project/amsgzjpthawgyjzfdxet/auth/settings
2. Turn **OFF** "Enable email confirmations"
3. Click **Save**
4. Now signup will immediately log you in (no email needed)

## Alternative: Use Magic Link (No Password)

If emails aren't working, you could implement magic link authentication instead, but that's a bigger change.

## For Production

In production, you should:
- Set up custom SMTP (SendGrid, Mailgun, etc.)
- Configure proper email templates
- Set up email domain verification
