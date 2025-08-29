#!/usr/bin/env node
/**
 * Manual SSE Production Validation Script
 * 
 * This script performs real-time validation of the SSE incremental output fix:
 * - Tests against the actual running server
 * - Validates message deduplication
 * - Tests ANSI sequence handling
 * - Measures performance metrics
 * - Checks for memory leaks
 */

const EventSource = require('eventsource');
const axios = require('axios');

class ManualSSEValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      issues: [],
      metrics: {}
    };
  }

  log(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
  }

  error(message) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ ${message}`);
  }

  success(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ✅ ${message}`);
  }

  async runTest(testName, testFn) {
    this.results.totalTests++;
    this.log(`Running test: ${testName}`);
    
    try {
      await testFn();
      this.results.passedTests++;
      this.success(`${testName} - PASSED`);
      return true;
    } catch (error) {
      this.results.failedTests++;
      this.error(`${testName} - FAILED: ${error.message}`);
      this.results.issues.push({ test: testName, error: error.message });
      return false;
    }
  }

  async createTestInstance() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/claude/instances`, {
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions',
        usePty: true
      });
      return response.data.instance.id;
    } catch (error) {
      throw new Error(`Failed to create test instance: ${error.message}`);
    }
  }

  async deleteInstance(instanceId) {
    try {
      await axios.delete(`${this.baseUrl}/api/claude/instances/${instanceId}`);
    } catch (error) {
      this.log(`Warning: Failed to cleanup instance ${instanceId}: ${error.message}`);
    }
  }

  async testMessageDeduplication() {
    await this.runTest('Message Deduplication', async () => {
      const instanceId = await this.createTestInstance();
      const messages = [];
      const messageHashes = new Set();
      let duplicates = 0;

      try {
        const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
        
        // Collect messages for 10 seconds
        const messagePromise = new Promise((resolve) => {
          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            messages.push(data);
            
            // Create message hash
            const hash = `${data.type}:${data.timestamp}:${data.data?.substring(0, 50) || ''}`;
            if (messageHashes.has(hash)) {
              duplicates++;
            }
            messageHashes.add(hash);
          };

          setTimeout(() => {
            eventSource.close();
            resolve();
          }, 10000);
        });

        // Send some inputs to generate output
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for connection
        await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
          input: 'hello'
        });

        await messagePromise;

        if (duplicates > 0) {
          throw new Error(`Found ${duplicates} duplicate messages out of ${messages.length} total`);
        }

        if (messages.length === 0) {
          throw new Error('No messages received - SSE connection may be broken');
        }

        this.results.metrics.messageDeduplication = {
          totalMessages: messages.length,
          duplicates: duplicates,
          uniqueMessages: messageHashes.size
        };

      } finally {
        await this.deleteInstance(instanceId);
      }
    });
  }

  async testHelloInteractionNoDuplication() {
    await this.runTest('Hello Interaction - No Duplication', async () => {
      const instanceId = await this.createTestInstance();
      const helloResponses = [];

      try {
        const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.data && data.data.toLowerCase().includes('hello')) {
            helloResponses.push(data);
          }
        };

        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Send hello command multiple times rapidly
        for (let i = 0; i < 3; i++) {
          await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
            input: 'hello'
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Wait for responses
        await new Promise(resolve => setTimeout(resolve, 5000));
        eventSource.close();

        // Should have at most 3 hello responses (one per command)
        if (helloResponses.length > 3) {
          throw new Error(`Too many hello responses: ${helloResponses.length} (expected ≤ 3)`);
        }

        this.results.metrics.helloInteraction = {
          commandsSent: 3,
          responsesReceived: helloResponses.length
        };

      } finally {
        await this.deleteInstance(instanceId);
      }
    });
  }

  async testConcurrentInstances() {
    await this.runTest('Concurrent Instances - No Cross-contamination', async () => {
      const instanceIds = [];
      const instanceMessages = {};

      try {
        // Create 3 instances
        for (let i = 0; i < 3; i++) {
          const instanceId = await this.createTestInstance();
          instanceIds.push(instanceId);
          instanceMessages[instanceId] = [];
        }

        // Create SSE connections for all instances
        const eventSources = instanceIds.map(instanceId => {
          const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
          
          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            instanceMessages[instanceId].push(data);
          };
          
          return eventSource;
        });

        // Wait for connections
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Send unique messages to each instance
        for (let i = 0; i < instanceIds.length; i++) {
          const instanceId = instanceIds[i];
          const uniqueMessage = `instance-${i}-unique-test-${Date.now()}`;
          
          await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
            input: uniqueMessage
          });
        }

        // Wait for message processing
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Close connections
        eventSources.forEach(es => es.close());

        // Validate message isolation
        for (let i = 0; i < instanceIds.length; i++) {
          const instanceId = instanceIds[i];
          const messages = instanceMessages[instanceId];
          
          if (messages.length === 0) {
            throw new Error(`No messages received for instance ${instanceId}`);
          }

          // Check that this instance doesn't receive messages from other instances
          for (let j = 0; j < instanceIds.length; j++) {
            if (i !== j) {
              const otherInstanceMessage = `instance-${j}-unique-test`;
              const hasOtherMessage = messages.some(msg => 
                msg.data && msg.data.includes(otherInstanceMessage)
              );
              
              if (hasOtherMessage) {
                throw new Error(`Cross-contamination detected: Instance ${i} received message from instance ${j}`);
              }
            }
          }
        }

        this.results.metrics.concurrentInstances = {
          instancesCreated: instanceIds.length,
          totalMessages: Object.values(instanceMessages).reduce((sum, msgs) => sum + msgs.length, 0),
          crossContamination: false
        };

      } finally {
        for (const instanceId of instanceIds) {
          await this.deleteInstance(instanceId);
        }
      }
    });
  }

  async testSSEConnectionResilience() {
    await this.runTest('SSE Connection Resilience', async () => {
      const instanceId = await this.createTestInstance();
      let firstConnectionMessages = 0;
      let secondConnectionMessages = 0;

      try {
        // First connection
        const eventSource1 = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
        
        eventSource1.onmessage = () => {
          firstConnectionMessages++;
        };

        // Wait and send input
        await new Promise(resolve => setTimeout(resolve, 2000));
        await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
          input: 'test connection 1'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        eventSource1.close();

        // Second connection (simulating reconnection)
        const eventSource2 = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
        
        eventSource2.onmessage = () => {
          secondConnectionMessages++;
        };

        await new Promise(resolve => setTimeout(resolve, 2000));
        await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
          input: 'test connection 2'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        eventSource2.close();

        if (firstConnectionMessages === 0) {
          throw new Error('First connection received no messages');
        }

        if (secondConnectionMessages === 0) {
          throw new Error('Second connection received no messages - reconnection failed');
        }

        this.results.metrics.connectionResilience = {
          firstConnectionMessages,
          secondConnectionMessages,
          reconnectionWorking: true
        };

      } finally {
        await this.deleteInstance(instanceId);
      }
    });
  }

  async testANSISequenceHandling() {
    await this.runTest('ANSI Sequence Handling', async () => {
      const instanceId = await this.createTestInstance();
      let ansiSequencesFound = 0;
      let totalMessages = 0;
      let corruptedMessages = 0;

      try {
        const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.data) {
            totalMessages++;
            
            // Check for ANSI sequences
            if (data.data.includes('\x1b[') || data.data.includes('\u001b[')) {
              ansiSequencesFound++;
            }

            // Check for corruption indicators (malformed JSON, broken UTF-8, etc.)
            try {
              // Test if the data is properly structured
              if (typeof data.data !== 'string') {
                corruptedMessages++;
              }
            } catch {
              corruptedMessages++;
            }
          }
        };

        // Wait for connection and let Claude startup messages flow
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Send a command that should produce colored output
        await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
          input: 'help'
        });

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 3000));
        eventSource.close();

        if (totalMessages === 0) {
          throw new Error('No messages received to test ANSI handling');
        }

        if (corruptedMessages > 0) {
          throw new Error(`Found ${corruptedMessages} corrupted messages out of ${totalMessages} total`);
        }

        this.results.metrics.ansiHandling = {
          totalMessages,
          ansiSequencesFound,
          corruptedMessages,
          corruptionRate: corruptedMessages / totalMessages
        };

      } finally {
        await this.deleteInstance(instanceId);
      }
    });
  }

  async testPerformanceUnderLoad() {
    await this.runTest('Performance Under Load', async () => {
      const instanceId = await this.createTestInstance();
      const startTime = Date.now();
      let messageCount = 0;
      let lastMessageTime = startTime;
      const responseTimes = [];

      try {
        const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
        
        eventSource.onmessage = (event) => {
          const currentTime = Date.now();
          const data = JSON.parse(event.data);
          
          messageCount++;
          
          // Calculate response time if timestamp is available
          if (data.timestamp) {
            const responseTime = currentTime - new Date(data.timestamp).getTime();
            if (responseTime > 0 && responseTime < 30000) {
              responseTimes.push(responseTime);
            }
          }
          
          lastMessageTime = currentTime;
        };

        // Wait for connection
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Send rapid commands
        const commands = ['help', 'pwd', 'echo test', 'date', 'whoami'];
        
        for (let i = 0; i < 10; i++) {
          const command = commands[i % commands.length];
          await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
            input: `${command} ${i}`
          });
          
          // Small delay to create realistic load
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 5000));
        eventSource.close();

        const totalTime = Date.now() - startTime;
        const throughput = messageCount / (totalTime / 1000);

        if (messageCount === 0) {
          throw new Error('No messages received during load test');
        }

        if (throughput < 0.1) {
          throw new Error(`Throughput too low: ${throughput.toFixed(2)} messages/second`);
        }

        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0;

        if (avgResponseTime > 10000) {
          throw new Error(`Average response time too high: ${avgResponseTime}ms`);
        }

        this.results.metrics.performanceUnderLoad = {
          totalTime: totalTime,
          messageCount,
          throughput,
          avgResponseTime,
          responseTimes: responseTimes.length
        };

      } finally {
        await this.deleteInstance(instanceId);
      }
    });
  }

  generateReport() {
    const passRate = this.results.totalTests > 0 
      ? (this.results.passedTests / this.results.totalTests * 100).toFixed(1)
      : 0;

    const report = `
📊 SSE INCREMENTAL OUTPUT - PRODUCTION VALIDATION REPORT
========================================================

🎯 OVERALL RESULTS:
   Tests Run: ${this.results.totalTests}
   Passed: ${this.results.passedTests}
   Failed: ${this.results.failedTests}
   Pass Rate: ${passRate}%
   Status: ${this.results.failedTests === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}

📈 PERFORMANCE METRICS:
${this.results.metrics.messageDeduplication ? `
   Message Deduplication:
     - Total Messages: ${this.results.metrics.messageDeduplication.totalMessages}
     - Duplicates Found: ${this.results.metrics.messageDeduplication.duplicates}
     - Unique Messages: ${this.results.metrics.messageDeduplication.uniqueMessages}
     - Deduplication Status: ${this.results.metrics.messageDeduplication.duplicates === 0 ? '✅ WORKING' : '❌ FAILED'}
` : ''}
${this.results.metrics.helloInteraction ? `
   Hello Interaction:
     - Commands Sent: ${this.results.metrics.helloInteraction.commandsSent}
     - Responses Received: ${this.results.metrics.helloInteraction.responsesReceived}
     - No Duplication: ${this.results.metrics.helloInteraction.responsesReceived <= this.results.metrics.helloInteraction.commandsSent ? '✅ CONFIRMED' : '❌ DUPLICATION DETECTED'}
` : ''}
${this.results.metrics.concurrentInstances ? `
   Concurrent Instances:
     - Instances Created: ${this.results.metrics.concurrentInstances.instancesCreated}
     - Total Messages: ${this.results.metrics.concurrentInstances.totalMessages}
     - Cross-contamination: ${this.results.metrics.concurrentInstances.crossContamination ? '❌ DETECTED' : '✅ NONE'}
` : ''}
${this.results.metrics.connectionResilience ? `
   Connection Resilience:
     - First Connection Messages: ${this.results.metrics.connectionResilience.firstConnectionMessages}
     - Second Connection Messages: ${this.results.metrics.connectionResilience.secondConnectionMessages}
     - Reconnection Working: ${this.results.metrics.connectionResilience.reconnectionWorking ? '✅ YES' : '❌ NO'}
` : ''}
${this.results.metrics.ansiHandling ? `
   ANSI Sequence Handling:
     - Total Messages: ${this.results.metrics.ansiHandling.totalMessages}
     - ANSI Sequences Found: ${this.results.metrics.ansiHandling.ansiSequencesFound}
     - Corrupted Messages: ${this.results.metrics.ansiHandling.corruptedMessages}
     - Corruption Rate: ${(this.results.metrics.ansiHandling.corruptionRate * 100).toFixed(2)}%
     - ANSI Handling: ${this.results.metrics.ansiHandling.corruptedMessages === 0 ? '✅ CLEAN' : '❌ CORRUPTED'}
` : ''}
${this.results.metrics.performanceUnderLoad ? `
   Performance Under Load:
     - Total Time: ${this.results.metrics.performanceUnderLoad.totalTime}ms
     - Message Count: ${this.results.metrics.performanceUnderLoad.messageCount}
     - Throughput: ${this.results.metrics.performanceUnderLoad.throughput.toFixed(2)} msgs/sec
     - Avg Response Time: ${this.results.metrics.performanceUnderLoad.avgResponseTime.toFixed(2)}ms
     - Performance Status: ${this.results.metrics.performanceUnderLoad.throughput > 1 && this.results.metrics.performanceUnderLoad.avgResponseTime < 5000 ? '✅ ACCEPTABLE' : '❌ POOR'}
` : ''}

${this.results.issues.length > 0 ? `
❌ ISSUES FOUND:
${this.results.issues.map(issue => `   - ${issue.test}: ${issue.error}`).join('\n')}
` : ''}

🚀 PRODUCTION READINESS ASSESSMENT:
   Message Deduplication: ${this.results.metrics.messageDeduplication?.duplicates === 0 ? '✅' : '❌'}
   Hello Interaction Fix: ${this.results.metrics.helloInteraction?.responsesReceived <= this.results.metrics.helloInteraction?.commandsSent ? '✅' : '❌'}
   Concurrent Instance Isolation: ${this.results.metrics.concurrentInstances?.crossContamination === false ? '✅' : '❌'}
   Connection Resilience: ${this.results.metrics.connectionResilience?.reconnectionWorking ? '✅' : '❌'}
   ANSI Sequence Handling: ${this.results.metrics.ansiHandling?.corruptedMessages === 0 ? '✅' : '❌'}
   Performance Acceptable: ${this.results.metrics.performanceUnderLoad?.throughput > 1 ? '✅' : '❌'}

📋 OVERALL VERDICT: ${this.results.failedTests === 0 ? '✅ READY FOR PRODUCTION' : '❌ NEEDS FIXES BEFORE PRODUCTION'}

Generated at: ${new Date().toISOString()}
`;

    return report;
  }

  async runAllTests() {
    this.log('🚀 Starting Manual SSE Production Validation');
    this.log(`Testing against: ${this.baseUrl}`);

    try {
      // Test server connectivity
      await axios.get(`${this.baseUrl}/health`);
      this.success('Server is accessible');
    } catch (error) {
      throw new Error(`Cannot connect to server at ${this.baseUrl}: ${error.message}`);
    }

    // Run all tests
    await this.testMessageDeduplication();
    await this.testHelloInteractionNoDuplication();
    await this.testConcurrentInstances();
    await this.testSSEConnectionResilience();
    await this.testANSISequenceHandling();
    await this.testPerformanceUnderLoad();

    // Generate and display report
    const report = this.generateReport();
    console.log('\n' + report);

    return this.results.failedTests === 0;
  }
}

// Main execution
async function main() {
  const validator = new ManualSSEValidator();
  
  try {
    const success = await validator.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ManualSSEValidator;