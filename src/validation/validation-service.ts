/**
 * Phase 4: ValidationService Implementation
 * Performs lightweight post validation with rule-based checks and optional LLM tone analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  ValidationConfig,
  ValidationResult,
  RuleCheckResult,
  ToneCheckResult,
  PostDraft,
  IValidationService
} from './types';
import { logger } from '../utils/logger';

/**
 * ValidationService
 *
 * Performs post validation in two phases:
 * 1. Fast rule-based checks (length, prohibited words, mentions, hashtags)
 * 2. Optional LLM tone check (~200 tokens)
 */
export class ValidationService implements IValidationService {
  private config: ValidationConfig;
  private anthropicClient?: Anthropic;

  constructor(config: ValidationConfig) {
    this.config = config;

    // Initialize Anthropic client if LLM validation is enabled
    if (config.enableLLMValidation && config.anthropicApiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: config.anthropicApiKey
      });
    }
  }

  /**
   * Main validation entry point
   * Validates post against rules and optionally checks tone with LLM
   */
  async validatePost(post: PostDraft): Promise<ValidationResult> {
    const startTime = Date.now();
    let tokenCost = 0;

    try {
      logger.info('Starting post validation', {
        agentName: post.agentName,
        contentLength: post.content.length,
        attemptNumber: post.metadata?.attemptNumber || 1
      });

      // Phase 1: Rule-based validation (fast, no API calls)
      const ruleChecks: RuleCheckResult[] = [];

      // Check length
      const lengthCheck = this.checkLength(post);
      ruleChecks.push(lengthCheck);
      if (!lengthCheck.passed) {
        return this.buildFailureResult(ruleChecks, null, tokenCost, startTime);
      }

      // Check prohibited words
      const prohibitedCheck = this.checkProhibitedWords(post);
      ruleChecks.push(prohibitedCheck);
      if (!prohibitedCheck.passed) {
        return this.buildFailureResult(ruleChecks, null, tokenCost, startTime);
      }

      // Check mentions
      const mentionsCheck = this.checkMentions(post);
      ruleChecks.push(mentionsCheck);
      if (!mentionsCheck.passed) {
        return this.buildFailureResult(ruleChecks, null, tokenCost, startTime);
      }

      // Check hashtags
      const hashtagsCheck = this.checkHashtags(post);
      ruleChecks.push(hashtagsCheck);
      if (!hashtagsCheck.passed) {
        return this.buildFailureResult(ruleChecks, null, tokenCost, startTime);
      }

      // Phase 2: LLM tone validation (optional, uses tokens)
      let toneCheck: ToneCheckResult | undefined;
      if (this.config.enableLLMValidation && this.anthropicClient) {
        logger.debug('Rule checks passed, running LLM tone check');
        toneCheck = await this.checkToneWithLLM(post, post.agentName);
        tokenCost += toneCheck.tokensUsed;

        if (!toneCheck.appropriate) {
          return this.buildFailureResult(ruleChecks, toneCheck, tokenCost, startTime);
        }
      }

      // All checks passed
      const durationMs = Date.now() - startTime;

      logger.info('Post validation successful', {
        agentName: post.agentName,
        durationMs,
        tokenCost,
        checksPerformed: ruleChecks.length + (toneCheck ? 1 : 0)
      });

      return {
        approved: true,
        canFix: false,
        reason: 'Validation passed',
        feedback: '',
        severity: 'minor',
        ruleChecks,
        toneCheck,
        tokenCost,
        durationMs,
        timestamp: new Date()
      };

    } catch (error: any) {
      logger.error('Validation error occurred', {
        error: error.message,
        stack: error.stack,
        agentName: post.agentName
      });

      // Return safe default on unexpected errors
      return {
        approved: false,
        canFix: true,
        reason: `Validation system error: ${error.message}`,
        feedback: 'Please try again. Contact support if this persists.',
        severity: 'critical',
        ruleChecks: [],
        tokenCost,
        durationMs: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check content length against min/max rules
   */
  checkLength(post: PostDraft): RuleCheckResult {
    const contentLength = post.content.length;

    // Check minimum length
    if (contentLength < this.config.minLength) {
      return {
        ruleName: 'min_length',
        passed: false,
        message: `Content too short: ${contentLength} chars (min: ${this.config.minLength})`,
        value: contentLength,
        canFix: true,
        suggestion: `Add ${this.config.minLength - contentLength} more characters`
      };
    }

    // Check maximum length
    if (contentLength > this.config.maxLength) {
      return {
        ruleName: 'max_length',
        passed: false,
        message: `Content too long: ${contentLength} chars (max: ${this.config.maxLength})`,
        value: contentLength,
        canFix: true,
        suggestion: `Shorten by ${contentLength - this.config.maxLength} characters`
      };
    }

    // Success
    return {
      ruleName: 'length',
      passed: true,
      message: `Length valid: ${contentLength} chars`,
      value: contentLength,
      canFix: false
    };
  }

  /**
   * Check for prohibited words
   */
  checkProhibitedWords(post: PostDraft): RuleCheckResult {
    if (this.config.prohibitedWords.length === 0) {
      return {
        ruleName: 'prohibited_words',
        passed: true,
        message: 'No prohibited words configured',
        canFix: false
      };
    }

    const contentLower = post.content.toLowerCase();
    const foundWords: string[] = [];

    // Check each prohibited word
    for (const word of this.config.prohibitedWords) {
      const wordLower = word.toLowerCase();
      // Use word boundary matching to avoid false positives
      const pattern = new RegExp(`\\b${this.escapeRegex(wordLower)}\\b`, 'i');

      if (pattern.test(post.content)) {
        foundWords.push(word);
      }
    }

    if (foundWords.length > 0) {
      return {
        ruleName: 'prohibited_words',
        passed: false,
        message: `Prohibited words detected: ${foundWords.join(', ')}`,
        value: foundWords,
        canFix: true,
        suggestion: 'Remove or rephrase to avoid these words'
      };
    }

    return {
      ruleName: 'prohibited_words',
      passed: true,
      message: 'No prohibited words found',
      canFix: false
    };
  }

  /**
   * Check mentions count and format
   */
  checkMentions(post: PostDraft): RuleCheckResult {
    // Extract mentions using regex
    const mentionRegex = /@[a-zA-Z0-9_]+/g;
    const mentions = post.content.match(mentionRegex) || [];
    const mentionCount = mentions.length;

    // Check count
    if (mentionCount > this.config.maxMentions) {
      return {
        ruleName: 'max_mentions',
        passed: false,
        message: `Too many mentions: ${mentionCount} (max: ${this.config.maxMentions})`,
        value: mentionCount,
        canFix: true,
        suggestion: `Limit mentions to ${this.config.maxMentions}`
      };
    }

    // Validate mention format
    const invalidMentions: string[] = [];
    for (const mention of mentions) {
      const username = mention.substring(1); // Remove @ symbol

      // Check username validity (1-15 chars, alphanumeric + underscore)
      if (username.length < 1 || username.length > 15) {
        invalidMentions.push(mention);
      } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        invalidMentions.push(mention);
      }
    }

    if (invalidMentions.length > 0) {
      return {
        ruleName: 'mention_format',
        passed: false,
        message: `Invalid mention format: ${invalidMentions.join(', ')}`,
        value: invalidMentions,
        canFix: true,
        suggestion: 'Use valid username format: @username (alphanumeric, 1-15 chars)'
      };
    }

    return {
      ruleName: 'mentions',
      passed: true,
      message: `Valid mentions: ${mentionCount}`,
      value: mentionCount,
      canFix: false
    };
  }

  /**
   * Check hashtags count and format
   */
  checkHashtags(post: PostDraft): RuleCheckResult {
    // Extract hashtags using regex
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const hashtags = post.content.match(hashtagRegex) || [];
    const hashtagCount = hashtags.length;

    // Check maximum count
    if (hashtagCount > this.config.maxHashtags) {
      return {
        ruleName: 'max_hashtags',
        passed: false,
        message: `Too many hashtags: ${hashtagCount} (max: ${this.config.maxHashtags})`,
        value: hashtagCount,
        canFix: true,
        suggestion: `Limit hashtags to ${this.config.maxHashtags}`
      };
    }

    return {
      ruleName: 'hashtags',
      passed: true,
      message: `Valid hashtags: ${hashtagCount}`,
      value: hashtagCount,
      canFix: false
    };
  }

  /**
   * Check tone appropriateness using LLM (~200 tokens)
   * Gracefully degrades on error (returns appropriate=true)
   */
  async checkToneWithLLM(post: PostDraft, agentName: string): Promise<ToneCheckResult> {
    if (!this.anthropicClient) {
      logger.warn('LLM validation requested but Anthropic client not initialized');
      return this.getDefaultToneResult();
    }

    try {
      const prompt = this.buildToneCheckPrompt(post, agentName);
      const startTime = Date.now();

      const response = await this.anthropicClient.messages.create({
        model: this.config.toneCheckModel || 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for consistent evaluation
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const durationMs = Date.now() - startTime;
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      // Parse response
      const contentBlock = response.content[0];
      if (contentBlock.type !== 'text') {
        logger.warn('Unexpected content type from LLM tone check');
        return this.getDefaultToneResult();
      }

      const resultText = contentBlock.text.trim();

      // Try to parse JSON response
      let toneResult: any;
      try {
        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/) ||
                         resultText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : resultText;
        toneResult = JSON.parse(jsonText);
      } catch (parseError) {
        logger.warn('Failed to parse LLM tone check response', {
          response: resultText,
          error: parseError
        });
        return this.getDefaultToneResult();
      }

      // Validate response structure
      if (!this.isValidToneCheckResult(toneResult)) {
        logger.warn('Invalid tone check result structure', { result: toneResult });
        return this.getDefaultToneResult();
      }

      logger.debug('Tone check completed', {
        agentName,
        appropriate: toneResult.appropriate,
        durationMs,
        tokensUsed
      });

      return {
        appropriate: toneResult.appropriate ?? true,
        score: toneResult.score ?? 1.0,
        issues: toneResult.issues || [],
        suggestions: toneResult.suggestions || [],
        analysis: resultText,
        tokensUsed
      };

    } catch (error: any) {
      logger.error('Tone check failed', {
        error: error.message,
        agentName
      });

      // Graceful degradation - assume tone is appropriate
      return this.getDefaultToneResult();
    }
  }

  /**
   * Build prompt for LLM tone checking
   */
  private buildToneCheckPrompt(post: PostDraft, agentName: string): string {
    return `Analyze the tone and appropriateness of this social media post. Return ONLY valid JSON.

Post Content:
"${post.content}"

Agent: ${agentName}

Evaluate:
1. Is the tone professional and appropriate?
2. Does it maintain brand consistency?
3. Are there any obvious quality issues?

Return JSON in this exact format:
{
  "appropriate": boolean,
  "score": number (0.0 to 1.0),
  "issues": string[] (list of problems found, empty if none),
  "suggestions": string[] (how to improve, empty if none)
}

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Validate tone check result structure
   */
  private isValidToneCheckResult(result: any): boolean {
    if (!result || typeof result !== 'object') {
      return false;
    }

    if (typeof result.appropriate !== 'boolean') {
      return false;
    }

    if (typeof result.score !== 'number' || result.score < 0 || result.score > 1) {
      return false;
    }

    if (!Array.isArray(result.issues) || !Array.isArray(result.suggestions)) {
      return false;
    }

    return true;
  }

  /**
   * Get default tone result (permissive fallback)
   */
  private getDefaultToneResult(): ToneCheckResult {
    return {
      appropriate: true,
      score: 1.0,
      issues: [],
      suggestions: [],
      analysis: 'Tone check unavailable - assuming appropriate',
      tokensUsed: 0
    };
  }

  /**
   * Build failure result from checks
   */
  private buildFailureResult(
    ruleChecks: RuleCheckResult[],
    toneCheck: ToneCheckResult | null,
    tokenCost: number,
    startTime: number
  ): ValidationResult {
    const failedChecks = ruleChecks.filter(c => !c.passed);
    const failedCheck = failedChecks[0];

    // Determine if issues can be fixed
    const canFix = failedCheck?.canFix ?? (toneCheck ? true : false);

    // Build feedback message
    let feedback = '';
    if (failedCheck?.suggestion) {
      feedback = failedCheck.suggestion;
    } else if (toneCheck?.suggestions.length) {
      feedback = toneCheck.suggestions.join('\n');
    }

    // Determine severity
    let severity: 'minor' | 'moderate' | 'critical' = 'moderate';
    if (failedCheck?.ruleName === 'prohibited_words') {
      severity = 'critical';
    } else if (toneCheck && toneCheck.score < 0.3) {
      severity = 'critical';
    } else if (failedCheck?.ruleName === 'length') {
      severity = 'moderate';
    } else {
      severity = 'minor';
    }

    const reason = failedCheck?.message || (toneCheck ? `Tone issues: ${toneCheck.issues.join(', ')}` : 'Validation failed');

    return {
      approved: false,
      canFix,
      reason,
      feedback,
      severity,
      ruleChecks,
      toneCheck: toneCheck ?? undefined,
      tokenCost,
      durationMs: Date.now() - startTime,
      timestamp: new Date()
    };
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
