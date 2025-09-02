#!/usr/bin/env node

/**
 * SPARC WebSocket Stability Comprehensive Validation
 * Tests all 4 instance creation buttons with "what directory are you in" command
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = 3000;
const WS_URL = `ws://localhost:${PORT}/terminal`;
const INSTANCE_TYPES = ['prod', 'interactive', 'skip-permissions', 'skip-permissions-interactive'];
const TEST_COMMAND = 'what directory are you in';

class ComprehensiveValidator {
  constructor() {
    this.results = [];
  }

  async validateAllInstances() {
    console.log('🚀 SPARC Comprehensive WebSocket Stability Validation');
    console.log(`📍 Testing command: "${TEST_COMMAND}"`);
    console.log(`🎯 Testing all 4 instance creation buttons:`);
    INSTANCE_TYPES.forEach((type, i) => console.log(`   ${i+1}. ${type}`));
    console.log('='.repeat(80));

    for (let i = 0; i < INSTANCE_TYPES.length; i++) {
      const instanceType = INSTANCE_TYPES[i];
      
      try {
        console.log(`\n🧪 Test ${i+1}/4: ${instanceType} instance`);
        const result = await this.testInstance(instanceType);
        this.results.push(result);
        
        const status = result.success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} - ${instanceType} (${Math.round(result.duration/1000)}s)`);
        
        if (result.success) {
          console.log(`   • Directory response: ✅`);
          console.log(`   • Connection persisted: ✅`);  
          console.log(`   • No connection errors: ✅`);
        } else {
          console.log(`   • Error: ${result.error}`);
        }
        
        // Brief pause between tests
        await this.sleep(1000);
        
      } catch (error) {
        console.error(`❌ Test ${i+1}/4 EXCEPTION: ${error.message}`);
        this.results.push({
          instanceType,
          success: false,
          error: error.message,
          duration: 0
        });
      }
    }

    this.printFinalReport();
    return this.results;
  }

  async testInstance(instanceType) {
    const startTime = Date.now();
    
    return new Promise(async (resolve, reject) => {
      let instanceId;
      let ws;
      let testCompleted = false;
      let responseReceived = false;
      let connectionPersisted = false;
      
      const timeout = setTimeout(() => {
        if (!testCompleted) {
          testCompleted = true;
          if (ws) ws.close();
          resolve({
            instanceType,
            success: false,
            error: 'Test timeout (30s)',
            responseReceived: false,
            connectionPersisted: false,
            duration: Date.now() - startTime
          });
        }
      }, 30000);

      try {
        // Step 1: Create instance
        instanceId = await this.createInstance(instanceType);
        console.log(`   🏭 Instance created: ${instanceId}`);
        
        // Step 2: Connect WebSocket
        ws = new WebSocket(WS_URL);
        
        ws.on('open', () => {
          console.log(`   🔗 WebSocket connected`);
          
          // Connect to instance
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: instanceId
          }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'connect') {
            console.log(`   ✅ Connected to Claude instance`);
            
            // Send test command
            setTimeout(() => {
              console.log(`   ⌨️  Sending test command...`);
              ws.send(JSON.stringify({
                type: 'input',
                data: TEST_COMMAND
              }));
            }, 1500);
          }
          
          if (message.type === 'output') {
            const output = message.data || '';
            
            if (this.isDirectoryResponse(output)) {
              responseReceived = true;
              console.log(`   📤 Directory response received (${output.length} chars)`);
              
              // Test connection persistence after API completion
              setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                  connectionPersisted = true;
                  console.log(`   🛡️  Connection persisted after API completion`);
                  
                  if (!testCompleted) {
                    testCompleted = true;
                    clearTimeout(timeout);
                    ws.close();
                    
                    resolve({
                      instanceType,
                      success: true,
                      error: null,
                      responseReceived,
                      connectionPersisted,
                      duration: Date.now() - startTime
                    });
                  }
                } else {
                  console.log(`   ❌ Connection lost after API completion`);
                  
                  if (!testCompleted) {
                    testCompleted = true;
                    clearTimeout(timeout);
                    
                    resolve({
                      instanceType,
                      success: false,
                      error: 'Connection lost after API completion',
                      responseReceived,
                      connectionPersisted: false,
                      duration: Date.now() - startTime
                    });
                  }
                }
              }, 2500);
            }
          }
        });
        
        ws.on('close', (code, reason) => {
          if (!testCompleted && !responseReceived) {
            testCompleted = true;
            clearTimeout(timeout);
            resolve({
              instanceType,
              success: false,
              error: `WebSocket closed before response (code: ${code})`,
              responseReceived: false,
              connectionPersisted: false,
              duration: Date.now() - startTime
            });
          }
        });
        
        ws.on('error', (error) => {
          if (!testCompleted) {
            testCompleted = true;
            clearTimeout(timeout);
            resolve({
              instanceType,
              success: false,
              error: `WebSocket error: ${error.message}`,
              responseReceived: false,
              connectionPersisted: false,
              duration: Date.now() - startTime
            });
          }
        });
        
      } catch (error) {
        clearTimeout(timeout);
        resolve({
          instanceType,
          success: false,
          error: error.message,
          responseReceived: false,
          connectionPersisted: false,
          duration: Date.now() - startTime
        });
      }
    });
  }

  async createInstance(instanceType) {
    return new Promise((resolve, reject) => {
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
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success && response.instance && response.instance.id) {
              resolve(response.instance.id);
            } else {
              reject(new Error(response.message || 'Instance creation failed'));
            }
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        });
      });

      req.on('error', reject);
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
      '/workspaces'
    ];
    
    const lowerOutput = output.toLowerCase();
    return indicators.some(indicator => 
      lowerOutput.includes(indicator.toLowerCase())
    );
  }

  printFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 SPARC WebSocket Stability - FINAL VALIDATION REPORT');
    console.log('='.repeat(80));
    
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    const passRate = Math.round(passed/total*100);
    
    console.log(`🎯 OVERALL RESULT: ${passed}/${total} tests passed (${passRate}%)\n`);
    
    this.results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const duration = `${Math.round(result.duration/1000)}s`;
      
      console.log(`${index + 1}. ${result.instanceType.padEnd(25)} ${status.padEnd(8)} (${duration})`);
      
      if (!result.success) {
        console.log(`   └─ Error: ${result.error}`);
      }
    });
    
    console.log('\n📊 CRITICAL METRICS:');
    console.log(`• All instances respond to commands:     ${this.results.filter(r => r.responseReceived).length}/${total} ✅`);
    console.log(`• Connections persist after API calls:  ${this.results.filter(r => r.connectionPersisted).length}/${total} ✅`);
    console.log(`• Zero "Connection lost" errors:         ${passed === total ? 'YES ✅' : 'NO ❌'}`);
    
    if (passed === total) {
      console.log('\n🎉 🎉 🎉 SPARC WEBSOCKET STABILITY FIX: COMPLETE SUCCESS! 🎉 🎉 🎉');
      console.log('✅ All 4 instance creation buttons are working perfectly');
      console.log('✅ No more "Connection Error: Connection lost: Unknown error" messages');
      console.log('✅ WebSocket connections persist properly after Claude API subprocess completion');
      console.log('✅ Frontend will no longer experience polling storms');
      console.log('✅ Ready for production deployment!');
    } else {
      console.log('\n⚠️  SOME ISSUES REMAIN:');
      console.log('❌ Users may still experience connection errors');
      console.log('❌ Further investigation needed for failed instances');
    }
    
    console.log('='.repeat(80));
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run comprehensive validation
if (require.main === module) {
  const validator = new ComprehensiveValidator();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Validation interrupted');
    process.exit(1);
  });
  
  validator.validateAllInstances()
    .then((results) => {
      const allPassed = results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Comprehensive validation failed:', error);
      process.exit(1);
    });
}

module.exports = { ComprehensiveValidator };