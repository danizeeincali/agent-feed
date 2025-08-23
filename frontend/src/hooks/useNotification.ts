/**
 * useNotification Hook
 * 
 * Simple notification system for user feedback
 */

import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Create showNotification as an alias for addNotification to maintain backward compatibility
  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    return addNotification(notification);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    showNotification, // Export showNotification function
    removeNotification,
    clearAll
  };
};

export default useNotification;