/**
 * Build Lock Service - Simple locking mechanism to prevent concurrent builds
 * 
 * Prevents multiple builds/edits from running on the same project simultaneously
 */

import { supabase } from './supabaseClient';

export type BuildStatus = 'idle' | 'processing';

/**
 * Lock a project for building/editing
 * Returns true if lock was acquired, false if project is already locked
 */
export async function lockProject(projectId: string, userId: string): Promise<boolean> {
  try {
    // First check current status
    // If columns don't exist yet (migration not run), this will fail gracefully
    const { data: currentProject, error: checkError } = await supabase
      .from('projects')
      .select('build_status')
      .eq('id', projectId)
      .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no rows instead of error

    // If error is due to missing column (migration not run), allow through
    // The lock is best-effort - RLS still provides security
    if (checkError) {
      // Check if it's a column doesn't exist error
      if (checkError.message?.includes('column') || checkError.code === '42703') {
        console.warn('Build locking columns not found - migration may not be run. Proceeding without lock.');
        return true; // Allow through if columns don't exist
      }
      console.error('Error checking project status:', checkError);
      // For other errors (like RLS blocking), allow through - RLS will protect the actual operation
      return true;
    }

    // If project not found (currentProject is null), allow through
    // RLS will still protect the actual edit/generate operation
    if (!currentProject) {
      console.warn('Project not found when checking lock status. Proceeding anyway - RLS will protect.');
      return true;
    }

    // If already processing, can't lock
    if (currentProject?.build_status === 'processing') {
      return false;
    }

    // Update project status to 'processing'
    // We already checked it's not processing, so this should work
    // RLS will enforce that only the project owner can update this
    const updateData: Record<string, unknown> = { 
      build_status: 'processing',
      locked_at: new Date().toISOString(),
    };
    
    // Only set locked_by if userId is provided and not a placeholder
    if (userId && userId !== 'api-route' && userId !== 'unknown') {
      updateData.locked_by = userId;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .maybeSingle(); // Use maybeSingle() instead of single()

    if (error) {
      // If columns don't exist (migration not run), allow through
      if (error?.message?.includes('column') || error?.code === '42703') {
        console.warn('Build locking columns not found - migration may not be run. Proceeding without lock.');
        return true; // Allow through if columns don't exist
      }
      // If no rows updated (PGRST116) or RLS blocks, allow through
      // RLS will still protect the actual operation
      if (error?.code === 'PGRST116' || error?.code === '42501') {
        console.warn('Could not update lock (RLS may be blocking or project not found). Proceeding anyway.');
        return true;
      }
      console.error('Error locking project:', error);
      // For other errors, allow through as best-effort
      return true;
    }
    
    // If no data returned (project not found), allow through
    if (!data) {
      console.warn('Project not found when trying to lock. Proceeding anyway - RLS will protect.');
      return true;
    }

    return true;
  } catch (error) {
    console.error('Error in lockProject:', error);
    return false;
  }
}

/**
 * Unlock a project after build/edit is complete
 */
export async function unlockProject(projectId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('projects')
      .update({ 
        build_status: 'idle',
        locked_by: null,
        locked_at: null,
      })
      .eq('id', projectId);

    if (error) {
      // If columns don't exist (migration not run), that's ok - just log and continue
      if (error?.message?.includes('column') || error?.code === '42703') {
        // Columns don't exist - that's fine, migration not run yet
        return;
      }
      console.error('Error unlocking project:', error);
      // Don't throw - we want to ensure cleanup happens
    }
  } catch (error) {
    console.error('Error in unlockProject:', error);
    // Don't throw - we want to ensure cleanup happens
  }
}

/**
 * Check if a project is currently locked
 */
export async function isProjectLocked(projectId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('build_status')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.build_status === 'processing';
  } catch (error) {
    console.error('Error checking project lock:', error);
    return false;
  }
}

/**
 * Force unlock a project (cleanup function in case of errors)
 * Should be used carefully, mainly for admin/debugging
 */
export async function forceUnlockProject(projectId: string): Promise<void> {
  await unlockProject(projectId);
}

