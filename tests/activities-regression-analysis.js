#!/usr/bin/env node

/**
 * ACTIVITIES FEATURE REGRESSION ANALYSIS
 *
 * Comprehensive analysis of Activities feature implementation
 * and impact on existing system functionality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ActivitiesRegressionAnalysis {
  constructor() {
    this.results = {
      codebaseAnalysis: {},
      activitiesImplementation: {},
      potentialIssues: [],
      recommendations: [],
      testableComponents: [],
      riskAssessment: {}
    };
  }

  async analyze() {
    console.log('🔍 ACTIVITIES FEATURE REGRESSION ANALYSIS');
    console.log('=' .repeat(80));

    await this.analyzeCodebase();
    await this.analyzeActivitiesImplementation();
    await this.identifyPotentialIssues();
    await this.assessTestability();
    await this.generateRiskAssessment();
    await this.generateRecommendations();

    this.generateReport();
  }

  async analyzeCodebase() {
    console.log('\n📁 Analyzing Codebase Structure...');

    const rootPath = path.join(__dirname, '..');

    // Core system files
    const coreFiles = {
      backend: this.fileExists(path.join(rootPath, 'simple-backend.js')),
      packageJson: this.fileExists(path.join(rootPath, 'package.json')),
      database: this.fileExists(path.join(rootPath, 'database.db')),
      frontend: this.directoryExists(path.join(rootPath, 'frontend')),
      src: this.directoryExists(path.join(rootPath, 'src'))
    };

    // Database services
    const databaseServices = {
      databaseService: this.fileExists(path.join(rootPath, 'src/database/DatabaseService.js')),
      activitiesService: this.fileExists(path.join(rootPath, 'src/services/ActivitiesService.js')),
      websocketService: this.fileExists(path.join(rootPath, 'src/websockets/WebSocketService.js'))
    };

    // API routes
    const apiRoutes = {
      activities: this.fileExists(path.join(rootPath, 'src/routes/activities.js')),
      agents: this.fileExists(path.join(rootPath, 'src/routes/agents.js')),
      posts: this.fileExists(path.join(rootPath, 'src/routes/posts.js')),
      analytics: this.fileExists(path.join(rootPath, 'src/routes/analytics.js'))
    };

    this.results.codebaseAnalysis = {
      coreFiles,
      databaseServices,
      apiRoutes,
      status: this.calculateStatus([coreFiles, databaseServices, apiRoutes])
    };

    console.log(`   Core Files: ${this.countTrue(coreFiles)}/${Object.keys(coreFiles).length} present`);
    console.log(`   Database Services: ${this.countTrue(databaseServices)}/${Object.keys(databaseServices).length} present`);
    console.log(`   API Routes: ${this.countTrue(apiRoutes)}/${Object.keys(apiRoutes).length} present`);
  }

  async analyzeActivitiesImplementation() {
    console.log('\n📝 Analyzing Activities Implementation...');

    const rootPath = path.join(__dirname, '..');
    const backendPath = path.join(rootPath, 'simple-backend.js');

    let activitiesFeatures = {
      apiEndpoint: false,
      databaseIntegration: false,
      websocketSupport: false,
      activityLogging: false,
      errorHandling: false
    };

    try {
      const backendContent = fs.readFileSync(backendPath, 'utf8');

      // Check for Activities API endpoint
      activitiesFeatures.apiEndpoint = backendContent.includes('/api/activities') ||
                                       backendContent.includes('activities.js');

      // Check for database integration
      activitiesFeatures.databaseIntegration = backendContent.includes('logActivity') ||
                                               backendContent.includes('getActivities');

      // Check for WebSocket support
      activitiesFeatures.websocketSupport = backendContent.includes('broadcastActivityUpdate') ||
                                            backendContent.includes('WebSocketServer');

      // Check for activity logging
      activitiesFeatures.activityLogging = backendContent.includes('system_startup') ||
                                            backendContent.includes('activity');

      // Check for error handling
      activitiesFeatures.errorHandling = backendContent.includes('catch') &&
                                          backendContent.includes('error');

      console.log(`   API Endpoint: ${activitiesFeatures.apiEndpoint ? '✅' : '❌'}`);
      console.log(`   Database Integration: ${activitiesFeatures.databaseIntegration ? '✅' : '❌'}`);
      console.log(`   WebSocket Support: ${activitiesFeatures.websocketSupport ? '✅' : '❌'}`);
      console.log(`   Activity Logging: ${activitiesFeatures.activityLogging ? '✅' : '❌'}`);
      console.log(`   Error Handling: ${activitiesFeatures.errorHandling ? '✅' : '❌'}`);

    } catch (error) {
      console.log(`   ❌ Error analyzing backend: ${error.message}`);
    }

    this.results.activitiesImplementation = {
      features: activitiesFeatures,
      implementationScore: this.countTrue(activitiesFeatures),
      totalFeatures: Object.keys(activitiesFeatures).length
    };
  }

  async identifyPotentialIssues() {
    console.log('\n🚨 Identifying Potential Issues...');

    const rootPath = path.join(__dirname, '..');
    const issues = [];

    // Check for syntax errors in backend
    try {
      const backendContent = fs.readFileSync(path.join(rootPath, 'simple-backend.js'), 'utf8');

      // Check for async/await issues
      if (backendContent.includes('await') && !backendContent.includes('async')) {
        issues.push({
          type: 'SYNTAX_ERROR',
          severity: 'HIGH',
          description: 'Potential async/await mismatch in backend',
          file: 'simple-backend.js'
        });
      }

      // Check for database service dependencies
      if (backendContent.includes('databaseService.logActivity') &&
          !this.fileExists(path.join(rootPath, 'src/database/DatabaseService.js'))) {
        issues.push({
          type: 'DEPENDENCY_MISSING',
          severity: 'HIGH',
          description: 'DatabaseService dependency missing but referenced',
          file: 'src/database/DatabaseService.js'
        });
      }

      // Check for WebSocket integration issues
      if (backendContent.includes('broadcastActivityUpdate') &&
          !backendContent.includes('WebSocketServer')) {
        issues.push({
          type: 'WEBSOCKET_INTEGRATION',
          severity: 'MEDIUM',
          description: 'WebSocket broadcasting function without server setup',
          file: 'simple-backend.js'
        });
      }

    } catch (error) {
      issues.push({
        type: 'FILE_ACCESS',
        severity: 'HIGH',
        description: `Cannot access backend file: ${error.message}`,
        file: 'simple-backend.js'
      });
    }

    // Check for missing database file
    if (!this.fileExists(path.join(rootPath, 'database.db'))) {
      issues.push({
        type: 'DATABASE_MISSING',
        severity: 'MEDIUM',
        description: 'Database file not found - may use in-memory DB',
        file: 'database.db'
      });
    }

    // Check for package.json dependencies
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
      const requiredDeps = ['express', 'ws', 'better-sqlite3', 'sqlite3'];

      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep] && !packageJson.devDependencies?.[dep]) {
          issues.push({
            type: 'DEPENDENCY_MISSING',
            severity: 'MEDIUM',
            description: `Required dependency missing: ${dep}`,
            file: 'package.json'
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'PACKAGE_CONFIG',
        severity: 'HIGH',
        description: 'Cannot read package.json',
        file: 'package.json'
      });
    }

    this.results.potentialIssues = issues;

    const highSeverity = issues.filter(i => i.severity === 'HIGH').length;
    const mediumSeverity = issues.filter(i => i.severity === 'MEDIUM').length;

    console.log(`   ❌ High Severity: ${highSeverity}`);
    console.log(`   ⚠️  Medium Severity: ${mediumSeverity}`);
    console.log(`   📊 Total Issues: ${issues.length}`);
  }

  async assessTestability() {
    console.log('\n🧪 Assessing Testability...');

    const testableComponents = [];
    const rootPath = path.join(__dirname, '..');

    // API Endpoints testability
    if (this.fileExists(path.join(rootPath, 'simple-backend.js'))) {
      testableComponents.push({
        component: 'Backend API Server',
        testable: true,
        testType: 'Integration Tests',
        complexity: 'Medium',
        requirements: ['Port availability', 'Database initialization']
      });
    }

    // Database Operations testability
    if (this.fileExists(path.join(rootPath, 'src/database/DatabaseService.js'))) {
      testableComponents.push({
        component: 'Database Service',
        testable: true,
        testType: 'Unit/Integration Tests',
        complexity: 'Low',
        requirements: ['SQLite/PostgreSQL access']
      });
    }

    // Activities API testability
    const backendExists = this.fileExists(path.join(rootPath, 'simple-backend.js'));
    if (backendExists) {
      try {
        const content = fs.readFileSync(path.join(rootPath, 'simple-backend.js'), 'utf8');
        if (content.includes('/api/activities')) {
          testableComponents.push({
            component: 'Activities API Endpoints',
            testable: true,
            testType: 'API Tests',
            complexity: 'Low',
            requirements: ['Running backend server', 'Database connection']
          });
        }
      } catch (error) {
        // File not readable
      }
    }

    // WebSocket testability
    testableComponents.push({
      component: 'WebSocket Connections',
      testable: true,
      testType: 'Integration Tests',
      complexity: 'High',
      requirements: ['WebSocket server', 'Connection management']
    });

    // Frontend Integration testability
    if (this.directoryExists(path.join(rootPath, 'frontend'))) {
      testableComponents.push({
        component: 'Frontend Integration',
        testable: true,
        testType: 'E2E Tests',
        complexity: 'High',
        requirements: ['Browser automation', 'Full stack deployment']
      });
    }

    this.results.testableComponents = testableComponents;

    console.log(`   🧪 Testable Components: ${testableComponents.length}`);
    console.log(`   📊 Complexity Breakdown:`);
    console.log(`      Low: ${testableComponents.filter(c => c.complexity === 'Low').length}`);
    console.log(`      Medium: ${testableComponents.filter(c => c.complexity === 'Medium').length}`);
    console.log(`      High: ${testableComponents.filter(c => c.complexity === 'High').length}`);
  }

  async generateRiskAssessment() {
    console.log('\n⚖️  Generating Risk Assessment...');

    const riskFactors = {
      syntaxErrors: this.results.potentialIssues.filter(i => i.type === 'SYNTAX_ERROR').length,
      missingDependencies: this.results.potentialIssues.filter(i => i.type === 'DEPENDENCY_MISSING').length,
      databaseIntegration: this.results.activitiesImplementation.features.databaseIntegration ? 0 : 1,
      websocketComplexity: this.results.activitiesImplementation.features.websocketSupport ? 1 : 0,
      highSeverityIssues: this.results.potentialIssues.filter(i => i.severity === 'HIGH').length
    };

    const totalRiskPoints = Object.values(riskFactors).reduce((sum, points) => sum + points, 0);
    const maxRiskPoints = 10; // Arbitrary max for calculation

    let riskLevel;
    if (totalRiskPoints <= 2) riskLevel = 'LOW';
    else if (totalRiskPoints <= 5) riskLevel = 'MEDIUM';
    else riskLevel = 'HIGH';

    const riskScore = Math.round((totalRiskPoints / maxRiskPoints) * 100);

    this.results.riskAssessment = {
      riskLevel,
      riskScore,
      riskFactors,
      totalRiskPoints,
      maxRiskPoints
    };

    console.log(`   🎯 Risk Level: ${riskLevel}`);
    console.log(`   📊 Risk Score: ${riskScore}%`);
    console.log(`   🔍 Risk Factors:`);
    for (const [factor, points] of Object.entries(riskFactors)) {
      if (points > 0) {
        console.log(`      ${factor}: ${points} points`);
      }
    }
  }

  async generateRecommendations() {
    console.log('\n💡 Generating Recommendations...');

    const recommendations = [];

    // Syntax error recommendations
    const syntaxErrors = this.results.potentialIssues.filter(i => i.type === 'SYNTAX_ERROR');
    if (syntaxErrors.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Code Quality',
        recommendation: 'Fix syntax errors in backend code before deployment',
        action: 'Review async/await usage and function declarations'
      });
    }

    // Database integration recommendations
    if (!this.results.activitiesImplementation.features.databaseIntegration) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Data Persistence',
        recommendation: 'Implement proper database integration for activities',
        action: 'Create DatabaseService and integrate with Activities API'
      });
    }

    // Testing recommendations
    if (this.results.testableComponents.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Quality Assurance',
        recommendation: 'Implement comprehensive test suite for Activities feature',
        action: 'Start with unit tests for database operations, then integration tests'
      });
    }

    // Performance recommendations
    if (this.results.activitiesImplementation.features.websocketSupport) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        recommendation: 'Monitor WebSocket performance impact',
        action: 'Implement connection limits and message rate limiting'
      });
    }

    // Dependency recommendations
    const missingDeps = this.results.potentialIssues.filter(i => i.type === 'DEPENDENCY_MISSING');
    if (missingDeps.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Dependencies',
        recommendation: 'Install missing dependencies',
        action: 'Run npm install for missing packages'
      });
    }

    this.results.recommendations = recommendations;

    console.log(`   📋 Total Recommendations: ${recommendations.length}`);
    console.log(`   🔴 High Priority: ${recommendations.filter(r => r.priority === 'HIGH').length}`);
    console.log(`   🟡 Medium Priority: ${recommendations.filter(r => r.priority === 'MEDIUM').length}`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 ACTIVITIES FEATURE REGRESSION ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Summary
    console.log('\n📈 EXECUTIVE SUMMARY:');
    const implementationScore = this.results.activitiesImplementation.implementationScore || 0;
    const totalFeatures = this.results.activitiesImplementation.totalFeatures || 1;
    const completionRate = Math.round((implementationScore / totalFeatures) * 100);

    console.log(`   Activities Feature Completion: ${completionRate}%`);
    console.log(`   Risk Level: ${this.results.riskAssessment.riskLevel}`);
    console.log(`   Critical Issues: ${this.results.potentialIssues.filter(i => i.severity === 'HIGH').length}`);
    console.log(`   Testable Components: ${this.results.testableComponents.length}`);

    // Detailed Findings
    console.log('\n🔍 DETAILED FINDINGS:');

    console.log('\n   Core System Analysis:');
    const coreFiles = this.results.codebaseAnalysis.coreFiles;
    for (const [file, exists] of Object.entries(coreFiles)) {
      console.log(`     ${exists ? '✅' : '❌'} ${file}`);
    }

    console.log('\n   Activities Implementation:');
    const features = this.results.activitiesImplementation.features;
    for (const [feature, implemented] of Object.entries(features)) {
      console.log(`     ${implemented ? '✅' : '❌'} ${feature}`);
    }

    if (this.results.potentialIssues.length > 0) {
      console.log('\n   🚨 Issues Identified:');
      this.results.potentialIssues.forEach((issue, index) => {
        const icon = issue.severity === 'HIGH' ? '🔴' : '🟡';
        console.log(`     ${icon} ${issue.type}: ${issue.description}`);
        console.log(`        File: ${issue.file}`);
      });
    }

    if (this.results.recommendations.length > 0) {
      console.log('\n   💡 Recommendations:');
      this.results.recommendations.forEach((rec, index) => {
        const icon = rec.priority === 'HIGH' ? '🔴' : '🟡';
        console.log(`     ${icon} ${rec.category}: ${rec.recommendation}`);
        console.log(`        Action: ${rec.action}`);
      });
    }

    // Test Strategy
    console.log('\n🧪 TESTING STRATEGY:');
    if (this.results.testableComponents.length > 0) {
      this.results.testableComponents.forEach(component => {
        console.log(`   📦 ${component.component}:`);
        console.log(`      Test Type: ${component.testType}`);
        console.log(`      Complexity: ${component.complexity}`);
        console.log(`      Requirements: ${component.requirements.join(', ')}`);
      });
    }

    // Final Assessment
    console.log('\n🎯 FINAL ASSESSMENT:');

    if (this.results.riskAssessment.riskLevel === 'LOW' && completionRate > 80) {
      console.log('   ✅ READY FOR TESTING: Activities feature appears well-implemented');
    } else if (this.results.riskAssessment.riskLevel === 'MEDIUM') {
      console.log('   ⚠️  NEEDS ATTENTION: Address medium-priority issues before full deployment');
    } else {
      console.log('   ❌ REQUIRES FIXES: Critical issues must be resolved before testing');
    }

    console.log('\n   Next Steps:');
    if (this.results.potentialIssues.filter(i => i.severity === 'HIGH').length > 0) {
      console.log('     1. Fix critical syntax and dependency issues');
      console.log('     2. Test basic functionality manually');
      console.log('     3. Implement automated regression tests');
    } else {
      console.log('     1. Start backend server and verify startup');
      console.log('     2. Test Activities API endpoints manually');
      console.log('     3. Run comprehensive regression test suite');
    }

    console.log('\n='.repeat(80));

    // Save detailed report
    this.saveReport();
  }

  saveReport() {
    const reportDir = path.join(__dirname, '..', 'test-results');

    try {
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const report = {
        timestamp: new Date().toISOString(),
        analysis: this.results,
        summary: {
          completionRate: Math.round((this.results.activitiesImplementation.implementationScore /
                                     this.results.activitiesImplementation.totalFeatures) * 100),
          riskLevel: this.results.riskAssessment.riskLevel,
          criticalIssues: this.results.potentialIssues.filter(i => i.severity === 'HIGH').length,
          testableComponents: this.results.testableComponents.length
        }
      };

      const reportFile = path.join(reportDir, `activities-regression-analysis-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

      console.log(`📋 Detailed analysis saved: ${reportFile}`);
    } catch (error) {
      console.log(`❌ Failed to save analysis: ${error.message}`);
    }
  }

  // Utility functions
  fileExists(filePath) {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  directoryExists(dirPath) {
    try {
      const stats = fs.statSync(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  countTrue(obj) {
    return Object.values(obj).filter(v => v === true).length;
  }

  calculateStatus(objArray) {
    const allValues = objArray.flatMap(obj => Object.values(obj));
    const trueCount = allValues.filter(v => v === true).length;
    const total = allValues.length;

    if (trueCount === total) return 'COMPLETE';
    if (trueCount > total / 2) return 'PARTIAL';
    return 'INCOMPLETE';
  }
}

// Run the analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  const analysis = new ActivitiesRegressionAnalysis();
  analysis.analyze().catch(error => {
    console.error('Analysis error:', error);
    process.exit(1);
  });
}

export { ActivitiesRegressionAnalysis };