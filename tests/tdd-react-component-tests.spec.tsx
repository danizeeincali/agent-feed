import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import SimpleLauncher from '../frontend/src/components/SimpleLauncher';
import '@testing-library/jest-dom';

/**
 * TDD London School Test Suite for React Component Rendering
 * Following strict mock-first approach with behavior verification
 */

describe('SimpleLauncher Component - TDD London School', () => {
  let mockFetch: jest.Mock;
  
  beforeEach(() => {
    // London School: Create test doubles first
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  
  describe('Component Initialization', () => {
    it('should render with initial state showing "stopped"', () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ status: 'stopped', pid: null })
      });
      
      // Act
      const { container } = render(<SimpleLauncher />);
      
      // Assert
      expect(container.querySelector('.status-badge')).toHaveTextContent('Stopped');
      expect(screen.getByText('Launch')).toBeEnabled();
      expect(screen.queryByText('Stop')).toBeDisabled();
    });
    
    it('should call status endpoint on mount', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ status: 'stopped' })
      });
      
      // Act
      render(<SimpleLauncher />);
      
      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/simple-claude/status',
          expect.objectContaining({ method: 'GET' })
        );
      });
    });
  });
  
  describe('Launch Behavior', () => {
    it('should transition to launching state when Launch clicked', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'stopped' }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true, pid: 12345 }) });
      
      // Act
      const { getByText } = render(<SimpleLauncher />);
      await act(async () => {
        fireEvent.click(getByText('Launch'));
      });
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/simple-claude/launch',
        expect.objectContaining({ method: 'POST' })
      );
    });
    
    it('should show running state after successful launch', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'stopped' }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true, pid: 12345 }) })
        .mockResolvedValueOnce({ json: async () => ({ status: 'running', pid: 12345 }) });
      
      // Act
      render(<SimpleLauncher />);
      const launchButton = screen.getByText('Launch');
      
      await act(async () => {
        fireEvent.click(launchButton);
      });
      
      // Fast-forward polling timer
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByText('Stop')).toBeEnabled();
      });
    });
  });
  
  describe('Stop Behavior', () => {
    it('should call stop endpoint when Stop clicked', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'running', pid: 12345 }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) });
      
      // Act
      render(<SimpleLauncher />);
      await waitFor(() => screen.getByText('Running'));
      
      await act(async () => {
        fireEvent.click(screen.getByText('Stop'));
      });
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/simple-claude/stop',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
  
  describe('Error Handling', () => {
    it('should display error message on launch failure', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'stopped' }) })
        .mockResolvedValueOnce({ json: async () => ({ success: false, error: 'Launch failed' }) });
      
      // Act
      render(<SimpleLauncher />);
      
      await act(async () => {
        fireEvent.click(screen.getByText('Launch'));
      });
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Launch failed/)).toBeInTheDocument();
      });
    });
    
    it('should handle network errors gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      // Act
      render(<SimpleLauncher />);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Error/)).toBeInTheDocument();
      });
    });
  });
  
  describe('Polling Behavior', () => {
    it('should poll status every 2 seconds when running', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'running', pid: 12345 }) })
        .mockResolvedValueOnce({ json: async () => ({ status: 'running', pid: 12345 }) })
        .mockResolvedValueOnce({ json: async () => ({ status: 'running', pid: 12345 }) });
      
      // Act
      render(<SimpleLauncher />);
      
      // Assert - Initial call
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Fast-forward 2 seconds
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Fast-forward another 2 seconds
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
    
    it('should stop polling when component unmounts', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ json: async () => ({ status: 'running', pid: 12345 }) });
      
      // Act
      const { unmount } = render(<SimpleLauncher />);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      unmount();
      
      // Fast-forward time after unmount
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      
      // Assert - No additional calls after unmount
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('UI State Consistency', () => {
    it('should disable Launch button while launching', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'stopped' }) })
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      // Act
      render(<SimpleLauncher />);
      const launchButton = screen.getByText('Launch');
      
      fireEvent.click(launchButton);
      
      // Assert
      expect(launchButton).toBeDisabled();
      expect(screen.getByText(/Launching/)).toBeInTheDocument();
    });
    
    it('should show correct PID when running', async () => {
      // Arrange
      const testPid = 54321;
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ status: 'running', pid: testPid })
      });
      
      // Act
      render(<SimpleLauncher />);
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(`PID: ${testPid}`)).toBeInTheDocument();
      });
    });
  });
});

describe('SimpleLauncher Integration Tests', () => {
  describe('Full Launch Cycle', () => {
    it('should complete full launch-stop cycle', async () => {
      // Arrange
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      
      // Mock sequence: stopped -> launch -> running -> stop -> stopped
      mockFetch
        .mockResolvedValueOnce({ json: async () => ({ status: 'stopped' }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true, pid: 99999 }) })
        .mockResolvedValueOnce({ json: async () => ({ status: 'running', pid: 99999 }) })
        .mockResolvedValueOnce({ json: async () => ({ success: true }) })
        .mockResolvedValueOnce({ json: async () => ({ status: 'stopped' }) });
      
      // Act & Assert
      render(<SimpleLauncher />);
      
      // Initial state
      await waitFor(() => {
        expect(screen.getByText('Stopped')).toBeInTheDocument();
      });
      
      // Launch
      fireEvent.click(screen.getByText('Launch'));
      await waitFor(() => {
        expect(screen.getByText('Running')).toBeInTheDocument();
      });
      
      // Stop
      fireEvent.click(screen.getByText('Stop'));
      await waitFor(() => {
        expect(screen.getByText('Stopped')).toBeInTheDocument();
      });
      
      // Verify all expected API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
  });
});