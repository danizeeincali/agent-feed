/**
 * TDD London School: Centralized Mock Factory
 * 
 * Provides consistent mock objects and services for all London School TDD tests
 * Follows the mockist approach with behavior verification focus
 */

import { jest } from '@jest/globals';

// Core API Service Mock
export const createApiServiceMock = () => ({
  getAgentPosts: jest.fn(),
  getPostDetails: jest.fn(),
  getPostThread: jest.fn(),
  getPostChildren: jest.fn(),
  getPostParent: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  updatePostEngagement: jest.fn(),
  searchPosts: jest.fn(),
  checkDatabaseConnection: jest.fn(),
  validatePostContent: jest.fn(),
  sharePost: jest.fn(), // Should never be called in Phase 1
  getShareCount: jest.fn() // Should never be called in Phase 1
});

// WebSocket Context Mock
export const createWebSocketContextMock = () => ({
  isConnected: true,
  on: jest.fn(),
  off: jest.fn(),
  subscribeFeed: jest.fn(),
  unsubscribeFeed: jest.fn(),
  subscribePost: jest.fn(),
  unsubscribePost: jest.fn(),
  sendLike: jest.fn(),
  sendComment: jest.fn(),
  addNotification: jest.fn(),
  removeNotification: jest.fn(),
  clearNotifications: jest.fn()
});

// Validation Service Mock
export const createValidationServiceMock = () => ({
  validatePostLength: jest.fn(),
  validatePostContent: jest.fn(),
  getCharacterLimits: jest.fn(),
  checkContentRules: jest.fn(),
  formatValidationMessage: jest.fn(),
  validateHierarchy: jest.fn(),
  sanitizeContent: jest.fn()
});

// Post Hierarchy Service Mock
export const createPostHierarchyServiceMock = () => ({
  buildHierarchy: jest.fn(),
  validateStructure: jest.fn(),
  findDepth: jest.fn(),
  getThreadRoot: jest.fn(),
  detectCircularReferences: jest.fn(),
  findOrphanedPosts: jest.fn(),
  calculateMaxDepth: jest.fn(),
  sortByHierarchy: jest.fn()
});

// Share Guard Service Mock (for removal verification)
export const createShareGuardMock = () => ({
  isShareDisabled: jest.fn().mockReturnValue(true),
  validateNoShareFeatures: jest.fn(),
  removeShareElements: jest.fn(),
  auditShareRemoval: jest.fn(),
  cleanupLegacyShareCode: jest.fn(),
  validatePrivacyCompliance: jest.fn(),
  generateComplianceReport: jest.fn()
});

// Analytics Service Mock
export const createAnalyticsServiceMock = () => ({
  trackPostView: jest.fn(),
  trackPostExpansion: jest.fn(),
  trackUserInteraction: jest.fn(),
  trackValidationEvent: jest.fn(),
  trackError: jest.fn(),
  trackPerformanceMetric: jest.fn(),
  // Share tracking should not be called
  trackShareAttempt: jest.fn(),
  trackShareSuccess: jest.fn()
});

// Engagement Tracker Mock
export const createEngagementTrackerMock = () => ({
  trackPostExpansion: jest.fn(),
  trackTimeSpent: jest.fn(),
  trackInteraction: jest.fn(),
  trackScrollDepth: jest.fn(),
  trackClickThrough: jest.fn(),
  generateEngagementReport: jest.fn()
});

// Metrics Collector Mock
export const createMetricsCollectorMock = () => ({
  collectRenderTime: jest.fn(),
  collectApiResponseTime: jest.fn(),
  collectUserInteractionLatency: jest.fn(),
  collectComponentLoadTime: jest.fn(),
  generatePerformanceReport: jest.fn()
});

// Mock Post Data Factories
export const createMockPost = (overrides = {}) => ({
  id: 'post-123',
  title: 'Test Post Title',
  content: 'This is test post content for TDD London School testing.',
  authorAgent: 'test-agent',
  publishedAt: '2023-12-01T10:00:00Z',
  metadata: {
    businessImpact: 7,
    tags: ['testing', 'tdd', 'london-school'],
    isAgentResponse: true,
    hierarchyLevel: 0,
    parentId: null,
    childrenIds: []
  },
  likes: 5,
  comments: 2,
  views: 45,
  ...overrides
});

export const createMockDetailedPost = (basePost = createMockPost()) => ({
  ...basePost,
  fullContent: 'This is the full detailed content with comprehensive information for testing expandable posts functionality.',
  engagementHistory: [
    { type: 'like', timestamp: '2023-12-01T11:00:00Z', userId: 'user1', agent: 'engagement-agent' },
    { type: 'comment', timestamp: '2023-12-01T12:00:00Z', userId: 'user2', agent: 'comment-agent' },
    { type: 'view', timestamp: '2023-12-01T13:00:00Z', userId: 'user3', agent: 'view-tracker-agent' }
  ],
  relatedPosts: [],
  metrics: {
    views: 45,
    clickThrough: 0.12,
    timeSpent: 120,
    expansionRate: 0.34,
    engagementScore: 8.5
  },
  contentAnalysis: {
    readingTime: 2,
    complexity: 'medium',
    topics: ['testing', 'methodology', 'software-development']
  }
});

export const createMockHierarchicalPost = (level = 0, parentId = null) => ({
  ...createMockPost({
    id: `hierarchical-post-${level}-${Math.random().toString(36).substr(2, 9)}`,
    title: `Hierarchical Post Level ${level}`,
    content: `This is a post at hierarchy level ${level} for testing post threading.`,
    metadata: {
      businessImpact: Math.max(3, 9 - level),
      tags: [`level-${level}`, 'hierarchy', 'threading'],
      isAgentResponse: true,
      hierarchyLevel: level,
      parentId,
      childrenIds: []
    }
  })
});

export const createMockPostThread = () => {
  const rootPost = createMockHierarchicalPost(0, null);
  const childPosts = [
    createMockHierarchicalPost(1, rootPost.id),
    createMockHierarchicalPost(1, rootPost.id)
  ];
  const grandchildPost = createMockHierarchicalPost(2, childPosts[0].id);
  
  // Update children references
  rootPost.metadata.childrenIds = childPosts.map(p => p.id);
  childPosts[0].metadata.childrenIds = [grandchildPost.id];
  
  return {
    root: rootPost,
    children: childPosts,
    grandchildren: [grandchildPost],
    all: [rootPost, ...childPosts, grandchildPost]
  };
};

// Character Limits Configuration
export const mockCharacterLimits = {
  title: { min: 5, max: 100, warning: 80 },
  content: { min: 10, max: 2000, warning: 1800 },
  tags: { maxPerTag: 20, maxTags: 10, maxTotal: 200 },
  authorAgent: { max: 50 },
  comment: { min: 3, max: 500, warning: 450 }
};

// Validation Results Factory
export const createValidationResult = (isValid = true, errors = [], warnings = []) => ({
  isValid,
  errors,
  warnings,
  timestamp: new Date().toISOString(),
  validatedFields: ['title', 'content', 'metadata']
});

// Hierarchy Validation Results Factory
export const createHierarchyValidationResult = (isValid = true) => ({
  isValid,
  maxDepth: isValid ? 2 : -1,
  structure: isValid ? 'tree' : 'invalid',
  errors: isValid ? [] : ['Circular reference detected'],
  warnings: isValid ? [] : ['Deep nesting beyond recommended levels'],
  statistics: {
    totalPosts: 4,
    rootPosts: 1,
    orphanedPosts: isValid ? 0 : 1,
    maxBranchDepth: 2
  }
});

// Connection Status Factory
export const createConnectionStatus = (connected = true, fallback = false) => ({
  connected,
  fallback,
  lastChecked: new Date(),
  latency: connected ? 45 : -1,
  endpoint: 'api/v1/posts',
  retryCount: connected ? 0 : 3
});

// Mock Event Factory for WebSocket events
export const createMockWebSocketEvent = (type: string, data: any) => ({
  type,
  data,
  timestamp: Date.now(),
  id: Math.random().toString(36).substr(2, 9),
  source: 'websocket-mock'
});

// Test Configuration Presets
export const testConfigs = {
  expandablePosts: {
    enableExpansion: true,
    showDetailedContent: true,
    trackEngagement: true,
    loadRelatedPosts: false
  },
  
  hierarchicalPosts: {
    maxDepth: 3,
    allowCircular: false,
    requireParentFirst: true,
    autoCollapse: false
  },
  
  characterValidation: {
    realTimeValidation: true,
    showWarnings: true,
    debounceMs: 300,
    strictMode: false
  },
  
  shareRemoval: {
    strictCompliance: true,
    auditMode: true,
    logViolations: true,
    preventReEnable: true
  }
};

// Mock Factory Reset Utility
export const resetAllMocks = (mocks: Record<string, any>) => {
  Object.values(mocks).forEach(mock => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
};

// Mock Call Verification Utilities
export const verifyMockInteractions = (mockObject: any, expectedCalls: Record<string, any[]>) => {
  Object.entries(expectedCalls).forEach(([methodName, calls]) => {
    expect(mockObject[methodName]).toHaveBeenCalledTimes(calls.length);
    calls.forEach((call, index) => {
      expect(mockObject[methodName]).toHaveBeenNthCalledWith(index + 1, ...call);
    });
  });
};

export const verifyNoShareInteractions = (mockApiService: any, mockAnalytics: any) => {
  expect(mockApiService.sharePost).not.toHaveBeenCalled();
  expect(mockApiService.getShareCount).not.toHaveBeenCalled();
  expect(mockAnalytics.trackShareAttempt).not.toHaveBeenCalled();
  expect(mockAnalytics.trackShareSuccess).not.toHaveBeenCalled();
};

// London School Pattern: Behavior Verification Helpers
export const verifyCollaborationSequence = (mocks: any[], expectedSequence: string[]) => {
  const allCalls: Array<{ mock: string, method: string, timestamp: number }> = [];
  
  mocks.forEach((mock, mockIndex) => {
    Object.entries(mock).forEach(([methodName, method]) => {
      if (jest.isMockFunction(method)) {
        method.mock.calls.forEach((call, callIndex) => {
          allCalls.push({
            mock: `mock${mockIndex}`,
            method: methodName,
            timestamp: method.mock.invocationCallOrder?.[callIndex] || 0
          });
        });
      }
    });
  });
  
  allCalls.sort((a, b) => a.timestamp - b.timestamp);
  const actualSequence = allCalls.map(call => `${call.mock}.${call.method}`);
  
  expect(actualSequence).toEqual(expectedSequence);
};