/**
 * Concurrent Users Load Testing Framework
 * 
 * Simulates multiple concurrent users interacting with Claude AI system:
 * - Instance creation/destruction load
 * - Concurrent message processing
 * - SSE connection stress testing
 * - Memory pressure under load
 * - Error recovery under stress
 */

const PerformanceBenchmarker = require('../../monitoring/performance-benchmarks');
const MemoryUsageTracker = require('../../monitoring/memory-usage-tracking');
const EventSource = require('eventsource');
const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class ConcurrentUserLoadTester {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      sseUrl: config.sseUrl || 'http://localhost:3000/sse',
      maxConcurrentUsers: config.maxConcurrentUsers || 20,
      testDuration: config.testDuration || 300000, // 5 minutes
      messageInterval: config.messageInterval || 5000, // 5 seconds between messages
      messagesPerUser: config.messagesPerUser || 10,
      rampUpTime: config.rampUpTime || 60000, // 1 minute ramp-up
      coolDownTime: config.coolDownTime || 30000, // 30 seconds cool-down
      resultsDir: config.resultsDir || './monitoring/load-test-results',
      ...config
    };
    
    this.benchmarker = new PerformanceBenchmarker({
      metricsDir: path.join(this.config.resultsDir, 'performance-metrics')
    });
    
    this.memoryTracker = new MemoryUsageTracker({
      metricsDir: path.join(this.config.resultsDir, 'memory-metrics')
    });
    
    this.activeUsers = new Map();
    this.testResults = {
      summary: {},
      userResults: [],
      systemMetrics: [],
      alerts: [],
      errors: []
    };
    
    this.testRunning = false;
    this.testStartTime = null;
  }

  async initialize() {
    try {
      await fs.mkdir(this.config.resultsDir, { recursive: true });
      await this.benchmarker.startMonitoring();
      await this.memoryTracker.startTracking();
      
      console.log('Concurrent user load tester initialized');
      
    } catch (error) {
      console.error('Failed to initialize load tester:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.benchmarker.stopMonitoring();
      await this.memoryTracker.stopTracking();
      
      // Clean up any remaining user sessions
      for (const [userId, user] of this.activeUsers) {
        await this.cleanupUser(user);
      }
      
      console.log('Load tester cleanup completed');
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Main load test execution
  async runLoadTest(testScenarios = ['basic_load', 'stress_test', 'spike_test']) {
    console.log(`Starting concurrent user load test with scenarios: ${testScenarios.join(', ')}`);
    
    await this.initialize();
    
    const testReport = {
      testId: `load-test-${Date.now()}`,
      startTime: new Date().toISOString(),
      scenarios: testScenarios,
      configuration: this.config,
      results: {}
    };
    
    try {
      for (const scenario of testScenarios) {
        console.log(`\n--- Running scenario: ${scenario} ---`);
        
        const scenarioResult = await this.executeScenario(scenario);
        testReport.results[scenario] = scenarioResult;
        
        // Cool down between scenarios
        if (testScenarios.indexOf(scenario) < testScenarios.length - 1) {
          console.log(`Cooling down for ${this.config.coolDownTime}ms...`);
          await this.sleep(this.config.coolDownTime);
        }
      }
      
      // Generate comprehensive report
      testReport.endTime = new Date().toISOString();
      testReport.summary = this.generateTestSummary(testReport.results);
      
      await this.saveTestReport(testReport);
      
      console.log('\nLoad test completed successfully');
      console.log(`Report saved: ${testReport.testId}`);
      
      return testReport;
      
    } catch (error) {
      console.error('Load test failed:', error);
      testReport.error = error.message;
      testReport.endTime = new Date().toISOString();
      
      await this.saveTestReport(testReport);
      throw error;
      
    } finally {
      await this.cleanup();
    }
  }

  async executeScenario(scenario) {
    switch (scenario) {
      case 'basic_load':
        return await this.runBasicLoadTest();
      case 'stress_test':
        return await this.runStressTest();
      case 'spike_test':
        return await this.runSpikeTest();
      case 'endurance_test':
        return await this.runEnduranceTest();
      case 'memory_pressure':
        return await this.runMemoryPressureTest();
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  // Basic load test: Gradual ramp-up to target concurrent users
  async runBasicLoadTest() {
    const targetUsers = Math.min(this.config.maxConcurrentUsers, 10);
    const scenarioResult = {
      scenario: 'basic_load',
      targetUsers,
      actualUsers: 0,
      startTime: Date.now(),
      userResults: [],
      systemMetrics: [],
      errors: []
    };
    
    console.log(`Basic load test: ramping up to ${targetUsers} concurrent users`);
    
    try {
      // Ramp up users gradually
      const rampUpInterval = this.config.rampUpTime / targetUsers;
      
      for (let i = 0; i < targetUsers; i++) {
        const userId = `basic-user-${i}`;
        const user = await this.createUser(userId, 'basic_load');
        
        if (user) {
          scenarioResult.actualUsers++;
          console.log(`User ${i + 1}/${targetUsers} created: ${userId}`);
        }
        
        // Wait between user creations
        if (i < targetUsers - 1) {
          await this.sleep(rampUpInterval);
        }
      }
      
      // Run test for specified duration
      console.log(`Running basic load test for ${this.config.testDuration}ms with ${scenarioResult.actualUsers} users`);
      await this.sleep(this.config.testDuration);
      
      // Collect results
      scenarioResult.userResults = await this.collectUserResults('basic_load');
      scenarioResult.systemMetrics = this.benchmarker.getPerformanceSummary();
      
      scenarioResult.endTime = Date.now();
      scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;
      
      return scenarioResult;
      
    } catch (error) {
      scenarioResult.error = error.message;
      throw error;
    }
  }

  // Stress test: Push system to its limits
  async runStressTest() {
    const targetUsers = this.config.maxConcurrentUsers;
    const scenarioResult = {
      scenario: 'stress_test',
      targetUsers,
      actualUsers: 0,
      startTime: Date.now(),
      userResults: [],
      systemMetrics: [],
      errors: []
    };
    
    console.log(`Stress test: pushing to ${targetUsers} concurrent users`);
    
    try {
      // Create all users quickly
      const creationPromises = [];
      
      for (let i = 0; i < targetUsers; i++) {
        const userId = `stress-user-${i}`;
        creationPromises.push(this.createUser(userId, 'stress_test'));
      }
      
      const users = await Promise.allSettled(creationPromises);
      scenarioResult.actualUsers = users.filter(u => u.status === 'fulfilled' && u.value).length;
      
      console.log(`Stress test: ${scenarioResult.actualUsers}/${targetUsers} users created successfully`);
      
      // Run intensive operations
      const testDuration = Math.min(this.config.testDuration, 120000); // Max 2 minutes for stress
      console.log(`Running stress test for ${testDuration}ms`);
      
      await this.sleep(testDuration);
      
      // Collect results
      scenarioResult.userResults = await this.collectUserResults('stress_test');
      scenarioResult.systemMetrics = this.benchmarker.getPerformanceSummary();
      
      scenarioResult.endTime = Date.now();
      scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;
      
      return scenarioResult;
      
    } catch (error) {
      scenarioResult.error = error.message;
      throw error;
    }
  }

  // Spike test: Sudden load increase
  async runSpikeTest() {
    const spikeUsers = Math.floor(this.config.maxConcurrentUsers * 0.8);
    const scenarioResult = {
      scenario: 'spike_test',
      spikeUsers,
      phases: [],
      startTime: Date.now(),
      userResults: [],
      systemMetrics: [],
      errors: []
    };
    
    console.log(`Spike test: sudden spike to ${spikeUsers} users`);
    
    try {
      // Phase 1: Normal load (20% of spike users)
      const normalUsers = Math.floor(spikeUsers * 0.2);
      console.log(`Phase 1: Creating ${normalUsers} baseline users`);
      
      for (let i = 0; i < normalUsers; i++) {
        const userId = `spike-baseline-${i}`;
        await this.createUser(userId, 'spike_baseline');
        await this.sleep(100); // Small delay
      }
      
      const phase1Metrics = this.benchmarker.getPerformanceSummary();
      scenarioResult.phases.push({
        phase: 'baseline',
        users: normalUsers,
        metrics: phase1Metrics,
        timestamp: Date.now()
      });
      
      // Phase 2: Sudden spike
      const spikeCreationStart = Date.now();
      console.log(`Phase 2: Creating spike of ${spikeUsers - normalUsers} additional users`);
      
      const spikePromises = [];
      for (let i = normalUsers; i < spikeUsers; i++) {
        const userId = `spike-user-${i}`;
        spikePromises.push(this.createUser(userId, 'spike_load'));
      }
      
      const spikeResults = await Promise.allSettled(spikePromises);
      const successfulSpike = spikeResults.filter(r => r.status === 'fulfilled' && r.value).length;
      
      const spikeCreationTime = Date.now() - spikeCreationStart;
      console.log(`Spike created: ${successfulSpike} users in ${spikeCreationTime}ms`);
      
      const phase2Metrics = this.benchmarker.getPerformanceSummary();
      scenarioResult.phases.push({
        phase: 'spike',
        users: successfulSpike,
        creationTime: spikeCreationTime,
        metrics: phase2Metrics,
        timestamp: Date.now()
      });
      
      // Phase 3: Maintain spike load
      console.log(`Phase 3: Maintaining spike load for 60 seconds`);
      await this.sleep(60000);
      
      const phase3Metrics = this.benchmarker.getPerformanceSummary();
      scenarioResult.phases.push({
        phase: 'maintain',
        metrics: phase3Metrics,
        timestamp: Date.now()
      });
      
      // Collect results
      scenarioResult.userResults = await this.collectUserResults('spike_test');
      scenarioResult.systemMetrics = this.benchmarker.getPerformanceSummary();
      
      scenarioResult.endTime = Date.now();
      scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;
      
      return scenarioResult;
      
    } catch (error) {
      scenarioResult.error = error.message;
      throw error;
    }
  }

  // Memory pressure test: Focus on memory usage patterns
  async runMemoryPressureTest() {
    const users = Math.min(this.config.maxConcurrentUsers, 15);
    const scenarioResult = {
      scenario: 'memory_pressure',
      targetUsers: users,
      actualUsers: 0,
      memorySnapshots: [],
      startTime: Date.now(),
      userResults: [],
      systemMetrics: [],
      errors: []
    };
    
    console.log(`Memory pressure test: ${users} users with large message payloads`);
    
    try {
      // Create users with memory tracking
      for (let i = 0; i < users; i++) {
        const userId = `memory-user-${i}`;
        const user = await this.createUser(userId, 'memory_pressure');
        
        if (user) {
          this.memoryTracker.trackInstance(userId, { testType: 'memory_pressure' });
          scenarioResult.actualUsers++;
        }
      }
      
      // Take memory snapshots throughout the test
      const snapshotInterval = setInterval(() => {
        const snapshot = {
          timestamp: Date.now(),
          systemMemory: process.memoryUsage(),
          instanceCount: this.activeUsers.size
        };
        scenarioResult.memorySnapshots.push(snapshot);
      }, 10000); // Every 10 seconds
      
      // Run memory-intensive operations
      console.log('Running memory-intensive operations...');
      
      const memoryOperations = [];
      for (const [userId, user] of this.activeUsers) {
        if (user.testType === 'memory_pressure') {
          memoryOperations.push(this.runMemoryIntensiveOperations(user));
        }
      }
      
      await Promise.allSettled(memoryOperations);
      
      clearInterval(snapshotInterval);
      
      // Collect results
      scenarioResult.userResults = await this.collectUserResults('memory_pressure');
      scenarioResult.systemMetrics = this.benchmarker.getPerformanceSummary();
      scenarioResult.memoryAnalysis = this.memoryTracker.getMemorySummary();
      
      scenarioResult.endTime = Date.now();
      scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;
      
      return scenarioResult;
      
    } catch (error) {
      scenarioResult.error = error.message;
      throw error;
    }
  }

  // Create a simulated user with Claude instance
  async createUser(userId, testType) {
    try {
      const userStartTime = performance.now();
      
      // Simulate Claude instance creation
      const instanceCreationBenchmark = await this.benchmarker.benchmarkInstanceLifecycle('create', { id: userId });
      
      const user = {
        userId,
        testType,
        instanceId: userId,
        createdAt: Date.now(),
        creationTime: performance.now() - userStartTime,
        instanceCreationBenchmark,
        sseConnection: null,
        messagesSent: 0,
        messagesReceived: 0,
        errors: [],
        benchmarks: [],
        active: true
      };
      
      // Create SSE connection
      try {
        user.sseConnection = await this.createSSEConnection(userId);
      } catch (error) {
        console.warn(`Failed to create SSE connection for user ${userId}:`, error.message);
        user.errors.push({ type: 'sse_connection', error: error.message, timestamp: Date.now() });
      }
      
      this.activeUsers.set(userId, user);
      
      // Start user activity
      this.startUserActivity(user);
      
      return user;
      
    } catch (error) {
      console.error(`Failed to create user ${userId}:`, error);
      return null;
    }
  }

  async createSSEConnection(userId) {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.config.sseUrl}?userId=${userId}`);
      
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('SSE connection timeout'));
      }, 5000);
      
      eventSource.onopen = () => {
        clearTimeout(timeout);
        console.log(`SSE connection established for user ${userId}`);
        resolve(eventSource);
      };
      
      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        console.error(`SSE connection error for user ${userId}:`, error);
        reject(error);
      };
      
      eventSource.onmessage = (event) => {
        const user = this.activeUsers.get(userId);
        if (user) {
          user.messagesReceived++;
          
          // Benchmark message delivery
          const messageData = JSON.parse(event.data);
          this.benchmarker.benchmarkSSEDelivery(userId, messageData);
        }
      };
    });
  }

  startUserActivity(user) {
    if (!user.active) return;
    
    // Send periodic messages to Claude
    const messageInterval = setInterval(async () => {
      if (!user.active || user.messagesSent >= this.config.messagesPerUser) {
        clearInterval(messageInterval);
        return;
      }
      
      try {
        await this.sendUserMessage(user);
      } catch (error) {
        user.errors.push({
          type: 'message_send',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }, this.config.messageInterval + Math.random() * 2000); // Add some jitter
  }

  async sendUserMessage(user) {
    const messageContent = this.generateMessageContent(user.testType, user.messagesSent);
    const messageData = {
      id: `${user.userId}-msg-${user.messagesSent}`,
      instanceId: user.instanceId,
      content: messageContent,
      timestamp: Date.now()
    };
    
    try {
      // Benchmark Claude response
      const benchmark = await this.benchmarker.benchmarkClaudeResponse(user.instanceId, messageData);
      user.benchmarks.push(benchmark);
      user.messagesSent++;
      
      console.log(`User ${user.userId}: Message ${user.messagesSent} sent (${benchmark.totalLatency.toFixed(2)}ms)`);
      
    } catch (error) {
      user.errors.push({
        type: 'claude_response',
        error: error.message,
        messageData,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  generateMessageContent(testType, messageIndex) {
    switch (testType) {
      case 'basic_load':
        return `Basic load test message ${messageIndex}: What is the capital of France?`;
        
      case 'stress_test':
        return `Stress test message ${messageIndex}: Analyze this complex data structure: ${JSON.stringify({
          data: new Array(100).fill(0).map((_, i) => ({ id: i, value: Math.random() }))
        })}`;
        
      case 'spike_load':
        return `Spike test message ${messageIndex}: Quick response needed for time-sensitive query`;
        
      case 'memory_pressure':
        // Large message content to pressure memory
        const largeContent = 'Memory pressure test data: ' + 'A'.repeat(10000 + messageIndex * 1000);
        return `Memory pressure message ${messageIndex}: Process this large dataset: ${largeContent}`;
        
      default:
        return `Test message ${messageIndex}: Hello from load test`;
    }
  }

  async runMemoryIntensiveOperations(user) {
    const operations = [
      'large_data_processing',
      'memory_allocation',
      'data_transformation',
      'cache_operations'
    ];
    
    for (const operation of operations) {
      try {
        await this.memoryTracker.trackOperation(
          user.instanceId,
          operation,
          async () => {
            // Simulate memory-intensive operation
            const data = new Array(50000).fill(0).map((_, i) => ({ 
              id: i, 
              value: Math.random(),
              payload: 'Data payload ' + 'X'.repeat(100) 
            }));
            
            // Process the data
            const processed = data.filter(item => item.value > 0.5).map(item => ({
              ...item,
              processed: true,
              timestamp: Date.now()
            }));
            
            // Simulate some delay
            await this.sleep(100);
            
            return processed.length;
          }
        );
        
        // Wait between operations
        await this.sleep(1000);
        
      } catch (error) {
        user.errors.push({
          type: 'memory_operation',
          operation,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
  }

  async collectUserResults(testType) {
    const userResults = [];
    
    for (const [userId, user] of this.activeUsers) {
      if (user.testType !== testType) continue;
      
      const userResult = {
        userId: user.userId,
        testType: user.testType,
        createdAt: user.createdAt,
        creationTime: user.creationTime,
        messagesSent: user.messagesSent,
        messagesReceived: user.messagesReceived,
        errorsCount: user.errors.length,
        benchmarksCount: user.benchmarks.length,
        avgResponseTime: user.benchmarks.length > 0 ? 
          user.benchmarks.reduce((sum, b) => sum + b.totalLatency, 0) / user.benchmarks.length : 0,
        maxResponseTime: user.benchmarks.length > 0 ? 
          Math.max(...user.benchmarks.map(b => b.totalLatency)) : 0,
        successRate: user.messagesSent > 0 ? 
          user.benchmarks.filter(b => b.success).length / user.messagesSent : 0
      };
      
      userResults.push(userResult);
    }
    
    return userResults;
  }

  async cleanupUser(user) {
    try {
      user.active = false;
      
      if (user.sseConnection) {
        user.sseConnection.close();
      }
      
      // Benchmark instance destruction
      await this.benchmarker.benchmarkInstanceLifecycle('destroy', { id: user.instanceId });
      
      // Stop memory tracking
      this.memoryTracker.stopInstanceTracking(user.instanceId);
      
      this.activeUsers.delete(user.userId);
      
    } catch (error) {
      console.error(`Error cleaning up user ${user.userId}:`, error);
    }
  }

  generateTestSummary(scenarioResults) {
    const summary = {
      totalScenarios: Object.keys(scenarioResults).length,
      totalUsers: 0,
      totalMessages: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      overallSuccessRate: 0,
      scenarioSummaries: {}
    };
    
    let totalBenchmarks = 0;
    let totalResponseTime = 0;
    let totalSuccessful = 0;
    
    for (const [scenario, result] of Object.entries(scenarioResults)) {
      const scenarioSummary = {
        users: result.actualUsers || result.targetUsers || 0,
        duration: result.duration || 0,
        errors: result.errors?.length || 0,
        success: !result.error
      };
      
      if (result.userResults) {
        scenarioSummary.messages = result.userResults.reduce((sum, u) => sum + u.messagesSent, 0);
        scenarioSummary.avgResponseTime = result.userResults.reduce((sum, u) => sum + u.avgResponseTime, 0) / result.userResults.length;
        scenarioSummary.successRate = result.userResults.reduce((sum, u) => sum + u.successRate, 0) / result.userResults.length;
        
        summary.totalUsers += scenarioSummary.users;
        summary.totalMessages += scenarioSummary.messages;
        summary.totalErrors += scenarioSummary.errors;
        
        totalResponseTime += scenarioSummary.avgResponseTime * result.userResults.length;
        totalBenchmarks += result.userResults.length;
        totalSuccessful += scenarioSummary.successRate * result.userResults.length;
      }
      
      summary.scenarioSummaries[scenario] = scenarioSummary;
    }
    
    if (totalBenchmarks > 0) {
      summary.averageResponseTime = totalResponseTime / totalBenchmarks;
      summary.overallSuccessRate = totalSuccessful / totalBenchmarks;
    }
    
    return summary;
  }

  async saveTestReport(testReport) {
    try {
      const filename = path.join(this.config.resultsDir, `${testReport.testId}.json`);
      await fs.writeFile(filename, JSON.stringify(testReport, null, 2));
      
      // Also save a summary report
      const summaryFilename = path.join(this.config.resultsDir, `${testReport.testId}-summary.json`);
      const summary = {
        testId: testReport.testId,
        timestamp: testReport.startTime,
        configuration: testReport.configuration,
        summary: testReport.summary,
        success: !testReport.error
      };
      
      await fs.writeFile(summaryFilename, JSON.stringify(summary, null, 2));
      
      console.log(`Test report saved: ${filename}`);
      
    } catch (error) {
      console.error('Failed to save test report:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface for running load tests
async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'basic_load';
  const maxUsers = parseInt(args[1]) || 10;
  const duration = parseInt(args[2]) || 60000; // 1 minute default
  
  console.log(`Starting load test: ${scenario} with ${maxUsers} users for ${duration}ms`);
  
  const loadTester = new ConcurrentUserLoadTester({
    maxConcurrentUsers: maxUsers,
    testDuration: duration
  });
  
  try {
    const scenarios = scenario === 'all' ? 
      ['basic_load', 'stress_test', 'spike_test', 'memory_pressure'] : 
      [scenario];
    
    const report = await loadTester.runLoadTest(scenarios);
    
    console.log('\n=== LOAD TEST SUMMARY ===');
    console.log(`Test ID: ${report.testId}`);
    console.log(`Total Users: ${report.summary.totalUsers}`);
    console.log(`Total Messages: ${report.summary.totalMessages}`);
    console.log(`Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`Overall Success Rate: ${(report.summary.overallSuccessRate * 100).toFixed(2)}%`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ConcurrentUserLoadTester;