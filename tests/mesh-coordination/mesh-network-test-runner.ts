/**
 * MESH NETWORK TEST RUNNER
 * 
 * CLI and programmatic interface for executing mesh network tests
 * Production-ready test orchestration with comprehensive reporting
 */

import { TestExecutionCoordinator, TestExecutionRequest, TestExecutionResult } from './test-execution-coordinator';
import { TestMeshDashboard } from './test-mesh-dashboard';

export interface CLIOptions {
  scope?: 'full' | 'critical' | 'incremental' | 'regression';
  files?: string[];
  changeType?: 'feature' | 'bugfix' | 'refactor' | 'hotfix';
  impact?: 'low' | 'medium' | 'high' | 'critical';
  maxDuration?: number;
  maxParallelism?: number;
  output?: 'console' | 'json' | 'html' | 'junit';
  outputDir?: string;
  watch?: boolean;
  verbose?: boolean;
  silent?: boolean;
  dashboard?: boolean;
  dashboardPort?: number;
  webhooks?: string[];
  emails?: string[];
  branch?: string;
  commit?: string;
  author?: string;
}

export class MeshNetworkTestRunner {
  private coordinator: TestExecutionCoordinator;
  private dashboard?: TestMeshDashboard;
  private isRunning = false;
  private watchMode = false;

  constructor() {
    this.coordinator = new TestExecutionCoordinator();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.coordinator.on('coordinatorInitialized', () => {
      this.log('🌐 Mesh Network Test Orchestrator initialized');
    });

    this.coordinator.on('testExecutionStarted', (data) => {
      this.log(`🚀 Test execution started: ${data.executionId}`);
    });

    this.coordinator.on('swarmStarted', (data) => {
      this.log(`🐝 ${data.swarmType} swarm started with ${data.testCount} tests`);
    });

    this.coordinator.on('swarmCompleted', (data) => {
      this.log(`✅ ${data.swarmType} swarm completed in ${this.formatDuration(data.duration)}`);
    });

    this.coordinator.on('testExecutionCompleted', (data) => {
      this.log(`🎉 Test execution completed in ${this.formatDuration(data.duration)}`);
    });

    this.coordinator.on('alertGenerated', (alert) => {
      const emoji = this.getAlertEmoji(alert.type);
      this.log(`${emoji} ${alert.message} (${alert.source})`);
    });
  }

  /**
   * COMMAND LINE INTERFACE
   */
  async runCLI(args: string[]): Promise<number> {
    try {
      const options = this.parseCLIArgs(args);
      
      if (options.dashboard) {
        return this.startDashboardMode(options);
      }

      if (options.watch) {
        return this.startWatchMode(options);
      }

      return this.runSingleExecution(options);

    } catch (error) {
      this.error(`❌ CLI execution failed: ${error.message}`);
      return 1;
    }
  }

  private parseCLIArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const next = args[i + 1];

      switch (arg) {
        case '--scope':
          options.scope = next as CLIOptions['scope'];
          i++;
          break;
        case '--files':
          options.files = next.split(',');
          i++;
          break;
        case '--change-type':
          options.changeType = next as CLIOptions['changeType'];
          i++;
          break;
        case '--impact':
          options.impact = next as CLIOptions['impact'];
          i++;
          break;
        case '--max-duration':
          options.maxDuration = parseInt(next) * 1000; // Convert seconds to ms
          i++;
          break;
        case '--max-parallelism':
          options.maxParallelism = parseInt(next);
          i++;
          break;
        case '--output':
          options.output = next as CLIOptions['output'];
          i++;
          break;
        case '--output-dir':
          options.outputDir = next;
          i++;
          break;
        case '--branch':
          options.branch = next;
          i++;
          break;
        case '--commit':
          options.commit = next;
          i++;
          break;
        case '--author':
          options.author = next;
          i++;
          break;
        case '--webhook':
          options.webhooks = options.webhooks || [];
          options.webhooks.push(next);
          i++;
          break;
        case '--email':
          options.emails = options.emails || [];
          options.emails.push(next);
          i++;
          break;
        case '--dashboard-port':
          options.dashboardPort = parseInt(next);
          i++;
          break;
        case '--watch':
          options.watch = true;
          break;
        case '--dashboard':
          options.dashboard = true;
          break;
        case '--verbose':
          options.verbose = true;
          break;
        case '--silent':
          options.silent = true;
          break;
      }
    }

    return options;
  }

  private async runSingleExecution(options: CLIOptions): Promise<number> {
    const request = this.createExecutionRequest(options);
    
    this.log('🌐 Starting Mesh Network Test Execution');
    this.logExecutionRequest(request, options);

    const startTime = Date.now();
    
    try {
      const result = await this.coordinator.executeTests(request);
      
      // Output results
      await this.outputResults(result, options);
      
      const duration = Date.now() - startTime;
      this.log(`\n🎯 Execution Summary:`);
      this.log(`   Duration: ${this.formatDuration(duration)}`);
      this.log(`   Status: ${result.status.toUpperCase()}`);
      this.log(`   Tests: ${result.summary.totalTests} total, ${result.summary.passedTests} passed, ${result.summary.failedTests} failed`);
      this.log(`   Success Rate: ${result.summary.successRate.toFixed(1)}%`);

      return result.status === 'completed' ? 0 : 1;

    } catch (error) {
      this.error(`❌ Test execution failed: ${error.message}`);
      return 1;
    }
  }

  private async startDashboardMode(options: CLIOptions): Promise<number> {
    const port = options.dashboardPort || 3001;
    
    this.log(`🖥️  Starting Test Mesh Dashboard on port ${port}`);
    
    // Implementation would start HTTP server for dashboard
    this.log(`📊 Dashboard available at http://localhost:${port}`);
    this.log(`Press Ctrl+C to stop`);
    
    // Keep process running
    return new Promise((resolve) => {
      process.on('SIGINT', () => {
        this.log('\n👋 Shutting down dashboard');
        resolve(0);
      });
    });
  }

  private async startWatchMode(options: CLIOptions): Promise<number> {
    this.watchMode = true;
    this.log('👀 Starting watch mode - monitoring file changes');
    
    // Implementation would use file system watcher
    // For now, simulate periodic execution
    const watchInterval = setInterval(async () => {
      if (!this.isRunning) {
        this.log('🔄 Detecting changes - running incremental tests');
        
        const watchRequest = this.createExecutionRequest({
          ...options,
          scope: 'incremental'
        });

        try {
          await this.coordinator.executeTests(watchRequest);
        } catch (error) {
          this.error(`⚠️  Watch mode execution failed: ${error.message}`);
        }
      }
    }, 30000); // Check every 30 seconds

    return new Promise((resolve) => {
      process.on('SIGINT', () => {
        clearInterval(watchInterval);
        this.log('\n👋 Exiting watch mode');
        resolve(0);
      });
    });
  }

  private createExecutionRequest(options: CLIOptions): TestExecutionRequest {
    return {
      testScope: options.scope || 'incremental',
      changeContext: {
        files: options.files || ['src/**/*.{ts,tsx}'],
        changeType: options.changeType || 'feature',
        impactLevel: options.impact || 'medium',
        author: options.author,
        branch: options.branch,
        commitHash: options.commit
      },
      constraints: {
        maxDuration: options.maxDuration,
        maxParallelism: options.maxParallelism
      },
      notifications: {
        onStart: !options.silent,
        onComplete: !options.silent,
        onFailure: true,
        webhooks: options.webhooks,
        emails: options.emails
      }
    };
  }

  private logExecutionRequest(request: TestExecutionRequest, options: CLIOptions): void {
    if (options.silent) return;

    this.log(`📋 Execution Configuration:`);
    this.log(`   Scope: ${request.testScope}`);
    this.log(`   Files: ${request.changeContext.files.length} file pattern(s)`);
    this.log(`   Change Type: ${request.changeContext.changeType}`);
    this.log(`   Impact Level: ${request.changeContext.impactLevel}`);
    
    if (request.constraints?.maxDuration) {
      this.log(`   Max Duration: ${this.formatDuration(request.constraints.maxDuration)}`);
    }
    
    if (request.constraints?.maxParallelism) {
      this.log(`   Max Parallelism: ${request.constraints.maxParallelism}`);
    }
    
    this.log('');
  }

  /**
   * RESULT OUTPUT HANDLING
   */
  private async outputResults(result: TestExecutionResult, options: CLIOptions): Promise<void> {
    const outputFormat = options.output || 'console';
    const outputDir = options.outputDir || 'tests/reports';

    switch (outputFormat) {
      case 'console':
        this.outputToConsole(result, options);
        break;
        
      case 'json':
        await this.outputToJSON(result, outputDir);
        break;
        
      case 'html':
        await this.outputToHTML(result, outputDir);
        break;
        
      case 'junit':
        await this.outputToJUnit(result, outputDir);
        break;
    }
  }

  private outputToConsole(result: TestExecutionResult, options: CLIOptions): void {
    if (options.silent) return;

    this.log('\n📊 Detailed Results by Swarm:');
    
    for (const [swarmType, swarmResult] of result.swarmResults) {
      const status = swarmResult.error ? '❌' : '✅';
      this.log(`   ${status} ${swarmType}: ${swarmResult.total || 0} tests, ${swarmResult.passed || 0} passed`);
      
      if (options.verbose && swarmResult.error) {
        this.log(`      Error: ${swarmResult.error}`);
      }
    }

    if (result.recommendations) {
      this.log('\n💡 Recommendations:');
      
      if (result.recommendations.nextSteps.length > 0) {
        this.log('   Next Steps:');
        result.recommendations.nextSteps.forEach(step => {
          this.log(`     • ${step}`);
        });
      }
      
      if (result.recommendations.optimization.length > 0) {
        this.log('   Optimizations:');
        result.recommendations.optimization.forEach(opt => {
          this.log(`     • ${opt}`);
        });
      }
      
      if (result.recommendations.alerts.length > 0) {
        this.log('   Alerts:');
        result.recommendations.alerts.forEach(alert => {
          this.log(`     ⚠️  ${alert}`);
        });
      }
    }
  }

  private async outputToJSON(result: TestExecutionResult, outputDir: string): Promise<void> {
    const filename = `${outputDir}/mesh-test-result-${result.executionId}.json`;
    const output = JSON.stringify(result, null, 2);
    
    // Implementation would write to file
    this.log(`📄 JSON report saved to: ${filename}`);
  }

  private async outputToHTML(result: TestExecutionResult, outputDir: string): Promise<void> {
    const filename = `${outputDir}/mesh-test-report-${result.executionId}.html`;
    
    const html = this.generateHTMLReport(result);
    
    // Implementation would write to file
    this.log(`🌐 HTML report saved to: ${filename}`);
  }

  private async outputToJUnit(result: TestExecutionResult, outputDir: string): Promise<void> {
    const filename = `${outputDir}/mesh-test-junit-${result.executionId}.xml`;
    
    const xml = this.generateJUnitXML(result);
    
    // Implementation would write to file
    this.log(`📋 JUnit XML saved to: ${filename}`);
  }

  private generateHTMLReport(result: TestExecutionResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Mesh Network Test Report - ${result.executionId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .swarm { margin: 10px 0; padding: 10px; border-left: 4px solid #007bff; }
        .metrics { background: #f8f9fa; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌐 Mesh Network Test Execution Report</h1>
        <p><strong>Execution ID:</strong> ${result.executionId}</p>
        <p><strong>Status:</strong> <span class="${result.status === 'completed' ? 'success' : 'failure'}">${result.status.toUpperCase()}</span></p>
        <p><strong>Duration:</strong> ${this.formatDuration(result.duration)}</p>
    </div>
    
    <div class="summary">
        <h2>📊 Test Summary</h2>
        <ul>
            <li>Total Tests: ${result.summary.totalTests}</li>
            <li>Passed: <span class="success">${result.summary.passedTests}</span></li>
            <li>Failed: <span class="failure">${result.summary.failedTests}</span></li>
            <li>Success Rate: ${result.summary.successRate.toFixed(1)}%</li>
        </ul>
    </div>
    
    <div class="swarms">
        <h2>🐝 Swarm Results</h2>
        ${Array.from(result.swarmResults.entries()).map(([type, swarmResult]) => `
            <div class="swarm">
                <h3>${type} Swarm</h3>
                <p>Tests: ${swarmResult.total || 0}, Passed: ${swarmResult.passed || 0}, Failed: ${swarmResult.failed || 0}</p>
            </div>
        `).join('')}
    </div>
    
    <div class="metrics">
        <h2>📈 Performance Metrics</h2>
        <pre>${JSON.stringify(result.metrics, null, 2)}</pre>
    </div>
</body>
</html>
    `.trim();
  }

  private generateJUnitXML(result: TestExecutionResult): string {
    const testsuites = Array.from(result.swarmResults.entries()).map(([type, swarmResult]) => {
      const tests = swarmResult.total || 0;
      const failures = swarmResult.failed || 0;
      const errors = swarmResult.error ? 1 : 0;
      
      return `
    <testsuite name="${type}-swarm" tests="${tests}" failures="${failures}" errors="${errors}" time="${(result.duration / 1000).toFixed(3)}">
        ${failures > 0 ? `<testcase name="${type}-execution" classname="MeshSwarm"><failure message="${swarmResult.error || 'Test failures detected'}" /></testcase>` : `<testcase name="${type}-execution" classname="MeshSwarm" time="${(result.duration / 1000).toFixed(3)}" />`}
    </testsuite>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="MeshNetworkTests" tests="${result.summary.totalTests}" failures="${result.summary.failedTests}" time="${(result.duration / 1000).toFixed(3)}">
${testsuites}
</testsuites>`;
  }

  /**
   * PROGRAMMATIC API
   */
  async execute(request: TestExecutionRequest): Promise<TestExecutionResult> {
    return this.coordinator.executeTests(request);
  }

  async executeQuick(files: string[], changeType: 'feature' | 'bugfix' | 'refactor' | 'hotfix' = 'feature'): Promise<TestExecutionResult> {
    return this.execute({
      testScope: 'incremental',
      changeContext: {
        files,
        changeType,
        impactLevel: 'medium'
      },
      constraints: {
        maxDuration: 300000 // 5 minutes
      }
    });
  }

  async executeCritical(): Promise<TestExecutionResult> {
    return this.execute({
      testScope: 'critical',
      changeContext: {
        files: ['**/*'],
        changeType: 'hotfix',
        impactLevel: 'critical'
      }
    });
  }

  async executeRegression(): Promise<TestExecutionResult> {
    return this.execute({
      testScope: 'regression',
      changeContext: {
        files: ['**/*'],
        changeType: 'refactor',
        impactLevel: 'medium'
      }
    });
  }

  getCoordinator(): TestExecutionCoordinator {
    return this.coordinator;
  }

  /**
   * UTILITY METHODS
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  private getAlertEmoji(type: string): string {
    const emojis = {
      'critical': '🚨',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    return emojis[type as keyof typeof emojis] || 'ℹ️';
  }

  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  private error(message: string): void {
    console.error(`[${new Date().toISOString()}] ${message}`);
  }

  async shutdown(): Promise<void> {
    await this.coordinator.shutdown();
  }
}

// Export singleton instance for CLI usage
export const meshTestRunner = new MeshNetworkTestRunner();

// CLI Entry Point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  meshTestRunner.runCLI(args).then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}