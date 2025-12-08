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
 * Automatic language detection from prompt
 * Priority: Explicit instructions > Automatic detection
 */
function detectLanguageMode(prompt: string): 'ARABIC_ONLY' | 'ENGLISH_ONLY' | 'BILINGUAL' {
  const lowerPrompt = prompt.toLowerCase();
  
  // 1. Check for explicit instructions (highest priority)
  if (lowerPrompt.includes('bilingual') || 
      lowerPrompt.includes('both languages') ||
      lowerPrompt.includes('english and arabic') ||
      lowerPrompt.includes('عربي وإنجليزي') ||
      lowerPrompt.includes('en + ar') ||
      lowerPrompt.includes('ar + en')) {
    return 'BILINGUAL';
  }
  
  if (lowerPrompt.includes('arabic only') || 
      lowerPrompt.includes('عربي فقط') ||
      lowerPrompt.includes('arabic-only') ||
      lowerPrompt.includes('only arabic')) {
    return 'ARABIC_ONLY';
  }
  
  if (lowerPrompt.includes('english only') || 
      lowerPrompt.includes('إنجليزي فقط') ||
      lowerPrompt.includes('english-only') ||
      lowerPrompt.includes('only english')) {
    return 'ENGLISH_ONLY';
  }
  
  // 2. Automatic detection based on script content
  const { arabicCount, englishCount, totalChars } = analyzeLanguageContent(prompt);
  
  // If mostly Arabic (70%+ Arabic characters)
  if (arabicCount > 0 && arabicCount / totalChars > 0.7 && englishCount < arabicCount) {
    return 'ARABIC_ONLY';
  }
  
  // If substantial mix (both Arabic and English present significantly)
  if (arabicCount > 10 && englishCount > 10) {
    return 'BILINGUAL';
  }
  
  // If only Arabic present
  if (arabicCount > 0 && englishCount === 0) {
    return 'ARABIC_ONLY';
  }
  
  // Default: English only
  return 'ENGLISH_ONLY';
  }

/**
 * Planner Agent - Analyzes prompt and creates generation plan
 */
export async function planGeneration(prompt: string): Promise<GenerationPlan> {
  const openai = getOpenAIClient();
  
  // Detect language mode first
  const languageMode = detectLanguageMode(prompt);
  
  // Use AI to analyze the prompt and create a detailed plan
  const systemPrompt = `You are a senior web development planner. Analyze the user's prompt and create a detailed generation plan.

IMPORTANT: The prompt may be in Arabic, English, or both. You MUST understand Arabic industry keywords and translate them to English industry types.

Return a JSON object with this structure:
{
  "industry": "restaurant|portfolio|clinic|saas|agency|ecommerce|blog|other",
  "requiredSections": ["navbar", "hero", "about", "contact", "footer"],
  "optionalSections": ["gallery", "testimonials", "pricing"],
  "languageMode": "ARABIC_ONLY|ENGLISH_ONLY|BILINGUAL",
  "folderStructure": ["src/components", "src/locales", "public"],
  "requiredLibraries": ["react", "react-dom", "vite"],
  "suggestedComponents": ["Navbar", "Hero", "About", "Menu", "Gallery", "Contact", "Footer"],
  "projectName": "My Project"
}

Rules:
- Detect industry from keywords in ANY language:
  * English: restaurant, cafe, coffee shop, portfolio, clinic, medical, saas, agency, etc.
  * Arabic: مطعم (restaurant), مقهى (cafe/coffee shop), عيادة (clinic), معرض (portfolio/gallery), وكالة (agency), etc.
- If user says "مقهى" or "مقهى قهوة" or "coffee shop" → industry: "restaurant" (cafe/coffee shop)
- If user says "مطعم" → industry: "restaurant"
- If user says "عيادة" or "عيادة طبية" → industry: "clinic"
- If user says "معرض أعمال" or "portfolio" → industry: "portfolio"
- Required sections: Always include navbar, hero, contact, footer
- CRITICAL: Add industry-specific sections to requiredSections (NOT optionalSections):
  * If industry is restaurant/cafe/coffee shop: REQUIRED sections must include "menu", "gallery", "testimonials", "about"
  * If industry is portfolio: REQUIRED sections must include "gallery", "projects", "skills", "about"
  * If industry is medical/clinic: REQUIRED sections must include "services", "appointment", "about"
  * If industry is agency: REQUIRED sections must include "services", "pricing", "portfolio", "about"
  * For other industries: REQUIRED sections should include "about", "features"
- Do NOT put industry-specific sections in optionalSections - they should be in requiredSections
- Optional sections are only for truly optional features (like pricing for non-agency sites)
- Language mode: ${languageMode} (this has been automatically detected - use this value)
- Project name should be a clean, URL-friendly name based on the prompt (translate Arabic to English for project name)`;

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
    
    // Ensure required sections are always included
    if (!plan.requiredSections.includes('navbar')) {
      plan.requiredSections.unshift('navbar');
    }
    if (!plan.requiredSections.includes('hero')) {
      plan.requiredSections.push('hero');
    }
    if (!plan.requiredSections.includes('contact')) {
      plan.requiredSections.push('contact');
    }
    if (!plan.requiredSections.includes('footer')) {
      plan.requiredSections.push('footer');
    }
    
    // Auto-add industry-specific sections to requiredSections
    const industry = plan.industry.toLowerCase();
    if (industry === 'restaurant' || industry.includes('cafe') || industry.includes('coffee')) {
      // Restaurant/cafe specific sections
      if (!plan.requiredSections.includes('menu') && !plan.optionalSections.includes('menu')) {
        plan.requiredSections.push('menu');
      }
      if (!plan.requiredSections.includes('gallery') && !plan.optionalSections.includes('gallery')) {
        plan.requiredSections.push('gallery');
      }
      if (!plan.requiredSections.includes('testimonials') && !plan.optionalSections.includes('testimonials')) {
        plan.requiredSections.push('testimonials');
      }
      if (!plan.requiredSections.includes('about') && !plan.optionalSections.includes('about')) {
        plan.requiredSections.push('about');
      }
    } else if (industry === 'portfolio') {
      // Portfolio specific sections
      if (!plan.requiredSections.includes('gallery') && !plan.optionalSections.includes('gallery')) {
        plan.requiredSections.push('gallery');
      }
      if (!plan.requiredSections.includes('projects') && !plan.optionalSections.includes('projects')) {
        plan.requiredSections.push('projects');
      }
      if (!plan.requiredSections.includes('skills') && !plan.optionalSections.includes('skills')) {
        plan.requiredSections.push('skills');
      }
      if (!plan.requiredSections.includes('about') && !plan.optionalSections.includes('about')) {
        plan.requiredSections.push('about');
      }
    } else if (industry === 'clinic' || industry.includes('medical')) {
      // Medical/clinic specific sections
      if (!plan.requiredSections.includes('services') && !plan.optionalSections.includes('services')) {
        plan.requiredSections.push('services');
      }
      if (!plan.requiredSections.includes('appointment') && !plan.optionalSections.includes('appointment')) {
        plan.requiredSections.push('appointment');
      }
      if (!plan.requiredSections.includes('about') && !plan.optionalSections.includes('about')) {
        plan.requiredSections.push('about');
      }
    } else if (industry === 'agency') {
      // Agency specific sections
      if (!plan.requiredSections.includes('services') && !plan.optionalSections.includes('services')) {
        plan.requiredSections.push('services');
      }
      if (!plan.requiredSections.includes('pricing') && !plan.optionalSections.includes('pricing')) {
        plan.requiredSections.push('pricing');
      }
      if (!plan.requiredSections.includes('portfolio') && !plan.optionalSections.includes('portfolio')) {
        plan.requiredSections.push('portfolio');
      }
      if (!plan.requiredSections.includes('about') && !plan.optionalSections.includes('about')) {
        plan.requiredSections.push('about');
      }
    } else {
      // Default: add about and features for generic websites
      if (!plan.requiredSections.includes('about') && !plan.optionalSections.includes('about')) {
        plan.requiredSections.push('about');
      }
      if (!plan.requiredSections.includes('features') && !plan.optionalSections.includes('features')) {
        plan.requiredSections.push('features');
      }
    }
    
    // Remove duplicates
    plan.requiredSections = Array.from(new Set(plan.requiredSections));
    plan.optionalSections = Array.from(new Set(plan.optionalSections));
    
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
