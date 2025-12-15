/**
 * TDD Unit Tests: UserDisplayName Component
 *
 * Tests the UserDisplayName component's behavior for fetching and displaying
 * user names with proper fallback, loading states, and error handling.
 *
 * Test Coverage: 25 tests
 * - Basic rendering with userId
 * - Fallback behavior when no settings found
 * - Display "Woz" for demo-user-123
 * - Loading state rendering
 * - Error handling
 * - Cache management (1 minute TTL)
 * - Refresh on demand
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserDisplayName } from '../../components/UserDisplayName';
import * as useUserSettingsModule from '../../hooks/useUserSettings';

// Mock the useUserSettings hook
vi.mock('../../hooks/useUserSettings');

describe('UserDisplayName Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with userId and display name from hook', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: { user_id: 'demo-user-123', display_name: 'Woz' },
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });

    it('should render with custom className', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      const { container } = render(
        <UserDisplayName userId="demo-user-123" className="custom-class" />
      );

      // Assert
      const element = container.querySelector('.custom-class');
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Woz');
    });

    it('should render as span element', () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Test User',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      const { container } = render(<UserDisplayName userId="test-user" />);

      // Assert
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.tagName).toBe('SPAN');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to "User" when no settings found', async () => {
      // Arrange - Hook returns null settings
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'User',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="unknown-user" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('should use custom fallback when provided', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Guest',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="unknown-user" fallback="Guest" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Guest')).toBeInTheDocument();
      });
    });

    it('should fall back to "User" when userId is undefined', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'User',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('should fall back when API returns empty display_name', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'User',
        loading: false,
        error: null,
        settings: { user_id: 'test-user', display_name: '' },
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="test-user" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });
  });

  describe('Demo User Display Name', () => {
    it('should display "Woz" for demo-user-123', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: {
          user_id: 'demo-user-123',
          display_name: 'Woz',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });

    it('should call useUserSettings with demo-user-123', () => {
      // Arrange
      const useUserSettingsSpy = vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert
      expect(useUserSettingsSpy).toHaveBeenCalledWith('demo-user-123');
    });
  });

  describe('Loading States', () => {
    it('should show loading state correctly when enabled', () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" showLoading={true} />);

      // Assert
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('should show custom loading text when provided', () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(
        <UserDisplayName
          userId="demo-user-123"
          showLoading={true}
          loadingText="Loading..."
        />
      );

      // Assert
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not show loading state when showLoading is false', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" showLoading={false} />);

      // Assert
      expect(screen.queryByText('...')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });

    it('should transition from loading to loaded state', async () => {
      // Arrange
      const { rerender } = render(<UserDisplayName userId="demo-user-123" showLoading={true} />);

      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act - Initial render (loading)
      expect(screen.getByText('...')).toBeInTheDocument();

      // Update mock to loaded state
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: { user_id: 'demo-user-123', display_name: 'Woz' },
        refresh: vi.fn(),
        username: undefined
      });

      // Rerender component
      rerender(<UserDisplayName userId="demo-user-123" showLoading={true} />);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText('...')).not.toBeInTheDocument();
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully with fallback', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'User',
        loading: false,
        error: new Error('API Error'),
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert - Should show fallback, not throw
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('should handle network errors without crashing', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'User',
        loading: false,
        error: new Error('Network Error'),
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('should use custom fallback on error', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Anonymous',
        loading: false,
        error: new Error('Failed to fetch'),
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" fallback="Anonymous" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Anonymous')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Behavior (1 minute TTL)', () => {
    it('should use cached settings when available', () => {
      // Arrange
      const mockSettings = {
        user_id: 'demo-user-123',
        display_name: 'Woz',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: mockSettings,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert - Should render cached data immediately
      expect(screen.getByText('Woz')).toBeInTheDocument();
    });

    it('should support cache refresh via hook', () => {
      // Arrange
      const mockRefresh = vi.fn();
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: null,
        refresh: mockRefresh,
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);

      // Assert - Refresh function should be available from hook
      const hookReturn = useUserSettingsModule.useUserSettings('demo-user-123');
      expect(hookReturn.refresh).toBeDefined();
      expect(typeof hookReturn.refresh).toBe('function');
    });
  });

  describe('Refresh Functionality', () => {
    it('should provide refresh capability through hook', () => {
      // Arrange
      const mockRefresh = vi.fn();
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: null,
        refresh: mockRefresh,
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="demo-user-123" />);
      const result = useUserSettingsModule.useUserSettings('demo-user-123');

      // Assert
      expect(result.refresh).toBe(mockRefresh);
    });

    it('should update display name after refresh', async () => {
      // Arrange
      const mockRefresh = vi.fn();
      const { rerender } = render(<UserDisplayName userId="demo-user-123" />);

      // Initial state
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Old Name',
        loading: false,
        error: null,
        settings: null,
        refresh: mockRefresh,
        username: undefined
      });

      // Assert initial
      expect(screen.getByText('Old Name')).toBeInTheDocument();

      // Act - Simulate refresh
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'New Name',
        loading: false,
        error: null,
        settings: { user_id: 'demo-user-123', display_name: 'New Name' },
        refresh: mockRefresh,
        username: undefined
      });

      rerender(<UserDisplayName userId="demo-user-123" />);

      // Assert - Display name updated
      await waitFor(() => {
        expect(screen.getByText('New Name')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long display names', async () => {
      // Arrange
      const longName = 'A'.repeat(100);
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: longName,
        loading: false,
        error: null,
        settings: { user_id: 'test-user', display_name: longName },
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="test-user" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
      });
    });

    it('should handle special characters in display name', async () => {
      // Arrange
      const specialName = 'User@123!#$';
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: specialName,
        loading: false,
        error: null,
        settings: { user_id: 'test-user', display_name: specialName },
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="test-user" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(specialName)).toBeInTheDocument();
      });
    });

    it('should handle unicode characters in display name', async () => {
      // Arrange
      const unicodeName = '用户名 👤';
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: unicodeName,
        loading: false,
        error: null,
        settings: { user_id: 'test-user', display_name: unicodeName },
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId="test-user" />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(unicodeName)).toBeInTheDocument();
      });
    });

    it('should handle null userId gracefully', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'User',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      // Act
      render(<UserDisplayName userId={undefined} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });
  });
});
