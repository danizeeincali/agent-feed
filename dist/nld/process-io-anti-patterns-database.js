"use strict";
/**
 * NLD Process I/O Capture Anti-Patterns Database
 * Captures failure patterns in stdout/stderr event handling for Claude processes
 * Generated: 2025-08-27
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessIOAntiPatternsDatabase = void 0;
class ProcessIOAntiPatternsDatabase {
    patterns = new Map();
    constructor() {
        this.initializePatterns();
    }
    initializePatterns() {
        // Pattern 1: stdout.on('data') Present But Not Firing
        this.patterns.set('STDOUT_HANDLER_SILENT', {
            patternId: 'STDOUT_HANDLER_SILENT',
            patternName: 'Stdout Handler Present But Silent',
            description: 'Process spawns with real PID, stdout.on("data") handlers exist, but no output reaches frontend despite process being active',
            failureSymptoms: [
                'Process spawns successfully with real PID',
                'Input forwarding works correctly',
                'stdout.on("data") handler exists in code',
                'No stdout data events fired',
                'Frontend waits indefinitely for output',
                'SSE stream shows only connection messages'
            ],
            rootCauseAnalysis: 'Process stdio configuration or Claude process initialization sequence prevents stdout data flow',
            commonTriggers: [
                'Claude process startup sequence not complete',
                'stdio: ["pipe", "pipe", "pipe"] misconfiguration',
                'Process environment variables missing',
                'Working directory permission issues',
                'Claude binary not in PATH or corrupted'
            ],
            detectionSignatures: [
                'claudeProcess.stdout.on("data", callback) defined',
                'claudeProcess.pid exists and > 0',
                'processInfo.status === "running"',
                'broadcastToAllConnections never called with stdout data',
                'Frontend SSE connection established but no "output" type messages'
            ],
            impactAssessment: {
                severity: 'critical',
                userExperience: 'Complete failure - user cannot interact with Claude',
                businessImpact: 'Total product failure for core functionality'
            },
            tddPreventionStrategy: 'Test process stdout immediately after spawn with timeout assertion',
            realWorldExample: {
                file: '/workspaces/agent-feed/simple-backend.js',
                lineNumbers: [231, 244],
                codeSnippet: `claudeProcess.stdout.on('data', (data) => {
    const realOutput = data.toString('utf8');
    console.log(\`📤 REAL Claude \${instanceId} stdout:\`, realOutput);
    
    broadcastToAllConnections(instanceId, {
      type: 'output',
      data: realOutput,
      // ... rest of broadcast
    });
  });`,
                actualBehavior: 'Handler defined but callback never executed - no stdout data events',
                expectedBehavior: 'Immediate stdout data flow from Claude process after spawning'
            }
        });
        // Pattern 2: SSE Broadcasting Gap
        this.patterns.set('SSE_OUTPUT_GAP', {
            patternId: 'SSE_OUTPUT_GAP',
            patternName: 'SSE Output Broadcasting Gap',
            description: 'Process output captured but SSE broadcasting fails to reach frontend connections',
            failureSymptoms: [
                'stdout.on("data") callback executes',
                'Console logs show process output',
                'SSE connections established',
                'Frontend receives connection events but no output events',
                'broadcastToAllConnections called but messages not delivered'
            ],
            rootCauseAnalysis: 'SSE connection management or message serialization failure preventing output delivery',
            commonTriggers: [
                'Dead SSE connections not cleaned up properly',
                'Connection tracking maps out of sync',
                'JSON serialization errors in output data',
                'SSE connection closed during output burst',
                'Connection established after process output starts'
            ],
            detectionSignatures: [
                'activeSSEConnections.get(instanceId).length > 0',
                'broadcastToAllConnections function called',
                'Console shows "📤 REAL Claude stdout:" logs',
                'Frontend receives "connected" type but no "output" type messages',
                'Connection write() throws errors or silent failures'
            ],
            impactAssessment: {
                severity: 'high',
                userExperience: 'User sees process running but no output - appears broken',
                businessImpact: 'Core functionality appears non-functional despite working backend'
            },
            tddPreventionStrategy: 'Mock SSE connections and verify output message delivery with timing tests',
            realWorldExample: {
                file: '/workspaces/agent-feed/simple-backend.js',
                lineNumbers: [285, 306],
                codeSnippet: `function broadcastToAllConnections(instanceId, message) {
  const connections = activeSSEConnections.get(instanceId) || [];
  const data = \`data: \${JSON.stringify(message)}\\n\\n\`;
  
  const activeConnections = connections.filter((connection) => {
    try {
      if (connection.destroyed || connection.writableEnded) {
        return false;
      }
      connection.write(data);
      return true;
    } catch (error) {
      // Connection errors handled but may cause silent failures
      return false;
    }
  });
}`,
                actualBehavior: 'Connections filtered out or write() fails silently',
                expectedBehavior: 'All active connections receive output messages immediately'
            }
        });
        // Pattern 3: Process Initialization Race Condition
        this.patterns.set('PROCESS_INIT_RACE', {
            patternId: 'PROCESS_INIT_RACE',
            patternName: 'Process Initialization Race Condition',
            description: 'SSE connection established before process stdout handlers are ready, causing missed initial output',
            failureSymptoms: [
                'Process spawns successfully',
                'SSE connection established immediately',
                'Initial Claude output missed',
                'Subsequent commands work correctly',
                'Missing welcome/prompt messages'
            ],
            rootCauseAnalysis: 'Timing issue where frontend connects to SSE before process stdout handlers are fully configured',
            commonTriggers: [
                'setupProcessHandlers called after SSE connection',
                'Process "spawn" event delayed',
                'Claude process slow startup',
                'Handler registration timing issues',
                'Async process creation vs sync SSE establishment'
            ],
            detectionSignatures: [
                'Process PID exists immediately after spawn()',
                'SSE connection established within 100ms',
                'First output messages missing from frontend',
                'processInfo.status === "starting" when SSE connects',
                'setTimeout delay hack present in code'
            ],
            impactAssessment: {
                severity: 'medium',
                userExperience: 'Missing initial Claude messages but functionality works',
                businessImpact: 'Poor first impression but core functionality intact'
            },
            tddPreventionStrategy: 'Test SSE connection timing vs process readiness with controlled delays',
            realWorldExample: {
                file: '/workspaces/agent-feed/simple-backend.js',
                lineNumbers: [208, 228],
                codeSnippet: `setTimeout(() => {
  broadcastInstanceStatus(instanceId, 'running', {
    pid: claudeProcess.pid,
    command: processInfo.command
  });
}, 100); // 100ms delay ensures connections are established

// Process timeout detection
setTimeout(() => {
  if (processInfo.status === 'starting' && claudeProcess.pid && !claudeProcess.killed) {
    console.log(\`⏰ Process \${instanceId} timeout reached, assuming running\`);
    processInfo.status = 'running';
    broadcastInstanceStatus(instanceId, 'running', {
      pid: claudeProcess.pid,
      command: processInfo.command,
      note: 'Status set by timeout (process ready)'
    });
  }
}, 3000);`,
                actualBehavior: 'Manual timeout hacks to handle race conditions',
                expectedBehavior: 'Proper event-driven process readiness detection'
            }
        });
    }
    getAllPatterns() {
        return Array.from(this.patterns.values());
    }
    getPatternById(patternId) {
        return this.patterns.get(patternId);
    }
    getPatternsBySeverity(severity) {
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.impactAssessment.severity === severity);
    }
    searchPatterns(query) {
        const queryLower = query.toLowerCase();
        return Array.from(this.patterns.values())
            .filter(pattern => pattern.description.toLowerCase().includes(queryLower) ||
            pattern.failureSymptoms.some(symptom => symptom.toLowerCase().includes(queryLower)) ||
            pattern.patternName.toLowerCase().includes(queryLower));
    }
    recordNewPattern(pattern) {
        this.patterns.set(pattern.patternId, pattern);
    }
    generatePreventionReport() {
        const patterns = Array.from(this.patterns.values());
        const critical = patterns.filter(p => p.impactAssessment.severity === 'critical');
        return {
            totalPatterns: patterns.length,
            criticalPatterns: critical.length,
            tddCoverage: patterns.filter(p => p.tddPreventionStrategy.length > 0).length / patterns.length,
            recommendations: [
                'Implement process readiness test before SSE connection establishment',
                'Add stdout/stderr output verification tests with timeout assertions',
                'Create SSE connection lifecycle tests with message delivery verification',
                'Build race condition tests for process initialization timing',
                'Add integration tests for end-to-end output flow validation'
            ]
        };
    }
}
exports.ProcessIOAntiPatternsDatabase = ProcessIOAntiPatternsDatabase;
//# sourceMappingURL=process-io-anti-patterns-database.js.map