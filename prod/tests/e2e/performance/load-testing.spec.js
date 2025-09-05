/**
 * Performance and Load Testing Suite
 * Tests system performance under various load conditions including
 * high-volume posting, concurrent users, and resource stress scenarios
 */

import { test, expect } from '@playwright/test';
import { AgentDashboardPage } from '../pages/agent-dashboard-page.js';
import { PostCreationPage } from '../pages/post-creation-page.js';
import { AnalyticsPage } from '../pages/analytics-page.js';
import { AuthHelpers } from '../utils/auth-helpers.js';
import { PerformanceHelpers, WaitHelpers } from '../utils/test-helpers.js';
import { TestDataGenerator } from '../fixtures/test-data-generator.js';

// Configure longer timeout for performance tests
test.setTimeout(120000); // 2 minutes

test.describe('Performance and Load Testing', () => {
  let performanceData = {};

  test.beforeAll(async () => {
    // Initialize performance baseline data
    performanceData = {
      startTime: Date.now(),
      testResults: []
    };
  });

  test.afterAll(async () => {
    // Generate performance report
    const totalTestTime = Date.now() - performanceData.startTime;
    console.log('Performance Test Summary:');
    console.log(`Total Test Duration: ${totalTestTime}ms`);
    console.log(`Average Test Duration: ${totalTestTime / performanceData.testResults.length}ms`);
    
    // Log performance metrics
    performanceData.testResults.forEach((result, index) => {
      console.log(`Test ${index + 1}: ${result.name} - ${result.duration}ms`);
    });
  });

  test('should handle high-volume post creation without performance degradation', async ({ page, context }) => {
    const testStart = Date.now();
    const authHelpers = new AuthHelpers(page);
    const dashboardPage = new AgentDashboardPage(page);
    const performanceHelpers = new PerformanceHelpers(page);
    
    await authHelpers.loginAsUser();
    await dashboardPage.navigate();
    
    // Start performance monitoring
    const networkMonitor = await performanceHelpers.startNetworkMonitoring();
    let memoryBaseline = await performanceHelpers.measureMemoryUsage();
    
    const postCreationTimes = [];
    const qualityScores = [];
    const optimizationTimes = [];
    
    // Create multiple posts rapidly
    const POST_COUNT = 10;
    
    for (let i = 0; i < POST_COUNT; i++) {
      const postStart = Date.now();
      
      const postPage = await dashboardPage.createPost();
      
      const postData = {
        title: `High Volume Test Post ${i + 1}`,
        content: `This is high volume test post number ${i + 1}. Testing system performance under rapid posting conditions with content optimization and quality assessment.`,
        hashtags: [`#volume${i + 1}`, '#performance', '#loadtest'],
        platforms: ['twitter']
      };
      
      const optimizationStart = Date.now();
      await postPage.createPost(postData);
      await postPage.waitForOptimization();
      
      const optimizationEnd = Date.now();
      optimizationTimes.push(optimizationEnd - optimizationStart);
      
      // Get quality assessment
      const assessment = await postPage.getQualityAssessment();
      if (assessment.quality) {
        qualityScores.push(assessment.quality);
      }
      
      // Save as draft to avoid rate limiting
      await postPage.saveDraft();
      
      const postEnd = Date.now();
      postCreationTimes.push(postEnd - postStart);
      
      // Brief pause to avoid overwhelming the system
      if (i < POST_COUNT - 1) {
        await page.waitForTimeout(500);
      }
    }
    
    // Analyze performance metrics
    const avgPostCreationTime = postCreationTimes.reduce((a, b) => a + b, 0) / postCreationTimes.length;
    const avgOptimizationTime = optimizationTimes.reduce((a, b) => a + b, 0) / optimizationTimes.length;
    const avgQualityScore = qualityScores.length > 0 ? 
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;
    
    // Performance assertions
    expect(avgPostCreationTime).toBeLessThan(30000); // 30 seconds per post
    expect(avgOptimizationTime).toBeLessThan(15000); // 15 seconds optimization
    
    if (avgQualityScore > 0) {
      expect(avgQualityScore).toBeGreaterThan(60); // Maintain quality standards
    }
    
    // Check for performance degradation over time
    const firstHalf = postCreationTimes.slice(0, Math.ceil(postCreationTimes.length / 2));
    const secondHalf = postCreationTimes.slice(Math.ceil(postCreationTimes.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    // Performance should not degrade by more than 50%
    expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    
    // Memory usage check
    const memoryFinal = await performanceHelpers.measureMemoryUsage();
    if (memoryBaseline && memoryFinal) {
      const memoryIncrease = memoryFinal.used - memoryBaseline.used;
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB increase
    }
    
    // Network performance check
    const networkStats = networkMonitor.getStats();
    expect(networkStats.errorCount).toBeLessThan(POST_COUNT * 0.1); // Less than 10% errors
    
    const testDuration = Date.now() - testStart;
    performanceData.testResults.push({
      name: 'High Volume Post Creation',
      duration: testDuration,
      avgPostTime: avgPostCreationTime,
      avgOptimizationTime: avgOptimizationTime,
      avgQuality: avgQualityScore
    });
    
    await authHelpers.logout();
  });

  test('should handle concurrent user sessions efficiently', async ({ browser }) => {
    const testStart = Date.now();
    const CONCURRENT_USERS = 5;
    const contexts = [];
    const sessions = [];
    
    try {
      // Create multiple browser contexts for concurrent users
      for (let i = 0; i < CONCURRENT_USERS; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        contexts.push(context);
        sessions.push({
          context,
          page,
          authHelpers: new AuthHelpers(page),
          dashboardPage: new AgentDashboardPage(page),
          performanceHelpers: new PerformanceHelpers(page)
        });
      }
      
      // Concurrent login and dashboard access
      const loginPromises = sessions.map(async (session, index) => {
        await session.authHelpers.login({
          email: `user${index + 1}@test.com`,
          password: 'TestPassword123!'
        });
        
        const dashboardStart = Date.now();
        await session.dashboardPage.navigate();
        await session.dashboardPage.waitForAgentsLoad();
        
        return {
          userId: index + 1,
          dashboardLoadTime: Date.now() - dashboardStart
        };
      });
      
      const loginResults = await Promise.all(loginPromises);
      
      // Verify all users logged in successfully
      expect(loginResults).toHaveLength(CONCURRENT_USERS);
      
      // Check dashboard load times are reasonable
      const avgDashboardLoadTime = loginResults.reduce((sum, result) => 
        sum + result.dashboardLoadTime, 0) / loginResults.length;
      expect(avgDashboardLoadTime).toBeLessThan(10000); // 10 seconds average
      
      // Concurrent post creation
      const postCreationPromises = sessions.map(async (session, index) => {
        const postPage = await session.dashboardPage.createPost();
        
        const postStart = Date.now();
        await postPage.createPost({
          title: `Concurrent User ${index + 1} Post`,
          content: `This post is created by concurrent user ${index + 1} during load testing.`,
          hashtags: [`#concurrent${index + 1}`, '#loadtest'],
          platforms: ['twitter']
        });
        
        await postPage.waitForOptimization();
        await postPage.saveDraft();
        
        return {
          userId: index + 1,
          postCreationTime: Date.now() - postStart
        };
      });
      
      const postResults = await Promise.all(postCreationPromises);
      
      // Verify concurrent post creation
      expect(postResults).toHaveLength(CONCURRENT_USERS);
      
      const avgPostCreationTime = postResults.reduce((sum, result) => 
        sum + result.postCreationTime, 0) / postResults.length;
      expect(avgPostCreationTime).toBeLessThan(25000); // 25 seconds average
      
      // Concurrent analytics access
      const analyticsPromises = sessions.map(async (session, index) => {
        const analyticsStart = Date.now();
        const analyticsPage = await session.dashboardPage.viewAnalytics();
        await analyticsPage.waitForDataLoad();
        
        const overview = await analyticsPage.getOverviewMetrics();
        
        return {
          userId: index + 1,
          analyticsLoadTime: Date.now() - analyticsStart,
          hasData: !!overview.totalEngagement
        };
      });
      
      const analyticsResults = await Promise.all(analyticsPromises);
      
      // Verify analytics performance under load
      expect(analyticsResults).toHaveLength(CONCURRENT_USERS);
      
      const avgAnalyticsLoadTime = analyticsResults.reduce((sum, result) => 
        sum + result.analyticsLoadTime, 0) / analyticsResults.length;
      expect(avgAnalyticsLoadTime).toBeLessThan(15000); // 15 seconds average
      
      const testDuration = Date.now() - testStart;
      performanceData.testResults.push({
        name: 'Concurrent User Sessions',
        duration: testDuration,
        concurrentUsers: CONCURRENT_USERS,
        avgDashboardLoad: avgDashboardLoadTime,
        avgPostCreation: avgPostCreationTime,
        avgAnalyticsLoad: avgAnalyticsLoadTime
      });
      
    } finally {
      // Cleanup all contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should maintain responsiveness under continuous agent coordination', async ({ page }) => {
    const testStart = Date.now();
    const authHelpers = new AuthHelpers(page);
    const dashboardPage = new AgentDashboardPage(page);
    const performanceHelpers = new PerformanceHelpers(page);
    const waitHelpers = new WaitHelpers(page);
    
    await authHelpers.loginAsPowerUser();
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Start performance monitoring
    const networkMonitor = await performanceHelpers.startNetworkMonitoring();
    let memoryBaseline = await performanceHelpers.measureMemoryUsage();
    
    const agents = await dashboardPage.getAgentsList();
    const activeAgents = agents.filter(agent => agent.status === 'active');
    
    if (activeAgents.length < 3) {
      test.skip('Need at least 3 active agents for coordination load test');
    }
    
    const responseTimeMetrics = [];
    const coordinationCycles = 5;
    
    for (let cycle = 0; cycle < coordinationCycles; cycle++) {
      const cycleStart = Date.now();
      
      // Initiate coordination
      const coordinatingAgents = activeAgents.slice(0, 3).map(agent => agent.name);
      await dashboardPage.initiateCoordination(coordinatingAgents);
      
      // Wait for coordination to establish
      await waitHelpers.waitForLoadingComplete(['[data-testid="coordination-loading"]']);
      
      // Measure response time for dashboard operations during coordination
      const dashboardOpStart = Date.now();
      await dashboardPage.getFeedOverview();
      const dashboardOpTime = Date.now() - dashboardOpStart;
      
      // Create post during coordination
      const postOpStart = Date.now();
      const postPage = await dashboardPage.createPost();
      await postPage.createPost({
        title: `Coordination Load Test Cycle ${cycle + 1}`,
        content: `Testing system responsiveness during coordination cycle ${cycle + 1}.`,
        hashtags: [`#cycle${cycle + 1}`, '#coordination', '#load'],
        platforms: ['twitter']
      });
      await postPage.waitForOptimization();
      await postPage.saveDraft();
      const postOpTime = Date.now() - postOpStart;
      
      // Check coordination status responsiveness
      const statusOpStart = Date.now();
      await dashboardPage.getCoordinationStatus();
      const statusOpTime = Date.now() - statusOpStart;
      
      const cycleTime = Date.now() - cycleStart;
      
      responseTimeMetrics.push({
        cycle: cycle + 1,
        totalTime: cycleTime,
        dashboardOpTime,
        postOpTime,
        statusOpTime
      });
      
      // Brief pause between cycles
      if (cycle < coordinationCycles - 1) {
        await page.waitForTimeout(2000);
      }
    }
    
    // Analyze performance consistency
    const avgCycleTime = responseTimeMetrics.reduce((sum, metric) => 
      sum + metric.totalTime, 0) / responseTimeMetrics.length;
    const avgDashboardOpTime = responseTimeMetrics.reduce((sum, metric) => 
      sum + metric.dashboardOpTime, 0) / responseTimeMetrics.length;
    const avgPostOpTime = responseTimeMetrics.reduce((sum, metric) => 
      sum + metric.postOpTime, 0) / responseTimeMetrics.length;
    
    // Performance assertions
    expect(avgCycleTime).toBeLessThan(45000); // 45 seconds per cycle
    expect(avgDashboardOpTime).toBeLessThan(5000); // 5 seconds for dashboard ops
    expect(avgPostOpTime).toBeLessThan(30000); // 30 seconds for post operations
    
    // Check for performance stability across cycles
    const firstHalfCycles = responseTimeMetrics.slice(0, Math.ceil(coordinationCycles / 2));
    const secondHalfCycles = responseTimeMetrics.slice(Math.ceil(coordinationCycles / 2));
    
    const firstHalfAvg = firstHalfCycles.reduce((sum, metric) => 
      sum + metric.totalTime, 0) / firstHalfCycles.length;
    const secondHalfAvg = secondHalfCycles.reduce((sum, metric) => 
      sum + metric.totalTime, 0) / secondHalfCycles.length;
    
    // Performance should remain stable (within 30% variance)
    expect(Math.abs(secondHalfAvg - firstHalfAvg)).toBeLessThan(firstHalfAvg * 0.3);
    
    // Memory usage check
    const memoryFinal = await performanceHelpers.measureMemoryUsage();
    if (memoryBaseline && memoryFinal) {
      const memoryIncrease = memoryFinal.used - memoryBaseline.used;
      expect(memoryIncrease).toBeLessThan(150 * 1024 * 1024); // Less than 150MB increase
    }
    
    const testDuration = Date.now() - testStart;
    performanceData.testResults.push({
      name: 'Continuous Agent Coordination',
      duration: testDuration,
      cycles: coordinationCycles,
      avgCycleTime,
      avgDashboardOpTime,
      avgPostOpTime
    });
    
    await authHelpers.logout();
  });

  test('should handle analytics data processing under load', async ({ page }) => {
    const testStart = Date.now();
    const authHelpers = new AuthHelpers(page);
    const dashboardPage = new AgentDashboardPage(page);
    const performanceHelpers = new PerformanceHelpers(page);
    
    await authHelpers.loginAsUser();
    await dashboardPage.navigate();
    
    // Generate large dataset for performance testing
    const dataGenerator = new TestDataGenerator();
    const performanceData = dataGenerator.generatePerformanceTestData(5); // 5x normal data
    
    // Navigate to analytics
    const analyticsPage = await dashboardPage.viewAnalytics();
    
    const analyticsOperations = [];
    
    // Test various analytics operations under load
    const operations = [
      async () => {
        const start = Date.now();
        await analyticsPage.getOverviewMetrics();
        return { operation: 'overview', duration: Date.now() - start };
      },
      async () => {
        const start = Date.now();
        await analyticsPage.setTimePeriod('30d');
        return { operation: 'timePeriod', duration: Date.now() - start };
      },
      async () => {
        const start = Date.now();
        await analyticsPage.getTopPosts(20);
        return { operation: 'topPosts', duration: Date.now() - start };
      },
      async () => {
        const start = Date.now();
        await analyticsPage.getPlatformPerformance();
        return { operation: 'platformPerformance', duration: Date.now() - start };
      },
      async () => {
        const start = Date.now();
        await analyticsPage.getIntelligenceInsights();
        return { operation: 'intelligenceInsights', duration: Date.now() - start };
      }
    ];
    
    // Run operations multiple times
    for (let iteration = 0; iteration < 3; iteration++) {
      for (const operation of operations) {
        try {
          const result = await operation();
          analyticsOperations.push({ ...result, iteration: iteration + 1 });
        } catch (error) {
          analyticsOperations.push({
            operation: 'unknown',
            duration: 0,
            iteration: iteration + 1,
            error: error.message
          });
        }
        
        // Brief pause between operations
        await page.waitForTimeout(1000);
      }
    }
    
    // Analyze performance metrics
    const operationTypes = [...new Set(analyticsOperations.map(op => op.operation))];
    const performanceByOperation = {};
    
    for (const opType of operationTypes) {
      const operationsOfType = analyticsOperations.filter(op => op.operation === opType && !op.error);
      if (operationsOfType.length > 0) {
        const avgDuration = operationsOfType.reduce((sum, op) => sum + op.duration, 0) / operationsOfType.length;
        const maxDuration = Math.max(...operationsOfType.map(op => op.duration));
        
        performanceByOperation[opType] = {
          avgDuration,
          maxDuration,
          operations: operationsOfType.length
        };
      }
    }
    
    // Performance assertions for analytics operations
    if (performanceByOperation.overview) {
      expect(performanceByOperation.overview.avgDuration).toBeLessThan(8000); // 8 seconds
    }
    if (performanceByOperation.topPosts) {
      expect(performanceByOperation.topPosts.avgDuration).toBeLessThan(10000); // 10 seconds
    }
    if (performanceByOperation.platformPerformance) {
      expect(performanceByOperation.platformPerformance.avgDuration).toBeLessThan(6000); // 6 seconds
    }
    
    // Check for errors
    const errorCount = analyticsOperations.filter(op => op.error).length;
    expect(errorCount).toBeLessThan(analyticsOperations.length * 0.1); // Less than 10% errors
    
    const testDuration = Date.now() - testStart;
    performanceData.testResults.push({
      name: 'Analytics Data Processing Load',
      duration: testDuration,
      totalOperations: analyticsOperations.length,
      errorCount,
      performanceByOperation
    });
    
    await authHelpers.logout();
  });

  test('should recover gracefully from resource exhaustion', async ({ page }) => {
    const testStart = Date.now();
    const authHelpers = new AuthHelpers(page);
    const dashboardPage = new AgentDashboardPage(page);
    const performanceHelpers = new PerformanceHelpers(page);
    
    await authHelpers.loginAsUser();
    await dashboardPage.navigate();
    
    // Simulate resource exhaustion by creating many simultaneous operations
    const simultaneousOperations = [];
    const OPERATION_COUNT = 20;
    
    for (let i = 0; i < OPERATION_COUNT; i++) {
      const operation = async () => {
        try {
          const postPage = await dashboardPage.createPost();
          await postPage.createPost({
            title: `Resource Test Post ${i + 1}`,
            content: `Resource exhaustion test post ${i + 1} with large content that requires significant processing.`.repeat(10),
            hashtags: [`#resource${i + 1}`, '#exhaustion', '#recovery'],
            platforms: ['twitter', 'facebook', 'instagram']
          });
          
          await postPage.waitForOptimization();
          return { success: true, index: i + 1 };
        } catch (error) {
          return { success: false, index: i + 1, error: error.message };
        }
      };
      
      simultaneousOperations.push(operation());
    }
    
    // Wait for all operations to complete or fail
    const results = await Promise.allSettled(simultaneousOperations);
    
    // Analyze results
    const successfulOps = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    const failedOps = results.length - successfulOps;
    
    // System should handle at least 50% of operations successfully
    expect(successfulOps).toBeGreaterThan(OPERATION_COUNT * 0.5);
    
    // Wait for system to stabilize
    await page.waitForTimeout(5000);
    
    // Verify system recovery by testing normal operations
    const recoveryTestStart = Date.now();
    const postPage = await dashboardPage.createPost();
    
    await postPage.createPost({
      title: 'Recovery Test Post',
      content: 'This post tests system recovery after resource exhaustion.',
      hashtags: ['#recovery', '#resilience'],
      platforms: ['twitter']
    });
    
    await postPage.waitForOptimization();
    const assessment = await postPage.getQualityAssessment();
    
    // System should recover normal functionality
    expect(assessment.quality).toBeGreaterThan(50);
    
    const recoveryTime = Date.now() - recoveryTestStart;
    expect(recoveryTime).toBeLessThan(20000); // Recovery should be quick
    
    const testDuration = Date.now() - testStart;
    performanceData.testResults.push({
      name: 'Resource Exhaustion Recovery',
      duration: testDuration,
      totalOperations: OPERATION_COUNT,
      successfulOps,
      failedOps,
      recoveryTime
    });
    
    await authHelpers.logout();
  });

  test('should maintain database performance under concurrent writes', async ({ browser }) => {
    const testStart = Date.now();
    const CONCURRENT_WRITERS = 3;
    const POSTS_PER_WRITER = 5;
    
    const contexts = [];
    const sessions = [];
    
    try {
      // Create concurrent sessions
      for (let i = 0; i < CONCURRENT_WRITERS; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        contexts.push(context);
        sessions.push({
          context,
          page,
          authHelpers: new AuthHelpers(page),
          dashboardPage: new AgentDashboardPage(page),
          writerId: i + 1
        });
      }
      
      // Login all sessions
      await Promise.all(sessions.map(session => session.authHelpers.loginAsUser()));
      
      // Concurrent database writes through post creation
      const writeOperations = sessions.map(async (session) => {
        const results = [];
        
        await session.dashboardPage.navigate();
        await session.dashboardPage.waitForAgentsLoad();
        
        for (let postIndex = 0; postIndex < POSTS_PER_WRITER; postIndex++) {
          const writeStart = Date.now();
          
          try {
            const postPage = await session.dashboardPage.createPost();
            
            await postPage.createPost({
              title: `Writer ${session.writerId} Post ${postIndex + 1}`,
              content: `Concurrent database write test from writer ${session.writerId}, post ${postIndex + 1}.`,
              hashtags: [`#writer${session.writerId}`, `#post${postIndex + 1}`, '#dbtest'],
              platforms: ['twitter']
            });
            
            await postPage.waitForOptimization();
            await postPage.saveDraft();
            
            const writeDuration = Date.now() - writeStart;
            results.push({
              writerId: session.writerId,
              postIndex: postIndex + 1,
              duration: writeDuration,
              success: true
            });
            
          } catch (error) {
            const writeDuration = Date.now() - writeStart;
            results.push({
              writerId: session.writerId,
              postIndex: postIndex + 1,
              duration: writeDuration,
              success: false,
              error: error.message
            });
          }
          
          // Brief pause between writes from same session
          if (postIndex < POSTS_PER_WRITER - 1) {
            await session.page.waitForTimeout(1000);
          }
        }
        
        return results;
      });
      
      const allResults = await Promise.all(writeOperations);
      const flatResults = allResults.flat();
      
      // Analyze database performance
      const successfulWrites = flatResults.filter(result => result.success);
      const failedWrites = flatResults.filter(result => !result.success);
      
      const avgWriteTime = successfulWrites.reduce((sum, result) => 
        sum + result.duration, 0) / successfulWrites.length;
      
      // Performance assertions
      expect(successfulWrites.length).toBeGreaterThan(flatResults.length * 0.8); // 80% success rate
      expect(avgWriteTime).toBeLessThan(15000); // 15 seconds average write time
      expect(failedWrites.length).toBeLessThan(flatResults.length * 0.2); // Less than 20% failures
      
      // Check for performance consistency across concurrent writers
      const writerPerformance = {};
      for (let i = 1; i <= CONCURRENT_WRITERS; i++) {
        const writerResults = successfulWrites.filter(result => result.writerId === i);
        if (writerResults.length > 0) {
          writerPerformance[i] = {
            avgDuration: writerResults.reduce((sum, result) => sum + result.duration, 0) / writerResults.length,
            successCount: writerResults.length
          };
        }
      }
      
      // Performance should be relatively consistent across writers
      const writerAvgs = Object.values(writerPerformance).map(perf => perf.avgDuration);
      const maxWriterAvg = Math.max(...writerAvgs);
      const minWriterAvg = Math.min(...writerAvgs);
      
      // Variance between writers should be reasonable (within 100%)
      expect(maxWriterAvg).toBeLessThan(minWriterAvg * 2);
      
      const testDuration = Date.now() - testStart;
      performanceData.testResults.push({
        name: 'Concurrent Database Writes',
        duration: testDuration,
        concurrentWriters: CONCURRENT_WRITERS,
        totalWrites: flatResults.length,
        successfulWrites: successfulWrites.length,
        avgWriteTime,
        writerPerformance
      });
      
    } finally {
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    }
  });
});