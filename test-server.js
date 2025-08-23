#!/usr/bin/env node

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Simple ProcessManager implementation for testing
class TestProcessManager {
  constructor() {
    this.currentProcess = null;
    this.currentPid = null;
  }
  
  async launchInstance(config = {}) {
    console.log('[TestProcessManager] Launching Claude instance with config:', config);
    
    if (this.currentProcess) {
      console.log('[TestProcessManager] Killing existing process');
      this.currentProcess.kill();
    }
    
    const workingDirectory = config.workingDirectory || '/workspaces/agent-feed/prod';
    const args = [];
    
    if (config.environment === 'production') {
      args.push('--dangerously-skip-permissions');
    }
    
    console.log('[TestProcessManager] Spawning claude with args:', args);
    console.log('[TestProcessManager] Working directory:', workingDirectory);
    
    try {
      this.currentProcess = spawn('claude', args, {
        cwd: workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_INSTANCE_NAME: 'Test Instance',
          CLAUDE_MANAGED_INSTANCE: 'true'
        }
      });
      
      this.currentPid = this.currentProcess.pid;
      console.log('[TestProcessManager] Process spawned with PID:', this.currentPid);
      
      // Handle process events
      this.currentProcess.on('spawn', () => {
        console.log('[TestProcessManager] Process spawned successfully');
      });
      
      this.currentProcess.on('error', (error) => {
        console.error('[TestProcessManager] Process error:', error);
      });
      
      this.currentProcess.on('exit', (code) => {
        console.log('[TestProcessManager] Process exited with code:', code);
        this.currentProcess = null;
        this.currentPid = null;
      });
      
      return {
        pid: this.currentPid,
        name: 'Claude Instance',
        status: 'running',
        startTime: new Date(),
        workingDirectory
      };
    } catch (error) {
      console.error('[TestProcessManager] Failed to spawn process:', error);
      throw error;
    }
  }
  
  async killInstance() {
    if (this.currentProcess) {
      console.log('[TestProcessManager] Killing process PID:', this.currentPid);
      this.currentProcess.kill();
      this.currentProcess = null;
      this.currentPid = null;
    }
  }
  
  getProcessInfo() {
    return {
      pid: this.currentPid,
      name: 'Claude Instance',
      status: this.currentProcess ? 'running' : 'stopped',
      startTime: this.currentProcess ? new Date() : null,
      workingDirectory: '/workspaces/agent-feed/prod'
    };
  }
}

const processManager = new TestProcessManager();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('process:launch', async (config) => {
    try {
      console.log('Received process:launch event with config:', config);
      const processInfo = await processManager.launchInstance(config);
      console.log('Process launched successfully:', processInfo);
      socket.emit('process:launched', processInfo);
      socket.emit('process:info', processInfo);
    } catch (error) {
      console.error('Failed to launch process:', error);
      socket.emit('process:error', { message: error.message });
    }
  });
  
  socket.on('process:kill', async () => {
    try {
      console.log('Received process:kill event');
      await processManager.killInstance();
      socket.emit('process:killed');
      socket.emit('process:info', processManager.getProcessInfo());
    } catch (error) {
      console.error('Failed to kill process:', error);
      socket.emit('process:error', { message: error.message });
    }
  });
  
  socket.on('process:info', () => {
    console.log('Received process:info request');
    socket.emit('process:info', processManager.getProcessInfo());
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`WebSocket ready for process management testing`);
});