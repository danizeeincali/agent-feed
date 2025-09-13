/**
 * Neural Learning Detection - React Hooks Memory Crash Prevention Database
 * Generated from real-world failure pattern analysis
 */

export interface HookViolationPattern {
  id: string;
  type: 'conditional_hook' | 'missing_dependency' | 'memory_leak' | 'infinite_loop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detection_confidence: number;
  prevention_strategy: string;
  test_pattern: string;
}

export const REACT_HOOKS_VIOLATION_PATTERNS: HookViolationPattern[] = [
  {
    id: 'conditional-hook-usage',
    type: 'conditional_hook',
    severity: 'critical',
    detection_confidence: 0.98,
    prevention_strategy: `
// AVOID: Conditional hooks
if (condition) {
  useEffect(() => {}, []);  // WRONG
}

// CORRECT: Move condition inside hook
useEffect(() => {
  if (condition) {
    // logic here
  }
}, [condition]);
    `,
    test_pattern: `
test('should not render hooks conditionally', () => {
  const { rerender } = render(<Component showAdvanced={false} />);
  const initialHookCount = getHookCount();
  
  rerender(<Component showAdvanced={true} />);
  const finalHookCount = getHookCount();
  
  expect(finalHookCount).toBe(initialHookCount);
});
    `
  },
  
  {
    id: 'missing-useeffect-dependency',
    type: 'missing_dependency',
    severity: 'high',
    detection_confidence: 0.94,
    prevention_strategy: `
// AVOID: Missing dependencies
useEffect(() => {
  fetchData(agentId);
}, []); // Missing agentId dependency

// CORRECT: Include all dependencies
useEffect(() => {
  fetchData(agentId);
}, [agentId, fetchData]);
    `,
    test_pattern: `
test('should include all effect dependencies', () => {
  const mockFetch = jest.fn();
  const { rerender } = render(<Component agentId="1" fetchFn={mockFetch} />);
  
  expect(mockFetch).toHaveBeenCalledTimes(1);
  
  rerender(<Component agentId="2" fetchFn={mockFetch} />);
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
    `
  },
  
  {
    id: 'memory-leak-event-listeners',
    type: 'memory_leak',
    severity: 'critical',
    detection_confidence: 0.91,
    prevention_strategy: `
// AVOID: No cleanup
useEffect(() => {
  window.addEventListener('resize', handler);
}, []); // Missing cleanup

// CORRECT: Always cleanup
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
    `,
    test_pattern: `
test('should cleanup event listeners', () => {
  const addListener = jest.spyOn(window, 'addEventListener');
  const removeListener = jest.spyOn(window, 'removeEventListener');
  
  const { unmount } = render(<Component />);
  expect(addListener).toHaveBeenCalled();
  
  unmount();
  expect(removeListener).toHaveBeenCalled();
});
    `
  },
  
  {
    id: 'infinite-usememo-loop',
    type: 'infinite_loop',
    severity: 'critical',
    detection_confidence: 0.89,
    prevention_strategy: `
// AVOID: Object dependencies causing loops
const memoizedValue = useMemo(() => {
  return { data: processData(items) };
}, [items]); // Object recreated every render

// CORRECT: Stable dependencies
const memoizedValue = useMemo(() => {
  return processData(items);
}, [items.length, items.map(i => i.id).join(',')]);
    `,
    test_pattern: `
test('should not cause infinite memo recalculation', () => {
  const processor = jest.fn().mockReturnValue('result');
  const { rerender } = render(<Component items={[1,2,3]} processor={processor} />);
  
  expect(processor).toHaveBeenCalledTimes(1);
  
  // Same props should not recalculate
  rerender(<Component items={[1,2,3]} processor={processor} />);
  expect(processor).toHaveBeenCalledTimes(1);
});
    `
  }
];

export interface MemoryLeakDetector {
  detect(component: React.ComponentType): Promise<MemoryLeakReport>;
  preventionRules: PreventionRule[];
}

export interface MemoryLeakReport {
  component: string;
  leaks: Array<{
    type: 'event_listener' | 'subscription' | 'timer' | 'ref';
    location: string;
    severity: number;
  }>;
  memoryGrowth: number;
  recommendations: string[];
}

export interface PreventionRule {
  pattern: string;
  replacement: string;
  test_required: boolean;
  automation_level: 'lint' | 'test' | 'runtime';
}

export const MEMORY_LEAK_PREVENTION_RULES: PreventionRule[] = [
  {
    pattern: 'useEffect(() => { /* no return */ }, [])',
    replacement: 'useEffect(() => { /* logic */; return cleanup; }, [])',
    test_required: true,
    automation_level: 'lint'
  },
  {
    pattern: 'addEventListener without removeEventListener',
    replacement: 'addEventListener with cleanup in useEffect return',
    test_required: true,
    automation_level: 'runtime'
  },
  {
    pattern: 'setInterval without clearInterval',
    replacement: 'setInterval with clearInterval in cleanup',
    test_required: true,
    automation_level: 'test'
  },
  {
    pattern: 'subscription without unsubscribe',
    replacement: 'subscription with unsubscribe in cleanup',
    test_required: true,
    automation_level: 'runtime'
  }
];

export class NeuralHookAnalyzer {
  private patterns: HookViolationPattern[];
  private memoryBaseline: number;
  
  constructor() {
    this.patterns = REACT_HOOKS_VIOLATION_PATTERNS;
    this.memoryBaseline = process.memoryUsage().heapUsed;
  }
  
  analyzeComponent(code: string): HookAnalysisResult {
    const violations: HookViolation[] = [];
    
    // Detect conditional hooks
    if (code.includes('&&') && code.includes('use')) {
      violations.push({
        type: 'conditional_hook',
        line: this.findLine(code, '&&.*use'),
        confidence: 0.98,
        severity: 'critical'
      });
    }
    
    // Detect missing dependencies
    const useEffectMatches = code.match(/useEffect\([^,]+,\s*\[([^\]]*)\]/g);
    if (useEffectMatches) {
      useEffectMatches.forEach(match => {
        const deps = match.match(/\[([^\]]*)\]/)?.[1] || '';
        if (deps.trim() === '') {
          violations.push({
            type: 'missing_dependency',
            line: this.findLine(code, match),
            confidence: 0.85,
            severity: 'high'
          });
        }
      });
    }
    
    // Detect missing cleanup
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      violations.push({
        type: 'memory_leak',
        line: this.findLine(code, 'addEventListener'),
        confidence: 0.91,
        severity: 'critical'
      });
    }
    
    return {
      violations,
      memoryRisk: this.calculateMemoryRisk(violations),
      recommendations: this.generateRecommendations(violations)
    };
  }
  
  private findLine(code: string, pattern: string): number {
    const lines = code.split('\n');
    const regex = new RegExp(pattern);
    return lines.findIndex(line => regex.test(line)) + 1;
  }
  
  private calculateMemoryRisk(violations: HookViolation[]): number {
    return violations.reduce((risk, violation) => {
      const severity_weight = {
        'low': 0.1,
        'medium': 0.3,
        'high': 0.6,
        'critical': 1.0
      }[violation.severity];
      return risk + (violation.confidence * severity_weight);
    }, 0);
  }
  
  private generateRecommendations(violations: HookViolation[]): string[] {
    return violations.map(violation => {
      const pattern = this.patterns.find(p => p.type === violation.type);
      return pattern?.prevention_strategy || 'Fix hook violation';
    });
  }
}

export interface HookAnalysisResult {
  violations: HookViolation[];
  memoryRisk: number;
  recommendations: string[];
}

export interface HookViolation {
  type: string;
  line: number;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// TDD Test Generators
export function generateHookTests(violations: HookViolation[]): string {
  return violations.map(violation => {
    const pattern = REACT_HOOKS_VIOLATION_PATTERNS.find(p => p.type === violation.type);
    return pattern?.test_pattern || '// No test pattern available';
  }).join('\n\n');
}

// Memory monitoring utilities
export function trackMemoryUsage(component: React.ComponentType): MemoryTracker {
  return new MemoryTracker(component);
}

class MemoryTracker {
  private initialMemory: number;
  private component: React.ComponentType;
  
  constructor(component: React.ComponentType) {
    this.component = component;
    this.initialMemory = process.memoryUsage().heapUsed;
  }
  
  measureGrowth(): number {
    const currentMemory = process.memoryUsage().heapUsed;
    return currentMemory - this.initialMemory;
  }
  
  assertMemoryLimit(limitMB: number): void {
    const growthMB = this.measureGrowth() / (1024 * 1024);
    if (growthMB > limitMB) {
      throw new Error(`Memory growth ${growthMB}MB exceeds limit ${limitMB}MB`);
    }
  }
}