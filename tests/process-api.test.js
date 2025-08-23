/**
 * Process API Endpoints Tests - London School TDD
 * 
 * Focus: Mock-driven testing for HTTP API endpoints
 * Behavior verification for Express routes and middleware
 * Outside-in approach testing HTTP request/response flows
 */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock ProcessManager before importing routes
const mockProcessManager = {
  getProcessInfo: jest.fn(),
  launchInstance: jest.fn(),
  killInstance: jest.fn(),
  restartInstance: jest.fn(),
  updateConfig: jest.fn(),
  cleanup: jest.fn()
};

// Mock the ProcessManager module
jest.mock('../src/services/ProcessManager', () => ({
  processManager: mockProcessManager,
  ProcessManager: jest.fn().mockImplementation(() => mockProcessManager)
}));

describe('Process API Routes - London School TDD', () => {
  let app;
  let server;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Import and mount routes after mocks are set
    const { default: processRoutes } = await import('../src/api/routes/processManager');
    app.use('/api/process', processRoutes);
    
    // Error handling middleware
    app.use((error, req, res, next) => {
      res.status(500).json({ success: false, error: error.message });
    });
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('GET /api/process/info - Process Info Retrieval', () => {
    it('should return current process information when available', async () => {
      // Arrange
      const mockProcessInfo = {
        pid: 1234,
        name: 'Test Claude Instance',
        status: 'running',
        startTime: new Date('2024-01-01T10:00:00Z'),
        autoRestartEnabled: false,
        autoRestartHours: 6
      };
      
      mockProcessManager.getProcessInfo.mockReturnValue(mockProcessInfo);
      
      // Act
      const response = await request(app)
        .get('/api/process/info')
        .expect(200);
      
      // Assert - Verify collaboration with ProcessManager
      expect(mockProcessManager.getProcessInfo).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        success: true,
        data: mockProcessInfo
      });
    });

    it('should handle ProcessManager errors gracefully', async () => {
      // Arrange
      const error = new Error('Process info retrieval failed');
      mockProcessManager.getProcessInfo.mockImplementation(() => {
        throw error;
      });
      
      // Act
      const response = await request(app)
        .get('/api/process/info')
        .expect(500);
      
      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Process info retrieval failed'
      });
    });

    it('should return null process info when no instance is running', async () => {
      // Arrange
      mockProcessManager.getProcessInfo.mockReturnValue({
        pid: null,
        name: '',
        status: 'stopped',
        startTime: null,
        autoRestartEnabled: false,
        autoRestartHours: 6
      });
      
      // Act
      const response = await request(app)
        .get('/api/process/info')
        .expect(200);
      
      // Assert
      expect(response.body.data.status).toBe('stopped');
      expect(response.body.data.pid).toBeNull();
    });
  });

  describe('POST /api/process/launch - Instance Launch', () => {
    it('should launch new instance with provided configuration', async () => {
      // Arrange
      const launchConfig = {
        workingDirectory: '/custom/work/dir',
        environment: 'production',
        autoRestartHours: 8
      };
      
      const mockLaunchedInfo = {
        pid: 5678,
        name: 'New Claude Instance',
        status: 'running',
        startTime: new Date(),
        autoRestartEnabled: true,
        autoRestartHours: 8
      };
      
      mockProcessManager.launchInstance.mockResolvedValue(mockLaunchedInfo);
      
      // Act
      const response = await request(app)
        .post('/api/process/launch')
        .send(launchConfig)
        .expect(200);
      
      // Assert - Verify collaboration with ProcessManager
      expect(mockProcessManager.launchInstance).toHaveBeenCalledWith(launchConfig);
      expect(response.body).toEqual({
        success: true,
        data: mockLaunchedInfo
      });
    });

    it('should handle launch failures with appropriate error response', async () => {
      // Arrange
      const launchConfig = { environment: 'development' };
      const launchError = new Error('Failed to spawn Claude process');
      
      mockProcessManager.launchInstance.mockRejectedValue(launchError);
      
      // Act
      const response = await request(app)
        .post('/api/process/launch')
        .send(launchConfig)
        .expect(500);
      
      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to spawn Claude process'
      });
    });

    it('should launch with default configuration when no body provided', async () => {
      // Arrange
      const mockDefaultLaunch = {
        pid: 9999,
        name: 'Default Claude Instance',
        status: 'running',
        startTime: new Date(),
        autoRestartEnabled: false,
        autoRestartHours: 6
      };
      
      mockProcessManager.launchInstance.mockResolvedValue(mockDefaultLaunch);
      
      // Act
      const response = await request(app)
        .post('/api/process/launch')
        .send({}) // Empty configuration
        .expect(200);
      
      // Assert
      expect(mockProcessManager.launchInstance).toHaveBeenCalledWith({});
      expect(response.body.data).toEqual(mockDefaultLaunch);
    });

    it('should validate and handle malformed configuration data', async () => {
      // Arrange - Mock ProcessManager to validate config
      mockProcessManager.launchInstance.mockImplementation((config) => {
        if (config.autoRestartHours && config.autoRestartHours < 0) {
          throw new Error('Invalid autoRestartHours value');
        }
        return Promise.resolve({ pid: 1111, status: 'running' });
      });
      
      // Act
      const response = await request(app)
        .post('/api/process/launch')
        .send({ autoRestartHours: -1 })
        .expect(500);
      
      // Assert
      expect(response.body.error).toBe('Invalid autoRestartHours value');
    });
  });

  describe('POST /api/process/kill - Instance Termination', () => {
    it('should kill current instance successfully', async () => {
      // Arrange
      mockProcessManager.killInstance.mockResolvedValue(undefined);
      
      // Act
      const response = await request(app)
        .post('/api/process/kill')
        .expect(200);
      
      // Assert
      expect(mockProcessManager.killInstance).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        success: true,
        message: 'Instance killed'
      });
    });

    it('should handle kill failures when no instance is running', async () => {
      // Arrange
      const killError = new Error('No running instance to kill');
      mockProcessManager.killInstance.mockRejectedValue(killError);
      
      // Act
      const response = await request(app)
        .post('/api/process/kill')
        .expect(500);
      
      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'No running instance to kill'
      });
    });

    it('should handle process kill timeout scenarios', async () => {
      // Arrange
      const timeoutError = new Error('Process kill timeout after 5 seconds');
      mockProcessManager.killInstance.mockRejectedValue(timeoutError);
      
      // Act
      const response = await request(app)
        .post('/api/process/kill')
        .expect(500);
      
      // Assert
      expect(response.body.error).toBe('Process kill timeout after 5 seconds');
    });
  });

  describe('POST /api/process/restart - Instance Restart', () => {
    it('should restart instance and return new process information', async () => {
      // Arrange
      const mockRestartedInfo = {
        pid: 7777,
        name: 'Restarted Claude Instance',
        status: 'running',
        startTime: new Date(),
        autoRestartEnabled: true,
        autoRestartHours: 4
      };
      
      mockProcessManager.restartInstance.mockResolvedValue(mockRestartedInfo);
      
      // Act
      const response = await request(app)
        .post('/api/process/restart')
        .expect(200);
      
      // Assert
      expect(mockProcessManager.restartInstance).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        success: true,
        data: mockRestartedInfo
      });
    });

    it('should handle restart failures during kill phase', async () => {
      // Arrange
      const restartError = new Error('Failed to kill existing process during restart');
      mockProcessManager.restartInstance.mockRejectedValue(restartError);
      
      // Act
      const response = await request(app)
        .post('/api/process/restart')
        .expect(500);
      
      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to kill existing process during restart'
      });
    });

    it('should handle restart failures during launch phase', async () => {
      // Arrange
      const restartError = new Error('Failed to launch new process during restart');
      mockProcessManager.restartInstance.mockRejectedValue(restartError);
      
      // Act
      const response = await request(app)
        .post('/api/process/restart')
        .expect(500);
      
      // Assert
      expect(response.body.error).toBe('Failed to launch new process during restart');
    });
  });

  describe('PUT /api/process/config - Configuration Update', () => {
    it('should update process configuration successfully', async () => {
      // Arrange
      const configUpdate = {
        autoRestartHours: 12,
        workingDirectory: '/updated/work/dir'
      };
      
      mockProcessManager.updateConfig.mockImplementation(() => {
        // Mock doesn't throw, indicating successful update
      });
      
      // Act
      const response = await request(app)
        .put('/api/process/config')
        .send(configUpdate)
        .expect(200);
      
      // Assert
      expect(mockProcessManager.updateConfig).toHaveBeenCalledWith(configUpdate);
      expect(response.body).toEqual({
        success: true,
        message: 'Configuration updated'
      });
    });

    it('should handle configuration update errors', async () => {
      // Arrange
      const configUpdate = { autoRestartHours: 'invalid' };
      const configError = new Error('Invalid configuration value');
      
      mockProcessManager.updateConfig.mockImplementation(() => {
        throw configError;
      });
      
      // Act
      const response = await request(app)
        .put('/api/process/config')
        .send(configUpdate)
        .expect(500);
      
      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid configuration value'
      });
    });

    it('should handle empty configuration updates', async () => {
      // Arrange
      mockProcessManager.updateConfig.mockImplementation(() => {
        // Mock accepts empty config
      });
      
      // Act
      const response = await request(app)
        .put('/api/process/config')
        .send({})
        .expect(200);
      
      // Assert
      expect(mockProcessManager.updateConfig).toHaveBeenCalledWith({});
      expect(response.body.success).toBe(true);
    });

    it('should validate configuration values before update', async () => {
      // Arrange
      const invalidConfig = {
        autoRestartHours: -5,
        workingDirectory: null
      };
      
      mockProcessManager.updateConfig.mockImplementation((config) => {
        if (config.autoRestartHours < 0) {
          throw new Error('autoRestartHours must be positive');
        }
        if (!config.workingDirectory) {
          throw new Error('workingDirectory cannot be null');
        }
      });
      
      // Act
      const response = await request(app)
        .put('/api/process/config')
        .send(invalidConfig)
        .expect(500);
      
      // Assert
      expect(response.body.error).toBe('autoRestartHours must be positive');
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle unexpected errors in route handlers', async () => {
      // Arrange
      mockProcessManager.getProcessInfo.mockImplementation(() => {
        throw new Error('Unexpected internal error');
      });
      
      // Act
      const response = await request(app)
        .get('/api/process/info')
        .expect(500);
      
      // Assert
      expect(response.body).toEqual({
        success: false,
        error: 'Unexpected internal error'
      });
    });

    it('should handle non-Error objects thrown from ProcessManager', async () => {
      // Arrange
      mockProcessManager.launchInstance.mockImplementation(() => {
        throw 'String error message';
      });
      
      // Act
      const response = await request(app)
        .post('/api/process/launch')
        .send({})
        .expect(500);
      
      // Assert
      expect(response.body.success).toBe(false);
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('Request Validation', () => {
    it('should handle malformed JSON in request body', async () => {
      // Act & Assert
      const response = await request(app)
        .post('/api/process/launch')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle requests with missing Content-Type header', async () => {
      // Act
      const response = await request(app)
        .put('/api/process/config')
        .send('some string data')
        .expect(500); // Will fail in ProcessManager due to invalid config
    });
  });

  describe('HTTP Method Validation', () => {
    it('should return 404 for unsupported HTTP methods', async () => {
      // Act & Assert
      await request(app)
        .delete('/api/process/info')
        .expect(404);
        
      await request(app)
        .patch('/api/process/launch')
        .expect(404);
    });

    it('should only accept POST for launch endpoint', async () => {
      // Act & Assert
      await request(app)
        .get('/api/process/launch')
        .expect(404);
        
      await request(app)
        .put('/api/process/launch')
        .expect(404);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous requests without race conditions', async () => {
      // Arrange
      mockProcessManager.getProcessInfo.mockReturnValue({
        pid: 1234,
        status: 'running'
      });
      
      // Act - Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/process/info')
      );
      
      const responses = await Promise.all(requests);
      
      // Assert
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
      
      expect(mockProcessManager.getProcessInfo).toHaveBeenCalledTimes(5);
    });
  });
});