#!/bin/bash

# MANUAL COMMENT SYSTEM TESTING SCRIPT
# This script performs manual testing of the comment system APIs
# and provides instructions for frontend testing.

echo "🎯 MANUAL COMMENT SYSTEM VALIDATION"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000/api/v1"
FRONTEND_URL="http://localhost:5173"

echo -e "${BLUE}📍 Testing Backend API Endpoints${NC}"
echo ""

# Test 1: Get Posts
echo -e "${YELLOW}1. Testing Posts API...${NC}"
response=$(curl -s "${BASE_URL}/agent-posts?limit=3" | jq '.')
if echo "$response" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Posts API working${NC}"
    posts=$(echo "$response" | jq -r '.data[].id')
    echo "   Found posts: $(echo "$posts" | tr '\n' ' ')"
else
    echo -e "${RED}❌ Posts API failed${NC}"
    exit 1
fi

echo ""

# Test 2: Test Comments API for each post
echo -e "${YELLOW}2. Testing Comments API for each post...${NC}"
post_count=0
for post_id in $posts; do
    post_count=$((post_count + 1))
    echo -e "   ${BLUE}Testing post: $post_id${NC}"
    
    comment_response=$(curl -s "${BASE_URL}/agent-posts/${post_id}/comments")
    if echo "$comment_response" | jq -e '.success' > /dev/null; then
        comment_count=$(echo "$comment_response" | jq '.data | length')
        echo -e "   ${GREEN}✅ Comments API working - Found $comment_count comments${NC}"
        
        # Show first comment as example
        first_comment=$(echo "$comment_response" | jq -r '.data[0] | "\(.author): \(.content | .[0:50])..."')
        echo -e "   📝 Example: ${first_comment}"
    else
        echo -e "   ${RED}❌ Comments API failed for $post_id${NC}"
        echo "   Response: $comment_response"
    fi
    echo ""
done

echo ""
echo -e "${BLUE}🎨 FRONTEND TESTING INSTRUCTIONS${NC}"
echo "================================="
echo ""
echo -e "${YELLOW}Open your browser and navigate to: ${FRONTEND_URL}${NC}"
echo ""
echo "🔍 MANUAL VALIDATION CHECKLIST:"
echo ""
echo "  1. ✅ APPLICATION LOADS"
echo "     - Page loads without errors"
echo "     - Posts are visible"
echo "     - Comment buttons are present"
echo ""
echo "  2. ✅ COMMENT BUTTON INTERACTION"
echo "     - Click on comment buttons (💬 with numbers)"
echo "     - Loading spinner should appear briefly"
echo "     - Comments section should expand"
echo ""
echo "  3. ✅ REAL COMMENT DATA"
echo "     - Comments show realistic authors (not 'User' or 'Agent Smith')"
echo "     - Professional authors like: TechReviewer, SystemValidator, CodeAuditor"
echo "     - Meaningful comment content (not placeholder text)"
echo "     - Proper timestamps (hours ago format)"
echo ""
echo "  4. ✅ PROFESSIONAL UI FORMATTING"
echo "     - Each comment has an avatar circle with first letter"
echo "     - Author names are bold"
echo "     - Timestamps are shown in gray"
echo "     - Comments are in rounded gray containers"
echo ""
echo "  5. ✅ TOGGLE FUNCTIONALITY"
echo "     - Click comment button again to collapse comments"
echo "     - Comments should hide"
echo "     - Click again to re-open"
echo ""
echo "  6. ✅ COMMENT COUNT ACCURACY"
echo "     - Button shows correct number of comments"
echo "     - Matches actual comments displayed"
echo ""
echo -e "${GREEN}✅ IF ALL CHECKS PASS: Comment system is production ready!${NC}"
echo ""

echo -e "${BLUE}🔧 NETWORK DEBUGGING${NC}"
echo "==================="
echo ""
echo "If you need to debug network requests:"
echo "1. Open browser Developer Tools (F12)"
echo "2. Go to Network tab"
echo "3. Click comment buttons"
echo "4. Look for requests to '/comments' endpoints"
echo "5. Verify they return 200 status with real data"
echo ""

# Test if frontend is accessible
echo -e "${YELLOW}Testing frontend accessibility...${NC}"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$frontend_status" = "200" ]; then
    echo -e "${GREEN}✅ Frontend accessible at $FRONTEND_URL${NC}"
else
    echo -e "${RED}❌ Frontend not accessible at $FRONTEND_URL (Status: $frontend_status)${NC}"
    echo "   Make sure the frontend server is running: npm run dev"
fi

echo ""
echo -e "${GREEN}🎯 VALIDATION COMPLETE${NC}"
echo -e "${BLUE}Next: Open ${FRONTEND_URL} and perform manual validation${NC}"
echo ""