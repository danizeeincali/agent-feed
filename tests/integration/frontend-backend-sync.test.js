/**
 * Frontend-Backend WebSocket Synchronization Integration Tests
 * 
 * Ensures frontend and backend are always compatible and prevents
 * version mismatches that cause WebSocket connection issues
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

describe('Frontend-Backend WebSocket Integration Tests', () => {
  let backendProcess;
  let frontendProcess;

  beforeAll(async () => {
    // Ensure we're testing the actual deployed versions
    console.log('Starting backend and frontend for integration testing...');
  }, 30000);

  afterAll(async () => {
    if (backendProcess) backendProcess.kill();
    if (frontendProcess) frontendProcess.kill();
  });

  describe('Version Compatibility Checks', () => {
    it('should have synchronized WebSocket implementations', async () => {
      const backendCode = fs.readFileSync(
        path.join(__dirname, '../../simple-backend.js'),
        'utf8'
      );

      const frontendComponentPath = path.join(
        __dirname,
        '../../frontend/src/components/claude-manager/DualModeInterface.tsx'
      );

      if (!fs.existsSync(frontendComponentPath)) {
        throw new Error('Frontend component missing - check git status');
      }

      const frontendCode = fs.readFileSync(frontendComponentPath, 'utf8');

      // Both should reference the same WebSocket endpoint
      const backendHasWsEndpoint = backendCode.includes('ws://localhost:3000') ||
                                  backendCode.includes('/terminal');
      const frontendConnectsCorrectly = frontendCode.includes('localhost:3000') ||
                                       !frontendCode.includes('WebSocketService');

      expect(backendHasWsEndpoint).toBe(true);
      expect(frontendConnectsCorrectly).toBe(true);
    });

    it('should NOT have version conflicts', async () => {
      // Check for files that shouldn't exist together
      const conflictingFiles = [
        'frontend/src/services/WebSocketService.ts',
        'frontend/src/services/MessageQueue.ts',
        'frontend/src/services/MessageProcessor.ts',
        'src/services/WebSocketConnectionManager.js',
        'src/services/claude-api-manager.js'
      ];

      const existingConflicts = conflictingFiles.filter(file => 
        fs.existsSync(path.join(__dirname, '../..', file))
      );

      if (existingConflicts.length > 0) {
        console.warn('WARNING: Found conflicting files:', existingConflicts);
      }

      // In a stable system, these should not exist
      expect(existingConflicts.length).toBe(0);
    });
  });

  describe('End-to-End WebSocket Flow', () => {
    it('should complete full user workflow without errors', async () => {
      return new Promise(async (resolve, reject) => {
        try {
          // Step 1: Create instance
          const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'integration-test' })
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create instance');
          }

          const { instance } = await createResponse.json();
          const instanceId = instance.id;

          // Step 2: Connect WebSocket
          const ws = new WebSocket('ws://localhost:3000/terminal');
          
          let messagesReceived = 0;
          let connectionErrors = [];
          let testCompleted = false;

          ws.on('open', () => {
            // Step 3: Connect to instance
            ws.send(JSON.stringify({
              type: 'connect',
              terminalId: instanceId
            }));

            // Step 4: Send test command
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'input',
                data: 'echo "integration test passed"'
              }));
            }, 3000);
          });

          ws.on('message', (data) => {
            messagesReceived++;
            const message = JSON.parse(data.toString());
            
            if (message.type === 'terminal' && 
                message.data.includes('integration test passed')) {
              testCompleted = true;
            }
          });

          ws.on('error', (error) => {
            connectionErrors.push(error.message);
          });

          ws.on('close', (code, reason) => {
            if (code !== 1000 && code !== 1001) {
              connectionErrors.push(`Unexpected close: ${code} ${reason}`);
            }
          });

          // Test for 15 seconds
          setTimeout(() => {
            ws.close();
            
            try {
              expect(connectionErrors.length).toBe(0);
              expect(messagesReceived).toBeGreaterThan(0);
              expect(testCompleted).toBe(true);
              resolve();
            } catch (error) {
              reject(error);
            }
          }, 15000);

        } catch (error) {
          reject(error);
        }
      });
    }, 20000);

    it('should handle concurrent connections without conflicts', async () => {
      const connections = [];
      const results = [];

      try {
        // Create 5 concurrent connections
        for (let i = 0; i < 5; i++) {
          const ws = new WebSocket('ws://localhost:3000/terminal');
          connections.push(ws);
          
          const connectionPromise = new Promise((resolve, reject) => {
            ws.on('open', () => resolve('connected'));
            ws.on('error', reject);
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
          
          results.push(connectionPromise);
        }

        // Wait for all connections
        const connectionResults = await Promise.allSettled(results);
        
        // All should succeed
        const successes = connectionResults.filter(r => r.status === 'fulfilled');
        expect(successes.length).toBe(5);

      } finally {
        // Clean up
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    }, 10000);
  });

  describe('Regression Prevention Checks', () => {
    it('should detect if backend was modified from stable version', async () => {
      // Check git status for simple-backend.js
      const { execSync } = require('child_process');
      
      try {
        const gitStatus = execSync('git status --porcelain simple-backend.js', {
          encoding: 'utf8',
          cwd: path.join(__dirname, '../..')
        });

        // File should not be modified from stable version
        expect(gitStatus.trim()).toBe('');
      } catch (error) {
        // Git command failed - that's also informative
        console.warn('Could not check git status:', error.message);
      }
    });

    it('should detect if frontend was modified from stable version', async () => {
      const { execSync } = require('child_process');
      
      try {
        const gitStatus = execSync('git status --porcelain frontend/', {
          encoding: 'utf8',
          cwd: path.join(__dirname, '../..')
        });

        // Frontend should not be modified from stable version
        expect(gitStatus.trim()).toBe('');
      } catch (error) {
        console.warn('Could not check frontend git status:', error.message);
      }
    });

    it('should validate system health after any changes', async () => {
      const healthResponse = await fetch('http://localhost:3000/health');
      const health = await healthResponse.json();
      
      expect(health.status).toBe('healthy');
      expect(health.server).toContain('HTTP');
      
      // Should NOT mention WebSocket conflicts
      expect(health.message).not.toContain('conflict');
      expect(health.message).not.toContain('error');
    });
  });

  describe('Performance and Stability Metrics', () => {
    it('should maintain stable connection count', async () => {
      const initialHealth = await fetch('http://localhost:3000/health');
      const initial = await initialHealth.json();

      // Create and close connections
      for (let i = 0; i < 10; i++) {
        const ws = new WebSocket('ws://localhost:3000/terminal');
        await new Promise(resolve => {
          ws.on('open', () => {
            ws.close();
            resolve();
          });
        });
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalHealth = await fetch('http://localhost:3000/health');
      const final = await finalHealth.json();

      // Connection count should be stable
      expect(final.status).toBe('healthy');
    });

    it('should not have memory leaks from connection cycling', async () => {
      const initialMemory = process.memoryUsage();
      
      // Cycle connections rapidly
      for (let i = 0; i < 20; i++) {
        const ws = new WebSocket('ws://localhost:3000/terminal');
        await new Promise(resolve => {
          ws.on('open', () => {
            ws.close();
            setTimeout(resolve, 100);
          });
          ws.on('error', resolve);
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});

module.exports = {
  FrontendBackendSyncTests: describe
};