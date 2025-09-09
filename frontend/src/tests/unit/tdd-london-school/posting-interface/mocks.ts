/**
 * Mock Objects and Test Doubles for London School TDD
 * Focus on behavior verification and contract testing
 */

import { vi } from 'vitest';
import type {
  PostingMode,
  SharedPostingState,
  QuickPostHistoryItem,
  AviMessage,
  AviContext,
  PostingStateContextValue,
  TabConfig
} from '../../../src/types/posting-interface';

// === API Service Mocks ===
export const createMockApiService = () => ({
  createAgentPost: vi.fn().mockResolvedValue({ 
    success: true, 
    data: { id: 'post-123', title: 'Test Post', content: 'Test content' }
  }),
  getAgentPosts: vi.fn().mockResolvedValue({
    success: true,
    data: [],
    total: 0
  }),
  savePost: vi.fn().mockResolvedValue({ success: true }),
  isPostSaved: vi.fn().mockResolvedValue(false),
  clearCache: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
});

// === PostCreator Mock ===
export const createMockPostCreator = () => ({
  // Mock PostCreator props
  className: '',
  onPostCreated: vi.fn(),
  replyToPostId: undefined,
  initialContent: '',
  mode: 'create' as const,
  editDraft: null
});

// === State Context Mocks ===
export const createMockSharedPostingState = (overrides: Partial<SharedPostingState> = {}): SharedPostingState => ({
  activeTab: 'post',
  sharedDraft: {
    content: '',
    tags: [],
    mentions: [],
    title: ''
  },
  quickPostHistory: [],
  aviConversation: [],
  crossSectionData: {
    lastUsedTags: [],
    frequentMentions: [],
    recentTopics: []
  },
  ...overrides
});

export const createMockPostingStateContext = (stateOverrides: Partial<SharedPostingState> = {}): PostingStateContextValue => {
  const mockState = createMockSharedPostingState(stateOverrides);
  
  return {
    state: mockState,
    actions: {
      switchTab: vi.fn(),
      updateSharedDraft: vi.fn(),
      addQuickPostToHistory: vi.fn(),
      addAviMessage: vi.fn(),
      clearConversation: vi.fn(),
      updateCrossSectionData: vi.fn()
    }
  };
};

// === Tab Configuration Mocks ===
export const createMockTabConfigs = (): TabConfig[] => [
  {
    id: 'post',
    icon: 'edit-3',
    label: 'Post',
    description: 'Create a full post with rich formatting'
  },
  {
    id: 'quick',
    icon: 'zap',
    label: 'Quick',
    description: 'Share a quick thought or update'
  },
  {
    id: 'avi',
    icon: 'message-circle',
    label: 'Avi DM',
    description: 'Chat with AI assistant for post ideas'
  }
];

// === Quick Post Mocks ===
export const createMockQuickPostHistoryItem = (overrides: Partial<QuickPostHistoryItem> = {}): QuickPostHistoryItem => ({
  id: `quick-${Date.now()}`,
  content: 'Sample quick post content',
  timestamp: new Date(),
  tags: ['test'],
  published: false,
  ...overrides
});

// === Avi Chat Mocks ===
export const createMockAviMessage = (overrides: Partial<AviMessage> = {}): AviMessage => ({
  id: `msg-${Date.now()}`,
  content: 'Sample message content',
  sender: 'user',
  timestamp: new Date(),
  type: 'text',
  status: 'sent',
  ...overrides
});

export const createMockAviContext = (overrides: Partial<AviContext> = {}): AviContext => ({
  userId: 'test-user',
  sessionId: `session-${Date.now()}`,
  currentTopic: 'general',
  preferences: {
    responseStyle: 'professional',
    verbosity: 'detailed',
    features: ['post_generation', 'suggestions']
  },
  conversationMemory: {
    recentTopics: ['testing', 'development'],
    userInterests: ['technology', 'productivity'],
    writingStyle: 'professional'
  },
  ...overrides
});

// === Mobile/Responsive Mocks ===
export const createMockMediaQuery = (matches: boolean = false) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
});

// === Component Props Mocks ===
export const createMockEnhancedPostingInterfaceProps = () => ({
  defaultTab: 'post' as PostingMode,
  enabledTabs: ['post', 'quick', 'avi'] as PostingMode[],
  layout: 'tabs' as const,
  mobileLayout: 'bottom-tabs' as const,
  onTabChange: vi.fn(),
  onPostCreated: vi.fn(),
  className: 'test-class'
});

export const createMockPostingTabsProps = () => ({
  tabs: createMockTabConfigs(),
  activeTab: 'post' as PostingMode,
  onTabChange: vi.fn(),
  layout: 'tabs' as const,
  isMobile: false,
  isTablet: false,
  className: 'test-tabs',
  showLabels: true,
  compact: false
});

export const createMockQuickPostProps = () => ({
  config: {
    placeholder: 'What\'s on your mind?',
    maxLength: 280,
    enableTags: true,
    enableMentions: true,
    autoPublish: false,
    showHistory: true
  },
  onPostCreated: vi.fn(),
  onDraftSaved: vi.fn(),
  className: 'test-quick-post'
});

// === WebSocket Mocks ===
export const createMockWebSocket = () => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN
});

// === Draft Service Mocks ===
export const createMockDraftService = () => ({
  createDraft: vi.fn().mockResolvedValue('draft-123'),
  updateDraft: vi.fn().mockResolvedValue(true),
  deleteDraft: vi.fn().mockResolvedValue(true),
  getDrafts: vi.fn().mockResolvedValue([]),
  getDraft: vi.fn().mockResolvedValue(null)
});

// === Template Service Mocks ===
export const createMockTemplateService = () => ({
  getTemplates: vi.fn().mockResolvedValue([]),
  getTemplate: vi.fn().mockResolvedValue(null),
  saveTemplate: vi.fn().mockResolvedValue('template-123'),
  deleteTemplate: vi.fn().mockResolvedValue(true)
});

// === Utility Functions for Testing ===
export const createMockRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
  width: 100,
  height: 40,
  top: 0,
  left: 0,
  bottom: 40,
  right: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
  ...overrides
});

// Mock getBoundingClientRect for tab indicator tests
export const mockGetBoundingClientRect = (element: HTMLElement, rect: Partial<DOMRect>) => {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createMockRect(rect));
};

// === Test Data Builders ===
export const PostingTestDataBuilder = {
  state: createMockSharedPostingState,
  context: createMockPostingStateContext,
  tabConfig: createMockTabConfigs,
  quickPost: createMockQuickPostHistoryItem,
  aviMessage: createMockAviMessage,
  aviContext: createMockAviContext,
  apiService: createMockApiService,
  draftService: createMockDraftService,
  templateService: createMockTemplateService
};

// === Assertion Helpers ===
export const assertTabBehaviorContract = {
  expectTabSwitch: (mockFn: any, from: PostingMode, to: PostingMode) => {
    expect(mockFn).toHaveBeenCalledWith(to);
  },
  
  expectStateUpdate: (mockFn: any, expectedState: Partial<SharedPostingState>) => {
    expect(mockFn).toHaveBeenCalledWith(expect.objectContaining(expectedState));
  },
  
  expectApiCall: (mockFn: any, endpoint: string, data?: any) => {
    if (data) {
      expect(mockFn).toHaveBeenCalledWith(expect.objectContaining(data));
    } else {
      expect(mockFn).toHaveBeenCalled();
    }
  },
  
  expectNoSideEffects: (...mockFns: any[]) => {
    mockFns.forEach(fn => expect(fn).not.toHaveBeenCalled());
  }
};