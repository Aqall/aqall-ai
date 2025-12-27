# Phase 6 Testing Guide - Build Locking System

## ✅ What Was Implemented

1. **Database Migration** - Added `build_status`, `locked_by`, and `locked_at` columns to `projects` table
2. **Lock Service** - Created `buildLockService.ts` with lock/unlock functions
3. **API Routes Updated** - Both `/api/generate` and `/api/edit` now use locking
4. **UI Error Handling** - Better error messages when project is locked

---

## 🗄️ Step 1: Run Database Migration

**IMPORTANT: Run this SQL in your Supabase SQL Editor first!**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migration-build-locking.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run**

This adds the necessary columns to your `projects` table.

---

## 🧪 Step 2: How to Test (Simple Instructions)

### Test 1: Normal Operation (Should Work)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Go to a project in your build chat**

3. **Send a generation or edit request:**
   - Example: "Make me a coffee shop website"
   - Or: "Change the color to blue"

4. **Expected Result:** 
   - ✅ The build/edit should work normally
   - ✅ You should see the success message
   - ✅ The project should unlock automatically when done

---

### Test 2: Concurrent Requests (The Lock Should Work!)

**This is the main test to verify locking works:**

#### Method 1: Using Two Browser Tabs (Easiest)

1. **Open your project in TWO browser tabs:**
   - Tab 1: `http://localhost:3000/build/[your-project-id]`
   - Tab 2: `http://localhost:3000/build/[your-project-id]` (same project!)

2. **In Tab 1:**
   - Type a message like "Make me a restaurant website"
   - Click Send
   - ⏳ Wait... (the build is processing)

3. **While Tab 1 is processing, in Tab 2:**
   - Type a message like "Add a footer"
   - Click Send IMMEDIATELY

4. **Expected Result:**
   - ✅ Tab 1: Should process normally (first request works)
   - ✅ Tab 2: Should show error message: "Project is currently being processed. Please wait..."
   - ✅ Tab 2: Should NOT start building
   - ✅ Once Tab 1 finishes, Tab 2 can try again and it should work

---

#### Method 2: Using Browser DevTools (More Technical)

1. **Open your project build page**

2. **Open Browser DevTools (F12) → Network tab**

3. **Send a build request:**
   - Type message and click Send
   - Look for the `/api/generate` or `/api/edit` request in Network tab
   - Click on it to see it's "pending" (processing)

4. **While it's processing, quickly send another request:**
   - Type another message and click Send
   - Look for the second request in Network tab

5. **Expected Result:**
   - ✅ First request: Status 200 (success)
   - ✅ Second request: Status 409 (Conflict) with error message about project being locked

---

### Test 3: Check Database (Verify Lock Status)

1. **While a build is processing:**

2. **Go to Supabase Dashboard → Table Editor → `projects` table**

3. **Find your project and check the columns:**
   - `build_status` should be: `processing`
   - `locked_by` should show the user ID
   - `locked_at` should show a timestamp

4. **After build completes:**
   - Refresh the table
   - `build_status` should be: `idle` (or NULL)
   - `locked_by` should be: `null`
   - `locked_at` should be: `null`

---

## ✅ Success Criteria

The locking system is working correctly if:

- ✅ Normal builds/edits work as before
- ✅ When you try to build/edit while one is already running, you get an error message
- ✅ The error message clearly says the project is busy
- ✅ Once the first build completes, you can build/edit again
- ✅ Database shows `processing` during build, `idle` after build
- ✅ No builds get stuck in `processing` state (lock is always released)

---

## 🐛 Troubleshooting

### Problem: "I can still send multiple requests"

**Check:**
- Did you run the SQL migration? (Step 1)
- Check browser console for errors
- Verify the columns exist in Supabase: `projects.build_status`, `projects.locked_by`, `projects.locked_at`

### Problem: "Builds are stuck in processing"

**Fix:**
- This shouldn't happen, but if it does, manually unlock in Supabase:
  ```sql
  UPDATE projects 
  SET build_status = 'idle', locked_by = NULL, locked_at = NULL 
  WHERE id = 'your-project-id';
  ```

### Problem: "I'm getting database errors"

**Check:**
- Make sure RLS policies allow UPDATE on projects table
- Check that the user has permission to update their own projects

---

## 📝 Quick Test Checklist

- [ ] Ran SQL migration in Supabase
- [ ] Normal build works
- [ ] Normal edit works
- [ ] Can't build while build is running (shows error)
- [ ] Can't edit while edit is running (shows error)
- [ ] Can't edit while build is running (shows error)
- [ ] Can't build while edit is running (shows error)
- [ ] Database shows `processing` during build
- [ ] Database shows `idle` after build
- [ ] After build completes, can build/edit again

---

**That's it! The locking system is working if you can't run concurrent operations. 🎉**



