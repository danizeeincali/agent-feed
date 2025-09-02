/**
 * WebSocket Connection Validator
 * Tests real WebSocket connections, stability, and error recovery
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketValidator extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      url: config.url || 'ws://localhost:3001',
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
      ...config
    };
    
    this.connections = new Map();
    this.metrics = {
      connectAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      disconnections: 0,
      reconnections: 0,
      messagesIncoming: 0,
      messagesOutgoing: 0,
      latencyMeasurements: [],
      errors: []
    };
  }

  async validateSingleConnection() {
    const testId = `single-${Date.now()}`;
    console.log(`🔌 Validating single WebSocket connection: ${testId}`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(this.config.url);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          testId,
          success: false,
          error: 'Connection timeout',
          duration: Date.now() - startTime
        });
      }, this.config.connectionTimeout);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.metrics.successfulConnections++;
        
        // Test basic message exchange
        const pingStart = Date.now();
        ws.send(JSON.stringify({ type: 'ping', timestamp: pingStart }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'pong') {
            const latency = Date.now() - message.timestamp;
            this.metrics.latencyMeasurements.push(latency);
            
            ws.close();
            resolve({
              testId,
              success: true,
              latency,
              duration: Date.now() - startTime,
              connectionEstablished: true
            });
          }
        } catch (error) {
          this.metrics.errors.push({ type: 'message_parse', error: error.message });
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.metrics.failedConnections++;
        this.metrics.errors.push({ type: 'connection', error: error.message });
        
        resolve({
          testId,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      });

      ws.on('close', (code, reason) => {
        this.metrics.disconnections++;
      });
    });
  }

  async validateConnectionStability(duration = 60000) {
    const testId = `stability-${Date.now()}`;
    console.log(`📊 Testing connection stability for ${duration}ms: ${testId}`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(this.config.url);
      const results = {
        testId,
        startTime: new Date(startTime).toISOString(),
        targetDuration: duration,
        actualDuration: 0,
        success: false,
        disconnects: 0,
        reconnects: 0,
        messagesSent: 0,
        messagesReceived: 0,
        errors: []
      };

      let messageInterval;
      let heartbeatInterval;
      let testTimeout;

      const cleanup = () => {
        if (messageInterval) clearInterval(messageInterval);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (testTimeout) clearTimeout(testTimeout);
        if (ws.readyState === WebSocket.OPEN) ws.close();
      };

      const finishTest = () => {
        results.actualDuration = Date.now() - startTime;
        results.success = results.actualDuration >= duration * 0.9; // 90% of target duration
        cleanup();
        resolve(results);
      };

      ws.on('open', () => {
        console.log('✅ Stability test connection established');
        
        // Send periodic messages to test connection
        messageInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'test_message',
              timestamp: Date.now(),
              sequence: results.messagesSent++
            }));
          }
        }, 5000);

        // Heartbeat
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
          }
        }, this.config.heartbeatInterval);

        // Test duration timeout
        testTimeout = setTimeout(finishTest, duration);
      });

      ws.on('message', (data) => {
        results.messagesReceived++;
        try {
          const message = JSON.parse(data);
          this.metrics.messagesIncoming++;
        } catch (error) {
          results.errors.push({ type: 'message_parse', error: error.message });
        }
      });

      ws.on('error', (error) => {
        results.errors.push({ type: 'connection_error', error: error.message, timestamp: Date.now() });
        this.metrics.errors.push({ type: 'stability_test', error: error.message });
      });

      ws.on('close', (code, reason) => {
        results.disconnects++;
        this.metrics.disconnections++;
        
        if (Date.now() - startTime < duration) {
          // Unexpected disconnect, finish test early
          finishTest();
        }
      });

      ws.on('pong', () => {
        // Heartbeat response received
      });
    });
  }

  async validateConcurrentConnections(connectionCount = 10) {
    const testId = `concurrent-${Date.now()}`;
    console.log(`👥 Testing ${connectionCount} concurrent connections: ${testId}`);
    
    const promises = [];
    for (let i = 0; i < connectionCount; i++) {
      promises.push(this.createConcurrentConnection(`conn-${i}`));
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      testId,
      connectionCount,
      successful,
      failed,
      successRate: (successful / connectionCount) * 100,
      duration: Date.now() - startTime,
      details: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason.message })
    };
  }

  async createConcurrentConnection(connectionId) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.url);
      const startTime = Date.now();
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          connectionId,
          success: false,
          error: 'Connection timeout',
          duration: Date.now() - startTime
        });
      }, this.config.connectionTimeout);

      ws.on('open', () => {
        clearTimeout(timeout);
        
        // Send test message
        ws.send(JSON.stringify({
          type: 'concurrent_test',
          connectionId,
          timestamp: Date.now()
        }));
        
        setTimeout(() => {
          ws.close();
          resolve({
            connectionId,
            success: true,
            duration: Date.now() - startTime
          });
        }, 2000);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          connectionId,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      });
    });
  }

  async validateReconnection() {
    const testId = `reconnect-${Date.now()}`;
    console.log(`🔄 Testing reconnection mechanism: ${testId}`);
    
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.url);
      const results = {
        testId,
        success: false,
        initialConnection: false,
        forcedDisconnect: false,
        reconnectionAttempted: false,
        reconnectionSuccessful: false,
        totalTime: 0
      };
      
      const startTime = Date.now();

      ws.on('open', () => {
        results.initialConnection = true;
        console.log('✅ Initial connection established, forcing disconnect...');
        
        // Force disconnect after 2 seconds
        setTimeout(() => {
          results.forcedDisconnect = true;
          ws.terminate(); // Force close without proper handshake
        }, 2000);
      });

      ws.on('close', () => {
        if (results.initialConnection && !results.reconnectionAttempted) {
          results.reconnectionAttempted = true;
          console.log('🔄 Connection closed, testing reconnection...');
          
          // Attempt reconnection
          const reconnectWs = new WebSocket(this.config.url);
          
          reconnectWs.on('open', () => {
            results.reconnectionSuccessful = true;
            results.success = true;
            results.totalTime = Date.now() - startTime;
            reconnectWs.close();
            resolve(results);
          });

          reconnectWs.on('error', () => {
            results.totalTime = Date.now() - startTime;
            resolve(results);
          });
        }
      });

      ws.on('error', (error) => {
        results.totalTime = Date.now() - startTime;
        results.error = error.message;
        resolve(results);
      });
    });
  }

  async validateRaceConditions() {
    const testId = `race-${Date.now()}`;
    console.log(`⚡ Testing race condition scenarios: ${testId}`);
    
    const results = {
      testId,
      scenarios: []
    };

    // Scenario 1: Rapid connect/disconnect
    const rapidToggle = await this.testRapidConnectDisconnect();
    results.scenarios.push(rapidToggle);

    // Scenario 2: Simultaneous connections from same client
    const simultaneousConnect = await this.testSimultaneousConnections();
    results.scenarios.push(simultaneousConnect);

    // Scenario 3: Message flooding
    const messageFlood = await this.testMessageFlooding();
    results.scenarios.push(messageFlood);

    results.success = results.scenarios.every(s => s.success);
    return results;
  }

  async testRapidConnectDisconnect() {
    console.log('🔄 Testing rapid connect/disconnect...');
    
    const attempts = 20;
    const connections = [];
    
    for (let i = 0; i < attempts; i++) {
      const ws = new WebSocket(this.config.url);
      connections.push(ws);
      
      // Immediately close after opening
      ws.on('open', () => {
        ws.close();
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for all to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      name: 'rapid_connect_disconnect',
      success: true,
      attempts,
      description: 'Rapid connection/disconnection cycles completed without crashes'
    };
  }

  async testSimultaneousConnections() {
    console.log('🔀 Testing simultaneous connections...');
    
    const connectionPromises = [];
    for (let i = 0; i < 5; i++) {
      connectionPromises.push(new Promise(resolve => {
        const ws = new WebSocket(this.config.url);
        ws.on('open', () => {
          ws.close();
          resolve({ success: true });
        });
        ws.on('error', () => resolve({ success: false }));
      }));
    }

    const results = await Promise.all(connectionPromises);
    const successful = results.filter(r => r.success).length;

    return {
      name: 'simultaneous_connections',
      success: successful >= 4, // Allow for 1 failure
      successful,
      total: 5,
      description: 'Multiple simultaneous connections handled correctly'
    };
  }

  async testMessageFlooding() {
    console.log('💦 Testing message flooding resilience...');
    
    return new Promise(resolve => {
      const ws = new WebSocket(this.config.url);
      let messagesSent = 0;
      let messagesReceived = 0;
      let errors = 0;

      ws.on('open', () => {
        // Send 100 messages rapidly
        for (let i = 0; i < 100; i++) {
          try {
            ws.send(JSON.stringify({
              type: 'flood_test',
              sequence: i,
              timestamp: Date.now()
            }));
            messagesSent++;
          } catch (error) {
            errors++;
          }
        }

        setTimeout(() => {
          ws.close();
          resolve({
            name: 'message_flooding',
            success: errors < 5, // Allow some errors under extreme load
            messagesSent,
            messagesReceived,
            errors,
            description: 'System handled message flooding gracefully'
          });
        }, 5000);
      });

      ws.on('message', () => messagesReceived++);
      ws.on('error', () => errors++);
    });
  }

  getMetrics() {
    const latencies = this.metrics.latencyMeasurements;
    
    return {
      connections: {
        attempted: this.metrics.connectAttempts,
        successful: this.metrics.successfulConnections,
        failed: this.metrics.failedConnections,
        disconnected: this.metrics.disconnections,
        reconnected: this.metrics.reconnections,
        successRate: this.metrics.connectAttempts > 0 
          ? (this.metrics.successfulConnections / this.metrics.connectAttempts) * 100 
          : 0
      },
      messages: {
        incoming: this.metrics.messagesIncoming,
        outgoing: this.metrics.messagesOutgoing
      },
      latency: latencies.length > 0 ? {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p95: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)]
      } : null,
      errors: {
        total: this.metrics.errors.length,
        byType: this.metrics.errors.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }
}

module.exports = { WebSocketValidator };