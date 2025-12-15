/**
 * Hook Violation Detector - NLD Pattern Analysis Tool
 * Detects React Hooks rule violations to prevent "rendered more hooks" errors
 */

import * as React from 'react';

interface HookViolation {
  type: 'post_conditional_hook' | 'loop_hook' | 'nested_function_hook' | 'conditional_hook';
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  autoFixable: boolean;
  suggestion?: string;
}

interface ComponentAnalysis {
  componentName: string;
  filePath: string;
  violations: HookViolation[];
  hookCount: number;
  safetyScore: number; // 0-100
}

export class HookViolationDetector {
  private static patterns = {
    // Pattern: Hook called after conditional return
    postConditionalHook: /(?:if\s*\([^)]+\)\s*(?:\{[^}]*\})?\s*return[^;]*;[\s\S]*?)(?:const\s*\[[^\]]+\]\s*=\s*use[A-Z]\w*|use[A-Z]\w*\s*\()/g,

    // Pattern: Hook called in loop
    loopHook: /(?:\.map|\.forEach|\.filter|for\s*\(|while\s*\()[^{]*\{[^}]*(?:use[A-Z]\w*|const\s*\[[^\]]+\]\s*=\s*use[A-Z]\w*)/g,

    // Pattern: Hook called in nested function
    nestedFunctionHook: /(?:function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)\s*)?=>)[^{]*\{[^}]*(?:use[A-Z]\w*|const\s*\[[^\]]+\]\s*=\s*use[A-Z]\w*)/g,

    // Pattern: Hook called conditionally
    conditionalHook: /if\s*\([^)]+\)\s*\{[^}]*(?:use[A-Z]\w*|const\s*\[[^\]]+\]\s*=\s*use[A-Z]\w*)/g,

    // Pattern: Hook declarations
    hookDeclaration: /(?:const\s*(?:\[[^\]]+\]|\w+)\s*=\s*)?use[A-Z]\w*\s*\(/g
  };

  /**
   * Analyzes component source code for hook violations
   */
  static analyzeComponent(source: string, filePath: string): ComponentAnalysis {
    const componentName = this.extractComponentName(source, filePath);
    const violations: HookViolation[] = [];
    const lines = source.split('\n');

    // Detect post-conditional hook pattern
    violations.push(...this.detectPostConditionalHooks(source, lines));

    // Detect loop hook pattern
    violations.push(...this.detectLoopHooks(source, lines));

    // Detect nested function hook pattern
    violations.push(...this.detectNestedFunctionHooks(source, lines));

    // Detect conditional hook pattern
    violations.push(...this.detectConditionalHooks(source, lines));

    const hookCount = this.countHooks(source);
    const safetyScore = this.calculateSafetyScore(violations, hookCount);

    return {
      componentName,
      filePath,
      violations,
      hookCount,
      safetyScore
    };
  }

  /**
   * Detects hooks called after conditional returns
   */
  private static detectPostConditionalHooks(source: string, lines: string[]): HookViolation[] {
    const violations: HookViolation[] = [];
    const matches = Array.from(source.matchAll(this.patterns.postConditionalHook));

    matches.forEach(match => {
      const position = this.getLineColumn(source, match.index!);
      violations.push({
        type: 'post_conditional_hook',
        line: position.line,
        column: position.column,
        message: 'Hook called after conditional return. Move hooks to the top of the component.',
        severity: 'error',
        autoFixable: true,
        suggestion: 'Move all useState, useEffect, and other hooks to the beginning of the component function.'
      });
    });

    return violations;
  }

  /**
   * Detects hooks called within loops
   */
  private static detectLoopHooks(source: string, lines: string[]): HookViolation[] {
    const violations: HookViolation[] = [];
    const matches = Array.from(source.matchAll(this.patterns.loopHook));

    matches.forEach(match => {
      const position = this.getLineColumn(source, match.index!);
      violations.push({
        type: 'loop_hook',
        line: position.line,
        column: position.column,
        message: 'Hook called inside loop. This creates variable hook counts.',
        severity: 'error',
        autoFixable: false,
        suggestion: 'Move hook outside of loop or use useMemo/useCallback for loop-dependent logic.'
      });
    });

    return violations;
  }

  /**
   * Detects hooks called in nested functions
   */
  private static detectNestedFunctionHooks(source: string, lines: string[]): HookViolation[] {
    const violations: HookViolation[] = [];
    const matches = Array.from(source.matchAll(this.patterns.nestedFunctionHook));

    matches.forEach(match => {
      const position = this.getLineColumn(source, match.index!);
      violations.push({
        type: 'nested_function_hook',
        line: position.line,
        column: position.column,
        message: 'Hook called inside nested function. Only call hooks at the top level.',
        severity: 'error',
        autoFixable: false,
        suggestion: 'Move hook to component level and pass values to nested function as parameters.'
      });
    });

    return violations;
  }

  /**
   * Detects hooks called conditionally
   */
  private static detectConditionalHooks(source: string, lines: string[]): HookViolation[] {
    const violations: HookViolation[] = [];
    const matches = Array.from(source.matchAll(this.patterns.conditionalHook));

    matches.forEach(match => {
      const position = this.getLineColumn(source, match.index!);
      violations.push({
        type: 'conditional_hook',
        line: position.line,
        column: position.column,
        message: 'Hook called conditionally. Hooks must be called in the same order every time.',
        severity: 'error',
        autoFixable: true,
        suggestion: 'Move hook outside condition or use useMemo for conditional values.'
      });
    });

    return violations;
  }

  /**
   * Counts total hooks in component
   */
  private static countHooks(source: string): number {
    const matches = Array.from(source.matchAll(this.patterns.hookDeclaration));
    return matches.length;
  }

  /**
   * Calculates safety score (0-100) based on violations
   */
  private static calculateSafetyScore(violations: HookViolation[], hookCount: number): number {
    if (hookCount === 0) return 100;

    const errorWeight = 30;
    const warningWeight = 10;

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;

    const penalty = (errorCount * errorWeight) + (warningCount * warningWeight);
    const score = Math.max(0, 100 - penalty);

    return score;
  }

  /**
   * Extracts component name from source or file path
   */
  private static extractComponentName(source: string, filePath: string): string {
    // Try to extract from export default
    const exportMatch = source.match(/export\s+default\s+(\w+)/);
    if (exportMatch) return exportMatch[1];

    // Try to extract from function name
    const functionMatch = source.match(/(?:function\s+|const\s+)(\w+)(?:\s*[:=]|\s*\()/);
    if (functionMatch) return functionMatch[1];

    // Fall back to filename
    const filename = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
    return filename || 'UnknownComponent';
  }

  /**
   * Converts string index to line/column position
   */
  private static getLineColumn(source: string, index: number): { line: number; column: number } {
    const lines = source.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * Generates auto-fix suggestions for common violations
   */
  static generateFix(violation: HookViolation, source: string): string | null {
    if (!violation.autoFixable) return null;

    switch (violation.type) {
      case 'post_conditional_hook':
        return this.generatePostConditionalHookFix(source);
      case 'conditional_hook':
        return this.generateConditionalHookFix(source);
      default:
        return null;
    }
  }

  /**
   * Generates fix for post-conditional hook violations
   */
  private static generatePostConditionalHookFix(source: string): string {
    // Extract all hook declarations
    const hookMatches = Array.from(source.matchAll(this.patterns.hookDeclaration));
    const hooks = hookMatches.map(match => match[0]);

    // Find early returns
    const earlyReturnRegex = /if\s*\([^)]+\)\s*(?:\{[^}]*\})?\s*return[^;]*;/g;
    const earlyReturns = Array.from(source.matchAll(earlyReturnRegex));

    if (hooks.length === 0 || earlyReturns.length === 0) return source;

    // Generate fixed version: move all hooks to the top
    const lines = source.split('\n');
    const componentStart = lines.findIndex(line => line.includes('= (') || line.includes('function'));

    if (componentStart === -1) return source;

    // Insert all hooks after component declaration
    const hookDeclarations = hooks.join('\n  ');
    const fixedLines = [
      ...lines.slice(0, componentStart + 1),
      `  // All hooks moved to top to prevent violations`,
      `  ${hookDeclarations}`,
      '',
      ...lines.slice(componentStart + 1)
    ];

    return fixedLines.join('\n');
  }

  /**
   * Generates fix for conditional hook violations
   */
  private static generateConditionalHookFix(source: string): string {
    // Replace conditional hooks with useMemo pattern
    return source.replace(
      /if\s*\([^)]+\)\s*\{([^}]*(?:use[A-Z]\w*|const\s*\[[^\]]+\]\s*=\s*use[A-Z]\w*)[^}]*)\}/g,
      (match, content) => {
        return `useMemo(() => {\n    ${content.trim()}\n  }, [/* dependencies */])`;
      }
    );
  }

  /**
   * Batch analyze multiple files
   */
  static analyzeFiles(filePaths: string[]): ComponentAnalysis[] {
    const results: ComponentAnalysis[] = [];

    filePaths.forEach(filePath => {
      try {
        // In real implementation, read file content
        // const source = fs.readFileSync(filePath, 'utf8');
        // const analysis = this.analyzeComponent(source, filePath);
        // results.push(analysis);
      } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error);
      }
    });

    return results;
  }

  /**
   * Generate violation report
   */
  static generateReport(analyses: ComponentAnalysis[]): string {
    const totalComponents = analyses.length;
    const violationCount = analyses.reduce((sum, analysis) => sum + analysis.violations.length, 0);
    const avgSafetyScore = analyses.reduce((sum, analysis) => sum + analysis.safetyScore, 0) / totalComponents;

    const criticalComponents = analyses.filter(analysis => analysis.violations.some(v => v.severity === 'error'));

    let report = `# Hook Violation Analysis Report\n\n`;
    report += `**Summary:**\n`;
    report += `- Components analyzed: ${totalComponents}\n`;
    report += `- Total violations: ${violationCount}\n`;
    report += `- Critical components: ${criticalComponents.length}\n`;
    report += `- Average safety score: ${avgSafetyScore.toFixed(1)}/100\n\n`;

    if (criticalComponents.length > 0) {
      report += `## Critical Components (Immediate Action Required)\n\n`;
      criticalComponents.forEach(component => {
        report += `### ${component.componentName} (${component.filePath})\n`;
        report += `Safety Score: ${component.safetyScore}/100\n\n`;

        component.violations.forEach(violation => {
          report += `- **Line ${violation.line}**: ${violation.message}\n`;
          if (violation.suggestion) {
            report += `  *Suggestion: ${violation.suggestion}*\n`;
          }
        });
        report += `\n`;
      });
    }

    return report;
  }
}

// Development-only hook validator
export const useHookCountValidator = (componentName: string) => {
  if (process.env.NODE_ENV !== 'development') return;

  const renderCountRef = React.useRef(0);
  const hookCountRef = React.useRef(0);
  const expectedHooksRef = React.useRef<number | null>(null);

  renderCountRef.current++;
  hookCountRef.current++;

  React.useLayoutEffect(() => {
    if (expectedHooksRef.current === null) {
      expectedHooksRef.current = hookCountRef.current;
    } else if (hookCountRef.current !== expectedHooksRef.current) {
      console.error(
        `🚨 NLD Hook Violation in ${componentName}:`,
        `Expected: ${expectedHooksRef.current}, Got: ${hookCountRef.current}`,
        `Render: ${renderCountRef.current}`
      );

      // Trigger NLD pattern learning
      if (typeof window !== 'undefined' && (window as any).nldSystem) {
        (window as any).nldSystem.recordPattern('hook_count_mismatch', {
          component: componentName,
          expected: expectedHooksRef.current,
          actual: hookCountRef.current,
          render: renderCountRef.current
        });
      }
    }

    hookCountRef.current = 0;
  });
};

// Export for development tools integration
if (process.env.NODE_ENV === 'development') {
  (window as any).HookViolationDetector = HookViolationDetector;
}