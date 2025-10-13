/**
 * AVI Orchestrator Configuration
 * Phase 2: Configuration management with environment variable validation
 *
 * This file loads and validates configuration from environment variables
 * and provides typed configuration object for orchestrator initialization.
 */

import type { AviConfig } from '../types/avi';

/**
 * Validate required environment variables
 * Logs warnings for missing optional variables
 */
function validateEnvironment(): void {
  const warnings: string[] = [];

  // Optional variables with defaults
  if (!process.env.AVI_MAX_WORKERS) {
    warnings.push('AVI_MAX_WORKERS not set, using default: 10');
  }

  if (!process.env.AVI_CHECK_INTERVAL) {
    warnings.push('AVI_CHECK_INTERVAL not set, using default: 5000ms');
  }

  if (warnings.length > 0) {
    console.log('⚠️  AVI Configuration Warnings:');
    warnings.forEach((warning) => console.log(`   ${warning}`));
  }
}

/**
 * Parse integer from environment variable with default fallback
 */
function parseEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`⚠️  Invalid value for ${key}: "${value}", using default: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
}

/**
 * Parse boolean from environment variable with default fallback
 */
function parseEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;

  return value.toLowerCase() !== 'false';
}

/**
 * Load and validate AVI configuration
 */
function loadConfig(): AviConfig {
  // Validate environment first
  validateEnvironment();

  const config: AviConfig = {
    // Maximum concurrent workers
    maxConcurrentWorkers: parseEnvInt('AVI_MAX_WORKERS', 10),

    // Check interval for pending tickets (milliseconds)
    checkInterval: parseEnvInt('AVI_CHECK_INTERVAL', 5000),

    // Enable health monitoring
    enableHealthMonitor: parseEnvBool('AVI_HEALTH_MONITOR', true),

    // Health check interval (milliseconds)
    healthCheckInterval: parseEnvInt('AVI_HEALTH_INTERVAL', 30000),

    // Graceful shutdown timeout (milliseconds)
    shutdownTimeout: parseEnvInt('AVI_SHUTDOWN_TIMEOUT', 30000),

    // Context bloat threshold (tokens)
    contextBloatThreshold: parseEnvInt('AVI_CONTEXT_LIMIT', 50000),

    // Worker timeout (milliseconds)
    workerTimeout: parseEnvInt('AVI_WORKER_TIMEOUT', 120000),
  };

  // Validate ranges
  if (config.maxConcurrentWorkers < 1 || config.maxConcurrentWorkers > 100) {
    console.warn(
      `⚠️  AVI_MAX_WORKERS out of range (1-100): ${config.maxConcurrentWorkers}, clamping`
    );
    config.maxConcurrentWorkers = Math.max(1, Math.min(100, config.maxConcurrentWorkers));
  }

  if (config.checkInterval < 1000) {
    console.warn(
      `⚠️  AVI_CHECK_INTERVAL too low (min 1000ms): ${config.checkInterval}, using 1000ms`
    );
    config.checkInterval = 1000;
  }

  return config;
}

// Load configuration on module import
const aviConfig = loadConfig();

// Log loaded configuration
console.log('✅ AVI Configuration loaded:');
console.log(`   Max Workers: ${aviConfig.maxConcurrentWorkers}`);
console.log(`   Check Interval: ${aviConfig.checkInterval}ms`);
console.log(`   Health Monitor: ${aviConfig.enableHealthMonitor ? 'enabled' : 'disabled'}`);
console.log(`   Shutdown Timeout: ${aviConfig.shutdownTimeout}ms`);

export default aviConfig;
