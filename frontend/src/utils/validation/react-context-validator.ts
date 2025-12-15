/**
 * React Context Validation System
 * Comprehensive validation for React context patterns and best practices
 */

import { TemporalDeadZoneDetector } from '@/patterns/temporal-dead-zone-prevention';

export interface ContextValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (code: string) => ValidationResult[];
}

export interface ValidationResult {
  ruleId: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export class ReactContextValidator {
  private rules: ContextValidationRule[];
  private tdzDetector: TemporalDeadZoneDetector;

  constructor() {
    this.tdzDetector = new TemporalDeadZoneDetector();
    this.rules = this.initializeRules();
  }

  private initializeRules(): ContextValidationRule[] {
    return [
      {
        id: 'temporal-dead-zone',
        name: 'Temporal Dead Zone Prevention',
        description: 'Detect variables used before declaration in React hooks',
        severity: 'error',
        check: (code: string) => {
          const analysis = this.tdzDetector.analyzeCode(code);
          return analysis.issues.map(issue => ({
            ruleId: 'temporal-dead-zone',
            message: `Temporal dead zone error: ${issue.suggestion}`,
            line: issue.line,
            column: issue.column,
            severity: 'error' as const,
            suggestion: issue.pattern.prevention
          }));
        }
      },
      {
        id: 'context-value-stability',
        name: 'Context Value Stability',
        description: 'Ensure context values are properly memoized',
        severity: 'warning',
        check: (code: string) => {
          const results: ValidationResult[] = [];
          const lines = code.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for Provider value without useMemo
            if (line.includes('.Provider') && line.includes('value={') && 
                !lines.slice(Math.max(0, i - 5), i).some(prevLine => 
                  prevLine.includes('useMemo'))) {
              
              results.push({
                ruleId: 'context-value-stability',
                message: 'Context Provider value should be memoized with useMemo to prevent unnecessary re-renders',
                line: i + 1,
                severity: 'warning',
                suggestion: 'Wrap the context value in useMemo() to maintain referential stability'
              });
            }
          }
          
          return results;
        }
      },
      {
        id: 'context-dependency-optimization',
        name: 'Context Dependency Optimization',
        description: 'Check for optimal dependency arrays in context-related hooks',
        severity: 'warning',
        check: (code: string) => {
          const results: ValidationResult[] = [];
          const lines = code.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for missing dependencies in useMemo/useCallback
            if ((line.includes('useMemo') || line.includes('useCallback')) && 
                line.includes('[]')) {
              
              // Look for potential missing dependencies in the function body
              const nextLines = lines.slice(i + 1, i + 10);
              const functionBody = nextLines.join('\n');
              
              const potentialDeps = functionBody.match(/\b\w+\b/g) || [];
              const commonProps = ['socket', 'isConnected', 'connectionState'];
              
              const missingDeps = potentialDeps.filter(dep => 
                commonProps.includes(dep) && !line.includes(dep)
              );
              
              if (missingDeps.length > 0) {
                results.push({
                  ruleId: 'context-dependency-optimization',
                  message: `Potential missing dependencies in hook: ${missingDeps.join(', ')}`,
                  line: i + 1,
                  severity: 'warning',
                  suggestion: 'Add missing dependencies to the dependency array or verify they are not needed'
                });
              }
            }
          }
          
          return results;
        }
      },
      {
        id: 'context-error-boundaries',
        name: 'Context Error Boundaries',
        description: 'Ensure proper error boundary usage with contexts',
        severity: 'info',
        check: (code: string) => {
          const results: ValidationResult[] = [];
          
          if (code.includes('useContext') && !code.includes('ErrorBoundary')) {
            results.push({
              ruleId: 'context-error-boundaries',
              message: 'Consider wrapping context usage with error boundaries for better error handling',
              severity: 'info',
              suggestion: 'Add error boundaries around components that use context to prevent app crashes'
            });
          }
          
          return results;
        }
      },
      {
        id: 'context-performance-optimization',
        name: 'Context Performance Optimization',
        description: 'Check for performance optimization opportunities',
        severity: 'info',
        check: (code: string) => {
          const results: ValidationResult[] = [];
          const lines = code.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for React.memo usage on components that use context
            if (line.includes('useContext') && 
                !lines.slice(Math.max(0, i - 10), i).some(prevLine => 
                  prevLine.includes('memo('))) {
              
              results.push({
                ruleId: 'context-performance-optimization',
                message: 'Consider wrapping component with React.memo for better performance',
                line: i + 1,
                severity: 'info',
                suggestion: 'Use React.memo() to prevent unnecessary re-renders when context value hasn\'t changed'
              });
            }
            
            // Check for inline object creation in context values
            if (line.includes('value={{')) {
              results.push({
                ruleId: 'context-performance-optimization',
                message: 'Avoid inline object creation in context Provider value',
                line: i + 1,
                severity: 'warning',
                suggestion: 'Extract the object to a memoized value to prevent new object creation on every render'
              });
            }
          }
          
          return results;
        }
      }
    ];
  }

  /**
   * Validate React context code
   */
  validate(code: string, filename?: string): {
    results: ValidationResult[];
    summary: {
      errors: number;
      warnings: number;
      info: number;
      total: number;
    };
  } {
    const allResults: ValidationResult[] = [];

    // Run all validation rules
    for (const rule of this.rules) {
      try {
        const ruleResults = rule.check(code);
        allResults.push(...ruleResults);
      } catch (error) {
        console.error(`Error running validation rule ${rule.id}:`, error);
      }
    }

    // Calculate summary
    const summary = {
      errors: allResults.filter(r => r.severity === 'error').length,
      warnings: allResults.filter(r => r.severity === 'warning').length,
      info: allResults.filter(r => r.severity === 'info').length,
      total: allResults.length
    };

    return {
      results: allResults,
      summary
    };
  }

  /**
   * Generate a detailed report
   */
  generateReport(code: string, filename?: string): string {
    const validation = this.validate(code, filename);
    const { results, summary } = validation;

    let report = `
React Context Validation Report${filename ? ` for ${filename}` : ''}
${'='.repeat(60)}

Summary:
  Errors:   ${summary.errors}
  Warnings: ${summary.warnings}
  Info:     ${summary.info}
  Total:    ${summary.total}

`;

    if (results.length === 0) {
      report += '✅ No issues found! Code follows React context best practices.\n';
      return report;
    }

    // Group results by severity
    const errorResults = results.filter(r => r.severity === 'error');
    const warningResults = results.filter(r => r.severity === 'warning');
    const infoResults = results.filter(r => r.severity === 'info');

    if (errorResults.length > 0) {
      report += '❌ ERRORS:\n';
      errorResults.forEach(result => {
        report += `  Line ${result.line}: ${result.message}\n`;
        if (result.suggestion) {
          report += `    💡 Suggestion: ${result.suggestion}\n`;
        }
        report += '\n';
      });
    }

    if (warningResults.length > 0) {
      report += '⚠️  WARNINGS:\n';
      warningResults.forEach(result => {
        report += `  Line ${result.line}: ${result.message}\n`;
        if (result.suggestion) {
          report += `    💡 Suggestion: ${result.suggestion}\n`;
        }
        report += '\n';
      });
    }

    if (infoResults.length > 0) {
      report += 'ℹ️  INFORMATION:\n';
      infoResults.forEach(result => {
        report += `  Line ${result.line}: ${result.message}\n`;
        if (result.suggestion) {
          report += `    💡 Suggestion: ${result.suggestion}\n`;
        }
        report += '\n';
      });
    }

    return report;
  }

  /**
   * Fix common issues automatically
   */
  autoFix(code: string): { fixedCode: string; appliedFixes: string[] } {
    let fixedCode = code;
    const appliedFixes: string[] = [];

    // Auto-fix temporal dead zone issues by reordering variable declarations
    const tdzAnalysis = this.tdzDetector.analyzeCode(fixedCode);
    if (tdzAnalysis.issues.length > 0) {
      // This is a simplified auto-fix - in practice, you'd need more sophisticated AST manipulation
      appliedFixes.push('Detected temporal dead zone issues - manual reordering of variable declarations recommended');
    }

    return { fixedCode, appliedFixes };
  }
}

/**
 * Convenience function to validate React context files
 */
export function validateReactContext(code: string, filename?: string) {
  const validator = new ReactContextValidator();
  return validator.validate(code, filename);
}

/**
 * CLI-style validation function
 */
export function validateContextFile(filePath: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const fs = await import('fs');
      const code = await fs.promises.readFile(filePath, 'utf8');
      
      const validator = new ReactContextValidator();
      const report = validator.generateReport(code, filePath);
      
      console.log(report);
      
      const validation = validator.validate(code, filePath);
      if (validation.summary.errors > 0) {
        reject(new Error(`Context validation failed with ${validation.summary.errors} errors`));
      } else {
        resolve();
      }
    } catch (error) {
      reject(error);
    }
  });
}

export default ReactContextValidator;