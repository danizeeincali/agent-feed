#!/usr/bin/env node
/**
 * Claude Instance Launcher
 * Manages dual Claude Code instances with proper configuration and process isolation
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const DualInstanceManager = require('./DualInstanceManager');

class ClaudeInstanceLauncher {
  constructor() {
    this.instances = new Map();
    this.dualManager = new DualInstanceManager();
    this.isShuttingDown = false;
  }

  async initialize() {
    console.log('🚀 Initializing Claude Instance Launcher...');
    
    // Initialize dual instance manager
    await this.dualManager.initialize();
    
    // Set up signal handlers
    this.setupSignalHandlers();
    
    console.log('✅ Claude Instance Launcher initialized');
  }

  /**
   * Launch Claude Code instance with specific configuration
   */
  async launchInstance(type, options = {}) {
    if (this.instances.has(type)) {
      throw new Error(`Instance ${type} is already running`);
    }

    const config = await this.loadInstanceConfig(type);

    // Special handling for development instance (current Claude Code)
    if (type === 'development' || type === 'dev') {
      console.log(`🔧 Registering current Claude Code as development instance...`);
      console.log(`📁 Workspace: ${config.workspace.root}`);
      console.log(`⚙️  Config: /workspaces/agent-feed/.claude/dev/config.json`);
      
      const instance = {
        type: 'development',
        config: config,
        process: null, // No separate process for current instance
        pid: process.pid, // Current process PID
        status: 'running',
        startTime: Date.now(),
        lastHeartbeat: Date.now(),
        isCurrent: true
      };

      this.instances.set(type, instance);
      console.log(`✅ Development instance registered (Current PID: ${process.pid})`);
      return instance;
    }

    // Production instance gets its own process
    const instanceOptions = {
      cwd: config.workspace.root,
      env: {
        ...process.env,
        CLAUDE_CONFIG_PATH: `/workspaces/agent-feed/.claude/${type}/config.json`,
        CLAUDE_INSTANCE_TYPE: type,
        CLAUDE_WORKSPACE_ROOT: config.workspace.root,
        CLAUDE_DANGEROUS_SKIP_PERMISSIONS: 'true'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    };

    console.log(`🔄 Launching ${type} instance...`);
    console.log(`📁 Workspace: ${config.workspace.root}`);
    console.log(`⚙️  Config: ${instanceOptions.env.CLAUDE_CONFIG_PATH}`);

    // For production, we'll simulate the Claude Code launch
    // In reality, this would be: spawn('claude-code', ['--config', configPath], instanceOptions)
    const childProcess = spawn('node', ['-e', this.createInstanceSimulator(type, config)], instanceOptions);

    const instance = {
      type: type,
      config: config,
      process: childProcess,
      pid: childProcess.pid,
      status: 'starting',
      startTime: Date.now(),
      lastHeartbeat: Date.now(),
      isCurrent: false
    };

    this.instances.set(type, instance);

    // Set up process event handlers
    this.setupProcessHandlers(type, childProcess);

    console.log(`✅ ${type} instance launched (PID: ${childProcess.pid})`);
    return instance;
  }

  /**
   * Create a simulator for Claude Code instance (for testing)
   */
  createInstanceSimulator(type, config) {
    return `
      const fs = require('fs');
      const path = require('path');
      
      console.log('🤖 Claude Code ${type} instance starting...');
      console.log('📂 Workspace: ${config.workspace.root}');
      
      // Simulate instance heartbeat
      setInterval(() => {
        const heartbeat = {
          type: '${type}',
          timestamp: new Date().toISOString(),
          status: 'healthy',
          workspace: '${config.workspace.root}',
          pid: process.pid
        };
        
        console.log('💓 Heartbeat:', JSON.stringify(heartbeat));
        
        // Write heartbeat to file for monitoring
        const heartbeatPath = '/tmp/claude-communication/${type}-heartbeat.json';
        fs.writeFileSync(heartbeatPath, JSON.stringify(heartbeat, null, 2));
      }, 10000);
      
      // Simulate handling different commands based on instance type
      if ('${type}' === 'development') {
        console.log('🔧 Development instance ready for coding assistance');
        console.log('🚫 Restricted from: agent_workspace/');
      } else if ('${type}' === 'production') {
        console.log('🏭 Production instance ready for agent orchestration');
        console.log('🤖 Agent definitions: ${config.agents?.definitions_path || 'N/A'}');
        console.log('📁 Agent workspace: ${config.agents?.workspace_path || 'N/A'}');
      }
      
      // Keep process alive
      process.stdin.resume();
    `;
  }

  async loadInstanceConfig(type) {
    const configPath = `/workspaces/agent-feed/.claude/${type}/config.json`;
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load ${type} configuration: ${error.message}`);
    }
  }

  setupProcessHandlers(type, process) {
    const instance = this.instances.get(type);

    process.on('spawn', () => {
      instance.status = 'running';
      console.log(`✅ ${type} instance spawned successfully`);
    });

    process.on('error', (error) => {
      instance.status = 'error';
      console.error(`❌ ${type} instance error:`, error);
    });

    process.on('exit', (code, signal) => {
      instance.status = 'stopped';
      console.log(`🔚 ${type} instance exited (code: ${code}, signal: ${signal})`);
      
      if (!this.isShuttingDown && code !== 0) {
        console.log(`🔄 Attempting to restart ${type} instance...`);
        setTimeout(() => this.restartInstance(type), 5000);
      }
    });

    process.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Log to instance-specific log file
      this.logInstanceOutput(type, 'stdout', message);
    });

    process.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(`[${type.toUpperCase()} ERROR] ${message}`);
      
      // Log to instance-specific log file
      this.logInstanceOutput(type, 'stderr', message);
    });
  }

  async logInstanceOutput(type, stream, message) {
    const logPath = `/workspaces/agent-feed/.claude/${type}/logs/claude-${type}.log`;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${stream.toUpperCase()}] ${message}\n`;
    
    try {
      await fs.appendFile(logPath, logEntry);
    } catch (error) {
      console.error(`Failed to write log for ${type}:`, error);
    }
  }

  async restartInstance(type) {
    try {
      console.log(`🔄 Restarting ${type} instance...`);
      
      // Stop the instance if it's still running
      await this.stopInstance(type);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Restart
      await this.launchInstance(type);
      
    } catch (error) {
      console.error(`❌ Failed to restart ${type} instance:`, error);
    }
  }

  async stopInstance(type) {
    const instance = this.instances.get(type);
    if (!instance) {
      throw new Error(`Instance ${type} is not running`);
    }

    console.log(`🛑 Stopping ${type} instance (PID: ${instance.pid})...`);
    
    // Special handling for development instance (current Claude Code)
    if (instance.isCurrent) {
      console.log(`⚠️  Development instance is the current Claude Code process - marking as stopped`);
      this.instances.delete(type);
      console.log(`✅ ${type} instance stopped`);
      return;
    }
    
    // Send SIGTERM first
    instance.process.kill('SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`🔨 Force killing ${type} instance...`);
        instance.process.kill('SIGKILL');
        resolve();
      }, 10000);
      
      instance.process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.instances.delete(type);
    console.log(`✅ ${type} instance stopped`);
  }

  /**
   * Launch both development and production instances
   */
  async launchBothInstances() {
    console.log('🚀 Launching dual Claude Code system...');
    
    try {
      // Register current Claude Code as development instance
      await this.launchInstance('dev');
      
      console.log('🔗 Development instance: Current Claude Code session');
      console.log('⚡ Production instance: Spawning new process...');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Launch production instance
      await this.launchInstance('prod');
      
      console.log('✅ Both instances active');
      console.log('🔗 Inter-instance communication enabled');
      console.log('📡 Dev (current) ↔ Prod (separate process)');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to launch dual system:', error);
      throw error;
    }
  }

  /**
   * Get status of all instances
   */
  getStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      instances: {},
      communication: this.dualManager.getStatus()
    };

    for (const [type, instance] of this.instances.entries()) {
      status.instances[type] = {
        type: instance.type,
        status: instance.status,
        pid: instance.pid,
        startTime: instance.startTime,
        uptime: Date.now() - instance.startTime,
        lastHeartbeat: instance.lastHeartbeat,
        workspace: instance.config.workspace.root
      };
    }

    return status;
  }

  /**
   * Monitor instance health
   */
  async startHealthMonitoring() {
    console.log('💓 Starting health monitoring...');
    
    setInterval(async () => {
      for (const [type, instance] of this.instances.entries()) {
        try {
          // Check heartbeat file
          const heartbeatPath = `/tmp/claude-communication/${type}-heartbeat.json`;
          const heartbeatData = await fs.readFile(heartbeatPath, 'utf8');
          const heartbeat = JSON.parse(heartbeatData);
          
          const age = Date.now() - new Date(heartbeat.timestamp).getTime();
          
          if (age > 30000) { // 30 seconds
            console.warn(`⚠️  ${type} instance heartbeat is stale (${age}ms)`);
          } else {
            instance.lastHeartbeat = Date.now();
          }
          
        } catch (error) {
          console.warn(`⚠️  No heartbeat for ${type} instance`);
        }
      }
    }, 15000); // Check every 15 seconds
  }

  setupSignalHandlers() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      console.log('🔄 Shutting down Claude Instance Launcher...');
      
      // Stop all instances
      const stopPromises = Array.from(this.instances.keys()).map(type => 
        this.stopInstance(type).catch(error => 
          console.error(`Failed to stop ${type}:`, error)
        )
      );
      
      await Promise.all(stopPromises);
      
      // Shutdown dual manager
      await this.dualManager.shutdown();
      
      console.log('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGUSR2', shutdown); // nodemon restart
  }
}

// CLI interface
if (require.main === module) {
  const launcher = new ClaudeInstanceLauncher();
  
  async function main() {
    try {
      await launcher.initialize();
      
      const command = process.argv[2];
      
      switch (command) {
        case 'dev':
          await launcher.launchInstance('development');
          break;
        case 'prod':
          await launcher.launchInstance('production');
          break;
        case 'both':
          await launcher.launchBothInstances();
          break;
        case 'status':
          console.log(JSON.stringify(launcher.getStatus(), null, 2));
          return;
        default:
          console.log('Usage: node claude-instance-launcher.js [dev|prod|both|status]');
          return;
      }
      
      // Start health monitoring
      await launcher.startHealthMonitoring();
      
      console.log('🎯 Claude Instance Launcher running. Press Ctrl+C to stop.');
      
    } catch (error) {
      console.error('❌ Failed to start:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = ClaudeInstanceLauncher;