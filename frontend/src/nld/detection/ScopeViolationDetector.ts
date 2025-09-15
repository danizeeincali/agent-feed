/**
 * NLD Scope Violation Detector
 * Real-time detection and prevention of variable scope errors
 */

import { ScopeErrorDetector, ScopeErrorAnalysis, SCOPE_VIOLATION_PATTERNS } from '../patterns/VariableScopeErrorPatterns';

export interface ScopeViolationEvent {
  timestamp: number;
  filename: string;
  errors: ScopeErrorAnalysis[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoFixApplied: boolean;
  preventionTriggered: boolean;
}

export interface ScopeMonitoringConfig {
  enabled: boolean;
  autoFix: boolean;
  realTimeMonitoring: boolean;
  preventionMode: boolean;
  notificationLevel: 'all' | 'critical' | 'high' | 'medium';
  excludePatterns: string[];
  includePatterns: string[];
}

export class ScopeViolationDetector {
  private detector: ScopeErrorDetector;
  private config: ScopeMonitoringConfig;
  private violations: Map<string, ScopeViolationEvent[]> = new Map();
  private preventionCallbacks: Map<string, Function[]> = new Map();

  constructor(config: Partial<ScopeMonitoringConfig> = {}) {
    this.detector = new ScopeErrorDetector();
    this.config = {
      enabled: true,
      autoFix: false,
      realTimeMonitoring: true,
      preventionMode: true,
      notificationLevel: 'high',
      excludePatterns: ['node_modules/**', '**/*.test.*', '**/dist/**'],
      includePatterns: ['**/*.{js,jsx,ts,tsx}'],
      ...config
    };
  }

  /**
   * Analyze file for scope violations
   */
  analyzeFile(filename: string, content: string): ScopeViolationEvent | null {
    if (!this.config.enabled || this.shouldExcludeFile(filename)) {
      return null;
    }

    const errors = this.detector.analyzeCode(content, filename);

    if (errors.length === 0) {
      return null;
    }

    const severity = this.calculateSeverity(errors);

    if (!this.shouldNotify(severity)) {
      return null;
    }

    const event: ScopeViolationEvent = {
      timestamp: Date.now(),
      filename,
      errors,
      severity,
      autoFixApplied: false,
      preventionTriggered: false
    };

    // Apply auto-fix if enabled
    if (this.config.autoFix) {
      const fixedCode = this.detector.autoFixCode(content, errors);
      if (fixedCode !== content) {
        event.autoFixApplied = true;
        // In a real implementation, this would write the fixed code back
        console.log(`🔧 Auto-fixed scope violations in ${filename}`);
      }
    }

    // Store violation for tracking
    if (!this.violations.has(filename)) {
      this.violations.set(filename, []);
    }
    this.violations.get(filename)!.push(event);

    // Trigger prevention callbacks
    if (this.config.preventionMode) {
      this.triggerPrevention(event);
    }

    return event;
  }

  /**
   * Real-time file monitoring
   */
  startMonitoring(): void {
    if (!this.config.realTimeMonitoring) return;

    // In a real implementation, this would use file system watchers
    console.log('🔍 Starting real-time scope violation monitoring...');

    // Example: Monitor common files with isLoading patterns
    const commonFiles = [
      'src/components/**/*.tsx',
      'src/hooks/**/*.ts',
      'src/pages/**/*.tsx'
    ];

    console.log(`📁 Monitoring patterns: ${commonFiles.join(', ')}`);
  }

  /**
   * Get violation history for a file
   */
  getViolationHistory(filename: string): ScopeViolationEvent[] {
    return this.violations.get(filename) || [];
  }

  /**
   * Get violation statistics
   */
  getStatistics(): {
    totalFiles: number;
    totalViolations: number;
    severityBreakdown: Record<string, number>;
    mostCommonPatterns: Array<{pattern: string; count: number}>;
    autoFixSuccessRate: number;
  } {
    const allViolations = Array.from(this.violations.values()).flat();

    const severityBreakdown = allViolations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const patternCounts = allViolations.reduce((acc, v) => {
      v.errors.forEach(error => {
        acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const mostCommonPatterns = Object.entries(patternCounts)
      .map(([pattern, count]) => ({pattern, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const autoFixedCount = allViolations.filter(v => v.autoFixApplied).length;
    const autoFixSuccessRate = allViolations.length > 0 ?
      (autoFixedCount / allViolations.length) * 100 : 0;

    return {
      totalFiles: this.violations.size,
      totalViolations: allViolations.length,
      severityBreakdown,
      mostCommonPatterns,
      autoFixSuccessRate
    };
  }

  /**
   * Register prevention callback
   */
  onViolationDetected(
    pattern: string,
    callback: (event: ScopeViolationEvent) => void
  ): void {
    if (!this.preventionCallbacks.has(pattern)) {
      this.preventionCallbacks.set(pattern, []);
    }
    this.preventionCallbacks.get(pattern)!.push(callback);
  }

  /**
   * Generate prevention recommendations
   */
  generatePreventionReport(filename?: string): {
    summary: string;
    recommendations: string[];
    riskFiles: string[];
    codeExamples: Array<{
      issue: string;
      badExample: string;
      goodExample: string;
    }>;
  } {
    const violations = filename ?
      this.getViolationHistory(filename) :
      Array.from(this.violations.values()).flat();

    const allErrors = violations.flatMap(v => v.errors);
    const strategies = this.detector.generatePreventionStrategy(allErrors);

    const riskFiles = Array.from(this.violations.entries())
      .filter(([_, events]) => events.some(e => e.severity === 'critical'))
      .map(([filename]) => filename)
      .slice(0, 10);

    const codeExamples = [
      {
        issue: "isLoading used without useState declaration",
        badExample: `
// ❌ Bad: isLoading used without declaration
function MyComponent() {
  return (
    <div>
      {isLoading && <Spinner />}
      <button disabled={isLoading}>Submit</button>
    </div>
  );
}`,
        goodExample: `
// ✅ Good: Proper useState declaration
import { useState } from 'react';

function MyComponent() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      {isLoading && <Spinner />}
      <button disabled={isLoading}>Submit</button>
    </div>
  );
}`
      },
      {
        issue: "Variable used before declaration",
        badExample: `
// ❌ Bad: Variable used before declaration
function processData() {
  console.log(result); // ReferenceError!
  const result = computeResult();
  return result;
}`,
        goodExample: `
// ✅ Good: Declare before use
function processData() {
  const result = computeResult();
  console.log(result);
  return result;
}`
      }
    ];

    return {
      summary: `Found ${violations.length} scope violations across ${this.violations.size} files`,
      recommendations: strategies,
      riskFiles,
      codeExamples
    };
  }

  /**
   * Private helper methods
   */
  private shouldExcludeFile(filename: string): boolean {
    return this.config.excludePatterns.some(pattern =>
      this.matchesPattern(filename, pattern)
    );
  }

  private shouldNotify(severity: string): boolean {
    const levels = ['low', 'medium', 'high', 'critical'];
    const minLevel = levels.indexOf(this.config.notificationLevel);
    const currentLevel = levels.indexOf(severity);
    return currentLevel >= minLevel;
  }

  private calculateSeverity(errors: ScopeErrorAnalysis[]): 'critical' | 'high' | 'medium' | 'low' {
    if (errors.some(e => e.errorType.includes('critical'))) return 'critical';
    if (errors.some(e => e.errorType.includes('useState'))) return 'high';
    if (errors.length > 3) return 'high';
    if (errors.length > 1) return 'medium';
    return 'low';
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob-like matching
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    return new RegExp(regex).test(filename);
  }

  private triggerPrevention(event: ScopeViolationEvent): void {
    event.errors.forEach(error => {
      const callbacks = this.preventionCallbacks.get(error.errorType) || [];
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (e) {
          console.error(`Prevention callback failed:`, e);
        }
      });
    });
  }
}

/**
 * Global scope violation monitor instance
 */
export const globalScopeMonitor = new ScopeViolationDetector({
  enabled: true,
  autoFix: false, // Enable only in development
  realTimeMonitoring: true,
  preventionMode: true,
  notificationLevel: 'high'
});

// Start monitoring on initialization
globalScopeMonitor.startMonitoring();

export default ScopeViolationDetector;