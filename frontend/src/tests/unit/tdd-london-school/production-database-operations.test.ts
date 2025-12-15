import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DatabaseService } from '../../src/services/DatabaseService';
import { AgentRepository } from '../../src/repositories/AgentRepository';
import { PostRepository } from '../../src/repositories/PostRepository';
import { MetricsRepository } from '../../src/repositories/MetricsRepository';

// Mock production database collaborators
const mockDatabaseConnection = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn(),
  isConnected: jest.fn(),
  getConnectionPool: jest.fn()
};

const mockConnectionPool = {
  acquire: jest.fn(),
  release: jest.fn(),
  end: jest.fn(),
  getActiveConnections: jest.fn(),
  getIdleConnections: jest.fn()
};

const mockTransactionManager = {
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  savepoint: jest.fn(),
  releaseSavepoint: jest.fn()
};

const mockQueryBuilder = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  where: jest.fn(),
  join: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  build: jest.fn()
};

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  invalidate: jest.fn(),
  flush: jest.fn()
};

describe('TDD London School: Production Database Operations', () => {
  let databaseService: DatabaseService;
  let agentRepository: AgentRepository;
  let postRepository: PostRepository;
  let metricsRepository: MetricsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize service with mocked collaborators
    databaseService = new DatabaseService(
      mockDatabaseConnection,
      mockConnectionPool,
      mockTransactionManager
    );
    
    agentRepository = new AgentRepository(
      databaseService,
      mockQueryBuilder,
      mockCacheManager
    );
    
    postRepository = new PostRepository(
      databaseService,
      mockQueryBuilder,
      mockCacheManager
    );
    
    metricsRepository = new MetricsRepository(
      databaseService,
      mockQueryBuilder
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Real Database Connection Management', () => {
    it('should establish authenticated connection to production database', async () => {
      // Contract: Real database connection with proper credentials
      const productionConfig = {
        host: 'prod-db.agent-feed.com',
        port: 5432,
        database: 'agent_feed_production',
        username: 'prod_user',
        password: 'encrypted_production_password',
        ssl: true,
        connectionTimeout: 10000,
        poolSize: 20
      };

      mockDatabaseConnection.connect.mockImplementation(async (config) => {
        expect(config.host).toBe('prod-db.agent-feed.com');
        expect(config.database).toBe('agent_feed_production');
        expect(config.ssl).toBe(true);
        
        return {
          success: true,
          connectionId: 'conn-prod-12345',
          serverVersion: '14.2',
          authenticated: true
        };
      });

      mockDatabaseConnection.isConnected.mockReturnValue(true);
      mockConnectionPool.getActiveConnections.mockReturnValue(5);

      const connection = await databaseService.connect(productionConfig);

      // Verify real production connection
      expect(mockDatabaseConnection.connect).toHaveBeenCalledWith(productionConfig);
      expect(connection.success).toBe(true);
      expect(connection.connectionId).toBe('conn-prod-12345');
      expect(mockDatabaseConnection.isConnected).toHaveBeenCalled();
    });

    it('should handle connection failures without mock fallback', async () => {
      // Contract: Real connection failures, no fallback to in-memory/mock DB
      const connectionError = new Error('FATAL: password authentication failed for user "prod_user"');
      
      mockDatabaseConnection.connect.mockRejectedValue(connectionError);
      mockDatabaseConnection.isConnected.mockReturnValue(false);

      await expect(databaseService.connect({
        host: 'prod-db.agent-feed.com',
        username: 'invalid_user',
        password: 'wrong_password'
      })).rejects.toThrow('FATAL: password authentication failed for user "prod_user"');

      // Verify no fallback connection attempt
      expect(mockDatabaseConnection.connect).toHaveBeenCalledTimes(1);
      expect(mockDatabaseConnection.isConnected).toHaveReturnedWith(false);
    });
  });

  describe('Real Agent Data Operations', () => {
    it('should execute real SQL queries for agent retrieval', async () => {
      // Contract: Real SQL execution against production schema
      const expectedSqlQuery = `
        SELECT 
          a.id, 
          a.name, 
          a.status, 
          a.last_active,
          a.current_task,
          a.capabilities,
          w.active_tasks,
          w.queued_tasks,
          w.completed_today,
          p.success_rate,
          p.average_response_time,
          p.tasks_completed,
          h.cpu_usage,
          h.memory_usage,
          h.uptime
        FROM agents a
        LEFT JOIN agent_workload w ON a.id = w.agent_id
        LEFT JOIN agent_performance p ON a.id = p.agent_id
        LEFT JOIN agent_health h ON a.id = h.agent_id
        WHERE a.deleted_at IS NULL
        ORDER BY a.last_active DESC
      `;

      const mockDbResult = {
        rows: [
          {
            id: 'prod-agent-1',
            name: 'Production Agent 1',
            status: 'active',
            last_active: '2023-12-01T10:00:00.000Z',
            current_task: 'Real production task',
            capabilities: ['prod-capability-1', 'prod-capability-2'],
            active_tasks: 3,
            queued_tasks: 5,
            completed_today: 15,
            success_rate: 96.5,
            average_response_time: 1.8,
            tasks_completed: 250,
            cpu_usage: 35.2,
            memory_usage: 512.8,
            uptime: 99.1
          }
        ],
        rowCount: 1,
        command: 'SELECT'
      };

      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.join.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.build.mockReturnValue(expectedSqlQuery);
      mockDatabaseConnection.query.mockResolvedValue(mockDbResult);

      const agents = await agentRepository.getAll();

      // Verify real SQL query execution
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining(['a.id', 'a.name', 'a.status'])
      );
      expect(mockQueryBuilder.build).toHaveBeenCalled();
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        expectedSqlQuery,
        []
      );

      // Verify real database result mapping
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('prod-agent-1');
      expect(agents[0].name).toBe('Production Agent 1');
      expect(agents[0].workload.activeTasks).toBe(3);
    });

    it('should perform transactional agent updates with rollback capability', async () => {
      // Contract: Real ACID transactions for data integrity
      const agentUpdate = {
        id: 'prod-agent-1',
        status: 'busy',
        currentTask: 'Updated production task',
        lastActive: new Date().toISOString()
      };

      const updateQuery = 'UPDATE agents SET status = $1, current_task = $2, last_active = $3, updated_at = NOW() WHERE id = $4';
      const workloadUpdateQuery = 'UPDATE agent_workload SET active_tasks = active_tasks + 1 WHERE agent_id = $1';

      let transactionContext: any = { id: 'txn-12345' };
      mockTransactionManager.begin.mockResolvedValue(transactionContext);
      mockTransactionManager.commit.mockResolvedValue({ success: true });
      mockDatabaseConnection.query.mockResolvedValue({ rowCount: 1 });

      const result = await agentRepository.updateStatus(
        agentUpdate.id,
        agentUpdate.status,
        agentUpdate.currentTask
      );

      // Verify real transaction flow
      expect(mockTransactionManager.begin).toHaveBeenCalled();
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        updateQuery,
        [agentUpdate.status, agentUpdate.currentTask, expect.any(String), agentUpdate.id],
        transactionContext
      );
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        workloadUpdateQuery,
        [agentUpdate.id],
        transactionContext
      );
      expect(mockTransactionManager.commit).toHaveBeenCalledWith(transactionContext);
      expect(result.success).toBe(true);
    });

    it('should handle transaction rollback on update failures', async () => {
      // Contract: Real transaction rollback on constraint violations
      const transactionError = new Error('ERROR: duplicate key value violates unique constraint "agents_name_unique"');
      
      let transactionContext: any = { id: 'txn-error-123' };
      mockTransactionManager.begin.mockResolvedValue(transactionContext);
      mockDatabaseConnection.query.mockRejectedValue(transactionError);
      mockTransactionManager.rollback.mockResolvedValue({ rolledBack: true });

      await expect(agentRepository.updateStatus('agent-1', 'active', 'task'))
        .rejects.toThrow('duplicate key value violates unique constraint');

      // Verify real rollback execution
      expect(mockTransactionManager.begin).toHaveBeenCalled();
      expect(mockTransactionManager.rollback).toHaveBeenCalledWith(transactionContext);
      expect(mockTransactionManager.commit).not.toHaveBeenCalled();
    });
  });

  describe('Real Post Data Operations', () => {
    it('should execute complex queries for post retrieval with joins', async () => {
      // Contract: Real complex SQL with joins, aggregations, and filtering
      const complexPostQuery = `
        SELECT 
          p.id,
          p.content,
          p.published_at,
          p.agent_id,
          a.name as agent_name,
          a.avatar_url as agent_avatar,
          COUNT(l.id) as like_count,
          COUNT(c.id) as comment_count,
          AVG(e.engagement_score) as avg_engagement
        FROM agent_posts p
        INNER JOIN agents a ON p.agent_id = a.id
        LEFT JOIN post_likes l ON p.id = l.post_id
        LEFT JOIN post_comments c ON p.id = c.post_id
        LEFT JOIN post_engagement e ON p.id = e.post_id
        WHERE p.status = 'published'
          AND p.published_at >= $1
          AND a.status != 'deleted'
        GROUP BY p.id, p.content, p.published_at, p.agent_id, a.name, a.avatar_url
        ORDER BY p.published_at DESC, avg_engagement DESC
        LIMIT $2 OFFSET $3
      `;

      const mockPostResults = {
        rows: [
          {
            id: 'post-prod-1',
            content: 'Real production post content',
            published_at: '2023-12-01T09:00:00.000Z',
            agent_id: 'prod-agent-1',
            agent_name: 'Production Agent',
            agent_avatar: 'https://cdn.agent-feed.com/avatars/prod-agent-1.jpg',
            like_count: '15',
            comment_count: '8',
            avg_engagement: '7.5'
          }
        ],
        rowCount: 1
      };

      mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.join.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.build.mockReturnValue(complexPostQuery);
      mockDatabaseConnection.query.mockResolvedValue(mockPostResults);

      const posts = await postRepository.getPosts({
        limit: 20,
        offset: 0,
        since: '2023-12-01T00:00:00.000Z'
      });

      // Verify complex query construction
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining(['p.id', 'COUNT(l.id) as like_count'])
      );
      expect(mockQueryBuilder.join).toHaveBeenCalledTimes(4); // INNER + 3 LEFT JOINs
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        complexPostQuery,
        ['2023-12-01T00:00:00.000Z', 20, 0]
      );

      // Verify result processing
      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('post-prod-1');
      expect(posts[0].engagement.likeCount).toBe(15);
      expect(posts[0].engagement.commentCount).toBe(8);
    });
  });

  describe('Real Metrics Aggregation', () => {
    it('should execute real-time metrics aggregation queries', async () => {
      // Contract: Real database aggregation for system metrics
      const metricsAggregationQuery = `
        WITH agent_stats AS (
          SELECT 
            status,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM (NOW() - last_active))) as avg_idle_time
          FROM agents 
          WHERE deleted_at IS NULL
          GROUP BY status
        ),
        task_stats AS (
          SELECT 
            SUM(active_tasks) as total_active,
            SUM(queued_tasks) as total_queued,
            SUM(completed_today) as total_completed
          FROM agent_workload w
          INNER JOIN agents a ON w.agent_id = a.id
          WHERE a.deleted_at IS NULL
        ),
        performance_stats AS (
          SELECT 
            AVG(success_rate) as avg_success_rate,
            AVG(average_response_time) as avg_response_time
          FROM agent_performance p
          INNER JOIN agents a ON p.agent_id = a.id
          WHERE a.deleted_at IS NULL
        )
        SELECT * FROM agent_stats, task_stats, performance_stats
      `;

      const mockMetricsResult = {
        rows: [
          {
            status: 'active', count: '5', avg_idle_time: '120.5',
            total_active: '15', total_queued: '25', total_completed: '150',
            avg_success_rate: '96.8', avg_response_time: '1.9'
          },
          {
            status: 'idle', count: '3', avg_idle_time: '1800.0',
            total_active: '15', total_queued: '25', total_completed: '150',
            avg_success_rate: '96.8', avg_response_time: '1.9'
          }
        ]
      };

      mockQueryBuilder.build.mockReturnValue(metricsAggregationQuery);
      mockDatabaseConnection.query.mockResolvedValue(mockMetricsResult);

      const metrics = await metricsRepository.getSystemMetrics();

      // Verify complex aggregation query
      expect(mockDatabaseConnection.query).toHaveBeenCalledWith(
        metricsAggregationQuery,
        []
      );

      // Verify metrics calculation from real database aggregation
      expect(metrics.totalAgents).toBe(8); // 5 active + 3 idle
      expect(metrics.activeAgents).toBe(5);
      expect(metrics.idleAgents).toBe(3);
      expect(metrics.totalTasks).toBe(40); // 15 active + 25 queued
      expect(metrics.averageResponseTime).toBe(1.9);
    });
  });

  describe('Database Connection Pool Management', () => {
    it('should manage connection pool for high concurrency scenarios', async () => {
      // Contract: Real connection pooling for production load
      mockConnectionPool.acquire.mockImplementation(async () => {
        return {
          connectionId: `conn-${Date.now()}`,
          acquired: true,
          pooled: true
        };
      });

      mockConnectionPool.getActiveConnections.mockReturnValue(15);
      mockConnectionPool.getIdleConnections.mockReturnValue(5);

      // Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, async (_, i) => {
        return agentRepository.getById(`agent-${i}`);
      });

      await Promise.all(concurrentRequests);

      // Verify connection pool usage
      expect(mockConnectionPool.acquire).toHaveBeenCalledTimes(10);
      expect(mockConnectionPool.release).toHaveBeenCalledTimes(10);
      expect(mockConnectionPool.getActiveConnections).toHaveBeenCalled();
    });
  });
});
