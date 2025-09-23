/**
 * TDD London School Mock Factories
 * Test-driven development mocks for video and link preview functionality
 */

import { jest } from '@jest/globals';

// Mock DOM APIs
export const createMockDOMRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  bottom: 100,
  height: 100,
  left: 0,
  right: 100,
  top: 0,
  width: 100,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
  ...overrides
});

// Mock HTMLVideoElement
export const createMockVideoElement = (overrides: Partial<HTMLVideoElement> = {}) => {
  const mockVideo = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    load: jest.fn(),
    canPlayType: jest.fn().mockReturnValue('probably'),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    paused: true,
    currentTime: 0,
    duration: 100,
    volume: 1,
    muted: false,
    readyState: 4,
    networkState: 1,
    autoplay: false,
    controls: true,
    src: '',
    poster: '',
    preload: 'metadata',
    crossOrigin: null,
    loop: false,
    playsinline: false,
    width: 320,
    height: 240,
    videoWidth: 320,
    videoHeight: 240,
    getBoundingClientRect: jest.fn().mockReturnValue(createMockDOMRect()),
    ...overrides
  };
  
  return mockVideo as unknown as HTMLVideoElement;
};

// Mock HTMLIFrameElement for YouTube embeds
export const createMockIFrameElement = (overrides: Partial<HTMLIFrameElement> = {}) => {
  const mockIFrame = {
    src: '',
    contentWindow: {
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    onload: null,
    onerror: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    getBoundingClientRect: jest.fn().mockReturnValue(createMockDOMRect()),
    allow: '',
    allowFullscreen: true,
    referrerPolicy: 'no-referrer-when-downgrade',
    sandbox: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      value: 'allow-scripts allow-same-origin'
    },
    ...overrides
  };
  
  return mockIFrame as unknown as HTMLIFrameElement;
};

// Mock HTMLImageElement
export const createMockImageElement = (overrides: Partial<HTMLImageElement> = {}) => {
  const mockImage = {
    src: '',
    alt: '',
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    complete: false,
    crossOrigin: null,
    referrerPolicy: 'no-referrer',
    loading: 'lazy',
    onload: null,
    onerror: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    getBoundingClientRect: jest.fn().mockReturnValue(createMockDOMRect()),
    ...overrides
  };
  
  return mockImage as unknown as HTMLImageElement;
};

// Mock Fetch Response for API calls
export const createMockFetchResponse = <T>(data: T, options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
} = {}) => {
  const mockResponse = {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    headers: {
      get: jest.fn((key: string) => options.headers?.[key] || null),
      has: jest.fn((key: string) => key in (options.headers || {})),
      forEach: jest.fn()
    },
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    blob: jest.fn().mockResolvedValue(new Blob()),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
  };
  
  return mockResponse as unknown as Response;
};

// YouTube API Response Mock
export interface MockYouTubeVideoData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: string;
  channelTitle: string;
  publishedAt: string;
}

export const createMockYouTubeApiResponse = (videoData: Partial<MockYouTubeVideoData> = {}): any => ({
  items: [
    {
      id: videoData.id || 'dQw4w9WgXcQ',
      snippet: {
        title: videoData.title || 'Never Gonna Give You Up',
        description: videoData.description || 'Official video by Rick Astley',
        thumbnails: {
          default: { url: videoData.thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg' },
          medium: { url: videoData.thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' },
          high: { url: videoData.thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
          maxres: { url: videoData.thumbnailUrl || 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg' }
        },
        channelTitle: videoData.channelTitle || 'Rick Astley',
        publishedAt: videoData.publishedAt || '2009-10-25T06:57:33Z'
      },
      statistics: {
        viewCount: videoData.viewCount || '1000000000'
      },
      contentDetails: {
        duration: videoData.duration || 'PT3M33S'
      }
    }
  ]
});

// Link Preview Data Mock
export interface MockLinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  type?: 'website' | 'image' | 'video' | 'article';
  favicon?: string;
  author?: string;
  publishedAt?: string;
  readingTime?: number;
}

export const createMockLinkPreviewData = (overrides: Partial<MockLinkPreviewData> = {}): MockLinkPreviewData => ({
  url: overrides.url || 'https://example.com',
  title: overrides.title || 'Example Title',
  description: overrides.description || 'Example description',
  image: overrides.image || 'https://example.com/image.jpg',
  site_name: overrides.site_name || 'example.com',
  type: overrides.type || 'website',
  favicon: overrides.favicon || 'https://example.com/favicon.ico',
  author: overrides.author,
  publishedAt: overrides.publishedAt,
  readingTime: overrides.readingTime
});

// Mock Browser APIs
export const createMockUserInteraction = () => ({
  hasUserInteracted: false,
  simulateUserClick: jest.fn(() => {
    // Simulate user activation for autoplay policies
    Object.defineProperty(document, 'wasLastActivatedByUser', {
      value: true,
      configurable: true
    });
  }),
  simulateUserGesture: jest.fn()
});

// Mock Network Conditions
export const createMockNetworkConditions = () => ({
  online: true,
  connection: {
    effectiveType: '4g',
    rtt: 100,
    downlink: 10,
    saveData: false
  },
  simulateOffline: jest.fn(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true
    });
  }),
  simulateSlowNetwork: jest.fn(() => {
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '2g',
        rtt: 2000,
        downlink: 0.5,
        saveData: true
      },
      configurable: true
    });
  })
});

// Mock IntersectionObserver for lazy loading
export const createMockIntersectionObserver = () => {
  const mockEntries: IntersectionObserverEntry[] = [];
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    root: null,
    rootMargin: '0px',
    thresholds: [0]
  };
  
  // Allow triggering intersection changes
  const triggerIntersection = (target: Element, isIntersecting: boolean) => {
    const entry = {
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: createMockDOMRect(),
      intersectionRect: isIntersecting ? createMockDOMRect() : createMockDOMRect({ width: 0, height: 0 }),
      rootBounds: createMockDOMRect(),
      time: Date.now()
    };
    mockEntries.push(entry);
    // Simulate callback execution
    return entry;
  };
  
  return {
    mockObserver: mockObserver as unknown as IntersectionObserver,
    triggerIntersection
  };
};

// Mock CORS and Proxy Services
export const createMockCorsProxy = () => ({
  corsProxyServices: [
    'https://images.weserv.nl/',
    'https://logo.clearbit.com/',
    'https://www.google.com/s2/favicons'
  ],
  simulateCorsError: jest.fn(() => {
    const error = new Error('CORS policy error');
    error.name = 'TypeError';
    return error;
  }),
  simulateProxySuccess: jest.fn((url: string) => createMockFetchResponse({ 
    success: true, 
    url,
    proxied: true 
  }))
});

// Mock Console for debugging tests
export const createMockConsole = () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
});

// Test Utility Functions
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createTestEnvironment = () => ({
  mockVideo: createMockVideoElement(),
  mockIFrame: createMockIFrameElement(),
  mockImage: createMockImageElement(),
  mockUserInteraction: createMockUserInteraction(),
  mockNetworkConditions: createMockNetworkConditions(),
  mockIntersectionObserver: createMockIntersectionObserver(),
  mockCorsProxy: createMockCorsProxy(),
  mockConsole: createMockConsole()
});

export default {
  createMockVideoElement,
  createMockIFrameElement,
  createMockImageElement,
  createMockFetchResponse,
  createMockYouTubeApiResponse,
  createMockLinkPreviewData,
  createMockUserInteraction,
  createMockNetworkConditions,
  createMockIntersectionObserver,
  createMockCorsProxy,
  createMockConsole,
  createTestEnvironment,
  waitForNextTick,
  waitFor
};