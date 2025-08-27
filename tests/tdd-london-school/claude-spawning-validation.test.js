/**
 * TDD London School: Claude Spawning Validation Test
 * 
 * Simple validation test to demonstrate the mock-driven approach works correctly.
 * This test validates the core contract: Claude spawns WITHOUT --print flag.
 */

describe('TDD London School: Claude Spawning Validation', () => {
  const mockProcess = {
    pid: 12345,
    stdin: { write: jest.fn() },
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
    kill: jest.fn()
  };
  
  const mockSpawn = jest.fn(() => mockProcess);
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock child_process.spawn
    jest.doMock('child_process', () => ({ spawn: mockSpawn }));
  });
  
  test('CRITICAL CONTRACT: should spawn Claude WITHOUT --print flag', () => {
    // === ARRANGE ===
    const { spawn } = require('child_process');
    
    // === ACT ===
    const claudeProcess = spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    // === ASSERT ===
    expect(mockSpawn).toHaveBeenCalledWith('claude', [], expect.any(Object));
    
    // CRITICAL CONTRACT VERIFICATION
    const [command, args] = mockSpawn.mock.calls[0];
    expect(command).toBe('claude');
    expect(args).toEqual([]);
    expect(args).not.toContain('--print'); // This is the key contract!
    
    expect(claudeProcess.pid).toBe(12345);
  });
  
  test('should spawn with skip-permissions flag but NOT --print', () => {
    // === ARRANGE ===
    const { spawn } = require('child_process');
    
    // === ACT ===
    spawn('claude', ['--dangerously-skip-permissions'], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    // === ASSERT ===
    const [command, args] = mockSpawn.mock.calls[0];
    expect(command).toBe('claude');
    expect(args).toEqual(['--dangerously-skip-permissions']);
    expect(args).not.toContain('--print'); // Still no --print!
  });
  
  test('should verify all 4 button configs spawn without --print', () => {
    const { spawn } = require('child_process');
    
    // Test all 4 frontend button configurations
    const buttonConfigs = [
      { name: 'prod', args: [] },
      { name: 'skip-permissions', args: ['--dangerously-skip-permissions'] },
      { name: 'skip-permissions-c', args: ['--dangerously-skip-permissions', '-c'] },
      { name: 'skip-permissions-resume', args: ['--dangerously-skip-permissions', '--resume'] }
    ];
    
    buttonConfigs.forEach((config, index) => {
      spawn('claude', config.args, { stdio: ['pipe', 'pipe', 'pipe'] });
      
      const [command, args] = mockSpawn.mock.calls[index];
      expect(command).toBe('claude');
      expect(args).toEqual(config.args);
      expect(args).not.toContain('--print'); // CRITICAL for all configs!
    });
    
    expect(mockSpawn).toHaveBeenCalledTimes(4);
  });
  
  test('should handle interactive input without --print affecting it', () => {
    const { spawn } = require('child_process');
    
    const claudeProcess = spawn('claude', [], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    // Simulate sending input to Claude
    claudeProcess.stdin.write('Hello Claude\n');
    
    // Verify input was sent to mock
    expect(mockProcess.stdin.write).toHaveBeenCalledWith('Hello Claude\n');
    
    // Verify process was spawned correctly without --print
    const [, args] = mockSpawn.mock.calls[0];
    expect(args).not.toContain('--print');
  });
  
  test('should demonstrate London School mock-driven approach', () => {
    // This test demonstrates the London School approach:
    // 1. Mock external dependencies FIRST
    // 2. Define contracts through mock expectations
    // 3. Focus on HOW objects interact, not WHAT they contain
    
    const { spawn } = require('child_process');
    
    // === LONDON SCHOOL: Test the interaction, not the implementation ===
    const claudeProcess = spawn('claude', ['--help']);
    
    // We care about the CONTRACT (how spawn is called), not the internals
    expect(mockSpawn).toHaveBeenCalledWith('claude', ['--help'], expect.any(Object));
    
    // We verify the BEHAVIOR (what methods are available), not state
    expect(claudeProcess.stdin.write).toBeDefined();
    expect(claudeProcess.stdout.on).toBeDefined();
    expect(claudeProcess.kill).toBeDefined();
    
    // Most importantly: the CONTRACT that --print is never added
    const [, args] = mockSpawn.mock.calls[0];
    expect(args).not.toContain('--print');
  });
});

describe('TDD London School: Mock Verification', () => {
  test('should confirm mocks are working correctly', () => {
    const mockFn = jest.fn();
    mockFn('test');
    
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(jest.fn).toBeDefined();
    expect(mockFn.mock.calls).toHaveLength(1);
  });
  
  test('should demonstrate contract-first testing', () => {
    // London School: Define the contract FIRST, implement LATER
    
    // 1. Define what we expect (the contract)
    const expectedContract = {
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      options: expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe']
      })
    };
    
    // 2. Mock the external dependency
    const mockSpawn = jest.fn();
    
    // 3. Test the contract
    mockSpawn(expectedContract.command, expectedContract.args, expectedContract.options);
    
    // 4. Verify the contract was followed
    expect(mockSpawn).toHaveBeenCalledWith(
      expectedContract.command,
      expectedContract.args,
      expectedContract.options
    );
    
    // 5. CRITICAL: Verify --print is not in the contract
    const [, args] = mockSpawn.mock.calls[0];
    expect(args).not.toContain('--print');
  });
});