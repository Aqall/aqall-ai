/**
 * Coder Agent - Generates actual project files using file tools
 * 
 * Uses file tools (list/read/write/apply_patch) to generate:
 * - Config files (package.json, vite.config.js, etc.)
 * - React components
 * - Translation files (if bilingual)
 * - Entry files (main.jsx, App.jsx, index.css)
 */

import OpenAI from 'openai';
import { FileTools } from './workspaceService';
import { ArchitecturePlan } from './architectAgent';
import { GenerationPlan } from './plannerAgent';

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

/**
 * Coder Agent - Generates project files using file tools
 */
export async function codeGeneration(
  plan: GenerationPlan,
  architecture: ArchitecturePlan,
  fileTools: FileTools,
  userPrompt: string
): Promise<void> {
  const openai = getOpenAIClient();

  // Generate files in order: configs → components → entry files → translations
  const requiredTasks = architecture.tasks.filter(t => t.priority === 'required');

  // Step 1: Generate config files
  for (const task of requiredTasks.filter(t => t.type === 'config')) {
    await generateConfigFile(task, plan, fileTools, openai);
  }

  // Step 2: Generate required components
  const requiredComponents = requiredTasks.filter(t => t.type === 'component');
  console.log(`📦 Generating ${requiredComponents.length} required components:`, requiredComponents.map(t => t.path));
  
  for (const task of requiredComponents) {
    await generateComponent(task, plan, architecture, fileTools, openai, userPrompt);
  }

  // Step 3: Generate entry files (App.jsx needs components to exist first)
  // Generate main.jsx and index.css first, then App.jsx
  const entryTasks = requiredTasks.filter(t => t.type === 'entry');
  const appJsxTask = entryTasks.find(t => t.path === 'src/App.jsx');
  const otherEntryTasks = entryTasks.filter(t => t.path !== 'src/App.jsx');
  
  // Generate other entry files first
  for (const task of otherEntryTasks) {
    await generateEntryFile(task, plan, architecture, fileTools, openai);
  }
  
  // Generate App.jsx last, after all components exist
  if (appJsxTask) {
    await generateEntryFile(appJsxTask, plan, architecture, fileTools, openai);
  }

  // Step 4: Generate translation files if bilingual
  if (plan.languageMode === 'BILINGUAL') {
    for (const task of requiredTasks.filter(t => t.type === 'translation')) {
      await generateTranslationFile(task, plan, architecture, fileTools, openai);
    }
  }
}

/**
 * Generate a config file
 */
async function generateConfigFile(
  task: { path: string; description: string },
  plan: GenerationPlan,
  fileTools: FileTools,
  openai: OpenAI
): Promise<void> {
  const fileName = task.path.split('/').pop() || '';
  
  let systemPrompt = '';
  
  if (fileName === 'package.json') {
    systemPrompt = `You are an expert at generating package.json files for Vite + React + Tailwind projects.

Generate the complete package.json file.

MANDATORY DEPENDENCIES (must include):
- react: ^18.2.0
- react-dom: ^18.2.0
- vite: ^5.0.0
- tailwindcss: ^3.4.0
- autoprefixer: ^10.4.0
- postcss: ^8.4.0

Requirements:
- Project name: ${plan.projectName}
- Include all standard Vite + React scripts
- Use latest stable versions
- Make it production-ready

Return ONLY valid JSON, no markdown, no code blocks.`;
  } else if (fileName === 'index.html') {
    const isBilingual = plan.languageMode === 'BILINGUAL';
    const isArabicOnly = plan.languageMode === 'ARABIC_ONLY';
    
    const fontLinks: string[] = [];
    if (!isArabicOnly) {
      fontLinks.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
      fontLinks.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      fontLinks.push('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">');
    }
    if (isArabicOnly || isBilingual) {
      if (fontLinks.length === 0) {
        fontLinks.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
        fontLinks.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      }
      fontLinks.push('<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">');
    }
    const fontLinksHtml = fontLinks.join('\n    ');
    
    systemPrompt = `You are an expert at generating index.html files for Vite + React + Tailwind projects.

Generate the complete index.html file.

MANDATORY CONTENT:
<!DOCTYPE html>
<html lang="${isArabicOnly ? 'ar' : 'en'}" dir="${isArabicOnly ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${plan.projectName}</title>
    ${fontLinksHtml}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

Return ONLY the file content, no markdown, no code blocks.`;
  } else {
    systemPrompt = `You are an expert at generating ${task.path} files for Vite + React + Tailwind projects.

Generate the complete file content for ${task.path}.

Requirements:
- ${task.description}
- Project name: ${plan.projectName}
- Language mode: ${plan.languageMode}
- Use modern best practices
- Make it production-ready

Return ONLY the file content, no markdown, no code blocks, just the raw file content.`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${task.path} for a ${plan.industry} website.` },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  if (content) {
    // Remove markdown code blocks if present
    const cleaned = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    await fileTools.write_file(task.path, cleaned);
  }
}

/**
 * Generate a React component
 */
async function generateComponent(
  task: { path: string; description: string },
  plan: GenerationPlan,
  architecture: ArchitecturePlan,
  fileTools: FileTools,
  openai: OpenAI,
  userPrompt: string
): Promise<void> {
  // Extract component name from path
  let componentName = task.path.split('/').pop()?.replace('.jsx', '') || 'Component';
  
  // Verify this component name exists in architecture.components
  if (!architecture.components.includes(componentName)) {
    // Try to find a match (case-insensitive)
    const match = architecture.components.find(c => c.toLowerCase() === componentName.toLowerCase());
    if (match) {
      componentName = match;
    } else {
      // Fallback: ensure component name is valid
      componentName = componentName
        .split(/[\s\-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    }
  }
  
  if (!componentName || componentName.length === 0) {
    componentName = 'Component';
  }
  
  console.log(`🔨 Generating component: ${componentName} (path: ${task.path})`);
  const isBilingual = plan.languageMode === 'BILINGUAL';
  const isArabicOnly = plan.languageMode === 'ARABIC_ONLY';

  const systemPrompt = `You are the Coder Agent for Aqall.  
You are responsible for creating and editing files inside the project workspace using file tools.

========================================================
= 1. INPUT                                             =
========================================================

You receive:
- The full architectural blueprint from the Architect Agent
- Instructions from the user (new build or modification)
- Access to file tools:
  - read_file(path)
  - write_file(path, content)
  - list_files()
  - apply_patch(path, diff)

========================================================
= 2. RULES FOR GENERATION                              =
========================================================

### Core requirements:
- Generate a REAL working Vite + React + Tailwind project.
- All text must respect languageMode.
- All components must follow Lovable's UI aesthetic.
- Do NOT regenerate files unnecessarily.
- Only write missing files or patch existing ones.
- Produced code must compile and run.

========================================================
= 3. CODE QUALITY RULES                                =
========================================================

### Tailwind rules:
- Use generous spacing: py-20, px-6
- Use modern layouts: flex, grid, gap-6+
- Buttons: rounded-lg, px-6, py-3, font-medium
- Cards: shadow-md, rounded-xl, p-6
- Hover transitions: hover:scale-[1.02]

### Component rules:
- One section = one component
- Use semantic HTML: section, header, footer
- Avoid inline styling, prefer Tailwind classes
- Use responsive breakpoints (sm:, md:, lg:)
- Mobile-first approach: Base styles for mobile, then md:, lg: breakpoints

### Responsiveness (CRITICAL):
- Text sizes: text-sm md:text-base lg:text-lg for body, text-2xl md:text-4xl lg:text-6xl for headings
- Padding: p-4 md:p-6 lg:p-8, py-8 md:py-12 lg:py-20
- Grid/Columns: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

### Visual Polish:
- Professional palettes: blue-600, indigo-600, purple-600, emerald-600 for primary
- Backgrounds: gray-50, gray-100, white
- Text: gray-900 for headings, gray-700 for body
- Shadows: shadow-sm, shadow-md, shadow-lg for depth
- Rounded corners: rounded-lg, rounded-xl, rounded-2xl
- Smooth transitions: transition-all duration-300

========================================================
= 4. LANGUAGE MODE HANDLING                            =
========================================================

### If ARABIC_ONLY:
- Hardcode Arabic strings
- All layout direction must be RTL

### If ENGLISH_ONLY:
- Hardcode English strings

### If BILINGUAL:
- No hardcoded strings allowed
- All text loaded from locales (en.json, ar.json)
- Structure must use a translation hook or function

Current language mode: ${plan.languageMode}
${isBilingual ? 'Use i18n: const { t, language } = useLanguage() for all text' : ''}
${isArabicOnly ? 'Hardcode Arabic text, use dir="rtl"' : ''}
${!isBilingual && !isArabicOnly ? 'Hardcode English text' : ''}

========================================================
= 5. EDITING / PATCH MODE                              =
========================================================

If the user request is a modification:
1. Identify affected files
2. Use apply_patch() with minimal diff
3. Do NOT rewrite entire components unless necessary
4. Maintain formatting consistency

========================================================
= 6. EDGE CASE HANDLING                                =
========================================================

- If user removes a section → delete that component file and update App.jsx
- If user wants new components → create new files cleanly
- If user wants "bigger hero text", "new color", "stronger button" → patch only those classes
- If user creates conflicting requests → follow LATEST instruction
- If file is missing → create it

========================================================
= 7. FINAL OUTPUT                                      =
========================================================

⚠️ CRITICAL: For component generation, return ONLY the raw component code.
- DO NOT include file operation syntax (write_file, read_file, etc.)
- DO NOT include explanations or comments about file operations
- DO NOT include markdown code blocks
- Return ONLY the actual React component code

Example of CORRECT output:
const Hero = () => {
  return (
    <section id="hero">
      <h1>Welcome</h1>
    </section>
  );
};

Example of WRONG output:
write_file('src/components/Hero.jsx', code here);

Generate component: ${componentName}
${componentName !== 'Navbar' && !componentName.includes('Footer') ? 'IMPORTANT: Add an id attribute to the main section: <section id="' + componentName.toLowerCase() + '">. This id must match Navbar links.' : ''}

Return ONLY the complete, polished component code with NO syntax errors, NO markdown, NO code blocks, NO file operation syntax.`;

  // Get the list of components that will actually be generated
  function sectionToComponentName(section: string): string {
    return section
      .split(/[\s\-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  const actualComponents = plan.requiredSections.map(s => sectionToComponentName(s));
  
  const userMessage = `Generate ${componentName} component for a ${plan.industry} website.

IMPORTANT: This website will have ONLY these components: ${actualComponents.join(', ')}.
Do NOT reference or import any other components that are not in this list.
${isBilingual ? 'Use translation keys from i18n system.' : ''}
${userPrompt}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  if (content) {
    let cleaned = content.replace(/^```jsx?\n?/, '').replace(/\n?```$/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
    
    // Remove file operation syntax if AI mistakenly included it
    // Remove patterns like: write_file('path', `...`) or write_file("path", """...""")
    cleaned = cleaned.replace(/write_file\s*\([^)]*\)\s*[,;]?\s*/g, '');
    cleaned = cleaned.replace(/read_file\s*\([^)]*\)\s*[,;]?\s*/g, '');
    cleaned = cleaned.replace(/apply_patch\s*\([^)]*\)\s*[,;]?\s*/g, '');
    cleaned = cleaned.replace(/list_files\s*\([^)]*\)\s*[,;]?\s*/g, '');
    
    // Remove Python-style triple quotes if present
    cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
    cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
    
    // Remove any remaining file operation patterns
    cleaned = cleaned.replace(/['"]src\/components\/[^'"]+['"]\s*[,;]?\s*/g, '');
    
    // Additional cleanup to fix common syntax issues
    // Fix single quotes in className attributes
    cleaned = cleaned.replace(/className='([^']*)'/g, 'className="$1"');
    // Fix unclosed JSX tags (basic check)
    // Ensure proper closing of common patterns
    cleaned = cleaned.replace(/<(\w+)([^>]*?)(?<!\s)\s*>/g, (match, tag, attrs) => {
      // Self-closing tags
      if (['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tag.toLowerCase())) {
        return match.endsWith('/>') ? match : match.replace('>', ' />');
      }
      return match;
    });
    
    // Trim any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    await fileTools.write_file(task.path, cleaned);
  }
}

/**
 * Generate an entry file (main.jsx, App.jsx, index.css)
 */
async function generateEntryFile(
  task: { path: string; description: string },
  plan: GenerationPlan,
  architecture: ArchitecturePlan,
  fileTools: FileTools,
  openai: OpenAI
): Promise<void> {
  const fileName = task.path.split('/').pop() || '';
  const isBilingual = plan.languageMode === 'BILINGUAL';

  let systemPrompt = '';
  if (fileName === 'main.jsx') {
    systemPrompt = `Generate src/main.jsx for Vite + React project.
- Import React and ReactDOM
- Import App component
- Import index.css
- Use ReactDOM.createRoot
- ${isBilingual ? 'Wrap App with LanguageProvider' : ''}
- Return ONLY the file content, no markdown.`;
  } else if (fileName === 'App.jsx') {
    // Use architecture.components as source of truth
    const componentNames = architecture.components.filter(name => name.length > 0);
    
    if (componentNames.length === 0) {
      // Fallback: derive from plan.requiredSections
      function sectionToComponentName(section: string): string {
        return section
          .split(/[\s\-_]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
      }
      const fallbackNames = plan.requiredSections.map(s => sectionToComponentName(s));
      componentNames.push(...fallbackNames);
    }
    
    const componentImports = componentNames
      .map(c => `import ${c} from './components/${c}.jsx';`)
      .join('\n');
    
    const componentRenders = componentNames
      .map(c => `      <${c} />`)
      .join('\n');
    
    // Generate App.jsx programmatically to ensure accuracy
    const appJsxContent = isBilingual
      ? `import LanguageProvider from './i18n.js';
${componentImports}

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen">
${componentRenders}
      </div>
    </LanguageProvider>
  );
}

export default App;`
      : `${componentImports}

function App() {
  return (
    <div className="min-h-screen">
${componentRenders}
    </div>
  );
}

export default App;`;
    
    // Write directly instead of using AI to avoid hallucinations
    await fileTools.write_file('src/App.jsx', appJsxContent);
    return; // Skip AI generation for App.jsx
  } else if (fileName === 'index.css') {
    const isArabicOnly = plan.languageMode === 'ARABIC_ONLY';
    
    const englishFont = 'Inter, system-ui, sans-serif';
    const arabicFont = 'Cairo, system-ui, sans-serif';
    const fontFamily = isArabicOnly 
      ? arabicFont 
      : isBilingual 
        ? `${englishFont}, ${arabicFont}`
        : englishFont;
    
    systemPrompt = `Generate src/index.css with Tailwind imports and professional global styles.

MANDATORY CONTENT:
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply antialiased;
  }
  
  html {
    scroll-behavior: smooth;
    font-family: ${fontFamily};
  }
  
  body {
    @apply text-gray-900 bg-white;
    font-feature-settings: "kern" 1;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  ${isArabicOnly || isBilingual ? `
  [dir="rtl"] {
    font-family: ${arabicFont};
  }
  ` : ''}
}

@layer utilities {
  .font-arabic {
    font-family: ${arabicFont};
  }
  
  .text-balance {
    text-wrap: balance;
  }
  
  .gradient-text {
    @apply bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent;
  }
}

html {
  scroll-padding-top: 80px;
}

Return ONLY the file content, no markdown.`;
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${task.path} for ${plan.industry} website.` },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  if (content) {
    const cleaned = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    await fileTools.write_file(task.path, cleaned);
  }
}

/**
 * Generate translation files
 */
async function generateTranslationFile(
  task: { path: string; description: string },
  plan: GenerationPlan,
  architecture: ArchitecturePlan,
  fileTools: FileTools,
  openai: OpenAI
): Promise<void> {
  if (task.path === 'src/i18n.js') {
    // Generate i18n.js with LanguageProvider
    const i18nContent = `import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from './locales/en.json';
import arTranslations from './locales/ar.json';

const LanguageContext = createContext();

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };
  
  const t = (key) => {
    const translations = language === 'en' ? enTranslations : arTranslations;
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  
  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
  }, [language]);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}`;
    await fileTools.write_file(task.path, i18nContent);
  } else if (task.path.includes('en.json')) {
    // Generate English translations
    const systemPrompt = `Generate English translation JSON for a ${plan.industry} website.

Create a JSON object with translation keys for all sections: ${architecture.components.join(', ')}.

Structure:
{
  "nav": { "home": "Home", "about": "About", ... },
  "hero": { "title": "...", "subtitle": "..." },
  ...
}

Return ONLY valid JSON, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate English translations for ${plan.industry} website.` },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    await fileTools.write_file(task.path, cleaned);
  } else if (task.path.includes('ar.json')) {
    // Generate Arabic translations
    const systemPrompt = `Generate Arabic translation JSON for a ${plan.industry} website.

Create a JSON object with Arabic translation keys for all sections: ${architecture.components.join(', ')}.

Structure:
{
  "nav": { "home": "الرئيسية", "about": "من نحن", ... },
  "hero": { "title": "...", "subtitle": "..." },
  ...
}

Return ONLY valid JSON, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate Arabic translations for ${plan.industry} website.` },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    await fileTools.write_file(task.path, cleaned);
  }
}
