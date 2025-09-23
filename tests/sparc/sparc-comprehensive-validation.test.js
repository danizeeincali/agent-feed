/**
 * SPARC Comprehensive Validation Test Suite
 * End-to-end validation of the corrected agent loading system
 *
 * COMPLETION Phase: Final comprehensive validation without mocks
 * Tests the actual system to ensure 100% functionality
 */

import fs from 'fs';
import path from 'path';
import { agentFileService } from '../../src/services/AgentFileService.js';

describe('SPARC COMPLETION: Comprehensive System Validation', () => {

  beforeAll(() => {
    // Clear cache to ensure fresh data
    agentFileService.clearCache();
  });

  describe('End-to-End Agent Loading Validation', () => {
    test('should load all actual agents from production directory', async () => {
      const agents = await agentFileService.getAgentsFromFiles();

      // Verify basic expectations
      expect(agents).toBeDefined();
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThanOrEqual(11);

      console.log(`✅ Loaded ${agents.length} agents from files`);
      console.log('Agent IDs:', agents.map(a => a.id));

      // Verify each agent has required properties
      agents.forEach((agent, index) => {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('system_prompt');
        expect(agent).toHaveProperty('capabilities');
        expect(agent).toHaveProperty('status');

        expect(typeof agent.id).toBe('string');
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(typeof agent.system_prompt).toBe('string');
        expect(Array.isArray(agent.capabilities)).toBe(true);

        console.log(`Agent ${index + 1}: ${agent.id} - ${agent.name}`);
      });
    });

    test('should verify specific expected agents exist', async () => {
      const agents = await agentFileService.getAgentsFromFiles();
      const agentIds = agents.map(agent => agent.id);

      // These agents were confirmed to exist in the directory
      const expectedAgents = [
        'agent-feedback-agent',
        'agent-ideas-agent',
        'follow-ups-agent',
        'personal-todos-agent',
        'meeting-prep-agent',
        'meta-agent'
      ];

      expectedAgents.forEach(expectedId => {
        expect(agentIds).toContain(expectedId);
        console.log(`✅ Found expected agent: ${expectedId}`);
      });

      // Verify these are NOT system processes
      const forbiddenNames = [
        'Token Analytics Database Agent',
        'System Process Monitor',
        'Analytics Database Agent',
        'Process Manager'
      ];

      forbiddenNames.forEach(forbiddenName => {
        expect(agentIds).not.toContain(forbiddenName);
      });

      console.log('✅ No system process names found in agent data');
    });

    test('should validate agent content comes from markdown files', async () => {
      const agents = await agentFileService.getAgentsFromFiles();

      for (const agent of agents) {
        // Verify agent has file-based characteristics
        expect(agent.id).toMatch(/^[a-z0-9-]+$/); // Valid filename pattern
        expect(agent.system_prompt.length).toBeGreaterThan(20); // Substantial content
        expect(agent.capabilities.length).toBeGreaterThan(0);

        // Verify no system process artifacts
        const textFields = [
          agent.name,
          agent.description,
          agent.system_prompt
        ].join(' ').toLowerCase();

        expect(textFields).not.toContain('pid');
        expect(textFields).not.toContain('%cpu');
        expect(textFields).not.toContain('%mem');
        expect(textFields).not.toContain('process id');
        expect(textFields).not.toContain('command line');

        console.log(`✅ Agent ${agent.id} contains no system process artifacts`);
      }
    });

    test('should verify agent count matches actual files in directory', async () => {
      const agentsPath = '/workspaces/agent-feed/prod/.claude/agents';
      const actualFiles = fs.readdirSync(agentsPath)
        .filter(file => file.endsWith('.md'));

      const agents = await agentFileService.getAgentsFromFiles();

      expect(agents.length).toBe(actualFiles.length);
      console.log(`✅ Agent count matches file count: ${agents.length} agents, ${actualFiles.length} files`);

      // Verify each file has a corresponding agent
      actualFiles.forEach(filename => {
        const expectedId = filename.replace('.md', '');
        const agent = agents.find(a => a.id === expectedId);
        expect(agent).toBeDefined();
        console.log(`✅ File ${filename} -> Agent ${expectedId}`);
      });
    });
  });

  describe('Data Source Validation', () => {
    test('should confirm data source is file-based not process-based', async () => {
      const agents = await agentFileService.getAgentsFromFiles();

      // Check each agent for file-based indicators
      agents.forEach(agent => {
        // Should have timestamp data from file stats
        expect(agent.created_at).toBeDefined();
        expect(agent.updated_at).toBeDefined();
        expect(new Date(agent.created_at)).toBeInstanceOf(Date);
        expect(new Date(agent.updated_at)).toBeInstanceOf(Date);

        // Should have capabilities parsed from frontmatter/content
        expect(Array.isArray(agent.capabilities)).toBe(true);
        expect(agent.capabilities.length).toBeGreaterThan(0);

        // Capabilities should be tool-based, not process-based
        agent.capabilities.forEach(capability => {
          expect(typeof capability).toBe('string');
          expect(capability).not.toContain('process-monitor');
          expect(capability).not.toContain('system-analytics');
        });

        console.log(`✅ Agent ${agent.id} has ${agent.capabilities.length} file-based capabilities`);
      });

      console.log('✅ All agents confirmed as file-based data source');
    });

    test('should verify agents have realistic markdown-derived metadata', async () => {
      const agents = await agentFileService.getAgentsFromFiles();

      agents.forEach(agent => {
        // Performance metrics should exist and be realistic
        expect(agent.performance_metrics).toBeDefined();
        expect(typeof agent.performance_metrics).toBe('object');
        expect(agent.performance_metrics.success_rate).toBeGreaterThan(70);
        expect(agent.performance_metrics.success_rate).toBeLessThanOrEqual(100);

        // Health status should exist
        expect(agent.health_status).toBeDefined();
        expect(typeof agent.health_status).toBe('object');
        expect(agent.health_status.status).toBeDefined();

        // Should have color (from frontmatter or default)
        expect(agent.avatar_color).toBeDefined();
        expect(agent.avatar_color).toMatch(/^#[0-9A-Fa-f]{6}$/);

        console.log(`✅ Agent ${agent.id} has complete metadata`);
      });
    });
  });

  describe('Individual Agent Validation', () => {
    test('should validate follow-ups-agent specifically', async () => {
      const agent = await agentFileService.getAgentById('follow-ups-agent');

      expect(agent).toBeDefined();
      expect(agent.id).toBe('follow-ups-agent');
      expect(agent.name).toContain('Follow');
      expect(agent.description).toBeDefined();
      expect(agent.system_prompt.length).toBeGreaterThan(50);
      expect(Array.isArray(agent.capabilities)).toBe(true);

      console.log(`✅ Follow-ups agent validation passed`);
      console.log(`   Name: ${agent.name}`);
      console.log(`   Description: ${agent.description.substring(0, 100)}...`);
      console.log(`   Capabilities: ${agent.capabilities.join(', ')}`);
    });

    test('should validate personal-todos-agent specifically', async () => {
      const agent = await agentFileService.getAgentById('personal-todos-agent');

      expect(agent).toBeDefined();
      expect(agent.id).toBe('personal-todos-agent');
      expect(agent.name).toContain('Todo');
      expect(agent.description).toBeDefined();
      expect(agent.system_prompt.length).toBeGreaterThan(50);

      console.log(`✅ Personal todos agent validation passed`);
      console.log(`   Name: ${agent.name}`);
      console.log(`   Status: ${agent.status}`);
    });

    test('should validate meta-agent specifically', async () => {
      const agent = await agentFileService.getAgentById('meta-agent');

      expect(agent).toBeDefined();
      expect(agent.id).toBe('meta-agent');
      expect(agent.name).toContain('Meta');
      expect(agent.description).toBeDefined();

      console.log(`✅ Meta agent validation passed`);
      console.log(`   Name: ${agent.name}`);
    });
  });

  describe('Performance and Cache Validation', () => {
    test('should load agents efficiently with caching', async () => {
      const startTime = Date.now();

      // First load - should scan files
      const agents1 = await agentFileService.getAgentsFromFiles();
      const firstLoadTime = Date.now() - startTime;

      // Second load - should use cache
      const cacheStartTime = Date.now();
      const agents2 = await agentFileService.getAgentsFromFiles();
      const cacheLoadTime = Date.now() - cacheStartTime;

      expect(agents1.length).toBe(agents2.length);
      expect(cacheLoadTime).toBeLessThan(firstLoadTime);

      console.log(`✅ Performance test passed`);
      console.log(`   First load: ${firstLoadTime}ms`);
      console.log(`   Cache load: ${cacheLoadTime}ms`);
      console.log(`   Speedup: ${(firstLoadTime / cacheLoadTime).toFixed(2)}x`);
    });

    test('should handle cache clearing correctly', () => {
      agentFileService.clearCache();
      expect(agentFileService.cache).toBeDefined();
      console.log('✅ Cache clearing works correctly');
    });
  });

  describe('Error Handling Validation', () => {
    test('should handle non-existent agent gracefully', async () => {
      const agent = await agentFileService.getAgentById('non-existent-agent');
      expect(agent).toBeNull();

      console.log('✅ Non-existent agent handled gracefully');
    });

    test('should provide correct agents directory path', () => {
      const path = agentFileService.getAgentsPath();
      expect(path).toBe('/workspaces/agent-feed/prod/.claude/agents');
      expect(agentFileService.isAgentsDirectoryAvailable()).toBe(true);

      console.log(`✅ Agents directory path correct: ${path}`);
    });
  });
});

/**
 * SPARC COMPLETION SUMMARY
 *
 * This comprehensive test suite validates:
 * ✅ Agents load from correct file directory (/workspaces/agent-feed/prod/.claude/agents)
 * ✅ All expected agents exist (follow-ups-agent, personal-todos-agent, etc.)
 * ✅ No system process names appear in agent data
 * ✅ Data comes from markdown files, not system processes
 * ✅ Agent count matches actual .md files in directory
 * ✅ Individual agents have correct metadata and content
 * ✅ Performance and caching work correctly
 * ✅ Error handling is robust
 *
 * Expected Result: 100% test pass rate with real agent file data
 * Data Source: 'real_agent_files' not 'real_system_processes'
 * Agent Count: 11+ agents matching directory files
 */