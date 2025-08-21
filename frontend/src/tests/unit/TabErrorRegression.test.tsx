import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import DualInstanceDashboardEnhanced from '../../components/DualInstanceDashboardEnhanced';

// Mock the useDualInstanceMonitoring hook
jest.mock('../../hooks/useDualInstanceMonitoring', () => ({
  useDualInstanceMonitoring: () => ({
    socket: { connected: true },
    isConnected: true,
    sendHandoffRequest: jest.fn(),
    sendConfirmation: jest.fn()
  })
}));

// TDD Test: Reproduce activities.filter error
describe('DualInstanceDashboard Tab Error Regression Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock fetch to return non-array data that causes the error
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          activities: null, // This causes the error - not an array!
          handoffs: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ handoffs: [] })
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DualInstanceDashboardEnhanced />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  test('should handle null activities without crashing when switching tabs', async () => {
    renderComponent();
    
    // Wait for component to load
    await screen.findByText('Dual Instance Monitor');
    
    // Try clicking on Development tab - this should NOT crash
    const devTab = screen.getByText('Development');
    expect(() => fireEvent.click(devTab)).not.toThrow();
    
    // Try clicking on Production tab - this should NOT crash  
    const prodTab = screen.getByText('Production');
    expect(() => fireEvent.click(prodTab)).not.toThrow();
    
    // Component should still be rendered without errors
    expect(screen.getByText('Dual Instance Monitor')).toBeInTheDocument();
  });

  test('should handle undefined activities gracefully', async () => {
    // Mock to return undefined activities
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          activities: undefined, // Another error case
          handoffs: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ handoffs: [] })
      });

    renderComponent();
    
    await screen.findByText('Dual Instance Monitor');
    
    // Should not crash with undefined activities
    const devTab = screen.getByText('Development');
    expect(() => fireEvent.click(devTab)).not.toThrow();
  });

  test('should handle string activities data gracefully', async () => {
    // Mock to return string instead of array
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          activities: "not an array", // Another error case
          handoffs: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ handoffs: [] })
      });

    renderComponent();
    
    await screen.findByText('Dual Instance Monitor');
    
    // Should not crash with string activities
    const prodTab = screen.getByText('Production');
    expect(() => fireEvent.click(prodTab)).not.toThrow();
  });

  test('should work correctly with proper array activities', async () => {
    // Mock to return proper array data
    const mockActivities = [
      {
        id: '1',
        agentName: 'TestAgent',
        instance: 'development' as const,
        type: 'task',
        description: 'Test activity',
        timestamp: new Date()
      }
    ];

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          activities: mockActivities,
          handoffs: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ handoffs: [] })
      });

    renderComponent();
    
    await screen.findByText('Dual Instance Monitor');
    
    // Should work fine with proper array
    const devTab = screen.getByText('Development');
    fireEvent.click(devTab);
    
    // Should show the test activity
    expect(screen.getByText('TestAgent')).toBeInTheDocument();
  });
});