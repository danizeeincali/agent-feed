/**
 * TDD London School Tests - Current Bug Verification
 * 
 * These tests demonstrate the CURRENT BUGGY BEHAVIOR
 * All instances spawn in /workspaces/agent-feed regardless of button type
 */

const { jest } = require('@jest/globals');

// Mock the child_process module
jest.mock('child_process');

describe('Current Bug Verification - All Instances Spawn in Same Directory', () => {
  let mockSpawn;
  let mockProcess;
  let createRealClaudeInstanceOriginal;
  
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
    
    // Import the ORIGINAL buggy function
    const helpers = require('../test-helpers/claude-spawning');
    createRealClaudeInstanceOriginal = helpers.createRealClaudeInstanceOriginal;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bug Demonstration: Wrong Directory Usage', () => {
    /**
     * London School Focus: Verify the ACTUAL (buggy) interactions
     * These tests will PASS with current code but demonstrate the bug
     */
    
    it('BUG: prod/claude incorrectly spawns in /workspaces/agent-feed instead of /workspaces/agent-feed/prod', () => {
      // Arrange: Test the current buggy behavior
      const instanceType = 'prod';
      const instanceId = 'claude-bug-prod';
      
      // Act: Execute current buggy implementation
      const result = createRealClaudeInstanceOriginal(instanceType, instanceId);
      
      // Assert: Verify it shows the BUG (wrong directory)
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed' // BUG: Should be /workspaces/agent-feed/prod
        })
      );
      
      // Verify the bug is recorded in the result
      expect(result.workingDirectory).toBe('/workspaces/agent-feed'); // BUG: Wrong directory
    });
    
    it('BUG: All instance types use same directory (demonstrates the core issue)', () => {
      // Arrange: Test all instance types with current buggy implementation
      const instanceTypes = [
        'prod',                    // Should use /workspaces/agent-feed/prod
        'skip-permissions',        // Should use /workspaces/agent-feed  
        'skip-permissions-c',      // Should use /workspaces/agent-feed
        'skip-permissions-resume'  // Should use /workspaces/agent-feed
      ];
      
      // Act & Assert: All spawn in same directory (demonstrating bug)
      instanceTypes.forEach((instanceType, index) => {
        mockSpawn.mockClear();
        
        const instanceId = `claude-bug-${index}`;
        const result = createRealClaudeInstanceOriginal(instanceType, instanceId);
        
        // BUG: All use the same hardcoded directory
        expect(mockSpawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            cwd: '/workspaces/agent-feed' // BUG: Always the same directory
          })
        );
        
        expect(result.workingDirectory).toBe('/workspaces/agent-feed'); // BUG: Same for all
      });
    });
  });

  describe('Expected vs Actual Behavior Contracts', () => {
    /**
     * London School: Define contracts that SHOULD exist but currently don't
     */
    
    it('CONTRACT VIOLATION: prod instances should spawn in prod directory', () => {
      // Arrange: Set up expected vs actual behavior verification
      const instanceType = 'prod';
      const instanceId = 'claude-contract-test';
      
      // Act: Execute current implementation
      createRealClaudeInstanceOriginal(instanceType, instanceId);
      
      // Assert: Document the contract violation
      expect(mockSpawn).not.toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod' // This is what SHOULD happen
        })
      );
      
      // But it was called with wrong directory
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed' // This is what ACTUALLY happens (bug)
        })
      );
    });
  });
});

describe('Corrected Behavior Verification', () => {
  let mockSpawn;
  let mockProcess;
  let createRealClaudeInstance;
  
  beforeEach(() => {
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
    
    const childProcess = require('child_process');
    childProcess.spawn = mockSpawn;
    
    // Import the CORRECTED function
    const helpers = require('../test-helpers/claude-spawning');
    createRealClaudeInstance = helpers.createRealClaudeInstance;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fixed Directory Spawning Behavior', () => {
    /**
     * London School: Verify corrected collaboration patterns
     */
    
    it('FIXED: prod/claude now spawns in correct /workspaces/agent-feed/prod directory', () => {
      // Arrange: Test the corrected behavior
      const instanceType = 'prod';
      const instanceId = 'claude-fixed-prod';
      
      // Act: Execute corrected implementation
      const result = createRealClaudeInstance(instanceType, instanceId);
      
      // Assert: Verify correct directory interaction
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod' // FIXED: Correct directory
        })
      );
      
      // Verify fix is recorded in result
      expect(result.workingDirectory).toBe('/workspaces/agent-feed/prod'); // FIXED: Correct directory
    });
    
    it('FIXED: Different instance types use appropriate directories', () => {
      // Arrange: Test scenarios with expected directories
      const testScenarios = [
        {
          instanceType: 'prod',
          expectedDirectory: '/workspaces/agent-feed/prod'
        },
        {
          instanceType: 'skip-permissions',
          expectedDirectory: '/workspaces/agent-feed'
        },
        {
          instanceType: 'skip-permissions-c',
          expectedDirectory: '/workspaces/agent-feed'
        },
        {
          instanceType: 'skip-permissions-resume',
          expectedDirectory: '/workspaces/agent-feed'
        }
      ];
      
      // Act & Assert: Each uses correct directory
      testScenarios.forEach(({ instanceType, expectedDirectory }, index) => {
        mockSpawn.mockClear();
        
        const instanceId = `claude-fixed-${index}`;
        const result = createRealClaudeInstance(instanceType, instanceId);
        
        // FIXED: Each uses correct directory
        expect(mockSpawn).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            cwd: expectedDirectory // FIXED: Correct per instance type
          })
        );
        
        expect(result.workingDirectory).toBe(expectedDirectory); // FIXED: Varies by type
      });
    });
  });
});

describe('Side-by-Side Bug vs Fix Comparison', () => {
  /**
   * London School: Demonstrate behavioral differences through interaction testing
   */
  
  let mockSpawn;
  let mockProcess;
  
  beforeEach(() => {
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
    
    const childProcess = require('child_process');
    childProcess.spawn = mockSpawn;
  });
  
  it('demonstrates behavioral difference: buggy vs fixed implementations', () => {
    const { createRealClaudeInstance, createRealClaudeInstanceOriginal } = require('../test-helpers/claude-spawning');
    
    const instanceType = 'prod';
    const instanceId = 'claude-comparison';
    
    // Test buggy version
    mockSpawn.mockClear();
    const buggyResult = createRealClaudeInstanceOriginal(instanceType, instanceId);
    const buggySpawnCall = mockSpawn.mock.calls[0];
    
    // Test fixed version  
    mockSpawn.mockClear();
    const fixedResult = createRealClaudeInstance(instanceType, instanceId);
    const fixedSpawnCall = mockSpawn.mock.calls[0];
    
    // Compare the behavioral differences
    expect(buggySpawnCall[2].cwd).toBe('/workspaces/agent-feed');        // Bug: Wrong directory
    expect(fixedSpawnCall[2].cwd).toBe('/workspaces/agent-feed/prod');   // Fix: Correct directory
    
    expect(buggyResult.workingDirectory).toBe('/workspaces/agent-feed');      // Bug in result
    expect(fixedResult.workingDirectory).toBe('/workspaces/agent-feed/prod'); // Fix in result
  });
});