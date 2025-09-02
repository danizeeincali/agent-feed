/**
 * Neural Learning Detection (NLD) System
 * Main export file for the complete NLD implementation
 */

// Core system
export { nld, NLDCore } from './core';
export type { NLDEvent, FailurePattern, NLDRecord } from './core';

// Database management
export { nldDatabase, NLDDatabaseManager } from './database';
export type { NLDDatabase, PatternStatistics, NeuralTrainingData } from './database';

// Prevention engine
export { preventionEngine, NLDPreventionEngine } from './prevention-engine';
export type { PreventiveMeasure, AutoFixResult } from './prevention-engine';

// Connection monitoring
export { NLDConnectionMonitor } from './connection-monitor';
export type { ConnectionConfig } from './connection-monitor';

// Integration layer
export { nldIntegration, NLDIntegration, useNLDWebSocket } from './integration';
export type { NLDIntegrationConfig } from './integration';

// Dashboard components
export { NLDDashboard, NLDNotification } from './dashboard';

// Test scenarios
export { nldTestRunner, NLDTestRunner } from './test-scenarios';
export type { TestScenario } from './test-scenarios';

// Convenience function to initialize NLD system
export const initializeNLD = (config?: {
  enableNLD?: boolean;
  autoFix?: boolean;
  debugMode?: boolean;
}) => {
  console.log('[NLD] Initializing Neural Learning Detection system...');
  
  const status = nldIntegration.getStatus();
  
  if (config?.debugMode) {
    console.log('[NLD] System status:', status);
  }
  
  return {
    status,
    dashboard: NLDDashboard,
    testRunner: nldTestRunner,
    exportData: () => nldIntegration.exportTrainingData(),
    simulateFailures: () => nldIntegration.simulateFailureScenarios()
  };
};