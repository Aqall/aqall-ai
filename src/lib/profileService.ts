import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

/**
 * Creates or updates a user profile in the profiles table
 * This is called after successful signup or when a user logs in for the first time
 * 
 * Added timeout protection to prevent infinite loading
 */
export async function ensureProfile(user: User): Promise<{ error?: string }> {
  try {
    // Add timeout protection - if this takes more than 5 seconds, bail out
    const timeoutPromise = new Promise<{ error: string }>((resolve) => {
      setTimeout(() => {
        resolve({ error: 'Profile check timeout - proceeding anyway' });
      }, 5000);
    });

    const profileCheck = (async () => {
      // Check if profile already exists using maybeSingle (returns null if not found, doesn't throw)
      const { data: existingProfile, error: selectError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // If error, log but continue (might be RLS or connection issue)
      if (selectError) {
        console.warn('Error checking profile existence:', selectError);
        // Don't fail - profile might exist, or might be created by trigger
        return {};
      }

      // If profile exists, no need to create
      if (existingProfile) {
        return {};
      }

      // Create new profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        });

      if (insertError) {
        // If it's a duplicate key error, profile was created by trigger - that's fine
        if (insertError.code === '23505') {
          return {};
        }
        // Log error but don't block login - user can still use the app
        console.warn('Error creating profile:', insertError);
        return { error: insertError.message };
      }

      return {};
    })();

    // Race between profile check and timeout
    const result = await Promise.race([profileCheck, timeoutPromise]);
    
    // If timeout won, log warning but don't block
    if (result.error && result.error.includes('timeout')) {
      console.warn('Profile check timed out - user can still proceed');
      return {}; // Return success to not block login
    }

    return result;
  } catch (error) {
    // Log error but don't block login
    console.error('Exception in ensureProfile:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create profile' };
  }
}

/**
 * Fetches the user's profile from the profiles table
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}
