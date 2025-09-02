/**
 * Claude Instance Manager Mock - London School TDD
 * Mock doubles for Claude instance creation and management
 */

const { jest } = require('@jest/globals');

class ClaudeInstanceManagerMock {
  constructor() {
    // Behavior verification spies
    this.createInstance = jest.fn();
    this.destroyInstance = jest.fn();
    this.getInstanceStatus = jest.fn();
    this.sendCommand = jest.fn();
    this.attachDebugger = jest.fn();
    
    // State tracking
    this.instances = new Map();
    this.activeConnections = new Set();
    this.commandQueue = [];
    
    // Mock responses setup
    this.setupDefaultBehavior();
  }

  setupDefaultBehavior() {
    // Instance creation mock behavior
    this.createInstance.mockImplementation(async (config) => {
      const instanceId = `mock-instance-${Date.now()}`;
      const instance = {
        id: instanceId,
        config,
        status: 'initializing',
        createdAt: new Date(),
        websocketUrl: `ws://localhost:8080/ws/${instanceId}`
      };
      
      this.instances.set(instanceId, instance);
      
      // Simulate async initialization
      setTimeout(() => {
        instance.status = 'ready';
      }, 100);
      
      return {
        success: true,
        instanceId,
        websocketUrl: instance.websocketUrl,
        status: instance.status
      };
    });

    // Instance destruction mock behavior
    this.destroyInstance.mockImplementation(async (instanceId) => {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        return { success: false, error: 'Instance not found' };
      }
      
      // Simulate cleanup process
      instance.status = 'destroying';
      this.activeConnections.delete(instanceId);
      
      setTimeout(() => {
        this.instances.delete(instanceId);
      }, 50);
      
      return { success: true, instanceId };
    });

    // Status checking mock behavior
    this.getInstanceStatus.mockImplementation(async (instanceId) => {
      const instance = this.instances.get(instanceId);
      if (!instance) {
        return { found: false };
      }
      
      return {
        found: true,
        status: instance.status,
        uptime: Date.now() - instance.createdAt.getTime(),
        hasActiveConnection: this.activeConnections.has(instanceId)
      };
    });

    // Command sending mock behavior
    this.sendCommand.mockImplementation(async (instanceId, command, options = {}) => {
      const instance = this.instances.get(instanceId);
      if (!instance || instance.status !== 'ready') {
        return { 
          success: false, 
          error: 'Instance not ready',
          instanceStatus: instance?.status || 'not_found'
        };
      }
      
      const commandId = `cmd-${Date.now()}`;
      const queuedCommand = {
        id: commandId,
        instanceId,
        command,
        options,
        status: 'queued',
        queuedAt: new Date()
      };
      
      this.commandQueue.push(queuedCommand);
      
      // Simulate command processing
      setTimeout(() => {
        queuedCommand.status = 'executing';
      }, 10);
      
      setTimeout(() => {
        queuedCommand.status = 'completed';
        queuedCommand.result = {
          output: `Mock output for: ${command}`,
          exitCode: 0,
          executionTime: 150
        };
      }, options.timeout || 200);
      
      return {
        success: true,
        commandId,
        instanceId,
        estimatedCompletion: Date.now() + (options.timeout || 200)
      };
    });
  }

  // Test utility methods
  getCallHistory(methodName) {
    return this[methodName].mock.calls;
  }

  getLastCall(methodName) {
    const calls = this.getCallHistory(methodName);
    return calls[calls.length - 1];
  }

  getCallCount(methodName) {
    return this[methodName].mock.calls.length;
  }

  getInstanceCount() {
    return this.instances.size;
  }

  getActiveConnectionCount() {
    return this.activeConnections.size;
  }

  getQueuedCommandCount() {
    return this.commandQueue.filter(cmd => cmd.status === 'queued').length;
  }

  // Mock state manipulation for testing
  simulateInstanceFailure(instanceId, error = 'Mock failure') {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = 'failed';
      instance.error = error;
    }
  }

  simulateConnectionLoss(instanceId) {
    this.activeConnections.delete(instanceId);
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = 'disconnected';
    }
  }

  simulateCommandTimeout(commandId) {
    const command = this.commandQueue.find(cmd => cmd.id === commandId);
    if (command) {
      command.status = 'timeout';
      command.error = 'Command execution timeout';
    }
  }

  // Behavior verification helpers
  verifyInstanceCreationFlow() {
    const createCalls = this.getCallHistory('createInstance');
    const statusCalls = this.getCallHistory('getInstanceStatus');
    
    return {
      instancesCreated: createCalls.length,
      statusChecks: statusCalls.length,
      creationFlow: createCalls.map((call, index) => ({
        call: index + 1,
        config: call[0],
        subsequentStatusChecks: statusCalls.filter(
          statusCall => statusCall[0] === this.instances.get(createCalls[index][0])?.id
        ).length
      }))
    };
  }

  verifyCommandExecutionFlow(instanceId) {
    const sendCalls = this.getCallHistory('sendCommand')
      .filter(call => call[0] === instanceId);
    
    const statusCalls = this.getCallHistory('getInstanceStatus')
      .filter(call => call[0] === instanceId);
    
    return {
      commandsSent: sendCalls.length,
      statusChecksForInstance: statusCalls.length,
      commandFlow: sendCalls.map(call => ({
        command: call[1],
        options: call[2],
        hasSubsequentStatusCheck: statusCalls.some(
          statusCall => statusCall.timestamp > call.timestamp
        )
      }))
    };
  }

  // Reset mock state for clean testing
  reset() {
    jest.clearAllMocks();
    this.instances.clear();
    this.activeConnections.clear();
    this.commandQueue.length = 0;
    this.setupDefaultBehavior();
  }
}

module.exports = {
  ClaudeInstanceManagerMock
};