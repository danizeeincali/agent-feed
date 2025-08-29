/**
 * TDD London School Test 2: Button Click to Launch Flow
 * 
 * Purpose: Expose workflow issues in button -> /api/launch -> instance creation
 * Expected: FAIL - to reveal exact workflow problems
 */

import fetch from 'node-fetch';
import colors from 'colors';

const BACKEND_BASE_URL = 'http://localhost:3002';

class ButtonLaunchWorkflowTest {
  async run() {
    console.log(colors.blue('🔍 Testing Button Click -> Launch Workflow...'));
    
    // Test 1: Can we launch a Claude instance?
    await this.testLaunchClaudeInstance();
    
    // Test 2: Does the launch return proper instance metadata?
    await this.testLaunchResponse();
    
    // Test 3: Can we retrieve the launched instance?
    await this.testInstanceRetrieval();
    
    // Test 4: Can we send commands to the instance?
    await this.testInstanceCommandExecution();
    
    // Test 5: Can we get instance status?
    await this.testInstanceStatus();
  }

  async testLaunchClaudeInstance() {
    console.log(colors.yellow('  Testing Claude instance launch...'));
    
    try {
      const launchPayload = {
        instanceName: `tdd-test-${Date.now()}`,
        command: 'claude --version',
        environment: 'test',
        timeout: 30000
      };
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(launchPayload),
        timeout: 10000
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Launch failed with status ${response.status}: ${errorBody}`);
      }
      
      const launchResult = await response.json();
      
      // Store instance ID for subsequent tests
      this.instanceId = launchResult.instanceId || launchResult.id;
      
      if (!this.instanceId) {
        throw new Error('Launch response missing instanceId or id field');
      }
      
      console.log(colors.green('    ✅ Claude instance launch request completed'));
      console.log(colors.gray(`    Instance ID: ${this.instanceId}`));
      
    } catch (error) {
      throw new Error(`❌ LAUNCH ERROR: ${error.message}`);
    }
  }

  async testLaunchResponse() {
    console.log(colors.yellow('  Testing launch response format...'));
    
    try {
      const launchPayload = {
        instanceName: `tdd-response-test-${Date.now()}`,
        command: 'echo "TDD London School Response Test"',
        returnMetadata: true
      };
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(launchPayload),
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`Launch response test failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Validate expected fields in response
      const requiredFields = ['instanceId', 'status', 'timestamp'];
      const missingFields = requiredFields.filter(field => !(field in result) && !('id' in result));
      
      if (missingFields.length > 0) {
        throw new Error(`Launch response missing required fields: ${missingFields.join(', ')}`);
      }
      
      console.log(colors.green('    ✅ Launch response format is valid'));
      console.log(colors.gray(`    Response: ${JSON.stringify(result, null, 2)}`));
      
    } catch (error) {
      throw new Error(`❌ LAUNCH RESPONSE ERROR: ${error.message}`);
    }
  }

  async testInstanceRetrieval() {
    console.log(colors.yellow('  Testing instance retrieval...'));
    
    if (!this.instanceId) {
      throw new Error('No instance ID available from previous test');
    }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals/${this.instanceId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.status === 404) {
        throw new Error('Instance not found - launch may have failed or instance not persisted');
      }
      
      if (!response.ok) {
        throw new Error(`Instance retrieval failed with status: ${response.status}`);
      }
      
      const instanceData = await response.json();
      
      if (!instanceData.id && !instanceData.instanceId) {
        throw new Error('Retrieved instance missing ID field');
      }
      
      console.log(colors.green('    ✅ Instance retrieval successful'));
      console.log(colors.gray(`    Instance data: ${JSON.stringify(instanceData, null, 2)}`));
      
    } catch (error) {
      throw new Error(`❌ INSTANCE RETRIEVAL ERROR: ${error.message}`);
    }
  }

  async testInstanceCommandExecution() {
    console.log(colors.yellow('  Testing command execution on instance...'));
    
    if (!this.instanceId) {
      throw new Error('No instance ID available for command execution test');
    }
    
    try {
      const commandPayload = {
        command: 'echo "TDD London School Command Test"',
        timeout: 5000
      };
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals/${this.instanceId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(commandPayload),
        timeout: 10000
      });
      
      if (response.status === 404) {
        throw new Error('Instance not found for command execution');
      }
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Command execution failed with status ${response.status}: ${errorBody}`);
      }
      
      const result = await response.json();
      
      console.log(colors.green('    ✅ Command execution completed'));
      console.log(colors.gray(`    Execution result: ${JSON.stringify(result, null, 2)}`));
      
    } catch (error) {
      throw new Error(`❌ COMMAND EXECUTION ERROR: ${error.message}`);
    }
  }

  async testInstanceStatus() {
    console.log(colors.yellow('  Testing instance status check...'));
    
    if (!this.instanceId) {
      throw new Error('No instance ID available for status check');
    }
    
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/terminals/${this.instanceId}/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.status === 404) {
        throw new Error('Instance not found for status check');
      }
      
      if (!response.ok) {
        throw new Error(`Status check failed with status: ${response.status}`);
      }
      
      const statusData = await response.json();
      
      const expectedStatusFields = ['status', 'pid'];
      const missingFields = expectedStatusFields.filter(field => !(field in statusData));
      
      if (missingFields.length > 0) {
        console.log(colors.yellow(`    ⚠️  Status response missing optional fields: ${missingFields.join(', ')}`));
      }
      
      console.log(colors.green('    ✅ Instance status check completed'));
      console.log(colors.gray(`    Status: ${JSON.stringify(statusData, null, 2)}`));
      
    } catch (error) {
      throw new Error(`❌ INSTANCE STATUS ERROR: ${error.message}`);
    }
  }
}

export default new ButtonLaunchWorkflowTest();