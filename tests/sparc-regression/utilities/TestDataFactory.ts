/**
 * SPARC Test Data Factory
 * Generates consistent mock data for all regression tests
 */

import { MentionSuggestion } from '@/components/MentionInput';

// Mock Data Interfaces
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
    hook?: string;
    wordCount?: number;
    readingTime?: number;
  };
  comments?: number;
  shares?: number;
  likes?: number;
}

export interface MockComment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  replies?: MockComment[];
  repliesCount: number;
  threadDepth: number;
  threadPath: string;
  edited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  isPinned?: boolean;
  mentionedUsers?: string[];
  authorType?: 'agent' | 'user' | 'system';
}

export interface MockAgent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'busy';
  capabilities: string[];
}

export interface MockUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'agent';
}

/**
 * Test Data Factory Class
 * Provides methods to generate consistent mock data
 */
export class TestDataFactory {
  private static instance: TestDataFactory;
  private postIdCounter = 1;
  private commentIdCounter = 1;
  private agentIdCounter = 1;
  private userIdCounter = 1;

  static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  /**
   * Reset all counters - useful for test isolation
   */
  reset(): void {
    this.postIdCounter = 1;
    this.commentIdCounter = 1;
    this.agentIdCounter = 1;
    this.userIdCounter = 1;
  }

  /**
   * Create a mock post with optional overrides
   */
  createMockPost(overrides: Partial<MockPost> = {}): MockPost {
    const id = overrides.id || `post-${this.postIdCounter++}`;
    
    return {
      id,
      title: `Test Post ${id}`,
      content: `This is test content for post ${id}. It contains enough text to test various scenarios and edge cases in the application.`,
      authorAgent: 'test-agent',
      publishedAt: new Date().toISOString(),
      metadata: {
        businessImpact: 5,
        tags: ['test', 'regression'],
        isAgentResponse: false,
        hook: `Test hook for post ${id}`,
        wordCount: 25,
        readingTime: 1,
        ...overrides.metadata
      },
      comments: 0,
      shares: 0,
      likes: 0,
      ...overrides,
    };
  }

  /**
   * Create multiple mock posts
   */
  createMockPosts(count: number, baseOverrides: Partial<MockPost> = {}): MockPost[] {
    return Array.from({ length: count }, (_, i) => 
      this.createMockPost({
        ...baseOverrides,
        id: `post-${this.postIdCounter + i}`,
      })
    );
  }

  /**
   * Create a mock comment with optional overrides
   */
  createMockComment(overrides: Partial<MockComment> = {}): MockComment {
    const id = overrides.id || `comment-${this.commentIdCounter++}`;
    const depth = overrides.threadDepth || 0;
    
    return {
      id,
      content: `Test comment ${id} content. This is a sample comment for testing purposes.`,
      author: 'test-user',
      createdAt: new Date().toISOString(),
      replies: [],
      repliesCount: 0,
      threadDepth: depth,
      threadPath: depth === 0 ? id : `parent/${id}`,
      authorType: 'user',
      ...overrides,
    };
  }

  /**
   * Create a threaded comment structure
   */
  createCommentThread(levels: number = 3, repliesPerLevel: number = 2): MockComment {
    const buildThread = (level: number, parentPath: string = ''): MockComment => {
      const comment = this.createMockComment({
        threadDepth: levels - level,
        threadPath: parentPath,
      });

      if (level > 0) {
        comment.replies = Array.from({ length: repliesPerLevel }, (_, i) => 
          buildThread(level - 1, `${comment.threadPath}/${comment.id}`)
        );
        comment.repliesCount = comment.replies.length;
      }

      return comment;
    };

    return buildThread(levels);
  }

  /**
   * Create a mock agent with optional overrides
   */
  createMockAgent(overrides: Partial<MockAgent> = {}): MockAgent {
    const id = overrides.id || `agent-${this.agentIdCounter++}`;
    const name = overrides.name || `test-agent-${id}`;
    
    return {
      id,
      name,
      displayName: `Test Agent ${id}`,
      description: `Test agent for regression testing - ${id}`,
      status: 'active',
      capabilities: ['analysis', 'communication', 'automation'],
      ...overrides,
    };
  }

  /**
   * Create multiple mock agents
   */
  createMockAgents(count: number): MockAgent[] {
    return Array.from({ length: count }, () => this.createMockAgent());
  }

  /**
   * Create mention suggestions from agents
   */
  createMentionSuggestions(agents?: MockAgent[]): MentionSuggestion[] {
    const testAgents = agents || this.createMockAgents(5);
    
    return testAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      displayName: agent.displayName,
      description: agent.description,
      avatar: agent.avatar,
    }));
  }

  /**
   * Create a mock user
   */
  createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    const id = overrides.id || `user-${this.userIdCounter++}`;
    
    return {
      id,
      username: `testuser${id}`,
      displayName: `Test User ${id}`,
      email: `testuser${id}@example.com`,
      role: 'user',
      ...overrides,
    };
  }

  /**
   * Create realistic post with mentions
   */
  createPostWithMentions(mentionedAgents: string[] = ['agent-1', 'agent-2']): MockPost {
    const mentions = mentionedAgents.map(agent => `@${agent}`).join(' ');
    
    return this.createMockPost({
      content: `This is a test post that mentions some agents: ${mentions}. The post contains realistic content that tests mention functionality.`,
      metadata: {
        businessImpact: 7,
        tags: ['mentions', 'collaboration'],
        isAgentResponse: false,
      }
    });
  }

  /**
   * Create API response mock
   */
  createMockAPIResponse<T>(data: T, success: boolean = true): {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
  } {
    return {
      success,
      data,
      ...(success ? {} : { error: 'Test error', message: 'Test error message' })
    };
  }

  /**
   * Create WebSocket message mock
   */
  createMockWSMessage(type: string, data: any): {
    type: string;
    data: any;
    timestamp: string;
  } {
    return {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate test scenarios for specific features
   */
  generateTestScenarios() {
    return {
      // Mention System Scenarios
      mentionScenarios: {
        emptyQuery: {
          query: '',
          expectedSuggestions: this.createMentionSuggestions(),
        },
        partialMatch: {
          query: 'test',
          expectedSuggestions: this.createMentionSuggestions().filter(s => 
            s.displayName.toLowerCase().includes('test')
          ),
        },
        noMatch: {
          query: 'nonexistent',
          expectedSuggestions: [],
        },
      },

      // Post Creation Scenarios
      postCreationScenarios: {
        validPost: this.createMockPost({
          title: 'Valid Test Post',
          content: 'This is valid content for testing.',
        }),
        postWithMentions: this.createPostWithMentions(),
        postWithTags: this.createMockPost({
          metadata: {
            businessImpact: 8,
            tags: ['urgent', 'feedback', 'planning'],
            isAgentResponse: false,
          }
        }),
      },

      // Comment Threading Scenarios
      commentScenarios: {
        flatComments: Array.from({ length: 5 }, () => this.createMockComment()),
        threadedComments: this.createCommentThread(4, 3),
        deepThread: this.createCommentThread(10, 1), // Test depth limits
      },

      // Performance Test Data
      performanceScenarios: {
        manyPosts: this.createMockPosts(100),
        manyComments: Array.from({ length: 500 }, () => this.createMockComment()),
        manyAgents: this.createMockAgents(50),
      },
    };
  }
}

// Export singleton instance
export const testDataFactory = TestDataFactory.getInstance();

// Export common test data sets
export const MOCK_AGENTS = testDataFactory.createMockAgents(10);
export const MOCK_POSTS = testDataFactory.createMockPosts(20);
export const MOCK_COMMENTS = Array.from({ length: 50 }, () => testDataFactory.createMockComment());
export const MOCK_MENTION_SUGGESTIONS = testDataFactory.createMentionSuggestions(MOCK_AGENTS);