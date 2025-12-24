#!/bin/bash

# Simple test script for Phase 5 Edit API
# Usage: ./test-edit.sh <projectId> "your edit request"

PROJECT_ID=$1
MESSAGE=$2

if [ -z "$PROJECT_ID" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./test-edit.sh <projectId> \"your edit request\""
  echo "Example: ./test-edit.sh abc123 \"Make the hero text bigger\""
  exit 1
fi

echo "🧪 Testing Edit API..."
echo "Project ID: $PROJECT_ID"
echo "Edit Request: $MESSAGE"
echo ""

curl -X POST http://localhost:3000/api/edit \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"message\": \"$MESSAGE\"
  }" \
  | jq '.'

echo ""
echo "✅ Test complete!"

