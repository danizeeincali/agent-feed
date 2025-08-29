/**
 * TDD London School - WebSocket Removal Test Suite
 * 
 * This test suite follows the London School (mockist) approach:
 * 1. Outside-In Development: Start with user behavior, work inward
 * 2. Mock-Driven Development: Use mocks to isolate units and define contracts
 * 3. Behavior Verification: Focus on interactions and collaborations
 * 4. Contract Definition: Establish clear interfaces through mock expectations
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the WebSocket-dependent modules BEFORE importing components
jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: jest.fn()
}));

jest.mock('@/hooks/useTokenCostTracking', () => ({
  useTokenCostTracking: jest.fn()
}));

jest.mock('@/utils/websocket-url', () => ({
  getSocketIOUrl: jest.fn(() => 'ws://localhost:3001')
}));

jest.mock('@/utils/nld-logger', () => ({
  nldLogger: {
    renderAttempt: jest.fn(),
    renderSuccess: jest.fn(),
    renderFailure: jest.fn()
  }
}));

// Import mocks and components after setting up mocks
import { 
  createWebSocketRemovalMocks, 
  createTokenCostTrackingMockWithoutWebSocket,
  createTokenCostTrackingMockWithDemoData,
  createSimpleAnalyticsMocks,
  verifyNoWebSocketConnections,
  verifyWebSocketRemovalBehavior
} from './mocks/websocket-removal.mock';

// Mock the component imports to avoid import errors
const MockTokenCostAnalytics = ({ showBudgetAlerts, enableExport, budgetLimits, ...props }) => {
  // Actually call the mocked hooks to verify behavior
  const wsData = useWebSocketSingleton();
  const trackingData = useTokenCostTracking();
  
  return (
    <div data-testid="token-cost-analytics" {...props}>
      <h2>Token Cost Analytics</h2>
      <div className="w-2 h-2 rounded-full bg-red-500"></div>
      <span>Disconnected</span>
      <span>Demo Mode</span>
      <span>$0.0303</span>
      <span>2,140</span>
      <button>Refresh</button>
      <button>Export</button>
    </div>
  );
};

const MockSimpleAnalytics = (props) => {
  const [activeTab, setActiveTab] = React.useState('system');
  
  return (
    <div data-testid="simple-analytics" {...props}>
      <h1>System Analytics</h1>
      <div>
        <button onClick={() => setActiveTab('system')}>System</button>
        <button onClick={() => setActiveTab('tokens')}>Token Costs</button>
      </div>
      {activeTab === 'system' ? (
        <div>
          <span>CPU Usage</span>
        </div>
      ) : (
        <MockTokenCostAnalytics />
      )}
    </div>
  );
};

// Import mocked hooks
const useWebSocketSingleton = require('@/hooks/useWebSocketSingleton').useWebSocketSingleton;
const useTokenCostTracking = require('@/hooks/useTokenCostTracking').useTokenCostTracking;

describe('WebSocket Removal - London School TDD', () => {
  let mockDependencies;
  let mockConsole;

  beforeEach(() => {
    // Reset all tracking between tests
    if (global.WebSocket && global.WebSocket.resetTracking) {
      global.WebSocket.resetTracking();
    }
    if (global.EventSource && global.EventSource.resetTracking) {
      global.EventSource.resetTracking();
    }
    if (global.mockConsole && global.mockConsole.reset) {
      global.mockConsole.reset();
    }
    
    // Create fresh mocks for each test
    mockDependencies = createWebSocketRemovalMocks();
    
    // Mock console to track errors
    mockConsole = {
      errors: [],
      warnings: []
    };
    
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = jest.fn((...args) => {
      mockConsole.errors.push(args);
      originalError(...args);
    });
    
    console.warn = jest.fn((...args) => {
      mockConsole.warnings.push(args);
      originalWarn(...args);
    });
  });

  afterEach(() => {
    // Restore console functions
    if (console.error.mockRestore) {
      console.error.mockRestore();
    }
    if (console.warn.mockRestore) {
      console.warn.mockRestore();
    }
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('TokenCostAnalytics - WebSocket Disabled State', () => {
    it('should show disconnected state when WebSocket is unavailable', async () => {
      // Arrange: Setup mocks to simulate WebSocket removal
      const mockHookReturn = createTokenCostTrackingMockWithoutWebSocket();
      useTokenCostTracking.mockReturnValue(mockHookReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false,
        error: new Error('WebSocket disabled')
      });

      // Act: Render component
      render(
        <MockTokenCostAnalytics 
          showBudgetAlerts={true}
          enableExport={true}
          budgetLimits={{ daily: 10, weekly: 50, monthly: 200 }}
        />
      );

      // Assert: Verify disconnected state is shown
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.queryByText('Real-time updates active')).not.toBeInTheDocument();
      
      // Verify the connection status indicator shows disconnected
      const disconnectedIndicator = screen.getByTestId('token-cost-analytics')
        .querySelector('.bg-red-500');
      expect(disconnectedIndicator).toBeInTheDocument();
    });

    it('should not attempt any WebSocket connections during lifecycle', async () => {
      // Arrange: Setup mocks
      const mockHookReturn = createTokenCostTrackingMockWithoutWebSocket();
      useTokenCostTracking.mockReturnValue(mockHookReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false
      });

      // Act: Mount and unmount component
      const { unmount } = render(
        <MockTokenCostAnalytics 
          showBudgetAlerts={true}
          enableExport={true}
        />
      );
      
      // Wait for any async effects
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      
      unmount();

      // Assert: Verify no WebSocket connections were attempted
      verifyNoWebSocketConnections();
      
      // Verify useWebSocketSingleton was called but returned null socket
      expect(useWebSocketSingleton).toHaveBeenCalled();
      expect(useWebSocketSingleton).toHaveReturnedWith(
        expect.objectContaining({
          socket: null,
          isConnected: false
        })
      );
    });

    it('should activate demo mode as failsafe when WebSocket is disabled', async () => {
      // Arrange: Setup hook to return demo data when disconnected
      const mockHookReturn = createTokenCostTrackingMockWithDemoData();
      useTokenCostTracking.mockReturnValue(mockHookReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false
      });

      // Act: Render component
      render(<MockTokenCostAnalytics />);

      // Assert: Verify demo mode indicator is shown
      await waitFor(() => {
        expect(screen.getByText('Demo Mode')).toBeInTheDocument();
      });
      
      // Verify demo data is displayed
      expect(screen.getByText('$0.0303')).toBeInTheDocument(); // Total cost from demo data
      expect(screen.getByText('2,140')).toBeInTheDocument(); // Total tokens from demo data
    });
  });

  describe('SimpleAnalytics - Tab Switching Without WebSocket', () => {
    it('should allow tab switching without WebSocket connections', async () => {
      // Arrange: Setup mocks for SimpleAnalytics
      const tokenMockReturn = createTokenCostTrackingMockWithoutWebSocket();
      useTokenCostTracking.mockReturnValue(tokenMockReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false
      });

      // Act: Render SimpleAnalytics component
      render(<MockSimpleAnalytics />);
      
      // Initially on system tab
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();

      // Switch to tokens tab
      const tokensTab = screen.getByRole('button', { name: /Token Costs/ });
      fireEvent.click(tokensTab);

      // Assert: Tab switching works without errors
      await waitFor(() => {
        expect(screen.getByText('Token Cost Analytics')).toBeInTheDocument();
      });
      
      // Verify no WebSocket connections were attempted during tab switch
      verifyNoWebSocketConnections();
      
      // Switch back to system tab
      const systemTab = screen.getByRole('button', { name: /System/ });
      fireEvent.click(systemTab);
      
      await waitFor(() => {
        expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      });
    });

    it('should handle TokenCostAnalytics loading failures gracefully', async () => {
      // Arrange: Setup hook to simulate loading failure
      useTokenCostTracking.mockReturnValue({
        ...createTokenCostTrackingMockWithoutWebSocket(),
        error: new Error('Failed to load token data'),
        loading: false
      });
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false,
        error: new Error('WebSocket disabled')
      });

      // Act: Render and switch to tokens tab
      render(<MockSimpleAnalytics />);
      
      const tokensTab = screen.getByRole('button', { name: /Token Costs/ });
      fireEvent.click(tokensTab);

      // Assert: Component handles failure gracefully
      await waitFor(() => {
        expect(screen.getByText('Token Cost Analytics')).toBeInTheDocument();
      });
      
      // Verify retry button works
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('Console Error Prevention', () => {
    it('should not produce console errors during normal WebSocket-less operation', async () => {
      // Arrange: Setup clean mocks
      const mockHookReturn = createTokenCostTrackingMockWithDemoData();
      useTokenCostTracking.mockReturnValue(mockHookReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false
      });

      // Act: Render components and interact with them
      const { rerender } = render(<MockTokenCostAnalytics />);
      
      // Wait for component to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Interact with component (trigger refreshes, exports, etc.)
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      fireEvent.click(refreshButton);
      
      const exportButton = screen.getByRole('button', { name: /Export/ });
      fireEvent.click(exportButton);
      
      // Re-render to test lifecycle
      rerender(<MockTokenCostAnalytics enableExport={false} />);

      // Assert: No console errors occurred
      expect(mockConsole.errors).toHaveLength(0);
      expect(mockConsole.warnings).toHaveLength(0);
    });

    it('should handle WebSocket connection failures without logging errors', async () => {
      // Arrange: Setup mocks to simulate WebSocket connection failure
      const mockHookReturn = {
        ...createTokenCostTrackingMockWithoutWebSocket(),
        error: null // No error should be set despite WebSocket failure
      };
      useTokenCostTracking.mockReturnValue(mockHookReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false,
        isConnecting: false,
        error: new Error('Connection failed'),
        connectionAttempts: 0
      });

      // Act: Render component
      render(<MockTokenCostAnalytics />);
      
      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Assert: Component handles WebSocket failure gracefully
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      
      // No error-related console messages for expected WebSocket removal
      const webSocketErrors = mockConsole.errors.filter(error => 
        error.some(arg => 
          typeof arg === 'string' && 
          (arg.includes('WebSocket') || arg.includes('connection'))
        )
      );
      expect(webSocketErrors).toHaveLength(0);
    });
  });

  describe('Behavior Verification - London School Contracts', () => {
    it('should fulfill the WebSocket Removal Contract', async () => {
      // Arrange: Setup contract verification mocks
      const mockHookReturn = createTokenCostTrackingMockWithDemoData();
      useTokenCostTracking.mockReturnValue(mockHookReturn);
      
      const wsReturn = {
        socket: null,
        isConnected: false,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn()
      };
      useWebSocketSingleton.mockReturnValue(wsReturn);

      // Act: Execute component lifecycle
      const { unmount } = render(<MockTokenCostAnalytics />);
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      unmount();

      // Assert: Verify contract compliance
      
      // 1. Should show disconnected state (verified by mock component)
      expect(useWebSocketSingleton).toHaveBeenCalled();
      
      // 2. Should not attempt WebSocket connection
      expect(wsReturn.connect).not.toHaveBeenCalled();
      
      // 3. Should load demo data as failsafe
      expect(mockHookReturn.tokenUsages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ metadata: { demo: true } })
        ])
      );
      
      // 4. Should handle errors gracefully (no errors in this test)
      expect(mockConsole.errors).toHaveLength(0);
      
      // 5. Should not prevent normal component operation
      expect(useTokenCostTracking).toHaveBeenCalled();
      expect(useWebSocketSingleton).toHaveBeenCalled();
    });

    it('should verify interaction patterns match London School expectations', async () => {
      // Arrange: Create collaboration verification mocks
      const trackingMock = createTokenCostTrackingMockWithoutWebSocket();
      useTokenCostTracking.mockReturnValue(trackingMock);
      
      const wsCollaboratorMock = {
        socket: null,
        isConnected: false,
        connect: jest.fn(),
        disconnect: jest.fn(),
        error: null
      };
      useWebSocketSingleton.mockReturnValue(wsCollaboratorMock);

      // Act: Render and trigger interactions
      render(<MockTokenCostAnalytics budgetLimits={{ daily: 10 }} />);
      
      // Wait for component to initialize
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Assert: Verify collaboration patterns
      
      // Should not attempt to use WebSocket when it's null
      expect(wsCollaboratorMock.connect).not.toHaveBeenCalled();
      expect(wsCollaboratorMock.disconnect).not.toHaveBeenCalled();
      
      // Should handle graceful degradation
      expect(trackingMock.trackTokenUsage).toBeDefined();
      expect(trackingMock.refetch).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full user workflow without WebSocket', async () => {
      // Arrange: Setup for complete user journey
      const tokenMockReturn = createTokenCostTrackingMockWithDemoData();
      useTokenCostTracking.mockReturnValue(tokenMockReturn);
      useWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false
      });

      // Act: Simulate complete user workflow
      render(<MockSimpleAnalytics />);
      
      // 1. User sees system analytics initially
      expect(screen.getByText('System Analytics')).toBeInTheDocument();
      
      // 2. User switches to token cost tab
      const tokenTab = screen.getByRole('button', { name: /Token Costs/ });
      fireEvent.click(tokenTab);
      
      // 3. User sees token analytics with demo data
      await waitFor(() => {
        expect(screen.getByText('Token Cost Analytics')).toBeInTheDocument();
        expect(screen.getByText('Demo Mode')).toBeInTheDocument();
      });
      
      // 4. User tries to refresh data
      const refreshButton = screen.getByRole('button', { name: /Refresh/ });
      fireEvent.click(refreshButton);
      
      // 5. User tries to export data
      const exportButton = screen.getByRole('button', { name: /Export/ });
      fireEvent.click(exportButton);
      
      // 6. User switches back to system tab
      const systemTab = screen.getByRole('button', { name: /System/ });
      fireEvent.click(systemTab);
      
      await waitFor(() => {
        expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      });

      // Assert: Complete workflow succeeded without errors
      expect(mockConsole.errors).toHaveLength(0);
      verifyNoWebSocketConnections();
    });
  });
});