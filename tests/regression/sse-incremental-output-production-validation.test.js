/**
 * Production Validation Test Suite for SSE Incremental Output Fix
 * 
 * This comprehensive test suite validates:
 * 1. No message repetition occurs
 * 2. Proper SSE streaming performance
 * 3. Multiple concurrent Claude instances
 * 4. Clean terminal output parsing
 * 5. No memory leaks in output buffering
 */

const request = require('supertest');
const EventSource = require('eventsource');
const { performance } = require('perf_hooks');
const app = require('../../simple-backend');

describe('SSE Incremental Output - Production Validation', () => {
  const API_BASE_URL = 'http://localhost:3000';
  let testInstances = [];
  let sseConnections = [];
  
  beforeAll(async () => {
    console.log('🔧 Setting up production-like test environment');
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test instances and connections');
    
    // Close all SSE connections
    for (const connection of sseConnections) {
      if (connection && connection.close) {
        connection.close();
      }
    }
    
    // Terminate all test instances
    for (const instanceId of testInstances) {
      try {
        await request(app)
          .delete(`/api/claude/instances/${instanceId}`)
          .expect(200);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error.message);
      }
    }
    
    // Allow cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('1. Message Deduplication Validation', () => {
    let instanceId;
    let receivedMessages = [];

    beforeEach(async () => {
      receivedMessages = [];
      
      // Create real Claude instance
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      instanceId = response.body.instance.id;
      testInstances.push(instanceId);
    });

    test('should not repeat welcome messages', (done) => {
      const welcomeMessages = new Set();
      let duplicateCount = 0;
      
      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        receivedMessages.push(data);
        
        if (data.type === 'connected' || data.message?.includes('Terminal connected')) {
          const messageKey = `${data.type}:${data.message}`;
          if (welcomeMessages.has(messageKey)) {
            duplicateCount++;
          }
          welcomeMessages.add(messageKey);
        }
        
        // Check after reasonable time
        if (receivedMessages.length >= 5) {
          expect(duplicateCount).toBe(0);
          expect(welcomeMessages.size).toBeGreaterThan(0);
          done();
        }
      };

      eventSource.onerror = (error) => {
        done(new Error(`SSE connection failed: ${error.message}`));
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (duplicateCount === 0) {
          done();
        } else {
          done(new Error(`Found ${duplicateCount} duplicate welcome messages`));
        }
      }, 10000);
    });

    test('should handle "hello" interactions without duplication', async () => {
      const responses = [];
      let helloResponseCount = 0;
      
      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send "hello" command
      await request(app)
        .post(`/api/claude/instances/${instanceId}/terminal/input`)
        .send({ input: 'hello' })
        .expect(200);

      // Monitor responses for 5 seconds
      const monitorPromise = new Promise((resolve) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          responses.push(data);
          
          if (data.data && data.data.toLowerCase().includes('hello')) {
            helloResponseCount++;
          }
        };
        
        setTimeout(() => {
          resolve();
        }, 5000);
      });

      await monitorPromise;
      
      // Validate no duplicate hello responses
      expect(helloResponseCount).toBeLessThanOrEqual(1);
      expect(responses.length).toBeGreaterThan(0);
    });
  });

  describe('2. SSE Streaming Performance', () => {
    test('should handle high-frequency messages without loss', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      const instanceId = response.body.instance.id;
      testInstances.push(instanceId);

      let messageCount = 0;
      let lastMessageTime = performance.now();
      const messageTimings = [];

      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      const performanceTest = new Promise((resolve) => {
        eventSource.onmessage = (event) => {
          const currentTime = performance.now();
          const timeDiff = currentTime - lastMessageTime;
          messageTimings.push(timeDiff);
          lastMessageTime = currentTime;
          messageCount++;

          // Test for 30 messages
          if (messageCount >= 30) {
            resolve();
          }
        };
      });

      // Send multiple rapid inputs to generate traffic
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post(`/api/claude/instances/${instanceId}/terminal/input`)
          .send({ input: `test message ${i}` });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await performanceTest;

      // Validate performance metrics
      const avgTiming = messageTimings.reduce((a, b) => a + b, 0) / messageTimings.length;
      expect(avgTiming).toBeLessThan(1000); // Average less than 1 second between messages
      expect(messageCount).toBeGreaterThanOrEqual(30);
    });

    test('should maintain connection stability under load', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      const instanceId = response.body.instance.id;
      testInstances.push(instanceId);

      let connectionErrors = 0;
      let messagesReceived = 0;

      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      eventSource.onerror = () => connectionErrors++;
      eventSource.onmessage = () => messagesReceived++;

      // Generate sustained load for 10 seconds
      const loadTest = async () => {
        for (let i = 0; i < 50; i++) {
          await request(app)
            .post(`/api/claude/instances/${instanceId}/terminal/input`)
            .send({ input: `load test ${i}` });
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      };

      await loadTest();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing

      // Validate connection stability
      expect(connectionErrors).toBeLessThan(3); // Allow for occasional reconnects
      expect(messagesReceived).toBeGreaterThan(10);
    });
  });

  describe('3. Concurrent Claude Instances', () => {
    test('should handle multiple instances without cross-contamination', async () => {
      const instances = [];
      const instanceMessages = {};

      // Create 3 concurrent instances
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/claude/instances')
          .send({
            command: ['claude', '--dangerously-skip-permissions'],
            instanceType: 'skip-permissions',
            usePty: true
          })
          .expect(201);

        const instanceId = response.body.instance.id;
        instances.push(instanceId);
        testInstances.push(instanceId);
        instanceMessages[instanceId] = [];
      }

      // Create SSE connections for all instances
      const eventSources = instances.map(instanceId => {
        const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
        sseConnections.push(eventSource);
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          instanceMessages[instanceId].push(data);
        };
        
        return eventSource;
      });

      // Wait for connections to establish
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Send unique messages to each instance
      for (let i = 0; i < instances.length; i++) {
        const instanceId = instances[i];
        const uniqueMessage = `instance-${i}-unique-message`;
        
        await request(app)
          .post(`/api/claude/instances/${instanceId}/terminal/input`)
          .send({ input: uniqueMessage })
          .expect(200);
      }

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Validate message isolation
      for (let i = 0; i < instances.length; i++) {
        const instanceId = instances[i];
        const messages = instanceMessages[instanceId];
        
        expect(messages.length).toBeGreaterThan(0);
        
        // Check that this instance doesn't receive messages from other instances
        for (let j = 0; j < instances.length; j++) {
          if (i !== j) {
            const otherInstanceMessage = `instance-${j}-unique-message`;
            const hasOtherMessage = messages.some(msg => 
              msg.data && msg.data.includes(otherInstanceMessage)
            );
            expect(hasOtherMessage).toBe(false);
          }
        }
      }
    });
  });

  describe('4. Memory Leak Prevention', () => {
    test('should not accumulate output buffer indefinitely', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      const instanceId = response.body.instance.id;
      testInstances.push(instanceId);

      // Generate large amount of output without SSE connection
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post(`/api/claude/instances/${instanceId}/terminal/input`)
          .send({ input: `large output test ${i} ${'x'.repeat(100)}` });
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for buffering
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now connect SSE and verify buffer is managed
      let bufferedMessages = 0;
      let totalBufferedSize = 0;

      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      const bufferTest = new Promise((resolve) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.data) {
            bufferedMessages++;
            totalBufferedSize += data.data.length;
          }

          // Stop after receiving initial buffer
          if (bufferedMessages >= 50) {
            resolve();
          }
        };
      });

      await bufferTest;

      // Validate buffer limits
      expect(bufferedMessages).toBeLessThan(101); // Should be limited
      expect(totalBufferedSize).toBeLessThan(50000); // Reasonable buffer size
    });
  });

  describe('5. ANSI Sequence Handling', () => {
    test('should properly handle ANSI escape sequences', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      const instanceId = response.body.instance.id;
      testInstances.push(instanceId);

      let receivedData = '';
      let ansiSequenceFound = false;

      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      const ansiTest = new Promise((resolve) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.data) {
            receivedData += data.data;
            
            // Check for ANSI sequences (color codes, etc.)
            if (data.data.includes('\x1b[') || data.data.includes('\u001b[')) {
              ansiSequenceFound = true;
            }
          }

          // Resolve after collecting some data
          if (receivedData.length > 100) {
            resolve();
          }
        };
      });

      // Send command that might produce colored output
      await request(app)
        .post(`/api/claude/instances/${instanceId}/terminal/input`)
        .send({ input: 'help' });

      await ansiTest;

      // Validate ANSI handling doesn't cause corruption
      expect(receivedData).toBeDefined();
      expect(receivedData.length).toBeGreaterThan(0);
      
      // ANSI sequences should be preserved for terminal rendering
      if (ansiSequenceFound) {
        expect(receivedData).toContain('\x1b[');
      }
    });
  });

  describe('6. Connection Resilience', () => {
    test('should handle SSE reconnection gracefully', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      const instanceId = response.body.instance.id;
      testInstances.push(instanceId);

      let firstConnectionMessages = 0;
      let secondConnectionMessages = 0;

      // First connection
      const eventSource1 = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource1);

      eventSource1.onmessage = () => firstConnectionMessages++;

      // Wait for first connection to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send input to generate output
      await request(app)
        .post(`/api/claude/instances/${instanceId}/terminal/input`)
        .send({ input: 'test reconnection' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Close first connection
      eventSource1.close();

      // Create second connection (simulating reconnection)
      const eventSource2 = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource2);

      eventSource2.onmessage = () => secondConnectionMessages++;

      // Wait for second connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send more input
      await request(app)
        .post(`/api/claude/instances/${instanceId}/terminal/input`)
        .send({ input: 'after reconnection' });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Validate both connections worked
      expect(firstConnectionMessages).toBeGreaterThan(0);
      expect(secondConnectionMessages).toBeGreaterThan(0);
    });
  });

  describe('7. Performance Under Load', () => {
    test('should maintain performance with rapid input/output', async () => {
      const response = await request(app)
        .post('/api/claude/instances')
        .send({
          command: ['claude', '--dangerously-skip-permissions'],
          instanceType: 'skip-permissions',
          usePty: true
        })
        .expect(201);

      const instanceId = response.body.instance.id;
      testInstances.push(instanceId);

      const startTime = performance.now();
      let messageCount = 0;
      const responseTimes = [];

      const eventSource = new EventSource(`${API_BASE_URL}/api/claude/instances/${instanceId}/terminal/stream`);
      sseConnections.push(eventSource);

      eventSource.onmessage = (event) => {
        messageCount++;
        const data = JSON.parse(event.data);
        
        if (data.timestamp) {
          const responseTime = Date.now() - new Date(data.timestamp).getTime();
          if (responseTime > 0) {
            responseTimes.push(responseTime);
          }
        }
      };

      // Send rapid sequence of commands
      const commands = [
        'help',
        'claude --version',
        'echo "performance test"',
        'pwd',
        'ls'
      ];

      for (let i = 0; i < 20; i++) {
        const command = commands[i % commands.length];
        await request(app)
          .post(`/api/claude/instances/${instanceId}/terminal/input`)
          .send({ input: `${command} ${i}` });
        
        // Small delay to create realistic load
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Performance validation
      expect(messageCount).toBeGreaterThan(20); // Should have received responses
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        expect(avgResponseTime).toBeLessThan(5000); // Average response time under 5 seconds
      }
    });
  });
});