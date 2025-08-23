/**
 * Message Router - Intelligent message routing between WebSocket clients
 * Provides load balancing, routing strategies, and message delivery guarantees
 */
import { EventEmitter } from 'events';
export interface MessageRouterConfig {
    strategy: 'round-robin' | 'weighted' | 'session-affinity';
    enableLoadBalancing: boolean;
    maxRetries: number;
    enableMetrics: boolean;
    retryDelay: number;
    circuitBreakerThreshold: number;
}
export interface RoutingTarget {
    id: string;
    weight?: number;
    capabilities: string[];
    lastActivity: Date;
    messageCount: number;
    errorCount: number;
    responseTime: number;
}
export interface RouteMessage {
    id: string;
    payload: any;
    target?: string;
    channel?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    retries: number;
    timestamp: Date;
    metadata: {
        sourceClient: string;
        routingStrategy: string;
        attemptCount: number;
    };
}
export interface RoutingMetrics {
    totalMessages: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
    routingStrategies: Map<string, number>;
    circuitBreakerTrips: number;
}
export declare class MessageRouter extends EventEmitter {
    private config;
    private targets;
    private channels;
    private sessionAffinity;
    private roundRobinIndex;
    private circuitBreakers;
    private metrics;
    private messageQueue;
    private processingQueue;
    constructor(config: MessageRouterConfig);
    /**
     * Initialize routing metrics
     */
    private initializeMetrics;
    /**
     * Register a routing target (client)
     */
    registerTarget(targetId: string, capabilities: string[], weight?: number): void;
    /**
     * Unregister a routing target
     */
    unregisterTarget(targetId: string): void;
    /**
     * Subscribe target to a channel
     */
    subscribeTargetToChannel(targetId: string, channel: string): void;
    /**
     * Unsubscribe target from a channel
     */
    unsubscribeTargetFromChannel(targetId: string, channel: string): void;
    /**
     * Route message to a specific channel
     */
    routeToChannel(channel: string, payload: any, sourceClient: string, priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<void>;
    /**
     * Route message to a specific client
     */
    routeToClient(targetId: string, payload: any, sourceClient: string, priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<void>;
    /**
     * Route message using load balancing strategy
     */
    routeWithLoadBalancing(payload: any, sourceClient: string, capabilities?: string[], sessionId?: string, priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<string>;
    /**
     * Route message to specific target with retry logic
     */
    private routeMessageToTarget;
    /**
     * Get available targets based on capabilities
     */
    private getAvailableTargets;
    /**
     * Select target based on routing strategy
     */
    private selectTarget;
    /**
     * Select target using weighted round-robin
     */
    private selectWeightedTarget;
    /**
     * Start queue processor for handling message delivery
     */
    private startQueueProcessor;
    /**
     * Process message queues for all targets
     */
    private processMessageQueues;
    /**
     * Update routing strategy metrics
     */
    private updateRoutingStrategyMetrics;
    /**
     * Get routing metrics
     */
    getMetrics(): RoutingMetrics;
    /**
     * Get target health information
     */
    getTargetHealth(): Array<{
        id: string;
        isHealthy: boolean;
        messageCount: number;
        errorCount: number;
        errorRate: number;
        responseTime: number;
        circuitBreakerOpen: boolean;
    }>;
    /**
     * Update routing configuration
     */
    updateConfig(newConfig: Partial<MessageRouterConfig>): void;
    /**
     * Reset circuit breaker for a target
     */
    resetCircuitBreaker(targetId: string): void;
    /**
     * Generate unique message ID
     */
    private generateMessageId;
    /**
     * Clean up resources
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=MessageRouter.d.ts.map