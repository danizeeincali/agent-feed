#!/usr/bin/env node

/**
 * ULTRA COMPREHENSIVE TEST
 * Tests the ULTRA fix for Claude Code terminal duplication and connection issues
 * 
 * This will verify EVERYTHING works 100% real with NO simulations/mocks:
 * 1. Backend deduplication works correctly
 * 2. Instance isolation is perfect
 * 3. Send button targets correct instance
 * 4. No duplicate outputs
 * 5. Terminal connects only to selected instance
 * 6. Real commands work properly
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

class UltraComprehensiveTest {
  constructor() {
    this.testResults = [];
    this.instances = [];
    this.connections = new Map();
    this.receivedOutputs = new Map();
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async addTestResult(test, passed, details = '') {
    this.testResults.push({ test, passed, details });
    await this.log(`${test}: ${passed ? '✅ PASSED' : '❌ FAILED'} ${details}`, passed ? 'success' : 'error');
  }

  async createSingleInstance() {
    await this.log('Creating single Claude instance for ULTRA testing...');
    
    try {
      const response = await fetch(`${API_BASE}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dev',
          workingDirectory: '/workspaces/agent-feed',
          command: 'claude code'
        })
      });

      const data = await response.json();
      if (data.success && data.instance) {
        this.instances.push(data.instance);
        this.receivedOutputs.set(data.instance.id, []);
        await this.log(`Instance created: ${data.instance.id}`, 'success');
        return data.instance;
      } else {
        throw new Error(`Failed to create instance: ${data.error}`);
      }
    } catch (error) {
      await this.log(`Error creating instance: ${error.message}`, 'error');
      throw error;
    }
  }

  async connectToInstance(instanceId, testName = '') {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE}/terminal`);
      
      ws.on('open', () => {
        this.log(`${testName}: WebSocket connected to ${instanceId.slice(0, 8)}`);
        
        // Send connection message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId,
          timestamp: Date.now()
        }));
        
        this.connections.set(`${testName}-${instanceId}`, ws);
        resolve(ws);
      });

      let outputCount = 0;
      let duplicateCount = 0;
      let lastOutput = '';

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'output' || message.type === 'terminal_output') {
            const output = message.data || message.output;
            outputCount++;
            
            // Check for duplicates
            if (output === lastOutput && output.trim().length > 0) {
              duplicateCount++;
              this.log(`${testName}: 🔄 DUPLICATE DETECTED: "${output.slice(0, 50)}..."`, 'warning');
            }
            lastOutput = output;
            
            this.receivedOutputs.get(instanceId).push({
              timestamp: Date.now(),
              content: output,
              testName: testName,
              outputNumber: outputCount,
              isDuplicate: output === lastOutput
            });
            
            this.log(`${testName}: Output #${outputCount} (${output.length} chars): "${output.slice(0, 50)}..."`);
          }
        } catch (err) {
          this.log(`${testName}: Error parsing message: ${err.message}`, 'error');
        }
      });

      ws.on('error', (error) => {
        this.log(`${testName}: WebSocket error: ${error.message}`, 'error');
        reject(error);
      });

      ws.on('close', () => {
        this.log(`${testName}: WebSocket closed. Total outputs: ${outputCount}, Duplicates: ${duplicateCount}`);
        this.connections.delete(`${testName}-${instanceId}`);
      });
    });
  }

  async sendCommand(instanceId, command, testName = '') {
    const wsKey = `${testName}-${instanceId}`;
    const ws = this.connections.get(wsKey);
    if (!ws) {
      throw new Error(`No connection found for ${testName}-${instanceId}`);
    }

    await this.log(`${testName}: Sending command "${command}"`);
    
    ws.send(JSON.stringify({
      type: 'input',
      data: command + '\n',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
  }

  async testBackendDeduplication() {
    await this.log('\n🔥 ULTRA TEST 1: Backend Deduplication');
    
    const instance = await this.createSingleInstance();
    const ws = await this.connectToInstance(instance.id, 'DEDUP_TEST');
    
    // Wait for initial Claude Code UI to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Count outputs received in first 3 seconds
    const initialOutputs = this.receivedOutputs.get(instance.id);
    const initialCount = initialOutputs.length;
    
    // Look for duplicate patterns
    const duplicatePatterns = new Map();
    let duplicateCount = 0;
    
    for (let i = 0; i < initialOutputs.length; i++) {
      const output = initialOutputs[i];
      const content = output.content.trim();
      if (content.length > 10) { // Only check substantial content
        if (duplicatePatterns.has(content)) {
          duplicateCount++;
          await this.log(`DUPLICATE FOUND: "${content.slice(0, 50)}..."`, 'warning');
        } else {
          duplicatePatterns.set(content, true);
        }
      }
    }
    
    await this.addTestResult(
      'Backend Deduplication', 
      duplicateCount === 0, 
      `${duplicateCount} duplicates found in ${initialCount} outputs`
    );
    
    ws.close();
    return duplicateCount === 0;
  }

  async testSendButtonFunctionality() {
    await this.log('\n🔥 ULTRA TEST 2: Send Button Functionality');
    
    const instance = this.instances[0] || await this.createSingleInstance();
    const ws = await this.connectToInstance(instance.id, 'SEND_TEST');
    
    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const preCommandCount = this.receivedOutputs.get(instance.id).length;
    
    // Send a unique test command
    const testCommand = `echo "ULTRA_TEST_${Date.now()}"`;
    await this.sendCommand(instance.id, testCommand, 'SEND_TEST');
    
    // Wait for command to process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const postCommandCount = this.receivedOutputs.get(instance.id).length;
    const newOutputs = this.receivedOutputs.get(instance.id).slice(preCommandCount);
    
    // Check if the command echo was received
    const commandEchoReceived = newOutputs.some(output => 
      output.content.includes(testCommand.replace('echo ', '').replace(/"/g, ''))
    );
    
    await this.addTestResult(
      'Send Button Functionality',
      commandEchoReceived,
      `Command sent, ${newOutputs.length} new outputs, echo received: ${commandEchoReceived}`
    );
    
    ws.close();
    return commandEchoReceived;
  }

  async testInstanceIsolation() {
    await this.log('\n🔥 ULTRA TEST 3: Instance Isolation (Multi-Instance)');
    
    // Create two instances
    const instance1 = this.instances[0] || await this.createSingleInstance();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const instance2 = await this.createSingleInstance();
    
    // Connect to both
    const ws1 = await this.connectToInstance(instance1.id, 'ISOLATION_1');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const ws2 = await this.connectToInstance(instance2.id, 'ISOLATION_2');
    
    // Wait for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Send different commands to each
    const command1 = `echo "INSTANCE_1_UNIQUE_${Date.now()}"`;
    const command2 = `echo "INSTANCE_2_UNIQUE_${Date.now()}"`;
    
    await this.sendCommand(instance1.id, command1, 'ISOLATION_1');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.sendCommand(instance2.id, command2, 'ISOLATION_2');
    
    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Check isolation
    const outputs1 = this.receivedOutputs.get(instance1.id);
    const outputs2 = this.receivedOutputs.get(instance2.id);
    
    const instance1HasOwn = outputs1.some(o => o.content.includes('INSTANCE_1_UNIQUE'));
    const instance1HasOther = outputs1.some(o => o.content.includes('INSTANCE_2_UNIQUE'));
    const instance2HasOwn = outputs2.some(o => o.content.includes('INSTANCE_2_UNIQUE'));
    const instance2HasOther = outputs2.some(o => o.content.includes('INSTANCE_1_UNIQUE'));
    
    const isolationPerfect = instance1HasOwn && !instance1HasOther && instance2HasOwn && !instance2HasOther;
    
    await this.addTestResult(
      'Instance Isolation',
      isolationPerfect,
      `I1(own:${instance1HasOwn}, other:${instance1HasOther}) I2(own:${instance2HasOwn}, other:${instance2HasOther})`
    );
    
    ws1.close();
    ws2.close();
    return isolationPerfect;
  }

  async testConnectionSwitching() {
    await this.log('\n🔥 ULTRA TEST 4: Connection Switching');
    
    const instance1 = this.instances[0];
    const instance2 = this.instances[1];
    
    if (!instance1 || !instance2) {
      await this.addTestResult('Connection Switching', false, 'Need 2 instances - skipped');
      return false;
    }
    
    // Connect to instance 1
    const ws1 = await this.connectToInstance(instance1.id, 'SWITCH_1');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send command to instance 1
    await this.sendCommand(instance1.id, 'echo "SWITCH_TEST_1"', 'SWITCH_1');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Disconnect from instance 1 and connect to instance 2
    ws1.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const ws2 = await this.connectToInstance(instance2.id, 'SWITCH_2');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Send command to instance 2
    await this.sendCommand(instance2.id, 'echo "SWITCH_TEST_2"', 'SWITCH_2');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify clean switching
    const outputs1 = this.receivedOutputs.get(instance1.id);
    const outputs2 = this.receivedOutputs.get(instance2.id);
    
    const switch1Worked = outputs1.some(o => o.content.includes('SWITCH_TEST_1'));
    const switch2Worked = outputs2.some(o => o.content.includes('SWITCH_TEST_2'));
    const noCrossTalk = !outputs1.some(o => o.content.includes('SWITCH_TEST_2')) &&
                       !outputs2.some(o => o.content.includes('SWITCH_TEST_1'));
    
    const switchingWorks = switch1Worked && switch2Worked && noCrossTalk;
    
    await this.addTestResult(
      'Connection Switching',
      switchingWorks,
      `Switch1: ${switch1Worked}, Switch2: ${switch2Worked}, NoCrossTalk: ${noCrossTalk}`
    );
    
    ws2.close();
    return switchingWorks;
  }

  async cleanup() {
    await this.log('\n🧹 CLEANUP');
    
    // Close all connections
    for (const [key, ws] of this.connections) {
      await this.log(`Closing connection: ${key}`);
      ws.close();
    }
    
    // Terminate all instances
    for (const instance of this.instances) {
      try {
        await this.log(`Terminating instance: ${instance.id.slice(0, 8)}`);
        const response = await fetch(`${API_BASE}/api/claude/instances/${instance.id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
          await this.log(`Instance ${instance.id.slice(0, 8)} terminated`, 'success');
        }
      } catch (error) {
        await this.log(`Error terminating ${instance.id.slice(0, 8)}: ${error.message}`, 'error');
      }
    }
  }

  async runUltraTest() {
    await this.log('🚀🚀🚀 ULTRA COMPREHENSIVE TEST STARTED 🚀🚀🚀');
    await this.log('This test will verify EVERYTHING works 100% real with NO mocks/simulations');
    await this.log('Testing the ULTRA fix for Claude Code terminal duplication and connection issues');
    
    try {
      // Run all tests
      const test1 = await this.testBackendDeduplication();
      const test2 = await this.testSendButtonFunctionality();
      const test3 = await this.testInstanceIsolation();
      const test4 = await this.testConnectionSwitching();
      
      // Results
      await this.log('\n📊 ULTRA COMPREHENSIVE TEST RESULTS:');
      
      let allPassed = true;
      for (const result of this.testResults) {
        await this.log(`${result.test}: ${result.passed ? '✅ PASSED' : '❌ FAILED'} ${result.details}`);
        if (!result.passed) allPassed = false;
      }
      
      const overallResult = allPassed && test1 && test2 && test3 && test4;
      
      await this.log(`\n🎯 OVERALL ULTRA TEST RESULT: ${overallResult ? '✅ PERFECT SUCCESS' : '❌ ISSUES DETECTED'}`);
      
      if (overallResult) {
        await this.log('🎉 ALL SYSTEMS WORKING PERFECTLY!');
        await this.log('✅ No more duplicates');
        await this.log('✅ Perfect instance isolation');
        await this.log('✅ Send button works correctly');
        await this.log('✅ Connection switching is clean');
        await this.log('✅ Terminal connects only to selected instance');
        await this.log('🎯 USER ISSUE COMPLETELY RESOLVED!');
      } else {
        await this.log('❌ Some issues remain - needs more work');
      }
      
      return overallResult;
      
    } catch (error) {
      await this.log(`ULTRA test execution failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the ULTRA test
if (require.main === module) {
  const test = new UltraComprehensiveTest();
  test.runUltraTest()
    .then(result => {
      console.log(`\n🔥 ULTRA TEST COMPLETED: ${result ? 'SUCCESS' : 'FAILURE'}`);
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('ULTRA Test runner error:', error);
      process.exit(1);
    });
}

module.exports = UltraComprehensiveTest;