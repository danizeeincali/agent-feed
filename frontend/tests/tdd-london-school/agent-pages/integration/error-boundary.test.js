/**
 * TDD London School: Error Boundary Integration Tests
 * Focus: Error handling collaboration and recovery workflows
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  createSwarmMocks, 
  createMockErrorResponse,
  mockFactory 
} from '../mocks';

// Mock Error Boundary Component
const createMockErrorBoundary = () => {
  return class MockErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null, errorInfo: null };
      
      // Mock methods for testing
      this.componentDidCatch = jest.fn((error, errorInfo) => {
        this.setState({ hasError: true, error, errorInfo });
        if (this.props.onError) {
          this.props.onError(error, errorInfo);
        }
      });
      
      this.retry = jest.fn(() => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onRetry) {
          this.props.onRetry();
        }
      });
    }
    
    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
      this.componentDidCatch(error, errorInfo);
    }
    
    render() {
      if (this.state.hasError) {
        return (
          <div data-testid="error-boundary-fallback">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
            <button onClick={this.retry} data-testid="retry-button">
              Retry
            </button>
          </div>
        );
      }
      
      return this.props.children;
    }
  };
};

// Mock failing component
const createMockFailingComponent = (errorType = 'render') => {
  return function MockFailingComponent({ shouldFail, onError, errorService }) {
    React.useEffect(() => {
      if (shouldFail && errorType === 'effect') {
        const error = new Error('Effect error');
        if (onError) onError(error);
        throw error;
      }
    }, [shouldFail, onError]);
    
    if (shouldFail && errorType === 'render') {
      throw new Error('Render error');
    }
    
    return <div data-testid="working-component">Component working</div>;
  };
};

describe('Error Boundary Integration - London School TDD', () => {
  let swarmMocks;
  let mockErrorService;
  let mockRecoveryService;
  let MockErrorBoundary;
  
  beforeEach(() => {
    swarmMocks = createSwarmMocks();
    MockErrorBoundary = createMockErrorBoundary();
    
    // Mock error service for error handling coordination
    mockErrorService = {
      logError: jest.fn(),
      categorizeError: jest.fn(),
      shouldRetry: jest.fn(),
      getRecoveryStrategy: jest.fn(),
      reportError: jest.fn()
    };
    
    // Mock recovery service for error recovery workflows
    mockRecoveryService = {
      attemptRecovery: jest.fn(),
      fallbackToDefault: jest.fn(),
      notifyUser: jest.fn(),
      resetState: jest.fn()
    };
    
    // Set default successful behaviors
    mockErrorService.shouldRetry.mockReturnValue(true);
    mockErrorService.getRecoveryStrategy.mockReturnValue('retry');
    mockRecoveryService.attemptRecovery.mockResolvedValue({ success: true });
  });

  describe('Error Boundary Activation Contract', () => {
    it('should coordinate error boundary activation on component failure', () => {
      // Arrange: Component that will fail
      const MockFailingComponent = createMockFailingComponent('render');
      const errorHandler = jest.fn();
      
      mockErrorService.logError.mockReturnValue({ logged: true, id: 'error-123' });
      
      // Act: Render failing component within error boundary
      let errorBoundaryRef;
      render(
        <MockErrorBoundary 
          ref={ref => errorBoundaryRef = ref}
          onError={errorHandler}
          errorService={mockErrorService}
        >
          <MockFailingComponent shouldFail={true} />
        </MockErrorBoundary>
      );
      
      // Assert: Verify error boundary activation workflow
      expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Render error')).toBeInTheDocument();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should coordinate error categorization and logging workflow', () => {
      // Arrange: Error categorization setup
      const MockFailingComponent = createMockFailingComponent('render');
      const testError = new Error('Test error');
      
      mockErrorService.categorizeError.mockReturnValue({
        category: 'component_error',
        severity: 'high',
        recoverable: true
      });
      
      const errorBoundaryHandler = jest.fn((error, errorInfo) => {
        const category = mockErrorService.categorizeError(error);
        mockErrorService.logError(error, { ...errorInfo, category });
      });
      
      // Act: Trigger error and handle categorization
      render(
        <MockErrorBoundary 
          onError={errorBoundaryHandler}
          errorService={mockErrorService}
        >
          <MockFailingComponent shouldFail={true} />
        </MockErrorBoundary>
      );
      
      // Assert: Verify error categorization workflow
      expect(errorBoundaryHandler).toHaveBeenCalled();
      expect(mockErrorService.categorizeError).toHaveBeenCalledWith(expect.any(Error));
      expect(mockErrorService.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ 
          category: expect.objectContaining({
            category: 'component_error',
            severity: 'high',
            recoverable: true
          })
        })
      );
    });
  });

  describe('Error Recovery Workflow Contract', () => {
    it('should coordinate error recovery attempt workflow', async () => {
      // Arrange: Recoverable error scenario
      const MockFailingComponent = createMockFailingComponent('render');
      let shouldFail = true;
      
      mockErrorService.shouldRetry.mockReturnValue(true);
      mockRecoveryService.attemptRecovery.mockResolvedValue({ success: true });
      
      const retryHandler = jest.fn(async () => {
        if (mockErrorService.shouldRetry()) {
          const recovery = await mockRecoveryService.attemptRecovery();
          if (recovery.success) {
            shouldFail = false;
            return true;
          }
        }
        return false;
      });
      
      // Act: Render error boundary and attempt recovery
      let errorBoundaryRef;
      const { rerender } = render(
        <MockErrorBoundary 
          ref={ref => errorBoundaryRef = ref}
          onRetry={retryHandler}
          errorService={mockErrorService}
          recoveryService={mockRecoveryService}
        >
          <MockFailingComponent shouldFail={shouldFail} />
        </MockErrorBoundary>
      );
      
      // Click retry button
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);
      
      // Wait for recovery attempt
      await waitFor(() => {
        expect(retryHandler).toHaveBeenCalled();
      });
      
      // Assert: Verify recovery workflow
      expect(mockErrorService.shouldRetry).toHaveBeenCalled();
      expect(mockRecoveryService.attemptRecovery).toHaveBeenCalled();
      expect(retryHandler).toHaveBeenCalled();
    });

    it('should coordinate fallback strategy when recovery fails', async () => {
      // Arrange: Recovery failure scenario
      const MockFailingComponent = createMockFailingComponent('render');
      
      mockErrorService.shouldRetry.mockReturnValue(true);
      mockRecoveryService.attemptRecovery.mockResolvedValue({ success: false });
      mockRecoveryService.fallbackToDefault.mockResolvedValue({
        component: 'DefaultErrorPage',
        data: { message: 'Service temporarily unavailable' }
      });
      
      const fallbackHandler = jest.fn(async () => {
        const recovery = await mockRecoveryService.attemptRecovery();
        if (!recovery.success) {
          return await mockRecoveryService.fallbackToDefault();
        }
        return null;
      });
      
      // Act: Trigger fallback workflow
      render(
        <MockErrorBoundary 
          onRetry={fallbackHandler}
          errorService={mockErrorService}
          recoveryService={mockRecoveryService}
        >
          <MockFailingComponent shouldFail={true} />
        </MockErrorBoundary>
      );
      
      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(fallbackHandler).toHaveBeenCalled();
      });
      
      // Assert: Verify fallback workflow
      expect(mockRecoveryService.attemptRecovery).toHaveBeenCalled();
      expect(mockRecoveryService.fallbackToDefault).toHaveBeenCalled();
    });
  });

  describe('Agent Page Error Scenarios Contract', () => {
    it('should coordinate agent page loading error handling', async () => {
      // Arrange: Agent page loading failure
      const pageId = 'dashboard';
      const loadingError = createMockErrorResponse(500, 'Failed to load agent page');
      
      const mockAgentPageLoader = {
        loadPage: jest.fn().mockRejectedValue(loadingError),
        handleLoadError: jest.fn()
      };
      
      const MockAgentPageComponent = ({ pageId, loader, onError }) => {
        const [error, setError] = React.useState(null);
        
        React.useEffect(() => {
          loader.loadPage(pageId).catch(err => {
            setError(err);
            if (onError) onError(err);
          });
        }, [pageId, loader, onError]);
        
        if (error) {
          throw new Error(`Failed to load page: ${error.message}`);
        }
        
        return <div data-testid="agent-page">Agent page loaded</div>;
      };
      
      const errorHandler = jest.fn((error) => {
        mockAgentPageLoader.handleLoadError(error);
      });
      
      // Act: Render agent page component with error boundary
      render(
        <MockErrorBoundary onError={errorHandler}>
          <MockAgentPageComponent 
            pageId={pageId}
            loader={mockAgentPageLoader}
            onError={errorHandler}
          />
        </MockErrorBoundary>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
      
      // Assert: Verify agent page error handling
      expect(mockAgentPageLoader.loadPage).toHaveBeenCalledWith(pageId);
      expect(mockAgentPageLoader.handleLoadError).toHaveBeenCalledWith(loadingError);
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should coordinate component registry error handling', async () => {
      // Arrange: Component registry failure
      const componentId = 'task-widget';
      const registryError = new Error('Component registry unavailable');
      
      swarmMocks.componentRegistry.get.mockRejectedValue(registryError);
      
      const MockComponentWithRegistry = ({ componentId, registry, onError }) => {
        const [component, setComponent] = React.useState(null);
        
        React.useEffect(() => {
          registry.get(componentId)
            .then(setComponent)
            .catch(error => {
              if (onError) onError(error);
              throw error;
            });
        }, [componentId, registry, onError]);
        
        if (!component) return <div>Loading...</div>;
        return <div data-testid="registry-component">Component loaded</div>;
      };
      
      const registryErrorHandler = jest.fn();
      
      // Act: Render component with registry error
      render(
        <MockErrorBoundary onError={registryErrorHandler}>
          <MockComponentWithRegistry 
            componentId={componentId}
            registry={swarmMocks.componentRegistry}
            onError={registryErrorHandler}
          />
        </MockErrorBoundary>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
      });
      
      // Assert: Verify registry error handling
      expect(swarmMocks.componentRegistry.get).toHaveBeenCalledWith(componentId);
      expect(registryErrorHandler).toHaveBeenCalledWith(registryError);
    });
  });

  describe('Error Reporting and Monitoring Contract', () => {
    it('should coordinate error reporting workflow', async () => {
      // Arrange: Error reporting setup
      const MockFailingComponent = createMockFailingComponent('render');
      const testError = new Error('Critical error');
      
      mockErrorService.reportError.mockResolvedValue({
        reported: true,
        reportId: 'report-123',
        timestamp: new Date().toISOString()
      });
      
      const reportingHandler = jest.fn(async (error, errorInfo) => {
        const category = mockErrorService.categorizeError(error);
        if (category.severity === 'high') {
          await mockErrorService.reportError(error, { ...errorInfo, category });
        }
      });
      
      // Act: Trigger error and reporting
      render(
        <MockErrorBoundary 
          onError={reportingHandler}
          errorService={mockErrorService}
        >
          <MockFailingComponent shouldFail={true} />
        </MockErrorBoundary>
      );
      
      await waitFor(() => {
        expect(reportingHandler).toHaveBeenCalled();
      });
      
      // Assert: Verify error reporting workflow
      expect(mockErrorService.categorizeError).toHaveBeenCalled();
      expect(mockErrorService.reportError).toHaveBeenCalled();
    });

    it('should coordinate user notification for critical errors', async () => {
      // Arrange: Critical error notification
      const MockFailingComponent = createMockFailingComponent('render');
      
      mockErrorService.categorizeError.mockReturnValue({
        category: 'critical_error',
        severity: 'critical',
        userNotification: true
      });
      
      mockRecoveryService.notifyUser.mockResolvedValue({
        notified: true,
        method: 'toast'
      });
      
      const notificationHandler = jest.fn(async (error) => {
        const category = mockErrorService.categorizeError(error);
        if (category.userNotification) {
          await mockRecoveryService.notifyUser({
            message: 'A critical error occurred',
            severity: category.severity
          });
        }
      });
      
      // Act: Trigger critical error
      render(
        <MockErrorBoundary 
          onError={notificationHandler}
          errorService={mockErrorService}
          recoveryService={mockRecoveryService}
        >
          <MockFailingComponent shouldFail={true} />
        </MockErrorBoundary>
      );
      
      await waitFor(() => {
        expect(notificationHandler).toHaveBeenCalled();
      });
      
      // Assert: Verify user notification workflow
      expect(mockErrorService.categorizeError).toHaveBeenCalled();
      expect(mockRecoveryService.notifyUser).toHaveBeenCalledWith({
        message: 'A critical error occurred',
        severity: 'critical'
      });
    });
  });

  describe('Error Boundary Performance Contract', () => {
    it('should coordinate performance impact monitoring during errors', () => {
      // Arrange: Performance monitoring during error
      const MockFailingComponent = createMockFailingComponent('render');
      const mockPerformanceMonitor = {
        startErrorTiming: jest.fn(),
        endErrorTiming: jest.fn(),
        recordErrorMetrics: jest.fn()
      };
      
      const performanceErrorHandler = jest.fn((error, errorInfo) => {
        mockPerformanceMonitor.startErrorTiming('error-boundary');
        mockErrorService.logError(error, errorInfo);
        mockPerformanceMonitor.endErrorTiming('error-boundary');
        mockPerformanceMonitor.recordErrorMetrics({
          errorType: error.name,
          errorMessage: error.message,
          componentStack: errorInfo.componentStack
        });
      });
      
      // Act: Trigger error with performance monitoring
      render(
        <MockErrorBoundary 
          onError={performanceErrorHandler}
          performanceMonitor={mockPerformanceMonitor}
        >
          <MockFailingComponent shouldFail={true} />
        </MockErrorBoundary>
      );
      
      // Assert: Verify performance monitoring during error
      expect(performanceErrorHandler).toHaveBeenCalled();
      expect(mockPerformanceMonitor.startErrorTiming).toHaveBeenCalledWith('error-boundary');
      expect(mockPerformanceMonitor.endErrorTiming).toHaveBeenCalledWith('error-boundary');
      expect(mockPerformanceMonitor.recordErrorMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'Error',
          errorMessage: 'Render error'
        })
      );
    });
  });

  describe('Error Boundary Mock Contract Verification', () => {
    it('should verify error service contract', () => {
      expect(mockErrorService.logError).toBeDefined();
      expect(mockErrorService.categorizeError).toBeDefined();
      expect(mockErrorService.shouldRetry).toBeDefined();
      expect(mockErrorService.getRecoveryStrategy).toBeDefined();
      expect(mockErrorService.reportError).toBeDefined();
      
      expect(typeof mockErrorService.logError).toBe('function');
      expect(typeof mockErrorService.categorizeError).toBe('function');
      expect(typeof mockErrorService.shouldRetry).toBe('function');
    });

    it('should verify recovery service contract', () => {
      expect(mockRecoveryService.attemptRecovery).toBeDefined();
      expect(mockRecoveryService.fallbackToDefault).toBeDefined();
      expect(mockRecoveryService.notifyUser).toBeDefined();
      expect(mockRecoveryService.resetState).toBeDefined();
      
      expect(typeof mockRecoveryService.attemptRecovery).toBe('function');
      expect(typeof mockRecoveryService.fallbackToDefault).toBe('function');
      expect(typeof mockRecoveryService.notifyUser).toBe('function');
    });
  });
});