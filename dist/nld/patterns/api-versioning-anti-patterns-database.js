"use strict";
/**
 * API Versioning Anti-Patterns Database
 *
 * Comprehensive database of API versioning anti-patterns with emphasis on
 * endpoint mismatch detection and prevention strategies for future development.
 *
 * This database captures real-world patterns where API versioning inconsistencies
 * lead to partial functionality failures, particularly in SSE/real-time systems.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersioningAntiPatternsDatabase = exports.APIVersioningAntiPatternsDatabase = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Main anti-patterns database manager
 */
class APIVersioningAntiPatternsDatabase {
    patterns = new Map();
    databasePath;
    constructor(databasePath = '/workspaces/agent-feed/src/nld/patterns') {
        this.databasePath = databasePath;
        this.initializeDatabase();
    }
    /**
     * Initialize database with known anti-patterns
     */
    initializeDatabase() {
        console.log('📚 [NLD] Initializing API versioning anti-patterns database...');
        // Load existing patterns or create default set
        this.loadExistingPatterns();
        // Add core anti-patterns if database is empty
        if (this.patterns.size === 0) {
            this.addCoreAntiPatterns();
        }
        console.log(`✅ [NLD] Database initialized with ${this.patterns.size} anti-patterns`);
    }
    /**
     * Add core anti-patterns based on SSE endpoint mismatch analysis
     */
    addCoreAntiPatterns() {
        // Pattern 1: SSE/REST Version Mismatch
        this.addPattern({
            id: 'sse_rest_version_mismatch',
            name: 'SSE/REST API Version Inconsistency',
            category: 'protocol_mismatch',
            severity: 'critical',
            description: 'Frontend uses different API versions for SSE connections versus REST requests, causing SSE functionality to fail while REST operations work normally.',
            symptoms: [
                'SSE connections fail with 404 errors',
                'REST API calls work correctly',
                'Real-time features are unavailable',
                'No error messages in REST endpoints',
                'Inconsistent user experience across features'
            ],
            rootCause: 'Development teams using different API versioning patterns for different protocols without coordinated endpoint management.',
            detectionCriteria: [
                {
                    type: 'static_analysis',
                    description: 'Scan codebase for mixed /api/ and /api/v1/ patterns',
                    implementation: 'grep -r "(/api/|/api/v1/)" --include="*.ts" --include="*.js" .',
                    confidence: 0.85,
                    automationLevel: 'fully_automated'
                },
                {
                    type: 'integration_test',
                    description: 'Test all SSE endpoint connections',
                    implementation: 'Automated test suite that attempts connection to all discovered SSE endpoints',
                    confidence: 0.95,
                    automationLevel: 'fully_automated'
                }
            ],
            examples: [
                {
                    title: 'SSE Terminal Stream Version Mismatch',
                    context: 'Claude Code terminal streaming implementation',
                    codeExample: {
                        language: 'typescript',
                        before: `// Frontend SSE connection - FAILS
const eventSource = new EventSource('/api/claude/instances/123/terminal/stream');

// Frontend REST request - WORKS  
fetch('/api/v1/claude-code/health');`,
                        after: `// Frontend SSE connection - FIXED
const eventSource = new EventSource('/api/v1/claude/instances/123/terminal/stream');

// Frontend REST request - CONSISTENT
fetch('/api/v1/claude-code/health');`
                    },
                    explanation: 'The SSE endpoint was missing the /v1/ version prefix while REST endpoints used it consistently.',
                    realWorldImpact: 'Terminal streaming was completely unavailable while other Claude Code features worked normally, leading to user confusion and support tickets.'
                }
            ],
            impact: {
                technicalImpact: [
                    'Partial system functionality failure',
                    'Inconsistent API architecture',
                    'Difficult debugging due to mixed success/failure patterns'
                ],
                businessImpact: [
                    'Loss of real-time functionality revenue',
                    'Increased support costs',
                    'User churn due to broken features'
                ],
                userExperience: [
                    'Real-time features unavailable',
                    'Inconsistent application behavior',
                    'Confusion about which features work'
                ],
                maintenanceOverhead: 'High - requires systematic audit of all endpoints and version patterns'
            },
            prevention: [
                {
                    strategy: 'unified_api_versioning',
                    description: 'Establish single source of truth for API version configuration',
                    implementation: 'Create API_VERSION constant used by all endpoint definitions',
                    effectiveness: 0.95,
                    cost: 'low',
                    prerequisites: ['API architecture review', 'Development team alignment']
                },
                {
                    strategy: 'automated_endpoint_validation',
                    description: 'CI/CD pipeline validation of endpoint consistency',
                    implementation: 'Pre-commit hooks that validate all API paths follow version patterns',
                    effectiveness: 0.9,
                    cost: 'medium',
                    prerequisites: ['CI/CD pipeline', 'Static analysis tools']
                }
            ],
            remediation: [
                {
                    step: 1,
                    action: 'audit_all_endpoints',
                    description: 'Comprehensive scan of all frontend and backend endpoint definitions',
                    estimatedTime: '2-4 hours',
                    risk: 'low',
                    validation: 'Generate endpoint inventory with version patterns'
                },
                {
                    step: 2,
                    action: 'standardize_versions',
                    description: 'Update all endpoints to use consistent version pattern',
                    estimatedTime: '4-8 hours',
                    risk: 'medium',
                    validation: 'All endpoints follow same version pattern'
                },
                {
                    step: 3,
                    action: 'integration_testing',
                    description: 'Test all endpoint connections end-to-end',
                    estimatedTime: '2-3 hours',
                    risk: 'low',
                    validation: 'All SSE and REST endpoints connect successfully'
                }
            ],
            metrics: {
                detectionAccuracy: 0.92,
                falsePositiveRate: 0.08,
                recurrenceRate: 0.15,
                averageResolutionTime: '6-8 hours'
            },
            testingStrategies: [
                {
                    type: 'integration',
                    description: 'Validate SSE endpoint connectivity',
                    testPattern: `describe('SSE Endpoint Consistency', () => {
  test('all SSE endpoints connect successfully', async () => {
    const sseEndpoints = getAllSSEEndpoints();
    for (const endpoint of sseEndpoints) {
      const eventSource = new EventSource(endpoint);
      await expectEventSourceToConnect(eventSource);
    }
  });
});`,
                    coverage: ['endpoint_connectivity', 'version_consistency'],
                    automationPotential: 1.0
                }
            ],
            relatedPatterns: ['configuration_drift', 'protocol_mismatch'],
            occurrences: [
                {
                    timestamp: new Date().toISOString(),
                    project: 'claude-code-terminal',
                    context: 'SSE terminal streaming implementation',
                    detectionMethod: 'user_report',
                    resolution: 'Added /v1/ prefix to SSE endpoints',
                    timeToResolve: 6
                }
            ]
        });
        // Pattern 2: Configuration Drift
        this.addPattern({
            id: 'api_configuration_drift',
            name: 'API Configuration Drift Between Environments',
            category: 'configuration_drift',
            severity: 'high',
            description: 'API version configurations differ between development, staging, and production environments, leading to environment-specific failures.',
            symptoms: [
                'Features work in development but fail in production',
                'Environment-specific API errors',
                'Inconsistent deployment behavior',
                'Configuration-dependent failures'
            ],
            rootCause: 'Manual configuration management without environment parity validation.',
            detectionCriteria: [
                {
                    type: 'configuration_check',
                    description: 'Compare API configurations across environments',
                    implementation: 'Automated configuration comparison in CI/CD',
                    confidence: 0.9,
                    automationLevel: 'semi_automated'
                }
            ],
            examples: [
                {
                    title: 'Environment-Specific Version Configuration',
                    context: 'Production deployment with different API base URL',
                    codeExample: {
                        language: 'javascript',
                        before: `// Development
const API_BASE = '/api/v1';

// Production (misconfigured)
const API_BASE = '/api';`,
                        after: `// Consistent across environments
const API_BASE = process.env.API_VERSION_PREFIX || '/api/v1';`
                    },
                    explanation: 'Production environment was missing version prefix configuration.',
                    realWorldImpact: 'Production deployment broke API functionality while development worked fine.'
                }
            ],
            impact: {
                technicalImpact: [
                    'Environment-specific failures',
                    'Deployment reliability issues',
                    'Configuration management complexity'
                ],
                businessImpact: [
                    'Production outages',
                    'Deployment rollback costs',
                    'Customer trust impact'
                ],
                userExperience: [
                    'Production feature failures',
                    'Inconsistent service availability'
                ],
                maintenanceOverhead: 'Medium - requires configuration management process'
            },
            prevention: [
                {
                    strategy: 'environment_parity',
                    description: 'Ensure all environments use identical configurations',
                    implementation: 'Configuration templates with environment-specific values',
                    effectiveness: 0.9,
                    cost: 'medium',
                    prerequisites: ['Configuration management system', 'Environment templates']
                }
            ],
            remediation: [
                {
                    step: 1,
                    action: 'audit_environment_configs',
                    description: 'Compare configurations across all environments',
                    estimatedTime: '1-2 hours',
                    risk: 'low',
                    validation: 'Configuration differences documented'
                },
                {
                    step: 2,
                    action: 'standardize_configurations',
                    description: 'Update all environments to use consistent configuration pattern',
                    estimatedTime: '2-4 hours',
                    risk: 'medium',
                    validation: 'All environments have identical API configuration structure'
                }
            ],
            metrics: {
                detectionAccuracy: 0.85,
                falsePositiveRate: 0.1,
                recurrenceRate: 0.3,
                averageResolutionTime: '3-4 hours'
            },
            testingStrategies: [
                {
                    type: 'end_to_end',
                    description: 'Cross-environment configuration validation',
                    testPattern: `describe('Environment Configuration Parity', () => {
  test('API configurations match across environments', () => {
    const configs = getAllEnvironmentConfigs();
    expect(configs.dev.apiVersion).toBe(configs.staging.apiVersion);
    expect(configs.staging.apiVersion).toBe(configs.prod.apiVersion);
  });
});`,
                    coverage: ['configuration_consistency', 'environment_parity'],
                    automationPotential: 0.95
                }
            ],
            relatedPatterns: ['sse_rest_version_mismatch'],
            occurrences: []
        });
        // Pattern 3: Version Gap Anti-Pattern
        this.addPattern({
            id: 'api_version_gap',
            name: 'API Version Gap in Endpoint Evolution',
            category: 'version_gap',
            severity: 'medium',
            description: 'New endpoints are created with updated versions while existing related endpoints remain on older versions, creating inconsistent API surface.',
            symptoms: [
                'Mixed version numbers in related endpoints',
                'Client confusion about which version to use',
                'Inconsistent feature availability across versions',
                'Documentation versioning complexity'
            ],
            rootCause: 'Incremental development without holistic API version management strategy.',
            detectionCriteria: [
                {
                    type: 'static_analysis',
                    description: 'Detect multiple API versions in related endpoint groups',
                    implementation: 'Analysis of endpoint patterns and version distribution',
                    confidence: 0.8,
                    automationLevel: 'semi_automated'
                }
            ],
            examples: [
                {
                    title: 'Claude Instances Version Gap',
                    context: 'New endpoints added with v2 while core endpoints remain v1',
                    codeExample: {
                        language: 'typescript',
                        before: `// Old endpoints
app.get('/api/v1/claude/instances', handler);

// New endpoints  
app.get('/api/v2/claude/instances/health', healthHandler);
app.get('/api/v2/claude/metrics', metricsHandler);`,
                        after: `// Consistent versioning
app.get('/api/v2/claude/instances', handler);
app.get('/api/v2/claude/instances/health', healthHandler); 
app.get('/api/v2/claude/metrics', metricsHandler);`
                    },
                    explanation: 'New features were added with v2 while core functionality remained on v1.',
                    realWorldImpact: 'Client applications had to handle multiple API versions for the same resource type.'
                }
            ],
            impact: {
                technicalImpact: [
                    'API complexity increase',
                    'Client integration complexity',
                    'Maintenance overhead for multiple versions'
                ],
                businessImpact: [
                    'Developer experience degradation',
                    'Integration project delays',
                    'API adoption barriers'
                ],
                userExperience: [
                    'Confusion about API usage',
                    'Inconsistent feature availability'
                ],
                maintenanceOverhead: 'Medium - requires version migration planning'
            },
            prevention: [
                {
                    strategy: 'coordinated_version_evolution',
                    description: 'Plan API version changes across related endpoint groups',
                    implementation: 'API version roadmap with coordinated releases',
                    effectiveness: 0.85,
                    cost: 'medium',
                    prerequisites: ['API governance process', 'Version planning']
                }
            ],
            remediation: [
                {
                    step: 1,
                    action: 'map_version_landscape',
                    description: 'Document current version distribution across all endpoints',
                    estimatedTime: '2-3 hours',
                    risk: 'low',
                    validation: 'Complete version mapping document'
                },
                {
                    step: 2,
                    action: 'plan_version_alignment',
                    description: 'Create migration plan to align related endpoint versions',
                    estimatedTime: '4-6 hours',
                    risk: 'medium',
                    validation: 'Version alignment roadmap with migration steps'
                }
            ],
            metrics: {
                detectionAccuracy: 0.75,
                falsePositiveRate: 0.15,
                recurrenceRate: 0.4,
                averageResolutionTime: '8-12 hours'
            },
            testingStrategies: [
                {
                    type: 'contract',
                    description: 'Validate API version consistency within resource groups',
                    testPattern: `describe('API Version Consistency', () => {
  test('related endpoints use same version', () => {
    const claudeEndpoints = getEndpointsByResource('claude');
    const versions = claudeEndpoints.map(e => extractVersion(e.path));
    expect(new Set(versions)).toHaveLength(1);
  });
});`,
                    coverage: ['version_consistency', 'resource_grouping'],
                    automationPotential: 0.9
                }
            ],
            relatedPatterns: ['api_configuration_drift'],
            occurrences: []
        });
    }
    /**
     * Add new anti-pattern to database
     */
    addPattern(pattern) {
        this.patterns.set(pattern.id, pattern);
        this.saveDatabase();
        console.log(`➕ [NLD] Added anti-pattern: ${pattern.name}`);
    }
    /**
     * Get pattern by ID
     */
    getPattern(id) {
        return this.patterns.get(id);
    }
    /**
     * Get patterns by category
     */
    getPatternsByCategory(category) {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.category === category);
    }
    /**
     * Get patterns by severity
     */
    getPatternsBySeverity(severity) {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.severity === severity);
    }
    /**
     * Search patterns by symptoms
     */
    searchBySymptoms(searchTerm) {
        const term = searchTerm.toLowerCase();
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.symptoms.some(symptom => symptom.toLowerCase().includes(term)) ||
            pattern.description.toLowerCase().includes(term));
    }
    /**
     * Record pattern occurrence
     */
    recordOccurrence(patternId, occurrence) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
            pattern.occurrences.push({
                ...occurrence,
                timestamp: new Date().toISOString()
            });
            this.saveDatabase();
            console.log(`📊 [NLD] Recorded occurrence for pattern: ${pattern.name}`);
        }
    }
    /**
     * Get analytics for all patterns
     */
    getAnalytics() {
        const allPatterns = Array.from(this.patterns.values());
        const totalOccurrences = allPatterns.reduce((sum, p) => sum + p.occurrences.length, 0);
        return {
            summary: {
                totalPatterns: allPatterns.length,
                totalOccurrences,
                averageDetectionAccuracy: allPatterns.reduce((sum, p) => sum + p.metrics.detectionAccuracy, 0) / allPatterns.length
            },
            bySeverity: {
                critical: allPatterns.filter(p => p.severity === 'critical').length,
                high: allPatterns.filter(p => p.severity === 'high').length,
                medium: allPatterns.filter(p => p.severity === 'medium').length,
                low: allPatterns.filter(p => p.severity === 'low').length
            },
            byCategory: {
                path_mismatch: allPatterns.filter(p => p.category === 'path_mismatch').length,
                protocol_mismatch: allPatterns.filter(p => p.category === 'protocol_mismatch').length,
                version_gap: allPatterns.filter(p => p.category === 'version_gap').length,
                configuration_drift: allPatterns.filter(p => p.category === 'configuration_drift').length
            },
            mostCommon: allPatterns
                .sort((a, b) => b.occurrences.length - a.occurrences.length)
                .slice(0, 5)
                .map(p => ({ name: p.name, occurrences: p.occurrences.length })),
            preventionEffectiveness: allPatterns.map(p => ({
                pattern: p.name,
                strategies: p.prevention.length,
                avgEffectiveness: p.prevention.reduce((sum, s) => sum + s.effectiveness, 0) / p.prevention.length
            }))
        };
    }
    /**
     * Generate detection rules for CI/CD integration
     */
    generateDetectionRules() {
        const rules = Array.from(this.patterns.values())
            .map(pattern => ({
            id: pattern.id,
            name: pattern.name,
            severity: pattern.severity,
            rules: pattern.detectionCriteria.map(criterion => ({
                type: criterion.type,
                implementation: criterion.implementation,
                confidence: criterion.confidence,
                automated: criterion.automationLevel === 'fully_automated'
            }))
        }));
        return {
            version: '1.0.0',
            description: 'Auto-generated API versioning anti-pattern detection rules',
            rules
        };
    }
    /**
     * Generate prevention playbook
     */
    generatePreventionPlaybook() {
        const allStrategies = Array.from(this.patterns.values())
            .flatMap(pattern => pattern.prevention.map(strategy => ({
            ...strategy,
            patternName: pattern.name,
            severity: pattern.severity
        })));
        // Group by effectiveness
        const highEffectiveness = allStrategies.filter(s => s.effectiveness >= 0.8);
        const mediumEffectiveness = allStrategies.filter(s => s.effectiveness >= 0.6 && s.effectiveness < 0.8);
        return {
            title: 'API Versioning Anti-Pattern Prevention Playbook',
            lastUpdated: new Date().toISOString(),
            quickWins: highEffectiveness
                .filter(s => s.cost === 'low')
                .sort((a, b) => b.effectiveness - a.effectiveness),
            highImpact: highEffectiveness
                .sort((a, b) => b.effectiveness - a.effectiveness),
            longTerm: mediumEffectiveness
                .filter(s => s.cost === 'high')
                .sort((a, b) => b.effectiveness - a.effectiveness),
            recommendations: [
                'Start with quick wins to build momentum',
                'Implement automated detection in CI/CD pipeline',
                'Establish API governance process',
                'Regular pattern occurrence reviews'
            ]
        };
    }
    /**
     * Load existing patterns from storage
     */
    loadExistingPatterns() {
        try {
            const dbFile = (0, path_1.join)(this.databasePath, 'api-versioning-anti-patterns.json');
            if ((0, fs_1.existsSync)(dbFile)) {
                const data = (0, fs_1.readFileSync)(dbFile, 'utf-8');
                const patterns = JSON.parse(data);
                patterns.forEach((pattern) => {
                    this.patterns.set(pattern.id, pattern);
                });
                console.log(`📂 [NLD] Loaded ${patterns.length} existing anti-patterns`);
            }
        }
        catch (error) {
            console.warn('⚠️ [NLD] Could not load existing anti-patterns:', error);
        }
    }
    /**
     * Save database to storage
     */
    saveDatabase() {
        try {
            const dbFile = (0, path_1.join)(this.databasePath, 'api-versioning-anti-patterns.json');
            const allPatterns = Array.from(this.patterns.values());
            (0, fs_1.writeFileSync)(dbFile, JSON.stringify(allPatterns, null, 2));
            console.log(`💾 [NLD] Saved anti-patterns database with ${allPatterns.length} patterns`);
        }
        catch (error) {
            console.error('❌ [NLD] Failed to save anti-patterns database:', error);
        }
    }
}
exports.APIVersioningAntiPatternsDatabase = APIVersioningAntiPatternsDatabase;
// Export singleton instance
exports.apiVersioningAntiPatternsDatabase = new APIVersioningAntiPatternsDatabase();
//# sourceMappingURL=api-versioning-anti-patterns-database.js.map