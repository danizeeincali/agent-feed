/**
 * Centralized Mock Factory for Mesh Network Testing
 * Provides consistent mocks across all swarm agents
 */

import { vi } from 'vitest';

export interface MockPost {
  id: string;
  content: string;
  author: string;
  mentions: string[];
  hashtags: string[];
  timestamp: string;
  likes: number;
  comments: MockComment[];
  draft?: boolean;
}

export interface MockComment {
  id: string;
  postId: string;
  content: string;
  author: string;
  mentions: string[];
  timestamp: string;
  parentId?: string;
  replies?: MockComment[];
}

export interface MockAgent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  memory?: Record<string, any>;
}

export interface MockWebSocketMessage {
  type: 'post_created' | 'comment_added' | 'mention_notification' | 'agent_update';
  data: any;
  timestamp: string;
}

export class SwarmMockFactory {
  private static instance: SwarmMockFactory;
  private mockData: Map<string, any> = new Map();

  static getInstance(): SwarmMockFactory {
    if (!SwarmMockFactory.instance) {
      SwarmMockFactory.instance = new SwarmMockFactory();
    }
    return SwarmMockFactory.instance;
  }

  /**
   * Create mock posts with mentions and hashtags
   */
  createMockPosts(count: number = 5): MockPost[] {
    const posts: MockPost[] = [];
    
    for (let i = 0; i < count; i++) {
      const post: MockPost = {
        id: `post-${i + 1}`,
        content: this.generatePostContent(i),
        author: this.getRandomAuthor(),
        mentions: this.generateMentions(),
        hashtags: this.generateHashtags(),
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        likes: Math.floor(Math.random() * 100),
        comments: this.createMockComments(`post-${i + 1}`, Math.floor(Math.random() * 5))
      };
      posts.push(post);
    }
    
    return posts;
  }

  /**
   * Create mock comments with threading
   */
  createMockComments(postId: string, count: number = 3): MockComment[] {
    const comments: MockComment[] = [];
    
    for (let i = 0; i < count; i++) {
      const comment: MockComment = {
        id: `comment-${postId}-${i + 1}`,
        postId,
        content: this.generateCommentContent(i),
        author: this.getRandomAuthor(),
        mentions: Math.random() > 0.7 ? this.generateMentions(1) : [],
        timestamp: new Date(Date.now() - i * 30000).toISOString(),
        replies: Math.random() > 0.5 ? this.createMockReplies(`comment-${postId}-${i + 1}`) : []
      };
      comments.push(comment);
    }
    
    return comments;
  }

  /**
   * Create mock comment replies
   */
  createMockReplies(parentId: string, count: number = 2): MockComment[] {
    const replies: MockComment[] = [];
    
    for (let i = 0; i < count; i++) {
      const reply: MockComment = {
        id: `reply-${parentId}-${i + 1}`,
        postId: parentId.split('-')[1], // Extract post ID
        content: `Reply ${i + 1} to comment`,
        author: this.getRandomAuthor(),
        mentions: Math.random() > 0.8 ? this.generateMentions(1) : [],
        timestamp: new Date(Date.now() - i * 10000).toISOString(),
        parentId
      };
      replies.push(reply);
    }
    
    return replies;
  }

  /**
   * Create mock agents for swarm testing
   */
  createMockAgents(count: number = 5): MockAgent[] {
    const agents: MockAgent[] = [];
    const agentTypes = ['researcher', 'coder', 'tester', 'analyst', 'coordinator'];
    
    for (let i = 0; i < count; i++) {
      const agent: MockAgent = {
        id: `agent-${i + 1}`,
        name: `${agentTypes[i % agentTypes.length]}-${i + 1}`,
        status: this.getRandomStatus(),
        capabilities: this.generateCapabilities(agentTypes[i % agentTypes.length]),
        memory: this.generateAgentMemory()
      };
      agents.push(agent);
    }
    
    return agents;
  }

  /**
   * Create mock WebSocket messages
   */
  createMockWebSocketMessages(count: number = 10): MockWebSocketMessage[] {
    const messages: MockWebSocketMessage[] = [];
    const messageTypes = ['post_created', 'comment_added', 'mention_notification', 'agent_update'] as const;
    
    for (let i = 0; i < count; i++) {
      const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const message: MockWebSocketMessage = {
        type,
        data: this.generateMessageData(type),
        timestamp: new Date(Date.now() - i * 1000).toISOString()
      };
      messages.push(message);
    }
    
    return messages;
  }

  /**
   * Mock API responses
   */
  createApiMocks() {
    const apiMocks = {
      fetchPosts: vi.fn().mockResolvedValue(this.createMockPosts()),
      createPost: vi.fn().mockImplementation((post) => Promise.resolve({ ...post, id: `post-${Date.now()}` })),
      updatePost: vi.fn().mockImplementation((id, updates) => Promise.resolve({ id, ...updates })),
      deletePost: vi.fn().mockResolvedValue({ success: true }),
      
      fetchComments: vi.fn().mockImplementation((postId) => 
        Promise.resolve(this.createMockComments(postId))
      ),
      createComment: vi.fn().mockImplementation((comment) => 
        Promise.resolve({ ...comment, id: `comment-${Date.now()}` })
      ),
      
      searchPosts: vi.fn().mockImplementation((query) => {
        const posts = this.createMockPosts();
        return Promise.resolve(posts.filter(p => 
          p.content.toLowerCase().includes(query.toLowerCase()) ||
          p.hashtags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        ));
      }),
      
      getMentions: vi.fn().mockImplementation((username) => {
        const posts = this.createMockPosts();
        return Promise.resolve(posts.filter(p => p.mentions.includes(username)));
      })
    };
    
    this.mockData.set('apiMocks', apiMocks);
    return apiMocks;
  }

  /**
   * Mock WebSocket connection
   */
  createWebSocketMock() {
    const mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: WebSocket.OPEN,
      
      // Simulate message sending
      simulateMessage: (message: MockWebSocketMessage) => {
        const messageEvent = new MessageEvent('message', {
          data: JSON.stringify(message)
        });
        // Trigger any registered listeners
        mockWebSocket._listeners?.message?.forEach((listener: any) => listener(messageEvent));
      },
      
      _listeners: {} as Record<string, Function[]>
    };
    
    // Override addEventListener to track listeners
    mockWebSocket.addEventListener = vi.fn().mockImplementation((event, listener) => {
      if (!mockWebSocket._listeners[event]) {
        mockWebSocket._listeners[event] = [];
      }
      mockWebSocket._listeners[event].push(listener);
    });
    
    this.mockData.set('webSocketMock', mockWebSocket);
    return mockWebSocket;
  }

  /**
   * Mock React Query client
   */
  createQueryClientMock() {
    const queryClient = {
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
      fetchQuery: vi.fn(),
      prefetchQuery: vi.fn(),
      removeQueries: vi.fn(),
      clear: vi.fn()
    };
    
    this.mockData.set('queryClientMock', queryClient);
    return queryClient;
  }

  /**
   * Mock local storage
   */
  createLocalStorageMock() {
    const store: Record<string, string> = {};
    
    const localStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]); }),
      length: 0,
      key: vi.fn()
    };
    
    Object.defineProperty(localStorage, 'length', {
      get: () => Object.keys(store).length
    });
    
    this.mockData.set('localStorageMock', localStorage);
    return localStorage;
  }

  /**
   * Get stored mock data
   */
  getMockData<T>(key: string): T | undefined {
    return this.mockData.get(key);
  }

  /**
   * Reset all mocks
   */
  resetMocks(): void {
    this.mockData.clear();
    vi.clearAllMocks();
  }

  // Private helper methods
  private generatePostContent(index: number): string {
    const templates = [
      `This is a test post ${index + 1} about AI development @claude #AI #development`,
      `Working on some new features today! @agent-${(index % 3) + 1} what do you think? #features #testing`,
      `Great collaboration happening in the mesh network @swarm-coordinator #mesh #collaboration`,
      `Performance improvements are looking good @performance-agent #optimization #speed`,
      `Testing the mention system @test-agent #mentions #testing #regression-prevention`
    ];
    return templates[index % templates.length];
  }

  private generateCommentContent(index: number): string {
    const templates = [
      `Great point! I agree with this approach.`,
      `@author thanks for sharing this insight!`,
      `This is exactly what we needed for the project.`,
      `Have you considered the edge cases here?`,
      `@team-lead this aligns with our goals perfectly!`
    ];
    return templates[index % templates.length];
  }

  private getRandomAuthor(): string {
    const authors = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace'];
    return authors[Math.floor(Math.random() * authors.length)];
  }

  private generateMentions(count?: number): string[] {
    const users = ['claude', 'agent-1', 'agent-2', 'team-lead', 'developer', 'tester'];
    const mentionCount = count || Math.floor(Math.random() * 3) + 1;
    const mentions: string[] = [];
    
    for (let i = 0; i < mentionCount; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      if (!mentions.includes(user)) {
        mentions.push(user);
      }
    }
    
    return mentions;
  }

  private generateHashtags(): string[] {
    const tags = ['AI', 'development', 'testing', 'features', 'optimization', 'collaboration', 'mesh-network'];
    const tagCount = Math.floor(Math.random() * 3) + 1;
    const hashtags: string[] = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = tags[Math.floor(Math.random() * tags.length)];
      if (!hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    }
    
    return hashtags;
  }

  private getRandomStatus(): 'online' | 'offline' | 'busy' {
    const statuses = ['online', 'offline', 'busy'] as const;
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private generateCapabilities(agentType: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      researcher: ['analysis', 'data-gathering', 'reporting', 'research'],
      coder: ['implementation', 'debugging', 'code-review', 'refactoring'],
      tester: ['testing', 'validation', 'quality-assurance', 'regression-testing'],
      analyst: ['performance-analysis', 'monitoring', 'metrics', 'optimization'],
      coordinator: ['orchestration', 'planning', 'coordination', 'management']
    };
    
    return capabilityMap[agentType] || ['general-purpose'];
  }

  private generateAgentMemory(): Record<string, any> {
    return {
      lastTask: `task-${Math.floor(Math.random() * 1000)}`,
      completedTasks: Math.floor(Math.random() * 10),
      performance: Math.random(),
      preferences: {
        testFramework: 'vitest',
        parallelExecution: true
      }
    };
  }

  private generateMessageData(type: MockWebSocketMessage['type']): any {
    switch (type) {
      case 'post_created':
        return this.createMockPosts(1)[0];
      case 'comment_added':
        return this.createMockComments('post-1', 1)[0];
      case 'mention_notification':
        return {
          mentionedUser: 'current-user',
          postId: `post-${Math.floor(Math.random() * 100)}`,
          author: this.getRandomAuthor()
        };
      case 'agent_update':
        return this.createMockAgents(1)[0];
      default:
        return {};
    }
  }
}

// Export singleton instance
export const mockFactory = SwarmMockFactory.getInstance();