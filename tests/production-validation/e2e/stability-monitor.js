/**
 * Connection Stability Monitor
 * Monitors connection stability over extended periods
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class StabilityMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      monitorDuration: config.monitorDuration || 300000, // 5 minutes
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 2000,
      stableConnectionThreshold: config.stableConnectionThreshold || 0.95, // 95%
      maxAllowedDowntime: config.maxAllowedDowntime || 10000, // 10 seconds
      ...config
    };
    
    this.monitoring = false;
    this.connections = new Map();
    this.stabilityMetrics = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      disconnections: 0,
      reconnections: 0,
      totalDowntime: 0,
      longestDowntime: 0,
      uptimePercentage: 0,
      heartbeatsSent: 0,
      heartbeatsReceived: 0,
      connectionHistory: []
    };
  }

  async startStabilityMonitoring() {
    const monitorId = `stability-monitor-${Date.now()}`;
    console.log(`📊 Starting connection stability monitoring: ${monitorId}`);
    
    this.monitoring = true;
    const startTime = Date.now();
    
    const results = {
      monitorId,
      startTime: new Date(startTime).toISOString(),
      duration: this.config.monitorDuration,
      stabilityTests: []
    };

    try {
      // Test 1: Single Connection Stability
      const singleConnectionTest = await this.testSingleConnectionStability();
      results.stabilityTests.push({ name: 'single_connection_stability', ...singleConnectionTest });

      // Test 2: Multiple Connection Stability
      const multiConnectionTest = await this.testMultipleConnectionStability();
      results.stabilityTests.push({ name: 'multiple_connection_stability', ...multiConnectionTest });

      // Test 3: Connection Recovery Stability
      const recoveryTest = await this.testConnectionRecoveryStability();
      results.stabilityTests.push({ name: 'connection_recovery_stability', ...recoveryTest });

      // Test 4: Load Stability Test
      const loadStabilityTest = await this.testStabilityUnderLoad();
      results.stabilityTests.push({ name: 'load_stability', ...loadStabilityTest });

      const endTime = Date.now();
      results.actualDuration = endTime - startTime;
      results.endTime = new Date(endTime).toISOString();
      results.success = results.stabilityTests.every(test => test.stable);
      results.overallStability = this.calculateOverallStability(results.stabilityTests);
      results.metrics = this.stabilityMetrics;

      return results;

    } catch (error) {
      console.error(`❌ Stability monitoring failed: ${error.message}`);
      return {
        ...results,
        success: false,
        error: error.message,
        actualDuration: Date.now() - startTime
      };
    } finally {
      this.monitoring = false;
    }
  }

  async testSingleConnectionStability() {
    console.log('🔌 Testing single connection stability...');
    
    return new Promise((resolve) => {
      const connectionId = `single-stability-${Date.now()}`;
      const testStartTime = Date.now();
      const testDuration = Math.min(this.config.monitorDuration / 4, 60000); // Max 1 minute
      
      const connectionStats = {
        connectionId,
        connected: false,
        connectionTime: null,
        disconnectionTime: null,
        totalUptime: 0,
        totalDowntime: 0,
        disconnections: 0,
        reconnections: 0,
        heartbeats: { sent: 0, received: 0 },
        events: []
      };

      const ws = new WebSocket(this.config.wsUrl);
      let connectionStart = Date.now();
      let heartbeatInterval = null;
      
      const recordEvent = (type, data = {}) => {
        connectionStats.events.push({
          type,
          timestamp: Date.now(),
          ...data
        });
      };

      ws.on('open', () => {
        connectionStats.connected = true;
        connectionStats.connectionTime = Date.now() - connectionStart;
        recordEvent('connection_opened', { connectionTime: connectionStats.connectionTime });
        
        this.stabilityMetrics.totalConnections++;
        this.stabilityMetrics.successfulConnections++;

        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
            connectionStats.heartbeats.sent++;
            this.stabilityMetrics.heartbeatsSent++;
            recordEvent('heartbeat_sent');
          }
        }, this.config.heartbeatInterval);
      });

      ws.on('pong', () => {
        connectionStats.heartbeats.received++;
        this.stabilityMetrics.heartbeatsReceived++;
        recordEvent('heartbeat_received');
      });

      ws.on('close', (code, reason) => {
        if (connectionStats.connected) {
          connectionStats.disconnectionTime = Date.now();
          const uptime = connectionStats.disconnectionTime - (testStartTime + (connectionStats.connectionTime || 0));
          connectionStats.totalUptime += uptime;
          connectionStats.disconnections++;
          this.stabilityMetrics.disconnections++;
          recordEvent('connection_closed', { code, reason, uptime });
        }
        connectionStats.connected = false;
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      });

      ws.on('error', (error) => {
        recordEvent('connection_error', { error: error.message });
        this.stabilityMetrics.failedConnections++;
      });

      // Monitor for test duration
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        // Calculate final metrics
        const testEndTime = Date.now();
        const totalTestTime = testEndTime - testStartTime;
        
        if (connectionStats.connected) {
          connectionStats.totalUptime += testEndTime - (testStartTime + (connectionStats.connectionTime || 0));
        }
        
        const uptimePercentage = (connectionStats.totalUptime / totalTestTime) * 100;
        const heartbeatSuccessRate = connectionStats.heartbeats.sent > 0 
          ? (connectionStats.heartbeats.received / connectionStats.heartbeats.sent) * 100 
          : 0;

        resolve({
          stable: uptimePercentage >= this.config.stableConnectionThreshold * 100,
          connectionStats,
          uptimePercentage: uptimePercentage.toFixed(2),
          heartbeatSuccessRate: heartbeatSuccessRate.toFixed(2),
          testDuration: totalTestTime,
          events: connectionStats.events
        });
      }, testDuration);
    });
  }

  async testMultipleConnectionStability() {
    console.log('👥 Testing multiple connection stability...');
    
    const connectionCount = 5;
    const testDuration = Math.min(this.config.monitorDuration / 4, 45000); // Max 45 seconds
    
    const promises = Array.from({ length: connectionCount }, (_, index) => {
      return this.monitorConnectionStability(`multi-${index}`, testDuration);
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.stable
    ).length;
    
    const connections = results.map(r => 
      r.status === 'fulfilled' ? r.value : { stable: false, error: r.reason?.message }
    );
    
    const averageUptime = connections
      .filter(c => c.uptimePercentage)
      .reduce((sum, c) => sum + parseFloat(c.uptimePercentage), 0) / connections.length;

    return {
      stable: (successful / connectionCount) >= 0.8, // 80% success rate
      connectionCount,
      successfulConnections: successful,
      failedConnections: connectionCount - successful,
      successRate: (successful / connectionCount) * 100,
      averageUptime: averageUptime.toFixed(2),
      connections
    };
  }

  async monitorConnectionStability(connectionId, duration) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      const startTime = Date.now();
      
      const stats = {
        connectionId,
        stable: false,
        connected: false,
        uptime: 0,
        downtime: 0,
        disconnections: 0,
        errors: []
      };

      let connectionEstablished = Date.now();

      ws.on('open', () => {
        stats.connected = true;
        connectionEstablished = Date.now();
      });

      ws.on('close', () => {
        if (stats.connected) {
          stats.uptime += Date.now() - connectionEstablished;
          stats.disconnections++;
        }
        stats.connected = false;
      });

      ws.on('error', (error) => {
        stats.errors.push(error.message);
      });

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }

        const totalTime = Date.now() - startTime;
        if (stats.connected) {
          stats.uptime += Date.now() - connectionEstablished;
        }
        stats.downtime = totalTime - stats.uptime;
        
        const uptimePercentage = (stats.uptime / totalTime) * 100;
        stats.uptimePercentage = uptimePercentage.toFixed(2);
        stats.stable = uptimePercentage >= 90; // 90% uptime for multi-connection test

        resolve(stats);
      }, duration);
    });
  }

  async testConnectionRecoveryStability() {
    console.log('🔄 Testing connection recovery stability...');
    
    return new Promise((resolve) => {
      const recoveryStats = {
        stable: false,
        totalRecoveryTests: 5,
        successfulRecoveries: 0,
        averageRecoveryTime: 0,
        recoveryAttempts: []
      };

      let currentTest = 0;
      
      const runRecoveryTest = () => {
        if (currentTest >= recoveryStats.totalRecoveryTests) {
          // Calculate final results
          recoveryStats.averageRecoveryTime = recoveryStats.recoveryAttempts
            .filter(r => r.recovered)
            .reduce((sum, r) => sum + r.recoveryTime, 0) / recoveryStats.successfulRecoveries || 0;
          
          recoveryStats.stable = (recoveryStats.successfulRecoveries / recoveryStats.totalRecoveryTests) >= 0.6;
          
          resolve(recoveryStats);
          return;
        }

        const ws = new WebSocket(this.config.wsUrl);
        const testStart = Date.now();
        const testId = `recovery-${currentTest}`;
        
        const attemptStats = {
          testId,
          recovered: false,
          recoveryTime: 0,
          disconnectTime: 0,
          reconnectTime: 0
        };

        ws.on('open', () => {
          // Force disconnection after short period
          setTimeout(() => {
            attemptStats.disconnectTime = Date.now();
            ws.terminate(); // Abrupt disconnection
            
            // Attempt reconnection
            setTimeout(() => {
              const reconnectWs = new WebSocket(this.config.wsUrl);
              
              reconnectWs.on('open', () => {
                attemptStats.reconnectTime = Date.now();
                attemptStats.recoveryTime = attemptStats.reconnectTime - attemptStats.disconnectTime;
                attemptStats.recovered = true;
                recoveryStats.successfulRecoveries++;
                
                reconnectWs.close();
                recoveryStats.recoveryAttempts.push(attemptStats);
                
                currentTest++;
                setTimeout(runRecoveryTest, 1000);
              });

              reconnectWs.on('error', () => {
                recoveryStats.recoveryAttempts.push(attemptStats);
                currentTest++;
                setTimeout(runRecoveryTest, 1000);
              });
            }, 500);
          }, 2000);
        });

        ws.on('error', () => {
          recoveryStats.recoveryAttempts.push(attemptStats);
          currentTest++;
          setTimeout(runRecoveryTest, 1000);
        });
      };

      runRecoveryTest();
    });
  }

  async testStabilityUnderLoad() {
    console.log('⚡ Testing stability under load...');
    
    const loadTestDuration = Math.min(this.config.monitorDuration / 3, 60000); // Max 1 minute
    const connectionCount = 10;
    const messageFrequency = 2000; // Every 2 seconds
    
    return new Promise((resolve) => {
      const loadStats = {
        stable: false,
        activeConnections: 0,
        totalMessages: 0,
        failedMessages: 0,
        connectionFailures: 0,
        messageSuccessRate: 0,
        connectionStabilityRate: 0
      };

      const connections = [];
      const startTime = Date.now();

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(this.config.wsUrl);
        const connectionStats = {
          id: `load-${i}`,
          connected: false,
          messagesSent: 0,
          messagesReceived: 0,
          errors: 0
        };

        ws.on('open', () => {
          connectionStats.connected = true;
          loadStats.activeConnections++;
          
          // Send periodic messages
          const messageInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({
                  type: 'load_test',
                  connectionId: connectionStats.id,
                  timestamp: Date.now(),
                  sequence: connectionStats.messagesSent
                }));
                connectionStats.messagesSent++;
                loadStats.totalMessages++;
              } catch (error) {
                connectionStats.errors++;
                loadStats.failedMessages++;
              }
            } else {
              clearInterval(messageInterval);
            }
          }, messageFrequency);

          // Store interval reference for cleanup
          connectionStats.messageInterval = messageInterval;
        });

        ws.on('message', () => {
          connectionStats.messagesReceived++;
        });

        ws.on('error', () => {
          connectionStats.errors++;
          loadStats.connectionFailures++;
        });

        ws.on('close', () => {
          if (connectionStats.connected) {
            loadStats.activeConnections--;
          }
          if (connectionStats.messageInterval) {
            clearInterval(connectionStats.messageInterval);
          }
        });

        connections.push({ ws, stats: connectionStats });
      }

      // End test after duration
      setTimeout(() => {
        // Close all connections
        connections.forEach(({ ws, stats }) => {
          if (stats.messageInterval) {
            clearInterval(stats.messageInterval);
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });

        // Calculate results
        loadStats.messageSuccessRate = loadStats.totalMessages > 0 
          ? ((loadStats.totalMessages - loadStats.failedMessages) / loadStats.totalMessages) * 100 
          : 0;

        const successfulConnections = connections.filter(c => c.stats.connected && c.stats.errors === 0).length;
        loadStats.connectionStabilityRate = (successfulConnections / connectionCount) * 100;

        loadStats.stable = loadStats.messageSuccessRate >= 85 && loadStats.connectionStabilityRate >= 70;

        resolve(loadStats);
      }, loadTestDuration);
    });
  }

  calculateOverallStability(stabilityTests) {
    const stableTests = stabilityTests.filter(test => test.stable).length;
    const totalTests = stabilityTests.length;
    const stabilityPercentage = (stableTests / totalTests) * 100;
    
    let stabilityRating;
    if (stabilityPercentage >= 90) stabilityRating = 'excellent';
    else if (stabilityPercentage >= 75) stabilityRating = 'good';
    else if (stabilityPercentage >= 60) stabilityRating = 'fair';
    else stabilityRating = 'poor';
    
    return {
      stableTests,
      totalTests,
      stabilityPercentage: stabilityPercentage.toFixed(2),
      stabilityRating,
      passed: stabilityPercentage >= 75 // 75% threshold for passing
    };
  }

  generateStabilityReport() {
    return {
      metrics: this.stabilityMetrics,
      summary: {
        totalConnectionAttempts: this.stabilityMetrics.totalConnections,
        successRate: this.stabilityMetrics.totalConnections > 0 
          ? (this.stabilityMetrics.successfulConnections / this.stabilityMetrics.totalConnections) * 100 
          : 0,
        heartbeatReliability: this.stabilityMetrics.heartbeatsSent > 0 
          ? (this.stabilityMetrics.heartbeatsReceived / this.stabilityMetrics.heartbeatsSent) * 100 
          : 0,
        averageDowntime: this.stabilityMetrics.disconnections > 0 
          ? this.stabilityMetrics.totalDowntime / this.stabilityMetrics.disconnections 
          : 0
      },
      recommendations: this.generateStabilityRecommendations()
    };
  }

  generateStabilityRecommendations() {
    const recommendations = [];
    const successRate = this.stabilityMetrics.totalConnections > 0 
      ? (this.stabilityMetrics.successfulConnections / this.stabilityMetrics.totalConnections) * 100 
      : 0;

    if (successRate < 95) {
      recommendations.push({
        priority: 'high',
        category: 'connection_reliability',
        message: `Connection success rate is ${successRate.toFixed(1)}%, below optimal 95%`,
        actions: [
          'Review server connection handling',
          'Implement connection pooling',
          'Add connection retry logic',
          'Monitor server resource usage'
        ]
      });
    }

    if (this.stabilityMetrics.longestDowntime > this.config.maxAllowedDowntime) {
      recommendations.push({
        priority: 'high',
        category: 'downtime_management',
        message: `Longest downtime (${this.stabilityMetrics.longestDowntime}ms) exceeds threshold`,
        actions: [
          'Implement faster reconnection logic',
          'Add connection health monitoring',
          'Review server stability',
          'Consider connection redundancy'
        ]
      });
    }

    const heartbeatReliability = this.stabilityMetrics.heartbeatsSent > 0 
      ? (this.stabilityMetrics.heartbeatsReceived / this.stabilityMetrics.heartbeatsSent) * 100 
      : 0;

    if (heartbeatReliability < 90) {
      recommendations.push({
        priority: 'medium',
        category: 'heartbeat_reliability',
        message: `Heartbeat reliability is ${heartbeatReliability.toFixed(1)}%, should be >90%`,
        actions: [
          'Review heartbeat interval settings',
          'Check network stability',
          'Implement heartbeat timeout handling',
          'Add heartbeat failure recovery'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = { StabilityMonitor };