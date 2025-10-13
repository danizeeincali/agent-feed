/**
 * AviDatabaseAdapter Unit Tests (London School TDD)
 * Tests the state persistence adapter for orchestrator
 *
 * Focus: State transformation, contract compliance, data integrity
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { AviState } from '../../../src/types/avi';

describe('AviDatabaseAdapter - Unit Tests (London School TDD)', () => {
  let mockRepository: any;
  let adapter: any;

  beforeEach(() => {
    // Mock avi-state repository
    mockRepository = {
      getState: jest.fn(),
      updateState: jest.fn(),
      initialize: jest.fn(),
    };
  });

  describe('Contract: saveState()', () => {
    it('should persist orchestrator state to repository', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      const state: AviState = {
        status: 'running',
        startTime: new Date('2025-10-12T10:00:00Z'),
        ticketsProcessed: 42,
        workersSpawned: 38,
        activeWorkers: 3,
        lastHealthCheck: new Date('2025-10-12T12:00:00Z'),
        lastError: undefined,
      };

      // ACT
      await adapter.saveState(state);

      // ASSERT - Verify interaction with repository
      expect(mockRepository.updateState).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateState).toHaveBeenCalledWith({
        status: 'running',
        start_time: state.startTime,
        tickets_processed: 42,
        workers_spawned: 38,
        active_workers: 3,
        last_health_check: state.lastHealthCheck,
        last_error: null,
      });
    });

    it('should transform TypeScript camelCase to database snake_case', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      const state: AviState = {
        status: 'running',
        startTime: new Date('2025-10-12T10:00:00Z'),
        ticketsProcessed: 100,
        workersSpawned: 95,
        activeWorkers: 5,
      };

      // ACT
      await adapter.saveState(state);

      // ASSERT - Verify snake_case transformation
      const call = mockRepository.updateState.mock.calls[0][0];
      expect(call).toHaveProperty('tickets_processed', 100);
      expect(call).toHaveProperty('workers_spawned', 95);
      expect(call).toHaveProperty('active_workers', 5);
      expect(call).toHaveProperty('start_time');
      expect(call).not.toHaveProperty('ticketsProcessed');
      expect(call).not.toHaveProperty('workersSpawned');
    });

    it('should handle optional fields correctly', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      const stateWithoutOptionals: AviState = {
        status: 'initializing',
        startTime: new Date(),
        ticketsProcessed: 0,
        workersSpawned: 0,
        activeWorkers: 0,
        // No lastHealthCheck or lastError
      };

      // ACT
      await adapter.saveState(stateWithoutOptionals);

      // ASSERT - Optional fields should be null
      const call = mockRepository.updateState.mock.calls[0][0];
      expect(call.last_health_check).toBeNull();
      expect(call.last_error).toBeNull();
    });

    it('should persist error messages', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      const stateWithError: AviState = {
        status: 'running',
        startTime: new Date(),
        ticketsProcessed: 10,
        workersSpawned: 10,
        activeWorkers: 0,
        lastError: 'Database connection timeout',
      };

      // ACT
      await adapter.saveState(stateWithError);

      // ASSERT
      const call = mockRepository.updateState.mock.calls[0][0];
      expect(call.last_error).toBe('Database connection timeout');
    });

    it('should propagate repository errors', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      const dbError = new Error('Database write failed');
      mockRepository.updateState.mockRejectedValue(dbError);

      adapter = new AviDatabaseAdapter(mockRepository);

      const state: AviState = {
        status: 'running',
        startTime: new Date(),
        ticketsProcessed: 1,
        workersSpawned: 1,
        activeWorkers: 1,
      };

      // ACT & ASSERT
      await expect(adapter.saveState(state)).rejects.toThrow('Database write failed');
    });
  });

  describe('Contract: loadState()', () => {
    it('should load orchestrator state from repository', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      const mockDbState = {
        status: 'stopped',
        start_time: '2025-10-12T08:00:00.000Z',
        tickets_processed: 150,
        workers_spawned: 145,
        active_workers: 0,
        last_health_check: '2025-10-12T09:30:00.000Z',
        last_error: 'Graceful shutdown',
      };

      mockRepository.getState.mockResolvedValue(mockDbState);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      const state = await adapter.loadState();

      // ASSERT - Verify transformation to TypeScript types
      expect(state).toMatchObject({
        status: 'stopped',
        ticketsProcessed: 150,
        workersSpawned: 145,
        activeWorkers: 0,
        lastError: 'Graceful shutdown',
      });

      expect(state?.startTime).toBeInstanceOf(Date);
      expect(state?.lastHealthCheck).toBeInstanceOf(Date);
    });

    it('should transform database snake_case to TypeScript camelCase', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      const mockDbState = {
        status: 'running',
        start_time: '2025-10-12T10:00:00.000Z',
        tickets_processed: 50,
        workers_spawned: 48,
        active_workers: 2,
        last_health_check: null,
        last_error: null,
      };

      mockRepository.getState.mockResolvedValue(mockDbState);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      const state = await adapter.loadState();

      // ASSERT - Verify camelCase properties
      expect(state).toHaveProperty('ticketsProcessed', 50);
      expect(state).toHaveProperty('workersSpawned', 48);
      expect(state).toHaveProperty('activeWorkers', 2);
      expect(state).not.toHaveProperty('tickets_processed');
      expect(state).not.toHaveProperty('workers_spawned');
    });

    it('should return null if no state exists', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.getState.mockResolvedValue(null);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      const state = await adapter.loadState();

      // ASSERT
      expect(state).toBeNull();
      expect(mockRepository.getState).toHaveBeenCalledTimes(1);
    });

    it('should handle optional fields when missing from database', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      const minimalDbState = {
        status: 'running',
        start_time: '2025-10-12T10:00:00.000Z',
        tickets_processed: 0,
        workers_spawned: 0,
        active_workers: 0,
        last_health_check: null,
        last_error: null,
      };

      mockRepository.getState.mockResolvedValue(minimalDbState);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      const state = await adapter.loadState();

      // ASSERT - Optional fields should be undefined
      expect(state?.lastHealthCheck).toBeUndefined();
      expect(state?.lastError).toBeUndefined();
    });

    it('should provide defaults for missing required fields', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      const incompleteDbState = {
        status: null,
        start_time: null,
        tickets_processed: null,
        workers_spawned: null,
        active_workers: null,
      };

      mockRepository.getState.mockResolvedValue(incompleteDbState);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      const state = await adapter.loadState();

      // ASSERT - Should provide sensible defaults
      expect(state?.status).toBe('initializing');
      expect(state?.startTime).toBeInstanceOf(Date);
      expect(state?.ticketsProcessed).toBe(0);
      expect(state?.workersSpawned).toBe(0);
      expect(state?.activeWorkers).toBe(0);
    });
  });

  describe('Contract: updateMetrics()', () => {
    it('should update specific metrics without full state', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT - Update only ticketsProcessed
      await adapter.updateMetrics({ ticketsProcessed: 100 });

      // ASSERT
      expect(mockRepository.updateState).toHaveBeenCalledWith({
        tickets_processed: 100,
      });
    });

    it('should update only workersSpawned metric', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      await adapter.updateMetrics({ workersSpawned: 50 });

      // ASSERT
      expect(mockRepository.updateState).toHaveBeenCalledWith({
        workers_spawned: 50,
      });
    });

    it('should update multiple metrics simultaneously', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      await adapter.updateMetrics({
        ticketsProcessed: 75,
        workersSpawned: 70,
      });

      // ASSERT
      expect(mockRepository.updateState).toHaveBeenCalledWith({
        tickets_processed: 75,
        workers_spawned: 70,
      });
    });

    it('should ignore undefined metrics', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT - Only ticketsProcessed is defined
      await adapter.updateMetrics({
        ticketsProcessed: 10,
        workersSpawned: undefined,
      });

      // ASSERT - Should only update defined metrics
      const call = mockRepository.updateState.mock.calls[0][0];
      expect(call).toHaveProperty('tickets_processed', 10);
      expect(call).not.toHaveProperty('workers_spawned');
    });

    it('should handle empty metrics object', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT
      await adapter.updateMetrics({});

      // ASSERT - Should still call updateState (with empty object)
      expect(mockRepository.updateState).toHaveBeenCalledWith({});
    });
  });

  describe('Collaboration Patterns', () => {
    it('should use same repository across all methods', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.getState.mockResolvedValue(null);
      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT - Execute multiple operations
      await adapter.loadState();
      await adapter.saveState({
        status: 'running',
        startTime: new Date(),
        ticketsProcessed: 0,
        workersSpawned: 0,
        activeWorkers: 0,
      });
      await adapter.updateMetrics({ ticketsProcessed: 1 });

      // ASSERT - All operations used same repository
      expect(mockRepository.getState).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateState).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve state through save-load cycle', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      const originalState: AviState = {
        status: 'running',
        startTime: new Date('2025-10-12T10:00:00Z'),
        ticketsProcessed: 25,
        workersSpawned: 23,
        activeWorkers: 2,
        lastHealthCheck: new Date('2025-10-12T11:00:00Z'),
        lastError: 'Test error',
      };

      // Mock save transforms to DB format
      mockRepository.updateState.mockImplementation(async (updates) => {
        // Simulate what database would return
        mockRepository.getState.mockResolvedValue({
          status: updates.status,
          start_time: updates.start_time.toISOString(),
          tickets_processed: updates.tickets_processed,
          workers_spawned: updates.workers_spawned,
          active_workers: updates.active_workers,
          last_health_check: updates.last_health_check.toISOString(),
          last_error: updates.last_error,
        });
      });

      adapter = new AviDatabaseAdapter(mockRepository);

      // ACT - Save then load
      await adapter.saveState(originalState);
      const loadedState = await adapter.loadState();

      // ASSERT - Data should be preserved (within date precision)
      expect(loadedState?.status).toBe(originalState.status);
      expect(loadedState?.ticketsProcessed).toBe(originalState.ticketsProcessed);
      expect(loadedState?.workersSpawned).toBe(originalState.workersSpawned);
      expect(loadedState?.activeWorkers).toBe(originalState.activeWorkers);
      expect(loadedState?.lastError).toBe(originalState.lastError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large metric values', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      const largeMetrics = {
        ticketsProcessed: 999999999,
        workersSpawned: 999999998,
      };

      // ACT
      await adapter.updateMetrics(largeMetrics);

      // ASSERT
      expect(mockRepository.updateState).toHaveBeenCalledWith({
        tickets_processed: 999999999,
        workers_spawned: 999999998,
      });
    });

    it('should handle all status values', async () => {
      const AviDatabaseAdapter = await import('../../../api-server/avi/adapters/avi-database.adapter.js')
        .then(m => m.AviDatabaseAdapter)
        .catch(() => {
          throw new Error('AviDatabaseAdapter not implemented yet');
        });

      mockRepository.updateState.mockResolvedValue(undefined);

      adapter = new AviDatabaseAdapter(mockRepository);

      const statuses: Array<'initializing' | 'running' | 'restarting' | 'stopped'> = [
        'initializing',
        'running',
        'restarting',
        'stopped',
      ];

      // ACT & ASSERT - All status values should be valid
      for (const status of statuses) {
        await expect(
          adapter.saveState({
            status,
            startTime: new Date(),
            ticketsProcessed: 0,
            workersSpawned: 0,
            activeWorkers: 0,
          })
        ).resolves.not.toThrow();
      }
    });
  });
});
