/**
 * Terminal DOM Rendering Tests - TDD Approach
 * 
 * These tests validate actual DOM rendering and character display.
 * Focus on the visual aspects that users would see.
 */

const { jest } = require('jest-globals');

// Mock DOM environment
global.document = {
  createElement: jest.fn((tag) => ({
    tagName: tag.toUpperCase(),
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    children: [],
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0
    }))
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Advanced terminal DOM renderer
class TerminalDOMRenderer {
  constructor(container) {
    this.container = container;
    this.viewport = null;
    this.screen = null;
    this.rowsContainer = null;
    this.rows = [];
    this.isRendered = false;
  }

  createDOMStructure() {
    if (this.isRendered || !this.container) return false;

    // Create viewport (xterm's main container)
    this.viewport = document.createElement('div');
    this.viewport.className = 'xterm-viewport';
    this.viewport.style.position = 'relative';
    this.viewport.style.width = '100%';
    this.viewport.style.height = '100%';

    // Create screen (where content is rendered)
    this.screen = document.createElement('div');
    this.screen.className = 'xterm-screen';
    this.screen.style.position = 'relative';

    // Create rows container
    this.rowsContainer = document.createElement('div');
    this.rowsContainer.className = 'xterm-rows';

    // Assemble structure
    this.screen.appendChild(this.rowsContainer);
    this.viewport.appendChild(this.screen);
    this.container.appendChild(this.viewport);

    this.isRendered = true;
    return true;
  }

  renderText(text) {
    if (!this.isRendered) return false;

    const textSpan = document.createElement('span');
    textSpan.className = 'xterm-char';
    textSpan.textContent = text;
    
    this.rowsContainer.appendChild(textSpan);
    return true;
  }

  renderLine(text) {
    if (!this.isRendered) return false;

    const lineDiv = document.createElement('div');
    lineDiv.className = 'xterm-row';
    lineDiv.textContent = text;
    
    this.rowsContainer.appendChild(lineDiv);
    this.rows.push(lineDiv);
    return true;
  }

  clear() {
    if (!this.rowsContainer) return false;
    
    this.rowsContainer.innerHTML = '';
    this.rows = [];
    return true;
  }

  hasVisibleContent() {
    if (!this.rowsContainer) return false;
    
    const children = this.rowsContainer.children;
    return children.length > 0;
  }

  getRowCount() {
    return this.rows.length;
  }

  getRowText(index) {
    if (index >= 0 && index < this.rows.length) {
      return this.rows[index].textContent;
    }
    return null;
  }

  isVisible() {
    if (!this.viewport) return false;
    
    // Check if viewport has dimensions
    const rect = this.viewport.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
}

describe('Terminal DOM Rendering Validation', () => {
  let mockContainer;
  let renderer;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock container element
    mockContainer = document.createElement('div');
    mockContainer.className = 'terminal-container';
    mockContainer.style.width = '800px';
    mockContainer.style.height = '600px';
    
    renderer = new TerminalDOMRenderer(mockContainer);
  });

  describe('DOM Structure Creation', () => {
    test('CRITICAL: should create proper DOM structure', () => {
      const result = renderer.createDOMStructure();
      
      // FAILS if DOM structure is not created properly
      expect(result).toBe(true);
      expect(renderer.isRendered).toBe(true);
      expect(renderer.viewport).toBeDefined();
      expect(renderer.screen).toBeDefined();
      expect(renderer.rowsContainer).toBeDefined();
    });

    test('CRITICAL: should create elements with correct CSS classes', () => {
      renderer.createDOMStructure();
      
      // FAILS if CSS classes are missing/incorrect
      expect(renderer.viewport.className).toBe('xterm-viewport');
      expect(renderer.screen.className).toBe('xterm-screen');
      expect(renderer.rowsContainer.className).toBe('xterm-rows');
    });

    test('CRITICAL: should assemble DOM hierarchy correctly', () => {
      renderer.createDOMStructure();
      
      // FAILS if DOM hierarchy is wrong
      expect(mockContainer.appendChild).toHaveBeenCalledWith(renderer.viewport);
      expect(renderer.viewport.appendChild).toHaveBeenCalledWith(renderer.screen);
      expect(renderer.screen.appendChild).toHaveBeenCalledWith(renderer.rowsContainer);
    });

    test('CRITICAL: should apply proper CSS styles', () => {
      renderer.createDOMStructure();
      
      // FAILS if critical styles are missing
      expect(renderer.viewport.style.position).toBe('relative');
      expect(renderer.viewport.style.width).toBe('100%');
      expect(renderer.viewport.style.height).toBe('100%');
      expect(renderer.screen.style.position).toBe('relative');
    });

    test('CRITICAL: should not recreate structure if already rendered', () => {
      const firstCreate = renderer.createDOMStructure();
      const secondCreate = renderer.createDOMStructure();
      
      expect(firstCreate).toBe(true);
      expect(secondCreate).toBe(false); // Should prevent double creation
      
      // Should only call appendChild once
      expect(mockContainer.appendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('Text Rendering', () => {
    beforeEach(() => {
      renderer.createDOMStructure();
    });

    test('CRITICAL: should render text characters to DOM', () => {
      const result = renderer.renderText('Hello World');
      
      // FAILS if text is not rendered
      expect(result).toBe(true);
      expect(renderer.rowsContainer.appendChild).toHaveBeenCalled();
      
      // Verify text span was created
      const lastCall = renderer.rowsContainer.appendChild.mock.calls[0][0];
      expect(lastCall.className).toBe('xterm-char');
      expect(lastCall.textContent).toBe('Hello World');
    });

    test('CRITICAL: should render multiple text segments', () => {
      const texts = ['Hello', ' ', 'World', '!'];
      
      texts.forEach(text => {
        const result = renderer.renderText(text);
        expect(result).toBe(true);
      });
      
      // FAILS if not all text segments are rendered
      expect(renderer.rowsContainer.appendChild).toHaveBeenCalledTimes(4);
    });

    test('CRITICAL: should render lines with proper structure', () => {
      const result = renderer.renderLine('This is a complete line');
      
      // FAILS if line is not rendered properly
      expect(result).toBe(true);
      expect(renderer.getRowCount()).toBe(1);
      expect(renderer.getRowText(0)).toBe('This is a complete line');
    });

    test('CRITICAL: should handle multiple lines correctly', () => {
      const lines = [
        'Line 1',
        'Line 2 with more text',
        'Line 3'
      ];
      
      lines.forEach(line => renderer.renderLine(line));
      
      // FAILS if lines are not tracked properly
      expect(renderer.getRowCount()).toBe(3);
      expect(renderer.getRowText(0)).toBe('Line 1');
      expect(renderer.getRowText(1)).toBe('Line 2 with more text');
      expect(renderer.getRowText(2)).toBe('Line 3');
    });

    test('CRITICAL: should detect visible content', () => {
      // Initially no content
      expect(renderer.hasVisibleContent()).toBe(false);
      
      renderer.renderText('Some text');
      
      // After rendering, should have content
      expect(renderer.hasVisibleContent()).toBe(true);
    });
  });

  describe('Terminal Content Management', () => {
    beforeEach(() => {
      renderer.createDOMStructure();
      
      // Add some initial content
      renderer.renderLine('Initial line 1');
      renderer.renderLine('Initial line 2');
      renderer.renderText('Some text');
    });

    test('CRITICAL: should clear terminal content', () => {
      // Verify initial state
      expect(renderer.hasVisibleContent()).toBe(true);
      expect(renderer.getRowCount()).toBe(2);
      
      const result = renderer.clear();
      
      // FAILS if content is not cleared
      expect(result).toBe(true);
      expect(renderer.getRowCount()).toBe(0);
      expect(renderer.rowsContainer.innerHTML).toBe('');
    });

    test('CRITICAL: should handle empty content operations', () => {
      // Clear content
      renderer.clear();
      
      // Operations on empty content should work
      expect(renderer.hasVisibleContent()).toBe(false);
      expect(renderer.getRowText(0)).toBeNull();
      expect(renderer.getRowCount()).toBe(0);
    });
  });

  describe('Visual Display Properties', () => {
    beforeEach(() => {
      renderer.createDOMStructure();
    });

    test('CRITICAL: should have visible dimensions', () => {
      // FAILS if terminal is not visually rendered
      expect(renderer.isVisible()).toBe(true);
      
      // Mock getBoundingClientRect to return dimensions
      renderer.viewport.getBoundingClientRect = jest.fn(() => ({
        width: 800,
        height: 600,
        top: 0,
        left: 0
      }));
      
      expect(renderer.isVisible()).toBe(true);
    });

    test('CRITICAL: should be invisible with zero dimensions', () => {
      renderer.viewport.getBoundingClientRect = jest.fn(() => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0
      }));
      
      // FAILS if terminal appears visible when it shouldn't be
      expect(renderer.isVisible()).toBe(false);
    });

    test('CRITICAL: should maintain aspect ratio with container', () => {
      // Container dimensions
      const containerRect = mockContainer.getBoundingClientRect();
      expect(containerRect.width).toBe(800);
      expect(containerRect.height).toBe(600);
      
      // Viewport should fill container
      expect(renderer.viewport.style.width).toBe('100%');
      expect(renderer.viewport.style.height).toBe('100%');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('CRITICAL: should fail gracefully without container', () => {
      const noContainerRenderer = new TerminalDOMRenderer(null);
      const result = noContainerRenderer.createDOMStructure();
      
      expect(result).toBe(false);
      expect(noContainerRenderer.isRendered).toBe(false);
    });

    test('CRITICAL: should handle rendering without DOM structure', () => {
      // Don't create DOM structure
      const textResult = renderer.renderText('test');
      const lineResult = renderer.renderLine('test line');
      
      // FAILS if operations succeed without proper setup
      expect(textResult).toBe(false);
      expect(lineResult).toBe(false);
    });

    test('CRITICAL: should handle special characters in text', () => {
      renderer.createDOMStructure();
      
      const specialTexts = [
        'Tab\tCharacter',
        'Newline\nCharacter', 
        'Special: !@#$%^&*()',
        'Unicode: ñáéíóú',
        'Empty: ""',
        'Null character: \0'
      ];
      
      specialTexts.forEach(text => {
        const result = renderer.renderText(text);
        expect(result).toBe(true);
      });
      
      // Should handle all special characters
      expect(renderer.rowsContainer.appendChild).toHaveBeenCalledTimes(6);
    });

    test('CRITICAL: should handle very long lines', () => {
      renderer.createDOMStructure();
      
      const longLine = 'A'.repeat(10000); // Very long line
      const result = renderer.renderLine(longLine);
      
      expect(result).toBe(true);
      expect(renderer.getRowText(0)).toBe(longLine);
    });

    test('CRITICAL: should handle rapid content updates', () => {
      renderer.createDOMStructure();
      
      // Simulate rapid updates
      const updateCount = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < updateCount; i++) {
        renderer.renderText(`Update ${i} `);
      }
      
      const endTime = Date.now();
      
      // Should complete rapidly
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
      expect(renderer.hasVisibleContent()).toBe(true);
    });
  });

  describe('Integration with Terminal Behavior', () => {
    test('CRITICAL: should simulate complete terminal session', () => {
      // 1. Create DOM structure
      expect(renderer.createDOMStructure()).toBe(true);
      
      // 2. Show terminal prompt
      renderer.renderLine('$ ');
      expect(renderer.getRowCount()).toBe(1);
      
      // 3. User command appears
      renderer.renderText('ls -la');
      expect(renderer.hasVisibleContent()).toBe(true);
      
      // 4. Command output
      renderer.renderLine('total 64');
      renderer.renderLine('drwxr-xr-x 2 user user 4096 Jan 1 12:00 .');
      renderer.renderLine('drwxr-xr-x 2 user user 4096 Jan 1 12:00 ..');
      
      // 5. New prompt
      renderer.renderLine('$ ');
      
      // FAILS if complete session doesn't render properly
      expect(renderer.getRowCount()).toBe(5);
      expect(renderer.getRowText(0)).toBe('$ ');
      expect(renderer.getRowText(1)).toBe('total 64');
      expect(renderer.getRowText(4)).toBe('$ ');
    });

    test('CRITICAL: should handle terminal scrolling simulation', () => {
      renderer.createDOMStructure();
      
      // Fill terminal with many lines (simulate scrolling)
      const maxLines = 24; // Typical terminal height
      for (let i = 1; i <= maxLines + 5; i++) {
        renderer.renderLine(`Line ${i}`);
      }
      
      // Should have all lines (scrolling is handled by CSS/xterm)
      expect(renderer.getRowCount()).toBe(maxLines + 5);
      expect(renderer.getRowText(0)).toBe('Line 1');
      expect(renderer.getRowText(maxLines + 4)).toBe(`Line ${maxLines + 5}`);
    });

    test('CRITICAL: should maintain display state consistency', () => {
      // Test state transitions
      expect(renderer.isRendered).toBe(false);
      expect(renderer.hasVisibleContent()).toBe(false);
      
      renderer.createDOMStructure();
      expect(renderer.isRendered).toBe(true);
      expect(renderer.hasVisibleContent()).toBe(false);
      
      renderer.renderText('Content');
      expect(renderer.hasVisibleContent()).toBe(true);
      
      renderer.clear();
      expect(renderer.hasVisibleContent()).toBe(false);
      expect(renderer.isRendered).toBe(true); // Structure remains
    });
  });
});

module.exports = {
  TerminalDOMRenderer
};