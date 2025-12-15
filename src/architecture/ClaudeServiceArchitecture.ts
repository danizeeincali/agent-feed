/**
 * SPARC ARCHITECTURE PHASE: ClaudeServiceManager System Design
 * 
 * PHASE 3: ARCHITECTURE COMPLETE
 * 
 * System architecture for production-ready Feed integration with:
 * 1. Global state vs Interactive control separation
 * 2. Component relationships and data flow
 * 3. /prod directory working path integration
 * 4. Error handling and failover patterns
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * SPARC ARCHITECTURE: System Component Relationships
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    FEED APPLICATION                         │
 * └─────────────────────┬───────────────────────────────────────┘
 *                       │ Job Submission API
 *                       ▼
 * ┌─────────────────────────────────────────────────────────────┐
 * │              ClaudeServiceManager                           │
 * │  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
 * │  │  Job Queue      │ │  Worker Pool    │ │  Health Monitor│ │
 * │  │  Management     │ │  Management     │ │  & Failover    │ │
 * │  └─────────────────┘ └─────────────────┘ └────────────────┘ │
 * └─────────────┬───────────────────┬───────────────────────────┘
 *               │                   │
 *               ▼                   ▼
 * ┌─────────────────────┐ ┌─────────────────────────────────────┐
 * │   Worker Instance   │ │       SafeClaudeInstanceManager     │
 * │   (Always-on)       │ │       (Interactive WebSocket)       │
 * │   /prod/workers/    │ │       /workspaces/agent-feed        │
 * └─────────────────────┘ └─────────────────────────────────────┘
 *           │                              │
 *           ▼                              ▼
 * ┌─────────────────────┐ ┌─────────────────────────────────────┐
 * │    Claude CLI       │ │         Claude CLI                  │
 * │    (Feed Jobs)      │ │         (User Interactive)          │
 * │    /prod directory  │ │         Current directory           │
 * └─────────────────────┘ └─────────────────────────────────────┘
 */

/**
 * SPARC ARCHITECTURE: Process spawning and management
 */
export class WorkerProcessManager {
  /**
   * ARCHITECTURE: Spawn Claude process with strict /prod directory enforcement
   */
  static async spawnClaudeProcess(
    workerId: string, 
    command: string[], 
    workingDirectory: string
  ): Promise<ChildProcess> {
    // CRITICAL VALIDATION: Ensure working directory is within /prod
    if (!workingDirectory.includes('/prod')) {
      throw new Error(`CRITICAL ARCHITECTURE VIOLATION: Working directory must be within /prod structure. Got: ${workingDirectory}`);
    }

    // Ensure working directory exists
    await fs.mkdir(workingDirectory, { recursive: true });
    
    // Spawn Claude process with enforced environment
    const process = spawn(command[0], command.slice(1), {
      cwd: workingDirectory,
      env: {
        ...process.env,
        CLAUDE_WORKING_DIR: workingDirectory,
        CLAUDE_INSTANCE_ID: workerId,
        CLAUDE_MODE: 'service',
        NODE_ENV: 'production'
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false // Ensure proper cleanup
    });

    if (!process.pid) {
      throw new Error(`Failed to spawn Claude process for worker ${workerId}`);
    }

    return process;
  }

  /**
   * ARCHITECTURE: Setup bidirectional communication with Claude process
   */
  static setupProcessCommunication(
    worker: any, 
    process: ChildProcess,
    logger: any,
    onOutput: (data: string) => void,
    onError: (error: string) => void
  ): void {
    // stdout handling - Claude responses and tool outputs
    process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      onOutput(output);
      worker.health.lastHeartbeat = new Date();
    });

    // stderr handling - errors and warnings
    process.stderr?.on('data', (data: Buffer) => {
      const error = data.toString();
      onError(error);
      worker.health.failureCount++;
    });

    // Process lifecycle events
    process.on('exit', (code, signal) => {
      logger.warn(`Worker ${worker.id} process exited: code=${code}, signal=${signal}`);
      worker.status = code === 0 ? 'offline' : 'error';
    });

    process.on('error', (error) => {
      logger.error(`Worker ${worker.id} process error:`, error);
      worker.status = 'error';
      worker.health.failureCount++;
    });
  }

  /**
   * ARCHITECTURE: Job execution pipeline with monitoring
   */
  static async executeJobOnProcess(
    job: any,
    worker: any,
    process: ChildProcess,
    logger: any
  ): Promise<{ output: string; artifacts?: string[]; metadata?: Record<string, any> }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let outputBuffer = '';
      let errorBuffer = '';
      
      // Setup temporary output handlers
      const outputHandler = (data: Buffer) => {
        outputBuffer += data.toString();
      };
      
      const errorHandler = (data: Buffer) => {
        errorBuffer += data.toString();
      };
      
      process.stdout?.on('data', outputHandler);
      process.stderr?.on('data', errorHandler);
      
      // Send job command to Claude
      const jobCommand = job.payload.command || `Execute task: ${job.type}`;
      process.stdin?.write(jobCommand + '\n');
      
      // Setup completion detection (simplified - would need more sophisticated parsing)
      const completionCheck = setInterval(() => {
        // Look for completion indicators in output
        if (outputBuffer.includes('Task completed') || 
            outputBuffer.includes('Command finished') ||
            Date.now() - startTime > 30000) { // 30s timeout for demo
          
          clearInterval(completionCheck);
          
          // Cleanup handlers
          process.stdout?.removeListener('data', outputHandler);
          process.stderr?.removeListener('data', errorHandler);
          
          // Update worker metrics
          const duration = Date.now() - startTime;
          worker.health.responseTime = duration;
          worker.health.lastHeartbeat = new Date();
          
          if (errorBuffer.trim()) {
            reject(new Error(`Job execution failed: ${errorBuffer}`));
          } else {
            resolve({
              output: outputBuffer,
              metadata: {
                duration,
                workerId: worker.id,
                workingDirectory: worker.workingDirectory
              }
            });
          }
        }
      }, 1000);
    });
  }
}

/**
 * SPARC ARCHITECTURE: Data flow patterns
 */
export interface DataFlowPattern {
  // Feed → ClaudeServiceManager → Worker Instance → Claude CLI
  feedToWorker: {
    entry: 'submitFeedJob()',
    routing: 'selectWorkerForJob()',
    execution: 'processJob()',
    monitoring: 'getJobStatus()'
  };
  
  // Worker Health → Service Manager → Feed Status API
  healthToApi: {
    collection: 'performHealthChecks()',
    aggregation: 'getServiceStatus()',
    reporting: 'API endpoint /api/v1/service/status'
  };
  
  // Error handling and failover
  errorHandling: {
    detection: 'Health monitoring + timeout detection',
    classification: 'isRecoverableError()',
    recovery: 'handleWorkerFailure() + redistributeWorkerJobs()',
    escalation: 'emit service:critical_error'
  };
}

/**
 * SPARC ARCHITECTURE: Integration contracts
 */
export interface FeedServiceContract {
  // API endpoints for Feed integration
  endpoints: {
    submitJob: 'POST /api/v1/service/jobs',
    getJobStatus: 'GET /api/v1/service/jobs/{id}',
    getServiceHealth: 'GET /api/v1/service/status',
    getWorkerMetrics: 'GET /api/v1/service/workers'
  };
  
  // Event subscriptions for real-time updates
  events: {
    'job:completed': '(jobId, result) => Feed updates',
    'job:failed': '(jobId, error) => Feed notification',
    'worker:failover': '(workerId) => Feed resilience',
    'service:critical_error': '(error) => Feed emergency handling'
  };
  
  // Separation from interactive WebSocket control
  boundaries: {
    scope: 'ClaudeServiceManager manages always-on workers, SafeClaudeInstanceManager handles interactive sessions',
    directory: 'Service workers run in /prod, interactive sessions run in current directory',
    communication: 'Service uses stdio/pipes, interactive uses WebSocket',
    lifecycle: 'Service workers are persistent, interactive sessions are ephemeral'
  };
}

/**
 * SPARC ARCHITECTURE: Production deployment patterns
 */
export interface ProductionArchitecture {
  // File system layout
  fileSystem: {
    serviceRoot: '/workspaces/agent-feed/prod',
    workerDirs: '/workspaces/agent-feed/prod/workers/{workerId}',
    serviceLogs: '/workspaces/agent-feed/prod/logs/service-manager.log',
    workerLogs: '/workspaces/agent-feed/prod/workers/{workerId}/logs/',
    tempFiles: '/workspaces/agent-feed/prod/workers/{workerId}/temp/'
  };
  
  // Process management
  processes: {
    serviceManager: 'Single long-running Node.js process',
    workerInstances: 'Multiple Claude CLI processes (2-8 instances)',
    monitoring: 'Health check timer every 30 seconds',
    lifecycle: 'Auto-restart failed workers, graceful shutdown'
  };
  
  // Resource management
  resources: {
    memory: 'Per-worker memory monitoring and limits',
    cpu: 'Load balancing across available workers',
    disk: 'Automatic cleanup of temporary files',
    network: 'Connection pooling and rate limiting'
  };
  
  // Security and isolation
  security: {
    directoryIsolation: 'Each worker confined to its /prod subdirectory',
    processIsolation: 'Workers run as separate processes',
    resourceLimits: 'Memory and CPU limits enforced',
    networkAccess: 'Controlled access to external resources'
  };
}

/**
 * SPARC ARCHITECTURE SUMMARY:
 * 
 * ✅ COMPLETED PHASE 3: ARCHITECTURE
 * - System design with clear component relationships
 * - Data flow patterns from Feed to Claude workers
 * - /prod directory working path integration architecture
 * - Error handling and failover patterns defined
 * - Production deployment architecture specified
 * - Integration contracts with existing SafeClaudeInstanceManager
 * 
 * 🔄 NEXT PHASE 4: REFINEMENT
 * - Implement concrete process management
 * - Add comprehensive error handling
 * - Optimize performance (caching, connection pooling)
 * - Add production monitoring and observability
 */