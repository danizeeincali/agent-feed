/**
 * Enhanced Health Monitor Unit Tests
 * TDD London School: Comprehensive coverage with database and worker health
 *
 * Test Coverage:
 * - Avi context health monitoring
 * - Database connection health
 * - Worker pool health
 * - System metrics collection
 * - Event emission
 * - Graceful restart triggers
 */

import { HealthMonitor } from '../../../src/avi/health-monitor';
import type { DatabaseManager } from '../../../src/types/database-manager';
import type {
  HealthStatus,
  HealthConfig,
  HealthMetrics,
  DatabaseHealth,
  WorkerHealth,
  SystemHealth,
  RestartReason,
} from '../../../src/types/health';

describe('HealthMonitor - Enhanced TDD London School', () => {
  // Mock dependencies
  let mockDatabase: jest.Mocked<DatabaseManager>;
  let mockTokenCounter: jest.Mock;
  let healthMonitor: HealthMonitor;
  let defaultConfig: HealthConfig;

  beforeEach(() => {
    // Mock database manager
    mockDatabase = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(),
    } as any;

    // Mock Anthropic token counter
    mockTokenCounter = jest.fn().mockReturnValue(1000);

    // Default configuration
    defaultConfig = {
      maxContextTokens: 50000,
      checkInterval: 30000,
      restartThreshold: 0.9,
    };

    jest.useFakeTimers();
  });

  afterEach(() => {
    if (healthMonitor) {
      healthMonitor.stop();
    }
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Database Health Checks', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should verify database connection with simple query', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [{ result: 1 }], rowCount: 1 });

      const result = await healthMonitor.checkDatabaseHealth();

      expect(mockDatabase.query).toHaveBeenCalledWith('SELECT 1 as result');
      expect(result).toEqual({
        connected: true,
        responseTime: expect.any(Number),
      });
    });

    it('should detect database connection failure', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Connection refused'));

      const result = await healthMonitor.checkDatabaseHealth();

      expect(result).toEqual({
        connected: false,
        error: 'Connection refused',
      });
    });

    it('should measure database response time', async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockDatabase.query.mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ rows: [{ result: 1 }], rowCount: 1 }), 50)
        )
      );

      const result = await healthMonitor.checkDatabaseHealth();

      expect(result.connected).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(50);
      jest.useFakeTimers(); // Restore fake timers
    });

    it('should emit databaseConnectionLost event on failure', async () => {
      const mockListener = jest.fn();
      healthMonitor.on('databaseConnectionLost', mockListener);

      mockDatabase.query.mockRejectedValue(new Error('Connection lost'));

      await healthMonitor.checkDatabaseHealth();

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Connection lost',
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('Worker Health Checks', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should query active workers from database', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [{ count: '3' }],
        rowCount: 1,
      });

      const result = await healthMonitor.checkWorkerHealth();

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count')
      );
      expect(result).toEqual({
        healthy: true,
        activeWorkers: 3,
        maxWorkers: 10,
        utilization: 30,
      });
    });

    it('should detect worker count exceeding limit', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [{ count: '12' }],
        rowCount: 1,
      });

      const result = await healthMonitor.checkWorkerHealth(10);

      expect(result.healthy).toBe(false);
      expect(result.activeWorkers).toBe(12);
      expect(result.maxWorkers).toBe(10);
      expect(result.utilization).toBe(120);
    });

    it('should handle database errors when checking workers', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Database error'));

      const result = await healthMonitor.checkWorkerHealth();

      expect(result.healthy).toBe(true);
      expect(result.activeWorkers).toBe(0);
    });

    it('should calculate worker utilization percentage', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [{ count: '7' }],
        rowCount: 1,
      });

      const result = await healthMonitor.checkWorkerHealth(10);

      expect(result.utilization).toBe(70);
    });
  });

  describe('Comprehensive System Metrics', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should collect all system health metrics', async () => {
      // Mock successful database check
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ result: 1 }], rowCount: 1 }) // DB health
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 }); // Worker count

      mockTokenCounter.mockReturnValue(25000);

      const metrics = await healthMonitor.getSystemHealth();

      expect(metrics).toMatchObject({
        healthy: true,
        contextTokens: 25000,
        thresholdPercentage: 50,
        isNearThreshold: false,
        database: {
          connected: true,
          responseTime: expect.any(Number),
        },
        workers: {
          healthy: true,
          activeWorkers: 3,
          maxWorkers: 10,
          utilization: 30,
        },
      });
    });

    it('should mark system unhealthy if any component fails', async () => {
      mockDatabase.query
        .mockRejectedValueOnce(new Error('DB down')) // DB health fails
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 }); // Workers OK

      mockTokenCounter.mockReturnValue(30000);

      const metrics = await healthMonitor.getSystemHealth();

      expect(metrics.healthy).toBe(false);
      expect(metrics.database.connected).toBe(false);
    });

    it('should include threshold percentage in metrics', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ result: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      mockTokenCounter.mockReturnValue(47500); // 95% of 50000

      const metrics = await healthMonitor.getSystemHealth();

      expect(metrics.thresholdPercentage).toBe(95);
      expect(metrics.isNearThreshold).toBe(true);
    });
  });

  describe('Restart Decision Logic', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should determine restart for context bloat', () => {
      const status: HealthMetrics = {
        healthy: false,
        contextTokens: 55000,
        uptime: 0,
        lastCheck: new Date(),
        warnings: ['Context bloat'],
        thresholdPercentage: 110,
        isNearThreshold: true,
      };

      const reason = healthMonitor.getRestartReason(status);

      expect(reason).toEqual({
        shouldRestart: true,
        reason: 'context_bloat',
        details: expect.stringContaining('55000 tokens exceeds maximum 50000'),
      });
    });

    it('should not restart when healthy', () => {
      const status: HealthMetrics = {
        healthy: true,
        contextTokens: 30000,
        uptime: 0,
        lastCheck: new Date(),
        warnings: [],
        thresholdPercentage: 60,
        isNearThreshold: false,
      };

      const reason = healthMonitor.getRestartReason(status);

      expect(reason).toEqual({
        shouldRestart: false,
        reason: 'none',
        details: 'System is healthy',
      });
    });

    it('should determine restart at exact threshold', () => {
      const status: HealthMetrics = {
        healthy: false,
        contextTokens: 45000, // Exactly 90%
        uptime: 0,
        lastCheck: new Date(),
        warnings: ['At threshold'],
        thresholdPercentage: 90,
        isNearThreshold: true,
      };

      const reason = healthMonitor.getRestartReason(status);

      expect(reason.shouldRestart).toBe(true);
      expect(reason.reason).toBe('context_bloat');
    });
  });

  describe('Event-Driven Monitoring', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should emit healthStatusChanged on status transitions', async () => {
      const mockListener = jest.fn();
      healthMonitor.on('healthStatusChanged', mockListener);

      // First check: healthy
      mockTokenCounter.mockReturnValue(30000);
      healthMonitor.checkHealth();

      // Second check: unhealthy
      mockTokenCounter.mockReturnValue(55000);
      healthMonitor.checkHealth();

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          healthy: false,
          contextTokens: 55000,
        })
      );
    });

    it('should emit restartRequired event with details', async () => {
      const mockListener = jest.fn();
      healthMonitor.on('restartRequired', mockListener);

      mockTokenCounter.mockReturnValue(52000);

      healthMonitor.checkHealth();

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'context_bloat',
          contextTokens: 52000,
          threshold: 50000,
        })
      );
    });

    it('should emit workerOverload event when workers exceed limit', async () => {
      const mockListener = jest.fn();
      healthMonitor.on('workerOverload', mockListener);

      mockDatabase.query.mockResolvedValue({
        rows: [{ count: '15' }],
        rowCount: 1,
      });

      await healthMonitor.checkWorkerHealth(10);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          activeWorkers: 15,
          maxWorkers: 10,
        })
      );
    });
  });

  describe('Anthropic Token Counting Integration', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should use provided token counter for Avi context', () => {
      const mockAviContext = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      };

      mockTokenCounter.mockReturnValue(2500);

      const status = healthMonitor.checkHealth();

      expect(mockTokenCounter).toHaveBeenCalled();
      expect(status.contextTokens).toBe(2500);
    });

    it('should handle token counter throwing errors', () => {
      mockTokenCounter.mockImplementation(() => {
        throw new Error('Anthropic SDK error');
      });

      const status = healthMonitor.checkHealth();

      expect(status.healthy).toBe(true);
      expect(status.warnings[0]).toContain('Error checking health');
    });

    it('should detect negative token counts as errors', () => {
      mockTokenCounter.mockReturnValue(-100);

      const status = healthMonitor.checkHealth();

      expect(status.healthy).toBe(true);
      expect(status.warnings[0]).toContain('Error checking health');
    });
  });

  describe('Monitoring Lifecycle with Database Integration', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should perform full health check during monitoring', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ result: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      mockTokenCounter.mockReturnValue(30000);

      const checkHealthSpy = jest.spyOn(healthMonitor, 'checkHealth');
      const checkDbSpy = jest.spyOn(healthMonitor, 'checkDatabaseHealth');

      healthMonitor.start();

      jest.advanceTimersByTime(30000);

      expect(checkHealthSpy).toHaveBeenCalled();
      // Database check happens separately if needed
    });

    it('should stop all monitoring activities', async () => {
      healthMonitor.start();

      const intervalId = (healthMonitor as any).intervalId;
      expect(intervalId).toBeDefined();

      healthMonitor.stop();

      expect((healthMonitor as any).intervalId).toBeUndefined();
    });
  });

  describe('Performance and Resource Management', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should handle concurrent health checks safely', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [{ result: 1 }],
        rowCount: 1,
      });

      mockTokenCounter.mockReturnValue(30000);

      // Simulate concurrent checks
      const checks = await Promise.all([
        healthMonitor.checkHealth(),
        healthMonitor.checkDatabaseHealth(),
        healthMonitor.checkWorkerHealth(),
      ]);

      expect(checks).toHaveLength(3);
      checks.forEach((check) => expect(check).toBeDefined());
    });

    it('should not leak event listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      healthMonitor.on('healthStatusChanged', listener1);
      healthMonitor.on('restartRequired', listener2);
      healthMonitor.on('databaseConnectionLost', listener3);

      healthMonitor.removeListener('healthStatusChanged', listener1);
      healthMonitor.removeAllListeners('restartRequired');

      expect(healthMonitor.listenerCount('healthStatusChanged')).toBe(0);
      expect(healthMonitor.listenerCount('restartRequired')).toBe(0);
      expect(healthMonitor.listenerCount('databaseConnectionLost')).toBe(1);
    });

    it('should clean up database connections on stop', async () => {
      healthMonitor.start();
      await healthMonitor.checkDatabaseHealth();

      healthMonitor.stop();

      // Verify no pending operations
      expect((healthMonitor as any).intervalId).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should handle null database responses', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const workerHealth = await healthMonitor.checkWorkerHealth();

      expect(workerHealth.activeWorkers).toBe(0);
      expect(workerHealth.healthy).toBe(true);
    });

    it('should handle malformed database responses', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [{ count: 'invalid' }],
        rowCount: 1,
      });

      const workerHealth = await healthMonitor.checkWorkerHealth();

      expect(workerHealth.activeWorkers).toBe(0);
      expect(workerHealth.healthy).toBe(true);
    });

    it('should handle zero workers gracefully', async () => {
      mockDatabase.query.mockResolvedValue({
        rows: [{ count: '0' }],
        rowCount: 1,
      });

      const result = await healthMonitor.checkWorkerHealth();

      expect(result.activeWorkers).toBe(0);
      expect(result.utilization).toBe(0);
      expect(result.healthy).toBe(true);
    });

    it('should handle database timeout gracefully', async () => {
      jest.useRealTimers(); // Use real timers for this test
      mockDatabase.query.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 100)
        )
      );

      const result = await healthMonitor.checkDatabaseHealth();

      expect(result.connected).toBe(false);
      expect(result.error).toContain('Query timeout');
      jest.useFakeTimers(); // Restore fake timers
    });
  });

  describe('Integration with Orchestrator', () => {
    beforeEach(() => {
      healthMonitor = new HealthMonitor(defaultConfig, mockTokenCounter, mockDatabase);
    });

    it('should provide comprehensive status for orchestrator', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [{ result: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 });

      mockTokenCounter.mockReturnValue(40000);

      const systemHealth = await healthMonitor.getSystemHealth();

      // Verify orchestrator can access all needed fields
      expect(systemHealth).toHaveProperty('healthy');
      expect(systemHealth).toHaveProperty('contextTokens');
      expect(systemHealth).toHaveProperty('uptime');
      expect(systemHealth).toHaveProperty('database');
      expect(systemHealth).toHaveProperty('workers');
      expect(systemHealth).toHaveProperty('thresholdPercentage');
    });

    it('should support orchestrator graceful restart flow', async () => {
      const restartListener = jest.fn();
      healthMonitor.on('restartRequired', restartListener);

      mockTokenCounter.mockReturnValue(52000);

      healthMonitor.checkHealth();

      expect(restartListener).toHaveBeenCalled();
      expect(healthMonitor.shouldRestart()).toBe(true);
    });
  });
});
