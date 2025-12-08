/**
 * API Route: /api/generate
 * 
 * Handles website generation requests using OpenAI
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSiteFromPrompt } from '@/lib/pipelineService';
import { createBuild } from '@/lib/buildService';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for OpenAI API calls

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, message, history } = body;

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
  } catch (error) {
    console.error('API /api/generate error:', error);
    
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
