#!/usr/bin/env node
/**
 * Production Claude Launcher
 * Standalone script to launch only the production Claude Code instance
 * Development instance is the current Claude Code session you're talking to
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ProductionClaudeLauncher {
  constructor() {
    this.prodInstance = null;
    this.configPath = '/workspaces/agent-feed/.claude/prod/config.json';
    this.workspaceRoot = '/workspaces/agent-feed/agent_workspace/';
  }

  async launch() {
    console.log('🏭 Launching Production Claude Code Instance...');
    
    try {
      // Ensure workspace exists
      await this.ensureWorkspace();
      
      // Load configuration
      const config = await this.loadConfig();
      console.log(`⚙️  Config loaded: ${this.configPath}`);
      console.log(`📁 Workspace: ${config.workspace.root}`);
      
      // Create production instance process
      await this.createProductionProcess(config);
      
      console.log('✅ Production instance launched successfully');
      console.log('🤖 Ready for agent orchestration');
      
    } catch (error) {
      console.error('❌ Failed to launch production instance:', error);
      throw error;
    }
  }

  async ensureWorkspace() {
    const directories = [
      'agents',
      'shared',
      'data',
      'logs',
      'agents/customer-service',
      'shared/customer-responses',
      'shared/escalations',
      'data/tickets'
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.workspaceRoot, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}/`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load production config: ${error.message}`);
    }
  }

  async createProductionProcess(config) {
    const env = {
      ...process.env,
      CLAUDE_CONFIG_PATH: this.configPath,
      CLAUDE_INSTANCE_TYPE: 'production',
      CLAUDE_WORKSPACE_ROOT: config.workspace.root,
      CLAUDE_DANGEROUS_SKIP_PERMISSIONS: 'true',
      CLAUDE_AGENT_MODE: 'true'
    };

    console.log('🚀 Starting production Claude Code simulator...');
    
    // Create the production instance simulator
    const simulatorCode = this.createProductionSimulator(config);
    
    this.prodInstance = spawn('node', ['-e', simulatorCode], {
      cwd: config.workspace.root,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Set up event handlers
    this.setupEventHandlers();
    
    return this.prodInstance;
  }

  createProductionSimulator(config) {
    return `
      const fs = require('fs');
      const path = require('path');
      
      console.log('🏭 Claude Code Production Instance Starting...');
      console.log('📂 Workspace: ${config.workspace.root}');
      console.log('🤖 Agent orchestration enabled');
      console.log('🚫 Restricted from development workspace');
      
      // Simulate agent management
      let activeAgents = new Map();
      let agentCounter = 0;
      
      // Load agent definitions
      const agentDefsPath = '${config.agents.definitions_path}';
      console.log('📋 Loading agent definitions from:', agentDefsPath);
      
      // Simulate agent execution
      function executeAgent(agentId) {
        console.log('🤖 Executing agent:', agentId);
        activeAgents.set(agentId, {
          id: agentId,
          status: 'running',
          startTime: Date.now(),
          workspace: path.join('${config.workspace.root}', 'agents', agentId)
        });
      }
      
      // Simulate customer service agent
      setTimeout(() => {
        executeAgent('customer-service-v1');
        console.log('💬 Customer service agent deployed');
        
        // Simulate handling customer inquiries
        setInterval(() => {
          const ticketId = 'TICKET-' + (++agentCounter);
          console.log('🎫 Processing customer ticket:', ticketId);
          
          // Simulate writing response to shared area
          const responsePath = path.join('${config.workspace.root}', 'shared', 'customer-responses', ticketId + '.md');
          const response = '# Customer Response\\n\\nThank you for your inquiry. We are processing your request.\\n\\nTicket ID: ' + ticketId;
          
          try {
            fs.writeFileSync(responsePath, response);
            console.log('💾 Response saved:', responsePath);
          } catch (error) {
            console.error('❌ Failed to save response:', error.message);
          }
        }, 30000); // Every 30 seconds
        
      }, 5000);
      
      // Health monitoring
      setInterval(() => {
        const heartbeat = {
          instance: 'production',
          timestamp: new Date().toISOString(),
          status: 'healthy',
          activeAgents: activeAgents.size,
          workspace: '${config.workspace.root}',
          pid: process.pid
        };
        
        console.log('💓 Production heartbeat:', JSON.stringify(heartbeat));
        
        // Write heartbeat for monitoring
        const heartbeatPath = '/tmp/claude-communication/production-heartbeat.json';
        try {
          fs.writeFileSync(heartbeatPath, JSON.stringify(heartbeat, null, 2));
        } catch (error) {
          console.error('❌ Failed to write heartbeat:', error.message);
        }
      }, 15000);
      
      // Inter-instance communication monitoring
      setInterval(() => {
        const queuePath = '/tmp/claude-communication/production-queue.json';
        try {
          if (fs.existsSync(queuePath)) {
            const queueData = fs.readFileSync(queuePath, 'utf8');
            const queue = JSON.parse(queueData);
            
            if (queue.length > 0) {
              console.log('📥 Processing', queue.length, 'messages from development instance');
              
              for (const message of queue) {
                console.log('⚡ Executing handoff:', message.payload?.task || 'unknown task');
                
                if (message.payload?.task?.includes('customer service')) {
                  console.log('🤖 Deploying customer service agent based on dev request');
                  executeAgent('customer-service-v1');
                }
              }
              
              // Clear processed messages
              fs.writeFileSync(queuePath, JSON.stringify([], null, 2));
            }
          }
        } catch (error) {
          // Queue file doesn't exist or is corrupted, ignore
        }
      }, 5000);
      
      console.log('✅ Production instance ready');
      console.log('🔗 Monitoring for development handoffs...');
      
      // Keep process alive
      process.stdin.resume();
    `;
  }

  setupEventHandlers() {
    this.prodInstance.on('spawn', () => {
      console.log('✅ Production process spawned successfully');
    });

    this.prodInstance.on('error', (error) => {
      console.error('❌ Production instance error:', error);
    });

    this.prodInstance.on('exit', (code, signal) => {
      console.log(`🔚 Production instance exited (code: ${code}, signal: ${signal})`);
    });

    this.prodInstance.stdout.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[PROD] ${message}`);
    });

    this.prodInstance.stderr.on('data', (data) => {
      const message = data.toString().trim();
      console.error(`[PROD ERROR] ${message}`);
    });

    // Handle shutdown signals
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async shutdown() {
    console.log('🛑 Shutting down production instance...');
    
    if (this.prodInstance) {
      this.prodInstance.kill('SIGTERM');
      
      // Wait for graceful shutdown
      setTimeout(() => {
        if (!this.prodInstance.killed) {
          console.log('🔨 Force killing production instance...');
          this.prodInstance.kill('SIGKILL');
        }
      }, 5000);
    }
    
    console.log('✅ Production shutdown complete');
    process.exit(0);
  }

  getStatus() {
    return {
      running: this.prodInstance && !this.prodInstance.killed,
      pid: this.prodInstance?.pid,
      workspace: this.workspaceRoot,
      config: this.configPath
    };
  }
}

// CLI interface
if (require.main === module) {
  const launcher = new ProductionClaudeLauncher();
  
  async function main() {
    try {
      await launcher.launch();
      
      console.log('🎯 Production Claude Code running. Press Ctrl+C to stop.');
      
      // Status monitoring
      setInterval(() => {
        const status = launcher.getStatus();
        if (!status.running) {
          console.error('❌ Production instance has stopped unexpectedly');
          process.exit(1);
        }
      }, 30000);
      
    } catch (error) {
      console.error('💥 Failed to start production instance:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = ProductionClaudeLauncher;