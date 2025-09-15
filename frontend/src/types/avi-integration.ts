/**
 * Avi DM Integration Type Definitions
 * Specialized types for Avi Direct Message Claude instance integration
 */

import {
  ClaudeInstance,
  ClaudeInstanceConfig,
  ClaudeInstanceStatus,
  ChatMessage,
  ImageAttachment,
  InstanceMetrics
} from './claude-instances';

// Avi-specific instance configuration
export interface AviInstanceConfig extends ClaudeInstanceConfig {
  aviUserId: string;
  aviSessionId: string;
  dmChannelId: string;
  conversationContext?: AviConversationContext;
  personalityMode?: AviPersonalityMode;
  responseLatency?: 'immediate' | 'natural' | 'thoughtful';
  privacyLevel?: 'standard' | 'enhanced' | 'maximum';
  contextRetention?: 'session' | 'persistent' | 'ephemeral';
}

// Avi personality modes for different interaction styles
export type AviPersonalityMode =
  | 'professional'
  | 'casual'
  | 'supportive'
  | 'analytical'
  | 'creative'
  | 'adaptive';

// Conversation context for Avi interactions
export interface AviConversationContext {
  userPreferences: AviUserPreferences;
  conversationHistory: AviConversationSummary[];
  currentTopic?: string;
  emotionalTone?: AviEmotionalTone;
  expertiseLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  communicationStyle?: 'concise' | 'detailed' | 'interactive';
}

export interface AviUserPreferences {
  preferredLanguage: string;
  timezone: string;
  responseFormat: 'text' | 'markdown' | 'structured';
  codeHighlighting: boolean;
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  technicalDetail: 'high' | 'medium' | 'low';
  notificationSettings: AviNotificationSettings;
}

export interface AviNotificationSettings {
  soundEnabled: boolean;
  visualIndicators: boolean;
  desktopNotifications: boolean;
  mobilePush: boolean;
  quietHours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export type AviEmotionalTone =
  | 'neutral'
  | 'encouraging'
  | 'empathetic'
  | 'confident'
  | 'curious'
  | 'patient';

export interface AviConversationSummary {
  timestamp: Date;
  topic: string;
  keyPoints: string[];
  resolutionStatus: 'resolved' | 'ongoing' | 'followup_needed';
  satisfactionScore?: number; // 1-5 scale
}

// Avi-specific instance interface
export interface AviInstance extends ClaudeInstance {
  aviConfig: AviInstanceConfig;
  dmConnection: AviDMConnection;
  conversationMetrics: AviConversationMetrics;
  securityContext: AviSecurityContext;
}

// DM Connection management
export interface AviDMConnection {
  channelId: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number; // milliseconds
  encryption: AviEncryptionInfo;
  sessionValidUntil: Date;
  lastHeartbeat: Date;
  reconnectCount: number;
}

export interface AviEncryptionInfo {
  method: 'E2EE' | 'TLS' | 'standard';
  keyRotationEnabled: boolean;
  lastKeyRotation?: Date;
  encryptionStrength: 'standard' | 'enhanced' | 'maximum';
}

// Conversation-specific metrics
export interface AviConversationMetrics {
  messageCount: number;
  averageResponseTime: number;
  conversationDuration: number;
  topicSwitches: number;
  clarificationRequests: number;
  userSatisfactionScore?: number;
  engagementLevel: 'low' | 'medium' | 'high';
  complexityScore: number; // 1-10 scale
}

// Security context for Avi interactions
export interface AviSecurityContext {
  userId: string;
  sessionToken: string;
  permissionLevel: 'read' | 'write' | 'admin';
  dataRetentionPolicy: 'none' | 'session' | '7days' | '30days' | 'indefinite';
  auditLogging: boolean;
  contentFiltering: AviContentFilterConfig;
}

export interface AviContentFilterConfig {
  enabled: boolean;
  level: 'basic' | 'standard' | 'strict';
  customRules: string[];
  blockedKeywords: string[];
  allowedDomains?: string[];
}

// Avi-specific message types
export interface AviMessage extends ChatMessage {
  aviMetadata: AviMessageMetadata;
  deliveryStatus: AviDeliveryStatus;
  contextualInfo?: AviContextualInfo;
}

export interface AviMessageMetadata {
  messageType: 'dm' | 'system' | 'notification' | 'error' | 'status';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  threading: {
    isThreaded: boolean;
    threadId?: string;
    parentMessageId?: string;
  };
  formatting: {
    hasCodeBlocks: boolean;
    hasLinks: boolean;
    hasImages: boolean;
    wordCount: number;
  };
  personalityContext: {
    mode: AviPersonalityMode;
    tone: AviEmotionalTone;
    adaptationScore: number; // How well adapted to user
  };
}

export interface AviDeliveryStatus {
  sent: boolean;
  delivered: boolean;
  read: boolean;
  acknowledged: boolean;
  timestamp: Date;
  retryCount: number;
  errorCode?: string;
}

export interface AviContextualInfo {
  relatedTopics: string[];
  suggestedActions: string[];
  confidenceLevel: number; // 0-1 scale
  requiresFollowup: boolean;
  expertiseRequired?: string[];
}

// Avi instance manager interface
export interface UseAviInstanceOptions {
  autoConnect?: boolean;
  personalityMode?: AviPersonalityMode;
  contextRetention?: 'session' | 'persistent' | 'ephemeral';
  maxRetries?: number;
  retryInterval?: number;
  healthCheckInterval?: number;
  enableAnalytics?: boolean;
  privacyMode?: boolean;
}

export interface UseAviInstanceReturn {
  instance: AviInstance | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';

  // Instance management
  createInstance: (config: AviInstanceConfig) => Promise<AviInstance>;
  destroyInstance: () => Promise<void>;
  reconnect: () => Promise<void>;

  // Communication
  sendMessage: (message: string, options?: AviMessageOptions) => Promise<AviMessage>;
  sendImage: (image: ImageAttachment, caption?: string) => Promise<AviMessage>;

  // Conversation management
  setPersonalityMode: (mode: AviPersonalityMode) => void;
  updateUserPreferences: (preferences: Partial<AviUserPreferences>) => void;
  startNewTopic: (topic: string) => void;
  endConversation: () => Promise<void>;

  // Analytics and monitoring
  getConversationMetrics: () => AviConversationMetrics;
  exportConversationHistory: () => AviConversationExport;
  clearHistory: () => Promise<void>;

  // Health and diagnostics
  getHealthStatus: () => AviHealthStatus;
  runDiagnostics: () => Promise<AviDiagnosticReport>;

  // Event handlers
  onMessage: (handler: (message: AviMessage) => void) => void;
  onStatusChange: (handler: (status: AviInstanceStatus) => void) => void;
  onError: (handler: (error: AviError) => void) => void;
}

export interface AviMessageOptions {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  personalityMode?: AviPersonalityMode;
  responseStyle?: 'concise' | 'detailed' | 'interactive';
  includeContext?: boolean;
  requestFollowup?: boolean;
  timeout?: number;
}

export interface AviInstanceStatus extends ClaudeInstanceStatus {
  dmConnectionHealth: 'healthy' | 'degraded' | 'critical';
  conversationState: 'idle' | 'active' | 'thinking' | 'typing';
  securityStatus: 'secure' | 'warning' | 'compromised';
  lastUserInteraction: Date;
  adaptationLevel: number; // 0-1 scale
}

export interface AviHealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    connection: 'healthy' | 'degraded' | 'down';
    authentication: 'valid' | 'expiring' | 'invalid';
    encryption: 'secure' | 'weak' | 'compromised';
    performance: 'optimal' | 'slow' | 'degraded';
  };
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
  };
  recommendations: string[];
}

export interface AviDiagnosticReport {
  timestamp: Date;
  connectionTests: {
    latency: number;
    stability: 'stable' | 'unstable';
    throughput: number;
  };
  securityChecks: {
    encryptionValid: boolean;
    tokenValid: boolean;
    permissionsValid: boolean;
  };
  performanceMetrics: {
    averageResponseTime: number;
    messageProcessingRate: number;
    memoryEfficiency: number;
  };
  recommendations: {
    critical: string[];
    warnings: string[];
    optimizations: string[];
  };
}

export interface AviConversationExport {
  metadata: {
    userId: string;
    sessionId: string;
    exportDate: Date;
    messageCount: number;
    duration: number;
  };
  messages: AviMessage[];
  analytics: AviConversationMetrics;
  userPreferences: AviUserPreferences;
}

// Error types
export class AviError extends Error {
  constructor(
    message: string,
    public code: AviErrorCode,
    public instanceId?: string,
    public recoverable: boolean = true,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AviError';
  }
}

export type AviErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTHENTICATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'MESSAGE_TOO_LARGE'
  | 'UNSUPPORTED_CONTENT'
  | 'ENCRYPTION_FAILED'
  | 'SESSION_EXPIRED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'CONTEXT_LOST'
  | 'PERSONALITY_CONFLICT';

// Component props for Avi-specific UI
export interface AviChatInterfaceProps {
  instance: AviInstance;
  messages: AviMessage[];
  onSendMessage: (message: string, options?: AviMessageOptions) => void;
  personalityMode: AviPersonalityMode;
  onPersonalityChange: (mode: AviPersonalityMode) => void;
  showTypingIndicator?: boolean;
  enableVoiceInput?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export interface AviPersonalityControlProps {
  currentMode: AviPersonalityMode;
  availableModes: AviPersonalityMode[];
  onModeChange: (mode: AviPersonalityMode) => void;
  disabled?: boolean;
}

export interface AviHealthMonitorProps {
  instance: AviInstance;
  showDetails?: boolean;
  refreshInterval?: number;
  onHealthChange?: (status: AviHealthStatus) => void;
}

export interface AviConversationStatsProps {
  metrics: AviConversationMetrics;
  showTrends?: boolean;
  timeframe?: 'session' | '24h' | '7d' | '30d';
}