import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

/**
 * Connection status type for Claude instances
 */
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/**
 * Button variant configuration type
 */
type ButtonVariant = 'prod' | 'skip-permissions' | 'skip-permissions-c' | 'skip-permissions-resume';

/**
 * Visual configuration for button variants
 * Each variant has distinct colors to indicate different safety/permission levels
 */
const BUTTON_CONFIGS: Record<ButtonVariant, {
  gradient: string;
  hoverGradient: string;
  shadowColor: string;
  hoverShadowColor: string;
}> = {
  'prod': {
    gradient: 'from-emerald-500 to-teal-500',
    hoverGradient: 'from-emerald-600 to-teal-600',
    shadowColor: 'shadow-emerald-500/25',
    hoverShadowColor: 'hover:shadow-emerald-500/40',
  },
  'skip-permissions': {
    gradient: 'from-amber-500 to-orange-500',
    hoverGradient: 'from-amber-600 to-orange-600',
    shadowColor: 'shadow-amber-500/25',
    hoverShadowColor: 'hover:shadow-amber-500/40',
  },
  'skip-permissions-c': {
    gradient: 'from-orange-500 to-red-500',
    hoverGradient: 'from-orange-600 to-red-600',
    shadowColor: 'shadow-orange-500/25',
    hoverShadowColor: 'hover:shadow-orange-500/40',
  },
  'skip-permissions-resume': {
    gradient: 'from-purple-500 to-indigo-500',
    hoverGradient: 'from-purple-600 to-indigo-600',
    shadowColor: 'shadow-purple-500/25',
    hoverShadowColor: 'hover:shadow-purple-500/40',
  }
};

/**
 * Individual instance button component with modern design and status indicators
 * 
 * Features:
 * - Gradient backgrounds with hover effects
 * - Connection status indicators
 * - Loading states with animations
 * - Accessibility support
 * - Responsive design
 */
const InstanceButton: React.FC<InstanceButtonProps> = ({
  onClick,
  disabled,
  loading,
  icon,
  title,
  description,
  variant,
  connectionStatus = 'disconnected'
}) => {
  const config = BUTTON_CONFIGS[variant];
  
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'relative flex flex-col items-start p-6 rounded-xl border border-gray-200 dark:border-gray-700',
          'bg-gradient-to-br text-white font-semibold transition-all duration-300',
          'hover:scale-105 hover:-translate-y-1 active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'shadow-lg',
          // Gradient and shadow configurations
          config.gradient,
          config.shadowColor,
          config.hoverShadowColor,
          // Hover effects
          `hover:bg-gradient-to-br hover:${config.hoverGradient}`,
          // Loading state
          loading && 'cursor-wait animate-pulse'
        )}
      >
        {/* Connection Status Indicator */}
        <div className="absolute top-3 right-3">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            connectionStatus === 'connected' && 'bg-green-400 animate-pulse',
            connectionStatus === 'connecting' && 'bg-yellow-400 animate-bounce',
            connectionStatus === 'disconnected' && 'bg-gray-400'
          )} />
        </div>
        
        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
        </div>
        
        {/* Description */}
        <p className="text-sm opacity-90 leading-relaxed">{description}</p>
        
        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </button>
      
      {/* Connection Status Badge */}
      {connectionStatus === 'connected' && (
        <Badge 
          variant="secondary" 
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 border-green-200"
        >
          Connected
        </Badge>
      )}
    </div>
  );
};

/**
 * Props for the ClaudeInstanceButtons component
 */
interface ClaudeInstanceButtonsProps {
  /** Callback function called when an instance creation is requested */
  onCreateInstance: (command: string) => void;
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Connection statuses for each button instance */
  connectionStatuses?: Record<string, ConnectionStatus>;
}

/**
 * Props for individual instance button components
 */
interface InstanceButtonProps {
  /** Click handler for the button */
  onClick: () => void;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to display on the button */
  icon: string;
  /** Main title text for the button */
  title: string;
  /** Descriptive text for the button */
  description: string;
  /** Visual variant of the button */
  variant: ButtonVariant;
  /** Current connection status */
  connectionStatus?: ConnectionStatus;
}

/**
 * Debouncing utility hook to prevent multiple rapid clicks within a specified time window.
 * Provides user feedback during cooldown periods and ensures proper cleanup.
 * 
 * Key Features:
 * - Prevents rapid successive function calls
 * - Provides visual feedback during cooldown
 * - Automatic cleanup on component unmount
 * - Type-safe callback handling
 * 
 * @param callback - Function to be debounced
 * @param delay - Cooldown delay in milliseconds (default: 2000ms)
 * @returns Tuple containing [debouncedCallback, isDebounced]
 * 
 * @example
 * ```typescript
 * const [debouncedSubmit, isDebounced] = useDebounce(handleSubmit, 3000);
 * 
 * <Button 
 *   onClick={debouncedSubmit}
 *   disabled={isDebounced}
 * >
 *   {isDebounced ? 'Please wait...' : 'Submit'}
 * </Button>
 * ```
 */
const useDebounce = <T extends (...args: any[]) => void>(
  callback: T, 
  delay: number = 2000
): [T, boolean] => {
  const [isDebounced, setIsDebounced] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = React.useCallback(((...args: Parameters<T>) => {
    if (isDebounced) {
      console.warn('🚫 Button click blocked - still in cooldown period');
      return;
    }
    
    console.log('✅ Button click accepted - executing callback');
    setIsDebounced(true);
    callback(...args);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout to reset debouncing
    timeoutRef.current = setTimeout(() => {
      setIsDebounced(false);
      console.log('🔄 Button debouncing reset - ready for next click');
    }, delay);
    
  }) as T, [callback, delay, isDebounced]);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [debouncedCallback, isDebounced] as const;
};

/**
 * Rate limiting hook that prevents excessive function calls within a time window.
 * Uses a pure approach that separates checking from recording to avoid render-cycle side effects.
 * 
 * Key Design Principles:
 * - checkRateLimit(): Pure function safe to call during render
 * - recordAttempt(): Side effect function only called in event handlers
 * - isRateLimited state: Tracks active rate limiting for UI feedback
 * 
 * @param maxCalls - Maximum number of calls allowed within the time window
 * @param windowMs - Time window in milliseconds
 * @returns Object with pure check function, side effect record function, and reactive state
 * 
 * @example
 * ```typescript
 * const { checkRateLimit, recordAttempt, isRateLimited } = useRateLimit(3, 60000);
 * 
 * // During render (pure - no side effects)
 * const canProceed = !checkRateLimit();
 * const showWarning = isRateLimited;
 * 
 * // During event handler (side effect)
 * const handleClick = () => {
 *   if (checkRateLimit()) return;
 *   if (!recordAttempt()) return;
 *   // ... perform action
 * };
 * ```
 */
const useRateLimit = (maxCalls: number = 3, windowMs: number = 60000) => {
  const callTimestamps = React.useRef<number[]>([]);
  const [isRateLimited, setIsRateLimited] = React.useState(false);
  
  /**
   * Pure function that checks if rate limit would be exceeded.
   * Does NOT record the attempt or cause side effects - safe to call during render.
   * 
   * @returns true if rate limit would be exceeded, false otherwise
   */
  const checkRateLimit = React.useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Filter timestamps to current window (pure operation - no mutation)
    const currentWindowTimestamps = callTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    return currentWindowTimestamps.length >= maxCalls;
  }, [maxCalls, windowMs]);
  
  /**
   * Side effect function that records an attempt and updates reactive state.
   * Should only be called when an actual attempt is made (e.g., in event handlers).
   * 
   * @returns true if attempt was recorded, false if rate limited
   */
  const recordAttempt = React.useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old timestamps (side effect - safe in event handler)
    callTimestamps.current = callTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );
    
    if (callTimestamps.current.length >= maxCalls) {
      console.warn(`🚫 Rate limited - ${maxCalls} calls per ${windowMs}ms exceeded`);
      setIsRateLimited(true);
      
      // Set timer to reset rate limit state
      setTimeout(() => setIsRateLimited(false), windowMs);
      return false;
    }
    
    // Record this attempt (side effect - safe in event handler)
    callTimestamps.current.push(now);
    console.log(`✅ Rate limit check passed - ${callTimestamps.current.length}/${maxCalls} calls in window`);
    
    // If we were previously rate limited but now have capacity, reset the state
    if (isRateLimited) {
      setIsRateLimited(false);
    }
    
    return true;
  }, [maxCalls, windowMs, isRateLimited]);
  
  return { checkRateLimit, recordAttempt, isRateLimited };
};

const ClaudeInstanceButtons: React.FC<ClaudeInstanceButtonsProps> = ({
  onCreateInstance,
  loading = false,
  connectionStatuses = {}
}) => {
  // Debouncing and rate limiting hooks
  const [debouncedCreateInstance, isDebounced] = useDebounce(onCreateInstance, 2000);
  const { checkRateLimit, recordAttempt, isRateLimited } = useRateLimit(3, 60000); // Max 3 instances per minute
  
  // CRITICAL FIX: Combined loading state - ONLY loading, no other states
  // Rate limiting is handled in click handler, NOT in render state
  // This ensures buttons are NEVER disabled on page load
  const isDisabled = loading;
  
  // Enhanced click handler with comprehensive protection
  const handleCreateInstance = React.useCallback((command: string) => {
    console.log('🖱️ Button clicked for command:', command);
    
    // Check if currently in debounce period
    if (isDebounced) {
      console.warn('🚫 Create instance blocked - debounce cooldown active');
      return;
    }
    
    // First check rate limit (pure check - no side effects)
    if (checkRateLimit()) {
      console.warn('🚫 Create instance blocked - rate limit check failed');
      return;
    }
    
    // Record the attempt (side effect - only during actual click)
    if (!recordAttempt()) {
      console.warn('🚫 Create instance blocked - rate limit recording failed');
      return;
    }
    
    // Use debounced callback to prevent rapid successive calls
    debouncedCreateInstance(command);
  }, [debouncedCreateInstance, recordAttempt, checkRateLimit, isDebounced]);
  // Button configuration array with all available Claude launch options
  const buttons: Array<{
    key: string;
    command: string;
    icon: string;
    title: string;
    description: string;
    variant: ButtonVariant;
  }> = [
    {
      key: 'prod',
      command: 'cd prod && claude',
      icon: '🚀',
      title: 'prod/claude',
      description: 'Launch Claude in production directory with full permissions and safety checks',
      variant: 'prod' as const,
    },
    {
      key: 'skip-permissions',
      command: 'cd prod && claude --dangerously-skip-permissions',
      icon: '⚡',
      title: 'skip-permissions',
      description: 'Launch with permissions skipped for rapid development and testing',
      variant: 'skip-permissions' as const,
    },
    {
      key: 'skip-permissions-c',
      command: 'cd prod && claude --dangerously-skip-permissions -c',
      icon: '⚡',
      title: 'skip-permissions -c',
      description: 'Launch with permissions skipped and continue from previous session',
      variant: 'skip-permissions-c' as const,
    },
    {
      key: 'skip-permissions-resume',
      command: 'cd prod && claude --dangerously-skip-permissions --resume',
      icon: '↻',
      title: 'skip-permissions --resume',
      description: 'Resume previous session with permissions skipped for quick continuation',
      variant: 'skip-permissions-resume' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Launch Claude Instance
        </h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Ready to launch</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buttons.map((button) => (
          <InstanceButton
            key={button.key}
            onClick={() => handleCreateInstance(button.command)}
            disabled={isDisabled}
            loading={loading}
            icon={button.icon}
            title={button.title}
            description={isDebounced ? 'Please wait before launching another instance' : button.description}
            variant={button.variant}
            connectionStatus={connectionStatuses[button.key] || 'disconnected'}
          />
        ))}
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            Launching Claude instance...
          </div>
        </div>
      )}
      
      {isDebounced && !loading && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Waiting for cooldown... (buttons remain clickable but will be ignored)
          </div>
        </div>
      )}
      
      {isRateLimited && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Rate limit reached - please wait before creating more instances
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaudeInstanceButtons;
export { InstanceButton };
export type { 
  ClaudeInstanceButtonsProps, 
  InstanceButtonProps, 
  ConnectionStatus, 
  ButtonVariant 
};