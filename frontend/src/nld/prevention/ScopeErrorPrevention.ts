/**
 * NLD Scope Error Prevention System
 * Proactive prevention strategies for JavaScript/TypeScript scope violations
 */

import { ScopeViolationDetector, ScopeViolationEvent } from '../detection/ScopeViolationDetector';
import { ScopeErrorAnalysis } from '../patterns/VariableScopeErrorPatterns';

export interface PreventionStrategy {
  id: string;
  name: string;
  description: string;
  trigger: 'on_save' | 'on_type' | 'on_build' | 'on_commit' | 'real_time';
  action: 'warn' | 'fix' | 'suggest' | 'block' | 'log';
  effectiveness: number; // 0-1 scale
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface PreventionRule {
  pattern: string;
  message: string;
  autoFix?: (code: string) => string;
  severity: 'error' | 'warning' | 'suggestion';
  tags: string[];
}

export class ScopeErrorPrevention {
  private detector: ScopeViolationDetector;
  private strategies: Map<string, PreventionStrategy> = new Map();
  private rules: PreventionRule[] = [];
  private preventionHistory: Map<string, number> = new Map();

  constructor() {
    this.detector = new ScopeViolationDetector();
    this.initializeStrategies();
    this.initializeRules();
    this.setupPreventionCallbacks();
  }

  /**
   * Initialize prevention strategies
   */
  private initializeStrategies(): void {
    const strategies: PreventionStrategy[] = [
      {
        id: 'real-time-typing-check',
        name: 'Real-time Typing Check',
        description: 'Check for scope violations as user types',
        trigger: 'on_type',
        action: 'warn',
        effectiveness: 0.9,
        implementationComplexity: 'high'
      },
      {
        id: 'save-time-validation',
        name: 'Save Time Validation',
        description: 'Validate scope on file save',
        trigger: 'on_save',
        action: 'fix',
        effectiveness: 0.8,
        implementationComplexity: 'medium'
      },
      {
        id: 'pre-commit-hook',
        name: 'Pre-commit Hook',
        description: 'Block commits with scope violations',
        trigger: 'on_commit',
        action: 'block',
        effectiveness: 0.95,
        implementationComplexity: 'low'
      },
      {
        id: 'build-time-analysis',
        name: 'Build Time Analysis',
        description: 'Comprehensive scope analysis during build',
        trigger: 'on_build',
        action: 'warn',
        effectiveness: 0.85,
        implementationComplexity: 'medium'
      },
      {
        id: 'intelligent-autocomplete',
        name: 'Intelligent Autocomplete',
        description: 'Suggest correct variable declarations',
        trigger: 'real_time',
        action: 'suggest',
        effectiveness: 0.7,
        implementationComplexity: 'high'
      }
    ];

    strategies.forEach(strategy => {
      this.strategies.set(strategy.id, strategy);
    });
  }

  /**
   * Initialize prevention rules
   */
  private initializeRules(): void {
    this.rules = [
      {
        pattern: 'isLoading-without-useState',
        message: 'Add useState hook for isLoading state management',
        autoFix: (code: string) => {
          // Add useState import if missing
          if (!code.includes('useState')) {
            code = code.replace(
              /import React/,
              "import React, { useState }"
            );
          }

          // Add useState declaration
          const componentMatch = code.match(/(?:function|const)\s+\w+.*{/);
          if (componentMatch) {
            const insertIndex = code.indexOf('{', componentMatch.index!) + 1;
            code = code.slice(0, insertIndex) +
                   '\n  const [isLoading, setIsLoading] = useState(false);' +
                   code.slice(insertIndex);
          }

          return code;
        },
        severity: 'error',
        tags: ['react', 'hooks', 'useState', 'loading']
      },
      {
        pattern: 'variable-before-declaration',
        message: 'Move variable declaration before usage',
        severity: 'error',
        tags: ['temporal-dead-zone', 'hoisting']
      },
      {
        pattern: 'missing-react-import',
        message: 'Add React import for JSX usage',
        autoFix: (code: string) => {
          if (!code.includes('import React') && code.includes('<')) {
            return "import React from 'react';\n" + code;
          }
          return code;
        },
        severity: 'error',
        tags: ['react', 'imports']
      },
      {
        pattern: 'destructuring-undefined',
        message: 'Add default values or null checks for destructuring',
        autoFix: (code: string) => {
          return code.replace(
            /const\s*{\s*([^}]+)\s*}\s*=\s*([^;]+);/g,
            'const { $1 } = $2 || {};'
          );
        },
        severity: 'warning',
        tags: ['destructuring', 'safety']
      }
    ];
  }

  /**
   * Setup prevention callbacks
   */
  private setupPreventionCallbacks(): void {
    // React to scope violations and apply prevention
    this.detector.onViolationDetected('*', (event: ScopeViolationEvent) => {
      this.applyPreventionStrategies(event);
    });
  }

  /**
   * Apply prevention strategies to a violation event
   */
  private applyPreventionStrategies(event: ScopeViolationEvent): void {
    event.errors.forEach(error => {
      const applicableRules = this.rules.filter(rule =>
        error.errorType.includes(rule.pattern.split('-')[0])
      );

      applicableRules.forEach(rule => {
        this.executePreventionRule(rule, error, event);
      });
    });
  }

  /**
   * Execute a prevention rule
   */
  private executePreventionRule(
    rule: PreventionRule,
    error: ScopeErrorAnalysis,
    event: ScopeViolationEvent
  ): void {
    console.log(`🛡️ Applying prevention rule: ${rule.pattern} for ${error.variableName}`);

    // Track prevention usage
    const key = `${rule.pattern}-${error.errorType}`;
    this.preventionHistory.set(key, (this.preventionHistory.get(key) || 0) + 1);

    // Generate prevention actions based on rule
    switch (rule.severity) {
      case 'error':
        this.createErrorPrevention(rule, error, event);
        break;
      case 'warning':
        this.createWarningPrevention(rule, error, event);
        break;
      case 'suggestion':
        this.createSuggestionPrevention(rule, error, event);
        break;
    }
  }

  /**
   * Create error-level prevention
   */
  private createErrorPrevention(
    rule: PreventionRule,
    error: ScopeErrorAnalysis,
    event: ScopeViolationEvent
  ): void {
    const prevention = {
      type: 'error',
      file: event.filename,
      line: error.line,
      message: rule.message,
      fix: rule.autoFix ? 'available' : 'manual',
      timestamp: Date.now()
    };

    // In development environment, show prominent error
    if (typeof window !== 'undefined') {
      this.showDevelopmentError(prevention);
    }

    // Log for CI/CD systems
    console.error(`🚨 SCOPE ERROR: ${rule.message} at ${event.filename}:${error.line}`);
  }

  /**
   * Create warning-level prevention
   */
  private createWarningPrevention(
    rule: PreventionRule,
    error: ScopeErrorAnalysis,
    event: ScopeViolationEvent
  ): void {
    console.warn(`⚠️ SCOPE WARNING: ${rule.message} at ${event.filename}:${error.line}`);

    // Show inline suggestion in IDE
    this.suggestInlinePreventionFix(rule, error, event);
  }

  /**
   * Create suggestion-level prevention
   */
  private createSuggestionPrevention(
    rule: PreventionRule,
    error: ScopeErrorAnalysis,
    event: ScopeViolationEvent
  ): void {
    console.info(`💡 SCOPE SUGGESTION: ${rule.message} at ${event.filename}:${error.line}`);
  }

  /**
   * Show development-time error modal
   */
  private showDevelopmentError(prevention: any): void {
    // Create overlay for development environment
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      padding: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    `;

    overlay.innerHTML = `
      <div style="background: #1e1e1e; padding: 30px; border-radius: 8px; max-width: 600px;">
        <h2 style="color: #ff6b6b; margin-bottom: 20px;">🚨 Scope Error Detected</h2>
        <p><strong>File:</strong> ${prevention.file}</p>
        <p><strong>Line:</strong> ${prevention.line}</p>
        <p><strong>Message:</strong> ${prevention.message}</p>
        <p style="margin-top: 20px;">
          <button onclick="this.parentElement.parentElement.parentElement.remove()"
                  style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            Fix and Continue
          </button>
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 10000);
  }

  /**
   * Suggest inline fix in IDE
   */
  private suggestInlinePreventionFix(
    rule: PreventionRule,
    error: ScopeErrorAnalysis,
    event: ScopeViolationEvent
  ): void {
    // Generate quick fix suggestion for IDE
    const quickFix = {
      title: `Fix: ${rule.message}`,
      kind: 'quickfix',
      edit: {
        changes: {
          [event.filename]: [{
            range: {
              start: { line: error.line - 1, character: error.column },
              end: { line: error.line - 1, character: error.column + error.variableName.length }
            },
            newText: error.suggestedFix
          }]
        }
      }
    };

    console.log('💡 IDE Quick Fix:', quickFix);
  }

  /**
   * Generate prevention templates for common patterns
   */
  generatePreventionTemplates(): Array<{
    name: string;
    description: string;
    template: string;
    usage: string;
  }> {
    return [
      {
        name: 'useState Loading Pattern',
        description: 'Safe loading state management with React hooks',
        template: `
import React, { useState, useEffect } from 'react';

function ComponentWithLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.getData();
        setData(response);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{/* Render data */}</div>;
}`,
        usage: 'Use for any component that needs loading state management'
      },
      {
        name: 'Safe Destructuring',
        description: 'Destructuring with default values to prevent undefined errors',
        template: `
// ✅ Safe destructuring with defaults
const { isLoading = false, data = null, error = null } = response || {};

// ✅ Safe nested destructuring
const {
  user: {
    name = 'Unknown',
    email = ''
  } = {}
} = userData || {};

// ✅ Safe array destructuring
const [first = null, second = null] = items || [];`,
        usage: 'Use when destructuring potentially undefined objects or arrays'
      },
      {
        name: 'Variable Declaration Pattern',
        description: 'Proper variable declaration order and scope management',
        template: `
function safeComponent() {
  // ✅ Declare all variables at the top
  const [state, setState] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Computed values after state declarations
  const computedValue = useMemo(() => {
    return state ? processState(state) : null;
  }, [state]);

  // ✅ Effects after all declarations
  useEffect(() => {
    if (!isLoading && state) {
      // Safe to use all declared variables
    }
  }, [state, isLoading]);

  return <div>{computedValue}</div>;
}`,
        usage: 'Follow this pattern for all React components'
      }
    ];
  }

  /**
   * Get prevention effectiveness report
   */
  getPreventionReport(): {
    strategiesActive: number;
    rulesActive: number;
    preventionHistory: Array<{
      pattern: string;
      count: number;
      effectiveness: number;
    }>;
    recommendations: string[];
  } {
    const preventionCounts = Array.from(this.preventionHistory.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        effectiveness: this.calculatePreventionEffectiveness(pattern)
      }))
      .sort((a, b) => b.count - a.count);

    const recommendations = this.generatePreventionRecommendations(preventionCounts);

    return {
      strategiesActive: this.strategies.size,
      rulesActive: this.rules.length,
      preventionHistory: preventionCounts,
      recommendations
    };
  }

  /**
   * Calculate prevention effectiveness for a pattern
   */
  private calculatePreventionEffectiveness(pattern: string): number {
    // Mock calculation - would use real metrics in production
    const baseEffectiveness = 0.7;
    const usageBonus = Math.min((this.preventionHistory.get(pattern) || 0) * 0.05, 0.25);
    return Math.min(baseEffectiveness + usageBonus, 1.0);
  }

  /**
   * Generate prevention recommendations
   */
  private generatePreventionRecommendations(
    preventionCounts: Array<{pattern: string; count: number; effectiveness: number}>
  ): string[] {
    const recommendations = [];

    if (preventionCounts.some(p => p.pattern.includes('isLoading') && p.count > 5)) {
      recommendations.push('Consider creating a custom useLoading hook to standardize loading state management');
    }

    if (preventionCounts.some(p => p.pattern.includes('destructuring') && p.count > 3)) {
      recommendations.push('Add TypeScript strict mode to catch destructuring errors at compile time');
    }

    if (preventionCounts.length > 10) {
      recommendations.push('Consider implementing real-time scope validation in your development environment');
    }

    recommendations.push('Set up pre-commit hooks to prevent scope violations from being committed');
    recommendations.push('Enable ESLint rules for scope-related issues');

    return recommendations;
  }
}

// Export singleton for global use
export const scopeErrorPrevention = new ScopeErrorPrevention();

export default ScopeErrorPrevention;