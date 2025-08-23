/**
 * Protocol Translator - WebSocket ↔ Webhook conversion for solving protocol mismatch
 * Enables seamless communication between WebSocket clients and webhook-based services
 */
import { EventEmitter } from 'events';
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
    webhookEndpointHealth: Map<string, {
        success: number;
        errors: number;
        avgResponseTime: number;
    }>;
}
export declare class ProtocolTranslator extends EventEmitter {
    private config;
    private webhookEndpoints;
    private translationQueue;
    private metrics;
    private processingQueue;
    constructor(config: ProtocolTranslatorConfig);
    /**
     * Initialize translator metrics
     */
    private initializeMetrics;
    /**
     * Register a webhook endpoint for protocol translation
     */
    registerWebhookEndpoint(id: string, url: string, options?: {
        headers?: Record<string, string>;
        authentication?: WebhookEndpoint['authentication'];
        retryPolicy?: WebhookEndpoint['retryPolicy'];
    }): Promise<void>;
    /**
     * Unregister webhook endpoint
     */
    unregisterWebhookEndpoint(id: string): void;
    /**
     * Translate message between protocols
     */
    translate(payload: any, sourceProtocol: 'websocket' | 'webhook' | 'sse', targetProtocol: 'websocket' | 'webhook' | 'sse', options?: {
        targetEndpoint?: string;
        sourceClient?: string;
        priority?: 'low' | 'medium' | 'high';
        timeout?: number;
    }): Promise<any>;
    /**
     * Translate WebSocket message to webhook
     */
    private translateWebSocketToWebhook;
    /**
     * Translate webhook message to WebSocket
     */
    private translateWebhookToWebSocket;
    /**
     * Translate WebSocket message to SSE
     */
    private translateWebSocketToSSE;
    /**
     * Translate SSE message to WebSocket
     */
    private translateSSEToWebSocket;
    /**
     * Send webhook request with retry logic
     */
    private sendWebhookRequest;
    /**
     * Format WebSocket payload for webhook
     */
    private formatWebSocketPayloadForWebhook;
    /**
     * Format webhook payload for WebSocket
     */
    private formatWebhookPayloadForWebSocket;
    /**
     * Format WebSocket payload for SSE
     */
    private formatWebSocketPayloadForSSE;
    /**
     * Format SSE payload for WebSocket
     */
    private formatSSEPayloadForWebSocket;
    /**
     * Start queue processor for batch webhook requests
     */
    private startQueueProcessor;
    /**
     * Process translation queues
     */
    private processTranslationQueues;
    /**
     * Perform webhook health check
     */
    private performWebhookHealthCheck;
    /**
     * Update webhook endpoint health metrics
     */
    private updateWebhookHealth;
    /**
     * Update translation type metrics
     */
    private updateTranslationTypeMetrics;
    /**
     * Get translator metrics
     */
    getMetrics(): TranslatorMetrics;
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
    }>;
    /**
     * Generate unique translation ID
     */
    private generateTranslationId;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ProtocolTranslatorConfig>): void;
    /**
     * Clean up resources
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ProtocolTranslator.d.ts.map