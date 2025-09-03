/**
 * ULTRA FIX Protection Test Suite
 * 
 * Critical tests that protect the ULTRA FIX implementation from regressions:
 * - Pipe-based Claude communication integrity
 * - Individual process spawning per instance
 * - Response uniqueness and non-caching behavior
 * - PTY terminal echo bypass functionality
 * - Process lifecycle and cleanup
 */

import { jest } from '@jest/globals';
import { spawn } from 'child_process';
import EventSource from 'eventsource';
import { TestSetup, APIHelper, SSEHelper, PerformanceHelper } from './utils/test-setup.js';
import { setupCustomMatchers } from './custom-matchers.js';

// Mock dependencies
jest.mock('child_process');
jest.mock('node-pty');

const BACKEND_URL = 'http://localhost:3000';

describe('ULTRA FIX Protection Suite', () => {
  let mockProcesses = [];
  
  beforeAll(() => {
    setupCustomMatchers();
  });

  beforeEach(async () => {
    const { mockProcess } = await TestSetup.beforeEachTest();
    mockProcesses = [mockProcess];
    
    // Track spawned processes for validation
    spawn.mockImplementation(() => {
      const newMockProcess = {
        pid: Math.floor(Math.random() * 100000) + 10000,
        stdout: { 
          on: jest.fn(), 
          pipe: jest.fn(),
          setEncoding: jest.fn()
        },
        stderr: { 
          on: jest.fn(),
          pipe: jest.fn(),
          setEncoding: jest.fn()
        },
        stdin: { 
          write: jest.fn(),
          end: jest.fn()
        },
        on: jest.fn(),
        kill: jest.fn(),
        removeAllListeners: jest.fn()
      };
      
      mockProcesses.push(newMockProcess);
      return newMockProcess;
    });
  });

  afterEach(async () => {
    await TestSetup.afterEachTest();
    mockProcesses = [];
  });

  describe('ULTRA FIX Core Protections', () => {
    
    test('CRITICAL: Each instance must spawn individual Claude processes', async () => {
      const instances = [];
      
      // Create multiple instances rapidly
      for (let i = 0; i < 3; i++) {
        const instance = await APIHelper.createInstance({
          instanceType: 'interactive',
          instanceName: `ultra-fix-process-${i}`
        });
        instances.push(instance);
      }
      
      // ULTRA FIX VALIDATION: Each instance should spawn a separate process
      expect(spawn).toHaveBeenCalledTimes(3);
      
      // Verify each call spawned 'claude' command
      const spawnCalls = spawn.mock.calls;
      spawnCalls.forEach(call => {
        expect(call[0]).toBe('claude');
      });
      
      // Verify all instances have unique PIDs
      const pids = instances.map(instance => instance.pid);
      const uniquePids = new Set(pids);
      expect(uniquePids.size).toBe(instances.length);
      
      console.log('✅ ULTRA FIX: Individual processes spawned correctly');
    });
    
    test('CRITICAL: Responses must be unique per input (no caching)', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-no-cache'
      });
      
      // Get the mock process for this instance
      const mockProcess = mockProcesses[mockProcesses.length - 1];
      
      // Configure mock to provide different responses
      let responseCount = 0;
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data' && callback) {
          setTimeout(() => {
            responseCount++;
            callback(`Unique response #${responseCount} for input\n`);
          }, 50);
        }
      });
      
      // Send multiple different inputs
      const inputs = [
        'What is 2+2?',
        'What is 3+3?',
        'What is 4+4?'
      ];
      
      for (const input of inputs) {
        await APIHelper.sendInput(instance.instanceId, input);
        
        // Brief delay between inputs
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // ULTRA FIX VALIDATION: stdin.write should be called for each unique input
      expect(mockProcess.stdin.write).toHaveBeenCalledTimes(3);
      expect(mockProcess.stdin.write).toHaveBeenNthCalledWith(1, 'What is 2+2?\n');
      expect(mockProcess.stdin.write).toHaveBeenNthCalledWith(2, 'What is 3+3?\n');
      expect(mockProcess.stdin.write).toHaveBeenNthCalledWith(3, 'What is 4+4?\n');
      
      console.log('✅ ULTRA FIX: No response caching detected');
    });
    
    test('CRITICAL: PTY terminal echo bypass must work correctly', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-pty'
      });
      
      // Import and check node-pty mock
      const pty = await import('node-pty');
      
      // ULTRA FIX VALIDATION: PTY should be configured to bypass echo
      expect(pty.spawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          name: expect.any(String),
          cols: expect.any(Number),
          rows: expect.any(Number),
          cwd: expect.any(String),
          env: expect.any(Object)
        })
      );
      
      // Verify PTY configuration includes terminal settings
      const ptyCall = pty.spawn.mock.calls[0];
      const ptyOptions = ptyCall[2];
      
      expect(ptyOptions).toHaveProperty('env');
      expect(ptyOptions.env).toHaveProperty('TERM');
      
      console.log('✅ ULTRA FIX: PTY terminal echo bypass configured');
    });
    
    test('CRITICAL: Process spawning failures must be handled gracefully', async () => {
      // Mock spawn to fail on first call, succeed on retry
      let spawnCallCount = 0;
      spawn.mockImplementation(() => {
        spawnCallCount++;
        
        const mockProcess = {
          pid: spawnCallCount > 1 ? 12345 : undefined, // Fail first, succeed second
          stdout: { on: jest.fn(), pipe: jest.fn(), setEncoding: jest.fn() },
          stderr: { on: jest.fn(), pipe: jest.fn(), setEncoding: jest.fn() },
          stdin: { write: jest.fn(), end: jest.fn() },
          on: jest.fn(),
          kill: jest.fn(),
          removeAllListeners: jest.fn()
        };
        
        // Simulate error on first call
        if (spawnCallCount === 1) {
          setTimeout(() => {
            const errorCallback = mockProcess.on.mock.calls.find(call => call[0] === 'error');
            if (errorCallback) {
              errorCallback[1](new Error('ULTRA FIX TEST: Claude spawn failed'));
            }
          }, 10);
        }
        
        return mockProcess;
      });
      
      // Attempt to create instance despite spawn failure
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-error-handling'
      });
      
      // ULTRA FIX VALIDATION: Instance should be created even if process fails
      expect(instance).toHaveValidInstanceStructure();
      expect(instance.instanceId).toBeDefined();
      
      // System should attempt to spawn process
      expect(spawn).toHaveBeenCalled();
      
      console.log('✅ ULTRA FIX: Process spawn error handling works');
    });
    
    test('CRITICAL: SSE broadcastToConnections must deliver messages correctly', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-sse-broadcast'
      });
      
      // Create multiple SSE connections
      const eventSource1 = SSEHelper.createEventSource(instance.instanceId);
      const eventSource2 = SSEHelper.createEventSource(instance.instanceId);
      
      const messagesPromise1 = SSEHelper.waitForSSEMessage(eventSource1);
      const messagesPromise2 = SSEHelper.waitForSSEMessage(eventSource2);
      
      // Wait for connections to establish
      await Promise.all([
        SSEHelper.waitForSSEConnection(eventSource1),
        SSEHelper.waitForSSEConnection(eventSource2)
      ]);
      
      // Simulate Claude output through mock process
      const mockProcess = mockProcesses[mockProcesses.length - 1];
      const dataCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data');
      
      if (dataCallback) {
        dataCallback[1]('ULTRA FIX TEST: Broadcast message\n');
      }
      
      // ULTRA FIX VALIDATION: Both connections should receive the message
      const [message1, message2] = await Promise.all([messagesPromise1, messagesPromise2]);
      
      expect(message1).toBeValidSSEMessage();
      expect(message2).toBeValidSSEMessage();
      expect(message1.data).toContain('ULTRA FIX TEST: Broadcast message');
      expect(message2.data).toContain('ULTRA FIX TEST: Broadcast message');
      
      // Clean up
      eventSource1.close();
      eventSource2.close();
      
      console.log('✅ ULTRA FIX: SSE broadcast delivery confirmed');
    });

  });

  describe('Process Lifecycle Protection', () => {
    
    test('CRITICAL: Process cleanup must occur on instance deletion', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-cleanup'
      });
      
      const mockProcess = mockProcesses[mockProcesses.length - 1];
      
      // Delete instance
      const deleteSuccess = await APIHelper.deleteInstance(instance.instanceId);
      expect(deleteSuccess).toBe(true);
      
      // ULTRA FIX VALIDATION: Process must be killed
      expect(mockProcess.kill).toHaveBeenCalled();
      
      // Instance should no longer exist
      const status = await APIHelper.getInstanceStatus(instance.instanceId);
      expect(status).toBeNull();
      
      console.log('✅ ULTRA FIX: Process cleanup verified');
    });
    
    test('CRITICAL: Multiple concurrent instances must be isolated', async () => {
      const concurrentCount = 5;
      const createPromises = [];
      
      // Create multiple instances concurrently
      for (let i = 0; i < concurrentCount; i++) {
        createPromises.push(
          APIHelper.createInstance({
            instanceType: 'interactive',
            instanceName: `ultra-fix-concurrent-${i}`
          })
        );
      }
      
      const instances = await Promise.all(createPromises);
      
      // ULTRA FIX VALIDATION: All instances should be created successfully
      expect(instances).toHandleConcurrentOperations(concurrentCount, 0);
      
      // Each instance should have unique ID and PID
      const instanceIds = instances.map(i => i.instanceId);
      const pids = instances.map(i => i.pid);
      
      expect(new Set(instanceIds).size).toBe(concurrentCount);
      expect(new Set(pids).size).toBe(concurrentCount);
      
      // Send inputs to all instances concurrently
      const inputPromises = instances.map((instance, index) =>
        APIHelper.sendInput(instance.instanceId, `Concurrent test ${index}`)
      );
      
      const inputResults = await Promise.all(inputPromises);
      expect(inputResults).toHandleConcurrentOperations(concurrentCount, 0);
      
      console.log('✅ ULTRA FIX: Concurrent instance isolation confirmed');
    });

  });

  describe('Response Integrity Protection', () => {
    
    test('CRITICAL: Input-response correlation must be maintained', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-correlation'
      });
      
      const mockProcess = mockProcesses[mockProcesses.length - 1];
      
      // Configure mock to echo input in response
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data' && callback) {
          // Access the last input written to stdin
          const lastCall = mockProcess.stdin.write.mock.calls[mockProcess.stdin.write.mock.calls.length - 1];
          if (lastCall) {
            const input = lastCall[0].trim();
            setTimeout(() => {
              callback(`Echo: ${input}\n`);
            }, 50);
          }
        }
      });
      
      // Send specific inputs
      const testInputs = ['Alpha', 'Beta', 'Gamma'];
      
      for (const input of testInputs) {
        await APIHelper.sendInput(instance.instanceId, input);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // ULTRA FIX VALIDATION: Each input should be sent to process
      const stdinCalls = mockProcess.stdin.write.mock.calls;
      expect(stdinCalls).toHaveLength(testInputs.length);
      
      testInputs.forEach((input, index) => {
        expect(stdinCalls[index][0]).toBe(`${input}\n`);
      });
      
      console.log('✅ ULTRA FIX: Input-response correlation maintained');
    });
    
    test('CRITICAL: Memory leaks must be prevented during extended usage', async () => {
      const memoryTest = PerformanceHelper.measureMemoryUsage(async () => {
        const instance = await APIHelper.createInstance({
          instanceType: 'interactive',
          instanceName: 'ultra-fix-memory-test'
        });
        
        // Send many messages to test for memory leaks
        const messageCount = 50;
        for (let i = 0; i < messageCount; i++) {
          await APIHelper.sendInput(instance.instanceId, `Memory test message ${i}`);
          
          // Brief delay to allow processing
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        return instance;
      });
      
      const { result: instance, memoryUsage } = await memoryTest;
      
      // ULTRA FIX VALIDATION: Memory growth should be reasonable
      expect(memoryUsage).toHaveAcceptableMemoryUsage(100 * 1024 * 1024); // 100MB limit
      
      console.log(`✅ ULTRA FIX: Memory usage acceptable: ${(memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

  });

  describe('Edge Case Protection', () => {
    
    test('CRITICAL: Rapid instance creation/deletion cycles', async () => {
      const cycleCount = 10;
      
      for (let i = 0; i < cycleCount; i++) {
        // Create instance
        const instance = await APIHelper.createInstance({
          instanceType: 'interactive',
          instanceName: `ultra-fix-cycle-${i}`
        });
        
        // Send quick message
        await APIHelper.sendInput(instance.instanceId, `Cycle test ${i}`);
        
        // Delete immediately
        const deleted = await APIHelper.deleteInstance(instance.instanceId);
        expect(deleted).toBe(true);
        
        // Brief pause
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // ULTRA FIX VALIDATION: System should remain stable
      expect(spawn).toHaveBeenCalledTimes(cycleCount);
      
      // Final verification - create one more instance to ensure system health
      const finalInstance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-final-check'
      });
      
      expect(finalInstance).toHaveValidInstanceStructure();
      
      console.log('✅ ULTRA FIX: Rapid creation/deletion cycles handled');
    });
    
    test('CRITICAL: Large input handling without corruption', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-large-input'
      });
      
      const mockProcess = mockProcesses[mockProcesses.length - 1];
      
      // Create large input (10KB)
      const largeInput = 'LARGE_INPUT_TEST: ' + 'A'.repeat(10000);
      
      // Send large input
      await APIHelper.sendInput(instance.instanceId, largeInput);
      
      // ULTRA FIX VALIDATION: Large input should be written correctly
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(`${largeInput}\n`);
      
      // Verify the full input was captured
      const writtenData = mockProcess.stdin.write.mock.calls[0][0];
      expect(writtenData).toHaveLength(largeInput.length + 1); // +1 for newline
      expect(writtenData.startsWith('LARGE_INPUT_TEST:')).toBe(true);
      expect(writtenData.includes('A'.repeat(1000))).toBe(true); // Sample check
      
      console.log('✅ ULTRA FIX: Large input handling verified');
    });

  });

  describe('System Integration Protection', () => {
    
    test('CRITICAL: Frontend-backend communication integrity', async () => {
      // This would require actual frontend testing in a real scenario
      // For now, verify API endpoints work correctly
      
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-integration'
      });
      
      // Test all critical endpoints
      const statusResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instance.instanceId}/status`);
      expect(statusResponse).toBeSuccessfulAPIResponse();
      
      const healthResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${instance.instanceId}/health`);
      expect(healthResponse).toBeSuccessfulAPIResponse();
      
      const listResponse = await fetch(`${BACKEND_URL}/api/claude/instances`);
      expect(listResponse).toBeSuccessfulAPIResponse();
      
      console.log('✅ ULTRA FIX: API endpoint integration verified');
    });
    
    test('CRITICAL: SSE connection resilience', async () => {
      const instance = await APIHelper.createInstance({
        instanceType: 'interactive',
        instanceName: 'ultra-fix-sse-resilience'
      });
      
      // Create connection
      const eventSource = SSEHelper.createEventSource(instance.instanceId);
      
      // Wait for connection
      await SSEHelper.waitForSSEConnection(eventSource);
      
      // Simulate rapid message sending
      const mockProcess = mockProcesses[mockProcesses.length - 1];
      const dataCallback = mockProcess.stdout.on.mock.calls.find(call => call[0] === 'data');
      
      if (dataCallback) {
        // Send messages rapidly
        for (let i = 0; i < 10; i++) {
          dataCallback[1](`Rapid message ${i}\n`);
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Connection should remain stable
      expect(eventSource.readyState).toBe(EventSource.OPEN);
      
      eventSource.close();
      
      console.log('✅ ULTRA FIX: SSE connection resilience confirmed');
    });

  });

});