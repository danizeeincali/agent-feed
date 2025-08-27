/**
 * NLD (Neuro-Learning Development) - SSE Connection Pattern Detector
 * 
 * Specialized in automatically capturing failure patterns when SSE connections
 * fail in coordination scenarios where status broadcasts have 0 connections
 * but terminal streams show 1 connection, causing UI to stay stuck on "starting".
 */

import fs from 'fs';
import path from 'path';

interface SSEConnectionPattern {
  id: string;
  timestamp: string;
  triggerEvent: string;
  failureMode: 'status_sse_missing' | 'terminal_input_broken' | 'connection_coordination' | 'status_broadcast_zero' | 'mixed_connection_state';
  connectionState: {
    statusSSE: {
      connected: boolean;
      connections: number;
      endpoint: string;
    };
    terminalSSE: {
      connected: boolean;
      connections: number;
      instanceId: string | null;
      endpoint: string;
    };
    pollingState: {
      active: boolean;
      instanceId: string | null;
    };
  };
  uiState: {
    instanceStatus: 'starting' | 'running' | 'stopped' | 'error';
    stuck: boolean;
    lastStatusUpdate: string | null;
    connectionType: string;
  };
  contextualData: {
    originalTask: string;
    expectedBehavior: string;
    actualBehavior: string;
    errorMessages: string[];
  };
  effectiveness: {
    claudeConfidence: number;
    userSuccessRate: number;
    tddUsed: boolean;
    score: number;
  };
}

interface SSETriggerCondition {
  type: 'status_connection_zero' | 'terminal_connection_established' | 'ui_stuck_starting' | 'manual_trigger';
  data: any;
  source: string;
}

class SSEConnectionPatternDetector {
  private patterns: SSEConnectionPattern[] = [];
  private patternDir: string;
  private isMonitoring: boolean = false;
  private connectionStates: Map<string, any> = new Map();

  constructor() {
    this.patternDir = path.join(__dirname, 'patterns', 'sse-connection-failures');
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.patternDir)) {
      fs.mkdirSync(this.patternDir, { recursive: true });
    }
  }

  /**
   * Start monitoring for SSE connection failure patterns
   */
  public startMonitoring(): void {
    this.isMonitoring = true;
    console.log('🔍 NLD SSE Connection Pattern Detector: Monitoring started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('🛑 NLD SSE Connection Pattern Detector: Monitoring stopped');
  }

  /**
   * Detect trigger conditions for pattern capture
   */
  public detectTrigger(condition: SSETriggerCondition): boolean {
    if (!this.isMonitoring) return false;

    const triggers = [
      'status connection zero',
      'terminal connected but status failed', 
      'ui stuck on starting',
      'connection coordination failed',
      'mixed connection state detected'
    ];

    const conditionText = JSON.stringify(condition).toLowerCase();
    return triggers.some(trigger => conditionText.includes(trigger.toLowerCase()));
  }

  /**
   * Capture SSE connection failure pattern
   */
  public async captureFailurePattern(
    triggerCondition: SSETriggerCondition,
    contextualInfo: {
      task: string;
      expectedBehavior: string;
      actualBehavior: string;
      errorMessages?: string[];
    },
    connectionState: any,
    uiState: any,
    effectiveness?: {
      claudeConfidence?: number;
      userSuccessRate?: number;
      tddUsed?: boolean;
    }
  ): Promise<SSEConnectionPattern> {
    
    // Classify failure mode based on connection state
    const failureMode = this.classifyFailureMode(connectionState, uiState);
    
    const pattern: SSEConnectionPattern = {
      id: `sse-pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      triggerEvent: triggerCondition.type,
      failureMode,
      connectionState: this.normalizeConnectionState(connectionState),
      uiState: {
        instanceStatus: uiState.instanceStatus || 'starting',
        stuck: uiState.stuck || false,
        lastStatusUpdate: uiState.lastStatusUpdate || null,
        connectionType: uiState.connectionType || 'unknown'
      },
      contextualData: {
        originalTask: contextualInfo.task,
        expectedBehavior: contextualInfo.expectedBehavior,
        actualBehavior: contextualInfo.actualBehavior,
        errorMessages: contextualInfo.errorMessages || []
      },
      effectiveness: {
        claudeConfidence: effectiveness?.claudeConfidence || 0.5,
        userSuccessRate: effectiveness?.userSuccessRate || 0.0,
        tddUsed: effectiveness?.tddUsed || false,
        score: this.calculateEffectivenessScore(
          effectiveness?.claudeConfidence || 0.5,
          effectiveness?.userSuccessRate || 0.0,
          effectiveness?.tddUsed || false
        )
      }
    };

    // Store pattern
    await this.storePattern(pattern);
    this.patterns.push(pattern);

    console.log(`🎯 NLD: Captured SSE connection failure pattern: ${pattern.id}`);
    return pattern;
  }

  /**
   * Classify the type of failure mode based on connection state
   */
  private classifyFailureMode(connectionState: any, uiState: any): SSEConnectionPattern['failureMode'] {
    // Status SSE connection not established despite general SSE stream requests
    if (!connectionState.statusSSE?.connected && connectionState.terminalSSE?.connected) {
      return 'status_sse_missing';
    }
    
    // Status broadcasts have 0 connections
    if (connectionState.statusSSE?.connections === 0) {
      return 'status_broadcast_zero';
    }
    
    // Terminal input path broken - no forwarding to backend
    if (connectionState.terminalSSE?.connected && !connectionState.inputForwarding) {
      return 'terminal_input_broken';
    }
    
    // Connection coordination issues between status and terminal streams
    if (connectionState.statusSSE?.connected !== connectionState.terminalSSE?.connected) {
      return 'connection_coordination';
    }
    
    // Mixed connection state (some connected, some not)
    if (connectionState.mixed || (connectionState.statusSSE?.connected && connectionState.statusSSE?.connections === 0)) {
      return 'mixed_connection_state';
    }
    
    return 'connection_coordination';
  }

  /**
   * Normalize connection state for consistent storage
   */
  private normalizeConnectionState(rawState: any): SSEConnectionPattern['connectionState'] {
    return {
      statusSSE: {
        connected: rawState.statusSSE?.connected || false,
        connections: rawState.statusSSE?.connections || 0,
        endpoint: rawState.statusSSE?.endpoint || '/api/status/stream'
      },
      terminalSSE: {
        connected: rawState.terminalSSE?.connected || false,
        connections: rawState.terminalSSE?.connections || 0,
        instanceId: rawState.terminalSSE?.instanceId || null,
        endpoint: rawState.terminalSSE?.endpoint || '/api/claude/instances/{id}/terminal/stream'
      },
      pollingState: {
        active: rawState.pollingState?.active || false,
        instanceId: rawState.pollingState?.instanceId || null
      }
    };
  }

  /**
   * Calculate effectiveness score
   */
  private calculateEffectivenessScore(
    claudeConfidence: number,
    userSuccessRate: number,
    tddUsed: boolean
  ): number {
    const tddFactor = tddUsed ? 1.2 : 1.0;
    return (userSuccessRate / Math.max(claudeConfidence, 0.1)) * tddFactor;
  }

  /**
   * Store pattern to file system
   */
  private async storePattern(pattern: SSEConnectionPattern): Promise<void> {
    const filename = `${pattern.id}.json`;
    const filepath = path.join(this.patternDir, filename);
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(pattern, null, 2));
    } catch (error) {
      console.error('Failed to store SSE pattern:', error);
    }
  }

  /**
   * Analyze patterns for common failure modes
   */
  public analyzePatterns(): {
    totalPatterns: number;
    failureModes: Record<string, number>;
    commonCauses: string[];
    recommendations: string[];
  } {
    const analysis = {
      totalPatterns: this.patterns.length,
      failureModes: {} as Record<string, number>,
      commonCauses: [] as string[],
      recommendations: [] as string[]
    };

    // Count failure modes
    this.patterns.forEach(pattern => {
      analysis.failureModes[pattern.failureMode] = 
        (analysis.failureModes[pattern.failureMode] || 0) + 1;
    });

    // Identify common causes
    if (analysis.failureModes['status_broadcast_zero'] > 0) {
      analysis.commonCauses.push('Status SSE endpoint has zero active connections');
    }
    
    if (analysis.failureModes['status_sse_missing'] > 0) {
      analysis.commonCauses.push('Status SSE connection not established despite terminal connection');
    }
    
    if (analysis.failureModes['connection_coordination'] > 0) {
      analysis.commonCauses.push('Coordination issues between status and terminal streams');
    }

    // Generate recommendations
    analysis.recommendations.push('Implement connection health checks for both status and terminal SSE endpoints');
    analysis.recommendations.push('Add timeout detection for UI stuck in "starting" status');
    analysis.recommendations.push('Create fallback mechanisms when status SSE fails but terminal SSE succeeds');
    analysis.recommendations.push('Implement automatic reconnection with exponential backoff for status SSE');
    
    return analysis;
  }

  /**
   * Get patterns by failure mode
   */
  public getPatternsByFailureMode(failureMode: SSEConnectionPattern['failureMode']): SSEConnectionPattern[] {
    return this.patterns.filter(pattern => pattern.failureMode === failureMode);
  }

  /**
   * Export patterns for neural training
   */
  public exportForNeuralTraining(): {
    trainingData: any[];
    metadata: {
      totalPatterns: number;
      exportTimestamp: string;
      version: string;
    };
  } {
    return {
      trainingData: this.patterns.map(pattern => ({
        input: {
          failureMode: pattern.failureMode,
          connectionState: pattern.connectionState,
          contextualData: pattern.contextualData
        },
        output: {
          effectiveness: pattern.effectiveness,
          recommendations: this.generateRecommendationsForPattern(pattern)
        }
      })),
      metadata: {
        totalPatterns: this.patterns.length,
        exportTimestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  private generateRecommendationsForPattern(pattern: SSEConnectionPattern): string[] {
    const recommendations = [];
    
    switch (pattern.failureMode) {
      case 'status_broadcast_zero':
        recommendations.push('Check status SSE endpoint connection count');
        recommendations.push('Verify status broadcasting is active');
        recommendations.push('Implement status connection recovery');
        break;
        
      case 'status_sse_missing':
        recommendations.push('Ensure status SSE connection is established alongside terminal SSE');
        recommendations.push('Add status connection validation in frontend');
        recommendations.push('Implement dual-connection monitoring');
        break;
        
      case 'connection_coordination':
        recommendations.push('Synchronize status and terminal connection states');
        recommendations.push('Add connection state validation');
        recommendations.push('Implement coordinated connection recovery');
        break;
        
      default:
        recommendations.push('Review connection architecture');
        recommendations.push('Implement comprehensive connection monitoring');
    }
    
    return recommendations;
  }

  /**
   * Update connection state for monitoring
   */
  public updateConnectionState(instanceId: string, state: any): void {
    this.connectionStates.set(instanceId, {
      ...state,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current connection states
   */
  public getConnectionStates(): Map<string, any> {
    return this.connectionStates;
  }

  /**
   * Load existing patterns from storage
   */
  public async loadExistingPatterns(): Promise<void> {
    try {
      const files = fs.readdirSync(this.patternDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const filepath = path.join(this.patternDir, file);
        const data = fs.readFileSync(filepath, 'utf-8');
        const pattern = JSON.parse(data) as SSEConnectionPattern;
        this.patterns.push(pattern);
      }
      
      console.log(`📚 Loaded ${this.patterns.length} existing SSE connection patterns`);
    } catch (error) {
      console.error('Failed to load existing patterns:', error);
    }
  }
}

export { SSEConnectionPatternDetector, SSEConnectionPattern, SSETriggerCondition };