/**
 * Comprehensive Streaming Ticker Failure Pattern Database
 *
 * NLD Analysis Results: Real-world streaming ticker edge cases and prevention strategies
 * Generated from codebase analysis and failure pattern detection
 */

export interface FailurePattern {
  id: string;
  category: 'connection' | 'parsing' | 'animation' | 'memory' | 'race_condition' | 'background';
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: 'rare' | 'uncommon' | 'common' | 'frequent';
  description: string;
  manifestation: string;
  rootCause: string;
  preventionStrategy: string;
  detectionMethod: string;
  recoveryAction: string;
  userImpact: string;
  codeReferences: string[];
  testCases: string[];
  nlpTriggers: string[];
}

export interface StreamingTickerFailureDatabase {
  patterns: FailurePattern[];
  statistics: {
    totalPatterns: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byFrequency: Record<string, number>;
  };
  metadata: {
    analysisDate: string;
    codebaseVersion: string;
    analysisScope: string[];
  };
}

/**
 * CRITICAL FAILURE PATTERNS IDENTIFIED
 */
export const STREAMING_TICKER_FAILURE_PATTERNS: FailurePattern[] = [
  // CONNECTION TIMEOUT PATTERNS
  {
    id: 'SSE-TIMEOUT-001',
    category: 'connection',
    severity: 'high',
    frequency: 'common',
    description: 'EventSource heartbeat timeout causing connection drop',
    manifestation: 'Ticker stops updating, terminal becomes unresponsive, user sees stale data',
    rootCause: 'SSEConnectionManager heartbeatTimeout (60s) exceeded without heartbeat message',
    preventionStrategy: 'Implement adaptive heartbeat frequency based on network conditions, add connection health monitoring',
    detectionMethod: 'Monitor lastHeartbeat timestamp vs heartbeatTimeout threshold',
    recoveryAction: 'Automatic reconnection with exponential backoff, clear stale UI state',
    userImpact: 'High - Terminal appears frozen, user cannot interact with Claude instance',
    codeReferences: [
      'frontend/src/services/SSEConnectionManager.ts:347-359',
      'src/services/SSEEventStreamer.ts:528-544'
    ],
    testCases: ['Simulate network latency > 60s', 'Test heartbeat loss scenarios'],
    nlpTriggers: ['terminal stopped working', 'claude not responding', 'connection frozen']
  },

  {
    id: 'SSE-RECONNECT-002',
    category: 'connection',
    severity: 'critical',
    frequency: 'common',
    description: 'EventSource reconnection failure with exponential backoff overflow',
    manifestation: 'Connection fails permanently after 5 attempts, no recovery possible',
    rootCause: 'maxReconnectAttempts (5) reached with maxBackoffDelay (30s) causing permanent failure',
    preventionStrategy: 'Implement connection health scoring, allow manual reconnection, add connection diagnostics',
    detectionMethod: 'Track reconnectAttempts against maxReconnectAttempts limit',
    recoveryAction: 'Provide manual reconnect button, reset connection state, validate instance health',
    userImpact: 'Critical - Total loss of terminal functionality, requires page refresh',
    codeReferences: [
      'frontend/src/services/SSEConnectionManager.ts:304-315',
      'frontend/src/services/SSEConnectionManager.ts:320-333'
    ],
    testCases: ['Force 5 consecutive connection failures', 'Test backoff delay calculations'],
    nlpTriggers: ['terminal won\'t connect', 'connection failed permanently', 'can\'t reconnect']
  },

  {
    id: 'TERMINAL-VALIDATION-003',
    category: 'connection',
    severity: 'high',
    frequency: 'uncommon',
    description: 'Async instance validation timeout during connection',
    manifestation: 'Connection hangs indefinitely, no error message shown to user',
    rootCause: 'validateInstance() fetch request hangs without timeout, blocking connection flow',
    preventionStrategy: 'Add explicit timeout to instance validation requests, implement timeout handling',
    detectionMethod: 'Monitor validation request duration against expected threshold',
    recoveryAction: 'Cancel hanging validation, show timeout error, allow retry',
    userImpact: 'High - Terminal connection appears to be connecting forever',
    codeReferences: [
      'frontend/src/services/SSEConnectionManager.ts:370-383'
    ],
    testCases: ['Simulate slow /api/claude/instances response', 'Test network timeouts'],
    nlpTriggers: ['terminal stuck connecting', 'validation never completes', 'hangs on connect']
  },

  // PARSING EDGE CASES
  {
    id: 'PARSE-ESCAPE-004',
    category: 'parsing',
    severity: 'medium',
    frequency: 'frequent',
    description: 'Claude Code output with unfiltered ANSI escape sequences breaking ticker display',
    manifestation: 'Ticker shows raw escape sequences, formatting artifacts, cursor positioning codes',
    rootCause: 'Terminal output filtering not applied to streaming chunks before display',
    preventionStrategy: 'Apply ANSI escape sequence filtering to all streaming output, sanitize before rendering',
    detectionMethod: 'Scan output for ANSI escape patterns (/\x1b\[[0-9;]*[A-Za-z]/)',
    recoveryAction: 'Strip escape sequences, re-render clean output, log filtering events',
    userImpact: 'Medium - Confusing display, but functionality preserved',
    codeReferences: [
      'src/services/SSEEventStreamer.ts:425-443'
    ],
    testCases: ['Send output with cursor positioning', 'Test color escape sequences'],
    nlpTriggers: ['weird characters in output', 'escape sequences showing', 'garbled display']
  },

  {
    id: 'PARSE-JSON-005',
    category: 'parsing',
    severity: 'high',
    frequency: 'uncommon',
    description: 'Malformed JSON in SSE message data causing parsing failure',
    manifestation: 'Ticker stops updating on malformed message, subsequent messages lost',
    rootCause: 'JSON.parse() fails on corrupted SSE event data, breaks message handling',
    preventionStrategy: 'Implement robust JSON parsing with error recovery, validate message structure',
    detectionMethod: 'Catch JSON parsing exceptions, validate message schema',
    recoveryAction: 'Skip malformed message, log error, continue processing subsequent messages',
    userImpact: 'High - Ticker may stop working until reconnection',
    codeReferences: [
      'frontend/src/services/SSEConnectionManager.ts:204-211'
    ],
    testCases: ['Send truncated JSON data', 'Test invalid UTF-8 sequences'],
    nlpTriggers: ['ticker stopped updating', 'parsing error', 'malformed data']
  },

  {
    id: 'PARSE-INCREMENTAL-006',
    category: 'parsing',
    severity: 'medium',
    frequency: 'common',
    description: 'Incremental output position tracking desynchronization',
    manifestation: 'Duplicate content in ticker, missing chunks, incorrect output ordering',
    rootCause: 'outputPosition tracking mismatch between client and server state',
    preventionStrategy: 'Implement position validation, checksums for incremental data',
    detectionMethod: 'Compare expected vs actual output positions, validate chunk continuity',
    recoveryAction: 'Reset position tracking, request full output refresh',
    userImpact: 'Medium - Confusing output display, potential data loss',
    codeReferences: [
      'src/services/SSEEventStreamer.ts:296-316',
      'frontend/src/services/SSEConnectionManager.ts:365-368'
    ],
    testCases: ['Simulate position tracking errors', 'Test concurrent output streams'],
    nlpTriggers: ['duplicate output', 'missing chunks', 'output out of order']
  },

  // ANIMATION GLITCHES
  {
    id: 'ANIM-TYPING-007',
    category: 'animation',
    severity: 'low',
    frequency: 'common',
    description: 'Terminal typing animation conflicts with rapid output updates',
    manifestation: 'Jerky typing animation, character duplication, animation lag',
    rootCause: 'Multiple animation frames updating simultaneously with high-frequency output',
    preventionStrategy: 'Debounce animation updates, use RAF for smooth rendering',
    detectionMethod: 'Monitor animation frame rate, detect rendering bottlenecks',
    recoveryAction: 'Reset animation state, reduce update frequency',
    userImpact: 'Low - Visual annoyance, functionality not affected',
    codeReferences: [
      'frontend/src/components/TerminalView.tsx:302-309'
    ],
    testCases: ['Rapid output bursts', 'High-frequency streaming'],
    nlpTriggers: ['animation stuttering', 'typing looks weird', 'jerky display']
  },

  {
    id: 'ANIM-CURSOR-008',
    category: 'animation',
    severity: 'medium',
    frequency: 'uncommon',
    description: 'Cursor positioning conflicts during incremental updates',
    manifestation: 'Cursor appears in wrong position, ghost cursors, cursor disappears',
    rootCause: 'xterm.js cursor state conflicts with streaming output position updates',
    preventionStrategy: 'Synchronize cursor positioning with output updates, disable cursor during streaming',
    detectionMethod: 'Monitor cursor position consistency, validate against expected position',
    recoveryAction: 'Reset cursor state, refresh terminal display',
    userImpact: 'Medium - Confusing visual feedback, affects user perception',
    codeReferences: [
      'frontend/src/components/TerminalView.tsx:263-279'
    ],
    testCases: ['Rapid cursor movements', 'Concurrent streaming and input'],
    nlpTriggers: ['cursor in wrong place', 'cursor disappeared', 'multiple cursors']
  },

  // MEMORY LEAKS
  {
    id: 'MEM-CONNECTION-009',
    category: 'memory',
    severity: 'high',
    frequency: 'common',
    description: 'SSE connection objects not properly cleaned up',
    manifestation: 'Memory usage grows over time, browser becomes slow, eventual crash',
    rootCause: 'Event listeners and connection references not removed on disconnect',
    preventionStrategy: 'Implement proper cleanup in useEffect, remove all event listeners',
    detectionMethod: 'Monitor connection count growth, track memory usage patterns',
    recoveryAction: 'Force cleanup of stale connections, garbage collection triggers',
    userImpact: 'High - Progressive performance degradation, potential browser crash',
    codeReferences: [
      'frontend/src/hooks/useSSEConnection.ts:44-48',
      'src/services/SSEEventStreamer.ts:664-692'
    ],
    testCases: ['Multiple connect/disconnect cycles', 'Long-running sessions'],
    nlpTriggers: ['browser getting slow', 'memory usage growing', 'performance degraded']
  },

  {
    id: 'MEM-EVENTLISTENER-010',
    category: 'memory',
    severity: 'medium',
    frequency: 'frequent',
    description: 'Terminal event listeners accumulating without cleanup',
    manifestation: 'Duplicate event handling, memory growth, unexpected behavior',
    rootCause: 'onData handlers not properly disposed when terminal reinitializes',
    preventionStrategy: 'Store disposable references, clean up on component unmount',
    detectionMethod: 'Track active event listener count, monitor for duplicates',
    recoveryAction: 'Dispose all existing listeners before adding new ones',
    userImpact: 'Medium - Increased memory usage, potential duplicate actions',
    codeReferences: [
      'frontend/src/components/TerminalView.tsx:256-261',
      'frontend/src/components/TerminalView.tsx:290-296'
    ],
    testCases: ['Multiple terminal initializations', 'Component remounting'],
    nlpTriggers: ['duplicate typing', 'memory leak', 'event handlers piling up']
  },

  // RACE CONDITIONS
  {
    id: 'RACE-FINAL-011',
    category: 'race_condition',
    severity: 'critical',
    frequency: 'uncommon',
    description: 'Race between final response and streaming ticker updates',
    manifestation: 'Final output overwrites streaming content, data loss, inconsistent state',
    rootCause: 'No synchronization between streaming updates and final response handling',
    preventionStrategy: 'Implement state locks, queue final responses, coordinate updates',
    detectionMethod: 'Monitor update sequence timing, detect overlapping operations',
    recoveryAction: 'Prioritize final response, merge streaming state, validate consistency',
    userImpact: 'Critical - User sees incomplete or incorrect final output',
    codeReferences: [
      'frontend/src/components/TerminalView.tsx:302-309'
    ],
    testCases: ['Simultaneous streaming and completion', 'Fast command execution'],
    nlpTriggers: ['output got cut off', 'missing final result', 'incomplete response']
  },

  {
    id: 'RACE-POSITION-012',
    category: 'race_condition',
    severity: 'high',
    frequency: 'common',
    description: 'Output position updates racing with new streaming data',
    manifestation: 'Position tracking errors, duplicate content, lost chunks',
    rootCause: 'Concurrent position updates from multiple streaming events',
    preventionStrategy: 'Use atomic position updates, implement position validation',
    detectionMethod: 'Validate position sequence, detect concurrent modifications',
    recoveryAction: 'Reset position tracking, request position synchronization',
    userImpact: 'High - Incorrect or duplicate output display',
    codeReferences: [
      'src/services/SSEEventStreamer.ts:365-368'
    ],
    testCases: ['Concurrent streaming events', 'High-frequency position updates'],
    nlpTriggers: ['duplicate content', 'position errors', 'streaming sync issues']
  },

  // BACKGROUND BEHAVIOR
  {
    id: 'BG-TAB-013',
    category: 'background',
    severity: 'medium',
    frequency: 'common',
    description: 'Browser tab backgrounding disrupts SSE connection',
    manifestation: 'Ticker stops when tab backgrounded, connection drops, missed updates',
    rootCause: 'Browser throttles background tab connections and timers',
    preventionStrategy: 'Implement page visibility API monitoring, background state handling',
    detectionMethod: 'Monitor document.visibilityState changes, track connection health',
    recoveryAction: 'Reconnect on tab focus, catch up missed updates',
    userImpact: 'Medium - Missed updates when tab not active',
    codeReferences: [
      'frontend/src/hooks/useSSEConnection.ts'
    ],
    testCases: ['Tab switching scenarios', 'Background timing tests'],
    nlpTriggers: ['missed updates', 'connection dropped', 'tab switching issues']
  },

  {
    id: 'BG-SUSPEND-014',
    category: 'background',
    severity: 'high',
    frequency: 'uncommon',
    description: 'System sleep/resume causing connection state corruption',
    manifestation: 'Connection appears active but non-functional, stale state',
    rootCause: 'System suspend interrupts EventSource without proper state handling',
    preventionStrategy: 'Implement suspend/resume event handling, validate connection on resume',
    detectionMethod: 'Monitor system events, validate connection responsiveness',
    recoveryAction: 'Force reconnection on resume, validate instance state',
    userImpact: 'High - Silent failure, user unaware of non-functional connection',
    codeReferences: [
      'frontend/src/services/SSEConnectionManager.ts'
    ],
    testCases: ['System suspend/resume cycles', 'Sleep mode testing'],
    nlpTriggers: ['connection not working after sleep', 'silent failure', 'resume issues']
  },

  {
    id: 'BG-MEMORY-015',
    category: 'background',
    severity: 'high',
    frequency: 'common',
    description: 'Background memory pressure causing connection termination',
    manifestation: 'Unexpected connection drops, memory warnings, forced cleanup',
    rootCause: 'Browser memory management forcibly closes background connections',
    preventionStrategy: 'Monitor memory usage, implement graceful degradation',
    detectionMethod: 'Track memory pressure signals, monitor connection stability',
    recoveryAction: 'Reduce memory footprint, prioritize essential connections',
    userImpact: 'High - Unpredictable connection loss',
    codeReferences: [
      'src/services/SSEEventStreamer.ts:154-161'
    ],
    testCases: ['Memory pressure scenarios', 'Resource constraint testing'],
    nlpTriggers: ['random disconnections', 'memory issues', 'connection instability']
  }
];

/**
 * Generate failure database statistics
 */
export function generateFailureStatistics(patterns: FailurePattern[]): StreamingTickerFailureDatabase['statistics'] {
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byFrequency: Record<string, number> = {};

  patterns.forEach(pattern => {
    bySeverity[pattern.severity] = (bySeverity[pattern.severity] || 0) + 1;
    byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    byFrequency[pattern.frequency] = (byFrequency[pattern.frequency] || 0) + 1;
  });

  return {
    totalPatterns: patterns.length,
    bySeverity,
    byCategory,
    byFrequency
  };
}

/**
 * Complete failure database
 */
export const STREAMING_TICKER_FAILURE_DATABASE: StreamingTickerFailureDatabase = {
  patterns: STREAMING_TICKER_FAILURE_PATTERNS,
  statistics: generateFailureStatistics(STREAMING_TICKER_FAILURE_PATTERNS),
  metadata: {
    analysisDate: new Date().toISOString(),
    codebaseVersion: 'v1.0.0',
    analysisScope: [
      'Terminal SSE connections',
      'Output streaming',
      'Connection management',
      'Memory handling',
      'Animation systems',
      'Background behavior'
    ]
  }
};

export default STREAMING_TICKER_FAILURE_DATABASE;