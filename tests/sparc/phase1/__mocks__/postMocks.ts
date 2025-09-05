// SPARC Phase 1: Mock Data for Testing
// Post Structure Enhancement Test Mocks

export const mockAgentPost = {
  id: 'post-123',
  title: 'Test Agent Post Title',
  content: 'This is a test post content that is reasonably short and should not require expansion.',
  authorAgent: 'test-agent',
  publishedAt: '2024-01-15T10:00:00Z',
  metadata: {
    businessImpact: 7,
    tags: ['test', 'automation', 'agent'],
    isAgentResponse: true,
    hook: 'This is a compelling hook for the test post',
    wordCount: 18,
    readingTime: 1,
    characterCount: {
      hook: 45,
      content: 95,
      title: 22
    }
  },
  likes: 3,
  comments: 2
};

export const mockLongContentPost = {
  id: 'post-456',
  title: 'Long Content Post for Expansion Testing',
  content: `This is a very long post content that should definitely trigger the expansion functionality. 
  
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
  
  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.`,
  authorAgent: 'content-agent',
  publishedAt: '2024-01-15T11:30:00Z',
  metadata: {
    businessImpact: 5,
    tags: ['content', 'long-form', 'testing'],
    isAgentResponse: true,
    hook: 'A comprehensive look at our content expansion strategy and implementation details',
    wordCount: 145,
    readingTime: 1,
    characterCount: {
      hook: 89,
      content: 856,
      title: 42
    }
  },
  likes: 8,
  comments: 5
};

export const mockPostWithHook = {
  id: 'post-789',
  title: 'Post with Hook Example',
  content: 'This post demonstrates the hook functionality in our enhanced post structure.',
  authorAgent: 'hook-agent',
  publishedAt: '2024-01-15T09:15:00Z',
  metadata: {
    businessImpact: 6,
    tags: ['hook', 'example', 'ui'],
    isAgentResponse: true,
    hook: 'Discover how hooks can dramatically improve engagement and user experience in social media posts',
    wordCount: 14,
    readingTime: 1,
    characterCount: {
      hook: 105,
      content: 80,
      title: 25
    }
  },
  likes: 12,
  comments: 7
};

export const mockPostWithoutHook = {
  id: 'post-101',
  title: 'Basic Post Without Hook',
  content: 'This is a basic post that does not have a hook defined in its metadata.',
  authorAgent: 'basic-agent',
  publishedAt: '2024-01-15T08:45:00Z',
  metadata: {
    businessImpact: 4,
    tags: ['basic', 'simple'],
    isAgentResponse: true,
    wordCount: 16,
    readingTime: 1,
    characterCount: {
      hook: 0,
      content: 75,
      title: 26
    }
  },
  likes: 2,
  comments: 0
};

export const mockPostExceedingLimits = {
  id: 'post-999',
  title: 'A'.repeat(250), // Exceeds 200 char limit
  content: 'B'.repeat(600), // Exceeds 500 char limit
  authorAgent: 'limit-test-agent',
  publishedAt: '2024-01-15T12:00:00Z',
  metadata: {
    businessImpact: 8,
    tags: ['limit', 'test', 'validation'],
    isAgentResponse: true,
    hook: 'C'.repeat(300), // Exceeds 280 char limit
    wordCount: 85,
    readingTime: 1,
    characterCount: {
      hook: 300,
      content: 600,
      title: 250
    }
  },
  likes: 0,
  comments: 0
};

export const mockEmptyPost = {
  id: 'post-empty',
  title: '',
  content: '',
  authorAgent: 'empty-agent',
  publishedAt: '2024-01-15T13:00:00Z',
  metadata: {
    businessImpact: 1,
    tags: [],
    isAgentResponse: true,
    wordCount: 0,
    readingTime: 0,
    characterCount: {
      hook: 0,
      content: 0,
      title: 0
    }
  },
  likes: 0,
  comments: 0
};

export const mockPostWithManyTags = {
  id: 'post-tags',
  title: 'Post with Many Tags',
  content: 'This post has many tags to test tag rendering and overflow handling.',
  authorAgent: 'tag-agent',
  publishedAt: '2024-01-15T14:30:00Z',
  metadata: {
    businessImpact: 6,
    tags: [
      'tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 
      'long-tag-name', 'another-long-tag', 'ui', 'ux', 'testing', 'overflow'
    ],
    isAgentResponse: true,
    hook: 'Testing tag rendering with multiple tags',
    wordCount: 13,
    readingTime: 1,
    characterCount: {
      hook: 42,
      content: 72,
      title: 19
    }
  },
  likes: 4,
  comments: 1
};

export const mockPostWithSpecialCharacters = {
  id: 'post-special',
  title: 'Post with 🚀 Emojis and Special Characters! @#$%',
  content: `This post contains various special characters and emojis 😊🎉🔥
  
  It includes:
  - Emojis: 🚀🌟💡⚡️🎯
  - Special chars: @#$%^&*()
  - Unicode: ñáéíóú
  - Symbols: ←→↑↓≤≥±×÷`,
  authorAgent: 'unicode-agent',
  publishedAt: '2024-01-15T15:15:00Z',
  metadata: {
    businessImpact: 5,
    tags: ['unicode', 'emoji', 'special-chars'],
    isAgentResponse: true,
    hook: 'Testing character counting with emojis 🧪 and special characters! 🎯',
    wordCount: 25,
    readingTime: 1,
    characterCount: {
      hook: 72,
      content: 185,
      title: 47
    }
  },
  likes: 15,
  comments: 3
};

// Factory functions for creating test posts
export const createMockPost = (overrides: Partial<typeof mockAgentPost> = {}) => ({
  ...mockAgentPost,
  ...overrides,
  id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  metadata: {
    ...mockAgentPost.metadata,
    ...overrides.metadata
  }
});

export const createLongPost = (contentLength: number = 600) => ({
  ...mockLongContentPost,
  content: 'A'.repeat(contentLength),
  id: `long-post-${Date.now()}`,
  metadata: {
    ...mockLongContentPost.metadata,
    characterCount: {
      ...mockLongContentPost.metadata.characterCount,
      content: contentLength
    }
  }
});

export const createPostWithHook = (hookLength: number = 100) => ({
  ...mockPostWithHook,
  id: `hook-post-${Date.now()}`,
  metadata: {
    ...mockPostWithHook.metadata,
    hook: 'H'.repeat(hookLength),
    characterCount: {
      ...mockPostWithHook.metadata.characterCount,
      hook: hookLength
    }
  }
});

// Test data arrays
export const mockPostsList = [
  mockAgentPost,
  mockLongContentPost,
  mockPostWithHook,
  mockPostWithoutHook,
  mockPostWithManyTags,
  mockPostWithSpecialCharacters
];

export const mockExpandedPostsSet = new Set(['post-456', 'post-789']);

// Character counting test data
export const characterCountTestCases = [
  {
    name: 'simple text',
    input: 'Hello world!',
    expectedCount: 12
  },
  {
    name: 'text with emojis',
    input: 'Hello 👋 world 🌍!',
    expectedCount: 18 // Emojis count as 2 chars each
  },
  {
    name: 'text with special characters',
    input: 'Café naïve résumé',
    expectedCount: 17
  },
  {
    name: 'empty string',
    input: '',
    expectedCount: 0
  },
  {
    name: 'whitespace only',
    input: '   \n\t  ',
    expectedCount: 7
  },
  {
    name: 'mixed unicode',
    input: 'Hello 世界 🌍',
    expectedCount: 11
  }
];

// Validation test cases
export const validationTestCases = {
  hook: {
    valid: [
      'Short hook',
      'A'.repeat(280), // Exactly at limit
      'Hook with emojis 🚀 and special chars!'
    ],
    invalid: [
      'A'.repeat(281), // Over limit
      'Hook with too many emojis ' + '🚀'.repeat(50)
    ]
  },
  content: {
    valid: [
      'Short content',
      'A'.repeat(500), // Exactly at limit
      'Content with emojis 📝 and formatting'
    ],
    invalid: [
      'A'.repeat(501), // Over limit
      'Content with excessive emojis ' + '📝'.repeat(100)
    ]
  },
  title: {
    valid: [
      'Short title',
      'A'.repeat(200), // Exactly at limit
      'Title with emojis 🎯'
    ],
    invalid: [
      'A'.repeat(201), // Over limit
      ''
    ]
  }
};