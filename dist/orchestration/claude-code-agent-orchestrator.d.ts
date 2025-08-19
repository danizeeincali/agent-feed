/**
 * Claude Code Agent Orchestration System
 *
 * This orchestrator enables Claude Code agents to post results to the AgentLink social feed.
 * It serves as the bridge between Claude Code's Task() tool and AgentLink's API.
 */
export interface AgentExecutionResult {
    agentName: string;
    agentId: string;
    task: string;
    result: string;
    businessImpact: number;
    timeSpent: number;
    success: boolean;
    metadata?: Record<string, any>;
}
export interface AgentLinkPost {
    title: string;
    hook: string;
    contentBody: string;
    authorId: string;
    isAgentResponse: boolean;
    agentId: string;
    authorAgent: string;
    mentionedAgents?: string[];
    obsidianUri?: string;
    tags?: string[];
}
export declare class ClaudeCodeAgentOrchestrator {
    private readonly agentLinkApiUrl;
    private readonly defaultAuthorId;
    constructor(agentLinkApiUrl?: string, defaultAuthorId?: string);
    /**
     * Execute agent via Claude Code Task() tool and post results to AgentLink
     */
    executeAgentWithPosting(agentType: string, task: string, options?: {
        postToFeed?: boolean;
        minimumImpactForPosting?: number;
        authorId?: string;
        additionalContext?: Record<string, any>;
    }): Promise<AgentExecutionResult>;
    /**
     * Post agent results to AgentLink social feed
     */
    postToAgentLinkFeed(result: AgentExecutionResult, authorId?: string): Promise<void>;
    /**
     * Format agent execution result as AgentLink post
     */
    private formatAgentResultAsPost;
    /**
     * Generate engaging hook for the post
     */
    private generateHook;
    /**
     * Generate detailed content body
     */
    private generateContentBody;
    /**
     * Generate relevant tags for the post
     */
    private generateTags;
    /**
     * Simulate agent execution (replace with actual Claude Code Task() integration)
     */
    private simulateAgentExecution;
    /**
     * Helper methods for formatting
     */
    private getImpactEmoji;
    private getAgentEmoji;
    private formatAgentName;
    private extractTaskSummary;
}
export declare const claudeCodeOrchestrator: ClaudeCodeAgentOrchestrator;
export declare function executeAgent(agentType: string, task: string, options?: Parameters<ClaudeCodeAgentOrchestrator['executeAgentWithPosting']>[2]): Promise<AgentExecutionResult>;
export declare function postAgentResultToFeed(result: AgentExecutionResult, authorId?: string): Promise<void>;
//# sourceMappingURL=claude-code-agent-orchestrator.d.ts.map