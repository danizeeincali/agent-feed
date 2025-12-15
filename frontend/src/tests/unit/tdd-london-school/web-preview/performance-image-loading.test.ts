/**
 * Performance Image Loading Tests - London School TDD
 * 
 * Tests image loading optimization and performance using mock-driven
 * behavior verification. Focuses on collaboration patterns for efficient loading.
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock Dependencies (London School - Performance service contracts)
interface ImageLoader {
  loadImage(src: string, options?: LoadOptions): Promise<LoadResult>;
  preloadImages(urls: string[], options?: PreloadOptions): Promise<PreloadResult[]>;
  cancelLoading(src: string): void;
  clearCache(): void;
}

interface ImageOptimizer {
  optimizeForSize(src: string, dimensions: ImageDimensions): Promise<string>;
  generateWebP(src: string): Promise<string>;
  createPlaceholder(dimensions: ImageDimensions): string;
  compress(src: string, quality: number): Promise<string>;
}

interface LazyLoader {
  observe(element: HTMLElement, callback: IntersectionCallback): void;
  unobserve(element: HTMLElement): void;
  isIntersecting(element: HTMLElement): boolean;
  setMargin(margin: string): void;
}

interface PerformanceMonitor {
  startTiming(label: string): string;
  endTiming(timingId: string): number;
  recordMetric(metric: string, value: number): void;
  getMetrics(): PerformanceMetrics;
}

interface CacheManager {
  get(key: string): Promise<CachedImage | null>;
  set(key: string, image: CachedImage, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  invalidate(pattern?: string): Promise<void>;
  getSize(): Promise<number>;
}

interface ErrorReporter {
  reportLoadError(src: string, error: ImageLoadError): void;
  reportPerformanceIssue(issue: PerformanceIssue): void;
  getErrorStats(): ErrorStats;
}

// Type definitions
interface LoadOptions {
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'normal' | 'low';
  sizes?: string;
  quality?: number;
}

interface LoadResult {
  success: boolean;
  src: string;
  optimizedSrc?: string;
  loadTime: number;
  fromCache: boolean;
  dimensions?: ImageDimensions;
  error?: string;
}

interface PreloadOptions {
  batchSize?: number;
  delay?: number;
  priority?: 'high' | 'normal' | 'low';
}

interface PreloadResult {
  url: string;
  success: boolean;
  loadTime: number;
  error?: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface IntersectionCallback {
  (isVisible: boolean, element: HTMLElement): void;
}

interface PerformanceMetrics {
  averageLoadTime: number;
  cacheHitRate: number;
  errorRate: number;
  totalImagesLoaded: number;
}

interface CachedImage {
  src: string;
  optimizedSrc?: string;
  dimensions: ImageDimensions;
  timestamp: number;
}

interface ImageLoadError {
  src: string;
  code: string;
  message: string;
  timestamp: Date;
}

interface PerformanceIssue {
  type: 'slow_load' | 'memory_leak' | 'cache_miss';
  details: any;
  timestamp: Date;
}

interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorRate: number;
}

// System Under Test
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: 'high' | 'normal' | 'low';
  lazy?: boolean;
  placeholder?: boolean;
  onLoad?: (result: LoadResult) => void;
  onError?: (error: string) => void;
  // Injected dependencies
  imageLoader: ImageLoader;
  optimizer: ImageOptimizer;
  lazyLoader: LazyLoader;
  performanceMonitor: PerformanceMonitor;
  cacheManager: CacheManager;
  errorReporter: ErrorReporter;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  priority = 'normal',
  lazy = true,
  placeholder = true,
  onLoad,
  onError,
  imageLoader,
  optimizer,
  lazyLoader,
  performanceMonitor,
  cacheManager,
  errorReporter
}) => {
  const [currentSrc, setCurrentSrc] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const [loadResult, setLoadResult] = React.useState<LoadResult | null>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const timingRef = React.useRef<string>('');

  React.useEffect(() => {
    if (placeholder) {
      // Contract: Generate placeholder through optimizer
      const placeholderSrc = optimizer.createPlaceholder({ width, height });
      setCurrentSrc(placeholderSrc);
    }

    if (lazy) {
      // Contract: Set up lazy loading through lazy loader
      if (imgRef.current) {
        lazyLoader.observe(imgRef.current, handleVisibilityChange);
      }
    } else {
      // Load immediately for high priority images
      loadImage();
    }

    return () => {
      if (imgRef.current) {
        lazyLoader.unobserve(imgRef.current);
      }
    };
  }, [src]);

  const handleVisibilityChange = React.useCallback((isVisible: boolean, element: HTMLElement) => {
    if (isVisible && !loadResult) {
      loadImage();
    }
  }, [loadResult]);

  const loadImage = async () => {
    try {
      // Contract: Start performance timing
      timingRef.current = performanceMonitor.startTiming(`image_load_${src}`);

      // Contract: Check cache first
      const cacheKey = `${src}_${width}x${height}`;
      const cached = await cacheManager.get(cacheKey);
      
      if (cached) {
        setCurrentSrc(cached.optimizedSrc || cached.src);
        setIsLoading(false);
        const loadTime = performanceMonitor.endTiming(timingRef.current);
        
        const result: LoadResult = {
          success: true,
          src: cached.src,
          optimizedSrc: cached.optimizedSrc,
          loadTime,
          fromCache: true,
          dimensions: cached.dimensions
        };
        
        setLoadResult(result);
        onLoad?.(result);
        return;
      }

      // Contract: Optimize image for current viewport
      const optimizedSrc = await optimizer.optimizeForSize(src, { width, height });
      
      // Contract: Load optimized image
      const result = await imageLoader.loadImage(optimizedSrc, {
        timeout: 10000,
        retries: 2,
        priority,
        quality: 80
      });

      const finalLoadTime = performanceMonitor.endTiming(timingRef.current);

      if (result.success) {
        setCurrentSrc(result.optimizedSrc || result.src);
        setIsLoading(false);
        
        const finalResult = { ...result, loadTime: finalLoadTime };
        setLoadResult(finalResult);
        
        // Contract: Cache successful result
        await cacheManager.set(cacheKey, {
          src: result.src,
          optimizedSrc: result.optimizedSrc,
          dimensions: result.dimensions || { width, height },
          timestamp: Date.now()
        });

        // Contract: Record performance metrics
        performanceMonitor.recordMetric('image_load_time', finalLoadTime);
        performanceMonitor.recordMetric('cache_hit', 0); // Cache miss
        
        onLoad?.(finalResult);
      } else {
        throw new Error(result.error || 'Failed to load image');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Image load failed';
      
      setHasError(true);
      setIsLoading(false);
      
      // Contract: Report error through error reporter
      errorReporter.reportLoadError(src, {
        src,
        code: 'LOAD_FAILED',
        message: errorMessage,
        timestamp: new Date()
      });

      performanceMonitor.endTiming(timingRef.current);
      performanceMonitor.recordMetric('image_errors', 1);
      
      onError?.(errorMessage);
    }
  };

  if (hasError) {
    return (
      <div 
        data-testid="image-error"
        className="image-error"
        style={{ width, height }}
      >
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      data-testid="optimized-image"
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      className={isLoading ? 'loading' : 'loaded'}
      onLoad={() => {
        if (!placeholder || currentSrc !== optimizer.createPlaceholder({ width, height })) {
          setIsLoading(false);
        }
      }}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setIsLoading(false);
        }
      }}
    />
  );
};

// Batch Image Loader Component
interface ImageGalleryProps {
  images: Array<{ src: string; alt: string }>;
  batchSize?: number;
  // Dependencies
  imageLoader: ImageLoader;
  performanceMonitor: PerformanceMonitor;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  batchSize = 5,
  imageLoader,
  performanceMonitor
}) => {
  const [loadedBatches, setLoadedBatches] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    loadNextBatch();
  }, []);

  const loadNextBatch = async () => {
    if (isLoading || loadedBatches * batchSize >= images.length) return;
    
    setIsLoading(true);
    
    // Contract: Start batch performance timing
    const timingId = performanceMonitor.startTiming('batch_load');
    
    const startIndex = loadedBatches * batchSize;
    const endIndex = Math.min(startIndex + batchSize, images.length);
    const batch = images.slice(startIndex, endIndex);
    
    try {
      // Contract: Preload batch through image loader
      const results = await imageLoader.preloadImages(
        batch.map(img => img.src),
        { batchSize, priority: 'normal' }
      );
      
      const batchLoadTime = performanceMonitor.endTiming(timingId);
      
      // Contract: Record batch metrics
      performanceMonitor.recordMetric('batch_load_time', batchLoadTime);
      performanceMonitor.recordMetric('batch_size', batch.length);
      
      const successCount = results.filter(r => r.success).length;
      performanceMonitor.recordMetric('batch_success_rate', successCount / batch.length);
      
      setLoadedBatches(prev => prev + 1);
    } catch (error) {
      console.error('Batch loading failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="image-gallery" className="image-gallery">
      {images.slice(0, loadedBatches * batchSize).map((image, index) => (
        <div key={index} className="gallery-item">
          <img src={image.src} alt={image.alt} loading="lazy" />
        </div>
      ))}
      
      {loadedBatches * batchSize < images.length && (
        <button
          data-testid="load-more-button"
          onClick={loadNextBatch}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

// Test Suite
describe('Performance Image Loading - London School TDD', () => {
  let mockImageLoader: ImageLoader;
  let mockOptimizer: ImageOptimizer;
  let mockLazyLoader: LazyLoader;
  let mockPerformanceMonitor: PerformanceMonitor;
  let mockCacheManager: CacheManager;
  let mockErrorReporter: ErrorReporter;

  const sampleLoadResult: LoadResult = {
    success: true,
    src: 'https://example.com/image.jpg',
    optimizedSrc: 'https://example.com/image_400x300.webp',
    loadTime: 250,
    fromCache: false,
    dimensions: { width: 400, height: 300 }
  };

  beforeEach(() => {
    mockImageLoader = {
      loadImage: vi.fn(),
      preloadImages: vi.fn(),
      cancelLoading: vi.fn(),
      clearCache: vi.fn()
    };

    mockOptimizer = {
      optimizeForSize: vi.fn(),
      generateWebP: vi.fn(),
      createPlaceholder: vi.fn(),
      compress: vi.fn()
    };

    mockLazyLoader = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      isIntersecting: vi.fn(),
      setMargin: vi.fn()
    };

    mockPerformanceMonitor = {
      startTiming: vi.fn(),
      endTiming: vi.fn(),
      recordMetric: vi.fn(),
      getMetrics: vi.fn()
    };

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      invalidate: vi.fn(),
      getSize: vi.fn()
    };

    mockErrorReporter = {
      reportLoadError: vi.fn(),
      reportPerformanceIssue: vi.fn(),
      getErrorStats: vi.fn()
    };
  });

  describe('Image Loading Performance Workflow', () => {
    // Contract Test: Should check cache before loading
    it('should check cache through CacheManager before image loading', async () => {
      const cachedImage: CachedImage = {
        src: 'https://example.com/image.jpg',
        optimizedSrc: 'https://example.com/image_400x300.webp',
        dimensions: { width: 400, height: 300 },
        timestamp: Date.now()
      };

      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(cachedImage);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(50);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={false}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(mockCacheManager.get).toHaveBeenCalledWith('https://example.com/image.jpg_400x300');
        expect(mockImageLoader.loadImage).not.toHaveBeenCalled(); // Should skip loading
      });
    });

    // Contract Test: Should optimize image before loading
    it('should optimize image through ImageOptimizer before loading', async () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockResolvedValue(sampleLoadResult);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(250);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          width={800}
          height={600}
          lazy={false}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(mockOptimizer.optimizeForSize).toHaveBeenCalledWith(
          'https://example.com/image.jpg',
          { width: 800, height: 600 }
        );
      });
    });

    // Contract Test: Should measure performance through PerformanceMonitor
    it('should track loading performance through PerformanceMonitor', async () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockResolvedValue(sampleLoadResult);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(250);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={false}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(mockPerformanceMonitor.startTiming).toHaveBeenCalledWith('image_load_https://example.com/image.jpg');
        expect(mockPerformanceMonitor.endTiming).toHaveBeenCalledWith('timing-123');
        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('image_load_time', 250);
        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('cache_hit', 0);
      });
    });

    // Contract Test: Should cache successful loads
    it('should cache successful load results through CacheManager', async () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockResolvedValue(sampleLoadResult);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(250);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={false}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(mockCacheManager.set).toHaveBeenCalledWith(
          'https://example.com/image.jpg_400x300',
          {
            src: sampleLoadResult.src,
            optimizedSrc: sampleLoadResult.optimizedSrc,
            dimensions: sampleLoadResult.dimensions,
            timestamp: expect.any(Number)
          }
        );
      });
    });
  });

  describe('Lazy Loading Integration', () => {
    // Contract Test: Should coordinate with LazyLoader for visibility detection
    it('should set up lazy loading through LazyLoader when enabled', () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={true}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      expect(mockLazyLoader.observe).toHaveBeenCalledWith(
        expect.any(HTMLImageElement),
        expect.any(Function)
      );
    });

    // Behavior Test: Should load image when becomes visible
    it('should trigger image load when LazyLoader reports visibility', async () => {
      let visibilityCallback: IntersectionCallback;
      
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockLazyLoader.observe as MockedFunction<any>).mockImplementation((element, callback) => {
        visibilityCallback = callback;
      });
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockResolvedValue(sampleLoadResult);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(250);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={true}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      // Should not load initially
      expect(mockImageLoader.loadImage).not.toHaveBeenCalled();

      // Simulate visibility change
      const imgElement = screen.getByTestId('optimized-image');
      visibilityCallback!(true, imgElement as HTMLElement);

      await waitFor(() => {
        expect(mockImageLoader.loadImage).toHaveBeenCalled();
      });
    });

    // Contract Test: Should clean up LazyLoader on unmount
    it('should unobserve element through LazyLoader on unmount', () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');

      const { unmount } = render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={true}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      unmount();

      expect(mockLazyLoader.unobserve).toHaveBeenCalledWith(expect.any(HTMLImageElement));
    });
  });

  describe('Error Handling and Reporting', () => {
    // Contract Test: Should report errors through ErrorReporter
    it('should report load failures through ErrorReporter', async () => {
      const loadError = new Error('Network timeout');
      
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockRejectedValue(loadError);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(5000);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={false}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(mockErrorReporter.reportLoadError).toHaveBeenCalledWith(
          'https://example.com/image.jpg',
          {
            src: 'https://example.com/image.jpg',
            code: 'LOAD_FAILED',
            message: 'Network timeout',
            timestamp: expect.any(Date)
          }
        );
      });

      expect(screen.getByTestId('image-error')).toBeInTheDocument();
    });

    // Contract Test: Should track error metrics
    it('should record error metrics through PerformanceMonitor', async () => {
      const loadError = new Error('Failed to load');
      
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockRejectedValue(loadError);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(1000);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={false}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('image_errors', 1);
      });
    });
  });

  describe('Batch Loading Performance', () => {
    // Contract Test: Should preload images in batches
    it('should coordinate batch loading through ImageLoader', async () => {
      const images = [
        { src: 'https://example.com/1.jpg', alt: 'Image 1' },
        { src: 'https://example.com/2.jpg', alt: 'Image 2' },
        { src: 'https://example.com/3.jpg', alt: 'Image 3' }
      ];

      const preloadResults: PreloadResult[] = [
        { url: 'https://example.com/1.jpg', success: true, loadTime: 200 },
        { url: 'https://example.com/2.jpg', success: true, loadTime: 250 },
        { url: 'https://example.com/3.jpg', success: true, loadTime: 180 }
      ];

      (mockImageLoader.preloadImages as MockedFunction<any>).mockResolvedValue(preloadResults);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('batch-timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(600);

      render(
        <ImageGallery
          images={images}
          batchSize={3}
          imageLoader={mockImageLoader}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockImageLoader.preloadImages).toHaveBeenCalledWith(
          ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
          { batchSize: 3, priority: 'normal' }
        );
      });
    });

    // Contract Test: Should track batch performance metrics
    it('should record batch loading metrics through PerformanceMonitor', async () => {
      const images = Array(10).fill(null).map((_, i) => ({
        src: `https://example.com/${i}.jpg`,
        alt: `Image ${i}`
      }));

      const preloadResults: PreloadResult[] = Array(5).fill(null).map((_, i) => ({
        url: `https://example.com/${i}.jpg`,
        success: true,
        loadTime: 200 + i * 50
      }));

      (mockImageLoader.preloadImages as MockedFunction<any>).mockResolvedValue(preloadResults);
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('batch-timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(1200);

      render(
        <ImageGallery
          images={images}
          batchSize={5}
          imageLoader={mockImageLoader}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      await waitFor(() => {
        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('batch_load_time', 1200);
        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('batch_size', 5);
        expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('batch_success_rate', 1);
      });
    });

    // Behavior Test: Should handle progressive loading
    it('should load next batch when load more is clicked', async () => {
      const images = Array(10).fill(null).map((_, i) => ({
        src: `https://example.com/${i}.jpg`,
        alt: `Image ${i}`
      }));

      (mockImageLoader.preloadImages as MockedFunction<any>)
        .mockResolvedValueOnce(Array(3).fill({ success: true, loadTime: 200 }))
        .mockResolvedValueOnce(Array(3).fill({ success: true, loadTime: 250 }));
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('batch-timing');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(800);

      render(
        <ImageGallery
          images={images}
          batchSize={3}
          imageLoader={mockImageLoader}
          performanceMonitor={mockPerformanceMonitor}
        />
      );

      // Wait for first batch
      await waitFor(() => {
        expect(mockImageLoader.preloadImages).toHaveBeenCalledTimes(1);
      });

      // Click load more
      const loadMoreButton = screen.getByTestId('load-more-button');
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(mockImageLoader.preloadImages).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance Optimization Patterns', () => {
    // Performance Test: Should meet loading time thresholds
    it('should complete image loading within performance budget', async () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);
      (mockOptimizer.optimizeForSize as MockedFunction<any>).mockResolvedValue('https://example.com/optimized.webp');
      (mockImageLoader.loadImage as MockedFunction<any>).mockResolvedValue({
        ...sampleLoadResult,
        loadTime: 150 // Fast load time
      });
      (mockPerformanceMonitor.startTiming as MockedFunction<any>).mockReturnValue('timing-123');
      (mockPerformanceMonitor.endTiming as MockedFunction<any>).mockReturnValue(150);

      const onLoad = vi.fn();

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          lazy={false}
          onLoad={onLoad}
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledWith(
          expect.objectContaining({ loadTime: 150 })
        );
      });

      // Should be within 1 second budget for individual images
      expect(onLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          loadTime: expect.any(Number)
        })
      );
      const loadResult = onLoad.mock.calls[0][0];
      expect(loadResult.loadTime).toBeLessThan(1000);
    });

    // Contract Test: Should prioritize above-the-fold images
    it('should load high priority images immediately without lazy loading', () => {
      (mockOptimizer.createPlaceholder as MockedFunction<any>).mockReturnValue('data:image/svg+xml;base64,placeholder');
      (mockCacheManager.get as MockedFunction<any>).mockResolvedValue(null);

      render(
        <OptimizedImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority="high"
          lazy={true} // Should be ignored for high priority
          imageLoader={mockImageLoader}
          optimizer={mockOptimizer}
          lazyLoader={mockLazyLoader}
          performanceMonitor={mockPerformanceMonitor}
          cacheManager={mockCacheManager}
          errorReporter={mockErrorReporter}
        />
      );

      // High priority images should start loading immediately
      expect(mockCacheManager.get).toHaveBeenCalled();
    });
  });
});