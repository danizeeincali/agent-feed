/**
 * Message Router - Intelligent message routing between WebSocket clients
 * Provides load balancing, routing strategies, and message delivery guarantees
 */

import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';

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

export class MessageRouter extends EventEmitter {
  private config: MessageRouterConfig;
  private targets: Map<string, RoutingTarget> = new Map();
  private channels: Map<string, Set<string>> = new Map(); // channel -> target IDs
  private sessionAffinity: Map<string, string> = new Map(); // session -> target
  private roundRobinIndex: number = 0;
  private circuitBreakers: Map<string, { 
    isOpen: boolean; 
    failureCount: number; 
    lastFailure: Date; 
    nextRetry: Date 
  }> = new Map();
  private metrics: RoutingMetrics;
  private messageQueue: Map<string, RouteMessage[]> = new Map(); // target -> messages
  private processingQueue: boolean = false;

  constructor(config: MessageRouterConfig) {
    super();
    this.config = {
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      ...config
    };
    this.initializeMetrics();
    this.startQueueProcessor();
  }

  /**
   * Initialize routing metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalMessages: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageResponseTime: 0,
      routingStrategies: new Map(),
      circuitBreakerTrips: 0
    };
  }

  /**
   * Register a routing target (client)
   */
  registerTarget(
    targetId: string, 
    capabilities: string[], 
    weight: number = 1
  ): void {
    const target: RoutingTarget = {
      id: targetId,
      weight,
      capabilities,
      lastActivity: new Date(),
      messageCount: 0,
      errorCount: 0,
      responseTime: 0
    };

    this.targets.set(targetId, target);
    
    // Initialize circuit breaker
    this.circuitBreakers.set(targetId, {
      isOpen: false,
      failureCount: 0,
      lastFailure: new Date(0),
      nextRetry: new Date(0)
    });

    // Initialize message queue
    this.messageQueue.set(targetId, []);

    logger.debug('Routing target registered', { 
      targetId, 
      capabilities, 
      weight 
    });

    this.emit('targetRegistered', { targetId, capabilities, weight });
  }

  /**
   * Unregister a routing target
   */
  unregisterTarget(targetId: string): void {
    // Remove from targets
    this.targets.delete(targetId);
    
    // Remove from channels
    for (const [channel, targets] of this.channels.entries()) {
      targets.delete(targetId);
      if (targets.size === 0) {
        this.channels.delete(channel);
      }
    }

    // Remove session affinity
    for (const [session, target] of this.sessionAffinity.entries()) {
      if (target === targetId) {
        this.sessionAffinity.delete(session);
      }
    }

    // Clean up circuit breaker and queue
    this.circuitBreakers.delete(targetId);
    this.messageQueue.delete(targetId);

    logger.debug('Routing target unregistered', { targetId });
    this.emit('targetUnregistered', { targetId });
  }

  /**
   * Subscribe target to a channel
   */
  subscribeTargetToChannel(targetId: string, channel: string): void {
    if (!this.targets.has(targetId)) {
      throw new Error(`Target ${targetId} not registered`);
    }

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel)!.add(targetId);
    
    logger.debug('Target subscribed to channel', { targetId, channel });
    this.emit('targetSubscribed', { targetId, channel });
  }

  /**
   * Unsubscribe target from a channel
   */
  unsubscribeTargetFromChannel(targetId: string, channel: string): void {
    const channelTargets = this.channels.get(channel);
    if (channelTargets) {
      channelTargets.delete(targetId);
      if (channelTargets.size === 0) {
        this.channels.delete(channel);
      }
    }

    logger.debug('Target unsubscribed from channel', { targetId, channel });
    this.emit('targetUnsubscribed', { targetId, channel });
  }

  /**
   * Route message to a specific channel
   */
  async routeToChannel(
    channel: string, 
    payload: any, 
    sourceClient: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    const channelTargets = this.channels.get(channel);
    if (!channelTargets || channelTargets.size === 0) {
      throw new Error(`No targets available for channel: ${channel}`);
    }

    // Create route message
    const message: RouteMessage = {
      id: this.generateMessageId(),
      payload,
      channel,
      priority,
      retries: 0,
      timestamp: new Date(),
      metadata: {
        sourceClient,
        routingStrategy: 'channel_broadcast',
        attemptCount: 0
      }
    };

    this.metrics.totalMessages++;

    // Route to all targets in channel
    const routingPromises = Array.from(channelTargets).map(targetId => 
      this.routeMessageToTarget(message, targetId)
    );

    try {
      await Promise.allSettled(routingPromises);
      this.metrics.successfulDeliveries++;
      
      this.emit('messageRouted', {
        messageId: message.id,
        channel,
        targetCount: channelTargets.size,
        strategy: 'channel_broadcast'
      });
    } catch (error) {
      this.metrics.failedDeliveries++;
      logger.error('Channel routing failed', { 
        channel, 
        messageId: message.id, 
        error: error.message 
      });
      this.emit('routingError', {
        messageId: message.id,
        channel,
        error: error.message
      });
    }
  }

  /**
   * Route message to a specific client
   */
  async routeToClient(
    targetId: string, 
    payload: any, 
    sourceClient: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    if (!this.targets.has(targetId)) {
      throw new Error(`Target ${targetId} not found`);
    }

    // Create route message
    const message: RouteMessage = {
      id: this.generateMessageId(),
      payload,
      target: targetId,
      priority,
      retries: 0,
      timestamp: new Date(),
      metadata: {
        sourceClient,
        routingStrategy: 'direct',
        attemptCount: 0
      }
    };

    this.metrics.totalMessages++;

    try {
      await this.routeMessageToTarget(message, targetId);
      this.metrics.successfulDeliveries++;
      
      this.emit('messageRouted', {
        messageId: message.id,
        targetId,
        strategy: 'direct'
      });
    } catch (error) {
      this.metrics.failedDeliveries++;
      logger.error('Direct routing failed', { 
        targetId, 
        messageId: message.id, 
        error: error.message 
      });
      this.emit('routingError', {
        messageId: message.id,
        targetId,
        error: error.message
      });
    }
  }

  /**
   * Route message using load balancing strategy
   */
  async routeWithLoadBalancing(
    payload: any, 
    sourceClient: string,
    capabilities: string[] = [],
    sessionId?: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    const availableTargets = this.getAvailableTargets(capabilities);
    if (availableTargets.length === 0) {
      throw new Error('No available targets for load balancing');
    }

    // Select target based on strategy
    const targetId = this.selectTarget(availableTargets, sessionId);

    // Create route message
    const message: RouteMessage = {
      id: this.generateMessageId(),
      payload,
      target: targetId,
      priority,
      retries: 0,
      timestamp: new Date(),
      metadata: {
        sourceClient,
        routingStrategy: this.config.strategy,
        attemptCount: 0
      }
    };

    this.metrics.totalMessages++;
    this.updateRoutingStrategyMetrics(this.config.strategy);

    try {
      await this.routeMessageToTarget(message, targetId);
      this.metrics.successfulDeliveries++;
      
      this.emit('messageRouted', {
        messageId: message.id,
        targetId,
        strategy: this.config.strategy
      });

      return targetId;
    } catch (error) {
      this.metrics.failedDeliveries++;
      logger.error('Load balanced routing failed', { 
        targetId, 
        messageId: message.id, 
        error: error.message 
      });
      this.emit('routingError', {
        messageId: message.id,
        targetId,
        strategy: this.config.strategy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Route message to specific target with retry logic
   */
  private async routeMessageToTarget(
    message: RouteMessage, 
    targetId: string
  ): Promise<void> {
    const target = this.targets.get(targetId);
    if (!target) {
      throw new Error(`Target ${targetId} not found`);
    }

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(targetId)!;
    if (circuitBreaker.isOpen && new Date() < circuitBreaker.nextRetry) {
      throw new Error(`Circuit breaker open for target ${targetId}`);
    }

    const startTime = Date.now();
    message.metadata.attemptCount++;

    try {
      // Add to queue for processing
      this.messageQueue.get(targetId)!.push(message);

      // Update target activity
      target.lastActivity = new Date();
      target.messageCount++;

      // Record response time
      const responseTime = Date.now() - startTime;
      target.responseTime = (target.responseTime + responseTime) / 2;

      // Reset circuit breaker on success
      circuitBreaker.failureCount = 0;
      circuitBreaker.isOpen = false;

      logger.debug('Message routed successfully', { 
        messageId: message.id, 
        targetId, 
        responseTime 
      });

    } catch (error) {
      // Handle failure
      target.errorCount++;
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailure = new Date();

      // Open circuit breaker if threshold reached
      if (circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
        circuitBreaker.isOpen = true;
        circuitBreaker.nextRetry = new Date(Date.now() + 30000); // 30 second timeout
        this.metrics.circuitBreakerTrips++;
        
        logger.warn('Circuit breaker opened', { 
          targetId, 
          failureCount: circuitBreaker.failureCount 
        });
      }

      // Retry if configured
      if (message.retries < this.config.maxRetries && this.config.maxRetries > 0) {
        message.retries++;
        
        logger.debug('Retrying message routing', { 
          messageId: message.id, 
          targetId, 
          retryAttempt: message.retries 
        });

        // Schedule retry
        setTimeout(() => {
          this.routeMessageToTarget(message, targetId).catch(retryError => {
            logger.error('Message retry failed', { 
              messageId: message.id, 
              targetId, 
              error: retryError.message 
            });
          });
        }, this.config.retryDelay * message.retries);
        
        return; // Don't throw on retry
      }

      throw error;
    }
  }

  /**
   * Get available targets based on capabilities
   */
  private getAvailableTargets(requiredCapabilities: string[]): RoutingTarget[] {
    return Array.from(this.targets.values()).filter(target => {
      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(target.id)!;
      if (circuitBreaker.isOpen && new Date() < circuitBreaker.nextRetry) {
        return false;
      }

      // Check capabilities
      if (requiredCapabilities.length > 0) {
        return requiredCapabilities.every(cap => target.capabilities.includes(cap));
      }

      return true;
    });
  }

  /**
   * Select target based on routing strategy
   */
  private selectTarget(
    availableTargets: RoutingTarget[], 
    sessionId?: string
  ): string {
    if (availableTargets.length === 0) {
      throw new Error('No available targets');
    }

    switch (this.config.strategy) {
      case 'session-affinity':
        if (sessionId && this.sessionAffinity.has(sessionId)) {
          const affinityTarget = this.sessionAffinity.get(sessionId)!;
          const target = availableTargets.find(t => t.id === affinityTarget);
          if (target) {
            return target.id;
          }
        }
        // Fall through to round-robin if no affinity found
        
      case 'round-robin':
        const target = availableTargets[this.roundRobinIndex % availableTargets.length];
        this.roundRobinIndex++;
        
        // Set session affinity if provided
        if (sessionId && this.config.strategy === 'session-affinity') {
          this.sessionAffinity.set(sessionId, target.id);
        }
        
        return target.id;

      case 'weighted':
        return this.selectWeightedTarget(availableTargets);

      default:
        throw new Error(`Unknown routing strategy: ${this.config.strategy}`);
    }
  }

  /**
   * Select target using weighted round-robin
   */
  private selectWeightedTarget(targets: RoutingTarget[]): string {
    const totalWeight = targets.reduce((sum, target) => sum + (target.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const target of targets) {
      random -= target.weight || 1;
      if (random <= 0) {
        return target.id;
      }
    }

    // Fallback to first target
    return targets[0].id;
  }

  /**
   * Start queue processor for handling message delivery
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue) {
        this.processMessageQueues();
      }
    }, 100); // Process every 100ms
  }

  /**
   * Process message queues for all targets
   */
  private async processMessageQueues(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      for (const [targetId, queue] of this.messageQueue.entries()) {
        if (queue.length === 0) continue;

        // Sort by priority and timestamp
        queue.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });

        // Process messages (emit them to the actual target)
        while (queue.length > 0) {
          const message = queue.shift()!;
          
          this.emit('deliverMessage', {
            targetId,
            message: message.payload,
            messageId: message.id,
            priority: message.priority,
            metadata: message.metadata
          });

          // Throttle to avoid overwhelming targets
          if (queue.length > 10) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Update routing strategy metrics
   */
  private updateRoutingStrategyMetrics(strategy: string): void {
    const current = this.metrics.routingStrategies.get(strategy) || 0;
    this.metrics.routingStrategies.set(strategy, current + 1);
  }

  /**
   * Get routing metrics
   */
  getMetrics(): RoutingMetrics {
    // Calculate average response time
    const targets = Array.from(this.targets.values());
    if (targets.length > 0) {
      this.metrics.averageResponseTime = targets.reduce(
        (sum, target) => sum + target.responseTime, 0
      ) / targets.length;
    }

    return { ...this.metrics };
  }

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
  }> {
    return Array.from(this.targets.entries()).map(([id, target]) => {
      const circuitBreaker = this.circuitBreakers.get(id)!;
      const errorRate = target.messageCount > 0 
        ? target.errorCount / target.messageCount 
        : 0;

      return {
        id,
        isHealthy: !circuitBreaker.isOpen && errorRate < 0.1,
        messageCount: target.messageCount,
        errorCount: target.errorCount,
        errorRate,
        responseTime: target.responseTime,
        circuitBreakerOpen: circuitBreaker.isOpen
      };
    });
  }

  /**
   * Update routing configuration
   */
  updateConfig(newConfig: Partial<MessageRouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Reset circuit breaker for a target
   */
  resetCircuitBreaker(targetId: string): void {
    const circuitBreaker = this.circuitBreakers.get(targetId);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      circuitBreaker.nextRetry = new Date(0);
      
      logger.info('Circuit breaker reset', { targetId });
      this.emit('circuitBreakerReset', { targetId });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    // Clear all data structures
    this.targets.clear();
    this.channels.clear();
    this.sessionAffinity.clear();
    this.circuitBreakers.clear();
    this.messageQueue.clear();

    // Remove all listeners
    this.removeAllListeners();

    logger.info('Message router shutdown completed');
  }
}