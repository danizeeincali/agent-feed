/**
 * TDD Unit Tests: AuthorDisplayName Component
 *
 * Tests the AuthorDisplayName component which intelligently displays author names.
 * For agents: displays mapped name without API calls
 * For users: fetches display name from API via useUserSettings hook
 *
 * Test Coverage:
 * - Agent Display - 5 tests
 * - User Display - 8 tests
 * - Loading States - 3 tests
 * - Error Handling - 2 tests
 * - Edge Cases - 4 tests
 * Total: 22 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthorDisplayName } from '../../components/AuthorDisplayName';

// Mock useUserSettings hook
vi.mock('../../hooks/useUserSettings', () => ({
  useUserSettings: vi.fn()
}));

import { useUserSettings } from '../../hooks/useUserSettings';

describe('AuthorDisplayName Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Display', () => {
    it('should display Λvi for avi agent ID', () => {
      render(<AuthorDisplayName authorId="avi" />);
      expect(screen.getByText('Λvi')).toBeInTheDocument();
    });

    it('should display Λvi for lambda-vi agent ID', () => {
      render(<AuthorDisplayName authorId="lambda-vi" />);
      expect(screen.getByText('Λvi')).toBeInTheDocument();
    });

    it('should display Get-to-Know-You for get-to-know-you-agent', () => {
      render(<AuthorDisplayName authorId="get-to-know-you-agent" />);
      expect(screen.getByText('Get-to-Know-You')).toBeInTheDocument();
    });

    it('should display System Guide for system agent', () => {
      render(<AuthorDisplayName authorId="system" />);
      expect(screen.getByText('System Guide')).toBeInTheDocument();
    });

    it('should not call useUserSettings for agent IDs', () => {
      render(<AuthorDisplayName authorId="avi" />);
      expect(useUserSettings).not.toHaveBeenCalled();

      render(<AuthorDisplayName authorId="lambda-vi" />);
      expect(useUserSettings).not.toHaveBeenCalled();

      render(<AuthorDisplayName authorId="get-to-know-you-agent" />);
      expect(useUserSettings).not.toHaveBeenCalled();
    });

    it('should apply custom className to agent names', () => {
      const { container } = render(
        <AuthorDisplayName authorId="avi" className="text-blue-500 font-bold" />
      );
      const span = container.querySelector('span');
      expect(span).toHaveClass('text-blue-500', 'font-bold');
    });
  });

  describe('User Display', () => {
    it('should display Woz for demo-user-123', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="demo-user-123" />);
      expect(screen.getByText('Woz')).toBeInTheDocument();
    });

    it('should call useUserSettings for user IDs', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="demo-user-123" />);
      expect(useUserSettings).toHaveBeenCalledWith('demo-user-123');
    });

    it('should call useUserSettings exactly once per render', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'TestUser',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-456" />);
      expect(useUserSettings).toHaveBeenCalledTimes(1);
      expect(useUserSettings).toHaveBeenCalledWith('user-456');
    });

    it('should show fallback when no display name', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: null,
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="unknown-user" fallback="Anonymous" />);
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
    });

    it('should use default fallback "Unknown" when not specified', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: null,
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-789" />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should show empty string display name when returned from API', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: '',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" fallback="Guest" />);
      expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('should apply custom className to user names', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'TestUser',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      const { container } = render(
        <AuthorDisplayName authorId="user-123" className="text-green-600" />
      );
      const span = container.querySelector('span');
      expect(span).toHaveClass('text-green-600');
    });

    it('should handle special characters in display names', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'User@2025!',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" />);
      expect(screen.getByText('User@2025!')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when showLoading is true and loading', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" showLoading={true} />);
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    it('should not show loading indicator when showLoading is false', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" showLoading={false} fallback="User" />);
      expect(screen.queryByText('...')).not.toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('should show display name after loading completes', () => {
      const { rerender } = render(<AuthorDisplayName authorId="user-123" showLoading={true} />);

      // Initially loading
      (useUserSettings as any).mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });
      rerender(<AuthorDisplayName authorId="user-123" showLoading={true} />);
      expect(screen.getByText('...')).toBeInTheDocument();

      // After loading
      (useUserSettings as any).mockReturnValue({
        displayName: 'LoadedUser',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });
      rerender(<AuthorDisplayName authorId="user-123" showLoading={true} />);
      expect(screen.queryByText('...')).not.toBeInTheDocument();
      expect(screen.getByText('LoadedUser')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show fallback when error occurs', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: null,
        loading: false,
        error: new Error('API Error'),
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" fallback="Error User" />);
      expect(screen.getByText('Error User')).toBeInTheDocument();
    });

    it('should show display name if available despite error', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'CachedUser',
        loading: false,
        error: new Error('API Error'),
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" />);
      expect(screen.getByText('CachedUser')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty author ID', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: null,
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="" fallback="No Author" />);
      expect(screen.getByText('No Author')).toBeInTheDocument();
    });

    it('should handle whitespace-only display names', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: '   ',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      const { container } = render(<AuthorDisplayName authorId="user-123" />);
      // Whitespace is normalized by the DOM, so check the container text content
      const span = container.querySelector('span');
      expect(span?.textContent).toBe('   ');
    });

    it('should handle very long display names', () => {
      const longName = 'A'.repeat(100);
      (useUserSettings as any).mockReturnValue({
        displayName: longName,
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" />);
      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle unicode characters in display names', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: '用户名 🚀',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      render(<AuthorDisplayName authorId="user-123" />);
      expect(screen.getByText('用户名 🚀')).toBeInTheDocument();
    });
  });

  describe('Props Validation', () => {
    it('should accept all valid props', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'TestUser',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      expect(() => {
        render(
          <AuthorDisplayName
            authorId="user-123"
            fallback="Fallback"
            className="custom-class"
            showLoading={true}
          />
        );
      }).not.toThrow();
    });

    it('should render with minimal props', () => {
      (useUserSettings as any).mockReturnValue({
        displayName: 'MinimalUser',
        loading: false,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      expect(() => {
        render(<AuthorDisplayName authorId="user-123" />);
      }).not.toThrow();

      expect(screen.getByText('MinimalUser')).toBeInTheDocument();
    });
  });
});
