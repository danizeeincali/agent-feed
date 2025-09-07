#!/usr/bin/env node

/**
 * SPARC Network Diagnostics Tool
 * Comprehensive network connectivity testing for cloud development environments
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class NetworkDiagnostics {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: process.env.CODESPACES ? 'codespaces' : 'local',
      tests: []
    };
  }

  async runTest(name, testFn) {
    console.log(`\n🔍 Running test: ${name}`);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'PASS',
        duration,
        result,
        error: null
      });
      
      console.log(`✅ ${name} - PASSED (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.tests.push({
        name,
        status: 'FAIL', 
        duration,
        result: null,
        error: error.message
      });
      
      console.log(`❌ ${name} - FAILED (${duration}ms): ${error.message}`);
      return null;
    }
  }

  async testHttpConnection(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.get(url, { timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            contentLength: data.length,
            success: res.statusCode < 400
          });
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.on('error', reject);
    });
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}`));
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  }

  async runDiagnostics() {
    console.log('🚀 Starting SPARC Network Diagnostics...\n');

    // Test 1: Local server connectivity
    await this.runTest('Local Server (127.0.0.1:5173)', async () => {
      return await this.testHttpConnection('http://127.0.0.1:5173');
    });

    await this.runTest('Local Server (localhost:5173)', async () => {
      return await this.testHttpConnection('http://localhost:5173');
    });

    // Test 2: Network interface connectivity
    const networkResult = await this.runTest('Network Interface', async () => {
      const result = await this.execCommand('ip addr show eth0 | grep "inet "');
      const match = result.stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    });

    if (networkResult) {
      await this.runTest(`Network IP (${networkResult}:5173)`, async () => {
        return await this.testHttpConnection(`http://${networkResult}:5173`);
      });
    }

    // Test 3: Port binding status
    await this.runTest('Port Binding Status', async () => {
      const result = await this.execCommand('ss -tuln | grep :5173');
      return { binding: result.stdout.trim() };
    });

    // Test 4: Process information
    await this.runTest('Process Information', async () => {
      const result = await this.execCommand('lsof -i :5173');
      return { processes: result.stdout.trim() };
    });

    // Test 5: Codespaces environment (if applicable)
    if (process.env.CODESPACES) {
      const codespaceToken = process.env.GITHUB_CODESPACE_TOKEN;
      const codespaceUrl = `https://${codespaceToken.slice(0, 8)}-5173.app.github.dev`;
      
      await this.runTest('Codespaces Port Forwarding', async () => {
        return await this.testHttpConnection(codespaceUrl, 10000);
      });

      this.results.codespaceUrl = codespaceUrl;
    }

    // Test 6: Vite HMR WebSocket
    await this.runTest('Vite WebSocket Test', async () => {
      const result = await this.execCommand('curl -s -I http://localhost:5173/@vite/client');
      return { headers: result.stdout };
    });

    // Test 7: DNS resolution
    await this.runTest('DNS Resolution', async () => {
      const result = await this.execCommand('nslookup localhost && echo "---" && nslookup 127.0.0.1');
      return { dns: result.stdout };
    });

    // Generate report
    await this.generateReport();
    
    console.log('\n📊 Diagnostics Complete!');
    console.log(`Report saved to: ${path.join(__dirname, '..', 'test-results', 'network-diagnostics.json')}`);
    
    return this.results;
  }

  async generateReport() {
    const reportDir = path.join(__dirname, '..', 'test-results');
    
    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Write JSON report
    const reportFile = path.join(reportDir, 'network-diagnostics.json');
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    const htmlFile = path.join(reportDir, 'network-diagnostics.html');
    fs.writeFileSync(htmlFile, htmlReport);

    console.log('\n📋 Summary:');
    const passed = this.results.tests.filter(t => t.status === 'PASS').length;
    const failed = this.results.tests.filter(t => t.status === 'FAIL').length;
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (this.results.codespaceUrl) {
      console.log(`🌐 Codespace URL: ${this.results.codespaceUrl}`);
    }
  }

  generateHtmlReport() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SPARC Network Diagnostics Report</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #1a1a1a; color: #e0e0e0; }
        .header { background: #2d2d2d; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .pass { background: #1a4d1a; border-left: 4px solid #4caf50; }
        .fail { background: #4d1a1a; border-left: 4px solid #f44336; }
        .result { margin: 5px 0; font-size: 12px; }
        pre { background: #333; padding: 10px; border-radius: 3px; overflow-x: auto; }
        .url { color: #64b5f6; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 SPARC Network Diagnostics Report</h1>
        <p><strong>Timestamp:</strong> ${this.results.timestamp}</p>
        <p><strong>Environment:</strong> ${this.results.environment}</p>
        ${this.results.codespaceUrl ? `<p><strong>Codespace URL:</strong> <span class="url">${this.results.codespaceUrl}</span></p>` : ''}
    </div>
    
    ${this.results.tests.map(test => `
        <div class="test ${test.status.toLowerCase()}">
            <h3>${test.status === 'PASS' ? '✅' : '❌'} ${test.name} (${test.duration}ms)</h3>
            ${test.error ? `<div class="result"><strong>Error:</strong> ${test.error}</div>` : ''}
            ${test.result ? `<div class="result"><strong>Result:</strong><pre>${JSON.stringify(test.result, null, 2)}</pre></div>` : ''}
        </div>
    `).join('')}
    
    <div class="header">
        <h2>📊 Summary</h2>
        <p>✅ Passed: ${this.results.tests.filter(t => t.status === 'PASS').length}</p>
        <p>❌ Failed: ${this.results.tests.filter(t => t.status === 'FAIL').length}</p>
    </div>
</body>
</html>`;
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  const diagnostics = new NetworkDiagnostics();
  diagnostics.runDiagnostics().catch(console.error);
}

module.exports = NetworkDiagnostics;