/**
 * Agent Markdown to PostgreSQL Migration Script
 * Phase 1: Migrate agent .md files to system_agent_templates table
 *
 * This script:
 * 1. Reads all agent .md files from the agents directory
 * 2. Parses YAML frontmatter to extract configuration
 * 3. Transforms data to match PostgreSQL schema
 * 4. Upserts into system_agent_templates table (idempotent)
 */

import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { logger } from '../utils/logger';

export interface AgentMarkdownData {
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  color?: string;
  proactive?: boolean;
  priority?: string;
  usage?: string;
  content: string;
  filePath: string;
}

export interface SystemTemplateRow {
  name: string;
  version: number;
  model: string | null;
  posting_rules: object;
  api_schema: object;
  safety_constraints: object;
  default_personality: string | null;
  default_response_style: object | null;
}

export interface MigrationResult {
  success: boolean;
  processed: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Parse a single agent markdown file
 */
export async function parseAgentMarkdown(filePath: string): Promise<AgentMarkdownData> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(fileContent);

    // Validate required fields
    if (!parsed.data.name) {
      throw new Error('Missing required field: name');
    }

    if (!parsed.data.description) {
      throw new Error('Missing required field: description');
    }

    return {
      name: parsed.data.name,
      description: parsed.data.description,
      tools: parsed.data.tools || [],
      model: parsed.data.model || null,
      color: parsed.data.color || '#374151',
      proactive: parsed.data.proactive || false,
      priority: parsed.data.priority || 'P3',
      usage: parsed.data.usage || null,
      content: parsed.content,
      filePath,
    };
  } catch (error) {
    throw new Error(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transform agent markdown data to PostgreSQL schema format
 */
export function transformToSystemTemplate(agent: AgentMarkdownData): SystemTemplateRow {
  return {
    name: agent.name,
    version: 1, // Initial version
    model: agent.model || null,
    posting_rules: {
      max_length: 2000,
      rate_limit: {
        posts_per_hour: 10,
        posts_per_day: 50,
      },
      prohibited_words: [],
    },
    api_schema: {
      endpoints: [],
      auth_type: 'none',
    },
    safety_constraints: {
      content_filters: ['spam', 'abuse'],
      max_mentions_per_post: 5,
      require_user_approval: agent.proactive ? false : true,
    },
    default_personality: agent.content || null,
    default_response_style: {
      tone: 'professional',
      length: 'concise',
      use_emojis: false,
      priority: agent.priority,
      proactive: agent.proactive,
      color: agent.color,
      tools: agent.tools,
    },
  };
}

/**
 * Read all agent markdown files from directory
 */
export async function readAgentMarkdownFiles(agentsDir: string): Promise<AgentMarkdownData[]> {
  try {
    const files = await fs.readdir(agentsDir);
    const markdownFiles = files.filter(file => file.endsWith('.md'));

    const agents: AgentMarkdownData[] = [];

    for (const file of markdownFiles) {
      const filePath = path.join(agentsDir, file);
      try {
        const agent = await parseAgentMarkdown(filePath);
        agents.push(agent);
      } catch (error) {
        logger.error(`Failed to parse ${file}:`, error);
        throw error; // Fail fast on parse errors
      }
    }

    return agents;
  } catch (error) {
    throw new Error(`Failed to read agents directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Migrate agents to PostgreSQL (UPSERT for idempotency)
 */
export async function migrateAgentsToPostgres(
  pool: Pool,
  agents: AgentMarkdownData[],
  dryRun: boolean = false
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    processed: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  for (const agent of agents) {
    try {
      result.processed++;

      const template = transformToSystemTemplate(agent);

      if (dryRun) {
        logger.info(`[DRY RUN] Would migrate: ${template.name}`);
        continue;
      }

      // Check if agent already exists
      const existingQuery = 'SELECT name, version FROM system_agent_templates WHERE name = $1';
      const existingResult = await pool.query(existingQuery, [template.name]);

      const isUpdate = existingResult.rows.length > 0;

      // UPSERT query
      const query = `
        INSERT INTO system_agent_templates (
          name,
          version,
          model,
          posting_rules,
          api_schema,
          safety_constraints,
          default_personality,
          default_response_style
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET
          version = EXCLUDED.version,
          model = EXCLUDED.model,
          posting_rules = EXCLUDED.posting_rules,
          api_schema = EXCLUDED.api_schema,
          safety_constraints = EXCLUDED.safety_constraints,
          default_personality = EXCLUDED.default_personality,
          default_response_style = EXCLUDED.default_response_style,
          updated_at = NOW()
      `;

      const values = [
        template.name,
        template.version,
        template.model,
        JSON.stringify(template.posting_rules),
        JSON.stringify(template.api_schema),
        JSON.stringify(template.safety_constraints),
        template.default_personality,
        JSON.stringify(template.default_response_style),
      ];

      await pool.query(query, values);

      if (isUpdate) {
        result.updated++;
        logger.info(`Updated agent: ${template.name}`);
      } else {
        result.inserted++;
        logger.info(`Inserted agent: ${template.name}`);
      }
    } catch (error) {
      result.failed++;
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({ file: agent.filePath, error: errorMessage });
      logger.error(`Failed to migrate ${agent.name}:`, error);
    }
  }

  return result;
}

/**
 * Main migration function
 */
export async function migrateAgentMarkdownToPostgres(
  pool: Pool,
  agentsDir: string = '/workspaces/agent-feed/agents',
  dryRun: boolean = false
): Promise<MigrationResult> {
  try {
    logger.info(`Starting agent markdown migration from ${agentsDir}`);
    logger.info(`Dry run mode: ${dryRun}`);

    // Read all agent markdown files
    const agents = await readAgentMarkdownFiles(agentsDir);
    logger.info(`Found ${agents.length} agent markdown files`);

    // Migrate to PostgreSQL
    const result = await migrateAgentsToPostgres(pool, agents, dryRun);

    logger.info('Migration completed');
    logger.info(`Processed: ${result.processed}, Inserted: ${result.inserted}, Updated: ${result.updated}, Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      logger.error('Migration errors:');
      result.errors.forEach(err => logger.error(`  ${err.file}: ${err.error}`));
    }

    return result;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}
