const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const pty = require('node-pty');

/**
 * Claude Process Manager for handling dedicated Claude instances
 */
class ClaudeProcessManager extends EventEmitter {
  constructor() {
    super();
    this.instances = new Map();
    this.maxInstances = 4;
    this.maxOutputBuffer = 1000;
    this.setupCleanup();
  }

  /**
   * Create and start a new Claude instance
   */
  async createInstance(config) {
    if (this.instances.size >= this.maxInstances) {
      throw new Error(`Maximum number of instances (${this.maxInstances}) reached`);
    }

    const instanceId = config.id || uuidv4();
    
    // Validate config
    if (!config.name) {
      throw new Error('Instance name is required');
    }

    // Prepare command and args based on mode
    let command = 'claude';
    let args = [];
    
    // Handle different launch modes
    if (config.mode === 'chat') {
      args = ['chat'];
    } else if (config.mode === 'code') {
      args = ['code'];
    } else if (config.mode === 'help') {
      args = ['--help'];
    } else if (config.mode === 'version') {
      args = ['--version'];
    } else if (config.command) {
      // Custom command passed
      args = config.args || [];
    }

    // Add any additional args
    if (config.additionalArgs) {
      args = [...args, ...config.additionalArgs];
    }

    // Create the PTY process for better terminal control
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: config.cwd || process.cwd(),
      env: { ...process.env, ...config.env }
    });

    const instance = {
      id: instanceId,
      name: config.name,
      config,
      process: ptyProcess,
      status: 'starting',
      startTime: new Date(),
      output: [],
      pid: ptyProcess.pid
    };

    // Handle output
    ptyProcess.onData((data) => {
      // Store output in buffer
      instance.output.push(data);
      if (instance.output.length > this.maxOutputBuffer) {
        instance.output.shift();
      }

      // Update status if needed
      if (instance.status === 'starting') {
        // Check for various Claude startup messages
        if (data.includes('Welcome to Claude') || 
            data.includes('Claude Code') ||
            data.includes('╭─') ||  // Claude UI box drawing
            data.includes('✻')) {   // Claude welcome symbol
          instance.status = 'running';
          this.emit('instance:ready', instance);
        }
      }

      // Emit output event for real-time streaming
      this.emit('instance:output', {
        instanceId,
        data
      });
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Claude instance ${instanceId} exited with code ${exitCode}, signal ${signal}`);
      instance.status = 'stopped';
      this.emit('instance:exit', {
        instanceId,
        exitCode,
        signal
      });
      this.instances.delete(instanceId);
    });

    // Store instance
    this.instances.set(instanceId, instance);

    // Emit creation event
    this.emit('instance:created', instance);

    // Mark as running after a short delay (for non-interactive modes)
    if (config.mode === 'version' || config.mode === 'help') {
      setTimeout(() => {
        if (instance.status === 'starting') {
          instance.status = 'running';
          this.emit('instance:ready', instance);
        }
      }, 500);
    }

    return instance;
  }

  /**
   * Send input to a Claude instance
   */
  sendInput(instanceId, input) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.status !== 'running') {
      throw new Error(`Instance ${instanceId} is not running (status: ${instance.status})`);
    }

    instance.process.write(input);
    
    this.emit('instance:input', {
      instanceId,
      input
    });
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances
   */
  getAllInstances() {
    return Array.from(this.instances.values());
  }

  /**
   * Get recent output from an instance
   */
  getOutput(instanceId, lines = 50) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    return instance.output.slice(-lines).join('');
  }

  /**
   * Terminate a Claude instance
   */
  async terminateInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    try {
      // Try graceful shutdown first
      instance.process.write('\x03'); // Ctrl+C
      
      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force kill if still running
      if (instance.process) {
        instance.process.kill();
      }
      
      instance.status = 'stopped';
      this.instances.delete(instanceId);
      
      this.emit('instance:terminated', { instanceId });
    } catch (error) {
      console.error(`Error terminating instance ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Terminate all instances
   */
  async terminateAll() {
    const promises = Array.from(this.instances.keys()).map(id => 
      this.terminateInstance(id).catch(err => 
        console.error(`Failed to terminate instance ${id}:`, err)
      )
    );
    
    await Promise.all(promises);
  }

  /**
   * Resize instance terminal
   */
  resizeInstance(instanceId, cols, rows) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    instance.process.resize(cols, rows);
    
    this.emit('instance:resize', {
      instanceId,
      cols,
      rows
    });
  }

  /**
   * Setup cleanup handlers
   */
  setupCleanup() {
    process.on('SIGINT', async () => {
      console.log('Cleaning up Claude instances...');
      await this.terminateAll();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.terminateAll();
      process.exit(0);
    });
  }

  /**
   * Create instances for the 4 button configurations
   */
  async createDefaultInstances() {
    const configs = [
      {
        name: 'Claude Chat',
        mode: 'chat',
        cwd: '/workspaces/agent-feed'
      },
      {
        name: 'Claude Code', 
        mode: 'code',
        cwd: '/workspaces/agent-feed'
      },
      {
        name: 'Claude Help',
        mode: 'help',
        cwd: '/workspaces/agent-feed'
      },
      {
        name: 'Claude Version',
        mode: 'version',
        cwd: '/workspaces/agent-feed'
      }
    ];

    const results = [];
    for (const config of configs) {
      try {
        const instance = await this.createInstance(config);
        console.log(`Created instance: ${config.name} (${instance.id})`);
        results.push(instance);
      } catch (error) {
        console.error(`Failed to create instance ${config.name}:`, error);
        results.push({ error: error.message, config });
      }
    }
    
    return results;
  }
}

module.exports = ClaudeProcessManager;