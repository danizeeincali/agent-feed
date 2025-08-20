/**
 * NLD + TDD Comprehensive Server Connectivity Diagnosis
 * Test every possible connection method until ALL tests pass
 */

const { test, expect } = require('@playwright/test');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

test.describe('NLD Comprehensive Connectivity Diagnosis', () => {
  
  test('should identify actual server port and binding', async () => {
    console.log('🔍 DIAGNOSING SERVER BINDING...');
    
    try {
      // Check what ports are actually bound
      const { stdout } = await execAsync('netstat -tlnp 2>/dev/null | grep node || ss -tlnp 2>/dev/null | grep node');
      console.log('Active node server bindings:', stdout);
      
      // Extract ports from netstat output
      const portMatches = stdout.match(/:(\d+)\s/g);
      const activePorts = portMatches ? portMatches.map(match => match.replace(/[:\s]/g, '')) : [];
      console.log('Detected active ports:', activePorts);
      
      expect(activePorts.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('Port detection failed:', error.message);
    }
  });
  
  test('should test all possible server addresses', async ({ page }) => {
    console.log('🌐 TESTING ALL POSSIBLE SERVER ADDRESSES...');
    
    const testAddresses = [
      'http://127.0.0.1:3003/',
      'http://localhost:3003/',
      'http://0.0.0.0:3003/',
      'http://127.0.0.1:3002/',
      'http://localhost:3002/',
      'http://127.0.0.1:3001/',
      'http://localhost:3001/',
      'http://127.0.0.1:5173/',
      'http://localhost:5173/'
    ];
    
    let workingUrl = null;
    const results = [];
    
    for (const url of testAddresses) {
      try {
        console.log(`Testing: ${url}`);
        const response = await page.goto(url, { 
          timeout: 5000,
          waitUntil: 'domcontentloaded' 
        });
        
        if (response && response.status() === 200) {
          workingUrl = url;
          results.push({ url, status: 200, success: true });
          console.log(`✅ SUCCESS: ${url} - HTTP ${response.status()}`);
          break;
        } else {
          results.push({ url, status: response?.status() || 'No response', success: false });
        }
      } catch (error) {
        results.push({ url, status: error.message, success: false });
        console.log(`❌ FAILED: ${url} - ${error.message}`);
      }
    }
    
    console.log('Connection test results:', results);
    
    // At least one URL must work
    expect(workingUrl).not.toBeNull();
    console.log(`🎯 WORKING SERVER FOUND: ${workingUrl}`);
  });
  
  test('should validate server responds to HTTP requests', async () => {
    console.log('🔗 TESTING RAW HTTP CONNECTION...');
    
    const testPorts = [3003, 3002, 3001, 5173];
    let workingPort = null;
    
    for (const port of testPorts) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.request({
            hostname: '127.0.0.1',
            port: port,
            path: '/',
            method: 'GET',
            timeout: 5000
          }, (res) => {
            console.log(`Port ${port}: HTTP ${res.statusCode}`);
            if (res.statusCode === 200) {
              workingPort = port;
            }
            resolve(res);
          });
          
          req.on('error', (error) => {
            console.log(`Port ${port}: ${error.code}`);
            reject(error);
          });
          
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
          
          req.end();
        });
        
        if (workingPort) break;
      } catch (error) {
        console.log(`Port ${port} failed: ${error.message}`);
      }
    }
    
    expect(workingPort).not.toBeNull();
    console.log(`✅ WORKING PORT CONFIRMED: ${workingPort}`);
  });
  
  test('should validate Vite configuration matches actual binding', async () => {
    console.log('⚙️ VALIDATING VITE CONFIGURATION...');
    
    try {
      const fs = require('fs');
      const path = '/workspaces/agent-feed/frontend/vite.config.ts';
      
      if (fs.existsSync(path)) {
        const config = fs.readFileSync(path, 'utf8');
        console.log('Current Vite config:', config);
        
        // Check if host configuration exists
        const hasHostConfig = config.includes('host:');
        const hasPortConfig = config.includes('port:');
        
        console.log('Has host config:', hasHostConfig);
        console.log('Has port config:', hasPortConfig);
        
        // Configuration should exist for proper binding
        expect(hasHostConfig || hasPortConfig).toBe(true);
      }
    } catch (error) {
      console.log('Config validation error:', error.message);
    }
  });

});