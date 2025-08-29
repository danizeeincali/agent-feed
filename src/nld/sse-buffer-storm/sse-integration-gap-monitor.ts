/**
 * NLD SSE Integration Gap Monitor
 * 
 * Monitors the critical gap between implemented helper functions
 * and their actual integration with live SSE endpoints
 */

import { EventEmitter } from 'events';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface IntegrationGapPattern {
  id: string;
  timestamp: number;
  pattern_type: 'HELPER_NOT_INTEGRATED' | 'ENDPOINT_BYPASSES_HELPER' | 'POSITION_TRACKING_IGNORED' | 'INCREMENTAL_LOGIC_UNUSED';
  helper_function: string;
  actual_endpoint: string;
  expected_behavior: string;
  actual_behavior: string;
  integration_score: number; // 0-1, how well integrated
  failure_impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tdd_prevention: string;
}

export class SSEIntegrationGapMonitor extends EventEmitter {
  private gapPatterns: IntegrationGapPattern[] = [];
  private codebaseAnalysis: Map<string, any> = new Map();
  private monitoringActive = false;
  private storageDir: string;

  constructor(storageDir = '/workspaces/agent-feed/src/nld/sse-buffer-storm/patterns') {
    super();
    this.storageDir = storageDir;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.monitoringActive = true;
    
    // Analyze codebase for integration gaps every 5 seconds
    setInterval(() => {
      if (this.monitoringActive) {
        this.analyzeCodebaseIntegration();
      }
    }, 5000);

    // Monitor runtime integration gaps every 2 seconds
    setInterval(() => {
      if (this.monitoringActive) {
        this.monitorRuntimeIntegration();
      }
    }, 2000);
  }

  /**
   * Analyze codebase for integration gaps between helpers and endpoints
   */
  private analyzeCodebaseIntegration(): void {
    try {
      // Find SSE helper functions
      const helperFunctions = this.findSSEHelperFunctions();
      
      // Find actual SSE endpoints
      const sseEndpoints = this.findSSEEndpoints();
      
      // Check integration between helpers and endpoints
      this.checkIntegrationGaps(helperFunctions, sseEndpoints);
      
    } catch (error) {
      console.warn('[NLD Integration Monitor] Error analyzing codebase:', error);
    }
  }

  private findSSEHelperFunctions(): Array<{name: string, file: string, content: string}> {
    try {
      // Search for SSE helper functions that handle incremental output
      const searchCommand = `find /workspaces/agent-feed -name "*.ts" -o -name "*.js" | xargs grep -l "incremental\\|position.*tracking\\|buffer.*slice\\|SSE.*helper" 2>/dev/null || true`;
      const files = execSync(searchCommand, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
      
      const helpers: Array<{name: string, file: string, content: string}> = [];
      
      for (const file of files) {
        try {
          const content = execSync(`cat "${file}"`, { encoding: 'utf8' });
          
          // Look for functions that handle incremental data
          const functionMatches = content.match(/(?:function\s+|const\s+|export\s+(?:function\s+)?)\w+.*(?:incremental|position|slice|buffer)/gi);
          
          if (functionMatches) {
            functionMatches.forEach(match => {
              helpers.push({
                name: match.split(/\s+/)[1] || 'anonymous',
                file,
                content: match
              });
            });
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
      
      return helpers;
    } catch (error) {
      return [];
    }
  }

  private findSSEEndpoints(): Array<{path: string, file: string, content: string}> {
    try {
      // Find actual SSE endpoints
      const searchCommand = `find /workspaces/agent-feed -name "*.ts" -o -name "*.js" | xargs grep -l "res\\.write\\|response\\.write\\|sse\\|Server.*Sent.*Events" 2>/dev/null || true`;
      const files = execSync(searchCommand, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
      
      const endpoints: Array<{path: string, file: string, content: string}> = [];
      
      for (const file of files) {
        try {
          const content = execSync(`cat "${file}"`, { encoding: 'utf8' });
          
          // Look for actual SSE response writing
          const endpointMatches = content.match(/res\.write|response\.write|\.send\(.*sse/gi);
          
          if (endpointMatches) {
            // Extract route path if possible
            const routeMatch = content.match(/(?:app\.|router\.)(?:get|post|put)\s*\(\s*['"`]([^'"`]+)['"`]/);
            const path = routeMatch ? routeMatch[1] : 'unknown-endpoint';
            
            endpoints.push({
              path,
              file,
              content: content.substring(0, 1000) // First 1000 chars for analysis
            });
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
      
      return endpoints;
    } catch (error) {
      return [];
    }
  }

  private checkIntegrationGaps(
    helpers: Array<{name: string, file: string, content: string}>, 
    endpoints: Array<{path: string, file: string, content: string}>
  ): void {
    
    for (const helper of helpers) {
      let isIntegrated = false;
      let integrationScore = 0;
      
      // Check if any endpoint calls this helper
      for (const endpoint of endpoints) {
        if (endpoint.content.includes(helper.name)) {
          isIntegrated = true;
          integrationScore += 0.5;
        }
        
        // Check if endpoint implements similar logic (possible duplicate implementation)
        if (endpoint.content.includes('incremental') || endpoint.content.includes('position')) {
          integrationScore += 0.3;
        }
      }
      
      // CRITICAL PATTERN: Helper exists but not integrated
      if (!isIntegrated && helpers.length > 0) {
        this.recordIntegrationGap({
          pattern_type: 'HELPER_NOT_INTEGRATED',
          helper_function: helper.name,
          actual_endpoint: 'multiple-endpoints',
          expected_behavior: 'Helper function called by SSE endpoints for incremental output',
          actual_behavior: 'Endpoints send full buffer without calling helper functions',
          integration_score: 0,
          failure_impact: 'CRITICAL',
          tdd_prevention: 'Integration tests must validate actual endpoint calls to helper functions'
        });
      }
      
      // HIGH PATTERN: Low integration score indicates partial implementation
      else if (integrationScore < 0.5) {
        this.recordIntegrationGap({
          pattern_type: 'ENDPOINT_BYPASSES_HELPER',
          helper_function: helper.name,
          actual_endpoint: 'detected-endpoints',
          expected_behavior: 'Full integration of helper logic in all SSE endpoints',
          actual_behavior: 'Partial or incomplete integration leading to buffer storms',
          integration_score: integrationScore,
          failure_impact: 'HIGH',
          tdd_prevention: 'TDD must test helper function integration with all actual endpoints'
        });
      }
    }
  }

  private monitorRuntimeIntegration(): void {
    // Monitor for runtime patterns that indicate integration gaps
    // This would be enhanced with actual runtime monitoring hooks
    
    const runtimePattern = this.detectRuntimeGaps();
    if (runtimePattern) {
      this.recordIntegrationGap(runtimePattern);
    }
  }

  private detectRuntimeGaps(): Partial<IntegrationGapPattern> | null {
    // Placeholder for runtime gap detection
    // In a real implementation, this would hook into the running server
    // to monitor actual SSE message patterns
    
    return null;
  }

  private recordIntegrationGap(gapData: Partial<IntegrationGapPattern>): void {
    const pattern: IntegrationGapPattern = {
      id: `integration-gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      pattern_type: gapData.pattern_type || 'HELPER_NOT_INTEGRATED',
      helper_function: gapData.helper_function || 'unknown-helper',
      actual_endpoint: gapData.actual_endpoint || 'unknown-endpoint',
      expected_behavior: gapData.expected_behavior || '',
      actual_behavior: gapData.actual_behavior || '',
      integration_score: gapData.integration_score || 0,
      failure_impact: gapData.failure_impact || 'HIGH',
      tdd_prevention: gapData.tdd_prevention || 'Add integration tests between helpers and endpoints'
    };

    this.gapPatterns.push(pattern);
    this.persistGapPattern(pattern);
    
    this.emit('integrationGapDetected', pattern);

    console.log(`[NLD Integration Gap] DETECTED: ${pattern.pattern_type} in ${pattern.helper_function}`);
  }

  private persistGapPattern(pattern: IntegrationGapPattern): void {
    const patternFile = join(this.storageDir, 'integration-gap-patterns.jsonl');
    require('fs').appendFileSync(patternFile, JSON.stringify(pattern) + '\n', { flag: 'a' });
  }

  /**
   * Export TDD prevention strategies based on detected gaps
   */
  public exportTDDPreventionStrategies(): void {
    const strategies = {
      integration_gap_prevention: [
        {
          pattern: 'HELPER_NOT_INTEGRATED',
          strategy: 'Write integration tests that call actual endpoints and verify helper function usage',
          test_example: 'expect(mockHelper).toHaveBeenCalledBy(actualSSEEndpoint)'
        },
        {
          pattern: 'ENDPOINT_BYPASSES_HELPER',
          strategy: 'Test-driven development must verify helper integration before claiming success',
          test_example: 'integration_test: POST /sse-endpoint -> verify incremental output using helper'
        },
        {
          pattern: 'POSITION_TRACKING_IGNORED',
          strategy: 'Unit tests must validate position advancement in real SSE streaming scenarios',
          test_example: 'expect(sseStream.position).toBeGreaterThan(previousPosition)'
        }
      ],
      neural_training_insights: {
        common_failure_pattern: 'Implementation without Integration',
        tdd_improvement_needed: 'Integration testing between components',
        effectiveness_gap: 'Helper functions tested in isolation fail in real endpoints'
      },
      claude_flow_export: {
        patterns_detected: this.gapPatterns.length,
        critical_gaps: this.gapPatterns.filter(p => p.failure_impact === 'CRITICAL').length,
        average_integration_score: this.gapPatterns.length > 0 
          ? this.gapPatterns.reduce((sum, p) => sum + p.integration_score, 0) / this.gapPatterns.length 
          : 0,
        ready_for_neural_training: true
      }
    };

    const exportFile = join(this.storageDir, 'tdd-prevention-strategies.json');
    writeFileSync(exportFile, JSON.stringify(strategies, null, 2));

    console.log(`[NLD Integration Gap] TDD prevention strategies exported: ${exportFile}`);
  }

  /**
   * Get monitoring statistics
   */
  public getGapAnalysisStats() {
    return {
      total_gaps_detected: this.gapPatterns.length,
      critical_gaps: this.gapPatterns.filter(p => p.failure_impact === 'CRITICAL').length,
      helper_not_integrated: this.gapPatterns.filter(p => p.pattern_type === 'HELPER_NOT_INTEGRATED').length,
      endpoint_bypasses: this.gapPatterns.filter(p => p.pattern_type === 'ENDPOINT_BYPASSES_HELPER').length,
      average_integration_score: this.gapPatterns.length > 0 
        ? this.gapPatterns.reduce((sum, p) => sum + p.integration_score, 0) / this.gapPatterns.length 
        : 0
    };
  }

  public stopMonitoring(): void {
    this.monitoringActive = false;
  }
}

// Export singleton instance
export const sseIntegrationGapMonitor = new SSEIntegrationGapMonitor();