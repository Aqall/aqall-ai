/**
 * ============================================
 * DEPRECATED – Project metadata migrated to Supabase
 * ============================================
 * 
 * ⚠️ **THIS FILE IS DEPRECATED** ⚠️
 * 
 * Project metadata (name, timestamps) has been migrated to Supabase Postgres.
 * Use `src/lib/projectService.ts` for all project CRUD operations.
 * 
 * **Migration Status:**
 * ✅ Project metadata (name, timestamps) → Supabase `projects` table
 * ⏳ Builds data → Still using localStorage temporarily (will migrate to `builds` table)
 * 
 * **Current Usage:**
 * - `getProject()` - Used temporarily in BuildChat/Preview to load legacy builds from localStorage
 * - `addBuildToProject()` - Used temporarily to store builds in localStorage until builds table is implemented
 * 
 * **Replacement:**
 * - Use `projectService.listProjects()`, `projectService.createProject()`, etc. for project metadata
 * - Builds will be migrated to Supabase `builds` table in a future step
 * 
 * **Files still using this (temporary):**
 * - `app/build/[projectId]/page.tsx` - For legacy builds storage
 * - `app/preview/[projectId]/page.tsx` - For legacy builds retrieval
 * 
 * **To remove this file:**
 * 1. Migrate builds to Supabase `builds` table
 * 2. Update BuildChat and Preview to use Supabase for builds
 * 3. Remove all imports of this file
 * 4. Delete this file
 */

import { BuildResult } from './mockApi';

export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  builds: BuildResult[];
}

const STORAGE_KEY = 'aqall-projects';

function getProjects(): Project[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return parsed.map((p: { createdAt: string; updatedAt: string; builds: Array<{ timestamp: string }> }) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      builds: p.builds.map((b: { timestamp: string }) => ({
        ...b,
        timestamp: new Date(b.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getUserProjects(userId: string): Project[] {
  return getProjects().filter(p => p.userId === userId);
}

export function getProject(projectId: string): Project | null {
  return getProjects().find(p => p.id === projectId) || null;
}

export function createProject(userId: string, name: string): Project {
  const projects = getProjects();
  const newProject: Project = {
    id: `project-${Date.now()}`,
    name,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    builds: [],
  };
  projects.push(newProject);
  saveProjects(projects);
  return newProject;
}

export function addBuildToProject(projectId: string, build: BuildResult): Project | null {
  const projects = getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  if (projectIndex === -1) return null;

  projects[projectIndex].builds.push(build);
  projects[projectIndex].updatedAt = new Date();
  saveProjects(projects);
  return projects[projectIndex];
}

export function deleteProject(projectId: string): boolean {
  const projects = getProjects();
  const filtered = projects.filter(p => p.id !== projectId);
  if (filtered.length === projects.length) return false;
  saveProjects(filtered);
  return true;
}

export function updateProjectName(projectId: string, name: string): Project | null {
  const projects = getProjects();
  const projectIndex = projects.findIndex(p => p.id === projectId);
  if (projectIndex === -1) return null;

  projects[projectIndex].name = name;
  projects[projectIndex].updatedAt = new Date();
  saveProjects(projects);
  return projects[projectIndex];
}
