import { useState, useEffect } from 'react';

/**
 * Tier filter options
 * - "1": User-facing agents only
 * - "2": System agents only
 * - "all": All agents
 */
export type TierFilter = '1' | '2' | 'all';

/**
 * Agent filter state with localStorage persistence
 */
export interface AgentFilterState {
  currentTier: TierFilter;
  showTier1: boolean;
  showTier2: boolean;
}

const STORAGE_KEY = 'agentTierFilter';

/**
 * Custom hook for managing agent tier filtering with localStorage persistence
 *
 * Features:
 * - Persists tier preference across sessions
 * - Defaults to tier 1 (user-facing agents only)
 * - Synchronizes state with localStorage
 *
 * @returns {Object} Current tier and setter function
 */
export function useAgentTierFilter() {
  // Initialize state from localStorage or default to '1'
  const [currentTier, setCurrentTierState] = useState<TierFilter>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === '1' || saved === '2' || saved === 'all')) {
        return saved as TierFilter;
      }
    } catch (error) {
      console.warn('Failed to read tier filter from localStorage:', error);
    }
    return '1'; // Default to user-facing agents
  });

  // Persist to localStorage whenever currentTier changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currentTier);
    } catch (error) {
      console.warn('Failed to save tier filter to localStorage:', error);
    }
  }, [currentTier]);

  // Wrapper function for setting tier (validates input)
  const setCurrentTier = (tier: TierFilter) => {
    if (tier !== '1' && tier !== '2' && tier !== 'all') {
      console.error('Invalid tier value:', tier);
      return;
    }
    setCurrentTierState(tier);
  };

  // Derived state for boolean flags
  const showTier1 = currentTier === '1' || currentTier === 'all';
  const showTier2 = currentTier === '2' || currentTier === 'all';

  return {
    currentTier,
    setCurrentTier,
    showTier1,
    showTier2,
  };
}

/**
 * Clear stored tier filter preference
 */
export function clearTierFilter() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear tier filter from localStorage:', error);
  }
}
