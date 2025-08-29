/**
 * TDD London School Test 4: Complete Workflow Integration
 * 
 * Purpose: Expose end-to-end workflow issues from button click to command execution
 * Expected: FAIL - to reveal exact workflow integration problems
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import colors from 'colors';

const BACKEND_BASE_URL = 'http://localhost:3002';
const WEBSOCKET_BASE_URL = 'ws://localhost:3002';

class CompleteWorkflowIntegrationTest {
  constructor() {
    this.testInstances = [];
  }

  async run() {
    console.log(colors.blue('🔍 Testing Complete Workflow Integration...'));
    
    // Test 1: Full button click simulation to instance creation
    await this.testFullButtonClickWorkflow();
    
    // Test 2: Instance management lifecycle
    await this.testInstanceLifecycleManagement();
    
    // Test 3: Real-time WebSocket communication with instance
    await this.testRealTimeInstanceCommunication();
    
    // Test 4: Multiple concurrent instances
    await this.testMultipleInstancesWorkflow();
    
    // Test 5: Error recovery and cleanup
    await this.testErrorRecoveryAndCleanup();
    
    // Cleanup test instances
    await this.cleanupTestInstances();
  }

  async testFullButtonClickWorkflow() {
    console.log(colors.yellow('  Testing complete button click workflow...'));
    
    try {
      // Step 1: Simulate frontend checking available terminals
      console.log(colors.gray('    Step 1: Checking available terminals...'));
      const terminalsResponse = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Origin': 'http://localhost:5173'
        }
      });
      
      if (!terminalsResponse.ok) {
        throw new Error(`Failed to fetch terminals: ${terminalsResponse.status}`);
      }
      
      const terminals = await terminalsResponse.json();
      console.log(colors.gray(`    Found ${terminals.length || 0} existing terminals`));
      
      // Step 2: Launch new instance (button click simulation)
      console.log(colors.gray('    Step 2: Launching new Claude instance...'));
      const launchPayload = {
        instanceName: `workflow-test-${Date.now()}`,
        command: 'echo "Complete Workflow Test Started"',
        autoStart: true,
        returnOutput: true
      };
      
      const launchResponse = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'http://localhost:5173'
        },
        body: JSON.stringify(launchPayload)
      });
      
      if (!launchResponse.ok) {
        const errorBody = await launchResponse.text();
        throw new Error(`Launch failed: ${launchResponse.status} - ${errorBody}`);
      }
      
      const launchResult = await launchResponse.json();
      this.workflowInstanceId = launchResult.instanceId || launchResult.id;
      this.testInstances.push(this.workflowInstanceId);
      
      if (!this.workflowInstanceId) {
        throw new Error('Launch succeeded but returned no instance ID');
      }
      
      console.log(colors.gray(`    Instance created: ${this.workflowInstanceId}`));
      
      // Step 3: Verify instance appears in terminals list
      console.log(colors.gray('    Step 3: Verifying instance appears in terminals list...'));
      const updatedTerminalsResponse = await fetch(`${BACKEND_BASE_URL}/api/terminals`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Origin': 'http://localhost:5173'
        }
      });
      
      if (updatedTerminalsResponse.ok) {
        const updatedTerminals = await updatedTerminalsResponse.json();
        const foundInstance = updatedTerminals.find(t => t.id === this.workflowInstanceId);
        
        if (!foundInstance) {
          throw new Error('Launched instance not found in terminals list');
        }
        
        console.log(colors.gray('    Instance successfully appears in terminals list'));
      }
      
      // Step 4: Connect to instance via WebSocket
      console.log(colors.gray('    Step 4: Establishing WebSocket connection to instance...'));
      await this.establishWebSocketConnection(this.workflowInstanceId);
      
      console.log(colors.green('    ✅ Complete button click workflow successful'));
      
    } catch (error) {
      throw new Error(`❌ COMPLETE WORKFLOW ERROR: ${error.message}`);
    }
  }

  async testInstanceLifecycleManagement() {
    console.log(colors.yellow('  Testing instance lifecycle management...'));
    
    try {
      const instanceName = `lifecycle-test-${Date.now()}`;
      
      // Create instance
      const createResponse = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          command: 'sleep 5'  // Long-running command for testing
        })
      });
      
      if (!createResponse.ok) {
        throw new Error(`Instance creation failed: ${createResponse.status}`);
      }
      
      const createResult = await createResponse.json();
      const instanceId = createResult.instanceId || createResult.id;
      this.testInstances.push(instanceId);
      
      // Wait a moment for instance to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check instance status
      const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/terminals/${instanceId}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      const status = await statusResponse.json();
      console.log(colors.gray(`    Instance status: ${JSON.stringify(status, null, 2)}`));
      
      // Send command to instance
      const commandResponse = await fetch(`${BACKEND_BASE_URL}/api/terminals/${instanceId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          command: 'echo "Lifecycle test command"'
        })
      });
      
      if (!commandResponse.ok) {
        throw new Error(`Command execution failed: ${commandResponse.status}`);
      }
      
      console.log(colors.green('    ✅ Instance lifecycle management successful'));
      
    } catch (error) {
      throw new Error(`❌ LIFECYCLE MANAGEMENT ERROR: ${error.message}`);
    }
  }

  async testRealTimeInstanceCommunication() {
    console.log(colors.yellow('  Testing real-time WebSocket communication...'));
    
    if (!this.workflowInstanceId) {
      throw new Error('No workflow instance available for WebSocket test');
    }
    
    return new Promise((resolve, reject) => {
      const wsUrl = `${WEBSOCKET_BASE_URL}/terminal/${this.workflowInstanceId}`;
      const ws = new WebSocket(wsUrl);
      let commandResponseReceived = false;
      
      const timeout = setTimeout(() => {
        ws.terminate();
        if (!commandResponseReceived) {
          reject(new Error('❌ REALTIME COMMUNICATION ERROR: No command response within 10 seconds'));
        }
      }, 10000);
      
      ws.on('open', () => {
        console.log(colors.gray('    WebSocket connected, sending command...'));
        
        const command = {
          type: 'execute',
          command: 'echo "Real-time communication test"',
          timestamp: new Date().toISOString()
        };
        
        ws.send(JSON.stringify(command));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(colors.gray(`    Received: ${JSON.stringify(message, null, 2)}`));
          
          if (message.type === 'output' || message.output) {
            clearTimeout(timeout);
            commandResponseReceived = true;
            console.log(colors.green('    ✅ Real-time communication successful'));
            ws.close();
            resolve();
          }
        } catch (parseError) {
          console.log(colors.yellow(`    ⚠️  Non-JSON message: ${data.toString()}`));
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`❌ REALTIME COMMUNICATION ERROR: WebSocket error: ${error.message}`));
      });
      
      ws.on('close', (code) => {
        if (!commandResponseReceived && code !== 1000) {
          reject(new Error(`❌ REALTIME COMMUNICATION ERROR: Connection closed unexpectedly: ${code}`));
        }
      });
    });
  }

  async testMultipleInstancesWorkflow() {
    console.log(colors.yellow('  Testing multiple concurrent instances...'));
    
    try {
      const instances = [];
      const numInstances = 3;
      
      // Launch multiple instances concurrently
      const launchPromises = Array.from({ length: numInstances }, (_, index) => {
        return fetch(`${BACKEND_BASE_URL}/api/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            instanceName: `multi-test-${index}-${Date.now()}`,
            command: `echo "Multi-instance test ${index}"`
          })
        });
      });
      
      const responses = await Promise.all(launchPromises);
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (!response.ok) {
          throw new Error(`Instance ${i} launch failed: ${response.status}`);
        }
        
        const result = await response.json();
        const instanceId = result.instanceId || result.id;
        instances.push(instanceId);
        this.testInstances.push(instanceId);
      }
      
      console.log(colors.gray(`    Launched ${instances.length} instances successfully`));
      
      // Verify all instances are accessible
      const statusPromises = instances.map(instanceId => 
        fetch(`${BACKEND_BASE_URL}/api/terminals/${instanceId}/status`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
      );
      
      const statusResponses = await Promise.all(statusPromises);
      const failedStatusChecks = statusResponses.filter(r => !r.ok);
      
      if (failedStatusChecks.length > 0) {
        throw new Error(`${failedStatusChecks.length} instances failed status check`);
      }
      
      console.log(colors.green('    ✅ Multiple instances workflow successful'));
      
    } catch (error) {
      throw new Error(`❌ MULTIPLE INSTANCES ERROR: ${error.message}`);
    }
  }

  async testErrorRecoveryAndCleanup() {
    console.log(colors.yellow('  Testing error recovery and cleanup...'));
    
    try {
      // Test 1: Invalid command handling
      const invalidCommandResponse = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          instanceName: `error-test-${Date.now()}`,
          command: 'nonexistentcommand12345'  // This should fail
        })
      });
      
      // The launch might succeed but the command will fail
      if (invalidCommandResponse.ok) {
        const result = await invalidCommandResponse.json();
        const instanceId = result.instanceId || result.id;
        if (instanceId) {
          this.testInstances.push(instanceId);
        }
        console.log(colors.gray('    Invalid command handled gracefully'));
      }
      
      // Test 2: Invalid instance ID handling
      const invalidInstanceResponse = await fetch(`${BACKEND_BASE_URL}/api/terminals/invalid-instance-id-12345/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (invalidInstanceResponse.status === 404) {
        console.log(colors.gray('    Invalid instance ID properly returns 404'));
      } else {
        console.log(colors.yellow(`    ⚠️  Invalid instance ID returned status: ${invalidInstanceResponse.status}`));
      }
      
      // Test 3: Malformed request handling
      const malformedResponse = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: 'invalid json'
      });
      
      if (malformedResponse.status >= 400) {
        console.log(colors.gray('    Malformed requests properly rejected'));
      }
      
      console.log(colors.green('    ✅ Error recovery and cleanup successful'));
      
    } catch (error) {
      throw new Error(`❌ ERROR RECOVERY TEST ERROR: ${error.message}`);
    }
  }

  async establishWebSocketConnection(instanceId) {
    return new Promise((resolve, reject) => {
      const wsUrl = `${WEBSOCKET_BASE_URL}/terminal/${instanceId}`;
      const ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error(`WebSocket connection timeout to ${wsUrl}`));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(colors.gray('    WebSocket connection established'));
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });
    });
  }

  async cleanupTestInstances() {
    console.log(colors.yellow('  Cleaning up test instances...'));
    
    for (const instanceId of this.testInstances) {
      try {
        await fetch(`${BACKEND_BASE_URL}/api/terminals/${instanceId}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          }
        });
      } catch (error) {
        console.log(colors.yellow(`    ⚠️  Failed to cleanup instance ${instanceId}: ${error.message}`));
      }
    }
    
    console.log(colors.gray(`    Cleanup attempted for ${this.testInstances.length} instances`));
  }
}

export default new CompleteWorkflowIntegrationTest();