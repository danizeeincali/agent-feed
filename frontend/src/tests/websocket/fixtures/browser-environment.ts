/**
 * TDD London School Browser Environment Simulation Fixtures
 * 
 * Provides mock browser APIs and environment conditions to simulate
 * the exact patterns that occur in real browser environments vs backend tests.
 * 
 * Focus on interaction patterns rather than implementation details,
 * following London School methodology.
 */

export interface BrowserEnvironmentMock {
  // DOM APIs
  document: {
    visibilityState: string;
    hidden: boolean;
    addEventListener: jest.MockedFunction<(event: string, handler: EventListener) => void>;
    removeEventListener: jest.MockedFunction<(event: string, handler: EventListener) => void>;
    dispatchEvent: jest.MockedFunction<(event: Event) => boolean>;
  };
  
  // Window APIs
  window: {
    location: {
      href: string;
      origin: string;
      pathname: string;
    };
    navigator: {
      userAgent: string;
      onLine: boolean;
    };
    addEventListener: jest.MockedFunction<(event: string, handler: EventListener) => void>;
    removeEventListener: jest.MockedFunction<(event: string, handler: EventListener) => void>;
  };
  
  // Storage APIs
  localStorage: {
    getItem: jest.MockedFunction<(key: string) => string | null>;
    setItem: jest.MockedFunction<(key: string, value: string) => void>;
    removeItem: jest.MockedFunction<(key: string) => void>;
    clear: jest.MockedFunction<() => void>;
    length: number;
    key: jest.MockedFunction<(index: number) => string | null>;
  };
  
  // Network APIs
  fetch: jest.MockedFunction<(input: RequestInfo, init?: RequestInit) => Promise<Response>>;
  
  // Timer APIs
  setTimeout: jest.MockedFunction<(handler: Function, timeout: number) => number>;
  clearTimeout: jest.MockedFunction<(handle: number) => void>;
  setInterval: jest.MockedFunction<(handler: Function, timeout: number) => number>;
  clearInterval: jest.MockedFunction<(handle: number) => void>;
}

export interface BrowserEnvironmentSimulator {
  setup: () => BrowserEnvironmentMock;
  cleanup: () => void;
  simulateVisibilityChange: (state: 'visible' | 'hidden') => void;
  simulateNetworkChange: (online: boolean) => void;
  simulatePageUnload: () => void;
  simulatePageReload: () => void;
  simulateStorageChange: (key: string, newValue: string | null, oldValue: string | null) => void;
  getEventListeners: (target: 'document' | 'window') => { [event: string]: EventListener[] };
  triggerEvent: (target: 'document' | 'window', event: string, eventData?: any) => void;
}

// Storage for captured event listeners
const documentListeners: { [event: string]: EventListener[] } = {};
const windowListeners: { [event: string]: EventListener[] } = {};

// Original browser APIs (to restore later)
let originalAPIs: any = {};

const createBrowserEnvironmentSimulator = (): BrowserEnvironmentSimulator => {
  let mockEnvironment: BrowserEnvironmentMock;

  const setup = (): BrowserEnvironmentMock => {
    // Store original APIs
    originalAPIs = {
      document: {
        visibilityState: (global as any).document?.visibilityState,
        hidden: (global as any).document?.hidden,
        addEventListener: (global as any).document?.addEventListener,
        removeEventListener: (global as any).document?.removeEventListener
      },
      window: {
        location: (global as any).window?.location,
        navigator: (global as any).window?.navigator,
        addEventListener: (global as any).window?.addEventListener,
        removeEventListener: (global as any).window?.removeEventListener
      },
      localStorage: (global as any).localStorage,
      fetch: (global as any).fetch,
      setTimeout: (global as any).setTimeout,
      clearTimeout: (global as any).clearTimeout,
      setInterval: (global as any).setInterval,
      clearInterval: (global as any).clearInterval
    };

    // Clear listener storage
    Object.keys(documentListeners).forEach(key => {
      documentListeners[key] = [];
    });
    Object.keys(windowListeners).forEach(key => {
      windowListeners[key] = [];
    });

    // Create mock environment
    mockEnvironment = {
      document: {
        visibilityState: 'visible',
        hidden: false,
        addEventListener: jest.fn().mockImplementation((event: string, handler: EventListener) => {
          if (!documentListeners[event]) documentListeners[event] = [];
          documentListeners[event].push(handler);
        }),
        removeEventListener: jest.fn().mockImplementation((event: string, handler: EventListener) => {
          if (documentListeners[event]) {
            const index = documentListeners[event].indexOf(handler);
            if (index > -1) {
              documentListeners[event].splice(index, 1);
            }
          }
        }),
        dispatchEvent: jest.fn().mockImplementation((event: Event) => {
          const listeners = documentListeners[event.type] || [];
          listeners.forEach(listener => listener(event));
          return true;
        })
      },
      
      window: {
        location: {
          href: 'http://localhost:3000/test-page',
          origin: 'http://localhost:3000',
          pathname: '/test-page'
        },
        navigator: {
          userAgent: 'Mozilla/5.0 (Test Browser) Chrome/91.0 Safari/537.36',
          onLine: true
        },
        addEventListener: jest.fn().mockImplementation((event: string, handler: EventListener) => {
          if (!windowListeners[event]) windowListeners[event] = [];
          windowListeners[event].push(handler);
        }),
        removeEventListener: jest.fn().mockImplementation((event: string, handler: EventListener) => {
          if (windowListeners[event]) {
            const index = windowListeners[event].indexOf(handler);
            if (index > -1) {
              windowListeners[event].splice(index, 1);
            }
          }
        })
      },
      
      localStorage: {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn().mockReturnValue(null)
      },
      
      fetch: jest.fn().mockResolvedValue(new Response('{}', { status: 200 })),
      
      setTimeout: jest.fn().mockImplementation((handler: Function, timeout: number) => {
        return setTimeout(handler, timeout);
      }),
      clearTimeout: jest.fn().mockImplementation((handle: number) => {
        clearTimeout(handle);
      }),
      setInterval: jest.fn().mockImplementation((handler: Function, timeout: number) => {
        return setInterval(handler, timeout);
      }),
      clearInterval: jest.fn().mockImplementation((handle: number) => {
        clearInterval(handle);
      })
    };

    // Apply mocks to global scope
    (global as any).document = mockEnvironment.document;
    (global as any).window = mockEnvironment.window;
    (global as any).localStorage = mockEnvironment.localStorage;
    (global as any).fetch = mockEnvironment.fetch;
    (global as any).setTimeout = mockEnvironment.setTimeout;
    (global as any).clearTimeout = mockEnvironment.clearTimeout;
    (global as any).setInterval = mockEnvironment.setInterval;
    (global as any).clearInterval = mockEnvironment.clearInterval;

    return mockEnvironment;
  };

  const cleanup = () => {
    // Restore original APIs
    if (originalAPIs.document) {
      Object.assign((global as any).document || {}, originalAPIs.document);
    }
    if (originalAPIs.window) {
      Object.assign((global as any).window || {}, originalAPIs.window);
    }
    if (originalAPIs.localStorage) {
      (global as any).localStorage = originalAPIs.localStorage;
    }
    if (originalAPIs.fetch) {
      (global as any).fetch = originalAPIs.fetch;
    }
    
    // Clear listeners
    Object.keys(documentListeners).forEach(key => {
      documentListeners[key] = [];
    });
    Object.keys(windowListeners).forEach(key => {
      windowListeners[key] = [];
    });
  };

  const simulateVisibilityChange = (state: 'visible' | 'hidden') => {
    if (!mockEnvironment) return;
    
    mockEnvironment.document.visibilityState = state;
    mockEnvironment.document.hidden = state === 'hidden';
    
    const visibilityChangeEvent = new Event('visibilitychange');
    const listeners = documentListeners['visibilitychange'] || [];
    listeners.forEach(listener => listener(visibilityChangeEvent));
  };

  const simulateNetworkChange = (online: boolean) => {
    if (!mockEnvironment) return;
    
    mockEnvironment.window.navigator.onLine = online;
    
    const networkEvent = new Event(online ? 'online' : 'offline');
    const listeners = windowListeners[networkEvent.type] || [];
    listeners.forEach(listener => listener(networkEvent));
  };

  const simulatePageUnload = () => {
    const beforeUnloadEvent = new Event('beforeunload');
    const unloadEvent = new Event('unload');
    
    const beforeUnloadListeners = windowListeners['beforeunload'] || [];
    const unloadListeners = windowListeners['unload'] || [];
    
    beforeUnloadListeners.forEach(listener => listener(beforeUnloadEvent));
    unloadListeners.forEach(listener => listener(unloadEvent));
  };

  const simulatePageReload = () => {
    simulatePageUnload();
    
    // Simulate page load
    const loadEvent = new Event('load');
    const domContentLoadedEvent = new Event('DOMContentLoaded');
    
    const loadListeners = windowListeners['load'] || [];
    const domContentLoadedListeners = documentListeners['DOMContentLoaded'] || [];
    
    domContentLoadedListeners.forEach(listener => listener(domContentLoadedEvent));
    loadListeners.forEach(listener => listener(loadEvent));
  };

  const simulateStorageChange = (key: string, newValue: string | null, oldValue: string | null) => {
    const storageEvent = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      storageArea: mockEnvironment?.localStorage as any,
      url: mockEnvironment?.window.location.href
    });
    
    const listeners = windowListeners['storage'] || [];
    listeners.forEach(listener => listener(storageEvent));
  };

  const getEventListeners = (target: 'document' | 'window') => {
    return target === 'document' ? { ...documentListeners } : { ...windowListeners };
  };

  const triggerEvent = (target: 'document' | 'window', event: string, eventData?: any) => {
    const customEvent = new CustomEvent(event, { detail: eventData });
    const listeners = (target === 'document' ? documentListeners : windowListeners)[event] || [];
    listeners.forEach(listener => listener(customEvent));
  };

  return {
    setup,
    cleanup,
    simulateVisibilityChange,
    simulateNetworkChange,
    simulatePageUnload,
    simulatePageReload,
    simulateStorageChange,
    getEventListeners,
    triggerEvent
  };
};

// Export singleton instance
export const browserEnvironmentSimulator = createBrowserEnvironmentSimulator();

// Predefined environment scenarios
export const browserScenarios = {
  // Desktop Chrome environment
  desktopChrome: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    online: true,
    localStorage: true,
    webSockets: true
  },
  
  // Mobile Safari environment
  mobileSafari: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 375, height: 812 },
    online: true,
    localStorage: true,
    webSockets: true
  },
  
  // Offline environment
  offlineEnvironment: {
    userAgent: 'Mozilla/5.0 (Test Environment) Offline',
    online: false,
    localStorage: true,
    webSockets: false
  },
  
  // Limited storage environment
  limitedStorage: {
    userAgent: 'Mozilla/5.0 (Test Environment) Limited Storage',
    online: true,
    localStorage: false,
    webSockets: true
  }
};

// Helper for setting up specific scenarios
export const setupBrowserScenario = (scenario: keyof typeof browserScenarios, customOverrides?: Partial<typeof browserScenarios.desktopChrome>) => {
  const config = { ...browserScenarios[scenario], ...customOverrides };
  const mockEnv = browserEnvironmentSimulator.setup();
  
  mockEnv.window.navigator.userAgent = config.userAgent;
  mockEnv.window.navigator.onLine = config.online;
  
  return mockEnv;
};

// Contract testing utilities
export const verifyBrowserAPIContract = {
  localStorage: (mock: BrowserEnvironmentMock['localStorage']) => {
    expect(mock.getItem).toBeDefined();
    expect(mock.setItem).toBeDefined();
    expect(mock.removeItem).toBeDefined();
    expect(mock.clear).toBeDefined();
  },
  
  document: (mock: BrowserEnvironmentMock['document']) => {
    expect(mock.addEventListener).toBeDefined();
    expect(mock.removeEventListener).toBeDefined();
    expect(mock.visibilityState).toBeDefined();
    expect(mock.hidden).toBeDefined();
  },
  
  window: (mock: BrowserEnvironmentMock['window']) => {
    expect(mock.addEventListener).toBeDefined();
    expect(mock.removeEventListener).toBeDefined();
    expect(mock.location).toBeDefined();
    expect(mock.navigator).toBeDefined();
  }
};