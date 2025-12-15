/**
 * SPARC Terminal Hang Detection System
 * Implements sophisticated hang detection with progressive recovery protocols
 */

class TerminalHangDetector {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || 5000;
    this.heartbeatInterval = options.heartbeatInterval || 1000;
    this.maxRecoveryAttempts = options.maxRecoveryAttempts || 3;
    
    // State tracking
    this.lastActivity = Date.now();
    this.isActive = false;
    this.recoveryAttempts = 0;
    this.hangCallbacks = [];
    
    // Monitoring intervals
    this.heartbeatTimer = null;
    this.hangCheckTimer = null;
    
    // Statistics
    this.stats = {
      hangsDetected: 0,
      recoverySuccesses: 0,
      recoveryFailures: 0,
      averageRecoveryTime: 0
    };
  }
  
  /**
   * Start hang detection monitoring
   */
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastActivity = Date.now();
    
    // Start periodic hang checking
    this.hangCheckTimer = setInterval(() => {
      this.checkForHang();
    }, this.heartbeatInterval);
    
    console.log('🔍 Terminal hang detector started');
  }
  
  /**
   * Stop hang detection monitoring
   */
  stop() {
    this.isActive = false;
    
    if (this.hangCheckTimer) {
      clearInterval(this.hangCheckTimer);
      this.hangCheckTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    console.log('🔍 Terminal hang detector stopped');
  }
  
  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }
  
  /**
   * Check for hang condition
   */
  checkForHang() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    
    if (timeSinceActivity > this.timeoutMs) {
      this.detectHang();
    }
  }
  
  /**
   * Trigger hang detection
   */
  detectHang() {
    console.warn('🚨 Terminal hang detected!');
    
    this.stats.hangsDetected++;
    
    const hangInfo = {
      type: 'terminal_hang',
      timestamp: Date.now(),
      lastActivity: this.lastActivity,
      inactivityDuration: Date.now() - this.lastActivity,
      recoveryAttempt: this.recoveryAttempts + 1
    };
    
    // Notify all registered callbacks
    this.hangCallbacks.forEach(callback => {
      try {
        callback(hangInfo);
      } catch (error) {
        console.error('Error in hang detection callback:', error);
      }
    });
    
    // Initiate recovery if attempts remaining
    if (this.recoveryAttempts < this.maxRecoveryAttempts) {
      this.initiateRecovery(hangInfo);
    }
  }
  
  /**
   * Register hang detection callback
   */
  onHangDetected(callback) {
    this.hangCallbacks.push(callback);
  }
  
  /**
   * Initiate recovery protocol
   */
  async initiateRecovery(hangInfo) {
    this.recoveryAttempts++;
    const recoveryStartTime = Date.now();
    
    console.log(`🔄 Initiating recovery attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts}`);
    
    try {
      // Progressive recovery steps
      const recoverySteps = [
        () => this.sendHeartbeat(),
        () => this.resetConnection(),
        () => this.respawnProcess(),
        () => this.reinitializeSession()
      ];
      
      for (const [index, step] of recoverySteps.entries()) {
        console.log(`🔄 Executing recovery step ${index + 1}/${recoverySteps.length}`);
        
        const success = await this.executeWithTimeout(step, 5000);
        
        if (success) {
          const recoveryTime = Date.now() - recoveryStartTime;
          this.recordRecoverySuccess(recoveryTime);
          console.log(`✅ Recovery successful at step ${index + 1} (${recoveryTime}ms)`);
          return true;
        }
      }
      
      // All recovery steps failed
      this.recordRecoveryFailure();
      console.error('❌ All recovery steps failed');
      return false;
      
    } catch (error) {
      console.error('❌ Recovery protocol error:', error);
      this.recordRecoveryFailure();
      return false;
    }
  }
  
  /**
   * Execute recovery step with timeout
   */
  async executeWithTimeout(step, timeoutMs) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeoutMs);
      
      Promise.resolve(step())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          console.error('Recovery step error:', error);
          resolve(false);
        });
    });
  }
  
  /**
   * Recovery step: Send heartbeat
   */
  async sendHeartbeat() {
    console.log('💓 Sending heartbeat...');
    
    // Simulate heartbeat - in real implementation, this would ping the WebSocket
    return new Promise(resolve => {
      setTimeout(() => {
        // Check if connection responds
        const responded = Math.random() > 0.3; // 70% success rate for simulation
        resolve(responded);
      }, 100);
    });
  }
  
  /**
   * Recovery step: Reset WebSocket connection
   */
  async resetConnection() {
    console.log('🔄 Resetting WebSocket connection...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.5; // 50% success rate for simulation
        if (success) {
          this.updateActivity(); // Reset activity on successful reconnection
        }
        resolve(success);
      }, 500);
    });
  }
  
  /**
   * Recovery step: Respawn PTY process
   */
  async respawnProcess() {
    console.log('🔄 Respawning PTY process...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.2; // 80% success rate for simulation
        if (success) {
          this.updateActivity();
          this.recoveryAttempts = 0; // Reset attempts on successful process restart
        }
        resolve(success);
      }, 1000);
    });
  }
  
  /**
   * Recovery step: Reinitialize terminal session
   */
  async reinitializeSession() {
    console.log('🔄 Reinitializing terminal session...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        this.updateActivity();
        this.recoveryAttempts = 0;
        resolve(true); // This is the fallback step, should always succeed
      }, 200);
    });
  }
  
  /**
   * Record successful recovery
   */
  recordRecoverySuccess(recoveryTime) {
    this.stats.recoverySuccesses++;
    
    // Update average recovery time
    const totalRecoveries = this.stats.recoverySuccesses + this.stats.recoveryFailures;
    this.stats.averageRecoveryTime = 
      (this.stats.averageRecoveryTime * (totalRecoveries - 1) + recoveryTime) / totalRecoveries;
    
    this.recoveryAttempts = 0; // Reset attempts on success
  }
  
  /**
   * Record failed recovery
   */
  recordRecoveryFailure() {
    this.stats.recoveryFailures++;
  }
  
  /**
   * Get detection statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.recoverySuccesses / 
        (this.stats.recoverySuccesses + this.stats.recoveryFailures) || 0,
      isActive: this.isActive,
      lastActivity: this.lastActivity,
      currentInactivity: Date.now() - this.lastActivity
    };
  }
  
  /**
   * Simulate hang for testing
   */
  simulateHang() {
    this.lastActivity = Date.now() - (this.timeoutMs + 1000);
    this.checkForHang();
  }
  
  /**
   * Check if hang was triggered (for testing)
   */
  wasTriggered() {
    return this.stats.hangsDetected > 0;
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.stop();
    this.hangCallbacks = [];
    this.recoveryAttempts = 0;
  }
}

module.exports = { TerminalHangDetector };