/**
 * OutcomeFormatter - Formats worker results into human-readable outcome messages
 *
 * This utility formats task completion outcomes for posting to the agent feed.
 * It supports two output formats:
 * 1. Comment replies - for work originating from posts/comments
 * 2. New posts - for autonomous work
 *
 * Message format includes:
 * - Status emoji (success/failure)
 * - Summary line
 * - Details section
 * - Files modified list
 * - Metrics (duration, tokens)
 *
 * @module utils/outcome-formatter
 */

/**
 * Worker execution result structure
 */
export interface WorkerResult {
  success: boolean;
  output?: {
    content: string;
    toolsUsed: string[];
    model: string;
  };
  error?: Error | string;
  tokensUsed: number;
  duration: number;
}

/**
 * Context extracted from work ticket
 */
export interface PostContext {
  ticketId: string;
  originType: 'post' | 'comment' | 'autonomous';
  parentPostId?: number;
  parentCommentId?: number;
  userRequest: string;
  conversationDepth: number;
  agentName: string;
}

/**
 * Metadata extracted from worker outcome
 */
export interface OutcomeMetadata {
  summary: string;
  details: string;
  filesModified: string[];
  toolsUsed: string[];
  duration: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

/**
 * Formatted post structure
 */
export interface FormattedPost {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * Formats worker outcomes into human-readable messages
 */
export class OutcomeFormatter {
  /**
   * Format outcome as comment reply
   * Used when work originated from a post or comment
   *
   * @param result - Worker execution result
   * @param context - Work context from ticket
   * @returns Formatted comment content (markdown)
   */
  formatCommentReply(result: WorkerResult, context: PostContext): string {
    const statusEmoji = result.success ? '✅' : '❌';
    const statusText = result.success ? 'completed' : 'failed';

    let message = `${statusEmoji} Task ${statusText}\n\n`;

    // Generate summary from content or error
    const summary = this.generateSummary(result);
    message += `${summary}\n\n`;

    // Add changes or attempts section
    if (result.success && result.output) {
      const filesModified = this.extractFilesModified(result.output.content, result.output.toolsUsed);

      if (filesModified.length > 0) {
        message += '📝 Changes:\n';
        for (const file of filesModified) {
          message += `- Modified: ${file}\n`;
        }
        message += '\n';
      }
    } else if (!result.success) {
      message += '📝 Attempted:\n';
      message += `${this.extractAttemptedActions(result)}\n\n`;

      const errorMessage = this.getErrorMessage(result);
      if (errorMessage) {
        message += `🚨 Error:\n${errorMessage}\n\n`;
      }
    }

    // Add metrics
    const durationSec = (result.duration / 1000).toFixed(1);
    const tokensFormatted = result.tokensUsed.toLocaleString();
    const completionText = result.success ? 'Completed' : 'Failed after';
    message += `⏱️ ${completionText} in ${durationSec}s | 🎯 ${tokensFormatted} tokens used`;

    return message;
  }

  /**
   * Format outcome as new post
   * Used for autonomous work without parent post/comment
   *
   * @param result - Worker execution result
   * @param context - Work context from ticket
   * @returns Formatted post with title and content
   */
  formatNewPost(result: WorkerResult, context: PostContext): FormattedPost {
    const title = this.generateTitle(result);
    const emoji = this.selectTaskEmoji(result);
    const summary = this.generateSummary(result);

    let content = `${emoji} ${summary}\n\n`;

    // Add detailed findings from result
    if (result.output && result.output.content) {
      const details = this.extractDetails(result.output.content);
      if (details) {
        content += `${details}\n\n`;
      }
    }

    // Add summary section
    const filesModified = result.output
      ? this.extractFilesModified(result.output.content, result.output.toolsUsed)
      : [];

    if (filesModified.length > 0 || (result.output && result.output.toolsUsed.length > 0)) {
      content += '📊 Summary:\n';

      if (filesModified.length > 0) {
        content += `- ${filesModified.length} file${filesModified.length > 1 ? 's' : ''} modified\n`;
      }

      if (result.output && result.output.toolsUsed.length > 0) {
        content += `- Tools used: ${result.output.toolsUsed.join(', ')}\n`;
      }

      content += '\n';
    }

    // Add details section with file list
    if (filesModified.length > 0) {
      content += '📝 Details:\n';
      for (const file of filesModified) {
        content += `- Modified: ${file}\n`;
      }
      content += '\n';
    }

    // Add metrics
    const durationSec = (result.duration / 1000).toFixed(1);
    const tokensFormatted = result.tokensUsed.toLocaleString();
    content += `⏱️ Completed in ${durationSec}s | 🎯 ${tokensFormatted} tokens used`;

    return {
      title,
      content,
      tags: this.inferTags(result)
    };
  }

  /**
   * Generate post title from outcome
   *
   * @param result - Worker execution result
   * @param maxLength - Maximum title length (default: 100)
   * @returns Post title
   */
  generateTitle(result: WorkerResult, maxLength: number = 100): string {
    if (!result.output) {
      return result.success ? 'Task Completed' : 'Task Failed';
    }

    const filesModified = this.extractFilesModified(result.output.content, result.output.toolsUsed);

    // Pattern 1: File operations
    if (filesModified.length > 0) {
      const fileCount = filesModified.length;
      return `Updated ${fileCount} file${fileCount > 1 ? 's' : ''}`;
    }

    // Pattern 2: Use first sentence of content
    const firstSentence = result.output.content.split(/[.!?]\s/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length <= maxLength) {
      return firstSentence;
    }

    // Pattern 3: Truncate first sentence if too long
    if (firstSentence.length > maxLength) {
      return firstSentence.substring(0, maxLength - 3) + '...';
    }

    // Pattern 4: Generic fallback
    return result.success ? 'Task Completed Successfully' : 'Task Failed';
  }

  /**
   * Generate outcome summary from result
   * Extracts key information for summary line
   *
   * @param result - Worker execution result
   * @returns Summary text
   */
  private generateSummary(result: WorkerResult): string {
    if (!result.output || !result.output.content) {
      if (!result.success) {
        return this.getErrorMessage(result) || 'Task failed without output';
      }
      return 'Task completed successfully';
    }

    // Extract first meaningful sentence from content
    const content = result.output.content.trim();
    const sentences = content.split(/[.!?]\s/);

    for (const sentence of sentences) {
      const cleaned = sentence.trim();
      // Skip very short sentences (likely not meaningful)
      if (cleaned.length > 20 && cleaned.length < 200) {
        return cleaned + (cleaned.endsWith('.') || cleaned.endsWith('!') || cleaned.endsWith('?') ? '' : '.');
      }
    }

    // Fallback: use first 150 characters
    if (content.length > 150) {
      return content.substring(0, 147) + '...';
    }

    return content;
  }

  /**
   * Extract files modified from result content and tools used
   *
   * @param content - Worker result content
   * @param toolsUsed - List of tools used during execution
   * @returns Array of file paths
   */
  private extractFilesModified(content: string, toolsUsed: string[]): string[] {
    const files: string[] = [];

    // Check if file-modifying tools were used
    const modifyingTools = ['Write', 'Edit', 'NotebookEdit'];
    const usedModifyingTools = toolsUsed.filter(tool => modifyingTools.includes(tool));

    if (usedModifyingTools.length === 0) {
      return files;
    }

    // Extract file paths from content
    // Pattern 1: "modified file.ts" or "created file.ts"
    const pattern1 = /(?:modified|created|updated|edited|wrote to)\s+([^\s,.:;]+\.[a-zA-Z0-9]+)/gi;
    let match: RegExpExecArray | null;

    while ((match = pattern1.exec(content)) !== null) {
      const file = match[1].trim();
      if (file && !files.includes(file)) {
        files.push(file);
      }
    }

    // Pattern 2: File paths in backticks
    const pattern2 = /`([^\s`]+\.[a-zA-Z0-9]+)`/g;
    while ((match = pattern2.exec(content)) !== null) {
      const file = match[1].trim();
      if (file && !files.includes(file)) {
        files.push(file);
      }
    }

    // Pattern 3: File paths with forward slashes
    const pattern3 = /([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+)/g;
    while ((match = pattern3.exec(content)) !== null) {
      const file = match[1].trim();
      // Only include if looks like a reasonable file path (not too long)
      if (file && file.length < 100 && !files.includes(file)) {
        files.push(file);
      }
    }

    // Limit to first 10 files to avoid overwhelming output
    return files.slice(0, 10);
  }

  /**
   * Extract attempted actions from failed result
   *
   * @param result - Worker execution result
   * @returns Description of attempted actions
   */
  private extractAttemptedActions(result: WorkerResult): string {
    if (!result.output || !result.output.toolsUsed || result.output.toolsUsed.length === 0) {
      return 'Attempted to complete the task';
    }

    const actions: string[] = [];
    const toolDescriptions: Record<string, string> = {
      'Read': 'Read files',
      'Write': 'Write files',
      'Edit': 'Edit files',
      'Bash': 'Execute commands',
      'Glob': 'Search for files',
      'Grep': 'Search file contents',
      'WebFetch': 'Fetch web content',
      'NotebookEdit': 'Edit notebook cells'
    };

    for (const tool of result.output.toolsUsed) {
      const description = toolDescriptions[tool] || `Use ${tool} tool`;
      if (!actions.includes(description)) {
        actions.push(description);
      }
    }

    return actions.map(action => `- ${action}`).join('\n');
  }

  /**
   * Extract error message from result
   *
   * @param result - Worker execution result
   * @returns Error message or undefined
   */
  private getErrorMessage(result: WorkerResult): string | undefined {
    if (!result.error) {
      return undefined;
    }

    if (typeof result.error === 'string') {
      return result.error;
    }

    if (result.error instanceof Error) {
      return result.error.message;
    }

    return String(result.error);
  }

  /**
   * Extract details from result content
   * Returns meaningful paragraphs that aren't too long
   *
   * @param content - Worker result content
   * @returns Extracted details or empty string
   */
  private extractDetails(content: string): string {
    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);

    // Find substantial paragraphs (not too short, not too long)
    const goodParagraphs = paragraphs.filter(p => p.length > 50 && p.length < 500);

    if (goodParagraphs.length > 0) {
      // Return first good paragraph
      return goodParagraphs[0];
    }

    // Fallback: return first 300 characters
    if (content.length > 300) {
      return content.substring(0, 297) + '...';
    }

    return content;
  }

  /**
   * Select appropriate emoji for task type
   *
   * @param result - Worker execution result
   * @returns Emoji character
   */
  private selectTaskEmoji(result: WorkerResult): string {
    if (!result.success) {
      return '❌';
    }

    if (!result.output) {
      return '✅';
    }

    const content = result.output.content.toLowerCase();
    const toolsUsed = result.output.toolsUsed;

    // File operations
    if (toolsUsed.some(t => ['Write', 'Edit', 'NotebookEdit'].includes(t))) {
      return '🔧';
    }

    // Analysis/investigation
    if (content.includes('analyz') || content.includes('investig') || content.includes('examin')) {
      return '🔍';
    }

    // Deployment
    if (content.includes('deploy') || content.includes('release')) {
      return '🚀';
    }

    // Testing
    if (content.includes('test') && toolsUsed.includes('Bash')) {
      return '🧪';
    }

    // Bug fix
    if (content.includes('fix') || content.includes('resolv')) {
      return '🐛';
    }

    // Documentation
    if (content.includes('document') || content.includes('readme')) {
      return '📚';
    }

    // Monitoring/health
    if (content.includes('health') || content.includes('monitor') || content.includes('status')) {
      return '📊';
    }

    // Default success
    return '✅';
  }

  /**
   * Infer tags from result content and tools used
   *
   * @param result - Worker execution result
   * @returns Array of tag strings
   */
  private inferTags(result: WorkerResult): string[] {
    const tags: string[] = [];

    if (!result.output) {
      return tags;
    }

    const content = result.output.content.toLowerCase();
    const toolsUsed = result.output.toolsUsed;

    // File operations
    if (toolsUsed.some(t => ['Write', 'Edit', 'NotebookEdit'].includes(t))) {
      tags.push('file-changes');
    }

    // Bug fix
    if (content.includes('bug') || content.includes('fix')) {
      tags.push('bug-fix');
    }

    // Refactoring
    if (content.includes('refactor') || content.includes('restructur')) {
      tags.push('refactoring');
    }

    // Testing
    if (content.includes('test')) {
      tags.push('testing');
    }

    // Analysis
    if (content.includes('analyz') || content.includes('investig')) {
      tags.push('analysis');
    }

    // Deployment
    if (content.includes('deploy') || content.includes('release')) {
      tags.push('deployment');
    }

    // Documentation
    if (content.includes('document') || content.includes('readme')) {
      tags.push('documentation');
    }

    // Performance
    if (content.includes('performance') || content.includes('optim')) {
      tags.push('performance');
    }

    // Security
    if (content.includes('security') || content.includes('vulnerab')) {
      tags.push('security');
    }

    return tags;
  }

  /**
   * Format list of files for display
   *
   * @param files - Array of file paths
   * @returns Formatted file list
   */
  private formatFilesList(files: string[]): string {
    if (files.length === 0) {
      return 'No files modified';
    }

    return files.map(file => `- ${file}`).join('\n');
  }

  /**
   * Extract metadata from worker result
   * Helper method for other components that need structured metadata
   *
   * @param result - Worker execution result
   * @returns Structured outcome metadata
   */
  extractMetadata(result: WorkerResult): OutcomeMetadata {
    const summary = this.generateSummary(result);
    const details = result.output ? this.extractDetails(result.output.content) : '';
    const filesModified = result.output
      ? this.extractFilesModified(result.output.content, result.output.toolsUsed)
      : [];
    const toolsUsed = result.output ? result.output.toolsUsed : [];
    const error = this.getErrorMessage(result);

    return {
      summary,
      details,
      filesModified,
      toolsUsed,
      duration: result.duration,
      tokensUsed: result.tokensUsed,
      success: result.success,
      error
    };
  }
}

/**
 * Default singleton instance for convenience
 */
export const outcomeFormatter = new OutcomeFormatter();
