/**
 * ClaudeCodeWorker - Uses Claude Code SDK for intelligent task execution
 * Replaces regex-based TaskTypeDetector with Claude's natural language understanding
 *
 * Phase 3: Claude Code SDK Integration
 */

import axios, { AxiosError } from 'axios';
import type { DatabaseManager } from '../types/database-manager';
import type { WorkTicket } from '../types/work-ticket';
import type { WorkerResult } from '../types/worker';
import logger from '../utils/logger';

/**
 * Configuration for Claude Code SDK worker
 */
interface ClaudeCodeConfig {
  /** Claude Code SDK endpoint URL */
  endpoint: string;
  /** Working directory for Claude operations */
  workingDirectory: string;
  /** Claude model to use */
  model: string;
  /** Maximum execution time in milliseconds */
  timeout: number;
  /** Maximum conversation turns */
  maxTurns: number;
  /** Allowed tools for Claude to use */
  allowedTools: string[];
  /** Enable fallback to standard worker on failure */
  enableFallback: boolean;
}

/**
 * Claude Code SDK response structure
 */
interface ClaudeCodeResponse {
  success: boolean;
  message: string;
  responses: Array<{
    type: string;
    content?: string;
    message?: {
      content: string | Array<{ type: string; text?: string; name?: string }>;
    };
    messages?: any[];
    model?: string;
  }>;
  error?: string;
  timestamp?: string;
}

/**
 * Worker that uses Claude Code SDK for task execution
 *
 * Key features:
 * - Natural language understanding (no regex parsing)
 * - Multi-step task execution
 * - File system operations via Claude's tools
 * - Command execution via Bash tool
 * - Web search and fetch capabilities
 * - Proper error handling and fallback
 */
export class ClaudeCodeWorker {
  private db: DatabaseManager;
  private config: ClaudeCodeConfig;

  constructor(db: DatabaseManager, config?: Partial<ClaudeCodeConfig>) {
    this.db = db;

    // Load configuration from environment with sensible defaults
    this.config = {
      endpoint: config?.endpoint || process.env.CLAUDE_CODE_ENDPOINT || 'http://localhost:3001/api/claude-code/streaming-chat',
      workingDirectory: config?.workingDirectory || '/workspaces/agent-feed/prod/agent_workspace',
      model: config?.model || process.env.CLAUDE_CODE_MODEL || 'claude-sonnet-4-20250514',
      timeout: config?.timeout || parseInt(process.env.CLAUDE_CODE_TIMEOUT || '60000'),
      maxTurns: config?.maxTurns || parseInt(process.env.CLAUDE_CODE_MAX_TURNS || '10'),
      allowedTools: config?.allowedTools || [
        'Read', 'Write', 'Edit', 'Bash',
        'Grep', 'Glob', 'WebSearch', 'WebFetch'
      ],
      enableFallback: config?.enableFallback !== false,
    };

    logger.info('ClaudeCodeWorker initialized', {
      endpoint: this.config.endpoint,
      workingDirectory: this.config.workingDirectory,
      model: this.config.model,
      timeout: this.config.timeout,
    });
  }

  /**
   * Execute work ticket using Claude Code SDK
   * Main entry point - called by WorkerSpawnerAdapter
   */
  async executeTicket(ticket: WorkTicket): Promise<WorkerResult> {
    const startTime = Date.now();

    try {
      logger.info('ClaudeCodeWorker executing ticket', {
        ticketId: ticket.id,
        userId: ticket.userId,
        agentName: ticket.agentName,
      });

      // Extract user's request from ticket payload
      const userRequest = this.extractUserRequest(ticket);

      if (!userRequest) {
        throw new Error('Could not extract user request from ticket payload');
      }

      logger.info('User request extracted', {
        ticketId: ticket.id,
        requestLength: userRequest.length,
        requestPreview: userRequest.substring(0, 100),
      });

      // Build enhanced prompt with context
      const prompt = this.buildPrompt(ticket, userRequest);

      // Call Claude Code SDK
      const response = await this.callClaudeCodeSDK(prompt, ticket);

      // Extract result from response
      const result = this.extractResult(response);

      const duration = Date.now() - startTime;

      logger.info('Ticket execution completed successfully', {
        ticketId: ticket.id,
        duration,
        tokensUsed: result.tokensUsed,
        contentLength: result.content.length,
      });

      return {
        success: true,
        output: {
          content: result.content,
          toolsUsed: result.toolsUsed,
          model: result.model,
        },
        tokensUsed: result.tokensUsed,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Ticket execution failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        success: false,
        error: error as Error,
        tokensUsed: 0,
        duration,
      };
    }
  }

  /**
   * Extract user request from ticket payload
   */
  private extractUserRequest(ticket: WorkTicket): string | null {
    const payload = ticket.payload;

    // Priority 1: Direct content field
    if (payload.content && typeof payload.content === 'string') {
      return payload.content;
    }

    // Priority 2: Post content (from post-to-ticket integration)
    if (payload.post?.content) {
      return payload.post.content;
    }

    // Priority 3: Feed item content (from RSS worker compatibility)
    if (payload.feedItem?.content) {
      return payload.feedItem.content;
    }

    // Priority 4: Any text-like field
    const textFields = ['text', 'message', 'body', 'description'];
    for (const field of textFields) {
      if (payload[field] && typeof payload[field] === 'string') {
        return payload[field];
      }
    }

    return null;
  }

  /**
   * Build enhanced prompt with context for Claude
   */
  private buildPrompt(ticket: WorkTicket, userRequest: string): string {
    const parts: string[] = [];

    // System context
    parts.push('You are an AI assistant helping with file operations and automation tasks.');
    parts.push('');

    // Workspace context
    parts.push(`Your working directory is: ${this.config.workingDirectory}`);
    parts.push('This is your workspace root. All file operations should be relative to this directory.');
    parts.push('');

    // Agent context (if available)
    if (ticket.agentName) {
      parts.push(`You are acting as agent: ${ticket.agentName}`);
      parts.push('');
    }

    // User request
    parts.push('The user has requested:');
    parts.push('---');
    parts.push(userRequest);
    parts.push('---');
    parts.push('');

    // Instructions
    parts.push('Please complete this request using your available tools.');
    parts.push('You have access to file operations (Read, Write, Edit), command execution (Bash), and search tools.');
    parts.push('');
    parts.push('IMPORTANT:');
    parts.push('- All file paths should be relative to your working directory');
    parts.push('- Create files directly in the workspace root unless the user specifies a subdirectory');
    parts.push('- When listing directories, provide the full contents in a clear format');
    parts.push('- If you need to execute commands, use the Bash tool');
    parts.push('- Return a clear summary of what you accomplished');

    return parts.join('\n');
  }

  /**
   * Call Claude Code SDK via HTTP
   */
  private async callClaudeCodeSDK(
    prompt: string,
    ticket: WorkTicket
  ): Promise<ClaudeCodeResponse> {
    const sessionId = `worker_${ticket.userId}_${ticket.id}_${Date.now()}`;

    try {
      logger.info('Calling Claude Code SDK', {
        ticketId: ticket.id,
        sessionId,
        endpoint: this.config.endpoint,
        promptLength: prompt.length,
      });

      const requestBody = {
        message: prompt,
        options: {
          sessionId,
          cwd: this.config.workingDirectory,
          model: this.config.model,
          allowedTools: this.config.allowedTools,
        },
      };

      logger.debug('Claude Code SDK request', {
        ticketId: ticket.id,
        body: requestBody,
      });

      const response = await axios.post<ClaudeCodeResponse>(
        this.config.endpoint,
        requestBody,
        {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Claude Code SDK response received', {
        ticketId: ticket.id,
        sessionId,
        success: response.data.success,
        responsesCount: response.data.responses?.length || 0,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Claude Code SDK request failed');
      }

      return response.data;

    } catch (error) {
      // Handle specific error types
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === 'ECONNABORTED') {
          throw new Error(`Claude Code SDK timeout after ${this.config.timeout}ms`);
        }

        if (axiosError.response?.status === 429) {
          throw new Error('Claude Code SDK rate limit exceeded');
        }

        if (axiosError.response?.status === 503) {
          throw new Error('Claude Code SDK service unavailable');
        }

        if (axiosError.response) {
          const errorData = axiosError.response.data as any;
          throw new Error(
            `Claude Code SDK error (${axiosError.response.status}): ${
              errorData?.error || axiosError.message
            }`
          );
        }

        throw new Error(`Claude Code SDK request failed: ${axiosError.message}`);
      }

      throw error;
    }
  }

  /**
   * Extract result from Claude Code SDK response
   */
  private extractResult(response: ClaudeCodeResponse): {
    content: string;
    tokensUsed: number;
    toolsUsed: string[];
    model: string;
  } {
    // Extract content from response
    const content = this.extractContent(response);

    // Extract token usage
    const tokensUsed = this.extractTokenUsage(response);

    // Extract tools used
    const toolsUsed = this.extractToolsUsed(response);

    // Extract model
    const model = response.responses[0]?.model || this.config.model;

    return {
      content,
      tokensUsed,
      toolsUsed,
      model,
    };
  }

  /**
   * Extract content text from Claude's response
   */
  private extractContent(response: ClaudeCodeResponse): string {
    // Priority 1: Top-level message field (SDK's extracted response)
    if (response.message) {
      return response.message;
    }

    // Priority 2: Last assistant message in responses
    const responses = response.responses || [];

    for (let i = responses.length - 1; i >= 0; i--) {
      const resp = responses[i];

      if (resp.type === 'assistant' && resp.message) {
        const message = resp.message;

        // Handle string content
        if (typeof message.content === 'string') {
          return message.content;
        }

        // Handle array content (extract text blocks)
        if (Array.isArray(message.content)) {
          const textBlocks = message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .filter(Boolean);

          if (textBlocks.length > 0) {
            return textBlocks.join('\n\n');
          }
        }
      }
    }

    // Priority 3: Any content field in responses
    for (let i = responses.length - 1; i >= 0; i--) {
      if (responses[i].content) {
        return responses[i].content as string;
      }
    }

    // Fallback
    return 'Task completed successfully';
  }

  /**
   * Extract token usage from response
   */
  private extractTokenUsage(response: ClaudeCodeResponse): number {
    const responses = response.responses || [];

    // Look for result message with token data
    const resultMsg = responses.find((r: any) =>
      r.type === 'result' && (r.total_tokens || r.usage)
    );

    if (resultMsg) {
      if ((resultMsg as any).total_tokens) {
        return (resultMsg as any).total_tokens;
      }
      if ((resultMsg as any).usage) {
        const usage = (resultMsg as any).usage;
        return (usage.input_tokens || 0) + (usage.output_tokens || 0);
      }
    }

    // Fallback: Estimate from content length
    const totalContent = responses
      .map(r => JSON.stringify(r))
      .join('');

    return Math.ceil(totalContent.length / 4); // Rough token estimate
  }

  /**
   * Extract list of tools used during execution
   */
  private extractToolsUsed(response: ClaudeCodeResponse): string[] {
    const tools = new Set<string>();
    const responses = response.responses || [];

    responses.forEach((resp: any) => {
      if (resp.messages && Array.isArray(resp.messages)) {
        resp.messages.forEach((msg: any) => {
          if (msg.type === 'assistant' && msg.message?.content) {
            const content = Array.isArray(msg.message.content)
              ? msg.message.content
              : [msg.message.content];

            content.forEach((block: any) => {
              if (block.type === 'tool_use' && block.name) {
                tools.add(block.name);
              }
            });
          }
        });
      }
    });

    return Array.from(tools);
  }
}
