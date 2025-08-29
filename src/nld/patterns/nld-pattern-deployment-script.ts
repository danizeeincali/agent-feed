/**
 * NLD Pattern Deployment Script
 * 
 * Orchestrates the deployment of SSE endpoint mismatch pattern detection,
 * neural training data export, and comprehensive pattern analysis storage.
 */

import { sseEndpointMismatchDetector } from './sse-endpoint-mismatch-pattern-detector';
import { neuralTrainingEndpointMismatchExporter } from './neural-training-endpoint-mismatch-export';
import { apiVersioningAntiPatternsDatabase } from './api-versioning-anti-patterns-database';

export class NLDPatternDeploymentOrchestrator {
    private projectPath: string;
    
    constructor(projectPath: string = '/workspaces/agent-feed') {
        this.projectPath = projectPath;
    }
    
    /**
     * Deploy complete NLD analysis for SSE endpoint mismatch patterns
     */
    public async deployCompleteAnalysis(): Promise<void> {
        console.log('🚀 [NLD] Starting complete pattern analysis deployment...');
        
        try {
            // Step 1: Detect endpoint mismatch patterns
            console.log('🔍 [NLD] Step 1: Pattern Detection');
            const detectedPatterns = await sseEndpointMismatchDetector.detectEndpointMismatches(this.projectPath);
            
            // Step 2: Export neural training data
            console.log('🧠 [NLD] Step 2: Neural Training Data Export');
            const trainingDataset = await neuralTrainingEndpointMismatchExporter.exportTrainingDataset();
            
            // Step 3: Update anti-patterns database
            console.log('📚 [NLD] Step 3: Anti-Patterns Database Update');
            await this.updateAntiPatternsDatabase(detectedPatterns);
            
            // Step 4: Generate comprehensive analysis report
            console.log('📊 [NLD] Step 4: Analysis Report Generation');
            const analysisReport = this.generateComprehensiveReport(detectedPatterns, trainingDataset);
            
            // Step 5: Export training dataset for claude-flow integration
            console.log('⚡ [NLD] Step 5: Claude-Flow Integration Export');
            await this.exportForClaudeFlowTraining(trainingDataset);
            
            console.log('✅ [NLD] Complete pattern analysis deployment finished successfully!');
            console.log('📋 [NLD] Summary:', analysisReport.summary);
            
        } catch (error) {
            console.error('❌ [NLD] Pattern analysis deployment failed:', error);
            throw error;
        }
    }
    
    /**
     * Update anti-patterns database with detected patterns
     */
    private async updateAntiPatternsDatabase(detectedPatterns: any[]): Promise<void> {
        for (const pattern of detectedPatterns) {
            // Record pattern occurrence
            apiVersioningAntiPatternsDatabase.recordOccurrence(
                'sse_rest_version_mismatch',
                {
                    project: 'claude-code-terminal',
                    context: 'SSE endpoint version mismatch detection',
                    detectionMethod: 'automated_static_analysis',
                    resolution: 'pattern_detected_awaiting_fix',
                    timeToResolve: 0
                }
            );
        }
    }
    
    /**
     * Generate comprehensive analysis report
     */
    private generateComprehensiveReport(detectedPatterns: any[], trainingDataset: any): any {
        const patternsReport = sseEndpointMismatchDetector.generateAnalysisReport();
        const databaseAnalytics = apiVersioningAntiPatternsDatabase.getAnalytics();
        const trainingExportSummary = neuralTrainingEndpointMismatchExporter.generateExportSummary(trainingDataset);
        
        return {
            summary: {
                deployment: {
                    timestamp: new Date().toISOString(),
                    patternsDetected: detectedPatterns.length,
                    trainingDatasetGenerated: true,
                    antiPatternsUpdated: true
                },
                detection: patternsReport,
                database: databaseAnalytics,
                neuralTraining: trainingExportSummary
            },
            
            recommendations: [
                ...patternsReport.recommendations,
                'Run neural training script to train pattern detection model',
                'Integrate detection rules into CI/CD pipeline',
                'Set up automated pattern monitoring'
            ],
            
            nextSteps: [
                'Execute neural training: npm run nld:train-patterns',
                'Deploy real-time monitoring: npm run nld:deploy-monitor',
                'Integrate TDD prevention strategies',
                'Schedule regular pattern analysis runs'
            ]
        };
    }
    
    /**
     * Export training dataset for claude-flow integration
     */
    private async exportForClaudeFlowTraining(trainingDataset: any): Promise<void> {
        // Create claude-flow training command
        const trainingCommand = `npx claude-flow@alpha neural train ${trainingDataset.metadata.datasetId}_claude_flow.json`;
        
        console.log('🎯 [NLD] Claude-Flow training command:');
        console.log(`   ${trainingCommand}`);
        
        // Export training script for easy execution
        const trainingScript = `#!/bin/bash
# Auto-generated NLD pattern training script
# Generated: ${new Date().toISOString()}

echo "🚀 Starting NLD pattern training for endpoint mismatch detection..."

# Train with claude-flow
${trainingCommand} \\
  --pattern-type "endpoint-mismatch" \\
  --model-output "/workspaces/agent-feed/src/nld/models/" \\
  --validation-split 0.2 \\
  --epochs 100 \\
  --early-stopping true

echo "✅ NLD pattern training completed!"
echo "📊 Model saved for integration with development workflow"
`;
        
        const fs = require('fs');
        const path = require('path');
        
        const scriptPath = path.join('/workspaces/agent-feed/src/nld/patterns', 'train-endpoint-mismatch-patterns.sh');
        fs.writeFileSync(scriptPath, trainingScript);
        fs.chmodSync(scriptPath, '755');
        
        console.log(`💾 [NLD] Training script saved: ${scriptPath}`);
    }
}

/**
 * Execute deployment if run directly
 */
if (require.main === module) {
    const orchestrator = new NLDPatternDeploymentOrchestrator();
    orchestrator.deployCompleteAnalysis()
        .then(() => {
            console.log('🎉 [NLD] Pattern deployment completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 [NLD] Pattern deployment failed:', error);
            process.exit(1);
        });
}

export { NLDPatternDeploymentOrchestrator };