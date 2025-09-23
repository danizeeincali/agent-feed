/**
 * Message Processing Service
 * Handles message type filtering, content extraction, and UI-specific processing
 */

import { QueuedMessage } from './MessageQueue';

export interface ProcessedMessage {
  id: string;
  type: 'chat' | 'terminal' | 'tool_usage' | 'system';
  subtype?: string;
  content: string;
  timestamp: number;
  instanceId: string;
  metadata?: Record<string, any>;
  displayType: 'chat-user' | 'chat-assistant' | 'terminal-output' | 'tool-call' | 'system-info';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface MessageFilter {
  instanceId?: string;
  types?: Array<'chat' | 'terminal' | 'tool_usage' | 'system'>;
  subtypes?: string[];
  displayTypes?: Array<'chat-user' | 'chat-assistant' | 'terminal-output' | 'tool-call' | 'system-info'>;
  minTimestamp?: number;
  maxTimestamp?: number;
}

export class MessageProcessor {
  private chatMessages = new Map<string, ProcessedMessage[]>(); // instanceId -> messages
  private terminalMessages = new Map<string, ProcessedMessage[]>(); // instanceId -> messages
  private toolUsageMessages = new Map<string, ProcessedMessage[]>(); // instanceId -> messages
  private systemMessages = new Map<string, ProcessedMessage[]>(); // instanceId -> messages
  
  private readonly maxMessagesPerType = 1000;
  private readonly chatResponsePatterns = [
    /^\s*[A-Z][^\n]{20,}/m, // Starts with capital, at least 20 chars
    /I'll|I can|Let me|Here's|Based on/i, // Common AI response starters
    /assistant|claude|ai response/i, // Explicit AI indicators
  ];
  
  private readonly toolUsagePatterns = [
    /\[Tool:|Tool\s+call:|Using\s+tool/i,
    /^\s*<function_calls>/m,
    /^\s*\{\s*"name":/m, // JSON tool calls
    /Running\s+command|Executing|Processing/i
  ];

  private readonly systemPatterns = [
    /^\s*[DEBUG|INFO|WARN|ERROR]:/i,
    /Connection|WebSocket|Socket\.IO/i,
    /Starting|Stopping|Connecting/i,
    /^\s*\[\d{4}-\d{2}-\d{2}/m // Timestamp patterns
  ];

  /**
   * Process a raw message into typed, filtered messages
   */
  processMessage(rawMessage: QueuedMessage): ProcessedMessage[] {
    const processed: ProcessedMessage[] = [];
    
    try {
      // Handle different input types
      let content: string;
      if (typeof rawMessage.content === 'string') {
        content = rawMessage.content;
      } else if (rawMessage.content && typeof rawMessage.content === 'object') {
        content = JSON.stringify(rawMessage.content, null, 2);
      } else {
        content = String(rawMessage.content || '');
      }

      // Skip empty messages
      if (!content.trim()) {
        return processed;
      }

      // Split content into logical sections if it's multi-line terminal output
      const sections = this.splitIntoSections(content, rawMessage.type);
      
      for (const section of sections) {
        const processedMessage = this.processSection(
          section,
          rawMessage.id + '-' + processed.length,
          rawMessage
        );
        
        if (processedMessage) {
          processed.push(processedMessage);
        }
      }

    } catch (error) {
      console.error('[MessageProcessor] Error processing message:', error);
      // Create an error message
      processed.push({
        id: rawMessage.id + '-error',
        type: 'system',
        content: `Error processing message: ${error}`,
        timestamp: rawMessage.timestamp,
        instanceId: rawMessage.instanceId,
        displayType: 'system-info',
        priority: 'high'
      });
    }

    // Store messages by type and instance
    this.storeProcessedMessages(processed);
    
    return processed;
  }

  /**
   * Split content into logical sections
   */
  private splitIntoSections(content: string, messageType: string): string[] {
    if (messageType === 'terminal') {
      // Split terminal output by logical boundaries
      const lines = content.split('\n');
      const sections: string[] = [];
      let currentSection: string[] = [];
      
      for (const line of lines) {
        // Check for section boundaries (tool calls, AI responses, etc.)
        if (this.isSectionBoundary(line) && currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
        }
        currentSection.push(line);
      }
      
      if (currentSection.length > 0) {
        sections.push(currentSection.join('\n'));
      }
      
      return sections.filter(s => s.trim());
    }
    
    return [content];
  }

  /**
   * Check if a line represents a section boundary
   */
  private isSectionBoundary(line: string): boolean {
    const trimmed = line.trim();
    return (
      this.toolUsagePatterns.some(pattern => pattern.test(trimmed)) ||
      this.chatResponsePatterns.some(pattern => pattern.test(trimmed)) ||
      trimmed.startsWith('<function_calls>') ||
      trimmed.startsWith('```') ||
      (trimmed.length > 0 && trimmed.length < 10 && /^[#$>]/.test(trimmed))
    );
  }

  /**
   * Process individual section
   */
  private processSection(content: string, messageId: string, originalMessage: QueuedMessage): ProcessedMessage | null {
    const trimmed = content.trim();
    if (!trimmed) return null;

    // Determine message type and display type
    const { type, displayType } = this.classifyMessage(trimmed, originalMessage.type);
    
    return {
      id: messageId,
      type,
      subtype: originalMessage.subtype,
      content: trimmed,
      timestamp: originalMessage.timestamp,
      instanceId: originalMessage.instanceId,
      metadata: originalMessage.metadata,
      displayType,
      priority: this.determinePriority(type, displayType, trimmed)
    };
  }

  /**
   * Classify message type and display type
   */
  private classifyMessage(
    content: string, 
    originalType: string
  ): { type: 'chat' | 'terminal' | 'tool_usage' | 'system', displayType: ProcessedMessage['displayType'] } {
    // Check for tool usage first (highest specificity)
    if (this.toolUsagePatterns.some(pattern => pattern.test(content))) {
      return { type: 'tool_usage', displayType: 'tool-call' };
    }

    // Check for system messages
    if (this.systemPatterns.some(pattern => pattern.test(content))) {
      return { type: 'system', displayType: 'system-info' };
    }

    // Check for chat responses (AI responses)
    if (this.chatResponsePatterns.some(pattern => pattern.test(content))) {
      return { type: 'chat', displayType: 'chat-assistant' };
    }

    // Check for user input indicators
    if (/^\s*>\s+/.test(content) || content.includes('User:') || content.includes('Human:')) {
      return { type: 'chat', displayType: 'chat-user' };
    }

    // Default to terminal output
    return { type: 'terminal', displayType: 'terminal-output' };
  }

  /**
   * Determine message priority based on content
   */
  private determinePriority(
    type: ProcessedMessage['type'],
    displayType: ProcessedMessage['displayType'],
    content: string
  ): ProcessedMessage['priority'] {
    // Urgent: Errors and critical system messages
    if (/error|critical|failed|exception/i.test(content)) {
      return 'urgent';
    }

    // High: AI responses, tool calls, warnings
    if (displayType === 'chat-assistant' || displayType === 'tool-call' || /warn/i.test(content)) {
      return 'high';
    }

    // Normal: User messages, important terminal output
    if (displayType === 'chat-user' || content.length > 50) {
      return 'normal';
    }

    // Low: Debug info, short terminal output
    return 'low';
  }

  /**
   * Store processed messages by type and instance
   */
  private storeProcessedMessages(messages: ProcessedMessage[]) {
    for (const message of messages) {
      const { instanceId, type } = message;
      
      let storage: Map<string, ProcessedMessage[]>;
      switch (type) {
        case 'chat':
          storage = this.chatMessages;
          break;
        case 'terminal':
          storage = this.terminalMessages;
          break;
        case 'tool_usage':
          storage = this.toolUsageMessages;
          break;
        case 'system':
          storage = this.systemMessages;
          break;
        default:
          storage = this.terminalMessages; // fallback
      }

      if (!storage.has(instanceId)) {
        storage.set(instanceId, []);
      }

      const instanceMessages = storage.get(instanceId)!;
      instanceMessages.push(message);

      // Maintain size limits
      if (instanceMessages.length > this.maxMessagesPerType) {
        instanceMessages.splice(0, instanceMessages.length - this.maxMessagesPerType);
      }

      // Keep messages sorted by timestamp
      instanceMessages.sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  /**
   * Get messages for chat view (only chat messages)
   */
  getChatMessages(instanceId: string, filter?: MessageFilter): ProcessedMessage[] {
    const messages = this.chatMessages.get(instanceId) || [];
    return this.applyFilter(messages, filter);
  }

  /**
   * Get messages for terminal view (all types)
   */
  getTerminalMessages(instanceId: string, filter?: MessageFilter): ProcessedMessage[] {
    const allMessages: ProcessedMessage[] = [
      ...(this.chatMessages.get(instanceId) || []),
      ...(this.terminalMessages.get(instanceId) || []),
      ...(this.toolUsageMessages.get(instanceId) || []),
      ...(this.systemMessages.get(instanceId) || [])
    ];
    
    // Sort by timestamp
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    return this.applyFilter(allMessages, filter);
  }

  /**
   * Get tool usage messages only
   */
  getToolUsageMessages(instanceId: string, filter?: MessageFilter): ProcessedMessage[] {
    const messages = this.toolUsageMessages.get(instanceId) || [];
    return this.applyFilter(messages, filter);
  }

  /**
   * Get system messages only
   */
  getSystemMessages(instanceId: string, filter?: MessageFilter): ProcessedMessage[] {
    const messages = this.systemMessages.get(instanceId) || [];
    return this.applyFilter(messages, filter);
  }

  /**
   * Apply filter to messages
   */
  private applyFilter(messages: ProcessedMessage[], filter?: MessageFilter): ProcessedMessage[] {
    if (!filter) return messages;

    return messages.filter(message => {
      if (filter.types && !filter.types.includes(message.type)) return false;
      if (filter.subtypes && message.subtype && !filter.subtypes.includes(message.subtype)) return false;
      if (filter.displayTypes && !filter.displayTypes.includes(message.displayType)) return false;
      if (filter.minTimestamp && message.timestamp < filter.minTimestamp) return false;
      if (filter.maxTimestamp && message.timestamp > filter.maxTimestamp) return false;
      return true;
    });
  }

  /**
   * Clear messages for an instance
   */
  clearInstance(instanceId: string) {
    this.chatMessages.delete(instanceId);
    this.terminalMessages.delete(instanceId);
    this.toolUsageMessages.delete(instanceId);
    this.systemMessages.delete(instanceId);
    console.log(`[MessageProcessor] Cleared messages for instance: ${instanceId}`);
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const getTotalMessages = (storage: Map<string, ProcessedMessage[]>) => {
      return Array.from(storage.values()).reduce((total, msgs) => total + msgs.length, 0);
    };

    return {
      chatMessages: getTotalMessages(this.chatMessages),
      terminalMessages: getTotalMessages(this.terminalMessages),
      toolUsageMessages: getTotalMessages(this.toolUsageMessages),
      systemMessages: getTotalMessages(this.systemMessages),
      instances: new Set([
        ...this.chatMessages.keys(),
        ...this.terminalMessages.keys(),
        ...this.toolUsageMessages.keys(),
        ...this.systemMessages.keys()
      ]).size
    };
  }

  /**
   * Destroy processor and cleanup
   */
  destroy() {
    this.chatMessages.clear();
    this.terminalMessages.clear();
    this.toolUsageMessages.clear();
    this.systemMessages.clear();
    console.log('[MessageProcessor] Destroyed and cleaned up');
  }
}

// Singleton instance for global use
let globalMessageProcessor: MessageProcessor | null = null;

export const getGlobalMessageProcessor = (): MessageProcessor => {
  if (!globalMessageProcessor) {
    globalMessageProcessor = new MessageProcessor();
  }
  return globalMessageProcessor;
};

export const destroyGlobalMessageProcessor = () => {
  if (globalMessageProcessor) {
    globalMessageProcessor.destroy();
    globalMessageProcessor = null;
  }
};
