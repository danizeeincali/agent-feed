"use strict";
/**
 * Terminal WebSocket Handler
 *
 * Manages WebSocket connections for terminal communication,
 * multi-tab synchronization, and process management.
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
exports.TerminalWebSocket = void 0;
const ProcessManager_1 = require("../services/ProcessManager");
const pty = __importStar(require("node-pty"));
const os_1 = require("os");
class TerminalWebSocket {
    io;
    sessions = new Map();
    SHARED_SESSION_ID = 'shared-terminal';
    MAX_BUFFER_SIZE = 1000; // lines
    constructor(io) {
        this.io = io;
        this.setupProcessManagerListeners();
        this.initializeSharedSession();
    }
    /**
     * Initialize the shared terminal session
     */
    initializeSharedSession() {
        // Create a PTY instance for the terminal
        const shell = (0, os_1.platform)() === 'win32' ? 'powershell.exe' : 'bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: ProcessManager_1.processManager['config'].workingDirectory,
            env: process.env
        });
        const session = {
            id: this.SHARED_SESSION_ID,
            pty: ptyProcess,
            sockets: new Set(),
            buffer: [],
            maxBufferSize: this.MAX_BUFFER_SIZE
        };
        // Handle PTY output
        ptyProcess.onData((data) => {
            this.addToBuffer(session, data);
            this.broadcastToSession(this.SHARED_SESSION_ID, {
                type: 'output',
                data,
                timestamp: new Date()
            });
        });
        this.sessions.set(this.SHARED_SESSION_ID, session);
    }
    /**
     * Setup ProcessManager event listeners
     */
    setupProcessManagerListeners() {
        // Forward process output to terminal
        ProcessManager_1.processManager.on('terminal:output', (data) => {
            this.broadcastToSession(this.SHARED_SESSION_ID, {
                type: 'process-output',
                ...data
            });
        });
        ProcessManager_1.processManager.on('launched', (info) => {
            this.broadcastToAll({
                type: 'instance-launched',
                info
            });
        });
        ProcessManager_1.processManager.on('killed', (data) => {
            this.broadcastToAll({
                type: 'instance-killed',
                ...data
            });
        });
        ProcessManager_1.processManager.on('error', (error) => {
            this.broadcastToAll({
                type: 'process-error',
                error: error.message
            });
        });
        ProcessManager_1.processManager.on('auto-restart-triggered', () => {
            this.broadcastToAll({
                type: 'auto-restart',
                message: 'Auto-restart triggered'
            });
        });
    }
    /**
     * Handle new socket connection
     */
    handleConnection(socket) {
        console.log(`Terminal socket connected: ${socket.id}`);
        // Join shared session
        socket.join(this.SHARED_SESSION_ID);
        const session = this.sessions.get(this.SHARED_SESSION_ID);
        if (session) {
            session.sockets.add(socket.id);
            // Send current buffer to new connection
            socket.emit('terminal:buffer', {
                buffer: session.buffer.join(''),
                sessionId: this.SHARED_SESSION_ID
            });
            // Send current process info
            socket.emit('process:info', ProcessManager_1.processManager.getProcessInfo());
        }
        // Handle terminal input
        socket.on('terminal:input', (data) => {
            const session = this.sessions.get(this.SHARED_SESSION_ID);
            if (session?.pty) {
                session.pty.write(data);
            }
        });
        // Handle terminal resize
        socket.on('terminal:resize', ({ cols, rows }) => {
            const session = this.sessions.get(this.SHARED_SESSION_ID);
            if (session?.pty) {
                session.pty.resize(cols, rows);
            }
        });
        // Handle process management commands
        socket.on('process:launch', async (config) => {
            try {
                const info = await ProcessManager_1.processManager.launchInstance(config);
                socket.emit('process:launched', info);
            }
            catch (error) {
                socket.emit('process:error', {
                    message: error.message,
                    action: 'launch'
                });
            }
        });
        socket.on('process:kill', async () => {
            try {
                await ProcessManager_1.processManager.killInstance();
                socket.emit('process:killed');
            }
            catch (error) {
                socket.emit('process:error', {
                    message: error.message,
                    action: 'kill'
                });
            }
        });
        socket.on('process:restart', async () => {
            try {
                const info = await ProcessManager_1.processManager.restartInstance();
                socket.emit('process:restarted', info);
            }
            catch (error) {
                socket.emit('process:error', {
                    message: error.message,
                    action: 'restart'
                });
            }
        });
        socket.on('process:config', (config) => {
            ProcessManager_1.processManager.updateConfig(config);
            socket.emit('process:config-updated', config);
        });
        socket.on('process:info', () => {
            socket.emit('process:info', ProcessManager_1.processManager.getProcessInfo());
        });
        // Handle command execution in terminal
        socket.on('terminal:command', (command) => {
            const session = this.sessions.get(this.SHARED_SESSION_ID);
            if (session?.pty) {
                // Add command to buffer for history
                this.addToBuffer(session, `$ ${command}\n`);
                // Execute command
                session.pty.write(`${command}\n`);
                // Broadcast command to all tabs
                this.broadcastToSession(this.SHARED_SESSION_ID, {
                    type: 'command',
                    data: command,
                    from: socket.id,
                    timestamp: new Date()
                });
            }
        });
        // Handle disconnect
        socket.on('disconnect', () => {
            console.log(`Terminal socket disconnected: ${socket.id}`);
            const session = this.sessions.get(this.SHARED_SESSION_ID);
            if (session) {
                session.sockets.delete(socket.id);
            }
        });
    }
    /**
     * Add data to session buffer
     */
    addToBuffer(session, data) {
        // Split into lines and add to buffer
        const lines = data.split('\n');
        session.buffer.push(...lines);
        // Trim buffer if too large
        if (session.buffer.length > session.maxBufferSize) {
            session.buffer = session.buffer.slice(-session.maxBufferSize);
        }
    }
    /**
     * Broadcast to all sockets in a session
     */
    broadcastToSession(sessionId, data) {
        this.io.to(sessionId).emit('terminal:data', {
            sessionId,
            ...data
        });
    }
    /**
     * Broadcast to all connected sockets
     */
    broadcastToAll(data) {
        this.io.emit('terminal:broadcast', data);
    }
    /**
     * Clean up resources
     */
    cleanup() {
        for (const session of this.sessions.values()) {
            if (session.pty) {
                session.pty.kill();
            }
        }
        this.sessions.clear();
    }
}
exports.TerminalWebSocket = TerminalWebSocket;
exports.default = TerminalWebSocket;
//# sourceMappingURL=TerminalWebSocket.js.map