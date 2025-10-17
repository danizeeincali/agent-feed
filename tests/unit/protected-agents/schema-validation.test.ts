/**
 * Unit Tests: Protected Agent Schema Validation
 *
 * Tests for Phase 1 implementation of Protected Agent Fields Architecture.
 * Validates schema validation, field classification, and base validator functionality.
 *
 * Location: /workspaces/agent-feed/tests/unit/protected-agents/schema-validation.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  ProtectedConfigSchema,
  validateProtectedConfig,
  safeValidateProtectedConfig,
  ApiEndpointSchema,
  WorkspaceConfigSchema,
} from '../../../src/config/schemas/protected-config.schema';

import {
  AgentConfigSchema,
  validateAgentConfig,
  safeValidateAgentConfig,
} from '../../../src/config/schemas/agent-config.schema';

import {
  isProtectedField,
  isUserEditableField,
  canEditField,
  validateFieldModification,
  extractProtectedFields,
  extractUserEditableFields,
  mergeProtectedAndUserConfigs,
} from '../../../src/config/schemas/field-classification';

import { BaseValidator } from '../../../src/config/validators/base-validator';

describe('Protected Config Schema', () => {
  describe('ProtectedConfigSchema', () => {
    it('should validate a complete protected config', () => {
      const validConfig = {
        version: '1.0.0',
        checksum: 'sha256:' + '0'.repeat(64),
        agent_id: 'test-agent',
        permissions: {
          workspace: {
            root: '/workspaces/agent-feed/prod/agent_workspace/agents/test-agent',
            max_storage: '500MB',
          },
          tool_permissions: {
            allowed: ['Read', 'Write', 'Edit'],
          },
        },
      };

      const result = safeValidateProtectedConfig(validConfig);
      expect(result.success).toBe(true);
      expect(result.data?.agent_id).toBe('test-agent');
    });

    it('should reject config with invalid version format', () => {
      const invalidConfig = {
        version: '1.0', // Should be X.Y.Z
        checksum: 'sha256:' + '0'.repeat(64),
        agent_id: 'test-agent',
        permissions: {},
      };

      const result = safeValidateProtectedConfig(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject config with invalid checksum format', () => {
      const invalidConfig = {
        version: '1.0.0',
        checksum: 'invalid-checksum',
        agent_id: 'test-agent',
        permissions: {},
      };

      const result = safeValidateProtectedConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should require agent_id field', () => {
      const invalidConfig = {
        version: '1.0.0',
        checksum: 'sha256:' + '0'.repeat(64),
        permissions: {},
      };

      const result = safeValidateProtectedConfig(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('ApiEndpointSchema', () => {
    it('should validate valid API endpoint', () => {
      const validEndpoint = {
        path: '/api/posts',
        methods: ['GET', 'POST'],
        rate_limit: '10/minute',
        authentication: 'required',
      };

      const result = ApiEndpointSchema.safeParse(validEndpoint);
      expect(result.success).toBe(true);
    });

    it('should reject endpoint without leading slash', () => {
      const invalidEndpoint = {
        path: 'api/posts', // Missing leading slash
        methods: ['GET'],
      };

      const result = ApiEndpointSchema.safeParse(invalidEndpoint);
      expect(result.success).toBe(false);
    });

    it('should reject invalid HTTP methods', () => {
      const invalidEndpoint = {
        path: '/api/posts',
        methods: ['INVALID'],
      };

      const result = ApiEndpointSchema.safeParse(invalidEndpoint);
      expect(result.success).toBe(false);
    });
  });

  describe('WorkspaceConfigSchema', () => {
    it('should validate valid workspace config', () => {
      const validWorkspace = {
        root: '/workspaces/agent-feed/prod',
        max_storage: '1GB',
        allowed_paths: ['/workspaces/agent-feed/prod/**'],
      };

      const result = WorkspaceConfigSchema.safeParse(validWorkspace);
      expect(result.success).toBe(true);
    });

    it('should reject workspace root without leading slash', () => {
      const invalidWorkspace = {
        root: 'workspaces/agent-feed', // Missing leading slash
      };

      const result = WorkspaceConfigSchema.safeParse(invalidWorkspace);
      expect(result.success).toBe(false);
    });
  });
});

describe('Agent Config Schema', () => {
  describe('AgentConfigSchema', () => {
    it('should validate complete agent config', () => {
      const validConfig = {
        name: 'Test Agent',
        description: 'A test agent',
        tools: ['Read', 'Write'],
        model: 'sonnet',
        personality: {
          tone: 'professional',
          emoji_usage: 'minimal',
        },
      };

      const result = safeValidateAgentConfig(validConfig);
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Agent');
    });

    it('should require name and description', () => {
      const invalidConfig = {
        tools: ['Read'],
        model: 'sonnet',
      };

      const result = safeValidateAgentConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate model enum values', () => {
      const invalidConfig = {
        name: 'Test',
        description: 'Test',
        tools: ['Read'],
        model: 'invalid-model',
      };

      const result = safeValidateAgentConfig(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should validate color hex format', () => {
      const validConfig = {
        name: 'Test',
        description: 'Test',
        tools: ['Read'],
        model: 'sonnet',
        color: '#3B82F6',
      };

      const result = safeValidateAgentConfig(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid color format', () => {
      const invalidConfig = {
        name: 'Test',
        description: 'Test',
        tools: ['Read'],
        model: 'sonnet',
        color: 'blue', // Not hex format
      };

      const result = safeValidateAgentConfig(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});

describe('Field Classification', () => {
  describe('isProtectedField', () => {
    it('should identify protected fields', () => {
      expect(isProtectedField('workspace')).toBe(true);
      expect(isProtectedField('api_endpoints')).toBe(true);
      expect(isProtectedField('resource_limits')).toBe(true);
      expect(isProtectedField('tool_permissions')).toBe(true);
    });

    it('should identify non-protected fields', () => {
      expect(isProtectedField('name')).toBe(false);
      expect(isProtectedField('description')).toBe(false);
      expect(isProtectedField('personality')).toBe(false);
    });
  });

  describe('isUserEditableField', () => {
    it('should identify user-editable fields', () => {
      expect(isUserEditableField('name')).toBe(true);
      expect(isUserEditableField('description')).toBe(true);
      expect(isUserEditableField('personality')).toBe(true);
    });

    it('should identify non-user-editable fields', () => {
      expect(isUserEditableField('workspace')).toBe(false);
      expect(isUserEditableField('resource_limits')).toBe(false);
    });
  });

  describe('canEditField', () => {
    it('should allow users to edit user-editable fields', () => {
      expect(canEditField('name', false)).toBe(true);
      expect(canEditField('personality', false)).toBe(true);
    });

    it('should block users from editing protected fields', () => {
      expect(canEditField('workspace', false)).toBe(false);
      expect(canEditField('resource_limits', false)).toBe(false);
    });

    it('should allow admins to edit all fields', () => {
      expect(canEditField('workspace', true)).toBe(true);
      expect(canEditField('resource_limits', true)).toBe(true);
      expect(canEditField('name', true)).toBe(true);
    });
  });

  describe('validateFieldModification', () => {
    it('should validate user field modifications', () => {
      const result = validateFieldModification('name', false);
      expect(result.allowed).toBe(true);
    });

    it('should reject protected field modifications by users', () => {
      const result = validateFieldModification('workspace', false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('protected');
    });

    it('should allow admin field modifications', () => {
      const result = validateFieldModification('workspace', true);
      expect(result.allowed).toBe(true);
    });
  });

  describe('extractProtectedFields', () => {
    it('should extract only protected fields', () => {
      const config = {
        name: 'Test',
        workspace: '/path',
        personality: { tone: 'casual' },
        resource_limits: { max_memory: '512MB' },
      };

      const protected = extractProtectedFields(config);
      expect(protected.workspace).toBe('/path');
      expect(protected.resource_limits).toBeDefined();
      expect(protected.name).toBeUndefined();
      expect(protected.personality).toBeUndefined();
    });
  });

  describe('extractUserEditableFields', () => {
    it('should extract only user-editable fields', () => {
      const config = {
        name: 'Test',
        workspace: '/path',
        personality: { tone: 'casual' },
        resource_limits: { max_memory: '512MB' },
      };

      const userFields = extractUserEditableFields(config);
      expect(userFields.name).toBe('Test');
      expect(userFields.personality).toBeDefined();
      expect(userFields.workspace).toBeUndefined();
      expect(userFields.resource_limits).toBeUndefined();
    });
  });

  describe('mergeProtectedAndUserConfigs', () => {
    it('should merge configs with protected taking precedence', () => {
      const userConfig = {
        name: 'User Name',
        workspace: '/user/path',
        personality: { tone: 'casual' },
      };

      const protectedConfig = {
        workspace: '/protected/path',
        resource_limits: { max_memory: '512MB' },
      };

      const merged = mergeProtectedAndUserConfigs(userConfig, protectedConfig);

      expect(merged.name).toBe('User Name'); // User value preserved
      expect(merged.workspace).toBe('/protected/path'); // Protected value wins
      expect(merged.personality).toEqual({ tone: 'casual' }); // User value preserved
      expect(merged.resource_limits).toBeDefined(); // Protected value added
    });
  });
});

describe('BaseValidator', () => {
  const testSchema = AgentConfigSchema;
  const validator = new BaseValidator(testSchema);

  describe('validate', () => {
    it('should validate correct data', () => {
      const validData = {
        name: 'Test',
        description: 'Test agent',
        tools: ['Read'],
        model: 'sonnet',
      };

      expect(() => validator.validate(validData)).not.toThrow();
    });

    it('should throw on invalid data', () => {
      const invalidData = { name: 'Test' }; // Missing required fields

      expect(() => validator.validate(invalidData)).toThrow();
    });
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const validData = {
        name: 'Test',
        description: 'Test agent',
        tools: ['Read'],
        model: 'sonnet',
      };

      const result = validator.safeValidate(validData);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const invalidData = { name: 'Test' };

      const result = validator.safeValidate(invalidData);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('isValid', () => {
    it('should return true for valid data', () => {
      const validData = {
        name: 'Test',
        description: 'Test agent',
        tools: ['Read'],
        model: 'sonnet',
      };

      expect(validator.isValid(validData)).toBe(true);
    });

    it('should return false for invalid data', () => {
      const invalidData = { name: 'Test' };

      expect(validator.isValid(invalidData)).toBe(false);
    });
  });

  describe('getErrors', () => {
    it('should return null for valid data', () => {
      const validData = {
        name: 'Test',
        description: 'Test agent',
        tools: ['Read'],
        model: 'sonnet',
      };

      const errors = validator.getErrors(validData);
      expect(errors).toBeNull();
    });

    it('should return error array for invalid data', () => {
      const invalidData = { name: 'Test' };

      const errors = validator.getErrors(invalidData);
      expect(errors).toBeDefined();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors!.length).toBeGreaterThan(0);
    });
  });
});
