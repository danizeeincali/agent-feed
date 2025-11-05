/**
 * UserContext - Provides current user information throughout the app
 *
 * This context provides the current user's ID and related information
 * to all components, replacing hardcoded user IDs.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  userId: string;
  setUserId: (userId: string) => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  defaultUserId?: string;
}

export const UserProvider: React.FC<UserProviderProps> = ({
  children,
  defaultUserId = 'demo-user-123'
}) => {
  const [userId, setUserId] = useState<string>(defaultUserId);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Initialize userId from localStorage or session if available
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      setIsAuthenticated(true);
    }
  }, []);

  // Persist userId changes to localStorage
  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
    }
  }, [userId]);

  const value: UserContextType = {
    userId,
    setUserId,
    isAuthenticated
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

/**
 * Hook to access user context
 * @throws Error if used outside of UserProvider
 */
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
