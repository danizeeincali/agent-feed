/**
 * Frontend Message State Accumulation Detector
 * Detects frontend message state accumulation patterns in React components
 * Part of NLD (Neuro-Learning Development) system
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface MessageState {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  instanceId: string;
  componentId: string;
}

interface StateAccumulationPattern {
  patternId: string;
  componentName: string;
  instanceId: string;
  accumulationType: 'unbounded_growth' | 'duplicate_accumulation' | 'stale_state' | 'memory_bloat';
  messageCount: number;
  duplicateCount: number;
  staleCount: number;
  memoryImpact: number; // bytes
  timeWindow: number; // milliseconds
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  manifestation: string;
  technicalDetails: {
    stateSize: number;
    renderCount: number;
    effectExecutions: number;
    cleanupFailures: number;
  };
}

interface ComponentStateAnalysis {
  componentName: string;
  instanceId: string;
  stateVariables: { [key: string]: any };
  stateSize: number;
  lastUpdated: string;
  updateFrequency: number;
  renderCount: number;
  memoryUsage: number;
}

interface ReactHookStateFailure {
  patternId: string;
  componentName: string;
  hookType: 'useState' | 'useEffect' | 'useCallback' | 'useMemo' | 'useRef';
  hookName: string;
  failureType: 'dependency_loop' | 'stale_closure' | 'memory_leak' | 'infinite_render';
  stateBeforeFailure: any;
  stateAfterFailure: any;
  errorMessage: string;
  detectedAt: string;
}

export class FrontendMessageStateAccumulationDetector extends EventEmitter {
  private stateHistory: Map<string, MessageState[]> = new Map();
  private componentStates: Map<string, ComponentStateAnalysis> = new Map();
  private detectedPatterns: StateAccumulationPattern[] = [];
  private hookFailures: ReactHookStateFailure[] = [];
  private patternStorage: string;
  private readonly maxHistorySize = 1000;
  private readonly accumulationThreshold = 50;
  private readonly duplicateThreshold = 10;

  constructor(storageDir: string) {
    super();
    this.patternStorage = join(storageDir, 'frontend-state-accumulation-patterns.json');
    this.loadExistingPatterns();
    this.setupPeriodicAnalysis();
    console.log('📱 Frontend Message State Accumulation Detector initialized');
  }

  /**
   * Track message state update in React component
   */
  trackMessageStateUpdate(
    componentName: string,
    instanceId: string,
    messageState: MessageState[],
    renderCount: number = 1
  ): void {
    const componentKey = `${componentName}-${instanceId}`;
    
    // Update component state analysis
    this.updateComponentStateAnalysis(componentKey, componentName, instanceId, messageState, renderCount);
    
    // Store state history
    this.stateHistory.set(componentKey, [...messageState]);
    
    // Analyze for accumulation patterns
    this.analyzeStateAccumulation(componentKey, componentName, instanceId, messageState);
  }

  /**
   * Track React hook state change
   */
  trackHookStateChange(
    componentName: string,
    hookType: string,
    hookName: string,
    previousState: any,
    newState: any,
    dependencies?: any[]
  ): void {
    // Detect hook-specific failures
    this.detectHookFailures(componentName, hookType, hookName, previousState, newState, dependencies);
  }

  /**
   * Track component render cycles
   */
  trackComponentRender(
    componentName: string,
    instanceId: string,
    renderReason: string,
    props: any,
    state: any
  ): void {
    const componentKey = `${componentName}-${instanceId}`;
    
    if (!this.componentStates.has(componentKey)) {
      this.componentStates.set(componentKey, {
        componentName,
        instanceId,
        stateVariables: {},
        stateSize: 0,
        lastUpdated: new Date().toISOString(),
        updateFrequency: 0,
        renderCount: 0,
        memoryUsage: 0
      });
    }
    
    const analysis = this.componentStates.get(componentKey)!;
    analysis.renderCount++;
    analysis.stateVariables = { ...state };
    analysis.stateSize = this.calculateStateSize(state);
    analysis.lastUpdated = new Date().toISOString();
    analysis.memoryUsage = this.estimateMemoryUsage(props, state);
    
    // Check for excessive rendering
    if (analysis.renderCount > 100) {
      this.detectExcessiveRendering(componentName, instanceId, analysis, renderReason);
    }
  }

  /**
   * Analyze state accumulation patterns
   */
  private analyzeStateAccumulation(
    componentKey: string,
    componentName: string,
    instanceId: string,
    messageState: MessageState[]
  ): void {
    // Check for unbounded growth
    if (messageState.length > this.accumulationThreshold) {
      this.detectUnboundedGrowth(componentKey, componentName, instanceId, messageState);
    }
    
    // Check for duplicate accumulation
    const duplicates = this.findDuplicateMessages(messageState);
    if (duplicates.length > this.duplicateThreshold) {
      this.detectDuplicateAccumulation(componentKey, componentName, instanceId, messageState, duplicates);
    }
    
    // Check for stale message accumulation
    const staleMessages = this.findStaleMessages(messageState);
    if (staleMessages.length > this.duplicateThreshold) {
      this.detectStaleStateAccumulation(componentKey, componentName, instanceId, messageState, staleMessages);
    }
  }

  /**
   * Detect unbounded state growth
   */
  private detectUnboundedGrowth(
    componentKey: string,
    componentName: string,
    instanceId: string,
    messageState: MessageState[]
  ): void {
    const analysis = this.componentStates.get(componentKey);
    
    const pattern: StateAccumulationPattern = {
      patternId: `unbounded-growth-${componentKey}-${Date.now()}`,
      componentName,
      instanceId,
      accumulationType: 'unbounded_growth',
      messageCount: messageState.length,
      duplicateCount: 0,
      staleCount: 0,
      memoryImpact: this.calculateMemoryImpact(messageState),
      timeWindow: this.calculateTimeWindow(messageState),
      detectedAt: new Date().toISOString(),
      severity: this.calculateSeverity(messageState.length),
      rootCause: 'Messages added to state without cleanup or size limits',
      manifestation: 'Component performance degradation, memory bloat, potential browser crashes',
      technicalDetails: {
        stateSize: analysis?.stateSize || 0,
        renderCount: analysis?.renderCount || 0,
        effectExecutions: 0,
        cleanupFailures: 0
      }
    };
    
    this.recordPattern(pattern);
    console.warn(`📈 Unbounded State Growth: ${componentName} has ${messageState.length} messages`);
  }

  /**
   * Detect duplicate message accumulation
   */
  private detectDuplicateAccumulation(
    componentKey: string,
    componentName: string,
    instanceId: string,
    messageState: MessageState[],
    duplicates: MessageState[]
  ): void {
    const pattern: StateAccumulationPattern = {
      patternId: `duplicate-accumulation-${componentKey}-${Date.now()}`,
      componentName,
      instanceId,
      accumulationType: 'duplicate_accumulation',
      messageCount: messageState.length,
      duplicateCount: duplicates.length,
      staleCount: 0,
      memoryImpact: this.calculateMemoryImpact(duplicates),
      timeWindow: this.calculateTimeWindow(messageState),
      detectedAt: new Date().toISOString(),
      severity: 'medium',
      rootCause: 'Same messages being added to state multiple times without deduplication',
      manifestation: 'UI showing duplicate content, wasted memory, slower rendering',
      technicalDetails: {
        stateSize: duplicates.reduce((size, msg) => size + JSON.stringify(msg).length, 0),
        renderCount: this.componentStates.get(componentKey)?.renderCount || 0,
        effectExecutions: 0,
        cleanupFailures: 0
      }
    };
    
    this.recordPattern(pattern);
    console.warn(`🔄 Duplicate Message Accumulation: ${componentName} has ${duplicates.length} duplicate messages`);
  }

  /**
   * Detect stale message accumulation
   */
  private detectStaleStateAccumulation(
    componentKey: string,
    componentName: string,
    instanceId: string,
    messageState: MessageState[],
    staleMessages: MessageState[]
  ): void {
    const pattern: StateAccumulationPattern = {
      patternId: `stale-accumulation-${componentKey}-${Date.now()}`,
      componentName,
      instanceId,
      accumulationType: 'stale_state',
      messageCount: messageState.length,
      duplicateCount: 0,
      staleCount: staleMessages.length,
      memoryImpact: this.calculateMemoryImpact(staleMessages),
      timeWindow: this.calculateTimeWindow(messageState),
      detectedAt: new Date().toISOString(),
      severity: 'medium',
      rootCause: 'Old messages not being cleaned up from component state',
      manifestation: 'UI showing outdated information, memory bloat over time',
      technicalDetails: {
        stateSize: staleMessages.reduce((size, msg) => size + JSON.stringify(msg).length, 0),
        renderCount: this.componentStates.get(componentKey)?.renderCount || 0,
        effectExecutions: 0,
        cleanupFailures: 0
      }
    };
    
    this.recordPattern(pattern);
    console.warn(`📅 Stale State Accumulation: ${componentName} has ${staleMessages.length} stale messages`);
  }

  /**
   * Detect excessive component rendering
   */
  private detectExcessiveRendering(
    componentName: string,
    instanceId: string,
    analysis: ComponentStateAnalysis,
    renderReason: string
  ): void {
    const pattern: StateAccumulationPattern = {
      patternId: `excessive-rendering-${componentName}-${instanceId}-${Date.now()}`,
      componentName,
      instanceId,
      accumulationType: 'memory_bloat',
      messageCount: 0,
      duplicateCount: 0,
      staleCount: 0,
      memoryImpact: analysis.memoryUsage,
      timeWindow: 0,
      detectedAt: new Date().toISOString(),
      severity: 'high',
      rootCause: `Component rendering excessively (${analysis.renderCount} times) due to: ${renderReason}`,
      manifestation: 'UI lag, browser freezing, high CPU usage',
      technicalDetails: {
        stateSize: analysis.stateSize,
        renderCount: analysis.renderCount,
        effectExecutions: 0,
        cleanupFailures: 0
      }
    };
    
    this.recordPattern(pattern);
    console.warn(`🎀 Excessive Rendering: ${componentName} rendered ${analysis.renderCount} times`);
  }

  /**
   * Detect React hook failures
   */
  private detectHookFailures(
    componentName: string,
    hookType: string,
    hookName: string,
    previousState: any,
    newState: any,
    dependencies?: any[]
  ): void {
    // Detect useEffect dependency loops
    if (hookType === 'useEffect' && dependencies) {
      if (this.hasCircularDependencies(dependencies)) {
        const failure: ReactHookStateFailure = {
          patternId: `hook-failure-${componentName}-${hookName}-${Date.now()}`,
          componentName,
          hookType: hookType as any,
          hookName,
          failureType: 'dependency_loop',
          stateBeforeFailure: previousState,
          stateAfterFailure: newState,
          errorMessage: 'useEffect has circular dependencies causing infinite re-execution',
          detectedAt: new Date().toISOString()
        };
        
        this.hookFailures.push(failure);
        console.error(`⚙️ Hook Failure: ${componentName}.${hookName} has circular dependencies`);
      }
    }
    
    // Detect useState infinite updates
    if (hookType === 'useState' && 
        JSON.stringify(previousState) === JSON.stringify(newState) &&
        previousState !== newState) {
      const failure: ReactHookStateFailure = {
        patternId: `hook-failure-${componentName}-${hookName}-${Date.now()}`,
        componentName,
        hookType: hookType as any,
        hookName,
        failureType: 'infinite_render',
        stateBeforeFailure: previousState,
        stateAfterFailure: newState,
        errorMessage: 'useState causing infinite renders with equivalent but not identical state',
        detectedAt: new Date().toISOString()
      };
      
      this.hookFailures.push(failure);
      console.error(`⚙️ Hook Failure: ${componentName}.${hookName} causing infinite renders`);
    }
  }

  /**
   * Find duplicate messages in state
   */
  private findDuplicateMessages(messageState: MessageState[]): MessageState[] {
    const seen = new Set<string>();
    const duplicates: MessageState[] = [];
    
    messageState.forEach(message => {
      const key = `${message.type}-${message.content}-${message.instanceId}`;
      if (seen.has(key)) {
        duplicates.push(message);
      } else {
        seen.add(key);
      }
    });
    
    return duplicates;
  }

  /**
   * Find stale messages (older than 5 minutes)
   */
  private findStaleMessages(messageState: MessageState[]): MessageState[] {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return messageState.filter(message => 
      new Date(message.timestamp).getTime() < fiveMinutesAgo
    );
  }

  /**
   * Calculate memory impact of messages
   */
  private calculateMemoryImpact(messages: MessageState[]): number {
    return messages.reduce((total, message) => {
      return total + JSON.stringify(message).length * 2; // Rough bytes estimate
    }, 0);
  }

  /**
   * Calculate time window for messages
   */
  private calculateTimeWindow(messages: MessageState[]): number {
    if (messages.length < 2) return 0;
    
    const timestamps = messages.map(msg => new Date(msg.timestamp).getTime()).sort();
    return timestamps[timestamps.length - 1] - timestamps[0];
  }

  /**
   * Calculate severity based on message count
   */
  private calculateSeverity(messageCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (messageCount >= 500) return 'critical';
    if (messageCount >= 200) return 'high';
    if (messageCount >= 100) return 'medium';
    return 'low';
  }

  /**
   * Update component state analysis
   */
  private updateComponentStateAnalysis(
    componentKey: string,
    componentName: string,
    instanceId: string,
    messageState: MessageState[],
    renderCount: number
  ): void {
    const existing = this.componentStates.get(componentKey);
    const now = new Date().toISOString();
    
    this.componentStates.set(componentKey, {
      componentName,
      instanceId,
      stateVariables: { messages: messageState },
      stateSize: this.calculateStateSize(messageState),
      lastUpdated: now,
      updateFrequency: existing ? existing.updateFrequency + 1 : 1,
      renderCount: existing ? existing.renderCount + renderCount : renderCount,
      memoryUsage: this.calculateMemoryImpact(messageState)
    });
  }

  /**
   * Calculate state size
   */
  private calculateStateSize(state: any): number {
    return JSON.stringify(state).length;
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(props: any, state: any): number {
    return this.calculateStateSize(props) + this.calculateStateSize(state);
  }

  /**
   * Check for circular dependencies
   */
  private hasCircularDependencies(dependencies: any[]): boolean {
    // Simple check - in real implementation, this would be more sophisticated
    const depStrings = dependencies.map(dep => JSON.stringify(dep));
    const unique = new Set(depStrings);
    return depStrings.length !== unique.size;
  }

  /**
   * Setup periodic analysis
   */
  private setupPeriodicAnalysis(): void {
    setInterval(() => {
      this.analyzeComponentMemoryUsage();
    }, 30000); // Every 30 seconds
  }

  /**
   * Analyze component memory usage patterns
   */
  private analyzeComponentMemoryUsage(): void {
    this.componentStates.forEach((analysis, componentKey) => {
      if (analysis.memoryUsage > 1024 * 1024) { // 1MB threshold
        console.warn(`📈 High Memory Usage: ${analysis.componentName} using ${(analysis.memoryUsage / 1024).toFixed(2)}KB`);
      }
    });
  }

  /**
   * Record detected pattern
   */
  private recordPattern(pattern: StateAccumulationPattern): void {
    this.detectedPatterns.push(pattern);
    this.persistPatterns();
    this.emit('stateAccumulationDetected', pattern);
  }

  /**
   * Get all detected patterns
   */
  getDetectedPatterns(): StateAccumulationPattern[] {
    return [...this.detectedPatterns];
  }

  /**
   * Get hook failures
   */
  getHookFailures(): ReactHookStateFailure[] {
    return [...this.hookFailures];
  }

  /**
   * Get component state analyses
   */
  getComponentStateAnalyses(): ComponentStateAnalysis[] {
    return Array.from(this.componentStates.values());
  }

  /**
   * Load existing patterns from storage
   */
  private loadExistingPatterns(): void {
    try {
      if (existsSync(this.patternStorage)) {
        const data = readFileSync(this.patternStorage, 'utf8');
        const parsed = JSON.parse(data);
        this.detectedPatterns = parsed.patterns || [];
        this.hookFailures = parsed.hookFailures || [];
        console.log(`📂 Loaded ${this.detectedPatterns.length} existing frontend state patterns`);
      }
    } catch (error) {
      console.error('Failed to load existing patterns:', error);
    }
  }

  /**
   * Persist patterns to storage
   */
  private persistPatterns(): void {
    try {
      const data = {
        patterns: this.detectedPatterns,
        hookFailures: this.hookFailures,
        componentStates: Array.from(this.componentStates.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      writeFileSync(this.patternStorage, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to persist patterns:', error);
    }
  }

  /**
   * Clear all patterns (for testing)
   */
  clearPatterns(): void {
    this.detectedPatterns = [];
    this.hookFailures = [];
    this.componentStates.clear();
    this.stateHistory.clear();
  }

  /**
   * Generate frontend state analysis report
   */
  generateStateAnalysisReport(): string {
    const critical = this.detectedPatterns.filter(p => p.severity === 'critical');
    const high = this.detectedPatterns.filter(p => p.severity === 'high');
    const componentCount = this.componentStates.size;
    const totalMemory = Array.from(this.componentStates.values())
      .reduce((total, analysis) => total + analysis.memoryUsage, 0);
    
    let report = '=== Frontend Message State Accumulation Analysis Report ===\n\n';
    
    report += `📱 COMPONENT STATISTICS:\n`;
    report += `- Tracked Components: ${componentCount}\n`;
    report += `- Total Memory Usage: ${(totalMemory / 1024).toFixed(2)}KB\n`;
    report += `- Total Patterns: ${this.detectedPatterns.length}\n`;
    report += `- Hook Failures: ${this.hookFailures.length}\n\n`;
    
    if (critical.length > 0) {
      report += `🚨 CRITICAL STATE ISSUES (${critical.length}):\n`;
      critical.forEach(pattern => {
        report += `- ${pattern.componentName}: ${pattern.accumulationType}\n`;
        report += `  Messages: ${pattern.messageCount}, Memory: ${(pattern.memoryImpact / 1024).toFixed(2)}KB\n`;
        report += `  Root Cause: ${pattern.rootCause}\n\n`;
      });
    }
    
    if (high.length > 0) {
      report += `⚠️  HIGH PRIORITY (${high.length}):\n`;
      high.forEach(pattern => {
        report += `- ${pattern.componentName}: ${pattern.messageCount} messages\n`;
      });
      report += '\n';
    }
    
    const hookFailures = this.hookFailures.filter(f => f.failureType === 'dependency_loop');
    if (hookFailures.length > 0) {
      report += `⚙️  REACT HOOK FAILURES (${hookFailures.length}):\n`;
      hookFailures.forEach(failure => {
        report += `- ${failure.componentName}.${failure.hookName}: ${failure.failureType}\n`;
      });
    }
    
    return report;
  }
}

export default FrontendMessageStateAccumulationDetector;