#!/usr/bin/env node

/**
 * Playwright MCP Validation Test Runner
 * Orchestrates comprehensive UI/UX testing with proper coordination
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PlaywrightMCPRunner {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      suites: {},
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      artifacts: {
        screenshots: [],
        videos: [],
        reports: []
      }
    };
  }

  async runHook(hookType, description, data = {}) {
    try {
      const command = `npx claude-flow@alpha hooks ${hookType} --description "${description}"`;
      console.log(`🔗 Running hook: ${hookType}`);

      return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.log(`⚠️  Hook ${hookType} failed: ${error.message}`);
          } else {
            console.log(`✅ Hook ${hookType} completed`);
          }
          resolve();
        });
      });
    } catch (error) {
      console.log(`❌ Hook execution failed: ${error.message}`);
    }
  }

  async storeInMemory(key, data) {
    try {
      const command = `npx claude-flow@alpha hooks post-edit --memory-key "${key}"`;
      console.log(`💾 Storing data in memory: ${key}`);

      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️  Memory storage failed: ${error.message}`);
        } else {
          console.log(`✅ Data stored in memory: ${key}`);
        }
      });
    } catch (error) {
      console.log(`❌ Memory storage failed: ${error.message}`);
    }
  }

  async ensureDirectories() {
    const dirs = [
      'test-results',
      'test-results/broken-state',
      'test-results/navigation',
      'test-results/visual-regression',
      'test-results/accessibility',
      'test-results/performance',
      'playwright-report'
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async runTestSuite(suiteName, specFile) {
    console.log(`\\n🧪 Running test suite: ${suiteName}`);

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', 'test', specFile, '--reporter=json'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      playwright.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      playwright.stderr.on('data', (data) => {
        stderr += data.toString();
        // Log stderr in real-time for debugging
        console.log(data.toString());
      });

      playwright.on('close', (code) => {
        const duration = Date.now() - startTime;

        try {
          // Try to parse JSON output
          let results = null;
          if (stdout.trim()) {
            const jsonStart = stdout.indexOf('{');
            if (jsonStart !== -1) {
              results = JSON.parse(stdout.substring(jsonStart));
            }
          }

          this.testResults.suites[suiteName] = {
            exitCode: code,
            duration,
            results,
            stderr: stderr.slice(-1000) // Keep last 1000 chars of stderr
          };

          if (results) {
            this.testResults.summary.totalTests += results.stats?.total || 0;
            this.testResults.summary.passed += results.stats?.expected || 0;
            this.testResults.summary.failed += results.stats?.unexpected || 0;
            this.testResults.summary.skipped += results.stats?.skipped || 0;
          }

          console.log(`${code === 0 ? '✅' : '❌'} Suite ${suiteName} completed (${duration}ms)`);
          resolve({ success: code === 0, duration, results });

        } catch (error) {
          console.log(`⚠️  Could not parse results for ${suiteName}: ${error.message}`);
          this.testResults.suites[suiteName] = {
            exitCode: code,
            duration,
            error: error.message,
            stderr: stderr.slice(-1000)
          };
          resolve({ success: code === 0, duration, error: error.message });
        }
      });

      playwright.on('error', (error) => {
        console.log(`❌ Failed to start ${suiteName}: ${error.message}`);
        reject(error);
      });
    });
  }

  async generateFinalReport() {
    console.log('\\n📊 Generating final validation report...');

    this.testResults.summary.duration = Object.values(this.testResults.suites)
      .reduce((total, suite) => total + (suite.duration || 0), 0);

    // Collect artifact information
    const artifactDirs = [
      'test-results/broken-state',
      'test-results/navigation',
      'test-results/visual-regression',
      'test-results/accessibility',
      'test-results/performance'
    ];

    artifactDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const ext = path.extname(file).toLowerCase();

          if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            this.testResults.artifacts.screenshots.push(filePath);
          } else if (['.webm', '.mp4'].includes(ext)) {
            this.testResults.artifacts.videos.push(filePath);
          } else if (['.html', '.json'].includes(ext)) {
            this.testResults.artifacts.reports.push(filePath);
          }
        });
      }
    });

    // Generate comprehensive report
    const finalReport = {
      ...this.testResults,
      analysis: {
        successRate: this.testResults.summary.totalTests > 0
          ? (this.testResults.summary.passed / this.testResults.summary.totalTests * 100).toFixed(1)
          : 0,
        averageTestDuration: this.testResults.summary.totalTests > 0
          ? (this.testResults.summary.duration / this.testResults.summary.totalTests).toFixed(0)
          : 0,
        criticalIssues: [],
        recommendations: []
      }
    };

    // Add analysis based on results
    if (this.testResults.summary.failed > 0) {
      finalReport.analysis.criticalIssues.push('Test failures detected - review individual suite results');
    }

    if (this.testResults.artifacts.screenshots.length > 10) {
      finalReport.analysis.recommendations.push('High number of screenshots captured - may indicate visual issues');
    }

    // Save final report
    fs.writeFileSync(
      'test-results/playwright-mcp-validation-report.json',
      JSON.stringify(finalReport, null, 2)
    );

    // Store in memory for coordination
    await this.storeInMemory('swarm/playwright/final-validation-report', finalReport);

    console.log('📋 Final Report Summary:');
    console.log(`   Total Tests: ${finalReport.summary.totalTests}`);
    console.log(`   Passed: ${finalReport.summary.passed}`);
    console.log(`   Failed: ${finalReport.summary.failed}`);
    console.log(`   Success Rate: ${finalReport.analysis.successRate}%`);
    console.log(`   Duration: ${(finalReport.summary.duration / 1000).toFixed(1)}s`);
    console.log(`   Screenshots: ${finalReport.artifacts.screenshots.length}`);
    console.log(`   Reports: ${finalReport.artifacts.reports.length}`);

    return finalReport;
  }

  async run() {
    console.log('🚀 Starting Playwright MCP Validation Suite');

    // Pre-task hook
    await this.runHook('pre-task', 'Starting Playwright MCP UI/UX validation');

    // Ensure directories exist
    await this.ensureDirectories();

    // Test suites to run
    const testSuites = [
      { name: 'UI State Capture', spec: 'specs/01-ui-state-capture.spec.ts' },
      { name: 'Navigation Validation', spec: 'specs/02-navigation-validation.spec.ts' },
      { name: 'Visual Regression', spec: 'specs/03-visual-regression.spec.ts' },
      { name: 'Accessibility Validation', spec: 'specs/04-accessibility-validation.spec.ts' },
      { name: 'Performance Validation', spec: 'specs/05-performance-validation.spec.ts' }
    ];

    // Run each test suite
    for (const suite of testSuites) {
      try {
        await this.runTestSuite(suite.name, suite.spec);
      } catch (error) {
        console.log(`❌ Suite ${suite.name} failed to execute: ${error.message}`);
      }
    }

    // Generate final report
    const finalReport = await this.generateFinalReport();

    // Post-task hook
    await this.runHook('post-task', 'Playwright MCP validation completed', finalReport);

    console.log('\\n🎯 Playwright MCP Validation Complete!');
    console.log('📊 View detailed report: test-results/playwright-mcp-validation-report.json');
    console.log('🌐 Open HTML report: npx playwright show-report');

    return finalReport;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new PlaywrightMCPRunner();
  runner.run().catch(error => {
    console.error('❌ Validation runner failed:', error);
    process.exit(1);
  });
}

module.exports = PlaywrightMCPRunner;