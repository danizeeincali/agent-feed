import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeCard, { SwipeCardData } from './SwipeCard';

// Mock framer-motion for testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({
    set: vi.fn(),
  }),
  useTransform: () => 0,
  PanInfo: {},
}));

const mockCards: SwipeCardData[] = [
  {
    id: 'card-1',
    title: 'Test Card 1',
    description: 'Description 1',
    image: 'https://example.com/image1.jpg',
    metadata: { category: 'test' },
  },
  {
    id: 'card-2',
    title: 'Test Card 2',
    description: 'Description 2',
  },
  {
    id: 'card-3',
    title: 'Test Card 3',
  },
];

describe('SwipeCard Component', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders empty state when no cards provided', () => {
      render(<SwipeCard cards={[]} />);
      expect(screen.getByText('No Cards Available')).toBeInTheDocument();
      expect(screen.getByText('Add cards to start swiping')).toBeInTheDocument();
    });

    it('renders the first card', () => {
      render(<SwipeCard cards={mockCards} />);
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
    });

    it('renders control buttons when showControls is true', () => {
      render(<SwipeCard cards={mockCards} showControls={true} />);
      expect(screen.getByLabelText(/Dislike/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Like/i)).toBeInTheDocument();
    });

    it('hides control buttons when showControls is false', () => {
      render(<SwipeCard cards={mockCards} showControls={false} />);
      expect(screen.queryByLabelText(/Dislike/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Like/i)).not.toBeInTheDocument();
    });

    it('displays progress indicator', () => {
      render(<SwipeCard cards={mockCards} />);
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('renders card image when provided', () => {
      render(<SwipeCard cards={mockCards} />);
      const image = screen.getByAlt('Test Card 1');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image1.jpg');
    });

    it('renders metadata badges', () => {
      render(<SwipeCard cards={mockCards} />);
      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <SwipeCard cards={mockCards} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Manual Controls', () => {
    it('advances to next card when like button is clicked', async () => {
      render(<SwipeCard cards={mockCards} showControls={true} />);

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    it('advances to next card when dislike button is clicked', async () => {
      render(<SwipeCard cards={mockCards} showControls={true} />);

      const dislikeButton = screen.getByLabelText(/Dislike/i);
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    it('disables buttons during loading', async () => {
      global.fetch = vi.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, json: () => ({}) } as Response), 100)
        )
      );

      render(
        <SwipeCard
          cards={mockCards}
          showControls={true}
          onSwipeRight="/api/like"
        />
      );

      const likeButton = screen.getByLabelText(/Like/i) as HTMLButtonElement;
      fireEvent.click(likeButton);

      expect(likeButton).toBeDisabled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('swipes right on ArrowRight key', async () => {
      render(<SwipeCard cards={mockCards} />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    it('swipes left on ArrowLeft key', async () => {
      render(<SwipeCard cards={mockCards} />);

      fireEvent.keyDown(window, { key: 'ArrowLeft' });

      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    it('swipes right on Enter key', async () => {
      render(<SwipeCard cards={mockCards} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });
    });

    it('does not respond to other keys', async () => {
      render(<SwipeCard cards={mockCards} />);

      fireEvent.keyDown(window, { key: 'Space' });

      await waitFor(() => {
        expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls API on swipe right with correct payload', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(
        <SwipeCard
          cards={mockCards}
          onSwipeRight="/api/cards/like"
          showControls={true}
        />
      );

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cards/like',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('card-1'),
          })
        );
      });
    });

    it('calls API on swipe left with correct payload', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(
        <SwipeCard
          cards={mockCards}
          onSwipeLeft="/api/cards/dislike"
          showControls={true}
        />
      );

      const dislikeButton = screen.getByLabelText(/Dislike/i);
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cards/dislike',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });

    it('handles API errors gracefully', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );
      global.fetch = mockFetch;

      render(
        <SwipeCard
          cards={mockCards}
          onSwipeRight="/api/cards/like"
          showControls={true}
        />
      );

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });

      // Should stay on same card
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    it('replaces template variables in endpoint', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );
      global.fetch = mockFetch;

      render(
        <SwipeCard
          cards={mockCards}
          onSwipeRight="/api/cards/{{id}}/approve"
          showControls={true}
        />
      );

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/cards/card-1/approve',
          expect.any(Object)
        );
      });
    });

    it('does not call API if endpoint not provided', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(<SwipeCard cards={mockCards} showControls={true} />);

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Card Stack', () => {
    it('updates progress after swipe', async () => {
      render(<SwipeCard cards={mockCards} showControls={true} />);

      expect(screen.getByText('1 / 3')).toBeInTheDocument();

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
      });
    });

    it('shows completion state when all cards swiped', async () => {
      render(<SwipeCard cards={[mockCards[0]]} showControls={true} />);

      const likeButton = screen.getByLabelText(/Like/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('All Done!')).toBeInTheDocument();
        expect(screen.getByText("You've reviewed all cards")).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<SwipeCard cards={mockCards} showControls={true} />);

      expect(screen.getByRole('region', { name: /swipeable cards/i })).toBeInTheDocument();
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('provides keyboard hints', () => {
      render(<SwipeCard cards={mockCards} />);
      expect(screen.getByText(/Use arrow keys/i)).toBeInTheDocument();
    });

    it('buttons have descriptive labels', () => {
      render(<SwipeCard cards={mockCards} showControls={true} />);

      expect(screen.getByLabelText(/Dislike.*Left Arrow/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Like.*Right Arrow.*Enter/i)).toBeInTheDocument();
    });
  });

  describe('Image Loading', () => {
    it('shows loading state for images', () => {
      render(<SwipeCard cards={mockCards} />);
      expect(screen.getByAltText('Test Card 1')).toBeInTheDocument();
    });

    it('handles image load errors', async () => {
      render(<SwipeCard cards={mockCards} />);

      const image = screen.getByAlt('Test Card 1') as HTMLImageElement;
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Image not available')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('prevents multiple simultaneous swipes', async () => {
      const mockFetch = vi.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ ok: true, json: () => ({}) } as Response), 100)
        )
      );
      global.fetch = mockFetch;

      render(
        <SwipeCard
          cards={mockCards}
          onSwipeRight="/api/like"
          showControls={true}
        />
      );

      const likeButton = screen.getByLabelText(/Like/i);

      // Click multiple times rapidly
      fireEvent.click(likeButton);
      fireEvent.click(likeButton);
      fireEvent.click(likeButton);

      // Should only make one API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    it('handles cards without images', () => {
      render(<SwipeCard cards={[mockCards[1]]} />);
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    });

    it('handles cards without description', () => {
      render(<SwipeCard cards={[mockCards[2]]} />);
      expect(screen.getByText('Test Card 3')).toBeInTheDocument();
    });
  });
});
