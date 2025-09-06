/**
 * A/B Testing Framework for Link Preview Service
 * Tests different extraction strategies and optimizes based on results
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class ABTestingFramework extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      testDuration: config.testDuration || 7 * 24 * 60 * 60 * 1000, // 7 days
      minSampleSize: config.minSampleSize || 100,
      significanceLevel: config.significanceLevel || 0.05,
      enableAutoOptimization: config.enableAutoOptimization !== false,
      maxConcurrentTests: config.maxConcurrentTests || 5,
      ...config
    };

    // Test management
    this.activeTests = new Map();
    this.testHistory = [];
    this.strategies = new Map();
    this.results = new Map();
    
    // Statistical analysis
    this.statisticalAnalyzer = new StatisticalAnalyzer();
    
    // Performance tracking
    this.testMetrics = {
      totalTests: 0,
      completedTests: 0,
      significantResults: 0,
      optimizationsImplemented: 0
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.loadExistingTests();
      await this.loadExtractionStrategies();
      await this.startTestMonitoring();
      
      console.log('🧪 A/B Testing Framework initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ A/B Testing Framework initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Create a new A/B test
   */
  async createTest(testConfig) {
    try {
      const testId = this.generateTestId();
      const test = {
        id: testId,
        name: testConfig.name,
        description: testConfig.description,
        hypothesis: testConfig.hypothesis,
        
        // Test configuration
        strategies: testConfig.strategies, // Array of strategy configurations
        trafficAllocation: testConfig.trafficAllocation || this.calculateEvenSplit(testConfig.strategies.length),
        platforms: testConfig.platforms || ['all'],
        
        // Test parameters
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + this.config.testDuration).toISOString(),
        minSampleSize: testConfig.minSampleSize || this.config.minSampleSize,
        significanceLevel: testConfig.significanceLevel || this.config.significanceLevel,
        
        // Status
        status: 'active',
        participants: 0,
        results: new Map(),
        
        // Metrics to track
        metrics: {
          successRate: new Map(),
          responseTime: new Map(),
          contentQuality: new Map(),
          userSatisfaction: new Map(),
          errorRate: new Map()
        }
      };
      
      // Validate test configuration
      if (!this.validateTestConfig(test)) {
        throw new Error('Invalid test configuration');
      }
      
      // Check for conflicts with existing tests
      const conflicts = this.checkTestConflicts(test);
      if (conflicts.length > 0) {
        throw new Error(`Test conflicts detected: ${conflicts.join(', ')}`);
      }
      
      // Store and activate test
      this.activeTests.set(testId, test);
      this.testMetrics.totalTests++;
      
      console.log(`🧪 Created A/B test: ${test.name} (ID: ${testId})`);
      this.emit('testCreated', test);
      
      return testId;
      
    } catch (error) {
      console.error('❌ Failed to create A/B test:', error);
      throw error;
    }
  }

  /**
   * Assign user to test variant
   */
  assignToVariant(url, userId = null) {
    const applicableTests = this.getApplicableTests(url);
    const assignments = [];
    
    for (const test of applicableTests) {
      const variant = this.selectVariant(test, url, userId);
      if (variant) {
        assignments.push({
          testId: test.id,
          variant: variant.name,
          strategy: variant.strategy,
          config: variant.config
        });
      }
    }
    
    return assignments;
  }

  /**
   * Record test result
   */
  async recordResult(testId, variant, url, result, metrics = {}) {
    try {
      const test = this.activeTests.get(testId);
      if (!test || test.status !== 'active') {
        return; // Test not active
      }
      
      // Initialize variant results if needed
      if (!test.results.has(variant)) {
        test.results.set(variant, {
          samples: 0,
          successes: 0,
          failures: 0,
          totalResponseTime: 0,
          totalContentQuality: 0,
          errors: []
        });
      }
      
      const variantResults = test.results.get(variant);
      
      // Record sample
      variantResults.samples++;
      test.participants++;
      
      // Record outcome
      if (result.success) {
        variantResults.successes++;
      } else {
        variantResults.failures++;
        variantResults.errors.push({
          error: result.error,
          url,
          timestamp: new Date().toISOString()
        });
      }
      
      // Record metrics
      if (metrics.responseTime) {
        variantResults.totalResponseTime += metrics.responseTime;
      }
      
      if (metrics.contentQuality) {
        variantResults.totalContentQuality += metrics.contentQuality;
      }
      
      // Update test metrics
      this.updateTestMetrics(test, variant, variantResults);
      
      // Check if test is ready for analysis
      if (this.isTestReadyForAnalysis(test)) {
        await this.analyzeTestResults(test);
      }
      
    } catch (error) {
      console.error('❌ Failed to record test result:', error);
    }
  }

  /**
   * Analyze test results for statistical significance
   */
  async analyzeTestResults(test) {
    try {
      console.log(`📊 Analyzing results for test: ${test.name}`);
      
      const analysis = {
        testId: test.id,
        testName: test.name,
        analysisTime: new Date().toISOString(),
        sampleSizes: {},
        metrics: {},
        significance: {},
        winner: null,
        confidence: 0,
        recommendation: null
      };
      
      // Calculate metrics for each variant
      const variants = Array.from(test.results.keys());
      
      for (const variant of variants) {
        const results = test.results.get(variant);
        
        analysis.sampleSizes[variant] = results.samples;
        analysis.metrics[variant] = {
          successRate: results.successes / results.samples,
          errorRate: results.failures / results.samples,
          avgResponseTime: results.totalResponseTime / results.samples,
          avgContentQuality: results.totalContentQuality / results.samples
        };
      }
      
      // Perform statistical significance tests
      analysis.significance = await this.performSignificanceTests(test, variants);
      
      // Determine winner and confidence
      const winnerAnalysis = this.determineWinner(analysis);
      analysis.winner = winnerAnalysis.winner;
      analysis.confidence = winnerAnalysis.confidence;
      analysis.recommendation = this.generateRecommendation(analysis);
      
      // Store analysis
      test.analysis = analysis;
      
      // Check if test should be concluded
      if (this.shouldConcludeTest(test, analysis)) {
        await this.concludeTest(test.id, analysis);
      }
      
      this.emit('testAnalyzed', analysis);
      
    } catch (error) {
      console.error('❌ Test analysis failed:', error);
    }
  }

  /**
   * Conclude a test and implement optimizations
   */
  async concludeTest(testId, analysis = null) {
    try {
      const test = this.activeTests.get(testId);
      if (!test) return;
      
      console.log(`🏁 Concluding test: ${test.name}`);
      
      // Perform final analysis if not provided
      if (!analysis) {
        analysis = await this.analyzeTestResults(test);
      }
      
      // Update test status
      test.status = 'completed';
      test.endTime = new Date().toISOString();
      test.finalAnalysis = analysis;
      
      // Move to history
      this.testHistory.push(test);
      this.activeTests.delete(testId);
      this.testMetrics.completedTests++;
      
      // Check for significant results
      if (analysis.winner && analysis.confidence > 0.95) {
        this.testMetrics.significantResults++;
        
        // Implement optimization if auto-optimization is enabled
        if (this.config.enableAutoOptimization) {
          await this.implementOptimization(test, analysis);
        }
      }
      
      // Export test results
      await this.exportTestResults(test);
      
      this.emit('testConcluded', { test, analysis });
      
    } catch (error) {
      console.error('❌ Failed to conclude test:', error);
    }
  }

  /**
   * Implement optimization based on test results
   */
  async implementOptimization(test, analysis) {
    try {
      if (!analysis.winner || analysis.confidence < 0.95) {
        console.log('⚠️ Insufficient confidence to implement optimization');
        return;
      }
      
      const winningStrategy = this.findWinningStrategy(test, analysis.winner);
      if (!winningStrategy) {
        console.log('⚠️ Could not find winning strategy configuration');
        return;
      }
      
      console.log(`🚀 Implementing optimization: ${winningStrategy.name}`);
      
      // Update default strategy for platforms
      for (const platform of test.platforms) {
        await this.updateDefaultStrategy(platform, winningStrategy);
      }
      
      // Record optimization
      const optimization = {
        id: this.generateOptimizationId(),
        timestamp: new Date().toISOString(),
        testId: test.id,
        testName: test.name,
        winningVariant: analysis.winner,
        confidence: analysis.confidence,
        strategy: winningStrategy,
        platforms: test.platforms,
        expectedImprovement: this.calculateExpectedImprovement(analysis)
      };
      
      await this.recordOptimization(optimization);
      this.testMetrics.optimizationsImplemented++;
      
      this.emit('optimizationImplemented', optimization);
      
    } catch (error) {
      console.error('❌ Failed to implement optimization:', error);
    }
  }

  /**
   * Get test status and metrics
   */
  getTestStatus() {
    const activeTests = Array.from(this.activeTests.values()).map(test => ({
      id: test.id,
      name: test.name,
      status: test.status,
      participants: test.participants,
      startTime: test.startTime,
      progress: this.calculateTestProgress(test)
    }));
    
    return {
      activeTests,
      totalTests: this.testMetrics.totalTests,
      completedTests: this.testMetrics.completedTests,
      significantResults: this.testMetrics.significantResults,
      optimizationsImplemented: this.testMetrics.optimizationsImplemented,
      testHistory: this.testHistory.slice(-10) // Last 10 tests
    };
  }

  /**
   * Export comprehensive test data
   */
  async exportTestData() {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        totalTests: this.testMetrics.totalTests,
        framework: 'NLD-ABTesting'
      },
      activeTests: Array.from(this.activeTests.values()),
      testHistory: this.testHistory,
      strategies: Array.from(this.strategies.entries()),
      metrics: this.testMetrics,
      configuration: this.config
    };
    
    const exportPath = path.join(
      this.config.dataPath,
      'exports',
      `ab-testing-data-${Date.now()}.json`
    );
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    return exportPath;
  }

  // Utility methods
  generateTestId() {
    return `abtest-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  generateOptimizationId() {
    return `opt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  calculateEvenSplit(variantCount) {
    const allocation = 1.0 / variantCount;
    return Array(variantCount).fill(allocation);
  }

  validateTestConfig(test) {
    return test.strategies && 
           test.strategies.length >= 2 && 
           test.trafficAllocation && 
           test.trafficAllocation.length === test.strategies.length &&
           Math.abs(test.trafficAllocation.reduce((sum, a) => sum + a, 0) - 1.0) < 0.01;
  }

  checkTestConflicts(newTest) {
    const conflicts = [];
    
    for (const [testId, existingTest] of this.activeTests) {
      // Check platform overlap
      const platformOverlap = newTest.platforms.some(p => 
        existingTest.platforms.includes(p) || existingTest.platforms.includes('all')
      );
      
      if (platformOverlap) {
        conflicts.push(`Platform overlap with test: ${existingTest.name}`);
      }
    }
    
    return conflicts;
  }

  getApplicableTests(url) {
    const platform = this.extractPlatform(url);
    
    return Array.from(this.activeTests.values()).filter(test => 
      test.status === 'active' &&
      (test.platforms.includes('all') || test.platforms.includes(platform))
    );
  }

  selectVariant(test, url, userId) {
    // Use consistent hashing for variant assignment
    const hash = this.generateHash(url + (userId || ''));
    const hashValue = parseInt(hash.substr(0, 8), 16) / 0xffffffff;
    
    let cumulativeAllocation = 0;
    for (let i = 0; i < test.strategies.length; i++) {
      cumulativeAllocation += test.trafficAllocation[i];
      if (hashValue <= cumulativeAllocation) {
        return {
          name: `variant-${i}`,
          strategy: test.strategies[i].name,
          config: test.strategies[i].config
        };
      }
    }
    
    // Fallback to last variant
    const lastIndex = test.strategies.length - 1;
    return {
      name: `variant-${lastIndex}`,
      strategy: test.strategies[lastIndex].name,
      config: test.strategies[lastIndex].config
    };
  }

  updateTestMetrics(test, variant, results) {
    // Update running averages
    test.metrics.successRate.set(variant, results.successes / results.samples);
    test.metrics.errorRate.set(variant, results.failures / results.samples);
    
    if (results.samples > 0) {
      test.metrics.responseTime.set(variant, results.totalResponseTime / results.samples);
      test.metrics.contentQuality.set(variant, results.totalContentQuality / results.samples);
    }
  }

  isTestReadyForAnalysis(test) {
    // Check minimum sample size
    const totalSamples = Array.from(test.results.values())
      .reduce((sum, results) => sum + results.samples, 0);
    
    if (totalSamples < test.minSampleSize) return false;
    
    // Check that all variants have minimum samples
    for (const results of test.results.values()) {
      if (results.samples < 10) return false;
    }
    
    // Check test duration (optional early analysis)
    const testAge = Date.now() - new Date(test.startTime).getTime();
    const minTestAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return testAge > minTestAge;
  }

  async performSignificanceTests(test, variants) {
    const significance = {};
    
    if (variants.length === 2) {
      // Two-sample z-test for proportions
      const [variantA, variantB] = variants;
      const resultsA = test.results.get(variantA);
      const resultsB = test.results.get(variantB);
      
      const pValue = this.statisticalAnalyzer.zTestProportions(
        resultsA.successes, resultsA.samples,
        resultsB.successes, resultsB.samples
      );
      
      significance[`${variantA}_vs_${variantB}`] = {
        pValue,
        significant: pValue < test.significanceLevel,
        test: 'z-test-proportions'
      };
    } else {
      // Chi-square test for multiple variants
      const observed = variants.map(v => {
        const results = test.results.get(v);
        return [results.successes, results.failures];
      });
      
      const pValue = this.statisticalAnalyzer.chiSquareTest(observed);
      
      significance.overall = {
        pValue,
        significant: pValue < test.significanceLevel,
        test: 'chi-square'
      };
    }
    
    return significance;
  }

  determineWinner(analysis) {
    let winner = null;
    let confidence = 0;
    
    // Find variant with highest success rate
    let bestVariant = null;
    let bestSuccessRate = 0;
    
    for (const [variant, metrics] of Object.entries(analysis.metrics)) {
      if (metrics.successRate > bestSuccessRate) {
        bestSuccessRate = metrics.successRate;
        bestVariant = variant;
      }
    }
    
    // Check if winner is statistically significant
    const significanceTests = Object.values(analysis.significance);
    const hasSignificantResult = significanceTests.some(test => test.significant);
    
    if (hasSignificantResult && bestVariant) {
      winner = bestVariant;
      // Calculate confidence based on p-value
      const bestPValue = Math.min(...significanceTests.map(test => test.pValue));
      confidence = 1 - bestPValue;
    }
    
    return { winner, confidence };
  }

  generateRecommendation(analysis) {
    if (!analysis.winner) {
      return 'No statistically significant winner detected. Continue testing or conclude with no changes.';
    }
    
    if (analysis.confidence > 0.99) {
      return `Implement ${analysis.winner} with high confidence (${(analysis.confidence * 100).toFixed(1)}%).`;
    } else if (analysis.confidence > 0.95) {
      return `Implement ${analysis.winner} with good confidence (${(analysis.confidence * 100).toFixed(1)}%).`;
    } else {
      return `${analysis.winner} shows promise but needs more data for confident implementation.`;
    }
  }

  shouldConcludeTest(test, analysis) {
    // Conclude if we have a clear winner with high confidence
    if (analysis.winner && analysis.confidence > 0.95) {
      return true;
    }
    
    // Conclude if test duration exceeded
    const testAge = Date.now() - new Date(test.startTime).getTime();
    if (testAge > this.config.testDuration) {
      return true;
    }
    
    // Conclude if sufficient samples collected with no significant difference
    const totalSamples = Array.from(test.results.values())
      .reduce((sum, results) => sum + results.samples, 0);
    
    if (totalSamples > test.minSampleSize * 3 && !analysis.winner) {
      return true;
    }
    
    return false;
  }

  findWinningStrategy(test, winnerVariant) {
    const variantIndex = parseInt(winnerVariant.split('-')[1]);
    return test.strategies[variantIndex];
  }

  async updateDefaultStrategy(platform, strategy) {
    // Update strategy configuration (implementation depends on system)
    console.log(`🔧 Updating default strategy for ${platform}: ${strategy.name}`);
  }

  calculateExpectedImprovement(analysis) {
    if (!analysis.winner) return 0;
    
    const winnerMetrics = analysis.metrics[analysis.winner];
    const otherVariants = Object.keys(analysis.metrics).filter(v => v !== analysis.winner);
    
    if (otherVariants.length === 0) return 0;
    
    const avgOtherSuccessRate = otherVariants
      .reduce((sum, variant) => sum + analysis.metrics[variant].successRate, 0) / otherVariants.length;
    
    return ((winnerMetrics.successRate - avgOtherSuccessRate) / avgOtherSuccessRate) * 100;
  }

  async recordOptimization(optimization) {
    const optimizationsPath = path.join(this.config.dataPath, 'optimizations.json');
    
    let optimizations = [];
    try {
      const data = await fs.readFile(optimizationsPath, 'utf8');
      optimizations = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet
    }
    
    optimizations.push(optimization);
    await fs.writeFile(optimizationsPath, JSON.stringify(optimizations, null, 2));
  }

  calculateTestProgress(test) {
    const totalSamples = Array.from(test.results.values())
      .reduce((sum, results) => sum + results.samples, 0);
    
    const sampleProgress = Math.min(totalSamples / test.minSampleSize, 1.0);
    
    const testAge = Date.now() - new Date(test.startTime).getTime();
    const timeProgress = Math.min(testAge / this.config.testDuration, 1.0);
    
    return Math.max(sampleProgress, timeProgress);
  }

  extractPlatform(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return 'unknown';
    }
  }

  generateHash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  async loadExistingTests() {
    // Load existing test data from storage
  }

  async loadExtractionStrategies() {
    // Define available extraction strategies
    this.strategies.set('default-html', {
      name: 'Default HTML Parsing',
      description: 'Standard HTML meta tag extraction',
      config: { method: 'html', timeout: 15000, userAgent: 'default' }
    });
    
    this.strategies.set('fast-parse', {
      name: 'Fast Parse',
      description: 'Quick extraction with reduced timeout',
      config: { method: 'html', timeout: 5000, userAgent: 'fast' }
    });
    
    this.strategies.set('comprehensive', {
      name: 'Comprehensive Extraction',
      description: 'Deep parsing with multiple fallbacks',
      config: { method: 'comprehensive', timeout: 30000, fallbacks: true }
    });
    
    this.strategies.set('mobile-optimized', {
      name: 'Mobile Optimized',
      description: 'Mobile-first extraction strategy',
      config: { method: 'html', userAgent: 'mobile', timeout: 10000 }
    });
  }

  async startTestMonitoring() {
    // Start periodic monitoring of active tests
    setInterval(() => {
      this.monitorActiveTests();
    }, 60000); // Every minute
  }

  async monitorActiveTests() {
    for (const test of this.activeTests.values()) {
      if (this.isTestReadyForAnalysis(test)) {
        await this.analyzeTestResults(test);
      }
    }
  }

  async exportTestResults(test) {
    const resultsPath = path.join(
      this.config.dataPath,
      'test-results',
      `${test.id}-results.json`
    );
    
    await fs.writeFile(resultsPath, JSON.stringify(test, null, 2));
  }
}

/**
 * Statistical Analysis Helper
 */
class StatisticalAnalyzer {
  /**
   * Two-sample z-test for proportions
   */
  zTestProportions(x1, n1, x2, n2) {
    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const pPool = (x1 + x2) / (n1 + n2);
    
    const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
    const z = (p1 - p2) / se;
    
    // Two-tailed p-value
    return 2 * (1 - this.normalCDF(Math.abs(z)));
  }
  
  /**
   * Chi-square test for independence
   */
  chiSquareTest(observed) {
    const rows = observed.length;
    const cols = observed[0].length;
    
    // Calculate row and column totals
    const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
    const colTotals = Array(cols).fill(0);
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        colTotals[j] += observed[i][j];
      }
    }
    
    const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);
    
    // Calculate expected frequencies
    let chiSquare = 0;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const expected = (rowTotals[i] * colTotals[j]) / grandTotal;
        chiSquare += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
    
    // Degrees of freedom
    const df = (rows - 1) * (cols - 1);
    
    // Approximate p-value using chi-square distribution
    return this.chiSquarePValue(chiSquare, df);
  }
  
  /**
   * Normal cumulative distribution function approximation
   */
  normalCDF(x) {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
  
  /**
   * Error function approximation
   */
  erf(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
  
  /**
   * Chi-square p-value approximation
   */
  chiSquarePValue(chiSquare, df) {
    // Simplified approximation for demonstration
    // In production, would use more accurate implementation
    if (df === 1) {
      return 2 * (1 - this.normalCDF(Math.sqrt(chiSquare)));
    } else {
      // Wilson-Hilferty approximation
      const h = 2 / (9 * df);
      const z = (Math.pow(chiSquare / df, 1/3) - 1 + h) / Math.sqrt(h);
      return 1 - this.normalCDF(z);
    }
  }
}

export default ABTestingFramework;