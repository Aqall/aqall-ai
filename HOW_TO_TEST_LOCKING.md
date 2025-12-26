# How to Test Build Locking - Simple Guide

## Step 1: Run Database Migration First! ⚠️

**Before anything else, you MUST do this:**

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file: `supabase/migration-build-locking.sql`
4. Copy all the SQL code
5. Paste it into SQL Editor
6. Click **Run** button

**Done!** Now the database is ready.

---

## Step 2: Start Your App

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Step 3: The Simple Test (2 Browser Tabs)

### What We're Testing:
**"Can I prevent two builds from running at the same time?"**

### How to Test:

1. **Open the SAME project in TWO browser tabs:**
   - Tab 1: `http://localhost:3000/build/[your-project-id]`
   - Tab 2: `http://localhost:3000/build/[your-project-id]` (same URL)

2. **In Tab 1:**
   - Type any message (like "Make me a coffee shop")
   - Click **Send**
   - ⏳ Wait... (it's building)

3. **While Tab 1 is still building, quickly go to Tab 2:**
   - Type another message (like "Add a footer")
   - Click **Send**

### What Should Happen:

✅ **Tab 1:** Builds normally (first request works)

✅ **Tab 2:** Shows an error message saying:
   - "Project is currently being processed. Please wait..."
   - **Does NOT start building**

✅ **After Tab 1 finishes:**
   - Tab 2 can try again and it should work

---

## ✅ That's It!

If Tab 2 shows an error when you try to build while Tab 1 is building, **the locking is working!** 🎉

If Tab 2 also starts building at the same time, something is wrong - check:
- Did you run the SQL migration?
- Are there any errors in the browser console?
- Are there any errors in your terminal/console?

---

## Quick Visual Test

```
Tab 1: [Send "Make coffee shop"] → Building... ⏳
Tab 2: [Send "Add footer"] → ❌ Error: "Project is busy"
                           → ✅ Locking works!
```

That's the test in a nutshell! 🚀

