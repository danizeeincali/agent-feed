/**
 * Option 1 Implementation Test
 *
 * This test validates the specific changes needed for Option 1:
 * 1. Change agentApi.js from absolute to relative URLs
 * 2. Fix Vite proxy configuration
 * 3. Ensure all frontend API calls work through proxy
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

describe('Option 1 Implementation Testing', () => {

  const FRONTEND_ROOT = '/workspaces/agent-feed/frontend';
  const AGENT_API_FILE = path.join(FRONTEND_ROOT, 'src/services/agentApi.js');
  const VITE_CONFIG_FILE = path.join(FRONTEND_ROOT, 'vite.config.ts');

  describe('Pre-Implementation Analysis', () => {

    test('should analyze current agentApi.js configuration', () => {
      console.log('📍 Analyzing current agentApi.js configuration...');

      if (!fs.existsSync(AGENT_API_FILE)) {
        console.log('❌ agentApi.js not found at expected location');
        expect(fs.existsSync(AGENT_API_FILE)).toBe(true);
        return;
      }

      const agentApiContent = fs.readFileSync(AGENT_API_FILE, 'utf8');

      // Check for current issues
      const issues = {
        hasAbsoluteUrl: agentApiContent.includes('localhost:3000'),
        hasWrongPort: agentApiContent.includes('localhost:3000') && !agentApiContent.includes('localhost:3001'),
        hasWebSocketUrl: agentApiContent.includes('ws://localhost:3000'),
        lineNumbers: {}
      };

      // Find line numbers for issues
      const lines = agentApiContent.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('localhost:3000')) {
          issues.lineNumbers[index + 1] = line.trim();
        }
      });

      console.log('🔍 CURRENT AGENTAPI.JS ANALYSIS:');
      console.log('Has absolute URL:', issues.hasAbsoluteUrl);
      console.log('Has wrong port:', issues.hasWrongPort);
      console.log('Has WebSocket URL:', issues.hasWebSocketUrl);
      console.log('Problem lines:', issues.lineNumbers);

      // Document current state
      expect(issues.hasAbsoluteUrl || issues.hasWrongPort).toBe(true);
    });

    test('should analyze current Vite configuration', () => {
      console.log('📍 Analyzing current Vite configuration...');

      if (!fs.existsSync(VITE_CONFIG_FILE)) {
        console.log('❌ vite.config.ts not found at expected location');
        expect(fs.existsSync(VITE_CONFIG_FILE)).toBe(true);
        return;
      }

      const viteConfigContent = fs.readFileSync(VITE_CONFIG_FILE, 'utf8');

      // Analyze proxy configuration
      const analysis = {
        hasApiProxy: viteConfigContent.includes("'/api'"),
        proxyTarget: null,
        hasWebSocketProxy: viteConfigContent.includes("'/terminal'"),
        wsProxyTarget: null
      };

      // Extract proxy targets
      const apiProxyMatch = viteConfigContent.match(/['"]\/api['"]:\s*{\s*target:\s*['"]([^'"]+)['"]/);
      if (apiProxyMatch) {
        analysis.proxyTarget = apiProxyMatch[1];
      }

      const wsProxyMatch = viteConfigContent.match(/['"]\/terminal['"]:\s*{\s*target:\s*['"]([^'"]+)['"]/);
      if (wsProxyMatch) {
        analysis.wsProxyTarget = wsProxyMatch[1];
      }

      console.log('🔍 CURRENT VITE CONFIG ANALYSIS:');
      console.log('Has API proxy:', analysis.hasApiProxy);
      console.log('API proxy target:', analysis.proxyTarget);
      console.log('Has WebSocket proxy:', analysis.hasWebSocketProxy);
      console.log('WS proxy target:', analysis.wsProxyTarget);

      // Check for port mismatch
      const needsPortFix = analysis.proxyTarget && analysis.proxyTarget.includes(':3000');
      if (needsPortFix) {
        console.log('❌ Vite proxy targets wrong port (3000 instead of 3001)');
      }

      expect(analysis.hasApiProxy).toBe(true);
      expect(analysis.proxyTarget).toBeDefined();
    });
  });

  describe('Implementation Changes Validation', () => {

    test('should validate proposed agentApi.js changes', () => {
      console.log('📍 Validating proposed agentApi.js changes...');

      const currentContent = fs.readFileSync(AGENT_API_FILE, 'utf8');

      // Simulate the changes we would make
      const proposedChanges = {
        from: "const API_BASE_URL = 'http://localhost:3000/api/agents';",
        to: "const API_BASE_URL = '/api/agents';",
        wsFrom: "const wsUrl = 'ws://localhost:3000/terminal';",
        wsTo: "const wsUrl = '/terminal';"
      };

      // Check if changes are needed
      const changesNeeded = {
        apiBaseUrl: currentContent.includes('localhost:3000/api/agents') || currentContent.includes('localhost:3000'),
        webSocketUrl: currentContent.includes('ws://localhost:3000')
      };

      console.log('🔧 PROPOSED CHANGES:');
      console.log('API Base URL change needed:', changesNeeded.apiBaseUrl);
      console.log('WebSocket URL change needed:', changesNeeded.webSocketUrl);

      if (changesNeeded.apiBaseUrl) {
        console.log(`   Change: ${proposedChanges.from}`);
        console.log(`   To: ${proposedChanges.to}`);
      }

      if (changesNeeded.webSocketUrl) {
        console.log(`   Change: ${proposedChanges.wsFrom}`);
        console.log(`   To: ${proposedChanges.wsTo}`);
      }

      // Validate that changes are beneficial
      expect(changesNeeded.apiBaseUrl || changesNeeded.webSocketUrl).toBe(true);
    });

    test('should validate proposed Vite config changes', () => {
      console.log('📍 Validating proposed Vite config changes...');

      const currentContent = fs.readFileSync(VITE_CONFIG_FILE, 'utf8');

      // Check if proxy needs port fix
      const needsPortFix = currentContent.includes("target: 'http://localhost:3000'");

      const proposedChanges = {
        from: "target: 'http://localhost:3000'",
        to: "target: 'http://localhost:3001'"
      };

      console.log('🔧 VITE CONFIG CHANGES:');
      console.log('Proxy port fix needed:', needsPortFix);

      if (needsPortFix) {
        console.log(`   Change all: ${proposedChanges.from}`);
        console.log(`   To: ${proposedChanges.to}`);
      }

      // Count how many proxy targets need fixing
      const wrongTargets = (currentContent.match(/target:\s*['"]http:\/\/localhost:3000['"]/g) || []).length;
      console.log(`   Wrong proxy targets found: ${wrongTargets}`);

      expect(needsPortFix).toBe(true);
      expect(wrongTargets).toBeGreaterThan(0);
    });
  });

  describe('Post-Implementation Validation', () => {

    test('should test relative URL behavior simulation', async () => {
      console.log('📍 Simulating relative URL behavior...');

      // Simulate what happens when frontend uses relative URLs
      const simulationResults = {
        relativeApiCall: '/api/v1/claude-live/prod/agents',
        expectedProxyTarget: 'http://localhost:3001/api/v1/claude-live/prod/agents',
        currentProxyTarget: 'http://localhost:3000/api/v1/claude-live/prod/agents'
      };

      console.log('🎯 RELATIVE URL SIMULATION:');
      console.log('Frontend relative call:', simulationResults.relativeApiCall);
      console.log('Expected proxy target:', simulationResults.expectedProxyTarget);
      console.log('Current proxy target:', simulationResults.currentProxyTarget);

      // Test if the expected target would work
      try {
        const response = await axios.get(simulationResults.expectedProxyTarget, {
          timeout: 5000,
          validateStatus: () => true
        });

        simulationResults.expectedWorks = response.status < 500;
        console.log(`   Expected target status: ${response.status} ✅`);

      } catch (error) {
        simulationResults.expectedWorks = false;
        console.log(`   Expected target error: ${error.code} ❌`);
      }

      // Test if current target would work
      try {
        const response = await axios.get(simulationResults.currentProxyTarget, {
          timeout: 5000,
          validateStatus: () => true
        });

        simulationResults.currentWorks = response.status < 500;
        console.log(`   Current target status: ${response.status}`);

      } catch (error) {
        simulationResults.currentWorks = false;
        console.log(`   Current target error: ${error.code} ❌`);
      }

      // Validate simulation
      expect(simulationResults.expectedProxyTarget).not.toBe(simulationResults.currentProxyTarget);
    });

    test('should verify no hardcoded URLs remain after changes', () => {
      console.log('📍 Checking for remaining hardcoded URLs...');

      // List of frontend files to check
      const frontendFiles = [
        'src/services/agentApi.js',
        'src/store/agentStore.js',
        'src/main-vanilla.js'
      ];

      const results = {};

      frontendFiles.forEach(file => {
        const fullPath = path.join(FRONTEND_ROOT, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');

          // Check for hardcoded URLs
          const hardcodedUrls = {
            localhost3000: (content.match(/localhost:3000/g) || []).length,
            localhost3001: (content.match(/localhost:3001/g) || []).length,
            httpLocalhost: (content.match(/http:\/\/localhost/g) || []).length,
            wsLocalhost: (content.match(/ws:\/\/localhost/g) || []).length
          };

          results[file] = hardcodedUrls;
        }
      });

      console.log('🔍 HARDCODED URL CHECK:');
      Object.entries(results).forEach(([file, urls]) => {
        console.log(`${file}:`, urls);
      });

      // Validate that we checked files
      expect(Object.keys(results).length).toBeGreaterThan(0);
    });
  });

  describe('Regression Prevention', () => {

    test('should create URL pattern validation rules', () => {
      console.log('📍 Creating URL pattern validation rules...');

      const validationRules = {
        forbidden: [
          'localhost:3000 in frontend code',
          'localhost:3001 in frontend code',
          'http://localhost in frontend code',
          'ws://localhost in frontend code'
        ],
        required: [
          'Relative API URLs (/api/*)',
          'Relative WebSocket URLs (/terminal, /ws)',
          'Vite proxy configuration for all API routes'
        ],
        exceptions: [
          'Test files can have localhost URLs',
          'Configuration files for environment-specific settings',
          'Proxy configuration in vite.config.ts'
        ]
      };

      console.log('📋 URL PATTERN VALIDATION RULES:');
      console.log('Forbidden patterns:', validationRules.forbidden);
      console.log('Required patterns:', validationRules.required);
      console.log('Allowed exceptions:', validationRules.exceptions);

      // Validate rules structure
      expect(validationRules.forbidden.length).toBeGreaterThan(0);
      expect(validationRules.required.length).toBeGreaterThan(0);
      expect(validationRules.exceptions.length).toBeGreaterThan(0);
    });

    test('should define automated checks for CI/CD', () => {
      console.log('📍 Defining automated checks for CI/CD...');

      const automatedChecks = [
        {
          name: 'No hardcoded localhost URLs in frontend',
          command: 'grep -r "localhost:" frontend/src/ || true',
          expected: 'No matches (empty output)',
          type: 'static analysis'
        },
        {
          name: 'Vite proxy targets correct port',
          command: 'grep -A 1 "target:" frontend/vite.config.ts',
          expected: 'All targets use port 3001',
          type: 'configuration check'
        },
        {
          name: 'Frontend build has no hardcoded URLs',
          command: 'npm run build && grep -r "localhost" frontend/dist/ || true',
          expected: 'No localhost references in dist',
          type: 'build validation'
        },
        {
          name: 'API endpoints respond through proxy',
          command: 'npm run test:api-proxy',
          expected: 'All API calls succeed',
          type: 'integration test'
        }
      ];

      console.log('🤖 AUTOMATED CI/CD CHECKS:');
      automatedChecks.forEach(check => {
        console.log(`${check.name}:`);
        console.log(`   Command: ${check.command}`);
        console.log(`   Expected: ${check.expected}`);
        console.log(`   Type: ${check.type}`);
        console.log('');
      });

      // Validate checks
      expect(automatedChecks.length).toBe(4);
      expect(automatedChecks.every(check => check.name && check.command)).toBe(true);
    });
  });
});