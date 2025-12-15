/**
 * TaskTypeDetector - Determines task type from post content
 * Phase 2: File Operation Support
 */

export type TaskType = 'file_operation' | 'command' | 'api_call' | 'rss_feed';

export interface TaskDetectionResult {
  type: TaskType;
  confidence: number;
  params?: Record<string, any>;
}

/**
 * Detects task type from post content using pattern matching
 */
export class TaskTypeDetector {
  private static readonly FILE_PATTERNS = [
    /create\s+(?:a\s+)?file\s+(?:called\s+)?["']?([^"'\s]+)["']?/i,
    /write\s+(?:to\s+)?(?:a\s+)?file\s+["']?([^"'\s]+)["']?/i,
    /file:\/\/create\s+(.+)/i,
    /file:\/\/write\s+(.+)/i,
    /make\s+(?:a\s+)?file\s+["']?([^"'\s]+)["']?/i,
  ];

  private static readonly FILE_URI_PREFIX = 'file://';
  private static readonly COMMAND_URI_PREFIX = 'cmd://';
  private static readonly API_URI_PREFIX = 'api://';

  /**
   * Detect task type from post content
   */
  detect(content: string, metadata?: Record<string, any>): TaskDetectionResult {
    // Priority 1: Explicit metadata
    if (metadata?.task_type) {
      return {
        type: metadata.task_type as TaskType,
        confidence: 1.0,
        params: metadata.params || {},
      };
    }

    // Priority 2: URI-style prefixes
    const uriResult = this.detectByURI(content);
    if (uriResult) {
      return uriResult;
    }

    // Priority 3: Pattern matching
    const patternResult = this.detectByPattern(content);
    if (patternResult) {
      return patternResult;
    }

    // Default: RSS feed mode (backward compatible)
    return {
      type: 'rss_feed',
      confidence: 0.5,
    };
  }

  /**
   * Detect task by URI prefix
   */
  private detectByURI(content: string): TaskDetectionResult | null {
    const trimmed = content.trim();

    if (trimmed.startsWith(TaskTypeDetector.FILE_URI_PREFIX)) {
      const command = trimmed.substring(TaskTypeDetector.FILE_URI_PREFIX.length).trim();
      return {
        type: 'file_operation',
        confidence: 0.95,
        params: this.parseFileCommand(command),
      };
    }

    if (trimmed.startsWith(TaskTypeDetector.COMMAND_URI_PREFIX)) {
      return {
        type: 'command',
        confidence: 0.95,
        params: { command: trimmed.substring(TaskTypeDetector.COMMAND_URI_PREFIX.length).trim() },
      };
    }

    if (trimmed.startsWith(TaskTypeDetector.API_URI_PREFIX)) {
      return {
        type: 'api_call',
        confidence: 0.95,
        params: { url: trimmed.substring(TaskTypeDetector.API_URI_PREFIX.length).trim() },
      };
    }

    return null;
  }

  /**
   * Detect task by content pattern
   */
  private detectByPattern(content: string): TaskDetectionResult | null {
    // Check file operation patterns
    for (const pattern of TaskTypeDetector.FILE_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        return {
          type: 'file_operation',
          confidence: 0.85,
          params: this.extractFileParams(content, match),
        };
      }
    }

    return null;
  }

  /**
   * Parse file:// command syntax
   * Examples:
   *   file://create /path/to/file.txt
   *   file://write /path/to/file.txt content here
   */
  private parseFileCommand(command: string): Record<string, any> {
    const parts = command.split(/\s+/);
    const operation = parts[0]?.toLowerCase();
    const path = parts[1];

    if (operation === 'create' || operation === 'write') {
      const content = parts.slice(2).join(' ');
      return { operation, path, content };
    }

    if (operation === 'read' || operation === 'delete') {
      return { operation, path };
    }

    return { operation: 'create', path: parts[0], content: parts.slice(1).join(' ') };
  }

  /**
   * Extract file operation parameters from natural language
   */
  private extractFileParams(content: string, match: RegExpMatchArray): Record<string, any> {
    const filename = match[1];

    // Extract file path - look for "in directory" or direct path
    let path = filename;
    const inMatch = content.match(/in\s+["']?([^"'\s]+)["']?/i);
    if (inMatch) {
      path = `${inMatch[1]}/${filename}`;
    }

    // Extract content - look for "with text", "with content", "containing"
    let fileContent = '';
    const contentMatch = content.match(/with\s+(?:text|content):\s*["']?([^"']+)["']?/i) ||
                        content.match(/containing:\s*["']?([^"']+)["']?/i) ||
                        content.match(/with\s+the\s+text:\s*["']?([^"']+)["']?/i);
    if (contentMatch) {
      fileContent = contentMatch[1].trim();
    }

    return {
      operation: 'create',
      path,
      content: fileContent,
    };
  }

  /**
   * Get confidence threshold for task type
   */
  isConfident(result: TaskDetectionResult, threshold: number = 0.7): boolean {
    return result.confidence >= threshold;
  }
}
