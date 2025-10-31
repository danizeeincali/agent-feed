/**
 * Streaming Protection Configuration
 *
 * Safety limits and thresholds for preventing infinite streaming loops
 * Based on SPARC specification and production requirements
 */

export const STREAMING_PROTECTION_CONFIG = {
  // Streaming chunk limits by query complexity
  maxChunks: {
    simple: 20,      // Simple queries: "what is 2+2", "hello"
    complex: 200,    // Complex queries: "analyze this document", "create full app"
    default: 100     // Default for moderate complexity
  },

  // Maximum response size (50KB across all complexity levels)
  maxResponseSize: 50000,

  // Timeout limits by query complexity
  timeouts: {
    simple: 60000,    // 1 minute for simple queries
    complex: 300000,  // 5 minutes for complex queries
    default: 120000   // 2 minutes for default queries
  },

  // Loop detection thresholds
  detection: {
    loopThreshold: 10,           // Chunks in window before flagging as loop
    loopWindowMs: 10000,         // Time window for loop detection (10s)
    stagnantThresholdMs: 30000,  // Stagnant stream threshold (30s)
    healthCheckIntervalMs: 10000 // Health check interval (10s)
  },

  // Recovery and auto-kill settings
  recovery: {
    emergencyMonitorIntervalMs: 15000,  // Emergency monitor checks every 15s
    maxWorkerRuntimeMs: 600000,         // Maximum worker runtime (10 minutes)
    excessiveChunkThreshold: 200,       // Flag workers with > 200 chunks
    costAlertThreshold: 0.50            // Alert at $0.50 estimated cost
  }
};

/**
 * Classify query complexity based on content
 * @param {string} query - Query text
 * @returns {string} Complexity level: 'simple', 'complex', or 'default'
 */
export function classifyQueryComplexity(query) {
  if (!query || typeof query !== 'string') {
    return 'default';
  }

  const lowerQuery = query.toLowerCase().trim();

  // Simple query patterns
  const simplePatterns = [
    /^(hi|hello|hey|ping|test)$/i,
    /^what is \d+ [\+\-\*\/] \d+$/i, // Simple math: "what is 2 + 2"
    /^.{0,20}$/                       // Very short queries
  ];

  for (const pattern of simplePatterns) {
    if (pattern.test(lowerQuery)) {
      return 'simple';
    }
  }

  // Complex query patterns
  const complexPatterns = [
    /create (a |an )?(full[- ]?stack|complete|comprehensive)/i,
    /analyze.{20,}/i,                    // Long analysis requests
    /research.*(market|competitive)/i,    // Market research
    /(build|develop|implement).*(app|application|system|platform)/i,
    /.{200,}/                             // Very long queries (200+ chars)
  ];

  for (const pattern of complexPatterns) {
    if (pattern.test(query)) {
      return 'complex';
    }
  }

  // Default for everything else
  return 'default';
}

/**
 * Get safety limits for a given complexity level
 * @param {string} complexity - Complexity level
 * @returns {Object} Safety limits
 */
export function getSafetyLimits(complexity) {
  const config = STREAMING_PROTECTION_CONFIG;

  return {
    maxChunks: config.maxChunks[complexity] || config.maxChunks.default,
    maxSize: config.maxResponseSize,
    timeoutMs: config.timeouts[complexity] || config.timeouts.default
  };
}

export default STREAMING_PROTECTION_CONFIG;
