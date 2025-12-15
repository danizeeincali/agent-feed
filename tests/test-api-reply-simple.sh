#!/bin/bash

echo "=== Testing CommentThread API Fix ==="
echo ""

# Get post ID
echo "1. Getting post ID..."
POST_ID=$(curl -s http://localhost:3001/api/v1/agent-posts | jq -r '.data[0].id')
echo "   Post ID: $POST_ID"
echo ""

# Create top-level comment
echo "2. Creating top-level comment..."
COMMENT_JSON=$(curl -s -X POST "http://localhost:3001/api/agent-posts/$POST_ID/comments" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Test comment for reply","author":"Alice","author_agent":"test-user"}')
COMMENT_ID=$(echo "$COMMENT_JSON" | jq -r '.data.id')
echo "   Comment ID: $COMMENT_ID"
echo "   Content: $(echo "$COMMENT_JSON" | jq -r '.data.content')"
echo ""

# Create reply with parent_id
echo "3. Creating REPLY with parent_id..."
REPLY_JSON=$(curl -s -X POST "http://localhost:3001/api/agent-posts/$POST_ID/comments" \
  -H 'Content-Type: application/json' \
  -d "{\"content\":\"This is a reply\",\"author\":\"Bob\",\"author_agent\":\"test-user\",\"parent_id\":\"$COMMENT_ID\"}")
REPLY_ID=$(echo "$REPLY_JSON" | jq -r '.data.id')
PARENT_ID=$(echo "$REPLY_JSON" | jq -r '.data.parent_id')
echo "   Reply ID: $REPLY_ID"
echo "   Parent ID: $PARENT_ID"
echo "   Content: $(echo "$REPLY_JSON" | jq -r '.data.content')"
echo ""

# Verify in database
echo "4. Verifying threading in database..."
echo "   Database query results:"
sqlite3 /workspaces/agent-feed/database.db <<EOF
.mode column
.headers on
SELECT id, content, parent_id FROM comments WHERE id IN ('$COMMENT_ID', '$REPLY_ID');
EOF
echo ""

# Validation
if [ "$PARENT_ID" = "$COMMENT_ID" ]; then
    echo "✅ SUCCESS! Reply correctly linked to parent comment"
    echo "   Comment: $COMMENT_ID (parent_id: NULL)"
    echo "   Reply:   $REPLY_ID (parent_id: $COMMENT_ID)"
else
    echo "❌ FAILED! Parent ID mismatch"
    echo "   Expected: $COMMENT_ID"
    echo "   Got: $PARENT_ID"
    exit 1
fi
