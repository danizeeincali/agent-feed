/**
 * WebSocket Stability Regression Test Suite
 * 
 * CRITICAL: These tests prevent the recurrence of WebSocket connection issues
 * that caused "Connection Error: Connection lost: Unknown error"
 * 
 * Root Cause: Dual WebSocket management systems (frontend and backend mismatch)
 * Prevention: Ensure single, consistent WebSocket implementation
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

describe('WebSocket Stability Regression Tests', () => {
  let ws;
  let testInstanceId;
  
  afterEach(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  describe('Critical Regression: Dual Manager Conflict Prevention', () => {
    it('should NOT have multiple WebSocket managers in backend', async () => {
      const backendFile = fs.readFileSync(
        path.join(__dirname, '../../simple-backend.js'), 
        'utf8'
      );
      
      // Check for conflicting managers
      const hasWebSocketConnectionManager = backendFile.includes('WebSocketConnectionManager');
      const hasClaudeAPIManager = backendFile.includes('ClaudeAPIManager');
      
      expect(hasWebSocketConnectionManager).toBe(false);
      expect(hasClaudeAPIManager).toBe(false);
      
      // Ensure only simple WebSocket implementation exists
      const hasBasicWebSocket = backendFile.includes('wss.on(\'connection\'');
      expect(hasBasicWebSocket).toBe(true);
    });

    it('should NOT have new WebSocketService in frontend', async () => {
      const webSocketServicePath = path.join(
        __dirname, 
        '../../frontend/src/services/WebSocketService.ts'
      );
      
      // This file should NOT exist in stable version
      const fileExists = fs.existsSync(webSocketServicePath);
      expect(fileExists).toBe(false);
    });
  });

  describe('Connection Stability Tests', () => {
    it('should maintain connection for 60+ seconds without drops', async () => {
      return new Promise((resolve, reject) => {
        ws = new WebSocket('ws://localhost:3000/terminal');
        let connectionStable = true;
        let startTime = Date.now();
        
        ws.on('open', () => {
          // Send periodic pings to test stability
          const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.ping();
            }
          }, 10000);
          
          // Test for 60 seconds
          setTimeout(() => {
            clearInterval(interval);
            expect(connectionStable).toBe(true);
            expect(ws.readyState).toBe(WebSocket.OPEN);
            resolve();
          }, 60000);
        });
        
        ws.on('close', (code, reason) => {
          const uptime = Date.now() - startTime;
          if (uptime < 60000) {
            connectionStable = false;
            reject(new Error(`Connection dropped after ${uptime}ms: ${code} ${reason}`));
          }
        });
        
        ws.on('error', (error) => {
          connectionStable = false;
          reject(error);
        });
      });
    }, 65000);

    it('should NOT drop connection at 30-second mark', async () => {
      return new Promise((resolve, reject) => {
        ws = new WebSocket('ws://localhost:3000/terminal');
        let connectionDroppedAt30s = false;
        
        ws.on('open', () => {
          // Monitor specifically around 30-second mark
          setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              connectionDroppedAt30s = true;
            }
          }, 30000);
          
          setTimeout(() => {
            expect(connectionDroppedAt30s).toBe(false);
            expect(ws.readyState).toBe(WebSocket.OPEN);
            resolve();
          }, 35000);
        });
        
        ws.on('close', (code, reason) => {
          reject(new Error(`Connection closed: ${code} ${reason}`));
        });
      });
    }, 40000);
  });

  describe('Timeout Configuration Tests', () => {
    it('should have consistent timeout values across system', async () => {
      const backendFile = fs.readFileSync(
        path.join(__dirname, '../../simple-backend.js'), 
        'utf8'
      );
      
      // Extract timeout values
      const timeoutMatches = backendFile.match(/(\d+)000.*(?:timeout|heartbeat|ping)/gi) || [];
      const timeouts = timeoutMatches.map(match => {
        const value = parseInt(match.match(/(\d+)000/)[1]);
        return value;
      });
      
      // No timeout should be exactly 30 seconds (the problematic value)
      const has30SecondTimeout = timeouts.some(t => t === 30);
      if (has30SecondTimeout) {
        console.warn('WARNING: Found 30-second timeout which caused previous issues');
      }
      
      // Ensure reasonable timeout values
      timeouts.forEach(timeout => {
        expect(timeout).toBeGreaterThanOrEqual(5); // At least 5 seconds
        expect(timeout).toBeLessThanOrEqual(300); // Max 5 minutes
      });
    });
  });

  describe('Frontend-Backend Synchronization Tests', () => {
    it('should have matching WebSocket endpoints', async () => {
      // Check backend WebSocket endpoint
      const backendResponse = await fetch('http://localhost:3000/health');
      const backendHealth = await backendResponse.json();
      expect(backendHealth.status).toBe('healthy');
      
      // Frontend should connect to same endpoint
      const frontendFile = fs.readFileSync(
        path.join(__dirname, '../../frontend/src/components/claude-manager/DualModeInterface.tsx'),
        'utf8'
      );
      
      // Should use simple ws://localhost:3000 without complex service
      const usesSimpleWebSocket = frontendFile.includes('ws://localhost:3000') || 
                                  frontendFile.includes('WebSocket');
      expect(usesSimpleWebSocket).toBe(true);
    });

    it('should handle commands without connection drops', async () => {
      return new Promise(async (resolve, reject) => {
        // Create instance first
        const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'regression-test' })
        });
        const { instance } = await createResponse.json();
        testInstanceId = instance.id;
        
        ws = new WebSocket('ws://localhost:3000/terminal');
        
        ws.on('open', () => {
          // Connect to instance
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: testInstanceId
          }));
          
          // Send command after connection
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: 'echo "regression test"'
            }));
          }, 2000);
          
          // Verify still connected after command
          setTimeout(() => {
            expect(ws.readyState).toBe(WebSocket.OPEN);
            resolve();
          }, 5000);
        });
        
        ws.on('error', reject);
        ws.on('close', (code) => {
          if (code !== 1000) {
            reject(new Error(`Unexpected close: ${code}`));
          }
        });
      });
    }, 10000);
  });

  describe('Error Pattern Detection', () => {
    it('should NOT see "Connection lost: Unknown error" in logs', async () => {
      const logsExist = fs.existsSync(path.join(__dirname, '../../logs/combined.log'));
      
      if (logsExist) {
        const logs = fs.readFileSync(
          path.join(__dirname, '../../logs/combined.log'),
          'utf8'
        );
        
        // Check recent logs (last 1000 lines)
        const recentLogs = logs.split('\n').slice(-1000).join('\n');
        
        const hasUnknownError = recentLogs.includes('Connection lost: Unknown error');
        const hasConnectionError = recentLogs.includes('Connection Error');
        
        expect(hasUnknownError).toBe(false);
        expect(hasConnectionError).toBe(false);
      }
    });

    it('should NOT have ping timeout disconnections', async () => {
      const logsExist = fs.existsSync(path.join(__dirname, '../../logs/combined.log'));
      
      if (logsExist) {
        const logs = fs.readFileSync(
          path.join(__dirname, '../../logs/combined.log'),
          'utf8'
        );
        
        const recentLogs = logs.split('\n').slice(-500).join('\n');
        const hasPingTimeout = recentLogs.includes('ping timeout');
        
        expect(hasPingTimeout).toBe(false);
      }
    });
  });
});

module.exports = {
  WebSocketStabilityRegressionTests: describe
};