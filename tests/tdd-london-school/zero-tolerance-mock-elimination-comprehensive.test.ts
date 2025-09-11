/**
 * Zero Tolerance Mock Data Elimination - Comprehensive TDD Regression Test
 * 
 * CRITICAL REQUIREMENTS:
 * - Detect ALL Math.random() usage across production components
 * - Enforce 100% real data display in agent pages
 * - Focus on Overview, Details, Activity tabs contamination
 * - Zero tolerance for mock data in production
 * 
 * SCOPE: 28 files with 42+ Math.random() calls identified
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
const globAsync = glob;

// Mock elimination contract interfaces
interface MockContaminationDetection {
  file: string;
  lines: Array<{
    lineNumber: number;
    content: string;
    mathRandomUsage: string;
    context: string;
  }>;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  affectsAgentPages: boolean;
}

interface RealDataValidation {
  component: string;
  hasRealDataSource: boolean;
  dataOrigin: 'API' | 'DATABASE' | 'MOCK' | 'SYNTHETIC';
  validationResult: 'PASS' | 'FAIL';
}

class MockEliminationOrchestrator {
  private projectRoot: string;
  private productionPaths: string[];
  private agentPageComponents: string[];
  
  constructor() {
    this.projectRoot = '/workspaces/agent-feed';
    this.productionPaths = [
      'frontend/src/components',
      'frontend/src/pages', 
      'frontend/src/services',
      'frontend/src/hooks',
      'src/api',
      'src/services',
      'src/database'
    ];
    
    this.agentPageComponents = [
      'UnifiedAgentPage.tsx',
      'AgentHomePage.tsx', 
      'AgentHome.tsx',
      'AgentManager.tsx',
      'AgentPostsFeed.tsx',
      'DualInstance.tsx',
      'DualInstanceDashboard.tsx'
    ];
  }

  // Comprehensive Math.random() detection across all production files
  async detectMathRandomContamination(): Promise<MockContaminationDetection[]> {
    const contaminations: MockContaminationDetection[] = [];
    
    for (const searchPath of this.productionPaths) {
      const fullPath = path.join(this.projectRoot, searchPath);
      
      if (!fs.existsSync(fullPath)) continue;
      
      const pattern = path.join(fullPath, '**/*.{ts,tsx,js,jsx}');
      const files = await globAsync(pattern);
      
      for (const file of files) {
        // Skip test files and coverage reports
        if (file.includes('test') || file.includes('spec') || file.includes('coverage')) {
          continue;
        }
        
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const mathRandomLines = [];
        
        lines.forEach((line, index) => {
          if (line.includes('Math.random()')) {
            mathRandomLines.push({
              lineNumber: index + 1,
              content: line.trim(),
              mathRandomUsage: this.extractMathRandomContext(line),
              context: this.getLineContext(lines, index)
            });
          }
        });
        
        if (mathRandomLines.length > 0) {
          contaminations.push({
            file: path.relative(this.projectRoot, file),
            lines: mathRandomLines,
            severity: this.determineSeverity(file, mathRandomLines),
            affectsAgentPages: this.affectsAgentPages(file)
          });
        }
      }
    }
    
    return contaminations;
  }
  
  private extractMathRandomContext(line: string): string {
    const mathRandomRegex = /Math\.random\(\)[^;,)]*[;,)]?/g;
    const matches = line.match(mathRandomRegex);
    return matches ? matches[0] : 'Math.random()';
  }
  
  private getLineContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(lines.length, lineIndex + 3);
    return lines.slice(start, end).join('\n');
  }
  
  private determineSeverity(file: string, mathRandomLines: any[]): 'CRITICAL' | 'HIGH' | 'MEDIUM' {
    // Agent page components are CRITICAL
    if (this.affectsAgentPages(file)) return 'CRITICAL';
    
    // API and service files are HIGH priority
    if (file.includes('/api/') || file.includes('/services/')) return 'HIGH';
    
    // Multiple usages are HIGH priority
    if (mathRandomLines.length > 2) return 'HIGH';
    
    return 'MEDIUM';
  }
  
  private affectsAgentPages(file: string): boolean {
    const fileName = path.basename(file);
    return this.agentPageComponents.some(component => 
      fileName === component || file.includes(component.replace('.tsx', ''))
    );
  }

  // Real data validation for agent page components
  async validateRealDataUsage(): Promise<RealDataValidation[]> {
    const validations: RealDataValidation[] = [];
    
    for (const component of this.agentPageComponents) {
      const componentPath = path.join(this.projectRoot, 'frontend/src');
      const files = await globAsync(`${componentPath}/**/${component}`);
      
      for (const file of files) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          const validation = this.analyzeDataSources(component, content);
          validations.push(validation);
        }
      }
    }
    
    return validations;
  }
  
  private analyzeDataSources(component: string, content: string): RealDataValidation {
    // Check for real API calls
    const hasApiCalls = /\/api\/[^'"]*/.test(content);
    const hasFetchCalls = /fetch\s*\([^)]*\/api\//.test(content);
    const hasServiceCalls = /\w+Service\.\w+/.test(content);
    
    // Check for mock/synthetic data indicators
    const hasMathRandom = /Math\.random\(\)/.test(content);
    const hasMockData = /mock|fake|dummy|placeholder/i.test(content);
    const hasSyntheticData = /Math\.floor.*Math\.random|random.*\+\s*\d+/.test(content);
    
    let dataOrigin: RealDataValidation['dataOrigin'] = 'MOCK';
    let hasRealDataSource = false;
    
    if (hasApiCalls || hasFetchCalls || hasServiceCalls) {
      dataOrigin = 'API';
      hasRealDataSource = true;
    }
    
    if (hasMathRandom || hasMockData || hasSyntheticData) {
      dataOrigin = 'SYNTHETIC';
      hasRealDataSource = false;
    }
    
    return {
      component,
      hasRealDataSource,
      dataOrigin,
      validationResult: hasRealDataSource && !hasMathRandom ? 'PASS' : 'FAIL'
    };
  }
}

describe('Zero Tolerance Mock Elimination - Comprehensive TDD', () => {
  let mockEliminator: MockEliminationOrchestrator;
  let detectedContaminations: MockContaminationDetection[];
  let realDataValidations: RealDataValidation[];

  beforeEach(() => {
    mockEliminator = new MockEliminationOrchestrator();
  });

  describe('Math.random() Contamination Detection', () => {
    it('should detect ALL Math.random() usage across production components', async () => {
      detectedContaminations = await mockEliminator.detectMathRandomContamination();
      
      console.log('\n🔍 MATH.RANDOM() CONTAMINATION REPORT:');
      console.log(`Found ${detectedContaminations.length} contaminated files`);
      
      detectedContaminations.forEach(contamination => {
        console.log(`\n📁 ${contamination.file} (${contamination.severity})`);
        contamination.lines.forEach(line => {
          console.log(`  Line ${line.lineNumber}: ${line.content}`);
        });
      });
      
      // Zero tolerance - no Math.random() allowed in production
      expect(detectedContaminations).toHaveLength(0);
    }, 30000);

    it('should have zero Math.random() calls in agent page components', async () => {
      detectedContaminations = await mockEliminator.detectMathRandomContamination();
      
      const agentPageContaminations = detectedContaminations.filter(c => c.affectsAgentPages);
      
      console.log('\n🚨 AGENT PAGE CONTAMINATIONS:');
      agentPageContaminations.forEach(contamination => {
        console.log(`❌ ${contamination.file}: ${contamination.lines.length} Math.random() calls`);
      });
      
      // CRITICAL: Agent pages must be 100% real data
      expect(agentPageContaminations).toHaveLength(0);
    }, 15000);

    it('should have zero CRITICAL severity contaminations', async () => {
      detectedContaminations = await mockEliminator.detectMathRandomContamination();
      
      const criticalContaminations = detectedContaminations.filter(c => c.severity === 'CRITICAL');
      
      console.log('\n🔥 CRITICAL CONTAMINATIONS:');
      criticalContaminations.forEach(contamination => {
        console.log(`🚨 ${contamination.file} - ${contamination.lines.length} violations`);
        contamination.lines.forEach(line => {
          console.log(`    Line ${line.lineNumber}: ${line.mathRandomUsage}`);
        });
      });
      
      // No critical contaminations allowed
      expect(criticalContaminations).toHaveLength(0);
    }, 15000);
  });

  describe('Real Data Validation', () => {
    it('should verify all agent components use real data sources', async () => {
      realDataValidations = await mockEliminator.validateRealDataUsage();
      
      console.log('\n📊 REAL DATA VALIDATION REPORT:');
      realDataValidations.forEach(validation => {
        console.log(`${validation.validationResult === 'PASS' ? '✅' : '❌'} ${validation.component}`);
        console.log(`   Data Origin: ${validation.dataOrigin}`);
        console.log(`   Real Data Source: ${validation.hasRealDataSource}`);
      });
      
      const failedValidations = realDataValidations.filter(v => v.validationResult === 'FAIL');
      
      if (failedValidations.length > 0) {
        console.log('\n❌ FAILED VALIDATIONS:');
        failedValidations.forEach(failed => {
          console.log(`  ${failed.component}: ${failed.dataOrigin} data detected`);
        });
      }
      
      // All agent components must pass real data validation
      expect(failedValidations).toHaveLength(0);
    }, 20000);

    it('should verify Overview tab displays only real agent data', async () => {
      const overviewValidation = await validateTabDataSources('Overview');
      
      console.log('\n🔍 OVERVIEW TAB DATA VALIDATION:');
      console.log(`Real Data Sources: ${overviewValidation.realDataSources}`);
      console.log(`Mock Data Sources: ${overviewValidation.mockDataSources}`);
      console.log(`Synthetic Data: ${overviewValidation.syntheticData}`);
      
      expect(overviewValidation.mockDataSources).toBe(0);
      expect(overviewValidation.syntheticData).toBe(0);
      expect(overviewValidation.realDataSources).toBeGreaterThan(0);
    });

    it('should verify Details tab displays only real agent data', async () => {
      const detailsValidation = await validateTabDataSources('Details');
      
      console.log('\n🔍 DETAILS TAB DATA VALIDATION:');
      console.log(`Real Data Sources: ${detailsValidation.realDataSources}`);
      console.log(`Mock Data Sources: ${detailsValidation.mockDataSources}`);
      console.log(`Synthetic Data: ${detailsValidation.syntheticData}`);
      
      expect(detailsValidation.mockDataSources).toBe(0);
      expect(detailsValidation.syntheticData).toBe(0);
      expect(detailsValidation.realDataSources).toBeGreaterThan(0);
    });

    it('should verify Activity tab displays only real agent data', async () => {
      const activityValidation = await validateTabDataSources('Activity');
      
      console.log('\n🔍 ACTIVITY TAB DATA VALIDATION:');
      console.log(`Real Data Sources: ${activityValidation.realDataSources}`);
      console.log(`Mock Data Sources: ${activityValidation.mockDataSources}`);
      console.log(`Synthetic Data: ${activityValidation.syntheticData}`);
      
      expect(activityValidation.mockDataSources).toBe(0);
      expect(activityValidation.syntheticData).toBe(0);
      expect(activityValidation.realDataSources).toBeGreaterThan(0);
    });
  });

  describe('Mock Elimination Enforcement', () => {
    it('should enforce zero Math.random() calls in production build', async () => {
      detectedContaminations = await mockEliminator.detectMathRandomContamination();
      
      // Generate elimination report
      const eliminationReport = {
        totalFiles: detectedContaminations.length,
        totalViolations: detectedContaminations.reduce((sum, c) => sum + c.lines.length, 0),
        criticalFiles: detectedContaminations.filter(c => c.severity === 'CRITICAL').length,
        agentPageViolations: detectedContaminations.filter(c => c.affectsAgentPages).length,
        timestamp: new Date().toISOString()
      };
      
      console.log('\n📋 MOCK ELIMINATION REPORT:');
      console.log(JSON.stringify(eliminationReport, null, 2));
      
      // Write report for CI/CD pipeline
      const reportPath = '/workspaces/agent-feed/tests/tdd-london-school/mock-elimination-report.json';
      fs.writeFileSync(reportPath, JSON.stringify({
        eliminationReport,
        detectedContaminations,
        realDataValidations
      }, null, 2));
      
      // ABSOLUTE REQUIREMENT: Zero violations
      expect(eliminationReport.totalViolations).toBe(0);
      expect(eliminationReport.agentPageViolations).toBe(0);
      expect(eliminationReport.criticalFiles).toBe(0);
    }, 30000);

    it('should prevent regression of Math.random() contamination', async () => {
      const contaminations = await mockEliminator.detectMathRandomContamination();
      
      // Create a baseline for future regression testing
      const baseline = contaminations.map(c => ({
        file: c.file,
        violationCount: c.lines.length,
        severity: c.severity
      }));
      
      const baselinePath = '/workspaces/agent-feed/tests/tdd-london-school/mock-elimination-baseline.json';
      fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));
      
      // No contaminations should exist
      expect(contaminations).toHaveLength(0);
      
      console.log('\n✅ Mock elimination baseline established');
    });
  });

})

// Helper function for tab-specific validation
async function validateTabDataSources(tabName: string) {
    const tabFiles = await globAsync('/workspaces/agent-feed/frontend/src/**/*{Tab,Page}*.{ts,tsx}');
    let realDataSources = 0;
    let mockDataSources = 0;
    let syntheticData = 0;
    
    for (const file of tabFiles) {
      if (file.toLowerCase().includes(tabName.toLowerCase())) {
        const content = fs.readFileSync(file, 'utf-8');
        
        if (/\/api\//.test(content) || /fetch.*\/api\//.test(content)) {
          realDataSources++;
        }
        
        if (/mock|fake|dummy/i.test(content)) {
          mockDataSources++;
        }
        
        if (/Math\.random\(\)/.test(content)) {
          syntheticData++;
        }
      }
    }
    
    return { realDataSources, mockDataSources, syntheticData };
}

/**
 * Behavior verification contracts for London School TDD
 */
describe('Mock Elimination Behavior Contracts', () => {
  let mockEliminator: MockEliminationOrchestrator;

  beforeEach(() => {
    mockEliminator = new MockEliminationOrchestrator();
  });

  it('should verify agent data flows use deterministic calculations', async () => {
    const agentFiles = await globAsync('/workspaces/agent-feed/frontend/src/**/*{Agent,agent}*.{ts,tsx}');
    
    for (const file of agentFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Verify no random calculations
        expect(content).not.toMatch(/Math\.random\(\)/);
        
        // Verify deterministic data sources
        const hasApiCall = /\/api\//.test(content);
        const hasServiceCall = /\w+Service\./.test(content);
        const hasDataProp = /props\.\w*[Dd]ata/.test(content);
        
        const hasDeterministicSource = hasApiCall || hasServiceCall || hasDataProp;
        
        if (content.includes('agent') && !file.includes('test')) {
          expect(hasDeterministicSource).toBe(true);
        }
      }
    }
  });

  it('should verify agent metrics use real data calculations', async () => {
    const metricsPattern = /metrics|usage|performance|stats/i;
    const files = await globAsync('/workspaces/agent-feed/frontend/src/**/*.{ts,tsx}');
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      
      if (metricsPattern.test(content)) {
        // No random metrics allowed
        expect(content).not.toMatch(/Math\.random\(\)/);
        
        // Should use real data sources
        const hasRealSource = /\/api\/|props\.|database|service/i.test(content);
        if (!file.includes('test') && !file.includes('mock')) {
          expect(hasRealSource).toBe(true);
        }
      }
    }
  });
});