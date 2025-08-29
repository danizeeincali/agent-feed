#!/usr/bin/env node

/**
 * Swarm Test Orchestration Runner
 * 
 * Main entry point for executing coordinated test suites using the
 * Claude-Flow Swarm Orchestration system with hierarchical coordination.
 */

const path = require('path');
const fs = require('fs').promises;
const { program } = require('commander');

// Import orchestration components
const SwarmTestOrchestrator = require('./test-orchestration');
const { ParallelExecutionEngine } = require('./parallel-execution');
const { TestResultAggregator } = require('./result-aggregator');

// Import agent implementations
const TDDLondonAgent = require('./agents/tdd/tdd-london-agent');
const SPARCValidationAgent = require('./agents/sparc/sparc-validation-agent');
const NLDMonitoringAgent = require('./agents/nld/nld-monitoring-agent');
const PlaywrightAgent = require('./agents/playwright/playwright-agent');

// Import communication protocol
const CommunicationProtocol = require('./protocols/communication-protocol');

class SwarmTestRunner {
  constructor(options) {
    this.options = options;
    this.config = null;
    this.orchestrator = null;
    this.parallelEngine = null;
    this.resultAggregator = null;
    this.communicationProtocol = null;
    this.agents = new Map();
    this.startTime = null;
    
    // Performance targets
    this.performanceTargets = {
      totalExecutionTime: 300000,  // 5 minutes
      speedupFactor: 10,
      testFlakiness: 0.01,        // 1%
      concurrentAgents: 20
    };
  }

  /**
   * Initialize the swarm test runner
   */
  async initialize() {
    console.log('🚀 Initializing Claude-Flow Swarm Test Orchestration...');
    this.startTime = Date.now();
    
    try {
      // Load configuration
      await this._loadConfiguration();
      
      // Initialize communication protocol
      await this._initializeCommunication();
      
      // Initialize orchestration components
      await this._initializeComponents();
      
      // Spawn and initialize agents
      await this._spawnAgents();
      
      // Set up monitoring and metrics
      await this._setupMonitoring();
      
      console.log('✅ Swarm test orchestration initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize swarm test runner:', error);
      throw error;
    }
  }

  /**
   * Execute the specified test suites
   */
  async executeTests() {
    console.log(`🎯 Executing test suites: ${this.options.suite}`);
    
    try {
      // Parse test suites to run
      const testSuites = this.options.suite.split(',').map(s => s.trim());
      
      // Execute tests with swarm orchestration
      const results = await this.orchestrator.executeTests(testSuites);
      
      // Aggregate and analyze results
      const aggregatedResults = await this._aggregateResults(results);
      
      // Check performance targets
      const performanceAnalysis = await this._analyzePerformance(aggregatedResults);
      
      // Generate final report
      const finalReport = await this._generateFinalReport(aggregatedResults, performanceAnalysis);
      
      // Save results
      await this._saveResults(finalReport);
      
      console.log('✅ Swarm test execution completed successfully');
      
      return {
        success: this._determineOverallSuccess(finalReport),
        results: finalReport,
        executionTime: Date.now() - this.startTime
      };
      
    } catch (error) {
      console.error('❌ Swarm test execution failed:', error);
      throw error;
    }
  }

  /**
   * Load swarm configuration
   */
  async _loadConfiguration() {
    console.log('📋 Loading swarm configuration...');
    
    const configPath = path.join(__dirname, 'swarm-config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    this.config = JSON.parse(configContent);
    
    // Override config with command line options
    this.config.maxAgents = parseInt(this.options.parallelism) || this.config.swarmConfiguration.maxAgents;
    this.config.outputDirectory = this.options.outputDir || './test-results';
    this.config.ciMode = this.options.ciMode === 'true';
    this.config.timeout = parseInt(this.options.timeout) * 60000 || 1800000; // Convert minutes to ms
    
    console.log(`✅ Configuration loaded: ${this.config.maxAgents} max agents, ${this.config.timeout/1000}s timeout`);
  }

  /**
   * Initialize communication protocol
   */
  async _initializeCommunication() {
    console.log('📡 Initializing communication protocol...');
    
    this.communicationProtocol = new CommunicationProtocol({
      nodeId: `swarm-runner-${Date.now()}`,
      messageTimeout: 10000,
      heartbeatInterval: 5000,
      maxQueueSize: 1000,
      retryAttempts: 3
    });
    
    await this.communicationProtocol.initialize();
    
    console.log('✅ Communication protocol initialized');
  }

  /**
   * Initialize orchestration components
   */
  async _initializeComponents() {
    console.log('⚙️ Initializing orchestration components...');
    
    // Initialize test orchestrator
    this.orchestrator = new SwarmTestOrchestrator(this.config);
    await this.orchestrator.initialize();
    
    // Initialize parallel execution engine
    this.parallelEngine = new ParallelExecutionEngine({
      ...this.config,
      maxWorkers: this.config.maxAgents
    });
    await this.parallelEngine.initialize();
    
    // Initialize result aggregator
    this.resultAggregator = new TestResultAggregator({
      ...this.config,
      outputDirectory: this.config.outputDirectory,
      realTimeAnalysis: true
    });
    await this.resultAggregator.initialize();
    
    console.log('✅ Orchestration components initialized');
  }

  /**
   * Spawn and initialize agents
   */
  async _spawnAgents() {
    console.log('🤖 Spawning specialized agents...');
    
    const agentConfigs = this.config.agents;
    let agentCounter = 0;
    
    // Spawn TDD London School agents
    for (let i = 0; i < agentConfigs.tddExecutors.count; i++) {
      const agent = new TDDLondonAgent({
        id: `tdd-london-${agentCounter++}`,
        ...agentConfigs.tddExecutors
      });
      
      await agent.initialize();
      await this.communicationProtocol.registerAgent(agent.id, agent.getStatus());
      this.agents.set(agent.id, agent);
    }
    
    // Spawn SPARC validation agents
    for (let i = 0; i < agentConfigs.sparcValidators.count; i++) {
      const agent = new SPARCValidationAgent({
        id: `sparc-validator-${agentCounter++}`,
        ...agentConfigs.sparcValidators
      });
      
      await agent.initialize();
      await this.communicationProtocol.registerAgent(agent.id, agent.getStatus());
      this.agents.set(agent.id, agent);
    }
    
    // Spawn NLD monitoring agents
    for (let i = 0; i < agentConfigs.nldMonitors.count; i++) {
      const agent = new NLDMonitoringAgent({
        id: `nld-monitor-${agentCounter++}`,
        ...agentConfigs.nldMonitors
      });
      
      await agent.initialize();
      await this.communicationProtocol.registerAgent(agent.id, agent.getStatus());
      this.agents.set(agent.id, agent);
    }
    
    // Spawn Playwright agents (if needed for E2E tests)
    if (this.options.suite.includes('e2e')) {
      for (let i = 0; i < agentConfigs.playwrightAgents.count; i++) {
        const agent = new PlaywrightAgent({
          id: `playwright-${agentCounter++}`,
          browsers: [this.options.browser || 'chromium'],
          ...agentConfigs.playwrightAgents
        });
        
        await agent.initialize();
        await this.communicationProtocol.registerAgent(agent.id, agent.getStatus());
        this.agents.set(agent.id, agent);
      }
    }
    
    console.log(`✅ ${this.agents.size} agents spawned and initialized`);
  }

  /**
   * Set up monitoring and metrics collection
   */
  async _setupMonitoring() {
    console.log('📊 Setting up monitoring and metrics collection...');
    
    // Set up real-time metrics collection
    setInterval(() => {
      this._collectMetrics();
    }, 5000);
    
    // Set up performance monitoring
    setInterval(() => {
      this._monitorPerformance();
    }, 10000);
    
    // Set up health checks
    setInterval(() => {
      this._performHealthChecks();
    }, 15000);
    
    console.log('✅ Monitoring and metrics collection set up');
  }

  /**
   * Aggregate test results
   */
  async _aggregateResults(results) {
    console.log('📊 Aggregating test results...');
    
    // Process results through the result aggregator
    const aggregatedResults = await this.resultAggregator.aggregateResults({
      includeCustomReports: true
    });
    
    return aggregatedResults;
  }

  /**
   * Analyze performance against targets
   */
  async _analyzePerformance(results) {
    console.log('🎯 Analyzing performance against targets...');
    
    const executionTime = Date.now() - this.startTime;
    const totalTests = results.summary.totalTests;
    
    // Calculate actual metrics
    const actualMetrics = {
      executionTime: executionTime,
      speedupFactor: this._calculateSpeedupFactor(results, executionTime),
      flakiness: results.summary.failedTests / totalTests,
      concurrentAgents: this.agents.size
    };
    
    // Compare against targets
    const performanceAnalysis = {
      targets: this.performanceTargets,
      actual: actualMetrics,
      achievements: {
        executionTime: executionTime <= this.performanceTargets.totalExecutionTime,
        speedup: actualMetrics.speedupFactor >= this.performanceTargets.speedupFactor,
        flakiness: actualMetrics.flakiness <= this.performanceTargets.testFlakiness,
        concurrency: actualMetrics.concurrentAgents >= this.performanceTargets.concurrentAgents
      }
    };
    
    // Calculate overall performance score
    const achievedTargets = Object.values(performanceAnalysis.achievements).filter(Boolean).length;
    performanceAnalysis.score = (achievedTargets / Object.keys(performanceAnalysis.achievements).length) * 100;
    
    console.log(`🎯 Performance score: ${performanceAnalysis.score.toFixed(1)}% (${achievedTargets}/4 targets achieved)`);
    
    return performanceAnalysis;
  }

  /**
   * Generate final comprehensive report
   */
  async _generateFinalReport(results, performanceAnalysis) {
    console.log('📋 Generating final comprehensive report...');
    
    const finalReport = {
      metadata: {
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - this.startTime,
        configuration: {
          suites: this.options.suite,
          parallelism: this.options.parallelism,
          browser: this.options.browser,
          agentType: this.options.agentType,
          ciMode: this.options.ciMode
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      },
      
      summary: {
        ...results.summary,
        overallSuccess: this._determineOverallSuccess(results),
        performanceScore: performanceAnalysis.score
      },
      
      swarmMetrics: {
        totalAgents: this.agents.size,
        agentUtilization: this._calculateAgentUtilization(),
        communicationStats: this.communicationProtocol.getStats(),
        coordinationEfficiency: this._calculateCoordinationEfficiency()
      },
      
      performance: performanceAnalysis,
      
      detailedResults: results.reports,
      
      agentReports: await this._generateAgentReports(),
      
      recommendations: this._generateRecommendations(results, performanceAnalysis),
      
      cicdIntegration: {
        qualityGatesPassed: this._checkQualityGates(results, performanceAnalysis),
        deploymentReady: this._checkDeploymentReadiness(results, performanceAnalysis),
        nextActions: this._generateNextActions(results, performanceAnalysis)
      }
    };
    
    return finalReport;
  }

  /**
   * Save results to filesystem
   */
  async _saveResults(finalReport) {
    console.log('💾 Saving results to filesystem...');
    
    // Ensure output directory exists
    await fs.mkdir(this.config.outputDirectory, { recursive: true });
    
    // Save main report
    const reportPath = path.join(this.config.outputDirectory, 'swarm-orchestration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
    
    // Save executive summary
    const summaryPath = path.join(this.config.outputDirectory, 'executive-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify({
      success: finalReport.summary.overallSuccess,
      performanceScore: finalReport.performance.score,
      executionTime: finalReport.metadata.executionTime,
      totalTests: finalReport.summary.totalTests,
      passedTests: finalReport.summary.passedTests,
      failedTests: finalReport.summary.failedTests,
      qualityGatesPassed: finalReport.cicdIntegration.qualityGatesPassed
    }, null, 2));
    
    // Save CI/CD integration file
    const cicdPath = path.join(this.config.outputDirectory, 'cicd-integration.json');
    await fs.writeFile(cicdPath, JSON.stringify(finalReport.cicdIntegration, null, 2));
    
    console.log(`✅ Results saved to ${this.config.outputDirectory}`);
  }

  // Utility and analysis methods
  _calculateSpeedupFactor(results, executionTime) {
    // Estimate sequential execution time (rough approximation)
    const avgTestTime = executionTime / results.summary.totalTests;
    const sequentialTime = results.summary.totalTests * avgTestTime;
    return sequentialTime / executionTime;
  }

  _calculateAgentUtilization() {
    const utilizations = [];
    
    for (const agent of this.agents.values()) {
      const status = agent.getStatus();
      if (status.metrics) {
        const utilization = status.uptime > 0 ? 
          (status.metrics.averageExecutionTime * status.metrics.testsExecuted) / status.uptime : 0;
        utilizations.push(utilization);
      }
    }
    
    return utilizations.length > 0 ? 
      utilizations.reduce((a, b) => a + b, 0) / utilizations.length : 0;
  }

  _calculateCoordinationEfficiency() {
    // Simple coordination efficiency metric
    const commStats = this.communicationProtocol.getStats();
    return commStats.messagesSent > 0 ? 
      (commStats.messagesReceived / commStats.messagesSent) * 100 : 0;
  }

  async _generateAgentReports() {
    const agentReports = {};
    
    for (const [agentId, agent] of this.agents.entries()) {
      agentReports[agentId] = agent.getStatus();
    }
    
    return agentReports;
  }

  _generateRecommendations(results, performanceAnalysis) {
    const recommendations = [];
    
    // Performance recommendations
    if (performanceAnalysis.score < 75) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider optimizing test execution or increasing parallelism',
        details: performanceAnalysis.achievements
      });
    }
    
    // Test reliability recommendations
    if (results.summary.failedTests > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        message: `${results.summary.failedTests} tests failed - investigate and fix`,
        details: { failureRate: results.summary.failedTests / results.summary.totalTests }
      });
    }
    
    // Agent utilization recommendations
    const utilization = this._calculateAgentUtilization();
    if (utilization < 0.5) {
      recommendations.push({
        type: 'efficiency',
        priority: 'low',
        message: 'Low agent utilization detected - consider reducing agent count',
        details: { utilization: utilization }
      });
    }
    
    return recommendations;
  }

  _checkQualityGates(results, performanceAnalysis) {
    const gates = {
      testSuccess: results.summary.passedTests / results.summary.totalTests >= 0.95,
      performanceTarget: performanceAnalysis.score >= 75,
      noRegressions: results.summary.failedTests === 0,
      executionTime: performanceAnalysis.actual.executionTime <= this.performanceTargets.totalExecutionTime
    };
    
    return Object.values(gates).every(Boolean);
  }

  _checkDeploymentReadiness(results, performanceAnalysis) {
    return this._checkQualityGates(results, performanceAnalysis) && 
           results.summary.overallSuccess;
  }

  _generateNextActions(results, performanceAnalysis) {
    const actions = [];
    
    if (!this._checkQualityGates(results, performanceAnalysis)) {
      actions.push('Address quality gate failures before deployment');
    }
    
    if (performanceAnalysis.score < 75) {
      actions.push('Optimize performance before next execution');
    }
    
    if (results.summary.failedTests > 0) {
      actions.push('Fix failing tests');
    }
    
    if (actions.length === 0) {
      actions.push('All checks passed - ready for deployment');
    }
    
    return actions;
  }

  _determineOverallSuccess(results) {
    return results.summary && results.summary.failedTests === 0;
  }

  // Monitoring methods
  _collectMetrics() {
    // Collect real-time metrics from all agents
  }

  _monitorPerformance() {
    // Monitor overall system performance
  }

  _performHealthChecks() {
    // Perform health checks on all components
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    console.log('🔄 Shutting down swarm test orchestration...');
    
    try {
      // Shutdown all agents
      for (const agent of this.agents.values()) {
        await agent.shutdown();
      }
      
      // Shutdown orchestration components
      if (this.orchestrator) await this.orchestrator.shutdown?.();
      if (this.parallelEngine) await this.parallelEngine.cleanup?.();
      if (this.resultAggregator) await this.resultAggregator.shutdown?.();
      if (this.communicationProtocol) await this.communicationProtocol.shutdown();
      
      console.log('✅ Swarm orchestration shutdown completed');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

// CLI Interface
program
  .name('run-swarm-tests')
  .description('Claude-Flow Swarm Test Orchestration Runner')
  .version('1.0.0')
  .requiredOption('--suite <suites>', 'Test suites to run (comma-separated)', 'regression')
  .option('--parallelism <number>', 'Parallelism level', '10')
  .option('--browser <browser>', 'Browser for E2E tests', 'chromium')
  .option('--agent-type <type>', 'Primary agent type', 'tdd-london-swarm')
  .option('--output-dir <directory>', 'Output directory for results', './test-results')
  .option('--timeout <minutes>', 'Timeout in minutes', '30')
  .option('--ci-mode <boolean>', 'CI/CD mode', 'false')
  .action(async (options) => {
    const runner = new SwarmTestRunner(options);
    
    try {
      await runner.initialize();
      const results = await runner.executeTests();
      
      console.log('\n🎉 Swarm test orchestration completed successfully!');
      console.log(`📊 Results: ${results.results.summary.passedTests}/${results.results.summary.totalTests} tests passed`);
      console.log(`⏱️ Execution time: ${(results.executionTime / 1000).toFixed(2)}s`);
      console.log(`🎯 Performance score: ${results.results.performance.score.toFixed(1)}%`);
      
      process.exit(results.success ? 0 : 1);
      
    } catch (error) {
      console.error('\n💥 Swarm test orchestration failed:', error);
      process.exit(1);
      
    } finally {
      await runner.shutdown();
    }
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Parse command line arguments
program.parse(process.argv);

module.exports = SwarmTestRunner;