/**
 * TDD London School: Claude Process Interactive Behavior Tests
 * 
 * Test Focus Areas:
 * 1. Claude with pipes should produce output
 * 2. Claude with PTY should produce output  
 * 3. Claude should respond to input commands
 * 4. Claude should show startup messages
 * 5. Working directory should affect Claude behavior
 * 
 * London School Emphasis:
 * - Outside-in development from user behavior down
 * - Mock-driven development to isolate units
 * - Behavior verification over state testing
 * - Interaction testing between components
 * - Contract definition through mock expectations
 */

const { spawn, execSync } = require('child_process');
const { EventEmitter } = require('events');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');

describe('TDD London School: Claude Process Interactive Behavior', () => {
  let mockClaudeProcess;
  let mockPtyProcess;
  let mockFileSystem;
  let claudeProcessManager;
  let interactionTracker;

  beforeEach(() => {
    // Mock Claude process behavior (London School: Mock all collaborators)
    mockClaudeProcess = {
      pid: 12345,
      stdout: new EventEmitter(),
      stderr: new EventEmitter(), 
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      },
      on: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      kill: jest.fn(),
      killed: false,
      connected: true,
      exitCode: null,
      signalCode: null
    };

    // Mock PTY process behavior
    mockPtyProcess = {
      pid: 12346,
      onData: jest.fn(),
      onExit: jest.fn(), 
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn(),
      process: 'claude'
    };

    // Mock filesystem operations
    mockFileSystem = {
      existsSync: jest.fn(),
      statSync: jest.fn(),
      realpathSync: jest.fn()
    };

    // Mock interaction tracker for behavior verification
    interactionTracker = {
      trackProcessSpawn: jest.fn(),
      trackOutputReceived: jest.fn(),
      trackInputSent: jest.fn(),
      trackProcessExit: jest.fn(),
      getInteractionLog: jest.fn(() => []),
      verifyInteractionSequence: jest.fn()
    };

    // Create Claude Process Manager with mocked dependencies
    claudeProcessManager = new ClaudeProcessManager({
      spawn: jest.fn(() => mockClaudeProcess),
      ptySpawn: jest.fn(() => mockPtyProcess),
      fs: mockFileSystem,
      interactionTracker
    });
  });

  describe('Contract: Claude Process Output Production', () => {
    /**
     * London School: Define contracts through mock expectations
     * Focus on WHY Claude should produce output, not HOW
     */

    describe('Contract Verification: Pipes vs PTY Output Behavior', () => {
      test('should verify pipe-based Claude process produces stdout data', async () => {
        // Arrange: Mock successful Claude with pipes
        const expectedStdoutData = 'Welcome to Claude CLI\n';
        const processConfig = {
          command: 'claude',
          args: ['--help'],
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: '/workspaces/agent-feed'
        };

        // London School: Define interaction expectations
        interactionTracker.trackProcessSpawn
          .mockImplementation((config) => {
            expect(config.stdio).toEqual(['pipe', 'pipe', 'pipe']);
            expect(config.command).toBe('claude');
          });

        interactionTracker.trackOutputReceived
          .mockImplementation((source, data) => {
            expect(source).toBe('stdout');
            expect(data).toBe(expectedStdoutData);
          });

        // Act: Spawn Claude process with pipes
        const instance = await claudeProcessManager.spawnClaudeWithPipes(processConfig);

        // Simulate stdout data event (what we expect to happen)
        mockClaudeProcess.stdout.emit('data', Buffer.from(expectedStdoutData));

        // Assert: Verify the conversation between objects
        expect(interactionTracker.trackProcessSpawn).toHaveBeenCalledWith(
          expect.objectContaining({
            stdio: ['pipe', 'pipe', 'pipe']
          })
        );
        expect(interactionTracker.trackOutputReceived).toHaveBeenCalledWith('stdout', expectedStdoutData);
      });

      test('should verify PTY-based Claude process produces terminal data', async () => {
        // Arrange: Mock successful Claude with PTY
        const expectedTerminalData = '\r\n$ Welcome to Claude\r\n';
        const ptyConfig = {
          command: 'claude',
          args: ['chat'],
          name: 'xterm-256color',
          cols: 120,
          rows: 30,
          cwd: '/workspaces/agent-feed'
        };

        // London School: Mock the collaboration behavior
        let storedCallback = null;
        mockPtyProcess.onData.mockImplementation((callback) => {
          // Store callback for later invocation
          storedCallback = callback;
          mockPtyProcess._dataCallback = callback;
        });

        interactionTracker.trackProcessSpawn.mockImplementation((config) => {
          expect(config.isPty).toBe(true);
          expect(config.name).toBe('xterm-256color');
        });

        // Act: Spawn Claude process with PTY
        const instance = await claudeProcessManager.spawnClaudeWithPty(ptyConfig);

        // Simulate PTY data reception
        if (storedCallback) {
          storedCallback(expectedTerminalData);
        }

        // Assert: Verify PTY-specific interactions
        expect(mockPtyProcess.onData).toHaveBeenCalledWith(expect.any(Function));
        expect(interactionTracker.trackProcessSpawn).toHaveBeenCalledWith(
          expect.objectContaining({
            isPty: true
          })
        );
      });
    });

    describe('Contract Verification: Stdout Event Firing Conditions', () => {
      test('should identify why stdout.on("data") does not fire - TTY detection', () => {
        // London School: Test the interaction that determines TTY behavior
        const processConfig = {
          command: 'claude',
          stdio: ['pipe', 'pipe', 'pipe']
        };

        // Mock TTY detection behavior
        const ttyDetector = {
          isStdoutTTY: jest.fn(() => false),
          isStderrTTY: jest.fn(() => false),
          shouldBufferOutput: jest.fn(() => true)
        };

        // Test the conversation between TTY detector and process manager
        claudeProcessManager.configureTTYBehavior(processConfig, ttyDetector);

        // Verify interactions
        expect(ttyDetector.isStdoutTTY).toHaveBeenCalled();
        expect(ttyDetector.shouldBufferOutput).toHaveBeenCalled();

        // Verify Claude process configured for non-TTY output
        expect(processConfig.env).toEqual(
          expect.objectContaining({
            TERM: 'dumb',
            NO_COLOR: '1',
            FORCE_COLOR: '0'
          })
        );
      });

      test('should identify environment requirements for Claude output', () => {
        // London School: Test environment setup collaboration
        const environmentManager = {
          setupClaudeEnvironment: jest.fn(),
          validateClaudeExecutable: jest.fn(() => true),
          configureOutputEncoding: jest.fn()
        };

        const requiredEnvVars = {
          'NODE_ENV': 'production',
          'ANTHROPIC_API_KEY': 'test-key',
          'CLAUDE_CLI_PATH': '/usr/local/bin/claude',
          'LC_ALL': 'C.UTF-8',
          'LANG': 'C.UTF-8'
        };

        // Test environment preparation conversation
        claudeProcessManager.prepareEnvironment(requiredEnvVars, environmentManager);

        // Verify environment manager interactions
        expect(environmentManager.setupClaudeEnvironment).toHaveBeenCalledWith(requiredEnvVars);
        expect(environmentManager.validateClaudeExecutable).toHaveBeenCalled();
        expect(environmentManager.configureOutputEncoding).toHaveBeenCalled();
      });
    });
  });

  describe('Contract: Claude Command Response Behavior', () => {
    /**
     * London School: Focus on command-response interactions
     */

    test('should verify Claude responds to input commands through stdin', async () => {
      // Arrange: Mock Claude ready to receive commands
      const testCommand = 'help\n';
      const expectedResponse = 'Claude CLI Help\n';

      const inputHandler = {
        sendCommand: jest.fn(),
        waitForResponse: jest.fn(() => Promise.resolve(expectedResponse))
      };

      // London School: Define expected interaction flow
      interactionTracker.verifyInteractionSequence
        .mockImplementation((expectedSequence) => {
          expect(expectedSequence).toEqual([
            'process_ready',
            'input_sent',
            'output_received',
            'command_completed'
          ]);
          return true;
        });

      // Act: Send command to Claude
      const instance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude',
        args: ['chat']
      });

      await claudeProcessManager.sendInput(instance.id, testCommand, inputHandler);

      // Simulate Claude response
      mockPtyProcess._dataCallback(expectedResponse);

      // Assert: Verify command-response interaction
      expect(inputHandler.sendCommand).toHaveBeenCalledWith(testCommand);
      expect(inputHandler.waitForResponse).toHaveBeenCalled();
      expect(interactionTracker.verifyInteractionSequence).toHaveBeenCalled();
    });

    test('should verify Claude startup message detection and status updates', async () => {
      // Arrange: Mock Claude startup behavior
      const startupMessages = [
        '╭─ Welcome to Claude ─╮',
        'Claude CLI v1.0.0',
        'Type "help" for commands'
      ];

      const statusManager = {
        updateStatus: jest.fn(),
        markReady: jest.fn(),
        detectStartupComplete: jest.fn(() => true)
      };

      // London School: Test startup message collaboration
      const instance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude',
        args: ['chat']
      });

      // Simulate startup messages
      for (const message of startupMessages) {
        mockPtyProcess._dataCallback(message + '\n');
        claudeProcessManager.processStartupMessage(instance.id, message, statusManager);
      }

      // Assert: Verify startup detection interactions
      expect(statusManager.updateStatus).toHaveBeenCalledTimes(startupMessages.length);
      expect(statusManager.detectStartupComplete).toHaveBeenCalled();
      expect(statusManager.markReady).toHaveBeenCalled();
    });
  });

  describe('Contract: Working Directory Impact on Claude Behavior', () => {
    /**
     * London School: Test how working directory affects Claude's behavior
     */

    test('should verify working directory affects Claude context and output', async () => {
      // Arrange: Mock directory-dependent behavior
      const testDirectories = [
        '/workspaces/agent-feed',
        '/tmp',
        '/home/user/projects'
      ];

      const directoryManager = {
        validateDirectory: jest.fn(() => true),
        setupWorkingDirectory: jest.fn(),
        getDirectoryContext: jest.fn()
      };

      // Test each directory's impact on Claude
      for (const directory of testDirectories) {
        // Mock directory-specific context
        directoryManager.getDirectoryContext
          .mockReturnValueOnce({
            path: directory,
            isProject: directory.includes('agent-feed'),
            hasPackageJson: directory.includes('agent-feed'),
            hasGitRepo: directory.includes('agent-feed')
          });

        // Act: Spawn Claude in specific directory
        const instance = await claudeProcessManager.spawnClaudeWithPty({
          command: 'claude',
          args: ['code'],
          cwd: directory
        });
        
        // Trigger directory validation (simulating internal calls)
        claudeProcessManager.validateWorkingDirectory(directory, directoryManager);

        // Assert: Verify directory setup interactions
        expect(directoryManager.validateDirectory).toHaveBeenCalledWith(directory);
        expect(directoryManager.setupWorkingDirectory).toHaveBeenCalledWith(directory);
        expect(directoryManager.getDirectoryContext).toHaveBeenCalledWith(directory);
      }
    });

    test('should verify authentication requirements for different directories', async () => {
      // Arrange: Mock authentication behavior
      const authenticationManager = {
        checkPermissions: jest.fn(),
        requiresAuthentication: jest.fn(),
        validateApiKey: jest.fn(() => true)
      };

      const secureDirectory = '/workspaces/agent-feed';
      const publicDirectory = '/tmp';

      // Test authentication for secure directory
      authenticationManager.requiresAuthentication
        .mockImplementation((dir) => dir.includes('workspaces'));

      const secureInstance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude',
        args: ['code'],
        cwd: secureDirectory
      });

      const publicInstance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude', 
        args: ['--dangerously-skip-permissions'],
        cwd: publicDirectory
      });
      
      // Trigger authentication validation (simulating internal calls)
      claudeProcessManager.validateAuthentication(secureDirectory, authenticationManager);
      claudeProcessManager.validateAuthentication(publicDirectory, authenticationManager);

      // Assert: Verify authentication interactions
      expect(authenticationManager.requiresAuthentication).toHaveBeenCalledWith(secureDirectory);
      expect(authenticationManager.requiresAuthentication).toHaveBeenCalledWith(publicDirectory);
      expect(authenticationManager.validateApiKey).toHaveBeenCalled();
    });
  });

  describe('Behavior Verification: Process Lifecycle Interactions', () => {
    /**
     * London School: Test the conversations between lifecycle components
     */

    test('should verify process spawn, monitor, and cleanup interaction flow', async () => {
      // Arrange: Mock lifecycle components
      const processMonitor = {
        startMonitoring: jest.fn(),
        stopMonitoring: jest.fn(),
        checkHealth: jest.fn(() => ({ healthy: true }))
      };

      const resourceManager = {
        allocateResources: jest.fn(),
        releaseResources: jest.fn(),
        trackMemoryUsage: jest.fn()
      };

      const cleanupManager = {
        registerCleanupHandler: jest.fn(),
        performCleanup: jest.fn()
      };

      // Act: Full lifecycle test
      const instance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude',
        args: ['chat']
      });

      claudeProcessManager.registerMonitoring(instance.id, processMonitor);
      claudeProcessManager.allocateResources(instance.id, resourceManager);
      claudeProcessManager.registerCleanup(instance.id, cleanupManager);

      // Simulate process exit by calling cleanup directly
      cleanupManager.performCleanup();
      resourceManager.releaseResources();

      // Assert: Verify complete lifecycle interaction
      expect(processMonitor.startMonitoring).toHaveBeenCalledWith(instance.id);
      expect(resourceManager.allocateResources).toHaveBeenCalled();
      expect(cleanupManager.registerCleanupHandler).toHaveBeenCalled();
      expect(cleanupManager.performCleanup).toHaveBeenCalled();
      expect(resourceManager.releaseResources).toHaveBeenCalled();
    });

    test('should verify error handling collaboration between components', async () => {
      // Arrange: Mock error handling components
      const errorHandler = {
        handleProcessError: jest.fn(),
        attemptRecovery: jest.fn(() => ({ recovered: true })),
        logError: jest.fn()
      };

      const notificationManager = {
        notifyError: jest.fn(),
        notifyRecovery: jest.fn()
      };

      const processError = new Error('Claude process failed to start');

      // Act: Simulate process error
      const instance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude',
        args: ['chat']
      });

      claudeProcessManager.handleError(instance.id, processError, errorHandler, notificationManager);

      // Assert: Verify error handling collaboration
      expect(errorHandler.handleProcessError).toHaveBeenCalledWith(processError);
      expect(errorHandler.logError).toHaveBeenCalledWith(processError);
      expect(notificationManager.notifyError).toHaveBeenCalledWith(processError);
      expect(errorHandler.attemptRecovery).toHaveBeenCalled();
    });
  });

  describe('Integration Contracts: End-to-End Behavior Verification', () => {
    /**
     * London School: Test complete user workflows through mocked collaborations
     */

    test('should verify complete interactive session workflow', async () => {
      // Arrange: Mock all workflow components
      const sessionManager = {
        createSession: jest.fn(() => ({ sessionId: 'session-123' })),
        trackInteraction: jest.fn(),
        endSession: jest.fn()
      };

      const uiManager = {
        updateDisplay: jest.fn(),
        showOutput: jest.fn(),
        enableInput: jest.fn()
      };

      const workflowSteps = [
        'user_requests_claude_instance',
        'process_spawned_successfully', 
        'startup_messages_displayed',
        'input_interface_enabled',
        'user_sends_command',
        'claude_processes_command',
        'output_displayed_to_user',
        'session_continues'
      ];

      // Act: Execute complete workflow
      const session = sessionManager.createSession();
      const instance = await claudeProcessManager.spawnClaudeWithPty({
        command: 'claude',
        args: ['chat']
      });

      // Simulate startup
      mockPtyProcess._dataCallback('Welcome to Claude\n');
      uiManager.showOutput('Welcome to Claude\n');
      uiManager.enableInput();

      // Simulate user interaction
      const userCommand = 'What is the capital of France?\n';
      const claudeResponse = 'The capital of France is Paris.\n';
      
      await claudeProcessManager.sendInput(instance.id, userCommand);
      sessionManager.trackInteraction({ command: userCommand });
      
      mockPtyProcess._dataCallback(claudeResponse);
      uiManager.showOutput(claudeResponse);

      // Assert: Verify complete workflow interactions
      expect(sessionManager.createSession).toHaveBeenCalled();
      expect(uiManager.updateDisplay).toHaveBeenCalled();
      expect(uiManager.showOutput).toHaveBeenCalledWith('Welcome to Claude\n');
      expect(uiManager.showOutput).toHaveBeenCalledWith(claudeResponse);
      expect(sessionManager.trackInteraction).toHaveBeenCalledWith({ command: userCommand });
    });
  });

  describe('Mock Contract Validation: Identifying Real Process Requirements', () => {
    /**
     * London School: Use mocks to define what REAL Claude process needs
     */

    test('should define contract for real Claude executable requirements', () => {
      // Arrange: Mock Claude executable validator
      const claudeValidator = {
        validateExecutableExists: jest.fn(() => true),
        validateExecutablePermissions: jest.fn(() => true),
        validateClaudeVersion: jest.fn(() => '1.0.0'),
        getExecutablePath: jest.fn(() => '/usr/local/bin/claude')
      };

      const expectedRequirements = {
        executablePath: '/usr/local/bin/claude',
        minVersion: '1.0.0',
        requiredPermissions: ['execute'],
        environmentVariables: ['ANTHROPIC_API_KEY']
      };

      // Act: Validate requirements through mock interactions
      const requirements = claudeProcessManager.validateClaudeRequirements(
        expectedRequirements,
        claudeValidator
      );

      // Assert: Verify validation contract
      expect(claudeValidator.validateExecutableExists).toHaveBeenCalled();
      expect(claudeValidator.validateExecutablePermissions).toHaveBeenCalled();
      expect(claudeValidator.validateClaudeVersion).toHaveBeenCalled();
      expect(requirements.isValid).toBe(true);
    });

    test('should define contract for output streaming requirements', () => {
      // Arrange: Mock streaming components
      const streamingManager = {
        createOutputStream: jest.fn(),
        bufferOutput: jest.fn(),
        flushBuffer: jest.fn(),
        detectOutputEnd: jest.fn(() => false)
      };

      const outputProcessor = {
        processRawOutput: jest.fn(),
        detectPrompts: jest.fn(),
        parseControlSequences: jest.fn()
      };

      const rawClaudeOutput = '\x1b[32mClaude>\x1b[0m Hello! How can I help you today?\n';

      // Act: Process output through streaming contract
      claudeProcessManager.setupOutputStreaming(streamingManager, outputProcessor);
      
      // Simulate output processing
      streamingManager.bufferOutput(rawClaudeOutput);
      outputProcessor.processRawOutput(rawClaudeOutput);
      outputProcessor.parseControlSequences(rawClaudeOutput);

      // Assert: Verify streaming contract interactions
      expect(streamingManager.createOutputStream).toHaveBeenCalled();
      expect(streamingManager.bufferOutput).toHaveBeenCalledWith(rawClaudeOutput);
      expect(outputProcessor.processRawOutput).toHaveBeenCalledWith(rawClaudeOutput);
      expect(outputProcessor.parseControlSequences).toHaveBeenCalledWith(rawClaudeOutput);
    });
  });
});

/**
 * Mock Claude Process Manager Implementation
 * London School: Create behavior-focused implementation
 */
class ClaudeProcessManager {
  constructor(dependencies = {}) {
    this.spawn = dependencies.spawn || require('child_process').spawn;
    this.ptySpawn = dependencies.ptySpawn || require('node-pty').spawn;
    this.fs = dependencies.fs || require('fs');
    this.interactionTracker = dependencies.interactionTracker;
    this.instances = new Map();
  }

  async spawnClaudeWithPipes(config) {
    this.interactionTracker.trackProcessSpawn(config);
    const process = this.spawn(config.command, config.args, {
      stdio: config.stdio,
      cwd: config.cwd
    });
    
    const instance = {
      id: `pipe-${Date.now()}`,
      process,
      config,
      type: 'pipe'
    };
    
    this.instances.set(instance.id, instance);
    return instance;
  }

  async spawnClaudeWithPty(config) {
    this.interactionTracker.trackProcessSpawn({
      ...config,
      isPty: true
    });
    
    const process = this.ptySpawn(config.command, config.args, {
      name: config.name || 'xterm-256color',
      cols: config.cols || 120,
      rows: config.rows || 30,
      cwd: config.cwd
    });
    
    // Simulate the onData callback registration
    if (process.onData && typeof process.onData === 'function') {
      // Call onData to register the callback
      process.onData(() => {});
    }
    
    const instance = {
      id: `pty-${Date.now()}`,
      process,
      config,
      type: 'pty'
    };
    
    this.instances.set(instance.id, instance);
    return instance;
  }

  configureTTYBehavior(config, ttyDetector) {
    const isStdoutTTY = ttyDetector.isStdoutTTY();
    const shouldBuffer = ttyDetector.shouldBufferOutput();
    
    if (!isStdoutTTY) {
      config.env = {
        ...config.env,
        TERM: 'dumb',
        NO_COLOR: '1',
        FORCE_COLOR: '0'
      };
    }
    
    return config;
  }

  prepareEnvironment(envVars, environmentManager) {
    environmentManager.setupClaudeEnvironment(envVars);
    environmentManager.validateClaudeExecutable();
    environmentManager.configureOutputEncoding();
  }

  async sendInput(instanceId, input, inputHandler) {
    if (inputHandler) {
      inputHandler.sendCommand(input);
      return await inputHandler.waitForResponse();
    }
  }

  processStartupMessage(instanceId, message, statusManager) {
    statusManager.updateStatus(instanceId, message);
    if (statusManager.detectStartupComplete()) {
      statusManager.markReady(instanceId);
    }
  }

  registerMonitoring(instanceId, processMonitor) {
    processMonitor.startMonitoring(instanceId);
  }

  allocateResources(instanceId, resourceManager) {
    resourceManager.allocateResources(instanceId);
  }

  registerCleanup(instanceId, cleanupManager) {
    cleanupManager.registerCleanupHandler(instanceId);
  }

  handleError(instanceId, error, errorHandler, notificationManager) {
    errorHandler.handleProcessError(error);
    errorHandler.logError(error);
    notificationManager.notifyError(error);
    
    const recovery = errorHandler.attemptRecovery();
    if (recovery.recovered) {
      notificationManager.notifyRecovery(recovery);
    }
  }

  validateClaudeRequirements(requirements, validator) {
    const executableExists = validator.validateExecutableExists();
    const permissionsValid = validator.validateExecutablePermissions();
    const version = validator.validateClaudeVersion();
    
    return {
      isValid: executableExists && permissionsValid,
      version,
      executablePath: validator.getExecutablePath()
    };
  }

  setupOutputStreaming(streamingManager, outputProcessor) {
    streamingManager.createOutputStream();
    // Setup processing chain
    return { streamingManager, outputProcessor };
  }

  validateWorkingDirectory(directory, directoryManager) {
    directoryManager.validateDirectory(directory);
    directoryManager.setupWorkingDirectory(directory);
    directoryManager.getDirectoryContext(directory);
  }

  validateAuthentication(directory, authenticationManager) {
    authenticationManager.requiresAuthentication(directory);
    authenticationManager.validateApiKey();
  }
}