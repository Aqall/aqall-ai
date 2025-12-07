/**
 * AI Orchestrator - OpenAI integration for full Vite + React + Tailwind project generation
 * 
 * Generates complete project structures with conditional sections and bilingual support
 */

import OpenAI from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProjectFiles {
  [filePath: string]: string;
}

export interface GenerateSiteResult {
  files: ProjectFiles;
  summary: string;
  languageMode: 'arabic-only' | 'english-only' | 'bilingual';
  sections: string[];
}

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

/**
 * Detect if text contains Arabic characters
 */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Analyze prompt to determine language requirements
 */
function detectLanguageMode(message: string): 'arabic-only' | 'english-only' | 'bilingual' {
  const lowerMessage = message.toLowerCase();
  const hasArabic = isArabic(message);
  const hasEnglish = /[a-zA-Z]/.test(message);
  
  // Explicit bilingual requests
  if (lowerMessage.includes('bilingual') || 
      lowerMessage.includes('both languages') ||
      lowerMessage.includes('english and arabic') ||
      lowerMessage.includes('عربي وإنجليزي') ||
      (hasArabic && hasEnglish && message.length > 20)) {
    return 'bilingual';
  }
  
  // Explicit Arabic-only
  if (lowerMessage.includes('arabic only') || 
      lowerMessage.includes('عربي فقط') ||
      (hasArabic && !hasEnglish)) {
    return 'arabic-only';
  }
  
  // Explicit English-only
  if (lowerMessage.includes('english only') || 
      lowerMessage.includes('إنجليزي فقط') ||
      (!hasArabic && hasEnglish)) {
    return 'english-only';
  }
  
  // Default: bilingual if Arabic present, otherwise English-only
  return hasArabic ? 'bilingual' : 'english-only';
}

/**
 * Extract requested sections from prompt
 */
function extractRequestedSections(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const sections: string[] = [];
  
  // Common section keywords
  const sectionKeywords: Record<string, string[]> = {
    'navbar': ['navbar', 'nav', 'navigation', 'menu', 'شريط التنقل'],
    'hero': ['hero', 'header', 'banner', 'intro', 'hero section', 'قسم البطل'],
    'about': ['about', 'about us', 'من نحن'],
    'features': ['features', 'feature', 'services', 'what we offer', 'مميزات', 'خدمات'],
    'gallery': ['gallery', 'portfolio', 'works', 'images', 'photos', 'pictures', 'معرض', 'أعمال', 'صور'],
    'testimonials': ['testimonials', 'reviews', 'clients', 'testimonial', 'customer', 'شهادات', 'عملاء'],
    'menu': ['menu', 'food menu', 'products', 'items', 'قائمة', 'قائمة الطعام', 'منتجات'],
    'booking': ['booking', 'reservation', 'book', 'appointment', 'حجز', 'حجوزات', 'موعد'],
    'contact': ['contact', 'contact us', 'get in touch', 'اتصل بنا'],
    'footer': ['footer', 'bottom', 'تذييل'],
  };
  
  // Business type detection - add relevant sections automatically
  const businessTypes: Record<string, string[]> = {
    'restaurant': ['menu', 'gallery', 'testimonials', 'booking', 'about'],
    'cafe': ['menu', 'gallery', 'testimonials', 'about'],
    'coffee': ['menu', 'gallery', 'testimonials', 'about'],
    'coffee shop': ['menu', 'gallery', 'testimonials', 'about'],
    'bakery': ['menu', 'gallery', 'testimonials', 'about'],
    'hotel': ['features', 'gallery', 'testimonials', 'booking', 'about'],
    'spa': ['features', 'gallery', 'testimonials', 'booking', 'about'],
    'salon': ['features', 'gallery', 'testimonials', 'booking', 'about'],
    'gym': ['features', 'gallery', 'testimonials', 'booking', 'about'],
    'fitness': ['features', 'gallery', 'testimonials', 'booking', 'about'],
    'portfolio': ['gallery', 'about', 'testimonials'],
    'business': ['features', 'about', 'testimonials', 'gallery'],
    'company': ['features', 'about', 'testimonials', 'gallery'],
    'agency': ['features', 'gallery', 'testimonials', 'about'],
  };
  
  // Detect business type and add relevant sections
  let detectedBusinessType = '';
  for (const [type, defaultSections] of Object.entries(businessTypes)) {
    if (lowerMessage.includes(type)) {
      detectedBusinessType = type;
      // Add business-specific sections if not explicitly excluded
      for (const section of defaultSections) {
        if (!sections.includes(section) && 
            !lowerMessage.includes(`no ${section}`) && 
            !lowerMessage.includes(`without ${section}`)) {
          sections.push(section);
        }
      }
      break;
    }
  }
  
  // Check for explicit section mentions
  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      if (!sections.includes(section)) {
        sections.push(section);
      }
    }
  }
  
  // Check for "no footer" or "without footer"
  if (lowerMessage.includes('no footer') || 
      lowerMessage.includes('without footer') ||
      lowerMessage.includes('بدون تذييل')) {
    const footerIndex = sections.indexOf('footer');
    if (footerIndex > -1) {
      sections.splice(footerIndex, 1);
    }
  }
  
  // If no specific sections found, return comprehensive default set
  if (sections.length === 0) {
    return ['navbar', 'hero', 'about', 'features', 'gallery', 'testimonials', 'contact', 'footer'];
  }
  
  // Always include essential sections for a complete website
  const essentialSections = ['hero', 'contact', 'footer'];
  for (const essential of essentialSections) {
    if (!sections.includes(essential) && 
        !lowerMessage.includes(`no ${essential}`) && 
        !lowerMessage.includes(`without ${essential}`)) {
      sections.push(essential);
    }
  }
  
  // Always include navbar unless explicitly excluded
  if (!sections.includes('navbar') && 
      !lowerMessage.includes('no navbar') && 
      !lowerMessage.includes('without navbar')) {
    sections.unshift('navbar');
  }
  
  // Remove duplicates and return
  return Array.from(new Set(sections));
}

/**
 * Build system prompt for full project generation
 */
function buildSystemPrompt(
  message: string,
  languageMode: 'arabic-only' | 'english-only' | 'bilingual',
  sections: string[]
): string {
  const isArabicMode = languageMode === 'arabic-only';
  const isBilingual = languageMode === 'bilingual';
  const direction = isArabicMode ? 'RTL' : 'LTR';
  
  const sectionsList = sections.join(', ');
  const noFooter = !sections.includes('footer');
  const noNavbar = !sections.includes('navbar');
  
  return `You are an elite web developer creating world-class, premium Vite + React + Tailwind CSS projects. Your code is production-ready and follows best practices.

**CRITICAL REQUIREMENTS:**

1. **Generate a COMPLETE Vite + React + Tailwind CSS project structure**
2. **Generate ONLY the sections explicitly requested: ${sectionsList}**
3. **Language Mode: ${languageMode.toUpperCase()}**
   ${isBilingual ? '- Generate bilingual i18n system with en.json and ar.json' : ''}
   ${isArabicMode ? '- Generate ONLY Arabic text, RTL layout' : ''}
   ${languageMode === 'english-only' ? '- Generate ONLY English text, LTR layout' : ''}

**PROJECT STRUCTURE TO GENERATE:**

You MUST generate these files with their complete content:

1. **package.json** - Vite + React dependencies
2. **vite.config.js** - Vite configuration
3. **tailwind.config.js** - Tailwind configuration
4. **postcss.config.js** - PostCSS configuration
5. **index.html** - HTML entry point
6. **src/main.jsx** - React entry point
7. **src/App.jsx** - Main App component
8. **src/index.css** - Tailwind imports and global styles

${isBilingual ? `9. **src/i18n.js** - i18n configuration
   - MUST be a complete function declaration: export default function LanguageProvider({ children }) { ... }
   - DO NOT just return JSX without a function wrapper
   - Must include: createContext, useState, useEffect for language state
   - Must return LanguageContext.Provider with value prop
10. **src/locales/en.json** - English translations
11. **src/locales/ar.json** - Arabic translations` : ''}

**COMPONENTS TO GENERATE (ONLY requested sections):**

${sections.map(section => `- src/components/${section.charAt(0).toUpperCase() + section.slice(1)}.jsx`).join('\n')}

**RULES:**

1. **Sections**: Generate ONLY these sections: ${sectionsList}
   ${noFooter ? '- DO NOT generate Footer component' : ''}
   ${noNavbar ? '- DO NOT generate Navbar component' : ''}

2. **Language Handling**:
   ${isBilingual ? `- All text must come from translation files (en.json, ar.json)
   - Include language toggle in Navbar
   - Use i18n hook: const { t, language } = useLanguage()
   - Set dir={language === 'ar' ? 'rtl' : 'ltr'} on html element` : ''}
   ${isArabicMode ? `- All text hardcoded in Arabic
   - Set dir="rtl" on html element
   - Use Arabic fonts (Cairo)` : ''}
   ${languageMode === 'english-only' ? `- All text hardcoded in English
   - Set dir="ltr" on html element
   - Use English fonts (Inter, Poppins)` : ''}

3. **Component Structure**:
   - Each component is a React functional component
   - Use Tailwind CSS for ALL styling
   - Use modern React patterns (hooks, functional components)
   - Export as default: export default function ComponentName()
   - CRITICAL: All components MUST be complete function declarations, NOT just return statements
   - Example: export default function MyComponent() { return (...); }
   - NOT: return (...); (this will cause errors)

4. **Images**:
   - DO NOT use undefined variables for images (e.g., src={profilePic} where profilePic is not defined)
   - Use placeholder images: src="https://via.placeholder.com/400x300?text=Image"
   - Or use inline data URLs if needed
   - If you must use variables, define them: const imageUrl = "https://via.placeholder.com/400x300"
   - NEVER reference image variables that don't exist

4. **App.jsx**:
   - Import ONLY the components that exist (${sectionsList})
   - Render them in logical order
   - ${isBilingual ? 'Wrap with LanguageProvider' : ''}

5. **Styling**:
   - Use professional color palette (choose one):
     * Purple/Indigo: indigo-600, purple-600, pink-500
     * Blue/Cyan: blue-600, cyan-500, teal-500
     * Emerald/Teal: emerald-600, teal-500, cyan-400
   - Use glassmorphism, gradients, shadows
   - Make it EXTREMELY professional and modern

6. **Navigation**:
   ${sections.includes('navbar') 
     ? '- Navbar must have smooth scroll links to sections\n   - Use anchor tags: <a href="#section-id">\n   - Sections must have matching id attributes' 
     : '- No navbar needed'}

**OUTPUT FORMAT:**

You MUST return a valid JSON object. The OpenAI API will handle JSON encoding automatically since we're using response_format: json_object.

Return this structure:

{
  "files": {
    "package.json": "FULL FILE CONTENT AS STRING",
    "vite.config.js": "FULL FILE CONTENT AS STRING",
    "tailwind.config.js": "FULL FILE CONTENT AS STRING",
    "postcss.config.js": "FULL FILE CONTENT AS STRING",
    "index.html": "FULL FILE CONTENT AS STRING",
    "src/main.jsx": "FULL FILE CONTENT AS STRING",
    "src/App.jsx": "FULL FILE CONTENT AS STRING",
    "src/index.css": "FULL FILE CONTENT AS STRING",
    ${isBilingual ? `"src/i18n.js": "FULL FILE CONTENT AS STRING",
    "src/locales/en.json": "FULL JSON CONTENT AS STRING",
    "src/locales/ar.json": "FULL JSON CONTENT AS STRING",` : ''}
    ${sections.map(s => {
      const compName = s.charAt(0).toUpperCase() + s.slice(1);
      return `"src/components/${compName}.jsx": "FULL COMPONENT CODE AS STRING"`;
    }).join(',\n    ')}
  },
  "summary": "Brief description of generated project",
  "languageMode": "${languageMode}",
  "sections": ${JSON.stringify(sections)}
}

**FILE CONTENT REQUIREMENTS:**

Each file content string must be:
- Complete and production-ready
- Properly formatted (indentation, etc.)
- Include all necessary code
- For JSON files (package.json, locale files): valid JSON strings
- For JS/JSX files: valid JavaScript/JSX code
- For CSS files: valid CSS

**EXAMPLE FILE STRUCTURE:**

package.json should contain:
{
  "name": "project-name",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.17",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.4.47"
  }
}

Each component file should be a complete React functional component with Tailwind styling.

**CRITICAL JSON REQUIREMENTS:**
- Return ONLY valid JSON (no markdown, no code blocks, no extra text)
- ALL strings in JSON must be properly escaped:
  * Use \\" for quotes inside strings
  * Use \\n for newlines inside strings
  * Use \\\\ for backslashes
- File content strings must be valid JSON strings (properly escaped)
- Do NOT truncate the JSON - include ALL files completely
- If content is too long, ensure JSON syntax remains valid

**IMPORTANT:**
- Return ONLY valid JSON
- No markdown code blocks
- All file contents must be complete and production-ready
- Components must be functional React components
- Use Tailwind CSS utility classes exclusively
- Make it EXTREMELY professional and modern
- Ensure ALL quotes, newlines, and special characters in file content are properly escaped for JSON

Return the JSON object now.`;
}

/**
 * Generate full Vite + React project from user prompt
 */
export async function generateSiteFromPrompt(args: {
  projectId: string;
  message: string;
  history?: ChatMessage[];
}): Promise<GenerateSiteResult> {
  const { message, history = [] } = args;
  
  // Analyze prompt
  const languageMode = detectLanguageMode(message);
  const sections = extractRequestedSections(message);
  
  const openai = getOpenAIClient();
  
  // Build conversation messages
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: buildSystemPrompt(message, languageMode, sections),
    },
    // Include history if provided
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    // Add current user message
    {
      role: 'user',
      content: message,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages,
      temperature: 0.7,
      max_tokens: 16000, // Increased significantly for full project structure with all sections
      response_format: { type: 'json_object' }, // Force JSON output
    });

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('OpenAI returned empty response');
    }

    // Parse JSON response with robust error handling
    let parsed: GenerateSiteResult;
    try {
      parsed = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Initial JSON parse failed, attempting fixes...', parseError);
      
      // Try to extract JSON from markdown code blocks if present
      let jsonContent = responseContent.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Try to fix common JSON issues
      try {
        parsed = JSON.parse(jsonContent);
      } catch (secondError) {
        // Try to find and extract the JSON object from the response
        // Look for the first { and try to find matching }
        const firstBrace = jsonContent.indexOf('{');
        if (firstBrace !== -1) {
          // Try to find the matching closing brace
          let braceCount = 0;
          let lastBrace = -1;
          for (let i = firstBrace; i < jsonContent.length; i++) {
            if (jsonContent[i] === '{') braceCount++;
            if (jsonContent[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                lastBrace = i;
                break;
              }
            }
          }
          
          if (lastBrace !== -1) {
            const extractedJson = jsonContent.substring(firstBrace, lastBrace + 1);
            try {
              parsed = JSON.parse(extractedJson);
            } catch (thirdError) {
              console.error('Failed to parse extracted JSON:', thirdError);
              console.error('JSON content length:', jsonContent.length);
              console.error('Error position:', (thirdError as Error).message);
              throw new Error(`Failed to parse JSON response: ${(thirdError as Error).message}. Response length: ${responseContent.length}, Position: ${(thirdError as Error).message.match(/position (\d+)/)?.[1] || 'unknown'}`);
            }
          } else {
            throw new Error(`Failed to parse JSON: Unterminated JSON object. Response length: ${responseContent.length}`);
          }
        } else {
          throw new Error(`Failed to parse JSON: No JSON object found in response. Response length: ${responseContent.length}`);
        }
      }
    }

    // Validate structure
    if (!parsed.files || typeof parsed.files !== 'object') {
      throw new Error('Invalid response structure: missing files object');
    }

    // Ensure required files exist
    const requiredFiles = [
      'package.json',
      'vite.config.js',
      'tailwind.config.js',
      'postcss.config.js',
      'index.html',
      'src/main.jsx',
      'src/App.jsx',
      'src/index.css',
    ];

    for (const file of requiredFiles) {
      if (!parsed.files[file]) {
        throw new Error(`Missing required file: ${file}`);
      }
    }

    // Generate summary if not provided
    if (!parsed.summary) {
      parsed.summary = languageMode === 'arabic-only'
        ? `تم إنشاء موقع ${sections.join(' و ')}`
        : `Generated website with ${sections.join(', ')} sections`;
    }

    return {
      files: parsed.files,
      summary: parsed.summary,
      languageMode: parsed.languageMode || languageMode,
      sections: parsed.sections || sections,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    
    throw new Error(`Failed to generate website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
