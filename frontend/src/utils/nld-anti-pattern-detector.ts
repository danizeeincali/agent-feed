/**
 * NLD Real-Time Anti-Pattern Detection System
 * Automatically captures callback failures and input echo problems
 */

import { nldStateMonitor } from '../patterns/nld-react-state-monitor';

export interface AntiPatternDetection {
  id: string;
  type: 'MISSING_CALLBACK' | 'INPUT_ECHO_FAILURE' | 'STATE_ISOLATION';
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  description: string;
  fix: string;
  confidence: number;
}

export class NLDAntiPatternDetector {
  private detections: AntiPatternDetection[] = [];
  private isMonitoring = false;
  private windowRef: Window | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.windowRef = window;
      this.setupGlobalMonitoring();
    }
  }

  /**
   * Deploy Real-Time Detection System
   */
  deploy() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚀 NLD Anti-Pattern Detection System DEPLOYED');
    
    // Monitor fetch API for missing callbacks
    this.interceptFetchAPI();
    
    // Monitor React state updates
    this.monitorReactStateUpdates();
    
    // Monitor WebSocket/SSE events  
    this.monitorCommunicationPatterns();
    
    // Start periodic analysis
    this.startPeriodicAnalysis();
  }

  /**
   * Intercept Fetch API to Detect Missing Callbacks
   */
  private interceptFetchAPI() {
    if (!this.windowRef || !this.windowRef.fetch) return;

    const originalFetch = this.windowRef.fetch;
    const detector = this;

    this.windowRef.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Monitor instance creation calls
      if (url.includes('/api/claude/instances') && init?.method === 'POST') {
        console.log('🔍 NLD: Monitoring instance creation call');
        
        const startTime = Date.now();
        const response = await originalFetch(input, init);
        
        // Track if fetchInstances is called within 3 seconds
        let fetchInstancesCalled = false;
        const originalFetch2 = window.fetch;
        
        const timeout = setTimeout(() => {
          if (!fetchInstancesCalled) {
            detector.captureAntiPattern({
              id: `missing-callback-${Date.now()}`,
              type: 'MISSING_CALLBACK',
              timestamp: new Date().toISOString(),
              severity: 'HIGH',
              location: 'ClaudeInstanceManager.tsx:180',
              description: 'Instance creation succeeded but fetchInstances() not called',
              fix: 'Add await fetchInstances(); after successful instance creation',
              confidence: 0.92
            });
          }
        }, 3000);

        // Monitor subsequent GET requests
        window.fetch = async function(input2: any, init2?: any) {
          const url2 = typeof input2 === 'string' ? input2 : input2.toString();
          if (url2.includes('/api/claude/instances') && (!init2 || init2.method === 'GET')) {
            fetchInstancesCalled = true;
            clearTimeout(timeout);
            console.log('✅ NLD: fetchInstances() callback detected');
          }
          return originalFetch2(input2, init2);
        };
        
        return response;
      }

      // Monitor terminal input calls
      if (url.includes('/terminal/input')) {
        console.log('🔍 NLD: Monitoring terminal input call');
        
        const response = await originalFetch(input, init);
        
        // Check if SSE stream receives echo within 2 seconds
        let echoReceived = false;
        const timeout = setTimeout(() => {
          if (!echoReceived) {
            detector.captureAntiPattern({
              id: `input-echo-failure-${Date.now()}`,
              type: 'INPUT_ECHO_FAILURE', 
              timestamp: new Date().toISOString(),
              severity: 'HIGH',
              location: 'simple-backend.js:315-329',
              description: 'Terminal input sent but no echo received in SSE stream',
              fix: 'Add SSE broadcast in terminal input handler',
              confidence: 0.87
            });
          }
        }, 2000);

        // Monitor for SSE events (simplified check)
        if (detector.windowRef && detector.windowRef.addEventListener) {
          const echoHandler = (event: any) => {
            if (event.detail && event.detail.type === 'terminal:output') {
              echoReceived = true;
              clearTimeout(timeout);
              console.log('✅ NLD: Terminal echo detected');
              detector.windowRef!.removeEventListener('nld:terminal-output', echoHandler);
            }
          };
          detector.windowRef.addEventListener('nld:terminal-output', echoHandler);
        }
        
        return response;
      }

      return originalFetch(input, init);
    };
  }

  /**
   * Monitor React State Updates for Isolation Patterns
   */
  private monitorReactStateUpdates() {
    // Hook into React DevTools if available
    if (this.windowRef && (this.windowRef as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('🔍 NLD: React DevTools hook detected, monitoring state updates');
      
      const hook = (this.windowRef as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      // Monitor fiber commits for state isolation
      if (hook.onCommitFiberRoot) {
        const originalCommit = hook.onCommitFiberRoot;
        hook.onCommitFiberRoot = (id: any, root: any, ...args: any[]) => {
          this.analyzeComponentUpdates(root);
          return originalCommit(id, root, ...args);
        };
      }
    }
  }

  /**
   * Monitor WebSocket/SSE Communication Patterns
   */
  private monitorCommunicationPatterns() {
    // Monitor WebSocket events if present
    if (this.windowRef && this.windowRef.WebSocket) {
      const OriginalWebSocket = this.windowRef.WebSocket;
      const detector = this;
      
      this.windowRef.WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          
          this.addEventListener('message', (event) => {
            detector.analyzeWebSocketMessage(event);
          });
        }
      };
    }

    // Monitor EventSource (SSE) if present
    if (this.windowRef && this.windowRef.EventSource) {
      const OriginalEventSource = this.windowRef.EventSource;
      const detector = this;
      
      this.windowRef.EventSource = class extends OriginalEventSource {
        constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
          super(url, eventSourceInitDict);
          
          this.addEventListener('message', (event) => {
            detector.analyzeSSEMessage(event);
          });
        }
      };
    }
  }

  /**
   * Analyze Component Updates for State Isolation
   */
  private analyzeComponentUpdates(root: any) {
    // Simplified React fiber analysis
    try {
      if (root && root.current) {
        const fiber = root.current;
        this.traverseFiber(fiber);
      }
    } catch (error) {
      console.warn('NLD: React fiber analysis error:', error);
    }
  }

  private traverseFiber(fiber: any) {
    if (!fiber) return;

    // Check for ClaudeInstanceManager component
    if (fiber.type && fiber.type.name === 'ClaudeInstanceManager') {
      const state = fiber.memoizedState;
      if (state && state.instances !== state.lastInstances) {
        console.log('🔍 NLD: Instance state change detected');
        // Check if UI actually updated
        setTimeout(() => {
          this.checkUIUpdatePropagation();
        }, 100);
      }
    }

    // Traverse children
    if (fiber.child) this.traverseFiber(fiber.child);
    if (fiber.sibling) this.traverseFiber(fiber.sibling);
  }

  /**
   * Analyze WebSocket Messages for Echo Patterns
   */
  private analyzeWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'terminal:output') {
        // Dispatch custom event for echo detection
        this.windowRef?.dispatchEvent(new CustomEvent('nld:terminal-output', { detail: data }));
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  /**
   * Analyze SSE Messages for Echo Patterns  
   */
  private analyzeSSEMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        // Dispatch custom event for echo detection
        this.windowRef?.dispatchEvent(new CustomEvent('nld:terminal-output', { detail: data }));
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  /**
   * Check if UI Updates Propagated Correctly
   */
  private checkUIUpdatePropagation() {
    const instancesListElements = document.querySelectorAll('.instances-list .instance-item');
    const createButtons = document.querySelectorAll('.launch-buttons button');
    
    if (instancesListElements.length === 0 && createButtons.length > 0) {
      this.captureAntiPattern({
        id: `state-isolation-${Date.now()}`,
        type: 'STATE_ISOLATION',
        timestamp: new Date().toISOString(), 
        severity: 'MEDIUM',
        location: 'ClaudeInstanceManager.tsx component state',
        description: 'Instance creation buttons active but no instances in list',
        fix: 'Check state propagation between creation and list components',
        confidence: 0.75
      });
    }
  }

  /**
   * Start Periodic Analysis
   */
  private startPeriodicAnalysis() {
    setInterval(() => {
      this.runPeriodicChecks();
    }, 10000); // Every 10 seconds
  }

  private runPeriodicChecks() {
    // Check for stale data patterns
    this.detectStaleDataPatterns();
    
    // Generate analysis summary
    if (this.detections.length > 0) {
      console.log('📊 NLD Detection Summary:', this.getDetectionSummary());
    }
  }

  /**
   * Detect Stale Data Patterns
   */
  private detectStaleDataPatterns() {
    const instanceElements = document.querySelectorAll('.instance-item');
    const outputElements = document.querySelectorAll('.output-area');
    
    instanceElements.forEach((element, index) => {
      const outputElement = outputElements[index];
      if (outputElement && outputElement.textContent?.includes('Connecting to instance')) {
        // Instance stuck in connecting state
        this.captureAntiPattern({
          id: `stale-connection-${Date.now()}-${index}`,
          type: 'STATE_ISOLATION',
          timestamp: new Date().toISOString(),
          severity: 'MEDIUM',
          location: `Instance connection state`,
          description: 'Instance stuck in "Connecting" state',
          fix: 'Check SSE connection establishment logic',
          confidence: 0.68
        });
      }
    });
  }

  /**
   * Capture Anti-Pattern Detection
   */
  captureAntiPattern(detection: AntiPatternDetection) {
    this.detections.push(detection);
    
    console.warn(`🚨 NLD ANTI-PATTERN DETECTED: ${detection.type}`, detection);
    
    // Emit event for external monitoring
    if (this.windowRef) {
      this.windowRef.dispatchEvent(new CustomEvent('nld:anti-pattern', { detail: detection }));
    }
    
    // Store in localStorage for persistence
    try {
      const stored = JSON.parse(localStorage.getItem('nld-detections') || '[]');
      stored.push(detection);
      localStorage.setItem('nld-detections', JSON.stringify(stored.slice(-50))); // Keep last 50
    } catch (error) {
      console.warn('NLD: Storage error:', error);
    }
  }

  /**
   * Get Detection Summary
   */
  getDetectionSummary() {
    return {
      total: this.detections.length,
      high: this.detections.filter(d => d.severity === 'HIGH').length,
      critical: this.detections.filter(d => d.severity === 'CRITICAL').length,
      recent: this.detections.slice(-5),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Setup Global Monitoring Interface
   */
  private setupGlobalMonitoring() {
    if (this.windowRef) {
      (this.windowRef as any).nldDetector = this;
    }
  }

  /**
   * Stop Monitoring
   */
  stop() {
    this.isMonitoring = false;
    this.detections = [];
    console.log('🛑 NLD Anti-Pattern Detection System stopped');
  }
}

// Global instance
export const nldAntiPatternDetector = new NLDAntiPatternDetector();

// Auto-deploy in development
if (process.env.NODE_ENV === 'development') {
  nldAntiPatternDetector.deploy();
}