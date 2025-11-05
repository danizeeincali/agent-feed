import { useState, useEffect } from 'react';

interface SystemInitializationResult {
  isInitializing: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Hook to detect first-time users and trigger system initialization
 *
 * This hook:
 * 1. Checks if the user has systemInitialization welcome posts
 * 2. If no welcome posts exist, calls the system initialization endpoint
 * 3. Maintains loading and error states
 * 4. Is idempotent - safe to call multiple times
 *
 * @param userId - The user ID to check (defaults to 'demo-user-123')
 * @returns Object with initialization state
 */
export function useSystemInitialization(userId: string = 'demo-user-123'): SystemInitializationResult {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAndInitialize() {
      try {
        // 1. Check system state for welcome posts
        const stateResponse = await fetch(`/api/system/state?userId=${userId}`);

        if (!stateResponse.ok) {
          throw new Error(`Failed to check system state: ${stateResponse.statusText}`);
        }

        const stateData = await stateResponse.json();

        // Check if welcome posts exist
        const hasWelcomePosts = stateData.state?.hasWelcomePosts || false;

        if (!hasWelcomePosts) {
          // 2. User is new - initialize system
          setIsInitializing(true);

          const initResponse = await fetch('/api/system/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          });

          if (!initResponse.ok) {
            throw new Error(`Failed to initialize: ${initResponse.statusText}`);
          }

          const initData = await initResponse.json();

          if (initData.success) {
            setIsInitialized(true);
            console.log('✅ System initialized:', initData.postsCreated || 0, 'welcome posts created');
          } else {
            setError(initData.error || 'Failed to initialize system');
          }
        } else {
          // User already has welcome posts - no initialization needed
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('❌ Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Don't block the app - mark as initialized to continue
        setIsInitialized(true);
      } finally {
        setIsInitializing(false);
      }
    }

    checkAndInitialize();
  }, [userId]);

  return { isInitializing, isInitialized, error };
}
