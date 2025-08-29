#!/usr/bin/env node

/**
 * SPARC Instance Isolation Test
 * Tests the fix for "it is not connecting only to the selected instance on the left"
 * 
 * This test verifies:
 * 1. Multiple instances can be created
 * 2. Only the selected instance receives input
 * 3. Only the selected instance's output is displayed
 * 4. Switching instances properly isolates connections
 * 5. No duplication occurs
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

class InstanceIsolationTest {
  constructor() {
    this.instances = [];
    this.connections = new Map();
    this.outputs = new Map();
    this.testResults = [];
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async createInstances(count = 3) {
    this.log(`Creating ${count} test instances...`);
    
    for (let i = 0; i < count; i++) {
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
          this.outputs.set(data.instance.id, []);
          this.log(`Instance ${i+1} created: ${data.instance.id}`, 'success');
        } else {
          throw new Error(`Failed to create instance ${i+1}: ${data.error}`);
        }
      } catch (error) {
        this.log(`Error creating instance ${i+1}: ${error.message}`, 'error');
        throw error;
      }
      
      // Small delay between creates
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.log(`Successfully created ${this.instances.length} instances`);
    return this.instances;
  }

  async connectToInstance(instanceId) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_BASE}/terminal`);
      
      ws.on('open', () => {
        this.log(`WebSocket connected to ${instanceId.slice(0, 8)}`);
        
        // Send connection message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId,
          timestamp: Date.now()
        }));
        
        this.connections.set(instanceId, ws);
        resolve(ws);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'output' || message.type === 'terminal_output') {
            const output = message.data || message.output;
            this.outputs.get(instanceId).push({
              timestamp: Date.now(),
              content: output,
              source: message.terminalId || instanceId
            });
            this.log(`Output received for ${instanceId.slice(0, 8)}: ${output.slice(0, 50)}...`);
          }
        } catch (err) {
          this.log(`Error parsing WebSocket message: ${err.message}`, 'error');
        }
      });

      ws.on('error', (error) => {
        this.log(`WebSocket error for ${instanceId}: ${error.message}`, 'error');
        reject(error);
      });

      ws.on('close', () => {
        this.log(`WebSocket closed for ${instanceId.slice(0, 8)}`);
        this.connections.delete(instanceId);
      });
    });
  }

  async sendCommand(instanceId, command) {
    const ws = this.connections.get(instanceId);
    if (!ws) {
      throw new Error(`No connection found for instance ${instanceId}`);
    }

    this.log(`Sending command to ${instanceId.slice(0, 8)}: "${command}"`);
    
    ws.send(JSON.stringify({
      type: 'input',
      data: command + '\n',
      terminalId: instanceId,
      timestamp: Date.now()
    }));
  }

  async testInstanceIsolation() {
    this.log('\n=== TESTING INSTANCE ISOLATION ===');
    
    // Test 1: Connect to all instances
    this.log('\nTest 1: Connecting to all instances...');
    const connectPromises = this.instances.map(instance => 
      this.connectToInstance(instance.id)
    );
    await Promise.all(connectPromises);
    
    // Wait for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Send different commands to each instance
    this.log('\nTest 2: Sending unique commands to each instance...');
    const commands = ['echo "INSTANCE_1_TEST"', 'echo "INSTANCE_2_TEST"', 'echo "INSTANCE_3_TEST"'];
    
    for (let i = 0; i < this.instances.length; i++) {
      if (commands[i]) {
        await this.sendCommand(this.instances[i].id, commands[i]);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Wait for outputs
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Verify isolation
    this.log('\nTest 3: Verifying output isolation...');
    let isolationTestPassed = true;
    
    for (let i = 0; i < this.instances.length; i++) {
      const instanceId = this.instances[i].id;
      const outputs = this.outputs.get(instanceId);
      const expectedText = `INSTANCE_${i+1}_TEST`;
      
      this.log(`\n--- Instance ${instanceId.slice(0, 8)} Output Analysis ---`);
      this.log(`Expected to find: "${expectedText}"`);
      this.log(`Total outputs received: ${outputs.length}`);
      
      // Check if this instance received its own command output
      const hasOwnOutput = outputs.some(output => 
        output.content.includes(expectedText)
      );
      
      // Check if this instance received other instances' outputs (should NOT happen)
      const hasOtherOutputs = [];
      for (let j = 0; j < this.instances.length; j++) {
        if (i !== j) {
          const otherText = `INSTANCE_${j+1}_TEST`;
          const hasOther = outputs.some(output => 
            output.content.includes(otherText)
          );
          if (hasOther) {
            hasOtherOutputs.push(otherText);
          }
        }
      }
      
      this.log(`✓ Has own output (${expectedText}): ${hasOwnOutput}`);
      this.log(`✓ Has other outputs: ${hasOtherOutputs.length > 0 ? `YES - ${hasOtherOutputs.join(', ')}` : 'NO'}`);
      
      if (!hasOwnOutput) {
        this.log(`❌ ISOLATION FAILURE: Instance ${instanceId.slice(0, 8)} did not receive its own output`, 'error');
        isolationTestPassed = false;
      }
      
      if (hasOtherOutputs.length > 0) {
        this.log(`❌ ISOLATION FAILURE: Instance ${instanceId.slice(0, 8)} received outputs from other instances: ${hasOtherOutputs.join(', ')}`, 'error');
        isolationTestPassed = false;
      }
      
      // Show sample outputs for debugging
      if (outputs.length > 0) {
        this.log(`Sample outputs:`);
        outputs.slice(0, 3).forEach((output, idx) => {
          this.log(`  ${idx+1}. [${new Date(output.timestamp).toISOString()}] ${output.content.slice(0, 100)}`);
        });
      }
    }
    
    return isolationTestPassed;
  }

  async testInstanceSwitching() {
    this.log('\n=== TESTING INSTANCE SWITCHING ===');
    
    // Close all current connections
    this.log('Closing all current connections...');
    for (const [instanceId, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
    
    // Clear previous outputs
    for (const instanceId of this.instances.map(i => i.id)) {
      this.outputs.set(instanceId, []);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test switching: connect to instance 1, send command, disconnect, connect to instance 2, send command
    this.log('\nTest: Sequential instance connection (simulating user selection)...');
    
    // Connect to first instance only
    const instance1 = this.instances[0];
    await this.connectToInstance(instance1.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send command to first instance
    await this.sendCommand(instance1.id, 'echo "SELECTED_INSTANCE_1"');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Disconnect from first instance
    this.log('Switching from instance 1 to instance 2...');
    this.connections.get(instance1.id).close();
    this.connections.delete(instance1.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Connect to second instance only
    const instance2 = this.instances[1];
    await this.connectToInstance(instance2.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send command to second instance
    await this.sendCommand(instance2.id, 'echo "SELECTED_INSTANCE_2"');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify isolation in switching scenario
    this.log('\nVerifying switching isolation...');
    
    const instance1Outputs = this.outputs.get(instance1.id);
    const instance2Outputs = this.outputs.get(instance2.id);
    
    const instance1HasOwn = instance1Outputs.some(o => o.content.includes('SELECTED_INSTANCE_1'));
    const instance1HasOther = instance1Outputs.some(o => o.content.includes('SELECTED_INSTANCE_2'));
    const instance2HasOwn = instance2Outputs.some(o => o.content.includes('SELECTED_INSTANCE_2'));
    const instance2HasOther = instance2Outputs.some(o => o.content.includes('SELECTED_INSTANCE_1'));
    
    this.log(`Instance 1 outputs: ${instance1Outputs.length} (has own: ${instance1HasOwn}, has other: ${instance1HasOther})`);
    this.log(`Instance 2 outputs: ${instance2Outputs.length} (has own: ${instance2HasOwn}, has other: ${instance2HasOther})`);
    
    const switchingTestPassed = instance1HasOwn && !instance1HasOther && instance2HasOwn && !instance2HasOther;
    
    return switchingTestPassed;
  }

  async cleanup() {
    this.log('\n=== CLEANUP ===');
    
    // Close all WebSocket connections
    for (const [instanceId, ws] of this.connections) {
      this.log(`Closing connection to ${instanceId.slice(0, 8)}`);
      ws.close();
    }
    
    // Terminate all test instances
    for (const instance of this.instances) {
      try {
        this.log(`Terminating instance ${instance.id.slice(0, 8)}...`);
        const response = await fetch(`${API_BASE}/api/claude/instances/${instance.id}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
          this.log(`Instance ${instance.id.slice(0, 8)} terminated`, 'success');
        } else {
          this.log(`Failed to terminate ${instance.id.slice(0, 8)}: ${data.error}`, 'error');
        }
      } catch (error) {
        this.log(`Error terminating ${instance.id.slice(0, 8)}: ${error.message}`, 'error');
      }
    }
  }

  async runFullTest() {
    this.log('🚀 SPARC Instance Isolation Test Started');
    this.log('This test verifies the fix for: "it is not connecting only to the selected instance on the left"');
    
    try {
      // Create instances
      await this.createInstances(3);
      
      // Test isolation
      const isolationPassed = await this.testInstanceIsolation();
      
      // Test switching
      const switchingPassed = await this.testInstanceSwitching();
      
      // Results
      this.log('\n=== TEST RESULTS ===');
      this.log(`Instance Isolation Test: ${isolationPassed ? '✅ PASSED' : '❌ FAILED'}`);
      this.log(`Instance Switching Test: ${switchingPassed ? '✅ PASSED' : '❌ FAILED'}`);
      
      const overallResult = isolationPassed && switchingPassed;
      this.log(`\n🎯 OVERALL RESULT: ${overallResult ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
      
      if (overallResult) {
        this.log('✅ Instance isolation is working correctly!');
        this.log('✅ The UI should now connect only to the selected instance.');
        this.log('✅ No more duplication from multiple instances.');
      } else {
        this.log('❌ Instance isolation needs more work.');
        this.log('❌ The UI may still receive output from multiple instances.');
      }
      
      return overallResult;
      
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new InstanceIsolationTest();
  test.runFullTest()
    .then(result => {
      process.exit(result ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = InstanceIsolationTest;