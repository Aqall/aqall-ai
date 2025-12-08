# Testing Guide - Phase 4 Lovable Pipeline

## Prerequisites

### 1. Environment Variables

Make sure you have `.env.local` in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Database Setup

Ensure your Supabase database has these tables:
- `profiles` (from `supabase/setup-profiles.sql`)
- `projects` (from `supabase/schema.sql`)
- `builds` (from `supabase/schema.sql`)

Run the SQL scripts in your Supabase SQL Editor if you haven't already.

### 3. Dependencies

Install dependencies:
```bash
npm install
# or
bun install
```

## Step-by-Step Testing

### Step 1: Start the Development Server

```bash
npm run dev
# or
bun dev
```

The server should start on `http://localhost:3000`

### Step 2: Sign Up / Log In

1. Navigate to `http://localhost:3000`
2. Click "Sign Up" or "Log In"
3. Create an account or log in with existing credentials
4. Verify your email if required (check Supabase email settings)

### Step 3: Create a New Project

1. After logging in, you'll be on the Dashboard (`/dashboard`)
2. Click "Create New Project" or the "+" button
3. Enter a project name (e.g., "Coffee Shop Website")
4. Click "Create"

### Step 4: Generate a Website

1. You'll be redirected to the Build Chat page (`/build/[projectId]`)
2. In the chat input, type a prompt like:
   - **"Make me a coffee shop website"**
   - **"Create a restaurant website with menu and gallery"**
   - **"Build a portfolio website for a designer"**
   - **"Make a bilingual clinic website"** (for Arabic + English)

3. Press Enter or click Send
4. Wait for generation (this takes 30-60 seconds)

### Step 5: What Happens During Generation

The system will:
1. **Planner Agent**: Analyze your prompt
   - Detects industry (coffee shop, restaurant, etc.)
   - Identifies required sections
   - Determines language mode

2. **Architect Agent**: Create file structure
   - Plans which components to generate
   - Determines config files needed
   - Sets up translation files if bilingual

3. **Coder Agent**: Generate files
   - Creates package.json, vite.config.js, etc.
   - Generates React components
   - Creates entry files (main.jsx, App.jsx)
   - Generates translation files if needed

4. **Save to Workspace**: Files stored in Supabase

### Step 6: View the Preview

1. After generation completes, you'll see the build in the chat
2. Click "View Preview" or navigate to `/preview/[projectId]`
3. The preview should show:
   - All generated sections
   - Proper styling (Tailwind CSS)
   - Responsive layout
   - Language toggle (if bilingual)

### Step 7: Download the Project

1. On the preview page, click "Download Project"
2. A ZIP file will be generated with all project files
3. Extract the ZIP to see the complete Vite + React project

## Expected Results

### For "Coffee Shop Website":

**Generated Sections**:
- Navbar (with navigation)
- Hero (large banner section)
- Menu (coffee items)
- Gallery (images)
- Testimonials (customer reviews)
- About (about the coffee shop)
- Contact (contact form/info)
- Footer

**Files Generated**:
```
package.json
vite.config.js
tailwind.config.js
postcss.config.js
index.html
src/main.jsx
src/App.jsx
src/index.css
src/components/Navbar.jsx
src/components/Hero.jsx
src/components/Menu.jsx
src/components/Gallery.jsx
src/components/Testimonials.jsx
src/components/About.jsx
src/components/Contact.jsx
src/components/Footer.jsx
public/logo.png
```

### For Bilingual Website:

**Additional Files**:
```
src/i18n.js
src/locales/en.json
src/locales/ar.json
```

**Features**:
- Language toggle in Navbar
- RTL layout for Arabic
- Translation keys in components

## Troubleshooting

### Error: "OPENAI_API_KEY not set"
- Check `.env.local` file exists
- Verify `OPENAI_API_KEY` is set
- Restart the dev server after adding env vars

### Error: "Missing Supabase environment variables"
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server

### Error: "Project not found" or "Build not found"
- Ensure database tables are created
- Check Supabase connection
- Verify RLS policies are set correctly

### Generation takes too long or times out
- Check OpenAI API key is valid
- Verify API quota/limits
- Check network connection
- Increase `maxDuration` in `/api/generate/route.ts` if needed (currently 300s)

### Preview shows blank or errors
- Check browser console for errors
- Verify files were generated correctly
- Check that `preview_html` was created in the build

### ZIP download fails
- Check that files exist in the build
- Verify workspace files format is correct
- Check browser console for errors

## Testing Different Scenarios

### Test 1: Generic Website
**Prompt**: "Make me a website"
**Expected**: Navbar, Hero, About, Features, Contact, Footer

### Test 2: Restaurant Website
**Prompt**: "Create a restaurant website"
**Expected**: Navbar, Hero, Menu, Gallery, Testimonials, About, Contact, Footer

### Test 3: Arabic-Only Website
**Prompt**: "Make me an Arabic restaurant website"
**Expected**: All text in Arabic, RTL layout, Arabic fonts

### Test 4: Bilingual Website
**Prompt**: "Create a bilingual clinic website"
**Expected**: Language toggle, en.json + ar.json, i18n.js

### Test 5: Specific Sections Only
**Prompt**: "Make a landing page with only hero, about, and contact"
**Expected**: Only those 3 sections (plus navbar and footer)

## Verifying the Pipeline

### Check Console Logs

During generation, you should see:
```
📋 Planner Agent: Analyzing prompt...
✅ Plan created: { industry: 'coffee shop', sections: [...], language: 'english-only' }
🏗️ Architect Agent: Creating file structure...
✅ Architecture created: { tasks: 15, components: 8 }
💻 Coder Agent: Generating files...
✅ Files generated: 15
```

### Check Database

In Supabase:
1. Go to Table Editor → `builds`
2. Find your build
3. Check `files` column (should be JSONB array)
4. Check `preview_html` column (should have HTML)

### Check Generated Files

1. Download the ZIP
2. Extract it
3. Run `npm install` in the extracted folder
4. Run `npm run dev` to test the generated project
5. Verify all components render correctly

## Success Criteria

✅ **Planner Agent**: Correctly detects industry and sections  
✅ **Architect Agent**: Creates appropriate file structure  
✅ **Coder Agent**: Generates all required files  
✅ **Workspace**: Files stored correctly in Supabase  
✅ **Preview**: Website renders correctly in preview  
✅ **ZIP**: Download contains complete project  
✅ **Components**: All components are high-quality and professional  
✅ **Styling**: Tailwind CSS applied correctly  
✅ **Language**: Language mode works as expected  

## Next Steps

After successful testing:
1. Test regeneration (edit prompt and generate again)
2. Test multiple projects
3. Test different industries
4. Test bilingual functionality
5. Verify file tools work (read/write operations)
