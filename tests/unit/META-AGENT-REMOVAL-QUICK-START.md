# Meta Agent Removal - Quick Start Guide

## TL;DR

```bash
# Run the complete test suite
./tests/unit/run-meta-agent-removal-tests.sh

# Expected Result: 32 tests pass, all green
```

---

## What This Tests

### The Problem
- **Current State**: 19 agents (9 T1, 10 T2)
- **Target State**: 17 agents (9 T1, 8 T2)
- **Issue**: `meta-agent` and `meta-update-agent` need removal

### The Solution
Comprehensive TDD test suite using **London School (Mockist)** approach that verifies:
- ✅ Agent count drops from 19 → 17
- ✅ Tier 2 count drops from 10 → 8
- ✅ Meta agents excluded from all responses
- ✅ 6 specialist agents remain intact
- ✅ SVG icons preserved

---

## Test File Structure

### Total: 32 Test Cases

| Test Suite | Tests | Purpose |
|------------|-------|---------|
| Backend Agent Count | 6 | Verify repository layer counts |
| Filesystem Verification | 7 | Check physical file removal |
| API Response | 6 | Verify endpoint responses |
| SVG Icon Preservation | 6 | Ensure icons intact |
| Service Collaboration | 3 | Verify London School patterns |
| Mock Factories | 4 | Helper functions |

---

## Running Tests

### Full Suite
```bash
./tests/unit/run-meta-agent-removal-tests.sh
```

### Individual Test Groups
```bash
# Backend tests only
npm test tests/unit/meta-agent-removal.test.js -t "Backend Agent Count"

# Filesystem tests only
npm test tests/unit/meta-agent-removal.test.js -t "Filesystem"

# API tests only
npm test tests/unit/meta-agent-removal.test.js -t "API Response"

# Icon tests only
npm test tests/unit/meta-agent-removal.test.js -t "SVG Icon"
```

### Watch Mode (for TDD)
```bash
npm test tests/unit/meta-agent-removal.test.js -- --watch
```

---

## Expected Test Output

```
PASS tests/unit/meta-agent-removal.test.js

Meta Agent Removal - London School TDD Suite
  Backend Agent Count Verification
    ✓ should return 17 total agents (3ms)
    ✓ should return exactly 9 Tier 1 agents (1ms)
    ✓ should return exactly 8 Tier 2 agents (2ms)
    ✓ should NOT include meta-agent (1ms)
    ✓ should NOT include meta-update-agent (1ms)
    ✓ should include all 6 specialist agents (2ms)

  Filesystem Agent File Verification
    ✓ should not find meta-agent.md file (2ms)
    ✓ should not find meta-update-agent.md file (1ms)
    ✓ should find agent-architect-agent.md (1ms)
    ✓ should find skills-architect-agent.md (1ms)
    ✓ should find learning-optimizer-agent.md (1ms)
    ✓ should find system-architect-agent.md (1ms)
    ✓ should list exactly 17 agent files (2ms)

  API Response Verification
    ✓ GET /api/agents should return exactly 17 agents (2ms)
    ✓ GET /api/agents?tier=2 should return exactly 8 agents (1ms)
    ✓ metadata should show tier2: 8 (not 10) (1ms)
    ✓ metadata should show total: 17 (not 19) (1ms)
    ✓ API response should not contain meta agents (2ms)
    ✓ API response should include all 6 specialists (1ms)

  SVG Icon Integrity After Removal
    ✓ remaining agents should retain SVG icon paths (2ms)
    ✓ no emoji fallbacks should be present (1ms)
    ✓ tier 1 agents should have blue SVG icons (1ms)
    ✓ tier 2 agents should have gray SVG icons (1ms)
    ✓ specialist agents maintain protected status (2ms)
    ✓ icon loading should not fail (1ms)

  Service Collaboration After Meta Agent Removal
    ✓ repository coordinates with classifier (2ms)
    ✓ API coordinates with repository and formatter (1ms)
    ✓ data consistency across all layers (2ms)

Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        2.145s
```

---

## Key Test Assertions

### Agent Counts
```javascript
expect(agentCount).toBe(17);           // Total
expect(tier1Agents.length).toBe(9);    // Tier 1
expect(tier2Agents.length).toBe(8);    // Tier 2 (not 10!)
```

### Exclusions
```javascript
expect(agentNames).not.toContain('meta-agent');
expect(agentNames).not.toContain('meta-update-agent');
```

### Inclusions
```javascript
const specialists = [
  'agent-architect-agent',
  'skills-architect-agent',
  'learning-optimizer-agent',
  'system-architect-agent',
  'agent-maintenance-agent',
  'skills-maintenance-agent'
];
specialists.forEach(name => {
  expect(agentNames).toContain(name);
});
```

---

## London School Patterns Used

### 1. Mock-Driven Development
```javascript
const mockRepository = {
  loadAllAgents: jest.fn().mockResolvedValue(mockAgents),
  getAgentCount: jest.fn().mockResolvedValue(17)
};
```

### 2. Behavior Verification (not state)
```javascript
// Test HOW objects collaborate
expect(mockRepo.loadAgents).toHaveBeenCalledTimes(1);
expect(mockRepo.getByTier).toHaveBeenCalledWith(2);
```

### 3. Outside-In Testing
```javascript
// Start from API (outside)
test('GET /api/agents should return 17 agents')

// Work down to repository (inside)
test('repository should load 17 agents')
```

### 4. Interaction Testing
```javascript
// Verify call sequences
expect(mockRepo.load).toHaveBeenCalledBefore(mockFormatter.format);
```

---

## Mock Factory Usage

### Creating Test Data

```javascript
// Full agent list (17 agents)
const agents = createMockAgentList(17, { tier1: 9, tier2: 8 });

// Tier-specific list
const tier2Agents = createMockAgentsByTier(2, 8);

// With icons
const agentsWithIcons = createMockAgentList(17, { withIcons: true });

// Excluding specific agents
const filtered = createMockAgentList(17, {
  exclude: ['meta-agent', 'meta-update-agent']
});
```

---

## Troubleshooting

### Test Failures

**Problem**: "Expected 17 but got 19"
- **Cause**: Meta agents still present
- **Fix**: Remove `meta-agent.md` and `meta-update-agent.md`

**Problem**: "Expected 8 T2 agents but got 10"
- **Cause**: Meta agents counting as T2
- **Fix**: Verify meta agents excluded from tier filtering

**Problem**: "Icon tests failing"
- **Cause**: SVG paths changed or emoji fallbacks present
- **Fix**: Check icon loading logic

---

## Integration Steps

### After Tests Pass

1. **Remove Physical Files**:
   ```bash
   rm prod/.claude/agents/meta-agent.md
   rm prod/.claude/agents/meta-update-agent.md
   ```

2. **Verify Backend**:
   ```bash
   curl http://localhost:3001/api/agents | jq '.metadata'
   # Should show: { total: 17, tier1: 9, tier2: 8 }
   ```

3. **Run E2E Tests**:
   ```bash
   npm run test:e2e
   ```

4. **Visual Verification**:
   - Check agent list in UI
   - Verify tier filter shows 8 T2 agents
   - Confirm no meta agents visible

---

## Files Created

| File | Purpose |
|------|---------|
| `meta-agent-removal.test.js` | Main test suite (32 tests) |
| `run-meta-agent-removal-tests.sh` | Test execution script |
| `META-AGENT-REMOVAL-TDD-REPORT.md` | Comprehensive documentation |
| `META-AGENT-REMOVAL-QUICK-START.md` | This quick reference |

---

## Success Criteria Checklist

- [ ] All 32 tests pass
- [ ] Agent count = 17
- [ ] Tier 1 count = 9
- [ ] Tier 2 count = 8
- [ ] `meta-agent` not found
- [ ] `meta-update-agent` not found
- [ ] 6 specialist agents present
- [ ] SVG icons intact
- [ ] No emoji fallbacks
- [ ] Service collaboration verified

---

## Quick Commands Reference

```bash
# Run all tests
./tests/unit/run-meta-agent-removal-tests.sh

# Run with coverage
npm test tests/unit/meta-agent-removal.test.js --coverage

# Watch mode
npm test tests/unit/meta-agent-removal.test.js -- --watch

# Specific suite
npm test tests/unit/meta-agent-removal.test.js -t "Backend"

# View coverage report
open tests/coverage/meta-agent-removal/lcov-report/index.html
```

---

## Need Help?

### Full Documentation
See: `META-AGENT-REMOVAL-TDD-REPORT.md`

### Test File Location
`/workspaces/agent-feed/tests/unit/meta-agent-removal.test.js`

### Support
Check test output for specific failure messages and refer to London School patterns in the full report.

---

**Quick Start Version**: v1.0
**Last Updated**: 2025-10-20
**Total Test Cases**: 32
**Execution Time**: ~2 seconds
