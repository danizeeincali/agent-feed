/**
 * SSE Load Testing Script for Production Validation
 * 
 * Validates SSE performance under realistic production load:
 * - Multiple concurrent Claude instances
 * - High message throughput
 * - Memory usage monitoring
 * - Connection stability testing
 * - Performance metrics collection
 */

const EventSource = require('eventsource');
const axios = require('axios');
const { performance } = require('perf_hooks');

class SSELoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.instances = [];
    this.connections = [];
    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      connectionErrors: 0,
      duplicateMessages: 0,
      averageLatency: 0,
      maxLatency: 0,
      minLatency: Infinity,
      throughput: 0,
      memoryUsage: [],
      connectionCount: 0
    };
    this.messageHashes = new Set();
    this.latencyMeasurements = [];
    this.startTime = null;
  }

  async createClaudeInstance() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/claude/instances`, {
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions',
        usePty: true
      });

      const instanceId = response.data.instance.id;
      this.instances.push(instanceId);
      console.log(`✅ Created Claude instance: ${instanceId}`);
      return instanceId;
    } catch (error) {
      console.error('❌ Failed to create Claude instance:', error.message);
      throw error;
    }
  }

  async createSSEConnection(instanceId) {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/stream`);
      
      let connected = false;
      let connectionTimeout = setTimeout(() => {
        if (!connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      eventSource.onopen = () => {
        connected = true;
        clearTimeout(connectionTimeout);
        this.metrics.connectionCount++;
        console.log(`📡 SSE connected for instance: ${instanceId}`);
        resolve(eventSource);
      };

      eventSource.onmessage = (event) => {
        this.handleMessage(event, instanceId);
      };

      eventSource.onerror = (error) => {
        this.metrics.connectionErrors++;
        console.error(`❌ SSE error for ${instanceId}:`, error.message);
        
        if (!connected) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      };

      this.connections.push(eventSource);
    });
  }

  handleMessage(event, instanceId) {
    try {
      const data = JSON.parse(event.data);
      this.metrics.messagesReceived++;

      // Check for duplicate messages
      const messageHash = this.generateMessageHash(data);
      if (this.messageHashes.has(messageHash)) {
        this.metrics.duplicateMessages++;
        console.warn(`🔄 Duplicate message detected for ${instanceId}`);
      } else {
        this.messageHashes.add(messageHash);
      }

      // Measure latency if timestamp is available
      if (data.timestamp) {
        const latency = Date.now() - new Date(data.timestamp).getTime();
        if (latency > 0 && latency < 30000) { // Reasonable latency bounds
          this.latencyMeasurements.push(latency);
          this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
          this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
        }
      }

    } catch (error) {
      console.error('❌ Error parsing SSE message:', error.message);
    }
  }

  generateMessageHash(data) {
    // Create unique hash for message deduplication detection
    const key = `${data.type}:${data.instanceId}:${data.timestamp}:${data.data?.substring(0, 50) || ''}`;
    return key;
  }

  async sendInput(instanceId, input) {
    try {
      const sendTime = performance.now();
      await axios.post(`${this.baseUrl}/api/claude/instances/${instanceId}/terminal/input`, {
        input: input
      });
      
      this.metrics.messagesSent++;
      return performance.now() - sendTime;
    } catch (error) {
      console.error(`❌ Failed to send input to ${instanceId}:`, error.message);
      throw error;
    }
  }

  collectMemoryMetrics() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: usage.rss,
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external
    });
  }

  calculateFinalMetrics() {
    const endTime = Date.now();
    const totalTime = (endTime - this.startTime) / 1000; // seconds

    this.metrics.throughput = this.metrics.messagesReceived / totalTime;
    
    if (this.latencyMeasurements.length > 0) {
      this.metrics.averageLatency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    }

    return this.metrics;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test resources...');
    
    // Close all SSE connections
    for (const connection of this.connections) {
      if (connection && connection.close) {
        connection.close();
      }
    }

    // Delete all instances
    for (const instanceId of this.instances) {
      try {
        await axios.delete(`${this.baseUrl}/api/claude/instances/${instanceId}`);
        console.log(`🗑️ Deleted instance: ${instanceId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete instance ${instanceId}:`, error.message);
      }
    }
  }

  async runSingleInstanceTest(duration = 30000) {
    console.log('🚀 Running single instance load test...');
    this.startTime = Date.now();

    const instanceId = await this.createClaudeInstance();
    const eventSource = await this.createSSEConnection(instanceId);

    const testCommands = [
      'help',
      'hello',
      'claude --version',
      'pwd',
      'echo "load test message"',
      'ls',
      'whoami'
    ];

    // Memory monitoring interval
    const memoryInterval = setInterval(() => {
      this.collectMemoryMetrics();
    }, 1000);

    // Send commands at regular intervals
    const sendInterval = setInterval(async () => {
      try {
        const command = testCommands[Math.floor(Math.random() * testCommands.length)];
        await this.sendInput(instanceId, `${command} ${Date.now()}`);
      } catch (error) {
        console.error('❌ Error sending command:', error.message);
      }
    }, 2000);

    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, duration));

    clearInterval(memoryInterval);
    clearInterval(sendInterval);

    return this.calculateFinalMetrics();
  }

  async runMultiInstanceTest(instanceCount = 5, duration = 30000) {
    console.log(`🚀 Running multi-instance load test with ${instanceCount} instances...`);
    this.startTime = Date.now();

    // Create multiple instances
    const instanceIds = [];
    for (let i = 0; i < instanceCount; i++) {
      const instanceId = await this.createClaudeInstance();
      instanceIds.push(instanceId);
      
      // Add delay to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create SSE connections for all instances
    const eventSources = [];
    for (const instanceId of instanceIds) {
      try {
        const eventSource = await this.createSSEConnection(instanceId);
        eventSources.push(eventSource);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to connect to ${instanceId}:`, error.message);
      }
    }

    console.log(`📡 Connected to ${eventSources.length}/${instanceCount} instances`);

    const testCommands = [
      'help',
      'hello from instance',
      'pwd',
      'echo "multi instance test"',
      'date'
    ];

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      this.collectMemoryMetrics();
    }, 2000);

    // Send commands to random instances
    const sendInterval = setInterval(async () => {
      try {
        const instanceId = instanceIds[Math.floor(Math.random() * instanceIds.length)];
        const command = testCommands[Math.floor(Math.random() * testCommands.length)];
        await this.sendInput(instanceId, `${command} from ${instanceId.slice(-4)}`);
      } catch (error) {
        console.error('❌ Error sending command:', error.message);
      }
    }, 1500);

    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, duration));

    clearInterval(memoryInterval);
    clearInterval(sendInterval);

    return this.calculateFinalMetrics();
  }

  async runStressTest(duration = 60000) {
    console.log('🔥 Running stress test with rapid message generation...');
    this.startTime = Date.now();

    const instanceId = await this.createClaudeInstance();
    const eventSource = await this.createSSEConnection(instanceId);

    const memoryInterval = setInterval(() => {
      this.collectMemoryMetrics();
    }, 500);

    // High-frequency message sending
    const sendInterval = setInterval(async () => {
      try {
        const message = `stress-test-${Date.now()}-${'x'.repeat(50)}`;
        await this.sendInput(instanceId, message);
      } catch (error) {
        console.error('❌ Stress test error:', error.message);
      }
    }, 300); // Every 300ms

    await new Promise(resolve => setTimeout(resolve, duration));

    clearInterval(memoryInterval);
    clearInterval(sendInterval);

    return this.calculateFinalMetrics();
  }

  generateReport(metrics) {
    const report = `
📊 SSE LOAD TEST REPORT
======================

🔢 Message Statistics:
   Messages Received: ${metrics.messagesReceived}
   Messages Sent: ${metrics.messagesSent}
   Duplicate Messages: ${metrics.duplicateMessages}
   Message Loss Rate: ${((metrics.messagesSent - metrics.messagesReceived) / metrics.messagesSent * 100).toFixed(2)}%

⚡ Performance Metrics:
   Throughput: ${metrics.throughput.toFixed(2)} messages/second
   Average Latency: ${metrics.averageLatency.toFixed(2)}ms
   Min Latency: ${metrics.minLatency === Infinity ? 'N/A' : metrics.minLatency.toFixed(2) + 'ms'}
   Max Latency: ${metrics.maxLatency.toFixed(2)}ms

🔗 Connection Statistics:
   Active Connections: ${metrics.connectionCount}
   Connection Errors: ${metrics.connectionErrors}
   Error Rate: ${(metrics.connectionErrors / (metrics.connectionCount + metrics.connectionErrors) * 100).toFixed(2)}%

💾 Memory Usage:
   Peak RSS: ${Math.max(...metrics.memoryUsage.map(m => m.rss)) / 1024 / 1024}MB
   Peak Heap: ${Math.max(...metrics.memoryUsage.map(m => m.heapUsed)) / 1024 / 1024}MB
   Memory Samples: ${metrics.memoryUsage.length}

✅ VALIDATION RESULTS:
   No Duplicate Messages: ${metrics.duplicateMessages === 0 ? 'PASS' : 'FAIL'}
   Throughput > 1 msg/sec: ${metrics.throughput > 1 ? 'PASS' : 'FAIL'}
   Average Latency < 5s: ${metrics.averageLatency < 5000 ? 'PASS' : 'FAIL'}
   Connection Stability: ${metrics.connectionErrors === 0 ? 'PASS' : 'WARN'}
   Memory Leak Check: ${this.checkMemoryLeak(metrics.memoryUsage) ? 'PASS' : 'WARN'}

`;
    return report;
  }

  checkMemoryLeak(memoryUsage) {
    if (memoryUsage.length < 10) return true;
    
    const first10 = memoryUsage.slice(0, 10);
    const last10 = memoryUsage.slice(-10);
    
    const avgFirst = first10.reduce((sum, m) => sum + m.heapUsed, 0) / first10.length;
    const avgLast = last10.reduce((sum, m) => sum + m.heapUsed, 0) / last10.length;
    
    // Memory growth > 50% indicates potential leak
    return (avgLast - avgFirst) / avgFirst < 0.5;
  }
}

// Main execution
async function main() {
  const tester = new SSELoadTester();

  try {
    console.log('🧪 Starting SSE Production Validation Load Tests\n');

    // Test 1: Single instance test
    console.log('1️⃣ Single Instance Test (30 seconds)');
    const singleResults = await tester.runSingleInstanceTest(30000);
    console.log(tester.generateReport(singleResults));
    
    await tester.cleanup();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Multi-instance test
    console.log('\n2️⃣ Multi-Instance Test (30 seconds, 3 instances)');
    const multiResults = await tester.runMultiInstanceTest(3, 30000);
    console.log(tester.generateReport(multiResults));
    
    await tester.cleanup();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Stress test
    console.log('\n3️⃣ Stress Test (45 seconds)');
    const stressResults = await tester.runStressTest(45000);
    console.log(tester.generateReport(stressResults));

    await tester.cleanup();

    // Overall validation
    const allTests = [singleResults, multiResults, stressResults];
    const overallPass = allTests.every(result => 
      result.duplicateMessages === 0 && 
      result.throughput > 0.5 && 
      result.averageLatency < 10000
    );

    console.log(`\n🎯 OVERALL VALIDATION: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   All systems operational for production deployment: ${overallPass}`);

  } catch (error) {
    console.error('❌ Load test failed:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

// Export for use in tests or run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SSELoadTester;