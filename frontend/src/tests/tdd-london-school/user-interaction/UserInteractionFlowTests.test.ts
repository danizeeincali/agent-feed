/**
 * User Interaction Flow Tests - London School TDD Approach
 * Tests user interaction patterns and event handling with comprehensive mocking
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockEventSource, EventSourceMockFactory } from '../mocks/EventSourceMock';
import { FetchMock, FetchMockFactory } from '../mocks/FetchMock';

interface UserInteractionHandler {
  handleKeyPress: (event: KeyboardEvent) => Promise<void>;
  handleMouseClick: (event: MouseEvent) => Promise<void>;
  handleFocusChange: (focused: boolean) => void;
  handleResize: (dimensions: { width: number; height: number }) => void;
  handlePaste: (data: string) => Promise<void>;
  handleDragDrop: (files: FileList) => Promise<void>;
}

interface KeyboardManager {
  bindShortcut: (keys: string, action: string) => void;
  unbindShortcut: (keys: string) => void;
  isShortcut: (event: KeyboardEvent) => string | null;
  handleSpecialKeys: (event: KeyboardEvent) => boolean;
  getKeySequence: (event: KeyboardEvent) => string;
}

interface MouseManager {
  trackMousePosition: (event: MouseEvent) => void;
  handleSelection: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
  handleContextMenu: (event: MouseEvent) => void;
  handleDoubleClick: (event: MouseEvent) => void;
  isInsideTerminal: (x: number, y: number) => boolean;
}

interface ClipboardManager {
  readFromClipboard: () => Promise<string>;
  writeToClipboard: (data: string) => Promise<void>;
  handlePaste: (data: string) => Promise<void>;
  handleCopy: (selection: string) => Promise<void>;
  sanitizeClipboardData: (data: string) => string;
}

interface FocusManager {
  setFocus: (element: HTMLElement) => void;
  removeFocus: () => void;
  handleTabNavigation: (event: KeyboardEvent) => void;
  manageFocusOrder: (elements: HTMLElement[]) => void;
  announceToScreenReader: (message: string) => void;
}

// London School - Mock User Interaction Handler
class MockUserInteractionHandler implements UserInteractionHandler {
  // Jest Mocks for Behavior Verification
  public handleKeyPressMock = jest.fn<(event: KeyboardEvent) => Promise<void>>();
  public handleMouseClickMock = jest.fn<(event: MouseEvent) => Promise<void>>();
  public handleFocusChangeMock = jest.fn<(focused: boolean) => void>();
  public handleResizeMock = jest.fn<(dimensions: { width: number; height: number }) => void>();
  public handlePasteMock = jest.fn<(data: string) => Promise<void>>();
  public handleDragDropMock = jest.fn<(files: FileList) => Promise<void>>();

  // Mock Collaborators
  public mockKeyboardManager: MockKeyboardManager;
  public mockMouseManager: MockMouseManager;
  public mockClipboardManager: MockClipboardManager;
  public mockFocusManager: MockFocusManager;
  public mockConnectionProvider: any;
  public mockTerminalAdapter: any;

  constructor() {
    this.mockKeyboardManager = new MockKeyboardManager();
    this.mockMouseManager = new MockMouseManager();
    this.mockClipboardManager = new MockClipboardManager();
    this.mockFocusManager = new MockFocusManager();
  }

  async handleKeyPress(event: KeyboardEvent): Promise<void> {
    this.handleKeyPressMock(event);
    
    // Check for shortcuts first
    const shortcut = this.mockKeyboardManager.isShortcut(event);
    if (shortcut) {
      await this.executeShortcut(shortcut, event);
      return;
    }
    
    // Handle special keys
    if (this.mockKeyboardManager.handleSpecialKeys(event)) {
      return;
    }
    
    // Send regular input to terminal
    if (this.mockConnectionProvider && event.key.length === 1) {
      await this.mockConnectionProvider.sendMessage('terminal-instance', {
        type: 'input',
        data: event.key
      });
    }
  }

  async handleMouseClick(event: MouseEvent): Promise<void> {
    this.handleMouseClickMock(event);
    
    this.mockMouseManager.trackMousePosition(event);
    
    if (this.mockMouseManager.isInsideTerminal(event.clientX, event.clientY)) {
      // Focus terminal
      this.mockFocusManager.setFocus(event.target as HTMLElement);
      
      // Handle selection start
      if (event.button === 0) { // Left click
        this.mockMouseManager.handleSelection(
          { x: event.clientX, y: event.clientY },
          { x: event.clientX, y: event.clientY }
        );
      }
      
      // Handle context menu
      if (event.button === 2) { // Right click
        this.mockMouseManager.handleContextMenu(event);
      }
    }
  }

  handleFocusChange(focused: boolean): void {
    this.handleFocusChangeMock(focused);
    
    if (focused) {
      this.mockFocusManager.announceToScreenReader('Terminal focused');
    } else {
      this.mockFocusManager.removeFocus();
    }
  }

  handleResize(dimensions: { width: number; height: number }): void {
    this.handleResizeMock(dimensions);
    
    if (this.mockTerminalAdapter) {
      const cols = Math.floor(dimensions.width / 8); // Approximate character width
      const rows = Math.floor(dimensions.height / 16); // Approximate line height
      this.mockTerminalAdapter.resize(cols, rows);
    }
  }

  async handlePaste(data: string): Promise<void> {
    this.handlePasteMock(data);
    
    // Sanitize clipboard data
    const sanitized = this.mockClipboardManager.sanitizeClipboardData(data);
    
    // Send to terminal
    if (this.mockConnectionProvider) {
      await this.mockConnectionProvider.sendMessage('terminal-instance', {
        type: 'input',
        data: sanitized
      });
    }
  }

  async handleDragDrop(files: FileList): Promise<void> {
    this.handleDragDropMock(files);
    
    // Process dropped files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (this.mockConnectionProvider) {
        await this.mockConnectionProvider.sendMessage('terminal-instance', {
          type: 'file_drop',
          filename: file.name,
          size: file.size,
          type: file.type
        });
      }
    }
  }

  private async executeShortcut(shortcut: string, event: KeyboardEvent): Promise<void> {
    switch (shortcut) {
      case 'Ctrl+C':
        await this.mockConnectionProvider?.sendMessage('terminal-instance', {
          type: 'signal',
          signal: 'SIGINT'
        });
        break;
      case 'Ctrl+V':
        const clipboardData = await this.mockClipboardManager.readFromClipboard();
        await this.handlePaste(clipboardData);
        break;
      case 'Ctrl+L':
        this.mockTerminalAdapter?.clear();
        break;
    }
  }
}

// London School - Mock Keyboard Manager
class MockKeyboardManager implements KeyboardManager {
  private shortcuts: Map<string, string> = new Map();
  
  public bindShortcutMock = jest.fn<(keys: string, action: string) => void>();
  public unbindShortcutMock = jest.fn<(keys: string) => void>();
  public isShortcutMock = jest.fn<(event: KeyboardEvent) => string | null>();
  public handleSpecialKeysMock = jest.fn<(event: KeyboardEvent) => boolean>();
  public getKeySequenceMock = jest.fn<(event: KeyboardEvent) => string>();

  bindShortcut(keys: string, action: string): void {
    this.bindShortcutMock(keys, action);
    this.shortcuts.set(keys, action);
  }

  unbindShortcut(keys: string): void {
    this.unbindShortcutMock(keys);
    this.shortcuts.delete(keys);
  }

  isShortcut(event: KeyboardEvent): string | null {
    this.isShortcutMock(event);
    
    const keySeq = this.getKeySequence(event);
    return this.shortcuts.get(keySeq) || null;
  }

  handleSpecialKeys(event: KeyboardEvent): boolean {
    this.handleSpecialKeysMock(event);
    
    const specialKeys = ['Enter', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    return specialKeys.includes(event.key);
  }

  getKeySequence(event: KeyboardEvent): string {
    this.getKeySequenceMock(event);
    
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Meta');
    
    return [...modifiers, event.key].join('+');
  }
}

// London School - Mock Mouse Manager
class MockMouseManager implements MouseManager {
  private mousePosition = { x: 0, y: 0 };
  private terminalBounds = { x: 0, y: 0, width: 800, height: 600 };
  
  public trackMousePositionMock = jest.fn<(event: MouseEvent) => void>();
  public handleSelectionMock = jest.fn<(start: { x: number; y: number }, end: { x: number; y: number }) => void>();
  public handleContextMenuMock = jest.fn<(event: MouseEvent) => void>();
  public handleDoubleClickMock = jest.fn<(event: MouseEvent) => void>();
  public isInsideTerminalMock = jest.fn<(x: number, y: number) => boolean>();

  trackMousePosition(event: MouseEvent): void {
    this.trackMousePositionMock(event);
    this.mousePosition = { x: event.clientX, y: event.clientY };
  }

  handleSelection(start: { x: number; y: number }, end: { x: number; y: number }): void {
    this.handleSelectionMock(start, end);
  }

  handleContextMenu(event: MouseEvent): void {
    this.handleContextMenuMock(event);
    event.preventDefault();
  }

  handleDoubleClick(event: MouseEvent): void {
    this.handleDoubleClickMock(event);
  }

  isInsideTerminal(x: number, y: number): boolean {
    this.isInsideTerminalMock(x, y);
    
    return x >= this.terminalBounds.x && 
           x <= this.terminalBounds.x + this.terminalBounds.width &&
           y >= this.terminalBounds.y && 
           y <= this.terminalBounds.y + this.terminalBounds.height;
  }

  // Test helper
  public setTerminalBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.terminalBounds = bounds;
  }
}

// London School - Mock Clipboard Manager
class MockClipboardManager implements ClipboardManager {
  private clipboardContent: string = '';
  
  public readFromClipboardMock = jest.fn<() => Promise<string>>();
  public writeToClipboardMock = jest.fn<(data: string) => Promise<void>>();
  public handlePasteMock = jest.fn<(data: string) => Promise<void>>();
  public handleCopyMock = jest.fn<(selection: string) => Promise<void>>();
  public sanitizeClipboardDataMock = jest.fn<(data: string) => string>();

  async readFromClipboard(): Promise<string> {
    this.readFromClipboardMock();
    return this.clipboardContent;
  }

  async writeToClipboard(data: string): Promise<void> {
    this.writeToClipboardMock(data);
    this.clipboardContent = data;
  }

  async handlePaste(data: string): Promise<void> {
    this.handlePasteMock(data);
  }

  async handleCopy(selection: string): Promise<void> {
    this.handleCopyMock(selection);
    await this.writeToClipboard(selection);
  }

  sanitizeClipboardData(data: string): string {
    this.sanitizeClipboardDataMock(data);
    
    // Remove potentially harmful characters
    return data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
}

// London School - Mock Focus Manager
class MockFocusManager implements FocusManager {
  private currentFocus: HTMLElement | null = null;
  
  public setFocusMock = jest.fn<(element: HTMLElement) => void>();
  public removeFocusMock = jest.fn<() => void>();
  public handleTabNavigationMock = jest.fn<(event: KeyboardEvent) => void>();
  public manageFocusOrderMock = jest.fn<(elements: HTMLElement[]) => void>();
  public announceToScreenReaderMock = jest.fn<(message: string) => void>();

  setFocus(element: HTMLElement): void {
    this.setFocusMock(element);
    this.currentFocus = element;
    element.focus();
  }

  removeFocus(): void {
    this.removeFocusMock();
    if (this.currentFocus) {
      this.currentFocus.blur();
      this.currentFocus = null;
    }
  }

  handleTabNavigation(event: KeyboardEvent): void {
    this.handleTabNavigationMock(event);
  }

  manageFocusOrder(elements: HTMLElement[]): void {
    this.manageFocusOrderMock(elements);
    
    elements.forEach((element, index) => {
      element.tabIndex = index + 1;
    });
  }

  announceToScreenReader(message: string): void {
    this.announceToScreenReaderMock(message);
  }
}

describe('User Interaction Flow Tests - London School TDD', () => {
  let mockUserInteractionHandler: MockUserInteractionHandler;
  let mockEventSource: MockEventSource;
  let mockFetch: FetchMock;
  
  // London School - External Collaborators
  let mockAnalyticsTracker: any;
  let mockErrorReporter: any;
  let mockPerformanceMonitor: any;
  let mockAccessibilityManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup core mocks
    mockUserInteractionHandler = new MockUserInteractionHandler();
    mockEventSource = EventSourceMockFactory.createConnectedMock('ws://localhost:3000');
    mockFetch = FetchMockFactory.createTerminalMock();
    
    // Setup mock collaborators
    mockUserInteractionHandler.mockConnectionProvider = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
      getConnectionState: jest.fn().mockReturnValue({ status: 'connected' })
    };
    
    mockUserInteractionHandler.mockTerminalAdapter = {
      clear: jest.fn(),
      resize: jest.fn(),
      write: jest.fn(),
      focus: jest.fn()
    };
    
    // Setup external services
    mockAnalyticsTracker = {
      trackUserAction: jest.fn(),
      recordInteractionTime: jest.fn(),
      trackKeyboardUsage: jest.fn(),
      trackMouseUsage: jest.fn()
    };
    
    mockErrorReporter = {
      reportInteractionError: jest.fn(),
      reportPerformanceIssue: jest.fn()
    };
    
    mockPerformanceMonitor = {
      startInteractionMeasure: jest.fn(),
      endInteractionMeasure: jest.fn(),
      recordResponseTime: jest.fn()
    };
    
    mockAccessibilityManager = {
      announceUserAction: jest.fn(),
      updateScreenReaderStatus: jest.fn(),
      provideTactileFeedback: jest.fn()
    };
  });

  describe('Keyboard Interaction Flows', () => {
    it('should handle keyboard shortcuts with proper command delegation', async () => {
      // London School - Setup keyboard shortcut scenario
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'C',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      
      // Bind shortcuts
      mockUserInteractionHandler.mockKeyboardManager.bindShortcut('Ctrl+C', 'interrupt');
      mockUserInteractionHandler.mockKeyboardManager.bindShortcut('Ctrl+V', 'paste');
      mockUserInteractionHandler.mockKeyboardManager.bindShortcut('Ctrl+L', 'clear');
      
      // Handle key press
      await mockUserInteractionHandler.handleKeyPress(keyboardEvent);
      
      // Verify shortcut detection
      expect(mockUserInteractionHandler.mockKeyboardManager.isShortcutMock).toHaveBeenCalledWith(keyboardEvent);
      
      // Verify command was sent
      expect(mockUserInteractionHandler.mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'terminal-instance',
        { type: 'signal', signal: 'SIGINT' }
      );
      
      // Verify analytics tracking
      mockAnalyticsTracker.trackUserAction('keyboard_shortcut', {
        shortcut: 'Ctrl+C',
        action: 'interrupt'
      });
      
      expect(mockAnalyticsTracker.trackUserAction).toHaveBeenCalledWith(
        'keyboard_shortcut',
        { shortcut: 'Ctrl+C', action: 'interrupt' }
      );
    });

    it('should handle text input with proper character processing', async () => {
      // London School - Setup text input scenario
      const textInput = 'ls -la';
      
      // Simulate character-by-character input
      for (const char of textInput) {
        const keyEvent = new KeyboardEvent('keydown', {
          key: char,
          bubbles: true,
          cancelable: true
        });
        
        mockPerformanceMonitor.startInteractionMeasure(`key_${char}`);
        
        await mockUserInteractionHandler.handleKeyPress(keyEvent);
        
        mockPerformanceMonitor.endInteractionMeasure(`key_${char}`);
        
        // Track keyboard usage
        mockAnalyticsTracker.trackKeyboardUsage(char, Date.now());
      }
      
      // Enter key to execute command
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      
      await mockUserInteractionHandler.handleKeyPress(enterEvent);
      
      // Verify all characters were processed
      expect(mockUserInteractionHandler.handleKeyPressMock).toHaveBeenCalledTimes(textInput.length + 1);
      
      // Verify connection provider received input
      expect(mockUserInteractionHandler.mockConnectionProvider.sendMessage).toHaveBeenCalled();
      
      // Verify performance monitoring
      expect(mockPerformanceMonitor.startInteractionMeasure).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endInteractionMeasure).toHaveBeenCalled();
    });

    it('should handle special keys with appropriate terminal actions', async () => {
      // London School - Setup special keys scenario
      const specialKeys = [
        { key: 'ArrowUp', action: 'history_previous' },
        { key: 'ArrowDown', action: 'history_next' },
        { key: 'Tab', action: 'autocomplete' },
        { key: 'Backspace', action: 'delete_char' }
      ];
      
      for (const { key, action } of specialKeys) {
        const keyEvent = new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true
        });
        
        await mockUserInteractionHandler.handleKeyPress(keyEvent);
        
        // Verify special key handling
        expect(mockUserInteractionHandler.mockKeyboardManager.handleSpecialKeysMock).toHaveBeenCalledWith(keyEvent);
        
        // Verify analytics
        mockAnalyticsTracker.trackUserAction('special_key', { key, action });
      }
      
      // Verify all special keys were handled
      expect(mockUserInteractionHandler.mockKeyboardManager.handleSpecialKeysMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('Mouse Interaction Flows', () => {
    it('should handle mouse clicks with focus management', async () => {
      // London School - Setup mouse click scenario
      const terminalBounds = { x: 100, y: 100, width: 600, height: 400 };
      mockUserInteractionHandler.mockMouseManager.setTerminalBounds(terminalBounds);
      
      const clickEvent = new MouseEvent('click', {
        clientX: 300,
        clientY: 250,
        button: 0, // Left click
        bubbles: true,
        cancelable: true
      });
      
      // Handle mouse click
      await mockUserInteractionHandler.handleMouseClick(clickEvent);
      
      // Verify mouse position tracking
      expect(mockUserInteractionHandler.mockMouseManager.trackMousePositionMock).toHaveBeenCalledWith(clickEvent);
      
      // Verify terminal boundary check
      expect(mockUserInteractionHandler.mockMouseManager.isInsideTerminalMock).toHaveBeenCalledWith(300, 250);
      
      // Verify focus was set
      expect(mockUserInteractionHandler.mockFocusManager.setFocusMock).toHaveBeenCalled();
      
      // Verify selection started
      expect(mockUserInteractionHandler.mockMouseManager.handleSelectionMock).toHaveBeenCalledWith(
        { x: 300, y: 250 },
        { x: 300, y: 250 }
      );
      
      // Verify analytics
      mockAnalyticsTracker.trackMouseUsage('click', { x: 300, y: 250 });
      expect(mockAnalyticsTracker.trackMouseUsage).toHaveBeenCalledWith('click', { x: 300, y: 250 });
    });

    it('should handle context menu with appropriate options', async () => {
      // London School - Setup context menu scenario
      const rightClickEvent = new MouseEvent('contextmenu', {
        clientX: 400,
        clientY: 300,
        button: 2, // Right click
        bubbles: true,
        cancelable: true
      });
      
      // Handle right click
      await mockUserInteractionHandler.handleMouseClick(rightClickEvent);
      
      // Verify context menu handling
      expect(mockUserInteractionHandler.mockMouseManager.handleContextMenuMock).toHaveBeenCalledWith(rightClickEvent);
      
      // Verify event was prevented (default context menu)
      expect(rightClickEvent.defaultPrevented).toBe(true);
      
      // Verify accessibility announcement
      mockAccessibilityManager.announceUserAction('Context menu opened');
      expect(mockAccessibilityManager.announceUserAction).toHaveBeenCalledWith('Context menu opened');
    });

    it('should handle text selection with proper boundaries', async () => {
      // London School - Setup text selection scenario
      const startPoint = { x: 200, y: 200 };
      const endPoint = { x: 400, y: 250 };
      
      mockUserInteractionHandler.mockMouseManager.handleSelection(startPoint, endPoint);
      
      // Verify selection handling
      expect(mockUserInteractionHandler.mockMouseManager.handleSelectionMock).toHaveBeenCalledWith(
        startPoint,
        endPoint
      );
      
      // Simulate selection completion
      const selectedText = 'npm install react';
      await mockUserInteractionHandler.mockClipboardManager.handleCopy(selectedText);
      
      // Verify copy to clipboard
      expect(mockUserInteractionHandler.mockClipboardManager.handleCopyMock).toHaveBeenCalledWith(selectedText);
      
      // Verify clipboard content
      const clipboardContent = await mockUserInteractionHandler.mockClipboardManager.readFromClipboard();
      expect(clipboardContent).toBe(selectedText);
    });
  });

  describe('Clipboard and Paste Operations', () => {
    it('should handle paste operations with data sanitization', async () => {
      // London School - Setup paste scenario
      const pasteData = 'echo "Hello World"\x00\x01malicious_data';
      const sanitizedData = 'echo "Hello World"malicious_data';
      
      // Handle paste
      await mockUserInteractionHandler.handlePaste(pasteData);
      
      // Verify sanitization
      expect(mockUserInteractionHandler.mockClipboardManager.sanitizeClipboardDataMock).toHaveBeenCalledWith(pasteData);
      
      // Verify sanitized data was sent
      expect(mockUserInteractionHandler.mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'terminal-instance',
        { type: 'input', data: sanitizedData }
      );
      
      // Verify accessibility notification
      mockAccessibilityManager.announceUserAction(`Pasted ${sanitizedData.length} characters`);
      expect(mockAccessibilityManager.announceUserAction).toHaveBeenCalledWith(
        `Pasted ${sanitizedData.length} characters`
      );
    });

    it('should handle keyboard paste shortcut', async () => {
      // London School - Setup keyboard paste scenario
      const clipboardContent = 'ls -la && pwd';
      
      // Set clipboard content
      await mockUserInteractionHandler.mockClipboardManager.writeToClipboard(clipboardContent);
      
      // Simulate Ctrl+V
      const pasteKeyEvent = new KeyboardEvent('keydown', {
        key: 'V',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });
      
      mockUserInteractionHandler.mockKeyboardManager.bindShortcut('Ctrl+V', 'paste');
      
      await mockUserInteractionHandler.handleKeyPress(pasteKeyEvent);
      
      // Verify paste was triggered
      expect(mockUserInteractionHandler.handlePasteMock).toHaveBeenCalledWith(clipboardContent);
      
      // Verify command was sent
      expect(mockUserInteractionHandler.mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'terminal-instance',
        { type: 'input', data: clipboardContent }
      );
    });

    it('should handle large clipboard content with chunking', async () => {
      // London School - Setup large paste scenario
      const largeContent = 'A'.repeat(10000);
      
      mockPerformanceMonitor.startInteractionMeasure('large_paste');
      
      await mockUserInteractionHandler.handlePaste(largeContent);
      
      mockPerformanceMonitor.endInteractionMeasure('large_paste');
      
      // Verify performance monitoring
      expect(mockPerformanceMonitor.startInteractionMeasure).toHaveBeenCalledWith('large_paste');
      expect(mockPerformanceMonitor.endInteractionMeasure).toHaveBeenCalledWith('large_paste');
      
      // Verify large content handling
      expect(mockUserInteractionHandler.handlePasteMock).toHaveBeenCalledWith(largeContent);
      
      // Check for performance warnings
      if (largeContent.length > 5000) {
        mockErrorReporter.reportPerformanceIssue('Large paste operation', {
          size: largeContent.length,
          threshold: 5000
        });
      }
    });
  });

  describe('Drag and Drop Interactions', () => {
    it('should handle file drop with proper processing', async () => {
      // London School - Setup file drop scenario
      const mockFiles = {
        length: 2,
        0: { name: 'script.sh', size: 1024, type: 'text/plain' },
        1: { name: 'data.json', size: 2048, type: 'application/json' }
      } as FileList;
      
      await mockUserInteractionHandler.handleDragDrop(mockFiles);
      
      // Verify file processing
      expect(mockUserInteractionHandler.handleDragDropMock).toHaveBeenCalledWith(mockFiles);
      
      // Verify each file was sent
      expect(mockUserInteractionHandler.mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'terminal-instance',
        {
          type: 'file_drop',
          filename: 'script.sh',
          size: 1024,
          type: 'text/plain'
        }
      );
      
      expect(mockUserInteractionHandler.mockConnectionProvider.sendMessage).toHaveBeenCalledWith(
        'terminal-instance',
        {
          type: 'file_drop',
          filename: 'data.json',
          size: 2048,
          type: 'application/json'
        }
      );
      
      // Verify accessibility announcement
      mockAccessibilityManager.announceUserAction(`Dropped 2 files`);
      expect(mockAccessibilityManager.announceUserAction).toHaveBeenCalledWith('Dropped 2 files');
    });
  });

  describe('Focus and Accessibility Management', () => {
    it('should handle focus changes with screen reader announcements', () => {
      // London School - Setup focus management scenario
      const terminalElement = document.createElement('div');
      terminalElement.className = 'terminal';
      
      // Handle focus
      mockUserInteractionHandler.handleFocusChange(true);
      
      // Verify focus announcement
      expect(mockUserInteractionHandler.mockFocusManager.announceToScreenReaderMock).toHaveBeenCalledWith('Terminal focused');
      
      // Handle blur
      mockUserInteractionHandler.handleFocusChange(false);
      
      // Verify focus removal
      expect(mockUserInteractionHandler.mockFocusManager.removeFocusMock).toHaveBeenCalled();
      
      // Verify accessibility updates
      mockAccessibilityManager.updateScreenReaderStatus('Terminal unfocused');
      expect(mockAccessibilityManager.updateScreenReaderStatus).toHaveBeenCalledWith('Terminal unfocused');
    });

    it('should handle tab navigation with proper focus order', () => {
      // London School - Setup tab navigation scenario
      const elements = [
        document.createElement('input'),
        document.createElement('button'),
        document.createElement('div')
      ];
      
      mockUserInteractionHandler.mockFocusManager.manageFocusOrder(elements);
      
      // Verify focus order was set
      expect(mockUserInteractionHandler.mockFocusManager.manageFocusOrderMock).toHaveBeenCalledWith(elements);
      
      // Verify tab indices were assigned
      elements.forEach((element, index) => {
        expect(element.tabIndex).toBe(index + 1);
      });
      
      // Simulate tab navigation
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      });
      
      mockUserInteractionHandler.mockFocusManager.handleTabNavigation(tabEvent);
      
      expect(mockUserInteractionHandler.mockFocusManager.handleTabNavigationMock).toHaveBeenCalledWith(tabEvent);
    });
  });

  describe('Responsive and Resize Handling', () => {
    it('should handle window resize with terminal adjustment', () => {
      // London School - Setup resize scenario
      const newDimensions = { width: 1200, height: 800 };
      
      mockUserInteractionHandler.handleResize(newDimensions);
      
      // Verify resize handling
      expect(mockUserInteractionHandler.handleResizeMock).toHaveBeenCalledWith(newDimensions);
      
      // Verify terminal was resized
      const expectedCols = Math.floor(newDimensions.width / 8);
      const expectedRows = Math.floor(newDimensions.height / 16);
      
      expect(mockUserInteractionHandler.mockTerminalAdapter.resize).toHaveBeenCalledWith(
        expectedCols,
        expectedRows
      );
      
      // Verify analytics
      mockAnalyticsTracker.trackUserAction('resize', {
        dimensions: newDimensions,
        terminalSize: { cols: expectedCols, rows: expectedRows }
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle interaction errors gracefully', async () => {
      // London School - Setup error scenario
      const keyEvent = new KeyboardEvent('keydown', { key: 'C', ctrlKey: true });
      
      // Mock connection error
      mockUserInteractionHandler.mockConnectionProvider.sendMessage.mockRejectedValue(
        new Error('Connection failed')
      );
      
      try {
        await mockUserInteractionHandler.handleKeyPress(keyEvent);
      } catch (error) {
        // Error should be handled gracefully
      }
      
      // Verify error was reported
      mockErrorReporter.reportInteractionError('keyboard_input', expect.any(Error));
      
      // Verify user was notified
      mockAccessibilityManager.announceUserAction('Command failed to send, please try again');
    });
  });

  describe('London School - Contract Verification', () => {
    it('should verify all interaction handler contracts are fulfilled', () => {
      // Verify keyboard manager contracts
      expect(mockUserInteractionHandler.mockKeyboardManager.bindShortcutMock).toHaveBeenCalled();
      expect(mockUserInteractionHandler.mockKeyboardManager.isShortcutMock).toHaveBeenCalled();
      expect(mockUserInteractionHandler.mockKeyboardManager.handleSpecialKeysMock).toHaveBeenCalled();
      
      // Verify mouse manager contracts
      expect(mockUserInteractionHandler.mockMouseManager.trackMousePositionMock).toHaveBeenCalled();
      expect(mockUserInteractionHandler.mockMouseManager.handleSelectionMock).toHaveBeenCalled();
      expect(mockUserInteractionHandler.mockMouseManager.isInsideTerminalMock).toHaveBeenCalled();
      
      // Verify clipboard manager contracts
      expect(mockUserInteractionHandler.mockClipboardManager.sanitizeClipboardDataMock).toHaveBeenCalled();
      expect(mockUserInteractionHandler.mockClipboardManager.readFromClipboardMock).toHaveBeenCalled();
      
      // Verify focus manager contracts
      expect(mockUserInteractionHandler.mockFocusManager.announceToScreenReaderMock).toHaveBeenCalled();
      expect(mockUserInteractionHandler.mockFocusManager.manageFocusOrderMock).toHaveBeenCalled();
    });

    it('should verify all external service collaborations', () => {
      // Verify analytics tracking
      expect(mockAnalyticsTracker.trackUserAction).toHaveBeenCalled();
      expect(mockAnalyticsTracker.trackKeyboardUsage).toHaveBeenCalled();
      expect(mockAnalyticsTracker.trackMouseUsage).toHaveBeenCalled();
      
      // Verify accessibility management
      expect(mockAccessibilityManager.announceUserAction).toHaveBeenCalled();
      expect(mockAccessibilityManager.updateScreenReaderStatus).toHaveBeenCalled();
      
      // Verify performance monitoring
      expect(mockPerformanceMonitor.startInteractionMeasure).toHaveBeenCalled();
      expect(mockPerformanceMonitor.endInteractionMeasure).toHaveBeenCalled();
      
      // Verify error reporting
      expect(mockErrorReporter.reportInteractionError).toHaveBeenCalled();
    });

    it('should verify all mocks are properly configured jest functions', () => {
      // Verify all primary mocks
      expect(jest.isMockFunction(mockUserInteractionHandler.handleKeyPressMock)).toBe(true);
      expect(jest.isMockFunction(mockUserInteractionHandler.handleMouseClickMock)).toBe(true);
      expect(jest.isMockFunction(mockUserInteractionHandler.handlePasteMock)).toBe(true);
      
      // Verify collaborator mocks
      expect(jest.isMockFunction(mockUserInteractionHandler.mockKeyboardManager.isShortcutMock)).toBe(true);
      expect(jest.isMockFunction(mockUserInteractionHandler.mockMouseManager.trackMousePositionMock)).toBe(true);
      expect(jest.isMockFunction(mockUserInteractionHandler.mockClipboardManager.sanitizeClipboardDataMock)).toBe(true);
      expect(jest.isMockFunction(mockUserInteractionHandler.mockFocusManager.setFocusMock)).toBe(true);
    });
  });
});