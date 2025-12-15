#!/usr/bin/env node

/**
 * Production Claude Terminal Interface
 * Provides debugging and testing interface for production Claude instance
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class ProductionClaudeTerminal {
  constructor() {
    this.claudeProcess = null;
    this.logFile = path.join(__dirname, 'debug', 'claude-session.log');
    this.isInitialized = false;
    this.setupLogging();
  }

  setupLogging() {
    const debugDir = path.join(__dirname, 'debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
  }

  async initializeClaude() {
    console.log('🚀 Initializing Production Claude Instance...');
    
    try {
      // Initialize Claude with dangerous permissions for production debugging
      const claudeCmd = 'claude --dangerously-skip-permissions';
      console.log(`Running: ${claudeCmd}`);
      
      this.claudeProcess = spawn('claude', ['--dangerously-skip-permissions'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.claudeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[CLAUDE]', output);
        this.logToFile('STDOUT', output);
      });

      this.claudeProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.error('[CLAUDE ERROR]', output);
        this.logToFile('STDERR', output);
      });

      this.claudeProcess.on('close', (code) => {
        console.log(`Claude process exited with code ${code}`);
        this.logToFile('SYSTEM', `Process exited with code ${code}`);
      });

      this.isInitialized = true;
      console.log('✅ Production Claude instance initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Claude:', error);
      this.logToFile('ERROR', `Initialization failed: ${error.message}`);
    }
  }

  logToFile(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
  }

  sendCommand(command) {
    if (!this.isInitialized || !this.claudeProcess) {
      console.error('❌ Claude not initialized');
      return;
    }

    console.log(`📤 Sending command: ${command}`);
    this.claudeProcess.stdin.write(command + '\n');
    this.logToFile('INPUT', command);
  }

  async debugConnection() {
    console.log('🔍 Running connection diagnostics...');
    
    // Test backend connection
    try {
      const result = execSync('curl -s http://localhost:3000/socket.io/?EIO=4&transport=polling', { encoding: 'utf8' });
      console.log('✅ Backend Socket.IO endpoint responding');
      console.log('Response:', result.substring(0, 100) + '...');
    } catch (error) {
      console.error('❌ Backend connection failed:', error.message);
    }

    // Test frontend connection
    try {
      const result = execSync('curl -s http://localhost:3001', { encoding: 'utf8' });
      if (result.includes('<title>')) {
        console.log('✅ Frontend server responding');
      } else {
        console.error('❌ Frontend server not serving proper content');
      }
    } catch (error) {
      console.error('❌ Frontend connection failed:', error.message);
    }
  }

  showStatus() {
    console.log('\n📊 Production Claude Status:');
    console.log('- Claude Process:', this.isInitialized ? '✅ Running' : '❌ Not running');
    console.log('- Log File:', this.logFile);
    console.log('- Working Directory:', __dirname);
    console.log('\n🎯 Available Commands:');
    console.log('- init: Initialize Claude instance');
    console.log('- debug: Run connection diagnostics');
    console.log('- status: Show this status');
    console.log('- send <command>: Send command to Claude');
    console.log('- quit: Exit terminal');
  }
}

// Main terminal interface
async function main() {
  const terminal = new ProductionClaudeTerminal();
  const readline = require('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'prod-claude> '
  });

  console.log('🎯 Production Claude Terminal Interface');
  console.log('Type "help" for commands or "init" to start Claude\n');
  
  terminal.showStatus();
  rl.prompt();

  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    switch (command) {
      case 'init':
        await terminal.initializeClaude();
        break;
      case 'debug':
        await terminal.debugConnection();
        break;
      case 'status':
        terminal.showStatus();
        break;
      case 'send':
        if (args.length > 0) {
          terminal.sendCommand(args.join(' '));
        } else {
          console.log('Usage: send <command>');
        }
        break;
      case 'help':
        terminal.showStatus();
        break;
      case 'quit':
      case 'exit':
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      default:
        if (command) {
          console.log(`Unknown command: ${command}. Type "help" for available commands.`);
        }
    }
    
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Terminal session ended');
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionClaudeTerminal;