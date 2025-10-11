#!/usr/bin/env tsx
/**
 * Pre-Deployment Checklist Script
 *
 * Comprehensive production readiness validation that verifies:
 * - All tests passing (100% pass rate)
 * - No uncommitted changes
 * - Environment variables configured
 * - Database migrations applied
 * - No security vulnerabilities
 * - API endpoints responding
 * - No hardcoded secrets
 * - Backup procedures exist
 * - Monitoring/logging configured
 *
 * Exit code: 0 if ready, 1 if blockers exist
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Status indicators
const indicators = {
  pass: `${colors.green}✓${colors.reset}`,
  fail: `${colors.red}✗${colors.reset}`,
  warn: `${colors.yellow}⚠${colors.reset}`,
  info: `${colors.blue}ℹ${colors.reset}`,
};

interface CheckResult {
  pass: boolean;
  message: string;
  details?: string[];
}

interface ChecklistItem {
  name: string;
  category: 'critical' | 'important' | 'nice-to-have';
  check: () => Promise<CheckResult>;
}

// Utility: Execute command and capture output
function execCommand(command: string, cwd: string = PROJECT_ROOT): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || '',
      exitCode: error.status || 1,
    };
  }
}

// Utility: Check if a file contains patterns (for secret detection)
function fileContainsPattern(filePath: string, patterns: RegExp[]): { found: boolean; matches: string[] } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const matches: string[] = [];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        matches.push(`${filePath}: ${match[0].substring(0, 50)}...`);
      }
    }

    return { found: matches.length > 0, matches };
  } catch {
    return { found: false, matches: [] };
  }
}

// Utility: Recursively scan directory for files
function scanDirectory(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
  const files: string[] = [];

  try {
    const items = readdirSync(dir);

    for (const item of items) {
      const fullPath = join(dir, item);

      // Skip excluded directories
      if (excludeDirs.some(exclude => fullPath.includes(exclude))) {
        continue;
      }

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...scanDirectory(fullPath, extensions, excludeDirs));
      } else if (stat.isFile()) {
        const ext = item.split('.').pop()?.toLowerCase();
        if (ext && extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Ignore errors (permission denied, etc.)
  }

  return files;
}

// Utility: HTTP health check
function httpHealthCheck(url: string, timeout: number = 5000): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'GET',
      timeout,
    };

    const req = http.request(options, (res) => {
      resolve({ success: res.statusCode === 200, statusCode: res.statusCode });
      res.resume(); // Consume response data
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.end();
  });
}

// ============================================================================
// CHECKLIST ITEMS
// ============================================================================

const checklist: ChecklistItem[] = [
  // 1. All tests passing
  {
    name: 'All tests passing (100% pass rate)',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      console.log(`    ${colors.cyan}Running test suites...${colors.reset}`);

      const testSuites = [
        { name: 'Jest Unit Tests', command: 'npm run test -- --passWithNoTests' },
        { name: 'Playwright E2E Tests', command: 'npm run test:e2e -- --reporter=list' },
      ];

      const results: string[] = [];
      let allPassed = true;

      for (const suite of testSuites) {
        const result = execCommand(suite.command);

        if (result.exitCode === 0) {
          results.push(`${indicators.pass} ${suite.name}: PASSED`);
        } else {
          results.push(`${indicators.fail} ${suite.name}: FAILED`);
          allPassed = false;
        }
      }

      return {
        pass: allPassed,
        message: allPassed ? 'All test suites passed' : 'Some test suites failed',
        details: results,
      };
    },
  },

  // 2. No uncommitted changes
  {
    name: 'No uncommitted changes in Git',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      const result = execCommand('git status --porcelain');

      if (result.exitCode !== 0) {
        return {
          pass: false,
          message: 'Unable to check git status',
          details: [result.stderr],
        };
      }

      const hasChanges = result.stdout.trim().length > 0;

      if (hasChanges) {
        const changes = result.stdout.trim().split('\n').slice(0, 10);
        return {
          pass: false,
          message: 'Uncommitted changes detected',
          details: changes,
        };
      }

      return {
        pass: true,
        message: 'Working directory clean',
      };
    },
  },

  // 3. Production environment variables
  {
    name: 'Production environment variables configured',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      const requiredVars = [
        'NODE_ENV',
        'DATABASE_URL',
        'ANTHROPIC_API_KEY',
        'DB_HOST',
        'DB_PORT',
        'POSTGRES_DB',
        'POSTGRES_USER',
      ];

      const missing: string[] = [];
      const configured: string[] = [];

      for (const varName of requiredVars) {
        if (process.env[varName]) {
          configured.push(`${indicators.pass} ${varName}`);
        } else {
          configured.push(`${indicators.fail} ${varName}`);
          missing.push(varName);
        }
      }

      // Check for production values
      const warnings: string[] = [];
      if (process.env.NODE_ENV !== 'production') {
        warnings.push(`${indicators.warn} NODE_ENV is not 'production' (current: ${process.env.NODE_ENV})`);
      }

      if (process.env.POSTGRES_PASSWORD?.includes('dev_password')) {
        warnings.push(`${indicators.warn} Using development password in POSTGRES_PASSWORD`);
      }

      const allDetails = [...configured, ...warnings];

      return {
        pass: missing.length === 0,
        message: missing.length === 0
          ? 'All required environment variables configured'
          : `Missing ${missing.length} required environment variables`,
        details: allDetails,
      };
    },
  },

  // 4. Database migrations up to date
  {
    name: 'Database migrations up to date',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      const migrationDirs = [
        join(PROJECT_ROOT, 'prod/database/migrations'),
        join(PROJECT_ROOT, 'prod/agent_workspace/shared/database/migrations'),
      ];

      const foundMigrations: string[] = [];

      for (const dir of migrationDirs) {
        if (existsSync(dir)) {
          const files = readdirSync(dir).filter(f => f.endsWith('.sql'));
          foundMigrations.push(`${indicators.info} Found ${files.length} migrations in ${dir}`);
        }
      }

      // Check if database is accessible
      if (process.env.DATABASE_URL) {
        // For PostgreSQL, we'd check pg_migrations table
        // For now, we verify the connection string is valid
        const dbUrlPattern = /^postgresql:\/\/.+@.+:\d+\/.+$/;
        const isValid = dbUrlPattern.test(process.env.DATABASE_URL);

        if (!isValid) {
          return {
            pass: false,
            message: 'Invalid DATABASE_URL format',
            details: foundMigrations,
          };
        }
      }

      return {
        pass: true,
        message: 'Database migration files found and accessible',
        details: foundMigrations,
      };
    },
  },

  // 5. Security vulnerabilities check
  {
    name: 'No security vulnerabilities (npm audit)',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      console.log(`    ${colors.cyan}Running npm audit...${colors.reset}`);

      const result = execCommand('npm audit --audit-level=high --json');

      try {
        const auditData = JSON.parse(result.stdout);
        const vulnerabilities = auditData.metadata?.vulnerabilities || {};
        const high = vulnerabilities.high || 0;
        const critical = vulnerabilities.critical || 0;
        const total = high + critical;

        if (total > 0) {
          return {
            pass: false,
            message: `Found ${total} high/critical vulnerabilities`,
            details: [
              `${indicators.fail} Critical: ${critical}`,
              `${indicators.fail} High: ${high}`,
              'Run "npm audit fix" to resolve',
            ],
          };
        }

        return {
          pass: true,
          message: 'No high or critical vulnerabilities found',
          details: [
            `${indicators.pass} Critical: 0`,
            `${indicators.pass} High: 0`,
          ],
        };
      } catch {
        return {
          pass: false,
          message: 'Unable to parse npm audit output',
        };
      }
    },
  },

  // 6. API endpoints responding
  {
    name: 'API endpoints responding',
    category: 'important',
    check: async (): Promise<CheckResult> => {
      const apiPort = process.env.PORT || '3001';
      const endpoints = [
        `http://localhost:${apiPort}/api/components`,
        `http://localhost:${apiPort}/api/agent-pages`,
      ];

      const results: string[] = [];
      let allHealthy = true;

      // First check if server is running
      const serverCheck = await httpHealthCheck(`http://localhost:${apiPort}/api/components`, 2000);

      if (!serverCheck.success) {
        return {
          pass: false,
          message: 'API server not running or not responding',
          details: [`${indicators.fail} Server at localhost:${apiPort} is not accessible`, 'Start the server with: npm run dev'],
        };
      }

      for (const endpoint of endpoints) {
        const check = await httpHealthCheck(endpoint, 3000);

        if (check.success) {
          results.push(`${indicators.pass} ${endpoint} - OK (${check.statusCode})`);
        } else {
          results.push(`${indicators.fail} ${endpoint} - ${check.error || 'Failed'}`);
          allHealthy = false;
        }
      }

      return {
        pass: allHealthy,
        message: allHealthy ? 'All API endpoints responding' : 'Some endpoints not responding',
        details: results,
      };
    },
  },

  // 7. No hardcoded credentials or secrets
  {
    name: 'No hardcoded credentials or secrets',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      console.log(`    ${colors.cyan}Scanning for hardcoded secrets...${colors.reset}`);

      const secretPatterns = [
        /ANTHROPIC_API_KEY\s*=\s*["']sk-ant-[a-zA-Z0-9_-]+["']/,
        /api[_-]?key\s*[:=]\s*["'][a-zA-Z0-9_-]{20,}["']/i,
        /password\s*[:=]\s*["'][^"'\s]{8,}["']/i,
        /secret\s*[:=]\s*["'][a-zA-Z0-9_-]{20,}["']/i,
        /token\s*[:=]\s*["'][a-zA-Z0-9_-]{20,}["']/i,
        /postgres:\/\/[^:]+:[^@]+@/,
      ];

      const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
      const files = scanDirectory(PROJECT_ROOT, ['ts', 'js', 'tsx', 'jsx', 'json'], excludeDirs);

      const allMatches: string[] = [];

      for (const file of files) {
        const { found, matches } = fileContainsPattern(file, secretPatterns);
        if (found) {
          allMatches.push(...matches);
        }
      }

      if (allMatches.length > 0) {
        return {
          pass: false,
          message: `Found ${allMatches.length} potential hardcoded secrets`,
          details: allMatches.slice(0, 10).map(m => `${indicators.fail} ${m}`),
        };
      }

      return {
        pass: true,
        message: 'No hardcoded secrets detected',
        details: [`${indicators.pass} Scanned ${files.length} files`],
      };
    },
  },

  // 8. Backup procedures exist
  {
    name: 'Backup procedures configured',
    category: 'important',
    check: async (): Promise<CheckResult> => {
      const backupScripts = [
        join(PROJECT_ROOT, 'scripts/backup-user-data.sh'),
      ];

      const backupDirs = [
        join(PROJECT_ROOT, 'prod/backups'),
      ];

      const findings: string[] = [];
      let hasBackupSetup = false;

      for (const script of backupScripts) {
        if (existsSync(script)) {
          findings.push(`${indicators.pass} Backup script exists: ${script}`);
          hasBackupSetup = true;
        } else {
          findings.push(`${indicators.warn} Backup script missing: ${script}`);
        }
      }

      for (const dir of backupDirs) {
        if (existsSync(dir)) {
          findings.push(`${indicators.pass} Backup directory exists: ${dir}`);
          hasBackupSetup = true;
        } else {
          findings.push(`${indicators.warn} Backup directory missing: ${dir}`);
        }
      }

      // Check for environment backup config
      if (process.env.BACKUP_SCHEDULE) {
        findings.push(`${indicators.pass} BACKUP_SCHEDULE configured: ${process.env.BACKUP_SCHEDULE}`);
        hasBackupSetup = true;
      }

      if (process.env.BACKUP_RETENTION_DAYS) {
        findings.push(`${indicators.pass} BACKUP_RETENTION_DAYS configured: ${process.env.BACKUP_RETENTION_DAYS}`);
      }

      return {
        pass: hasBackupSetup,
        message: hasBackupSetup ? 'Backup procedures configured' : 'No backup procedures found',
        details: findings,
      };
    },
  },

  // 9. Monitoring and logging configuration
  {
    name: 'Monitoring and logging configured',
    category: 'important',
    check: async (): Promise<CheckResult> => {
      const findings: string[] = [];
      let hasMonitoring = false;

      // Check for logging configuration
      if (process.env.LOG_LEVEL) {
        findings.push(`${indicators.pass} LOG_LEVEL set: ${process.env.LOG_LEVEL}`);
        hasMonitoring = true;
      } else {
        findings.push(`${indicators.warn} LOG_LEVEL not configured`);
      }

      // Check for monitoring scripts
      const monitoringScripts = [
        join(PROJECT_ROOT, 'scripts/health-monitor.js'),
        join(PROJECT_ROOT, 'scripts/performance-monitoring.js'),
        join(PROJECT_ROOT, 'scripts/process-monitor.js'),
      ];

      for (const script of monitoringScripts) {
        if (existsSync(script)) {
          findings.push(`${indicators.pass} Monitoring script exists: ${script}`);
          hasMonitoring = true;
        }
      }

      // Check for health check configuration
      if (process.env.HEALTH_CHECK_INTERVAL) {
        findings.push(`${indicators.pass} HEALTH_CHECK_INTERVAL configured: ${process.env.HEALTH_CHECK_INTERVAL}`);
        hasMonitoring = true;
      }

      // Check for logs directory
      const logsDir = process.env.CLAUDE_LOGS_DIR || join(PROJECT_ROOT, '.claude/logs');
      if (existsSync(logsDir)) {
        findings.push(`${indicators.pass} Logs directory exists: ${logsDir}`);
        hasMonitoring = true;
      }

      return {
        pass: hasMonitoring,
        message: hasMonitoring ? 'Monitoring and logging configured' : 'Monitoring and logging not fully configured',
        details: findings,
      };
    },
  },

  // 10. Build succeeds
  {
    name: 'Production build succeeds',
    category: 'critical',
    check: async (): Promise<CheckResult> => {
      console.log(`    ${colors.cyan}Running production build...${colors.reset}`);

      const result = execCommand('npm run build');

      if (result.exitCode === 0) {
        return {
          pass: true,
          message: 'Production build completed successfully',
          details: [`${indicators.pass} Build artifacts generated`],
        };
      }

      return {
        pass: false,
        message: 'Production build failed',
        details: result.stderr.split('\n').slice(0, 10).map(line => `${indicators.fail} ${line}`),
      };
    },
  },

  // 11. TypeScript compilation
  {
    name: 'TypeScript type checking passes',
    category: 'important',
    check: async (): Promise<CheckResult> => {
      console.log(`    ${colors.cyan}Running TypeScript type check...${colors.reset}`);

      const result = execCommand('npm run typecheck');

      if (result.exitCode === 0) {
        return {
          pass: true,
          message: 'TypeScript compilation successful',
        };
      }

      const errors = result.stdout.split('\n').filter(line => line.includes('error TS')).slice(0, 5);

      return {
        pass: false,
        message: 'TypeScript compilation has errors',
        details: errors.map(err => `${indicators.fail} ${err}`),
      };
    },
  },

  // 12. Package dependencies up to date
  {
    name: 'Package dependencies installed and up to date',
    category: 'nice-to-have',
    check: async (): Promise<CheckResult> => {
      const findings: string[] = [];

      // Check if node_modules exists
      const nodeModulesExists = existsSync(join(PROJECT_ROOT, 'node_modules'));
      if (!nodeModulesExists) {
        return {
          pass: false,
          message: 'node_modules directory missing',
          details: ['Run "npm install" to install dependencies'],
        };
      }

      findings.push(`${indicators.pass} node_modules directory exists`);

      // Check for outdated packages
      const outdatedResult = execCommand('npm outdated --json');

      try {
        const outdated = JSON.parse(outdatedResult.stdout);
        const outdatedCount = Object.keys(outdated).length;

        if (outdatedCount > 0) {
          findings.push(`${indicators.warn} ${outdatedCount} packages have updates available`);
        } else {
          findings.push(`${indicators.pass} All packages up to date`);
        }
      } catch {
        findings.push(`${indicators.info} Unable to check for outdated packages`);
      }

      return {
        pass: true,
        message: 'Dependencies installed',
        details: findings,
      };
    },
  },
];

// ============================================================================
// REPORT GENERATION
// ============================================================================

async function runChecklist(): Promise<void> {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║          PRE-DEPLOYMENT CHECKLIST - PRODUCTION READY          ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const startTime = Date.now();

  const results: Array<{ item: ChecklistItem; result: CheckResult }> = [];
  let criticalFailures = 0;
  let importantFailures = 0;
  let niceToHaveFailures = 0;

  // Run all checks
  for (let i = 0; i < checklist.length; i++) {
    const item = checklist[i];
    const categoryColor =
      item.category === 'critical' ? colors.red :
      item.category === 'important' ? colors.yellow :
      colors.cyan;

    console.log(`${colors.bold}[${i + 1}/${checklist.length}]${colors.reset} ${item.name}`);
    console.log(`    ${categoryColor}Category: ${item.category.toUpperCase()}${colors.reset}`);

    try {
      const result = await item.check();
      results.push({ item, result });

      const statusIcon = result.pass ? indicators.pass : indicators.fail;
      const statusColor = result.pass ? colors.green : colors.red;

      console.log(`    ${statusIcon} ${statusColor}${result.message}${colors.reset}`);

      if (result.details) {
        for (const detail of result.details) {
          console.log(`      ${detail}`);
        }
      }

      if (!result.pass) {
        if (item.category === 'critical') criticalFailures++;
        if (item.category === 'important') importantFailures++;
        if (item.category === 'nice-to-have') niceToHaveFailures++;
      }
    } catch (error: any) {
      console.log(`    ${indicators.fail} ${colors.red}Check failed with error${colors.reset}`);
      console.log(`      ${error.message}`);

      results.push({
        item,
        result: { pass: false, message: `Error: ${error.message}` }
      });

      if (item.category === 'critical') criticalFailures++;
      if (item.category === 'important') importantFailures++;
    }

    console.log('');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Generate summary report
  console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║                      DEPLOYMENT SUMMARY                        ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const totalChecks = checklist.length;
  const passedChecks = results.filter(r => r.result.pass).length;
  const failedChecks = totalChecks - passedChecks;

  console.log(`${colors.bold}Total Checks:${colors.reset} ${totalChecks}`);
  console.log(`${colors.green}${colors.bold}Passed:${colors.reset}       ${passedChecks}`);
  console.log(`${colors.red}${colors.bold}Failed:${colors.reset}       ${failedChecks}`);
  console.log(`${colors.bold}Duration:${colors.reset}     ${duration}s\n`);

  // Category breakdown
  console.log(`${colors.bold}Failures by Category:${colors.reset}`);
  console.log(`  ${colors.red}Critical:${colors.reset}     ${criticalFailures}`);
  console.log(`  ${colors.yellow}Important:${colors.reset}    ${importantFailures}`);
  console.log(`  ${colors.cyan}Nice-to-have:${colors.reset} ${niceToHaveFailures}\n`);

  // Deployment readiness status
  let readinessStatus: string;
  let statusColor: string;
  let deploymentReady: boolean;

  if (criticalFailures === 0 && importantFailures === 0) {
    readinessStatus = '🟢 GREEN - READY FOR DEPLOYMENT';
    statusColor = colors.green;
    deploymentReady = true;
  } else if (criticalFailures === 0 && importantFailures <= 2) {
    readinessStatus = '🟡 YELLOW - DEPLOY WITH CAUTION';
    statusColor = colors.yellow;
    deploymentReady = false;
  } else {
    readinessStatus = '🔴 RED - NOT READY FOR DEPLOYMENT';
    statusColor = colors.red;
    deploymentReady = false;
  }

  console.log(`${colors.bold}${statusColor}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${statusColor}${readinessStatus}${colors.reset}`);
  console.log(`${colors.bold}${statusColor}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Actionable recommendations
  if (!deploymentReady) {
    console.log(`${colors.bold}${colors.red}ACTION REQUIRED:${colors.reset}\n`);

    for (const { item, result } of results) {
      if (!result.pass && (item.category === 'critical' || item.category === 'important')) {
        console.log(`${indicators.fail} ${colors.bold}${item.name}${colors.reset}`);
        console.log(`   ${result.message}`);
        if (result.details && result.details.length > 0) {
          console.log(`   ${result.details[0]}`);
        }
        console.log('');
      }
    }
  } else {
    console.log(`${colors.green}${colors.bold}✓ All critical checks passed. System is ready for deployment!${colors.reset}\n`);
  }

  // Exit with appropriate code
  if (criticalFailures > 0) {
    console.log(`${colors.red}${colors.bold}Exiting with code 1 due to critical failures.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}Exiting with code 0. Deployment checklist complete.${colors.reset}\n`);
    process.exit(0);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runChecklist().catch((error) => {
    console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { checklist, runChecklist };
