#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MCPValidationRunner {
  constructor() {
    this.baseDir = '/workspaces/agent-feed/tests/playwright/mcp-validation';
    this.reportsDir = path.join(this.baseDir, 'reports');
    this.screenshotsDir = path.join(this.baseDir, 'screenshots');
  }

  async setupDirectories() {
    const dirs = [this.reportsDir, this.screenshotsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  async checkServer() {
    console.log('🔍 Checking if development server is running...');

    try {
      const response = await fetch('http://localhost:5173/agents');
      if (response.ok) {
        console.log('✅ Development server is running');
        return true;
      }
    } catch (error) {
      console.log('❌ Development server not accessible');
      return false;
    }

    return false;
  }

  async startServer() {
    console.log('🚀 Starting development server...');

    return new Promise((resolve, reject) => {
      const server = spawn('npm', ['run', 'dev'], {
        cwd: '/workspaces/agent-feed',
        stdio: 'pipe'
      });

      let serverStarted = false;

      server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        if (output.includes('localhost:5173') && !serverStarted) {
          serverStarted = true;
          setTimeout(() => resolve(server), 3000); // Wait 3 seconds for full startup
        }
      });

      server.stderr.on('data', (data) => {
        console.error(data.toString());
      });

      server.on('error', (error) => {
        reject(error);
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!serverStarted) {
          server.kill();
          reject(new Error('Server startup timeout'));
        }
      }, 60000);
    });
  }

  async runTests() {
    console.log('🧪 Running Playwright MCP validation tests...');

    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', 'test', '--config',
        path.join(this.baseDir, 'playwright.config.js')], {
        cwd: this.baseDir,
        stdio: 'inherit'
      });

      playwright.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      playwright.on('error', (error) => {
        reject(error);
      });
    });
  }

  async generateSummaryReport() {
    console.log('📊 Generating summary report...');

    const reportsDir = this.reportsDir;
    const reports = fs.readdirSync(reportsDir)
      .filter(file => file.startsWith('validation-report-') && file.endsWith('.json'))
      .map(file => {
        const content = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'));
        return { file, ...content };
      });

    if (reports.length === 0) {
      console.log('❌ No validation reports found');
      return;
    }

    const latestReport = reports.sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    )[0];

    const summary = {
      timestamp: new Date().toISOString(),
      url: latestReport.url,
      totalTests: latestReport.summary.total,
      passed: latestReport.summary.passed,
      failed: latestReport.summary.failed,
      warnings: latestReport.summary.warnings,
      successRate: `${((latestReport.summary.passed / latestReport.summary.total) * 100).toFixed(1)}%`,
      screenshots: latestReport.screenshots.length,
      consoleErrors: latestReport.consoleErrors.length,
      networkRequests: latestReport.networkRequests.length,
      performance: latestReport.performance,
      criticalIssues: latestReport.tests.filter(test => test.status === 'failed'),
      warnings: latestReport.tests.filter(test => test.status === 'warning'),
      allTests: latestReport.tests
    };

    const summaryPath = path.join(reportsDir, 'validation-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE UI/UX VALIDATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`📅 Timestamp: ${summary.timestamp}`);
    console.log(`🌐 URL Tested: ${summary.url}`);
    console.log(`📊 Tests: ${summary.totalTests} total (${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings)`);
    console.log(`✅ Success Rate: ${summary.successRate}`);
    console.log(`📸 Screenshots: ${summary.screenshots}`);
    console.log(`❌ Console Errors: ${summary.consoleErrors}`);
    console.log(`🌐 Network Requests: ${summary.networkRequests}`);

    if (summary.performance.pageLoadTime) {
      console.log(`⚡ Page Load Time: ${summary.performance.pageLoadTime}ms`);
    }

    if (summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      summary.criticalIssues.forEach(issue => {
        console.log(`   ❌ ${issue.name}: ${issue.error || 'Failed'}`);
      });
    }

    if (summary.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      summary.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning.name}: ${warning.note || 'Warning detected'}`);
      });
    }

    console.log('\n📁 Reports saved to:');
    console.log(`   📊 Summary: ${summaryPath}`);
    console.log(`   📸 Screenshots: ${this.screenshotsDir}`);
    console.log(`   📄 Detailed: ${reportsDir}`);
    console.log('='.repeat(80));

    return summary;
  }

  async run() {
    try {
      await this.setupDirectories();

      const serverRunning = await this.checkServer();
      let server = null;

      if (!serverRunning) {
        server = await this.startServer();
      }

      await this.runTests();
      const summary = await this.generateSummaryReport();

      if (server) {
        console.log('🛑 Stopping development server...');
        server.kill();
      }

      return summary;

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new MCPValidationRunner();
  runner.run().then(() => {
    console.log('✅ Validation completed successfully');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = MCPValidationRunner;