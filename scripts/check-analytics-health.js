#!/usr/bin/env node

/**
 * Analytics Health Check Script
 *
 * Monitors the health of the token analytics tracking system by:
 * 1. Checking if analytics are being written
 * 2. Checking time since last write
 * 3. Analyzing write patterns and detecting gaps
 * 4. Verifying data integrity
 *
 * Usage:
 *   node scripts/check-analytics-health.js              # Basic health check
 *   node scripts/check-analytics-health.js --detailed   # Detailed analysis
 *   node scripts/check-analytics-health.js --continuous # Continuous monitoring
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DB_PATH = join(__dirname, '..', 'database.db');

// Parse command line arguments
const args = process.argv.slice(2);
const isDetailed = args.includes('--detailed');
const isContinuous = args.includes('--continuous');

/**
 * Health status thresholds (in minutes)
 */
const THRESHOLDS = {
  healthy: 30,      // < 30 minutes = healthy
  degraded: 120,    // 30-120 minutes = degraded
  unhealthy: 1440,  // 2 hours - 1 day = unhealthy
  critical: 2880    // > 2 days = critical
};

/**
 * Format time difference in human-readable format
 */
function formatTimeDiff(diffMs) {
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}

/**
 * Determine health status based on time difference
 */
function getHealthStatus(diffMinutes) {
  if (diffMinutes <= THRESHOLDS.healthy) {
    return { status: 'HEALTHY', emoji: '✅', color: '\x1b[32m' };
  } else if (diffMinutes <= THRESHOLDS.degraded) {
    return { status: 'DEGRADED', emoji: '⚠️', color: '\x1b[33m' };
  } else if (diffMinutes <= THRESHOLDS.unhealthy) {
    return { status: 'UNHEALTHY', emoji: '❌', color: '\x1b[31m' };
  } else {
    return { status: 'CRITICAL', emoji: '🚨', color: '\x1b[35m' };
  }
}

/**
 * Run health check
 */
function checkHealth(db) {
  const now = new Date();
  const results = {
    timestamp: now.toISOString(),
    status: 'UNKNOWN',
    checks: []
  };

  try {
    // Check 1: Database connection
    console.log('\n🔍 Database Connection');
    results.checks.push({
      name: 'Database Connection',
      status: 'PASS',
      message: 'Database connected successfully'
    });
    console.log('  ✅ Database connected');

    // Check 2: Table exists
    console.log('\n🔍 Table Existence');
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='token_analytics'").get();
    if (tableExists) {
      results.checks.push({
        name: 'Table Existence',
        status: 'PASS',
        message: 'token_analytics table exists'
      });
      console.log('  ✅ token_analytics table exists');
    } else {
      results.checks.push({
        name: 'Table Existence',
        status: 'FAIL',
        message: 'token_analytics table does not exist'
      });
      console.log('  ❌ token_analytics table does not exist');
      results.status = 'CRITICAL';
      return results;
    }

    // Check 3: Total records
    console.log('\n🔍 Record Count');
    const recordCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
    const totalRecords = recordCount?.count || 0;
    results.totalRecords = totalRecords;

    if (totalRecords === 0) {
      results.checks.push({
        name: 'Record Count',
        status: 'WARN',
        message: 'No analytics records found'
      });
      console.log('  ⚠️  No analytics records found');
      results.status = 'UNHEALTHY';
    } else {
      results.checks.push({
        name: 'Record Count',
        status: 'PASS',
        message: `${totalRecords} analytics records found`
      });
      console.log(`  ✅ Found ${totalRecords} analytics records`);
    }

    // Check 4: Last write timestamp
    console.log('\n🔍 Last Write Check');
    const lastRecord = db.prepare(`
      SELECT MAX(timestamp) as lastWrite
      FROM token_analytics
    `).get();

    if (lastRecord?.lastWrite) {
      const lastWriteDate = new Date(lastRecord.lastWrite);
      const diffMs = now - lastWriteDate;
      const diffMinutes = Math.floor(diffMs / 60000);

      const health = getHealthStatus(diffMinutes);
      results.lastWrite = lastRecord.lastWrite;
      results.timeSinceLastWrite = formatTimeDiff(diffMs);
      results.status = health.status;

      console.log(`  ${health.emoji} Last write: ${lastRecord.lastWrite}`);
      console.log(`  ${health.emoji} Time since last write: ${results.timeSinceLastWrite}`);
      console.log(`  ${health.emoji} Status: ${health.color}${health.status}\x1b[0m`);

      results.checks.push({
        name: 'Last Write',
        status: health.status === 'HEALTHY' ? 'PASS' : health.status === 'DEGRADED' ? 'WARN' : 'FAIL',
        message: `Last write was ${results.timeSinceLastWrite} ago`,
        lastWrite: lastRecord.lastWrite,
        diffMinutes
      });
    } else {
      results.checks.push({
        name: 'Last Write',
        status: 'FAIL',
        message: 'No records found'
      });
      console.log('  ❌ No records found');
      results.status = 'CRITICAL';
    }

    // Detailed analysis
    if (isDetailed) {
      console.log('\n📊 Detailed Analysis');

      // Check 5: Records per day (last 7 days)
      console.log('\n  📅 Records per day (last 7 days):');
      const dailyRecords = db.prepare(`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as count,
          SUM(totalTokens) as totalTokens,
          SUM(estimatedCost) as totalCost
        FROM token_analytics
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `).all();

      if (dailyRecords.length > 0) {
        dailyRecords.forEach(row => {
          console.log(`     ${row.date}: ${row.count} records, ${row.totalTokens.toLocaleString()} tokens, $${row.totalCost.toFixed(4)}`);
        });
      } else {
        console.log('     No records in the last 7 days');
      }

      // Check 6: Sessions analysis
      console.log('\n  🎯 Session Analysis:');
      const sessionStats = db.prepare(`
        SELECT
          COUNT(DISTINCT sessionId) as uniqueSessions,
          AVG(totalTokens) as avgTokensPerRecord,
          SUM(totalTokens) as totalTokens,
          SUM(estimatedCost) as totalCost
        FROM token_analytics
        WHERE timestamp >= datetime('now', '-24 hours')
      `).get();

      if (sessionStats) {
        console.log(`     Unique sessions (24h): ${sessionStats.uniqueSessions || 0}`);
        console.log(`     Avg tokens/record: ${Math.round(sessionStats.avgTokensPerRecord || 0)}`);
        console.log(`     Total tokens (24h): ${(sessionStats.totalTokens || 0).toLocaleString()}`);
        console.log(`     Total cost (24h): $${(sessionStats.totalCost || 0).toFixed(4)}`);
      }

      // Check 7: Model distribution
      console.log('\n  🤖 Model Distribution (last 24 hours):');
      const modelStats = db.prepare(`
        SELECT
          model,
          COUNT(*) as count,
          SUM(totalTokens) as totalTokens
        FROM token_analytics
        WHERE timestamp >= datetime('now', '-24 hours')
        GROUP BY model
        ORDER BY count DESC
      `).all();

      if (modelStats.length > 0) {
        modelStats.forEach(row => {
          console.log(`     ${row.model}: ${row.count} requests, ${row.totalTokens.toLocaleString()} tokens`);
        });
      } else {
        console.log('     No records in the last 24 hours');
      }

      // Check 8: Detect gaps (periods with no writes)
      console.log('\n  🕳️  Write Gap Detection (last 24 hours):');
      const gaps = db.prepare(`
        SELECT
          timestamp,
          LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
          (julianday(timestamp) - julianday(LAG(timestamp) OVER (ORDER BY timestamp))) * 24 * 60 as gap_minutes
        FROM token_analytics
        WHERE timestamp >= datetime('now', '-24 hours')
      `).all();

      const significantGaps = gaps.filter(g => g.gap_minutes > 60);
      if (significantGaps.length > 0) {
        console.log(`     Found ${significantGaps.length} gap(s) > 1 hour:`);
        significantGaps.forEach(gap => {
          console.log(`     - ${Math.round(gap.gap_minutes)} minutes gap ending at ${gap.timestamp}`);
        });
      } else {
        console.log('     No significant gaps detected');
      }
    }

    return results;

  } catch (error) {
    console.error('\n❌ Health check error:', error.message);
    results.status = 'ERROR';
    results.error = error.message;
    return results;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏥 Analytics Health Check');
  console.log('='.repeat(60));
  console.log(`Database: ${DB_PATH}`);
  console.log(`Mode: ${isContinuous ? 'CONTINUOUS' : 'SINGLE RUN'}`);
  console.log(`Detail level: ${isDetailed ? 'DETAILED' : 'BASIC'}`);
  console.log('='.repeat(60));

  let db;

  try {
    db = new Database(DB_PATH, { readonly: true });

    if (isContinuous) {
      console.log('\n📡 Starting continuous monitoring (press Ctrl+C to stop)...\n');

      // Run health check every 30 seconds
      const interval = setInterval(() => {
        const results = checkHealth(db);
        console.log('\n' + '='.repeat(60));
        console.log(`Next check in 30 seconds...`);
      }, 30000);

      // Initial check
      checkHealth(db);

      // Handle shutdown
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping continuous monitoring...');
        clearInterval(interval);
        if (db) db.close();
        process.exit(0);
      });
    } else {
      // Single run
      const results = checkHealth(db);

      console.log('\n' + '='.repeat(60));
      console.log('📋 Health Check Summary');
      console.log('='.repeat(60));
      console.log(`Status: ${results.status}`);
      console.log(`Total Records: ${results.totalRecords || 0}`);
      if (results.lastWrite) {
        console.log(`Last Write: ${results.lastWrite}`);
        console.log(`Time Since Last Write: ${results.timeSinceLastWrite}`);
      }
      console.log('');

      // Exit with appropriate code
      if (results.status === 'HEALTHY' || results.status === 'DEGRADED') {
        console.log('✅ Analytics system is operational');
        process.exit(0);
      } else {
        console.log('❌ Analytics system requires attention');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (!isContinuous && db) {
      db.close();
    }
  }
}

// Run main
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
