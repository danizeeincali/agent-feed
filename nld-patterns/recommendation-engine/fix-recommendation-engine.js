#!/usr/bin/env node

/**
 * NLD Fix Recommendation Engine
 * Generates actionable fix recommendations based on detected WebSocket patterns
 * Integrates with TDD strategies and claude-flow neural patterns
 */

const fs = require('fs');
const path = require('path');

class FixRecommendationEngine {
  constructor(options = {}) {
    this.patterns = this.loadPatterns();
    this.successPatterns = this.loadSuccessPatterns();
    this.tddStrategies = this.loadTDDStrategies();
    this.historicalFixes = this.loadHistoricalFixes();
    this.config = {
      outputDir: options.outputDir || '/workspaces/agent-feed/nld-patterns',
      priorityWeights: {
        CRITICAL: 1.0,
        HIGH: 0.8,
        MEDIUM: 0.6,
        LOW: 0.4
      },
      ...options
    };
  }

  loadPatterns() {
    const patternsPath = path.join(__dirname, '../websocket-failures/pattern-database.json');
    try {
      return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load failure patterns:', error.message);
      return { patterns: {} };
    }
  }

  loadSuccessPatterns() {
    const successPath = path.join(__dirname, '../success-patterns/stable-websocket-patterns.json');
    try {
      return JSON.parse(fs.readFileSync(successPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load success patterns:', error.message);
      return { success_patterns: {} };
    }
  }

  loadTDDStrategies() {
    return {
      "test_first_fixes": {
        "websocket_stability": {
          "description": "Write tests for WebSocket stability before implementing fixes",
          "test_patterns": [
            "Test connection persists through API calls",
            "Test reconnection uses exponential backoff", 
            "Test cleanup only happens on explicit disconnect"
          ]
        }
      },
      "red_green_refactor": {
        "failure_reproduction": "Create failing test that reproduces the pattern",
        "minimal_fix": "Implement minimal code to make test pass",
        "refactor_improve": "Improve code while keeping tests green"
      }
    };
  }

  loadHistoricalFixes() {
    // Load historical fix success rates and effectiveness data
    return {
      "decouple_lifecycle": {
        "success_rate": 0.95,
        "avg_implementation_time": "2 hours",
        "complexity": "MEDIUM",
        "regression_risk": "LOW"
      },
      "exponential_backoff": {
        "success_rate": 0.88,
        "avg_implementation_time": "1 hour", 
        "complexity": "LOW",
        "regression_risk": "VERY_LOW"
      },
      "connection_state_management": {
        "success_rate": 0.92,
        "avg_implementation_time": "4 hours",
        "complexity": "HIGH", 
        "regression_risk": "MEDIUM"
      }
    };
  }

  generateRecommendations(detectedPattern, context = {}) {
    const recommendations = {
      pattern_id: detectedPattern.patternId,
      timestamp: new Date().toISOString(),
      priority: this.calculatePriority(detectedPattern),
      immediate_actions: [],
      implementation_plan: {},
      test_strategy: {},
      prevention_measures: [],
      success_criteria: [],
      estimated_effort: null,
      risk_assessment: {}
    };

    // Get pattern details
    const patternKey = Object.keys(this.patterns.patterns).find(key => 
      this.patterns.patterns[key].id === detectedPattern.patternId
    );
    
    if (!patternKey) {
      return this.generateGenericRecommendation(detectedPattern);
    }

    const pattern = this.patterns.patterns[patternKey];
    
    // Generate specific recommendations based on pattern
    switch (detectedPattern.patternId) {
      case 'WS-001':
        return this.generatePrematureCleanupFix(pattern, detectedPattern, context);
      case 'WS-002':
        return this.generatePollingStormFix(pattern, detectedPattern, context);
      case 'WS-003':
        return this.generateAPICloseKillsWebSocketFix(pattern, detectedPattern, context);
      default:
        return this.generateGenericRecommendation(detectedPattern);
    }
  }

  generatePrematureCleanupFix(pattern, detection, context) {
    return {
      pattern_id: detection.patternId,
      pattern_name: "WebSocket Premature Cleanup",
      priority: "HIGH",
      confidence: detection.confidence,
      
      immediate_actions: [
        {
          action: "Stop WebSocket cleanup in API process handlers",
          code_location: "simple-backend.js - claudeApiProcess.on('close') handler",
          specific_change: "Remove WebSocket connection cleanup from process close handler",
          urgency: "IMMEDIATE"
        },
        {
          action: "Verify current connection state",
          command: "Check WebSocket connections after API calls complete",
          validation: "Ensure connection count remains > 0"
        }
      ],

      implementation_plan: {
        step_1: {
          description: "Write TDD test for connection persistence",
          test_code: `
// Test: WebSocket should persist after API completion
test('WebSocket connection survives API completion', async () => {
  const ws = new WebSocket(WS_URL);
  await waitForConnection(ws);
  
  // Make API call
  const response = await fetch('/api/claude/instances', { 
    method: 'POST', 
    body: JSON.stringify({ command: 'claude --version' })
  });
  
  expect(response.ok).toBe(true);
  await waitFor(1000); // Wait for potential cleanup
  
  // WebSocket should still be connected
  expect(ws.readyState).toBe(WebSocket.OPEN);
  expect(getConnectionCount()).toBeGreaterThan(0);
});`,
          estimated_time: "30 minutes"
        },
        
        step_2: {
          description: "Remove incorrect cleanup logic",
          code_changes: [
            {
              file: "simple-backend.js",
              change_type: "REMOVE",
              location: "claudeApiProcess.on('close') handler", 
              remove_code: "// Remove WebSocket cleanup logic from here",
              rationale: "WebSocket lifecycle should be independent of API process lifecycle"
            }
          ],
          estimated_time: "15 minutes"
        },

        step_3: {
          description: "Implement proper WebSocket lifecycle management",
          code_changes: [
            {
              file: "simple-backend.js",
              change_type: "MODIFY",
              location: "WebSocket connection handler",
              add_code: `
// Only cleanup WebSocket on explicit client disconnect
ws.on('close', (code, reason) => {
  console.log(\`WebSocket disconnected: \${code} - \${reason}\`);
  // Remove from active connections
  const index = connections.indexOf(ws);
  if (index > -1) {
    connections.splice(index, 1);
    console.log(\`🚑 Connection closed by client. Active connections: \${connections.length}\`);
  }
});

// Remove any cleanup from API process handlers
// API completion should NOT affect WebSocket connections`,
              rationale: "Explicit disconnect handling only"
            }
          ],
          estimated_time: "45 minutes"
        },

        step_4: {
          description: "Validate fix with comprehensive testing",
          validation_tests: [
            "Multiple API calls with same WebSocket connection",
            "API process restart doesn't kill WebSocket", 
            "Only client disconnect closes WebSocket",
            "No 'dead connection' messages during normal operation"
          ],
          estimated_time: "30 minutes"
        }
      },

      test_strategy: {
        tdd_approach: "Test-first development",
        test_categories: [
          "Connection persistence tests",
          "Lifecycle independence tests", 
          "Cleanup behavior tests",
          "Regression prevention tests"
        ],
        success_criteria: [
          "All tests pass",
          "WebSocket survives API operations",
          "No premature cleanup events",
          "Connection count remains stable"
        ]
      },

      prevention_measures: [
        {
          measure: "Architectural separation",
          description: "Ensure WebSocket and API lifecycles are completely independent",
          implementation: "Separate connection management from process management"
        },
        {
          measure: "Explicit disconnect handling",
          description: "Only close connections on explicit client disconnect events",
          implementation: "Use ws.on('close') exclusively for cleanup"
        },
        {
          measure: "Connection health monitoring", 
          description: "Monitor connection health independently of API status",
          implementation: "Periodic ping/pong or heartbeat mechanism"
        }
      ],

      success_criteria: [
        "WebSocket connections persist through API operations",
        "Zero '🚑 Removing dead connection' messages during normal use",
        "Connection count remains > 0 after API calls",
        "Tests pass consistently across multiple runs"
      ],

      estimated_effort: {
        total_time: "2 hours",
        complexity: "MEDIUM", 
        risk_level: "LOW",
        success_probability: 0.95
      },

      risk_assessment: {
        regression_risk: "LOW",
        breaking_changes: "None expected",
        rollback_plan: "Restore previous cleanup logic if issues occur",
        monitoring_required: ["Connection count", "Client disconnect events", "API success rates"]
      }
    };
  }

  generatePollingStormFix(pattern, detection, context) {
    return {
      pattern_id: detection.patternId,
      pattern_name: "Frontend Polling Storm",
      priority: "HIGH",
      confidence: detection.confidence,

      immediate_actions: [
        {
          action: "Implement rate limiting on client side",
          code_location: "Frontend WebSocket service",
          specific_change: "Add exponential backoff for reconnection attempts",
          urgency: "HIGH"
        },
        {
          action: "Add server-side rate limiting",
          code_location: "API endpoints",
          specific_change: "Implement request rate limiting middleware"
        }
      ],

      implementation_plan: {
        step_1: {
          description: "Create exponential backoff mechanism",
          code_changes: [
            {
              file: "frontend/src/services/WebSocketService.ts",
              change_type: "ADD",
              add_code: `
class ExponentialBackoff {
  constructor(initialDelay = 1000, maxDelay = 30000, multiplier = 2) {
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
    this.multiplier = multiplier;
    this.currentDelay = initialDelay;
    this.attempts = 0;
  }

  getDelay() {
    const delay = Math.min(
      this.currentDelay + Math.random() * 1000, // Add jitter
      this.maxDelay
    );
    this.currentDelay *= this.multiplier;
    this.attempts++;
    return delay;
  }

  reset() {
    this.currentDelay = this.initialDelay;
    this.attempts = 0;
  }
}`
            }
          ]
        },

        step_2: {
          description: "Implement circuit breaker pattern",
          code_changes: [
            {
              file: "frontend/src/services/WebSocketService.ts", 
              change_type: "ADD",
              add_code: `
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttemptTime = 0;
  }

  canAttempt() {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
    }
  }
}`
            }
          ]
        }
      },

      success_criteria: [
        "API call rate < 10 requests per minute during reconnection",
        "Exponential backoff observable in network requests",
        "Circuit breaker activates after repeated failures", 
        "Server CPU/memory remains stable during connection issues"
      ],

      estimated_effort: {
        total_time: "3 hours",
        complexity: "MEDIUM",
        risk_level: "LOW", 
        success_probability: 0.88
      }
    };
  }

  generateAPICloseKillsWebSocketFix(pattern, detection, context) {
    return {
      pattern_id: detection.patternId,
      pattern_name: "API Close Kills WebSocket",
      priority: "CRITICAL",
      confidence: detection.confidence,

      immediate_actions: [
        {
          action: "Remove WebSocket cleanup from claudeApiProcess.on('close')",
          code_location: "simple-backend.js - process close handler",
          specific_change: "Delete WebSocket connection cleanup code",
          urgency: "CRITICAL"
        }
      ],

      implementation_plan: {
        step_1: {
          description: "Identify and remove incorrect cleanup",
          code_changes: [
            {
              file: "simple-backend.js",
              change_type: "REMOVE",
              location: "claudeApiProcess.on('close', ...)",
              remove_pattern: "connections.forEach|connections.splice|ws.close",
              rationale: "Process close should not affect WebSocket connections"
            }
          ]
        },

        step_2: {
          description: "Implement proper connection lifecycle",
          code_changes: [
            {
              file: "simple-backend.js", 
              change_type: "MODIFY",
              add_code: `
// WebSocket connections are independent of API processes
// Only client disconnect should trigger cleanup
wss.on('connection', (ws) => {
  connections.push(ws);
  console.log(\`New WebSocket connection. Total: \${connections.length}\`);
  
  ws.on('close', () => {
    const index = connections.indexOf(ws);
    if (index > -1) {
      connections.splice(index, 1);
      console.log(\`WebSocket closed by client. Total: \${connections.length}\`);
    }
  });
});

// API process handlers should NOT touch WebSocket connections
claudeApiProcess.on('close', (code) => {
  console.log(\`API process exited with code: \${code}\`);
  // NO WebSocket cleanup here!
});`
            }
          ]
        }
      },

      success_criteria: [
        "WebSocket count stays > 0 after API process completion",
        "API success followed by persistent WebSocket connection",
        "No connection drops correlated with process close events"
      ],

      estimated_effort: {
        total_time: "1 hour", 
        complexity: "LOW",
        risk_level: "VERY_LOW",
        success_probability: 0.98
      }
    };
  }

  generateGenericRecommendation(detection) {
    return {
      pattern_id: detection.patternId,
      pattern_name: "Generic Pattern",
      priority: "MEDIUM",
      confidence: detection.confidence,
      immediate_actions: [
        {
          action: "Investigate pattern details",
          description: "Review pattern database for specific guidance"
        }
      ],
      estimated_effort: {
        total_time: "Unknown",
        complexity: "UNKNOWN", 
        risk_level: "UNKNOWN",
        success_probability: 0.5
      }
    };
  }

  calculatePriority(detection) {
    const baseScore = this.config.priorityWeights[detection.severity] || 0.5;
    const confidenceWeight = detection.confidence || 0.5;
    
    return Math.min(baseScore * (1 + confidenceWeight), 1.0);
  }

  // Generate batch recommendations for multiple patterns
  generateBatchRecommendations(detections, context = {}) {
    const recommendations = detections.map(detection => 
      this.generateRecommendations(detection, context)
    );

    return {
      timestamp: new Date().toISOString(),
      total_patterns: detections.length,
      recommendations: recommendations,
      prioritized_actions: this.prioritizeActions(recommendations),
      estimated_total_effort: this.calculateTotalEffort(recommendations),
      success_probability: this.calculateOverallSuccessProbability(recommendations)
    };
  }

  prioritizeActions(recommendations) {
    const allActions = recommendations.flatMap(rec => 
      rec.immediate_actions?.map(action => ({
        ...action,
        pattern_id: rec.pattern_id,
        priority: rec.priority
      })) || []
    );

    return allActions.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      const urgencyOrder = { 'CRITICAL': 0, 'IMMEDIATE': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4 };
      
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  calculateTotalEffort(recommendations) {
    const totalHours = recommendations.reduce((sum, rec) => {
      if (rec.estimated_effort?.total_time) {
        const match = rec.estimated_effort.total_time.match(/(\d+(\.\d+)?)\s*hours?/i);
        return sum + (match ? parseFloat(match[1]) : 0);
      }
      return sum;
    }, 0);

    return {
      total_hours: totalHours,
      estimated_days: Math.ceil(totalHours / 8),
      complexity_distribution: this.getComplexityDistribution(recommendations)
    };
  }

  getComplexityDistribution(recommendations) {
    const distribution = {};
    recommendations.forEach(rec => {
      const complexity = rec.estimated_effort?.complexity || 'UNKNOWN';
      distribution[complexity] = (distribution[complexity] || 0) + 1;
    });
    return distribution;
  }

  calculateOverallSuccessProbability(recommendations) {
    if (recommendations.length === 0) return 0;
    
    const avgProbability = recommendations.reduce((sum, rec) => 
      sum + (rec.estimated_effort?.success_probability || 0.5), 0
    ) / recommendations.length;

    return avgProbability;
  }

  exportRecommendations(recommendations, filename = null) {
    const exportPath = filename || 
      path.join(this.config.outputDir, 'recommendations', `fix-recommendations-${Date.now()}.json`);
    
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    fs.writeFileSync(exportPath, JSON.stringify(recommendations, null, 2));
    
    return exportPath;
  }
}

// CLI Interface
if (require.main === module) {
  const engine = new FixRecommendationEngine();
  
  // Example usage
  const mockDetection = {
    patternId: 'WS-001',
    detected: true,
    confidence: 0.9,
    severity: 'HIGH',
    evidence: ['WebSocket cleanup in API close handler']
  };

  const recommendation = engine.generateRecommendations(mockDetection);
  console.log('Generated Recommendation:');
  console.log(JSON.stringify(recommendation, null, 2));

  // Export the recommendation
  const exportPath = engine.exportRecommendations(recommendation);
  console.log(`Exported to: ${exportPath}`);
}

module.exports = FixRecommendationEngine;