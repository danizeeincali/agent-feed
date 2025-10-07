# Feedback Loop System - Quick Start Guide

## What is it?

The Feedback Loop System automatically learns from validation failures and updates agent instructions to prevent repeated mistakes.

## How it Works

1. **Validation Failure Occurs** → System records error details
2. **Pattern Detection** → After 3+ similar failures, pattern identified
3. **Auto-Update** → System appends warning to agent instruction file
4. **Memory Update** → Pattern logged to persistent memory file
5. **Metrics Tracking** → Performance metrics updated

## Quick Commands

### Start the Server
```bash
cd /workspaces/agent-feed/api-server
npm start
```

### Run Test Demo
```bash
cd /workspaces/agent-feed/api-server
node test-feedback-loop.js
```

### Check Agent Health
```bash
curl http://localhost:3001/api/feedback/agents/page-builder-agent/metrics
```

### View All Patterns
```bash
curl http://localhost:3001/api/feedback/agents/page-builder-agent/patterns
```

### System Dashboard
```bash
curl http://localhost:3001/api/feedback/dashboard
```

## API Endpoints

### Agent Metrics
```bash
GET /api/feedback/agents/:agentId/metrics
```
Returns:
- Health score (0-100)
- Success rate
- Active patterns count
- Recent failures
- Feedback items applied

### Failure Patterns
```bash
GET /api/feedback/agents/:agentId/patterns?status=active
```
Returns list of detected patterns with:
- Pattern type and signature
- Occurrence count
- Status (active/resolved/ignored)
- Auto-fix status

### Failure History
```bash
GET /api/feedback/agents/:agentId/history?limit=50&offset=0
```
Returns paginated list of all failures with full context.

### Generate Report
```bash
GET /api/feedback/report?agentId=page-builder-agent&days=7
```
Returns comprehensive report with:
- Failure statistics
- Top errors
- Detected patterns
- Performance metrics
- Feedback items

### Reset Agent Learning
```bash
POST /api/feedback/agents/:agentId/reset
```
Marks all patterns as resolved (doesn't delete data).

## Key Files

### Generated Files (Auto-Created)
- **Instructions**: `/prod/agent_workspace/instructions/{agentId}.md`
- **Memory**: `/prod/agent_workspace/memories/page-builder-failures.md`

### Check Generated Files
```bash
# View agent instructions
cat /workspaces/agent-feed/prod/agent_workspace/instructions/page-builder-agent.md

# View memory file
cat /workspaces/agent-feed/prod/agent_workspace/memories/page-builder-failures.md
```

## How to Trigger Learning

### Automatic (Recommended)
Just create pages via the API - validation failures are automatically recorded:
```bash
curl -X POST http://localhost:3001/api/agent-pages/agents/page-builder-agent/pages \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Page",
    "content_type": "json",
    "content_value": "{\"components\":[{\"type\":\"InvalidComponent\",\"props\":{}}]}"
  }'
```

### Manual Testing
Run the test script to simulate failures:
```bash
cd /workspaces/agent-feed/api-server
node test-feedback-loop.js
```

## Understanding Health Scores

### Score Calculation
```
Health Score = (Success Rate × 100) - (Active Patterns × 10)
```

### Score Ranges
- **90-100**: Excellent - Few failures, no active patterns
- **70-89**: Good - Occasional failures, minor patterns
- **50-69**: Fair - Regular failures, some patterns
- **30-49**: Poor - Many failures, multiple patterns
- **0-29**: Critical - High failure rate, many active patterns

## Pattern Detection

### What Triggers a Pattern?
- 3+ failures with similar error signatures
- Error signature = normalized error type + message

### What Happens?
1. Warning appended to agent instruction file
2. Pattern logged to memory file
3. Feedback record created in database
4. Pattern marked with auto-fix applied

### Example Pattern Warning
```markdown
## Automated Feedback (2025-10-06)

### Sidebar Navigation Pattern

**CRITICAL**: Detected 3 failures related to sidebar navigation.

**Correct Pattern**:
{
  "type": "SidebarLayout",
  "props": {
    "navigation": [...]
  }
}

**Severity**: WARNING
**Occurrences**: 3
```

## Database Tables

### validation_failures
All recorded failures with:
- Error type, message, details
- Component type
- Page configuration
- Stack trace
- Timestamp

### failure_patterns
Detected patterns with:
- Pattern type and signature
- Occurrence count
- First/last seen
- Status
- Auto-fix applied flag

### agent_feedback
Learning history with:
- Feedback type
- Content
- Applied status
- Effectiveness score

### agent_performance_metrics
Daily metrics with:
- Total/successful/failed attempts
- Success rate
- Auto-fixes applied

## Troubleshooting

### No Patterns Being Detected?
- Check if threshold reached (need 3+ failures)
- Verify database connection
- Check server logs for errors

### Instruction File Not Created?
- Ensure `/prod/agent_workspace/instructions/` directory exists
- Check file permissions
- Review console logs for errors

### Memory File Not Updating?
- Ensure `/prod/agent_workspace/memories/` directory exists
- Check if pattern threshold reached
- Verify feedback loop initialization

### Database Errors?
```bash
# Re-run migration
cd /workspaces/agent-feed/api-server
node -e "
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('../database.db');
db.exec(fs.readFileSync('./migrations/add-feedback-system.sql', 'utf-8'));
console.log('✅ Migration complete');
db.close();
"
```

## Best Practices

### For Agents
1. Review memory file before generating pages
2. Check instruction file for your agent ID
3. Follow suggested patterns from warnings
4. Test pages locally before deploying

### For Developers
1. Monitor dashboard regularly
2. Review patterns weekly
3. Update schemas based on common patterns
4. Clear resolved patterns periodically

### For System Operators
1. Back up database regularly
2. Monitor health scores
3. Set up alerts for critical patterns
4. Archive old failures periodically

## Example Workflow

```bash
# 1. Start server
npm start

# 2. Create a page with invalid component (triggers failure)
curl -X POST http://localhost:3001/api/agent-pages/agents/test-agent/pages \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content_value": "{\"components\":[{\"type\":\"BadComponent\"}]}"
  }'

# 3. Repeat 2 more times (triggers pattern detection)

# 4. Check agent metrics
curl http://localhost:3001/api/feedback/agents/test-agent/metrics

# 5. View generated instruction file
cat /workspaces/agent-feed/prod/agent_workspace/instructions/test-agent.md

# 6. View memory file
cat /workspaces/agent-feed/prod/agent_workspace/memories/page-builder-failures.md
```

## Configuration

### Pattern Threshold
Default: 3 failures
Change in: `/api-server/services/feedback-loop.js`
```javascript
this.PATTERN_THRESHOLD = 3; // Change this value
```

### Agent Workspace Location
Default: `/prod/agent_workspace/`
Change in: `/api-server/services/feedback-loop.js`
```javascript
this.AGENT_WORKSPACE = path.join(__dirname, '../../prod/agent_workspace');
```

## Support

- **Documentation**: See `/LAYER-4-IMPLEMENTATION-SUMMARY.md`
- **Issues**: Check server logs and database state
- **Questions**: Review test script for usage examples

---

**Quick Reference Card**:
- 🚀 **Start**: `npm start`
- 🧪 **Test**: `node test-feedback-loop.js`
- 📊 **Metrics**: `GET /api/feedback/agents/:id/metrics`
- 🔍 **Patterns**: `GET /api/feedback/agents/:id/patterns`
- 📈 **Dashboard**: `GET /api/feedback/dashboard`
- 🔄 **Reset**: `POST /api/feedback/agents/:id/reset`
