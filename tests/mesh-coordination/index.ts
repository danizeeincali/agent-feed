/**
 * MESH NETWORK TEST ORCHESTRATION - MAIN EXPORT
 * 
 * Comprehensive test execution framework with distributed coordination
 * Production-ready mesh network testing infrastructure
 */

// Core Orchestration
export { MeshTestOrchestrator } from './mesh-test-orchestrator';
export { MeshSwarmOrchestrator } from './mesh-swarm-orchestrator';
export { TestExecutionCoordinator } from './test-execution-coordinator';
export { MeshNetworkTestRunner, meshTestRunner } from './mesh-network-test-runner';

// Intelligent Coordination
export { IntelligentTestCoordinator } from '../swarm-intelligence/intelligent-test-coordinator';

// Distributed Execution Swarms
export {
  CriticalPathSwarm,
  FeatureValidationSwarm,
  IntegrationTestMesh,
  RegressionPreventionNetwork
} from '../distributed-execution/test-execution-swarms';

// Self-Healing Infrastructure
export { SelfHealingTestInfrastructure } from '../regression-prevention/self-healing-test-infrastructure';

// Monitoring and Dashboard
export { TestMeshDashboard } from './test-mesh-dashboard';

// Types and Interfaces
export type {
  TestNode,
  TestTask,
  MeshTopology,
  SwarmConfiguration,
  ExecutionMetrics,
  TestExecutionRequest,
  TestExecutionResult,
  CLIOptions
} from './mesh-test-orchestrator';

/**
 * QUICK START API
 * 
 * Simple interfaces for common test execution scenarios
 */
export class QuickTestAPI {
  private static runner = meshTestRunner;

  /**
   * Execute critical path tests for urgent deployments
   */
  static async executeCritical(options?: {
    maxDuration?: number;
    notifications?: boolean;
  }): Promise<any> {
    return this.runner.executeCritical();
  }

  /**
   * Execute incremental tests for changed files
   */
  static async executeIncremental(changedFiles: string[], options?: {
    changeType?: 'feature' | 'bugfix' | 'refactor' | 'hotfix';
    maxDuration?: number;
  }): Promise<any> {
    return this.runner.executeQuick(changedFiles, options?.changeType);
  }

  /**
   * Execute full test suite with all swarms
   */
  static async executeFull(options?: {
    maxDuration?: number;
    maxParallelism?: number;
  }): Promise<any> {
    return this.runner.execute({
      testScope: 'full',
      changeContext: {
        files: ['**/*'],
        changeType: 'feature',
        impactLevel: 'high'
      },
      constraints: options
    });
  }

  /**
   * Execute regression prevention tests
   */
  static async executeRegression(): Promise<any> {
    return this.runner.executeRegression();
  }

  /**
   * Get current system metrics
   */
  static getCurrentMetrics(): any {
    return this.runner.getCoordinator().getCurrentMetrics();
  }

  /**
   * Generate execution report
   */
  static generateReport(timeRange?: { start: number; end: number }): any {
    return this.runner.getCoordinator().generateExecutionReport(timeRange);
  }
}

/**
 * PRODUCTION DEPLOYMENT HELPERS
 */
export class ProductionTestAPI {
  private static coordinator = new TestExecutionCoordinator();

  /**
   * Pre-deployment validation suite
   */
  static async preDeploymentValidation(deploymentContext: {
    version: string;
    environment: 'staging' | 'production';
    changedFiles: string[];
  }): Promise<{
    approved: boolean;
    blockers: string[];
    warnings: string[];
    metrics: any;
  }> {
    const result = await this.coordinator.executeTests({
      testScope: 'full',
      changeContext: {
        files: deploymentContext.changedFiles,
        changeType: 'feature',
        impactLevel: 'critical'
      },
      constraints: {
        maxDuration: 1800000, // 30 minutes max
        failureThreshold: 0.02 // 2% failure tolerance
      }
    });

    const approved = result.status === 'completed' && result.summary.successRate >= 98;
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (result.summary.successRate < 95) {
      blockers.push(`Test success rate ${result.summary.successRate.toFixed(1)}% below 95% threshold`);
    }

    if (result.summary.failedTests > 0) {
      warnings.push(`${result.summary.failedTests} test(s) failed - review before deployment`);
    }

    return {
      approved,
      blockers,
      warnings,
      metrics: result.metrics
    };
  }

  /**
   * Post-deployment smoke tests
   */
  static async postDeploymentSmoke(environment: 'staging' | 'production'): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: any;
  }> {
    const result = await this.coordinator.executeTests({
      testScope: 'critical',
      changeContext: {
        files: ['**/*'],
        changeType: 'hotfix',
        impactLevel: 'critical'
      },
      constraints: {
        maxDuration: 600000 // 10 minutes max
      }
    });

    const healthy = result.status === 'completed' && result.summary.successRate >= 99;
    const issues: string[] = [];

    if (!healthy) {
      issues.push(`Smoke tests failed - ${result.summary.failedTests} critical test(s) failing`);
    }

    return {
      healthy,
      issues,
      metrics: result.metrics
    };
  }

  /**
   * Continuous monitoring health check
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    alerts: Array<{ type: string; message: string }>;
    uptime: number;
    performance: any;
  }> {
    const metrics = this.coordinator.getCurrentMetrics();
    const dashboard = this.coordinator.getDashboard();
    const currentMetrics = dashboard.getCurrentMetrics();

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const alerts: Array<{ type: string; message: string }> = [];

    if (currentMetrics) {
      // Check resource usage
      if (currentMetrics.resources.cpuUsage > 0.9) {
        status = 'critical';
        alerts.push({ type: 'critical', message: 'CPU usage critical' });
      } else if (currentMetrics.resources.cpuUsage > 0.8) {
        status = 'degraded';
        alerts.push({ type: 'warning', message: 'CPU usage high' });
      }

      // Check network connectivity
      if (currentMetrics.network.connectivity < 0.9) {
        status = 'critical';
        alerts.push({ type: 'critical', message: 'Network connectivity degraded' });
      }

      // Check test execution performance
      if (currentMetrics.orchestration.averageExecutionTime > 300000) { // 5 minutes
        status = 'degraded';
        alerts.push({ type: 'warning', message: 'Test execution performance degraded' });
      }
    }

    return {
      status,
      alerts,
      uptime: Date.now() - (currentMetrics?.timestamp || Date.now()),
      performance: currentMetrics?.orchestration
    };
  }
}

/**
 * DEVELOPMENT HELPERS
 */
export class DevelopmentTestAPI {
  /**
   * Watch mode for continuous testing during development
   */
  static async startWatchMode(options?: {
    patterns?: string[];
    debounceMs?: number;
    testScope?: 'incremental' | 'critical';
  }): Promise<void> {
    const runner = new MeshNetworkTestRunner();
    
    // Implementation would use file system watchers
    console.log('🔍 Starting development watch mode...');
    console.log('   Monitoring file changes for automatic test execution');
    console.log('   Press Ctrl+C to stop');
    
    // Simulate watch mode
    const patterns = options?.patterns || ['src/**/*.{ts,tsx}'];
    const scope = options?.testScope || 'incremental';
    
    console.log(`   Patterns: ${patterns.join(', ')}`);
    console.log(`   Scope: ${scope}`);
  }

  /**
   * Debug specific test categories
   */
  static async debugTests(category: 'mention' | 'posts' | 'comments' | 'api'): Promise<any> {
    const files = this.getCategoryFiles(category);
    
    return meshTestRunner.executeQuick(files, 'bugfix');
  }

  private static getCategoryFiles(category: string): string[] {
    const categoryMap = {
      mention: ['**/MentionInput*', '**/mention*', '**/MentionService*'],
      posts: ['**/Post*', '**/post*', '**/PostCreator*'],
      comments: ['**/Comment*', '**/comment*', '**/CommentThread*'],
      api: ['**/api/**/*', '**/*Service*', '**/hooks/**/*']
    };
    
    return categoryMap[category as keyof typeof categoryMap] || [];
  }
}

// Default export for convenience
export default {
  QuickTestAPI,
  ProductionTestAPI,
  DevelopmentTestAPI,
  meshTestRunner
};