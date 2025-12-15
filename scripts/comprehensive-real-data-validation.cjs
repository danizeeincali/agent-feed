#!/usr/bin/env node

/**
 * Comprehensive Real Data Validation Script
 * Tests all API endpoints and data sources for 100% authentic functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

class RealDataValidator {
  constructor() {
    this.results = {
      apiEndpoints: {},
      databaseConnections: {},
      dataAuthenticity: {},
      authIntegrations: {},
      mockDataFound: [],
      realDataSources: [],
      issues: [],
      score: 0
    };
    this.workspaceRoot = '/workspaces/agent-feed';
  }

  async validateAll() {
    console.log('🔍 Starting comprehensive real data validation...\n');

    try {
      await this.validateAPIEndpoints();
      await this.validateDatabaseConnections();
      await this.validateTokenTracking();
      await this.scanForMockData();
      await this.validateAgentSources();
      await this.validateAuthIntegrations();

      this.calculateScore();
      await this.generateReport();

      console.log('\n✅ Validation complete! Check report at /workspaces/agent-feed/tests/real-data-validation.md');

    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.results.issues.push(`Validation script error: ${error.message}`);
    }
  }

  async validateAPIEndpoints() {
    console.log('📡 Validating API endpoints...');

    const endpoints = [
      { path: '/api/agents', method: 'GET', description: 'Agent discovery' },
      { path: '/api/token-analytics', method: 'GET', description: 'Token analytics' },
      { path: '/api/claude/instances', method: 'GET', description: 'Claude instances' },
      { path: '/api/feeds', method: 'GET', description: 'Feed data' },
      { path: '/api/comments', method: 'GET', description: 'Comments' }
    ];

    for (const endpoint of endpoints) {
      try {
        // Check if endpoint file exists
        const possiblePaths = [
          path.join(this.workspaceRoot, 'pages', 'api', endpoint.path.replace('/api/', '') + '.js'),
          path.join(this.workspaceRoot, 'src', 'api', 'routes', endpoint.path.replace('/api/', '') + '.ts'),
          path.join(this.workspaceRoot, 'src', 'api', 'routes', endpoint.path.replace('/api/', '') + '.js')
        ];

        let endpointExists = false;
        let endpointPath = null;
        let hasRealData = false;
        let hasMockData = false;

        for (const filePath of possiblePaths) {
          if (fs.existsSync(filePath)) {
            endpointExists = true;
            endpointPath = filePath;

            const content = fs.readFileSync(filePath, 'utf8');

            // Check for real data patterns
            if (content.includes('database') || content.includes('sqlite') || content.includes('fs.readFileSync')) {
              hasRealData = true;
            }

            // Check for mock data patterns
            if (content.includes('Math.random') || content.includes('mock') || content.includes('fake') || content.includes('demo')) {
              hasMockData = true;
            }

            break;
          }
        }

        this.results.apiEndpoints[endpoint.path] = {
          exists: endpointExists,
          path: endpointPath,
          hasRealData,
          hasMockData,
          description: endpoint.description,
          status: endpointExists ? (hasRealData && !hasMockData ? 'REAL' : hasMockData ? 'MIXED' : 'UNKNOWN') : 'MISSING'
        };

        console.log(`  ${endpoint.path}: ${this.results.apiEndpoints[endpoint.path].status}`);

      } catch (error) {
        this.results.issues.push(`API endpoint validation error for ${endpoint.path}: ${error.message}`);
      }
    }
  }

  async validateDatabaseConnections() {
    console.log('\n💾 Validating database connections...');

    const databases = [
      { path: '/workspaces/agent-feed/data/token-analytics.db', name: 'Token Analytics' },
      { path: '/workspaces/agent-feed/data/agent-feed.db', name: 'Agent Feed' }
    ];

    for (const db of databases) {
      try {
        if (fs.existsSync(db.path)) {
          const database = new Database(db.path);

          // Get database info
          const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
          const tableCount = tables.length;

          let recordCount = 0;
          let hasRealData = false;

          if (db.name === 'Token Analytics' && tables.some(t => t.name === 'token_usage')) {
            const result = database.prepare("SELECT COUNT(*) as count FROM token_usage").get();
            recordCount = result.count;

            // Check for real Anthropic data
            const anthropicRecords = database.prepare("SELECT COUNT(*) as count FROM token_usage WHERE provider = 'anthropic'").get();
            hasRealData = anthropicRecords.count > 0;
          }

          database.close();

          this.results.databaseConnections[db.name] = {
            exists: true,
            path: db.path,
            tableCount,
            recordCount,
            hasRealData,
            status: hasRealData ? 'REAL_DATA' : recordCount > 0 ? 'HAS_DATA' : 'EMPTY'
          };

          console.log(`  ${db.name}: ${this.results.databaseConnections[db.name].status} (${recordCount} records)`);

        } else {
          this.results.databaseConnections[db.name] = {
            exists: false,
            path: db.path,
            status: 'MISSING'
          };
          console.log(`  ${db.name}: MISSING`);
        }

      } catch (error) {
        this.results.issues.push(`Database validation error for ${db.name}: ${error.message}`);
        this.results.databaseConnections[db.name] = { error: error.message, status: 'ERROR' };
      }
    }
  }

  async validateTokenTracking() {
    console.log('\n🎯 Validating token tracking authenticity...');

    try {
      const dbPath = '/workspaces/agent-feed/data/token-analytics.db';
      if (fs.existsSync(dbPath)) {
        const db = new Database(dbPath);

        // Check for real Anthropic request IDs
        const requestIds = db.prepare("SELECT request_id FROM token_usage WHERE provider = 'anthropic' LIMIT 5").all();
        const hasRealRequestIds = requestIds.some(r => r.request_id && r.request_id.startsWith('req_'));

        // Check for real Claude models
        const models = db.prepare("SELECT DISTINCT model FROM token_usage WHERE provider = 'anthropic'").all();
        const hasRealModels = models.some(m => m.model.includes('claude-3') || m.model.includes('claude-4'));

        // Check for realistic token counts
        const tokenStats = db.prepare("SELECT AVG(input_tokens) as avg_input, AVG(output_tokens) as avg_output FROM token_usage WHERE provider = 'anthropic'").get();
        const hasRealisticTokens = tokenStats.avg_input > 0 && tokenStats.avg_output > 0;

        db.close();

        this.results.dataAuthenticity.tokenTracking = {
          hasRealRequestIds,
          hasRealModels,
          hasRealisticTokens,
          requestIdSample: requestIds.slice(0, 3).map(r => r.request_id),
          modelsSample: models.slice(0, 3).map(m => m.model),
          status: hasRealRequestIds && hasRealModels && hasRealisticTokens ? 'AUTHENTIC' : 'QUESTIONABLE'
        };

        console.log(`  Token tracking: ${this.results.dataAuthenticity.tokenTracking.status}`);
        console.log(`    Real request IDs: ${hasRealRequestIds}`);
        console.log(`    Real models: ${hasRealModels}`);
        console.log(`    Realistic tokens: ${hasRealisticTokens}`);

      } else {
        this.results.dataAuthenticity.tokenTracking = { status: 'NO_DATABASE' };
        console.log('  Token tracking: NO_DATABASE');
      }

    } catch (error) {
      this.results.issues.push(`Token tracking validation error: ${error.message}`);
    }
  }

  async scanForMockData() {
    console.log('\n🔍 Scanning for mock/fake data patterns...');

    const searchPatterns = [
      'Math.random',
      'mockData',
      'FAKE_',
      'TEST_',
      'fallback.*data',
      'mock.*agent',
      'demo.*data',
      'fake.*response'
    ];

    const searchPaths = [
      'src/api',
      'pages/api',
      'frontend/src',
      'backend'
    ];

    for (const pattern of searchPatterns) {
      try {
        for (const searchPath of searchPaths) {
          const fullPath = path.join(this.workspaceRoot, searchPath);
          if (fs.existsSync(fullPath)) {
            try {
              const result = execSync(`grep -r "${pattern}" ${fullPath} --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" | head -10`, { encoding: 'utf8' });
              if (result.trim()) {
                this.results.mockDataFound.push({
                  pattern,
                  path: searchPath,
                  matches: result.trim().split('\n').length
                });
              }
            } catch (grepError) {
              // Pattern not found, which is good
            }
          }
        }
      } catch (error) {
        // Continue with other patterns
      }
    }

    console.log(`  Found ${this.results.mockDataFound.length} mock data patterns`);
    this.results.mockDataFound.forEach(mock => {
      console.log(`    ${mock.pattern}: ${mock.matches} matches in ${mock.path}`);
    });
  }

  async validateAgentSources() {
    console.log('\n🤖 Validating agent data sources...');

    try {
      // Check agent file sources
      const agentsDirs = [
        '/workspaces/agent-feed/prod/.claude/agents',
        '/workspaces/agent-feed/.claude/agents'
      ];

      let realAgentFiles = 0;
      let agentSources = [];

      for (const dir of agentsDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
          realAgentFiles += files.length;
          agentSources.push({
            directory: dir,
            fileCount: files.length,
            files: files.slice(0, 5) // Sample
          });
        }
      }

      // Check API agent endpoint
      const agentApiPath = '/workspaces/agent-feed/pages/api/agents.js';
      let agentApiUsesRealFiles = false;

      if (fs.existsSync(agentApiPath)) {
        const content = fs.readFileSync(agentApiPath, 'utf8');
        agentApiUsesRealFiles = content.includes('fs.readFileSync') && content.includes('.claude/agents');
      }

      this.results.dataAuthenticity.agentSources = {
        realAgentFiles,
        agentSources,
        agentApiUsesRealFiles,
        status: realAgentFiles > 0 && agentApiUsesRealFiles ? 'AUTHENTIC' : 'QUESTIONABLE'
      };

      console.log(`  Agent sources: ${this.results.dataAuthenticity.agentSources.status}`);
      console.log(`    Real agent files: ${realAgentFiles}`);
      console.log(`    API uses real files: ${agentApiUsesRealFiles}`);

    } catch (error) {
      this.results.issues.push(`Agent source validation error: ${error.message}`);
    }
  }

  async validateAuthIntegrations() {
    console.log('\n🔐 Validating authentication and API integrations...');

    try {
      // Check for environment variables
      const envFiles = ['.env', '.env.local', '.env.production'];
      let hasAuthConfig = false;

      for (const envFile of envFiles) {
        const envPath = path.join(this.workspaceRoot, envFile);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, 'utf8');
          if (content.includes('ANTHROPIC_API_KEY') || content.includes('API_KEY')) {
            hasAuthConfig = true;
            break;
          }
        }
      }

      // Check for Claude CLI integration
      let hasClaudeIntegration = false;
      const claudeBackendPath = '/workspaces/agent-feed/src/real-claude-backend-enhanced.js';
      if (fs.existsSync(claudeBackendPath)) {
        const content = fs.readFileSync(claudeBackendPath, 'utf8');
        hasClaudeIntegration = content.includes('claude') && content.includes('spawn');
      }

      // Check for API client implementations
      const apiClientPaths = [
        '/workspaces/agent-feed/src/services/claude-integration.ts',
        '/workspaces/agent-feed/src/claude-api-integration.js'
      ];

      let hasApiClients = false;
      for (const clientPath of apiClientPaths) {
        if (fs.existsSync(clientPath)) {
          hasApiClients = true;
          break;
        }
      }

      this.results.authIntegrations = {
        hasAuthConfig,
        hasClaudeIntegration,
        hasApiClients,
        status: hasAuthConfig && (hasClaudeIntegration || hasApiClients) ? 'CONFIGURED' : 'INCOMPLETE'
      };

      console.log(`  Auth integrations: ${this.results.authIntegrations.status}`);
      console.log(`    Auth config: ${hasAuthConfig}`);
      console.log(`    Claude integration: ${hasClaudeIntegration}`);
      console.log(`    API clients: ${hasApiClients}`);

    } catch (error) {
      this.results.issues.push(`Auth integration validation error: ${error.message}`);
    }
  }

  calculateScore() {
    let totalPoints = 0;
    let earnedPoints = 0;

    // API Endpoints (25 points)
    totalPoints += 25;
    const realEndpoints = Object.values(this.results.apiEndpoints).filter(e => e.status === 'REAL').length;
    const totalEndpoints = Object.values(this.results.apiEndpoints).length;
    earnedPoints += Math.round((realEndpoints / totalEndpoints) * 25);

    // Database Connections (25 points)
    totalPoints += 25;
    const realDatabases = Object.values(this.results.databaseConnections).filter(d => d.status === 'REAL_DATA').length;
    const totalDatabases = Object.values(this.results.databaseConnections).length;
    earnedPoints += Math.round((realDatabases / totalDatabases) * 25);

    // Data Authenticity (30 points)
    totalPoints += 30;
    if (this.results.dataAuthenticity.tokenTracking?.status === 'AUTHENTIC') earnedPoints += 15;
    if (this.results.dataAuthenticity.agentSources?.status === 'AUTHENTIC') earnedPoints += 15;

    // Auth Integrations (10 points)
    totalPoints += 10;
    if (this.results.authIntegrations?.status === 'CONFIGURED') earnedPoints += 10;

    // Mock Data Penalty (up to -10 points)
    const mockPenalty = Math.min(this.results.mockDataFound.length, 10);
    earnedPoints -= mockPenalty;

    this.results.score = Math.max(0, Math.round((earnedPoints / totalPoints) * 100));
  }

  async generateReport() {
    const timestamp = new Date().toISOString();

    const report = `# Real Data Validation Report

**Generated:** ${timestamp}
**Overall Score:** ${this.results.score}/100

## Executive Summary

This report validates the authenticity of data sources and API endpoints in the agent-feed application to ensure 100% real functionality with no mock responses.

## API Endpoints Validation

${Object.entries(this.results.apiEndpoints).map(([endpoint, data]) => `
### ${endpoint}
- **Status:** ${data.status}
- **Exists:** ${data.exists}
- **Has Real Data:** ${data.hasRealData}
- **Has Mock Data:** ${data.hasMockData}
- **Path:** ${data.path || 'Not found'}
`).join('')}

## Database Connections

${Object.entries(this.results.databaseConnections).map(([name, data]) => `
### ${name}
- **Status:** ${data.status}
- **Exists:** ${data.exists}
- **Tables:** ${data.tableCount || 'N/A'}
- **Records:** ${data.recordCount || 'N/A'}
- **Has Real Data:** ${data.hasRealData || false}
- **Path:** ${data.path}
`).join('')}

## Data Authenticity Analysis

### Token Tracking
- **Status:** ${this.results.dataAuthenticity.tokenTracking?.status || 'Not checked'}
- **Real Request IDs:** ${this.results.dataAuthenticity.tokenTracking?.hasRealRequestIds || false}
- **Real Models:** ${this.results.dataAuthenticity.tokenTracking?.hasRealModels || false}
- **Realistic Tokens:** ${this.results.dataAuthenticity.tokenTracking?.hasRealisticTokens || false}

Sample Request IDs: ${this.results.dataAuthenticity.tokenTracking?.requestIdSample?.join(', ') || 'None'}
Sample Models: ${this.results.dataAuthenticity.tokenTracking?.modelsSample?.join(', ') || 'None'}

### Agent Sources
- **Status:** ${this.results.dataAuthenticity.agentSources?.status || 'Not checked'}
- **Real Agent Files:** ${this.results.dataAuthenticity.agentSources?.realAgentFiles || 0}
- **API Uses Real Files:** ${this.results.dataAuthenticity.agentSources?.agentApiUsesRealFiles || false}

## Authentication & Integrations

- **Status:** ${this.results.authIntegrations?.status || 'Not checked'}
- **Auth Config:** ${this.results.authIntegrations?.hasAuthConfig || false}
- **Claude Integration:** ${this.results.authIntegrations?.hasClaudeIntegration || false}
- **API Clients:** ${this.results.authIntegrations?.hasApiClients || false}

## Mock Data Detection

${this.results.mockDataFound.length === 0 ? '✅ No mock data patterns found!' :
`⚠️ Found ${this.results.mockDataFound.length} mock data patterns:

${this.results.mockDataFound.map(mock => `- **${mock.pattern}** in ${mock.path}: ${mock.matches} matches`).join('\n')}`}

## Issues Found

${this.results.issues.length === 0 ? '✅ No issues found!' :
this.results.issues.map(issue => `- ${issue}`).join('\n')}

## Recommendations

${this.results.score >= 90 ? '✅ **EXCELLENT** - Application uses 100% real data sources' :
  this.results.score >= 70 ? '⚠️ **GOOD** - Mostly real data with some mock patterns to address' :
  this.results.score >= 50 ? '⚠️ **FAIR** - Significant mock data usage detected' :
  '❌ **POOR** - Heavy reliance on mock/fake data'}

### Priority Actions:

${this.results.mockDataFound.length > 0 ? '1. Remove or replace mock data patterns with real implementations\n' : ''}
${Object.values(this.results.apiEndpoints).some(e => e.status !== 'REAL') ? '2. Ensure all API endpoints use real data sources\n' : ''}
${this.results.authIntegrations?.status !== 'CONFIGURED' ? '3. Complete authentication and API integration setup\n' : ''}
${this.results.issues.length > 0 ? '4. Address validation issues listed above\n' : ''}

## Conclusion

**Real Data Score: ${this.results.score}/100**

${this.results.score >= 90 ?
'The application demonstrates excellent use of authentic data sources with minimal to no mock data patterns.' :
'The application requires attention to eliminate mock data patterns and ensure 100% real functionality.'}

---
*Report generated by Real Data Validation Script*
`;

    // Ensure tests directory exists
    const testsDir = path.join(this.workspaceRoot, 'tests');
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    const reportPath = path.join(testsDir, 'real-data-validation.md');
    fs.writeFileSync(reportPath, report);

    // Also save JSON results
    const jsonPath = path.join(testsDir, 'real-data-validation.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`📊 JSON results saved to: ${jsonPath}`);
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new RealDataValidator();
  validator.validateAll().catch(console.error);
}

module.exports = RealDataValidator;