/**
 * Environment Variables Validator
 *
 * Validates all required environment variables are set and paths exist or can be created.
 * Provides clear error messages for missing or invalid configuration.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Required environment variables for the agent system
 */
export const REQUIRED_ENV_VARS = {
  // Directory structure
  WORKSPACE_ROOT: 'Root workspace directory',
  PROJECT_ROOT: 'Project root directory',
  CLAUDE_PROD_DIR: 'Claude production directory',
  CLAUDE_CONFIG_DIR: 'Claude configuration directory',
  CLAUDE_MEMORY_DIR: 'Claude memory directory',
  CLAUDE_LOGS_DIR: 'Claude logs directory',
  AGENTS_DIR: 'Agents directory',
  AGENT_WORKSPACE_DIR: 'Agent workspace directory',
  AGENT_TEMPLATES_DIR: 'Agent templates directory',
  DATABASE_DIR: 'Database directory',
  TOKEN_ANALYTICS_DB_PATH: 'Token analytics database path',
  AGENTS_CONFIG_PATH: 'Agents configuration file path',

  // Database configuration
  DATABASE_URL: 'Database connection URL',

  // API keys
  ANTHROPIC_API_KEY: 'Anthropic API key for Claude',

  // Application settings
  NODE_ENV: 'Node environment (development/production)',
} as const;

/**
 * Path environment variables that should be validated for existence
 */
export const PATH_ENV_VARS = [
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
] as const;

/**
 * File path environment variables that should have their parent directories validated
 */
export const FILE_PATH_ENV_VARS = [
  'TOKEN_ANALYTICS_DB_PATH',
  'AGENTS_CONFIG_PATH',
] as const;

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  invalidPaths: string[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  createMissingDirs?: boolean;
  skipPathValidation?: boolean;
  requiredVars?: string[];
}

/**
 * Validates a single environment variable
 */
function validateEnvVar(varName: string, description: string): string | null {
  const value = process.env[varName];

  if (!value || value.trim() === '') {
    return `Missing required environment variable: ${varName} (${description})`;
  }

  // Check for placeholder values
  const placeholders = ['your_api_key_here', 'your_platform_api_key_here', 'change_in_production'];
  if (placeholders.some(p => value.includes(p))) {
    return `Environment variable ${varName} contains placeholder value: ${value}`;
  }

  return null;
}

/**
 * Validates a path exists or can be created
 */
function validatePath(
  envVar: string,
  createIfMissing: boolean = false
): { error: string | null; warning: string | null } {
  const pathValue = process.env[envVar];

  if (!pathValue) {
    return { error: `Path environment variable ${envVar} is not set`, warning: null };
  }

  try {
    if (fs.existsSync(pathValue)) {
      return { error: null, warning: null };
    }

    if (createIfMissing) {
      fs.mkdirSync(pathValue, { recursive: true });
      return {
        error: null,
        warning: `Created missing directory: ${pathValue} (${envVar})`
      };
    }

    return {
      error: `Path does not exist: ${pathValue} (${envVar})`,
      warning: null
    };
  } catch (err) {
    return {
      error: `Cannot access path: ${pathValue} (${envVar}) - ${err instanceof Error ? err.message : String(err)}`,
      warning: null
    };
  }
}

/**
 * Validates a file path's parent directory exists or can be created
 */
function validateFilePath(
  envVar: string,
  createIfMissing: boolean = false
): { error: string | null; warning: string | null } {
  const filePath = process.env[envVar];

  if (!filePath) {
    return { error: `File path environment variable ${envVar} is not set`, warning: null };
  }

  const dirPath = path.dirname(filePath);

  try {
    if (fs.existsSync(dirPath)) {
      return { error: null, warning: null };
    }

    if (createIfMissing) {
      fs.mkdirSync(dirPath, { recursive: true });
      return {
        error: null,
        warning: `Created missing directory for file: ${dirPath} (${envVar})`
      };
    }

    return {
      error: `Parent directory does not exist for file: ${filePath} (${envVar})`,
      warning: null
    };
  } catch (err) {
    return {
      error: `Cannot access parent directory: ${dirPath} (${envVar}) - ${err instanceof Error ? err.message : String(err)}`,
      warning: null
    };
  }
}

/**
 * Validates all required environment variables
 */
export function validateEnvironment(options: ValidationOptions = {}): ValidationResult {
  const {
    createMissingDirs = false,
    skipPathValidation = false,
    requiredVars = Object.keys(REQUIRED_ENV_VARS),
  } = options;

  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    missing: [],
    invalidPaths: [],
  };

  // Validate required variables are set
  for (const varName of requiredVars) {
    const description = REQUIRED_ENV_VARS[varName as keyof typeof REQUIRED_ENV_VARS];
    if (!description) continue;

    const error = validateEnvVar(varName, description);
    if (error) {
      result.errors.push(error);
      result.missing.push(varName);
      result.valid = false;
    }
  }

  // Validate path variables if not skipped
  if (!skipPathValidation) {
    // Validate directory paths
    for (const pathVar of PATH_ENV_VARS) {
      if (!requiredVars.includes(pathVar)) continue;

      const { error, warning } = validatePath(pathVar, createMissingDirs);
      if (error) {
        result.errors.push(error);
        result.invalidPaths.push(pathVar);
        result.valid = false;
      }
      if (warning) {
        result.warnings.push(warning);
      }
    }

    // Validate file paths
    for (const filePathVar of FILE_PATH_ENV_VARS) {
      if (!requiredVars.includes(filePathVar)) continue;

      const { error, warning } = validateFilePath(filePathVar, createMissingDirs);
      if (error) {
        result.errors.push(error);
        result.invalidPaths.push(filePathVar);
        result.valid = false;
      }
      if (warning) {
        result.warnings.push(warning);
      }
    }
  }

  return result;
}

/**
 * Validates environment and throws if invalid
 */
export function validateEnvironmentOrThrow(options: ValidationOptions = {}): void {
  const result = validateEnvironment(options);

  if (!result.valid) {
    const errorMessage = [
      'Environment validation failed:',
      '',
      ...result.errors.map(err => `  ❌ ${err}`),
      '',
      'Please check your .env file and ensure all required variables are set.',
      'See .env.template for reference.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn('Environment validation warnings:');
    result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }
}

/**
 * Gets a formatted validation report
 */
export function getValidationReport(result: ValidationResult): string {
  const lines: string[] = [
    '='.repeat(80),
    'Environment Variables Validation Report',
    '='.repeat(80),
    '',
  ];

  if (result.valid) {
    lines.push('✅ All environment variables are valid');
  } else {
    lines.push('❌ Validation failed');
    lines.push('');
    lines.push(`Missing variables (${result.missing.length}):`);
    result.missing.forEach(varName => {
      const description = REQUIRED_ENV_VARS[varName as keyof typeof REQUIRED_ENV_VARS];
      lines.push(`  - ${varName}: ${description}`);
    });

    if (result.invalidPaths.length > 0) {
      lines.push('');
      lines.push(`Invalid paths (${result.invalidPaths.length}):`);
      result.invalidPaths.forEach(varName => {
        lines.push(`  - ${varName}: ${process.env[varName] || 'not set'}`);
      });
    }
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push(`Errors (${result.errors.length}):`);
    result.errors.forEach(error => lines.push(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push(`Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warning => lines.push(`  - ${warning}`));
  }

  lines.push('');
  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Prints validation report to console
 */
export function printValidationReport(result: ValidationResult): void {
  console.log(getValidationReport(result));
}

/**
 * Gets environment variable with validation
 */
export function getRequiredEnvVar(varName: string): string {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    throw new Error(
      `Required environment variable ${varName} is not set. ` +
      `Check your .env file and see .env.template for reference.`
    );
  }
  return value;
}

/**
 * Gets environment variable with default value
 */
export function getEnvVar(varName: string, defaultValue: string): string {
  const value = process.env[varName];
  return value && value.trim() !== '' ? value : defaultValue;
}

/**
 * Gets boolean environment variable
 */
export function getBooleanEnvVar(varName: string, defaultValue: boolean = false): boolean {
  const value = process.env[varName];
  if (!value) return defaultValue;

  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Gets number environment variable
 */
export function getNumberEnvVar(varName: string, defaultValue: number): number {
  const value = process.env[varName];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
