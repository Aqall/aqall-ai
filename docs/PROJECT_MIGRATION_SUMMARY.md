# Project Metadata Migration to Supabase

## Overview

Project metadata has been successfully migrated from `localStorage` to Supabase Postgres database. This migration includes project CRUD operations (create, read, update, delete) while keeping builds in localStorage temporarily until the builds table is implemented.

## What Changed

### ✅ Completed

1. **Created `src/lib/projectService.ts`**
   - Supabase-backed service for all project operations
   - Functions: `listProjects()`, `getProjectById()`, `createProject()`, `updateProject()`, `deleteProject()`
   - Includes RLS security notes and error handling

2. **Updated `app/dashboard/page.tsx`**
   - Migrated from `localStorage` to Supabase via React Query
   - Uses `useQuery` for fetching projects list
   - Uses `useMutation` for create/delete operations
   - Proper loading and error states
   - Automatic refetching after mutations

3. **Updated `app/build/[projectId]/page.tsx`**
   - Loads project metadata from Supabase
   - Temporarily still uses localStorage for builds (until builds table is implemented)
   - Uses React Query for project loading

4. **Updated `app/preview/[projectId]/page.tsx`**
   - Loads project metadata from Supabase
   - Temporarily still uses localStorage for builds

5. **Deprecated `src/lib/projectStore.ts`**
   - Marked as deprecated with clear migration notes
   - Still used temporarily for builds storage (will be removed when builds table is implemented)

## Data Flow

### Dashboard → Supabase → BuildChat

1. **Dashboard (`/dashboard`)**
   - User authenticates via `AuthContext`
   - React Query fetches projects: `listProjects(user.id)` → Supabase `projects` table
   - User creates project: `createProject(user.id, { name })` → Supabase insert
   - User deletes project: `deleteProject(user.id, projectId)` → Supabase delete
   - Navigation: `router.push(/build/${project.id})`

2. **BuildChat (`/build/[projectId]`)**
   - Loads project metadata from Supabase: `getProjectById(user.id, projectId)`
   - Project name, timestamps come from Supabase
   - Builds still loaded from localStorage (temporary)
   - New builds still saved to localStorage (temporary)

3. **Preview (`/preview/[projectId]`)**
   - Loads project metadata from Supabase
   - Loads builds from localStorage (temporary)

## Database Setup Required

⚠️ **IMPORTANT: You must run the SQL schema in Supabase before this will work!**

The `projects` table needs to be created in your Supabase database. Run the following SQL in your Supabase SQL Editor:

```sql
-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX projects_user_id_idx ON public.projects(user_id);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own projects" 
  ON public.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Note:** Make sure the `profiles` table exists first (from the profiles setup in `supabase/setup-profiles.sql`).

## Files Changed

### New Files
- `src/lib/projectService.ts` - Supabase project service

### Modified Files
- `app/dashboard/page.tsx` - Migrated to Supabase + React Query
- `app/build/[projectId]/page.tsx` - Loads project from Supabase
- `app/preview/[projectId]/page.tsx` - Loads project from Supabase
- `src/lib/projectStore.ts` - Deprecated (still used for builds temporarily)

## Security

- **Row Level Security (RLS)**: All queries rely on Supabase RLS policies to ensure users can only access their own projects
- **User ID Verification**: All service functions require `userId` parameter and verify ownership via RLS
- **No Direct DB Access**: All database operations go through Supabase client with RLS enforcement

## What's Next

### Pending (Not Implemented Yet)
- ❌ Builds migration to Supabase `builds` table
- ❌ AI generation integration
- ❌ File storage for generated assets
- ❌ Deployment functionality

### Temporary Workarounds
- Builds are still stored in localStorage via `projectStore.ts`
- This is intentional - builds will be migrated in a separate step
- Project metadata (name, timestamps) is now fully in Supabase

## Testing Checklist

After running the SQL schema in Supabase:

1. ✅ Create a new project from Dashboard
2. ✅ Verify project appears in Dashboard list
3. ✅ Click project to navigate to BuildChat
4. ✅ Verify project name loads correctly
5. ✅ Delete a project from Dashboard
6. ✅ Verify project is removed from list
7. ✅ Check Supabase dashboard to verify data in `projects` table

## Troubleshooting

### "Project not found" errors
- Verify `projects` table exists in Supabase
- Check RLS policies are enabled
- Verify user is authenticated (`user.id` exists)

### "Failed to fetch projects" errors
- Check Supabase connection (environment variables)
- Verify RLS policies allow user to SELECT their own projects
- Check browser console for detailed error messages

### Projects not appearing after creation
- Check React Query cache invalidation
- Verify `queryClient.invalidateQueries()` is called after mutations
- Check Supabase logs for insert errors
