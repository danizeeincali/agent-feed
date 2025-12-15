/**
 * PostgreSQL Agent Repository
 * Handles CRUD operations for user_agent_customizations and system_agent_templates
 * Maps to Phase 2 PostgreSQL schema
 */

import postgresManager from '../../config/postgres.js';

class AgentRepository {
  /**
   * Get all agents for a user (combines system templates with user customizations)
   * @param {string} userId - User ID (default: 'anonymous')
   * @returns {Promise<Array>} List of agent configurations
   */
  async getAllAgents(userId = 'anonymous') {
    const query = `
      SELECT
        COALESCE(uac.id::text, sat.name::text) as id,
        sat.name,
        sat.slug,
        COALESCE(uac.custom_name, sat.name) as display_name,
        COALESCE(uac.personality, sat.default_personality) as description,
        COALESCE(uac.personality, sat.default_personality) as system_prompt,
        sat.posting_rules,
        sat.api_schema,
        sat.safety_constraints,
        sat.default_response_style,
        uac.interests,
        COALESCE(uac.enabled, true) as enabled,
        COALESCE(uac.created_at, sat.created_at) as created_at,
        COALESCE(uac.updated_at, sat.updated_at) as updated_at
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      ORDER BY sat.name ASC
    `;

    const result = await postgresManager.query(query, [userId]);

    // Transform to match SQLite structure
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      display_name: row.display_name || row.name,
      description: row.description,
      system_prompt: row.system_prompt,
      avatar_color: this.generateAvatarColor(row.name),
      capabilities: row.interests || [],
      status: row.enabled ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      posting_rules: row.posting_rules,
      api_schema: row.api_schema,
      safety_constraints: row.safety_constraints,
      response_style: row.default_response_style
    }));
  }

  /**
   * Get a single agent by name
   * @param {string} agentName - Agent template name
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Agent configuration or null
   */
  async getAgentByName(agentName, userId = 'anonymous') {
    const query = `
      SELECT
        uac.id,
        uac.agent_template as name,
        uac.custom_name as display_name,
        uac.personality as description,
        uac.personality as system_prompt,
        sat.posting_rules,
        sat.api_schema,
        sat.safety_constraints,
        sat.default_response_style,
        uac.interests,
        uac.enabled,
        uac.created_at,
        uac.updated_at
      FROM user_agent_customizations uac
      JOIN system_agent_templates sat ON uac.agent_template = sat.name
      WHERE uac.user_id = $1 AND uac.agent_template = $2
    `;

    const result = await postgresManager.query(query, [userId, agentName]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name || row.name,
      description: row.description,
      system_prompt: row.system_prompt,
      avatar_color: this.generateAvatarColor(row.name),
      capabilities: row.interests || [],
      status: row.enabled ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      posting_rules: row.posting_rules,
      api_schema: row.api_schema,
      safety_constraints: row.safety_constraints,
      response_style: row.default_response_style
    };
  }

  /**
   * Get a single agent by slug
   * @param {string} slug - Agent slug
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} Agent configuration or null
   */
  async getAgentBySlug(slug, userId = 'anonymous') {
    const query = `
      SELECT
        COALESCE(uac.id::text, sat.name::text) as id,
        sat.name,
        sat.slug,
        COALESCE(uac.custom_name, sat.name) as display_name,
        COALESCE(uac.personality, sat.default_personality) as description,
        COALESCE(uac.personality, sat.default_personality) as system_prompt,
        sat.posting_rules,
        sat.api_schema,
        sat.safety_constraints,
        sat.default_response_style,
        uac.interests,
        COALESCE(uac.enabled, true) as enabled,
        COALESCE(uac.created_at, sat.created_at) as created_at,
        COALESCE(uac.updated_at, sat.updated_at) as updated_at
      FROM system_agent_templates sat
      LEFT JOIN user_agent_customizations uac
        ON sat.name = uac.agent_template AND uac.user_id = $1
      WHERE sat.slug = $2
    `;

    const result = await postgresManager.query(query, [userId, slug]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      display_name: row.display_name || row.name,
      description: row.description,
      system_prompt: row.system_prompt,
      avatar_color: this.generateAvatarColor(row.name),
      capabilities: row.interests || [],
      status: row.enabled ? 'active' : 'inactive',
      created_at: row.created_at,
      updated_at: row.updated_at,
      posting_rules: row.posting_rules,
      api_schema: row.api_schema,
      safety_constraints: row.safety_constraints,
      response_style: row.default_response_style
    };
  }

  /**
   * Create or update an agent customization
   * @param {string} userId - User ID
   * @param {string} agentTemplate - System agent template name
   * @param {object} customization - Agent customization data
   * @returns {Promise<object>} Created/updated agent
   */
  async upsertAgent(userId, agentTemplate, customization) {
    const query = `
      INSERT INTO user_agent_customizations
        (user_id, agent_template, custom_name, personality, interests, enabled, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (user_id, agent_template)
      DO UPDATE SET
        custom_name = EXCLUDED.custom_name,
        personality = EXCLUDED.personality,
        interests = EXCLUDED.interests,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await postgresManager.query(query, [
      userId,
      agentTemplate,
      customization.custom_name || agentTemplate,
      customization.personality || customization.description || '',
      JSON.stringify(customization.interests || []),
      customization.enabled !== false
    ]);

    return result.rows[0];
  }

  /**
   * Get all system agent templates (raw data)
   * @returns {Promise<Array>} List of system templates
   */
  async getSystemTemplates() {
    const query = `
      SELECT
        name,
        version,
        model,
        posting_rules,
        api_schema,
        safety_constraints,
        default_personality,
        default_response_style,
        created_at,
        updated_at
      FROM system_agent_templates
      ORDER BY name ASC
    `;

    const result = await postgresManager.query(query);
    return result.rows;
  }

  /**
   * Get all system agent templates with UI-friendly format
   * Returns all templates regardless of user customizations
   * @returns {Promise<Array>} List of formatted system templates
   */
  async getAllSystemTemplates() {
    const query = `
      SELECT
        name,
        version,
        model,
        posting_rules,
        api_schema,
        safety_constraints,
        default_personality,
        default_response_style,
        created_at,
        updated_at
      FROM system_agent_templates
      ORDER BY name ASC
    `;

    const result = await postgresManager.query(query);

    // Transform to match UI structure
    return result.rows.map(row => ({
      id: null, // System templates don't have customization IDs
      name: row.name,
      display_name: row.name,
      description: row.default_personality,
      system_prompt: row.default_personality,
      avatar_color: this.generateAvatarColor(row.name),
      capabilities: [],
      status: 'active',
      created_at: row.created_at,
      updated_at: row.updated_at,
      posting_rules: row.posting_rules,
      api_schema: row.api_schema,
      safety_constraints: row.safety_constraints,
      response_style: row.default_response_style,
      version: row.version,
      model: row.model
    }));
  }

  /**
   * Generate avatar color from agent name (deterministic)
   * @param {string} name - Agent name
   * @returns {string} Hex color code
   */
  generateAvatarColor(name) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }

    return colors[Math.abs(hash) % colors.length];
  }
}

export default new AgentRepository();
