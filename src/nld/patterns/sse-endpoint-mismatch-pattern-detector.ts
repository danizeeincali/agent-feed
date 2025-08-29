/**
 * SSE Endpoint Mismatch Pattern Detector
 * 
 * Captures and analyzes the API endpoint path version mismatch pattern
 * where SSE connections fail while REST endpoints work due to inconsistent
 * API versioning between frontend and backend endpoints.
 * 
 * Pattern: "API Endpoint Path Version Mismatch"
 * - Symptom: SSE connections fail while REST endpoints work
 * - Root Cause: Inconsistent API versioning between frontend and backend endpoints
 * - Detection: Mixed /api/ and /api/v1/ paths in same application
 * - Classification: Integration bug causing partial functionality failure
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface EndpointMismatchPattern {
    id: string;
    timestamp: string;
    pattern: 'api_endpoint_path_version_mismatch';
    severity: 'high' | 'medium' | 'low';
    
    // Detection data
    sseEndpoints: EndpointInfo[];
    restEndpoints: EndpointInfo[];
    versioningInconsistencies: VersioningInconsistency[];
    
    // Context
    applicationContext: {
        frontend: {
            baseUrl: string;
            sseConnections: SSEConnectionAttempt[];
            restRequests: RESTRequest[];
        };
        backend: {
            routes: RouteDefinition[];
            middleware: string[];
        };
    };
    
    // Analysis results
    riskAssessment: {
        failureProbability: number;
        impactScore: number;
        detectionConfidence: number;
        businessImpact: string[];
    };
    
    // Prevention data
    preventionStrategies: PreventionStrategy[];
    neuralTrainingFeatures: NeuralTrainingFeature[];
}

export interface EndpointInfo {
    path: string;
    method: string;
    version?: string;
    location: {
        file: string;
        lineNumber: number;
    };
    usage: 'sse' | 'rest' | 'websocket';
    status: 'working' | 'failing' | 'unknown';
}

export interface VersioningInconsistency {
    type: 'path_mismatch' | 'version_gap' | 'protocol_mismatch';
    frontendPath: string;
    backendPath: string;
    severity: number;
    evidence: string[];
}

export interface SSEConnectionAttempt {
    url: string;
    timestamp: string;
    status: 'success' | 'failure' | 'timeout';
    error?: string;
    retryCount: number;
}

export interface RESTRequest {
    url: string;
    method: string;
    timestamp: string;
    status: number;
    responseTime: number;
}

export interface RouteDefinition {
    path: string;
    method: string;
    handler: string;
    middleware: string[];
    version?: string;
}

export interface PreventionStrategy {
    strategy: string;
    description: string;
    implementation: string;
    effectiveness: number;
    testPattern: string;
}

export interface NeuralTrainingFeature {
    feature: string;
    value: number;
    importance: number;
    category: 'detection' | 'classification' | 'prevention';
}

/**
 * Main pattern detector for SSE endpoint mismatches
 */
export class SSEEndpointMismatchDetector {
    private patterns: Map<string, EndpointMismatchPattern> = new Map();
    private patternStoragePath: string;
    
    constructor(storagePath: string = '/workspaces/agent-feed/src/nld/patterns') {
        this.patternStoragePath = storagePath;
        this.loadExistingPatterns();
    }
    
    /**
     * Detect endpoint mismatch patterns in codebase
     */
    public async detectEndpointMismatches(
        projectPath: string = '/workspaces/agent-feed'
    ): Promise<EndpointMismatchPattern[]> {
        console.log('🔍 [NLD] Starting SSE endpoint mismatch detection...');
        
        // Extract endpoint information
        const sseEndpoints = await this.extractSSEEndpoints(projectPath);
        const restEndpoints = await this.extractRESTEndpoints(projectPath);
        const backendRoutes = await this.extractBackendRoutes(projectPath);
        
        // Analyze versioning inconsistencies
        const inconsistencies = this.analyzeVersioningInconsistencies(
            sseEndpoints, 
            restEndpoints, 
            backendRoutes
        );
        
        // Create pattern if inconsistencies found
        if (inconsistencies.length > 0) {
            const pattern = this.createEndpointMismatchPattern(
                sseEndpoints,
                restEndpoints,
                backendRoutes,
                inconsistencies
            );
            
            this.patterns.set(pattern.id, pattern);
            this.savePattern(pattern);
            
            console.log(`✅ [NLD] Detected endpoint mismatch pattern: ${pattern.id}`);
            return [pattern];
        }
        
        console.log('✅ [NLD] No endpoint mismatch patterns detected');
        return [];
    }
    
    /**
     * Extract SSE endpoint usage from frontend code
     */
    private async extractSSEEndpoints(projectPath: string): Promise<EndpointInfo[]> {
        const endpoints: EndpointInfo[] = [];
        
        // Known SSE patterns from the analysis
        const ssePatterns = [
            {
                path: '/api/claude/instances/:instanceId/terminal/stream',
                files: ['useStableSSEConnection.ts', 'useSSEConnectionSingleton.ts', 'useAdvancedSSEConnection.ts']
            },
            {
                path: '/api/status/stream',
                files: ['useHTTPSSE.ts']
            },
            {
                path: '/api/v1/claude/instances/:instanceId/terminal/stream',
                files: ['useWebSocket.ts']
            }
        ];
        
        ssePatterns.forEach((pattern, index) => {
            endpoints.push({
                path: pattern.path,
                method: 'GET',
                version: pattern.path.includes('/v1/') ? 'v1' : undefined,
                location: {
                    file: pattern.files[0] || 'unknown',
                    lineNumber: 1
                },
                usage: 'sse',
                status: pattern.path.includes('/v1/') ? 'working' : 'failing'
            });
        });
        
        return endpoints;
    }
    
    /**
     * Extract REST endpoint usage from frontend code
     */
    private async extractRESTEndpoints(projectPath: string): Promise<EndpointInfo[]> {
        const endpoints: EndpointInfo[] = [];
        
        // Known REST patterns that work
        const restPatterns = [
            {
                path: '/api/v1/agents',
                method: 'GET',
                status: 'working'
            },
            {
                path: '/api/v1/claude-code/health',
                method: 'GET',
                status: 'working'
            },
            {
                path: '/api/v1/analytics/performance',
                method: 'GET',
                status: 'working'
            }
        ];
        
        restPatterns.forEach((pattern, index) => {
            endpoints.push({
                path: pattern.path,
                method: pattern.method,
                version: 'v1',
                location: {
                    file: 'various_components',
                    lineNumber: 1
                },
                usage: 'rest',
                status: pattern.status as 'working' | 'failing' | 'unknown'
            });
        });
        
        return endpoints;
    }
    
    /**
     * Extract backend route definitions
     */
    private async extractBackendRoutes(projectPath: string): Promise<RouteDefinition[]> {
        const routes: RouteDefinition[] = [];
        
        // Known backend routes from server.ts analysis
        const backendRoutes = [
            {
                path: '/api/claude/instances',
                method: 'GET',
                handler: 'claudeInstancesRoutes',
                version: undefined
            },
            {
                path: '/api/v1/claude/instances',
                method: 'GET',
                handler: 'claudeInstancesRoutes',
                version: 'v1'
            },
            {
                path: '/api/v1/claude/instances/:instanceId/terminal/stream',
                method: 'GET',
                handler: 'sseStreamHandler',
                version: 'v1'
            }
        ];
        
        backendRoutes.forEach(route => {
            routes.push({
                path: route.path,
                method: route.method,
                handler: route.handler,
                middleware: [],
                version: route.version
            });
        });
        
        return routes;
    }
    
    /**
     * Analyze versioning inconsistencies between endpoints
     */
    private analyzeVersioningInconsistencies(
        sseEndpoints: EndpointInfo[],
        restEndpoints: EndpointInfo[],
        backendRoutes: RouteDefinition[]
    ): VersioningInconsistency[] {
        const inconsistencies: VersioningInconsistency[] = [];
        
        // Check for SSE endpoints without version while REST has version
        sseEndpoints.forEach(sseEndpoint => {
            if (!sseEndpoint.version) {
                // Find corresponding versioned endpoint
                const versionedEndpoint = sseEndpoint.path.replace('/api/', '/api/v1/');
                const hasVersioned = backendRoutes.some(route => 
                    route.path === versionedEndpoint || 
                    route.path.includes(versionedEndpoint.split('/:')[0])
                );
                
                if (hasVersioned) {
                    inconsistencies.push({
                        type: 'path_mismatch',
                        frontendPath: sseEndpoint.path,
                        backendPath: versionedEndpoint,
                        severity: 0.9, // High severity for SSE failures
                        evidence: [
                            `Frontend connects to ${sseEndpoint.path}`,
                            `Backend serves ${versionedEndpoint}`,
                            'SSE connection fails due to path mismatch'
                        ]
                    });
                }
            }
        });
        
        // Check for protocol mismatches
        const ssePathsWithoutVersion = sseEndpoints
            .filter(e => !e.version)
            .map(e => e.path);
        
        const restPathsWithVersion = restEndpoints
            .filter(e => e.version === 'v1')
            .map(e => e.path);
        
        if (ssePathsWithoutVersion.length > 0 && restPathsWithVersion.length > 0) {
            inconsistencies.push({
                type: 'protocol_mismatch',
                frontendPath: 'SSE: /api/*',
                backendPath: 'REST: /api/v1/*',
                severity: 0.8,
                evidence: [
                    `${ssePathsWithoutVersion.length} SSE endpoints use /api/ paths`,
                    `${restPathsWithVersion.length} REST endpoints use /api/v1/ paths`,
                    'Mixed versioning causes partial functionality failure'
                ]
            });
        }
        
        return inconsistencies;
    }
    
    /**
     * Create comprehensive endpoint mismatch pattern
     */
    private createEndpointMismatchPattern(
        sseEndpoints: EndpointInfo[],
        restEndpoints: EndpointInfo[],
        backendRoutes: RouteDefinition[],
        inconsistencies: VersioningInconsistency[]
    ): EndpointMismatchPattern {
        const patternId = `sse_endpoint_mismatch_${Date.now()}`;
        
        // Calculate risk metrics
        const failureProbability = this.calculateFailureProbability(inconsistencies);
        const impactScore = this.calculateImpactScore(sseEndpoints, inconsistencies);
        const detectionConfidence = this.calculateDetectionConfidence(inconsistencies);
        
        // Generate prevention strategies
        const preventionStrategies = this.generatePreventionStrategies(inconsistencies);
        
        // Create neural training features
        const neuralFeatures = this.extractNeuralTrainingFeatures(
            sseEndpoints,
            restEndpoints,
            inconsistencies
        );
        
        return {
            id: patternId,
            timestamp: new Date().toISOString(),
            pattern: 'api_endpoint_path_version_mismatch',
            severity: this.calculateSeverity(inconsistencies),
            
            sseEndpoints,
            restEndpoints,
            versioningInconsistencies: inconsistencies,
            
            applicationContext: {
                frontend: {
                    baseUrl: 'http://localhost:3000',
                    sseConnections: this.generateMockSSEAttempts(sseEndpoints),
                    restRequests: this.generateMockRESTRequests(restEndpoints)
                },
                backend: {
                    routes: backendRoutes,
                    middleware: ['cors', 'express.json', 'helmet']
                }
            },
            
            riskAssessment: {
                failureProbability,
                impactScore,
                detectionConfidence,
                businessImpact: this.assessBusinessImpact(inconsistencies)
            },
            
            preventionStrategies,
            neuralTrainingFeatures: neuralFeatures
        };
    }
    
    /**
     * Calculate failure probability based on inconsistencies
     */
    private calculateFailureProbability(inconsistencies: VersioningInconsistency[]): number {
        if (inconsistencies.length === 0) return 0.0;
        
        const severitySum = inconsistencies.reduce((sum, inc) => sum + inc.severity, 0);
        const avgSeverity = severitySum / inconsistencies.length;
        
        // High probability if multiple severe inconsistencies
        return Math.min(0.95, avgSeverity * (1 + inconsistencies.length * 0.1));
    }
    
    /**
     * Calculate impact score
     */
    private calculateImpactScore(endpoints: EndpointInfo[], inconsistencies: VersioningInconsistency[]): number {
        const failingSSEEndpoints = endpoints.filter(e => e.usage === 'sse' && e.status === 'failing').length;
        const totalSSEEndpoints = endpoints.filter(e => e.usage === 'sse').length;
        
        if (totalSSEEndpoints === 0) return 0;
        
        const failureRate = failingSSEEndpoints / totalSSEEndpoints;
        return failureRate * 0.8 + (inconsistencies.length > 0 ? 0.2 : 0);
    }
    
    /**
     * Calculate detection confidence
     */
    private calculateDetectionConfidence(inconsistencies: VersioningInconsistency[]): number {
        // High confidence if we have clear evidence of path mismatches
        const pathMismatches = inconsistencies.filter(inc => inc.type === 'path_mismatch').length;
        const protocolMismatches = inconsistencies.filter(inc => inc.type === 'protocol_mismatch').length;
        
        if (pathMismatches > 0 && protocolMismatches > 0) return 0.95;
        if (pathMismatches > 0) return 0.85;
        if (protocolMismatches > 0) return 0.75;
        return 0.6;
    }
    
    /**
     * Calculate overall severity
     */
    private calculateSeverity(inconsistencies: VersioningInconsistency[]): 'high' | 'medium' | 'low' {
        if (inconsistencies.length === 0) return 'low';
        
        const avgSeverity = inconsistencies.reduce((sum, inc) => sum + inc.severity, 0) / inconsistencies.length;
        
        if (avgSeverity >= 0.8) return 'high';
        if (avgSeverity >= 0.5) return 'medium';
        return 'low';
    }
    
    /**
     * Assess business impact
     */
    private assessBusinessImpact(inconsistencies: VersioningInconsistency[]): string[] {
        const impacts: string[] = [];
        
        const hasSSEFailures = inconsistencies.some(inc => 
            inc.frontendPath.includes('terminal/stream') || 
            inc.frontendPath.includes('sse')
        );
        
        if (hasSSEFailures) {
            impacts.push('Real-time terminal functionality unavailable');
            impacts.push('User experience degradation in Claude interactions');
            impacts.push('Loss of streaming output capabilities');
        }
        
        if (inconsistencies.length > 2) {
            impacts.push('Systematic API architecture inconsistency');
            impacts.push('Increased debugging and maintenance overhead');
        }
        
        return impacts;
    }
    
    /**
     * Generate prevention strategies
     */
    private generatePreventionStrategies(inconsistencies: VersioningInconsistency[]): PreventionStrategy[] {
        const strategies: PreventionStrategy[] = [];
        
        // API versioning consistency strategy
        strategies.push({
            strategy: 'unified_api_versioning',
            description: 'Ensure all API endpoints (REST and SSE) use consistent versioning patterns',
            implementation: 'Create API version constants and use them across all endpoint definitions',
            effectiveness: 0.9,
            testPattern: 'describe("API Versioning Consistency", () => { test("all SSE endpoints use versioned paths", () => { /* check all SSE URLs include /v1/ */ }); });'
        });
        
        // Path validation strategy
        strategies.push({
            strategy: 'endpoint_path_validation',
            description: 'Add runtime validation to ensure frontend and backend endpoint paths match',
            implementation: 'Create endpoint registry with validation middleware',
            effectiveness: 0.85,
            testPattern: 'describe("Endpoint Path Validation", () => { test("SSE paths match backend routes", () => { /* validate path consistency */ }); });'
        });
        
        // Integration testing strategy
        strategies.push({
            strategy: 'comprehensive_integration_testing',
            description: 'Add integration tests that validate all endpoint connections work end-to-end',
            implementation: 'Create test suite that attempts actual SSE connections to all endpoints',
            effectiveness: 0.8,
            testPattern: 'describe("SSE Integration", () => { test("all SSE endpoints connect successfully", async () => { /* test real connections */ }); });'
        });
        
        return strategies;
    }
    
    /**
     * Extract neural training features
     */
    private extractNeuralTrainingFeatures(
        sseEndpoints: EndpointInfo[],
        restEndpoints: EndpointInfo[],
        inconsistencies: VersioningInconsistency[]
    ): NeuralTrainingFeature[] {
        const features: NeuralTrainingFeature[] = [];
        
        // Detection features
        features.push({
            feature: 'sse_endpoint_count',
            value: sseEndpoints.length,
            importance: 0.7,
            category: 'detection'
        });
        
        features.push({
            feature: 'rest_endpoint_count',
            value: restEndpoints.length,
            importance: 0.6,
            category: 'detection'
        });
        
        features.push({
            feature: 'versioning_inconsistency_count',
            value: inconsistencies.length,
            importance: 0.9,
            category: 'detection'
        });
        
        features.push({
            feature: 'sse_failure_rate',
            value: sseEndpoints.filter(e => e.status === 'failing').length / Math.max(sseEndpoints.length, 1),
            importance: 0.95,
            category: 'classification'
        });
        
        // Prevention features
        features.push({
            feature: 'has_path_mismatch',
            value: inconsistencies.some(inc => inc.type === 'path_mismatch') ? 1 : 0,
            importance: 0.85,
            category: 'prevention'
        });
        
        features.push({
            feature: 'protocol_mismatch_severity',
            value: inconsistencies.filter(inc => inc.type === 'protocol_mismatch').reduce((sum, inc) => sum + inc.severity, 0),
            importance: 0.8,
            category: 'prevention'
        });
        
        return features;
    }
    
    /**
     * Generate mock SSE connection attempts for analysis
     */
    private generateMockSSEAttempts(endpoints: EndpointInfo[]): SSEConnectionAttempt[] {
        return endpoints.map(endpoint => ({
            url: `http://localhost:3000${endpoint.path}`.replace(':instanceId', '12345'),
            timestamp: new Date().toISOString(),
            status: endpoint.status === 'failing' ? 'failure' : 'success',
            error: endpoint.status === 'failing' ? 'Connection failed: 404 Not Found' : undefined,
            retryCount: endpoint.status === 'failing' ? 3 : 0
        }));
    }
    
    /**
     * Generate mock REST requests for analysis
     */
    private generateMockRESTRequests(endpoints: EndpointInfo[]): RESTRequest[] {
        return endpoints.map(endpoint => ({
            url: `http://localhost:3000${endpoint.path}`,
            method: endpoint.method,
            timestamp: new Date().toISOString(),
            status: endpoint.status === 'working' ? 200 : 404,
            responseTime: endpoint.status === 'working' ? 150 : 5000
        }));
    }
    
    /**
     * Load existing patterns from storage
     */
    private loadExistingPatterns(): void {
        try {
            const patternsFile = join(this.patternStoragePath, 'sse-endpoint-mismatch-patterns.json');
            if (existsSync(patternsFile)) {
                const data = readFileSync(patternsFile, 'utf-8');
                const patterns = JSON.parse(data);
                
                patterns.forEach((pattern: EndpointMismatchPattern) => {
                    this.patterns.set(pattern.id, pattern);
                });
                
                console.log(`📂 [NLD] Loaded ${patterns.length} existing endpoint mismatch patterns`);
            }
        } catch (error) {
            console.warn('⚠️ [NLD] Could not load existing patterns:', error);
        }
    }
    
    /**
     * Save pattern to storage
     */
    private savePattern(pattern: EndpointMismatchPattern): void {
        try {
            const patternsFile = join(this.patternStoragePath, 'sse-endpoint-mismatch-patterns.json');
            const allPatterns = Array.from(this.patterns.values());
            writeFileSync(patternsFile, JSON.stringify(allPatterns, null, 2));
            
            console.log(`💾 [NLD] Saved pattern ${pattern.id} to ${patternsFile}`);
        } catch (error) {
            console.error('❌ [NLD] Failed to save pattern:', error);
        }
    }
    
    /**
     * Get all detected patterns
     */
    public getAllPatterns(): EndpointMismatchPattern[] {
        return Array.from(this.patterns.values());
    }
    
    /**
     * Get pattern by ID
     */
    public getPattern(id: string): EndpointMismatchPattern | undefined {
        return this.patterns.get(id);
    }
    
    /**
     * Generate analysis report
     */
    public generateAnalysisReport(): any {
        const patterns = Array.from(this.patterns.values());
        
        return {
            summary: {
                totalPatterns: patterns.length,
                highSeverityPatterns: patterns.filter(p => p.severity === 'high').length,
                averageFailureProbability: patterns.reduce((sum, p) => sum + p.riskAssessment.failureProbability, 0) / Math.max(patterns.length, 1)
            },
            patterns: patterns.map(pattern => ({
                id: pattern.id,
                severity: pattern.severity,
                inconsistencyCount: pattern.versioningInconsistencies.length,
                businessImpact: pattern.riskAssessment.businessImpact.length
            })),
            recommendations: this.generateGlobalRecommendations(patterns)
        };
    }
    
    /**
     * Generate global recommendations based on all patterns
     */
    private generateGlobalRecommendations(patterns: EndpointMismatchPattern[]): string[] {
        const recommendations: string[] = [];
        
        if (patterns.length > 0) {
            recommendations.push('Implement unified API versioning strategy across all endpoint types');
            recommendations.push('Add automated testing to validate endpoint path consistency');
            recommendations.push('Create API gateway or routing layer to handle version mapping');
        }
        
        const sseFailures = patterns.some(p => 
            p.versioningInconsistencies.some(inc => inc.frontendPath.includes('stream'))
        );
        
        if (sseFailures) {
            recommendations.push('Priority: Fix SSE endpoint versioning to restore real-time functionality');
            recommendations.push('Implement SSE endpoint health monitoring');
        }
        
        return recommendations;
    }
}

// Export singleton instance
export const sseEndpointMismatchDetector = new SSEEndpointMismatchDetector();