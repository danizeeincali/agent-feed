/**
 * Process Lifecycle Manager for Real Claude Processes
 * Implements health monitoring, failure detection, and automatic recovery
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class ProcessLifecycleManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      healthCheckInterval: options.healthCheckInterval || 5000, // 5 seconds
      processTimeout: options.processTimeout || 300000, // 5 minutes
      maxRestarts: options.maxRestarts || 3,
      restartDelay: options.restartDelay || 5000, // 5 seconds
      zombieCheckInterval: options.zombieCheckInterval || 30000, // 30 seconds
      maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
      logRetention: options.logRetention || 86400000, // 24 hours
      ...options
    };
    
    this.processes = new Map(); // instanceId -> ProcessInfo
    this.healthMonitor = null;
    this.zombieChecker = null;
    this.isMonitoring = false;
    this.logDir = path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'logs', 'process-lifecycle');
    
    this.setupLogging();
    this.startMonitoring();
  }
  
  setupLogging() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  log(level, instanceId, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      instanceId,
      message,
      data,
      pid: this.getProcessPid(instanceId)
    };
    
    console.log(`[${level}] [${instanceId}] ${message}`, data);
    
    // Write to file
    const logFile = path.join(this.logDir, `${instanceId}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    
    // Emit event for external listeners
    this.emit('log', logEntry);
  }
  
  registerProcess(instanceId, processInfo) {
    const enhancedInfo = {
      ...processInfo,
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      healthStatus: 'healthy',
      restartCount: 0,
      memoryPeakUsage: 0,
      cpuUsage: 0,
      responseTime: 0,
      isResponding: true,
      lastResponse: new Date(),
      heartbeatMissed: 0,
      failureHistory: [],
      status: processInfo.status || 'starting'
    };
    
    this.processes.set(instanceId, enhancedInfo);
    this.log('INFO', instanceId, 'Process registered for lifecycle monitoring', {
      pid: processInfo.pid,
      command: processInfo.commandType
    });
    
    // Set up process event handlers
    if (processInfo.process) {
      this.attachProcessHandlers(instanceId, processInfo.process);
    }
    
    this.emit('processRegistered', { instanceId, processInfo: enhancedInfo });
  }
  
  attachProcessHandlers(instanceId, process) {
    // Monitor process exit
    process.on('exit', (code, signal) => {
      this.handleProcessExit(instanceId, code, signal);
    });
    
    // Monitor process errors
    process.on('error', (error) => {
      this.handleProcessError(instanceId, error);
    });
    
    // Monitor process disconnect
    process.on('disconnect', () => {
      this.handleProcessDisconnect(instanceId);
    });
  }
  
  handleProcessExit(instanceId, code, signal) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    const exitReason = signal ? `signal ${signal}` : `exit code ${code}`;
    this.log('WARN', instanceId, `Process exited with ${exitReason}`, { code, signal });
    
    processInfo.status = 'exited';
    processInfo.exitCode = code;
    processInfo.exitSignal = signal;
    processInfo.exitTime = new Date();
    
    // Record failure if unexpected exit
    if (code !== 0 || (signal && signal !== 'SIGTERM' && signal !== 'SIGINT')) {
      this.recordFailure(instanceId, 'unexpected_exit', { code, signal });
      
      // Attempt restart if eligible
      if (this.shouldRestart(instanceId)) {
        setTimeout(() => {
          this.attemptRestart(instanceId);
        }, this.options.restartDelay);
      }
    }
    
    this.emit('processExit', { instanceId, code, signal, processInfo });
  }
  
  handleProcessError(instanceId, error) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    this.log('ERROR', instanceId, `Process error: ${error.message}`, { 
      error: error.stack,
      pid: processInfo.pid 
    });
    
    processInfo.status = 'error';
    processInfo.lastError = error;
    processInfo.lastErrorTime = new Date();
    
    this.recordFailure(instanceId, 'process_error', { error: error.message });
    this.emit('processError', { instanceId, error, processInfo });
  }
  
  handleProcessDisconnect(instanceId) {
    this.log('WARN', instanceId, 'Process disconnected');
    const processInfo = this.processes.get(instanceId);
    if (processInfo) {
      processInfo.status = 'disconnected';
      this.emit('processDisconnect', { instanceId, processInfo });
    }
  }
  
  recordFailure(instanceId, type, details = {}) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    const failure = {
      type,
      timestamp: new Date(),
      details,
      pid: processInfo.pid
    };
    
    processInfo.failureHistory.push(failure);
    
    // Keep only recent failures (last 24 hours)
    const cutoff = Date.now() - this.options.logRetention;
    processInfo.failureHistory = processInfo.failureHistory.filter(
      f => f.timestamp.getTime() > cutoff
    );
    
    this.log('ERROR', instanceId, `Recorded failure: ${type}`, details);
    this.emit('processFailure', { instanceId, failure, processInfo });
  }
  
  shouldRestart(instanceId) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return false;
    
    // Don't restart if already at max restart count
    if (processInfo.restartCount >= this.options.maxRestarts) {
      this.log('ERROR', instanceId, 'Max restart attempts reached');
      return false;
    }
    
    // Don't restart if too many recent failures
    const recentFailures = processInfo.failureHistory.filter(
      f => Date.now() - f.timestamp.getTime() < 300000 // 5 minutes
    );
    
    if (recentFailures.length >= 3) {
      this.log('ERROR', instanceId, 'Too many recent failures, restart disabled');
      return false;
    }
    
    return true;
  }
  
  async attemptRestart(instanceId) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    this.log('INFO', instanceId, 'Attempting process restart', {
      restartCount: processInfo.restartCount + 1
    });
    
    processInfo.restartCount++;
    processInfo.status = 'restarting';
    
    try {
      // Emit restart event for external handlers
      this.emit('processRestart', { instanceId, processInfo });
      
      // The actual restart logic should be handled by the parent application
      // We just update the status and emit events
      
    } catch (error) {
      this.log('ERROR', instanceId, `Restart failed: ${error.message}`);
      processInfo.status = 'restart_failed';
      this.recordFailure(instanceId, 'restart_failed', { error: error.message });
    }
  }
  
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Health check monitoring
    this.healthMonitor = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
    
    // Zombie process checker
    this.zombieChecker = setInterval(() => {
      this.checkForZombieProcesses();
    }, this.options.zombieCheckInterval);
    
    console.log('🩺 Process lifecycle monitoring started');
  }
  
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
      this.healthMonitor = null;
    }
    
    if (this.zombieChecker) {
      clearInterval(this.zombieChecker);
      this.zombieChecker = null;
    }
    
    console.log('🛑 Process lifecycle monitoring stopped');
  }
  
  async performHealthChecks() {
    for (const [instanceId, processInfo] of this.processes.entries()) {
      if (processInfo.status !== 'running') continue;
      
      try {
        const healthData = await this.checkProcessHealth(instanceId, processInfo);
        this.updateHealthStatus(instanceId, healthData);
      } catch (error) {
        this.log('ERROR', instanceId, `Health check failed: ${error.message}`);
        this.handleHealthCheckFailure(instanceId, error);
      }
    }
  }
  
  async checkProcessHealth(instanceId, processInfo) {
    const { process, pid } = processInfo;
    
    if (!process || process.killed) {
      throw new Error('Process is not running');
    }
    
    // Check if process is still alive
    try {
      process.kill(0); // Signal 0 just checks if process exists
    } catch (error) {
      throw new Error('Process is no longer alive');
    }
    
    // Get memory and CPU usage
    const stats = await this.getProcessStats(pid);
    
    // Check memory usage
    if (stats.memory > this.options.maxMemoryUsage) {
      this.log('WARN', instanceId, 'High memory usage detected', { 
        memory: stats.memory,
        limit: this.options.maxMemoryUsage 
      });
    }
    
    // Update peak memory usage
    if (stats.memory > processInfo.memoryPeakUsage) {
      processInfo.memoryPeakUsage = stats.memory;
    }
    
    return {
      isAlive: true,
      memory: stats.memory,
      cpu: stats.cpu,
      uptime: Date.now() - processInfo.registeredAt.getTime(),
      responding: true
    };
  }
  
  async getProcessStats(pid) {
    try {
      // Read process stats from /proc on Linux systems
      if (process.platform === 'linux') {
        const statPath = `/proc/${pid}/stat`;
        const statusPath = `/proc/${pid}/status`;
        
        if (fs.existsSync(statPath) && fs.existsSync(statusPath)) {
          const statusContent = fs.readFileSync(statusPath, 'utf8');
          const memMatch = statusContent.match(/VmRSS:\s+(\d+)\s+kB/);
          const memory = memMatch ? parseInt(memMatch[1]) * 1024 : 0; // Convert to bytes
          
          return { memory, cpu: 0 }; // CPU calculation is complex, simplified here
        }
      }
      
      // Fallback for other systems - basic memory estimation
      return { memory: 0, cpu: 0 };
      
    } catch (error) {
      return { memory: 0, cpu: 0 };
    }
  }
  
  updateHealthStatus(instanceId, healthData) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    processInfo.lastHealthCheck = new Date();
    processInfo.healthStatus = 'healthy';
    processInfo.isResponding = healthData.responding;
    processInfo.lastResponse = new Date();
    processInfo.memoryUsage = healthData.memory;
    processInfo.cpuUsage = healthData.cpu;
    processInfo.heartbeatMissed = 0;
    
    this.emit('healthCheck', { instanceId, healthData, processInfo });
  }
  
  handleHealthCheckFailure(instanceId, error) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    processInfo.healthStatus = 'unhealthy';
    processInfo.heartbeatMissed++;
    processInfo.lastHealthCheckError = error;
    
    if (processInfo.heartbeatMissed >= 3) {
      this.log('ERROR', instanceId, 'Process unresponsive - multiple health checks failed');
      this.recordFailure(instanceId, 'unresponsive', { heartbeatMissed: processInfo.heartbeatMissed });
      
      // Consider force restart for unresponsive processes
      if (this.shouldRestart(instanceId)) {
        this.forceRestartUnresponsiveProcess(instanceId);
      }
    }
  }
  
  forceRestartUnresponsiveProcess(instanceId) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    this.log('WARN', instanceId, 'Force restarting unresponsive process');
    
    try {
      // Force kill the process
      if (processInfo.process && !processInfo.process.killed) {
        processInfo.process.kill('SIGKILL');
      }
      
      setTimeout(() => {
        this.attemptRestart(instanceId);
      }, this.options.restartDelay);
      
    } catch (error) {
      this.log('ERROR', instanceId, `Failed to force restart: ${error.message}`);
    }
  }
  
  checkForZombieProcesses() {
    for (const [instanceId, processInfo] of this.processes.entries()) {
      if (processInfo.status === 'exited' || processInfo.status === 'failed') {
        const timeSinceExit = Date.now() - (processInfo.exitTime?.getTime() || processInfo.registeredAt.getTime());
        
        // Clean up old process records after 1 hour
        if (timeSinceExit > 3600000) {
          this.log('INFO', instanceId, 'Cleaning up old process record');
          this.unregisterProcess(instanceId);
        }
      }
    }
  }
  
  unregisterProcess(instanceId) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return;
    
    this.log('INFO', instanceId, 'Unregistering process from lifecycle manager');
    
    // Clean up any remaining process references
    if (processInfo.process && !processInfo.process.killed) {
      try {
        processInfo.process.kill('SIGTERM');
      } catch (error) {
        // Process might already be dead
      }
    }
    
    this.processes.delete(instanceId);
    this.emit('processUnregistered', { instanceId, processInfo });
  }
  
  getProcessInfo(instanceId) {
    return this.processes.get(instanceId);
  }
  
  getAllProcesses() {
    return Array.from(this.processes.values());
  }
  
  getProcessCount() {
    return this.processes.size;
  }
  
  getHealthyProcessCount() {
    return Array.from(this.processes.values()).filter(p => p.healthStatus === 'healthy').length;
  }
  
  getProcessPid(instanceId) {
    const processInfo = this.processes.get(instanceId);
    return processInfo ? processInfo.pid : null;
  }
  
  getProcessStatus(instanceId) {
    const processInfo = this.processes.get(instanceId);
    if (!processInfo) return null;
    
    return {
      instanceId,
      status: processInfo.status,
      healthStatus: processInfo.healthStatus,
      pid: processInfo.pid,
      uptime: Date.now() - processInfo.registeredAt.getTime(),
      restartCount: processInfo.restartCount,
      memoryUsage: processInfo.memoryUsage || 0,
      memoryPeakUsage: processInfo.memoryPeakUsage || 0,
      cpuUsage: processInfo.cpuUsage || 0,
      isResponding: processInfo.isResponding,
      lastResponse: processInfo.lastResponse,
      lastHealthCheck: processInfo.lastHealthCheck,
      failureCount: processInfo.failureHistory.length,
      heartbeatMissed: processInfo.heartbeatMissed
    };
  }
  
  shutdown() {
    this.stopMonitoring();
    
    // Clean up all processes
    for (const [instanceId, processInfo] of this.processes.entries()) {
      this.log('INFO', instanceId, 'Shutting down process for lifecycle manager shutdown');
      if (processInfo.process && !processInfo.process.killed) {
        try {
          processInfo.process.kill('SIGTERM');
        } catch (error) {
          // Process might already be dead
        }
      }
    }
    
    this.processes.clear();
    this.emit('shutdown');
  }
}

module.exports = ProcessLifecycleManager;