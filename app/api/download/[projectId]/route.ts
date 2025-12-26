/**
 * API Route: /api/download/[projectId]
 * 
 * Generates and downloads a ZIP file of the project
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getBuildByVersion, getLatestBuild } from '@/lib/buildService';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get('version');
    const projectId = params.projectId;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get build data
    const build = versionParam
      ? await getBuildByVersion(projectId, parseInt(versionParam))
      : await getLatestBuild(projectId);

    if (!build || !build.files) {
      return NextResponse.json(
        { error: 'Build not found or has no files' },
        { status: 404 }
      );
    }

    // Create ZIP file
    const zip = new JSZip();
    const files = build.files as Record<string, string>;

    // Add all files to ZIP
    for (const [filePath, content] of Object.entries(files)) {
      // Skip empty files or placeholder files
      if (!content || content.trim() === '') {
        continue;
      }
      zip.file(filePath, content);
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Get project name from package.json if available
    let projectName = 'project';
    try {
      if (files['package.json']) {
        const pkg = JSON.parse(files['package.json']);
        projectName = pkg.name || 'project';
      }
    } catch {
      // Ignore parse errors
    }

    // Return ZIP file
    return new NextResponse(zipBuffer as unknown as Blob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectName}-v${build.version}.zip"`,
      },
    });
  } catch (error) {
    console.error('API /api/download error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate ZIP file',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
