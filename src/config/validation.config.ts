/**
 * Phase 4: Validation Configuration
 * Loads and exports validation rules and settings
 */

import { ValidationConfig, RetryConfig, RetryStrategy } from '../validation/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default validation configuration
 */
export const defaultValidationConfig: ValidationConfig = {
  enableLLMValidation: process.env.ENABLE_LLM_VALIDATION !== 'false',
  maxLength: parseInt(process.env.MAX_POST_LENGTH || '280', 10),
  minLength: parseInt(process.env.MIN_POST_LENGTH || '50', 10),
  prohibitedWords: [
    'spam',
    'scam',
    'clickbait',
    'fake',
    'phishing'
  ],
  maxMentions: parseInt(process.env.MAX_MENTIONS || '3', 10),
  maxHashtags: parseInt(process.env.MAX_HASHTAGS || '5', 10),
  maxUrls: parseInt(process.env.MAX_URLS || '2', 10),
  allowedDomains: [
    'example.com',
    'github.com',
    'twitter.com',
    'linkedin.com',
    'medium.com'
  ],
  toneThreshold: parseFloat(process.env.TONE_THRESHOLD || '0.7'),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  toneCheckModel: process.env.TONE_CHECK_MODEL || 'claude-3-5-haiku-20241022',
  toneCheckTimeout: parseInt(process.env.TONE_CHECK_TIMEOUT || '5000', 10)
};

/**
 * Default retry configuration
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  baseDelay: parseInt(process.env.BASE_RETRY_DELAY || '5', 10),
  maxDelay: parseInt(process.env.MAX_RETRY_DELAY || '120', 10),
  backoffMultiplier: parseInt(process.env.BACKOFF_MULTIPLIER || '6', 10),
  strategies: [
    RetryStrategy.RETRY_SAME,
    RetryStrategy.SIMPLIFY_POST,
    RetryStrategy.DIFFERENT_AGENT
  ],
  strategyThresholds: {
    retrySame: 1,
    simplifyPost: 2,
    differentAgent: 3
  }
};

/**
 * Load validation config from file or environment
 * Attempts to load from config/validation-rules.json, falls back to defaults
 */
export function loadValidationConfig(): ValidationConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'validation-rules.json');

    if (fs.existsSync(configPath)) {
      const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const validation = configFile.validation || {};

      return {
        enableLLMValidation: validation.enableLLMValidation ?? defaultValidationConfig.enableLLMValidation,
        maxLength: validation.content?.maxLength ?? defaultValidationConfig.maxLength,
        minLength: validation.content?.minLength ?? defaultValidationConfig.minLength,
        prohibitedWords: validation.prohibitedWords ?? defaultValidationConfig.prohibitedWords,
        maxMentions: validation.mentions?.maxCount ?? defaultValidationConfig.maxMentions,
        maxHashtags: validation.hashtags?.maxCount ?? defaultValidationConfig.maxHashtags,
        maxUrls: validation.urls?.maxCount ?? defaultValidationConfig.maxUrls,
        allowedDomains: validation.urls?.allowedDomains ?? defaultValidationConfig.allowedDomains,
        toneThreshold: validation.tone?.threshold ?? defaultValidationConfig.toneThreshold,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        toneCheckModel: validation.tone?.model ?? defaultValidationConfig.toneCheckModel,
        toneCheckTimeout: validation.tone?.timeout ?? defaultValidationConfig.toneCheckTimeout
      };
    }
  } catch (error) {
    console.warn('Failed to load validation config from file, using defaults:', error);
  }

  return defaultValidationConfig;
}

/**
 * Load retry config from file or environment
 * Attempts to load from config/retry-policies.json, falls back to defaults
 */
export function loadRetryConfig(): RetryConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'retry-policies.json');

    if (fs.existsSync(configPath)) {
      const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const retry = configFile.retry || {};

      return {
        maxRetries: retry.maxRetries ?? defaultRetryConfig.maxRetries,
        baseDelay: retry.baseDelay ?? defaultRetryConfig.baseDelay,
        maxDelay: retry.maxDelay ?? defaultRetryConfig.maxDelay,
        backoffMultiplier: retry.backoffMultiplier ?? defaultRetryConfig.backoffMultiplier,
        strategies: retry.strategies?.map((s: string) =>
          RetryStrategy[s.toUpperCase().replace(/-/g, '_') as keyof typeof RetryStrategy]
        ) ?? defaultRetryConfig.strategies,
        strategyThresholds: {
          retrySame: retry.strategyThresholds?.retrySame ?? defaultRetryConfig.strategyThresholds.retrySame,
          simplifyPost: retry.strategyThresholds?.simplifyPost ?? defaultRetryConfig.strategyThresholds.simplifyPost,
          differentAgent: retry.strategyThresholds?.differentAgent ?? defaultRetryConfig.strategyThresholds.differentAgent
        }
      };
    }
  } catch (error) {
    console.warn('Failed to load retry config from file, using defaults:', error);
  }

  return defaultRetryConfig;
}

/**
 * Get validation config (singleton pattern)
 */
let cachedValidationConfig: ValidationConfig | null = null;

export function getValidationConfig(): ValidationConfig {
  if (!cachedValidationConfig) {
    cachedValidationConfig = loadValidationConfig();
  }
  return cachedValidationConfig;
}

/**
 * Get retry config (singleton pattern)
 */
let cachedRetryConfig: RetryConfig | null = null;

export function getRetryConfig(): RetryConfig {
  if (!cachedRetryConfig) {
    cachedRetryConfig = loadRetryConfig();
  }
  return cachedRetryConfig;
}

/**
 * Reset cached configs (useful for testing)
 */
export function resetConfigCache(): void {
  cachedValidationConfig = null;
  cachedRetryConfig = null;
}
