/**
 * SystemTemplateRepository
 *
 * TIER 1: System Core Data Access
 * Manages immutable system agent templates that define protected agent configurations.
 *
 * System templates contain:
 * - Protected fields (model, posting_rules, api_schema, safety_constraints)
 * - Default customizable fields (personality, response_style)
 *
 * These are version-controlled and only updated via migrations/seed scripts.
 */

import { query } from '../database/pg-pool';
import type { QueryResult } from 'pg';

export interface SystemTemplate {
  name: string;
  version: number;
  model: string | null;
  posting_rules: Record<string, any>;
  api_schema: Record<string, any>;
  safety_constraints: Record<string, any>;
  default_personality: string | null;
  default_response_style: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSystemTemplateInput {
  name: string;
  version: number;
  model?: string | null;
  posting_rules: Record<string, any>;
  api_schema: Record<string, any>;
  safety_constraints: Record<string, any>;
  default_personality?: string | null;
  default_response_style?: Record<string, any> | null;
}

export interface UpdateSystemTemplateInput {
  version?: number;
  model?: string | null;
  posting_rules?: Record<string, any>;
  api_schema?: Record<string, any>;
  safety_constraints?: Record<string, any>;
  default_personality?: string | null;
  default_response_style?: Record<string, any> | null;
}

export class SystemTemplateRepository {
  /**
   * Get all system templates
   */
  async getAll(): Promise<SystemTemplate[]> {
    const result: QueryResult<SystemTemplate> = await query(
      `SELECT * FROM system_agent_templates ORDER BY name`
    );

    return result.rows;
  }

  /**
   * Get a specific template by ID (name)
   */
  async getById(templateId: string): Promise<SystemTemplate | null> {
    const result: QueryResult<SystemTemplate> = await query(
      `SELECT * FROM system_agent_templates WHERE name = $1`,
      [templateId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get templates by category (based on metadata in posting_rules)
   * Note: This assumes posting_rules contains a 'category' field
   */
  async getByCategory(category: string): Promise<SystemTemplate[]> {
    const result: QueryResult<SystemTemplate> = await query(
      `SELECT * FROM system_agent_templates
       WHERE posting_rules->>'category' = $1
       ORDER BY name`,
      [category]
    );

    return result.rows;
  }

  /**
   * Create a new system template (admin only)
   * Should typically be called from seed scripts or migrations
   */
  async create(template: CreateSystemTemplateInput): Promise<SystemTemplate> {
    // Validation
    if (!template.name || template.name.length === 0) {
      throw new Error('Template name is required');
    }

    if (!template.version || template.version <= 0) {
      throw new Error('Template version must be positive');
    }

    if (!template.posting_rules || Object.keys(template.posting_rules).length === 0) {
      throw new Error('Posting rules are required');
    }

    if (!template.api_schema || Object.keys(template.api_schema).length === 0) {
      throw new Error('API schema is required');
    }

    if (!template.safety_constraints || Object.keys(template.safety_constraints).length === 0) {
      throw new Error('Safety constraints are required');
    }

    const result: QueryResult<SystemTemplate> = await query(
      `INSERT INTO system_agent_templates
       (name, version, model, posting_rules, api_schema, safety_constraints,
        default_personality, default_response_style)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        template.name,
        template.version,
        template.model || null,
        JSON.stringify(template.posting_rules),
        JSON.stringify(template.api_schema),
        JSON.stringify(template.safety_constraints),
        template.default_personality || null,
        template.default_response_style ? JSON.stringify(template.default_response_style) : null
      ]
    );

    return result.rows[0];
  }

  /**
   * Update an existing system template (admin only)
   * Used during migrations to update system configurations
   */
  async update(templateId: string, updates: UpdateSystemTemplateInput): Promise<SystemTemplate | null> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.version !== undefined) {
      updateFields.push(`version = $${paramCount++}`);
      values.push(updates.version);
    }

    if (updates.model !== undefined) {
      updateFields.push(`model = $${paramCount++}`);
      values.push(updates.model);
    }

    if (updates.posting_rules !== undefined) {
      updateFields.push(`posting_rules = $${paramCount++}`);
      values.push(JSON.stringify(updates.posting_rules));
    }

    if (updates.api_schema !== undefined) {
      updateFields.push(`api_schema = $${paramCount++}`);
      values.push(JSON.stringify(updates.api_schema));
    }

    if (updates.safety_constraints !== undefined) {
      updateFields.push(`safety_constraints = $${paramCount++}`);
      values.push(JSON.stringify(updates.safety_constraints));
    }

    if (updates.default_personality !== undefined) {
      updateFields.push(`default_personality = $${paramCount++}`);
      values.push(updates.default_personality);
    }

    if (updates.default_response_style !== undefined) {
      updateFields.push(`default_response_style = $${paramCount++}`);
      values.push(updates.default_response_style ? JSON.stringify(updates.default_response_style) : null);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add templateId as last parameter
    values.push(templateId);

    const result: QueryResult<SystemTemplate> = await query(
      `UPDATE system_agent_templates
       SET ${updateFields.join(', ')}
       WHERE name = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Soft delete a template (mark as inactive)
   * Note: We don't actually delete to preserve referential integrity.
   * Instead, we could add an 'active' column or just rely on cascading deletes.
   *
   * For now, this performs a hard delete since the schema allows it.
   */
  async delete(templateId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM system_agent_templates WHERE name = $1`,
      [templateId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Check if a template exists
   */
  async exists(templateId: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM system_agent_templates WHERE name = $1 LIMIT 1`,
      [templateId]
    );

    return result.rows.length > 0;
  }
}

// Singleton instance
export const systemTemplateRepository = new SystemTemplateRepository();
