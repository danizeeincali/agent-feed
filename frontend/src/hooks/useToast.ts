import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export interface UseToastReturn {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

let toastIdCounter = 0;

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${toastIdCounter++}`;

    const newToast: Toast = {
      id,
      type,
      message,
      duration
    };

    setToasts(prev => {
      // Limit to max 5 toasts
      const updated = [...prev, newToast];
      return updated.slice(-5);
    });

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration = 5000) => {
    showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration = 0) => {
    // Errors don't auto-dismiss by default
    showToast('error', message, duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration = 7000) => {
    showToast('warning', message, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration = 5000) => {
    showToast('info', message, duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    dismissToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
