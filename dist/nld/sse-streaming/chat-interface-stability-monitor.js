"use strict";
/**
 * Chat Interface Stability Monitor - NLD Pattern Detection System
 * Monitors and prevents chat interface rendering degradation and UI state issues
 */
Object.defineProperty(exports, "__esModule", { value: true });
class ChatInterfaceStabilityMonitor {
    chatContainer;
    messageStates = new Map();
    interfaceFailures = [];
    scrollMetrics = {
        isAutoScrolling: false,
        scrollPosition: 0,
        scrollHeight: 0,
        clientHeight: 0,
        isAtBottom: true,
        scrollVelocity: 0,
        frameDrops: 0,
        lastScrollEvent: 0
    };
    performanceObserver;
    mutationObserver;
    resizeObserver;
    rafId;
    lastFrameTime = 0;
    RENDER_TIME_THRESHOLD = 100; // ms
    FRAME_DROP_THRESHOLD = 16.67; // 60fps threshold
    MEMORY_THRESHOLD = 100 * 1024 * 1024; // 100MB
    DOM_NODE_THRESHOLD = 5000;
    SCROLL_VELOCITY_THRESHOLD = 1000; // pixels per second
    MONITORING_INTERVAL = 1000; // 1 second
    constructor(chatContainer) {
        this.chatContainer = chatContainer;
        this.initializeMonitoring();
        this.startPerformanceMonitoring();
    }
    /**
     * Initialize monitoring systems
     */
    initializeMonitoring() {
        if (typeof window === 'undefined')
            return;
        // Initialize Performance Observer
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                this.handlePerformanceEntries(list.getEntries());
            });
            try {
                this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
            }
            catch (error) {
                console.warn('[NLD-Chat] PerformanceObserver not supported:', error);
            }
        }
        // Initialize Mutation Observer for DOM changes
        if (this.chatContainer && 'MutationObserver' in window) {
            this.mutationObserver = new MutationObserver((mutations) => {
                this.handleDomMutations(mutations);
            });
            this.mutationObserver.observe(this.chatContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'data-message-id']
            });
        }
        // Initialize Resize Observer
        if (this.chatContainer && 'ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver((entries) => {
                this.handleContainerResize(entries);
            });
            this.resizeObserver.observe(this.chatContainer);
        }
        // Setup scroll monitoring
        if (this.chatContainer) {
            this.chatContainer.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        }
        // Setup global error handling
        window.addEventListener('error', this.handleJavaScriptError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
    /**
     * Start performance monitoring loop
     */
    startPerformanceMonitoring() {
        const monitor = () => {
            this.checkInterfaceHealth();
            this.monitorFrameRate();
            this.checkMemoryUsage();
            this.validateMessageBubbles();
            setTimeout(() => {
                this.rafId = requestAnimationFrame(monitor);
            }, this.MONITORING_INTERVAL);
        };
        this.rafId = requestAnimationFrame(monitor);
    }
    /**
     * Monitor message bubble rendering
     */
    monitorMessageBubble(messageId, content, element) {
        const contentHash = this.generateContentHash(content);
        const now = Date.now();
        let bubbleState = this.messageStates.get(messageId);
        if (!bubbleState) {
            // New message bubble
            bubbleState = {
                messageId,
                bubbleElement: element,
                renderState: 'rendering',
                contentHash,
                renderTime: 0,
                updateCount: 0,
                lastUpdate: now,
                isVisible: false,
                hasAnsiContent: /\x1b\[[0-9;]*[mGKHf]/.test(content),
                hasCodeBlock: /```/.test(content)
            };
            this.messageStates.set(messageId, bubbleState);
        }
        else {
            // Update existing message
            bubbleState.updateCount++;
            bubbleState.lastUpdate = now;
            if (bubbleState.contentHash !== contentHash) {
                bubbleState.contentHash = contentHash;
                bubbleState.renderState = 'rendering';
                // Check for suspicious update patterns
                if (bubbleState.updateCount > 10) {
                    this.detectRenderingIssue(bubbleState, 'EXCESSIVE_UPDATES');
                }
            }
        }
        // Start render timing
        const renderStart = performance.now();
        // Monitor rendering completion
        requestAnimationFrame(() => {
            const renderEnd = performance.now();
            const renderTime = renderEnd - renderStart;
            bubbleState.renderTime = renderTime;
            bubbleState.renderState = 'rendered';
            if (renderTime > this.RENDER_TIME_THRESHOLD) {
                this.detectRenderingIssue(bubbleState, 'SLOW_RENDERING');
            }
            this.checkBubbleVisibility(bubbleState);
        });
    }
    /**
     * Check bubble visibility and positioning
     */
    checkBubbleVisibility(bubbleState) {
        if (!bubbleState.bubbleElement || !this.chatContainer)
            return;
        const bubbleRect = bubbleState.bubbleElement.getBoundingClientRect();
        const containerRect = this.chatContainer.getBoundingClientRect();
        const isVisible = (bubbleRect.top < containerRect.bottom &&
            bubbleRect.bottom > containerRect.top);
        bubbleState.isVisible = isVisible;
        // Check for rendering corruption
        if (isVisible && this.isBubbleCorrupted(bubbleState.bubbleElement)) {
            this.detectRenderingIssue(bubbleState, 'BUBBLE_CORRUPTION');
        }
    }
    /**
     * Check if message bubble is corrupted
     */
    isBubbleCorrupted(element) {
        // Check for common corruption indicators
        const computedStyle = getComputedStyle(element);
        const hasValidDimensions = element.offsetWidth > 0 && element.offsetHeight > 0;
        const hasValidContent = element.textContent && element.textContent.trim().length > 0;
        const hasValidStyles = computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
        // Check for ANSI escape sequences in rendered content
        const hasRawAnsi = element.textContent?.includes('\x1b[') || false;
        // Check for malformed code blocks
        const codeBlocks = element.querySelectorAll('pre, code');
        const hasInvalidCodeBlocks = Array.from(codeBlocks).some(block => {
            return block.textContent?.includes('```') || block.textContent?.includes('\x1b[');
        });
        return !hasValidDimensions || !hasValidContent || !hasValidStyles || hasRawAnsi || hasInvalidCodeBlocks;
    }
    /**
     * Detect rendering issues
     */
    detectRenderingIssue(bubbleState, issueType) {
        let failureType;
        let severity;
        switch (issueType) {
            case 'SLOW_RENDERING':
                failureType = 'CHAT_INTERFACE_RENDERING_DEGRADATION';
                severity = bubbleState.renderTime > 500 ? 'critical' : 'high';
                break;
            case 'BUBBLE_CORRUPTION':
                failureType = 'MESSAGE_BUBBLE_CORRUPTION';
                severity = 'high';
                break;
            case 'EXCESSIVE_UPDATES':
                failureType = 'UI_STATE_DESYNC';
                severity = 'medium';
                break;
            default:
                failureType = 'CHAT_INTERFACE_RENDERING_DEGRADATION';
                severity = 'medium';
        }
        const failure = this.createInterfaceFailure(failureType, `message-bubble-${bubbleState.messageId}`, severity, {
            renderTime: bubbleState.renderTime,
            updateCount: bubbleState.updateCount,
            hasAnsiContent: bubbleState.hasAnsiContent,
            renderState: bubbleState.renderState
        });
        this.recordInterfaceFailure(failure);
        bubbleState.renderState = 'corrupted';
    }
    /**
     * Handle scroll events
     */
    handleScroll(event) {
        if (!this.chatContainer)
            return;
        const now = Date.now();
        const container = this.chatContainer;
        const prevScrollPosition = this.scrollMetrics.scrollPosition;
        this.scrollMetrics.scrollPosition = container.scrollTop;
        this.scrollMetrics.scrollHeight = container.scrollHeight;
        this.scrollMetrics.clientHeight = container.clientHeight;
        this.scrollMetrics.isAtBottom = (container.scrollHeight - container.scrollTop <= container.clientHeight + 10);
        // Calculate scroll velocity
        const timeDelta = now - this.scrollMetrics.lastScrollEvent;
        const positionDelta = Math.abs(this.scrollMetrics.scrollPosition - prevScrollPosition);
        this.scrollMetrics.scrollVelocity = timeDelta > 0 ? positionDelta / (timeDelta / 1000) : 0;
        this.scrollMetrics.lastScrollEvent = now;
        // Detect scroll performance issues
        if (this.scrollMetrics.scrollVelocity > this.SCROLL_VELOCITY_THRESHOLD) {
            this.detectScrollIssue('HIGH_VELOCITY');
        }
        // Check for stuck scroll
        if (!this.scrollMetrics.isAtBottom && this.scrollMetrics.scrollVelocity === 0 && this.scrollMetrics.isAutoScrolling) {
            this.detectScrollIssue('STUCK_SCROLL');
        }
    }
    /**
     * Detect scroll-related issues
     */
    detectScrollIssue(issueType) {
        const failure = this.createInterfaceFailure('SCROLL_PERFORMANCE_ISSUE', 'chat-scroll-container', issueType === 'STUCK_SCROLL' ? 'high' : 'medium', {
            scrollVelocity: this.scrollMetrics.scrollVelocity,
            isAtBottom: this.scrollMetrics.isAtBottom,
            frameDrops: this.scrollMetrics.frameDrops
        });
        this.recordInterfaceFailure(failure);
    }
    /**
     * Monitor frame rate for performance issues
     */
    monitorFrameRate() {
        const now = performance.now();
        if (this.lastFrameTime > 0) {
            const frameDelta = now - this.lastFrameTime;
            if (frameDelta > this.FRAME_DROP_THRESHOLD * 2) {
                this.scrollMetrics.frameDrops++;
                if (this.scrollMetrics.frameDrops > 5) {
                    const failure = this.createInterfaceFailure('CHAT_INTERFACE_RENDERING_DEGRADATION', 'frame-rate-monitor', 'high', { frameDrops: this.scrollMetrics.frameDrops, frameDelta });
                    this.recordInterfaceFailure(failure);
                    this.scrollMetrics.frameDrops = 0; // Reset counter
                }
            }
        }
        this.lastFrameTime = now;
    }
    /**
     * Check memory usage
     */
    checkMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > this.MEMORY_THRESHOLD) {
                const failure = this.createInterfaceFailure('CHAT_INTERFACE_RENDERING_DEGRADATION', 'memory-monitor', 'high', {
                    memoryUsage: memory.usedJSHeapSize,
                    memoryLimit: memory.jsHeapSizeLimit
                });
                this.recordInterfaceFailure(failure);
            }
        }
    }
    /**
     * Check interface health
     */
    checkInterfaceHealth() {
        if (!this.chatContainer)
            return;
        const domNodeCount = this.chatContainer.querySelectorAll('*').length;
        if (domNodeCount > this.DOM_NODE_THRESHOLD) {
            const failure = this.createInterfaceFailure('CHAT_INTERFACE_RENDERING_DEGRADATION', 'dom-monitor', 'medium', { domNodeCount });
            this.recordInterfaceFailure(failure);
        }
        // Check for typing indicator issues
        this.checkTypingIndicator();
        // Validate message synchronization
        this.validateMessageSynchronization();
    }
    /**
     * Check typing indicator state
     */
    checkTypingIndicator() {
        if (!this.chatContainer)
            return;
        const typingIndicators = this.chatContainer.querySelectorAll('[data-typing-indicator]');
        const stuckIndicators = Array.from(typingIndicators).filter(indicator => {
            const lastUpdate = parseInt(indicator.getAttribute('data-last-update') || '0');
            return Date.now() - lastUpdate > 30000; // Stuck for 30+ seconds
        });
        if (stuckIndicators.length > 0) {
            const failure = this.createInterfaceFailure('TYPING_INDICATOR_STUCK', 'typing-indicator', 'medium', { stuckIndicators: stuckIndicators.length });
            this.recordInterfaceFailure(failure);
        }
    }
    /**
     * Validate message bubble states
     */
    validateMessageBubbles() {
        const corruptedBubbles = Array.from(this.messageStates.values()).filter(bubble => bubble.renderState === 'corrupted' || (bubble.isVisible && bubble.renderTime > this.RENDER_TIME_THRESHOLD * 2));
        if (corruptedBubbles.length > 3) {
            const failure = this.createInterfaceFailure('MESSAGE_BUBBLE_CORRUPTION', 'message-validation', 'critical', { corruptedBubbles: corruptedBubbles.length });
            this.recordInterfaceFailure(failure);
        }
    }
    /**
     * Validate message synchronization with SSE stream
     */
    validateMessageSynchronization() {
        // This would integrate with the message streaming validator
        // to ensure UI state matches the stream state
        const now = Date.now();
        const staleBubbles = Array.from(this.messageStates.values()).filter(bubble => now - bubble.lastUpdate > 60000 && bubble.renderState === 'rendering');
        if (staleBubbles.length > 0) {
            const failure = this.createInterfaceFailure('UI_STATE_DESYNC', 'sync-validation', 'high', { staleBubbles: staleBubbles.length });
            this.recordInterfaceFailure(failure);
        }
    }
    /**
     * Handle performance entries
     */
    handlePerformanceEntries(entries) {
        for (const entry of entries) {
            if (entry.entryType === 'measure' && entry.name.startsWith('chat-render')) {
                if (entry.duration > this.RENDER_TIME_THRESHOLD) {
                    const failure = this.createInterfaceFailure('CHAT_INTERFACE_RENDERING_DEGRADATION', entry.name, 'medium', { measureDuration: entry.duration });
                    this.recordInterfaceFailure(failure);
                }
            }
        }
    }
    /**
     * Handle DOM mutations
     */
    handleDomMutations(mutations) {
        let significantChanges = 0;
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                significantChanges += mutation.addedNodes.length + mutation.removedNodes.length;
            }
        }
        // Detect DOM thrashing
        if (significantChanges > 50) {
            const failure = this.createInterfaceFailure('CHAT_INTERFACE_RENDERING_DEGRADATION', 'dom-mutations', 'high', { mutationCount: significantChanges });
            this.recordInterfaceFailure(failure);
        }
    }
    /**
     * Handle container resize
     */
    handleContainerResize(entries) {
        // Update scroll metrics on resize
        if (this.chatContainer) {
            this.scrollMetrics.clientHeight = this.chatContainer.clientHeight;
            this.scrollMetrics.scrollHeight = this.chatContainer.scrollHeight;
        }
    }
    /**
     * Handle JavaScript errors
     */
    handleJavaScriptError(event) {
        if (event.filename?.includes('chat') || event.message.toLowerCase().includes('chat')) {
            const failure = this.createInterfaceFailure('CHAT_INTERFACE_RENDERING_DEGRADATION', 'javascript-error', 'high', {}, {
                jsError: event.message,
                stack: event.error?.stack || '',
                component: event.filename || 'unknown'
            });
            this.recordInterfaceFailure(failure);
        }
    }
    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(event) {
        const reason = event.reason?.toString() || '';
        if (reason.toLowerCase().includes('chat') || reason.toLowerCase().includes('message')) {
            const failure = this.createInterfaceFailure('UI_STATE_DESYNC', 'promise-rejection', 'medium', {}, {
                jsError: reason,
                stack: event.reason?.stack || '',
                component: 'promise-handler'
            });
            this.recordInterfaceFailure(failure);
        }
    }
    /**
     * Create interface failure record
     */
    createInterfaceFailure(failureType, componentPath, severity, customMetrics = {}, errorDetails) {
        return {
            failureId: `CHAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            failureType,
            componentPath,
            detectedAt: Date.now(),
            severity,
            renderingMetrics: {
                renderTime: customMetrics.renderTime || 0,
                frameDrop: this.scrollMetrics.frameDrops > 0,
                memoryUsage: customMetrics.memoryUsage || 0,
                domNodeCount: customMetrics.domNodeCount || 0,
                scrollPosition: this.scrollMetrics.scrollPosition,
                visibleMessages: Array.from(this.messageStates.values()).filter(m => m.isVisible).length
            },
            uiState: {
                isTyping: this.chatContainer?.querySelector('[data-typing-indicator]') !== null,
                isLoading: this.chatContainer?.querySelector('[data-loading]') !== null,
                messageCount: this.messageStates.size,
                lastMessageId: this.getLastMessageId(),
                scrollBehavior: this.scrollMetrics.isAtBottom ? 'auto' : 'stuck',
                inputState: this.getInputState()
            },
            errorDetails
        };
    }
    /**
     * Get last message ID
     */
    getLastMessageId() {
        const messageIds = Array.from(this.messageStates.keys());
        return messageIds[messageIds.length - 1] || '';
    }
    /**
     * Get input state
     */
    getInputState() {
        const input = document.querySelector('input[type="text"], textarea');
        if (!input)
            return 'disabled';
        if (input.disabled)
            return 'disabled';
        if (input.readOnly)
            return 'frozen';
        return 'enabled';
    }
    /**
     * Record interface failure
     */
    recordInterfaceFailure(failure) {
        this.interfaceFailures.push(failure);
        // Keep only last 100 failures
        if (this.interfaceFailures.length > 100) {
            this.interfaceFailures.shift();
        }
        this.exportNeuralTrainingData(failure);
        console.warn(`[NLD-Chat] Interface failure detected:`, failure);
        // Attempt auto-recovery for certain failure types
        this.attemptAutoRecovery(failure);
    }
    /**
     * Attempt automatic recovery
     */
    attemptAutoRecovery(failure) {
        switch (failure.failureType) {
            case 'MESSAGE_BUBBLE_CORRUPTION':
                this.recoverCorruptedBubbles();
                break;
            case 'SCROLL_PERFORMANCE_ISSUE':
                this.optimizeScrollPerformance();
                break;
            case 'TYPING_INDICATOR_STUCK':
                this.resetTypingIndicators();
                break;
            case 'UI_STATE_DESYNC':
                this.resyncUIState();
                break;
        }
    }
    /**
     * Recover corrupted message bubbles
     */
    recoverCorruptedBubbles() {
        for (const [messageId, bubble] of this.messageStates.entries()) {
            if (bubble.renderState === 'corrupted' && bubble.bubbleElement) {
                // Force re-render by toggling display
                const element = bubble.bubbleElement;
                element.style.display = 'none';
                requestAnimationFrame(() => {
                    element.style.display = '';
                    bubble.renderState = 'rendering';
                    console.log(`[NLD-Chat] Recovered corrupted bubble: ${messageId}`);
                });
            }
        }
    }
    /**
     * Optimize scroll performance
     */
    optimizeScrollPerformance() {
        if (!this.chatContainer)
            return;
        // Enable hardware acceleration
        this.chatContainer.style.willChange = 'scroll-position';
        this.chatContainer.style.transform = 'translateZ(0)';
        // Reset frame drop counter
        this.scrollMetrics.frameDrops = 0;
        console.log('[NLD-Chat] Applied scroll performance optimizations');
    }
    /**
     * Reset typing indicators
     */
    resetTypingIndicators() {
        if (!this.chatContainer)
            return;
        const indicators = this.chatContainer.querySelectorAll('[data-typing-indicator]');
        indicators.forEach(indicator => {
            indicator.setAttribute('data-last-update', Date.now().toString());
            indicator.style.display = 'none';
            setTimeout(() => {
                indicator.style.display = '';
            }, 100);
        });
        console.log('[NLD-Chat] Reset stuck typing indicators');
    }
    /**
     * Resync UI state
     */
    resyncUIState() {
        // Clear stale message states
        const now = Date.now();
        const staleThreshold = 300000; // 5 minutes
        for (const [messageId, bubble] of this.messageStates.entries()) {
            if (now - bubble.lastUpdate > staleThreshold) {
                this.messageStates.delete(messageId);
            }
        }
        console.log('[NLD-Chat] UI state resynced, removed stale message states');
    }
    /**
     * Generate content hash for change detection
     */
    generateContentHash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    /**
     * Export neural training data
     */
    exportNeuralTrainingData(failure) {
        const trainingData = {
            failure,
            context: {
                totalMessages: this.messageStates.size,
                visibleMessages: Array.from(this.messageStates.values()).filter(m => m.isVisible).length,
                corruptedMessages: Array.from(this.messageStates.values()).filter(m => m.renderState === 'corrupted').length,
                totalFailures: this.interfaceFailures.length,
                scrollMetrics: this.scrollMetrics,
                timestamp: Date.now()
            }
        };
        console.log(`[NLD-Chat] Neural training data exported:`, trainingData);
    }
    /**
     * Get interface statistics
     */
    getInterfaceStatistics() {
        const messages = Array.from(this.messageStates.values());
        const failuresByType = this.interfaceFailures.reduce((acc, failure) => {
            acc[failure.failureType] = (acc[failure.failureType] || 0) + 1;
            return acc;
        }, {});
        const totalRenderTime = messages.reduce((sum, m) => sum + m.renderTime, 0);
        const averageRenderTime = messages.length > 0 ? totalRenderTime / messages.length : 0;
        return {
            totalMessages: messages.length,
            healthyMessages: messages.filter(m => m.renderState === 'rendered').length,
            corruptedMessages: messages.filter(m => m.renderState === 'corrupted').length,
            renderingMessages: messages.filter(m => m.renderState === 'rendering').length,
            totalFailures: this.interfaceFailures.length,
            failuresByType,
            scrollMetrics: this.scrollMetrics,
            averageRenderTime
        };
    }
    /**
     * Cleanup monitoring
     */
    cleanup() {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.chatContainer) {
            this.chatContainer.removeEventListener('scroll', this.handleScroll.bind(this));
        }
        window.removeEventListener('error', this.handleJavaScriptError.bind(this));
        window.removeEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        this.messageStates.clear();
        this.interfaceFailures.length = 0;
    }
}
exports.default = ChatInterfaceStabilityMonitor;
//# sourceMappingURL=chat-interface-stability-monitor.js.map