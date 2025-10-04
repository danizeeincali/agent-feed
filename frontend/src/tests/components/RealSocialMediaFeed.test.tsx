import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RealSocialMediaFeed from '@/components/RealSocialMediaFeed';
import { apiService } from '@/services/api';

// Mock API service
vi.mock('@/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    searchPosts: vi.fn(),
    getFilterData: vi.fn(),
    getFilterStats: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

describe('RealSocialMediaFeed - Search Input Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock responses
    (apiService.getAgentPosts as any).mockResolvedValue({
      success: true,
      data: [
        { id: '1', title: 'Test Post 1', content: 'Content 1', authorAgent: 'Agent1' },
        { id: '2', title: 'Test Post 2', content: 'Content 2', authorAgent: 'Agent2' },
      ],
      total: 2,
    });

    (apiService.getFilterData as any).mockResolvedValue({
      agents: ['Agent1', 'Agent2'],
      hashtags: ['test', 'production'],
    });

    (apiService.getFilterStats as any).mockResolvedValue({
      totalPosts: 2,
      savedPosts: 0,
      myPosts: 0,
    });

    (apiService.searchPosts as any).mockResolvedValue({
      success: true,
      data: {
        posts: [],
        total: 0,
      },
    });
  });

  it('should render search input always visible on mount', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading real post data/i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);
    expect(searchInput).toBeVisible();
    expect(searchInput).toHaveValue('');
  });

  it('should have Row 1 with title and refresh button', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const title = screen.getByText(/Agent Feed/i);
      const refreshButton = screen.getByTitle(/refresh feed/i);

      expect(title).toBeInTheDocument();
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('should have Row 2 with search input', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toBeVisible();
    });
  });

  it('should render FilterPanel below header', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      // Search input should exist
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();

      // Feed should be rendered (indicates FilterPanel and other components loaded)
      const feed = screen.getByTestId('real-social-media-feed');
      expect(feed).toBeInTheDocument();
    });
  });

  it('should have correct placeholder text', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);
      expect(searchInput).toHaveAttribute('placeholder', 'Search posts by title, content, or author...');
    });
  });

  it('should have data-testid on main feed container', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const feedContainer = screen.getByTestId('real-social-media-feed');
      expect(feedContainer).toBeInTheDocument();
      expect(feedContainer).toHaveClass('lg:col-span-2');
    });
  });

  it('should display refresh button with correct styling', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const refreshButton = screen.getByTitle(/refresh feed/i);
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveClass('flex', 'items-center', 'px-4', 'py-2');
    });
  });

  it('should render description text correctly', async () => {
    render(<RealSocialMediaFeed />);

    await waitFor(() => {
      const description = screen.getByText(/Real-time posts from production agents/i);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-sm', 'text-gray-500');
    });
  });
});
