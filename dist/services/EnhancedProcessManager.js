"use strict";
/**
 * Enhanced PTY Process Manager with Escape Sequence Filtering
 *
 * This service replaces or enhances existing PTY process management with:
 * - Terminal escape sequence detection and filtering
 * - Process spawning controls to prevent concurrent instances
 * - Resource monitoring and automatic cleanup
 * - Integration with existing codebase architecture
 *
 * Addresses TDD test requirements and NLD analysis root causes.
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
exports.enhancedProcessManager = exports.EnhancedProcessManager = exports.OutputBufferManager = exports.ProcessInstance = exports.EscapeSequenceFilter = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const pty = __importStar(require("node-pty"));
const logger_1 = require("../utils/logger");
/**
 * Terminal escape sequence filter for problematic sequences
 */
class EscapeSequenceFilter {
    static PROBLEMATIC_SEQUENCES = [
        /\x1b\[\?25l/g, // Hide cursor
        /\x1b\[\?25h/g, // Show cursor  
        /\x1b\[\?2004h/g, // Bracketed paste mode on
        /\x1b\[\?2004l/g, // Bracketed paste mode off
        /\x1b\[A/g, // Cursor up
        /\x1b\[B/g, // Cursor down
        /\x1b\[C/g, // Cursor right
        /\x1b\[D/g, // Cursor left
        /\[O\[I/g, // Problematic sequence from TDD tests
        /\x1b\[H/g, // Cursor home
        /\x1b\[2J/g, // Clear screen
        /\x1b\[K/g, // Clear line
    ];
    static SAFE_SEQUENCES = [
        /\x1b\[\d+m/g, // Color sequences
        /\x1b\[\d+;\d+m/g, // Complex color sequences
        /\x1b\[0m/g, // Reset formatting
    ];
    /**
     * Filter problematic escape sequences while preserving safe ones
     */
    static filterEscapeSequences(input) {
        if (!input)
            return input;
        let filtered = input;
        // Remove problematic sequences
        this.PROBLEMATIC_SEQUENCES.forEach(regex => {
            filtered = filtered.replace(regex, '');
        });
        return filtered;
    }
    /**
     * Check if input contains problematic escape sequences
     */
    static containsProblematicSequences(input) {
        return this.PROBLEMATIC_SEQUENCES.some(regex => regex.test(input));
    }
    /**
     * Sanitize input for safe terminal display
     */
    static sanitizeInput(input) {
        if (!input)
            return input;
        let sanitized = this.filterEscapeSequences(input);
        // Remove other control characters that could cause issues
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return sanitized;
    }
    /**
     * Extract safe formatting sequences
     */
    static extractSafeSequences(input) {
        const safeSequences = [];
        this.SAFE_SEQUENCES.forEach(regex => {
            const matches = input.match(regex);
            if (matches) {
                safeSequences.push(...matches);
            }
        });
        return safeSequences;
    }
}
exports.EscapeSequenceFilter = EscapeSequenceFilter;
/**
 * Process instance manager with resource monitoring
 */
class ProcessInstance {
    instanceId;
    config;
    process = null;
    startTime = null;
    lastActivity = new Date();
    status = 'starting';
    outputBuffer = '';
    outputPosition = 0;
    memoryUsage = 0;
    cpuUsage = 0;
    activityTimer;
    resourceMonitor;
    healthCheck;
    constructor(instanceId, config) {
        this.instanceId = instanceId;
        this.config = { ...config };
    }
    /**
     * Update activity timestamp
     */
    updateActivity() {
        this.lastActivity = new Date();
    }
    /**
     * Check if process is alive
     */
    isAlive() {
        if (!this.process)
            return false;
        if ('pid' in this.process) {
            return this.process.pid !== undefined && !this.process.killed;
        }
        return false;
    }
    /**
     * Get process uptime in milliseconds
     */
    getUptime() {
        if (!this.startTime)
            return 0;
        return Date.now() - this.startTime.getTime();
    }
    /**
     * Get process info
     */
    getInfo() {
        return {
            pid: this.process && 'pid' in this.process ? this.process.pid || null : null,
            status: this.status,
            command: `${this.config.command} ${this.config.args.join(' ')}`,
            startTime: this.startTime,
            uptime: this.getUptime(),
            memoryUsage: this.memoryUsage,
            cpuUsage: this.cpuUsage,
            instanceId: this.instanceId
        };
    }
    /**
     * Cleanup instance resources
     */
    cleanup() {
        if (this.activityTimer) {
            clearTimeout(this.activityTimer);
            this.activityTimer = undefined;
        }
        if (this.resourceMonitor) {
            clearInterval(this.resourceMonitor);
            this.resourceMonitor = undefined;
        }
        if (this.healthCheck) {
            clearInterval(this.healthCheck);
            this.healthCheck = undefined;
        }
    }
}
exports.ProcessInstance = ProcessInstance;
/**
 * Output buffer manager with position tracking
 */
class OutputBufferManager {
    buffers = new Map();
    /**
     * Append output to buffer
     */
    appendOutput(instanceId, data) {
        const filtered = EscapeSequenceFilter.filterEscapeSequences(data);
        if (!this.buffers.has(instanceId)) {
            this.buffers.set(instanceId, {
                buffer: '',
                position: 0,
                lastUpdate: new Date(),
                lineCount: 0
            });
        }
        const buffer = this.buffers.get(instanceId);
        buffer.buffer += filtered;
        buffer.lastUpdate = new Date();
        buffer.lineCount = buffer.buffer.split('\n').length;
    }
    /**
     * Get incremental output since position
     */
    getIncrementalOutput(instanceId, fromPosition) {
        const buffer = this.buffers.get(instanceId);
        if (!buffer) {
            return { output: '', newPosition: 0, totalLength: 0 };
        }
        const output = buffer.buffer.slice(fromPosition);
        return {
            output,
            newPosition: buffer.buffer.length,
            totalLength: buffer.buffer.length
        };
    }
    /**
     * Clear buffer for instance
     */
    clearBuffer(instanceId) {
        this.buffers.delete(instanceId);
    }
    /**
     * Get buffer info
     */
    getBufferInfo(instanceId) {
        return this.buffers.get(instanceId) || null;
    }
}
exports.OutputBufferManager = OutputBufferManager;
/**
 * Enhanced PTY Process Manager
 */
class EnhancedProcessManager extends events_1.EventEmitter {
    processes = new Map();
    outputBuffers = new OutputBufferManager();
    resourceMonitor;
    healthMonitor;
    maxProcesses = 10;
    metrics = {
        totalProcesses: 0,
        activeProcesses: 0,
        failedProcesses: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        averageUptime: 0
    };
    constructor(options = {}) {
        super();
        this.maxProcesses = options.maxProcesses || 10;
        this.startMonitoring();
    }
    /**
     * Create a new process instance
     */
    async createInstance(instanceId, config) {
        // Check for existing instance
        if (this.processes.has(instanceId)) {
            await this.terminateInstance(instanceId);
        }
        // Check process limit
        if (this.processes.size >= this.maxProcesses) {
            throw new Error(`Maximum process limit reached (${this.maxProcesses})`);
        }
        const processInstance = new ProcessInstance(instanceId, config);
        this.processes.set(instanceId, processInstance);
        try {
            await this.spawnProcess(processInstance);
            this.metrics.totalProcesses++;
            this.updateMetrics();
            logger_1.logger.info(`Process instance created: ${instanceId}`, {
                instanceId,
                pid: processInstance.process && 'pid' in processInstance.process ? processInstance.process.pid : null,
                command: config.command
            });
            this.emit('instance:created', processInstance.getInfo());
            return processInstance.getInfo();
        }
        catch (error) {
            this.processes.delete(instanceId);
            this.metrics.failedProcesses++;
            logger_1.logger.error(`Failed to create process instance: ${instanceId}`, error);
            this.emit('instance:error', { instanceId, error });
            throw error;
        }
    }
    /**
     * Spawn the actual process
     */
    async spawnProcess(processInstance) {
        const { config } = processInstance;
        try {
            // Use PTY for terminal applications, regular spawn for others
            const currentDir = config.cwd || process.cwd();
            const currentEnv = {
                ...process.env,
                TERM: 'xterm-256color',
                FORCE_COLOR: '1',
                ...config.env
            };
            let spawnedProcess;
            if (config.command === 'claude' || config.cols || config.rows) {
                spawnedProcess = pty.spawn(config.command, config.args, {
                    name: 'xterm-256color',
                    cols: config.cols || 80,
                    rows: config.rows || 24,
                    cwd: currentDir,
                    env: currentEnv
                });
            }
            else {
                spawnedProcess = (0, child_process_1.spawn)(config.command, config.args, {
                    cwd: currentDir,
                    env: currentEnv,
                    stdio: ['pipe', 'pipe', 'pipe']
                });
            }
            processInstance.process = spawnedProcess;
            processInstance.startTime = new Date();
            processInstance.status = 'running';
            this.setupProcessHandlers(processInstance);
        }
        catch (error) {
            processInstance.status = 'error';
            throw new Error(`Process spawn failed: ${error.message}`);
        }
    }
    /**
     * Setup event handlers for process
     */
    setupProcessHandlers(processInstance) {
        const { instanceId, process } = processInstance;
        if (!process)
            return;
        // Handle PTY processes
        if ('onData' in process) {
            process.onData((data) => {
                processInstance.updateActivity();
                this.handleProcessOutput(instanceId, data, 'stdout');
            });
            process.onExit(({ exitCode, signal }) => {
                logger_1.logger.info(`PTY process exited: ${instanceId}`, { exitCode, signal });
                this.handleProcessExit(instanceId, exitCode, signal);
            });
        }
        // Handle regular child processes
        else {
            if (process.stdout) {
                process.stdout.on('data', (data) => {
                    processInstance.updateActivity();
                    this.handleProcessOutput(instanceId, data.toString(), 'stdout');
                });
            }
            if (process.stderr) {
                process.stderr.on('data', (data) => {
                    processInstance.updateActivity();
                    this.handleProcessOutput(instanceId, data.toString(), 'stderr');
                });
            }
            process.on('exit', (code, signal) => {
                logger_1.logger.info(`Process exited: ${instanceId}`, { code, signal });
                this.handleProcessExit(instanceId, code, signal);
            });
            process.on('error', (error) => {
                logger_1.logger.error(`Process error: ${instanceId}`, error);
                this.handleProcessError(instanceId, error);
            });
        }
    }
    /**
     * Handle process output with escape sequence filtering
     */
    handleProcessOutput(instanceId, data, source) {
        const processInstance = this.processes.get(instanceId);
        if (!processInstance)
            return;
        // Filter escape sequences if enabled
        const filteredData = processInstance.config.escapeSequenceFiltering !== false
            ? EscapeSequenceFilter.sanitizeInput(data)
            : data;
        // Update output buffer
        this.outputBuffers.appendOutput(instanceId, filteredData);
        // Emit output event
        this.emit('terminal:output', {
            instanceId,
            data: filteredData,
            source,
            timestamp: new Date(),
            filtered: filteredData !== data
        });
        // Log problematic sequences if detected
        if (EscapeSequenceFilter.containsProblematicSequences(data)) {
            logger_1.logger.warn(`Problematic escape sequences detected and filtered: ${instanceId}`, {
                instanceId,
                originalLength: data.length,
                filteredLength: filteredData.length
            });
        }
    }
    /**
     * Handle process exit
     */
    handleProcessExit(instanceId, code, signal) {
        const processInstance = this.processes.get(instanceId);
        if (!processInstance)
            return;
        processInstance.status = code === 0 ? 'stopped' : 'error';
        processInstance.cleanup();
        this.emit('instance:exit', {
            instanceId,
            code,
            signal,
            uptime: processInstance.getUptime()
        });
        // Auto-restart if configured
        if (processInstance.config.autoRestart && code !== 0) {
            logger_1.logger.info(`Auto-restarting process: ${instanceId}`);
            setTimeout(() => {
                this.createInstance(instanceId, processInstance.config).catch(error => {
                    logger_1.logger.error(`Auto-restart failed: ${instanceId}`, error);
                });
            }, 5000);
        }
    }
    /**
     * Handle process error
     */
    handleProcessError(instanceId, error) {
        const processInstance = this.processes.get(instanceId);
        if (!processInstance)
            return;
        processInstance.status = 'error';
        this.emit('instance:error', {
            instanceId,
            error: error.message,
            uptime: processInstance.getUptime()
        });
    }
    /**
     * Send input to process
     */
    async sendInput(instanceId, input) {
        const processInstance = this.processes.get(instanceId);
        if (!processInstance || !processInstance.isAlive()) {
            throw new Error(`Process instance not available: ${instanceId}`);
        }
        try {
            const { process } = processInstance;
            if ('write' in process) {
                // PTY process
                process.write(input);
            }
            else if (process.stdin) {
                // Regular process
                process.stdin.write(input);
            }
            else {
                throw new Error('Process stdin not available');
            }
            processInstance.updateActivity();
            this.emit('instance:input', {
                instanceId,
                input,
                timestamp: new Date()
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to send input to process: ${instanceId}`, error);
            this.emit('instance:error', { instanceId, error });
            return false;
        }
    }
    /**
     * Resize terminal (PTY processes only)
     */
    async resizeTerminal(instanceId, cols, rows) {
        const processInstance = this.processes.get(instanceId);
        if (!processInstance || !processInstance.isAlive()) {
            return false;
        }
        try {
            const { process } = processInstance;
            if ('resize' in process) {
                process.resize(cols, rows);
                this.emit('instance:resize', {
                    instanceId,
                    cols,
                    rows,
                    timestamp: new Date()
                });
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error(`Failed to resize terminal: ${instanceId}`, error);
            return false;
        }
    }
    /**
     * Get incremental output for instance
     */
    getIncrementalOutput(instanceId, fromPosition = 0) {
        return this.outputBuffers.getIncrementalOutput(instanceId, fromPosition);
    }
    /**
     * Get instance info
     */
    getInstanceInfo(instanceId) {
        const processInstance = this.processes.get(instanceId);
        return processInstance ? processInstance.getInfo() : null;
    }
    /**
     * Get all instances
     */
    getAllInstances() {
        return Array.from(this.processes.values()).map(p => p.getInfo());
    }
    /**
     * Terminate instance
     */
    async terminateInstance(instanceId, signal = 'SIGTERM') {
        const processInstance = this.processes.get(instanceId);
        if (!processInstance || !processInstance.isAlive()) {
            return false;
        }
        try {
            const { process } = processInstance;
            if ('kill' in process) {
                process.kill(signal);
            }
            // Force kill after timeout
            setTimeout(() => {
                if (processInstance.isAlive() && 'kill' in process) {
                    process.kill('SIGKILL');
                }
            }, 5000);
            processInstance.cleanup();
            this.outputBuffers.clearBuffer(instanceId);
            this.processes.delete(instanceId);
            this.emit('instance:terminated', { instanceId, signal });
            logger_1.logger.info(`Process instance terminated: ${instanceId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to terminate process: ${instanceId}`, error);
            return false;
        }
    }
    /**
     * Start monitoring processes
     */
    startMonitoring() {
        // Resource monitoring every 10 seconds
        this.resourceMonitor = setInterval(() => {
            this.updateResourceUsage();
        }, 10000);
        // Health monitoring every 30 seconds  
        this.healthMonitor = setInterval(() => {
            this.performHealthCheck();
        }, 30000);
    }
    /**
     * Update resource usage for all processes
     */
    async updateResourceUsage() {
        for (const [instanceId, processInstance] of Array.from(this.processes.entries())) {
            if (!processInstance.isAlive())
                continue;
            try {
                const usage = await this.getProcessResourceUsage(processInstance);
                processInstance.memoryUsage = usage.memory;
                processInstance.cpuUsage = usage.cpu;
                // Check resource limits
                const config = processInstance.config;
                if (config.maxMemoryMB && usage.memory > config.maxMemoryMB) {
                    logger_1.logger.warn(`Process memory limit exceeded: ${instanceId}`, {
                        instanceId,
                        current: usage.memory,
                        limit: config.maxMemoryMB
                    });
                    this.emit('instance:resource-violation', {
                        instanceId,
                        type: 'memory',
                        current: usage.memory,
                        limit: config.maxMemoryMB
                    });
                }
                if (config.maxCpuPercent && usage.cpu > config.maxCpuPercent) {
                    logger_1.logger.warn(`Process CPU limit exceeded: ${instanceId}`, {
                        instanceId,
                        current: usage.cpu,
                        limit: config.maxCpuPercent
                    });
                    this.emit('instance:resource-violation', {
                        instanceId,
                        type: 'cpu',
                        current: usage.cpu,
                        limit: config.maxCpuPercent
                    });
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to update resource usage: ${instanceId}`, error);
            }
        }
        this.updateMetrics();
    }
    /**
     * Get resource usage for a process
     */
    async getProcessResourceUsage(processInstance) {
        return new Promise((resolve) => {
            try {
                const { process } = processInstance;
                const pid = 'pid' in process ? process.pid : null;
                if (!pid) {
                    resolve({ memory: 0, cpu: 0 });
                    return;
                }
                const ps = (0, child_process_1.spawn)('ps', ['-p', pid.toString(), '-o', 'pid,pcpu,pmem,rss']);
                let output = '';
                ps.stdout.on('data', (data) => {
                    output += data.toString();
                });
                ps.on('close', (code) => {
                    if (code !== 0) {
                        resolve({ memory: 0, cpu: 0 });
                        return;
                    }
                    const lines = output.trim().split('\n');
                    if (lines.length < 2) {
                        resolve({ memory: 0, cpu: 0 });
                        return;
                    }
                    const stats = lines[1].trim().split(/\s+/);
                    const cpu = parseFloat(stats[1]) || 0;
                    const memoryKB = parseInt(stats[3]) || 0;
                    const memoryMB = Math.round(memoryKB / 1024);
                    resolve({ memory: memoryMB, cpu });
                });
                ps.on('error', () => {
                    resolve({ memory: 0, cpu: 0 });
                });
            }
            catch (error) {
                resolve({ memory: 0, cpu: 0 });
            }
        });
    }
    /**
     * Perform health check on all processes
     */
    performHealthCheck() {
        const now = Date.now();
        for (const [instanceId, processInstance] of Array.from(this.processes.entries())) {
            // Check for hung processes (no activity in 5 minutes)
            const timeSinceActivity = now - processInstance.lastActivity.getTime();
            if (timeSinceActivity > 300000) { // 5 minutes
                logger_1.logger.warn(`Process appears hung: ${instanceId}`, {
                    instanceId,
                    timeSinceActivity,
                    uptime: processInstance.getUptime()
                });
                this.emit('instance:hung', {
                    instanceId,
                    timeSinceActivity,
                    uptime: processInstance.getUptime()
                });
            }
            // Check runtime limits
            const config = processInstance.config;
            const uptime = processInstance.getUptime();
            if (config.maxRuntimeMs && uptime > config.maxRuntimeMs) {
                logger_1.logger.info(`Process runtime limit exceeded, terminating: ${instanceId}`, {
                    instanceId,
                    uptime,
                    limit: config.maxRuntimeMs
                });
                this.terminateInstance(instanceId, 'SIGTERM');
            }
        }
    }
    /**
     * Update performance metrics
     */
    updateMetrics() {
        const activeProcesses = Array.from(this.processes.values()).filter(p => p.status === 'running');
        this.metrics.activeProcesses = activeProcesses.length;
        if (activeProcesses.length > 0) {
            this.metrics.memoryUsage = activeProcesses.reduce((sum, p) => sum + p.memoryUsage, 0) / activeProcesses.length;
            this.metrics.cpuUsage = activeProcesses.reduce((sum, p) => sum + p.cpuUsage, 0) / activeProcesses.length;
            this.metrics.averageUptime = activeProcesses.reduce((sum, p) => sum + p.getUptime(), 0) / activeProcesses.length;
        }
        else {
            this.metrics.memoryUsage = 0;
            this.metrics.cpuUsage = 0;
            this.metrics.averageUptime = 0;
        }
    }
    /**
     * Get performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Cleanup all resources
     */
    async shutdown() {
        // Stop monitoring
        if (this.resourceMonitor) {
            clearInterval(this.resourceMonitor);
            this.resourceMonitor = undefined;
        }
        if (this.healthMonitor) {
            clearInterval(this.healthMonitor);
            this.healthMonitor = undefined;
        }
        // Terminate all processes
        const terminationPromises = Array.from(this.processes.keys()).map(instanceId => this.terminateInstance(instanceId, 'SIGTERM'));
        await Promise.all(terminationPromises);
        this.processes.clear();
        logger_1.logger.info('Enhanced Process Manager shutdown complete');
        this.emit('shutdown');
    }
}
exports.EnhancedProcessManager = EnhancedProcessManager;
// Export singleton instance
exports.enhancedProcessManager = new EnhancedProcessManager({
    maxProcesses: 10
});
exports.default = EnhancedProcessManager;
//# sourceMappingURL=EnhancedProcessManager.js.map