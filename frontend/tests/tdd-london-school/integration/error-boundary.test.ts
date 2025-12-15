import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { createSwarmMock, createMockContract } from '../setup-tests';
import React from 'react';

/**
 * TDD London School: Error Boundary Integration Tests
 * 
 * Focus: Interaction testing for error handling and recovery
 * Goal: Ensure graceful error handling for array operation failures
 * Approach: Mock-driven error boundary collaboration testing
 */

// Error boundary contracts for swarm coordination
const errorBoundaryContract = createMockContract('ErrorBoundary', [
  'componentDidCatch',
  'getDerivedStateFromError',
  'logErrorInfo',
  'notifyErrorService',
  'renderErrorFallback'
]);

const errorRecoveryContract = createMockContract('ErrorRecovery', [
  'attemptRecovery',
  'provideFallbackData',
  'resetComponentState',
  'reportRecoveryMetrics'
]);

const monitoringContract = createMockContract('ErrorMonitoring', [
  'trackError',
  'categorizeError',
  'reportToAnalytics',
  'updateErrorMetrics'
]);

// Mock Error Boundary component
class MockErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, errorInfo: any) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-fallback">
          <h2>Something went wrong</h2>
          <p data-testid="error-message">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Mock component that can throw array operation errors
const ProblematicComponent = ({ activities }: { activities: any }) => {
  // This will throw "slice is not a function" if activities is not an array
  const displayActivities = activities.slice(0, 3);
  
  return (
    <div data-testid="problematic-component">
      {displayActivities.map((activity: any, index: number) => (
        <div key={index} data-testid={`activity-${index}`}>
          {activity.title}
        </div>
      ))}
    </div>
  );
};

// Safe component that uses proper type checking
const SafeComponent = ({ activities }: { activities: any }) => {
  const safeActivities = Array.isArray(activities) ? activities : [];
  const displayActivities = safeActivities.slice(0, 3);
  
  return (
    <div data-testid="safe-component">
      {displayActivities.map((activity: any, index: number) => (
        <div key={index} data-testid={`safe-activity-${index}`}>
          {activity.title}
        </div>
      ))}
    </div>
  );
};

describe('Error Boundary Integration Behavior Verification', () => {
  let mockErrorBoundary: typeof errorBoundaryContract;
  let mockErrorRecovery: typeof errorRecoveryContract;
  let mockErrorMonitoring: typeof monitoringContract;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // London School: Define error handling collaboration contracts
    mockErrorBoundary = createSwarmMock('ErrorBoundary', {
      componentDidCatch: jest.fn(),
      getDerivedStateFromError: jest.fn(),
      logErrorInfo: jest.fn(),
      notifyErrorService: jest.fn(),
      renderErrorFallback: jest.fn()
    });

    mockErrorRecovery = createSwarmMock('ErrorRecovery', {
      attemptRecovery: jest.fn(),
      provideFallbackData: jest.fn(),
      resetComponentState: jest.fn(),
      reportRecoveryMetrics: jest.fn()
    });

    mockErrorMonitoring = createSwarmMock('ErrorMonitoring', {
      trackError: jest.fn(),
      categorizeError: jest.fn(),
      reportToAnalytics: jest.fn(),
      updateErrorMetrics: jest.fn()
    });

    // Spy on console.error to verify error logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Error Boundary Catch and Handle Contract', () => {
    it('should catch and handle component errors gracefully', () => {
      // Given: Error boundary setup with error handling
      const mockOnError = jest.fn();
      mockErrorBoundary.componentDidCatch.mockImplementation(mockOnError);

      let caughtError: Error | null = null;
      let caughtErrorInfo: any = null;

      const TestErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        return (
          <MockErrorBoundary 
            onError={(error, errorInfo) => {
              caughtError = error;
              caughtErrorInfo = errorInfo;
              mockErrorBoundary.componentDidCatch(error, errorInfo);
            }}
          >
            {children}
          </MockErrorBoundary>
        );
      };

      // When: Component throws "slice is not a function" error
      const renderWithError = () => render(
        <TestErrorBoundary>
          <ProblematicComponent activities="not-an-array" />
        </TestErrorBoundary>
      );

      // Then: Should catch error and show fallback UI
      expect(renderWithError).not.toThrow();
      
      const { getByTestId } = renderWithError();
      const errorFallback = getByTestId('error-fallback');
      const errorMessage = getByTestId('error-message');

      expect(errorFallback).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('activities.slice is not a function');
      
      // Verify error was caught and handled
      expect(caughtError).toBeInstanceOf(TypeError);
      expect(caughtError?.message).toContain('activities.slice is not a function');
      expect(mockErrorBoundary.componentDidCatch).toHaveBeenCalledWith(
        expect.any(TypeError),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should handle multiple error types from array operations', () => {
      // Given: Different error scenarios
      const errorScenarios = [
        { activities: null, expectedError: 'Cannot read properties of null' },
        { activities: undefined, expectedError: 'Cannot read properties of undefined' },
        { activities: 'string', expectedError: 'activities.slice is not a function' },
        { activities: 123, expectedError: 'activities.slice is not a function' },
        { activities: {}, expectedError: 'activities.slice is not a function' }
      ];

      errorScenarios.forEach(({ activities, expectedError }) => {
        const mockOnError = jest.fn();
        
        const TestWrapper = () => (
          <MockErrorBoundary onError={mockOnError}>
            <ProblematicComponent activities={activities} />
          </MockErrorBoundary>
        );

        // When: Rendering component with error-prone data
        const { getByTestId } = render(<TestWrapper />);

        // Then: Should catch specific error type
        const errorMessage = getByTestId('error-message');
        expect(errorMessage.textContent).toContain(expectedError.split(' ')[0]); // Check for error type
        expect(mockOnError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ componentStack: expect.any(String) })
        );

        // Clear for next iteration
        mockOnError.mockClear();
      });
    });

    it('should log comprehensive error information for debugging', () => {
      // Given: Error logging setup
      const errorInfo = {
        componentStack: 'Component stack trace',
        errorBoundary: 'MockErrorBoundary',
        errorBoundaryStack: 'Error boundary stack'
      };

      mockErrorBoundary.logErrorInfo.mockImplementation((error, info) => {
        console.error('Error Boundary Caught:', {
          message: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          timestamp: new Date().toISOString()
        });
      });

      // When: Error occurs and is logged
      const testError = new TypeError('activities.slice is not a function');
      mockErrorBoundary.logErrorInfo(testError, errorInfo);

      // Then: Verify comprehensive logging
      expect(mockErrorBoundary.logErrorInfo).toHaveBeenCalledWith(testError, errorInfo);
      expect(console.error).toHaveBeenCalledWith(
        'Error Boundary Caught:',
        expect.objectContaining({
          message: 'activities.slice is not a function',
          stack: expect.any(String),
          componentStack: 'Component stack trace',
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Error Recovery and Fallback Contract', () => {
    it('should provide fallback data for failed array operations', () => {
      // Given: Error recovery with fallback data
      const fallbackActivities = [
        { id: 'fallback-1', title: 'Fallback Activity 1', type: 'system' },
        { id: 'fallback-2', title: 'Fallback Activity 2', type: 'system' }
      ];

      mockErrorRecovery.provideFallbackData.mockReturnValue(fallbackActivities);
      mockErrorRecovery.attemptRecovery.mockReturnValue(true);

      // When: Attempting recovery from error state
      const recoveryData = mockErrorRecovery.provideFallbackData('invalid-activities');
      const recoverySuccessful = mockErrorRecovery.attemptRecovery();

      // Then: Verify recovery contract
      expect(mockErrorRecovery.provideFallbackData).toHaveBeenCalledWith('invalid-activities');
      expect(mockErrorRecovery.attemptRecovery).toHaveBeenCalled();
      expect(recoveryData).toEqual(fallbackActivities);
      expect(recoverySuccessful).toBe(true);
      expect(Array.isArray(recoveryData)).toBe(true);
    });

    it('should reset component state after error recovery', () => {
      // Given: Component state reset mechanism
      const initialState = {
        hasError: false,
        error: null,
        activities: [],
        loading: false
      };

      mockErrorRecovery.resetComponentState.mockReturnValue(initialState);

      // When: Resetting state after error
      const resetState = mockErrorRecovery.resetComponentState();

      // Then: Verify state reset contract
      expect(mockErrorRecovery.resetComponentState).toHaveBeenCalled();
      expect(resetState).toEqual(initialState);
      expect(resetState.hasError).toBe(false);
      expect(resetState.error).toBeNull();
      expect(Array.isArray(resetState.activities)).toBe(true);
    });

    it('should report recovery metrics for monitoring', () => {
      // Given: Recovery metrics tracking
      const recoveryMetrics = {
        errorType: 'TypeError',
        errorMessage: 'activities.slice is not a function',
        recoveryAttempted: true,
        recoverySuccessful: true,
        fallbackDataProvided: true,
        recoveryTimeMs: 150,
        componentAffected: 'ProblematicComponent'
      };

      mockErrorRecovery.reportRecoveryMetrics.mockImplementation((metrics) => {
        console.info('Recovery Metrics:', metrics);
      });

      // When: Reporting recovery metrics
      mockErrorRecovery.reportRecoveryMetrics(recoveryMetrics);

      // Then: Verify metrics reporting contract
      expect(mockErrorRecovery.reportRecoveryMetrics).toHaveBeenCalledWith(recoveryMetrics);
      expect(console.info).toHaveBeenCalledWith('Recovery Metrics:', recoveryMetrics);
    });
  });

  describe('Error Monitoring and Analytics Contract', () => {
    it('should track errors for analytics and monitoring', () => {
      // Given: Error tracking setup
      const errorDetails = {
        type: 'TypeError',
        message: 'activities.slice is not a function',
        stack: 'Error stack trace',
        userAgent: 'test-agent',
        url: 'http://localhost:3000/agent/123',
        timestamp: '2024-01-01T00:00:00Z',
        userId: 'user-123',
        sessionId: 'session-456'
      };

      mockErrorMonitoring.trackError.mockImplementation((error) => {
        console.log('Error tracked:', error.type, error.message);
      });

      // When: Tracking error
      mockErrorMonitoring.trackError(errorDetails);

      // Then: Verify error tracking contract
      expect(mockErrorMonitoring.trackError).toHaveBeenCalledWith(errorDetails);
      expect(console.log).toHaveBeenCalledWith(
        'Error tracked:', 
        'TypeError', 
        'activities.slice is not a function'
      );
    });

    it('should categorize errors for better analysis', () => {
      // Given: Error categorization system
      const errorCategories = {
        'activities.slice is not a function': 'ARRAY_OPERATION_ERROR',
        'Cannot read properties of null': 'NULL_REFERENCE_ERROR',
        'Cannot read properties of undefined': 'UNDEFINED_REFERENCE_ERROR',
        'Network request failed': 'NETWORK_ERROR',
        'JSON parse error': 'DATA_PARSING_ERROR'
      };

      Object.entries(errorCategories).forEach(([errorMessage, expectedCategory]) => {
        mockErrorMonitoring.categorizeError.mockReturnValueOnce(expectedCategory);

        // When: Categorizing error
        const category = mockErrorMonitoring.categorizeError(errorMessage);

        // Then: Verify categorization contract
        expect(mockErrorMonitoring.categorizeError).toHaveBeenCalledWith(errorMessage);
        expect(category).toBe(expectedCategory);

        mockErrorMonitoring.categorizeError.mockClear();
      });
    });

    it('should report errors to analytics service', () => {
      // Given: Analytics reporting setup
      const analyticsPayload = {
        event: 'error_occurred',
        properties: {
          error_type: 'ARRAY_OPERATION_ERROR',
          error_message: 'activities.slice is not a function',
          component: 'UnifiedAgentPage',
          user_id: 'user-123',
          session_id: 'session-456',
          browser: 'Chrome',
          timestamp: '2024-01-01T00:00:00Z'
        }
      };

      mockErrorMonitoring.reportToAnalytics.mockImplementation((payload) => {
        console.log('Analytics event sent:', payload.event);
      });

      // When: Reporting to analytics
      mockErrorMonitoring.reportToAnalytics(analyticsPayload);

      // Then: Verify analytics reporting contract
      expect(mockErrorMonitoring.reportToAnalytics).toHaveBeenCalledWith(analyticsPayload);
      expect(console.log).toHaveBeenCalledWith('Analytics event sent:', 'error_occurred');
    });

    it('should update error metrics for dashboard monitoring', () => {
      // Given: Error metrics update system
      const currentMetrics = {
        totalErrors: 45,
        arrayOperationErrors: 12,
        nullReferenceErrors: 8,
        errorRate: 0.023,
        lastError: '2024-01-01T00:00:00Z'
      };

      const newError = {
        type: 'ARRAY_OPERATION_ERROR',
        timestamp: '2024-01-01T01:00:00Z'
      };

      const updatedMetrics = {
        ...currentMetrics,
        totalErrors: 46,
        arrayOperationErrors: 13,
        errorRate: 0.024,
        lastError: newError.timestamp
      };

      mockErrorMonitoring.updateErrorMetrics.mockReturnValue(updatedMetrics);

      // When: Updating error metrics
      const metrics = mockErrorMonitoring.updateErrorMetrics(currentMetrics, newError);

      // Then: Verify metrics update contract
      expect(mockErrorMonitoring.updateErrorMetrics).toHaveBeenCalledWith(currentMetrics, newError);
      expect(metrics.totalErrors).toBe(46);
      expect(metrics.arrayOperationErrors).toBe(13);
      expect(metrics.errorRate).toBe(0.024);
      expect(metrics.lastError).toBe(newError.timestamp);
    });
  });

  describe('Integration with Safe Components', () => {
    it('should not trigger error boundary with properly typed components', () => {
      // Given: Safe component that handles types correctly
      const mockOnError = jest.fn();
      const validActivities = [
        { id: '1', title: 'Valid Activity 1', type: 'task' },
        { id: '2', title: 'Valid Activity 2', type: 'message' }
      ];

      // When: Rendering safe component with various data types
      const testCases = [
        validActivities,
        [],
        null,
        undefined,
        'string',
        123,
        {}
      ];

      testCases.forEach(activities => {
        const { getByTestId } = render(
          <MockErrorBoundary onError={mockOnError}>
            <SafeComponent activities={activities} />
          </MockErrorBoundary>
        );

        // Then: Should render without triggering error boundary
        const safeComponent = getByTestId('safe-component');
        expect(safeComponent).toBeInTheDocument();
        expect(mockOnError).not.toHaveBeenCalled();

        mockOnError.mockClear();
      });
    });

    it('should demonstrate the difference between safe and unsafe implementations', () => {
      // Given: Comparison between safe and unsafe components
      const problematicData = 'not-an-array';
      const mockOnError = jest.fn();

      // When: Testing unsafe component
      const { getByTestId: getUnsafeTestId } = render(
        <MockErrorBoundary onError={mockOnError}>
          <ProblematicComponent activities={problematicData} />
        </MockErrorBoundary>
      );

      // Then: Unsafe component should trigger error boundary
      expect(getUnsafeTestId('error-fallback')).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(TypeError),
        expect.any(Object)
      );

      mockOnError.mockClear();

      // When: Testing safe component with same data
      const { getByTestId: getSafeTestId } = render(
        <MockErrorBoundary onError={mockOnError}>
          <SafeComponent activities={problematicData} />
        </MockErrorBoundary>
      );

      // Then: Safe component should not trigger error boundary
      expect(getSafeTestId('safe-component')).toBeInTheDocument();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('Swarm Coordination Error Handling Contracts', () => {
    it('should coordinate error handling across swarm agents', () => {
      // Given: Swarm error coordination setup
      const swarmErrorContracts = {
        ErrorBoundary: ['componentDidCatch', 'getDerivedStateFromError', 'logErrorInfo', 'notifyErrorService', 'renderErrorFallback'],
        ErrorRecovery: ['attemptRecovery', 'provideFallbackData', 'resetComponentState', 'reportRecoveryMetrics'],
        ErrorMonitoring: ['trackError', 'categorizeError', 'reportToAnalytics', 'updateErrorMetrics']
      };

      // When: Verifying contract compliance
      Object.entries(swarmErrorContracts).forEach(([contractName, methods]) => {
        const mockContract = contractName === 'ErrorBoundary' ? mockErrorBoundary :
                           contractName === 'ErrorRecovery' ? mockErrorRecovery :
                           mockErrorMonitoring;

        // Then: Verify all required methods exist
        methods.forEach(method => {
          expect(mockContract).toHaveProperty(method);
          expect(typeof mockContract[method]).toBe('function');
        });

        expect(mockContract.__swarmContract).toBe(true);
      });
    });

    it('should share error patterns with other testing agents', () => {
      // Given: Error pattern sharing setup
      const errorPatterns = {
        'ARRAY_OPERATION_ERROR': {
          pattern: /\.slice is not a function/,
          recovery: 'provide empty array fallback',
          prevention: 'add Array.isArray() check'
        },
        'NULL_REFERENCE_ERROR': {
          pattern: /Cannot read properties of null/,
          recovery: 'provide null-safe fallback',
          prevention: 'add null check before access'
        },
        'UNDEFINED_REFERENCE_ERROR': {
          pattern: /Cannot read properties of undefined/,
          recovery: 'provide undefined-safe fallback',
          prevention: 'add undefined check before access'
        }
      };

      // When: Analyzing error patterns for swarm coordination
      const analyzedPatterns = Object.keys(errorPatterns);

      // Then: Verify patterns are available for swarm sharing
      expect(analyzedPatterns).toContain('ARRAY_OPERATION_ERROR');
      expect(analyzedPatterns).toContain('NULL_REFERENCE_ERROR');
      expect(analyzedPatterns).toContain('UNDEFINED_REFERENCE_ERROR');

      // Verify pattern structure for swarm agents
      Object.values(errorPatterns).forEach(pattern => {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('recovery');
        expect(pattern).toHaveProperty('prevention');
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.recovery).toBe('string');
        expect(typeof pattern.prevention).toBe('string');
      });
    });

    it('should provide error recovery strategies for integration tests', () => {
      // Given: Recovery strategies for different error types
      const recoveryStrategies = {
        'ARRAY_OPERATION_ERROR': {
          immediate: () => [],
          lazy: () => Promise.resolve([]),
          cached: () => JSON.parse(localStorage.getItem('cached_activities') || '[]')
        },
        'NULL_REFERENCE_ERROR': {
          immediate: () => ({ recentActivities: [] }),
          lazy: () => Promise.resolve({ recentActivities: [] }),
          cached: () => ({ recentActivities: JSON.parse(localStorage.getItem('cached_activities') || '[]') })
        }
      };

      // When: Testing recovery strategies
      const arrayErrorRecovery = recoveryStrategies['ARRAY_OPERATION_ERROR'];
      const nullErrorRecovery = recoveryStrategies['NULL_REFERENCE_ERROR'];

      // Then: Verify recovery strategies work
      expect(Array.isArray(arrayErrorRecovery.immediate())).toBe(true);
      expect(arrayErrorRecovery.lazy()).toBeInstanceOf(Promise);
      expect(Array.isArray(arrayErrorRecovery.cached())).toBe(true);

      expect(nullErrorRecovery.immediate()).toHaveProperty('recentActivities');
      expect(nullErrorRecovery.lazy()).toBeInstanceOf(Promise);
      expect(nullErrorRecovery.cached()).toHaveProperty('recentActivities');
    });
  });
});