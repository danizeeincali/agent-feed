#!/usr/bin/env node
/**
 * Production Claude WebSocket Hub Connection Script
 * Connects prod Claude instance to the WebSocket hub
 */

const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

class ProdClaudeHubClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.devMode = this.checkDevMode();
    this.hubUrl = process.env.HUB_URL || 'http://localhost:3002';
  }

  checkDevMode() {
    try {
      // Check environment variable first
      if (process.env.DEV_MODE === 'true') {
        return true;
      }

      // Check config file
      const configPath = '/workspaces/agent-feed/prod/config/mode.json';
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.devMode === true;
      }

      return false;
    } catch (error) {
      console.error('Error checking dev mode:', error.message);
      return false;
    }
  }

  async connect() {
    try {
      console.log('🚀 Production Claude connecting to WebSocket Hub...');
      console.log(`   Hub URL: ${this.hubUrl}`);
      console.log(`   Dev Mode: ${this.devMode}`);
      console.log('');

      this.socket = io(this.hubUrl);

      this.socket.on('connect', () => {
        console.log('✅ Connected to WebSocket Hub');
        console.log(`   Socket ID: ${this.socket.id}`);
        this.connected = true;

        // Register as Claude instance
        this.socket.emit('registerClaude', {
          instanceType: 'production',
          devMode: this.devMode,
          capabilities: ['chat', 'commands', 'file-operations'],
          workspacePath: '/workspaces/agent-feed/prod/agent_workspace/'
        });
      });

      this.socket.on('hubRegistered', (data) => {
        console.log('🎯 Registered with hub:', data);
        console.log('');
        
        if (this.devMode) {
          console.log('💬 Development mode enabled - ready for chat!');
          console.log('   You can now interact through the frontend');
          console.log('   Messages will be routed through the WebSocket hub');
        } else {
          console.log('🏭 Production mode active - ready for operations');
          console.log('   Waiting for commands from frontend');
        }
        console.log('');
      });

      this.socket.on('fromFrontend', (message) => {
        console.log('📨 Received message from frontend:', message);
        this.handleFrontendMessage(message);
      });

      this.socket.on('hubStatus', (status) => {
        console.log('📊 Hub Status:', status);
      });

      this.socket.on('routingError', (error) => {
        console.error('❌ Routing error:', error);
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Disconnected from WebSocket Hub');
        this.connected = false;
      });

      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      // Keep alive
      this.startHeartbeat();

    } catch (error) {
      console.error('❌ Failed to connect to WebSocket Hub:', error.message);
      process.exit(1);
    }
  }

  handleFrontendMessage(message) {
    const { type, payload, fromId } = message;

    console.log(`\n🎯 Processing ${type} message from frontend ${fromId}`);

    try {
      let response;

      switch (type) {
        case 'chat':
          response = this.handleChat(payload);
          break;
        case 'command':
          response = this.handleCommand(payload);
          break;
        case 'status':
          response = this.getStatus();
          break;
        default:
          response = { error: `Unknown message type: ${type}` };
      }

      // Send response back to frontend
      this.socket.emit('toFrontend', {
        targetId: fromId,
        type: 'response',
        payload: response,
        originalType: type
      });

      console.log(`📤 Response sent to frontend ${fromId}`);

    } catch (error) {
      console.error('❌ Error processing message:', error.message);
      
      this.socket.emit('toFrontend', {
        targetId: fromId,
        type: 'error',
        payload: { error: error.message },
        originalType: type
      });
    }
  }

  handleChat(payload) {
    const { message } = payload;
    
    if (!this.devMode) {
      return { error: 'Chat not available in production mode' };
    }

    console.log(`💬 Chat message: "${message}"`);
    
    // Simple chat response (can be enhanced with actual Claude integration)
    return {
      response: `Hello! I'm the production Claude instance. You said: "${message}". I'm running in development mode and ready to chat! My workspace is at /prod/agent_workspace/ and I respect all system boundaries.`,
      devMode: this.devMode,
      timestamp: new Date().toISOString()
    };
  }

  handleCommand(payload) {
    const { operation, ...args } = payload;
    
    console.log(`⚡ Command: ${operation}`, args);

    // Check if operation is allowed (basic implementation)
    const allowedOperations = ['status', 'list_workspace', 'read_file'];
    
    if (!allowedOperations.includes(operation)) {
      return { error: `Operation '${operation}' not allowed` };
    }

    switch (operation) {
      case 'status':
        return this.getStatus();
      
      case 'list_workspace':
        return this.listWorkspace();
      
      case 'read_file':
        return this.readFile(args.path);
      
      default:
        return { error: `Unknown operation: ${operation}` };
    }
  }

  getStatus() {
    return {
      status: 'online',
      devMode: this.devMode,
      connected: this.connected,
      workspacePath: '/workspaces/agent-feed/prod/agent_workspace/',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  listWorkspace() {
    try {
      const workspacePath = '/workspaces/agent-feed/prod/agent_workspace/';
      const items = fs.readdirSync(workspacePath);
      
      return {
        workspace: workspacePath,
        items: items.map(item => {
          const itemPath = path.join(workspacePath, item);
          const stats = fs.statSync(itemPath);
          return {
            name: item,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime
          };
        })
      };
    } catch (error) {
      return { error: `Failed to list workspace: ${error.message}` };
    }
  }

  readFile(filePath) {
    try {
      // Security check - must be in agent workspace
      if (!filePath || !filePath.startsWith('/workspaces/agent-feed/prod/agent_workspace/')) {
        return { error: 'File access denied - outside agent workspace' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return {
        path: filePath,
        content,
        size: content.length
      };
    } catch (error) {
      return { error: `Failed to read file: ${error.message}` };
    }
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.connected && this.socket) {
        this.socket.emit('heartbeat', {
          timestamp: new Date().toISOString(),
          status: 'alive'
        });
      }
    }, 30000); // Every 30 seconds
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// CLI usage
if (require.main === module) {
  const client = new ProdClaudeHubClient();
  
  console.log('🤖 Production Claude WebSocket Hub Client');
  console.log('==========================================');
  console.log('');
  
  client.connect().catch(error => {
    console.error('Failed to start:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    client.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    client.disconnect();
    process.exit(0);
  });
}

module.exports = { ProdClaudeHubClient };