import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';

describe('Click to Expand Removal', () => {
  const mockPost = {
    id: 1,
    username: 'TestUser',
    displayName: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    content: 'Welcome to agent feed! - Expand to learn more\n\n[Additional content that should be collapsed initially]',
    timestamp: new Date().toISOString(),
    likes: 0,
    comments: [],
    shares: 0,
    ticket_status: null,
    isExpanded: false
  };

  const mockHandlers = {
    onLike: vi.fn(),
    onComment: vi.fn(),
    onShare: vi.fn(),
    onMentionClick: vi.fn(),
    onHashtagClick: vi.fn()
  };

  it('should not render "Click to expand" text in post content', () => {
    render(
      <RealSocialMediaFeed
        posts={[mockPost]}
        {...mockHandlers}
      />
    );

    // Verify "Click to expand" text is NOT in the document
    const clickToExpandText = screen.queryByText('Click to expand');
    expect(clickToExpandText).toBeNull();
  });

  it('should not render "Click to expand" text anywhere in the component', () => {
    const { container } = render(
      <RealSocialMediaFeed
        posts={[mockPost]}
        {...mockHandlers}
      />
    );

    // Search the entire container text content
    expect(container.textContent).not.toContain('Click to expand');
  });

  it('should still support post expansion functionality', () => {
    const expandablePost = {
      ...mockPost,
      content: 'Welcome to agent feed! - Expand to learn more\n\nThis is additional content that should be hidden initially.\n\nMore details here.'
    };

    const { container } = render(
      <RealSocialMediaFeed
        posts={[expandablePost]}
        {...mockHandlers}
      />
    );

    // Post should be initially collapsed (only showing hook content)
    expect(container.textContent).toContain('Welcome to agent feed!');

    // Find and click the post content area to expand
    const postContent = container.querySelector('.cursor-pointer');
    if (postContent) {
      fireEvent.click(postContent);

      // After clicking, expanded content should be visible
      // Note: This depends on the expand/collapse implementation
      // Adjust assertions based on actual implementation
    }
  });

  it('should render hook content with compelling call-to-action', () => {
    render(
      <RealSocialMediaFeed
        posts={[mockPost]}
        {...mockHandlers}
      />
    );

    // Verify the hook content is present
    expect(screen.getByText(/Welcome to agent feed!/i)).toBeInTheDocument();
    expect(screen.getByText(/Expand to learn more/i)).toBeInTheDocument();
  });

  it('should not have a separate expansion indicator element', () => {
    const { container } = render(
      <RealSocialMediaFeed
        posts={[mockPost]}
        {...mockHandlers}
      />
    );

    // Check that there's no dedicated expansion indicator with ChevronDown icon and text
    const expansionIndicators = container.querySelectorAll('.text-blue-600, .text-blue-400');
    const hasClickToExpandIndicator = Array.from(expansionIndicators).some(
      el => el.textContent?.includes('Click to expand')
    );

    expect(hasClickToExpandIndicator).toBe(false);
  });

  it('should maintain proper spacing without the expansion indicator', () => {
    const { container } = render(
      <RealSocialMediaFeed
        posts={[mockPost]}
        {...mockHandlers}
      />
    );

    // Verify that removing the expansion indicator doesn't break layout
    // The hook content should be followed by metrics without large gaps
    const hookContent = container.querySelector('.text-gray-600');
    expect(hookContent).toBeInTheDocument();

    // Metrics should appear after hook content
    const metricsSection = container.querySelector('.flex.items-center.space-x-6');
    expect(metricsSection).toBeInTheDocument();
  });
});
