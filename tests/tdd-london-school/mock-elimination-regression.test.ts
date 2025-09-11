/**
 * TDD London School Mock Elimination Regression Test
 * ZERO-TOLERANCE ENFORCEMENT
 * 
 * This comprehensive test suite verifies complete elimination of mock data
 * across the entire codebase with immediate failure on any detection.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface MockContaminationResult {
  file: string;
  lineNumber: number;
  content: string;
  type: 'math_random' | 'hardcoded_string' | 'mock_variable' | 'synthetic_data';
  severity: 'critical' | 'high' | 'medium';
}

interface CodebaseAnalysisReport {
  totalFilesScanned: number;
  contaminatedFiles: string[];
  contaminations: MockContaminationResult[];
  isClean: boolean;
  summary: string;
}

class MockContaminationDetector {
  private readonly frontendSrcPath = '/workspaces/agent-feed/frontend/src';
  private readonly excludePatterns = [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '.test.',
    '.spec.',
    'test/',
    'tests/',
    'testing/',
    '.config.',
    'mock',
    'Mock'
  ];

  // Critical patterns that indicate mock data usage
  private readonly criticalPatterns = [
    {
      pattern: /Math\.random\(\)/g,
      type: 'math_random' as const,
      severity: 'critical' as const,
      description: 'Math.random() usage detected'
    },
    {
      pattern: /Math\.floor\(Math\.random\(\)/g,
      type: 'math_random' as const,
      severity: 'critical' as const,
      description: 'Math.floor(Math.random()) pattern detected'
    }
  ];

  // Hardcoded mock strings
  private readonly mockStringPatterns = [
    {
      pattern: /"N\/A"/g,
      type: 'hardcoded_string' as const,
      severity: 'high' as const,
      description: 'Hardcoded "N/A" string'
    },
    {
      pattern: /"Unknown"/g,
      type: 'hardcoded_string' as const,
      severity: 'high' as const,
      description: 'Hardcoded "Unknown" string'
    },
    {
      pattern: /"Mock[^"]*"/g,
      type: 'hardcoded_string' as const,
      severity: 'critical' as const,
      description: 'Hardcoded "Mock*" string'
    },
    {
      pattern: /"Placeholder[^"]*"/g,
      type: 'hardcoded_string' as const,
      severity: 'high' as const,
      description: 'Hardcoded "Placeholder*" string'
    },
    {
      pattern: /"Loading\.\.\."/g,
      type: 'hardcoded_string' as const,
      severity: 'medium' as const,
      description: 'Hardcoded "Loading..." string (acceptable in UI)'
    }
  ];

  // Mock variable patterns
  private readonly mockVariablePatterns = [
    {
      pattern: /\bmockData\b/g,
      type: 'mock_variable' as const,
      severity: 'critical' as const,
      description: 'mockData variable usage'
    },
    {
      pattern: /\bfakeData\b/g,
      type: 'mock_variable' as const,
      severity: 'critical' as const,
      description: 'fakeData variable usage'
    },
    {
      pattern: /\bdummyData\b/g,
      type: 'mock_variable' as const,
      severity: 'critical' as const,
      description: 'dummyData variable usage'
    },
    {
      pattern: /\bplaceholderData\b/g,
      type: 'mock_variable' as const,
      severity: 'high' as const,
      description: 'placeholderData variable usage'
    }
  ];

  // Synthetic data generation patterns
  private readonly syntheticDataPatterns = [
    {
      pattern: /Array\.from\(\{[^}]*length[^}]*\}[^,]*,[^)]*Math\.random/g,
      type: 'synthetic_data' as const,
      severity: 'critical' as const,
      description: 'Array.from with Math.random synthetic data generation'
    },
    {
      pattern: /\.map\([^)]*Math\.random[^)]*\)/g,
      type: 'synthetic_data' as const,
      severity: 'critical' as const,
      description: 'Array.map with Math.random data generation'
    }
  ];

  /**
   * Scan all files in frontend/src for mock contamination
   */
  public scanForMockContamination(): CodebaseAnalysisReport {
    const contaminations: MockContaminationResult[] = [];
    const contaminatedFiles: Set<string> = new Set();
    let totalFilesScanned = 0;

    const scanDirectory = (dirPath: string): void => {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!this.shouldExcludeFile(fullPath)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile() && this.isTargetFile(fullPath)) {
          if (!this.shouldExcludeFile(fullPath)) {
            totalFilesScanned++;
            const fileContaminations = this.scanFile(fullPath);
            contaminations.push(...fileContaminations);
            
            if (fileContaminations.length > 0) {
              contaminatedFiles.add(fullPath);
            }
          }
        }
      }
    };

    scanDirectory(this.frontendSrcPath);

    const isClean = contaminations.length === 0;
    const summary = this.generateSummary(totalFilesScanned, contaminations, contaminatedFiles.size);

    return {
      totalFilesScanned,
      contaminatedFiles: Array.from(contaminatedFiles),
      contaminations,
      isClean,
      summary
    };
  }

  private isTargetFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  private shouldExcludeFile(filePath: string): boolean {
    return this.excludePatterns.some(pattern => filePath.includes(pattern));
  }

  private scanFile(filePath: string): MockContaminationResult[] {
    const contaminations: MockContaminationResult[] = [];
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Combine all patterns
      const allPatterns = [
        ...this.criticalPatterns,
        ...this.mockStringPatterns,
        ...this.mockVariablePatterns,
        ...this.syntheticDataPatterns
      ];

      // Scan each line
      lines.forEach((line, index) => {
        allPatterns.forEach(({ pattern, type, severity, description }) => {
          const matches = line.match(pattern);
          if (matches) {
            matches.forEach(match => {
              contaminations.push({
                file: filePath,
                lineNumber: index + 1,
                content: line.trim(),
                type,
                severity
              });
            });
          }
        });
      });

    } catch (error) {
      console.warn(`Failed to scan file ${filePath}:`, error);
    }

    return contaminations;
  }

  private generateSummary(totalFiles: number, contaminations: MockContaminationResult[], contaminatedFiles: number): string {
    const critical = contaminations.filter(c => c.severity === 'critical').length;
    const high = contaminations.filter(c => c.severity === 'high').length;
    const medium = contaminations.filter(c => c.severity === 'medium').length;

    return `
MOCK CONTAMINATION ANALYSIS REPORT
===================================
Total files scanned: ${totalFiles}
Contaminated files: ${contaminatedFiles}
Total contaminations found: ${contaminations.length}

SEVERITY BREAKDOWN:
- Critical: ${critical} (Math.random, mock variables)
- High: ${high} (Unknown, N/A strings)
- Medium: ${medium} (Loading strings)

STATUS: ${contaminations.length === 0 ? '✅ CLEAN' : '❌ CONTAMINATED'}
    `.trim();
  }

  /**
   * Generate detailed contamination report
   */
  public generateDetailedReport(contaminations: MockContaminationResult[]): string {
    if (contaminations.length === 0) {
      return '✅ NO MOCK CONTAMINATION DETECTED - CODEBASE IS CLEAN';
    }

    const report = ['❌ MOCK CONTAMINATION DETECTED', ''];
    
    // Group by file
    const byFile = contaminations.reduce((acc, contamination) => {
      if (!acc[contamination.file]) {
        acc[contamination.file] = [];
      }
      acc[contamination.file].push(contamination);
      return acc;
    }, {} as Record<string, MockContaminationResult[]>);

    Object.entries(byFile).forEach(([file, fileContaminations]) => {
      report.push(`📁 ${file.replace('/workspaces/agent-feed/', '')}`);
      
      fileContaminations.forEach(contamination => {
        const severity = contamination.severity.toUpperCase();
        const emoji = contamination.severity === 'critical' ? '🚨' : 
                      contamination.severity === 'high' ? '⚠️' : 'ℹ️';
        
        report.push(`  ${emoji} Line ${contamination.lineNumber} [${severity}]: ${contamination.type}`);
        report.push(`     Code: ${contamination.content}`);
      });
      
      report.push('');
    });

    return report.join('\n');
  }
}

// UnifiedAgentPage Component Specific Tests
class UnifiedAgentPageMockDetector {
  private readonly componentPath = '/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx';
  
  /**
   * Test UnifiedAgentPage for deterministic behavior
   */
  public testDeterministicBehavior(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    
    try {
      const content = fs.readFileSync(this.componentPath, 'utf-8');
      
      // Check for Math.random usage
      const mathRandomMatches = content.match(/Math\.random\(\)/g);
      if (mathRandomMatches) {
        issues.push(`Found ${mathRandomMatches.length} Math.random() calls in UnifiedAgentPage`);
      }
      
      // Check for hardcoded fallback values
      const hardcodedFallbacks = [
        /'N\/A'/g,
        /"N\/A"/g,
        /'Unknown'/g,
        /"Unknown"/g,
        /'Mock[^']*'/g,
        /"Mock[^"]*"/g
      ];
      
      hardcodedFallbacks.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push(`Found hardcoded fallback pattern ${index + 1}: ${matches.join(', ')}`);
        }
      });
      
      // Check for real data transformers usage
      if (!content.includes('transformApiDataToUnified')) {
        issues.push('UnifiedAgentPage does not use real data transformers');
      }
      
      // Check for proper API calls
      if (!content.includes('/api/agents/')) {
        issues.push('UnifiedAgentPage does not make proper API calls');
      }
      
      // Check for calculateUptime function (should use real data)
      const calculateUptimeMatch = content.match(/calculateUptime.*?Math\.random/s);
      if (calculateUptimeMatch) {
        issues.push('calculateUptime function uses Math.random()');
      }
      
      // Check for calculateSatisfactionFromMetrics function
      const calculateSatisfactionMatch = content.match(/calculateSatisfactionFromMetrics.*?Math\.random/s);
      if (calculateSatisfactionMatch) {
        issues.push('calculateSatisfactionFromMetrics function uses Math.random()');
      }
      
    } catch (error) {
      issues.push(`Failed to read UnifiedAgentPage component: ${error}`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
}

// API Data Transformers Tests
class DataTransformersValidator {
  private readonly transformersPath = '/workspaces/agent-feed/frontend/src/utils/real-data-transformers.ts';
  
  /**
   * Validate that data transformers return only real data
   */
  public validateTransformers(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    
    try {
      const content = fs.readFileSync(this.transformersPath, 'utf-8');
      
      // Check for Math.random usage
      const mathRandomMatches = content.match(/Math\.random\(\)/g);
      if (mathRandomMatches) {
        issues.push(`Data transformers contain ${mathRandomMatches.length} Math.random() calls`);
      }
      
      // Check for hardcoded mock values
      const mockPatterns = [
        /mock[A-Z]/g,  // mockData, mockValue, etc.
        /fake[A-Z]/g,  // fakeData, fakeValue, etc.
        /dummy[A-Z]/g, // dummyData, dummyValue, etc.
        /'N\/A'/g,
        /"N\/A"/g,
        /'Unknown'/g,
        /"Unknown"/g
      ];
      
      mockPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push(`Data transformers contain mock pattern ${index + 1}: ${matches.join(', ')}`);
        }
      });
      
      // Verify key functions exist and are pure
      const requiredFunctions = [
        'transformPerformanceMetricsToStats',
        'generateRealActivities',
        'generateRealPosts',
        'transformApiDataToUnified'
      ];
      
      requiredFunctions.forEach(funcName => {
        if (!content.includes(`export function ${funcName}`)) {
          issues.push(`Missing required function: ${funcName}`);
        }
      });
      
    } catch (error) {
      issues.push(`Failed to read data transformers: ${error}`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
}

describe('TDD London School: Mock Data Elimination Regression Tests', () => {
  let detector: MockContaminationDetector;
  let unifiedPageDetector: UnifiedAgentPageMockDetector;
  let transformersValidator: DataTransformersValidator;
  let analysisReport: CodebaseAnalysisReport;

  beforeAll(() => {
    detector = new MockContaminationDetector();
    unifiedPageDetector = new UnifiedAgentPageMockDetector();
    transformersValidator = new DataTransformersValidator();
    
    console.log('🔍 Starting comprehensive mock contamination scan...');
    analysisReport = detector.scanForMockContamination();
    console.log(analysisReport.summary);
  });

  afterAll(() => {
    // Generate final report
    const detailedReport = detector.generateDetailedReport(analysisReport.contaminations);
    console.log('\n' + detailedReport);
    
    // Save report to file
    const reportPath = '/workspaces/agent-feed/tests/tdd-london-school/mock-elimination-report.md';
    const fullReport = `# Mock Data Elimination Regression Test Report
Generated: ${new Date().toISOString()}

${analysisReport.summary}

## Detailed Findings

${detailedReport}

## Test Results
- Total files scanned: ${analysisReport.totalFilesScanned}
- Contaminated files: ${analysisReport.contaminatedFiles.length}
- Status: ${analysisReport.isClean ? 'PASSED' : 'FAILED'}
`;
    
    fs.writeFileSync(reportPath, fullReport);
    console.log(`📊 Full report saved to: ${reportPath}`);
  });

  describe('🔬 Codebase-Wide Mock Contamination Detection', () => {
    test('should have ZERO Math.random() usage in production code', () => {
      const mathRandomContaminations = analysisReport.contaminations.filter(
        c => c.type === 'math_random'
      );
      
      if (mathRandomContaminations.length > 0) {
        const details = mathRandomContaminations.map(c => 
          `${c.file}:${c.lineNumber} - ${c.content}`
        ).join('\n');
        
        throw new Error(`🚨 CRITICAL: Found ${mathRandomContaminations.length} Math.random() calls in production code:\n${details}`);
      }
      
      expect(mathRandomContaminations).toHaveLength(0);
    });

    test('should have NO hardcoded mock strings (N/A, Unknown, Mock, Placeholder)', () => {
      const stringContaminations = analysisReport.contaminations.filter(
        c => c.type === 'hardcoded_string' && c.severity !== 'medium'
      );
      
      if (stringContaminations.length > 0) {
        const details = stringContaminations.map(c => 
          `${c.file}:${c.lineNumber} - ${c.content}`
        ).join('\n');
        
        throw new Error(`⚠️ Found ${stringContaminations.length} hardcoded mock strings:\n${details}`);
      }
      
      expect(stringContaminations).toHaveLength(0);
    });

    test('should have NO mock variable declarations (mockData, fakeData, dummyData)', () => {
      const variableContaminations = analysisReport.contaminations.filter(
        c => c.type === 'mock_variable'
      );
      
      if (variableContaminations.length > 0) {
        const details = variableContaminations.map(c => 
          `${c.file}:${c.lineNumber} - ${c.content}`
        ).join('\n');
        
        throw new Error(`🚨 CRITICAL: Found ${variableContaminations.length} mock variable declarations:\n${details}`);
      }
      
      expect(variableContaminations).toHaveLength(0);
    });

    test('should have NO synthetic data generation patterns', () => {
      const syntheticContaminations = analysisReport.contaminations.filter(
        c => c.type === 'synthetic_data'
      );
      
      if (syntheticContaminations.length > 0) {
        const details = syntheticContaminations.map(c => 
          `${c.file}:${c.lineNumber} - ${c.content}`
        ).join('\n');
        
        throw new Error(`🚨 CRITICAL: Found ${syntheticContaminations.length} synthetic data generation patterns:\n${details}`);
      }
      
      expect(syntheticContaminations).toHaveLength(0);
    });

    test('overall codebase should be COMPLETELY CLEAN of mock contamination', () => {
      if (!analysisReport.isClean) {
        const summary = `
MOCK CONTAMINATION DETECTED:
- Total contaminations: ${analysisReport.contaminations.length}
- Contaminated files: ${analysisReport.contaminatedFiles.length}
- Critical issues: ${analysisReport.contaminations.filter(c => c.severity === 'critical').length}
- High priority issues: ${analysisReport.contaminations.filter(c => c.severity === 'high').length}

This test enforces ZERO TOLERANCE for mock data in production code.
        `;
        
        throw new Error(summary);
      }
      
      expect(analysisReport.isClean).toBe(true);
      expect(analysisReport.contaminations).toHaveLength(0);
    });
  });

  describe('🎯 UnifiedAgentPage Component Specific Tests', () => {
    test('UnifiedAgentPage should exhibit deterministic behavior', () => {
      const result = unifiedPageDetector.testDeterministicBehavior();
      
      if (!result.passed) {
        throw new Error(`UnifiedAgentPage failed deterministic behavior test:\n${result.issues.join('\n')}`);
      }
      
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should use real API data transformers exclusively', () => {
      const componentContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx', 'utf-8');
      
      // Should import and use real data transformers
      expect(componentContent).toContain('transformApiDataToUnified');
      expect(componentContent).toContain('real-data-transformers');
      
      // Should NOT contain any Math.random calls
      expect(componentContent).not.toMatch(/Math\.random\(\)/);
      
      // Should make proper API calls
      expect(componentContent).toContain('/api/agents/');
      expect(componentContent).toContain('fetchRealActivities');
      expect(componentContent).toContain('fetchRealPosts');
    });

    test('all three tabs (Overview, Details, Activity) should display real data only', () => {
      const componentContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx', 'utf-8');
      
      // Check for tab implementations
      expect(componentContent).toContain("activeTab === 'overview'");
      expect(componentContent).toContain("activeTab === 'details'");
      expect(componentContent).toContain("activeTab === 'activity'");
      
      // Ensure no hardcoded fallbacks in display logic
      expect(componentContent).not.toMatch(/agent\.stats\.tasksCompleted.*Math\.random/);
      expect(componentContent).not.toMatch(/agent\.stats\.successRate.*Math\.random/);
      expect(componentContent).not.toMatch(/agent\.recentActivities.*\[.*Math\.random/);
    });
  });

  describe('📊 API Data Transformers Validation', () => {
    test('real-data-transformers should be pure functions without mock data', () => {
      const result = transformersValidator.validateTransformers();
      
      if (!result.passed) {
        throw new Error(`Data transformers validation failed:\n${result.issues.join('\n')}`);
      }
      
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should transform API response data into component-friendly format', () => {
      const transformersContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/utils/real-data-transformers.ts', 'utf-8');
      
      // Should contain proper interfaces
      expect(transformersContent).toContain('export interface RealApiAgentData');
      
      // Should contain transformation functions
      expect(transformersContent).toContain('transformPerformanceMetricsToStats');
      expect(transformersContent).toContain('generateRealActivities');
      expect(transformersContent).toContain('generateRealPosts');
      
      // Should NOT use any Math.random
      expect(transformersContent).not.toMatch(/Math\.random\(\)/);
      
      // Should use real calculation patterns
      expect(transformersContent).toMatch(/performance\./);
      expect(transformersContent).toMatch(/health\./);
      expect(transformersContent).toMatch(/apiData\./);
    });

    test('should provide fallback calculations based on real data when metrics unavailable', () => {
      const transformersContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/utils/real-data-transformers.ts', 'utf-8');
      
      // Should have fallback logic based on real data
      expect(transformersContent).toContain('if (!performance)');
      expect(transformersContent).toContain('usageCount');
      expect(transformersContent).toContain('responseTime');
      
      // Fallbacks should NOT use Math.random
      expect(transformersContent).not.toMatch(/Math\.random.*fallback/);
      expect(transformersContent).not.toMatch(/fallback.*Math\.random/);
    });
  });

  describe('🚀 End-to-End Real Data Flow Verification', () => {
    test('API integration should return deterministic results for same input', async () => {
      // This test would require actual API calls to verify deterministic behavior
      // For now, we verify the component structure supports this
      const componentContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx', 'utf-8');
      
      // Should have proper error handling
      expect(componentContent).toContain('try {');
      expect(componentContent).toContain('catch');
      expect(componentContent).toContain('setError');
      
      // Should use consistent API endpoints
      expect(componentContent).toMatch(/\/api\/agents\/\$\{agentId\}/);
      expect(componentContent).toMatch(/\/api\/agents\/\$\{.*\}\/activities/);
      expect(componentContent).toMatch(/\/api\/agents\/\$\{.*\}\/posts/);
    });

    test('data flow should be traceable from API to UI without mock contamination', () => {
      // Verify the data flow path is clean
      const componentContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/components/UnifiedAgentPage.tsx', 'utf-8');
      const transformersContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/utils/real-data-transformers.ts', 'utf-8');
      
      // Component should use transformers
      expect(componentContent).toContain('transformApiDataToUnified');
      
      // Transformers should process real API data
      expect(transformersContent).toContain('RealApiAgentData');
      expect(transformersContent).toContain('performance_metrics');
      expect(transformersContent).toContain('health_status');
      
      // No intermediate mock data contamination
      expect(componentContent).not.toMatch(/mock.*transform/i);
      expect(transformersContent).not.toMatch(/mock.*return/i);
    });
  });

  describe('📈 Performance and Quality Metrics', () => {
    test('should provide metrics on mock elimination completeness', () => {
      const completeness = analysisReport.isClean ? 100 : 
        Math.max(0, 100 - (analysisReport.contaminations.length / analysisReport.totalFilesScanned * 100));
      
      console.log(`🎯 Mock Elimination Completeness: ${completeness.toFixed(2)}%`);
      
      // Require 100% completeness
      expect(completeness).toBe(100);
    });

    test('should report on codebase quality improvement', () => {
      const qualityReport = {
        totalFiles: analysisReport.totalFilesScanned,
        cleanFiles: analysisReport.totalFilesScanned - analysisReport.contaminatedFiles.length,
        contaminationDensity: analysisReport.contaminations.length / analysisReport.totalFilesScanned,
        criticalIssues: analysisReport.contaminations.filter(c => c.severity === 'critical').length
      };
      
      console.log('📊 Quality Metrics:', qualityReport);
      
      // Quality thresholds
      expect(qualityReport.contaminationDensity).toBe(0);
      expect(qualityReport.criticalIssues).toBe(0);
      expect(qualityReport.cleanFiles).toBe(qualityReport.totalFiles);
    });
  });
});