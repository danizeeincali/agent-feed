#!/usr/bin/env node

/**
 * Analytics Fix Validation Script
 *
 * Quick validation that the analytics fix is working end-to-end.
 * This script performs a rapid health check and validation.
 *
 * Usage: node scripts/validate-analytics-fix.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TokenAnalyticsWriter } from '../src/services/TokenAnalyticsWriter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'database.db');

console.log('🔍 Analytics Fix Validation');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function pass(message) {
  console.log('✅', message);
  passed++;
}

function fail(message) {
  console.log('❌', message);
  failed++;
}

function info(message) {
  console.log('ℹ️ ', message);
}

async function validate() {
  let db;

  try {
    // 1. Database connectivity
    try {
      db = new Database(DB_PATH);
      pass('Database connection successful');
    } catch (error) {
      fail('Database connection failed: ' + error.message);
      return;
    }

    // 2. Table exists
    try {
      const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='token_analytics'").get();
      if (table) {
        pass('token_analytics table exists');
      } else {
        fail('token_analytics table missing');
        return;
      }
    } catch (error) {
      fail('Table check failed: ' + error.message);
      return;
    }

    // 3. TokenAnalyticsWriter initializes
    try {
      const writer = new TokenAnalyticsWriter(db);
      if (writer.initialized) {
        pass('TokenAnalyticsWriter initialized');
      } else {
        fail('TokenAnalyticsWriter initialization failed');
      }
    } catch (error) {
      fail('Writer initialization error: ' + error.message);
    }

    // 4. Recent data check
    try {
      const lastRecord = db.prepare('SELECT MAX(timestamp) as lastWrite FROM token_analytics').get();
      if (lastRecord?.lastWrite) {
        const lastWrite = new Date(lastRecord.lastWrite);
        const now = new Date();
        const diffHours = Math.floor((now - lastWrite) / (1000 * 60 * 60));

        if (diffHours < 24) {
          pass(`Recent data found (${diffHours} hours ago)`);
        } else if (diffHours < 168) {
          info(`Last write was ${Math.floor(diffHours / 24)} days ago - may need investigation`);
        } else {
          fail(`No recent data (last write: ${Math.floor(diffHours / 24)} days ago)`);
        }
      } else {
        fail('No analytics records found');
      }
    } catch (error) {
      fail('Recent data check failed: ' + error.message);
    }

    // 5. Schema validation
    try {
      const schema = db.prepare("PRAGMA table_info(token_analytics)").all();
      const requiredColumns = ['id', 'timestamp', 'sessionId', 'inputTokens', 'outputTokens', 'estimatedCost', 'model'];
      const columnNames = schema.map(c => c.name);

      const missing = requiredColumns.filter(col => !columnNames.includes(col));
      if (missing.length === 0) {
        pass('Schema validation passed');
      } else {
        fail(`Missing columns: ${missing.join(', ')}`);
      }
    } catch (error) {
      fail('Schema validation failed: ' + error.message);
    }

    // 6. Index check
    try {
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='token_analytics'").all();
      if (indexes.length >= 2) {
        pass(`Indexes present (${indexes.length} found)`);
      } else {
        info(`Only ${indexes.length} index(es) found - performance may be impacted`);
      }
    } catch (error) {
      fail('Index check failed: ' + error.message);
    }

    // 7. Data integrity check
    try {
      const integrity = db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN totalTokens != inputTokens + outputTokens THEN 1 END) as token_mismatches,
          COUNT(CASE WHEN estimatedCost < 0 THEN 1 END) as negative_costs
        FROM token_analytics
      `).get();

      if (integrity.token_mismatches === 0 && integrity.negative_costs === 0) {
        pass(`Data integrity check passed (${integrity.total} records validated)`);
      } else {
        fail(`Data integrity issues found: ${integrity.token_mismatches} token mismatches, ${integrity.negative_costs} negative costs`);
      }
    } catch (error) {
      fail('Data integrity check failed: ' + error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Validation Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);

    if (failed === 0) {
      console.log('\n🎉 Analytics fix validated successfully!');
      console.log('The system is ready for production use.');
      console.log('\nNext steps:');
      console.log('  1. Monitor logs for [ANALYTICS DEBUG] messages');
      console.log('  2. Check health endpoint: GET /api/claude-code/analytics/health');
      console.log('  3. Run periodic health checks: node scripts/check-analytics-health.js');
      return 0;
    } else {
      console.log('\n⚠️  Validation failed. Please review errors above.');
      console.log('Run the full test suite for more details:');
      console.log('  node scripts/test-analytics-write.js');
      return 1;
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    return 1;
  } finally {
    if (db) db.close();
  }
}

// Run validation
validate().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
