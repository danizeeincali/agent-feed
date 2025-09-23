import { Page, expect } from '@playwright/test';

export interface ApiCallLog {
  url: string;
  method: string;
  status: number;
  response?: any;
  requestData?: any;
  timestamp: number;
  duration?: number;
}

export interface ComponentState {
  name: string;
  props: any;
  state: any;
  timestamp: number;
}

export class BrowserDebugger {
  private apiCalls: ApiCallLog[] = [];
  private componentStates: ComponentState[] = [];
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async setupApiInterception(page: Page) {
    // Track requests
    page.on('request', request => {
      if (this.isApiCall(request.url())) {
        console.log(`📤 API Request: ${request.method()} ${request.url()}`);
      }
    });

    // Track responses with detailed logging
    page.on('response', async response => {
      if (this.isApiCall(response.url())) {
        const timestamp = Date.now() - this.startTime;
        const request = response.request();
        
        try {
          let responseData = null;
          let requestData = null;

          // Get request data
          try {
            const requestPostData = request.postData();
            if (requestPostData) {
              requestData = JSON.parse(requestPostData);
            }
          } catch (e) {
            // Not JSON or no post data
          }

          // Get response data
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            responseData = await response.json().catch(() => 'Failed to parse JSON');
          }

          const apiCall: ApiCallLog = {
            url: response.url(),
            method: request.method(),
            status: response.status(),
            response: responseData,
            requestData,
            timestamp
          };

          this.apiCalls.push(apiCall);
          
          console.log(`📥 API Response: ${response.status()} ${response.url()}`);
          if (responseData) {
            console.log(`📄 Response Data:`, responseData);
          }
          
        } catch (error) {
          console.error(`❌ Error processing API response: ${error}`);
        }
      }
    });
  }

  async setupComponentTracking(page: Page) {
    // Inject component state tracking
    await page.addInitScript(() => {
      // Override React hooks to track state changes
      const originalUseState = (window as any).React?.useState;
      const originalUseEffect = (window as any).React?.useEffect;
      
      if (originalUseState) {
        (window as any).React.useState = function(initialState: any) {
          const result = originalUseState(initialState);
          
          // Log state changes
          const [state, setState] = result;
          const wrappedSetState = (newState: any) => {
            console.log('🔄 State Change:', { from: state, to: newState });
            return setState(newState);
          };
          
          return [state, wrappedSetState];
        };
      }

      // Track component mounts/unmounts
      (window as any).__COMPONENT_LIFECYCLE__ = [];
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.className?.includes?.('agent') || 
                    element.className?.includes?.('page')) {
                  (window as any).__COMPONENT_LIFECYCLE__.push({
                    type: 'mount',
                    element: element.tagName,
                    className: element.className,
                    timestamp: Date.now()
                  });
                }
              }
            });
          }
        });
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    });
  }

  async captureNetworkWaterfall(page: Page): Promise<any[]> {
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')
        .concat(performance.getEntriesByType('resource'))
        .map(entry => ({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          transferSize: (entry as any).transferSize,
          type: entry.entryType
        }));
    });

    return performanceEntries;
  }

  async waitForApiCall(page: Page, urlPattern: string, timeout: number = 10000): Promise<ApiCallLog | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const matchingCall = this.apiCalls.find(call => 
        call.url.includes(urlPattern)
      );
      
      if (matchingCall) {
        return matchingCall;
      }
      
      await page.waitForTimeout(100);
    }
    
    return null;
  }

  async verifyApiCallsMade(expectedCalls: string[]): Promise<boolean> {
    for (const expectedCall of expectedCalls) {
      const found = this.apiCalls.some(call => 
        call.url.includes(expectedCall)
      );
      
      if (!found) {
        console.log(`❌ Expected API call not found: ${expectedCall}`);
        return false;
      }
    }
    
    return true;
  }

  async captureReactRouterState(page: Page): Promise<any> {
    return await page.evaluate(() => {
      // Try to access React Router state
      const history = (window as any).history;
      const location = window.location;
      
      return {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: history.state,
        reactRouter: {
          // Try to get React Router location if available
          location: (window as any).__react_router_location__,
          history: (window as any).__react_router_history__
        }
      };
    });
  }

  async analyzeComponentRenderCycle(page: Page): Promise<any> {
    const renderInfo = await page.evaluate(() => {
      const root = document.querySelector('#root');
      
      if (!root) return { error: 'No React root found' };
      
      const analyze = (element: Element): any => {
        return {
          tag: element.tagName,
          className: element.className,
          childCount: element.children.length,
          textContent: element.textContent?.substring(0, 100),
          hasReactProps: !!(element as any)._reactInternalFiber || 
                        !!(element as any).__reactInternalInstance,
          children: Array.from(element.children).map(child => 
            analyze(child)
          ).slice(0, 5) // Limit depth
        };
      };
      
      return analyze(root);
    });
    
    return renderInfo;
  }

  getApiCalls(): ApiCallLog[] {
    return [...this.apiCalls];
  }

  getApiCallsForPattern(pattern: string): ApiCallLog[] {
    return this.apiCalls.filter(call => call.url.includes(pattern));
  }

  generateDebugReport(): string {
    const report = [
      '# Browser Debug Report',
      `Generated: ${new Date().toISOString()}`,
      `Duration: ${Date.now() - this.startTime}ms`,
      '',
      '## API Calls Summary',
      `Total API Calls: ${this.apiCalls.length}`,
      '',
      ...this.apiCalls.map(call => 
        `- ${call.method} ${call.url} → ${call.status} (${call.timestamp}ms)`
      ),
      '',
      '## Failed API Calls',
      ...this.apiCalls
        .filter(call => call.status >= 400)
        .map(call => `- ${call.method} ${call.url} → ${call.status}: ${JSON.stringify(call.response)}`),
      '',
      '## Missing Expected Calls',
      '(To be filled by test assertions)',
    ].join('\n');

    return report;
  }

  private isApiCall(url: string): boolean {
    return url.includes('/api/') || 
           url.includes('/agents/') || 
           url.includes('/pages/') ||
           url.match(/\.(json)$/);
  }
}

export class PageStateAnalyzer {
  async analyzeCurrentState(page: Page) {
    const state = await page.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main') || document.querySelector('#root');
      
      return {
        url: window.location.href,
        title: document.title,
        bodyClasses: body.className,
        mainContent: main?.textContent?.substring(0, 200),
        visibleElements: {
          buttons: Array.from(document.querySelectorAll('button')).length,
          links: Array.from(document.querySelectorAll('a')).length,
          inputs: Array.from(document.querySelectorAll('input')).length,
          agentCards: Array.from(document.querySelectorAll('[data-testid*="agent"], .agent')).length,
          pageContent: Array.from(document.querySelectorAll('[data-testid*="page"], .page-content')).length
        },
        errorMessages: Array.from(document.querySelectorAll('.error, [data-testid="error"]'))
          .map(el => el.textContent),
        emptyStates: Array.from(document.querySelectorAll(':contains("No pages"), :contains("Empty"), .empty'))
          .map(el => el.textContent)
      };
    });
    
    return state;
  }

  async findElementsByText(page: Page, text: string, exact: boolean = false) {
    const elements = await page.evaluate((searchText, isExact) => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      const matchingElements = [];
      let node;
      
      while (node = walker.nextNode()) {
        const content = node.textContent || '';
        const matches = isExact ? 
          content.trim() === searchText :
          content.toLowerCase().includes(searchText.toLowerCase());
          
        if (matches) {
          matchingElements.push({
            text: content.trim(),
            parentTag: node.parentElement?.tagName,
            parentClass: node.parentElement?.className
          });
        }
      }
      
      return matchingElements;
    }, text, exact);
    
    return elements;
  }
}