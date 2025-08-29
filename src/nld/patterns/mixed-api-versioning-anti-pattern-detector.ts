import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * NLD Pattern: Mixed API Versioning Anti-Pattern Detector
 * 
 * PATTERN DETECTION:
 * - Symptom: Some API calls succeed while others fail due to inconsistent versioning
 * - Root Cause: Partial API versioning migration leaving some endpoints unversioned
 * - Detection: Frontend uses both /api/ and /api/v1/ paths for related operations
 * - Classification: Integration consistency bug affecting user workflow
 * 
 * REAL WORLD FAILURE MODES:
 * 1. Frontend fetches instances from /api/v1/claude/instances but sends input to /api/claude/instances
 * 2. Mixed redirect patterns cause 404s on critical operations
 * 3. User experiences partial functionality - some features work, others silently fail
 * 4. Integration tests pass individually but fail when combined
 */

export interface MixedVersioningPattern {
  id: string;
  timestamp: Date;
  detectionTrigger: string;
  endpointPairs: Array<{
    versionedEndpoint: string;
    unversionedEndpoint: string;
    usageContext: string;
    failureMode: 'redirect_404' | 'path_mismatch' | 'undefined_param' | 'cors_failure';
  }>;
  impactAssessment: {
    userWorkflowBroken: boolean;
    partialFunctionalityLoss: boolean;
    silentFailures: boolean;
    testSuitePassed: boolean; // Often true despite real failure
  };
  rootCauseAnalysis: {
    migrationIncomplete: boolean;
    backendRedirectInconsistent: boolean;
    frontendEndpointHardcoded: boolean;
    environmentSpecificBehavior: boolean;
  };
  preventionStrategy: {
    unifiedEndpointMapping: string[];
    backendVersionRedirectRules: string[];
    frontendEndpointConfigFile: string;
    integrationTestScenarios: string[];
  };
}

export class MixedAPIVersioningDetector {
  private patterns: MixedVersioningPattern[] = [];
  private readonly patternStorePath: string;
  private readonly neuralTrainingPath: string;

  constructor() {
    this.patternStorePath = path.join(process.cwd(), 'src/nld/patterns/mixed-versioning-patterns.json');
    this.neuralTrainingPath = path.join(process.cwd(), 'src/nld/neural-training/mixed-versioning-dataset.json');
  }

  /**
   * Detect mixed API versioning patterns from codebase analysis
   */
  async detectMixedVersioningPatterns(codebaseFiles: string[]): Promise<MixedVersioningPattern[]> {
    const detectedPatterns: MixedVersioningPattern[] = [];
    const endpointMap = new Map<string, { versioned: string[], unversioned: string[], contexts: string[] }>();

    // Analyze each file for API endpoint usage
    for (const filePath of codebaseFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const endpoints = this.extractAPIEndpoints(content, filePath);
        
        for (const endpoint of endpoints) {
          const basePath = this.normalizeEndpointPath(endpoint.path);
          if (!endpointMap.has(basePath)) {
            endpointMap.set(basePath, { versioned: [], unversioned: [], contexts: [] });
          }
          
          const entry = endpointMap.get(basePath)!;
          if (endpoint.isVersioned) {
            entry.versioned.push(endpoint.path);
          } else {
            entry.unversioned.push(endpoint.path);
          }
          entry.contexts.push(`${filePath}:${endpoint.lineNumber}`);
        }
      } catch (error) {
        console.warn(`Failed to analyze file ${filePath}:`, error);
      }
    }

    // Identify mixed versioning patterns
    for (const [basePath, usage] of endpointMap) {
      if (usage.versioned.length > 0 && usage.unversioned.length > 0) {
        const pattern = await this.createMixedVersioningPattern(basePath, usage);
        detectedPatterns.push(pattern);
      }
    }

    // Store patterns for analysis
    this.patterns.push(...detectedPatterns);
    await this.persistPatterns();

    return detectedPatterns;
  }

  /**
   * Extract API endpoints from file content
   */
  private extractAPIEndpoints(content: string, filePath: string): Array<{
    path: string;
    isVersioned: boolean;
    lineNumber: number;
    method?: string;
  }> {
    const endpoints = [];
    const lines = content.split('\n');
    
    // Patterns to match API endpoints
    const apiPatterns = [
      /['"`]([^'"` ]*\/api\/[^'"` ]*)['"`]/g,
      /fetch\s*\(['"`]([^'"` ]*\/api\/[^'"` ]*)['"`]/g,
      /axios\.[get|post|put|delete|patch]+\(['"`]([^'"` ]*\/api\/[^'"` ]*)['"`]/g,
      /\.get\(['"`]([^'"` ]*\/api\/[^'"` ]*)['"`]/g,
      /\.post\(['"`]([^'"` ]*\/api\/[^'"` ]*)['"`]/g
    ];

    lines.forEach((line, index) => {
      apiPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const path = match[1];
          if (path.includes('/api/')) {
            endpoints.push({
              path,
              isVersioned: /\/api\/v\d+\//.test(path),
              lineNumber: index + 1
            });
          }
        }
      });
    });

    return endpoints;
  }

  /**
   * Normalize endpoint path for comparison
   */
  private normalizeEndpointPath(path: string): string {
    return path
      .replace(/\/api\/v\d+\//, '/api/')
      .replace(/:\w+/g, ':param')
      .replace(/\/+$/, ''); // Remove trailing slashes
  }

  /**
   * Create comprehensive mixed versioning pattern analysis
   */
  private async createMixedVersioningPattern(
    basePath: string, 
    usage: { versioned: string[], unversioned: string[], contexts: string[] }
  ): Promise<MixedVersioningPattern> {
    const id = createHash('sha256')
      .update(`${basePath}-${JSON.stringify(usage)}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16);

    // Analyze failure modes based on endpoint patterns
    const endpointPairs = [];
    for (const versioned of usage.versioned) {
      for (const unversioned of usage.unversioned) {
        endpointPairs.push({
          versionedEndpoint: versioned,
          unversionedEndpoint: unversioned,
          usageContext: usage.contexts.join(', '),
          failureMode: this.determineFailureMode(versioned, unversioned) as any
        });
      }
    }

    return {
      id,
      timestamp: new Date(),
      detectionTrigger: `Mixed API versioning detected for ${basePath}`,
      endpointPairs,
      impactAssessment: {
        userWorkflowBroken: this.assessWorkflowImpact(basePath),
        partialFunctionalityLoss: true, // Always true for mixed versioning
        silentFailures: this.assessSilentFailures(endpointPairs),
        testSuitePassed: true // Tests often pass despite real failures
      },
      rootCauseAnalysis: {
        migrationIncomplete: true,
        backendRedirectInconsistent: this.hasRedirectInconsistencies(endpointPairs),
        frontendEndpointHardcoded: this.hasHardcodedEndpoints(usage.contexts),
        environmentSpecificBehavior: false
      },
      preventionStrategy: {
        unifiedEndpointMapping: this.generateUnifiedMapping(basePath, usage),
        backendVersionRedirectRules: this.generateRedirectRules(basePath),
        frontendEndpointConfigFile: this.generateEndpointConfig(basePath),
        integrationTestScenarios: this.generateIntegrationTests(basePath, endpointPairs)
      }
    };
  }

  /**
   * Determine specific failure mode for endpoint pair
   */
  private determineFailureMode(versioned: string, unversioned: string): string {
    if (versioned.includes('instances') && unversioned.includes('instances')) {
      return 'undefined_param'; // Common: /api/v1/instances -> /api/instances/:undefined
    }
    if (versioned.includes('terminal') && unversioned.includes('terminal')) {
      return 'path_mismatch'; // Terminal streaming endpoints
    }
    return 'redirect_404';
  }

  /**
   * Assess if mixed versioning breaks user workflows
   */
  private assessWorkflowImpact(basePath: string): boolean {
    const criticalPaths = ['/claude/instances', '/terminal/stream', '/terminal/input'];
    return criticalPaths.some(path => basePath.includes(path));
  }

  /**
   * Assess if failures are silent (no user feedback)
   */
  private assessSilentFailures(endpointPairs: any[]): boolean {
    return endpointPairs.some(pair => 
      pair.failureMode === 'undefined_param' || pair.failureMode === 'path_mismatch'
    );
  }

  /**
   * Check for redirect inconsistencies
   */
  private hasRedirectInconsistencies(endpointPairs: any[]): boolean {
    return endpointPairs.length > 1; // Multiple pairs indicate inconsistent redirects
  }

  /**
   * Check for hardcoded endpoints in source
   */
  private hasHardcodedEndpoints(contexts: string[]): boolean {
    return contexts.some(context => !context.includes('config') && !context.includes('constant'));
  }

  /**
   * Generate unified endpoint mapping strategy
   */
  private generateUnifiedMapping(basePath: string, usage: any): string[] {
    return [
      `// Unified endpoint for ${basePath}`,
      `const ENDPOINT_${basePath.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()} = '${basePath}';`,
      `// Migrate all usage to: ${basePath}`,
      `// Remove versioned variants: ${usage.versioned.join(', ')}`
    ];
  }

  /**
   * Generate backend redirect rules
   */
  private generateRedirectRules(basePath: string): string[] {
    return [
      `// Backend redirect rule for ${basePath}`,
      `app.get('/api/v1${basePath}', (req, res) => {`,
      `  res.redirect(301, '/api${basePath}');`,
      `});`,
      `// Ensure consistent behavior across all versions`
    ];
  }

  /**
   * Generate frontend endpoint config
   */
  private generateEndpointConfig(basePath: string): string {
    return `// Frontend endpoint configuration\nexport const API_ENDPOINTS = {\n  ${basePath.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}: '/api${basePath}'\n};`;
  }

  /**
   * Generate comprehensive integration test scenarios
   */
  private generateIntegrationTests(basePath: string, endpointPairs: any[]): string[] {
    return [
      `// Integration test for ${basePath} endpoint consistency`,
      `test('should handle ${basePath} endpoints consistently', async () => {`,
      `  // Test both versioned and unversioned endpoints`,
      `  const responses = await Promise.all([`,
      ...endpointPairs.map(pair => `    fetch('${pair.versionedEndpoint}'),`),
      ...endpointPairs.map(pair => `    fetch('${pair.unversionedEndpoint}')`),
      `  ]);`,
      `  responses.forEach(response => expect(response.ok).toBe(true));`,
      `});`,
      `// Test complete user workflow`,
      `test('should complete user workflow without mixed versioning failures', async () => {`,
      `  // Simulate real user interaction across all endpoints`,
      `  // Verify no 404s, undefined params, or silent failures`,
      `});`
    ];
  }

  /**
   * Export neural training dataset for preventing similar failures
   */
  async exportNeuralTrainingDataset(): Promise<void> {
    const trainingData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      description: 'Mixed API Versioning Anti-Pattern Training Dataset',
      patterns: this.patterns.map(pattern => ({
        input: {
          endpointPairs: pattern.endpointPairs,
          codebaseStructure: 'frontend_backend_mixed_versioning',
          failureSymptoms: [
            'partial_functionality_works',
            'some_api_calls_succeed_others_fail',
            'user_reports_inconsistent_behavior'
          ]
        },
        expectedOutput: {
          patternType: 'mixed_api_versioning',
          severity: 'high',
          preventionActions: pattern.preventionStrategy,
          tddApproach: 'unified_endpoint_testing'
        },
        metadata: {
          patternId: pattern.id,
          detectedAt: pattern.timestamp,
          realWorldContext: 'claude_instance_management'
        }
      })),
      preventionGuidelines: {
        tddPatterns: [
          'Create endpoint consistency tests before implementation',
          'Test complete user workflows, not individual endpoints',
          'Mock both versioned and unversioned endpoints in tests',
          'Validate redirect behavior in integration tests'
        ],
        codeReviewChecklist: [
          'Verify all endpoints use consistent versioning scheme',
          'Check for hardcoded API paths in frontend code',
          'Ensure backend redirects are comprehensive',
          'Validate environment-specific behavior'
        ]
      }
    };

    await fs.writeFile(
      this.neuralTrainingPath,
      JSON.stringify(trainingData, null, 2),
      'utf-8'
    );

    console.log(`🧠 Neural training dataset exported to: ${this.neuralTrainingPath}`);
  }

  /**
   * Persist detected patterns to storage
   */
  private async persistPatterns(): Promise<void> {
    const data = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      patterns: this.patterns
    };

    await fs.writeFile(
      this.patternStorePath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  /**
   * Load existing patterns from storage
   */
  async loadPatterns(): Promise<void> {
    try {
      const data = await fs.readFile(this.patternStorePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.patterns = parsed.patterns || [];
    } catch (error) {
      // File doesn't exist yet, start fresh
      this.patterns = [];
    }
  }

  /**
   * Get comprehensive prevention strategies
   */
  getPreventionStrategies(): {
    immediate: string[],
    longTerm: string[],
    tddApproaches: string[]
  } {
    return {
      immediate: [
        'Create unified endpoint configuration file',
        'Add comprehensive backend redirects for all versioned endpoints',
        'Implement frontend endpoint validation middleware',
        'Add integration tests covering complete user workflows'
      ],
      longTerm: [
        'Establish API versioning governance policy',
        'Implement automated endpoint consistency monitoring',
        'Create endpoint migration validation pipeline',
        'Build neural pattern detection for future mixed versioning'
      ],
      tddApproaches: [
        'Write failing tests for complete user workflows first',
        'Mock both versioned and unversioned endpoints in test setup',
        'Create contract tests between frontend and backend endpoints',
        'Implement endpoint behavior verification in CI/CD pipeline'
      ]
    };
  }

  /**
   * Generate summary report of detected patterns
   */
  generateSummaryReport(): {
    totalPatterns: number,
    criticalImpactCount: number,
    mostCommonFailureMode: string,
    preventionPriority: string[]
  } {
    const criticalCount = this.patterns.filter(p => p.impactAssessment.userWorkflowBroken).length;
    const failureModes = this.patterns.flatMap(p => p.endpointPairs.map(ep => ep.failureMode));
    const failureModeCount = failureModes.reduce((acc, mode) => {
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonFailureMode = Object.entries(failureModeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalPatterns: this.patterns.length,
      criticalImpactCount: criticalCount,
      mostCommonFailureMode,
      preventionPriority: [
        'Unified endpoint configuration',
        'Backend redirect consistency',
        'Frontend endpoint validation',
        'Integration test coverage'
      ]
    };
  }
}

export default MixedAPIVersioningDetector;
