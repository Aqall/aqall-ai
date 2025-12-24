/**
 * Build Service - Supabase-backed build management
 * 
 * This service handles all CRUD operations for builds using Supabase Postgres.
 */

import { supabase } from './supabaseClient';

export interface ProjectFiles {
  [filePath: string]: string;
}

export interface Build {
  id: string;
  project_id: string;
  version: number;
  prompt: string;
  files: ProjectFiles; // JSONB object with file paths as keys
  preview_html: string | null;
  created_at: string;
}

/**
 * Get the next version number for a project
 */
async function getNextVersion(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from('builds')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 means no rows found, which is fine
    console.error('Error fetching latest version:', error);
    throw new Error(`Failed to fetch latest version: ${error.message}`);
  }

  return data ? data.version + 1 : 1;
}

/**
 * Generate preview HTML from React project files
 * Uses Babel standalone to run React components in browser
 */
export function generatePreviewHTML(files: ProjectFiles, languageMode: string): string {
  // Extract key files
  const appJsx = files['src/App.jsx'] || '';
  const mainJsx = files['src/main.jsx'] || '';
  const indexCss = files['src/index.css'] || '';
  const packageJson = files['package.json'] || '{}';
  
  // Get all component files
  const components: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('src/components/') && path.endsWith('.jsx')) {
      const componentName = path.replace('src/components/', '').replace('.jsx', '');
      components[componentName] = content;
    }
  }
  
  // Get i18n files if bilingual
  const i18nJs = files['src/i18n.js'] || '';
  const enJson = files['src/locales/en.json'] || '{}';
  const arJson = files['src/locales/ar.json'] || '{}';
  
  // Parse package.json to get project name
  let projectName = 'Generated Website';
  try {
    const pkg = JSON.parse(packageJson);
    projectName = pkg.name || projectName;
  } catch {
    // Ignore parse errors
  }

  // Determine direction and language based on language mode
  const dir = languageMode === 'arabic-only' ? 'rtl' : 'ltr';
  const lang = languageMode === 'arabic-only' ? 'ar' : languageMode === 'bilingual' ? 'en' : 'en';

  // Build fonts based on language
  const fonts = languageMode === 'arabic-only'
    ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">'
    : '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">';

  const fontFamily = languageMode === 'arabic-only'
    ? 'font-family: \'Cairo\', sans-serif;'
    : 'font-family: \'Inter\', \'Poppins\', sans-serif;';

  // Build component code - inline all components
  let componentCode = '';
  for (const [name, content] of Object.entries(components)) {
    // Remove imports, keep the component function
    let cleaned = content
      .replace(/^import\s+.*$/gm, '')
      .trim();
    
    // Remove ALL export statements (default and named)
    // Handle multiline exports
    cleaned = cleaned.replace(/export\s+default\s+function\s+/g, 'function ');
    cleaned = cleaned.replace(/export\s+default\s+const\s+/g, 'const ');
    cleaned = cleaned.replace(/export\s+default\s+/g, '');
    cleaned = cleaned.replace(/^export\s+default\s+/gm, '');
    cleaned = cleaned.replace(/^export\s+/gm, '');
    
    // Also remove any export default that might be in the middle (shouldn't happen but be safe)
    cleaned = cleaned.replace(/\bexport\s+default\s+/g, '');
    
    // Fix undefined image variables - replace with placeholder images
    // Common patterns: src={imageName}, src={profilePic}, src={logo}, etc.
    const imagePlaceholder = 'https://via.placeholder.com/400x300?text=Image';
    
    // First, collect all defined variables
    const definedVars = new Set<string>();
    const varDefPattern = /(?:const|let|var)\s+(\w+)\s*=/g;
    let varMatch;
    while ((varMatch = varDefPattern.exec(cleaned)) !== null) {
      definedVars.add(varMatch[1]);
    }
    // Also check imports
    const importPattern = /import\s+(?:\{[^}]*\}|\*\s+as\s+)?(\w+)/g;
    while ((varMatch = importPattern.exec(cleaned)) !== null) {
      definedVars.add(varMatch[1]);
    }
    
    // Fix src={variableName} patterns
    const imageVariablePattern = /\bsrc=\{(\w+)\}/g;
    cleaned = cleaned.replace(imageVariablePattern, (match, varName) => {
      if (!definedVars.has(varName) && !cleaned.includes(`function ${varName}`)) {
        // Replace undefined image variable with placeholder
        return `src="${imagePlaceholder}"`;
      }
      return match; // Keep if variable is defined
    });
    
    // Fix standalone image variable references in JSX
    // Pattern: {imageName} or {profilePic} etc. (but not function calls, object properties, or hooks)
    const standaloneImageVarPattern = /\{(\w+(?:Pic|Image|Img|Photo|Logo|Avatar|pic|image|img|photo|logo|avatar))\}/g;
    cleaned = cleaned.replace(standaloneImageVarPattern, (match, varName) => {
      // Skip if it's a function call, object property, or React hook
      if (cleaned.includes(`${varName}(`) || 
          cleaned.includes(`${varName}.`) || 
          cleaned.includes(`use${varName.charAt(0).toUpperCase() + varName.slice(1)}`) ||
          varName.startsWith('use')) {
        return match;
      }
      
      if (!definedVars.has(varName) && !cleaned.includes(`function ${varName}`)) {
        // Replace with placeholder image element
        return `{<img src="${imagePlaceholder}" alt="Placeholder" className="w-full h-auto" />}`;
      }
      return match;
    });
    
    // Check if it's already a function (arrow function or function declaration)
    const hasArrowFunction = /const\s+\w+\s*=\s*\([^)]*\)\s*=>/.test(cleaned) || 
                            /const\s+\w+\s*=\s*\(\)\s*=>/.test(cleaned);
    const hasFunctionDeclaration = /function\s+\w+\s*\(/.test(cleaned);
    const isFunction = hasArrowFunction || hasFunctionDeclaration;
    
    // Ensure component name matches the expected format
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    
    // If it's already a valid function (arrow or declaration), keep it as is
    if (isFunction) {
      // Ensure the component name matches (fix if needed)
      if (hasArrowFunction) {
        // Fix arrow function name if it doesn't match
        cleaned = cleaned.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>/, `const ${capitalized} = () =>`);
        cleaned = cleaned.replace(/const\s+\w+\s*=\s*\(\)\s*=>/, `const ${capitalized} = () =>`);
      } else if (hasFunctionDeclaration) {
        // Fix function declaration name if it doesn't match
        cleaned = cleaned.replace(/function\s+\w+\s*\(/, `function ${capitalized}(`);
      }
    } else {
      // If it starts with 'return' or JSX, it needs a function wrapper
      if (cleaned.trim().startsWith('return') || 
          (cleaned.trim().startsWith('(') && !isFunction) || 
          (cleaned.trim().startsWith('<') && !isFunction)) {
        // Extract the return value
        let returnValue = cleaned;
        if (returnValue.trim().startsWith('return')) {
          returnValue = returnValue.replace(/^return\s+/, '').trim();
          // Remove trailing semicolon if present
          if (returnValue.endsWith(';')) {
            returnValue = returnValue.slice(0, -1).trim();
          }
        }
        
        // Wrap in arrow function
        cleaned = `const ${capitalized} = () => {\n  return (\n    ${returnValue}\n  );\n};`;
      } else if (!isFunction) {
        // If it doesn't look like a function, create a basic one
        cleaned = `const ${capitalized} = () => {\n  return (\n    <div>Component ${capitalized}</div>\n  );\n};`;
      }
    }
    
    // Ensure component ends with semicolon if it's an arrow function
    if (cleaned.includes('const ') && cleaned.includes('=>') && !cleaned.trim().endsWith(';')) {
      cleaned = cleaned.trim() + ';';
    }
    
    componentCode += `\n    // ${name} component\n    ${cleaned}\n`;
  }

  // Build i18n code if bilingual - generate our own reliable implementation
  let i18nCode = '';
  if (languageMode === 'bilingual' && i18nJs) {
    // Parse JSON files to ensure they're valid objects
    let enTranslations = {};
    let arTranslations = {};
    try {
      enTranslations = JSON.parse(enJson);
    } catch {
      enTranslations = {};
    }
    try {
      arTranslations = JSON.parse(arJson);
    } catch {
      arTranslations = {};
    }
    
    // Generate our own reliable i18n implementation instead of using AI-generated code
    // This ensures it always works correctly
    i18nCode = `
    // i18n setup - reliable implementation
    const translations = {
      en: ${JSON.stringify(enTranslations)},
      ar: ${JSON.stringify(arTranslations)}
    };
    
    const LanguageContext = React.createContext();
    
    function useLanguage() {
      const context = React.useContext(LanguageContext);
      if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
      }
      return context;
    }
    
    function LanguageProvider({ children }) {
      const [language, setLanguage] = React.useState('en');
      
      const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'ar' : 'en');
      };
      
      const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
          value = value?.[k];
        }
        return value || key;
      };
      
      React.useEffect(() => {
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', language);
      }, [language]);
      
      return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
          {children}
        </LanguageContext.Provider>
      );
    }
    `;
  }

  // Clean App.jsx - remove imports, keep component logic
  let cleanedAppJsx = appJsx
    .replace(/^import\s+.*$/gm, '')
    .trim();
  
  // Remove ALL export statements (default and named)
  cleanedAppJsx = cleanedAppJsx.replace(/export\s+default\s+function\s+/g, 'function ');
  cleanedAppJsx = cleanedAppJsx.replace(/export\s+default\s+const\s+/g, 'const ');
  cleanedAppJsx = cleanedAppJsx.replace(/export\s+default\s+/g, '');
  cleanedAppJsx = cleanedAppJsx.replace(/^export\s+default\s+/gm, '');
  cleanedAppJsx = cleanedAppJsx.replace(/^export\s+/gm, '');
  cleanedAppJsx = cleanedAppJsx.replace(/\bexport\s+default\s+/g, '');
  
  // Check if it's a function declaration
  const hasFunction = cleanedAppJsx.includes('function App') || 
                     (cleanedAppJsx.includes('const App') && cleanedAppJsx.includes('='));
  
  // If it starts with 'return' or JSX, wrap it in a function
  if (!hasFunction) {
    if (cleanedAppJsx.trim().startsWith('return') || 
        cleanedAppJsx.trim().startsWith('(') || 
        cleanedAppJsx.trim().startsWith('<')) {
      let returnValue = cleanedAppJsx;
      if (returnValue.trim().startsWith('return')) {
        returnValue = returnValue.replace(/^return\s+/, '').trim();
        if (returnValue.endsWith(';')) {
          returnValue = returnValue.slice(0, -1).trim();
        }
      }
      cleanedAppJsx = `function App() {\n  return (\n    ${returnValue}\n  );\n}`;
    } else if (!cleanedAppJsx.includes('function') && !cleanedAppJsx.includes('const')) {
      // Fallback: create a basic App function
      cleanedAppJsx = `function App() {\n  return (\n    <div>App Component</div>\n  );\n}`;
    }
  }

  // Clean main.jsx - convert to browser-compatible code
  let cleanedMainJsx = mainJsx
    .replace(/^import\s+.*$/gm, '')
    .trim();
  
  // Extract the render logic
  if (cleanedMainJsx.includes('ReactDOM.createRoot')) {
    // Keep the createRoot call but make it browser-compatible
    cleanedMainJsx = cleanedMainJsx
      .replace(/ReactDOM\.createRoot/, 'ReactDOM.createRoot')
      .replace(/\.render\(<App\s*\/>\)/, '.render(React.createElement(App))')
      .replace(/\.render\(<React\.StrictMode>/, '.render(React.createElement(React.StrictMode, null,')
      .replace(/<\/React\.StrictMode>\)/, 'React.createElement(App)))');
  } else {
    // Default render
    cleanedMainJsx = `
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(React.StrictMode, null, React.createElement(App)));
    `;
  }

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  ${fonts}
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    ${indexCss}
    html { scroll-behavior: smooth; }
    body { ${fontFamily} }
    * { font-family: inherit; }
  </style>
</head>
<body class="antialiased" style="${fontFamily}">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, createContext, useContext } = React;
    ${i18nCode}
    ${componentCode}
    ${cleanedAppJsx}
    
    // Initialize app
    (function() {
      ${cleanedMainJsx}
    })();
  </script>
  <script>
    // Smooth scroll navigation
    setTimeout(() => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          const href = this.getAttribute('href');
          if (href && href !== '#' && href !== '#!') {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
              const offset = 80;
              const elementPosition = targetElement.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - offset;
              window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
          }
        });
      });
    }, 1000);
  </script>
</body>
</html>`;
}

/**
 * Create a new build
 */
export async function createBuild(args: {
  projectId: string;
  prompt: string;
  files: ProjectFiles;
  summary?: string;
  languageMode?: string;
}): Promise<Build> {
  const { projectId, prompt, files, languageMode = 'english-only' } = args;

  // Get next version number
  const version = await getNextVersion(projectId);

  // Generate preview HTML from React project
  const previewHtml = generatePreviewHTML(files, languageMode);

  const { data, error } = await supabase
    .from('builds')
    .insert({
      project_id: projectId,
      version,
      prompt,
      files: files as unknown, // Store as JSONB
      preview_html: previewHtml,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating build:', error);
    throw new Error(`Failed to create build: ${error.message}`);
  }

  if (!data) {
    throw new Error('Build creation returned no data');
  }

  return data;
}

/**
 * Get all builds for a project
 */
export async function getBuildsByProject(projectId: string): Promise<Build[]> {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });

  if (error) {
    console.error('Error fetching builds:', error);
    throw new Error(`Failed to fetch builds: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a specific build by project ID and version
 */
export async function getBuildByVersion(
  projectId: string,
  version: number
): Promise<Build | null> {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('project_id', projectId)
    .eq('version', version)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching build:', error);
    throw new Error(`Failed to fetch build: ${error.message}`);
  }

  return data;
}

/**
 * Get the latest build for a project
 */
export async function getLatestBuild(projectId: string): Promise<Build | null> {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching latest build:', error);
    throw new Error(`Failed to fetch latest build: ${error.message}`);
  }

  return data;
}

/**
 * Delete a build
 */
export async function deleteBuild(buildId: string): Promise<void> {
  const { error } = await supabase
    .from('builds')
    .delete()
    .eq('id', buildId);

  if (error) {
    console.error('Error deleting build:', error);
    throw new Error(`Failed to delete build: ${error.message}`);
  }
}
