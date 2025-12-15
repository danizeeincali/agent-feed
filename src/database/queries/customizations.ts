/**
 * User Customization Queries (TIER 2)
 * Queries for user-editable agent customizations
 */

import { UserCustomization } from '../../types/agent-context';
import { DatabaseManager } from '../../types/database-manager';

/**
 * Get user's customization for a specific agent template
 * TIER 2 - User-editable customizations
 *
 * @param db - Database manager instance
 * @param userId - User ID
 * @param agentTemplate - Template name (e.g., 'tech-guru')
 * @returns User customization or null if not found
 */
export async function getUserCustomization(
  db: DatabaseManager,
  userId: string,
  agentTemplate: string
): Promise<UserCustomization | null> {
  const result = await db.query<UserCustomization>(
    `SELECT * FROM user_agent_customizations
     WHERE user_id = $1 AND agent_template = $2 AND enabled = true`,
    [userId, agentTemplate]
  );

  return result.rows[0] || null;
}

/**
 * Get all customizations for a user
 * TIER 2 - User-editable customizations
 *
 * @param db - Database manager instance
 * @param userId - User ID
 * @returns Array of user's customizations
 */
export async function getUserCustomizations(
  db: DatabaseManager,
  userId: string
): Promise<UserCustomization[]> {
  const result = await db.query<UserCustomization>(
    `SELECT * FROM user_agent_customizations
     WHERE user_id = $1 AND enabled = true
     ORDER BY agent_template`,
    [userId]
  );

  return result.rows;
}

/**
 * Create or update user customization
 * TIER 2 - User-editable customizations
 *
 * @param db - Database manager instance
 * @param customization - User customization object
 * @returns Created/updated customization
 */
export async function upsertUserCustomization(
  db: DatabaseManager,
  customization: UserCustomization
): Promise<UserCustomization> {
  const result = await db.query<UserCustomization>(
    `INSERT INTO user_agent_customizations
     (user_id, agent_template, custom_name, personality, interests, response_style, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, agent_template) DO UPDATE SET
       custom_name = EXCLUDED.custom_name,
       personality = EXCLUDED.personality,
       interests = EXCLUDED.interests,
       response_style = EXCLUDED.response_style,
       enabled = EXCLUDED.enabled,
       updated_at = NOW()
     RETURNING *`,
    [
      customization.user_id,
      customization.agent_template,
      customization.custom_name || null,
      customization.personality || null,
      JSON.stringify(customization.interests || []),
      JSON.stringify(customization.response_style || {}),
      customization.enabled !== false
    ]
  );

  return result.rows[0];
}

/**
 * Disable user customization (soft delete)
 * TIER 2 - User-editable customizations
 *
 * @param db - Database manager instance
 * @param userId - User ID
 * @param agentTemplate - Template name
 */
export async function disableUserCustomization(
  db: DatabaseManager,
  userId: string,
  agentTemplate: string
): Promise<void> {
  await db.query(
    `UPDATE user_agent_customizations
     SET enabled = false, updated_at = NOW()
     WHERE user_id = $1 AND agent_template = $2`,
    [userId, agentTemplate]
  );
}
