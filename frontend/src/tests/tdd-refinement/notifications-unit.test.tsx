/**
 * TDD Refinement: Unit Tests for Notifications Components
 *
 * These tests validate the current behavior before removal
 * and ensure we don't break other functionality during removal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react';
import React from 'react';

// Import the actual components we're testing
import { RealTimeNotifications } from '../../components/RealTimeNotifications';
import { useNotification } from '../../hooks/useNotification';

describe('RealTimeNotifications Component - Current Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notifications button with bell icon', () => {
    render(<RealTimeNotifications />);

    const button = screen.getByTestId('notifications-button');
    expect(button).toBeInTheDocument();

    // Should have bell icon (SVG)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should display notification count badge when unread notifications exist', () => {
    render(<RealTimeNotifications />);

    // Initially should show count badge (component has 3 unread notifications by default)
    const countBadge = screen.getByTestId('notification-count');
    expect(countBadge).toBeInTheDocument();
    expect(countBadge).toHaveTextContent('3');
  });

  it('should toggle dropdown when button is clicked', async () => {
    render(<RealTimeNotifications />);

    const button = screen.getByTestId('notifications-button');

    // Initially dropdown should not be visible
    expect(screen.queryByTestId('notifications-dropdown')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('notifications-dropdown')).toBeInTheDocument();
    });

    // Click to close
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByTestId('notifications-dropdown')).not.toBeInTheDocument();
    });
  });

  it('should render notifications in dropdown when opened', async () => {
    render(<RealTimeNotifications showDropdown={true} />);

    const dropdown = screen.getByTestId('notifications-dropdown');
    expect(dropdown).toBeInTheDocument();

    // Should show the 3 default notifications
    expect(screen.getByTestId('notification-1')).toBeInTheDocument();
    expect(screen.getByTestId('notification-2')).toBeInTheDocument();
    expect(screen.getByTestId('notification-3')).toBeInTheDocument();
  });

  it('should mark notification as read when clicked', async () => {
    render(<RealTimeNotifications showDropdown={true} />);

    const notification = screen.getByTestId('notification-1');

    // Initially should have unread styling (bg-blue-50)
    expect(notification).toHaveClass('bg-blue-50');

    fireEvent.click(notification);

    await waitFor(() => {
      // After clicking, should not have unread styling
      expect(notification).not.toHaveClass('bg-blue-50');
    });
  });

  it('should mark all notifications as read when mark all read is clicked', async () => {
    render(<RealTimeNotifications showDropdown={true} />);

    const markAllReadButton = screen.getByTestId('mark-all-read');
    expect(markAllReadButton).toBeInTheDocument();

    fireEvent.click(markAllReadButton);

    await waitFor(() => {
      // All notifications should lose unread styling
      expect(screen.getByTestId('notification-1')).not.toHaveClass('bg-blue-50');
      expect(screen.getByTestId('notification-2')).not.toHaveClass('bg-blue-50');
      expect(screen.getByTestId('notification-3')).not.toHaveClass('bg-blue-50');
    });
  });
});

describe('useNotification Hook - Current Behavior', () => {
  it('should initialize with empty notifications array', () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current.notifications).toEqual([]);
  });

  it('should add notification when addNotification is called', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test notification',
        message: 'This is a test',
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'info',
      title: 'Test notification',
      message: 'This is a test',
    });
  });

  it('should remove notification when removeNotification is called', () => {
    const { result } = renderHook(() => useNotification());

    let notificationId: string;

    act(() => {
      notificationId = result.current.addNotification({
        type: 'info',
        title: 'Test notification',
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications when clearAll is called', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.addNotification({ type: 'info', title: 'Test 1' });
      result.current.addNotification({ type: 'info', title: 'Test 2' });
      result.current.addNotification({ type: 'info', title: 'Test 3' });
    });

    expect(result.current.notifications).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should auto-remove notification after duration', async () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Auto-remove test',
        duration: 100, // 100ms for quick test
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    // Wait for auto-removal
    await waitFor(
      () => {
        expect(result.current.notifications).toHaveLength(0);
      },
      { timeout: 200 }
    );
  });

  it('should have showNotification as alias for addNotification', () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification({
        type: 'success',
        title: 'Alias test',
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      title: 'Alias test',
    });
  });
});

describe('Integration Tests - Notifications System', () => {
  it('should work when RealTimeNotifications uses useNotification hook', () => {
    // This test validates that the components work together
    // before we remove them

    const TestComponent: React.FC = () => {
      const { addNotification, notifications } = useNotification();

      React.useEffect(() => {
        addNotification({
          type: 'info',
          title: 'Integration test notification',
        });
      }, [addNotification]);

      return (
        <div>
          <RealTimeNotifications />
          <div data-testid="notification-count">{notifications.length}</div>
        </div>
      );
    };

    render(<TestComponent />);

    // Should render notifications component
    expect(screen.getByTestId('real-time-notifications')).toBeInTheDocument();

    // Hook should work independently
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });
});