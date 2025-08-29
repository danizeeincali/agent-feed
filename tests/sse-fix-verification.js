#!/usr/bin/env node

/**
 * SPARC DEBUG: SSE Buffer Replay Fix Verification Script
 * 
 * This script verifies that the SSE message type fix resolves the buffer replay bug
 * by creating a real Claude instance and monitoring the incremental output flow.
 */

const fetch = require('node-fetch');
const EventSource = require('eventsource');

console.log('🔍 SPARC DEBUG: SSE Fix Verification Starting...\n');

class SSEFixVerifier {
  constructor() {
    this.instanceId = null;
    this.receivedMessages = [];
    this.outputPositions = [];
    this.duplicateCount = 0;
    this.testPassed = false;
  }

  async createClaudeInstance() {
    console.log('🚀 Creating Claude instance for testing...');
    
    const response = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions',
        usePty: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create instance: ${response.status}`);
    }
    
    const result = await response.json();
    this.instanceId = result.instance.id;
    console.log(`✅ Claude instance created: ${this.instanceId}`);
    console.log(`   PID: ${result.instance.pid}`);
    console.log(`   Working Directory: ${result.instance.workingDirectory}`);
    
    return result.instance;
  }

  async connectSSE() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connecting to SSE stream for ${this.instanceId}...`);
      
      const eventSource = new EventSource(`http://localhost:3000/api/v1/claude/instances/${this.instanceId}/terminal/stream`);
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        resolve(eventSource);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSSEMessage(data);
        } catch (error) {
          console.error('❌ SSE message parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        reject(error);
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (eventSource.readyState !== EventSource.OPEN) {
          eventSource.close();
          reject(new Error('SSE connection timeout'));
        }
      }, 10000);
    });
  }

  handleSSEMessage(data) {
    console.log(`📨 SSE Message: type='${data.type}', position=${data.position || 'N/A'}, length=${data.output ? data.output.length : 'N/A'}`);
    
    this.receivedMessages.push({
      timestamp: new Date(),
      type: data.type,
      position: data.position,
      outputLength: data.output ? data.output.length : 0,
      isIncremental: data.isIncremental,
      data: data
    });

    // Key verification: Check for 'terminal_output' messages
    if (data.type === 'terminal_output') {
      console.log(`✅ CRITICAL FIX VERIFIED: Received 'terminal_output' message!`);
      console.log(`   Output length: ${data.output.length}`);
      console.log(`   Position: ${data.position}`);
      console.log(`   Incremental: ${data.isIncremental}`);
      
      // Check for position tracking
      if (data.position !== undefined) {
        this.outputPositions.push(data.position);
        console.log(`📊 Position tracking: ${data.position} -> ${data.position + data.output.length}`);
      }
      
      // Check for duplicates by comparing output content
      const outputHash = Buffer.from(data.output || '').toString('base64');
      const existingMessages = this.receivedMessages.filter(m => 
        m.type === 'terminal_output' && 
        Buffer.from(m.data.output || '').toString('base64') === outputHash
      );
      
      if (existingMessages.length > 1) {
        this.duplicateCount++;
        console.log(`⚠️ POTENTIAL DUPLICATE: Same output received ${existingMessages.length} times`);
      }
    } else if (data.type === 'output') {
      console.log(`⚠️ OLD MESSAGE TYPE: Still receiving 'output' messages (should be 'terminal_output')`);
    } else if (data.type === 'connected') {
      console.log(`🔗 Connection message: ${data.message}`);
    } else {
      console.log(`ℹ️ Other message type: ${data.type}`);
    }
  }

  async sendTestInput() {
    console.log(`⌨️ Sending test input to Claude instance...`);
    
    const testCommands = [
      'echo "SSE Fix Test - Command 1"',
      'echo "SSE Fix Test - Command 2"',  
      'echo "SSE Fix Test - Command 3"',
      'pwd',
      'date'
    ];
    
    for (let i = 0; i < testCommands.length; i++) {
      const command = testCommands[i];
      console.log(`📤 Sending: ${command}`);
      
      const response = await fetch(`http://localhost:3000/api/claude/instances/${this.instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command + '\n' })
      });
      
      if (!response.ok) {
        console.error(`❌ Failed to send input: ${response.status}`);
      } else {
        console.log(`✅ Input sent successfully`);
      }
      
      // Wait between commands
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async cleanup() {
    if (this.instanceId) {
      console.log(`🧹 Cleaning up Claude instance ${this.instanceId}...`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/claude/instances/${this.instanceId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          console.log('✅ Instance cleanup successful');
        } else {
          console.log(`⚠️ Instance cleanup failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`⚠️ Instance cleanup error: ${error.message}`);
      }
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SPARC DEBUG: SSE Fix Verification Report');
    console.log('='.repeat(80));
    
    const terminalOutputMessages = this.receivedMessages.filter(m => m.type === 'terminal_output');
    const outputMessages = this.receivedMessages.filter(m => m.type === 'output');
    const connectedMessages = this.receivedMessages.filter(m => m.type === 'connected');
    
    console.log(`📨 Total Messages Received: ${this.receivedMessages.length}`);
    console.log(`✅ 'terminal_output' messages: ${terminalOutputMessages.length}`);
    console.log(`⚠️ 'output' messages (old type): ${outputMessages.length}`);
    console.log(`🔗 'connected' messages: ${connectedMessages.length}`);
    console.log(`🔄 Duplicate detections: ${this.duplicateCount}`);
    console.log(`📊 Position tracking points: ${this.outputPositions.length}`);
    
    // Success criteria
    const hasTerminalOutputMessages = terminalOutputMessages.length > 0;
    const noOldOutputMessages = outputMessages.length === 0;
    const hasPositionTracking = this.outputPositions.length > 0;
    const noDuplicates = this.duplicateCount === 0;
    
    console.log('\n🔍 VERIFICATION RESULTS:');
    console.log(`   ✅ Frontend receives 'terminal_output' messages: ${hasTerminalOutputMessages ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ No old 'output' messages: ${noOldOutputMessages ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Position tracking working: ${hasPositionTracking ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ No message duplicates: ${noDuplicates ? 'PASS' : 'FAIL'}`);
    
    this.testPassed = hasTerminalOutputMessages && noOldOutputMessages && hasPositionTracking && noDuplicates;
    
    console.log(`\n🎯 OVERALL RESULT: ${this.testPassed ? '✅ SSE FIX SUCCESSFUL' : '❌ SSE FIX FAILED'}`);
    
    if (this.testPassed) {
      console.log('🎉 The SSE buffer replay bug has been RESOLVED!');
      console.log('   - Frontend now receives terminal_output messages');
      console.log('   - Position tracking prevents message duplication');
      console.log('   - Incremental output system is fully functional');
    } else {
      console.log('🚨 The SSE buffer replay bug is NOT fully resolved');
      console.log('   - Check message type consistency');
      console.log('   - Verify position tracking integration');
      console.log('   - Monitor for continued duplicates');
    }
    
    console.log('='.repeat(80));
  }
}

async function runVerification() {
  const verifier = new SSEFixVerifier();
  
  try {
    // Create instance and connect
    await verifier.createClaudeInstance();
    const eventSource = await verifier.connectSSE();
    
    // Wait for initial connection messages
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Send test inputs
    await verifier.sendTestInput();
    
    // Wait for all responses
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Close SSE connection
    eventSource.close();
    
    // Generate report
    verifier.generateReport();
    
    // Cleanup
    await verifier.cleanup();
    
    process.exit(verifier.testPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    await verifier.cleanup();
    process.exit(1);
  }
}

// Run the verification
runVerification().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});