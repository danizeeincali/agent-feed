#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * Usage:
 *   node scripts/run-migration.js           - Run all pending migrations
 *   node scripts/run-migration.js --version - Show current schema version
 *   node scripts/run-migration.js --history - Show migration history
 */

const migrationManager = require('../migrations/index.cjs');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function run() {
  try {
    console.log('='.repeat(60));
    console.log('Database Migration Tool');
    console.log('='.repeat(60));
    console.log('');

    switch (command) {
      case '--version':
      case '-v':
        const version = migrationManager.getCurrentVersion();
        console.log(`Current schema version: ${version}`);
        break;

      case '--history':
      case '-h':
        const history = migrationManager.getHistory();
        if (history.length === 0) {
          console.log('No migrations applied yet');
        } else {
          console.log('Migration History:');
          console.log('-'.repeat(60));
          history.forEach(record => {
            console.log(`Version ${record.version}: ${record.description}`);
            console.log(`  Applied at: ${record.applied_at}`);
          });
        }
        break;

      case '--help':
        console.log('Usage:');
        console.log('  node scripts/run-migration.js           Run all pending migrations');
        console.log('  node scripts/run-migration.js --version Show current schema version');
        console.log('  node scripts/run-migration.js --history Show migration history');
        console.log('  node scripts/run-migration.js --help    Show this help message');
        break;

      default:
        // Run migrations
        migrationManager.runMigrations();
        break;
    }

    console.log('');
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('ERROR:', error.message);
    console.error('');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

run();
