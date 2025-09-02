/**
 * Error Recovery Mechanism Tester
 * Tests system resilience and error recovery capabilities
 */

const WebSocket = require('ws');
const axios = require('axios');
const { EventEmitter } = require('events');

class ErrorRecoveryTester extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      apiUrl: config.apiUrl || 'http://localhost:3001/api',
      maxRecoveryTime: config.maxRecoveryTime || 10000, // 10 seconds
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 2000,
      errorThreshold: config.errorThreshold || 0.1, // 10% error rate
      ...config
    };
    
    this.recoveryResults = [];
    this.errorScenarios = [];
  }

  async testErrorRecoveryMechanisms() {
    const testId = `error-recovery-${Date.now()}`;
    console.log(`🚨 Starting error recovery testing: ${testId}`);
    
    const results = {
      testId,
      timestamp: new Date().toISOString(),
      recoveryTests: [],
      overallRecovery: {},
      success: false
    };

    try {
      // Test 1: WebSocket Connection Errors
      const wsErrorRecovery = await this.testWebSocketErrorRecovery();
      results.recoveryTests.push({ name: 'websocket_error_recovery', ...wsErrorRecovery });

      // Test 2: API Error Recovery
      const apiErrorRecovery = await this.testAPIErrorRecovery();
      results.recoveryTests.push({ name: 'api_error_recovery', ...apiErrorRecovery });

      // Test 3: Network Interruption Recovery
      const networkRecovery = await this.testNetworkInterruptionRecovery();
      results.recoveryTests.push({ name: 'network_interruption_recovery', ...networkRecovery });

      // Test 4: Server Overload Recovery
      const overloadRecovery = await this.testServerOverloadRecovery();
      results.recoveryTests.push({ name: 'server_overload_recovery', ...overloadRecovery });

      // Test 5: Malformed Data Handling
      const malformedDataRecovery = await this.testMalformedDataRecovery();
      results.recoveryTests.push({ name: 'malformed_data_recovery', ...malformedDataRecovery });

      // Test 6: Concurrent Error Scenarios
      const concurrentErrorRecovery = await this.testConcurrentErrorRecovery();
      results.recoveryTests.push({ name: 'concurrent_error_recovery', ...concurrentErrorRecovery });

      results.overallRecovery = this.calculateOverallRecovery(results.recoveryTests);
      results.success = results.overallRecovery.passed;
      results.errorScenarios = this.errorScenarios;

      return results;

    } catch (error) {
      console.error(`❌ Error recovery testing failed: ${error.message}`);
      return {
        ...results,
        success: false,
        error: error.message
      };
    }
  }

  async testWebSocketErrorRecovery() {
    console.log('🔌 Testing WebSocket error recovery...');
    
    const recoveryScenarios = [
      {
        name: 'connection_refused',
        test: () => this.testConnectionRefusedRecovery()
      },
      {
        name: 'unexpected_disconnect',
        test: () => this.testUnexpectedDisconnectRecovery()
      },
      {
        name: 'connection_timeout',
        test: () => this.testConnectionTimeoutRecovery()
      },
      {
        name: 'invalid_url',
        test: () => this.testInvalidURLRecovery()
      }
    ];

    const scenarioResults = [];
    
    for (const scenario of recoveryScenarios) {
      try {
        console.log(`  Testing ${scenario.name}...`);
        const result = await scenario.test();
        scenarioResults.push({
          scenario: scenario.name,
          ...result
        });
      } catch (error) {
        scenarioResults.push({
          scenario: scenario.name,
          recovered: false,
          error: error.message
        });
      }
    }

    const successfulRecoveries = scenarioResults.filter(r => r.recovered).length;
    const recoveryRate = (successfulRecoveries / scenarioResults.length) * 100;

    return {
      recovered: recoveryRate >= 75, // 75% recovery rate threshold
      scenarios: scenarioResults,
      recoveryRate: recoveryRate.toFixed(2),
      averageRecoveryTime: this.calculateAverageRecoveryTime(scenarioResults)
    };
  }

  async testConnectionRefusedRecovery() {
    // Test connecting to a port that's likely not in use
    const invalidUrl = 'ws://localhost:9999';
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      let attempts = 0;
      const maxAttempts = 3;
      
      const attemptConnection = () => {
        attempts++;
        const ws = new WebSocket(invalidUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          
          if (attempts < maxAttempts) {
            setTimeout(attemptConnection, this.config.retryDelay);
          } else {
            // After failed attempts, try valid connection
            this.testRecoveryToValidConnection().then(validResult => {
              resolve({
                recovered: validResult.recovered,
                recoveryTime: Date.now() - startTime,
                attempts,
                finalAttemptSuccessful: validResult.recovered
              });
            });
          }
        }, 2000);

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve({
            recovered: true,
            recoveryTime: Date.now() - startTime,
            attempts,
            unexpectedSuccess: true
          });
        });

        ws.on('error', () => {
          clearTimeout(timeout);
          // Expected error, continue to next attempt or recovery test
        });
      };

      attemptConnection();
    });
  }

  async testUnexpectedDisconnectRecovery() {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      const startTime = Date.now();
      
      ws.on('open', () => {
        // Simulate unexpected disconnect after 1 second
        setTimeout(() => {
          ws.terminate(); // Force close without proper handshake
          
          // Attempt recovery
          setTimeout(() => {
            this.testRecoveryToValidConnection().then(recoveryResult => {
              resolve({
                recovered: recoveryResult.recovered,
                recoveryTime: Date.now() - startTime,
                disconnectSimulated: true
              });
            });
          }, 1000);
        }, 1000);
      });

      ws.on('error', () => {
        resolve({
          recovered: false,
          error: 'Initial connection failed',
          recoveryTime: Date.now() - startTime
        });
      });
    });
  }

  async testConnectionTimeoutRecovery() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Use a valid URL but very short timeout to force timeout
      const ws = new WebSocket(this.config.wsUrl);
      
      // Force timeout by immediately closing
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
          
          // Test recovery
          this.testRecoveryToValidConnection().then(recoveryResult => {
            resolve({
              recovered: recoveryResult.recovered,
              recoveryTime: Date.now() - startTime,
              timeoutSimulated: true
            });
          });
        }
      }, 100); // Very short timeout

      ws.on('open', () => {
        ws.close();
        resolve({
          recovered: true,
          recoveryTime: Date.now() - startTime,
          noTimeoutNeeded: true
        });
      });

      ws.on('error', () => {
        this.testRecoveryToValidConnection().then(recoveryResult => {
          resolve({
            recovered: recoveryResult.recovered,
            recoveryTime: Date.now() - startTime
          });
        });
      });
    });
  }

  async testInvalidURLRecovery() {
    return new Promise((resolve) => {
      const invalidUrl = 'ws://invalid-hostname-that-does-not-exist.com';
      const startTime = Date.now();
      
      const ws = new WebSocket(invalidUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        
        // Test recovery to valid URL
        this.testRecoveryToValidConnection().then(recoveryResult => {
          resolve({
            recovered: recoveryResult.recovered,
            recoveryTime: Date.now() - startTime,
            invalidUrlTested: true
          });
        });
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve({
          recovered: true,
          recoveryTime: Date.now() - startTime,
          unexpectedSuccess: true
        });
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        
        this.testRecoveryToValidConnection().then(recoveryResult => {
          resolve({
            recovered: recoveryResult.recovered,
            recoveryTime: Date.now() - startTime
          });
        });
      });
    });
  }

  async testRecoveryToValidConnection() {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ recovered: false, error: 'Recovery connection timeout' });
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ recovered: true });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ recovered: false, error: error.message });
      });
    });
  }

  async testAPIErrorRecovery() {
    console.log('🤖 Testing API error recovery...');
    
    const errorScenarios = [
      {
        name: 'invalid_endpoint',
        test: () => this.testInvalidEndpointRecovery()
      },
      {
        name: 'malformed_request',
        test: () => this.testMalformedRequestRecovery()
      },
      {
        name: 'timeout_recovery',
        test: () => this.testAPITimeoutRecovery()
      },
      {
        name: 'server_error_recovery',
        test: () => this.testServerErrorRecovery()
      }
    ];

    const scenarioResults = [];
    
    for (const scenario of errorScenarios) {
      try {
        console.log(`  Testing ${scenario.name}...`);
        const result = await scenario.test();
        scenarioResults.push({
          scenario: scenario.name,
          ...result
        });
      } catch (error) {
        scenarioResults.push({
          scenario: scenario.name,
          recovered: false,
          error: error.message
        });
      }
    }

    const successfulRecoveries = scenarioResults.filter(r => r.recovered).length;
    const recoveryRate = (successfulRecoveries / scenarioResults.length) * 100;

    return {
      recovered: recoveryRate >= 75,
      scenarios: scenarioResults,
      recoveryRate: recoveryRate.toFixed(2),
      averageRecoveryTime: this.calculateAverageRecoveryTime(scenarioResults)
    };
  }

  async testInvalidEndpointRecovery() {
    const startTime = Date.now();
    
    try {
      // Try invalid endpoint
      await axios.post(`${this.config.apiUrl}/invalid-endpoint`, {
        message: 'test'
      }, { timeout: 5000 });
      
      return {
        recovered: false,
        error: 'Invalid endpoint should have failed',
        recoveryTime: Date.now() - startTime
      };
    } catch (error) {
      // Expected error, now test recovery with valid endpoint
      try {
        const response = await axios.post(`${this.config.apiUrl}/chat`, {
          message: 'Recovery test after invalid endpoint',
          sessionId: 'error-recovery-test'
        }, { timeout: 10000 });
        
        return {
          recovered: response.status === 200 && response.data.response,
          recoveryTime: Date.now() - startTime,
          validResponseReceived: true
        };
      } catch (recoveryError) {
        return {
          recovered: false,
          error: 'Failed to recover with valid endpoint',
          recoveryTime: Date.now() - startTime
        };
      }
    }
  }

  async testMalformedRequestRecovery() {
    const startTime = Date.now();
    
    try {
      // Send malformed request
      await axios.post(`${this.config.apiUrl}/chat`, {
        // Missing required fields
      }, { timeout: 5000 });
      
      return {
        recovered: false,
        error: 'Malformed request should have failed',
        recoveryTime: Date.now() - startTime
      };
    } catch (error) {
      // Expected error, test recovery with valid request
      try {
        const response = await axios.post(`${this.config.apiUrl}/chat`, {
          message: 'Recovery test after malformed request',
          sessionId: 'error-recovery-test'
        }, { timeout: 10000 });
        
        return {
          recovered: response.status === 200 && response.data.response,
          recoveryTime: Date.now() - startTime,
          recoveredFromMalformed: true
        };
      } catch (recoveryError) {
        return {
          recovered: false,
          error: 'Failed to recover after malformed request',
          recoveryTime: Date.now() - startTime
        };
      }
    }
  }

  async testAPITimeoutRecovery() {
    const startTime = Date.now();
    
    try {
      // Try with very short timeout to force timeout
      await axios.post(`${this.config.apiUrl}/chat`, {
        message: 'This should timeout',
        sessionId: 'timeout-test'
      }, { timeout: 1 }); // 1ms timeout
      
      return {
        recovered: false,
        error: 'Request should have timed out',
        recoveryTime: Date.now() - startTime
      };
    } catch (error) {
      // Expected timeout, test recovery with normal timeout
      try {
        const response = await axios.post(`${this.config.apiUrl}/chat`, {
          message: 'Recovery test after timeout',
          sessionId: 'timeout-recovery-test'
        }, { timeout: 30000 });
        
        return {
          recovered: response.status === 200 && response.data.response,
          recoveryTime: Date.now() - startTime,
          timeoutRecovery: true
        };
      } catch (recoveryError) {
        return {
          recovered: false,
          error: 'Failed to recover after timeout',
          recoveryTime: Date.now() - startTime
        };
      }
    }
  }

  async testServerErrorRecovery() {
    const startTime = Date.now();
    
    // This test assumes the server handles errors gracefully
    // We'll send a request and then immediately send another to test recovery
    
    try {
      // Send a potentially problematic request (very long message)
      const longMessage = 'x'.repeat(100000); // 100KB message
      
      await axios.post(`${this.config.apiUrl}/chat`, {
        message: longMessage,
        sessionId: 'server-error-test'
      }, { timeout: 5000 });
      
      // If this succeeds, that's actually good - server handled large request
      // Now test normal request
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        message: 'Normal request after large request',
        sessionId: 'server-recovery-test'
      }, { timeout: 10000 });
      
      return {
        recovered: response.status === 200 && response.data.response,
        recoveryTime: Date.now() - startTime,
        serverHandledLargeRequest: true
      };
      
    } catch (error) {
      // Expected error with large request, test recovery
      try {
        const response = await axios.post(`${this.config.apiUrl}/chat`, {
          message: 'Recovery test after server error',
          sessionId: 'server-error-recovery-test'
        }, { timeout: 10000 });
        
        return {
          recovered: response.status === 200 && response.data.response,
          recoveryTime: Date.now() - startTime,
          recoveredAfterError: true
        };
      } catch (recoveryError) {
        return {
          recovered: false,
          error: 'Failed to recover after server error',
          recoveryTime: Date.now() - startTime
        };
      }
    }
  }

  async testNetworkInterruptionRecovery() {
    console.log('📡 Testing network interruption recovery...');
    
    // Since we can't actually simulate network interruption easily,
    // we'll test rapid connect/disconnect scenarios
    
    const interruptions = [];
    
    for (let i = 0; i < 5; i++) {
      const result = await this.simulateNetworkInterruption(`interruption-${i}`);
      interruptions.push(result);
    }
    
    const successful = interruptions.filter(r => r.recovered).length;
    const recoveryRate = (successful / interruptions.length) * 100;
    
    return {
      recovered: recoveryRate >= 60, // 60% recovery rate for network interruptions
      interruptions,
      recoveryRate: recoveryRate.toFixed(2),
      averageRecoveryTime: this.calculateAverageRecoveryTime(interruptions)
    };
  }

  async simulateNetworkInterruption(interruptionId) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(this.config.wsUrl);
      
      ws.on('open', () => {
        // Simulate interruption by forcing close after short time
        setTimeout(() => {
          ws.terminate();
          
          // Attempt recovery after delay
          setTimeout(() => {
            const recoveryWs = new WebSocket(this.config.wsUrl);
            
            recoveryWs.on('open', () => {
              recoveryWs.close();
              resolve({
                interruptionId,
                recovered: true,
                recoveryTime: Date.now() - startTime
              });
            });
            
            recoveryWs.on('error', () => {
              resolve({
                interruptionId,
                recovered: false,
                recoveryTime: Date.now() - startTime,
                error: 'Recovery connection failed'
              });
            });
          }, 2000);
        }, 1000);
      });
      
      ws.on('error', () => {
        resolve({
          interruptionId,
          recovered: false,
          recoveryTime: Date.now() - startTime,
          error: 'Initial connection failed'
        });
      });
    });
  }

  async testServerOverloadRecovery() {
    console.log('⚡ Testing server overload recovery...');
    
    // Simulate overload by making many concurrent requests
    const concurrentRequests = 20;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(this.makeOverloadRequest(`overload-${i}`));
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    // After potential overload, test recovery
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for server to recover
    
    const recoveryResult = await this.testRecoveryAfterOverload();
    
    return {
      recovered: recoveryResult.recovered,
      overloadRequests: concurrentRequests,
      successfulOverloadRequests: successful,
      overloadSuccessRate: (successful / concurrentRequests) * 100,
      recoveryAfterOverload: recoveryResult
    };
  }

  async makeOverloadRequest(requestId) {
    try {
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        message: `Overload test request ${requestId}`,
        sessionId: requestId
      }, { timeout: 15000 });
      
      return {
        requestId,
        success: response.status === 200,
        statusCode: response.status
      };
    } catch (error) {
      return {
        requestId,
        success: false,
        error: error.message
      };
    }
  }

  async testRecoveryAfterOverload() {
    try {
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        message: 'Recovery test after server overload',
        sessionId: 'overload-recovery-test'
      }, { timeout: 30000 });
      
      return {
        recovered: response.status === 200 && response.data.response,
        responseTime: response.duration || 0
      };
    } catch (error) {
      return {
        recovered: false,
        error: error.message
      };
    }
  }

  async testMalformedDataRecovery() {
    console.log('📝 Testing malformed data recovery...');
    
    const malformedScenarios = [
      {
        name: 'invalid_json',
        data: '{"invalid": json}'
      },
      {
        name: 'null_values',
        data: { message: null, sessionId: null }
      },
      {
        name: 'wrong_types',
        data: { message: 123, sessionId: true }
      },
      {
        name: 'missing_fields',
        data: {}
      }
    ];
    
    const scenarioResults = [];
    
    for (const scenario of malformedScenarios) {
      const result = await this.testMalformedScenario(scenario);
      scenarioResults.push(result);
    }
    
    const recoveredScenarios = scenarioResults.filter(r => r.recovered).length;
    const recoveryRate = (recoveredScenarios / scenarioResults.length) * 100;
    
    return {
      recovered: recoveryRate >= 75, // Should handle most malformed data gracefully
      scenarios: scenarioResults,
      recoveryRate: recoveryRate.toFixed(2)
    };
  }

  async testMalformedScenario(scenario) {
    const startTime = Date.now();
    
    try {
      // Send malformed data
      const response = await axios.post(`${this.config.apiUrl}/chat`, scenario.data, {
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      });
      
      // Check if server handled it gracefully (returned error but didn't crash)
      const handledGracefully = response.status === 400 || response.status === 422;
      
      if (handledGracefully) {
        // Test recovery with valid data
        const recoveryResponse = await axios.post(`${this.config.apiUrl}/chat`, {
          message: 'Recovery test after malformed data',
          sessionId: 'malformed-recovery-test'
        }, { timeout: 10000 });
        
        return {
          scenario: scenario.name,
          recovered: recoveryResponse.status === 200 && recoveryResponse.data.response,
          recoveryTime: Date.now() - startTime,
          gracefulErrorHandling: true
        };
      } else {
        return {
          scenario: scenario.name,
          recovered: false,
          recoveryTime: Date.now() - startTime,
          error: 'Server did not handle malformed data gracefully'
        };
      }
      
    } catch (error) {
      // Test if we can recover after the error
      try {
        const recoveryResponse = await axios.post(`${this.config.apiUrl}/chat`, {
          message: 'Recovery test after malformed data error',
          sessionId: 'malformed-error-recovery-test'
        }, { timeout: 10000 });
        
        return {
          scenario: scenario.name,
          recovered: recoveryResponse.status === 200 && recoveryResponse.data.response,
          recoveryTime: Date.now() - startTime,
          errorOccurred: true
        };
      } catch (recoveryError) {
        return {
          scenario: scenario.name,
          recovered: false,
          recoveryTime: Date.now() - startTime,
          error: 'Failed to recover after malformed data error'
        };
      }
    }
  }

  async testConcurrentErrorRecovery() {
    console.log('🔀 Testing concurrent error recovery...');
    
    // Simulate multiple clients encountering errors simultaneously
    const concurrentErrors = 5;
    const promises = [];
    
    for (let i = 0; i < concurrentErrors; i++) {
      promises.push(this.simulateConcurrentError(`concurrent-${i}`));
    }
    
    const results = await Promise.allSettled(promises);
    const recovered = results.filter(r => 
      r.status === 'fulfilled' && r.value.recovered
    ).length;
    
    const recoveryRate = (recovered / concurrentErrors) * 100;
    
    return {
      recovered: recoveryRate >= 70, // 70% recovery rate for concurrent errors
      concurrentErrors,
      recoveredConnections: recovered,
      recoveryRate: recoveryRate.toFixed(2),
      results: results.map(r => r.status === 'fulfilled' ? r.value : { recovered: false, error: r.reason?.message })
    };
  }

  async simulateConcurrentError(errorId) {
    // Simulate error by rapid connect/disconnect followed by recovery attempt
    return new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(this.config.wsUrl);
      
      ws.on('open', () => {
        // Immediately force error condition
        ws.terminate();
        
        // Attempt recovery
        setTimeout(() => {
          const recoveryWs = new WebSocket(this.config.wsUrl);
          
          recoveryWs.on('open', () => {
            recoveryWs.close();
            resolve({
              errorId,
              recovered: true,
              recoveryTime: Date.now() - startTime
            });
          });
          
          recoveryWs.on('error', () => {
            resolve({
              errorId,
              recovered: false,
              recoveryTime: Date.now() - startTime,
              error: 'Recovery failed'
            });
          });
        }, Math.random() * 2000); // Random delay to simulate real-world timing
      });
      
      ws.on('error', () => {
        resolve({
          errorId,
          recovered: false,
          recoveryTime: Date.now() - startTime,
          error: 'Initial connection failed'
        });
      });
    });
  }

  calculateAverageRecoveryTime(results) {
    const recoveryTimes = results
      .filter(r => r.recovered && r.recoveryTime)
      .map(r => r.recoveryTime);
    
    return recoveryTimes.length > 0 
      ? (recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length).toFixed(2)
      : 0;
  }

  calculateOverallRecovery(recoveryTests) {
    const totalTests = recoveryTests.length;
    const recoveredTests = recoveryTests.filter(test => test.recovered).length;
    const recoveryPercentage = (recoveredTests / totalTests) * 100;
    
    // Calculate weighted score based on test importance
    const weights = {
      'websocket_error_recovery': 0.25,
      'api_error_recovery': 0.25,
      'network_interruption_recovery': 0.20,
      'server_overload_recovery': 0.15,
      'malformed_data_recovery': 0.10,
      'concurrent_error_recovery': 0.05
    };
    
    let weightedScore = 0;
    recoveryTests.forEach(test => {
      const weight = weights[test.name] || (1 / totalTests);
      weightedScore += (test.recovered ? 1 : 0) * weight;
    });
    
    const overallScore = weightedScore * 100;
    
    let resilience;
    if (overallScore >= 90) resilience = 'excellent';
    else if (overallScore >= 75) resilience = 'good';
    else if (overallScore >= 60) resilience = 'fair';
    else resilience = 'poor';
    
    return {
      totalTests,
      recoveredTests,
      failedTests: totalTests - recoveredTests,
      recoveryPercentage: recoveryPercentage.toFixed(2),
      overallScore: overallScore.toFixed(2),
      resilienceRating: resilience,
      passed: overallScore >= 70, // 70% threshold for passing
      recommendations: this.generateRecoveryRecommendations(recoveryTests, overallScore)
    };
  }

  generateRecoveryRecommendations(recoveryTests, overallScore) {
    const recommendations = [];
    
    if (overallScore < 70) {
      recommendations.push({
        priority: 'high',
        category: 'overall_recovery',
        message: `Overall recovery score (${overallScore.toFixed(1)}%) is below acceptable threshold`,
        actions: [
          'Review and improve error handling mechanisms',
          'Implement comprehensive retry logic',
          'Add connection health monitoring',
          'Design graceful degradation strategies'
        ]
      });
    }
    
    // Check specific test failures
    const failedTests = recoveryTests.filter(test => !test.recovered);
    
    failedTests.forEach(test => {
      switch (test.name) {
        case 'websocket_error_recovery':
          recommendations.push({
            priority: 'high',
            category: 'websocket_recovery',
            message: 'WebSocket error recovery is inadequate',
            actions: [
              'Implement automatic reconnection logic',
              'Add connection state management',
              'Handle WebSocket errors gracefully',
              'Implement exponential backoff for reconnection'
            ]
          });
          break;
          
        case 'api_error_recovery':
          recommendations.push({
            priority: 'high',
            category: 'api_recovery',
            message: 'API error recovery needs improvement',
            actions: [
              'Add API request retry mechanisms',
              'Implement proper error response handling',
              'Add request timeout management',
              'Create fallback API strategies'
            ]
          });
          break;
          
        case 'network_interruption_recovery':
          recommendations.push({
            priority: 'medium',
            category: 'network_recovery',
            message: 'Network interruption recovery is insufficient',
            actions: [
              'Implement network connectivity monitoring',
              'Add offline/online event handling',
              'Create connection state persistence',
              'Design network failure recovery workflows'
            ]
          });
          break;
      }
    });
    
    return recommendations;
  }
}

module.exports = { ErrorRecoveryTester };