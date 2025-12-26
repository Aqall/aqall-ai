# Build Status Check - Edit Feature & Queue System

## ✅ Edit Feature Status

**Status: FIXED & COMPLETE**

The edit feature is now properly implemented:
- ✅ `/api/edit` route exists
- ✅ `editSiteFromPrompt` function is complete (syntax error fixed)
- ✅ Editor Agent with patch/diff system is working
- ✅ Creates new build version with edited files

### How to Test Edit Feature:

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Create a project and generate a site:**
   - Go to dashboard
   - Create a new project
   - Generate a website (e.g., "Make me a coffee shop website")

3. **Test editing:**
   - After generation completes, send an edit request like:
     - "Change the color scheme to blue and white"
     - "Add a contact form"
     - "Make the header smaller"
   - The system should:
     - Detect it's an edit (because builds exist)
     - Use `/api/edit` endpoint
     - Apply changes via Editor Agent
     - Create a new build version
     - Show the updated preview

---

## ❌ Build Queue & Locking Status

**Status: NOT IMPLEMENTED**

Current situation:
- ❌ No `build_queue` table in database schema
- ❌ No queue worker implementation
- ❌ No server-side locking mechanism
- ❌ No build status tracking (pending/processing/completed)
- ⚠️ Only client-side protection (`isGenerating` flag prevents multiple requests from same user)

### Current Behavior:
- Multiple requests from same user: Blocked by `isGenerating` flag ✅
- Concurrent requests from different users: NOT prevented ❌
- Race conditions possible when multiple builds happen simultaneously ❌

### What Needs to Be Implemented:

#### 1. Database Schema
```sql
-- Build queue table
CREATE TABLE public.build_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('generate', 'edit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prompt TEXT NOT NULL,
  build_version INTEGER, -- NULL for generate, version number for edit
  build_id UUID REFERENCES public.builds(id), -- NULL until completed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX build_queue_project_id_idx ON public.build_queue(project_id);
CREATE INDEX build_queue_status_idx ON public.build_queue(status);
CREATE INDEX build_queue_created_at_idx ON public.build_queue(created_at);

-- RLS policies
ALTER TABLE public.build_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items"
  ON public.build_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = build_queue.project_id
      AND projects.user_id = auth.uid()
    )
  );
```

#### 2. Project Build Lock
Add to `projects` table:
```sql
ALTER TABLE public.projects
ADD COLUMN build_status TEXT DEFAULT NULL CHECK (build_status IN ('pending', 'processing', 'idle')),
ADD COLUMN current_build_id UUID REFERENCES public.build_queue(id);
```

#### 3. Queue Service (`src/lib/queueService.ts`)
- `enqueueBuild()` - Add build to queue
- `getNextPending()` - Get next pending build
- `updateStatus()` - Update queue item status
- `checkProjectLock()` - Check if project is locked

#### 4. Modified API Routes
- `/api/generate` - Enqueue instead of process immediately
- `/api/edit` - Enqueue instead of process immediately
- `/api/queue/status/[jobId]` - Check queue status
- `/api/worker/process` - Background worker (optional, can process inline for MVP)

#### 5. UI Updates
- Show "Processing..." when build is queued/processing
- Poll for status updates
- Show queue position if multiple builds pending

---

## Recommendation

**Option 1: Simple Locking (MVP - Recommended)**
- Add `build_status` field to projects table
- Check and lock at start of generate/edit
- Release lock when complete
- Simple, no queue needed for MVP

**Option 2: Full Queue System**
- Implement complete queue system as outlined above
- Better for production scale
- More complex, takes more time

For MVP, **Option 1** is recommended. It prevents race conditions without the complexity of a full queue system.

---

## Next Steps

1. ✅ Edit feature is ready to test
2. ❓ Decide: Simple locking or full queue?
3. ⏳ Implement chosen solution
4. ✅ Test concurrent build prevention

