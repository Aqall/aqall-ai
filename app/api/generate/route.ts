/**
 * API Route: /api/generate
 * 
 * Handles website generation requests using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSiteFromPrompt } from '@/lib/pipelineService';
import { createBuild } from '@/lib/buildService';
import { lockProject, unlockProject } from '@/lib/buildLockService';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for OpenAI API calls

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
  let projectId: string | null = null;
  
  try {
    // Authenticate user
    const supabase = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to continue.' },
        { status: 401 }
      );
    }

    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { projectId: bodyProjectId, message, history } = body;
    projectId = bodyProjectId;

    // Validate input
    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and message are required' },
        { status: 400 }
      );
    }

    // Validate projectId format (should be UUID)
    if (typeof projectId !== 'string' || !isValidUUID(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      );
    }

    // Validate message
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate message length (prevent extremely long messages)
    if (message.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long. Maximum 10,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Validate history if provided
    if (history && (!Array.isArray(history) || history.length > 50)) {
      return NextResponse.json(
        { error: 'Invalid history format or too many history entries (max 50)' },
        { status: 400 }
      );
    }

    // Verify project ownership using authenticated client (RLS will enforce)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Try to lock the project (now with authenticated user)
    const lockAcquired = await lockProject(projectId, user.id);
    if (!lockAcquired) {
      return NextResponse.json(
        { 
          error: 'Project is currently being processed. Please wait for the current operation to complete.',
          code: 'PROJECT_LOCKED'
        },
        { status: 409 } // Conflict status
      );
    }

    try {
      // Generate website using Lovable-style pipeline (Planner → Architect → Coder)
      const result = await generateSiteFromPrompt({
        projectId,
        message: message.trim(),
        history: history || [],
      });

      // Create build with files
      const buildResult = await createBuild({
        projectId,
        prompt: message.trim(),
        files: result.files,
        summary: result.summary,
        languageMode: result.languageMode,
      });

      return NextResponse.json({
        success: true,
        projectId: buildResult.project_id,
        version: buildResult.version,
        files: result.files,
        summary: result.summary,
        languageMode: result.languageMode,
        sections: result.sections,
        previewHtml: buildResult.preview_html,
        createdAt: buildResult.created_at,
      });
    } finally {
      // Always unlock the project, even if there's an error
      if (projectId) {
        await unlockProject(projectId);
      }
    }
  } catch (error) {
    console.error('API /api/generate error:', error);
    
    // Ensure unlock even on error
    if (projectId) {
      await unlockProject(projectId);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate website',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
