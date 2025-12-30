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
  
  // Validate essential files exist
  if (!appJsx || appJsx.trim().length === 0) {
    console.warn('Warning: App.jsx is empty or missing - will use fallback');
  }
  
  // Get all component files
  const components: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (path.startsWith('src/components/') && path.endsWith('.jsx')) {
      // Extract component name from path
      // File path: "src/components/HistoryTimeline.jsx" -> componentName: "HistoryTimeline"
      let componentName = path.replace('src/components/', '').replace('.jsx', '');
      
      // Remove invalid characters (parentheses, brackets, etc.) that can't be in JavaScript identifiers
      componentName = componentName.replace(/[^a-zA-Z0-9\/\\\-_]/g, '');
      
      // Only sanitize if there are path separators (slashes, dashes, underscores)
      // e.g., "Features/services" -> "FeaturesServices"
      // But preserve normal component names like "HistoryTimeline" as-is
      if (/[\/\\\-_]/.test(componentName)) {
        // Has separators - split and convert each part to PascalCase
        componentName = componentName
          .split(/[\/\\\-_]+/)
          .filter(part => part.length > 0) // Remove empty strings
          .map(part => {
            // Capitalize first letter, preserve rest (don't force lowercase)
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          .join('');
      } else {
        // No separators - preserve the name as-is (already PascalCase)
        // Just ensure it starts with uppercase letter
        if (componentName.length > 0 && componentName[0] !== componentName[0].toUpperCase()) {
          componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
        }
      }
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
    
    // Ensure component name matches the expected format (name is already sanitized)
    // Use the sanitized name directly (it's already PascalCase)
    const componentName = name; // name is already sanitized to PascalCase
    
    // Fix invalid component names in the code FIRST (e.g., "Features/services" -> "FeaturesServices")
    // Match patterns like: const Features/services =, function Features/services(, etc.
    cleaned = cleaned.replace(/const\s+([\w\/\-_]+)\s*=\s*\([^)]*\)\s*=>/g, (match, varName) => {
      // If the variable name contains invalid characters, replace with sanitized component name
      if (/[\/\\\-_]/.test(varName)) {
        return match.replace(varName, componentName);
      }
      return match;
    });
    cleaned = cleaned.replace(/const\s+([\w\/\-_]+)\s*=\s*\(\)\s*=>/g, (match, varName) => {
      if (/[\/\\\-_]/.test(varName)) {
        return match.replace(varName, componentName);
      }
      return match;
    });
    cleaned = cleaned.replace(/function\s+([\w\/\-_]+)\s*\(/g, (match, funcName) => {
      if (/[\/\\\-_]/.test(funcName)) {
        return match.replace(funcName, componentName);
      }
      return match;
    });
    
    // Check if it's already a function (arrow function or function declaration)
    // Do this AFTER fixing invalid names so we can detect functions correctly
    const hasArrowFunction = /const\s+\w+\s*=\s*\([^)]*\)\s*=>/.test(cleaned) || 
                            /const\s+\w+\s*=\s*\(\)\s*=>/.test(cleaned);
    const hasFunctionDeclaration = /function\s+\w+\s*\(/.test(cleaned);
    const isFunction = hasArrowFunction || hasFunctionDeclaration;
    
    // If it's already a valid function (arrow or declaration), ensure name matches
    if (isFunction) {
      // Ensure the component name matches (fix if needed)
      if (hasArrowFunction) {
        // Fix arrow function name to use sanitized component name
        cleaned = cleaned.replace(/const\s+[\w\/\-_]+\s*=\s*\([^)]*\)\s*=>/, `const ${componentName} = () =>`);
        cleaned = cleaned.replace(/const\s+[\w\/\-_]+\s*=\s*\(\)\s*=>/, `const ${componentName} = () =>`);
      } else if (hasFunctionDeclaration) {
        // Fix function declaration name to use sanitized component name
        cleaned = cleaned.replace(/function\s+[\w\/\-_]+\s*\(/, `function ${componentName}(`);
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
        cleaned = `const ${componentName} = () => {\n  return (\n    ${returnValue}\n  );\n};`;
      } else if (!isFunction) {
        // If it doesn't look like a function, create a basic one
        cleaned = `const ${componentName} = () => {\n  return (\n    <div>Component ${componentName}</div>\n  );\n};`;
      }
    }
    
    // Ensure component ends with semicolon if it's an arrow function
    if (cleaned.includes('const ') && cleaned.includes('=>') && !cleaned.trim().endsWith(';')) {
      cleaned = cleaned.trim() + ';';
    }
    
    // Remove any trailing standalone component name expressions (e.g., "ComponentName;")
    // These are often left over from export statements
    cleaned = cleaned.replace(/^\s*[A-Z][a-zA-Z0-9]*\s*;?\s*$/gm, '');
    
    componentCode += `\n    // ${name} component\n    ${cleaned}\n`;
  }
  
  // Remove any standalone component name expressions from componentCode
  componentCode = componentCode.replace(/^\s*[A-Z][a-zA-Z0-9]*\s*;?\s*$/gm, '');

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
  
  // Remove any trailing standalone expressions like "App;" that might be leftover
  cleanedAppJsx = cleanedAppJsx.replace(/^\s*App\s*;?\s*$/gm, '');
  
  // Check if it's a function declaration
  const hasFunction = cleanedAppJsx.includes('function App') || 
                     (cleanedAppJsx.includes('const App') && cleanedAppJsx.includes('='));
  
  // If it starts with 'return' or JSX, wrap it in a function
  if (!hasFunction) {
    if (cleanedAppJsx.trim().length === 0) {
      // Empty App.jsx - create a basic fallback
      cleanedAppJsx = `function App() {\n  return (\n    <div style="padding: 2rem; text-align: center;"><h1>Welcome</h1><p>App component is being initialized...</p></div>\n  );\n}`;
    } else if (cleanedAppJsx.trim().startsWith('return') || 
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
      cleanedAppJsx = `function App() {\n  return (\n    <div style="padding: 2rem; text-align: center;"><h1>App Component</h1><p>Content is loading...</p></div>\n  );\n}`;
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
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
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
    #error-display {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #fee2e2;
      color: #991b1b;
      padding: 1rem;
      border-bottom: 2px solid #dc2626;
      z-index: 9999;
      font-family: monospace;
      font-size: 0.875rem;
      max-height: 50vh;
      overflow-y: auto;
    }
    #error-display.show {
      display: block;
    }
    #error-close {
      float: right;
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.25rem 0.75rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }
    #error-close:hover {
      background: #b91c1c;
    }
  </style>
</head>
<body class="antialiased" style="${fontFamily}">
  <div id="error-display">
    <button id="error-close" onclick="document.getElementById('error-display').classList.remove('show')">✕</button>
    <div><strong>Error:</strong> <span id="error-message"></span></div>
    <details style="margin-top: 0.5rem;">
      <summary style="cursor: pointer;">Stack trace</summary>
      <pre id="error-stack" style="margin-top: 0.5rem; white-space: pre-wrap; word-wrap: break-word;"></pre>
    </details>
  </div>
  <div id="root"></div>
  <script>
    // Global error handler
    window.addEventListener('error', function(event) {
      console.error('Global error:', event.error);
      var errorDisplay = document.getElementById('error-display');
      var errorMessage = document.getElementById('error-message');
      var errorStack = document.getElementById('error-stack');
      
      if (errorDisplay && errorMessage) {
        var message = event.message || 'Unknown error';
        if (event.error && event.error.message) {
          message = event.error.message;
        }
        errorMessage.textContent = message;
        
        if (errorStack && event.error && event.error.stack) {
          errorStack.textContent = event.error.stack;
        } else if (errorStack) {
          errorStack.textContent = 'No stack trace available';
        }
        
        errorDisplay.classList.add('show');
      }
      
      // Prevent default error display
      event.preventDefault();
      return false;
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      console.error('Unhandled promise rejection:', event.reason);
      var errorDisplay = document.getElementById('error-display');
      var errorMessage = document.getElementById('error-message');
      var errorStack = document.getElementById('error-stack');
      
      if (errorDisplay && errorMessage) {
        var message = 'Unhandled promise rejection: ';
        if (event.reason instanceof Error) {
          message += event.reason.message;
        } else {
          message += String(event.reason);
        }
        errorMessage.textContent = message;
        
        if (errorStack && event.reason instanceof Error && event.reason.stack) {
          errorStack.textContent = event.reason.stack;
        } else if (errorStack) {
          errorStack.textContent = String(event.reason);
        }
        
        errorDisplay.classList.add('show');
      }
      
      event.preventDefault();
    });
  </script>
  <script type="text/babel">
    try {
      const { useState, useEffect, createContext, useContext } = React;
      ${i18nCode}
      ${componentCode}
      ${cleanedAppJsx}
      
      // Initialize app
      (function() {
        try {
          ${cleanedMainJsx}
        } catch (initError) {
          console.error('Error initializing app:', initError);
          var errorDisplay = document.getElementById('error-display');
          var errorMessage = document.getElementById('error-message');
          var errorStack = document.getElementById('error-stack');
          
          if (errorDisplay && errorMessage) {
            errorMessage.textContent = initError.message || 'Failed to initialize app';
            if (errorStack && initError.stack) {
              errorStack.textContent = initError.stack;
            }
            errorDisplay.classList.add('show');
          }
          
          // Render error component as fallback
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1 style="color: #dc2626;">Error Loading App</h1><p>' + (initError.message || 'Unknown error') + '</p></div>';
          }
          throw initError;
        }
      })();
    } catch (babelError) {
      console.error('Error in Babel script:', babelError);
      var errorDisplay = document.getElementById('error-display');
      var errorMessage = document.getElementById('error-message');
      var errorStack = document.getElementById('error-stack');
      
      if (errorDisplay && errorMessage) {
        errorMessage.textContent = babelError.message || 'Failed to compile/run code';
        if (errorStack && babelError.stack) {
          errorStack.textContent = babelError.stack;
        }
        errorDisplay.classList.add('show');
      }
      
      // Render error component as fallback
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = '<div style="padding: 2rem; text-align: center;"><h1 style="color: #dc2626;">Compilation Error</h1><p>' + (babelError.message || 'Unknown error') + '</p></div>';
      }
    }
  </script>
  <script>
    // Smooth scroll navigation with browser compatibility
    (function() {
      if (typeof document === 'undefined' || typeof window === 'undefined') return;
      
      setTimeout(function() {
        var anchors = document.querySelectorAll('a[href^="#"]');
        for (var i = 0; i < anchors.length; i++) {
          anchors[i].addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (href && href !== '#' && href !== '#!') {
              e.preventDefault();
              var targetId = href.substring(1);
              var targetElement = document.getElementById(targetId);
              if (targetElement) {
                var offset = 80;
                var elementPosition = targetElement.getBoundingClientRect().top;
                var offsetPosition = elementPosition + (window.pageYOffset || window.scrollY || 0) - offset;
                
                // Use smooth scroll with fallback
                if (window.scrollTo && typeof window.scrollTo === 'function') {
                  if ('scrollBehavior' in document.documentElement.style) {
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                  } else {
                    // Fallback for browsers without smooth scroll support
                    window.scrollTo(0, offsetPosition);
                  }
                }
              }
            }
          });
        }
      }, 1000);
    })();
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
