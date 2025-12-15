# SPARC Specification: Tier Filter Bug Fix

**Version**: 1.0.0
**Date**: 2025-10-20
**Status**: Ready for Implementation
**Priority**: P0 - Critical (Breaks core functionality)

---

## 1. Executive Summary

### 1.1 Problem Statement

Two critical bugs prevent tier filtering from working in the Agent Manager:

1. **Frontend Bug**: Clicking tier filter buttons (T1, T2, All) destroys the API service due to a React useEffect dependency chain issue, displaying "Route Disconnected" error
2. **Backend Bug**: API endpoint returns empty array despite backend logs showing agents loaded correctly

**User Impact**: Users cannot filter agents by tier without navigating away and back to recover, making the tier filtering feature completely unusable.

**Investigation Reference**: `/workspaces/agent-feed/TIER-FILTER-ERRORS-INVESTIGATION.md`

### 1.2 Objectives

- Fix frontend useEffect dependency chain to prevent apiService destruction
- Fix backend agent repository to return filtered agents correctly
- Ensure tier filtering works seamlessly with no console errors
- Verify correct agent counts (9 T1, 10 T2, 19 All)
- Maintain compatibility with AVI Orchestrator and existing features

---

## 2. Root Cause Analysis

### 2.1 Frontend Root Cause: useEffect Dependency Chain

**File**: `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`

**Problem Flow**:
```
User clicks tier button
  → setCurrentTier('2') called
    → currentTier state changes from '1' to '2'
      → loadAgents callback recreated (has currentTier in deps at line 64)
        → Main useEffect triggered (has loadAgents in deps at line 118)
          → Cleanup function runs
            → apiService.destroy() called (line 109)
              → apiService.isDestroyed = true (PERMANENT)
                → Component shows "Route Disconnected" error
```

**Code Evidence**:

```typescript
// Line 42-64: loadAgents includes currentTier in dependencies
const loadAgents = useCallback(async () => {
  const response: any = await apiService.getAgents({ tier: currentTier });
  // ...
}, [apiService, currentTier]); // ❌ BUG: currentTier recreates callback

// Line 83-118: Main useEffect has loadAgents in dependencies
useEffect(() => {
  loadAgents(); // Called on mount
  // ... setup listeners ...

  return () => {
    apiService.destroy(); // ❌ Runs when loadAgents changes!
  };
}, [routeKey, loadAgents, apiService, registerCleanup]);
// ❌ BUG: loadAgents in deps triggers cleanup on tier change
```

**Why It's Critical**:
- `apiService.destroy()` sets `isDestroyed = true` PERMANENTLY
- No way to "un-destroy" a service - requires full component remount
- Main useEffect should ONLY run on route changes, NOT tier changes
- Tier changes should trigger data reload, NOT cleanup

### 2.2 Backend Root Cause: Empty Response Array

**File**: `/workspaces/agent-feed/api-server/repositories/agent.repository.js`

**Current Behavior**:
```bash
# Backend logs show successful loading
📂 Loaded 9/19 agents (tier=1)
📂 Loaded 10/19 agents (tier=2)
📂 Loaded 19/19 agents (tier=all)

# But API returns empty
$ curl 'http://localhost:3001/api/v1/claude-live/prod/agents?tier=1'
{"success":true,"agents":[]} # ❌ Empty array
```

**Investigation Needed**:
1. Line 184-214: `getAllAgents()` function filters agents correctly
2. Line 777-797: Server endpoint receives filtered agents and returns them
3. **Gap**: Something between filtering and response is clearing the array

**Hypothesis**:
- Async timing issue in `Promise.all()` at line 187
- Tier conversion issue (string '1' vs number 1) at line 203
- Response serialization issue at line 796

---

## 3. Functional Requirements

### FR-001: Tier Filter Click Behavior
**Priority**: P0 - Critical

**Description**: When user clicks a tier filter button (T1, T2, All), the system SHALL reload agents without destroying the API service.

**Acceptance Criteria**:
```gherkin
Scenario: User clicks Tier 1 button
  Given I am on the Agent Manager page
  And agents are loaded with tier "all"
  When I click the "T1" tier button
  Then the API service SHALL remain active
  And the agent list SHALL reload with tier 1 agents only
  And I SHALL NOT see "Route Disconnected" error
  And the tier toggle SHALL show "T1" as selected
  And the sidebar SHALL display exactly 9 agents
```

```gherkin
Scenario: User clicks multiple tier buttons in sequence
  Given I am on the Agent Manager page
  When I click "T1" button
  And I click "T2" button
  And I click "All" button
  Then each click SHALL reload agents without errors
  And the API service SHALL never be destroyed
  And the correct agent count SHALL display for each tier
```

**Edge Cases**:
- Rapid consecutive clicks (debouncing)
- Click while previous request is in-flight
- Click immediately after page load
- Click after returning from another route

### FR-002: Backend Tier Filtering
**Priority**: P0 - Critical

**Description**: The backend API SHALL return the correct filtered agents based on the tier parameter.

**Acceptance Criteria**:
```gherkin
Scenario: API request with tier=1
  Given the agents directory contains 9 tier 1 agents and 10 tier 2 agents
  When a GET request is made to "/api/v1/claude-live/prod/agents?tier=1"
  Then the response SHALL contain exactly 9 agents
  And all returned agents SHALL have tier=1
  And the metadata.tier1 SHALL equal 9
  And the metadata.filtered SHALL equal 9
  And the metadata.appliedTier SHALL equal "1"
```

```gherkin
Scenario: API request with tier=2
  Given the agents directory contains 9 tier 1 agents and 10 tier 2 agents
  When a GET request is made to "/api/v1/claude-live/prod/agents?tier=2"
  Then the response SHALL contain exactly 10 agents
  And all returned agents SHALL have tier=2
  And the metadata.tier2 SHALL equal 10
  And the metadata.filtered SHALL equal 10
```

```gherkin
Scenario: API request with tier=all
  Given the agents directory contains 19 total agents
  When a GET request is made to "/api/v1/claude-live/prod/agents?tier=all"
  Then the response SHALL contain exactly 19 agents
  And the metadata.total SHALL equal 19
  And the metadata.filtered SHALL equal 19
```

**Response Format**:
```typescript
{
  success: true,
  agents: Agent[], // Filtered array
  metadata: {
    total: number,      // Total agents (all tiers)
    tier1: number,      // Count of tier 1 agents
    tier2: number,      // Count of tier 2 agents
    protected: number,  // Count of protected agents
    filtered: number,   // Count after filtering
    appliedTier: string // "1", "2", or "all"
  }
}
```

### FR-003: API Service Lifecycle
**Priority**: P0 - Critical

**Description**: The API service SHALL only be destroyed when the route changes or component unmounts, NOT when tier filter changes.

**Acceptance Criteria**:
- apiService.destroy() SHALL NOT be called on tier changes
- apiService.getStatus().isDestroyed SHALL remain false during tier filtering
- Cleanup SHALL only run when routeKey changes
- Component SHALL never show "Route Disconnected" during normal tier filtering

### FR-004: Error Handling
**Priority**: P1 - High

**Description**: The system SHALL handle tier filtering errors gracefully without breaking the user experience.

**Acceptance Criteria**:
- Network errors during tier filtering SHALL show error message
- Failed requests SHALL NOT destroy the API service
- User SHALL be able to retry after errors
- Console SHALL log clear error messages with context

---

## 4. Non-Functional Requirements

### NFR-001: Performance
**Category**: Performance
**Priority**: P1

**Requirements**:
- Tier filter clicks SHALL respond within 200ms (p95)
- API requests SHALL complete within 500ms (p95)
- No memory leaks from recreated callbacks
- No unnecessary re-renders during tier changes

**Measurement**:
- Browser DevTools Performance tab
- React DevTools Profiler
- Backend response time logging

### NFR-002: Reliability
**Category**: Reliability
**Priority**: P0

**Requirements**:
- Tier filtering SHALL have 100% success rate (no crashes)
- API service lifecycle SHALL be deterministic and predictable
- State changes SHALL be atomic (no race conditions)

**Validation**:
- E2E tests with rapid clicking
- Integration tests for all tier combinations
- Unit tests for useEffect dependencies

### NFR-003: Maintainability
**Category**: Code Quality
**Priority**: P1

**Requirements**:
- useEffect dependencies SHALL be clearly documented
- Callback stability SHALL be enforced with ESLint rules
- Tier filtering logic SHALL be isolated and testable
- Code SHALL include inline comments explaining lifecycle

**Validation**:
- ESLint exhaustive-deps rule passing
- TypeScript strict mode passing
- Code review approval

---

## 5. Technical Requirements

### TR-001: Frontend useEffect Architecture

**Requirement**: Separate tier change handling from component lifecycle

**Implementation Strategy**:

```typescript
// CURRENT (BROKEN): Single useEffect with loadAgents in deps
useEffect(() => {
  loadAgents();
  // ... setup ...
  return cleanup; // ❌ Runs on loadAgents change
}, [routeKey, loadAgents, apiService, registerCleanup]);

// FIXED: Two separate useEffects
// 1. Component lifecycle (runs ONLY on mount/unmount)
useEffect(() => {
  console.log(`🚀 IsolatedRealAgentManager mounted for route: ${routeKey}`);

  // Initial load
  loadAgents();

  // Setup listeners
  apiService.on('agents_updated', handleAgentsUpdate);

  // Register cleanup ONLY for route changes
  const cleanup = () => {
    console.log(`🧹 Cleaning up IsolatedRealAgentManager for ${routeKey}`);
    apiService.destroy();
    setAgents([]);
  };

  registerCleanup(cleanup);
  return cleanup;
}, [routeKey, apiService, registerCleanup]);
// ✅ NO loadAgents in deps

// 2. Tier change effect (runs when tier changes)
useEffect(() => {
  // Only reload if service is active and component is mounted
  if (!apiService.getStatus().isDestroyed) {
    console.log(`🔄 Tier changed to ${currentTier}, reloading agents...`);
    loadAgents();
  }
}, [currentTier]);
// ✅ Only currentTier, NOT loadAgents
// ✅ This doesn't trigger cleanup
```

**Key Changes**:
1. Remove `loadAgents` from main useEffect dependencies
2. Create separate useEffect for tier changes
3. Only watch `currentTier` in tier change effect
4. Use destroyed check before calling loadAgents

### TR-002: loadAgents Callback Stability

**Requirement**: Make loadAgents stable to prevent unnecessary recreations

**Option A: Remove currentTier from dependencies (RECOMMENDED)**
```typescript
const loadAgents = useCallback(async () => {
  try {
    setError(null);
    // Capture current tier value directly from state
    const response: any = await apiService.getAgents({
      tier: currentTier // ✅ Closure captures current value
    });
    // ... rest of implementation
  } catch (err) {
    // ... error handling
  }
}, [apiService]);
// ✅ Only apiService in deps
// ⚠️ ESLint will warn - add disable comment with explanation
```

**ESLint Disable Comment**:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
// Intentionally omitting currentTier to prevent cleanup trigger.
// currentTier is captured from closure and used in tier-specific useEffect.
```

**Option B: Pass tier as parameter**
```typescript
const loadAgents = useCallback(async (tier?: '1' | '2' | 'all') => {
  const tierToLoad = tier ?? currentTier;
  const response: any = await apiService.getAgents({ tier: tierToLoad });
  // ... rest
}, [apiService, currentTier]);

// Tier change effect
useEffect(() => {
  if (!apiService.getStatus().isDestroyed) {
    loadAgents(currentTier); // Pass explicitly
  }
}, [currentTier, loadAgents]);
```

**Recommendation**: Use Option A for simplicity and fewer dependencies.

### TR-003: Backend Filtering Fix

**Requirement**: Debug and fix empty array response

**Investigation Steps**:

1. **Add detailed logging**:
```javascript
// In getAllAgents() at line 184
export async function getAllAgents(userId = 'anonymous', options = {}) {
  try {
    const filePaths = await listAgentFiles();
    console.log(`📂 Found ${filePaths.length} agent files`);

    const agents = await Promise.all(
      filePaths.map(filePath => readAgentFile(filePath))
    );
    console.log(`✅ Parsed ${agents.length} agents`);

    // Log tier values BEFORE filtering
    console.log('Agent tiers:', agents.map(a => ({ name: a.name, tier: a.tier, type: typeof a.tier })));

    const tier = options.tier !== undefined ? options.tier : 1;
    console.log(`🔍 Filtering for tier: ${tier} (type: ${typeof tier})`);

    if (tier !== 'all') {
      filteredAgents = agents.filter(agent => {
        const matches = agent.tier === Number(tier);
        if (!matches) {
          console.log(`❌ Agent ${agent.name} tier ${agent.tier} !== ${Number(tier)}`);
        }
        return matches;
      });
    }

    console.log(`📂 Filtered to ${filteredAgents.length} agents`);
    return filteredAgents;
  }
}
```

2. **Verify tier type conversion**:
```javascript
// Ensure consistent number comparison
const tierNumber = tier === 'all' ? 'all' : Number(tier);
if (tierNumber !== 'all') {
  filteredAgents = agents.filter(agent => agent.tier === tierNumber);
}
```

3. **Check response serialization**:
```javascript
// In server.js at line 793
res.json({
  success: true,
  agents: filteredAgents, // Verify this is not empty
  metadata
});

// Add logging before response
console.log(`📤 Sending response with ${filteredAgents.length} agents`);
console.log(`📤 First agent:`, filteredAgents[0] ? filteredAgents[0].name : 'NONE');
```

**Expected Fix**: Likely a type coercion issue where string '1' is not strictly equal to number 1.

### TR-004: Type Safety

**Requirement**: Ensure type consistency across tier filtering

**Type Definitions**:
```typescript
// In /workspaces/agent-feed/frontend/src/types/api.ts
export type AgentTier = 1 | 2;
export type AgentTierFilter = AgentTier | 'all';

export interface Agent {
  id: string;
  name: string;
  tier: AgentTier; // Always number 1 or 2
  // ... other fields
}

export interface GetAgentsOptions {
  tier?: AgentTierFilter; // Can be 1, 2, or 'all'
}

export interface AgentListMetadata {
  total: number;
  tier1: number;
  tier2: number;
  protected: number;
  filtered: number;
  appliedTier: string; // "1", "2", or "all"
}
```

**Backend Type Consistency**:
```javascript
// Ensure tier is always stored as number in frontmatter
tier: frontmatter.tier || 1, // Default to 1 if not specified
// Validate tier is 1 or 2
if (agent.tier !== 1 && agent.tier !== 2) {
  console.warn(`⚠️  Invalid tier ${agent.tier} for ${agent.name}, defaulting to 1`);
  agent.tier = 1;
}
```

---

## 6. Data Model

### 6.1 Agent Frontmatter Schema

```yaml
---
name: "Agent Name"
description: "Agent description"
tier: 1  # MUST be number 1 or 2 (not string "1" or "2")
visibility: "public"  # or "protected"
icon: "🤖"
icon_type: "emoji"
tools: [tool1, tool2]
# ... other fields
---
```

### 6.2 API Request/Response

**Request**:
```
GET /api/v1/claude-live/prod/agents?tier=1
GET /api/v1/claude-live/prod/agents?tier=2
GET /api/v1/claude-live/prod/agents?tier=all
```

**Response**:
```typescript
{
  success: true,
  agents: [
    {
      id: "uuid",
      slug: "agent-name",
      name: "Agent Name",
      tier: 1, // number, not string
      visibility: "public",
      // ... other fields
    }
  ],
  metadata: {
    total: 19,
    tier1: 9,
    tier2: 10,
    protected: 5,
    filtered: 9,
    appliedTier: "1"
  }
}
```

---

## 7. Test Requirements

### 7.1 Unit Tests

**Frontend Tests** (`frontend/src/tests/unit/tier-filter-bug-fix.test.tsx`):

```typescript
describe('IsolatedRealAgentManager - Tier Filter Bug Fix', () => {
  it('should NOT destroy apiService when tier changes', async () => {
    const { getByTestId } = render(<IsolatedRealAgentManager />);
    const apiService = getApiService();

    // Click tier 2 button
    fireEvent.click(getByTestId('tier-2-button'));

    // Assert service is still active
    expect(apiService.getStatus().isDestroyed).toBe(false);
  });

  it('should reload agents when tier changes', async () => {
    const mockGetAgents = vi.fn().mockResolvedValue({ agents: [] });
    apiService.getAgents = mockGetAgents;

    const { getByTestId } = render(<IsolatedRealAgentManager />);

    // Initial load (tier 1)
    expect(mockGetAgents).toHaveBeenCalledWith({ tier: '1' });

    // Change to tier 2
    fireEvent.click(getByTestId('tier-2-button'));
    await waitFor(() => {
      expect(mockGetAgents).toHaveBeenCalledWith({ tier: '2' });
    });

    // Verify called twice (initial + tier change)
    expect(mockGetAgents).toHaveBeenCalledTimes(2);
  });

  it('should handle rapid tier changes without errors', async () => {
    const { getByTestId } = render(<IsolatedRealAgentManager />);

    // Rapid clicks
    fireEvent.click(getByTestId('tier-2-button'));
    fireEvent.click(getByTestId('tier-1-button'));
    fireEvent.click(getByTestId('tier-all-button'));

    // Wait for all requests
    await waitFor(() => {
      expect(apiService.getStatus().isDestroyed).toBe(false);
    });
  });
});
```

**Backend Tests** (`tests/unit/agent-repository-tier-filtering.test.js`):

```javascript
describe('Agent Repository - Tier Filtering', () => {
  it('should return only tier 1 agents when tier=1', async () => {
    const agents = await getAllAgents('anonymous', { tier: 1 });

    expect(agents.length).toBeGreaterThan(0);
    agents.forEach(agent => {
      expect(agent.tier).toBe(1);
    });
  });

  it('should return only tier 2 agents when tier=2', async () => {
    const agents = await getAllAgents('anonymous', { tier: 2 });

    expect(agents.length).toBeGreaterThan(0);
    agents.forEach(agent => {
      expect(agent.tier).toBe(2);
    });
  });

  it('should return all agents when tier="all"', async () => {
    const allAgents = await getAllAgents('anonymous', { tier: 'all' });
    const tier1 = await getAllAgents('anonymous', { tier: 1 });
    const tier2 = await getAllAgents('anonymous', { tier: 2 });

    expect(allAgents.length).toBe(tier1.length + tier2.length);
  });

  it('should handle string tier parameters', async () => {
    const agents = await getAllAgents('anonymous', { tier: '1' });

    agents.forEach(agent => {
      expect(agent.tier).toBe(1); // number, not string
    });
  });
});
```

### 7.2 Integration Tests

**API Integration** (`tests/integration/tier-filtering-api.test.js`):

```javascript
describe('Tier Filtering API Integration', () => {
  it('GET /api/v1/claude-live/prod/agents?tier=1 returns tier 1 agents', async () => {
    const response = await request(app)
      .get('/api/v1/claude-live/prod/agents?tier=1')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.agents).toBeInstanceOf(Array);
    expect(response.body.agents.length).toBeGreaterThan(0);
    expect(response.body.metadata.filtered).toBe(response.body.agents.length);
    expect(response.body.metadata.appliedTier).toBe('1');

    response.body.agents.forEach(agent => {
      expect(agent.tier).toBe(1);
    });
  });

  it('should match backend logs with API response', async () => {
    // Capture backend logs
    const logSpy = vi.spyOn(console, 'log');

    const response = await request(app)
      .get('/api/v1/claude-live/prod/agents?tier=1')
      .expect(200);

    // Find log line: "📂 Loaded X/Y agents (tier=1)"
    const logLine = logSpy.mock.calls.find(call =>
      call[0]?.includes('Loaded') && call[0]?.includes('tier=1')
    );

    expect(logLine).toBeDefined();

    // Extract count from log: "Loaded 9/19 agents"
    const match = logLine[0].match(/Loaded (\d+)\/\d+ agents/);
    const logCount = parseInt(match[1]);

    // Verify API response matches log count
    expect(response.body.agents.length).toBe(logCount);
  });
});
```

### 7.3 E2E Tests

**Tier Filter Click Flow** (`tests/e2e/tier-filter-bug-fix.spec.ts`):

```typescript
test('Tier filtering should work without errors', async ({ page }) => {
  await page.goto('/agents');

  // Wait for initial load
  await page.waitForSelector('[data-testid="isolated-agent-manager"]');

  // Verify initial state (should default to tier 1)
  const initialCount = await page.locator('.agent-list-item').count();
  expect(initialCount).toBe(9);

  // Click Tier 2 button
  await page.click('[data-testid="tier-2-button"]');

  // Verify agents reload
  await page.waitForLoadState('networkidle');
  const tier2Count = await page.locator('.agent-list-item').count();
  expect(tier2Count).toBe(10);

  // Verify NO error messages
  const errorMessage = await page.locator('text=Route Disconnected').count();
  expect(errorMessage).toBe(0);

  // Click All button
  await page.click('[data-testid="tier-all-button"]');
  await page.waitForLoadState('networkidle');
  const allCount = await page.locator('.agent-list-item').count();
  expect(allCount).toBe(19);

  // Verify service status shows Active
  const statusText = await page.textContent('[data-testid="api-status"]');
  expect(statusText).toContain('Active');
  expect(statusText).not.toContain('Destroyed');
});

test('Rapid tier clicks should not break the UI', async ({ page }) => {
  await page.goto('/agents');
  await page.waitForSelector('[data-testid="isolated-agent-manager"]');

  // Rapid clicking
  await page.click('[data-testid="tier-2-button"]');
  await page.click('[data-testid="tier-1-button"]');
  await page.click('[data-testid="tier-all-button"]');
  await page.click('[data-testid="tier-2-button"]');

  // Wait for final state
  await page.waitForLoadState('networkidle');

  // Verify no errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  expect(consoleErrors).toHaveLength(0);

  // Verify tier 2 is active
  const tier2Count = await page.locator('.agent-list-item').count();
  expect(tier2Count).toBe(10);
});
```

### 7.4 Manual Test Checklist

**Pre-deployment Validation**:

- [ ] Click T1 button - 9 agents load, no errors
- [ ] Click T2 button - 10 agents load, no errors
- [ ] Click All button - 19 agents load, no errors
- [ ] Rapid click T1→T2→All→T1 - no crashes or errors
- [ ] Click tier while request in-flight - handles gracefully
- [ ] Navigate away and back - state persists correctly
- [ ] Refresh page - correct tier loads from localStorage
- [ ] Open browser console - no "Route Disconnected" errors
- [ ] Check API status indicator - always shows "Active"
- [ ] Verify backend logs match API response counts

---

## 8. Success Metrics

### 8.1 Functional Success Criteria

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Tier clicks without error | 0% | 100% | E2E tests passing |
| API returns correct count | 0% | 100% | Integration tests |
| API service destruction on tier change | 100% | 0% | Unit tests |
| Console errors during filtering | >0 | 0 | Manual testing |

### 8.2 Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tier filter response time | <200ms (p95) | Browser DevTools |
| API request latency | <500ms (p95) | Backend logs |
| Memory leaks | 0 | React DevTools Profiler |
| Unnecessary re-renders | <2 per tier change | React DevTools |

### 8.3 Code Quality Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| ESLint warnings | 0 (or documented) | npm run lint |
| TypeScript errors | 0 | npm run type-check |
| Test coverage | >90% for changed code | Jest coverage report |
| Code review approval | 1 approver | GitHub PR review |

---

## 9. Implementation Plan

### Phase 1: Frontend Fix (High Priority)

**Duration**: 2 hours
**Risk**: Low

**Tasks**:
1. Remove `loadAgents` from main useEffect dependencies
2. Add separate useEffect for tier changes
3. Add destroyed check before loadAgents call
4. Add ESLint disable comment with explanation
5. Write unit tests for useEffect behavior
6. Manual test tier clicking

**Files Changed**:
- `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`

**Validation**:
- Unit tests pass
- Manual clicking works without errors
- No "Route Disconnected" messages

### Phase 2: Backend Investigation & Fix (Medium Priority)

**Duration**: 3 hours
**Risk**: Medium

**Tasks**:
1. Add detailed logging to getAllAgents()
2. Verify tier type consistency (number vs string)
3. Test API endpoints with curl
4. Fix type coercion issue
5. Write integration tests
6. Verify logs match response counts

**Files Changed**:
- `/workspaces/agent-feed/api-server/repositories/agent.repository.js`
- `/workspaces/agent-feed/api-server/server.js` (logging only)

**Validation**:
- API returns non-empty arrays
- Backend logs match API response counts
- Integration tests pass

### Phase 3: End-to-End Testing (Low Priority)

**Duration**: 2 hours
**Risk**: Low

**Tasks**:
1. Write E2E tests for tier filtering flow
2. Test rapid clicking scenarios
3. Test navigation and state persistence
4. Verify no console errors
5. Run full test suite

**Files Created**:
- `/workspaces/agent-feed/tests/e2e/tier-filter-bug-fix.spec.ts`

**Validation**:
- All E2E tests pass
- No console errors in Playwright traces
- Performance metrics met

### Phase 4: Documentation & Cleanup (Low Priority)

**Duration**: 1 hour
**Risk**: Low

**Tasks**:
1. Update SPARC specification with actual fixes
2. Add inline code comments
3. Update test documentation
4. Create quick reference guide

**Files Changed**:
- This specification (update "Implementation Notes" section)
- Code comments in changed files
- Test README files

---

## 10. Constraints & Assumptions

### Constraints

1. **Database Mode**: Using filesystem agents (`USE_POSTGRES_AGENTS=false`)
2. **Agent Count**: Exactly 19 agents (9 T1, 10 T2) in `/workspaces/agent-feed/prod/.claude/agents/`
3. **React Version**: Must use React hooks patterns
4. **API Compatibility**: Cannot break existing AVI Orchestrator integration
5. **No Breaking Changes**: Must maintain backward compatibility with existing agent files

### Assumptions

1. All agent files have valid tier field (1 or 2) in frontmatter
2. Agent files are not being modified during tier filtering
3. File system is readable and performant
4. Browser supports React 18+ features
5. Network requests can be aborted via AbortController

### Dependencies

1. Frontend depends on backend API working correctly
2. Backend depends on agent markdown files being valid
3. Tests depend on specific agent count (may need mocking)
4. AVI Orchestrator must continue to work after changes

---

## 11. Risk Assessment

### High Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking AVI Orchestrator | Low | High | Test AVI after frontend changes |
| Introducing memory leaks | Medium | Medium | Profile with React DevTools |
| Breaking other routes | Low | High | Test route navigation thoroughly |

### Medium Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tier type inconsistency | High | Medium | Add validation in agent parsing |
| Race conditions on rapid clicks | Medium | Low | Add debouncing if needed |
| Backend logging performance impact | Low | Medium | Use debug-level logging |

### Low Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Test flakiness | Low | Low | Add proper wait conditions |
| ESLint rule violations | Low | Low | Document suppressions |
| Documentation drift | Low | Low | Update during implementation |

---

## 12. Validation Checklist

**Before merging to main**:

### Code Quality
- [ ] ESLint passes (or suppressions documented)
- [ ] TypeScript compiles with no errors
- [ ] No console.log() statements (use proper logging)
- [ ] Code comments explain "why", not "what"
- [ ] Follows existing code style

### Testing
- [ ] All unit tests pass (frontend + backend)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual testing completed (checklist above)
- [ ] No console errors in browser

### Functionality
- [ ] Tier 1 filter shows 9 agents
- [ ] Tier 2 filter shows 10 agents
- [ ] All filter shows 19 agents
- [ ] No "Route Disconnected" errors
- [ ] API status always shows "Active"
- [ ] Backend logs match API responses

### Performance
- [ ] Tier clicks respond <200ms
- [ ] No memory leaks detected
- [ ] No excessive re-renders
- [ ] API requests complete <500ms

### Compatibility
- [ ] AVI Orchestrator still works
- [ ] Other routes still work
- [ ] Navigation between routes works
- [ ] LocalStorage persistence works

### Documentation
- [ ] Specification updated with implementation notes
- [ ] Code comments added
- [ ] Test documentation complete
- [ ] Quick reference guide created

---

## 13. Rollback Plan

**If issues occur after deployment**:

1. **Immediate Actions** (5 minutes):
   - Revert frontend changes: `git revert <commit-hash>`
   - Deploy previous working version
   - Monitor error logs

2. **Investigation** (30 minutes):
   - Review error logs and user reports
   - Identify specific failure scenario
   - Reproduce in local environment

3. **Decision Point**:
   - **Option A**: Quick fix available → Apply hotfix
   - **Option B**: Complex issue → Keep rollback, create new fix branch

4. **Communication**:
   - Notify users of temporary rollback
   - Create GitHub issue with incident details
   - Update specification with lessons learned

---

## 14. Future Improvements

**Out of scope for this fix, but recommended**:

1. **Debouncing**: Add debounce to tier filter clicks (300ms)
2. **Loading States**: Show skeleton loaders during tier changes
3. **Error Boundaries**: Add React error boundary for apiService failures
4. **Retry Logic**: Implement automatic retry for failed requests
5. **Caching**: Cache agent lists by tier to reduce API calls
6. **Optimistic UI**: Update UI immediately, reconcile with server response
7. **Analytics**: Track tier filter usage and performance
8. **Agent Validation**: Add stricter validation for tier field in markdown

---

## 15. Acceptance Criteria Summary

**This fix is complete when**:

✅ User can click any tier button (T1, T2, All) without errors
✅ API service never shows "Route Disconnected" during tier filtering
✅ Backend API returns correct agent counts (9, 10, 19)
✅ Backend logs match API response counts exactly
✅ All unit, integration, and E2E tests pass
✅ No console errors during manual testing
✅ Performance metrics are met (<200ms frontend, <500ms backend)
✅ AVI Orchestrator continues to work correctly
✅ Code review approved with documentation complete

---

## Appendix A: Code References

### Frontend Files
- **Main Component**: `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`
  - Lines 42-64: loadAgents callback
  - Lines 83-118: Main useEffect (BUG LOCATION)
- **API Service**: `/workspaces/agent-feed/frontend/src/services/apiServiceIsolated.ts`
  - Lines 127-146: destroy() method
  - Lines 66-68: Destroyed check
- **Route Wrapper**: `/workspaces/agent-feed/frontend/src/components/RouteWrapper.tsx`
  - Lines 26-50: Cleanup behavior

### Backend Files
- **Agent Repository**: `/workspaces/agent-feed/api-server/repositories/agent.repository.js`
  - Lines 184-214: getAllAgents() function (BUG LOCATION)
  - Lines 200-204: Tier filtering logic
- **API Server**: `/workspaces/agent-feed/api-server/server.js`
  - Lines 752-807: Agent endpoint
  - Lines 770-774: Tier parameter parsing
- **Database Selector**: `/workspaces/agent-feed/api-server/config/database-selector.js`
  - Lines 68-75: getAllAgents delegation

### Configuration
- **Environment**: `/workspaces/agent-feed/.env`
  - Line 99: USE_POSTGRES_AGENTS=false (filesystem mode)
- **Agents Directory**: `/workspaces/agent-feed/prod/.claude/agents/`
  - Contains 19 agent markdown files with tier frontmatter

---

## Appendix B: Investigation Report Reference

**Full investigation details**: `/workspaces/agent-feed/TIER-FILTER-ERRORS-INVESTIGATION.md`

**Key findings**:
- Frontend: useEffect dependency chain triggers cleanup
- Backend: API returns empty array despite logs showing agents
- User impact: Must navigate away and back to recover
- Evidence: Playwright screenshots show it working previously

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-20 | SPARC Spec Agent | Initial specification created |

---

**Specification Status**: ✅ Ready for Implementation
**Estimated Total Duration**: 8 hours
**Priority**: P0 - Critical
**Next Step**: Begin Phase 1 (Frontend Fix)
