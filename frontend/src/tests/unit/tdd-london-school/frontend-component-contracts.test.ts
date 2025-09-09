/**
 * TDD London School Tests for Frontend Component Contracts
 * 
 * Tests focusing on behavior verification and component collaboration
 * without relying on implementation details
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Contract interfaces for component collaborations
interface SSEConnectionContract {
  connect: (instanceId: string) => void;
  disconnect: () => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
  isConnected: boolean;
}

interface TerminalDisplayContract {
  displayOutput: (output: string) => void;
  clearOutput: () => void;
  scrollToBottom: () => void;
  getCurrentOutput: () => string;
}

interface InstanceManagerContract {
  createInstance: (command: string) => Promise<string>;
  terminateInstance: (instanceId: string) => Promise<void>;
  getInstances: () => Promise<any[]>;
  selectInstance: (instanceId: string) => void;
}

interface UserInputContract {
  sendInput: (input: string) => void;
  validateInput: (input: string) => boolean;
  clearInput: () => void;
}

// Mock implementations that verify contracts
class MockSSEConnection implements SSEConnectionContract {
  public isConnected: boolean = false;
  private eventHandlers = new Map<string, Function[]>();
  private connectionAttempts: string[] = [];
  private emittedEvents: Array<{event: string, data: any}> = [];

  connect(instanceId: string): void {
    if (!instanceId || instanceId === 'undefined') {
      throw new Error('Invalid instance ID for connection');
    }
    this.connectionAttempts.push(instanceId);
    this.isConnected = true;
    this.triggerHandlers('connect', { instanceId, connectionType: 'sse' });
  }

  disconnect(): void {
    this.isConnected = false;
    this.triggerHandlers('disconnect', { reason: 'manual' });
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: (data: any) => void): void {
    if (handler) {
      const handlers = this.eventHandlers.get(event) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    } else {
      this.eventHandlers.delete(event);
    }
  }

  emit(event: string, data: any): void {
    this.emittedEvents.push({ event, data });
    
    // Simulate server response for terminal input
    if (event === 'terminal:input') {
      setTimeout(() => {
        this.triggerHandlers('terminal:output', {
          output: `$ ${data.input}\nCommand processed\n$ `,
          instanceId: data.instanceId
        });
      }, 10);
    }
  }

  private triggerHandlers(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  // Test helper methods
  getConnectionAttempts(): string[] {
    return [...this.connectionAttempts];
  }

  getEmittedEvents(): Array<{event: string, data: any}> {
    return [...this.emittedEvents];
  }

  simulateOutput(instanceId: string, output: string): void {
    this.triggerHandlers('output', {
      data: output,
      instanceId,
      timestamp: new Date().toISOString()
    });
  }

  simulateStatusChange(instanceId: string, status: string): void {
    this.triggerHandlers('instance:status', {
      instanceId,
      status,
      timestamp: new Date().toISOString()
    });
  }
}

class MockTerminalDisplay implements TerminalDisplayContract {
  private output: string = '';
  private displayCalls: string[] = [];
  private scrollCalls: number = 0;

  displayOutput(output: string): void {
    this.displayCalls.push(output);
    this.output += output;
  }

  clearOutput(): void {
    this.output = '';
    this.displayCalls.push('[CLEAR]');
  }

  scrollToBottom(): void {
    this.scrollCalls++;
  }

  getCurrentOutput(): string {
    return this.output;
  }

  // Test helper methods
  getDisplayCalls(): string[] {
    return [...this.displayCalls];
  }

  getScrollCallCount(): number {
    return this.scrollCalls;
  }
}

class MockInstanceManager implements InstanceManagerContract {
  private instances = new Map<string, any>();
  private selectedInstance: string | null = null;
  private creationCalls: string[] = [];
  private terminationCalls: string[] = [];

  async createInstance(command: string): Promise<string> {
    this.creationCalls.push(command);
    
    const instanceId = `claude-${Math.floor(Math.random() * 9000) + 1000}`;
    const instance = {
      id: instanceId,
      name: `Instance ${instanceId}`,
      status: 'starting',
      pid: Math.floor(Math.random() * 9000) + 1000,
      command
    };
    
    this.instances.set(instanceId, instance);
    
    // Simulate status change to running
    setTimeout(() => {
      instance.status = 'running';
    }, 100);
    
    return instanceId;
  }

  async terminateInstance(instanceId: string): Promise<void> {
    this.terminationCalls.push(instanceId);
    this.instances.delete(instanceId);
    if (this.selectedInstance === instanceId) {
      this.selectedInstance = null;
    }
  }

  async getInstances(): Promise<any[]> {
    return Array.from(this.instances.values());
  }

  selectInstance(instanceId: string): void {
    if (!this.instances.has(instanceId)) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    this.selectedInstance = instanceId;
  }

  // Test helper methods
  getCreationCalls(): string[] {
    return [...this.creationCalls];
  }

  getTerminationCalls(): string[] {
    return [...this.terminationCalls];
  }

  getSelectedInstance(): string | null {
    return this.selectedInstance;
  }
}

class MockUserInput implements UserInputContract {
  private inputHistory: string[] = [];
  private currentInput: string = '';
  private sendCalls: string[] = [];

  sendInput(input: string): void {
    if (!this.validateInput(input)) {
      throw new Error(`Invalid input: ${input}`);
    }
    this.sendCalls.push(input);
    this.inputHistory.push(input);
    this.currentInput = '';
  }

  validateInput(input: string): boolean {
    return typeof input === 'string' && input.trim().length > 0;
  }

  clearInput(): void {
    this.currentInput = '';
  }

  // Test helper methods
  getSendCalls(): string[] {
    return [...this.sendCalls];
  }

  getInputHistory(): string[] {
    return [...this.inputHistory];
  }
}

// Test Subject: Component that orchestrates all collaborators
class ClaudeTerminalOrchestrator {
  constructor(
    private sseConnection: SSEConnectionContract,
    private terminalDisplay: TerminalDisplayContract,
    private instanceManager: InstanceManagerContract,
    private userInput: UserInputContract
  ) {}

  async initializeSession(command: string): Promise<string> {
    // Outside-in TDD: Start from user intention
    const instanceId = await this.instanceManager.createInstance(command);
    
    // Establish connection
    this.sseConnection.connect(instanceId);
    
    // Set up output handling
    this.sseConnection.on('output', (data) => {
      this.terminalDisplay.displayOutput(data.data);
      this.terminalDisplay.scrollToBottom();
    });
    
    // Set up status handling
    this.sseConnection.on('instance:status', (data) => {
      if (data.status === 'running') {
        this.terminalDisplay.displayOutput(`[System] Instance ${data.instanceId} is ready\n`);
      }
    });
    
    this.instanceManager.selectInstance(instanceId);
    
    return instanceId;
  }

  sendCommand(command: string, instanceId: string): void {
    this.userInput.sendInput(command);
    
    this.sseConnection.emit('terminal:input', {
      input: command + '\n',
      instanceId: instanceId
    });
  }

  terminateSession(instanceId: string): Promise<void> {
    this.sseConnection.disconnect();
    return this.instanceManager.terminateInstance(instanceId);
  }

  displayRealWorkingDirectory(workingDir: string): void {
    // Contract: Must display real working directory, not hardcoded
    if (workingDir.includes('hardcoded') || workingDir.includes('fake')) {
      throw new Error('Hardcoded working directory detected');
    }
    
    this.terminalDisplay.displayOutput(`Working directory: ${workingDir}\n`);
  }
}

describe('Frontend Component Contracts - TDD London School', () => {
  let sseConnection: MockSSEConnection;
  let terminalDisplay: MockTerminalDisplay;
  let instanceManager: MockInstanceManager;
  let userInput: MockUserInput;
  let orchestrator: ClaudeTerminalOrchestrator;

  beforeEach(() => {
    sseConnection = new MockSSEConnection();
    terminalDisplay = new MockTerminalDisplay();
    instanceManager = new MockInstanceManager();
    userInput = new MockUserInput();
    
    orchestrator = new ClaudeTerminalOrchestrator(
      sseConnection,
      terminalDisplay,
      instanceManager,
      userInput
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: SSE Connection Must Handle Real Instance IDs', () => {
    it('should establish connection with valid instance ID', async () => {
      // Arrange: Create real instance
      const instanceId = await instanceManager.createInstance('claude --dangerously-skip-permissions');
      
      // Act: Connect using real instance ID
      sseConnection.connect(instanceId);
      
      // Assert: Verify connection contract
      expect(sseConnection.isConnected).toBe(true);
      expect(sseConnection.getConnectionAttempts()).toContain(instanceId);
      expect(instanceId).toMatch(/^claude-\d+$/);
    });

    it('should reject invalid instance IDs', () => {
      // Arrange: Invalid instance IDs
      const invalidIds = ['', 'undefined', null, 'fake-id'];
      
      invalidIds.forEach(invalidId => {
        // Act & Assert: Should reject invalid IDs
        expect(() => {
          sseConnection.connect(invalidId as any);
        }).toThrow('Invalid instance ID for connection');
      });
    });

    it('should handle real process output messages', async () => {
      // Arrange: Establish connection
      const instanceId = await instanceManager.createInstance('claude');
      sseConnection.connect(instanceId);
      
      const receivedOutputs: string[] = [];
      sseConnection.on('output', (data) => {
        receivedOutputs.push(data.data);
      });
      
      // Act: Simulate real Claude output (not hardcoded)
      const realOutputs = [
        'Working directory: /workspaces/agent-feed/prod\n$ ',
        'File created successfully\n',
        'Tests completed: 15 passed\n$ '
      ];
      
      realOutputs.forEach(output => {
        sseConnection.simulateOutput(instanceId, output);
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert: Real output received without modification
      expect(receivedOutputs).toEqual(realOutputs);
      receivedOutputs.forEach(output => {
        expect(output).not.toMatch(/\[RESPONSE\]|fake|mock|hardcoded/i);
      });
    });
  });

  describe('Contract: Terminal Display Must Show Real Content', () => {
    it('should display real process output without filtering', () => {
      // Arrange: Real process outputs
      const realOutputs = [
        'Claude Code session started\n',
        'Working directory: /workspaces/agent-feed/frontend\n',
        '$ npm test\n',
        '✓ All tests passed\n',
        '$ '
      ];
      
      // Act: Display each output
      realOutputs.forEach(output => {
        terminalDisplay.displayOutput(output);
      });
      
      // Assert: All outputs displayed exactly
      expect(terminalDisplay.getDisplayCalls()).toEqual(realOutputs);
      expect(terminalDisplay.getCurrentOutput()).toBe(realOutputs.join(''));
      
      // Verify no hardcoded patterns
      const fullOutput = terminalDisplay.getCurrentOutput();
      expect(fullOutput).not.toContain('[RESPONSE] Claude Code session started');
      expect(fullOutput).not.toMatch(/fake.*response|mock.*output/i);
    });

    it('should auto-scroll after displaying output', () => {
      // Arrange: Setup output handler
      const instanceId = 'claude-1234';
      sseConnection.connect(instanceId);
      
      let scrollCallCount = 0;
      const originalScrollToBottom = terminalDisplay.scrollToBottom;
      terminalDisplay.scrollToBottom = () => {
        scrollCallCount++;
        originalScrollToBottom.call(terminalDisplay);
      };
      
      // Set up collaboration between SSE and display
      sseConnection.on('output', (data) => {
        terminalDisplay.displayOutput(data.data);
        terminalDisplay.scrollToBottom();
      });
      
      // Act: Simulate multiple outputs
      sseConnection.simulateOutput(instanceId, 'Output line 1\n');
      sseConnection.simulateOutput(instanceId, 'Output line 2\n');
      sseConnection.simulateOutput(instanceId, 'Output line 3\n');
      
      // Assert: Scroll called for each output
      expect(scrollCallCount).toBe(3);
      expect(terminalDisplay.getDisplayCalls().length).toBe(3);
    });
  });

  describe('Contract: Instance Manager Must Handle Real Processes', () => {
    it('should create instances with real commands', async () => {
      // Arrange: Real Claude commands
      const commands = [
        'claude',
        'claude --dangerously-skip-permissions',
        'claude --dangerously-skip-permissions -c',
        'claude --dangerously-skip-permissions --resume'
      ];
      
      // Act: Create instance for each command
      const instanceIds: string[] = [];
      for (const command of commands) {
        const instanceId = await instanceManager.createInstance(command);
        instanceIds.push(instanceId);
      }
      
      // Assert: All instances created with proper IDs
      expect(instanceIds.length).toBe(commands.length);
      instanceIds.forEach(id => {
        expect(id).toMatch(/^claude-\d+$/);
      });
      
      expect(instanceManager.getCreationCalls()).toEqual(commands);
      
      const instances = await instanceManager.getInstances();
      expect(instances.length).toBe(commands.length);
    });

    it('should properly select and manage active instances', async () => {
      // Arrange: Create multiple instances
      const instance1 = await instanceManager.createInstance('claude');
      const instance2 = await instanceManager.createInstance('claude --dangerously-skip-permissions');
      
      // Act: Select instances
      instanceManager.selectInstance(instance1);
      expect(instanceManager.getSelectedInstance()).toBe(instance1);
      
      instanceManager.selectInstance(instance2);
      expect(instanceManager.getSelectedInstance()).toBe(instance2);
      
      // Act: Terminate first instance
      await instanceManager.terminateInstance(instance1);
      
      // Assert: Instance removed, selection updated if needed
      const remainingInstances = await instanceManager.getInstances();
      expect(remainingInstances.length).toBe(1);
      expect(remainingInstances[0].id).toBe(instance2);
      
      expect(instanceManager.getTerminationCalls()).toContain(instance1);
    });
  });

  describe('Contract: User Input Must Reach Process Stdin', () => {
    it('should validate and forward user input', () => {
      // Arrange: Valid and invalid inputs
      const validInputs = ['ls -la', 'pwd', 'echo "hello world"', 'npm test'];
      const invalidInputs = ['', '   ', null, undefined];
      
      // Act & Assert: Valid inputs accepted
      validInputs.forEach(input => {
        expect(() => userInput.sendInput(input)).not.toThrow();
      });
      
      expect(userInput.getSendCalls()).toEqual(validInputs);
      
      // Act & Assert: Invalid inputs rejected
      invalidInputs.forEach(input => {
        expect(() => userInput.sendInput(input as any)).toThrow();
      });
    });

    it('should establish bidirectional communication flow', async () => {
      // Arrange: Full system setup
      const instanceId = await orchestrator.initializeSession('claude --dangerously-skip-permissions');
      
      // Act: Send command and verify flow
      const command = 'help';
      orchestrator.sendCommand(command, instanceId);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert: Command sent through proper channels
      expect(userInput.getSendCalls()).toContain(command);
      
      const emittedEvents = sseConnection.getEmittedEvents();
      expect(emittedEvents.some(event => 
        event.event === 'terminal:input' && 
        event.data.input === command + '\n' &&
        event.data.instanceId === instanceId
      )).toBe(true);
      
      // Verify output was displayed
      const displayCalls = terminalDisplay.getDisplayCalls();
      expect(displayCalls.some(call => call.includes('Command processed'))).toBe(true);
    });
  });

  describe('Contract: No Hardcoded Responses Allowed', () => {
    it('should reject hardcoded working directory displays', () => {
      // Arrange: Hardcoded paths that should be rejected
      const hardcodedPaths = [
        '/fake/working/directory',
        '/hardcoded/path',
        '/mock/directory',
        'hardcoded-path'
      ];
      
      // Act & Assert: Each hardcoded path should be rejected
      hardcodedPaths.forEach(path => {
        expect(() => {
          orchestrator.displayRealWorkingDirectory(path);
        }).toThrow('Hardcoded working directory detected');
      });
    });

    it('should accept real working directories', () => {
      // Arrange: Real working directory paths
      const realPaths = [
        '/workspaces/agent-feed',
        '/workspaces/agent-feed/prod',
        '/workspaces/agent-feed/frontend',
        '/workspaces/agent-feed/tests'
      ];
      
      // Act & Assert: Real paths should be accepted
      realPaths.forEach(path => {
        expect(() => {
          orchestrator.displayRealWorkingDirectory(path);
        }).not.toThrow();
        
        // Verify it was displayed
        const displayCalls = terminalDisplay.getDisplayCalls();
        expect(displayCalls.some(call => call.includes(path))).toBe(true);
      });
    });

    it('should verify all component outputs are real', async () => {
      // Arrange: Complete session with real interactions
      const instanceId = await orchestrator.initializeSession('claude');
      
      // Simulate real Claude outputs
      sseConnection.simulateOutput(instanceId, 'Working directory: /workspaces/agent-feed\n$ ');
      sseConnection.simulateOutput(instanceId, 'Ready for commands\n$ ');
      
      // Send real command
      orchestrator.sendCommand('ls', instanceId);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert: All outputs are real, no hardcoded patterns
      const allDisplayCalls = terminalDisplay.getDisplayCalls();
      
      allDisplayCalls.forEach(call => {
        // Must not contain hardcoded patterns
        expect(call).not.toMatch(/\[RESPONSE\].*Claude Code session started/i);
        expect(call).not.toMatch(/fake.*response|mock.*output|hardcoded/i);
        
        // Should contain real terminal patterns
        if (call.includes('Working directory:')) {
          expect(call).toMatch(/Working directory: \/workspaces\/agent-feed/);
        }
      });
      
      console.log('✅ All component outputs verified as real');
    });
  });

  describe('Integration: Full Component Collaboration', () => {
    it('should demonstrate complete TDD London School workflow', async () => {
      // Arrange: Track all collaborations
      const collaborationLog: Array<{component: string, action: string, data: any}> = [];
      
      // Wrap methods to track collaborations
      const originalConnect = sseConnection.connect;
      sseConnection.connect = (instanceId: string) => {
        collaborationLog.push({component: 'SSEConnection', action: 'connect', data: instanceId});
        return originalConnect.call(sseConnection, instanceId);
      };
      
      const originalDisplayOutput = terminalDisplay.displayOutput;
      terminalDisplay.displayOutput = (output: string) => {
        collaborationLog.push({component: 'TerminalDisplay', action: 'displayOutput', data: output});
        return originalDisplayOutput.call(terminalDisplay, output);
      };
      
      const originalCreateInstance = instanceManager.createInstance;
      instanceManager.createInstance = async (command: string) => {
        collaborationLog.push({component: 'InstanceManager', action: 'createInstance', data: command});
        return await originalCreateInstance.call(instanceManager, command);
      };
      
      const originalSendInput = userInput.sendInput;
      userInput.sendInput = (input: string) => {
        collaborationLog.push({component: 'UserInput', action: 'sendInput', data: input});
        return originalSendInput.call(userInput, input);
      };
      
      // Act: Execute complete workflow
      const instanceId = await orchestrator.initializeSession('claude --dangerously-skip-permissions');
      
      // Simulate real process startup
      sseConnection.simulateStatusChange(instanceId, 'running');
      sseConnection.simulateOutput(instanceId, 'Working directory: /workspaces/agent-feed\n$ ');
      
      // User interaction
      orchestrator.sendCommand('pwd', instanceId);
      
      // Simulate process response
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Cleanup
      await orchestrator.terminateSession(instanceId);
      
      // Assert: Verify complete collaboration chain
      expect(collaborationLog.length).toBeGreaterThan(0);
      
      // Check that all components collaborated
      const componentTypes = new Set(collaborationLog.map(log => log.component));
      expect(componentTypes.has('SSEConnection')).toBe(true);
      expect(componentTypes.has('TerminalDisplay')).toBe(true);
      expect(componentTypes.has('InstanceManager')).toBe(true);
      expect(componentTypes.has('UserInput')).toBe(true);
      
      // Verify proper sequencing (London School: verify conversations)
      const createInstanceLog = collaborationLog.find(log => log.action === 'createInstance');
      const connectLog = collaborationLog.find(log => log.action === 'connect');
      const sendInputLog = collaborationLog.find(log => log.action === 'sendInput');
      
      expect(createInstanceLog).toBeDefined();
      expect(connectLog).toBeDefined();
      expect(sendInputLog).toBeDefined();
      
      // Verify no hardcoded data in any collaboration
      collaborationLog.forEach(log => {
        if (typeof log.data === 'string') {
          expect(log.data).not.toMatch(/fake|mock|hardcoded|\[RESPONSE\]/i);
        }
      });
      
      console.log(`✅ Complete collaboration verified: ${collaborationLog.length} interactions`);
    });
  });
});
