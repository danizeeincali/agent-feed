/**
 * TDD London School - Mock Contracts for Sharing Removal
 * 
 * This file defines the contracts and mock objects needed to isolate
 * the SocialMediaFeed component for testing sharing functionality removal.
 * Following London School principles of mock-first development.
 */

export interface MockApiService {
  getAgentPosts: jest.Mock;
  updatePostEngagement: jest.Mock;
  searchPosts: jest.Mock;
  checkDatabaseConnection: jest.Mock;
  getFeedStats: jest.Mock;
  createAgentPost: jest.Mock;
  clearCache: jest.Mock;
}

export interface MockWebSocketContext {
  isConnected: boolean;
  on: jest.Mock;
  off: jest.Mock;
  subscribeFeed: jest.Mock;
  unsubscribeFeed: jest.Mock;
  subscribePost: jest.Mock;
  sendLike: jest.Mock;
  addNotification: jest.Mock;
}

export interface MockPost {
  id: string;
  title: string;
  content: string;
  authorAgent: string;
  publishedAt: string;
  metadata: {
    businessImpact: number;
    tags: string[];
    isAgentResponse: boolean;
  };
  likes?: number;
  comments?: number;
  shares?: number;
}

// Contract: API Service Mock Factory
export const createMockApiService = (): MockApiService => ({
  getAgentPosts: jest.fn(),
  updatePostEngagement: jest.fn(),
  searchPosts: jest.fn(),
  checkDatabaseConnection: jest.fn(),
  getFeedStats: jest.fn(),
  createAgentPost: jest.fn(),
  clearCache: jest.fn(),
});

// Contract: WebSocket Context Mock Factory
export const createMockWebSocketContext = (): MockWebSocketContext => ({
  isConnected: true,
  on: jest.fn(),
  off: jest.fn(),
  subscribeFeed: jest.fn(),
  unsubscribeFeed: jest.fn(),
  subscribePost: jest.fn(),
  sendLike: jest.fn(),
  addNotification: jest.fn(),
});

// Contract: Test Post Data Factory
export const createMockPost = (overrides: Partial<MockPost> = {}): MockPost => ({
  id: 'test-post-123',
  title: 'Test Agent Post',
  content: 'This is a test post from an agent',
  authorAgent: 'test-agent',
  publishedAt: '2024-01-01T00:00:00Z',
  metadata: {
    businessImpact: 5,
    tags: ['test', 'automation'],
    isAgentResponse: true,
  },
  likes: 5,
  comments: 3,
  shares: 2,
  ...overrides,
});

// Contract: API Response Mocks
export const mockApiResponses = {
  getAgentPosts: {
    success: true,
    posts: [
      createMockPost(),
      createMockPost({ id: 'test-post-456', shares: 10 }),
    ],
  },
  checkDatabaseConnection: {
    connected: true,
    fallback: false,
  },
  updatePostEngagement: {
    success: true,
    updatedPost: createMockPost({ shares: 3 }),
  },
};

// Contract: Expected Interactions
export const expectedInteractions = {
  // BEFORE sharing removal - these interactions should happen
  withSharing: {
    shareButtonClick: 'handleSharePost should be called',
    shareApiCall: 'updatePostEngagement with action: share should be called',
    shareCountUpdate: 'shares count should increase',
  },
  // AFTER sharing removal - these interactions should NOT happen
  withoutSharing: {
    noShareButton: 'Share button should not be rendered',
    noShareApiCall: 'updatePostEngagement with action: share should NEVER be called',
    noShareCount: 'shares count should not be displayed',
  },
};

// Contract: Component Interaction Verification
export const interactionContracts = {
  // Verify that other engagement features still work
  likeEngagement: {
    likeButton: 'Like button should still be rendered and functional',
    likeApiCall: 'updatePostEngagement with action: like should still work',
    likeWebSocket: 'sendLike should still be called',
  },
  commentEngagement: {
    commentButton: 'Comment button should still be rendered and functional',
    commentHandler: 'handleCommentPost should still work',
    commentSubscription: 'subscribePost should still be called',
  },
};

// Contract: Test Scenarios
export const testScenarios = {
  sharingPresent: {
    description: 'Component WITH sharing functionality',
    expectedElements: ['share-button', 'share-count'],
    expectedCalls: ['updatePostEngagement'],
  },
  sharingRemoved: {
    description: 'Component WITHOUT sharing functionality',
    expectedElements: ['like-button', 'comment-button'],
    notExpectedElements: ['share-button', 'share-count'],
    notExpectedCalls: ['updatePostEngagement with share'],
  },
};