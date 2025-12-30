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

  // Generate files in order: configs → translations FIRST → components → entry files
  const requiredTasks = architecture.tasks.filter(t => t.priority === 'required');

  // Step 1: Generate config files
  for (const task of requiredTasks.filter(t => t.type === 'config')) {
    await generateConfigFile(task, plan, fileTools, openai);
  }

  // Step 2: Generate translation files FIRST (before components so components know what keys exist)
  for (const task of requiredTasks.filter(t => t.type === 'translation')) {
    await generateTranslationFile(task, plan, architecture, fileTools, openai, userPrompt);
  }

  // Step 3: Generate required components (they can now reference translation keys)
  const requiredComponents = requiredTasks.filter(t => t.type === 'component');
  console.log(`📦 Generating ${requiredComponents.length} required components:`, requiredComponents.map(t => t.path));
  
  for (const task of requiredComponents) {
    await generateComponent(task, plan, architecture, fileTools, openai, userPrompt);
  }

  // Step 4: Generate entry files (App.jsx needs components to exist first)
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
    // Always bilingual - include both English and Arabic fonts
    const fontLinks: string[] = [];
      fontLinks.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
      fontLinks.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
      fontLinks.push('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">');
    fontLinks.push('<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">');
    const fontLinksHtml = fontLinks.join('\n    ');
    
    systemPrompt = `You are an expert at generating index.html files for Vite + React + Tailwind projects.

Generate the complete index.html file.

MANDATORY CONTENT:
<!DOCTYPE html>
<html lang="en" dir="ltr">
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
      // Fallback: ensure component name is valid (remove invalid characters)
      const cleaned = componentName.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');
      componentName = cleaned
        .split(/[\s\-_]+/)
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    }
  }
  
  if (!componentName || componentName.length === 0) {
    componentName = 'Component';
  }
  
  console.log(`🔨 Generating component: ${componentName} (path: ${task.path})`);
  // All websites are now bilingual (always support both English and Arabic)
  const isBilingual = true;

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
= 4. LANGUAGE MODE HANDLING (ALWAYS BILINGUAL)         =
========================================================

CRITICAL: All websites support BOTH English and Arabic with a language toggle button.

### BILINGUAL MODE (ALWAYS):
- NO hardcoded strings allowed
- ALL text must come from translation files (en.json, ar.json)
- MUST use the translation hook: const { t, language } = useLanguage()
- Example: <h1>{t('hero.title')}</h1> instead of <h1>Welcome</h1>
- All components must import: import { useLanguage } from '../i18n.js' (or appropriate path)
- Text direction (RTL/LTR) is handled automatically by LanguageProvider based on selected language

### Translation Keys - CRITICAL RULES:
- ALWAYS access NESTED properties: t('componentName.key') NOT t('componentName')
- NEVER render objects directly: {t('comparison')} is WRONG - it returns an object
- ALWAYS access specific keys: {t('comparison.goals')}, {t('comparison.title')}, etc.
- If you need multiple values from the same section, access each key individually:
  - CORRECT: <div>{t('comparison.goals')}</div> <div>{t('comparison.assists')}</div>
  - WRONG: <div>{t('comparison')}</div> (this returns an object and causes errors)
- For arrays (like menu items, links, features list):
  - In JSON, arrays must be actual arrays: { "navbar": { "links": ["Home", "About", "Contact"] } }
  - Component MUST use defensive code: {(Array.isArray(t('navbar.links')) ? t('navbar.links') : []).map(...)}
  - NOTE: Footer should NOT have links - use navbar.links instead
  - ALWAYS check if the value is an array before calling .map() to prevent errors
  - Pattern: {(Array.isArray(t('key')) ? t('key') : []).map(...)} or {(t('key') || []).map(...)} if you're sure it's always an array
  - BUT: Ensure the translation JSON has arrays, not objects - both English AND Arabic must use arrays
  - If you need structured data, use array of objects: { "links": [{ "label": "Home", "href": "#" }, ...] }
  - Then access: {(Array.isArray(t('navbar.links')) ? t('navbar.links') : []).map(link => ...)}
  - NOTE: Footer should NOT have links - use navbar.links instead
  - Common array keys: features.list, features.items, navbar.links, services, gallery.items
- Translation structure in JSON: { "comparison": { "title": "...", "goals": "...", "assists": "..." } }
- Component must access: t('comparison.title'), t('comparison.goals'), t('comparison.assists')
- Keys should match the component name (lowercase) and content type
- Example: Component "Comparison" uses keys like 'comparison.title', 'comparison.goals', 'comparison.assists'

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
${componentName === 'Navbar' && isBilingual ? `
CRITICAL FOR NAVBAR (BILINGUAL MODE) - MUST CREATE COMPLETE NAVBAR WITH CONTENT:

1. REQUIRED STRUCTURE:
   - Fixed/sticky navbar at top with backdrop blur
   - Logo or site name on the left
   - Navigation links in the center/right (use navbar.links array from translations)
   - Language toggle button on the right
   - Mobile hamburger menu button (visible on small screens)

2. TRANSLATION KEYS:
   - Import: import { useLanguage } from '../i18n.js'
   - Use: const { t, language, toggleLanguage } = useLanguage()
   - Navigation links: Use navbar.links array - {(Array.isArray(t('navbar.links')) ? t('navbar.links') : []).map((link, index) => ...)}
   - Link labels: t('navbar.home'), t('navbar.about'), t('navbar.services'), t('navbar.contact'), etc.
   - Language toggle button text: {language === 'en' ? 'عربي' : 'English'}

3. NAVIGATION LINKS STRUCTURE:
   - Create navigation links based on available sections/components
   - Use anchor tags with href="#section-id" for smooth scrolling
   - Common links: #hero, #about, #features, #services, #gallery, #contact
   - Match section IDs with actual components in the website

4. MOBILE RESPONSIVENESS (CRITICAL):
   - Desktop (md:): Show full navigation menu horizontally
   - Mobile (< md): Show hamburger menu icon, hide navigation links
   - Mobile menu: Toggle-able dropdown/sidebar menu with all links
   - Use useState to manage mobile menu open/close state: const [isMenuOpen, setIsMenuOpen] = useState(false)
   - Hamburger icon: Use SVG or Unicode (☰ or ✕ for close)
   - Mobile menu: Absolute/fixed positioned, full width or slide-in from side
   - Close menu when clicking a link

5. STYLING REQUIREMENTS:
   - Fixed position: fixed top-0 left-0 right-0 z-50
   - Background: bg-white/90 backdrop-blur-md or bg-white with shadow
   - Padding: px-4 md:px-6 py-4
   - Responsive: flex items-center justify-between
   - Mobile menu button: visible md:hidden
   - Desktop links: hidden md:flex gap-6

6. EXAMPLE STRUCTURE:
const Navbar = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinks = Array.isArray(t('navbar.links')) ? t('navbar.links') : [];
  const linkHrefs = ['#hero', '#about', '#features', '#services', '#contact'];
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-xl font-bold">{t('navbar.logo') || 'Logo'}</div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link, index) => (
              <a key={index} href={linkHrefs[index] || '#'} className="hover:text-blue-600 transition">
                {link}
              </a>
            ))}
            <button onClick={toggleLanguage} className="px-3 py-1 rounded bg-blue-600 text-white">
              {language === 'en' ? 'عربي' : 'English'}
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            {navLinks.map((link, index) => (
              <a 
                key={index} 
                href={linkHrefs[index] || '#'} 
                className="block py-2 hover:text-blue-600"
                onClick={() => setIsMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <button 
              onClick={() => { toggleLanguage(); setIsMenuOpen(false); }} 
              className="block mt-2 px-3 py-2 rounded bg-blue-600 text-white w-full"
            >
              {language === 'en' ? 'عربي' : 'English'}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

IMPORTANT: Generate a COMPLETE, FUNCTIONAL navbar with actual navigation links, not just a placeholder!
` : ''}
${componentName !== 'Navbar' && !componentName.includes('Footer') ? 'IMPORTANT: Add an id attribute to the main section: <section id="' + componentName.toLowerCase() + '">. This id must match Navbar links.' : ''}

Return ONLY the complete, polished component code with NO syntax errors, NO markdown, NO code blocks, NO file operation syntax.`;

  // Get the list of components that will actually be generated
  function sectionToComponentName(section: string): string {
    // Remove all invalid characters (parentheses, brackets, etc.) and keep only alphanumeric, spaces, dashes, underscores
    const cleaned = section.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');
    // Split on spaces, dashes, underscores and convert to PascalCase
    return cleaned
      .split(/[\s\-_]+/)
      .filter(word => word.length > 0) // Remove empty strings
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  const actualComponents = plan.requiredSections.map(s => sectionToComponentName(s));
  
  // Try to read translation files to see what keys are available (if translations already generated)
  let translationKeysHint = '';
  try {
    const enJsonContent = await fileTools.read_file('src/locales/en.json');
    if (enJsonContent) {
      const translations = JSON.parse(enJsonContent);
      const componentKey = componentName.toLowerCase();
      if (translations[componentKey]) {
        const keys = Object.keys(translations[componentKey]);
        translationKeysHint = `\nAvailable translation keys for ${componentName} component: ${keys.map(k => `"${componentKey}.${k}"`).join(', ')}\nUse these exact keys in your component: t('${componentKey}.${keys[0]}'), t('${componentKey}.${keys[1]}'), etc.`;
      }
    }
  } catch (e) {
    // Translations not generated yet, that's okay - use standard keys
    const componentKey = componentName.toLowerCase();
    translationKeysHint = `\nUse standard translation keys like: t('${componentKey}.title'), t('${componentKey}.subtitle'), t('${componentKey}.description'), etc.\nMake sure these keys exist in both en.json and ar.json translation files.`;
  }
  
  const userMessage = `Generate ${componentName} component for a ${plan.industry} website.

IMPORTANT: This website will have ONLY these components: ${actualComponents.join(', ')}.
Do NOT reference or import any other components that are not in this list.

CRITICAL - BILINGUAL MODE:
- ALL text must use translation keys from i18n system
- Import: import { useLanguage } from '../i18n.js'
- Use: const { t } = useLanguage()
- NEVER hardcode text like <h1>Welcome</h1> - ALWAYS use: <h1>{t('${componentName.toLowerCase()}.title')}</h1>
- NEVER render translation objects directly: {t('comparison')} is WRONG - React cannot render objects
- ALWAYS access nested keys individually: {t('comparison.goals')}, {t('comparison.title')}, {t('comparison.description')}
- If you need multiple values, access each key separately, never render the parent object
- All text content must reference translation keys from en.json and ar.json${translationKeysHint}

CRITICAL - ARRAY HANDLING FOR LIST ITEMS:
- When using .map() on translation values (features list, links, menu items, etc.), ALWAYS use defensive code
- Pattern: {(Array.isArray(t('features.list')) ? t('features.list') : []).map((item, index) => (...))}
- Common array keys: features.list, features.items, navbar.links, services.list, gallery.items
- NOTE: Footer should NOT have links array - footer should only have copyright and optional social media
- Always ensure the translation key returns an array before calling .map() to prevent "map is not a function" errors
- CRITICAL: If array items are STRINGS, render directly: {array.map((item, i) => <div key={i}>{item}</div>)}
- CRITICAL: If array items are OBJECTS (with title, description, etc.), you MUST access object properties: {array.map((item, i) => <div key={i}><h3>{item.title}</h3><p>{item.description}</p></div>)}
- NEVER render an object directly: {item} is WRONG if item is {title: "...", description: "..."} - always use {item.title}, {item.description}
- Example for Features component: const featuresList = Array.isArray(t('features.list')) ? t('features.list') : []; {featuresList.map((item, i) => typeof item === 'string' ? <div key={i}>{item}</div> : <div key={i}><h3>{item.title}</h3><p>{item.description}</p></div>)}

User's request: ${userPrompt}`;

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
  // Force all websites to be bilingual (always include language toggle)
  const isBilingual = true; // Always bilingual now

  let systemPrompt = '';
  if (fileName === 'main.jsx') {
    // Always bilingual - always wrap with LanguageProvider
    systemPrompt = `Generate src/main.jsx for Vite + React project.
- Import React and ReactDOM
- Import App component
- Import LanguageProvider from './i18n.js'
- Import index.css
- Use ReactDOM.createRoot
- Wrap App with LanguageProvider: <LanguageProvider><App /></LanguageProvider>
- Return ONLY the file content, no markdown.`;
  } else if (fileName === 'App.jsx') {
    // Use architecture.components as source of truth
    let componentNames = architecture.components.filter(name => name.length > 0);
    
    if (componentNames.length === 0) {
      // Fallback: derive from plan.requiredSections
      function sectionToComponentName(section: string): string {
        // Remove all invalid characters (parentheses, brackets, etc.) and keep only alphanumeric, spaces, dashes, underscores
        const cleaned = section.replace(/[^a-zA-Z0-9\s\-_]/g, ' ');
        // Split on spaces, dashes, underscores and convert to PascalCase
        return cleaned
          .split(/[\s\-_]+/)
          .filter(word => word.length > 0) // Remove empty strings
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
      }
      const fallbackNames = plan.requiredSections.map(s => sectionToComponentName(s));
      componentNames.push(...fallbackNames);
    }
    
    // Sort components in logical order: Navbar -> Hero -> About -> Features -> Gallery -> Contact -> Footer
    // Any other components go in the middle (after Features, before Gallery if possible, or after Gallery but before Contact/Footer)
    const componentOrder = [
      'Navbar',
      'Hero',
      'About',
      'Features',
      'Services',
      'Gallery',
      'Contact',
      'Footer'
    ];
    
    // Function to get sort order (lower number = earlier in list)
    function getComponentOrder(componentName: string): number {
      const index = componentOrder.indexOf(componentName);
      if (index !== -1) return index;
      // Components not in the predefined order go after Features but before Gallery, or after Gallery but before Contact/Footer
      // Put them at position 4.5 (between Features and Gallery) by default
      return 4.5;
    }
    
    // Sort components
    componentNames.sort((a, b) => {
      const orderA = getComponentOrder(a);
      const orderB = getComponentOrder(b);
      return orderA - orderB;
    });
    
    const componentImports = componentNames
      .map(c => `import ${c} from './components/${c}.jsx';`)
      .join('\n');
    
    const componentRenders = componentNames
      .map(c => `      <${c} />`)
      .join('\n');
    
    // Generate App.jsx programmatically to ensure accuracy
    // Always use bilingual mode now (default is BILINGUAL)
    const appJsxContent = `import LanguageProvider from './i18n.js';
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

export default App;`;
    
    // Write directly instead of using AI to avoid hallucinations
    await fileTools.write_file('src/App.jsx', appJsxContent);
    return; // Skip AI generation for App.jsx
  } else if (fileName === 'index.css') {
    // Always bilingual now - include both fonts
    const englishFont = 'Inter, system-ui, sans-serif';
    const arabicFont = 'Cairo, system-ui, sans-serif';
    const fontFamily = `${englishFont}, ${arabicFont}`;
    
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
  
  [dir="rtl"] {
    font-family: ${arabicFont};
  }
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
  openai: OpenAI,
  userPrompt: string
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
    // If value is undefined or null, return the key or empty string for arrays
    if (value === undefined || value === null) {
      return key;
    }
    // If value is an object (not an array), return as-is (component should access nested keys)
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
    // Return the value (string, number, array, etc.)
    return value;
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
    // Generate English translations with actual content based on user prompt
    const componentKeys = architecture.components.map(c => c.toLowerCase()).join(', ');
    const systemPrompt = `You are generating English translations for a ${plan.industry} website. You MUST return valid JSON only.

CRITICAL REQUIREMENTS:
1. Generate ACTUAL, MEANINGFUL translations based on the user's request - NOT placeholder text like "hero.title" or "..."
2. Create comprehensive translations for ALL components: ${componentKeys}
3. Use descriptive keys that match component names (e.g., "hero", "navbar", "footer")
4. Include ALL text content that will appear in each section
5. For Navbar: Include navigation links and language toggle text
6. Make translations professional and contextually appropriate for a ${plan.industry} website
7. Return ONLY valid JSON format - no markdown, no code blocks, just the JSON object

CRITICAL - ARRAY CONSISTENCY:
- For ANY list/array-like content (features list, services list, menu items, navigation links, gallery items, etc.), you MUST use ARRAYS in JSON
- NOTE: Footer should NOT have links array - footer should only have copyright and optional social media
- Examples of keys that MUST be arrays: "features.list", "features.items", "services", "links", "menu", "gallery.items", etc.
- Arrays in JSON: "features": { "list": ["Feature 1", "Feature 2", "Feature 3"] }
- NEVER use objects for list data: "features": { "list": { "item1": "..." } } is WRONG
- If a component will use .map() on a translation key, that key MUST be an array in both English AND Arabic
- Common array keys: navbar.links, features.list, features.items, services.list, gallery.items
- NOTE: Footer should NOT have links array - footer should only have copyright and optional social media

Example JSON structure:
{
  "navbar": {
    "logo": "Site Name",
    "home": "Home",
    "about": "About Us",
    "services": "Services",
    "features": "Features",
    "gallery": "Gallery",
    "contact": "Contact",
    "toggleLanguage": "عربي",
    "links": ["Home", "About", "Features", "Services", "Gallery", "Contact"]
  },
  "hero": {
    "title": "Welcome to Our ${plan.industry}",
    "subtitle": "We provide exceptional service",
    "cta": "Get Started"
  },
  "features": {
    "title": "Our Features",
    "list": ["Feature One", "Feature Two", "Feature Three"]
  },
  "contact": {
    "title": "Contact Us",
    "subtitle": "Get in touch",
    "name": "Name",
    "email": "Email",
    "message": "Message",
    "submit": "Send Message",
    "socialTitle": "Follow Us"
  },
  "footer": {
    "copyright": "© 2024 Company Name. All rights reserved.",
    "socialTitle": "Follow Us"
  }
}

Generate comprehensive, actual translations in valid JSON format - NOT placeholders.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User's original request: "${userPrompt}"\n\nGenerate complete English translations in JSON format for all components in this ${plan.industry} website. Return valid JSON with all text content, not just placeholder keys.` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    await fileTools.write_file(task.path, cleaned);
  } else if (task.path.includes('ar.json')) {
    // Generate Arabic translations with actual content based on user prompt
    const componentKeys = architecture.components.map(c => c.toLowerCase()).join(', ');
    const systemPrompt = `You are generating Arabic translations for a ${plan.industry} website. You MUST return valid JSON only.

CRITICAL REQUIREMENTS:
1. Generate ACTUAL, MEANINGFUL Arabic translations - NOT placeholder text like "..." or English text
2. Create comprehensive translations for ALL components: ${componentKeys}
3. Use descriptive keys that match component names (e.g., "hero", "navbar", "footer")
4. Include ALL text content that will appear in each section
5. For Navbar: Include navigation links and language toggle text
6. Make translations professional and contextually appropriate for a ${plan.industry} website
7. ALL text must be in proper Arabic - translate naturally, don't just transliterate
8. Return ONLY valid JSON format - no markdown, no code blocks, just the JSON object

CRITICAL - ARRAY CONSISTENCY (MUST MATCH ENGLISH STRUCTURE):
- For ANY list/array-like content (features list, services list, menu items, navigation links, gallery items, etc.), you MUST use ARRAYS in JSON
- NOTE: Footer should NOT have links array - footer should only have copyright and optional social media - EXACTLY like the English version
- The structure MUST match the English translation file - if English has "features.list" as an array, Arabic MUST also have "features.list" as an array
- Arrays in JSON can be arrays of strings: "features": { "list": ["الميزة الأولى", "الميزة الثانية", "الميزة الثالثة"] }
- OR arrays of objects if structure needed: "features": { "list": [{"title": "...", "description": "..."}, ...] }
- NEVER use objects for list data: "features": { "list": { "item1": "..." } } is WRONG (use arrays!)
- IMPORTANT: If components map over arrays of objects, they MUST access properties (item.title, item.description), never render objects directly
- If a component will use .map() on a translation key, that key MUST be an array in BOTH English AND Arabic
- Common array keys that MUST be arrays: navbar.links, features.list, features.items, services.list, gallery.items
- NOTE: Footer should NOT have links array - footer should only have copyright and optional social media
- Ensure array lengths match between English and Arabic versions when possible

Example JSON structure:
{
  "navbar": {
    "logo": "اسم الموقع",
    "home": "الرئيسية",
    "about": "من نحن",
    "services": "الخدمات",
    "features": "الميزات",
    "gallery": "المعرض",
    "contact": "اتصل بنا",
    "toggleLanguage": "English",
    "links": ["الرئيسية", "من نحن", "الميزات", "الخدمات", "المعرض", "اتصل بنا"]
  },
  "hero": {
    "title": "مرحباً بك في موقعنا",
    "subtitle": "نقدم خدمات استثنائية",
    "cta": "ابدأ الآن"
  },
  "features": {
    "title": "ميزاتنا",
    "list": ["الميزة الأولى", "الميزة الثانية", "الميزة الثالثة"]
  },
  "contact": {
    "title": "اتصل بنا",
    "subtitle": "تواصل معنا",
    "name": "الاسم",
    "email": "البريد الإلكتروني",
    "message": "الرسالة",
    "submit": "إرسال الرسالة",
    "socialTitle": "تابعنا"
  },
  "footer": {
    "copyright": "© 2024 اسم الشركة. جميع الحقوق محفوظة.",
    "socialTitle": "تابعنا"
  }
}

Generate comprehensive, actual Arabic translations in valid JSON format - NOT placeholders or English text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User's original request: "${userPrompt}"\n\nGenerate complete Arabic translations in JSON format for all components in this ${plan.industry} website. Return valid JSON with all text content in proper Arabic, not just placeholder keys.` },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    await fileTools.write_file(task.path, cleaned);
  }
}
