/**
 * Server-side Supabase client for API routes
 * This creates a Supabase client that can read auth from request headers/cookies
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

/**
 * Create a server-side Supabase client for API routes
 * Reads auth session from cookies in the request
 */
export function createServerSupabaseClient(request: NextRequest) {
  // Try to get the access token from cookies
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  
  // Get Supabase auth token from cookies
  const accessToken = cookies['sb-access-token'] || 
                     cookies[`sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`] ||
                     extractTokenFromCookie(cookieHeader);
  
  // Create Supabase client
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

/**
 * Parse cookie string into object
 */
function parseCookies(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
}

/**
 * Extract Supabase access token from cookie string
 */
function extractTokenFromCookie(cookieString: string): string | null {
  // Supabase stores the session in a cookie, we need to parse it
  // The cookie format is usually: sb-<project-ref>-auth-token=<json>
  const match = cookieString.match(/sb-[\w-]+-auth-token=([^;]+)/);
  if (!match) return null;
  
  try {
    const cookieValue = decodeURIComponent(match[1]);
    const session = JSON.parse(cookieValue);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

