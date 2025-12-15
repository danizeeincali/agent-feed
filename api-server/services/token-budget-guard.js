/**
 * Token Budget Guard
 * Enforces token limits to prevent cache explosions
 */

export class TokenBudgetGuard {
  constructor(maxTokens = 30000) {
    this.maxTokens = maxTokens;
    this.warnings = [];
    console.log(`🛡️ TokenBudgetGuard initialized (max: ${maxTokens} tokens)`);
  }

  /**
   * Validate prompt size
   * @param {string} prompt - Prompt to validate
   * @param {string} context - Context description for logging
   * @throws {Error} If prompt exceeds budget
   */
  validatePrompt(prompt, context = 'prompt') {
    const estimate = this.estimateTokens(prompt);

    if (estimate > this.maxTokens) {
      const error = `Token budget exceeded: ${estimate}/${this.maxTokens} tokens in ${context}`;
      console.error(`🚨 ${error}`);
      throw new Error(error);
    }

    // Warn at 70% usage
    if (estimate > this.maxTokens * 0.7) {
      const warning = `⚠️ High token usage: ${estimate}/${this.maxTokens} tokens (${Math.round(estimate / this.maxTokens * 100)}%) in ${context}`;
      console.warn(warning);
      this.warnings.push(warning);
    }

    console.log(`✅ Token budget OK: ${estimate}/${this.maxTokens} tokens (${Math.round(estimate / this.maxTokens * 100)}%) in ${context}`);

    return {
      valid: true,
      estimate,
      percentage: Math.round(estimate / this.maxTokens * 100),
      remaining: this.maxTokens - estimate
    };
  }

  /**
   * Estimate token count from text
   * Uses rough heuristic: 1 token ≈ 4 characters
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Get warnings
   * @returns {Array<string>} List of warnings
   */
  getWarnings() {
    return [...this.warnings];
  }

  /**
   * Clear warnings
   */
  clearWarnings() {
    this.warnings = [];
  }

  /**
   * Get statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      maxTokens: this.maxTokens,
      warningCount: this.warnings.length,
      warningThreshold: Math.round(this.maxTokens * 0.7)
    };
  }
}

/**
 * Create a token budget guard instance
 * @param {number} maxTokens - Maximum tokens allowed
 * @returns {TokenBudgetGuard} Guard instance
 */
export function createTokenBudgetGuard(maxTokens = 30000) {
  return new TokenBudgetGuard(maxTokens);
}

export default TokenBudgetGuard;
