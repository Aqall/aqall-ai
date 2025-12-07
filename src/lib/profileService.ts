import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

/**
 * Creates or updates a user profile in the profiles table
 * This is called after successful signup or when a user logs in for the first time
 */
export async function ensureProfile(user: User): Promise<{ error?: string }> {
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

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
      return { error: insertError.message };
    }

    return {};
  } catch (error) {
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
