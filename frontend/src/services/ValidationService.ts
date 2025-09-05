/**
 * ValidationService - TDD London School Implementation
 * 
 * Provides validation services for post content, character limits, and business rules
 */

interface CharacterLimits {
  min: number;
  max: number;
  warning: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ContentValidationOptions {
  allowMentions?: boolean;
  allowHashtags?: boolean;
  maxMentions?: number;
  maxHashtags?: number;
  forbiddenWords?: string[];
}

export class ValidationService {
  private characterLimits = {
    title: { min: 5, max: 100, warning: 80 },
    content: { min: 10, max: 2000, warning: 1800 },
    tags: { maxPerTag: 20, maxTags: 10, maxTotal: 200 },
    authorAgent: { max: 50 },
    comment: { min: 3, max: 500, warning: 450 }
  };

  validatePostLength(content: string, limits: CharacterLimits): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const length = content.length;

    // Check minimum length
    if (length < limits.min) {
      errors.push(`Content too short - minimum ${limits.min} characters required`);
    }

    // Check maximum length
    if (length > limits.max) {
      errors.push(`Content too long - maximum ${limits.max} characters allowed`);
    }

    // Check warning threshold
    if (length >= limits.warning && length <= limits.max) {
      warnings.push(`Approaching character limit (${limits.max - length} characters remaining)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validatePostContent(content: string, options: ContentValidationOptions = {}): ValidationResult {
    const {
      allowMentions = true,
      allowHashtags = true,
      maxMentions = 10,
      maxHashtags = 10,
      forbiddenWords = []
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for forbidden words
    const lowerContent = content.toLowerCase();
    forbiddenWords.forEach(word => {
      if (lowerContent.includes(word.toLowerCase())) {
        errors.push(`Content contains forbidden word: ${word}`);
      }
    });

    // Validate mentions
    if (allowMentions) {
      const mentions = content.match(/@\w+/g) || [];
      if (mentions.length > maxMentions) {
        errors.push(`Too many mentions (${mentions.length}/${maxMentions})`);
      }
    } else {
      const mentions = content.match(/@\w+/g);
      if (mentions && mentions.length > 0) {
        errors.push('Mentions are not allowed');
      }
    }

    // Validate hashtags
    if (allowHashtags) {
      const hashtags = content.match(/#\w+/g) || [];
      if (hashtags.length > maxHashtags) {
        errors.push(`Too many hashtags (${hashtags.length}/${maxHashtags})`);
      }
    } else {
      const hashtags = content.match(/#\w+/g);
      if (hashtags && hashtags.length > 0) {
        errors.push('Hashtags are not allowed');
      }
    }

    // Check for empty or whitespace-only content
    if (!content.trim()) {
      errors.push('Content cannot be empty');
    }

    // Check for excessive whitespace
    const whitespaceRatio = (content.length - content.replace(/\s/g, '').length) / content.length;
    if (whitespaceRatio > 0.5) {
      warnings.push('Content contains excessive whitespace');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getCharacterLimits() {
    return this.characterLimits;
  }

  checkContentRules(content: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Business rule: Check for agent mentions
    const agentMentions = content.match(/@\w+-agent/g);
    if (agentMentions && agentMentions.length > 0) {
      warnings.push('Content mentions specific agents - ensure this is intentional');
    }

    // Business rule: Check for technical jargon
    const technicalTerms = ['API', 'database', 'endpoint', 'webhook', 'JSON'];
    const foundTerms = technicalTerms.filter(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
    if (foundTerms.length > 3) {
      warnings.push('Content may be too technical for general audience');
    }

    // Business rule: Check readability
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const averageWordsPerSentence = sentences.reduce((total, sentence) => {
      return total + sentence.trim().split(/\s+/).length;
    }, 0) / sentences.length;

    if (averageWordsPerSentence > 20) {
      warnings.push('Consider shorter sentences for better readability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  formatValidationMessage(validation: { 
    type: string; 
    current?: number; 
    min?: number; 
    max?: number;
    field?: string;
  }): string {
    const { type, current, min, max, field = 'Content' } = validation;

    switch (type) {
      case 'length':
        if (min && max) {
          return `${field} must be between ${min} and ${max} characters`;
        }
        if (min && current !== undefined && current < min) {
          return `${field} must be at least ${min} characters (currently ${current})`;
        }
        if (max && current !== undefined && current > max) {
          return `${field} exceeds maximum length of ${max} characters`;
        }
        break;

      case 'required':
        return `${field} is required`;

      case 'format':
        return `${field} format is invalid`;

      case 'warning':
        return `${field} is approaching limits`;

      default:
        return `${field} validation failed`;
    }

    return `${field} validation failed`;
  }

  sanitizeContent(content: string): string {
    // Remove potential XSS attempts
    const sanitized = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    return sanitized;
  }

  validateHierarchy(posts: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for proper hierarchy levels
    posts.forEach(post => {
      if (post.metadata?.hierarchyLevel < 0) {
        errors.push(`Invalid hierarchy level for post ${post.id}: ${post.metadata.hierarchyLevel}`);
      }

      if (post.metadata?.hierarchyLevel > 5) {
        warnings.push(`Post ${post.id} has very deep nesting (level ${post.metadata.hierarchyLevel})`);
      }

      // Check parent-child consistency
      if (post.metadata?.parentId) {
        const parent = posts.find(p => p.id === post.metadata.parentId);
        if (!parent) {
          errors.push(`Post ${post.id} references non-existent parent ${post.metadata.parentId}`);
        } else if (post.metadata.hierarchyLevel !== parent.metadata.hierarchyLevel + 1) {
          errors.push(`Hierarchy level mismatch for post ${post.id}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Utility method for testing
  createValidationResult(isValid: boolean, errors: string[] = [], warnings: string[] = []): ValidationResult {
    return { isValid, errors, warnings };
  }
}