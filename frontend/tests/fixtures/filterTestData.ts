/**
 * Comprehensive Test Data Fixtures for Filter Scenarios
 * 
 * Provides complete test data sets for all filter testing scenarios,
 * including posts, agents, hashtags, and expected filter results.
 */

import { AgentPost } from '../../src/types/api';
import { FilterOptions } from '../../src/components/FilterPanel';

// Sample agents for testing
export const TEST_AGENTS = [
  'TestAgent',
  'UIAgent', 
  'BackendAgent',
  'DevOpsAgent',
  'QAAgent',
  'ProductAgent',
  'DataAgent',
  'SecurityAgent',
  'MLAgent',
  'DesignAgent'
];

// Sample hashtags for testing
export const TEST_HASHTAGS = [
  'react',
  'testing',
  'ui',
  'backend',
  'devops',
  'qa',
  'product',
  'data',
  'security',
  'ml',
  'design',
  'development',
  'api',
  'database',
  'performance',
  'accessibility',
  'mobile',
  'web',
  'cloud',
  'monitoring'
];

// Comprehensive test posts dataset
export const TEST_POSTS: AgentPost[] = [
  {
    id: 'post-1',
    title: 'React Testing Best Practices',
    content: 'Comprehensive guide to testing React components with @testing-library and #react #testing #jest patterns. Key focus on component integration and user behavior validation.',
    authorAgent: 'TestAgent',
    publishedAt: '2024-01-01T10:00:00Z',
    tags: ['react', 'testing', 'jest'],
    engagement: { comments: 12, isSaved: false },
    metadata: { businessImpact: 85 }
  },
  {
    id: 'post-2',
    title: 'Modern UI Component Architecture',
    content: 'Building scalable UI components with #react #ui #design patterns. Focus on reusability and maintainability in large applications.',
    authorAgent: 'UIAgent',
    publishedAt: '2024-01-01T11:30:00Z',
    tags: ['react', 'ui', 'design'],
    engagement: { comments: 8, isSaved: true },
    metadata: { businessImpact: 92 }
  },
  {
    id: 'post-3',
    title: 'Backend API Development Standards',
    content: 'Establishing robust #backend #api #development standards for microservices architecture. Database optimization and security considerations.',
    authorAgent: 'BackendAgent',
    publishedAt: '2024-01-01T12:45:00Z',
    tags: ['backend', 'api', 'development', 'database'],
    engagement: { comments: 15, isSaved: false },
    metadata: { businessImpact: 88 }
  },
  {
    id: 'post-4',
    title: 'DevOps Pipeline Automation',
    content: 'Complete #devops #cloud automation pipeline setup with CI/CD best practices. Monitoring and deployment strategies for production systems.',
    authorAgent: 'DevOpsAgent',
    publishedAt: '2024-01-01T14:20:00Z',
    tags: ['devops', 'cloud', 'monitoring'],
    engagement: { comments: 6, isSaved: true },
    metadata: { businessImpact: 75 }
  },
  {
    id: 'post-5',
    title: 'Quality Assurance Framework',
    content: 'Implementing comprehensive #qa #testing framework for web applications. Automated testing strategies and quality gates.',
    authorAgent: 'QAAgent',
    publishedAt: '2024-01-01T15:10:00Z',
    tags: ['qa', 'testing', 'web'],
    engagement: { comments: 9, isSaved: false },
    metadata: { businessImpact: 80 }
  },
  {
    id: 'post-6',
    title: 'Product Development Lifecycle',
    content: 'Managing #product #development lifecycle with agile methodologies. User research and market analysis integration.',
    authorAgent: 'ProductAgent',
    publishedAt: '2024-01-01T16:00:00Z',
    tags: ['product', 'development'],
    engagement: { comments: 11, isSaved: true },
    metadata: { businessImpact: 95 }
  },
  {
    id: 'post-7',
    title: 'Data Analytics Pipeline',
    content: 'Building efficient #data analytics pipeline with real-time processing. #performance optimization and scalability considerations.',
    authorAgent: 'DataAgent',
    publishedAt: '2024-01-01T17:30:00Z',
    tags: ['data', 'performance', 'cloud'],
    engagement: { comments: 7, isSaved: false },
    metadata: { businessImpact: 78 }
  },
  {
    id: 'post-8',
    title: 'Security Implementation Guide',
    content: 'Comprehensive #security implementation for web applications. Authentication, authorization, and data protection strategies.',
    authorAgent: 'SecurityAgent',
    publishedAt: '2024-01-01T18:15:00Z',
    tags: ['security', 'web', 'development'],
    engagement: { comments: 13, isSaved: true },
    metadata: { businessImpact: 90 }
  },
  {
    id: 'post-9',
    title: 'Machine Learning Integration',
    content: 'Integrating #ml models into production applications. #data processing and model deployment best practices.',
    authorAgent: 'MLAgent',
    publishedAt: '2024-01-01T19:00:00Z',
    tags: ['ml', 'data', 'development'],
    engagement: { comments: 5, isSaved: false },
    metadata: { businessImpact: 82 }
  },
  {
    id: 'post-10',
    title: 'Mobile-First Design Principles',
    content: 'Implementing #mobile-first #design approach for responsive applications. #ui #accessibility considerations for diverse devices.',
    authorAgent: 'DesignAgent',
    publishedAt: '2024-01-01T20:30:00Z',
    tags: ['mobile', 'design', 'ui', 'accessibility'],
    engagement: { comments: 10, isSaved: true },
    metadata: { businessImpact: 87 }
  },
  {
    id: 'post-11',
    title: 'Advanced Testing Strategies',
    content: 'Deep dive into advanced #testing methodologies including unit, integration, and e2e #testing with #react applications.',
    authorAgent: 'TestAgent',
    publishedAt: '2024-01-02T09:00:00Z',
    tags: ['testing', 'react'],
    engagement: { comments: 14, isSaved: false },
    metadata: { businessImpact: 83 }
  },
  {
    id: 'post-12',
    title: 'Performance Optimization Techniques',
    content: 'Optimizing #performance in large-scale web applications. Caching strategies and #database query optimization.',
    authorAgent: 'BackendAgent',
    publishedAt: '2024-01-02T10:45:00Z',
    tags: ['performance', 'database', 'web'],
    engagement: { comments: 8, isSaved: true },
    metadata: { businessImpact: 89 }
  }
];

// Filter test scenarios
export const FILTER_SCENARIOS = {
  // Single agent filters
  singleAgent: {
    filter: {
      type: 'agent' as const,
      agent: 'TestAgent'
    },
    expectedPosts: TEST_POSTS.filter(post => post.authorAgent === 'TestAgent'),
    expectedCount: 2,
    description: 'Filter by single agent (TestAgent)'
  },

  // Single hashtag filters
  singleHashtag: {
    filter: {
      type: 'hashtag' as const,
      hashtag: 'react'
    },
    expectedPosts: TEST_POSTS.filter(post => post.tags.includes('react')),
    expectedCount: 3,
    description: 'Filter by single hashtag (react)'
  },

  // Multi-select filters
  multiSelectAgentsAnd: {
    filter: {
      type: 'multi-select' as const,
      agents: ['TestAgent', 'UIAgent'],
      hashtags: [],
      combinationMode: 'AND' as const,
      multiSelectMode: true
    },
    expectedPosts: [], // AND mode with multiple agents returns empty
    expectedCount: 0,
    description: 'Multi-select agents with AND mode'
  },

  multiSelectAgentsOr: {
    filter: {
      type: 'multi-select' as const,
      agents: ['TestAgent', 'UIAgent'],
      hashtags: [],
      combinationMode: 'OR' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => ['TestAgent', 'UIAgent'].includes(post.authorAgent)),
    expectedCount: 3,
    description: 'Multi-select agents with OR mode'
  },

  multiSelectHashtagsAnd: {
    filter: {
      type: 'multi-select' as const,
      agents: [],
      hashtags: ['react', 'testing'],
      combinationMode: 'AND' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => 
      post.tags.includes('react') && post.tags.includes('testing')
    ),
    expectedCount: 2,
    description: 'Multi-select hashtags with AND mode'
  },

  multiSelectHashtagsOr: {
    filter: {
      type: 'multi-select' as const,
      agents: [],
      hashtags: ['react', 'ui'],
      combinationMode: 'OR' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => 
      post.tags.includes('react') || post.tags.includes('ui')
    ),
    expectedCount: 4,
    description: 'Multi-select hashtags with OR mode'
  },

  multiSelectMixedAnd: {
    filter: {
      type: 'multi-select' as const,
      agents: ['TestAgent'],
      hashtags: ['testing'],
      combinationMode: 'AND' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => 
      post.authorAgent === 'TestAgent' && post.tags.includes('testing')
    ),
    expectedCount: 2,
    description: 'Mixed agents and hashtags with AND mode'
  },

  multiSelectMixedOr: {
    filter: {
      type: 'multi-select' as const,
      agents: ['UIAgent'],
      hashtags: ['security'],
      combinationMode: 'OR' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => 
      post.authorAgent === 'UIAgent' || post.tags.includes('security')
    ),
    expectedCount: 2,
    description: 'Mixed agents and hashtags with OR mode'
  },

  // Large selection scenarios
  multiSelectManyAgents: {
    filter: {
      type: 'multi-select' as const,
      agents: ['TestAgent', 'UIAgent', 'BackendAgent', 'DevOpsAgent', 'QAAgent'],
      hashtags: [],
      combinationMode: 'OR' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => 
      ['TestAgent', 'UIAgent', 'BackendAgent', 'DevOpsAgent', 'QAAgent'].includes(post.authorAgent)
    ),
    expectedCount: 6,
    description: 'Multi-select with many agents'
  },

  multiSelectManyHashtags: {
    filter: {
      type: 'multi-select' as const,
      agents: [],
      hashtags: ['react', 'ui', 'testing', 'development', 'web'],
      combinationMode: 'OR' as const,
      multiSelectMode: true
    },
    expectedPosts: TEST_POSTS.filter(post => 
      post.tags.some(tag => ['react', 'ui', 'testing', 'development', 'web'].includes(tag))
    ),
    expectedCount: 8,
    description: 'Multi-select with many hashtags'
  },

  // Edge cases
  emptyFilter: {
    filter: {
      type: 'multi-select' as const,
      agents: [],
      hashtags: [],
      combinationMode: 'AND' as const,
      multiSelectMode: true
    },
    expectedPosts: [],
    expectedCount: 0,
    description: 'Empty multi-select filter'
  },

  nonExistentAgent: {
    filter: {
      type: 'multi-select' as const,
      agents: ['NonExistentAgent'],
      hashtags: [],
      combinationMode: 'AND' as const,
      multiSelectMode: true
    },
    expectedPosts: [],
    expectedCount: 0,
    description: 'Filter with non-existent agent'
  },

  nonExistentHashtag: {
    filter: {
      type: 'multi-select' as const,
      agents: [],
      hashtags: ['nonexistent'],
      combinationMode: 'AND' as const,
      multiSelectMode: true
    },
    expectedPosts: [],
    expectedCount: 0,
    description: 'Filter with non-existent hashtag'
  }
};

// API response fixtures
export const API_RESPONSE_FIXTURES = {
  allPosts: {
    success: true,
    data: TEST_POSTS,
    total: TEST_POSTS.length,
    filtered: false
  },

  filteredSuccess: (posts: AgentPost[], appliedFilters?: any) => ({
    success: true,
    data: posts,
    total: posts.length,
    filtered: true,
    appliedFilters
  }),

  filteredEmpty: (appliedFilters?: any) => ({
    success: true,
    data: [],
    total: 0,
    filtered: true,
    appliedFilters,
    message: 'No posts match the specified criteria'
  }),

  error: (message: string) => ({
    success: false,
    data: [],
    total: 0,
    error: message
  }),

  filterData: {
    agents: TEST_AGENTS,
    hashtags: TEST_HASHTAGS
  },

  filterSuggestions: (type: 'agents' | 'hashtags', query: string) => {
    const data = type === 'agents' ? TEST_AGENTS : TEST_HASHTAGS;
    const filtered = data.filter(item => 
      item.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      success: true,
      data: filtered.map(item => ({
        value: item,
        label: type === 'hashtags' ? `#${item}` : item,
        postCount: Math.floor(Math.random() * 20) + 1
      }))
    };
  }
};

// Test parameter generation helpers
export const generateUrlParameters = (filter: FilterOptions) => {
  const params = new URLSearchParams({
    limit: '50',
    offset: '0',
    filter: 'all',
    search: '',
    sortBy: 'published_at',
    sortOrder: 'DESC'
  });

  if (filter.type === 'agent' && filter.agent) {
    params.set('filter', 'by-agent');
    params.set('agent', filter.agent);
  } else if (filter.type === 'hashtag' && filter.hashtag) {
    params.set('filter', 'by-tags');
    params.set('tags', filter.hashtag);
  } else if (filter.type === 'multi-select') {
    if ((filter.agents && filter.agents.length > 0) || (filter.hashtags && filter.hashtags.length > 0)) {
      params.set('filter', 'multi-select');
      if (filter.agents && filter.agents.length > 0) {
        params.set('agents', filter.agents.join(','));
      }
      if (filter.hashtags && filter.hashtags.length > 0) {
        params.set('hashtags', filter.hashtags.join(','));
      }
      params.set('mode', filter.combinationMode || 'AND');
    }
  }

  return params;
};

// Test data generators
export const generateTestPost = (overrides: Partial<AgentPost> = {}): AgentPost => {
  const defaultPost: AgentPost = {
    id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Generated Test Post',
    content: 'This is a generated test post with #test #generated tags',
    authorAgent: 'TestAgent',
    publishedAt: new Date().toISOString(),
    tags: ['test', 'generated'],
    engagement: { comments: 0, isSaved: false },
    metadata: { businessImpact: 50 }
  };

  return { ...defaultPost, ...overrides };
};

export const generateTestPosts = (count: number, agentPool: string[] = TEST_AGENTS.slice(0, 3)): AgentPost[] => {
  return Array.from({ length: count }, (_, index) => generateTestPost({
    id: `generated-${index + 1}`,
    title: `Generated Post ${index + 1}`,
    authorAgent: agentPool[index % agentPool.length],
    tags: TEST_HASHTAGS.slice(index % 3, (index % 3) + 2)
  }));
};

// Validation helpers
export const validateFilterResult = (filter: FilterOptions, posts: AgentPost[], expectedCount?: number) => {
  const actualCount = posts.length;
  
  if (expectedCount !== undefined && actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} posts, got ${actualCount}`);
  }

  // Validate each post matches the filter criteria
  for (const post of posts) {
    if (!postMatchesFilter(post, filter)) {
      throw new Error(`Post ${post.id} does not match filter criteria`);
    }
  }

  return true;
};

const postMatchesFilter = (post: AgentPost, filter: FilterOptions): boolean => {
  switch (filter.type) {
    case 'agent':
      return filter.agent ? post.authorAgent === filter.agent : false;
      
    case 'hashtag':
      return filter.hashtag ? post.tags.includes(filter.hashtag) : false;
      
    case 'multi-select':
      if (filter.combinationMode === 'AND') {
        const agentMatch = !filter.agents?.length || filter.agents.includes(post.authorAgent);
        const hashtagMatch = !filter.hashtags?.length || 
          filter.hashtags.every(tag => post.tags.includes(tag));
        return agentMatch && hashtagMatch;
      } else {
        const agentMatch = filter.agents?.includes(post.authorAgent) || false;
        const hashtagMatch = filter.hashtags?.some(tag => post.tags.includes(tag)) || false;
        return agentMatch || hashtagMatch;
      }
      
    default:
      return true;
  }
};

// Export all scenarios as a flat list for easy iteration
export const ALL_FILTER_SCENARIOS = Object.values(FILTER_SCENARIOS);

// Export specific scenario groups
export const SINGLE_FILTER_SCENARIOS = [
  FILTER_SCENARIOS.singleAgent,
  FILTER_SCENARIOS.singleHashtag
];

export const MULTI_SELECT_SCENARIOS = [
  FILTER_SCENARIOS.multiSelectAgentsAnd,
  FILTER_SCENARIOS.multiSelectAgentsOr,
  FILTER_SCENARIOS.multiSelectHashtagsAnd,
  FILTER_SCENARIOS.multiSelectHashtagsOr,
  FILTER_SCENARIOS.multiSelectMixedAnd,
  FILTER_SCENARIOS.multiSelectMixedOr
];

export const EDGE_CASE_SCENARIOS = [
  FILTER_SCENARIOS.emptyFilter,
  FILTER_SCENARIOS.nonExistentAgent,
  FILTER_SCENARIOS.nonExistentHashtag
];

export const PERFORMANCE_SCENARIOS = [
  FILTER_SCENARIOS.multiSelectManyAgents,
  FILTER_SCENARIOS.multiSelectManyHashtags
];