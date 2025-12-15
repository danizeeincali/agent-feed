#!/usr/bin/env tsx
/**
 * Production Agent Migration Script
 *
 * Migrates all 13 production agents from .md files to PostgreSQL database
 *
 * Features:
 * - Reads agent .md files using AgentDiscoveryService
 * - Transforms Claude Code YAML frontmatter to PostgreSQL JSON schema
 * - Inserts into system_agent_templates and user_agent_customizations
 * - Handles duplicates with upsert logic
 * - Supports dry-run mode
 * - Comprehensive logging
 *
 * Usage:
 *   npm run migrate:agents              # Production run
 *   npm run migrate:agents -- --dry-run # Preview without changes
 */

import { AgentDiscoveryService } from '../src/agents/AgentDiscoveryService.js';
import postgresManager from '../api-server/config/postgres.js';
import {
  PostingRules,
  ApiSchema,
  SafetyConstraints,
  ResponseStyle
} from '../src/types/agent-templates.js';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

interface MigrationResult {
  success: boolean;
  agentName: string;
  error?: string;
}

interface MigrationStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: MigrationResult[];
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const ANONYMOUS_USER = 'anonymous';
const AGENT_DIRECTORY = path.join(process.cwd(), 'prod/.claude/agents');

// Default values for required JSON fields
const DEFAULT_POSTING_RULES: PostingRules = {
  max_length: 1000,
  min_interval_seconds: 60,
  rate_limit_per_hour: 20,
  prohibited_words: ['spam', 'offensive']
};

const DEFAULT_API_SCHEMA: ApiSchema = {
  platform: 'agent-feed',
  endpoints: {
    post: '/api/posts',
    reply: '/api/comments'
  },
  auth_type: 'internal'
};

const DEFAULT_SAFETY_CONSTRAINTS: SafetyConstraints = {
  content_filters: ['profanity', 'spam', 'phishing'],
  max_mentions_per_post: 5,
  requires_human_review: ['financial_advice', 'medical_advice', 'legal_advice']
};

const DEFAULT_RESPONSE_STYLE: ResponseStyle = {
  tone: 'professional',
  length: 'concise',
  use_emojis: false
};

// ============================================================================
// Logging Utilities
// ============================================================================

class Logger {
  private isDryRun: boolean;

  constructor(isDryRun: boolean = false) {
    this.isDryRun = isDryRun;
  }

  info(message: string): void {
    const prefix = this.isDryRun ? '[DRY-RUN]' : '[INFO]';
    console.log(`${prefix} ${message}`);
  }

  success(message: string): void {
    const prefix = this.isDryRun ? '[DRY-RUN]' : '[SUCCESS]';
    console.log(`\x1b[32m${prefix} ${message}\x1b[0m`);
  }

  error(message: string, error?: unknown): void {
    const prefix = this.isDryRun ? '[DRY-RUN]' : '[ERROR]';
    console.error(`\x1b[31m${prefix} ${message}\x1b[0m`);
    if (error && error instanceof Error) {
      console.error(`  Details: ${error.message}`);
      if (error.stack) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  warn(message: string): void {
    const prefix = this.isDryRun ? '[DRY-RUN]' : '[WARN]';
    console.warn(`\x1b[33m${prefix} ${message}\x1b[0m`);
  }

  section(title: string): void {
    console.log('\n' + '='.repeat(80));
    console.log(title);
    console.log('='.repeat(80) + '\n');
  }
}

// ============================================================================
// Model Transformation Functions
// ============================================================================

/**
 * Map Claude Code model names to full model identifiers
 */
function transformModelName(model?: string): string | null {
  if (!model || model.trim() === '') return null;

  const modelMap: Record<string, string> = {
    'haiku': 'claude-haiku-3-5-20250925',
    'sonnet': 'claude-sonnet-4-5-20250929',
    'opus': 'claude-opus-4-20250514'
  };

  return modelMap[model.toLowerCase()] || DEFAULT_MODEL;
}

/**
 * Create posting rules from agent definition
 */
function createPostingRules(agentData: any): PostingRules {
  // Extract any posting-related metadata from the agent definition
  const priority = agentData.priority || 'P2';
  const isProactive = agentData.proactive || false;

  return {
    ...DEFAULT_POSTING_RULES,
    // Adjust rate limits based on priority
    rate_limit_per_hour: priority === 'P0' ? 50 : priority === 'P1' ? 30 : 20,
    min_interval_seconds: isProactive ? 30 : 60
  };
}

/**
 * Create API schema from agent definition
 */
function createApiSchema(agentData: any): ApiSchema {
  return {
    ...DEFAULT_API_SCHEMA,
    // Future: could include agent-specific endpoints or auth requirements
  };
}

/**
 * Create safety constraints from agent definition
 */
function createSafetyConstraints(agentData: any): SafetyConstraints {
  const constraints = { ...DEFAULT_SAFETY_CONSTRAINTS };

  // Add agent-specific constraints based on usage patterns
  if (agentData.usage?.includes('financial')) {
    constraints.requires_human_review = [
      ...(constraints.requires_human_review || []),
      'financial_transactions'
    ];
  }

  return constraints;
}

/**
 * Create response style from agent definition
 */
function createResponseStyle(agentData: any): ResponseStyle {
  // Parse description or usage to infer tone
  const description = (agentData.description || '').toLowerCase();

  let tone = 'professional';
  if (description.includes('casual') || description.includes('friendly')) {
    tone = 'casual';
  } else if (description.includes('technical') || description.includes('engineering')) {
    tone = 'technical';
  }

  return {
    tone,
    length: 'concise',
    use_emojis: agentData.color ? true : false // Use emojis if agent has personality (color)
  };
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Insert or update system agent template
 */
async function upsertSystemTemplate(
  logger: Logger,
  agentData: any,
  isDryRun: boolean
): Promise<void> {
  const templateData = {
    name: agentData.name,
    version: 1,
    model: transformModelName(agentData.model),
    posting_rules: JSON.stringify(createPostingRules(agentData)),
    api_schema: JSON.stringify(createApiSchema(agentData)),
    safety_constraints: JSON.stringify(createSafetyConstraints(agentData)),
    default_personality: agentData.description || null,
    default_response_style: JSON.stringify(createResponseStyle(agentData))
  };

  logger.info(`  Template data prepared for: ${templateData.name}`);
  logger.info(`    Model: ${templateData.model || 'default'}`);
  logger.info(`    Personality: ${templateData.default_personality?.substring(0, 60)}...`);

  if (isDryRun) {
    logger.info('  [DRY-RUN] Would insert/update system_agent_templates');
    return;
  }

  const query = `
    INSERT INTO system_agent_templates (
      name, version, model, posting_rules, api_schema,
      safety_constraints, default_personality, default_response_style
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
    RETURNING name;
  `;

  const result = await postgresManager.query(query, [
    templateData.name,
    templateData.version,
    templateData.model,
    templateData.posting_rules,
    templateData.api_schema,
    templateData.safety_constraints,
    templateData.default_personality,
    templateData.default_response_style
  ]);

  logger.success(`  ✓ Upserted system template: ${result.rows[0].name}`);
}

/**
 * Insert or update user customization for anonymous user
 */
async function upsertUserCustomization(
  logger: Logger,
  agentData: any,
  isDryRun: boolean
): Promise<void> {
  const customizationData = {
    user_id: ANONYMOUS_USER,
    agent_template: agentData.name,
    custom_name: null, // User can customize later
    personality: agentData.description || null,
    interests: agentData.usage ? [agentData.usage] : null,
    response_style: JSON.stringify(createResponseStyle(agentData)),
    enabled: true
  };

  logger.info(`  Customization data prepared for: ${customizationData.agent_template}`);
  logger.info(`    User: ${customizationData.user_id}`);
  logger.info(`    Enabled: ${customizationData.enabled}`);

  if (isDryRun) {
    logger.info('  [DRY-RUN] Would insert/update user_agent_customizations');
    return;
  }

  const query = `
    INSERT INTO user_agent_customizations (
      user_id, agent_template, custom_name, personality,
      interests, response_style, enabled
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, agent_template) DO UPDATE SET
      personality = EXCLUDED.personality,
      interests = EXCLUDED.interests,
      response_style = EXCLUDED.response_style,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()
    RETURNING agent_template;
  `;

  const result = await postgresManager.query(query, [
    customizationData.user_id,
    customizationData.agent_template,
    customizationData.custom_name,
    customizationData.personality,
    customizationData.interests ? JSON.stringify(customizationData.interests) : null,
    customizationData.response_style,
    customizationData.enabled
  ]);

  logger.success(`  ✓ Upserted user customization: ${result.rows[0].agent_template}`);
}

/**
 * Validate database connection
 */
async function validateDatabaseConnection(logger: Logger): Promise<boolean> {
  try {
    const isHealthy = await postgresManager.healthCheck();
    if (!isHealthy) {
      logger.error('Database health check failed');
      return false;
    }
    logger.success('Database connection validated');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database', error);
    return false;
  }
}

/**
 * Validate required tables exist
 */
async function validateTablesExist(logger: Logger): Promise<boolean> {
  try {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('system_agent_templates', 'user_agent_customizations')
      ORDER BY table_name;
    `;

    const result = await postgresManager.query(query, []);
    const tables = result.rows.map((row: any) => row.table_name);

    if (tables.length !== 2) {
      logger.error(`Missing required tables. Found: ${tables.join(', ')}`);
      logger.error('Please run database migrations first.');
      return false;
    }

    logger.success(`Required tables validated: ${tables.join(', ')}`);
    return true;
  } catch (error) {
    logger.error('Failed to validate tables', error);
    return false;
  }
}

// ============================================================================
// Migration Orchestration
// ============================================================================

/**
 * Migrate a single agent to the database
 */
async function migrateAgent(
  logger: Logger,
  agentData: any,
  isDryRun: boolean
): Promise<MigrationResult> {
  try {
    logger.info(`Migrating agent: ${agentData.name}`);

    // Validate required fields
    if (!agentData.name || !agentData.description) {
      throw new Error('Missing required fields: name and description');
    }

    // Step 1: Upsert system template
    await upsertSystemTemplate(logger, agentData, isDryRun);

    // Step 2: Upsert user customization
    await upsertUserCustomization(logger, agentData, isDryRun);

    logger.success(`✓ Successfully migrated: ${agentData.name}\n`);

    return {
      success: true,
      agentName: agentData.name
    };
  } catch (error) {
    logger.error(`✗ Failed to migrate: ${agentData.name}`, error);
    return {
      success: false,
      agentName: agentData.name,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main migration function
 */
async function migrateAllAgents(isDryRun: boolean = false): Promise<MigrationStats> {
  const logger = new Logger(isDryRun);

  logger.section('Production Agent Migration');

  if (isDryRun) {
    logger.warn('RUNNING IN DRY-RUN MODE - No database changes will be made');
  }

  const stats: MigrationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    results: []
  };

  try {
    // Step 1: Validate database connection
    logger.section('Step 1: Database Validation');

    if (!isDryRun) {
      const dbConnected = await validateDatabaseConnection(logger);
      if (!dbConnected) {
        throw new Error('Database connection validation failed');
      }

      const tablesExist = await validateTablesExist(logger);
      if (!tablesExist) {
        throw new Error('Required tables do not exist');
      }
    } else {
      logger.info('[DRY-RUN] Skipping database validation');
    }

    // Step 2: Discover agents
    logger.section('Step 2: Agent Discovery');
    logger.info(`Scanning directory: ${AGENT_DIRECTORY}`);

    const discoveryService = new AgentDiscoveryService(AGENT_DIRECTORY);
    const agents = await discoveryService.discoverAgents();

    logger.success(`Discovered ${agents.length} agents`);
    agents.forEach((agent, index) => {
      logger.info(`  ${index + 1}. ${agent.name} - ${agent.description.substring(0, 60)}...`);
    });

    stats.total = agents.length;

    // Step 3: Migrate each agent
    logger.section('Step 3: Agent Migration');

    for (const agent of agents) {
      const result = await migrateAgent(logger, agent, isDryRun);
      stats.results.push(result);

      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
    }

    // Step 4: Summary
    logger.section('Migration Summary');
    logger.info(`Total agents: ${stats.total}`);
    logger.success(`Successful: ${stats.successful}`);

    if (stats.failed > 0) {
      logger.error(`Failed: ${stats.failed}`);
      logger.error('\nFailed agents:');
      stats.results
        .filter(r => !r.success)
        .forEach(r => logger.error(`  - ${r.agentName}: ${r.error}`));
    }

    if (stats.skipped > 0) {
      logger.warn(`Skipped: ${stats.skipped}`);
    }

    if (isDryRun) {
      logger.warn('\nDRY-RUN COMPLETE - No changes were made to the database');
    } else {
      logger.success('\nMIGRATION COMPLETE');
    }

    return stats;

  } catch (error) {
    logger.error('Migration failed', error);
    throw error;
  } finally {
    // Close database connection
    if (!isDryRun) {
      await postgresManager.close();
      logger.info('Database connection closed');
    }
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');

  try {
    const stats = await migrateAllAgents(isDryRun);

    // Exit with error code if any migrations failed
    if (stats.failed > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n\x1b[31mFATAL ERROR:\x1b[0m Migration script failed');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for testing
export { migrateAllAgents, migrateAgent, transformModelName };
