// TODO: Connect to Supabase for real persistence
// This is a mock store using localStorage

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
