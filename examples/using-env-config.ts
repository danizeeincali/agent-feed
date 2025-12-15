/**
 * Example: Using Environment Configuration
 *
 * This file demonstrates how to use the environment configuration system.
 */

import * as dotenv from 'dotenv';
import { validateEnvironmentOrThrow } from '../src/utils/env-validator';
import env from '../src/config/env';

// Load environment variables from .env file
dotenv.config();

// Example 1: Validate environment at startup
console.log('='.repeat(80));
console.log('Example 1: Validate Environment');
console.log('='.repeat(80));

try {
  validateEnvironmentOrThrow({
    createMissingDirs: true, // Create missing directories automatically
  });
  console.log('✅ Environment validation successful!\n');
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Example 2: Access typed environment configuration
console.log('='.repeat(80));
console.log('Example 2: Access Environment Configuration');
console.log('='.repeat(80));

console.log('\nDirectory Paths:');
console.log(`  Workspace: ${env.paths.workspace}`);
console.log(`  Project: ${env.paths.project}`);
console.log(`  Claude Config: ${env.paths.claude.config}`);
console.log(`  Agent Templates: ${env.paths.agents.templates}`);

console.log('\nDatabase Configuration:');
console.log(`  URL: ${env.database.url}`);
console.log(`  Use PostgreSQL: ${env.database.usePostgres}`);
console.log(`  Pool Min: ${env.database.pool.min}`);
console.log(`  Pool Max: ${env.database.pool.max}`);

console.log('\nAPI Configuration:');
console.log(`  Anthropic Key: ${env.api.anthropic.key.substring(0, 10)}...`);
console.log(`  Agent Model: ${env.api.anthropic.agentModel}`);
console.log(`  AVI Model: ${env.api.anthropic.aviModel}`);

console.log('\nApplication Settings:');
console.log(`  Environment: ${env.app.env}`);
console.log(`  Is Development: ${env.app.isDevelopment}`);
console.log(`  Is Production: ${env.app.isProduction}`);
console.log(`  Log Level: ${env.app.logLevel}`);

console.log('\nWorker Configuration:');
console.log(`  Max Agents: ${env.workers.maxAgents}`);
console.log(`  Retry Attempts: ${env.workers.retryMaxAttempts}`);

// Example 3: Use configuration in application code
console.log('\n' + '='.repeat(80));
console.log('Example 3: Using Config in Application Code');
console.log('='.repeat(80));

// Database connection example
function createDatabaseConnection() {
  const config = {
    connectionString: env.database.url,
    pool: {
      min: env.database.pool.min,
      max: env.database.pool.max,
      idleTimeoutMillis: env.database.pool.idleTimeout,
      connectionTimeoutMillis: env.database.pool.connectionTimeout,
    },
  };

  console.log('\nDatabase Connection Config:');
  console.log(JSON.stringify(config, null, 2));
  return config;
}

// Logger configuration example
function createLogger() {
  const config = {
    level: env.app.logLevel,
    format: env.app.isDevelopment ? 'dev' : 'json',
    silent: env.app.isTest,
  };

  console.log('\nLogger Config:');
  console.log(JSON.stringify(config, null, 2));
  return config;
}

// Agent worker configuration example
function createWorkerPool() {
  const config = {
    maxWorkers: env.workers.maxAgents,
    retryAttempts: env.workers.retryMaxAttempts,
    workspaceDir: env.paths.agents.workspace,
    templatesDir: env.paths.agents.templates,
  };

  console.log('\nWorker Pool Config:');
  console.log(JSON.stringify(config, null, 2));
  return config;
}

// Execute examples
createDatabaseConnection();
createLogger();
createWorkerPool();

// Example 4: Conditional configuration based on environment
console.log('\n' + '='.repeat(80));
console.log('Example 4: Environment-Specific Configuration');
console.log('='.repeat(80));

function getEnvironmentSpecificConfig() {
  if (env.app.isDevelopment) {
    console.log('\n📝 Development Mode:');
    console.log('  - Detailed logging enabled');
    console.log('  - Auto-create directories');
    console.log('  - Permissive CORS');
    console.log('  - Source maps enabled');
  } else if (env.app.isProduction) {
    console.log('\n🚀 Production Mode:');
    console.log('  - Minimal logging');
    console.log('  - Strict security');
    console.log('  - Performance optimized');
    console.log('  - Error tracking enabled');
  } else if (env.app.isTest) {
    console.log('\n🧪 Test Mode:');
    console.log('  - Silent logging');
    console.log('  - In-memory database');
    console.log('  - Fast mode enabled');
    console.log('  - Coverage enabled');
  }

  return {
    logging: {
      level: env.app.logLevel,
      pretty: env.app.isDevelopment,
    },
    security: {
      strict: env.app.isProduction,
    },
    performance: {
      optimize: env.app.isProduction,
    },
  };
}

const specificConfig = getEnvironmentSpecificConfig();
console.log('\nGenerated Config:');
console.log(JSON.stringify(specificConfig, null, 2));

console.log('\n' + '='.repeat(80));
console.log('Examples completed successfully!');
console.log('='.repeat(80));
