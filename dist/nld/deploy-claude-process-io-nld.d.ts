/**
 * Deploy Claude Process I/O NLD System - Complete Deployment Script
 *
 * Automated deployment script for the Claude CLI process I/O failure detection
 * and prevention system across the entire application.
 */
import { claudeProcessIODeployment, ClaudeProcessIODeploymentResult } from './claude-process-io-deployment-demo';
import { claudeProcessIOIntegration } from './claude-process-io-integration-system';
export interface ClaudeProcessIODeploymentSummary {
    deploymentId: string;
    deploymentTime: number;
    success: boolean;
    componentsDeployed: {
        failureDetector: boolean;
        realTimeMonitor: boolean;
        neuralTrainingDataset: boolean;
        tddPreventionStrategies: boolean;
        integrationSystem: boolean;
    };
    validationResults: ClaudeProcessIODeploymentResult['validationResults'];
    systemReport: string;
    integrationInstructions: {
        backendIntegration: string[];
        frontendIntegration: string[];
        testingIntegration: string[];
        monitoringSetup: string[];
    };
    nextSteps: string[];
}
/**
 * Complete Claude Process I/O NLD System Deployment
 */
export declare function deployClaudeProcessIONLD(): Promise<ClaudeProcessIODeploymentSummary>;
/**
 * Quick validation of Claude Process I/O NLD deployment
 */
export declare function validateClaudeProcessIODeployment(): Promise<{
    isDeployed: boolean;
    componentsStatus: Record<string, boolean>;
    systemHealth: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
}>;
/**
 * Demonstration script for showing NLD capabilities
 */
export declare function demonstrateClaudeProcessIONLD(): Promise<void>;
export { claudeProcessIOIntegration, claudeProcessIODeployment };
//# sourceMappingURL=deploy-claude-process-io-nld.d.ts.map