# Testing Phase 5 - Edit Functionality

## Quick Test Methods

### Method 1: Using the UI (Easiest)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Create a project and generate a site:**
   - Go to `/dashboard`
   - Create a new project
   - Go to the build chat page
   - Generate a website (e.g., "Create a restaurant website")

3. **Test editing:**
   - In the same chat, type an edit request like:
     - "Make the hero text bigger"
     - "Change the button color to blue"
     - "Add a testimonials section"
   - The system will automatically use `/api/edit` since you have an existing build

### Method 2: Using the Test Script

1. **Get a project ID:**
   - Create a project in the UI
   - Copy the project ID from the URL: `/build/[projectId]`

2. **Run the test script:**
   ```bash
   ./test-edit.sh <projectId> "Make the hero text bigger"
   ```

   Example:
   ```bash
   ./test-edit.sh abc-123-def "Change button color to blue"
   ```

### Method 3: Using curl Directly

```bash
curl -X POST http://localhost:3000/api/edit \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "message": "Make the hero text bigger and change button to blue"
  }'
```

### Method 4: Using Browser Console

1. Open your browser's developer console (F12)
2. Navigate to a project's build page
3. Run:
   ```javascript
   fetch('/api/edit', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       projectId: 'your-project-id',
       message: 'Make the hero text bigger'
     })
   })
   .then(r => r.json())
   .then(console.log)
   ```

## What to Expect

### Successful Edit Response:
```json
{
  "success": true,
  "projectId": "...",
  "version": 2,
  "filesChanged": ["src/components/Hero.jsx"],
  "patches": [
    {
      "path": "src/components/Hero.jsx",
      "diff": "@@ -5,3 +5,3 @@\n...",
      "summary": "Increased hero text size"
    }
  ],
  "summary": "Edited 1 file(s): src/components/Hero.jsx. Increased hero text size.",
  "previewHtml": "...",
  "errors": null
}
```

### Error Response:
```json
{
  "error": "Failed to edit website",
  "message": "No builds found for this project. Please generate a site first."
}
```

## Test Cases

### ✅ Simple Styling Changes
- "Make the hero text bigger"
- "Change button color to blue"
- "Add more padding to the header"

### ✅ Content Changes
- "Change the hero title to 'Welcome'"
- "Update the about section text"

### ✅ Structural Changes
- "Add a testimonials section"
- "Remove the features section"
- "Add a pricing section after the features"

### ✅ Multiple File Changes
- "Make all buttons blue and increase hero text size"
- "Change the navbar color and footer text"

## Troubleshooting

### "No builds found"
- Make sure you've generated at least one build first using `/api/generate`

### "Patch validation failed"
- The system will try to apply anyway with fallback logic
- Check console logs for details

### "No files were modified"
- The edit request might be too vague
- Try being more specific: "Change the hero h1 text size from text-4xl to text-6xl"

## Debugging

Check server logs for:
- `✏️  Editor Agent: Analyzing edit request...`
- `📝 Files to edit: ...`
- `🔨 Generating patch for ...`
- `✅ Successfully edited ...`

These logs show the edit pipeline working step by step.

