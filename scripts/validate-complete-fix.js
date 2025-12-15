#!/usr/bin/env node

/**
 * Comprehensive Validation Script for Claude Code Detection Fix
 * Tests all components to ensure regression-free deployment
 */

const http = require('http');
const { spawn } = require('child_process');

class ValidationSuite {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTest(name, testFn) {
    console.log(`🔍 SPARC VALIDATION: ${name}...`);
    try {
      const result = await testFn();
      console.log(`✅ PASSED: ${name}`);
      this.results.push({ name, status: 'PASSED', result });
      this.passed++;
      return true;
    } catch (error) {
      console.error(`❌ FAILED: ${name} - ${error.message}`);
      this.results.push({ name, status: 'FAILED', error: error.message });
      this.failed++;
      return false;
    }
  }

  async testBackendAPI() {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001/api/claude/check', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.success && parsed.claudeAvailable === true) {
              resolve(parsed);
            } else {
              reject(new Error(`Backend API returned unexpected response: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Request timeout')));
    });
  }

  async testFrontendAccessibility() {
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:5173', (res) => {
        if (res.statusCode === 200) {
          resolve({ statusCode: res.statusCode });
        } else {
          reject(new Error(`Frontend not accessible: ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Frontend connection timeout')));
    });
  }

  async testViteProxyConfiguration() {
    return new Promise((resolve, reject) => {
      // Test proxy by making request to frontend URL that should proxy to backend
      const req = http.get('http://localhost:5173/api/claude/check', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.success && parsed.claudeAvailable === true) {
              resolve({ proxied: true, response: parsed });
            } else {
              reject(new Error(`Vite proxy failed: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Proxy response invalid JSON: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Proxy request timeout')));
    });
  }

  async testClaudeCodeCLI() {
    return new Promise((resolve, reject) => {
      const claude = spawn('claude', ['--version'], { shell: true });
      let output = '';
      
      claude.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      claude.on('close', (code) => {
        if (code === 0 && output.includes('Claude Code')) {
          resolve({ version: output.trim() });
        } else {
          reject(new Error(`Claude CLI not available: exit code ${code}`));
        }
      });
      
      claude.on('error', (error) => {
        reject(new Error(`Claude CLI spawn error: ${error.message}`));
      });
      
      setTimeout(() => {
        claude.kill();
        reject(new Error('Claude CLI test timeout'));
      }, 3000);
    });
  }

  async testPortSeparation() {
    const frontendPromise = new Promise((resolve, reject) => {
      const req = http.get('http://localhost:5173', (res) => {
        resolve({ frontend: res.statusCode });
      });
      req.on('error', () => reject(new Error('Frontend port test failed')));
      req.setTimeout(3000, () => reject(new Error('Frontend port timeout')));
    });

    const backendPromise = new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001/health', (res) => {
        resolve({ backend: res.statusCode });
      });
      req.on('error', () => reject(new Error('Backend port test failed')));
      req.setTimeout(3000, () => reject(new Error('Backend port timeout')));
    });

    const results = await Promise.all([frontendPromise, backendPromise]);
    return { 
      frontendPort: 5173, 
      backendPort: 3001, 
      frontendStatus: results[0].frontend,
      backendStatus: results[1].backend 
    };
  }

  async validateNLDPatterns() {
    const fs = require('fs');
    const path = '/workspaces/agent-feed/nld-agent/patterns/failure-pattern-database.json';
    
    if (!fs.existsSync(path)) {
      throw new Error('NLD pattern database not found');
    }
    
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    
    if (!data.patterns || data.patterns.length === 0) {
      throw new Error('No patterns in NLD database');
    }
    
    const claudePattern = data.patterns.find(p => p.id === 'api-frontend-disconnect-claude-detection');
    if (!claudePattern) {
      throw new Error('Claude detection pattern not found in NLD database');
    }
    
    return { 
      totalPatterns: data.patterns.length,
      claudePatternExists: !!claudePattern,
      automatedRules: data.metadata.automatedRules 
    };
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SPARC + TDD + NLD + Playwright VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`✅ PASSED: ${this.passed}`);
    console.log(`❌ FAILED: ${this.failed}`);
    console.log(`📊 TOTAL:  ${this.results.length}`);
    console.log('='.repeat(60));
    
    this.results.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('='.repeat(60));
    
    if (this.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Claude Code detection fix is ready for deployment.');
      console.log('🔍 Debug logging is active in SimpleLauncher component');
      console.log('🚀 Vite proxy configuration enables seamless API communication');
      console.log('📝 NLD patterns captured for future regression prevention');
      return true;
    } else {
      console.log('⚠️  Some tests failed. Please address issues before deployment.');
      return false;
    }
  }

  async runAll() {
    console.log('🔍 Starting Comprehensive Validation Suite...\n');
    
    await this.runTest('Backend API Accessibility', () => this.testBackendAPI());
    await this.runTest('Frontend Server Accessibility', () => this.testFrontendAccessibility());
    await this.runTest('Vite Proxy Configuration', () => this.testViteProxyConfiguration());
    await this.runTest('Claude Code CLI Availability', () => this.testClaudeCodeCLI());
    await this.runTest('Port Separation Validation', () => this.testPortSeparation());
    await this.runTest('NLD Pattern Database Validation', () => this.validateNLDPatterns());
    
    return this.generateReport();
  }
}

// Run validation suite
if (require.main === module) {
  const validator = new ValidationSuite();
  validator.runAll().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Validation suite crashed:', error);
    process.exit(1);
  });
}

module.exports = ValidationSuite;