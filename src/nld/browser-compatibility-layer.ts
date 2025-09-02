/**
 * Browser Compatibility Layer for SSE/WebSocket
 * Handles cross-browser compatibility and polyfills
 */

export interface BrowserCapabilities {
  hasWebSocket: boolean;
  hasEventSource: boolean;
  hasServiceWorker: boolean;
  hasBroadcastChannel: boolean;
  corsSupport: boolean;
  browser: string;
  browserVersion: string;
  platform: string;
  mobile: boolean;
}

export interface PolyfillOptions {
  eventSource?: boolean;
  webSocket?: boolean;
  broadcastChannel?: boolean;
  serviceWorker?: boolean;
}

/**
 * EventSource Polyfill for older browsers
 */
class EventSourcePolyfill {
  private url: string;
  private options: EventSourceInit;
  private xhr: XMLHttpRequest | null = null;
  private readyState: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: { [key: string]: EventListener[] } = {};
  private lastEventId: string = '';
  
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSED = 2;

  public onopen: ((this: EventSource, ev: Event) => any) | null = null;
  public onerror: ((this: EventSource, ev: Event) => any) | null = null;
  public onmessage: ((this: EventSource, ev: MessageEvent) => any) | null = null;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    this.url = url;
    this.options = eventSourceInitDict || {};
    this.connect();
  }

  private connect(): void {
    if (this.readyState === EventSourcePolyfill.CLOSED) return;

    this.readyState = EventSourcePolyfill.CONNECTING;
    this.xhr = new XMLHttpRequest();
    
    this.xhr.open('GET', this.url, true);
    this.xhr.setRequestHeader('Accept', 'text/event-stream');
    this.xhr.setRequestHeader('Cache-Control', 'no-cache');
    
    if (this.lastEventId) {
      this.xhr.setRequestHeader('Last-Event-ID', this.lastEventId);
    }

    // Handle response
    this.xhr.onreadystatechange = () => {
      if (!this.xhr) return;

      if (this.xhr.readyState === 3 || this.xhr.readyState === 4) {
        if (this.xhr.status === 200) {
          if (this.readyState === EventSourcePolyfill.CONNECTING) {
            this.readyState = EventSourcePolyfill.OPEN;
            this.dispatchEvent('open', {});
          }
          this.processResponse();
        } else {
          this.handleError();
        }
      }
    };

    this.xhr.onerror = () => this.handleError();
    this.xhr.send();
  }

  private processResponse(): void {
    if (!this.xhr) return;

    const responseText = this.xhr.responseText;
    const lines = responseText.split('\n');
    
    let eventType = 'message';
    let data = '';
    let id = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        data += line.substring(5).trim() + '\n';
      } else if (line.startsWith('id:')) {
        id = line.substring(3).trim();
        this.lastEventId = id;
      } else if (line.trim() === '') {
        if (data) {
          const event = new MessageEvent(eventType, {
            data: data.trim(),
            lastEventId: id,
            origin: new URL(this.url).origin
          });
          this.dispatchEvent(eventType, event);
          data = '';
          eventType = 'message';
        }
      }
    }
  }

  private handleError(): void {
    this.readyState = EventSourcePolyfill.CLOSED;
    this.dispatchEvent('error', {});
    
    // Auto-reconnect after delay
    this.reconnectTimeout = setTimeout(() => {
      if (this.readyState !== EventSourcePolyfill.CLOSED) {
        this.connect();
      }
    }, 3000);
  }

  private dispatchEvent(type: string, event: any): void {
    // Call direct handlers
    if (type === 'open' && this.onopen) {
      this.onopen.call(this as any, event);
    } else if (type === 'error' && this.onerror) {
      this.onerror.call(this as any, event);
    } else if (type === 'message' && this.onmessage) {
      this.onmessage.call(this as any, event);
    }

    // Call registered listeners
    const listeners = this.listeners[type];
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('EventSource listener error:', error);
        }
      });
    }
  }

  public addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners[type];
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public close(): void {
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.readyState = EventSourcePolyfill.CLOSED;
  }

  public get readyState(): number {
    return this.readyState;
  }

  public get url(): string {
    return this.url;
  }

  public get withCredentials(): boolean {
    return this.options.withCredentials || false;
  }
}

/**
 * BroadcastChannel Polyfill for cross-tab communication
 */
class BroadcastChannelPolyfill {
  private name: string;
  private listeners: Set<(event: MessageEvent) => void> = new Set();
  private storageListener: (event: StorageEvent) => void;
  
  public onmessage: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;
  public onmessageerror: ((this: BroadcastChannel, ev: MessageEvent) => any) | null = null;

  constructor(name: string) {
    this.name = name;
    
    // Use localStorage for cross-tab communication
    this.storageListener = (event: StorageEvent) => {
      if (event.key === `broadcast_${this.name}` && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          const messageEvent = new MessageEvent('message', {
            data: data.message,
            origin: location.origin,
            source: null,
            ports: []
          });
          this.dispatchMessage(messageEvent);
        } catch (error) {
          console.error('BroadcastChannel polyfill error:', error);
        }
      }
    };
    
    window.addEventListener('storage', this.storageListener);
  }

  public postMessage(message: any): void {
    const data = {
      message,
      timestamp: Date.now(),
      source: 'broadcast_channel_polyfill'
    };
    
    try {
      localStorage.setItem(`broadcast_${this.name}`, JSON.stringify(data));
      // Clear immediately to trigger storage event
      localStorage.removeItem(`broadcast_${this.name}`);
    } catch (error) {
      console.error('BroadcastChannel postMessage error:', error);
    }
  }

  public addEventListener(type: 'message' | 'messageerror', listener: (event: MessageEvent) => void): void {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  public removeEventListener(type: 'message' | 'messageerror', listener: (event: MessageEvent) => void): void {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  private dispatchMessage(event: MessageEvent): void {
    if (this.onmessage) {
      this.onmessage.call(this as any, event);
    }
    
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('BroadcastChannel listener error:', error);
      }
    });
  }

  public close(): void {
    window.removeEventListener('storage', this.storageListener);
    this.listeners.clear();
  }
}

/**
 * Browser Compatibility Manager
 */
export class BrowserCompatibilityManager {
  private capabilities: BrowserCapabilities;
  private polyfillsLoaded: Set<string> = new Set();

  constructor() {
    this.capabilities = this.detectCapabilities();
    this.applyCompatibilityFixes();
  }

  /**
   * Detect browser capabilities
   */
  private detectCapabilities(): BrowserCapabilities {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    return {
      hasWebSocket: typeof WebSocket !== 'undefined',
      hasEventSource: typeof EventSource !== 'undefined',
      hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      hasBroadcastChannel: typeof BroadcastChannel !== 'undefined',
      corsSupport: this.detectCORSSupport(),
      browser: this.detectBrowser(userAgent),
      browserVersion: this.detectBrowserVersion(userAgent),
      platform: this.detectPlatform(userAgent),
      mobile: this.detectMobile(userAgent)
    };
  }

  /**
   * Detect CORS support
   */
  private detectCORSSupport(): boolean {
    if (typeof XMLHttpRequest !== 'undefined') {
      const xhr = new XMLHttpRequest();
      return 'withCredentials' in xhr;
    }
    return false;
  }

  /**
   * Detect browser type
   */
  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome/')) return 'Chrome';
    if (userAgent.includes('Firefox/')) return 'Firefox';
    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
    if (userAgent.includes('Edge/')) return 'Edge';
    if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
    return 'Unknown';
  }

  /**
   * Detect browser version
   */
  private detectBrowserVersion(userAgent: string): string {
    const matches = userAgent.match(/(?:Chrome|Firefox|Safari|Edge)\/(\d+)/i);
    if (matches) return matches[1];
    
    const ieMatch = userAgent.match(/MSIE (\d+)/i);
    if (ieMatch) return ieMatch[1];
    
    return '0';
  }

  /**
   * Detect platform
   */
  private detectPlatform(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Detect mobile device
   */
  private detectMobile(userAgent: string): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);
  }

  /**
   * Apply browser-specific compatibility fixes
   */
  private applyCompatibilityFixes(): void {
    // Fix for Safari's EventSource implementation
    if (this.capabilities.browser === 'Safari' && parseInt(this.capabilities.browserVersion) < 14) {
      console.log('🔧 [Compatibility] Applying Safari EventSource fixes');
      this.applySafariEventSourceFix();
    }

    // Fix for Internet Explorer
    if (this.capabilities.browser === 'Internet Explorer') {
      console.log('🔧 [Compatibility] Applying Internet Explorer compatibility fixes');
      this.applyIECompatibilityFixes();
    }

    // Fix for mobile browsers
    if (this.capabilities.mobile) {
      console.log('🔧 [Compatibility] Applying mobile browser fixes');
      this.applyMobileBrowserFixes();
    }
  }

  /**
   * Apply Safari EventSource fixes
   */
  private applySafariEventSourceFix(): void {
    // Safari has issues with EventSource reconnection
    if (typeof EventSource !== 'undefined') {
      const originalEventSource = EventSource;
      (window as any).EventSource = class extends originalEventSource {
        constructor(url: string, eventSourceInitDict?: EventSourceInit) {
          super(url, eventSourceInitDict);
          
          // Override onerror to handle Safari-specific issues
          const originalOnError = this.onerror;
          this.onerror = (event) => {
            console.log('🔧 [Safari Fix] EventSource error handled');
            if (originalOnError) {
              originalOnError.call(this, event);
            }
          };
        }
      };
    }
  }

  /**
   * Apply Internet Explorer compatibility fixes
   */
  private applyIECompatibilityFixes(): void {
    // IE doesn't support many modern features
    if (!this.capabilities.hasEventSource) {
      this.loadEventSourcePolyfill();
    }
    
    if (!this.capabilities.hasBroadcastChannel) {
      this.loadBroadcastChannelPolyfill();
    }
  }

  /**
   * Apply mobile browser fixes
   */
  private applyMobileBrowserFixes(): void {
    // Mobile browsers often suspend background connections
    console.log('🔧 [Mobile Fix] Applying mobile-specific connection handling');
    
    // Add visibility change listeners for mobile
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('🔧 [Mobile Fix] App backgrounded - connections may be suspended');
        } else {
          console.log('🔧 [Mobile Fix] App foregrounded - resuming connections');
        }
      });
    }
  }

  /**
   * Load polyfills based on options
   */
  public loadPolyfills(options: PolyfillOptions): Promise<void> {
    const promises: Promise<void>[] = [];

    if (options.eventSource && !this.capabilities.hasEventSource) {
      promises.push(this.loadEventSourcePolyfill());
    }

    if (options.broadcastChannel && !this.capabilities.hasBroadcastChannel) {
      promises.push(this.loadBroadcastChannelPolyfill());
    }

    return Promise.all(promises).then(() => {
      console.log('✅ [Compatibility] All polyfills loaded');
    });
  }

  /**
   * Load EventSource polyfill
   */
  private async loadEventSourcePolyfill(): Promise<void> {
    if (this.polyfillsLoaded.has('eventSource')) return;

    console.log('📦 [Polyfill] Loading EventSource polyfill');
    (window as any).EventSource = EventSourcePolyfill;
    this.polyfillsLoaded.add('eventSource');
    
    // Update capabilities
    this.capabilities.hasEventSource = true;
  }

  /**
   * Load BroadcastChannel polyfill
   */
  private async loadBroadcastChannelPolyfill(): Promise<void> {
    if (this.polyfillsLoaded.has('broadcastChannel')) return;

    console.log('📦 [Polyfill] Loading BroadcastChannel polyfill');
    (window as any).BroadcastChannel = BroadcastChannelPolyfill;
    this.polyfillsLoaded.add('broadcastChannel');
    
    // Update capabilities
    this.capabilities.hasBroadcastChannel = true;
  }

  /**
   * Get browser capabilities
   */
  public getCapabilities(): BrowserCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Check if specific feature is supported
   */
  public supports(feature: keyof BrowserCapabilities): boolean {
    return Boolean(this.capabilities[feature]);
  }

  /**
   * Get recommended transport for current browser
   */
  public getRecommendedTransport(): 'websocket' | 'sse' | 'polling' {
    // Modern browsers with good WebSocket support
    if (this.capabilities.hasWebSocket && 
        ['Chrome', 'Firefox', 'Edge'].includes(this.capabilities.browser) &&
        parseInt(this.capabilities.browserVersion) > 70) {
      return 'websocket';
    }

    // Browsers with good SSE support
    if (this.capabilities.hasEventSource && this.capabilities.corsSupport) {
      return 'sse';
    }

    // Fallback to polling for older browsers
    return 'polling';
  }

  /**
   * Create compatibility report
   */
  public getCompatibilityReport(): {
    score: number;
    recommendations: string[];
    issues: string[];
    capabilities: BrowserCapabilities;
  } {
    let score = 0;
    const recommendations: string[] = [];
    const issues: string[] = [];

    // Score based on capabilities
    if (this.capabilities.hasWebSocket) score += 30;
    if (this.capabilities.hasEventSource) score += 25;
    if (this.capabilities.corsSupport) score += 20;
    if (this.capabilities.hasServiceWorker) score += 15;
    if (this.capabilities.hasBroadcastChannel) score += 10;

    // Browser-specific scoring
    if (['Chrome', 'Firefox', 'Edge'].includes(this.capabilities.browser)) {
      score += 20;
    } else if (this.capabilities.browser === 'Safari') {
      score += 15;
    } else if (this.capabilities.browser === 'Internet Explorer') {
      issues.push('Internet Explorer has limited support for modern web technologies');
      recommendations.push('Consider upgrading to a modern browser');
    }

    // Version scoring
    const version = parseInt(this.capabilities.browserVersion);
    if (version > 90) score += 10;
    else if (version > 70) score += 5;
    else if (version < 50) {
      issues.push(`Browser version ${version} is outdated`);
      recommendations.push('Update browser to latest version');
    }

    // Mobile considerations
    if (this.capabilities.mobile) {
      issues.push('Mobile browsers may suspend background connections');
      recommendations.push('Implement connection recovery for mobile users');
    }

    // Final score normalization
    score = Math.min(score, 100);

    // Generate recommendations based on score
    if (score < 70) {
      recommendations.push('Enable polyfills for better compatibility');
      recommendations.push('Use polling transport as primary method');
    } else if (score < 85) {
      recommendations.push('Use SSE with WebSocket fallback');
    } else {
      recommendations.push('WebSocket is recommended for optimal performance');
    }

    return {
      score,
      recommendations,
      issues,
      capabilities: this.capabilities
    };
  }
}

// Export singleton instance
export const browserCompatibility = new BrowserCompatibilityManager();