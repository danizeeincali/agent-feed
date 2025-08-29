"use strict";
/**
 * NLD Process Health Monitor
 * Real-time monitoring for Claude process spawning, lifecycle management, and failure pattern detection
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.nldProcessMonitor = exports.NLDProcessHealthMonitor = exports.ProcessFailurePattern = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const fs = __importStar(require("fs"));
const perf_hooks_1 = require("perf_hooks");
// Pattern Classifications
var ProcessFailurePattern;
(function (ProcessFailurePattern) {
    ProcessFailurePattern["PROCESS_SPAWN_FAILURE_V1"] = "PROCESS_SPAWN_FAILURE_V1";
    ProcessFailurePattern["PROCESS_LIFECYCLE_DESYNC_V1"] = "PROCESS_LIFECYCLE_DESYNC_V1";
    ProcessFailurePattern["IO_PIPE_COMMUNICATION_BREAK_V1"] = "IO_PIPE_COMMUNICATION_BREAK_V1";
    ProcessFailurePattern["PROCESS_RESOURCE_LEAK_V1"] = "PROCESS_RESOURCE_LEAK_V1";
    ProcessFailurePattern["MULTI_PROCESS_RACE_CONDITION_V1"] = "MULTI_PROCESS_RACE_CONDITION_V1";
})(ProcessFailurePattern || (exports.ProcessFailurePattern = ProcessFailurePattern = {}));
class NLDProcessHealthMonitor extends events_1.EventEmitter {
    processMap = new Map();
    healthCheckInterval = null;
    alertHistory = [];
    isMonitoring = false;
    constructor() {
        super();
        this.startHealthMonitoring();
    }
    /**
     * Deploy Process Health Monitoring
     */
    startHealthMonitoring() {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 5000); // Check every 5 seconds
        this.emit('monitoring:started', {
            timestamp: Date.now(),
            message: 'NLD Process Health Monitoring deployed'
        });
    }
    /**
     * Real-time process health checker
     */
    performHealthCheck() {
        this.processMap.forEach((processInfo, instanceId) => {
            this.checkProcessLifecycle(instanceId, processInfo);
            this.checkIOCommunication(instanceId, processInfo);
            this.checkResourceLeaks(instanceId, processInfo);
            // Update last health check
            processInfo.lastHealthCheck = Date.now();
        });
    }
    /**
     * Check if process actually exists in system
     */
    checkProcessLifecycle(instanceId, processInfo) {
        if (!processInfo.pid || processInfo.status === 'stopped')
            return;
        try {
            // Check if process exists using kill(0) - doesn't actually kill
            process.kill(processInfo.pid, 0);
            // If we reach here, process exists
            if (processInfo.status !== 'running') {
                // Process exists but status is wrong - lifecycle desync
                this.nldAlert(ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1, {
                    instanceId,
                    expectedStatus: processInfo.status,
                    actualStatus: 'running',
                    pid: processInfo.pid
                });
                processInfo.status = 'running';
            }
        }
        catch (error) {
            // Process doesn't exist
            if (processInfo.status === 'running') {
                this.nldAlert(ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1, {
                    instanceId,
                    expectedStatus: 'running',
                    actualStatus: 'stopped',
                    pid: processInfo.pid,
                    error: error.message
                });
                processInfo.status = 'zombie';
            }
        }
    }
    /**
     * Monitor I/O communication health
     */
    checkIOCommunication(instanceId, processInfo) {
        const now = Date.now();
        const ioSilenceThreshold = 30000; // 30 seconds
        if (processInfo.status === 'running' &&
            processInfo.ioStats.lastIoTime > 0 &&
            (now - processInfo.ioStats.lastIoTime) > ioSilenceThreshold) {
            this.nldAlert(ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1, {
                instanceId,
                silenceDuration: now - processInfo.ioStats.lastIoTime,
                lastIoTime: processInfo.ioStats.lastIoTime,
                pid: processInfo.pid
            });
        }
    }
    /**
     * Detect resource leaks
     */
    checkResourceLeaks(instanceId, processInfo) {
        // Check file descriptor count (simplified check)
        if (processInfo.resourceStats.fileDescriptors > 100) {
            this.nldAlert(ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1, {
                instanceId,
                fileDescriptorCount: processInfo.resourceStats.fileDescriptors,
                pid: processInfo.pid,
                severity: 'high'
            });
        }
    }
    /**
     * Register a new process for monitoring
     */
    registerProcess(instanceId, process) {
        const metrics = {
            pid: process.pid || null,
            status: 'spawning',
            spawnTime: Date.now(),
            lastHealthCheck: Date.now(),
            ioStats: {
                stdoutBytes: 0,
                stderrBytes: 0,
                stdinWrites: 0,
                lastIoTime: 0
            },
            resourceStats: {
                fileDescriptors: 0,
                memoryUsage: process.memoryUsage?.() || { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }
            },
            errors: []
        };
        // Monitor process events
        this.attachProcessMonitoring(instanceId, process, metrics);
        this.processMap.set(instanceId, metrics);
        return metrics;
    }
    /**
     * Attach real-time monitoring to process
     */
    attachProcessMonitoring(instanceId, process, metrics) {
        // Monitor stdout
        process.stdout?.on('data', (data) => {
            metrics.ioStats.stdoutBytes += data.length;
            metrics.ioStats.lastIoTime = Date.now();
            this.emit('io:stdout', {
                instanceId,
                data: data.toString(),
                size: data.length,
                timestamp: Date.now()
            });
        });
        // Monitor stderr
        process.stderr?.on('data', (data) => {
            metrics.ioStats.stderrBytes += data.length;
            metrics.ioStats.lastIoTime = Date.now();
            this.emit('io:stderr', {
                instanceId,
                data: data.toString(),
                size: data.length,
                timestamp: Date.now()
            });
        });
        // Monitor process exit
        process.on('exit', (code, signal) => {
            metrics.status = 'stopped';
            this.emit('process:exit', {
                instanceId,
                code,
                signal,
                pid: metrics.pid,
                uptime: Date.now() - metrics.spawnTime
            });
            // Remove from monitoring after delay
            setTimeout(() => {
                this.unregisterProcess(instanceId);
            }, 30000);
        });
        // Monitor process errors
        process.on('error', (error) => {
            metrics.status = 'error';
            const processError = {
                pattern: ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1,
                timestamp: Date.now(),
                details: {
                    message: error.message,
                    code: error.code,
                    errno: error.errno
                },
                resolved: false
            };
            metrics.errors.push(processError);
            this.nldAlert(ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1, {
                instanceId,
                error: error.message,
                pid: metrics.pid
            });
        });
        // Mark as running once we've attached monitoring
        setTimeout(() => {
            if (metrics.pid && metrics.status === 'spawning') {
                metrics.status = 'running';
                this.emit('process:ready', {
                    instanceId,
                    pid: metrics.pid,
                    spawnTime: Date.now() - metrics.spawnTime
                });
            }
        }, 2000);
    }
    /**
     * Enhanced process spawning with failure detection
     */
    async spawnClaudeWithFallback(instanceId, command, args, options) {
        const startTime = perf_hooks_1.performance.now();
        return new Promise((resolve, reject) => {
            try {
                // Pre-spawn validation
                this.validateSpawnPrerequisites(command, options.cwd);
                const process = (0, child_process_1.spawn)(command, args, options);
                const metrics = this.registerProcess(instanceId, process);
                // Success path
                const onReady = () => {
                    const spawnDuration = perf_hooks_1.performance.now() - startTime;
                    this.emit('spawn:success', {
                        instanceId,
                        pid: process.pid,
                        duration: spawnDuration,
                        command,
                        args
                    });
                    resolve(process);
                };
                // Error path
                const onError = (error) => {
                    this.nldAlert(ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1, {
                        instanceId,
                        command,
                        args,
                        error: error.message,
                        options,
                        duration: perf_hooks_1.performance.now() - startTime
                    });
                    // Attempt fallback strategies
                    this.handleSpawnFailure(instanceId, command, args, options, resolve, reject);
                };
                process.on('error', onError);
                // Wait for process to be ready
                this.once('process:ready', (data) => {
                    if (data.instanceId === instanceId) {
                        onReady();
                    }
                });
                // Timeout check
                setTimeout(() => {
                    if (metrics.status === 'spawning') {
                        onError(new Error('Process spawn timeout'));
                    }
                }, 10000);
            }
            catch (error) {
                this.nldAlert(ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1, {
                    instanceId,
                    command,
                    args,
                    error: error.message,
                    phase: 'pre-spawn'
                });
                reject(error);
            }
        });
    }
    /**
     * Validate prerequisites for spawning
     */
    validateSpawnPrerequisites(command, workingDirectory) {
        // Check if working directory exists
        if (!fs.existsSync(workingDirectory)) {
            throw new Error(`Working directory does not exist: ${workingDirectory}`);
        }
        // Check if working directory is accessible
        try {
            fs.accessSync(workingDirectory, fs.constants.R_OK | fs.constants.W_OK);
        }
        catch (error) {
            throw new Error(`Working directory not accessible: ${workingDirectory}`);
        }
    }
    /**
     * Handle spawn failure with fallback strategies
     */
    handleSpawnFailure(instanceId, command, args, options, resolve, reject) {
        // Strategy 1: Try with shell
        if (!options.shell) {
            setTimeout(() => {
                try {
                    const fallbackProcess = (0, child_process_1.spawn)(command, args, { ...options, shell: true });
                    this.registerProcess(instanceId + '_fallback', fallbackProcess);
                    resolve(fallbackProcess);
                }
                catch (error) {
                    reject(new Error(`Fallback spawn failed: ${error.message}`));
                }
            }, 1000);
            return;
        }
        // Strategy 2: Try with different working directory
        const fallbackDir = '/workspaces/agent-feed';
        if (options.cwd !== fallbackDir && fs.existsSync(fallbackDir)) {
            setTimeout(() => {
                try {
                    const fallbackProcess = (0, child_process_1.spawn)(command, args, { ...options, cwd: fallbackDir });
                    this.registerProcess(instanceId + '_fallback', fallbackProcess);
                    resolve(fallbackProcess);
                }
                catch (error) {
                    reject(new Error(`All fallback strategies failed: ${error.message}`));
                }
            }, 2000);
            return;
        }
        reject(new Error('All spawn strategies failed'));
    }
    /**
     * Send NLD Alert
     */
    nldAlert(pattern, context) {
        const alert = {
            pattern,
            instanceId: context.instanceId || 'unknown',
            severity: this.determineSeverity(pattern, context),
            context,
            timestamp: Date.now(),
            resolutionStrategy: this.getResolutionStrategy(pattern)
        };
        this.alertHistory.push(alert);
        this.emit('nld:alert', alert);
        // Log for debugging
        console.log(`[NLD-ALERT] ${pattern}:`, JSON.stringify(context, null, 2));
    }
    /**
     * Determine alert severity
     */
    determineSeverity(pattern, context) {
        switch (pattern) {
            case ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1:
                return 'critical';
            case ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1:
                return 'high';
            case ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1:
                return 'medium';
            case ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1:
                return context.severity || 'medium';
            case ProcessFailurePattern.MULTI_PROCESS_RACE_CONDITION_V1:
                return 'high';
            default:
                return 'medium';
        }
    }
    /**
     * Get resolution strategy for pattern
     */
    getResolutionStrategy(pattern) {
        const strategies = {
            [ProcessFailurePattern.PROCESS_SPAWN_FAILURE_V1]: 'Check Claude binary in PATH, verify working directory permissions, try shell mode',
            [ProcessFailurePattern.PROCESS_LIFECYCLE_DESYNC_V1]: 'Refresh process registry, validate PID status, implement process restart',
            [ProcessFailurePattern.IO_PIPE_COMMUNICATION_BREAK_V1]: 'Reconnect I/O pipes, check for buffer overflow, validate stream health',
            [ProcessFailurePattern.PROCESS_RESOURCE_LEAK_V1]: 'Close unused file descriptors, garbage collect, monitor resource usage',
            [ProcessFailurePattern.MULTI_PROCESS_RACE_CONDITION_V1]: 'Implement process locking, serialize spawn operations, validate PID uniqueness'
        };
        return strategies[pattern] || 'Manual investigation required';
    }
    /**
     * Record input for monitoring
     */
    recordInput(instanceId, input) {
        const metrics = this.processMap.get(instanceId);
        if (metrics) {
            metrics.ioStats.stdinWrites++;
            metrics.ioStats.lastIoTime = Date.now();
        }
    }
    /**
     * Get process metrics
     */
    getProcessMetrics(instanceId) {
        return this.processMap.get(instanceId);
    }
    /**
     * Get all monitored processes
     */
    getAllProcesses() {
        return new Map(this.processMap);
    }
    /**
     * Get alert history
     */
    getAlertHistory(pattern) {
        if (pattern) {
            return this.alertHistory.filter(alert => alert.pattern === pattern);
        }
        return [...this.alertHistory];
    }
    /**
     * Unregister process from monitoring
     */
    unregisterProcess(instanceId) {
        this.processMap.delete(instanceId);
        this.emit('process:unregistered', { instanceId, timestamp: Date.now() });
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        this.isMonitoring = false;
        this.emit('monitoring:stopped', { timestamp: Date.now() });
    }
    /**
     * Generate health report
     */
    generateHealthReport() {
        const processes = Array.from(this.processMap.entries());
        const alerts = this.alertHistory;
        return {
            timestamp: Date.now(),
            monitoring: this.isMonitoring,
            processCount: processes.length,
            processes: processes.map(([id, metrics]) => ({
                instanceId: id,
                pid: metrics.pid,
                status: metrics.status,
                uptime: Date.now() - metrics.spawnTime,
                ioStats: metrics.ioStats,
                errorCount: metrics.errors.length
            })),
            alertSummary: {
                total: alerts.length,
                byPattern: Object.values(ProcessFailurePattern).map(pattern => ({
                    pattern,
                    count: alerts.filter(a => a.pattern === pattern).length
                })),
                bySeverity: {
                    critical: alerts.filter(a => a.severity === 'critical').length,
                    high: alerts.filter(a => a.severity === 'high').length,
                    medium: alerts.filter(a => a.severity === 'medium').length,
                    low: alerts.filter(a => a.severity === 'low').length
                }
            }
        };
    }
}
exports.NLDProcessHealthMonitor = NLDProcessHealthMonitor;
// Singleton instance
exports.nldProcessMonitor = new NLDProcessHealthMonitor();
// Cleanup on process exit
process.on('SIGINT', () => {
    exports.nldProcessMonitor.stopMonitoring();
    process.exit(0);
});
process.on('SIGTERM', () => {
    exports.nldProcessMonitor.stopMonitoring();
    process.exit(0);
});
//# sourceMappingURL=NLDProcessHealthMonitor.js.map