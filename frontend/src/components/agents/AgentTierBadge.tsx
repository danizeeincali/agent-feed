/**
 * AgentTierBadge Component
 *
 * Displays tier badges for agents (T1 User-facing, T2 System)
 * with color-coded styling and accessibility features.
 *
 * Features:
 * - T1 (User-facing): Blue color scheme
 * - T2 (System): Gray color scheme
 * - Multiple variants: default, compact, icon-only
 * - Full accessibility with ARIA labels
 * - TypeScript type safety
 *
 * @see /workspaces/agent-feed/docs/AGENT-ICON-EMOJI-MAPPING.md
 */

import React from 'react';

/**
 * Props for AgentTierBadge component
 */
export interface AgentTierBadgeProps {
  /** Agent tier: 1 (User-facing) or 2 (System) */
  tier: 1 | 2;
  /** Display variant */
  variant?: 'default' | 'compact' | 'icon-only';
  /** Show descriptive label (only applies to default variant) */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tier configuration with styling and labels
 */
const TIER_STYLES = {
  1: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    label: 'User-facing'
  },
  2: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    label: 'System'
  }
} as const;

/**
 * AgentTierBadge Component
 *
 * @example
 * // Default variant with full label
 * <AgentTierBadge tier={1} />
 *
 * @example
 * // Compact variant
 * <AgentTierBadge tier={2} variant="compact" />
 *
 * @example
 * // Icon-only variant
 * <AgentTierBadge tier={1} variant="icon-only" />
 *
 * @example
 * // Without label
 * <AgentTierBadge tier={1} showLabel={false} />
 */
export const AgentTierBadge: React.FC<AgentTierBadgeProps> = ({
  tier,
  variant = 'default',
  showLabel = true,
  className = ''
}) => {
  const styles = TIER_STYLES[tier];

  // Icon-only variant: circular badge with just the tier number
  if (variant === 'icon-only') {
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${styles.bg} ${styles.text} text-xs font-medium ${className}`}
        aria-label={`Tier ${tier}: ${styles.label}`}
      >
        {tier}
      </span>
    );
  }

  // Compact variant: short badge with tier code only
  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles.bg} ${styles.text} ${className}`}
        aria-label={`Tier ${tier}`}
      >
        T{tier}
      </span>
    );
  }

  // Default variant: full badge with optional label
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
      aria-label={`Tier ${tier}: ${styles.label}`}
    >
      {showLabel ? `T${tier} - ${styles.label}` : `T${tier}`}
    </span>
  );
};

// Export type for external use
export type { AgentTierBadgeProps as AgentTierBadgePropsType };
