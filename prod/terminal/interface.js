#!/usr/bin/env node

/**
 * Production Claude Terminal Interface v2.0
 * Relocated to /prod for better visibility and organization
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

class ProductionClaudeTerminal {
  constructor() {
    this.prodDir = '/workspaces/agent-feed/prod';
    this.workspaceDir = path.join(this.prodDir, 'agent_workspace');
    this.claudeProcess = null;
    this.logFile = path.join(this.prodDir, 'logs', 'claude-session.log');
    this.isInitialized = false;
    this.setupEnvironment();
  }

  setupEnvironment() {
    // Ensure all directories exist
    const dirs = [
      path.join(this.prodDir, 'logs'),
      path.join(this.workspaceDir, 'outputs'),
      path.join(this.workspaceDir, 'temp'),
      path.join(this.workspaceDir, 'logs'),
      path.join(this.workspaceDir, 'data')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    console.log('✅ Production environment ready at:', this.prodDir);
  }

  async initializeClaude() {
    console.log('🚀 Initializing Production Claude Instance...');
    console.log('📁 Working Directory:', this.prodDir);
    console.log('🔒 Protected Workspace:', this.workspaceDir);
    
    try {
      // Initialize Claude with dangerous permissions for production debugging
      this.claudeProcess = spawn('claude', ['--dangerously-skip-permissions'], {
        cwd: this.prodDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CLAUDE_PROD_MODE: 'true',
          CLAUDE_WORKSPACE: this.workspaceDir
        }
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
        this.isInitialized = false;
      });

      this.isInitialized = true;
      console.log('✅ Production Claude instance initialized successfully');
      console.log('📝 Logs are being written to:', this.logFile);
      
    } catch (error) {
      console.error('❌ Failed to initialize Claude:', error.message);
      console.error('Make sure Claude CLI is installed and accessible');
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
      console.error('❌ Claude not initialized. Run "init" first.');
      return;
    }

    console.log(`📤 Sending command: ${command}`);
    this.claudeProcess.stdin.write(command + '\n');
    this.logToFile('INPUT', command);
  }

  async checkWorkspace() {
    console.log('🔍 Checking Agent Workspace...');
    
    // Check protection
    const protectedFile = path.join(this.workspaceDir, '.protected');
    if (fs.existsSync(protectedFile)) {
      console.log('✅ Workspace is protected');
    } else {
      console.error('⚠️ Protection file missing');
    }

    // Check directories
    const dirs = ['outputs', 'temp', 'logs', 'data'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.workspaceDir, dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        console.log(`📁 ${dir}/: ${files.length} files`);
      }
    });

    // Check gitignore
    const gitignore = path.join(this.workspaceDir, '.gitignore');
    if (fs.existsSync(gitignore)) {
      console.log('✅ .gitignore configured');
    }
  }

  async debugConnection() {
    console.log('🔍 Running connection diagnostics...');
    
    // Test backend connection
    try {
      const result = execSync('curl -s http://localhost:3000/socket.io/?EIO=4&transport=polling', { encoding: 'utf8' });
      console.log('✅ Backend Socket.IO endpoint responding');
      const parsed = JSON.parse(result.substring(1));
      console.log('   Session ID:', parsed.sid);
    } catch (error) {
      console.error('❌ Backend connection failed:', error.message);
    }

    // Test frontend connection
    try {
      const result = execSync('curl -s http://localhost:3001 | head -5', { encoding: 'utf8' });
      if (result.includes('Agent Feed')) {
        console.log('✅ Frontend server responding');
      } else {
        console.error('❌ Frontend server not serving proper content');
      }
    } catch (error) {
      console.error('❌ Frontend connection failed:', error.message);
    }
  }

  resetWorkspace() {
    console.log('🔄 Resetting Agent Workspace...');
    
    const tempDir = path.join(this.workspaceDir, 'temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(tempDir, file));
      });
      console.log(`✅ Cleaned ${files.length} temporary files`);
    }

    console.log('✅ Workspace reset complete');
  }

  showStatus() {
    console.log('\n📊 Production Claude Status:');
    console.log('================================');
    console.log('📁 Production Root:', this.prodDir);
    console.log('🔒 Protected Workspace:', this.workspaceDir);
    console.log('📝 Log File:', this.logFile);
    console.log('🤖 Claude Process:', this.isInitialized ? '✅ Running' : '❌ Not running');
    console.log('\n🎯 Available Commands:');
    console.log('  init        - Initialize Claude instance');
    console.log('  workspace   - Check workspace status');
    console.log('  debug       - Run connection diagnostics');
    console.log('  reset       - Reset workspace (clean temp files)');
    console.log('  status      - Show this status');
    console.log('  send <cmd>  - Send command to Claude');
    console.log('  help        - Show help');
    console.log('  quit        - Exit terminal');
    console.log('================================\n');
  }
}

// Main terminal interface
async function main() {
  console.log('🎯 Production Claude Terminal Interface v2.0');
  console.log('📁 New Location: /workspaces/agent-feed/prod');
  console.log('Type "help" for commands or "init" to start Claude\n');

  const terminal = new ProductionClaudeTerminal();
  terminal.showStatus();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'prod-claude> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    switch (command) {
      case 'init':
        await terminal.initializeClaude();
        break;
      case 'workspace':
        await terminal.checkWorkspace();
        break;
      case 'debug':
        await terminal.debugConnection();
        break;
      case 'reset':
        terminal.resetWorkspace();
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
        if (terminal.claudeProcess) {
          terminal.claudeProcess.kill();
        }
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
    if (terminal.claudeProcess) {
      terminal.claudeProcess.kill();
    }
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ProductionClaudeTerminal;