#!/usr/bin/env node

/**
 * Claude API Manager - Robust communication with Claude Code CLI
 * Implements adaptive communication strategies to prevent stdin blocking
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { RobustProcessManager } = require('./robust-process-manager');
const { AdaptiveCommunicationStrategy } = require('../strategies/adaptive-communication');

class ClaudeAPIManager {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 60000, // 60 seconds default
      maxRetries: options.maxRetries || 3,
      debug: options.debug || false,
      workingDirectory: options.workingDirectory || process.env.WORKSPACE_ROOT || process.cwd(),
      tempDir: options.tempDir || '/tmp',
      ...options
    };
    
    this.processManager = new RobustProcessManager({
      maxRetries: this.options.maxRetries,
      retryDelay: 1000
    });
    
    this.communicationStrategy = new AdaptiveCommunicationStrategy({
      debug: this.options.debug
    });
    
    this.activeRequests = new Map(); // Track ongoing requests
    this.requestHistory = new Map(); // Cache for performance
    
    if (this.options.debug) {
      console.log('🔧 ClaudeAPIManager initialized with options:', this.options);
    }
  }
  
  /**
   * Send a prompt to Claude Code and get structured response
   * @param {string} prompt - The prompt to send
   * @param {object} options - Request-specific options
   * @returns {Promise<object>} - Structured API response
   */
  async sendPrompt(prompt, options = {}) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    
    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return {
        success: false,
        error: 'Invalid prompt: must be a non-empty string',
        request_id: requestId,
        duration_ms: 0
      };
    }
    
    // Merge options with defaults
    const config = {
      ...this.options,
      ...options,
      requestId
    };
    
    this.activeRequests.set(requestId, {
      prompt: prompt.substring(0, 100) + '...',
      startTime,
      status: 'starting'
    });
    
    try {
      if (this.options.debug) {
        console.log(`🚀 Claude API Request ${requestId}: "${prompt.substring(0, 50)}..."`);
      }
      
      // Use adaptive communication strategy
      const result = await this.communicationStrategy.executeWithFallback(prompt, config);
      
      const duration = Date.now() - startTime;
      this.activeRequests.delete(requestId);
      
      if (this.options.debug) {
        console.log(`✅ Claude API Response ${requestId}: ${result.success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
      }
      
      return {
        ...result,
        request_id: requestId,
        duration_ms: duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.activeRequests.delete(requestId);
      
      console.error(`❌ Claude API Error ${requestId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        request_id: requestId,
        duration_ms: duration,
        retry_count: 0
      };
    }
  }
  
  /**
   * Send a command to a specific Claude instance
   * @param {string} command - Command to execute
   * @param {string} instanceId - Instance identifier
   * @returns {Promise<object>} - Command response
   */
  async sendCommand(command, instanceId, options = {}) {
    const prompt = `Execute this command in the context of instance ${instanceId}: ${command}`;
    
    return this.sendPrompt(prompt, {
      ...options,
      instanceId,
      commandMode: true
    });
  }
  
  /**
   * Get health status of the API manager
   * @returns {object} - Health information
   */
  getHealth() {
    const activeCount = this.activeRequests.size;
    const processHealth = this.processManager.getHealth();
    
    return {
      status: activeCount < 10 ? 'healthy' : 'busy',
      active_requests: activeCount,
      process_manager: processHealth,
      uptime_ms: Date.now() - (this.startTime || Date.now()),
      memory_usage: process.memoryUsage()
    };
  }
  
  /**
   * Cleanup resources and terminate active processes
   */
  async cleanup() {
    if (this.options.debug) {
      console.log('🧹 Cleaning up ClaudeAPIManager resources...');
    }
    
    // Wait for active requests to complete (with timeout)
    const activeRequestIds = Array.from(this.activeRequests.keys());
    if (activeRequestIds.length > 0) {
      console.log(`⏳ Waiting for ${activeRequestIds.length} active requests to complete...`);
      
      await Promise.race([
        this.waitForActiveRequests(),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
    }
    
    // Cleanup process manager
    await this.processManager.cleanup();
    
    // Clear maps
    this.activeRequests.clear();
    this.requestHistory.clear();
    
    if (this.options.debug) {
      console.log('✅ ClaudeAPIManager cleanup completed');
    }
  }
  
  /**
   * Wait for all active requests to complete
   */
  async waitForActiveRequests() {
    while (this.activeRequests.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  /**
   * Get statistics about API usage
   * @returns {object} - Usage statistics
   */
  getStatistics() {
    return {
      total_requests: this.requestHistory.size,
      active_requests: this.activeRequests.size,
      process_stats: this.processManager.getStatistics(),
      communication_stats: this.communicationStrategy.getStatistics()
    };
  }
}

module.exports = { ClaudeAPIManager };

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing ClaudeAPIManager...');
    
    const manager = new ClaudeAPIManager({ 
      debug: true,
      timeout: 30000
    });
    
    try {
      // Test basic functionality
      console.log('\n1️⃣ Testing basic prompt...');
      const result1 = await manager.sendPrompt('What is 2+2?');
      console.log('Result:', result1.success ? 'SUCCESS' : 'FAILED');
      console.log('Response:', result1.result?.substring(0, 100) + '...');
      
      // Test health check
      console.log('\n2️⃣ Testing health check...');
      const health = manager.getHealth();
      console.log('Health:', health);
      
      // Test cleanup
      console.log('\n3️⃣ Testing cleanup...');
      await manager.cleanup();
      
      console.log('\n✅ All tests completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  })();
}