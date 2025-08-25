# SPARC REFINEMENT PHASE: TDD Implementation Strategy

## Test-Driven Development Approach

### Testing Pyramid for Dedicated Claude Architecture
```
                    ┌─────────────────┐
                    │   E2E Tests     │ ← Playwright Integration
                    │   (Playwright)  │   Full User Workflows
                    └─────────────────┘
                           │
                    ┌─────────────────┐
                    │ Integration     │ ← API + WebSocket + Process
                    │ Tests           │   Component Integration
                    └─────────────────┘
                           │
                    ┌─────────────────┐
                    │   Unit Tests    │ ← Individual Component Logic
                    │                 │   Pure Functions & Classes
                    └─────────────────┘
```

## 1. Unit Test Implementation

### Process Manager Tests
```typescript
// tests/unit/process-manager.test.ts
describe('ProcessManager', () => {
  let processManager: ProcessManager;
  
  beforeEach(() => {
    processManager = new ProcessManager();
  });

  describe('spawnProcess', () => {
    it('should spawn Claude process successfully', async () => {
      // ARRANGE
      const config = {
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      };
      
      // ACT
      const processId = await processManager.spawnProcess(config);
      
      // ASSERT
      expect(processId).toBeTruthy();
      expect(processManager.getProcessStatus(processId)).toMatchObject({
        status: 'starting',
        command: 'claude',
        workingDirectory: '/prod'
      });
    });

    it('should handle process spawn failure gracefully', async () => {
      // ARRANGE
      const invalidConfig = {
        command: 'nonexistent-command',
        workingDirectory: '/invalid',
        args: []
      };
      
      // ACT & ASSERT
      await expect(processManager.spawnProcess(invalidConfig))
        .rejects.toThrow('Process spawn failed');
    });

    it('should enforce maximum process limit', async () => {
      // ARRANGE
      const maxProcesses = 5;
      processManager.setMaxProcesses(maxProcesses);
      
      // Spawn max processes
      for (let i = 0; i < maxProcesses; i++) {
        await processManager.spawnProcess(validConfig);
      }
      
      // ACT & ASSERT
      await expect(processManager.spawnProcess(validConfig))
        .rejects.toThrow('Maximum process limit exceeded');
    });
  });

  describe('terminateProcess', () => {
    it('should terminate running process', async () => {
      // ARRANGE
      const processId = await processManager.spawnProcess(validConfig);
      await waitForProcessStart(processId);
      
      // ACT
      await processManager.terminateProcess(processId);
      
      // ASSERT
      const status = processManager.getProcessStatus(processId);
      expect(status.status).toBe('stopped');
    });

    it('should handle termination of non-existent process', async () => {
      // ARRANGE
      const nonExistentId = 'invalid-process-id';
      
      // ACT & ASSERT
      await expect(processManager.terminateProcess(nonExistentId))
        .rejects.toThrow('Process not found');
    });
  });
});
```

### Web API Tests
```typescript
// tests/unit/api-gateway.test.ts
describe('ApiGateway', () => {
  let app: Express;
  let processManager: jest.Mocked<ProcessManager>;
  
  beforeEach(() => {
    processManager = createMockProcessManager();
    app = createTestApp(processManager);
  });

  describe('POST /api/claude/launch', () => {
    it('should launch Claude process successfully', async () => {
      // ARRANGE
      processManager.spawnProcess.mockResolvedValue('process-123');
      const launchRequest = {
        command: 'claude',
        workingDirectory: '/prod'
      };
      
      // ACT
      const response = await request(app)
        .post('/api/claude/launch')
        .send(launchRequest);
      
      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        processId: 'process-123'
      });
      expect(processManager.spawnProcess).toHaveBeenCalledWith({
        command: 'claude',
        workingDirectory: '/prod',
        args: []
      });
    });

    it('should handle launch failure', async () => {
      // ARRANGE
      processManager.spawnProcess.mockRejectedValue(new Error('Spawn failed'));
      
      // ACT
      const response = await request(app)
        .post('/api/claude/launch')
        .send(validLaunchRequest);
      
      // ASSERT
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Spawn failed'
      });
    });

    it('should validate request payload', async () => {
      // ARRANGE
      const invalidRequest = {
        command: '', // Invalid empty command
        workingDirectory: '/prod'
      };
      
      // ACT
      const response = await request(app)
        .post('/api/claude/launch')
        .send(invalidRequest);
      
      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid command');
    });
  });
});
```

### WebSocket Server Tests
```typescript
// tests/unit/websocket-server.test.ts
describe('WebSocketServer', () => {
  let wsServer: WebSocketServer;
  let mockHttpServer: http.Server;
  
  beforeEach(() => {
    mockHttpServer = createMockHttpServer();
    wsServer = new WebSocketServer();
    wsServer.initialize(mockHttpServer);
  });

  describe('client connection', () => {
    it('should handle client connection', async () => {
      // ARRANGE
      const mockSocket = createMockWebSocket();
      
      // ACT
      wsServer.handleConnection(mockSocket);
      
      // ASSERT
      expect(wsServer.getConnectedClients()).toHaveLength(1);
    });

    it('should clean up on client disconnection', async () => {
      // ARRANGE
      const mockSocket = createMockWebSocket();
      wsServer.handleConnection(mockSocket);
      
      // ACT
      mockSocket.emit('close');
      
      // ASSERT
      expect(wsServer.getConnectedClients()).toHaveLength(0);
    });
  });

  describe('message handling', () => {
    it('should handle command messages', async () => {
      // ARRANGE
      const mockSocket = createMockWebSocket();
      const clientId = wsServer.handleConnection(mockSocket);
      const commandMessage = {
        type: 'command',
        processId: 'process-123',
        command: 'help'
      };
      
      // ACT
      wsServer.handleMessage(clientId, commandMessage);
      
      // ASSERT
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(
        'process-123',
        'help\n'
      );
    });

    it('should handle subscription messages', async () => {
      // ARRANGE
      const mockSocket = createMockWebSocket();
      const clientId = wsServer.handleConnection(mockSocket);
      
      // ACT
      wsServer.subscribeClient(clientId, 'process-123');
      
      // ASSERT
      expect(wsServer.getProcessSubscriptions('process-123'))
        .toContain(clientId);
    });
  });

  describe('broadcasting', () => {
    it('should broadcast to subscribed clients only', async () => {
      // ARRANGE
      const socket1 = createMockWebSocket();
      const socket2 = createMockWebSocket();
      const client1 = wsServer.handleConnection(socket1);
      const client2 = wsServer.handleConnection(socket2);
      
      wsServer.subscribeClient(client1, 'process-123');
      // client2 not subscribed
      
      const outputMessage = {
        type: 'output',
        processId: 'process-123',
        data: 'Hello World',
        timestamp: Date.now()
      };
      
      // ACT
      wsServer.broadcastToProcess('process-123', outputMessage);
      
      // ASSERT
      expect(socket1.send).toHaveBeenCalledWith(JSON.stringify(outputMessage));
      expect(socket2.send).not.toHaveBeenCalled();
    });
  });
});
```

## 2. Integration Test Implementation

### API Integration Tests
```typescript
// tests/integration/api-integration.test.ts
describe('API Integration', () => {
  let testServer: TestServer;
  let processManager: ProcessManager;
  
  beforeAll(async () => {
    testServer = await createTestServer();
    processManager = testServer.getProcessManager();
  });
  
  afterAll(async () => {
    await testServer.close();
  });

  describe('full process lifecycle', () => {
    it('should handle complete launch-execute-stop flow', async () => {
      // LAUNCH
      const launchResponse = await request(testServer.app)
        .post('/api/claude/launch')
        .send({
          command: 'echo "test"',
          workingDirectory: '/tmp'
        });
      
      expect(launchResponse.status).toBe(200);
      const { processId } = launchResponse.body;
      
      // VERIFY RUNNING
      await waitForProcessState(processId, 'running', 5000);
      
      const statusResponse = await request(testServer.app)
        .get(`/api/claude/status/${processId}`);
      
      expect(statusResponse.body.process.status).toBe('running');
      
      // STOP
      const stopResponse = await request(testServer.app)
        .post(`/api/claude/stop/${processId}`);
      
      expect(stopResponse.status).toBe(200);
      
      // VERIFY STOPPED
      await waitForProcessState(processId, 'stopped', 5000);
    });
  });
});
```

### WebSocket Integration Tests
```typescript
// tests/integration/websocket-integration.test.ts
describe('WebSocket Integration', () => {
  let testServer: TestServer;
  let wsClient: WebSocket;
  
  beforeEach(async () => {
    testServer = await createTestServer();
    wsClient = new WebSocket(`ws://localhost:${testServer.port}/ws`);
    await waitForWebSocketConnection(wsClient);
  });
  
  afterEach(async () => {
    wsClient.close();
    await testServer.close();
  });

  it('should stream process output in real-time', async () => {
    // ARRANGE
    const processId = await launchTestProcess('echo "Hello World"');
    const outputMessages: any[] = [];
    
    wsClient.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'output') {
        outputMessages.push(message);
      }
    });
    
    // ACT
    wsClient.send(JSON.stringify({
      type: 'subscribe',
      processId: processId
    }));
    
    // Wait for process completion
    await waitForProcessState(processId, 'stopped', 10000);
    
    // ASSERT
    expect(outputMessages).toHaveLength(1);
    expect(outputMessages[0].data).toContain('Hello World');
  });
});
```

## 3. End-to-End Playwright Tests

### UI Workflow Tests
```typescript
// tests/e2e/claude-interface.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Claude Interface', () => {
  test('should launch Claude process and interact', async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Verify Claude availability
    await expect(page.getByTestId('claude-availability')).toContainText('Available');
    
    // Launch Claude process
    await page.click('[data-testid="launch-claude-button"]');
    
    // Wait for process to start
    await expect(page.getByTestId('process-status')).toContainText('Running', {
      timeout: 10000
    });
    
    // Verify Claude UI appears
    await expect(page.getByTestId('claude-interface')).toBeVisible();
    
    // Send a command
    await page.fill('[data-testid="command-input"]', 'help');
    await page.click('[data-testid="send-command"]');
    
    // Verify response
    await expect(page.getByTestId('output-container')).toContainText('Available commands', {
      timeout: 5000
    });
    
    // Stop process
    await page.click('[data-testid="stop-process-button"]');
    
    // Verify process stopped
    await expect(page.getByTestId('process-status')).toContainText('Stopped', {
      timeout: 5000
    });
  });

  test('should handle 4-button launcher integration', async ({ page }) => {
    await page.goto('/');
    
    // Test each button variant
    const buttons = [
      { testId: 'launch-standard', expectedCommand: 'claude' },
      { testId: 'launch-skip-perms', expectedCommand: 'claude --dangerously-skip-permissions' },
      { testId: 'launch-skip-perms-c', expectedCommand: 'claude --dangerously-skip-permissions -c' },
      { testId: 'launch-skip-perms-resume', expectedCommand: 'claude --dangerously-skip-permissions --resume' }
    ];
    
    for (const button of buttons) {
      // Launch with specific button
      await page.click(`[data-testid="${button.testId}"]`);
      
      // Verify process started with correct command
      await expect(page.getByTestId('process-info')).toContainText(button.expectedCommand, {
        timeout: 5000
      });
      
      // Stop process for next test
      await page.click('[data-testid="stop-process-button"]');
      await page.waitForSelector('[data-testid="process-status"]:has-text("Stopped")');
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Mock API failure
    await page.route('/api/claude/launch', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({
          success: false,
          error: 'Process spawn failed'
        })
      });
    });
    
    // Attempt launch
    await page.click('[data-testid="launch-claude-button"]');
    
    // Verify error handling
    await expect(page.getByTestId('error-message')).toContainText('Process spawn failed');
    await expect(page.getByTestId('process-status')).toContainText('Stopped');
  });
});
```

### Terminal Separation Tests
```typescript
// tests/e2e/terminal-separation.spec.ts
test.describe('Terminal Separation', () => {
  test('should operate Claude UI independently of system terminal', async ({ page }) => {
    await page.goto('/');
    
    // Launch Claude process
    await page.click('[data-testid="launch-claude-button"]');
    await page.waitForSelector('[data-testid="claude-interface"]');
    
    // Verify no terminal width calculations are performed
    const terminalWidthCalls = await page.evaluate(() => {
      return window.performance.getEntriesByName('terminal-width-calculation').length;
    });
    expect(terminalWidthCalls).toBe(0);
    
    // Verify no cascade prevention mechanisms are active
    const cascadePreventionElements = await page.$$('[class*="cascade"]');
    expect(cascadePreventionElements).toHaveLength(0);
    
    // Verify system terminal is separate (if visible)
    const systemTerminal = page.getByTestId('system-terminal');
    const claudeInterface = page.getByTestId('claude-interface');
    
    if (await systemTerminal.isVisible()) {
      // System terminal should not affect Claude interface
      await systemTerminal.click();
      await expect(claudeInterface).toBeVisible();
      await expect(claudeInterface).not.toHaveClass(/terminal-dependent/);
    }
  });
});
```

## 4. Performance Tests

### Load Testing
```typescript
// tests/performance/load.test.ts
describe('Performance Tests', () => {
  test('should handle multiple concurrent processes', async () => {
    const concurrentProcesses = 10;
    const startTime = Date.now();
    
    // Launch multiple processes concurrently
    const launchPromises = Array(concurrentProcesses).fill(0).map(() =>
      request(testServer.app)
        .post('/api/claude/launch')
        .send(validLaunchRequest)
    );
    
    const responses = await Promise.all(launchPromises);
    const endTime = Date.now();
    
    // Verify all processes launched successfully
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    // Verify performance requirements
    const totalTime = endTime - startTime;
    expect(totalTime).toBeLessThan(5000); // Under 5 seconds for 10 processes
  });

  test('should maintain response times under load', async () => {
    // Launch baseline process
    const baselineStart = Date.now();
    await request(testServer.app)
      .post('/api/claude/launch')
      .send(validLaunchRequest);
    const baselineTime = Date.now() - baselineStart;
    
    // Launch multiple background processes
    const backgroundProcesses = Array(5).fill(0).map(() =>
      request(testServer.app)
        .post('/api/claude/launch')
        .send(validLaunchRequest)
    );
    await Promise.all(backgroundProcesses);
    
    // Test response time under load
    const loadStart = Date.now();
    await request(testServer.app)
      .post('/api/claude/launch')
      .send(validLaunchRequest);
    const loadTime = Date.now() - loadStart;
    
    // Response time should not degrade significantly
    expect(loadTime).toBeLessThan(baselineTime * 2);
  });
});
```

## 5. Regression Test Suite

### Terminal Dependency Prevention
```typescript
// tests/regression/terminal-dependency.test.ts
describe('Terminal Dependency Regression Tests', () => {
  test('should not import terminal width calculation modules', () => {
    // Static analysis to ensure no terminal dependencies
    const claudeInterfaceSource = fs.readFileSync(
      './src/components/ClaudeInterface.tsx',
      'utf-8'
    );
    
    const forbiddenImports = [
      'terminal-width-calculator',
      'terminalViewport',
      'cascade-prevention',
      'fitAddon'
    ];
    
    forbiddenImports.forEach(importName => {
      expect(claudeInterfaceSource).not.toContain(importName);
    });
  });

  test('should not reference terminal-related CSS classes', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="launch-claude-button"]');
    
    // Verify no terminal-related CSS classes are present
    const terminalClasses = await page.$$eval('*', elements =>
      elements.flatMap(el => Array.from(el.classList))
        .filter(className => className.includes('terminal') || 
                           className.includes('cascade') ||
                           className.includes('width-calc'))
    );
    
    expect(terminalClasses).toHaveLength(0);
  });
});
```

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

This comprehensive TDD approach ensures robust, reliable implementation with excellent test coverage and regression prevention.