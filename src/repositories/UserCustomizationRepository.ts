/**
 * UserCustomizationRepository
 *
 * TIER 2: User Customization Data Access
 * Manages user-specific agent customizations and handles 3-tier composition.
 *
 * Key Responsibilities:
 * - Store/retrieve user customizations (personality, interests, response_style)
 * - Compose final agent configuration (TIER 1 + TIER 2)
 * - Validate user customizations don't override protected fields
 * - Ensure data isolation between users
 */

import { query } from '../database/pg-pool';
import { systemTemplateRepository, type SystemTemplate } from './SystemTemplateRepository';
import type { QueryResult } from 'pg';

export interface UserCustomization {
  id: number;
  user_id: string;
  agent_template: string;
  custom_name: string | null;
  personality: string | null;
  interests: Record<string, any> | null;
  response_style: Record<string, any> | null;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserCustomizationInput {
  user_id: string;
  agent_template: string;
  custom_name?: string | null;
  personality?: string | null;
  interests?: Record<string, any> | null;
  response_style?: Record<string, any> | null;
  enabled?: boolean;
}

export interface UpdateUserCustomizationInput {
  custom_name?: string | null;
  personality?: string | null;
  interests?: Record<string, any> | null;
  response_style?: Record<string, any> | null;
  enabled?: boolean;
}

export interface ComposedAgent {
  // TIER 1: Protected fields (from system template)
  model: string | null;
  posting_rules: Record<string, any>;
  api_schema: Record<string, any>;
  safety_constraints: Record<string, any>;

  // TIER 2: Customizable fields (user overrides applied)
  agent_name: string;
  personality: string | null;
  interests: Record<string, any>;
  response_style: Record<string, any>;

  // Metadata
  template_name: string;
  template_version: number;
  user_id: string;
  customization_id: number | null;
}

export class UserCustomizationRepository {
  /**
   * Get all customizations for a user
   */
  async getByUser(userId: string): Promise<UserCustomization[]> {
    const result: QueryResult<UserCustomization> = await query(
      `SELECT * FROM user_agent_customizations
       WHERE user_id = $1
       ORDER BY agent_template`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get a specific customization for a user and template
   */
  async getByUserAndTemplate(userId: string, templateId: string): Promise<UserCustomization | null> {
    const result: QueryResult<UserCustomization> = await query(
      `SELECT * FROM user_agent_customizations
       WHERE user_id = $1 AND agent_template = $2`,
      [userId, templateId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new user customization
   */
  async create(input: CreateUserCustomizationInput): Promise<UserCustomization> {
    // Validation
    if (!input.user_id || input.user_id.length === 0) {
      throw new Error('User ID is required');
    }

    if (!input.agent_template || input.agent_template.length === 0) {
      throw new Error('Agent template is required');
    }

    // Verify template exists
    const templateExists = await systemTemplateRepository.exists(input.agent_template);
    if (!templateExists) {
      throw new Error(`System template not found: ${input.agent_template}`);
    }

    // Validate personality length
    if (input.personality && input.personality.length > 5000) {
      throw new Error('Personality text too long (max 5000 characters)');
    }

    // Validate interests array length
    if (input.interests && Array.isArray(input.interests) && input.interests.length > 50) {
      throw new Error('Too many interests specified (max 50)');
    }

    // Validate no protected fields are being set
    this.validateNoProtectedFields(input);

    const result: QueryResult<UserCustomization> = await query(
      `INSERT INTO user_agent_customizations
       (user_id, agent_template, custom_name, personality, interests, response_style, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.user_id,
        input.agent_template,
        input.custom_name || null,
        input.personality || null,
        input.interests ? JSON.stringify(input.interests) : null,
        input.response_style ? JSON.stringify(input.response_style) : null,
        input.enabled !== undefined ? input.enabled : true
      ]
    );

    return result.rows[0];
  }

  /**
   * Update an existing customization
   */
  async update(customizationId: number, updates: UpdateUserCustomizationInput): Promise<UserCustomization | null> {
    // Validate personality length
    if (updates.personality && updates.personality.length > 5000) {
      throw new Error('Personality text too long (max 5000 characters)');
    }

    // Validate interests array length
    if (updates.interests && Array.isArray(updates.interests) && updates.interests.length > 50) {
      throw new Error('Too many interests specified (max 50)');
    }

    // Validate no protected fields
    this.validateNoProtectedFields(updates);

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.custom_name !== undefined) {
      updateFields.push(`custom_name = $${paramCount++}`);
      values.push(updates.custom_name);
    }

    if (updates.personality !== undefined) {
      updateFields.push(`personality = $${paramCount++}`);
      values.push(updates.personality);
    }

    if (updates.interests !== undefined) {
      updateFields.push(`interests = $${paramCount++}`);
      values.push(updates.interests ? JSON.stringify(updates.interests) : null);
    }

    if (updates.response_style !== undefined) {
      updateFields.push(`response_style = $${paramCount++}`);
      values.push(updates.response_style ? JSON.stringify(updates.response_style) : null);
    }

    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramCount++}`);
      values.push(updates.enabled);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add customizationId as last parameter
    values.push(customizationId);

    const result: QueryResult<UserCustomization> = await query(
      `UPDATE user_agent_customizations
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a customization
   */
  async delete(customizationId: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM user_agent_customizations WHERE id = $1`,
      [customizationId]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Compose agent configuration from TIER 1 (system template) + TIER 2 (user customization)
   *
   * This is the core of the 3-tier architecture:
   * - System rules always win (immutable)
   * - User customizations applied only to allowed fields
   * - Returns a validated, composed agent configuration
   */
  async composeAgent(userId: string, templateId: string): Promise<ComposedAgent> {
    // 1. Load IMMUTABLE system template (TIER 1)
    const template = await systemTemplateRepository.getById(templateId);

    if (!template) {
      throw new Error(`System template not found: ${templateId}`);
    }

    // 2. Load user customization (TIER 2) - optional
    const customization = await this.getByUserAndTemplate(userId, templateId);

    // 3. Compose final context (SYSTEM RULES ALWAYS WIN)
    const composedAgent: ComposedAgent = {
      // TIER 1: PROTECTED - User cannot change
      model: template.model,
      posting_rules: template.posting_rules,
      api_schema: template.api_schema,
      safety_constraints: template.safety_constraints,

      // TIER 2: CUSTOMIZABLE - User overrides apply
      agent_name: customization?.custom_name || templateId,
      personality: customization?.personality || template.default_personality,
      interests: customization?.interests || {},
      response_style: customization?.response_style || template.default_response_style || {},

      // Metadata
      template_name: template.name,
      template_version: template.version,
      user_id: userId,
      customization_id: customization?.id || null
    };

    return composedAgent;
  }

  /**
   * Validate that user input doesn't contain protected fields
   * Throws error if validation fails
   */
  private validateNoProtectedFields(input: any): void {
    const protectedFields = ['model', 'posting_rules', 'api_schema', 'safety_constraints', 'version'];

    for (const field of protectedFields) {
      if (input.hasOwnProperty(field)) {
        throw new Error(
          `Security violation: Cannot customize protected field: ${field}`
        );
      }
    }
  }

  /**
   * Check if a customization exists
   */
  async exists(customizationId: number): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM user_agent_customizations WHERE id = $1 LIMIT 1`,
      [customizationId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get enabled customizations for a user (only active agents)
   */
  async getEnabledByUser(userId: string): Promise<UserCustomization[]> {
    const result: QueryResult<UserCustomization> = await query(
      `SELECT * FROM user_agent_customizations
       WHERE user_id = $1 AND enabled = true
       ORDER BY agent_template`,
      [userId]
    );

    return result.rows;
  }
}

// Singleton instance
export const userCustomizationRepository = new UserCustomizationRepository();
