# Vite + React + Tailwind Project Generation Upgrade

## Overview

The AI generator has been upgraded to produce **complete Vite + React + Tailwind CSS projects** with conditional section generation and bilingual support, similar to Lovable AI's output structure.

## Key Features

### ✅ Conditional Section Generation

The AI now generates **ONLY the sections the user explicitly requests**:

- **Explicit requests**: If user asks for "Navbar + Hero + Contact only" → generates ONLY these
- **Generic prompts**: If user says "modern landing page" → generates common sections (Hero, About, Features, Contact, Footer)
- **Exclusions**: If user says "No footer" → Footer component is NOT generated
- **Smart defaults**: Navbar is always included unless explicitly excluded

### ✅ Conditional Language Support

**Three language modes:**

1. **Arabic-only** (`arabic-only`):
   - Generates ONLY Arabic text
   - No English translation files
   - No language toggle
   - RTL layout automatically applied
   - Uses Cairo font

2. **English-only** (`english-only`):
   - Generates ONLY English text
   - No Arabic
   - No bilingual toggle
   - LTR layout
   - Uses Inter/Poppins fonts

3. **Bilingual** (`bilingual`):
   - Full i18n system with:
     - `src/i18n.js` - i18n configuration
     - `src/locales/en.json` - English translations
     - `src/locales/ar.json` - Arabic translations
   - Language toggle in Navbar
   - Automatic RTL switching based on selected language
   - Uses both Arabic and English fonts

**Detection Logic:**
- Explicit keywords: "bilingual", "both languages", "english and arabic" → bilingual
- "Arabic only" or Arabic text without English → arabic-only
- "English only" or English text without Arabic → english-only
- Mixed languages in prompt → automatically bilingual

### ✅ Complete Project Structure

The generator now produces a **full Vite + React project** with:

**Required Files:**
- `package.json` - Vite + React dependencies
- `vite.config.js` - Vite configuration
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `index.html` - HTML entry point
- `src/main.jsx` - React entry point
- `src/App.jsx` - Main App component
- `src/index.css` - Tailwind imports

**Conditional Files (if bilingual):**
- `src/i18n.js` - i18n setup
- `src/locales/en.json` - English translations
- `src/locales/ar.json` - Arabic translations

**Component Files (only requested sections):**
- `src/components/Navbar.jsx` (if navbar requested)
- `src/components/Hero.jsx` (if hero requested)
- `src/components/About.jsx` (if about requested)
- `src/components/Features.jsx` (if features requested)
- `src/components/Gallery.jsx` (if gallery requested)
- `src/components/Testimonials.jsx` (if testimonials requested)
- `src/components/Menu.jsx` (if menu requested)
- `src/components/Booking.jsx` (if booking requested)
- `src/components/Contact.jsx` (if contact requested)
- `src/components/Footer.jsx` (if footer requested)

## API Response Format

The `/api/generate` endpoint now returns:

```json
{
  "success": true,
  "projectId": "uuid",
  "version": 1,
  "files": {
    "package.json": "...",
    "vite.config.js": "...",
    "src/App.jsx": "...",
    "src/components/Navbar.jsx": "...",
    // ... all other files
  },
  "summary": "Brief description",
  "languageMode": "bilingual" | "arabic-only" | "english-only",
  "sections": ["navbar", "hero", "features", "contact"],
  "previewHtml": "...",
  "createdAt": "2024-..."
}
```

## Database Storage

- **Files**: Stored in `builds.files` (JSONB) as `{ "filePath": "content" }`
- **Preview HTML**: Stored in `builds.preview_html` (generated from React components)
- **Metadata**: `languageMode` and `sections` stored for reference

## Preview & Download

### Preview
- Uses Babel standalone to run React components in browser
- Renders full React app with all components
- Supports RTL/LTR switching based on language mode
- Smooth scroll navigation works

### Download
- **ZIP Download**: `/api/download/[projectId]?version=X`
- Downloads complete project structure
- Ready to run with `npm install && npm run dev`
- Includes all files: configs, components, translations (if bilingual)

## Example Prompts

### Arabic-only
```
"أنشئ موقع مطعم عربي فقط مع قائمة الطعام والقسم الرئيسي"
```
**Result**: Arabic-only project, RTL, Cairo font, no i18n files

### English-only
```
"Create a modern portfolio website with hero, about, and contact sections"
```
**Result**: English-only project, LTR, Inter font, no i18n files

### Bilingual
```
"Create a bilingual restaurant website with menu and booking sections"
```
**Result**: Full i18n system, language toggle, both translation files

### Specific Sections
```
"Make a landing page with only hero and contact, no footer"
```
**Result**: Only Hero and Contact components, no Footer

## Files Changed

### New Files
- `app/api/download/[projectId]/route.ts` - ZIP download endpoint

### Modified Files
- `src/lib/aiOrchestrator.ts` - Complete rewrite for Vite+React generation
- `src/lib/buildService.ts` - Updated to handle files object and generate preview HTML
- `app/api/generate/route.ts` - Returns files object instead of just HTML
- `app/preview/[projectId]/page.tsx` - Updated download to use ZIP endpoint

## Technical Details

### Preview HTML Generation
- Extracts React components from files
- Uses Babel standalone to transpile JSX in browser
- Inlines all components and dependencies
- Handles i18n setup for bilingual projects
- Applies proper fonts and RTL/LTR direction

### Section Detection
Uses keyword matching to detect requested sections:
- `navbar`, `nav`, `navigation` → Navbar
- `hero`, `header`, `banner` → Hero
- `about`, `about us` → About
- `features`, `services` → Features
- `gallery`, `portfolio` → Gallery
- `testimonials`, `reviews` → Testimonials
- `menu`, `food menu` → Menu
- `booking`, `reservation` → Booking
- `contact`, `contact us` → Contact
- `footer`, `bottom` → Footer

### Language Detection
- Checks for explicit language keywords
- Analyzes text content for Arabic characters
- Infers bilingual from mixed content
- Defaults to bilingual if Arabic present, otherwise English-only

## Testing

1. **Test Arabic-only**: "أنشئ موقع عربي فقط"
2. **Test English-only**: "Create an English-only website"
3. **Test Bilingual**: "Create a bilingual restaurant website"
4. **Test Specific Sections**: "Make a site with only hero and contact, no footer"
5. **Test Download**: Generate a project and download ZIP
6. **Test Preview**: Verify React components render correctly

## Next Steps (Future Enhancements)

- [ ] Full file system (VFS) for editing individual files
- [ ] File patching/editing capabilities
- [ ] Build worker queue for production builds
- [ ] Asset storage in Supabase Storage
- [ ] Real-time preview updates
- [ ] Component-level editing
