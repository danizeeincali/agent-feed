/**
 * Avi Chat Interface Type Definitions
 * Specialized types for Avi personality integration with Claude Code
 */

import { ClaudeInstance, ChatMessage, ImageAttachment } from './claude-instances';

// Avi-specific personality traits and behaviors
export interface AviPersonalityTraits {
  conversationalStyle: 'technical' | 'analytical' | 'friendly' | 'direct' | 'adaptive';
  expertiseAreas: string[];
  responsePatterns: AviResponsePattern[];
  contextualMemory: boolean;
  learningEnabled: boolean;
  personalityVersion: string;
}

export interface AviResponsePattern {
  id: string;
  trigger: string | RegExp;
  responseType: 'greeting' | 'acknowledgment' | 'analysis' | 'recommendation' | 'clarification';
  template: string;
  contextRequired?: string[];
}

export interface AviContextData {
  projectPath?: string;
  currentBranch?: string;
  recentChanges?: string[];
  codeContext?: AviCodeContext[];
  gitContext?: AviGitContext;
  userPreferences?: AviUserPreferences;
}

export interface AviCodeContext {
  path: string;
  content: string;
  language: string;
  lastModified?: Date;
  relevanceScore?: number;
}

export interface AviGitContext {
  currentBranch: string;
  stagedChanges: string[];
  unstagedChanges: string[];
  recentCommits: AviCommit[];
  remoteStatus?: {
    ahead: number;
    behind: number;
  };
}

export interface AviCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
}

export interface AviUserPreferences {
  communicationStyle: 'verbose' | 'concise' | 'balanced';
  technicalLevel: 'beginner' | 'intermediate' | 'expert';
  preferredLanguages: string[];
  workflowPatterns: string[];
}

// Avi-specific message extensions
export interface AviChatMessage extends ChatMessage {
  aviMetadata?: {
    personalityVersion: string;
    contextUsed?: string[];
    confidenceScore?: number;
    learningFeedback?: boolean;
    suggestedActions?: AviAction[];
  };
  codeReferences?: AviCodeReference[];
  gitOperations?: AviGitOperation[];
}

export interface AviAction {
  id: string;
  type: 'code_review' | 'file_analysis' | 'git_operation' | 'system_command';
  title: string;
  description: string;
  command?: string;
  parameters?: Record<string, any>;
}

export interface AviCodeReference {
  filePath: string;
  lineRange?: [number, number];
  snippet: string;
  purpose: 'example' | 'reference' | 'issue' | 'solution';
}

export interface AviGitOperation {
  type: 'commit' | 'branch' | 'merge' | 'push' | 'pull' | 'diff';
  description: string;
  command: string;
  parameters?: Record<string, string>;
}

// Connection and service interfaces
export interface AviConnectionStatus {
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency?: number;
  reconnectAttempts?: number;
  lastConnected?: Date;
}

export interface AviServiceCapabilities {
  streamingSupported: boolean;
  contextInjection: boolean;
  fileOperations: boolean;
  gitIntegration: boolean;
  projectAnalysis: boolean;
  codeGeneration: boolean;
  realTimeCollaboration: boolean;
}

// Component props
export interface AviChatInterfaceProps {
  instance: ClaudeInstance;
  messages: AviChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  personalityTraits?: AviPersonalityTraits;
  contextData?: AviContextData;
  serviceCapabilities?: AviServiceCapabilities;
  onSendMessage: (message: string, images?: ImageAttachment[], context?: AviContextData) => void;
  onClearMessages?: () => void;
  onContextUpdate?: (context: AviContextData) => void;
  onPersonalityAdjust?: (traits: Partial<AviPersonalityTraits>) => void;
  enableImageUpload?: boolean;
  enableContextInjection?: boolean;
  enablePersonalityLearning?: boolean;
  className?: string;
}

// Service integration interfaces
export interface AviDMServiceInterface {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  createSession(agentId: string, sessionId: string, context?: AviContextData): Promise<string>;
  sendMessage(message: string, context?: AviContextData): Promise<AviServiceResponse>;
  sendMessageStream(
    message: string,
    chunkHandler: (chunk: string) => void,
    context?: AviContextData
  ): Promise<void>;
  updateProjectContext(context: AviContextData): void;
  injectFileContext(files: AviCodeContext[]): void;
  injectGitContext(gitData: AviGitContext): void;
  getConversationHistory(): Promise<AviChatMessage[]>;
  reconnect(): Promise<void>;
  checkConnection(): Promise<AviConnectionStatus>;

  // Event emitter interface
  on(event: string, handler: Function): void;
  off(event: string, handler?: Function): void;
  emit(event: string, data?: any): void;

  // Status and metrics
  status: AviConnectionStatus;
  capabilities: AviServiceCapabilities;
}

export interface AviServiceResponse {
  id: string;
  requestId: string;
  content: string;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
    personalityVersion?: string;
    contextUsed?: string[];
    confidenceScore?: number;
  };
  status: 'success' | 'error' | 'timeout';
  error?: string;
  aviExtensions?: {
    suggestedActions?: AviAction[];
    codeReferences?: AviCodeReference[];
    learningFeedback?: boolean;
  };
}

// Error types
export class AviIntegrationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public serviceDetails?: any
  ) {
    super(message);
    this.name = 'AviIntegrationError';
  }
}

export class AviPersonalityError extends Error {
  constructor(
    message: string,
    public personalityVersion?: string,
    public traitConflict?: string
  ) {
    super(message);
    this.name = 'AviPersonalityError';
  }
}

// Utility types
export type AviEventTypes = {
  'connected': AviConnectionStatus;
  'disconnected': { reason: string };
  'reconnected': AviConnectionStatus;
  'contextUpdated': AviContextData;
  'personalityAdjusted': AviPersonalityTraits;
  'messageReceived': AviChatMessage;
  'typingStart': { sessionId: string };
  'typingStop': { sessionId: string };
  'error': AviIntegrationError;
};

export type AviMessageRole = 'user' | 'assistant' | 'system' | 'avi';

export type AviOperationMode = 'standard' | 'learning' | 'context-aware' | 'collaborative';