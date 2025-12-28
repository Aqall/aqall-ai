/**
 * Editor Agent - Handles intelligent file editing using patches
 * 
 * This agent analyzes edit requests and applies minimal, safe changes
 * to existing files using the patch/diff system.
 */

import OpenAI from 'openai';
import { FileTools } from './workspaceService';
// Note: diff library available for future use if needed

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
};

export interface EditRequest {
  userPrompt: string;
  projectId: string;
  buildVersion: number;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface EditResult {
  filesChanged: string[];
  patches: Array<{ path: string; diff: string; summary: string }>;
  summary: string;
  success: boolean;
  errors?: string[];
}

/**
 * Analyze edit request and determine which files need changes
 */
async function analyzeEditRequest(
  userPrompt: string,
  fileTools: FileTools,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ filesToEdit: string[]; editType: string }> {
  const openai = getOpenAIClient();
  
  // List all files in workspace
  const allFiles = await fileTools.list_files();
  
  // Read App.jsx to understand what components exist
  const appJsx = await fileTools.read_file('src/App.jsx') || '';
  const componentFiles = allFiles.filter(f => f.startsWith('src/components/') && f.endsWith('.jsx'));
  
  // Extract component names from App.jsx imports and usage
  const componentImports: string[] = [];
  const importMatches = appJsx.matchAll(/import\s+(\w+)\s+from\s+['"].*components\/(\w+)['"]/g);
  for (const match of importMatches) {
    componentImports.push(match[2]); // Component file name
  }
  
  // Also check for direct component usage in JSX
  const componentUsage: string[] = [];
  const usageMatches = appJsx.matchAll(/<(\w+)\s+/g);
  for (const match of usageMatches) {
    const compName = match[1];
    if (compName && compName[0] === compName[0].toUpperCase()) {
      componentUsage.push(compName);
    }
  }
  
  // Read component files to understand their purpose AND search for text content
  const componentContext: Record<string, { content: string; fullContent: string }> = {};
  for (const compFile of componentFiles.slice(0, 15)) { // Limit to 15 for performance
    const fullContent = await fileTools.read_file(compFile);
    if (fullContent) {
      const compName = compFile.replace('src/components/', '').replace('.jsx', '');
      const firstLines = fullContent.split('\n').slice(0, 30).join('\n');
      componentContext[compName] = {
        content: firstLines.substring(0, 800), // More context
        fullContent: fullContent.substring(0, 2000), // Full content for searching
      };
    }
  }
  
  // Search for user's keywords in component content (not just file names)
  const promptLower = userPrompt.toLowerCase();
  const promptWords = promptLower.split(/\s+/).filter(w => w.length > 2); // Words longer than 2 chars
  
  // Find components that contain the user's keywords in their content
  const contentMatches: Array<{ name: string; file: string; score: number; matches: string[] }> = [];
  for (const [name, data] of Object.entries(componentContext)) {
    const contentLower = data.fullContent.toLowerCase();
    let score = 0;
    const foundMatches: string[] = [];
    
    // Check if any prompt words appear in the content
    for (const word of promptWords) {
      if (contentLower.includes(word)) {
        score += 5;
        foundMatches.push(word);
      }
    }
    
    // Check for exact phrase matches (e.g., "career highlights")
    const phraseMatch = promptLower.replace(/\s+/g, '');
    const contentNoSpaces = contentLower.replace(/\s+/g, '');
    if (contentNoSpaces.includes(phraseMatch)) {
      score += 20; // High score for exact phrase
      foundMatches.push('exact phrase');
    }
    
    // Check for heading/title patterns (h1, h2, etc. with the text)
    const headingPattern = new RegExp(`<h[1-6][^>]*>.*?${promptWords.join('.*?')}.*?</h[1-6]>`, 'i');
    if (headingPattern.test(data.fullContent)) {
      score += 15; // High score for heading matches
      foundMatches.push('heading');
    }
    
    // Check for text content in JSX
    const textPattern = new RegExp(`>.*?${promptWords.join('.*?')}.*?<`, 'i');
    if (textPattern.test(data.fullContent)) {
      score += 10;
      foundMatches.push('text content');
    }
    
    if (score > 0) {
      contentMatches.push({
        name,
        file: `src/components/${name}.jsx`,
        score,
        matches: foundMatches,
      });
    }
  }
  
  // Sort by score
  contentMatches.sort((a, b) => b.score - a.score);
  
  // Build a map of component names and their purposes
  const componentInfo = Object.entries(componentContext).map(([name, data]) => {
    // Try to extract section id or purpose from content
    const idMatch = data.content.match(/id=["']([^"']+)["']/);
    const sectionId = idMatch ? idMatch[1] : name.toLowerCase();
    
    // Extract headings/titles from content
    const headings = data.content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
    const titles = headings.map(h => h.replace(/<[^>]+>/g, '').trim()).filter(t => t.length > 0);
    
    return {
      name,
      file: `src/components/${name}.jsx`,
      sectionId,
      preview: data.content.substring(0, 300),
      titles: titles.slice(0, 5), // First 5 titles/headings
    };
  });

  const systemPrompt = `You are an expert code editor. Analyze the user's edit request and determine:
1. Which files need to be modified (ONLY files directly related to the request)
2. What type of edit this is (styling, content, structure, add-section, remove-section, etc.)

⚠️ CRITICAL RULES - BE EXTREMELY CONSERVATIVE:
- ONLY include files that are DIRECTLY mentioned or clearly required for the specific change
- Match user's request to actual components in the website (see component list below)
- If user mentions a section name (even if slightly different spelling), find the matching component
- Examples: "careerhighlights" → CareerHighlights.jsx, "about us" → About.jsx
- If user says "hero" → ONLY src/components/Hero.jsx (NOT App.jsx, NOT other components)
- If user says "button" → ONLY the file containing that specific button
- DO NOT include App.jsx unless the request explicitly requires changing the app structure (adding/removing sections)
- DO NOT include config files (package.json, vite.config.js) unless explicitly requested
- DO NOT include translation files unless language/content is being changed
- DO NOT include other component files unless they are directly mentioned
- Be EXTREMELY conservative - when in doubt, include FEWER files, not more
- Maximum 3 files unless the request explicitly requires more

ACTUAL COMPONENTS IN THIS WEBSITE:
${componentInfo.map(c => `- ${c.name} (file: ${c.file}, section id: ${c.sectionId})
  Titles/Headings: ${c.titles?.join(', ') || 'none'}
  Preview: ${c.preview}`).join('\n')}

${contentMatches.length > 0 ? `\n🔍 COMPONENTS CONTAINING YOUR REQUESTED TEXT "${userPrompt}":\n${contentMatches.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} (${c.file}) - score: ${c.score} (matches: ${c.matches.join(', ')})`).join('\n')}\n\nThese components contain text/content related to your request. Consider editing these files.` : ''}

${componentInfo.length === 0 ? '\nNo components found. Available files:\n' + allFiles.map(f => `- ${f}`).join('\n') : ''}

User request: "${userPrompt}"

IMPORTANT: 
1. If the user mentions text content (like "career highlights", "about us", etc.), search for which component CONTAINS that text, not just component file names
2. Look at the "COMPONENTS CONTAINING YOUR REQUESTED TEXT" section above - these are components that have your requested text in their content
3. If you see a component in that list, that's likely the file to edit
4. The user might be referring to a heading/title within a component, not the component name itself
5. Use fuzzy matching - "careerhighlights" could be "Career Highlights" text in any component

Return a JSON object with:
{
  "filesToEdit": ["path/to/file1", "path/to/file2"],
  "editType": "styling|content|structure|add-section|remove-section|config",
  "reasoning": "brief explanation of why each file was included, including how you matched the user's request to the component"
}

Be EXTREMELY specific - only include files that are DIRECTLY related to the user's request.`;

  // Build a helpful context message showing component matches
  // Prioritize content matches over name matches
  const contextMessage = contentMatches.length > 0
    ? `\n\n🎯 STRONG MATCHES - Components containing your text:\n${contentMatches.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} (${c.file}) - score: ${c.score}\n   Found: ${c.matches.join(', ')}`).join('\n')}\n\nThese components contain the text/content you mentioned. These are the MOST LIKELY files to edit.`
    : '';

  const messages: any[] = [
    { role: 'system', content: systemPrompt + contextMessage },
    ...(history || []).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userPrompt }
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content?.trim() || '{}';
  const analysis = JSON.parse(content);
  
  return {
    filesToEdit: analysis.filesToEdit || [],
    editType: analysis.editType || 'content',
  };
}

/**
 * Generate a patch for a specific file
 */
async function generatePatch(
  filePath: string,
  userPrompt: string,
  currentContent: string,
  editType: string,
  fileTools: FileTools,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ diff: string; summary: string }> {
  const openai = getOpenAIClient();
  
  // Read related files for context if needed
  const relatedFiles: Record<string, string> = {};
  if (filePath.includes('App.jsx')) {
    // For App.jsx, we might need component context
    const components = await fileTools.list_files('src/components/');
    for (const comp of components.slice(0, 3)) { // Limit to 3 for context
      const content = await fileTools.read_file(comp);
      if (content) {
        relatedFiles[comp] = content.substring(0, 500); // First 500 chars for context
      }
    }
  }

  const systemPrompt = `You are an expert code editor. Generate a MINIMAL unified diff patch for the file.

⚠️ CRITICAL RULES - READ CAREFULLY:
1. Generate ONLY a unified diff format patch
2. MINIMAL CHANGES ONLY - modify ONLY the specific thing requested, nothing else
3. DO NOT change unrelated sections, components, or code
4. DO NOT reformat or restructure the entire file
5. DO NOT change styling of unrelated elements
6. DO NOT add new features unless explicitly requested
7. Preserve ALL existing code that is not directly related to the request
8. Use proper diff format with @@ line numbers
9. Include context lines (unchanged lines around changes)
10. If the request is vague, make the SMALLEST possible change that satisfies it

EXAMPLE - If user says "make hero text bigger":
✅ CORRECT: Change only the text size class (e.g., text-4xl → text-6xl)
❌ WRONG: Change the entire hero section, add new features, modify other sections

EXAMPLE - If user says "change button color to blue":
✅ CORRECT: Change only the button's color class (e.g., bg-red-500 → bg-blue-500)
❌ WRONG: Change multiple buttons, modify button structure, change other styling

Unified diff format:
@@ -start,count +start,count @@
 context line
-old line
+new line
 context line

Edit type: ${editType}
Current file: ${filePath}
User request: ${userPrompt}

${Object.keys(relatedFiles).length > 0 ? `\nRelated files for context:\n${Object.entries(relatedFiles).map(([path, content]) => `\n${path}:\n${content}`).join('\n')}` : ''}

REMEMBER: Only change what was explicitly requested. Everything else must stay EXACTLY the same.

Return a JSON object:
{
  "diff": "the unified diff patch",
  "summary": "brief description of what changed"
}`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Current file content:\n\`\`\`\n${currentContent}\n\`\`\`\n\nUser request: "${userPrompt}"\n\nGenerate a MINIMAL patch that changes ONLY what was requested. Do NOT modify any other parts of the file.` }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse patch JSON:', parseError);
      throw new Error('Failed to parse AI response. Please try again.');
    }
    
    return {
      diff: result.diff || '',
      summary: result.summary || 'File modified',
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (error.status === 401) {
        throw new Error('OpenAI API key is invalid.');
      } else if (error.status === 402 || error.status === 403) {
        throw new Error('OpenAI API quota exceeded. Please check your account.');
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Regenerate file with edit applied (fallback when patches fail)
 */
async function regenerateFileWithEdit(
  filePath: string,
  userPrompt: string,
  currentContent: string,
  editType: string,
  fileTools: FileTools
): Promise<string | null> {
  const openai = getOpenAIClient();
  
  const systemPrompt = `You are an expert code editor. The user wants to edit a file, but patch application failed.
Your task: Return the COMPLETE, CORRECTED file with ONLY the requested change applied.

CRITICAL RULES:
1. Return the ENTIRE file content, not a patch
2. Apply ONLY the specific change requested by the user
3. Keep ALL other code EXACTLY the same
4. Ensure the file is valid JavaScript/JSX
5. Preserve all formatting, structure, and functionality
6. Do NOT add or remove anything except what was requested

Edit type: ${editType}
File: ${filePath}
User request: ${userPrompt}

Return a JSON object:
{
  "content": "the complete corrected file content",
  "summary": "brief description of what changed"
}`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Current file content:\n\`\`\`\n${currentContent}\n\`\`\`\n\nUser request: "${userPrompt}"\n\nReturn the complete file with ONLY the requested change applied. Everything else must stay exactly the same.` }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error(`Failed to parse regenerated file JSON for ${filePath}:`, parseError);
      return null;
    }
    
    return result.content || null;
  } catch (error) {
    console.error(`Error regenerating file ${filePath}:`, error);
    if (error instanceof OpenAI.APIError) {
      console.error(`OpenAI API error (${error.status}): ${error.message}`);
    }
    return null;
  }
}

/**
 * Validate patch before applying
 */
function validatePatch(
  currentContent: string,
  diff: string
): { valid: boolean; error?: string; preview?: string } {
  try {
    // Parse unified diff format
    const lines = diff.split('\n');
    let newContent = currentContent.split('\n');
    let lineOffset = 0;
    let inHunk = false;
    let hunkStart = 0;
    let hunkOldCount = 0;
    let hunkNewCount = 0;
    let hunkLine = 0;

    for (const line of lines) {
      // Match hunk header: @@ -start,count +start,count @@
      const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (hunkMatch) {
        inHunk = true;
        hunkStart = parseInt(hunkMatch[1]) - 1; // Convert to 0-based
        hunkOldCount = parseInt(hunkMatch[2] || '1');
        hunkNewCount = parseInt(hunkMatch[4] || '1');
        hunkLine = 0;
        lineOffset = 0;
        continue;
      }

      if (!inHunk) continue;

      if (line.startsWith(' ')) {
        // Context line - verify it matches
        const expectedLine = newContent[hunkStart + hunkLine + lineOffset];
        if (expectedLine !== line.substring(1)) {
          return {
            valid: false,
            error: `Context mismatch at line ${hunkStart + hunkLine + 1}: expected "${expectedLine}", got "${line.substring(1)}"`,
          };
        }
        hunkLine++;
      } else if (line.startsWith('-')) {
        // Deletion - verify line exists
        const expectedLine = newContent[hunkStart + hunkLine + lineOffset];
        if (expectedLine !== line.substring(1)) {
          return {
            valid: false,
            error: `Deletion mismatch at line ${hunkStart + hunkLine + 1}: expected "${expectedLine}", got "${line.substring(1)}"`,
          };
        }
        newContent.splice(hunkStart + hunkLine + lineOffset, 1);
        lineOffset--;
        hunkLine++;
      } else if (line.startsWith('+')) {
        // Addition
        newContent.splice(hunkStart + hunkLine + lineOffset + 1, 0, line.substring(1));
        lineOffset++;
        hunkLine++;
      }
    }

    return {
      valid: true,
      preview: newContent.join('\n'),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Apply edits to workspace files
 */
export async function applyEdits(
  request: EditRequest,
  fileTools: FileTools
): Promise<EditResult> {
  const { userPrompt, history } = request;
  
  console.log('✏️  Editor Agent: Analyzing edit request...');
  
  // Step 1: Analyze which files need editing
  const analysis = await analyzeEditRequest(userPrompt, fileTools, history);
  console.log(`📝 Files to edit: ${analysis.filesToEdit.join(', ')}`);
  console.log(`🔧 Edit type: ${analysis.editType}`);
  
  // Safety check: limit number of files to prevent over-editing
  if (analysis.filesToEdit.length > 5) {
    console.warn(`⚠️  WARNING: Too many files identified (${analysis.filesToEdit.length}). Limiting to first 5.`);
    analysis.filesToEdit = analysis.filesToEdit.slice(0, 5);
  }
  
  // Filter out config files unless explicitly requested
  const configKeywords = ['package.json', 'vite.config', 'tailwind.config', 'postcss.config'];
  const hasConfigRequest = userPrompt.toLowerCase().includes('config') || 
                          userPrompt.toLowerCase().includes('dependency') ||
                          userPrompt.toLowerCase().includes('package');
  
  if (!hasConfigRequest) {
    analysis.filesToEdit = analysis.filesToEdit.filter(f => 
      !configKeywords.some(keyword => f.includes(keyword))
    );
  }
  
  // Filter out App.jsx unless structure change is needed
  const hasStructureRequest = userPrompt.toLowerCase().includes('section') ||
                              userPrompt.toLowerCase().includes('add') ||
                              userPrompt.toLowerCase().includes('remove') ||
                              userPrompt.toLowerCase().includes('reorder');
  
  if (!hasStructureRequest && analysis.filesToEdit.includes('src/App.jsx')) {
    console.log(`ℹ️  Removing App.jsx from edit list (not a structure change)`);
    analysis.filesToEdit = analysis.filesToEdit.filter(f => f !== 'src/App.jsx');
  }
  
  console.log(`✅ Final files to edit: ${analysis.filesToEdit.join(', ')}`);

  const filesChanged: string[] = [];
  const patches: Array<{ path: string; diff: string; summary: string }> = [];
  const errors: string[] = [];

  // Step 2: Generate and apply patches for each file
  for (const filePath of analysis.filesToEdit) {
    try {
      const currentContent = await fileTools.read_file(filePath);
      
      if (!currentContent) {
        errors.push(`File ${filePath} not found`);
        continue;
      }

      // Generate patch
      console.log(`🔨 Generating patch for ${filePath}...`);
      const { diff, summary } = await generatePatch(
        filePath,
        userPrompt,
        currentContent,
        analysis.editType,
        fileTools,
        history
      );

      if (!diff || diff.trim().length === 0) {
        errors.push(`No patch generated for ${filePath}`);
        continue;
      }

      // Validate patch
      console.log(`✅ Validating patch for ${filePath}...`);
      const validation = validatePatch(currentContent, diff);
      
      // Count context mismatches by checking the diff structure
      // If validation fails, regenerate the file instead
      if (!validation.valid) {
        console.warn(`⚠️  Patch validation failed or too many mismatches for ${filePath}. Regenerating file instead...`);
        
        // Regenerate the entire file with the edit applied
        const regeneratedContent = await regenerateFileWithEdit(
          filePath,
          userPrompt,
          currentContent,
          analysis.editType,
          fileTools
        );
        
        if (regeneratedContent) {
          await fileTools.write_file(filePath, regeneratedContent);
          filesChanged.push(filePath);
          patches.push({ 
            path: filePath, 
            diff: `[File regenerated with edit applied]`, 
            summary: `Regenerated ${filePath} with requested changes` 
          });
          console.log(`✅ Successfully regenerated ${filePath}`);
          continue;
        } else {
          errors.push(`Failed to regenerate ${filePath} after patch validation failed`);
          continue;
        }
      }

      // Check if patch changes too much (more than 30% of file = probably wrong)
      if (validation.preview) {
        const originalLines = currentContent.split('\n').length;
        const newLines = validation.preview.split('\n').length;
        const changedLines = Math.abs(originalLines - newLines);
        const changePercentage = (changedLines / originalLines) * 100;
        
        if (changePercentage > 30) {
          console.warn(`⚠️  WARNING: Patch changes ${changePercentage.toFixed(1)}% of file ${filePath}. Regenerating instead...`);
          // Regenerate instead of applying large patch
          const regeneratedContent = await regenerateFileWithEdit(
            filePath,
            userPrompt,
            currentContent,
            analysis.editType,
            fileTools
          );
          
          if (regeneratedContent) {
            await fileTools.write_file(filePath, regeneratedContent);
            filesChanged.push(filePath);
            patches.push({ 
              path: filePath, 
              diff: `[File regenerated - patch was too large]`, 
              summary: `Regenerated ${filePath} with requested changes` 
            });
            console.log(`✅ Successfully regenerated ${filePath}`);
            continue;
          }
        }
      }

      // Apply patch only if validation passed
      if (validation.valid && validation.preview) {
        // Use the validated preview instead of applying patch
        await fileTools.write_file(filePath, validation.preview);
        filesChanged.push(filePath);
        patches.push({ path: filePath, diff, summary });
        console.log(`✅ Successfully edited ${filePath}`);
      } else {
        // Validation failed - use regeneration fallback
        console.warn(`⚠️  Patch validation failed for ${filePath}. Using regeneration fallback...`);
        const regeneratedContent = await regenerateFileWithEdit(
          filePath,
          userPrompt,
          currentContent,
          analysis.editType,
          fileTools
        );
        
        if (regeneratedContent) {
          await fileTools.write_file(filePath, regeneratedContent);
          filesChanged.push(filePath);
          patches.push({ 
            path: filePath, 
            diff: `[File regenerated - patch validation failed]`, 
            summary: `Regenerated ${filePath} with requested changes` 
          });
          console.log(`✅ Successfully regenerated ${filePath}`);
        } else {
          errors.push(`Failed to regenerate ${filePath} after patch validation failed`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to edit ${filePath}: ${errorMsg}`);
      console.error(`❌ Error editing ${filePath}:`, error);
    }
  }

  // Generate summary
  const summary = patches.length > 0
    ? `Edited ${patches.length} file(s): ${patches.map(p => p.path).join(', ')}. ${patches.map(p => p.summary).join('; ')}.`
    : 'No files were modified.';

  return {
    filesChanged,
    patches,
    summary,
    success: errors.length === 0 && filesChanged.length > 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

