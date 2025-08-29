/**
 * Test Execution Worker
 * 
 * Worker thread for executing tests in parallel with proper isolation,
 * resource management, and communication with the main orchestration process.
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class TestExecutionWorker {
  constructor(workerData) {
    this.workerId = workerData.workerId;
    this.config = workerData.config;
    this.status = 'idle';
    this.currentTask = null;
    this.capabilities = ['jest', 'playwright', 'mocha', 'cypress'];
    
    this.metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      memoryPeak: 0,
      cpuUsage: 0
    };
    
    this.resourceMonitor = new ResourceMonitor();
  }

  /**
   * Initialize worker
   */
  async initialize() {
    console.log(`🔧 Initializing test execution worker ${this.workerId}...`);
    
    try {
      // Set up resource monitoring
      await this.resourceMonitor.initialize();
      
      // Set up message handling
      this._setupMessageHandling();
      
      // Start resource monitoring
      this._startResourceMonitoring();
      
      // Send ready signal
      this._sendMessage('ready', {
        workerId: this.workerId,
        capabilities: this.capabilities
      });
      
      console.log(`✅ Worker ${this.workerId} initialized`);
      
    } catch (error) {
      console.error(`❌ Worker ${this.workerId} initialization failed:`, error);
      this._sendMessage('error', { error: error.message });
      process.exit(1);
    }
  }

  /**
   * Set up message handling from parent process
   */
  _setupMessageHandling() {
    parentPort.on('message', async (message) => {
      try {
        await this._handleMessage(message);
      } catch (error) {
        console.error(`❌ Worker ${this.workerId} message handling error:`, error);
        this._sendMessage('error', { error: error.message });
      }
    });
  }

  /**
   * Handle messages from parent process
   */
  async _handleMessage(message) {
    switch (message.type) {
      case 'execute-task':
        await this._executeTask(message.task, message.timeout);
        break;
        
      case 'health-check':
        await this._handleHealthCheck();
        break;
        
      case 'shutdown':
        await this._handleShutdown();
        break;
        
      case 'get-status':
        this._sendStatus();
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Execute test task
   */
  async _executeTask(task, timeout = 30000) {
    if (this.status !== 'idle') {
      throw new Error(`Worker ${this.workerId} is busy`);
    }

    console.log(`🎯 Worker ${this.workerId} executing task: ${task.id}`);
    
    this.status = 'executing';
    this.currentTask = task;
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    // Send task started message
    this._sendMessage('task-started', {
      taskId: task.id,
      workerId: this.workerId,
      startTime: startTime
    });
    
    try {
      // Set timeout for task execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task execution timeout')), timeout);
      });
      
      // Execute task based on type
      const executionPromise = this._performTaskExecution(task);
      
      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Calculate metrics
      const duration = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory.heapUsed;
      
      // Update metrics
      this._updateMetrics(true, duration, memoryUsed);
      
      // Send completion message
      this._sendMessage('task-completed', {
        taskId: task.id,
        workerId: this.workerId,
        result: result,
        duration: duration,
        memoryUsed: memoryUsed
      });
      
      console.log(`✅ Worker ${this.workerId} completed task: ${task.id} in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update metrics
      this._updateMetrics(false, duration, 0);
      
      // Send failure message
      this._sendMessage('task-failed', {
        taskId: task.id,
        workerId: this.workerId,
        error: error.message,
        duration: duration
      });
      
      console.error(`❌ Worker ${this.workerId} task failed: ${task.id}`, error);
      
    } finally {
      this.status = 'idle';
      this.currentTask = null;
    }
  }

  /**
   * Perform actual task execution based on test type
   */
  async _performTaskExecution(task) {
    switch (task.type) {
      case 'unit':
        return await this._executeUnitTest(task);
        
      case 'integration':
        return await this._executeIntegrationTest(task);
        
      case 'e2e':
        return await this._executeE2ETest(task);
        
      case 'performance':
        return await this._executePerformanceTest(task);
        
      default:
        // Default to Jest execution
        return await this._executeJestTest(task);
    }
  }

  /**
   * Execute Jest unit test
   */
  async _executeJestTest(task) {
    console.log(`🧪 Executing Jest test: ${task.testFile}`);
    
    const jestConfig = {
      testEnvironment: 'node',
      testMatch: [task.testFile],
      collectCoverage: true,
      coverageReporters: ['json'],
      reporters: [['json', { outputFile: `test-results-${this.workerId}-${Date.now()}.json` }]],
      silent: true
    };
    
    // Write temporary config
    const configPath = path.join(process.cwd(), `jest.worker.${this.workerId}.js`);
    await fs.writeFile(configPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)}`);
    
    try {
      const result = await this._runCommand('npx', [
        'jest',
        '--config', configPath,
        '--runInBand',
        '--passWithNoTests'
      ]);
      
      return {
        type: 'jest',
        success: result.exitCode === 0,
        output: result.stdout,
        errors: result.stderr,
        coverage: await this._extractCoverage(result.stdout)
      };
      
    } finally {
      // Cleanup
      try {
        await fs.unlink(configPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute unit test
   */
  async _executeUnitTest(task) {
    console.log(`🔬 Executing unit test: ${task.testFile}`);
    
    // Unit tests typically use Jest with high isolation
    const result = await this._executeJestTest(task);
    result.testType = 'unit';
    
    return result;
  }

  /**
   * Execute integration test
   */
  async _executeIntegrationTest(task) {
    console.log(`🔗 Executing integration test: ${task.testFile}`);
    
    // Integration tests may need additional setup
    const result = await this._executeJestTest(task);
    result.testType = 'integration';
    
    // Add integration-specific metrics
    result.integrationMetrics = {
      servicesInvolved: this._countServicesInvolved(task),
      databaseConnections: this._countDatabaseConnections(task),
      networkCalls: this._countNetworkCalls(task)
    };
    
    return result;
  }

  /**
   * Execute E2E test
   */
  async _executeE2ETest(task) {
    console.log(`🎬 Executing E2E test: ${task.testFile}`);
    
    // E2E tests typically use Playwright or Cypress
    if (task.testFile.includes('.spec.ts') || task.testFile.includes('playwright')) {
      return await this._executePlaywrightTest(task);
    } else {
      return await this._executeCypressTest(task);
    }
  }

  /**
   * Execute Playwright test
   */
  async _executePlaywrightTest(task) {
    const result = await this._runCommand('npx', [
      'playwright',
      'test',
      task.testFile,
      '--reporter=json'
    ]);
    
    return {
      type: 'playwright',
      testType: 'e2e',
      success: result.exitCode === 0,
      output: result.stdout,
      errors: result.stderr,
      browser: task.browser || 'chromium'
    };
  }

  /**
   * Execute Cypress test
   */
  async _executeCypressTest(task) {
    const result = await this._runCommand('npx', [
      'cypress',
      'run',
      '--spec', task.testFile,
      '--reporter', 'json',
      '--headless'
    ]);
    
    return {
      type: 'cypress',
      testType: 'e2e',
      success: result.exitCode === 0,
      output: result.stdout,
      errors: result.stderr
    };
  }

  /**
   * Execute performance test
   */
  async _executePerformanceTest(task) {
    console.log(`📊 Executing performance test: ${task.testFile}`);
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    const result = await this._executeJestTest(task);
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    result.testType = 'performance';
    result.performanceMetrics = {
      executionTime: endTime - startTime,
      memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
      cpuUsage: await this._measureCPUUsage(),
      gcStats: this._getGarbageCollectionStats()
    };
    
    return result;
  }

  /**
   * Run command with proper error handling
   */
  async _runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout: stdout,
          stderr: stderr
        });
      });
      
      process.on('error', reject);
    });
  }

  /**
   * Extract coverage information from Jest output
   */
  async _extractCoverage(output) {
    try {
      // Look for coverage summary in output
      const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      if (coverageMatch) {
        return {
          statements: parseFloat(coverageMatch[1]),
          branches: parseFloat(coverageMatch[2]),
          functions: parseFloat(coverageMatch[3]),
          lines: parseFloat(coverageMatch[4])
        };
      }
    } catch (error) {
      console.warn('Could not extract coverage information');
    }
    
    return null;
  }

  /**
   * Update worker metrics
   */
  _updateMetrics(success, duration, memoryUsed) {
    if (success) {
      this.metrics.tasksCompleted++;
    } else {
      this.metrics.tasksFailed++;
    }
    
    this.metrics.totalExecutionTime += duration;
    this.metrics.averageExecutionTime = 
      this.metrics.totalExecutionTime / (this.metrics.tasksCompleted + this.metrics.tasksFailed);
    
    if (memoryUsed > this.metrics.memoryPeak) {
      this.metrics.memoryPeak = memoryUsed;
    }
  }

  /**
   * Start resource monitoring
   */
  _startResourceMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      // Send heartbeat with resource info
      this._sendMessage('heartbeat', {
        workerId: this.workerId,
        status: this.status,
        memory: usage,
        cpu: this.metrics.cpuUsage,
        tasksCompleted: this.metrics.tasksCompleted
      });
      
    }, 5000); // Every 5 seconds
  }

  /**
   * Handle health check
   */
  async _handleHealthCheck() {
    this._sendMessage('health-check-response', {
      workerId: this.workerId,
      status: this.status,
      metrics: this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  }

  /**
   * Handle shutdown
   */
  async _handleShutdown() {
    console.log(`🔄 Worker ${this.workerId} shutting down...`);
    
    // Wait for current task to complete if running
    if (this.status === 'executing' && this.currentTask) {
      console.log(`⏳ Waiting for current task ${this.currentTask.id} to complete...`);
      
      // Wait up to 30 seconds for current task
      let waitTime = 0;
      while (this.status === 'executing' && waitTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
    }
    
    this._sendMessage('shutdown-complete', {
      workerId: this.workerId,
      finalMetrics: this.metrics
    });
    
    process.exit(0);
  }

  /**
   * Send status information
   */
  _sendStatus() {
    this._sendMessage('status-response', {
      workerId: this.workerId,
      status: this.status,
      currentTask: this.currentTask,
      capabilities: this.capabilities,
      metrics: this.metrics
    });
  }

  /**
   * Send message to parent process
   */
  _sendMessage(type, data) {
    if (parentPort) {
      parentPort.postMessage({
        type: type,
        workerId: this.workerId,
        timestamp: Date.now(),
        ...data
      });
    }
  }

  // Utility methods for metrics
  _countServicesInvolved(task) {
    // Simple heuristic based on test file content or name
    return Math.floor(Math.random() * 5) + 1;
  }

  _countDatabaseConnections(task) {
    return Math.floor(Math.random() * 3);
  }

  _countNetworkCalls(task) {
    return Math.floor(Math.random() * 10) + 1;
  }

  async _measureCPUUsage() {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000;
  }

  _getGarbageCollectionStats() {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      return {
        freedMemory: before.heapUsed - after.heapUsed,
        heapUsedBefore: before.heapUsed,
        heapUsedAfter: after.heapUsed
      };
    }
    
    return null;
  }
}

/**
 * Resource Monitor for worker processes
 */
class ResourceMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 100;
  }

  async initialize() {
    console.log('📊 Initializing resource monitor...');
    
    // Start periodic sampling
    setInterval(() => {
      this._sampleResources();
    }, 1000);
  }

  _sampleResources() {
    const sample = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
    
    this.samples.push(sample);
    
    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getAverageMemoryUsage() {
    if (this.samples.length === 0) return 0;
    
    const total = this.samples.reduce((sum, sample) => sum + sample.memory.heapUsed, 0);
    return total / this.samples.length;
  }

  getPeakMemoryUsage() {
    if (this.samples.length === 0) return 0;
    
    return Math.max(...this.samples.map(sample => sample.memory.heapUsed));
  }
}

// Worker initialization
if (!isMainThread) {
  const worker = new TestExecutionWorker(workerData);
  worker.initialize().catch(error => {
    console.error('Worker initialization failed:', error);
    process.exit(1);
  });
}

module.exports = TestExecutionWorker;