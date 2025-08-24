"use strict";
/**
 * Simple Process Manager for Claude Code Launcher
 * No social features, no users - just process lifecycle management
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
exports.SimpleProcessManager = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SimpleProcessManager {
    process = null;
    status = { isRunning: false, status: 'stopped' };
    prodPath;
    constructor() {
        this.prodPath = path.resolve(process.cwd(), 'prod');
        this.ensureProdDirectory();
    }
    ensureProdDirectory() {
        if (!fs.existsSync(this.prodPath)) {
            fs.mkdirSync(this.prodPath, { recursive: true });
        }
    }
    /**
     * Launch Claude Code instance in /prod directory
     */
    async launchClaude() {
        try {
            if (this.process && !this.process.killed) {
                return { ...this.status, error: 'Process already running' };
            }
            this.status = { isRunning: false, status: 'starting' };
            // Launch Claude Code in interactive mode
            const claudeCommand = 'claude';
            const claudeArgs = []; // Interactive mode - no arguments for persistent session
            // Spawn Claude Code process in /prod directory
            this.process = (0, child_process_1.spawn)(claudeCommand, claudeArgs, {
                cwd: this.prodPath,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false,
                shell: true
            });
            if (!this.process.pid) {
                throw new Error('Failed to spawn Claude process');
            }
            this.status = {
                isRunning: true,
                status: 'running',
                pid: this.process.pid,
                startedAt: new Date(),
                workingDirectory: this.prodPath
            };
            // Handle process events
            this.process.on('error', (error) => {
                this.status = {
                    isRunning: false,
                    status: 'error',
                    error: error.message
                };
            });
            this.process.on('exit', (code, signal) => {
                this.status = {
                    isRunning: false,
                    status: code === 0 ? 'stopped' : 'error',
                    error: code !== 0 ? `Process exited with code ${code}` : undefined
                };
                this.process = null;
            });
            return this.status;
        }
        catch (error) {
            this.status = {
                isRunning: false,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            return this.status;
        }
    }
    /**
     * Stop the Claude process
     */
    async stopClaude() {
        try {
            if (!this.process || this.process.killed) {
                this.status = { isRunning: false, status: 'stopped' };
                return this.status;
            }
            // Graceful shutdown
            this.process.kill('SIGTERM');
            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    this.process.kill('SIGKILL');
                }
            }, 5000);
            this.status = { isRunning: false, status: 'stopped' };
            this.process = null;
            return this.status;
        }
        catch (error) {
            this.status = {
                isRunning: false,
                status: 'error',
                error: error instanceof Error ? error.message : 'Error stopping process'
            };
            return this.status;
        }
    }
    /**
     * Get current process status
     */
    getStatus() {
        // Double-check if process is actually running
        if (this.process && this.process.killed) {
            this.status = { isRunning: false, status: 'stopped' };
            this.process = null;
        }
        return this.status;
    }
    /**
     * Check if Claude Code is available on system
     */
    async isClaudeAvailable() {
        return new Promise((resolve) => {
            const testProcess = (0, child_process_1.spawn)('claude', ['--version'], { shell: true });
            testProcess.on('error', () => resolve(false));
            testProcess.on('exit', (code) => resolve(code === 0));
            // Timeout after 3 seconds
            setTimeout(() => {
                testProcess.kill();
                resolve(false);
            }, 3000);
        });
    }
    /**
     * Get process working directory
     */
    getWorkingDirectory() {
        return this.prodPath;
    }
    /**
     * Clean up resources
     */
    destroy() {
        if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
        }
        this.process = null;
        this.status = { isRunning: false, status: 'stopped' };
    }
}
exports.SimpleProcessManager = SimpleProcessManager;
//# sourceMappingURL=SimpleProcessManager.js.map