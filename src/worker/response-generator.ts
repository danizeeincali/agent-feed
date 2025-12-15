/**
 * ResponseGenerator - AI response generation using Claude API
 * Phase 3B: Agent Worker Implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentContext,
  GeneratedResponse,
  GenerationOptions,
  ValidationResult,
} from '../types/worker';
import type { FeedItem } from '../types/feed';

export class ResponseGenerator {
  private anthropic: Anthropic;

  constructor(anthropicClient?: Anthropic) {
    this.anthropic = anthropicClient || new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate AI response for feed item
   */
  async generate(
    context: AgentContext,
    feedItem: FeedItem,
    options: GenerationOptions = {}
  ): Promise<GeneratedResponse> {
    const startTime = Date.now();

    try {
      // Build prompts
      const systemPrompt = this.buildSystemPrompt(context);
      const userPrompt = this.buildUserPrompt(context, feedItem);

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: context.model || 'claude-sonnet-4-5-20250929',
        max_tokens: options.maxLength || context.postingRules.maxLength || 1000,
        temperature: options.temperature || context.responseStyle.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const durationMs = Date.now() - startTime;

      // Extract and post-process content
      const contentBlock = response.content[0];
      let content = '';

      if (contentBlock.type === 'text') {
        content = contentBlock.text;
      }

      // Clean up response
      content = content.trim();

      // Remove surrounding quotes if present
      if ((content.startsWith('"') && content.endsWith('"')) ||
          (content.startsWith("'") && content.endsWith("'"))) {
        content = content.slice(1, -1).trim();
      }

      return {
        content,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        durationMs,
        metadata: {
          model: response.model,
          stopReason: response.stop_reason,
          temperature: options.temperature || context.responseStyle.temperature || 0.7,
        },
      };
    } catch (error: any) {
      if (error.type === 'rate_limit_error') {
        throw new Error(`Claude API rate limit exceeded: ${error.message}`);
      } else if (error.type === 'overloaded_error') {
        throw new Error(`Claude API overloaded: ${error.message}`);
      } else {
        throw new Error(`Response generation failed: ${error.message || error}`);
      }
    }
  }

  /**
   * Build system prompt from agent context
   */
  private buildSystemPrompt(context: AgentContext): string {
    return `${context.personality}

You must follow these posting rules:
- Max length: ${context.postingRules.maxLength} characters
- Min length: ${context.postingRules.minLength || 50} characters
${context.postingRules.blockedWords ? `- Blocked words: ${context.postingRules.blockedWords.join(', ')}` : ''}

Response style: ${JSON.stringify(context.responseStyle)}

Generate ONLY the response text, no explanations or meta-commentary.`;
  }

  /**
   * Build user prompt with feed item details
   */
  private buildUserPrompt(context: AgentContext, feedItem: FeedItem): string {
    let prompt = `Respond to this post:

Title: ${feedItem.title}
Content: ${feedItem.content || feedItem.contentSnippet || '(No content)'}
${feedItem.author ? `Author: ${feedItem.author}` : ''}
${feedItem.link ? `Link: ${feedItem.link}` : ''}
`;

    // Add memories if available
    if (context.memories && context.memories.length > 0) {
      prompt += `\nRecent memories:\n`;
      context.memories.slice(0, 3).forEach(memory => {
        prompt += `- ${memory.content}\n`;
      });
    }

    prompt += `\nGenerate a response that matches your personality and follows the posting rules.`;

    return prompt;
  }

  /**
   * Validate generated response
   */
  validateResponse(
    response: string,
    context: AgentContext,
    feedItem: FeedItem
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (response.length < (context.postingRules.minLength || 50)) {
      errors.push(`Response too short: ${response.length} characters (min: ${context.postingRules.minLength || 50})`);
    }

    if (response.length > context.postingRules.maxLength) {
      errors.push(`Response too long: ${response.length} characters (max: ${context.postingRules.maxLength})`);
    }

    // Blocked words validation
    if (context.postingRules.blockedWords && context.postingRules.blockedWords.length > 0) {
      const lowerResponse = response.toLowerCase();
      const foundBlockedWords = context.postingRules.blockedWords.filter(word =>
        lowerResponse.includes(word.toLowerCase())
      );

      if (foundBlockedWords.length > 0) {
        errors.push(`Response contains blocked words: ${foundBlockedWords.join(', ')}`);
      }
    }

    // Empty response check
    if (!response.trim()) {
      errors.push('Response is empty');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
