/**
 * Error Categorizer for Claude Code responses
 * Distinguishes between different types of errors and provides appropriate user messages
 */

export interface ErrorCategory {
  type: 'timeout' | 'network' | 'server' | 'rate_limit' | 'unknown';
  userMessage: string;
  shouldRetry: boolean;
  maxRetries: number;
  retryDelay: number; // in milliseconds
}

export class ErrorCategorizer {
  /**
   * Categorize an error and provide appropriate handling instructions
   */
  static categorizeError(error: Error, retryCount: number = 0): ErrorCategory {
    const errorMessage = error.message.toLowerCase();

    // Timeout errors
    if (
      error.name === 'AbortError' ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    ) {
      return {
        type: 'timeout',
        userMessage: this.getTimeoutMessage(retryCount),
        shouldRetry: retryCount < 2,
        maxRetries: 2,
        retryDelay: Math.pow(2, retryCount) * 2000 // 2s, 4s, 8s
      };
    }

    // Network connectivity errors
    if (
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('cors')
    ) {
      return {
        type: 'network',
        userMessage: this.getNetworkMessage(retryCount),
        shouldRetry: retryCount < 3,
        maxRetries: 3,
        retryDelay: Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
      };
    }

    // Server errors (5xx)
    if (errorMessage.includes('http 5') || errorMessage.includes('server error')) {
      return {
        type: 'server',
        userMessage: this.getServerMessage(retryCount),
        shouldRetry: retryCount < 2,
        maxRetries: 2,
        retryDelay: Math.pow(2, retryCount) * 3000 // 3s, 6s
      };
    }

    // Rate limiting (429)
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return {
        type: 'rate_limit',
        userMessage: 'Rate limit exceeded. Please wait a moment before sending another request.',
        shouldRetry: retryCount < 1,
        maxRetries: 1,
        retryDelay: 30000 // 30 seconds
      };
    }

    // Unknown errors
    return {
      type: 'unknown',
      userMessage: `Unexpected error: ${error.message}`,
      shouldRetry: retryCount < 1,
      maxRetries: 1,
      retryDelay: 5000
    };
  }

  private static getTimeoutMessage(retryCount: number): string {
    if (retryCount === 0) {
      return 'Request timed out. Claude Code is processing a complex operation that takes longer than usual. This is normal for complex requests and indicates the system is working.';
    } else if (retryCount === 1) {
      return 'Still processing your request. Claude Code is handling a particularly complex operation. Please wait as this may take several minutes.';
    } else {
      return 'The operation is taking longer than expected. Claude Code may be overloaded or processing an extremely complex request. Please try a simpler request or wait a few minutes.';
    }
  }

  private static getNetworkMessage(retryCount: number): string {
    if (retryCount === 0) {
      return 'Connection failed. Please check that the Claude Code backend is running and accessible.';
    } else if (retryCount < 3) {
      return 'Network connection issues detected. Retrying...';
    } else {
      return 'Persistent network issues. Please check your internet connection and verify that the Claude Code backend is running on the correct port.';
    }
  }

  private static getServerMessage(retryCount: number): string {
    if (retryCount === 0) {
      return 'Server error occurred. The request may have been too complex or the server is temporarily overloaded.';
    } else {
      return 'Persistent server issues. Please try a simpler request or wait a few minutes for the server to recover.';
    }
  }

  /**
   * Get a user-friendly explanation of what might be happening during long operations
   */
  static getLongOperationExplanation(elapsedSeconds: number): string {
    if (elapsedSeconds < 10) {
      return 'Initializing request...';
    } else if (elapsedSeconds < 30) {
      return 'Processing your request... Claude Code is analyzing and preparing a response.';
    } else if (elapsedSeconds < 60) {
      return 'Still working... Complex operations like code analysis, file operations, or tool usage can take time.';
    } else if (elapsedSeconds < 120) {
      return 'Almost there... Claude Code is working on a comprehensive response. This level of processing indicates thorough analysis.';
    } else {
      return 'This is taking longer than usual... Claude Code is handling a very complex request. The detailed response will be worth the wait.';
    }
  }

  /**
   * Determine if an operation should be considered "long-running" based on elapsed time
   */
  static isLongRunningOperation(elapsedSeconds: number): boolean {
    return elapsedSeconds > 15; // Based on the 15-17 second typical response time
  }

  /**
   * Get suggested actions for users when operations are taking a long time
   */
  static getSuggestedActions(errorType: ErrorCategory['type'], elapsedSeconds: number): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case 'timeout':
        suggestions.push('Wait for the current operation to complete');
        suggestions.push('Try breaking complex requests into smaller parts');
        suggestions.push('Check if the operation involves large files or complex analysis');
        break;
      case 'network':
        suggestions.push('Check your internet connection');
        suggestions.push('Verify the backend server is running');
        suggestions.push('Check firewall settings');
        break;
      case 'server':
        suggestions.push('Wait a moment and try again');
        suggestions.push('Try a simpler request');
        suggestions.push('Check server logs for more details');
        break;
      case 'rate_limit':
        suggestions.push('Wait 30 seconds before making another request');
        suggestions.push('Reduce request frequency');
        break;
      default:
        suggestions.push('Wait and try again');
        suggestions.push('Check the request format');
    }

    if (elapsedSeconds > 60) {
      suggestions.push('Consider that complex operations normally take 1-3 minutes');
      suggestions.push('This may be normal for operations involving multiple files or complex analysis');
    }

    return suggestions;
  }
}