# Phase 4: Lovable-Style Backend Pipeline

## Overview

Phase 4 has been completely rebuilt to match Lovable's backend architecture with a structured multi-agent pipeline: **Planner → Architect → Coder**.

## Architecture

### 1. Planner Agent (`src/lib/plannerAgent.ts`)

**Purpose**: Analyzes user prompts and creates a generation plan.

**Detects**:
- Industry type (restaurant, portfolio, clinic, SaaS, agency, etc.)
- Required sections (navbar, hero, about, contact, footer)
- Optional sections (menu, gallery, testimonials, etc.)
- Language requirements (Arabic-only, English-only, bilingual)
- Suggested folder/file structure
- Required libraries
- Project name

**Output**: `GenerationPlan` object with all detected information.

### 2. Architect Agent (`src/lib/architectAgent.ts`)

**Purpose**: Converts the plan into file-level tasks.

**Determines**:
- Which components to generate
- Which config files needed (package.json, vite.config.js, etc.)
- Which assets needed
- Translation files if bilingual

**Output**: `ArchitecturePlan` with a list of file tasks.

### 3. Coder Agent (`src/lib/coderAgent.ts`)

**Purpose**: Generates actual project files using file tools.

**Uses file tools**:
- `list_files(path?)` - List files in workspace
- `read_file(path)` - Read file content
- `write_file(path, content)` - Write/create file
- `apply_patch(path, diff)` - Apply patch to file

**Generates**:
- Config files (package.json, vite.config.js, tailwind.config.js, etc.)
- React components (Navbar, Hero, About, etc.)
- Entry files (main.jsx, App.jsx, index.css)
- Translation files (i18n.js, en.json, ar.json) if bilingual

## Workspace Service (`src/lib/workspaceService.ts`)

**Purpose**: Manages virtual file system per project.

**Features**:
- Stores files in Supabase `builds` table as JSONB array
- Provides file tools interface for agents
- Handles file operations (read/write/list/patch)
- Converts between workspace format and ProjectFiles format

**File Format**:
```typescript
interface WorkspaceFile {
  path: string;
  content: string;
  type: 'file' | 'folder';
}
```

## API Route (`app/api/generate/route.ts`)

**Workflow**:
1. **Planner Agent**: Analyzes prompt → creates plan
2. **Architect Agent**: Converts plan → file tasks
3. **Initialize Workspace**: Creates empty workspace
4. **Coder Agent**: Generates files using file tools
5. **Create Build**: Saves workspace to Supabase
6. **Return Result**: Returns files and metadata

## Section Generation Logic

### Default Sections (Always Included)
- Navbar
- Hero
- Contact
- Footer

### Industry-Specific Sections

**Restaurant/Cafe**:
- Menu
- Gallery
- Testimonials
- About

**Portfolio**:
- Gallery
- Projects
- Skills
- About

**Medical/Clinic**:
- Services
- Appointment
- About

**Agency**:
- Services
- Pricing
- Portfolio
- About

### User-Requested Sections
If user explicitly requests specific sections, only those are generated (plus defaults).

## Language Support

### Arabic-Only
- Hardcoded Arabic text
- RTL layout
- Arabic fonts (Cairo)
- No translation files

### English-Only
- Hardcoded English text
- LTR layout
- English fonts (Inter, Poppins)
- No translation files

### Bilingual
- i18n.js with LanguageProvider
- en.json and ar.json translation files
- Language toggle in Navbar
- Dynamic dir/lang attributes

## File Structure

Every generated project includes:

```
package.json
vite.config.js
tailwind.config.js
postcss.config.js
index.html
src/
  main.jsx
  App.jsx
  index.css
  components/
    Navbar.jsx
    Hero.jsx
    About.jsx
    Contact.jsx
    Footer.jsx
    (other requested components)
  i18n.js (if bilingual)
  locales/
    en.json (if bilingual)
    ar.json (if bilingual)
public/
  logo.png
```

## UI Quality Standards

All components follow Lovable's style guide:

- **Large hero text**: `text-4xl md:text-6xl font-bold`
- **Soft backgrounds**: `bg-gray-50`, `bg-white`
- **Generous spacing**: `py-20`, `px-6`, `gap-12`
- **Smooth transitions**: `hover:scale-[1.02]`
- **Cards**: Shadows and padding
- **Responsive**: `md:`, `lg:` breakpoints

## Preview System

The preview system (`app/preview/[projectId]/page.tsx`) reads from workspace files:
- Loads build from Supabase
- Converts workspace files to ProjectFiles format
- Generates preview HTML using `generatePreviewHTML()`
- Renders in iframe with proper sandbox attributes

## ZIP Download

The download route (`app/api/download/[projectId]/route.ts`):
- Handles both workspace file array format and old object format
- Creates ZIP from all files in workspace
- Returns ZIP file for download

## Migration Notes

- **Old orchestrator** (`aiOrchestrator.ts`) is deprecated but kept for reference
- **Build service** handles both old and new file formats for backward compatibility
- **Preview system** works with both formats automatically

## Testing

To test the new pipeline:

1. Create a new project
2. Send a prompt like: "Make me a coffee shop website"
3. The system will:
   - Detect industry: coffee shop
   - Generate sections: navbar, hero, menu, gallery, testimonials, about, contact, footer
   - Create all required files
   - Save to workspace
   - Generate preview

## Future Enhancements

- Real-time build status updates
- Incremental file updates (apply_patch)
- Build history and versioning
- File diff visualization
- Component library templates
