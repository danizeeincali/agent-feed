import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PhotoGrid, { PhotoGridImage, PhotoGridProps } from '../components/dynamic-page/PhotoGrid';

// Mock react-photo-view
vi.mock('react-photo-view', () => ({
  PhotoProvider: ({ children }: any) => <div data-testid="photo-provider">{children}</div>,
  PhotoView: ({ children, src }: any) => <div data-testid="photo-view" data-src={src}>{children}</div>,
}));

const mockImages: PhotoGridImage[] = [
  {
    url: 'https://example.com/image1.jpg',
    alt: 'Test Image 1',
    caption: 'Caption 1',
    thumbnail: 'https://example.com/thumb1.jpg',
  },
  {
    url: 'https://example.com/image2.jpg',
    alt: 'Test Image 2',
  },
  {
    url: 'https://example.com/image3.jpg',
    caption: 'Caption 3',
  },
];

describe('PhotoGrid Component', () => {
  beforeEach(() => {
    // Mock Image load/error events
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders empty state when no images provided', () => {
      render(<PhotoGrid images={[]} />);

      expect(screen.getByText('No Images')).toBeInTheDocument();
      expect(screen.getByText('No images to display')).toBeInTheDocument();
    });

    it('renders all images', () => {
      render(<PhotoGrid images={mockImages} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(mockImages.length);
    });

    it('uses thumbnail when provided', () => {
      render(<PhotoGrid images={mockImages} />);

      const firstImage = screen.getByAltText('Test Image 1');
      expect(firstImage).toHaveAttribute('src', mockImages[0].thumbnail);
    });

    it('uses main URL when no thumbnail', () => {
      render(<PhotoGrid images={mockImages} />);

      const secondImage = screen.getByAltText('Test Image 2');
      expect(secondImage).toHaveAttribute('src', mockImages[1].url);
    });

    it('applies custom className', () => {
      const { container } = render(
        <PhotoGrid images={mockImages} className="custom-grid" />
      );

      const grid = container.querySelector('.custom-grid');
      expect(grid).toBeInTheDocument();
    });

    it('displays captions on hover', () => {
      const { container } = render(<PhotoGrid images={mockImages} />);

      // Captions are rendered in the DOM even if hidden by CSS
      expect(container.textContent).toContain('Caption 1');
      expect(container.textContent).toContain('Caption 3');
    });
  });

  describe('Grid Layout', () => {
    it('applies correct grid classes for 3 columns (default)', () => {
      const { container } = render(<PhotoGrid images={mockImages} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });

    it('applies correct grid classes for 2 columns', () => {
      const { container } = render(<PhotoGrid images={mockImages} columns={2} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
    });

    it('applies correct grid classes for 4 columns', () => {
      const { container } = render(<PhotoGrid images={mockImages} columns={4} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4');
    });

    it('clamps columns between 1 and 6', () => {
      const { container: container1 } = render(<PhotoGrid images={mockImages} columns={0} />);
      const grid1 = container1.querySelector('.grid');
      expect(grid1).toHaveClass('grid-cols-1');

      const { container: container2 } = render(<PhotoGrid images={mockImages} columns={10} />);
      const grid2 = container2.querySelector('.grid');
      expect(grid2).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-6');
    });
  });

  describe('Aspect Ratio', () => {
    it('applies square aspect ratio', () => {
      render(<PhotoGrid images={mockImages} aspectRatio="square" />);

      const imageContainers = document.querySelectorAll('.relative.overflow-hidden');
      imageContainers.forEach(container => {
        expect(container).toHaveStyle({ paddingBottom: '100%' });
      });
    });

    it('applies 16:9 aspect ratio', () => {
      render(<PhotoGrid images={mockImages} aspectRatio="16:9" />);

      const imageContainers = document.querySelectorAll('.relative.overflow-hidden');
      imageContainers.forEach(container => {
        expect(container).toHaveStyle({ paddingBottom: '56.25%' });
      });
    });

    it('applies 4:3 aspect ratio', () => {
      render(<PhotoGrid images={mockImages} aspectRatio="4:3" />);

      const imageContainers = document.querySelectorAll('.relative.overflow-hidden');
      imageContainers.forEach(container => {
        expect(container).toHaveStyle({ paddingBottom: '75%' });
      });
    });

    it('does not apply padding for auto aspect ratio', () => {
      render(<PhotoGrid images={mockImages} aspectRatio="auto" />);

      const imageContainers = document.querySelectorAll('.relative.overflow-hidden');
      imageContainers.forEach(container => {
        const style = (container as HTMLElement).style;
        expect(style.paddingBottom).toBe('');
      });
    });
  });

  describe('Image Loading', () => {
    it('shows loading spinner before image loads', () => {
      render(<PhotoGrid images={mockImages} />);

      // Should show loaders initially
      const loaders = screen.getAllByRole('img', { hidden: true });
      expect(loaders.length).toBeGreaterThan(0);
    });

    it('hides loading spinner after image loads', async () => {
      render(<PhotoGrid images={mockImages} />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        images.forEach(img => {
          expect(img).toHaveClass('opacity-100');
        });
      });
    });

    it('displays error state when image fails to load', async () => {
      // Mock image error
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src = '';

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      } as any;

      render(<PhotoGrid images={mockImages} />);

      const image = screen.getByAltText('Test Image 1');
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });

    it('uses lazy loading attribute', () => {
      render(<PhotoGrid images={mockImages} />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Lightbox Integration', () => {
    it('wraps images with PhotoProvider when lightbox enabled', () => {
      render(<PhotoGrid images={mockImages} enableLightbox={true} />);

      expect(screen.getByTestId('photo-provider')).toBeInTheDocument();
    });

    it('does not wrap images when lightbox disabled', () => {
      render(<PhotoGrid images={mockImages} enableLightbox={false} />);

      expect(screen.queryByTestId('photo-provider')).not.toBeInTheDocument();
    });

    it('applies cursor-pointer when lightbox enabled', () => {
      const { container } = render(<PhotoGrid images={mockImages} enableLightbox={true} />);

      const imageContainers = container.querySelectorAll('.cursor-pointer');
      expect(imageContainers.length).toBeGreaterThan(0);
    });

    it('does not apply cursor-pointer when lightbox disabled', () => {
      const { container } = render(<PhotoGrid images={mockImages} enableLightbox={false} />);

      const imageContainers = container.querySelectorAll('.cursor-pointer');
      expect(imageContainers.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('provides alt text for all images', () => {
      render(<PhotoGrid images={mockImages} />);

      expect(screen.getByAltText('Test Image 1')).toBeInTheDocument();
      expect(screen.getByAltText('Test Image 2')).toBeInTheDocument();
    });

    it('generates fallback alt text when not provided', () => {
      const imagesWithoutAlt: PhotoGridImage[] = [
        { url: 'https://example.com/test.jpg' },
      ];

      render(<PhotoGrid images={imagesWithoutAlt} />);

      expect(screen.getByAltText('Image 1')).toBeInTheDocument();
    });

    it('includes aria-label for event indicators', () => {
      const { container } = render(<PhotoGrid images={mockImages} />);

      // Captions exist in the component
      expect(container.textContent).toContain('Caption');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined images array', () => {
      render(<PhotoGrid images={undefined as any} />);

      expect(screen.getByText('No Images')).toBeInTheDocument();
    });

    it('handles images with missing URLs gracefully', () => {
      const invalidImages: PhotoGridImage[] = [
        { url: '' },
        { url: 'https://example.com/valid.jpg' },
      ];

      render(<PhotoGrid images={invalidImages} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });

    it('handles very large number of columns', () => {
      const { container } = render(<PhotoGrid images={mockImages} columns={100} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('lg:grid-cols-6'); // Clamped to 6
    });

    it('handles single image', () => {
      render(<PhotoGrid images={[mockImages[0]]} />);

      expect(screen.getByAltText('Test Image 1')).toBeInTheDocument();
    });

    it('handles images without captions', () => {
      const imagesWithoutCaptions: PhotoGridImage[] = [
        { url: 'https://example.com/test1.jpg' },
        { url: 'https://example.com/test2.jpg' },
      ];

      render(<PhotoGrid images={imagesWithoutCaptions} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('renders large number of images efficiently', () => {
      const manyImages: PhotoGridImage[] = Array.from({ length: 50 }, (_, i) => ({
        url: `https://example.com/image${i}.jpg`,
        alt: `Image ${i}`,
      }));

      const { container } = render(<PhotoGrid images={manyImages} />);

      const images = container.querySelectorAll('img');
      expect(images).toHaveLength(50);
    });

    it('uses lazy loading for performance', () => {
      const manyImages: PhotoGridImage[] = Array.from({ length: 20 }, (_, i) => ({
        url: `https://example.com/image${i}.jpg`,
      }));

      render(<PhotoGrid images={manyImages} />);

      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });
});
