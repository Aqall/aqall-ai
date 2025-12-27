# Phase 9: Netlify Deployment - Testing Instructions

## 🎯 What Was Implemented

Phase 9 adds **one-click Netlify deployment** for generated websites:

1. ✅ **Database Migration** - `deployments` table to track deployments
2. ✅ **Netlify Service** - API integration for creating sites and deploying files
3. ✅ **Deploy API Route** - `/api/deploy` endpoint to handle deployment requests
4. ✅ **UI Components** - Deploy button and status display in Build page

---

## 📋 Step 1: Run Database Migration

**⚠️ IMPORTANT: You MUST run this SQL migration in Supabase before testing!**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migration-deployments.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify: Check that the `deployments` table was created in **Table Editor**

**Expected Result:**
- ✅ `deployments` table exists with columns: `id`, `project_id`, `build_id`, `netlify_site_id`, `netlify_deploy_id`, `url`, `status`, `created_at`, `updated_at`
- ✅ RLS policies are enabled

---

## 🔧 Step 2: Verify Environment Variables

Make sure your `.env.local` file has:

```bash
NETLIFY_API_TOKEN=nfp_PYiCUZirtrSbXUY4h2Zg8cXotCVNDRWAf181
```

**Verify:**
1. Check `.env.local` exists and has `NETLIFY_API_TOKEN`
2. Restart your dev server if you just added it:
   ```bash
   npm run dev
   ```

---

## 🧪 Step 3: Test Deployment Flow

### Test 1: First Deployment (New Site)

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```

2. **Login to Your App:**
   - Go to `http://localhost:3000`
   - Login with your account

3. **Create or Select a Project:**
   - Go to Dashboard
   - Create a new project OR select an existing one with builds

4. **Generate a Build (if needed):**
   - If project has no builds, generate one first
   - Enter a prompt like: "Create a simple landing page for a coffee shop"
   - Wait for build to complete

5. **Deploy to Netlify:**
   - In the Build page, you should see a **"Deploy to Netlify"** button (rocket icon)
   - Click the button
   - You should see:
     - Button shows "Deploying..." with spinner
     - Toast notification: "Deployment Started"
     - After a few seconds, another toast: "Deployed Successfully!"

6. **Verify Deployment:**
   - The button should change to:
     - **"Redeploy"** button (refresh icon)
     - **"View Site"** button (external link icon)
   - Click **"View Site"** → Should open your deployed site in a new tab
   - The URL should be something like: `https://project-name-abc123.netlify.app`

**Expected Result:**
- ✅ Deployment succeeds
- ✅ URL is displayed and clickable
- ✅ Site is accessible on Netlify
- ✅ Database has a deployment record with status `ready`

---

### Test 2: Redeploy (Update Existing Site)

1. **Make an Edit:**
   - In the Build page, make an edit to your project
   - For example: "Change the background color to blue"
   - Wait for edit to complete (new build version)

2. **Redeploy:**
   - Click the **"Redeploy"** button
   - Wait for deployment to complete

3. **Verify:**
   - Click **"View Site"** again
   - The site should show your latest changes
   - Same URL as before (no new site created)

**Expected Result:**
- ✅ Redeploy works
- ✅ Same URL is maintained
- ✅ Latest changes are visible on the live site

---

### Test 3: Multiple Projects

1. **Create Second Project:**
   - Create a new project
   - Generate a build for it

2. **Deploy Second Project:**
   - Deploy it to Netlify
   - Should get a different Netlify URL

**Expected Result:**
- ✅ Each project gets its own Netlify site
- ✅ Deployments are independent

---

## 🐛 Troubleshooting

### Error: "NETLIFY_API_TOKEN is not configured"

**Fix:**
- Check `.env.local` has `NETLIFY_API_TOKEN`
- Restart dev server: `npm run dev`
- If deployed, add token to Netlify environment variables

---

### Error: "Failed to create Netlify site" or "Failed to deploy to Netlify"

**Possible Causes:**
1. **Invalid API Token**
   - Check token is correct in `.env.local`
   - Verify token in Netlify dashboard: Settings → Applications → Personal access tokens

2. **API Rate Limits**
   - Wait a few minutes and try again
   - Check Netlify dashboard for any errors

3. **Site Name Conflict**
   - The code generates random site names, but if you hit a conflict, it will error
   - Try again (different random name will be generated)

**Fix:**
- Check browser console for detailed error
- Check Netlify dashboard → Sites for any errors
- Verify API token permissions include: `sites:create`, `deploys:create`

---

### Deployment Stays in "building" Status

**Possible Causes:**
- Netlify is still processing the deployment
- API polling stopped before completion

**Fix:**
- Wait up to 2 minutes
- Refresh the page
- Check Netlify dashboard manually
- Try redeploying

---

### Database Error: "relation 'deployments' does not exist"

**Fix:**
- **You forgot to run the migration!**
- Go back to **Step 1** and run the SQL migration

---

### Button Doesn't Appear

**Possible Causes:**
1. No builds exist for the project
2. No version selected

**Fix:**
- Generate a build first
- Make sure a version is selected in the version dropdown

---

## ✅ Success Criteria

Phase 9 is working correctly if:

1. ✅ **Database Migration** - `deployments` table exists and has correct schema
2. ✅ **First Deployment** - Can deploy a new project and get a Netlify URL
3. ✅ **Redeploy** - Can redeploy after edits and update the same URL
4. ✅ **Status Display** - Deployment status updates correctly (pending → building → ready)
5. ✅ **UI Updates** - Buttons change appropriately (Deploy → Redeploy + View Site)
6. ✅ **Live Site** - Deployed site is accessible and shows correct content

---

## 📝 Notes

- **Deployment Time:** Usually takes 10-30 seconds
- **Netlify URLs:** Format is `https://site-name-abc123.netlify.app`
- **Redeploy:** Uses the same Netlify site (updates existing deployment)
- **First Deploy:** Creates a new Netlify site
- **Polling:** The UI polls for deployment status for up to 30 seconds

---

## 🚀 Next Steps After Testing

Once Phase 9 is confirmed working:

1. **Test on Production:**
   - Deploy your app to Netlify (if not already)
   - Add `NETLIFY_API_TOKEN` to Netlify environment variables
   - Test deployment from production URL

2. **Optional Enhancements:**
   - Add deployment history (show all past deployments)
   - Add deployment status badges
   - Add custom domain support
   - Add deployment notifications

---

**Ready to test?** Start with Step 1 (Database Migration) and work through each step! 🎉

