/**
 * Parallel Test Execution Engine
 * 
 * Handles concurrent test execution with load balancing, resource management,
 * and intelligent task distribution across agent swarms.
 */

const cluster = require('cluster');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { Worker } = require('worker_threads');

class ParallelExecutionEngine extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.workerPool = new Map();
    this.taskQueue = [];
    this.activeJobs = new Map();
    this.results = new Map();
    this.metrics = {
      startTime: null,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeWorkers: 0,
      throughput: 0
    };
    
    this.maxWorkers = config.maxWorkers || os.cpus().length;
    this.taskDistributor = new TaskDistributor(config);
    this.loadBalancer = new LoadBalancer(config);
    this.resourceManager = new ResourceManager(config);
  }

  /**
   * Initialize parallel execution environment
   */
  async initialize() {
    console.log('🔧 Initializing parallel execution engine...');
    
    try {
      // Initialize worker pool
      await this._initializeWorkerPool();
      
      // Set up load balancing
      await this.loadBalancer.initialize();
      
      // Initialize resource monitoring
      await this.resourceManager.initialize();
      
      // Set up task distribution
      await this.taskDistributor.initialize();
      
      console.log(`✅ Parallel execution engine ready with ${this.maxWorkers} workers`);
      this.emit('ready');
      
    } catch (error) {
      console.error('❌ Failed to initialize parallel execution:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute test suites in parallel with optimal distribution
   */
  async executeParallel(testSuites, agents) {
    console.log('⚡ Starting parallel test execution...');
    this.metrics.startTime = Date.now();
    
    try {
      // Create execution plan
      const executionPlan = await this._createExecutionPlan(testSuites, agents);
      
      // Distribute tasks across workers
      const distributedTasks = await this.taskDistributor.distributeTasks(executionPlan);
      
      // Execute with load balancing and monitoring
      const results = await this._executeWithLoadBalancing(distributedTasks);
      
      // Aggregate results
      const aggregatedResults = await this._aggregateParallelResults(results);
      
      console.log(`✅ Parallel execution completed in ${(Date.now() - this.metrics.startTime)/1000}s`);
      return aggregatedResults;
      
    } catch (error) {
      console.error('❌ Parallel execution failed:', error);
      throw error;
    }
  }

  /**
   * Initialize worker pool for parallel execution
   */
  async _initializeWorkerPool() {
    console.log(`🏭 Creating worker pool with ${this.maxWorkers} workers...`);
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = await this._createWorker(i);
      this.workerPool.set(i, worker);
    }
    
    this.metrics.activeWorkers = this.workerPool.size;
  }

  /**
   * Create individual worker with proper configuration
   */
  async _createWorker(workerId) {
    const workerScript = path.join(__dirname, 'workers', 'test-execution-worker.js');
    
    const worker = {
      id: workerId,
      thread: new Worker(workerScript, {
        workerData: {
          workerId,
          config: this.config
        }
      }),
      status: 'idle',
      currentTask: null,
      capabilities: ['jest', 'playwright', 'mocha', 'cypress'],
      performance: {
        tasksCompleted: 0,
        averageTime: 0,
        successRate: 1.0,
        lastActive: Date.now()
      },
      queue: []
    };

    // Set up worker event handlers
    this._setupWorkerHandlers(worker);
    
    return worker;
  }

  /**
   * Set up event handlers for worker communication
   */
  _setupWorkerHandlers(worker) {
    worker.thread.on('message', (message) => {
      this._handleWorkerMessage(worker, message);
    });

    worker.thread.on('error', (error) => {
      console.error(`❌ Worker ${worker.id} error:`, error);
      this._handleWorkerError(worker, error);
    });

    worker.thread.on('exit', (code) => {
      if (code !== 0) {
        console.warn(`⚠️ Worker ${worker.id} exited with code ${code}`);
        this._handleWorkerExit(worker, code);
      }
    });
  }

  /**
   * Handle messages from workers
   */
  _handleWorkerMessage(worker, message) {
    switch (message.type) {
      case 'task-started':
        worker.status = 'executing';
        worker.currentTask = message.task;
        this._updateWorkerMetrics(worker, 'started', message);
        break;
        
      case 'task-completed':
        worker.status = 'idle';
        worker.currentTask = null;
        worker.performance.tasksCompleted++;
        this._updateWorkerMetrics(worker, 'completed', message);
        this._handleTaskCompletion(worker, message);
        break;
        
      case 'task-failed':
        worker.status = 'idle';
        worker.currentTask = null;
        this._updateWorkerMetrics(worker, 'failed', message);
        this._handleTaskFailure(worker, message);
        break;
        
      case 'heartbeat':
        worker.performance.lastActive = Date.now();
        break;
        
      default:
        console.warn(`Unknown message type from worker ${worker.id}:`, message.type);
    }
  }

  /**
   * Create execution plan with optimal task distribution
   */
  async _createExecutionPlan(testSuites, agents) {
    const plan = {
      phases: [],
      totalTasks: 0,
      estimatedTime: 0,
      resourceRequirements: {}
    };

    for (const suite of testSuites) {
      const suiteConfig = this.config.testSuites[suite];
      const testFiles = await this._discoverTestFiles(suiteConfig.testPatterns);
      
      // Analyze test complexity and requirements
      const analysis = await this._analyzeTests(testFiles);
      
      // Create tasks with proper metadata
      const tasks = testFiles.map((testFile, index) => ({
        id: `${suite}-${index}`,
        suite: suite,
        testFile: testFile,
        type: this._determineTestType(testFile),
        complexity: analysis.complexity[testFile] || 'medium',
        estimatedTime: analysis.estimatedTimes[testFile] || 5000,
        dependencies: analysis.dependencies[testFile] || [],
        resources: analysis.resources[testFile] || { memory: '512M', cpu: '1' },
        agents: suiteConfig.agents || []
      }));

      plan.phases.push({
        suite: suite,
        tasks: tasks,
        parallelism: suiteConfig.parallelism || 4,
        priority: suiteConfig.priority || 'medium',
        timeout: suiteConfig.timeout || 300000
      });

      plan.totalTasks += tasks.length;
      plan.estimatedTime += Math.max(...tasks.map(t => t.estimatedTime));
    }

    return plan;
  }

  /**
   * Execute with load balancing and resource management
   */
  async _executeWithLoadBalancing(distributedTasks) {
    console.log(`🎯 Executing ${distributedTasks.totalTasks} tasks across ${this.maxWorkers} workers...`);
    
    const results = [];
    const activePromises = new Map();
    let taskIndex = 0;
    const allTasks = distributedTasks.phases.flatMap(phase => phase.tasks);

    // Start initial batch of tasks
    while (taskIndex < allTasks.length && activePromises.size < this.maxWorkers) {
      const task = allTasks[taskIndex];
      const worker = await this.loadBalancer.selectOptimalWorker(task, this.workerPool);
      
      if (worker) {
        const promise = this._executeTaskOnWorker(worker, task);
        activePromises.set(taskIndex, promise);
        taskIndex++;
      } else {
        // No workers available, wait briefly
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Process remaining tasks as workers become available
    while (activePromises.size > 0) {
      // Wait for any task to complete
      const completedResults = await Promise.allSettled(activePromises.values());
      
      // Process completed tasks
      for (const [index, promise] of activePromises.entries()) {
        try {
          const result = await Promise.race([promise]);
          results.push(result);
          activePromises.delete(index);
          
          // Start next task if available
          if (taskIndex < allTasks.length) {
            const nextTask = allTasks[taskIndex];
            const worker = await this.loadBalancer.selectOptimalWorker(nextTask, this.workerPool);
            
            if (worker) {
              const nextPromise = this._executeTaskOnWorker(worker, nextTask);
              activePromises.set(taskIndex, nextPromise);
              taskIndex++;
            }
          }
          
          break; // Only process one completed task per iteration
          
        } catch (error) {
          // Handle individual task failure
          console.warn(`⚠️ Task failed:`, error.message);
          activePromises.delete(index);
          
          results.push({
            success: false,
            error: error.message,
            taskId: error.taskId || 'unknown'
          });
        }
      }
      
      // Update throughput metrics
      this._updateThroughputMetrics();
    }

    return results;
  }

  /**
   * Execute individual task on assigned worker
   */
  async _executeTaskOnWorker(worker, task) {
    return new Promise((resolve, reject) => {
      const timeout = task.timeout || 30000;
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
      }, timeout);

      // Track task execution
      const startTime = Date.now();
      this.activeJobs.set(task.id, {
        worker: worker,
        task: task,
        startTime: startTime,
        timeoutId: timeoutId
      });

      // Send task to worker
      worker.thread.postMessage({
        type: 'execute-task',
        task: task,
        timeout: timeout
      });

      // Set up completion handler
      const completionHandler = (message) => {
        if (message.taskId === task.id) {
          clearTimeout(timeoutId);
          this.activeJobs.delete(task.id);
          worker.thread.off('message', completionHandler);
          
          const duration = Date.now() - startTime;
          
          if (message.type === 'task-completed') {
            resolve({
              success: true,
              taskId: task.id,
              result: message.result,
              duration: duration,
              worker: worker.id
            });
          } else if (message.type === 'task-failed') {
            reject(new Error(`Task ${task.id} failed: ${message.error}`));
          }
        }
      };

      worker.thread.on('message', completionHandler);
    });
  }

  /**
   * Aggregate results from parallel execution
   */
  async _aggregateParallelResults(results) {
    console.log('📊 Aggregating parallel execution results...');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const aggregated = {
      summary: {
        total: results.length,
        passed: successful.length,
        failed: failed.length,
        successRate: successful.length / results.length,
        totalDuration: Date.now() - this.metrics.startTime,
        averageTaskTime: successful.reduce((sum, r) => sum + (r.duration || 0), 0) / successful.length || 0,
        throughput: results.length / ((Date.now() - this.metrics.startTime) / 1000),
        parallelismEfficiency: this._calculateParallelismEfficiency(results)
      },
      results: results,
      workers: {
        utilization: this._calculateWorkerUtilization(),
        performance: this._getWorkerPerformanceMetrics()
      },
      bottlenecks: this._identifyExecutionBottlenecks(),
      recommendations: this._generateOptimizationRecommendations(results)
    };
    
    return aggregated;
  }

  /**
   * Discover test files based on patterns
   */
  async _discoverTestFiles(patterns) {
    const glob = require('glob');
    const testFiles = [];
    
    for (const pattern of patterns) {
      const files = await new Promise((resolve, reject) => {
        glob(pattern, { cwd: process.cwd() }, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      testFiles.push(...files);
    }
    
    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Analyze tests to determine complexity and requirements
   */
  async _analyzeTests(testFiles) {
    const fs = require('fs').promises;
    const analysis = {
      complexity: {},
      estimatedTimes: {},
      dependencies: {},
      resources: {}
    };

    for (const testFile of testFiles) {
      try {
        const content = await fs.readFile(testFile, 'utf8');
        
        // Simple heuristic analysis
        const lineCount = content.split('\n').length;
        const testCount = (content.match(/it\(|test\(|describe\(/g) || []).length;
        const asyncCount = (content.match(/async|await|Promise/g) || []).length;
        
        // Determine complexity
        let complexity = 'simple';
        if (lineCount > 200 || testCount > 10 || asyncCount > 5) {
          complexity = 'medium';
        }
        if (lineCount > 500 || testCount > 20 || asyncCount > 15) {
          complexity = 'complex';
        }
        
        analysis.complexity[testFile] = complexity;
        analysis.estimatedTimes[testFile] = this._estimateTestTime(complexity, testCount);
        analysis.resources[testFile] = this._estimateResources(complexity);
        
      } catch (error) {
        console.warn(`⚠️ Could not analyze ${testFile}:`, error.message);
        analysis.complexity[testFile] = 'medium';
        analysis.estimatedTimes[testFile] = 5000;
        analysis.resources[testFile] = { memory: '512M', cpu: '1' };
      }
    }

    return analysis;
  }

  /**
   * Determine test type based on file path and content
   */
  _determineTestType(testFile) {
    if (testFile.includes('e2e') || testFile.includes('playwright')) {
      return 'e2e';
    } else if (testFile.includes('integration')) {
      return 'integration';
    } else if (testFile.includes('unit')) {
      return 'unit';
    } else if (testFile.includes('performance')) {
      return 'performance';
    } else {
      return 'unit'; // default
    }
  }

  /**
   * Estimate test execution time based on complexity
   */
  _estimateTestTime(complexity, testCount) {
    const baseTime = {
      simple: 1000,
      medium: 3000,
      complex: 8000
    };
    
    return (baseTime[complexity] || 3000) + (testCount * 500);
  }

  /**
   * Estimate resource requirements
   */
  _estimateResources(complexity) {
    const resources = {
      simple: { memory: '256M', cpu: '0.5' },
      medium: { memory: '512M', cpu: '1' },
      complex: { memory: '1G', cpu: '2' }
    };
    
    return resources[complexity] || resources.medium;
  }

  /**
   * Calculate parallelism efficiency
   */
  _calculateParallelismEfficiency(results) {
    const totalTime = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    const parallelTime = Date.now() - this.metrics.startTime;
    const sequentialTime = totalTime;
    
    return sequentialTime / (parallelTime * this.maxWorkers);
  }

  /**
   * Calculate worker utilization rates
   */
  _calculateWorkerUtilization() {
    const utilization = {};
    
    for (const [workerId, worker] of this.workerPool) {
      const activeTime = worker.performance.tasksCompleted * worker.performance.averageTime;
      const totalTime = Date.now() - this.metrics.startTime;
      utilization[workerId] = activeTime / totalTime;
    }
    
    return utilization;
  }

  /**
   * Get worker performance metrics
   */
  _getWorkerPerformanceMetrics() {
    const metrics = {};
    
    for (const [workerId, worker] of this.workerPool) {
      metrics[workerId] = {
        tasksCompleted: worker.performance.tasksCompleted,
        averageTime: worker.performance.averageTime,
        successRate: worker.performance.successRate,
        status: worker.status
      };
    }
    
    return metrics;
  }

  /**
   * Identify execution bottlenecks
   */
  _identifyExecutionBottlenecks() {
    const bottlenecks = [];
    
    // Check worker utilization imbalance
    const utilizations = this._calculateWorkerUtilization();
    const avgUtilization = Object.values(utilizations).reduce((a, b) => a + b, 0) / Object.keys(utilizations).length;
    
    for (const [workerId, utilization] of Object.entries(utilizations)) {
      if (utilization < avgUtilization * 0.5) {
        bottlenecks.push({
          type: 'underutilized-worker',
          workerId: workerId,
          utilization: utilization,
          impact: 'medium'
        });
      }
    }
    
    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  _generateOptimizationRecommendations(results) {
    const recommendations = [];
    
    const efficiency = this._calculateParallelismEfficiency(results);
    if (efficiency < 0.7) {
      recommendations.push({
        type: 'parallelism',
        message: 'Consider reducing parallelism or optimizing task distribution',
        impact: 'high'
      });
    }
    
    const failureRate = results.filter(r => !r.success).length / results.length;
    if (failureRate > 0.1) {
      recommendations.push({
        type: 'reliability',
        message: 'High failure rate detected - investigate test stability',
        impact: 'high'
      });
    }
    
    return recommendations;
  }

  /**
   * Update throughput metrics
   */
  _updateThroughputMetrics() {
    const elapsed = (Date.now() - this.metrics.startTime) / 1000;
    this.metrics.throughput = this.metrics.completedTasks / elapsed;
  }

  /**
   * Update worker metrics based on activity
   */
  _updateWorkerMetrics(worker, event, message) {
    switch (event) {
      case 'completed':
        const duration = message.duration || 0;
        worker.performance.averageTime = 
          (worker.performance.averageTime + duration) / 2;
        break;
        
      case 'failed':
        worker.performance.successRate = 
          (worker.performance.successRate * worker.performance.tasksCompleted) / 
          (worker.performance.tasksCompleted + 1);
        break;
    }
  }

  /**
   * Handle task completion
   */
  _handleTaskCompletion(worker, message) {
    this.metrics.completedTasks++;
    this.emit('task-completed', {
      worker: worker.id,
      task: message.task,
      result: message.result
    });
  }

  /**
   * Handle task failure
   */
  _handleTaskFailure(worker, message) {
    this.metrics.failedTasks++;
    this.emit('task-failed', {
      worker: worker.id,
      task: message.task,
      error: message.error
    });
  }

  /**
   * Handle worker errors
   */
  _handleWorkerError(worker, error) {
    console.error(`Worker ${worker.id} encountered error:`, error);
    // Implement worker recovery logic
    this._restartWorker(worker);
  }

  /**
   * Handle worker exit
   */
  _handleWorkerExit(worker, code) {
    console.warn(`Worker ${worker.id} exited with code ${code}`);
    // Implement worker replacement logic
    this._replaceWorker(worker);
  }

  /**
   * Restart worker after error
   */
  async _restartWorker(worker) {
    try {
      await worker.thread.terminate();
      const newWorker = await this._createWorker(worker.id);
      this.workerPool.set(worker.id, newWorker);
    } catch (error) {
      console.error(`Failed to restart worker ${worker.id}:`, error);
    }
  }

  /**
   * Replace exited worker
   */
  async _replaceWorker(worker) {
    try {
      const newWorker = await this._createWorker(worker.id);
      this.workerPool.set(worker.id, newWorker);
    } catch (error) {
      console.error(`Failed to replace worker ${worker.id}:`, error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up parallel execution resources...');
    
    // Terminate all workers
    for (const worker of this.workerPool.values()) {
      await worker.thread.terminate();
    }
    
    this.workerPool.clear();
    this.activeJobs.clear();
    
    console.log('✅ Parallel execution cleanup completed');
  }
}

/**
 * Task Distribution Manager
 */
class TaskDistributor {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    console.log('📋 Initializing task distributor...');
  }

  async distributeTasks(executionPlan) {
    console.log('🎯 Distributing tasks optimally...');
    
    // Implement intelligent task distribution
    return executionPlan;
  }
}

/**
 * Load Balancer for Worker Selection
 */
class LoadBalancer {
  constructor(config) {
    this.config = config;
    this.strategy = config.loadBalancingStrategy || 'round-robin';
    this.lastWorkerIndex = 0;
  }

  async initialize() {
    console.log('⚖️ Initializing load balancer...');
  }

  async selectOptimalWorker(task, workerPool) {
    switch (this.strategy) {
      case 'round-robin':
        return this._roundRobinSelection(workerPool);
      
      case 'capability-based':
        return this._capabilityBasedSelection(task, workerPool);
      
      case 'performance-based':
        return this._performanceBasedSelection(workerPool);
      
      default:
        return this._roundRobinSelection(workerPool);
    }
  }

  _roundRobinSelection(workerPool) {
    const workers = Array.from(workerPool.values());
    const availableWorkers = workers.filter(w => w.status === 'idle');
    
    if (availableWorkers.length === 0) return null;
    
    const selectedWorker = availableWorkers[this.lastWorkerIndex % availableWorkers.length];
    this.lastWorkerIndex++;
    
    return selectedWorker;
  }

  _capabilityBasedSelection(task, workerPool) {
    const workers = Array.from(workerPool.values());
    const availableWorkers = workers.filter(w => 
      w.status === 'idle' && 
      w.capabilities.includes(task.type)
    );
    
    return availableWorkers[0] || null;
  }

  _performanceBasedSelection(workerPool) {
    const workers = Array.from(workerPool.values());
    const availableWorkers = workers.filter(w => w.status === 'idle');
    
    if (availableWorkers.length === 0) return null;
    
    // Select worker with best performance metrics
    return availableWorkers.reduce((best, worker) => 
      worker.performance.successRate > best.performance.successRate ? worker : best
    );
  }
}

/**
 * Resource Manager for System Resources
 */
class ResourceManager {
  constructor(config) {
    this.config = config;
    this.resourceUsage = {
      memory: 0,
      cpu: 0,
      network: 0
    };
  }

  async initialize() {
    console.log('💾 Initializing resource manager...');
    
    // Start resource monitoring
    setInterval(() => {
      this._monitorResources();
    }, 1000);
  }

  _monitorResources() {
    const memUsage = process.memoryUsage();
    this.resourceUsage.memory = memUsage.heapUsed / memUsage.heapTotal;
    
    // Could add more detailed resource monitoring here
  }

  checkResourceAvailability(task) {
    // Check if system has enough resources for task
    return this.resourceUsage.memory < 0.9; // 90% memory threshold
  }
}

module.exports = {
  ParallelExecutionEngine,
  TaskDistributor,
  LoadBalancer,
  ResourceManager
};