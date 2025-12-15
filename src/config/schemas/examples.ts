/**
 * Phase 1: Schema and Validator Examples
 *
 * This file demonstrates how to use the protected agent configuration schemas
 * and validators. These examples show typical usage patterns for validation,
 * field classification, and error handling.
 *
 * Location: /workspaces/agent-feed/src/config/schemas/examples.ts
 */

import {
  ProtectedConfigSchema,
  validateProtectedConfig,
  safeValidateProtectedConfig,
  exampleProtectedConfig,
  ProtectedConfig,
} from './protected-config.schema';

import {
  AgentConfigSchema,
  validateAgentConfig,
  safeValidateAgentConfig,
  exampleAgentConfig,
  AgentConfig,
} from './agent-config.schema';

import {
  isProtectedField,
  isUserEditableField,
  getFieldVisibility,
  canEditField,
  extractProtectedFields,
  extractUserEditableFields,
  mergeProtectedAndUserConfigs,
  validateFieldModification,
  PROTECTED_FIELDS,
  USER_EDITABLE_FIELDS,
} from './field-classification';

import { BaseValidator } from '../validators/base-validator';

/**
 * Example 1: Validate Protected Configuration
 */
export function example1_validateProtectedConfig() {
  console.log('=== Example 1: Validate Protected Configuration ===\n');

  // Valid protected config
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

  try {
    const validated = validateProtectedConfig(validConfig);
    console.log('✅ Valid protected config:', validated.agent_id);
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }

  // Invalid protected config (missing required fields)
  const invalidConfig = {
    version: '1.0.0',
    // Missing checksum and agent_id
    permissions: {},
  };

  const result = safeValidateProtectedConfig(invalidConfig);
  if (!result.success) {
    console.log('\n❌ Validation errors for invalid config:');
    result.errors?.issues.forEach((issue: any) => {
      console.log(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
  }
}

/**
 * Example 2: Validate Agent Configuration
 */
export function example2_validateAgentConfig() {
  console.log('\n=== Example 2: Validate Agent Configuration ===\n');

  // Valid agent config
  const validConfig = {
    name: 'Test Agent',
    description: 'A test agent for demonstration',
    tools: ['Read', 'Write', 'Bash'],
    model: 'sonnet' as const,
    color: '#3B82F6',
    personality: {
      tone: 'professional',
      emoji_usage: 'minimal' as const,
    },
  };

  const result = safeValidateAgentConfig(validConfig);
  if (result.success) {
    console.log('✅ Valid agent config:', result.data?.name);
    console.log('   Model:', result.data?.model);
    console.log('   Tools:', result.data?.tools.join(', '));
  }

  // Invalid model value
  const invalidModel = {
    ...validConfig,
    model: 'invalid-model', // Not in enum
  };

  const invalidResult = safeValidateAgentConfig(invalidModel);
  if (!invalidResult.success) {
    console.log('\n❌ Invalid model error:');
    console.log('   ', invalidResult.errors?.issues[0]?.message);
  }
}

/**
 * Example 3: Field Classification
 */
export function example3_fieldClassification() {
  console.log('\n=== Example 3: Field Classification ===\n');

  // Check if fields are protected
  const fieldsToCheck = [
    'name',
    'description',
    'workspace',
    'api_endpoints',
    'personality',
    'resource_limits',
  ];

  console.log('Field Protection Status:');
  fieldsToCheck.forEach((field) => {
    const isProtected = isProtectedField(field);
    const isEditable = isUserEditableField(field);
    console.log(
      `  ${field.padEnd(20)} | Protected: ${isProtected ? '✅' : '❌'} | User Editable: ${
        isEditable ? '✅' : '❌'
      }`
    );
  });

  // Get field visibility settings
  console.log('\nField Visibility:');
  ['name', 'workspace', 'personality'].forEach((field) => {
    const visibility = getFieldVisibility(field);
    console.log(
      `  ${visibility.icon} ${field}: ${visibility.editable ? 'Editable' : 'Read-only'}`
    );
  });
}

/**
 * Example 4: Field Edit Permissions
 */
export function example4_fieldEditPermissions() {
  console.log('\n=== Example 4: Field Edit Permissions ===\n');

  const fieldsToEdit = ['description', 'workspace', 'personality'];

  console.log('User attempting to edit fields:');
  fieldsToEdit.forEach((field) => {
    const result = validateFieldModification(field, false); // Not admin
    console.log(
      `  ${field.padEnd(20)} | ${result.allowed ? '✅ Allowed' : '❌ Blocked'}`
    );
    if (result.reason) {
      console.log(`    Reason: ${result.reason}`);
    }
  });

  console.log('\nAdmin attempting to edit fields:');
  fieldsToEdit.forEach((field) => {
    const result = validateFieldModification(field, true); // Is admin
    console.log(
      `  ${field.padEnd(20)} | ${result.allowed ? '✅ Allowed' : '❌ Blocked'}`
    );
  });
}

/**
 * Example 5: Extract and Merge Configs
 */
export function example5_extractAndMerge() {
  console.log('\n=== Example 5: Extract and Merge Configs ===\n');

  const fullConfig = {
    name: 'Strategic Planner',
    description: 'Strategic planning agent',
    tools: ['Read', 'Write'],
    model: 'sonnet',
    workspace: '/workspaces/agent-feed/prod',
    api_endpoints: [{ path: '/api/posts', methods: ['GET'] }],
    personality: { tone: 'professional' },
    resource_limits: { max_memory: '512MB' },
  };

  // Extract protected fields
  const protectedFields = extractProtectedFields(fullConfig);
  console.log('Protected fields:', Object.keys(protectedFields).join(', '));

  // Extract user-editable fields
  const userFields = extractUserEditableFields(fullConfig);
  console.log('User-editable fields:', Object.keys(userFields).join(', '));

  // Merge configs (protected takes precedence)
  const userConfig = {
    workspace: '/user-modified-path', // User tried to change this
    personality: { tone: 'casual' },
  };

  const protectedConfig = {
    workspace: '/protected-path', // System-enforced
    resource_limits: { max_memory: '256MB' },
  };

  const merged = mergeProtectedAndUserConfigs(userConfig, protectedConfig);
  console.log('\nMerged config:');
  console.log('  workspace:', merged.workspace); // Protected value wins
  console.log('  personality:', JSON.stringify(merged.personality)); // User value preserved
  console.log('  resource_limits:', JSON.stringify(merged.resource_limits)); // Protected value added
}

/**
 * Example 6: BaseValidator Usage
 */
export function example6_baseValidator() {
  console.log('\n=== Example 6: BaseValidator Usage ===\n');

  const validator = new BaseValidator(ProtectedConfigSchema);

  // Valid data
  const validData = exampleProtectedConfig;
  const result1 = validator.safeValidate(validData);
  console.log('Valid config:', result1.success ? '✅ Passed' : '❌ Failed');

  // Invalid data
  const invalidData = { version: '1.0.0' }; // Missing required fields

  const result2 = validator.safeValidate(invalidData);
  if (!result2.success) {
    console.log('\nValidation errors:');
    result2.errors?.forEach((error) => {
      console.log(`  - ${error.path.join('.')}: ${error.message}`);
    });
    console.log('\nError message:', result2.message);
  }

  // Check if data is valid (boolean)
  console.log('\nIs valid (boolean check):', validator.isValid(validData));
  console.log('Is invalid:', validator.isValid(invalidData));
}

/**
 * Example 7: Field Lists
 */
export function example7_fieldLists() {
  console.log('\n=== Example 7: Complete Field Lists ===\n');

  console.log('Protected Fields:');
  PROTECTED_FIELDS.forEach((field, index) => {
    console.log(`  ${(index + 1).toString().padStart(2)}. ${field}`);
  });

  console.log('\nUser-Editable Fields:');
  USER_EDITABLE_FIELDS.forEach((field, index) => {
    console.log(`  ${(index + 1).toString().padStart(2)}. ${field}`);
  });
}

/**
 * Run all examples
 */
export function runAllExamples() {
  example1_validateProtectedConfig();
  example2_validateAgentConfig();
  example3_fieldClassification();
  example4_fieldEditPermissions();
  example5_extractAndMerge();
  example6_baseValidator();
  example7_fieldLists();

  console.log('\n=== ✅ All Examples Complete ===\n');
}

/**
 * Main execution (if run directly)
 */
if (require.main === module) {
  runAllExamples();
}
