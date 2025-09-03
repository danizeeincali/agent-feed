/**
 * Missing Features Implementation Contracts
 * 
 * SPARC-driven behavioral contracts for implementing missing Features 16 & 18
 */

export interface TerminalCommandHistory {
  commands: string[];
  currentIndex: number;
  maxHistory: number;
  
  // Behavioral contracts
  addCommand(command: string): void;
  getNextCommand(): string | null;
  getPreviousCommand(): string | null;
  clearHistory(): void;
  
  // Persistence contracts
  saveToStorage(): void;
  loadFromStorage(): void;
}

export interface CopyExportOutput {
  // Copy functionality contracts
  copyMessage(messageId: string): Promise<boolean>;
  copyAllOutput(): Promise<boolean>;
  copySelectedRange(startId: string, endId: string): Promise<boolean>;
  
  // Export functionality contracts  
  exportToText(scope: 'current' | 'all' | 'selected'): Promise<string>;
  exportToJSON(scope: 'current' | 'all' | 'selected'): Promise<object>;
  exportToMarkdown(scope: 'current' | 'all' | 'selected'): Promise<string>;
  
  // File download contracts
  downloadFile(content: string, filename: string, mimeType: string): void;
}

/**
 * SPARC Specification: Terminal Command History Implementation
 */
export class TerminalCommandHistoryImpl implements TerminalCommandHistory {
  commands: string[] = [];
  currentIndex: number = -1;
  maxHistory: number = 100;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
    this.loadFromStorage();
  }

  addCommand(command: string): void {
    if (!command.trim()) return;
    
    // Remove duplicate consecutive commands
    if (this.commands[this.commands.length - 1] === command) return;
    
    this.commands.push(command);
    
    // Maintain max history limit
    if (this.commands.length > this.maxHistory) {
      this.commands.shift();
    }
    
    // Reset index to end
    this.currentIndex = this.commands.length;
    this.saveToStorage();
  }

  getPreviousCommand(): string | null {
    if (this.commands.length === 0) return null;
    
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
    
    return this.commands[this.currentIndex] || null;
  }

  getNextCommand(): string | null {
    if (this.commands.length === 0) return null;
    
    if (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      return this.commands[this.currentIndex];
    } else {
      // Move past end to allow new input
      this.currentIndex = this.commands.length;
      return '';
    }
  }

  clearHistory(): void {
    this.commands = [];
    this.currentIndex = -1;
    this.saveToStorage();
  }

  saveToStorage(): void {
    try {
      localStorage.setItem('claude_terminal_history', JSON.stringify({
        commands: this.commands,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save command history to localStorage:', error);
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('claude_terminal_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.commands = parsed.commands || [];
        this.currentIndex = this.commands.length;
      }
    } catch (error) {
      console.warn('Failed to load command history from localStorage:', error);
    }
  }
}

/**
 * SPARC Architecture: Copy/Export Output Implementation
 */
export class CopyExportOutputImpl implements CopyExportOutput {
  private output: any[];
  private chatMessages: any[];

  constructor(output: any[], chatMessages: any[]) {
    this.output = output;
    this.chatMessages = chatMessages;
  }

  async copyMessage(messageId: string): Promise<boolean> {
    try {
      const message = this.findMessageById(messageId);
      if (!message) return false;
      
      await navigator.clipboard.writeText(message.content);
      return true;
    } catch (error) {
      console.error('Failed to copy message:', error);
      return false;
    }
  }

  async copyAllOutput(): Promise<boolean> {
    try {
      const content = this.formatAllOutputForClipboard();
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy all output:', error);
      return false;
    }
  }

  async copySelectedRange(startId: string, endId: string): Promise<boolean> {
    try {
      const content = this.formatRangeForClipboard(startId, endId);
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy selected range:', error);
      return false;
    }
  }

  async exportToText(scope: 'current' | 'all' | 'selected'): Promise<string> {
    switch (scope) {
      case 'current':
        return this.formatCurrentSessionAsText();
      case 'all':
        return this.formatAllOutputAsText();
      case 'selected':
        return this.formatSelectedAsText();
      default:
        throw new Error(`Invalid export scope: ${scope}`);
    }
  }

  async exportToJSON(scope: 'current' | 'all' | 'selected'): Promise<object> {
    const data = {
      exportedAt: new Date().toISOString(),
      scope,
      totalMessages: 0,
      messages: [] as any[]
    };

    switch (scope) {
      case 'current':
        data.messages = this.chatMessages;
        break;
      case 'all':
        data.messages = [...this.output, ...this.chatMessages];
        break;
      case 'selected':
        data.messages = this.getSelectedMessages();
        break;
    }

    data.totalMessages = data.messages.length;
    return data;
  }

  async exportToMarkdown(scope: 'current' | 'all' | 'selected'): Promise<string> {
    let markdown = `# Claude Session Export\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
    markdown += `**Scope:** ${scope}\n\n`;

    const messages = await this.getMessagesForScope(scope);
    
    for (const message of messages) {
      markdown += `## ${message.role || 'System'}\n\n`;
      markdown += `**Time:** ${message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Unknown'}\n\n`;
      markdown += `${message.content}\n\n`;
      
      if (message.images && message.images.length > 0) {
        markdown += `**Images:** ${message.images.length} attached\n\n`;
      }
      
      markdown += `---\n\n`;
    }

    return markdown;
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  // Private helper methods
  private findMessageById(id: string): any {
    return [...this.output, ...this.chatMessages].find(msg => msg.id === id);
  }

  private formatAllOutputForClipboard(): string {
    return [...this.output, ...this.chatMessages]
      .map(msg => `[${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}] ${msg.content}`)
      .join('\n');
  }

  private formatRangeForClipboard(startId: string, endId: string): string {
    const allMessages = [...this.output, ...this.chatMessages];
    const startIndex = allMessages.findIndex(msg => msg.id === startId);
    const endIndex = allMessages.findIndex(msg => msg.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return '';
    
    return allMessages
      .slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1)
      .map(msg => msg.content)
      .join('\n');
  }

  private formatCurrentSessionAsText(): string {
    return this.chatMessages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n\n');
  }

  private formatAllOutputAsText(): string {
    return [...this.output, ...this.chatMessages].map(msg =>
      `[${msg.type || msg.role}] ${msg.content}`
    ).join('\n\n');
  }

  private formatSelectedAsText(): string {
    // Placeholder - would need selection state
    return this.formatCurrentSessionAsText();
  }

  private getSelectedMessages(): any[] {
    // Placeholder - would need selection state
    return this.chatMessages;
  }

  private async getMessagesForScope(scope: string): Promise<any[]> {
    switch (scope) {
      case 'current':
        return this.chatMessages;
      case 'all':
        return [...this.output, ...this.chatMessages];
      case 'selected':
        return this.getSelectedMessages();
      default:
        return [];
    }
  }
}

/**
 * SPARC Integration: Behavioral Hooks for EnhancedSSEInterface
 */
export interface EnhancedSSEInterfaceExtensions {
  // Terminal history integration
  commandHistory: TerminalCommandHistory;
  
  // Copy/Export integration
  copyExport: CopyExportOutput;
  
  // Enhanced event handlers
  onArrowKeyNavigation: (direction: 'up' | 'down') => void;
  onCopyOutput: (messageId?: string) => Promise<void>;
  onExportSession: (format: 'txt' | 'json' | 'md') => Promise<void>;
}

/**
 * SPARC Completion: Integration Test Contracts
 */
export const integrationTestContracts = {
  terminalHistory: {
    arrowKeyNavigation: 'should_navigate_command_history',
    commandStorage: 'should_persist_commands_locally',
    duplicateHandling: 'should_avoid_consecutive_duplicates',
    maxHistoryLimit: 'should_enforce_100_command_limit'
  },
  
  copyExport: {
    clipboardIntegration: 'should_copy_to_system_clipboard',
    fileDownload: 'should_trigger_browser_download',
    formatSupport: 'should_export_txt_json_markdown',
    errorHandling: 'should_gracefully_handle_failures'
  },
  
  crossFeatureIntegration: {
    modeConsistency: 'should_maintain_functionality_across_view_modes',
    statePreservation: 'should_preserve_history_during_reconnection',
    performanceImpact: 'should_not_degrade_sse_streaming_performance'
  }
};