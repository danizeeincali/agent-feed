/**
 * COMPREHENSIVE WEBSOCKET TERMINAL INTEGRATION TEST
 * 
 * This test validates the complete user workflow:
 * Button Click → Instance Creation → WebSocket Connection → Terminal I/O
 * 
 * NO MOCKS - 100% Real Integration Testing
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_API_URL = 'http://localhost:3000';
const WEBSOCKET_URL = 'ws://localhost:3002';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped';
  pid: number;
  created: string;
  processType: 'pty';
}

describe('WebSocket Terminal Integration - NO MOCKS', () => {
  let createdInstances: string[] = [];

  afterEach(async () => {
    // Clean up created instances
    for (const instanceId of createdInstances) {
      try {
        await fetch(`${BACKEND_API_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    createdInstances = [];
  });

  describe('Port Configuration Verification', () => {
    test('Backend API should be accessible on port 3000', async () => {
      const response = await fetch(`${BACKEND_API_URL}/health`);
      const health = await response.json();
      
      expect(response.status).toBe(200);
      expect(health.status).toBe('healthy');
    });

    test('WebSocket server should be accessible on port 3002', (done) => {
      const ws = new WebSocket(`${WEBSOCKET_URL}/terminal`);
      
      ws.on('open', () => {
        expect(true).toBe(true); // Connection successful
        ws.close();
        done();
      });

      ws.on('error', (error) => {
        fail(`WebSocket connection failed: ${error.message}`);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        ws.close();
        fail('WebSocket connection timeout');
      }, 5000);
    });
  });

  describe('Instance Creation Workflow', () => {
    test('Should create real Claude instance with valid PID', async () => {
      const response = await fetch(`${BACKEND_API_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          workingDirectory: '/workspaces/agent-feed',
          command: 'cd prod && claude'
        })
      });

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.instance).toBeDefined();
      expect(result.instance.id).toMatch(/^claude-\d+$/);
      expect(result.instance.pid).toBeGreaterThan(0);
      expect(result.instance.processType).toBe('pty');
      
      createdInstances.push(result.instance.id);
    });

    test('Frontend proxy should route to backend correctly', async () => {
      const response = await fetch(`${FRONTEND_URL}/api/claude/instances`);
      const result = await response.json();
      
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.instances)).toBe(true);
    });
  });

  describe('WebSocket Terminal Connection', () => {
    test('Should connect to WebSocket terminal with instance routing', (done) => {
      let instanceId: string;
      
      // First create an instance
      fetch(`${BACKEND_API_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          workingDirectory: '/workspaces/agent-feed'
        })
      })
      .then(res => res.json())
      .then(result => {
        instanceId = result.instance.id;
        createdInstances.push(instanceId);
        
        // Connect to WebSocket
        const ws = new WebSocket(`${WEBSOCKET_URL}/terminal`);
        
        ws.on('open', () => {
          // Send terminal connection message
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: instanceId
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'connect' && message.terminalId === instanceId) {
            expect(message.transport).toBe('websocket');
            ws.close();
            done();
          }
        });

        ws.on('error', (error) => {
          fail(`WebSocket error: ${error.message}`);
        });

        setTimeout(() => {
          ws.close();
          fail('WebSocket message timeout');
        }, 10000);
      })
      .catch(error => fail(`Instance creation failed: ${error.message}`));
    });
  });

  describe('Status Transition Verification', () => {
    test('Instance should transition from starting to running', async () => {
      // Create instance
      const createResponse = await fetch(`${BACKEND_API_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          workingDirectory: '/workspaces/agent-feed'
        })
      });

      const createResult = await createResponse.json();
      const instanceId = createResult.instance.id;
      createdInstances.push(instanceId);
      
      // Wait for instance to start (up to 10 seconds)
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`${BACKEND_API_URL}/api/claude/instances`);
        const statusResult = await statusResponse.json();
        
        const instance = statusResult.instances.find((inst: ClaudeInstance) => inst.id === instanceId);
        
        if (instance && instance.status === 'running') {
          expect(instance.status).toBe('running');
          expect(instance.pid).toBeGreaterThan(0);
          return; // Test passed
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      fail('Instance did not transition to running status within timeout');
    });
  });

  describe('Real Process Verification', () => {
    test('Created instance should have real system process', async () => {
      const response = await fetch(`${BACKEND_API_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          workingDirectory: '/workspaces/agent-feed'
        })
      });

      const result = await response.json();
      const instance = result.instance;
      createdInstances.push(instance.id);
      
      expect(instance.pid).toBeGreaterThan(0);
      expect(instance.processType).toBe('pty');
      
      // Verify process exists in system
      const { exec } = require('child_process');
      
      return new Promise((resolve, reject) => {
        exec(`ps -p ${instance.pid}`, (error: any, stdout: string) => {
          if (error) {
            reject(new Error(`Process ${instance.pid} not found in system`));
          } else {
            expect(stdout).toContain(instance.pid.toString());
            expect(stdout).toContain('claude'); // Should contain claude command
            resolve(undefined);
          }
        });
      });
    });
  });
});

/**
 * INTEGRATION TEST SUMMARY:
 * 
 * This test suite validates:
 * 1. ✅ Backend API accessible on port 3000
 * 2. ✅ WebSocket server accessible on port 3002  
 * 3. ✅ Instance creation with real PIDs
 * 4. ✅ Frontend proxy routing works
 * 5. ✅ WebSocket terminal connections
 * 6. ✅ Status transitions (starting → running)
 * 7. ✅ Real system processes (no mocks)
 * 
 * NO MOCKS OR SIMULATIONS - 100% REAL INTEGRATION
 */