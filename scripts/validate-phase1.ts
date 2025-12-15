#!/usr/bin/env ts-node
/**
 * Phase 1 Validation Script
 *
 * Quick validation that all Phase 1 components are working correctly.
 * Tests schema validation, field classification, and base validator.
 *
 * Usage: npx ts-node scripts/validate-phase1.ts
 */

import {
  validateProtectedConfig,
  safeValidateProtectedConfig,
  exampleProtectedConfig,
} from '../src/config/schemas/protected-config.schema';

import {
  validateAgentConfig,
  safeValidateAgentConfig,
  exampleAgentConfig,
} from '../src/config/schemas/agent-config.schema';

import {
  isProtectedField,
  isUserEditableField,
  canEditField,
  PROTECTED_FIELDS,
  USER_EDITABLE_FIELDS,
} from '../src/config/schemas/field-classification';

import { BaseValidator } from '../src/config/validators/base-validator';
import { ProtectedConfigSchema } from '../src/config/schemas/protected-config.schema';

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error}`);
    failCount++;
  }
}

console.log('='.repeat(60));
console.log('Phase 1 Validation: TypeScript Schemas and Validators');
console.log('='.repeat(60));
console.log();

// Test 1: Protected Config Schema
test('Protected config schema exports', () => {
  if (typeof validateProtectedConfig !== 'function') {
    throw new Error('validateProtectedConfig not exported');
  }
  if (!exampleProtectedConfig) {
    throw new Error('exampleProtectedConfig not exported');
  }
});

test('Validate example protected config', () => {
  const result = safeValidateProtectedConfig(exampleProtectedConfig);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.message}`);
  }
});

test('Reject invalid protected config', () => {
  const invalidConfig = { version: 'invalid' };
  const result = safeValidateProtectedConfig(invalidConfig);
  if (result.success) {
    throw new Error('Should have rejected invalid config');
  }
});

// Test 2: Agent Config Schema
test('Agent config schema exports', () => {
  if (typeof validateAgentConfig !== 'function') {
    throw new Error('validateAgentConfig not exported');
  }
  if (!exampleAgentConfig) {
    throw new Error('exampleAgentConfig not exported');
  }
});

test('Validate example agent config', () => {
  const result = safeValidateAgentConfig(exampleAgentConfig);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.message}`);
  }
});

test('Reject invalid agent config', () => {
  const invalidConfig = { name: 'Test' }; // Missing required fields
  const result = safeValidateAgentConfig(invalidConfig);
  if (result.success) {
    throw new Error('Should have rejected invalid config');
  }
});

// Test 3: Field Classification
test('Field classification exports', () => {
  if (!PROTECTED_FIELDS || PROTECTED_FIELDS.length === 0) {
    throw new Error('PROTECTED_FIELDS not exported or empty');
  }
  if (!USER_EDITABLE_FIELDS || USER_EDITABLE_FIELDS.length === 0) {
    throw new Error('USER_EDITABLE_FIELDS not exported or empty');
  }
  if (typeof isProtectedField !== 'function') {
    throw new Error('isProtectedField not exported');
  }
});

test('Identify protected fields correctly', () => {
  if (!isProtectedField('workspace')) {
    throw new Error('workspace should be protected');
  }
  if (!isProtectedField('resource_limits')) {
    throw new Error('resource_limits should be protected');
  }
  if (isProtectedField('name')) {
    throw new Error('name should not be protected');
  }
});

test('Identify user-editable fields correctly', () => {
  if (!isUserEditableField('name')) {
    throw new Error('name should be user-editable');
  }
  if (!isUserEditableField('personality')) {
    throw new Error('personality should be user-editable');
  }
  if (isUserEditableField('workspace')) {
    throw new Error('workspace should not be user-editable');
  }
});

test('Field edit permissions (user)', () => {
  if (!canEditField('name', false)) {
    throw new Error('Users should be able to edit name');
  }
  if (canEditField('workspace', false)) {
    throw new Error('Users should not be able to edit workspace');
  }
});

test('Field edit permissions (admin)', () => {
  if (!canEditField('workspace', true)) {
    throw new Error('Admins should be able to edit workspace');
  }
  if (!canEditField('name', true)) {
    throw new Error('Admins should be able to edit name');
  }
});

// Test 4: BaseValidator
test('BaseValidator exports', () => {
  if (typeof BaseValidator !== 'function') {
    throw new Error('BaseValidator not exported');
  }
});

test('BaseValidator validates correct data', () => {
  const validator = new BaseValidator(ProtectedConfigSchema);
  const result = validator.safeValidate(exampleProtectedConfig);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.message}`);
  }
});

test('BaseValidator rejects incorrect data', () => {
  const validator = new BaseValidator(ProtectedConfigSchema);
  const result = validator.safeValidate({ invalid: 'data' });
  if (result.success) {
    throw new Error('Should have rejected invalid data');
  }
});

test('BaseValidator isValid method', () => {
  const validator = new BaseValidator(ProtectedConfigSchema);
  if (!validator.isValid(exampleProtectedConfig)) {
    throw new Error('isValid should return true for valid data');
  }
  if (validator.isValid({ invalid: 'data' })) {
    throw new Error('isValid should return false for invalid data');
  }
});

test('BaseValidator getErrors method', () => {
  const validator = new BaseValidator(ProtectedConfigSchema);
  const errors = validator.getErrors({ invalid: 'data' });
  if (!errors || errors.length === 0) {
    throw new Error('getErrors should return error array');
  }
});

// Summary
console.log();
console.log('='.repeat(60));
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60));

if (failCount > 0) {
  console.error('\n❌ Phase 1 validation FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Phase 1 validation PASSED - All systems operational!');
  console.log();
  console.log('Summary:');
  console.log(`  - Protected fields: ${PROTECTED_FIELDS.length}`);
  console.log(`  - User-editable fields: ${USER_EDITABLE_FIELDS.length}`);
  console.log('  - Schema validation: Working');
  console.log('  - Field classification: Working');
  console.log('  - BaseValidator: Working');
  console.log();
  console.log('Ready for Phase 2: Hybrid Architecture Setup');
  process.exit(0);
}
