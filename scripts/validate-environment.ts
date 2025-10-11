#!/usr/bin/env tsx

/**
 * Environment Validation Script
 *
 * Validates all environment variables, paths, permissions, database connectivity,
 * and system requirements for the Agent Feed application.
 *
 * Exit codes:
 * - 0: All validations passed
 * - 1: One or more validations failed
 */

import { existsSync, accessSync, constants, statSync, mkdirSync, writeFileSync } from 'fs';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as os from 'os';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Status symbols
const symbols = {
  pass: `${colors.green}✅${colors.reset}`,
  fail: `${colors.red}❌${colors.reset}`,
  warn: `${colors.yellow}⚠️${colors.reset}`,
};

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
  timestamp: string;
}

const results: ValidationResult[] = [];
let hasFailures = false;

/**
 * Add a validation result
 */
function addResult(
  category: string,
  check: string,
  status: 'pass' | 'fail' | 'warn',
  message: string,
  details?: any
): void {
  const result: ValidationResult = {
    category,
    check,
    status,
    message,
    details,
    timestamp: new Date().toISOString(),
  };

  results.push(result);

  if (status === 'fail') {
    hasFailures = true;
  }

  // Print to console
  const symbol = symbols[status];
  const coloredCategory = `${colors.cyan}[${category}]${colors.reset}`;
  const coloredCheck = `${colors.bright}${check}${colors.reset}`;

  console.log(`${symbol} ${coloredCategory} ${coloredCheck}`);
  console.log(`   ${colors.gray}${message}${colors.reset}`);

  if (details && status !== 'pass') {
    console.log(`   ${colors.gray}Details: ${JSON.stringify(details, null, 2)}${colors.reset}`);
  }
}

/**
 * Print section header
 */
function printSection(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Validate environment variable exists and is not empty
 */
function validateEnvVar(name: string, required: boolean = true): string | undefined {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    if (required) {
      addResult(
        'Environment Variables',
        name,
        'fail',
        `Required environment variable ${name} is not set or is empty`,
        { expected: 'non-empty string', actual: value || 'undefined' }
      );
    } else {
      addResult(
        'Environment Variables',
        name,
        'warn',
        `Optional environment variable ${name} is not set`,
        { expected: 'string', actual: 'undefined' }
      );
    }
    return undefined;
  }

  addResult(
    'Environment Variables',
    name,
    'pass',
    `${name} is set`,
    { value: name.includes('PASSWORD') || name.includes('KEY') ? '***REDACTED***' : value }
  );

  return value;
}

/**
 * Validate all 12 required environment variables from .env.template
 */
function validateEnvironmentVariables(): void {
  printSection('Environment Variables Validation');

  // Core paths (12 required variables based on .env.template structure)
  validateEnvVar('WORKSPACE_ROOT');
  validateEnvVar('PROJECT_ROOT');
  validateEnvVar('CLAUDE_PROD_DIR');
  validateEnvVar('CLAUDE_CONFIG_DIR');
  validateEnvVar('CLAUDE_MEMORY_DIR');
  validateEnvVar('CLAUDE_LOGS_DIR');
  validateEnvVar('AGENTS_DIR');
  validateEnvVar('AGENT_WORKSPACE_DIR');
  validateEnvVar('AGENT_TEMPLATES_DIR');
  validateEnvVar('DATABASE_DIR');
  validateEnvVar('TOKEN_ANALYTICS_DB_PATH');
  validateEnvVar('AGENTS_CONFIG_PATH');

  // Database configuration
  validateEnvVar('POSTGRES_DB');
  validateEnvVar('POSTGRES_USER');
  validateEnvVar('POSTGRES_PASSWORD');
  validateEnvVar('DB_HOST');
  validateEnvVar('DB_PORT');
  validateEnvVar('DATABASE_URL');

  // API configuration
  const apiKey = validateEnvVar('ANTHROPIC_API_KEY');
  if (apiKey && (apiKey === 'your_api_key_here' || apiKey.length < 10)) {
    addResult(
      'Environment Variables',
      'ANTHROPIC_API_KEY',
      'warn',
      'ANTHROPIC_API_KEY appears to be a placeholder or invalid',
      { hint: 'Set a valid Anthropic API key' }
    );
  }

  // Model configuration
  validateEnvVar('AGENT_MODEL');
  validateEnvVar('AVI_MODEL');

  // Application environment
  validateEnvVar('NODE_ENV');
  validateEnvVar('LOG_LEVEL', false);
  validateEnvVar('USE_POSTGRES');

  // Connection pool settings
  validateEnvVar('DB_POOL_MIN', false);
  validateEnvVar('DB_POOL_MAX', false);
  validateEnvVar('DB_IDLE_TIMEOUT_MS', false);
  validateEnvVar('DB_CONNECTION_TIMEOUT_MS', false);
  validateEnvVar('DB_STATEMENT_TIMEOUT_MS', false);
}

/**
 * Validate paths exist and are accessible
 */
function validatePaths(): void {
  printSection('Path Validation');

  const pathVars = [
    'WORKSPACE_ROOT',
    'PROJECT_ROOT',
    'CLAUDE_PROD_DIR',
    'CLAUDE_CONFIG_DIR',
    'CLAUDE_MEMORY_DIR',
    'CLAUDE_LOGS_DIR',
    'AGENTS_DIR',
    'AGENT_WORKSPACE_DIR',
    'AGENT_TEMPLATES_DIR',
    'DATABASE_DIR',
  ];

  for (const varName of pathVars) {
    const pathValue = process.env[varName];

    if (!pathValue) {
      continue; // Already reported in env var validation
    }

    if (!existsSync(pathValue)) {
      addResult(
        'Path Validation',
        varName,
        'fail',
        `Path does not exist: ${pathValue}`,
        { path: pathValue, suggestion: `Create directory: mkdir -p ${pathValue}` }
      );
      continue;
    }

    // Check if path is a directory
    const stats = statSync(pathValue);
    if (!stats.isDirectory()) {
      addResult(
        'Path Validation',
        varName,
        'fail',
        `Path exists but is not a directory: ${pathValue}`,
        { path: pathValue, type: 'file' }
      );
      continue;
    }

    addResult(
      'Path Validation',
      varName,
      'pass',
      `Directory exists and is accessible: ${pathValue}`,
      { path: pathValue }
    );
  }

  // Validate file paths
  const tokenDbPath = process.env.TOKEN_ANALYTICS_DB_PATH;
  if (tokenDbPath) {
    const tokenDbDir = path.dirname(tokenDbPath);
    if (!existsSync(tokenDbDir)) {
      addResult(
        'Path Validation',
        'TOKEN_ANALYTICS_DB_PATH (parent dir)',
        'fail',
        `Parent directory does not exist: ${tokenDbDir}`,
        { path: tokenDbPath, suggestion: `Create directory: mkdir -p ${tokenDbDir}` }
      );
    } else {
      addResult(
        'Path Validation',
        'TOKEN_ANALYTICS_DB_PATH (parent dir)',
        'pass',
        `Parent directory exists: ${tokenDbDir}`
      );
    }
  }

  const agentsConfigPath = process.env.AGENTS_CONFIG_PATH;
  if (agentsConfigPath) {
    const agentsConfigDir = path.dirname(agentsConfigPath);
    if (!existsSync(agentsConfigDir)) {
      addResult(
        'Path Validation',
        'AGENTS_CONFIG_PATH (parent dir)',
        'fail',
        `Parent directory does not exist: ${agentsConfigDir}`,
        { path: agentsConfigPath, suggestion: `Create directory: mkdir -p ${agentsConfigDir}` }
      );
    } else {
      addResult(
        'Path Validation',
        'AGENTS_CONFIG_PATH (parent dir)',
        'pass',
        `Parent directory exists: ${agentsConfigDir}`
      );
    }
  }
}

/**
 * Validate file permissions
 */
function validatePermissions(): void {
  printSection('File Permissions Validation');

  const writablePaths = [
    'CLAUDE_PROD_DIR',
    'CLAUDE_CONFIG_DIR',
    'CLAUDE_MEMORY_DIR',
    'CLAUDE_LOGS_DIR',
    'DATABASE_DIR',
    'AGENT_WORKSPACE_DIR',
  ];

  for (const varName of writablePaths) {
    const pathValue = process.env[varName];

    if (!pathValue || !existsSync(pathValue)) {
      continue; // Already reported in previous validations
    }

    try {
      // Check read permission
      accessSync(pathValue, constants.R_OK);

      // Check write permission
      accessSync(pathValue, constants.W_OK);

      addResult(
        'File Permissions',
        varName,
        'pass',
        `Directory has read and write permissions: ${pathValue}`
      );
    } catch (error) {
      addResult(
        'File Permissions',
        varName,
        'fail',
        `Directory lacks required permissions: ${pathValue}`,
        {
          path: pathValue,
          error: error instanceof Error ? error.message : String(error),
          suggestion: `Fix permissions: chmod -R u+rw ${pathValue}`
        }
      );
    }
  }

  // Check executable scripts
  const scriptPath = path.join(process.env.WORKSPACE_ROOT || '', 'scripts');
  if (existsSync(scriptPath)) {
    try {
      const scripts = ['run-avi.sh', 'run-avi-cli.sh'];

      for (const script of scripts) {
        const scriptFile = path.join(scriptPath, script);

        if (existsSync(scriptFile)) {
          try {
            accessSync(scriptFile, constants.X_OK);
            addResult(
              'File Permissions',
              script,
              'pass',
              `Script is executable: ${scriptFile}`
            );
          } catch (error) {
            addResult(
              'File Permissions',
              script,
              'warn',
              `Script exists but is not executable: ${scriptFile}`,
              { suggestion: `Make executable: chmod +x ${scriptFile}` }
            );
          }
        }
      }
    } catch (error) {
      // Scripts not found - not critical
    }
  }
}

/**
 * Validate PostgreSQL database connectivity
 */
async function validatePostgresConnection(): Promise<void> {
  printSection('PostgreSQL Database Connectivity');

  const usePostgres = process.env.USE_POSTGRES === 'true';

  if (!usePostgres) {
    addResult(
      'PostgreSQL',
      'Connection',
      'warn',
      'PostgreSQL is disabled (USE_POSTGRES=false), skipping validation',
      { setting: 'USE_POSTGRES=false' }
    );
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    addResult(
      'PostgreSQL',
      'Connection',
      'fail',
      'DATABASE_URL is not set, cannot test PostgreSQL connection'
    );
    return;
  }

  let pool: Pool | null = null;

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000'),
      max: 1, // Only need one connection for testing
    });

    // Test connection
    const client = await pool.connect();

    try {
      // Run a simple query to verify database is accessible
      const result = await client.query('SELECT version(), current_database(), current_user');
      const row = result.rows[0];

      addResult(
        'PostgreSQL',
        'Connection',
        'pass',
        'Successfully connected to PostgreSQL database',
        {
          database: row.current_database,
          user: row.current_user,
          version: row.version.split(' ').slice(0, 2).join(' '), // Simplified version
        }
      );

      // Check if database has tables
      const tablesResult = await client.query(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      const tableCount = parseInt(tablesResult.rows[0].table_count);

      if (tableCount === 0) {
        addResult(
          'PostgreSQL',
          'Schema',
          'warn',
          'Database is empty (no tables found)',
          {
            tableCount,
            suggestion: 'Run migrations to initialize database schema'
          }
        );
      } else {
        addResult(
          'PostgreSQL',
          'Schema',
          'pass',
          `Database has ${tableCount} table(s)`,
          { tableCount }
        );
      }

    } finally {
      client.release();
    }

  } catch (error) {
    addResult(
      'PostgreSQL',
      'Connection',
      'fail',
      'Failed to connect to PostgreSQL database',
      {
        error: error instanceof Error ? error.message : String(error),
        connectionString: databaseUrl.replace(/:[^:@]+@/, ':***@'), // Redact password
        suggestion: 'Check if PostgreSQL is running and credentials are correct'
      }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

/**
 * Validate SQLite database connectivity
 */
function validateSqliteConnection(): void {
  printSection('SQLite Database Connectivity');

  const tokenDbPath = process.env.TOKEN_ANALYTICS_DB_PATH;

  if (!tokenDbPath) {
    addResult(
      'SQLite',
      'TOKEN_ANALYTICS_DB_PATH',
      'fail',
      'TOKEN_ANALYTICS_DB_PATH is not set'
    );
    return;
  }

  const dbDir = path.dirname(tokenDbPath);

  if (!existsSync(dbDir)) {
    addResult(
      'SQLite',
      'TOKEN_ANALYTICS_DB_PATH',
      'fail',
      `Database directory does not exist: ${dbDir}`,
      { suggestion: `Create directory: mkdir -p ${dbDir}` }
    );
    return;
  }

  try {
    // Try to open/create the database
    const db = new Database(tokenDbPath);

    try {
      // Test a simple query
      const result = db.prepare('SELECT sqlite_version() as version').get() as { version: string };

      addResult(
        'SQLite',
        'TOKEN_ANALYTICS_DB',
        'pass',
        'Successfully connected to SQLite database',
        {
          path: tokenDbPath,
          version: result.version,
        }
      );

      // Check if database has tables
      const tables = db.prepare(`
        SELECT COUNT(*) as count
        FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).get() as { count: number };

      if (tables.count === 0) {
        addResult(
          'SQLite',
          'Schema',
          'warn',
          'Database is empty (no tables found)',
          {
            tableCount: tables.count,
            suggestion: 'Database will be initialized on first use'
          }
        );
      } else {
        addResult(
          'SQLite',
          'Schema',
          'pass',
          `Database has ${tables.count} table(s)`,
          { tableCount: tables.count }
        );
      }

    } finally {
      db.close();
    }

  } catch (error) {
    addResult(
      'SQLite',
      'TOKEN_ANALYTICS_DB',
      'fail',
      'Failed to open SQLite database',
      {
        error: error instanceof Error ? error.message : String(error),
        path: tokenDbPath,
      }
    );
  }
}

/**
 * Validate Node.js version
 */
function validateNodeVersion(): void {
  printSection('Node.js Version Validation');

  const currentVersion = process.version;
  const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);

  // Node.js 18+ is required for modern ES modules and features
  const requiredMajor = 18;

  if (majorVersion < requiredMajor) {
    addResult(
      'Node.js',
      'Version',
      'fail',
      `Node.js version ${currentVersion} is too old`,
      {
        current: currentVersion,
        required: `>= ${requiredMajor}.0.0`,
        suggestion: `Upgrade Node.js to version ${requiredMajor} or higher`
      }
    );
  } else {
    addResult(
      'Node.js',
      'Version',
      'pass',
      `Node.js version ${currentVersion} meets requirements`,
      {
        current: currentVersion,
        required: `>= ${requiredMajor}.0.0`,
      }
    );
  }
}

/**
 * Validate npm package integrity
 */
function validateNpmPackages(): void {
  printSection('NPM Package Integrity Validation');

  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();

  // Check if node_modules exists
  const nodeModulesPath = path.join(workspaceRoot, 'node_modules');

  if (!existsSync(nodeModulesPath)) {
    addResult(
      'NPM',
      'node_modules',
      'fail',
      'node_modules directory not found',
      {
        path: nodeModulesPath,
        suggestion: 'Run: npm install'
      }
    );
    return;
  }

  addResult(
    'NPM',
    'node_modules',
    'pass',
    'node_modules directory exists'
  );

  // Check package.json exists
  const packageJsonPath = path.join(workspaceRoot, 'package.json');

  if (!existsSync(packageJsonPath)) {
    addResult(
      'NPM',
      'package.json',
      'fail',
      'package.json not found',
      { path: packageJsonPath }
    );
    return;
  }

  try {
    // Run npm ls to check for missing dependencies
    execSync('npm ls --depth=0', {
      cwd: workspaceRoot,
      stdio: 'pipe',
      encoding: 'utf-8'
    });

    addResult(
      'NPM',
      'Dependencies',
      'pass',
      'All npm dependencies are installed'
    );

  } catch (error) {
    // npm ls exits with non-zero if there are missing packages
    addResult(
      'NPM',
      'Dependencies',
      'warn',
      'Some npm dependencies may be missing or have issues',
      {
        suggestion: 'Run: npm install',
        hint: 'Use "npm ls" to see details'
      }
    );
  }
}

/**
 * Validate Git repository state
 */
function validateGitRepository(): void {
  printSection('Git Repository Validation');

  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
  const gitDir = path.join(workspaceRoot, '.git');

  if (!existsSync(gitDir)) {
    addResult(
      'Git',
      'Repository',
      'warn',
      'Not a git repository',
      { path: workspaceRoot }
    );
    return;
  }

  addResult(
    'Git',
    'Repository',
    'pass',
    'Git repository detected'
  );

  try {
    // Get current branch
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspaceRoot,
      encoding: 'utf-8'
    }).trim();

    addResult(
      'Git',
      'Branch',
      'pass',
      `Current branch: ${branch}`,
      { branch }
    );

    // Check for uncommitted changes
    const status = execSync('git status --porcelain', {
      cwd: workspaceRoot,
      encoding: 'utf-8'
    });

    if (status.trim()) {
      const lines = status.trim().split('\n').length;
      addResult(
        'Git',
        'Working Directory',
        'warn',
        `${lines} uncommitted change(s) detected`,
        {
          changeCount: lines,
          hint: 'Use "git status" to see changes'
        }
      );
    } else {
      addResult(
        'Git',
        'Working Directory',
        'pass',
        'Working directory is clean'
      );
    }

  } catch (error) {
    addResult(
      'Git',
      'Status',
      'warn',
      'Unable to check git status',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Validate disk space availability
 */
function validateDiskSpace(): void {
  printSection('Disk Space Validation');

  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();

  try {
    // Use df command to check disk space (works on Linux/Mac)
    const output = execSync(`df -k "${workspaceRoot}"`, {
      encoding: 'utf-8'
    });

    const lines = output.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Unexpected df output');
    }

    // Parse df output (format: Filesystem 1K-blocks Used Available Use% Mounted on)
    const parts = lines[1].trim().split(/\s+/);
    const availableKB = parseInt(parts[3]);
    const availableGB = availableKB / (1024 * 1024);

    const minRequiredGB = 2;

    if (availableGB < minRequiredGB) {
      addResult(
        'Disk Space',
        'Available Space',
        'fail',
        `Insufficient disk space: ${availableGB.toFixed(2)} GB available`,
        {
          available: `${availableGB.toFixed(2)} GB`,
          required: `>= ${minRequiredGB} GB`,
          suggestion: 'Free up disk space before continuing'
        }
      );
    } else if (availableGB < minRequiredGB * 2) {
      addResult(
        'Disk Space',
        'Available Space',
        'warn',
        `Low disk space: ${availableGB.toFixed(2)} GB available`,
        {
          available: `${availableGB.toFixed(2)} GB`,
          recommended: `>= ${minRequiredGB * 2} GB`,
          suggestion: 'Consider freeing up disk space'
        }
      );
    } else {
      addResult(
        'Disk Space',
        'Available Space',
        'pass',
        `Sufficient disk space: ${availableGB.toFixed(2)} GB available`,
        { available: `${availableGB.toFixed(2)} GB` }
      );
    }

  } catch (error) {
    addResult(
      'Disk Space',
      'Check',
      'warn',
      'Unable to check disk space',
      {
        error: error instanceof Error ? error.message : String(error),
        platform: os.platform()
      }
    );
  }
}

/**
 * Generate JSON report
 */
function generateReport(): void {
  printSection('Generating Validation Report');

  const reportPath = path.join(
    process.env.WORKSPACE_ROOT || process.cwd(),
    'logs',
    'env-validation-report.json'
  );

  // Ensure logs directory exists
  const logsDir = path.dirname(reportPath);
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
    },
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warn').length,
    },
    results,
  };

  try {
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`\n${colors.green}Report generated: ${reportPath}${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}Failed to generate report: ${error}${colors.reset}`);
  }
}

/**
 * Print final summary
 */
function printSummary(): void {
  console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}VALIDATION SUMMARY${colors.reset}`);
  console.log(`${'='.repeat(80)}\n`);

  const total = results.length;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;

  console.log(`Total Checks:  ${total}`);
  console.log(`${colors.green}Passed:        ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed:        ${failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings:      ${warnings}${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}${colors.bright}❌ VALIDATION FAILED${colors.reset}`);
    console.log(`${colors.red}Please fix the errors above before proceeding.${colors.reset}\n`);
  } else if (warnings > 0) {
    console.log(`${colors.yellow}${colors.bright}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log(`${colors.yellow}Review the warnings above for potential issues.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}${colors.bright}✅ ALL VALIDATIONS PASSED${colors.reset}`);
    console.log(`${colors.green}Your environment is properly configured!${colors.reset}\n`);
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              Agent Feed - Environment Validation Script                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    // Run all validations
    validateEnvironmentVariables();
    validatePaths();
    validatePermissions();
    await validatePostgresConnection();
    validateSqliteConnection();
    validateNodeVersion();
    validateNpmPackages();
    validateGitRepository();
    validateDiskSpace();

    // Generate report
    generateReport();

    // Print summary
    printSummary();

    // Exit with appropriate code
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}FATAL ERROR:${colors.reset}`);
    console.error(`${colors.red}${error}${colors.reset}\n`);
    process.exit(1);
  }
}

// Run validation
main();
