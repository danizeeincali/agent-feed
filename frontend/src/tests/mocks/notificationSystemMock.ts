/**
 * TDD London School Mock for Notification System
 * 
 * Provides comprehensive mock contracts for the notification system
 * following London School principles of mock-first development
 */

import { jest } from '@jest/globals';

export interface NotificationMock {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface NotificationSystemMock {
  notifications: NotificationMock[];
  addNotification: jest.Mock;
  showNotification: jest.Mock;
  removeNotification: jest.Mock;
  clearAll: jest.Mock;
}

/**
 * Creates a comprehensive mock for the notification system
 * London School: Focus on defining clear contracts and interactions
 */
export const createNotificationSystemMock = (): NotificationSystemMock => {
  const notifications: NotificationMock[] = [];
  
  const addNotification = jest.fn().mockImplementation((notification: Omit<NotificationMock, 'id'>) => {
    const id = `mock-${Date.now()}`;
    const newNotification = { ...notification, id };
    notifications.push(newNotification);
    return id;
  });

  const showNotification = jest.fn().mockImplementation((notification: Omit<NotificationMock, 'id'>) => {
    return addNotification(notification);
  });

  const removeNotification = jest.fn().mockImplementation((id: string) => {
    const index = notifications.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.splice(index, 1);
    }
  });

  const clearAll = jest.fn().mockImplementation(() => {
    notifications.length = 0;
  });

  return {
    notifications,
    addNotification,
    showNotification,
    removeNotification,
    clearAll
  };
};

/**
 * Creates a spy-based mock for testing interactions
 * London School: Verify method calls and parameter passing
 */
export const createNotificationSpyMock = () => {
  return {
    notifications: [],
    addNotification: jest.fn(),
    showNotification: jest.fn(),
    removeNotification: jest.fn(),
    clearAll: jest.fn()
  };
};

/**
 * Creates a failing mock for error scenario testing
 * London School: Test error handling and resilience
 */
export const createFailingNotificationMock = () => {
  return {
    notifications: [],
    addNotification: jest.fn().mockRejectedValue(new Error('Notification system unavailable')),
    showNotification: jest.fn().mockRejectedValue(new Error('Notification system unavailable')),
    removeNotification: jest.fn().mockRejectedValue(new Error('Notification system unavailable')),
    clearAll: jest.fn().mockRejectedValue(new Error('Notification system unavailable'))
  };
};

/**
 * Mock contract verification utilities
 * London School: Ensure mocks satisfy expected interfaces
 */
export const verifyNotificationContract = (mock: any): boolean => {
  const requiredMethods = ['addNotification', 'showNotification', 'removeNotification', 'clearAll'];
  const requiredProperties = ['notifications'];
  
  return [
    ...requiredMethods.map(method => typeof mock[method] === 'function'),
    ...requiredProperties.map(prop => Array.isArray(mock[prop]))
  ].every(Boolean);
};

/**
 * Terminal-specific notification scenarios
 * London School: Test specific use cases and edge cases
 */
export const createTerminalNotificationScenarios = () => ({
  connectionError: {
    type: 'error' as const,
    title: 'Terminal Connection Error',
    message: 'WebSocket connection failed',
    duration: 5000
  },
  
  copySuccess: {
    type: 'success' as const,
    title: 'Copied',
    message: 'Selection copied to clipboard',
    duration: 2000
  },
  
  reconnectAttempt: {
    type: 'warning' as const,
    title: 'Reconnecting',
    message: 'Attempting to reconnect to terminal...',
    duration: 3000
  },
  
  sessionTimeout: {
    type: 'error' as const,
    title: 'Session Timeout',
    message: 'Terminal session has expired',
    duration: 0 // Persistent notification
  }
});

/**
 * Interaction pattern matchers for London School testing
 * Verify specific collaboration patterns between terminal and notification system
 */
export const notificationMatchers = {
  errorNotification: expect.objectContaining({
    type: 'error',
    title: expect.any(String),
    message: expect.any(String),
    duration: expect.any(Number)
  }),
  
  successNotification: expect.objectContaining({
    type: 'success',
    title: expect.any(String),
    message: expect.any(String),
    duration: expect.any(Number)
  }),
  
  anyNotification: expect.objectContaining({
    type: expect.stringMatching(/^(success|error|warning|info)$/),
    title: expect.any(String)
  })
};