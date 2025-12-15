import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SocialMediaFeed from '@/components/SocialMediaFeed';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { apiService } from '@/services/api';

// Mock the API service
vi.mock('@/services/api', () => ({
  apiService: {
    getAgentPosts: vi.fn(),
    searchPosts: vi.fn(),
    checkDatabaseConnection: vi.fn(),
  },
}));

// Mock the WebSocket context
vi.mock('@/context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useWebSocketContext: () => ({
    isConnected: true,
    on: vi.fn(),
    off: vi.fn(),
    subscribeFeed: vi.fn(),
    unsubscribeFeed: vi.fn(),
    subscribePost: vi.fn(),
    addNotification: vi.fn(),
  }),
}));

// Mock other components
vi.mock('@/components/PostCreator', () => ({
  PostCreator: () => <div data-testid="post-creator">PostCreator</div>,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('@/components/TypingIndicator', () => ({
  TypingIndicator: () => <div data-testid="typing-indicator">TypingIndicator</div>,
}));

vi.mock('@/components/LiveActivityIndicator', () => ({
  LiveActivityIndicator: () => <div data-testid="live-activity-indicator">LiveActivityIndicator</div>,
}));

describe('SocialMediaFeed - Search Input Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API responses
    (apiService.getAgentPosts as any).mockResolvedValue({
      success: true,
      data: [],
    });

    (apiService.checkDatabaseConnection as any).mockResolvedValue({
      connected: true,
      fallback: false,
    });
  });

  it('should render search input without toggle button', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);

    // Try to find search toggle button (should not exist)
    const searchToggleButton = screen.queryByRole('button', { name: /search posts/i });

    // Assert
    expect(searchInput).toBeVisible();
    expect(searchToggleButton).toBeNull();
  });

  it('should render search input always visible on mount', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);

    // Assert
    expect(searchInput).toBeVisible();
    expect(searchInput).toBeEnabled();
  });

  it('should have Row 1 with title and refresh button', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find title and refresh button
    const title = screen.getByText(/agent feed/i);
    const refreshButton = screen.getByTitle(/refresh feed/i);

    // Get parent containers
    const titleParent = title.closest('div');
    const refreshParent = refreshButton.closest('button');

    // Assert both exist
    expect(title).toBeInTheDocument();
    expect(refreshButton).toBeInTheDocument();
    expect(titleParent).toBeInTheDocument();
    expect(refreshParent).toBeInTheDocument();

    // They should be in the same flex container (Row 1)
    const commonParent = titleParent?.parentElement;
    expect(commonParent).toContainElement(titleParent);
    expect(commonParent).toContainElement(refreshParent);
  });

  it('should have Row 2 with search input and filter controls', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find search input and filter dropdown
    const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);
    const filterDropdown = screen.getByDisplayValue(/all posts/i);

    // Get containers
    const searchContainer = searchInput.closest('div.relative');

    // Assert both exist
    expect(searchContainer).toBeInTheDocument();
    expect(filterDropdown).toBeInTheDocument();

    // Both should be in Row 2 (same parent container)
    const row2Container = searchContainer?.parentElement;
    expect(row2Container).toContainElement(searchContainer);
  });

  it('should render filter dropdown in Row 2', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find filter dropdown
    const filterDropdown = screen.getByDisplayValue(/all posts/i);

    // Assert
    expect(filterDropdown).toBeVisible();
    expect(filterDropdown.tagName).toBe('SELECT');
  });

  it('should render sort dropdown in Row 2', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find sort dropdown
    const sortDropdown = screen.getByDisplayValue(/newest first/i);

    // Assert
    expect(sortDropdown).toBeVisible();
    expect(sortDropdown.tagName).toBe('SELECT');
  });

  it('should have correct placeholder text in search input', async () => {
    // Arrange & Act
    render(
      <WebSocketProvider>
        <SocialMediaFeed />
      </WebSocketProvider>
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/agent feed/i)).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search posts by title, content, or author/i);

    // Assert
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('placeholder', 'Search posts by title, content, or author...');
  });
});
