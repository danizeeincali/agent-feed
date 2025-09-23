import React, { useEffect, useRef, ReactNode } from 'react';

interface RouteWrapperProps {
  routeKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * RouteWrapper - Isolates routes and provides cleanup
 * Prevents mutual exclusivity conflicts between routes
 */
const RouteWrapper: React.FC<RouteWrapperProps> = ({ 
  routeKey, 
  children, 
  className = '' 
}) => {
  const cleanupFunctions = useRef<Set<() => void>>(new Set());
  const isUnmounting = useRef(false);

  // Register cleanup function
  const registerCleanup = (cleanupFn: () => void) => {
    cleanupFunctions.current.add(cleanupFn);
  };

  useEffect(() => {
    console.log(`🔄 RouteWrapper: ${routeKey} mounted`);
    isUnmounting.current = false;

    // Cleanup on unmount
    return () => {
      console.log(`🧹 RouteWrapper: ${routeKey} cleaning up...`);
      isUnmounting.current = true;
      
      // Execute all registered cleanup functions
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`⚠️ Cleanup error in ${routeKey}:`, error);
        }
      });
      
      cleanupFunctions.current.clear();
      
      // Force garbage collection hint
      if (window.gc) {
        window.gc();
      }
    };
  }, [routeKey]);

  // Provide cleanup registration to children
  const value = React.useMemo(() => ({
    routeKey,
    registerCleanup,
    isUnmounting: isUnmounting.current
  }), [routeKey]);

  return (
    <div 
      className={`route-wrapper route-${routeKey} ${className}`}
      data-testid={`route-${routeKey}`}
      data-route-key={routeKey}
    >
      <RouteContext.Provider value={value}>
        {children}
      </RouteContext.Provider>
    </div>
  );
};

// Context for route-specific operations
export const RouteContext = React.createContext<{
  routeKey: string;
  registerCleanup: (cleanup: () => void) => void;
  isUnmounting: boolean;
} | null>(null);

// Hook for using route context
export const useRoute = () => {
  const context = React.useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used within a RouteWrapper');
  }
  return context;
};

export default RouteWrapper;