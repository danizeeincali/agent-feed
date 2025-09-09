/**
 * SPARC Regression Test Configuration
 * Centralized configuration for all regression testing
 */

export interface SPARCTestConfig {
  // Test Environment
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  wsBaseUrl: string;
  
  // Test Timeouts (ms)
  timeouts: {
    unit: number;
    integration: number;
    e2e: number;
    performance: number;
  };
  
  // Coverage Requirements
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  
  // Performance Benchmarks
  performance: {
    feedLoadTime: number;       // ms - max time to load 50 posts
    mentionDropdownResponse: number;  // ms - max response time
    commentExpansion: number;   // ms - max time per thread level
    realtimeUpdateLatency: number;    // ms - max update delay
  };
  
  // Browser Support
  browsers: {
    desktop: string[];
    mobile: string[];
  };
  
  // Critical Features to Protect
  criticalFeatures: {
    mentionSystem: boolean;
    postCreation: boolean;
    commentThreading: boolean;
    realtimeData: boolean;
    filtering: boolean;
    postingInterface: boolean;
  };
}

// Default Configuration
export const SPARC_CONFIG: SPARCTestConfig = {
  environment: process.env.NODE_ENV as any || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  wsBaseUrl: process.env.WS_BASE_URL || 'ws://localhost:3000',
  
  timeouts: {
    unit: 5000,        // 5s for unit tests
    integration: 30000, // 30s for integration tests  
    e2e: 60000,        // 60s for E2E tests
    performance: 10000, // 10s for performance tests
  },
  
  coverage: {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95,
  },
  
  performance: {
    feedLoadTime: 2000,        // 2s max
    mentionDropdownResponse: 100,   // 100ms max
    commentExpansion: 50,      // 50ms max per level
    realtimeUpdateLatency: 500, // 500ms max
  },
  
  browsers: {
    desktop: ['chromium', 'firefox', 'webkit'],
    mobile: ['Mobile Chrome', 'Mobile Safari'],
  },
  
  criticalFeatures: {
    mentionSystem: true,
    postCreation: true,
    commentThreading: true,
    realtimeData: true,
    filtering: true,
    postingInterface: true,
  },
};

// Test Environment Helpers
export const isCI = !!process.env.CI;
export const isDebug = process.env.DEBUG === 'true';
export const shouldRunVisualTests = !isCI || process.env.VISUAL_TESTS === 'true';
export const shouldRunPerformanceTests = !isCI || process.env.PERFORMANCE_TESTS === 'true';

// Test Categories
export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  E2E = 'e2e',
  PERFORMANCE = 'performance',
  REGRESSION = 'regression',
}

// Test Priority Levels
export enum TestPriority {
  P1 = 'P1', // Must never break - critical user paths
  P2 = 'P2', // Important functionality
  P3 = 'P3', // Nice to have features
}

// Feature Tags for Test Organization
export enum FeatureTag {
  MENTION_SYSTEM = 'mention-system',
  POST_CREATION = 'post-creation', 
  COMMENT_THREADING = 'comment-threading',
  REALTIME_DATA = 'realtime-data',
  FILTERING = 'filtering',
  POSTING_INTERFACE = 'posting-interface',
  API_INTEGRATION = 'api-integration',
  UI_COMPONENTS = 'ui-components',
  CROSS_BROWSER = 'cross-browser',
}

// Test Metadata Interface
export interface TestMetadata {
  category: TestCategory;
  priority: TestPriority;
  features: FeatureTag[];
  description: string;
  estimatedDuration: number; // seconds
}

// Regression Test Scenarios (Based on Past Issues)
export const REGRESSION_SCENARIOS = {
  MENTION_DROPDOWN_Z_INDEX: {
    id: 'mention-dropdown-z-index',
    description: 'Mention dropdown hidden behind other UI elements',
    priority: TestPriority.P1,
    features: [FeatureTag.MENTION_SYSTEM, FeatureTag.UI_COMPONENTS],
  },
  COMMENT_THREAD_INFINITE_LOOP: {
    id: 'comment-thread-infinite-loop',
    description: 'Comment thread expansion causing infinite loops',
    priority: TestPriority.P1,
    features: [FeatureTag.COMMENT_THREADING],
  },
  WEBSOCKET_CONNECTION_LEAK: {
    id: 'websocket-connection-leak',
    description: 'WebSocket connections not properly cleaned up',
    priority: TestPriority.P1,
    features: [FeatureTag.REALTIME_DATA],
  },
  API_RACE_CONDITIONS: {
    id: 'api-race-conditions',
    description: 'Race conditions during rapid user interactions',
    priority: TestPriority.P1,
    features: [FeatureTag.API_INTEGRATION],
  },
  STATE_SYNC_BUGS: {
    id: 'state-sync-bugs',
    description: 'State synchronization issues between components',
    priority: TestPriority.P2,
    features: [FeatureTag.UI_COMPONENTS, FeatureTag.FILTERING],
  },
} as const;

// Performance Baseline Data
export interface PerformanceBaseline {
  metric: string;
  baseline: number;
  tolerance: number; // percentage
  unit: string;
}

export const PERFORMANCE_BASELINES: PerformanceBaseline[] = [
  {
    metric: 'feed-initial-load',
    baseline: 1500, // ms
    tolerance: 10,  // 10%
    unit: 'ms'
  },
  {
    metric: 'mention-dropdown-open',
    baseline: 80,   // ms
    tolerance: 25,  // 25%
    unit: 'ms'
  },
  {
    metric: 'comment-thread-expand',
    baseline: 40,   // ms
    tolerance: 25,  // 25%
    unit: 'ms'
  },
  {
    metric: 'post-creation-submit',
    baseline: 500,  // ms
    tolerance: 15,  // 15%
    unit: 'ms'
  },
];