"use strict";
/**
 * Claude Instance Manager Service
 *
 * Comprehensive service for managing Claude instances with process lifecycle,
 * terminal sessions, auto-restart capabilities, and WebSocket integration.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeInstanceManager = exports.ClaudeInstanceManager = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const pty = __importStar(require("node-pty"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const logger_1 = require("@/utils/logger");
const connection_1 = require("@/database/connection");
const MAX_HISTORY_LINES = 10000;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const PROCESS_TIMEOUT = 30000; // 30 seconds for process operations
class ClaudeInstanceManager extends events_1.EventEmitter {
    instances = new Map();
    terminalSessions = new Map();
    processes = new Map();
    restartTimers = new Map();
    healthCheckInterval;
    constructor() {
        super();
        this.startHealthChecks();
        this.loadExistingInstances();
    }
    /**
     * Launch a new Claude instance
     */
    async launchInstance(options) {
        try {
            logger_1.logger.info('Launching Claude instance', { options });
            // Kill existing instance if same type
            await this.killExistingInstanceOfType(options.type);
            // Generate instance details
            const instanceId = this.generateInstanceId();
            const instanceName = options.name || this.generateInstanceName(options);
            const workDir = options.workingDirectory || '/workspaces/agent-feed/prod';
            // Ensure working directory exists
            await this.ensureWorkingDirectory(workDir);
            // Create instance record
            const instance = {
                id: instanceId,
                name: instanceName,
                type: options.type,
                status: 'creating',
                createdAt: new Date(),
                lastSeen: new Date(),
                config: options
            };
            // Register instance
            this.instances.set(instanceId, instance);
            await this.persistInstance(instance);
            // Update status to starting
            await this.updateInstanceStatus(instanceId, 'starting');
            // Spawn Claude process
            await this.spawnClaudeProcess(instanceId, options, workDir);
            // Create terminal session
            await this.createTerminalSession(instanceId);
            // Set up auto-restart if enabled
            if (options.autoRestart?.enabled) {
                this.scheduleAutoRestart(instanceId, options.autoRestart);
            }
            // Update status to running
            await this.updateInstanceStatus(instanceId, 'running');
            // Emit event
            this.emit('instanceCreated', instance);
            logger_1.logger.info('Claude instance launched successfully', { instanceId, instanceName });
            return instanceId;
        }
        catch (error) {
            logger_1.logger.error('Failed to launch Claude instance', { error: error.message, options });
            throw error;
        }
    }
    /**
     * Kill a Claude instance
     */
    async killInstance(instanceId, graceful = true) {
        try {
            const instance = this.instances.get(instanceId);
            if (!instance) {
                throw new Error(`Instance ${instanceId} not found`);
            }
            logger_1.logger.info('Killing Claude instance', { instanceId, graceful });
            // Update status
            await this.updateInstanceStatus(instanceId, 'stopping');
            // Cancel auto-restart if active
            this.cancelAutoRestart(instanceId);
            // Get process
            const process = this.processes.get(instanceId);
            if (process && !process.killed) {
                if (graceful) {
                    await this.gracefulShutdown(process);
                }
                else {
                    process.kill('SIGKILL');
                }
            }
            // Clean up terminal session
            await this.destroyTerminalSession(instanceId);
            // Update status
            await this.updateInstanceStatus(instanceId, 'stopped');
            // Remove from memory
            this.instances.delete(instanceId);
            this.processes.delete(instanceId);
            // Emit event
            this.emit('instanceDestroyed', instanceId);
            logger_1.logger.info('Claude instance killed successfully', { instanceId });
        }
        catch (error) {
            logger_1.logger.error('Failed to kill Claude instance', { error: error.message, instanceId });
            throw error;
        }
    }
    /**
     * Restart a Claude instance
     */
    async restartInstance(instanceId) {
        try {
            const instance = this.instances.get(instanceId);
            if (!instance) {
                throw new Error(`Instance ${instanceId} not found`);
            }
            logger_1.logger.info('Restarting Claude instance', { instanceId });
            // Kill current instance
            await this.killInstance(instanceId, true);
            // Launch new instance with same config
            const newInstanceId = await this.launchInstance(instance.config);
            logger_1.logger.info('Claude instance restarted successfully', {
                oldInstanceId: instanceId,
                newInstanceId
            });
            return newInstanceId;
        }
        catch (error) {
            logger_1.logger.error('Failed to restart Claude instance', { error: error.message, instanceId });
            throw error;
        }
    }
    /**
     * Get instance status
     */
    getInstanceStatus(instanceId) {
        return this.instances.get(instanceId) || null;
    }
    /**
     * List all instances
     */
    listInstances() {
        return Array.from(this.instances.values());
    }
    /**
     * Get terminal session
     */
    getTerminalSession(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance?.terminalSessionId) {
            return null;
        }
        return this.terminalSessions.get(instance.terminalSessionId) || null;
    }
    /**
     * Add client to terminal session
     */
    addTerminalClient(instanceId, clientId) {
        const session = this.getTerminalSession(instanceId);
        if (session) {
            session.clients.add(clientId);
            session.lastActivity = new Date();
            logger_1.logger.debug('Added client to terminal session', { instanceId, clientId });
        }
    }
    /**
     * Remove client from terminal session
     */
    removeTerminalClient(instanceId, clientId) {
        const session = this.getTerminalSession(instanceId);
        if (session) {
            session.clients.delete(clientId);
            logger_1.logger.debug('Removed client from terminal session', { instanceId, clientId });
        }
    }
    /**
     * Write to terminal
     */
    writeToTerminal(instanceId, data) {
        const session = this.getTerminalSession(instanceId);
        if (session) {
            session.pty.write(data);
            session.lastActivity = new Date();
        }
    }
    /**
     * Resize terminal
     */
    resizeTerminal(instanceId, cols, rows) {
        const session = this.getTerminalSession(instanceId);
        if (session) {
            session.pty.resize(cols, rows);
            session.size = { cols, rows };
            logger_1.logger.debug('Terminal resized', { instanceId, cols, rows });
        }
    }
    /**
     * Get terminal history
     */
    getTerminalHistory(instanceId, lines) {
        const session = this.getTerminalSession(instanceId);
        if (!session) {
            return [];
        }
        const history = session.history;
        if (lines && lines < history.length) {
            return history.slice(-lines);
        }
        return history;
    }
    /**
     * Private methods
     */
    async killExistingInstanceOfType(type) {
        const existingInstances = Array.from(this.instances.values())
            .filter(instance => instance.type === type && instance.status !== 'stopped');
        for (const instance of existingInstances) {
            await this.killInstance(instance.id, true);
        }
    }
    generateInstanceId() {
        return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    generateInstanceName(options) {
        try {
            // Try to read from CLAUDE.md
            const claudeConfigPath = path_1.default.join(options.workingDirectory || '/workspaces/agent-feed/prod', 'CLAUDE.md');
            // This would need to be implemented to read the actual file
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            return `Claude-${options.type}-${timestamp}`;
        }
        catch {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            return `Claude-${options.type}-${timestamp}`;
        }
    }
    async ensureWorkingDirectory(workDir) {
        try {
            await promises_1.default.access(workDir);
        }
        catch {
            await promises_1.default.mkdir(workDir, { recursive: true });
        }
    }
    async spawnClaudeProcess(instanceId, options, workDir) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Process spawn timeout'));
            }, PROCESS_TIMEOUT);
            try {
                // Prepare environment
                const env = {
                    ...process.env,
                    ...options.environment,
                    NODE_ENV: 'production',
                    CLAUDE_INSTANCE_ID: instanceId,
                    CLAUDE_WORKSPACE: workDir
                };
                // Spawn Claude process (this would need to be the actual Claude command)
                const childProcess = (0, child_process_1.spawn)('node', ['-e', 'console.log("Claude instance started"); setInterval(() => {}, 1000)'], {
                    cwd: workDir,
                    env,
                    stdio: 'pipe',
                    detached: false
                });
                // Store process reference
                this.processes.set(instanceId, childProcess);
                // Set up process event handlers
                childProcess.on('spawn', () => {
                    clearTimeout(timeout);
                    logger_1.logger.info('Claude process spawned', { instanceId, pid: childProcess.pid });
                    // Update instance with PID
                    const instance = this.instances.get(instanceId);
                    if (instance) {
                        instance.pid = childProcess.pid;
                        this.instances.set(instanceId, instance);
                    }
                    resolve();
                });
                childProcess.on('error', (error) => {
                    clearTimeout(timeout);
                    logger_1.logger.error('Claude process error', { instanceId, error: error.message });
                    this.updateInstanceStatus(instanceId, 'error');
                    reject(error);
                });
                childProcess.on('exit', (code, signal) => {
                    logger_1.logger.info('Claude process exited', { instanceId, code, signal });
                    this.handleProcessExit(instanceId, code, signal);
                });
            }
            catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }
    async createTerminalSession(instanceId) {
        const sessionId = `terminal-${instanceId}`;
        // Create PTY session
        const ptyProcess = pty.spawn('bash', [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: this.instances.get(instanceId)?.config.workingDirectory || '/workspaces/agent-feed/prod',
            env: process.env
        });
        const session = {
            id: sessionId,
            instanceId,
            pty: ptyProcess,
            clients: new Set(),
            history: [],
            size: { cols: 80, rows: 24 },
            lastActivity: new Date(),
            settings: {
                fontSize: 14,
                fontFamily: 'Monaco, Menlo, monospace',
                theme: {
                    background: '#1e1e1e',
                    foreground: '#d4d4d4',
                    cursor: '#ffffff',
                    selection: '#264f78'
                },
                scrollback: 1000,
                cursorBlink: true
            }
        };
        // Set up PTY event handlers
        ptyProcess.onData((data) => {
            // Add to history
            session.history.push(data);
            if (session.history.length > MAX_HISTORY_LINES) {
                session.history.shift();
            }
            // Broadcast to connected clients
            this.emit('terminalData', instanceId, data);
        });
        ptyProcess.onExit(() => {
            logger_1.logger.info('PTY session exited', { instanceId, sessionId });
            this.terminalSessions.delete(sessionId);
        });
        // Store session
        this.terminalSessions.set(sessionId, session);
        // Update instance with session ID
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.terminalSessionId = sessionId;
            this.instances.set(instanceId, instance);
        }
        logger_1.logger.info('Terminal session created', { instanceId, sessionId });
    }
    async destroyTerminalSession(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance?.terminalSessionId) {
            return;
        }
        const session = this.terminalSessions.get(instance.terminalSessionId);
        if (session) {
            session.pty.kill();
            this.terminalSessions.delete(instance.terminalSessionId);
            logger_1.logger.info('Terminal session destroyed', { instanceId, sessionId: instance.terminalSessionId });
        }
    }
    async gracefulShutdown(process) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                process.kill('SIGKILL');
                resolve();
            }, 15000); // 15 second grace period
            process.on('exit', () => {
                clearTimeout(timeout);
                resolve();
            });
            process.kill('SIGTERM');
        });
    }
    async updateInstanceStatus(instanceId, status) {
        const instance = this.instances.get(instanceId);
        if (instance) {
            instance.status = status;
            instance.lastSeen = new Date();
            this.instances.set(instanceId, instance);
            // Persist to database
            await this.persistInstance(instance);
            // Emit event
            this.emit('instanceStatusChanged', instanceId, status);
        }
    }
    async persistInstance(instance) {
        try {
            await connection_1.db.query(`
        INSERT INTO instances (id, name, type, pid, status, created_at, last_seen, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          pid = EXCLUDED.pid,
          status = EXCLUDED.status,
          last_seen = EXCLUDED.last_seen,
          config = EXCLUDED.config
      `, [
                instance.id,
                instance.name,
                instance.type,
                instance.pid,
                instance.status,
                instance.createdAt,
                instance.lastSeen,
                JSON.stringify(instance.config)
            ]);
        }
        catch (error) {
            logger_1.logger.error('Failed to persist instance', { error: error.message, instanceId: instance.id });
        }
    }
    async loadExistingInstances() {
        try {
            const result = await connection_1.db.query(`
        SELECT id, name, type, pid, status, created_at, last_seen, config
        FROM instances
        WHERE status IN ('running', 'starting')
      `);
            for (const row of result.rows) {
                const instance = {
                    id: row.id,
                    name: row.name,
                    type: row.type,
                    pid: row.pid,
                    status: row.status,
                    createdAt: new Date(row.created_at),
                    lastSeen: new Date(row.last_seen),
                    config: JSON.parse(row.config)
                };
                this.instances.set(instance.id, instance);
                // Check if process is still running
                if (instance.pid && !this.isProcessRunning(instance.pid)) {
                    await this.updateInstanceStatus(instance.id, 'stopped');
                }
            }
            logger_1.logger.info('Loaded existing instances', { count: result.rows.length });
        }
        catch (error) {
            logger_1.logger.error('Failed to load existing instances', { error: error.message });
        }
    }
    isProcessRunning(pid) {
        try {
            process.kill(pid, 0);
            return true;
        }
        catch {
            return false;
        }
    }
    handleProcessExit(instanceId, code, signal) {
        logger_1.logger.info('Handling process exit', { instanceId, code, signal });
        this.updateInstanceStatus(instanceId, 'stopped');
        this.processes.delete(instanceId);
        // Check if auto-restart is enabled
        const instance = this.instances.get(instanceId);
        if (instance?.config.autoRestart?.enabled && code !== 0) {
            logger_1.logger.info('Scheduling auto-restart for crashed instance', { instanceId });
            setTimeout(() => {
                this.restartInstance(instanceId).catch(error => {
                    logger_1.logger.error('Auto-restart failed', { instanceId, error: error.message });
                });
            }, 5000); // Wait 5 seconds before restart
        }
        this.emit('instanceExited', instanceId, code, signal);
    }
    scheduleAutoRestart(instanceId, config) {
        const intervalMs = config.intervalHours * 60 * 60 * 1000;
        const timer = setTimeout(() => {
            logger_1.logger.info('Performing scheduled restart', { instanceId });
            this.restartInstance(instanceId).catch(error => {
                logger_1.logger.error('Scheduled restart failed', { instanceId, error: error.message });
            });
        }, intervalMs);
        this.restartTimers.set(instanceId, timer);
        logger_1.logger.info('Auto-restart scheduled', { instanceId, intervalHours: config.intervalHours });
    }
    cancelAutoRestart(instanceId) {
        const timer = this.restartTimers.get(instanceId);
        if (timer) {
            clearTimeout(timer);
            this.restartTimers.delete(instanceId);
            logger_1.logger.info('Auto-restart cancelled', { instanceId });
        }
    }
    startHealthChecks() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthChecks();
        }, HEALTH_CHECK_INTERVAL);
    }
    async performHealthChecks() {
        for (const [instanceId, instance] of this.instances) {
            if (instance.status === 'running' && instance.pid) {
                if (!this.isProcessRunning(instance.pid)) {
                    logger_1.logger.warn('Instance process not running during health check', { instanceId });
                    await this.updateInstanceStatus(instanceId, 'stopped');
                }
                else {
                    // Update last seen
                    await this.updateInstanceStatus(instanceId, 'running');
                }
            }
        }
    }
    /**
     * Cleanup on shutdown
     */
    async shutdown() {
        logger_1.logger.info('Shutting down Claude Instance Manager');
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        // Cancel all restart timers
        for (const timer of this.restartTimers.values()) {
            clearTimeout(timer);
        }
        // Kill all running instances
        const runningInstances = Array.from(this.instances.values())
            .filter(instance => instance.status === 'running');
        for (const instance of runningInstances) {
            await this.killInstance(instance.id, true);
        }
        logger_1.logger.info('Claude Instance Manager shutdown complete');
    }
}
exports.ClaudeInstanceManager = ClaudeInstanceManager;
// Export singleton instance
exports.claudeInstanceManager = new ClaudeInstanceManager();
//# sourceMappingURL=claude-instance-manager.js.map