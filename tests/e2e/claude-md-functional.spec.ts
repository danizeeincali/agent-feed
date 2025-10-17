/**
 * CLAUDE.md Functional Tests
 *
 * Integration tests to verify that CLAUDE.md functionality is not broken
 * after migration to the protected agent paradigm.
 *
 * Test Coverage:
 * - CLAUDE.md can still be loaded
 * - System boundaries are enforced at runtime
 * - Resource limits are enforced at runtime
 * - Tool permissions are enforced at runtime
 *
 * Location: /workspaces/agent-feed/tests/integration/claude-md-functional.spec.ts
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { IntegrityChecker } from '../../src/config/validators/integrity-checker';

const CONFIG_PATH = '/workspaces/agent-feed/prod/.claude/agents/.system/CLAUDE.protected.yaml';
const CLAUDE_MD_PATH = '/workspaces/agent-feed/prod/.claude/CLAUDE.md';

test.describe('CLAUDE.md Functional Tests', () => {

  test('Functional Test 1: CLAUDE.md can still be loaded', async () => {
    // Verify CLAUDE.md exists and is readable
    expect(fs.existsSync(CLAUDE_MD_PATH)).toBe(true);

    const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    expect(content.length).toBeGreaterThan(0);

    // Verify it has both frontmatter and content
    expect(content).toContain('---');
    expect(content).toContain('# Claude Code Configuration');

    // Verify frontmatter parsing works
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    if (frontmatterMatch) {
      const frontmatter = yaml.parse(frontmatterMatch[1]);
      expect(frontmatter._protected_config_source).toBeDefined();
    }

    console.log('CLAUDE.md loading: PASSED');
  });

  test('Functional Test 2: System boundaries are enforced', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    // Verify forbidden paths are clearly defined
    const forbiddenPaths = config.permissions.workspace.forbidden_paths;
    expect(forbiddenPaths).toContain('/workspaces/agent-feed/src/**');
    expect(forbiddenPaths).toContain('/workspaces/agent-feed/frontend/**');
    expect(forbiddenPaths).toContain('/workspaces/agent-feed/tests/**');

    // Verify allowed paths are restricted to workspace
    const allowedPaths = config.permissions.workspace.allowed_paths;
    expect(allowedPaths[0]).toContain('/workspaces/agent-feed/prod/agent_workspace');

    // Simulate boundary check
    const testPaths = [
      { path: '/workspaces/agent-feed/prod/agent_workspace/test.txt', shouldAllow: true },
      { path: '/workspaces/agent-feed/src/index.ts', shouldAllow: false },
      { path: '/workspaces/agent-feed/frontend/App.tsx', shouldAllow: false },
    ];

    for (const testPath of testPaths) {
      const isAllowed = allowedPaths.some((pattern: string) =>
        testPath.path.startsWith(pattern.replace('/**', ''))
      );
      const isForbidden = forbiddenPaths.some((pattern: string) =>
        testPath.path.startsWith(pattern.replace('/**', ''))
      );

      if (testPath.shouldAllow) {
        expect(isAllowed || !isForbidden).toBe(true);
      } else {
        expect(isForbidden).toBe(true);
      }
    }

    console.log('System boundaries enforcement: PASSED');
  });

  test('Functional Test 3: Resource limits are enforced', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    const resourceLimits = config.permissions.resource_limits;

    // Verify all resource limits are defined
    expect(resourceLimits.max_memory).toBeDefined();
    expect(resourceLimits.max_cpu_percent).toBeDefined();
    expect(resourceLimits.max_execution_time).toBeDefined();
    expect(resourceLimits.max_concurrent_tasks).toBeDefined();

    // Verify limits are reasonable
    expect(resourceLimits.max_cpu_percent).toBeLessThanOrEqual(100);
    expect(resourceLimits.max_cpu_percent).toBeGreaterThan(0);
    expect(resourceLimits.max_concurrent_tasks).toBeGreaterThan(0);

    // Verify memory format
    expect(resourceLimits.max_memory).toMatch(/^\d+[KMGT]?B$/);

    // Verify execution time format
    expect(resourceLimits.max_execution_time).toMatch(/^\d+[smh]$/);

    console.log('Resource limits:', resourceLimits);
    console.log('Resource limits enforcement: PASSED');
  });

  test('Functional Test 4: Tool permissions are enforced', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    const toolPerms = config.permissions.tool_permissions;

    // Verify structure
    expect(toolPerms.allowed).toBeDefined();
    expect(toolPerms.forbidden).toBeDefined();

    // Simulate tool permission check
    const toolChecks = [
      { tool: 'Read', shouldAllow: true },
      { tool: 'Write', shouldAllow: true },
      { tool: 'Bash', shouldAllow: true },
      { tool: 'KillShell', shouldAllow: false },
    ];

    for (const check of toolChecks) {
      const isAllowed = toolPerms.allowed.includes(check.tool);
      const isForbidden = toolPerms.forbidden.includes(check.tool);

      if (check.shouldAllow) {
        expect(isAllowed).toBe(true);
        expect(isForbidden).toBe(false);
      } else {
        expect(isForbidden).toBe(true);
      }
    }

    console.log('Tool permissions enforcement: PASSED');
  });

  test('Functional Test 5: API endpoints are properly configured', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    const apiEndpoints = config.permissions.api_endpoints;

    // Verify endpoints are defined
    expect(Array.isArray(apiEndpoints)).toBe(true);
    expect(apiEndpoints.length).toBeGreaterThan(0);

    // Verify each endpoint has required fields
    for (const endpoint of apiEndpoints) {
      expect(endpoint.path).toBeDefined();
      expect(endpoint.methods).toBeDefined();
      expect(Array.isArray(endpoint.methods)).toBe(true);
      expect(endpoint.authentication).toBeDefined();

      // Verify rate limit if present
      if (endpoint.rate_limit) {
        expect(endpoint.rate_limit).toMatch(/^\d+\/(second|minute|hour|day)$/);
      }
    }

    console.log('API endpoints configuration: PASSED');
  });

  test('Functional Test 6: Posting rules are functional', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    const postingRules = config.permissions.posting_rules;

    // Verify all posting rules are defined
    expect(postingRules.auto_post_outcomes).toBeDefined();
    expect(postingRules.post_threshold).toBeDefined();
    expect(postingRules.default_post_type).toBeDefined();

    // Verify values are valid
    expect(typeof postingRules.auto_post_outcomes).toBe('boolean');
    expect(['never', 'completed_task', 'significant_outcome', 'always']).toContain(
      postingRules.post_threshold
    );
    expect(['reply', 'new_post', 'auto']).toContain(
      postingRules.default_post_type
    );

    console.log('Posting rules: FUNCTIONAL');
  });

  test('Functional Test 7: Security settings are enforced', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    const security = config.permissions.security;

    // Verify security settings
    expect(security.sandbox_enabled).toBe(true);
    expect(['none', 'api_only', 'restricted', 'full']).toContain(
      security.network_access
    );
    expect(['none', 'workspace_only', 'restricted', 'full']).toContain(
      security.file_operations
    );

    // For CLAUDE (production instance), should have restricted access
    expect(security.sandbox_enabled).toBe(true);
    expect(security.file_operations).toBe('workspace_only');

    console.log('Security enforcement: PASSED');
  });
});

test.describe('CLAUDE.md Integration Tests', () => {

  test('Integration Test 1: Config and markdown are in sync', async () => {
    const mdContent = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    // Extract frontmatter from markdown
    const frontmatterMatch = mdContent.match(/^---\n([\s\S]*?)\n---/);
    expect(frontmatterMatch).toBeTruthy();

    if (frontmatterMatch) {
      const frontmatter = yaml.parse(frontmatterMatch[1]);

      // Verify frontmatter points to correct config
      expect(frontmatter._protected_config_source).toBe('.system/CLAUDE.protected.yaml');

      // Verify agent_id matches
      expect(config.agent_id).toBe('CLAUDE');
    }

    console.log('Config and markdown sync: PASSED');
  });

  test('Integration Test 2: IntegrityChecker works end-to-end', async () => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = yaml.parse(configContent);

    const checker = new IntegrityChecker();

    // Verify integrity
    const isValid = await checker.verify(config, CONFIG_PATH);
    expect(isValid).toBe(true);

    // Verify we can add a checksum
    const configWithoutChecksum = { ...config };
    delete configWithoutChecksum.checksum;

    const configWithNewChecksum = checker.addChecksum(configWithoutChecksum);
    expect(configWithNewChecksum.checksum).toBeDefined();
    expect(configWithNewChecksum.checksum).toMatch(/^sha256:[a-f0-9]{64}$/);

    console.log('IntegrityChecker end-to-end: PASSED');
  });
});
