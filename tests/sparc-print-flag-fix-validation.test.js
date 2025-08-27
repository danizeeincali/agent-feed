/**
 * SPARC --print Flag Fix Validation Test
 * 
 * VALIDATION FOCUS:
 * - Claude processes spawn successfully without --print flags
 * - Interactive mode works properly without hanging
 * - PTY terminal functionality preserved
 * - All 4 button configurations work without --print errors
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';

describe('SPARC --print Flag Fix Validation', () => {
  let testInstances = [];

  afterAll(async () => {
    // Cleanup test instances
    for (const instanceId of testInstances) {
      try {
        await axios.delete(`${BACKEND_URL}/api/claude/instances/${instanceId}`);
      } catch (error) {
        // Instance may already be cleaned up
        console.log(`Cleanup note: Instance ${instanceId} already cleaned up`);
      }
    }
  });

  test('SHOULD spawn Claude without --print flags in PTY mode', async () => {
    // ARRANGE
    const config = {
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      workingDirectory: '/workspaces/agent-feed/prod',
      usePty: true
    };

    // ACT
    const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, config);

    // ASSERT
    expect(response.data.success).toBe(true);
    expect(response.data.instance).toBeDefined();
    expect(response.data.instance.processType).toBe('pty');
    expect(response.data.instance.command).toBe('claude '); // No --print flag
    expect(response.data.instance.pid).toBeGreaterThan(0);
    
    // Track for cleanup
    testInstances.push(response.data.instance.id);
  }, 10000);

  test('SHOULD spawn Claude without --print flags in pipe mode', async () => {
    // ARRANGE
    const config = {
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      workingDirectory: '/workspaces/agent-feed/prod',
      usePty: false
    };

    // ACT
    const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, config);

    // ASSERT
    expect(response.data.success).toBe(true);
    expect(response.data.instance).toBeDefined();
    expect(response.data.instance.processType).toBe('pipe');
    expect(response.data.instance.command).toBe('claude '); // No --print flag
    expect(response.data.instance.pid).toBeGreaterThan(0);
    
    // Track for cleanup
    testInstances.push(response.data.instance.id);
  }, 10000);

  test('SHOULD handle all 4 button configurations without --print errors', async () => {
    // ARRANGE: All 4 button configurations from frontend
    const configurations = [
      {
        name: 'prod/claude',
        command: 'claude',
        args: [],
        workingDirectory: '/workspaces/agent-feed/prod',
        usePty: true
      },
      {
        name: 'skip-permissions',
        command: 'claude',
        args: ['--dangerously-skip-permissions'],
        workingDirectory: '/workspaces/agent-feed',
        usePty: true
      },
      {
        name: 'dev/claude',
        command: 'claude',
        args: ['--dangerously-skip-permissions'],
        workingDirectory: '/workspaces/agent-feed',
        usePty: true
      },
      {
        name: 'root/claude',
        command: 'claude',
        args: ['--dangerously-skip-permissions'],
        workingDirectory: '/',
        usePty: true
      }
    ];

    // ACT & ASSERT: Each configuration should work without --print flags
    for (const config of configurations) {
      const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, config);
      
      expect(response.data.success).toBe(true);
      expect(response.data.instance.command).toBe('claude '); // No --print flag
      expect(response.data.instance.processType).toBe('pty');
      expect(response.data.instance.pid).toBeGreaterThan(0);
      
      // Track for cleanup
      testInstances.push(response.data.instance.id);
    }
  }, 30000);

  test('SHOULD NOT contain --print flags in command construction', async () => {
    // ARRANGE
    const config = {
      command: 'claude',
      args: ['--version'],
      workingDirectory: '/workspaces/agent-feed',
      usePty: true
    };

    // ACT
    const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, config);

    // ASSERT: Command should be clean without --print
    expect(response.data.success).toBe(true);
    expect(response.data.instance.command).toBe('claude ');
    expect(response.data.instance.command).not.toContain('--print');
    
    // Track for cleanup
    testInstances.push(response.data.instance.id);
  }, 10000);

  test('SHOULD verify instances complete without hanging', async () => {
    // ARRANGE
    const config = {
      command: 'claude',
      args: ['--version'],
      workingDirectory: '/workspaces/agent-feed',
      usePty: true
    };

    // ACT
    const createResponse = await axios.post(`${BACKEND_URL}/api/claude/instances`, config);
    const instanceId = createResponse.data.instance.id;
    testInstances.push(instanceId);

    // Wait for process to complete naturally
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check final status
    const instancesResponse = await axios.get(`${BACKEND_URL}/api/claude/instances`);
    const instance = instancesResponse.data.instances.find(i => i.id === instanceId);

    // ASSERT: Instance should be stopped (completed) not hanging
    expect(instance).toBeDefined();
    expect(instance.status).toBe('stopped'); // Completed without hanging
    expect(instance.command).not.toContain('--print');
  }, 15000);

  test('SHOULD preserve PTY functionality without --print flags', async () => {
    // ARRANGE
    const config = {
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      workingDirectory: '/workspaces/agent-feed/prod',
      usePty: true
    };

    // ACT
    const response = await axios.post(`${BACKEND_URL}/api/claude/instances`, config);

    // ASSERT: PTY specific properties should be preserved
    expect(response.data.success).toBe(true);
    expect(response.data.instance.processType).toBe('pty');
    expect(response.data.instance.usePty).toBe(true);
    expect(response.data.instance.command).toBe('claude '); // Clean command
    
    // Track for cleanup
    testInstances.push(response.data.instance.id);
  }, 10000);
});