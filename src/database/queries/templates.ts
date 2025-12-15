/**
 * System Template Queries (TIER 1)
 * Read-only queries for immutable system agent templates
 */

import { SystemTemplate } from '../../types/agent-context';
import { DatabaseManager } from '../../types/database-manager';

/**
 * Get system template by name
 * TIER 1 - Immutable system configuration
 *
 * @param db - Database manager instance
 * @param name - Template name (e.g., 'tech-guru')
 * @returns System template or null if not found
 */
export async function getSystemTemplate(
  db: DatabaseManager,
  name: string
): Promise<SystemTemplate | null> {
  const result = await db.query<SystemTemplate>(
    'SELECT * FROM system_agent_templates WHERE name = $1',
    [name]
  );

  return result.rows[0] || null;
}

/**
 * Get all system templates
 * TIER 1 - Immutable system configuration
 *
 * @param db - Database manager instance
 * @returns Array of all system templates
 */
export async function getAllSystemTemplates(
  db: DatabaseManager
): Promise<SystemTemplate[]> {
  const result = await db.query<SystemTemplate>(
    'SELECT * FROM system_agent_templates ORDER BY name'
  );

  return result.rows;
}

/**
 * Check if template exists
 * TIER 1 - Immutable system configuration
 *
 * @param db - Database manager instance
 * @param name - Template name
 * @returns True if template exists
 */
export async function templateExists(
  db: DatabaseManager,
  name: string
): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM system_agent_templates WHERE name = $1) as exists',
    [name]
  );

  return result.rows[0]?.exists || false;
}
