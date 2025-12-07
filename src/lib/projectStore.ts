/**
 * ============================================
 * CURRENTLY MOCKED – to be replaced by Supabase + OpenAI backend
 * ============================================
 * 
 * This file provides mock project persistence using localStorage for MVP Phase 1.
 * All project CRUD operations are currently stored client-side only.
 * 
 * **What this will be replaced with:**
 * - Supabase `projects` table (see `supabase/schema.sql`)
 * - Supabase `builds` table for storing website versions
 * - Supabase client library (`@supabase/supabase-js`) for queries
 * - Row Level Security (RLS) policies for user-scoped data access
 * - Real-time subscriptions for project updates (optional)
 * 
 * **Migration path:**
 * 1. Replace `getUserProjects()` with Supabase query:
 *    `supabase.from('projects').select('*').eq('user_id', userId)`
 * 2. Replace `createProject()` with Supabase insert:
 *    `supabase.from('projects').insert({ name, user_id })`
 * 3. Replace `addBuildToProject()` with Supabase insert to `builds` table
 * 4. Replace `deleteProject()` with Supabase delete (cascades to builds via FK)
 * 5. Replace `updateProjectName()` with Supabase update
 * 
 * **Database schema:**
 * - `profiles` table: user profiles (linked to auth.users)
 * - `projects` table: user projects with name, timestamps
 * - `builds` table: website versions with prompt, files (JSONB), preview_html
 * - All tables have RLS enabled for security
 * 
 * **Dependencies to add:**
 * - `@supabase/supabase-js` for client-side queries
 * - Supabase client initialization in app context
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
    return parsed.map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      builds: p.builds.map((b: any) => ({
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
