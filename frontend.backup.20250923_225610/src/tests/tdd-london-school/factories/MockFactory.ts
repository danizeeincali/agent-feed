/**
 * Mock Factory for TDD London School Testing
 * Creates standardized mocks for all components and services
 */

import { vi, type MockedFunction, type MockedObject } from 'vitest';
import { render, type RenderResult } from '@testing-library/react';
import { MentionSuggestion } from '@/components/MentionInput';
import { Comment } from '@/components/CommentThread';
import { 
  mockFactory,
  ALL_CONTRACTS,
  type IMentionService,
  type IPostCreator,
  type IDraftManager,
  type ICommentThread,
  type ICommentAPI,
  type IHTTPService,
  type IWebSocketService
} from '../contracts/ComponentContracts';

// ==================== MOCK DATA FACTORIES ====================

/**
 * Mock Mention Suggestions Factory
 */
export const createMockMentionSuggestion = (overrides?: Partial<MentionSuggestion>): MentionSuggestion => ({
  id: 'test-agent-id',
  name: 'test-agent',
  displayName: 'Test Agent',
  description: 'Test agent for unit testing',
  avatar: '/test-avatar.jpg',
  type: 'test',
  ...overrides
});

export const createMockMentionSuggestions = (count = 3): MentionSuggestion[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockMentionSuggestion({
      id: `agent-${index}`,
      name: `agent-${index}`,
      displayName: `Test Agent ${index + 1}`,
      description: `Test agent ${index + 1} for unit testing`
    })
  );
};

/**
 * Mock Comment Factory
 */
export const createMockComment = (overrides?: Partial<Comment>): Comment => ({
  id: 'comment-1',
  content: 'This is a test comment',
  author: 'test-user',
  createdAt: new Date().toISOString(),
  parentId: undefined,
  replies: [],
  repliesCount: 0,
  threadDepth: 0,
  threadPath: 'comment-1',
  edited: false,
  isDeleted: false,
  isPinned: false,
  isModerated: false,
  authorType: 'user',
  ...overrides
});

export const createMockCommentThread = (count = 3, depth = 2): Comment[] => {
  const comments: Comment[] = [];
  
  // Create root comments
  for (let i = 0; i < count; i++) {
    const rootComment = createMockComment({
      id: `comment-${i}`,
      content: `Root comment ${i + 1}`,
      threadPath: `comment-${i}`
    });
    comments.push(rootComment);
    
    // Create replies if depth > 0
    if (depth > 0) {
      for (let j = 0; j < 2; j++) {
        const replyComment = createMockComment({
          id: `comment-${i}-${j}`,
          content: `Reply ${j + 1} to comment ${i + 1}`,
          parentId: `comment-${i}`,
          threadDepth: 1,
          threadPath: `comment-${i}/comment-${i}-${j}`
        });
        comments.push(replyComment);
      }
    }
  }
  
  return comments;
};

/**
 * Mock Post Data Factory
 */
export const createMockPost = (overrides?: any) => ({
  id: 'post-1',
  title: 'Test Post',
  content: 'This is a test post content',
  author_agent: 'test-user',
  created_at: new Date().toISOString(),
  metadata: {
    businessImpact: 5,
    tags: ['test'],
    isAgentResponse: false,
    wordCount: 6,
    readingTime: 1
  },
  ...overrides
});

/**
 * Mock Draft Data Factory
 */
export const createMockDraft = (overrides?: any) => ({
  id: 'draft-1',
  title: 'Test Draft',
  content: 'This is a test draft content',
  tags: ['test'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

// ==================== SERVICE MOCKS ====================

/**
 * Mock Mention Service
 */
export const createMockMentionService = (overrides?: Partial<IMentionService>): MockedObject<IMentionService> => {
  const defaultBehavior: MockedObject<IMentionService> = {
    searchMentions: vi.fn().mockResolvedValue(createMockMentionSuggestions()),
    getAllAgents: vi.fn().mockReturnValue(createMockMentionSuggestions(5)),
    getQuickMentions: vi.fn().mockReturnValue(createMockMentionSuggestions(3)),
    getAgentById: vi.fn().mockReturnValue(createMockMentionSuggestion()),
    validateMention: vi.fn().mockReturnValue(true),
    extractMentions: vi.fn().mockReturnValue(['test-agent']),
    clearCache: vi.fn()
  };

  return { ...defaultBehavior, ...overrides };
};

/**
 * Mock HTTP Service
 */
export const createMockHTTPService = (overrides?: Partial<IHTTPService>): MockedObject<IHTTPService> => {
  const defaultBehavior: MockedObject<IHTTPService> = {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn().mockResolvedValue({})
  };

  return { ...defaultBehavior, ...overrides };
};

/**
 * Mock WebSocket Service
 */
export const createMockWebSocketService = (overrides?: Partial<IWebSocketService>): MockedObject<IWebSocketService> => {
  const defaultBehavior: MockedObject<IWebSocketService> = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    isConnected: vi.fn().mockReturnValue(false),
    getConnectionState: vi.fn().mockReturnValue('disconnected' as const)
  };

  return { ...defaultBehavior, ...overrides };
};

/**
 * Mock Draft Manager
 */
export const createMockDraftManager = (overrides?: Partial<IDraftManager>): MockedObject<IDraftManager> => {
  const defaultBehavior: MockedObject<IDraftManager> = {
    createDraft: vi.fn().mockResolvedValue(createMockDraft()),
    updateDraft: vi.fn().mockResolvedValue(createMockDraft()),
    deleteDraft: vi.fn().mockResolvedValue(undefined),
    getDraft: vi.fn().mockResolvedValue(createMockDraft()),
    getAllDrafts: vi.fn().mockResolvedValue([createMockDraft()]),
    autosave: vi.fn().mockResolvedValue(undefined)
  };

  return { ...defaultBehavior, ...overrides };
};

/**
 * Mock Comment API Service
 */
export const createMockCommentAPI = (overrides?: Partial<ICommentAPI>): MockedObject<ICommentAPI> => {
  const defaultBehavior: MockedObject<ICommentAPI> = {
    createReply: vi.fn().mockResolvedValue(createMockComment()),
    updateComment: vi.fn().mockResolvedValue(createMockComment()),
    deleteComment: vi.fn().mockResolvedValue(undefined),
    pinComment: vi.fn().mockResolvedValue(undefined),
    reportComment: vi.fn().mockResolvedValue(undefined),
    getComments: vi.fn().mockResolvedValue(createMockCommentThread()),
    getCommentThread: vi.fn().mockResolvedValue(createMockCommentThread())
  };

  return { ...defaultBehavior, ...overrides };
};

// ==================== COMPONENT MOCKS ====================

/**
 * Mock React Component Factory
 */
export const createMockComponent = (name: string, props?: any) => {
  const MockComponent = vi.fn().mockImplementation((componentProps) => {
    return <div data-testid={`mock-${name.toLowerCase()}`} {...componentProps} />;
  });
  
  MockComponent.displayName = `Mock${name}`;
  return MockComponent;
};

/**
 * Mock MentionInput Component
 */
export const createMockMentionInput = () => {
  const mockRef = {
    focus: vi.fn(),
    blur: vi.fn(),
    insertMention: vi.fn(),
    getCurrentMentionQuery: vi.fn().mockReturnValue(null),
    selectionStart: 0,
    selectionEnd: 0,
    setSelectionRange: vi.fn()
  };

  const MockMentionInput = vi.fn().mockImplementation(({ onMentionSelect, onChange, ...props }) => (
    <textarea 
      data-testid="mock-mention-input"
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  ));

  return { MockMentionInput, mockRef };
};

// ==================== TEST UTILITIES ====================

/**
 * Test Setup Helper
 */
export class TestSetupHelper {
  private mocks: Map<string, MockedObject<any>> = new Map();

  constructor() {
    // Register all contracts
    ALL_CONTRACTS.forEach(contract => {
      mockFactory.registerContract(contract);
    });
  }

  /**
   * Create and register a mock service
   */
  public mockService<T>(contractName: string, overrides?: Partial<T>): MockedObject<T> {
    const mock = mockFactory.createMock<T>(contractName, overrides);
    this.mocks.set(contractName, mock);
    return mock;
  }

  /**
   * Get a registered mock
   */
  public getMock<T>(contractName: string): MockedObject<T> | undefined {
    return this.mocks.get(contractName);
  }

  /**
   * Reset all mocks
   */
  public resetAll(): void {
    mockFactory.reset();
    this.mocks.clear();
  }

  /**
   * Verify all interaction expectations
   */
  public verifyAll(): void {
    // Implementation depends on specific test framework
    // This would verify all recorded interactions match expectations
  }
}

/**
 * Component Testing Helper
 */
export class ComponentTestHelper<TProps = any> {
  private component: React.ComponentType<TProps>;
  private defaultProps: TProps;
  private setupHelper: TestSetupHelper;

  constructor(
    component: React.ComponentType<TProps>,
    defaultProps: TProps,
    setupHelper: TestSetupHelper
  ) {
    this.component = component;
    this.defaultProps = defaultProps;
    this.setupHelper = setupHelper;
  }

  /**
   * Render component with props and mock providers
   */
  public renderWithMocks(props?: Partial<TProps>): RenderResult {
    const finalProps = { ...this.defaultProps, ...props };
    return render(<this.component {...finalProps} />);
  }

  /**
   * Test component behavior with given-when-then structure
   */
  public testBehavior(
    given: string,
    when: string,
    then: string,
    testFn: (helper: ComponentTestHelper<TProps>) => void
  ): void {
    describe(`Given ${given}`, () => {
      describe(`When ${when}`, () => {
        it(`Then ${then}`, () => testFn(this));
      });
    });
  }
}

// ==================== MOCK BUILDERS ====================

/**
 * Fluent Mock Builder
 */
export class MockBuilder<T> {
  private mock: MockedObject<T>;

  constructor(baseMock: MockedObject<T>) {
    this.mock = baseMock;
  }

  public withMethod(methodName: keyof T, implementation: MockedFunction<any>): MockBuilder<T> {
    (this.mock as any)[methodName] = implementation;
    return this;
  }

  public withAsyncMethod(methodName: keyof T, resolvedValue?: any, rejectedValue?: any): MockBuilder<T> {
    const mockFn = rejectedValue 
      ? vi.fn().mockRejectedValue(rejectedValue)
      : vi.fn().mockResolvedValue(resolvedValue);
    
    (this.mock as any)[methodName] = mockFn;
    return this;
  }

  public withProperty(propertyName: keyof T, value: any): MockBuilder<T> {
    (this.mock as any)[propertyName] = value;
    return this;
  }

  public build(): MockedObject<T> {
    return this.mock;
  }
}

/**
 * Create a fluent mock builder
 */
export const mockBuilder = <T>(baseMock: MockedObject<T>): MockBuilder<T> => 
  new MockBuilder(baseMock);

// Export singleton instance
export const testSetup = new TestSetupHelper();