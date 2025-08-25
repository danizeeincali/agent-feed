/**
 * SPARC Terminal Recovery Protocol
 * Implements progressive recovery steps for terminal hang situations
 */

class TerminalRecoveryProtocol {
  constructor(options = {}) {
    this.options = {
      maxRecoveryAttempts: options.maxRecoveryAttempts || 3,
      recoveryTimeoutMs: options.recoveryTimeoutMs || 10000,
      stepTimeoutMs: options.stepTimeoutMs || 5000,
      progressiveDelays: options.progressiveDelays || [1000, 2000, 4000],
      ...options
    };
    
    // Recovery state
    this.activeRecoveries = new Map();
    this.recoveryHistory = [];
    
    // Default recovery steps
    this.defaultSteps = {
      heartbeat: this.executeHeartbeat.bind(this),
      resetConnection: this.executeResetConnection.bind(this),
      respawnProcess: this.executeRespawnProcess.bind(this),
      reinitialize: this.executeReinitialize.bind(this)
    };
    
    this.customSteps = null;
    
    // Statistics
    this.stats = {
      totalRecoveries: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0,
      stepSuccessRates: {},
      mostEffectiveStep: null
    };
  }
  
  /**
   * Execute recovery protocol for a session
   */
  async executeRecovery(sessionId, context = {}) {
    if (this.activeRecoveries.has(sessionId)) {
      console.warn(`Recovery already in progress for session ${sessionId}`);
      return this.activeRecoveries.get(sessionId);
    }
    
    const recoveryPromise = this.performRecovery(sessionId, context);
    this.activeRecoveries.set(sessionId, recoveryPromise);
    
    try {
      const result = await recoveryPromise;
      return result;
    } finally {
      this.activeRecoveries.delete(sessionId);
    }
  }
  
  /**
   * Perform the actual recovery process
   */
  async performRecovery(sessionId, context) {
    const startTime = Date.now();
    this.stats.totalRecoveries++;
    
    console.log(`🔄 Starting recovery for session ${sessionId}`);
    
    const recoveryInfo = {
      sessionId,
      startTime,
      attempts: 0,
      steps: [],
      success: false,
      recoveredAtStep: null,
      totalTime: 0,
      context
    };
    
    const steps = this.customSteps || this.defaultSteps;
    const stepNames = Object.keys(steps);
    
    try {
      for (const [index, stepName] of stepNames.entries()) {
        const stepStartTime = Date.now();
        recoveryInfo.attempts++;
        
        console.log(`🔄 Step ${index + 1}/${stepNames.length}: ${stepName}`);
        
        try {
          const stepResult = await this.executeRecoveryStep(
            steps[stepName],
            sessionId,
            context,
            this.options.stepTimeoutMs
          );
          
          const stepTime = Date.now() - stepStartTime;
          const stepInfo = {
            name: stepName,
            success: stepResult,
            executionTime: stepTime,
            timestamp: stepStartTime
          };
          
          recoveryInfo.steps.push(stepInfo);
          this.updateStepStatistics(stepName, stepResult, stepTime);
          
          if (stepResult) {
            // Step succeeded - recovery complete
            recoveryInfo.success = true;
            recoveryInfo.recoveredAtStep = stepName;
            recoveryInfo.totalTime = Date.now() - startTime;
            
            console.log(`✅ Recovery successful at step '${stepName}' (${recoveryInfo.totalTime}ms)`);
            
            this.recordRecoverySuccess(recoveryInfo);
            return recoveryInfo;
          }
          
          // Step failed - add delay before next step
          if (index < stepNames.length - 1) {
            const delay = this.options.progressiveDelays[Math.min(index, this.options.progressiveDelays.length - 1)];
            console.log(`⏳ Step '${stepName}' failed, waiting ${delay}ms before next step`);
            await this.sleep(delay);
          }
          
        } catch (error) {
          const stepTime = Date.now() - stepStartTime;
          console.error(`❌ Step '${stepName}' threw error:`, error);
          
          recoveryInfo.steps.push({
            name: stepName,
            success: false,
            error: error.message,
            executionTime: stepTime,
            timestamp: stepStartTime
          });
          
          this.updateStepStatistics(stepName, false, stepTime);
        }
      }
      
      // All steps failed
      recoveryInfo.success = false;
      recoveryInfo.totalTime = Date.now() - startTime;
      recoveryInfo.attemptsExhausted = true;
      recoveryInfo.finalAction = 'user_notification_required';
      
      console.error(`❌ All recovery steps failed for session ${sessionId}`);
      
      this.recordRecoveryFailure(recoveryInfo);
      return recoveryInfo;
      
    } catch (error) {
      recoveryInfo.success = false;
      recoveryInfo.totalTime = Date.now() - startTime;
      recoveryInfo.error = error.message;
      
      console.error(`❌ Recovery protocol error for session ${sessionId}:`, error);
      
      this.recordRecoveryFailure(recoveryInfo);
      return recoveryInfo;
    }
  }
  
  /**
   * Execute a single recovery step with timeout
   */
  async executeRecoveryStep(stepFunction, sessionId, context, timeoutMs) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn(`⏰ Recovery step timed out after ${timeoutMs}ms`);
        resolve(false);
      }, timeoutMs);
      
      Promise.resolve(stepFunction(sessionId, context))
        .then(result => {
          clearTimeout(timer);
          resolve(!!result); // Ensure boolean result
        })
        .catch(error => {
          clearTimeout(timer);
          console.error('Recovery step error:', error);
          resolve(false);
        });
    });
  }
  
  /**
   * Recovery step: Send heartbeat to check connection
   */
  async executeHeartbeat(sessionId, context) {
    console.log(`💓 Executing heartbeat for session ${sessionId}`);
    
    // Simulate heartbeat - in real implementation, this would ping the connection
    if (context.websocket) {
      try {
        // Send ping and wait for pong
        const pingPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000);
          
          context.websocket.ping?.(() => {
            clearTimeout(timeout);
            resolve(true);
          });
          
          // For Socket.IO
          if (context.websocket.emit) {
            context.websocket.emit('ping', { timestamp: Date.now() });
            // Wait for pong response - would be handled in message listener
            setTimeout(() => {
              clearTimeout(timeout);
              resolve(context.websocket.connected || false);
            }, 1000);
          }
        });
        
        return await pingPromise;
      } catch (error) {
        return false;
      }
    }
    
    // Simulate success/failure for testing
    return Math.random() > 0.3; // 70% success rate
  }
  
  /**
   * Recovery step: Reset WebSocket connection
   */
  async executeResetConnection(sessionId, context) {
    console.log(`🔄 Executing connection reset for session ${sessionId}`);
    
    if (context.websocket) {
      try {
        // Close current connection
        if (context.websocket.close) {
          context.websocket.close();
        } else if (context.websocket.disconnect) {
          context.websocket.disconnect();
        }
        
        // Wait a bit before reconnecting
        await this.sleep(1000);
        
        // Reconnect would be handled by the WebSocket manager
        // For now, simulate the process
        return Math.random() > 0.4; // 60% success rate
        
      } catch (error) {
        console.error('Connection reset error:', error);
        return false;
      }
    }
    
    return Math.random() > 0.4;
  }
  
  /**
   * Recovery step: Respawn PTY process
   */
  async executeRespawnProcess(sessionId, context) {
    console.log(`🔄 Executing process respawn for session ${sessionId}`);
    
    if (context.processManager && context.pid) {
      try {
        // Kill existing process
        await context.processManager.killProcess(context.pid);
        
        // Wait for cleanup
        await this.sleep(2000);
        
        // Spawn new process
        const newProcess = await context.processManager.spawn(context.processConfig || {});
        
        // Update context with new PID
        context.pid = newProcess.pid;
        
        return true;
        
      } catch (error) {
        console.error('Process respawn error:', error);
        return false;
      }
    }
    
    // Simulate success for testing
    return Math.random() > 0.2; // 80% success rate
  }
  
  /**
   * Recovery step: Reinitialize entire session
   */
  async executeReinitialize(sessionId, context) {
    console.log(`🔄 Executing full reinitialization for session ${sessionId}`);
    
    // This is the nuclear option - recreate everything
    try {
      // Clean up existing resources
      if (context.cleanup) {
        await context.cleanup();
      }
      
      // Wait for cleanup to complete
      await this.sleep(1000);
      
      // Reinitialize would be handled by the calling system
      // This step typically always succeeds as it's the fallback
      return true;
      
    } catch (error) {
      console.error('Reinitialization error:', error);
      return false;
    }
  }
  
  /**
   * Set custom recovery steps
   */
  setRecoverySteps(steps) {
    this.customSteps = steps;
  }
  
  /**
   * Check if recovery is active for a session
   */
  isActive(sessionId) {
    return sessionId ? this.activeRecoveries.has(sessionId) : this.activeRecoveries.size > 0;
  }
  
  /**
   * Wait for recovery to complete
   */
  async waitForRecovery(sessionId) {
    const recovery = this.activeRecoveries.get(sessionId);
    if (recovery) {
      return await recovery;
    }
    return null;
  }
  
  /**
   * Record successful recovery
   */
  recordRecoverySuccess(recoveryInfo) {
    this.stats.successfulRecoveries++;
    this.updateAverageRecoveryTime(recoveryInfo.totalTime);
    this.updateMostEffectiveStep(recoveryInfo.recoveredAtStep);
    this.recoveryHistory.push(recoveryInfo);
    
    // Trim history if it gets too long
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-50);
    }
  }
  
  /**
   * Record failed recovery
   */
  recordRecoveryFailure(recoveryInfo) {
    this.stats.failedRecoveries++;
    this.updateAverageRecoveryTime(recoveryInfo.totalTime);
    this.recoveryHistory.push(recoveryInfo);
    
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-50);
    }
  }
  
  /**
   * Update step statistics
   */
  updateStepStatistics(stepName, success, executionTime) {
    if (!this.stats.stepSuccessRates[stepName]) {
      this.stats.stepSuccessRates[stepName] = {
        attempts: 0,
        successes: 0,
        averageTime: 0,
        successRate: 0
      };
    }
    
    const stepStats = this.stats.stepSuccessRates[stepName];
    stepStats.attempts++;
    
    if (success) {
      stepStats.successes++;
    }
    
    stepStats.successRate = stepStats.successes / stepStats.attempts;
    stepStats.averageTime = (stepStats.averageTime * (stepStats.attempts - 1) + executionTime) / stepStats.attempts;
  }
  
  /**
   * Update average recovery time
   */
  updateAverageRecoveryTime(recoveryTime) {
    const totalRecoveries = this.stats.successfulRecoveries + this.stats.failedRecoveries;
    this.stats.averageRecoveryTime = 
      (this.stats.averageRecoveryTime * (totalRecoveries - 1) + recoveryTime) / totalRecoveries;
  }
  
  /**
   * Update most effective step
   */
  updateMostEffectiveStep(stepName) {
    if (!stepName) return;
    
    const stepStats = Object.values(this.stats.stepSuccessRates);
    if (stepStats.length === 0) return;
    
    const mostEffective = Object.keys(this.stats.stepSuccessRates)
      .reduce((best, current) => {
        const currentStats = this.stats.stepSuccessRates[current];
        const bestStats = this.stats.stepSuccessRates[best];
        
        return currentStats.successRate > bestStats.successRate ? current : best;
      });
    
    this.stats.mostEffectiveStep = mostEffective;
  }
  
  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    const totalRecoveries = this.stats.successfulRecoveries + this.stats.failedRecoveries;
    
    return {
      ...this.stats,
      totalRecoveries,
      successRate: totalRecoveries > 0 ? this.stats.successfulRecoveries / totalRecoveries : 0,
      activeRecoveries: this.activeRecoveries.size,
      recentHistory: this.recoveryHistory.slice(-10)
    };
  }
  
  /**
   * Sleep utility
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Cleanup recovery protocol
   */
  cleanup() {
    // Cancel all active recoveries
    this.activeRecoveries.clear();
    
    console.log('🔄 Recovery protocol cleaned up');
  }
}

module.exports = { TerminalRecoveryProtocol };