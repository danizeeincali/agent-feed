/**
 * Enhanced Claude Process Manager with Timeout Fix
 * TDD GREEN PHASE: Minimal implementation to make tests pass
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs').promises;

class EnhancedClaudeProcessManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Adaptive timeout configuration
    this.timeouts = {
      'health-check': options.healthCheckTimeout || 2000,
      'simple-query': options.simpleQueryTimeout || 5000,
      'code-analysis': options.codeAnalysisTimeout || 15000,
      'large-generation': options.largeGenerationTimeout || 30000,
      'complex-reasoning': options.complexReasoningTimeout || 60000,
      'default': options.defaultTimeout || 10000
    };
    
    // Process pool configuration
    this.processPool = {
      maxSize: options.maxPoolSize || 3,
      processes: new Map(),
      available: [],
      busy: new Set()
    };
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseRetryDelay || 1000,
      maxDelay: options.maxRetryDelay || 10000
    };
    
    // Circuit breaker configuration
    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      failureThreshold: options.failureThreshold || 3,
      timeout: options.circuitBreakerTimeout || 5000,
      lastFailureTime: null
    };
    
    // Memory and resource tracking
    this.resources = {
      memoryLimit: options.memoryLimit || 100 * 1024 * 1024, // 100MB
      fdLimit: options.fdLimit || 1024,
      activeProcesses: new Map()
    };
    
    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      timeoutCount: 0
    };
    
    this.setupCleanupHandlers();
  }

  /**
   * Determine appropriate timeout based on operation type
   */
  getTimeoutForOperation(operation, prompt = '') {
    // Analyze prompt to determine complexity
    const promptLength = prompt.length;
    const hasCodeMarkers = /```|`[^`]+`|function|class|import|export/.test(prompt);
    const hasComplexQuestions = /analyze|explain|compare|generate|create/.test(prompt.toLowerCase());
    
    // Determine operation type from prompt characteristics
    if (promptLength < 100 && !hasCodeMarkers && !hasComplexQuestions) {
      return this.timeouts['simple-query'];
    } else if (hasCodeMarkers || promptLength > 1000) {
      return this.timeouts['code-analysis'];
    } else if (hasComplexQuestions && promptLength > 500) {
      return this.timeouts['complex-reasoning'];
    } else if (promptLength > 5000) {
      return this.timeouts['large-generation'];
    }
    
    return this.timeouts[operation] || this.timeouts['default'];
  }

  /**
   * Create Claude process with enhanced error handling
   */
  async createClaudeProcess(command = ['claude'], options = {}) {
    const timeout = this.getTimeoutForOperation(options.operation || 'default', options.prompt);
    
    return new Promise((resolve, reject) => {
      let process;
      let timeoutId;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (process && !process.killed) {
          this.gracefulTerminate(process);
        }
      };

      const handleSuccess = (proc) => {
        if (!resolved) {
          resolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          resolve(proc);
          this.metrics.successfulRequests++;
          this.resetCircuitBreaker();
        }
      };

      const handleError = (error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
          this.metrics.failedRequests++;
          this.recordFailure();
        }
      };

      // Set adaptive timeout
      timeoutId = setTimeout(() => {
        if (!resolved) {
          this.metrics.timeoutCount++;
          handleError(new Error(`Claude process timeout after ${timeout}ms (adaptive timeout for ${options.operation || 'default'})`));
        }
      }, timeout);

      try {
        process = spawn(command[0], command.slice(1), {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: options.cwd || process.env.WORKSPACE_ROOT || process.cwd(),
          env: { ...process.env, ...options.env }
        });

        // Handle process events
        process.on('spawn', () => {
          handleSuccess(process);
        });

        process.on('error', (error) => {
          handleError(new Error(`Process spawn failed: ${error.message}`));
        });

        process.on('exit', (code, signal) => {
          if (code !== 0 && !resolved) {
            handleError(new Error(`Process exited with code ${code}, signal ${signal}`));
          }
        });

      } catch (error) {
        handleError(error);
      }

      this.metrics.totalRequests++;
    });
  }

  /**
   * Graceful process termination with escalation
   */
  async gracefulTerminate(process, maxWaitTime = 5000) {
    if (!process || process.killed) return;

    return new Promise((resolve) => {
      let terminated = false;
      
      const forceKill = () => {
        if (!terminated && !process.killed) {
          terminated = true;
          try {
            process.kill('SIGKILL');
          } catch (error) {
            // Process might already be dead
          }
          resolve();
        }
      };

      // Try graceful termination first
      process.on('exit', () => {
        if (!terminated) {
          terminated = true;
          resolve();
        }
      });

      try {
        process.kill('SIGTERM');
        
        // Escalate to SIGKILL if needed
        setTimeout(() => {
          if (!terminated && !process.killed) {
            try {
              process.kill('SIGKILL');
            } catch (error) {
              // Process might already be dead
            }
          }
        }, Math.min(maxWaitTime / 2, 2500));

        // Final timeout
        setTimeout(forceKill, maxWaitTime);

      } catch (error) {
        forceKill();
      }
    });
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(operation, maxRetries = this.retryConfig.maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
            this.retryConfig.maxDelay
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry certain errors
        if (error.message.includes('ENOENT') || error.message.includes('not authenticated')) {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Circuit breaker logic
   */
  shouldAttemptRequest() {
    if (this.circuitBreaker.state === 'CLOSED') {
      return true;
    }
    
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      return true;
    }
    
    // OPEN state - check if timeout has passed
    const now = Date.now();
    if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.timeout) {
      this.circuitBreaker.state = 'HALF_OPEN';
      return true;
    }
    
    return false;
  }

  recordFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
    }
  }

  resetCircuitBreaker() {
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
  }

  /**
   * Memory pressure detection and handling
   */
  checkMemoryPressure() {
    const usage = process.memoryUsage();
    return usage.heapUsed > this.resources.memoryLimit;
  }

  async handleMemoryPressure() {
    if (global.gc) {
      global.gc();
    }
    
    // Clean up oldest processes from pool
    const processesToRemove = Math.floor(this.processPool.available.length / 2);
    for (let i = 0; i < processesToRemove; i++) {
      const proc = this.processPool.available.shift();
      if (proc) {
        await this.gracefulTerminate(proc);
      }
    }
  }

  /**
   * Setup cleanup handlers for graceful shutdown
   */
  setupCleanupHandlers() {
    const cleanup = async (signal) => {
      console.log(`Received ${signal}, cleaning up processes...`);
      
      // Clean up all active processes
      for (const [instanceId, process] of this.resources.activeProcesses) {
        await this.gracefulTerminate(process);
      }
      
      // Clean up process pool
      for (const process of this.processPool.available) {
        await this.gracefulTerminate(process);
      }
      
      process.exit(0);
    };

    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await cleanup('uncaughtException');
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitBreakerState: this.circuitBreaker.state,
      activeProcesses: this.resources.activeProcesses.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

module.exports = EnhancedClaudeProcessManager;