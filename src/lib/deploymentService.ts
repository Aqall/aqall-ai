/**
 * Deployment Service - Handles deployment-related database operations
 */

import { supabase } from './supabaseClient';

export interface Deployment {
  id: string;
  project_id: string;
  build_id: string;
  netlify_site_id: string | null;
  netlify_deploy_id: string | null;
  url: string | null;
  status: 'pending' | 'building' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

/**
 * Get the latest deployment for a project
 */
export async function getLatestDeploymentByProject(projectId: string): Promise<Deployment | null> {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest deployment:', error);
    throw new Error(`Failed to fetch deployment: ${error.message}`);
  }

  return data;
}

/**
 * Get all deployments for a project
 */
export async function getDeploymentsByProject(projectId: string): Promise<Deployment[]> {
  const { data, error } = await supabase
    .from('deployments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching deployments:', error);
    throw new Error(`Failed to fetch deployments: ${error.message}`);
  }

  return data || [];
}
