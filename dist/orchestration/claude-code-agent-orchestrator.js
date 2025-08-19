"use strict";
/**
 * Claude Code Agent Orchestration System
 *
 * This orchestrator enables Claude Code agents to post results to the AgentLink social feed.
 * It serves as the bridge between Claude Code's Task() tool and AgentLink's API.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeCodeOrchestrator = exports.ClaudeCodeAgentOrchestrator = void 0;
exports.executeAgent = executeAgent;
exports.postAgentResultToFeed = postAgentResultToFeed;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("@/utils/logger");
class ClaudeCodeAgentOrchestrator {
    agentLinkApiUrl;
    defaultAuthorId;
    constructor(agentLinkApiUrl = 'http://localhost:5000/api', defaultAuthorId = 'demo-user-123') {
        this.agentLinkApiUrl = agentLinkApiUrl;
        this.defaultAuthorId = defaultAuthorId;
    }
    /**
     * Execute agent via Claude Code Task() tool and post results to AgentLink
     */
    async executeAgentWithPosting(agentType, task, options = {}) {
        const { postToFeed = true, minimumImpactForPosting = 5, authorId = this.defaultAuthorId, additionalContext = {} } = options;
        const startTime = Date.now();
        try {
            logger_1.logger.info(`Executing agent: ${agentType}`, { task, agentType });
            // This would be the actual Claude Code Task() tool execution
            // For now, simulating agent execution
            const agentResult = await this.simulateAgentExecution(agentType, task);
            const executionTime = Math.round((Date.now() - startTime) / 1000 / 60);
            const result = {
                agentName: agentType,
                agentId: `${agentType}-${Date.now()}`,
                task,
                result: agentResult.output,
                businessImpact: agentResult.businessImpact,
                timeSpent: executionTime,
                success: agentResult.success,
                metadata: {
                    ...additionalContext,
                    executionTimestamp: new Date().toISOString(),
                    agentVersion: '1.0.0'
                }
            };
            // Post to AgentLink feed if conditions are met
            if (postToFeed && result.businessImpact >= minimumImpactForPosting && result.success) {
                await this.postToAgentLinkFeed(result, authorId);
            }
            logger_1.logger.info(`Agent execution completed`, {
                agentType,
                success: result.success,
                businessImpact: result.businessImpact,
                postedToFeed: postToFeed && result.businessImpact >= minimumImpactForPosting
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Agent execution failed: ${agentType}`, error);
            return {
                agentName: agentType,
                agentId: `${agentType}-error-${Date.now()}`,
                task,
                result: `Error executing agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
                businessImpact: 0,
                timeSpent: Math.round((Date.now() - startTime) / 1000 / 60),
                success: false,
                metadata: additionalContext
            };
        }
    }
    /**
     * Post agent results to AgentLink social feed
     */
    async postToAgentLinkFeed(result, authorId = this.defaultAuthorId) {
        try {
            const post = this.formatAgentResultAsPost(result, authorId);
            const response = await axios_1.default.post(`${this.agentLinkApiUrl}/posts`, post, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000
            });
            if (response.status === 200 || response.status === 201) {
                logger_1.logger.info(`Successfully posted to AgentLink feed`, {
                    agentName: result.agentName,
                    postId: response.data?.id
                });
            }
            else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to post to AgentLink feed`, {
                agentName: result.agentName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Don't throw - posting failure shouldn't fail the agent execution
        }
    }
    /**
     * Format agent execution result as AgentLink post
     */
    formatAgentResultAsPost(result, authorId) {
        const impactEmoji = this.getImpactEmoji(result.businessImpact);
        const agentEmoji = this.getAgentEmoji(result.agentName);
        const title = `${agentEmoji} ${this.formatAgentName(result.agentName)} - ${this.extractTaskSummary(result.task)}`;
        const hook = this.generateHook(result);
        const contentBody = this.generateContentBody(result);
        const tags = this.generateTags(result);
        return {
            title: title.substring(0, 100), // Limit title length
            hook,
            contentBody,
            authorId,
            isAgentResponse: true,
            agentId: result.agentId,
            authorAgent: result.agentName,
            mentionedAgents: [result.agentName],
            tags
        };
    }
    /**
     * Generate engaging hook for the post
     */
    generateHook(result) {
        const impact = result.businessImpact;
        const time = result.timeSpent;
        if (impact >= 8) {
            return `High-impact strategic work completed in ${time} minutes - significant business value delivered`;
        }
        else if (impact >= 6) {
            return `Important workflow optimization completed - measurable productivity improvement`;
        }
        else {
            return `Task completed efficiently - process improvement achieved`;
        }
    }
    /**
     * Generate detailed content body
     */
    generateContentBody(result) {
        const sections = [];
        // Task summary
        sections.push(`**Task:** ${result.task}`);
        // Results
        if (result.result.length > 200) {
            sections.push(`**Result:** ${result.result.substring(0, 200)}...`);
        }
        else {
            sections.push(`**Result:** ${result.result}`);
        }
        // Impact and metrics
        sections.push(`**Business Impact:** ${result.businessImpact}/10`);
        sections.push(`**Execution Time:** ${result.timeSpent} minutes`);
        // Success status
        sections.push(`**Status:** ${result.success ? '✅ Completed successfully' : '❌ Completed with issues'}`);
        return sections.join('\n\n');
    }
    /**
     * Generate relevant tags for the post
     */
    generateTags(result) {
        const tags = [];
        // Agent-specific tags
        if (result.agentName.includes('personal-todos')) {
            tags.push('TaskManagement', 'Productivity');
        }
        else if (result.agentName.includes('meeting')) {
            tags.push('MeetingManagement', 'Coordination');
        }
        else if (result.agentName.includes('strategic') || result.agentName.includes('chief-of-staff')) {
            tags.push('StrategicPlanning', 'Leadership');
        }
        // Impact-based tags
        if (result.businessImpact >= 8) {
            tags.push('HighImpact', 'Strategic');
        }
        else if (result.businessImpact >= 6) {
            tags.push('Optimization', 'Improvement');
        }
        // Add agent name as tag
        tags.push(this.formatAgentName(result.agentName));
        return tags.slice(0, 5); // Limit to 5 tags
    }
    /**
     * Simulate agent execution (replace with actual Claude Code Task() integration)
     */
    async simulateAgentExecution(agentType, task) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        // Simulate different agent behaviors
        const agentBehaviors = {
            'personal-todos-agent': {
                output: `Task analysis complete. Priority: P2, Impact score: 7/10. Added to task list with Fibonacci prioritization.`,
                businessImpact: Math.floor(Math.random() * 3) + 6, // 6-8
                success: true
            },
            'chief-of-staff-agent': {
                output: `Strategic coordination initiated. Identified 3 key stakeholders, scheduled alignment meeting, created execution roadmap.`,
                businessImpact: Math.floor(Math.random() * 2) + 8, // 8-9
                success: true
            },
            'meeting-prep-agent': {
                output: `Meeting agenda prepared with 4 discussion topics, success criteria defined, background materials compiled.`,
                businessImpact: Math.floor(Math.random() * 3) + 5, // 5-7
                success: true
            },
            'default': {
                output: `Task completed successfully. Processed request and generated structured output with actionable recommendations.`,
                businessImpact: Math.floor(Math.random() * 4) + 5, // 5-8
                success: Math.random() > 0.1 // 90% success rate
            }
        };
        return agentBehaviors[agentType] || agentBehaviors.default;
    }
    /**
     * Helper methods for formatting
     */
    getImpactEmoji(impact) {
        if (impact >= 9)
            return '🚀';
        if (impact >= 7)
            return '⭐';
        if (impact >= 5)
            return '✅';
        return '📝';
    }
    getAgentEmoji(agentName) {
        const emojiMap = {
            'chief-of-staff-agent': '👨‍💼',
            'personal-todos-agent': '📋',
            'meeting-prep-agent': '📅',
            'impact-filter-agent': '🎯',
            'bull-beaver-bear-agent': '🐂',
            'goal-analyst-agent': '📊',
            'follow-ups-agent': '🔄',
            'prd-observer-agent': '📝',
            'opportunity-scout-agent': '🔍',
            'market-research-analyst-agent': '📈',
            'financial-viability-analyzer-agent': '💰',
            'link-logger-agent': '🔗',
            'agent-feedback-agent': '💬',
            'get-to-know-you-agent': '👋',
            'agent-feed-post-composer-agent': '📣',
            'agent-ideas-agent': '💡',
            'meta-agent': '🔧',
            'meta-update-agent': '🔄',
            'opportunity-log-maintainer-agent': '📚',
            'meeting-next-steps-agent': '📋',
            'chief-of-staff-automation-agent': '🤖'
        };
        return emojiMap[agentName] || '🤖';
    }
    formatAgentName(agentName) {
        return agentName
            .replace(/-agent$/, '')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    extractTaskSummary(task) {
        // Extract first sentence or first 50 characters
        const firstSentence = task.split('.')[0];
        if (firstSentence.length <= 50) {
            return firstSentence;
        }
        return task.substring(0, 47) + '...';
    }
}
exports.ClaudeCodeAgentOrchestrator = ClaudeCodeAgentOrchestrator;
// Export singleton instance
exports.claudeCodeOrchestrator = new ClaudeCodeAgentOrchestrator();
// Export utility functions for direct usage
async function executeAgent(agentType, task, options) {
    return exports.claudeCodeOrchestrator.executeAgentWithPosting(agentType, task, options);
}
async function postAgentResultToFeed(result, authorId) {
    return exports.claudeCodeOrchestrator.postToAgentLinkFeed(result, authorId);
}
//# sourceMappingURL=claude-code-agent-orchestrator.js.map