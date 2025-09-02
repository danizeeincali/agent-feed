/**
 * TDD London School Mock Contracts - Centralized Export
 * All external dependency mock contracts for comprehensive test coverage
 */

// WebSocket Mock Contracts
export {
  WebSocketMockContract,
  WebSocketManagerMockContract,
  WebSocketHookMockContract,
  createWebSocketMock,
  createWebSocketManagerMock,
  createWebSocketHookMock,
  WebSocketEventSimulator
} from './WebSocketMockContract';

// Claude API Mock Contracts
export {
  ClaudeProcessMockContract,
  ClaudeInstanceManagerMockContract,
  ClaudeApiManagerMockContract,
  LoadingAnimationMockContract,
  createClaudeProcessMock,
  createClaudeInstanceManagerMock,
  createClaudeApiManagerMock,
  createLoadingAnimationMock,
  ClaudeApiEventSimulator
} from './ClaudeApiMockContract';

// File System Mock Contracts
export {
  FileSystemMockContract,
  LoggerMockContract,
  ConfigManagerMockContract,
  TempFileManagerMockContract,
  createFileSystemMock,
  createLoggerMock,
  createConfigManagerMock,
  createTempFileManagerMock,
  FileSystemSimulator
} from './FileSystemMockContract';

/**
 * Comprehensive Mock Factory - Creates all mocks for a complete test environment
 */
export interface CompleteMockEnvironment {
  // WebSocket mocks
  webSocket: WebSocketMockContract;
  webSocketManager: WebSocketManagerMockContract;
  webSocketHook: WebSocketHookMockContract;
  webSocketSimulator: WebSocketEventSimulator;
  
  // Claude API mocks
  claudeProcess: ClaudeProcessMockContract;
  claudeInstanceManager: ClaudeInstanceManagerMockContract;
  claudeApiManager: ClaudeApiManagerMockContract;
  loadingAnimation: LoadingAnimationMockContract;
  claudeSimulator: ClaudeApiEventSimulator;
  
  // File system mocks
  fileSystem: FileSystemMockContract;
  logger: LoggerMockContract;
  configManager: ConfigManagerMockContract;
  tempFileManager: TempFileManagerMockContract;
  fileSystemSimulator: FileSystemSimulator;
}

/**
 * Creates a complete mock environment for comprehensive testing
 * Follows London School TDD principles with all external dependencies mocked
 */
export const createCompleteMockEnvironment = (): CompleteMockEnvironment => {
  // Create all simulators first
  const webSocketSimulator = new WebSocketEventSimulator();
  const claudeSimulator = new ClaudeApiEventSimulator();
  const fileSystemSimulator = new FileSystemSimulator();
  
  return {
    // WebSocket mocks
    webSocket: createWebSocketMock(),
    webSocketManager: createWebSocketManagerMock(),
    webSocketHook: createWebSocketHookMock(),
    webSocketSimulator,
    
    // Claude API mocks
    claudeProcess: createClaudeProcessMock(),
    claudeInstanceManager: createClaudeInstanceManagerMock(),
    claudeApiManager: createClaudeApiManagerMock(),
    loadingAnimation: createLoadingAnimationMock(),
    claudeSimulator,
    
    // File system mocks
    fileSystem: createFileSystemMock(),
    logger: createLoggerMock(),
    configManager: createConfigManagerMock(),
    tempFileManager: createTempFileManagerMock(),
    fileSystemSimulator
  };
};

/**
 * Mock Reset Utility - Resets all mocks to initial state
 * Essential for test isolation in London School TDD
 */
export const resetAllMocks = (mockEnv: CompleteMockEnvironment): void => {
  // Reset all Jest mocks
  Object.values(mockEnv.webSocket).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.webSocketManager).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.webSocketHook).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.claudeProcess).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.claudeInstanceManager).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.claudeApiManager).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.loadingAnimation).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.fileSystem).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.logger).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.configManager).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  Object.values(mockEnv.tempFileManager).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  
  // Reset simulators
  mockEnv.fileSystemSimulator.reset();
};

/**
 * Mock Verification Utilities - Verify mock interactions
 * Support London School's interaction-based testing approach
 */
export class MockInteractionVerifier {
  constructor(private mockEnv: CompleteMockEnvironment) {}
  
  /**
   * Verify WebSocket connection establishment flow
   */
  verifyWebSocketConnectionFlow(terminalId: string) {
    expect(this.mockEnv.webSocketManager.getConnection).toHaveBeenCalledWith(terminalId);
    expect(this.mockEnv.webSocketHook.connectToInstance).toHaveBeenCalledWith(terminalId);
  }
  
  /**
   * Verify Claude instance creation workflow
   */
  verifyClaudeInstanceCreation(config: any) {
    expect(this.mockEnv.claudeInstanceManager.createInstance).toHaveBeenCalledWith(config);
    expect(this.mockEnv.claudeProcess.spawn).toHaveBeenCalled();
  }
  
  /**
   * Verify command execution interaction pattern
   */
  verifyCommandExecution(instanceId: string, command: string) {
    expect(this.mockEnv.webSocketHook.sendCommand).toHaveBeenCalledWith(instanceId, command);
    expect(this.mockEnv.claudeInstanceManager.sendCommandToInstance).toHaveBeenCalledWith(instanceId, command);
  }
  
  /**
   * Verify loading animation interactions
   */
  verifyLoadingAnimationFlow(message: string) {
    expect(this.mockEnv.loadingAnimation.startLoading).toHaveBeenCalledWith(message);
    expect(this.mockEnv.loadingAnimation.isActive).toHaveBeenCalled();
  }
  
  /**
   * Verify file system operations
   */
  verifyFileOperations(operations: Array<{ type: 'read' | 'write' | 'delete'; path: string; content?: string }>) {
    operations.forEach(op => {
      switch (op.type) {
        case 'read':
          expect(this.mockEnv.fileSystem.readFile).toHaveBeenCalledWith(op.path);
          break;
        case 'write':
          expect(this.mockEnv.fileSystem.writeFile).toHaveBeenCalledWith(op.path, op.content);
          break;
        case 'delete':
          expect(this.mockEnv.fileSystem.deleteFile).toHaveBeenCalledWith(op.path);
          break;
      }
    });
  }
  
  /**
   * Verify interaction call order
   */
  verifyCallOrder(expectedCalls: Array<{ mock: jest.MockedFunction<any>; args?: any[] }>) {
    const allCalls = jest.getAllMockCalls();
    
    expectedCalls.forEach((expectedCall, index) => {
      const actualCall = allCalls.find(call => call[0] === expectedCall.mock);
      expect(actualCall).toBeDefined();
      
      if (expectedCall.args) {
        expect(actualCall![1]).toEqual(expectedCall.args);
      }
    });
  }
}

/**
 * Create a mock interaction verifier
 */
export const createMockVerifier = (mockEnv: CompleteMockEnvironment): MockInteractionVerifier => {
  return new MockInteractionVerifier(mockEnv);
};

/**
 * Test scenario builders for common interaction patterns
 */
export class TestScenarioBuilder {
  constructor(private mockEnv: CompleteMockEnvironment) {}
  
  /**
   * Setup successful WebSocket connection scenario
   */
  setupSuccessfulWebSocketConnection(terminalId: string = 'test-terminal-1') {
    this.mockEnv.webSocketManager.getConnection.mockReturnValue(this.mockEnv.webSocket);
    this.mockEnv.webSocketHook.connectToInstance.mockResolvedValue(undefined);
    this.mockEnv.webSocketHook.connectionState.isConnected = true;
    this.mockEnv.webSocketHook.connectionState.instanceId = terminalId;
  }
  
  /**
   * Setup failing WebSocket connection scenario
   */
  setupFailingWebSocketConnection(error: string = 'Connection failed') {
    this.mockEnv.webSocketManager.getConnection.mockImplementation(() => {
      throw new Error(error);
    });
    this.mockEnv.webSocketHook.connectToInstance.mockRejectedValue(new Error(error));
    this.mockEnv.webSocketHook.connectionState.isConnected = false;
    this.mockEnv.webSocketHook.connectionState.lastError = error;
  }
  
  /**
   * Setup successful Claude instance creation scenario
   */
  setupSuccessfulClaudeInstanceCreation(instanceId: string = 'test-instance-1') {
    this.mockEnv.claudeInstanceManager.createInstance.mockResolvedValue({
      id: instanceId,
      pid: 12345,
      status: 'running'
    });
    this.mockEnv.claudeProcess.spawn.mockResolvedValue({
      pid: 12345,
      processId: instanceId
    });
    this.mockEnv.claudeInstanceManager.getInstanceStatus.mockReturnValue({
      id: instanceId,
      pid: 12345,
      status: 'running',
      isRunning: true,
      uptime: 5000,
      workingDirectory: '/workspaces/agent-feed'
    });
  }
  
  /**
   * Setup loading animation scenario
   */
  setupLoadingAnimation(message: string = 'Executing command...') {
    this.mockEnv.loadingAnimation.isActive.mockReturnValue(true);
    this.mockEnv.loadingAnimation.getCurrentMessage.mockReturnValue(message);
    this.mockEnv.loadingAnimation.getStartTime.mockReturnValue(Date.now());
  }
  
  /**
   * Setup file system scenario
   */
  setupFileSystemOperations(files: Record<string, string> = {}) {
    Object.entries(files).forEach(([path, content]) => {
      this.mockEnv.fileSystemSimulator.createFile(path, content);
      this.mockEnv.fileSystem.readFile.mockImplementation(async (filePath: string) => {
        return this.mockEnv.fileSystemSimulator.fileExists(filePath) 
          ? this.mockEnv.fileSystemSimulator.getFileContent(filePath)
          : Promise.reject(new Error('File not found'));
      });
    });
  }
}

/**
 * Create a test scenario builder
 */
export const createTestScenarioBuilder = (mockEnv: CompleteMockEnvironment): TestScenarioBuilder => {
  return new TestScenarioBuilder(mockEnv);
};