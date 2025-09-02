/**
 * HTTPCommandService Tests
 * 
 * Unit tests for HTTP-based command service
 */

import { HTTPCommandService } from '../HTTPCommandService';

// Mock fetch
global.fetch = jest.fn();

describe('HTTPCommandService', () => {
  let service: HTTPCommandService;

  beforeEach(() => {
    service = new HTTPCommandService({
      baseUrl: 'http://test',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 100,
      maxRetryDelay: 1000
    });
    
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('sendCommand', () => {
    test('should send command successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, result: 'Command executed' })
      });

      const result = await service.sendCommand('test-instance', 'ls -la');

      expect(fetch).toHaveBeenCalledWith(
        'http://test/api/claude/instances/test-instance/terminal/input',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('ls -la\\n')
        })
      );
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Command executed');
    });

    test('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await service.sendCommand('test-instance', 'test');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    test('should retry on network failures', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      const result = await service.sendCommand('test-instance', 'test');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });
  });

  describe('createInstance', () => {
    test('should create instance successfully', async () => {
      const mockInstance = {
        id: 'claude-123',
        name: 'Test Instance',
        status: 'running',
        created: new Date().toISOString()
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          instance: mockInstance 
        })
      });

      const result = await service.createInstance({
        type: 'dev',
        command: 'claude'
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://test/api/claude/instances',
        expect.objectContaining({
          method: 'POST'
        })
      );
      
      expect(result.id).toBe('claude-123');
      expect(result.status).toBe('running');
    });

    test('should handle creation failures', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: false, 
          error: 'Creation failed' 
        })
      });

      await expect(service.createInstance({ type: 'dev' }))
        .rejects.toThrow('Creation failed');
    });
  });

  describe('terminateInstance', () => {
    test('should terminate instance successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await service.terminateInstance('test-instance');

      expect(fetch).toHaveBeenCalledWith(
        'http://test/api/claude/instances/test-instance',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('listInstances', () => {
    test('should list instances successfully', async () => {
      const mockInstances = [
        {
          id: 'claude-1',
          name: 'Instance 1',
          status: 'running',
          created: new Date().toISOString()
        },
        {
          id: 'claude-2',
          name: 'Instance 2',
          status: 'stopped',
          created: new Date().toISOString()
        }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          instances: mockInstances 
        })
      });

      const result = await service.listInstances();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('claude-1');
      expect(result[1].id).toBe('claude-2');
    });
  });

  describe('healthCheck', () => {
    test('should perform health check successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          healthy: true, 
          message: 'Service is healthy' 
        })
      });

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Service is healthy');
    });

    test('should handle health check failures', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Service unavailable');
    });
  });

  describe('Retry Logic', () => {
    test('should not retry on client errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      const result = await service.sendCommand('test-instance', 'test');

      expect(fetch).toHaveBeenCalledTimes(1); // No retries
      expect(result.success).toBe(false);
    });

    test('should retry on server errors', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      const result = await service.sendCommand('test-instance', 'test');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });

  describe('Request Timeout', () => {
    test('should timeout long requests', async () => {
      jest.useFakeTimers();

      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const commandPromise = service.sendCommand('test-instance', 'test');
      
      jest.advanceTimersByTime(6000);

      const result = await commandPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('aborted');

      jest.useRealTimers();
    });
  });
});