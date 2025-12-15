/**
 * TDD London School: Copy/Export Output Hook
 * 
 * Following behavioral contracts from tests
 */

import { useCallback } from 'react';

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

export const useCopyExportOutput = (output: any[], chatMessages: any[]) => {
  const copyExport = new CopyExportOutputImpl(output, chatMessages);

  const copyMessage = useCallback(async (messageId: string): Promise<boolean> => {
    return await copyExport.copyMessage(messageId);
  }, [copyExport]);

  const copyAllOutput = useCallback(async (): Promise<boolean> => {
    return await copyExport.copyAllOutput();
  }, [copyExport]);

  const copySelectedRange = useCallback(async (startId: string, endId: string): Promise<boolean> => {
    return await copyExport.copySelectedRange(startId, endId);
  }, [copyExport]);

  const exportSession = useCallback(async (format: 'txt' | 'json' | 'md', scope: 'current' | 'all' | 'selected' = 'current') => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      
      switch (format) {
        case 'txt':
          content = await copyExport.exportToText(scope);
          filename = `claude-session-${timestamp}.txt`;
          mimeType = 'text/plain';
          break;
        case 'json':
          content = JSON.stringify(await copyExport.exportToJSON(scope), null, 2);
          filename = `claude-session-${timestamp}.json`;
          mimeType = 'application/json';
          break;
        case 'md':
          content = await copyExport.exportToMarkdown(scope);
          filename = `claude-session-${timestamp}.md`;
          mimeType = 'text/markdown';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      copyExport.downloadFile(content, filename, mimeType);
      return true;
    } catch (error) {
      console.error('Failed to export session:', error);
      return false;
    }
  }, [copyExport]);

  return {
    copyMessage,
    copyAllOutput,
    copySelectedRange,
    exportSession,
    copyExport
  };
};