/**
 * Enhanced Connection Manager with NLD Pattern Prevention
 * Comprehensive solution for WebSocket to SSE migration failure prevention
 */

import { sseFailurePreventionEngine, SSEConnectionMetrics } from './sse-failure-prevention';
import { mcp__claude_flow__neural_patterns, mcp__claude_flow__memory_usage } from '../utils/mcp-tools';

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'circuit_open';
  lastConnected?: number;
  lastError?: string;
  reconnectAttempts: number;
  connectionId: string;
  transport: 'websocket' | 'sse' | 'polling';
}

export interface ConnectionConfig {
  url: string;
  preferredTransport: 'auto' | 'websocket' | 'sse' | 'polling';
  fallbackOrder: Array<'websocket' | 'sse' | 'polling'>;
  healthCheckInterval: number;
  maxReconnectAttempts: number;
  reconnectBackoffBase: number;
  reconnectBackoffMax: number;
  corsValidation: boolean;
  browserCompatibilityCheck: boolean;
}

export interface TransportCapabilities {
  websocket: boolean;
  sse: boolean;
  polling: boolean;
  corsSupport: boolean;
  browser: string;
  browserVersion: string;
}

export class EnhancedConnectionManager {
  private state: ConnectionState;
  private config: ConnectionConfig;
  private capabilities: TransportCapabilities;
  private activeConnection: any = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventListeners = new Map<string, Set<Function>>();
  private performanceMetrics = {
    connectionLatency: 0,
    dataTransferRate: 0,
    errorRate: 0,
    reconnectionRate: 0
  };

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      url: config.url || 'ws://localhost:3000',
      preferredTransport: config.preferredTransport || 'auto',
      fallbackOrder: config.fallbackOrder || ['websocket', 'sse', 'polling'],
      healthCheckInterval: config.healthCheckInterval || 30000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectBackoffBase: config.reconnectBackoffBase || 1000,
      reconnectBackoffMax: config.reconnectBackoffMax || 30000,
      corsValidation: config.corsValidation || true,
      browserCompatibilityCheck: config.browserCompatibilityCheck || true
    };

    this.state = {
      status: 'disconnected',
      reconnectAttempts: 0,
      connectionId: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transport: 'websocket'
    };

    this.capabilities = this.detectBrowserCapabilities();
    this.initializeNLDPatterns();
  }

  /**
   * Detect browser capabilities for transport selection
   */
  private detectBrowserCapabilities(): TransportCapabilities {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    return {
      websocket: typeof WebSocket !== 'undefined',
      sse: typeof EventSource !== 'undefined',
      polling: true, // Always available
      corsSupport: this.detectCORSSupport(),
      browser: this.detectBrowser(userAgent),
      browserVersion: this.detectBrowserVersion(userAgent)
    };
  }

  /**
   * Detect CORS support
   */
  private detectCORSSupport(): boolean {
    // Check if XMLHttpRequest supports CORS
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
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Detect browser version
   */
  private detectBrowserVersion(userAgent: string): string {
    const matches = userAgent.match(/(?:chrome|firefox|safari|edge)\/(\d+)/i);
    return matches ? matches[1] : '0';
  }

  /**
   * Initialize NLD patterns for this connection type
   */
  private async initializeNLDPatterns(): Promise<void> {
    await mcp__claude_flow__neural_patterns({
      action: 'analyze',
      operation: 'connection_initialization',
      metadata: {
        capabilities: this.capabilities,
        config: this.config
      }
    });
  }

  /**
   * Connect with intelligent transport selection and failure prevention
   */
  public async connect(): Promise<void> {
    console.log('🚀 [NLD-Enhanced] Starting intelligent connection...');
    
    // Update state
    this.state.status = 'connecting';
    this.emit('stateChange', this.state);

    // Select optimal transport
    const transport = this.selectOptimalTransport();
    console.log(`🎯 [NLD-Enhanced] Selected transport: ${transport}`);

    try {
      // Perform pre-connection validations
      await this.performPreConnectionValidations();

      // Attempt connection with selected transport
      await this.connectWithTransport(transport);

      // Start health monitoring
      this.startHealthMonitoring();

      console.log('✅ [NLD-Enhanced] Connection established successfully');
    } catch (error) {
      console.error('❌ [NLD-Enhanced] Connection failed:', error);
      await this.handleConnectionFailure(error as Error);
    }
  }

  /**
   * Select optimal transport based on capabilities and NLD patterns
   */
  private selectOptimalTransport(): 'websocket' | 'sse' | 'polling' {
    if (this.config.preferredTransport !== 'auto') {
      return this.config.preferredTransport as 'websocket' | 'sse' | 'polling';
    }

    // Intelligent transport selection based on NLD patterns
    const browserScore = this.calculateBrowserCompatibilityScore();
    const networkScore = this.calculateNetworkScore();
    const reliabilityScore = this.calculateReliabilityScore();

    console.log('📊 [NLD-Enhanced] Transport scores:', {
      browser: browserScore,
      network: networkScore,
      reliability: reliabilityScore
    });

    // WebSocket has highest performance but can have connectivity issues
    if (this.capabilities.websocket && browserScore > 0.8 && networkScore > 0.7) {
      return 'websocket';
    }

    // SSE is more reliable through proxies and firewalls
    if (this.capabilities.sse && reliabilityScore > 0.6) {
      return 'sse';
    }

    // Polling as fallback
    return 'polling';
  }

  /**
   * Calculate browser compatibility score for transport selection
   */
  private calculateBrowserCompatibilityScore(): number {
    let score = 0;

    // Modern browsers get higher scores
    if (['Chrome', 'Firefox', 'Edge'].includes(this.capabilities.browser)) {
      score += 0.5;
    }

    // Recent versions get higher scores
    const version = parseInt(this.capabilities.browserVersion);
    if (version > 90) score += 0.3;
    else if (version > 70) score += 0.2;
    else if (version > 50) score += 0.1;

    // CORS support
    if (this.capabilities.corsSupport) score += 0.2;

    return Math.min(score, 1);
  }

  /**
   * Calculate network score based on historical performance
   */
  private calculateNetworkScore(): number {
    // Base score
    let score = 0.5;

    // Adjust based on historical connection success rate
    if (this.performanceMetrics.errorRate < 0.1) score += 0.3;
    else if (this.performanceMetrics.errorRate < 0.2) score += 0.1;
    else score -= 0.2;

    // Adjust based on latency
    if (this.performanceMetrics.connectionLatency < 1000) score += 0.2;
    else if (this.performanceMetrics.connectionLatency < 3000) score += 0.1;
    else score -= 0.1;

    return Math.max(Math.min(score, 1), 0);
  }

  /**
   * Calculate reliability score based on reconnection patterns
   */
  private calculateReliabilityScore(): number {
    let score = 0.7; // Base reliability

    // Penalize high reconnection rates
    if (this.performanceMetrics.reconnectionRate > 0.2) score -= 0.3;
    else if (this.performanceMetrics.reconnectionRate > 0.1) score -= 0.1;

    // Reward stable connections
    if (this.state.lastConnected && Date.now() - this.state.lastConnected > 300000) {
      score += 0.2; // 5+ minutes stable
    }

    return Math.max(Math.min(score, 1), 0);
  }

  /**
   * Perform pre-connection validations to prevent known failures
   */
  private async performPreConnectionValidations(): Promise<void> {
    console.log('🔍 [NLD-Enhanced] Performing pre-connection validations...');

    // CORS validation
    if (this.config.corsValidation) {
      await this.validateCORS();
    }

    // Browser compatibility check
    if (this.config.browserCompatibilityCheck) {
      this.validateBrowserCompatibility();
    }

    // Network connectivity check
    await this.validateNetworkConnectivity();
  }

  /**
   * Validate CORS configuration
   */
  private async validateCORS(): Promise<void> {
    try {
      const url = this.config.url.replace(/^ws/, 'http').replace(/^wss/, 'https');
      const response = await fetch(url, {
        method: 'OPTIONS',
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`CORS preflight failed: ${response.status}`);
      }

      console.log('✅ [NLD-Enhanced] CORS validation passed');
    } catch (error) {
      console.warn('⚠️ [NLD-Enhanced] CORS validation failed:', error);
      // Don't throw - this might be expected for some configurations
    }
  }

  /**
   * Validate browser compatibility
   */
  private validateBrowserCompatibility(): void {
    if (this.capabilities.browser === 'Unknown') {
      console.warn('⚠️ [NLD-Enhanced] Unknown browser detected - compatibility uncertain');
    }

    const version = parseInt(this.capabilities.browserVersion);
    if (version < 50) {
      console.warn('⚠️ [NLD-Enhanced] Old browser version detected - some features may not work');
    }

    console.log('✅ [NLD-Enhanced] Browser compatibility validated');
  }

  /**
   * Validate network connectivity
   */
  private async validateNetworkConnectivity(): Promise<void> {
    try {
      const startTime = Date.now();
      await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 5000
      });
      const latency = Date.now() - startTime;

      this.performanceMetrics.connectionLatency = latency;
      console.log(`✅ [NLD-Enhanced] Network connectivity validated (${latency}ms)`);
    } catch (error) {
      console.warn('⚠️ [NLD-Enhanced] Network connectivity validation failed:', error);
      throw new Error('Network connectivity check failed');
    }
  }

  /**
   * Connect using specific transport with NLD protection
   */
  private async connectWithTransport(transport: 'websocket' | 'sse' | 'polling'): Promise<void> {
    this.state.transport = transport;
    
    switch (transport) {
      case 'websocket':
        await this.connectWebSocket();
        break;
      case 'sse':
        await this.connectSSE();
        break;
      case 'polling':
        await this.connectPolling();
        break;
    }

    this.state.status = 'connected';
    this.state.lastConnected = Date.now();
    this.state.reconnectAttempts = 0;
    this.emit('stateChange', this.state);
  }

  /**
   * Connect via WebSocket with enhanced error handling
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.config.url);
        
        ws.onopen = () => {
          console.log('✅ [NLD-Enhanced] WebSocket connected');
          this.activeConnection = ws;
          resolve();
        };

        ws.onmessage = (event) => {
          this.handleMessage('websocket', event.data);
        };

        ws.onclose = (event) => {
          console.log('🔌 [NLD-Enhanced] WebSocket closed:', event.code, event.reason);
          this.handleConnectionClosure(event);
        };

        ws.onerror = (error) => {
          console.error('❌ [NLD-Enhanced] WebSocket error:', error);
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Connect via SSE with NLD protection
   */
  private async connectSSE(): Promise<void> {
    const sseUrl = this.config.url.replace(/^ws/, 'http').replace(/^wss/, 'https') + '/stream';
    
    try {
      const protectedSSE = sseFailurePreventionEngine.createProtectedSSEConnection(sseUrl, {
        connectionId: this.state.connectionId,
        healthCheck: true,
        corsValidation: this.config.corsValidation
      });

      await protectedSSE.connect();
      
      protectedSSE.addEventListener('message', (event: any) => {
        this.handleMessage('sse', event.data);
      });

      this.activeConnection = protectedSSE;
      console.log('✅ [NLD-Enhanced] SSE connected with protection');
    } catch (error) {
      console.error('❌ [NLD-Enhanced] SSE connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect via HTTP polling with intelligent intervals
   */
  private async connectPolling(): Promise<void> {
    const pollUrl = this.config.url.replace(/^ws/, 'http').replace(/^wss/, 'https') + '/poll';
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            'X-Connection-ID': this.state.connectionId
          }
        });

        if (response.ok) {
          const data = await response.text();
          if (data) {
            this.handleMessage('polling', data);
          }
        }
      } catch (error) {
        console.error('❌ [NLD-Enhanced] Polling error:', error);
        this.handleConnectionError(error as Error);
      }
    }, 2000);

    this.activeConnection = { pollInterval, type: 'polling' };
    console.log('✅ [NLD-Enhanced] Polling connected');
  }

  /**
   * Handle incoming messages with transport-agnostic processing
   */
  private handleMessage(transport: string, data: string): void {
    try {
      const message = JSON.parse(data);
      this.emit('message', { transport, ...message });
      
      // Update performance metrics
      this.performanceMetrics.dataTransferRate += data.length;
    } catch (error) {
      console.error('❌ [NLD-Enhanced] Message parsing error:', error);
      this.emit('parseError', { transport, data, error });
    }
  }

  /**
   * Handle connection closure with intelligent reconnection
   */
  private async handleConnectionClosure(event?: CloseEvent): Promise<void> {
    this.state.status = 'disconnected';
    this.emit('stateChange', this.state);

    // Determine if reconnection should be attempted
    if (this.shouldAttemptReconnection(event)) {
      await this.attemptReconnection();
    } else {
      this.state.status = 'failed';
      this.emit('stateChange', this.state);
    }
  }

  /**
   * Determine if reconnection should be attempted
   */
  private shouldAttemptReconnection(event?: CloseEvent): boolean {
    // Don't reconnect if manually disconnected
    if (event?.code === 1000) return false;

    // Don't reconnect if max attempts reached
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) return false;

    // Don't reconnect if circuit breaker is open
    if (this.state.status === 'circuit_open') return false;

    return true;
  }

  /**
   * Attempt intelligent reconnection with fallback
   */
  private async attemptReconnection(): Promise<void> {
    this.state.status = 'reconnecting';
    this.state.reconnectAttempts++;
    this.emit('stateChange', this.state);

    const delay = this.calculateReconnectionDelay();
    console.log(`🔄 [NLD-Enhanced] Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        // Try fallback transport if current one failed
        const transport = this.selectFallbackTransport();
        await this.connectWithTransport(transport);
      } catch (error) {
        console.error('❌ [NLD-Enhanced] Reconnection failed:', error);
        await this.handleConnectionClosure();
      }
    }, delay);
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateReconnectionDelay(): number {
    const baseDelay = this.config.reconnectBackoffBase;
    const exponentialDelay = baseDelay * Math.pow(2, this.state.reconnectAttempts - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.reconnectBackoffMax);
    
    // Add jitter (±25%)
    const jitter = cappedDelay * 0.25 * (Math.random() - 0.5) * 2;
    return Math.max(cappedDelay + jitter, baseDelay);
  }

  /**
   * Select fallback transport for reconnection
   */
  private selectFallbackTransport(): 'websocket' | 'sse' | 'polling' {
    const currentIndex = this.config.fallbackOrder.indexOf(this.state.transport);
    const nextIndex = (currentIndex + 1) % this.config.fallbackOrder.length;
    return this.config.fallbackOrder[nextIndex];
  }

  /**
   * Handle connection failures with NLD pattern logging
   */
  private async handleConnectionFailure(error: Error): Promise<void> {
    this.state.status = 'failed';
    this.state.lastError = error.message;
    this.performanceMetrics.errorRate += 0.1; // Increment error rate
    
    // Log failure pattern for neural learning
    await mcp__claude_flow__neural_patterns({
      action: 'learn',
      operation: 'connection_failure',
      outcome: JSON.stringify({
        transport: this.state.transport,
        error: error.message,
        capabilities: this.capabilities,
        config: this.config
      })
    });

    this.emit('error', error);
    this.emit('stateChange', this.state);

    // Attempt with different transport if available
    if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
      await this.attemptReconnection();
    }
  }

  /**
   * Handle connection errors during operation
   */
  private async handleConnectionError(error: Error): Promise<void> {
    console.error('🚨 [NLD-Enhanced] Connection error during operation:', error);
    await this.handleConnectionFailure(error);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isConnected()) return;

    try {
      // Send ping based on transport type
      switch (this.state.transport) {
        case 'websocket':
          if (this.activeConnection?.readyState === WebSocket.OPEN) {
            this.activeConnection.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
          break;
        case 'sse':
          // SSE is unidirectional, check if connection is still active
          if (this.activeConnection?.readyState !== EventSource.OPEN) {
            throw new Error('SSE connection lost');
          }
          break;
        case 'polling':
          // Health check through polling endpoint
          const response = await fetch(this.config.url.replace(/^ws/, 'http').replace(/^wss/, 'https') + '/health');
          if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
          }
          break;
      }
    } catch (error) {
      console.error('💔 [NLD-Enhanced] Health check failed:', error);
      await this.handleConnectionError(error as Error);
    }
  }

  /**
   * Event emitter functionality
   */
  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  public off(event: string, listener?: Function): void {
    if (listener) {
      this.eventListeners.get(event)?.delete(listener);
    } else {
      this.eventListeners.delete(event);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('❌ [NLD-Enhanced] Event listener error:', error);
        }
      });
    }
  }

  /**
   * Send message through active connection
   */
  public send(data: any): void {
    if (!this.isConnected()) {
      console.warn('⚠️ [NLD-Enhanced] Cannot send - not connected');
      return;
    }

    try {
      const message = JSON.stringify(data);
      
      switch (this.state.transport) {
        case 'websocket':
          this.activeConnection.send(message);
          break;
        case 'polling':
          // Send via POST request for polling transport
          fetch(this.config.url.replace(/^ws/, 'http').replace(/^wss/, 'https') + '/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Connection-ID': this.state.connectionId
            },
            body: message
          });
          break;
        default:
          console.warn('⚠️ [NLD-Enhanced] Send not supported for transport:', this.state.transport);
      }
    } catch (error) {
      console.error('❌ [NLD-Enhanced] Send error:', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Check if connection is active
   */
  public isConnected(): boolean {
    return this.state.status === 'connected';
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): any {
    return { ...this.performanceMetrics };
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    console.log('🔌 [NLD-Enhanced] Disconnecting...');
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Close active connection
    if (this.activeConnection) {
      switch (this.state.transport) {
        case 'websocket':
          this.activeConnection.close(1000, 'Client disconnect');
          break;
        case 'sse':
          this.activeConnection.close();
          break;
        case 'polling':
          if (this.activeConnection.pollInterval) {
            clearInterval(this.activeConnection.pollInterval);
          }
          break;
      }
      this.activeConnection = null;
    }

    // Update state
    this.state.status = 'disconnected';
    this.emit('stateChange', this.state);

    // Clear event listeners
    this.eventListeners.clear();

    console.log('✅ [NLD-Enhanced] Disconnected and cleaned up');
  }
}

// Export singleton instance
export const enhancedConnectionManager = new EnhancedConnectionManager();