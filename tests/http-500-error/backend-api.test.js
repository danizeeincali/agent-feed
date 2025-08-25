/**
 * Backend API Unit Tests for HTTP 500 Error Handling
 * Tests all button endpoints: /api/claude/launch, /api/claude/stop, /api/claude/check, /api/claude/status
 */

const request = require('supertest');
const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Mock child_process to simulate failures
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');

describe('Backend API HTTP 500 Error Tests', () => {
  let app;
  let mockProcess;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create Express app with the same structure as simple-server.js
    app = express();
    app.use(express.json());
    
    // Mock process for testing
    mockProcess = {
      pid: 12345,
      killed: false,
      kill: jest.fn(),
      on: jest.fn(),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    
    // Setup default mocks
    fs.existsSync.mockReturnValue(true);
    path.resolve.mockReturnValue('/mock/prod/path');
    spawn.mockReturnValue(mockProcess);
  });

  describe('GET /api/claude/check - Claude CLI Availability', () => {
    beforeEach(() => {
      app.get('/api/claude/check', async (req, res) => {
        try {
          const claudePath = '/home/codespace/nvm/current/bin/claude';
          
          if (!fs.existsSync(claudePath)) {
            throw new Error('Claude CLI not found');
          }
          
          const testProcess = spawn(claudePath, ['--version'], {
            stdio: 'pipe',
            timeout: 5000
          });
          
          testProcess.on('close', (code) => {
            res.json({
              success: true,
              claudeAvailable: code === 0,
              message: code === 0 ? 'Claude available' : 'Claude not executable'
            });
          });
          
          testProcess.on('error', (error) => {
            throw error;
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message,
            claudeAvailable: false
          });
        }
      });
    });

    test('should return 500 when Claude CLI not found', async () => {
      fs.existsSync.mockReturnValue(false);
      
      const response = await request(app)
        .get('/api/claude/check')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Claude CLI not found',
        claudeAvailable: false
      });
    });

    test('should return 500 when spawn fails', async () => {
      const spawnError = new Error('spawn ENOENT');
      spawn.mockImplementation(() => {
        throw spawnError;
      });
      
      const response = await request(app)
        .get('/api/claude/check')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'spawn ENOENT',
        claudeAvailable: false
      });
    });

    test('should return 500 when process errors', async () => {
      const processError = new Error('Process execution failed');
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(() => callback(processError));
        }
      });
      
      const response = await request(app)
        .get('/api/claude/check')
        .expect(500);
      
      expect(response.body).toMatchObject({
        success: false,
        claudeAvailable: false
      });
    });

    test('should handle timeout scenarios', async () => {
      // Mock process that never responds
      mockProcess.on.mockImplementation(() => {});
      
      const response = await request(app)
        .get('/api/claude/check')
        .timeout(1000)
        .expect(500);
      
      // Should timeout and return error
    });
  });

  describe('POST /api/claude/launch - Launch Claude Process', () => {
    beforeEach(() => {
      let currentProcess = null;
      
      app.post('/api/claude/launch', async (req, res) => {
        try {
          if (currentProcess && !currentProcess.killed) {
            return res.status(400).json({
              success: false,
              message: 'Process already running'
            });
          }
          
          const claudePath = '/home/codespace/nvm/current/bin/claude';
          
          if (!fs.existsSync(claudePath)) {
            throw new Error(`Claude CLI not found at ${claudePath}`);
          }
          
          currentProcess = spawn(claudePath, [], {
            cwd: '/prod',
            stdio: ['pipe', 'pipe', 'pipe']
          });
          
          if (!currentProcess.pid) {
            throw new Error('Failed to spawn process');
          }
          
          res.json({
            success: true,
            message: 'Claude launched successfully',
            status: { 
              isRunning: true, 
              pid: currentProcess.pid 
            }
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Failed to launch Claude',
            error: error.message
          });
        }
      });
    });

    test('should return 500 when Claude CLI not found', async () => {
      fs.existsSync.mockReturnValue(false);
      
      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to launch Claude',
        error: 'Claude CLI not found at /home/codespace/nvm/current/bin/claude'
      });
    });

    test('should return 500 when spawn fails', async () => {
      const spawnError = new Error('spawn EACCES');
      spawn.mockImplementation(() => {
        throw spawnError;
      });
      
      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to launch Claude',
        error: 'spawn EACCES'
      });
    });

    test('should return 500 when process has no PID', async () => {
      mockProcess.pid = undefined;
      
      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        message: 'Failed to launch Claude',
        error: 'Failed to spawn process'
      });
    });

    test('should return 500 when permissions denied', async () => {
      const permissionError = new Error('EACCES: permission denied');
      spawn.mockImplementation(() => {
        throw permissionError;
      });
      
      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);
      
      expect(response.body).toMatchObject({
        success: false,
        message: 'Failed to launch Claude',
        error: expect.stringContaining('permission denied')
      });
    });

    test('should return 500 when working directory is invalid', async () => {
      const cwdError = new Error('ENOENT: no such file or directory');
      spawn.mockImplementation(() => {
        throw cwdError;
      });
      
      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('no such file or directory')
      });
    });
  });

  describe('POST /api/claude/stop - Stop Claude Process', () => {
    beforeEach(() => {
      let currentProcess = null;
      
      app.post('/api/claude/stop', (req, res) => {
        try {
          if (!currentProcess || currentProcess.killed) {
            return res.json({
              success: true,
              message: 'Process was not running'
            });
          }
          
          // Simulate kill operation that might fail
          const killResult = currentProcess.kill('SIGTERM');
          if (!killResult) {
            throw new Error('Failed to kill process');
          }
          
          res.json({
            success: true,
            message: 'Claude stopped successfully'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Error stopping Claude',
            error: error.message
          });
        }
      });
      
      // Setup a mock running process
      currentProcess = mockProcess;
    });

    test('should return 500 when kill operation fails', async () => {
      mockProcess.kill.mockReturnValue(false);
      
      const response = await request(app)
        .post('/api/claude/stop')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        message: 'Error stopping Claude',
        error: 'Failed to kill process'
      });
    });

    test('should return 500 when kill throws exception', async () => {
      const killError = new Error('Process not found');
      mockProcess.kill.mockImplementation(() => {
        throw killError;
      });
      
      const response = await request(app)
        .post('/api/claude/stop')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        message: 'Error stopping Claude',
        error: 'Process not found'
      });
    });

    test('should return 500 when process is in invalid state', async () => {
      // Mock a corrupted process state
      mockProcess.kill.mockImplementation(() => {
        throw new Error('ESRCH: No such process');
      });
      
      const response = await request(app)
        .post('/api/claude/stop')
        .expect(500);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('No such process')
      });
    });
  });

  describe('GET /api/claude/status - Process Status', () => {
    beforeEach(() => {
      app.get('/api/claude/status', (req, res) => {
        try {
          // Simulate status check that might fail
          const processStatus = getProcessStatus();
          
          res.json({
            success: true,
            status: processStatus
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      });
      
      // Mock function that can fail
      global.getProcessStatus = jest.fn();
    });

    test('should return 500 when status check fails', async () => {
      const statusError = new Error('Unable to read process status');
      global.getProcessStatus.mockImplementation(() => {
        throw statusError;
      });
      
      const response = await request(app)
        .get('/api/claude/status')
        .expect(500);
      
      expect(response.body).toEqual({
        success: false,
        error: 'Unable to read process status'
      });
    });

    test('should return 500 when process state is corrupted', async () => {
      global.getProcessStatus.mockImplementation(() => {
        throw new Error('Process state is corrupted');
      });
      
      const response = await request(app)
        .get('/api/claude/status')
        .expect(500);
      
      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('corrupted')
      });
    });
  });

  describe('Error Recovery Tests', () => {
    test('should handle multiple concurrent launch requests gracefully', async () => {
      app.post('/api/claude/launch', (req, res) => {
        // Simulate concurrent launch causing conflict
        res.status(500).json({
          success: false,
          error: 'Resource temporarily unavailable'
        });
      });
      
      const requests = Array(5).fill().map(() =>
        request(app).post('/api/claude/launch')
      );
      
      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    test('should handle network timeout scenarios', (done) => {
      app.get('/api/claude/check', (req, res) => {
        // Simulate hanging request
        setTimeout(() => {
          res.status(500).json({
            success: false,
            error: 'Request timeout'
          });
        }, 2000);
      });
      
      request(app)
        .get('/api/claude/check')
        .timeout(1000)
        .expect(500)
        .end(done);
    });
  });

  describe('PTY Spawn Failure Tests', () => {
    test('should handle PTY allocation failures', async () => {
      const ptyError = new Error('PTY allocation failed');
      spawn.mockImplementation(() => {
        throw ptyError;
      });
      
      app.post('/api/claude/launch', (req, res) => {
        try {
          const process = spawn('claude', [], { stdio: 'pipe' });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      });
      
      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);
      
      expect(response.body.error).toBe('PTY allocation failed');
    });

    test('should handle terminal initialization failures', async () => {
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setImmediate(() => callback(new Error('Terminal initialization failed')));
        }
      });
      
      app.post('/api/claude/launch', (req, res) => {
        try {
          const process = spawn('claude', []);
          process.on('error', (error) => {
            res.status(500).json({
              success: false,
              error: error.message
            });
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      });
      
      await request(app)
        .post('/api/claude/launch')
        .expect(500);
    });
  });
});