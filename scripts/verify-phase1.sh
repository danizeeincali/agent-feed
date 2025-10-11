#!/bin/bash

# ==============================================================================
# Phase 1 Verification Script
# ==============================================================================
# Tests all core functionality to ensure Phase 1 is working correctly
# Run this before starting Phase 2
# ==============================================================================

set -e  # Exit on error

echo "=============================================================================="
echo "Phase 1 Verification Script"
echo "=============================================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to print test result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo "1. Checking Docker Container Status..."
echo "----------------------------------------------------------------------"
if docker ps | grep -q "agent-feed-postgres-phase1"; then
    print_result 0 "PostgreSQL container is running"
else
    print_result 1 "PostgreSQL container is not running"
    echo "   Run: docker-compose -f docker-compose.phase1.yml up -d"
    exit 1
fi
echo ""

echo "2. Checking Database Connection..."
echo "----------------------------------------------------------------------"
if docker exec agent-feed-postgres-phase1 pg_isready -U postgres > /dev/null 2>&1; then
    print_result 0 "Database is accepting connections"
else
    print_result 1 "Database is not accepting connections"
fi
echo ""

echo "3. Verifying All 6 Tables Exist..."
echo "----------------------------------------------------------------------"
TABLES=$(docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -t -c "
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'system_agent_templates',
    'user_agent_customizations',
    'agent_memories',
    'agent_workspaces',
    'avi_state',
    'error_log'
);
" | tr -d ' ')

if [ "$TABLES" -eq 6 ]; then
    print_result 0 "All 6 tables exist"
    docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
    " | grep -E "system_agent_templates|user_agent_customizations|agent_memories|agent_workspaces|avi_state|error_log"
else
    print_result 1 "Only $TABLES tables found (expected 6)"
fi
echo ""

echo "4. Verifying GIN Indexes..."
echo "----------------------------------------------------------------------"
INDEXES=$(docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -t -c "
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef LIKE '%USING gin%';
" | tr -d ' ')

if [ "$INDEXES" -ge 5 ]; then
    print_result 0 "GIN indexes created ($INDEXES found)"
else
    print_result 1 "GIN indexes missing (only $INDEXES found, expected at least 5)"
fi
echo ""

echo "5. Testing System Template Insertion..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO system_agent_templates (
    name, version, model, posting_rules, api_schema, safety_constraints
) VALUES (
    'test-agent',
    1,
    'claude-sonnet-4-5-20250929',
    '{\"max_length\": 280}'::jsonb,
    '{\"endpoint\": \"/api/post\"}'::jsonb,
    '{\"max_rate\": 10}'::jsonb
) ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_result 0 "Can insert system templates"
else
    print_result 1 "Cannot insert system templates"
fi
echo ""

echo "6. Testing User Customization with Foreign Key..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO user_agent_customizations (
    user_id, agent_template, personality, response_style
) VALUES (
    'test-user-123',
    'test-agent',
    'Friendly and helpful',
    '{\"tone\": \"casual\"}'::jsonb
) ON CONFLICT (user_id, agent_template) DO UPDATE SET personality = EXCLUDED.personality;
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_result 0 "Can insert user customizations with valid FK"
else
    print_result 1 "Cannot insert user customizations"
fi
echo ""

echo "7. Testing Foreign Key Constraint (should fail)..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO user_agent_customizations (
    user_id, agent_template, personality
) VALUES (
    'test-user-456',
    'nonexistent-agent',
    'This should fail'
);
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    print_result 0 "Foreign key constraint enforced (correctly rejected invalid reference)"
else
    print_result 1 "Foreign key constraint NOT enforced (should have rejected)"
fi
echo ""

echo "8. Testing Agent Memory Insertion..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_memories (
    user_id, agent_name, memory_type, content, metadata
) VALUES (
    'test-user-123',
    'test-agent',
    'conversation',
    'User prefers technical explanations',
    '{\"importance\": 8}'::jsonb
);
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_result 0 "Can insert agent memories"
else
    print_result 1 "Cannot insert agent memories"
fi
echo ""

echo "9. Testing Agent Workspace Insertion..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_workspaces (
    user_id, agent_name, file_path, file_content, file_type
) VALUES (
    'test-user-123',
    'test-agent',
    '/workspace/test.md',
    '# Test Document',
    'markdown'
);
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_result 0 "Can insert agent workspace files"
else
    print_result 1 "Cannot insert agent workspace files"
fi
echo ""

echo "10. Testing JSONB Query Performance (GIN index)..."
echo "----------------------------------------------------------------------"
QUERY_TIME=$(docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
EXPLAIN ANALYZE
SELECT * FROM agent_memories
WHERE metadata @> '{\"importance\": 8}'::jsonb;
" 2>&1 | grep "Execution Time" | awk '{print $3}')

if [ ! -z "$QUERY_TIME" ]; then
    print_result 0 "JSONB query executed (${QUERY_TIME}ms)"
else
    print_result 1 "JSONB query failed"
fi
echo ""

echo "11. Testing Multi-User Data Isolation..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_memories (user_id, agent_name, memory_type, content)
VALUES ('user-a', 'test-agent', 'note', 'User A data'),
       ('user-b', 'test-agent', 'note', 'User B data');
" > /dev/null 2>&1

USER_A_COUNT=$(docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -t -c "
SELECT COUNT(*) FROM agent_memories WHERE user_id = 'user-a';
" | tr -d ' ')

USER_B_COUNT=$(docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -t -c "
SELECT COUNT(*) FROM agent_memories WHERE user_id = 'user-b';
" | tr -d ' ')

if [ "$USER_A_COUNT" -ge 1 ] && [ "$USER_B_COUNT" -ge 1 ]; then
    print_result 0 "Multi-user data isolation working"
else
    print_result 1 "Multi-user data isolation not working"
fi
echo ""

echo "12. Testing CHECK Constraint (no_manual_delete)..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_memories (user_id, agent_name, memory_type, content, is_deleted)
VALUES ('test-user', 'test-agent', 'note', 'Test', true);
" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    print_result 0 "CHECK constraint prevents manual deletion (correctly rejected)"
else
    print_result 1 "CHECK constraint NOT enforced (should have rejected)"
fi
echo ""

echo "13. Verifying Test Database Exists..."
echo "----------------------------------------------------------------------"
if docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_test -c "SELECT 1;" > /dev/null 2>&1; then
    print_result 0 "Test database (avidm_test) exists"
else
    print_result 1 "Test database (avidm_test) does not exist"
    echo "   Run: docker exec agent-feed-postgres-phase1 psql -U postgres -c 'CREATE DATABASE avidm_test;'"
fi
echo ""

echo "14. Checking System Template Files..."
echo "----------------------------------------------------------------------"
TEMPLATE_COUNT=$(ls -1 config/system/agent-templates/*.json 2>/dev/null | wc -l)

if [ "$TEMPLATE_COUNT" -eq 3 ]; then
    print_result 0 "All 3 system template files exist"
    ls -1 config/system/agent-templates/*.json | sed 's/^/   - /'
else
    print_result 1 "Only $TEMPLATE_COUNT template files found (expected 3)"
fi
echo ""

echo "15. Cleanup Test Data..."
echo "----------------------------------------------------------------------"
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
DELETE FROM agent_memories WHERE user_id LIKE 'test-user%' OR user_id LIKE 'user-%';
DELETE FROM agent_workspaces WHERE user_id LIKE 'test-user%';
DELETE FROM user_agent_customizations WHERE user_id LIKE 'test-user%';
DELETE FROM system_agent_templates WHERE name = 'test-agent';
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_result 0 "Test data cleaned up"
else
    print_result 1 "Cleanup failed"
fi
echo ""

echo "=============================================================================="
echo "Verification Summary"
echo "=============================================================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED - Phase 1 is working correctly!${NC}"
    echo ""
    echo "You can proceed to Phase 2 with confidence."
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Review the output above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Ensure Docker container is running:"
    echo "    docker-compose -f docker-compose.phase1.yml up -d"
    echo ""
    echo "  - Check database logs:"
    echo "    docker-compose -f docker-compose.phase1.yml logs -f postgres"
    echo ""
    exit 1
fi
