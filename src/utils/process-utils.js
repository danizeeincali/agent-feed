#!/usr/bin/env node

/**
 * Process Utilities - Helper functions for process management
 */

const { spawn } = require('child_process');

/**
 * Check if Claude CLI is available
 * @returns {Promise<boolean>} - True if Claude CLI is available
 */
async function isClaudeAvailable() {
  return new Promise((resolve) => {
    const testProcess = spawn('claude', ['--version'], { 
      stdio: ['ignore', 'ignore', 'ignore'] 
    });
    
    let completed = false;
    
    testProcess.on('close', (code) => {
      completed = true;
      resolve(code === 0);
    });
    
    testProcess.on('error', () => {
      completed = true;
      resolve(false);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!completed) {
        testProcess.kill('SIGKILL');
        resolve(false);
      }
    }, 5000);
  });
}

/**
 * Get process information by PID
 * @param {number} pid - Process ID
 * @returns {object} - Process information
 */
function getProcessInfo(pid) {
  try {
    // This is a simple check - in production you'd want more detailed info
    process.kill(pid, 0); // Signal 0 just checks if process exists
    return { exists: true, pid };
  } catch (error) {
    return { exists: false, pid, error: error.message };
  }
}

/**
 * Safely kill a process with graceful termination
 * @param {number} pid - Process ID to kill
 * @param {number} timeout - Timeout in milliseconds for graceful termination
 * @returns {Promise<boolean>} - True if process was killed
 */
async function safeKillProcess(pid, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const processInfo = getProcessInfo(pid);
      if (!processInfo.exists) {
        resolve(true); // Already dead
        return;
      }
      
      // Try graceful termination first
      process.kill(pid, 'SIGTERM');
      
      // Check if process is still alive after timeout
      setTimeout(() => {
        try {
          const stillAlive = getProcessInfo(pid).exists;
          if (stillAlive) {
            // Force kill
            process.kill(pid, 'SIGKILL');
          }
          resolve(true);
        } catch (error) {
          resolve(true); // Process is dead
        }
      }, timeout);
      
    } catch (error) {
      resolve(false); // Couldn't kill process
    }
  });
}

/**
 * Create a shell-safe argument
 * @param {string} arg - Argument to make safe
 * @returns {string} - Shell-safe argument
 */
function shellEscape(arg) {
  if (typeof arg !== 'string') {
    throw new Error('Argument must be a string');
  }
  
  // Use single quotes and escape any single quotes in the string
  return `'${arg.replace(/'/g, "'\"'\"'")}'`;
}

/**
 * Validate process spawn options
 * @param {object} options - Spawn options to validate
 * @returns {object} - Validated options
 */
function validateSpawnOptions(options = {}) {
  const defaults = {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.env.WORKSPACE_ROOT || process.cwd(),
    env: process.env
  };
  
  return {
    ...defaults,
    ...options,
    // Ensure stdio is always an array
    stdio: Array.isArray(options.stdio) ? options.stdio : defaults.stdio
  };
}

/**
 * Create a timeout promise for process operations
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} message - Timeout error message
 * @returns {Promise} - Promise that rejects after timeout
 */
function createTimeoutPromise(timeout, message = 'Operation timed out') {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, timeout);
  });
}

/**
 * Wait for a condition with timeout
 * @param {function} condition - Function that returns true when condition is met
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} - True if condition was met
 */
async function waitForCondition(condition, timeout = 10000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

module.exports = {
  isClaudeAvailable,
  getProcessInfo,
  safeKillProcess,
  shellEscape,
  validateSpawnOptions,
  createTimeoutPromise,
  waitForCondition
};