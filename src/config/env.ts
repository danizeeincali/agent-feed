/**
 * Environment Configuration Module
 *
 * Centralized access to validated environment variables.
 * Import this module to access typed environment configuration.
 */

import { getRequiredEnvVar, getEnvVar, getBooleanEnvVar, getNumberEnvVar } from '../utils/env-validator';

/**
 * Directory paths configuration
 */
export const paths = {
  workspace: getRequiredEnvVar('WORKSPACE_ROOT'),
  project: getRequiredEnvVar('PROJECT_ROOT'),
  claude: {
    root: getRequiredEnvVar('CLAUDE_PROD_DIR'),
    config: getRequiredEnvVar('CLAUDE_CONFIG_DIR'),
    memory: getRequiredEnvVar('CLAUDE_MEMORY_DIR'),
    logs: getRequiredEnvVar('CLAUDE_LOGS_DIR'),
  },
  agents: {
    root: getRequiredEnvVar('AGENTS_DIR'),
    workspace: getRequiredEnvVar('AGENT_WORKSPACE_DIR'),
    templates: getRequiredEnvVar('AGENT_TEMPLATES_DIR'),
    config: getRequiredEnvVar('AGENTS_CONFIG_PATH'),
  },
  database: {
    dir: getRequiredEnvVar('DATABASE_DIR'),
    tokenAnalytics: getRequiredEnvVar('TOKEN_ANALYTICS_DB_PATH'),
  },
} as const;

/**
 * Database configuration
 */
export const database = {
  url: getRequiredEnvVar('DATABASE_URL'),
  postgres: {
    db: getEnvVar('POSTGRES_DB', 'avidm_dev'),
    user: getEnvVar('POSTGRES_USER', 'postgres'),
    password: getEnvVar('POSTGRES_PASSWORD', ''),
    host: getEnvVar('DB_HOST', 'localhost'),
    port: getNumberEnvVar('DB_PORT', 5432),
  },
  pool: {
    min: getNumberEnvVar('DB_POOL_MIN', 4),
    max: getNumberEnvVar('DB_POOL_MAX', 16),
    idleTimeout: getNumberEnvVar('DB_IDLE_TIMEOUT_MS', 30000),
    connectionTimeout: getNumberEnvVar('DB_CONNECTION_TIMEOUT_MS', 2000),
    statementTimeout: getNumberEnvVar('DB_STATEMENT_TIMEOUT_MS', 30000),
  },
  usePostgres: getBooleanEnvVar('USE_POSTGRES', true),
} as const;

/**
 * API configuration
 */
export const api = {
  anthropic: {
    key: getRequiredEnvVar('ANTHROPIC_API_KEY'),
    agentModel: getEnvVar('AGENT_MODEL', 'claude-sonnet-4-5-20250929'),
    aviModel: getEnvVar('AVI_MODEL', 'claude-sonnet-4-5-20250929'),
  },
  platform: {
    key: getEnvVar('PLATFORM_API_KEY', ''),
  },
} as const;

/**
 * Application configuration
 */
export const app = {
  env: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  isTest: getEnvVar('NODE_ENV', 'development') === 'test',
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
} as const;

/**
 * Health check configuration
 */
export const health = {
  checkInterval: getNumberEnvVar('HEALTH_CHECK_INTERVAL', 30000),
  aviContextLimit: getNumberEnvVar('AVI_CONTEXT_LIMIT', 50000),
} as const;

/**
 * Agent worker configuration
 */
export const workers = {
  maxAgents: getNumberEnvVar('MAX_AGENT_WORKERS', 10),
  retryMaxAttempts: getNumberEnvVar('RETRY_MAX_ATTEMPTS', 3),
} as const;

/**
 * Backup configuration
 */
export const backup = {
  retentionDays: getNumberEnvVar('BACKUP_RETENTION_DAYS', 7),
  schedule: getEnvVar('BACKUP_SCHEDULE', '0 2 * * *'),
} as const;

/**
 * Container configuration
 */
export const container = {
  name: getEnvVar('CONTAINER_NAME', 'agent-feed-postgres-phase1'),
} as const;

/**
 * Full environment configuration object
 */
export const env = {
  paths,
  database,
  api,
  app,
  health,
  workers,
  backup,
  container,
} as const;

/**
 * Type-safe environment configuration
 */
export type EnvConfig = typeof env;

/**
 * Export default configuration
 */
export default env;
