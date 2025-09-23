/**
 * Type definitions for Enhanced Posting Interface
 * Supports Post, Quick Post, and Avi DM functionality
 */

// Tab configuration and navigation
export type PostingMode = 'post' | 'quick' | 'avi';

export interface TabConfig {
  id: PostingMode;
  icon: string;
  label: string;
  description: string;
  badge?: number;
  disabled?: boolean;
}

export interface PostingTabs {
  post: TabConfig;
  quick: TabConfig;
  avi: TabConfig;
}

// Shared state interface
export interface SharedPostingState {
  activeTab: PostingMode;
  sharedDraft: {
    content: string;
    tags: string[];
    mentions: string[];
    title?: string;
  };
  quickPostHistory: QuickPostHistoryItem[];
  aviConversation: AviMessage[];
  crossSectionData: {
    lastUsedTags: string[];
    frequentMentions: string[];
    recentTopics: string[];
  };
}

// Quick Post types
export interface QuickPostHistoryItem {
  id: string;
  content: string;
  timestamp: Date;
  tags: string[];
  published: boolean;
}

export interface QuickPostConfig {
  placeholder?: string;
  maxLength?: number;
  enableTags?: boolean;
  enableMentions?: boolean;
  autoPublish?: boolean;
  showHistory?: boolean;
}

export interface QuickPostProps {
  config?: QuickPostConfig;
  onPostCreated?: (post: any) => void;
  onDraftSaved?: (draft: QuickPostHistoryItem) => void;
  className?: string;
}

// Avi DM Chat types
export interface AviMessage {
  id: string;
  content: string;
  sender: 'user' | 'avi';
  timestamp: Date;
  type: 'text' | 'post_generation' | 'suggestion' | 'system';
  metadata?: {
    postGenerated?: boolean;
    postId?: string;
    suggestions?: string[];
    context?: Record<string, any>;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
}

export interface AviConversation {
  id: string;
  title?: string;
  messages: AviMessage[];
  context: AviContext;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface AviContext {
  userId: string;
  sessionId: string;
  currentTopic?: string;
  preferences: {
    responseStyle: 'casual' | 'professional' | 'creative';
    verbosity: 'concise' | 'detailed' | 'comprehensive';
    features: string[];
  };
  conversationMemory: {
    recentTopics: string[];
    userInterests: string[];
    writingStyle: string;
  };
}

export interface AviChatProps {
  conversationId?: string;
  initialContext?: Partial<AviContext>;
  onPostGenerated?: (post: any) => void;
  onConversationUpdate?: (conversation: AviConversation) => void;
  className?: string;
}

// WebSocket integration
export interface AviWebSocketMessage {
  type: 'message' | 'typing' | 'context_update' | 'connection_status';
  payload: {
    message?: AviMessage;
    isTyping?: boolean;
    context?: Partial<AviContext>;
    status?: 'connected' | 'disconnected' | 'reconnecting';
  };
  conversationId: string;
  timestamp: Date;
}

// Enhanced PostCreator integration
export interface EnhancedPostCreatorProps {
  mode?: 'create' | 'reply' | 'edit' | 'from_quick' | 'from_avi';
  initialData?: {
    content?: string;
    title?: string;
    tags?: string[];
    mentions?: string[];
    source?: PostingMode;
  };
  onPostCreated?: (post: any) => void;
  onDraftSaved?: (draft: any) => void;
  className?: string;
}

// Main interface props
export interface EnhancedPostingInterfaceProps {
  defaultTab?: PostingMode;
  enabledTabs?: PostingMode[];
  layout?: 'tabs' | 'sidebar' | 'modal';
  mobileLayout?: 'bottom-tabs' | 'drawer' | 'fullscreen';
  onTabChange?: (tab: PostingMode) => void;
  onPostCreated?: (post: any, source: PostingMode) => void;
  className?: string;
}

// State management context
export interface PostingStateContextValue {
  state: SharedPostingState;
  actions: {
    switchTab: (tab: PostingMode) => void;
    updateSharedDraft: (draft: Partial<SharedPostingState['sharedDraft']>) => void;
    addQuickPostToHistory: (item: QuickPostHistoryItem) => void;
    addAviMessage: (message: AviMessage) => void;
    clearConversation: () => void;
    updateCrossSectionData: (data: Partial<SharedPostingState['crossSectionData']>) => void;
  };
}

// API integration types
export interface PostingAPI {
  // Quick Post endpoints
  createQuickPost: (content: string, options?: {
    tags?: string[];
    mentions?: string[];
    autoPublish?: boolean;
  }) => Promise<any>;
  
  getQuickPostHistory: (limit?: number, offset?: number) => Promise<QuickPostHistoryItem[]>;
  
  // Avi Chat endpoints
  sendAviMessage: (content: string, context: AviContext) => Promise<AviMessage>;
  getConversation: (conversationId: string) => Promise<AviConversation>;
  updateConversationContext: (conversationId: string, context: Partial<AviContext>) => Promise<void>;
  
  // Cross-section utilities
  convertQuickToFull: (quickPost: QuickPostHistoryItem) => Promise<any>;
  generatePostFromChat: (messages: AviMessage[], context: AviContext) => Promise<any>;
}

// Mobile responsiveness
export interface MobileAdaptations {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  adaptiveFeatures: {
    mobile: {
      tabStyle: 'bottom' | 'swipe';
      quickPostPosition: 'fab' | 'inline';
      chatMode: 'fullscreen' | 'overlay';
    };
    tablet: {
      layout: 'sidebar' | 'tabs';
      splitView: boolean;
    };
    desktop: {
      multiColumn: boolean;
      sidebarWidth: number;
    };
  };
}

// Performance optimization
export interface PostingInterfacePerformance {
  lazyLoading: {
    enableTabLazyLoad: boolean;
    chatHistoryVirtualization: boolean;
    imageOptimization: boolean;
  };
  caching: {
    draftAutoSaveInterval: number;
    conversationCacheSize: number;
    crossSectionDataTTL: number;
  };
  optimization: {
    debounceInputMs: number;
    throttleScrollMs: number;
    maxHistoryItems: number;
  };
}

// Error handling and validation
export interface PostingError {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, any>;
  recoverable: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: PostingError[];
  warnings: PostingError[];
}

export interface PostingValidators {
  validateQuickPost: (content: string, config: QuickPostConfig) => ValidationResult;
  validateFullPost: (title: string, content: string) => ValidationResult;
  validateAviMessage: (content: string, context: AviContext) => ValidationResult;
}

// Accessibility support
export interface AccessibilityConfig {
  enableScreenReader: boolean;
  keyboardNavigation: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  focusManagement: boolean;
}

// Analytics and monitoring
export interface PostingAnalytics {
  trackTabSwitch: (from: PostingMode, to: PostingMode) => void;
  trackPostCreation: (source: PostingMode, metadata: Record<string, any>) => void;
  trackAviInteraction: (type: string, context: AviContext) => void;
  trackPerformanceMetrics: (metric: string, value: number) => void;
}

// Export all types for easy importing
export type {
  PostingMode,
  TabConfig,
  PostingTabs,
  SharedPostingState,
  QuickPostHistoryItem,
  QuickPostConfig,
  QuickPostProps,
  AviMessage,
  AviConversation,
  AviContext,
  AviChatProps,
  AviWebSocketMessage,
  EnhancedPostCreatorProps,
  EnhancedPostingInterfaceProps,
  PostingStateContextValue,
  PostingAPI,
  MobileAdaptations,
  PostingInterfacePerformance,
  PostingError,
  ValidationResult,
  PostingValidators,
  AccessibilityConfig,
  PostingAnalytics
};