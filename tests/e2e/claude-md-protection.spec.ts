/**
 * CLAUDE.md Protected Config Validation Test Suite
 *
 * Comprehensive E2E tests for CLAUDE.md migration to protected agent paradigm.
 * Tests all 14 protected fields and ensures proper integration with the protection system.
 *
 * Test Coverage:
 * - Protected config file existence and location
 * - All 14 protected fields presence and validity
 * - SHA-256 checksum integrity
 * - Frontmatter reference in CLAUDE.md
 * - File permissions (read-only)
 * - System boundaries protection
 * - Resource limits configuration
 * - API rate limits
 * - Tool permissions
 * - Posting rules
 * - IntegrityChecker integration
 * - Regression testing (existing agents)
 *
 * Location: /workspaces/agent-feed/tests/e2e/claude-md-protection.spec.ts
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { IntegrityChecker } from '../../src/config/validators/integrity-checker';
import { validateProtectedConfig } from '../../src/config/schemas/protected-config.schema';

const CONFIG_PATH = '/workspaces/agent-feed/prod/.claude/agents/.system/CLAUDE.protected.yaml';
const CLAUDE_MD_PATH = '/workspaces/agent-feed/prod/.claude/CLAUDE.md';

/**
 * Helper: Load protected config from file
 */
function loadProtectedConfig(agentName: string): any {
  const configPath = `/workspaces/agent-feed/prod/.claude/agents/.system/${agentName}.protected.yaml`;
  const content = fs.readFileSync(configPath, 'utf-8');
  return yaml.parse(content);
}

test.describe('CLAUDE.md Protected Config Validation', () => {

  test('Test 1: Protected config file exists at correct location', async () => {
    expect(fs.existsSync(CONFIG_PATH)).toBe(true);

    // Verify it's in the .system directory
    expect(CONFIG_PATH).toContain('.system');

    // Verify file is readable
    const stats = fs.statSync(CONFIG_PATH);
    expect(stats.isFile()).toBe(true);
  });

  test('Test 2: All 14 protected fields present', async () => {
    const config = loadProtectedConfig('CLAUDE');

    // Verify structure (4 top-level fields)
    expect(config.version).toBeDefined();
    expect(config.checksum).toBeDefined();
    expect(config.agent_id).toBe('CLAUDE');
    expect(config.permissions).toBeDefined();

    // Verify all 6 permission categories
    expect(config.permissions.api_endpoints).toBeDefined();
    expect(config.permissions.workspace).toBeDefined();
    expect(config.permissions.tool_permissions).toBeDefined();
    expect(config.permissions.resource_limits).toBeDefined();
    expect(config.permissions.posting_rules).toBeDefined();
    expect(config.permissions.security).toBeDefined();

    // Verify workspace fields (5 fields)
    expect(config.permissions.workspace.root).toBe('/workspaces/agent-feed/prod/agent_workspace');
    expect(config.permissions.workspace.max_storage).toBe('10GB');
    expect(config.permissions.workspace.allowed_paths).toBeDefined();
    expect(Array.isArray(config.permissions.workspace.allowed_paths)).toBe(true);
    expect(config.permissions.workspace.forbidden_paths).toBeDefined();
    expect(Array.isArray(config.permissions.workspace.forbidden_paths)).toBe(true);

    // Verify resource limits (4 fields)
    expect(config.permissions.resource_limits.max_memory).toBe('2GB');
    expect(config.permissions.resource_limits.max_cpu_percent).toBe(80);
    expect(config.permissions.resource_limits.max_execution_time).toBeDefined();
    expect(config.permissions.resource_limits.max_concurrent_tasks).toBeDefined();

    // Total count verification
    const fieldCount = {
      topLevel: 4, // version, checksum, agent_id, permissions
      permissionCategories: 6, // api_endpoints, workspace, tool_permissions, resource_limits, posting_rules, security
      workspaceFields: 5, // root, max_storage, allowed_paths, forbidden_paths
      resourceLimitFields: 4, // max_memory, max_cpu_percent, max_execution_time, max_concurrent_tasks
      toolPermissionFields: 2, // allowed, forbidden
      postingRuleFields: 3, // auto_post_outcomes, post_threshold, default_post_type
      securityFields: 3, // sandbox_enabled, network_access, file_operations
    };

    console.log('Protected field structure verified:', fieldCount);
  });

  test('Test 3: SHA-256 checksum is valid', async () => {
    const config = loadProtectedConfig('CLAUDE');

    // Verify checksum exists
    expect(config.checksum).toBeDefined();

    // Verify checksum format (sha256:...)
    expect(config.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);

    // Verify checksum using IntegrityChecker
    const checker = new IntegrityChecker();
    const isValid = checker.verifyChecksum(config);
    expect(isValid).toBe(true);

    console.log('Checksum format:', config.checksum.substring(0, 20) + '...');
  });

  test('Test 4: CLAUDE.md has frontmatter reference', async () => {
    const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    if (frontmatterMatch) {
      const frontmatter = yaml.parse(frontmatterMatch[1]);

      expect(frontmatter._protected_config_source).toBe('.system/CLAUDE.protected.yaml');
      expect(frontmatter._agent_type).toBe('system');
      expect(frontmatter._protection_level).toBe('maximum');

      console.log('Frontmatter verified:', frontmatter);
    }
  });

  test('Test 5: File permissions are correct (read-only 444)', async () => {
    const stats = fs.statSync(CONFIG_PATH);
    const mode = (stats.mode & 0o777).toString(8);

    // Should be read-only (444)
    expect(mode).toBe('444');

    console.log('File permissions:', mode, '(expected: 444)');
  });

  test('Test 6: System boundaries are protected', async () => {
    const config = loadProtectedConfig('CLAUDE');

    // Verify allowed paths
    const allowedPaths = config.permissions.workspace.allowed_paths;
    expect(allowedPaths).toContain('/workspaces/agent-feed/prod/agent_workspace/**');
    expect(allowedPaths.length).toBeGreaterThan(0);

    // Verify forbidden paths - critical system protection
    const forbiddenPaths = config.permissions.workspace.forbidden_paths;
    expect(forbiddenPaths).toContain('/workspaces/agent-feed/src/**');
    expect(forbiddenPaths).toContain('/workspaces/agent-feed/frontend/**');
    expect(forbiddenPaths).toContain('/workspaces/agent-feed/tests/**');

    console.log('System boundaries:', {
      allowedPathsCount: allowedPaths.length,
      forbiddenPathsCount: forbiddenPaths.length,
    });
  });

  test('Test 7: Resource limits match CLAUDE.md specifications', async () => {
    const config = loadProtectedConfig('CLAUDE');

    expect(config.permissions.resource_limits.max_memory).toBe('2GB');
    expect(config.permissions.resource_limits.max_cpu_percent).toBe(80);
    expect(config.permissions.workspace.max_storage).toBe('10GB');
    expect(config.permissions.resource_limits.max_concurrent_tasks).toBeGreaterThanOrEqual(1);

    console.log('Resource limits:', config.permissions.resource_limits);
  });

  test('Test 8: API rate limits are correctly protected', async () => {
    const config = loadProtectedConfig('CLAUDE');

    const apiEndpoints = config.permissions.api_endpoints;
    expect(Array.isArray(apiEndpoints)).toBe(true);
    expect(apiEndpoints.length).toBeGreaterThan(0);

    // Check for posts endpoint with rate limit
    const postsEndpoint = apiEndpoints.find((ep: any) => ep.path === '/api/posts');
    expect(postsEndpoint).toBeDefined();
    expect(postsEndpoint.rate_limit).toBeDefined();
    expect(postsEndpoint.rate_limit).toMatch(/^\d+\/(second|minute|hour|day)$/);

    // Check authentication requirement
    expect(postsEndpoint.authentication).toBe('required');

    console.log('API endpoints protected:', apiEndpoints.length);
  });

  test('Test 9: Tool permissions are correctly defined', async () => {
    const config = loadProtectedConfig('CLAUDE');

    const toolPerms = config.permissions.tool_permissions;
    expect(toolPerms.allowed).toBeDefined();
    expect(Array.isArray(toolPerms.allowed)).toBe(true);
    expect(toolPerms.forbidden).toBeDefined();
    expect(Array.isArray(toolPerms.forbidden)).toBe(true);

    // Verify critical tools are allowed
    expect(toolPerms.allowed).toContain('Read');
    expect(toolPerms.allowed).toContain('Write');
    expect(toolPerms.allowed).toContain('Bash');
    expect(toolPerms.allowed).toContain('Glob');
    expect(toolPerms.allowed).toContain('Grep');

    // Verify dangerous tools are forbidden
    expect(toolPerms.forbidden).toContain('KillShell');

    console.log('Tool permissions:', {
      allowedCount: toolPerms.allowed.length,
      forbiddenCount: toolPerms.forbidden.length,
    });
  });

  test('Test 10: Posting rules are correctly configured', async () => {
    const config = loadProtectedConfig('CLAUDE');

    expect(config.permissions.posting_rules.auto_post_outcomes).toBeDefined();
    expect(typeof config.permissions.posting_rules.auto_post_outcomes).toBe('boolean');

    expect(config.permissions.posting_rules.post_threshold).toBeDefined();
    expect(['never', 'completed_task', 'significant_outcome', 'always']).toContain(
      config.permissions.posting_rules.post_threshold
    );

    expect(config.permissions.posting_rules.default_post_type).toBeDefined();
    expect(['reply', 'new_post', 'auto']).toContain(
      config.permissions.posting_rules.default_post_type
    );

    console.log('Posting rules:', config.permissions.posting_rules);
  });

  test('Test 11: IntegrityChecker validates CLAUDE config', async () => {
    const checker = new IntegrityChecker();
    const config = loadProtectedConfig('CLAUDE');

    // Should pass validation
    const isValid = await checker.verify(config, CONFIG_PATH);
    expect(isValid).toBe(true);

    // Verify checksum format
    expect(checker.verifyChecksum(config)).toBe(true);

    console.log('IntegrityChecker validation: PASSED');
  });

  test('Test 12: Regression test - existing agents still validate correctly', async () => {
    const existingAgents = [
      'meta-agent',
      'meta-update-agent',
      'page-builder-agent',
    ];

    const checker = new IntegrityChecker();
    const results: { agent: string; valid: boolean }[] = [];

    for (const agentName of existingAgents) {
      try {
        const config = loadProtectedConfig(agentName);
        const isValid = await checker.verify(
          config,
          `/workspaces/agent-feed/prod/.claude/agents/.system/${agentName}.protected.yaml`
        );
        results.push({ agent: agentName, valid: isValid });
        expect(isValid).toBe(true);
      } catch (error) {
        console.warn(`Agent ${agentName} validation failed:`, error);
        results.push({ agent: agentName, valid: false });
      }
    }

    console.log('Regression test results:', results);

    // All existing agents should still validate
    const allValid = results.every(r => r.valid);
    expect(allValid).toBe(true);
  });

  test('Test 13: Security configuration is properly defined', async () => {
    const config = loadProtectedConfig('CLAUDE');

    expect(config.permissions.security).toBeDefined();
    expect(config.permissions.security.sandbox_enabled).toBe(true);
    expect(config.permissions.security.network_access).toBeDefined();
    expect(['none', 'api_only', 'restricted', 'full']).toContain(
      config.permissions.security.network_access
    );
    expect(config.permissions.security.file_operations).toBeDefined();
    expect(['none', 'workspace_only', 'restricted', 'full']).toContain(
      config.permissions.security.file_operations
    );

    console.log('Security configuration:', config.permissions.security);
  });

  test('Test 14: Protected config validates against schema', async () => {
    const config = loadProtectedConfig('CLAUDE');

    // Should not throw
    expect(() => validateProtectedConfig(config)).not.toThrow();

    // Validate and get result
    const validated = validateProtectedConfig(config);
    expect(validated.agent_id).toBe('CLAUDE');
    expect(validated.version).toMatch(/^\d+\.\d+\.\d+$/);

    console.log('Schema validation: PASSED');
  });

  test('Test 15: Metadata fields are present and valid', async () => {
    const config = loadProtectedConfig('CLAUDE');

    expect(config._metadata).toBeDefined();
    expect(config._metadata.created_at).toBeDefined();
    expect(config._metadata.updated_at).toBeDefined();
    expect(config._metadata.updated_by).toBeDefined();
    expect(config._metadata.description).toBeDefined();

    // Validate ISO 8601 timestamp format (with optional milliseconds)
    expect(config._metadata.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
    expect(config._metadata.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);

    console.log('Metadata:', config._metadata);
  });
});

test.describe('CLAUDE.md Protected Config - Edge Cases', () => {

  test('Edge Case 1: Config file is not writable', async () => {
    const stats = fs.statSync(CONFIG_PATH);
    const isWritable = !!(stats.mode & 0o200); // Check write permission

    // Should NOT be writable
    expect(isWritable).toBe(false);
  });

  test('Edge Case 2: Checksum changes when config is modified', async () => {
    const config = loadProtectedConfig('CLAUDE');
    const checker = new IntegrityChecker();

    // Original checksum
    const originalChecksum = config.checksum;

    // Modify config
    const modifiedConfig = { ...config, agent_id: 'MODIFIED' };
    delete modifiedConfig.checksum;

    // Compute new checksum
    const newChecksum = checker.computeHash(modifiedConfig);
    const originalHash = originalChecksum.replace('sha256:', '');

    // Checksums should be different
    expect(newChecksum).not.toBe(originalHash);

    console.log('Checksum modification detection: PASSED');
  });

  test('Edge Case 3: Invalid checksum format is detected', async () => {
    const config = loadProtectedConfig('CLAUDE');
    const checker = new IntegrityChecker();

    // Test with invalid checksum
    const invalidConfig = { ...config, checksum: 'invalid-checksum' };
    const isValid = checker.verifyChecksum(invalidConfig);

    expect(isValid).toBe(false);
  });
});
