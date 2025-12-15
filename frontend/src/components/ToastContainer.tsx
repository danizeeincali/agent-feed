import React from 'react';
import { createPortal } from 'react-dom';
import ToastNotification from './ToastNotification';
import type { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
        />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
