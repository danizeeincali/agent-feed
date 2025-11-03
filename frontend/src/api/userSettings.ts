/**
 * User Settings API Service
 * Frontend wrapper for user settings API endpoints
 *
 * SPARC Implementation: FR-3 - API Endpoints for Username Management
 * Spec: /workspaces/agent-feed/docs/SPARC-USERNAME-COLLECTION.md
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * User Settings Response Interface
 */
export interface UserSettings {
  user_id: string;
  display_name: string;
  display_name_style?: 'first_only' | 'full_name' | 'nickname' | 'professional' | null;
  onboarding_completed: number;
  onboarding_completed_at?: number | null;
  created_at: number;
  updated_at: number;
}

/**
 * API Response Interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * User Settings Create/Update Request
 */
export interface CreateUserSettingsRequest {
  user_id: string;
  display_name: string;
  display_name_style?: 'first_only' | 'full_name' | 'nickname' | 'professional';
}

/**
 * User Settings Update Request (partial)
 */
export interface UpdateUserSettingsRequest {
  display_name?: string;
  display_name_style?: 'first_only' | 'full_name' | 'nickname' | 'professional';
  onboarding_completed?: number;
  onboarding_completed_at?: number;
}

/**
 * GET /api/user-settings/:userId
 * Retrieve user settings by user ID
 *
 * @param userId - User ID
 * @returns User settings or null if not found
 * @throws Error on network or server errors
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-settings/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorData: ApiResponse<never> = await response.json();
      throw new Error(errorData.error || 'Failed to get user settings');
    }

    const result: ApiResponse<UserSettings> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response from server');
    }

    return result.data;
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
}

/**
 * POST /api/user-settings
 * Create or update user settings
 *
 * @param request - User settings data
 * @returns Created/updated user settings
 * @throws Error on validation or server errors
 */
export async function createUserSettings(
  request: CreateUserSettingsRequest
): Promise<UserSettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData: ApiResponse<never> = await response.json();
      throw new Error(errorData.error || 'Failed to create user settings');
    }

    const result: ApiResponse<UserSettings> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response from server');
    }

    return result.data;
  } catch (error) {
    console.error('Error creating user settings:', error);
    throw error;
  }
}

/**
 * PATCH /api/user-settings/:userId
 * Update specific fields in user settings
 *
 * @param userId - User ID
 * @param updates - Partial user settings to update
 * @returns Updated user settings (partial response)
 * @throws Error on validation or server errors
 */
export async function updateUserSettings(
  userId: string,
  updates: UpdateUserSettingsRequest
): Promise<Partial<UserSettings>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user-settings/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (response.status === 404) {
      throw new Error('User settings not found');
    }

    if (!response.ok) {
      const errorData: ApiResponse<never> = await response.json();
      throw new Error(errorData.error || 'Failed to update user settings');
    }

    const result: ApiResponse<Partial<UserSettings>> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response from server');
    }

    return result.data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

/**
 * Helper: Get display name only
 * Convenience wrapper around getUserSettings
 *
 * @param userId - User ID
 * @returns Display name or null
 */
export async function getDisplayName(userId: string): Promise<string | null> {
  const settings = await getUserSettings(userId);
  return settings?.display_name || null;
}

/**
 * Helper: Update display name only
 * Convenience wrapper around updateUserSettings
 *
 * @param userId - User ID
 * @param displayName - New display name
 * @returns Updated settings
 */
export async function updateDisplayName(
  userId: string,
  displayName: string
): Promise<Partial<UserSettings>> {
  return updateUserSettings(userId, { display_name: displayName });
}

/**
 * Helper: Mark onboarding as complete
 *
 * @param userId - User ID
 * @returns Updated settings
 */
export async function completeOnboarding(
  userId: string
): Promise<Partial<UserSettings>> {
  return updateUserSettings(userId, {
    onboarding_completed: 1,
    onboarding_completed_at: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
  });
}

export default {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  getDisplayName,
  updateDisplayName,
  completeOnboarding,
};
