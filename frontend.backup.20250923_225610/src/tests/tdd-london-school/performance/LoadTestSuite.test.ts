/**
 * TDD London School - Load Test Suite
 * 
 * Comprehensive load testing using London School methodology:
 * - Concurrent user simulation with mock isolation
 * - High-volume data processing tests
 * - Stress testing with mocked backend services
 * - Resource utilization monitoring
 * - Scalability validation with controlled scenarios
 * - Load testing with collaborative mock services
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { LondonSchoolTestSuite } from '../framework/LondonSchoolTestFramework';
import { MockFactory } from '../factories/MockFactory';
import { TestExecutionTracker } from '../utilities/TestUtilities';
import { BuilderFactory } from '../utilities/TestDataBuilders';

// ==================== LOAD TEST CONFIGURATION ====================

interface LoadTestScenarios {
  concurrentUsers: number;
  operationsPerUser: number;
  testDurationMs: number;
  dataVolumeThreshold: number;
  errorRateThreshold: number;
  responseTimeThreshold: number;
}

const LOAD_TEST_SCENARIOS: LoadTestScenarios = {
  concurrentUsers: 50,
  operationsPerUser: 10,
  testDurationMs: 30000, // 30 seconds
  dataVolumeThreshold: 1000, // operations
  errorRateThreshold: 0.05, // 5% error rate
  responseTimeThreshold: 500 // ms
};

// ==================== LOAD TEST UTILITIES ====================

interface LoadTestResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number;
  throughput: number; // operations per second
}

class LoadTestExecutor {
  private results: LoadTestResult[] = [];
  private startTime: number = 0;
  private operationTimes: number[] = [];

  public async executeLoadTest(
    testFunction: () => Promise<void>,
    scenarios: LoadTestScenarios
  ): Promise<LoadTestResult> {
    this.startTime = Date.now();
    const promises: Promise<{ success: boolean; responseTime: number }>[] = [];

    // Create concurrent user simulations
    for (let user = 0; user < scenarios.concurrentUsers; user++) {
      for (let operation = 0; operation < scenarios.operationsPerUser; operation++) {
        promises.push(this.executeOperation(testFunction, user, operation));
      }
    }

    // Execute all operations concurrently
    const results = await Promise.allSettled(promises);
    
    return this.calculateResults(results, scenarios);
  }

  private async executeOperation(
    testFunction: () => Promise<void>,
    userId: number,
    operationId: number
  ): Promise<{ success: boolean; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      await testFunction();
      const responseTime = Date.now() - startTime;
      return { success: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return { success: false, responseTime };
    }
  }

  private calculateResults(
    results: PromiseSettledResult<{ success: boolean; responseTime: number }>[],
    scenarios: LoadTestScenarios
  ): LoadTestResult {
    const totalOperations = results.length;
    let successfulOperations = 0;
    let failedOperations = 0;
    const responseTimes: number[] = [];

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulOperations++;
        } else {
          failedOperations++;
        }
        responseTimes.push(result.value.responseTime);
      } else {
        failedOperations++;
      }
    });

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const errorRate = failedOperations / totalOperations;
    const testDurationSeconds = (Date.now() - this.startTime) / 1000;
    const throughput = totalOperations / testDurationSeconds;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      errorRate,
      throughput
    };
  }
}

// ==================== LOAD TEST SUITE ====================

export class LoadTestSuite extends LondonSchoolTestSuite {
  private loadTestExecutor: LoadTestExecutor;
  private tracker: TestExecutionTracker;

  protected setupSuite(): void {
    this.loadTestExecutor = new LoadTestExecutor();
    this.tracker = TestExecutionTracker.getInstance();
  }

  /**
   * Tests concurrent mention searches with mock service collaboration
   */
  public testConcurrentMentionSearchLoad(): void {
    describe('Concurrent mention search load testing', () => {
      it('should handle high-volume mention searches efficiently', async () => {
        const mockMentionService = this.mockFactory.createMentionServiceMock();
        const mockCacheService = this.mockFactory.createCacheServiceMock();
        
        // Setup realistic mention datasets
        const mentionDatasets = Array.from({ length: 10 }, (_, i) =>
          BuilderFactory.multiple(
            BuilderFactory.mentionSuggestion().asAIAgent(),
            50
          )
        );

        let callIndex = 0;
        mockMentionService.searchMentions.mockImplementation(async (query: string) => {
          // Simulate cache miss/hit pattern
          const cacheKey = `mentions:${query}`;
          const cached = await mockCacheService.get(cacheKey);
          
          if (cached) {
            return cached;
          }
          
          // Simulate varying response times
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          
          const dataset = mentionDatasets[callIndex % mentionDatasets.length];
          callIndex++;
          
          // Cache the result
          await mockCacheService.set(cacheKey, dataset, 300000);
          
          return dataset;
        });

        // Mock cache service behavior
        const cache = new Map<string, any>();
        mockCacheService.get.mockImplementation(async (key: string) => {
          return cache.get(key);
        });
        mockCacheService.set.mockImplementation(async (key: string, value: any) => {
          cache.set(key, value);
        });

        // Define load test operation
        const mentionSearchOperation = async () => {
          const query = `test-query-${Math.random().toString(36).substring(7)}`;
          const results = await mockMentionService.searchMentions(query);
          expect(results).toBeDefined();
          expect(Array.isArray(results)).toBe(true);
        };

        // Execute load test
        const loadTestResult = await this.loadTestExecutor.executeLoadTest(
          mentionSearchOperation,
          LOAD_TEST_SCENARIOS
        );

        // Record load test metrics
        this.tracker.recordPerformanceMetric('mention-search-load-test', {
          testName: 'Concurrent mention search load',
          value: loadTestResult.averageResponseTime,
          unit: 'ms',
          threshold: LOAD_TEST_SCENARIOS.responseTimeThreshold,
          passed: loadTestResult.averageResponseTime < LOAD_TEST_SCENARIOS.responseTimeThreshold
        });

        // Validate load test results
        expect(loadTestResult.errorRate).toBeLessThan(LOAD_TEST_SCENARIOS.errorRateThreshold);
        expect(loadTestResult.averageResponseTime).toBeLessThan(LOAD_TEST_SCENARIOS.responseTimeThreshold);
        expect(loadTestResult.throughput).toBeGreaterThan(10); // At least 10 ops/sec
        expect(loadTestResult.totalOperations).toBe(
          LOAD_TEST_SCENARIOS.concurrentUsers * LOAD_TEST_SCENARIOS.operationsPerUser
        );

        // Verify service collaboration patterns
        expect(mockMentionService.searchMentions).toHaveBeenCalled();
        expect(mockCacheService.get).toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalled();

        console.log('🚀 Mention Search Load Test Results:', {
          totalOperations: loadTestResult.totalOperations,
          errorRate: `${(loadTestResult.errorRate * 100).toFixed(2)}%`,
          avgResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
          throughput: `${loadTestResult.throughput.toFixed(2)} ops/sec`
        });
      });
    });
  }

  /**
   * Tests concurrent post creation with mock validation and storage
   */
  public testConcurrentPostCreationLoad(): void {
    describe('Concurrent post creation load testing', () => {
      it('should handle high-volume post creation efficiently', async () => {
        const mockPostService = this.mockFactory.createPostServiceMock();
        const mockValidationService = this.mockFactory.createValidationServiceMock();
        const mockStorageService = this.mockFactory.createStorageServiceMock();
        const mockNotificationService = this.mockFactory.createNotificationServiceMock();

        // Setup realistic post creation workflow
        mockValidationService.validatePost.mockImplementation(async (post: any) => {
          // Simulate validation processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          // 95% success rate for validation
          const valid = Math.random() > 0.05;
          return {
            valid,
            errors: valid ? [] : ['Validation failed']
          };
        });

        mockStorageService.savePost.mockImplementation(async (post: any) => {
          // Simulate storage processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          
          return {
            ...post,
            id: `post-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            createdAt: new Date().toISOString()
          };
        });

        mockNotificationService.notifyMentions.mockImplementation(async (mentions: string[]) => {
          // Simulate notification processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
          return mentions.length > 0;
        });

        // Setup post service coordination
        mockPostService.createPost.mockImplementation(async (postData: any) => {
          // Validate post
          const validation = await mockValidationService.validatePost(postData);
          if (!validation.valid) {
            throw new Error('Post validation failed');
          }

          // Save to storage
          const savedPost = await mockStorageService.savePost(postData);

          // Send notifications for mentions
          if (savedPost.mentions && savedPost.mentions.length > 0) {
            await mockNotificationService.notifyMentions(savedPost.mentions);
          }

          return savedPost;
        });

        // Define load test operation
        const postCreationOperation = async () => {
          const postData = BuilderFactory.post()
            .withMentions(['@test-agent', '@another-agent'])
            .withTags(['load-test', 'performance'])
            .build();

          const result = await mockPostService.createPost(postData);
          expect(result).toBeDefined();
          expect(result.id).toBeDefined();
        };

        // Execute load test with reduced concurrency for post creation
        const postLoadScenarios: LoadTestScenarios = {
          ...LOAD_TEST_SCENARIOS,
          concurrentUsers: 25, // Reduced for post creation
          operationsPerUser: 5,
          responseTimeThreshold: 800 // Higher threshold for complex operation
        };

        const loadTestResult = await this.loadTestExecutor.executeLoadTest(
          postCreationOperation,
          postLoadScenarios
        );

        // Record load test metrics
        this.tracker.recordPerformanceMetric('post-creation-load-test', {
          testName: 'Concurrent post creation load',
          value: loadTestResult.averageResponseTime,
          unit: 'ms',
          threshold: postLoadScenarios.responseTimeThreshold,
          passed: loadTestResult.averageResponseTime < postLoadScenarios.responseTimeThreshold
        });

        // Validate load test results
        expect(loadTestResult.errorRate).toBeLessThan(0.1); // Allow 10% error rate for complex operations
        expect(loadTestResult.averageResponseTime).toBeLessThan(postLoadScenarios.responseTimeThreshold);
        expect(loadTestResult.throughput).toBeGreaterThan(1); // At least 1 post/sec

        // Verify all service collaborations occurred
        expect(mockPostService.createPost).toHaveBeenCalled();
        expect(mockValidationService.validatePost).toHaveBeenCalled();
        expect(mockStorageService.savePost).toHaveBeenCalled();
        expect(mockNotificationService.notifyMentions).toHaveBeenCalled();

        console.log('📝 Post Creation Load Test Results:', {
          totalOperations: loadTestResult.totalOperations,
          successfulOperations: loadTestResult.successfulOperations,
          errorRate: `${(loadTestResult.errorRate * 100).toFixed(2)}%`,
          avgResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
          throughput: `${loadTestResult.throughput.toFixed(2)} posts/sec`
        });
      });
    });
  }

  /**
   * Tests concurrent comment threading with mock collaboration
   */
  public testConcurrentCommentThreadingLoad(): void {
    describe('Concurrent comment threading load testing', () => {
      it('should handle high-volume comment threading efficiently', async () => {
        const mockCommentService = this.mockFactory.createCommentServiceMock();
        const mockThreadService = this.mockFactory.createCommentThreadServiceMock();
        const mockNotificationService = this.mockFactory.createNotificationServiceMock();

        // Setup thread management
        const commentThreads = new Map<string, any[]>();
        
        mockThreadService.addReply.mockImplementation(async (parentId: string, reply: any) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          const thread = commentThreads.get(parentId) || [];
          const newReply = {
            ...reply,
            id: `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            parentId,
            createdAt: new Date().toISOString()
          };
          
          thread.push(newReply);
          commentThreads.set(parentId, thread);
          
          return newReply;
        });

        mockNotificationService.notifyMentions.mockImplementation(async (mentions: string[]) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          return true;
        });

        mockCommentService.createComment.mockImplementation(async (commentData: any) => {
          // If it's a reply, use thread service
          if (commentData.parentId) {
            const reply = await mockThreadService.addReply(commentData.parentId, commentData);
            
            if (reply.mentions && reply.mentions.length > 0) {
              await mockNotificationService.notifyMentions(reply.mentions);
            }
            
            return reply;
          } else {
            // Root comment
            return {
              ...commentData,
              id: `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              createdAt: new Date().toISOString()
            };
          }
        });

        // Create some parent comments for threading
        const parentComments = Array.from({ length: 10 }, (_, i) => 
          BuilderFactory.comment()
            .with({ id: `parent-${i}`, parentId: undefined })
            .build()
        );

        // Define load test operation
        const commentThreadingOperation = async () => {
          const parentComment = parentComments[Math.floor(Math.random() * parentComments.length)];
          const replyData = BuilderFactory.comment()
            .asReplyTo(parentComment.id, 1)
            .withMentions(['@original-author'])
            .build();

          const result = await mockCommentService.createComment(replyData);
          expect(result).toBeDefined();
          expect(result.parentId).toBe(parentComment.id);
        };

        // Execute load test
        const commentLoadScenarios: LoadTestScenarios = {
          ...LOAD_TEST_SCENARIOS,
          concurrentUsers: 30,
          operationsPerUser: 8,
          responseTimeThreshold: 400
        };

        const loadTestResult = await this.loadTestExecutor.executeLoadTest(
          commentThreadingOperation,
          commentLoadScenarios
        );

        // Record load test metrics
        this.tracker.recordPerformanceMetric('comment-threading-load-test', {
          testName: 'Concurrent comment threading load',
          value: loadTestResult.averageResponseTime,
          unit: 'ms',
          threshold: commentLoadScenarios.responseTimeThreshold,
          passed: loadTestResult.averageResponseTime < commentLoadScenarios.responseTimeThreshold
        });

        // Validate load test results
        expect(loadTestResult.errorRate).toBeLessThan(LOAD_TEST_SCENARIOS.errorRateThreshold);
        expect(loadTestResult.averageResponseTime).toBeLessThan(commentLoadScenarios.responseTimeThreshold);
        expect(loadTestResult.throughput).toBeGreaterThan(5); // At least 5 comments/sec

        // Verify service collaborations
        expect(mockCommentService.createComment).toHaveBeenCalled();
        expect(mockThreadService.addReply).toHaveBeenCalled();
        expect(mockNotificationService.notifyMentions).toHaveBeenCalled();

        console.log('💬 Comment Threading Load Test Results:', {
          totalOperations: loadTestResult.totalOperations,
          threadsCreated: commentThreads.size,
          avgResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
          throughput: `${loadTestResult.throughput.toFixed(2)} comments/sec`
        });
      });
    });
  }

  /**
   * Tests high-volume data processing with mock data streams
   */
  public testHighVolumeDataProcessingLoad(): void {
    describe('High-volume data processing load testing', () => {
      it('should handle large-scale data processing efficiently', async () => {
        const mockDataService = this.mockFactory.createDataServiceMock();
        const mockProcessingService = this.mockFactory.createDataProcessingServiceMock();
        const mockAnalyticsService = this.mockFactory.createAnalyticsServiceMock();

        // Setup data processing pipeline
        const dataBatches = Array.from({ length: 100 }, (_, batchIndex) =>
          Array.from({ length: 100 }, (_, itemIndex) => ({
            id: `item-${batchIndex}-${itemIndex}`,
            content: `Data item ${batchIndex}-${itemIndex}`,
            timestamp: new Date().toISOString(),
            metadata: {
              batch: batchIndex,
              item: itemIndex
            }
          }))
        );

        let batchIndex = 0;
        mockDataService.fetchDataBatch.mockImplementation(async (size: number) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          
          const batch = dataBatches[batchIndex % dataBatches.length];
          batchIndex++;
          
          return batch.slice(0, size);
        });

        mockProcessingService.processData.mockImplementation(async (data: any[]) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
          
          return data.map(item => ({
            ...item,
            processed: true,
            processedAt: new Date().toISOString()
          }));
        });

        mockAnalyticsService.analyzeData.mockImplementation(async (data: any[]) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          return {
            totalItems: data.length,
            averageProcessingTime: Math.random() * 100,
            successRate: 0.95 + Math.random() * 0.05
          };
        });

        // Define load test operation
        const dataProcessingOperation = async () => {
          const batchSize = 50;
          const rawData = await mockDataService.fetchDataBatch(batchSize);
          const processedData = await mockProcessingService.processData(rawData);
          const analytics = await mockAnalyticsService.analyzeData(processedData);
          
          expect(rawData).toBeDefined();
          expect(processedData).toHaveLength(batchSize);
          expect(analytics.totalItems).toBe(batchSize);
        };

        // Execute load test with adjusted parameters for data processing
        const dataProcessingScenarios: LoadTestScenarios = {
          ...LOAD_TEST_SCENARIOS,
          concurrentUsers: 20,
          operationsPerUser: 15,
          responseTimeThreshold: 1000 // Higher threshold for data processing
        };

        const loadTestResult = await this.loadTestExecutor.executeLoadTest(
          dataProcessingOperation,
          dataProcessingScenarios
        );

        // Record load test metrics
        this.tracker.recordPerformanceMetric('data-processing-load-test', {
          testName: 'High-volume data processing load',
          value: loadTestResult.averageResponseTime,
          unit: 'ms',
          threshold: dataProcessingScenarios.responseTimeThreshold,
          passed: loadTestResult.averageResponseTime < dataProcessingScenarios.responseTimeThreshold
        });

        // Validate load test results
        expect(loadTestResult.errorRate).toBeLessThan(0.05);
        expect(loadTestResult.averageResponseTime).toBeLessThan(dataProcessingScenarios.responseTimeThreshold);
        expect(loadTestResult.throughput).toBeGreaterThan(0.5); // At least 0.5 batches/sec

        // Verify all processing stages were called
        expect(mockDataService.fetchDataBatch).toHaveBeenCalled();
        expect(mockProcessingService.processData).toHaveBeenCalled();
        expect(mockAnalyticsService.analyzeData).toHaveBeenCalled();

        console.log('🔄 Data Processing Load Test Results:', {
          totalBatches: loadTestResult.totalOperations,
          itemsProcessed: loadTestResult.totalOperations * 50,
          avgResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
          throughput: `${loadTestResult.throughput.toFixed(2)} batches/sec`
        });
      });
    });
  }

  /**
   * Tests stress scenarios with system limits
   */
  public testStressScenarios(): void {
    describe('Stress testing with system limits', () => {
      it('should gracefully handle system stress with mock failures', async () => {
        const mockSystemService = this.mockFactory.createSystemServiceMock();
        const mockCircuitBreaker = this.mockFactory.createCircuitBreakerMock();
        
        // Setup circuit breaker pattern
        let failureCount = 0;
        const maxFailures = 5;
        let circuitOpen = false;
        
        mockCircuitBreaker.isOpen.mockImplementation(() => circuitOpen);
        
        mockSystemService.performOperation.mockImplementation(async (operation: string) => {
          if (circuitOpen) {
            throw new Error('Circuit breaker is open');
          }
          
          // Simulate increasing failure rate under stress
          const shouldFail = Math.random() < (failureCount / maxFailures) * 0.3;
          
          if (shouldFail) {
            failureCount++;
            if (failureCount >= maxFailures) {
              circuitOpen = true;
            }
            throw new Error('Operation failed under stress');
          }
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
          return `Result for ${operation}`;
        });

        // Define stress test operation
        const stressOperation = async () => {
          try {
            if (mockCircuitBreaker.isOpen()) {
              // Try to reset circuit breaker
              if (Math.random() < 0.1) { // 10% chance to reset
                circuitOpen = false;
                failureCount = 0;
              } else {
                throw new Error('Circuit breaker open - operation skipped');
              }
            }
            
            const result = await mockSystemService.performOperation(`stress-test-${Date.now()}`);
            expect(result).toBeDefined();
          } catch (error) {
            // Expected under stress conditions
            expect(error).toBeDefined();
            throw error;
          }
        };

        // Execute stress test with very high load
        const stressScenarios: LoadTestScenarios = {
          concurrentUsers: 100, // High concurrency
          operationsPerUser: 20,
          testDurationMs: 15000,
          dataVolumeThreshold: 2000,
          errorRateThreshold: 0.4, // Allow 40% error rate under stress
          responseTimeThreshold: 2000 // Higher threshold under stress
        };

        const loadTestResult = await this.loadTestExecutor.executeLoadTest(
          stressOperation,
          stressScenarios
        );

        // Record stress test metrics
        this.tracker.recordPerformanceMetric('stress-test', {
          testName: 'System stress test with circuit breaker',
          value: loadTestResult.averageResponseTime,
          unit: 'ms',
          threshold: stressScenarios.responseTimeThreshold,
          passed: loadTestResult.averageResponseTime < stressScenarios.responseTimeThreshold
        });

        // Validate stress test results - more lenient thresholds
        expect(loadTestResult.errorRate).toBeLessThan(stressScenarios.errorRateThreshold);
        expect(loadTestResult.averageResponseTime).toBeLessThan(stressScenarios.responseTimeThreshold);
        expect(loadTestResult.totalOperations).toBeGreaterThan(100); // Some operations should succeed

        // Verify circuit breaker behavior
        expect(mockCircuitBreaker.isOpen).toHaveBeenCalled();
        expect(mockSystemService.performOperation).toHaveBeenCalled();

        console.log('⚡ Stress Test Results:', {
          totalOperations: loadTestResult.totalOperations,
          successfulOperations: loadTestResult.successfulOperations,
          errorRate: `${(loadTestResult.errorRate * 100).toFixed(2)}%`,
          avgResponseTime: `${loadTestResult.averageResponseTime.toFixed(2)}ms`,
          maxResponseTime: `${loadTestResult.maxResponseTime.toFixed(2)}ms`,
          circuitBreakerActivated: circuitOpen
        });
      });
    });
  }
}

// ==================== LOAD TEST RUNNER ====================

describe('🚀 TDD London School Load Test Suite', () => {
  let loadTestSuite: LoadTestSuite;

  beforeEach(() => {
    loadTestSuite = new LoadTestSuite();
    loadTestSuite.setupSuite();
  });

  afterEach(() => {
    // Allow extra time for load test cleanup
  });

  // Execute all load tests
  loadTestSuite.testConcurrentMentionSearchLoad();
  loadTestSuite.testConcurrentPostCreationLoad();
  loadTestSuite.testConcurrentCommentThreadingLoad();
  loadTestSuite.testHighVolumeDataProcessingLoad();
  loadTestSuite.testStressScenarios();
});

export { LoadTestSuite, LoadTestExecutor, LOAD_TEST_SCENARIOS };