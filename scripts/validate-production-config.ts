#!/usr/bin/env tsx

/**
 * Production Configuration Validator
 *
 * Validates production environment configuration against security best practices
 * and common deployment mistakes. Parses .env.production.template to ensure all
 * required variables are set and properly configured.
 *
 * Key Validations:
 * - All CHANGE_ME_IN_PRODUCTION placeholders are replaced
 * - Production environment settings (NODE_ENV, LOG_LEVEL)
 * - Database pool settings are production-appropriate
 * - Security headers are configured
 * - Rate limiting is enabled
 * - CORS is properly configured
 * - SSL/TLS certificates exist if configured
 * - Password strength (minimum 16 characters)
 * - No debug mode in production
 * - No development database names
 * - No localhost in production URLs (unless intentional)
 *
 * Exit codes:
 * - 0: Production-ready
 * - 1: Critical issues found
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Status symbols
const symbols = {
  pass: `${colors.green}✅${colors.reset}`,
  fail: `${colors.red}❌${colors.reset}`,
  warn: `${colors.yellow}⚠️${colors.reset}`,
  info: `${colors.blue}ℹ️${colors.reset}`,
};

// Severity levels
type Severity = 'critical' | 'high' | 'medium' | 'low';

interface ConfigCheck {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  severity: Severity;
  message: string;
  remediation?: string;
  details?: any;
}

const checks: ConfigCheck[] = [];
let hasCriticalIssues = false;
let hasHighIssues = false;

/**
 * Add a validation check result
 */
function addCheck(
  category: string,
  name: string,
  status: 'pass' | 'fail' | 'warn',
  severity: Severity,
  message: string,
  remediation?: string,
  details?: any
): void {
  const check: ConfigCheck = {
    category,
    name,
    status,
    severity,
    message,
    remediation,
    details,
  };

  checks.push(check);

  if (status === 'fail' && severity === 'critical') {
    hasCriticalIssues = true;
  }
  if (status === 'fail' && severity === 'high') {
    hasHighIssues = true;
  }

  // Print to console
  const symbol = symbols[status];
  const severityColor =
    severity === 'critical' ? colors.red :
    severity === 'high' ? `${colors.red}${colors.bright}` :
    severity === 'medium' ? colors.yellow :
    colors.blue;

  console.log(`${symbol} ${colors.cyan}[${category}]${colors.reset} ${colors.bright}${name}${colors.reset}`);
  console.log(`   ${colors.gray}${message}${colors.reset}`);
  console.log(`   ${severityColor}Severity: ${severity}${colors.reset}`);

  if (remediation && status !== 'pass') {
    console.log(`   ${colors.yellow}Remediation: ${remediation}${colors.reset}`);
  }

  if (details && status !== 'pass') {
    console.log(`   ${colors.dim}${JSON.stringify(details, null, 2)}${colors.reset}`);
  }

  console.log('');
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
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath: string): Map<string, string> {
  const envMap = new Map<string, string>();

  if (!existsSync(filePath)) {
    return envMap;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      continue;
    }

    // Parse KEY=VALUE format
    const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      const cleanValue = value.trim().replace(/^["']|["']$/g, '');
      envMap.set(key, cleanValue);
    }
  }

  return envMap;
}

/**
 * Validate required environment variables
 */
function validateRequiredVariables(envConfig: Map<string, string>): void {
  printSection('Required Environment Variables');

  const requiredVars = [
    'NODE_ENV',
    'LOG_LEVEL',
    'PUBLIC_API_URL',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DB_HOST',
    'DB_PORT',
    'ANTHROPIC_API_KEY',
    'CORS_ORIGIN',
    'SESSION_SECRET',
    'APP_USER_PASSWORD',
  ];

  for (const varName of requiredVars) {
    const value = envConfig.get(varName);

    if (!value || value.trim() === '') {
      addCheck(
        'Required Variables',
        varName,
        'fail',
        'critical',
        `Required variable ${varName} is not set`,
        `Set ${varName} in .env.production file`
      );
    } else {
      addCheck(
        'Required Variables',
        varName,
        'pass',
        'low',
        `${varName} is configured`
      );
    }
  }
}

/**
 * Check for CHANGE_ME placeholders
 */
function validatePlaceholders(envConfig: Map<string, string>): void {
  printSection('Placeholder Detection');

  const placeholderPattern = /CHANGE_ME|your_.*_here|REPLACE_ME|TODO|FIXME/i;
  let foundPlaceholders = false;

  for (const [key, value] of envConfig.entries()) {
    if (placeholderPattern.test(value)) {
      foundPlaceholders = true;
      addCheck(
        'Placeholders',
        key,
        'fail',
        'critical',
        `Variable ${key} contains a placeholder value: "${value}"`,
        `Replace placeholder with actual production value`,
        { currentValue: value }
      );
    }
  }

  if (!foundPlaceholders) {
    addCheck(
      'Placeholders',
      'All Variables',
      'pass',
      'low',
      'No placeholder values detected'
    );
  }
}

/**
 * Validate production environment settings
 */
function validateProductionSettings(envConfig: Map<string, string>): void {
  printSection('Production Environment Settings');

  // NODE_ENV must be "production"
  const nodeEnv = envConfig.get('NODE_ENV');
  if (nodeEnv !== 'production') {
    addCheck(
      'Environment',
      'NODE_ENV',
      'fail',
      'critical',
      `NODE_ENV is set to "${nodeEnv}" but must be "production"`,
      'Set NODE_ENV=production',
      { current: nodeEnv, expected: 'production' }
    );
  } else {
    addCheck(
      'Environment',
      'NODE_ENV',
      'pass',
      'low',
      'NODE_ENV is correctly set to "production"'
    );
  }

  // LOG_LEVEL should be "info" or "warn", not "debug"
  const logLevel = envConfig.get('LOG_LEVEL');
  if (logLevel === 'debug') {
    addCheck(
      'Environment',
      'LOG_LEVEL',
      'fail',
      'high',
      'LOG_LEVEL is set to "debug" which is not recommended for production',
      'Set LOG_LEVEL to "info" or "warn"',
      { current: logLevel, recommended: ['info', 'warn'] }
    );
  } else if (logLevel === 'info' || logLevel === 'warn' || logLevel === 'error') {
    addCheck(
      'Environment',
      'LOG_LEVEL',
      'pass',
      'low',
      `LOG_LEVEL is set to "${logLevel}"`,
      undefined,
      { current: logLevel }
    );
  } else {
    addCheck(
      'Environment',
      'LOG_LEVEL',
      'warn',
      'medium',
      `LOG_LEVEL is set to "${logLevel}" which is unusual`,
      'Consider using "info" or "warn"',
      { current: logLevel, recommended: ['info', 'warn', 'error'] }
    );
  }

  // Debug endpoints should be disabled
  const debugEndpoints = envConfig.get('DEBUG_ENDPOINTS_ENABLED');
  if (debugEndpoints === 'true') {
    addCheck(
      'Environment',
      'DEBUG_ENDPOINTS_ENABLED',
      'fail',
      'high',
      'Debug endpoints are enabled in production',
      'Set DEBUG_ENDPOINTS_ENABLED=false',
      { current: 'true', expected: 'false' }
    );
  } else {
    addCheck(
      'Environment',
      'DEBUG_ENDPOINTS_ENABLED',
      'pass',
      'low',
      'Debug endpoints are disabled'
    );
  }

  // Maintenance mode check
  const maintenanceMode = envConfig.get('MAINTENANCE_MODE');
  if (maintenanceMode === 'true') {
    addCheck(
      'Environment',
      'MAINTENANCE_MODE',
      'warn',
      'medium',
      'Maintenance mode is enabled - users will not be able to access the application',
      'Set MAINTENANCE_MODE=false when ready to go live',
      { current: 'true' }
    );
  }
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig(envConfig: Map<string, string>): void {
  printSection('Database Configuration');

  // Database pool settings
  const poolMin = parseInt(envConfig.get('DB_POOL_MIN') || '0');
  const poolMax = parseInt(envConfig.get('DB_POOL_MAX') || '0');

  if (poolMin < 8) {
    addCheck(
      'Database',
      'DB_POOL_MIN',
      'fail',
      'high',
      `DB_POOL_MIN is ${poolMin} but should be at least 8 for production`,
      'Set DB_POOL_MIN to at least 8',
      { current: poolMin, minimum: 8 }
    );
  } else {
    addCheck(
      'Database',
      'DB_POOL_MIN',
      'pass',
      'low',
      `DB_POOL_MIN is ${poolMin}`
    );
  }

  if (poolMax < 16) {
    addCheck(
      'Database',
      'DB_POOL_MAX',
      'fail',
      'high',
      `DB_POOL_MAX is ${poolMax} but should be at least 16 for production`,
      'Set DB_POOL_MAX to at least 16',
      { current: poolMax, minimum: 16 }
    );
  } else {
    addCheck(
      'Database',
      'DB_POOL_MAX',
      'pass',
      'low',
      `DB_POOL_MAX is ${poolMax}`
    );
  }

  // Check for development database names
  const dbName = envConfig.get('POSTGRES_DB');
  const devPatterns = ['dev', 'test', 'local', 'development'];
  const isDevelopmentDb = devPatterns.some(pattern =>
    dbName?.toLowerCase().includes(pattern)
  );

  if (isDevelopmentDb) {
    addCheck(
      'Database',
      'POSTGRES_DB',
      'warn',
      'medium',
      `Database name "${dbName}" appears to be a development database`,
      'Use a production-specific database name',
      { current: dbName, warning: 'Contains development-related keywords' }
    );
  } else {
    addCheck(
      'Database',
      'POSTGRES_DB',
      'pass',
      'low',
      `Database name "${dbName}" looks appropriate for production`
    );
  }

  // Check database host
  const dbHost = envConfig.get('DB_HOST');
  if (dbHost === 'localhost' || dbHost === '127.0.0.1') {
    addCheck(
      'Database',
      'DB_HOST',
      'warn',
      'medium',
      `Database host is set to "${dbHost}" - ensure this is intentional for production`,
      'Consider using a dedicated database server or managed database service',
      { current: dbHost, note: 'localhost is typically for development' }
    );
  }

  // USE_POSTGRES should be true
  const usePostgres = envConfig.get('USE_POSTGRES');
  if (usePostgres !== 'true') {
    addCheck(
      'Database',
      'USE_POSTGRES',
      'fail',
      'high',
      'PostgreSQL is not enabled - SQLite is not recommended for production',
      'Set USE_POSTGRES=true',
      { current: usePostgres, expected: 'true' }
    );
  } else {
    addCheck(
      'Database',
      'USE_POSTGRES',
      'pass',
      'low',
      'PostgreSQL is enabled'
    );
  }
}

/**
 * Validate security settings
 */
function validateSecuritySettings(envConfig: Map<string, string>): void {
  printSection('Security Configuration');

  // HTTPS enforcement
  const forceHttps = envConfig.get('FORCE_HTTPS');
  if (forceHttps !== 'true') {
    addCheck(
      'Security',
      'FORCE_HTTPS',
      'fail',
      'critical',
      'HTTPS enforcement is not enabled',
      'Set FORCE_HTTPS=true',
      { current: forceHttps, expected: 'true' }
    );
  } else {
    addCheck(
      'Security',
      'FORCE_HTTPS',
      'pass',
      'low',
      'HTTPS enforcement is enabled'
    );
  }

  // HSTS (HTTP Strict Transport Security)
  const hstsMaxAge = envConfig.get('HSTS_MAX_AGE');
  if (!hstsMaxAge || parseInt(hstsMaxAge) < 31536000) {
    addCheck(
      'Security',
      'HSTS_MAX_AGE',
      'warn',
      'medium',
      'HSTS max age is not set or is too short',
      'Set HSTS_MAX_AGE to at least 31536000 (1 year)',
      { current: hstsMaxAge, recommended: '31536000' }
    );
  } else {
    addCheck(
      'Security',
      'HSTS_MAX_AGE',
      'pass',
      'low',
      `HSTS max age is ${hstsMaxAge}`
    );
  }

  // CSP (Content Security Policy)
  const cspEnabled = envConfig.get('CSP_ENABLED');
  if (cspEnabled !== 'true') {
    addCheck(
      'Security',
      'CSP_ENABLED',
      'fail',
      'high',
      'Content Security Policy is not enabled',
      'Set CSP_ENABLED=true',
      { current: cspEnabled, expected: 'true' }
    );
  } else {
    addCheck(
      'Security',
      'CSP_ENABLED',
      'pass',
      'low',
      'Content Security Policy is enabled'
    );
  }

  // X-Frame-Options
  const xFrameOptions = envConfig.get('X_FRAME_OPTIONS');
  if (xFrameOptions !== 'DENY' && xFrameOptions !== 'SAMEORIGIN') {
    addCheck(
      'Security',
      'X_FRAME_OPTIONS',
      'warn',
      'medium',
      'X-Frame-Options is not properly configured',
      'Set X_FRAME_OPTIONS to "DENY" or "SAMEORIGIN"',
      { current: xFrameOptions, recommended: ['DENY', 'SAMEORIGIN'] }
    );
  } else {
    addCheck(
      'Security',
      'X_FRAME_OPTIONS',
      'pass',
      'low',
      `X-Frame-Options is set to ${xFrameOptions}`
    );
  }

  // Rate limiting
  const rateLimitEnabled = envConfig.get('RATE_LIMIT_ENABLED');
  if (rateLimitEnabled !== 'true') {
    addCheck(
      'Security',
      'RATE_LIMIT_ENABLED',
      'fail',
      'high',
      'Rate limiting is not enabled',
      'Set RATE_LIMIT_ENABLED=true',
      { current: rateLimitEnabled, expected: 'true' }
    );
  } else {
    addCheck(
      'Security',
      'RATE_LIMIT_ENABLED',
      'pass',
      'low',
      'Rate limiting is enabled'
    );
  }

  // Session security
  const sessionSecure = envConfig.get('SESSION_COOKIE_SECURE');
  if (sessionSecure !== 'true') {
    addCheck(
      'Security',
      'SESSION_COOKIE_SECURE',
      'fail',
      'high',
      'Session cookies are not marked as secure',
      'Set SESSION_COOKIE_SECURE=true',
      { current: sessionSecure, expected: 'true' }
    );
  } else {
    addCheck(
      'Security',
      'SESSION_COOKIE_SECURE',
      'pass',
      'low',
      'Session cookies are secure'
    );
  }

  const sessionHttpOnly = envConfig.get('SESSION_COOKIE_HTTP_ONLY');
  if (sessionHttpOnly !== 'true') {
    addCheck(
      'Security',
      'SESSION_COOKIE_HTTP_ONLY',
      'fail',
      'high',
      'Session cookies are not marked as HttpOnly',
      'Set SESSION_COOKIE_HTTP_ONLY=true',
      { current: sessionHttpOnly, expected: 'true' }
    );
  } else {
    addCheck(
      'Security',
      'SESSION_COOKIE_HTTP_ONLY',
      'pass',
      'low',
      'Session cookies are HttpOnly'
    );
  }

  const sessionSameSite = envConfig.get('SESSION_COOKIE_SAME_SITE');
  if (sessionSameSite !== 'strict' && sessionSameSite !== 'lax') {
    addCheck(
      'Security',
      'SESSION_COOKIE_SAME_SITE',
      'warn',
      'medium',
      'SESSION_COOKIE_SAME_SITE is not properly configured',
      'Set SESSION_COOKIE_SAME_SITE to "strict" or "lax"',
      { current: sessionSameSite, recommended: ['strict', 'lax'] }
    );
  } else {
    addCheck(
      'Security',
      'SESSION_COOKIE_SAME_SITE',
      'pass',
      'low',
      `Session SameSite is set to ${sessionSameSite}`
    );
  }
}

/**
 * Validate password strength
 */
function validatePasswordStrength(envConfig: Map<string, string>): void {
  printSection('Password Strength Validation');

  const passwordVars = [
    'POSTGRES_PASSWORD',
    'APP_USER_PASSWORD',
    'SESSION_SECRET',
  ];

  const minLength = 16;
  const recommendedLength = 32;

  for (const varName of passwordVars) {
    const password = envConfig.get(varName);

    if (!password) {
      continue; // Already reported in required variables
    }

    if (password.length < minLength) {
      addCheck(
        'Password Strength',
        varName,
        'fail',
        'critical',
        `${varName} is only ${password.length} characters (minimum ${minLength})`,
        `Use a password/secret of at least ${minLength} characters`,
        { currentLength: password.length, minimumLength: minLength }
      );
    } else if (password.length < recommendedLength) {
      addCheck(
        'Password Strength',
        varName,
        'warn',
        'medium',
        `${varName} is ${password.length} characters (recommended ${recommendedLength})`,
        `Consider using a password/secret of at least ${recommendedLength} characters`,
        { currentLength: password.length, recommendedLength }
      );
    } else {
      addCheck(
        'Password Strength',
        varName,
        'pass',
        'low',
        `${varName} meets length requirements`
      );
    }

    // Check for weak patterns
    const weakPatterns = [
      'password',
      '123456',
      'admin',
      'qwerty',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
    ];

    const hasWeakPattern = weakPatterns.some(pattern =>
      password.toLowerCase().includes(pattern)
    );

    if (hasWeakPattern) {
      addCheck(
        'Password Strength',
        `${varName} (weak pattern)`,
        'fail',
        'critical',
        `${varName} contains common weak patterns`,
        'Use a strong, randomly generated password',
        { warning: 'Contains dictionary words or common patterns' }
      );
    }
  }
}

/**
 * Validate CORS configuration
 */
function validateCorsConfig(envConfig: Map<string, string>): void {
  printSection('CORS Configuration');

  const corsOrigin = envConfig.get('CORS_ORIGIN');

  if (!corsOrigin) {
    addCheck(
      'CORS',
      'CORS_ORIGIN',
      'fail',
      'critical',
      'CORS_ORIGIN is not set',
      'Set CORS_ORIGIN to your production domain(s)',
      { note: 'Required to allow frontend to communicate with API' }
    );
    return;
  }

  // Check for wildcard CORS
  if (corsOrigin === '*') {
    addCheck(
      'CORS',
      'CORS_ORIGIN',
      'fail',
      'critical',
      'CORS_ORIGIN is set to wildcard (*) which is insecure',
      'Set CORS_ORIGIN to specific production domain(s)',
      { current: corsOrigin, note: 'Allows any domain to access your API' }
    );
  }
  // Check for localhost in production
  else if (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1')) {
    addCheck(
      'CORS',
      'CORS_ORIGIN',
      'fail',
      'high',
      'CORS_ORIGIN contains localhost - this will not work in production',
      'Set CORS_ORIGIN to your production domain',
      { current: corsOrigin }
    );
  }
  // Check for proper HTTPS URLs
  else if (!corsOrigin.startsWith('https://')) {
    addCheck(
      'CORS',
      'CORS_ORIGIN',
      'warn',
      'medium',
      'CORS_ORIGIN does not use HTTPS',
      'Use HTTPS URLs for CORS_ORIGIN',
      { current: corsOrigin, note: 'HTTP is not secure for production' }
    );
  } else {
    addCheck(
      'CORS',
      'CORS_ORIGIN',
      'pass',
      'low',
      'CORS_ORIGIN is properly configured'
    );
  }
}

/**
 * Validate URLs for localhost
 */
function validateProductionUrls(envConfig: Map<string, string>): void {
  printSection('Production URL Validation');

  const urlVars = [
    'PUBLIC_API_URL',
    'PLATFORM_API_URL',
  ];

  for (const varName of urlVars) {
    const url = envConfig.get(varName);

    if (!url) {
      continue;
    }

    // Skip if it's a placeholder
    if (url.includes('CHANGE_ME')) {
      continue;
    }

    // Check for localhost
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      addCheck(
        'Production URLs',
        varName,
        'fail',
        'high',
        `${varName} contains localhost - this will not work in production`,
        `Set ${varName} to your production domain`,
        { current: url }
      );
    }
    // Check for HTTP instead of HTTPS
    else if (url.startsWith('http://') && !url.includes('localhost')) {
      addCheck(
        'Production URLs',
        varName,
        'warn',
        'medium',
        `${varName} uses HTTP instead of HTTPS`,
        `Use HTTPS for ${varName}`,
        { current: url, note: 'HTTP is not secure for production' }
      );
    } else {
      addCheck(
        'Production URLs',
        varName,
        'pass',
        'low',
        `${varName} is properly configured`
      );
    }
  }
}

/**
 * Validate SSL/TLS certificate paths
 */
function validateSslCertificates(envConfig: Map<string, string>): void {
  printSection('SSL/TLS Certificate Validation');

  const sslCertPath = envConfig.get('SSL_CERT_PATH');
  const sslKeyPath = envConfig.get('SSL_KEY_PATH');

  // SSL is optional if using reverse proxy
  if (!sslCertPath && !sslKeyPath) {
    addCheck(
      'SSL/TLS',
      'Configuration',
      'warn',
      'low',
      'SSL/TLS is not configured at application level',
      'Ensure SSL/TLS is handled by reverse proxy (nginx, HAProxy, etc.)',
      { note: 'This is acceptable if using a reverse proxy' }
    );
    return;
  }

  // If one is set, both should be set
  if ((sslCertPath && !sslKeyPath) || (!sslCertPath && sslKeyPath)) {
    addCheck(
      'SSL/TLS',
      'Configuration',
      'fail',
      'high',
      'SSL certificate and key must both be configured',
      'Set both SSL_CERT_PATH and SSL_KEY_PATH or neither',
      { certPath: sslCertPath, keyPath: sslKeyPath }
    );
    return;
  }

  // Check if certificate files exist
  if (sslCertPath && !existsSync(sslCertPath)) {
    addCheck(
      'SSL/TLS',
      'SSL_CERT_PATH',
      'fail',
      'critical',
      `SSL certificate file does not exist: ${sslCertPath}`,
      'Ensure SSL certificate is placed at the specified path',
      { path: sslCertPath }
    );
  } else if (sslCertPath) {
    addCheck(
      'SSL/TLS',
      'SSL_CERT_PATH',
      'pass',
      'low',
      'SSL certificate file exists'
    );
  }

  if (sslKeyPath && !existsSync(sslKeyPath)) {
    addCheck(
      'SSL/TLS',
      'SSL_KEY_PATH',
      'fail',
      'critical',
      `SSL private key file does not exist: ${sslKeyPath}`,
      'Ensure SSL private key is placed at the specified path',
      { path: sslKeyPath }
    );
  } else if (sslKeyPath) {
    addCheck(
      'SSL/TLS',
      'SSL_KEY_PATH',
      'pass',
      'low',
      'SSL private key file exists'
    );
  }

  // Check TLS version
  const tlsMinVersion = envConfig.get('TLS_MIN_VERSION');
  if (!tlsMinVersion || parseFloat(tlsMinVersion) < 1.2) {
    addCheck(
      'SSL/TLS',
      'TLS_MIN_VERSION',
      'warn',
      'medium',
      'TLS version is not set or is less than 1.2',
      'Set TLS_MIN_VERSION to at least 1.2',
      { current: tlsMinVersion, minimum: '1.2' }
    );
  } else {
    addCheck(
      'SSL/TLS',
      'TLS_MIN_VERSION',
      'pass',
      'low',
      `TLS minimum version is ${tlsMinVersion}`
    );
  }
}

/**
 * Validate monitoring and observability
 */
function validateMonitoring(envConfig: Map<string, string>): void {
  printSection('Monitoring and Observability');

  // Metrics
  const metricsEnabled = envConfig.get('METRICS_ENABLED');
  if (metricsEnabled !== 'true') {
    addCheck(
      'Monitoring',
      'METRICS_ENABLED',
      'warn',
      'medium',
      'Application metrics are not enabled',
      'Set METRICS_ENABLED=true to enable monitoring',
      { current: metricsEnabled, recommended: 'true' }
    );
  } else {
    addCheck(
      'Monitoring',
      'METRICS_ENABLED',
      'pass',
      'low',
      'Application metrics are enabled'
    );
  }

  // Cache configuration
  const cacheEnabled = envConfig.get('CACHE_ENABLED');
  if (cacheEnabled !== 'true') {
    addCheck(
      'Monitoring',
      'CACHE_ENABLED',
      'warn',
      'low',
      'Caching is not enabled',
      'Consider enabling caching for better performance',
      { current: cacheEnabled, recommended: 'true' }
    );
  } else {
    addCheck(
      'Monitoring',
      'CACHE_ENABLED',
      'pass',
      'low',
      'Caching is enabled'
    );
  }

  // API docs should be disabled in production
  const apiDocsEnabled = envConfig.get('API_DOCS_ENABLED');
  if (apiDocsEnabled === 'true') {
    addCheck(
      'Monitoring',
      'API_DOCS_ENABLED',
      'warn',
      'medium',
      'API documentation is enabled in production',
      'Consider disabling API docs in production (set API_DOCS_ENABLED=false)',
      { current: apiDocsEnabled, note: 'May expose API internals' }
    );
  } else {
    addCheck(
      'Monitoring',
      'API_DOCS_ENABLED',
      'pass',
      'low',
      'API documentation is disabled'
    );
  }
}

/**
 * Generate validation report
 */
function generateReport(): void {
  const timestamp = new Date().toISOString();
  const reportDir = join(PROJECT_ROOT, 'logs');
  const reportPath = join(reportDir, 'production-config-validation.json');

  // Ensure logs directory exists
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp,
    hostname: os.hostname(),
    summary: {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warnings: checks.filter(c => c.status === 'warn').length,
      critical: checks.filter(c => c.severity === 'critical' && c.status === 'fail').length,
      high: checks.filter(c => c.severity === 'high' && c.status === 'fail').length,
      medium: checks.filter(c => c.severity === 'medium' && c.status === 'fail').length,
      low: checks.filter(c => c.severity === 'low' && c.status === 'fail').length,
    },
    checks,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n${colors.green}Validation report generated: ${reportPath}${colors.reset}`);
}

/**
 * Print final summary
 */
function printSummary(): void {
  console.log(`\n${colors.bright}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}PRODUCTION CONFIGURATION VALIDATION SUMMARY${colors.reset}`);
  console.log(`${'='.repeat(80)}\n`);

  const total = checks.length;
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warn').length;

  const critical = checks.filter(c => c.severity === 'critical' && c.status === 'fail').length;
  const high = checks.filter(c => c.severity === 'high' && c.status === 'fail').length;
  const medium = checks.filter(c => c.severity === 'medium' && (c.status === 'fail' || c.status === 'warn')).length;

  console.log(`Total Checks:        ${total}`);
  console.log(`${colors.green}Passed:              ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed:              ${failed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings:            ${warnings}${colors.reset}\n`);

  console.log(`${colors.bright}Issues by Severity:${colors.reset}`);
  console.log(`${colors.red}Critical:            ${critical}${colors.reset}`);
  console.log(`${colors.red}${colors.bright}High:                ${high}${colors.reset}`);
  console.log(`${colors.yellow}Medium:              ${medium}${colors.reset}\n`);

  if (hasCriticalIssues) {
    console.log(`${colors.red}${colors.bright}❌ CRITICAL ISSUES FOUND${colors.reset}`);
    console.log(`${colors.red}Production deployment is BLOCKED. Fix critical issues immediately.${colors.reset}\n`);
  } else if (hasHighIssues) {
    console.log(`${colors.red}${colors.bright}❌ HIGH SEVERITY ISSUES FOUND${colors.reset}`);
    console.log(`${colors.red}Production deployment is NOT RECOMMENDED. Fix high severity issues.${colors.reset}\n`);
  } else if (warnings > 0) {
    console.log(`${colors.yellow}${colors.bright}⚠️  WARNINGS DETECTED${colors.reset}`);
    console.log(`${colors.yellow}Production deployment is possible but review warnings carefully.${colors.reset}\n`);
  } else {
    console.log(`${colors.green}${colors.bright}✅ PRODUCTION READY${colors.reset}`);
    console.log(`${colors.green}Configuration passed all validation checks!${colors.reset}\n`);
  }
}

/**
 * Main validation function
 */
function main(): void {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         Production Configuration Validator - Agent Feed                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Parse .env.production.template
  const templatePath = join(PROJECT_ROOT, '.env.production.template');

  if (!existsSync(templatePath)) {
    console.error(`${colors.red}Error: .env.production.template not found at ${templatePath}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.blue}Reading configuration from: ${templatePath}${colors.reset}\n`);

  const envConfig = parseEnvFile(templatePath);

  if (envConfig.size === 0) {
    console.error(`${colors.red}Error: No configuration found in .env.production.template${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.blue}Loaded ${envConfig.size} configuration variables${colors.reset}\n`);

  // Run all validations
  validateRequiredVariables(envConfig);
  validatePlaceholders(envConfig);
  validateProductionSettings(envConfig);
  validateDatabaseConfig(envConfig);
  validateSecuritySettings(envConfig);
  validatePasswordStrength(envConfig);
  validateCorsConfig(envConfig);
  validateProductionUrls(envConfig);
  validateSslCertificates(envConfig);
  validateMonitoring(envConfig);

  // Generate report
  generateReport();

  // Print summary
  printSummary();

  // Exit with appropriate code
  if (hasCriticalIssues || hasHighIssues) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Run validation
main();
