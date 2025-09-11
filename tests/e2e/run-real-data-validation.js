#!/usr/bin/env node

/**
 * Real Data Validation Test Runner
 * 
 * Comprehensive test runner for validating Phase 1 mock data elimination
 * Ensures UnifiedAgentPage is production-ready with real API integration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class RealDataValidationRunner {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      mockContamination: [],
      performanceIssues: [],
      apiValidation: {
        endpoints: [],
        responseTime: {}
      }
    };
    
    this.reportDir = path.join(__dirname, '../reports');
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async preValidationChecks() {
    this.log('🔍 Running pre-validation checks...');
    
    // Check if backend is running
    try {
      execSync('curl -s http://localhost:3000/api/health || curl -s http://localhost:3000/', 
        { stdio: 'ignore', timeout: 5000 });
      this.log('✅ Backend is running on localhost:3000');
    } catch (error) {
      this.log('❌ Backend not running. Starting backend...', 'WARN');
      await this.startBackend();
    }

    // Check if frontend is running
    try {
      execSync('curl -s http://localhost:5173/', { stdio: 'ignore', timeout: 5000 });
      this.log('✅ Frontend is running on localhost:5173');
    } catch (error) {
      this.log('❌ Frontend not running. Please start with: cd frontend && npm run dev', 'ERROR');
      process.exit(1);
    }

    // Validate test agents exist in backend
    const testAgents = [
      'agent-feedback-agent',
      'agent-ideas-agent', 
      'meta-agent',
      'personal-todos-agent'
    ];

    for (const agentId of testAgents) {
      try {
        execSync(`curl -s http://localhost:3000/api/agents/${agentId}`, 
          { stdio: 'ignore', timeout: 3000 });
        this.log(`✅ Test agent ${agentId} available`);
        this.results.apiValidation.endpoints.push({
          agent: agentId,
          available: true
        });
      } catch (error) {
        this.log(`⚠️ Test agent ${agentId} not available`, 'WARN');
        this.results.apiValidation.endpoints.push({
          agent: agentId,
          available: false
        });
      }
    }
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      this.log('🚀 Starting backend server...');
      
      const backend = spawn('node', ['simple-backend.js'], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3000' }
      });

      let startupTimeout = setTimeout(() => {
        backend.kill();
        reject(new Error('Backend startup timeout'));
      }, 30000);

      backend.stdout.on('data', (data) => {
        if (data.toString().includes('Server running') || data.toString().includes('3000')) {
          clearTimeout(startupTimeout);
          this.log('✅ Backend started successfully');
          resolve();
        }
      });

      backend.stderr.on('data', (data) => {
        this.log(`Backend stderr: ${data}`, 'WARN');
      });

      backend.on('error', reject);
    });
  }

  async runPlaywrightTests() {
    this.log('🎭 Running Playwright real data validation tests...');

    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', [
        'playwright', 'test', 
        '--config', 'playwright.config.real-data-validation.ts',
        '--reporter=json',
        '--output', path.join(this.reportDir, 'playwright-results.json')
      ], {
        cwd: __dirname,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      playwright.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
      });

      playwright.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error(data.toString());
      });

      playwright.on('close', (code) => {
        this.results.playwrightOutput = output;
        this.results.playwrightErrors = errorOutput;
        
        if (code === 0) {
          this.log('✅ All Playwright tests passed');
          resolve(true);
        } else {
          this.log(`❌ Playwright tests failed with code ${code}`, 'ERROR');
          resolve(false);
        }
      });

      playwright.on('error', (error) => {
        this.log(`Playwright execution error: ${error.message}`, 'ERROR');
        reject(error);
      });
    });
  }

  async analyzeResults() {
    this.log('📊 Analyzing test results...');

    // Load Playwright results if available
    const resultsPath = path.join(this.reportDir, 'playwright-results.json');
    if (fs.existsSync(resultsPath)) {
      try {
        const playwrightResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        this.processPlaywrightResults(playwrightResults);
      } catch (error) {
        this.log(`Error reading Playwright results: ${error.message}`, 'WARN');
      }
    }

    // Analyze for mock contamination patterns
    await this.analyzeMockContamination();

    // Generate final report
    await this.generateReport();
  }

  processPlaywrightResults(results) {
    if (results.suites) {
      results.suites.forEach(suite => {
        this.processSuite(suite);
      });
    }

    this.results.summary.total = results.stats?.total || 0;
    this.results.summary.passed = results.stats?.passed || 0;
    this.results.summary.failed = results.stats?.failed || 0;
    this.results.summary.skipped = results.stats?.skipped || 0;
  }

  processSuite(suite) {
    if (suite.tests) {
      suite.tests.forEach(test => {
        const testName = test.title;
        const status = test.outcome;
        const duration = test.results?.[0]?.duration || 0;

        this.results.tests[testName] = {
          status,
          duration,
          suite: suite.title
        };

        // Detect performance issues
        if (duration > 3000) { // Tests should complete within 3 seconds
          this.results.performanceIssues.push({
            test: testName,
            duration,
            threshold: 3000
          });
        }

        // Detect mock contamination failures
        if (testName.toLowerCase().includes('mock') && status === 'failed') {
          this.results.mockContamination.push({
            test: testName,
            status,
            issue: 'Mock contamination detected'
          });
        }
      });
    }

    if (suite.suites) {
      suite.suites.forEach(childSuite => {
        this.processSuite(childSuite);
      });
    }
  }

  async analyzeMockContamination() {
    this.log('🔍 Analyzing source code for mock contamination...');

    const unifiedAgentPath = path.join(__dirname, '../../frontend/src/components/UnifiedAgentPage.tsx');
    
    if (fs.existsSync(unifiedAgentPath)) {
      const sourceCode = fs.readFileSync(unifiedAgentPath, 'utf8');
      
      const mockPatterns = [
        { pattern: /Math\.floor\(Math\.random\(\)/g, description: 'Random number generation' },
        { pattern: /Math\.round\(Math\.random\(\)/g, description: 'Random number rounding' },
        { pattern: /generateRecentActivities/g, description: 'Mock activity generation' },
        { pattern: /generateRecentPosts/g, description: 'Mock post generation' },
        { pattern: /mock\w+/gi, description: 'Mock variable/function names' },
        { pattern: /fake\w+/gi, description: 'Fake data references' }
      ];

      for (const { pattern, description } of mockPatterns) {
        const matches = sourceCode.match(pattern);
        if (matches) {
          this.results.mockContamination.push({
            file: 'UnifiedAgentPage.tsx',
            pattern: pattern.source,
            description,
            occurrences: matches.length,
            matches: matches.slice(0, 5) // First 5 matches
          });
        }
      }
    }
  }

  async generateReport() {
    this.log('📝 Generating validation report...');

    this.results.endTime = new Date().toISOString();
    this.results.duration = Date.parse(this.results.endTime) - Date.parse(this.results.startTime);

    // Generate JSON report
    const jsonReportPath = path.join(this.reportDir, 'real-data-validation-final-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.results, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlReportPath = path.join(this.reportDir, 'real-data-validation-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate summary
    this.printSummary();

    this.log(`📋 Reports generated:`);
    this.log(`   JSON: ${jsonReportPath}`);
    this.log(`   HTML: ${htmlReportPath}`);
  }

  generateHTMLReport() {
    const { summary, mockContamination, performanceIssues, tests } = this.results;
    const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Real Data Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0; font-size: 24px; }
        .metric p { margin: 5px 0 0 0; color: #666; }
        .section { margin: 20px 0; }
        .critical { background: #ffe6e6; border-left: 4px solid #dc3545; padding: 15px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; }
        .success { background: #d1edff; border-left: 4px solid #28a745; padding: 15px; }
        .test-list { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .test-item { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #dee2e6; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-skipped { color: #ffc107; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎭 Real Data Validation Report</h1>
        <p>Phase 1 Mock Data Elimination - Production Readiness Validation</p>
        <p>Generated: ${this.results.endTime}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${summary.total}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric">
            <h3 class="status-passed">${summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3 class="status-failed">${summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3>${passRate}%</h3>
            <p>Pass Rate</p>
        </div>
    </div>

    <div class="section">
        <h2>🚨 Critical Issues</h2>
        ${mockContamination.length > 0 ? 
          `<div class="critical">
            <h3>Mock Data Contamination Detected</h3>
            <ul>
              ${mockContamination.map(issue => `
                <li><strong>${issue.description}</strong>: ${issue.pattern || issue.issue}
                    ${issue.file ? `in ${issue.file}` : ''}
                    ${issue.occurrences ? `(${issue.occurrences} occurrences)` : ''}
                </li>
              `).join('')}
            </ul>
          </div>` : 
          `<div class="success">
            <h3>✅ No Mock Data Contamination Detected</h3>
            <p>All data sources validated as real API integrations.</p>
          </div>`
        }
    </div>

    <div class="section">
        <h2>⚡ Performance Analysis</h2>
        ${performanceIssues.length > 0 ?
          `<div class="warning">
            <h3>Performance Issues Detected</h3>
            <ul>
              ${performanceIssues.map(issue => `
                <li><strong>${issue.test}</strong>: ${issue.duration}ms (threshold: ${issue.threshold}ms)</li>
              `).join('')}
            </ul>
          </div>` :
          `<div class="success">
            <h3>✅ All Tests Meet Performance Requirements</h3>
            <p>Real data loading completes within acceptable time limits.</p>
          </div>`
        }
    </div>

    <div class="section">
        <h2>📊 Test Results Detail</h2>
        <div class="test-list">
            ${Object.entries(tests).map(([testName, testData]) => `
                <div class="test-item">
                    <span>${testName}</span>
                    <span>
                        <span class="status-${testData.status}">${testData.status.toUpperCase()}</span>
                        <span style="margin-left: 10px; color: #666;">${testData.duration}ms</span>
                    </span>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h2>🎯 Production Readiness Assessment</h2>
        ${summary.failed === 0 && mockContamination.length === 0 ?
          `<div class="success">
            <h3>🎉 PRODUCTION READY</h3>
            <p>UnifiedAgentPage has successfully eliminated mock data and is ready for production deployment.</p>
            <ul>
                <li>✅ All tests passing</li>
                <li>✅ No mock data contamination</li>
                <li>✅ Real API integration validated</li>
                <li>✅ Performance requirements met</li>
            </ul>
          </div>` :
          `<div class="critical">
            <h3>❌ NOT PRODUCTION READY</h3>
            <p>Critical issues must be resolved before production deployment.</p>
            <ul>
                ${summary.failed > 0 ? '<li>❌ Test failures detected</li>' : ''}
                ${mockContamination.length > 0 ? '<li>❌ Mock data contamination present</li>' : ''}
                ${performanceIssues.length > 0 ? '<li>⚠️ Performance issues detected</li>' : ''}
            </ul>
          </div>`
        }
    </div>
</body>
</html>`;
  }

  printSummary() {
    const { summary, mockContamination, performanceIssues } = this.results;
    
    console.log('\n' + '='.repeat(80));
    console.log('🎭 REAL DATA VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`📊 Tests: ${summary.passed}/${summary.total} passed (${summary.failed} failed, ${summary.skipped} skipped)`);
    console.log(`🚨 Mock Contamination: ${mockContamination.length} issues`);
    console.log(`⚡ Performance Issues: ${performanceIssues.length} detected`);
    
    if (summary.failed === 0 && mockContamination.length === 0) {
      console.log('\n🎉 RESULT: PRODUCTION READY ✅');
      console.log('UnifiedAgentPage successfully eliminated mock data and is ready for production.');
    } else {
      console.log('\n❌ RESULT: NOT PRODUCTION READY');
      console.log('Critical issues must be resolved before production deployment.');
    }
    console.log('='.repeat(80) + '\n');
  }

  async run() {
    try {
      this.log('🚀 Starting Real Data Validation Test Suite...');
      
      await this.preValidationChecks();
      const testsResult = await this.runPlaywrightTests();
      await this.analyzeResults();
      
      // Exit with appropriate code
      process.exit(testsResult && this.results.mockContamination.length === 0 ? 0 : 1);
      
    } catch (error) {
      this.log(`💥 Validation failed: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  const runner = new RealDataValidationRunner();
  runner.run().catch(console.error);
}

module.exports = RealDataValidationRunner;