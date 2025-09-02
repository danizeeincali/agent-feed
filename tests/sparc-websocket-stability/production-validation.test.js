#!/usr/bin/env node

/**
 * SPARC WebSocket Stability Production Validation
 * Tests the critical "what directory are you in" command across all 4 instance buttons
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const assert = require('assert');

const PORT = 3000;
const WS_URL = `ws://localhost:${PORT}/terminal`;
const INSTANCE_TYPES = ['prod', 'interactive', 'skip-permissions', 'skip-permissions-interactive'];
const TEST_COMMAND = 'what directory are you in';
const TIMEOUT = 30000; // 30 seconds

class ProductionValidator {
  constructor() {
    this.results = [];
    this.connections = [];
  }

  async validateAllInstances() {
    console.log('🚀 SPARC Production Validation: Testing all 4 instance creation buttons');
    console.log(`📍 Testing command: "${TEST_COMMAND}"`);
    console.log(`🔗 WebSocket URL: ${WS_URL}`);
    console.log('='.repeat(80));

    for (const instanceType of INSTANCE_TYPES) {
      try {
        console.log(`\n🧪 Testing ${instanceType} instance...`);
        const result = await this.validateInstance(instanceType);
        this.results.push(result);
        console.log(`✅ ${instanceType}: ${result.success ? 'PASSED' : 'FAILED'}`);
        
        if (!result.success) {
          console.error(`❌ Error: ${result.error}`);
        }
        
        // Wait between tests to prevent interference
        await this.sleep(2000);
        
      } catch (error) {
        console.error(`❌ ${instanceType}: EXCEPTION - ${error.message}`);
        this.results.push({
          instanceType,
          success: false,
          error: error.message,
          connectionPersisted: false,
          responseReceived: false
        });
      }
    }

    this.printSummary();
    return this.results;
  }

  async validateInstance(instanceType) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let ws;
      let instanceId;
      let connectionEstablished = false;
      let responseReceived = false;
      let connectionPersisted = false;
      let testCompleted = false;

      const timeout = setTimeout(() => {
        if (!testCompleted) {
          testCompleted = true;
          if (ws) ws.close();
          resolve({
            instanceType,
            success: false,
            error: 'Test timeout',
            connectionPersisted,
            responseReceived,
            duration: Date.now() - startTime
          });
        }
      }, TIMEOUT);

      try {
        // Create WebSocket connection
        ws = new WebSocket(WS_URL);
        this.connections.push(ws);

        ws.on('open', () => {
          console.log(`  🔗 WebSocket connected for ${instanceType}`);
          connectionEstablished = true;
          
          // Step 1: Create instance
          this.createInstanceViaHTTP(instanceType)
            .then((createdInstanceId) => {
              instanceId = createdInstanceId;
              console.log(`  🏭 Instance created: ${instanceId}`);
              
              // Step 2: Connect to instance via WebSocket
              ws.send(JSON.stringify({
                type: 'connect',
                terminalId: instanceId
              }));
            })
            .catch((error) => {
              console.error(`  ❌ Instance creation failed: ${error.message}`);
              if (!testCompleted) {
                testCompleted = true;
                clearTimeout(timeout);
                resolve({
                  instanceType,
                  success: false,
                  error: `Instance creation failed: ${error.message}`,
                  connectionPersisted: false,
                  responseReceived: false,
                  duration: Date.now() - startTime
                });
              }
            });
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log(`  📨 ${instanceType}: ${message.type}`);

          // Handle connection confirmation
          if (message.type === 'connect') {
            console.log(`  ✅ Connected to instance ${instanceId}`);
            
            // Step 3: Send test command after brief delay
            setTimeout(() => {
              console.log(`  ⌨️  Sending command: "${TEST_COMMAND}"`);
              ws.send(JSON.stringify({
                type: 'input',
                data: TEST_COMMAND
              }));
            }, 1000);
          }

          // Handle command response
          if (message.type === 'output') {
            const output = message.data || '';
            console.log(`  📤 Output (${output.length} chars): ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
            
            // Check for directory response
            if (this.isDirectoryResponse(output)) {
              responseReceived = true;
              console.log(`  ✅ Directory response detected!`);
              
              // Step 4: Test connection persistence - wait then check connection
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  connectionPersisted = true;
                  console.log(`  ✅ Connection persisted after API completion`);
                } else {
                  console.log(`  ❌ Connection lost after API completion`);
                }
                
                if (!testCompleted) {
                  testCompleted = true;
                  clearTimeout(timeout);
                  ws.close();
                  
                  resolve({
                    instanceType,
                    success: responseReceived && connectionPersisted,
                    error: null,
                    connectionPersisted,
                    responseReceived,
                    output: output.substring(0, 200),
                    duration: Date.now() - startTime
                  });
                }
              }, 3000); // Wait 3 seconds to test persistence
            }
          }
        });

        ws.on('close', (code, reason) => {
          console.log(`  🔌 WebSocket closed: ${code} - ${reason}`);
          
          if (!testCompleted && !responseReceived) {
            testCompleted = true;
            clearTimeout(timeout);
            resolve({
              instanceType,
              success: false,
              error: `Connection closed before response (${code}: ${reason})`,
              connectionPersisted: false,
              responseReceived: false,
              duration: Date.now() - startTime
            });
          }
        });

        ws.on('error', (error) => {
          console.error(`  ❌ WebSocket error: ${error.message}`);
          
          if (!testCompleted) {
            testCompleted = true;
            clearTimeout(timeout);
            resolve({
              instanceType,
              success: false,
              error: `WebSocket error: ${error.message}`,
              connectionPersisted: false,
              responseReceived: false,
              duration: Date.now() - startTime
            });
          }
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  async createInstanceViaHTTP(instanceType) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      
      const postData = JSON.stringify({
        instanceType: instanceType,
        workingDirectory: '/workspaces/agent-feed'
      });

      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/claude/instances',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success && response.instanceId) {
              resolve(response.instanceId);
            } else {
              reject(new Error(response.message || 'Instance creation failed'));
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  isDirectoryResponse(output) {
    const indicators = [
      '/workspaces/agent-feed',
      'current directory',
      'working directory', 
      'pwd',
      'Present working directory',
      '/workspaces'
    ];
    
    const lowerOutput = output.toLowerCase();
    return indicators.some(indicator => lowerOutput.includes(indicator.toLowerCase()));
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 SPARC Production Validation Summary');
    console.log('='.repeat(80));
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`📊 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${Math.round(result.duration/1000)}s`;
      console.log(`${index + 1}. ${result.instanceType}: ${status} (${duration})`);
      
      if (result.success) {
        console.log(`   • Response received: ✅`);
        console.log(`   • Connection persisted: ${result.connectionPersisted ? '✅' : '❌'}`);
      } else {
        console.log(`   • Error: ${result.error}`);
        console.log(`   • Response received: ${result.responseReceived ? '✅' : '❌'}`);
        console.log(`   • Connection persisted: ${result.connectionPersisted ? '✅' : '❌'}`);
      }
    });
    
    console.log('\n🎯 Key Metrics:');
    console.log(`• Connection persistence: ${this.results.filter(r => r.connectionPersisted).length}/${total}`);
    console.log(`• Response reliability: ${this.results.filter(r => r.responseReceived).length}/${total}`);
    console.log(`• Zero "Connection lost" errors: ${passed === total ? '✅' : '❌'}`);
    
    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! WebSocket stability fix is working correctly.');
      console.log('✅ No "Connection Error: Connection lost: Unknown error" should appear in frontend');
    } else {
      console.log('\n⚠️  Some tests failed. WebSocket stability issues may persist.');
      console.log('❌ Users may still experience "Connection Error" messages');
    }
    
    console.log('='.repeat(80));
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanup() {
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionValidator();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down validator...');
    validator.cleanup();
    process.exit(0);
  });
  
  validator.validateAllInstances()
    .then((results) => {
      const allPassed = results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { ProductionValidator };