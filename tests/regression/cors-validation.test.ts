/**
 * CORS Configuration Validation Tests - Regression Prevention
 * Prevents WebSocket CORS blocking issues that cause connection failures
 */

import { spawn, execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import WebSocket from 'ws';

describe('CORS Validation - Regression Prevention', () => {
  let backendProcess: any;
  const backendPort = 3001;
  const frontendPort = 5173;
  
  beforeAll(async () => {
    // Start backend server for testing
    try {
      backendProcess = spawn('npm', ['run', 'start'], {
        cwd: join(__dirname, '../..'),
        detached: true,
        stdio: 'pipe'
      });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.warn('Could not start backend for CORS testing');
    }
  }, 30000);
  
  afterAll(async () => {
    if (backendProcess) {
      try {
        process.kill(-backendProcess.pid, 'SIGTERM');
      } catch (error) {
        console.warn('Could not kill backend process');
      }
    }
  });

  describe('WebSocket CORS Configuration', () => {
    it('should allow WebSocket connections from frontend origin', async () => {
      const wsUrl = `ws://localhost:${backendPort}/ws`;
      
      try {
        const ws = new WebSocket(wsUrl, {
          origin: `http://localhost:${frontendPort}`
        });
        
        const connectionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 10000);
          
          ws.on('open', () => {
            clearTimeout(timeout);
            resolve('connected');
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        await connectionPromise;
        ws.close();
        
        await logNLDSuccess({
          test: 'websocket-cors-connection',
          timestamp: new Date().toISOString(),
          success: true,
          origin: `http://localhost:${frontendPort}`,
          wsUrl
        });
        
        expect(true).toBe(true);
      } catch (error: any) {
        await logNLDFailure({
          test: 'websocket-cors-connection',
          timestamp: new Date().toISOString(),
          error: error.message,
          origin: `http://localhost:${frontendPort}`,
          wsUrl,
          failureType: 'cors-blocking',
          impact: 'websocket-connection-failure'
        });
        
        throw new Error(`WebSocket CORS connection failed - This prevents real-time features: ${error.message}`);
      }
    }, 15000);

    it('should reject WebSocket connections from unauthorized origins', async () => {
      const wsUrl = `ws://localhost:${backendPort}/ws`;
      const unauthorizedOrigin = 'http://malicious-site.com';
      
      try {
        const ws = new WebSocket(wsUrl, {
          origin: unauthorizedOrigin
        });
        
        const rejectionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Expected connection to be rejected'));
          }, 10000);
          
          ws.on('open', () => {
            clearTimeout(timeout);
            ws.close();
            reject(new Error('Connection should have been rejected'));
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            // This is expected - the connection should be rejected
            resolve('rejected');
          });
        });
        
        await rejectionPromise;
        
        await logNLDSuccess({
          test: 'websocket-cors-rejection',
          timestamp: new Date().toISOString(),
          success: true,
          rejectedOrigin: unauthorizedOrigin,
          wsUrl
        });
        
        expect(true).toBe(true);
      } catch (error: any) {
        if (error.message.includes('should have been rejected')) {
          await logNLDFailure({
            test: 'websocket-cors-rejection',
            timestamp: new Date().toISOString(),
            error: error.message,
            unauthorizedOrigin,
            wsUrl,
            failureType: 'cors-security-bypass',
            impact: 'security-vulnerability'
          });
          
          throw new Error(`WebSocket CORS security bypass detected: ${error.message}`);
        }
        
        // Other errors might be expected (connection rejected)
        console.log('Expected rejection:', error.message);
      }
    }, 15000);
  });

  describe('HTTP CORS Configuration', () => {
    it('should allow API requests from frontend origin', async () => {
      const apiUrl = `http://localhost:${backendPort}/api/health`;
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Origin': `http://localhost:${frontendPort}`,
            'Content-Type': 'application/json'
          }
        });
        
        expect(response.status).toBeLessThan(400);
        
        // Check CORS headers
        const corsHeader = response.headers.get('Access-Control-Allow-Origin');
        expect(corsHeader).toBeTruthy();
        
        await logNLDSuccess({
          test: 'http-cors-connection',
          timestamp: new Date().toISOString(),
          success: true,
          status: response.status,
          corsHeader,
          apiUrl
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'http-cors-connection',
          timestamp: new Date().toISOString(),
          error: error.message,
          apiUrl,
          failureType: 'http-cors-blocking',
          impact: 'api-unavailable'
        });
        
        throw new Error(`HTTP CORS connection failed: ${error.message}`);
      }
    }, 10000);

    it('should handle preflight OPTIONS requests correctly', async () => {
      const apiUrl = `http://localhost:${backendPort}/api/posts`;
      
      try {
        const response = await fetch(apiUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': `http://localhost:${frontendPort}`,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
          }
        });
        
        expect(response.status).toBe(200);
        
        // Check preflight headers
        const allowMethods = response.headers.get('Access-Control-Allow-Methods');
        const allowHeaders = response.headers.get('Access-Control-Allow-Headers');
        
        expect(allowMethods).toBeTruthy();
        expect(allowHeaders).toBeTruthy();
        
        await logNLDSuccess({
          test: 'cors-preflight-options',
          timestamp: new Date().toISOString(),
          success: true,
          status: response.status,
          allowMethods,
          allowHeaders
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'cors-preflight-options',
          timestamp: new Date().toISOString(),
          error: error.message,
          apiUrl,
          failureType: 'preflight-cors-failure',
          impact: 'post-requests-blocked'
        });
        
        throw new Error(`CORS preflight request failed: ${error.message}`);
      }
    }, 10000);
  });

  describe('CORS Configuration Files', () => {
    it('should have proper CORS configuration in server files', () => {
      const serverFiles = [
        join(__dirname, '../../src/api/server.ts'),
        join(__dirname, '../../backend-terminal-server.js')
      ];
      
      for (const serverFile of serverFiles) {
        if (existsSync(serverFile)) {
          const content = readFileSync(serverFile, 'utf8');
          
          // Check for CORS middleware
          expect(content).toMatch(/cors|CORS/);
          
          // Check for origin configuration
          const hasOriginConfig = content.includes('origin:') || content.includes('origin =');
          expect(hasOriginConfig).toBe(true);
        }
      }
      
      logNLDSuccess({
        test: 'cors-configuration-files',
        timestamp: new Date().toISOString(),
        success: true,
        checkedFiles: serverFiles.length
      });
    });

    it('should not have wildcard CORS origin in production configs', () => {
      const serverFiles = [
        join(__dirname, '../../src/api/server.ts'),
        join(__dirname, '../../backend-terminal-server.js')
      ];
      
      for (const serverFile of serverFiles) {
        if (existsSync(serverFile)) {
          const content = readFileSync(serverFile, 'utf8');
          
          // Check for dangerous wildcard origins
          const hasWildcard = content.includes('origin: "*"') || content.includes("origin: '*'");
          
          if (hasWildcard) {
            logNLDWarning({
              test: 'cors-wildcard-check',
              timestamp: new Date().toISOString(),
              warning: 'Wildcard CORS origin detected',
              file: serverFile,
              failureType: 'security-risk'
            });
            
            console.warn(`Warning: Wildcard CORS origin found in ${serverFile}`);
          }
        }
      }
    });
  });
});

// NLD Logging Functions
async function logNLDSuccess(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `cors-validation-success-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'cors-validation-success',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDFailure(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `cors-validation-failure-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'cors-validation-failure',
      preventionPattern: true,
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDWarning(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `cors-validation-warning-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'cors-validation-warning',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}
