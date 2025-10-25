# Worker Content Extraction - Quick Start Guide

## Test Suite Overview

**Total Tests**: 28 comprehensive tests (100% REAL, 0% MOCK)
- 18 Unit Tests
- 6 Integration Tests
- 4 E2E Tests with Screenshots

## Quick Test Commands

### Run All Tests
```bash
# Unit tests
cd /workspaces/agent-feed/api-server
npm test tests/unit/agent-worker-content-extraction.test.js

# Integration tests
npm test tests/integration/worker-content-extraction.test.js

# E2E tests
cd /workspaces/agent-feed
npx playwright test tests/e2e/worker-content-extraction.spec.ts
```

### Run with Watch Mode
```bash
# Unit tests (auto-rerun on changes)
npm test tests/unit/agent-worker-content-extraction.test.js -- --watch

# Integration tests
npm test tests/integration/worker-content-extraction.test.js -- --watch
```

### Run Specific Test
```bash
# Run single test by name
npm test tests/unit/agent-worker-content-extraction.test.js -- -t "should read REAL agent .md file"

# Run test suite
npm test tests/unit/agent-worker-content-extraction.test.js -- -t "readAgentFrontmatter"
```

## Test Files

### 1. Unit Tests
**File**: `/workspaces/agent-feed/api-server/tests/unit/agent-worker-content-extraction.test.js`

**Functions Tested**:
- `readAgentFrontmatter()` - Read agent YAML frontmatter
- `extractFromWorkspaceFiles()` - Extract from briefing/summary files
- `extractFromTextMessages()` - Extract from SDK messages
- `extractIntelligence()` - Orchestrate with fallback logic

**Run**: `npm test tests/unit/agent-worker-content-extraction.test.js`

### 2. Integration Tests
**File**: `/workspaces/agent-feed/api-server/tests/integration/worker-content-extraction.test.js`

**Scenarios Tested**:
- Link-logger agent with workspace files (4 tests)
- Text-based agents without workspace (2 tests)

**Run**: `npm test tests/integration/worker-content-extraction.test.js`

### 3. E2E Tests
**File**: `/workspaces/agent-feed/tests/e2e/worker-content-extraction.spec.ts`

**UI Scenarios**:
- Post URL and wait for processing
- Verify intelligence comment (not "No summary available")
- Screenshot proof of rich content
- Workspace files preferred over messages

**Run**: `npx playwright test tests/e2e/worker-content-extraction.spec.ts`

**Screenshots**: `/workspaces/agent-feed/tests/screenshots/worker-extract-*.png`

## Expected Test Results

### Before Implementation
```
❌ All 28 tests FAIL
Reason: Functions not implemented yet (TDD approach)
```

### After Implementation
```
✅ All 28 tests PASS
- Unit tests: 18/18 pass
- Integration tests: 6/6 pass
- E2E tests: 4/4 pass
```

## Implementation Checklist

### Phase 1: Implement Helper Functions
```javascript
// In /workspaces/agent-feed/api-server/worker/agent-worker.js

async readAgentFrontmatter(agentId, agentsDir) {
  // Extract YAML frontmatter from agent .md file
  // Return { posts_as_self: true/false, ... }
}

async extractFromWorkspaceFiles(workspaceDir) {
  // Read lambda-vi-briefing-*.md files
  // Read summaries/*.md files
  // Extract ## Executive Brief sections
  // Return combined intelligence or null
}

extractFromTextMessages(messages) {
  // Filter assistant messages
  // Extract text/content
  // Return combined intelligence
}

async extractIntelligence(agentId, workspaceDir, messages, agentsDir) {
  // Check posts_as_self flag
  // Try workspace files first (if posts_as_self: true)
  // Fallback to text messages
  // Return "No summary available" as last resort
}
```

### Phase 2: Update processURL() Method
```javascript
async processURL(ticket) {
  // ... existing code ...

  // REPLACE old extraction logic with:
  const agentId = ticket.agent_id;
  const workspaceDir = `/workspaces/agent-feed/prod/agent_workspace/${agentId}`;
  const summary = await this.extractIntelligence(
    agentId,
    workspaceDir,
    result.messages,
    '/workspaces/agent-feed/prod/.claude/agents'
  );

  return { summary, tokensUsed };
}
```

### Phase 3: Run Tests
```bash
# 1. Run unit tests
npm test tests/unit/agent-worker-content-extraction.test.js
# Expected: All pass ✅

# 2. Run integration tests
npm test tests/integration/worker-content-extraction.test.js
# Expected: All pass ✅

# 3. Run E2E tests
npx playwright test tests/e2e/worker-content-extraction.spec.ts
# Expected: All pass ✅
```

## Test Data Locations

### Real Agent Configurations
```
/workspaces/agent-feed/prod/.claude/agents/
├── link-logger-agent.md  (posts_as_self: true)
└── [other agents]
```

### Test Workspaces (Created by Tests)
```
/workspaces/agent-feed/api-server/tests/fixtures/
├── workspace/
│   ├── lambda-vi-briefing-*.md
│   └── summaries/*.md
└── agents/
    └── *.md (test agents)
```

### Production Workspaces (Used by Real Worker)
```
/workspaces/agent-feed/prod/agent_workspace/
└── link-logger-agent/
    ├── lambda-vi-briefing-linkedin.md
    ├── lambda-vi-briefing-github.md
    └── summaries/
        ├── linkedin-analysis.md
        └── github-copilot.md
```

## Debugging Tests

### View Test Output
```bash
# Verbose output
npm test tests/unit/agent-worker-content-extraction.test.js -- --reporter=verbose

# Show console.log in tests
npm test tests/unit/agent-worker-content-extraction.test.js -- --silent=false
```

### Debug E2E Tests
```bash
# Run with UI (see browser)
npx playwright test tests/e2e/worker-content-extraction.spec.ts --headed

# Debug mode (pause at breakpoints)
npx playwright test tests/e2e/worker-content-extraction.spec.ts --debug

# View screenshots
ls -lh /workspaces/agent-feed/tests/screenshots/worker-extract-*.png
```

### Check Test Files
```bash
# Verify test files exist
ls -lh /workspaces/agent-feed/api-server/tests/unit/agent-worker-content-extraction.test.js
ls -lh /workspaces/agent-feed/api-server/tests/integration/worker-content-extraction.test.js
ls -lh /workspaces/agent-feed/tests/e2e/worker-content-extraction.spec.ts

# Check test fixtures created
ls -la /workspaces/agent-feed/api-server/tests/fixtures/workspace/
```

## Test Coverage Report

### Generate Coverage
```bash
cd /workspaces/agent-feed/api-server
npm test tests/unit/agent-worker-content-extraction.test.js -- --coverage

# View HTML report
open coverage/index.html
```

### Expected Coverage (After Implementation)
```
File: agent-worker.js
Functions: 100%
Branches: 100%
Lines: 100%
```

## Manual Testing Workflow

### 1. Create Test Workspace
```bash
# Create link-logger workspace
mkdir -p /workspaces/agent-feed/prod/agent_workspace/link-logger-agent/summaries

# Create briefing file
cat > /workspaces/agent-feed/prod/agent_workspace/link-logger-agent/lambda-vi-briefing-test.md << 'EOF'
# Briefing for Test

## Executive Brief

This is test intelligence from workspace briefing file.
Strategic insights and comprehensive analysis.

EOF

# Create summary file
cat > /workspaces/agent-feed/prod/agent_workspace/link-logger-agent/summaries/test.md << 'EOF'
# Intelligence Summary

## Executive Brief

This is test intelligence from workspace summary file.
Detailed findings and key insights.

EOF
```

### 2. Verify Extraction
```bash
# Run unit tests to verify extraction works
npm test tests/unit/agent-worker-content-extraction.test.js -- -t "extractFromWorkspaceFiles"
```

### 3. Test Full Workflow
```bash
# Start servers
cd /workspaces/agent-feed/api-server
npm start &

cd /workspaces/agent-feed/frontend
npm start &

# Post URL to feed
# Verify link-logger processes URL
# Check comment has workspace intelligence
```

## Common Issues

### Issue: Tests Can't Find Agent Files
```bash
# Check agent file exists
ls -l /workspaces/agent-feed/prod/.claude/agents/link-logger-agent.md

# Check frontmatter
head -20 /workspaces/agent-feed/prod/.claude/agents/link-logger-agent.md
```

### Issue: Workspace Files Not Found
```bash
# Check workspace directory
ls -la /workspaces/agent-feed/prod/agent_workspace/link-logger-agent/

# Create if missing
mkdir -p /workspaces/agent-feed/prod/agent_workspace/link-logger-agent/summaries
```

### Issue: Tests Timeout
```bash
# Increase timeout in test file
test('test name', async () => {
  // ...
}, { timeout: 30000 }); // 30 seconds
```

## Success Validation

### ✅ Tests Pass Checklist
- [ ] All 18 unit tests pass
- [ ] All 6 integration tests pass
- [ ] All 4 E2E tests pass
- [ ] Screenshots show rich intelligence
- [ ] No "No summary available" in UI
- [ ] Workspace files extracted correctly
- [ ] Fallback to messages works
- [ ] Real agent configurations work

### ✅ Production Ready Checklist
- [ ] Post real LinkedIn URL to feed
- [ ] Link-logger agent processes URL
- [ ] Comment appears with rich intelligence
- [ ] Intelligence from workspace files (not messages)
- [ ] User sees valuable summary
- [ ] No errors in console
- [ ] Performance acceptable (<5s processing)

## Next Steps

1. **Review Tests**: Understand test expectations
2. **Implement Functions**: Add helper methods to AgentWorker
3. **Run Unit Tests**: Verify functions work correctly
4. **Run Integration Tests**: Verify end-to-end flow
5. **Run E2E Tests**: Verify UI correctness
6. **Production Validation**: Test with real URLs

## Documentation

- **Full Summary**: `/workspaces/agent-feed/docs/WORKER-CONTENT-EXTRACTION-TDD-SUMMARY.md`
- **Quick Start**: `/workspaces/agent-feed/docs/WORKER-CONTENT-EXTRACTION-QUICK-START.md` (this file)

---

**Ready to implement?** Start with unit tests and work your way up!
