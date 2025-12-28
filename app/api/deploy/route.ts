/**
 * API Route: /api/deploy
 * 
 * Deploys a project build to Netlify
 */

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { getLatestBuild, getBuildByVersion, generatePreviewHTML } from '@/lib/buildService';
import { createNetlifySite, deployZipToNetlify, generateSiteName, getLatestDeployment } from '@/lib/netlifyService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const runtime = 'nodejs';
export const maxDuration = 60; // Deployments can take time

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, buildVersion, redeploy, userId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Validate userId is provided
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client using access token from Authorization header
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

    // Get project to verify ownership (RLS will enforce this with the authenticated client)
    // Query directly to ensure we use the authenticated client
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      // RLS might block if userId doesn't match, or project doesn't exist
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get build data
    const build = buildVersion
      ? await getBuildByVersion(projectId, buildVersion)
      : await getLatestBuild(projectId);

    if (!build || !build.files) {
        return NextResponse.json(
        { error: 'Build not found or has no files' },
          { status: 404 }
        );
      }

    // Check if deployment already exists
    let existingDeployment = null;
    if (redeploy) {
      const { data: existing } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      existingDeployment = existing;
    }

    let siteId: string;
    let deploymentId: string;
    let deployUrl: string;

    // If redeploying and we have an existing site, use it
    if (redeploy && existingDeployment?.netlify_site_id) {
      siteId = existingDeployment.netlify_site_id;
    } else {
      // Create new Netlify site
      const siteName = generateSiteName(project.name);
      const site = await createNetlifySite(siteName);
      siteId = site.site_id;
    }

    // Create ZIP file from build files
    const zip = new JSZip();
    const files = build.files as Record<string, string>;

    // Add all files to ZIP (but skip source files - we'll use static HTML instead)
    let fileCount = 0;
    for (const [filePath, content] of Object.entries(files)) {
      // Skip empty files
      if (!content || content.trim() === '') {
        continue;
      }
      
      // Skip React source files (src/, package.json, vite config, etc.) 
      // We'll deploy static HTML instead
      if (filePath.startsWith('src/') || 
          filePath === 'package.json' || 
          filePath.includes('vite.config') ||
          filePath.includes('tailwind.config') ||
          filePath.includes('postcss.config')) {
        continue;
      }
      
      zip.file(filePath, content);
      fileCount++;
    }

    // Always regenerate preview HTML to ensure it has the latest fixes
    // Try to detect language mode from files
    let languageMode = 'english-only';
    if (files['src/locales/ar.json'] && files['src/i18n.js']) {
      languageMode = 'bilingual';
    } else if (files['src/App.jsx']?.includes('dir="rtl"') || files['src/App.jsx']?.includes("dir='rtl'")) {
      languageMode = 'arabic-only';
    }
    
    // Generate fresh preview HTML (this will have all the latest fixes)
    const previewHtml = generatePreviewHTML(files, languageMode);
    zip.file('index.html', previewHtml);
    console.log('Generated and added index.html (preview HTML) to deployment');
    
    // Add Netlify headers file to ensure proper Content-Type for HTML files
    // Netlify _headers format: path headers
    const headersFile = `/*
  Content-Type: text/html; charset=UTF-8

/index.html
  Content-Type: text/html; charset=UTF-8
`;
    zip.file('_headers', headersFile);
    console.log('Added _headers file for proper Content-Type');
    
    fileCount += 2; // Count index.html and _headers

    console.log(`Creating ZIP with ${fileCount} files (including index.html)`);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    console.log(`ZIP created: ${zipBuffer.length} bytes, ${fileCount} files`);

    // Validate ZIP is not empty
    if (zipBuffer.length === 0) {
      throw new Error('Generated ZIP file is empty');
    }

    if (fileCount === 0) {
      throw new Error('No files to deploy');
    }

    // Update deployment status to 'building'
    const deploymentStatus = redeploy && existingDeployment ? 'building' : 'pending';
    
    let deploymentRecord;
    if (redeploy && existingDeployment) {
      // Update existing deployment
      const { data, error } = await supabase
        .from('deployments')
        .update({
          build_id: build.id,
          status: 'building',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDeployment.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating deployment:', error);
        throw new Error('Failed to update deployment record');
      }
      deploymentRecord = data;
    } else {
      // Create new deployment record
      const { data, error } = await supabase
        .from('deployments')
        .insert({
          project_id: projectId,
          build_id: build.id,
          netlify_site_id: siteId,
          status: 'building',
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating deployment:', error);
        throw new Error('Failed to create deployment record');
      }
      deploymentRecord = data;
      }

      // Deploy to Netlify
    console.log('Deploying to Netlify site:', siteId);
    console.log('ZIP buffer size:', zipBuffer.length, 'bytes');
    
    const deploy = await deployZipToNetlify(siteId, zipBuffer);
    console.log('Deploy response:', JSON.stringify(deploy, null, 2));
    
    // Netlify API returns different field names depending on the endpoint
    deploymentId = deploy.id || deploy.deploy_id || deploy.deployId;
    deployUrl = deploy.deploy_url || deploy.url || deploy.ssl_url || deploy.site_url;
    
    console.log('Deployment ID:', deploymentId);
    console.log('Deploy URL:', deployUrl);

    // Wait a bit for Netlify to process, then check status
    // Netlify deployments are usually quick for static sites
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get latest deployment status
    console.log('Checking deployment status...');
    const latestDeploy = await getLatestDeployment(siteId);
    console.log('Latest deploy status:', latestDeploy);
    
    const finalStatus = latestDeploy?.state === 'ready' ? 'ready' : 
                       latestDeploy?.state === 'error' ? 'error' : 
                       latestDeploy?.state === 'building' ? 'building' : 'building';
    const finalUrl = latestDeploy?.deploy_url || latestDeploy?.url || latestDeploy?.ssl_url || deployUrl;
    
    console.log('Final status:', finalStatus);
    console.log('Final URL:', finalUrl);

    // Update deployment record with final status
    const { error: updateError } = await supabase
      .from('deployments')
      .update({
        netlify_deploy_id: deploymentId,
        url: finalUrl,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deploymentRecord.id);

    if (updateError) {
      console.error('Error updating deployment status:', updateError);
      // Don't fail the request, deployment was successful
    }

      return NextResponse.json({
        success: true,
        deployment: {
        id: deploymentRecord.id,
        url: finalUrl,
        status: finalStatus,
        siteId,
        deployId: deploymentId,
        },
      });
  } catch (error) {
    console.error('API /api/deploy error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to deploy to Netlify',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
