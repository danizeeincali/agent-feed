/**
 * AgentMemoryRepository
 *
 * TIER 3: User Data Access
 * Manages agent memories (conversation history) for multi-user support.
 *
 * Key Features:
 * - Store and retrieve agent memories
 * - Relevance-based memory retrieval (JSONB + recency)
 * - Multi-user data isolation
 * - Memory cleanup with retention policies
 */

import { query } from '../database/pg-pool';
import type { QueryResult } from 'pg';

export interface AgentMemory {
  id: number;
  user_id: string;
  agent_name: string;
  post_id: string | null;
  content: string;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface CreateAgentMemoryInput {
  user_id: string;
  agent_name: string;
  post_id?: string | null;
  content: string;
  metadata?: Record<string, any> | null;
}

export interface UpdateAgentMemoryInput {
  content?: string;
  metadata?: Record<string, any> | null;
}

export class AgentMemoryRepository {
  /**
   * Get all memories for a user
   */
  async getByUser(userId: string): Promise<AgentMemory[]> {
    const result: QueryResult<AgentMemory> = await query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get memories for a specific agent
   */
  async getByAgent(userId: string, agentName: string): Promise<AgentMemory[]> {
    const result: QueryResult<AgentMemory> = await query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1 AND agent_name = $2
       ORDER BY created_at DESC`,
      [userId, agentName]
    );

    return result.rows;
  }

  /**
   * Get relevant memories based on context
   *
   * Retrieval strategy:
   * - Match metadata topics (JSONB containment)
   * - Include recent memories (last 7 days)
   * - Order by recency
   * - Limit results
   *
   * This approach is simple, fast, and avoids vector embeddings.
   */
  async getRelevant(
    userId: string,
    agentName: string,
    context: Record<string, any>,
    limit: number = 5
  ): Promise<AgentMemory[]> {
    // Build the query dynamically based on context
    const result: QueryResult<AgentMemory> = await query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1
         AND agent_name = $2
         AND (
           metadata @> $3::jsonb
           OR created_at > NOW() - INTERVAL '7 days'
         )
       ORDER BY created_at DESC
       LIMIT $4`,
      [userId, agentName, JSON.stringify(context), limit]
    );

    return result.rows;
  }

  /**
   * Get recent memories (last N days)
   */
  async getRecent(
    userId: string,
    agentName: string,
    days: number = 7,
    limit: number = 10
  ): Promise<AgentMemory[]> {
    const result: QueryResult<AgentMemory> = await query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1
         AND agent_name = $2
         AND created_at > NOW() - INTERVAL '${days} days'
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, agentName, limit]
    );

    return result.rows;
  }

  /**
   * Create a new memory
   */
  async create(memory: CreateAgentMemoryInput): Promise<AgentMemory> {
    // Validation
    if (!memory.user_id || memory.user_id.length === 0) {
      throw new Error('User ID is required');
    }

    if (!memory.agent_name || memory.agent_name.length === 0) {
      throw new Error('Agent name is required');
    }

    if (!memory.content || memory.content.length === 0) {
      throw new Error('Memory content is required');
    }

    const result: QueryResult<AgentMemory> = await query(
      `INSERT INTO agent_memories
       (user_id, agent_name, post_id, content, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        memory.user_id,
        memory.agent_name,
        memory.post_id || null,
        memory.content,
        memory.metadata ? JSON.stringify(memory.metadata) : null
      ]
    );

    return result.rows[0];
  }

  /**
   * Update a memory
   * Note: Memories are typically immutable, but we provide this for corrections
   */
  async update(memoryId: number, updates: UpdateAgentMemoryInput): Promise<AgentMemory | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount++}`);
      values.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add memoryId as last parameter
    values.push(memoryId);

    const result: QueryResult<AgentMemory> = await query(
      `UPDATE agent_memories
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a memory
   * Note: Generally discouraged due to immutability constraint
   */
  async delete(memoryId: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM agent_memories WHERE id = $1`,
      [memoryId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Cleanup old memories based on retention policy
   *
   * @param userId - User whose memories to clean
   * @param retentionDays - Keep memories newer than this many days
   * @returns Number of memories deleted
   */
  async cleanup(userId: string, retentionDays: number = 90): Promise<number> {
    if (retentionDays <= 0) {
      throw new Error('Retention days must be positive');
    }

    const result = await query(
      `DELETE FROM agent_memories
       WHERE user_id = $1
         AND created_at < NOW() - INTERVAL '${retentionDays} days'`,
      [userId]
    );

    return result.rowCount || 0;
  }

  /**
   * Get memory count for a user
   */
  async getCount(userId: string, agentName?: string): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM agent_memories WHERE user_id = $1`;
    const params: any[] = [userId];

    if (agentName) {
      sql += ` AND agent_name = $2`;
      params.push(agentName);
    }

    const result = await query(sql, params);

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Search memories by content (full-text search)
   */
  async search(userId: string, searchTerm: string, limit: number = 10): Promise<AgentMemory[]> {
    const result: QueryResult<AgentMemory> = await query(
      `SELECT * FROM agent_memories
       WHERE user_id = $1
         AND content ILIKE $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, `%${searchTerm}%`, limit]
    );

    return result.rows;
  }

  /**
   * Get memory by ID with user verification (data isolation)
   */
  async getById(memoryId: number, userId: string): Promise<AgentMemory | null> {
    const result: QueryResult<AgentMemory> = await query(
      `SELECT * FROM agent_memories
       WHERE id = $1 AND user_id = $2`,
      [memoryId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Bulk create memories (efficient for batch operations)
   */
  async createBulk(memories: CreateAgentMemoryInput[]): Promise<AgentMemory[]> {
    if (memories.length === 0) {
      return [];
    }

    // Validate all memories
    for (const memory of memories) {
      if (!memory.user_id || !memory.agent_name || !memory.content) {
        throw new Error('Invalid memory data');
      }
    }

    // Build bulk insert query
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramCount = 1;

    for (const memory of memories) {
      placeholders.push(
        `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`
      );

      values.push(
        memory.user_id,
        memory.agent_name,
        memory.post_id || null,
        memory.content,
        memory.metadata ? JSON.stringify(memory.metadata) : null
      );
    }

    const result: QueryResult<AgentMemory> = await query(
      `INSERT INTO agent_memories
       (user_id, agent_name, post_id, content, metadata)
       VALUES ${placeholders.join(', ')}
       RETURNING *`,
      values
    );

    return result.rows;
  }
}

// Singleton instance
export const agentMemoryRepository = new AgentMemoryRepository();
