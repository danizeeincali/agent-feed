/**
 * Token Analytics WebSocket Handler
 * Handles real-time token cost tracking and analytics
 */
export interface TokenUsage {
    id: string;
    timestamp: string;
    provider: 'claude' | 'openai' | 'mcp' | 'claude-flow';
    model: string;
    tokensUsed: number;
    estimatedCost: number;
    requestType: string;
    component?: string;
    metadata?: Record<string, any>;
}
/**
 * Broadcast token usage update to all subscribed clients
 */
export declare const broadcastTokenUsageUpdate: (tokenUsage: TokenUsage) => void;
/**
 * Track new token usage and broadcast to clients
 */
export declare const trackTokenUsage: (usage: Omit<TokenUsage, "id" | "timestamp">) => Promise<TokenUsage>;
//# sourceMappingURL=token-analytics.d.ts.map