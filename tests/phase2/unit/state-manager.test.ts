/**
 * StateManager Unit Tests
 * TDD London School - Mock-driven development
 * Tests FIRST, then implementation
 */

import { StateManager } from '../../../src/avi/state-manager';
import { AviState, AviStatus } from '../../../src/types/avi';
import { DatabaseManager } from '../../../src/types/database-manager';

// Mock database manager
const createMockDb = (): jest.Mocked<DatabaseManager> => ({
  query: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  getPool: jest.fn(),
});

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockDb = createMockDb();
    stateManager = new StateManager(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with database manager', () => {
      expect(stateManager).toBeDefined();
      expect(stateManager['db']).toBe(mockDb);
    });
  });

  describe('saveState', () => {
    it('should save state to avi_state table', async () => {
      const state: AviState = {
        status: AviStatus.RUNNING,
        startTime: new Date('2025-01-01T00:00:00Z'),
        contextSize: 2500,
        ticketsProcessed: 10,
        workersSpawned: 5,
        activeWorkers: 2,
      };

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.saveState(state);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO avi_state'),
        expect.arrayContaining([
          state.status,
          state.startTime,
          state.contextSize,
          state.ticketsProcessed,
          state.workersSpawned,
          state.activeWorkers,
        ])
      );
    });

    it('should use upsert pattern with ON CONFLICT', async () => {
      const state: AviState = {
        status: AviStatus.RUNNING,
        startTime: new Date(),
        contextSize: 1500,
        ticketsProcessed: 0,
        workersSpawned: 0,
        activeWorkers: 0,
      };

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.saveState(state);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });

    it('should handle database errors gracefully', async () => {
      const state: AviState = {
        status: AviStatus.RUNNING,
        startTime: new Date(),
        contextSize: 1500,
        ticketsProcessed: 0,
        workersSpawned: 0,
        activeWorkers: 0,
      };

      mockDb.query.mockRejectedValue(new Error('DB connection failed'));

      await expect(stateManager.saveState(state)).rejects.toThrow('DB connection failed');
    });

    it('should serialize complex state correctly', async () => {
      const state: AviState = {
        status: AviStatus.RESTARTING,
        startTime: new Date('2025-01-01T12:00:00Z'),
        contextSize: 45000,
        ticketsProcessed: 100,
        workersSpawned: 50,
        activeWorkers: 3,
        lastHealthCheck: new Date('2025-01-01T12:05:00Z'),
        lastError: 'Context bloat detected',
      };

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.saveState(state);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          AviStatus.RESTARTING,
          expect.any(Date),
          45000,
          100,
          50,
          3,
        ])
      );
    });
  });

  describe('loadState', () => {
    it('should load state from avi_state table', async () => {
      const mockRow = {
        status: AviStatus.RUNNING,
        start_time: new Date('2025-01-01T00:00:00Z'),
        context_size: 2500,
        tickets_processed: 10,
        workers_spawned: 5,
        active_workers: 2,
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const state = await stateManager.loadState();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([])
      );
      expect(state).toEqual({
        status: AviStatus.RUNNING,
        startTime: mockRow.start_time,
        contextSize: 2500,
        ticketsProcessed: 10,
        workersSpawned: 5,
        activeWorkers: 2,
      });
    });

    it('should return null when no state exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const state = await stateManager.loadState();

      expect(state).toBeNull();
    });

    it('should handle database errors during load', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection timeout'));

      await expect(stateManager.loadState()).rejects.toThrow('Connection timeout');
    });

    it('should parse optional fields correctly', async () => {
      const mockRow = {
        status: AviStatus.RUNNING,
        start_time: new Date(),
        context_size: 1500,
        tickets_processed: 0,
        workers_spawned: 0,
        active_workers: 0,
        last_health_check: new Date('2025-01-01T12:00:00Z'),
        last_error: 'Previous error',
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const state = await stateManager.loadState();

      expect(state).toMatchObject({
        lastHealthCheck: mockRow.last_health_check,
        lastError: 'Previous error',
      });
    });
  });

  describe('updateState', () => {
    it('should update partial state fields', async () => {
      const partialUpdate = {
        contextSize: 3000,
        activeWorkers: 4,
      };

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.updateState(partialUpdate);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE avi_state'),
        expect.arrayContaining([3000, 4])
      );
    });

    it('should only update provided fields', async () => {
      const partialUpdate = {
        status: AviStatus.RESTARTING,
      };

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.updateState(partialUpdate);

      const call = mockDb.query.mock.calls[0];
      expect(call[0]).toContain('UPDATE avi_state');
      expect(call[0]).toContain('status =');
      expect(call[0]).not.toContain('context_size');
    });

    it('should handle empty update object', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await stateManager.updateState({});

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should throw error if update fails', async () => {
      mockDb.query.mockRejectedValue(new Error('Update failed'));

      await expect(
        stateManager.updateState({ contextSize: 5000 })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getStateHistory', () => {
    it('should retrieve state history audit trail', async () => {
      const mockHistory = [
        {
          id: 1,
          status: AviStatus.RUNNING,
          context_size: 1500,
          created_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 2,
          status: AviStatus.RESTARTING,
          context_size: 52000,
          created_at: new Date('2025-01-01T01:00:00Z'),
        },
      ];

      mockDb.query.mockResolvedValue({ rows: mockHistory, rowCount: 2 });

      const history = await stateManager.getStateHistory(10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        expect.arrayContaining([10])
      );
      expect(history).toHaveLength(2);
    });

    it('should default to last 100 entries', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await stateManager.getStateHistory();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100])
      );
    });

    it('should return empty array when no history', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const history = await stateManager.getStateHistory();

      expect(history).toEqual([]);
    });
  });

  describe('recordRestart', () => {
    it('should record restart event in database', async () => {
      const reason = 'Context bloat > 50K tokens';

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.recordRestart(reason);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO avi_restarts'),
        expect.arrayContaining([reason, expect.any(Date)])
      );
    });

    it('should record restart without reason', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.recordRestart();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, expect.any(Date)])
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle save -> load roundtrip correctly', async () => {
      const originalState: AviState = {
        status: AviStatus.RUNNING,
        startTime: new Date('2025-01-01T00:00:00Z'),
        contextSize: 2500,
        ticketsProcessed: 10,
        workersSpawned: 5,
        activeWorkers: 2,
      };

      // Mock save
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      // Mock load with saved data
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            status: originalState.status,
            start_time: originalState.startTime,
            context_size: originalState.contextSize,
            tickets_processed: originalState.ticketsProcessed,
            workers_spawned: originalState.workersSpawned,
            active_workers: originalState.activeWorkers,
          },
        ],
        rowCount: 1,
      });

      await stateManager.saveState(originalState);
      const loadedState = await stateManager.loadState();

      expect(loadedState).toEqual(originalState);
    });

    it('should track state evolution through multiple updates', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 });

      await stateManager.updateState({ contextSize: 1500 });
      await stateManager.updateState({ activeWorkers: 1 });
      await stateManager.updateState({ ticketsProcessed: 1 });

      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });
  });
});
