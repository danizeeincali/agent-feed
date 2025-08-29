"use strict";
/**
 * UI Performance Monitor
 * Detects performance degradation during UI modernization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiPerformanceMonitor = exports.UIPerformanceMonitor = void 0;
const events_1 = require("events");
class UIPerformanceMonitor extends events_1.EventEmitter {
    performanceEvents = [];
    performanceObserver = null;
    memoryObserver = null;
    fpsMonitor = null;
    interactionMonitor = null;
    currentMetrics;
    performanceBudget;
    baselineMetrics = null;
    constructor(budget) {
        super();
        this.performanceBudget = {
            maxRenderTime: 16, // 60fps = 16ms per frame
            maxMemoryUsage: 50 * 1024 * 1024, // 50MB
            minFPS: 30,
            maxInteractionDelay: 100, // 100ms for responsive interactions
            maxBundleSize: 2 * 1024 * 1024, // 2MB
            ...budget
        };
        this.currentMetrics = {
            renderTime: 0,
            paintTime: 0,
            layoutTime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            fps: 60,
            interactionDelay: 0,
            bundleSize: 0
        };
        this.initializePerformanceMonitoring();
    }
    initializePerformanceMonitoring() {
        this.setupPerformanceObserver();
        this.setupMemoryMonitoring();
        this.setupFPSMonitoring();
        this.setupInteractionMonitoring();
        this.captureBaselineMetrics();
        console.log('[NLD] UI Performance monitoring initialized with budget:', this.performanceBudget);
    }
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.processPerformanceEntry(entry);
                });
            });
            // Observe different types of performance entries
            try {
                this.performanceObserver.observe({
                    entryTypes: ['measure', 'navigation', 'paint', 'layout-shift', 'largest-contentful-paint']
                });
            }
            catch (error) {
                console.warn('[NLD] Some performance entry types not supported:', error);
                // Fallback to basic observation
                try {
                    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
                }
                catch (fallbackError) {
                    console.warn('[NLD] Performance Observer not fully supported');
                }
            }
        }
    }
    setupMemoryMonitoring() {
        // Monitor memory usage if available
        if ('memory' in performance) {
            this.memoryObserver = setInterval(() => {
                const memory = performance.memory;
                const currentUsage = memory.usedJSHeapSize;
                this.currentMetrics.memoryUsage = currentUsage;
                if (currentUsage > this.performanceBudget.maxMemoryUsage) {
                    this.recordPerformanceEvent({
                        type: 'memory_leak',
                        timestamp: Date.now(),
                        metrics: { memoryUsage: currentUsage },
                        severity: currentUsage > this.performanceBudget.maxMemoryUsage * 2 ? 'CRITICAL' : 'HIGH',
                        userImpact: 'Application may become sluggish or crash'
                    });
                }
            }, 5000); // Check every 5 seconds
        }
    }
    setupFPSMonitoring() {
        let frames = 0;
        let lastTime = performance.now();
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            if (currentTime - lastTime >= 1000) { // Every second
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.currentMetrics.fps = fps;
                if (fps < this.performanceBudget.minFPS) {
                    this.recordPerformanceEvent({
                        type: 'fps_drop',
                        timestamp: Date.now(),
                        metrics: { fps },
                        severity: fps < this.performanceBudget.minFPS / 2 ? 'CRITICAL' : 'HIGH',
                        userImpact: 'UI animations and interactions appear choppy'
                    });
                }
                frames = 0;
                lastTime = currentTime;
            }
            this.fpsMonitor = requestAnimationFrame(measureFPS);
        };
        this.fpsMonitor = requestAnimationFrame(measureFPS);
    }
    setupInteractionMonitoring() {
        let interactionStart = 0;
        // Monitor click interactions
        document.addEventListener('click', (event) => {
            interactionStart = performance.now();
            // Measure time to visual response
            requestAnimationFrame(() => {
                const interactionTime = performance.now() - interactionStart;
                this.currentMetrics.interactionDelay = interactionTime;
                if (interactionTime > this.performanceBudget.maxInteractionDelay) {
                    const target = event.target;
                    this.recordPerformanceEvent({
                        type: 'interaction_lag',
                        timestamp: Date.now(),
                        metrics: { interactionDelay: interactionTime },
                        component: this.getComponentName(target),
                        severity: interactionTime > this.performanceBudget.maxInteractionDelay * 2 ? 'HIGH' : 'MEDIUM',
                        userImpact: 'UI feels unresponsive to user interactions'
                    });
                }
            });
        });
        // Monitor key interactions
        document.addEventListener('keydown', (event) => {
            interactionStart = performance.now();
            setTimeout(() => {
                const interactionTime = performance.now() - interactionStart;
                this.currentMetrics.interactionDelay = Math.max(this.currentMetrics.interactionDelay, interactionTime);
                if (interactionTime > this.performanceBudget.maxInteractionDelay * 1.5) {
                    this.recordPerformanceEvent({
                        type: 'interaction_lag',
                        timestamp: Date.now(),
                        metrics: { interactionDelay: interactionTime },
                        component: 'keyboard_input',
                        severity: 'MEDIUM',
                        userImpact: 'Keyboard input feels delayed'
                    });
                }
            }, 0);
        });
    }
    captureBaselineMetrics() {
        // Capture initial performance metrics to compare against
        setTimeout(() => {
            this.baselineMetrics = { ...this.currentMetrics };
            console.log('[NLD] Baseline performance metrics captured:', this.baselineMetrics);
        }, 2000); // Wait a bit for things to stabilize
    }
    processPerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'measure':
                this.processMeasureEntry(entry);
                break;
            case 'navigation':
                this.processNavigationEntry(entry);
                break;
            case 'paint':
                this.processPaintEntry(entry);
                break;
            case 'layout-shift':
                this.processLayoutShiftEntry(entry);
                break;
            case 'largest-contentful-paint':
                this.processLCPEntry(entry);
                break;
        }
    }
    processMeasureEntry(entry) {
        const duration = entry.duration;
        // Check for slow renders
        if (entry.name.includes('React') || entry.name.includes('render')) {
            this.currentMetrics.renderTime = duration;
            if (duration > this.performanceBudget.maxRenderTime) {
                this.recordPerformanceEvent({
                    type: 'render_slow',
                    timestamp: Date.now(),
                    metrics: { renderTime: duration },
                    component: this.extractComponentFromMeasureName(entry.name),
                    severity: duration > this.performanceBudget.maxRenderTime * 3 ? 'CRITICAL' : 'HIGH',
                    userImpact: 'UI updates appear slow and janky'
                });
            }
        }
    }
    processNavigationEntry(entry) {
        const loadTime = entry.loadEventEnd - entry.navigationStart;
        const domContentLoadedTime = entry.domContentLoadedEventEnd - entry.navigationStart;
        if (loadTime > 5000) { // 5 second load time threshold
            this.recordPerformanceEvent({
                type: 'render_slow',
                timestamp: Date.now(),
                metrics: { renderTime: loadTime },
                severity: 'HIGH',
                userImpact: 'Page takes too long to load'
            });
        }
    }
    processPaintEntry(entry) {
        this.currentMetrics.paintTime = entry.startTime;
        if (entry.name === 'first-contentful-paint' && entry.startTime > 3000) {
            this.recordPerformanceEvent({
                type: 'render_slow',
                timestamp: Date.now(),
                metrics: { paintTime: entry.startTime },
                severity: 'MEDIUM',
                userImpact: 'Initial content appears slowly'
            });
        }
    }
    processLayoutShiftEntry(entry) {
        const clsScore = entry.value;
        if (clsScore > 0.1) { // CLS threshold for good UX
            this.recordPerformanceEvent({
                type: 'layout_thrash',
                timestamp: Date.now(),
                metrics: { layoutTime: clsScore },
                severity: clsScore > 0.25 ? 'HIGH' : 'MEDIUM',
                userImpact: 'UI elements shift unexpectedly during loading'
            });
        }
    }
    processLCPEntry(entry) {
        if (entry.startTime > 2500) { // LCP threshold for good UX
            this.recordPerformanceEvent({
                type: 'render_slow',
                timestamp: Date.now(),
                metrics: { renderTime: entry.startTime },
                severity: entry.startTime > 4000 ? 'HIGH' : 'MEDIUM',
                userImpact: 'Largest content takes too long to appear'
            });
        }
    }
    extractComponentFromMeasureName(name) {
        // Extract React component name from performance measure names
        const match = name.match(/⚛️\s*([A-Z][a-zA-Z]*)/);
        return match ? match[1] : 'Unknown';
    }
    getComponentName(element) {
        // Try to determine component name from DOM element
        if (element.getAttribute('data-testid')) {
            return element.getAttribute('data-testid');
        }
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.split(' ');
            const componentClass = classes.find(cls => cls.includes('component') || cls.includes('Component'));
            if (componentClass)
                return componentClass;
        }
        return element.tagName.toLowerCase();
    }
    recordPerformanceEvent(event) {
        this.performanceEvents.push(event);
        // Keep only last 200 events
        if (this.performanceEvents.length > 200) {
            this.performanceEvents = this.performanceEvents.slice(-200);
        }
        console.warn(`[NLD] Performance issue detected:`, event);
        this.emit('performance-issue', event);
        // Trigger auto-optimization for critical issues
        if (event.severity === 'CRITICAL') {
            this.attemptPerformanceOptimization(event);
        }
    }
    async attemptPerformanceOptimization(event) {
        console.log(`[NLD] Attempting performance optimization for: ${event.type}`);
        try {
            switch (event.type) {
                case 'memory_leak':
                    await this.optimizeMemoryUsage();
                    break;
                case 'render_slow':
                    await this.optimizeRenderPerformance(event.component);
                    break;
                case 'fps_drop':
                    await this.optimizeFPS();
                    break;
                case 'interaction_lag':
                    await this.optimizeInteractions();
                    break;
                case 'layout_thrash':
                    await this.optimizeLayout();
                    break;
            }
            this.emit('optimization-attempted', { event, success: true });
        }
        catch (error) {
            console.error(`[NLD] Performance optimization failed:`, error);
            this.emit('optimization-attempted', { event, success: false, error });
        }
    }
    async optimizeMemoryUsage() {
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        // Clear performance entries to free memory
        if (performance.clearMarks) {
            performance.clearMarks();
        }
        if (performance.clearMeasures) {
            performance.clearMeasures();
        }
        // Signal components to optimize memory usage
        this.emit('optimize-memory');
        console.log('[NLD] Memory optimization attempted');
    }
    async optimizeRenderPerformance(component) {
        // Disable expensive animations temporarily
        document.documentElement.style.setProperty('--animation-duration', '0s');
        // Signal specific component to optimize rendering
        if (component) {
            this.emit('optimize-component-render', { component });
        }
        // Re-enable animations after a delay
        setTimeout(() => {
            document.documentElement.style.removeProperty('--animation-duration');
        }, 5000);
        console.log('[NLD] Render performance optimization attempted');
    }
    async optimizeFPS() {
        // Reduce animation complexity
        const animatedElements = document.querySelectorAll('[class*="animate"], [style*="animation"]');
        animatedElements.forEach(el => {
            el.style.animationPlayState = 'paused';
        });
        // Re-enable after performance improves
        setTimeout(() => {
            animatedElements.forEach(el => {
                el.style.animationPlayState = 'running';
            });
        }, 10000);
        this.emit('optimize-fps');
        console.log('[NLD] FPS optimization attempted');
    }
    async optimizeInteractions() {
        // Throttle interactions temporarily
        let interactionThrottle = false;
        const throttleHandler = (event) => {
            if (interactionThrottle) {
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        };
        // Add throttling
        document.addEventListener('click', throttleHandler, true);
        document.addEventListener('keydown', throttleHandler, true);
        setInterval(() => {
            interactionThrottle = true;
            setTimeout(() => {
                interactionThrottle = false;
            }, 50); // 50ms throttle window
        }, 100);
        // Remove throttling after 30 seconds
        setTimeout(() => {
            document.removeEventListener('click', throttleHandler, true);
            document.removeEventListener('keydown', throttleHandler, true);
        }, 30000);
        console.log('[NLD] Interaction optimization attempted');
    }
    async optimizeLayout() {
        // Temporarily disable layout-triggering CSS
        const style = document.createElement('style');
        style.textContent = `
      * {
        transition: none !important;
        animation: none !important;
      }
    `;
        document.head.appendChild(style);
        // Remove optimization after a delay
        setTimeout(() => {
            document.head.removeChild(style);
        }, 5000);
        this.emit('optimize-layout');
        console.log('[NLD] Layout optimization attempted');
    }
    getCurrentMetrics() {
        return { ...this.currentMetrics };
    }
    getBaselineMetrics() {
        return this.baselineMetrics ? { ...this.baselineMetrics } : null;
    }
    getPerformanceEvents(count = 50) {
        return this.performanceEvents.slice(-count);
    }
    getPerformanceDegradation() {
        if (!this.baselineMetrics)
            return null;
        const degradation = {};
        if (this.currentMetrics.renderTime > this.baselineMetrics.renderTime * 1.5) {
            degradation.renderTime = this.currentMetrics.renderTime - this.baselineMetrics.renderTime;
        }
        if (this.currentMetrics.memoryUsage > this.baselineMetrics.memoryUsage * 1.3) {
            degradation.memoryUsage = this.currentMetrics.memoryUsage - this.baselineMetrics.memoryUsage;
        }
        if (this.currentMetrics.fps < this.baselineMetrics.fps * 0.8) {
            degradation.fps = this.baselineMetrics.fps - this.currentMetrics.fps;
        }
        if (this.currentMetrics.interactionDelay > this.baselineMetrics.interactionDelay * 1.5) {
            degradation.interactionDelay = this.currentMetrics.interactionDelay - this.baselineMetrics.interactionDelay;
        }
        return Object.keys(degradation).length > 0 ? degradation : null;
    }
    generatePerformanceReport() {
        const recentEvents = this.getPerformanceEvents(20);
        const criticalEvents = recentEvents.filter(e => e.severity === 'CRITICAL');
        const degradation = this.getPerformanceDegradation();
        const budgetStatus = {
            renderTime: this.currentMetrics.renderTime <= this.performanceBudget.maxRenderTime ? '✅' : '❌',
            memoryUsage: this.currentMetrics.memoryUsage <= this.performanceBudget.maxMemoryUsage ? '✅' : '❌',
            fps: this.currentMetrics.fps >= this.performanceBudget.minFPS ? '✅' : '❌',
            interactionDelay: this.currentMetrics.interactionDelay <= this.performanceBudget.maxInteractionDelay ? '✅' : '❌'
        };
        return `
UI Performance Monitor Report
============================

Current Performance Metrics:
- Render Time: ${this.currentMetrics.renderTime.toFixed(2)}ms ${budgetStatus.renderTime}
- Memory Usage: ${(this.currentMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB ${budgetStatus.memoryUsage}
- FPS: ${this.currentMetrics.fps} ${budgetStatus.fps}
- Interaction Delay: ${this.currentMetrics.interactionDelay.toFixed(2)}ms ${budgetStatus.interactionDelay}

Performance Budget Status:
- Max Render Time: ${this.performanceBudget.maxRenderTime}ms ${budgetStatus.renderTime}
- Max Memory: ${(this.performanceBudget.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB ${budgetStatus.memoryUsage}
- Min FPS: ${this.performanceBudget.minFPS} ${budgetStatus.fps}
- Max Interaction Delay: ${this.performanceBudget.maxInteractionDelay}ms ${budgetStatus.interactionDelay}

Performance Degradation Since Baseline:
${degradation ? Object.entries(degradation).map(([key, value]) => `- ${key}: +${typeof value === 'number' ? value.toFixed(2) : value}`).join('\n')
            : '✅ No significant degradation detected'}

Recent Critical Issues:
${criticalEvents.slice(-3).map(event => `${new Date(event.timestamp).toLocaleTimeString()} - ${event.type}: ${event.userImpact}`).join('\n') || 'No critical performance issues'}

Optimization Recommendations:
${this.generateOptimizationRecommendations()}
`;
    }
    generateOptimizationRecommendations() {
        const recommendations = [];
        const recentEvents = this.getPerformanceEvents(50);
        const renderIssues = recentEvents.filter(e => e.type === 'render_slow');
        const memoryIssues = recentEvents.filter(e => e.type === 'memory_leak');
        const interactionIssues = recentEvents.filter(e => e.type === 'interaction_lag');
        const fpsIssues = recentEvents.filter(e => e.type === 'fps_drop');
        if (renderIssues.length > 5) {
            recommendations.push('- Optimize component rendering - consider memoization');
        }
        if (memoryIssues.length > 3) {
            recommendations.push('- Investigate memory leaks - check for uncleared intervals/listeners');
        }
        if (interactionIssues.length > 5) {
            recommendations.push('- Optimize interaction handlers - debounce expensive operations');
        }
        if (fpsIssues.length > 3) {
            recommendations.push('- Reduce animation complexity or use CSS transforms');
        }
        if (this.currentMetrics.renderTime > this.performanceBudget.maxRenderTime * 2) {
            recommendations.push('- Critical: Render performance severely degraded');
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ Performance within acceptable limits');
        }
        return recommendations.join('\n');
    }
    destroy() {
        // Stop performance observer
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
            this.performanceObserver = null;
        }
        // Stop memory monitoring
        if (this.memoryObserver) {
            clearInterval(this.memoryObserver);
            this.memoryObserver = null;
        }
        // Stop FPS monitoring
        if (this.fpsMonitor) {
            cancelAnimationFrame(this.fpsMonitor);
            this.fpsMonitor = null;
        }
        // Clear data
        this.performanceEvents = [];
        this.baselineMetrics = null;
        // Remove event listeners
        this.removeAllListeners();
        console.log('[NLD] UI Performance Monitor destroyed');
    }
}
exports.UIPerformanceMonitor = UIPerformanceMonitor;
exports.uiPerformanceMonitor = new UIPerformanceMonitor();
//# sourceMappingURL=ui-performance-monitor.js.map