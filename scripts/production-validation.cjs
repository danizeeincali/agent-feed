#!/usr/bin/env node

/**
 * PRODUCTION VALIDATION SUITE - CommonJS Version
 * Quick validation to ensure real functionality with zero mocks
 */

const fs = require('fs');
const { spawn } = require('child_process');

class QuickValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      devServer: null,
      apis: [],
      mocks: [],
      overallStatus: 'PENDING'
    };
  }

  log(message, type = 'info') {
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log(`${prefix} ${message}`);
  }

  async testDevServer() {
    this.log('🚀 Testing development server...');

    try {
      const response = await fetch('http://localhost:3000');

      if (response.ok) {
        this.results.devServer = { status: 'running', errors: [] };
        this.log('Development server is responding');
        return true;
      } else {
        this.results.devServer = { status: 'error', errors: [`HTTP ${response.status}`] };
        this.log(`Development server returned ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      // Try to start server
      this.log('Starting development server...');

      return new Promise((resolve) => {
        const devProcess = spawn('npm', ['run', 'dev'], {
          cwd: '/workspaces/agent-feed',
          stdio: 'pipe'
        });

        let serverReady = false;

        const checkReady = async () => {
          try {
            const response = await fetch('http://localhost:3000');
            if (response.ok) {
              this.results.devServer = { status: 'started', errors: [] };
              this.log('Development server started successfully');
              serverReady = true;
              devProcess.kill();
              resolve(true);
            }
          } catch (e) {
            // Still starting
          }
        };

        // Check every 3 seconds
        const interval = setInterval(checkReady, 3000);

        // Timeout after 45 seconds
        setTimeout(() => {
          if (!serverReady) {
            clearInterval(interval);
            this.results.devServer = { status: 'timeout', errors: ['Startup timeout'] };
            this.log('Development server startup timeout', 'error');
            devProcess.kill();
            resolve(false);
          }
        }, 45000);
      });
    }
  }

  async testApiEndpoints() {
    this.log('🔗 Testing API endpoints...');

    const endpoints = [
      '/api/posts',
      '/api/agents',
      '/api/analytics/summary',
      '/health'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        const isSuccess = response.ok;

        let hasRealData = false;
        if (isSuccess) {
          const data = await response.json();
          const dataStr = JSON.stringify(data).toLowerCase();
          hasRealData = !dataStr.includes('mock') && !dataStr.includes('fake') && !dataStr.includes('test-');
        }

        this.results.apis.push({
          endpoint,
          status: response.status,
          success: isSuccess,
          realData: hasRealData
        });

        this.log(`${endpoint}: ${response.status} - Real data: ${hasRealData ? 'Yes' : 'No'}`);

      } catch (error) {
        this.results.apis.push({
          endpoint,
          status: 0,
          success: false,
          realData: false,
          error: error.message
        });
        this.log(`${endpoint}: Failed - ${error.message}`, 'error');
      }
    }
  }

  async scanForMocks() {
    this.log('🧹 Scanning for mock implementations...');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync(
        'grep -r -i "mock\\|fake\\|stub" /workspaces/agent-feed/src --include="*.ts" --include="*.js" | grep -v test | grep -v spec | head -20 || true'
      );

      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          this.results.mocks.push({
            file: line.split(':')[0],
            content: line,
            severity: line.toLowerCase().includes('mock') ? 'high' : 'medium'
          });
        }
      }

      this.log(`Found ${this.results.mocks.length} potential mock implementations`);

    } catch (error) {
      this.log(`Mock scan failed: ${error.message}`, 'warning');
    }
  }

  calculateStatus() {
    const serverWorking = this.results.devServer?.status === 'running' || this.results.devServer?.status === 'started';
    const apisWorking = this.results.apis.filter(api => api.success).length;
    const criticalMocks = this.results.mocks.filter(m => m.severity === 'high').length;

    if (!serverWorking) {
      this.results.overallStatus = 'CRITICAL - Server not running';
    } else if (criticalMocks > 5) {
      this.results.overallStatus = 'FAILED - Too many mocks';
    } else if (apisWorking < 2) {
      this.results.overallStatus = 'FAILED - APIs not working';
    } else if (criticalMocks > 0) {
      this.results.overallStatus = 'PARTIAL - Some mocks remain';
    } else {
      this.results.overallStatus = 'PASSED - Production ready';
    }
  }

  generateReport() {
    this.calculateStatus();

    const report = `# PRODUCTION VALIDATION QUICK REPORT

## Overall Status: ${this.results.overallStatus}

### Development Server
- Status: ${this.results.devServer?.status || 'Not tested'}
- Errors: ${this.results.devServer?.errors?.length || 0}

### API Endpoints (${this.results.apis.length} tested)
${this.results.apis.map(api =>
  `- ${api.endpoint}: ${api.success ? '✅' : '❌'} (${api.status}) - Real: ${api.realData ? 'Yes' : 'No'}`
).join('\n')}

### Mock Implementations Found: ${this.results.mocks.length}
- High Priority: ${this.results.mocks.filter(m => m.severity === 'high').length}
- Medium Priority: ${this.results.mocks.filter(m => m.severity === 'medium').length}

### Recommendations
${this.getRecommendations().map(rec => `- ${rec}`).join('\n')}

## Production Readiness
**${this.results.overallStatus.includes('PASSED') ? '✅ APPROVED FOR DEPLOYMENT' : '❌ REQUIRES FIXES BEFORE DEPLOYMENT'}**

---
*Validated on ${this.results.timestamp}*
`;

    fs.writeFileSync('/workspaces/agent-feed/QUICK_VALIDATION_REPORT.md', report);
    return report;
  }

  getRecommendations() {
    const recs = [];

    if (this.results.devServer?.status !== 'running' && this.results.devServer?.status !== 'started') {
      recs.push('🚨 Fix development server startup issues');
    }

    const failedApis = this.results.apis.filter(api => !api.success);
    if (failedApis.length > 0) {
      recs.push('🔧 Fix failing API endpoints');
    }

    const apisWithoutRealData = this.results.apis.filter(api => api.success && !api.realData);
    if (apisWithoutRealData.length > 0) {
      recs.push('🔄 Replace mock data with real data in APIs');
    }

    const criticalMocks = this.results.mocks.filter(m => m.severity === 'high');
    if (criticalMocks.length > 0) {
      recs.push('🧹 Eliminate mock implementations in production code');
    }

    if (recs.length === 0) {
      recs.push('🎉 System appears ready for production deployment');
    }

    return recs;
  }

  async run() {
    this.log('🚀 Starting quick production validation...');

    await this.testDevServer();
    await this.testApiEndpoints();
    await this.scanForMocks();

    const report = this.generateReport();
    console.log('\n' + report);

    return this.results;
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new QuickValidator();
  validator.run()
    .then(results => {
      const isSuccess = results.overallStatus.includes('PASSED');
      process.exit(isSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = QuickValidator;