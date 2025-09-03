/**
 * London School TDD Database Mocks
 * Focus on interaction contracts rather than implementation details
 */

const { createMockDatabaseResult, createDatabaseError } = require('../fixtures/test-data');

// Mock PostgreSQL Pool with behavior verification
class MockPgPool {
  constructor() {
    this.totalCount = 10;
    this.idleCount = 8;
    this.waitingCount = 0;
    this.connect = jest.fn();
    this.query = jest.fn();
    this.end = jest.fn();
    
    // Track connection lifecycle for verification
    this.connectionHistory = [];
    this.queryHistory = [];
  }
  
  // Simulate successful connection
  mockSuccessfulConnection() {
    const mockClient = new MockPgClient();
    this.connect.mockResolvedValue(mockClient);
    this.connectionHistory.push({ type: 'connect', timestamp: Date.now(), client: mockClient });
    return mockClient;
  }
  
  // Simulate connection failure
  mockConnectionFailure(error = createDatabaseError()) {
    this.connect.mockRejectedValue(error);
    this.connectionHistory.push({ type: 'connect_failed', timestamp: Date.now(), error });
  }
  
  // Simulate pool exhaustion
  mockPoolExhaustion() {
    const poolError = new Error('Pool is exhausted');
    poolError.code = 'POOL_EXHAUSTED';
    this.connect.mockRejectedValue(poolError);
  }
  
  // Verify connection patterns
  verifyConnectionPattern(expectedPattern) {
    const actualPattern = this.connectionHistory.map(h => h.type);
    expect(actualPattern).toEqual(expectedPattern);
  }
  
  // Reset for clean test state
  reset() {
    this.connect.mockReset();
    this.query.mockReset();
    this.end.mockReset();
    this.connectionHistory = [];
    this.queryHistory = [];
  }
}

// Mock PostgreSQL Client with interaction tracking
class MockPgClient {
  constructor() {
    this.query = jest.fn();
    this.release = jest.fn();
    this.queryCount = 0;
    this.transactionState = 'idle'; // idle, active, error
  }
  
  // Mock successful query execution
  mockQuerySuccess(rows = [], command = 'SELECT') {
    const result = createMockDatabaseResult(rows, { command });
    this.query.mockResolvedValue(result);
    this.queryCount++;
    return result;
  }
  
  // Mock query failure
  mockQueryFailure(error = createDatabaseError()) {
    this.query.mockRejectedValue(error);
    this.queryCount++;
  }
  
  // Mock transaction BEGIN
  mockTransactionBegin() {
    this.transactionState = 'active';
    this.query.mockResolvedValueOnce(createMockDatabaseResult([], { command: 'BEGIN' }));
  }
  
  // Mock transaction COMMIT
  mockTransactionCommit() {
    this.transactionState = 'idle';
    this.query.mockResolvedValueOnce(createMockDatabaseResult([], { command: 'COMMIT' }));
  }
  
  // Mock transaction ROLLBACK
  mockTransactionRollback() {
    this.transactionState = 'idle';
    this.query.mockResolvedValueOnce(createMockDatabaseResult([], { command: 'ROLLBACK' }));
  }
  
  // Verify transaction sequence
  verifyTransactionSequence() {
    const calls = this.query.mock.calls;
    expect(calls[0][0]).toBe('BEGIN');
    expect(calls[calls.length - 1][0]).toMatch(/^(COMMIT|ROLLBACK)$/);
  }
  
  // Verify query parameters
  verifyQueryParameters(expectedQuery, expectedParams = []) {
    expect(this.query).toHaveBeenCalledWith(expectedQuery, expectedParams);
  }
  
  // Verify client was properly released
  verifyRelease() {
    expect(this.release).toHaveBeenCalledTimes(1);
  }
}

// Mock Database Adapter with behavior tracking
class MockDatabaseAdapter {
  constructor() {
    this.pool = new MockPgPool();
    this.connect = jest.fn();
    this.query = jest.fn();
    this.transaction = jest.fn();
    this.disconnect = jest.fn();
    
    // Behavior tracking
    this.connectionAttempts = 0;
    this.activeTransactions = 0;
    this.totalQueries = 0;
  }
  
  // Mock successful database operations
  mockSuccess() {
    const client = this.pool.mockSuccessfulConnection();
    this.connect.mockResolvedValue(client);
    
    this.query.mockImplementation((sql, params) => {
      this.totalQueries++;
      return client.query(sql, params);
    });
    
    this.transaction.mockImplementation(async (callback) => {
      this.activeTransactions++;
      try {
        client.mockTransactionBegin();
        const result = await callback(client);
        client.mockTransactionCommit();
        return result;
      } catch (error) {
        client.mockTransactionRollback();
        throw error;
      } finally {
        this.activeTransactions--;
        client.release();
      }
    });
  }
  
  // Mock connection failures
  mockConnectionFailure() {
    this.pool.mockConnectionFailure();
    this.connect.mockRejectedValue(new Error('Connection failed'));
  }
  
  // Verify connection management
  verifyConnectionManagement() {
    expect(this.connectionAttempts).toBeGreaterThan(0);
    expect(this.activeTransactions).toBe(0); // All transactions should be closed
  }
  
  // Verify query patterns
  verifyQueryPattern(pattern) {
    const queries = this.query.mock.calls.map(call => call[0]);
    expect(queries).toEqual(expect.arrayContaining(pattern));
  }
}

// Mock Repository with London School interaction focus
class MockPostRepository {
  constructor() {
    this.save = jest.fn();
    this.findAll = jest.fn();
    this.findById = jest.fn();
    this.update = jest.fn();
    this.delete = jest.fn();
    this.search = jest.fn();
    
    // Track repository operations
    this.operationHistory = [];
  }
  
  // Mock successful save operation
  mockSaveSuccess(post) {
    this.save.mockResolvedValue(post);
    this.operationHistory.push({ operation: 'save', timestamp: Date.now(), data: post });
    return post;
  }
  
  // Mock save failure
  mockSaveFailure(error = createDatabaseError('23505', 'duplicate key')) {
    this.save.mockRejectedValue(error);
    this.operationHistory.push({ operation: 'save_failed', timestamp: Date.now(), error });
  }
  
  // Mock successful find operations
  mockFindSuccess(posts = []) {
    this.findAll.mockResolvedValue(posts);
    this.findById.mockImplementation((id) => {
      const post = posts.find(p => p.id === id);
      return Promise.resolve(post || null);
    });
  }
  
  // Mock update with optimistic locking
  mockUpdateWithOptimisticLocking(post) {
    this.update.mockImplementation((id, data) => {
      if (data.version !== post.version) {
        throw new Error('Concurrent modification detected');
      }
      const updatedPost = { ...post, ...data, version: post.version + 1 };
      this.operationHistory.push({ 
        operation: 'update', 
        timestamp: Date.now(), 
        id, 
        data: updatedPost 
      });
      return Promise.resolve(updatedPost);
    });
  }
  
  // Verify repository interactions
  verifyInteractionSequence(expectedSequence) {
    const actualSequence = this.operationHistory.map(op => op.operation);
    expect(actualSequence).toEqual(expectedSequence);
  }
  
  // Verify save was called with correct data structure
  verifySaveContract(expectedFields) {
    expect(this.save).toHaveBeenCalledWith(
      expect.objectContaining(expectedFields)
    );
  }
}

// Factory functions for easy test setup
const createMockDatabaseSystem = () => ({
  pool: new MockPgPool(),
  adapter: new MockDatabaseAdapter(),
  repository: new MockPostRepository()
});

// Mock query builders for complex scenarios
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  execute: jest.fn(),
  
  // Verify query construction
  verifyQueryStructure(expectedCalls) {
    expectedCalls.forEach(({ method, args }) => {
      expect(this[method]).toHaveBeenCalledWith(...args);
    });
  }
});

// Connection pool monitoring mock
const createMockPoolMonitor = () => ({
  getPoolStats: jest.fn().mockReturnValue({
    totalConnections: 10,
    idleConnections: 7,
    activeConnections: 3,
    waitingClients: 0
  }),
  
  onPoolEvent: jest.fn(),
  trackConnectionLifecycle: jest.fn(),
  
  // Verify pool health monitoring
  verifyPoolMonitoring() {
    expect(this.getPoolStats).toHaveBeenCalled();
    expect(this.trackConnectionLifecycle).toHaveBeenCalled();
  }
});

module.exports = {
  MockPgPool,
  MockPgClient,
  MockDatabaseAdapter,
  MockPostRepository,
  createMockDatabaseSystem,
  createMockQueryBuilder,
  createMockPoolMonitor
};
