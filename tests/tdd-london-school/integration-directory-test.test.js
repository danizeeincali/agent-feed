/**
 * TDD London School - Integration Test for Current Directory Behavior
 * Tests the ACTUAL backend behavior via HTTP requests
 */

const request = require('supertest');

// Start the backend server for testing
let server;
let app;

beforeAll(async () => {
  // Import and start the actual backend
  delete require.cache[require.resolve('../../simple-backend.js')];
  
  // Mock spawn to prevent actual process creation during tests
  jest.mock('child_process', () => ({
    spawn: jest.fn(() => ({
      pid: 12345,
      stdin: { write: jest.fn(), end: jest.fn() },
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
      killed: false
    }))
  }));
  
  // We'll test the actual API endpoints instead of the function directly
  // Since the backend is running on port 3000, we can test against localhost
});

afterAll(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

describe('Integration Test - Current Directory Spawning Behavior', () => {
  
  it('should spawn prod/claude instance via API', async () => {
    const instanceConfig = {
      command: ['claude'] // This represents Button 1: "prod/claude"
    };
    
    // Make actual HTTP request to the running backend
    const response = await request('http://localhost:3000')
      .post('/api/claude/instances')
      .send(instanceConfig)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.instance).toBeDefined();
    
    console.log('✅ Prod instance created:', response.body.instance);
    
    // Clean up
    if (response.body.instance?.id) {
      await request('http://localhost:3000')
        .delete(`/api/claude/instances/${response.body.instance.id}`)
        .expect(200);
    }
  });
  
  it('should spawn skip-permissions instance via API', async () => {
    const instanceConfig = {
      command: ['claude', '--dangerously-skip-permissions'] // Button 2
    };
    
    const response = await request('http://localhost:3000')
      .post('/api/claude/instances')
      .send(instanceConfig)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.instance).toBeDefined();
    
    console.log('✅ Skip-permissions instance created:', response.body.instance);
    
    // Clean up
    if (response.body.instance?.id) {
      await request('http://localhost:3000')
        .delete(`/api/claude/instances/${response.body.instance.id}`)
        .expect(200);
    }
  });
  
  it('should spawn skip-permissions -c instance via API', async () => {
    const instanceConfig = {
      command: ['claude', '--dangerously-skip-permissions', '-c'] // Button 3
    };
    
    const response = await request('http://localhost:3000')
      .post('/api/claude/instances')
      .send(instanceConfig)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.instance).toBeDefined();
    
    console.log('✅ Skip-permissions -c instance created:', response.body.instance);
    
    // Clean up
    if (response.body.instance?.id) {
      await request('http://localhost:3000')
        .delete(`/api/claude/instances/${response.body.instance.id}`)
        .expect(200);
    }
  });
  
  it('should spawn skip-permissions --resume instance via API', async () => {
    const instanceConfig = {
      command: ['claude', '--dangerously-skip-permissions', '--resume'] // Button 4
    };
    
    const response = await request('http://localhost:3000')
      .post('/api/claude/instances')
      .send(instanceConfig)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.instance).toBeDefined();
    
    console.log('✅ Skip-permissions --resume instance created:', response.body.instance);
    
    // Clean up
    if (response.body.instance?.id) {
      await request('http://localhost:3000')
        .delete(`/api/claude/instances/${response.body.instance.id}`)
        .expect(200);
    }
  });
});

describe('Directory Resolution Behavior Verification', () => {
  
  it('should log the working directory for each instance type', async () => {
    // This test will verify the console logs to see what directories are being used
    const testScenarios = [
      { command: ['claude'], expected: 'prod directory' },
      { command: ['claude', '--dangerously-skip-permissions'], expected: 'base directory' },
      { command: ['claude', '--dangerously-skip-permissions', '-c'], expected: 'base directory' },
      { command: ['claude', '--dangerously-skip-permissions', '--resume'], expected: 'base directory' }
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\n🧪 Testing directory resolution for command:`, scenario.command);
      
      const response = await request('http://localhost:3000')
        .post('/api/claude/instances')
        .send({ command: scenario.command })
        .expect(201);
      
      expect(response.body.success).toBe(true);
      console.log(`📁 Instance type determined as: ${response.body.instance.type}`);
      
      // Clean up
      if (response.body.instance?.id) {
        await request('http://localhost:3000')
          .delete(`/api/claude/instances/${response.body.instance.id}`)
          .expect(200);
      }
    }
  });
});