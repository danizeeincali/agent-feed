#!/usr/bin/env node
/**
 * SSE Message Flow Test Harness
 * 
 * SWARM CODER AGENT: This test validates end-to-end SSE message delivery
 * from backend Claude AI responses to frontend display.
 * 
 * Test Plan:
 * 1. Connect to backend SSE endpoint
 * 2. Send test command to Claude instance
 * 3. Monitor SSE stream for response
 * 4. Validate message structure and content
 * 5. Report success/failure with detailed diagnostics
 */

import { EventSource } from 'eventsource';
import fetch from 'node-fetch';

class SSEMessageFlowTester {
  constructor(apiUrl = 'http://localhost:3000') {
    this.apiUrl = apiUrl;
    this.testResults = {
      connectionEstablished: false,
      messageReceived: false,
      claudeResponseDetected: false,
      messageStructureValid: false,
      totalMessages: 0,
      errors: [],
      messages: []
    };
  }

  async runTest(instanceId = null) {
    console.log('🧪 SWARM TESTER: Starting SSE Message Flow Test');
    console.log(`   API URL: ${this.apiUrl}`);
    
    try {
      // Step 1: Get available instances
      if (!instanceId) {
        instanceId = await this.getAvailableInstance();
      }
      
      if (!instanceId) {
        throw new Error('No available Claude instances found');
      }
      
      console.log(`   Target Instance: ${instanceId}`);
      
      // Step 2: Establish SSE connection
      await this.establishSSEConnection(instanceId);
      
      // Step 3: Send test command
      await this.sendTestCommand(instanceId);
      
      // Step 4: Wait for responses (10 second timeout)
      await this.waitForResponses(10000);
      
      // Step 5: Generate report
      this.generateReport();
      
    } catch (error) {
      this.testResults.errors.push(error.message);
      console.error('❌ SWARM TESTER: Test failed:', error.message);
    }
  }
  
  async getAvailableInstance() {
    console.log('🔍 SWARM TESTER: Fetching available instances...');
    
    const response = await fetch(`${this.apiUrl}/api/claude/instances`);
    const data = await response.json();
    
    if (data.success && data.instances && data.instances.length > 0) {
      const runningInstance = data.instances.find(i => i.status === 'running');
      if (runningInstance) {
        console.log(`✅ SWARM TESTER: Found running instance: ${runningInstance.id}`);
        return runningInstance.id;
      }
    }
    
    console.warn('⚠️ SWARM TESTER: No running instances found, attempting to create one...');
    return await this.createTestInstance();
  }
  
  async createTestInstance() {
    console.log('🚀 SWARM TESTER: Creating test instance...');
    
    const response = await fetch(`${this.apiUrl}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interactive',
        command: 'claude',
        name: 'swarm-test-instance'
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.instanceId) {
      console.log(`✅ SWARM TESTER: Created test instance: ${data.instanceId}`);
      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      return data.instanceId;
    }
    
    throw new Error('Failed to create test instance');
  }
  
  async establishSSEConnection(instanceId) {
    console.log('📡 SWARM TESTER: Establishing SSE connection...');
    
    return new Promise((resolve, reject) => {
      const sseUrl = `${this.apiUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      console.log(`   SSE URL: ${sseUrl}`);
      
      const eventSource = new EventSource(sseUrl);
      this.eventSource = eventSource;
      
      const timeout = setTimeout(() => {
        reject(new Error('SSE connection timeout'));
      }, 5000);
      
      eventSource.onopen = () => {
        clearTimeout(timeout);
        this.testResults.connectionEstablished = true;
        console.log('✅ SWARM TESTER: SSE connection established');
        resolve();
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSSEMessage(instanceId, data);
        } catch (error) {
          console.error('❌ SWARM TESTER: SSE message parse error:', error);
          this.testResults.errors.push(`SSE parse error: ${error.message}`);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ SWARM TESTER: SSE connection error:', error);
        this.testResults.errors.push('SSE connection error');
      };
    });
  }
  
  handleSSEMessage(instanceId, data) {
    this.testResults.totalMessages++;
    this.testResults.messageReceived = true;
    this.testResults.messages.push(data);
    
    console.log(`📨 SWARM TESTER: Received SSE message #${this.testResults.totalMessages}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Data: ${data.data ? data.data.substring(0, 100) + '...' : 'null'}`);
    console.log(`   Instance ID: ${data.instanceId || 'none'}`);
    console.log(`   Is Real: ${data.isReal}`);
    
    // Validate message structure
    if (data.type && (data.data || data.output) && data.instanceId) {
      this.testResults.messageStructureValid = true;
    }
    
    // Check if this looks like a Claude AI response
    if (data.data && typeof data.data === 'string') {
      const content = data.data.toLowerCase();
      if (content.includes('claude') || content.includes('assistant') || content.includes('i can') || content.includes('hello')) {
        this.testResults.claudeResponseDetected = true;
        console.log('🎯 SWARM TESTER: Claude AI response detected!');
      }
    }
  }
  
  async sendTestCommand(instanceId) {
    console.log('📤 SWARM TESTER: Sending test command to Claude...');
    
    const testCommand = 'Say "Hello from SWARM test" and nothing else.';
    console.log(`   Command: ${testCommand}`);
    
    const response = await fetch(
      `${this.apiUrl}/api/claude/instances/${instanceId}/terminal/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: testCommand + '\n' })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to send command: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ SWARM TESTER: Command sent successfully');
    console.log(`   Response: ${JSON.stringify(result)}`);
  }
  
  async waitForResponses(timeout = 10000) {
    console.log(`⏱️ SWARM TESTER: Waiting ${timeout}ms for Claude responses...`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('⏰ SWARM TESTER: Wait period completed');
        resolve();
      }, timeout);
    });
  }
  
  generateReport() {
    console.log('\n📊 SWARM TESTER: Final Test Report');
    console.log('='.repeat(50));
    
    const results = this.testResults;
    
    console.log(`✓ Connection Established: ${results.connectionEstablished ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Messages Received: ${results.messageReceived ? '✅ YES' : '❌ NO'} (${results.totalMessages} total)`);
    console.log(`✓ Message Structure Valid: ${results.messageStructureValid ? '✅ YES' : '❌ NO'}`);
    console.log(`✓ Claude Response Detected: ${results.claudeResponseDetected ? '✅ YES' : '❌ NO'}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      results.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
    
    if (results.messages.length > 0) {
      console.log('\n📨 Sample Messages:');
      results.messages.slice(0, 3).forEach((msg, i) => {
        console.log(`   ${i + 1}. Type: ${msg.type}, Data: ${msg.data ? msg.data.substring(0, 50) + '...' : 'null'}`);
      });
    }
    
    const success = results.connectionEstablished && 
                   results.messageReceived && 
                   results.messageStructureValid &&
                   results.errors.length === 0;
    
    console.log(`\n🎯 Overall Test Result: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
    
    if (this.eventSource) {
      this.eventSource.close();
    }
    
    return success;
  }
}

// Run test if called directly
if (process.argv[1].endsWith('sse-message-flow-test.js')) {
  const tester = new SSEMessageFlowTester();
  tester.runTest().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export default SSEMessageFlowTester;