/**
 * Thumbnail-Summary Layout Test Suite
 * Tests the new layout with thumbnail on left and summary on right for unexpanded view
 * and auto-looping muted videos for expanded view
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThumbnailSummaryContainer from '../src/components/ThumbnailSummaryContainer';
import YouTubeEmbed from '../src/components/YouTubeEmbed';
import EnhancedLinkPreview from '../src/components/EnhancedLinkPreview';

describe('ThumbnailSummaryContainer', () => {
  const mockData = {
    url: 'https://example.com/article',
    title: 'Test Article Title',
    description: 'This is a test article description that should be truncated if too long.',
    image: 'https://example.com/image.jpg',
    site_name: 'example.com',
    type: 'article' as const,
    author: 'Test Author',
    readingTime: 5
  };

  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  test('renders thumbnail on left and content on right', () => {
    render(<ThumbnailSummaryContainer data={mockData} onClick={mockOnClick} />);
    
    // Check for thumbnail image
    const thumbnail = screen.getByAltText(`Preview thumbnail for ${mockData.title}`);
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', mockData.image);
    
    // Check for title
    expect(screen.getByText(mockData.title)).toBeInTheDocument();
    
    // Check for description
    expect(screen.getByText(mockData.description)).toBeInTheDocument();
    
    // Check for metadata
    expect(screen.getByText(mockData.site_name)).toBeInTheDocument();
    expect(screen.getByText(mockData.author)).toBeInTheDocument();
    expect(screen.getByText('5 min')).toBeInTheDocument();
  });

  test('handles different thumbnail sizes', () => {
    const { rerender } = render(
      <ThumbnailSummaryContainer 
        data={mockData} 
        onClick={mockOnClick} 
        thumbnailSize="small"
      />
    );
    
    let container = screen.getByRole('article');
    expect(container.querySelector('.w-16')).toBeInTheDocument();
    
    rerender(
      <ThumbnailSummaryContainer 
        data={mockData} 
        onClick={mockOnClick} 
        thumbnailSize="large"
      />
    );
    
    expect(container.querySelector('.w-24')).toBeInTheDocument();
  });

  test('shows video play overlay for video content', () => {
    const videoData = {
      ...mockData,
      type: 'video' as const,
      videoId: 'dQw4w9WgXcQ'
    };

    render(<ThumbnailSummaryContainer data={videoData} onClick={mockOnClick} />);
    
    // Should show play button overlay
    const playButton = screen.getByRole('article').querySelector('.play-button, [data-testid="play-button"]');
    expect(playButton || screen.getByText('▶')).toBeInTheDocument();
  });

  test('handles image loading errors with fallback', () => {
    render(<ThumbnailSummaryContainer data={mockData} onClick={mockOnClick} />);
    
    const thumbnail = screen.getByAltText(`Preview thumbnail for ${mockData.title}`);
    
    // Simulate image load error
    fireEvent.error(thumbnail);
    
    // Should show fallback icon
    waitFor(() => {
      const fallbackIcon = screen.getByRole('article').querySelector('svg');
      expect(fallbackIcon).toBeInTheDocument();
    });
  });

  test('calls onClick when clicked', () => {
    render(<ThumbnailSummaryContainer data={mockData} onClick={mockOnClick} />);
    
    const container = screen.getByRole('article');
    fireEvent.click(container);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('supports keyboard navigation', () => {
    render(<ThumbnailSummaryContainer data={mockData} onClick={mockOnClick} />);
    
    const container = screen.getByRole('article');
    
    // Should be focusable
    expect(container).toHaveAttribute('tabIndex', '0');
    
    // Should respond to Enter key
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // Should respond to Space key
    fireEvent.keyDown(container, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  test('truncates long text content appropriately', () => {
    const longData = {
      ...mockData,
      title: 'This is a very long title that should be truncated when it exceeds the maximum length allowed for display in the thumbnail summary container',
      description: 'This is a very long description that should be truncated when it exceeds the maximum length allowed for display in the thumbnail summary container component'
    };

    render(<ThumbnailSummaryContainer data={longData} onClick={mockOnClick} />);
    
    // Title should be truncated and show ellipsis
    const titleElement = screen.getByText(/This is a very long title/);
    expect(titleElement.textContent).toContain('...');
    
    // Description should be truncated
    const descriptionElement = screen.getByText(/This is a very long description/);
    expect(descriptionElement.textContent).toContain('...');
  });
});

describe('YouTubeEmbed Auto-Loop Functionality', () => {
  const mockVideoId = 'dQw4w9WgXcQ';
  const mockTitle = 'Test Video';

  test('enables auto-loop and mute in expanded mode', () => {
    render(
      <YouTubeEmbed
        videoId={mockVideoId}
        title={mockTitle}
        expandedMode={true}
        enableLoop={true}
        startMuted={true}
        autoplay={true}
      />
    );

    const iframe = screen.getByTitle(mockTitle);
    expect(iframe).toBeInTheDocument();
    
    const src = iframe.getAttribute('src');
    expect(src).toContain('autoplay=1');
    expect(src).toContain('mute=1');
    expect(src).toContain('loop=1');
    expect(src).toContain(`playlist=${mockVideoId}`);
  });

  test('shows loop indicator in expanded mode', () => {
    render(
      <YouTubeEmbed
        videoId={mockVideoId}
        title={mockTitle}
        expandedMode={true}
        enableLoop={true}
      />
    );

    expect(screen.getByText('🔁 Auto-looping')).toBeInTheDocument();
  });

  test('shows overlay controls in expanded mode', () => {
    render(
      <YouTubeEmbed
        videoId={mockVideoId}
        title={mockTitle}
        expandedMode={true}
      />
    );

    const container = screen.getByTitle(mockTitle).parentElement;
    expect(container?.querySelector('button[title*="Mute"]')).toBeInTheDocument();
    expect(container?.querySelector('button[title*="Open in YouTube"]')).toBeInTheDocument();
  });

  test('disables fullscreen in expanded mode', () => {
    render(
      <YouTubeEmbed
        videoId={mockVideoId}
        title={mockTitle}
        expandedMode={true}
      />
    );

    const iframe = screen.getByTitle(mockTitle);
    expect(iframe).not.toHaveAttribute('allowFullScreen');
  });

  test('shows thumbnail view by default', () => {
    render(
      <YouTubeEmbed
        videoId={mockVideoId}
        title={mockTitle}
        showThumbnailOnly={true}
      />
    );

    // Should show thumbnail image, not iframe
    const thumbnail = screen.getByAltText(mockTitle);
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', expect.stringContaining('img.youtube.com'));
  });
});

describe('EnhancedLinkPreview with Thumbnail-Summary Mode', () => {
  const mockUrl = 'https://www.wired.com/story/test-article/';

  // Mock fetch for API calls
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404
      })
    ) as jest.Mock;
  });

  test('renders in thumbnail-summary mode', async () => {
    render(
      <EnhancedLinkPreview
        url={mockUrl}
        displayMode="thumbnail-summary"
      />
    );

    await waitFor(() => {
      // Should render ThumbnailSummaryContainer
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
    });
  });

  test('detects YouTube videos and enables loop mode when expanded', async () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    render(<EnhancedLinkPreview url={youtubeUrl} />);

    await waitFor(() => {
      // Should detect as video and render YouTube embed
      const thumbnail = screen.getByAltText(/YouTube/);
      expect(thumbnail).toBeInTheDocument();
    });

    // Click to expand
    const playButton = screen.getByRole('button') || screen.getByAltText(/YouTube/);
    fireEvent.click(playButton);

    await waitFor(() => {
      // Should show expanded video with loop enabled
      const iframe = screen.getByTitle(/YouTube/);
      expect(iframe.getAttribute('src')).toContain('loop=1');
      expect(iframe.getAttribute('src')).toContain('mute=1');
      expect(iframe.getAttribute('src')).toContain('autoplay=1');
    });
  });

  test('handles article previews with enhanced metadata', async () => {
    render(
      <EnhancedLinkPreview
        url="https://medium.com/@author/test-article"
        displayMode="thumbnail-summary"
      />
    );

    await waitFor(() => {
      // Should detect as article type
      const container = screen.getByRole('article');
      expect(container).toBeInTheDocument();
      
      // Should show article metadata
      expect(screen.getByText(/medium\.com/)).toBeInTheDocument();
    });
  });
});

describe('Responsive Behavior', () => {
  test('adapts thumbnail size on mobile viewports', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const mockData = {
      url: 'https://example.com',
      title: 'Mobile Test',
      description: 'Test on mobile',
      type: 'article' as const
    };

    render(<ThumbnailSummaryContainer data={mockData} onClick={() => {}} />);
    
    const container = screen.getByRole('article');
    expect(container).toHaveClass('p-4'); // Should maintain padding on mobile
    
    // Text should remain readable
    expect(screen.getByText(mockData.title)).toBeInTheDocument();
  });

  test('handles hover states correctly', () => {
    const mockData = {
      url: 'https://example.com',
      title: 'Hover Test',
      type: 'article' as const
    };

    render(<ThumbnailSummaryContainer data={mockData} onClick={() => {}} />);
    
    const container = screen.getByRole('article');
    
    // Should have hover classes
    expect(container).toHaveClass('hover:shadow-md', 'hover:border-gray-300');
  });
});

describe('Accessibility', () => {
  test('provides proper ARIA labels and roles', () => {
    const mockData = {
      url: 'https://example.com',
      title: 'Accessibility Test',
      description: 'Test description',
      type: 'article' as const
    };

    render(<ThumbnailSummaryContainer data={mockData} onClick={() => {}} />);
    
    const container = screen.getByRole('article');
    expect(container).toHaveAttribute('aria-label', `Preview: ${mockData.title}`);
    expect(container).toHaveAttribute('tabIndex', '0');
  });

  test('provides descriptive alt text for images', () => {
    const mockData = {
      url: 'https://example.com',
      title: 'Alt Text Test',
      image: 'https://example.com/image.jpg',
      type: 'article' as const
    };

    render(<ThumbnailSummaryContainer data={mockData} onClick={() => {}} />);
    
    const thumbnail = screen.getByAltText(`Preview thumbnail for ${mockData.title}`);
    expect(thumbnail).toBeInTheDocument();
  });

  test('supports screen reader navigation', () => {
    const mockData = {
      url: 'https://example.com',
      title: 'Screen Reader Test',
      description: 'Test description',
      author: 'Test Author',
      type: 'article' as const
    };

    render(<ThumbnailSummaryContainer data={mockData} onClick={() => {}} />);
    
    // Should have hierarchical heading structure
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    
    // Should provide context for metadata
    expect(screen.getByText(mockData.author)).toBeInTheDocument();
  });
});