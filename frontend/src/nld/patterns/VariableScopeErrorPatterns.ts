/**
 * NLD Variable Scope Error Pattern Analysis System
 * Comprehensive pattern detection for JavaScript/TypeScript variable scope violations
 */

export interface ScopeViolationPattern {
  id: string;
  type: 'useState' | 'variable' | 'import' | 'destructure' | 'async' | 'closure';
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: RegExp;
  description: string;
  commonCauses: string[];
  prevention: string[];
  autofix?: (code: string) => string;
}

export interface ScopeErrorAnalysis {
  file: string;
  line: number;
  column: number;
  errorType: string;
  variableName: string;
  scopeContext: string;
  suggestedFix: string;
  confidence: number;
  relatedPatterns: string[];
}

/**
 * Comprehensive scope violation patterns database
 */
export const SCOPE_VIOLATION_PATTERNS: ScopeViolationPattern[] = [
  // useState Loading State Patterns
  {
    id: 'useState-loading-missing-declaration',
    type: 'useState',
    severity: 'critical',
    pattern: /(?:if\s*\(|return\s+|&&\s*|!)?isLoading(?!\s*[,=:;])/g,
    description: 'isLoading used in JSX/logic but useState hook not declared',
    commonCauses: [
      'Missing useState hook declaration',
      'Variable name mismatch between useState and usage',
      'Hook declared in wrong component scope',
      'Import statement missing for useState'
    ],
    prevention: [
      'Always declare useState hooks at component top level',
      'Use consistent variable naming',
      'Import React hooks properly',
      'Add TypeScript for compile-time checking'
    ],
    autofix: (code: string) => {
      if (!code.includes('useState') && code.includes('isLoading')) {
        const importMatch = code.match(/import.*from\s+['"]react['"]/);
        if (importMatch) {
          // Add useState to existing React import
          const updatedImport = importMatch[0].replace(
            /import\s*{([^}]*)}/,
            (match, imports) => {
              if (!imports.includes('useState')) {
                return `import { ${imports.trim()}, useState }`;
              }
              return match;
            }
          );
          code = code.replace(importMatch[0], updatedImport);
        }
        // Add useState declaration
        const componentMatch = code.match(/(?:function|const)\s+\w+.*{/);
        if (componentMatch) {
          const insertIndex = code.indexOf('{', componentMatch.index!) + 1;
          code = code.slice(0, insertIndex) +
                 '\n  const [isLoading, setIsLoading] = useState(false);' +
                 code.slice(insertIndex);
        }
      }
      return code;
    }
  },

  {
    id: 'loading-destructure-mismatch',
    type: 'useState',
    severity: 'high',
    pattern: /const\s*\[\s*([^,\s]+)\s*,\s*([^,\s\]]+)\s*\]\s*=\s*useState.*isLoading/g,
    description: 'useState destructuring variable name does not match usage',
    commonCauses: [
      'Copy-paste errors in variable names',
      'Inconsistent naming conventions',
      'Refactoring incomplete'
    ],
    prevention: [
      'Use consistent naming patterns',
      'Automated linting rules',
      'Code review for variable consistency'
    ]
  },

  // General Variable Scope Patterns
  {
    id: 'variable-used-before-declaration',
    type: 'variable',
    severity: 'critical',
    pattern: /(?:console\.log|return|if\s*\(|&&|!)\s*\w+.*(?:\n.*)*?(?:const|let|var)\s+\1/g,
    description: 'Variable used before declaration (temporal dead zone)',
    commonCauses: [
      'Hoisting misunderstanding',
      'Temporal dead zone with let/const',
      'Async execution order issues'
    ],
    prevention: [
      'Declare variables before use',
      'Use const/let instead of var',
      'Proper async/await patterns'
    ]
  },

  {
    id: 'block-scope-violation',
    type: 'variable',
    severity: 'medium',
    pattern: /\{[^}]*(?:const|let)\s+(\w+)[^}]*\}.*\1/g,
    description: 'Variable declared in block scope used outside block',
    commonCauses: [
      'Block scope misunderstanding',
      'Missing variable in outer scope',
      'Control flow logic errors'
    ],
    prevention: [
      'Declare variables in appropriate scope',
      'Use function parameters for data passing',
      'Understand block vs function scope'
    ]
  },

  // Import/Export Patterns
  {
    id: 'missing-import',
    type: 'import',
    severity: 'critical',
    pattern: /(?:React\.|use\w+|<\w+)/g,
    description: 'React or hook used without proper import',
    commonCauses: [
      'Missing React import',
      'Missing hook imports',
      'Incorrect import paths'
    ],
    prevention: [
      'Auto-import IDE settings',
      'ESLint rules for imports',
      'Proper TypeScript configuration'
    ]
  },

  // Async/Await Patterns
  {
    id: 'async-scope-error',
    type: 'async',
    severity: 'high',
    pattern: /await\s+(?!async).*\w+.*(?:not defined|is not a function)/g,
    description: 'Async variable scope violation',
    commonCauses: [
      'Async function not properly declared',
      'Promise not handled correctly',
      'Callback scope issues'
    ],
    prevention: [
      'Proper async/await patterns',
      'Error handling for promises',
      'Scope management in callbacks'
    ]
  },

  // Destructuring Patterns
  {
    id: 'destructure-undefined',
    type: 'destructure',
    severity: 'medium',
    pattern: /const\s*\{\s*(\w+).*\}\s*=.*undefined/g,
    description: 'Destructuring from undefined object',
    commonCauses: [
      'Object not initialized',
      'API response not available',
      'Missing null checks'
    ],
    prevention: [
      'Default value destructuring',
      'Null/undefined checks',
      'Optional chaining'
    ]
  },

  // Closure Patterns
  {
    id: 'closure-scope-leak',
    type: 'closure',
    severity: 'medium',
    pattern: /function.*\{.*(\w+).*\}.*\1(?![^{}]*\{)/g,
    description: 'Variable accessed outside closure scope',
    commonCauses: [
      'Closure scope misunderstanding',
      'Event handler scope issues',
      'Callback scope problems'
    ],
    prevention: [
      'Proper closure patterns',
      'Use arrow functions for lexical scope',
      'Bind methods appropriately'
    ]
  }
];

/**
 * React-specific isLoading patterns found in codebase
 */
export const ISLOADING_USAGE_PATTERNS = {
  // Common useState declarations found
  declarations: [
    'const [isLoading, setIsLoading] = useState(false)',
    'const [isLoading, setIsLoading] = useState(true)',
    'const { data, isLoading } = useQuery', // React Query pattern
    'isLoading: boolean' // TypeScript interface pattern
  ],

  // Common usage contexts
  usageContexts: [
    'conditional rendering: {isLoading && <Spinner />}',
    'button disabled state: disabled={isLoading}',
    'early return: if (isLoading) return <Loading />',
    'ternary operator: {isLoading ? "Loading..." : content}',
    'logical AND: {!isLoading && content}',
    'form validation: if (!message.trim() || isLoading) return'
  ],

  // Files with heavy isLoading usage (potential for scope errors)
  highUsageFiles: [
    '/workspaces/agent-feed/frontend/src/hooks/useDualInstanceMonitoringEnhanced.ts',
    '/workspaces/agent-feed/frontend/src/components/BulletproofSystemAnalytics.tsx',
    '/workspaces/agent-feed/frontend/src/components/claude-instances/AviChatInterface.tsx',
    '/workspaces/agent-feed/frontend/src/hooks/useAviInstance.ts'
  ]
};

/**
 * Scope error detection algorithm
 */
export class ScopeErrorDetector {
  private patterns: ScopeViolationPattern[];

  constructor() {
    this.patterns = SCOPE_VIOLATION_PATTERNS;
  }

  /**
   * Analyze code for scope violations
   */
  analyzeCode(code: string, filename: string): ScopeErrorAnalysis[] {
    const errors: ScopeErrorAnalysis[] = [];
    const lines = code.split('\n');

    // Check for isLoading usage without useState
    if (code.includes('isLoading') && !code.includes('useState') && !code.includes('useQuery')) {
      const isLoadingMatches = [...code.matchAll(/isLoading/g)];
      for (const match of isLoadingMatches) {
        const line = code.substring(0, match.index!).split('\n').length;
        errors.push({
          file: filename,
          line,
          column: match.index! - code.lastIndexOf('\n', match.index!),
          errorType: 'useState-loading-missing-declaration',
          variableName: 'isLoading',
          scopeContext: this.getScopeContext(code, match.index!),
          suggestedFix: 'Add: const [isLoading, setIsLoading] = useState(false);',
          confidence: 0.9,
          relatedPatterns: ['useState-loading-missing-declaration']
        });
      }
    }

    // Apply all patterns
    for (const pattern of this.patterns) {
      const matches = [...code.matchAll(pattern.pattern)];
      for (const match of matches) {
        const line = code.substring(0, match.index!).split('\n').length;
        errors.push({
          file: filename,
          line,
          column: match.index! - code.lastIndexOf('\n', match.index!),
          errorType: pattern.id,
          variableName: match[1] || 'unknown',
          scopeContext: this.getScopeContext(code, match.index!),
          suggestedFix: pattern.prevention[0] || 'Review variable scope',
          confidence: 0.8,
          relatedPatterns: [pattern.id]
        });
      }
    }

    return errors;
  }

  /**
   * Get surrounding code context for scope analysis
   */
  private getScopeContext(code: string, position: number): string {
    const start = Math.max(0, position - 200);
    const end = Math.min(code.length, position + 200);
    return code.substring(start, end);
  }

  /**
   * Generate prevention recommendations
   */
  generatePreventionStrategy(errors: ScopeErrorAnalysis[]): string[] {
    const strategies = new Set<string>();

    for (const error of errors) {
      const pattern = this.patterns.find(p => p.id === error.errorType);
      if (pattern) {
        pattern.prevention.forEach(p => strategies.add(p));
      }
    }

    return Array.from(strategies);
  }

  /**
   * Auto-fix scope errors where possible
   */
  autoFixCode(code: string, errors: ScopeErrorAnalysis[]): string {
    let fixedCode = code;

    for (const error of errors) {
      const pattern = this.patterns.find(p => p.id === error.errorType);
      if (pattern?.autofix) {
        fixedCode = pattern.autofix(fixedCode);
      }
    }

    return fixedCode;
  }
}

/**
 * Real-time scope monitoring integration
 */
export class RealTimeScopeMonitor {
  private detector: ScopeErrorDetector;
  private callbacks: ((errors: ScopeErrorAnalysis[]) => void)[] = [];

  constructor() {
    this.detector = new ScopeErrorDetector();
  }

  /**
   * Monitor file for scope errors
   */
  monitorFile(filename: string, content: string): void {
    const errors = this.detector.analyzeCode(content, filename);
    if (errors.length > 0) {
      this.callbacks.forEach(callback => callback(errors));
    }
  }

  /**
   * Subscribe to scope error notifications
   */
  onScopeError(callback: (errors: ScopeErrorAnalysis[]) => void): void {
    this.callbacks.push(callback);
  }
}

export default {
  SCOPE_VIOLATION_PATTERNS,
  ISLOADING_USAGE_PATTERNS,
  ScopeErrorDetector,
  RealTimeScopeMonitor
};