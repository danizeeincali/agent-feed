/**
 * useUserSettings Hook
 *
 * Fetches and caches user settings including display names from the API.
 * Provides loading states and fallback to "User" if no display name is set.
 *
 * Usage:
 * ```tsx
 * const { displayName, loading, error, refresh } = useUserSettings(userId);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface UserSettings {
  id?: string;
  user_id: string;
  display_name: string;
  username?: string;
  profile_data?: any;
  preferences?: any;
  created_at?: string;
  updated_at?: string;
}

interface UseUserSettingsResult {
  displayName: string;
  username?: string;
  loading: boolean;
  error: Error | null;
  settings: UserSettings | null;
  refresh: () => Promise<void>;
}

// Global cache for user settings to avoid redundant API calls
const userSettingsCache = new Map<string, { settings: UserSettings; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Custom hook to fetch and manage user settings
 * @param userId - The user ID to fetch settings for
 * @returns User settings data and state
 */
export function useUserSettings(userId?: string): UseUserSettingsResult {
  const [displayName, setDisplayName] = useState<string>('User');
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const fetchUserSettings = useCallback(async () => {
    if (!userId) {
      setDisplayName('User');
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = userSettingsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[useUserSettings] Using cached settings for', userId);
      setDisplayName(cached.settings.display_name || 'User');
      setUsername(cached.settings.username);
      setSettings(cached.settings);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useUserSettings] Fetching settings for', userId);
      const result = await apiService.getUserSettings(userId);

      if (result.success && result.data) {
        const userSettings = result.data;

        // Update cache
        userSettingsCache.set(userId, {
          settings: userSettings,
          timestamp: Date.now()
        });

        // Set display name (fallback to User if not set)
        setDisplayName(userSettings.display_name || 'User');
        setUsername(userSettings.username);
        setSettings(userSettings);

        console.log('[useUserSettings] Settings loaded:', {
          userId,
          displayName: userSettings.display_name,
          username: userSettings.username
        });
      } else {
        // No settings found - use fallback
        console.log('[useUserSettings] No settings found for', userId, '- using fallback');
        setDisplayName('User');
        setUsername(undefined);
        setSettings(null);
      }
    } catch (err) {
      console.error('[useUserSettings] Error fetching settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user settings'));
      // Use fallback on error
      setDisplayName('User');
      setUsername(undefined);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchUserSettings();
  }, [fetchUserSettings]);

  // Provide refresh function
  const refresh = useCallback(async () => {
    // Clear cache for this user
    if (userId) {
      userSettingsCache.delete(userId);
    }
    await fetchUserSettings();
  }, [userId, fetchUserSettings]);

  return {
    displayName,
    username,
    loading,
    error,
    settings,
    refresh
  };
}

/**
 * Clear the entire user settings cache
 * Useful after user updates their settings
 */
export function clearUserSettingsCache(userId?: string): void {
  if (userId) {
    userSettingsCache.delete(userId);
  } else {
    userSettingsCache.clear();
  }
}
