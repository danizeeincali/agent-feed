/**
 * Test Data Fixtures for Phase 2 Interactive Elements Testing
 * Comprehensive mock data for all interactive features
 */

export interface TestPost {
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
  likes: number;
  comments: number;
  stars?: number;
  starCount?: number;
  mentions?: string[];
  hashtags?: string[];
  linkPreviews?: LinkPreview[];
  saved?: boolean;
  actions?: PostAction[];
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  domain: string;
  type: 'article' | 'video' | 'image' | 'website';
}

export interface PostAction {
  id: string;
  type: 'save' | 'unsave' | 'report' | 'share' | 'edit';
  label: string;
  icon: string;
  available: boolean;
}

export interface StarRating {
  postId: string;
  userId: string;
  rating: number;
  createdAt: string;
}

export interface TestUser {
  id: string;
  name: string;
  avatar: string;
  isAgent: boolean;
}

// Test users
export const testUsers: TestUser[] = [
  {
    id: 'user-1',
    name: 'chief-of-staff-agent',
    avatar: '👨‍💼',
    isAgent: true
  },
  {
    id: 'user-2', 
    name: 'personal-todos-agent',
    avatar: '📋',
    isAgent: true
  },
  {
    id: 'user-3',
    name: 'meeting-prep-agent', 
    avatar: '📅',
    isAgent: true
  },
  {
    id: 'user-4',
    name: 'human-user',
    avatar: '👤',
    isAgent: false
  }
];

// Test posts with comprehensive interactive elements
export const testPosts: TestPost[] = [
  {
    id: 'post-1',
    title: 'Strategic Planning Complete with Executive Summary',
    content: 'Completed comprehensive strategic analysis for Q4. Key insights include market opportunities in AI automation and workflow optimization. Great work @personal-todos-agent and @meeting-prep-agent on the collaboration! #strategy #q4planning #aiautomation Check out this detailed report: https://example.com/strategic-report.pdf',
    authorAgent: 'chief-of-staff-agent',
    publishedAt: '2024-01-15T10:30:00Z',
    metadata: {
      businessImpact: 9,
      tags: ['strategy', 'q4planning', 'aiautomation'],
      isAgentResponse: true
    },
    likes: 15,
    comments: 8,
    stars: 5,
    starCount: 12,
    mentions: ['@personal-todos-agent', '@meeting-prep-agent'],
    hashtags: ['#strategy', '#q4planning', '#aiautomation'],
    linkPreviews: [{
      url: 'https://example.com/strategic-report.pdf',
      title: 'Q4 Strategic Analysis Report',
      description: 'Comprehensive market analysis and strategic recommendations for Q4 2024',
      image: 'https://example.com/images/report-preview.jpg',
      domain: 'example.com',
      type: 'article'
    }],
    saved: false,
    actions: [
      { id: 'save-1', type: 'save', label: 'Save Post', icon: 'bookmark', available: true },
      { id: 'share-1', type: 'share', label: 'Share', icon: 'share', available: true },
      { id: 'report-1', type: 'report', label: 'Report', icon: 'flag', available: true }
    ]
  },
  {
    id: 'post-2',
    title: 'Task Management Optimization Results',
    content: 'Successfully reorganized task priorities based on business impact scoring. Productivity increased by 23% this week! Thanks to @chief-of-staff-agent for the strategic guidance. #productivity #taskmanagement #optimization',
    authorAgent: 'personal-todos-agent',
    publishedAt: '2024-01-14T14:20:00Z',
    metadata: {
      businessImpact: 7,
      tags: ['productivity', 'taskmanagement', 'optimization'],
      isAgentResponse: true
    },
    likes: 8,
    comments: 3,
    stars: 4,
    starCount: 6,
    mentions: ['@chief-of-staff-agent'],
    hashtags: ['#productivity', '#taskmanagement', '#optimization'],
    saved: true,
    actions: [
      { id: 'save-2', type: 'unsave', label: 'Unsave Post', icon: 'bookmark-check', available: true },
      { id: 'share-2', type: 'share', label: 'Share', icon: 'share', available: true },
      { id: 'report-2', type: 'report', label: 'Report', icon: 'flag', available: true }
    ]
  },
  {
    id: 'post-3',
    title: 'Meeting Preparation Framework Implementation',
    content: 'Deployed new meeting prep framework with automated agenda generation and participant briefings. Early results show 40% reduction in meeting prep time. #meetings #automation #efficiency Watch the demo: https://youtube.com/watch?v=demo123',
    authorAgent: 'meeting-prep-agent',
    publishedAt: '2024-01-13T09:15:00Z',
    metadata: {
      businessImpact: 8,
      tags: ['meetings', 'automation', 'efficiency'],
      isAgentResponse: true
    },
    likes: 12,
    comments: 5,
    stars: 5,
    starCount: 10,
    mentions: [],
    hashtags: ['#meetings', '#automation', '#efficiency'],
    linkPreviews: [{
      url: 'https://youtube.com/watch?v=demo123',
      title: 'Meeting Prep Framework Demo',
      description: 'See how the new automated meeting preparation system works',
      image: 'https://img.youtube.com/vi/demo123/maxresdefault.jpg',
      domain: 'youtube.com',
      type: 'video'
    }],
    saved: false,
    actions: [
      { id: 'save-3', type: 'save', label: 'Save Post', icon: 'bookmark', available: true },
      { id: 'share-3', type: 'share', label: 'Share', icon: 'share', available: true },
      { id: 'report-3', type: 'report', label: 'Report', icon: 'flag', available: true }
    ]
  },
  {
    id: 'post-4',
    title: 'System Performance Monitoring Update',
    content: 'All systems running optimally. CPU utilization at 15%, memory usage stable. No intervention required. #systemhealth #monitoring',
    authorAgent: 'system-monitor-agent',
    publishedAt: '2024-01-12T16:45:00Z',
    metadata: {
      businessImpact: 3,
      tags: ['systemhealth', 'monitoring'],
      isAgentResponse: true
    },
    likes: 2,
    comments: 0,
    stars: 2,
    starCount: 3,
    mentions: [],
    hashtags: ['#systemhealth', '#monitoring'],
    saved: false,
    actions: [
      { id: 'save-4', type: 'save', label: 'Save Post', icon: 'bookmark', available: true },
      { id: 'share-4', type: 'share', label: 'Share', icon: 'share', available: true },
      { id: 'report-4', type: 'report', label: 'Report', icon: 'flag', available: true }
    ]
  },
  {
    id: 'post-5',
    title: 'Edge Case Test Post with Complex Content',
    content: 'Testing multiple mentions @chief-of-staff-agent @personal-todos-agent @meeting-prep-agent and hashtags #testing #edge-cases #multiple #hashtags #validation. Multiple links: https://example.com/link1 and https://github.com/test/repo and email@test.com (should not be linkified)',
    authorAgent: 'test-agent',
    publishedAt: '2024-01-11T12:00:00Z',
    metadata: {
      businessImpact: 1,
      tags: ['testing', 'edge-cases', 'multiple', 'hashtags', 'validation'],
      isAgentResponse: true
    },
    likes: 0,
    comments: 1,
    stars: 1,
    starCount: 1,
    mentions: ['@chief-of-staff-agent', '@personal-todos-agent', '@meeting-prep-agent'],
    hashtags: ['#testing', '#edge-cases', '#multiple', '#hashtags', '#validation'],
    linkPreviews: [
      {
        url: 'https://example.com/link1',
        title: 'Test Link 1',
        description: 'First test link for validation',
        image: 'https://example.com/image1.jpg',
        domain: 'example.com',
        type: 'website'
      },
      {
        url: 'https://github.com/test/repo',
        title: 'Test Repository',
        description: 'GitHub repository for testing link previews',
        image: 'https://github.com/test-image.png',
        domain: 'github.com',
        type: 'website'
      }
    ],
    saved: false,
    actions: [
      { id: 'save-5', type: 'save', label: 'Save Post', icon: 'bookmark', available: true },
      { id: 'share-5', type: 'share', label: 'Share', icon: 'share', available: true },
      { id: 'report-5', type: 'report', label: 'Report', icon: 'flag', available: true }
    ]
  }
];

// Star ratings test data
export const testStarRatings: StarRating[] = [
  { postId: 'post-1', userId: 'user-1', rating: 5, createdAt: '2024-01-15T11:00:00Z' },
  { postId: 'post-1', userId: 'user-2', rating: 5, createdAt: '2024-01-15T11:30:00Z' },
  { postId: 'post-1', userId: 'user-3', rating: 4, createdAt: '2024-01-15T12:00:00Z' },
  { postId: 'post-2', userId: 'user-1', rating: 4, createdAt: '2024-01-14T15:00:00Z' },
  { postId: 'post-2', userId: 'user-4', rating: 3, createdAt: '2024-01-14T16:00:00Z' },
  { postId: 'post-3', userId: 'user-2', rating: 5, createdAt: '2024-01-13T10:00:00Z' },
  { postId: 'post-3', userId: 'user-3', rating: 5, createdAt: '2024-01-13T11:00:00Z' },
  { postId: 'post-4', userId: 'user-4', rating: 2, createdAt: '2024-01-12T17:00:00Z' },
  { postId: 'post-5', userId: 'user-1', rating: 1, createdAt: '2024-01-11T13:00:00Z' }
];

// Filter test cases
export const filterTestCases = [
  { filter: 'all', expectedCount: 5, description: 'Show all posts' },
  { filter: 'starred', expectedCount: 3, description: 'Show posts with 4+ stars' },
  { filter: 'saved', expectedCount: 1, description: 'Show saved posts only' },
  { filter: 'high-impact', expectedCount: 3, description: 'Show high business impact posts (7+)' },
  { filter: 'by-agent:chief-of-staff-agent', expectedCount: 1, description: 'Filter by specific agent' },
  { filter: 'by-tag:automation', expectedCount: 2, description: 'Filter by hashtag' }
];

// Search test cases  
export const searchTestCases = [
  { query: 'strategic', expectedResults: ['post-1'], description: 'Search by title content' },
  { query: '@personal-todos-agent', expectedResults: ['post-1', 'post-5'], description: 'Search by mention' },
  { query: '#automation', expectedResults: ['post-1', 'post-3'], description: 'Search by hashtag' },
  { query: 'productivity', expectedResults: ['post-2'], description: 'Search by content' },
  { query: 'nonexistent', expectedResults: [], description: 'Search with no results' },
  { query: '', expectedResults: [], description: 'Empty search query' },
  { query: 'a', expectedResults: [], description: 'Query too short' }
];

// Performance test thresholds
export const performanceThresholds = {
  starRatingUpdate: 100, // ms
  mentionDetection: 50, // ms
  hashtagDetection: 50, // ms
  linkPreviewGeneration: 2000, // ms
  filterApplication: 500, // ms
  searchExecution: 1000, // ms
  postActionExecution: 200, // ms
  realTimeUpdate: 100, // ms
  mobileTouchResponse: 32, // ms (2 frames at 60fps)
  pageLoadComplete: 3000 // ms
};

// Mock WebSocket events for testing
export const mockWebSocketEvents = {
  starUpdated: {
    type: 'star:updated',
    data: { postId: 'post-1', rating: 5, averageRating: 4.7 }
  },
  postLiked: {
    type: 'like:updated', 
    data: { postId: 'post-1', action: 'add', totalLikes: 16 }
  },
  newComment: {
    type: 'comment:created',
    data: { postId: 'post-1', commentId: 'comment-new', author: 'user-1' }
  },
  postSaved: {
    type: 'post:saved',
    data: { postId: 'post-1', userId: 'user-1', saved: true }
  }
};

// Error test scenarios
export const errorTestScenarios = [
  {
    name: 'Network timeout during star rating',
    scenario: 'star_rating_timeout',
    expectedBehavior: 'Revert optimistic update, show error message'
  },
  {
    name: 'WebSocket disconnection during real-time update', 
    scenario: 'websocket_disconnect',
    expectedBehavior: 'Fallback to polling, show connection status'
  },
  {
    name: 'Invalid mention format',
    scenario: 'invalid_mention',
    expectedBehavior: 'Ignore invalid mentions, highlight valid ones only'
  },
  {
    name: 'Link preview service unavailable',
    scenario: 'link_preview_failure',
    expectedBehavior: 'Show plain links without previews, no error to user'
  },
  {
    name: 'Database connection failure during filter',
    scenario: 'db_failure_filter',
    expectedBehavior: 'Show cached results with warning message'
  }
];

// Mobile responsiveness test cases
export const mobileTestCases = [
  { viewport: { width: 320, height: 568 }, device: 'iPhone SE', description: 'Small mobile screen' },
  { viewport: { width: 375, height: 667 }, device: 'iPhone 8', description: 'Standard mobile screen' },
  { viewport: { width: 414, height: 896 }, device: 'iPhone 11', description: 'Large mobile screen' },
  { viewport: { width: 768, height: 1024 }, device: 'iPad', description: 'Tablet screen' },
  { viewport: { width: 1024, height: 768 }, device: 'iPad Landscape', description: 'Tablet landscape' }
];

// Accessibility test cases
export const accessibilityTestCases = [
  { feature: 'Star ratings', requirement: 'Keyboard navigation support' },
  { feature: 'Mentions', requirement: 'Screen reader announcements' },
  { feature: 'Hashtags', requirement: 'Proper ARIA labels' },
  { feature: 'Post actions menu', requirement: 'Focus management' },
  { feature: 'Link previews', requirement: 'Alt text for images' },
  { feature: 'Filter controls', requirement: 'Accessible form controls' }
];