/**
 * TypeScript Interface Template for React Hooks
 * 
 * NLD Pattern Prevention Strategy
 * Based on hook failure analysis NLT-20250822-001
 */

// Generic Hook Interface Contract
export interface HookReturn<T = any> {
  // State values
  data?: T;
  loading?: boolean;
  error?: string | null;
  
  // Standard action functions
  execute?: (...args: any[]) => void | Promise<void>;
  reset?: () => void;
  refresh?: () => void;
}

// Notification Hook Interface Contract
export interface NotificationHookReturn {
  notifications: Notification[];
  
  // Primary action (use consistent naming)
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  addNotification: (notification: Omit<Notification, 'id'>) => string; // Alias for backward compatibility
  
  // Secondary actions
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// Hook Implementation Template
export const useNotification = (): NotificationHookReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    // Implementation...
    return id;
  }, []);

  return {
    notifications,
    showNotification,
    addNotification: showNotification, // Alias to prevent breaking changes
    removeNotification,
    clearAll
  };
};

// Component Usage Pattern
export const ComponentUsageExample = () => {
  // ✅ CORRECT: Use interface-defined function names
  const { showNotification } = useNotification();
  
  // ✅ ALSO CORRECT: Use alias for backward compatibility
  const { addNotification } = useNotification();
  
  // ❌ WRONG: This would cause "myCustomName is not a function"
  // const { myCustomName } = useNotification();
  
  return null;
};

/**
 * NLD Prevention Rules:
 * 
 * 1. Always define TypeScript interfaces for hook returns
 * 2. Use consistent naming conventions (show*, add*, remove*, clear*)
 * 3. Provide aliases for backward compatibility when renaming
 * 4. Write unit tests that validate interface contracts
 * 5. Use strict TypeScript mode to catch interface violations
 */