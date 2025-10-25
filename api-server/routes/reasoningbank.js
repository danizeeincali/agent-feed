/**
 * ReasoningBank API Routes
 *
 * Provides health checks, statistics, and management endpoints
 * for the ReasoningBank memory system.
 *
 * Endpoints:
 * - GET /api/reasoningbank/health - Health check
 * - GET /api/reasoningbank/stats - Database statistics
 * - POST /api/reasoningbank/backup - Create backup
 * - POST /api/reasoningbank/vacuum - Run VACUUM
 */

import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();

// Configuration from environment
const DB_PATH = process.env.REASONINGBANK_DB_PATH || join(process.cwd(), 'prod', '.reasoningbank', 'memory.db');
const BACKUP_DIR = process.env.REASONINGBANK_BACKUP_DIR || join(process.cwd(), 'prod', '.reasoningbank', 'backups');
const ENABLED = process.env.REASONINGBANK_ENABLED === 'true';

// Lazy database connection
let db = null;

function getDatabase() {
  if (!db && ENABLED) {
    try {
      db = new Database(DB_PATH);
      console.log('[ReasoningBank] Database connection opened:', DB_PATH);
    } catch (error) {
      console.error('[ReasoningBank] Failed to connect to database:', error.message);
      throw error;
    }
  }
  return db;
}

/**
 * GET /api/reasoningbank/health
 *
 * Comprehensive health check for ReasoningBank system.
 * Returns database status, schema validity, and performance metrics.
 */
router.get('/health', async (req, res) => {
  if (!ENABLED) {
    return res.json({
      status: 'disabled',
      message: 'ReasoningBank is not enabled (set REASONINGBANK_ENABLED=true)'
    });
  }

  const health = {
    healthy: true,
    checks: {
      databaseExists: false,
      schemaValid: false,
      foreignKeysEnabled: false,
      walModeEnabled: false,
      canRead: false,
      canWrite: false,
    },
    errors: [],
    timestamp: Date.now(),
  };

  try {
    // Check 1: Database file exists
    health.checks.databaseExists = fs.existsSync(DB_PATH);
    if (!health.checks.databaseExists) {
      health.errors.push('Database file does not exist');
      health.healthy = false;
      return res.json(health);
    }

    // Get database connection
    const database = getDatabase();

    // Check 2: Schema validation
    try {
      const tables = database.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master
        WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships')
      `).get();

      health.checks.schemaValid = tables.count === 3;
      if (!health.checks.schemaValid) {
        health.errors.push(`Schema validation failed: expected 3 tables, found ${tables.count}`);
        health.healthy = false;
      }
    } catch (error) {
      health.errors.push(`Schema validation error: ${error.message}`);
      health.healthy = false;
    }

    // Check 3: Foreign keys enabled
    try {
      const fkStatus = database.pragma('foreign_keys', { simple: true });
      health.checks.foreignKeysEnabled = fkStatus === 1;
      if (!health.checks.foreignKeysEnabled) {
        health.errors.push('Foreign keys are not enabled');
        health.healthy = false;
      }
    } catch (error) {
      health.errors.push(`Foreign key check error: ${error.message}`);
    }

    // Check 4: WAL mode enabled
    try {
      const journalMode = database.pragma('journal_mode', { simple: true });
      health.checks.walModeEnabled = journalMode === 'wal';
      if (!health.checks.walModeEnabled) {
        health.errors.push(`Journal mode is ${journalMode}, expected WAL`);
      }
    } catch (error) {
      health.errors.push(`WAL mode check error: ${error.message}`);
    }

    // Check 5: Read capability
    try {
      database.prepare('SELECT COUNT(*) FROM patterns').get();
      health.checks.canRead = true;
    } catch (error) {
      health.errors.push(`Read check failed: ${error.message}`);
      health.healthy = false;
    }

    // Check 6: Write capability
    try {
      const testId = `health-check-${Date.now()}`;
      const now = Date.now();
      const embedding = Buffer.alloc(4096, 0);

      database.prepare(`
        INSERT INTO patterns (id, content, embedding, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(testId, 'Health check test pattern', embedding, now, now);

      database.prepare('DELETE FROM patterns WHERE id = ?').run(testId);
      health.checks.canWrite = true;
    } catch (error) {
      health.errors.push(`Write check failed: ${error.message}`);
      health.healthy = false;
    }

    res.json(health);
  } catch (error) {
    health.errors.push(`Health check failed: ${error.message}`);
    health.healthy = false;
    res.status(500).json(health);
  }
});

/**
 * GET /api/reasoningbank/stats
 *
 * Returns comprehensive database statistics including:
 * - Total patterns, outcomes, relationships
 * - Database size
 * - Average confidence and success rate
 * - Query latency metrics
 */
router.get('/stats', async (req, res) => {
  if (!ENABLED) {
    return res.json({
      status: 'disabled',
      message: 'ReasoningBank is not enabled'
    });
  }

  const startTime = Date.now();

  try {
    const database = getDatabase();

    // Total patterns
    const totalPatterns = database.prepare('SELECT COUNT(*) as count FROM patterns').get();

    // Total outcomes
    const totalOutcomes = database.prepare('SELECT COUNT(*) as count FROM pattern_outcomes').get();

    // Total relationships
    const totalRelationships = database.prepare('SELECT COUNT(*) as count FROM pattern_relationships').get();

    // Database size
    const pageCount = database.pragma('page_count', { simple: true });
    const pageSize = database.pragma('page_size', { simple: true });
    const databaseSizeBytes = pageCount * pageSize;

    // Average confidence and success rate
    const metrics = database.prepare(`
      SELECT
        AVG(confidence) as avg_confidence,
        CASE
          WHEN SUM(total_usage) > 0
          THEN CAST(SUM(success_count) AS REAL) / SUM(total_usage)
          ELSE 0.0
        END as success_rate
      FROM patterns
    `).get();

    // Namespace, agent, and skill counts
    const namespaceCount = database.prepare('SELECT COUNT(DISTINCT namespace) as count FROM patterns').get();
    const agentCount = database.prepare('SELECT COUNT(DISTINCT agent_id) as count FROM patterns WHERE agent_id IS NOT NULL').get();
    const skillCount = database.prepare('SELECT COUNT(DISTINCT skill_id) as count FROM patterns WHERE skill_id IS NOT NULL').get();

    // Pattern age stats
    const now = Date.now();
    const ageStats = database.prepare(`
      SELECT
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM patterns
    `).get();

    const queryLatencyMs = Date.now() - startTime;

    res.json({
      totalPatterns: totalPatterns.count,
      totalOutcomes: totalOutcomes.count,
      totalRelationships: totalRelationships.count,
      databaseSizeBytes,
      databaseSizeMB: databaseSizeBytes / (1024 * 1024),
      avgConfidence: metrics.avg_confidence || 0.5,
      successRate: metrics.success_rate || 0.0,
      namespaceCount: namespaceCount.count,
      agentCount: agentCount.count,
      skillCount: skillCount.count,
      oldestPatternAge: ageStats.oldest ? now - ageStats.oldest : 0,
      newestPatternAge: ageStats.newest ? now - ageStats.newest : 0,
      queryLatencyMs,
      timestamp: now
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get database stats',
      message: error.message
    });
  }
});

/**
 * POST /api/reasoningbank/backup
 *
 * Creates a backup of the database.
 * Returns backup path, size, and checksum.
 */
router.post('/backup', async (req, res) => {
  if (!ENABLED) {
    return res.status(400).json({
      error: 'ReasoningBank is not enabled'
    });
  }

  try {
    const database = getDatabase();

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Generate backup filename
    const timestamp = new Date().toISOString().split('T')[0];
    const backupFilename = `memory-${timestamp}-manual.db`;
    const backupPath = join(BACKUP_DIR, backupFilename);

    // Create backup
    database.backup(backupPath);

    // Wait for backup to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get backup info
    const backupStats = fs.statSync(backupPath);
    const backupData = fs.readFileSync(backupPath);
    const checksum = crypto.createHash('sha256').update(backupData).digest('hex');

    res.json({
      success: true,
      backup: {
        path: backupPath,
        sizeBytes: backupStats.size,
        sizeMB: backupStats.size / (1024 * 1024),
        checksum,
        createdAt: Date.now()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Backup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/reasoningbank/vacuum
 *
 * Runs VACUUM to reclaim space and optimize database.
 */
router.post('/vacuum', async (req, res) => {
  if (!ENABLED) {
    return res.status(400).json({
      error: 'ReasoningBank is not enabled'
    });
  }

  try {
    const database = getDatabase();

    const startTime = Date.now();
    database.prepare('VACUUM').run();
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      durationMs: duration
    });
  } catch (error) {
    res.status(500).json({
      error: 'VACUUM failed',
      message: error.message
    });
  }
});

// Cleanup on process exit
process.on('SIGTERM', () => {
  if (db) {
    db.close();
    console.log('[ReasoningBank] Database connection closed');
  }
});

process.on('SIGINT', () => {
  if (db) {
    db.close();
    console.log('[ReasoningBank] Database connection closed');
  }
});

export default router;
