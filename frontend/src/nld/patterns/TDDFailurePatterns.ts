/**
 * TDD Failure Patterns
 * Specific patterns for Test-Driven Development failures and improvements
 */

import { FailurePattern } from '../detection/FailurePatternDetector';
import { LearningPattern } from '../learning/NeuralLearningSystem';

export interface TDDPattern {
  id: string;
  testType: 'unit' | 'integration' | 'e2e' | 'component' | 'api';
  failureMode: 'no_test' | 'incomplete_test' | 'wrong_test' | 'flaky_test' | 'slow_test';
  codePattern: {
    language: string;
    framework: string;
    testFramework: string;
    component: string;
  };
  failureContext: {
    originalCode: string;
    missingTests: string[];
    inadequateTests: string[];
    suggestedTests: string[];
  };
  tddMetrics: {
    testCoverage: number;
    testQuality: number;
    cycleTime: number; // Red-Green-Refactor cycle time
    failureRate: number;
  };
  preventionStrategy: {
    testFirst: boolean;
    mockingStrategy: string;
    assertionStrategy: string;
    refactoringNeeded: boolean;
  };
}

export class TDDFailurePatterns {
  private tddPatterns: Map<string, TDDPattern> = new Map();
  private tddMetrics: Map<string, any> = new Map();

  constructor() {
    this.initializeTDDPatterns();
  }

  private initializeTDDPatterns(): void {
    // Load existing TDD patterns from storage
    try {
      const storedPatterns = localStorage.getItem('nld_tdd_patterns');
      if (storedPatterns) {
        const patterns = JSON.parse(storedPatterns);
        patterns.forEach((pattern: TDDPattern) => {
          this.tddPatterns.set(pattern.id, pattern);
        });
      }
    } catch (error) {
      console.warn('Failed to load TDD patterns:', error);
    }
  }

  public analyzeTDDFailure(failurePattern: FailurePattern): TDDPattern | null {
    // Analyze if this failure could have been prevented by TDD
    const tddPattern = this.createTDDPattern(failurePattern);
    
    if (tddPattern) {
      this.tddPatterns.set(tddPattern.id, tddPattern);
      this.persistTDDPatterns();
      return tddPattern;
    }
    
    return null;
  }

  private createTDDPattern(failurePattern: FailurePattern): TDDPattern | null {
    // Determine if this failure is TDD-preventable
    const isTDDPreventable = this.isTDDPreventable(failurePattern);
    
    if (!isTDDPreventable) return null;

    const tddPattern: TDDPattern = {
      id: `tdd_${failurePattern.id}`,
      testType: this.determineTestType(failurePattern),
      failureMode: this.determineFailureMode(failurePattern),
      codePattern: {
        language: 'typescript',
        framework: this.detectFramework(failurePattern),
        testFramework: this.detectTestFramework(failurePattern),
        component: failurePattern.context.component
      },
      failureContext: {
        originalCode: this.extractCode(failurePattern),
        missingTests: this.identifyMissingTests(failurePattern),
        inadequateTests: this.identifyInadequateTests(failurePattern),
        suggestedTests: this.generateSuggestedTests(failurePattern)
      },
      tddMetrics: {
        testCoverage: this.calculateTestCoverage(failurePattern),
        testQuality: this.calculateTestQuality(failurePattern),
        cycleTime: this.estimateCycleTime(failurePattern),
        failureRate: this.calculateFailureRate(failurePattern)
      },
      preventionStrategy: {
        testFirst: this.shouldUseTestFirst(failurePattern),
        mockingStrategy: this.suggestMockingStrategy(failurePattern),
        assertionStrategy: this.suggestAssertionStrategy(failurePattern),
        refactoringNeeded: this.needsRefactoring(failurePattern)
      }
    };

    return tddPattern;
  }

  private isTDDPreventable(pattern: FailurePattern): boolean {
    // Logic errors are usually TDD preventable
    if (pattern.error.message.includes('undefined') || 
        pattern.error.message.includes('null') ||
        pattern.error.message.includes('TypeError')) {
      return true;
    }

    // API integration failures often preventable with proper mocking
    if (pattern.type === 'api_call' || pattern.type === 'data_fetching') {
      return true;
    }

    // Component lifecycle issues often preventable with proper testing
    if (pattern.type === 'component_lifecycle') {
      return true;
    }

    // UI state inconsistencies usually preventable with state testing
    if (pattern.type === 'ui_state') {
      return true;
    }

    return false;
  }

  private determineTestType(pattern: FailurePattern): TDDPattern['testType'] {
    switch (pattern.type) {
      case 'component_lifecycle':
        return 'component';
      case 'api_call':
      case 'data_fetching':
        return 'integration';
      case 'ui_state':
        return 'unit';
      case 'user_interaction':
        return 'e2e';
      default:
        return 'unit';
    }
  }

  private determineFailureMode(pattern: FailurePattern): TDDPattern['failureMode'] {
    // Analyze the failure to determine what went wrong with testing
    if (pattern.error.message.includes('ReferenceError') || 
        pattern.error.message.includes('undefined')) {
      return 'no_test';
    }

    if (pattern.type === 'api_call' && !pattern.error.message.includes('mock')) {
      return 'incomplete_test';
    }

    if (pattern.userFeedback && pattern.userFeedback.confidence > 0.8) {
      return 'wrong_test';
    }

    return 'incomplete_test';
  }

  private detectFramework(pattern: FailurePattern): string {
    // Detect framework from error stack or component name
    if (pattern.error.stack?.includes('React') || pattern.context.component.includes('React')) {
      return 'React';
    }
    if (pattern.error.stack?.includes('Vue')) {
      return 'Vue';
    }
    if (pattern.error.stack?.includes('Angular')) {
      return 'Angular';
    }
    return 'React'; // Default assumption
  }

  private detectTestFramework(pattern: FailurePattern): string {
    // Detect test framework from stack trace or error
    if (pattern.error.stack?.includes('jest')) {
      return 'Jest';
    }
    if (pattern.error.stack?.includes('vitest')) {
      return 'Vitest';
    }
    if (pattern.error.stack?.includes('mocha')) {
      return 'Mocha';
    }
    return 'Jest'; // Default assumption
  }

  private extractCode(pattern: FailurePattern): string {
    // Extract relevant code from the failure context
    // This would ideally integrate with the actual codebase
    return `// Code context for ${pattern.context.component}.${pattern.context.action}\n// Error: ${pattern.error.message}`;
  }

  private identifyMissingTests(pattern: FailurePattern): string[] {
    const missingTests: string[] = [];

    switch (pattern.type) {
      case 'component_lifecycle':
        missingTests.push('Component mounting test');
        missingTests.push('Component unmounting test');
        missingTests.push('Props validation test');
        break;

      case 'api_call':
        missingTests.push('API success response test');
        missingTests.push('API error handling test');
        missingTests.push('API timeout test');
        missingTests.push('Network failure test');
        break;

      case 'data_fetching':
        missingTests.push('Data loading state test');
        missingTests.push('Data error state test');
        missingTests.push('Data transformation test');
        break;

      case 'ui_state':
        missingTests.push('State initialization test');
        missingTests.push('State update test');
        missingTests.push('State validation test');
        break;

      case 'user_interaction':
        missingTests.push('User input validation test');
        missingTests.push('Event handling test');
        missingTests.push('User feedback test');
        break;
    }

    return missingTests;
  }

  private identifyInadequateTests(pattern: FailurePattern): string[] {
    const inadequateTests: string[] = [];

    // Identify tests that exist but are inadequate
    if (pattern.error.message.includes('mock')) {
      inadequateTests.push('Insufficient mocking of dependencies');
    }

    if (pattern.error.message.includes('async')) {
      inadequateTests.push('Inadequate async behavior testing');
    }

    if (pattern.error.message.includes('state')) {
      inadequateTests.push('Incomplete state testing');
    }

    return inadequateTests;
  }

  private generateSuggestedTests(pattern: FailurePattern): string[] {
    const suggestions: string[] = [];
    const testType = this.determineTestType(pattern);
    const component = pattern.context.component;
    const action = pattern.context.action;

    switch (testType) {
      case 'component':
        suggestions.push(...this.generateComponentTests(component, action, pattern));
        break;
      case 'integration':
        suggestions.push(...this.generateIntegrationTests(component, action, pattern));
        break;
      case 'unit':
        suggestions.push(...this.generateUnitTests(component, action, pattern));
        break;
      case 'e2e':
        suggestions.push(...this.generateE2ETests(component, action, pattern));
        break;
    }

    return suggestions;
  }

  private generateComponentTests(component: string, action: string, pattern: FailurePattern): string[] {
    return [
      `describe('${component}', () => {
  test('should render without crashing', () => {
    render(<${component} />);
  });

  test('should handle ${action} correctly', () => {
    const { getByTestId } = render(<${component} />);
    // Test ${action} behavior
    expect(getByTestId('${component.toLowerCase()}')).toBeInTheDocument();
  });

  test('should handle error in ${action}', () => {
    const mockError = new Error('${pattern.error.message}');
    // Test error handling
  });
});`
    ];
  }

  private generateIntegrationTests(component: string, action: string, pattern: FailurePattern): string[] {
    return [
      `describe('${component} Integration', () => {
  beforeEach(() => {
    // Setup API mocks
    jest.clearAllMocks();
  });

  test('should handle ${action} API call success', async () => {
    const mockResponse = { success: true };
    jest.spyOn(api, '${action}').mockResolvedValue(mockResponse);
    
    const { getByTestId } = render(<${component} />);
    // Test successful API interaction
  });

  test('should handle ${action} API call failure', async () => {
    const mockError = new Error('${pattern.error.message}');
    jest.spyOn(api, '${action}').mockRejectedValue(mockError);
    
    const { getByTestId } = render(<${component} />);
    // Test error handling
  });
});`
    ];
  }

  private generateUnitTests(component: string, action: string, pattern: FailurePattern): string[] {
    return [
      `describe('${component} Unit Tests', () => {
  test('should ${action} correctly', () => {
    const instance = new ${component}();
    const result = instance.${action}();
    expect(result).toBeDefined();
  });

  test('should handle ${action} edge cases', () => {
    const instance = new ${component}();
    // Test edge cases that led to: ${pattern.error.message}
  });
});`
    ];
  }

  private generateE2ETests(component: string, action: string, pattern: FailurePattern): string[] {
    return [
      `describe('${component} E2E', () => {
  test('user can ${action} successfully', async () => {
    await page.goto('/');
    await page.click('[data-testid="${component.toLowerCase()}"]');
    // Test user interaction that failed: ${pattern.error.message}
  });
});`
    ];
  }

  private calculateTestCoverage(pattern: FailurePattern): number {
    // Estimate test coverage based on failure type
    // This would ideally integrate with actual coverage tools
    switch (pattern.type) {
      case 'component_lifecycle':
        return 0.3; // Low coverage if component lifecycle fails
      case 'api_call':
        return 0.5; // Medium coverage if API calls fail
      case 'ui_state':
        return 0.4; // Low-medium coverage for state issues
      default:
        return 0.2; // Low coverage for other failures
    }
  }

  private calculateTestQuality(pattern: FailurePattern): number {
    // Estimate test quality based on failure characteristics
    let quality = 0.5;

    if (pattern.userFeedback) {
      quality -= 0.2; // User feedback indicates poor test quality
    }

    if (pattern.error.message.includes('undefined') || pattern.error.message.includes('null')) {
      quality -= 0.3; // Basic errors indicate very poor test quality
    }

    return Math.max(quality, 0);
  }

  private estimateCycleTime(pattern: FailurePattern): number {
    // Estimate Red-Green-Refactor cycle time in minutes
    // Longer cycle times indicate poor TDD practices
    switch (pattern.type) {
      case 'component_lifecycle':
        return 15; // Component tests should be quick
      case 'integration':
        return 30; // Integration tests take longer
      case 'e2e':
        return 60; // E2E tests are slowest
      default:
        return 10; // Unit tests should be very quick
    }
  }

  private calculateFailureRate(pattern: FailurePattern): number {
    // Calculate failure rate based on pattern frequency
    const patternId = `${pattern.context.component}_${pattern.context.action}`;
    const existingPattern = this.tddPatterns.get(patternId);
    
    if (existingPattern) {
      return Math.min(existingPattern.tddMetrics.failureRate + 0.1, 1.0);
    }
    
    return 0.1; // Initial failure rate
  }

  private shouldUseTestFirst(pattern: FailurePattern): boolean {
    // Recommend test-first for failures that could be easily caught
    return pattern.type === 'component_lifecycle' || 
           pattern.type === 'ui_state' ||
           (pattern.error.message.includes('undefined') || pattern.error.message.includes('null'));
  }

  private suggestMockingStrategy(pattern: FailurePattern): string {
    switch (pattern.type) {
      case 'api_call':
        return 'Mock API responses with both success and error scenarios';
      case 'data_fetching':
        return 'Mock data sources and simulate loading/error states';
      case 'sse_connection':
        return 'Mock EventSource and WebSocket connections';
      case 'component_lifecycle':
        return 'Mock component dependencies and external services';
      default:
        return 'Mock external dependencies and side effects';
    }
  }

  private suggestAssertionStrategy(pattern: FailurePattern): string {
    switch (pattern.type) {
      case 'ui_state':
        return 'Assert state transitions and validate state consistency';
      case 'component_lifecycle':
        return 'Assert component rendering and prop handling';
      case 'api_call':
        return 'Assert API calls and response handling';
      case 'user_interaction':
        return 'Assert user actions and feedback mechanisms';
      default:
        return 'Assert expected behavior and error handling';
    }
  }

  private needsRefactoring(pattern: FailurePattern): boolean {
    // Determine if the code needs refactoring for better testability
    return pattern.error.stack?.split('\n').length > 10 || // Complex stack trace
           pattern.context.component.includes('Manager') || // Complex components
           pattern.error.message.includes('circular'); // Circular dependencies
  }

  public generateTDDReport(patterns: FailurePattern[]): string {
    const tddAnalysis = patterns
      .map(p => this.analyzeTDDFailure(p))
      .filter(p => p !== null);

    const report = {
      totalFailures: patterns.length,
      tddPreventableFailures: tddAnalysis.length,
      preventionRate: tddAnalysis.length / patterns.length,
      testCoverageEstimate: tddAnalysis.reduce((acc, p) => acc + p.tddMetrics.testCoverage, 0) / tddAnalysis.length,
      testQualityEstimate: tddAnalysis.reduce((acc, p) => acc + p.tddMetrics.testQuality, 0) / tddAnalysis.length,
      suggestedTests: tddAnalysis.flatMap(p => p.failureContext.suggestedTests),
      topFailureModes: this.getTopFailureModes(tddAnalysis),
      recommendations: this.generateTDDRecommendations(tddAnalysis)
    };

    return JSON.stringify(report, null, 2);
  }

  private getTopFailureModes(patterns: TDDPattern[]): Record<string, number> {
    const modes: Record<string, number> = {};
    patterns.forEach(p => {
      modes[p.failureMode] = (modes[p.failureMode] || 0) + 1;
    });
    return modes;
  }

  private generateTDDRecommendations(patterns: TDDPattern[]): string[] {
    const recommendations: string[] = [];

    const noTestCount = patterns.filter(p => p.failureMode === 'no_test').length;
    if (noTestCount > 0) {
      recommendations.push(`Write ${noTestCount} missing test suites using test-first approach`);
    }

    const incompleteTestCount = patterns.filter(p => p.failureMode === 'incomplete_test').length;
    if (incompleteTestCount > 0) {
      recommendations.push(`Improve ${incompleteTestCount} existing test suites with better coverage`);
    }

    const needsRefactoring = patterns.filter(p => p.preventionStrategy.refactoringNeeded).length;
    if (needsRefactoring > 0) {
      recommendations.push(`Refactor ${needsRefactoring} components for better testability`);
    }

    return recommendations;
  }

  private persistTDDPatterns(): void {
    try {
      const patternsArray = Array.from(this.tddPatterns.values());
      localStorage.setItem('nld_tdd_patterns', JSON.stringify(patternsArray));
    } catch (error) {
      console.warn('Failed to persist TDD patterns:', error);
    }
  }

  public getTDDPatterns(): TDDPattern[] {
    return Array.from(this.tddPatterns.values());
  }

  public getTDDStats(): any {
    const patterns = this.getTDDPatterns();
    return {
      totalPatterns: patterns.length,
      averageTestCoverage: patterns.reduce((acc, p) => acc + p.tddMetrics.testCoverage, 0) / patterns.length,
      averageTestQuality: patterns.reduce((acc, p) => acc + p.tddMetrics.testQuality, 0) / patterns.length,
      failureModeDistribution: this.getTopFailureModes(patterns),
      testFirstRecommendations: patterns.filter(p => p.preventionStrategy.testFirst).length
    };
  }
}

// Global singleton instance
export const tddFailurePatterns = new TDDFailurePatterns();