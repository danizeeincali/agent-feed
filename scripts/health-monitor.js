#!/usr/bin/env node

/**
 * Automated Health Check Monitoring System
 * Continuously monitors system health and prevents regressions
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = require('ws');

class HealthMonitor {
  constructor() {
    this.nldDir = path.join(__dirname, '../nld-agent/records');
    this.config = {
      checkInterval: 30000, // 30 seconds
      maxRetries: 3,
      timeoutMs: 10000,
      endpoints: {
        backend: 'http://localhost:3001',
        frontend: 'http://localhost:5173',
        websocket: 'ws://localhost:3001/ws'
      }
    };
    this.isRunning = false;
    this.checks = new Map();
  }

  async start() {
    if (this.isRunning) {
      console.log('🔍 Health monitor already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting automated health monitoring...');
    
    // Initialize check history
    this.initializeChecks();
    
    // Start monitoring loop
    this.monitoringLoop();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Stopping health monitor...');
    process.exit(0);
  }

  initializeChecks() {
    this.checks.set('typescript-compilation', { lastStatus: 'unknown', failures: 0 });
    this.checks.set('frontend-build', { lastStatus: 'unknown', failures: 0 });
    this.checks.set('backend-api', { lastStatus: 'unknown', failures: 0 });
    this.checks.set('websocket-connection', { lastStatus: 'unknown', failures: 0 });
    this.checks.set('terminal-responsiveness', { lastStatus: 'unknown', failures: 0 });
    this.checks.set('component-rendering', { lastStatus: 'unknown', failures: 0 });
  }

  async monitoringLoop() {
    while (this.isRunning) {
      try {
        const startTime = Date.now();
        
        // Run all health checks
        const results = await this.runAllChecks();
        
        // Analyze results and log to NLD
        await this.analyzeAndLog(results);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Health check cycle completed in ${duration}ms`);
        
        // Wait for next check interval
        await this.sleep(this.config.checkInterval);
        
      } catch (error) {
        console.error('❌ Error in monitoring loop:', error.message);
        await this.logNLDFailure({
          test: 'health-monitoring-loop',
          error: error.message,
          timestamp: new Date().toISOString(),
          failureType: 'monitoring-system-error'
        });
        
        // Wait before retrying
        await this.sleep(5000);
      }
    }
  }

  async runAllChecks() {
    const results = {};
    
    // TypeScript compilation check
    results.typescriptCompilation = await this.checkTypeScriptCompilation();
    
    // Frontend build check
    results.frontendBuild = await this.checkFrontendBuild();
    
    // Backend API check
    results.backendApi = await this.checkBackendApi();
    
    // WebSocket connection check
    results.websocketConnection = await this.checkWebSocketConnection();
    
    // Terminal responsiveness check
    results.terminalResponsiveness = await this.checkTerminalResponsiveness();
    
    // Component rendering check
    results.componentRendering = await this.checkComponentRendering();
    
    return results;
  }

  async checkTypeScriptCompilation() {
    const checkName = 'typescript-compilation';
    
    try {
      // Check backend TypeScript
      execSync('npm run typecheck', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        timeout: this.config.timeoutMs
      });
      
      // Check frontend TypeScript
      execSync('npm run typecheck', { 
        cwd: path.join(__dirname, '../frontend'),
        stdio: 'pipe',
        timeout: this.config.timeoutMs
      });
      
      return this.recordSuccess(checkName, {
        backend: 'pass',
        frontend: 'pass'
      });
      
    } catch (error) {
      return this.recordFailure(checkName, {
        error: error.message,
        impact: 'white-screen-of-death-risk',
        priority: 'critical'
      });
    }
  }

  async checkFrontendBuild() {
    const checkName = 'frontend-build';
    
    try {
      const output = execSync('npm run build', { 
        cwd: path.join(__dirname, '../frontend'),
        stdio: 'pipe',
        timeout: this.config.timeoutMs * 3 // Build takes longer
      });
      
      // Check if dist directory exists
      const distPath = path.join(__dirname, '../frontend/dist');
      const distExists = await fs.access(distPath).then(() => true).catch(() => false);
      
      if (!distExists) {
        throw new Error('Build completed but dist directory not found');
      }
      
      return this.recordSuccess(checkName, {
        distExists,
        buildOutput: output.toString().slice(-200) // Last 200 chars
      });
      
    } catch (error) {
      return this.recordFailure(checkName, {
        error: error.message,
        impact: 'deployment-failure',
        priority: 'high'
      });
    }
  }

  async checkBackendApi() {
    const checkName = 'backend-api';
    
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.endpoints.backend}/api/health`,
        this.config.timeoutMs
      );
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return this.recordSuccess(checkName, {
        status: response.status,
        responseTime: data.responseTime || 'unknown',
        health: data.status || 'ok'
      });
      
    } catch (error) {
      return this.recordFailure(checkName, {
        error: error.message,
        impact: 'api-unavailable',
        priority: 'high'
      });
    }
  }

  async checkWebSocketConnection() {
    const checkName = 'websocket-connection';
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(this.recordFailure(checkName, {
            error: 'WebSocket connection timeout',
            impact: 'real-time-features-broken',
            priority: 'high'
          }));
        }
      }, this.config.timeoutMs);
      
      try {
        const ws = new WebSocket(this.config.endpoints.websocket, {
          origin: 'http://localhost:5173'
        });
        
        ws.on('open', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            
            const connectionTime = Date.now() - startTime;
            resolve(this.recordSuccess(checkName, {
              connectionTime,
              origin: 'http://localhost:5173'
            }));
          }
        });
        
        ws.on('error', (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            
            resolve(this.recordFailure(checkName, {
              error: error.message,
              impact: 'websocket-cors-blocking',
              priority: 'high'
            }));
          }
        });
        
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          
          resolve(this.recordFailure(checkName, {
            error: error.message,
            impact: 'websocket-connection-failure',
            priority: 'high'
          }));
        }
      }
    });
  }

  async checkTerminalResponsiveness() {
    const checkName = 'terminal-responsiveness';
    
    // This is a simplified check - in a real implementation,
    // you might spawn a test terminal session and verify input/output
    try {
      // Check if backend terminal server is responsive
      const response = await this.fetchWithTimeout(
        `${this.config.endpoints.backend}/api/terminal/status`,
        this.config.timeoutMs
      );
      
      if (!response.ok) {
        throw new Error(`Terminal status check failed: ${response.status}`);
      }
      
      return this.recordSuccess(checkName, {
        terminalStatus: 'responsive',
        responseTime: Date.now()
      });
      
    } catch (error) {
      return this.recordFailure(checkName, {
        error: error.message,
        impact: 'terminal-input-hanging',
        priority: 'medium'
      });
    }
  }

  async checkComponentRendering() {
    const checkName = 'component-rendering';
    
    try {
      // Simple check: verify frontend is serving content
      const response = await this.fetchWithTimeout(
        this.config.endpoints.frontend,
        this.config.timeoutMs
      );
      
      if (!response.ok) {
        throw new Error(`Frontend not serving: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check for basic React app structure
      if (!html.includes('<div id="root"') && !html.includes('React')) {
        throw new Error('Frontend HTML does not contain React app structure');
      }
      
      return this.recordSuccess(checkName, {
        htmlSize: html.length,
        hasReactRoot: html.includes('<div id="root"')
      });
      
    } catch (error) {
      return this.recordFailure(checkName, {
        error: error.message,
        impact: 'component-import-errors',
        priority: 'medium'
      });
    }
  }

  recordSuccess(checkName, details) {
    const check = this.checks.get(checkName);
    const wasFailure = check.lastStatus === 'failure';
    
    check.lastStatus = 'success';
    check.failures = 0;
    check.lastCheck = new Date().toISOString();
    
    if (wasFailure) {
      console.log(`🎉 ${checkName} recovered from failure`);
    }
    
    return {
      name: checkName,
      status: 'success',
      details,
      recovered: wasFailure
    };
  }

  recordFailure(checkName, details) {
    const check = this.checks.get(checkName);
    const wasSuccess = check.lastStatus === 'success';
    
    check.lastStatus = 'failure';
    check.failures++;
    check.lastCheck = new Date().toISOString();
    
    if (wasSuccess || check.failures === 1) {
      console.log(`⚠️  ${checkName} failed:`, details.error);
    }
    
    return {
      name: checkName,
      status: 'failure',
      details,
      failureCount: check.failures,
      newFailure: wasSuccess
    };
  }

  async analyzeAndLog(results) {
    const failures = Object.values(results).filter(r => r.status === 'failure');
    const successes = Object.values(results).filter(r => r.status === 'success');
    const recoveries = successes.filter(s => s.recovered);
    
    // Log summary
    if (failures.length === 0) {
      console.log(`✅ All systems healthy (${successes.length} checks passed)`);
      
      // Log success pattern to NLD
      await this.logNLDSuccess({
        test: 'health-monitoring-cycle',
        timestamp: new Date().toISOString(),
        checksPerformed: Object.keys(results).length,
        allPassed: true,
        recoveries: recoveries.length
      });
    } else {
      console.log(`⚠️  Health check failures: ${failures.length}/${Object.keys(results).length}`);
      
      // Log failures to NLD
      for (const failure of failures) {
        await this.logNLDFailure({
          test: `health-check-${failure.name}`,
          timestamp: new Date().toISOString(),
          error: failure.details.error,
          impact: failure.details.impact,
          priority: failure.details.priority,
          failureCount: failure.failureCount,
          failureType: 'health-check-failure'
        });
      }
    }
    
    // Log recoveries
    for (const recovery of recoveries) {
      await this.logNLDSuccess({
        test: `health-recovery-${recovery.name}`,
        timestamp: new Date().toISOString(),
        recovered: true,
        details: recovery.details
      });
    }
  }

  async fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HealthMonitor/1.0'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async logNLDSuccess(data) {
    try {
      await fs.mkdir(this.nldDir, { recursive: true });
      const filename = `health-success-${Date.now()}.json`;
      const filepath = path.join(this.nldDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify({
        type: 'health-monitoring-success',
        ...data
      }, null, 2));
    } catch (error) {
      console.warn('Warning: Could not log to NLD system:', error.message);
    }
  }

  async logNLDFailure(data) {
    try {
      await fs.mkdir(this.nldDir, { recursive: true });
      const filename = `health-failure-${Date.now()}.json`;
      const filepath = path.join(this.nldDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify({
        type: 'health-monitoring-failure',
        preventionPattern: true,
        ...data
      }, null, 2));
    } catch (error) {
      console.warn('Warning: Could not log to NLD system:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI usage
if (require.main === module) {
  const monitor = new HealthMonitor();
  monitor.start().catch(error => {
    console.error('Failed to start health monitor:', error);
    process.exit(1);
  });
}

module.exports = HealthMonitor;
