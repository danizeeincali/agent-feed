/**
 * TDD London School: Complete Integration Workflow Testing
 * 
 * Focus: End-to-end workflow testing with all 4 Claude command variants
 * London School Methodology: Mock entire system collaborations, verify complete contracts
 * 
 * Testing: Button click → process spawn → terminal connect → user interaction → cleanup
 */

import { jest } from 'vitest';
import { EventEmitter } from 'events';

// === COMPLETE SYSTEM MOCKS ===
const mockPtyProcess = {
  pid: 88888,
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  onData: vi.fn(),
  onExit: vi.fn(),
  removeAllListeners: vi.fn()
};

const mockPtySpawn = vi.fn().mockReturnValue(mockPtyProcess);

const mockSSEResponse = {
  writeHead: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
  on: vi.fn()
};

const mockFetch = vi.fn();

vi.mock('node-pty', () => ({
  spawn: mockPtySpawn
}));

// === COMPLETE CLAUDE SYSTEM INTEGRATION ===
class CompleteClaudeSystemIntegration extends EventEmitter {
  private instances = new Map<string, any>();
  private sseConnections = new Map<string, any>();
  private buttonConfigurations = new Map<string, any>();
  private workflowMetrics = new Map<string, any>();

  constructor() {
    super();
    this.setupButtonConfigurations();
  }

  private setupButtonConfigurations() {
    // === THE 4 CLAUDE BUTTON CONFIGURATIONS ===
    this.buttonConfigurations.set('prod-claude', {
      name: '🚀 prod/claude',
      command: 'claude',
      args: [],
      cwd: '/workspaces/agent-feed/prod',
      env: { CLAUDE_ENV: 'production' },
      expectedOutput: ['Welcome to Claude', 'Ready to help'],
      buttonSelector: '[data-testid="launch-prod-claude"]'
    });

    this.buttonConfigurations.set('skip-permissions', {
      name: '⚡ skip-permissions',
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      cwd: '/workspaces/agent-feed/prod',
      env: { CLAUDE_SKIP_PERMS: 'true' },
      expectedOutput: ['Skipping permissions', 'Claude ready'],
      buttonSelector: '[data-testid="launch-skip-permissions"]'
    });

    this.buttonConfigurations.set('skip-permissions-c', {
      name: '🛠️ skip-permissions-c',
      command: 'claude',
      args: ['--dangerously-skip-permissions', '--claude-dev'],
      cwd: '/workspaces/agent-feed/prod',
      env: { CLAUDE_DEV_MODE: 'true' },
      expectedOutput: ['Dev mode enabled', 'Claude Code ready'],
      buttonSelector: '[data-testid="launch-skip-permissions-c"]'
    });

    this.buttonConfigurations.set('skip-permissions-resume', {
      name: '🔄 skip-permissions-resume',
      command: 'claude',
      args: ['--dangerously-skip-permissions', '--resume'],
      cwd: '/workspaces/agent-feed/prod',
      env: { CLAUDE_RESUME: 'true' },
      expectedOutput: ['Resuming session', 'Claude restored'],
      buttonSelector: '[data-testid="launch-skip-permissions-resume"]'
    });
  }

  // === COMPLETE WORKFLOW: BUTTON CLICK → PROCESS → TERMINAL ===
  async executeCompleteWorkflow(buttonId: string, userInteractions?: string[]) {
    const workflowId = `workflow-${buttonId}-${Date.now()}`;
    const startTime = Date.now();

    this.emit('workflow:started', {
      workflowId,
      buttonId,
      timestamp: startTime
    });

    try {
      // === PHASE 1: BUTTON CLICK SIMULATION ===
      const buttonConfig = this.buttonConfigurations.get(buttonId);
      if (!buttonConfig) {
        throw new Error(`Unknown button configuration: ${buttonId}`);
      }

      this.emit('workflow:phase', {
        workflowId,
        phase: 'button_click',
        config: buttonConfig
      });

      // === PHASE 2: BACKEND API CALL ===
      const createResponse = await this.simulateInstanceCreationAPI(buttonConfig);
      
      this.emit('workflow:phase', {
        workflowId,
        phase: 'api_call',
        response: createResponse
      });

      // === PHASE 3: PROCESS SPAWNING ===
      const processInfo = await this.spawnClaudeProcess(createResponse.instanceId, buttonConfig);
      
      this.emit('workflow:phase', {
        workflowId,
        phase: 'process_spawn',
        processInfo: {
          id: processInfo.id,
          pid: processInfo.pid,
          status: processInfo.status
        }
      });

      // === PHASE 4: SSE CONNECTION ESTABLISHMENT ===
      const sseConnection = this.establishSSEConnection(processInfo.id);
      
      this.emit('workflow:phase', {
        workflowId,
        phase: 'sse_connection',
        connectionId: sseConnection.id
      });

      // === PHASE 5: WAIT FOR PROCESS READY ===
      await this.waitForProcessReady(processInfo.id, buttonConfig.expectedOutput);
      
      this.emit('workflow:phase', {
        workflowId,
        phase: 'process_ready',
        readyTime: Date.now() - startTime
      });

      // === PHASE 6: USER INTERACTIONS (OPTIONAL) ===
      if (userInteractions && userInteractions.length > 0) {
        const interactionResults = await this.executeUserInteractions(
          processInfo.id,
          userInteractions
        );
        
        this.emit('workflow:phase', {
          workflowId,
          phase: 'user_interactions',
          interactions: interactionResults
        });
      }

      // === WORKFLOW SUCCESS ===
      const metrics = {
        workflowId,
        buttonId,
        totalTime: Date.now() - startTime,
        phases: ['button_click', 'api_call', 'process_spawn', 'sse_connection', 'process_ready'],
        instanceId: processInfo.id,
        success: true
      };

      this.workflowMetrics.set(workflowId, metrics);

      this.emit('workflow:completed', metrics);

      return {
        workflowId,
        instanceId: processInfo.id,
        sseConnectionId: sseConnection.id,
        metrics
      };

    } catch (error) {
      this.emit('workflow:failed', {
        workflowId,
        buttonId,
        error: (error as Error).message,
        failedAt: Date.now() - startTime
      });
      throw error;
    }
  }

  private async simulateInstanceCreationAPI(config: any) {
    // === MOCK BACKEND API CALL ===
    const response = {
      success: true,
      instanceId: `claude-${config.name.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
      name: config.name,
      pid: mockPtyProcess.pid,
      message: 'Instance created successfully'
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));

    this.emit('api:instance:created', response);

    return response;
  }

  private async spawnClaudeProcess(instanceId: string, config: any) {
    const ptyProcess = mockPtySpawn(config.command, config.args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: config.cwd,
      env: config.env
    });

    const processInfo = {
      id: instanceId,
      process: ptyProcess,
      config,
      status: 'starting',
      startTime: Date.now(),
      outputBuffer: [],
      expectedOutputReceived: []
    };

    this.setupProcessEventHandlers(instanceId, processInfo);
    this.instances.set(instanceId, processInfo);

    this.emit('process:spawned', {
      instanceId,
      pid: ptyProcess.pid,
      command: config.command,
      args: config.args
    });

    return processInfo;
  }

  private setupProcessEventHandlers(instanceId: string, processInfo: any) {
    const dataCallback = (data: string) => {
      processInfo.outputBuffer.push(data);
      
      // Check for expected output patterns
      const config = processInfo.config;
      config.expectedOutput.forEach((pattern: string) => {
        if (data.includes(pattern) && !processInfo.expectedOutputReceived.includes(pattern)) {
          processInfo.expectedOutputReceived.push(pattern);
          
          this.emit('process:expected:output', {
            instanceId,
            pattern,
            data
          });
        }
      });

      // Check if process is ready
      if (processInfo.status === 'starting' && this.isProcessReady(processInfo)) {
        processInfo.status = 'ready';
        this.emit('process:ready', {
          instanceId,
          readyTime: Date.now() - processInfo.startTime
        });
      }

      // Broadcast to SSE
      this.broadcastToSSE(instanceId, {
        type: 'terminal_output',
        data,
        timestamp: Date.now()
      });
    };

    const exitCallback = ({ exitCode, signal }: any) => {
      processInfo.status = 'exited';
      this.emit('process:exited', {
        instanceId,
        exitCode,
        signal
      });
    };

    mockPtyProcess.onData(dataCallback);
    mockPtyProcess.onExit(exitCallback);

    // Store callbacks for later cleanup
    processInfo.eventCallbacks = { dataCallback, exitCallback };
  }

  private isProcessReady(processInfo: any): boolean {
    const expectedOutputs = processInfo.config.expectedOutput;
    return expectedOutputs.every((output: string) => 
      processInfo.expectedOutputReceived.includes(output)
    );
  }

  private establishSSEConnection(instanceId: string) {
    const connectionId = `sse-${instanceId}`;
    
    mockSSEResponse.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const connection = {
      id: connectionId,
      instanceId,
      response: mockSSEResponse,
      isActive: true,
      messageCount: 0
    };

    this.sseConnections.set(connectionId, connection);

    // Send connection established message
    this.sendSSEMessage(connectionId, {
      type: 'connection_established',
      instanceId,
      timestamp: Date.now()
    });

    this.emit('sse:connected', { connectionId, instanceId });

    return connection;
  }

  private sendSSEMessage(connectionId: string, message: any) {
    const connection = this.sseConnections.get(connectionId);
    if (!connection || !connection.isActive) return;

    const sseData = `data: ${JSON.stringify(message)}\n\n`;
    connection.response.write(sseData);
    connection.messageCount++;
  }

  private broadcastToSSE(instanceId: string, message: any) {
    const connections = Array.from(this.sseConnections.values())
      .filter(conn => conn.instanceId === instanceId && conn.isActive);

    connections.forEach(conn => {
      this.sendSSEMessage(conn.id, message);
    });
  }

  private async waitForProcessReady(instanceId: string, expectedOutputs: string[], timeout: number = 5000) {
    return new Promise<void>((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        const processInfo = this.instances.get(instanceId);
        if (!processInfo) {
          reject(new Error(`Process ${instanceId} not found`));
          return;
        }

        if (processInfo.status === 'ready') {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`Process ${instanceId} ready timeout after ${timeout}ms`));
          return;
        }

        setTimeout(checkReady, 100);
      };

      // Simulate expected output reception
      setTimeout(() => {
        expectedOutputs.forEach(output => {
          if (mockPtyProcess.onData) {
            const callback = this.instances.get(instanceId)?.eventCallbacks?.dataCallback;
            if (callback) callback(output + '\n');
          }
        });
      }, 100);

      checkReady();
    });
  }

  private async executeUserInteractions(instanceId: string, interactions: string[]) {
    const results = [];

    for (const interaction of interactions) {
      const startTime = Date.now();
      
      // Send input to process
      this.sendInput(instanceId, interaction);
      
      // Simulate response
      const response = await this.simulateProcessResponse(instanceId, interaction);
      
      results.push({
        input: interaction,
        response,
        responseTime: Date.now() - startTime
      });
    }

    return results;
  }

  private sendInput(instanceId: string, input: string) {
    const processInfo = this.instances.get(instanceId);
    if (!processInfo) throw new Error(`Instance ${instanceId} not found`);

    const formattedInput = input.endsWith('\n') ? input : input + '\n';
    processInfo.process.write(formattedInput);

    this.emit('input:sent', {
      instanceId,
      input: formattedInput
    });
  }

  private async simulateProcessResponse(instanceId: string, input: string) {
    // Mock different responses based on input
    let response = '';
    
    if (input.includes('hello')) {
      response = 'Claude: Hello! How can I help you today?';
    } else if (input.includes('help')) {
      response = 'Claude: Available commands:\n- help: Show this help\n- exit: Exit Claude\n- version: Show version';
    } else if (input.includes('version')) {
      response = 'Claude: Version 3.0.0';
    } else {
      response = `Claude: I received "${input}". How can I assist you with that?`;
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send response through data handler
    const processInfo = this.instances.get(instanceId);
    if (processInfo?.eventCallbacks?.dataCallback) {
      processInfo.eventCallbacks.dataCallback(response + '\n');
    }

    return response;
  }

  // === CLEANUP AND RESOURCE MANAGEMENT ===
  async cleanupWorkflow(workflowId: string) {
    const metrics = this.workflowMetrics.get(workflowId);
    if (!metrics) return;

    const instanceId = metrics.instanceId;
    
    // Close SSE connections
    const connections = Array.from(this.sseConnections.values())
      .filter(conn => conn.instanceId === instanceId);
    
    connections.forEach(conn => {
      conn.isActive = false;
      conn.response.end();
      this.sseConnections.delete(conn.id);
    });

    // Terminate process
    const processInfo = this.instances.get(instanceId);
    if (processInfo) {
      processInfo.process.kill();
      this.instances.delete(instanceId);
    }

    this.workflowMetrics.delete(workflowId);

    this.emit('workflow:cleanup', {
      workflowId,
      instanceId
    });
  }

  getWorkflowMetrics(workflowId: string) {
    return this.workflowMetrics.get(workflowId);
  }

  getAllActiveInstances() {
    return Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      status: instance.status,
      config: instance.config,
      startTime: instance.startTime
    }));
  }
}

describe('TDD London School: Complete Integration Workflow', () => {
  let claudeSystem: CompleteClaudeSystemIntegration;

  beforeEach(() => {
    vi.clearAllMocks();
    claudeSystem = new CompleteClaudeSystemIntegration();
  });

  describe('Four Button Integration Workflows', () => {
    test('should complete full workflow for prod claude button', async () => {
      const workflowStartedHandler = vi.fn();
      const workflowCompletedHandler = vi.fn();
      const processSpawnedHandler = vi.fn();
      const processReadyHandler = vi.fn();

      claudeSystem.on('workflow:started', workflowStartedHandler);
      claudeSystem.on('workflow:completed', workflowCompletedHandler);
      claudeSystem.on('process:spawned', processSpawnedHandler);
      claudeSystem.on('process:ready', processReadyHandler);

      // === EXECUTE COMPLETE PROD WORKFLOW ===
      const result = await claudeSystem.executeCompleteWorkflow('prod-claude');

      // === VERIFY WORKFLOW CONTRACT ===
      expect(workflowStartedHandler).toHaveBeenCalledWith({
        workflowId: result.workflowId,
        buttonId: 'prod-claude',
        timestamp: expect.any(Number)
      });

      expect(processSpawnedHandler).toHaveBeenCalledWith({
        instanceId: result.instanceId,
        pid: 88888,
        command: 'claude',
        args: []
      });

      expect(processReadyHandler).toHaveBeenCalledWith({
        instanceId: result.instanceId,
        readyTime: expect.any(Number)
      });

      expect(workflowCompletedHandler).toHaveBeenCalledWith({
        workflowId: result.workflowId,
        buttonId: 'prod-claude',
        totalTime: expect.any(Number),
        phases: expect.arrayContaining(['button_click', 'api_call', 'process_spawn', 'sse_connection', 'process_ready']),
        instanceId: result.instanceId,
        success: true
      });

      // === VERIFY PROCESS SPAWN CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining({ CLAUDE_ENV: 'production' })
      });
    });

    test('should complete workflow for skip-permissions button', async () => {
      const result = await claudeSystem.executeCompleteWorkflow('skip-permissions');

      // === VERIFY SKIP-PERMISSIONS SPAWN CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining({ CLAUDE_SKIP_PERMS: 'true' })
      });

      expect(result.success).toBe(true);
    });

    test('should complete workflow for skip-permissions-c button', async () => {
      const result = await claudeSystem.executeCompleteWorkflow('skip-permissions-c');

      // === VERIFY SKIP-PERMISSIONS-C SPAWN CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith(
        'claude', 
        ['--dangerously-skip-permissions', '--claude-dev'], 
        expect.objectContaining({
          env: expect.objectContaining({ CLAUDE_DEV_MODE: 'true' })
        })
      );
    });

    test('should complete workflow for skip-permissions-resume button', async () => {
      const result = await claudeSystem.executeCompleteWorkflow('skip-permissions-resume');

      // === VERIFY SKIP-PERMISSIONS-RESUME SPAWN CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith(
        'claude', 
        ['--dangerously-skip-permissions', '--resume'], 
        expect.objectContaining({
          env: expect.objectContaining({ CLAUDE_RESUME: 'true' })
        })
      );
    });
  });

  describe('User Interaction Integration Contracts', () => {
    test('should handle complete user conversation workflow', async () => {
      const inputSentHandler = vi.fn();
      claudeSystem.on('input:sent', inputSentHandler);

      const interactions = [
        'hello',
        'help',
        'version'
      ];

      // === EXECUTE WORKFLOW WITH INTERACTIONS ===
      const result = await claudeSystem.executeCompleteWorkflow(
        'prod-claude', 
        interactions
      );

      // === VERIFY USER INTERACTION CONTRACTS ===
      expect(inputSentHandler).toHaveBeenCalledTimes(3);
      
      interactions.forEach((interaction, index) => {
        expect(inputSentHandler).toHaveBeenNthCalledWith(index + 1, {
          instanceId: result.instanceId,
          input: interaction + '\n'
        });
      });

      // === VERIFY INPUT PROCESSING ===
      expect(mockPtyProcess.write).toHaveBeenCalledWith('hello\n');
      expect(mockPtyProcess.write).toHaveBeenCalledWith('help\n');
      expect(mockPtyProcess.write).toHaveBeenCalledWith('version\n');
    });

    test('should process expected output patterns correctly', async () => {
      const expectedOutputHandler = vi.fn();
      claudeSystem.on('process:expected:output', expectedOutputHandler);

      await claudeSystem.executeCompleteWorkflow('prod-claude');

      // === VERIFY EXPECTED OUTPUT RECOGNITION ===
      expect(expectedOutputHandler).toHaveBeenCalledWith({
        instanceId: expect.any(String),
        pattern: 'Welcome to Claude',
        data: 'Welcome to Claude\n'
      });

      expect(expectedOutputHandler).toHaveBeenCalledWith({
        instanceId: expect.any(String),
        pattern: 'Ready to help',
        data: 'Ready to help\n'
      });
    });
  });

  describe('SSE Integration Contracts', () => {
    test('should establish SSE connection and stream output', async () => {
      const sseConnectedHandler = vi.fn();
      claudeSystem.on('sse:connected', sseConnectedHandler);

      const result = await claudeSystem.executeCompleteWorkflow(
        'prod-claude',
        ['hello world']
      );

      // === VERIFY SSE CONNECTION CONTRACT ===
      expect(sseConnectedHandler).toHaveBeenCalledWith({
        connectionId: result.sseConnectionId,
        instanceId: result.instanceId
      });

      // === VERIFY SSE HEADERS ===
      expect(mockSSEResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // === VERIFY SSE MESSAGE STREAMING ===
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('connection_established')
      );
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('terminal_output')
      );
    });

    test('should handle SSE broadcasting for multiple connections', async () => {
      const result1 = await claudeSystem.executeCompleteWorkflow('prod-claude');
      
      // Create second SSE connection to same instance
      const connection2 = claudeSystem.establishSSEConnection(result1.instanceId);

      // Send input to generate output
      claudeSystem.sendInput(result1.instanceId, 'test broadcast');

      // === VERIFY BROADCAST TO ALL CONNECTIONS ===
      expect(mockSSEResponse.write).toHaveBeenCalledTimes(4); // 2 connections + 2 messages each
    });
  });

  describe('Performance and Timing Contracts', () => {
    test('should complete workflow within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const result = await claudeSystem.executeCompleteWorkflow('prod-claude');
      
      const duration = Date.now() - startTime;
      const metrics = claudeSystem.getWorkflowMetrics(result.workflowId);

      // === VERIFY PERFORMANCE CONTRACT ===
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(metrics?.totalTime).toBeGreaterThan(0);
      expect(metrics?.totalTime).toBeLessThan(1000);
    });

    test('should handle concurrent workflows efficiently', async () => {
      const startTime = Date.now();
      
      // === RUN MULTIPLE WORKFLOWS CONCURRENTLY ===
      const workflows = await Promise.all([
        claudeSystem.executeCompleteWorkflow('prod-claude'),
        claudeSystem.executeCompleteWorkflow('skip-permissions'),
        claudeSystem.executeCompleteWorkflow('skip-permissions-c')
      ]);

      const duration = Date.now() - startTime;

      // === VERIFY CONCURRENT EXECUTION CONTRACT ===
      expect(workflows).toHaveLength(3);
      expect(duration).toBeLessThan(2000); // Concurrent should be faster than sequential
      
      // All workflows should succeed
      workflows.forEach(workflow => {
        expect(workflow.instanceId).toBeDefined();
      });

      // === VERIFY PROCESS ISOLATION ===
      expect(mockPtySpawn).toHaveBeenCalledTimes(3);
      const instances = claudeSystem.getAllActiveInstances();
      expect(instances).toHaveLength(3);
    });
  });

  describe('Error Handling in Complete Workflows', () => {
    test('should handle spawn failure in workflow', async () => {
      const workflowFailedHandler = vi.fn();
      claudeSystem.on('workflow:failed', workflowFailedHandler);

      // === MOCK SPAWN FAILURE ===
      mockPtySpawn.mockImplementationOnce(() => {
        throw new Error('Command not found');
      });

      // === VERIFY WORKFLOW FAILURE HANDLING ===
      await expect(
        claudeSystem.executeCompleteWorkflow('prod-claude')
      ).rejects.toThrow('Command not found');

      expect(workflowFailedHandler).toHaveBeenCalledWith({
        workflowId: expect.any(String),
        buttonId: 'prod-claude',
        error: 'Command not found',
        failedAt: expect.any(Number)
      });
    });

    test('should handle process ready timeout', async () => {
      // Don't simulate expected output to trigger timeout
      mockPtyProcess.onData.mockImplementation(() => {
        // No callback setup, so expected output won't be processed
      });

      await expect(
        claudeSystem.executeCompleteWorkflow('prod-claude')
      ).rejects.toThrow(/ready timeout/);
    });

    test('should handle unknown button configuration', async () => {
      await expect(
        claudeSystem.executeCompleteWorkflow('unknown-button')
      ).rejects.toThrow('Unknown button configuration: unknown-button');
    });
  });

  describe('Resource Cleanup Contracts', () => {
    test('should cleanup all resources after workflow', async () => {
      const cleanupHandler = vi.fn();
      claudeSystem.on('workflow:cleanup', cleanupHandler);

      const result = await claudeSystem.executeCompleteWorkflow('prod-claude');

      // === CLEANUP WORKFLOW ===
      await claudeSystem.cleanupWorkflow(result.workflowId);

      // === VERIFY CLEANUP CONTRACT ===
      expect(cleanupHandler).toHaveBeenCalledWith({
        workflowId: result.workflowId,
        instanceId: result.instanceId
      });

      // === VERIFY RESOURCE CLEANUP ===
      expect(mockSSEResponse.end).toHaveBeenCalled();
      expect(mockPtyProcess.kill).toHaveBeenCalled();
      
      // No active instances should remain
      expect(claudeSystem.getAllActiveInstances()).toHaveLength(0);
    });

    test('should handle cleanup of multiple workflows', async () => {
      const workflows = await Promise.all([
        claudeSystem.executeCompleteWorkflow('prod-claude'),
        claudeSystem.executeCompleteWorkflow('skip-permissions')
      ]);

      // === CLEANUP ALL WORKFLOWS ===
      await Promise.all(workflows.map(workflow => 
        claudeSystem.cleanupWorkflow(workflow.workflowId)
      ));

      // === VERIFY COMPLETE CLEANUP ===
      expect(mockSSEResponse.end).toHaveBeenCalledTimes(2);
      expect(mockPtyProcess.kill).toHaveBeenCalledTimes(2);
      expect(claudeSystem.getAllActiveInstances()).toHaveLength(0);
    });
  });

  describe('Regression Prevention Contracts', () => {
    test('should maintain consistent behavior across all button types', async () => {
      const buttonTypes = ['prod-claude', 'skip-permissions', 'skip-permissions-c', 'skip-permissions-resume'];
      
      for (const buttonType of buttonTypes) {
        const result = await claudeSystem.executeCompleteWorkflow(buttonType);
        
        // === VERIFY CONSISTENT CONTRACT FOR ALL BUTTONS ===
        expect(result.instanceId).toBeDefined();
        expect(result.sseConnectionId).toBeDefined();
        expect(result.metrics.success).toBe(true);
        expect(result.metrics.phases).toContain('process_spawn');
        
        // Cleanup after each test
        await claudeSystem.cleanupWorkflow(result.workflowId);
      }

      // === VERIFY ALL SPAWNS HAD CORRECT CONFIGURATIONS ===
      expect(mockPtySpawn).toHaveBeenCalledTimes(4);
      expect(mockPtySpawn).toHaveBeenNthCalledWith(1, 'claude', [], expect.any(Object));
      expect(mockPtySpawn).toHaveBeenNthCalledWith(2, 'claude', ['--dangerously-skip-permissions'], expect.any(Object));
      expect(mockPtySpawn).toHaveBeenNthCalledWith(3, 'claude', ['--dangerously-skip-permissions', '--claude-dev'], expect.any(Object));
      expect(mockPtySpawn).toHaveBeenNthCalledWith(4, 'claude', ['--dangerously-skip-permissions', '--resume'], expect.any(Object));
    });
  });
});