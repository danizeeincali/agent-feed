# Phase 1 Manual Verification Steps

Run these commands to verify Phase 1 is working correctly before starting Phase 2.

## Quick Verification (5 minutes)

### 1. Check Container is Running
```bash
docker ps | grep agent-feed-postgres-phase1
```
**Expected**: Should show container status as "Up" and "healthy"

### 2. Verify Database Connection
```bash
docker exec agent-feed-postgres-phase1 pg_isready -U postgres
```
**Expected**: `/var/run/postgresql:5432 - accepting connections`

### 3. List All Tables (should show 6)
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "\dt"
```
**Expected**:
```
 agent_memories
 agent_workspaces
 avi_state
 error_log
 system_agent_templates
 user_agent_customizations
```

### 4. Check Table Counts
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
SELECT
  'system_agent_templates' as table_name, COUNT(*) as count FROM system_agent_templates
UNION ALL SELECT 'user_agent_customizations', COUNT(*) FROM user_agent_customizations
UNION ALL SELECT 'agent_memories', COUNT(*) FROM agent_memories
UNION ALL SELECT 'agent_workspaces', COUNT(*) FROM agent_workspaces
UNION ALL SELECT 'avi_state', COUNT(*) FROM avi_state
UNION ALL SELECT 'error_log', COUNT(*) FROM error_log;
"
```
**Expected**: All counts should be 0 (empty database ready for use)

### 5. Verify Indexes Exist
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
"
```
**Expected**: Should show multiple indexes including GIN indexes for JSONB columns

## Functional Tests (10 minutes)

### Test 1: Insert a System Template
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO system_agent_templates (
    name, version, model, posting_rules, api_schema, safety_constraints
) VALUES (
    'test-agent',
    1,
    'claude-sonnet-4-5-20250929',
    '{\"max_length\": 280, \"min_interval_seconds\": 60}'::jsonb,
    '{\"endpoint\": \"/api/post\", \"method\": \"POST\"}'::jsonb,
    '{\"max_rate_per_hour\": 20, \"content_filter\": true}'::jsonb
);
"
```
**Expected**: `INSERT 0 1`

### Test 2: Verify Template Inserted
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
SELECT name, version, model,
       posting_rules->>'max_length' as max_length
FROM system_agent_templates
WHERE name = 'test-agent';
"
```
**Expected**: Should show your test-agent with max_length = 280

### Test 3: Insert User Customization (Foreign Key Test)
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO user_agent_customizations (
    user_id, agent_template, personality, response_style
) VALUES (
    'user-123',
    'test-agent',
    'Friendly and helpful technical expert',
    '{\"tone\": \"casual\", \"emoji_use\": true}'::jsonb
);
"
```
**Expected**: `INSERT 0 1`

### Test 4: Test Foreign Key Constraint (Should Fail)
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO user_agent_customizations (
    user_id, agent_template, personality
) VALUES (
    'user-456',
    'nonexistent-agent',
    'This should fail'
);
"
```
**Expected**: ERROR with message about foreign key constraint violation

### Test 5: Insert Agent Memory
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_memories (
    user_id, agent_name, memory_type, content, metadata
) VALUES (
    'user-123',
    'test-agent',
    'conversation',
    'User prefers detailed technical explanations with examples',
    '{\"importance\": 9, \"category\": \"preferences\"}'::jsonb
);
"
```
**Expected**: `INSERT 0 1`

### Test 6: Test JSONB Query with GIN Index
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
SELECT user_id, agent_name, content
FROM agent_memories
WHERE metadata @> '{\"importance\": 9}'::jsonb;
"
```
**Expected**: Should return the memory you just inserted

### Test 7: Insert Workspace File
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_workspaces (
    user_id, agent_name, file_path, file_content, file_type
) VALUES (
    'user-123',
    'test-agent',
    '/workspace/notes/project-ideas.md',
    '# Project Ideas\n\n- AI-powered task manager\n- Smart notification system',
    'markdown'
);
"
```
**Expected**: `INSERT 0 1`

### Test 8: Test Multi-User Data Isolation
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
-- Insert data for two different users
INSERT INTO agent_memories (user_id, agent_name, memory_type, content)
VALUES
    ('user-a', 'test-agent', 'note', 'User A private data'),
    ('user-b', 'test-agent', 'note', 'User B private data');

-- Query for user-a only
SELECT user_id, content FROM agent_memories WHERE user_id = 'user-a';
"
```
**Expected**: Should only show user-a's data, not user-b's

### Test 9: Test Protected Deletion (Should Fail)
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
INSERT INTO agent_memories (
    user_id, agent_name, memory_type, content, is_deleted
) VALUES (
    'user-test',
    'test-agent',
    'note',
    'Test content',
    true
);
"
```
**Expected**: ERROR about CHECK constraint "no_manual_delete"

### Test 10: Verify Data Relationships
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
SELECT
    t.name as template,
    c.user_id,
    c.personality,
    m.memory_type,
    COUNT(w.id) as workspace_files
FROM system_agent_templates t
LEFT JOIN user_agent_customizations c ON t.name = c.agent_template
LEFT JOIN agent_memories m ON c.user_id = m.user_id AND c.agent_template = m.agent_name
LEFT JOIN agent_workspaces w ON c.user_id = w.user_id AND c.agent_template = w.agent_name
WHERE t.name = 'test-agent'
GROUP BY t.name, c.user_id, c.personality, m.memory_type;
"
```
**Expected**: Should show relationships between templates, customizations, memories, and workspaces

## Cleanup Test Data

After verification, clean up:
```bash
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -c "
DELETE FROM agent_memories WHERE user_id LIKE 'user-%';
DELETE FROM agent_workspaces WHERE user_id LIKE 'user-%';
DELETE FROM user_agent_customizations WHERE user_id LIKE 'user-%';
DELETE FROM system_agent_templates WHERE name = 'test-agent';
"
```

## Check System Template Files

Verify the 3 pre-configured agent templates exist:
```bash
ls -lh config/system/agent-templates/
```
**Expected**:
- tech-guru.json
- creative-writer.json
- data-analyst.json

View a template:
```bash
cat config/system/agent-templates/tech-guru.json | jq .
```

## Run Integration Tests

If you want to run the full test suite:
```bash
npm run test:phase1:integration
```
**Expected**: 64/79 tests passing (81% pass rate)

## Troubleshooting

### If tables don't exist:
```bash
# Run schema creation manually
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -f /docker-entrypoint-initdb.d/01-schema.sql
docker exec agent-feed-postgres-phase1 psql -U postgres -d avidm_dev -f /docker-entrypoint-initdb.d/02-indexes.sql
```

### If container isn't running:
```bash
docker-compose -f docker-compose.phase1.yml up -d
```

### Check container logs:
```bash
docker-compose -f docker-compose.phase1.yml logs -f postgres
```

### Connect to database shell:
```bash
docker exec -it agent-feed-postgres-phase1 psql -U postgres -d avidm_dev
```

## Success Criteria

✅ Container is running and healthy
✅ All 6 tables exist
✅ All indexes created (especially GIN indexes for JSONB)
✅ Can insert system templates
✅ Can insert user customizations with valid foreign keys
✅ Foreign key constraints prevent invalid references
✅ Can insert memories and workspace files
✅ JSONB queries work with GIN indexes
✅ Multi-user data isolation works
✅ Protected deletion constraint prevents is_deleted=true

If all these tests pass, **Phase 1 is working correctly** and you can proceed to Phase 2!
