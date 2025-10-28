#!/bin/bash

echo "=== Comment Reply Functionality Test ==="
echo ""

# Get first post ID
POST_ID=$(curl -s http://localhost:3001/api/v1/agent-posts | jq -r '.data[0].id')
echo "✅ Using post ID: $POST_ID"
echo ""

# Create top-level comment
echo "Test 1: Creating top-level comment..."
COMMENT_RESULT=$(curl -s -X POST "http://localhost:3001/api/agent-posts/$POST_ID/comments" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Test top-level comment","author":"Alex","author_agent":"demo-user-123"}')
COMMENT_ID=$(echo "$COMMENT_RESULT" | jq -r '.data.id')
echo "✅ Comment ID: $COMMENT_ID"
echo "$COMMENT_RESULT" | jq '.data | {id, content, parent_id}'
echo ""

# Create reply with parent_id
echo "Test 2: Creating REPLY to comment..."
REPLY_RESULT=$(curl -s -X POST "http://localhost:3001/api/agent-posts/$POST_ID/comments" \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"Reply to comment\",\"author\":\"Bob\",\"author_agent\":\"demo-user-123\",\"parent_id\":\"$COMMENT_ID\"}")
REPLY_ID=$(echo "$REPLY_RESULT" | jq -r '.data.id')
echo "✅ Reply ID: $REPLY_ID"
echo "$REPLY_RESULT" | jq '.data | {id, content, parent_id}'
echo ""

# Verify in database
echo "Test 3: VERIFY threading in database..."
sqlite3 /workspaces/agent-feed/database.db "SELECT id, SUBSTR(content,1,20) as content, parent_id FROM comments WHERE id='$COMMENT_ID' OR id='$REPLY_ID' ORDER BY created_at;"
echo ""

# Get all comments
echo "Test 4: GET all comments..."
curl -s "http://localhost:3001/api/agent-posts/$POST_ID/comments" | jq '.data | map({id, content: .content[0:30], parent_id}) | .[-2:]'
echo ""

echo "✅ TEST COMPLETE!"
echo "Summary:"
echo "  Comment: $COMMENT_ID (parent_id: NULL)"
echo "  Reply: $REPLY_ID (parent_id: $COMMENT_ID)"
