# API-Database Integration Quick Start

## What Was Fixed?
Auto-registered pages were invisible to the API because:
- Auto-registration wrote to **SQLite database**
- API read from **in-memory Map**

Now both use the **same database** ✅

## Quick Test

### Option 1: Automated Test (Recommended)
```bash
node scripts/test-api-database-integration.js
```

Expected output:
```
✅ ALL TESTS PASSED!

✨ API-Database Integration is working correctly!
   - Auto-registration middleware writes to database ✓
   - Agent auto-creation works ✓
   - Pages accessible via database-backed API ✓
```

### Option 2: Manual Test
```bash
# 1. Start server
cd api-server && npm start

# 2. In another terminal, create a test page
cat > data/agent-pages/quick-test.json << 'EOF'
{
  "id": "quick-test-page",
  "agent_id": "quick-test-agent",
  "title": "Quick Test Page",
  "content_type": "json",
  "content_value": "{\"test\": true}",
  "status": "published"
}
EOF

# 3. Wait 2 seconds for auto-registration

# 4. Access via API
curl http://localhost:3001/api/agent-pages/agents/quick-test-agent/pages/quick-test-page

# Expected: JSON response with page data
```

## Key Files

| File | Purpose |
|------|---------|
| `/api-server/routes/agent-pages.js` | Database-backed API routes |
| `/api-server/middleware/auto-register-pages.js` | Auto-registration with agent creation |
| `/api-server/server.js` | Routes mounted at `/api/agent-pages` |
| `/data/agent-pages.db` | SQLite database (single source of truth) |

## API Endpoints

All routes use the database-backed implementation:

```
GET    /api/agent-pages/agents/:agentId/pages           # List pages
GET    /api/agent-pages/agents/:agentId/pages/:pageId   # Get page
POST   /api/agent-pages/agents/:agentId/pages           # Create page
PUT    /api/agent-pages/agents/:agentId/pages/:pageId   # Update page
DELETE /api/agent-pages/agents/:agentId/pages/:pageId   # Delete page
```

## Auto-Creation Feature

When a page file references a non-existent agent, the system now:
1. **Automatically creates the agent** (prevents foreign key errors)
2. **Generates a friendly name** from the agent ID
3. **Registers the page** successfully

Example:
```json
{
  "agent_id": "my-new-agent"  // ← Doesn't exist yet
}
```

Result:
- Agent `my-new-agent` is created with name "My New Agent"
- Page is successfully registered
- No foreign key errors ✅

## Verification

Check server logs for these messages:
```
✅ Agent pages database connected: /workspaces/agent-feed/data/agent-pages.db
✅ Agent Pages routes initialized with database
📡 Auto-registration middleware initialized
   Watching: /workspaces/agent-feed/data/agent-pages
```

When a page is auto-registered:
```
📄 New page file detected: test-page.json
   ✅ Auto-created agent: test-agent
   ✅ Auto-registered: test-page for test-agent
```

When accessed via API:
```
📄 Fetched page test-page for agent test-agent (from database)
```

## Troubleshooting

**Q: Page not showing in API?**
- Wait 2 seconds for auto-registration (file watcher delay)
- Check server logs for auto-registration messages
- Verify page file is valid JSON

**Q: Foreign key constraint error?**
- This should not happen anymore (auto-creation enabled)
- If it does, check agent_id is not null

**Q: Old mock routes still being used?**
- Check that routes are mounted: `app.use('/api/agent-pages', agentPagesRouter)`
- Verify database routes are initialized: `initializeAgentPagesRoutes(agentPagesDb)`
- Look for "(from database)" in API logs

## Success Indicators

You'll know it's working when:
1. ✅ Server starts without errors
2. ✅ Log shows "Agent Pages routes initialized with database"
3. ✅ Creating a page file triggers auto-registration logs
4. ✅ API returns the page with "(from database)" in logs
5. ✅ Integration test passes

## Support

For detailed information, see: `/workspaces/agent-feed/API_DATABASE_INTEGRATION_SUMMARY.md`

For test output, run: `node scripts/test-api-database-integration.js`
