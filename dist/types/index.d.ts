export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    claude_user_id?: string;
    password_hash?: string;
    preferences: UserPreferences;
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
}
export interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    notifications: NotificationSettings;
    feed_settings: FeedSettings;
    automation_enabled: boolean;
}
export interface NotificationSettings {
    email: boolean;
    push: boolean;
    feed_updates: boolean;
    agent_completion: boolean;
    error_alerts: boolean;
}
export interface FeedSettings {
    auto_refresh: boolean;
    items_per_page: number;
    default_view: 'list' | 'grid' | 'timeline';
    show_preview: boolean;
}
export interface Feed {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    url: string;
    feed_type: FeedType;
    status: FeedStatus;
    last_fetched?: Date;
    fetch_interval: number;
    automation_config: AutomationConfig;
    neural_patterns: NeuralPattern[];
    created_at: Date;
    updated_at: Date;
}
export declare enum FeedType {
    RSS = "rss",
    ATOM = "atom",
    JSON = "json",
    API = "api",
    WEBHOOK = "webhook"
}
export declare enum FeedStatus {
    ACTIVE = "active",
    PAUSED = "paused",
    ERROR = "error",
    PENDING = "pending"
}
export interface AutomationConfig {
    enabled: boolean;
    triggers: AutomationTrigger[];
    actions: AutomationAction[];
    claude_flow_config: ClaudeFlowConfig;
    session_id?: string;
}
export interface AutomationTrigger {
    id: string;
    type: TriggerType;
    conditions: Record<string, any>;
    enabled: boolean;
}
export declare enum TriggerType {
    NEW_ITEM = "new_item",
    KEYWORD_MATCH = "keyword_match",
    SCHEDULE = "schedule",
    CUSTOM = "custom"
}
export interface AutomationAction {
    id: string;
    type: ActionType;
    config: Record<string, any>;
    priority: number;
}
export declare enum ActionType {
    CLAUDE_FLOW_SPAWN = "claude_flow_spawn",
    NOTIFICATION = "notification",
    WEBHOOK = "webhook",
    EMAIL = "email",
    CUSTOM = "custom"
}
export interface ClaudeFlowConfig {
    swarm_topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
    max_agents: number;
    agent_types: string[];
    neural_training: boolean;
    memory_persistence: boolean;
}
export interface FeedItem {
    id: string;
    feed_id: string;
    title: string;
    content: string;
    url: string;
    author?: string;
    published_at: Date;
    fetched_at: Date;
    metadata: Record<string, any>;
    processed: boolean;
    automation_results: AutomationResult[];
}
export interface AutomationResult {
    id: string;
    feed_item_id: string;
    trigger_id: string;
    action_id: string;
    status: AutomationStatus;
    result_data: Record<string, any>;
    error_message?: string;
    created_at: Date;
    completed_at?: Date;
}
export declare enum AutomationStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface ClaudeFlowSession {
    id: string;
    user_id: string;
    swarm_id: string;
    status: SessionStatus;
    configuration: ClaudeFlowConfig;
    metrics: SessionMetrics;
    created_at: Date;
    updated_at: Date;
    ended_at?: Date;
}
export declare enum SessionStatus {
    INITIALIZING = "initializing",
    ACTIVE = "active",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed"
}
export interface SessionMetrics {
    agents_spawned: number;
    tasks_completed: number;
    total_tokens_used: number;
    performance_score: number;
    neural_patterns_learned: number;
}
export interface NeuralPattern {
    id: string;
    feed_id: string;
    pattern_type: 'coordination' | 'optimization' | 'prediction';
    pattern_data: Record<string, any>;
    confidence_score: number;
    usage_count: number;
    created_at: Date;
    updated_at: Date;
}
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: PaginationInfo;
}
export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}
export interface WebSocketEvent {
    type: string;
    data: any;
    timestamp: Date;
    user_id?: string;
}
export interface AuthToken {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: 'Bearer';
}
export interface JWTPayload {
    user_id: string;
    email: string;
    iat: number;
    exp: number;
}
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    pool: {
        min: number;
        max: number;
        idle: number;
    };
}
export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
}
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export interface ErrorResponse {
    error: {
        message: string;
        code?: string;
        details?: any;
    };
    timestamp: string;
    path: string;
}
//# sourceMappingURL=index.d.ts.map