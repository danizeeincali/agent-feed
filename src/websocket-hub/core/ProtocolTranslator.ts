/**
 * Protocol Translator - WebSocket ↔ Webhook conversion for solving protocol mismatch
 * Enables seamless communication between WebSocket clients and webhook-based services
 */

import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';
import fetch from 'node-fetch';

export interface ProtocolTranslatorConfig {
  enableWebhookTranslation: boolean;
  enableSSETranslation: boolean;
  maxPayloadSize: number;
  compressionEnabled: boolean;
  retryAttempts: number;
  retryDelay: number;
  webhookTimeout: number;
  enableMetrics: boolean;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  headers?: Record<string, string>;
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key';
    credentials: string;
  };
  retryPolicy?: {
    attempts: number;
    delay: number;
    backoffMultiplier: number;
  };
  metadata: {
    registeredAt: Date;
    lastUsed: Date;
    successCount: number;
    errorCount: number;
  };
}

export interface TranslationContext {
  sourceProtocol: 'websocket' | 'webhook' | 'sse';
  targetProtocol: 'websocket' | 'webhook' | 'sse';
  payload: any;
  metadata: {
    sourceClient?: string;
    targetEndpoint?: string;
    timestamp: Date;
    translationId: string;
  };
}

export interface TranslationResult {
  success: boolean;
  translatedPayload?: any;
  error?: string;
  metadata: {
    translationId: string;
    duration: number;
    retries: number;
    compressionUsed: boolean;
  };
}

export interface TranslatorMetrics {
  totalTranslations: number;
  successfulTranslations: number;
  failedTranslations: number;
  averageTranslationTime: number;
  translationsByType: Map<string, number>;
  webhookEndpointHealth: Map<string, { success: number; errors: number; avgResponseTime: number }>;
}

export class ProtocolTranslator extends EventEmitter {
  private config: ProtocolTranslatorConfig;
  private webhookEndpoints: Map<string, WebhookEndpoint> = new Map();
  private translationQueue: Map<string, TranslationContext[]> = new Map(); // endpoint -> contexts
  private metrics: TranslatorMetrics;
  private processingQueue: boolean = false;

  constructor(config: ProtocolTranslatorConfig) {
    super();
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      webhookTimeout: 10000,
      enableMetrics: true,
      ...config
    };
    this.initializeMetrics();
    this.startQueueProcessor();
  }

  /**
   * Initialize translator metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalTranslations: 0,
      successfulTranslations: 0,
      failedTranslations: 0,
      averageTranslationTime: 0,
      translationsByType: new Map(),
      webhookEndpointHealth: new Map()
    };
  }

  /**
   * Register a webhook endpoint for protocol translation
   */
  async registerWebhookEndpoint(
    id: string,
    url: string,
    options?: {
      headers?: Record<string, string>;
      authentication?: WebhookEndpoint['authentication'];
      retryPolicy?: WebhookEndpoint['retryPolicy'];
    }
  ): Promise<void> {
    const endpoint: WebhookEndpoint = {
      id,
      url,
      headers: options?.headers,
      authentication: options?.authentication,
      retryPolicy: options?.retryPolicy || {
        attempts: this.config.retryAttempts,
        delay: this.config.retryDelay,
        backoffMultiplier: 1.5
      },
      metadata: {
        registeredAt: new Date(),
        lastUsed: new Date(0),
        successCount: 0,
        errorCount: 0
      }
    };

    this.webhookEndpoints.set(id, endpoint);
    this.translationQueue.set(id, []);

    // Initialize health metrics
    this.metrics.webhookEndpointHealth.set(id, {
      success: 0,
      errors: 0,
      avgResponseTime: 0
    });

    logger.info('Webhook endpoint registered', {
      id,
      url,
      hasAuth: !!options?.authentication
    });

    this.emit('webhookEndpointRegistered', { id, url });

    // Perform initial health check
    await this.performWebhookHealthCheck(id);
  }

  /**
   * Unregister webhook endpoint
   */
  unregisterWebhookEndpoint(id: string): void {
    this.webhookEndpoints.delete(id);
    this.translationQueue.delete(id);
    this.metrics.webhookEndpointHealth.delete(id);
    
    logger.info('Webhook endpoint unregistered', { id });
    this.emit('webhookEndpointUnregistered', { id });
  }

  /**
   * Translate message between protocols
   */
  async translate(
    payload: any,
    sourceProtocol: 'websocket' | 'webhook' | 'sse',
    targetProtocol: 'websocket' | 'webhook' | 'sse',
    options?: {
      targetEndpoint?: string;
      sourceClient?: string;
      priority?: 'low' | 'medium' | 'high';
      timeout?: number;
    }
  ): Promise<any> {
    const startTime = Date.now();
    const translationId = this.generateTranslationId();
    
    const context: TranslationContext = {
      sourceProtocol,
      targetProtocol,
      payload,
      metadata: {
        sourceClient: options?.sourceClient,
        targetEndpoint: options?.targetEndpoint,
        timestamp: new Date(),
        translationId
      }
    };

    this.metrics.totalTranslations++;
    this.updateTranslationTypeMetrics(`${sourceProtocol}->${targetProtocol}`);

    try {
      let result: TranslationResult;

      // Route to appropriate translation method
      if (sourceProtocol === 'websocket' && targetProtocol === 'webhook') {
        result = await this.translateWebSocketToWebhook(context, options);
      } else if (sourceProtocol === 'webhook' && targetProtocol === 'websocket') {
        result = await this.translateWebhookToWebSocket(context);
      } else if (sourceProtocol === 'websocket' && targetProtocol === 'sse') {
        result = await this.translateWebSocketToSSE(context);
      } else if (sourceProtocol === 'sse' && targetProtocol === 'websocket') {
        result = await this.translateSSEToWebSocket(context);
      } else {
        // Direct pass-through for same protocols
        result = {
          success: true,
          translatedPayload: payload,
          metadata: {
            translationId,
            duration: Date.now() - startTime,
            retries: 0,
            compressionUsed: false
          }
        };
      }

      if (result.success) {
        this.metrics.successfulTranslations++;
        this.emit('protocolTranslated', {
          translationId,
          sourceProtocol,
          targetProtocol,
          duration: result.metadata.duration,
          success: true
        });
        return result.translatedPayload;
      } else {
        throw new Error(result.error || 'Translation failed');
      }

    } catch (error) {
      this.metrics.failedTranslations++;
      const duration = Date.now() - startTime;
      
      logger.error('Protocol translation failed', {
        translationId,
        sourceProtocol,
        targetProtocol,
        error: error.message,
        duration
      });

      this.emit('translationError', {
        translationId,
        sourceProtocol,
        targetProtocol,
        error: error.message,
        duration
      });

      throw error;
    }
  }

  /**
   * Translate WebSocket message to webhook
   */
  private async translateWebSocketToWebhook(
    context: TranslationContext,
    options?: { targetEndpoint?: string; timeout?: number }
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const translationId = context.metadata.translationId;

    if (!this.config.enableWebhookTranslation) {
      throw new Error('Webhook translation is disabled');
    }

    // Determine target endpoint
    const endpointId = options?.targetEndpoint;
    if (!endpointId) {
      throw new Error('Target webhook endpoint not specified');
    }

    const endpoint = this.webhookEndpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Webhook endpoint ${endpointId} not found`);
    }

    // Prepare webhook payload
    const webhookPayload = this.formatWebSocketPayloadForWebhook(context.payload);
    
    // Add to queue for processing
    if (options?.timeout || webhookPayload.size > 1024) {
      // Process immediately for small messages or when timeout specified
      return await this.sendWebhookRequest(endpoint, webhookPayload, translationId);
    } else {
      // Queue for batch processing
      this.translationQueue.get(endpointId)!.push(context);
      
      return {
        success: true,
        translatedPayload: webhookPayload,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: this.config.compressionEnabled
        }
      };
    }
  }

  /**
   * Translate webhook message to WebSocket
   */
  private async translateWebhookToWebSocket(
    context: TranslationContext
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const translationId = context.metadata.translationId;

    try {
      // Format webhook payload for WebSocket
      const wsPayload = this.formatWebhookPayloadForWebSocket(context.payload);

      return {
        success: true,
        translatedPayload: wsPayload,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Webhook to WebSocket translation failed: ${error.message}`,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: false
        }
      };
    }
  }

  /**
   * Translate WebSocket message to SSE
   */
  private async translateWebSocketToSSE(
    context: TranslationContext
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const translationId = context.metadata.translationId;

    if (!this.config.enableSSETranslation) {
      throw new Error('SSE translation is disabled');
    }

    try {
      // Format for SSE
      const ssePayload = this.formatWebSocketPayloadForSSE(context.payload);

      return {
        success: true,
        translatedPayload: ssePayload,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `WebSocket to SSE translation failed: ${error.message}`,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: false
        }
      };
    }
  }

  /**
   * Translate SSE message to WebSocket
   */
  private async translateSSEToWebSocket(
    context: TranslationContext
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const translationId = context.metadata.translationId;

    try {
      // Parse SSE format and convert to WebSocket
      const wsPayload = this.formatSSEPayloadForWebSocket(context.payload);

      return {
        success: true,
        translatedPayload: wsPayload,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `SSE to WebSocket translation failed: ${error.message}`,
        metadata: {
          translationId,
          duration: Date.now() - startTime,
          retries: 0,
          compressionUsed: false
        }
      };
    }
  }

  /**
   * Send webhook request with retry logic
   */
  private async sendWebhookRequest(
    endpoint: WebhookEndpoint,
    payload: any,
    translationId: string
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let retries = 0;

    const maxRetries = endpoint.retryPolicy?.attempts || this.config.retryAttempts;
    const baseDelay = endpoint.retryPolicy?.delay || this.config.retryDelay;
    const backoffMultiplier = endpoint.retryPolicy?.backoffMultiplier || 1.5;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Translation-Id': translationId,
          'X-Source-Protocol': 'websocket',
          ...endpoint.headers
        };

        // Add authentication
        if (endpoint.authentication) {
          switch (endpoint.authentication.type) {
            case 'bearer':
              requestHeaders['Authorization'] = `Bearer ${endpoint.authentication.credentials}`;
              break;
            case 'basic':
              requestHeaders['Authorization'] = `Basic ${endpoint.authentication.credentials}`;
              break;
            case 'api-key':
              requestHeaders['X-API-Key'] = endpoint.authentication.credentials;
              break;
          }
        }

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
          timeout: this.config.webhookTimeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const duration = Date.now() - startTime;

        // Update endpoint metrics
        endpoint.metadata.lastUsed = new Date();
        endpoint.metadata.successCount++;
        this.updateWebhookHealth(endpoint.id, true, duration);

        return {
          success: true,
          translatedPayload: responseData,
          metadata: {
            translationId,
            duration,
            retries,
            compressionUsed: this.config.compressionEnabled
          }
        };

      } catch (error) {
        lastError = error as Error;
        retries++;

        // Update error metrics
        endpoint.metadata.errorCount++;
        this.updateWebhookHealth(endpoint.id, false, Date.now() - startTime);

        logger.warn('Webhook request failed', {
          endpointId: endpoint.id,
          url: endpoint.url,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: lastError.message
        });

        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: `Webhook request failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      metadata: {
        translationId,
        duration: Date.now() - startTime,
        retries,
        compressionUsed: this.config.compressionEnabled
      }
    };
  }

  /**
   * Format WebSocket payload for webhook
   */
  private formatWebSocketPayloadForWebhook(wsPayload: any): any {
    // WebSocket messages typically have { type, data } structure
    // Convert to webhook-friendly format
    return {
      event: wsPayload.type || 'message',
      data: wsPayload.data || wsPayload,
      timestamp: new Date().toISOString(),
      source: 'websocket',
      metadata: {
        originalFormat: 'websocket',
        translatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Format webhook payload for WebSocket
   */
  private formatWebhookPayloadForWebSocket(webhookPayload: any): any {
    // Webhook payloads are typically plain objects
    // Convert to WebSocket message format
    if (webhookPayload.event && webhookPayload.data) {
      // Already in event format
      return {
        type: webhookPayload.event,
        data: webhookPayload.data,
        timestamp: new Date().toISOString()
      };
    } else {
      // Plain payload
      return {
        type: 'webhook_message',
        data: webhookPayload,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Format WebSocket payload for SSE
   */
  private formatWebSocketPayloadForSSE(wsPayload: any): string {
    const eventType = wsPayload.type || 'message';
    const eventData = JSON.stringify(wsPayload.data || wsPayload);
    const eventId = Date.now().toString();

    return `id: ${eventId}\nevent: ${eventType}\ndata: ${eventData}\n\n`;
  }

  /**
   * Format SSE payload for WebSocket
   */
  private formatSSEPayloadForWebSocket(ssePayload: string): any {
    // Parse SSE format
    const lines = ssePayload.split('\n');
    let eventType = 'message';
    let eventData = '';
    let eventId = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.substring(7);
      } else if (line.startsWith('data: ')) {
        eventData += line.substring(6);
      } else if (line.startsWith('id: ')) {
        eventId = line.substring(4);
      }
    }

    try {
      const parsedData = JSON.parse(eventData);
      return {
        type: eventType,
        data: parsedData,
        id: eventId,
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        type: eventType,
        data: eventData,
        id: eventId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Start queue processor for batch webhook requests
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue) {
        this.processTranslationQueues();
      }
    }, 1000); // Process every second
  }

  /**
   * Process translation queues
   */
  private async processTranslationQueues(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      for (const [endpointId, queue] of this.translationQueue.entries()) {
        if (queue.length === 0) continue;

        const endpoint = this.webhookEndpoints.get(endpointId);
        if (!endpoint) continue;

        // Process queued translations
        const batch = queue.splice(0, 10); // Process up to 10 at a time
        
        for (const context of batch) {
          try {
            const webhookPayload = this.formatWebSocketPayloadForWebhook(context.payload);
            await this.sendWebhookRequest(endpoint, webhookPayload, context.metadata.translationId);
          } catch (error) {
            logger.error('Queued translation failed', {
              endpointId,
              translationId: context.metadata.translationId,
              error: error.message
            });
          }
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Perform webhook health check
   */
  private async performWebhookHealthCheck(endpointId: string): Promise<void> {
    const endpoint = this.webhookEndpoints.get(endpointId);
    if (!endpoint) return;

    try {
      const healthPayload = {
        type: 'health_check',
        timestamp: new Date().toISOString(),
        source: 'websocket_hub'
      };

      const startTime = Date.now();
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Health-Check': 'true',
          ...endpoint.headers
        },
        body: JSON.stringify(healthPayload),
        timeout: 5000 // 5 second timeout for health checks
      });

      const duration = Date.now() - startTime;
      const isHealthy = response.ok;

      this.updateWebhookHealth(endpointId, isHealthy, duration);

      logger.debug('Webhook health check completed', {
        endpointId,
        url: endpoint.url,
        healthy: isHealthy,
        responseTime: duration
      });

      this.emit('webhookHealthChecked', {
        endpointId,
        healthy: isHealthy,
        responseTime: duration
      });

    } catch (error) {
      this.updateWebhookHealth(endpointId, false, 0);
      
      logger.warn('Webhook health check failed', {
        endpointId,
        url: endpoint.url,
        error: error.message
      });
    }
  }

  /**
   * Update webhook endpoint health metrics
   */
  private updateWebhookHealth(
    endpointId: string,
    success: boolean,
    responseTime: number
  ): void {
    const health = this.metrics.webhookEndpointHealth.get(endpointId);
    if (health) {
      if (success) {
        health.success++;
        health.avgResponseTime = (health.avgResponseTime + responseTime) / 2;
      } else {
        health.errors++;
      }
    }
  }

  /**
   * Update translation type metrics
   */
  private updateTranslationTypeMetrics(translationType: string): void {
    const current = this.metrics.translationsByType.get(translationType) || 0;
    this.metrics.translationsByType.set(translationType, current + 1);
  }

  /**
   * Get translator metrics
   */
  getMetrics(): TranslatorMetrics {
    // Calculate average translation time
    if (this.metrics.totalTranslations > 0) {
      // This would be calculated from actual timing data in a production system
      this.metrics.averageTranslationTime = 150; // Placeholder
    }

    return { ...this.metrics };
  }

  /**
   * Get webhook endpoint health
   */
  getWebhookEndpointHealth(): Array<{
    id: string;
    url: string;
    isHealthy: boolean;
    successRate: number;
    avgResponseTime: number;
    totalRequests: number;
  }> {
    return Array.from(this.webhookEndpoints.entries()).map(([id, endpoint]) => {
      const health = this.metrics.webhookEndpointHealth.get(id)!;
      const totalRequests = health.success + health.errors;
      const successRate = totalRequests > 0 ? health.success / totalRequests : 0;

      return {
        id,
        url: endpoint.url,
        isHealthy: successRate > 0.95 && health.errors < 10,
        successRate,
        avgResponseTime: health.avgResponseTime,
        totalRequests
      };
    });
  }

  /**
   * Generate unique translation ID
   */
  private generateTranslationId(): string {
    return `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ProtocolTranslatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    // Process remaining queued translations
    await this.processTranslationQueues();

    this.webhookEndpoints.clear();
    this.translationQueue.clear();

    this.removeAllListeners();
    logger.info('Protocol translator shutdown completed');
  }
}