/**
 * API Route: /api/generate
 * 
 * Handles website generation requests using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSiteFromPrompt } from '@/lib/pipelineService';
import { createBuild } from '@/lib/buildService';
import { lockProject, unlockProject } from '@/lib/buildLockService';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for OpenAI API calls

export async function POST(request: NextRequest) {
  let projectId: string | null = null;
  
  try {
    const body = await request.json();
    const { projectId: bodyProjectId, message, history } = body;
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
    // Note: We use a placeholder user_id since getting it requires proper auth context
    // The lock mechanism works on build_status, and RLS will enforce ownership when we try to update
    // If locking fails, we'll proceed anyway (lock is best-effort, RLS provides the real security)
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
