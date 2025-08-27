/**
 * TDD London School Tests - Directory-Specific Claude Spawning
 * 
 * Testing approach: Outside-in with mock-driven development
 * Focus: Behavior verification of spawn() interactions and collaborations
 */

// Mock the child_process module at the top level
jest.mock('child_process');

describe('Directory-Specific Claude Spawning - London School TDD', () => {
  let mockSpawn;
  let mockProcess;
  let createRealClaudeInstance;
  
  beforeEach(() => {
    // Create fresh mocks for each test
    mockProcess = {
      pid: 12345,
      stdin: { write: jest.fn(), end: jest.fn() },
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
      killed: false
    };
    
    mockSpawn = jest.fn().mockReturnValue(mockProcess);
    
    // Mock the child_process module
    const childProcess = require('child_process');
    childProcess.spawn = mockSpawn;
    
    // Import the function under test after mocking
    // Since we can't easily import from simple-backend.js, we'll test the function directly
    createRealClaudeInstance = require('../test-helpers/claude-spawning').createRealClaudeInstance;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Working Directory Contract Verification', () => {
    /**
     * Contract Test: spawn() function must receive correct cwd parameter
     * London School Focus: Verify the conversation between createRealClaudeInstance and spawn()
     */
    
    it('should spawn prod/claude in /workspaces/agent-feed/prod directory', () => {
      // Arrange: Set up the collaboration expectation
      const instanceType = 'prod';
      const instanceId = 'claude-test-001';
      
      // Act: Execute the behavior under test
      createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify the interaction contract
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod'
        })
      );
      
      // Verify the conversation happened exactly once
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
    
    it('should spawn skip-permissions in /workspaces/agent-feed directory', () => {
      // Arrange: Mock collaboration setup
      const instanceType = 'skip-permissions';
      const instanceId = 'claude-test-002';
      
      // Act: Trigger the collaboration
      createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify spawn() received correct working directory
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--dangerously-skip-permissions'],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed'
        })
      );
      
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
    
    it('should spawn skip-permissions -c in /workspaces/agent-feed directory', () => {
      // Arrange: Set up mock expectations
      const instanceType = 'skip-permissions-c';
      const instanceId = 'claude-test-003';
      
      // Act: Execute the behavior
      createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify the collaboration contract
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--dangerously-skip-permissions', '-c'],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed'
        })
      );
      
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
    
    it('should spawn skip-permissions --resume in /workspaces/agent-feed directory', () => {
      // Arrange: Configure mock interactions
      const instanceType = 'skip-permissions-resume';
      const instanceId = 'claude-test-004';
      
      // Act: Invoke the system under test
      createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify spawn() collaboration
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--dangerously-skip-permissions', '--resume'],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed'
        })
      );
      
      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Command Configuration Behavior Verification', () => {
    /**
     * London School Focus: Test HOW objects collaborate
     * Verify the entire conversation flow, not just state
     */
    
    it('should coordinate proper command construction for prod instances', () => {
      // Arrange: Set up collaboration scenario
      const instanceType = 'prod';
      const instanceId = 'claude-prod-001';
      
      // Act: Execute the coordination
      const result = createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify the full collaboration pattern
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: expect.any(Object),
          shell: false
        })
      );
      
      // Verify return value contains expected collaboration result
      expect(result).toEqual(expect.objectContaining({
        process: mockProcess,
        pid: 12345,
        status: 'starting',
        workingDirectory: '/workspaces/agent-feed/prod',
        instanceType: 'prod'
      }));
    });
    
    it('should coordinate proper command construction for skip-permissions instances', () => {
      // Arrange: Mock collaboration setup
      const instanceType = 'skip-permissions';
      const instanceId = 'claude-skip-001';
      
      // Act: Trigger the workflow
      const result = createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify complete interaction pattern
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--dangerously-skip-permissions'],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed',
          stdio: ['pipe', 'pipe', 'pipe']
        })
      );
      
      // Verify the coordination result
      expect(result.workingDirectory).toBe('/workspaces/agent-feed');
      expect(result.instanceType).toBe('skip-permissions');
    });
  });

  describe('Error Handling Collaboration Patterns', () => {
    /**
     * London School: Test how objects collaborate under error conditions
     */
    
    it('should handle spawn() failure gracefully with proper error propagation', () => {
      // Arrange: Configure mock to simulate spawn failure
      const spawnError = new Error('ENOENT: command not found');
      mockSpawn.mockImplementation(() => {
        throw spawnError;
      });
      
      const instanceType = 'prod';
      const instanceId = 'claude-error-001';
      
      // Act & Assert: Verify error handling collaboration
      expect(() => {
        createRealClaudeInstance(instanceType, instanceId);
      }).toThrow('ENOENT: command not found');
      
      // Verify spawn() was attempted with correct parameters
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod'
        })
      );
    });
  });

  describe('Process Lifecycle Interaction Verification', () => {
    /**
     * London School: Focus on object conversations and event handling
     */
    
    it('should establish proper event handler collaborations after spawn', () => {
      // Arrange: Set up event handler verification
      const instanceType = 'prod';
      const instanceId = 'claude-lifecycle-001';
      
      // Act: Execute the lifecycle setup
      createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify event handler collaborations were established
      expect(mockProcess.on).toHaveBeenCalledWith('spawn', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
      
      // Verify the conversation setup was complete
      expect(mockProcess.on).toHaveBeenCalledTimes(3); // spawn, exit, error
    });
  });

  describe('Integration Workflow Behavior Tests', () => {
    /**
     * London School: Test complete workflows and object collaborations
     */
    
    it('should execute complete spawn workflow for different instance types', () => {
      // Arrange: Test data for multiple instance types
      const testScenarios = [
        {
          instanceType: 'prod',
          expectedCwd: '/workspaces/agent-feed/prod',
          expectedCommand: 'claude',
          expectedArgs: []
        },
        {
          instanceType: 'skip-permissions',
          expectedCwd: '/workspaces/agent-feed',
          expectedCommand: 'claude',
          expectedArgs: ['--dangerously-skip-permissions']
        },
        {
          instanceType: 'skip-permissions-c',
          expectedCwd: '/workspaces/agent-feed',
          expectedCommand: 'claude',
          expectedArgs: ['--dangerously-skip-permissions', '-c']
        },
        {
          instanceType: 'skip-permissions-resume',
          expectedCwd: '/workspaces/agent-feed',
          expectedCommand: 'claude',
          expectedArgs: ['--dangerously-skip-permissions', '--resume']
        }
      ];
      
      // Act & Assert: Execute workflow for each scenario
      testScenarios.forEach(({ instanceType, expectedCwd, expectedCommand, expectedArgs }, index) => {
        // Reset mocks between iterations
        mockSpawn.mockClear();
        
        const instanceId = `claude-workflow-${index + 1}`;
        const result = createRealClaudeInstance(instanceType, instanceId);
        
        // Verify spawn() collaboration for this scenario
        expect(mockSpawn).toHaveBeenCalledWith(
          expectedCommand,
          expectedArgs,
          expect.objectContaining({
            cwd: expectedCwd
          })
        );
        
        // Verify workflow result
        expect(result).toEqual(expect.objectContaining({
          workingDirectory: expectedCwd,
          instanceType: instanceType
        }));
      });
    });
  });
});

// Mock Contracts and Shared Behaviors
describe('Spawn Function Contract Verification', () => {
  /**
   * London School: Define and verify contracts between collaborating objects
   */
  
  let mockSpawn;
  
  beforeEach(() => {
    mockSpawn = jest.fn();
    const childProcess = require('child_process');
    childProcess.spawn = mockSpawn;
  });
  
  it('should maintain consistent spawn() contract across all instance types', () => {
    // Contract definition: spawn(command, args, options)
    const expectedContract = {
      command: expect.any(String),
      args: expect.any(Array),
      options: expect.objectContaining({
        cwd: expect.any(String),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.any(Object),
        shell: false
      })
    };
    
    // Verify contract is honored for all instance types
    const instanceTypes = ['prod', 'skip-permissions', 'skip-permissions-c', 'skip-permissions-resume'];
    
    instanceTypes.forEach((instanceType) => {
      mockSpawn.mockClear();
      mockSpawn.mockReturnValue({
        pid: 12345,
        on: jest.fn(),
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() }
      });
      
      const createRealClaudeInstance = require('../test-helpers/claude-spawning').createRealClaudeInstance;
      createRealClaudeInstance(instanceType, `test-${instanceType}`);
      
      // Verify contract compliance
      expect(mockSpawn).toHaveBeenCalledWith(
        expectedContract.command,
        expectedContract.args,
        expectedContract.options
      );
    });
  });
});