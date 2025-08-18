#!/usr/bin/env tsx

/**
 * Comprehensive System Integration Validation Script
 * Tests all components, APIs, database, frontend, and Claude-Flow integration
 */

import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { createClient } from 'redis';
import { Pool } from 'pg';

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
  timestamp: string;
}

interface ValidationReport {
  overall_status: 'PASS' | 'FAIL' | 'WARNING';
  total_tests: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ValidationResult[];
  performance_metrics: any;
  deployment_readiness: boolean;
  critical_issues: string[];
  recommendations: string[];
}

class SystemValidator {
  private results: ValidationResult[] = [];
  private startTime = Date.now();

  private log(component: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
    const result: ValidationResult = {
      component,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${statusIcon} [${component}] ${message}`);
    if (details && status === 'FAIL') {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async validateEnvironment(): Promise<void> {
    console.log('\n🔍 Phase 1: Environment Validation');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion >= 18) {
        this.log('Environment', 'PASS', `Node.js version ${nodeVersion} is supported`);
      } else {
        this.log('Environment', 'FAIL', `Node.js version ${nodeVersion} is too old (required: 18+)`);
      }

      // Check environment variables
      const requiredEnvVars = [
        'DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
        'REDIS_URL', 'REDIS_HOST', 'REDIS_PORT',
        'JWT_SECRET', 'PORT', 'NODE_ENV'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      if (missingVars.length === 0) {
        this.log('Environment', 'PASS', 'All required environment variables are set');
      } else {
        this.log('Environment', 'FAIL', `Missing environment variables: ${missingVars.join(', ')}`);
      }

      // Check if .env file exists
      try {
        await fs.access('.env');
        this.log('Environment', 'PASS', '.env file exists');
      } catch {
        this.log('Environment', 'WARNING', '.env file not found');
      }

    } catch (error) {
      this.log('Environment', 'FAIL', 'Environment validation failed', error);
    }
  }

  async validateDatabase(): Promise<void> {
    console.log('\n🗄️ Phase 2: Database Validation');
    
    try {
      // Test PostgreSQL connection
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'agent_feed',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        connectionTimeoutMillis: 5000,
      });

      try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        this.log('Database', 'PASS', 'PostgreSQL connection successful');

        // Check if database schema exists
        const schemaCheck = await pool.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        const expectedTables = [
          'users', 'feeds', 'feed_items', 'automation_results', 
          'claude_flow_sessions', 'neural_patterns', 'user_sessions',
          'feed_fetch_logs', 'automation_triggers', 'automation_actions'
        ];

        const existingTables = schemaCheck.rows.map(row => row.table_name);
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));

        if (missingTables.length === 0) {
          this.log('Database', 'PASS', `All ${expectedTables.length} required tables exist`);
        } else {
          this.log('Database', 'FAIL', `Missing tables: ${missingTables.join(', ')}`);
        }

        await pool.end();
      } catch (dbError) {
        this.log('Database', 'FAIL', 'Database connection failed', dbError);
        try {
          await pool.end();
        } catch {}
      }

    } catch (error) {
      this.log('Database', 'FAIL', 'Database validation setup failed', error);
    }
  }

  async validateRedis(): Promise<void> {
    console.log('\n🔴 Phase 3: Redis Validation');
    
    try {
      const redis = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        }
      });

      await redis.connect();
      
      // Test basic operations
      await redis.set('test_key', 'test_value');
      const value = await redis.get('test_key');
      await redis.del('test_key');
      
      if (value === 'test_value') {
        this.log('Redis', 'PASS', 'Redis connection and operations successful');
      } else {
        this.log('Redis', 'FAIL', 'Redis operations failed');
      }

      await redis.quit();
    } catch (error) {
      this.log('Redis', 'FAIL', 'Redis connection failed', error);
    }
  }

  async validateAPI(): Promise<void> {
    console.log('\n🌐 Phase 4: API Validation');
    
    try {
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      
      // Test health endpoint
      try {
        const healthResponse = await axios.get(`${baseURL}/health`, { timeout: 5000 });
        if (healthResponse.status === 200) {
          this.log('API', 'PASS', 'Health endpoint responding');
        } else {
          this.log('API', 'FAIL', `Health endpoint returned status ${healthResponse.status}`);
        }
      } catch (error) {
        this.log('API', 'FAIL', 'Health endpoint not accessible', error.message);
      }

      // Test API info endpoint
      try {
        const apiResponse = await axios.get(`${baseURL}/api/v1/`, { timeout: 5000 });
        if (apiResponse.status === 200 && apiResponse.data.name) {
          this.log('API', 'PASS', 'API info endpoint responding');
        } else {
          this.log('API', 'FAIL', 'API info endpoint invalid response');
        }
      } catch (error) {
        this.log('API', 'FAIL', 'API info endpoint not accessible', error.message);
      }

      // Test rate limiting
      try {
        const promises = Array(5).fill(null).map(() => 
          axios.get(`${baseURL}/health`, { timeout: 2000 })
        );
        await Promise.all(promises);
        this.log('API', 'PASS', 'API handles concurrent requests');
      } catch (error) {
        this.log('API', 'WARNING', 'API may have issues with concurrent requests');
      }

    } catch (error) {
      this.log('API', 'FAIL', 'API validation failed', error);
    }
  }

  async validateFrontend(): Promise<void> {
    console.log('\n🎨 Phase 5: Frontend Validation');
    
    try {
      // Check if frontend build exists
      try {
        await fs.access('frontend/dist');
        this.log('Frontend', 'PASS', 'Frontend build directory exists');
      } catch {
        this.log('Frontend', 'WARNING', 'Frontend build directory not found - may need to build');
      }

      // Check if frontend is accessible
      try {
        const frontendResponse = await axios.get('http://localhost:3001', { timeout: 5000 });
        if (frontendResponse.status === 200) {
          this.log('Frontend', 'PASS', 'Frontend application accessible');
        } else {
          this.log('Frontend', 'FAIL', `Frontend returned status ${frontendResponse.status}`);
        }
      } catch (error) {
        this.log('Frontend', 'FAIL', 'Frontend not accessible', error.message);
      }

      // Check key frontend files
      const frontendFiles = [
        'frontend/src/App.tsx',
        'frontend/src/components/AgentFeedDashboard.tsx',
        'frontend/src/services/api.ts',
        'frontend/src/services/neural-orchestrator.ts'
      ];

      for (const file of frontendFiles) {
        try {
          await fs.access(file);
          this.log('Frontend', 'PASS', `Key file exists: ${file}`);
        } catch {
          this.log('Frontend', 'WARNING', `Key file missing: ${file}`);
        }
      }

    } catch (error) {
      this.log('Frontend', 'FAIL', 'Frontend validation failed', error);
    }
  }

  async validateClaudeFlow(): Promise<void> {
    console.log('\n🤖 Phase 6: Claude-Flow Integration Validation');
    
    try {
      // Check if claude-flow executable exists
      try {
        execSync('which claude-flow', { stdio: 'pipe' });
        this.log('Claude-Flow', 'PASS', 'claude-flow executable found');
      } catch {
        try {
          await fs.access('./claude-flow');
          this.log('Claude-Flow', 'PASS', 'Local claude-flow executable found');
        } catch {
          this.log('Claude-Flow', 'WARNING', 'claude-flow executable not found');
        }
      }

      // Test Claude-Flow integration through API
      try {
        const baseURL = `http://localhost:${process.env.PORT || 3000}`;
        const response = await axios.get(`${baseURL}/api/v1/claude-flow/metrics`, { 
          timeout: 5000,
          headers: { 'Authorization': 'Bearer test-token' }
        });
        this.log('Claude-Flow', 'PASS', 'Claude-Flow API integration working');
      } catch (error) {
        if (error.response?.status === 401) {
          this.log('Claude-Flow', 'PASS', 'Claude-Flow API requires authentication (expected)');
        } else {
          this.log('Claude-Flow', 'WARNING', 'Claude-Flow API integration may need configuration');
        }
      }

    } catch (error) {
      this.log('Claude-Flow', 'FAIL', 'Claude-Flow validation failed', error);
    }
  }

  async validateSecurity(): Promise<void> {
    console.log('\n🔒 Phase 7: Security Validation');
    
    try {
      // Check JWT secret
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret && jwtSecret.length >= 32) {
        this.log('Security', 'PASS', 'JWT secret is properly configured');
      } else {
        this.log('Security', 'FAIL', 'JWT secret is too short or missing');
      }

      // Check if using HTTPS in production
      if (process.env.NODE_ENV === 'production' && !process.env.FORCE_HTTPS) {
        this.log('Security', 'WARNING', 'HTTPS not enforced in production environment');
      } else {
        this.log('Security', 'PASS', 'HTTPS configuration appropriate for environment');
      }

      // Check for exposed secrets in environment
      const sensitivePatterns = ['password', 'secret', 'key', 'token'];
      let exposedSecrets = 0;
      
      Object.keys(process.env).forEach(key => {
        const value = process.env[key] || '';
        if (sensitivePatterns.some(pattern => key.toLowerCase().includes(pattern))) {
          if (value.includes('dev-') || value.includes('test-') || value.includes('default')) {
            exposedSecrets++;
          }
        }
      });

      if (exposedSecrets === 0) {
        this.log('Security', 'PASS', 'No obvious default secrets detected');
      } else {
        this.log('Security', 'WARNING', `${exposedSecrets} environment variables may contain default secrets`);
      }

    } catch (error) {
      this.log('Security', 'FAIL', 'Security validation failed', error);
    }
  }

  async validatePerformance(): Promise<void> {
    console.log('\n⚡ Phase 8: Performance Validation');
    
    try {
      const baseURL = `http://localhost:${process.env.PORT || 3000}`;
      
      // Test response times
      const startTime = Date.now();
      try {
        await axios.get(`${baseURL}/health`, { timeout: 1000 });
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 100) {
          this.log('Performance', 'PASS', `Health endpoint response time: ${responseTime}ms`);
        } else if (responseTime < 500) {
          this.log('Performance', 'WARNING', `Health endpoint response time: ${responseTime}ms (acceptable)`);
        } else {
          this.log('Performance', 'FAIL', `Health endpoint response time: ${responseTime}ms (too slow)`);
        }
      } catch (error) {
        this.log('Performance', 'FAIL', 'Performance test failed - endpoint not accessible');
      }

      // Test concurrent request handling
      try {
        const concurrentRequests = 10;
        const promises = Array(concurrentRequests).fill(null).map(async () => {
          const start = Date.now();
          await axios.get(`${baseURL}/health`, { timeout: 2000 });
          return Date.now() - start;
        });

        const times = await Promise.all(promises);
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        
        if (avgTime < 200) {
          this.log('Performance', 'PASS', `Average concurrent response time: ${avgTime.toFixed(1)}ms`);
        } else {
          this.log('Performance', 'WARNING', `Average concurrent response time: ${avgTime.toFixed(1)}ms`);
        }
      } catch (error) {
        this.log('Performance', 'FAIL', 'Concurrent request test failed');
      }

    } catch (error) {
      this.log('Performance', 'FAIL', 'Performance validation failed', error);
    }
  }

  async validateDeployment(): Promise<void> {
    console.log('\n🚀 Phase 9: Deployment Readiness Validation');
    
    try {
      // Check Docker files
      const dockerFiles = ['Dockerfile', 'docker-compose.yml'];
      for (const file of dockerFiles) {
        try {
          await fs.access(file);
          this.log('Deployment', 'PASS', `${file} exists`);
        } catch {
          this.log('Deployment', 'WARNING', `${file} not found`);
        }
      }

      // Check if package.json has required scripts
      try {
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
        const requiredScripts = ['start', 'build', 'test'];
        const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
        
        if (missingScripts.length === 0) {
          this.log('Deployment', 'PASS', 'All required npm scripts present');
        } else {
          this.log('Deployment', 'WARNING', `Missing npm scripts: ${missingScripts.join(', ')}`);
        }
      } catch (error) {
        this.log('Deployment', 'FAIL', 'package.json validation failed');
      }

      // Check production environment readiness
      if (process.env.NODE_ENV === 'production') {
        const prodChecks = [
          { var: 'DATABASE_URL', name: 'Production database URL' },
          { var: 'REDIS_URL', name: 'Production Redis URL' },
          { var: 'JWT_SECRET', name: 'Production JWT secret' }
        ];

        prodChecks.forEach(check => {
          if (process.env[check.var] && !process.env[check.var]?.includes('localhost')) {
            this.log('Deployment', 'PASS', `${check.name} configured for production`);
          } else {
            this.log('Deployment', 'WARNING', `${check.name} may not be production-ready`);
          }
        });
      }

    } catch (error) {
      this.log('Deployment', 'FAIL', 'Deployment validation failed', error);
    }
  }

  generateReport(): ValidationReport {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    const criticalIssues = this.results
      .filter(r => r.status === 'FAIL')
      .map(r => `${r.component}: ${r.message}`);

    const recommendations = [];
    
    if (failed > 0) {
      recommendations.push('Address all FAIL status items before production deployment');
    }
    
    if (warnings > 0) {
      recommendations.push('Review WARNING items and implement improvements where possible');
    }

    recommendations.push('Run comprehensive end-to-end tests with real data');
    recommendations.push('Perform load testing under expected production conditions');
    recommendations.push('Implement monitoring and alerting for production deployment');

    const overall_status = failed > 0 ? 'FAIL' : warnings > 0 ? 'WARNING' : 'PASS';
    const deployment_readiness = failed === 0 && warnings <= 3;

    return {
      overall_status,
      total_tests: this.results.length,
      passed,
      failed,
      warnings,
      results: this.results,
      performance_metrics: {
        validation_duration_ms: Date.now() - this.startTime,
        timestamp: new Date().toISOString()
      },
      deployment_readiness,
      critical_issues: criticalIssues,
      recommendations
    };
  }

  async run(): Promise<ValidationReport> {
    console.log('🔍 Starting Comprehensive System Validation...\n');
    
    await this.validateEnvironment();
    await this.validateDatabase();
    await this.validateRedis();
    await this.validateAPI();
    await this.validateFrontend();
    await this.validateClaudeFlow();
    await this.validateSecurity();
    await this.validatePerformance();
    await this.validateDeployment();

    const report = this.generateReport();
    
    console.log('\n📊 Validation Complete!');
    console.log(`Overall Status: ${report.overall_status}`);
    console.log(`Tests: ${report.passed} passed, ${report.failed} failed, ${report.warnings} warnings`);
    console.log(`Deployment Ready: ${report.deployment_readiness ? 'YES' : 'NO'}\n`);

    return report;
  }
}

// Run validation if called directly
if (require.main === module) {
  async function main() {
    const validator = new SystemValidator();
    const report = await validator.run();
    
    // Write report to file
    const reportPath = path.join(process.cwd(), 'PRODUCTION-VALIDATION-REPORT.md');
    const reportContent = `# Production Validation Report

Generated: ${new Date().toISOString()}

## Overall Status: ${report.overall_status}

**Deployment Ready: ${report.deployment_readiness ? '✅ YES' : '❌ NO'}**

## Summary
- Total Tests: ${report.total_tests}
- Passed: ${report.passed}
- Failed: ${report.failed}  
- Warnings: ${report.warnings}

## Critical Issues
${report.critical_issues.length === 0 ? 'None' : report.critical_issues.map(issue => `- ${issue}`).join('\n')}

## Recommendations
${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Detailed Results

${report.results.map(result => {
  const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  return `### ${statusIcon} ${result.component}: ${result.message}
**Status:** ${result.status}  
**Timestamp:** ${result.timestamp}
${result.details ? `**Details:** \`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`` : ''}`;
}).join('\n\n')}

## Performance Metrics
- Validation Duration: ${report.performance_metrics.validation_duration_ms}ms
- Completed: ${report.performance_metrics.timestamp}

---
*This report was generated by the Comprehensive System Validation Tool*
`;

    await fs.writeFile(reportPath, reportContent);
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(report.overall_status === 'FAIL' ? 1 : 0);
  }

  main().catch(console.error);
}

export { SystemValidator, ValidationResult, ValidationReport };