#!/usr/bin/env node

/**
 * Terminal Backend Debug Script
 * Tests WebSocket connection and backend terminal functionality
 */

const { Server } = require('socket.io');
const http = require('http');
const { spawn } = require('child_process');

console.log('🐛 Starting Terminal Backend Debug Server...\n');

// Create HTTP server
const server = http.createServer();

// Create Socket.IO server with CORS enabled
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Terminal namespace
const terminalNamespace = io.of('/terminal');
let activeProcess = null;

// Debug logging function
function debugLog(category, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category}] ${message}`);
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
}

// Connection tracking
let connectionCount = 0;

terminalNamespace.on('connection', (socket) => {
  connectionCount++;
  debugLog('CONNECTION', `New terminal connection established`, {
    socketId: socket.id,
    totalConnections: connectionCount
  });

  // Handle initialization
  socket.on('init', (data) => {
    debugLog('INIT', 'Terminal initialization request', data);
    
    // Start a bash shell for testing
    if (!activeProcess) {
      debugLog('PROCESS', 'Spawning new bash process');
      
      activeProcess = spawn('bash', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: process.env
      });

      activeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        debugLog('PROCESS_OUTPUT', `Stdout: ${output.trim()}`);
        
        // Broadcast to all connected clients
        terminalNamespace.emit('output', { data: output });
      });

      activeProcess.stderr.on('data', (data) => {
        const output = data.toString();
        debugLog('PROCESS_ERROR', `Stderr: ${output.trim()}`);
        
        // Broadcast to all connected clients
        terminalNamespace.emit('output', { data: output });
      });

      activeProcess.on('close', (code) => {
        debugLog('PROCESS', `Process closed with code ${code}`);
        activeProcess = null;
        
        terminalNamespace.emit('error', { 
          message: `Process closed with code ${code}` 
        });
      });

      // Send initial prompt
      setTimeout(() => {
        socket.emit('connected', { 
          pid: activeProcess.pid,
          message: 'Connected to debug terminal' 
        });
      }, 100);
    } else {
      socket.emit('connected', { 
        pid: activeProcess.pid,
        message: 'Connected to existing terminal' 
      });
    }
  });

  // Handle input messages
  socket.on('message', (message) => {
    debugLog('INPUT', 'Received message from client', message);

    if (message.type === 'input') {
      if (activeProcess && activeProcess.stdin.writable) {
        debugLog('INPUT', `Sending to process: "${message.data}"`);
        activeProcess.stdin.write(message.data);
      } else {
        debugLog('INPUT_ERROR', 'Process not available or stdin not writable');
        socket.emit('error', { 
          message: 'Terminal process not available' 
        });
      }
    } else if (message.type === 'resize') {
      debugLog('RESIZE', 'Terminal resize request', {
        cols: message.cols,
        rows: message.rows
      });
      // Note: pty resize would go here in a real implementation
    } else {
      debugLog('UNKNOWN_MESSAGE', 'Unknown message type', message);
    }
  });

  // Handle ping/pong for connection testing
  socket.on('ping', (data) => {
    debugLog('PING', 'Received ping', data);
    socket.emit('pong', data);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    connectionCount--;
    debugLog('DISCONNECT', 'Client disconnected', {
      socketId: socket.id,
      reason,
      remainingConnections: connectionCount
    });

    // Clean up process if no more connections
    if (connectionCount === 0 && activeProcess) {
      debugLog('CLEANUP', 'No more connections, keeping process alive for reconnection');
      // Don't kill immediately, allow for reconnection
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    debugLog('SOCKET_ERROR', 'Socket error', error);
  });
});

// Main server event handlers
io.on('connection', (socket) => {
  debugLog('ROOT_CONNECTION', 'New connection to root namespace', {
    socketId: socket.id
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  debugLog('SHUTDOWN', 'Received SIGINT, shutting down gracefully');
  
  if (activeProcess) {
    activeProcess.kill();
  }
  
  server.close(() => {
    debugLog('SHUTDOWN', 'Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  debugLog('SHUTDOWN', 'Received SIGTERM, shutting down gracefully');
  
  if (activeProcess) {
    activeProcess.kill();
  }
  
  server.close(() => {
    debugLog('SHUTDOWN', 'Server closed successfully');
    process.exit(0);
  });
});

// Start server
const PORT = 3001;
server.listen(PORT, () => {
  debugLog('SERVER', `Debug terminal server running on http://localhost:${PORT}`);
  debugLog('SERVER', 'Terminal namespace available at: /terminal');
  debugLog('SERVER', 'Ready to accept WebSocket connections');
  
  // Test the server setup
  setTimeout(() => {
    debugLog('SELF_TEST', 'Server is running and ready for connections');
    console.log('\n🚀 Ready for frontend connections!');
    console.log('📍 Frontend should connect to: ws://localhost:3001/terminal');
    console.log('🔍 Monitor this console for all WebSocket activity\n');
  }, 1000);
});

// Error handling
server.on('error', (error) => {
  debugLog('SERVER_ERROR', 'Server error', error);
});

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  debugLog('UNHANDLED_REJECTION', 'Unhandled promise rejection', {
    reason: reason,
    promise: promise
  });
});

process.on('uncaughtException', (error) => {
  debugLog('UNCAUGHT_EXCEPTION', 'Uncaught exception', error);
  process.exit(1);
});