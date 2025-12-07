# Email Link Troubleshooting

## Issue: Email Link Opens Wrong App

If clicking the confirmation link in your email opens "Create React App" or another app instead of your browser:

### Solution 1: Copy and Paste the Link

1. **Right-click** on the confirmation link in your email
2. Select **"Copy link address"** or **"Copy link"**
3. Open your browser (Chrome, Safari, Firefox, etc.)
4. Paste the link in the address bar
5. Press Enter

### Solution 2: Check Default Browser Settings

On macOS:
1. Go to **System Settings** → **Desktop & Dock**
2. Under **Default web browser**, select your preferred browser (Chrome, Safari, etc.)
3. Try clicking the email link again

### Solution 3: Use the Link Directly

The confirmation link should look like:
```
http://localhost:3000/auth/confirm#access_token=xxx&refresh_token=xxx&type=signup
```

You can manually navigate to this URL in your browser.

## Issue: Verification Stuck on "Verifying..."

If the page is stuck on "Verifying..." for more than a few seconds:

1. **Check the browser console** (F12 → Console tab) for errors
2. **Check the URL** - it should have tokens in the hash (`#access_token=...`)
3. **Try refreshing the page** - Supabase might auto-detect the session
4. **Check if you're already logged in** - go to `/dashboard` to see if it worked

## Manual Verification

If automatic verification doesn't work:

1. Copy the full URL from the email link
2. Open your browser
3. Navigate to: `http://localhost:3000/auth/confirm`
4. Manually add the tokens from the email link to the URL hash
5. The page should detect and verify automatically

## Testing Without Email

For quick testing during development:

1. Disable email confirmation in Supabase settings
2. Sign up will immediately log you in
3. No email verification needed
