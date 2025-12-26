# How to Get Netlify API Token - Step by Step

## Step 1: Go to Netlify Dashboard

1. Open your browser
2. Go to: **https://app.netlify.com**
3. Log in (or sign up if you don't have an account)

## Step 2: Navigate to User Settings

1. Click your **profile icon** (usually in the top right corner)
2. A dropdown menu will appear
3. Click **"User settings"** or **"Account settings"**

## Step 3: Go to Applications Tab

1. In the settings menu on the left, look for **"Applications"** tab
2. Click on it
3. You should see a section about "Personal access tokens" or "Access tokens"

## Step 4: Create New Token

1. Click the button: **"New access token"** or **"Generate new token"**
2. Give it a name like: `Aqall AI Deployment` or `Website Builder`
3. Click **"Generate token"** or **"Create"**
4. **IMPORTANT**: Copy the token immediately - it will only show once!
5. The token will look something like: `nfp_abc123xyz789...`

## Step 5: Add to .env.local

Open your `.env.local` file and add this line at the end:

```bash
NETLIFY_API_TOKEN=your_copied_token_here
```

Replace `your_copied_token_here` with the actual token you copied.

## Alternative: If You Can't Find "Applications" Tab

Sometimes it's under:
- **"Applications"** → **"OAuth applications"** → **"Personal access tokens"**
- Or just search for "token" in the settings page
- Or look for **"API"** or **"Access tokens"** in the left menu

## Still Can't Find It?

If you can't find where to generate tokens:

1. Try this direct link: **https://app.netlify.com/user/applications#personal-access-tokens**
2. Or search in Netlify docs: "Netlify personal access token"

---

**Once you have the token, just add it to `.env.local`!** 🎉

