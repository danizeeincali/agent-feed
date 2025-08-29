# SPARC Phase R: Comprehensive Regression Testing Refinement

## TDD Implementation Strategy

### 1. CRITICAL COMPONENT TEST SUITE IMPLEMENTATION

#### 1.1 DirectoryResolver Test Implementation

```typescript
// tests/unit/core/DirectoryResolver.test.ts
import { DirectoryResolver } from '../../../simple-backend';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('DirectoryResolver - Regression Test Suite', () => {
  let resolver: DirectoryResolver;
  
  beforeEach(() => {
    resolver = new DirectoryResolver();
    jest.clearAllMocks();
    // Clear validation cache
    (resolver as any).validationCache.clear();
  });

  describe('CRITICAL: Working Directory Resolution', () => {
    const testCases = [
      { instanceType: 'prod', expected: '/workspaces/agent-feed/prod' },
      { instanceType: 'skip-permissions', expected: '/workspaces/agent-feed' },
      { instanceType: 'skip-permissions-c', expected: '/workspaces/agent-feed' },
      { instanceType: 'skip-permissions-resume', expected: '/workspaces/agent-feed' }
    ];

    test.each(testCases)(
      'should resolve $instanceType to $expected', 
      async ({ instanceType, expected }) => {
        // Mock directory exists and is writable
        mockFs.promises.stat = jest.fn().mockResolvedValue({ isDirectory: () => true });
        mockFs.promises.access = jest.fn().mockResolvedValue(undefined);
        mockPath.join = jest.fn().mockReturnValue(expected);
        mockPath.resolve = jest.fn().mockReturnValue(expected);
        
        const result = await resolver.resolveWorkingDirectory(instanceType);
        
        expect(result).toBe(expected);
        expect(mockFs.promises.stat).toHaveBeenCalledWith(expected);
        expect(mockFs.promises.access).toHaveBeenCalledWith(
          expected, 
          fs.constants.R_OK | fs.constants.W_OK
        );
      }
    );

    test('should fallback to base directory on permission error', async () => {
      const baseDir = '/workspaces/agent-feed';
      
      // Mock permission error
      mockFs.promises.access = jest.fn().mockRejectedValue(new Error('EACCES: permission denied'));
      mockPath.join = jest.fn().mockReturnValue('/workspaces/agent-feed/prod');
      mockPath.resolve = jest.fn().mockReturnValue('/workspaces/agent-feed/prod');
      
      const result = await resolver.resolveWorkingDirectory('prod');
      
      expect(result).toBe(baseDir);
    });

    test('should validate security boundaries', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '/root/malicious',
        '../../outside-base'
      ];
      
      maliciousInputs.forEach(input => {
        mockPath.resolve = jest.fn()
          .mockReturnValueOnce('/etc/passwd') // Malicious path
          .mockReturnValueOnce('/workspaces/agent-feed'); // Base path
        
        const result = resolver.isWithinBaseDirectory(input);
        expect(result).toBe(false);
      });
    });
  });

  describe('CRITICAL: Caching Mechanism', () => {
    test('should cache validation results', async () => {
      mockFs.promises.stat = jest.fn().mockResolvedValue({ isDirectory: () => true });
      mockFs.promises.access = jest.fn().mockResolvedValue(undefined);
      
      const dirPath = '/workspaces/agent-feed/prod';
      
      // First call
      await resolver.validateDirectory(dirPath);
      // Second call should use cache
      await resolver.validateDirectory(dirPath);
      
      expect(mockFs.promises.stat).toHaveBeenCalledTimes(1);
      expect(mockFs.promises.access).toHaveBeenCalledTimes(1);
    });

    test('should respect cache timeout', async () => {
      mockFs.promises.stat = jest.fn().mockResolvedValue({ isDirectory: () => true });
      mockFs.promises.access = jest.fn().mockResolvedValue(undefined);
      
      const dirPath = '/workspaces/agent-feed/prod';
      
      // Mock time progression beyond cache timeout
      const originalNow = Date.now;
      Date.now = jest.fn()
        .mockReturnValueOnce(0)      // First call
        .mockReturnValueOnce(70000); // 70 seconds later (beyond 60s cache)
      
      await resolver.validateDirectory(dirPath);
      await resolver.validateDirectory(dirPath);
      
      expect(mockFs.promises.stat).toHaveBeenCalledTimes(2);
      
      Date.now = originalNow;
    });
  });
});
```

#### 1.2 Authentication Detection Test Implementation

```typescript
// tests/unit/core/AuthenticationDetection.test.ts
import { checkClaudeAuthentication } from '../../../simple-backend';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('child_process');
jest.mock('fs');
jest.mock('path');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('Authentication Detection - Regression Test Suite', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('CRITICAL: Claude Code Environment Detection', () => {
    test('should detect CLAUDECODE environment variable', async () => {
      process.env.CLAUDECODE = '1';
      
      const result = await checkClaudeAuthentication();
      
      expect(result).toEqual({
        authenticated: true,
        source: 'claude_code_env'
      });
    });

    test('should not authenticate without CLAUDECODE', async () => {
      delete process.env.CLAUDECODE;
      mockFs.existsSync = jest.fn().mockReturnValue(false);
      mockExecSync.mockImplementation(() => { throw new Error('Command failed'); });
      
      const result = await checkClaudeAuthentication();
      
      expect(result).toEqual({
        authenticated: false,
        reason: 'Claude CLI not available'
      });
    });
  });

  describe('CRITICAL: Credentials File Detection', () => {
    test('should detect credentials file', async () => {
      delete process.env.CLAUDECODE;
      
      const credentialsPath = '/home/codespace/.claude/.credentials.json';
      mockPath.join = jest.fn().mockReturnValue(credentialsPath);
      mockFs.existsSync = jest.fn().mockReturnValue(true);
      
      const result = await checkClaudeAuthentication();
      
      expect(result).toEqual({
        authenticated: true,
        source: 'credentials_file'
      });
      expect(mockFs.existsSync).toHaveBeenCalledWith(credentialsPath);
    });
  });

  describe('CRITICAL: CLI Availability Fallback', () => {
    test('should fallback to CLI availability check', async () => {
      delete process.env.CLAUDECODE;
      mockFs.existsSync = jest.fn().mockReturnValue(false);
      mockExecSync.mockReturnValue(Buffer.from('Claude CLI help'));
      
      const result = await checkClaudeAuthentication();
      
      expect(result).toEqual({
        authenticated: true,
        source: 'cli_available'
      });
      expect(mockExecSync).toHaveBeenCalledWith('claude --help', { timeout: 3000 });
    });

    test('should handle CLI timeout', async () => {
      delete process.env.CLAUDECODE;
      mockFs.existsSync = jest.fn().mockReturnValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command timeout');
      });
      
      const result = await checkClaudeAuthentication();
      
      expect(result).toEqual({
        authenticated: false,
        reason: 'Claude CLI not available'
      });
    });
  });

  describe('REGRESSION: No Authentication Bypass', () => {
    test('should never return authenticated without valid source', async () => {
      delete process.env.CLAUDECODE;
      mockFs.existsSync = jest.fn().mockReturnValue(false);
      mockExecSync.mockImplementation(() => { throw new Error('All methods failed'); });
      
      const result = await checkClaudeAuthentication();
      
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
```

#### 1.3 Process Lifecycle Management Test Implementation

```typescript
// tests/unit/core/ProcessLifecycleManager.test.ts
import { createRealClaudeInstanceWithPTY, activeProcesses } from '../../../simple-backend';
import * as pty from 'node-pty';
import { spawn } from 'child_process';

jest.mock('node-pty');
jest.mock('child_process');

const mockPty = pty as jest.Mocked<typeof pty>;
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('Process Lifecycle Manager - Regression Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeProcesses.clear();
  });

  describe('CRITICAL: PTY Process Creation', () => {
    test('should create PTY process successfully', async () => {
      const mockProcess = {
        pid: 1234,
        killed: false,
        onData: jest.fn(),
        onExit: jest.fn(),
        write: jest.fn()
      };
      
      mockPty.spawn = jest.fn().mockReturnValue(mockProcess);
      
      const result = await createRealClaudeInstanceWithPTY(
        'skip-permissions', 
        'claude-test-1001', 
        true
      );
      
      expect(result).toMatchObject({
        pid: 1234,
        status: 'starting',
        processType: 'pty',
        usePty: true,
        instanceType: 'skip-permissions'
      });
      
      expect(mockPty.spawn).toHaveBeenCalledWith(
        'claude',
        ['--dangerously-skip-permissions'],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed',
          env: expect.objectContaining({
            TERM: 'xterm-256color',
            FORCE_COLOR: '1'
          }),
          cols: 100,
          rows: 30
        })
      );
    });

    test('should fallback to pipes on PTY failure', async () => {
      mockPty.spawn = jest.fn().mockImplementation(() => {
        throw new Error('PTY creation failed');
      });
      
      const mockChildProcess = {
        pid: 5678,
        killed: false,
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn()
      };
      
      mockSpawn.mockReturnValue(mockChildProcess as any);
      
      const result = await createRealClaudeInstanceWithPTY(
        'skip-permissions',
        'claude-test-1002',
        true
      );
      
      expect(result.processType).toBe('pipe');
      expect(result.usePty).toBe(false);
      expect(mockSpawn).toHaveBeenCalled();
    });
  });

  describe('CRITICAL: Process Status Management', () => {
    test('should track process status correctly', async () => {
      const mockProcess = {
        pid: 1234,
        killed: false,
        onData: jest.fn(),
        onExit: jest.fn(),
        write: jest.fn()
      };
      
      mockPty.spawn = jest.fn().mockReturnValue(mockProcess);
      
      const instanceId = 'claude-test-status';
      await createRealClaudeInstanceWithPTY('skip-permissions', instanceId, true);
      
      const processInfo = activeProcesses.get(instanceId);
      expect(processInfo).toBeDefined();
      expect(processInfo!.status).toBe('starting');
      expect(processInfo!.pid).toBe(1234);
    });

    test('should handle process termination', async () => {
      const mockProcess = {
        pid: 1234,
        killed: false,
        onData: jest.fn(),
        onExit: jest.fn(),
        write: jest.fn(),
        kill: jest.fn()
      };
      
      mockPty.spawn = jest.fn().mockReturnValue(mockProcess);
      
      const instanceId = 'claude-test-terminate';
      await createRealClaudeInstanceWithPTY('skip-permissions', instanceId, true);
      
      // Simulate process exit
      const exitHandler = mockProcess.onExit.mock.calls[0][0];
      exitHandler({ exitCode: 0, signal: null });
      
      expect(activeProcesses.has(instanceId)).toBe(false);
    });
  });

  describe('REGRESSION: No Mock Processes', () => {
    test('should never create mock processes in production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockPty.spawn = jest.fn().mockImplementation(() => {
        throw new Error('PTY failed');
      });
      
      mockSpawn.mockImplementation(() => {
        throw new Error('Process spawn failed');
      });
      
      await expect(
        createRealClaudeInstanceWithPTY('skip-permissions', 'test-no-mock', true)
      ).rejects.toThrow();
      
      expect(activeProcesses.has('test-no-mock')).toBe(false);
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
```

### 2. INTEGRATION TEST IMPLEMENTATION

#### 2.1 Complete Instance Creation Flow Test

```typescript
// tests/integration/flows/InstanceCreationFlow.test.ts
import request from 'supertest';
import { app, activeProcesses, instances } from '../../../simple-backend';
import { TestDatabaseManager } from '../helpers/TestDatabase';
import { ProcessValidator } from '../helpers/ProcessValidator';

const testDb = new TestDatabaseManager();
const processValidator = new ProcessValidator();

describe('Instance Creation Flow - Integration Test Suite', () => {
  beforeAll(async () => {
    await testDb.setup();
  });
  
  afterAll(async () => {
    await testDb.cleanup();
  });
  
  beforeEach(async () => {
    await testDb.reset();
    activeProcesses.clear();
    instances.clear();
  });
  
  afterEach(async () => {
    // Cleanup any created processes
    for (const [instanceId, processInfo] of activeProcesses) {
      if (processInfo.process && !processInfo.process.killed) {
        processInfo.process.kill('SIGTERM');
      }
    }
    activeProcesses.clear();
    instances.clear();
  });

  describe('CRITICAL: All 4 Button Types', () => {
    const buttonConfigs = [
      {
        name: 'prod/claude',
        config: { command: ['claude'], instanceType: 'prod' },
        expectedDir: '/workspaces/agent-feed/prod'
      },
      {
        name: 'skip-permissions',
        config: { command: ['claude', '--dangerously-skip-permissions'], instanceType: 'skip-permissions' },
        expectedDir: '/workspaces/agent-feed'
      },
      {
        name: 'skip-permissions-c',
        config: { command: ['claude', '--dangerously-skip-permissions', '-c'], instanceType: 'skip-permissions-c' },
        expectedDir: '/workspaces/agent-feed'
      },
      {
        name: 'skip-permissions-resume',
        config: { command: ['claude', '--dangerously-skip-permissions', '--resume'], instanceType: 'skip-permissions-resume' },
        expectedDir: '/workspaces/agent-feed'
      }
    ];

    test.each(buttonConfigs)(
      'should create $name instance successfully',
      async ({ name, config, expectedDir }) => {
        // Step 1: Send creation request
        const response = await request(app)
          .post('/api/claude/instances')
          .send(config)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.instance.id).toMatch(/^claude-\d+$/);
        
        const instanceId = response.body.instance.id;
        
        // Step 2: Verify process spawning
        await processValidator.waitForProcessSpawn(instanceId, 5000);
        
        const processInfo = activeProcesses.get(instanceId);
        expect(processInfo).toBeDefined();
        expect(processInfo!.pid).toBeGreaterThan(0);
        expect(processInfo!.instanceType).toBe(config.instanceType);
        expect(processInfo!.workingDirectory).toBe(expectedDir);
        
        // Step 3: Verify instance tracking
        expect(instances.has(instanceId)).toBe(true);
        const instanceRecord = instances.get(instanceId);
        expect(instanceRecord!.status).toMatch(/starting|running/);
        
        // Step 4: Wait for running status
        await processValidator.waitForStatus(instanceId, 'running', 10000);
        
        const finalProcessInfo = activeProcesses.get(instanceId);
        expect(finalProcessInfo!.status).toBe('running');
      },
      30000 // 30 second timeout for each test
    );
  });

  describe('CRITICAL: Process I/O Validation', () => {
    test('should establish bidirectional I/O communication', async () => {
      // Create instance
      const response = await request(app)
        .post('/api/claude/instances')
        .send({ command: ['claude', '--dangerously-skip-permissions'], instanceType: 'skip-permissions' })
        .expect(201);
      
      const instanceId = response.body.instance.id;
      await processValidator.waitForStatus(instanceId, 'running', 10000);
      
      // Test input forwarding
      const inputResponse = await request(app)
        .post(`/api/claude/instances/${instanceId}/terminal/input`)
        .send({ input: 'echo "test communication"\n' })
        .expect(200);
      
      expect(inputResponse.body.success).toBe(true);
      
      // Verify output capture (integration with SSE would be tested in E2E)
      const processInfo = activeProcesses.get(instanceId);
      expect(processInfo!.process).toBeDefined();
    });
  });

  describe('REGRESSION: Error Handling', () => {
    test('should handle authentication failures gracefully', async () => {
      // Mock authentication failure
      const originalCheckAuth = require('../../../simple-backend').checkClaudeAuthentication;
      require('../../../simple-backend').checkClaudeAuthentication = jest.fn()
        .mockResolvedValue({ authenticated: false, reason: 'Mock auth failure' });
      
      const response = await request(app)
        .post('/api/claude/instances')
        .send({ command: ['claude'], instanceType: 'prod' })
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('auth');
      
      // Verify no orphaned processes
      expect(activeProcesses.size).toBe(0);
      expect(instances.size).toBe(0);
      
      // Restore original function
      require('../../../simple-backend').checkClaudeAuthentication = originalCheckAuth;
    });

    test('should cleanup on process spawn failure', async () => {
      // Mock process spawn failure
      const originalSpawn = require('child_process').spawn;
      require('child_process').spawn = jest.fn().mockImplementation(() => {
        throw new Error('Mock spawn failure');
      });
      
      const originalPtySpawn = require('node-pty').spawn;
      require('node-pty').spawn = jest.fn().mockImplementation(() => {
        throw new Error('Mock PTY spawn failure');
      });
      
      const response = await request(app)
        .post('/api/claude/instances')
        .send({ command: ['claude'], instanceType: 'prod' })
        .expect(500);
      
      expect(response.body.success).toBe(false);
      
      // Verify cleanup
      expect(activeProcesses.size).toBe(0);
      expect(instances.size).toBe(0);
      
      // Restore original functions
      require('child_process').spawn = originalSpawn;
      require('node-pty').spawn = originalPtySpawn;
    });
  });
});
```

### 3. E2E TEST IMPLEMENTATION

#### 3.1 Browser Automation Test Suite

```typescript
// tests/e2e/workflows/LaunchButtons.spec.ts
import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../helpers/PageObjects';

test.describe('Launch Buttons - E2E Regression Test Suite', () => {
  let page: ClaudeInstancePage;
  
  test.beforeEach(async ({ page: pwPage }) => {
    page = new ClaudeInstancePage(pwPage);
    await page.goto();
    await page.waitForPageLoad();
  });
  
  test.afterEach(async () => {
    // Cleanup any created instances
    await page.cleanupAllInstances();
  });

  const buttonTests = [
    {
      name: 'prod/claude button',
      selector: '.btn-prod',
      expectedType: 'prod',
      expectedText: 'prod/claude'
    },
    {
      name: 'skip-permissions button',
      selector: '.btn-skip-perms',
      expectedType: 'skip-permissions',
      expectedText: 'skip-permissions'
    },
    {
      name: 'skip-permissions -c button',
      selector: '.btn-skip-perms-c',
      expectedType: 'skip-permissions-c',
      expectedText: 'skip-permissions -c'
    },
    {
      name: 'skip-permissions --resume button',
      selector: '.btn-skip-perms-resume',
      expectedType: 'skip-permissions-resume',
      expectedText: 'skip-permissions --resume'
    }
  ];

  for (const buttonTest of buttonTests) {
    test(`should launch ${buttonTest.name} successfully`, async () => {
      // Step 1: Click launch button
      await page.clickLaunchButton(buttonTest.selector);
      
      // Step 2: Wait for instance to appear
      const instanceElement = await page.waitForInstanceCreation();
      expect(instanceElement).toBeTruthy();
      
      // Step 3: Verify instance status progression
      await page.waitForInstanceStatus('starting');
      await page.waitForInstanceStatus('running', 15000);
      
      // Step 4: Verify instance details
      const instanceDetails = await page.getInstanceDetails();
      expect(instanceDetails.name).toContain(buttonTest.expectedText);
      expect(instanceDetails.status).toBe('running');
      expect(instanceDetails.id).toMatch(/^claude-\d+$/);
      
      // Step 5: Select instance and verify terminal
      await page.selectInstance();
      await page.waitForTerminalConnection();
      
      // Step 6: Test terminal input/output
      await page.sendTerminalInput('echo "E2E test successful"');
      const output = await page.waitForTerminalOutput('E2E test successful', 10000);
      expect(output).toBeTruthy();
      
      // CRITICAL REGRESSION TEST: Verify NO mock responses
      const terminalContent = await page.getTerminalContent();
      expect(terminalContent).not.toContain('[MOCK]');
      expect(terminalContent).not.toContain('Simulated');
      expect(terminalContent).not.toContain('Mock Claude');
      
      // Step 7: Verify real Claude CLI interaction
      await page.sendTerminalInput('claude --help');
      const helpOutput = await page.waitForTerminalOutput('Usage:', 5000);
      expect(helpOutput).toBeTruthy();
    });
  }

  test('should support concurrent instances', async () => {
    // Launch multiple instances
    await page.clickLaunchButton('.btn-skip-perms');
    await page.waitForInstanceCreation();
    
    await page.clickLaunchButton('.btn-skip-perms-c');
    await page.waitForInstanceCreation();
    
    // Verify both instances are running
    const instances = await page.getAllInstances();
    expect(instances.length).toBe(2);
    
    for (const instance of instances) {
      expect(instance.status).toBe('running');
    }
    
    // Test interaction with each instance
    for (let i = 0; i < instances.length; i++) {
      await page.selectInstanceByIndex(i);
      await page.waitForTerminalConnection();
      
      await page.sendTerminalInput(`echo "Instance ${i + 1} test"`);
      const output = await page.waitForTerminalOutput(`Instance ${i + 1} test`, 5000);
      expect(output).toBeTruthy();
    }
  });

  test('should handle instance termination correctly', async () => {
    // Create instance
    await page.clickLaunchButton('.btn-skip-perms');
    const instanceElement = await page.waitForInstanceCreation();
    await page.waitForInstanceStatus('running');
    
    // Terminate instance
    await page.terminateInstance();
    
    // Verify instance is removed from UI
    await page.waitForInstanceRemoval();
    
    const instances = await page.getAllInstances();
    expect(instances.length).toBe(0);
  });

  test('should recover from connection errors', async () => {
    // Create instance
    await page.clickLaunchButton('.btn-skip-perms');
    await page.waitForInstanceCreation();
    await page.waitForInstanceStatus('running');
    await page.selectInstance();
    await page.waitForTerminalConnection();
    
    // Simulate connection interruption
    await page.simulateConnectionInterruption();
    
    // Verify automatic reconnection
    await page.waitForTerminalReconnection(10000);
    
    // Test terminal still works after reconnection
    await page.sendTerminalInput('echo "Reconnection test"');
    const output = await page.waitForTerminalOutput('Reconnection test', 5000);
    expect(output).toBeTruthy();
  });
});
```

### 4. PERFORMANCE TEST IMPLEMENTATION

#### 4.1 Load Testing and Benchmarks

```typescript
// tests/performance/LoadTesting.test.ts
import { PerformanceTestSuite } from '../helpers/PerformanceTestSuite';
import { BenchmarkRunner } from '../helpers/BenchmarkRunner';
import request from 'supertest';
import { app } from '../../../simple-backend';

const performanceSuite = new PerformanceTestSuite();
const benchmarkRunner = new BenchmarkRunner();

describe('Performance Regression Test Suite', () => {
  beforeAll(async () => {
    await performanceSuite.setup();
  });
  
  afterAll(async () => {
    await performanceSuite.cleanup();
  });

  describe('CRITICAL: Instance Creation Performance', () => {
    test('should create instances within 3 second limit', async () => {
      const benchmark = await benchmarkRunner.run({
        name: 'Instance Creation',
        iterations: 10,
        maxDuration: 3000,
        testFunction: async () => {
          const response = await request(app)
            .post('/api/claude/instances')
            .send({ command: ['claude', '--dangerously-skip-permissions'], instanceType: 'skip-permissions' });
          
          expect(response.status).toBe(201);
          
          const instanceId = response.body.instance.id;
          
          // Wait for running status
          await performanceSuite.waitForStatus(instanceId, 'running', 10000);
          
          // Cleanup
          await request(app).delete(`/api/claude/instances/${instanceId}`);
          
          return { instanceId };
        }
      });
      
      expect(benchmark.averageDuration).toBeLessThan(3000);
      expect(benchmark.maxDuration).toBeLessThan(5000);
      expect(benchmark.successRate).toBe(100);
    });
  });

  describe('CRITICAL: Terminal Response Performance', () => {
    test('should respond to terminal input within 100ms', async () => {
      // Create instance first
      const createResponse = await request(app)
        .post('/api/claude/instances')
        .send({ command: ['claude', '--dangerously-skip-permissions'], instanceType: 'skip-permissions' });
      
      const instanceId = createResponse.body.instance.id;
      await performanceSuite.waitForStatus(instanceId, 'running', 10000);
      
      const benchmark = await benchmarkRunner.run({
        name: 'Terminal Response',
        iterations: 50,
        maxDuration: 100,
        warmupIterations: 5,
        testFunction: async () => {
          const startTime = Date.now();
          
          const response = await request(app)
            .post(`/api/claude/instances/${instanceId}/terminal/input`)
            .send({ input: 'echo "performance test"\n' });
          
          expect(response.status).toBe(200);
          
          return { responseTime: Date.now() - startTime };
        }
      });
      
      expect(benchmark.averageDuration).toBeLessThan(100);
      expect(benchmark.percentile95).toBeLessThan(200);
      
      // Cleanup
      await request(app).delete(`/api/claude/instances/${instanceId}`);
    });
  });

  describe('CRITICAL: Concurrent Load Testing', () => {
    test('should handle 5 concurrent instances without performance degradation', async () => {
      const concurrentInstances = 5;
      const instanceIds: string[] = [];
      
      const benchmark = await benchmarkRunner.run({
        name: 'Concurrent Instance Creation',
        iterations: 1,
        maxDuration: 30000, // 30 seconds for concurrent load
        testFunction: async () => {
          const startTime = Date.now();
          
          // Create instances concurrently
          const creationPromises = Array.from({ length: concurrentInstances }, async (_, index) => {
            const response = await request(app)
              .post('/api/claude/instances')
              .send({ 
                command: ['claude', '--dangerously-skip-permissions'], 
                instanceType: 'skip-permissions' 
              });
            
            expect(response.status).toBe(201);
            const instanceId = response.body.instance.id;
            instanceIds.push(instanceId);
            return instanceId;
          });
          
          const createdIds = await Promise.all(creationPromises);
          
          // Wait for all instances to be running
          const statusPromises = createdIds.map(id => 
            performanceSuite.waitForStatus(id, 'running', 15000)
          );
          
          await Promise.all(statusPromises);
          
          return { 
            duration: Date.now() - startTime,
            instanceCount: createdIds.length 
          };
        }
      });
      
      expect(benchmark.results[0].instanceCount).toBe(concurrentInstances);
      expect(benchmark.averageDuration).toBeLessThan(30000);
      
      // Test concurrent terminal operations
      const terminalBenchmark = await benchmarkRunner.run({
        name: 'Concurrent Terminal Operations',
        iterations: 1,
        testFunction: async () => {
          const startTime = Date.now();
          
          const terminalPromises = instanceIds.map(async (instanceId, index) => {
            const response = await request(app)
              .post(`/api/claude/instances/${instanceId}/terminal/input`)
              .send({ input: `echo "Concurrent test ${index}"\n` });
            
            expect(response.status).toBe(200);
            return response;
          });
          
          await Promise.all(terminalPromises);
          
          return { duration: Date.now() - startTime };
        }
      });
      
      expect(terminalBenchmark.averageDuration).toBeLessThan(5000);
      
      // Cleanup all instances
      const cleanupPromises = instanceIds.map(id => 
        request(app).delete(`/api/claude/instances/${id}`)
      );
      
      await Promise.all(cleanupPromises);
    });
  });

  describe('CRITICAL: Memory Leak Detection', () => {
    test('should not leak memory during instance lifecycle', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 20;
      
      for (let i = 0; i < iterations; i++) {
        // Create instance
        const createResponse = await request(app)
          .post('/api/claude/instances')
          .send({ command: ['claude', '--dangerously-skip-permissions'], instanceType: 'skip-permissions' });
        
        const instanceId = createResponse.body.instance.id;
        await performanceSuite.waitForStatus(instanceId, 'running', 10000);
        
        // Perform some operations
        await request(app)
          .post(`/api/claude/instances/${instanceId}/terminal/input`)
          .send({ input: 'echo "Memory test"\n' });
        
        // Terminate instance
        await request(app).delete(`/api/claude/instances/${instanceId}`);
        
        // Wait for cleanup
        await performanceSuite.waitForCleanup(instanceId, 5000);
      }
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be less than 50MB for 20 instance cycles
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });
});
```

### 5. TEST COVERAGE ANALYSIS

#### 5.1 Coverage Configuration

```typescript
// jest.config.coverage.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'tests/coverage',
  coverageReporters: ['html', 'lcov', 'text', 'json-summary'],
  collectCoverageFrom: [
    'simple-backend.js',
    'src/**/*.{js,ts}',
    'frontend/src/**/*.{js,ts,tsx}',
    '!**/*.test.{js,ts}',
    '!**/*.spec.{js,ts}',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Critical files require 95% coverage
    'simple-backend.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'frontend/src/components/ClaudeInstanceManager.tsx': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  // Custom coverage reporter for regression analysis
  reporters: [
    'default',
    ['./tests/reporters/RegressionCoverageReporter.js', {
      outputFile: 'tests/coverage/regression-analysis.json'
    }]
  ]
};
```

#### 5.2 Custom Regression Coverage Reporter

```typescript
// tests/reporters/RegressionCoverageReporter.js
class RegressionCoverageReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.coverageData = [];
  }
  
  onTestResult(test, testResult, aggregatedResult) {
    // Collect coverage data for regression analysis
    if (testResult.coverage) {
      this.coverageData.push({
        testPath: test.path,
        coverage: testResult.coverage,
        testResults: testResult.testResults.map(result => ({
          ancestorTitles: result.ancestorTitles,
          title: result.title,
          status: result.status,
          duration: result.duration
        }))
      });
    }
  }
  
  onRunComplete(contexts, results) {
    const regressionAnalysis = this.analyzeRegressionRisk(results);
    
    // Write detailed regression analysis
    const fs = require('fs');
    fs.writeFileSync(
      this.options.outputFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        totalTests: results.numTotalTests,
        passedTests: results.numPassedTests,
        failedTests: results.numFailedTests,
        coverage: results.coverageMap,
        regressionAnalysis,
        criticalPathsCovered: this.analyzeCriticalPathCoverage(results)
      }, null, 2)
    );
    
    // Alert on regression risk
    if (regressionAnalysis.riskLevel === 'HIGH') {
      console.error('🚨 HIGH REGRESSION RISK DETECTED');
      console.error(regressionAnalysis.reasons.join('\n'));
    }
  }
  
  analyzeRegressionRisk(results) {
    const risks = [];
    let riskLevel = 'LOW';
    
    // Check coverage thresholds
    if (results.coverageMap) {
      const coverageData = results.coverageMap.getCoverageSummary();
      if (coverageData.lines.pct < 90) {
        risks.push(`Line coverage below threshold: ${coverageData.lines.pct}%`);
        riskLevel = 'HIGH';
      }
    }
    
    // Check for failed critical tests
    if (results.numFailedTests > 0) {
      risks.push(`${results.numFailedTests} tests failed`);
      riskLevel = 'HIGH';
    }
    
    return {
      riskLevel,
      reasons: risks,
      recommendation: this.getRecommendation(riskLevel)
    };
  }
  
  getRecommendation(riskLevel) {
    switch (riskLevel) {
      case 'HIGH':
        return 'DO NOT DEPLOY - Fix failing tests and improve coverage';
      case 'MEDIUM':
        return 'Review test results carefully before deployment';
      default:
        return 'Safe to deploy';
    }
  }
}

module.exports = RegressionCoverageReporter;
```

---

**REFINEMENT COMPLETION STATUS:** ✅ APPROVED
**NEXT PHASE:** Completion Deployment (Phase C)
**REFINEMENT INSIGHT:** TDD implementation ensures comprehensive test coverage with zero regression tolerance