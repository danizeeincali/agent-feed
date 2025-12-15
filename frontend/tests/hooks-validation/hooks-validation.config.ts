/**
 * Hooks Validation Configuration
 * Configuration for React hooks validation testing
 */

export interface HooksValidationConfig {
  /** Number of render cycles to test for consistency */
  renderCycles: number;
  
  /** Number of stress test iterations */
  stressTestIterations: number;
  
  /** Memory leak detection threshold in bytes */
  memoryLeakThreshold: number;
  
  /** Timeout for async operations in ms */
  asyncTimeout: number;
  
  /** Whether to enable memory leak detection */
  enableMemoryLeakDetection: boolean;
  
  /** Whether to enable stress testing */
  enableStressTesting: boolean;
  
  /** Whether to track performance metrics */
  trackPerformance: boolean;
  
  /** Custom prop combinations to test */
  customPropCombinations?: any[];
  
  /** Hooks to specifically monitor */
  monitoredHooks: string[];
  
  /** Expected hook counts (if known) */
  expectedHookCounts?: {
    useState?: number;
    useEffect?: number;
    useCallback?: number;
    useMemo?: number;
    useRef?: number;
    useContext?: number;
  };
}

/**
 * Default configuration for hooks validation
 */
export const defaultHooksValidationConfig: HooksValidationConfig = {
  renderCycles: 5,
  stressTestIterations: 50,
  memoryLeakThreshold: 10 * 1024 * 1024, // 10MB
  asyncTimeout: 5000, // 5 seconds
  enableMemoryLeakDetection: true,
  enableStressTesting: true,
  trackPerformance: true,
  monitoredHooks: ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext'],
};

/**
 * Configuration specifically for RealSocialMediaFeed component
 */
export const realSocialMediaFeedConfig: HooksValidationConfig = {
  ...defaultHooksValidationConfig,
  renderCycles: 10,
  stressTestIterations: 100,
  customPropCombinations: [
    {},
    { className: 'test' },
    { className: 'test another-class' },
    { className: '' },
    { className: 'lg:col-span-2' },
  ],
  expectedHookCounts: {
    useState: 21, // Based on component analysis
    useEffect: 2,
    useCallback: 9,
    useMemo: 0,
    useRef: 0,
    useContext: 0,
  },
};

/**
 * Hooks Rules to validate
 */
export const HOOKS_RULES = {
  // Rules of Hooks
  ONLY_CALL_AT_TOP_LEVEL: 'Only Call Hooks at the Top Level',
  ONLY_CALL_FROM_REACT_FUNCTIONS: 'Only Call Hooks from React Functions',
  SAME_ORDER_EVERY_TIME: 'Same Order Every Time',
  NO_CONDITIONAL_HOOKS: 'No Conditional Hooks',
  NO_HOOKS_IN_LOOPS: 'No Hooks in Loops',
  NO_HOOKS_IN_NESTED_FUNCTIONS: 'No Hooks in Nested Functions',
} as const;

/**
 * Common error patterns to detect
 */
export const HOOKS_ERROR_PATTERNS = [
  /Rendered more hooks than during the previous render/,
  /Rendered fewer hooks than during the previous render/,
  /Hooks can only be called inside the body of a function component/,
  /Invalid hook call/,
  /Cannot call useState/,
  /Cannot call useEffect/,
  /Hook ".+" cannot be called at the top level/,
  /Hook ".+" cannot be called/,
] as const;

/**
 * Test scenarios configuration
 */
export interface TestScenario {
  name: string;
  description: string;
  enabled: boolean;
  timeout?: number;
  iterations?: number;
}

export const TEST_SCENARIOS: Record<string, TestScenario> = {
  HOOK_COUNT_CONSISTENCY: {
    name: 'Hook Count Consistency',
    description: 'Verify the same number of hooks are called on each render',
    enabled: true,
    iterations: 5,
  },
  CONDITIONAL_RENDERING: {
    name: 'Conditional Rendering',
    description: 'Test component with different conditional states',
    enabled: true,
    iterations: 3,
  },
  STATE_CHANGES: {
    name: 'State Changes',
    description: 'Verify hooks remain consistent during state updates',
    enabled: true,
    iterations: 10,
  },
  MOUNT_UNMOUNT: {
    name: 'Mount/Unmount Lifecycle',
    description: 'Test component lifecycle doesn\'t break hooks',
    enabled: true,
    iterations: 5,
  },
  RE_RENDER_STABILITY: {
    name: 'Re-render Stability',
    description: 'Force multiple re-renders and verify hook stability',
    enabled: true,
    iterations: 20,
  },
  HOOKS_RULES_COMPLIANCE: {
    name: 'Hooks Rules Compliance',
    description: 'Test various scenarios that could violate hooks rules',
    enabled: true,
  },
  PERFORMANCE_STABILITY: {
    name: 'Performance Stability',
    description: 'Verify hooks don\'t cause performance issues',
    enabled: true,
    timeout: 10000,
  },
  MEMORY_LEAK_DETECTION: {
    name: 'Memory Leak Detection',
    description: 'Check for memory leaks in component lifecycle',
    enabled: true,
    timeout: 15000,
  },
};

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  MAX_RENDER_TIME: 100, // ms
  MAX_RE_RENDERS: 10,
  MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  MAX_EVENT_LISTENERS: 100,
} as const;

/**
 * Export utility function to create custom config
 */
export function createHooksValidationConfig(
  overrides: Partial<HooksValidationConfig>
): HooksValidationConfig {
  return {
    ...defaultHooksValidationConfig,
    ...overrides,
  };
}

/**
 * Validation result types
 */
export interface HooksValidationResult {
  componentName: string;
  testName: string;
  success: boolean;
  message: string;
  details?: {
    hookCounts?: any;
    violations?: string[];
    performance?: {
      renderTime: number;
      memoryUsage: number;
      reRenderCount: number;
    };
    errors?: Error[];
  };
  timestamp: Date;
}

export interface HooksValidationReport {
  componentName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: HooksValidationResult[];
  summary: {
    hooksRulesCompliant: boolean;
    performanceIssues: boolean;
    memoryLeaks: boolean;
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  };
  generatedAt: Date;
}
