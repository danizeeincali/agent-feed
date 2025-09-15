/**
 * NLD Scope Error Integration System
 * Integrates scope error detection with development tools and CI/CD
 */

import { ScopeViolationDetector, ScopeViolationEvent } from '../detection/ScopeViolationDetector';
import { ScopeErrorAnalysis } from '../patterns/VariableScopeErrorPatterns';

export interface IntegrationConfig {
  vscode: {
    enabled: boolean;
    showInlineErrors: boolean;
    diagnosticsLevel: 'error' | 'warning' | 'info';
  };
  eslint: {
    enabled: boolean;
    createCustomRules: boolean;
    rulePrefix: string;
  };
  webpack: {
    enabled: boolean;
    failOnCritical: boolean;
    reportPath: string;
  };
  cicd: {
    enabled: boolean;
    exitOnFailure: boolean;
    reportFormat: 'json' | 'junit' | 'github';
  };
  notifications: {
    desktop: boolean;
    slack: boolean;
    webhookUrl?: string;
  };
}

export class ScopeErrorIntegration {
  private detector: ScopeViolationDetector;
  private config: IntegrationConfig;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.detector = new ScopeViolationDetector();
    this.config = {
      vscode: {
        enabled: true,
        showInlineErrors: true,
        diagnosticsLevel: 'error'
      },
      eslint: {
        enabled: true,
        createCustomRules: true,
        rulePrefix: 'nld-scope'
      },
      webpack: {
        enabled: true,
        failOnCritical: true,
        reportPath: './scope-errors-report.json'
      },
      cicd: {
        enabled: true,
        exitOnFailure: true,
        reportFormat: 'github'
      },
      notifications: {
        desktop: true,
        slack: false
      },
      ...config
    };

    this.setupIntegrations();
  }

  /**
   * Setup all enabled integrations
   */
  private setupIntegrations(): void {
    if (this.config.vscode.enabled) {
      this.setupVSCodeIntegration();
    }

    if (this.config.eslint.enabled) {
      this.setupESLintIntegration();
    }

    if (this.config.webpack.enabled) {
      this.setupWebpackIntegration();
    }

    if (this.config.cicd.enabled) {
      this.setupCICDIntegration();
    }

    if (this.config.notifications.desktop || this.config.notifications.slack) {
      this.setupNotifications();
    }
  }

  /**
   * VS Code Language Server Protocol integration
   */
  private setupVSCodeIntegration(): void {
    this.detector.onViolationDetected('*', (event: ScopeViolationEvent) => {
      const diagnostics = event.errors.map(error => ({
        range: {
          start: { line: error.line - 1, character: error.column },
          end: { line: error.line - 1, character: error.column + error.variableName.length }
        },
        severity: this.getDiagnosticSeverity(error.errorType),
        code: error.errorType,
        source: 'nld-scope-detector',
        message: `Scope violation: ${error.variableName} - ${error.suggestedFix}`,
        relatedInformation: [{
          location: {
            uri: event.filename,
            range: {
              start: { line: error.line - 1, character: 0 },
              end: { line: error.line - 1, character: 100 }
            }
          },
          message: `Context: ${error.scopeContext.slice(0, 100)}...`
        }]
      }));

      // Send diagnostics to VS Code (would use LSP in real implementation)
      this.sendVSCodeDiagnostics(event.filename, diagnostics);
    });
  }

  /**
   * ESLint custom rules integration
   */
  private setupESLintIntegration(): void {
    const customRules = this.generateESLintRules();

    // Generate ESLint config
    const eslintConfig = {
      plugins: ['@nld/scope-detector'],
      rules: Object.keys(customRules).reduce((acc, ruleName) => {
        acc[`@nld/scope-detector/${ruleName}`] = 'error';
        return acc;
      }, {} as Record<string, string>)
    };

    console.log('🔧 Generated ESLint configuration:', eslintConfig);
  }

  /**
   * Webpack plugin integration
   */
  private setupWebpackIntegration(): void {
    // This would be a webpack plugin in real implementation
    console.log('📦 Setting up Webpack scope error plugin...');

    const webpackPlugin = {
      apply: (compiler: any) => {
        compiler.hooks.emit.tapAsync('NLDScopeDetector', (compilation: any, callback: any) => {
          const assets = compilation.assets;
          const errors: ScopeViolationEvent[] = [];

          // Analyze all JavaScript assets
          Object.keys(assets).forEach(filename => {
            if (/\.(js|jsx|ts|tsx)$/.test(filename)) {
              const source = assets[filename].source();
              const violation = this.detector.analyzeFile(filename, source);
              if (violation) {
                errors.push(violation);
              }
            }
          });

          // Generate report
          const report = {
            timestamp: new Date().toISOString(),
            totalErrors: errors.length,
            criticalErrors: errors.filter(e => e.severity === 'critical').length,
            errors: errors.map(e => ({
              file: e.filename,
              severity: e.severity,
              count: e.errors.length,
              patterns: e.errors.map(err => err.errorType)
            }))
          };

          // Write report to file
          compilation.assets[this.config.webpack.reportPath] = {
            source: () => JSON.stringify(report, null, 2),
            size: () => JSON.stringify(report, null, 2).length
          };

          // Fail build if critical errors and failOnCritical is enabled
          if (this.config.webpack.failOnCritical && report.criticalErrors > 0) {
            compilation.errors.push(
              new Error(`NLD Scope Detector: ${report.criticalErrors} critical scope violations found`)
            );
          }

          callback();
        });
      }
    };
  }

  /**
   * CI/CD integration
   */
  private setupCICDIntegration(): void {
    console.log('🚀 Setting up CI/CD scope error integration...');

    // GitHub Actions integration
    if (this.config.cicd.reportFormat === 'github') {
      this.detector.onViolationDetected('*', (event: ScopeViolationEvent) => {
        event.errors.forEach(error => {
          const annotation = `::error file=${event.filename},line=${error.line},col=${error.column}::${error.errorType}: ${error.suggestedFix}`;
          console.log(annotation);
        });
      });
    }
  }

  /**
   * Desktop and Slack notifications
   */
  private setupNotifications(): void {
    this.detector.onViolationDetected('*', (event: ScopeViolationEvent) => {
      if (event.severity === 'critical' || event.severity === 'high') {
        if (this.config.notifications.desktop) {
          this.sendDesktopNotification(event);
        }

        if (this.config.notifications.slack && this.config.notifications.webhookUrl) {
          this.sendSlackNotification(event);
        }
      }
    });
  }

  /**
   * Generate ESLint custom rules based on scope patterns
   */
  private generateESLintRules(): Record<string, any> {
    return {
      'no-undefined-isloading': {
        meta: {
          type: 'problem',
          docs: {
            description: 'Prevent use of isLoading without useState declaration',
            category: 'Possible Errors'
          },
          schema: []
        },
        create: (context: any) => ({
          Identifier: (node: any) => {
            if (node.name === 'isLoading') {
              const scope = context.getScope();
              const variable = scope.set.get('isLoading');

              if (!variable) {
                context.report({
                  node,
                  message: 'isLoading is used but not declared. Add useState hook.'
                });
              }
            }
          }
        })
      },

      'useState-naming-convention': {
        meta: {
          type: 'suggestion',
          docs: {
            description: 'Enforce consistent useState naming patterns',
            category: 'Best Practices'
          }
        },
        create: (context: any) => ({
          VariableDeclarator: (node: any) => {
            if (node.init &&
                node.init.type === 'CallExpression' &&
                node.init.callee.name === 'useState') {

              if (node.id.type === 'ArrayPattern') {
                const [state, setter] = node.id.elements;
                if (state && setter) {
                  const stateName = state.name;
                  const setterName = setter.name;
                  const expectedSetter = `set${stateName.charAt(0).toUpperCase()}${stateName.slice(1)}`;

                  if (setterName !== expectedSetter) {
                    context.report({
                      node: setter,
                      message: `useState setter should be named ${expectedSetter}`
                    });
                  }
                }
              }
            }
          }
        })
      }
    };
  }

  /**
   * Helper methods
   */
  private getDiagnosticSeverity(errorType: string): number {
    // LSP DiagnosticSeverity: Error = 1, Warning = 2, Information = 3, Hint = 4
    if (errorType.includes('critical')) return 1;
    if (errorType.includes('useState')) return 1;
    return 2;
  }

  private sendVSCodeDiagnostics(filename: string, diagnostics: any[]): void {
    // In real implementation, this would use Language Server Protocol
    console.log(`📝 VS Code diagnostics for ${filename}:`, diagnostics);
  }

  private sendDesktopNotification(event: ScopeViolationEvent): void {
    const title = `Scope Error Detected`;
    const message = `${event.errors.length} scope violations in ${event.filename}`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '🚨'
      });
    }
  }

  private sendSlackNotification(event: ScopeViolationEvent): void {
    const message = {
      text: `🚨 Scope Error Alert`,
      attachments: [{
        color: event.severity === 'critical' ? 'danger' : 'warning',
        fields: [
          { title: 'File', value: event.filename, short: true },
          { title: 'Severity', value: event.severity, short: true },
          { title: 'Errors', value: event.errors.length.toString(), short: true },
          { title: 'Auto-fixed', value: event.autoFixApplied ? 'Yes' : 'No', short: true }
        ]
      }]
    };

    // Send to Slack webhook (would use actual HTTP request)
    console.log('📨 Slack notification:', message);
  }

  /**
   * Manual analysis trigger for CI/CD
   */
  analyzeProject(projectPath: string): {
    success: boolean;
    report: any;
    exitCode: number;
  } {
    console.log(`🔍 Analyzing project at ${projectPath}...`);

    const stats = this.detector.getStatistics();
    const report = this.detector.generatePreventionReport();

    const success = stats.severityBreakdown.critical === 0 ||
                   !this.config.cicd.exitOnFailure;

    const exitCode = success ? 0 : 1;

    return {
      success,
      report: {
        ...stats,
        ...report,
        config: this.config
      },
      exitCode
    };
  }
}

// Export singleton for global use
export const scopeErrorIntegration = new ScopeErrorIntegration();

export default ScopeErrorIntegration;