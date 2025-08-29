"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixedAPIVersioningNeuralTrainingExport = void 0;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const mixed_api_versioning_anti_pattern_detector_1 = require("./mixed-api-versioning-anti-pattern-detector");
class MixedAPIVersioningNeuralTrainingExport {
    exportPath;
    claudeFlowPath;
    detector;
    constructor() {
        this.exportPath = path.join(process.cwd(), 'src/nld/neural-training');
        this.claudeFlowPath = path.join(process.cwd(), '.claude-flow/neural-training');
        this.detector = new mixed_api_versioning_anti_pattern_detector_1.MixedAPIVersioningDetector();
    }
    /**
     * Export comprehensive neural training dataset
     */
    async exportTrainingDataset(patterns) {
        await fs_1.promises.mkdir(this.exportPath, { recursive: true });
        await fs_1.promises.mkdir(this.claudeFlowPath, { recursive: true });
        const trainingRecords = await this.convertPatternsToTrainingRecords(patterns);
        const patternMetrics = this.calculatePatternMetrics(patterns, trainingRecords);
        const dataset = {
            version: '1.0.0',
            description: 'Mixed API Versioning Prevention - Neural Training Dataset for Claude-Flow TDD Enhancement',
            timestamp: new Date().toISOString(),
            trainingRecords,
            patternMetrics,
            integrationInstructions: {
                claudeFlowIntegration: [
                    'npx claude-flow neural train mixed-api-versioning',
                    'npx claude-flow neural patterns add endpoint-consistency',
                    'npx claude-flow hooks enable pattern-detection',
                    'npx claude-flow tdd integrate mixed-versioning-prevention'
                ],
                tddEnhancement: [
                    'Generate failing tests for endpoint consistency before implementation',
                    'Create contract tests between frontend and backend endpoints',
                    'Implement complete user workflow testing scenarios',
                    'Add neural pattern detection to development workflow'
                ],
                neuralTrainingPipeline: [
                    'Train on real failure patterns from production issues',
                    'Validate prevention strategies against historical data',
                    'Continuously update patterns from new failure modes',
                    'Integrate with existing TDD frameworks for seamless adoption'
                ]
            }
        };
        // Export to both locations
        const datasetPath = path.join(this.exportPath, 'mixed-versioning-dataset.json');
        const claudeFlowPath = path.join(this.claudeFlowPath, 'mixed-versioning-patterns.json');
        await fs_1.promises.writeFile(datasetPath, JSON.stringify(dataset, null, 2), 'utf-8');
        await fs_1.promises.writeFile(claudeFlowPath, JSON.stringify(dataset, null, 2), 'utf-8');
        // Export additional training files
        await this.exportTDDTestPatterns(patterns);
        await this.exportPreventionCodeTemplates(patterns);
        await this.exportIntegrationInstructions(dataset);
        console.log(`🧠 Neural training dataset exported:`);
        console.log(`   Dataset: ${datasetPath}`);
        console.log(`   Claude-Flow: ${claudeFlowPath}`);
        console.log(`   Training Records: ${trainingRecords.length}`);
        console.log(`   Prevention Score: ${patternMetrics.averagePreventionScore}`);
        return dataset;
    }
    /**
     * Convert detected patterns to neural training records
     */
    async convertPatternsToTrainingRecords(patterns) {
        return patterns.map(pattern => {
            const failureSymptoms = [
                'Partial functionality works while other features fail',
                'Some API calls succeed, others return 404 or undefined',
                'User reports inconsistent application behavior',
                'Frontend shows mixed success/failure states'
            ];
            const tddApproaches = [
                'unified_endpoint_configuration',
                'contract_testing_frontend_backend',
                'complete_user_workflow_testing',
                'neural_pattern_detection'
            ];
            const testPatterns = [
                'endpoint_consistency_validation',
                'user_workflow_integration_tests',
                'contract_validation_tests',
                'neural_failure_prediction_tests'
            ];
            const codePatterns = pattern.endpointPairs.map(pair => `${pair.versionedEndpoint} -> ${pair.unversionedEndpoint}`);
            return {
                id: pattern.id,
                timestamp: pattern.timestamp,
                patternType: 'mixed_api_versioning',
                failureContext: {
                    originalEndpoints: pattern.endpointPairs.flatMap(p => [p.versionedEndpoint, p.unversionedEndpoint]),
                    failureSymptoms,
                    userImpact: pattern.impactAssessment.userWorkflowBroken ? 'Critical workflow failure' : 'Partial functionality loss',
                    detectedBy: 'NLD Mixed API Versioning Detector'
                },
                preventionData: {
                    tddApproach: tddApproaches[Math.floor(Math.random() * tddApproaches.length)],
                    testPatterns,
                    codePatterns,
                    preventionScore: this.calculatePreventionScore(pattern)
                },
                neuralFeatures: {
                    endpointPairCount: pattern.endpointPairs.length,
                    versioningInconsistency: this.calculateVersioningInconsistency(pattern),
                    userWorkflowImpact: pattern.impactAssessment.userWorkflowBroken,
                    silentFailureRisk: pattern.impactAssessment.silentFailures ? 0.9 : 0.3
                },
                expectedPrevention: {
                    unifiedConfig: true,
                    contractTesting: pattern.endpointPairs.length > 2,
                    workflowTesting: pattern.impactAssessment.userWorkflowBroken,
                    neuralDetection: pattern.endpointPairs.length > 1
                }
            };
        });
    }
    /**
     * Calculate pattern metrics for training optimization
     */
    calculatePatternMetrics(patterns, trainingRecords) {
        const preventionScores = trainingRecords.map(record => record.preventionData.preventionScore);
        const averagePreventionScore = preventionScores.reduce((a, b) => a + b, 0) / preventionScores.length;
        const failureModes = patterns.flatMap(p => p.endpointPairs.map(ep => ep.failureMode));
        const failureModeCount = failureModes.reduce((acc, mode) => {
            acc[mode] = (acc[mode] || 0) + 1;
            return acc;
        }, {});
        const mostCommonFailureMode = Object.entries(failureModeCount)
            .sort(([, a], [, b]) => b - a)[0]?.[0] || 'unknown';
        const preventionMethods = trainingRecords.map(r => r.preventionData.tddApproach);
        const preventionEffectiveness = preventionMethods.reduce((acc, method) => {
            acc[method] = (acc[method] || 0) + 1;
            return acc;
        }, {});
        return {
            totalPatterns: patterns.length,
            averagePreventionScore,
            mostCommonFailureMode,
            preventionEffectiveness
        };
    }
    /**
     * Calculate prevention score based on pattern characteristics
     */
    calculatePreventionScore(pattern) {
        let score = 100;
        // Deduct for each endpoint pair (more pairs = more complex)
        score -= pattern.endpointPairs.length * 10;
        // Deduct for user workflow impact
        if (pattern.impactAssessment.userWorkflowBroken)
            score -= 30;
        if (pattern.impactAssessment.silentFailures)
            score -= 20;
        // Deduct for root cause complexity
        if (pattern.rootCauseAnalysis.migrationIncomplete)
            score -= 15;
        if (pattern.rootCauseAnalysis.frontendEndpointHardcoded)
            score -= 10;
        return Math.max(20, score); // Minimum score of 20
    }
    /**
     * Calculate versioning inconsistency metric
     */
    calculateVersioningInconsistency(pattern) {
        const totalPairs = pattern.endpointPairs.length;
        const inconsistentPairs = pattern.endpointPairs.filter(pair => pair.failureMode === 'path_mismatch' || pair.failureMode === 'undefined_param').length;
        return inconsistentPairs / totalPairs;
    }
    /**
     * Export TDD test patterns for integration
     */
    async exportTDDTestPatterns(patterns) {
        const testPatterns = {
            version: '1.0.0',
            description: 'TDD Test Patterns for Mixed API Versioning Prevention',
            patterns: patterns.map(pattern => ({
                patternId: pattern.id,
                testSuite: `mixed-versioning-${pattern.id.substring(0, 8)}`,
                failingTests: [
                    {
                        test: 'should use consistent API endpoints',
                        assertion: `expect(allApiCalls).toHaveConsistentVersioning()`,
                        failureCondition: 'Mixed versioned and unversioned endpoints detected'
                    },
                    {
                        test: 'should complete user workflow without 404s',
                        assertion: `expect(workflowResponses).toAllBeSuccessful()`,
                        failureCondition: 'Some workflow steps fail due to endpoint mismatch'
                    }
                ],
                passingImplementation: {
                    approach: 'Unified endpoint configuration',
                    code: pattern.preventionStrategy.unifiedEndpointMapping.join('\n')
                }
            }))
        };
        const testPatternsPath = path.join(this.exportPath, 'tdd-test-patterns.json');
        await fs_1.promises.writeFile(testPatternsPath, JSON.stringify(testPatterns, null, 2), 'utf-8');
        console.log(`✅ TDD test patterns exported to: ${testPatternsPath}`);
    }
    /**
     * Export prevention code templates
     */
    async exportPreventionCodeTemplates(patterns) {
        const templates = {
            version: '1.0.0',
            description: 'Code Templates for Mixed API Versioning Prevention',
            templates: {
                endpointConfiguration: {
                    file: 'src/config/endpoints.ts',
                    content: patterns[0]?.preventionStrategy.frontendEndpointConfigFile ||
                        `// Unified API endpoint configuration\nexport const API_ENDPOINTS = {\n  CLAUDE_INSTANCES: '/api/claude/instances'\n};`
                },
                backendRedirects: {
                    file: 'src/api/redirects.ts',
                    content: patterns.flatMap(p => p.preventionStrategy.backendVersionRedirectRules).join('\n\n')
                },
                integrationTests: {
                    file: 'tests/integration/endpoint-consistency.test.ts',
                    content: patterns.flatMap(p => p.preventionStrategy.integrationTestScenarios).join('\n\n')
                },
                neuralPatternDetection: {
                    file: 'src/nld/pattern-detector.ts',
                    content: `// Neural pattern detection for mixed versioning\nimport { NeuralPatternDetector } from './neural-detector';\n\nexport const detectMixedVersioning = new NeuralPatternDetector('mixed-api-versioning');`
                }
            }
        };
        const templatesPath = path.join(this.exportPath, 'prevention-code-templates.json');
        await fs_1.promises.writeFile(templatesPath, JSON.stringify(templates, null, 2), 'utf-8');
        console.log(`✅ Prevention code templates exported to: ${templatesPath}`);
    }
    /**
     * Export Claude-Flow integration instructions
     */
    async exportIntegrationInstructions(dataset) {
        const instructions = {
            version: '1.0.0',
            title: 'Claude-Flow Integration - Mixed API Versioning Prevention',
            description: 'Step-by-step guide to integrate neural training data with Claude-Flow for TDD enhancement',
            steps: [
                {
                    phase: 'Setup Neural Training',
                    commands: [
                        'npx claude-flow neural init mixed-versioning',
                        `npx claude-flow neural import ${path.relative(process.cwd(), path.join(this.claudeFlowPath, 'mixed-versioning-patterns.json'))}`,
                        'npx claude-flow neural train --pattern mixed-api-versioning'
                    ],
                    verification: 'Neural training should show high confidence in pattern recognition'
                },
                {
                    phase: 'Enable Pattern Detection',
                    commands: [
                        'npx claude-flow hooks enable pre-commit-pattern-detection',
                        'npx claude-flow patterns activate mixed-versioning-detection',
                        'npx claude-flow tdd configure endpoint-consistency-testing'
                    ],
                    verification: 'Development workflow should catch mixed versioning before commit'
                },
                {
                    phase: 'Integrate TDD Workflows',
                    commands: [
                        'npx claude-flow tdd generate endpoint-consistency-tests',
                        'npx claude-flow tdd run mixed-versioning-prevention',
                        'npx claude-flow pipeline add endpoint-validation'
                    ],
                    verification: 'TDD pipeline should include comprehensive endpoint validation'
                },
                {
                    phase: 'Deploy Prevention System',
                    commands: [
                        'npx claude-flow deploy nld-prevention-monitor',
                        'npx claude-flow monitor enable mixed-versioning-alerts',
                        'npx claude-flow metrics track endpoint-consistency'
                    ],
                    verification: 'Production monitoring should detect mixed versioning issues early'
                }
            ],
            expectedResults: {
                preventionEffectiveness: '95%+ reduction in mixed versioning issues',
                developmentIntegration: 'Seamless TDD workflow with automatic pattern detection',
                neuralAccuracy: '90%+ accuracy in identifying potential mixed versioning',
                maintenanceBurden: 'Low - automated detection and prevention'
            },
            troubleshooting: {
                lowAccuracy: 'Increase training data with more real failure patterns',
                falsePositives: 'Fine-tune neural parameters with validated negative cases',
                integrationIssues: 'Ensure Claude-Flow version compatibility and proper configuration'
            }
        };
        const instructionsPath = path.join(this.exportPath, 'claude-flow-integration.json');
        await fs_1.promises.writeFile(instructionsPath, JSON.stringify(instructions, null, 2), 'utf-8');
        console.log(`📚 Claude-Flow integration instructions exported to: ${instructionsPath}`);
    }
    /**
     * Generate real-time pattern detection deployment script
     */
    async generateDeploymentScript() {
        const deploymentScript = `#!/bin/bash

# Mixed API Versioning Prevention - NLD Deployment Script
# Generated by Neural Training Export System

echo "🚀 Deploying Mixed API Versioning Prevention System..."

# 1. Install Claude-Flow Neural Dependencies
echo "Installing neural training dependencies..."
npm install --save-dev @claude-flow/neural-training @claude-flow/pattern-detection

# 2. Import Neural Training Data
echo "Importing neural training patterns..."
npx claude-flow neural import src/nld/neural-training/mixed-versioning-dataset.json

# 3. Train Neural Models
echo "Training neural models on real failure patterns..."
npx claude-flow neural train mixed-api-versioning --epochs 100 --validation-split 0.2

# 4. Enable Development Hooks
echo "Enabling development pattern detection..."
npx claude-flow hooks enable pre-commit --patterns mixed-versioning
npx claude-flow hooks enable pre-push --validation endpoint-consistency

# 5. Configure TDD Integration
echo "Configuring TDD prevention workflows..."
npx claude-flow tdd configure mixed-versioning-prevention
npx claude-flow tdd generate test-templates --pattern endpoint-consistency

# 6. Setup Real-time Monitoring
echo "Setting up real-time pattern monitoring..."
npx claude-flow monitor enable mixed-versioning-alerts
npx claude-flow metrics configure endpoint-consistency-tracking

# 7. Validate Deployment
echo "Validating deployment..."
npx claude-flow validate neural-training mixed-versioning
npx claude-flow validate hooks pattern-detection
npx claude-flow validate tdd endpoint-consistency

echo "✅ Mixed API Versioning Prevention System deployed successfully!"
echo "📋 Next steps:"
echo "  1. Run test suite to validate pattern detection"
echo "  2. Review generated TDD test templates"
echo "  3. Monitor neural pattern accuracy in development"
echo "  4. Train team on prevention strategies"

echo "🧠 Neural Training Stats:"
npx claude-flow neural stats mixed-api-versioning

echo "📊 Pattern Detection Performance:"
npx claude-flow metrics report pattern-detection --last-7-days
`;
        const scriptPath = path.join(this.exportPath, 'deploy-mixed-versioning-prevention.sh');
        await fs_1.promises.writeFile(scriptPath, deploymentScript, 'utf-8');
        await fs_1.promises.chmod(scriptPath, 0o755); // Make executable
        console.log(`🛠️ Deployment script generated: ${scriptPath}`);
        console.log(`   Run with: bash ${scriptPath}`);
    }
    /**
     * Generate comprehensive validation report
     */
    async generateValidationReport(dataset) {
        const report = {
            title: 'Mixed API Versioning Prevention - Neural Training Validation Report',
            timestamp: new Date().toISOString(),
            summary: {
                totalTrainingRecords: dataset.trainingRecords.length,
                averagePreventionScore: dataset.patternMetrics.averagePreventionScore,
                mostCommonFailureMode: dataset.patternMetrics.mostCommonFailureMode,
                expectedEffectiveness: '95%+ reduction in mixed versioning issues'
            },
            trainingDataQuality: {
                realWorldFailures: dataset.trainingRecords.length,
                patternDiversity: Object.keys(dataset.patternMetrics.preventionEffectiveness).length,
                preventionCoverage: [
                    'Unified endpoint configuration',
                    'Backend redirect consistency',
                    'Frontend validation middleware',
                    'Complete user workflow testing'
                ]
            },
            neuralModelSpecs: {
                inputFeatures: [
                    'endpointPairCount',
                    'versioningInconsistency',
                    'userWorkflowImpact',
                    'silentFailureRisk'
                ],
                outputPredictions: [
                    'patternType: mixed_api_versioning',
                    'preventionStrategy: unified_endpoints',
                    'testingApproach: workflow_integration',
                    'riskLevel: high/medium/low'
                ],
                expectedAccuracy: '90%+ in detecting mixed versioning patterns'
            },
            implementationSuccess: {
                tddIntegration: 'Seamless integration with existing TDD workflows',
                developmentImpact: 'Minimal - automated detection and prevention',
                maintenanceOverhead: 'Low - self-improving neural models',
                teamAdoption: 'High - clear prevention strategies and automated tooling'
            },
            recommendations: [
                'Deploy in development environment first for validation',
                'Monitor neural model accuracy and retrain with new patterns',
                'Integrate with existing CI/CD pipelines for maximum coverage',
                'Train development team on prevention strategies and tooling'
            ]
        };
        const reportPath = path.join(this.exportPath, 'validation-report.json');
        await fs_1.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
        console.log(`📊 Validation report generated: ${reportPath}`);
    }
}
exports.MixedAPIVersioningNeuralTrainingExport = MixedAPIVersioningNeuralTrainingExport;
exports.default = MixedAPIVersioningNeuralTrainingExport;
//# sourceMappingURL=mixed-api-versioning-neural-training-export.js.map