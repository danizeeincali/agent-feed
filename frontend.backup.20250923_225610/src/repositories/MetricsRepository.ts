import { DatabaseService } from '../services/DatabaseService';
import { AgentMetrics } from '../hooks/useAgentStatus';

interface QueryBuilder {
  build: () => string;
}

export class MetricsRepository {
  private db: DatabaseService;
  private queryBuilder: QueryBuilder;

  constructor(
    database: DatabaseService,
    queryBuilder: QueryBuilder
  ) {
    this.db = database;
    this.queryBuilder = queryBuilder;
  }

  async getSystemMetrics(): Promise<AgentMetrics> {
    try {
      const result = await this.db.getAgentMetrics();
      
      if (result.success) {
        return result.data;
      }
      
      throw new Error('Failed to retrieve metrics from database');
    } catch (error) {
      throw new Error(`Metrics repository error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPerformanceMetrics(timeRange: string = '24h'): Promise<any> {
    try {
      const query = `
        SELECT 
          AVG(p.success_rate) as avg_success_rate,
          AVG(p.average_response_time) as avg_response_time,
          SUM(p.tasks_completed) as total_tasks_completed,
          AVG(h.cpu_usage) as avg_cpu_usage,
          AVG(h.memory_usage) as avg_memory_usage,
          MIN(h.uptime) as min_uptime
        FROM agent_performance p
        INNER JOIN agent_health h ON p.agent_id = h.agent_id
        INNER JOIN agents a ON p.agent_id = a.id
        WHERE a.deleted_at IS NULL
          AND p.updated_at >= NOW() - INTERVAL '${this.sanitizeTimeRange(timeRange)}'
      `;

      const result = await this.db.query(query);
      
      if (result.rows.length === 0) {
        return {
          avgSuccessRate: 0,
          avgResponseTime: 0,
          totalTasksCompleted: 0,
          avgCpuUsage: 0,
          avgMemoryUsage: 0,
          minUptime: 0
        };
      }

      const row = result.rows[0];
      return {
        avgSuccessRate: parseFloat(row.avg_success_rate) || 0,
        avgResponseTime: parseFloat(row.avg_response_time) || 0,
        totalTasksCompleted: parseInt(row.total_tasks_completed) || 0,
        avgCpuUsage: parseFloat(row.avg_cpu_usage) || 0,
        avgMemoryUsage: parseFloat(row.avg_memory_usage) || 0,
        minUptime: parseFloat(row.min_uptime) || 0
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWorkloadMetrics(): Promise<any> {
    try {
      const query = `
        SELECT 
          SUM(w.active_tasks) as total_active_tasks,
          SUM(w.queued_tasks) as total_queued_tasks,
          SUM(w.completed_today) as total_completed_today,
          AVG(w.active_tasks) as avg_active_per_agent,
          AVG(w.queued_tasks) as avg_queued_per_agent,
          MAX(w.active_tasks) as max_active_single_agent,
          COUNT(DISTINCT w.agent_id) as active_agents
        FROM agent_workload w
        INNER JOIN agents a ON w.agent_id = a.id
        WHERE a.deleted_at IS NULL
      `;

      const result = await this.db.query(query);
      
      if (result.rows.length === 0) {
        return {
          totalActiveTasks: 0,
          totalQueuedTasks: 0,
          totalCompletedToday: 0,
          avgActivePerAgent: 0,
          avgQueuedPerAgent: 0,
          maxActiveSingleAgent: 0,
          activeAgents: 0
        };
      }

      const row = result.rows[0];
      return {
        totalActiveTasks: parseInt(row.total_active_tasks) || 0,
        totalQueuedTasks: parseInt(row.total_queued_tasks) || 0,
        totalCompletedToday: parseInt(row.total_completed_today) || 0,
        avgActivePerAgent: parseFloat(row.avg_active_per_agent) || 0,
        avgQueuedPerAgent: parseFloat(row.avg_queued_per_agent) || 0,
        maxActiveSingleAgent: parseInt(row.max_active_single_agent) || 0,
        activeAgents: parseInt(row.active_agents) || 0
      };
    } catch (error) {
      throw new Error(`Failed to get workload metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async recordMetric(metric: {
    agentId: string;
    metricType: string;
    value: number;
    timestamp?: Date;
  }): Promise<{ success: boolean }> {
    try {
      const result = await this.db.transaction(async (ctx) => {
        const insertQuery = `
          INSERT INTO agent_metrics (agent_id, metric_type, value, timestamp, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `;
        
        await this.db.query(insertQuery, [
          metric.agentId,
          metric.metricType,
          metric.value,
          metric.timestamp || new Date()
        ], ctx);

        return { success: true };
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to record metric: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private sanitizeTimeRange(timeRange: string): string {
    // Sanitize time range input to prevent SQL injection
    const validRanges = {
      '1h': '1 HOUR',
      '24h': '24 HOURS', 
      '7d': '7 DAYS',
      '30d': '30 DAYS'
    } as Record<string, string>;

    return validRanges[timeRange] || '24 HOURS';
  }
}
