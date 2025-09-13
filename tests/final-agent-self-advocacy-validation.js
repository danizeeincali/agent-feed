/**
 * Final Agent Self-Advocacy System Validation
 * 
 * Comprehensive validation of the complete agent self-advocacy system
 * with proper imports and actual system testing.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class FinalAgentSelfAdvocacyValidation {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      systemStatus: 'VALIDATING',
      phases: {},
      summary: {},
      recommendations: []
    };
    
    this.userFacingAgents = [
      'personal-todos-agent',
      'follow-ups-agent',
      'meeting-prep-agent', 
      'meeting-next-steps-agent',
      'link-logger-agent',
      'get-to-know-you-agent'
    ];
    
    this.systemAgents = [
      'meta-agent',
      'meta-update-agent', 
      'page-builder-agent',
      'agent-feedback-agent',
      'agent-ideas-agent'
    ];
  }

  async runFinalValidation() {
    console.log('🚀 Final Agent Self-Advocacy System Validation');
    console.log('=' .repeat(70));
    
    const startTime = performance.now();
    
    // Phase 1: Agent File Validation
    await this.validateAgentFiles();
    
    // Phase 2: Self-Advocacy Protocol Validation
    await this.validateSelfAdvocacyProtocols();
    
    // Phase 3: System Integration Validation  
    await this.validateSystemIntegration();
    
    // Phase 4: Mock Data Elimination Validation
    await this.validateMockDataElimination();
    
    // Phase 5: Component Architecture Validation
    await this.validateComponentArchitecture();
    
    const totalTime = performance.now() - startTime;
    this.results.executionTime = `${totalTime.toFixed(0)}ms`;
    
    await this.generateFinalReport();
    
    console.log(`\n🎯 FINAL VALIDATION COMPLETE (${this.results.executionTime})`);
    return this.results;
  }
  
  async validateAgentFiles() {
    console.log('\n📋 Phase 1: Agent File Validation');
    
    const agentDir = '/workspaces/agent-feed/prod/.claude/agents';
    const phase = { name: 'Agent File Validation', status: 'PASS', issues: [] };
    
    try {
      // Check all required agents exist
      const agentFiles = fs.readdirSync(agentDir).map(f => path.basename(f, '.md'));
      const allRequiredAgents = [...this.userFacingAgents, ...this.systemAgents];
      
      const missingAgents = allRequiredAgents.filter(agent => !agentFiles.includes(agent));
      
      if (missingAgents.length > 0) {
        phase.status = 'FAIL';
        phase.issues.push(`Missing agents: ${missingAgents.join(', ')}`);
        console.log(`❌ Missing agents: ${missingAgents.join(', ')}`);
      } else {
        console.log('✅ All required agent files exist');
      }
      
      // Validate agent structure
      let structureValidCount = 0;
      for (const agent of allRequiredAgents) {
        const agentPath = path.join(agentDir, `${agent}.md`);
        if (fs.existsSync(agentPath)) {
          const content = fs.readFileSync(agentPath, 'utf8');
          
          // Check for required sections
          const hasMetadata = content.startsWith('---');
          const hasDescription = content.includes('## Purpose') || content.includes('## Description');
          const hasWorkingDir = content.includes('Working Directory') || content.includes('workspace');
          
          if (hasMetadata && hasDescription && hasWorkingDir) {
            structureValidCount++;
          }
        }
      }
      
      phase.structureValidation = {
        validAgents: structureValidCount,
        totalAgents: allRequiredAgents.length,
        percentage: `${((structureValidCount / allRequiredAgents.length) * 100).toFixed(1)}%`
      };
      
      console.log(`📊 Agent structure validation: ${phase.structureValidation.percentage} (${structureValidCount}/${allRequiredAgents.length})`);
      
    } catch (error) {
      phase.status = 'FAIL';
      phase.issues.push(`File validation error: ${error.message}`);
    }
    
    this.results.phases.agentFiles = phase;
  }
  
  async validateSelfAdvocacyProtocols() {
    console.log('\n🧠 Phase 2: Self-Advocacy Protocol Validation');
    
    const phase = { name: 'Self-Advocacy Protocols', status: 'PASS', coverage: {}, issues: [] };
    
    try {
      let selfAdvocacyCount = 0;
      let dataEndpointCount = 0;
      
      // Check user-facing agents for self-advocacy
      for (const agent of this.userFacingAgents) {
        const agentPath = `/workspaces/agent-feed/prod/.claude/agents/${agent}.md`;
        if (fs.existsSync(agentPath)) {
          const content = fs.readFileSync(agentPath, 'utf8');
          
          const hasSelfAdvocacy = content.includes('Self-Advocacy') || 
                                content.includes('self-advocacy') ||
                                content.includes('evaluateSelfAdvocacy');
                                
          const hasDataEndpoint = content.includes('Data Endpoint') ||
                                content.includes('registerAgent') ||
                                content.includes('data_endpoint');
          
          if (hasSelfAdvocacy) selfAdvocacyCount++;
          if (hasDataEndpoint) dataEndpointCount++;
          
          console.log(`${hasSelfAdvocacy ? '✅' : '❌'} ${agent}: Self-advocacy ${hasSelfAdvocacy ? 'implemented' : 'missing'}`);
          console.log(`${hasDataEndpoint ? '✅' : '❌'} ${agent}: Data endpoint ${hasDataEndpoint ? 'implemented' : 'missing'}`);
        }
      }
      
      // Check system agents do NOT have self-advocacy (except for data endpoints)
      let systemAgentCorrectCount = 0;
      for (const agent of this.systemAgents) {
        const agentPath = `/workspaces/agent-feed/prod/.claude/agents/${agent}.md`;
        if (fs.existsSync(agentPath)) {
          const content = fs.readFileSync(agentPath, 'utf8');
          
          const hasSelfAdvocacy = content.includes('evaluateSelfAdvocacy');
          const isSystemAgent = content.includes('System agent') || content.includes('SYSTEM AGENT');
          
          // System agents should NOT self-advocate (except page-builder which is special)
          if (!hasSelfAdvocacy || agent === 'page-builder-agent') {
            systemAgentCorrectCount++;
            console.log(`✅ ${agent}: Correctly configured as system agent`);
          } else {
            console.log(`❌ ${agent}: System agent should not self-advocate`);
          }
        }
      }
      
      phase.coverage = {
        userFacingWithSelfAdvocacy: `${selfAdvocacyCount}/${this.userFacingAgents.length}`,
        userFacingWithDataEndpoints: `${dataEndpointCount}/${this.userFacingAgents.length}`,
        systemAgentsCorrect: `${systemAgentCorrectCount}/${this.systemAgents.length}`,
        selfAdvocacyPercentage: `${((selfAdvocacyCount / this.userFacingAgents.length) * 100).toFixed(1)}%`
      };
      
      if (selfAdvocacyCount < this.userFacingAgents.length * 0.8) {
        phase.status = 'PARTIAL';
        phase.issues.push(`Low self-advocacy coverage: ${phase.coverage.selfAdvocacyPercentage}`);
      }
      
      console.log(`📊 Self-advocacy coverage: ${phase.coverage.selfAdvocacyPercentage}`);
      console.log(`📊 Data endpoint coverage: ${phase.coverage.userFacingWithDataEndpoints}`);
      
    } catch (error) {
      phase.status = 'FAIL';
      phase.issues.push(`Protocol validation error: ${error.message}`);
    }
    
    this.results.phases.selfAdvocacy = phase;
  }
  
  async validateSystemIntegration() {
    console.log('\n🔗 Phase 3: System Integration Validation');
    
    const phase = { name: 'System Integration', status: 'PASS', components: {}, issues: [] };
    
    try {
      // Check Avi Strategic Oversight exists
      const aviPath = '/workspaces/agent-feed/src/services/avi-strategic-oversight.js';
      phase.components.aviService = fs.existsSync(aviPath) ? 'FOUND' : 'MISSING';
      
      if (phase.components.aviService === 'FOUND') {
        const aviContent = fs.readFileSync(aviPath, 'utf8');
        phase.components.aviHybridSystem = aviContent.includes('hybrid') || aviContent.includes('AI_ESCALATION') ? 'IMPLEMENTED' : 'BASIC';
        phase.components.aviPerformanceTargets = aviContent.includes('performanceTargets') ? 'IMPLEMENTED' : 'MISSING';
        console.log(`✅ Avi Strategic Oversight: ${phase.components.aviHybridSystem}`);
      }
      
      // Check Agent Data Readiness Service
      const dataReadinessPath = '/workspaces/agent-feed/src/services/agent-data-readiness.js';
      phase.components.dataReadinessService = fs.existsSync(dataReadinessPath) ? 'FOUND' : 'MISSING';
      
      if (phase.components.dataReadinessService === 'FOUND') {
        const dataContent = fs.readFileSync(dataReadinessPath, 'utf8');
        phase.components.dataValidation = dataContent.includes('hasData') && dataContent.includes('registerAgent') ? 'IMPLEMENTED' : 'PARTIAL';
        console.log(`✅ Agent Data Readiness Service: ${phase.components.dataValidation}`);
      }
      
      // Check Page Builder Integration
      const pageBuilderPath = '/workspaces/agent-feed/src/routes/page-builder.js';
      phase.components.pageBuilder = fs.existsSync(pageBuilderPath) ? 'FOUND' : 'MISSING';
      
      if (phase.components.pageBuilder === 'FOUND') {
        const builderContent = fs.readFileSync(pageBuilderPath, 'utf8');
        phase.components.pageBuilderValidation = builderContent.includes('validateAgentData') || 
                                               builderContent.includes('data readiness') ? 'IMPLEMENTED' : 'MISSING';
        console.log(`${phase.components.pageBuilderValidation === 'IMPLEMENTED' ? '✅' : '⚠️'} Page Builder: ${phase.components.pageBuilderValidation}`);
      }
      
      // Overall integration status
      const criticalComponents = [
        phase.components.aviService,
        phase.components.dataReadinessService,
        phase.components.pageBuilder
      ];
      
      const workingComponents = criticalComponents.filter(c => c === 'FOUND').length;
      if (workingComponents < 3) {
        phase.status = 'PARTIAL';
        phase.issues.push(`Missing critical components: ${3 - workingComponents}/3`);
      }
      
      console.log(`📊 System integration: ${workingComponents}/3 critical components found`);
      
    } catch (error) {
      phase.status = 'FAIL'; 
      phase.issues.push(`Integration validation error: ${error.message}`);
    }
    
    this.results.phases.systemIntegration = phase;
  }
  
  async validateMockDataElimination() {
    console.log('\n🚫 Phase 4: Mock Data Elimination Validation');
    
    const phase = { name: 'Mock Data Elimination', status: 'PASS', findings: [], issues: [] };
    
    try {
      const mockPatterns = [
        /sample.*data/i,
        /example.*item/i,
        /test.*entry/i,
        /placeholder.*content/i,
        /demo.*data/i,
        /mock.*response/i
      ];
      
      let totalWarnings = 0;
      const agentDir = '/workspaces/agent-feed/prod/.claude/agents';
      const agentFiles = fs.readdirSync(agentDir);
      
      for (const file of agentFiles) {
        const filePath = path.join(agentDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const pattern of mockPatterns) {
          if (pattern.test(content)) {
            totalWarnings++;
            phase.findings.push({
              file,
              pattern: pattern.toString(),
              severity: 'warning'
            });
          }
        }
      }
      
      // Check for data validation implementation
      let dataValidationCount = 0;
      for (const agent of [...this.userFacingAgents, ...this.systemAgents]) {
        const agentPath = path.join(agentDir, `${agent}.md`);
        if (fs.existsSync(agentPath)) {
          const content = fs.readFileSync(agentPath, 'utf8');
          if (content.includes('hasData') || content.includes('data readiness') || content.includes('registerAgent')) {
            dataValidationCount++;
          }
        }
      }
      
      phase.mockDataWarnings = totalWarnings;
      phase.dataValidationCoverage = `${dataValidationCount}/${this.userFacingAgents.length + this.systemAgents.length}`;
      
      if (totalWarnings > 10) {
        phase.status = 'PARTIAL';
        phase.issues.push(`High number of mock data warnings: ${totalWarnings}`);
      }
      
      console.log(`📊 Mock data patterns found: ${totalWarnings} warnings`);
      console.log(`📊 Data validation coverage: ${phase.dataValidationCoverage}`);
      
      if (totalWarnings === 0) {
        console.log('✅ No mock data patterns detected');
      } else {
        console.log(`⚠️  ${totalWarnings} potential mock data patterns found`);
      }
      
    } catch (error) {
      phase.status = 'FAIL';
      phase.issues.push(`Mock data validation error: ${error.message}`);
    }
    
    this.results.phases.mockDataElimination = phase;
  }
  
  async validateComponentArchitecture() {
    console.log('\n🏗️  Phase 5: Component Architecture Validation');
    
    const phase = { name: 'Component Architecture', status: 'PASS', components: {}, issues: [] };
    
    try {
      // Check database services
      const dbServicePath = '/workspaces/agent-feed/src/database/DatabaseService.js';
      phase.components.databaseService = fs.existsSync(dbServicePath) ? 'FOUND' : 'MISSING';
      
      // Check middleware
      const middlewareDir = '/workspaces/agent-feed/src/middleware';
      phase.components.middleware = fs.existsSync(middlewareDir) ? 'FOUND' : 'MISSING';
      
      // Check workspace services
      const workspaceDir = '/workspaces/agent-feed/src/services/workspace';
      phase.components.workspaceServices = fs.existsSync(workspaceDir) ? 'FOUND' : 'MISSING';
      
      // Check routes
      const routesDir = '/workspaces/agent-feed/src/routes';
      phase.components.routeHandlers = fs.existsSync(routesDir) ? 'FOUND' : 'MISSING';
      
      const componentCount = Object.values(phase.components).filter(c => c === 'FOUND').length;
      const totalComponents = Object.keys(phase.components).length;
      
      console.log(`📊 Architecture components: ${componentCount}/${totalComponents} found`);
      
      if (componentCount < totalComponents * 0.8) {
        phase.status = 'PARTIAL';
        phase.issues.push(`Missing architecture components: ${totalComponents - componentCount}/${totalComponents}`);
      }
      
      Object.entries(phase.components).forEach(([name, status]) => {
        console.log(`${status === 'FOUND' ? '✅' : '❌'} ${name}: ${status}`);
      });
      
    } catch (error) {
      phase.status = 'FAIL';
      phase.issues.push(`Architecture validation error: ${error.message}`);
    }
    
    this.results.phases.componentArchitecture = phase;
  }
  
  async generateFinalReport() {
    console.log('\n📊 Generating Final Validation Report...');
    
    // Calculate overall system status
    const phases = Object.values(this.results.phases);
    const passCount = phases.filter(p => p.status === 'PASS').length;
    const partialCount = phases.filter(p => p.status === 'PARTIAL').length;
    const failCount = phases.filter(p => p.status === 'FAIL').length;
    
    if (failCount > 0) {
      this.results.systemStatus = 'NEEDS_ATTENTION';
    } else if (partialCount > 0) {
      this.results.systemStatus = 'PARTIAL_READY';
    } else {
      this.results.systemStatus = 'PRODUCTION_READY';
    }
    
    // Generate summary
    this.results.summary = {
      overallStatus: this.results.systemStatus,
      phasesCompleted: phases.length,
      phasesPassed: passCount,
      phasesPartial: partialCount,
      phasesFailed: failCount,
      successRate: `${((passCount / phases.length) * 100).toFixed(1)}%`,
      
      agentValidation: {
        totalAgents: this.userFacingAgents.length + this.systemAgents.length,
        userFacingAgents: this.userFacingAgents.length,
        systemAgents: this.systemAgents.length,
        selfAdvocacyImplemented: this.results.phases.selfAdvocacy?.coverage?.selfAdvocacyPercentage || 'N/A'
      },
      
      systemCapabilities: {
        hybridAviSystem: this.results.phases.systemIntegration?.components?.aviHybridSystem || 'UNKNOWN',
        dataValidation: this.results.phases.systemIntegration?.components?.dataValidation || 'UNKNOWN',
        pageBuilderIntegration: this.results.phases.systemIntegration?.components?.pageBuilderValidation || 'UNKNOWN',
        mockDataElimination: this.results.phases.mockDataElimination?.mockDataWarnings === 0 ? 'COMPLETE' : 'WARNINGS_PRESENT'
      }
    };
    
    // Generate recommendations
    if (this.results.systemStatus === 'PRODUCTION_READY') {
      this.results.recommendations.push('✅ System passed all validations - ready for production deployment');
      this.results.recommendations.push('📊 Continue monitoring agent self-advocacy usage patterns');
      this.results.recommendations.push('🔄 Establish regular validation cycles for system health');
    } else {
      if (failCount > 0) {
        this.results.recommendations.push('🚨 Address failed validations before production deployment');
      }
      if (partialCount > 0) {
        this.results.recommendations.push('⚠️  Complete partial implementations for full system capability');
      }
      
      // Add specific recommendations based on findings
      phases.forEach(phase => {
        if (phase.issues.length > 0) {
          phase.issues.forEach(issue => {
            this.results.recommendations.push(`🔧 ${phase.name}: ${issue}`);
          });
        }
      });
    }
    
    // Save detailed report
    const reportPath = '/workspaces/agent-feed/tests/reports/final-agent-self-advocacy-validation-report.json';
    await this.ensureDirectoryExists(path.dirname(reportPath));
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 Detailed report saved: ${reportPath}`);
    
    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 FINAL VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`System Status: ${this.results.systemStatus}`);
    console.log(`Success Rate: ${this.results.summary.successRate} (${passCount}/${phases.length} phases passed)`);
    console.log(`Self-Advocacy Coverage: ${this.results.summary.agentValidation.selfAdvocacyImplemented}`);
    console.log(`Execution Time: ${this.results.executionTime}`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      this.results.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    console.log('='.repeat(70));
    
    return this.results;
  }
  
  async ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Run validation if executed directly
if (require.main === module) {
  (async () => {
    const validator = new FinalAgentSelfAdvocacyValidation();
    const results = await validator.runFinalValidation();
    
    process.exit(results.systemStatus === 'PRODUCTION_READY' ? 0 : 1);
  })();
}

module.exports = FinalAgentSelfAdvocacyValidation;