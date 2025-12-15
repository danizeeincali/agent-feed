import { DatabaseService } from '../services/DatabaseService';
import { AgentStatus } from '../hooks/useAgentStatus';

interface QueryBuilder {
  select: (fields: string[]) => QueryBuilder;
  insert: (table: string) => QueryBuilder;
  update: (table: string) => QueryBuilder;
  delete: (table: string) => QueryBuilder;
  where: (condition: string) => QueryBuilder;
  join: (table: string, on: string, type?: string) => QueryBuilder;
  orderBy: (field: string, direction?: string) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  build: () => string;
}

interface CacheManager {
  get: (key: string) => any;
  set: (key: string, value: any, ttl?: number) => void;
  del: (key: string) => void;
  invalidate: (pattern: string) => void;
  flush: () => void;
}

export class AgentRepository {
  private db: DatabaseService;
  private queryBuilder: QueryBuilder;
  private cache: CacheManager;

  constructor(
    database: DatabaseService,
    queryBuilder: QueryBuilder,
    cache: CacheManager
  ) {
    this.db = database;
    this.queryBuilder = queryBuilder;
    this.cache = cache;
  }

  async getAll(): Promise<AgentStatus[]> {
    // Check cache first
    const cacheKey = 'agents:all';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.db.getAgents();
      
      if (result.success) {
        // Cache the results
        this.cache.set(cacheKey, result.data, 30000); // 30 second TTL
        return result.data;
      }
      
      throw new Error('Failed to retrieve agents from database');
    } catch (error) {
      throw new Error(`Agent repository error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getById(id: string): Promise<AgentStatus | null> {
    const cacheKey = `agent:${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const query = this.queryBuilder
        .select([
          'a.id', 'a.name', 'a.status', 'a.last_active', 'a.current_task', 'a.capabilities',
          'w.active_tasks', 'w.queued_tasks', 'w.completed_today',
          'p.success_rate', 'p.average_response_time', 'p.tasks_completed',
          'h.cpu_usage', 'h.memory_usage', 'h.uptime'
        ])
        .join('agent_workload w', 'a.id = w.agent_id', 'LEFT')
        .join('agent_performance p', 'a.id = p.agent_id', 'LEFT')
        .join('agent_health h', 'a.id = h.agent_id', 'LEFT')
        .where('a.id = ? AND a.deleted_at IS NULL')
        .build();

      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const agent: AgentStatus = {
        id: row.id,
        name: row.name,
        status: row.status,
        lastActive: row.last_active,
        currentTask: row.current_task,
        workload: {
          activeTasks: row.active_tasks || 0,
          queuedTasks: row.queued_tasks || 0,
          completedToday: row.completed_today || 0
        },
        performance: {
          successRate: row.success_rate || 0,
          averageResponseTime: row.average_response_time || 0,
          tasksCompleted: row.tasks_completed || 0
        },
        capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
        health: {
          cpuUsage: row.cpu_usage || 0,
          memoryUsage: row.memory_usage || 0,
          uptime: row.uptime || 0
        }
      };

      this.cache.set(cacheKey, agent, 30000);
      return agent;
    } catch (error) {
      throw new Error(`Failed to get agent ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateStatus(
    agentId: string,
    status: AgentStatus['status'],
    currentTask?: string
  ): Promise<{ success: boolean }> {
    try {
      const result = await this.db.transaction(async (ctx) => {
        // Update agent status
        const updateQuery = 'UPDATE agents SET status = $1, current_task = $2, last_active = $3, updated_at = NOW() WHERE id = $4';
        await this.db.query(updateQuery, [status, currentTask, new Date().toISOString(), agentId], ctx);

        // Update workload if status changed to busy
        if (status === 'busy') {
          const workloadUpdateQuery = 'UPDATE agent_workload SET active_tasks = active_tasks + 1 WHERE agent_id = $1';
          await this.db.query(workloadUpdateQuery, [agentId], ctx);
        } else if (status === 'idle') {
          const workloadUpdateQuery = 'UPDATE agent_workload SET active_tasks = GREATEST(active_tasks - 1, 0) WHERE agent_id = $1';
          await this.db.query(workloadUpdateQuery, [agentId], ctx);
        }

        return { success: true };
      });

      // Invalidate cache
      this.cache.del(`agent:${agentId}`);
      this.cache.invalidate('agents:');

      return result;
    } catch (error) {
      throw error; // Let the database service handle transaction rollback
    }
  }

  async create(agentData: Partial<AgentStatus>): Promise<AgentStatus> {
    try {
      const result = await this.db.transaction(async (ctx) => {
        // Insert agent
        const insertQuery = `
          INSERT INTO agents (id, name, status, capabilities, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING *
        `;
        
        const agentResult = await this.db.query(insertQuery, [
          agentData.id,
          agentData.name,
          agentData.status || 'idle',
          JSON.stringify(agentData.capabilities || [])
        ], ctx);

        // Initialize workload
        const workloadQuery = `
          INSERT INTO agent_workload (agent_id, active_tasks, queued_tasks, completed_today)
          VALUES ($1, 0, 0, 0)
        `;
        await this.db.query(workloadQuery, [agentData.id], ctx);

        // Initialize performance
        const performanceQuery = `
          INSERT INTO agent_performance (agent_id, success_rate, average_response_time, tasks_completed)
          VALUES ($1, 100.0, 0.0, 0)
        `;
        await this.db.query(performanceQuery, [agentData.id], ctx);

        // Initialize health
        const healthQuery = `
          INSERT INTO agent_health (agent_id, cpu_usage, memory_usage, uptime)
          VALUES ($1, 0.0, 0.0, 100.0)
        `;
        await this.db.query(healthQuery, [agentData.id], ctx);

        return agentResult.rows[0];
      });

      // Invalidate cache
      this.cache.invalidate('agents:');

      // Return created agent
      return await this.getById(result.id) as AgentStatus;
    } catch (error) {
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(agentId: string): Promise<{ success: boolean }> {
    try {
      const result = await this.db.transaction(async (ctx) => {
        // Soft delete - set deleted_at timestamp
        const deleteQuery = 'UPDATE agents SET deleted_at = NOW(), status = \'offline\' WHERE id = $1';
        await this.db.query(deleteQuery, [agentId], ctx);

        return { success: true };
      });

      // Invalidate cache
      this.cache.del(`agent:${agentId}`);
      this.cache.invalidate('agents:');

      return result;
    } catch (error) {
      throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getByStatus(status: AgentStatus['status']): Promise<AgentStatus[]> {
    const cacheKey = `agents:status:${status}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const agents = await this.getAll();
      const filtered = agents.filter(agent => agent.status === status);
      
      this.cache.set(cacheKey, filtered, 15000); // 15 second TTL
      return filtered;
    } catch (error) {
      throw new Error(`Failed to get agents by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
