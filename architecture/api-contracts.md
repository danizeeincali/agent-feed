# @ Mention System - API Contracts and Interfaces

## Core API Interface Definitions

### MentionAPI Base Interface
```typescript
/**
 * Core API interface for @ mention system
 * Provides unified access to search, agent, user, and channel operations
 */
interface MentionAPI {
  // Search Operations
  searchAll(query: string, options: UnifiedSearchOptions): Promise<MentionSuggestion[]>;
  searchAgents(query: string, options: AgentSearchOptions): Promise<AgentSuggestion[]>;
  searchUsers(query: string, options: UserSearchOptions): Promise<UserSuggestion[]>;
  searchChannels(query: string, options: ChannelSearchOptions): Promise<ChannelSuggestion[]>;
  
  // Entity Operations
  getAgentDetails(agentId: string): Promise<AgentDetails>;
  getUserDetails(userId: string): Promise<UserDetails>;
  getChannelDetails(channelId: string): Promise<ChannelDetails>;
  
  // Status Operations
  getAgentStatus(agentId: string): Promise<AgentStatus>;
  batchGetAgentStatus(agentIds: string[]): Promise<Map<string, AgentStatus>>;
  
  // Capability Operations
  getAgentCapabilities(agentId: string): Promise<AgentCapabilities>;
  searchByCapabilities(capabilities: string[], options: CapabilitySearchOptions): Promise<AgentSuggestion[]>;
  
  // Real-time Subscriptions
  subscribeToAgentUpdates(callback: (update: AgentUpdate) => void): Subscription;
  subscribeToUserUpdates(callback: (update: UserUpdate) => void): Subscription;
  subscribeToStatusUpdates(agentIds: string[], callback: (updates: StatusUpdate[]) => void): Subscription;
  
  // Permission Operations
  getUserPermissions(userId: string): Promise<UserPermissions>;
  checkMentionPermission(mentionerId: string, targetId: string, type: MentionType): Promise<boolean>;
}
```

## Search API Contracts

### Unified Search Options
```typescript
interface UnifiedSearchOptions {
  // Query parameters
  query: string;
  maxResults?: number;
  offset?: number;
  
  // Type filtering
  allowedTypes?: MentionType[];
  typePreference?: MentionType[]; // Preferred types for ranking
  
  // Status filtering
  statusFilter?: AgentStatus[];
  includeOffline?: boolean;
  
  // Capability filtering
  requiredCapabilities?: string[];
  preferredCapabilities?: string[];
  
  // Sorting and ranking
  sortBy?: SortByType;
  sortOrder?: 'asc' | 'desc';
  rankingStrategy?: 'relevance' | 'popularity' | 'recency' | 'availability';
  
  // Context information
  context?: SearchContext;
  userPreferences?: UserSearchPreferences;
  
  // Performance options
  timeout?: number;
  includeCache?: boolean;
  cacheStrategy?: 'prefer-cache' | 'prefer-fresh' | 'cache-only';
}

interface SearchContext {
  conversationId?: string;
  channelId?: string;
  messageText?: string;
  mentionPosition?: number;
  urgency?: 'low' | 'medium' | 'high';
  taskType?: 'question' | 'request' | 'collaboration';
}

type SortByType = 
  | 'relevance' 
  | 'name' 
  | 'status' 
  | 'lastActive' 
  | 'popularity' 
  | 'capabilities'
  | 'availability';

type MentionType = 'agent' | 'user' | 'channel' | 'group';
```

### Search Response Format
```typescript
interface MentionSearchResponse {
  suggestions: MentionSuggestion[];
  totalCount: number;
  hasMore: boolean;
  searchMetadata: SearchMetadata;
  filters?: AppliedFilters;
}

interface MentionSuggestion {
  // Core identification
  id: string;
  type: MentionType;
  name: string;
  displayName: string;
  
  // Display information
  avatar?: string;
  description: string;
  subtitle?: string;
  
  // Status and availability
  status: AgentStatus;
  lastActive?: Date;
  availability?: AvailabilityInfo;
  
  // Search relevance
  relevanceScore: number;
  matchedFields: string[];
  highlightedText?: HighlightedText[];
  
  // Additional metadata
  tags: string[];
  capabilities?: string[];
  permissions?: Permission[];
  metadata?: Record<string, any>;
  
  // Contextual information
  recentInteractions?: number;
  isFrequentlyMentioned?: boolean;
  relationshipType?: 'colleague' | 'team-member' | 'external' | 'system';
}

interface SearchMetadata {
  searchId: string;
  duration: number;
  strategies: SearchStrategyResult[];
  cached: boolean;
  timestamp: Date;
}

interface SearchStrategyResult {
  name: string;
  duration: number;
  resultCount: number;
  weight: number;
}
```

## Agent-Specific API Contracts

### Agent Search Options
```typescript
interface AgentSearchOptions extends BaseSearchOptions {
  // Agent-specific filters
  agentTypes?: AgentType[];
  capabilityFilters?: CapabilityFilter[];
  teamFilters?: string[];
  projectFilters?: string[];
  
  // Availability filters
  availabilityWindow?: TimeWindow;
  workloadThreshold?: number;
  responseTimeThreshold?: number;
  
  // Performance filters
  minRating?: number;
  minCompletionRate?: number;
  maxErrorRate?: number;
  
  // Specialization filters
  domains?: string[];
  skills?: string[];
  experienceLevel?: ExperienceLevel;
}

interface CapabilityFilter {
  capability: string;
  required: boolean;
  proficiencyLevel?: ProficiencyLevel;
}

type AgentType = 
  | 'development' 
  | 'design' 
  | 'testing' 
  | 'devops' 
  | 'analytics' 
  | 'support'
  | 'research'
  | 'coordination';

type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'expert';
type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';
```

### Agent Details Response
```typescript
interface AgentDetails {
  // Basic information
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatar?: string;
  
  // Type and classification
  type: AgentType;
  category: string;
  version: string;
  
  // Status and availability
  status: AgentStatus;
  availability: AvailabilityInfo;
  currentWorkload: WorkloadInfo;
  
  // Capabilities and skills
  capabilities: AgentCapability[];
  skills: Skill[];
  specializations: string[];
  supportedLanguages: string[];
  
  // Performance metrics
  metrics: AgentMetrics;
  rating: number;
  completionRate: number;
  averageResponseTime: number;
  
  // Team and organization
  team?: string;
  department?: string;
  projects: string[];
  
  // Configuration
  settings: AgentSettings;
  integrations: Integration[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  tags: string[];
}

interface AgentCapability {
  name: string;
  description: string;
  proficiencyLevel: ProficiencyLevel;
  verified: boolean;
  examples?: string[];
}

interface AgentMetrics {
  totalTasks: number;
  completedTasks: number;
  averageRating: number;
  successRate: number;
  averageCompletionTime: number;
  errorRate: number;
  uptimePercentage: number;
}

interface AvailabilityInfo {
  isOnline: boolean;
  isAvailable: boolean;
  estimatedResponseTime?: number;
  workingHours?: TimeWindow[];
  timezone: string;
  currentCapacity: number;
  maxCapacity: number;
}
```

## Real-time API Contracts

### WebSocket Message Format
```typescript
interface WebSocketMessage {
  type: MessageType;
  timestamp: Date;
  data: any;
  metadata?: MessageMetadata;
}

type MessageType = 
  | 'agent_status_update'
  | 'agent_capabilities_changed'
  | 'new_agent_available'
  | 'agent_workload_update'
  | 'user_status_update'
  | 'mention_notification'
  | 'system_announcement';

interface MessageMetadata {
  messageId: string;
  version: string;
  source: string;
  priority: MessagePriority;
}

type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
```

### Real-time Update Payloads
```typescript
// Agent Status Update
interface AgentStatusUpdate {
  type: 'agent_status_update';
  data: {
    agentId: string;
    previousStatus: AgentStatus;
    currentStatus: AgentStatus;
    availability: AvailabilityInfo;
    timestamp: Date;
    reason?: string;
  };
}

// Agent Capabilities Changed
interface AgentCapabilitiesUpdate {
  type: 'agent_capabilities_changed';
  data: {
    agentId: string;
    addedCapabilities: string[];
    removedCapabilities: string[];
    updatedCapabilities: AgentCapability[];
    timestamp: Date;
  };
}

// New Agent Available
interface NewAgentNotification {
  type: 'new_agent_available';
  data: {
    agent: AgentDetails;
    announcement?: string;
    availabilityDate: Date;
  };
}
```

## REST API Endpoints

### Search Endpoints
```typescript
/**
 * POST /api/v1/mentions/search
 * Unified search across all mention types
 */
interface UnifiedSearchRequest {
  query: string;
  options: UnifiedSearchOptions;
}

interface UnifiedSearchResponse {
  success: boolean;
  data: MentionSearchResponse;
  errors?: APIError[];
  meta: ResponseMetadata;
}

/**
 * GET /api/v1/agents/search
 * Agent-specific search with query parameters
 */
interface AgentSearchEndpoint {
  query: string;
  types?: string; // comma-separated
  capabilities?: string; // comma-separated
  status?: string; // comma-separated
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * POST /api/v1/agents/batch-status
 * Batch status retrieval for multiple agents
 */
interface BatchStatusRequest {
  agentIds: string[];
  includeMetrics?: boolean;
  includeAvailability?: boolean;
}

interface BatchStatusResponse {
  success: boolean;
  data: {
    statuses: Map<string, AgentStatus>;
    availabilities: Map<string, AvailabilityInfo>;
    metrics?: Map<string, AgentMetrics>;
  };
  meta: ResponseMetadata;
}
```

### Agent Detail Endpoints
```typescript
/**
 * GET /api/v1/agents/{agentId}
 * Get detailed agent information
 */
interface AgentDetailResponse {
  success: boolean;
  data: AgentDetails;
  meta: ResponseMetadata;
}

/**
 * GET /api/v1/agents/{agentId}/capabilities
 * Get agent capabilities with detailed information
 */
interface AgentCapabilitiesResponse {
  success: boolean;
  data: {
    capabilities: AgentCapability[];
    skillMap: Map<string, Skill[]>;
    certifications: Certification[];
  };
  meta: ResponseMetadata;
}

/**
 * POST /api/v1/agents/capabilities-search
 * Search agents by specific capability requirements
 */
interface CapabilitySearchRequest {
  requiredCapabilities: CapabilityFilter[];
  preferredCapabilities?: CapabilityFilter[];
  minimumProficiency?: ProficiencyLevel;
  options: BaseSearchOptions;
}
```

## Error Response Format

### Standard Error Structure
```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp: Date;
}

interface ErrorResponse {
  success: false;
  errors: APIError[];
  meta: ResponseMetadata;
}

// Standard Error Codes
enum MentionAPIErrorCode {
  // Client errors (4xx)
  INVALID_QUERY = 'INVALID_QUERY',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_AGENT_ID = 'INVALID_AGENT_ID',
  UNSUPPORTED_SEARCH_TYPE = 'UNSUPPORTED_SEARCH_TYPE',
  
  // Server errors (5xx)
  SEARCH_SERVICE_UNAVAILABLE = 'SEARCH_SERVICE_UNAVAILABLE',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  // Business logic errors
  AGENT_NOT_AVAILABLE = 'AGENT_NOT_AVAILABLE',
  MENTION_NOT_ALLOWED = 'MENTION_NOT_ALLOWED',
  CAPABILITIES_MISMATCH = 'CAPABILITIES_MISMATCH'
}
```

## Authentication and Authorization

### Request Headers
```typescript
interface APIRequestHeaders {
  'Authorization': `Bearer ${string}`; // JWT token
  'X-API-Version': string; // API version
  'X-Request-ID': string; // Unique request identifier
  'X-Client-Info': string; // Client application info
  'Content-Type': 'application/json';
}

interface JWTPayload {
  sub: string; // User ID
  iat: number; // Issued at
  exp: number; // Expiration
  permissions: Permission[];
  roles: Role[];
  scope: string[];
}
```

### Permission System
```typescript
interface Permission {
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'not_in';
  value: any;
}

// Example permissions for mention system
enum MentionPermission {
  SEARCH_AGENTS = 'agents:search',
  SEARCH_USERS = 'users:search',
  SEARCH_CHANNELS = 'channels:search',
  VIEW_AGENT_DETAILS = 'agents:view',
  VIEW_SENSITIVE_INFO = 'agents:view:sensitive',
  MENTION_AGENT = 'agents:mention',
  MENTION_USER = 'users:mention',
  VIEW_OFFLINE_AGENTS = 'agents:view:offline'
}
```

## Response Metadata

### Standard Response Metadata
```typescript
interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  version: string;
  duration: number;
  cached: boolean;
  rateLimit?: RateLimitInfo;
  deprecation?: DeprecationInfo;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

interface DeprecationInfo {
  deprecated: boolean;
  sunset?: Date;
  link?: string;
  message?: string;
}
```

These API contracts provide a comprehensive foundation for implementing the @ mention system with clear interfaces, robust error handling, and extensible architecture that supports the AgentLink platform's current and future requirements.