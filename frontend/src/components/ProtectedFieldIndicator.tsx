import React from 'react';
import { Lock, Info } from 'lucide-react';

interface ProtectedFieldIndicatorProps {
  /**
   * The name of the protected field
   */
  fieldName: string;

  /**
   * Optional description of why field is protected
   */
  reason?: string;

  /**
   * Display mode: inline (next to field) or block (separate line)
   */
  mode?: 'inline' | 'block';

  /**
   * Show tooltip on hover
   */
  showTooltip?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

/**
 * ProtectedFieldIndicator Component
 *
 * Visual indicator showing that a field is protected and cannot be edited.
 * Displays a lock icon with tooltip explaining the protection.
 *
 * Features:
 * - Lock icon for protected fields
 * - Tooltip with explanation
 * - Read-only styling
 * - Dark mode support
 * - Accessible with ARIA labels
 */
const ProtectedFieldIndicator: React.FC<ProtectedFieldIndicatorProps> = ({
  fieldName,
  reason,
  mode = 'inline',
  showTooltip = true,
  className = ''
}) => {
  const [showInfo, setShowInfo] = React.useState(false);

  const defaultReason = reason ||
    'This field is protected by system configuration and cannot be modified by users. ' +
    'Only system administrators can update protected fields to ensure system security and stability.';

  const renderInlineMode = () => (
    <div
      className={`inline-flex items-center space-x-1 text-gray-500 dark:text-gray-400 ${className}`}
      role="status"
      aria-label={`${fieldName} is protected`}
    >
      <Lock
        className="w-3 h-3 text-blue-500 dark:text-blue-400"
        aria-hidden="true"
      />
      <span className="text-xs font-medium">Protected</span>

      {showTooltip && (
        <div className="relative group">
          <Info
            className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help"
            aria-label="Information about protected field"
          />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="font-medium mb-1">Protected Field</div>
            <div className="text-gray-300 dark:text-gray-400">{defaultReason}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBlockMode = () => (
    <div
      className={`flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg ${className}`}
      role="alert"
      aria-label={`${fieldName} is protected`}
    >
      <Lock
        className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Protected Field
          </span>
          {showTooltip && (
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              aria-label="Toggle information"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
        {showInfo && (
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
            {defaultReason}
          </p>
        )}
      </div>
    </div>
  );

  return mode === 'inline' ? renderInlineMode() : renderBlockMode();
};

/**
 * ProtectedBadge Component
 *
 * Compact badge version for use in lists or compact UIs
 */
export const ProtectedBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    className={`inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full ${className}`}
    role="status"
    aria-label="Protected"
  >
    <Lock className="w-2.5 h-2.5" aria-hidden="true" />
    <span>Protected</span>
  </span>
);

/**
 * ProtectedFieldWrapper Component
 *
 * Wrapper for protected fields with consistent styling
 */
export const ProtectedFieldWrapper: React.FC<{
  children: React.ReactNode;
  fieldName: string;
  reason?: string;
  className?: string;
}> = ({ children, fieldName, reason, className = '' }) => (
  <div className={`relative ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {fieldName}
      </label>
      <ProtectedFieldIndicator fieldName={fieldName} reason={reason} />
    </div>
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-800/50 cursor-not-allowed rounded"></div>
    </div>
  </div>
);

export default ProtectedFieldIndicator;
