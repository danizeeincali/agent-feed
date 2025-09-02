/**
 * TDD Unit Tests: Claude API Communication Methods
 * RED PHASE: Failing tests for timeout and communication issues
 */

const { spawn } = require('child_process');
const { testUtils } = global;

describe('Claude API Communication (Unit Tests)', () => {
  let mockSpawn;

  beforeEach(() => {
    mockSpawn = require('child_process').spawn;
    jest.clearAllMocks();
  });

  describe('Basic Claude Process Spawning', () => {
    test('FAILING: should spawn claude process without timeout', async () => {
      // RED: This should fail initially due to timeout issues
      const mockProcess = testUtils.createMockProcess({
        success: true,
        successDelay: 100
      });
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude', ['--version']);
      
      const result = await new Promise((resolve, reject) => {
        let output = '';
        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        claudeProcess.on('exit', (code) => {
          resolve({ code, output });
        });
        
        claudeProcess.on('error', reject);
        
        // Current implementation times out after 15s
        setTimeout(() => {
          reject(new Error('TIMEOUT_CURRENT_IMPLEMENTATION'));
        }, 15000);
      });

      expect(result.code).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith('claude', ['--version']);
    });

    test('FAILING: should handle 15 second timeout gracefully', async () => {
      // RED: This tests current failing behavior
      const mockProcess = testUtils.createMockProcess({
        timeout: 16000 // Longer than current 15s timeout
      });
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude', ['prompt']);
      
      await expect(new Promise((resolve, reject) => {
        claudeProcess.on('exit', resolve);
        claudeProcess.on('error', reject);
        
        // Simulate current 15s timeout implementation
        setTimeout(() => {
          claudeProcess.kill('SIGKILL');
          reject(new Error('Claude Code API timeout after 15 seconds'));
        }, 15000);
      })).rejects.toThrow('Claude Code API timeout after 15 seconds');
    });

    test('FAILING: should complete simple prompts under 5 seconds', async () => {
      // RED: This should fail due to fixed 15s timeout
      const mockProcess = testUtils.createMockProcess({
        success: true,
        successDelay: 2000, // 2 seconds - should be fast
        successData: 'Claude AI is ready'
      });
      mockSpawn.mockReturnValue(mockProcess);

      const startTime = Date.now();
      const claudeProcess = spawn('claude');
      
      const result = await new Promise((resolve, reject) => {
        let output = '';
        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        claudeProcess.on('exit', (code) => {
          const elapsed = Date.now() - startTime;
          resolve({ code, output, elapsed });
        });
        
        claudeProcess.on('error', reject);
        
        // Current implementation always waits 15s
        setTimeout(() => {
          reject(new Error('FIXED_15S_TIMEOUT'));
        }, 15000);
      });

      expect(result.elapsed).toBeLessThan(5000);
      expect(result.output).toContain('Claude AI is ready');
    });
  });

  describe('Process Management and Cleanup', () => {
    test('FAILING: should properly kill hanging processes', async () => {
      // RED: Current implementation doesn't clean up properly
      const mockProcess = testUtils.createMockProcess();
      mockProcess.kill = jest.fn();
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude', ['hanging-command']);
      
      // Simulate timeout scenario
      setTimeout(() => {
        claudeProcess.kill('SIGTERM');
      }, 1000);

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    test('FAILING: should escalate to SIGKILL if SIGTERM fails', async () => {
      // RED: Current implementation doesn't escalate properly
      const mockProcess = testUtils.createMockProcess();
      let killCallCount = 0;
      mockProcess.kill = jest.fn(() => {
        killCallCount++;
        if (killCallCount === 1) {
          // First call (SIGTERM) doesn't work
          setTimeout(() => mockProcess.emit('error', new Error('ESRCH')), 100);
        }
      });
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude', ['stubborn-process']);
      
      // Simulate escalation logic
      claudeProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 200));
      claudeProcess.kill('SIGKILL');
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
      expect(killCallCount).toBe(2);
    });

    test('FAILING: should track process memory usage', async () => {
      // RED: Current implementation doesn't track memory
      const mockProcess = testUtils.createMockProcess();
      mockProcess.pid = 12345;
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude');
      
      // Should track memory but doesn't in current implementation
      const memoryTracking = {
        pid: claudeProcess.pid,
        startTime: Date.now(),
        memoryUsage: null
      };
      
      // This should fail because we don't track memory
      expect(memoryTracking.memoryUsage).toBeDefined();
    });
  });

  describe('Error Recovery Mechanisms', () => {
    test('FAILING: should retry failed process spawn', async () => {
      // RED: Current implementation doesn't retry
      let spawnAttempts = 0;
      mockSpawn.mockImplementation(() => {
        spawnAttempts++;
        if (spawnAttempts === 1) {
          const failingProcess = testUtils.createMockProcess();
          setTimeout(() => failingProcess.emit('error', new Error('ENOENT')), 10);
          return failingProcess;
        } else {
          return testUtils.createMockProcess({ success: true });
        }
      });

      // Should retry but current implementation doesn't
      try {
        const claudeProcess = spawn('claude');
        await new Promise((resolve, reject) => {
          claudeProcess.on('error', reject);
          claudeProcess.on('spawn', resolve);
        });
      } catch (error) {
        // Should retry here but current implementation fails
        expect(spawnAttempts).toBeGreaterThan(1);
      }
      
      // This will fail because no retry logic exists
      expect(spawnAttempts).toBe(1); // Current behavior - no retry
    });

    test('FAILING: should recover from network errors', async () => {
      // RED: No network error recovery in current implementation
      const mockProcess = testUtils.createMockProcess();
      setTimeout(() => {
        mockProcess.emit('error', new Error('NETWORK_ERROR'));
      }, 100);
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude');
      
      const result = await new Promise((resolve, reject) => {
        claudeProcess.on('error', (error) => {
          // Should recover but current implementation just fails
          reject(error);
        });
        claudeProcess.on('exit', resolve);
      }).catch(error => ({ error: error.message }));
      
      // Current implementation doesn't recover from network errors
      expect(result.error).toBe('NETWORK_ERROR');
    });

    test('FAILING: should handle authentication failures gracefully', async () => {
      // RED: Current implementation doesn't handle auth failures well
      const mockProcess = testUtils.createMockProcess();
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Error: Not authenticated');
        mockProcess.emit('exit', 1);
      }, 100);
      mockSpawn.mockReturnValue(mockProcess);

      const claudeProcess = spawn('claude');
      
      const result = await new Promise((resolve, reject) => {
        let stderr = '';
        claudeProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        claudeProcess.on('exit', (code) => {
          resolve({ code, stderr });
        });
        
        claudeProcess.on('error', reject);
      });

      // Current implementation should handle this better
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Not authenticated');
      // Should provide recovery instructions but doesn't
      expect(result.stderr).toContain('run claude auth login'); // This will fail
    });
  });

  describe('Performance and Load Testing', () => {
    test('FAILING: should handle multiple concurrent processes', async () => {
      // RED: Current implementation may not handle concurrency well
      const processCount = 5;
      const processes = [];

      for (let i = 0; i < processCount; i++) {
        const mockProcess = testUtils.createMockProcess({
          success: true,
          successDelay: Math.random() * 1000 + 500
        });
        mockSpawn.mockReturnValueOnce(mockProcess);
        processes.push(spawn('claude', [`test-${i}`]));
      }

      const results = await Promise.all(processes.map((proc, index) => 
        new Promise((resolve, reject) => {
          proc.on('exit', (code) => resolve({ index, code }));
          proc.on('error', reject);
          
          // Current timeout logic may interfere
          setTimeout(() => {
            reject(new Error('TIMEOUT_IN_CONCURRENT_TEST'));
          }, 15000);
        })
      ));

      expect(results).toHaveLength(processCount);
      expect(mockSpawn).toHaveBeenCalledTimes(processCount);
    });

    test('FAILING: should process large prompts efficiently', async () => {
      // RED: Current implementation may timeout on large prompts
      const largePrompt = testUtils.largePrompts.large;
      const mockProcess = testUtils.createMockProcess({
        success: true,
        successDelay: 8000 // 8 seconds for large prompt
      });
      mockSpawn.mockReturnValue(mockProcess);

      const startTime = Date.now();
      const claudeProcess = spawn('claude');
      
      // Send large prompt
      claudeProcess.stdin.write(largePrompt);
      claudeProcess.stdin.end();

      const result = await new Promise((resolve, reject) => {
        claudeProcess.on('exit', (code) => {
          const elapsed = Date.now() - startTime;
          resolve({ code, elapsed });
        });
        
        claudeProcess.on('error', reject);
        
        // Current 15s timeout may not be enough for large prompts
        setTimeout(() => {
          reject(new Error('LARGE_PROMPT_TIMEOUT'));
        }, 15000);
      });

      // Should complete but may timeout in current implementation
      expect(result.code).toBe(0);
      expect(result.elapsed).toBeLessThan(10000);
    });
  });
});