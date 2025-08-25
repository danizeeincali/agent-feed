"use strict";
/**
 * Claude Process Manager - Manages dedicated Claude instances
 * Provides process lifecycle management, communication via stdio/pipes,
 * resource monitoring, and cleanup
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProcessManager = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
const uuid_1 = require("uuid");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
class ClaudeProcessManager extends events_1.EventEmitter {
    instances = new Map();
    logger;
    monitoring = null;
    sessionStorage;
    constructor(sessionStoragePath = './sessions') {
        super();
        this.sessionStorage = sessionStoragePath;
        this.setupLogger();
        this.ensureSessionStorage();
        this.startMonitoring();
    }
    setupLogger() {
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.File({
                    filename: 'logs/claude-process-manager.log',
                    level: 'info'
                }),
                new winston_1.default.transports.File({
                    filename: 'logs/claude-process-manager-error.log',
                    level: 'error'
                }),
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple(),
                    level: 'debug'
                })
            ]
        });
    }
    async ensureSessionStorage() {
        try {
            await fs_1.promises.mkdir(this.sessionStorage, { recursive: true });
            await fs_1.promises.mkdir(path_1.default.join(this.sessionStorage, 'logs'), { recursive: true });
        }
        catch (error) {
            this.logger.error('Failed to create session storage directories:', error);
        }
    }
    /**
     * Create new Claude instance with configuration
     */
    async createInstance(config = {}) {
        const instanceId = (0, uuid_1.v4)();
        try {
            const instance = new ClaudeInstance(instanceId, config, this.logger, this.sessionStorage);
            // Set up event handlers
            instance.on('message', (message) => {
                this.emit('message', message);
            });
            instance.on('statusChange', (status) => {
                this.emit('statusChange', status);
            });
            instance.on('error', (error) => {
                this.logger.error(`Instance ${instanceId} error:`, error);
                this.emit('error', { instanceId, error });
            });
            this.instances.set(instanceId, instance);
            await instance.start();
            this.logger.info(`Created Claude instance ${instanceId}`);
            return instanceId;
        }
        catch (error) {
            this.logger.error(`Failed to create Claude instance ${instanceId}:`, error);
            throw error;
        }
    }
    /**
     * Get list of all instances
     */
    getInstances() {
        return Array.from(this.instances.values()).map(instance => instance.getStatus());
    }
    /**
     * Get specific instance details
     */
    getInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        return instance ? instance.getStatus() : null;
    }
    /**
     * Send message to Claude instance
     */
    async sendMessage(instanceId, content, metadata) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        await instance.sendMessage(content, metadata);
    }
    /**
     * Terminate Claude instance
     */
    async terminateInstance(instanceId, force = false) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        try {
            await instance.stop(force);
            this.instances.delete(instanceId);
            this.logger.info(`Terminated Claude instance ${instanceId}`);
        }
        catch (error) {
            this.logger.error(`Failed to terminate instance ${instanceId}:`, error);
            throw error;
        }
    }
    /**
     * Health check for instance
     */
    async healthCheck(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            return false;
        }
        return await instance.healthCheck();
    }
    /**
     * Restart instance
     */
    async restartInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) {
            throw new Error(`Instance ${instanceId} not found`);
        }
        await instance.restart();
        this.logger.info(`Restarted Claude instance ${instanceId}`);
    }
    /**
     * Clean shutdown of all instances
     */
    async shutdown() {
        this.logger.info('Shutting down Claude Process Manager...');
        if (this.monitoring) {
            clearInterval(this.monitoring);
            this.monitoring = null;
        }
        const shutdownPromises = Array.from(this.instances.entries()).map(async ([id, instance]) => {
            try {
                await instance.stop();
                this.logger.info(`Shut down instance ${id}`);
            }
            catch (error) {
                this.logger.error(`Error shutting down instance ${id}:`, error);
            }
        });
        await Promise.all(shutdownPromises);
        this.instances.clear();
        this.logger.info('Claude Process Manager shutdown complete');
    }
    startMonitoring() {
        this.monitoring = setInterval(() => {
            this.monitorInstances();
        }, 30000); // Monitor every 30 seconds
    }
    monitorInstances() {
        for (const [id, instance] of this.instances) {
            try {
                instance.updateMetrics();
            }
            catch (error) {
                this.logger.error(`Error monitoring instance ${id}:`, error);
            }
        }
    }
}
exports.ClaudeProcessManager = ClaudeProcessManager;
/**
 * Individual Claude Instance class
 */
class ClaudeInstance extends events_1.EventEmitter {
    id;
    config;
    process = null;
    logger;
    status;
    sessionPath;
    messageQueue = [];
    healthCheckInterval = null;
    constructor(id, config, logger, sessionStorage) {
        super();
        this.id = id;
        this.config = {
            command: ['claude', 'chat'],
            workingDirectory: process.cwd(),
            timeout: 300000, // 5 minutes
            maxMemory: 1024 * 1024 * 1024, // 1GB
            maxCpu: 80, // 80%
            restartOnCrash: true,
            ...config
        };
        this.logger = logger;
        this.sessionPath = path_1.default.join(sessionStorage, id);
        this.status = {
            id,
            status: 'stopped',
            startTime: new Date(),
            lastActivity: new Date(),
            config: this.config,
            metrics: {
                messagesProcessed: 0,
                averageResponseTime: 0,
                errorCount: 0,
                restartCount: 0
            }
        };
        this.setupSessionStorage();
    }
    async setupSessionStorage() {
        try {
            await fs_1.promises.mkdir(this.sessionPath, { recursive: true });
        }
        catch (error) {
            this.logger.error(`Failed to create session storage for ${this.id}:`, error);
        }
    }
    async start() {
        if (this.process) {
            throw new Error('Instance already running');
        }
        try {
            this.updateStatus('starting');
            // Spawn Claude process
            this.process = (0, child_process_1.spawn)(this.config.command[0], this.config.command.slice(1), {
                cwd: this.config.workingDirectory,
                env: {
                    ...process.env,
                    ...this.config.environment
                },
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.setupProcessHandlers();
            this.startHealthCheck();
            this.status.pid = this.process.pid;
            this.updateStatus('running');
            this.logger.info(`Started Claude instance ${this.id} with PID ${this.process.pid}`);
        }
        catch (error) {
            this.updateStatus('error');
            throw error;
        }
    }
    setupProcessHandlers() {
        if (!this.process)
            return;
        // Handle stdout (Claude responses)
        this.process.stdout?.on('data', (data) => {
            const content = data.toString();
            this.handleOutput(content, 'output');
        });
        // Handle stderr (errors)
        this.process.stderr?.on('data', (data) => {
            const content = data.toString();
            this.handleOutput(content, 'error');
        });
        // Handle process exit
        this.process.on('exit', (code, signal) => {
            this.logger.info(`Claude instance ${this.id} exited with code ${code}, signal ${signal}`);
            if (code !== 0 && this.config.restartOnCrash) {
                this.handleCrash();
            }
            else {
                this.updateStatus('stopped');
            }
            this.process = null;
            this.stopHealthCheck();
        });
        // Handle process errors
        this.process.on('error', (error) => {
            this.logger.error(`Claude instance ${this.id} error:`, error);
            this.updateStatus('error');
            this.emit('error', error);
            this.status.metrics.errorCount++;
        });
    }
    handleOutput(content, type) {
        const message = {
            id: (0, uuid_1.v4)(),
            instanceId: this.id,
            type,
            content,
            timestamp: new Date()
        };
        this.messageQueue.push(message);
        this.emit('message', message);
        this.status.lastActivity = new Date();
        this.status.metrics.messagesProcessed++;
        // Save to session log
        this.saveMessageToSession(message);
    }
    async saveMessageToSession(message) {
        try {
            const logPath = path_1.default.join(this.sessionPath, 'messages.jsonl');
            const logLine = JSON.stringify(message) + '\n';
            await fs_1.promises.appendFile(logPath, logLine);
        }
        catch (error) {
            this.logger.error(`Failed to save message to session ${this.id}:`, error);
        }
    }
    async sendMessage(content, metadata) {
        if (!this.process || !this.process.stdin) {
            throw new Error('Process not available for input');
        }
        const message = {
            id: (0, uuid_1.v4)(),
            instanceId: this.id,
            type: 'input',
            content,
            timestamp: new Date(),
            metadata
        };
        try {
            this.process.stdin.write(content + '\n');
            this.messageQueue.push(message);
            this.status.lastActivity = new Date();
            await this.saveMessageToSession(message);
        }
        catch (error) {
            this.logger.error(`Failed to send message to instance ${this.id}:`, error);
            throw error;
        }
    }
    async stop(force = false) {
        if (!this.process) {
            this.updateStatus('stopped');
            return;
        }
        this.updateStatus('stopping');
        this.stopHealthCheck();
        try {
            if (force) {
                this.process.kill('SIGKILL');
            }
            else {
                this.process.kill('SIGTERM');
                // Wait for graceful shutdown
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        if (this.process) {
                            this.process.kill('SIGKILL');
                        }
                        reject(new Error('Timeout during graceful shutdown'));
                    }, 10000);
                    this.process.on('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
            }
        }
        catch (error) {
            this.logger.error(`Error stopping instance ${this.id}:`, error);
            throw error;
        }
    }
    async restart() {
        await this.stop();
        this.status.metrics.restartCount++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
        await this.start();
    }
    async handleCrash() {
        this.logger.warn(`Claude instance ${this.id} crashed, attempting restart...`);
        this.updateStatus('crashed');
        try {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before restart
            await this.start();
        }
        catch (error) {
            this.logger.error(`Failed to restart crashed instance ${this.id}:`, error);
            this.updateStatus('error');
        }
    }
    async healthCheck() {
        if (!this.process) {
            return false;
        }
        try {
            // Check if process is still running
            const isRunning = !this.process.killed && this.process.pid !== undefined;
            // Check resource usage
            if (isRunning) {
                this.updateMetrics();
            }
            return isRunning;
        }
        catch (error) {
            this.logger.error(`Health check failed for instance ${this.id}:`, error);
            return false;
        }
    }
    updateMetrics() {
        if (!this.process || !this.process.pid)
            return;
        try {
            // Update memory usage
            this.status.memoryUsage = process.memoryUsage();
            // Update CPU usage (simplified)
            this.status.cpuUsage = process.cpuUsage();
            // Check resource limits
            if (this.status.memoryUsage && this.status.memoryUsage.heapUsed > this.config.maxMemory) {
                this.logger.warn(`Instance ${this.id} exceeding memory limit`);
            }
        }
        catch (error) {
            this.logger.error(`Error updating metrics for instance ${this.id}:`, error);
        }
    }
    startHealthCheck() {
        this.healthCheckInterval = setInterval(async () => {
            const isHealthy = await this.healthCheck();
            if (!isHealthy && this.status.status === 'running') {
                this.logger.warn(`Health check failed for instance ${this.id}`);
                this.updateStatus('error');
            }
        }, 60000); // Check every minute
    }
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    updateStatus(status) {
        this.status.status = status;
        this.emit('statusChange', this.getStatus());
    }
    getStatus() {
        return { ...this.status };
    }
    getMessages(limit = 100) {
        return this.messageQueue.slice(-limit);
    }
}
exports.default = ClaudeProcessManager;
//# sourceMappingURL=ClaudeProcessManager.js.map