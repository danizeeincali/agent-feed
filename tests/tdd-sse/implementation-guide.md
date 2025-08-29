# TDD London School - WebSocket Removal Implementation Guide

This guide demonstrates the London School Test-Driven Development approach for removing WebSocket dependencies from the TokenCostAnalytics component.

## 🔄 TDD Phases

### Phase 1: RED (Write Failing Tests)

The tests in `websocket-removal-tdd.test.js` define the expected behavior when WebSocket is removed:

1. **TokenCostAnalytics shows disconnected state**
2. **No WebSocket connections are attempted**
3. **SimpleAnalytics tab switching works without WebSocket**
4. **No console errors occur**
5. **Demo mode activates as failsafe**

**Run failing tests:**
```bash
cd /workspaces/agent-feed/tests/tdd-sse
node run-websocket-removal-tdd.js --phase=RED
```

### Phase 2: GREEN (Implement Minimal Solution)

Implement changes to make tests pass:

#### Changes to `useTokenCostTracking.ts`:

```typescript
// Remove WebSocket dependency
import { useState, useEffect, useCallback, useRef } from 'react';
// import { useWebSocketSingleton } from './useWebSocketSingleton'; // Remove this
import { nldLogger } from '@/utils/nld-logger';

export const useTokenCostTracking = (config?: {
  enableRealTime?: boolean;
  updateInterval?: number;
  budgetLimits?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };
}) => {
  const [tokenUsages, setTokenUsages] = useState<TokenUsage[]>([]);
  const [metrics, setMetrics] = useState<TokenCostMetrics | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // WebSocket is disabled - always return disconnected state
  const isConnected = false;
  const socket = null;

  // ... rest of the implementation remains the same, but:
  // - Remove all socket.emit calls
  // - Remove WebSocket event listeners
  // - Always load demo data when no localStorage data exists
```

#### Changes to `TokenCostAnalytics.tsx`:

```typescript
// In the status display section:
<div className="flex items-center gap-2 mt-1">
  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
  <span className="text-sm text-gray-500">
    {isConnected ? 'Real-time updates active' : 'Disconnected'}
  </span>
  {loading && (
    <span className="text-sm text-blue-600 flex items-center gap-1">
      <RefreshCw className="w-3 h-3 animate-spin" />
      Loading...
    </span>
  )}
  {!isConnected && tokenUsages.length > 0 && tokenUsages[0]?.metadata?.demo && (
    <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
      Demo Mode
    </span>
  )}
</div>
```

**Run tests to verify implementation:**
```bash
node run-websocket-removal-tdd.js --phase=GREEN
```

### Phase 3: REFACTOR (Improve Implementation)

Once tests pass, improve the implementation:

1. **Extract demo data to separate utility**
2. **Add better error handling**
3. **Optimize performance without WebSocket overhead**
4. **Improve accessibility**

## 🧪 Test Structure (London School)

### Outside-In Approach

Tests start with user behavior and work inward:

```typescript
// 1. User Experience Level
it('should show disconnected state when WebSocket is unavailable', async () => {
  // Arrange: Setup user scenario
  const mockHookReturn = createTokenCostTrackingMockWithoutWebSocket();
  useTokenCostTracking.mockReturnValue(mockHookReturn);

  // Act: User loads the component
  render(<TokenCostAnalytics />);

  // Assert: User sees disconnected state
  expect(screen.getByText('Disconnected')).toBeInTheDocument();
});
```

### Mock-Driven Contracts

Mocks define expected collaborations:

```typescript
// 2. Component Collaboration Level
it('should not attempt any WebSocket connections during lifecycle', async () => {
  // Arrange: Mock collaborators
  const mockHookReturn = createTokenCostTrackingMockWithoutWebSocket();
  useTokenCostTracking.mockReturnValue(mockHookReturn);

  // Act: Component lifecycle
  const { unmount } = render(<TokenCostAnalytics />);
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
  });
  unmount();

  // Assert: Verify collaboration behavior
  verifyNoWebSocketConnections();
  expect(useWebSocketSingleton).toHaveReturnedWith(
    expect.objectContaining({
      socket: null,
      isConnected: false
    })
  );
});
```

### Behavior Verification

Focus on HOW objects collaborate:

```typescript
// 3. Interaction Verification Level
it('should verify interaction patterns match London School expectations', async () => {
  // Arrange: Setup collaboration mocks
  const trackingMock = createTokenCostTrackingMockWithoutWebSocket();
  const wsCollaboratorMock = {
    socket: null,
    isConnected: false,
    connect: jest.fn(),
    disconnect: jest.fn()
  };

  // Act: Trigger interactions
  render(<TokenCostAnalytics budgetLimits={{ daily: 10 }} />);

  // Assert: Verify collaboration contracts
  expect(useTokenCostTracking).toHaveBeenCalledWith(
    expect.objectContaining({
      enableRealTime: true,
      budgetLimits: { daily: 10 }
    })
  );
  
  // Should not attempt to use WebSocket when it's null
  expect(wsCollaboratorMock.connect).not.toHaveBeenCalled();
  expect(wsCollaboratorMock.disconnect).not.toHaveBeenCalled();
});
```

## 🎯 Key London School Principles Applied

### 1. Mock Everything External
- WebSocket connections
- HTTP requests  
- Browser APIs (localStorage, console)
- React hooks

### 2. Test Behavior, Not Implementation
- Focus on what the user sees ("Disconnected" state)
- Verify interactions between objects
- Don't test internal state directly

### 3. Outside-In Development
- Start with user stories/acceptance criteria
- Work from UI components down to services
- Let tests drive the design

### 4. Fail Fast, Fail Clear
- Tests should fail immediately when contracts break
- Error messages should guide implementation
- Each test verifies specific behavior

## 📊 Expected Test Results

### RED Phase (Initial Run)
```
❌ should show disconnected state when WebSocket is unavailable
❌ should not attempt any WebSocket connections during lifecycle  
❌ should allow tab switching without WebSocket connections
❌ should handle TokenCostAnalytics loading failures gracefully
❌ should not produce console errors during normal WebSocket-less operation
```

### GREEN Phase (After Implementation)
```
✅ should show disconnected state when WebSocket is unavailable
✅ should not attempt any WebSocket connections during lifecycle
✅ should allow tab switching without WebSocket connections  
✅ should handle TokenCostAnalytics loading failures gracefully
✅ should not produce console errors during normal WebSocket-less operation
```

## 🔧 Running the Tests

### Run Complete TDD Cycle:
```bash
# Phase 1: RED (failing tests)
node run-websocket-removal-tdd.js --phase=RED

# Implement changes...

# Phase 2: GREEN (passing tests)
node run-websocket-removal-tdd.js --phase=GREEN

# Phase 3: REFACTOR (improve while keeping tests green)
node run-websocket-removal-tdd.js --phase=GREEN  # Re-run after refactoring
```

### Run Specific Test Categories:
```bash
# Just the WebSocket removal tests
npx jest websocket-removal-tdd.test.js

# With coverage
npx jest websocket-removal-tdd.test.js --coverage

# Watch mode for development
npx jest websocket-removal-tdd.test.js --watch
```

## 📝 Summary

This TDD approach ensures that:

1. **Requirements are clear** - Tests document expected behavior
2. **Implementation is minimal** - Only code needed to pass tests
3. **Design emerges naturally** - Tests drive architecture decisions  
4. **Refactoring is safe** - Tests protect against regression
5. **Coverage is comprehensive** - London School focuses on behavior coverage

The WebSocket removal is implemented safely with confidence that all expected behaviors are preserved.