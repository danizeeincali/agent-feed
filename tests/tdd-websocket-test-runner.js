#!/usr/bin/env node

/**
 * TDD WEBSOCKET TEST RUNNER
 * 
 * Orchestrates comprehensive WebSocket connection testing with real Claude Code instances
 * Provides detailed reporting and diagnosis of connection issues
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WebSocketTestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.backendProcess = null;
    this.frontendProcess = null;
    this.setupComplete = false;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  error(message) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ ${message}`);
  }

  success(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ✅ ${message}`);
  }

  async checkDependencies() {
    this.log('🔍 Checking dependencies...');
    
    try {
      // Check if Playwright is installed
      execSync('npx playwright --version', { stdio: 'pipe' });
      this.success('Playwright is available');
    } catch (e) {
      this.error('Playwright not found. Run: npm install @playwright/test');
      return false;
    }

    // Check if backend and frontend directories exist
    if (!fs.existsSync(path.join(__dirname, '../simple-backend.js'))) {
      this.error('Backend file not found: simple-backend.js');
      return false;
    }

    if (!fs.existsSync(path.join(__dirname, '../frontend'))) {
      this.error('Frontend directory not found');
      return false;
    }

    this.success('All dependencies verified');
    return true;
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      this.log('🚀 Starting backend server...');
      
      const backendPath = path.join(__dirname, '../simple-backend.js');
      this.backendProcess = spawn('node', [backendPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..')
      });

      let startupOutput = '';
      
      this.backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        
        if (output.includes('SPARC UNIFIED SERVER running') || output.includes('server running')) {
          this.success('Backend server started successfully');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.log(`Backend stderr: ${data}`);
      });

      this.backendProcess.on('error', (error) => {
        this.error(`Backend startup failed: ${error.message}`);
        reject(error);
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.setupComplete) {
          this.error('Backend startup timeout');
          reject(new Error('Backend startup timeout'));
        }
      }, 15000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      this.log('🚀 Starting frontend server...');
      
      this.frontendProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '../frontend')
      });

      let startupOutput = '';

      this.frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        
        if (output.includes('Local:') && output.includes('5173')) {
          this.success('Frontend server started successfully');
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:') && output.includes('5173')) {
          this.success('Frontend server started successfully');
          resolve();
        }
      });

      this.frontendProcess.on('error', (error) => {
        this.error(`Frontend startup failed: ${error.message}`);
        reject(error);
      });

      // Timeout after 20 seconds
      setTimeout(() => {
        if (!this.setupComplete) {
          this.error('Frontend startup timeout');
          reject(new Error('Frontend startup timeout'));
        }
      }, 20000);
    });
  }

  async waitForServices() {
    this.log('⏳ Waiting for services to be ready...');
    
    // Wait for backend health check
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch('http://localhost:3000/health');
        if (response.ok) {
          this.success('Backend health check passed');
          break;
        }
      } catch (e) {
        if (i === 29) {
          throw new Error('Backend health check failed after 30 attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Wait for frontend
    for (let i = 0; i < 30; i++) {
      try {
        const response = await fetch('http://localhost:5173');
        if (response.ok) {
          this.success('Frontend health check passed');
          break;
        }
      } catch (e) {
        if (i === 29) {
          throw new Error('Frontend health check failed after 30 attempts');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.setupComplete = true;
    this.success('All services are ready');
  }

  async runTestSuite(suiteName, testFile) {
    this.log(`🧪 Running test suite: ${suiteName}`);
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', [
        'playwright', 'test', 
        testFile,
        '--reporter=json',
        '--output=test-results'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let testOutput = '';
      let testErrors = '';

      testProcess.stdout.on('data', (data) => {
        testOutput += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        testErrors += data.toString();
      });

      testProcess.on('close', (code) => {
        const result = {
          suiteName,
          testFile,
          exitCode: code,
          output: testOutput,
          errors: testErrors,
          passed: code === 0,
          timestamp: Date.now()
        };

        this.testResults.push(result);

        if (code === 0) {
          this.success(`Test suite ${suiteName} passed`);
        } else {
          this.error(`Test suite ${suiteName} failed with exit code ${code}`);
        }

        resolve(result);
      });

      testProcess.on('error', (error) => {
        this.error(`Test execution error: ${error.message}`);
        reject(error);
      });
    });
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive WebSocket testing...');

    const testSuites = [
      {
        name: 'Connection Establishment',
        file: './tdd-websocket-connection-suite.spec.js'
      },
      {
        name: 'Message Flow Deep Analysis',
        file: './tdd-websocket-message-flow.spec.js'
      }
    ];

    for (const suite of testSuites) {
      try {
        await this.runTestSuite(suite.name, suite.file);
      } catch (error) {
        this.error(`Test suite ${suite.name} execution failed: ${error.message}`);
      }
    }
  }

  async generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const report = {
      testSession: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: `${Math.round(duration / 1000)}s`
      },
      summary: {
        totalSuites: this.testResults.length,
        passedSuites: this.testResults.filter(r => r.passed).length,
        failedSuites: this.testResults.filter(r => !r.passed).length,
        overallSuccess: this.testResults.every(r => r.passed)
      },
      results: this.testResults.map(result => ({
        suiteName: result.suiteName,
        testFile: result.testFile,
        passed: result.passed,
        exitCode: result.exitCode,
        hasErrors: result.errors.length > 0,
        timestamp: new Date(result.timestamp).toISOString()
      })),
      detailedResults: this.testResults
    };

    // Save report to file
    const reportPath = path.join(__dirname, '../test-results/websocket-test-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log('📊 TEST REPORT SUMMARY:');
    console.log(`   Total Test Suites: ${report.summary.totalSuites}`);
    console.log(`   Passed: ${report.summary.passedSuites}`);
    console.log(`   Failed: ${report.summary.failedSuites}`);
    console.log(`   Duration: ${report.testSession.duration}`);
    console.log(`   Overall Success: ${report.summary.overallSuccess ? '✅' : '❌'}`);
    console.log(`   Report saved to: ${reportPath}`);

    return report;
  }

  async cleanup() {
    this.log('🧹 Cleaning up test environment...');

    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.success('Backend process terminated');
    }

    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
      this.success('Frontend process terminated');
    }

    // Wait for processes to close
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async run() {
    try {
      // Step 1: Check dependencies
      if (!(await this.checkDependencies())) {
        process.exit(1);
      }

      // Step 2: Start services
      await Promise.all([
        this.startBackend(),
        this.startFrontend()
      ]);

      // Step 3: Wait for services to be ready
      await this.waitForServices();

      // Step 4: Run tests
      await this.runAllTests();

      // Step 5: Generate report
      const report = await this.generateReport();

      // Step 6: Cleanup
      await this.cleanup();

      // Exit with appropriate code
      process.exit(report.summary.overallSuccess ? 0 : 1);

    } catch (error) {
      this.error(`Test runner failed: ${error.message}`);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Handle global fetch for Node.js versions that don't have it
if (!global.fetch) {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('❌ node-fetch not available. Install with: npm install node-fetch');
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  const runner = new WebSocketTestRunner();
  
  // Handle cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n🛑 Test runner interrupted');
    await runner.cleanup();
    process.exit(1);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Test runner terminated');
    await runner.cleanup();
    process.exit(1);
  });

  runner.run().catch(error => {
    console.error('❌ Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = WebSocketTestRunner;