# AI Generation Migration Summary

## Overview

The application has been migrated from mock/keyword-based website generation to real AI-driven generation using OpenAI GPT-4.1 (latest coding-optimized model).

## What Changed

### ✅ Completed

1. **Created `src/lib/aiOrchestrator.ts`**
   - OpenAI integration for website generation using GPT-4.1 (latest coding-optimized model)
   - Arabic/RTL detection and support
   - System prompts optimized for React + Tailwind CSS
   - Returns complete HTML strings ready for rendering

2. **Created `app/api/generate/route.ts`**
   - Next.js API route for website generation
   - Accepts POST requests with `projectId`, `message`, and optional `history`
   - Calls OpenAI via orchestrator
   - Stores results in Supabase `builds` table
   - Returns build metadata with HTML

3. **Created `src/lib/buildService.ts`**
   - Supabase-backed build management
   - Functions: `createBuild()`, `getBuildsByProject()`, `getBuildByVersion()`, `getLatestBuild()`
   - Automatic version numbering
   - RLS security via project ownership

4. **Updated `app/build/[projectId]/page.tsx`**
   - Replaced `mockApi.generateWebsite()` with `/api/generate` endpoint
   - Loads builds from Supabase instead of localStorage
   - Reconstructs chat history from builds
   - Shows loading states during generation
   - Auto-refreshes build list after generation

5. **Updated `app/preview/[projectId]/page.tsx`**
   - Loads builds from Supabase
   - Renders HTML using `dangerouslySetInnerHTML` in iframe
   - Version selector works with Supabase builds
   - Download functionality for HTML files

6. **Added Environment Documentation**
   - `docs/SETUP_ENV.md` with complete setup instructions
   - OpenAI API key configuration
   - Security best practices

## Data Flow

### BuildChat → API → OpenAI → Supabase → Preview

1. **User sends prompt in BuildChat**
   - User types message and clicks send
   - Frontend calls `/api/generate` with `projectId`, `message`, `history`

2. **API Route processes request**
   - Validates input
   - Calls `generateSiteFromPrompt()` from orchestrator
   - Orchestrator constructs system prompt (Arabic-aware)
   - Calls OpenAI GPT-4.1 API (latest coding-optimized model)
   - Parses HTML response

3. **Store in Supabase**
   - API calls `createBuild()` from buildService
   - Build is saved to `builds` table with:
     - `project_id` (FK to projects)
     - `version` (auto-incremented)
     - `prompt` (user's message)
     - `preview_html` (generated HTML)
     - `files` (empty JSONB array for now)
     - `created_at` (timestamp)

4. **Frontend updates**
   - React Query invalidates `builds` query
   - Build list refetches from Supabase
   - New message appears in chat
   - User can navigate to preview

5. **Preview renders HTML**
   - Preview page loads build by version
   - HTML is rendered in iframe using `srcDoc`
   - User can switch versions, change viewport, download

## Database Setup Required

⚠️ **IMPORTANT: You must run the SQL schema for `builds` table in Supabase!**

Run this SQL in your Supabase SQL Editor:

```sql
-- Create builds table
CREATE TABLE public.builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(project_id, version)
);

-- Indexes
CREATE INDEX builds_project_id_idx ON public.builds(project_id);
CREATE INDEX builds_project_version_idx ON public.builds(project_id, version);

-- Enable RLS
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;

-- Policies (through project ownership)
CREATE POLICY "Users can view builds of own projects" 
  ON public.builds FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = builds.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create builds for own projects" 
  ON public.builds FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = builds.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete builds of own projects" 
  ON public.builds FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = builds.project_id 
      AND projects.user_id = auth.uid()
    )
  );
```

## Environment Variables

Add to `.env.local`:

```bash
# OpenAI (required for AI generation)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `docs/SETUP_ENV.md` for detailed setup instructions.

## Files Changed

### New Files
- `src/lib/aiOrchestrator.ts` - OpenAI integration
- `app/api/generate/route.ts` - API endpoint
- `src/lib/buildService.ts` - Build management service
- `docs/SETUP_ENV.md` - Environment setup guide
- `docs/AI_GENERATION_MIGRATION.md` - This file

### Modified Files
- `app/build/[projectId]/page.tsx` - Uses API endpoint
- `app/preview/[projectId]/page.tsx` - Loads from Supabase
- `package.json` - Added `openai` dependency

## What's NOT Implemented Yet

- ❌ Full file system (VFS) for multiple files
- ❌ File patching/editing capabilities
- ❌ Build worker queue
- ❌ Asset storage in Supabase Storage
- ❌ ZIP download with multiple files
- ❌ Real-time build status updates

These will be implemented in future steps.

## Testing Checklist

After setting up environment variables and running SQL:

1. ✅ Create a project in Dashboard
2. ✅ Navigate to BuildChat
3. ✅ Send a prompt (e.g., "Create a modern restaurant website")
4. ✅ Wait for generation (may take 10-30 seconds)
5. ✅ Verify build appears in chat
6. ✅ Click "Preview" button
7. ✅ Verify HTML renders correctly
8. ✅ Switch between versions if multiple builds exist
9. ✅ Test download functionality
10. ✅ Check Supabase `builds` table for stored data

## Troubleshooting

### "OPENAI_API_KEY environment variable is not set"
- Add `OPENAI_API_KEY` to `.env.local`
- Restart dev server
- Verify key is valid in OpenAI dashboard

### "Failed to generate website"
- Check OpenAI API key has credits
- Check browser console for detailed error
- Verify API route is accessible (`/api/generate`)

### Builds not appearing
- Verify `builds` table exists in Supabase
- Check RLS policies are enabled
- Verify React Query cache invalidation

### HTML not rendering in preview
- Check `preview_html` column has content in Supabase
- Verify iframe `srcDoc` is set correctly
- Check browser console for errors

## Cost Considerations

- **OpenAI GPT-4.1**: Pricing varies by usage (check OpenAI pricing page)
- GPT-4.1 is optimized for coding tasks and offers excellent performance
- Monitor usage in [OpenAI Dashboard](https://platform.openai.com/usage)
- Consider implementing rate limiting for production

## Next Steps

1. Implement full file system (VFS) for multiple files
2. Add file patching/editing capabilities
3. Implement build worker queue
4. Add asset storage in Supabase Storage
5. Enhance ZIP download with multiple files
