# TDD State Consistency Test Patterns

## Generated from NLD Failure Analysis: Instance State Synchronization

Based on the captured failure patterns from the instance state synchronization issues, here are comprehensive TDD patterns to prevent similar failures in the future.

## Core Testing Principles

### 1. Stable Identity Generation
**Problem:** PID-based IDs break navigation on process restart  
**Solution:** UUID-based stable instance identification

```typescript
// tests/unit/InstanceIdentity.test.ts
describe('Instance Identity Stability', () => {
  it('should generate stable UUID-based IDs', () => {
    const instance = createInstance();
    expect(instance.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(instance.id).not.toBe(instance.pid?.toString());
  });

  it('should maintain same ID across process restarts', () => {
    const instanceId = 'test-uuid-123';
    const originalInstance = { id: instanceId, pid: 1234, status: 'running' };
    
    // Simulate restart - PID changes but ID stays same
    const restartedInstance = restartProcess(originalInstance);
    
    expect(restartedInstance.id).toBe(instanceId);
    expect(restartedInstance.pid).not.toBe(1234);
  });

  it('should never use "unknown" as instance ID', () => {
    const processInfo = { pid: null, status: 'stopped', startTime: null };
    const instance = transformProcessToInstance(processInfo);
    
    expect(instance.id).not.toBe('unknown');
    expect(instance.id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
```

### 2. State Consistency Validation
**Problem:** Stats and instances show different data  
**Solution:** Cross-component state validation tests

```typescript
// tests/integration/StateConsistency.test.ts
describe('State Consistency Across Components', () => {
  it('should maintain consistent state between ProcessManager and UI', () => {
    const processManager = new ProcessManager();
    const processInfo = processManager.getProcessInfo();
    
    const { instances, stats } = renderHook(() => useInstanceManager()).result.current;
    
    // Stats should match instances array
    const runningInstances = instances.filter(i => i.status === 'running');
    expect(stats.running).toBe(runningInstances.length);
    
    const stoppedInstances = instances.filter(i => i.status === 'stopped');  
    expect(stats.stopped).toBe(stoppedInstances.length);
    
    expect(stats.total).toBe(instances.length);
  });

  it('should reflect ProcessManager status changes in UI immediately', async () => {
    const { result } = renderHook(() => useInstanceManager());
    
    // Initial state
    expect(result.current.stats.running).toBe(0);
    
    // Launch process
    await act(async () => {
      await result.current.launchInstance();
    });
    
    // State should update immediately
    expect(result.current.stats.running).toBe(1);
    expect(result.current.instances[0].status).toBe('running');
  });

  it('should not show stale data during state transitions', async () => {
    const { result } = renderHook(() => useInstanceManager());
    
    await act(async () => {
      await result.current.launchInstance();
    });
    
    const initialInstance = result.current.instances[0];
    expect(initialInstance.status).toBe('running');
    
    // Restart process
    await act(async () => {
      await result.current.restartInstance(initialInstance.id);
    });
    
    // Should not show old data
    const updatedInstance = result.current.instances.find(i => i.id === initialInstance.id);
    expect(updatedInstance.pid).not.toBe(initialInstance.pid); // New PID
    expect(updatedInstance.id).toBe(initialInstance.id); // Same ID
  });
});
```

### 3. Navigation Reliability Tests  
**Problem:** Terminal navigation fails with "Instance Not Found"  
**Solution:** Navigation state and routing tests

```typescript
// tests/integration/NavigationReliability.test.ts
describe('Terminal Navigation Reliability', () => {
  it('should successfully navigate to running instance terminal', () => {
    const instance = createMockInstance({ status: 'running' });
    const navUrl = `/dual-instance/terminal/${instance.id}`;
    
    render(<MemoryRouter initialEntries={[navUrl]}><DualInstancePage /></MemoryRouter>);
    
    expect(screen.queryByText('Instance Not Found')).not.toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('should handle instance ID changes gracefully', async () => {
    const { rerender } = render(<MemoryRouter><DualInstancePage /></MemoryRouter>);
    
    // Navigate to terminal with valid instance
    const instance = createMockInstance({ id: 'stable-uuid-123' });
    mockUseInstanceManager.mockReturnValue({
      instances: [instance],
      stats: { running: 1, stopped: 0, total: 1 }
    });
    
    rerender(
      <MemoryRouter initialEntries={[`/dual-instance/terminal/${instance.id}`]}>
        <DualInstancePage />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('should disable terminal tab when no running instances', () => {
    mockUseInstanceManager.mockReturnValue({
      instances: [],
      stats: { running: 0, stopped: 0, total: 0 }
    });
    
    render(<MemoryRouter><DualInstancePage /></MemoryRouter>);
    
    const terminalTab = screen.getByText('Terminal').closest('button');
    expect(terminalTab).toBeDisabled();
    expect(terminalTab).toHaveAttribute('title', 'No running instances');
  });
});
```

### 4. Date and Time Consistency
**Problem:** `new Date()` creates different timestamps on re-renders  
**Solution:** Controlled date/time testing

```typescript
// tests/unit/DateConsistency.test.ts
describe('Date and Time Consistency', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should use processInfo.startTime when available', () => {
    const startTime = new Date('2024-01-01T09:00:00Z');
    const processInfo = { pid: 1234, startTime, status: 'running' };
    
    const instance = transformProcessToInstance(processInfo);
    
    expect(instance.createdAt).toBe(startTime);
    expect(instance.createdAt).not.toBe(new Date()); // Should not create fresh date
  });

  it('should use consistent fallback date when startTime is null', () => {
    const processInfo = { pid: 1234, startTime: null, status: 'running' };
    
    const instance1 = transformProcessToInstance(processInfo);
    const instance2 = transformProcessToInstance(processInfo);
    
    expect(instance1.createdAt).toEqual(instance2.createdAt);
  });

  it('should not change createdAt on component re-renders', () => {
    const { result, rerender } = renderHook(() => useInstanceManager());
    
    const initialInstance = result.current.instances[0];
    const initialCreatedAt = initialInstance?.createdAt;
    
    rerender();
    
    const rerenderedInstance = result.current.instances[0];
    expect(rerenderedInstance?.createdAt).toBe(initialCreatedAt);
  });
});
```

### 5. Data Flow Integration Tests
**Problem:** Multi-layer state transformations breaking  
**Solution:** End-to-end data flow validation

```typescript
// tests/integration/DataFlow.test.ts
describe('ProcessManager to UI Data Flow', () => {
  it('should propagate ProcessManager events to UI components', async () => {
    const processManager = new ProcessManager();
    const { result } = renderHook(() => useInstanceManager());
    
    // Launch process via ProcessManager
    const processInfo = await processManager.launchInstance();
    
    // UI should reflect the change
    await waitFor(() => {
      expect(result.current.instances).toHaveLength(1);
      expect(result.current.instances[0].pid).toBe(processInfo.pid);
      expect(result.current.stats.running).toBe(1);
    });
  });

  it('should handle WebSocket disconnections gracefully', async () => {
    const { result } = renderHook(() => useInstanceManager());
    
    // Simulate WebSocket disconnect
    fireEvent(window, new Event('offline'));
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.instances).toEqual([]); // Should clear state
  });

  it('should recover state on WebSocket reconnection', async () => {
    const { result } = renderHook(() => useInstanceManager());
    
    // Launch instance while connected
    await act(async () => {
      await result.current.launchInstance();
    });
    
    const instanceBeforeDisconnect = result.current.instances[0];
    
    // Simulate disconnect/reconnect
    fireEvent(window, new Event('offline'));
    fireEvent(window, new Event('online'));
    
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.instances[0].id).toBe(instanceBeforeDisconnect.id);
    });
  });
});
```

## Test Execution Strategy

### 1. Unit Tests (Individual Components)
- Run: `npm test -- --testPathPattern=unit`
- Focus: Individual component behavior in isolation
- Mock: External dependencies and services

### 2. Integration Tests (Component Interaction)  
- Run: `npm test -- --testPathPattern=integration`
- Focus: Data flow between components
- Mock: External services only

### 3. End-to-End Tests (Full User Workflows)
- Run: `npm run test:e2e`
- Focus: Complete user scenarios
- Mock: Nothing - test real interactions

## Continuous Testing Guidelines

### Pre-commit Hooks
```bash
# Run state consistency tests before every commit  
npm run test:state-consistency
npm run test:navigation
```

### CI/CD Integration
```yaml
- name: State Management Tests
  run: |
    npm test -- --testPathPattern="StateConsistency|NavigationReliability|DataFlow"
    npm run test:integration
```

### Performance Testing
```typescript
// Ensure state updates don't cause performance regressions
describe('State Update Performance', () => {
  it('should update state within acceptable time limits', async () => {
    const startTime = performance.now();
    
    await launchInstance();
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Max 1 second
  });
});
```

This comprehensive TDD approach addresses all identified failure patterns and provides a robust foundation for preventing state synchronization issues in the future.