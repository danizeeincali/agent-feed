#!/usr/bin/env node

/**
 * SIMPLIFIED BACKEND FOR COMPLEX COMMAND TESTING
 * ES Module compatible version with WebSocket support
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Active connections and processes
const connections = new Map();
const activeProcesses = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
    const connectionId = uuidv4();
    connections.set(connectionId, ws);
    
    console.log(`✅ WebSocket connected: ${connectionId}`);
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            await handleWebSocketMessage(ws, data, connectionId);
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: error.message }
            }));
        }
    });

    ws.on('close', () => {
        console.log(`❌ WebSocket disconnected: ${connectionId}`);
        connections.delete(connectionId);
        
        // Clean up any active processes for this connection
        const processesToKill = [];
        for (const [processId, process] of activeProcesses.entries()) {
            if (process.connectionId === connectionId) {
                processesToKill.push(processId);
            }
        }
        
        processesToKill.forEach(processId => {
            const process = activeProcesses.get(processId);
            if (process && process.child) {
                process.child.kill();
            }
            activeProcesses.delete(processId);
        });
    });

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'connection',
        payload: { 
            status: 'connected',
            connectionId,
            timestamp: new Date().toISOString()
        }
    }));
});

async function handleWebSocketMessage(ws, data, connectionId) {
    const { type, payload } = data;
    
    console.log(`📨 Received ${type} message from ${connectionId}`);

    switch (type) {
        case 'command':
            await executeCommand(ws, payload, connectionId);
            break;
            
        case 'permission_response':
            await handlePermissionResponse(ws, payload, connectionId);
            break;
            
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
            break;
            
        default:
            console.warn(`Unknown message type: ${type}`);
    }
}

async function executeCommand(ws, payload, connectionId) {
    const { command, requiresPermission = false } = payload;
    const processId = uuidv4();
    
    console.log(`🔄 Executing command: ${command}`);
    
    // Send loading state
    ws.send(JSON.stringify({
        type: 'loading',
        payload: {
            status: 'started',
            processId,
            command: command.substring(0, 50) + (command.length > 50 ? '...' : '')
        }
    }));

    // Check if command requires permission
    if (requiresPermission || needsPermission(command)) {
        ws.send(JSON.stringify({
            type: 'permission_required',
            payload: {
                command,
                processId,
                reason: 'This command may modify your system'
            }
        }));
        
        // Store pending command
        activeProcesses.set(processId, {
            connectionId,
            command,
            status: 'waiting_permission',
            timestamp: Date.now()
        });
        
        return;
    }
    
    // Execute command directly
    await runCommand(ws, command, processId, connectionId);
}

async function handlePermissionResponse(ws, payload, connectionId) {
    const { processId, response } = payload; // response: 'yes', 'no', 'ask_differently'
    
    const process = activeProcesses.get(processId);
    if (!process || process.connectionId !== connectionId) {
        ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Invalid process or permission request' }
        }));
        return;
    }

    if (response === 'yes') {
        await runCommand(ws, process.command, processId, connectionId);
    } else if (response === 'no') {
        ws.send(JSON.stringify({
            type: 'command_cancelled',
            payload: { 
                processId,
                reason: 'Permission denied by user'
            }
        }));
        activeProcesses.delete(processId);
    } else if (response === 'ask_differently') {
        ws.send(JSON.stringify({
            type: 'ask_for_alternative',
            payload: { 
                processId,
                originalCommand: process.command,
                suggestion: 'Please provide an alternative approach or more details'
            }
        }));
        activeProcesses.delete(processId);
    }
}

async function runCommand(ws, command, processId, connectionId) {
    console.log(`⚡ Running command: ${command}`);
    
    // Send tool call visualization
    const toolCallMatch = command.match(/^(\w+)/);
    const toolName = toolCallMatch ? toolCallMatch[1] : 'command';
    
    ws.send(JSON.stringify({
        type: 'tool_call',
        payload: {
            processId,
            toolName,
            status: 'running',
            displayText: `● ${toolName}`,
            command
        }
    }));

    try {
        // Parse command into parts
        const args = parseCommand(command);
        const executable = args.shift();
        
        // Create child process
        const child = spawn(executable, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            cwd: '/workspaces/agent-feed'
        });

        // Store process
        activeProcesses.set(processId, {
            connectionId,
            command,
            child,
            status: 'running',
            timestamp: Date.now()
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            
            ws.send(JSON.stringify({
                type: 'command_output',
                payload: {
                    processId,
                    chunk,
                    stream: 'stdout'
                }
            }));
        });

        child.stderr.on('data', (data) => {
            const chunk = data.toString();
            errorOutput += chunk;
            
            ws.send(JSON.stringify({
                type: 'command_output',
                payload: {
                    processId,
                    chunk,
                    stream: 'stderr'
                }
            }));
        });

        child.on('close', (code) => {
            console.log(`✅ Command completed with code: ${code}`);
            
            ws.send(JSON.stringify({
                type: 'command_complete',
                payload: {
                    processId,
                    exitCode: code,
                    success: code === 0,
                    output: output.trim(),
                    errorOutput: errorOutput.trim(),
                    duration: Date.now() - activeProcesses.get(processId)?.timestamp || 0
                }
            }));

            // Update tool call status
            ws.send(JSON.stringify({
                type: 'tool_call',
                payload: {
                    processId,
                    toolName,
                    status: code === 0 ? 'completed' : 'failed',
                    displayText: `● ${toolName}`,
                    result: code === 0 ? 'success' : 'failed'
                }
            }));

            activeProcesses.delete(processId);
        });

        child.on('error', (error) => {
            console.error(`❌ Command error: ${error.message}`);
            
            ws.send(JSON.stringify({
                type: 'command_error',
                payload: {
                    processId,
                    error: error.message
                }
            }));

            ws.send(JSON.stringify({
                type: 'tool_call',
                payload: {
                    processId,
                    toolName,
                    status: 'failed',
                    displayText: `● ${toolName}`,
                    error: error.message
                }
            }));

            activeProcesses.delete(processId);
        });

    } catch (error) {
        console.error(`💥 Execute error: ${error.message}`);
        
        ws.send(JSON.stringify({
            type: 'command_error', 
            payload: {
                processId,
                error: error.message
            }
        }));
        
        activeProcesses.delete(processId);
    }
}

function needsPermission(command) {
    const permissionCommands = [
        'npm install', 'npm i', 'yarn install', 'yarn add',
        'sudo', 'rm -rf', 'chmod', 'chown',
        'apt install', 'yum install', 'brew install',
        'pip install', 'gem install'
    ];
    
    return permissionCommands.some(cmd => 
        command.toLowerCase().includes(cmd.toLowerCase())
    );
}

function parseCommand(command) {
    // Simple command parsing - splits on spaces but respects quotes
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < command.length; i++) {
        const char = command[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = '';
        } else if (char === ' ' && !inQuotes) {
            if (current) {
                args.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }
    
    if (current) {
        args.push(current);
    }
    
    return args;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connections: connections.size,
        activeProcesses: activeProcesses.size
    });
});

// Stats endpoint
app.get('/stats', (req, res) => {
    res.json({
        connections: connections.size,
        activeProcesses: activeProcesses.size,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log('🚀 COMPLEX COMMAND TEST BACKEND STARTED');
    console.log('='.repeat(50));
    console.log(`📡 HTTP Server: http://localhost:${PORT}`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    console.log('='.repeat(50));
});

export default app;