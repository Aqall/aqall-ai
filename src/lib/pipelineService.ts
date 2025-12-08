/**
 * Pipeline Service - Orchestrates the Lovable-style multi-agent pipeline
 * 
 * Pipeline flow: Planner → Architect → Coder
 * 
 * This replaces the old aiOrchestrator.ts with a structured,
 * multi-agent approach matching Lovable's backend system.
 */

import { planGeneration, GenerationPlan } from './plannerAgent';
import { architectGeneration, ArchitecturePlan } from './architectAgent';
import { codeGeneration } from './coderAgent';
import { 
  createFileTools, 
  initializeWorkspace, 
  WorkspaceFile 
} from './workspaceService';
import { ProjectFiles } from './buildService';

export interface GenerateSiteResult {
  files: ProjectFiles;
  summary: string;
  languageMode: 'arabic-only' | 'english-only' | 'bilingual';
  sections: string[];
}

/**
 * Convert language mode from planner format to buildService format
 */
function convertLanguageMode(mode: 'ARABIC_ONLY' | 'ENGLISH_ONLY' | 'BILINGUAL'): 'arabic-only' | 'english-only' | 'bilingual' {
  switch (mode) {
    case 'ARABIC_ONLY':
      return 'arabic-only';
    case 'ENGLISH_ONLY':
      return 'english-only';
    case 'BILINGUAL':
      return 'bilingual';
    default:
      return 'english-only';
  }
}

/**
 * Generate website using the Lovable-style multi-agent pipeline
 */
export async function generateSiteFromPrompt(args: {
  projectId: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<GenerateSiteResult> {
  const { message } = args;

  console.log('🚀 Starting Lovable-style pipeline generation...');
  console.log('📝 User prompt:', message);

  // Step 1: Planner Agent - Analyze prompt and create plan
  console.log('📋 Step 1: Planner Agent - Creating generation plan...');
  const plan = await planGeneration(message);
  console.log('✅ Plan created:', {
    industry: plan.industry,
    requiredSections: plan.requiredSections,
    languageMode: plan.languageMode,
  });

  // Step 2: Architect Agent - Convert plan to file tasks
  console.log('🏗️  Step 2: Architect Agent - Creating architecture...');
  const architecture = architectGeneration(plan);
  console.log('✅ Architecture created:', {
    components: architecture.components,
    configFiles: architecture.configFiles,
  });

  // Step 3: Initialize workspace
  console.log('📁 Step 3: Initializing workspace...');
  const workspaceFiles: WorkspaceFile[] = initializeWorkspace();
  const fileTools = createFileTools('', 0, workspaceFiles);

  // Step 4: Coder Agent - Generate all files using file tools
  console.log('💻 Step 4: Coder Agent - Generating files...');
  await codeGeneration(plan, architecture, fileTools, message);
  console.log('✅ Files generated');

  // Step 5: Convert workspace files to ProjectFiles format
  const projectFiles: ProjectFiles = {};
  workspaceFiles.forEach(file => {
    if (file.type === 'file') {
      projectFiles[file.path] = file.content;
    }
  });

  // Generate summary
  const languageModeDisplay = convertLanguageMode(plan.languageMode);
  const summary = languageModeDisplay === 'arabic-only'
    ? `تم إنشاء موقع ${plan.industry} مع الأقسام: ${plan.requiredSections.join('، ')}`
    : `Generated ${plan.industry} website with sections: ${plan.requiredSections.join(', ')}`;

  console.log('✅ Pipeline complete!');
  console.log(`📦 Generated ${Object.keys(projectFiles).length} files`);

  return {
    files: projectFiles,
    summary,
    languageMode: languageModeDisplay,
    sections: plan.requiredSections,
  };
}
