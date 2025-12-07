# Aqall MVP Roadmap

## Current State Analysis

### Stack Overview
- **Framework**: React 18.3.1 (NOT Next.js)
- **Build Tool**: Vite 5.4.19
- **Routing**: React Router DOM 6.30.1 (client-side routing)
- **UI**: Tailwind CSS + shadcn/ui components (Radix UI primitives)
- **State Management**: React Context (AuthContext, LanguageContext)
- **Data Fetching**: TanStack React Query 5.83.0
- **TypeScript**: 5.8.3

### Current Architecture
- **Entry Point**: `src/main.tsx` → `src/App.tsx` (Vite SPA)
- **Pages**: Landing, Auth, Dashboard, BuildChat, Preview, NotFound
- **Mock Auth**: `src/contexts/AuthContext.tsx` (localStorage-based)
- **Mock Storage**: `src/lib/projectStore.ts` (localStorage-based)
- **Mock API**: `src/lib/mockApi.ts` (keyword-based template generation)
- **Language Support**: `src/contexts/LanguageContext.tsx` (EN/AR, RTL/LTR, localStorage)

### What's Working
✅ Landing page with bilingual support  
✅ Mock authentication flow (login/signup)  
✅ Project dashboard with CRUD operations  
✅ AI chat interface for website generation  
✅ Live preview of generated websites  
✅ RTL/LTR layout switching  
✅ Responsive UI with Tailwind + shadcn components  

### What's Mocked
❌ Authentication (localStorage, no real auth)  
❌ Project storage (localStorage, no database)  
❌ Website generation (keyword-based templates, no OpenAI)  
❌ File downloads (JSON export, no real ZIP)  
❌ Build history (in-memory only)  

### Database Schema (Planned)
- `profiles` table (linked to Supabase Auth)
- `projects` table (user projects)
- `builds` table (website versions with files JSONB)
- Storage bucket: `project-assets` (for generated files)
- All tables have RLS policies defined in `supabase/schema.sql`

---

## Migration Roadmap

### Phase 1: Next.js Migration (Priority: HIGH)

**Goal**: Migrate from Vite/React SPA to Next.js App Router

**Steps**:
1. **Initialize Next.js project**
   - Run `npx create-next-app@latest` in a new branch
   - Configure TypeScript, Tailwind CSS, ESLint
   - Set up `app/` directory structure

2. **Migrate pages to Next.js App Router**
   - Convert `src/pages/Landing.tsx` → `app/page.tsx`
   - Convert `src/pages/Auth.tsx` → `app/auth/page.tsx`
   - Convert `src/pages/Dashboard.tsx` → `app/dashboard/page.tsx`
   - Convert `src/pages/BuildChat.tsx` → `app/build/[projectId]/page.tsx`
   - Convert `src/pages/Preview.tsx` → `app/preview/[projectId]/page.tsx`
   - Convert `src/pages/NotFound.tsx` → `app/not-found.tsx`

3. **Migrate components and contexts**
   - Move `src/components/` → `components/` (or keep in `src/`)
   - Move `src/contexts/` → `contexts/` or convert to Next.js patterns
   - Update imports to use Next.js conventions

4. **Update routing**
   - Remove React Router DOM dependency
   - Use Next.js `<Link>` and `useRouter()` hooks
   - Convert route params to Next.js dynamic routes

5. **Migrate build configuration**
   - Remove `vite.config.ts`
   - Configure `next.config.js` for path aliases (`@/` → `src/`)
   - Update `package.json` scripts (`dev`, `build`, `start`)
   - Test build output

**Estimated Time**: 4-6 hours  
**Risk**: Medium (routing changes, SSR considerations)  
**Dependencies**: None

---

### Phase 2: Supabase Auth Integration (Priority: HIGH)

**Goal**: Replace mock AuthContext with real Supabase authentication

**Steps**:
1. **Set up Supabase project**
   - Create Supabase project at supabase.com
   - Get project URL and anon key
   - Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Install Supabase client**
   - Install `@supabase/supabase-js` and `@supabase/ssr` (for Next.js)
   - Create `lib/supabase/client.ts` for client-side operations
   - Create `lib/supabase/server.ts` for server-side operations (if needed)

3. **Update AuthContext**
   - Replace localStorage logic with Supabase Auth methods:
     - `supabase.auth.signUp()` for signup
     - `supabase.auth.signInWithPassword()` for login
     - `supabase.auth.signOut()` for logout
     - `supabase.auth.getSession()` for session check
   - Add session refresh logic
   - Handle auth state changes with `supabase.auth.onAuthStateChange()`

4. **Create profiles table**
   - Run SQL from `supabase/schema.sql` (profiles section)
   - Set up trigger for auto-creating profiles on signup
   - Test profile creation flow

5. **Update protected routes**
   - Add middleware or route guards for `/dashboard`, `/build/*`, `/preview/*`
   - Redirect unauthenticated users to `/auth`

**Estimated Time**: 3-4 hours  
**Risk**: Low (Supabase Auth is well-documented)  
**Dependencies**: Phase 1 (Next.js migration)

---

### Phase 3: Supabase Database Integration (Priority: HIGH)

**Goal**: Replace mock projectStore with real Supabase database operations

**Steps**:
1. **Set up database tables**
   - Run SQL from `supabase/schema.sql`:
     - `projects` table
     - `builds` table
     - Indexes and RLS policies
   - Verify RLS policies work correctly

2. **Create database client utilities**
   - Create `lib/supabase/db.ts` with typed queries
   - Add helper functions: `getUserProjects()`, `createProject()`, etc.
   - Use Supabase TypeScript types (generate with `supabase gen types`)

3. **Replace projectStore.ts**
   - Update `getUserProjects()` → Supabase query with RLS
   - Update `createProject()` → Supabase insert
   - Update `addBuildToProject()` → Supabase insert to `builds` table
   - Update `deleteProject()` → Supabase delete (cascades to builds)
   - Update `updateProjectName()` → Supabase update

4. **Update Dashboard and BuildChat pages**
   - Replace `projectStore` imports with new database utilities
   - Add loading states and error handling
   - Test CRUD operations end-to-end

5. **Add real-time subscriptions (optional)**
   - Subscribe to project changes: `supabase.from('projects').on('*', callback)`
   - Update UI reactively when projects change

**Estimated Time**: 4-5 hours  
**Risk**: Low (straightforward database operations)  
**Dependencies**: Phase 2 (Supabase Auth)

---

### Phase 4: OpenAI API Integration (Priority: HIGH)

**Goal**: Replace mockApi.ts with real OpenAI-powered website generation

**Steps**:
1. **Set up OpenAI API**
   - Get OpenAI API key
   - Add environment variable: `OPENAI_API_KEY` (server-side only)
   - Install `openai` package

2. **Create Next.js API route**
   - Create `app/api/builds/create/route.ts` (or `pages/api/builds/create.ts` if using Pages Router)
   - Accept POST request with `{ prompt: string, projectId: string }`
   - Authenticate request using Supabase session

3. **Implement AI Orchestrator**
   - Design prompt structure for React/Tailwind generation
   - Use OpenAI API with structured output (JSON mode) or function calling
   - Generate file structure: `package.json`, `src/App.tsx`, `src/index.css`, etc.
   - Ensure Arabic/RTL support in generated code

4. **Store generated files**
   - Save build to Supabase `builds` table:
     - `files` column (JSONB): array of `{ path, content, type }`
     - `preview_html` column: full HTML preview
     - `version` column: increment from last build
   - Return build result to client

5. **Update BuildChat page**
   - Replace `mockApi.generateWebsite()` with API route call
   - Add loading states and progress indicators
   - Handle errors gracefully
   - Show build status in real-time (polling or WebSocket)

6. **Add file tools (advanced)**
   - Implement `read_file`, `write_file`, `apply_patch` functions
   - Use these in OpenAI function calling for iterative generation
   - Store file operations in build history

**Estimated Time**: 6-8 hours  
**Risk**: Medium (OpenAI API complexity, prompt engineering)  
**Dependencies**: Phase 3 (Supabase DB)

---

### Phase 5: File Storage & ZIP Download (Priority: MEDIUM)

**Goal**: Implement proper file storage and ZIP download functionality

**Steps**:
1. **Set up Supabase Storage**
   - Create `project-assets` bucket (see `supabase/schema.sql`)
   - Set up RLS policies for bucket access
   - Test file upload/download

2. **Store generated files in Storage (optional)**
   - Upload generated files to Storage: `{projectId}/{buildId}/{filePath}`
   - Keep metadata in `builds` table, files in Storage
   - Or: keep files in `builds.files` JSONB (simpler for MVP)

3. **Implement ZIP generation**
   - Install `jszip` package
   - Create API route: `app/api/projects/[projectId]/download/route.ts`
   - Generate ZIP from `builds.files` JSONB or Storage files
   - Return ZIP as blob download

4. **Update Preview page**
   - Add "Download Project" button
   - Call download API route
   - Handle large ZIP files gracefully

5. **Add file preview in Dashboard**
   - Show file tree for each build
   - Allow viewing individual files
   - Add "Download Latest" quick action

**Estimated Time**: 3-4 hours  
**Risk**: Low (straightforward file operations)  
**Dependencies**: Phase 4 (OpenAI integration)

---

### Phase 6: Build Queue & Worker (Priority: LOW - Post-MVP)

**Goal**: Implement build queue system for handling multiple concurrent builds

**Steps**:
1. **Create build queue table**
   - Add `build_queue` table in Supabase
   - Status: `pending`, `processing`, `completed`, `failed`
   - Link to `builds` table

2. **Implement queue worker**
   - Create Next.js API route: `app/api/worker/process-build/route.ts`
   - Poll queue for pending builds
   - Process builds sequentially or with concurrency limit
   - Update queue status

3. **Update build creation flow**
   - Insert into queue instead of processing immediately
   - Return queue job ID to client
   - Client polls for completion

4. **Add build status UI**
   - Show "Queued", "Processing", "Completed" states
   - Add progress bar or spinner
   - Handle failed builds with retry option

**Estimated Time**: 4-6 hours  
**Risk**: Medium (queue management complexity)  
**Dependencies**: Phase 4 (OpenAI integration)

---

### Phase 7: Vercel Deploy Integration (Priority: LOW - Post-MVP)

**Goal**: Add one-click deploy to Vercel for generated websites

**Steps**:
1. **Set up Vercel API**
   - Get Vercel API token
   - Add environment variable: `VERCEL_API_TOKEN`
   - Install `@vercel/client` or use REST API

2. **Create deployment API route**
   - Create `app/api/deploy/route.ts`
   - Accept `{ projectId: string, buildId: string }`
   - Generate Vercel project from build files
   - Create Vercel deployment via API
   - Store deployment URL in `deployments` table

3. **Add deployments table**
   - Create `deployments` table:
     - `id`, `project_id`, `build_id`, `vercel_deployment_id`, `url`, `status`, `created_at`
   - Add RLS policies

4. **Update Dashboard**
   - Add "Deploy" button for each build
   - Show deployment status and URL
   - Add "View Live Site" link

5. **Handle deployment webhooks**
   - Set up Vercel webhook for deployment status
   - Update `deployments` table on status change

**Estimated Time**: 5-7 hours  
**Risk**: Medium (Vercel API integration, webhook setup)  
**Dependencies**: Phase 5 (File storage)

---

## Summary

### Immediate Next Steps (Week 1)
1. ✅ **Phase 1**: Migrate to Next.js (4-6 hours)
2. ✅ **Phase 2**: Integrate Supabase Auth (3-4 hours)
3. ✅ **Phase 3**: Integrate Supabase Database (4-5 hours)

**Total**: ~12-15 hours for core infrastructure

### MVP Completion (Week 2)
4. ✅ **Phase 4**: OpenAI API Integration (6-8 hours)
5. ✅ **Phase 5**: File Storage & ZIP Download (3-4 hours)

**Total**: ~9-12 hours for AI generation and downloads

### Post-MVP Enhancements
6. ⏳ **Phase 6**: Build Queue & Worker (4-6 hours)
7. ⏳ **Phase 7**: Vercel Deploy Integration (5-7 hours)

---

## Technical Decisions

### Why Next.js?
- Server-side API routes for OpenAI calls (keeps API keys secure)
- Better SEO for landing page
- Built-in optimizations (image, font, etc.)
- Easy deployment to Vercel
- App Router provides modern React patterns

### Why Supabase?
- Integrated Auth + Database + Storage
- Row Level Security for multi-tenant data
- Real-time subscriptions (optional)
- PostgreSQL with JSONB for flexible file storage
- Generous free tier for MVP

### Why OpenAI API?
- Most capable model for code generation
- Function calling for structured file operations
- Can handle Arabic prompts and RTL layouts
- Server-side integration keeps costs controlled

### File Storage Strategy
- **MVP**: Store files in `builds.files` JSONB column (simple, fast)
- **Post-MVP**: Move to Supabase Storage for large projects (scalable)

---

## Environment Variables Needed

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (server-side only)
OPENAI_API_KEY=your-openai-key

# Vercel (post-MVP)
VERCEL_API_TOKEN=your-vercel-token
```

---

## Notes

- Keep all existing user-facing behavior working during migration
- Test each phase thoroughly before moving to next
- Use feature flags if needed to toggle between mock and real implementations
- Document API routes and database schema changes
- Consider adding error tracking (Sentry, etc.) after MVP

---

**Last Updated**: 2024  
**Status**: Ready for Phase 1 implementation
