#!/usr/bin/env node

/**
 * Robust Process Manager - Handles Claude process lifecycle with retries and cleanup
 */

const { spawn } = require('child_process');
const crypto = require('crypto');

class RobustProcessManager {
  constructor(options = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      processTimeout: options.processTimeout || 60000,
      cleanupTimeout: options.cleanupTimeout || 5000,
      debug: options.debug || false,
      ...options
    };
    
    this.processes = new Map(); // processId -> ManagedProcess
    this.statistics = {
      totalProcesses: 0,
      successfulProcesses: 0,
      failedProcesses: 0,
      timeouts: 0,
      retries: 0
    };
    
    // Start cleanup monitor
    this.startCleanupMonitor();
    
    if (this.options.debug) {
      console.log('🔧 RobustProcessManager initialized with options:', this.options);
    }
  }
  
  /**
   * Execute command with retry logic and proper cleanup
   * @param {string} command - Command to execute
   * @param {string[]} args - Command arguments
   * @param {object} options - Execution options
   * @returns {Promise<object>} - Process result
   */
  async executeWithRetry(command, args = [], options = {}) {
    const processId = crypto.randomUUID();
    const config = { ...this.options, ...options };
    let lastError = null;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        if (this.options.debug && attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${config.maxRetries} for process ${processId}`);
        }
        
        const result = await this.createAndExecuteProcess(command, args, processId, config);
        
        this.statistics.successfulProcesses++;
        if (attempt > 1) {
          this.statistics.retries += (attempt - 1);
        }
        
        return {
          success: true,
          ...result,
          attempt,
          processId
        };
        
      } catch (error) {
        lastError = error;
        this.statistics.failedProcesses++;
        
        if (error.message.includes('timeout')) {
          this.statistics.timeouts++;
        }
        
        if (attempt < config.maxRetries) {
          if (this.options.debug) {
            console.log(`⚠️ Process attempt ${attempt} failed: ${error.message}, retrying in ${config.retryDelay}ms...`);
          }
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
    }
    
    // All retries exhausted
    this.statistics.failedProcesses++;
    
    return {
      success: false,
      error: `Process failed after ${config.maxRetries} attempts: ${lastError?.message}`,
      processId,
      attempts: config.maxRetries
    };
  }
  
  /**
   * Create and execute a single process
   * @param {string} command - Command to execute
   * @param {string[]} args - Command arguments
   * @param {string} processId - Unique process identifier
   * @param {object} config - Process configuration
   * @returns {Promise<object>} - Process execution result
   */
  async createAndExecuteProcess(command, args, processId, config) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Spawn the process
      const childProcess = spawn(command, args, {
        stdio: config.stdio || ['pipe', 'pipe', 'pipe'],
        cwd: config.cwd || process.env.WORKSPACE_ROOT || process.cwd(),
        env: { ...process.env, ...(config.env || {}) }
      });
      
      // Create managed process object
      const managedProcess = {
        id: processId,
        pid: childProcess.pid,
        command,
        args,
        startTime,
        status: 'running',
        childProcess,
        stdout: '',
        stderr: '',
        timeout: null
      };
      
      this.processes.set(processId, managedProcess);
      this.statistics.totalProcesses++;
      
      if (this.options.debug) {
        console.log(`🚀 Started process ${processId} (PID: ${childProcess.pid}): ${command} ${args.join(' ')}`);
      }
      
      // Set up data collection
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data) => {
          managedProcess.stdout += data.toString();
          if (config.onStdout) {
            config.onStdout(data.toString(), processId);
          }
        });
      }
      
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data) => {
          managedProcess.stderr += data.toString();
          if (config.onStderr) {
            config.onStderr(data.toString(), processId);
          }
        });
      }
      
      // Handle process completion
      childProcess.on('close', (code, signal) => {
        const duration = Date.now() - startTime;
        managedProcess.status = code === 0 ? 'completed' : 'failed';
        
        if (managedProcess.timeout) {
          clearTimeout(managedProcess.timeout);
        }
        
        if (this.options.debug) {
          console.log(`✅ Process ${processId} completed with code ${code} in ${duration}ms`);
        }
        
        // Clean up from active processes
        this.processes.delete(processId);
        
        if (code === 0) {
          resolve({
            code,
            signal,
            stdout: managedProcess.stdout,
            stderr: managedProcess.stderr,
            duration,
            pid: childProcess.pid
          });
        } else {
          reject(new Error(`Process exited with code ${code}: ${managedProcess.stderr}`));
        }
      });
      
      // Handle process errors
      childProcess.on('error', (error) => {
        managedProcess.status = 'error';
        
        if (managedProcess.timeout) {
          clearTimeout(managedProcess.timeout);
        }
        
        console.error(`❌ Process ${processId} error:`, error.message);
        this.processes.delete(processId);
        reject(new Error(`Process spawn failed: ${error.message}`));
      });
      
      // Set up timeout handling
      managedProcess.timeout = setTimeout(() => {
        if (managedProcess.status === 'running') {
          if (this.options.debug) {
            console.log(`⏰ Process ${processId} timeout, attempting graceful termination...`);
          }
          
          this.terminateProcess(processId, 'timeout');
          reject(new Error(`Process timeout after ${config.processTimeout}ms`));
        }
      }, config.processTimeout);
      
      // Handle stdin if provided
      if (config.stdin && childProcess.stdin) {
        try {
          if (typeof config.stdin === 'string') {
            childProcess.stdin.write(config.stdin);
            childProcess.stdin.end();
          }
        } catch (stdinError) {
          console.error(`❌ Failed to write to process ${processId} stdin:`, stdinError.message);
        }
      }
    });
  }
  
  /**
   * Terminate a process gracefully with fallback to force kill
   * @param {string} processId - Process to terminate
   * @param {string} reason - Reason for termination
   */
  terminateProcess(processId, reason = 'manual') {
    const managedProcess = this.processes.get(processId);
    if (!managedProcess || !managedProcess.childProcess) {
      return false;
    }
    
    const { childProcess } = managedProcess;
    managedProcess.status = 'terminating';
    
    if (this.options.debug) {
      console.log(`🛑 Terminating process ${processId} (PID: ${childProcess.pid}) - reason: ${reason}`);
    }
    
    try {
      // First try graceful termination
      childProcess.kill('SIGTERM');
      
      // Force kill after cleanup timeout
      setTimeout(() => {
        if (!childProcess.killed && managedProcess.status === 'terminating') {
          if (this.options.debug) {
            console.log(`💀 Force killing process ${processId} (PID: ${childProcess.pid})`);
          }
          childProcess.kill('SIGKILL');
        }
      }, this.options.cleanupTimeout);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to terminate process ${processId}:`, error.message);
      return false;
    }
  }
  
  /**
   * Start background monitor for cleanup and health checking
   */
  startCleanupMonitor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const staleProcesses = [];
      
      for (const [processId, managedProcess] of this.processes) {
        const age = now - managedProcess.startTime;
        
        // Mark processes older than 5 minutes as stale
        if (age > 300000) {
          staleProcesses.push(processId);
        }
      }
      
      // Cleanup stale processes
      staleProcesses.forEach(processId => {
        if (this.options.debug) {
          console.log(`🧹 Cleaning up stale process ${processId}`);
        }
        this.terminateProcess(processId, 'stale');
      });
      
    }, 60000); // Check every minute
  }
  
  /**
   * Get count of currently active processes
   * @returns {number} - Active process count
   */
  async getActiveProcessCount() {
    return this.processes.size;
  }
  
  /**
   * Get health status of the process manager
   * @returns {object} - Health information
   */
  getHealth() {
    const activeProcesses = this.processes.size;
    
    return {
      status: activeProcesses < 10 ? 'healthy' : 'busy',
      active_processes: activeProcesses,
      total_processes: this.statistics.totalProcesses,
      success_rate: this.statistics.totalProcesses > 0 
        ? (this.statistics.successfulProcesses / this.statistics.totalProcesses * 100).toFixed(1) + '%'
        : '0%',
      memory_usage: process.memoryUsage()
    };
  }
  
  /**
   * Get detailed statistics
   * @returns {object} - Detailed statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      active_processes: this.processes.size,
      average_success_rate: this.statistics.totalProcesses > 0 
        ? this.statistics.successfulProcesses / this.statistics.totalProcesses 
        : 0
    };
  }
  
  /**
   * Cleanup all resources and terminate processes
   */
  async cleanup() {
    if (this.options.debug) {
      console.log('🧹 Cleaning up RobustProcessManager...');
    }
    
    // Clear cleanup monitor
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Terminate all active processes
    const activeProcessIds = Array.from(this.processes.keys());
    const terminationPromises = activeProcessIds.map(processId => 
      new Promise(resolve => {
        this.terminateProcess(processId, 'cleanup');
        setTimeout(resolve, this.options.cleanupTimeout);
      })
    );
    
    if (terminationPromises.length > 0) {
      await Promise.all(terminationPromises);
    }
    
    // Clear process map
    this.processes.clear();
    
    if (this.options.debug) {
      console.log('✅ RobustProcessManager cleanup completed');
    }
  }
}

module.exports = { RobustProcessManager };

// Test if run directly
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing RobustProcessManager...');
    
    const manager = new RobustProcessManager({ 
      debug: true,
      processTimeout: 10000
    });
    
    try {
      // Test successful process
      console.log('\n1️⃣ Testing successful process...');
      const result1 = await manager.executeWithRetry('echo', ['Hello World']);
      console.log('Success:', result1.success, 'Output:', result1.stdout?.trim());
      
      // Test process with retry
      console.log('\n2️⃣ Testing process with retry...');
      const result2 = await manager.executeWithRetry('sleep', ['2']); // Should succeed
      console.log('Success:', result2.success);
      
      // Test health
      console.log('\n3️⃣ Testing health check...');
      const health = manager.getHealth();
      console.log('Health:', health);
      
      // Cleanup
      await manager.cleanup();
      console.log('\n✅ All tests completed!');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  })();
}