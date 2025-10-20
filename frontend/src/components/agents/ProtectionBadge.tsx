/**
 * ProtectionBadge Component
 *
 * Displays a visual indicator for protected agents that cannot be modified.
 * Part of the Agent Protection Validation System (PSEUDOCODE-PROTECTION-VALIDATION.md)
 *
 * Features:
 * - Lock icon with red/warning styling
 * - Tooltip explaining protection reason
 * - ARIA announcements for screen readers
 * - Full TypeScript type safety
 *
 * Protection Scope:
 * - Tier 2 protected agents (Phase 4.2 specialists)
 * - System-critical agents in .system directory
 * - Meta-coordination agents (meta-agent, meta-update-agent)
 *
 * @module components/agents/ProtectionBadge
 * @author SPARC Implementation Specialist
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

/**
 * Props interface for ProtectionBadge component
 */
export interface ProtectionBadgeProps {
  /**
   * Whether the agent is protected from modification
   * @required
   */
  isProtected: boolean;

  /**
   * Explanation of why the agent is protected
   * @optional
   * @default "This agent is protected from modification"
   */
  protectionReason?: string;

  /**
   * Whether to show tooltip on hover
   * @optional
   * @default true
   */
  showTooltip?: boolean;

  /**
   * Additional CSS classes to apply to the badge
   * @optional
   * @default ""
   */
  className?: string;
}

/**
 * Default protection reason message
 */
const DEFAULT_PROTECTION_REASON = 'This agent is protected from modification';

/**
 * ProtectionBadge Component
 *
 * Renders a badge indicating an agent is protected from modification.
 * Includes a lock icon, "Protected" text, and an optional tooltip
 * explaining the protection reason.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ProtectionBadge isProtected={true} />
 *
 * // With custom protection reason
 * <ProtectionBadge
 *   isProtected={true}
 *   protectionReason="System critical - Phase 4.2 specialist agent"
 * />
 *
 * // Without tooltip
 * <ProtectionBadge isProtected={true} showTooltip={false} />
 *
 * // With custom styling
 * <ProtectionBadge isProtected={true} className="ml-2" />
 * ```
 *
 * @param props - Component props
 * @returns React component or null if not protected
 */
export const ProtectionBadge: React.FC<ProtectionBadgeProps> = ({
  isProtected,
  protectionReason = DEFAULT_PROTECTION_REASON,
  showTooltip = true,
  className = ''
}) => {
  // State for tooltip visibility
  const [showTooltipState, setShowTooltipState] = useState(false);

  /**
   * Early return if agent is not protected
   * Component renders nothing (null) for unprotected agents
   */
  if (!isProtected) {
    return null;
  }

  /**
   * Normalize protection reason
   * If empty string provided, fall back to default
   */
  const normalizedReason = protectionReason?.trim() || DEFAULT_PROTECTION_REASON;

  /**
   * Handle mouse enter event
   * Shows tooltip if showTooltip prop is true
   */
  const handleMouseEnter = () => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  };

  /**
   * Handle mouse leave event
   * Hides tooltip
   */
  const handleMouseLeave = () => {
    setShowTooltipState(false);
  };

  /**
   * Handle focus event (keyboard accessibility)
   * Shows tooltip when badge receives keyboard focus
   */
  const handleFocus = () => {
    if (showTooltip) {
      setShowTooltipState(true);
    }
  };

  /**
   * Handle blur event (keyboard accessibility)
   * Hides tooltip when badge loses keyboard focus
   */
  const handleBlur = () => {
    setShowTooltipState(false);
  };

  return (
    <div className="relative inline-flex">
      <span
        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300 ${className}`}
        aria-label="Protected agent - cannot be modified"
        role="status"
        tabIndex={0}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <Lock className="w-3 h-3 mr-1" aria-hidden="true" />
        <span>Protected</span>
      </span>

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10"
          role="tooltip"
          aria-live="polite"
        >
          {normalizedReason}
          {/* Tooltip arrow */}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Display name for React DevTools
 */
ProtectionBadge.displayName = 'ProtectionBadge';

/**
 * Default export for convenience
 */
export default ProtectionBadge;
