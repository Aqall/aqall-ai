/**
 * API Route: /api/edit
 * 
 * Handles website editing requests using the Editor Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { editSiteFromPrompt } from '@/lib/editService';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for OpenAI API calls

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, message, history, buildVersion } = body;

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
  } catch (error) {
    console.error('API /api/edit error:', error);
    
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

