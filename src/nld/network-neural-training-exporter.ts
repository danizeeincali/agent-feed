/**
 * Network Neural Training Dataset Exporter - NLD System
 * 
 * Exports comprehensive network failure patterns and communication
 * data for claude-flow neural network training and pattern learning.
 */

import { NetworkFailurePattern } from './network-failure-pattern-detector';
import { NetworkRealTimeMonitor } from './network-real-time-monitor';
import { CORSPattern, TimeoutPattern } from './network-cors-timeout-detector';
import { EndpointMismatch } from './api-endpoint-mismatch-analyzer';
import { CommunicationPattern } from './frontend-backend-communication-analyzer';

export interface NeuralTrainingDataset {
  metadata: {
    version: string;
    timestamp: number;
    sessionId: string;
    totalPatterns: number;
    confidenceScore: number;
  };
  patterns: {
    networkFailures: NetworkFailurePattern[];
    corsIssues: CORSPattern[];
    timeouts: TimeoutPattern[];
    endpointMismatches: EndpointMismatch[];
    communicationPatterns: CommunicationPattern[];
  };
  features: {
    errorFrequencies: Record<string, number>;
    severityDistribution: Record<string, number>;
    temporalPatterns: Array<{ hour: number; errorCount: number; errorTypes: string[] }>;
    endpointHealth: Record<string, { successRate: number; avgLatency: number; errorTypes: string[] }>;
    correlations: Array<{ pattern1: string; pattern2: string; correlation: number }>;
  };
  prevention: {
    tddCoverage: number;
    preventablePatterns: number;
    testGaps: string[];
    recommendedTests: string[];
    mockingStrategies: string[];
  };
  neuralWeights: {
    patternRecognition: Record<string, number>;
    severityClassification: Record<string, number>;
    preventionEffectiveness: Record<string, number>;
    temporalFactors: Record<string, number>;
  };
}

export interface ExportOptions {
  includeRawData: boolean;
  includePersonalData: boolean;
  timeWindow: number; // milliseconds
  minConfidenceScore: number;
  formatType: 'CLAUDE_FLOW' | 'STANDARD' | 'RESEARCH';
  compressionLevel: 'none' | 'basic' | 'high';
}

export class NetworkNeuralTrainingExporter {
  private sessionId: string;
  private exportHistory: Map<string, any> = new Map();
  private confidenceCalculator: ConfidenceCalculator;

  constructor() {
    this.sessionId = `nld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.confidenceCalculator = new ConfidenceCalculator();
    console.log('🧠 Network Neural Training Exporter initialized');
  }

  public async exportTrainingDataset(options: Partial<ExportOptions> = {}): Promise<NeuralTrainingDataset> {
    const config: ExportOptions = {
      includeRawData: true,
      includePersonalData: false,
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      minConfidenceScore: 0.7,
      formatType: 'CLAUDE_FLOW',
      compressionLevel: 'basic',
      ...options
    };

    console.log('📊 Exporting neural training dataset...');

    // Collect data from all NLD components
    const rawData = await this.collectRawData(config);
    
    // Process and enrich the data
    const processedData = this.processData(rawData, config);
    
    // Generate features for neural training
    const features = this.generateFeatures(processedData);
    
    // Calculate neural weights
    const neuralWeights = this.calculateNeuralWeights(processedData, features);
    
    // Build final dataset
    const dataset: NeuralTrainingDataset = {
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        totalPatterns: this.countTotalPatterns(processedData),
        confidenceScore: this.confidenceCalculator.calculateOverallConfidence(processedData)
      },
      patterns: processedData,
      features,
      prevention: this.generatePreventionData(processedData),
      neuralWeights
    };

    // Apply formatting and compression
    const finalDataset = this.formatDataset(dataset, config);
    
    // Store export record
    this.recordExport(finalDataset, config);
    
    console.log(`✅ Neural training dataset exported: ${dataset.metadata.totalPatterns} patterns, confidence: ${(dataset.metadata.confidenceScore * 100).toFixed(1)}%`);
    
    return finalDataset;
  }

  private async collectRawData(config: ExportOptions): Promise<any> {
    const cutoffTime = Date.now() - config.timeWindow;
    const data: any = {
      networkFailures: [],
      corsIssues: [],
      timeouts: [],
      endpointMismatches: [],
      communicationPatterns: []
    };

    // Collect from Network Failure Pattern Detector
    const networkDetector = (window as any).NLD_NetworkDetector;
    if (networkDetector) {
      data.networkFailures = networkDetector.getPatterns()
        .filter((p: any) => p.timestamp >= cutoffTime);
    }

    // Collect from CORS/Timeout Detector
    const corsDetector = (window as any).NLD_CORSTimeoutDetector;
    if (corsDetector) {
      data.corsIssues = corsDetector.getCORSPatterns()
        .filter((p: any) => p.timestamp >= cutoffTime);
      data.timeouts = corsDetector.getTimeoutPatterns()
        .filter((p: any) => p.timestamp >= cutoffTime);
    }

    // Collect from API Endpoint Analyzer
    const apiAnalyzer = (window as any).NLD_APIAnalyzer;
    if (apiAnalyzer) {
      data.endpointMismatches = apiAnalyzer.getMismatches()
        .filter((p: any) => p.timestamp >= cutoffTime);
    }

    // Collect from Communication Analyzer
    const commAnalyzer = (window as any).NLD_CommunicationAnalyzer;
    if (commAnalyzer) {
      data.communicationPatterns = commAnalyzer.getPatterns()
        .filter((p: any) => p.timestamp >= cutoffTime);
    }

    // Collect from localStorage training data
    try {
      const storedData = JSON.parse(localStorage.getItem('nld_training_data') || '[]');
      data.historicalPatterns = storedData.filter((p: any) => p.timestamp >= cutoffTime);
    } catch (e) {
      console.warn('[NLD] Failed to load stored training data');
    }

    return data;
  }

  private processData(rawData: any, config: ExportOptions): any {
    const processed = { ...rawData };

    // Remove personal data if requested
    if (!config.includePersonalData) {
      processed.networkFailures = this.sanitizeNetworkFailures(processed.networkFailures);
      processed.corsIssues = this.sanitizeCORSPatterns(processed.corsIssues);
      processed.endpointMismatches = this.sanitizeEndpointMismatches(processed.endpointMismatches);
      processed.communicationPatterns = this.sanitizeCommunicationPatterns(processed.communicationPatterns);
    }

    // Filter by confidence score
    processed.networkFailures = processed.networkFailures.filter((p: any) => 
      this.confidenceCalculator.calculatePatternConfidence(p) >= config.minConfidenceScore
    );

    // Enrich with additional metadata
    processed.networkFailures = this.enrichNetworkFailures(processed.networkFailures);
    processed.corsIssues = this.enrichCORSPatterns(processed.corsIssues);
    processed.timeouts = this.enrichTimeoutPatterns(processed.timeouts);

    return processed;
  }

  private generateFeatures(data: any): NeuralTrainingDataset['features'] {
    const allPatterns = [
      ...data.networkFailures,
      ...data.corsIssues,
      ...data.timeouts,
      ...data.endpointMismatches,
      ...data.communicationPatterns
    ];

    return {
      errorFrequencies: this.calculateErrorFrequencies(allPatterns),
      severityDistribution: this.calculateSeverityDistribution(allPatterns),
      temporalPatterns: this.calculateTemporalPatterns(allPatterns),
      endpointHealth: this.calculateEndpointHealth(data),
      correlations: this.calculateCorrelations(allPatterns)
    };
  }

  private calculateErrorFrequencies(patterns: any[]): Record<string, number> {
    const frequencies: Record<string, number> = {};
    
    for (const pattern of patterns) {
      const errorType = pattern.errorType || pattern.type;
      frequencies[errorType] = (frequencies[errorType] || 0) + 1;
    }

    return frequencies;
  }

  private calculateSeverityDistribution(patterns: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const pattern of patterns) {
      const severity = pattern.severity;
      if (severity) {
        distribution[severity] = (distribution[severity] || 0) + 1;
      }
    }

    return distribution;
  }

  private calculateTemporalPatterns(patterns: any[]): Array<{ hour: number; errorCount: number; errorTypes: string[] }> {
    const hourlyData: Record<number, { count: number; types: Set<string> }> = {};

    for (const pattern of patterns) {
      const hour = new Date(pattern.timestamp).getHours();
      const errorType = pattern.errorType || pattern.type;
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = { count: 0, types: new Set() };
      }
      
      hourlyData[hour].count++;
      hourlyData[hour].types.add(errorType);
    }

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      errorCount: data.count,
      errorTypes: Array.from(data.types)
    }));
  }

  private calculateEndpointHealth(data: any): Record<string, { successRate: number; avgLatency: number; errorTypes: string[] }> {
    const endpointHealth: Record<string, { 
      total: number; 
      errors: number; 
      latencies: number[]; 
      errorTypes: Set<string> 
    }> = {};

    // Analyze communication patterns for endpoint health
    for (const pattern of data.communicationPatterns) {
      const url = pattern.details?.url || 'unknown';
      
      if (!endpointHealth[url]) {
        endpointHealth[url] = { total: 0, errors: 0, latencies: [], errorTypes: new Set() };
      }
      
      endpointHealth[url].total++;
      
      if (pattern.status === 'FAILURE' || pattern.status === 'TIMEOUT') {
        endpointHealth[url].errors++;
        endpointHealth[url].errorTypes.add(pattern.status);
      }
      
      if (pattern.performance?.latency) {
        endpointHealth[url].latencies.push(pattern.performance.latency);
      }
    }

    // Convert to final format
    const result: Record<string, { successRate: number; avgLatency: number; errorTypes: string[] }> = {};
    
    for (const [url, stats] of Object.entries(endpointHealth)) {
      result[url] = {
        successRate: stats.total > 0 ? (stats.total - stats.errors) / stats.total : 1,
        avgLatency: stats.latencies.length > 0 
          ? stats.latencies.reduce((sum, lat) => sum + lat, 0) / stats.latencies.length 
          : 0,
        errorTypes: Array.from(stats.errorTypes)
      };
    }

    return result;
  }

  private calculateCorrelations(patterns: any[]): Array<{ pattern1: string; pattern2: string; correlation: number }> {
    const correlations: Array<{ pattern1: string; pattern2: string; correlation: number }> = [];
    const errorTypes = [...new Set(patterns.map(p => p.errorType || p.type).filter(Boolean))];

    // Calculate time-based correlations between error types
    for (let i = 0; i < errorTypes.length; i++) {
      for (let j = i + 1; j < errorTypes.length; j++) {
        const type1 = errorTypes[i];
        const type2 = errorTypes[j];
        
        const correlation = this.calculateTimeBasedCorrelation(patterns, type1, type2);
        
        if (Math.abs(correlation) > 0.3) { // Only include significant correlations
          correlations.push({
            pattern1: type1,
            pattern2: type2,
            correlation
          });
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  private calculateTimeBasedCorrelation(patterns: any[], type1: string, type2: string): number {
    // Simplified correlation calculation based on co-occurrence within time windows
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    const type1Patterns = patterns.filter(p => (p.errorType || p.type) === type1);
    const type2Patterns = patterns.filter(p => (p.errorType || p.type) === type2);
    
    let cooccurrences = 0;
    
    for (const p1 of type1Patterns) {
      for (const p2 of type2Patterns) {
        if (Math.abs(p1.timestamp - p2.timestamp) <= timeWindow) {
          cooccurrences++;
        }
      }
    }
    
    const maxPossible = Math.min(type1Patterns.length, type2Patterns.length);
    return maxPossible > 0 ? cooccurrences / maxPossible : 0;
  }

  private generatePreventionData(data: any): NeuralTrainingDataset['prevention'] {
    const allPatterns = [
      ...data.networkFailures,
      ...data.corsIssues,
      ...data.timeouts,
      ...data.endpointMismatches,
      ...data.communicationPatterns
    ];

    const preventablePatterns = allPatterns.filter(p => 
      p.tddImpact?.wouldTddPrevent || p.tddPrevention
    );

    const testGaps = new Set<string>();
    const recommendedTests = new Set<string>();
    const mockingStrategies = new Set<string>();

    for (const pattern of preventablePatterns) {
      // Collect test gaps
      if (pattern.tddImpact?.testingGap) {
        testGaps.add(pattern.tddImpact.testingGap);
      }

      // Collect recommended tests
      const tests = pattern.tddImpact?.recommendedTests || 
                   pattern.tddPrevention?.integrationTests || 
                   pattern.tddPrevention?.contractTests || [];
      
      for (const test of tests) {
        recommendedTests.add(test);
      }

      // Collect mocking strategies
      const mocks = pattern.tddPrevention?.mockStrategies || [];
      for (const mock of mocks) {
        mockingStrategies.add(mock);
      }
    }

    return {
      tddCoverage: allPatterns.length > 0 ? preventablePatterns.length / allPatterns.length : 0,
      preventablePatterns: preventablePatterns.length,
      testGaps: Array.from(testGaps),
      recommendedTests: Array.from(recommendedTests),
      mockingStrategies: Array.from(mockingStrategies)
    };
  }

  private calculateNeuralWeights(data: any, features: any): NeuralTrainingDataset['neuralWeights'] {
    return {
      patternRecognition: {
        'NETWORK_ERROR': this.calculatePatternWeight(data.networkFailures, 'accuracy'),
        'CORS': this.calculatePatternWeight(data.corsIssues, 'accuracy'),
        'TIMEOUT': this.calculatePatternWeight(data.timeouts, 'accuracy'),
        'ENDPOINT_MISMATCH': this.calculatePatternWeight(data.endpointMismatches, 'accuracy'),
        'COMMUNICATION': this.calculatePatternWeight(data.communicationPatterns, 'accuracy')
      },
      severityClassification: this.calculateSeverityWeights(features.severityDistribution),
      preventionEffectiveness: this.calculatePreventionWeights(data),
      temporalFactors: this.calculateTemporalWeights(features.temporalPatterns)
    };
  }

  private calculatePatternWeight(patterns: any[], metric: string): number {
    if (!patterns || patterns.length === 0) return 0.5;
    
    // Calculate weight based on pattern reliability and frequency
    const confidence = patterns.reduce((sum: number, p: any) => 
      sum + this.confidenceCalculator.calculatePatternConfidence(p), 0
    ) / patterns.length;
    
    const frequency = Math.min(patterns.length / 100, 1); // Normalize to max 100 patterns
    
    return (confidence * 0.7) + (frequency * 0.3);
  }

  private calculateSeverityWeights(distribution: Record<string, number>): Record<string, number> {
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    const weights: Record<string, number> = {};
    
    for (const [severity, count] of Object.entries(distribution)) {
      weights[severity] = total > 0 ? count / total : 0.25;
    }
    
    return weights;
  }

  private calculatePreventionWeights(data: any): Record<string, number> {
    return {
      'tdd_effectiveness': data.prevention?.tddCoverage || 0,
      'integration_testing': 0.85,
      'contract_testing': 0.78,
      'error_handling': 0.92,
      'monitoring': 0.88
    };
  }

  private calculateTemporalWeights(temporalPatterns: any[]): Record<string, number> {
    const weights: Record<string, number> = {};
    
    for (const pattern of temporalPatterns) {
      weights[`hour_${pattern.hour}`] = Math.min(pattern.errorCount / 10, 1);
    }
    
    return weights;
  }

  private countTotalPatterns(data: any): number {
    return (data.networkFailures?.length || 0) +
           (data.corsIssues?.length || 0) +
           (data.timeouts?.length || 0) +
           (data.endpointMismatches?.length || 0) +
           (data.communicationPatterns?.length || 0);
  }

  private formatDataset(dataset: NeuralTrainingDataset, config: ExportOptions): NeuralTrainingDataset {
    if (config.formatType === 'CLAUDE_FLOW') {
      return this.formatForClaudeFlow(dataset);
    }
    
    if (config.compressionLevel === 'high') {
      return this.compressDataset(dataset);
    }
    
    return dataset;
  }

  private formatForClaudeFlow(dataset: NeuralTrainingDataset): NeuralTrainingDataset {
    // Format specifically for claude-flow neural network ingestion
    return {
      ...dataset,
      metadata: {
        ...dataset.metadata,
        format: 'CLAUDE_FLOW_V1',
        compatibility: '2.0.0'
      }
    };
  }

  private compressDataset(dataset: NeuralTrainingDataset): NeuralTrainingDataset {
    // Remove verbose data and compress patterns
    const compressed = { ...dataset };
    
    // Keep only essential pattern data
    compressed.patterns.networkFailures = compressed.patterns.networkFailures.map(p => ({
      id: p.id,
      timestamp: p.timestamp,
      errorType: p.errorType,
      severity: p.severity,
      tddImpact: p.tddImpact
    })) as any;

    return compressed;
  }

  private sanitizeNetworkFailures(patterns: NetworkFailurePattern[]): NetworkFailurePattern[] {
    return patterns.map(pattern => ({
      ...pattern,
      context: {
        ...pattern.context,
        userAgent: 'sanitized',
        referer: 'sanitized'
      }
    }));
  }

  private sanitizeCORSPatterns(patterns: CORSPattern[]): CORSPattern[] {
    return patterns.map(pattern => ({
      ...pattern,
      details: {
        ...pattern.details,
        origin: this.sanitizeURL(pattern.details.origin),
        destination: this.sanitizeURL(pattern.details.destination)
      },
      browserInfo: {
        ...pattern.browserInfo,
        userAgent: 'sanitized'
      }
    }));
  }

  private sanitizeEndpointMismatches(patterns: EndpointMismatch[]): EndpointMismatch[] {
    return patterns.map(pattern => ({
      ...pattern,
      details: {
        ...pattern.details,
        requestedUrl: this.sanitizeURL(pattern.details.requestedUrl),
        expectedUrl: pattern.details.expectedUrl ? this.sanitizeURL(pattern.details.expectedUrl) : undefined
      }
    }));
  }

  private sanitizeCommunicationPatterns(patterns: CommunicationPattern[]): CommunicationPattern[] {
    return patterns.map(pattern => ({
      ...pattern,
      details: {
        ...pattern.details,
        url: this.sanitizeURL(pattern.details.url)
      }
    }));
  }

  private sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return 'sanitized-url';
    }
  }

  private enrichNetworkFailures(patterns: NetworkFailurePattern[]): NetworkFailurePattern[] {
    return patterns.map(pattern => ({
      ...pattern,
      enrichment: {
        patternAge: Date.now() - pattern.timestamp,
        confidence: this.confidenceCalculator.calculatePatternConfidence(pattern),
        clustering: this.calculatePatternClustering(pattern, patterns)
      }
    })) as any;
  }

  private enrichCORSPatterns(patterns: CORSPattern[]): CORSPattern[] {
    return patterns.map(pattern => ({
      ...pattern,
      enrichment: {
        browserCompatibility: this.assessBrowserCompatibility(pattern),
        confidence: this.confidenceCalculator.calculatePatternConfidence(pattern)
      }
    })) as any;
  }

  private enrichTimeoutPatterns(patterns: TimeoutPattern[]): TimeoutPattern[] {
    return patterns.map(pattern => ({
      ...pattern,
      enrichment: {
        networkConditionImpact: this.assessNetworkImpact(pattern),
        confidence: this.confidenceCalculator.calculatePatternConfidence(pattern)
      }
    })) as any;
  }

  private calculatePatternClustering(pattern: any, allPatterns: any[]): any {
    // Simple clustering based on similar error types and timing
    const similar = allPatterns.filter(p => 
      p.id !== pattern.id &&
      p.errorType === pattern.errorType &&
      Math.abs(p.timestamp - pattern.timestamp) < 300000 // Within 5 minutes
    );

    return {
      clusterSize: similar.length + 1,
      clusterId: `cluster_${pattern.errorType}_${Math.floor(pattern.timestamp / 300000)}`
    };
  }

  private assessBrowserCompatibility(pattern: CORSPattern): any {
    return {
      isLegacyBrowser: pattern.browserInfo.version.includes('Chrome') && 
                      parseInt(pattern.browserInfo.version.split(' ')[1]) < 80,
      hasCORSSupport: pattern.browserInfo.corsSupport,
      riskLevel: pattern.type === 'PREFLIGHT_FAILED' ? 'high' : 'medium'
    };
  }

  private assessNetworkImpact(pattern: TimeoutPattern): any {
    return {
      networkConditionFactor: pattern.networkConditions.connectionSpeed === 'slow' ? 0.8 : 1.0,
      latencyImpact: pattern.networkConditions.latency > 1000 ? 'high' : 'normal',
      recommendedTimeoutAdjustment: Math.ceil(pattern.details.timeoutValue * 1.5)
    };
  }

  private recordExport(dataset: NeuralTrainingDataset, config: ExportOptions): void {
    const exportRecord = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      totalPatterns: dataset.metadata.totalPatterns,
      confidenceScore: dataset.metadata.confidenceScore,
      config,
      size: JSON.stringify(dataset).length
    };

    this.exportHistory.set(dataset.metadata.timestamp.toString(), exportRecord);
    
    // Store for future reference
    try {
      const existingHistory = JSON.parse(localStorage.getItem('nld_export_history') || '[]');
      existingHistory.push(exportRecord);
      
      // Keep only last 50 exports
      const trimmedHistory = existingHistory.slice(-50);
      localStorage.setItem('nld_export_history', JSON.stringify(trimmedHistory));
    } catch (e) {
      console.warn('[NLD] Failed to store export history');
    }
  }

  // Public API for claude-flow integration
  public async exportForClaudeFlow(): Promise<any> {
    const dataset = await this.exportTrainingDataset({
      formatType: 'CLAUDE_FLOW',
      minConfidenceScore: 0.8,
      includePersonalData: false
    });

    // Transform to claude-flow neural training format
    return {
      pattern_type: 'optimization',
      training_data: JSON.stringify({
        patterns: dataset.patterns,
        features: dataset.features,
        weights: dataset.neuralWeights,
        prevention_strategies: dataset.prevention.recommendedTests,
        metadata: dataset.metadata
      }),
      epochs: Math.min(100, Math.max(25, dataset.metadata.totalPatterns))
    };
  }

  public getExportHistory(): any[] {
    return Array.from(this.exportHistory.values());
  }

  public getExportMetrics(): any {
    const history = this.getExportHistory();
    
    return {
      totalExports: history.length,
      averageConfidence: history.reduce((sum, exp) => sum + exp.confidenceScore, 0) / history.length,
      averageDatasetSize: history.reduce((sum, exp) => sum + exp.totalPatterns, 0) / history.length,
      lastExport: history[history.length - 1]?.timestamp,
      exportTrend: this.calculateExportTrend(history)
    };
  }

  private calculateExportTrend(history: any[]): string {
    if (history.length < 2) return 'insufficient_data';
    
    const recent = history.slice(-5);
    const avgRecentConfidence = recent.reduce((sum, exp) => sum + exp.confidenceScore, 0) / recent.length;
    
    const older = history.slice(-10, -5);
    if (older.length === 0) return 'improving';
    
    const avgOlderConfidence = older.reduce((sum, exp) => sum + exp.confidenceScore, 0) / older.length;
    
    return avgRecentConfidence > avgOlderConfidence ? 'improving' : 'declining';
  }
}

class ConfidenceCalculator {
  calculateOverallConfidence(data: any): number {
    const allPatterns = [
      ...data.networkFailures,
      ...data.corsIssues,
      ...data.timeouts,
      ...data.endpointMismatches,
      ...data.communicationPatterns
    ];

    if (allPatterns.length === 0) return 0;

    const totalConfidence = allPatterns.reduce((sum: number, pattern: any) => 
      sum + this.calculatePatternConfidence(pattern), 0
    );

    return totalConfidence / allPatterns.length;
  }

  calculatePatternConfidence(pattern: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on pattern completeness
    if (pattern.errorType || pattern.type) confidence += 0.1;
    if (pattern.severity) confidence += 0.1;
    if (pattern.context || pattern.details) confidence += 0.1;
    if (pattern.tddImpact || pattern.tddPrevention) confidence += 0.15;

    // Increase confidence based on data richness
    const dataRichness = this.calculateDataRichness(pattern);
    confidence += dataRichness * 0.15;

    return Math.min(confidence, 1.0);
  }

  private calculateDataRichness(pattern: any): number {
    let richness = 0;
    const dataPoints = [
      pattern.timestamp,
      pattern.context?.url || pattern.details?.url,
      pattern.context?.method || pattern.details?.method,
      pattern.context?.statusCode || pattern.details?.statusCode,
      pattern.errorDetails?.message || pattern.details?.blockedReason,
      pattern.performance?.latency,
      pattern.patterns?.preventionStrategies || pattern.tddPrevention?.integrationTests
    ];

    const presentDataPoints = dataPoints.filter(point => point != null && point !== '').length;
    richness = presentDataPoints / dataPoints.length;

    return richness;
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  (window as any).NLD_NeuralExporter = new NetworkNeuralTrainingExporter();
}