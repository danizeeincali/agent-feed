/**
 * API Key Sanitizer - Prevents API key exposure in Docker deployments
 * SECURITY: Critical security layer for VPS/Docker environments
 */

class ApiKeySanitizer {
  constructor() {
    this.sensitivePatterns = [
      /sk-ant-[a-zA-Z0-9-_]{40,}/g, // Anthropic API keys
      /ANTHROPIC_API_KEY/gi,
      /sk-[a-zA-Z0-9-_]{40,}/g, // Generic API keys
      /API_KEY/gi,
      /apikey/gi,
      /token/gi,
      /secret/gi
    ];

    this.blockedQueries = [
      'environment variables',
      'env vars',
      'process.env',
      'ANTHROPIC_API_KEY',
      'api key',
      'secret key',
      'token',
      'credentials'
    ];
  }

  /**
   * Sanitize Claude responses to remove any API key references
   */
  sanitizeResponse(response) {
    if (!response || typeof response !== 'string') return response;

    let cleaned = response;

    // Remove API key patterns
    this.sensitivePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[REDACTED_API_KEY]');
    });

    return cleaned;
  }

  /**
   * Check if user input contains blocked queries about API keys
   */
  containsBlockedQuery(input) {
    if (!input || typeof input !== 'string') return false;

    const lowerInput = input.toLowerCase();
    return this.blockedQueries.some(blocked => lowerInput.includes(blocked));
  }

  /**
   * Sanitize user input before sending to Claude
   */
  sanitizeInput(input) {
    if (this.containsBlockedQuery(input)) {
      throw new Error('Query about system credentials is not allowed for security reasons.');
    }
    return input;
  }

  /**
   * Protect environment variables from being accessed via Claude responses only
   * Backend services can still access API keys legitimately
   */
  protectEnvironment() {
    // Store reference to real API key for backend use
    this.realApiKey = process.env.ANTHROPIC_API_KEY;

    // Only protect against external access via responses, not backend access
    console.log('🔒 Security: API key protection enabled for responses only');
    console.log(`✅ Security: Backend has legitimate access to API key: ${this.realApiKey ? 'YES' : 'NO'}`);
  }

  /**
   * Get the real API key for legitimate backend use
   */
  getApiKey() {
    return this.realApiKey || process.env.ANTHROPIC_API_KEY;
  }
}

export { ApiKeySanitizer };