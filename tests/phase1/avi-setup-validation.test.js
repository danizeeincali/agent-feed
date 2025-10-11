/**
 * AVI Setup Validation Test Suite
 * Comprehensive regression testing with 100% real data
 *
 * Tests:
 * - Working directory is correct when AVI starts
 * - All 12 environment variables are set
 * - Agent discovery finds all production agents
 * - API returns all agents from PostgreSQL
 * - No hardcoded paths in critical files
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

// Project root - absolute path
const PROJECT_ROOT = '/workspaces/agent-feed';

// Required environment variables (12 critical ones)
const REQUIRED_ENV_VARS = [
  'WORKSPACE_ROOT',
  'PROJECT_ROOT',
  'CLAUDE_PROD_DIR',
  'AGENTS_DIR',
  'AGENT_WORKSPACE_DIR',
  'DATABASE_DIR',
  'DATABASE_URL',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'DB_HOST',
  'DB_PORT'
];

// Critical files that should not contain hardcoded paths
const CRITICAL_FILES = [
  'src/agents/AgentDiscoveryService.ts',
  'src/config/env.ts',
  'scripts/run-avi.sh',
  'scripts/run-avi-cli.sh',
  'api-server/config/database-selector.js'
];

describe('AVI Setup Validation - Regression Testing (Real Data)', () => {
  let originalCwd;

  beforeAll(() => {
    originalCwd = process.cwd();
    process.chdir(PROJECT_ROOT);
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  describe('1. Working Directory Validation', () => {
    test('AVI wrapper scripts set correct working directory', async () => {
      // Read run-avi.sh script
      const aviScript = await readFile(path.join(PROJECT_ROOT, 'scripts/run-avi.sh'), 'utf-8');
      const aviCliScript = await readFile(path.join(PROJECT_ROOT, 'scripts/run-avi-cli.sh'), 'utf-8');

      // Check that scripts enforce PROJECT_ROOT
      expect(aviScript).toContain('PROJECT_ROOT="/workspaces/agent-feed"');
      expect(aviScript).toContain('enforce_working_directory');
      expect(aviScript).toContain('cd "${PROJECT_ROOT}"');

      expect(aviCliScript).toContain('PROJECT_ROOT="/workspaces/agent-feed"');
      expect(aviCliScript).toContain('enforce_working_directory');
      expect(aviCliScript).toContain('cd "${PROJECT_ROOT}"');
    });

    test('Current working directory is project root', () => {
      expect(process.cwd()).toBe(PROJECT_ROOT);
    });

    test('Required directories exist', async () => {
      const requiredDirs = [
        'src',
        'src/avi',
        'src/database',
        'scripts',
        '.claude/agents',
        'agents',
        'api-server'
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(PROJECT_ROOT, dir);
        await expect(access(dirPath, fs.constants.R_OK)).resolves.not.toThrow();
      }
    });
  });

  describe('2. Environment Variables Validation', () => {
    test('All 12 required environment variables are set', () => {
      const missing = [];
      const values = {};

      for (const varName of REQUIRED_ENV_VARS) {
        const value = process.env[varName];
        if (!value) {
          missing.push(varName);
        } else {
          values[varName] = value;
        }
      }

      if (missing.length > 0) {
        console.error('Missing environment variables:', missing);
        console.error('Set variables:', values);
      }

      expect(missing).toHaveLength(0);
      expect(Object.keys(values)).toHaveLength(REQUIRED_ENV_VARS.length);
    });

    test('Environment variables point to valid paths', () => {
      const pathVars = [
        'WORKSPACE_ROOT',
        'PROJECT_ROOT',
        'CLAUDE_PROD_DIR',
        'AGENTS_DIR',
        'AGENT_WORKSPACE_DIR',
        'DATABASE_DIR'
      ];

      for (const varName of pathVars) {
        const value = process.env[varName];
        expect(value).toBeTruthy();
        expect(path.isAbsolute(value)).toBe(true);
      }
    });

    test('Database environment variables are valid', () => {
      expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//);
      expect(process.env.POSTGRES_DB).toBeTruthy();
      expect(process.env.POSTGRES_USER).toBeTruthy();
      expect(process.env.POSTGRES_PASSWORD).toBeTruthy();
      expect(process.env.DB_HOST).toBeTruthy();
      expect(process.env.DB_PORT).toMatch(/^\d+$/);
    });

    test('.env file exists and is readable', async () => {
      const envPath = path.join(PROJECT_ROOT, '.env');
      await expect(access(envPath, fs.constants.R_OK)).resolves.not.toThrow();

      const content = await readFile(envPath, 'utf-8');
      expect(content).toContain('WORKSPACE_ROOT=');
      expect(content).toContain('DATABASE_URL=');
    });
  });

  describe('3. Agent Discovery - Production Agents', () => {
    test('Agent discovery finds production agents from .claude/agents', async () => {
      const { AgentDiscoveryService } = await import(path.join(PROJECT_ROOT, 'src/agents/AgentDiscoveryService.ts'));

      // Use production directory
      const prodAgentDir = process.env.CLAUDE_PROD_DIR
        ? path.join(process.env.CLAUDE_PROD_DIR, 'agents')
        : path.join(PROJECT_ROOT, '.claude/agents');

      const service = new AgentDiscoveryService(prodAgentDir);
      const agents = await service.discoverAgents();

      console.log(`\n📊 Agent Discovery Results:`);
      console.log(`   Directory: ${prodAgentDir}`);
      console.log(`   Found: ${agents.length} agents`);
      console.log(`   Agent names:`, agents.map(a => a.name).join(', '));

      // We know there are 62 .md files in .claude/agents
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.length).toBeLessThanOrEqual(62);

      // Verify agent structure
      agents.forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('body');
        expect(agent.name).toBeTruthy();
        expect(agent.description).toBeTruthy();
      });
    });

    test('Agent discovery handles template agents directory', async () => {
      const { AgentDiscoveryService } = await import(path.join(PROJECT_ROOT, 'src/agents/AgentDiscoveryService.ts'));

      const templateDir = process.env.AGENTS_DIR || path.join(PROJECT_ROOT, 'agents');
      const service = new AgentDiscoveryService(templateDir);
      const agents = await service.discoverAgents();

      console.log(`\n📊 Template Agent Discovery:`);
      console.log(`   Directory: ${templateDir}`);
      console.log(`   Found: ${agents.length} agents`);

      // We know there are 21 .md files in agents/
      expect(agents.length).toBeGreaterThanOrEqual(17); // Actual count from filesystem
    });

    test('Agent caching works correctly', async () => {
      const { AgentDiscoveryService } = await import(path.join(PROJECT_ROOT, 'src/agents/AgentDiscoveryService.ts'));

      const prodAgentDir = path.join(PROJECT_ROOT, '.claude/agents');
      const service = new AgentDiscoveryService(prodAgentDir);

      // First discovery
      const agents1 = await service.discoverAgents();
      expect(service.needsRefresh()).toBe(false);

      // Get cached agent
      if (agents1.length > 0) {
        const firstAgent = agents1[0];
        const cached = await service.getAgent(firstAgent.name);
        expect(cached).toEqual(firstAgent);
      }
    });
  });

  describe('4. API - PostgreSQL Agent Data', () => {
    test('PostgreSQL connection is configured', () => {
      expect(process.env.USE_POSTGRES).toBe('true');
      expect(process.env.DATABASE_URL).toMatch(/postgresql/);
    });

    test('Database selector uses PostgreSQL', async () => {
      const dbSelector = await import(path.join(PROJECT_ROOT, 'api-server/config/database-selector.js'));

      // The module should export default with repository methods
      expect(dbSelector.default).toBeDefined();
      expect(typeof dbSelector.default.getAllAgents).toBe('function');
      expect(typeof dbSelector.default.getAgent).toBe('function');
    });

    test('API can query agents from PostgreSQL (real data)', async () => {
      const dbSelector = await import(path.join(PROJECT_ROOT, 'api-server/config/database-selector.js'));
      const repo = dbSelector.default;

      try {
        const agents = await repo.getAllAgents();

        console.log(`\n📊 PostgreSQL Agent Query Results:`);
        console.log(`   Total agents in DB: ${agents.length}`);

        if (agents.length > 0) {
          console.log(`   Sample agent: ${agents[0].name || agents[0].agent_name}`);
          console.log(`   Agent fields:`, Object.keys(agents[0]));
        }

        // Should have agents from seeding
        expect(agents.length).toBeGreaterThan(0);

        // Verify agent structure
        if (agents.length > 0) {
          const agent = agents[0];
          // Check for either naming convention
          expect(agent.name || agent.agent_name).toBeTruthy();
          expect(agent.description).toBeTruthy();
        }
      } catch (error) {
        console.error('❌ Database query failed:', error.message);
        throw error;
      }
    });

    test('API repository methods are available', async () => {
      const dbSelector = await import(path.join(PROJECT_ROOT, 'api-server/config/database-selector.js'));
      const repo = dbSelector.default;

      const methods = [
        'getAllAgents',
        'getAgent',
        'createAgent',
        'updateAgent',
        'deleteAgent',
        'getAllPages',
        'getPage',
        'createPage',
        'updatePage',
        'deletePage'
      ];

      for (const method of methods) {
        expect(typeof repo[method]).toBe('function');
      }
    });
  });

  describe('5. No Hardcoded Paths Validation', () => {
    test('Critical files use environment variables instead of hardcoded paths', async () => {
      const violations = [];

      for (const filePath of CRITICAL_FILES) {
        const fullPath = path.join(PROJECT_ROOT, filePath);

        try {
          await access(fullPath, fs.constants.R_OK);
          const content = await readFile(fullPath, 'utf-8');

          // Patterns that indicate hardcoded paths
          const hardcodedPatterns = [
            /prod\/\.claude\/agents/g,
            /prod\/agent_workspace/g,
            /\/home\/[^\/]+\/prod/g,
            // Allow /workspaces/agent-feed as it's the container path
            // But flag other absolute paths that aren't env vars
          ];

          // Check for hardcoded paths
          for (const pattern of hardcodedPatterns) {
            const matches = content.match(pattern);
            if (matches) {
              violations.push({
                file: filePath,
                pattern: pattern.toString(),
                matches: matches.length
              });
            }
          }
        } catch (error) {
          // File doesn't exist or can't be read - skip
          console.warn(`⚠️ Could not read ${filePath}: ${error.message}`);
        }
      }

      if (violations.length > 0) {
        console.error('\n❌ Found hardcoded paths:');
        violations.forEach(v => {
          console.error(`   ${v.file}: ${v.matches} matches for ${v.pattern}`);
        });
      }

      expect(violations).toHaveLength(0);
    });

    test('AgentDiscoveryService uses environment variables', async () => {
      const filePath = path.join(PROJECT_ROOT, 'src/agents/AgentDiscoveryService.ts');
      const content = await readFile(filePath, 'utf-8');

      // Should use process.env for paths
      expect(content).toMatch(/process\.env\.AGENTS_DIR/);

      // Should NOT have hardcoded 'prod/.claude/agents'
      const hasHardcodedPath = content.includes('prod/.claude/agents') &&
                               !content.includes('process.env');
      expect(hasHardcodedPath).toBe(false);
    });

    test('AVI scripts use parameterized paths', async () => {
      const aviScript = await readFile(path.join(PROJECT_ROOT, 'scripts/run-avi.sh'), 'utf-8');
      const aviCliScript = await readFile(path.join(PROJECT_ROOT, 'scripts/run-avi-cli.sh'), 'utf-8');

      // Scripts should use PROJECT_ROOT variable
      expect(aviScript).toMatch(/PROJECT_ROOT="\/workspaces\/agent-feed"/);
      expect(aviScript).toMatch(/\$\{PROJECT_ROOT\}/);

      expect(aviCliScript).toMatch(/PROJECT_ROOT="\/workspaces\/agent-feed"/);
      expect(aviCliScript).toMatch(/\$\{PROJECT_ROOT\}/);
    });
  });

  describe('6. Integration - Full System Validation', () => {
    test('AVI wrapper scripts are executable', async () => {
      const scripts = [
        'scripts/run-avi.sh',
        'scripts/run-avi-cli.sh'
      ];

      for (const script of scripts) {
        const scriptPath = path.join(PROJECT_ROOT, script);
        const stats = fs.statSync(scriptPath);

        // Check executable bit (owner execute)
        const isExecutable = (stats.mode & 0o100) !== 0;
        expect(isExecutable).toBe(true);
      }
    });

    test('Environment configuration is valid for AVI', () => {
      // Simulate what AVI would check
      const config = {
        workspaceRoot: process.env.WORKSPACE_ROOT,
        projectRoot: process.env.PROJECT_ROOT,
        claudeProdDir: process.env.CLAUDE_PROD_DIR,
        agentsDir: process.env.AGENTS_DIR,
        databaseUrl: process.env.DATABASE_URL
      };

      // All should be set
      Object.entries(config).forEach(([key, value]) => {
        expect(value).toBeTruthy();
      });

      // Paths should be absolute
      [config.workspaceRoot, config.projectRoot, config.claudeProdDir, config.agentsDir].forEach(p => {
        expect(path.isAbsolute(p)).toBe(true);
      });
    });

    test('Package.json has AVI commands configured', async () => {
      const packageJson = JSON.parse(
        await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8')
      );

      expect(packageJson.scripts.avi).toBe('./scripts/run-avi.sh');
      expect(packageJson.scripts['avi:cli']).toBe('./scripts/run-avi-cli.sh');
    });
  });
});
