/**
 * TDD London School Mock Factory
 * Following London School (mockist) approach - focused on behavior verification and object collaboration
 */

import { jest } from '@jest/globals';

// Core interfaces for mock contracts
export interface MockMentionService {
  searchMentions: jest.MockedFunction<any>;
  getQuickMentions: jest.MockedFunction<any>;
  getAllAgents: jest.MockedFunction<any>;
  extractMentions: jest.MockedFunction<any>;
  validateMention: jest.MockedFunction<any>;
}

export interface MockApiService {
  createPost: jest.MockedFunction<any>;
  createComment: jest.MockedFunction<any>;
  updatePost: jest.MockedFunction<any>;
  updateComment: jest.MockedFunction<any>;
  deletePost: jest.MockedFunction<any>;
  deleteComment: jest.MockedFunction<any>;
  getPosts: jest.MockedFunction<any>;
  getComments: jest.MockedFunction<any>;
}

export interface MockWebSocketService {
  connect: jest.MockedFunction<any>;
  disconnect: jest.MockedFunction<any>;
  subscribe: jest.MockedFunction<any>;
  send: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  off: jest.MockedFunction<any>;
}

export interface MockDraftService {
  createDraft: jest.MockedFunction<any>;
  updateDraft: jest.MockedFunction<any>;
  deleteDraft: jest.MockedFunction<any>;
  getDrafts: jest.MockedFunction<any>;
  loadDraft: jest.MockedFunction<any>;
}

// Mock data templates
export const MOCK_AGENTS = [
  {
    id: 'chief-of-staff',
    name: 'chief-of-staff-agent',
    displayName: 'Chief of Staff',
    description: 'Strategic coordination and planning',
    type: 'coordinator'
  },
  {
    id: 'personal-todos',
    name: 'personal-todos-agent',
    displayName: 'Personal Todos',
    description: 'Task and project management',
    type: 'planner'
  },
  {
    id: 'code-reviewer',
    name: 'code-reviewer-agent',
    displayName: 'Code Reviewer',
    description: 'Code quality and security analysis',
    type: 'reviewer'
  }
];

export const MOCK_POSTS = [
  {
    id: 'post-1',
    title: 'Test Post 1',
    content: 'This is a test post with @chief-of-staff-agent mention',
    author_agent: 'user-agent',
    created_at: '2025-09-09T05:00:00Z',
    metadata: {
      tags: ['test', 'mention'],
      agentMentions: ['chief-of-staff-agent']
    }
  }
];

export const MOCK_COMMENTS = [
  {
    id: 'comment-1',
    content: 'Great analysis! @code-reviewer-agent what do you think?',
    author: 'test-user',
    createdAt: '2025-09-09T05:01:00Z',
    postId: 'post-1',
    parentId: null,
    repliesCount: 0,
    threadDepth: 0,
    threadPath: 'comment-1',
    mentionedUsers: ['code-reviewer-agent']
  }
];

// London School Mock Factory - Behavior-focused mocks
export class TDDLondonSchoolMockFactory {
  
  /**
   * Create MentionService mock with behavior verification focus
   */
  static createMentionServiceMock(): MockMentionService {
    return {
      searchMentions: jest.fn()
        .mockImplementation(async (query: string = '') => {
          // Behavior: searchMentions should always return array based on query
          if (query === '') {
            return MOCK_AGENTS;
          }
          return MOCK_AGENTS.filter(agent => 
            agent.name.toLowerCase().includes(query.toLowerCase()) ||
            agent.displayName.toLowerCase().includes(query.toLowerCase())
          );
        }),
      
      getQuickMentions: jest.fn()
        .mockImplementation((context: string = 'post') => {
          // Behavior: getQuickMentions should filter by context
          return MOCK_AGENTS.slice(0, 5);
        }),
      
      getAllAgents: jest.fn()
        .mockImplementation(() => {
          // Behavior: getAllAgents should return all available agents
          return [...MOCK_AGENTS];
        }),
      
      extractMentions: jest.fn()
        .mockImplementation((content: string) => {
          // Behavior: extractMentions should find @mentions in text
          const mentions = content.match(/@([a-zA-Z0-9-_]+)/g);
          return mentions ? mentions.map(m => m.slice(1)) : [];
        }),
      
      validateMention: jest.fn()
        .mockImplementation((name: string) => {
          // Behavior: validateMention should check if agent exists
          return MOCK_AGENTS.some(agent => agent.name === name);
        })
    };
  }

  /**
   * Create ApiService mock with request/response behavior verification
   */
  static createApiServiceMock(): MockApiService {
    return {
      createPost: jest.fn()
        .mockImplementation(async (postData: any) => {
          // Behavior: createPost should validate and return created post
          if (!postData.title || !postData.content) {
            throw new Error('Title and content are required');
          }
          
          const newPost = {
            id: `post-${Date.now()}`,
            ...postData,
            created_at: new Date().toISOString()
          };
          
          return { data: newPost, success: true };
        }),
      
      createComment: jest.fn()
        .mockImplementation(async (postId: string, content: string, options: any = {}) => {
          // Behavior: createComment should validate and create comment
          if (!content.trim()) {
            throw new Error('Comment content is required');
          }
          
          const newComment = {
            id: `comment-${Date.now()}`,
            content: content.trim(),
            postId,
            author: options.author || 'test-user',
            parentId: options.parentId || null,
            createdAt: new Date().toISOString(),
            mentionedUsers: options.mentionedUsers || [],
            repliesCount: 0,
            threadDepth: options.parentId ? 1 : 0,
            threadPath: `comment-${Date.now()}`
          };
          
          return { data: newComment, success: true };
        }),
      
      updatePost: jest.fn()
        .mockImplementation(async (postId: string, updates: any) => {
          // Behavior: updatePost should apply updates and return updated post
          const updatedPost = {
            id: postId,
            ...updates,
            updated_at: new Date().toISOString()
          };
          return { data: updatedPost, success: true };
        }),
      
      updateComment: jest.fn()
        .mockImplementation(async (commentId: string, updates: any) => {
          // Behavior: updateComment should apply updates
          const updatedComment = {
            id: commentId,
            ...updates,
            updatedAt: new Date().toISOString(),
            isEdited: true
          };
          return { data: updatedComment, success: true };
        }),
      
      deletePost: jest.fn()
        .mockImplementation(async (postId: string) => {
          // Behavior: deletePost should confirm deletion
          return { success: true, message: `Post ${postId} deleted` };
        }),
      
      deleteComment: jest.fn()
        .mockImplementation(async (commentId: string) => {
          // Behavior: deleteComment should confirm deletion
          return { success: true, message: `Comment ${commentId} deleted` };
        }),
      
      getPosts: jest.fn()
        .mockImplementation(async (filters: any = {}) => {
          // Behavior: getPosts should return filtered posts
          return { data: MOCK_POSTS, success: true };
        }),
      
      getComments: jest.fn()
        .mockImplementation(async (postId: string) => {
          // Behavior: getComments should return comments for post
          return { 
            data: MOCK_COMMENTS.filter(c => c.postId === postId), 
            success: true 
          };
        })
    };
  }

  /**
   * Create WebSocket mock with event-driven behavior verification
   */
  static createWebSocketServiceMock(): MockWebSocketService {
    const eventListeners = new Map<string, Function[]>();
    
    return {
      connect: jest.fn()
        .mockImplementation(async (url: string) => {
          // Behavior: connect should establish connection
          return { connected: true, url };
        }),
      
      disconnect: jest.fn()
        .mockImplementation(() => {
          // Behavior: disconnect should clean up connection
          eventListeners.clear();
          return { connected: false };
        }),
      
      subscribe: jest.fn()
        .mockImplementation((channel: string) => {
          // Behavior: subscribe should register for channel updates
          return { subscribed: true, channel };
        }),
      
      send: jest.fn()
        .mockImplementation((message: any) => {
          // Behavior: send should transmit message
          return { sent: true, message };
        }),
      
      on: jest.fn()
        .mockImplementation((event: string, callback: Function) => {
          // Behavior: on should register event listener
          if (!eventListeners.has(event)) {
            eventListeners.set(event, []);
          }
          eventListeners.get(event)!.push(callback);
        }),
      
      off: jest.fn()
        .mockImplementation((event: string, callback?: Function) => {
          // Behavior: off should remove event listener(s)
          if (callback) {
            const listeners = eventListeners.get(event) || [];
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          } else {
            eventListeners.delete(event);
          }
        })
    };
  }

  /**
   * Create DraftService mock with persistence behavior verification
   */
  static createDraftServiceMock(): MockDraftService {
    return {
      createDraft: jest.fn()
        .mockImplementation(async (title: string, content: string, tags: string[] = []) => {
          // Behavior: createDraft should create and return draft
          const draft = {
            id: `draft-${Date.now()}`,
            title,
            content,
            tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          return { data: draft, success: true };
        }),
      
      updateDraft: jest.fn()
        .mockImplementation(async (draftId: string, updates: any) => {
          // Behavior: updateDraft should apply updates
          const updatedDraft = {
            id: draftId,
            ...updates,
            updated_at: new Date().toISOString()
          };
          return { data: updatedDraft, success: true };
        }),
      
      deleteDraft: jest.fn()
        .mockImplementation(async (draftId: string) => {
          // Behavior: deleteDraft should confirm deletion
          return { success: true, message: `Draft ${draftId} deleted` };
        }),
      
      getDrafts: jest.fn()
        .mockImplementation(async () => {
          // Behavior: getDrafts should return all user drafts
          return { data: [], success: true };
        }),
      
      loadDraft: jest.fn()
        .mockImplementation(async (draftId: string) => {
          // Behavior: loadDraft should return specific draft
          const draft = {
            id: draftId,
            title: 'Test Draft',
            content: 'Draft content',
            tags: ['test'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          return { data: draft, success: true };
        })
    };
  }

  /**
   * Create DOM event mocks for user interaction testing
   */
  static createDOMEventMocks() {
    return {
      createChangeEvent: (value: string, selectionStart?: number) => ({
        target: {
          value,
          selectionStart: selectionStart ?? value.length,
          selectionEnd: selectionStart ?? value.length
        },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }),
      
      createKeyboardEvent: (key: string, options: any = {}) => ({
        key,
        shiftKey: options.shiftKey || false,
        ctrlKey: options.ctrlKey || false,
        metaKey: options.metaKey || false,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      }),
      
      createMouseEvent: (type: string = 'click') => ({
        type,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: document.createElement('div')
      })
    };
  }

  /**
   * Create component property mocks for React component testing
   */
  static createComponentPropMocks() {
    return {
      onPostCreated: jest.fn(),
      onCommentAdded: jest.fn(),
      onMentionSelect: jest.fn(),
      onChange: jest.fn(),
      onSubmit: jest.fn(),
      onCancel: jest.fn(),
      onEdit: jest.fn(),
      onDelete: jest.fn(),
      onReply: jest.fn(),
      onToggleExpand: jest.fn(),
      onHighlight: jest.fn(),
      onNavigate: jest.fn(),
      onReport: jest.fn(),
      onPin: jest.fn()
    };
  }

  /**
   * Reset all mocks - critical for test isolation
   */
  static resetAllMocks(mocks: Record<string, any>) {
    Object.values(mocks).forEach(mock => {
      if (mock && typeof mock.mockReset === 'function') {
        mock.mockReset();
      } else if (mock && typeof mock === 'object') {
        Object.values(mock).forEach(nestedMock => {
          if (nestedMock && typeof nestedMock.mockReset === 'function') {
            nestedMock.mockReset();
          }
        });
      }
    });
  }

  /**
   * Verify interaction sequence - London School focus on behavior verification
   */
  static verifyInteractionSequence(mocks: any[], expectedSequence: string[]) {
    const actualCalls = mocks.flatMap(mock => 
      mock.mock ? mock.mock.calls.map((call: any, index: number) => `${mock.name || 'unknown'}-${index}`) : []
    );
    
    expect(actualCalls).toEqual(expectedSequence);
  }

  /**
   * Verify collaboration pattern - ensure objects collaborate correctly
   */
  static verifyCollaborationPattern(
    collaborators: Record<string, jest.MockedFunction<any>>,
    expectedPattern: Array<{ method: string; args?: any[]; times?: number }>
  ) {
    expectedPattern.forEach(({ method, args, times = 1 }) => {
      const [service, methodName] = method.split('.');
      const mockMethod = collaborators[service]?.[methodName] || collaborators[method];
      
      expect(mockMethod).toHaveBeenCalledTimes(times);
      
      if (args) {
        expect(mockMethod).toHaveBeenCalledWith(...args);
      }
    });
  }
}

// Export specific mock contracts for component testing
export const MentionServiceContract = {
  searchMentions: expect.any(Function),
  getQuickMentions: expect.any(Function),
  getAllAgents: expect.any(Function),
  extractMentions: expect.any(Function),
  validateMention: expect.any(Function)
};

export const ApiServiceContract = {
  createPost: expect.any(Function),
  createComment: expect.any(Function),
  updatePost: expect.any(Function),
  updateComment: expect.any(Function),
  deletePost: expect.any(Function),
  deleteComment: expect.any(Function),
  getPosts: expect.any(Function),
  getComments: expect.any(Function)
};

export default TDDLondonSchoolMockFactory;