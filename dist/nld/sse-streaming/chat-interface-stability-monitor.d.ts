/**
 * Chat Interface Stability Monitor - NLD Pattern Detection System
 * Monitors and prevents chat interface rendering degradation and UI state issues
 */
export interface ChatInterfaceFailure {
    failureId: string;
    failureType: 'CHAT_INTERFACE_RENDERING_DEGRADATION' | 'MESSAGE_BUBBLE_CORRUPTION' | 'UI_STATE_DESYNC' | 'SCROLL_PERFORMANCE_ISSUE' | 'TYPING_INDICATOR_STUCK';
    componentPath: string;
    detectedAt: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    renderingMetrics: {
        renderTime: number;
        frameDrop: boolean;
        memoryUsage: number;
        domNodeCount: number;
        scrollPosition: number;
        visibleMessages: number;
    };
    uiState: {
        isTyping: boolean;
        isLoading: boolean;
        messageCount: number;
        lastMessageId: string;
        scrollBehavior: 'smooth' | 'auto' | 'stuck';
        inputState: 'enabled' | 'disabled' | 'frozen';
    };
    errorDetails?: {
        jsError: string;
        stack: string;
        component: string;
    };
}
export interface MessageBubbleState {
    messageId: string;
    bubbleElement?: HTMLElement;
    renderState: 'rendering' | 'rendered' | 'corrupted' | 'missing';
    contentHash: string;
    renderTime: number;
    updateCount: number;
    lastUpdate: number;
    isVisible: boolean;
    hasAnsiContent: boolean;
    hasCodeBlock: boolean;
}
export interface ChatScrollMetrics {
    isAutoScrolling: boolean;
    scrollPosition: number;
    scrollHeight: number;
    clientHeight: number;
    isAtBottom: boolean;
    scrollVelocity: number;
    frameDrops: number;
    lastScrollEvent: number;
}
declare class ChatInterfaceStabilityMonitor {
    private chatContainer?;
    private messageStates;
    private interfaceFailures;
    private scrollMetrics;
    private performanceObserver?;
    private mutationObserver?;
    private resizeObserver?;
    private rafId?;
    private lastFrameTime;
    private readonly RENDER_TIME_THRESHOLD;
    private readonly FRAME_DROP_THRESHOLD;
    private readonly MEMORY_THRESHOLD;
    private readonly DOM_NODE_THRESHOLD;
    private readonly SCROLL_VELOCITY_THRESHOLD;
    private readonly MONITORING_INTERVAL;
    constructor(chatContainer?: HTMLElement);
    /**
     * Initialize monitoring systems
     */
    private initializeMonitoring;
    /**
     * Start performance monitoring loop
     */
    private startPerformanceMonitoring;
    /**
     * Monitor message bubble rendering
     */
    monitorMessageBubble(messageId: string, content: string, element?: HTMLElement): void;
    /**
     * Check bubble visibility and positioning
     */
    private checkBubbleVisibility;
    /**
     * Check if message bubble is corrupted
     */
    private isBubbleCorrupted;
    /**
     * Detect rendering issues
     */
    private detectRenderingIssue;
    /**
     * Handle scroll events
     */
    private handleScroll;
    /**
     * Detect scroll-related issues
     */
    private detectScrollIssue;
    /**
     * Monitor frame rate for performance issues
     */
    private monitorFrameRate;
    /**
     * Check memory usage
     */
    private checkMemoryUsage;
    /**
     * Check interface health
     */
    private checkInterfaceHealth;
    /**
     * Check typing indicator state
     */
    private checkTypingIndicator;
    /**
     * Validate message bubble states
     */
    private validateMessageBubbles;
    /**
     * Validate message synchronization with SSE stream
     */
    private validateMessageSynchronization;
    /**
     * Handle performance entries
     */
    private handlePerformanceEntries;
    /**
     * Handle DOM mutations
     */
    private handleDomMutations;
    /**
     * Handle container resize
     */
    private handleContainerResize;
    /**
     * Handle JavaScript errors
     */
    private handleJavaScriptError;
    /**
     * Handle unhandled promise rejections
     */
    private handleUnhandledRejection;
    /**
     * Create interface failure record
     */
    private createInterfaceFailure;
    /**
     * Get last message ID
     */
    private getLastMessageId;
    /**
     * Get input state
     */
    private getInputState;
    /**
     * Record interface failure
     */
    private recordInterfaceFailure;
    /**
     * Attempt automatic recovery
     */
    private attemptAutoRecovery;
    /**
     * Recover corrupted message bubbles
     */
    private recoverCorruptedBubbles;
    /**
     * Optimize scroll performance
     */
    private optimizeScrollPerformance;
    /**
     * Reset typing indicators
     */
    private resetTypingIndicators;
    /**
     * Resync UI state
     */
    private resyncUIState;
    /**
     * Generate content hash for change detection
     */
    private generateContentHash;
    /**
     * Export neural training data
     */
    private exportNeuralTrainingData;
    /**
     * Get interface statistics
     */
    getInterfaceStatistics(): {
        totalMessages: number;
        healthyMessages: number;
        corruptedMessages: number;
        renderingMessages: number;
        totalFailures: number;
        failuresByType: Record<string, number>;
        scrollMetrics: ChatScrollMetrics;
        averageRenderTime: number;
    };
    /**
     * Cleanup monitoring
     */
    cleanup(): void;
}
export default ChatInterfaceStabilityMonitor;
//# sourceMappingURL=chat-interface-stability-monitor.d.ts.map