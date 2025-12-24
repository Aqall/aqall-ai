/**
 * Workspace Service - Virtual File System for Project Files
 * 
 * Manages file-based workspace per project, stored in Supabase builds table
 * Provides file tools: list_files, read_file, write_file, apply_patch
 */

import { supabase } from './supabaseClient';

export interface WorkspaceFile {
  path: string;
  content: string;
  type: 'file' | 'folder';
}

export interface FileTools {
  list_files: (path?: string) => Promise<string[]>;
  read_file: (path: string) => Promise<string | null>;
  write_file: (path: string, content: string) => Promise<void>;
  apply_patch: (path: string, diff: string) => Promise<void>;
}

/**
 * Get workspace files for a project build
 */
export async function getWorkspaceFiles(
  projectId: string,
  buildVersion: number
): Promise<WorkspaceFile[]> {
  const { data, error } = await supabase
    .from('builds')
    .select('files')
    .eq('project_id', projectId)
    .eq('version', buildVersion)
    .single();

  if (error) {
    throw new Error(`Failed to load workspace: ${error.message}`);
  }

  return jsonbToWorkspace(data?.files);
}

/**
 * Save workspace files for a project build
 */
export async function saveWorkspaceFiles(
  projectId: string,
  buildVersion: number,
  files: WorkspaceFile[]
): Promise<void> {
  const { error } = await supabase
    .from('builds')
    .update({ files: workspaceToJsonb(files) as any })
    .eq('project_id', projectId)
    .eq('version', buildVersion);

  if (error) {
    throw new Error(`Failed to save workspace: ${error.message}`);
  }
}

/**
 * Create file tools interface for a workspace
 */
export function createFileTools(
  projectId: string,
  buildVersion: number,
  files: WorkspaceFile[]
): FileTools {
  // In-memory file system for this workspace
  const fileMap = new Map<string, string>();
  files.forEach(file => {
    if (file.type === 'file') {
      fileMap.set(file.path, file.content);
    }
  });

  return {
    /**
     * List all files in the workspace (optionally filtered by path prefix)
     */
    async list_files(path?: string): Promise<string[]> {
      const allPaths = Array.from(fileMap.keys());
      if (!path) {
        return allPaths;
      }
      return allPaths.filter(p => p.startsWith(path));
    },

    /**
     * Read file content by path
     */
    async read_file(path: string): Promise<string | null> {
      return fileMap.get(path) || null;
    },

    /**
     * Write file content (creates or overwrites)
     */
    async write_file(path: string, content: string): Promise<void> {
      fileMap.set(path, content);
      // Update the files array
      const fileIndex = files.findIndex(f => f.path === path);
      if (fileIndex >= 0) {
        files[fileIndex] = { path, content, type: 'file' };
      } else {
        files.push({ path, content, type: 'file' });
      }
    },

    /**
     * Apply a patch/diff to a file
     */
    async apply_patch(path: string, diff: string): Promise<void> {
      const currentContent = fileMap.get(path) || '';
      // Simple patch application - in production, use a proper diff library
      // For now, we'll just append or replace based on diff format
      // This is a simplified version - real implementation would parse unified diff format
      const newContent = applySimplePatch(currentContent, diff);
      await this.write_file(path, newContent);
    },
  };
}

/**
 * Apply unified diff patch to content
 * Supports proper unified diff format with context lines
 */
function applySimplePatch(content: string, diff: string): string {
  const contentLines = content.split('\n');
  const diffLines = diff.split('\n');
  
  let result = [...contentLines];
  let lineOffset = 0;
  let inHunk = false;
  let hunkStart = 0;
  let hunkLine = 0;

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];
    
    // Match hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
    if (hunkMatch) {
      inHunk = true;
      hunkStart = parseInt(hunkMatch[1]) - 1; // Convert to 0-based index
      hunkLine = 0;
      lineOffset = 0;
      continue;
    }

    if (!inHunk) continue;

    // Context line (unchanged) - verify it matches current content
    if (line.startsWith(' ')) {
      const expectedLine = result[hunkStart + hunkLine + lineOffset];
      const contextLine = line.substring(1);
      
      // If context doesn't match, try to find it nearby (fuzzy matching)
      if (expectedLine !== contextLine) {
        // Look ahead/behind for matching context
        let found = false;
        for (let offset = -2; offset <= 2; offset++) {
          const checkIndex = hunkStart + hunkLine + lineOffset + offset;
          if (checkIndex >= 0 && checkIndex < result.length && result[checkIndex] === contextLine) {
            lineOffset = offset;
            found = true;
            break;
          }
        }
        if (!found) {
          // Context mismatch - log warning but continue
          console.warn(`Context mismatch at line ${hunkStart + hunkLine + 1}, continuing anyway...`);
        }
      }
      hunkLine++;
    }
    // Deletion line
    else if (line.startsWith('-')) {
      const deleteLine = line.substring(1);
      const currentIndex = hunkStart + hunkLine + lineOffset;
      
      if (currentIndex >= 0 && currentIndex < result.length) {
        const currentLine = result[currentIndex];
        // Verify the line matches (or close enough)
        if (currentLine === deleteLine || currentLine.includes(deleteLine) || deleteLine.includes(currentLine)) {
          result.splice(currentIndex, 1);
          lineOffset--;
        } else {
          console.warn(`Deletion mismatch at line ${currentIndex + 1}, skipping...`);
        }
      }
      hunkLine++;
    }
    // Addition line
    else if (line.startsWith('+')) {
      const addLine = line.substring(1);
      const insertIndex = hunkStart + hunkLine + lineOffset + 1;
      result.splice(insertIndex, 0, addLine);
      lineOffset++;
      hunkLine++;
    }
    // End of hunk (empty line or new hunk)
    else if (line.trim() === '' && i < diffLines.length - 1) {
      // Check if next line is a new hunk
      const nextLine = diffLines[i + 1];
      if (!nextLine.startsWith('@@')) {
        inHunk = false;
      }
    }
  }

  return result.join('\n');
}

/**
 * Initialize workspace with base file structure
 */
export function initializeWorkspace(): WorkspaceFile[] {
  return [];
}

/**
 * Convert workspace files to JSONB format for Supabase
 */
export function workspaceToJsonb(files: WorkspaceFile[]): any {
  return files;
}

/**
 * Convert JSONB from Supabase to workspace files
 * Handles both formats:
 * 1. Array format: [{ path: "...", content: "...", type: "file" }]
 * 2. Object format (ProjectFiles): { "path/to/file": "content", ... }
 */
export function jsonbToWorkspace(jsonb: any): WorkspaceFile[] {
  if (!jsonb) {
    return [];
  }
  
  // If it's already an array format
  if (Array.isArray(jsonb)) {
    return jsonb.map((file: any) => ({
      path: file.path,
      content: file.content || '',
      type: file.type || 'file',
    }));
  }
  
  // If it's an object format (ProjectFiles - keys are file paths)
  if (typeof jsonb === 'object' && !Array.isArray(jsonb)) {
    return Object.entries(jsonb).map(([path, content]) => ({
      path,
      content: typeof content === 'string' ? content : String(content),
      type: 'file' as const,
    }));
  }
  
  return [];
}
