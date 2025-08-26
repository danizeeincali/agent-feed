#!/usr/bin/env node

/**
 * Workflow Coverage Validation Script
 * 
 * Validates that test coverage matches the 4 Claude instance button workflows:
 * 1. Create New Instance
 * 2. View Instance List  
 * 3. Delete Instance
 * 4. Terminal Access
 */

const fs = require('fs');
const path = require('path');

class WorkflowCoverageValidator {
  constructor() {
    this.requiredWorkflows = [
      {
        name: 'Create New Instance',
        endpoints: [
          'POST /api/v1/claude-live/prod/instances'
        ],
        testFiles: [
          'claude-instance-endpoints.test.js',
          'frontend-backend-integration.test.js',
          'e2e-instance-workflows.test.js'
        ],
        scenarios: [
          'successful instance creation',
          'instance creation failure handling',
          'validation error handling',
          'concurrent instance creation'
        ]
      },
      {
        name: 'View Instance List',
        endpoints: [
          'GET /api/v1/claude-live/prod/instances'
        ],
        testFiles: [
          'claude-instance-endpoints.test.js',
          'frontend-backend-integration.test.js',
          'performance-benchmarks.test.js'
        ],
        scenarios: [
          'list all instances',
          'empty instance list',
          'instance filtering',
          'performance benchmarking'
        ]
      },
      {
        name: 'Delete Instance',
        endpoints: [
          'DELETE /api/v1/claude-live/prod/instances/:id'
        ],
        testFiles: [
          'claude-instance-endpoints.test.js',
          'frontend-backend-integration.test.js',
          'e2e-instance-workflows.test.js'
        ],
        scenarios: [
          'successful instance deletion',
          'graceful shutdown',
          'non-existent instance handling',
          'cleanup verification'
        ]
      },
      {
        name: 'Terminal Access',
        endpoints: [
          'GET /api/v1/claude-live/prod/instances/:id/terminal/stream',
          'GET /api/v1/claude-live/prod/instances/:id/terminal/poll'
        ],
        testFiles: [
          'e2e-instance-workflows.test.js',
          'error-handling-scenarios.test.js'
        ],
        scenarios: [
          'terminal connection establishment',
          'command execution',
          'output streaming',
          'connection failure handling',
          'reconnection logic'
        ]
      }
    ];
    
    this.coverageReport = {
      workflows: [],
      totalCoverage: 0,
      missingCoverage: [],
      recommendations: []
    };
  }

  async validateCoverage() {
    console.log('🔍 Validating Claude Instance Workflow Coverage...\n');

    for (const workflow of this.requiredWorkflows) {
      const workflowCoverage = await this.validateWorkflow(workflow);
      this.coverageReport.workflows.push(workflowCoverage);
    }

    this.calculateTotalCoverage();
    this.generateRecommendations();
    this.printReport();
    
    return this.coverageReport;
  }

  async validateWorkflow(workflow) {
    console.log(`📋 Validating workflow: ${workflow.name}`);
    
    const workflowCoverage = {
      name: workflow.name,
      endpointsCovered: 0,
      endpointsTotal: workflow.endpoints.length,
      testFilesCovered: 0,
      testFilesTotal: workflow.testFiles.length,
      scenariosCovered: 0,
      scenariosTotal: workflow.scenarios.length,
      details: {
        endpoints: [],
        testFiles: [],
        scenarios: []
      }
    };

    // Validate endpoint coverage
    for (const endpoint of workflow.endpoints) {
      const isCovered = await this.validateEndpointCoverage(endpoint);
      workflowCoverage.details.endpoints.push({
        endpoint,
        covered: isCovered,
        testFiles: isCovered ? this.findTestsForEndpoint(endpoint) : []
      });
      if (isCovered) workflowCoverage.endpointsCovered++;
    }

    // Validate test file existence and content
    for (const testFile of workflow.testFiles) {
      const exists = await this.validateTestFileExists(testFile);
      const hasWorkflowTests = exists ? await this.validateTestFileContent(testFile, workflow) : false;
      
      workflowCoverage.details.testFiles.push({
        file: testFile,
        exists,
        hasWorkflowTests,
        testCount: hasWorkflowTests ? await this.countTestsInFile(testFile, workflow) : 0
      });
      if (exists && hasWorkflowTests) workflowCoverage.testFilesCovered++;
    }

    // Validate scenario coverage
    for (const scenario of workflow.scenarios) {
      const isCovered = await this.validateScenarioCoverage(scenario, workflow.testFiles);
      workflowCoverage.details.scenarios.push({
        scenario,
        covered: isCovered,
        testFiles: isCovered ? this.findTestsForScenario(scenario) : []
      });
      if (isCovered) workflowCoverage.scenariosCovered++;
    }

    const coveragePercentage = this.calculateWorkflowCoverage(workflowCoverage);
    workflowCoverage.coveragePercentage = coveragePercentage;

    console.log(`   ✅ Coverage: ${coveragePercentage.toFixed(1)}%`);
    return workflowCoverage;
  }

  async validateEndpointCoverage(endpoint) {
    const testFiles = [
      'claude-instance-endpoints.test.js',
      'frontend-backend-integration.test.js',
      'e2e-instance-workflows.test.js'
    ];

    for (const testFile of testFiles) {
      const filePath = path.join(__dirname, '..', testFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for endpoint references in test content
        const endpointPattern = endpoint.replace(/:\w+/g, '\\w+').replace(/\//g, '\\/');
        const regex = new RegExp(endpointPattern, 'i');
        
        if (regex.test(content)) {
          return true;
        }
      }
    }
    
    return false;
  }

  async validateTestFileExists(testFile) {
    const filePath = path.join(__dirname, '..', testFile);
    return fs.existsSync(filePath);
  }

  async validateTestFileContent(testFile, workflow) {
    const filePath = path.join(__dirname, '..', testFile);
    if (!fs.existsSync(filePath)) return false;

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains tests related to this workflow
    const workflowKeywords = workflow.name.toLowerCase().split(' ');
    return workflowKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  async countTestsInFile(testFile, workflow) {
    const filePath = path.join(__dirname, '..', testFile);
    if (!fs.existsSync(filePath)) return 0;

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count test cases using regex patterns
    const itMatches = content.match(/it\s*\(\s*['"`].*['"`]/g) || [];
    const testMatches = content.match(/test\s*\(\s*['"`].*['"`]/g) || [];
    
    return itMatches.length + testMatches.length;
  }

  async validateScenarioCoverage(scenario, testFiles) {
    for (const testFile of testFiles) {
      const filePath = path.join(__dirname, '..', testFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for scenario-specific keywords
        const scenarioKeywords = scenario.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
        const hasScenario = scenarioKeywords.every(keyword =>
          content.toLowerCase().includes(keyword)
        );
        
        if (hasScenario) return true;
      }
    }
    
    return false;
  }

  findTestsForEndpoint(endpoint) {
    const testFiles = [];
    const allTestFiles = [
      'claude-instance-endpoints.test.js',
      'frontend-backend-integration.test.js',
      'e2e-instance-workflows.test.js',
      'performance-benchmarks.test.js',
      'error-handling-scenarios.test.js'
    ];

    for (const testFile of allTestFiles) {
      const filePath = path.join(__dirname, '..', testFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const endpointPattern = endpoint.replace(/:\w+/g, '\\w+').replace(/\//g, '\\/');
        const regex = new RegExp(endpointPattern, 'i');
        
        if (regex.test(content)) {
          testFiles.push(testFile);
        }
      }
    }

    return testFiles;
  }

  findTestsForScenario(scenario) {
    const testFiles = [];
    const allTestFiles = [
      'claude-instance-endpoints.test.js',
      'frontend-backend-integration.test.js',
      'e2e-instance-workflows.test.js',
      'performance-benchmarks.test.js',
      'error-handling-scenarios.test.js'
    ];

    for (const testFile of allTestFiles) {
      const filePath = path.join(__dirname, '..', testFile);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const scenarioKeywords = scenario.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
        const hasScenario = scenarioKeywords.some(keyword =>
          content.toLowerCase().includes(keyword)
        );
        
        if (hasScenario) {
          testFiles.push(testFile);
        }
      }
    }

    return testFiles;
  }

  calculateWorkflowCoverage(workflowCoverage) {
    const endpointScore = (workflowCoverage.endpointsCovered / workflowCoverage.endpointsTotal) * 40;
    const testFileScore = (workflowCoverage.testFilesCovered / workflowCoverage.testFilesTotal) * 30;
    const scenarioScore = (workflowCoverage.scenariosCovered / workflowCoverage.scenariosTotal) * 30;
    
    return endpointScore + testFileScore + scenarioScore;
  }

  calculateTotalCoverage() {
    const totalWorkflows = this.coverageReport.workflows.length;
    const totalCoverage = this.coverageReport.workflows.reduce(
      (sum, workflow) => sum + workflow.coveragePercentage, 0
    );
    
    this.coverageReport.totalCoverage = totalCoverage / totalWorkflows;
  }

  generateRecommendations() {
    for (const workflow of this.coverageReport.workflows) {
      if (workflow.coveragePercentage < 90) {
        // Check missing endpoints
        const missingEndpoints = workflow.details.endpoints
          .filter(e => !e.covered)
          .map(e => e.endpoint);
          
        if (missingEndpoints.length > 0) {
          this.coverageReport.recommendations.push({
            workflow: workflow.name,
            type: 'missing_endpoints',
            message: `Add tests for endpoints: ${missingEndpoints.join(', ')}`,
            priority: 'high'
          });
        }

        // Check missing test files
        const missingTestFiles = workflow.details.testFiles
          .filter(tf => !tf.exists || !tf.hasWorkflowTests)
          .map(tf => tf.file);
          
        if (missingTestFiles.length > 0) {
          this.coverageReport.recommendations.push({
            workflow: workflow.name,
            type: 'missing_test_files',
            message: `Create/enhance test files: ${missingTestFiles.join(', ')}`,
            priority: 'medium'
          });
        }

        // Check missing scenarios
        const missingScenarios = workflow.details.scenarios
          .filter(s => !s.covered)
          .map(s => s.scenario);
          
        if (missingScenarios.length > 0) {
          this.coverageReport.recommendations.push({
            workflow: workflow.name,
            type: 'missing_scenarios',
            message: `Add tests for scenarios: ${missingScenarios.join(', ')}`,
            priority: 'medium'
          });
        }
      }
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CLAUDE INSTANCE WORKFLOW COVERAGE REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Coverage: ${this.coverageReport.totalCoverage.toFixed(1)}%`);
    
    if (this.coverageReport.totalCoverage >= 90) {
      console.log('✅ Excellent coverage! All workflows are well tested.');
    } else if (this.coverageReport.totalCoverage >= 75) {
      console.log('⚠️  Good coverage, but some improvements needed.');
    } else {
      console.log('❌ Insufficient coverage. Significant improvements required.');
    }

    console.log('\n📋 Workflow Coverage Details:');
    console.log('─'.repeat(80));

    for (const workflow of this.coverageReport.workflows) {
      const status = workflow.coveragePercentage >= 90 ? '✅' : 
                    workflow.coveragePercentage >= 75 ? '⚠️ ' : '❌';
      
      console.log(`\n${status} ${workflow.name} - ${workflow.coveragePercentage.toFixed(1)}%`);
      console.log(`   Endpoints: ${workflow.endpointsCovered}/${workflow.endpointsTotal}`);
      console.log(`   Test Files: ${workflow.testFilesCovered}/${workflow.testFilesTotal}`);
      console.log(`   Scenarios: ${workflow.scenariosCovered}/${workflow.scenariosTotal}`);
      
      // Show missing items
      const missingEndpoints = workflow.details.endpoints.filter(e => !e.covered);
      const missingScenarios = workflow.details.scenarios.filter(s => !s.covered);
      
      if (missingEndpoints.length > 0) {
        console.log(`   Missing Endpoints: ${missingEndpoints.map(e => e.endpoint).join(', ')}`);
      }
      
      if (missingScenarios.length > 0) {
        console.log(`   Missing Scenarios: ${missingScenarios.map(s => s.scenario).join(', ')}`);
      }
    }

    if (this.coverageReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('─'.repeat(80));
      
      const highPriority = this.coverageReport.recommendations.filter(r => r.priority === 'high');
      const mediumPriority = this.coverageReport.recommendations.filter(r => r.priority === 'medium');
      
      if (highPriority.length > 0) {
        console.log('\n🔥 High Priority:');
        highPriority.forEach((rec, i) => {
          console.log(`${i + 1}. [${rec.workflow}] ${rec.message}`);
        });
      }
      
      if (mediumPriority.length > 0) {
        console.log('\n⚠️  Medium Priority:');
        mediumPriority.forEach((rec, i) => {
          console.log(`${i + 1}. [${rec.workflow}] ${rec.message}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
  }

  async generateJSONReport() {
    const reportPath = path.join(__dirname, '..', 'coverage', 'workflow-coverage-report.json');
    
    // Ensure coverage directory exists
    const coverageDir = path.dirname(reportPath);
    if (!fs.existsSync(coverageDir)) {
      fs.mkdirSync(coverageDir, { recursive: true });
    }
    
    const report = {
      ...this.coverageReport,
      generatedAt: new Date().toISOString(),
      testSuiteVersion: '1.0.0',
      londonSchoolTDD: true
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 JSON report saved to: ${reportPath}`);
    
    return reportPath;
  }
}

// CLI execution
async function main() {
  const validator = new WorkflowCoverageValidator();
  
  try {
    const report = await validator.validateCoverage();
    await validator.generateJSONReport();
    
    // Exit with appropriate code
    const exitCode = report.totalCoverage >= 75 ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Error validating workflow coverage:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = WorkflowCoverageValidator;

// Run if called directly
if (require.main === module) {
  main();
}