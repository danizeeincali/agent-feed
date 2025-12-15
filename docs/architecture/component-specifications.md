# Web Preview Component Specifications

## Component Hierarchy

```
RealSocialMediaFeed
├── ContentParser (utility)
│   ├── parseContent()
│   ├── extractUrls()
│   └── renderParsedContent()
│
├── EnhancedLinkPreview (enhanced)
│   ├── PreviewCard
│   │   ├── PreviewThumbnail
│   │   ├── PreviewContent
│   │   │   ├── PreviewTitle
│   │   │   ├── PreviewDescription
│   │   │   └── PreviewMetadata
│   │   └── PreviewActions
│   │
│   ├── YouTubeEmbed
│   │   ├── VideoThumbnail
│   │   ├── PlayButton
│   │   └── VideoMetadata
│   │
│   ├── ImagePreview
│   │   ├── ImageThumbnail
│   │   ├── ImageGallery
│   │   └── LightboxModal
│   │
│   └── ArticlePreview
│       ├── ArticleThumbnail
│       ├── ArticleContent
│       └── ReadingMetrics
│
├── ThumbnailGrid (new)
│   ├── ThumbnailItem
│   ├── ExpandButton
│   └── NavigationControls
│
└── PreviewModal (new)
    ├── ModalHeader
    ├── ModalContent
    │   ├── FullscreenPreview
    │   └── InteractiveContent
    └── ModalActions
        ├── ShareButton
        ├── SaveButton
        └── CloseButton
```

## Core Component Specifications

### 1. EnhancedLinkPreview Component

```typescript
interface EnhancedLinkPreviewProps {
  url: string;
  displayMode: PreviewDisplayMode;
  enableInteractions?: boolean;
  enableVideoEmbed?: boolean;
  maxWidth?: number;
  className?: string;
  onLoad?: (metadata: LinkMetadata) => void;
  onError?: (error: PreviewError) => void;
  onInteraction?: (type: InteractionType, data: any) => void;
}

type PreviewDisplayMode = 
  | 'card'        // Full card with thumbnail and metadata
  | 'thumbnail'   // Thumbnail-only compact view
  | 'inline'      // Single-line inline preview
  | 'embedded'    // Full embedded content (videos, etc.)
  | 'minimal';    // Domain and title only

interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  images: ResponsiveImageSet;
  metadata: ContentMetadata;
  type: ContentType;
  cached: boolean;
  generatedAt: string;
  expiresAt: string;
}

interface ResponsiveImageSet {
  thumbnail: string;    // 150x150
  small: string;        // 300x200
  medium: string;       // 600x400
  large: string;        // 1200x800
  original?: string;    // Original size
}

interface ContentMetadata {
  type: ContentType;
  siteName?: string;
  author?: string;
  publishedAt?: string;
  readingTime?: number;
  tags?: string[];
  language?: string;
  canonicalUrl?: string;
  
  // Video specific
  duration?: string;
  channelTitle?: string;
  viewCount?: number;
  
  // Article specific
  wordCount?: number;
  category?: string;
}

type ContentType = 
  | 'article' 
  | 'video' 
  | 'image' 
  | 'audio' 
  | 'social' 
  | 'document' 
  | 'website';

type InteractionType = 
  | 'click' 
  | 'hover' 
  | 'expand' 
  | 'share' 
  | 'save';
```

### 2. YouTubeEmbed Component

```typescript
interface YouTubeEmbedProps {
  videoId: string;
  width?: number;
  height?: number;
  responsive?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  privacyMode?: boolean;
  startTime?: number;
  endTime?: number;
  quality?: 'small' | 'medium' | 'large' | 'hd720' | 'hd1080';
  onReady?: () => void;
  onStateChange?: (state: YouTubePlayerState) => void;
  onError?: (error: YouTubeError) => void;
}

interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  duration: string;
  publishedAt: string;
  channelTitle: string;
  channelId: string;
  viewCount: number;
  likeCount?: number;
  tags?: string[];
  categoryId?: string;
  liveBroadcastContent: 'none' | 'live' | 'upcoming';
}

interface YouTubeThumbnails {
  default: string;     // 120x90
  medium: string;      // 320x180
  high: string;        // 480x360
  standard?: string;   // 640x480
  maxres?: string;     // 1280x720
}

type YouTubePlayerState = 
  | 'unstarted' 
  | 'ended' 
  | 'playing' 
  | 'paused' 
  | 'buffering' 
  | 'cued';

type YouTubeError = 
  | 'invalid_parameter' 
  | 'html5_error' 
  | 'video_not_found' 
  | 'not_available' 
  | 'access_denied';
```

### 3. ThumbnailGrid Component

```typescript
interface ThumbnailGridProps {
  urls: string[];
  maxThumbnails: number;
  layout: GridLayout;
  spacing: number;
  onThumbnailClick: (url: string, metadata: LinkMetadata) => void;
  onExpandClick?: (urls: string[]) => void;
  className?: string;
}

type GridLayout = 
  | 'grid'      // CSS Grid layout
  | 'masonry'   // Pinterest-style masonry
  | 'carousel'  // Horizontal scrolling carousel
  | 'stack';    // Stacked with preview of others

interface ThumbnailItem {
  url: string;
  metadata: LinkMetadata;
  position: number;
  visible: boolean;
  loading: boolean;
  error: boolean;
}
```

### 4. PreviewModal Component

```typescript
interface PreviewModalProps {
  isOpen: boolean;
  content: LinkMetadata | LinkMetadata[];
  initialIndex?: number;
  enableNavigation?: boolean;
  enableFullscreen?: boolean;
  enableSharing?: boolean;
  enableDownload?: boolean;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onShare?: (url: string, method: ShareMethod) => void;
  className?: string;
}

type ShareMethod = 
  | 'copy' 
  | 'twitter' 
  | 'facebook' 
  | 'linkedin' 
  | 'email' 
  | 'native';

interface ModalState {
  currentIndex: number;
  isFullscreen: boolean;
  isLoading: boolean;
  error: string | null;
  zoom: number;
}
```

### 5. ImagePreview Component

```typescript
interface ImagePreviewProps {
  src: string;
  alt: string;
  responsive?: ResponsiveImageSet;
  lazyLoad?: boolean;
  enableZoom?: boolean;
  enableLightbox?: boolean;
  placeholder?: string;
  blurHash?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface ImageState {
  loaded: boolean;
  error: boolean;
  naturalWidth: number;
  naturalHeight: number;
  currentSrc: string;
}
```

## Advanced Component Features

### 1. Lazy Loading Implementation

```typescript
interface LazyLoadConfig {
  rootMargin: string;
  threshold: number;
  loadingStrategy: LoadingStrategy;
  placeholderType: PlaceholderType;
  blurHash?: string;
}

type LoadingStrategy = 
  | 'viewport'      // Load when entering viewport
  | 'interaction'   // Load on user interaction
  | 'priority'      // Load based on priority scoring
  | 'progressive';  // Load low-res first, then high-res

type PlaceholderType = 
  | 'skeleton'      // Animated skeleton loader
  | 'blur'          // BlurHash placeholder
  | 'color'         // Solid color background
  | 'spinner';      // Loading spinner

// React Hook for lazy loading
function useLazyLoad(config: LazyLoadConfig) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: config.rootMargin,
        threshold: config.threshold,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [config]);

  return { elementRef, isVisible, isLoaded, setIsLoaded };
}
```

### 2. Responsive Image Management

```typescript
interface ResponsiveImageConfig {
  breakpoints: ImageBreakpoint[];
  formats: ImageFormat[];
  quality: number;
  loading: 'lazy' | 'eager';
  decoding: 'async' | 'sync' | 'auto';
}

interface ImageBreakpoint {
  width: number;
  density: number;
  format: ImageFormat;
}

type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';

// Generate responsive image sources
function generateImageSources(
  baseUrl: string,
  config: ResponsiveImageConfig
): ImageSource[] {
  return config.breakpoints.flatMap(bp =>
    config.formats.map(format => ({
      srcSet: `${baseUrl}?w=${bp.width}&f=${format}&q=${config.quality}`,
      media: `(max-width: ${bp.width}px)`,
      type: `image/${format}`,
    }))
  );
}

interface ImageSource {
  srcSet: string;
  media: string;
  type: string;
}
```

### 3. Interactive Preview Features

```typescript
interface InteractiveFeatures {
  hover: HoverBehavior;
  click: ClickBehavior;
  keyboard: KeyboardBehavior;
  touch: TouchBehavior;
  focus: FocusBehavior;
}

interface HoverBehavior {
  enabled: boolean;
  delay: number;
  showPreview: boolean;
  expandOnHover: boolean;
  loadFullImage: boolean;
}

interface ClickBehavior {
  action: ClickAction;
  openInNewTab: boolean;
  trackInteraction: boolean;
  preventDefault: boolean;
}

type ClickAction = 
  | 'navigate'     // Navigate to URL
  | 'expand'       // Expand preview
  | 'modal'        // Open in modal
  | 'embed'        // Show embedded content
  | 'custom';      // Custom handler

interface KeyboardBehavior {
  enableNavigation: boolean;
  shortcuts: KeyboardShortcut[];
}

interface KeyboardShortcut {
  key: string;
  modifier?: 'ctrl' | 'alt' | 'shift' | 'meta';
  action: string;
  handler: () => void;
}

interface TouchBehavior {
  swipeToNavigate: boolean;
  pinchToZoom: boolean;
  doubleTapToExpand: boolean;
  longPressAction?: string;
}

interface FocusBehavior {
  highlightOnFocus: boolean;
  announceChanges: boolean;
  skipToContent: boolean;
  focusManagement: 'auto' | 'manual';
}
```

## State Management

### 1. Preview State Management

```typescript
interface PreviewState {
  previews: Map<string, PreviewCacheEntry>;
  loading: Set<string>;
  errors: Map<string, PreviewError>;
  config: PreviewConfig;
}

interface PreviewCacheEntry {
  metadata: LinkMetadata;
  generatedAt: number;
  expiresAt: number;
  hitCount: number;
  lastAccessed: number;
}

interface PreviewConfig {
  cacheTimeout: number;
  maxCacheSize: number;
  batchSize: number;
  retryAttempts: number;
  fallbackEnabled: boolean;
}

// Redux-style actions
type PreviewAction =
  | { type: 'FETCH_START'; url: string }
  | { type: 'FETCH_SUCCESS'; url: string; metadata: LinkMetadata }
  | { type: 'FETCH_ERROR'; url: string; error: PreviewError }
  | { type: 'CACHE_INVALIDATE'; url?: string }
  | { type: 'CONFIG_UPDATE'; config: Partial<PreviewConfig> };

// React Hook for preview state
function usePreviewState() {
  const [state, dispatch] = useReducer(previewReducer, initialState);
  
  const fetchPreview = useCallback(async (url: string) => {
    dispatch({ type: 'FETCH_START', url });
    
    try {
      const metadata = await previewService.getPreview(url);
      dispatch({ type: 'FETCH_SUCCESS', url, metadata });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', url, error });
    }
  }, []);

  const invalidateCache = useCallback((url?: string) => {
    dispatch({ type: 'CACHE_INVALIDATE', url });
  }, []);

  return {
    state,
    fetchPreview,
    invalidateCache,
  };
}
```

### 2. Performance Optimization Hooks

```typescript
// Intersection Observer Hook
function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<Element>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(callback, options);
    const target = targetRef.current;
    
    if (target) {
      observer.observe(target);
    }
    
    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [callback, options]);
  
  return targetRef;
}

// Image Preloading Hook
function useImagePreloader(urls: string[]) {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    urls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        setLoadedUrls(prev => new Set(prev).add(url));
      };
      img.src = url;
    });
  }, [urls]);
  
  return loadedUrls;
}

// Debounced Preview Loading
function useDebouncePreview(url: string, delay: number = 300) {
  const [debouncedUrl, setDebouncedUrl] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUrl(url);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [url, delay]);
  
  return debouncedUrl;
}
```

## Error Boundary Implementation

```typescript
interface PreviewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class PreviewErrorBoundary extends Component<
  PropsWithChildren<{}>,
  PreviewErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    
    // Log error to monitoring service
    logger.error('Preview Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <PreviewErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

interface PreviewErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

const PreviewErrorFallback: React.FC<PreviewErrorFallbackProps> = ({
  error,
  onRetry,
}) => (
  <div className="preview-error-fallback">
    <div className="error-icon">⚠️</div>
    <h3>Preview Unavailable</h3>
    <p>
      {error?.message || 'Unable to load preview content.'}
    </p>
    <button onClick={onRetry} className="retry-button">
      Try Again
    </button>
  </div>
);
```

## Testing Specifications

### 1. Component Testing Strategy

```typescript
// Jest + React Testing Library tests
describe('EnhancedLinkPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIntersectionObserver();
  });

  test('renders loading state initially', () => {
    render(<EnhancedLinkPreview url="https://example.com" />);
    expect(screen.getByTestId('preview-skeleton')).toBeInTheDocument();
  });

  test('displays preview card after successful fetch', async () => {
    const metadata = mockLinkMetadata();
    mockPreviewService.getPreview.mockResolvedValue(metadata);
    
    render(<EnhancedLinkPreview url="https://example.com" />);
    
    await waitFor(() => {
      expect(screen.getByText(metadata.title)).toBeInTheDocument();
      expect(screen.getByText(metadata.description)).toBeInTheDocument();
    });
  });

  test('handles error states gracefully', async () => {
    mockPreviewService.getPreview.mockRejectedValue(new Error('Network error'));
    
    render(<EnhancedLinkPreview url="https://example.com" />);
    
    await waitFor(() => {
      expect(screen.getByText(/unable to load preview/i)).toBeInTheDocument();
    });
  });

  test('supports keyboard navigation', async () => {
    render(<EnhancedLinkPreview url="https://example.com" />);
    
    const preview = screen.getByRole('link');
    preview.focus();
    
    fireEvent.keyDown(preview, { key: 'Enter' });
    
    expect(mockNavigationHandler).toHaveBeenCalled();
  });
});
```

### 2. Visual Regression Testing

```typescript
// Storybook stories for visual testing
export default {
  title: 'Components/EnhancedLinkPreview',
  component: EnhancedLinkPreview,
  parameters: {
    docs: {
      description: {
        component: 'Enhanced link preview with rich media support',
      },
    },
  },
} as Meta;

export const Default: Story = {
  args: {
    url: 'https://example.com/article',
    displayMode: 'card',
  },
};

export const YouTubeVideo: Story = {
  args: {
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    displayMode: 'embedded',
    enableVideoEmbed: true,
  },
};

export const ThumbnailOnly: Story = {
  args: {
    url: 'https://example.com/image.jpg',
    displayMode: 'thumbnail',
  },
};

export const LoadingState: Story = {
  args: {
    url: 'https://slow-loading-site.com',
  },
  parameters: {
    mockData: {
      loading: true,
    },
  },
};

export const ErrorState: Story = {
  args: {
    url: 'https://invalid-url.com',
  },
  parameters: {
    mockData: {
      error: new PreviewError('Failed to fetch preview', 'network'),
    },
  },
};
```

### 3. Accessibility Testing

```typescript
describe('Accessibility Tests', () => {
  test('meets WCAG 2.1 AA requirements', async () => {
    const { container } = render(
      <EnhancedLinkPreview url="https://example.com" />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('supports screen readers', () => {
    render(<EnhancedLinkPreview url="https://example.com" />);
    
    expect(screen.getByRole('link')).toHaveAccessibleName();
    expect(screen.getByRole('img')).toHaveAttribute('alt');
  });

  test('provides keyboard navigation', () => {
    render(<EnhancedLinkPreview url="https://example.com" />);
    
    const preview = screen.getByRole('link');
    expect(preview).toHaveAttribute('tabindex', '0');
    
    preview.focus();
    expect(preview).toHaveFocus();
  });
});
```

## Performance Benchmarks

### 1. Performance Targets

```typescript
interface PerformanceTargets {
  // Time to Interactive (TTI)
  timeToInteractive: 200; // milliseconds
  
  // Largest Contentful Paint (LCP)
  largestContentfulPaint: 1000; // milliseconds
  
  // First Input Delay (FID)
  firstInputDelay: 100; // milliseconds
  
  // Cumulative Layout Shift (CLS)
  cumulativeLayoutShift: 0.1; // score
  
  // Custom metrics
  previewGenerationTime: 500; // milliseconds
  thumbnailLoadTime: 300; // milliseconds
  cacheHitRate: 0.8; // 80%
  errorRate: 0.01; // 1%
}
```

### 2. Performance Monitoring

```typescript
// Performance monitoring hooks
function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      analytics.track('component_performance', {
        component: componentName,
        duration,
        timestamp: Date.now(),
      });
    };
  }, [componentName]);
}

// Bundle size analysis
function analyzeBundleSize() {
  return {
    total: '245KB',
    gzipped: '67KB',
    breakdown: {
      core: '45KB',
      youtube: '32KB',
      image: '28KB',
      modal: '18KB',
      utilities: '12KB',
    },
  };
}
```

This comprehensive component specification provides detailed blueprints for implementing all the web preview functionality components, including their interfaces, state management, error handling, testing strategies, and performance requirements.