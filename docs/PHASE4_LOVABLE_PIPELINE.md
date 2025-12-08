# Phase 4: Lovable-Style Backend Pipeline

## Overview

Phase 4 has been completely rebuilt to match Lovable's backend architecture with a structured multi-agent pipeline: **Planner → Architect → Coder**.

## Architecture

### Pipeline Flow

```
User Prompt
    ↓
Planner Agent (Language Detection + Industry Analysis)
    ↓
Architect Agent (File Tasks Generation)
    ↓
Coder Agent (File Generation using File Tools)
    ↓
Workspace Files → ProjectFiles → Build Storage
```

## Components

### 1. Planner Agent (`src/lib/plannerAgent.ts`)

**Responsibilities:**
- Analyzes user prompt
- **Automatic language detection** (Arabic/English/Bilingual)
- Detects industry type
- Determines required and optional sections
- Creates generation plan

**Language Detection Logic:**
1. **Explicit instructions** (highest priority):
   - "bilingual", "both languages" → BILINGUAL
   - "arabic only", "عربي فقط" → ARABIC_ONLY
   - "english only" → ENGLISH_ONLY

2. **Automatic detection** (fallback):
   - 70%+ Arabic characters → ARABIC_ONLY
   - Substantial mix (both > 10 chars) → BILINGUAL
   - Only Arabic → ARABIC_ONLY
   - Default → ENGLISH_ONLY

**Output:** `GenerationPlan` with industry, sections, languageMode, etc.

### 2. Architect Agent (`src/lib/architectAgent.ts`)

**Responsibilities:**
- Converts plan to file-level tasks
- Determines which components to generate
- Identifies config files needed
- Specifies translation files (if bilingual)
- Creates architecture plan

**Output:** `ArchitecturePlan` with tasks, components, configFiles, etc.

### 3. Coder Agent (`src/lib/coderAgent.ts`)

**Responsibilities:**
- Uses file tools to generate actual files
- Generates config files (package.json, vite.config.js, etc.)
- Generates React components
- Generates entry files (main.jsx, App.jsx, index.css)
- Generates translation files (if bilingual)

**File Tools Used:**
- `list_files(path?)` - List files in workspace
- `read_file(path)` - Read file content
- `write_file(path, content)` - Write/create file
- `apply_patch(path, diff)` - Apply patch to file

### 4. Workspace Service (`src/lib/workspaceService.ts`)

**Responsibilities:**
- Manages virtual file system per project
- Provides file tools interface
- Converts between workspace format and JSONB storage
- Handles file operations in-memory during generation

**File Tools Interface:**
```typescript
interface FileTools {
  list_files: (path?: string) => Promise<string[]>;
  read_file: (path: string) => Promise<string | null>;
  write_file: (path: string, content: string) => Promise<void>;
  apply_patch: (path: string, diff: string) => Promise<void>;
}
```

### 5. Pipeline Orchestrator (`src/lib/pipelineService.ts`)

**Responsibilities:**
- Orchestrates the entire pipeline
- Coordinates Planner → Architect → Coder flow
- Converts workspace files to ProjectFiles format
- Returns result compatible with buildService

## Generated File Structure

Every generated project includes:

### Required Files:
- `package.json` - Dependencies and scripts
- `vite.config.js` - Vite configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `index.html` - HTML entry point
- `src/main.jsx` - React entry point
- `src/App.jsx` - Main App component
- `src/index.css` - Global styles and Tailwind imports
- `src/components/Navbar.jsx` - Navigation component
- `src/components/Footer.jsx` - Footer component
- Plus any other requested components

### If Bilingual:
- `src/i18n.js` - i18n configuration and LanguageProvider
- `src/locales/en.json` - English translations
- `src/locales/ar.json` - Arabic translations

## Language Mode Handling

### ARABIC_ONLY
- Hardcoded Arabic text in components
- RTL layout (`dir="rtl"`)
- Arabic fonts (Cairo)
- No translation files

### ENGLISH_ONLY
- Hardcoded English text in components
- LTR layout (`dir="ltr"`)
- English fonts (Inter, Poppins)
- No translation files

### BILINGUAL
- All text from translation files
- Language toggle in Navbar
- i18n system with `useLanguage()` hook
- Dynamic LTR/RTL switching
- Both English and Arabic fonts

## Section Generation Logic

### User-Specific Sections
If user requests specific sections (e.g., "hero + about + contact"), only those are generated.

### Default Sections
If prompt is generic, generates:
- Navbar
- Hero
- About
- Features
- Contact
- Footer

### Industry-Specific Sections
- **Restaurant/Cafe**: Menu, Gallery, Testimonials, About
- **Portfolio**: Gallery, Projects, Skills, About
- **Medical/Clinic**: Services, Appointment, About
- **Agency**: Services, Pricing, Portfolio, About

## API Integration

The pipeline is integrated via `/api/generate` route:

```typescript
POST /api/generate
{
  projectId: string,
  message: string,
  history?: Array<{role, content}>
}
```

The route:
1. Calls `generateSiteFromPrompt()` from pipelineService
2. Creates build with generated files
3. Returns build result with version, files, previewHtml, etc.

## Quality Standards

All generated components follow Lovable's quality standards:

- **Responsive**: Mobile-first with proper breakpoints
- **Professional**: Clean color palettes, proper spacing
- **Modern**: Smooth transitions, hover effects, shadows
- **Accessible**: Proper contrast, semantic HTML
- **Production-ready**: Valid JSX, no syntax errors

## Migration Notes

- **Old orchestrator** (`aiOrchestrator.ts`) is deprecated but kept for reference
- All new generation uses the pipeline
- Preview HTML generation works with new file structure
- Build storage remains compatible (ProjectFiles format)

## Testing

To test the new pipeline:

1. Submit a prompt via `/api/generate`
2. Check console logs for pipeline steps
3. Verify generated files in build storage
4. Preview should render correctly
5. ZIP download should include all files

## Future Enhancements

- File regeneration cycles (read existing, apply patches)
- Iterative improvements based on user feedback
- Component-level regeneration
- Advanced diff/patch support
