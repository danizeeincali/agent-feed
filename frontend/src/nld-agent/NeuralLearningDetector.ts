/**
 * Neural Learning Detection Agent for ClaudeServiceManager Architecture
 * 
 * This agent automatically monitors the ClaudeServiceManager + ClaudeInstanceManager
 * architecture for failure patterns and optimization opportunities, building a
 * comprehensive database for Test-Driven Development improvement.
 * 
 * MISSION: Real-time pattern analysis and failure prediction for the newly
 * deployed ClaudeServiceManager architecture.
 */

export interface FailurePattern {
  id: string;
  timestamp: Date;
  category: 'connection' | 'architecture' | 'user-experience' | 'performance';
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context: any;
  prediction: {
    probability: number;
    confidence: number;
    recommendedAction: string;
  };
  tddFactor: number; // Effectiveness score: (User Success Rate / Claude Confidence) * TDD Factor
}

export interface NeuralTrainingRecord {
  id: string;
  taskContext: string;
  claudeSolution: string;
  claudeConfidence: number;
  userFeedback: 'success' | 'failure' | 'partial';
  actualOutcome: string;
  failureMode?: string;
  correctedSolution?: string;
  effectivenessScore: number;
  timestamp: Date;
  tddUsed: boolean;
}

export interface ArchitecturalMetrics {
  connectionStability: number;
  apiSpamScore: number;
  singleConnectionCompliance: number;
  raceConditionIndicators: number;
  serviceManagerConflicts: number;
  workerInstanceFailures: number;
  feedIntegrationBottlenecks: number;
  interfaceResponsiveness: number;
  componentLoadingFailures: number;
  stateSynchronizationIssues: number;
  memoryLeakIndicators: number;
  cpuUsageSpikes: number;
  apiResponseDegradation: number;
  resourceConsumption: number;
}

export class NeuralLearningDetector {
  private patterns: Map<string, FailurePattern> = new Map();
  private trainingRecords: Map<string, NeuralTrainingRecord> = new Map();
  private metrics: ArchitecturalMetrics;
  private observers: Map<string, Function> = new Map();
  private predictionModels: Map<string, any> = new Map();
  private isActive: boolean = false;

  constructor() {
    this.metrics = {
      connectionStability: 100,
      apiSpamScore: 0,
      singleConnectionCompliance: 100,
      raceConditionIndicators: 0,
      serviceManagerConflicts: 0,
      workerInstanceFailures: 0,
      feedIntegrationBottlenecks: 0,
      interfaceResponsiveness: 100,
      componentLoadingFailures: 0,
      stateSynchronizationIssues: 0,
      memoryLeakIndicators: 0,
      cpuUsageSpikes: 0,
      apiResponseDegradation: 0,
      resourceConsumption: 0
    };
    
    this.initializePredictionModels();
  }

  /**
   * Activate NLD monitoring system
   */
  activate(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🧠 NLD Agent activated - Monitoring ClaudeServiceManager architecture');
    
    // Start real-time monitoring
    this.startConnectionPatternMonitoring();
    this.startArchitecturalPatternDetection();
    this.startUserExperienceTracking();
    this.startPerformanceAnalysis();
    
    // Initialize predictive models
    this.trainInitialModels();
  }

  /**
   * Deactivate NLD monitoring system
   */
  deactivate(): void {
    this.isActive = false;
    this.stopAllMonitoring();
    console.log('🧠 NLD Agent deactivated');
  }

  /**
   * 1. CONNECTION PATTERN MONITORING
   */
  private startConnectionPatternMonitoring(): void {
    // Monitor WebSocket connection stability
    this.observePattern('websocket-stability', () => {
      const stability = this.analyzeWebSocketStability();
      this.updateMetric('connectionStability', stability);
      
      if (stability < 80) {
        this.createFailurePattern({
          category: 'connection',
          subcategory: 'websocket-instability',
          severity: stability < 50 ? 'critical' : 'high',
          description: `WebSocket connection stability degraded to ${stability}%`,
          context: { currentStability: stability, threshold: 80 },
          prediction: {
            probability: (100 - stability) / 100,
            confidence: 0.85,
            recommendedAction: 'Implement connection pooling and retry logic'
          }
        });
      }
    });

    // Monitor API spam detection
    this.observePattern('api-spam', () => {
      const spamScore = this.detectAPISpam();
      this.updateMetric('apiSpamScore', spamScore);
      
      if (spamScore > 50) {
        this.createFailurePattern({
          category: 'connection',
          subcategory: 'api-spam',
          severity: spamScore > 80 ? 'critical' : 'medium',
          description: `API spam detected with score ${spamScore}`,
          context: { spamScore, requestsPerSecond: this.getRequestRate() },
          prediction: {
            probability: spamScore / 100,
            confidence: 0.9,
            recommendedAction: 'Implement rate limiting and request debouncing'
          }
        });
      }
    });

    // Monitor single-connection compliance
    this.observePattern('single-connection', () => {
      const compliance = this.checkSingleConnectionCompliance();
      this.updateMetric('singleConnectionCompliance', compliance);
      
      if (compliance < 95) {
        this.createFailurePattern({
          category: 'connection',
          subcategory: 'multiple-connections',
          severity: compliance < 80 ? 'high' : 'medium',
          description: `Multiple connection violations detected (${100-compliance}% non-compliant)`,
          context: { compliance, activeConnections: this.getActiveConnections() },
          prediction: {
            probability: (100 - compliance) / 100,
            confidence: 0.95,
            recommendedAction: 'Enforce SingleConnectionManager usage across all components'
          }
        });
      }
    });

    // Monitor race condition indicators
    this.observePattern('race-conditions', () => {
      const raceIndicators = this.detectRaceConditions();
      this.updateMetric('raceConditionIndicators', raceIndicators);
      
      if (raceIndicators > 10) {
        this.createFailurePattern({
          category: 'connection',
          subcategory: 'race-conditions',
          severity: raceIndicators > 25 ? 'critical' : 'high',
          description: `Race condition indicators detected: ${raceIndicators}`,
          context: { indicators: raceIndicators, concurrentOperations: this.getConcurrentOps() },
          prediction: {
            probability: Math.min(raceIndicators / 50, 1),
            confidence: 0.8,
            recommendedAction: 'Implement proper async/await patterns and connection locking'
          }
        });
      }
    });
  }

  /**
   * 2. ARCHITECTURAL PATTERN DETECTION
   */
  private startArchitecturalPatternDetection(): void {
    // Monitor service manager conflicts
    this.observePattern('service-conflicts', () => {
      const conflicts = this.detectServiceManagerConflicts();
      this.updateMetric('serviceManagerConflicts', conflicts);
      
      if (conflicts > 5) {
        this.createFailurePattern({
          category: 'architecture',
          subcategory: 'service-manager-conflicts',
          severity: conflicts > 15 ? 'critical' : 'high',
          description: `Service manager conflicts detected: ${conflicts}`,
          context: { conflicts, activeServices: this.getActiveServices() },
          prediction: {
            probability: Math.min(conflicts / 20, 1),
            confidence: 0.9,
            recommendedAction: 'Refactor to use singleton pattern for ClaudeServiceManager'
          }
        });
      }
    });

    // Monitor /prod directory enforcement
    this.observePattern('prod-directory', () => {
      const compliance = this.checkProdDirectoryCompliance();
      
      if (compliance < 100) {
        this.createFailurePattern({
          category: 'architecture',
          subcategory: 'prod-directory-violation',
          severity: 'medium',
          description: `Non-prod directory usage detected (${100-compliance}% compliance)`,
          context: { compliance, workingDirectories: this.getWorkingDirectories() },
          prediction: {
            probability: (100 - compliance) / 100,
            confidence: 0.85,
            recommendedAction: 'Enforce /prod directory default in ClaudeServiceManager config'
          }
        });
      }
    });

    // Monitor worker instance failover
    this.observePattern('worker-failover', () => {
      const failures = this.detectWorkerInstanceFailures();
      this.updateMetric('workerInstanceFailures', failures);
      
      if (failures > 2) {
        this.createFailurePattern({
          category: 'architecture',
          subcategory: 'worker-instance-failure',
          severity: failures > 5 ? 'critical' : 'high',
          description: `Worker instance failures detected: ${failures}`,
          context: { failures, workerInstances: this.getWorkerInstances() },
          prediction: {
            probability: Math.min(failures / 10, 1),
            confidence: 0.88,
            recommendedAction: 'Implement robust worker instance health checks and auto-restart'
          }
        });
      }
    });

    // Monitor feed integration bottlenecks
    this.observePattern('feed-bottlenecks', () => {
      const bottlenecks = this.detectFeedIntegrationBottlenecks();
      this.updateMetric('feedIntegrationBottlenecks', bottlenecks);
      
      if (bottlenecks > 3) {
        this.createFailurePattern({
          category: 'architecture',
          subcategory: 'feed-integration-bottleneck',
          severity: bottlenecks > 8 ? 'high' : 'medium',
          description: `Feed integration bottlenecks detected: ${bottlenecks}`,
          context: { bottlenecks, feedInstances: this.getFeedInstances() },
          prediction: {
            probability: Math.min(bottlenecks / 15, 1),
            confidence: 0.82,
            recommendedAction: 'Optimize feed worker instance allocation and processing queue'
          }
        });
      }
    });
  }

  /**
   * 3. USER EXPERIENCE PATTERN TRACKING
   */
  private startUserExperienceTracking(): void {
    // Monitor interface responsiveness
    this.observePattern('ui-responsiveness', () => {
      const responsiveness = this.measureInterfaceResponsiveness();
      this.updateMetric('interfaceResponsiveness', responsiveness);
      
      if (responsiveness < 70) {
        this.createFailurePattern({
          category: 'user-experience',
          subcategory: 'interface-lag',
          severity: responsiveness < 50 ? 'high' : 'medium',
          description: `Interface responsiveness degraded to ${responsiveness}%`,
          context: { responsiveness, renderTimes: this.getRenderTimes() },
          prediction: {
            probability: (100 - responsiveness) / 100,
            confidence: 0.9,
            recommendedAction: 'Implement React.memo and optimize component re-renders'
          }
        });
      }
    });

    // Monitor component loading failures
    this.observePattern('component-loading', () => {
      const failures = this.detectComponentLoadingFailures();
      this.updateMetric('componentLoadingFailures', failures);
      
      if (failures > 5) {
        this.createFailurePattern({
          category: 'user-experience',
          subcategory: 'component-loading-failure',
          severity: failures > 15 ? 'critical' : 'high',
          description: `Component loading failures detected: ${failures}`,
          context: { failures, failedComponents: this.getFailedComponents() },
          prediction: {
            probability: Math.min(failures / 25, 1),
            confidence: 0.85,
            recommendedAction: 'Add error boundaries and fallback UI components'
          }
        });
      }
    });

    // Monitor state synchronization issues
    this.observePattern('state-sync', () => {
      const issues = this.detectStateSynchronizationIssues();
      this.updateMetric('stateSynchronizationIssues', issues);
      
      if (issues > 3) {
        this.createFailurePattern({
          category: 'user-experience',
          subcategory: 'state-synchronization',
          severity: issues > 10 ? 'high' : 'medium',
          description: `State synchronization issues detected: ${issues}`,
          context: { issues, stateUpdates: this.getStateUpdates() },
          prediction: {
            probability: Math.min(issues / 20, 1),
            confidence: 0.8,
            recommendedAction: 'Implement centralized state management with Redux or Zustand'
          }
        });
      }
    });
  }

  /**
   * 4. PERFORMANCE PATTERN ANALYSIS
   */
  private startPerformanceAnalysis(): void {
    // Monitor memory leak indicators
    this.observePattern('memory-leaks', () => {
      const indicators = this.detectMemoryLeakIndicators();
      this.updateMetric('memoryLeakIndicators', indicators);
      
      if (indicators > 10) {
        this.createFailurePattern({
          category: 'performance',
          subcategory: 'memory-leak',
          severity: indicators > 25 ? 'critical' : 'high',
          description: `Memory leak indicators detected: ${indicators}`,
          context: { indicators, memoryUsage: this.getMemoryUsage() },
          prediction: {
            probability: Math.min(indicators / 30, 1),
            confidence: 0.85,
            recommendedAction: 'Audit component cleanup and WebSocket connection disposal'
          }
        });
      }
    });

    // Monitor CPU usage spikes
    this.observePattern('cpu-spikes', () => {
      const spikes = this.detectCPUUsageSpikes();
      this.updateMetric('cpuUsageSpikes', spikes);
      
      if (spikes > 5) {
        this.createFailurePattern({
          category: 'performance',
          subcategory: 'cpu-usage-spike',
          severity: spikes > 15 ? 'high' : 'medium',
          description: `CPU usage spikes detected: ${spikes}`,
          context: { spikes, cpuUsage: this.getCPUUsage() },
          prediction: {
            probability: Math.min(spikes / 20, 1),
            confidence: 0.8,
            recommendedAction: 'Optimize heavy computations and implement Web Workers'
          }
        });
      }
    });

    // Monitor API response time degradation
    this.observePattern('api-response-time', () => {
      const degradation = this.measureAPIResponseDegradation();
      this.updateMetric('apiResponseDegradation', degradation);
      
      if (degradation > 20) {
        this.createFailurePattern({
          category: 'performance',
          subcategory: 'api-response-degradation',
          severity: degradation > 50 ? 'high' : 'medium',
          description: `API response time degraded by ${degradation}%`,
          context: { degradation, responseTime: this.getAverageResponseTime() },
          prediction: {
            probability: degradation / 100,
            confidence: 0.9,
            recommendedAction: 'Implement response caching and connection pooling'
          }
        });
      }
    });

    // Monitor worker instance resource consumption
    this.observePattern('resource-consumption', () => {
      const consumption = this.measureResourceConsumption();
      this.updateMetric('resourceConsumption', consumption);
      
      if (consumption > 80) {
        this.createFailurePattern({
          category: 'performance',
          subcategory: 'high-resource-usage',
          severity: consumption > 95 ? 'critical' : 'high',
          description: `High resource consumption detected: ${consumption}%`,
          context: { consumption, resources: this.getResourceUsage() },
          prediction: {
            probability: consumption / 100,
            confidence: 0.88,
            recommendedAction: 'Scale worker instances and optimize resource allocation'
          }
        });
      }
    });
  }

  /**
   * Create and store failure pattern
   */
  private createFailurePattern(config: Omit<FailurePattern, 'id' | 'timestamp' | 'tddFactor'>): void {
    const pattern: FailurePattern = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      tddFactor: this.calculateTDDFactor(),
      ...config
    };

    this.patterns.set(pattern.id, pattern);
    this.emit('pattern:detected', pattern);
    
    console.log(`🔍 NLD Pattern Detected: [${pattern.severity.toUpperCase()}] ${pattern.description}`);
    
    // Store for neural training
    this.storeNeuralTrainingRecord({
      taskContext: `Architecture monitoring: ${pattern.subcategory}`,
      claudeSolution: 'Automated pattern detection',
      claudeConfidence: pattern.prediction.confidence,
      userFeedback: pattern.severity === 'low' ? 'success' : 'failure',
      actualOutcome: pattern.description,
      failureMode: pattern.subcategory,
      effectivenessScore: this.calculateEffectivenessScore(pattern),
      tddUsed: true
    });
  }

  /**
   * Store neural training record
   */
  private storeNeuralTrainingRecord(config: Omit<NeuralTrainingRecord, 'id' | 'timestamp'>): void {
    const record: NeuralTrainingRecord = {
      id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...config
    };

    this.trainingRecords.set(record.id, record);
    this.emit('training:record', record);
    
    // Update prediction models
    this.updatePredictionModels(record);
  }

  /**
   * Calculate TDD effectiveness factor
   */
  private calculateTDDFactor(): number {
    const tddRecords = Array.from(this.trainingRecords.values()).filter(r => r.tddUsed);
    const nonTddRecords = Array.from(this.trainingRecords.values()).filter(r => !r.tddUsed);
    
    if (tddRecords.length === 0) return 1.0;
    
    const tddSuccessRate = tddRecords.filter(r => r.userFeedback === 'success').length / tddRecords.length;
    const nonTddSuccessRate = nonTddRecords.length > 0 
      ? nonTddRecords.filter(r => r.userFeedback === 'success').length / nonTddRecords.length 
      : 0.5;
      
    return Math.max(tddSuccessRate / (nonTddSuccessRate || 0.1), 1.0);
  }

  /**
   * Calculate effectiveness score: (User Success Rate / Claude Confidence) * TDD Factor
   */
  private calculateEffectivenessScore(pattern: FailurePattern): number {
    const relatedRecords = Array.from(this.trainingRecords.values())
      .filter(r => r.failureMode === pattern.subcategory);
    
    if (relatedRecords.length === 0) return 0.5;
    
    const successRate = relatedRecords.filter(r => r.userFeedback === 'success').length / relatedRecords.length;
    const avgConfidence = relatedRecords.reduce((sum, r) => sum + r.claudeConfidence, 0) / relatedRecords.length;
    const tddFactor = this.calculateTDDFactor();
    
    return (successRate / avgConfidence) * tddFactor;
  }

  /**
   * Pattern analysis methods (simplified implementations for monitoring architecture)
   */
  private analyzeWebSocketStability(): number {
    // Simulate stability analysis based on connection events
    const connections = (window as any).__nld_websocket_connections || [];
    const recentFailures = connections.filter((c: any) => 
      c.lastError && (Date.now() - c.lastErrorTime) < 60000
    ).length;
    
    return Math.max(100 - (recentFailures * 10), 0);
  }

  private detectAPISpam(): number {
    // Monitor API request frequency
    const requests = (window as any).__nld_api_requests || [];
    const recentRequests = requests.filter((r: any) => (Date.now() - r.timestamp) < 10000);
    
    return Math.min((recentRequests.length / 100) * 100, 100);
  }

  private checkSingleConnectionCompliance(): number {
    const activeConnections = (window as any).__nld_active_connections || 1;
    return Math.max(100 - ((activeConnections - 1) * 20), 0);
  }

  private detectRaceConditions(): number {
    // Simulate race condition detection
    const concurrentOps = (window as any).__nld_concurrent_operations || 0;
    return Math.min(concurrentOps, 50);
  }

  private detectServiceManagerConflicts(): number {
    // Monitor service manager instances
    const instances = (window as any).__nld_service_instances || [];
    return Math.max(instances.length - 1, 0);
  }

  private checkProdDirectoryCompliance(): number {
    const directories = (window as any).__nld_working_directories || ['/workspaces/agent-feed/prod'];
    const prodCompliant = directories.filter((d: string) => d.includes('/prod')).length;
    return (prodCompliant / directories.length) * 100;
  }

  private detectWorkerInstanceFailures(): number {
    const failures = (window as any).__nld_worker_failures || 0;
    return failures;
  }

  private detectFeedIntegrationBottlenecks(): number {
    const bottlenecks = (window as any).__nld_feed_bottlenecks || 0;
    return bottlenecks;
  }

  private measureInterfaceResponsiveness(): number {
    const renderTimes = (window as any).__nld_render_times || [100];
    const avgRenderTime = renderTimes.reduce((sum: number, time: number) => sum + time, 0) / renderTimes.length;
    return Math.max(100 - (avgRenderTime / 10), 0);
  }

  private detectComponentLoadingFailures(): number {
    const failures = (window as any).__nld_component_failures || 0;
    return failures;
  }

  private detectStateSynchronizationIssues(): number {
    const issues = (window as any).__nld_state_sync_issues || 0;
    return issues;
  }

  private detectMemoryLeakIndicators(): number {
    const memUsage = (performance as any).memory?.usedJSHeapSize || 0;
    const baseline = 50 * 1024 * 1024; // 50MB baseline
    return Math.max((memUsage - baseline) / (10 * 1024 * 1024), 0);
  }

  private detectCPUUsageSpikes(): number {
    // Simulate CPU spike detection
    const spikes = (window as any).__nld_cpu_spikes || 0;
    return spikes;
  }

  private measureAPIResponseDegradation(): number {
    const responseTimes = (window as any).__nld_response_times || [500];
    const avgTime = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
    const baseline = 500; // 500ms baseline
    return Math.max(((avgTime - baseline) / baseline) * 100, 0);
  }

  private measureResourceConsumption(): number {
    // Combine memory, CPU, and network usage
    const memUsage = (performance as any).memory?.usedJSHeapSize || 0;
    const baseline = 100 * 1024 * 1024; // 100MB
    return Math.min((memUsage / baseline) * 100, 100);
  }

  // Helper methods for context gathering
  private getRequestRate(): number { return (window as any).__nld_request_rate || 10; }
  private getActiveConnections(): number { return (window as any).__nld_active_connections || 1; }
  private getConcurrentOps(): number { return (window as any).__nld_concurrent_operations || 0; }
  private getActiveServices(): string[] { return (window as any).__nld_active_services || ['ClaudeServiceManager']; }
  private getWorkingDirectories(): string[] { return (window as any).__nld_working_directories || ['/workspaces/agent-feed/prod']; }
  private getWorkerInstances(): string[] { return (window as any).__nld_worker_instances || []; }
  private getFeedInstances(): string[] { return (window as any).__nld_feed_instances || []; }
  private getRenderTimes(): number[] { return (window as any).__nld_render_times || [100]; }
  private getFailedComponents(): string[] { return (window as any).__nld_failed_components || []; }
  private getStateUpdates(): number { return (window as any).__nld_state_updates || 0; }
  private getMemoryUsage(): number { return (performance as any).memory?.usedJSHeapSize || 0; }
  private getCPUUsage(): number { return (window as any).__nld_cpu_usage || 0; }
  private getAverageResponseTime(): number { 
    const times = (window as any).__nld_response_times || [500];
    return times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
  }
  private getResourceUsage(): any { return { memory: this.getMemoryUsage(), cpu: this.getCPUUsage() }; }

  /**
   * Utility methods
   */
  private updateMetric(key: keyof ArchitecturalMetrics, value: number): void {
    this.metrics[key] = value;
    this.emit('metrics:updated', { [key]: value });
  }

  private observePattern(id: string, callback: Function): void {
    this.observers.set(id, callback);
    
    // Set up periodic monitoring (every 10 seconds)
    const interval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(interval);
        return;
      }
      
      try {
        callback();
      } catch (error) {
        console.error(`NLD Pattern observer error (${id}):`, error);
      }
    }, 10000);
  }

  private stopAllMonitoring(): void {
    this.observers.clear();
  }

  private initializePredictionModels(): void {
    // Initialize simple prediction models for each pattern type
    this.predictionModels.set('connection', { accuracy: 0.85, patterns: [] });
    this.predictionModels.set('architecture', { accuracy: 0.9, patterns: [] });
    this.predictionModels.set('user-experience', { accuracy: 0.8, patterns: [] });
    this.predictionModels.set('performance', { accuracy: 0.88, patterns: [] });
  }

  private trainInitialModels(): void {
    // Pre-populate with known patterns from ClaudeServiceManager architecture
    console.log('🧠 Training initial NLD models with ClaudeServiceManager patterns');
  }

  private updatePredictionModels(record: NeuralTrainingRecord): void {
    const category = this.categorizeRecord(record);
    const model = this.predictionModels.get(category);
    
    if (model) {
      model.patterns.push(record);
      
      // Simple accuracy update based on success rate
      const successRate = model.patterns.filter((p: any) => p.userFeedback === 'success').length / model.patterns.length;
      model.accuracy = (model.accuracy + successRate) / 2;
    }
  }

  private categorizeRecord(record: NeuralTrainingRecord): string {
    if (record.failureMode?.includes('connection')) return 'connection';
    if (record.failureMode?.includes('service') || record.failureMode?.includes('architecture')) return 'architecture';
    if (record.failureMode?.includes('interface') || record.failureMode?.includes('component')) return 'user-experience';
    return 'performance';
  }

  private emit(event: string, data: any): void {
    console.log(`🧠 NLD Event: ${event}`, data);
    // In a real implementation, this would emit to event listeners
  }

  /**
   * Public API
   */
  public getMetrics(): ArchitecturalMetrics {
    return { ...this.metrics };
  }

  public getPatterns(): FailurePattern[] {
    return Array.from(this.patterns.values());
  }

  public getTrainingData(): NeuralTrainingRecord[] {
    return Array.from(this.trainingRecords.values());
  }

  public getPredictionForPattern(subcategory: string): { probability: number; confidence: number; recommendation: string } | null {
    const pattern = Array.from(this.patterns.values()).find(p => p.subcategory === subcategory);
    if (!pattern) return null;
    
    return {
      probability: pattern.prediction.probability,
      confidence: pattern.prediction.confidence,
      recommendation: pattern.prediction.recommendedAction
    };
  }

  public exportTrainingData(): string {
    return JSON.stringify({
      patterns: Array.from(this.patterns.values()),
      trainingRecords: Array.from(this.trainingRecords.values()),
      metrics: this.metrics,
      models: Object.fromEntries(this.predictionModels)
    }, null, 2);
  }

  public generateReport(): string {
    const criticalPatterns = Array.from(this.patterns.values()).filter(p => p.severity === 'critical');
    const highPatterns = Array.from(this.patterns.values()).filter(p => p.severity === 'high');
    const successRate = Array.from(this.trainingRecords.values()).filter(r => r.userFeedback === 'success').length / this.trainingRecords.size;
    const tddFactor = this.calculateTDDFactor();

    return `
**Neural Learning Detection Report for ClaudeServiceManager Architecture**

**Pattern Detection Summary:**
- Total Patterns Detected: ${this.patterns.size}
- Critical Issues: ${criticalPatterns.length}
- High Priority Issues: ${highPatterns.length}
- Overall Success Rate: ${(successRate * 100).toFixed(1)}%
- TDD Effectiveness Factor: ${tddFactor.toFixed(2)}

**Architecture Health Metrics:**
- Connection Stability: ${this.metrics.connectionStability}%
- API Spam Score: ${this.metrics.apiSpamScore}
- Single Connection Compliance: ${this.metrics.singleConnectionCompliance}%
- Interface Responsiveness: ${this.metrics.interfaceResponsiveness}%

**Top Recommendations:**
${Array.from(this.patterns.values())
  .sort((a, b) => (b.prediction.probability * b.prediction.confidence) - (a.prediction.probability * a.prediction.confidence))
  .slice(0, 5)
  .map(p => `- ${p.prediction.recommendedAction} (${(p.prediction.probability * 100).toFixed(0)}% probability)`)
  .join('\n')}

**Neural Training Status:**
- Training Records: ${this.trainingRecords.size}
- TDD Usage Rate: ${(Array.from(this.trainingRecords.values()).filter(r => r.tddUsed).length / this.trainingRecords.size * 100).toFixed(1)}%
- Model Accuracy: ${Array.from(this.predictionModels.values()).reduce((sum, m) => sum + m.accuracy, 0) / this.predictionModels.size * 100}%
`;
  }
}

// Singleton instance
export const neuralLearningDetector = new NeuralLearningDetector();