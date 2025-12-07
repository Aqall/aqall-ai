# Testing the Project Migration

## Quick Test Steps

After running the SQL schema in Supabase, follow these steps to verify everything works:

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test the Application Flow

#### Step 1: Login/Signup
- Navigate to `http://localhost:3000` (or the port shown)
- Sign up or log in with your account
- You should be redirected to the Dashboard

#### Step 2: Create a Project
- Click "New Project" or "Create Project" button
- Enter a project name (e.g., "My First Website")
- Click "Create"
- **Expected:** 
  - Project appears in the dashboard
  - You're automatically redirected to `/build/[projectId]`
  - Project name is displayed in the header

#### Step 3: Verify in Supabase
- Go to your Supabase Dashboard
- Navigate to **Table Editor** → `projects` table
- **Expected:** You should see your newly created project with:
  - `id` (UUID)
  - `user_id` (matches your auth user ID)
  - `name` (the name you entered)
  - `created_at` and `updated_at` timestamps

#### Step 4: Test Project List
- Go back to Dashboard (`/dashboard`)
- **Expected:** Your project should appear in the grid
- Check the date shown matches when you created it

#### Step 5: Test Project Navigation
- Click on a project card
- **Expected:** You should navigate to `/build/[projectId]`
- Project name should be displayed in the header

#### Step 6: Test Delete
- Go back to Dashboard
- Hover over a project card
- Click the trash icon (appears on hover)
- Confirm deletion
- **Expected:** 
  - Project disappears from the list
  - Project is removed from Supabase `projects` table

### 3. Verify Database Connection

If you see errors, check:

1. **Environment Variables**
   - Verify `.env.local` has:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - Restart dev server after changing env vars

2. **RLS Policies**
   - In Supabase Dashboard → Authentication → Policies
   - Verify `projects` table has 4 policies:
     - Users can view own projects (SELECT)
     - Users can create own projects (INSERT)
     - Users can update own projects (UPDATE)
     - Users can delete own projects (DELETE)

3. **Table Structure**
   - In Supabase Dashboard → Table Editor → `projects`
   - Verify columns: `id`, `user_id`, `name`, `created_at`, `updated_at`

### 4. Common Issues & Solutions

#### Issue: "Failed to fetch projects"
**Solution:**
- Check browser console for detailed error
- Verify RLS policies are enabled
- Verify user is authenticated (check `AuthContext`)

#### Issue: "Project not found" when navigating
**Solution:**
- Verify project was created in Supabase
- Check `user_id` matches authenticated user
- Verify RLS policies allow SELECT

#### Issue: Projects not appearing after creation
**Solution:**
- Check React Query cache (might need refresh)
- Verify `queryClient.invalidateQueries()` is called
- Check Supabase logs for insert errors

#### Issue: "Missing Supabase environment variables"
**Solution:**
- Create `.env.local` in project root
- Add your Supabase credentials
- Restart dev server

### 5. Success Indicators

✅ **Everything works if:**
- You can create projects from Dashboard
- Projects appear in the list immediately
- Projects are visible in Supabase `projects` table
- You can navigate to build page
- You can delete projects
- No console errors related to Supabase

### 6. Next Steps

Once testing is successful:
- ✅ Project metadata is now in Supabase
- ⏳ Builds still in localStorage (will migrate next)
- ⏳ AI generation integration (future step)
- ⏳ File storage for assets (future step)
