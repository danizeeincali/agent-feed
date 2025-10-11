/**
 * Environment Validator Tests
 */

import {
  validateEnvironment,
  getRequiredEnvVar,
  getEnvVar,
  getBooleanEnvVar,
  getNumberEnvVar,
  REQUIRED_ENV_VARS,
} from '../env-validator';

describe('env-validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should fail when required variables are missing', () => {
      // Clear all required env vars
      Object.keys(REQUIRED_ENV_VARS).forEach(key => {
        delete process.env[key];
      });

      const result = validateEnvironment({ skipPathValidation: true });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('should pass when all required variables are set', () => {
      // Set all required env vars
      process.env.WORKSPACE_ROOT = '/test/workspace';
      process.env.PROJECT_ROOT = '/test/project';
      process.env.CLAUDE_PROD_DIR = '/test/claude';
      process.env.CLAUDE_CONFIG_DIR = '/test/claude/config';
      process.env.CLAUDE_MEMORY_DIR = '/test/claude/memory';
      process.env.CLAUDE_LOGS_DIR = '/test/claude/logs';
      process.env.AGENTS_DIR = '/test/agents';
      process.env.AGENT_WORKSPACE_DIR = '/test/agents/workspace';
      process.env.AGENT_TEMPLATES_DIR = '/test/agents/templates';
      process.env.DATABASE_DIR = '/test/data';
      process.env.TOKEN_ANALYTICS_DB_PATH = '/test/data/token.db';
      process.env.AGENTS_CONFIG_PATH = '/test/config/agents.json';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ANTHROPIC_API_KEY = 'sk-test-key-123';
      process.env.NODE_ENV = 'test';

      const result = validateEnvironment({ skipPathValidation: true });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.missing.length).toBe(0);
    });

    it('should detect placeholder values', () => {
      process.env.ANTHROPIC_API_KEY = 'your_api_key_here';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.NODE_ENV = 'test';

      const result = validateEnvironment({
        skipPathValidation: true,
        requiredVars: ['ANTHROPIC_API_KEY', 'DATABASE_URL', 'NODE_ENV'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('placeholder'))).toBe(true);
    });
  });

  describe('getRequiredEnvVar', () => {
    it('should return value when set', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getRequiredEnvVar('TEST_VAR')).toBe('test-value');
    });

    it('should throw when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(() => getRequiredEnvVar('TEST_VAR')).toThrow();
    });

    it('should throw when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(() => getRequiredEnvVar('TEST_VAR')).toThrow();
    });

    it('should throw when variable is only whitespace', () => {
      process.env.TEST_VAR = '   ';
      expect(() => getRequiredEnvVar('TEST_VAR')).toThrow();
    });
  });

  describe('getEnvVar', () => {
    it('should return value when set', () => {
      process.env.TEST_VAR = 'test-value';
      expect(getEnvVar('TEST_VAR', 'default')).toBe('test-value');
    });

    it('should return default when variable is not set', () => {
      delete process.env.TEST_VAR;
      expect(getEnvVar('TEST_VAR', 'default')).toBe('default');
    });

    it('should return default when variable is empty string', () => {
      process.env.TEST_VAR = '';
      expect(getEnvVar('TEST_VAR', 'default')).toBe('default');
    });
  });

  describe('getBooleanEnvVar', () => {
    it('should return true for "true"', () => {
      process.env.TEST_VAR = 'true';
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);
    });

    it('should return true for "TRUE"', () => {
      process.env.TEST_VAR = 'TRUE';
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);
    });

    it('should return true for "1"', () => {
      process.env.TEST_VAR = '1';
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);
    });

    it('should return true for "yes"', () => {
      process.env.TEST_VAR = 'yes';
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);
    });

    it('should return false for "false"', () => {
      process.env.TEST_VAR = 'false';
      expect(getBooleanEnvVar('TEST_VAR')).toBe(false);
    });

    it('should return default when not set', () => {
      delete process.env.TEST_VAR;
      expect(getBooleanEnvVar('TEST_VAR', true)).toBe(true);
      expect(getBooleanEnvVar('TEST_VAR', false)).toBe(false);
    });
  });

  describe('getNumberEnvVar', () => {
    it('should parse valid number', () => {
      process.env.TEST_VAR = '42';
      expect(getNumberEnvVar('TEST_VAR', 0)).toBe(42);
    });

    it('should return default for invalid number', () => {
      process.env.TEST_VAR = 'not-a-number';
      expect(getNumberEnvVar('TEST_VAR', 100)).toBe(100);
    });

    it('should return default when not set', () => {
      delete process.env.TEST_VAR;
      expect(getNumberEnvVar('TEST_VAR', 42)).toBe(42);
    });

    it('should handle negative numbers', () => {
      process.env.TEST_VAR = '-10';
      expect(getNumberEnvVar('TEST_VAR', 0)).toBe(-10);
    });
  });
});
