/**
 * NLD WebSocket to HTTP/SSE Conversion Monitoring System
 * Generated: 2025-08-26
 * 
 * Purpose: Monitor the effectiveness of WebSocket to HTTP/SSE conversion
 * and detect any remaining WebSocket usage patterns that could cause connection storms.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ConnectionPattern {
  timestamp: string;
  type: 'websocket' | 'http' | 'sse';
  endpoint: string;
  success: boolean;
  errorType?: string;
  connectionCount?: number;
  duration?: number;
}

interface NLDAnalysis {
  recordId: string;
  timestamp: string;
  patternType: 'websocket_storm_detected' | 'sse_conversion_success' | 'http_fallback_active';
  effectivenessScore: number;
  details: {
    websocketAttempts: number;
    sseConnections: number;
    httpRequests: number;
    successRate: number;
  };
}

class NLDWebSocketSSEMonitor extends EventEmitter {
  private patterns: ConnectionPattern[] = [];
  private analysisRecords: NLDAnalysis[] = [];
  private monitoringActive = false;
  private logFilePath: string;

  constructor() {
    super();
    this.logFilePath = path.join(process.cwd(), 'docs/nld-patterns/nld-websocket-sse-monitoring-log.json');
  }

  /**
   * Start monitoring WebSocket to SSE conversion effectiveness
   */
  async startMonitoring(): Promise<void> {
    this.monitoringActive = true;
    console.log('[NLD Monitor] Starting WebSocket to HTTP/SSE conversion monitoring...');
    
    // Monitor log files for connection patterns
    this.startLogPatternDetection();
    
    // Monitor network connections
    this.startNetworkMonitoring();
    
    // Generate periodic analysis reports
    setInterval(() => this.generateAnalysisReport(), 30000); // Every 30 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('[NLD Monitor] Stopping WebSocket to HTTP/SSE conversion monitoring.');
  }

  /**
   * Monitor log files for WebSocket/SSE connection patterns
   */
  private async startLogPatternDetection(): Promise<void> {
    const logFiles = [
      '/workspaces/agent-feed/logs/combined.log',
      '/workspaces/agent-feed/logs/health-monitor.log',
      '/workspaces/agent-feed/logs/session-manager.log'
    ];

    for (const logFile of logFiles) {
      try {
        await this.watchLogFile(logFile);
      } catch (error) {
        console.warn(`[NLD Monitor] Could not watch log file: ${logFile}`, error);
      }
    }
  }

  /**
   * Watch individual log file for connection patterns
   */
  private async watchLogFile(filePath: string): Promise<void> {
    if (!this.monitoringActive) return;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').slice(-100); // Check last 100 lines

      for (const line of lines) {
        if (this.isWebSocketPattern(line)) {
          this.recordConnectionPattern({
            timestamp: new Date().toISOString(),
            type: 'websocket',
            endpoint: this.extractEndpoint(line),
            success: !line.includes('error') && !line.includes('failed'),
            connectionCount: this.extractConnectionCount(line)
          });
        } else if (this.isSSEPattern(line)) {
          this.recordConnectionPattern({
            timestamp: new Date().toISOString(),
            type: 'sse',
            endpoint: this.extractEndpoint(line),
            success: !line.includes('error') && !line.includes('failed')
          });
        } else if (this.isHTTPPattern(line)) {
          this.recordConnectionPattern({
            timestamp: new Date().toISOString(),
            type: 'http',
            endpoint: this.extractEndpoint(line),
            success: !line.includes('error') && !line.includes('failed')
          });
        }
      }
    } catch (error) {
      console.warn(`[NLD Monitor] Error reading log file ${filePath}:`, error);
    }

    // Continue monitoring if active
    setTimeout(() => this.watchLogFile(filePath), 5000);
  }

  /**
   * Monitor network connections for active WebSocket usage
   */
  private async startNetworkMonitoring(): Promise<void> {
    if (!this.monitoringActive) return;

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Check for active WebSocket connections
      const { stdout } = await execAsync('netstat -an | grep -E "(3000|3001|5173|8080)" || true');
      
      const connectionCount = stdout.split('\n').filter(line => 
        line.includes('ESTABLISHED') || line.includes('LISTEN')
      ).length;

      if (connectionCount > 10) {
        this.detectConnectionStorm(connectionCount);
      }

    } catch (error) {
      console.warn('[NLD Monitor] Network monitoring error:', error);
    }

    // Continue monitoring if active
    setTimeout(() => this.startNetworkMonitoring(), 10000);
  }

  /**
   * Record connection pattern for analysis
   */
  private recordConnectionPattern(pattern: ConnectionPattern): void {
    this.patterns.push(pattern);
    
    // Emit event for real-time monitoring
    this.emit('pattern_detected', pattern);
    
    // Keep only last 1000 patterns to prevent memory issues
    if (this.patterns.length > 1000) {
      this.patterns = this.patterns.slice(-1000);
    }
  }

  /**
   * Detect potential connection storm
   */
  private detectConnectionStorm(connectionCount: number): void {
    const recentWebSocketAttempts = this.patterns.filter(p => 
      p.type === 'websocket' && 
      new Date(p.timestamp).getTime() > Date.now() - 60000 // Last minute
    ).length;

    if (recentWebSocketAttempts > 20 || connectionCount > 50) {
      this.generateNLTRecord('websocket_storm_detected', {
        websocketAttempts: recentWebSocketAttempts,
        totalConnections: connectionCount,
        severity: 'high'
      });
    }
  }

  /**
   * Generate NLD analysis report
   */
  private async generateAnalysisReport(): Promise<void> {
    if (!this.monitoringActive) return;

    const now = Date.now();
    const recentPatterns = this.patterns.filter(p => 
      new Date(p.timestamp).getTime() > now - 300000 // Last 5 minutes
    );

    const websocketCount = recentPatterns.filter(p => p.type === 'websocket').length;
    const sseCount = recentPatterns.filter(p => p.type === 'sse').length;
    const httpCount = recentPatterns.filter(p => p.type === 'http').length;
    const successfulConnections = recentPatterns.filter(p => p.success).length;

    const totalConnections = recentPatterns.length;
    const successRate = totalConnections > 0 ? (successfulConnections / totalConnections) * 100 : 0;

    // Calculate effectiveness score
    const effectivenessScore = this.calculateEffectivenessScore({
      websocketAttempts: websocketCount,
      sseConnections: sseCount,
      httpRequests: httpCount,
      successRate
    });

    const analysis: NLDAnalysis = {
      recordId: `NLD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      patternType: this.determinePatternType(websocketCount, sseCount, httpCount),
      effectivenessScore,
      details: {
        websocketAttempts: websocketCount,
        sseConnections: sseCount,
        httpRequests: httpCount,
        successRate
      }
    };

    this.analysisRecords.push(analysis);
    this.emit('analysis_generated', analysis);

    // Save analysis to file
    await this.saveAnalysisToFile(analysis);

    console.log(`[NLD Monitor] Analysis: ${analysis.patternType} - Score: ${effectivenessScore}%`);
    console.log(`[NLD Monitor] Connections - WS: ${websocketCount}, SSE: ${sseCount}, HTTP: ${httpCount}, Success: ${successRate.toFixed(1)}%`);
  }

  /**
   * Calculate effectiveness score for the conversion
   */
  private calculateEffectivenessScore(details: any): number {
    const { websocketAttempts, sseConnections, httpRequests, successRate } = details;
    
    // Score based on successful migration from WebSocket to HTTP/SSE
    let score = 0;
    
    // Bonus for using SSE/HTTP instead of WebSocket
    if (sseConnections + httpRequests > websocketAttempts) {
      score += 40;
    }
    
    // Success rate component
    score += (successRate * 0.4);
    
    // Penalty for remaining WebSocket usage
    if (websocketAttempts > 0) {
      score -= Math.min(websocketAttempts * 2, 30);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine pattern type based on connection counts
   */
  private determinePatternType(ws: number, sse: number, http: number): NLDAnalysis['patternType'] {
    if (ws > 20) return 'websocket_storm_detected';
    if (sse > http && sse > ws) return 'sse_conversion_success';
    return 'http_fallback_active';
  }

  /**
   * Generate NLT (Neuro-Learning Testing) record for pattern database
   */
  private generateNLTRecord(type: string, data: any): void {
    const record = {
      id: `NLT-WS-SSE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      data,
      effectiveness_score: this.calculateEffectivenessScore(data),
      recommendations: this.generateRecommendations(type, data)
    };

    this.emit('nlt_record_created', record);
    console.log(`[NLD Monitor] NLT Record Created: ${type}`);
  }

  /**
   * Generate recommendations based on detected patterns
   */
  private generateRecommendations(type: string, data: any): string[] {
    const recommendations = [];

    if (type === 'websocket_storm_detected') {
      recommendations.push('Implement WebSocket connection pooling');
      recommendations.push('Add exponential backoff for failed connections');
      recommendations.push('Consider server-sent events for one-way communication');
    }

    if (data.successRate < 80) {
      recommendations.push('Investigate connection failure patterns');
      recommendations.push('Add robust error handling and retry logic');
    }

    return recommendations;
  }

  /**
   * Pattern detection helpers
   */
  private isWebSocketPattern(line: string): boolean {
    return /websocket|ws:\/\/|wss:\/\/|WebSocket/i.test(line);
  }

  private isSSEPattern(line: string): boolean {
    return /server-sent|event-source|text\/event-stream|SSE/i.test(line);
  }

  private isHTTPPattern(line: string): boolean {
    return /GET|POST|PUT|DELETE.*\/api\//i.test(line);
  }

  private extractEndpoint(line: string): string {
    const matches = line.match(/(?:GET|POST|PUT|DELETE|ws:\/\/|wss:\/\/)\s+([^\s]+)/);
    return matches ? matches[1] : 'unknown';
  }

  private extractConnectionCount(line: string): number {
    const matches = line.match(/connections?:\s*(\d+)/i);
    return matches ? parseInt(matches[1]) : 1;
  }

  /**
   * Save analysis to file for persistence
   */
  private async saveAnalysisToFile(analysis: NLDAnalysis): Promise<void> {
    try {
      const data = {
        timestamp: analysis.timestamp,
        analysis,
        raw_patterns: this.patterns.slice(-50) // Include recent patterns
      };

      await fs.writeFile(this.logFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('[NLD Monitor] Failed to save analysis to file:', error);
    }
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): any {
    return {
      active: this.monitoringActive,
      patterns_recorded: this.patterns.length,
      analysis_records: this.analysisRecords.length,
      recent_analysis: this.analysisRecords.slice(-1)[0]
    };
  }
}

export { NLDWebSocketSSEMonitor, ConnectionPattern, NLDAnalysis };

// Usage example:
if (require.main === module) {
  const monitor = new NLDWebSocketSSEMonitor();
  
  monitor.on('pattern_detected', (pattern) => {
    console.log('Pattern detected:', pattern);
  });
  
  monitor.on('analysis_generated', (analysis) => {
    console.log('Analysis generated:', analysis);
  });
  
  monitor.startMonitoring();
  
  // Keep monitoring active
  process.on('SIGINT', () => {
    monitor.stopMonitoring();
    process.exit(0);
  });
}