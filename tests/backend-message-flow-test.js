#!/usr/bin/env node

/**
 * Backend Message Flow Test
 * Diagnoses exactly what's happening in the message processing pipeline
 */

const WebSocket = require('ws');

class BackendMessageFlowTest {
  constructor() {
    this.ws = null;
    this.testLog = [];
  }

  log(message) {
    const entry = {
      timestamp: new Date().toISOString(),
      message: message
    };
    this.testLog.push(entry);
    console.log(`[${entry.timestamp}] ${message}`);
  }

  async runFlowTest() {
    this.log('🔍 Starting Backend Message Flow Diagnostic');
    this.log('=' .repeat(50));

    try {
      await this.connectWithDetailedLogging();
      await this.testMessageFlow();
      
    } catch (error) {
      this.log(`❌ Flow test failed: ${error.message}`);
    } finally {
      this.generateDiagnosticReport();
      if (this.ws) {
        this.ws.close();
      }
    }
  }

  async connectWithDetailedLogging() {
    return new Promise((resolve, reject) => {
      this.log('🔌 Establishing WebSocket connection to ws://localhost:3000/terminal');
      
      this.ws = new WebSocket('ws://localhost:3000/terminal');
      
      this.ws.on('open', () => {
        this.log('✅ WebSocket connection opened successfully');
        this.log(`WebSocket readyState: ${this.ws.readyState} (OPEN = 1)`);
        resolve();
      });

      this.ws.on('message', (data, isBinary) => {
        const message = isBinary ? data : data.toString();
        this.log(`📨 MESSAGE RECEIVED: [${message.length} chars] ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
      });

      this.ws.on('error', (error) => {
        this.log(`❌ WebSocket error: ${error.message}`);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        this.log(`🔌 WebSocket closed: Code=${code}, Reason=${reason}`);
      });

      this.ws.on('ping', (data) => {
        this.log(`🏓 Ping received: ${data}`);
      });

      this.ws.on('pong', (data) => {
        this.log(`🏓 Pong received: ${data}`);
      });

      setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          this.log(`❌ Connection timeout. ReadyState: ${this.ws.readyState}`);
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  async testMessageFlow() {
    this.log('\n🧪 Testing message flow with various commands...');
    
    const testMessages = [
      { 
        type: 'command', 
        data: 'test',
        description: 'Simple test command'
      },
      { 
        type: 'command', 
        data: 'claude list',
        description: 'Claude list command'
      },
      { 
        type: 'input',
        data: 'hello',
        description: 'Direct input message'
      },
      {
        type: 'ping',
        data: 'ping test',
        description: 'Ping test'
      }
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const testMsg = testMessages[i];
      this.log(`\n📝 Test ${i + 1}: ${testMsg.description}`);
      
      const messageToSend = JSON.stringify(testMsg);
      this.log(`📤 Sending: ${messageToSend}`);
      
      const beforeMessageCount = this.testLog.filter(entry => entry.message.includes('MESSAGE RECEIVED')).length;
      
      try {
        this.ws.send(messageToSend);
        this.log('✅ Message sent successfully');
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const afterMessageCount = this.testLog.filter(entry => entry.message.includes('MESSAGE RECEIVED')).length;
        const newMessages = afterMessageCount - beforeMessageCount;
        
        this.log(`📊 Received ${newMessages} response messages`);
        
      } catch (sendError) {
        this.log(`❌ Failed to send message: ${sendError.message}`);
      }
    }

    // Test raw text sending
    this.log('\n🔤 Testing raw text sending...');
    try {
      this.ws.send('raw text message');
      this.log('✅ Raw text sent');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      this.log(`❌ Raw text failed: ${error.message}`);
    }

    // Test connection health
    this.log('\n💓 Testing connection health...');
    this.log(`WebSocket readyState: ${this.ws.readyState}`);
    this.log(`WebSocket protocol: ${this.ws.protocol}`);
    this.log(`WebSocket extensions: ${this.ws.extensions}`);
  }

  generateDiagnosticReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalLogEntries: this.testLog.length,
      messagesReceived: this.testLog.filter(entry => entry.message.includes('MESSAGE RECEIVED')).length,
      messagesSent: this.testLog.filter(entry => entry.message.includes('Sending:')).length,
      errors: this.testLog.filter(entry => entry.message.includes('❌')).length,
      testLog: this.testLog
    };

    const fs = require('fs');
    fs.writeFileSync('/workspaces/agent-feed/tests/backend-flow-diagnostic.json', JSON.stringify(report, null, 2));

    this.log('\n📊 DIAGNOSTIC SUMMARY:');
    this.log(`Total log entries: ${report.totalLogEntries}`);
    this.log(`Messages received: ${report.messagesReceived}`);
    this.log(`Messages sent: ${report.messagesSent}`);
    this.log(`Errors encountered: ${report.errors}`);
    this.log('📄 Full diagnostic saved to: backend-flow-diagnostic.json');

    if (report.messagesReceived === 0) {
      this.log('\n🚨 CRITICAL ISSUE: No messages received from backend!');
      this.log('This indicates:');
      this.log('1. Backend is not processing WebSocket messages');
      this.log('2. Message routing is broken');
      this.log('3. Backend command handling is not functioning');
    }
  }
}

// Run the diagnostic
if (require.main === module) {
  const test = new BackendMessageFlowTest();
  test.runFlowTest()
    .then(() => {
      console.log('\n🔍 Diagnostic completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Diagnostic failed:', error);
      process.exit(1);
    });
}

module.exports = BackendMessageFlowTest;