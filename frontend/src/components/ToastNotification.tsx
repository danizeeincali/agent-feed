import React from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Toast } from '../hooks/useToast';

interface ToastNotificationProps extends Toast {
  onDismiss: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  id,
  type,
  message,
  onDismiss
}) => {
  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const Icon = icons[type];

  const baseClasses = "flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-md min-w-[300px] animate-slide-in";

  const typeClasses = {
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
  };

  const iconClasses = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    info: "text-blue-600 dark:text-blue-400"
  };

  return (
    <div className={cn(baseClasses, typeClasses[type])} role="alert">
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconClasses[type])} />

      <div className="flex-1 text-sm font-medium">
        {message}
      </div>

      <button
        onClick={() => onDismiss(id)}
        className={cn(
          "flex-shrink-0 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          type === 'success' && "focus:ring-green-500",
          type === 'error' && "focus:ring-red-500",
          type === 'warning' && "focus:ring-yellow-500",
          type === 'info' && "focus:ring-blue-500"
        )}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ToastNotification;
