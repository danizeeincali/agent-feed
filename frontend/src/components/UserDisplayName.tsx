/**
 * UserDisplayName Component
 *
 * Displays a user's personalized display name by fetching from the API.
 * Falls back to "User" if no display name is set.
 *
 * Usage:
 * ```tsx
 * <UserDisplayName userId="demo-user-123" fallback="User" />
 * ```
 */

import React from 'react';
import { useUserSettings } from '../hooks/useUserSettings';

interface UserDisplayNameProps {
  userId?: string;
  fallback?: string;
  className?: string;
  showLoading?: boolean;
  loadingText?: string;
}

export const UserDisplayName: React.FC<UserDisplayNameProps> = ({
  userId,
  fallback = 'User',
  className = '',
  showLoading = false,
  loadingText = '...'
}) => {
  const { displayName, loading } = useUserSettings(userId);

  // Show loading state if enabled
  if (loading && showLoading) {
    return <span className={className}>{loadingText}</span>;
  }

  // Display the fetched display name or fallback
  return <span className={className}>{displayName || fallback}</span>;
};
