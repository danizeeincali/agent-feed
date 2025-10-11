/**
 * ClaudeServiceManager - SPARC Global Service Architecture
 * 
 * PHASE 1: SPECIFICATION COMPLETE
 * 
 * Global state management for always-on Claude worker instances that enables:
 * 1. Feed job submission to designated worker instances
 * 2. Production-first architecture with /prod directory enforcement
 * 3. API-based monitoring separate from WebSocket interactive control
 * 4. Worker instance designation, selection and failover logic
 * 
 * CRITICAL REQUIREMENT: All Claude operations MUST run in /prod directory
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import winston from 'winston';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';

// SPARC SPECIFICATION: Core interfaces and types
export interface WorkerInstance {
  id: string;
  name: string;
  type: 'designated' | 'backup' | 'overflow';
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'offline';
  workingDirectory: string; // MUST be /prod-based
  capabilities: string[];
  load: {
    current: number;
    capacity: number;
    queuedJobs: number;
  };
  health: {
    lastHeartbeat: Date;
    responseTime: number;
    failureCount: number;
    uptime: number;
  };
  processInfo: {
    pid?: number;
    startTime: Date;
    restartCount: number;
  };
}

export interface FeedJobRequest {
  id: string;
  type: 'post_generation' | 'content_analysis' | 'user_interaction' | 'system_task';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  payload: {
    command?: string;
    context?: Record<string, any>;
    requirements?: string[];
    timeout?: number;
  };
  routing: {
    preferredWorker?: string;
    capabilities?: string[];
    excludeWorkers?: string[];
  };
  metadata: {
    submissionTime: Date;
    requester: string;
    retryCount: number;
  };
}

export interface FeedJobResponse {
  jobId: string;
  workerId: string;
  status: 'accepted' | 'running' | 'completed' | 'failed' | 'timeout';
  result?: {
    output: string;
    artifacts?: string[];
    metadata?: Record<string, any>;
  };
  error?: {
    message: string;
    code: string;
    recoverable: boolean;
  };
  timing: {
    accepted: Date;
    started?: Date;
    completed?: Date;
    duration?: number;
  };
}

export interface ServiceConfiguration {
  prodDirectory: string; // MUST be /workspaces/agent-feed/prod or subdirectory
  minWorkers: number;
  maxWorkers: number;
  workerTimeout: number;
  healthCheckInterval: number;
  failoverThreshold: number;
  jobQueueLimit: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

/**
 * SPARC SPECIFICATION: ClaudeServiceManager Class
 * 
 * Global service that manages always-on Claude worker instances for Feed integration.
 * Provides API-based job submission and monitoring, separate from interactive WebSocket control.
 */
export class ClaudeServiceManager extends EventEmitter {
  private workers: Map<string, WorkerInstance> = new Map();
  private jobQueue: Map<string, FeedJobRequest> = new Map();
  private activeJobs: Map<string, FeedJobResponse> = new Map();
  private logger: winston.Logger;
  private config: ServiceConfiguration;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  // SPARC SPECIFICATION: Service state tracking
  private serviceMetrics = {
    totalJobsProcessed: 0,
    totalJobsFailed: 0,
    averageJobDuration: 0,
    peakWorkerCount: 0,
    lastFailover: null as Date | null,
    uptime: Date.now()
  };

  /**
   * Initialize service manager with environment-aware configuration
   * prodDirectory resolves from: config > WORKSPACE_ROOT/prod > cwd/prod
   */
  constructor(config: Partial<ServiceConfiguration> = {}) {
    super();

    // CRITICAL: Enforce /prod directory requirement with environment awareness
    const defaultProdDirectory = process.env.WORKSPACE_ROOT
      ? path.join(process.env.WORKSPACE_ROOT, 'prod')
      : path.join(process.cwd(), 'prod');

    const defaultConfig: ServiceConfiguration = {
      prodDirectory: defaultProdDirectory,
      minWorkers: 2,
      maxWorkers: 8,
      workerTimeout: 300000, // 5 minutes
      healthCheckInterval: 30000, // 30 seconds
      failoverThreshold: 3,
      jobQueueLimit: 100,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      }
    };

    this.config = { ...defaultConfig, ...config };

    // Validate prod directory requirement
    if (!this.config.prodDirectory.includes('/prod')) {
      throw new Error('CRITICAL: workingDirectory must be within /prod directory structure');
    }

    this.setupLogger();
    this.startHealthCheckMonitoring();
  }

  /**
   * SPARC SPECIFICATION: Initialize service with designated workers
   */
  async initialize(): Promise<void> {
    this.logger.info('🚀 SPARC: Initializing ClaudeServiceManager');
    
    try {
      // Start minimum worker pool
      for (let i = 0; i < this.config.minWorkers; i++) {
        const workerId = await this.createWorkerInstance(i === 0 ? 'designated' : 'backup');
        this.logger.info(`✅ SPARC: Created worker ${workerId}`);
      }

      this.emit('service:initialized', {
        workerCount: this.workers.size,
        prodDirectory: this.config.prodDirectory
      });

      this.logger.info(`✅ SPARC: ClaudeServiceManager initialized with ${this.workers.size} workers`);
    } catch (error) {
      this.logger.error('❌ SPARC: Failed to initialize ClaudeServiceManager:', error);
      throw error;
    }
  }

  /**
   * SPARC SPECIFICATION: Submit job to Feed for processing
   * Core method for Feed integration - routes jobs to appropriate worker instances
   */
  async submitFeedJob(job: Omit<FeedJobRequest, 'id' | 'metadata'>): Promise<string> {
    const jobId = uuidv4();
    const feedJob: FeedJobRequest = {
      id: jobId,
      ...job,
      metadata: {
        submissionTime: new Date(),
        requester: 'Feed',
        retryCount: 0
      }
    };

    // Validate job queue capacity
    if (this.jobQueue.size >= this.config.jobQueueLimit) {
      throw new Error('Job queue at capacity - rejecting new jobs');
    }

    // Select appropriate worker based on routing rules
    const selectedWorker = await this.selectWorkerForJob(feedJob);
    if (!selectedWorker) {
      throw new Error('No available workers for job processing');
    }

    this.jobQueue.set(jobId, feedJob);
    this.logger.info(`📋 SPARC: Job ${jobId} queued for worker ${selectedWorker.id}`);

    // Process job asynchronously
    this.processJob(feedJob, selectedWorker).catch(error => {
      this.logger.error(`❌ SPARC: Job ${jobId} processing failed:`, error);
      this.emit('job:failed', { jobId, error: error.message });
    });

    return jobId;
  }

  /**
   * SPARC SPECIFICATION: Get real-time service status for monitoring
   * API endpoint data for dashboards and external monitoring
   */
  getServiceStatus(): {
    workers: WorkerInstance[];
    queue: { pending: number; active: number };
    metrics: typeof this.serviceMetrics;
    health: 'healthy' | 'degraded' | 'critical';
  } {
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'ready' || w.status === 'busy');
    const healthyWorkers = activeWorkers.filter(w => 
      Date.now() - w.health.lastHeartbeat.getTime() < this.config.healthCheckInterval * 2
    );

    let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (healthyWorkers.length === 0) {
      health = 'critical';
    } else if (healthyWorkers.length < this.config.minWorkers) {
      health = 'degraded';
    }

    return {
      workers: Array.from(this.workers.values()),
      queue: {
        pending: this.jobQueue.size,
        active: this.activeJobs.size
      },
      metrics: { ...this.serviceMetrics },
      health
    };
  }

  /**
   * SPARC SPECIFICATION: Get job status for Feed monitoring
   */
  getJobStatus(jobId: string): FeedJobResponse | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * SPARC SPECIFICATION: Designate a worker as primary for specific job types
   * Enables Feed to have consistent worker assignment for related tasks
   */
  async designateWorker(workerId: string, capabilities: string[]): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    worker.type = 'designated';
    worker.capabilities = [...new Set([...worker.capabilities, ...capabilities])];
    
    this.logger.info(`🎯 SPARC: Worker ${workerId} designated with capabilities: ${capabilities.join(', ')}`);
    this.emit('worker:designated', { workerId, capabilities });
  }

  /**
   * SPARC SPECIFICATION: Private implementation methods
   */

  /**
   * Setup logger with dynamic path resolution
   * Uses resolved prodDirectory from constructor
   */
  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(this.config.prodDirectory, 'logs/service-manager.log')
        }),
        new winston.transports.Console({
          format: winston.format.simple(),
          level: 'debug'
        })
      ]
    });
  }

  private async createWorkerInstance(type: 'designated' | 'backup' | 'overflow'): Promise<string> {
    const workerId = `worker-${uuidv4().slice(0, 8)}`;
    
    // CRITICAL: All workers MUST use /prod directory
    const workingDirectory = path.join(this.config.prodDirectory, 'workers', workerId);
    
    const worker: WorkerInstance = {
      id: workerId,
      name: `Claude Worker ${workerId.slice(-8)}`,
      type,
      status: 'initializing',
      workingDirectory,
      capabilities: ['general', 'feed_integration'],
      load: {
        current: 0,
        capacity: 10, // jobs
        queuedJobs: 0
      },
      health: {
        lastHeartbeat: new Date(),
        responseTime: 0,
        failureCount: 0,
        uptime: 0
      },
      processInfo: {
        startTime: new Date(),
        restartCount: 0
      }
    };

    this.workers.set(workerId, worker);
    
    // Initialize worker process (implementation in PSEUDOCODE phase)
    await this.initializeWorkerProcess(worker);
    
    return workerId;
  }

  /**
   * SPARC PSEUDOCODE: Initialize worker process with /prod directory enforcement
   * 
   * ALGORITHM:
   * 1. Create worker-specific directory in /prod/workers/{workerId}
   * 2. Spawn Claude process with enforced working directory
   * 3. Establish health monitoring and communication channels
   * 4. Validate worker capabilities and readiness
   */
  private async initializeWorkerProcess(worker: WorkerInstance): Promise<void> {
    try {
      // STEP 1: Ensure worker directory exists in /prod
      const workerDir = worker.workingDirectory;
      await this.ensureDirectory(workerDir);
      await this.ensureDirectory(path.join(workerDir, 'logs'));
      await this.ensureDirectory(path.join(workerDir, 'temp'));

      // STEP 2: Spawn Claude process with /prod enforcement
      const claudeCommand = ['claude', 'chat', '--working-directory', workerDir];
      const process = await this.spawnClaudeProcess(worker.id, claudeCommand, workerDir);
      
      // STEP 3: Setup communication and monitoring
      await this.setupWorkerCommunication(worker, process);
      
      // STEP 4: Validate worker readiness
      const isReady = await this.validateWorkerReadiness(worker);
      if (!isReady) {
        throw new Error(`Worker ${worker.id} failed readiness validation`);
      }

      worker.status = 'ready';
      worker.health.lastHeartbeat = new Date();
      
      this.emit('worker:ready', { workerId: worker.id, workingDirectory: workerDir });
      this.logger.info(`✅ SPARC PSEUDOCODE: Worker ${worker.id} initialized successfully`);
      
    } catch (error) {
      worker.status = 'error';
      worker.health.failureCount++;
      this.logger.error(`❌ SPARC PSEUDOCODE: Worker ${worker.id} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * SPARC PSEUDOCODE: Smart worker selection algorithm for Feed jobs
   * 
   * ALGORITHM: Multi-criteria decision making
   * 1. Filter workers by availability and capabilities
   * 2. Apply preferred worker routing if specified
   * 3. Score workers by load, health, and job affinity
   * 4. Select highest-scoring worker with failover logic
   */
  private async selectWorkerForJob(job: FeedJobRequest): Promise<WorkerInstance | null> {
    // STEP 1: Filter available workers
    const availableWorkers = Array.from(this.workers.values()).filter(worker => {
      // Basic availability checks
      if (worker.status !== 'ready' || worker.load.current >= worker.load.capacity) {
        return false;
      }
      
      // Health checks
      const timeSinceHeartbeat = Date.now() - worker.health.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > this.config.healthCheckInterval * 2) {
        return false;
      }
      
      // Capability matching
      if (job.routing.capabilities) {
        const hasRequiredCapabilities = job.routing.capabilities.every(cap => 
          worker.capabilities.includes(cap)
        );
        if (!hasRequiredCapabilities) {
          return false;
        }
      }
      
      // Exclusion rules
      if (job.routing.excludeWorkers?.includes(worker.id)) {
        return false;
      }
      
      return true;
    });

    if (availableWorkers.length === 0) {
      this.logger.warn(`⚠️ SPARC PSEUDOCODE: No available workers for job ${job.id}`);
      return null;
    }

    // STEP 2: Apply preferred worker routing
    if (job.routing.preferredWorker) {
      const preferredWorker = availableWorkers.find(w => w.id === job.routing.preferredWorker);
      if (preferredWorker) {
        this.logger.info(`🎯 SPARC PSEUDOCODE: Using preferred worker ${preferredWorker.id} for job ${job.id}`);
        return preferredWorker;
      }
    }

    // STEP 3: Score workers by multiple criteria
    const scoredWorkers = availableWorkers.map(worker => {
      let score = 0;
      
      // Priority bonus for designated workers
      if (worker.type === 'designated') score += 100;
      else if (worker.type === 'backup') score += 50;
      
      // Load balancing (lower load = higher score)
      const loadRatio = worker.load.current / worker.load.capacity;
      score += (1 - loadRatio) * 50;
      
      // Health score (better health = higher score)
      const healthScore = Math.max(0, 100 - worker.health.failureCount * 10);
      score += healthScore * 0.3;
      
      // Response time score (faster = higher score)
      const responseScore = Math.max(0, 100 - (worker.health.responseTime / 100));
      score += responseScore * 0.2;
      
      // Job type affinity (if worker has handled similar jobs)
      if (worker.capabilities.includes(job.type)) {
        score += 25;
      }
      
      return { worker, score };
    });

    // STEP 4: Select highest-scoring worker
    scoredWorkers.sort((a, b) => b.score - a.score);
    const selectedWorker = scoredWorkers[0].worker;
    
    this.logger.info(`🎯 SPARC PSEUDOCODE: Selected worker ${selectedWorker.id} (score: ${scoredWorkers[0].score.toFixed(1)}) for job ${job.id}`);
    return selectedWorker;
  }

  /**
   * SPARC PSEUDOCODE: Feed job processing pipeline
   * 
   * ALGORITHM: Robust job execution with monitoring and error handling
   * 1. Validate job and worker readiness
   * 2. Reserve worker capacity and update load
   * 3. Execute job with timeout and progress monitoring
   * 4. Handle results, errors, and cleanup
   * 5. Update metrics and emit events
   */
  private async processJob(job: FeedJobRequest, worker: WorkerInstance): Promise<void> {
    const jobResponse: FeedJobResponse = {
      jobId: job.id,
      workerId: worker.id,
      status: 'accepted',
      timing: {
        accepted: new Date()
      }
    };

    try {
      // STEP 1: Reserve worker capacity
      worker.load.current++;
      worker.load.queuedJobs++;
      worker.status = 'busy';
      this.activeJobs.set(job.id, jobResponse);
      
      this.logger.info(`🔄 SPARC PSEUDOCODE: Processing job ${job.id} on worker ${worker.id}`);
      
      // STEP 2: Execute job with timeout protection
      jobResponse.status = 'running';
      jobResponse.timing.started = new Date();
      
      const jobTimeout = job.payload.timeout || this.config.workerTimeout;
      const jobPromise = this.executeJobOnWorker(job, worker);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), jobTimeout);
      });
      
      // STEP 3: Race between job execution and timeout
      const result = await Promise.race([jobPromise, timeoutPromise]);
      
      // STEP 4: Handle successful completion
      jobResponse.status = 'completed';
      jobResponse.timing.completed = new Date();
      jobResponse.timing.duration = jobResponse.timing.completed.getTime() - jobResponse.timing.started!.getTime();
      jobResponse.result = result;
      
      // STEP 5: Update metrics and emit success
      this.serviceMetrics.totalJobsProcessed++;
      this.updateAverageJobDuration(jobResponse.timing.duration);
      
      this.emit('job:completed', { jobId: job.id, workerId: worker.id, result });
      this.logger.info(`✅ SPARC PSEUDOCODE: Job ${job.id} completed successfully in ${jobResponse.timing.duration}ms`);
      
    } catch (error) {
      // STEP 6: Handle job failure
      jobResponse.status = 'failed';
      jobResponse.timing.completed = new Date();
      jobResponse.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && error.name ? error.name : 'UNKNOWN_ERROR',
        recoverable: this.isRecoverableError(error)
      };
      
      worker.health.failureCount++;
      this.serviceMetrics.totalJobsFailed++;
      
      // STEP 7: Retry logic for recoverable errors
      if (jobResponse.error.recoverable && job.metadata.retryCount < this.config.retryPolicy.maxRetries) {
        this.logger.warn(`🔄 SPARC PSEUDOCODE: Retrying job ${job.id} (attempt ${job.metadata.retryCount + 1})`);
        
        setTimeout(() => {
          job.metadata.retryCount++;
          this.processJob(job, worker).catch(retryError => {
            this.logger.error(`❌ SPARC PSEUDOCODE: Job ${job.id} retry failed:`, retryError);
          });
        }, this.config.retryPolicy.initialDelay * Math.pow(this.config.retryPolicy.backoffMultiplier, job.metadata.retryCount));
      } else {
        this.emit('job:failed', { jobId: job.id, workerId: worker.id, error: jobResponse.error });
        this.logger.error(`❌ SPARC PSEUDOCODE: Job ${job.id} failed permanently:`, error);
      }
      
    } finally {
      // STEP 8: Cleanup worker state
      worker.load.current = Math.max(0, worker.load.current - 1);
      worker.load.queuedJobs = Math.max(0, worker.load.queuedJobs - 1);
      
      if (worker.load.current === 0) {
        worker.status = 'ready';
      }
      
      this.jobQueue.delete(job.id);
      worker.health.lastHeartbeat = new Date();
    }
  }

  private startHealthCheckMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * SPARC PSEUDOCODE: Health monitoring and failover logic
   * 
   * ALGORITHM: Proactive health management
   * 1. Check all worker heartbeats and response times
   * 2. Detect unhealthy workers and trigger failover
   * 3. Auto-scale worker pool based on load
   * 4. Perform cleanup and recovery operations
   */
  private performHealthChecks(): void {
    const now = new Date();
    const unhealthyWorkers: string[] = [];
    
    // STEP 1: Check worker health status
    for (const [workerId, worker] of this.workers) {
      const timeSinceHeartbeat = now.getTime() - worker.health.lastHeartbeat.getTime();
      
      // Detect stale workers
      if (timeSinceHeartbeat > this.config.healthCheckInterval * 3) {
        unhealthyWorkers.push(workerId);
        worker.health.failureCount++;
        this.logger.warn(`⚠️ SPARC PSEUDOCODE: Worker ${workerId} missed heartbeat (${timeSinceHeartbeat}ms ago)`);
      }
      
      // Check failure threshold
      if (worker.health.failureCount >= this.config.failoverThreshold) {
        this.logger.error(`❌ SPARC PSEUDOCODE: Worker ${workerId} exceeded failure threshold, marking for replacement`);
        unhealthyWorkers.push(workerId);
      }
      
      // Update uptime
      worker.health.uptime = now.getTime() - worker.processInfo.startTime.getTime();
    }
    
    // STEP 2: Handle unhealthy workers
    for (const workerId of unhealthyWorkers) {
      this.handleWorkerFailure(workerId).catch(error => {
        this.logger.error(`❌ SPARC PSEUDOCODE: Failed to handle worker ${workerId} failure:`, error);
      });
    }
    
    // STEP 3: Auto-scaling logic
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'ready' || w.status === 'busy');
    const totalLoad = activeWorkers.reduce((sum, w) => sum + w.load.current, 0);
    const averageLoad = activeWorkers.length > 0 ? totalLoad / activeWorkers.length : 0;
    
    // Scale up if high load
    if (averageLoad > 0.8 && this.workers.size < this.config.maxWorkers) {
      this.createWorkerInstance('overflow').catch(error => {
        this.logger.error('❌ SPARC PSEUDOCODE: Failed to scale up workers:', error);
      });
    }
    
    // Scale down if low load
    if (averageLoad < 0.3 && this.workers.size > this.config.minWorkers) {
      const overflowWorkers = activeWorkers.filter(w => w.type === 'overflow' && w.load.current === 0);
      if (overflowWorkers.length > 0) {
        this.shutdownWorker(overflowWorkers[0].id).catch(error => {
          this.logger.error('❌ SPARC PSEUDOCODE: Failed to scale down workers:', error);
        });
      }
    }
  }

  /**
   * SPARC PSEUDOCODE: Worker failure handling and replacement
   */
  private async handleWorkerFailure(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    this.logger.warn(`🔧 SPARC PSEUDOCODE: Handling failure for worker ${workerId}`);
    
    try {
      // Mark worker as offline
      worker.status = 'offline';
      
      // Redistribute any queued jobs from this worker
      const reassignedJobs = await this.redistributeWorkerJobs(workerId);
      
      // If this was a designated worker, create replacement
      if (worker.type === 'designated') {
        const replacementId = await this.createWorkerInstance('designated');
        await this.designateWorker(replacementId, worker.capabilities);
        this.logger.info(`🔄 SPARC PSEUDOCODE: Replaced designated worker ${workerId} with ${replacementId}`);
      }
      
      // Remove failed worker
      await this.shutdownWorker(workerId);
      
      this.serviceMetrics.lastFailover = new Date();
      this.emit('worker:failover', { 
        failedWorkerId: workerId, 
        reassignedJobs: reassignedJobs.length 
      });
      
    } catch (error) {
      this.logger.error(`❌ SPARC PSEUDOCODE: Critical failure handling worker ${workerId}:`, error);
      this.emit('service:critical_error', { workerId, error: error.message });
    }
  }

  /**
   * SPARC REFINEMENT: Production-ready utility implementations
   */

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.access(dirPath, fs.constants.W_OK); // Verify write access
    } catch (error) {
      this.logger.error(`❌ SPARC REFINEMENT: Failed to ensure directory ${dirPath}:`, error);
      throw new Error(`Directory creation failed: ${dirPath}`);
    }
  }

  private async spawnClaudeProcess(workerId: string, command: string[], workingDir: string): Promise<ChildProcess> {
    const { WorkerProcessManager } = await import('../architecture/ClaudeServiceArchitecture');
    return WorkerProcessManager.spawnClaudeProcess(workerId, command, workingDir);
  }

  private async setupWorkerCommunication(worker: WorkerInstance, process: ChildProcess): Promise<void> {
    const { WorkerProcessManager } = await import('../architecture/ClaudeServiceArchitecture');
    
    const onOutput = (data: string) => {
      // Store worker process reference
      (worker as any).process = process;
      worker.health.lastHeartbeat = new Date();
      
      // Emit output for any listening clients
      this.emit('worker:output', { workerId: worker.id, output: data });
    };
    
    const onError = (error: string) => {
      worker.health.failureCount++;
      this.logger.error(`❌ SPARC REFINEMENT: Worker ${worker.id} error:`, error);
      this.emit('worker:error', { workerId: worker.id, error });
    };
    
    WorkerProcessManager.setupProcessCommunication(
      worker, 
      process, 
      this.logger,
      onOutput,
      onError
    );
    
    // Store process reference for job execution
    (worker as any).process = process;
  }

  private async validateWorkerReadiness(worker: WorkerInstance): Promise<boolean> {
    const process = (worker as any).process as ChildProcess;
    if (!process || !process.pid) {
      return false;
    }

    try {
      // Send a simple ping command to validate responsiveness
      const pingPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000); // 5 second timeout
        
        const pingHandler = (data: Buffer) => {
          const output = data.toString();
          if (output.includes('Claude') || output.includes('>') || output.includes('$')) {
            clearTimeout(timeout);
            process.stdout?.removeListener('data', pingHandler);
            resolve(true);
          }
        };
        
        process.stdout?.on('data', pingHandler);
        process.stdin?.write('echo "Claude readiness check"\n');
      });
      
      const isReady = await pingPromise;
      if (isReady) {
        worker.capabilities = ['general', 'feed_integration', 'validated'];
      }
      
      return isReady;
    } catch (error) {
      this.logger.error(`❌ SPARC REFINEMENT: Worker ${worker.id} readiness validation failed:`, error);
      return false;
    }
  }

  private async executeJobOnWorker(job: FeedJobRequest, worker: WorkerInstance): Promise<any> {
    const process = (worker as any).process as ChildProcess;
    if (!process) {
      throw new Error(`No process available for worker ${worker.id}`);
    }

    const { WorkerProcessManager } = await import('../architecture/ClaudeServiceArchitecture');
    return WorkerProcessManager.executeJobOnProcess(job, worker, process, this.logger);
  }

  private isRecoverableError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Classify errors as recoverable or not
    const recoverablePatterns = [
      'timeout',
      'connection',
      'temporary',
      'rate limit',
      'network',
      'busy'
    ];
    
    const nonRecoverablePatterns = [
      'permission denied',
      'command not found',
      'syntax error',
      'authentication failed',
      'invalid configuration'
    ];
    
    const lowerMessage = errorMessage.toLowerCase();
    
    // Check for non-recoverable patterns first
    if (nonRecoverablePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return false;
    }
    
    // Check for recoverable patterns
    if (recoverablePatterns.some(pattern => lowerMessage.includes(pattern))) {
      return true;
    }
    
    // Default to non-recoverable for unknown errors
    return false;
  }

  private async redistributeWorkerJobs(failedWorkerId: string): Promise<FeedJobRequest[]> {
    const redistributedJobs: FeedJobRequest[] = [];
    
    // Find jobs assigned to the failed worker
    for (const [jobId, jobResponse] of this.activeJobs) {
      if (jobResponse.workerId === failedWorkerId && jobResponse.status === 'running') {
        // Find the original job request
        const originalJob = this.jobQueue.get(jobId);
        if (originalJob) {
          // Reset job for reassignment
          originalJob.metadata.retryCount++;
          originalJob.routing.excludeWorkers = [
            ...(originalJob.routing.excludeWorkers || []),
            failedWorkerId
          ];
          
          // Try to find alternative worker
          const alternativeWorker = await this.selectWorkerForJob(originalJob);
          if (alternativeWorker) {
            this.logger.info(`🔄 SPARC REFINEMENT: Redistributing job ${jobId} from ${failedWorkerId} to ${alternativeWorker.id}`);
            
            // Remove old job response and process with new worker
            this.activeJobs.delete(jobId);
            this.processJob(originalJob, alternativeWorker).catch(error => {
              this.logger.error(`❌ SPARC REFINEMENT: Job ${jobId} redistribution failed:`, error);
            });
            
            redistributedJobs.push(originalJob);
          } else {
            // No alternative worker available - mark job as failed
            jobResponse.status = 'failed';
            jobResponse.error = {
              message: 'No alternative worker available after failure',
              code: 'NO_WORKER_AVAILABLE',
              recoverable: true
            };
            
            this.emit('job:failed', { jobId, workerId: failedWorkerId, error: jobResponse.error });
          }
        }
      }
    }
    
    return redistributedJobs;
  }

  private updateAverageJobDuration(duration: number): void {
    const total = this.serviceMetrics.totalJobsProcessed;
    this.serviceMetrics.averageJobDuration = 
      (this.serviceMetrics.averageJobDuration * (total - 1) + duration) / total;
  }

  /**
   * SPARC SPECIFICATION: Clean shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.info('🔄 SPARC: Shutting down ClaudeServiceManager');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Wait for active jobs to complete or timeout
    const shutdownPromises = Array.from(this.workers.keys()).map(workerId => 
      this.shutdownWorker(workerId)
    );

    await Promise.all(shutdownPromises);
    this.emit('service:shutdown');
    this.logger.info('✅ SPARC: ClaudeServiceManager shutdown complete');
  }

  private async shutdownWorker(workerId: string): Promise<void> {
    // PLACEHOLDER: Implementation in SPARC Completion phase
    this.workers.delete(workerId);
  }
}

/**
 * SPARC SPECIFICATION SUMMARY:
 * 
 * ✅ COMPLETED PHASE 1: SPECIFICATION
 * - Defined ClaudeServiceManager interface and responsibilities
 * - Specified /prod directory integration requirements  
 * - Defined worker instance designation and failover logic
 * - Planned API-based monitoring vs WebSocket interactive control separation
 * - Core Feed integration job submission flow specified
 * 
 * 🔄 NEXT PHASE 2: PSEUDOCODE
 * - Design worker instance selection algorithms
 * - Plan job processing pipeline
 * - Design health monitoring and failover mechanisms
 * - Plan production deployment patterns
 */