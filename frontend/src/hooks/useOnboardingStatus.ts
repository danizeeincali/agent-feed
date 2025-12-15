/**
 * useOnboardingStatus Hook
 * Manages onboarding state and completion tracking
 * Implements FR-5 from SPARC-USERNAME-COLLECTION.md
 *
 * This hook:
 * 1. Checks if user has completed onboarding
 * 2. Provides loading state during API calls
 * 3. Can redirect to onboarding if needed
 * 4. Allows marking onboarding as complete
 */

import { useState, useEffect, useCallback } from 'react';

interface OnboardingStatus {
  userId: string;
  onboarding_completed: boolean;
  is_first_time_user: boolean;
  display_name: string | null;
  completed_at: number | null;
  needs_onboarding: boolean;
}

interface UseOnboardingStatusReturn {
  // Status
  status: OnboardingStatus | null;
  isLoading: boolean;
  error: Error | null;

  // Computed values
  needsOnboarding: boolean;
  isFirstTimeUser: boolean;
  onboardingCompleted: boolean;

  // Actions
  checkStatus: () => Promise<void>;
  markComplete: (profileData: any) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook to check and manage onboarding status
 * @param userId - User ID (defaults to 'demo-user-123')
 * @param autoCheck - Automatically check status on mount (default: true)
 * @returns Onboarding status and control functions
 */
export function useOnboardingStatus(
  userId: string = 'demo-user-123',
  autoCheck: boolean = true
): UseOnboardingStatusReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Check onboarding status from API
   */
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user-settings/onboarding/status?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to check onboarding status: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check onboarding status');
      }

      setStatus(result.data);
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Mark onboarding as complete
   * @param profileData - Profile data collected during onboarding
   */
  const markComplete = useCallback(async (profileData: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user-settings/onboarding/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            profileData,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to mark onboarding complete: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to mark onboarding complete');
      }

      // Refresh status after marking complete
      await checkStatus();
    } catch (err) {
      console.error('Error marking onboarding complete:', err);
      setError(err as Error);
      throw err; // Re-throw so caller can handle
    } finally {
      setIsLoading(false);
    }
  }, [userId, checkStatus]);

  /**
   * Reset onboarding status (for testing)
   */
  const resetOnboarding = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/user-settings/onboarding/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reset onboarding: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to reset onboarding');
      }

      // Refresh status after reset
      await checkStatus();
    } catch (err) {
      console.error('Error resetting onboarding:', err);
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userId, checkStatus]);

  /**
   * Auto-check status on mount if enabled
   */
  useEffect(() => {
    if (autoCheck) {
      checkStatus();
    }
  }, [autoCheck, checkStatus]);

  return {
    // Status
    status,
    isLoading,
    error,

    // Computed values
    needsOnboarding: status?.needs_onboarding ?? false,
    isFirstTimeUser: status?.is_first_time_user ?? false,
    onboardingCompleted: status?.onboarding_completed ?? false,

    // Actions
    checkStatus,
    markComplete,
    resetOnboarding,
  };
}

/**
 * Hook variant that redirects to onboarding if needed
 * @param userId - User ID
 * @param redirectPath - Path to redirect to for onboarding (default: '/onboarding')
 */
export function useOnboardingRedirect(
  userId: string = 'demo-user-123',
  redirectPath: string = '/onboarding'
) {
  const onboarding = useOnboardingStatus(userId, true);

  useEffect(() => {
    // Only redirect if:
    // 1. Not loading
    // 2. Status is loaded
    // 3. User needs onboarding
    // 4. Not already on onboarding page
    if (
      !onboarding.isLoading &&
      onboarding.status &&
      onboarding.needsOnboarding &&
      window.location.pathname !== redirectPath
    ) {
      console.log('🔄 Redirecting to onboarding...');
      window.location.href = redirectPath;
    }
  }, [onboarding.isLoading, onboarding.status, onboarding.needsOnboarding, redirectPath]);

  return onboarding;
}

export default useOnboardingStatus;
