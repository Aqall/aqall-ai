/**
 * Edit Service - Orchestrates the editing pipeline
 * 
 * Handles edit requests by:
 * 1. Loading the latest build
 * 2. Creating file tools from existing files
 * 3. Applying edits via EditorAgent
 * 4. Creating a new build version with edited files
 */

import { 
  getWorkspaceFiles, 
  createFileTools, 
  WorkspaceFile,
  saveWorkspaceFiles 
} from './workspaceService';
import { applyEdits, EditRequest, EditResult } from './editorAgent';
import { getLatestBuild, getBuildByVersion, createBuild, ProjectFiles, generatePreviewHTML } from './buildService';

export interface EditSiteResult {
  files: ProjectFiles;
  summary: string;
  filesChanged: string[];
  patches: Array<{ path: string; diff: string; summary: string }>;
  version: number;
  previewHtml: string;
  success: boolean;
  errors?: string[];
}

/**
 * Edit website using the Editor Agent
 */
export async function editSiteFromPrompt(args: {
  projectId: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  buildVersion?: number; // Optional: edit specific version, otherwise uses latest
}): Promise<EditSiteResult> {
  const { projectId, message, history, buildVersion } = args;

  console.log('✏️  Starting edit pipeline...');
  console.log('📝 Edit request:', message);

  // Step 1: Get the build to edit (latest or specific version)
  let targetVersion = buildVersion;
  if (!targetVersion) {
    const latestBuild = await getLatestBuild(projectId);
    if (!latestBuild) {
      throw new Error('No builds found for this project. Please generate a site first.');
    }
    targetVersion = latestBuild.version;
  }

  console.log(`📦 Loading build version ${targetVersion}...`);

  // Step 2: Get the build directly to access files
  const build = await getBuildByVersion(projectId, targetVersion);
  
  if (!build) {
    throw new Error(`Build version ${targetVersion} not found for project ${projectId}`);
  }
  
  if (!build.files || Object.keys(build.files).length === 0) {
    throw new Error(`Build version ${targetVersion} has no files. The build may be empty or corrupted.`);
  }
  
  // Convert ProjectFiles format to WorkspaceFile format
  const buildFiles = build.files as ProjectFiles;
  const workspaceFiles: WorkspaceFile[] = Object.entries(buildFiles).map(([path, content]) => ({
    path,
    content: typeof content === 'string' ? content : String(content),
    type: 'file' as const,
  }));
  
  console.log(`✅ Loaded ${workspaceFiles.length} files from build version ${targetVersion}`);

  // Step 3: Create file tools for editing
  const fileTools = createFileTools(projectId, targetVersion, workspaceFiles);

  // Step 4: Apply edits using Editor Agent
  const editRequest: EditRequest = {
    userPrompt: message.trim(),
    projectId,
    buildVersion: targetVersion,
    history,
  };

  const editResult: EditResult = await applyEdits(editRequest, fileTools);
  console.log('✅ Edit complete:', editResult.summary);

  if (!editResult.success && editResult.filesChanged.length === 0) {
    throw new Error(editResult.errors?.join('; ') || 'Edit failed with no changes');
  }

  // Step 5: Convert workspace files to ProjectFiles format
  const projectFiles: ProjectFiles = {};
  workspaceFiles.forEach(file => {
    if (file.type === 'file') {
      projectFiles[file.path] = file.content;
    }
  });

  // Step 6: Determine language mode from existing files
  // Check if bilingual files exist (i18n.js, locales)
  const hasI18n = projectFiles['src/i18n.js'] || projectFiles['src/locales/en.json'];
  const hasArabicOnly = workspaceFiles.some(f => 
    f.path.includes('ar.json') || 
    (f.content && /[\u0600-\u06FF]/.test(f.content) && !hasI18n)
  );
  
  let languageMode = 'english-only';
  if (hasI18n) {
    languageMode = 'bilingual';
  } else if (hasArabicOnly) {
    languageMode = 'arabic-only';
  }

  // Step 7: Create new build with edited files
  console.log(`📦 Creating new build version with edited files...`);
  const newBuild = await createBuild({
    projectId,
    prompt: message,
    files: projectFiles,
    summary: editResult.summary,
    languageMode,
  });

  console.log(`✅ Created build version ${newBuild.version}`);

  // Step 8: Return result
  return {
    files: projectFiles,
    summary: editResult.summary,
    filesChanged: editResult.filesChanged,
    patches: editResult.patches,
    version: newBuild.version,
    previewHtml: newBuild.preview_html || '',
    success: editResult.success,
    errors: editResult.errors,
  };
}