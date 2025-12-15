# Testing Strategy & Validation Criteria Specification

## 1. TESTING STRATEGY OVERVIEW

### 1.1 Testing Philosophy
**Goal**: Ensure reliable transformation from mock to real Claude process execution with comprehensive validation at every level.

**Approach**: Multi-layered testing pyramid with emphasis on:
- Unit testing for individual components
- Integration testing for process interactions
- End-to-end testing for complete workflows
- Performance testing for scalability
- Chaos testing for resilience

### 1.2 Test Environment Setup
```yaml
Test Environments:
  development:
    description: Local development environment
    claude_binary: mock_claude_simulator
    processes: 1-3 concurrent
    resources: limited
    
  staging:
    description: Pre-production testing
    claude_binary: real_claude_binary
    processes: 1-10 concurrent
    resources: production-like
    
  production:
    description: Live system validation
    claude_binary: real_claude_binary
    processes: full capacity
    resources: production
    monitoring: full observability
```

## 2. UNIT TESTING SPECIFICATION

### 2.1 Process Management Unit Tests
```typescript
describe('RealClaudeProcessManager', () => {
  let processManager: RealClaudeProcessManager;
  let mockProcessSpawner: jest.Mocked<ProcessSpawner>;
  let mockRegistry: jest.Mocked<ProcessRegistry>;

  beforeEach(() => {
    mockProcessSpawner = createMockProcessSpawner();
    mockRegistry = createMockRegistry();
    processManager = new RealClaudeProcessManager(mockProcessSpawner, mockRegistry);
  });

  describe('spawnProcess', () => {
    test('should spawn process with correct command arguments', async () => {
      // Arrange
      const config: SpawnConfig = {
        command: ['claude', '--dangerously-skip-permissions'],
        workingDirectory: '/workspaces/agent-feed/prod',
        metadata: { type: 'skip-permissions', label: 'Test Instance' }
      };

      mockProcessSpawner.spawn.mockResolvedValue(createMockProcessInstance());

      // Act
      const instance = await processManager.spawnProcess(config);

      // Assert
      expect(mockProcessSpawner.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          command: ['claude', '--dangerously-skip-permissions'],
          workingDirectory: '/workspaces/agent-feed/prod'
        })
      );
      expect(instance.status).toBe(ProcessStatus.SPAWNING);
      expect(instance.pid).toBeGreaterThan(0);
    });

    test('should handle spawn failure gracefully', async () => {
      // Arrange
      const config: SpawnConfig = {
        command: ['invalid-command'],
        workingDirectory: '/invalid/path'
      };

      mockProcessSpawner.spawn.mockRejectedValue(new ProcessSpawnError(
        ['invalid-command'], 
        '/invalid/path', 
        new Error('Command not found')
      ));

      // Act & Assert
      await expect(processManager.spawnProcess(config))
        .rejects.toThrow(ProcessSpawnError);
    });

    test('should enforce resource limits during spawn', async () => {
      // Arrange
      const config: SpawnConfig = {
        command: ['claude'],
        resourceLimits: {
          memory: { max: 1024 * 1024 * 1024 }, // 1GB
          cpu: { max: 80 }
        }
      };

      // Mock resource exhaustion
      mockProcessSpawner.spawn.mockRejectedValue(
        new ResourceExhaustionError('memory', 2048, 1024)
      );

      // Act & Assert
      await expect(processManager.spawnProcess(config))
        .rejects.toThrow(ResourceExhaustionError);
    });

    test('should generate unique instance IDs', async () => {
      // Arrange
      const config: SpawnConfig = { command: ['claude'] };
      mockProcessSpawner.spawn
        .mockResolvedValueOnce(createMockProcessInstance('instance-1'))
        .mockResolvedValueOnce(createMockProcessInstance('instance-2'));

      // Act
      const [instance1, instance2] = await Promise.all([
        processManager.spawnProcess(config),
        processManager.spawnProcess(config)
      ]);

      // Assert
      expect(instance1.instanceId).not.toBe(instance2.instanceId);
      expect(instance1.pid).not.toBe(instance2.pid);
    });
  });

  describe('terminateProcess', () => {
    test('should perform graceful termination', async () => {
      // Arrange
      const instance = createMockProcessInstance();
      mockRegistry.get.mockReturnValue(instance);
      
      // Mock graceful termination
      const mockKill = jest.fn().mockReturnValue(true);
      instance.process.kill = mockKill;

      // Act
      await processManager.terminateProcess(instance.instanceId);

      // Assert
      expect(mockKill).toHaveBeenCalledWith('SIGTERM');
    });

    test('should force kill after graceful timeout', async () => {
      // Arrange
      const instance = createMockProcessInstance();
      mockRegistry.get.mockReturnValue(instance);
      
      const mockKill = jest.fn()
        .mockReturnValueOnce(true)  // SIGTERM
        .mockReturnValueOnce(true); // SIGKILL
      instance.process.kill = mockKill;

      // Mock graceful timeout
      jest.spyOn(processManager, 'waitForExit')
        .mockResolvedValueOnce(false) // Graceful fails
        .mockResolvedValueOnce(true); // Force succeeds

      // Act
      await processManager.terminateProcess(instance.instanceId, { timeout: 1000 });

      // Assert
      expect(mockKill).toHaveBeenCalledWith('SIGTERM');
      expect(mockKill).toHaveBeenCalledWith('SIGKILL');
    });
  });
});

describe('ProcessIOHandler', () => {
  let ioHandler: ProcessIOHandler;
  let mockInstance: ProcessInstance;
  let mockBroadcaster: jest.Mocked<ProcessSSEBroadcaster>;

  beforeEach(() => {
    mockInstance = createMockProcessInstance();
    mockBroadcaster = createMockBroadcaster();
    ioHandler = new ProcessIOHandler(mockInstance, mockBroadcaster);
  });

  describe('sendInput', () => {
    test('should write input to process stdin', () => {
      // Arrange
      const input = 'help\n';
      const mockWrite = jest.fn().mockReturnValue(true);
      mockInstance.process.stdin = { write: mockWrite, writable: true } as any;

      // Act
      const result = ioHandler.sendInput(input);

      // Assert
      expect(result).toBe(true);
      expect(mockWrite).toHaveBeenCalledWith(input);
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(
        mockInstance.instanceId,
        expect.objectContaining({
          type: 'terminal:input_echo',
          data: 'help'
        })
      );
    });

    test('should handle stdin write failure', () => {
      // Arrange
      const input = 'test\n';
      mockInstance.process.stdin = { write: jest.fn().mockReturnValue(false), writable: true } as any;

      // Act
      const result = ioHandler.sendInput(input);

      // Assert
      expect(result).toBe(false);
    });

    test('should handle closed stdin stream', () => {
      // Arrange
      const input = 'test\n';
      mockInstance.process.stdin = { writable: false } as any;

      // Act
      const result = ioHandler.sendInput(input);

      // Assert
      expect(result).toBe(false);
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(
        mockInstance.instanceId,
        expect.objectContaining({
          type: 'terminal:error',
          error: 'Process stdin is not writable'
        })
      );
    });
  });

  describe('stdout handling', () => {
    test('should broadcast stdout data via SSE', () => {
      // Arrange
      const outputData = Buffer.from('Claude response\n');
      
      // Act
      // Simulate stdout data event
      mockInstance.process.stdout?.emit('data', outputData);

      // Assert
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(
        mockInstance.instanceId,
        expect.objectContaining({
          type: 'terminal:output',
          data: 'Claude response\n',
          stream: 'stdout'
        })
      );
      expect(mockInstance.outputBytes).toBe(outputData.length);
    });

    test('should handle stderr data separately', () => {
      // Arrange
      const errorData = Buffer.from('Error message\n');
      
      // Act
      mockInstance.process.stderr?.emit('data', errorData);

      // Assert
      expect(mockBroadcaster.broadcast).toHaveBeenCalledWith(
        mockInstance.instanceId,
        expect.objectContaining({
          type: 'terminal:output',
          data: 'Error message\n',
          stream: 'stderr'
        })
      );
    });
  });
});
```

### 2.2 Resource Management Unit Tests
```typescript
describe('ResourceManager', () => {
  let resourceManager: ResourceManager;
  let mockLimits: ResourceLimits;

  beforeEach(() => {
    mockLimits = {
      maxProcesses: 5,
      maxMemoryPerProcess: 1024 * 1024 * 1024, // 1GB
      maxTotalMemory: 4 * 1024 * 1024 * 1024,  // 4GB
      maxCpuPerProcess: 80,
      maxFiles: 1000
    };
    resourceManager = new ResourceManager(mockLimits);
  });

  test('should allow resource allocation within limits', async () => {
    // Arrange
    const requirements: ResourceRequirements = {
      memory: 512 * 1024 * 1024, // 512MB
      cpu: 40,
      fileDescriptors: 100
    };

    // Act
    const allocation = await resourceManager.allocateResources('instance-1', requirements);

    // Assert
    expect(allocation.memory).toBe(requirements.memory);
    expect(allocation.cpu).toBe(requirements.cpu);
    expect(allocation.fileDescriptors).toBe(requirements.fileDescriptors);
  });

  test('should reject allocation exceeding limits', async () => {
    // Arrange
    const requirements: ResourceRequirements = {
      memory: 2 * 1024 * 1024 * 1024, // 2GB (exceeds per-process limit)
      cpu: 40
    };

    // Act & Assert
    await expect(resourceManager.allocateResources('instance-1', requirements))
      .rejects.toThrow(ResourceExhaustionError);
  });

  test('should track resource utilization correctly', async () => {
    // Arrange
    const req1: ResourceRequirements = { memory: 1024 * 1024 * 1024, cpu: 50 }; // 1GB, 50%
    const req2: ResourceRequirements = { memory: 1024 * 1024 * 1024, cpu: 30 }; // 1GB, 30%

    // Act
    await resourceManager.allocateResources('instance-1', req1);
    await resourceManager.allocateResources('instance-2', req2);

    const utilization = resourceManager.getResourceUtilization();

    // Assert
    expect(utilization.memoryUtilization).toBe(0.5); // 2GB / 4GB
    expect(utilization.cpuUtilization).toBe(0.8);    // 80% / 100%
  });
});

describe('ProcessHealthMonitor', () => {
  let healthMonitor: ProcessHealthMonitor;
  let mockInstance: ProcessInstance;

  beforeEach(() => {
    healthMonitor = new ProcessHealthMonitor();
    mockInstance = createMockProcessInstance();
  });

  test('should detect healthy process', async () => {
    // Arrange
    mockInstance.lastActivity = new Date(Date.now() - 1000); // 1 second ago
    jest.spyOn(healthMonitor, 'processExists').mockReturnValue(true);
    jest.spyOn(healthMonitor, 'getProcessMemoryUsage').mockResolvedValue(100 * 1024 * 1024); // 100MB
    jest.spyOn(healthMonitor, 'getProcessCPUUsage').mockResolvedValue(25); // 25%

    // Act
    const healthResult = await healthMonitor.performHealthCheck(mockInstance);

    // Assert
    expect(healthResult.healthy).toBe(true);
    expect(healthResult.issues).toHaveLength(0);
  });

  test('should detect memory issues', async () => {
    // Arrange
    jest.spyOn(healthMonitor, 'processExists').mockReturnValue(true);
    jest.spyOn(healthMonitor, 'getProcessMemoryUsage')
      .mockResolvedValue(1.5 * 1024 * 1024 * 1024); // 1.5GB (exceeds critical)
    jest.spyOn(healthMonitor, 'getProcessCPUUsage').mockResolvedValue(25);

    // Act
    const healthResult = await healthMonitor.performHealthCheck(mockInstance);

    // Assert
    expect(healthResult.healthy).toBe(false);
    expect(healthResult.issues).toContainEqual(
      expect.objectContaining({
        type: 'critical',
        message: 'Critical memory usage'
      })
    );
  });

  test('should detect inactive process', async () => {
    // Arrange
    mockInstance.lastActivity = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    jest.spyOn(healthMonitor, 'processExists').mockReturnValue(true);
    jest.spyOn(healthMonitor, 'getProcessMemoryUsage').mockResolvedValue(100 * 1024 * 1024);
    jest.spyOn(healthMonitor, 'getProcessCPUUsage').mockResolvedValue(25);

    // Act
    const healthResult = await healthMonitor.performHealthCheck(mockInstance);

    // Assert
    expect(healthResult.healthy).toBe(false);
    expect(healthResult.issues).toContainEqual(
      expect.objectContaining({
        type: 'critical',
        message: 'Process appears inactive'
      })
    );
  });
});
```

## 3. INTEGRATION TESTING SPECIFICATION

### 3.1 Process Lifecycle Integration Tests
```typescript
describe('Process Lifecycle Integration', () => {
  let testEnvironment: TestEnvironment;

  beforeAll(async () => {
    testEnvironment = await setupIntegrationTestEnvironment();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  test('complete process lifecycle: create → run → terminate', async () => {
    // Phase 1: Create process
    const createResponse = await testEnvironment.apiClient.post('/api/v2/claude/instances', {
      command: ['claude', '--version'],
      workingDirectory: '/tmp/test',
      metadata: { type: 'integration-test' }
    });

    expect(createResponse.status).toBe(201);
    const instanceId = createResponse.data.data.instanceId;
    const pid = createResponse.data.data.pid;

    // Verify process exists in system
    expect(await processExists(pid)).toBe(true);

    // Phase 2: Wait for running state
    await waitForInstanceStatus(instanceId, ProcessStatus.RUNNING, 5000);

    const instanceDetails = await testEnvironment.apiClient.get(
      `/api/v2/claude/instances/${instanceId}`
    );
    expect(instanceDetails.data.data.status).toBe(ProcessStatus.RUNNING);

    // Phase 3: Send input and verify output
    const sseClient = testEnvironment.createSSEClient(instanceId);
    const outputPromise = sseClient.waitForEvent('terminal:output', 2000);

    await testEnvironment.apiClient.post(
      `/api/v2/claude/instances/${instanceId}/terminal/input`,
      { input: 'help\n' }
    );

    const outputEvent = await outputPromise;
    expect(outputEvent.data).toContain('help');

    // Phase 4: Terminate process
    const terminateResponse = await testEnvironment.apiClient.delete(
      `/api/v2/claude/instances/${instanceId}`
    );

    expect(terminateResponse.status).toBe(200);
    expect(terminateResponse.data.data.terminatedAt).toBeDefined();

    // Verify process no longer exists
    await waitForCondition(() => processExists(pid).then(exists => !exists), 5000);

    sseClient.close();
  });

  test('concurrent process management', async () => {
    const instanceConfigs = [
      { command: ['claude', '--version'], metadata: { type: 'concurrent-1' } },
      { command: ['claude', '--help'], metadata: { type: 'concurrent-2' } },
      { command: ['claude', '--dangerously-skip-permissions', '--version'], metadata: { type: 'concurrent-3' } }
    ];

    // Create processes concurrently
    const createPromises = instanceConfigs.map(config =>
      testEnvironment.apiClient.post('/api/v2/claude/instances', config)
    );

    const createResponses = await Promise.all(createPromises);
    const instanceIds = createResponses.map(response => response.data.data.instanceId);
    const pids = createResponses.map(response => response.data.data.pid);

    // Verify all processes exist
    for (const pid of pids) {
      expect(await processExists(pid)).toBe(true);
    }

    // Wait for all to reach running state
    await Promise.all(instanceIds.map(id => 
      waitForInstanceStatus(id, ProcessStatus.RUNNING, 5000)
    ));

    // Interact with all processes concurrently
    const inputPromises = instanceIds.map((id, index) =>
      testEnvironment.apiClient.post(
        `/api/v2/claude/instances/${id}/terminal/input`,
        { input: `echo "instance-${index}"\n` }
      )
    );

    await Promise.all(inputPromises);

    // Terminate all processes
    const terminatePromises = instanceIds.map(id =>
      testEnvironment.apiClient.delete(`/api/v2/claude/instances/${id}`)
    );

    await Promise.all(terminatePromises);

    // Verify all processes are cleaned up
    for (const pid of pids) {
      await waitForCondition(() => processExists(pid).then(exists => !exists), 5000);
    }
  });

  test('resource limit enforcement', async () => {
    // Create process with memory limit
    const createResponse = await testEnvironment.apiClient.post('/api/v2/claude/instances', {
      command: ['claude'],
      resourceLimits: {
        memory: { max: 100 * 1024 * 1024 } // 100MB limit
      },
      metadata: { type: 'resource-test' }
    });

    const instanceId = createResponse.data.data.instanceId;

    // Monitor resource usage
    const resourceMonitor = new ResourceUsageMonitor(instanceId);
    await resourceMonitor.start();

    // Wait for some activity
    await new Promise(resolve => setTimeout(resolve, 2000));

    const usage = await resourceMonitor.getCurrentUsage();
    expect(usage.memory.rss).toBeLessThan(100 * 1024 * 1024);

    await resourceMonitor.stop();

    // Cleanup
    await testEnvironment.apiClient.delete(`/api/v2/claude/instances/${instanceId}`);
  });
});

describe('SSE Stream Integration', () => {
  test('real-time output streaming', async () => {
    // Create instance
    const createResponse = await testEnvironment.apiClient.post('/api/v2/claude/instances', {
      command: ['claude'],
      metadata: { type: 'sse-test' }
    });

    const instanceId = createResponse.data.data.instanceId;

    // Connect SSE stream
    const sseClient = testEnvironment.createSSEClient(instanceId);
    const events: SSEEvent[] = [];

    sseClient.onEvent((event) => {
      events.push(event);
    });

    await sseClient.connect();

    // Wait for initial connection
    await waitForCondition(() => events.length > 0, 2000);
    expect(events[0].type).toBe('terminal:connected');

    // Send input
    await testEnvironment.apiClient.post(
      `/api/v2/claude/instances/${instanceId}/terminal/input`,
      { input: 'echo "test output"\n' }
    );

    // Wait for echo and output
    await waitForCondition(() => events.length >= 3, 5000);

    const echoEvent = events.find(e => e.type === 'terminal:input_echo');
    const outputEvent = events.find(e => e.type === 'terminal:output');

    expect(echoEvent).toBeDefined();
    expect(echoEvent?.data).toContain('echo "test output"');
    expect(outputEvent).toBeDefined();
    expect(outputEvent?.data).toContain('test output');

    sseClient.close();
    await testEnvironment.apiClient.delete(`/api/v2/claude/instances/${instanceId}`);
  });
});
```

## 4. END-TO-END TESTING SPECIFICATION

### 4.1 Frontend Integration E2E Tests
```typescript
describe('Claude Instance Manager E2E', () => {
  test('complete user workflow: launch → interact → terminate', async () => {
    // Load the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');

    // Verify initial state
    await expect(page.locator('.claude-instance-manager')).toBeVisible();
    await expect(page.locator('.no-instances')).toBeVisible();

    // Launch Claude instance
    await page.click('button[data-testid="btn-prod-claude"]');
    
    // Wait for instance to appear
    await page.waitForSelector('.instance-item', { timeout: 10000 });
    
    // Verify instance is created
    const instanceItem = page.locator('.instance-item').first();
    await expect(instanceItem).toBeVisible();
    await expect(instanceItem.locator('.status-indicator')).toHaveClass(/status-running/);

    // Select instance
    await instanceItem.click();

    // Wait for terminal to be ready
    await page.waitForSelector('.output-area pre', { timeout: 5000 });
    
    // Send command
    await page.fill('.input-field', 'help');
    await page.press('.input-field', 'Enter');

    // Verify command echo and response
    const outputArea = page.locator('.output-area pre');
    await expect(outputArea).toContainText('help');
    await expect(outputArea).toContainText('Available commands', { timeout: 10000 });

    // Terminate instance
    await page.click('.btn-terminate');
    
    // Verify instance is removed
    await page.waitForSelector('.no-instances', { timeout: 5000 });
    await expect(page.locator('.instance-item')).toHaveCount(0);
  });

  test('multiple instance management', async () => {
    await page.goto('http://localhost:5173');

    // Launch multiple instances
    await page.click('button[data-testid="btn-prod-claude"]');
    await page.waitForTimeout(1000);
    await page.click('button[data-testid="btn-skip-permissions"]');
    await page.waitForTimeout(1000);
    await page.click('button[data-testid="btn-skip-permissions-c"]');

    // Wait for all instances
    await page.waitForSelector('.instance-item', { timeout: 10000 });
    await expect(page.locator('.instance-item')).toHaveCount(3);

    // Verify each instance has unique PID and ID
    const instances = await page.locator('.instance-item').all();
    const pids = new Set();
    const ids = new Set();

    for (const instance of instances) {
      const pidText = await instance.locator('.instance-pid').textContent();
      const idText = await instance.locator('.instance-id').textContent();
      
      const pid = pidText?.match(/PID: (\d+)/)?.[1];
      const id = idText?.match(/ID: (.{8})/)?.[1];

      expect(pid).toBeTruthy();
      expect(id).toBeTruthy();
      expect(pids.has(pid)).toBe(false);
      expect(ids.has(id)).toBe(false);
      
      pids.add(pid);
      ids.add(id);
    }

    // Test switching between instances
    await instances[0].click();
    await expect(instances[0]).toHaveClass(/selected/);
    
    await instances[1].click();
    await expect(instances[0]).not.toHaveClass(/selected/);
    await expect(instances[1]).toHaveClass(/selected/);

    // Cleanup
    for (const instance of instances) {
      await instance.locator('.btn-terminate').click();
      await page.waitForTimeout(500);
    }
  });

  test('error handling and recovery', async () => {
    await page.goto('http://localhost:5173');

    // Simulate network error during creation
    await page.route('/api/v2/claude/instances', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: 'Network error' }) });
      } else {
        route.continue();
      }
    });

    await page.click('button[data-testid="btn-prod-claude"]');
    
    // Verify error message
    await expect(page.locator('.error')).toContainText('Network error');

    // Remove route and retry
    await page.unroute('/api/v2/claude/instances');
    
    await page.click('button[data-testid="btn-prod-claude"]');
    await page.waitForSelector('.instance-item', { timeout: 10000 });
    
    // Verify recovery
    await expect(page.locator('.instance-item')).toHaveCount(1);
  });
});
```

## 5. PERFORMANCE TESTING SPECIFICATION

### 5.1 Load Testing
```typescript
describe('Performance Load Tests', () => {
  test('concurrent process spawning performance', async () => {
    const concurrentInstances = 10;
    const startTime = Date.now();

    // Spawn multiple processes concurrently
    const spawnPromises = Array.from({ length: concurrentInstances }, (_, i) =>
      testEnvironment.apiClient.post('/api/v2/claude/instances', {
        command: ['claude', '--version'],
        metadata: { type: `perf-test-${i}` }
      })
    );

    const responses = await Promise.all(spawnPromises);
    const spawnTime = Date.now() - startTime;

    // Verify all spawned successfully
    expect(responses).toHaveLength(concurrentInstances);
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.data.data.instanceId).toBeTruthy();
    });

    // Performance assertions
    expect(spawnTime).toBeLessThan(10000); // Should complete within 10 seconds
    const averageSpawnTime = spawnTime / concurrentInstances;
    expect(averageSpawnTime).toBeLessThan(2000); // Average < 2 seconds per process

    // Wait for all to be running
    const instanceIds = responses.map(r => r.data.data.instanceId);
    const runningStartTime = Date.now();

    await Promise.all(instanceIds.map(id => 
      waitForInstanceStatus(id, ProcessStatus.RUNNING, 15000)
    ));

    const totalReadyTime = Date.now() - runningStartTime;
    expect(totalReadyTime).toBeLessThan(15000);

    // Cleanup
    await Promise.all(instanceIds.map(id =>
      testEnvironment.apiClient.delete(`/api/v2/claude/instances/${id}`)
    ));
  });

  test('high-frequency input/output performance', async () => {
    // Create instance
    const createResponse = await testEnvironment.apiClient.post('/api/v2/claude/instances', {
      command: ['claude'],
      metadata: { type: 'io-perf-test' }
    });

    const instanceId = createResponse.data.data.instanceId;
    await waitForInstanceStatus(instanceId, ProcessStatus.RUNNING);

    // Set up SSE monitoring
    const sseClient = testEnvironment.createSSEClient(instanceId);
    const receivedEvents: SSEEvent[] = [];
    sseClient.onEvent(event => receivedEvents.push(event));
    await sseClient.connect();

    // Send high-frequency inputs
    const inputCount = 100;
    const inputs = Array.from({ length: inputCount }, (_, i) => `echo "test-${i}"`);
    
    const startTime = Date.now();
    
    // Send all inputs rapidly
    const inputPromises = inputs.map(input =>
      testEnvironment.apiClient.post(
        `/api/v2/claude/instances/${instanceId}/terminal/input`,
        { input: input + '\n' }
      )
    );

    await Promise.all(inputPromises);

    // Wait for all outputs
    await waitForCondition(() => {
      const outputEvents = receivedEvents.filter(e => e.type === 'terminal:output');
      return outputEvents.length >= inputCount;
    }, 30000);

    const totalTime = Date.now() - startTime;
    const throughput = inputCount / (totalTime / 1000); // inputs per second

    // Performance assertions
    expect(throughput).toBeGreaterThan(10); // > 10 inputs/second
    expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds

    // Verify output integrity
    const outputEvents = receivedEvents.filter(e => e.type === 'terminal:output');
    inputs.forEach((input, index) => {
      const expectedOutput = input.replace('echo "', '').replace('"', '');
      const hasMatchingOutput = outputEvents.some(event => 
        event.data?.includes(expectedOutput)
      );
      expect(hasMatchingOutput).toBe(true);
    });

    sseClient.close();
    await testEnvironment.apiClient.delete(`/api/v2/claude/instances/${instanceId}`);
  });

  test('memory usage stability under load', async () => {
    const memoryMonitor = new MemoryMonitor();
    const initialMemory = await memoryMonitor.getCurrentUsage();

    // Create and destroy instances repeatedly
    for (let cycle = 0; cycle < 20; cycle++) {
      // Create instance
      const createResponse = await testEnvironment.apiClient.post('/api/v2/claude/instances', {
        command: ['claude', '--version'],
        metadata: { type: `memory-test-${cycle}` }
      });

      const instanceId = createResponse.data.data.instanceId;
      await waitForInstanceStatus(instanceId, ProcessStatus.RUNNING);

      // Use instance briefly
      await testEnvironment.apiClient.post(
        `/api/v2/claude/instances/${instanceId}/terminal/input`,
        { input: 'help\n' }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Terminate instance
      await testEnvironment.apiClient.delete(`/api/v2/claude/instances/${instanceId}`);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check for memory leaks
    const finalMemory = await memoryMonitor.getCurrentUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const maxAcceptableIncrease = 100 * 1024 * 1024; // 100MB

    expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease);
  });
});
```

## 6. VALIDATION CRITERIA

### 6.1 Functional Validation Checklist
```yaml
Process Management:
  - ✅ Real Claude processes spawn with correct PIDs
  - ✅ Process arguments match button configurations
  - ✅ Working directories set correctly
  - ✅ Environment variables passed through
  - ✅ Process status tracking accurate
  - ✅ Graceful termination works
  - ✅ Force termination works when needed
  - ✅ Process cleanup removes all resources

Terminal I/O:
  - ✅ User input reaches process stdin
  - ✅ Process stdout streams to frontend
  - ✅ Process stderr streams to frontend
  - ✅ Input echo displayed correctly
  - ✅ ANSI escape sequences preserved
  - ✅ SSE events delivered in order
  - ✅ Connection drops handled gracefully

Resource Management:
  - ✅ Memory limits enforced
  - ✅ CPU limits enforced
  - ✅ File descriptor limits enforced
  - ✅ Process quotas respected
  - ✅ Resource usage monitored
  - ✅ Resource cleanup on termination

Error Handling:
  - ✅ Spawn failures handled gracefully
  - ✅ Process crashes detected and reported
  - ✅ Stream errors recovered when possible
  - ✅ Resource exhaustion prevented
  - ✅ User-friendly error messages
  - ✅ System remains stable after errors
```

### 6.2 Performance Validation Criteria
```yaml
Response Times:
  - Process spawn: < 2 seconds (95th percentile)
  - Terminal input latency: < 100ms (95th percentile)
  - SSE event delivery: < 50ms (95th percentile)
  - Process termination: < 5 seconds (graceful)

Throughput:
  - Concurrent processes: 10+ instances
  - Input rate: 100+ commands/second
  - Output rate: 1000+ events/second
  - SSE connections: 50+ concurrent

Resource Usage:
  - Memory per process: < 1GB baseline
  - CPU per process: < 80% sustained
  - File descriptors: < 1000 per process
  - Memory leaks: < 10MB growth over 1 hour

Reliability:
  - Process success rate: > 99.9%
  - SSE connection stability: > 99.5%
  - Resource cleanup: 100%
  - Error recovery: > 95%
```

### 6.3 Security Validation
```yaml
Process Isolation:
  - ✅ Processes cannot access each other's data
  - ✅ Working directory restrictions enforced
  - ✅ Environment variable isolation
  - ✅ File system access controls

Input Validation:
  - ✅ Terminal input sanitized
  - ✅ Command injection prevented
  - ✅ Path traversal blocked
  - ✅ Resource limits cannot be bypassed

Network Security:
  - ✅ SSE connections authenticated (if required)
  - ✅ Rate limiting enforced
  - ✅ CORS policies configured correctly
  - ✅ No sensitive data in logs
```

This comprehensive testing strategy ensures robust validation of the real Claude process execution system with proper coverage across all system layers and components.