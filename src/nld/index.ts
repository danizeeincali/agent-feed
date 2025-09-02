/**
 * NLD (Natural Learning Database) System - Main Export
 * Comprehensive failure prevention system for WebSocket to SSE migrations
 */

// Core modules
export { SSEFailurePreventionEngine, sseFailurePreventionEngine } from './sse-failure-prevention';
export { EnhancedConnectionManager } from './enhanced-connection-manager';
export { BrowserCompatibilityManager, browserCompatibility } from './browser-compatibility-layer';
export { StateSynchronizationManager, stateSynchronizationManager } from './state-synchronization-manager';
export { NLDNeuralLearningSystem, nldNeuralLearningSystem } from './nld-neural-learning-system';
export { NLDIntegrationLayer, nldIntegration } from './nld-integration-layer';

// Types
export type {
  SSEFailurePattern,
  SSEConnectionMetrics
} from './sse-failure-prevention';

export type {
  ConnectionState,
  ConnectionConfig,
  TransportCapabilities
} from './enhanced-connection-manager';

export type {
  BrowserCapabilities,
  PolyfillOptions
} from './browser-compatibility-layer';

export type {
  StateUpdate,
  SynchronizationRule,
  StateConflict
} from './state-synchronization-manager';

export type {
  FailureRecord,
  LearningPattern,
  NeuralModel
} from './nld-neural-learning-system';

export type {
  NLDConfiguration,
  NLDStatus,
  ConnectionOptions
} from './nld-integration-layer';

/**
 * Quick start function for immediate NLD protection
 */
export async function enableNLDProtection(options: {
  url: string;
  transport?: 'auto' | 'websocket' | 'sse' | 'polling';
  config?: Partial<import('./nld-integration-layer').NLDConfiguration>;
}): Promise<string> {
  console.log('🚀 [NLD] Quick start - enabling NLD protection...');
  
  // Initialize with custom config if provided
  if (options.config) {
    nldIntegration.updateConfig(options.config);
  }
  
  // Create protected connection
  const connectionId = await nldIntegration.createConnection({
    url: options.url,
    transport: options.transport,
    enablePredictiveFailure: true,
    enableAutoRecovery: true
  });
  
  console.log(`✅ [NLD] Protection enabled - Connection ID: ${connectionId}`);
  return connectionId;
}

/**
 * Get comprehensive NLD system status
 */
export function getNLDStatus(): import('./nld-integration-layer').NLDStatus {
  return nldIntegration.getStatus();
}

/**
 * Export system data for analysis and debugging
 */
export function exportNLDData(): {
  status: import('./nld-integration-layer').NLDStatus;
  systemData: any;
  browserCompatibility: any;
  neuralPatterns: any[];
  failureHistory: any[];
} {
  const status = nldIntegration.getStatus();
  const systemData = nldIntegration.exportSystemData();
  const browserReport = browserCompatibility.getCompatibilityReport();
  const patterns = nldNeuralLearningSystem.getPatterns();
  const history = nldNeuralLearningSystem.getFailureHistory(100);

  return {
    status,
    systemData,
    browserCompatibility: browserReport,
    neuralPatterns: patterns,
    failureHistory: history
  };
}

/**
 * Manual failure recording for external integrations
 */
export async function recordFailure(
  type: import('./nld-neural-learning-system').FailureRecord['type'],
  context: Partial<import('./nld-neural-learning-system').FailureRecord['context']>,
  userDescription?: string
): Promise<string> {
  const browserInfo = browserCompatibility.getCapabilities();
  
  const fullContext: import('./nld-neural-learning-system').FailureRecord['context'] = {
    browser: context.browser || browserInfo.browser,
    browserVersion: context.browserVersion || browserInfo.browserVersion,
    platform: context.platform || browserInfo.platform,
    transport: context.transport || 'unknown',
    url: context.url || '',
    error: context.error || userDescription || 'User reported failure',
    userAgent: context.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    connectionState: context.connectionState || 'unknown'
  };

  return await nldNeuralLearningSystem.recordFailure(
    type,
    'user_reported',
    fullContext,
    { strategy: 'manual', successful: false, timeToResolve: 0 }
  );
}

/**
 * Predict failure likelihood for given context
 */
export async function predictFailure(context: {
  transport: string;
  url: string;
  browser?: string;
  error?: string;
}): Promise<{
  likelihood: number;
  confidence: number;
  recommendations: string[];
}> {
  const browserInfo = browserCompatibility.getCapabilities();
  
  const fullContext: import('./nld-neural-learning-system').FailureRecord['context'] = {
    browser: context.browser || browserInfo.browser,
    browserVersion: browserInfo.browserVersion,
    platform: browserInfo.platform,
    transport: context.transport,
    url: context.url,
    error: context.error || '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    connectionState: 'predicting'
  };

  const prediction = await nldNeuralLearningSystem.predictFailure(fullContext);
  
  return {
    likelihood: prediction.likelihood,
    confidence: prediction.confidence,
    recommendations: prediction.recommendedActions
  };
}

/**
 * Create quick diagnostic report
 */
export function createDiagnosticReport(): {
  timestamp: number;
  browserCompatibility: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  systemHealth: number;
  activeThreats: Array<{
    type: string;
    severity: string;
    recommendation: string;
  }>;
  recentPatterns: any[];
  connectionStatus: {
    total: number;
    connected: number;
    disconnected: number;
  };
} {
  const status = nldIntegration.getStatus();
  const browserReport = browserCompatibility.getCompatibilityReport();
  const patterns = nldNeuralLearningSystem.getPatterns().slice(-5); // Last 5 patterns
  
  return {
    timestamp: Date.now(),
    browserCompatibility: {
      score: browserReport.score,
      issues: browserReport.issues,
      recommendations: browserReport.recommendations
    },
    systemHealth: status.metrics.systemHealth,
    activeThreats: status.currentThreats,
    recentPatterns: patterns,
    connectionStatus: {
      total: 0, // This would be tracked in real implementation
      connected: 0,
      disconnected: 0
    }
  };
}

/**
 * Initialize NLD system with default configuration
 */
export async function initializeNLD(config?: Partial<import('./nld-integration-layer').NLDConfiguration>): Promise<void> {
  if (config) {
    nldIntegration.updateConfig(config);
  }
  await nldIntegration.initialize();
}

/**
 * Shutdown NLD system gracefully
 */
export async function shutdownNLD(): Promise<void> {
  await nldIntegration.shutdown();
}

// Default export for convenience
export default {
  enableNLDProtection,
  getNLDStatus,
  exportNLDData,
  recordFailure,
  predictFailure,
  createDiagnosticReport,
  initializeNLD,
  shutdownNLD,
  
  // Modules
  sseFailurePreventionEngine,
  browserCompatibility,
  stateSynchronizationManager,
  nldNeuralLearningSystem,
  nldIntegration
};