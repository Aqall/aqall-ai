/**
 * API Route: /api/edit
 * 
 * Handles website editing requests using the Editor Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { editSiteFromPrompt } from '@/lib/editService';
import { lockProject, unlockProject } from '@/lib/buildLockService';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getConversationHistoryForAI, saveMessage } from '@/lib/conversationService';

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
    
    const { projectId: bodyProjectId, message, history, buildVersion } = body;
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

    // Validate buildVersion if provided
    if (buildVersion !== undefined && (typeof buildVersion !== 'number' || buildVersion < 1 || !Number.isInteger(buildVersion))) {
      return NextResponse.json(
        { error: 'Invalid build version. Must be a positive integer.' },
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
      // Load conversation history from database for context
      // Use provided history if available (for backward compatibility), otherwise load from DB
      let conversationHistory = history || [];
      if (!history || history.length === 0) {
        // Load from database - use authenticated client
        const historyMessages = await getConversationHistoryForAI(projectId, 30);
        conversationHistory = historyMessages;
      }

      // Save user message to conversation history
      await saveMessage({
        projectId,
        role: 'user',
        content: message.trim(),
      });

      // Edit website using Editor Agent
      const result = await editSiteFromPrompt({
        projectId,
        message: message.trim(),
        history: conversationHistory,
        buildVersion: buildVersion || undefined,
      });

      // Save assistant response to conversation history
      if (result.success) {
        await saveMessage({
          projectId,
          role: 'assistant',
          content: result.summary || 'Website edited successfully',
          buildVersion: result.version,
        });
      }

      return NextResponse.json({
        success: result.success,
        projectId,
        version: result.version,
        files: result.files,
        summary: result.summary,
        filesChanged: result.filesChanged,
        patches: result.patches,
        previewHtml: result.previewHtml,
        errors: result.errors,
        createdAt: new Date().toISOString(),
      });
    } finally {
      // Always unlock the project, even if there's an error
      if (projectId) {
        await unlockProject(projectId);
      }
    }
  } catch (error) {
    console.error('API /api/edit error:', error);
    
    // Ensure unlock even on error
    if (projectId) {
      await unlockProject(projectId);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to edit website',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

