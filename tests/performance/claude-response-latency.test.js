/**
 * Claude Response Latency and Performance Tests
 * 
 * Performance benchmarking and latency measurement tests for the Claude AI response system.
 * Establishes performance baselines and validates system performance under various loads.
 */

import { jest, describe, test, beforeEach, afterEach, beforeAll, afterAll, expect } from '@jest/globals';
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';
import fs from 'fs/promises';
import path from 'path';

const TEST_CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  PERFORMANCE_TIMEOUT: 60000,
  STRESS_TEST_DURATION: 30000,
  BASELINE_THRESHOLDS: {
    instanceCreation: 5000,      // 5 seconds
    sseConnection: 3000,         // 3 seconds  
    firstResponse: 15000,        // 15 seconds
    subsequentResponse: 10000,   // 10 seconds
    instanceDeletion: 2000       // 2 seconds
  },
  LOAD_TEST: {
    concurrentInstances: 5,
    messagesPerInstance: 10,
    messageInterval: 1000
  }
};

class PerformanceMetrics {
  constructor() {
    this.metrics = [];
    this.testStartTime = Date.now();
  }

  recordMetric(operation, startTime, endTime, metadata = {}) {
    const duration = endTime - startTime;
    const metric = {
      operation,
      duration,
      timestamp: startTime,
      metadata,
      testSession: this.testStartTime
    };
    this.metrics.push(metric);
    return metric;
  }

  getMetricsByOperation(operation) {
    return this.metrics.filter(m => m.operation === operation);
  }

  getAverageLatency(operation) {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;
    return operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
  }

  getPercentile(operation, percentile) {
    const operationMetrics = this.getMetricsByOperation(operation);
    if (operationMetrics.length === 0) return 0;
    
    const sorted = operationMetrics.map(m => m.duration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport() {
    const operations = [...new Set(this.metrics.map(m => m.operation))];
    const report = {
      testSession: this.testStartTime,
      timestamp: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      operations: {}
    };

    operations.forEach(operation => {
      const operationMetrics = this.getMetricsByOperation(operation);
      report.operations[operation] = {
        count: operationMetrics.length,
        averageLatency: Math.round(this.getAverageLatency(operation)),
        minLatency: Math.min(...operationMetrics.map(m => m.duration)),
        maxLatency: Math.max(...operationMetrics.map(m => m.duration)),
        p50: Math.round(this.getPercentile(operation, 50)),
        p95: Math.round(this.getPercentile(operation, 95)),
        p99: Math.round(this.getPercentile(operation, 99))
      };
    });

    return report;
  }

  async saveReport(filename) {
    const report = this.generateReport();
    const reportPath = path.join(process.cwd(), 'tests', 'reports', filename);
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Performance report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('Failed to save performance report:', error.message);
    }
    
    return report;
  }
}

class ClaudePerformanceTester {
  constructor(metrics) {
    this.metrics = metrics;
    this.activeInstances = [];
    this.sseConnections = [];
  }

  async timedOperation(operation, asyncFunction) {
    const startTime = Date.now();
    try {
      const result = await asyncFunction();
      const endTime = Date.now();
      this.metrics.recordMetric(operation, startTime, endTime, { success: true });
      return { result, duration: endTime - startTime };
    } catch (error) {
      const endTime = Date.now();
      this.metrics.recordMetric(operation, startTime, endTime, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }

  async createInstanceWithTiming() {
    const { result } = await this.timedOperation('instanceCreation', async () => {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'claude --dangerously-skip-permissions',
          name: `perf-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'skip-permissions'
        })
      });

      if (!response.ok) {
        throw new Error(`Instance creation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.instanceId;
    });

    this.activeInstances.push(result);
    return result;
  }

  async waitForInstanceReadyWithTiming(instanceId) {
    await this.timedOperation('instanceReady', async () => {
      const startTime = Date.now();
      while (Date.now() - startTime < 30000) { // 30 second timeout
        const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances`);
        const data = await response.json();
        const instance = data.instances?.find(i => i.id === instanceId);
        
        if (instance && (instance.status === 'running' || instance.status === 'ready')) {
          return instance;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error(`Instance ${instanceId} not ready within timeout`);
    });
  }

  async establishSSEWithTiming(instanceId) {
    const { result } = await this.timedOperation('sseConnection', async () => {
      return new Promise((resolve, reject) => {
        const eventSource = new EventSource(
          `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`
        );

        this.sseConnections.push(eventSource);

        const timeout = setTimeout(() => {
          eventSource.close();
          reject(new Error('SSE connection timeout'));
        }, 10000);

        eventSource.onopen = () => {
          clearTimeout(timeout);
          resolve(eventSource);
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          eventSource.close();
          reject(error);
        };
      });
    });

    return result;
  }

  async sendMessageWithTiming(instanceId, message, expectResponse = true) {
    const { result, duration } = await this.timedOperation('messageSend', async () => {
      const response = await fetch(
        `${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}/terminal/input`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: message })
        }
      );

      if (!response.ok) {
        throw new Error(`Message send failed: ${response.status}`);
      }

      return response.json();
    });

    if (expectResponse) {
      // Measure time to first response
      const responseStartTime = Date.now();
      await this.waitForSSEResponse(instanceId);
      const responseEndTime = Date.now();
      
      this.metrics.recordMetric('responseLatency', responseStartTime, responseEndTime, {
        message: message.substring(0, 50)
      });
    }

    return { result, sendDuration: duration };
  }

  async waitForSSEResponse(instanceId) {
    return new Promise((resolve, reject) => {
      const eventSource = this.sseConnections.find(es => 
        es.url.includes(instanceId) && es.readyState === EventSource.OPEN
      );

      if (!eventSource) {
        reject(new Error('No active SSE connection found'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('SSE response timeout'));
      }, 20000);

      const messageHandler = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'terminal_output' && data.isReal && data.data?.trim()) {
            clearTimeout(timeout);
            eventSource.removeEventListener('message', messageHandler);
            resolve(data);
          }
        } catch (error) {
          // Ignore parsing errors, continue waiting
        }
      };

      eventSource.addEventListener('message', messageHandler);
    });
  }

  async deleteInstanceWithTiming(instanceId) {
    await this.timedOperation('instanceDeletion', async () => {
      const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Instance deletion failed: ${response.status}`);
      }

      return response.json();
    });

    this.activeInstances = this.activeInstances.filter(id => id !== instanceId);
  }

  async cleanup() {
    // Close SSE connections
    this.sseConnections.forEach(es => {
      if (es.readyState === EventSource.OPEN) {
        es.close();
      }
    });
    this.sseConnections = [];

    // Delete instances
    const deletePromises = this.activeInstances.map(instanceId => 
      this.deleteInstanceWithTiming(instanceId).catch(error => 
        console.warn(`Failed to cleanup instance ${instanceId}:`, error.message)
      )
    );

    await Promise.all(deletePromises);
  }
}

describe('Claude Response Latency and Performance Tests', () => {
  let performanceMetrics;
  let performanceTester;

  beforeAll(async () => {
    // Verify backend is running
    const response = await fetch(`${TEST_CONFIG.API_BASE_URL}/health`);
    expect(response.ok).toBe(true);
  });

  beforeEach(() => {
    performanceMetrics = new PerformanceMetrics();
    performanceTester = new ClaudePerformanceTester(performanceMetrics);
  });

  afterEach(async () => {
    await performanceTester.cleanup();
  });

  describe('Baseline Performance Measurements', () => {
    test('should measure instance creation latency', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      
      const creationMetrics = performanceMetrics.getMetricsByOperation('instanceCreation');
      expect(creationMetrics).toHaveLength(1);
      
      const latency = creationMetrics[0].duration;
      console.log(`📊 Instance creation latency: ${latency}ms`);
      
      expect(latency).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.instanceCreation);
      expect(instanceId).toMatch(/^claude-[a-zA-Z0-9]+$/);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);

    test('should measure SSE connection establishment latency', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(instanceId);
      
      const eventSource = await performanceTester.establishSSEWithTiming(instanceId);
      
      const sseMetrics = performanceMetrics.getMetricsByOperation('sseConnection');
      expect(sseMetrics).toHaveLength(1);
      
      const latency = sseMetrics[0].duration;
      console.log(`📊 SSE connection latency: ${latency}ms`);
      
      expect(latency).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.sseConnection);
      expect(eventSource.readyState).toBe(EventSource.OPEN);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);

    test('should measure first response latency', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(instanceId);
      await performanceTester.establishSSEWithTiming(instanceId);

      const testMessage = 'What is 2+2? Please respond with just the number.';
      await performanceTester.sendMessageWithTiming(instanceId, testMessage, true);
      
      const responseMetrics = performanceMetrics.getMetricsByOperation('responseLatency');
      expect(responseMetrics).toHaveLength(1);
      
      const latency = responseMetrics[0].duration;
      console.log(`📊 First response latency: ${latency}ms`);
      
      expect(latency).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.firstResponse);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);

    test('should measure subsequent response latencies', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(instanceId);
      await performanceTester.establishSSEWithTiming(instanceId);

      // Send first message
      await performanceTester.sendMessageWithTiming(instanceId, 'What is 1+1?', true);
      
      // Wait a bit between messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send subsequent messages
      const messages = [
        'What is 3+3?',
        'What is 5+5?',
        'What is 7+7?'
      ];

      for (const message of messages) {
        await performanceTester.sendMessageWithTiming(instanceId, message, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const responseMetrics = performanceMetrics.getMetricsByOperation('responseLatency');
      expect(responseMetrics.length).toBeGreaterThanOrEqual(4);
      
      // Check subsequent responses (skip first)
      const subsequentMetrics = responseMetrics.slice(1);
      const avgSubsequentLatency = subsequentMetrics.reduce((sum, m) => sum + m.duration, 0) / subsequentMetrics.length;
      
      console.log(`📊 Average subsequent response latency: ${Math.round(avgSubsequentLatency)}ms`);
      console.log(`📊 Response latencies: ${subsequentMetrics.map(m => m.duration).join('ms, ')}ms`);
      
      expect(avgSubsequentLatency).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.subsequentResponse);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);

    test('should measure instance deletion latency', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(instanceId);

      await performanceTester.deleteInstanceWithTiming(instanceId);
      
      const deletionMetrics = performanceMetrics.getMetricsByOperation('instanceDeletion');
      expect(deletionMetrics).toHaveLength(1);
      
      const latency = deletionMetrics[0].duration;
      console.log(`📊 Instance deletion latency: ${latency}ms`);
      
      expect(latency).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.instanceDeletion);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);
  });

  describe('Concurrent Load Testing', () => {
    test('should handle concurrent instance creation and messaging', async () => {
      const { concurrentInstances, messagesPerInstance } = TEST_CONFIG.LOAD_TEST;
      
      console.log(`📊 Starting load test: ${concurrentInstances} instances, ${messagesPerInstance} messages each`);
      
      // Create instances concurrently
      const instancePromises = Array(concurrentInstances).fill(null).map(() => 
        performanceTester.createInstanceWithTiming()
      );
      
      const instanceIds = await Promise.all(instancePromises);
      
      // Wait for all instances to be ready
      await Promise.all(instanceIds.map(id => 
        performanceTester.waitForInstanceReadyWithTiming(id)
      ));
      
      // Establish SSE connections
      await Promise.all(instanceIds.map(id => 
        performanceTester.establishSSEWithTiming(id)
      ));
      
      // Send messages to all instances concurrently
      const messagePromises = [];
      
      for (let i = 0; i < messagesPerInstance; i++) {
        for (const instanceId of instanceIds) {
          messagePromises.push(
            performanceTester.sendMessageWithTiming(
              instanceId, 
              `Load test message ${i + 1}`,
              true
            )
          );
        }
        
        // Small delay between message rounds
        if (i < messagesPerInstance - 1) {
          await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.LOAD_TEST.messageInterval));
        }
      }
      
      const results = await Promise.allSettled(messagePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;
      
      console.log(`📊 Load test results: ${successCount} successful, ${errorCount} failed`);
      console.log(`📊 Success rate: ${(successCount / results.length * 100).toFixed(1)}%`);
      
      // Analyze performance under load
      const responseMetrics = performanceMetrics.getMetricsByOperation('responseLatency');
      const avgResponseTime = performanceMetrics.getAverageLatency('responseLatency');
      const p95ResponseTime = performanceMetrics.getPercentile('responseLatency', 95);
      
      console.log(`📊 Under load - Average response: ${Math.round(avgResponseTime)}ms, P95: ${Math.round(p95ResponseTime)}ms`);
      
      // Expectations
      expect(successCount / results.length).toBeGreaterThan(0.8); // 80% success rate
      expect(avgResponseTime).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.subsequentResponse * 2); // Allow 2x latency under load
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT * 2);

    test('should maintain performance with high message frequency', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(instanceId);
      await performanceTester.establishSSEWithTiming(instanceId);

      const messageCount = 20;
      const messageInterval = 100; // 100ms between messages
      
      console.log(`📊 High frequency test: ${messageCount} messages with ${messageInterval}ms intervals`);
      
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(
          performanceTester.sendMessageWithTiming(
            instanceId,
            `High frequency message ${i + 1}`,
            false // Don't wait for responses to measure send performance
          )
        );
        
        if (i < messageCount - 1) {
          await new Promise(resolve => setTimeout(resolve, messageInterval));
        }
      }
      
      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`📊 High frequency results: ${successCount}/${messageCount} messages sent successfully`);
      
      const sendMetrics = performanceMetrics.getMetricsByOperation('messageSend');
      const avgSendTime = performanceMetrics.getAverageLatency('messageSend');
      
      console.log(`📊 Average message send time: ${Math.round(avgSendTime)}ms`);
      
      expect(successCount).toBeGreaterThan(messageCount * 0.9); // 90% success rate
      expect(avgSendTime).toBeLessThan(1000); // Should send within 1 second
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);
  });

  describe('Stress Testing', () => {
    test('should handle resource exhaustion gracefully', async () => {
      const maxInstances = 15;
      const createdInstances = [];
      const errors = [];
      
      console.log(`📊 Stress test: Creating up to ${maxInstances} instances`);
      
      for (let i = 0; i < maxInstances; i++) {
        try {
          const instanceId = await performanceTester.createInstanceWithTiming();
          createdInstances.push(instanceId);
          
          // Small delay between creations to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          errors.push(error);
          console.log(`📊 Failed to create instance ${i + 1}: ${error.message}`);
          break; // Stop on first failure
        }
      }
      
      console.log(`📊 Successfully created ${createdInstances.length} instances before hitting limits`);
      
      // Test messaging with all instances
      if (createdInstances.length > 0) {
        // Wait for instances to be ready (sample a few)
        const sampleInstances = createdInstances.slice(0, 3);
        await Promise.all(sampleInstances.map(id => 
          performanceTester.waitForInstanceReadyWithTiming(id).catch(error => 
            console.warn(`Instance ${id} not ready:`, error.message)
          )
        ));
        
        // Establish SSE connections for sample
        await Promise.all(sampleInstances.map(id => 
          performanceTester.establishSSEWithTiming(id).catch(error => 
            console.warn(`SSE failed for ${id}:`, error.message)
          )
        ));
        
        // Send test messages
        const messagePromises = sampleInstances.map(id => 
          performanceTester.sendMessageWithTiming(id, 'Stress test message', true)
            .catch(error => console.warn(`Message failed for ${id}:`, error.message))
        );
        
        await Promise.all(messagePromises);
      }
      
      // System should handle the load gracefully
      expect(createdInstances.length).toBeGreaterThan(0);
      expect(errors.length).toBeLessThan(maxInstances); // Some failures are acceptable
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT * 2);

    test('should recover after stress conditions', async () => {
      // Create some instances to stress the system
      const stressInstances = [];
      for (let i = 0; i < 5; i++) {
        try {
          const instanceId = await performanceTester.createInstanceWithTiming();
          stressInstances.push(instanceId);
        } catch (error) {
          break;
        }
      }
      
      // Clean up stress instances
      await Promise.all(stressInstances.map(id => 
        performanceTester.deleteInstanceWithTiming(id).catch(() => {})
      ));
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test that system can still create and use new instances
      const recoveryInstanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(recoveryInstanceId);
      await performanceTester.establishSSEWithTiming(recoveryInstanceId);
      
      await performanceTester.sendMessageWithTiming(
        recoveryInstanceId, 
        'Recovery test message', 
        true
      );
      
      const responseMetrics = performanceMetrics.getMetricsByOperation('responseLatency');
      const latestResponse = responseMetrics[responseMetrics.length - 1];
      
      console.log(`📊 Recovery response latency: ${latestResponse.duration}ms`);
      
      // System should recover to normal performance
      expect(latestResponse.duration).toBeLessThan(TEST_CONFIG.BASELINE_THRESHOLDS.firstResponse);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);
  });

  describe('Performance Regression Detection', () => {
    test('should detect response time regressions', async () => {
      const instanceId = await performanceTester.createInstanceWithTiming();
      await performanceTester.waitForInstanceReadyWithTiming(instanceId);
      await performanceTester.establishSSEWithTiming(instanceId);

      // Collect baseline measurements
      const baselineMessages = [
        'What is 1+1?',
        'What is 2+2?',
        'What is 3+3?'
      ];

      for (const message of baselineMessages) {
        await performanceTester.sendMessageWithTiming(instanceId, message, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const responseMetrics = performanceMetrics.getMetricsByOperation('responseLatency');
      const avgResponseTime = performanceMetrics.getAverageLatency('responseLatency');
      
      console.log(`📊 Baseline average response time: ${Math.round(avgResponseTime)}ms`);
      
      // Performance expectations (these would be updated as system evolves)
      const performanceExpectations = {
        maxAverageResponseTime: 12000, // 12 seconds
        maxP95ResponseTime: 18000,     // 18 seconds
        minSuccessRate: 0.95           // 95%
      };

      const p95ResponseTime = performanceMetrics.getPercentile('responseLatency', 95);
      const successRate = responseMetrics.filter(m => m.metadata.success !== false).length / responseMetrics.length;

      console.log(`📊 Performance metrics:`);
      console.log(`   Average: ${Math.round(avgResponseTime)}ms (threshold: ${performanceExpectations.maxAverageResponseTime}ms)`);
      console.log(`   P95: ${Math.round(p95ResponseTime)}ms (threshold: ${performanceExpectations.maxP95ResponseTime}ms)`);
      console.log(`   Success rate: ${(successRate * 100).toFixed(1)}% (threshold: ${performanceExpectations.minSuccessRate * 100}%)`);

      expect(avgResponseTime).toBeLessThan(performanceExpectations.maxAverageResponseTime);
      expect(p95ResponseTime).toBeLessThan(performanceExpectations.maxP95ResponseTime);
      expect(successRate).toBeGreaterThan(performanceExpectations.minSuccessRate);
    }, TEST_CONFIG.PERFORMANCE_TIMEOUT);
  });

  afterAll(async () => {
    if (performanceMetrics) {
      const report = await performanceMetrics.saveReport(`performance-report-${Date.now()}.json`);
      
      console.log('\n📊 Performance Test Summary:');
      console.log('==========================================');
      
      Object.entries(report.operations).forEach(([operation, stats]) => {
        console.log(`${operation}:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Average: ${stats.averageLatency}ms`);
        console.log(`  P95: ${stats.p95}ms`);
        console.log(`  Min/Max: ${stats.minLatency}ms / ${stats.maxLatency}ms`);
        console.log('');
      });
    }
  });
});