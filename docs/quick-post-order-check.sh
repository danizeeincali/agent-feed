#!/bin/bash
# Quick Post Order Validation Script
# This script checks if posts are in the correct order

echo "=================================="
echo "POST ORDER VALIDATION"
echo "=================================="
echo ""

echo "1. Checking API Response..."
echo "----------------------------"
API_RESPONSE=$(curl -s http://localhost:3000/api/posts)
echo "$API_RESPONSE" | python3 -m json.tool | grep -E '"title"|"author"|"priority"' | head -15

echo ""
echo "2. Checking Database..."
echo "----------------------------"
sqlite3 /workspaces/agent-feed/database.db <<EOF
.mode column
.headers on
SELECT
    id,
    title,
    author,
    priority,
    datetime(created_at/1000, 'unixepoch') as created_time
FROM posts
ORDER BY priority DESC, created_at DESC
LIMIT 3;
EOF

echo ""
echo "3. Expected Order:"
echo "----------------------------"
echo "1. Welcome to Agent Feed! (Λvi) - Priority: 100"
echo "2. Hi! Let's Get Started (Get-to-Know-You) - Priority: 90"
echo "3. 📚 How Agent Feed Works (System Guide) - Priority: 80"

echo ""
echo "4. Frontend Status:"
echo "----------------------------"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
echo "Frontend HTTP Status: $FRONTEND_STATUS"
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is accessible at http://localhost:5173"
else
    echo "❌ Frontend is not accessible"
fi

echo ""
echo "=================================="
echo "Manual verification required at:"
echo "http://localhost:5173"
echo "=================================="
