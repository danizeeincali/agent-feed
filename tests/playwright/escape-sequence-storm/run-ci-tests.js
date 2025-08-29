#!/usr/bin/env node

/**
 * CI/CD Test Runner for Escape Sequence Storm Prevention
 * 
 * Optimized for continuous integration environments with:
 * - Parallel execution
 * - Comprehensive reporting
 * - Failure analysis
 * - Performance tracking
 * - Integration with common CI/CD platforms
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class CITestRunner {
  constructor() {
    this.startTime = Date.now();
    this.testResults = {
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      projects: {},
      failures: [],
      performance: {},
      coverage: {}
    };
    
    // Detect CI environment
    this.ciEnvironment = this.detectCIEnvironment();
    this.isCI = !!this.ciEnvironment.name;
    
    console.log(`🚀 Starting CI Test Runner (${this.ciEnvironment.name || 'Local'})`);
  }

  detectCIEnvironment() {
    const envVars = process.env;
    
    if (envVars.GITHUB_ACTIONS) {
      return {
        name: 'GitHub Actions',
        runId: envVars.GITHUB_RUN_ID,
        branch: envVars.GITHUB_REF_NAME,
        commit: envVars.GITHUB_SHA,
        repository: envVars.GITHUB_REPOSITORY
      };
    }
    
    if (envVars.GITLAB_CI) {
      return {
        name: 'GitLab CI',
        runId: envVars.CI_PIPELINE_ID,
        branch: envVars.CI_COMMIT_REF_NAME,
        commit: envVars.CI_COMMIT_SHA,
        repository: envVars.CI_PROJECT_PATH
      };
    }
    
    if (envVars.JENKINS_URL) {
      return {
        name: 'Jenkins',
        runId: envVars.BUILD_NUMBER,
        branch: envVars.GIT_BRANCH,
        commit: envVars.GIT_COMMIT,
        repository: envVars.JOB_NAME
      };
    }
    
    if (envVars.CIRCLECI) {
      return {
        name: 'CircleCI',
        runId: envVars.CIRCLE_BUILD_NUM,
        branch: envVars.CIRCLE_BRANCH,
        commit: envVars.CIRCLE_SHA1,
        repository: envVars.CIRCLE_PROJECT_REPONAME
      };
    }
    
    if (envVars.TRAVIS) {
      return {
        name: 'Travis CI',
        runId: envVars.TRAVIS_BUILD_NUMBER,
        branch: envVars.TRAVIS_BRANCH,
        commit: envVars.TRAVIS_COMMIT,
        repository: envVars.TRAVIS_REPO_SLUG
      };
    }
    
    return { name: null };
  }

  async run(options = {}) {
    const {
      projects = 'all', // Which browser projects to run
      testPattern = '**/*.spec.ts', // Test file pattern
      maxRetries = this.isCI ? 2 : 1,
      maxWorkers = this.calculateWorkers(),
      timeout = 300000, // 5 minutes per test
      outputDir = './test-results/escape-sequence-storm/ci',
      generateReport = true,
      uploadArtifacts = this.isCI,
      slackWebhook = process.env.SLACK_WEBHOOK_URL,
      emailNotification = process.env.EMAIL_NOTIFICATION
    } = options;

    try {
      // Pre-flight checks
      await this.performPreflightChecks();
      
      // Setup output directory
      await this.setupOutputDirectory(outputDir);
      
      // Run tests with Playwright
      await this.runPlaywrightTests({
        projects,
        testPattern,
        maxRetries,
        maxWorkers,
        timeout,
        outputDir
      });
      
      // Process results
      await this.processTestResults(outputDir);
      
      // Generate reports
      if (generateReport) {
        await this.generateReports(outputDir);
      }
      
      // Upload artifacts
      if (uploadArtifacts) {
        await this.uploadArtifacts(outputDir);
      }
      
      // Send notifications
      await this.sendNotifications({ slackWebhook, emailNotification });
      
      // Determine exit code
      const exitCode = this.testResults.summary.failed > 0 ? 1 : 0;
      
      // Print final summary
      this.printCISummary();
      
      return {
        success: exitCode === 0,
        results: this.testResults,
        exitCode
      };
      
    } catch (error) {
      console.error('❌ CI Test Runner failed:', error);
      
      // Send failure notification
      await this.sendFailureNotification(error, { slackWebhook, emailNotification });
      
      throw error;
    }
  }

  calculateWorkers() {
    const cpuCount = os.cpus().length;
    
    if (this.isCI) {
      // CI environments often have limited resources
      return Math.min(4, Math.max(2, Math.floor(cpuCount * 0.8)));
    } else {
      // Local development
      return Math.min(6, Math.max(2, Math.floor(cpuCount * 0.75)));
    }
  }

  async performPreflightChecks() {
    console.log('🔍 Performing pre-flight checks...');
    
    const checks = [
      this.checkNodeVersion(),
      this.checkPlaywrightInstallation(),
      this.checkBrowsersInstalled(),
      this.checkTestServer(),
      this.checkSystemResources()
    ];
    
    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.error('❌ Pre-flight checks failed:');
      failures.forEach((failure, index) => {
        console.error(`   ${index + 1}. ${failure.reason}`);
      });
      throw new Error('Pre-flight checks failed');
    }
    
    console.log('✅ All pre-flight checks passed');
  }

  async checkNodeVersion() {
    const version = process.version;
    const majorVersion = parseInt(version.substring(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`Node.js version ${version} is not supported. Minimum required: 16.x`);
    }
  }

  async checkPlaywrightInstallation() {
    try {
      const { stdout } = await this.execCommand('npx playwright --version');
      console.log(`   Playwright version: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('Playwright is not installed or not accessible');
    }
  }

  async checkBrowsersInstalled() {
    try {
      const { stdout } = await this.execCommand('npx playwright install --dry-run');
      if (stdout.includes('needs to be installed')) {
        console.log('   Installing missing browsers...');
        await this.execCommand('npx playwright install');
      }
    } catch (error) {
      throw new Error('Failed to check or install browsers');
    }
  }

  async checkTestServer() {
    // Check if test server is accessible
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    try {
      const response = await fetch(baseURL, { 
        method: 'HEAD', 
        timeout: 5000 
      });
      
      if (!response.ok) {
        throw new Error(`Test server returned status ${response.status}`);
      }
    } catch (error) {
      if (!this.isCI) {
        console.warn(`⚠️  Test server at ${baseURL} is not accessible. It will be started automatically.`);
      } else {
        throw new Error(`Test server at ${baseURL} is not accessible in CI environment`);
      }
    }
  }

  async checkSystemResources() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    console.log(`   System Memory: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB total, ${memoryUsage.toFixed(1)}% used`);
    console.log(`   CPU Cores: ${os.cpus().length}`);
    
    if (memoryUsage > 90) {
      console.warn('⚠️  High memory usage detected. Tests may be slower.');
    }
  }

  async setupOutputDirectory(outputDir) {
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create subdirectories
    const subdirs = ['artifacts', 'reports', 'screenshots', 'videos', 'traces'];
    await Promise.all(subdirs.map(dir => 
      fs.mkdir(path.join(outputDir, dir), { recursive: true })
    ));
  }

  async runPlaywrightTests(config) {
    console.log('🎭 Running Playwright tests...');
    
    const playwrightArgs = [
      'playwright', 'test',
      '--config', path.join(__dirname, 'playwright.config.ts'),
      '--output-dir', config.outputDir,
      '--reporter', `json,html,junit`,
      '--max-failures', '10', // Stop after 10 failures
      '--workers', config.maxWorkers.toString(),
      '--retries', config.maxRetries.toString(),
      '--timeout', config.timeout.toString()
    ];
    
    // Add project filter if specified
    if (config.projects !== 'all') {
      const projectList = Array.isArray(config.projects) 
        ? config.projects.join(',') 
        : config.projects;
      playwrightArgs.push('--project', projectList);
    }
    
    // Add test pattern if specified
    if (config.testPattern !== '**/*.spec.ts') {
      playwrightArgs.push(config.testPattern);
    }
    
    // Set CI environment variables
    const env = {
      ...process.env,
      CI: 'true',
      HEADLESS: 'true',
      NODE_ENV: 'test'
    };
    
    return new Promise((resolve, reject) => {
      console.log(`   Command: npx ${playwrightArgs.join(' ')}`);
      
      const playwrightProcess = spawn('npx', playwrightArgs, {
        stdio: 'pipe',
        env,
        cwd: __dirname
      });
      
      let stdout = '';
      let stderr = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        
        // Real-time output for CI logs
        if (this.isCI || process.env.VERBOSE) {
          process.stdout.write(text);
        } else {
          // Show progress indicators
          if (text.includes('Running') || text.includes('✓') || text.includes('✗')) {
            process.stdout.write('.');
          }
        }
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });
      
      playwrightProcess.on('close', (code) => {
        console.log(`\n   Playwright exited with code ${code}`);
        
        this.testResults.summary.duration = Date.now() - this.startTime;
        
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Playwright tests failed with exit code ${code}`));
        }
      });
      
      playwrightProcess.on('error', (error) => {
        reject(new Error(`Failed to run Playwright: ${error.message}`));
      });
    });
  }

  async processTestResults(outputDir) {
    console.log('📊 Processing test results...');
    
    try {
      // Read JSON results
      const resultsPath = path.join(outputDir, 'results.json');
      const resultsData = await fs.readFile(resultsPath, 'utf8');
      const results = JSON.parse(resultsData);
      
      // Process summary
      this.testResults.summary = {
        total: results.stats.expected + results.stats.unexpected + results.stats.skipped,
        passed: results.stats.expected,
        failed: results.stats.unexpected,
        skipped: results.stats.skipped,
        duration: results.stats.duration || (Date.now() - this.startTime)
      };
      
      // Process project results
      const projects = {};
      const failures = [];
      
      results.suites.forEach(suite => {
        suite.specs.forEach(spec => {
          spec.tests.forEach(test => {
            const projectName = test.projectName;
            
            if (!projects[projectName]) {
              projects[projectName] = { passed: 0, failed: 0, skipped: 0 };
            }
            
            test.results.forEach(result => {
              if (result.status === 'passed') {
                projects[projectName].passed++;
              } else if (result.status === 'failed') {
                projects[projectName].failed++;
                failures.push({
                  test: test.title,
                  project: projectName,
                  file: spec.file,
                  error: result.error?.message || 'Unknown error',
                  duration: result.duration
                });
              } else {
                projects[projectName].skipped++;
              }
            });
          });
        });
      });
      
      this.testResults.projects = projects;
      this.testResults.failures = failures;
      
    } catch (error) {
      console.warn('⚠️  Could not parse test results:', error.message);
      // Continue with basic metrics
    }
  }

  async generateReports(outputDir) {
    console.log('📄 Generating reports...');
    
    // Generate CI-specific JSON report
    const ciReport = {
      ...this.testResults,
      metadata: {
        ciEnvironment: this.ciEnvironment,
        runTime: new Date().toISOString(),
        node: process.version,
        os: `${os.platform()} ${os.release()}`,
        arch: os.arch()
      }
    };
    
    const ciReportPath = path.join(outputDir, 'ci-report.json');
    await fs.writeFile(ciReportPath, JSON.stringify(ciReport, null, 2));
    
    // Generate failure analysis
    if (this.testResults.failures.length > 0) {
      await this.generateFailureAnalysis(outputDir);
    }
    
    // Generate performance report
    await this.generatePerformanceReport(outputDir);
    
    // Generate badge/shield data
    await this.generateBadgeData(outputDir);
  }

  async generateFailureAnalysis(outputDir) {
    const failures = this.testResults.failures;
    const analysis = {
      totalFailures: failures.length,
      failuresByProject: {},
      failuresByTest: {},
      commonErrors: {},
      recommendations: []
    };
    
    failures.forEach(failure => {
      // Group by project
      if (!analysis.failuresByProject[failure.project]) {
        analysis.failuresByProject[failure.project] = 0;
      }
      analysis.failuresByProject[failure.project]++;
      
      // Group by test name
      if (!analysis.failuresByTest[failure.test]) {
        analysis.failuresByTest[failure.test] = 0;
      }
      analysis.failuresByTest[failure.test]++;
      
      // Group by error message (simplified)
      const errorKey = failure.error.split('\n')[0].substring(0, 100);
      if (!analysis.commonErrors[errorKey]) {
        analysis.commonErrors[errorKey] = 0;
      }
      analysis.commonErrors[errorKey]++;
    });
    
    // Generate recommendations
    if (analysis.failuresByProject.webkit > analysis.failuresByProject.chromium) {
      analysis.recommendations.push('WebKit browser shows more failures - check Safari-specific issues');
    }
    
    if (Object.values(analysis.failuresByTest).some(count => count > 1)) {
      analysis.recommendations.push('Some tests are failing across multiple browsers - check test stability');
    }
    
    const analysisPath = path.join(outputDir, 'failure-analysis.json');
    await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2));
  }

  async generatePerformanceReport(outputDir) {
    const performance = {
      testDuration: this.testResults.summary.duration,
      testsPerSecond: this.testResults.summary.total / (this.testResults.summary.duration / 1000),
      averageTestDuration: this.testResults.summary.duration / this.testResults.summary.total,
      systemInfo: {
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        platform: os.platform(),
        arch: os.arch()
      }
    };
    
    const perfPath = path.join(outputDir, 'performance-report.json');
    await fs.writeFile(perfPath, JSON.stringify(performance, null, 2));
  }

  async generateBadgeData(outputDir) {
    const { passed, total } = this.testResults.summary;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    const badgeData = {
      schemaVersion: 1,
      label: 'E2E Tests',
      message: `${passed}/${total} (${successRate}%)`,
      color: successRate >= 90 ? 'brightgreen' : successRate >= 70 ? 'yellow' : 'red'
    };
    
    const badgePath = path.join(outputDir, 'badge.json');
    await fs.writeFile(badgePath, JSON.stringify(badgeData, null, 2));
  }

  async uploadArtifacts(outputDir) {
    console.log('📤 Uploading artifacts...');
    
    // GitHub Actions artifact upload
    if (this.ciEnvironment.name === 'GitHub Actions') {
      await this.uploadGitHubActionArtifacts(outputDir);
    }
    
    // Generic artifact handling (could extend for other CI systems)
    await this.copyArtifactsToStandardLocation(outputDir);
  }

  async uploadGitHubActionArtifacts(outputDir) {
    // GitHub Actions automatically uploads artifacts from certain directories
    const artifactDirs = [
      'playwright-report',
      'test-results',
      'screenshots',
      'videos',
      'traces'
    ];
    
    for (const dir of artifactDirs) {
      const sourcePath = path.join(outputDir, dir);
      const targetPath = path.join(process.cwd(), 'artifacts', dir);
      
      try {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await this.copyDirectory(sourcePath, targetPath);
      } catch (error) {
        // Directory might not exist, which is fine
      }
    }
  }

  async copyArtifactsToStandardLocation(outputDir) {
    const artifactsDir = path.join(process.cwd(), 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });
    
    // Copy essential files
    const essentialFiles = [
      'ci-report.json',
      'failure-analysis.json',
      'performance-report.json',
      'badge.json',
      'results.json',
      'results.xml'
    ];
    
    for (const file of essentialFiles) {
      const sourcePath = path.join(outputDir, file);
      const targetPath = path.join(artifactsDir, file);
      
      try {
        await fs.copyFile(sourcePath, targetPath);
      } catch (error) {
        // File might not exist, which is fine
      }
    }
  }

  async sendNotifications({ slackWebhook, emailNotification }) {
    const { passed, failed, total } = this.testResults.summary;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const success = failed === 0;
    
    // Slack notification
    if (slackWebhook) {
      await this.sendSlackNotification(slackWebhook, { success, passed, failed, total, successRate });
    }
    
    // Email notification (would need SMTP configuration)
    if (emailNotification) {
      console.log('📧 Email notification configured but not implemented in this example');
    }
  }

  async sendSlackNotification(webhookUrl, { success, passed, failed, total, successRate }) {
    try {
      const color = success ? 'good' : 'danger';
      const emoji = success ? '✅' : '❌';
      
      const message = {
        text: `${emoji} Escape Sequence Storm Tests ${success ? 'Passed' : 'Failed'}`,
        attachments: [{
          color: color,
          fields: [
            { title: 'Success Rate', value: `${successRate}%`, short: true },
            { title: 'Passed', value: passed.toString(), short: true },
            { title: 'Failed', value: failed.toString(), short: true },
            { title: 'Total', value: total.toString(), short: true },
            { title: 'Branch', value: this.ciEnvironment.branch || 'unknown', short: true },
            { title: 'Commit', value: this.ciEnvironment.commit?.substring(0, 7) || 'unknown', short: true }
          ],
          footer: `${this.ciEnvironment.name || 'Local'} | Run ${this.ciEnvironment.runId || 'N/A'}`,
          ts: Math.floor(Date.now() / 1000)
        }]
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.statusText}`);
      }
      
      console.log('📱 Slack notification sent');
    } catch (error) {
      console.warn('⚠️  Failed to send Slack notification:', error.message);
    }
  }

  async sendFailureNotification(error, { slackWebhook, emailNotification }) {
    if (slackWebhook) {
      try {
        const message = {
          text: '🚨 Test Runner Crashed',
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Error', value: error.message, short: false },
              { title: 'Branch', value: this.ciEnvironment.branch || 'unknown', short: true },
              { title: 'Run ID', value: this.ciEnvironment.runId || 'unknown', short: true }
            ]
          }]
        };
        
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
      } catch (notificationError) {
        console.warn('Failed to send failure notification:', notificationError.message);
      }
    }
  }

  printCISummary() {
    const { passed, failed, skipped, total, duration } = this.testResults.summary;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('🏁 CI TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Environment: ${this.ciEnvironment.name || 'Local'}`);
    console.log(`Duration: ${Math.round(duration / 1000 / 60)}m ${Math.round((duration / 1000) % 60)}s`);
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed} (${Math.round((passed / total) * 100)}%)`);
    console.log(`❌ Failed: ${failed} (${Math.round((failed / total) * 100)}%)`);
    console.log(`⏭️  Skipped: ${skipped} (${Math.round((skipped / total) * 100)}%)`);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    // Project breakdown
    console.log('\n📊 Project Results:');
    Object.entries(this.testResults.projects).forEach(([project, results]) => {
      const projectTotal = results.passed + results.failed + results.skipped;
      const projectSuccessRate = projectTotal > 0 ? Math.round((results.passed / projectTotal) * 100) : 0;
      console.log(`   ${project}: ${results.passed}/${projectTotal} (${projectSuccessRate}%)`);
    });
    
    if (failed > 0) {
      console.log('\n❌ Top Failures:');
      const topFailures = this.testResults.failures.slice(0, 5);
      topFailures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure.test} (${failure.project})`);
      });
      
      if (this.testResults.failures.length > 5) {
        console.log(`   ... and ${this.testResults.failures.length - 5} more`);
      }
    }
    
    console.log('='.repeat(80));
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Storm prevention is working correctly.');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Check the detailed reports for analysis.`);
    }
  }

  // Utility methods
  async execCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => stdout += data.toString());
      process.stderr.on('data', (data) => stderr += data.toString());
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed: ${command}\n${stderr}`));
        }
      });
    });
  }

  async copyDirectory(source, target) {
    await fs.mkdir(target, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(target, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--projects':
        options.projects = args[++i].split(',');
        break;
      case '--pattern':
        options.testPattern = args[++i];
        break;
      case '--retries':
        options.maxRetries = parseInt(args[++i]);
        break;
      case '--workers':
        options.maxWorkers = parseInt(args[++i]);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--slack-webhook':
        options.slackWebhook = args[++i];
        break;
      case '--no-upload':
        options.uploadArtifacts = false;
        break;
      case '--help':
        console.log(`
Usage: node run-ci-tests.js [options]

Options:
  --projects <list>     Comma-separated list of browser projects
  --pattern <pattern>   Test file pattern (default: **/*.spec.ts)
  --retries <n>         Number of retries for failed tests
  --workers <n>         Number of parallel workers
  --timeout <ms>        Test timeout in milliseconds
  --output-dir <dir>    Output directory for results
  --slack-webhook <url> Slack webhook URL for notifications
  --no-upload           Skip artifact upload
  --help               Show this help message

Environment Variables:
  TEST_BASE_URL        Base URL for tests (default: http://localhost:3000)
  SLACK_WEBHOOK_URL    Slack webhook URL for notifications
  EMAIL_NOTIFICATION   Email address for notifications

Examples:
  node run-ci-tests.js --projects chromium,firefox
  node run-ci-tests.js --pattern "**/storm-*.spec.ts" --retries 3
        `);
        process.exit(0);
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }
  
  // Run tests
  const runner = new CITestRunner();
  runner.run(options)
    .then((result) => {
      process.exit(result.exitCode);
    })
    .catch((error) => {
      console.error('💥 CI Test Runner crashed:', error);
      process.exit(1);
    });
}

module.exports = CITestRunner;