/**
 * Token Counter Utilities
 *
 * Provides accurate token counting for testing token usage requirements.
 * Uses approximation algorithms suitable for testing purposes.
 */

/**
 * Estimate tokens using character-based approximation
 * This is a simplified version - production should use actual tokenizer
 */
function estimateTokensBasic(text) {
  if (!text) return 0;

  // Average: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * More sophisticated token estimation
 * Accounts for words, punctuation, and whitespace
 */
function estimateTokensAdvanced(text) {
  if (!text) return 0;

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const punctuation = (text.match(/[.,!?;:(){}[\]"']/g) || []).length;
  const numbers = (text.match(/\d+/g) || []).length;

  // Estimation formula:
  // - Words: 1 token per word on average
  // - Punctuation: 0.5 tokens each
  // - Numbers: 1 token per number
  return words.length + Math.ceil(punctuation * 0.5) + numbers;
}

/**
 * Calculate tokens for a JSON object
 */
function calculateObjectTokens(obj, method = 'advanced') {
  const jsonString = JSON.stringify(obj, null, 2);

  if (method === 'basic') {
    return estimateTokensBasic(jsonString);
  } else {
    return estimateTokensAdvanced(jsonString);
  }
}

/**
 * Calculate tokens for markdown frontmatter
 */
function calculateFrontmatterTokens(frontmatter) {
  // Add overhead for YAML delimiters and formatting
  const yamlString = `---\n${JSON.stringify(frontmatter, null, 2)}\n---`;
  return estimateTokensAdvanced(yamlString) + 5; // Add overhead for parsing
}

/**
 * Compare token usage between two objects
 */
function compareTokenUsage(obj1, obj2, label1 = 'Object 1', label2 = 'Object 2') {
  const tokens1 = calculateObjectTokens(obj1);
  const tokens2 = calculateObjectTokens(obj2);

  const savings = tokens2 - tokens1;
  const savingsPercent = tokens2 > 0 ? (savings / tokens2) * 100 : 0;

  return {
    [label1]: tokens1,
    [label2]: tokens2,
    difference: savings,
    percentageSavings: savingsPercent,
    summary: `${label1}: ${tokens1} tokens, ${label2}: ${tokens2} tokens, Savings: ${savings} tokens (${savingsPercent.toFixed(1)}%)`
  };
}

/**
 * Token budget validator
 */
class TokenBudgetValidator {
  constructor(budget) {
    this.budget = budget;
    this.usage = 0;
    this.transactions = [];
  }

  /**
   * Add token usage
   */
  add(tokens, description = '') {
    this.usage += tokens;
    this.transactions.push({
      tokens,
      description,
      timestamp: Date.now(),
      totalUsage: this.usage
    });
  }

  /**
   * Check if within budget
   */
  isWithinBudget() {
    return this.usage <= this.budget;
  }

  /**
   * Get remaining budget
   */
  getRemaining() {
    return this.budget - this.usage;
  }

  /**
   * Get usage percentage
   */
  getUsagePercentage() {
    return (this.usage / this.budget) * 100;
  }

  /**
   * Get detailed report
   */
  getReport() {
    return {
      budget: this.budget,
      used: this.usage,
      remaining: this.getRemaining(),
      percentage: this.getUsagePercentage(),
      withinBudget: this.isWithinBudget(),
      transactions: this.transactions
    };
  }

  /**
   * Reset validator
   */
  reset() {
    this.usage = 0;
    this.transactions = [];
  }
}

/**
 * Measure token usage for a function
 */
async function measureTokenUsage(fn, description = '') {
  const startTime = performance.now();

  let result;
  if (fn.constructor.name === 'AsyncFunction') {
    result = await fn();
  } else {
    result = fn();
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Estimate tokens from result
  let tokens = 0;
  if (typeof result === 'string') {
    tokens = estimateTokensAdvanced(result);
  } else if (typeof result === 'object' && result !== null) {
    tokens = calculateObjectTokens(result);
  }

  return {
    result,
    tokens,
    duration,
    description
  };
}

/**
 * Batch token measurement
 */
function measureBatchTokenUsage(items, estimatorFn) {
  const measurements = items.map((item, index) => {
    const tokens = estimatorFn(item);
    return {
      index,
      item,
      tokens
    };
  });

  const totalTokens = measurements.reduce((sum, m) => sum + m.tokens, 0);
  const averageTokens = totalTokens / measurements.length;
  const maxTokens = Math.max(...measurements.map(m => m.tokens));
  const minTokens = Math.min(...measurements.map(m => m.tokens));

  return {
    measurements,
    summary: {
      total: totalTokens,
      average: averageTokens,
      max: maxTokens,
      min: minTokens,
      count: measurements.length
    }
  };
}

/**
 * Token profiler for detailed analysis
 */
class TokenProfiler {
  constructor() {
    this.profiles = new Map();
  }

  /**
   * Start profiling a section
   */
  start(sectionName) {
    this.profiles.set(sectionName, {
      name: sectionName,
      startTime: performance.now(),
      tokens: 0,
      operations: []
    });
  }

  /**
   * Record an operation
   */
  record(sectionName, operation, tokens) {
    const profile = this.profiles.get(sectionName);
    if (profile) {
      profile.operations.push({
        operation,
        tokens,
        timestamp: performance.now()
      });
      profile.tokens += tokens;
    }
  }

  /**
   * End profiling a section
   */
  end(sectionName) {
    const profile = this.profiles.get(sectionName);
    if (profile) {
      profile.endTime = performance.now();
      profile.duration = profile.endTime - profile.startTime;
    }
    return profile;
  }

  /**
   * Get all profiles
   */
  getProfiles() {
    return Array.from(this.profiles.values());
  }

  /**
   * Get summary report
   */
  getSummary() {
    const profiles = this.getProfiles();

    return {
      totalSections: profiles.length,
      totalTokens: profiles.reduce((sum, p) => sum + p.tokens, 0),
      totalDuration: profiles.reduce((sum, p) => sum + (p.duration || 0), 0),
      sections: profiles.map(p => ({
        name: p.name,
        tokens: p.tokens,
        duration: p.duration,
        operations: p.operations.length
      }))
    };
  }

  /**
   * Clear all profiles
   */
  clear() {
    this.profiles.clear();
  }
}

module.exports = {
  estimateTokensBasic,
  estimateTokensAdvanced,
  calculateObjectTokens,
  calculateFrontmatterTokens,
  compareTokenUsage,
  TokenBudgetValidator,
  measureTokenUsage,
  measureBatchTokenUsage,
  TokenProfiler
};
