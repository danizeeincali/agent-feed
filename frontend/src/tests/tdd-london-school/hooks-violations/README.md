# TDD London School - React Hooks Violations Test Suite

This comprehensive test suite applies **London School (mockist) Test-Driven Development** methodology to expose React hooks violations in the UnifiedAgentPage component ecosystem.

## 🎯 London School Principles Applied

### Mock-First Approach
- **External Dependencies**: All APIs, React Router, and browser APIs are mocked
- **Behavior Verification**: Tests focus on HOW components interact with their dependencies
- **Contract Testing**: Mock contracts define expected collaboration patterns
- **Test Doubles**: Precise control over component execution paths

### Outside-In Development
- **User Behavior First**: Tests start from user interactions and work inward
- **Component Contracts**: Define clear interfaces through mock expectations
- **Isolation**: Each test isolates the component under test from its collaborators

## 🚨 Hooks Violations Exposed

### 1. Hooks Order Violations (`unified-agent-page-hooks.test.tsx`)

**Violations Detected:**
- Conditional hook usage based on agent state changes
- Varying hook counts when switching between tabs
- Missing dependencies in useEffect causing stale closures
- useCallback dependency instability with fetchAgentData

**Key Test Scenarios:**
```typescript
// Exposes hooks order violations with rapid agentId changes
test('should maintain stable hooks order when agentId prop changes rapidly')

// Detects conditional hook usage in error states  
test('should expose conditional hooks usage in error states')

// Reveals infinite re-render loops from state management
test('should detect infinite re-render loops from state management')
```

### 2. AgentPagesTab Hook Violations (`agent-pages-tab-hooks.test.tsx`)

**Violations Detected:**
- Hooks count inconsistency with varying page data arrays
- Conditional useState usage in loading/error states
- useMemo dependency instability in filteredAndSortedPages
- useEffect missing agent.id dependency

**Key Test Scenarios:**
```typescript
// Exposes hooks count changes with different page arrays
test('should expose hooks count inconsistency with varying page arrays')

// Detects missing dependencies in useMemo
test('should expose missing dependencies in filteredAndSortedPages useMemo')

// Reveals useEffect dependency violations
test('should expose useEffect missing agent.id dependency')
```

### 3. Memory Constraints (`hooks-memory-constraints.test.tsx`)

**Memory Violations Detected:**
- Memory leaks from uncleaned useEffect subscriptions
- Excessive memory usage exceeding 512MB limits
- Memory accumulation from rapid re-renders
- WebSocket connection memory leaks

**Performance Violations Detected:**
- Render times exceeding 16.67ms frame budget
- Excessive useCallback recreations
- Infinite re-render loops from unstable dependencies

## 🧪 Mock Infrastructure

### API Mocks
```typescript
// workspaceApi mock with precise behavior control
jest.mock('../../../src/services/api', () => ({
  workspaceApi: {
    listPages: jest.fn(),
    createPage: jest.fn(),
  }
}));

// React Router mocks for navigation testing
const mockUseParams = jest.fn();
const mockUseNavigate = jest.fn();
```

### Memory Monitoring
```typescript
class MemoryMonitor {
  private allocations = new Map<string, number>();
  private limit: number = 512 * 1024 * 1024; // 512MB
  
  allocate(id: string, sizeMB: number): number;
  deallocate(id: string): void;
  getUsagePercent(): number;
}
```

### Performance Tracking
```typescript
class PerformanceTracker {
  private renderTimes: number[] = [];
  private hookCalls = new Map<string, number>();
  
  trackHook(hookName: string): void;
  getAverageRenderTime(): number;
  getExcessiveHooks(): Array<{ hook: string, calls: number }>;
}
```

## 🔍 Specific Hooks Issues Found

### 1. Missing Dependencies in useEffect (Line 444)
```typescript
// VIOLATION: fetchAgentData not included in dependency array
useEffect(() => {
  fetchAgentData();
}, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps
```

**London School Test:**
```typescript
test('should expose useEffect missing agent.id dependency', async () => {
  // Change agent ID to trigger useEffect dependency issue
  expect(mockConsoleError).toHaveBeenCalledWith(
    expect.stringMatching(/useEffect.*missing.*dependency/)
  );
});
```

### 2. Unstable useMemo Dependencies (Line 270)
```typescript
// VIOLATION: Simplified dependencies missing sortBy, difficultyFilter, showFeaturedFirst
const filteredAndSortedPages = useMemo(() => {
  // Complex filtering logic...
}, [agentPages, searchTerm, typeFilter, selectedCategory]); // Missing dependencies!
```

**London School Test:**
```typescript
test('should expose missing dependencies in filteredAndSortedPages useMemo', async () => {
  // Trigger useMemo recalculation with missing dependencies
  expect(mockConsoleError).toHaveBeenCalledWith(
    expect.stringMatching(/useMemo.*missing.*dependency/)
  );
});
```

### 3. Conditional Hooks in AgentPagesTab
```typescript
// VIOLATION: Different hook counts based on loading/error states
if (loading) {
  return <LoadingComponent />; // Different hook count
}

if (error) {
  return <ErrorComponent />; // Different hook count
}

// Normal render with full hook set
const [state1] = useState();
const [state2] = useState();
// ... more hooks
```

**London School Test:**
```typescript
test('should detect conditional useState usage in loading states', async () => {
  // Component renders different hook counts in different states
  expect(mockConsoleError).toHaveBeenCalledWith(
    expect.stringMatching(/Hook.*called conditionally/)
  );
});
```

## 🎯 Running the Tests

### Run Individual Test Suites
```bash
# Core hooks violations
npm test unified-agent-page-hooks.test.tsx

# AgentPagesTab specific violations  
npm test agent-pages-tab-hooks.test.tsx

# Memory and performance violations
npm test hooks-memory-constraints.test.tsx
```

### Run All Hooks Violation Tests
```bash
npm test hooks-violations
```

### Run with Memory Profiling
```bash
NODE_OPTIONS="--max-old-space-size=512" npm test hooks-violations
```

## 📊 Test Results Interpretation

### Expected Violations
✅ **Tests SHOULD fail** - This indicates hooks violations are properly detected

### Console Errors to Watch For
- `Hook was called conditionally`
- `rendered fewer hooks than expected`  
- `rendered more hooks than expected`
- `useEffect has missing dependency`
- `useMemo has missing dependency`
- `Memory limit exceeded`
- `Too many re-renders`

### Performance Metrics
- Render times > 16.67ms indicate performance issues
- Memory usage > 512MB indicates memory violations
- Hook call counts > 50 indicate instability

## 🔧 Mock Contract Verification

### API Contract Tests
```typescript
test('should verify workspaceApi mock contracts', () => {
  expect(mockWorkspaceApi.listPages).toBeInstanceOf(Function);
  expect(mockWorkspaceApi.createPage).toBeInstanceOf(Function);
});
```

### Component Interaction Tests
```typescript
test('should verify hook call contracts match expected patterns', () => {
  expect(hookCallTracker.has('useState-1')).toBe(true);
  expect(hookCallTracker.has('useEffect-["agent-id"]')).toBe(true);
});
```

## 🎨 London School Benefits

### 1. **Precise Behavior Testing**
- Tests focus on HOW components collaborate
- Mock contracts define expected interactions
- Behavior verification over state inspection

### 2. **Fast Feedback Loop**
- No real API calls or network requests
- Isolated component testing
- Immediate violation detection

### 3. **Design Feedback**
- Mocks reveal tight coupling issues
- Contract violations indicate design problems
- Outside-in approach improves architecture

### 4. **Comprehensive Coverage**
- Tests all code paths through mocks
- Edge cases easily simulated
- Error scenarios fully covered

## 🚀 Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Hooks Violation Tests
  run: |
    npm test hooks-violations -- --verbose --detectLeaks
    NODE_OPTIONS="--max-old-space-size=512" npm test hooks-violations
```

### Memory Monitoring
```bash
# Run with memory constraints
NODE_OPTIONS="--max-old-space-size=512 --expose-gc" npm test
```

## 📝 Next Steps

1. **Fix Identified Violations**: Address the hooks issues found by these tests
2. **Add More Scenarios**: Expand test coverage for additional edge cases  
3. **Performance Optimization**: Use test results to guide performance improvements
4. **Continuous Monitoring**: Integrate tests into CI pipeline for ongoing validation

---

**Remember**: In London School TDD, **failing tests are good tests** - they expose real problems that need fixing!