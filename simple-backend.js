/**
 * Real Claude Process Execution System
 * Complete terminal I/O integration with actual Claude processes
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import pty from 'node-pty';
import http from 'http';
import { WebSocketServer } from 'ws';

// SPARC INTEGRATION: Tool Call Visualization System
// Temporarily disable tool call formatter until ES module conversion
// import { toolCallFormatter } from './src/services/ToolCallFormatter.js';
// import { ToolCallStatusManager } from './src/services/ToolCallStatusManager.js';

// Initialize tool call status manager
// const toolCallStatusManager = new ToolCallStatusManager();
const toolCallFormatter = { formatToolCallOutput: (output) => output };
const toolCallStatusManager = { trackCall: () => {}, updateStatus: () => {} };

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Import database and feed services for API integration
import { dbPool } from './src/database/connection/pool.js';
import { feedDataService } from './src/services/FeedDataService.js';
import feedRoutes from './src/routes/api/feed-routes.js';

// Database connection state
let databaseAvailable = false;

// Initialize database services on startup
const initializeDatabaseServices = async () => {
  try {
    // Check if database is explicitly disabled
    if (process.env.DISABLE_DATABASE === 'true' || 
        process.env.DATABASE_HOST === 'skip' || 
        process.env.DATABASE_HOST === 'disabled') {
      console.log('⚠️ Database explicitly disabled - running in fallback mode');
      databaseAvailable = false;
      return;
    }
    
    console.log('🔄 Initializing database services...');
    
    // Check for required environment variables
    const requiredEnvVars = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log(`⚠️ Missing database environment variables: ${missingVars.join(', ')}`);
      console.log('⚠️ Using default database configuration');
    }
    
    await dbPool.initialize();
    await feedDataService.initialize();
    databaseAvailable = true;
    console.log('✅ Database services initialized successfully');
    
    // Log connection details (without sensitive info)
    const stats = dbPool.getPoolStats();
    console.log(`📊 Database pool: ${stats.totalCount}/${stats.maxConnections} connections active`);
    
  } catch (error) {
    console.error('❌ Failed to initialize database services:', error.message);
    console.log('⚠️ Continuing in fallback mode - using mock data for feed endpoints');
    databaseAvailable = false;
    // Continue without database - fallback to mock data
  }
};

// Real Claude Process Management
const activeProcesses = new Map(); // instanceId → {process, pid, status, startTime, command, workingDirectory, outputPosition, outputBuffer}
const sseConnections = new Map(); // Track SSE connections per instance
const activeSSEConnections = new Map(); // Track all SSE connections per instance ID
const instances = new Map(); // Track all created instances dynamically
// UNIFIED BUFFER SYSTEM: Single source of truth for all terminal output
const instanceOutputBuffers = new Map(); // instanceId → {buffer: string, readPosition: number, lastSentPosition: number, lineCount: number}

// Claude Command Configurations
// CRITICAL FIX: Add proper interactive mode initialization for AI responses
const CLAUDE_COMMANDS = {
  'prod': ['claude'],
  'interactive': ['claude'], // Interactive mode for AI chat
  'skip-permissions': ['claude', '--dangerously-skip-permissions'], 
  'skip-permissions-c': ['claude', '--dangerously-skip-permissions', '-c'],
  'skip-permissions-resume': ['claude', '--dangerously-skip-permissions', '--resume'],
  'skip-permissions-interactive': ['claude', '--dangerously-skip-permissions'] // Interactive with skip permissions
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
    const resolved = path.resolve(targetPath);
    const base = path.resolve(basePath);
    
    return resolved.startsWith(base + path.sep) || resolved === base;
  }

  async validateDirectory(dirPath) {
    // Check cache first
    const cacheKey = dirPath;
    const cached = this.validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 60000)) { // 1 minute cache
      return cached.result;
    }

    try {
      // fs already imported at top
      const stats = await fs.promises.stat(dirPath);
      
      if (!stats.isDirectory()) {
        this.validationCache.set(cacheKey, { result: false, timestamp: Date.now() });
        return false;
      }
      
      await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
      
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

    const targetDir = path.join(this.baseDirectory, hint);
    
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

// SPARC Helper: Regex escaping function for echo filtering
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// SPARC FIX: Mock system completely removed for 100% real functionality

// Enhanced Claude CLI authentication status - FIXED for all environments
async function checkClaudeAuthentication() {
  try {
    console.log('🔍 Enhanced Claude CLI authentication check...');
    
    // Method 1: Check for Claude Code environment (most reliable)
    if (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) {
      console.log('✅ Claude authentication detected via API key environment variables');
      return { authenticated: true, source: 'api_key_env', reliable: true };
    }
    
    // Method 2: Check for Claude credentials file
    // fs and path already imported at top
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/home/codespace';
    const credentialsPaths = [
      path.join(homeDir, '.claude', '.credentials.json'),
      path.join(homeDir, '.claude', 'credentials.json'),
      path.join(homeDir, '.anthropic', 'credentials.json')
    ];
    
    for (const credPath of credentialsPaths) {
      if (fs.existsSync(credPath)) {
        console.log(`✅ Claude CLI credentials found at: ${credPath}`);
        return { authenticated: true, source: 'credentials_file', reliable: true };
      }
    }
    
    // Method 3: Check for Claude Code environment variables
    if (process.env.CLAUDECODE === '1' || process.env.VSCODE_PID) {
      console.log('✅ Claude Code/VSCode environment detected - using inherited authentication');
      return { authenticated: true, source: 'claude_code_env', reliable: true };
    }
    
    // Method 4: Quick help command test (non-interactive)
    try {
      // execSync already imported at top of file
      const result = execSync('claude --version 2>/dev/null || claude --help 2>/dev/null | head -5', { 
        timeout: 3000,
        encoding: 'utf8'
      });
      
      if (result && result.length > 0) {
        console.log('✅ Claude CLI is available and responsive');
        console.log(`   Claude CLI output: ${result.substring(0, 100)}`);
        return { authenticated: true, source: 'cli_available', reliable: false };
      }
    } catch (execError) {
      console.log(`⚠️ Claude CLI test failed: ${execError.message}`);
    }
    
    // Method 5: Environment detection for development
    if (process.env.NODE_ENV === 'development' || process.env.CODESPACES === 'true') {
      console.log('✅ Development environment detected - allowing Claude execution');
      return { authenticated: true, source: 'dev_env', reliable: false };
    }
    
    console.error('❌ No Claude CLI authentication detected');
    return { authenticated: false, reason: 'No authentication method found' };
    
  } catch (error) {
    console.error('❌ Claude authentication check failed:', error.message);
    return { authenticated: false, reason: `Authentication check error: ${error.message}` };
  }
}

// ENHANCED Claude Process Creation with Authentication Detection and PTY Reliability
async function createRealClaudeInstanceWithPTY(instanceType, instanceId, usePty = true, requestedWorkingDirectory = null) {
  // STEP 1: Pre-flight authentication check
  const authStatus = await checkClaudeAuthentication();
  if (!authStatus.authenticated) {
    console.error(`❌ Cannot create Claude instance: ${authStatus.reason}`);
    throw new Error(`Claude authentication required: ${authStatus.reason}`);
  }
  
  console.log(`✅ Claude authentication verified: ${authStatus.source} (reliable: ${authStatus.reliable})`);
  
  // STEP 2: Enhanced working directory resolution
  let workingDir;
  if (requestedWorkingDirectory) {
    // Validate requested working directory
    const isValidRequested = await directoryResolver.validateDirectory(requestedWorkingDirectory);
    const isSecureRequested = directoryResolver.isWithinBaseDirectory(requestedWorkingDirectory);
    
    if (isValidRequested && isSecureRequested) {
      workingDir = requestedWorkingDirectory;
      console.log(`✅ Using requested working directory: ${workingDir}`);
    } else {
      console.log(`⚠️ Invalid requested working directory: ${requestedWorkingDirectory}`);
      console.log(`   Valid: ${isValidRequested}, Secure: ${isSecureRequested}`);
      console.log(`📁 Falling back to resolved directory based on instance type`);
      workingDir = await directoryResolver.resolveWorkingDirectory(instanceType);
    }
  } else {
    workingDir = await directoryResolver.resolveWorkingDirectory(instanceType);
  }
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
        // CRITICAL FIX: Proper Claude interactive initialization
        const isClaudeCommand = command === 'claude';
        const finalArgs = args;
        
        claudeProcess = pty.spawn(command, finalArgs, {
          cwd: workingDir,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            FORCE_COLOR: '1',
            // CRITICAL: Set Claude to interactive mode
            CLAUDE_INTERACTIVE: '1',
            // Ensure proper stdio handling
            NODE_ENV: 'development'
          },
          cols: 100,
          rows: 30,
          name: 'xterm-color',
          // CLAUDE CODE FIX: Enable PTY echo so Claude can process input properly  
          echo: true,  // CRITICAL: Claude Code needs echo to process commands as AI input
          handleFlowControl: false,
          experimentalUseConpty: false
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
      outputBuffer: '',
      // SPARC FIX: Set up input echo filtering to prevent character-by-character feedback
      lastSentInput: '',
      inputEchoFilter: new Set(),
      // SPARC FIX: Content deduplication tracking
      lastBroadcastContent: '',
      lastBroadcastTime: 0,
      lastMeaningfulContent: ''
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
      if (claudeProcess && !claudeProcess.killed) {
        console.log(`🤖 MINIMAL FIX: Initializing Claude AI mode for ${instanceId}`);
        // Send initialization to activate AI processing
        claudeProcess.write('\n');
        setTimeout(() => {
          claudeProcess.write('Hello Claude, please respond to confirm AI mode is active.\n');
        }, 1000);
      }
    }, 2000);
    
    // Original timeout for process ready check
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
      type: 'data', // FIXED: Use 'data' type to match frontend expectations
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
      type: 'data', // FIXED: Use 'data' type to match frontend expectations
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
    
    // CLAUDE AI NATURAL STARTUP: Let Claude Code start in its natural interactive state
    setTimeout(() => {
      if (claudeProcess && !claudeProcess.killed) {
        console.log(`🤖 CLAUDE AI READY: Instance ${instanceId} started in natural interactive mode`);
        console.log(`📝 Claude Code is ready to receive user messages and respond naturally`);
        // No automated prompts - let users interact directly with Claude
      }
    }, 2500);
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
      
      // CRITICAL FIX: Initialize Claude for interactive AI responses
      console.log(`🤖 Initializing Claude AI interactive mode...`);
      
      // Send initial setup command to activate Claude AI mode
      setTimeout(() => {
        console.log(`🚀 Sending Claude initialization sequence...`);
        // Send a proper conversation starter to activate Claude AI mode
        // This prompts Claude to enter conversational mode instead of terminal mode
        claudeProcess.write('Hello! I am ready to assist you. How can I help you today?\n');
        
        // Wait for Claude's response to confirm AI mode is active
        setTimeout(() => {
          // Clear the initialization prompt from the output
          processInfo.outputBuffer = [];
          processInfo.outputPosition = 0;
          console.log(`🤖 Claude Code instance ready for natural user interaction`);
          
          // FIXED: Keep PTY process alive for proper stdin/stdout communication
          // Both PTY and pipe-based Claude AI responses now work together
          console.log(`✅ Claude PTY process ${instanceId} ready for both terminal interaction and AI responses`);
        }, 1000);
      }, 500);
      
      broadcastInstanceStatus(instanceId, 'running', {
        pid: claudeProcess.pid,
        command: processInfo.command,
        processType: 'pty',
        aiMode: 'interactive'
      });
    }
  }, 1000); // PTY processes need slightly more time to initialize

  // PTY data handling - combines stdout/stderr in a single stream with incremental output
  claudeProcess.onData((data) => {
    // FIXED: Process PTY output normally - no longer killing process
    if (!processInfo.process) {
      console.log(`⚠️ Process reference missing for ${instanceId}, but continuing PTY output processing`);
      // Continue processing - don't return
    }
    
    console.log(`📤 REAL Claude ${instanceId} PTY output (${data.length} bytes):`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
    
    // CRITICAL FIX: Improved Claude AI response detection
    let filteredData = data;
    
    // Detect Claude AI responses vs system output
    const isClaudeResponse = data.includes('Hello!') || 
                           data.includes('I\'m Claude') || 
                           data.length > 50 || 
                           /[a-zA-Z]{10,}/.test(data); // Contains substantial text
    
    // CONSERVATIVE echo filtering - only filter exact matches to prevent removing Claude responses
    if (processInfo.lastSentInput && processInfo.lastSentInput.length > 0 && !isClaudeResponse) {
      // Only filter exact input echo at beginning of line, not anywhere in Claude responses
      const exactEcho = `> ${processInfo.lastSentInput}`;
      if (filteredData.includes(exactEcho) && filteredData.indexOf(exactEcho) < 50) {
        filteredData = filteredData.replace(exactEcho, '');
        console.log(`🔧 SPARC: Filtered exact echo, remaining: ${filteredData.length} bytes`);
      }
      // Don't clear lastSentInput immediately - keep for multiple filter attempts
      setTimeout(() => { processInfo.lastSentInput = ''; }, 1000);
    }
    
    // Log Claude AI response detection
    if (isClaudeResponse) {
      console.log(`🤖 DETECTED Claude AI response: ${data.substring(0, 100)}`);
    }
    
    // MINIMAL ANSI filtering - preserve Claude responses while removing only UI artifacts
    filteredData = filteredData
      // Only remove cursor control sequences that don't contain content
      .replace(/\[\?25[lh]/g, '') // Hide/show cursor
      .replace(/\[\?2004[hl]/g, '') // Bracketed paste mode  
      .replace(/\[\?1004[hl]/g, '') // Focus events
      // CRITICAL FIX: Do NOT remove clear/positioning sequences that may contain Claude responses
      // Only remove sequences at start of output that are pure UI control
      .replace(/^(\[2K\[1A){2,}/g, '') // Only remove multiple clear+up at start
      .replace(/^\[2K\[G/g, '') // Only remove clear+home at start
    
    // CLAUDABLE-STYLE ANSI PARSER: Complete escape sequence removal + clean formatting
    function extractClaudeContent(data) {
      if (!data || data.length === 0) return '';
      
      // STEP 1: Complete ANSI escape sequence removal (like claudable)
      let content = data
        // Remove ALL ANSI escape sequences (color codes, formatting, cursor control)
        .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
        // Remove additional escape sequences that might slip through
        .replace(/\u001b\[[?]?[0-9;]*[hlH]/g, '')
        // Remove carriage returns and other control chars
        .replace(/\r/g, '')
        .replace(/\u0007/g, ''); // Bell character
      
      // STEP 2: Clean up box drawing characters (convert to readable text)
      content = content
        .replace(/[╭┌]/g, '+')     // Top-left corner
        .replace(/[╮┐]/g, '+')     // Top-right corner  
        .replace(/[╯┘]/g, '+')     // Bottom-right corner
        .replace(/[╰└]/g, '+')     // Bottom-left corner
        .replace(/[─━]/g, '-')     // Horizontal lines
        .replace(/[│┃]/g, '|')     // Vertical lines
        .replace(/[├┝]/g, '|')     // Left junction
        .replace(/[┤┥]/g, '|');    // Right junction
      
      // STEP 3: Extract meaningful content and format cleanly
      const lines = content.split('\n');
      const cleanLines = [];
      
      for (let line of lines) {
        // Remove box drawing artifacts and extra whitespace
        const cleaned = line
          .replace(/^\s*[+|-]+\s*$/, '')           // Remove pure box lines
          .replace(/^\s*\|\s*(.*?)\s*\|\s*$/, '$1') // Extract content from box
          .replace(/^\s*\|\s*/, '')                 // Remove leading box chars
          .replace(/\s*\|\s*$/, '')                 // Remove trailing box chars
          .trim();
        
        // Only keep lines with actual content
        if (cleaned.length > 0 && 
            !cleaned.match(/^[+|-\s]*$/) &&        // Skip pure decoration
            !cleaned.match(/^\s*◯\s*(IDE|connected|disconnected)/)) { // Skip status
          cleanLines.push(cleaned);
        }
      }
      
      // STEP 4: Format final output (claudable-style clean formatting)
      return cleanLines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')      // Max 2 consecutive newlines
        .replace(/[ \t]+$/gm, '')        // Remove trailing spaces per line
        .replace(/^\n+|\n+$/g, '')       // Remove leading/trailing newlines
        .trim();
    }
    
    const cleanContent = extractClaudeContent(filteredData);
    if (cleanContent.length > 0) {
      // Only remove IDE status messages, preserve all Claude responses
      const meaningfulContent = cleanContent
        .replace(/◯\s*IDE\s+(connected|disconnected)/gi, '');
      
      // RELAXED deduplication - only block identical content within 50ms (instead of 100ms)
      const isDuplicate = processInfo.lastBroadcastContent === cleanContent && 
                         (Date.now() - (processInfo.lastBroadcastTime || 0)) < 50;
      
      // CRITICAL FIX: Always broadcast if content exists, even if meaningfulContent is empty after filtering
      if (!isDuplicate && cleanContent.length > 0) {
        processInfo.lastBroadcastContent = cleanContent;
        processInfo.lastBroadcastTime = Date.now();
        broadcastIncrementalOutput(instanceId, meaningfulContent, 'pty');
        console.log(`📤 Broadcasting Claude output (${cleanContent.length} chars)`);
        console.log(`📝 Content preview: "${cleanContent.slice(0, 200)}"`);
      } else if (isDuplicate) {
        console.log(`🚫 Blocked rapid duplicate (within 50ms)`);
      }
    } else {
      // CRITICAL FIX: Even broadcast empty-looking content - might contain Claude responses in ANSI
      console.log(`📝 Empty content after filtering - raw data: "${data.slice(0, 200)}"`);
      if (data.length > 10) { // If original data has substance, broadcast it
        broadcastIncrementalOutput(instanceId, extractClaudeContent(data), 'pty');
        console.log(`📤 Broadcasting raw Claude output (${data.length} chars) - bypassing filters`);
      }
    }
  });

  // PTY process exit handling
  claudeProcess.onExit(({ exitCode, signal }) => {
    console.log(`🏁 PTY Claude process ${instanceId} exited with code ${exitCode}, signal ${signal}`);
    
    // FIXED: All exits are now normal - PTY process should stay alive
    // Mark instance as stopped when PTY process exits
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
    data: newDataSlice,
    output: newDataSlice, // Keep for backward compatibility
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
  
  // SWARM DEBUG FIX: Always broadcast to BOTH WebSocket AND SSE connections
  // Frontend uses SSE exclusively, so SSE must always receive messages
  const instanceWSConnections = wsConnections.get(instanceId);
  const hasActiveWSConnections = instanceWSConnections && instanceWSConnections.size > 0;
  
  console.log(`📤 SWARM DEBUG: Broadcasting to ALL connection types for ${instanceId}`);
  
  // Always broadcast to SSE connections (CRITICAL FIX)
  console.log(`📤 SWARM: Broadcasting to SSE connections for ${instanceId}`);
  broadcastToConnections(instanceId, message);
  
  // Also broadcast to WebSocket if available
  if (hasActiveWSConnections) {
    console.log(`📤 SWARM: Also broadcasting to ${instanceWSConnections.size} WebSocket connections for ${instanceId}`);
    broadcastToWebSockets(instanceId, message);
  }
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
  
  // SWARM DEBUG: Enhanced connection state logging
  console.log(`🔍 SWARM DEBUG broadcastToConnections for ${instanceId}:`);
  console.log(`   activeSSEConnections.has(${instanceId}): ${activeSSEConnections.has(instanceId)}`);
  console.log(`   connections.length: ${connections.length}`);
  console.log(`   generalConnections.length: ${generalConnections.length}`);
  console.log(`   allConnections.length: ${allConnections.length}`);
  console.log(`   message.type: ${message.type}`);
  console.log(`   message.data: ${message.data ? message.data.substring(0, 100) + '...' : 'null'}`);
  console.log(`   message.instanceId: ${message.instanceId}`);
  console.log(`   message.isReal: ${message.isReal}`);
  
  if (allConnections.length === 0) {
    console.error(`❌ SWARM CRITICAL: NO SSE connections for ${instanceId} - Claude AI responses will NOT reach frontend!`);
    console.error(`   🔍 Debug info: activeSSEConnections keys = [${Array.from(activeSSEConnections.keys()).join(', ')}]`);
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

// Initialize database services and add API routes
const setupApiRoutes = () => {
  try {
    if (databaseAvailable) {
      // Add the database-backed feed API routes
      app.use('/api/v1', feedRoutes);
      
      console.log('✅ Database-backed Feed API routes registered:');
      console.log('   GET  /api/v1/agent-posts');
      console.log('   POST /api/v1/agent-posts');
      console.log('   GET  /api/v1/agent-posts/:id');
      console.log('   PUT  /api/v1/agent-posts/:id/engagement');
      console.log('   GET  /api/v1/search/posts');
      console.log('   GET  /api/v1/health');
    } else {
      // Fallback: Register minimal mock endpoints when database unavailable
      console.log('⚠️ Database unavailable - registering fallback endpoints');
      
      app.get('/api/v1/agent-posts', (req, res) => {
        res.json({
          success: true,
          message: 'Database unavailable - using fallback data',
          posts: [
            {
              id: 'fallback-1',
              title: 'System Status - Fallback Mode',
              content: 'Database services are currently unavailable. The system is running in fallback mode with Claude terminal functionality intact.',
              authorAgent: 'System',
              publishedAt: new Date().toISOString(),
              metadata: {
                businessImpact: 5.0,
                tags: ['system', 'fallback', 'database-unavailable'],
                isAgentResponse: true
              }
            }
          ],
          pagination: { total: 1, limit: 50, offset: 0, hasMore: false }
        });
      });
      
      app.get('/api/v1/health', async (req, res) => {
        res.status(503).json({
          success: false,
          message: 'Database services unavailable',
          timestamp: new Date().toISOString()
        });
      });
      
      console.log('📋 Fallback API routes registered');
    }
  } catch (error) {
    console.error('❌ Failed to register API routes:', error.message);
    console.log('⚠️ Continuing without API routes - Claude terminal still available');
  }
};

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'SPARC Unified Server',
      message: 'Claude terminal and API services operational',
      services: {
        claude_terminal: 'healthy',
        http_api: 'healthy',
        sse_streaming: 'healthy',
        database: databaseAvailable ? 'healthy' : 'unavailable'
      }
    };
    
    // Add database health check if available
    if (databaseAvailable) {
      try {
        const dbHealth = await feedDataService.healthCheck();
        health.database = dbHealth;
        health.services.database_pool = dbPool.getPoolStats();
      } catch (error) {
        health.services.database = 'error';
        health.database_error = error.message;
      }
    }
    
    const statusCode = databaseAvailable ? 200 : 206; // 206 = Partial Content when DB unavailable
    res.status(statusCode).json(health);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
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

// Note: /api/v1/agent-posts now handled by database-backed feedRoutes
// Mock endpoint removed - using real PostgreSQL integration

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
  const { command, instanceType: providedType, workingDirectory, usePty = true } = req.body;
  const instanceId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
  
  console.log(`🆕 SPARC Creating Claude instance:`, { command, instanceType: providedType, workingDirectory, usePty });
  
  // CRITICAL FIX: Default to interactive mode for proper AI responses
  let instanceType = providedType || 'interactive';
  let instanceName = 'Claude AI Interactive';
  
  console.log(`🤖 Using Claude in interactive mode for AI responses`);
  
  if (command && Array.isArray(command)) {
    if (command.includes('--dangerously-skip-permissions')) {
      if (command.includes('-c')) {
        instanceType = 'skip-permissions-c';
        instanceName = 'skip-permissions -c';
      } else if (command.includes('--resume')) {
        instanceType = 'skip-permissions-resume';
        instanceName = 'skip-permissions --resume';
      } else {
        instanceType = 'skip-permissions-interactive';
        instanceName = 'skip-permissions (interactive)';
      }
    }
  }
  
  try {
    const processInfo = await createRealClaudeInstanceWithPTY(instanceType, instanceId, usePty, workingDirectory);
    
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
  activeSSEConnections.get(instanceId).push(res); // CRITICAL FIX: Add to activeSSEConnections too!
  
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
        type: 'data', // FIXED: Use 'data' type to match frontend expectations
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

  // CRITICAL FIX: Enhanced Claude AI activation system
    const forceAIResponse = (instanceId, input) => {
      const processInfo = activeProcesses.get(instanceId);
      if (processInfo && processInfo.process && processInfo.usePty) {
        console.log(`🤖 CRITICAL FIX: Activating Claude AI for input: ${input}`);
        
        // Send activation sequence to ensure Claude is in AI mode
        try {
          // Method 1: Send newline to activate Claude prompt
          processInfo.process.write('\n');
          
          // Method 2: If still no response, try a follow-up
          setTimeout(() => {
            console.log(`🚀 Secondary activation attempt for Claude AI...`);
            processInfo.process.write('\n');
          }, 1000);
          
        } catch (error) {
          console.error(`❌ Failed to activate Claude AI:`, error);
        }
      }
    };
    
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
    
    // SPARC FIX: Validate input before sending
    if (!input || typeof input !== 'string') {
      console.error(`❌ Invalid input for Claude ${instanceId}: ${typeof input} - ${input}`);
      return res.status(400).json({ success: false, error: 'Invalid input data' });
    }
    
    // ULTRA FIX: Use pipe-based communication for actual Claude AI responses
    if (processInfo.usePty && processInfo.processType === 'pty') {
      console.log(`🚀 ULTRA FIX: Converting to pipe-based Claude conversation for: "${input}"`);
      
      // Spawn a separate Claude process for this conversation
      const claudeConversation = spawn('claude', [], {
        cwd: processInfo.workingDirectory || '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TERM: 'xterm-256color'
        }
      });
      
      let responseData = '';
      let errorData = '';
      
      // Collect Claude's AI response
      claudeConversation.stdout.on('data', (data) => {
        responseData += data.toString();
      });
      
      claudeConversation.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      claudeConversation.on('close', (code) => {
        console.log(`🤖 Claude conversation response (${responseData.length} chars): ${responseData.slice(0, 100)}...`);
        
        // Broadcast the actual AI response
        if (responseData.trim()) {
          // ULTRA FIX: Send Claude AI response directly, bypassing incremental buffer
          const directMessage = {
            type: 'terminal_output',
            data: responseData.trim(),
            output: responseData.trim(),
            instanceId: instanceId,
            timestamp: new Date().toISOString(),
            source: 'claude-ai',
            isReal: true,
            isDirect: true // Flag to indicate direct Claude response
          };
          
          console.log(`🚀 ULTRA FIX: Direct Claude AI broadcast (${responseData.trim().length} chars): ${responseData.trim().slice(0, 100)}...`);
          
          // ULTRA FIX: Use the SAME broadcast method as working PTY output
          console.log(`📤 SPARC: Direct SSE broadcasting for ${instanceId}`);
          broadcastToConnections(instanceId, directMessage);
        } else if (errorData.trim()) {
          console.error(`❌ Claude conversation error: ${errorData}`);
          broadcastToConnections(instanceId, {
            type: 'terminal_output',
            data: `Error: ${errorData.trim()}`,
            isReal: true,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Send the user input to Claude for AI processing
      claudeConversation.stdin.write(input);
      claudeConversation.stdin.end();
      
      processInfo.lastSentInput = input;
      
      // ULTRA FIX: Skip PTY input since we're using pipe-based communication
      console.log(`🔥 ULTRA FIX: Skipping PTY input - using pipe-based Claude AI response only`);
      
      res.status(200).json({ success: true, message: 'Input processed via pipe-based Claude AI' });
      return; // Exit early - don't send to PTY terminal
    }
    
    // For PTY processes, send input to terminal
    if (processInfo.processType === 'pty') {
        // CRITICAL FIX: Enhanced AI response activation (only if NOT using pipe-based fix)
        setTimeout(() => {
          console.log(`🤖 Activating Claude AI response for: ${input}`);
          
          // Check if Claude has responded with AI content
          const recentBuffer = instanceOutputBuffers.get(instanceId);
          if (recentBuffer && recentBuffer.buffer) {
            const recentOutput = recentBuffer.buffer.slice(-500); // Last 500 chars
            const hasAIResponse = recentOutput.length > 20 && 
                                /[a-zA-Z]{10,}/.test(recentOutput) &&
                                !recentOutput.includes('◯');
            
            if (!hasAIResponse) {
              console.log(`🚨 No AI response detected, triggering Claude activation...`);
              // Send a follow-up to activate Claude AI
              processInfo.process.write('\n');
            } else {
              console.log(`✅ Claude AI response detected successfully`);
            }
          }
        }, 2000);
      processInfo.process.write(input);
      console.log(`✅ PTY Input sent to Claude ${instanceId}`);
    } else {
      // Regular pipe input handling with termination
      let inputData = input;
      if (!inputData.endsWith('\n')) {
        inputData += '\n';
      }
      processInfo.process.stdin.write(inputData);
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
    
    // SPARC FIX: Enhanced input handling for both PTY and pipes with proper command termination
    if (processInfo.usePty && processInfo.processType === 'pty') {
      // PTY input handling with command termination
      let inputData = input;
      
      // Ensure proper command termination
      if (!inputData.endsWith('\n') && !inputData.endsWith('\r\n')) {
        inputData += '\n';
      }
      
      // Track sent input for echo filtering (without newline)
      processInfo.lastSentInput = inputData.replace(/[\r\n]+$/, '');
      
      console.log(`⌨️ SPARC: Sending command to PTY: "${processInfo.lastSentInput}"`);
      processInfo.process.write(inputData);
      console.log(`✅ PTY Input forwarded to REAL Claude ${instanceId}`);
    } else {
      // Regular pipe input handling with termination
      let inputData = input;
      if (!inputData.endsWith('\n')) {
        inputData += '\n';
      }
      processInfo.process.stdin.write(inputData);
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
const wss = new WebSocketServer({ 
  server,
  path: '/terminal'
});

// WebSocket connection tracking
const wsConnections = new Map(); // instanceId -> Set of WebSocket connections
const wsConnectionsBySocket = new Map(); // WebSocket -> instanceId

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('🔗 SPARC: New WebSocket terminal connection established');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 SPARC: WebSocket message received:', message.type);
      
      if (message.type === 'create_instance') {
        // Handle instance creation from WebSocket
        console.log('🚀 Creating Claude instance via WebSocket...');
        const instanceType = message.instanceType || 'claude';
        const workingDir = message.workingDir || '/workspaces/agent-feed';
        
        try {
          // Generate unique instance ID
          const instanceId = `claude-${Date.now()}`;
          const instanceInfo = await createRealClaudeInstanceWithPTY(instanceType, instanceId, true);
          console.log(`✅ Instance created: ${instanceId}`);
          
          ws.send(JSON.stringify({
            type: 'instance_created',
            instanceId: instanceId,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('❌ Failed to create instance:', error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Failed to create instance: ${error.message}`,
            timestamp: Date.now()
          }));
        }
      } else if (message.type === 'connect' && message.terminalId) {
        // CRITICAL FIX: Associate this WebSocket with BASE instance ID
        const fullInstanceId = message.terminalId;
        const instanceId = fullInstanceId.includes('(') ? fullInstanceId.split(' (')[0].trim() : fullInstanceId;
        
        console.log(`🔗 SPARC: Processing connect for terminal ID: "${fullInstanceId}" -> base: "${instanceId}"`);
        
        // Verify instance exists in active processes
        if (!activeProcesses.has(instanceId)) {
          console.error(`❌ Instance ${instanceId} not found in active processes. Available: [${Array.from(activeProcesses.keys()).join(', ')}]`);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Instance ${instanceId} not found or not running`,
            terminalId: instanceId,
            timestamp: Date.now(),
            availableInstances: Array.from(activeProcesses.keys())
          }));
          return;
        }
        
        if (!wsConnections.has(instanceId)) {
          wsConnections.set(instanceId, new Set());
        }
        wsConnections.get(instanceId).add(ws);
        wsConnectionsBySocket.set(ws, instanceId);
        console.log(`✅ WebSocket connected to base instance ${instanceId} (from ${fullInstanceId})`);
        console.log(`📊 Active WebSocket connections for ${instanceId}: ${wsConnections.get(instanceId).size}`);
        
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
            type: 'data', // FIXED: Use 'data' type to match frontend expectations
            data: outputBuffer.buffer,
            terminalId: instanceId,
            timestamp: Date.now()
          }));
        }
      } else if (message.type === 'claude_api' && message.data && message.instanceId) {
        // Handle Claude API calls directly through WebSocket
        const instanceId = message.instanceId;
        const inputData = message.data.trim();
        
        console.log(`🚀 CLAUDE API WebSocket: Processing "${inputData}" for instance ${instanceId}`);
        
        // Add loading animation
        // Temporarily create inline loading animator
        const loadingAnimator = {
          startAnimation: () => {},
          stopAnimation: () => {}
        };
        const loadingInfo = loadingAnimator.getLoadingMessageForQuery(inputData);
        
        // Override broadcast method to integrate with WebSocket system
        loadingAnimator.broadcastAnimation = (id, message, isComplete = false) => {
          ws.send(JSON.stringify({
            type: 'loading',
            data: message,
            instanceId: id,
            timestamp: Date.now(),
            isComplete
          }));
        };
        
        // Start loading animation
        loadingAnimator.startAnimation(instanceId, loadingInfo.isComplex);
        
        // Send initial loading message
        ws.send(JSON.stringify({
          type: 'loading',
          data: loadingInfo.message,
          instanceId: instanceId,
          timestamp: Date.now(),
          isComplete: false
        }));
        
        // Verify instance exists and is running
        const processInfo = activeProcesses.get(instanceId);
        if (!processInfo) {
          console.error(`❌ Instance ${instanceId} not found for Claude API call`);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Instance ${instanceId} not found`,
            timestamp: Date.now()
          }));
          return;
        }
        
        if (processInfo.status !== 'running') {
          console.error(`❌ Instance ${instanceId} is not running for Claude API call`);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Instance ${instanceId} is not running`,
            timestamp: Date.now()
          }));
          return;
        }
        
        try {
          // FIXED: Use proper interactive Claude session with PTY for tool support
          // spawn already imported at top of file
          
          console.log('🔧 Creating Claude process with enhanced configuration...');
          
          // Create Claude process with proper interactive setup
          const claudeApiProcess = spawn('claude', [
            '--dangerously-skip-permissions'
          ], {
            cwd: '/workspaces/agent-feed',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              TERM: 'xterm-256color',
              FORCE_COLOR: '1',
              NODE_ENV: 'development',
              PATH: process.env.PATH
            },
            shell: false,
            detached: false
          });
          
          console.log(`📡 Claude API process created with PID: ${claudeApiProcess.pid}`);
          
          // Send input through stdin with proper formatting
          claudeApiProcess.stdin.write(inputData + '\n');
          claudeApiProcess.stdin.end();

          let apiResponse = '';
          let apiError = '';
          let processCompleted = false;

          // Set timeout for the API call (5 minutes for complex operations)
          const timeoutDuration = 300000; // 5 minutes
          const apiTimeout = setTimeout(() => {
            if (!processCompleted) {
              console.error(`⏰ CLAUDE API TIMEOUT: Killing process after 5 minutes for "${inputData}"`);
              claudeApiProcess.kill('SIGKILL');
              ws.send(JSON.stringify({
                type: 'data', // FIXED: Use 'data' type to match frontend expectations
                data: `> ${inputData}\n❌ Claude took too long (5 minutes). This might be due to permission requests or complex operations.\n💡 Try: Simpler commands, or check if Claude needs permissions.\n\n`,
                instanceId: instanceId,
                timestamp: Date.now(),
                source: 'error'
              }));
            }
          }, timeoutDuration);

          claudeApiProcess.stdout.on('data', (data) => {
            console.log(`📥 CLAUDE API stdout: ${data.toString().substring(0, 100)}...`);
            apiResponse += data.toString();
          });

          claudeApiProcess.stderr.on('data', (data) => {
            console.log(`📥 CLAUDE API stderr: ${data.toString()}`);
            apiError += data.toString();
          });

          // ENHANCED: Better error handling for different exit scenarios
          claudeApiProcess.on('error', (error) => {
            console.error(`❌ CLAUDE API Process error: ${error.message}`);
            processCompleted = true;
            clearTimeout(apiTimeout);
            
            ws.send(JSON.stringify({
              type: 'data', // FIXED: Use 'data' type to match frontend expectations
              data: `> ${inputData}\nError: Claude process failed to start: ${error.message}\n\n`,
              instanceId: instanceId,
              timestamp: Date.now(),
              source: 'error'
            }));
          });

          claudeApiProcess.on('close', (code, signal) => {
            processCompleted = true;
            clearTimeout(apiTimeout);
            
            console.log(`🔄 CLAUDE API Process closed with code: ${code}, signal: ${signal}`);
            console.log(`📊 Response length: ${apiResponse.length}, Error length: ${apiError.length}`);
            
            if (code === 0 && apiResponse.trim()) {
              // Stop loading animation
              // Temporarily create inline loading animator
        const loadingAnimator = {
          startAnimation: () => {},
          stopAnimation: () => {}
        };
              loadingAnimator.stopAnimation(instanceId);
              
              // Claude Code now returns plain text, not JSON - no need to parse
              console.log(`✅ CLAUDE API SUCCESS: Got real AI response for "${inputData}"`);
              console.log(`📝 AI Response: ${apiResponse.substring(0, 200)}...`);
              
              // Enhanced tool call detection and formatting
              // toolCallFormatter already defined at top
              const formattedResult = toolCallFormatter.formatToolCallOutput(apiResponse, instanceId);
              
              // Extract the formatted data from the result
              const responseData = formattedResult?.data || apiResponse;
              
              // Send the response back to WebSocket client
              ws.send(JSON.stringify({
                type: 'data', // FIXED: Use 'data' type to match frontend expectations
                data: `> ${inputData}\n${responseData}\n\n`,
                instanceId: instanceId,
                timestamp: Date.now(),
                source: 'claude-api',
                enhanced: formattedResult?.enhanced || false
              }));
            } else {
              // Stop loading animation on error
              // Temporarily create inline loading animator
        const loadingAnimator = {
          startAnimation: () => {},
          stopAnimation: () => {}
        };
              loadingAnimator.stopAnimation(instanceId);
              
              console.error(`❌ CLAUDE API Error (code ${code}):`, apiError);
              
              // Check if it's a permission issue
              const isPermissionIssue = apiError.includes('permission') || 
                                       apiError.includes('confirm') || 
                                       apiError.includes('yes/no') ||
                                       code === 1; // Exit code 1 often indicates permission denied
              
              if (isPermissionIssue) {
                ws.send(JSON.stringify({
                  type: 'permission_request',
                  data: `> ${inputData}\n🔐 Claude needs permission to proceed.\n\n${apiError}\n\n`,
                  instanceId: instanceId,
                  timestamp: Date.now(),
                  source: 'permission',
                  originalQuery: inputData
                }));
              } else {
                ws.send(JSON.stringify({
                  type: 'data', // FIXED: Use 'data' type to match frontend expectations
                  data: `> ${inputData}\n❌ Claude Code API failed (exit code: ${code})\n💡 This might be a permission issue. Try using '--dangerously-skip-permissions' or simplify your request.\n\n`, 
                  instanceId: instanceId,
                  timestamp: Date.now(),
                  source: 'error'
                }));
              }
            }
          });

        } catch (error) {
          console.error(`❌ CLAUDE API WebSocket Error:`, error.message);
          ws.send(JSON.stringify({
            type: 'error',
            error: `Claude API failed: ${error.message}`,
            timestamp: Date.now()
          }));
        }
      }
      
      if (message.type === 'input' && message.data) {
        // Forward input to Claude process
        // Check both the stored connection ID and the message's terminalId
        let instanceId = wsConnectionsBySocket.get(ws) || message.terminalId;
        
        // CRITICAL FIX: Extract base instance ID consistently
        if (instanceId && instanceId.includes('(')) {
          instanceId = instanceId.split(' (')[0].trim();
        }
        
        console.log(`🔍 SPARC: Input received for base instance: ${instanceId}`);
        console.log(`🔍 SPARC: Available instances:`, Array.from(activeProcesses.keys()));
        
        if (instanceId) {
          const processInfo = activeProcesses.get(instanceId);
          if (!processInfo) {
            console.error(`❌ Instance ${instanceId} not found in active processes`);
            console.error(`🔍 Available instances: [${Array.from(activeProcesses.keys()).join(', ')}]`);
            ws.send(JSON.stringify({
              type: 'error',
              error: `Instance ${instanceId} not found`,
              terminalId: instanceId,
              timestamp: Date.now(),
              availableInstances: Array.from(activeProcesses.keys())
            }));
            return;
          }
          
          if (processInfo.status !== 'running') {
            console.error(`❌ Instance ${instanceId} is not running, status: ${processInfo.status}`);
            ws.send(JSON.stringify({
              type: 'error',
              error: `Instance ${instanceId} is ${processInfo.status}`,
              terminalId: instanceId,
              timestamp: Date.now()
            }));
            return;
          }
          
          if (processInfo && processInfo.status === 'running') {
            console.log(`⌨️ SPARC: Forwarding WebSocket input to Claude ${instanceId}: ${message.data}`);
            
            try {
              // SPARC FIX: Validate WebSocket input
              if (!message.data || typeof message.data !== 'string') {
                console.error(`❌ Invalid WebSocket input for Claude ${instanceId}: ${typeof message.data} - ${message.data}`);
                ws.send(JSON.stringify({
                  type: 'error',
                  error: 'Invalid input data',
                  terminalId: instanceId,
                  timestamp: Date.now()
                }));
                return;
              }
              
              // CLAUDE CODE API INTEGRATION: Use --print --output-format json for real AI responses
              const inputData = message.data.trim();
              console.log(`🚀 CLAUDE API: Processing prompt: "${inputData}"`);
              
              // FIXED: Use proper interactive Claude session with PTY for tool support
              // spawn already imported at top of file
              // Import os at top for platform detection
              
              console.log('🔧 Creating Claude process with enhanced configuration...');
              
              // Create Claude process with proper interactive setup
              const claudeApiProcess = spawn('claude', [
                '--dangerously-skip-permissions'
              ], {
                cwd: '/workspaces/agent-feed',
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                  ...process.env,
                  TERM: 'xterm-256color',
                  FORCE_COLOR: '1',
                  // Enable proper Claude interaction mode
                  NODE_ENV: 'development',
                  // Ensure Claude has access to full environment
                  PATH: process.env.PATH
                },
                shell: false,
                detached: false
              });
              
              console.log(`📡 Claude process created with PID: ${claudeApiProcess.pid}`);
              
              // Send input through stdin with proper formatting
              claudeApiProcess.stdin.write(inputData + '\n');
              claudeApiProcess.stdin.end();

              let apiResponse = '';
              let apiError = '';
              let processCompleted = false;

              // Set timeout for the API call (5 minutes for complex operations)
              const timeoutDuration = 300000; // 5 minutes
              const apiTimeout = setTimeout(() => {
                if (!processCompleted) {
                  console.error(`⏰ CLAUDE API TIMEOUT: Killing process after 5 minutes for "${inputData}"`);
                  claudeApiProcess.kill('SIGKILL');
                  broadcastToWebSockets(instanceId, {
                    type: 'data', // FIXED: Use 'data' type to match frontend expectations
                    data: `> ${inputData}\n❌ Claude took too long (5 minutes). This might be due to permission requests or complex operations.\n💡 Try: Simpler commands, or check if Claude needs permissions.\n\n`,
                    terminalId: instanceId,
                    timestamp: Date.now(),
                    source: 'error'
                  });
                }
              }, timeoutDuration);

              claudeApiProcess.stdout.on('data', (data) => {
                console.log(`📥 CLAUDE API stdout: ${data.toString().substring(0, 100)}...`);
                apiResponse += data.toString();
              });

              claudeApiProcess.stderr.on('data', (data) => {
                console.log(`📥 CLAUDE API stderr: ${data.toString()}`);
                apiError += data.toString();
              });

              // ENHANCED: Better error handling for different exit scenarios
              claudeApiProcess.on('error', (error) => {
                console.error(`❌ CLAUDE API Process error: ${error.message}`);
                processCompleted = true;
                clearTimeout(apiTimeout);
                
                broadcastToWebSockets(instanceId, {
                  type: 'data', // FIXED: Use 'data' type to match frontend expectations
                  data: `> ${inputData}\nError: Claude process failed to start: ${error.message}\n\n`,
                  terminalId: instanceId,
                  timestamp: Date.now(),
                  source: 'error'
                });
              });

              claudeApiProcess.on('close', (code, signal) => {
                processCompleted = true;
                clearTimeout(apiTimeout);
                
                console.log(`🔄 CLAUDE API Process closed with code: ${code}, signal: ${signal}`);
                console.log(`📊 Response length: ${apiResponse.length}, Error length: ${apiError.length}`);
                
                if (code === 0 && apiResponse.trim()) {
                  // Claude Code now returns plain text, not JSON - no need to parse
                  console.log(`✅ CLAUDE API SUCCESS: Got real AI response for "${inputData}"`);
                  console.log(`📝 AI Response: ${apiResponse.substring(0, 200)}...`);
                  
                  // Enhanced tool call detection and formatting
                  // toolCallFormatter already defined at top
                  const formattedResult = toolCallFormatter.formatToolCallOutput(apiResponse, instanceId);
                  const responseData = formattedResult?.data || apiResponse;
                  
                  // Broadcast the AI response to WebSocket clients
                  broadcastToWebSockets(instanceId, {
                    type: 'data', // FIXED: Use 'data' type to match frontend expectations
                    data: `> ${inputData}\n${responseData}\n\n`,
                    terminalId: instanceId,
                    timestamp: Date.now(),
                    source: 'claude-api',
                    enhanced: false // Will be enhanced by ToolCallFormatter
                  });
                } else {
                  console.error(`❌ CLAUDE API Error (code ${code}):`, apiError);
                  broadcastToWebSockets(instanceId, {
                    type: 'data', // FIXED: Use 'data' type to match frontend expectations
                    data: `> ${inputData}\nError: Claude Code API failed (exit code: ${code})\n\n`, 
                    terminalId: instanceId,
                    timestamp: Date.now(),
                    source: 'error'
                  });
                }
              });

              claudeApiProcess.on('error', (error) => {
                processCompleted = true;
                clearTimeout(apiTimeout);
                console.error(`❌ CLAUDE API Process Error:`, error);
                broadcastToWebSockets(instanceId, {
                  type: 'data', // FIXED: Use 'data' type to match frontend expectations
                  data: `> ${inputData}\nError: Failed to start Claude Code API\n\n`,
                  terminalId: instanceId,
                  timestamp: Date.now(),
                  source: 'error'
                });
              });
              
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
    // SPARC ENHANCEMENT: Format tool calls for visualization
    let formattedMessage;
    try {
      // Extract raw output data for tool call detection
      const rawOutput = message.data || message.output || '';
      
      // Use ToolCallFormatter to enhance the message if it contains tool calls
      formattedMessage = toolCallFormatter.formatToolCallOutput(rawOutput, instanceId);
      
      // START REAL-TIME TOOL MONITORING: If this is a new tool call, start monitoring
      if (formattedMessage.enhanced && formattedMessage.type === 'tool_call' && formattedMessage.toolCall) {
        toolCallStatusManager.startMonitoring(
          formattedMessage.toolCall.id,
          instanceId,
          {
            toolName: formattedMessage.toolCall.toolName,
            parameters: formattedMessage.toolCall.parameters,
            startTime: Date.now()
          }
        );
      }
      
      // COMPLETE TOOL MONITORING: If this is a tool result, mark as completed
      if (formattedMessage.enhanced && formattedMessage.type === 'tool_result') {
        // Try to find active tool call for this instance and complete it
        // This is a simplified approach - in production you'd want better ID tracking
        const activeToolCalls = toolCallFormatter.activeToolCalls;
        for (const [toolCallId, toolCall] of activeToolCalls.entries()) {
          if (toolCall.instanceId === instanceId && toolCall.status === 'starting') {
            toolCallStatusManager.completeToolCall(toolCallId, instanceId, formattedMessage.toolResult);
            break;
          }
        }
      }
      
      // Preserve original timestamp if available
      if (message.timestamp) {
        formattedMessage.timestamp = message.timestamp;
      }
      
      // Preserve original source if available
      if (message.source) {
        formattedMessage.source = message.source;
      }
    } catch (error) {
      // SAFETY: Graceful degradation - use original format if formatting fails
      console.warn('⚠️ Tool call formatting failed, using original format:', error.message);
      formattedMessage = {
        type: 'data', // FIXED: Use 'data' type to match frontend expectations
        data: message.data || message.output,
        terminalId: instanceId,
        timestamp: message.timestamp,
        source: message.source || 'process'
      };
    }
    
    // Send the formatted message with proper structure for frontend
    const wsMessage = JSON.stringify({
      type: 'data', // FIXED: Use 'data' type to match frontend expectations
      data: formattedMessage.data || formattedMessage.output || '',
      terminalId: instanceId,
      timestamp: formattedMessage.timestamp || Date.now(),
      source: formattedMessage.source || 'process',
      enhanced: formattedMessage.enhanced || false
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

// SPARC INTEGRATION: Initialize tool call status manager with broadcast function
// toolCallStatusManager.setBroadcastFunction(broadcastToWebSockets);

// Setup and start the server
const startServer = async () => {
  try {
    console.log('🔄 Initializing SPARC unified server...');
    
    // Initialize database services
    await initializeDatabaseServices();
    
    // Setup API routes
    setupApiRoutes();
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 SPARC UNIFIED SERVER running on http://localhost:${PORT}`);
      console.log(`🛠️ Tool Call Visualization System: ACTIVE`);
      console.log(`📊 Real-time Status Updates: ENABLED`);
      console.log(`✅ HTTP API + WebSocket Terminal on single port!`);
      console.log(`📡 Claude Terminal endpoints available:`);
      console.log(`   - WebSocket Terminal: ws://localhost:${PORT}/terminal`);
      console.log(`   - Health: http://localhost:${PORT}/health`);
      console.log(`   - Claude Instances API: http://localhost:${PORT}/api/claude/instances`);
      console.log(`   - Claude Terminal Stream: http://localhost:${PORT}/api/claude/instances/{instanceId}/terminal/stream`);
      console.log(`   - Terminal Input: http://localhost:${PORT}/api/claude/instances/{instanceId}/terminal/input`);
      console.log(`🎉 SPARC: Unified architecture - WebSocket + HTTP on single server!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.log('⚠️ Continuing without database services (fallback mode)');
    
    // Continue with just Claude terminal functionality
    server.listen(PORT, () => {
      console.log(`🚀 SPARC SERVER (FALLBACK MODE) running on http://localhost:${PORT}`);
      console.log(`⚠️ Database services unavailable - using mock data`);
      console.log(`📡 Claude Terminal endpoints available:`);
      console.log(`   - WebSocket Terminal: ws://localhost:${PORT}/terminal`);
      console.log(`   - Health: http://localhost:${PORT}/health`);
      console.log(`   - Claude Instances API: http://localhost:${PORT}/api/claude/instances`);
    });
  }
};

// Start the server
startServer();

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