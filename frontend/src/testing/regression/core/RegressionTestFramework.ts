/**
 * Core Regression Test Framework
 * Orchestrates the entire regression testing process
 */

import { EventEmitter } from 'events';
import {
  TestSuite,
  TestExecution,
  TestConfiguration,
  TestEnvironment,
  ExecutionSummary,
  TestStatus,
  PMReport,
  ChangeVerification,
  NLDPattern
} from '../types';
import { TestSuiteManager } from '../managers/TestSuiteManager';
import { TestRunner } from '../core/TestRunner';
import { TestResultCollector } from '../core/TestResultCollector';
import { PMReportGenerator } from '../reporters/PMReportGenerator';
import { TestDocumentationManager } from '../managers/TestDocumentationManager';
import { ChangeVerificationWorkflow } from '../workflow/ChangeVerificationWorkflow';
import { NLDIntegration } from '../nld/NLDIntegration';

export class RegressionTestFramework extends EventEmitter {
  private suiteManager: TestSuiteManager;
  private testRunner: TestRunner;
  private resultCollector: TestResultCollector;
  private reportGenerator: PMReportGenerator;
  private documentationManager: TestDocumentationManager;
  private verificationWorkflow: ChangeVerificationWorkflow;
  private nldIntegration: NLDIntegration;
  
  private isInitialized = false;
  private currentExecution?: TestExecution;

  constructor(private config: TestConfiguration) {
    super();
    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.suiteManager = new TestSuiteManager();
    this.testRunner = new TestRunner(this.config);
    this.resultCollector = new TestResultCollector();
    this.reportGenerator = new PMReportGenerator();
    this.documentationManager = new TestDocumentationManager();
    this.verificationWorkflow = new ChangeVerificationWorkflow();
    this.nldIntegration = new NLDIntegration();

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.testRunner.on('testStart', (testId: string) => {
      this.emit('testStart', testId);
    });

    this.testRunner.on('testComplete', (result) => {
      this.resultCollector.addResult(result);
      this.emit('testComplete', result);
    });

    this.testRunner.on('suiteComplete', (summary) => {
      this.emit('suiteComplete', summary);
    });

    this.nldIntegration.on('patternDetected', (pattern: NLDPattern) => {
      this.emit('patternDetected', pattern);
    });
  }

  /**
   * Initialize the framework with environment setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize all components
      await Promise.all([
        this.suiteManager.initialize(),
        this.testRunner.initialize(),
        this.resultCollector.initialize(),
        this.reportGenerator.initialize(),
        this.documentationManager.initialize(),
        this.verificationWorkflow.initialize(),
        this.nldIntegration.initialize()
      ]);

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register a test suite
   */
  async registerSuite(suite: TestSuite): Promise<void> {
    await this.suiteManager.registerSuite(suite);
    this.emit('suiteRegistered', suite.id);
  }

  /**
   * Run all registered test suites
   */
  async runAll(): Promise<TestExecution> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const suites = await this.suiteManager.getAllSuites();
    return this.runSuites(suites);
  }

  /**
   * Run specific test suites
   */
  async runSuites(suites: TestSuite[]): Promise<TestExecution> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    this.currentExecution = {
      id: executionId,
      suiteId: suites.map(s => s.id).join(','),
      results: [],
      summary: this.createEmptySummary(),
      startTime,
      endTime: startTime,
      environment: await this.getEnvironment(),
      configuration: this.config
    };

    this.emit('executionStart', this.currentExecution);

    try {
      // Run tests with parallel execution if configured
      const results = await this.testRunner.runSuites(suites);
      
      // Collect and analyze results
      this.currentExecution.results = results;
      this.currentExecution.summary = this.resultCollector.generateSummary(results);
      this.currentExecution.endTime = new Date();

      // Store the execution for history
      this.resultCollector.storeExecution(this.currentExecution);

      // Generate reports
      const pmReport = await this.generatePMReport(this.currentExecution);
      await this.documentationManager.generateTestReport(this.currentExecution);

      // Apply NLD learning
      await this.nldIntegration.learnFromExecution(this.currentExecution);

      this.emit('executionComplete', this.currentExecution);
      this.emit('reportGenerated', pmReport);

      return this.currentExecution;
    } catch (error) {
      this.currentExecution.endTime = new Date();
      this.emit('executionError', error);
      throw error;
    }
  }

  /**
   * Run tests for a specific category
   */
  async runByCategory(category: string): Promise<TestExecution> {
    const suites = await this.suiteManager.getSuitesByCategory(category);
    return this.runSuites(suites);
  }

  /**
   * Run tests with specific tags
   */
  async runByTags(tags: string[]): Promise<TestExecution> {
    const suites = await this.suiteManager.getSuitesByTags(tags);
    return this.runSuites(suites);
  }

  /**
   * Verify changes before running tests
   */
  async verifyChanges(changeId: string): Promise<ChangeVerification> {
    return this.verificationWorkflow.createVerification(changeId);
  }

  /**
   * Get test execution history
   */
  async getExecutionHistory(limit = 10): Promise<TestExecution[]> {
    return this.resultCollector.getExecutionHistory(limit);
  }

  /**
   * Get PM-formatted report
   */
  async generatePMReport(execution: TestExecution): Promise<PMReport> {
    const history = await this.getExecutionHistory(5);
    return this.reportGenerator.generateReport(execution, history);
  }

  /**
   * Get detailed technical documentation
   */
  async generateTechnicalReport(execution: TestExecution): Promise<string> {
    return this.documentationManager.generateDetailedReport(execution);
  }

  /**
   * Get NLD patterns and predictions
   */
  async getNLDInsights(): Promise<{
    patterns: NLDPattern[];
    predictions: string[];
    recommendations: string[];
  }> {
    return this.nldIntegration.getInsights();
  }

  /**
   * Schedule automated regression runs
   */
  async scheduleRegression(cronExpression: string, suiteIds?: string[]): Promise<string> {
    // Implementation would depend on specific scheduler (cron, etc.)
    const scheduleId = this.generateScheduleId();
    
    // Store schedule configuration
    await this.resultCollector.storeSchedule({
      id: scheduleId,
      cronExpression,
      suiteIds: suiteIds || [],
      active: true,
      createdAt: new Date()
    });

    this.emit('regressionScheduled', { scheduleId, cronExpression });
    return scheduleId;
  }

  /**
   * Stop current execution
   */
  async stopExecution(): Promise<void> {
    await this.testRunner.stop();
    this.emit('executionStopped');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await Promise.all([
      this.testRunner.cleanup(),
      this.resultCollector.cleanup(),
      this.documentationManager.cleanup(),
      this.nldIntegration.cleanup()
    ]);

    this.removeAllListeners();
    this.isInitialized = false;
    this.emit('cleanup');
  }

  // Private helper methods
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptySummary(): ExecutionSummary {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
  }

  private async getEnvironment(): Promise<TestEnvironment> {
    const packageJson = require('../../../../package.json');
    
    return {
      platform: process.platform,
      version: packageJson.version,
      nodeVersion: process.version,
      dependencies: packageJson.dependencies || {},
      variables: {
        NODE_ENV: process.env.NODE_ENV || 'test',
        CI: process.env.CI || 'false'
      }
    };
  }

  // Getters
  get isRunning(): boolean {
    return this.testRunner.isRunning;
  }

  get currentExecutionId(): string | undefined {
    return this.currentExecution?.id;
  }

  get configuration(): TestConfiguration {
    return { ...this.config };
  }
}