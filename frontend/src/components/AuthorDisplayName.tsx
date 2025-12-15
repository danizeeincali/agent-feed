import React from 'react';
import { isAgentId, getAgentDisplayName } from '../utils/authorUtils';
import { useUserSettings } from '../hooks/useUserSettings';

interface AuthorDisplayNameProps {
  authorId: string;
  fallback?: string;
  className?: string;
  showLoading?: boolean;
}

export const AuthorDisplayName: React.FC<AuthorDisplayNameProps> = ({
  authorId,
  fallback = 'Unknown',
  className = '',
  showLoading = false
}) => {
  // If agent ID, return agent name directly (no API call)
  if (isAgentId(authorId)) {
    return <span className={className}>{getAgentDisplayName(authorId)}</span>;
  }

  // If user ID, fetch display name from API
  const { displayName, loading } = useUserSettings(authorId);

  if (loading && showLoading) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{displayName || fallback}</span>;
};
