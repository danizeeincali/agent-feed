/**
 * Playwright E2E Test Agent
 * 
 * Specialized agent for executing end-to-end tests using Playwright
 * with cross-browser testing, visual validation, and performance monitoring.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');

class PlaywrightAgent extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.id = config.id || `playwright-${Date.now()}`;
    this.status = 'idle';
    this.capabilities = ['e2e-testing', 'cross-browser', 'visual-testing', 'performance'];
    this.currentTest = null;
    this.browsers = config.browsers || ['chromium', 'firefox', 'webkit'];
    this.headless = config.headless !== false;
    
    this.metrics = {
      testsExecuted: 0,
      testsPassed: 0,
      testsFailed: 0,
      screenshotsTaken: 0,
      averageExecutionTime: 0,
      browserCoverage: {
        chromium: 0,
        firefox: 0,
        webkit: 0
      }
    };
    
    this.playwrightConfig = {
      use: {
        headless: this.headless,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure'
      },
      projects: this._generateBrowserProjects(),
      reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results.json' }],
        ['junit', { outputFile: 'test-results.xml' }]
      ],
      timeout: config.testTimeout || 30000
    };
  }

  /**
   * Initialize Playwright agent
   */
  async initialize() {
    console.log(`🎭 Initializing Playwright agent ${this.id}...`);
    
    try {
      // Validate Playwright installation
      await this._validatePlaywrightInstallation();
      
      // Install browsers if needed
      await this._ensureBrowsersInstalled();
      
      // Set up test environment
      await this._setupTestEnvironment();
      
      // Initialize visual testing
      await this._setupVisualTesting();
      
      // Set up performance monitoring
      await this._setupPerformanceMonitoring();
      
      this.status = 'ready';
      console.log(`✅ Playwright agent ${this.id} initialized with browsers: ${this.browsers.join(', ')}`);
      this.emit('ready');
      
    } catch (error) {
      this.status = 'error';
      console.error(`❌ Failed to initialize Playwright agent ${this.id}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute E2E test with Playwright
   */
  async executeTest(testTask) {
    if (this.status !== 'ready') {
      throw new Error(`Playwright agent ${this.id} not ready for test execution`);
    }

    console.log(`🎬 Executing E2E test: ${testTask.testFile}`);
    this.status = 'executing';
    this.currentTest = testTask;
    
    const startTime = Date.now();
    
    try {
      // Pre-test setup
      await this._preTestSetup(testTask);
      
      // Execute test across specified browsers
      const results = await this._executeAcrossBrowsers(testTask);
      
      // Collect artifacts (screenshots, videos, traces)
      const artifacts = await this._collectArtifacts(testTask);
      
      // Analyze test results
      const analysis = await this._analyzeResults(results, artifacts);
      
      // Update metrics
      this._updateMetrics(results, Date.now() - startTime);
      
      this.status = 'ready';
      this.currentTest = null;
      
      console.log(`✅ E2E test completed: ${testTask.testFile}`);
      this.emit('test-completed', { testTask, results, analysis });
      
      return {
        success: results.every(r => r.success),
        testFile: testTask.testFile,
        results: results,
        artifacts: artifacts,
        analysis: analysis,
        duration: Date.now() - startTime,
        agent: this.id
      };
      
    } catch (error) {
      this.status = 'ready';
      this.currentTest = null;
      this.metrics.testsFailed++;
      
      console.error(`❌ E2E test failed: ${testTask.testFile}`, error);
      this.emit('test-failed', { testTask, error });
      
      throw error;
    }
  }

  /**
   * Validate Playwright installation
   */
  async _validatePlaywrightInstallation() {
    console.log('🔍 Validating Playwright installation...');
    
    return new Promise((resolve, reject) => {
      const playwrightProcess = spawn('npx', ['playwright', '--version'], {
        stdio: 'pipe'
      });
      
      let output = '';
      playwrightProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      playwrightProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Playwright version: ${output.trim()}`);
          resolve(output.trim());
        } else {
          reject(new Error('Playwright not found or not properly installed'));
        }
      });
      
      playwrightProcess.on('error', reject);
    });
  }

  /**
   * Ensure browsers are installed
   */
  async _ensureBrowsersInstalled() {
    console.log('🌐 Ensuring browsers are installed...');
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn('npx', ['playwright', 'install'], {
        stdio: 'inherit'
      });
      
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Browsers installed successfully');
          resolve();
        } else {
          reject(new Error('Failed to install browsers'));
        }
      });
      
      installProcess.on('error', reject);
    });
  }

  /**
   * Set up test environment
   */
  async _setupTestEnvironment() {
    console.log('🔧 Setting up Playwright test environment...');
    
    // Create output directories
    await fs.mkdir(path.join(process.cwd(), 'playwright-report'), { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'test-results'), { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'screenshots'), { recursive: true });
    await fs.mkdir(path.join(process.cwd(), 'videos'), { recursive: true });
    
    // Set up global test helpers
    this.testHelpers = {
      takeScreenshot: async (page, name) => {
        const screenshotPath = path.join(process.cwd(), 'screenshots', `${name}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        this.metrics.screenshotsTaken++;
        return screenshotPath;
      },
      
      waitForNetworkIdle: async (page, timeout = 5000) => {
        await page.waitForLoadState('networkidle', { timeout });
      },
      
      measurePerformance: async (page) => {
        const performanceMetrics = await page.evaluate(() => {
          const perfData = performance.getEntriesByType('navigation')[0];
          return {
            loadTime: perfData.loadEventEnd - perfData.navigationStart,
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
            firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
          };
        });
        return performanceMetrics;
      }
    };
  }

  /**
   * Set up visual testing capabilities
   */
  async _setupVisualTesting() {
    console.log('👁️ Setting up visual testing...');
    
    this.visualTesting = {
      enabled: this.config.visualTesting !== false,
      threshold: this.config.visualThreshold || 0.3,
      screenshotOptions: {
        mode: 'fullPage',
        animations: 'disabled',
        caret: 'hide'
      }
    };
  }

  /**
   * Set up performance monitoring
   */
  async _setupPerformanceMonitoring() {
    console.log('📊 Setting up performance monitoring...');
    
    this.performanceMonitoring = {
      enabled: this.config.performanceMonitoring !== false,
      metrics: ['FCP', 'LCP', 'CLS', 'FID', 'TTFB'],
      thresholds: {
        FCP: 1800, // First Contentful Paint
        LCP: 2500, // Largest Contentful Paint
        CLS: 0.1,  // Cumulative Layout Shift
        FID: 100,  // First Input Delay
        TTFB: 600  // Time to First Byte
      }
    };
  }

  /**
   * Generate browser projects configuration
   */
  _generateBrowserProjects() {
    return this.browsers.map(browser => ({
      name: browser,
      use: {
        ...this.playwrightConfig.use,
        browserName: browser,
        channel: browser === 'chromium' ? 'chrome' : undefined
      }
    }));
  }

  /**
   * Pre-test setup
   */
  async _preTestSetup(testTask) {
    console.log('🔧 Pre-test setup...');
    
    // Create test-specific configuration
    const testConfig = {
      ...this.playwrightConfig,
      testMatch: [testTask.testFile],
      outputDir: path.join(process.cwd(), 'test-results', 'playwright', this.id),
      reporter: [
        ...this.playwrightConfig.reporter,
        ['json', { 
          outputFile: path.join(process.cwd(), 'test-results', `${this.id}-${Date.now()}.json`) 
        }]
      ]
    };
    
    // Write temporary Playwright config
    const configPath = path.join(process.cwd(), `playwright.config.${this.id}.js`);
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(testConfig, null, 2)}`);
    
    this.tempConfigPath = configPath;
  }

  /**
   * Execute test across multiple browsers
   */
  async _executeAcrossBrowsers(testTask) {
    console.log('🌐 Executing test across browsers...');
    
    const results = [];
    
    for (const browser of this.browsers) {
      console.log(`🎭 Running test on ${browser}...`);
      
      try {
        const browserResult = await this._executeOnBrowser(testTask, browser);
        results.push({
          browser: browser,
          success: true,
          result: browserResult
        });
        
        this.metrics.browserCoverage[browser]++;
        
      } catch (error) {
        console.error(`❌ Test failed on ${browser}:`, error);
        results.push({
          browser: browser,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Execute test on specific browser
   */
  async _executeOnBrowser(testTask, browser) {
    return new Promise((resolve, reject) => {
      const playwrightArgs = [
        'playwright', 
        'test',
        '--config', this.tempConfigPath,
        '--project', browser,
        testTask.testFile,
        '--reporter=json'
      ];
      
      if (this.headless) {
        playwrightArgs.push('--headed');
      }
      
      console.log(`Running: npx ${playwrightArgs.join(' ')}`);
      
      const playwrightProcess = spawn('npx', playwrightArgs, {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: {
          ...process.env,
          BROWSER: browser,
          PLAYWRIGHT_AGENT: this.id
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      playwrightProcess.on('close', async (code) => {
        try {
          const result = {
            success: code === 0,
            exitCode: code,
            stdout: stdout,
            stderr: stderr,
            browser: browser,
            performance: await this._extractPerformanceMetrics(stdout),
            visualDiffs: await this._extractVisualDiffs(stdout),
            testDetails: this._parseTestDetails(stdout)
          };
          
          resolve(result);
          
        } catch (error) {
          reject(error);
        }
      });
      
      playwrightProcess.on('error', reject);
      
      // Set timeout
      setTimeout(() => {
        if (!playwrightProcess.killed) {
          playwrightProcess.kill('SIGTERM');
          reject(new Error(`Test execution timed out on ${browser} after ${testTask.timeout || 30000}ms`));
        }
      }, testTask.timeout || 30000);
    });
  }

  /**
   * Collect test artifacts
   */
  async _collectArtifacts(testTask) {
    console.log('📦 Collecting test artifacts...');
    
    const artifacts = {
      screenshots: [],
      videos: [],
      traces: [],
      reports: []
    };
    
    try {
      // Collect screenshots
      const screenshotsDir = path.join(process.cwd(), 'test-results', 'playwright', this.id);
      const screenshots = await this._findFiles(screenshotsDir, '.png');
      artifacts.screenshots = screenshots;
      
      // Collect videos  
      const videos = await this._findFiles(screenshotsDir, '.webm');
      artifacts.videos = videos;
      
      // Collect traces
      const traces = await this._findFiles(screenshotsDir, '.zip');
      artifacts.traces = traces;
      
      // Collect HTML reports
      const reportDir = path.join(process.cwd(), 'playwright-report');
      if (await this._fileExists(path.join(reportDir, 'index.html'))) {
        artifacts.reports.push(path.join(reportDir, 'index.html'));
      }
      
    } catch (error) {
      console.warn('⚠️ Warning: Could not collect some artifacts:', error.message);
    }
    
    return artifacts;
  }

  /**
   * Analyze test results
   */
  async _analyzeResults(results, artifacts) {
    console.log('🔍 Analyzing test results...');
    
    const analysis = {
      crossBrowserCompatibility: this._analyzeCrossBrowserCompatibility(results),
      performanceAnalysis: this._analyzePerformance(results),
      visualAnalysis: this._analyzeVisualDifferences(results),
      reliabilityAnalysis: this._analyzeReliability(results),
      recommendations: []
    };
    
    // Generate recommendations based on analysis
    analysis.recommendations = this._generateRecommendations(analysis);
    
    return analysis;
  }

  /**
   * Extract performance metrics from test output
   */
  async _extractPerformanceMetrics(stdout) {
    // Parse performance metrics from Playwright output
    const metrics = {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0
    };
    
    // Look for performance data in output
    const performanceMatch = stdout.match(/Performance: (\{.*\})/);
    if (performanceMatch) {
      try {
        const performanceData = JSON.parse(performanceMatch[1]);
        Object.assign(metrics, performanceData);
      } catch (error) {
        console.warn('Could not parse performance data');
      }
    }
    
    return metrics;
  }

  /**
   * Extract visual diffs from test output
   */
  async _extractVisualDiffs(stdout) {
    const diffs = [];
    
    // Look for visual diff information
    const diffMatches = stdout.match(/Visual diff: (.*)/g);
    if (diffMatches) {
      for (const match of diffMatches) {
        const diffPath = match.replace('Visual diff: ', '');
        diffs.push({
          path: diffPath,
          threshold: this.visualTesting.threshold
        });
      }
    }
    
    return diffs;
  }

  /**
   * Parse test details from output
   */
  _parseTestDetails(stdout) {
    const details = {
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    
    // Parse test summary
    const summaryMatch = stdout.match(/(\d+) passed.*?(\d+) failed.*?(\d+) skipped/);
    if (summaryMatch) {
      details.passed = parseInt(summaryMatch[1]) || 0;
      details.failed = parseInt(summaryMatch[2]) || 0;
      details.skipped = parseInt(summaryMatch[3]) || 0;
      details.tests = details.passed + details.failed + details.skipped;
    }
    
    return details;
  }

  /**
   * Analyze cross-browser compatibility
   */
  _analyzeCrossBrowserCompatibility(results) {
    const compatibility = {
      score: 0,
      issues: [],
      browserSupport: {}
    };
    
    const successfulBrowsers = results.filter(r => r.success).map(r => r.browser);
    const failedBrowsers = results.filter(r => !r.success).map(r => r.browser);
    
    compatibility.score = (successfulBrowsers.length / results.length) * 100;
    
    for (const browser of failedBrowsers) {
      compatibility.issues.push({
        browser: browser,
        type: 'execution-failure',
        severity: 'high'
      });
    }
    
    for (const browser of this.browsers) {
      compatibility.browserSupport[browser] = successfulBrowsers.includes(browser);
    }
    
    return compatibility;
  }

  /**
   * Analyze performance across browsers
   */
  _analyzePerformance(results) {
    const performanceAnalysis = {
      averageLoadTime: 0,
      performanceScore: 0,
      browserPerformance: {},
      issues: []
    };
    
    const loadTimes = [];
    
    for (const result of results) {
      if (result.success && result.result.performance) {
        const perf = result.result.performance;
        loadTimes.push(perf.loadTime);
        
        performanceAnalysis.browserPerformance[result.browser] = {
          loadTime: perf.loadTime,
          firstContentfulPaint: perf.firstContentfulPaint,
          score: this._calculatePerformanceScore(perf)
        };
      }
    }
    
    if (loadTimes.length > 0) {
      performanceAnalysis.averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    }
    
    return performanceAnalysis;
  }

  /**
   * Analyze visual differences
   */
  _analyzeVisualDifferences(results) {
    const visualAnalysis = {
      differencesFound: 0,
      consistencyScore: 100,
      issues: []
    };
    
    for (const result of results) {
      if (result.success && result.result.visualDiffs) {
        visualAnalysis.differencesFound += result.result.visualDiffs.length;
        
        for (const diff of result.result.visualDiffs) {
          visualAnalysis.issues.push({
            browser: result.browser,
            path: diff.path,
            type: 'visual-difference'
          });
        }
      }
    }
    
    if (visualAnalysis.differencesFound > 0) {
      visualAnalysis.consistencyScore = Math.max(0, 100 - (visualAnalysis.differencesFound * 10));
    }
    
    return visualAnalysis;
  }

  /**
   * Analyze test reliability
   */
  _analyzeReliability(results) {
    const reliability = {
      consistencyScore: 0,
      flakinessIndicators: [],
      stabilityMetrics: {}
    };
    
    const successCount = results.filter(r => r.success).length;
    reliability.consistencyScore = (successCount / results.length) * 100;
    
    // Check for flakiness indicators
    if (successCount > 0 && successCount < results.length) {
      reliability.flakinessIndicators.push('Inconsistent results across browsers');
    }
    
    return reliability;
  }

  /**
   * Generate recommendations
   */
  _generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.crossBrowserCompatibility.score < 100) {
      recommendations.push({
        type: 'cross-browser',
        message: 'Address cross-browser compatibility issues',
        priority: 'high'
      });
    }
    
    if (analysis.performanceAnalysis.averageLoadTime > 3000) {
      recommendations.push({
        type: 'performance',
        message: 'Optimize page load performance',
        priority: 'medium'
      });
    }
    
    if (analysis.visualAnalysis.differencesFound > 0) {
      recommendations.push({
        type: 'visual',
        message: 'Review visual differences between browsers',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  // Utility methods
  async _findFiles(directory, extension) {
    try {
      const files = await fs.readdir(directory);
      return files.filter(file => file.endsWith(extension))
                  .map(file => path.join(directory, file));
    } catch (error) {
      return [];
    }
  }

  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  _calculatePerformanceScore(metrics) {
    // Simple performance scoring based on load time
    if (metrics.loadTime < 1000) return 100;
    if (metrics.loadTime < 2000) return 85;
    if (metrics.loadTime < 3000) return 70;
    if (metrics.loadTime < 5000) return 50;
    return 25;
  }

  /**
   * Update agent metrics
   */
  _updateMetrics(results, duration) {
    this.metrics.testsExecuted++;
    
    const successfulResults = results.filter(r => r.success);
    this.metrics.testsPassed += successfulResults.length;
    this.metrics.testsFailed += results.filter(r => !r.success).length;
    
    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.testsExecuted - 1) + duration) / 
      this.metrics.testsExecuted;
  }

  /**
   * Cleanup temporary files
   */
  async _cleanupTempFiles() {
    try {
      if (this.tempConfigPath) {
        await fs.unlink(this.tempConfigPath);
      }
    } catch (error) {
      console.warn('Warning: Could not cleanup temp files:', error.message);
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      id: this.id,
      status: this.status,
      currentTest: this.currentTest,
      capabilities: this.capabilities,
      browsers: this.browsers,
      metrics: this.metrics
    };
  }

  /**
   * Shutdown agent
   */
  async shutdown() {
    console.log(`🔄 Shutting down Playwright agent ${this.id}...`);
    
    try {
      // Cleanup temporary files
      await this._cleanupTempFiles();
      
      this.status = 'shutdown';
      console.log(`✅ Playwright agent ${this.id} shutdown completed`);
      
    } catch (error) {
      console.error(`❌ Error during Playwright agent ${this.id} shutdown:`, error);
      throw error;
    }
  }
}

module.exports = PlaywrightAgent;