import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RefreshControls, RefreshControlsProps } from '../RefreshControls';

/**
 * Test suite for RefreshControls component
 */
describe('RefreshControls', () => {
  // Default props for testing
  const defaultProps: RefreshControlsProps = {
    autoRefresh: false,
    onToggleAutoRefresh: jest.fn(),
    onManualRefresh: jest.fn(),
    isRefreshing: false,
    lastUpdated: new Date('2025-10-12T12:00:00Z'),
    refreshInterval: 10000,
    onIntervalChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-10-12T12:00:30Z')); // 30 seconds after lastUpdated
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render all control elements', () => {
      render(<RefreshControls {...defaultProps} />);

      expect(screen.getByText('Auto-refresh:')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /auto-refresh is off/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument();
      expect(screen.getByText(/updated:/i)).toBeInTheDocument();
    });

    it('should show interval selector when auto-refresh is on', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      expect(screen.getByLabelText('Select refresh interval')).toBeInTheDocument();
    });

    it('should hide interval selector when auto-refresh is off', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={false} />);

      expect(screen.queryByLabelText('Select refresh interval')).not.toBeInTheDocument();
    });

    it('should not show interval selector when onIntervalChange is not provided', () => {
      const propsWithoutIntervalChange = { ...defaultProps, autoRefresh: true, onIntervalChange: undefined };
      render(<RefreshControls {...propsWithoutIntervalChange} />);

      expect(screen.queryByLabelText('Select refresh interval')).not.toBeInTheDocument();
    });
  });

  describe('Auto-Refresh Toggle', () => {
    it('should show OFF state when auto-refresh is disabled', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={false} />);

      expect(screen.getByText('OFF')).toBeInTheDocument();
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should show ON state when auto-refresh is enabled', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      expect(screen.getByText('ON')).toBeInTheDocument();
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should call onToggleAutoRefresh when toggle is clicked', () => {
      render(<RefreshControls {...defaultProps} />);

      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);

      expect(defaultProps.onToggleAutoRefresh).toHaveBeenCalledTimes(1);
    });

    it('should apply correct styling for ON state', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-green-600');
    });

    it('should apply correct styling for OFF state', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={false} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveClass('bg-gray-300');
    });
  });

  describe('Interval Selector', () => {
    it('should show all interval options', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      const select = screen.getByLabelText('Select refresh interval') as HTMLSelectElement;
      const options = select.querySelectorAll('option');

      expect(options).toHaveLength(5);
      expect(options[0]).toHaveTextContent('5s');
      expect(options[1]).toHaveTextContent('10s');
      expect(options[2]).toHaveTextContent('30s');
      expect(options[3]).toHaveTextContent('1m');
      expect(options[4]).toHaveTextContent('5m');
    });

    it('should select the current interval', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} refreshInterval={30000} />);

      const select = screen.getByLabelText('Select refresh interval') as HTMLSelectElement;
      expect(select.value).toBe('30000');
    });

    it('should call onIntervalChange with correct value when selection changes', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      const select = screen.getByLabelText('Select refresh interval');
      fireEvent.change(select, { target: { value: '60000' } });

      expect(defaultProps.onIntervalChange).toHaveBeenCalledWith(60000);
    });
  });

  describe('Manual Refresh Button', () => {
    it('should call onManualRefresh when clicked', () => {
      render(<RefreshControls {...defaultProps} />);

      const button = screen.getByRole('button', { name: /refresh data/i });
      fireEvent.click(button);

      expect(defaultProps.onManualRefresh).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when isRefreshing is true', () => {
      render(<RefreshControls {...defaultProps} isRefreshing={true} />);

      const button = screen.getByRole('button', { name: /refreshing/i });
      expect(button).toBeDisabled();
    });

    it('should not be disabled when isRefreshing is false', () => {
      render(<RefreshControls {...defaultProps} isRefreshing={false} />);

      const button = screen.getByRole('button', { name: /refresh data/i });
      expect(button).not.toBeDisabled();
    });

    it('should show spinning icon when isRefreshing is true', () => {
      render(<RefreshControls {...defaultProps} isRefreshing={true} />);

      const button = screen.getByRole('button', { name: /refreshing/i });
      const icon = button.querySelector('svg');
      expect(icon).toHaveClass('animate-spin');
    });

    it('should not show spinning icon when isRefreshing is false', () => {
      render(<RefreshControls {...defaultProps} isRefreshing={false} />);

      const button = screen.getByRole('button', { name: /refresh data/i });
      const icon = button.querySelector('svg');
      expect(icon).not.toHaveClass('animate-spin');
    });
  });

  describe('Last Updated Display', () => {
    it('should display relative time correctly', () => {
      render(<RefreshControls {...defaultProps} />);

      expect(screen.getByText('30s ago')).toBeInTheDocument();
    });

    it('should update relative time every second', () => {
      render(<RefreshControls {...defaultProps} />);

      expect(screen.getByText('30s ago')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('31s ago')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('32s ago')).toBeInTheDocument();
    });

    it('should display "Never" when lastUpdated is null', () => {
      render(<RefreshControls {...defaultProps} lastUpdated={null} />);

      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should format minutes correctly', () => {
      const twoMinutesAgo = new Date('2025-10-12T11:58:30Z');
      render(<RefreshControls {...defaultProps} lastUpdated={twoMinutesAgo} />);

      expect(screen.getByText('2m ago')).toBeInTheDocument();
    });

    it('should format hours correctly', () => {
      const twoHoursAgo = new Date('2025-10-12T10:00:30Z');
      render(<RefreshControls {...defaultProps} lastUpdated={twoHoursAgo} />);

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should format days correctly', () => {
      const twoDaysAgo = new Date('2025-10-10T12:00:30Z');
      render(<RefreshControls {...defaultProps} lastUpdated={twoDaysAgo} />);

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('should include ISO datetime in time element', () => {
      render(<RefreshControls {...defaultProps} />);

      const timeElement = screen.getByText('30s ago');
      expect(timeElement).toHaveAttribute('dateTime', '2025-10-12T12:00:00.000Z');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for toggle', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={false} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label', 'Auto-refresh is off');
    });

    it('should update ARIA labels when state changes', () => {
      const { rerender } = render(<RefreshControls {...defaultProps} autoRefresh={false} />);

      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Auto-refresh is off');

      rerender(<RefreshControls {...defaultProps} autoRefresh={true} />);

      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Auto-refresh is on');
    });

    it('should have proper ARIA labels for buttons', () => {
      render(<RefreshControls {...defaultProps} />);

      const button = screen.getByRole('button', { name: /refresh data/i });
      expect(button).toHaveAttribute('aria-label', 'Refresh data');
    });

    it('should update ARIA busy state when refreshing', () => {
      const { rerender } = render(<RefreshControls {...defaultProps} isRefreshing={false} />);

      let button = screen.getByRole('button', { name: /refresh data/i });
      expect(button).toHaveAttribute('aria-busy', 'false');

      rerender(<RefreshControls {...defaultProps} isRefreshing={true} />);

      button = screen.getByRole('button', { name: /refreshing/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-live regions for dynamic content', () => {
      const { container } = render(<RefreshControls {...defaultProps} />);

      const liveRegions = container.querySelectorAll('[aria-live="polite"]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });

    it('should be keyboard navigable', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      const toggle = screen.getByRole('switch');
      const select = screen.getByLabelText('Select refresh interval');
      const button = screen.getByRole('button', { name: /refresh data/i });

      // All interactive elements should be in the tab order
      expect(toggle).not.toHaveAttribute('tabindex', '-1');
      expect(select).not.toHaveAttribute('tabindex', '-1');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Responsive Layout', () => {
    it('should have responsive flex classes', () => {
      const { container } = render(<RefreshControls {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
      expect(wrapper).toHaveClass('sm:flex-row');
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes for toggle', () => {
      render(<RefreshControls {...defaultProps} autoRefresh={true} />);

      const toggle = screen.getByRole('switch');
      expect(toggle.className).toContain('dark:bg-green-500');
    });

    it('should include dark mode classes for button', () => {
      render(<RefreshControls {...defaultProps} />);

      const button = screen.getByRole('button', { name: /refresh data/i });
      expect(button.className).toContain('dark:bg-blue-500');
    });

    it('should include dark mode classes for text', () => {
      const { container } = render(<RefreshControls {...defaultProps} />);

      const textElements = container.querySelectorAll('[class*="dark:text-gray"]');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggle clicks', () => {
      render(<RefreshControls {...defaultProps} />);

      const toggle = screen.getByRole('switch');

      fireEvent.click(toggle);
      fireEvent.click(toggle);
      fireEvent.click(toggle);

      expect(defaultProps.onToggleAutoRefresh).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid refresh button clicks', () => {
      render(<RefreshControls {...defaultProps} />);

      const button = screen.getByRole('button', { name: /refresh data/i });

      fireEvent.click(button);
      fireEvent.click(button);

      expect(defaultProps.onManualRefresh).toHaveBeenCalledTimes(2);
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = render(<RefreshControls {...defaultProps} />);

      const timersCount = jest.getTimerCount();

      unmount();

      expect(jest.getTimerCount()).toBeLessThan(timersCount);
    });

    it('should update relative time when lastUpdated prop changes', () => {
      const { rerender } = render(<RefreshControls {...defaultProps} />);

      expect(screen.getByText('30s ago')).toBeInTheDocument();

      const newDate = new Date('2025-10-12T12:00:20Z');
      rerender(<RefreshControls {...defaultProps} lastUpdated={newDate} />);

      expect(screen.getByText('10s ago')).toBeInTheDocument();
    });
  });
});
