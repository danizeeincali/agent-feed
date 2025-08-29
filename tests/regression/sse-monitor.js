#!/usr/bin/env node
/**
 * Real-time SSE Monitoring Script
 * 
 * This script monitors SSE behavior in real-time to identify:
 * - Message repetition patterns
 * - Connection stability issues
 * - Performance bottlenecks
 * - ANSI sequence problems
 */

const EventSource = require('eventsource');
const axios = require('axios');

class SSEMonitor {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.monitoring = false;
    this.instanceId = null;
    this.stats = {
      totalMessages: 0,
      duplicateMessages: 0,
      ansiSequences: 0,
      errorMessages: 0,
      connectionDrops: 0,
      avgMessageSize: 0,
      messageHashes: new Set(),
      startTime: null,
      lastMessageTime: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📊',
      success: '✅', 
      warning: '⚠️',
      error: '❌',
      data: '📡'
    }[type] || '📊';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async createMonitoringInstance() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/claude/instances`, {
        command: ['claude', '--dangerously-skip-permissions'],
        instanceType: 'skip-permissions',
        usePty: true
      });
      
      this.instanceId = response.data.instance.id;
      this.log(`Created monitoring instance: ${this.instanceId}`, 'success');
      return this.instanceId;
    } catch (error) {
      this.log(`Failed to create monitoring instance: ${error.message}`, 'error');
      throw error;
    }
  }

  analyzeMessage(data) {
    this.stats.totalMessages++;
    this.stats.lastMessageTime = Date.now();
    
    if (data.data) {
      // Update average message size
      const messageSize = data.data.length;
      this.stats.avgMessageSize = (this.stats.avgMessageSize * (this.stats.totalMessages - 1) + messageSize) / this.stats.totalMessages;
      
      // Check for ANSI sequences
      if (data.data.includes('\x1b[') || data.data.includes('\u001b[')) {
        this.stats.ansiSequences++;
      }
      
      // Check for duplicates
      const messageHash = `${data.type}:${data.timestamp}:${data.data.substring(0, 100)}`;
      if (this.stats.messageHashes.has(messageHash)) {
        this.stats.duplicateMessages++;
        this.log(`DUPLICATE MESSAGE DETECTED: ${messageHash.substring(0, 50)}...`, 'warning');
      } else {
        this.stats.messageHashes.add(messageHash);
      }
    }
    
    // Check for error indicators
    if (data.isError || data.type === 'error' || (data.data && data.data.toLowerCase().includes('error'))) {
      this.stats.errorMessages++;
    }
  }

  displayStats() {
    const runtime = this.stats.startTime ? (Date.now() - this.stats.startTime) / 1000 : 0;
    const throughput = runtime > 0 ? (this.stats.totalMessages / runtime).toFixed(2) : 0;
    const duplicateRate = this.stats.totalMessages > 0 ? (this.stats.duplicateMessages / this.stats.totalMessages * 100).toFixed(2) : 0;
    
    console.clear();
    console.log(`
🔍 REAL-TIME SSE MONITORING DASHBOARD
=====================================
Instance ID: ${this.instanceId || 'Not created'}
Runtime: ${runtime.toFixed(1)}s
Status: ${this.monitoring ? '🟢 MONITORING' : '🔴 STOPPED'}

📊 MESSAGE STATISTICS:
   Total Messages: ${this.stats.totalMessages}
   Throughput: ${throughput} msgs/sec
   Avg Message Size: ${this.stats.avgMessageSize.toFixed(0)} chars
   Last Message: ${this.stats.lastMessageTime ? new Date(this.stats.lastMessageTime).toLocaleTimeString() : 'None'}

🔍 QUALITY METRICS:
   Duplicate Messages: ${this.stats.duplicateMessages} (${duplicateRate}%)
   ANSI Sequences: ${this.stats.ansiSequences}
   Error Messages: ${this.stats.errorMessages}
   Connection Drops: ${this.stats.connectionDrops}
   
🎯 HEALTH STATUS:
   Message Deduplication: ${this.stats.duplicateMessages === 0 ? '✅ WORKING' : '❌ FAILING'}
   Connection Stability: ${this.stats.connectionDrops < 3 ? '✅ STABLE' : '❌ UNSTABLE'}
   Performance: ${parseFloat(throughput) > 1 ? '✅ GOOD' : '⚠️ SLOW'}

Press Ctrl+C to stop monitoring
`);
  }

  async startMonitoring() {
    this.log('Starting real-time SSE monitoring...', 'info');
    
    try {
      await this.createMonitoringInstance();
      
      const eventSource = new EventSource(`${this.baseUrl}/api/claude/instances/${this.instanceId}/terminal/stream`);
      this.monitoring = true;
      this.stats.startTime = Date.now();
      
      eventSource.onopen = () => {
        this.log('SSE connection established', 'success');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.analyzeMessage(data);
          
          // Log interesting messages
          if (data.type === 'connected') {
            this.log('Connection message received', 'data');
          } else if (data.data && data.data.length > 0) {
            const preview = data.data.substring(0, 50).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            this.log(`Message: ${preview}${data.data.length > 50 ? '...' : ''}`, 'data');
          }
        } catch (error) {
          this.log(`Failed to parse SSE message: ${error.message}`, 'error');
          this.stats.errorMessages++;
        }
      };
      
      eventSource.onerror = (error) => {
        this.stats.connectionDrops++;
        this.log(`SSE connection error: ${error.message || 'Unknown error'}`, 'error');
      };
      
      eventSource.onclose = () => {
        this.log('SSE connection closed', 'warning');
        this.monitoring = false;
      };
      
      // Update dashboard every second
      const dashboardInterval = setInterval(() => {
        if (this.monitoring) {
          this.displayStats();
        } else {
          clearInterval(dashboardInterval);
        }
      }, 1000);
      
      // Send periodic test commands
      const testInterval = setInterval(async () => {
        if (this.monitoring && this.instanceId) {
          try {
            const commands = ['hello', 'help', 'pwd', 'date'];
            const command = commands[Math.floor(Math.random() * commands.length)];
            
            await axios.post(`${this.baseUrl}/api/claude/instances/${this.instanceId}/terminal/input`, {
              input: command
            });
            
            this.log(`Sent test command: ${command}`, 'data');
          } catch (error) {
            this.log(`Failed to send test command: ${error.message}`, 'error');
          }
        }
      }, 10000); // Every 10 seconds
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        this.log('Stopping monitoring...', 'info');
        this.monitoring = false;
        clearInterval(dashboardInterval);
        clearInterval(testInterval);
        
        if (eventSource) {
          eventSource.close();
        }
        
        if (this.instanceId) {
          try {
            await axios.delete(`${this.baseUrl}/api/claude/instances/${this.instanceId}`);
            this.log(`Cleaned up monitoring instance: ${this.instanceId}`, 'success');
          } catch (error) {
            this.log(`Failed to cleanup instance: ${error.message}`, 'warning');
          }
        }
        
        this.generateFinalReport();
        process.exit(0);
      });
      
      this.log('Monitoring started. Send test commands or wait for automatic tests...', 'success');
      
    } catch (error) {
      this.log(`Monitoring failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
  
  generateFinalReport() {
    const runtime = this.stats.startTime ? (Date.now() - this.stats.startTime) / 1000 : 0;
    const throughput = runtime > 0 ? (this.stats.totalMessages / runtime).toFixed(2) : 0;
    
    console.log(`
📋 FINAL SSE MONITORING REPORT
==============================
Monitoring Duration: ${runtime.toFixed(1)}s
Total Messages Processed: ${this.stats.totalMessages}
Average Throughput: ${throughput} messages/second

🎯 KEY FINDINGS:
   Duplicate Messages: ${this.stats.duplicateMessages} (${this.stats.totalMessages > 0 ? (this.stats.duplicateMessages / this.stats.totalMessages * 100).toFixed(2) : 0}%)
   ANSI Sequences Handled: ${this.stats.ansiSequences}
   Connection Stability: ${this.stats.connectionDrops} drops
   Average Message Size: ${this.stats.avgMessageSize.toFixed(0)} characters

✅ VALIDATION RESULTS:
   Message Deduplication: ${this.stats.duplicateMessages === 0 ? 'PASS - No duplicates detected' : `FAIL - ${this.stats.duplicateMessages} duplicates found`}
   Connection Resilience: ${this.stats.connectionDrops < 3 ? 'PASS - Connection stable' : `FAIL - ${this.stats.connectionDrops} connection drops`}
   Performance: ${parseFloat(throughput) > 1 ? `PASS - Good throughput (${throughput} msgs/sec)` : `WARNING - Low throughput (${throughput} msgs/sec)`}
   
🏁 OVERALL STATUS: ${this.stats.duplicateMessages === 0 && this.stats.connectionDrops < 3 ? '✅ SYSTEM HEALTHY' : '❌ ISSUES DETECTED'}
`);
  }
}

// Main execution
async function main() {
  const monitor = new SSEMonitor();
  await monitor.startMonitoring();
}

if (require.main === module) {
  main();
}

module.exports = SSEMonitor;