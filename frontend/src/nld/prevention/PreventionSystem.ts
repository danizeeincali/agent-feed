/**
 * NLD Prevention System
 * Proactively prevents failures based on learned patterns
 */

import { FailurePattern, failureDetector } from '../detection/FailurePatternDetector';
import { neuralLearningSystem } from '../learning/NeuralLearningSystem';
import { tddFailurePatterns } from '../patterns/TDDFailurePatterns';

export interface PreventionRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    component: string;
    action: string;
    conditions: string[];
  };
  prevention: {
    type: 'validation' | 'retry' | 'fallback' | 'circuit_breaker' | 'timeout';
    implementation: string;
    parameters: Record<string, any>;
  };
  effectiveness: number;
  lastUsed: number;
}

export interface PreventionResult {
  prevented: boolean;
  rule: PreventionRule;
  originalError?: Error;
  preventionAction: string;
  executionTime: number;
}

export class PreventionSystem {
  private preventionRules: Map<string, PreventionRule> = new Map();
  private preventionHistory: PreventionResult[] = [];
  private isActive = true;

  constructor() {
    this.initializeDefaultRules();
    this.loadCustomRules();
    this.startProactiveMonitoring();
  }

  private initializeDefaultRules(): void {
    // SSE Connection Prevention Rules
    this.addPreventionRule({
      id: 'sse_connection_retry',
      name: 'SSE Connection Retry',
      description: 'Automatically retry SSE connections with exponential backoff',
      trigger: {
        component: 'EventSource',
        action: 'connection_failure',
        conditions: ['connection_lost', 'network_error']
      },
      prevention: {
        type: 'retry',
        implementation: this.sseRetryImplementation(),
        parameters: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000
        }
      },
      effectiveness: 0.85,
      lastUsed: 0
    });

    // API Call Prevention Rules
    this.addPreventionRule({
      id: 'api_timeout_prevention',
      name: 'API Timeout Prevention',
      description: 'Add timeouts and retry logic to API calls',
      trigger: {
        component: 'API',
        action: 'request_failure',
        conditions: ['timeout', 'network_error', 'server_error']
      },
      prevention: {
        type: 'timeout',
        implementation: this.apiTimeoutImplementation(),
        parameters: {
          timeout: 5000,
          retries: 2
        }
      },
      effectiveness: 0.80,
      lastUsed: 0
    });

    // Component Lifecycle Prevention Rules
    this.addPreventionRule({
      id: 'component_error_boundary',
      name: 'Component Error Boundary',
      description: 'Wrap components with error boundaries to prevent crashes',
      trigger: {
        component: 'React.Component',
        action: 'render_error',
        conditions: ['unhandled_error', 'props_error']
      },
      prevention: {
        type: 'fallback',
        implementation: this.errorBoundaryImplementation(),
        parameters: {
          fallbackComponent: 'ErrorFallback'
        }
      },
      effectiveness: 0.75,
      lastUsed: 0
    });

    // UI State Prevention Rules
    this.addPreventionRule({
      id: 'state_validation',
      name: 'State Validation',
      description: 'Validate state before rendering to prevent inconsistencies',
      trigger: {
        component: 'StateManager',
        action: 'state_update',
        conditions: ['invalid_state', 'state_corruption']
      },
      prevention: {
        type: 'validation',
        implementation: this.stateValidationImplementation(),
        parameters: {
          strictMode: true,
          autoRecover: true
        }
      },
      effectiveness: 0.70,
      lastUsed: 0
    });
  }

  private addPreventionRule(rule: PreventionRule): void {
    this.preventionRules.set(rule.id, rule);
  }

  public async preventFailure(
    component: string,
    action: string,
    context: any,
    originalFunction: Function
  ): Promise<any> {
    if (!this.isActive) {
      return originalFunction();
    }

    // Check if prevention should be applied
    const applicableRules = this.getApplicableRules(component, action, context);
    
    if (applicableRules.length === 0) {
      return originalFunction();
    }

    // Get failure probability prediction
    const failureProbability = neuralLearningSystem.predictFailureProbability(
      component,
      action,
      context
    );

    // Only apply prevention if failure probability is above threshold
    if (failureProbability < 0.3) {
      return originalFunction();
    }

    // Select best prevention rule
    const bestRule = this.selectBestRule(applicableRules, failureProbability);
    
    if (!bestRule) {
      return originalFunction();
    }

    // Apply prevention
    const startTime = performance.now();
    const result = await this.applyPrevention(bestRule, originalFunction, context);
    const executionTime = performance.now() - startTime;

    // Record prevention result
    this.recordPreventionResult({
      prevented: result.prevented,
      rule: bestRule,
      originalError: result.error,
      preventionAction: result.action,
      executionTime
    });

    return result.value;
  }

  private getApplicableRules(component: string, action: string, context: any): PreventionRule[] {
    return Array.from(this.preventionRules.values()).filter(rule => {
      // Check component match
      if (rule.trigger.component !== component && 
          rule.trigger.component !== '*' && 
          !component.includes(rule.trigger.component)) {
        return false;
      }

      // Check action match
      if (rule.trigger.action !== action && 
          rule.trigger.action !== '*' && 
          !action.includes(rule.trigger.action)) {
        return false;
      }

      // Check conditions
      return rule.trigger.conditions.some(condition => {
        return this.evaluateCondition(condition, context);
      });
    });
  }

  private evaluateCondition(condition: string, context: any): boolean {
    switch (condition) {
      case 'connection_lost':
        return !navigator.onLine || context.connectionLost;
      case 'network_error':
        return context.error?.message?.includes('network') || 
               context.error?.message?.includes('fetch');
      case 'timeout':
        return context.error?.message?.includes('timeout') ||
               context.error?.code === 'TIMEOUT';
      case 'server_error':
        return context.error?.status >= 500;
      case 'unhandled_error':
        return context.error && !context.handled;
      case 'props_error':
        return context.error?.message?.includes('props');
      case 'invalid_state':
        return context.state && !this.isValidState(context.state);
      case 'state_corruption':
        return context.state && this.isCorruptedState(context.state);
      default:
        return false;
    }
  }

  private isValidState(state: any): boolean {
    // Basic state validation
    try {
      return state !== null && 
             state !== undefined && 
             typeof state === 'object';
    } catch {
      return false;
    }
  }

  private isCorruptedState(state: any): boolean {
    // Check for common state corruption patterns
    try {
      JSON.stringify(state);
      return false;
    } catch {
      return true;
    }
  }

  private selectBestRule(rules: PreventionRule[], failureProbability: number): PreventionRule | null {
    if (rules.length === 0) return null;

    // Score rules based on effectiveness and failure probability
    const scoredRules = rules.map(rule => ({
      rule,
      score: rule.effectiveness * failureProbability * (1 - (Date.now() - rule.lastUsed) / 86400000)
    }));

    // Sort by score and return best
    scoredRules.sort((a, b) => b.score - a.score);
    return scoredRules[0].rule;
  }

  private async applyPrevention(
    rule: PreventionRule,
    originalFunction: Function,
    context: any
  ): Promise<{ prevented: boolean; error?: Error; action: string; value: any }> {
    rule.lastUsed = Date.now();

    try {
      switch (rule.prevention.type) {
        case 'retry':
          return await this.applyRetryPrevention(rule, originalFunction, context);
        case 'timeout':
          return await this.applyTimeoutPrevention(rule, originalFunction, context);
        case 'fallback':
          return await this.applyFallbackPrevention(rule, originalFunction, context);
        case 'validation':
          return await this.applyValidationPrevention(rule, originalFunction, context);
        case 'circuit_breaker':
          return await this.applyCircuitBreakerPrevention(rule, originalFunction, context);
        default:
          return { prevented: false, action: 'none', value: await originalFunction() };
      }
    } catch (error) {
      return { 
        prevented: false, 
        error: error as Error, 
        action: 'prevention_failed', 
        value: null 
      };
    }
  }

  private async applyRetryPrevention(
    rule: PreventionRule,
    originalFunction: Function,
    context: any
  ): Promise<{ prevented: boolean; error?: Error; action: string; value: any }> {
    const { maxRetries, baseDelay, maxDelay } = rule.prevention.parameters;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await originalFunction();
        return { 
          prevented: attempt > 0, 
          action: `retry_success_attempt_${attempt}`, 
          value: result 
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return { 
      prevented: false, 
      error: lastError, 
      action: 'retry_exhausted', 
      value: null 
    };
  }

  private async applyTimeoutPrevention(
    rule: PreventionRule,
    originalFunction: Function,
    context: any
  ): Promise<{ prevented: boolean; error?: Error; action: string; value: any }> {
    const { timeout } = rule.prevention.parameters;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({ 
          prevented: true, 
          error: new Error(`Timeout after ${timeout}ms`), 
          action: 'timeout_prevented', 
          value: null 
        });
      }, timeout);

      originalFunction()
        .then((result: any) => {
          clearTimeout(timeoutId);
          resolve({ prevented: false, action: 'completed_within_timeout', value: result });
        })
        .catch((error: Error) => {
          clearTimeout(timeoutId);
          resolve({ prevented: false, error, action: 'error_within_timeout', value: null });
        });
    });
  }

  private async applyFallbackPrevention(
    rule: PreventionRule,
    originalFunction: Function,
    context: any
  ): Promise<{ prevented: boolean; error?: Error; action: string; value: any }> {
    try {
      const result = await originalFunction();
      return { prevented: false, action: 'original_succeeded', value: result };
    } catch (error) {
      // Use fallback
      const fallbackValue = this.getFallbackValue(rule, context);
      return { 
        prevented: true, 
        error: error as Error, 
        action: 'fallback_used', 
        value: fallbackValue 
      };
    }
  }

  private async applyValidationPrevention(
    rule: PreventionRule,
    originalFunction: Function,
    context: any
  ): Promise<{ prevented: boolean; error?: Error; action: string; value: any }> {
    // Pre-validate context
    const validationResult = this.validateContext(rule, context);
    
    if (!validationResult.valid) {
      if (rule.prevention.parameters.autoRecover) {
        const recoveredContext = this.recoverContext(context);
        const result = await originalFunction.call(null, recoveredContext);
        return { prevented: true, action: 'validation_recovered', value: result };
      } else {
        return { 
          prevented: true, 
          error: new Error(`Validation failed: ${validationResult.reason}`), 
          action: 'validation_failed', 
          value: null 
        };
      }
    }

    const result = await originalFunction();
    return { prevented: false, action: 'validation_passed', value: result };
  }

  private async applyCircuitBreakerPrevention(
    rule: PreventionRule,
    originalFunction: Function,
    context: any
  ): Promise<{ prevented: boolean; error?: Error; action: string; value: any }> {
    // Simple circuit breaker implementation
    const circuitKey = `${rule.id}_circuit`;
    const circuit = this.getCircuitState(circuitKey);

    if (circuit.state === 'open') {
      return { 
        prevented: true, 
        error: new Error('Circuit breaker is open'), 
        action: 'circuit_breaker_open', 
        value: null 
      };
    }

    try {
      const result = await originalFunction();
      this.updateCircuitSuccess(circuitKey);
      return { prevented: false, action: 'circuit_breaker_success', value: result };
    } catch (error) {
      this.updateCircuitFailure(circuitKey);
      return { prevented: false, error: error as Error, action: 'circuit_breaker_failure', value: null };
    }
  }

  private getFallbackValue(rule: PreventionRule, context: any): any {
    // Return appropriate fallback based on context
    const { fallbackComponent } = rule.prevention.parameters;
    
    if (fallbackComponent) {
      return { type: 'fallback_component', component: fallbackComponent };
    }

    // Default fallbacks based on common patterns
    if (context.expectedType === 'array') return [];
    if (context.expectedType === 'object') return {};
    if (context.expectedType === 'string') return '';
    if (context.expectedType === 'number') return 0;
    if (context.expectedType === 'boolean') return false;

    return null;
  }

  private validateContext(rule: PreventionRule, context: any): { valid: boolean; reason?: string } {
    if (!context) {
      return { valid: false, reason: 'Context is null or undefined' };
    }

    if (rule.prevention.parameters.strictMode) {
      // Strict validation
      try {
        JSON.stringify(context);
      } catch {
        return { valid: false, reason: 'Context is not serializable' };
      }
    }

    return { valid: true };
  }

  private recoverContext(context: any): any {
    // Attempt to recover corrupted context
    if (!context) return {};
    
    try {
      // Deep clone to avoid reference issues
      return JSON.parse(JSON.stringify(context));
    } catch {
      // Context is not serializable, return safe default
      return {};
    }
  }

  private circuitStates: Map<string, any> = new Map();

  private getCircuitState(key: string): { state: 'closed' | 'open' | 'half-open'; failures: number } {
    return this.circuitStates.get(key) || { state: 'closed', failures: 0 };
  }

  private updateCircuitSuccess(key: string): void {
    this.circuitStates.set(key, { state: 'closed', failures: 0 });
  }

  private updateCircuitFailure(key: string): void {
    const current = this.getCircuitState(key);
    const failures = current.failures + 1;
    const state = failures >= 5 ? 'open' : 'closed'; // Open after 5 failures
    
    this.circuitStates.set(key, { state, failures });
    
    if (state === 'open') {
      // Auto-recover after 30 seconds
      setTimeout(() => {
        const current = this.getCircuitState(key);
        if (current.state === 'open') {
          this.circuitStates.set(key, { state: 'half-open', failures: current.failures });
        }
      }, 30000);
    }
  }

  private recordPreventionResult(result: PreventionResult): void {
    this.preventionHistory.push(result);
    
    // Keep only last 100 results
    if (this.preventionHistory.length > 100) {
      this.preventionHistory = this.preventionHistory.slice(-100);
    }

    // Update rule effectiveness based on result
    if (result.prevented) {
      const rule = this.preventionRules.get(result.rule.id);
      if (rule) {
        rule.effectiveness = Math.min(rule.effectiveness + 0.05, 1.0);
      }
    }

    console.debug('NLD Prevention:', result);
  }

  private startProactiveMonitoring(): void {
    // Monitor for patterns that could benefit from new prevention rules
    setInterval(() => {
      this.analyzeRecentFailures();
    }, 60000); // Check every minute
  }

  private analyzeRecentFailures(): void {
    const recentPatterns = failureDetector.getPatterns()
      .filter(p => Date.now() - p.context.timestamp < 300000); // Last 5 minutes

    if (recentPatterns.length > 0) {
      this.generateDynamicRules(recentPatterns);
    }
  }

  private generateDynamicRules(patterns: FailurePattern[]): void {
    // Group patterns by type and component
    const grouped = patterns.reduce((acc, pattern) => {
      const key = `${pattern.type}_${pattern.context.component}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(pattern);
      return acc;
    }, {} as Record<string, FailurePattern[]>);

    // Generate rules for frequently failing patterns
    Object.entries(grouped).forEach(([key, patternGroup]) => {
      if (patternGroup.length >= 3) { // 3+ failures in 5 minutes
        this.createDynamicRule(key, patternGroup);
      }
    });
  }

  private createDynamicRule(key: string, patterns: FailurePattern[]): void {
    const firstPattern = patterns[0];
    const ruleId = `dynamic_${key}_${Date.now()}`;
    
    if (this.preventionRules.has(ruleId)) return; // Don't duplicate

    const rule: PreventionRule = {
      id: ruleId,
      name: `Dynamic Rule for ${key}`,
      description: `Auto-generated rule for preventing ${key} failures`,
      trigger: {
        component: firstPattern.context.component,
        action: firstPattern.context.action,
        conditions: this.extractConditionsFromPatterns(patterns)
      },
      prevention: {
        type: this.selectPreventionType(patterns),
        implementation: 'dynamic',
        parameters: this.generateParameters(patterns)
      },
      effectiveness: 0.6, // Start with moderate effectiveness
      lastUsed: 0
    };

    this.addPreventionRule(rule);
    console.debug('Generated dynamic prevention rule:', rule);
  }

  private extractConditionsFromPatterns(patterns: FailurePattern[]): string[] {
    const conditions = new Set<string>();
    
    patterns.forEach(pattern => {
      if (pattern.error.message.includes('timeout')) conditions.add('timeout');
      if (pattern.error.message.includes('network')) conditions.add('network_error');
      if (pattern.error.message.includes('undefined')) conditions.add('unhandled_error');
      if (pattern.type === 'sse_connection') conditions.add('connection_lost');
    });

    return Array.from(conditions);
  }

  private selectPreventionType(patterns: FailurePattern[]): PreventionRule['prevention']['type'] {
    // Select prevention type based on failure patterns
    const types = patterns.map(p => p.type);
    
    if (types.includes('sse_connection') || types.includes('api_call')) {
      return 'retry';
    }
    if (types.includes('component_lifecycle')) {
      return 'fallback';
    }
    if (types.includes('ui_state')) {
      return 'validation';
    }
    
    return 'timeout';
  }

  private generateParameters(patterns: FailurePattern[]): Record<string, any> {
    // Generate parameters based on failure patterns
    return {
      maxRetries: 3,
      timeout: 5000,
      fallbackValue: null,
      autoRecover: true
    };
  }

  // Implementation code strings for different prevention types
  private sseRetryImplementation(): string {
    return `
// Auto-generated SSE retry implementation
const createResilientSSE = (url, options = {}) => {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  let retryCount = 0;
  
  const connect = () => {
    const eventSource = new EventSource(url);
    
    eventSource.onerror = () => {
      eventSource.close();
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(connect, baseDelay * Math.pow(2, retryCount));
      }
    };
    
    return eventSource;
  };
  
  return connect();
};`;
  }

  private apiTimeoutImplementation(): string {
    return `
// Auto-generated API timeout implementation
const apiWithTimeout = async (url, options = {}) => {
  const { timeout = 5000 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};`;
  }

  private errorBoundaryImplementation(): string {
    return `
// Auto-generated Error Boundary implementation
class PreventionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Prevention boundary caught error:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again.</div>;
    }
    
    return this.props.children;
  }
}`;
  }

  private stateValidationImplementation(): string {
    return `
// Auto-generated state validation implementation
const validateState = (state, schema) => {
  if (!state) return false;
  
  try {
    JSON.stringify(state);
    return true;
  } catch {
    return false;
  }
};

const useValidatedState = (initialState) => {
  const [state, setState] = useState(initialState);
  
  const setValidatedState = (newState) => {
    if (validateState(newState)) {
      setState(newState);
    } else {
      console.warn('Invalid state prevented');
    }
  };
  
  return [state, setValidatedState];
};`;
  }

  private loadCustomRules(): void {
    try {
      const storedRules = localStorage.getItem('nld_prevention_rules');
      if (storedRules) {
        const rules = JSON.parse(storedRules);
        rules.forEach((rule: PreventionRule) => {
          this.preventionRules.set(rule.id, rule);
        });
      }
    } catch (error) {
      console.warn('Failed to load custom prevention rules:', error);
    }
  }

  public saveCustomRules(): void {
    try {
      const customRules = Array.from(this.preventionRules.values())
        .filter(rule => rule.id.startsWith('dynamic_') || rule.id.startsWith('custom_'));
      localStorage.setItem('nld_prevention_rules', JSON.stringify(customRules));
    } catch (error) {
      console.warn('Failed to save custom prevention rules:', error);
    }
  }

  public getPreventionStats(): any {
    return {
      totalRules: this.preventionRules.size,
      totalPreventions: this.preventionHistory.length,
      successfulPreventions: this.preventionHistory.filter(p => p.prevented).length,
      averageExecutionTime: this.preventionHistory.reduce((acc, p) => acc + p.executionTime, 0) / this.preventionHistory.length,
      ruleEffectiveness: Array.from(this.preventionRules.values()).map(r => ({
        id: r.id,
        effectiveness: r.effectiveness,
        lastUsed: r.lastUsed
      }))
    };
  }

  public exportPreventionData(): string {
    return JSON.stringify({
      rules: Array.from(this.preventionRules.values()),
      history: this.preventionHistory,
      stats: this.getPreventionStats()
    }, null, 2);
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    console.log(`NLD Prevention System ${active ? 'activated' : 'deactivated'}`);
  }

  public isSystemActive(): boolean {
    return this.isActive;
  }
}

// Global singleton instance
export const preventionSystem = new PreventionSystem();