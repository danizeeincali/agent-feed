/**
 * Connection State Consistency Checker
 * Validates state synchronization across all system components
 */

const WebSocket = require('ws');
const axios = require('axios');

class ConnectionStateChecker {
  constructor(config = {}) {
    this.config = {
      frontendUrl: config.frontendUrl || 'http://localhost:5173',
      backendUrl: config.backendUrl || 'http://localhost:3001',
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      stateCheckInterval: config.stateCheckInterval || 1000,
      consistencyTimeout: config.consistencyTimeout || 10000,
      maxInconsistencies: config.maxInconsistencies || 3,
      ...config
    };
    
    this.stateHistory = [];
    this.inconsistencies = [];
    this.connections = new Map();
  }

  async validateStateConsistency() {
    const testId = `state-consistency-${Date.now()}`;
    console.log(`🔄 Validating connection state consistency: ${testId}`);
    
    const results = {
      testId,
      timestamp: new Date().toISOString(),
      success: false,
      phases: [],
      inconsistencies: [],
      stateTransitions: [],
      finalState: null
    };

    try {
      // Phase 1: Initial State Check
      const initialState = await this.checkInitialState();
      results.phases.push({ phase: 'initial_state', ...initialState });

      // Phase 2: Connection Establishment
      const connectionState = await this.validateConnectionEstablishment();
      results.phases.push({ phase: 'connection_establishment', ...connectionState });

      // Phase 3: State Synchronization During Activity
      const activityState = await this.validateStatesDuringActivity();
      results.phases.push({ phase: 'activity_synchronization', ...activityState });

      // Phase 4: Disconnection State Handling
      const disconnectionState = await this.validateDisconnectionStates();
      results.phases.push({ phase: 'disconnection_handling', ...disconnectionState });

      // Phase 5: Reconnection State Recovery
      const reconnectionState = await this.validateReconnectionStates();
      results.phases.push({ phase: 'reconnection_recovery', ...reconnectionState });

      results.success = results.phases.every(phase => phase.success);
      results.inconsistencies = this.inconsistencies;
      results.stateTransitions = this.stateHistory;

      return results;

    } catch (error) {
      console.error(`❌ State consistency validation failed: ${error.message}`);
      return {
        ...results,
        success: false,
        error: error.message
      };
    }
  }

  async checkInitialState() {
    console.log('🔍 Checking initial application state...');
    
    try {
      // Check frontend state
      const frontendResponse = await axios.get(`${this.config.frontendUrl}/`);
      const frontendState = {
        available: frontendResponse.status === 200,
        responseTime: Date.now()
      };

      // Check backend health
      const backendResponse = await axios.get(`${this.config.backendUrl}/health`);
      const backendState = {
        available: backendResponse.status === 200,
        health: backendResponse.data,
        responseTime: Date.now()
      };

      // Attempt WebSocket connection to check availability
      const wsState = await this.checkWebSocketAvailability();

      const allStatesHealthy = frontendState.available && 
                              backendState.available && 
                              wsState.available;

      this.recordStateSnapshot('initial', {
        frontend: frontendState,
        backend: backendState,
        websocket: wsState
      });

      return {
        success: allStatesHealthy,
        frontend: frontendState,
        backend: backendState,
        websocket: wsState
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkWebSocketAvailability() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(this.config.wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({
          available: false,
          error: 'Connection timeout',
          responseTime: Date.now() - startTime
        });
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve({
          available: true,
          responseTime: Date.now() - startTime
        });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          available: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });
    });
  }

  async validateConnectionEstablishment() {
    console.log('🔌 Validating connection establishment states...');
    
    try {
      const stateChecks = [];
      let ws = null;

      // Establish WebSocket connection and monitor state changes
      ws = new WebSocket(this.config.wsUrl);
      
      return new Promise((resolve) => {
        const startTime = Date.now();
        let connectionEstablished = false;
        
        const stateInterval = setInterval(() => {
          const currentState = this.captureCurrentState(ws);
          stateChecks.push(currentState);
          
          // Check for state consistency
          this.validateStateConsistency_internal(currentState);
        }, this.config.stateCheckInterval);

        const timeout = setTimeout(() => {
          clearInterval(stateInterval);
          if (ws) ws.close();
          
          resolve({
            success: connectionEstablished,
            stateChecks,
            inconsistencies: this.inconsistencies.filter(i => 
              i.timestamp >= startTime
            )
          });
        }, this.config.consistencyTimeout);

        ws.on('open', () => {
          connectionEstablished = true;
          this.recordStateSnapshot('connection_established', {
            websocket: { readyState: ws.readyState, url: ws.url },
            timestamp: Date.now()
          });
        });

        ws.on('error', (error) => {
          this.recordInconsistency('connection_establishment_failed', {
            error: error.message,
            expectedState: 'OPEN',
            actualState: ws.readyState
          });
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateStatesDuringActivity() {
    console.log('⚡ Validating states during active communication...');
    
    try {
      const ws = new WebSocket(this.config.wsUrl);
      const activityStates = [];
      
      return new Promise((resolve) => {
        let messagesExchanged = 0;
        const targetMessages = 10;
        const startTime = Date.now();

        ws.on('open', () => {
          // Send periodic messages and monitor state consistency
          const messageInterval = setInterval(() => {
            if (messagesExchanged >= targetMessages) {
              clearInterval(messageInterval);
              
              setTimeout(() => {
                ws.close();
                resolve({
                  success: true,
                  messagesExchanged,
                  activityStates,
                  stateConsistent: this.inconsistencies.filter(i => 
                    i.timestamp >= startTime
                  ).length === 0
                });
              }, 1000);
              return;
            }

            // Send test message
            const message = {
              type: 'state_test',
              sequence: messagesExchanged,
              timestamp: Date.now()
            };

            ws.send(JSON.stringify(message));
            messagesExchanged++;

            // Capture state after each message
            const currentState = this.captureCurrentState(ws);
            activityStates.push({
              messageSequence: messagesExchanged,
              state: currentState,
              timestamp: Date.now()
            });

            // Validate message delivery state consistency
            this.validateMessageDeliveryState(message, currentState);
            
          }, 500);
        });

        ws.on('message', (data) => {
          try {
            const response = JSON.parse(data);
            this.validateResponseState(response);
          } catch (error) {
            this.recordInconsistency('message_parse_error', {
              error: error.message,
              rawData: data.toString()
            });
          }
        });

        ws.on('error', (error) => {
          resolve({
            success: false,
            error: error.message,
            messagesExchanged,
            activityStates
          });
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateDisconnectionStates() {
    console.log('🔌❌ Validating disconnection state handling...');
    
    try {
      const ws = new WebSocket(this.config.wsUrl);
      
      return new Promise((resolve) => {
        let connectionClosed = false;
        const startTime = Date.now();
        const disconnectionStates = [];

        ws.on('open', () => {
          // Monitor state before forced disconnection
          const preDisconnectState = this.captureCurrentState(ws);
          disconnectionStates.push({
            phase: 'pre_disconnect',
            state: preDisconnectState,
            timestamp: Date.now()
          });

          // Force disconnection after 2 seconds
          setTimeout(() => {
            ws.terminate(); // Abrupt disconnection
          }, 2000);
        });

        ws.on('close', (code, reason) => {
          connectionClosed = true;
          
          // Monitor post-disconnection state
          const postDisconnectState = this.captureCurrentState(ws);
          disconnectionStates.push({
            phase: 'post_disconnect',
            state: postDisconnectState,
            closeCode: code,
            closeReason: reason,
            timestamp: Date.now()
          });

          // Validate that system handled disconnection properly
          this.validateDisconnectionHandling(postDisconnectState, code);

          setTimeout(() => {
            resolve({
              success: connectionClosed,
              disconnectionStates,
              closeCode: code,
              closeReason: reason,
              handledProperly: this.inconsistencies.filter(i => 
                i.timestamp >= startTime && i.type.includes('disconnect')
              ).length === 0
            });
          }, 1000);
        });

        ws.on('error', (error) => {
          resolve({
            success: false,
            error: error.message,
            disconnectionStates
          });
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateReconnectionStates() {
    console.log('🔄 Validating reconnection state recovery...');
    
    try {
      const reconnectionStates = [];
      let reconnectionSuccessful = false;

      // First connection
      let ws1 = new WebSocket(this.config.wsUrl);
      
      return new Promise((resolve) => {
        ws1.on('open', () => {
          // Close first connection
          ws1.close();
          
          // Attempt reconnection
          setTimeout(() => {
            const ws2 = new WebSocket(this.config.wsUrl);
            
            ws2.on('open', () => {
              reconnectionSuccessful = true;
              
              const reconnectState = this.captureCurrentState(ws2);
              reconnectionStates.push({
                phase: 'reconnection_successful',
                state: reconnectState,
                timestamp: Date.now()
              });

              // Validate state recovery
              this.validateStateRecovery(reconnectState);

              ws2.close();
              
              setTimeout(() => {
                resolve({
                  success: reconnectionSuccessful,
                  reconnectionStates,
                  stateRecovered: this.inconsistencies.filter(i => 
                    i.type.includes('recovery')
                  ).length === 0
                });
              }, 1000);
            });

            ws2.on('error', (error) => {
              resolve({
                success: false,
                error: error.message,
                reconnectionStates
              });
            });
          }, 1000);
        });
      });

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  captureCurrentState(ws) {
    return {
      websocket: {
        readyState: ws ? ws.readyState : null,
        url: ws ? ws.url : null,
        protocol: ws ? ws.protocol : null
      },
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  validateStateConsistency_internal(currentState) {
    // Check WebSocket state consistency
    if (currentState.websocket.readyState !== undefined) {
      const validStates = [WebSocket.CONNECTING, WebSocket.OPEN, WebSocket.CLOSING, WebSocket.CLOSED];
      if (!validStates.includes(currentState.websocket.readyState)) {
        this.recordInconsistency('invalid_websocket_state', {
          actualState: currentState.websocket.readyState,
          validStates,
          timestamp: currentState.timestamp
        });
      }
    }
  }

  validateMessageDeliveryState(message, state) {
    // Validate that message sending doesn't corrupt state
    if (state.websocket.readyState !== WebSocket.OPEN) {
      this.recordInconsistency('message_sent_invalid_state', {
        message,
        websocketState: state.websocket.readyState,
        expectedState: WebSocket.OPEN
      });
    }
  }

  validateResponseState(response) {
    // Validate response format and timing
    if (!response.timestamp) {
      this.recordInconsistency('response_missing_timestamp', {
        response
      });
    }
  }

  validateDisconnectionHandling(state, closeCode) {
    // Validate proper cleanup after disconnection
    if (state.websocket.readyState !== WebSocket.CLOSED) {
      this.recordInconsistency('disconnect_state_inconsistent', {
        expectedState: WebSocket.CLOSED,
        actualState: state.websocket.readyState,
        closeCode
      });
    }
  }

  validateStateRecovery(reconnectState) {
    // Validate that reconnection restores proper state
    if (reconnectState.websocket.readyState !== WebSocket.OPEN) {
      this.recordInconsistency('reconnection_state_recovery_failed', {
        expectedState: WebSocket.OPEN,
        actualState: reconnectState.websocket.readyState
      });
    }
  }

  recordStateSnapshot(phase, stateData) {
    this.stateHistory.push({
      phase,
      timestamp: Date.now(),
      data: stateData
    });
  }

  recordInconsistency(type, details) {
    const inconsistency = {
      type,
      timestamp: Date.now(),
      details
    };
    
    this.inconsistencies.push(inconsistency);
    console.warn(`⚠️  State inconsistency detected: ${type}`, details);
  }

  async validateConcurrentStateChanges(concurrencyLevel = 5) {
    console.log(`🔀 Testing concurrent state changes (${concurrencyLevel} clients)...`);
    
    const promises = [];
    for (let i = 0; i < concurrencyLevel; i++) {
      promises.push(this.simulateConcurrentClient(`client-${i}`));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;

    // Check for race condition inconsistencies
    const raceConditions = this.inconsistencies.filter(i => 
      i.type.includes('race') || i.type.includes('concurrent')
    );

    return {
      concurrencyLevel,
      successful,
      failed: concurrencyLevel - successful,
      raceConditions: raceConditions.length,
      stateIntegrity: raceConditions.length === 0
    };
  }

  async simulateConcurrentClient(clientId) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      const startTime = Date.now();
      
      ws.on('open', () => {
        // Rapid state changes
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              clientId,
              action: 'state_change',
              sequence: i,
              timestamp: Date.now()
            }));
          }, i * 100);
        }

        setTimeout(() => {
          ws.close();
          resolve({
            clientId,
            success: true,
            duration: Date.now() - startTime
          });
        }, 2000);
      });

      ws.on('error', (error) => {
        resolve({
          clientId,
          success: false,
          error: error.message
        });
      });
    });
  }

  getStateHistory() {
    return this.stateHistory;
  }

  getInconsistencies() {
    return this.inconsistencies;
  }

  generateStateReport() {
    return {
      summary: {
        totalStateSnapshots: this.stateHistory.length,
        totalInconsistencies: this.inconsistencies.length,
        inconsistencyRate: this.stateHistory.length > 0 
          ? (this.inconsistencies.length / this.stateHistory.length * 100).toFixed(2) + '%'
          : '0%'
      },
      inconsistenciesByType: this.inconsistencies.reduce((acc, inc) => {
        acc[inc.type] = (acc[inc.type] || 0) + 1;
        return acc;
      }, {}),
      stateHistory: this.stateHistory,
      inconsistencies: this.inconsistencies
    };
  }
}

module.exports = { ConnectionStateChecker };