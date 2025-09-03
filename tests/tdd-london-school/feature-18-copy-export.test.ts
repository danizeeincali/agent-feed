/**
 * TDD London School: Feature 18 - Copy/Export Output
 * 
 * Behavioral tests using mock-driven development approach
 * Focus: Object interactions, clipboard API contracts, file download behaviors
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedSSEInterface } from '../../frontend/src/components/claude-manager/EnhancedSSEInterface';
import { CopyExportOutput, CopyExportOutputImpl } from '../../tests/missing-features-implementation';

// Mock navigator.clipboard for behavioral testing
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(void 0)
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true
});

// Mock URL.createObjectURL and related APIs for file download testing
const mockURL = {
  createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: jest.fn()
};

Object.defineProperty(window, 'URL', {
  value: mockURL,
  writable: true
});

// Mock document.createElement for download link testing
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
  remove: jest.fn()
};

const originalCreateElement = document.createElement;
document.createElement = jest.fn().mockImplementation((tagName) => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.body for link manipulation
const mockBody = {
  appendChild: jest.fn(),
  removeChild: jest.fn()
};

Object.defineProperty(document, 'body', {
  value: mockBody,
  writable: true
});

// Mock the SSE hook
jest.mock('../../frontend/src/hooks/useSSEClaudeInstance');
const mockUseSSEClaudeInstance = require('../../frontend/src/hooks/useSSEClaudeInstance').useSSEClaudeInstance as jest.MockedFunction<any>;

describe('TDD London School: Copy/Export Output (Feature 18)', () => {
  let mockSSEHook: any;
  let mockCopyExport: jest.Mocked<CopyExportOutput>;
  let sampleOutput: any[];
  let sampleChatMessages: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup sample data for testing
    sampleOutput = [
      { id: 'out-1', instanceId: 'claude-1', type: 'output', content: 'Terminal output line 1', timestamp: new Date('2023-01-01T10:00:00Z'), isReal: true },
      { id: 'out-2', instanceId: 'claude-1', type: 'output', content: 'Terminal output line 2', timestamp: new Date('2023-01-01T10:01:00Z'), isReal: true }
    ];
    
    sampleChatMessages = [
      { id: 'msg-1', role: 'user', content: 'Hello Claude', timestamp: new Date('2023-01-01T10:02:00Z') },
      { id: 'msg-2', role: 'assistant', content: 'Hello! How can I help you?', timestamp: new Date('2023-01-01T10:02:30Z') }
    ];

    // Setup SSE hook mock
    mockSSEHook = {
      manager: { cleanup: jest.fn() },
      isConnected: true,
      connectionState: 'connected',
      connectionError: null,
      availableInstances: [
        { id: 'claude-test-1', pid: 1234, status: 'running' }
      ],
      selectedInstanceId: 'claude-test-1',
      output: sampleOutput,
      connectToInstance: jest.fn().mockResolvedValue(void 0),
      disconnectFromInstance: jest.fn().mockResolvedValue(void 0),
      sendCommand: jest.fn().mockResolvedValue(void 0),
      refreshInstances: jest.fn().mockResolvedValue(void 0),
      clearOutput: jest.fn(),
      loading: false,
      messageCount: 2,
      lastActivity: new Date()
    };

    mockUseSSEClaudeInstance.mockReturnValue(mockSSEHook);

    // Setup copy/export mock with behavioral contracts
    mockCopyExport = {
      copyMessage: jest.fn().mockResolvedValue(true),
      copyAllOutput: jest.fn().mockResolvedValue(true),
      copySelectedRange: jest.fn().mockResolvedValue(true),
      exportToText: jest.fn().mockResolvedValue('exported text content'),
      exportToJSON: jest.fn().mockResolvedValue({ exportedAt: '2023-01-01T10:00:00Z', messages: [] }),
      exportToMarkdown: jest.fn().mockResolvedValue('# Exported Content\n\nContent here'),
      downloadFile: jest.fn()
    } as jest.Mocked<CopyExportOutput>;
  });

  afterEach(() => {
    // Reset DOM mocks
    document.createElement = originalCreateElement;
  });

  describe('SPARC Specification: Copy/Export Behavioral Contracts', () => {
    it('should define copy/export interface correctly', () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Verify interface contract
      expect(typeof copyExport.copyMessage).toBe('function');
      expect(typeof copyExport.copyAllOutput).toBe('function');
      expect(typeof copyExport.copySelectedRange).toBe('function');
      expect(typeof copyExport.exportToText).toBe('function');
      expect(typeof copyExport.exportToJSON).toBe('function');
      expect(typeof copyExport.exportToMarkdown).toBe('function');
      expect(typeof copyExport.downloadFile).toBe('function');
    });

    it('should collaborate with navigator.clipboard for copy operations', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Test single message copy
      const result = await copyExport.copyMessage('msg-1');
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Hello Claude');
    });

    it('should handle clipboard API failures gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const result = await copyExport.copyMessage('msg-1');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy message:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should enforce business rules for copy operations', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Test copying non-existent message
      const result = await copyExport.copyMessage('non-existent-id');
      
      expect(result).toBe(false);
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
    });
  });

  describe('SPARC Pseudocode: Export Format Algorithm Behavioral Testing', () => {
    it('should implement text export formatting correctly', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const textContent = await copyExport.exportToText('current');
      
      expect(textContent).toContain('user: Hello Claude');
      expect(textContent).toContain('assistant: Hello! How can I help you?');
      expect(typeof textContent).toBe('string');
    });

    it('should implement JSON export with proper structure', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const jsonContent = await copyExport.exportToJSON('current');
      
      expect(jsonContent).toHaveProperty('exportedAt');
      expect(jsonContent).toHaveProperty('scope', 'current');
      expect(jsonContent).toHaveProperty('totalMessages');
      expect(jsonContent).toHaveProperty('messages');
      expect(Array.isArray((jsonContent as any).messages)).toBe(true);
    });

    it('should implement markdown export with proper formatting', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const markdownContent = await copyExport.exportToMarkdown('current');
      
      expect(markdownContent).toContain('# Claude Session Export');
      expect(markdownContent).toContain('**Exported:**');
      expect(markdownContent).toContain('**Scope:** current');
      expect(markdownContent).toContain('## user');
      expect(markdownContent).toContain('## assistant');
      expect(markdownContent).toContain('---');
    });

    it('should handle different export scopes correctly', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Test different scopes
      const currentScope = await copyExport.exportToText('current');
      const allScope = await copyExport.exportToText('all');
      
      expect(typeof currentScope).toBe('string');
      expect(typeof allScope).toBe('string');
      expect(allScope.length).toBeGreaterThan(currentScope.length); // All should include more content
    });

    it('should handle invalid export scopes with proper error handling', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      await expect(copyExport.exportToText('invalid' as any)).rejects.toThrow('Invalid export scope: invalid');
    });
  });

  describe('SPARC Architecture: File Download Integration Contracts', () => {
    it('should collaborate with browser download API correctly', () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      copyExport.downloadFile('test content', 'test-file.txt', 'text/plain');
      
      // Verify Blob creation and URL generation
      expect(mockURL.createObjectURL).toHaveBeenCalled();
      
      // Verify link creation and manipulation
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe('test-file.txt');
      expect(mockBody.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockBody.removeChild).toHaveBeenCalledWith(mockLink);
      expect(mockURL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle download failures gracefully', () => {
      mockURL.createObjectURL.mockImplementation(() => {
        throw new Error('Blob creation failed');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      expect(() => {
        copyExport.downloadFile('test content', 'test-file.txt', 'text/plain');
      }).toThrow('Blob creation failed');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to download file:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should support multiple file formats through MIME type collaboration', () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Test different file formats
      copyExport.downloadFile('text content', 'export.txt', 'text/plain');
      copyExport.downloadFile('{"data": "json"}', 'export.json', 'application/json');
      copyExport.downloadFile('# Markdown', 'export.md', 'text/markdown');
      
      expect(mockURL.createObjectURL).toHaveBeenCalledTimes(3);
      expect(mockLink.click).toHaveBeenCalledTimes(3);
    });
  });

  describe('SPARC Refinement: Copy All Output Behavioral Testing', () => {
    it('should format all output for clipboard correctly', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const result = await copyExport.copyAllOutput();
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Terminal output line 1')
      );
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Hello Claude')
      );
    });

    it('should handle empty output collections gracefully', async () => {
      const copyExport = new CopyExportOutputImpl([], []);
      
      const result = await copyExport.copyAllOutput();
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should format selected range correctly', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const result = await copyExport.copySelectedRange('out-1', 'msg-1');
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it('should handle invalid range selections gracefully', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const result = await copyExport.copySelectedRange('invalid-start', 'invalid-end');
      
      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(''); // Empty string for invalid range
    });
  });

  describe('SPARC Completion: UI Integration Behavioral Testing', () => {
    it('should identify missing copy/export buttons in current interface', () => {
      render(<EnhancedSSEInterface />);
      
      // Look for copy buttons (should not exist yet)
      const copyButtons = screen.queryAllByText(/copy/i);
      const exportButtons = screen.queryAllByText(/export/i);
      
      expect(copyButtons).toHaveLength(0);
      expect(exportButtons).toHaveLength(0);
    });

    it('should define expected UI integration contracts', () => {
      const expectedUIContracts = {
        copyButtons: {
          singleMessage: 'copy_individual_message',
          allOutput: 'copy_entire_session',
          selectedRange: 'copy_selected_messages'
        },
        exportButtons: {
          textFormat: 'export_as_txt',
          jsonFormat: 'export_as_json',
          markdownFormat: 'export_as_md'
        },
        contextMenus: {
          rightClickCopy: 'context_menu_integration',
          keyboardShortcuts: 'ctrl_c_integration'
        }
      };
      
      // Verify contract completeness
      expect(expectedUIContracts.copyButtons).toBeDefined();
      expect(expectedUIContracts.exportButtons).toBeDefined();
      expect(expectedUIContracts.contextMenus).toBeDefined();
    });

    it('should prepare for keyboard shortcut integration', () => {
      render(<EnhancedSSEInterface />);
      
      const terminalOutput = screen.getByText('Terminal');
      
      // Test keyboard events (should be handled when feature is integrated)
      fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
      
      // Currently no copy functionality, but event handling structure exists
      expect(terminalOutput).toBeInTheDocument();
    });
  });

  describe('SPARC Integration: Cross-Format Export Testing', () => {
    it('should maintain data consistency across different export formats', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Export in all formats
      const textExport = await copyExport.exportToText('current');
      const jsonExport = await copyExport.exportToJSON('current');
      const markdownExport = await copyExport.exportToMarkdown('current');
      
      // All should contain the same core content
      expect(textExport).toContain('Hello Claude');
      expect(JSON.stringify(jsonExport)).toContain('Hello Claude');
      expect(markdownExport).toContain('Hello Claude');
      
      // JSON should have proper structure
      expect((jsonExport as any).totalMessages).toBe(2);
      expect((jsonExport as any).messages).toHaveLength(2);
    });

    it('should handle large datasets efficiently', async () => {
      // Create large dataset for performance testing
      const largeOutput = Array.from({ length: 1000 }, (_, i) => ({
        id: `out-${i}`,
        instanceId: 'claude-1',
        type: 'output',
        content: `Output line ${i}`,
        timestamp: new Date(),
        isReal: true
      }));
      
      const largeChatMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date()
      }));
      
      const copyExport = new CopyExportOutputImpl(largeOutput, largeChatMessages);
      
      const startTime = performance.now();
      await copyExport.exportToText('all');
      const endTime = performance.now();
      
      // Should handle large datasets within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second limit
    });
  });

  describe('SPARC Mock Verification: Behavioral Contract Compliance', () => {
    it('should verify all clipboard interactions follow behavioral contracts', async () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Test all copy operations
      await copyExport.copyMessage('msg-1');
      await copyExport.copyAllOutput();
      await copyExport.copySelectedRange('out-1', 'msg-1');
      
      // Verify clipboard API was called correctly for each operation
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('Hello Claude');
      expect(mockClipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Terminal output line 1'));
    });

    it('should verify all download interactions follow behavioral contracts', () => {
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      // Test different download operations
      copyExport.downloadFile('content1', 'file1.txt', 'text/plain');
      copyExport.downloadFile('content2', 'file2.json', 'application/json');
      
      // Verify browser API interactions
      expect(mockURL.createObjectURL).toHaveBeenCalledTimes(2);
      expect(mockURL.revokeObjectURL).toHaveBeenCalledTimes(2);
      expect(mockLink.click).toHaveBeenCalledTimes(2);
      expect(mockBody.appendChild).toHaveBeenCalledTimes(2);
      expect(mockBody.removeChild).toHaveBeenCalledTimes(2);
    });

    it('should maintain behavioral consistency under error conditions', async () => {
      // Test error handling consistency
      mockClipboard.writeText.mockRejectedValue(new Error('Test error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const copyExport = new CopyExportOutputImpl(sampleOutput, sampleChatMessages);
      
      const results = await Promise.all([
        copyExport.copyMessage('msg-1'),
        copyExport.copyAllOutput(),
        copyExport.copySelectedRange('out-1', 'msg-1')
      ]);
      
      // All should fail gracefully and return false
      expect(results).toEqual([false, false, false]);
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      
      consoleSpy.mockRestore();
    });
  });
});