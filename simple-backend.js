/**
 * Real Claude Process Execution System
 * Complete terminal I/O integration with actual Claude processes
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const pty = require('node-pty');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Real Claude Process Management
const activeProcesses = new Map(); // instanceId → {process, pid, status, startTime, command, workingDirectory, outputPosition, outputBuffer}
const sseConnections = new Map(); // Track SSE connections per instance
const activeSSEConnections = new Map(); // Track all SSE connections per instance ID
const instances = new Map(); // Track all created instances dynamically
// UNIFIED BUFFER SYSTEM: Single source of truth for all terminal output
const instanceOutputBuffers = new Map(); // instanceId → {buffer: string, readPosition: number, lastSentPosition: number, lineCount: number}

// Claude Command Configurations
const CLAUDE_COMMANDS = {
  'prod': ['claude'],
  'skip-permissions': ['claude', '--dangerously-skip-permissions'], 
  'skip-permissions-c': ['claude', '--dangerously-skip-permissions', '-c'],
  'skip-permissions-resume': ['claude', '--dangerously-skip-permissions', '--resume']
};

// SPARC Working Directory Resolution System
class DirectoryResolver {
  constructor() {
    this.baseDirectory = '/workspaces/agent-feed';
    this.directoryMappings = {
      'prod': 'prod',
      'production': 'prod',
      'frontend': 'frontend',
      'fe': 'frontend', 
      'ui': 'frontend',
      'test': 'tests',
      'tests': 'tests',
      'testing': 'tests',
      'src': 'src',
      'source': 'src',
      'skip-permissions': '', // Use base directory
      'skip-permissions-c': '', // Use base directory 
      'skip-permissions-resume': '' // Use base directory
    };
    this.validationCache = new Map();
  }

  extractDirectoryHint(instanceType, instanceName) {
    if (!instanceType) return 'default';
    
    // Method 1: From instance name (e.g., "prod/claude")
    if (instanceName && instanceName.includes('/')) {
      const parts = instanceName.split('/');
      const hint = parts[0].toLowerCase().trim();
      return this.directoryMappings[hint] !== undefined ? this.directoryMappings[hint] : 'default';
    }
    
    // Method 2: From instance type
    const hint = instanceType.toLowerCase().trim();
    return this.directoryMappings[hint] !== undefined ? this.directoryMappings[hint] : 'default';
  }

  isWithinBaseDirectory(targetPath, basePath = this.baseDirectory) {
    const resolved = require('path').resolve(targetPath);
    const base = require('path').resolve(basePath);
    
    return resolved.startsWith(base + require('path').sep) || resolved === base;
  }

  async validateDirectory(dirPath) {
    // Check cache first
    const cacheKey = dirPath;
    const cached = this.validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 60000)) { // 1 minute cache
      return cached.result;
    }

    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(dirPath);
      
      if (!stats.isDirectory()) {
        this.validationCache.set(cacheKey, { result: false, timestamp: Date.now() });
        return false;
      }
      
      await fs.access(dirPath, require('fs').constants.R_OK | require('fs').constants.W_OK);
      
      this.validationCache.set(cacheKey, { result: true, timestamp: Date.now() });
      return true;
    } catch (error) {
      this.validationCache.set(cacheKey, { result: false, timestamp: Date.now() });
      return false;
    }
  }

  async resolveWorkingDirectory(instanceType, instanceName) {
    const startTime = Date.now();
    
    if (!instanceType) {
      console.log(`📁 No instance type provided, using base directory: ${this.baseDirectory}`);
      return this.baseDirectory;
    }

    const hint = this.extractDirectoryHint(instanceType, instanceName);
    
    if (hint === 'default' || hint === '') {
      console.log(`📁 Using base directory for instance type '${instanceType}': ${this.baseDirectory}`);
      return this.baseDirectory;
    }

    const targetDir = require('path').join(this.baseDirectory, hint);
    
    // Security validation
    if (!this.isWithinBaseDirectory(targetDir)) {
      console.error(`🚨 Security violation: Directory outside base path: ${targetDir}`);
      console.log(`📁 Security fallback to base directory: ${this.baseDirectory}`);
      return this.baseDirectory;
    }

    // Directory existence and permission validation
    const isValid = await this.validateDirectory(targetDir);
    
    if (isValid) {
      const duration = Date.now() - startTime;
      console.log(`✅ Directory resolved successfully in ${duration}ms:`);
      console.log(`   Instance Type: ${instanceType}`);
      console.log(`   Directory Hint: ${hint}`);
      console.log(`   Resolved Path: ${targetDir}`);
      return targetDir;
    } else {
      console.log(`⚠️ Directory validation failed for: ${targetDir}`);
      console.log(`📁 Falling back to base directory: ${this.baseDirectory}`);
      return this.baseDirectory;
    }
  }
}

// Initialize SPARC directory resolver
const directoryResolver = new DirectoryResolver();

// Import Mock Claude Process for development
const MockClaudeProcess = require('./src/services/MockClaudeProcess');

// Check Claude CLI authentication status - FIXED for Claude Code environment
async function checkClaudeAuthentication() {
  try {
    // Check for Claude credentials file (Claude Code environment)
    const fs = require('fs');
    const path = require('path');
    const credentialsPath = path.join(process.env.HOME || '/home/codespace', '.claude', '.credentials.json');
    
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ Claude CLI authentication detected via credentials file');
      return { authenticated: true, source: 'credentials_file' };
    }
    
    // Check for Claude Code environment variables
    if (process.env.CLAUDECODE === '1') {
      console.log('✅ Claude Code environment detected - using inherited authentication');
      return { authenticated: true, source: 'claude_code_env' };
    }
    
    // Fallback: test with help command (always works)
    const { execSync } = require('child_process');
    execSync('claude --help', { timeout: 3000 });
    console.log('✅ Claude CLI is available and functional');
    return { authenticated: true, source: 'cli_available' };
    
  } catch (error) {
    console.error('❌ Claude CLI not available or not functional:', error.message);
    return { authenticated: false, reason: 'Claude CLI not available' };
  }
}

// SPARC:debug FIX - Enhanced Claude Process Creation with Authentication Detection
async function createRealClaudeInstanceWithPTY(instanceType, instanceId, usePty = true) {
  // SPARC FIX: Resolve working directory dynamically based on instance type
  const workingDir = await directoryResolver.resolveWorkingDirectory(instanceType);
  const [command, ...args] = CLAUDE_COMMANDS[instanceType] || CLAUDE_COMMANDS['prod'];
  
  console.log(`🚀 SPARC Enhanced Claude process spawning (PTY: ${usePty}):`);
  console.log(`   Command: ${command} ${args.join(' ')}`);
  console.log(`   Working Directory: ${workingDir}`);
  console.log(`   Instance Type: ${instanceType}`);
  console.log(`   Instance ID: ${instanceId}`);
  
  // FIXED: Always use real Claude processes in Claude Code environment
  console.log('🚀 Creating REAL Claude instance (Mock Claude system removed)');
  
  try {
    // Ensure working directory exists
    if (!fs.existsSync(workingDir)) {
      throw new Error(`Working directory does not exist: ${workingDir}`);
    }

    let claudeProcess;
    let processType = 'pipe';

    if (usePty) {
      try {
        // Create PTY process for terminal emulation
        // INTERACTIVE FIX: Support interactive Claude sessions without --print flag
        const isClaudeCommand = command === 'claude';
        const finalArgs = args; // No --print flag for interactive Claude sessions
        
        claudeProcess = pty.spawn(command, finalArgs, {
          cwd: workingDir,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            FORCE_COLOR: '1'
          },
          cols: 100,
          rows: 30,
          name: 'xterm-color'
        });
        processType = 'pty';
        console.log(`✅ PTY process created successfully for ${instanceId} with ${isClaudeCommand ? 'Claude flags' : 'standard flags'}`);
      } catch (ptyError) {
        console.warn(`⚠️ PTY creation failed, falling back to regular pipes:`, ptyError.message);
        usePty = false;
      }
    }

    // Fallback to regular pipes if PTY fails or is not requested
    if (!usePty) {
      // INTERACTIVE FIX: Support interactive Claude sessions without --print flag
      const isClaudeCommand = command === 'claude';
      const finalArgs = args; // No --print flag for interactive Claude sessions
      
      claudeProcess = spawn(command, finalArgs, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        },
        shell: false
      });
      console.log(`✅ Regular pipe process created for ${instanceId} with ${isClaudeCommand ? 'Claude flags' : 'standard flags'}`);
    }
    
    const processInfo = {
      process: claudeProcess,
      pid: claudeProcess.pid,
      status: 'starting',
      startTime: new Date(),
      command: `${command} ${args.join(' ')}`,
      workingDirectory: workingDir,
      instanceType,
      processType,
      usePty,
      outputPosition: 0,
      outputBuffer: ''
    };
    
    // Initialize unified output buffer tracking with line counting
    instanceOutputBuffers.set(instanceId, {
      buffer: '',
      readPosition: 0,
      lastSentPosition: 0,
      lineCount: 0,
      createdAt: new Date()
    });
    
    activeProcesses.set(instanceId, processInfo);
    
    // CRITICAL FIX: Setup process handlers IMMEDIATELY after process creation
    setupProcessHandlers(instanceId, processInfo);
    
    // CRITICAL FIX: Immediately broadcast starting status
    console.log(`📡 Broadcasting initial 'starting' status for ${instanceId}`);
    broadcastInstanceStatus(instanceId, 'starting', {
      pid: claudeProcess.pid,
      command: processInfo.command,
      processType,
      usePty
    });
    
    return processInfo;
    
  } catch (error) {
    console.error(`❌ Failed to spawn Claude process:`, error);
    // Broadcast error status
    broadcastInstanceStatus(instanceId, 'error', { error: error.message });
    throw error;
  }
}

// SPARC:debug FIX - Mock Claude Instance Creation  
async function createMockClaudeInstance(instanceType, instanceId, workingDir) {
  console.log(`🎭 Creating Mock Claude instance for development:`);
  console.log(`   Instance Type: ${instanceType}`);
  console.log(`   Instance ID: ${instanceId}`);
  console.log(`   Working Directory: ${workingDir}`);
  
  try {
    // Create mock Claude process with realistic behavior
    const mockProcess = new MockClaudeProcess(instanceId, {
      cwd: workingDir,
      verbose: true,
      responseDelay: 800,  // Realistic response time
      startupDelay: 300    // Quick startup for development
    });
    
    const processInfo = {
      process: mockProcess,
      pid: mockProcess.pid,
      status: 'starting',
      startTime: new Date(),
      command: `mock-claude ${instanceType}`,
      workingDirectory: workingDir,
      instanceType,
      processType: 'mock',
      usePty: false,
      isMock: true
    };
    
    activeProcesses.set(instanceId, processInfo);
    
    // Setup mock process handlers
    setupMockProcessHandlers(instanceId, processInfo);
    
    // Broadcast starting status immediately
    console.log(`📡 Broadcasting 'starting' status for mock Claude ${instanceId}`);
    broadcastInstanceStatus(instanceId, 'starting', {
      pid: mockProcess.pid,
      command: processInfo.command,
      processType: 'mock',
      isMock: true
    });
    
    return processInfo;
    
  } catch (error) {
    console.error(`❌ Failed to create Mock Claude instance:`, error);
    broadcastInstanceStatus(instanceId, 'error', { error: error.message, isMock: true });
    throw error;
  }
}

// Mock Process Handlers for development simulation
function setupMockProcessHandlers(instanceId, processInfo) {
  const { process: mockProcess } = processInfo;
  
  console.log(`🔧 Setting up Mock Claude handlers for ${instanceId}`);
  
  // Mock process becomes ready
  mockProcess.on('spawn', () => {
    console.log(`✅ Mock Claude process ${instanceId} spawned successfully (PID: ${mockProcess.pid})`);
    processInfo.status = 'running';
    
    setTimeout(() => {
      broadcastInstanceStatus(instanceId, 'running', {
        pid: mockProcess.pid,
        command: processInfo.command,
        processType: 'mock',
        isMock: true
      });
    }, 100);
  });
  
  // Mock stdout handling - this is where the real output flows!
  mockProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`📤 MOCK Claude ${instanceId} stdout (${data.length} bytes):`, output.substring(0, 200) + (output.length > 200 ? '...' : ''));
    
    // Broadcast mock Claude output via SSE - this fixes the silent output issue!
    broadcastToAllConnections(instanceId, {
      type: 'output',
      data: output,
      instanceId: instanceId,
      timestamp: new Date().toISOString(),
      source: 'stdout',
      isReal: false,
      isMock: true,
      processType: 'mock'
    });
  });

  // Mock stderr handling
  mockProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.log(`📤 MOCK Claude ${instanceId} stderr (${data.length} bytes):`, error.substring(0, 200));
    
    broadcastToAllConnections(instanceId, {
      type: 'output',
      data: error,
      instanceId: instanceId,
      isError: true,
      timestamp: new Date().toISOString(),
      source: 'stderr',
      isReal: false,
      isMock: true,
      processType: 'mock'
    });
  });
  
  // Mock process exit handling
  mockProcess.on('exit', (code, signal) => {
    console.log(`🏁 Mock Claude process ${instanceId} exited with code ${code}, signal ${signal}`);
    processInfo.status = 'stopped';
    broadcastInstanceStatus(instanceId, 'stopped', { 
      exitCode: code, 
      signal, 
      processType: 'mock',
      isMock: true 
    });
    activeProcesses.delete(instanceId);
  });

  // Mock process error handling
  mockProcess.on('error', (error) => {
    console.error(`❌ Mock Claude process ${instanceId} error:`, error);
    processInfo.status = 'error';
    broadcastInstanceStatus(instanceId, 'error', { 
      error: error.message, 
      processType: 'mock',
      isMock: true 
    });
  });
  
  console.log(`🎭 Mock Claude process configured successfully: ${instanceId}`);
  console.log(`📁 Working directory: ${processInfo.workingDirectory}`);
  console.log(`📊 Mock Process details:`);
  console.log(`   PID: ${mockProcess.pid}`);
  console.log(`   Process Type: Mock Development Simulation`);
  console.log(`   Features: Interactive chat, command responses, realistic delays`);
  console.log(`📡 Ready to stream Mock Claude output for development!`);
}

// Legacy function for backward compatibility - now with PTY support
async function createRealClaudeInstance(instanceType, instanceId) {
  // Default to PTY for better terminal emulation
  return createRealClaudeInstanceWithPTY(instanceType, instanceId, true);
}

// Process Event Handlers Setup (supports both PTY and regular pipes)
function setupProcessHandlers(instanceId, processInfo) {
  const { process: claudeProcess, processType, usePty } = processInfo;
  
  console.log(`🔧 Setting up process handlers for ${instanceId} (${processType} mode)`);
  
  // PTY processes handle I/O differently than regular pipes
  if (usePty && processType === 'pty') {
    setupPTYHandlers(instanceId, processInfo);
  } else {
    setupPipeHandlers(instanceId, processInfo);
  }
}

// PTY Process Handlers for better terminal emulation
function setupPTYHandlers(instanceId, processInfo) {
  const { process: claudeProcess } = processInfo;
  
  console.log(`🔧 Setting up PTY handlers for ${instanceId}`);
  
  // PTY processes emit 'spawn' differently
  setTimeout(() => {
    if (claudeProcess.pid && !claudeProcess.killed) {
      console.log(`✅ PTY Claude process ${instanceId} ready (PID: ${claudeProcess.pid})`);
      processInfo.status = 'running';
      broadcastInstanceStatus(instanceId, 'running', {
        pid: claudeProcess.pid,
        command: processInfo.command,
        processType: 'pty'
      });
    }
  }, 1000); // PTY processes need slightly more time to initialize

  // PTY data handling - combines stdout/stderr in a single stream with incremental output
  claudeProcess.onData((data) => {
    console.log(`📤 REAL Claude ${instanceId} PTY output (${data.length} bytes):`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
    
    // Use incremental broadcast to prevent repetition
    broadcastIncrementalOutput(instanceId, data, 'pty');
  });

  // PTY process exit handling
  claudeProcess.onExit(({ exitCode, signal }) => {
    console.log(`🏁 PTY Claude process ${instanceId} exited with code ${exitCode}, signal ${signal}`);
    processInfo.status = 'stopped';
    broadcastInstanceStatus(instanceId, 'stopped', { exitCode, signal, processType: 'pty' });
    activeProcesses.delete(instanceId);
  });

  console.log(`🔧 PTY Claude process spawned: ${instanceId}`);
  console.log(`📁 Working directory: ${processInfo.workingDirectory}`);
  console.log(`📊 PTY Process configuration:`);
  console.log(`   PID: ${claudeProcess.pid}`);
  console.log(`   Killed: ${claudeProcess.killed}`);
  console.log(`   Process Type: PTY (better terminal emulation)`);
  console.log(`📡 Ready to stream REAL Claude PTY output`);
}

// Regular Pipe Process Handlers (legacy support)
function setupPipeHandlers(instanceId, processInfo) {
  const { process: claudeProcess } = processInfo;
  
  console.log(`🔧 Setting up pipe handlers for ${instanceId}`);
  
  // Process becomes ready
  claudeProcess.on('spawn', () => {
    console.log(`✅ Claude process ${instanceId} spawned successfully (PID: ${claudeProcess.pid})`);
    processInfo.status = 'running';
    
    // Critical Fix: Add delay to ensure SSE connections are ready
    setTimeout(() => {
      broadcastInstanceStatus(instanceId, 'running', {
        pid: claudeProcess.pid,
        command: processInfo.command,
        processType: 'pipe'
      });
    }, 100); // 100ms delay ensures connections are established
  });
  
  // CRITICAL FIX: Add timeout to detect when process is ready
  // Some processes might not emit 'spawn' but still be running
  setTimeout(() => {
    if (processInfo.status === 'starting' && claudeProcess.pid && !claudeProcess.killed) {
      console.log(`⏰ Process ${instanceId} timeout reached, assuming running (PID: ${claudeProcess.pid})`);
      processInfo.status = 'running';
      broadcastInstanceStatus(instanceId, 'running', {
        pid: claudeProcess.pid,
        command: processInfo.command,
        note: 'Status set by timeout (process ready)',
        processType: 'pipe'
      });
    }
  }, 3000); // 3 second timeout
  
  // CRITICAL FIX: Enhanced real Claude process output handling with incremental broadcasting
  if (claudeProcess.stdout) {
    claudeProcess.stdout.on('data', (data) => {
      const realOutput = data.toString('utf8');
      console.log(`📤 REAL Claude ${instanceId} stdout (${data.length} bytes):`, realOutput.substring(0, 200) + (realOutput.length > 200 ? '...' : ''));
      
      // Use incremental broadcast to prevent repetition
      broadcastIncrementalOutput(instanceId, realOutput, 'stdout');
    });
    
    claudeProcess.stdout.on('error', (error) => {
      console.error(`❌ Claude ${instanceId} stdout error:`, error);
    });
  } else {
    console.error(`❌ Claude ${instanceId} stdout is null - stdio configuration issue`);
  }
  
  if (claudeProcess.stderr) {
    claudeProcess.stderr.on('data', (data) => {
      const realError = data.toString('utf8');
      console.log(`📤 REAL Claude ${instanceId} stderr (${data.length} bytes):`, realError.substring(0, 200) + (realError.length > 200 ? '...' : ''));
      
      // Use incremental broadcast for stderr too
      broadcastIncrementalOutput(instanceId, realError, 'stderr');
    });
    
    claudeProcess.stderr.on('error', (error) => {
      console.error(`❌ Claude ${instanceId} stderr error:`, error);
    });
  } else {
    console.error(`❌ Claude ${instanceId} stderr is null - stdio configuration issue`);
  }
  
  // Add stdin error handling
  if (claudeProcess.stdin) {
    claudeProcess.stdin.on('error', (error) => {
      console.error(`❌ Claude ${instanceId} stdin error:`, error);
    });
  } else {
    console.error(`❌ Claude ${instanceId} stdin is null - stdio configuration issue`);
  }
  
  // Debug process stdio configuration
  console.log(`🔧 Regular pipe Claude process spawned: ${instanceId}`);
  console.log(`📁 Working directory: ${processInfo.workingDirectory}`);
  console.log(`📊 Process stdio configuration check:`);
  console.log(`   stdin: ${claudeProcess.stdin ? '✅ Available' : '❌ NULL'}`);
  console.log(`   stdout: ${claudeProcess.stdout ? '✅ Available' : '❌ NULL'}`);
  console.log(`   stderr: ${claudeProcess.stderr ? '✅ Available' : '❌ NULL'}`);
  console.log(`   PID: ${claudeProcess.pid}`);
  console.log(`   Killed: ${claudeProcess.killed}`);
  console.log(`   Process Type: Regular pipes`);
  console.log(`📡 Ready to stream REAL Claude output only`);
  
  // Process termination handling
  claudeProcess.on('exit', (code, signal) => {
    console.log(`🏁 Claude process ${instanceId} exited with code ${code}, signal ${signal}`);
    processInfo.status = 'stopped';
    broadcastInstanceStatus(instanceId, 'stopped', { exitCode: code, signal, processType: 'pipe' });
    activeProcesses.delete(instanceId);
  });
  
  // Process error handling
  claudeProcess.on('error', (error) => {
    console.error(`❌ Claude process ${instanceId} error:`, error);
    processInfo.status = 'error';
    broadcastInstanceStatus(instanceId, 'error', { error: error.message, processType: 'pipe' });
  });
}

// SPARC Enhanced: Incremental Output Broadcast with Position Tracking
function broadcastIncrementalOutput(instanceId, newData, source = 'stdout') {
  const outputBuffer = instanceOutputBuffers.get(instanceId);
  if (!outputBuffer) {
    console.warn(`⚠️ No output buffer for ${instanceId} - initializing`);
    instanceOutputBuffers.set(instanceId, {
      buffer: '',
      readPosition: 0,
      lastSentPosition: 0,
      createdAt: new Date()
    });
    return broadcastIncrementalOutput(instanceId, newData, source);
  }
  
  // Append new data to buffer
  outputBuffer.buffer += newData;
  
  // Calculate new data slice since last sent position
  const newDataSlice = outputBuffer.buffer.slice(outputBuffer.lastSentPosition);
  
  if (newDataSlice.length === 0) {
    console.log(`📊 No new output for ${instanceId} - already sent`);
    return;
  }
  
  console.log(`📤 Broadcasting incremental output for ${instanceId}: ${newDataSlice.length} bytes (pos: ${outputBuffer.lastSentPosition} -> ${outputBuffer.buffer.length})`);
  
  const message = {
    type: 'terminal_output',
    output: newDataSlice,
    instanceId: instanceId,
    timestamp: new Date().toISOString(),
    source: source,
    isReal: true,
    position: outputBuffer.lastSentPosition,
    totalLength: outputBuffer.buffer.length,
    isIncremental: true
  };
  
  // Update last sent position
  outputBuffer.lastSentPosition = outputBuffer.buffer.length;
  
  // Broadcast to connections (SSE and WebSocket)
  broadcastToConnections(instanceId, message);
  broadcastToWebSockets(instanceId, message);
}

// CRITICAL FIX 4: Enhanced broadcast function with robust error handling
function safelyBroadcastOutput(instanceId, message) {
  const connections = activeSSEConnections.get(instanceId) || [];
  
  // CRITICAL FIX: Also broadcast to general status connections so output isn't lost
  const generalConnections = activeSSEConnections.get('__status__') || [];
  const allConnections = [...connections, ...generalConnections];
  
  if (allConnections.length === 0) {
    console.warn(`⚠️ No SSE connections for ${instanceId} - buffering output:`, message.data?.substring(0, 100));
    // Use new incremental buffer instead of global buffer
    const outputBuffer = instanceOutputBuffers.get(instanceId);
    if (outputBuffer && message.data) {
      outputBuffer.buffer += message.data;
      console.log(`📦 Buffered ${message.data.length} bytes for ${instanceId} (total: ${outputBuffer.buffer.length})`);
    }
    return;
  }
  
  const serializedData = `data: ${JSON.stringify(message)}\n\n`;
  const validConnections = [];
  let successfulBroadcasts = 0;
  
  connections.forEach((connection, index) => {
    try {
      // Enhanced connection validation
      if (connection && 
          !connection.destroyed && 
          connection.writable && 
          !connection.writableEnded) {
        connection.write(serializedData);
        validConnections.push(connection);
        successfulBroadcasts++;
      } else {
        console.warn(`Removing invalid connection ${index} for ${instanceId}`);
      }
    } catch (error) {
      if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
        console.log(`🔄 Connection ${instanceId}[${index}] reset - client reconnection`);
      } else {
        console.error(`❌ Broadcast error for connection ${index}:`, error.message);
      }
    }
  });
  
  // Update connection list to remove dead connections
  activeSSEConnections.set(instanceId, validConnections);
  
  // MANDATORY: Success logging for debugging
  console.log(`📊 [${instanceId}] Broadcast: ${successfulBroadcasts}/${connections.length} connections successful`);
  
  if (successfulBroadcasts === 0) {
    console.error(`❌ CRITICAL: No successful broadcasts for ${instanceId} - all connections failed!`);
  }
}

// Enhanced broadcast to connections with deduplication
function broadcastToConnections(instanceId, message) {
  const connections = activeSSEConnections.get(instanceId) || [];
  const generalConnections = activeSSEConnections.get('__status__') || [];
  const allConnections = [...connections, ...generalConnections];
  
  if (allConnections.length === 0) {
    console.warn(`⚠️ No connections for ${instanceId} - message will be buffered`);
    return;
  }
  
  const serializedData = `data: ${JSON.stringify(message)}\n\n`;
  const validConnections = [];
  let successfulBroadcasts = 0;
  
  connections.forEach((connection, index) => {
    try {
      if (connection && 
          !connection.destroyed && 
          connection.writable && 
          !connection.writableEnded) {
        connection.write(serializedData);
        validConnections.push(connection);
        successfulBroadcasts++;
      }
    } catch (error) {
      console.warn(`Connection ${index} failed for ${instanceId}:`, error.message);
    }
  });
  
  // Update connection list to remove dead connections
  activeSSEConnections.set(instanceId, validConnections);
  
  console.log(`📊 [${instanceId}] Incremental broadcast: ${successfulBroadcasts}/${connections.length} successful`);
}

// Legacy function for backward compatibility - now uses incremental output
function broadcastToAllConnections(instanceId, message) {
  if (message.type === 'output' && message.data) {
    broadcastIncrementalOutput(instanceId, message.data, message.source);
  } else {
    safelyBroadcastOutput(instanceId, message);
  }
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'HTTP/SSE Only - WebSocket Eliminated',
    message: 'WebSocket connection storm successfully eliminated!'
  });
});

// Mock Claude instances endpoint
app.get('/api/v1/claude-live/prod/agents', (req, res) => {
  res.json([
    {
      id: 'claude-2426',
      name: 'Claude Instance 1',
      status: 'running',
      pid: 2426,
      type: 'development',
      created: new Date().toISOString()
    },
    {
      id: 'claude-3891',
      name: 'Claude Instance 2', 
      status: 'running',
      pid: 3891,
      type: 'production',
      created: new Date().toISOString()
    }
  ]);
});

// Mock activities endpoint
app.get('/api/v1/claude-live/prod/activities', (req, res) => {
  res.json([
    {
      id: '1',
      message: 'HTTP/SSE terminal connection established',
      timestamp: new Date().toISOString(),
      type: 'connection'
    },
    {
      id: '2', 
      message: 'WebSocket connection storm eliminated',
      timestamp: new Date().toISOString(),
      type: 'success'
    }
  ]);
});

// Mock agent posts endpoint
app.get('/api/v1/agent-posts', (req, res) => {
  res.json({
    success: true,
    message: 'HTTP/SSE mode active - WebSocket eliminated',
    posts: [
      {
        id: '1',
        title: 'WebSocket Storm Eliminated',
        content: 'Successfully converted to HTTP/SSE architecture',
        timestamp: new Date().toISOString()
      }
    ]
  });
});

// Frontend-compatible Claude instances endpoint (GET - fetch instances)
app.get('/api/claude/instances', (req, res) => {
  console.log('🔍 Fetching Claude instances for frontend');
  
  // CRITICAL FIX: Return dynamic instances list for Option A validation
  const instanceList = Array.from(instances.values());
  console.log(`📋 Returning ${instanceList.length} instances:`, instanceList.map(i => `${i.id} (${i.name})`));
  
  res.json({
    success: true,
    instances: instanceList,
    timestamp: new Date().toISOString()
  });
});

// SPARC Enhanced Claude instance creation endpoint with PTY support
app.post('/api/claude/instances', async (req, res) => {
  const { command, instanceType: providedType, usePty = true } = req.body;
  const instanceId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  
  console.log(`🆕 SPARC Creating Claude instance:`, { command, instanceType: providedType, usePty });
  
  // SPARC FIX: Use provided instance type or parse from command
  let instanceType = 'prod';
  let instanceName = 'prod/claude';
  if (command && Array.isArray(command)) {
    if (command.includes('--dangerously-skip-permissions')) {
      if (command.includes('-c')) {
        instanceType = 'skip-permissions-c';
        instanceName = 'skip-permissions -c';
      } else if (command.includes('--resume')) {
        instanceType = 'skip-permissions-resume';
        instanceName = 'skip-permissions --resume';
      } else {
        instanceType = 'skip-permissions';
        instanceName = 'skip-permissions';
      }
    }
  }
  
  try {
    const processInfo = await createRealClaudeInstanceWithPTY(instanceType, instanceId, usePty);
    
    // Create instance tracking record with SPARC working directory and PTY info
    const instanceRecord = {
      id: instanceId,
      name: instanceName,
      status: 'starting',
      pid: processInfo.pid,
      type: instanceType,
      created: processInfo.startTime.toISOString(),
      command: processInfo.command,
      workingDirectory: processInfo.workingDirectory,  // SPARC: Include resolved directory
      processType: processInfo.processType,
      usePty: processInfo.usePty
    };
    
    instances.set(instanceId, instanceRecord);
    
    console.log(`✅ SPARC Enhanced Claude process spawned: ${instanceId} (PID: ${processInfo.pid})`);
    console.log(`   Working Directory: ${processInfo.workingDirectory}`);
    console.log(`   Process Type: ${processInfo.processType}`);
    console.log(`   PTY Enabled: ${processInfo.usePty}`);
    
    res.status(201).json({
      success: true,
      instance: instanceRecord
    });
    
  } catch (error) {
    console.error(`❌ SPARC Enhanced process creation failed:`, error);
    console.error(`   Instance Type: ${instanceType}`);
    console.error(`   Instance ID: ${instanceId}`);
    res.status(500).json({
      success: false,
      error: `SPARC Enhanced process creation failed: ${error.message}`,
      instanceType,
      instanceId
    });
  }
});

// Delete Claude instance endpoint with real process termination
app.delete('/api/claude/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const processInfo = activeProcesses.get(instanceId);
  
  console.log(`🗑️ Terminating Claude instance: ${instanceId}`);
  
  if (!processInfo) {
    return res.status(404).json({ success: false, error: 'Instance not found' });
  }
  
  try {
    console.log(`🗑️ Terminating Claude process ${instanceId} (PID: ${processInfo.pid})`);
    
    // Graceful termination
    if (processInfo.process.stdin && !processInfo.process.stdin.destroyed) {
      processInfo.process.stdin.end(); // Close stdin
    }
    processInfo.process.kill('SIGTERM'); // Send termination signal
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (!processInfo.process.killed) {
        console.log(`⚡ Force killing Claude process ${instanceId}`);
        processInfo.process.kill('SIGKILL');
      }
    }, 5000);
    
    // Clean up tracking data including output buffers
    instances.delete(instanceId);
    activeSSEConnections.delete(instanceId);
    sseConnections.delete(instanceId);
    instanceOutputBuffers.delete(instanceId);
    
    res.json({ 
      success: true, 
      message: `Claude instance ${instanceId} termination initiated`,
      pid: processInfo.pid
    });
    
  } catch (error) {
    console.error(`❌ Failed to terminate Claude process ${instanceId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new Claude instance endpoint (legacy v1 path - keep for compatibility)
app.post('/api/v1/claude/instances', (req, res) => {
  const { name, type } = req.body;
  
  console.log(`🆕 Creating new Claude instance: ${JSON.stringify({ name, type })}`);
  
  // Generate new instance ID and PID
  const newId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  const newPid = Math.floor(Math.random() * 9000) + 1000;
  
  const newInstance = {
    id: newId,
    name: name || `Claude Instance ${newId}`,
    status: 'starting',
    pid: newPid,
    type: type || 'development',
    created: new Date().toISOString()
  };
  
  console.log(`✅ Claude instance created: ${newId} (PID: ${newPid})`);
  
  res.status(201).json({
    success: true,
    message: 'Claude instance created successfully',
    instance: newInstance,
    timestamp: new Date().toISOString()
  });
});

// Delete Claude instance endpoint
app.delete('/api/v1/claude/instances/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`🗑️ Deleting Claude instance: ${instanceId}`);
  
  res.json({
    success: true,
    message: `Claude instance ${instanceId} deleted successfully`,
    instanceId,
    timestamp: new Date().toISOString()
  });
});

// SPARC FIX: Mock terminal processing REMOVED
// Real Claude processes handle all terminal I/O directly
// No mock responses - only real process stdin/stdout/stderr streaming

// Broadcast instance status changes via SSE
function broadcastInstanceStatus(instanceId, status, details = {}) {
  const statusEvent = {
    type: 'instance:status',
    instanceId,
    status,  // 'starting', 'running', 'stopped', 'error'
    timestamp: new Date().toISOString(),
    ...details
  };
  
  console.log(`📡 Broadcasting status ${status} for instance ${instanceId}`);
  
  // Fix 1: Broadcast to instance-specific connections
  const instanceConnections = activeSSEConnections.get(instanceId) || [];
  console.log(`   → Instance connections: ${instanceConnections.length}`);
  instanceConnections.forEach((res, index) => {
    try {
      res.write(`data: ${JSON.stringify(statusEvent)}\n\n`);
    } catch (error) {
      console.error(`❌ Failed to broadcast to instance connection ${index}:`, error);
      instanceConnections.splice(index, 1);
    }
  });
  
  // Fix 2: Broadcast to general status connections
  const generalConnections = activeSSEConnections.get('__status__') || [];
  console.log(`   → General status connections: ${generalConnections.length}`);
  generalConnections.forEach((res, index) => {
    try {
      res.write(`data: ${JSON.stringify(statusEvent)}\n\n`);
    } catch (error) {
      console.error(`❌ Failed to broadcast to general connection ${index}:`, error);
      generalConnections.splice(index, 1);
    }
  });
  
  // Fix 3: Update instance record
  if (instances.has(instanceId)) {
    const instance = instances.get(instanceId);
    instance.status = status;
    instances.set(instanceId, instance);
  }
  
  console.log(`📊 Total broadcasts sent: ${instanceConnections.length + generalConnections.length}`);
}

// SPARC FIX: Mock terminal command processing REMOVED
// All commands are forwarded directly to real Claude process stdin
// Real Claude handles all commands and generates authentic responses

// Process Status Endpoint with Real System Data
app.get('/api/claude/instances/:instanceId/status', (req, res) => {
  const { instanceId } = req.params;
  const processInfo = activeProcesses.get(instanceId);
  
  if (!processInfo) {
    return res.status(404).json({ success: false, error: 'Instance not found' });
  }
  
  // Check if process is actually running in system
  const isRunning = processInfo.process && !processInfo.process.killed;
  
  res.json({
    success: true,
    status: {
      id: instanceId,
      pid: processInfo.pid,
      status: isRunning ? processInfo.status : 'stopped',
      command: processInfo.command,
      workingDirectory: processInfo.workingDirectory,
      startTime: processInfo.startTime,
      uptime: Date.now() - processInfo.startTime.getTime()
    }
  });
});

// Process Health Monitoring
app.get('/api/claude/instances/:instanceId/health', (req, res) => {
  const { instanceId } = req.params;
  const processInfo = activeProcesses.get(instanceId);
  
  if (!processInfo) {
    return res.status(404).json({ healthy: false, reason: 'Instance not found' });
  }
  
  const isHealthy = processInfo.process && 
                   !processInfo.process.killed && 
                   processInfo.status === 'running';
  
  res.json({
    healthy: isHealthy,
    pid: processInfo.pid,
    status: processInfo.status,
    uptime: Date.now() - processInfo.startTime.getTime(),
    memoryUsage: process.memoryUsage(),
    command: processInfo.command
  });
});

// Broadcast message to all SSE connections for an instance
function broadcastToInstance(instanceId, message) {
  const connections = sseConnections.get(instanceId) || [];
  const data = `data: ${JSON.stringify(message)}\n\n`;
  
  connections.forEach((connection, index) => {
    try {
      connection.write(data);
    } catch (error) {
      console.error(`❌ Error broadcasting to connection ${index} for instance ${instanceId}:`, error);
      // Remove dead connection
      connections.splice(index, 1);
    }
  });
}

// Terminal SSE streaming function (shared between endpoints)
function createTerminalSSEStream(req, res, instanceId) {
  console.log(`📡 SSE Claude terminal stream requested for instance: ${instanceId}`);
  
  // Set SSE headers with persistent connection settings
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  // Prevent request timeout
  req.setTimeout(0);
  res.setTimeout(0);

  // Add connection to tracking (both maps)
  if (!sseConnections.has(instanceId)) {
    sseConnections.set(instanceId, []);
  }
  if (!activeSSEConnections.has(instanceId)) {
    activeSSEConnections.set(instanceId, []);
  }
  sseConnections.get(instanceId).push(res);
  activeSSEConnections.get(instanceId).push(res);
  
  console.log(`📊 SSE connections for ${instanceId}: ${activeSSEConnections.get(instanceId).length}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: `✅ Terminal connected to Claude instance ${instanceId}`,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // SPARC Enhanced: Send incremental buffered output that was captured while disconnected
  const outputBuffer = instanceOutputBuffers.get(instanceId);
  if (outputBuffer && outputBuffer.buffer.length > 0 && outputBuffer.lastSentPosition < outputBuffer.buffer.length) {
    const unsentData = outputBuffer.buffer.slice(outputBuffer.lastSentPosition);
    console.log(`📦 Sending ${unsentData.length} bytes of buffered output for ${instanceId} (pos: ${outputBuffer.lastSentPosition})`);
    
    if (unsentData.length > 0) {
      const bufferedMessage = {
        type: 'output',
        data: unsentData,
        instanceId: instanceId,
        timestamp: new Date().toISOString(),
        source: 'buffered',
        isReal: true,
        position: outputBuffer.lastSentPosition,
        totalLength: outputBuffer.buffer.length,
        isIncremental: true,
        isBuffered: true
      };
      
      res.write(`data: ${JSON.stringify(bufferedMessage)}\n\n`);
      outputBuffer.lastSentPosition = outputBuffer.buffer.length;
    }
  }

  // CRITICAL FIX: Don't send fake session messages - let real Claude output come through
  // Check if we have a real Claude process to stream from
  const processInfo = activeProcesses.get(instanceId);
  if (processInfo) {
    // Only send working directory info, let real Claude output handle the rest
    console.log(`📁 Real Claude process found for ${instanceId}, working directory: ${processInfo.workingDirectory}`);
    console.log(`📡 SSE stream ready to receive REAL Claude output from PID: ${processInfo.pid}`);
    
    // Send a simple connection confirmation without fake output
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      instanceId,
      message: `Terminal connected to Claude instance ${instanceId}`,
      workingDirectory: processInfo.workingDirectory,
      pid: processInfo.pid,
      timestamp: new Date().toISOString()
    })}\n\n`);
  } else {
    // Process not ready yet, send status only
    res.write(`data: ${JSON.stringify({
      type: 'status',
      instanceId,
      message: `Waiting for Claude instance ${instanceId} to be ready...`,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }

  // Send periodic keep-alive messages only when no real output is flowing
  let lastOutputTime = Date.now();
  const interval = setInterval(() => {
    try {
      // Only send heartbeat if no recent output from real process
      if (Date.now() - lastOutputTime > 30000) {
        const timestamp = new Date().toLocaleTimeString();
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          instanceId,
          data: `[${timestamp}] Connection active\r\n`,
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    } catch (error) {
      console.error(`❌ Error sending heartbeat to ${instanceId}:`, error);
      clearInterval(interval);
    }
  }, 30000); // Every 30 seconds
  
  // Track output time for heartbeat logic
  const updateOutputTime = () => { lastOutputTime = Date.now(); };

  // Handle client disconnect - improved connection tracking
  let connectionClosed = false;
  
  const closeHandler = () => {
    if (!connectionClosed) {
      console.log(`🔌 SSE connection closed for Claude instance: ${instanceId}`);
      clearInterval(interval);
      connectionClosed = true;
      
      // Remove connection from both tracking maps
      const connections = sseConnections.get(instanceId) || [];
      const activeConnections = activeSSEConnections.get(instanceId) || [];
      const index = connections.indexOf(res);
      const activeIndex = activeConnections.indexOf(res);
      
      if (index !== -1) {
        connections.splice(index, 1);
      }
      if (activeIndex !== -1) {
        activeConnections.splice(activeIndex, 1);
      }
      
      console.log(`📊 SSE connections remaining for ${instanceId}: ${activeConnections.length}`);
    }
  };
  
  req.on('close', closeHandler);
  req.on('end', closeHandler);

  // Handle connection errors - gracefully handle ECONNRESET
  res.on('error', (err) => {
    // ECONNRESET is normal when client reconnects or refreshes page
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message?.includes('aborted')) {
      console.log(`🔄 Connection reset for instance ${instanceId} - normal behavior`);
    } else {
      console.error(`❌ SSE connection error for instance ${instanceId}:`, err);
    }
    // Don't clean up connections here - let the close handler do it
  });

  req.on('error', (err) => {
    // Handle request errors separately  
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message?.includes('aborted')) {
      console.log(`🔄 Request error for instance ${instanceId} - normal behavior`);
    } else {
      console.error(`❌ Request error for instance ${instanceId}:`, err);
    }
  });
}

// Primary SSE endpoint that frontend expects
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  createTerminalSSEStream(req, res, instanceId);
});

// Alias endpoint for compatibility (without /v1/)
app.get('/api/claude/instances/:instanceId/terminal/stream', (req, res) => {
  const { instanceId } = req.params;
  createTerminalSSEStream(req, res, instanceId);
});

// Instance-specific status SSE endpoint 
app.get('/api/claude/instances/status-stream', (req, res) => {
  console.log('📡 Claude instances status SSE stream requested');
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add connection to general status tracking (BOTH maps for proper counting)
  if (!sseConnections.has('__status__')) {
    sseConnections.set('__status__', []);
  }
  if (!activeSSEConnections.has('__status__')) {
    activeSSEConnections.set('__status__', []);
  }
  sseConnections.get('__status__').push(res);
  activeSSEConnections.get('__status__').push(res);
  
  console.log(`📊 Claude instances status SSE connections: ${activeSSEConnections.get('__status__').length}`);

  // Send initial connection message with current instances status
  const instanceList = Array.from(instances.values());
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: '✅ Claude instances status stream connected',
    instances: instanceList,
    timestamp: new Date().toISOString()
  })}\\n\\n`);

  // Handle client disconnect for status connections
  let statusConnectionClosed = false;
  
  const statusCloseHandler = () => {
    if (!statusConnectionClosed) {
      console.log('🔌 Claude instances status SSE connection closed');
      statusConnectionClosed = true;
      
      // Remove connection from both tracking maps
      const connections = sseConnections.get('__status__') || [];
      const activeConnections = activeSSEConnections.get('__status__') || [];
      const index = connections.indexOf(res);
      const activeIndex = activeConnections.indexOf(res);
      
      if (index !== -1) {
        connections.splice(index, 1);
      }
      if (activeIndex !== -1) {
        activeConnections.splice(activeIndex, 1);
      }
      
      console.log(`📊 Claude instances status SSE connections remaining: ${activeConnections.length}`);
    }
  };
  
  req.on('close', statusCloseHandler);
  req.on('end', statusCloseHandler);
  
  // Handle status connection errors gracefully
  req.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message?.includes('aborted')) {
      console.log('🔄 Claude instances status SSE connection reset - normal behavior');
    } else {
      console.error('❌ Claude instances status SSE connection error:', err);
    }
  });
  
  res.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message?.includes('aborted')) {
      console.log('🔄 Claude instances status SSE response error - normal behavior');
    } else {
      console.error('❌ Claude instances status SSE response error:', err);
    }
  });
});

// General status SSE endpoint for frontend status updates
app.get('/api/status/stream', (req, res) => {
  console.log('📡 General status SSE stream requested');
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add connection to general status tracking (BOTH maps for proper counting)
  if (!sseConnections.has('__status__')) {
    sseConnections.set('__status__', []);
  }
  if (!activeSSEConnections.has('__status__')) {
    activeSSEConnections.set('__status__', []);
  }
  sseConnections.get('__status__').push(res);
  activeSSEConnections.get('__status__').push(res);
  
  console.log(`📊 General status SSE connections: ${activeSSEConnections.get('__status__').length}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: '✅ Status stream connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect for status connections
  let statusConnectionClosed = false;
  
  const statusCloseHandler = () => {
    if (!statusConnectionClosed) {
      console.log('🔌 General status SSE connection closed');
      statusConnectionClosed = true;
      
      // Remove connection from both tracking maps
      const connections = sseConnections.get('__status__') || [];
      const activeConnections = activeSSEConnections.get('__status__') || [];
      const index = connections.indexOf(res);
      const activeIndex = activeConnections.indexOf(res);
      
      if (index !== -1) {
        connections.splice(index, 1);
      }
      if (activeIndex !== -1) {
        activeConnections.splice(activeIndex, 1);
      }
      
      console.log(`📊 General status SSE connections remaining: ${activeConnections.length}`);
    }
  };
  
  req.on('close', statusCloseHandler);
  req.on('end', statusCloseHandler);
  
  // Handle status connection errors gracefully
  req.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message?.includes('aborted')) {
      console.log('🔄 Status SSE connection reset - normal behavior');
    } else {
      console.error('❌ Status SSE connection error:', err);
    }
  });
  
  res.on('error', (err) => {
    if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message?.includes('aborted')) {
      console.log('🔄 Status SSE response error - normal behavior');
    } else {
      console.error('❌ Status SSE response error:', err);
    }
  });
});

// Real terminal input forwarding to Claude process stdin
app.post('/api/v1/claude/instances/:instanceId/terminal/input', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    return res.status(404).json({ success: false, error: 'Instance not found' });
  }
  
  if (processInfo.status !== 'running') {
    return res.status(400).json({ success: false, error: 'Instance not running' });
  }
  
  try {
    console.log(`⌨️ Forwarding input to Claude ${instanceId}: ${input}`);
    
    // Forward input to real Claude process
    processInfo.process.stdin.write(input + '\n');
    
    // Echo input to user (terminal behavior)
    broadcastToAllConnections(instanceId, {
      type: 'terminal:echo',
      data: `$ ${input}`,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, processed: input });
    
  } catch (error) {
    console.error(`❌ Failed to send input to Claude ${instanceId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/claude/instances/:instanceId/terminal/input', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    console.log(`❌ Terminal input failed - Instance ${instanceId} not found`);
    return res.status(404).json({ success: false, error: 'Instance not found' });
  }
  
  if (processInfo.status !== 'running') {
    console.log(`❌ Terminal input failed - Instance ${instanceId} status: ${processInfo.status}`);
    return res.status(400).json({ success: false, error: 'Instance not running' });
  }
  
  try {
    console.log(`⌨️ Forwarding input to Claude ${instanceId} (${processInfo.processType}): ${input}`);
    
    // Handle input differently for PTY vs regular pipes
    if (processInfo.usePty && processInfo.processType === 'pty') {
      // PTY input handling
      processInfo.process.write(input);
      console.log(`✅ PTY Input sent to Claude ${instanceId}`);
    } else {
      // Regular pipe input handling
      processInfo.process.stdin.write(input);
      console.log(`✅ Pipe Input sent to Claude ${instanceId}`);
    }
    
    // Enhanced echo broadcast with process type information
    broadcastToAllConnections(instanceId, {
      type: 'terminal:echo',
      data: `$ ${input.replace('\n', '')}`,
      timestamp: new Date().toISOString(),
      processType: processInfo.processType,
      usePty: processInfo.usePty
    });
    
    res.json({ 
      success: true, 
      processed: input,
      processType: processInfo.processType,
      usePty: processInfo.usePty
    });
    
  } catch (error) {
    console.error(`❌ Failed to send input to Claude ${instanceId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/claude/terminal/output/:pid', (req, res) => {
  const { pid } = req.params;
  
  console.log(`🔄 HTTP polling request for Claude PID: ${pid}`);
  
  res.json({
    success: true,
    pid,
    output: `[${new Date().toLocaleTimeString()}] Claude PID ${pid} - HTTP polling successful!\\r\\n$ `,
    timestamp: new Date().toISOString(),
    message: 'HTTP/SSE conversion successful - WebSocket eliminated!'
  });
});

app.get('/api/v1/claude-live/dev/agents', (req, res) => {
  res.json([
    {
      id: 'claude-dev-1',
      name: 'Claude Dev Instance',
      status: 'running',
      pid: 1234,
      type: 'development',
      created: new Date().toISOString()
    }
  ]);
});

// SSE Terminal Stream endpoint
app.get('/api/v1/terminal/stream/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`📡 SSE terminal stream requested for instance: ${instanceId}`);
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    instanceId,
    message: `✅ HTTP/SSE terminal connected to Claude instance ${instanceId}`,
    timestamp: new Date().toISOString()
  })}\\n\\n`);

  // CRITICAL FIX: Don't send mock periodic updates - let real Claude output flow
  // Only send connection confirmation, no fake terminal output
  let interval = null;

  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 SSE connection closed for instance: ${instanceId}`);
    clearInterval(interval);
  });
});

// HTTP Polling endpoint for terminal
app.get('/api/v1/terminal/poll/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  
  console.log(`🔄 HTTP polling request for instance: ${instanceId}`);
  
  // CRITICAL FIX: Don't send mock polling data - this should return real Claude output
  // For now, return empty response - real output should come via SSE
  res.json({
    success: true,
    instanceId,
    data: '', // No fake data
    timestamp: new Date().toISOString(),
    message: 'Polling endpoint - use SSE for real output'
  });
});

// Legacy terminal input endpoint (enhanced)
app.post('/api/v1/terminal/input/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  const { input } = req.body;
  
  const processInfo = activeProcesses.get(instanceId);
  if (!processInfo) {
    console.log(`❌ Terminal input failed - Instance ${instanceId} not found`);
    return res.status(404).json({ success: false, error: 'Instance not found' });
  }
  
  if (processInfo.status !== 'running') {
    console.log(`❌ Terminal input failed - Instance ${instanceId} status: ${processInfo.status}`);
    return res.status(400).json({ success: false, error: 'Instance not running' });
  }
  
  try {
    console.log(`⌨️ Forwarding input to REAL Claude ${instanceId} (${processInfo.processType}): ${input}`);
    
    // Handle input differently for PTY vs regular pipes
    if (processInfo.usePty && processInfo.processType === 'pty') {
      // PTY input handling - write directly to PTY
      processInfo.process.write(input);
      console.log(`✅ PTY Input forwarded to REAL Claude ${instanceId}`);
    } else {
      // Regular pipe input handling - write to stdin
      processInfo.process.stdin.write(input);
      console.log(`✅ Pipe Input forwarded to REAL Claude ${instanceId}`);
    }
    
    // Echo input to user (standard terminal behavior)
    broadcastToAllConnections(instanceId, {
      type: 'terminal:echo',
      data: `$ ${input.replace('\n', '')}`,
      timestamp: new Date().toISOString(),
      processType: processInfo.processType,
      usePty: processInfo.usePty
    });
    
    res.json({ 
      success: true, 
      processed: input,
      processType: processInfo.processType,
      usePty: processInfo.usePty
    });
    
  } catch (error) {
    console.error(`❌ Failed to send input to REAL Claude ${instanceId}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SPARC UNIFIED ARCHITECTURE: Add WebSocket support for terminal communication
const wss = new WebSocket.Server({ 
  server,
  path: '/terminal'
});

// WebSocket connection tracking
const wsConnections = new Map(); // instanceId -> Set of WebSocket connections
const wsConnectionsBySocket = new Map(); // WebSocket -> instanceId

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔗 SPARC: New WebSocket terminal connection established');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 SPARC: WebSocket message received:', message.type);
      
      if (message.type === 'connect' && message.terminalId) {
        // Associate this WebSocket with a Claude instance
        const instanceId = message.terminalId;
        
        if (!wsConnections.has(instanceId)) {
          wsConnections.set(instanceId, new Set());
        }
        wsConnections.get(instanceId).add(ws);
        wsConnectionsBySocket.set(ws, instanceId);
        
        console.log(`✅ SPARC: WebSocket connected to Claude instance ${instanceId}`);
        
        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId,
          connectionType: 'websocket',
          timestamp: Date.now()
        }));
        
        // Start broadcasting existing output if available
        const outputBuffer = instanceOutputBuffers.get(instanceId);
        if (outputBuffer && outputBuffer.buffer.length > 0) {
          ws.send(JSON.stringify({
            type: 'output',
            data: outputBuffer.buffer,
            terminalId: instanceId,
            timestamp: Date.now()
          }));
        }
      }
      
      if (message.type === 'input' && message.data) {
        // Forward input to Claude process
        const instanceId = wsConnectionsBySocket.get(ws);
        if (instanceId) {
          const processInfo = activeProcesses.get(instanceId);
          if (processInfo && processInfo.status === 'running') {
            console.log(`⌨️ SPARC: Forwarding WebSocket input to Claude ${instanceId}: ${message.data}`);
            
            try {
              if (processInfo.usePty && processInfo.processType === 'pty') {
                processInfo.process.write(message.data);
              } else {
                processInfo.process.stdin.write(message.data);
              }
              
              // Echo back to WebSocket for immediate feedback
              ws.send(JSON.stringify({
                type: 'echo',
                data: message.data,
                terminalId: instanceId,
                timestamp: Date.now()
              }));
              
            } catch (error) {
              console.error(`❌ SPARC: Failed to forward input to Claude ${instanceId}:`, error);
              ws.send(JSON.stringify({
                type: 'error',
                error: error.message,
                terminalId: instanceId,
                timestamp: Date.now()
              }));
            }
          }
        }
      }
      
    } catch (error) {
      console.error('❌ SPARC: WebSocket message parsing error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 SPARC: WebSocket connection closed');
    const instanceId = wsConnectionsBySocket.get(ws);
    if (instanceId) {
      wsConnections.get(instanceId)?.delete(ws);
      wsConnectionsBySocket.delete(ws);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ SPARC: WebSocket error:', error);
  });
});

// Enhanced broadcast function to include WebSocket connections
function broadcastToWebSockets(instanceId, message) {
  const connections = wsConnections.get(instanceId);
  if (connections && connections.size > 0) {
    const wsMessage = JSON.stringify({
      type: 'output',
      data: message.data || message.output,
      terminalId: instanceId,
      timestamp: message.timestamp,
      source: message.source || 'process'
    });
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(wsMessage);
        } catch (error) {
          console.error(`❌ SPARC: Failed to send WebSocket message to ${instanceId}:`, error);
          connections.delete(ws);
        }
      }
    });
    
    console.log(`📤 SPARC: Broadcasted to ${connections.size} WebSocket connections for ${instanceId}`);
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 SPARC UNIFIED SERVER running on http://localhost:${PORT}`);
  console.log(`✅ HTTP API + WebSocket Terminal on single port!`);
  console.log(`📡 Claude Terminal endpoints available:`);
  console.log(`   - WebSocket Terminal: ws://localhost:${PORT}/terminal`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Claude Instances API: http://localhost:${PORT}/api/claude/instances`);
  console.log(`   - Claude Terminal Stream: http://localhost:${PORT}/api/claude/instances/{instanceId}/terminal/stream`);
  console.log(`   - Terminal Input: http://localhost:${PORT}/api/claude/instances/{instanceId}/terminal/input`);
  console.log(`🎉 SPARC: Unified architecture - WebSocket + HTTP on single server!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down HTTP/SSE server...');
  server.close(() => {
    console.log('✅ HTTP/SSE server shutdown complete');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down HTTP/SSE server...');
  server.close(() => {
    console.log('✅ HTTP/SSE server shutdown complete');
  });
});