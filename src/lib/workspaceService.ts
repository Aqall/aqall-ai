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
 * Simple patch application (simplified - in production use a proper diff library)
 */
function applySimplePatch(content: string, diff: string): string {
  // This is a very basic implementation
  // In production, you'd use a library like 'diff' or 'diff-match-patch'
  // For now, if diff starts with lines to add, we append them
  const lines = diff.split('\n');
  const additions: string[] = [];
  
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions.push(line.substring(1));
    }
  }
  
  if (additions.length > 0) {
    return content + '\n' + additions.join('\n');
  }
  
  return content;
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
 */
export function jsonbToWorkspace(jsonb: any): WorkspaceFile[] {
  if (!jsonb || !Array.isArray(jsonb)) {
    return [];
  }
  return jsonb.map((file: any) => ({
    path: file.path,
    content: file.content || '',
    type: file.type || 'file',
  }));
}
