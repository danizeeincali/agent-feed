/**
 * AgentTierToggle Component
 *
 * A button group component for filtering agents by tier level.
 *
 * Features:
 * - Three-way toggle: Tier 1, Tier 2, All
 * - Active state indication with ARIA support
 * - Display agent counts per tier
 * - Keyboard accessible (Tab, Enter, Space)
 * - Loading state with disabled buttons
 *
 * @component
 */

import React from 'react';

export interface AgentTierToggleProps {
  /** Current selected tier */
  currentTier: '1' | '2' | 'all';
  /** Callback when tier selection changes */
  onTierChange: (tier: '1' | '2' | 'all') => void;
  /** Agent counts by tier */
  tierCounts: {
    tier1: number;
    tier2: number;
    total: number;
  };
  /** Loading state disables all buttons */
  loading?: boolean;
}

interface TierButton {
  value: '1' | '2' | 'all';
  label: string;
  count: number;
  activeColor: string;
}

export const AgentTierToggle: React.FC<AgentTierToggleProps> = ({
  currentTier,
  onTierChange,
  tierCounts,
  loading = false,
}) => {
  const buttons: TierButton[] = [
    {
      value: '1',
      label: 'Tier 1',
      count: tierCounts.tier1,
      activeColor: 'bg-blue-600',
    },
    {
      value: '2',
      label: 'Tier 2',
      count: tierCounts.tier2,
      activeColor: 'bg-gray-600',
    },
    {
      value: 'all',
      label: 'All',
      count: tierCounts.total,
      activeColor: 'bg-purple-600',
    },
  ];

  const handleTierClick = (tier: '1' | '2' | 'all') => {
    if (!loading) {
      onTierChange(tier);
    }
  };

  return (
    <div
      role="group"
      aria-label="Agent tier filter"
      className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-sm"
    >
      {buttons.map(({ value, label, count, activeColor }) => {
        const isActive = currentTier === value;

        // Determine button styling based on active state
        const activeClasses = isActive
          ? `${activeColor} dark:${activeColor.replace('600', '700')} text-white shadow-sm`
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';

        // Determine loading/disabled styling
        const loadingClasses = loading
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer transition-colors duration-150';

        return (
          <button
            key={value}
            type="button"
            onClick={() => handleTierClick(value)}
            disabled={loading}
            aria-pressed={isActive}
            className={`
              px-4 py-2 rounded-md text-sm font-medium
              ${activeClasses}
              ${loadingClasses}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            `.trim().replace(/\s+/g, ' ')}
          >
            <span className="flex items-center gap-2">
              <span>{label}</span>
              <span
                className={`
                  text-xs font-normal
                  ${isActive ? 'text-white opacity-90' : 'text-gray-500'}
                `.trim().replace(/\s+/g, ' ')}
              >
                ({count})
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

AgentTierToggle.displayName = 'AgentTierToggle';

export default AgentTierToggle;
