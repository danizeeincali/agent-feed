#!/usr/bin/env node
/**
 * ReasoningBank Database Initialization Script
 *
 * This script initializes the ReasoningBank SQLite database
 * with proper schema, indexes, and optimizations.
 *
 * Usage:
 *   node api-server/scripts/init-reasoningbank.js
 */

const { ReasoningBankDatabaseService } = require('../services/reasoningbank-db');
const path = require('path');

async function main() {
  console.log('='.repeat(60));
  console.log('ReasoningBank Database Initialization');
  console.log('='.repeat(60));
  console.log();

  try {
    // Initialize service
    const service = new ReasoningBankDatabaseService({
      verbose: true
    });

    console.log('Step 1: Initializing database...');
    await service.initialize();
    console.log('✅ Database initialized successfully');
    console.log();

    // Run health check
    console.log('Step 2: Running health check...');
    const health = await service.healthCheck();

    console.log('Health Check Results:');
    console.log('  Status:', health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY');
    console.log('  Database exists:', health.checks.databaseExists ? '✅' : '❌');
    console.log('  Schema valid:', health.checks.schemaValid ? '✅' : '❌');
    console.log('  Foreign keys enabled:', health.checks.foreignKeysEnabled ? '✅' : '❌');
    console.log('  WAL mode enabled:', health.checks.walModeEnabled ? '✅' : '❌');
    console.log('  Can read:', health.checks.canRead ? '✅' : '❌');
    console.log('  Can write:', health.checks.canWrite ? '✅' : '❌');

    if (health.errors.length > 0) {
      console.log('  Errors:', health.errors);
    }
    console.log();

    // Get statistics
    console.log('Step 3: Getting database statistics...');
    const stats = await service.getStats();

    console.log('Database Statistics:');
    console.log('  Total patterns:', stats.totalPatterns);
    console.log('  Total outcomes:', stats.totalOutcomes);
    console.log('  Total relationships:', stats.totalRelationships);
    console.log('  Database size:', (stats.databaseSizeMB).toFixed(2), 'MB');
    console.log('  Average confidence:', stats.avgConfidence.toFixed(2));
    console.log('  Success rate:', (stats.successRate * 100).toFixed(1) + '%');
    console.log('  Query latency:', stats.queryLatencyMs.toFixed(2), 'ms');
    console.log();

    // Create initial backup
    console.log('Step 4: Creating initial backup...');
    const backup = await service.backup();
    console.log('✅ Backup created:', backup.path);
    console.log('  Size:', (backup.sizeBytes / 1024).toFixed(2), 'KB');
    console.log('  Checksum:', backup.checksum.substring(0, 16) + '...');
    console.log();

    // Close connection
    service.close();

    console.log('='.repeat(60));
    console.log('✅ ReasoningBank initialization complete!');
    console.log('='.repeat(60));
    console.log();
    console.log('Database location:', path.join(process.cwd(), 'prod', '.reasoningbank', 'memory.db'));
    console.log('Backup location:', path.join(process.cwd(), 'prod', '.reasoningbank', 'backups'));
    console.log();

    process.exit(0);
  } catch (error) {
    console.error();
    console.error('❌ Error initializing ReasoningBank:');
    console.error(error.message);
    console.error();
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
