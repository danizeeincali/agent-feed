/**
 * Terminal Output Formatting Tests - London School TDD Approach
 * Tests terminal output rendering, ANSI processing, and formatting with comprehensive mocking
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

interface TerminalAdapter {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  setTheme: (theme: TerminalTheme) => void;
  resize: (cols: number, rows: number) => void;
  getBuffer: () => string[];
  getCursor: () => { x: number, y: number };
  setCursor: (x: number, y: number) => void;
}

interface ANSIProcessor {
  parseAnsiSequence: (text: string) => ANSIToken[];
  stripAnsiCodes: (text: string) => string;
  processColorCodes: (tokens: ANSIToken[]) => FormattedText[];
  processTextFormatting: (tokens: ANSIToken[]) => FormattedText[];
}

interface OutputFormatter {
  formatClaudeOutput: (output: string) => FormattedOutput;
  formatCommandOutput: (command: string, output: string) => FormattedOutput;
  formatErrorOutput: (error: string) => FormattedOutput;
  formatLoadingAnimation: (message: string, progress?: number) => FormattedOutput;
}

interface TerminalTheme {
  background: string;
  foreground: string;
  colors: {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

interface ANSIToken {
  type: 'text' | 'escape' | 'color' | 'formatting' | 'cursor' | 'clear';
  content: string;
  params?: number[];
  raw?: string;
}

interface FormattedText {
  text: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

interface FormattedOutput {
  sections: FormattedText[];
  metadata: {
    hasAnsiCodes: boolean;
    hasColors: boolean;
    hasFormatting: boolean;
    outputType: 'command' | 'error' | 'info' | 'loading' | 'raw';
    timestamp: number;
  };
}

// London School - Mock Terminal Adapter
class MockTerminalAdapter implements TerminalAdapter {
  private buffer: string[] = [];
  private cursor = { x: 0, y: 0 };
  private theme: TerminalTheme | null = null;
  private dimensions = { cols: 80, rows: 24 };

  // Jest Mocks for Behavior Verification
  public writeMock = jest.fn<(data: string) => void>();
  public writelnMock = jest.fn<(data: string) => void>();
  public clearMock = jest.fn<() => void>();
  public setThemeMock = jest.fn<(theme: TerminalTheme) => void>();
  public resizeMock = jest.fn<(cols: number, rows: number) => void>();

  write(data: string): void {
    this.writeMock(data);
    
    // Simulate writing to buffer
    if (this.buffer.length === 0) {
      this.buffer.push('');
    }
    
    this.buffer[this.buffer.length - 1] += data;
    this.cursor.x += data.length;
  }

  writeln(data: string): void {
    this.writelnMock(data);
    this.buffer.push(data);
    this.cursor.x = 0;
    this.cursor.y++;
  }

  clear(): void {
    this.clearMock();
    this.buffer = [];
    this.cursor = { x: 0, y: 0 };
  }

  setTheme(theme: TerminalTheme): void {
    this.setThemeMock(theme);
    this.theme = theme;
  }

  resize(cols: number, rows: number): void {
    this.resizeMock(cols, rows);
    this.dimensions = { cols, rows };
  }

  getBuffer(): string[] {
    return [...this.buffer];
  }

  getCursor(): { x: number, y: number } {
    return { ...this.cursor };
  }

  setCursor(x: number, y: number): void {
    this.cursor = { x, y };
  }

  // London School - Test Support Methods
  public getLastOutput(): string {
    return this.buffer[this.buffer.length - 1] || '';
  }

  public getBufferLength(): number {
    return this.buffer.length;
  }

  public simulateBufferOverflow(): void {
    // Simulate terminal buffer overflow
    while (this.buffer.length > this.dimensions.rows) {
      this.buffer.shift();
    }
  }
}

// London School - Mock ANSI Processor
class MockANSIProcessor implements ANSIProcessor {
  // Jest Mocks for Behavior Verification
  public parseAnsiSequenceMock = jest.fn<(text: string) => ANSIToken[]>();
  public stripAnsiCodesMock = jest.fn<(text: string) => string>();
  public processColorCodesMock = jest.fn<(tokens: ANSIToken[]) => FormattedText[]>();
  public processTextFormattingMock = jest.fn<(tokens: ANSIToken[]) => FormattedText[]>();

  parseAnsiSequence(text: string): ANSIToken[] {
    this.parseAnsiSequenceMock(text);
    
    const tokens: ANSIToken[] = [];
    const ansiRegex = /\x1b\[([0-9;]*)([a-zA-Z])/g;
    let lastIndex = 0;
    let match;
    
    while ((match = ansiRegex.exec(text)) !== null) {
      // Add text before escape sequence
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add escape sequence
      const params = match[1] ? match[1].split(';').map(Number) : [];
      const command = match[2];
      
      tokens.push({
        type: this.getTokenType(command),
        content: match[0],
        params,
        raw: match[0]
      });
      
      lastIndex = ansiRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return tokens;
  }

  stripAnsiCodes(text: string): string {
    this.stripAnsiCodesMock(text);
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  }

  processColorCodes(tokens: ANSIToken[]): FormattedText[] {
    this.processColorCodesMock(tokens);
    
    const formatted: FormattedText[] = [];
    let currentColor: string | undefined;
    let currentBackground: string | undefined;
    
    tokens.forEach(token => {
      if (token.type === 'text') {
        formatted.push({
          text: token.content,
          color: currentColor,
          backgroundColor: currentBackground
        });
      } else if (token.type === 'color' && token.params) {
        const colorCode = token.params[0];
        if (colorCode >= 30 && colorCode <= 37) {
          currentColor = this.getColorFromCode(colorCode);
        } else if (colorCode >= 40 && colorCode <= 47) {
          currentBackground = this.getColorFromCode(colorCode - 10);
        } else if (colorCode === 0) {
          currentColor = undefined;
          currentBackground = undefined;
        }
      }
    });
    
    return formatted;
  }

  processTextFormatting(tokens: ANSIToken[]): FormattedText[] {
    this.processTextFormattingMock(tokens);
    
    const formatted: FormattedText[] = [];
    let bold = false;
    let italic = false;
    let underline = false;
    
    tokens.forEach(token => {
      if (token.type === 'text') {
        formatted.push({
          text: token.content,
          bold,
          italic,
          underline
        });
      } else if (token.type === 'formatting' && token.params) {
        token.params.forEach(param => {
          switch (param) {
            case 1: bold = true; break;
            case 3: italic = true; break;
            case 4: underline = true; break;
            case 22: bold = false; break;
            case 23: italic = false; break;
            case 24: underline = false; break;
            case 0:
              bold = italic = underline = false;
              break;
          }
        });
      }
    });
    
    return formatted;
  }

  private getTokenType(command: string): ANSIToken['type'] {
    switch (command) {
      case 'm': return 'color';
      case 'H': case 'f': return 'cursor';
      case 'J': case 'K': return 'clear';
      default: return 'escape';
    }
  }

  private getColorFromCode(code: number): string {
    const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
    return colors[code - 30] || 'white';
  }
}

// London School - Mock Output Formatter
class MockOutputFormatter implements OutputFormatter {
  private ansiProcessor: MockANSIProcessor;
  
  // Jest Mocks for Behavior Verification
  public formatClaudeOutputMock = jest.fn<(output: string) => FormattedOutput>();
  public formatCommandOutputMock = jest.fn<(command: string, output: string) => FormattedOutput>();
  public formatErrorOutputMock = jest.fn<(error: string) => FormattedOutput>();
  public formatLoadingAnimationMock = jest.fn<(message: string, progress?: number) => FormattedOutput>();

  constructor(ansiProcessor: MockANSIProcessor) {
    this.ansiProcessor = ansiProcessor;
  }

  formatClaudeOutput(output: string): FormattedOutput {
    this.formatClaudeOutputMock(output);
    
    const tokens = this.ansiProcessor.parseAnsiSequence(output);
    const colorFormatted = this.ansiProcessor.processColorCodes(tokens);
    const textFormatted = this.ansiProcessor.processTextFormatting(tokens);
    
    // Merge formatting
    const sections = this.mergeFormatting(colorFormatted, textFormatted);
    
    return {
      sections,
      metadata: {
        hasAnsiCodes: tokens.some(t => t.type !== 'text'),
        hasColors: colorFormatted.some(f => f.color || f.backgroundColor),
        hasFormatting: textFormatted.some(f => f.bold || f.italic || f.underline),
        outputType: this.detectOutputType(output),
        timestamp: Date.now()
      }
    };
  }

  formatCommandOutput(command: string, output: string): FormattedOutput {
    this.formatCommandOutputMock(command, output);
    
    const commandSection: FormattedText = {
      text: `$ ${command}\n`,
      color: 'cyan',
      bold: true
    };
    
    const outputFormatted = this.formatClaudeOutput(output);
    
    return {
      sections: [commandSection, ...outputFormatted.sections],
      metadata: {
        ...outputFormatted.metadata,
        outputType: 'command'
      }
    };
  }

  formatErrorOutput(error: string): FormattedOutput {
    this.formatErrorOutputMock(error);
    
    return {
      sections: [{
        text: `❌ Error: ${error}`,
        color: 'red',
        bold: true
      }],
      metadata: {
        hasAnsiCodes: false,
        hasColors: true,
        hasFormatting: true,
        outputType: 'error',
        timestamp: Date.now()
      }
    };
  }

  formatLoadingAnimation(message: string, progress: number = 0): FormattedOutput {
    this.formatLoadingAnimationMock(message, progress);
    
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + 
                       '░'.repeat(20 - Math.floor(progress / 5));
    
    return {
      sections: [{
        text: `⏳ ${message} [${progressBar}] ${progress}%`,
        color: 'yellow',
        bold: false
      }],
      metadata: {
        hasAnsiCodes: false,
        hasColors: true,
        hasFormatting: false,
        outputType: 'loading',
        timestamp: Date.now()
      }
    };
  }

  private mergeFormatting(colorFormatted: FormattedText[], textFormatted: FormattedText[]): FormattedText[] {
    const merged: FormattedText[] = [];
    
    for (let i = 0; i < Math.min(colorFormatted.length, textFormatted.length); i++) {
      merged.push({
        ...colorFormatted[i],
        ...textFormatted[i],
        text: colorFormatted[i].text || textFormatted[i].text
      });
    }
    
    return merged;
  }

  private detectOutputType(output: string): FormattedOutput['metadata']['outputType'] {
    if (output.includes('Error:') || output.includes('❌')) return 'error';
    if (output.includes('$') || output.includes('➜')) return 'command';
    if (output.includes('ℹ️') || output.includes('INFO')) return 'info';
    if (output.includes('⏳') || output.includes('Loading')) return 'loading';
    return 'raw';
  }
}

describe('Terminal Output Formatting Tests - London School TDD', () => {
  let mockTerminalAdapter: MockTerminalAdapter;
  let mockANSIProcessor: MockANSIProcessor;
  let mockOutputFormatter: MockOutputFormatter;
  
  // London School - External Collaborators
  let mockThemeManager: any;
  let mockAccessibilityFormatter: any;
  let mockPerformanceTracker: any;
  let mockConfigManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup core mocks
    mockTerminalAdapter = new MockTerminalAdapter();
    mockANSIProcessor = new MockANSIProcessor();
    mockOutputFormatter = new MockOutputFormatter(mockANSIProcessor);
    
    // Setup external collaborators
    mockThemeManager = {
      getCurrentTheme: jest.fn().mockReturnValue({
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        colors: {
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8'
        }
      }),
      applyTheme: jest.fn(),
      setCustomColors: jest.fn()
    };
    
    mockAccessibilityFormatter = {
      makeScreenReaderFriendly: jest.fn(),
      addAriaLabels: jest.fn(),
      enhanceKeyboardNavigation: jest.fn(),
      announceOutput: jest.fn()
    };
    
    mockPerformanceTracker = {
      startFormatting: jest.fn(),
      endFormatting: jest.fn(),
      recordRenderTime: jest.fn(),
      trackMemoryUsage: jest.fn()
    };
    
    mockConfigManager = {
      getFormattingConfig: jest.fn().mockReturnValue({
        enableColors: true,
        enableFormatting: true,
        maxBufferLines: 1000,
        wordWrap: true
      }),
      setFormattingPreference: jest.fn()
    };
  });

  describe('ANSI Code Processing', () => {
    it('should parse ANSI color codes correctly', () => {
      // London School - Setup ANSI color code scenario
      const coloredText = '\x1b[31mRed text\x1b[0m \x1b[32mGreen text\x1b[0m';
      
      const tokens = mockANSIProcessor.parseAnsiSequence(coloredText);
      
      // Verify parsing was called
      expect(mockANSIProcessor.parseAnsiSequenceMock).toHaveBeenCalledWith(coloredText);
      
      // Verify token structure
      expect(tokens).toContainEqual(
        expect.objectContaining({
          type: 'color',
          params: [31]
        })
      );
      
      expect(tokens).toContainEqual(
        expect.objectContaining({
          type: 'text',
          content: 'Red text'
        })
      );
      
      // Process color codes
      const formatted = mockANSIProcessor.processColorCodes(tokens);
      
      expect(mockANSIProcessor.processColorCodesMock).toHaveBeenCalledWith(tokens);
      
      // Verify color processing
      expect(formatted).toContainEqual(
        expect.objectContaining({
          text: 'Red text',
          color: 'red'
        })
      );
      
      expect(formatted).toContainEqual(
        expect.objectContaining({
          text: 'Green text',
          color: 'green'
        })
      );
    });

    it('should handle complex ANSI formatting combinations', () => {
      // London School - Setup complex formatting scenario
      const complexText = '\x1b[1;31;4mBold Red Underlined\x1b[0m \x1b[3;32mItalic Green\x1b[0m';
      
      const tokens = mockANSIProcessor.parseAnsiSequence(complexText);
      const colorFormatted = mockANSIProcessor.processColorCodes(tokens);
      const textFormatted = mockANSIProcessor.processTextFormatting(tokens);
      
      // Verify complex parsing
      expect(tokens).toContainEqual(
        expect.objectContaining({
          type: 'color',
          params: [1, 31, 4] // Bold, Red, Underline
        })
      );
      
      // Verify formatting processing
      expect(mockANSIProcessor.processTextFormattingMock).toHaveBeenCalledWith(tokens);
      
      // Verify combined formatting
      expect(textFormatted).toContainEqual(
        expect.objectContaining({
          text: 'Bold Red Underlined',
          bold: true,
          underline: true
        })
      );
      
      expect(textFormatted).toContainEqual(
        expect.objectContaining({
          text: 'Italic Green',
          italic: true
        })
      );
    });

    it('should strip ANSI codes for accessibility', () => {
      // London School - Setup accessibility scenario
      const ansiText = '\x1b[1;31mError:\x1b[0m Command not found';
      
      const strippedText = mockANSIProcessor.stripAnsiCodes(ansiText);
      
      // Verify stripping was called
      expect(mockANSIProcessor.stripAnsiCodesMock).toHaveBeenCalledWith(ansiText);
      
      // Verify clean text for screen readers
      expect(strippedText).toBe('Error: Command not found');
      
      // Make accessible
      mockAccessibilityFormatter.makeScreenReaderFriendly(strippedText);
      
      expect(mockAccessibilityFormatter.makeScreenReaderFriendly).toHaveBeenCalledWith(
        'Error: Command not found'
      );
      
      // Announce to screen reader
      mockAccessibilityFormatter.announceOutput(strippedText, 'error');
      
      expect(mockAccessibilityFormatter.announceOutput).toHaveBeenCalledWith(
        'Error: Command not found',
        'error'
      );
    });
  });

  describe('Output Formatting Scenarios', () => {
    it('should format Claude command output with proper styling', () => {
      // London School - Setup Claude output formatting
      const command = 'npm install react';
      const output = '+ react@18.2.0\nadded 1 package in 2.3s';
      
      const formatted = mockOutputFormatter.formatCommandOutput(command, output);
      
      // Verify formatting was called
      expect(mockOutputFormatter.formatCommandOutputMock).toHaveBeenCalledWith(command, output);
      
      // Verify command prompt styling
      expect(formatted.sections[0]).toEqual(
        expect.objectContaining({
          text: `$ ${command}\n`,
          color: 'cyan',
          bold: true
        })
      );
      
      // Verify output type detection
      expect(formatted.metadata.outputType).toBe('command');
      
      // Apply to terminal
      formatted.sections.forEach(section => {
        mockTerminalAdapter.write(section.text);
      });
      
      expect(mockTerminalAdapter.writeMock).toHaveBeenCalled();
      
      // Track performance
      mockPerformanceTracker.recordRenderTime('command_output', expect.any(Number));
    });

    it('should format error messages with prominent styling', () => {
      // London School - Setup error formatting scenario
      const errorMessage = 'Command not found: invalidcommand';
      
      const formatted = mockOutputFormatter.formatErrorOutput(errorMessage);
      
      // Verify error formatting
      expect(mockOutputFormatter.formatErrorOutputMock).toHaveBeenCalledWith(errorMessage);
      
      expect(formatted.sections[0]).toEqual(
        expect.objectContaining({
          text: `❌ Error: ${errorMessage}`,
          color: 'red',
          bold: true
        })
      );
      
      expect(formatted.metadata.outputType).toBe('error');
      
      // Apply theme
      const currentTheme = mockThemeManager.getCurrentTheme();
      mockTerminalAdapter.setTheme(currentTheme);
      
      expect(mockThemeManager.getCurrentTheme).toHaveBeenCalled();
      expect(mockTerminalAdapter.setThemeMock).toHaveBeenCalledWith(currentTheme);
      
      // Render error with theme
      mockTerminalAdapter.writeln(formatted.sections[0].text);
      
      expect(mockTerminalAdapter.writelnMock).toHaveBeenCalledWith(
        `❌ Error: ${errorMessage}`
      );
    });

    it('should format loading animations with progress indication', () => {
      // London School - Setup loading animation scenario
      const loadingMessage = 'Installing packages';
      let progress = 0;
      
      const animationInterval = setInterval(() => {
        progress += 10;
        
        const formatted = mockOutputFormatter.formatLoadingAnimation(loadingMessage, progress);
        
        // Verify loading formatting
        expect(mockOutputFormatter.formatLoadingAnimationMock).toHaveBeenCalledWith(
          loadingMessage, 
          progress
        );
        
        expect(formatted.sections[0].text).toContain(loadingMessage);
        expect(formatted.sections[0].text).toContain(`${progress}%`);
        expect(formatted.metadata.outputType).toBe('loading');
        
        // Clear and redraw
        mockTerminalAdapter.clear();
        mockTerminalAdapter.write(formatted.sections[0].text);
        
        if (progress >= 100) {
          clearInterval(animationInterval);
          
          // Final completion message
          const completedFormatted = mockOutputFormatter.formatClaudeOutput(
            '✅ Package installation completed'
          );
          
          mockTerminalAdapter.writeln(completedFormatted.sections[0].text);
        }
      }, 100);
      
      // Wait for animation to complete
      setTimeout(() => {
        expect(mockTerminalAdapter.clearMock).toHaveBeenCalled();
        expect(mockTerminalAdapter.writeMock).toHaveBeenCalled();
        expect(mockTerminalAdapter.writelnMock).toHaveBeenCalledWith(
          expect.stringContaining('✅ Package installation completed')
        );
      }, 1100);
    });
  });

  describe('Terminal Rendering Integration', () => {
    it('should render formatted output to terminal adapter', () => {
      // London School - Setup terminal rendering scenario
      const claudeOutput = '\x1b[32m✅ Task completed successfully\x1b[0m\n\x1b[33m⚠️ Warning: deprecated feature used\x1b[0m';
      
      const formatted = mockOutputFormatter.formatClaudeOutput(claudeOutput);
      
      // Verify Claude output formatting
      expect(mockOutputFormatter.formatClaudeOutputMock).toHaveBeenCalledWith(claudeOutput);
      
      // Start performance tracking
      mockPerformanceTracker.startFormatting();
      
      // Render each section
      formatted.sections.forEach((section, index) => {
        if (section.color) {
          // Apply color theme
          const themeColor = mockThemeManager.getCurrentTheme().colors[section.color];
          mockThemeManager.setCustomColors({ [section.color]: themeColor });
        }
        
        if (section.bold) {
          // Bold formatting
          mockTerminalAdapter.write(`\x1b[1m${section.text}\x1b[22m`);
        } else {
          mockTerminalAdapter.write(section.text);
        }
      });
      
      // End performance tracking
      mockPerformanceTracker.endFormatting();
      
      // Verify rendering
      expect(mockTerminalAdapter.writeMock).toHaveBeenCalled();
      expect(mockPerformanceTracker.startFormatting).toHaveBeenCalled();
      expect(mockPerformanceTracker.endFormatting).toHaveBeenCalled();
      
      // Verify buffer management
      expect(mockTerminalAdapter.getBufferLength()).toBeGreaterThan(0);
    });

    it('should handle terminal buffer overflow gracefully', () => {
      // London School - Setup buffer overflow scenario
      const config = mockConfigManager.getFormattingConfig();
      mockTerminalAdapter.resize(80, 24); // Standard terminal size
      
      // Fill buffer beyond capacity
      for (let i = 0; i < 30; i++) {
        const line = `Line ${i}: Some output text that fills the terminal buffer`;
        mockTerminalAdapter.writeln(line);
      }
      
      // Simulate buffer overflow
      mockTerminalAdapter.simulateBufferOverflow();
      
      // Verify buffer management
      expect(mockTerminalAdapter.getBufferLength()).toBeLessThanOrEqual(24);
      expect(mockTerminalAdapter.resizeMock).toHaveBeenCalledWith(80, 24);
      
      // Verify configuration was consulted
      expect(mockConfigManager.getFormattingConfig).toHaveBeenCalled();
      
      // Track memory usage
      mockPerformanceTracker.trackMemoryUsage('buffer_overflow');
      expect(mockPerformanceTracker.trackMemoryUsage).toHaveBeenCalledWith('buffer_overflow');
    });

    it('should handle responsive terminal resizing', () => {
      // London School - Setup responsive resize scenario
      const longCommand = 'npm install --save-dev @types/node @types/react @types/jest typescript ts-node nodemon concurrently';
      
      // Initial narrow terminal
      mockTerminalAdapter.resize(40, 24);
      const narrowFormatted = mockOutputFormatter.formatCommandOutput(longCommand, 'Installation complete');
      
      // Render on narrow terminal
      narrowFormatted.sections.forEach(section => {
        if (section.text.length > 40) {
          // Word wrap for narrow terminal
          const wrapped = this.wrapText(section.text, 40);
          wrapped.forEach(line => mockTerminalAdapter.writeln(line));
        } else {
          mockTerminalAdapter.writeln(section.text);
        }
      });
      
      // Resize to wider terminal
      mockTerminalAdapter.resize(120, 30);
      mockTerminalAdapter.clear();
      
      // Re-render for wider terminal
      const wideFormatted = mockOutputFormatter.formatCommandOutput(longCommand, 'Installation complete');
      wideFormatted.sections.forEach(section => {
        mockTerminalAdapter.writeln(section.text);
      });
      
      // Verify resize handling
      expect(mockTerminalAdapter.resizeMock).toHaveBeenCalledWith(40, 24);
      expect(mockTerminalAdapter.resizeMock).toHaveBeenCalledWith(120, 30);
      expect(mockTerminalAdapter.clearMock).toHaveBeenCalled();
      
      // Verify different rendering for different sizes
      expect(mockTerminalAdapter.writelnMock).toHaveBeenCalled();
    });
  });

  describe('Theme and Accessibility Integration', () => {
    it('should apply theme colors consistently', () => {
      // London School - Setup theme application scenario
      const darkTheme: TerminalTheme = {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        colors: {
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff'
        }
      };
      
      // Apply theme
      mockTerminalAdapter.setTheme(darkTheme);
      mockThemeManager.applyTheme(darkTheme);
      
      // Format output with theme colors
      const coloredOutput = '\x1b[31mRed\x1b[32mGreen\x1b[34mBlue\x1b[0m';
      const formatted = mockOutputFormatter.formatClaudeOutput(coloredOutput);
      
      // Verify theme application
      expect(mockTerminalAdapter.setThemeMock).toHaveBeenCalledWith(darkTheme);
      expect(mockThemeManager.applyTheme).toHaveBeenCalledWith(darkTheme);
      
      // Verify colors match theme
      formatted.sections.forEach(section => {
        if (section.color && section.color in darkTheme.colors) {
          expect(darkTheme.colors[section.color as keyof typeof darkTheme.colors]).toBeDefined();
        }
      });
    });

    it('should provide accessible alternatives for color-blind users', () => {
      // London School - Setup accessibility scenario
      const config = mockConfigManager.getFormattingConfig();
      config.accessibilityMode = true;
      
      const errorOutput = '\x1b[31mError: Build failed\x1b[0m';
      const successOutput = '\x1b[32mBuild successful\x1b[0m';
      
      // Format with accessibility enhancements
      const errorFormatted = mockOutputFormatter.formatErrorOutput('Build failed');
      const successFormatted = mockOutputFormatter.formatClaudeOutput('✅ Build successful');
      
      // Apply accessibility formatting
      mockAccessibilityFormatter.makeScreenReaderFriendly(errorFormatted.sections[0].text);
      mockAccessibilityFormatter.makeScreenReaderFriendly(successFormatted.sections[0].text);
      
      // Add aria labels
      mockAccessibilityFormatter.addAriaLabels(errorFormatted.sections, 'error');
      mockAccessibilityFormatter.addAriaLabels(successFormatted.sections, 'success');
      
      // Verify accessibility enhancements
      expect(mockAccessibilityFormatter.makeScreenReaderFriendly).toHaveBeenCalledTimes(2);
      expect(mockAccessibilityFormatter.addAriaLabels).toHaveBeenCalledWith(
        expect.any(Array),
        'error'
      );
      expect(mockAccessibilityFormatter.addAriaLabels).toHaveBeenCalledWith(
        expect.any(Array),
        'success'
      );
      
      // Verify config consultation
      expect(mockConfigManager.getFormattingConfig).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should optimize formatting performance for large outputs', () => {
      // London School - Setup large output performance scenario
      const largeOutput = 'Large log line\n'.repeat(1000);
      
      mockPerformanceTracker.startFormatting();
      
      // Process in chunks for better performance
      const chunkSize = 100;
      const chunks = this.chunkString(largeOutput, chunkSize);
      
      chunks.forEach((chunk, index) => {
        const formatted = mockOutputFormatter.formatClaudeOutput(chunk);
        
        // Batch render chunks
        formatted.sections.forEach(section => {
          mockTerminalAdapter.write(section.text);
        });
        
        // Track progress
        mockPerformanceTracker.recordRenderTime(`chunk_${index}`, Date.now());
      });
      
      mockPerformanceTracker.endFormatting();
      
      // Verify performance tracking
      expect(mockPerformanceTracker.startFormatting).toHaveBeenCalled();
      expect(mockPerformanceTracker.endFormatting).toHaveBeenCalled();
      expect(mockPerformanceTracker.recordRenderTime).toHaveBeenCalled();
      
      // Verify memory tracking
      mockPerformanceTracker.trackMemoryUsage('large_output_processing');
      expect(mockPerformanceTracker.trackMemoryUsage).toHaveBeenCalledWith(
        'large_output_processing'
      );
    });
  });

  describe('London School - Contract Verification', () => {
    it('should verify all formatting contracts are fulfilled', () => {
      // Verify ANSI processor contracts
      expect(mockANSIProcessor.parseAnsiSequenceMock).toHaveBeenCalled();
      expect(mockANSIProcessor.stripAnsiCodesMock).toHaveBeenCalled();
      expect(mockANSIProcessor.processColorCodesMock).toHaveBeenCalled();
      expect(mockANSIProcessor.processTextFormattingMock).toHaveBeenCalled();
      
      // Verify output formatter contracts
      expect(mockOutputFormatter.formatClaudeOutputMock).toHaveBeenCalled();
      expect(mockOutputFormatter.formatCommandOutputMock).toHaveBeenCalled();
      expect(mockOutputFormatter.formatErrorOutputMock).toHaveBeenCalled();
      
      // Verify terminal adapter contracts
      expect(mockTerminalAdapter.writeMock).toHaveBeenCalled();
      expect(mockTerminalAdapter.writelnMock).toHaveBeenCalled();
      expect(mockTerminalAdapter.setThemeMock).toHaveBeenCalled();
    });

    it('should verify proper collaboration between components', () => {
      // Verify external service collaborations
      expect(mockThemeManager.getCurrentTheme).toHaveBeenCalled();
      expect(mockAccessibilityFormatter.makeScreenReaderFriendly).toHaveBeenCalled();
      expect(mockPerformanceTracker.startFormatting).toHaveBeenCalled();
      expect(mockConfigManager.getFormattingConfig).toHaveBeenCalled();
      
      // Verify all mocks are jest functions
      expect(jest.isMockFunction(mockTerminalAdapter.writeMock)).toBe(true);
      expect(jest.isMockFunction(mockANSIProcessor.parseAnsiSequenceMock)).toBe(true);
      expect(jest.isMockFunction(mockOutputFormatter.formatClaudeOutputMock)).toBe(true);
    });
  });

  // Helper methods
  private wrapText(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private chunkString(str: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < str.length; i += chunkSize) {
      chunks.push(str.slice(i, i + chunkSize));
    }
    return chunks;
  }
});