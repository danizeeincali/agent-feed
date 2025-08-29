import React from 'react';
import { render, screen, fireEvent, waitFor } from './utils/test-utils';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ClaudeInstanceButtons } from '@/components/ClaudeInstanceButtons';

// London School TDD - Mock-driven testing approach
describe('ClaudeInstanceButtons - Professional UI Component', () => {
  // Mock dependencies - London School focuses on interactions
  const mockOnConnect = jest.fn();
  const mockOnDisconnect = jest.fn();
  const mockOnStart = jest.fn();
  const mockOnStop = jest.fn();
  const mockOnRestart = jest.fn();

  const defaultProps = {
    instanceId: 'test-instance-123',
    isConnected: false,
    isLoading: false,
    onConnect: mockOnConnect,
    onDisconnect: mockOnDisconnect,
    onStart: mockOnStart,
    onStop: mockOnStop,
    onRestart: mockOnRestart
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Button Styling Transformations', () => {
    it('should render connect button with professional Claudable styling when disconnected', () => {
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      expect(connectButton).toBeInTheDocument();
      expect(connectButton).toHaveClass('claude-button', 'claude-button--primary');
      expect(connectButton).toHaveStyle({
        backgroundColor: '#6366f1',
        color: '#ffffff',
        border: 'none',
        borderRadius: '0.375rem',
        padding: '0.5rem 1rem',
        fontWeight: '500',
        transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
      });
    });

    it('should transform to disconnect button styling when connected', () => {
      render(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      
      const disconnectButton = screen.getByRole('button', { name: /disconnect from claude/i });
      
      expect(disconnectButton).toHaveClass('claude-button', 'claude-button--secondary');
      expect(disconnectButton).toHaveStyle({
        backgroundColor: '#8b5cf6',
        color: '#ffffff'
      });
    });

    it('should apply loading state styling transformations', () => {
      render(<ClaudeInstanceButtons {...defaultProps} isLoading={true} />);
      
      const loadingButton = screen.getByRole('button');
      
      expect(loadingButton).toHaveClass('claude-button--loading');
      expect(loadingButton).toHaveAttribute('disabled');
      expect(loadingButton).toHaveStyle({
        opacity: '0.6',
        cursor: 'not-allowed'
      });
    });
  });

  describe('Hover States and Interactive Feedback', () => {
    it('should apply hover state styling on mouse enter', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      await user.hover(connectButton);
      
      expect(connectButton).toHaveClass('claude-button--hover');
      expect(connectButton).toHaveStyle({
        backgroundColor: '#5b64f0',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      });
    });

    it('should remove hover state on mouse leave', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      await user.hover(connectButton);
      await user.unhover(connectButton);
      
      expect(connectButton).not.toHaveClass('claude-button--hover');
    });

    it('should apply focus state for keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      await user.tab();
      
      expect(connectButton).toHaveFocus();
      expect(connectButton).toHaveClass('claude-button--focus');
      expect(connectButton).toHaveStyle({
        outline: '2px solid #ddd6fe',
        outlineOffset: '2px'
      });
    });
  });

  describe('Click Handler Mocking and Event Propagation', () => {
    it('should call onConnect mock when connect button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      await user.click(connectButton);
      
      expect(mockOnConnect).toHaveBeenCalledTimes(1);
      expect(mockOnConnect).toHaveBeenCalledWith('test-instance-123');
    });

    it('should call onDisconnect mock when disconnect button is clicked', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      
      const disconnectButton = screen.getByRole('button', { name: /disconnect from claude/i });
      await user.click(disconnectButton);
      
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
      expect(mockOnDisconnect).toHaveBeenCalledWith('test-instance-123');
    });

    it('should prevent event propagation when button is clicked', async () => {
      const mockParentClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <div onClick={mockParentClick}>
          <ClaudeInstanceButtons {...defaultProps} />
        </div>
      );
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      await user.click(connectButton);
      
      expect(mockOnConnect).toHaveBeenCalledTimes(1);
      expect(mockParentClick).not.toHaveBeenCalled();
    });

    it('should not call handlers when button is in loading state', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} isLoading={true} />);
      
      const loadingButton = screen.getByRole('button');
      await user.click(loadingButton);
      
      expect(mockOnConnect).not.toHaveBeenCalled();
    });
  });

  describe('Connection Status Indicators', () => {
    it('should display connection status indicator when connected', () => {
      render(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      
      const statusIndicator = screen.getByTestId('connection-status');
      
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator).toHaveClass('status-indicator--connected');
      expect(statusIndicator).toHaveStyle({
        backgroundColor: '#10b981',
        borderRadius: '50%',
        width: '8px',
        height: '8px'
      });
    });

    it('should display disconnected status indicator when not connected', () => {
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const statusIndicator = screen.getByTestId('connection-status');
      
      expect(statusIndicator).toHaveClass('status-indicator--disconnected');
      expect(statusIndicator).toHaveStyle({
        backgroundColor: '#ef4444'
      });
    });

    it('should display loading spinner when in loading state', () => {
      render(<ClaudeInstanceButtons {...defaultProps} isLoading={true} />);
      
      const loadingSpinner = screen.getByTestId('loading-spinner');
      
      expect(loadingSpinner).toBeInTheDocument();
      expect(loadingSpinner).toHaveClass('loading-spinner');
      expect(loadingSpinner).toHaveStyle({
        animation: 'spin 1s linear infinite'
      });
    });

    it('should animate status changes smoothly', async () => {
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const statusIndicator = screen.getByTestId('connection-status');
      expect(statusIndicator).toHaveClass('status-indicator--disconnected');
      
      rerender(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      
      expect(statusIndicator).toHaveClass('status-indicator--connected');
      expect(statusIndicator).toHaveStyle({
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)'
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should have proper ARIA attributes', () => {
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      expect(connectButton).toHaveAttribute('aria-label', 'Connect to Claude instance test-instance-123');
      expect(connectButton).toHaveAttribute('aria-describedby', 'connection-status');
      expect(connectButton).toHaveAttribute('type', 'button');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      // Tab to focus
      await user.tab();
      expect(connectButton).toHaveFocus();
      
      // Enter to activate
      await user.keyboard('{Enter}');
      expect(mockOnConnect).toHaveBeenCalledTimes(1);
      
      // Space to activate
      await user.keyboard(' ');
      expect(mockOnConnect).toHaveBeenCalledTimes(2);
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce state changes to screen readers', async () => {
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveTextContent('Claude instance disconnected');
      
      rerender(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Claude instance connected');
      });
    });
  });

  describe('Animation States and Smooth Transitions', () => {
    it('should animate button state transitions', async () => {
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const button = screen.getByRole('button');
      
      expect(button).toHaveStyle({
        transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
      });
      
      rerender(<ClaudeInstanceButtons {...defaultProps} isLoading={true} />);
      
      expect(button).toHaveClass('claude-button--loading');
      
      await waitFor(() => {
        expect(button).toHaveStyle({
          opacity: '0.6'
        });
      }, { timeout: 200 });
    });

    it('should animate connection status indicator changes', async () => {
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const statusIndicator = screen.getByTestId('connection-status');
      
      rerender(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      
      expect(statusIndicator).toHaveStyle({
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)'
      });
    });

    it('should handle rapid state changes gracefully', async () => {
      const { rerender } = render(<ClaudeInstanceButtons {...defaultProps} />);
      
      // Rapid state changes
      rerender(<ClaudeInstanceButtons {...defaultProps} isLoading={true} />);
      rerender(<ClaudeInstanceButtons {...defaultProps} isConnected={true} />);
      rerender(<ClaudeInstanceButtons {...defaultProps} isLoading={false} />);
      
      const button = screen.getByRole('button');
      
      await waitFor(() => {
        expect(button).toHaveClass('claude-button--secondary');
        expect(button).not.toHaveClass('claude-button--loading');
      });
    });
  });

  describe('Error States and Edge Cases', () => {
    it('should handle missing props gracefully', () => {
      const minimalProps = {
        instanceId: 'test-instance',
        onConnect: mockOnConnect
      };
      
      expect(() => {
        render(<ClaudeInstanceButtons {...minimalProps} />);
      }).not.toThrow();
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle rapid consecutive clicks', async () => {
      const user = userEvent.setup();
      render(<ClaudeInstanceButtons {...defaultProps} />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      // Rapid clicks
      await user.click(connectButton);
      await user.click(connectButton);
      await user.click(connectButton);
      
      // Should only be called once due to debouncing
      expect(mockOnConnect).toHaveBeenCalledTimes(1);
    });

    it('should handle null event handlers gracefully', async () => {
      const user = userEvent.setup();
      const propsWithoutHandlers = {
        instanceId: 'test-instance',
        onConnect: null,
        onDisconnect: null
      };
      
      expect(() => {
        render(<ClaudeInstanceButtons {...propsWithoutHandlers} />);
      }).not.toThrow();
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      // Should not throw error
    });
  });
});