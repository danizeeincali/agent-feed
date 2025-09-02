/**
 * London School TDD Tests - DualModeClaudeManager Behavioral Verification
 * 
 * Focus: BEHAVIOR verification over state testing
 * Target: Prevent automatic Claude instance creation resource leak
 * 
 * Key Behaviors to Test:
 * 1. Component mounts WITHOUT calling createProductionFeedIntegration automatically
 * 2. Component only creates instances when user explicitly clicks initialize button
 * 3. Multiple mount/unmount cycles don't accumulate instances
 * 4. Navigation safety patterns prevent duplicate creation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { DualModeClaudeManager } from '../../../frontend/src/components/claude-manager/DualModeClaudeManager';
import { FeedIntegrationService, createProductionFeedIntegration } from '../../../frontend/src/services/FeedIntegrationService';

// London School: Mock ALL external dependencies to isolate behavior
const mockFeedIntegrationService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn(),
  on: jest.fn(),
  getWorkerStatus: jest.fn().mockResolvedValue({
    instanceId: 'test-instance-123',
    status: 'active',
    currentFeeds: 0,
    maxFeeds: 10,
    errorCount: 0,
    metrics: {
      totalFeedsProcessed: 0,
      successfulFeeds: 0,
      averageProcessingTime: 0,
      currentLoad: 0
    }
  })
};

const mockCreateProductionFeedIntegration = jest.fn().mockReturnValue(mockFeedIntegrationService);

// Mock the entire module to control createProductionFeedIntegration calls
jest.mock('../../../frontend/src/services/FeedIntegrationService', () => ({
  FeedIntegrationService: jest.fn(),
  createProductionFeedIntegration: jest.fn(),
  FeedWorkerStatus: {}
}));

// Mock Radix UI components to avoid complexity
jest.mock('@radix-ui/react-tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div className={className} data-testid="tabs-root">
      <div data-current-tab={value}>{children}</div>
    </div>
  ),
  TabsList: ({ children, className }: any) => <div className={className}>{children}</div>,
  TabsTrigger: ({ children, value, className }: any) => (
    <button className={className} data-tab={value} onClick={() => {}}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value, className }: any) => (
    <div className={className} data-tab-content={value}>
      {children}
    </div>
  )
}));

describe('DualModeClaudeManager - London School TDD: Resource Leak Prevention', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup the mock to return our controlled mock service
    (createProductionFeedIntegration as jest.Mock).mockImplementation(mockCreateProductionFeedIntegration);
    
    // Clear any DOM elements
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * CRITICAL BEHAVIOR: Component MUST NOT auto-initialize on mount
   * This was the root cause of the resource leak bug
   */
  describe('Automatic Initialization Prevention', () => {
    it('MUST NOT call createProductionFeedIntegration automatically on mount', async () => {
      // London School: Verify interaction doesn't happen (behavior focus)
      
      await act(async () => {
        render(<DualModeClaudeManager enableFeedIntegration={true} />);
      });

      // CRITICAL: Verify NO automatic service creation
      expect(mockCreateProductionFeedIntegration).not.toHaveBeenCalled();
      expect(mockFeedIntegrationService.initialize).not.toHaveBeenCalled();
      
      // Verify component renders in uninitialized state
      expect(screen.getByText('Initialize Feed Integration')).toBeInTheDocument();
    });

    it('MUST NOT call createProductionFeedIntegration on multiple mounts', async () => {
      // Simulate React StrictMode double execution + navigation patterns
      
      // First mount
      const { unmount: unmount1 } = render(<DualModeClaudeManager enableFeedIntegration={true} />);
      
      await act(async () => {
        unmount1();
      });

      // Second mount (simulating navigation back)
      const { unmount: unmount2 } = render(<DualModeClaudeManager enableFeedIntegration={true} />);
      
      await act(async () => {
        unmount2();
      });

      // Third mount (simulating another navigation)
      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      // VERIFY: Zero automatic calls despite multiple mounts
      expect(mockCreateProductionFeedIntegration).not.toHaveBeenCalled();
    });

    it('MUST remain in uninitialized state until user action', () => {
      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      // Verify initial state UI elements
      expect(screen.getByText('Feed Integration Setup')).toBeInTheDocument();
      expect(screen.getByText('Initialize Feed Integration')).toBeInTheDocument();
      
      // Verify no worker status is shown (uninitialized)
      expect(screen.queryByText('Worker Instance Status')).not.toBeInTheDocument();
    });
  });

  /**
   * USER-CONTROLLED INITIALIZATION: Only when user explicitly clicks
   */
  describe('User-Controlled Initialization Behavior', () => {
    it('MUST create feed integration only when user clicks initialize button', async () => {
      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      // Verify no automatic call
      expect(mockCreateProductionFeedIntegration).not.toHaveBeenCalled();

      // User clicks initialize button
      const initButton = screen.getByText('Initialize Feed Integration');
      
      await act(async () => {
        fireEvent.click(initButton);
      });

      // VERIFY: Now the service creation should be called
      expect(mockCreateProductionFeedIntegration).toHaveBeenCalledTimes(1);
      expect(mockCreateProductionFeedIntegration).toHaveBeenCalledWith('http://localhost:3000');
      expect(mockFeedIntegrationService.initialize).toHaveBeenCalledTimes(1);
    });

    it('MUST prevent duplicate initialization calls from multiple button clicks', async () => {
      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      const initButton = screen.getByText('Initialize Feed Integration');
      
      // First click
      await act(async () => {
        fireEvent.click(initButton);
      });

      // Wait for initialization to complete
      await waitFor(() => {
        expect(mockFeedIntegrationService.initialize).toHaveBeenCalledTimes(1);
      });

      // Try to click again (should be prevented by isInitialized state)
      const potentialSecondButton = screen.queryByText('Initialize Feed Integration');
      
      if (potentialSecondButton) {
        await act(async () => {
          fireEvent.click(potentialSecondButton);
        });
      }

      // VERIFY: Only one initialization call despite multiple potential clicks
      expect(mockCreateProductionFeedIntegration).toHaveBeenCalledTimes(1);
      expect(mockFeedIntegrationService.initialize).toHaveBeenCalledTimes(1);
    });

    it('MUST show loading state during initialization', async () => {
      // Make initialization take time to test loading state
      mockFeedIntegrationService.initialize.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      const initButton = screen.getByText('Initialize Feed Integration');
      
      await act(async () => {
        fireEvent.click(initButton);
      });

      // Verify loading state is shown
      expect(screen.getByText('Initializing Feed Integration...')).toBeInTheDocument();
      expect(screen.getByText('Setting up feed integration service...')).toBeInTheDocument();

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.queryByText('Initializing Feed Integration...')).not.toBeInTheDocument();
      });
    });
  });

  /**
   * NAVIGATION SAFETY: Ensure navigation patterns don't create duplicates
   */
  describe('Navigation Safety and Cleanup Behavior', () => {
    it('MUST handle mount-unmount-mount cycles without resource leaks', async () => {
      // First mount and initialization
      const { unmount: unmount1 } = render(<DualModeClaudeManager enableFeedIntegration={true} />);
      
      const initButton1 = screen.getByText('Initialize Feed Integration');
      await act(async () => {
        fireEvent.click(initButton1);
      });

      await waitFor(() => {
        expect(mockFeedIntegrationService.initialize).toHaveBeenCalledTimes(1);
      });

      // Unmount (navigation away)
      await act(async () => {
        unmount1();
      });

      // Verify cleanup was called
      expect(mockFeedIntegrationService.cleanup).toHaveBeenCalledTimes(1);

      // Reset mocks to test new mount
      jest.clearAllMocks();
      (createProductionFeedIntegration as jest.Mock).mockImplementation(mockCreateProductionFeedIntegration);

      // Mount again (navigation back)
      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      // VERIFY: Component starts fresh, no automatic initialization
      expect(mockCreateProductionFeedIntegration).not.toHaveBeenCalled();
      expect(screen.getByText('Initialize Feed Integration')).toBeInTheDocument();
    });

    it('MUST call cleanup on unmount to prevent resource leaks', async () => {
      const { unmount } = render(<DualModeClaudeManager enableFeedIntegration={true} />);

      // Initialize the service
      const initButton = screen.getByText('Initialize Feed Integration');
      await act(async () => {
        fireEvent.click(initButton);
      });

      await waitFor(() => {
        expect(mockFeedIntegrationService.initialize).toHaveBeenCalled();
      });

      // Unmount the component
      await act(async () => {
        unmount();
      });

      // VERIFY: Cleanup was called to prevent resource leaks
      expect(mockFeedIntegrationService.cleanup).toHaveBeenCalledTimes(1);
    });

    it('MUST handle rapid mount/unmount sequences safely', async () => {
      // Simulate rapid navigation (common in SPA routing)
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<DualModeClaudeManager enableFeedIntegration={true} />);
        
        await act(async () => {
          unmount();
        });
      }

      // VERIFY: No automatic service creation despite rapid mounting
      expect(mockCreateProductionFeedIntegration).not.toHaveBeenCalled();
    });
  });

  /**
   * ERROR HANDLING: Ensure error states don't cause resource leaks
   */
  describe('Error Handling and Recovery Behavior', () => {
    it('MUST handle initialization failure without leaving resources hanging', async () => {
      // Mock initialization failure
      mockFeedIntegrationService.initialize.mockRejectedValue(new Error('Network timeout'));

      render(<DualModeClaudeManager enableFeedIntegration={true} />);

      const initButton = screen.getByText('Initialize Feed Integration');
      
      await act(async () => {
        fireEvent.click(initButton);
      });

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/Feed integration failed/)).toBeInTheDocument();
      });

      // VERIFY: Service was attempted but cleanup should still work
      expect(mockCreateProductionFeedIntegration).toHaveBeenCalledTimes(1);
      
      // VERIFY: Component allows retry (button should be available again)
      expect(screen.getByText('Initialize Feed Integration')).toBeInTheDocument();
    });

    it('MUST prevent initialization when enableFeedIntegration is false', async () => {
      render(<DualModeClaudeManager enableFeedIntegration={false} />);

      // VERIFY: No feed integration tab or button is available
      expect(screen.queryByText('Initialize Feed Integration')).not.toBeInTheDocument();
      expect(screen.queryByText('Feed Integration')).not.toBeInTheDocument();
      
      // VERIFY: No service creation occurs
      expect(mockCreateProductionFeedIntegration).not.toHaveBeenCalled();
    });
  });

  /**
   * CONTRACT VERIFICATION: Ensure proper interaction patterns
   */
  describe('Service Contract and Interaction Patterns', () => {
    it('MUST follow proper service initialization contract', async () => {
      render(<DualModeClaudeManager apiUrl="http://test:8080" enableFeedIntegration={true} />);

      const initButton = screen.getByText('Initialize Feed Integration');
      
      await act(async () => {
        fireEvent.click(initButton);
      });

      await waitFor(() => {
        expect(mockFeedIntegrationService.initialize).toHaveBeenCalled();
      });

      // VERIFY: Proper contract sequence
      expect(mockCreateProductionFeedIntegration).toHaveBeenCalledWith('http://test:8080');
      expect(mockFeedIntegrationService.initialize).toHaveBeenCalledAfter(mockCreateProductionFeedIntegration);
      
      // VERIFY: Event listeners are set up after initialization
      expect(mockFeedIntegrationService.on).toHaveBeenCalledWith('feed:integration:ready', expect.any(Function));
      expect(mockFeedIntegrationService.on).toHaveBeenCalledWith('feed:worker:failed', expect.any(Function));
      expect(mockFeedIntegrationService.on).toHaveBeenCalledWith('feed:worker:recovered', expect.any(Function));
    });
  });
});

/**
 * BEHAVIORAL VERIFICATION SUMMARY:
 * 
 * ✅ Component mounts WITHOUT auto-creating Claude instances
 * ✅ Only creates instances on explicit user button click  
 * ✅ Prevents duplicate initialization through state management
 * ✅ Handles mount/unmount cycles safely
 * ✅ Calls cleanup on unmount to prevent resource leaks
 * ✅ Proper error handling without resource hanging
 * ✅ Respects enableFeedIntegration flag
 * ✅ Follows proper service initialization contract
 */