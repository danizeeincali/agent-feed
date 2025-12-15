#!/usr/bin/env tsx
/**
 * System Health Monitoring Script
 *
 * Performs comprehensive health checks on all system components:
 * - API server health endpoint
 * - PostgreSQL connection pool status
 * - Database query performance
 * - Memory usage monitoring
 * - Disk space checks
 * - Agent registration verification
 * - Database write capability
 * - Long-running query detection
 * - File watcher status
 *
 * Usage:
 *   tsx scripts/health-check.ts                # Single run
 *   tsx scripts/health-check.ts --continuous   # Run every 30s
 *
 * Exit codes:
 *   0 - System healthy
 *   1 - Critical issues detected
 */

import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

// Configuration
const API_URL = 'http://localhost:3001';
const EXPECTED_AGENT_COUNT = 23;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();
const CRITICAL_PATHS = [
  WORKSPACE_ROOT,
  path.join(WORKSPACE_ROOT, 'data'),
  path.join(WORKSPACE_ROOT, '.claude'),
  path.join(WORKSPACE_ROOT, 'agents')
];

// Health metric interface
interface HealthMetric {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  value?: any;
  threshold?: any;
  message: string;
  details?: any;
  timestamp: string;
}

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function getStatusSymbol(status: HealthMetric['status']): string {
  switch (status) {
    case 'healthy':
      return colorize('✓', 'green');
    case 'degraded':
      return colorize('⚠', 'yellow');
    case 'critical':
      return colorize('✗', 'red');
  }
}

/**
 * Check API server health endpoint
 */
async function checkAPIHealth(): Promise<HealthMetric> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const req = http.get(`${API_URL}/health`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        try {
          const healthData = JSON.parse(data);

          if (res.statusCode === 200 && healthData.success) {
            const heapPercentage = healthData.data?.memory?.heapPercentage || 0;

            let status: HealthMetric['status'] = 'healthy';
            let message = `API responding in ${responseTime}ms`;

            if (heapPercentage > 90) {
              status = 'critical';
              message = `High memory usage: ${heapPercentage}%`;
            } else if (heapPercentage > 80) {
              status = 'degraded';
              message = `Elevated memory usage: ${heapPercentage}%`;
            }

            resolve({
              name: 'API Server Health',
              status,
              value: responseTime,
              threshold: 1000,
              message,
              details: healthData.data,
              timestamp: new Date().toISOString()
            });
          } else {
            resolve({
              name: 'API Server Health',
              status: 'critical',
              message: `API returned error status: ${res.statusCode}`,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          resolve({
            name: 'API Server Health',
            status: 'critical',
            message: `Failed to parse response: ${error}`,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        name: 'API Server Health',
        status: 'critical',
        message: `Cannot connect to API: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        name: 'API Server Health',
        status: 'critical',
        message: 'Request timeout after 5s',
        timestamp: new Date().toISOString()
      });
    });
  });
}

/**
 * Check PostgreSQL connection pool status
 */
async function checkPostgresPool(): Promise<HealthMetric> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    min: parseInt(process.env.DB_POOL_MIN || '4'),
    max: parseInt(process.env.DB_POOL_MAX || '16'),
    connectionTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();

    // Query pool statistics
    const result = await client.query(`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = $1
    `, [process.env.POSTGRES_DB || 'avidm_dev']);

    client.release();

    const stats = result.rows[0];
    const totalConn = parseInt(stats.total_connections);
    const activeConn = parseInt(stats.active_connections);
    const maxConn = parseInt(process.env.DB_POOL_MAX || '16');

    const usagePercentage = (totalConn / maxConn) * 100;

    let status: HealthMetric['status'] = 'healthy';
    let message = `${totalConn}/${maxConn} connections (${activeConn} active)`;

    if (usagePercentage > 90) {
      status = 'critical';
      message = `Pool near capacity: ${totalConn}/${maxConn}`;
    } else if (usagePercentage > 75) {
      status = 'degraded';
      message = `High pool usage: ${totalConn}/${maxConn}`;
    }

    return {
      name: 'PostgreSQL Connection Pool',
      status,
      value: { total: totalConn, active: activeConn, max: maxConn },
      threshold: maxConn * 0.75,
      message,
      details: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'PostgreSQL Connection Pool',
      status: 'critical',
      message: `Pool check failed: ${error}`,
      timestamp: new Date().toISOString()
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Check database query performance
 */
async function checkDatabasePerformance(): Promise<HealthMetric> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 10000
  });

  try {
    const startTime = Date.now();

    // Sample queries to test performance
    const client = await pool.connect();

    // Test 1: Simple SELECT
    const simpleStart = Date.now();
    await client.query('SELECT 1');
    const simpleTime = Date.now() - simpleStart;

    // Test 2: Count agents
    const countStart = Date.now();
    const countResult = await client.query('SELECT COUNT(*) FROM agents WHERE user_id = $1', ['anonymous']);
    const countTime = Date.now() - countStart;

    // Test 3: Complex join query
    const joinStart = Date.now();
    await client.query(`
      SELECT a.name, COUNT(p.id) as post_count
      FROM agents a
      LEFT JOIN agent_posts p ON a.id = p.author_agent_id
      WHERE a.user_id = $1
      GROUP BY a.name
      LIMIT 10
    `, ['anonymous']);
    const joinTime = Date.now() - joinStart;

    client.release();

    const totalTime = Date.now() - startTime;
    const avgTime = (simpleTime + countTime + joinTime) / 3;

    let status: HealthMetric['status'] = 'healthy';
    let message = `Avg query time: ${avgTime.toFixed(2)}ms`;

    if (avgTime > 500) {
      status = 'critical';
      message = `Slow queries detected: avg ${avgTime.toFixed(2)}ms`;
    } else if (avgTime > 200) {
      status = 'degraded';
      message = `Queries slower than normal: avg ${avgTime.toFixed(2)}ms`;
    }

    return {
      name: 'Database Query Performance',
      status,
      value: { avgTime, simpleTime, countTime, joinTime },
      threshold: 200,
      message,
      details: {
        queries: 3,
        totalTime,
        breakdown: { simple: simpleTime, count: countTime, join: joinTime }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Database Query Performance',
      status: 'critical',
      message: `Query test failed: ${error}`,
      timestamp: new Date().toISOString()
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Monitor memory usage
 */
function checkMemoryUsage(): HealthMetric {
  const usage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(usage.rss / 1024 / 1024);
  const systemUsedMB = Math.round(usedMem / 1024 / 1024);
  const systemTotalMB = Math.round(totalMem / 1024 / 1024);

  const heapPercentage = (usage.heapUsed / usage.heapTotal) * 100;
  const systemPercentage = (usedMem / totalMem) * 100;

  let status: HealthMetric['status'] = 'healthy';
  let message = `Heap: ${heapUsedMB}/${heapTotalMB}MB (${heapPercentage.toFixed(1)}%)`;

  if (heapPercentage > 90 || systemPercentage > 95) {
    status = 'critical';
    message = `Critical memory usage: heap ${heapPercentage.toFixed(1)}%, system ${systemPercentage.toFixed(1)}%`;
  } else if (heapPercentage > 80 || systemPercentage > 85) {
    status = 'degraded';
    message = `High memory usage: heap ${heapPercentage.toFixed(1)}%, system ${systemPercentage.toFixed(1)}%`;
  }

  return {
    name: 'Memory Usage',
    status,
    value: { heapUsedMB, heapTotalMB, rssMB, systemUsedMB, systemTotalMB },
    threshold: { heap: 80, system: 85 },
    message,
    details: {
      process: { heap: heapPercentage.toFixed(1), rss: rssMB },
      system: { used: systemPercentage.toFixed(1), free: Math.round(freeMem / 1024 / 1024) }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Check disk space on critical paths
 */
function checkDiskSpace(): HealthMetric {
  const checks: any[] = [];

  for (const criticalPath of CRITICAL_PATHS) {
    try {
      if (fs.existsSync(criticalPath)) {
        // Get disk usage (simplified - works on Linux)
        const stats = fs.statfsSync ? fs.statfsSync(criticalPath) : null;

        if (stats) {
          const total = stats.blocks * stats.bsize;
          const free = stats.bfree * stats.bsize;
          const used = total - free;
          const usedPercentage = (used / total) * 100;

          checks.push({
            path: criticalPath,
            exists: true,
            total: Math.round(total / 1024 / 1024 / 1024),
            free: Math.round(free / 1024 / 1024 / 1024),
            used: usedPercentage.toFixed(1)
          });
        } else {
          checks.push({
            path: criticalPath,
            exists: true,
            note: 'statfs not available'
          });
        }
      } else {
        checks.push({
          path: criticalPath,
          exists: false
        });
      }
    } catch (error) {
      checks.push({
        path: criticalPath,
        error: String(error)
      });
    }
  }

  const missingPaths = checks.filter(c => !c.exists);
  const highUsage = checks.filter(c => c.used && parseFloat(c.used) > 90);

  let status: HealthMetric['status'] = 'healthy';
  let message = 'All paths accessible';

  if (missingPaths.length > 0) {
    status = 'critical';
    message = `Missing paths: ${missingPaths.map(p => p.path).join(', ')}`;
  } else if (highUsage.length > 0) {
    status = 'degraded';
    message = `High disk usage detected`;
  }

  return {
    name: 'Disk Space',
    status,
    value: checks,
    message,
    details: { pathsChecked: CRITICAL_PATHS.length, missing: missingPaths.length },
    timestamp: new Date().toISOString()
  };
}

/**
 * Verify agent registration count
 */
async function checkAgentRegistration(): Promise<HealthMetric> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM agents
      WHERE user_id = $1 AND status = 'active'
    `, ['anonymous']);

    client.release();

    const count = parseInt(result.rows[0].count);

    let status: HealthMetric['status'] = 'healthy';
    let message = `${count} agents registered`;

    if (count !== EXPECTED_AGENT_COUNT) {
      status = 'degraded';
      message = `Expected ${EXPECTED_AGENT_COUNT} agents, found ${count}`;
    }

    return {
      name: 'Agent Registration',
      status,
      value: count,
      threshold: EXPECTED_AGENT_COUNT,
      message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Agent Registration',
      status: 'critical',
      message: `Failed to query agents: ${error}`,
      timestamp: new Date().toISOString()
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Test database write capability
 */
async function checkDatabaseWriteCapability(): Promise<HealthMetric> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 10000
  });

  const testId = `health-check-${Date.now()}`;

  try {
    const client = await pool.connect();

    const startTime = Date.now();

    // Create test record
    await client.query(`
      INSERT INTO health_checks (id, status, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO NOTHING
    `, [testId, 'test']);

    // Verify it was written
    const verifyResult = await client.query(
      'SELECT id FROM health_checks WHERE id = $1',
      [testId]
    );

    // Delete test record
    await client.query('DELETE FROM health_checks WHERE id = $1', [testId]);

    client.release();

    const writeTime = Date.now() - startTime;

    if (verifyResult.rows.length === 0) {
      return {
        name: 'Database Write Capability',
        status: 'critical',
        message: 'Write verification failed',
        timestamp: new Date().toISOString()
      };
    }

    let status: HealthMetric['status'] = 'healthy';
    let message = `Write successful in ${writeTime}ms`;

    if (writeTime > 1000) {
      status = 'degraded';
      message = `Slow write operation: ${writeTime}ms`;
    }

    return {
      name: 'Database Write Capability',
      status,
      value: writeTime,
      threshold: 1000,
      message,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Check if health_checks table exists
    if (String(error).includes('relation "health_checks" does not exist')) {
      return {
        name: 'Database Write Capability',
        status: 'degraded',
        message: 'health_checks table not found (non-critical)',
        details: 'Table will be created automatically',
        timestamp: new Date().toISOString()
      };
    }

    return {
      name: 'Database Write Capability',
      status: 'critical',
      message: `Write test failed: ${error}`,
      timestamp: new Date().toISOString()
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Check for database deadlocks or long-running queries
 */
async function checkDatabaseIssues(): Promise<HealthMetric> {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'avidm_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    connectionTimeoutMillis: 10000
  });

  try {
    const client = await pool.connect();

    // Check for long-running queries (> 30 seconds)
    const longQueries = await client.query(`
      SELECT
        pid,
        now() - query_start as duration,
        state,
        query
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND query NOT LIKE '%pg_stat_activity%'
        AND now() - query_start > interval '30 seconds'
        AND datname = $1
    `, [process.env.POSTGRES_DB || 'avidm_dev']);

    // Check for blocking queries
    const blockingQueries = await client.query(`
      SELECT COUNT(*) as count
      FROM pg_stat_activity
      WHERE wait_event_type = 'Lock'
        AND datname = $1
    `, [process.env.POSTGRES_DB || 'avidm_dev']);

    client.release();

    const longCount = longQueries.rows.length;
    const blockedCount = parseInt(blockingQueries.rows[0].count);

    let status: HealthMetric['status'] = 'healthy';
    let message = 'No issues detected';

    if (blockedCount > 0) {
      status = 'critical';
      message = `${blockedCount} blocked queries detected`;
    } else if (longCount > 0) {
      status = 'degraded';
      message = `${longCount} long-running queries (>30s)`;
    }

    return {
      name: 'Database Issues',
      status,
      value: { longRunning: longCount, blocked: blockedCount },
      message,
      details: longQueries.rows.length > 0 ? longQueries.rows : undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      name: 'Database Issues',
      status: 'critical',
      message: `Issue check failed: ${error}`,
      timestamp: new Date().toISOString()
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Validate file watcher is active
 */
function checkFileWatcher(): HealthMetric {
  const watcherPidFile = path.join(WORKSPACE_ROOT, '.file-watcher.pid');

  try {
    if (fs.existsSync(watcherPidFile)) {
      const pid = fs.readFileSync(watcherPidFile, 'utf-8').trim();

      // Check if process is running
      try {
        process.kill(parseInt(pid), 0); // Signal 0 checks if process exists

        return {
          name: 'File Watcher',
          status: 'healthy',
          value: pid,
          message: `Active (PID: ${pid})`,
          timestamp: new Date().toISOString()
        };
      } catch {
        return {
          name: 'File Watcher',
          status: 'degraded',
          message: `PID file exists but process not running`,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      return {
        name: 'File Watcher',
        status: 'degraded',
        message: 'Not running (PID file not found)',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    return {
      name: 'File Watcher',
      status: 'degraded',
      message: `Status check failed: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run all health checks
 */
async function runHealthChecks(): Promise<HealthMetric[]> {
  console.log(colorize('\n🏥 Running System Health Checks...', 'cyan'));
  console.log(colorize('─'.repeat(60), 'blue'));

  const checks: Promise<HealthMetric>[] = [
    checkAPIHealth(),
    checkPostgresPool(),
    checkDatabasePerformance(),
    checkAgentRegistration(),
    checkDatabaseWriteCapability(),
    checkDatabaseIssues()
  ];

  // Add synchronous checks
  const syncChecks: HealthMetric[] = [
    checkMemoryUsage(),
    checkDiskSpace(),
    checkFileWatcher()
  ];

  const asyncResults = await Promise.all(checks);
  return [...asyncResults, ...syncChecks];
}

/**
 * Generate and display health report
 */
function generateReport(metrics: HealthMetric[]): { hasCritical: boolean; hasDegraded: boolean } {
  let hasCritical = false;
  let hasDegraded = false;

  console.log();

  for (const metric of metrics) {
    const symbol = getStatusSymbol(metric.status);
    console.log(`${symbol} ${colorize(metric.name, 'bright')}: ${metric.message}`);

    if (metric.details) {
      console.log(`  ${colorize('Details:', 'cyan')} ${JSON.stringify(metric.details, null, 2).split('\n').join('\n  ')}`);
    }

    if (metric.status === 'critical') hasCritical = true;
    if (metric.status === 'degraded') hasDegraded = true;
  }

  console.log(colorize('\n─'.repeat(60), 'blue'));

  // Summary
  const healthyCount = metrics.filter(m => m.status === 'healthy').length;
  const degradedCount = metrics.filter(m => m.status === 'degraded').length;
  const criticalCount = metrics.filter(m => m.status === 'critical').length;

  console.log(colorize('\nHealth Summary:', 'bright'));
  console.log(`  ${colorize('●', 'green')} Healthy: ${healthyCount}`);
  console.log(`  ${colorize('●', 'yellow')} Degraded: ${degradedCount}`);
  console.log(`  ${colorize('●', 'red')} Critical: ${criticalCount}`);

  if (hasCritical) {
    console.log(colorize('\n⚠️  CRITICAL ISSUES DETECTED', 'red'));
  } else if (hasDegraded) {
    console.log(colorize('\n⚠️  System degraded but operational', 'yellow'));
  } else {
    console.log(colorize('\n✅ All systems operational', 'green'));
  }

  return { hasCritical, hasDegraded };
}

/**
 * Save report to file
 */
function saveReport(metrics: HealthMetric[]): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(
    WORKSPACE_ROOT,
    'logs',
    `health-report-${timestamp}.json`
  );

  // Ensure logs directory exists
  const logsDir = path.dirname(reportPath);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    metrics,
    summary: {
      total: metrics.length,
      healthy: metrics.filter(m => m.status === 'healthy').length,
      degraded: metrics.filter(m => m.status === 'degraded').length,
      critical: metrics.filter(m => m.status === 'critical').length
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(colorize(`\n📄 Report saved: ${reportPath}`, 'blue'));
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous');

  if (continuous) {
    console.log(colorize('🔄 Continuous monitoring mode (every 30s)', 'cyan'));
    console.log(colorize('Press Ctrl+C to stop\n', 'cyan'));

    while (true) {
      const metrics = await runHealthChecks();
      const { hasCritical } = generateReport(metrics);
      saveReport(metrics);

      if (hasCritical) {
        console.log(colorize('\n⏸️  Critical issues detected. Monitoring continues...', 'red'));
      }

      // Wait 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log('\n' + '='.repeat(60) + '\n');
    }
  } else {
    // Single run
    const metrics = await runHealthChecks();
    const { hasCritical } = generateReport(metrics);
    saveReport(metrics);

    // Exit with appropriate code
    process.exit(hasCritical ? 1 : 0);
  }
}

// Run the script
main().catch((error) => {
  console.error(colorize(`\n❌ Fatal error: ${error}`, 'red'));
  process.exit(1);
});
