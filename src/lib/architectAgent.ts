/**
 * Architect Agent - Converts plan to file-level tasks
 * 
 * You are the Architect Agent for Aqall.
 * Your job is to convert the Planner's output into a complete file-level blueprint.
 * 
 * Responsibilities:
 * - Exact list of files to generate
 * - Exact list of components
 * - Dependencies required
 * - Whether translation files are needed
 * - Whether RTL is needed
 * - The correct folder structure for Vite + React + Tailwind
 * 
 * Always include:
 * - package.json, index.html, vite.config.js, postcss.config.js, tailwind.config.js
 * - src/main.jsx, src/App.jsx, src/index.css
 * - src/components/[ComponentName].jsx for each section
 * - If bilingual: src/i18n.js, src/locales/en.json, src/locales/ar.json
 */

import { GenerationPlan } from './plannerAgent';

export interface FileTask {
  path: string;
  type: 'component' | 'config' | 'asset' | 'translation' | 'entry';
  description: string;
  priority: 'required' | 'optional';
}

export interface ArchitecturePlan {
  tasks: FileTask[];
  components: string[];
  configFiles: string[];
  assets: string[];
  translationFiles: string[];
}

/**
 * Architect Agent - Converts generation plan to file-level tasks
 */
export function architectGeneration(plan: GenerationPlan): ArchitecturePlan {
  const tasks: FileTask[] = [];
  const components: string[] = [];
  const configFiles: string[] = [];
  const assets: string[] = [];
  const translationFiles: string[] = [];

  // Required config files
  const requiredConfigs = [
    { path: 'package.json', description: 'Project dependencies and scripts' },
    { path: 'vite.config.js', description: 'Vite configuration' },
    { path: 'tailwind.config.js', description: 'Tailwind CSS configuration' },
    { path: 'postcss.config.js', description: 'PostCSS configuration' },
    { path: 'index.html', description: 'HTML entry point' },
  ];

  requiredConfigs.forEach(config => {
    tasks.push({
      path: config.path,
      type: 'config',
      description: config.description,
      priority: 'required',
    });
    configFiles.push(config.path);
  });

  // Required entry files
  const requiredEntries = [
    { path: 'src/main.jsx', description: 'React entry point' },
    { path: 'src/App.jsx', description: 'Main App component' },
    { path: 'src/index.css', description: 'Global styles and Tailwind imports' },
  ];

  requiredEntries.forEach(entry => {
    tasks.push({
      path: entry.path,
      type: 'entry',
      description: entry.description,
      priority: 'required',
    });
  });

  // Helper function to convert section name to valid component name
  function sectionToComponentName(section: string): string {
    // Remove spaces and invalid characters, then capitalize each word
    return section
      .split(/[\s\-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  // Remove duplicates from requiredSections first
  const uniqueSections = Array.from(new Set(plan.requiredSections));
  
  // Track which components we've already added to prevent duplicates
  const addedComponents = new Set<string>();
  
  // Components from required sections ONLY (no duplicates)
  uniqueSections.forEach(section => {
    const componentName = sectionToComponentName(section);
    
    // Skip if we've already added this component
    if (addedComponents.has(componentName)) {
      return;
    }
    
    addedComponents.add(componentName);
    const path = `src/components/${componentName}.jsx`;
    
    tasks.push({
      path,
      type: 'component',
      description: `${componentName} component for ${section} section`,
      priority: 'required',
    });
    components.push(componentName);
  });

  // Translation files if bilingual
  if (plan.languageMode === 'BILINGUAL') {
    const i18nFiles = [
      { path: 'src/i18n.js', description: 'i18n configuration and LanguageProvider' },
      { path: 'src/locales/en.json', description: 'English translations' },
      { path: 'src/locales/ar.json', description: 'Arabic translations' },
    ];

    i18nFiles.forEach(file => {
      tasks.push({
        path: file.path,
        type: 'translation',
        description: file.description,
        priority: 'required',
      });
      translationFiles.push(file.path);
    });
  }

  // Assets (optional - placeholder logo)
  assets.push('public/logo.png');
  tasks.push({
    path: 'public/logo.png',
    type: 'asset',
    description: 'Logo image (placeholder)',
    priority: 'optional',
  });

  return {
    tasks,
    components,
    configFiles,
    assets,
    translationFiles,
  };
}
