/**
 * Neural Learning Development (NLD) Pattern: Temporal Dead Zone Prevention
 * 
 * This pattern prevents "Cannot access before initialization" errors in React contexts
 * by establishing coding conventions and automated detection systems.
 */

import { useEffect } from 'react';

export interface TemporalDeadZonePattern {
  errorId: string;
  pattern: string;
  description: string;
  prevention: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  examples: {
    wrong: string;
    correct: string;
  };
}

export const TEMPORAL_DEAD_ZONE_PATTERNS: TemporalDeadZonePattern[] = [
  {
    errorId: 'tdz-001',
    pattern: 'React Context Variable Usage Before Declaration',
    description: 'Variable used in useMemo dependency array before const declaration',
    prevention: 'Declare all variables before using them in React hooks',
    severity: 'critical',
    examples: {
      wrong: `
        const contextValue = useMemo(() => ({
          connectionState,  // ERROR: Used before declaration
          // ... other properties
        }), [connectionState]); // ERROR: In dependency array before declaration
        
        const connectionState = useMemo(() => {
          // Connection state logic
        }, [dependencies]);
      `,
      correct: `
        // CORRECT: Declare connectionState FIRST
        const connectionState = useMemo(() => {
          // Connection state logic
        }, [dependencies]);
        
        // THEN use it in other useMemo calls
        const contextValue = useMemo(() => ({
          connectionState,  // Safe to use after declaration
          // ... other properties
        }), [connectionState]); // Safe in dependency array
      `
    }
  },
  {
    errorId: 'tdz-002',
    pattern: 'React Hook Dependency Order',
    description: 'Hooks referencing variables declared later in component',
    prevention: 'Order React hooks after all variables they depend on are declared',
    severity: 'high',
    examples: {
      wrong: `
        const effect = useEffect(() => {
          handleConnection(connectionState); // ERROR: Used before declaration
        }, [connectionState]);
        
        const connectionState = useState(false);
      `,
      correct: `
        // CORRECT: Declare state first
        const connectionState = useState(false);
        
        // Then use it in effects
        const effect = useEffect(() => {
          handleConnection(connectionState);
        }, [connectionState]);
      `
    }
  },
  {
    errorId: 'tdz-003',
    pattern: 'React Context Provider Value Construction',
    description: 'Context provider value object referencing undeclared variables',
    prevention: 'Build context value after all referenced variables are declared',
    severity: 'critical',
    examples: {
      wrong: `
        const providerValue = {
          socket,
          connectionState,  // ERROR: Used before declaration
          isConnected
        };
        
        const connectionState = computeConnectionState();
      `,
      correct: `
        // CORRECT: Compute all values first
        const connectionState = computeConnectionState();
        
        // Then build provider value
        const providerValue = {
          socket,
          connectionState,  // Safe to use after declaration
          isConnected
        };
      `
    }
  }
];

/**
 * Temporal Dead Zone Detection System
 * Analyzes code patterns to detect potential TDZ issues
 */
export class TemporalDeadZoneDetector {
  private patterns: TemporalDeadZonePattern[];

  constructor() {
    this.patterns = TEMPORAL_DEAD_ZONE_PATTERNS;
  }

  /**
   * Analyze code for potential temporal dead zone issues
   */
  analyzeCode(code: string): {
    issues: Array<{
      pattern: TemporalDeadZonePattern;
      line: number;
      column: number;
      suggestion: string;
    }>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const issues: Array<{
      pattern: TemporalDeadZonePattern;
      line: number;
      column: number;
      suggestion: string;
    }> = [];

    const lines = code.split('\n');

    // Check for useMemo/useCallback usage before variable declaration
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern 1: Check for variables used in hooks before declaration
      if (line.includes('useMemo') || line.includes('useCallback')) {
        const hookMatch = line.match(/const\s+(\w+)\s*=\s*use(Memo|Callback)/);
        if (hookMatch) {
          const hookName = hookMatch[1];
          
          // Look for variables referenced in this hook
          const dependencyArrayStart = code.indexOf('[', code.indexOf(line));
          const dependencyArrayEnd = code.indexOf(']', dependencyArrayStart);
          
          if (dependencyArrayStart > -1 && dependencyArrayEnd > -1) {
            const dependencies = code.substring(dependencyArrayStart + 1, dependencyArrayEnd);
            const variableRefs = dependencies.match(/\b\w+\b/g) || [];
            
            // Check if any referenced variables are declared after this line
            for (const varRef of variableRefs) {
              const varDeclarationIndex = this.findVariableDeclaration(lines, varRef, i + 1);
              if (varDeclarationIndex > -1) {
                issues.push({
                  pattern: this.patterns[0], // TDZ-001
                  line: i + 1,
                  column: line.indexOf(varRef),
                  suggestion: `Move the declaration of '${varRef}' above line ${i + 1} to avoid temporal dead zone error`
                });
              }
            }
          }
        }
      }
    }

    // Determine overall risk level
    const maxSeverity = issues.reduce((max, issue) => {
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      const currentLevel = severityLevels[issue.pattern.severity];
      const maxLevel = severityLevels[max];
      return currentLevel > maxLevel ? issue.pattern.severity : max;
    }, 'low' as const);

    return {
      issues,
      riskLevel: maxSeverity
    };
  }

  private findVariableDeclaration(lines: string[], variableName: string, startLine: number): number {
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(`const ${variableName}`) || 
          line.includes(`let ${variableName}`) || 
          line.includes(`var ${variableName}`)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Generate prevention suggestions for a given code pattern
   */
  generatePrevention(code: string): string[] {
    const analysis = this.analyzeCode(code);
    const suggestions: string[] = [];

    for (const issue of analysis.issues) {
      suggestions.push(
        `Line ${issue.line}: ${issue.suggestion} (Pattern: ${issue.pattern.pattern})`
      );
    }

    if (suggestions.length === 0) {
      suggestions.push('Code appears to follow temporal dead zone prevention best practices');
    }

    return suggestions;
  }

  /**
   * Log pattern for neural learning system
   */
  logPattern(errorMessage: string, code: string, fix: string): void {
    const pattern = {
      timestamp: new Date().toISOString(),
      error: errorMessage,
      codePattern: code,
      fix: fix,
      category: 'temporal-dead-zone',
      severity: 'critical'
    };

    // In a real implementation, this would send to a neural learning system
    console.log('🧠 NLD Pattern Logged:', pattern);
    
    // Store in local storage for debugging
    const existingPatterns = JSON.parse(
      localStorage.getItem('nld-temporal-dead-zone-patterns') || '[]'
    );
    existingPatterns.push(pattern);
    localStorage.setItem('nld-temporal-dead-zone-patterns', JSON.stringify(existingPatterns));
  }
}

/**
 * React Hook for Temporal Dead Zone Prevention
 * Use this in development to automatically detect TDZ issues
 */
export function useTemporalDeadZoneDetection(enabled: boolean = process.env.NODE_ENV === 'development') {
  useEffect(() => {
    if (!enabled) return;

    const detector = new TemporalDeadZoneDetector();
    
    // Monitor for TDZ errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (errorMessage.includes('Cannot access') && 
          errorMessage.includes('before initialization')) {
        
        console.warn('🚨 Temporal Dead Zone Error Detected!');
        console.warn('🔧 Check variable declaration order in React hooks');
        
        // Log for neural learning
        detector.logPattern(errorMessage, '', 'Move variable declarations before usage in hooks');
      }
      
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, [enabled]);
}

/**
 * ESLint-style rule configuration for preventing TDZ issues
 */
export const ESLINT_TDZ_RULES = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
  '@typescript-eslint/no-use-before-define': ['error', {
    functions: false,
    classes: true,
    variables: true,
    allowNamedExports: false
  }],
  'no-use-before-define': 'off' // Use TypeScript version instead
};

/**
 * Webpack plugin configuration for build-time TDZ detection
 */
export const webpackTDZPlugin = {
  name: 'TemporalDeadZoneDetectionPlugin',
  setup(build: any) {
    build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, async (args: any) => {
      const fs = await import('fs');
      const source = await fs.promises.readFile(args.path, 'utf8');
      
      const detector = new TemporalDeadZoneDetector();
      const analysis = detector.analyzeCode(source);
      
      if (analysis.issues.length > 0) {
        const warnings = analysis.issues.map(issue => 
          `${args.path}:${issue.line}:${issue.column}: ${issue.suggestion}`
        );
        
        console.warn('⚠️  Potential Temporal Dead Zone Issues:');
        warnings.forEach(warning => console.warn(warning));
      }
      
      return { contents: source };
    });
  }
};

export default TemporalDeadZoneDetector;