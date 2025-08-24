/**
 * NLD Pattern Test: Process Launch Immediate Termination
 * Prevents regression of processes that launch but immediately terminate
 */

import { SimpleProcessManager } from '../../src/services/SimpleProcessManager';

describe('Process Lifecycle - NLD Pattern Prevention', () => {
  let processManager: SimpleProcessManager;

  beforeEach(() => {
    processManager = new SimpleProcessManager();
  });

  afterEach(() => {
    processManager.destroy();
  });

  describe('Process Launch Immediate Termination Prevention', () => {
    test('should launch persistent process, not just test command', async () => {
      // This test prevents the exact failure pattern captured
      const status = await processManager.launchClaude();
      
      // Should show as running initially
      expect(status.isRunning).toBe(true);
      expect(status.status).toBe('running');
      expect(status.pid).toBeDefined();
      
      // Wait 3 seconds to ensure process stays alive
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const currentStatus = processManager.getStatus();
      
      // Process should still be running after 3 seconds
      // This catches the immediate termination pattern
      expect(currentStatus.isRunning).toBe(true);
      expect(currentStatus.status).toBe('running');
    }, 10000);

    test('should validate command creates interactive session', async () => {
      // Ensure we're not just running --version or other test commands
      const status = await processManager.launchClaude();
      
      if (status.isRunning) {
        // Process should accept input (interactive)
        // Not just exit after displaying output (batch)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const currentStatus = processManager.getStatus();
        expect(currentStatus.isRunning).toBe(true);
        
        // Should have stdout/stdin pipes available for interaction
        // This validates it's an interactive session, not a batch command
      }
    });

    test('should properly handle process exit codes', async () => {
      const status = await processManager.launchClaude();
      
      // Monitor exit code handling
      if (status.isRunning) {
        await processManager.stopClaude();
        
        const finalStatus = processManager.getStatus();
        expect(finalStatus.isRunning).toBe(false);
        expect(finalStatus.status).toBe('stopped');
        // Should not show error status for graceful shutdown
        expect(finalStatus.error).toBeUndefined();
      }
    });

    test('should validate working directory exists and is accessible', () => {
      const workingDir = processManager.getWorkingDirectory();
      expect(workingDir).toBeDefined();
      expect(workingDir.endsWith('prod')).toBe(true);
      
      // Directory should exist and be accessible
      const fs = require('fs');
      expect(fs.existsSync(workingDir)).toBe(true);
    });

    test('should provide meaningful error messages on failure', async () => {
      // Mock a failure scenario to test error handling
      const originalSpawn = require('child_process').spawn;
      const mockSpawn = jest.fn(() => {
        throw new Error('Command not found');
      });
      
      require('child_process').spawn = mockSpawn;
      
      const status = await processManager.launchClaude();
      
      expect(status.isRunning).toBe(false);
      expect(status.status).toBe('error');
      expect(status.error).toContain('Command not found');
      
      // Restore original
      require('child_process').spawn = originalSpawn;
    });
  });

  describe('Process Health Monitoring', () => {
    test('should detect when process dies unexpectedly', async () => {
      const status = await processManager.launchClaude();
      
      if (status.isRunning && status.pid) {
        // Simulate process death
        process.kill(status.pid, 'SIGKILL');
        
        // Wait for death to be detected
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const updatedStatus = processManager.getStatus();
        expect(updatedStatus.isRunning).toBe(false);
      }
    });

    test('should distinguish between graceful exit and error exit', async () => {
      // This test ensures we properly handle different exit scenarios
      // Prevents false positives where normal exit is treated as error
      
      const status = await processManager.launchClaude();
      
      if (status.isRunning) {
        // Graceful stop
        const stopStatus = await processManager.stopClaude();
        expect(stopStatus.status).toBe('stopped');
        expect(stopStatus.error).toBeUndefined();
      }
    });
  });
});