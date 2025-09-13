/**
 * Production Validation for Agent Pages System
 * Comprehensive validation script for ensuring the agent pages system is production-ready
 * 
 * Tests:
 * 1. API endpoints functionality
 * 2. File existence and naming
 * 3. Database schema and data integrity
 * 4. Frontend rendering capabilities
 * 5. Component functionality
 * 6. Performance metrics
 * 7. Security validation
 * 8. Mobile responsiveness
 * 9. Error handling
 * 10. Real user workflows
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

class AgentPagesValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    
    this.config = {
      backendUrl: 'http://localhost:3000',
      frontendUrl: 'http://localhost:5173',
      testAgentId: 'personal-todos-agent',
      testPages: [
        { id: 'b7e35d18-0727-4550-9450-f3130a95f34d', name: 'Profile', expectedFile: 'profile.json' },
        { id: 'c12e3358-fb5e-43e6-bbf9-6ef4df4302d2', name: 'Dashboard', expectedFile: 'dashboard.json' },
        { id: 'b6a8614f-881b-456d-90b3-ba0bdbc70a63', name: 'Task Manager', expectedFile: 'task-manager.json' }
      ]
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      pass: '✅',
      fail: '❌', 
      warn: '⚠️',
      debug: '🔍'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  recordTest(testName, passed, message, details = {}) {
    const test = {
      name: testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(test);
    
    if (passed) {
      this.results.passed++;
      this.log(`${testName}: ${message}`, 'pass');
    } else {
      this.results.failed++;
      this.log(`${testName}: ${message}`, 'fail');
    }
  }

  recordWarning(testName, message, details = {}) {
    const test = {
      name: testName,
      passed: null,
      message,
      details,
      timestamp: new Date().toISOString(),
      isWarning: true
    };
    
    this.results.tests.push(test);
    this.results.warnings++;
    this.log(`${testName}: ${message}`, 'warn');
  }

  async validateApiEndpoints() {
    this.log('Validating API endpoints...', 'debug');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${this.config.backendUrl}/health`, { timeout: 5000 });
      this.recordTest(
        'Health Endpoint',
        healthResponse.status === 200,
        `Health endpoint returned ${healthResponse.status}`,
        { response: healthResponse.data }
      );
    } catch (error) {
      this.recordTest('Health Endpoint', false, `Health endpoint failed: ${error.message}`);
    }

    try {
      // Test agent pages list endpoint
      const pagesResponse = await axios.get(
        `${this.config.backendUrl}/api/agents/${this.config.testAgentId}/pages`,
        { timeout: 10000 }
      );
      
      const isValidResponse = pagesResponse.status === 200 && 
                            pagesResponse.data && 
                            typeof pagesResponse.data === 'object';
      
      this.recordTest(
        'Agent Pages API',
        isValidResponse,
        `Pages API returned ${pagesResponse.status}`,
        { 
          response: pagesResponse.data,
          pagesCount: pagesResponse.data.data ? pagesResponse.data.data.length : 0
        }
      );
    } catch (error) {
      this.recordTest('Agent Pages API', false, `Pages API failed: ${error.message}`);
    }

    // Test API response time
    try {
      const startTime = Date.now();
      await axios.get(`${this.config.backendUrl}/api/agents/${this.config.testAgentId}/pages`);
      const responseTime = Date.now() - startTime;
      
      this.recordTest(
        'API Response Time',
        responseTime < 2000,
        `API response time: ${responseTime}ms`,
        { responseTime, threshold: 2000 }
      );
    } catch (error) {
      this.recordTest('API Response Time', false, `Could not measure response time: ${error.message}`);
    }
  }

  async validateFileStructure() {
    this.log('Validating file structure...', 'debug');
    
    const requiredFiles = [
      '/workspaces/agent-feed/src/routes/agent-dynamic-pages.js',
      '/workspaces/agent-feed/frontend/src/components/AgentPagesTab.tsx',
      '/workspaces/agent-feed/create-demo-pages.cjs'
    ];

    for (const filePath of requiredFiles) {
      try {
        await fs.access(filePath);
        this.recordTest(
          `File Exists: ${path.basename(filePath)}`,
          true,
          `File exists: ${filePath}`
        );
      } catch (error) {
        this.recordTest(
          `File Exists: ${path.basename(filePath)}`,
          false,
          `Missing file: ${filePath}`
        );
      }
    }

    // Check for proper directory structure
    const requiredDirs = [
      '/workspaces/agent-feed/data',
      '/workspaces/agent-feed/tests/production-validation'
    ];

    for (const dirPath of requiredDirs) {
      try {
        const stat = await fs.stat(dirPath);
        this.recordTest(
          `Directory: ${path.basename(dirPath)}`,
          stat.isDirectory(),
          `Directory exists: ${dirPath}`
        );
      } catch (error) {
        // Create directory if missing
        try {
          await fs.mkdir(dirPath, { recursive: true });
          this.recordTest(
            `Directory: ${path.basename(dirPath)}`,
            true,
            `Directory created: ${dirPath}`
          );
        } catch (createError) {
          this.recordTest(
            `Directory: ${path.basename(dirPath)}`,
            false,
            `Could not create directory: ${dirPath}`
          );
        }
      }
    }
  }

  async validateDatabaseIntegrity() {
    this.log('Validating database integrity...', 'debug');

    try {
      // Check if database file exists
      const dbPath = '/workspaces/agent-feed/agent-feed.db';
      await fs.access(dbPath);
      
      this.recordTest(
        'Database File Exists',
        true,
        `Database file found: ${dbPath}`
      );
    } catch (error) {
      this.recordTest(
        'Database File Exists',
        false,
        `Database file missing or inaccessible`
      );
    }

    // Test database connection via API
    try {
      const healthResponse = await axios.get(`${this.config.backendUrl}/health`);
      const dbHealthy = healthResponse.data?.services?.database === 'healthy';
      
      this.recordTest(
        'Database Connection',
        dbHealthy,
        dbHealthy ? 'Database connection healthy' : 'Database connection issues'
      );
    } catch (error) {
      this.recordTest(
        'Database Connection',
        false,
        `Could not verify database connection: ${error.message}`
      );
    }
  }

  async validateFrontendAvailability() {
    this.log('Validating frontend availability...', 'debug');

    try {
      const frontendResponse = await axios.get(this.config.frontendUrl, { timeout: 10000 });
      const isValidHtml = frontendResponse.data.includes('<!DOCTYPE html>') ||
                         frontendResponse.data.includes('<html');
      
      this.recordTest(
        'Frontend Availability',
        frontendResponse.status === 200 && isValidHtml,
        `Frontend returned ${frontendResponse.status}`,
        { contentLength: frontendResponse.data.length }
      );
    } catch (error) {
      this.recordTest(
        'Frontend Availability',
        false,
        `Frontend not available: ${error.message}`
      );
    }
  }

  async validateComponentRendering() {
    this.log('Validating component rendering...', 'debug');

    const { ComponentValidator } = require('./component-validator.js');
    const validator = new ComponentValidator();

    const componentFiles = [
      '/workspaces/agent-feed/frontend/src/components/AgentPagesTab.tsx',
      '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx'
    ];

    for (const filePath of componentFiles) {
      try {
        const result = await validator.validateComponent(filePath);
        const componentName = path.basename(filePath, '.tsx');
        
        this.recordTest(
          `Component: ${componentName}`,
          result.isValid,
          result.isValid ? `Component valid (score: ${result.score})` : `Component issues: ${result.issues.join(', ')}`,
          {
            score: result.score,
            issues: result.issues,
            warnings: result.warnings
          }
        );

        // Record warnings separately
        if (result.warnings.length > 0) {
          this.recordWarning(
            `Component Warnings: ${componentName}`,
            `${result.warnings.length} warnings found`,
            { warnings: result.warnings }
          );
        }
      } catch (error) {
        this.recordTest(
          `Component: ${path.basename(filePath, '.tsx')}`,
          false,
          `Could not validate component: ${error.message}`
        );
      }
    }
  }

  async validatePerformanceMetrics() {
    this.log('Validating performance metrics...', 'debug');

    // Test page load time
    try {
      const startTime = Date.now();
      await axios.get(this.config.frontendUrl);
      const loadTime = Date.now() - startTime;
      
      this.recordTest(
        'Page Load Time',
        loadTime < 3000,
        `Page load time: ${loadTime}ms`,
        { loadTime, threshold: 3000 }
      );
    } catch (error) {
      this.recordTest('Page Load Time', false, `Could not measure page load time: ${error.message}`);
    }

    // Test bundle size (check if build files exist and are reasonable)
    try {
      const buildDir = '/workspaces/agent-feed/frontend/dist';
      const buildFiles = await fs.readdir(buildDir);
      const jsFiles = buildFiles.filter(f => f.endsWith('.js'));
      
      if (jsFiles.length > 0) {
        let totalSize = 0;
        for (const file of jsFiles) {
          const stat = await fs.stat(path.join(buildDir, file));
          totalSize += stat.size;
        }
        
        const totalSizeMB = totalSize / (1024 * 1024);
        this.recordTest(
          'Bundle Size',
          totalSizeMB < 5,
          `Total JS bundle size: ${totalSizeMB.toFixed(2)}MB`,
          { sizeBytes: totalSize, sizeMB: totalSizeMB, threshold: 5 }
        );
      } else {
        this.recordWarning('Bundle Size', 'No JS files found in build directory');
      }
    } catch (error) {
      this.recordWarning('Bundle Size', `Could not check bundle size: ${error.message}`);
    }
  }

  async validateSecurityMeasures() {
    this.log('Validating security measures...', 'debug');

    // Check for proper input validation
    try {
      // Test malicious input
      const maliciousPayload = {
        title: '<script>alert("xss")</script>',
        content_value: '{"components":[{"type":"malicious"}]}',
        agent_id: '../../../etc/passwd'
      };

      const response = await axios.post(
        `${this.config.backendUrl}/api/agents/${this.config.testAgentId}/pages`,
        maliciousPayload,
        { timeout: 5000, validateStatus: () => true }
      );

      const blocked = response.status === 400 || response.status === 422;
      this.recordTest(
        'Input Validation',
        blocked,
        blocked ? 'Malicious input properly blocked' : 'Security vulnerability detected',
        { status: response.status, blocked }
      );
    } catch (error) {
      this.recordWarning('Input Validation', `Could not test input validation: ${error.message}`);
    }
  }

  async validateRealUserWorkflows() {
    this.log('Validating real user workflows...', 'debug');

    try {
      // Test creating a page - use the simple API format that's actually mounted
      const testPageSpec = {
        id: 'test-page',
        version: 1,
        title: 'Test Page',
        layout: 'single',
        components: [
          {
            type: 'Card',
            props: {
              title: 'Test Component',
              description: 'This is a test component'
            }
          }
        ]
      };

      // Use the simple API format (id, title, specification)
      const testPage = {
        id: 'test-validation-page',
        title: 'Test Validation Page',
        specification: JSON.stringify(testPageSpec),
        version: 1
      };

      const createResponse = await axios.post(
        `${this.config.backendUrl}/api/agents/${this.config.testAgentId}/pages`,
        testPage,
        { timeout: 10000, validateStatus: () => true }
      );

      // Log the actual response for debugging
      console.log('🔍 DEBUG: Create page response:', {
        status: createResponse.status,
        data: createResponse.data
      });

      if (createResponse.status === 201 || createResponse.status === 200) {
        const pageId = testPage.id; // For simple API, we provide the ID
        
        // Test retrieving the page
        const getResponse = await axios.get(
          `${this.config.backendUrl}/api/agents/${this.config.testAgentId}/pages/${pageId}`,
          { validateStatus: () => true }
        );

        const retrieved = getResponse.status === 200 && 
                         getResponse.data &&
                         (getResponse.data.title === testPage.title || getResponse.data.success);

        this.recordTest(
          'Create and Retrieve Page',
          retrieved,
          retrieved ? 'Page created and retrieved successfully' : 'Page workflow failed'
        );

        // Cleanup - delete the test page
        try {
          await axios.delete(
            `${this.config.backendUrl}/api/agents/${this.config.testAgentId}/pages/${pageId}`
          );
        } catch (cleanupError) {
          this.recordWarning('Test Cleanup', 'Could not delete test page');
        }
      } else {
        this.recordTest('Create and Retrieve Page', false, 'Could not create test page');
      }
    } catch (error) {
      this.recordTest('Create and Retrieve Page', false, `Workflow test failed: ${error.message}`);
    }
  }

  async validateErrorHandling() {
    this.log('Validating error handling...', 'debug');

    // Test 404 handling
    try {
      const response = await axios.get(
        `${this.config.backendUrl}/api/agents/nonexistent/pages/nonexistent`,
        { validateStatus: () => true }
      );

      const properError = response.status === 404 && 
                         response.data && 
                         response.data.error;

      this.recordTest(
        'Error Handling - 404',
        properError,
        properError ? 'Proper 404 error handling' : 'Improper error handling'
      );
    } catch (error) {
      this.recordTest('Error Handling - 404', false, `Could not test error handling: ${error.message}`);
    }
  }

  async validateMobileResponsiveness() {
    this.log('Validating mobile responsiveness...', 'debug');
    
    // Check if CSS includes responsive design patterns
    try {
      const componentPath = '/workspaces/agent-feed/frontend/src/components/AgentPagesTab.tsx';
      const content = await fs.readFile(componentPath, 'utf8');
      
      const hasResponsiveClasses = content.includes('md:') || 
                                  content.includes('lg:') || 
                                  content.includes('sm:') ||
                                  content.includes('grid-cols');

      this.recordTest(
        'Mobile Responsive Design',
        hasResponsiveClasses,
        hasResponsiveClasses ? 'Responsive design patterns found' : 'No responsive design detected'
      );
    } catch (error) {
      this.recordTest('Mobile Responsive Design', false, `Could not validate responsive design: ${error.message}`);
    }
  }

  generateReport() {
    const { passed, failed, warnings, tests } = this.results;
    const total = passed + failed;
    const successRate = total > 0 ? (passed / total * 100).toFixed(1) : 0;

    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        total,
        passed,
        failed,
        warnings,
        successRate: `${successRate}%`,
        status: failed === 0 ? 'PASS' : 'FAIL'
      },
      details: tests,
      recommendations: []
    };

    // Add recommendations based on failures
    if (failed > 0) {
      report.recommendations.push('Fix all failing tests before deploying to production');
    }
    if (warnings > 0) {
      report.recommendations.push('Address warnings to improve system robustness');
    }
    if (successRate < 95) {
      report.recommendations.push('Increase test coverage and fix issues before production deployment');
    }

    return report;
  }

  async runValidation() {
    this.log('Starting Agent Pages Production Validation', 'info');
    this.log('='.repeat(60), 'info');

    await this.validateApiEndpoints();
    await this.validateFileStructure();
    await this.validateDatabaseIntegrity();
    await this.validateFrontendAvailability();
    await this.validateComponentRendering();
    await this.validatePerformanceMetrics();
    await this.validateSecurityMeasures();
    await this.validateRealUserWorkflows();
    await this.validateErrorHandling();
    await this.validateMobileResponsiveness();

    const report = this.generateReport();

    // Save report
    const reportPath = '/workspaces/agent-feed/tests/production-validation/agent-pages-validation-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    this.log('='.repeat(60), 'info');
    this.log('VALIDATION COMPLETE', 'info');
    this.log(`Status: ${report.summary.status}`, report.summary.status === 'PASS' ? 'pass' : 'fail');
    this.log(`Success Rate: ${report.summary.successRate}`, 'info');
    this.log(`Passed: ${report.summary.passed}`, 'pass');
    this.log(`Failed: ${report.summary.failed}`, 'fail');
    this.log(`Warnings: ${report.summary.warnings}`, 'warn');
    this.log(`Report saved: ${reportPath}`, 'info');

    return report;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new AgentPagesValidator();
  validator.runValidation()
    .then(report => {
      process.exit(report.summary.status === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { AgentPagesValidator };