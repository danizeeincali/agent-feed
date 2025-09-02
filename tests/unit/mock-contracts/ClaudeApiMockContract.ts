/**
 * TDD London School Mock Contract for Claude API External Dependency
 * Defines all interactions with Claude instances and API management
 */

export interface ClaudeProcessMockContract {
  // Process lifecycle
  spawn: jest.MockedFunction<(config: any) => Promise<{ pid: number; processId: string }>>;
  kill: jest.MockedFunction<(pid: number) => Promise<void>>;
  restart: jest.MockedFunction<(processId: string) => Promise<void>>;
  
  // Process status
  isRunning: jest.MockedFunction<(pid: number) => boolean>;
  getStatus: jest.MockedFunction<(processId: string) => {
    isRunning: boolean;
    pid?: number;
    status: string;
    uptime?: number;
  }>;
  
  // Command execution
  executeCommand: jest.MockedFunction<(processId: string, command: string) => Promise<void>>;
  sendInput: jest.MockedFunction<(processId: string, input: string) => Promise<void>>;
  
  // Output handling
  onOutput: jest.MockedFunction<(processId: string, callback: (output: string) => void) => void>;
  onError: jest.MockedFunction<(processId: string, callback: (error: string) => void) => void>;
  onExit: jest.MockedFunction<(processId: string, callback: (code: number) => void) => void>;
  
  // Process configuration
  updateConfig: jest.MockedFunction<(processId: string, config: any) => Promise<void>>;
  getConfig: jest.MockedFunction<(processId: string) => any>;
}

export interface ClaudeInstanceManagerMockContract {
  // Instance management
  createInstance: jest.MockedFunction<(config: {
    id: string;
    workingDirectory: string;
    environment?: Record<string, string>;
    autostart?: boolean;
  }) => Promise<{
    id: string;
    pid: number;
    status: 'starting' | 'running' | 'stopped';
  }>>;
  
  destroyInstance: jest.MockedFunction<(instanceId: string) => Promise<void>>;
  restartInstance: jest.MockedFunction<(instanceId: string) => Promise<void>>;
  
  // Instance status
  getInstanceStatus: jest.MockedFunction<(instanceId: string) => {
    id: string;
    pid?: number;
    status: 'starting' | 'running' | 'stopped' | 'error';
    isRunning: boolean;
    uptime?: number;
    workingDirectory?: string;
  }>;
  
  listInstances: jest.MockedFunction<() => Array<{
    id: string;
    pid?: number;
    status: string;
    isRunning: boolean;
  }>>;
  
  // Command operations
  sendCommandToInstance: jest.MockedFunction<(instanceId: string, command: string) => Promise<void>>;
  
  // Event handling
  onInstanceOutput: jest.MockedFunction<(instanceId: string, callback: (data: {
    output: string;
    isToolCall?: boolean;
    toolName?: string;
    timestamp: number;
  }) => void) => void>;
  
  onInstanceStatus: jest.MockedFunction<(instanceId: string, callback: (status: any) => void) => void>;
  onInstanceError: jest.MockedFunction<(instanceId: string, callback: (error: string) => void) => void>;
}

export interface ClaudeApiManagerMockContract {
  // API connection
  connect: jest.MockedFunction<() => Promise<void>>;
  disconnect: jest.MockedFunction<() => Promise<void>>;
  isConnected: jest.MockedFunction<() => boolean>;
  
  // Request handling
  makeRequest: jest.MockedFunction<(endpoint: string, data: any) => Promise<any>>;
  streamRequest: jest.MockedFunction<(endpoint: string, data: any, onChunk: (chunk: any) => void) => Promise<void>>;
  
  // Instance API calls
  getInstance: jest.MockedFunction<(instanceId: string) => Promise<{
    id: string;
    status: string;
    configuration: any;
  }>>;
  
  updateInstance: jest.MockedFunction<(instanceId: string, config: any) => Promise<void>>;
  
  // Tool call handling
  onToolCall: jest.MockedFunction<(callback: (toolCall: {
    name: string;
    parameters: any;
    id: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
  }) => void) => void>;
  
  respondToToolCall: jest.MockedFunction<(toolCallId: string, response: any) => Promise<void>>;
  
  // Permission handling
  onPermissionRequest: jest.MockedFunction<(callback: (request: {
    id: string;
    message: string;
    permissions: string[];
    context?: any;
  }) => void) => void>;
  
  respondToPermission: jest.MockedFunction<(requestId: string, response: 'allow' | 'deny' | 'ask_differently') => Promise<void>>;
}

export interface LoadingAnimationMockContract {
  // Animation state
  startLoading: jest.MockedFunction<(message: string) => void>;
  stopLoading: jest.MockedFunction<() => void>;
  updateMessage: jest.MockedFunction<(message: string) => void>;
  
  // Animation status
  isActive: jest.MockedFunction<() => boolean>;
  getCurrentMessage: jest.MockedFunction<() => string>;
  getStartTime: jest.MockedFunction<() => number>;
  
  // Event callbacks
  onStart: jest.MockedFunction<(callback: (message: string) => void) => void>;
  onStop: jest.MockedFunction<(callback: () => void) => void>;
  onUpdate: jest.MockedFunction<(callback: (message: string) => void) => void>;
}

/**
 * Factory function to create Claude Process mock
 */
export const createClaudeProcessMock = (overrides: Partial<ClaudeProcessMockContract> = {}): ClaudeProcessMockContract => {
  const defaultMock: ClaudeProcessMockContract = {
    spawn: jest.fn().mockResolvedValue({ pid: 12345, processId: 'test-process-1' }),
    kill: jest.fn().mockResolvedValue(undefined),
    restart: jest.fn().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(true),
    getStatus: jest.fn().mockReturnValue({
      isRunning: true,
      pid: 12345,
      status: 'running',
      uptime: 5000
    }),
    executeCommand: jest.fn().mockResolvedValue(undefined),
    sendInput: jest.fn().mockResolvedValue(undefined),
    onOutput: jest.fn(),
    onError: jest.fn(),
    onExit: jest.fn(),
    updateConfig: jest.fn().mockResolvedValue(undefined),
    getConfig: jest.fn().mockReturnValue({})
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create Claude Instance Manager mock
 */
export const createClaudeInstanceManagerMock = (overrides: Partial<ClaudeInstanceManagerMockContract> = {}): ClaudeInstanceManagerMockContract => {
  const defaultMock: ClaudeInstanceManagerMockContract = {
    createInstance: jest.fn().mockResolvedValue({
      id: 'test-instance-1',
      pid: 12345,
      status: 'running' as const
    }),
    destroyInstance: jest.fn().mockResolvedValue(undefined),
    restartInstance: jest.fn().mockResolvedValue(undefined),
    getInstanceStatus: jest.fn().mockReturnValue({
      id: 'test-instance-1',
      pid: 12345,
      status: 'running' as const,
      isRunning: true,
      uptime: 5000,
      workingDirectory: '/workspaces/agent-feed'
    }),
    listInstances: jest.fn().mockReturnValue([{
      id: 'test-instance-1',
      pid: 12345,
      status: 'running',
      isRunning: true
    }]),
    sendCommandToInstance: jest.fn().mockResolvedValue(undefined),
    onInstanceOutput: jest.fn(),
    onInstanceStatus: jest.fn(),
    onInstanceError: jest.fn()
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create Claude API Manager mock
 */
export const createClaudeApiManagerMock = (overrides: Partial<ClaudeApiManagerMockContract> = {}): ClaudeApiManagerMockContract => {
  const defaultMock: ClaudeApiManagerMockContract = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    makeRequest: jest.fn().mockResolvedValue({ success: true }),
    streamRequest: jest.fn().mockResolvedValue(undefined),
    getInstance: jest.fn().mockResolvedValue({
      id: 'test-instance-1',
      status: 'running',
      configuration: {}
    }),
    updateInstance: jest.fn().mockResolvedValue(undefined),
    onToolCall: jest.fn(),
    respondToToolCall: jest.fn().mockResolvedValue(undefined),
    onPermissionRequest: jest.fn(),
    respondToPermission: jest.fn().mockResolvedValue(undefined)
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create Loading Animation mock
 */
export const createLoadingAnimationMock = (overrides: Partial<LoadingAnimationMockContract> = {}): LoadingAnimationMockContract => {
  const defaultMock: LoadingAnimationMockContract = {
    startLoading: jest.fn(),
    stopLoading: jest.fn(),
    updateMessage: jest.fn(),
    isActive: jest.fn().mockReturnValue(false),
    getCurrentMessage: jest.fn().mockReturnValue(''),
    getStartTime: jest.fn().mockReturnValue(Date.now()),
    onStart: jest.fn(),
    onStop: jest.fn(),
    onUpdate: jest.fn()
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Event simulator for Claude API interactions
 */
export class ClaudeApiEventSimulator {
  private outputHandlers: Map<string, (data: any) => void> = new Map();
  private statusHandlers: Map<string, (status: any) => void> = new Map();
  private errorHandlers: Map<string, (error: string) => void> = new Map();
  private toolCallHandlers: Set<(toolCall: any) => void> = new Set();
  private permissionHandlers: Set<(request: any) => void> = new Set();
  
  addOutputHandler(instanceId: string, handler: (data: any) => void) {
    this.outputHandlers.set(instanceId, handler);
  }
  
  addStatusHandler(instanceId: string, handler: (status: any) => void) {
    this.statusHandlers.set(instanceId, handler);
  }
  
  addErrorHandler(instanceId: string, handler: (error: string) => void) {
    this.errorHandlers.set(instanceId, handler);
  }
  
  addToolCallHandler(handler: (toolCall: any) => void) {
    this.toolCallHandlers.add(handler);
  }
  
  addPermissionHandler(handler: (request: any) => void) {
    this.permissionHandlers.add(handler);
  }
  
  simulateOutput(instanceId: string, output: string, isToolCall: boolean = false, toolName?: string) {
    const handler = this.outputHandlers.get(instanceId);
    if (handler) {
      handler({
        output,
        isToolCall,
        toolName,
        timestamp: Date.now()
      });
    }
  }
  
  simulateStatusChange(instanceId: string, status: string) {
    const handler = this.statusHandlers.get(instanceId);
    if (handler) {
      handler({ status, instanceId, timestamp: Date.now() });
    }
  }
  
  simulateError(instanceId: string, error: string) {
    const handler = this.errorHandlers.get(instanceId);
    if (handler) {
      handler(error);
    }
  }
  
  simulateToolCall(name: string, parameters: any, id: string = 'tool-call-1') {
    const toolCall = {
      name,
      parameters,
      id,
      status: 'pending' as const
    };
    
    this.toolCallHandlers.forEach(handler => handler(toolCall));
  }
  
  simulatePermissionRequest(message: string, permissions: string[], id: string = 'perm-req-1') {
    const request = {
      id,
      message,
      permissions,
      context: {}
    };
    
    this.permissionHandlers.forEach(handler => handler(request));
  }
}