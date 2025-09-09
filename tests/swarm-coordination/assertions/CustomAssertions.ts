/**
 * Custom Assertions for Agent Feed Testing
 * Domain-specific assertions for comprehensive validation
 */

import { expect } from 'vitest';
import type { MockPost, MockComment, MockAgent } from '../mocks/MockFactory';

// Extend Vitest's expect interface
interface CustomMatchers<R = unknown> {
  toBeValidPost(): R;
  toBeValidComment(): R;
  toHaveMentions(expectedMentions: string[]): R;
  toHaveHashtags(expectedTags: string[]): R;
  toBeValidMentionNotification(): R;
  toHaveCorrectCommentThreading(): R;
  toHaveValidTimestamp(): R;
  toBeWithinResponseTime(maxMs: number): R;
  toHaveMinimumCoverage(percentage: number): R;
  toPassRegressionChecks(): R;
  toBeAccessible(): R;
  toLoadWithoutWhiteScreen(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

/**
 * Post validation assertions
 */
expect.extend({
  toBeValidPost(received: any) {
    const post = received as MockPost;
    
    const checks = [
      { pass: typeof post.id === 'string' && post.id.length > 0, message: 'Post must have valid ID' },
      { pass: typeof post.content === 'string' && post.content.length > 0, message: 'Post must have content' },
      { pass: typeof post.author === 'string' && post.author.length > 0, message: 'Post must have author' },
      { pass: Array.isArray(post.mentions), message: 'Post mentions must be array' },
      { pass: Array.isArray(post.hashtags), message: 'Post hashtags must be array' },
      { pass: typeof post.timestamp === 'string', message: 'Post must have timestamp' },
      { pass: typeof post.likes === 'number' && post.likes >= 0, message: 'Post likes must be non-negative number' },
      { pass: Array.isArray(post.comments), message: 'Post comments must be array' }
    ];
    
    const failedChecks = checks.filter(check => !check.pass);
    
    return {
      pass: failedChecks.length === 0,
      message: () => failedChecks.length > 0 
        ? `Post validation failed: ${failedChecks.map(c => c.message).join(', ')}`
        : 'Post is valid'
    };
  },

  toBeValidComment(received: any) {
    const comment = received as MockComment;
    
    const checks = [
      { pass: typeof comment.id === 'string' && comment.id.length > 0, message: 'Comment must have valid ID' },
      { pass: typeof comment.postId === 'string' && comment.postId.length > 0, message: 'Comment must have post ID' },
      { pass: typeof comment.content === 'string' && comment.content.length > 0, message: 'Comment must have content' },
      { pass: typeof comment.author === 'string' && comment.author.length > 0, message: 'Comment must have author' },
      { pass: Array.isArray(comment.mentions), message: 'Comment mentions must be array' },
      { pass: typeof comment.timestamp === 'string', message: 'Comment must have timestamp' }
    ];
    
    const failedChecks = checks.filter(check => !check.pass);
    
    return {
      pass: failedChecks.length === 0,
      message: () => failedChecks.length > 0 
        ? `Comment validation failed: ${failedChecks.map(c => c.message).join(', ')}`
        : 'Comment is valid'
    };
  },

  toHaveMentions(received: any, expectedMentions: string[]) {
    const mentions = received.mentions || [];
    
    const allMentionsPresent = expectedMentions.every(mention => 
      mentions.includes(mention)
    );
    
    return {
      pass: allMentionsPresent,
      message: () => allMentionsPresent
        ? `Expected mentions ${expectedMentions.join(', ')} are present`
        : `Expected mentions ${expectedMentions.join(', ')}, but got ${mentions.join(', ')}`
    };
  },

  toHaveHashtags(received: any, expectedTags: string[]) {
    const hashtags = received.hashtags || [];
    
    const allTagsPresent = expectedTags.every(tag => 
      hashtags.includes(tag)
    );
    
    return {
      pass: allTagsPresent,
      message: () => allTagsPresent
        ? `Expected hashtags ${expectedTags.join(', ')} are present`
        : `Expected hashtags ${expectedTags.join(', ')}, but got ${hashtags.join(', ')}`
    };
  },

  toBeValidMentionNotification(received: any) {
    const notification = received;
    
    const checks = [
      { pass: typeof notification.mentionedUser === 'string', message: 'Must have mentioned user' },
      { pass: typeof notification.postId === 'string', message: 'Must have post ID' },
      { pass: typeof notification.author === 'string', message: 'Must have author' },
      { pass: notification.mentionedUser !== notification.author, message: 'User cannot mention themselves' }
    ];
    
    const failedChecks = checks.filter(check => !check.pass);
    
    return {
      pass: failedChecks.length === 0,
      message: () => failedChecks.length > 0 
        ? `Mention notification validation failed: ${failedChecks.map(c => c.message).join(', ')}`
        : 'Mention notification is valid'
    };
  },

  toHaveCorrectCommentThreading(received: any) {
    const comments = received as MockComment[];
    
    for (const comment of comments) {
      // Check that replies have correct parent references
      if (comment.replies) {
        for (const reply of comment.replies) {
          if (reply.parentId !== comment.id) {
            return {
              pass: false,
              message: () => `Reply ${reply.id} has incorrect parent ID ${reply.parentId}, expected ${comment.id}`
            };
          }
        }
      }
    }
    
    return {
      pass: true,
      message: () => 'Comment threading is correct'
    };
  },

  toHaveValidTimestamp(received: any) {
    const timestamp = received.timestamp;
    
    if (typeof timestamp !== 'string') {
      return {
        pass: false,
        message: () => 'Timestamp must be a string'
      };
    }
    
    const date = new Date(timestamp);
    const isValidDate = !isNaN(date.getTime());
    const isRecentDate = date.getTime() <= Date.now();
    
    return {
      pass: isValidDate && isRecentDate,
      message: () => isValidDate 
        ? (isRecentDate ? 'Timestamp is valid' : 'Timestamp is in the future')
        : 'Timestamp is not a valid date'
    };
  }
});

/**
 * Performance assertions
 */
expect.extend({
  toBeWithinResponseTime(received: number, maxMs: number) {
    return {
      pass: received <= maxMs,
      message: () => received <= maxMs
        ? `Response time ${received}ms is within limit of ${maxMs}ms`
        : `Response time ${received}ms exceeds limit of ${maxMs}ms`
    };
  },

  toHaveMinimumCoverage(received: number, percentage: number) {
    return {
      pass: received >= percentage,
      message: () => received >= percentage
        ? `Coverage ${received}% meets minimum requirement of ${percentage}%`
        : `Coverage ${received}% is below minimum requirement of ${percentage}%`
    };
  }
});

/**
 * Regression prevention assertions
 */
expect.extend({
  toPassRegressionChecks(received: any) {
    const testResults = received.testResults || [];
    const regressionTests = testResults.filter((test: any) => 
      test.name.includes('regression') || test.name.includes('prevent')
    );
    
    const allPassed = regressionTests.every((test: any) => test.status === 'pass');
    const failedTests = regressionTests.filter((test: any) => test.status === 'fail');
    
    return {
      pass: allPassed,
      message: () => allPassed
        ? `All ${regressionTests.length} regression tests passed`
        : `${failedTests.length} regression tests failed: ${failedTests.map((t: any) => t.name).join(', ')}`
    };
  },

  toBeAccessible(received: any) {
    // Simulate accessibility checks
    const element = received;
    
    const checks = [
      { pass: element.hasAttribute?.('aria-label') || element.textContent, message: 'Must have accessible label' },
      { pass: !element.hasAttribute?.('tabindex') || parseInt(element.getAttribute('tabindex')) >= -1, message: 'Must have valid tabindex' },
      { pass: element.tagName !== 'DIV' || element.hasAttribute?.('role'), message: 'Semantic elements should have roles' }
    ];
    
    const failedChecks = checks.filter(check => !check.pass);
    
    return {
      pass: failedChecks.length === 0,
      message: () => failedChecks.length > 0 
        ? `Accessibility validation failed: ${failedChecks.map(c => c.message).join(', ')}`
        : 'Element is accessible'
    };
  },

  toLoadWithoutWhiteScreen(received: any) {
    const pageMetrics = received;
    
    const checks = [
      { pass: pageMetrics.hasContent === true, message: 'Page must have content' },
      { pass: pageMetrics.renderTime < 3000, message: 'Page must render within 3 seconds' },
      { pass: pageMetrics.errorCount === 0, message: 'Page must have no JavaScript errors' },
      { pass: pageMetrics.componentsLoaded > 0, message: 'At least one component must load' }
    ];
    
    const failedChecks = checks.filter(check => !check.pass);
    
    return {
      pass: failedChecks.length === 0,
      message: () => failedChecks.length > 0 
        ? `White screen prevention failed: ${failedChecks.map(c => c.message).join(', ')}`
        : 'Page loaded successfully without white screen'
    };
  }
});

/**
 * Test utilities for common validation patterns
 */
export class TestValidationUtils {
  /**
   * Validate mention system functionality
   */
  static validateMentionSystem(posts: MockPost[]): ValidationResult {
    const results: ValidationCheck[] = [];
    
    for (const post of posts) {
      // Check mention format
      const mentionPattern = /@[\w-]+/g;
      const mentionsInContent = post.content.match(mentionPattern) || [];
      const actualMentions = post.mentions;
      
      results.push({
        check: 'mention-extraction',
        passed: mentionsInContent.length === actualMentions.length,
        details: `Content mentions: ${mentionsInContent.length}, Extracted: ${actualMentions.length}`
      });
      
      // Check mention notifications
      for (const mention of actualMentions) {
        results.push({
          check: 'mention-notification',
          passed: mention !== post.author, // Can't mention yourself
          details: `User ${mention} mentioned by ${post.author}`
        });
      }
    }
    
    return {
      passed: results.every(r => r.passed),
      checks: results,
      summary: `${results.filter(r => r.passed).length}/${results.length} mention checks passed`
    };
  }

  /**
   * Validate comment threading integrity
   */
  static validateCommentThreading(comments: MockComment[]): ValidationResult {
    const results: ValidationCheck[] = [];
    
    // Check parent-child relationships
    for (const comment of comments) {
      if (comment.replies) {
        for (const reply of comment.replies) {
          results.push({
            check: 'threading-integrity',
            passed: reply.parentId === comment.id,
            details: `Reply ${reply.id} parent: ${reply.parentId}, expected: ${comment.id}`
          });
        }
      }
    }
    
    // Check depth limits
    const maxDepth = this.calculateMaxDepth(comments);
    results.push({
      check: 'thread-depth',
      passed: maxDepth <= 3, // Reasonable depth limit
      details: `Maximum thread depth: ${maxDepth}`
    });
    
    return {
      passed: results.every(r => r.passed),
      checks: results,
      summary: `${results.filter(r => r.passed).length}/${results.length} threading checks passed`
    };
  }

  /**
   * Validate performance metrics
   */
  static validatePerformanceMetrics(metrics: PerformanceMetrics): ValidationResult {
    const results: ValidationCheck[] = [
      {
        check: 'load-time',
        passed: metrics.loadTime < 2000,
        details: `Load time: ${metrics.loadTime}ms`
      },
      {
        check: 'memory-usage',
        passed: metrics.memoryUsage < 100 * 1024 * 1024, // 100MB limit
        details: `Memory usage: ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB`
      },
      {
        check: 'error-rate',
        passed: metrics.errorRate < 0.01, // Less than 1% error rate
        details: `Error rate: ${(metrics.errorRate * 100).toFixed(2)}%`
      }
    ];
    
    return {
      passed: results.every(r => r.passed),
      checks: results,
      summary: `${results.filter(r => r.passed).length}/${results.length} performance checks passed`
    };
  }

  private static calculateMaxDepth(comments: MockComment[], currentDepth: number = 0): number {
    let maxDepth = currentDepth;
    
    for (const comment of comments) {
      if (comment.replies && comment.replies.length > 0) {
        const childDepth = this.calculateMaxDepth(comment.replies, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    
    return maxDepth;
  }
}

interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  summary: string;
}

interface ValidationCheck {
  check: string;
  passed: boolean;
  details: string;
}

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  errorRate: number;
}

export type { ValidationResult, ValidationCheck, PerformanceMetrics };