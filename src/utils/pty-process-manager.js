/**
 * SPARC PTY Process Manager
 * Manages PTY process lifecycle with hang detection and resource monitoring
 */

const pty = require('node-pty');
const EventEmitter = require('events');

class PTYProcessManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxProcesses: options.maxProcesses || 10,
      processTimeoutMs: options.processTimeoutMs || 300000, // 5 minutes
      resourceCheckInterval: options.resourceCheckInterval || 10000, // 10 seconds
      maxMemoryMB: options.maxMemoryMB || 256,
      maxCpuPercent: options.maxCpuPercent || 80,
      ...options
    };
    
    // Active processes
    this.processes = new Map();
    this.processStats = new Map();
    
    // Monitoring
    this.resourceMonitor = null;
    this.hangDetectors = new Map();
    
    // Statistics
    this.stats = {
      processesSpawned: 0,
      processesTerminated: 0,
      processesKilled: 0,
      hangsDetected: 0,
      resourceViolations: 0
    };
    
    this.startResourceMonitoring();
  }
  
  /**
   * Spawn a new PTY process
   */
  async spawn(options = {}) {
    if (this.processes.size >= this.options.maxProcesses) {
      throw new Error(`Maximum process limit reached (${this.options.maxProcesses})`);
    }
    
    const config = {
      shell: options.shell || (process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'),
      args: options.args || (process.platform === 'win32' ? [] : ['--login', '-i']),
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: options.cwd || process.env.WORKSPACE_ROOT || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        ...options.env
      },
      ...options
    };
    
    try {
      const process = pty.spawn(config.shell, config.args, config);
      const pid = process.pid;
      
      // Store process information
      this.processes.set(pid, {
        process,
        config,
        startTime: Date.now(),
        lastActivity: Date.now(),
        status: 'running'
      });
      
      // Initialize resource tracking
      this.processStats.set(pid, {
        memoryUsageMB: 0,
        cpuUsagePercent: 0,
        memoryLimitMB: options.maxMemoryMB || this.options.maxMemoryMB,
        cpuLimitPercent: options.maxCpuPercent || this.options.maxCpuPercent,
        maxRuntimeMs: options.maxRuntimeMs || this.options.processTimeoutMs,
        resourceViolations: 0
      });
      
      // Set up process event handlers
      this.setupProcessHandlers(pid, process);
      
      // Start hang detection for this process
      this.startHangDetection(pid);
      
      this.stats.processesSpawned++;
      
      console.log(`📦 PTY process spawned: PID ${pid}`);
      this.emit('processSpawned', { pid, config });
      
      return {
        pid,
        process,
        options: config,
        isAlive: () => this.isProcessAlive(pid),
        write: (data) => this.writeToProcess(pid, data),
        resize: (cols, rows) => this.resizeProcess(pid, cols, rows),
        kill: (signal) => this.killProcess(pid, signal)
      };
      
    } catch (error) {
      console.error('Failed to spawn PTY process:', error);
      throw new Error(`Process spawn failed: ${error.message}`);
    }
  }
  
  /**
   * Set up event handlers for a process
   */
  setupProcessHandlers(pid, process) {
    // Data received from process
    process.on('data', (data) => {
      this.updateProcessActivity(pid);
      this.emit('processData', { pid, data });
    });
    
    // Process exited
    process.on('exit', (code, signal) => {
      console.log(`📦 PTY process ${pid} exited: code=${code}, signal=${signal}`);
      
      const processInfo = this.processes.get(pid);
      if (processInfo) {
        processInfo.status = 'exited';
        processInfo.exitCode = code;
        processInfo.exitSignal = signal;
        processInfo.endTime = Date.now();
      }
      
      this.cleanupProcess(pid);
      this.stats.processesTerminated++;
      
      this.emit('processExit', { pid, code, signal });
    });
    
    // Process error
    process.on('error', (error) => {
      console.error(`📦 PTY process ${pid} error:`, error);
      
      const processInfo = this.processes.get(pid);
      if (processInfo) {
        processInfo.status = 'error';
        processInfo.error = error;
      }
      
      this.emit('processError', { pid, error });
    });
  }
  
  /**
   * Write data to a process
   */
  writeToProcess(pid, data) {
    const processInfo = this.processes.get(pid);
    if (!processInfo || processInfo.status !== 'running') {
      throw new Error(`Process ${pid} not available for writing`);
    }
    
    try {
      processInfo.process.write(data);
      this.updateProcessActivity(pid);
      return true;
    } catch (error) {
      console.error(`Failed to write to process ${pid}:`, error);
      return false;
    }
  }
  
  /**
   * Resize a process terminal
   */
  resizeProcess(pid, cols, rows) {
    const processInfo = this.processes.get(pid);
    if (!processInfo || processInfo.status !== 'running') {
      throw new Error(`Process ${pid} not available for resizing`);
    }
    
    try {
      processInfo.process.resize(cols, rows);
      processInfo.config.cols = cols;
      processInfo.config.rows = rows;
      
      this.emit('processResize', { pid, cols, rows });
      return true;
    } catch (error) {
      console.error(`Failed to resize process ${pid}:`, error);
      return false;
    }
  }
  
  /**
   * Kill a process
   */
  killProcess(pid, signal = 'SIGTERM') {
    const processInfo = this.processes.get(pid);
    if (!processInfo) {
      return false;
    }
    
    try {
      processInfo.process.kill(signal);
      processInfo.status = 'killing';
      
      // Force kill after timeout if process doesn't exit gracefully
      setTimeout(() => {
        if (this.processes.has(pid)) {
          processInfo.process.kill('SIGKILL');
          this.stats.processesKilled++;
        }
      }, 5000);
      
      this.emit('processKill', { pid, signal });
      return true;
      
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a process is alive
   */
  isProcessAlive(pid) {
    const processInfo = this.processes.get(pid);
    return processInfo && processInfo.status === 'running';
  }
  
  /**
   * Get process by PID
   */
  getProcess(pid) {
    return this.processes.get(pid);
  }
  
  /**
   * Get active process count
   */
  getActiveProcessCount() {
    return Array.from(this.processes.values())
      .filter(p => p.status === 'running').length;
  }
  
  /**
   * Update process activity timestamp
   */
  updateProcessActivity(pid) {
    const processInfo = this.processes.get(pid);
    if (processInfo) {
      processInfo.lastActivity = Date.now();
    }
  }
  
  /**
   * Start hang detection for a process
   */
  startHangDetection(pid) {
    const detector = setInterval(() => {
      this.checkProcessHang(pid);
    }, 5000);
    
    this.hangDetectors.set(pid, detector);
  }
  
  /**
   * Check if a process is hanging
   */
  checkProcessHang(pid) {
    const processInfo = this.processes.get(pid);
    const stats = this.processStats.get(pid);
    
    if (!processInfo || !stats || processInfo.status !== 'running') {
      return;
    }
    
    const now = Date.now();
    const timeSinceActivity = now - processInfo.lastActivity;
    const timeSinceStart = now - processInfo.startTime;
    
    // Check for activity timeout
    if (timeSinceActivity > 60000) { // 1 minute of inactivity
      console.warn(`📦 Process ${pid} appears to be hanging (${timeSinceActivity}ms inactive)`);
      this.stats.hangsDetected++;
      
      this.emit('processHang', {
        type: 'process_hang',
        pid,
        lastActivity: processInfo.lastActivity,
        inactivityDuration: timeSinceActivity
      });
    }
    
    // Check for runtime timeout
    if (timeSinceStart > stats.maxRuntimeMs) {
      console.warn(`📦 Process ${pid} exceeded maximum runtime (${timeSinceStart}ms)`);
      this.killProcess(pid, 'SIGTERM');
    }
  }
  
  /**
   * Simulate process hang for testing
   */
  simulateProcessHang(pid) {
    const processInfo = this.processes.get(pid);
    if (processInfo) {
      processInfo.lastActivity = Date.now() - 120000; // 2 minutes ago
      this.checkProcessHang(pid);
    }
  }
  
  /**
   * Register hang callback
   */
  onProcessHang(callback) {
    this.on('processHang', callback);
  }
  
  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    if (this.resourceMonitor) return;
    
    this.resourceMonitor = setInterval(() => {
      this.monitorAllProcesses();
    }, this.options.resourceCheckInterval);
  }
  
  /**
   * Monitor resource usage for all processes
   */
  monitorAllProcesses() {
    for (const [pid, processInfo] of this.processes) {
      if (processInfo.status === 'running') {
        this.monitorResourceUsage(pid);
      }
    }
  }
  
  /**
   * Monitor resource usage for a specific process
   */
  async monitorResourceUsage(pid) {
    try {
      const usage = await this.getProcessResourceUsage(pid);
      const stats = this.processStats.get(pid);
      
      if (!stats) return;
      
      stats.memoryUsageMB = usage.memory;
      stats.cpuUsagePercent = usage.cpu;
      
      // Check for resource violations
      if (usage.memory > stats.memoryLimitMB) {
        stats.resourceViolations++;
        this.stats.resourceViolations++;
        
        console.warn(`📦 Process ${pid} memory violation: ${usage.memory}MB > ${stats.memoryLimitMB}MB`);
        this.emit('resourceViolation', { pid, type: 'memory', current: usage.memory, limit: stats.memoryLimitMB });
        
        // Kill process if memory usage is excessive
        if (usage.memory > stats.memoryLimitMB * 2) {
          console.error(`📦 Killing process ${pid} for excessive memory usage`);
          this.killProcess(pid, 'SIGKILL');
        }
      }
      
      if (usage.cpu > stats.cpuLimitPercent) {
        console.warn(`📦 Process ${pid} CPU violation: ${usage.cpu}% > ${stats.cpuLimitPercent}%`);
        this.emit('resourceViolation', { pid, type: 'cpu', current: usage.cpu, limit: stats.cpuLimitPercent });
      }
      
    } catch (error) {
      console.error(`Failed to monitor process ${pid}:`, error);
    }
  }
  
  /**
   * Get resource usage for a process
   */
  async getProcessResourceUsage(pid) {
    return new Promise((resolve, reject) => {
      try {
        // Use ps command to get process stats
        const { spawn } = require('child_process');
        const ps = spawn('ps', ['-p', pid, '-o', 'pid,pcpu,pmem,rss']);
        
        let output = '';
        ps.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ps.on('close', (code) => {
          if (code !== 0) {
            resolve({ memory: 0, cpu: 0 }); // Process might have exited
            return;
          }
          
          const lines = output.trim().split('\\n');
          if (lines.length < 2) {
            resolve({ memory: 0, cpu: 0 });
            return;
          }
          
          const stats = lines[1].trim().split(/\\s+/);
          const cpu = parseFloat(stats[1]) || 0;
          const memoryKB = parseInt(stats[3]) || 0;
          const memoryMB = Math.round(memoryKB / 1024);
          
          resolve({ memory: memoryMB, cpu });
        });
        
        ps.on('error', (error) => {
          resolve({ memory: 0, cpu: 0 });
        });
        
      } catch (error) {
        resolve({ memory: 0, cpu: 0 });
      }
    });
  }
  
  /**
   * Get resource statistics for a process
   */
  getResourceStats(pid) {
    return this.processStats.get(pid);
  }
  
  /**
   * Clean up process resources
   */
  cleanupProcess(pid) {
    // Remove from active processes
    this.processes.delete(pid);
    this.processStats.delete(pid);
    
    // Clean up hang detector
    const detector = this.hangDetectors.get(pid);
    if (detector) {
      clearInterval(detector);
      this.hangDetectors.delete(pid);
    }
    
    console.log(`📦 Cleaned up process ${pid}`);
  }
  
  /**
   * Get manager statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeProcesses: this.getActiveProcessCount(),
      totalProcesses: this.processes.size,
      averageProcessAge: this.getAverageProcessAge()
    };
  }
  
  /**
   * Get average process age
   */
  getAverageProcessAge() {
    const runningProcesses = Array.from(this.processes.values())
      .filter(p => p.status === 'running');
    
    if (runningProcesses.length === 0) return 0;
    
    const now = Date.now();
    const totalAge = runningProcesses.reduce((sum, p) => sum + (now - p.startTime), 0);
    
    return Math.round(totalAge / runningProcesses.length);
  }
  
  /**
   * Cleanup all resources
   */
  cleanup() {
    // Stop resource monitoring
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }
    
    // Kill all processes
    for (const [pid] of this.processes) {
      this.killProcess(pid, 'SIGTERM');
    }
    
    // Clean up hang detectors
    for (const [pid, detector] of this.hangDetectors) {
      clearInterval(detector);
    }
    
    this.processes.clear();
    this.processStats.clear();
    this.hangDetectors.clear();
    
    console.log('📦 PTY Process Manager cleaned up');
  }
}

module.exports = { PTYProcessManager };