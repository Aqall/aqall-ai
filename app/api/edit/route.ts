/**
 * API Route: /api/edit
 * 
 * Handles website editing requests using the Editor Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { editSiteFromPrompt } from '@/lib/editService';
import { lockProject, unlockProject } from '@/lib/buildLockService';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for OpenAI API calls

export async function POST(request: NextRequest) {
  let projectId: string | null = null;
  
  try {
    const body = await request.json();
    const { projectId: bodyProjectId, message, history, buildVersion } = body;
    projectId = bodyProjectId;

    // Validate input
    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and message are required' },
        { status: 400 }
      );
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message must be a non-empty string' },
        { status: 400 }
      );
    }

    // Try to lock the project
    // Note: We use a placeholder user_id since we can't easily get it in API routes
    // The lock mechanism works on build_status, and RLS will enforce ownership when we try to update
    const lockAcquired = await lockProject(projectId, 'api-route');
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
      // Edit website using Editor Agent
      const result = await editSiteFromPrompt({
        projectId,
        message: message.trim(),
        history: history || [],
        buildVersion: buildVersion || undefined,
      });

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

