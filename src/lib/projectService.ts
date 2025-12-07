/**
 * Project Service - Supabase-backed project management
 * 
 * This service handles all CRUD operations for projects using Supabase Postgres.
 * 
 * **Security Note:**
 * This service relies on Supabase Row Level Security (RLS) policies to ensure
 * users can only access their own projects. The `user_id` parameter should
 * always be the authenticated user's ID from AuthContext. RLS policies in
 * `supabase/schema.sql` enforce that:
 * - Users can only SELECT/INSERT/UPDATE/DELETE projects where `user_id = auth.uid()`
 * 
 * **Database Schema:**
 * - Table: `public.projects`
 * - Fields: id (UUID), user_id (UUID), name (TEXT), created_at (TIMESTAMP), updated_at (TIMESTAMP)
 * 
 * **Future Enhancements:**
 * - Add `main_prompt` field to store the initial project description
 * - Add `slug` field for URL-friendly project identifiers
 * - Add real-time subscriptions for collaborative editing
 */

import { supabase } from './supabaseClient';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * List all projects for a given user
 * @param userId - The authenticated user's ID
 * @returns Array of projects owned by the user
 */
export async function listProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a single project by ID (with RLS check)
 * @param userId - The authenticated user's ID (for RLS verification)
 * @param projectId - The project ID to fetch
 * @returns The project if found and owned by user, null otherwise
 */
export async function getProjectById(userId: string, projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching project:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data;
}

/**
 * Create a new project
 * @param userId - The authenticated user's ID
 * @param data - Project creation data
 * @returns The newly created project
 */
export async function createProject(
  userId: string,
  data: { name: string }
): Promise<Project> {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: data.name.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  if (!project) {
    throw new Error('Project creation returned no data');
  }

  return project;
}

/**
 * Update a project's name
 * @param userId - The authenticated user's ID (for RLS verification)
 * @param projectId - The project ID to update
 * @param name - New project name
 * @returns The updated project
 */
export async function updateProject(
  userId: string,
  projectId: string,
  name: string
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  if (!data) {
    throw new Error('Project update returned no data');
  }

  return data;
}

/**
 * Delete a project (cascades to builds via FK constraint)
 * @param userId - The authenticated user's ID (for RLS verification)
 * @param projectId - The project ID to delete
 */
export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}
