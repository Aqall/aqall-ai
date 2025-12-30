/**
 * Planner Agent - Analyzes user prompt and creates a generation plan
 * 
 * Detects:
 * - Industry type (restaurant, portfolio, clinic, SaaS, etc.)
 * - Required sections
 * - Optional sections
 * - Language requirements (Arabic, English, bilingual) with automatic detection
 * - Suggested folder/file structure
 * - Required libraries
 */

import OpenAI from 'openai';

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

export interface GenerationPlan {
  industry: string;
  requiredSections: string[];
  optionalSections: string[];
  languageMode: 'ARABIC_ONLY' | 'ENGLISH_ONLY' | 'BILINGUAL';
  folderStructure: string[];
  requiredLibraries: string[];
  suggestedComponents: string[];
  projectName: string;
}

/**
 * Detect if text contains Arabic characters
 */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Count Arabic vs English characters in text
 */
function analyzeLanguageContent(text: string): {
  arabicCount: number;
  englishCount: number;
  totalChars: number;
} {
  const arabicRegex = /[\u0600-\u06FF]/g;
  const englishRegex = /[a-zA-Z]/g;
  
  const arabicMatches = text.match(arabicRegex);
  const englishMatches = text.match(englishRegex);
  
  return {
    arabicCount: arabicMatches ? arabicMatches.length : 0,
    englishCount: englishMatches ? englishMatches.length : 0,
    totalChars: text.length,
  };
}

/**
 * Language mode detection - ALWAYS returns BILINGUAL
 * All websites now support both English and Arabic with language toggle
 */
function detectLanguageMode(prompt: string): 'ARABIC_ONLY' | 'ENGLISH_ONLY' | 'BILINGUAL' {
  // Force all websites to be bilingual (always include language toggle)
  // Users can toggle between English and Arabic in the navbar
  return 'BILINGUAL';
  }

/**
 * Planner Agent - Analyzes prompt and creates generation plan
 */
export async function planGeneration(prompt: string): Promise<GenerationPlan> {
  const openai = getOpenAIClient();
  
  // Detect language mode first
  const languageMode = detectLanguageMode(prompt);
  
  // Use AI to analyze the prompt and create a detailed plan
  const systemPrompt = `You are the Planner Agent for Aqall. Your responsibility is to analyze the user's prompt and produce a COMPLETE structured plan describing what the project should contain.

You must behave EXACTLY like Lovable's planner system.

Follow these rules strictly:

========================================================
= 1. UNDERSTAND THE USER PROMPT WITH ZERO AMBIGUITY    =
========================================================

Extract:
- User intent
- Project type
- Industry (restaurant, portfolio, agency, clinic, SaaS, e-commerce, corporate, personal brand, landing page…)
- Target audience
- Required sections (explicit)
- Optional inferred sections (only when the prompt is generic)
- Any specific functional requirements
- Visual tone (modern, minimal, luxury, playful…)
- Color preferences if specified
- Language requirements

If user explicitly lists sections → ONLY use those.  
If user gives a generic prompt → infer defaults.

========================================================
= 2. LANGUAGE DETECTION RULES                          =
========================================================

Language mode must be one of:  
- ARABIC_ONLY  
- ENGLISH_ONLY  
- BILINGUAL  

Priority:
1. If user explicitly states a language → obey.
2. Otherwise detect automatically:
   - Mostly Arabic characters → ARABIC_ONLY
   - Mostly English characters → ENGLISH_ONLY
   - Mixed Arabic + English → BILINGUAL

Language mode detected: ${languageMode} (use this value in your response)

========================================================
= 3. SECTION DECISION LOGIC                            =
========================================================

STRICT RULES:

If user explicitly lists sections:
  → ONLY include those. No extras.

If prompt is generic:
  → Use Lovable defaults:
     - Navbar
     - Hero
     - About
     - Features/Services
     - Contact
     - Footer

Industry inference:
- Restaurant → Add Menu, Gallery, Contact/Location
- Agency → Services, Pricing, Portfolio
- Portfolio → Projects, Skills, Testimonials
- SaaS → Features, Pricing, Integrations, CTA
- Clinic → Services, Doctors, Booking
- E-commerce → Featured Products, Categories, CTA

If industry-specific sections conflict with explicit user instructions:
  → EXPLICIT REQUESTS WIN.

========================================================
= 4. OUTPUT FILE STRUCTURE PLAN                        =
========================================================

Produce a clean object describing:
- Which components will be generated
- Which config files are required
- Which translation files (if bilingual)
- Which assets (images, icons)
- Folder structure

Example:
{
  "industry": "restaurant",
  "languageMode": "BILINGUAL",
  "sections": ["Navbar", "Hero", "Menu", "Gallery", "Contact", "Footer"],
  "files": [
      "src/components/Navbar.jsx",
      "src/components/Hero.jsx",
      "src/components/Menu.jsx",
      "src/components/Gallery.jsx",
      "src/components/Contact.jsx",
      "src/components/Footer.jsx",
      "src/App.jsx",
      "src/main.jsx",
      "tailwind.config.js",
      ...
  ]
}

========================================================
= 5. EDGE CASE HANDLING                                =
========================================================

Handle tricky situations:
- User provides Arabic content inside an English request → classify as bilingual.
- User writes: "make it simple" → reduce sections.
- User says: "no footer" → remove footer.
- User says: "only hero" → output ONLY Hero component.
- User requests a component name not in defaults → include it.
- User prompt is extremely short ("make a site") → generate defaults.

========================================================
= 6. FINAL OUTPUT FORMAT                               =
========================================================

Always output a clean JSON object:
{
  "languageMode": "${languageMode}",
  "industry": "...",
  "requiredSections": [...],
  "optionalSections": [...],
  "folderStructure": [...],
  "requiredLibraries": [...],
  "suggestedComponents": [...],
  "projectName": "...",
  "notes": "Any clarifying notes here"
}

NO code. NO JSX. Only the planning JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Planner returned empty response');
    }

    const plan = JSON.parse(responseContent) as GenerationPlan;
    
    // Override language mode with our detection (ensures consistency)
    plan.languageMode = languageMode;
    
    // Ensure requiredSections and optionalSections are arrays (safety check)
    if (!Array.isArray(plan.requiredSections)) {
      plan.requiredSections = [];
    }
    if (!Array.isArray(plan.optionalSections)) {
      plan.optionalSections = [];
    }
    
    // Normalize all sections to lowercase and remove duplicates FIRST
    plan.requiredSections = Array.from(new Set(plan.requiredSections.map(s => String(s).toLowerCase().trim())));
    plan.optionalSections = Array.from(new Set(plan.optionalSections.map(s => String(s).toLowerCase().trim())));
    
    // Helper function for case-insensitive includes check
    const hasSection = (sections: string[], section: string): boolean => {
      return sections.some(s => s.toLowerCase() === section.toLowerCase());
    };
    
    // Ensure required sections are always included (case-insensitive check)
    if (!hasSection(plan.requiredSections, 'navbar')) {
      plan.requiredSections.unshift('navbar');
    }
    if (!hasSection(plan.requiredSections, 'hero')) {
      plan.requiredSections.push('hero');
    }
    if (!hasSection(plan.requiredSections, 'contact')) {
      plan.requiredSections.push('contact');
    }
    if (!hasSection(plan.requiredSections, 'footer')) {
      plan.requiredSections.push('footer');
    }
    
    // Auto-add industry-specific sections to requiredSections (using case-insensitive check)
    const industry = plan.industry.toLowerCase();
    if (industry === 'restaurant' || industry.includes('cafe') || industry.includes('coffee')) {
      // Restaurant/cafe specific sections
      if (!hasSection(plan.requiredSections, 'menu') && !hasSection(plan.optionalSections, 'menu')) {
        plan.requiredSections.push('menu');
      }
      if (!hasSection(plan.requiredSections, 'gallery') && !hasSection(plan.optionalSections, 'gallery')) {
        plan.requiredSections.push('gallery');
      }
      if (!hasSection(plan.requiredSections, 'testimonials') && !hasSection(plan.optionalSections, 'testimonials')) {
        plan.requiredSections.push('testimonials');
      }
      if (!hasSection(plan.requiredSections, 'about') && !hasSection(plan.optionalSections, 'about')) {
        plan.requiredSections.push('about');
      }
    } else if (industry === 'portfolio') {
      // Portfolio specific sections
      if (!hasSection(plan.requiredSections, 'gallery') && !hasSection(plan.optionalSections, 'gallery')) {
        plan.requiredSections.push('gallery');
      }
      if (!hasSection(plan.requiredSections, 'projects') && !hasSection(plan.optionalSections, 'projects')) {
        plan.requiredSections.push('projects');
      }
      if (!hasSection(plan.requiredSections, 'skills') && !hasSection(plan.optionalSections, 'skills')) {
        plan.requiredSections.push('skills');
      }
      if (!hasSection(plan.requiredSections, 'about') && !hasSection(plan.optionalSections, 'about')) {
        plan.requiredSections.push('about');
      }
    } else if (industry === 'clinic' || industry.includes('medical')) {
      // Medical/clinic specific sections
      if (!hasSection(plan.requiredSections, 'services') && !hasSection(plan.optionalSections, 'services')) {
        plan.requiredSections.push('services');
      }
      if (!hasSection(plan.requiredSections, 'appointment') && !hasSection(plan.optionalSections, 'appointment')) {
        plan.requiredSections.push('appointment');
      }
      if (!hasSection(plan.requiredSections, 'about') && !hasSection(plan.optionalSections, 'about')) {
        plan.requiredSections.push('about');
      }
    } else if (industry === 'agency') {
      // Agency specific sections
      if (!hasSection(plan.requiredSections, 'services') && !hasSection(plan.optionalSections, 'services')) {
        plan.requiredSections.push('services');
      }
      if (!hasSection(plan.requiredSections, 'pricing') && !hasSection(plan.optionalSections, 'pricing')) {
        plan.requiredSections.push('pricing');
      }
      if (!hasSection(plan.requiredSections, 'portfolio') && !hasSection(plan.optionalSections, 'portfolio')) {
        plan.requiredSections.push('portfolio');
      }
      if (!hasSection(plan.requiredSections, 'about') && !hasSection(plan.optionalSections, 'about')) {
        plan.requiredSections.push('about');
      }
    } else {
      // Default: add about and features for generic websites
      if (!hasSection(plan.requiredSections, 'about') && !hasSection(plan.optionalSections, 'about')) {
        plan.requiredSections.push('about');
      }
      if (!hasSection(plan.requiredSections, 'features') && !hasSection(plan.optionalSections, 'features')) {
        plan.requiredSections.push('features');
      }
    }
    
    // Final deduplication - remove duplicates (normalize to lowercase)
    plan.requiredSections = Array.from(new Set(plan.requiredSections.map(s => String(s).toLowerCase().trim())));
    plan.optionalSections = Array.from(new Set(plan.optionalSections.map(s => String(s).toLowerCase().trim())));
    
    return plan;
  } catch (error) {
    console.error('Planner error:', error);
    // Fallback to basic plan
    return {
      industry: 'other',
      requiredSections: ['navbar', 'hero', 'about', 'contact', 'footer'],
      optionalSections: [],
      languageMode,
      folderStructure: ['src/components', 'src/locales', 'public'],
      requiredLibraries: ['react', 'react-dom', 'vite'],
      suggestedComponents: ['Navbar', 'Hero', 'About', 'Contact', 'Footer'],
      projectName: 'My Project',
    };
  }
}
