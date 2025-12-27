/**
 * Netlify Service - Handles Netlify API integration for deployments
 * 
 * This service provides functions to:
 * - Create Netlify sites
 * - Deploy files to Netlify
 * - Check deployment status
 */

import FormData from 'form-data';

const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN;
const NETLIFY_API_BASE = 'https://api.netlify.com/api/v1';

if (!NETLIFY_API_TOKEN) {
  console.warn('NETLIFY_API_TOKEN not set - Netlify deployments will not work');
}

interface ProjectFiles {
  [filePath: string]: string;
}

interface NetlifySite {
  id: string;
  site_id: string;
  name: string;
  url: string;
  ssl_url: string;
}

interface NetlifyDeploy {
  id?: string;
  deploy_id?: string;
  deployId?: string;
  state?: 'new' | 'building' | 'ready' | 'error';
  url?: string;
  deploy_url?: string;
  ssl_url?: string;
  site_url?: string;
  [key: string]: any; // Allow other fields from Netlify API
}

/**
 * Create a new Netlify site
 */
export async function createNetlifySite(siteName: string): Promise<NetlifySite> {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN is not configured');
  }

  const response = await fetch(`${NETLIFY_API_BASE}/sites`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: siteName,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Netlify site: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Deploy files to a Netlify site using the Deploy API
 * This creates a ZIP file from the project files and deploys it
 */
export async function deployToNetlify(
  siteId: string,
  files: ProjectFiles
): Promise<NetlifyDeploy> {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN is not configured');
  }

  // Convert files to a structure that Netlify can accept
  // Netlify expects a ZIP file or a manifest of files
  // For simplicity, we'll create a manifest and let Netlify handle it
  
  // Create a FormData with all files
  const formData = new FormData();
  
  // Add files to FormData
  // Netlify expects files as form fields where key is the file path
  for (const [filePath, content] of Object.entries(files)) {
    // Create a Blob from the file content
    const blob = new Blob([content], { type: 'text/plain' });
    formData.append(filePath, blob, filePath.split('/').pop() || 'file');
  }

  // Netlify Deploy API: POST /sites/{site_id}/deploys
  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to deploy to Netlify: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Alternative: Deploy using ZIP file (recommended for better compatibility)
 * This method creates a ZIP buffer and sends it to Netlify
 * Works in Node.js environment (API routes)
 * 
 * According to Netlify API docs, ZIP files can be sent directly as the body
 * with Content-Type: application/zip, or as multipart/form-data with file field
 */
export async function deployZipToNetlify(
  siteId: string,
  zipBuffer: Buffer | ArrayBuffer
): Promise<NetlifyDeploy> {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN is not configured');
  }

  // Convert ArrayBuffer to Buffer if needed
  const buffer = Buffer.isBuffer(zipBuffer) 
    ? zipBuffer 
    : Buffer.from(zipBuffer);

  console.log(`Uploading ZIP file to Netlify (${buffer.length} bytes) for site ${siteId}`);

  // Try method 1: Send ZIP directly as body with Content-Type: application/zip
  // This is simpler and often works better
  try {
    const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
        'Content-Type': 'application/zip',
      },
      body: buffer,
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Netlify deploy success (direct ZIP), response:', JSON.stringify(result, null, 2));
      return result;
    } else {
      const errorText = await response.text();
      console.warn('Direct ZIP upload failed, trying multipart/form-data:', errorText);
      // Fall through to multipart method
    }
  } catch (error) {
    console.warn('Direct ZIP upload error, trying multipart/form-data:', error);
    // Fall through to multipart method
  }

  // Method 2: Use multipart/form-data (fallback)
  const formData = new FormData();
  
  // Append the ZIP buffer as a file
  formData.append('file', buffer, {
    filename: 'deploy.zip',
    contentType: 'application/zip',
  });

  // Get the boundary for the Content-Type header
  const headers = {
    'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
    ...formData.getHeaders(), // This adds Content-Type with boundary
  };

  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: headers as HeadersInit,
    body: formData as unknown as BodyInit,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Netlify deploy error response:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      siteId,
      zipSize: buffer.length,
    });
    throw new Error(`Failed to deploy ZIP to Netlify: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('Netlify deploy success (multipart), response:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  siteId: string,
  deployId: string
): Promise<NetlifyDeploy> {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN is not configured');
  }

  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys/${deployId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get deployment status: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Get the latest deployment for a site
 */
export async function getLatestDeployment(siteId: string): Promise<NetlifyDeploy | null> {
  if (!NETLIFY_API_TOKEN) {
    throw new Error('NETLIFY_API_TOKEN is not configured');
  }

  const response = await fetch(`${NETLIFY_API_BASE}/sites/${siteId}/deploys?per_page=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NETLIFY_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get latest deployment: ${response.status} ${error}`);
  }

  const deploys = await response.json();
  return deploys && deploys.length > 0 ? deploys[0] : null;
}

/**
 * Generate a unique site name from project name
 */
export function generateSiteName(projectName: string): string {
  // Netlify site names must be lowercase, alphanumeric, and can contain hyphens
  // Max 63 characters
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Leave room for random suffix
  
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `${sanitized}-${randomSuffix}`;
}
