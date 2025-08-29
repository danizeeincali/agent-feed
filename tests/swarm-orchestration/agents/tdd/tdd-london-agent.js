/**
 * TDD London School Test Execution Agent
 * 
 * Specialized agent for executing Test-Driven Development tests using
 * London School methodology with comprehensive mocking and isolation.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');

class TDDLondonAgent extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.id = config.id || `tdd-london-${Date.now()}`;
    this.status = 'idle';
    this.capabilities = ['jest', 'mocking', 'isolation', 'tdd-methodology'];
    this.currentTask = null;
    this.metrics = {
      testsExecuted: 0,
      testsPassed: 0,
      testsFailed: 0,
      averageExecutionTime: 0,
      coverageAchieved: 0,
      mockingEfficiency: 0
    };
    
    this.jestConfig = {
      testEnvironment: 'node',
      clearMocks: true,
      restoreMocks: true,
      resetMocks: true,
      automock: false,
      collectCoverage: true,
      coverageReporters: ['json', 'lcov', 'text-summary'],
      testTimeout: 30000
    };
  }

  /**
   * Initialize the TDD London School agent
   */
  async initialize() {
    console.log(`🧪 Initializing TDD London School agent ${this.id}...`);
    
    try {
      // Validate Jest installation
      await this._validateJestInstallation();
      
      // Set up mock factory
      await this._setupMockFactory();
      
      // Configure test isolation environment
      await this._setupTestIsolation();
      
      // Initialize metrics collection
      this._setupMetricsCollection();
      
      this.status = 'ready';
      console.log(`✅ TDD London School agent ${this.id} initialized`);
      this.emit('ready');
      
    } catch (error) {
      this.status = 'error';
      console.error(`❌ Failed to initialize agent ${this.id}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute TDD London School test with proper isolation
   */
  async executeTest(testTask) {
    if (this.status !== 'ready') {
      throw new Error(`Agent ${this.id} not ready for test execution`);
    }

    console.log(`🎯 Executing TDD test: ${testTask.testFile}`);
    this.status = 'executing';
    this.currentTask = testTask;
    
    const startTime = Date.now();
    
    try {
      // Pre-test setup
      await this._preTestSetup(testTask);
      
      // Execute test with London School methodology
      const result = await this._executeLondonSchoolTest(testTask);
      
      // Post-test analysis
      const analysis = await this._postTestAnalysis(result);
      
      // Update metrics
      this._updateMetrics(result, Date.now() - startTime);
      
      this.status = 'ready';
      this.currentTask = null;
      
      console.log(`✅ Test completed: ${testTask.testFile}`);
      this.emit('test-completed', { testTask, result, analysis });
      
      return {
        success: result.success,
        testFile: testTask.testFile,
        result: result,
        analysis: analysis,
        duration: Date.now() - startTime,
        agent: this.id
      };
      
    } catch (error) {
      this.status = 'ready';
      this.currentTask = null;
      this.metrics.testsFailed++;
      
      console.error(`❌ Test failed: ${testTask.testFile}`, error);
      this.emit('test-failed', { testTask, error });
      
      throw error;
    }
  }

  /**
   * Validate Jest installation and configuration
   */
  async _validateJestInstallation() {
    console.log('🔍 Validating Jest installation...');
    
    return new Promise((resolve, reject) => {
      const jestProcess = spawn('npx', ['jest', '--version'], {
        stdio: 'pipe'
      });
      
      let output = '';
      jestProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      jestProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Jest version: ${output.trim()}`);
          resolve(output.trim());
        } else {
          reject(new Error('Jest not found or not properly installed'));
        }
      });
      
      jestProcess.on('error', reject);
    });
  }

  /**
   * Set up mock factory for London School isolation
   */
  async _setupMockFactory() {
    console.log('🏭 Setting up mock factory...');
    
    this.mockFactory = {
      spies: new Map(),
      stubs: new Map(),
      mocks: new Map(),
      
      createSpy: (name) => {
        const spy = jest.fn();
        this.mockFactory.spies.set(name, spy);
        return spy;
      },
      
      createStub: (name, implementation) => {
        const stub = jest.fn(implementation);
        this.mockFactory.stubs.set(name, stub);
        return stub;
      },
      
      createMock: (name, mockImplementation) => {
        const mock = mockImplementation;
        this.mockFactory.mocks.set(name, mock);
        return mock;
      },
      
      reset: () => {
        this.mockFactory.spies.clear();
        this.mockFactory.stubs.clear();
        this.mockFactory.mocks.clear();
        jest.clearAllMocks();
        jest.restoreAllMocks();
        jest.resetAllMocks();
      }
    };
  }

  /**
   * Set up test isolation environment
   */
  async _setupTestIsolation() {
    console.log('🔒 Setting up test isolation environment...');
    
    this.isolationConfig = {
      clearMocks: true,
      restoreMocks: true,
      resetModules: true,
      isolateModules: true,
      unmockedModules: ['path', 'fs', 'util'],
      setupFiles: [],
      setupFilesAfterEnv: []
    };
  }

  /**
   * Set up metrics collection
   */
  _setupMetricsCollection() {
    console.log('📊 Setting up metrics collection...');
    
    this.metricsCollector = {
      startTime: Date.now(),
      testExecutions: [],
      coverageHistory: [],
      performanceMetrics: []
    };
  }

  /**
   * Pre-test setup for London School methodology
   */
  async _preTestSetup(testTask) {
    console.log('🔧 Pre-test setup...');
    
    // Reset mock factory
    this.mockFactory.reset();
    
    // Set up test-specific configuration
    const testConfig = {
      ...this.jestConfig,
      testMatch: [testTask.testFile],
      collectCoverageFrom: this._determineCoverageTargets(testTask),
      coverageDirectory: path.join(process.cwd(), 'coverage', 'tdd-london', this.id),
      reporters: [
        'default',
        ['jest-junit', {
          outputDirectory: path.join(process.cwd(), 'test-results', 'tdd-london'),
          outputName: `${this.id}-${Date.now()}.xml`
        }]
      ]
    };
    
    // Write temporary Jest config
    const configPath = path.join(process.cwd(), `jest.config.${this.id}.js`);
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(testConfig, null, 2)}`);
    
    this.tempConfigPath = configPath;
  }

  /**
   * Execute test using London School TDD methodology
   */
  async _executeLondonSchoolTest(testTask) {
    console.log('🏃‍♂️ Executing London School test...');
    
    return new Promise((resolve, reject) => {
      const jestArgs = [
        'jest',
        '--config', this.tempConfigPath,
        '--testPathPattern', testTask.testFile,
        '--coverage',
        '--json',
        '--outputFile', path.join(process.cwd(), `test-results-${this.id}.json`),
        '--verbose',
        '--forceExit'
      ];
      
      console.log(`Running: npx ${jestArgs.join(' ')}`);
      
      const jestProcess = spawn('npx', jestArgs, {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          TDD_LONDON_AGENT: this.id
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      jestProcess.on('close', async (code) => {
        try {
          // Parse Jest results
          const resultFile = path.join(process.cwd(), `test-results-${this.id}.json`);
          let jestResults = null;
          
          try {
            const resultContent = await fs.readFile(resultFile, 'utf8');
            jestResults = JSON.parse(resultContent);
          } catch (parseError) {
            console.warn('Could not parse Jest results, using stdout/stderr');
          }
          
          const result = {
            success: code === 0,
            exitCode: code,
            stdout: stdout,
            stderr: stderr,
            jestResults: jestResults,
            coverage: await this._extractCoverage(),
            testDetails: this._parseTestDetails(stdout, stderr),
            mockingMetrics: this._analyzeMockUsage()
          };
          
          // Cleanup temporary files
          await this._cleanupTempFiles();
          
          resolve(result);
          
        } catch (error) {
          reject(error);
        }
      });
      
      jestProcess.on('error', reject);
      
      // Set timeout for test execution
      setTimeout(() => {
        if (!jestProcess.killed) {
          jestProcess.kill('SIGTERM');
          reject(new Error(`Test execution timed out after ${testTask.timeout || 30000}ms`));
        }
      }, testTask.timeout || 30000);
    });
  }

  /**
   * Post-test analysis for London School methodology
   */
  async _postTestAnalysis(result) {
    console.log('🔍 Post-test analysis...');
    
    const analysis = {
      londonSchoolCompliance: this._assessLondonSchoolCompliance(result),
      mockingEfficiency: this._calculateMockingEfficiency(result),
      isolationQuality: this._assessIsolationQuality(result),
      testQuality: this._assessTestQuality(result),
      recommendations: this._generateRecommendations(result)
    };
    
    return analysis;
  }

  /**
   * Determine coverage targets based on test task
   */
  _determineCoverageTargets(testTask) {
    // Default coverage patterns
    let patterns = [
      'src/**/*.{js,ts}',
      '!src/**/*.d.ts',
      '!src/**/node_modules/**'
    ];
    
    // Customize based on test file location
    if (testTask.testFile.includes('/unit/')) {
      patterns = [`src/**/${path.basename(testTask.testFile, '.test.js')}.js`];
    } else if (testTask.testFile.includes('/integration/')) {
      patterns = ['src/**/*.{js,ts}'];
    }
    
    return patterns;
  }

  /**
   * Extract coverage information
   */
  async _extractCoverage() {
    try {
      const coverageFile = path.join(process.cwd(), 'coverage', 'tdd-london', this.id, 'coverage-summary.json');
      const coverageContent = await fs.readFile(coverageFile, 'utf8');
      return JSON.parse(coverageContent);
    } catch (error) {
      console.warn('Could not extract coverage information:', error.message);
      return null;
    }
  }

  /**
   * Parse test details from Jest output
   */
  _parseTestDetails(stdout, stderr) {
    const details = {
      testSuites: 0,
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    
    // Parse test summary from stdout
    const summaryMatch = stdout.match(/Tests:\s+(\d+)\s+passed(?:,\s+(\d+)\s+failed)?(?:,\s+(\d+)\s+skipped)?/);
    if (summaryMatch) {
      details.passed = parseInt(summaryMatch[1]) || 0;
      details.failed = parseInt(summaryMatch[2]) || 0;
      details.skipped = parseInt(summaryMatch[3]) || 0;
      details.tests = details.passed + details.failed + details.skipped;
    }
    
    // Parse duration
    const durationMatch = stdout.match(/Time:\s+(\d+\.?\d*)\s*s/);
    if (durationMatch) {
      details.duration = parseFloat(durationMatch[1]) * 1000; // Convert to ms
    }
    
    return details;
  }

  /**
   * Analyze mock usage for London School methodology
   */
  _analyzeMockUsage() {
    return {
      spiesUsed: this.mockFactory.spies.size,
      stubsUsed: this.mockFactory.stubs.size,
      mocksUsed: this.mockFactory.mocks.size,
      totalMocks: this.mockFactory.spies.size + this.mockFactory.stubs.size + this.mockFactory.mocks.size
    };
  }

  /**
   * Assess London School methodology compliance
   */
  _assessLondonSchoolCompliance(result) {
    const mockingMetrics = result.mockingMetrics;
    const compliance = {
      score: 0,
      factors: {}
    };
    
    // Mock usage (London School relies heavily on mocking)
    compliance.factors.mockUsage = mockingMetrics.totalMocks > 0 ? 100 : 0;
    
    // Isolation (tests should not touch external dependencies)
    compliance.factors.isolation = this._checkIsolation(result) ? 100 : 0;
    
    // Fast execution (London School tests should be fast)
    const avgTestTime = result.testDetails.duration / result.testDetails.tests;
    compliance.factors.speed = avgTestTime < 100 ? 100 : Math.max(0, 100 - avgTestTime / 10);
    
    // Calculate overall score
    const factorValues = Object.values(compliance.factors);
    compliance.score = factorValues.reduce((sum, val) => sum + val, 0) / factorValues.length;
    
    return compliance;
  }

  /**
   * Calculate mocking efficiency
   */
  _calculateMockingEfficiency(result) {
    const mockingMetrics = result.mockingMetrics;
    if (mockingMetrics.totalMocks === 0) return 0;
    
    // Simple efficiency calculation based on mock usage vs test complexity
    const testComplexity = result.testDetails.tests;
    return Math.min(100, (mockingMetrics.totalMocks / testComplexity) * 100);
  }

  /**
   * Assess isolation quality
   */
  _assessIsolationQuality(result) {
    // Check for external dependencies in test output
    const externalDeps = this._detectExternalDependencies(result.stderr + result.stdout);
    return {
      score: Math.max(0, 100 - externalDeps.length * 10),
      externalDependencies: externalDeps
    };
  }

  /**
   * Assess overall test quality
   */
  _assessTestQuality(result) {
    const quality = {
      score: 0,
      factors: {}
    };
    
    // Success rate
    quality.factors.success = result.success ? 100 : 0;
    
    // Coverage (if available)
    if (result.coverage && result.coverage.total) {
      quality.factors.coverage = result.coverage.total.lines.pct || 0;
    } else {
      quality.factors.coverage = 0;
    }
    
    // Speed
    const avgTestTime = result.testDetails.duration / result.testDetails.tests;
    quality.factors.speed = Math.max(0, 100 - avgTestTime / 10);
    
    // Calculate overall score
    const factorValues = Object.values(quality.factors);
    quality.score = factorValues.reduce((sum, val) => sum + val, 0) / factorValues.length;
    
    return quality;
  }

  /**
   * Generate recommendations based on analysis
   */
  _generateRecommendations(result) {
    const recommendations = [];
    const analysis = this._assessLondonSchoolCompliance(result);
    
    if (analysis.factors.mockUsage < 50) {
      recommendations.push({
        type: 'mocking',
        message: 'Consider using more mocks to improve test isolation',
        priority: 'high'
      });
    }
    
    if (analysis.factors.speed < 70) {
      recommendations.push({
        type: 'performance',
        message: 'Tests are running slowly - check for synchronous operations',
        priority: 'medium'
      });
    }
    
    if (result.coverage && result.coverage.total && result.coverage.total.lines.pct < 80) {
      recommendations.push({
        type: 'coverage',
        message: 'Consider adding more test cases to improve coverage',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Check test isolation
   */
  _checkIsolation(result) {
    // Check for signs of external dependencies in output
    const externalSigns = [
      'ECONNREFUSED',
      'database',
      'http request',
      'network',
      'file system'
    ];
    
    const output = result.stdout + result.stderr;
    return !externalSigns.some(sign => output.toLowerCase().includes(sign));
  }

  /**
   * Detect external dependencies in test output
   */
  _detectExternalDependencies(output) {
    const externalDepPatterns = [
      /ECONNREFUSED/gi,
      /database.*connect/gi,
      /http.*request/gi,
      /network.*error/gi,
      /file.*not.*found/gi
    ];
    
    const dependencies = [];
    externalDepPatterns.forEach((pattern, index) => {
      if (pattern.test(output)) {
        dependencies.push(`external-dependency-${index}`);
      }
    });
    
    return dependencies;
  }

  /**
   * Update agent metrics
   */
  _updateMetrics(result, duration) {
    this.metrics.testsExecuted++;
    
    if (result.success) {
      this.metrics.testsPassed++;
    } else {
      this.metrics.testsFailed++;
    }
    
    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.testsExecuted - 1) + duration) / 
      this.metrics.testsExecuted;
    
    // Update coverage
    if (result.coverage && result.coverage.total) {
      this.metrics.coverageAchieved = result.coverage.total.lines.pct || 0;
    }
    
    // Update mocking efficiency
    this.metrics.mockingEfficiency = this._calculateMockingEfficiency(result);
    
    // Store execution data
    this.metricsCollector.testExecutions.push({
      timestamp: Date.now(),
      duration: duration,
      success: result.success,
      coverage: result.coverage,
      mockingMetrics: result.mockingMetrics
    });
  }

  /**
   * Cleanup temporary files
   */
  async _cleanupTempFiles() {
    try {
      if (this.tempConfigPath) {
        await fs.unlink(this.tempConfigPath);
      }
      
      const resultFile = path.join(process.cwd(), `test-results-${this.id}.json`);
      try {
        await fs.unlink(resultFile);
      } catch (e) {
        // File might not exist
      }
    } catch (error) {
      console.warn('Warning: Could not cleanup temp files:', error.message);
    }
  }

  /**
   * Get current agent status and metrics
   */
  getStatus() {
    return {
      id: this.id,
      status: this.status,
      currentTask: this.currentTask,
      capabilities: this.capabilities,
      metrics: this.metrics,
      uptime: Date.now() - this.metricsCollector.startTime
    };
  }

  /**
   * Shutdown agent and cleanup resources
   */
  async shutdown() {
    console.log(`🔄 Shutting down TDD London School agent ${this.id}...`);
    
    try {
      // Cleanup temporary files
      await this._cleanupTempFiles();
      
      // Reset mock factory
      this.mockFactory.reset();
      
      this.status = 'shutdown';
      console.log(`✅ Agent ${this.id} shutdown completed`);
      
    } catch (error) {
      console.error(`❌ Error during agent ${this.id} shutdown:`, error);
      throw error;
    }
  }
}

module.exports = TDDLondonAgent;