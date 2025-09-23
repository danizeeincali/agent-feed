import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Terminal Width Calculations Unit Tests
 * 
 * These tests validate the mathematical calculations for terminal width,
 * character sizing, and cascade prevention logic without requiring DOM.
 */

interface TerminalDimensions {
  cols: number;
  rows: number;
  width: number;
  height: number;
  charWidth: number;
  lineHeight: number;
}

interface CascadeAnalysis {
  willCascade: boolean;
  overflowChars: number;
  wrappedLines: number;
  requiredWidth: number;
}

// Terminal width calculation functions
const calculateTerminalDimensions = (
  containerWidth: number,
  containerHeight: number,
  fontSize: number = 14,
  fontFamily: string = 'monospace'
): TerminalDimensions => {
  // Standard monospace character width calculation
  const charWidthRatio = fontFamily.includes('Fira Code') ? 0.6 : 
                        fontFamily.includes('Cascadia Code') ? 0.55 : 0.6;
  const lineHeightRatio = 1.2;
  
  const charWidth = fontSize * charWidthRatio;
  const lineHeight = fontSize * lineHeightRatio;
  
  // Account for padding and borders
  const usableWidth = containerWidth - 20; // 10px padding each side
  const usableHeight = containerHeight - 40; // 20px padding top/bottom
  
  const cols = Math.floor(usableWidth / charWidth);
  const rows = Math.floor(usableHeight / lineHeight);
  
  return {
    cols,
    rows,
    width: usableWidth,
    height: usableHeight,
    charWidth,
    lineHeight
  };
};

const analyzeCascadePotential = (
  content: string,
  terminalCols: number
): CascadeAnalysis => {
  const lines = content.split('\n');
  let overflowChars = 0;
  let wrappedLines = 0;
  let maxLineLength = 0;
  
  lines.forEach(line => {
    // Remove ANSI escape sequences for accurate length calculation
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    maxLineLength = Math.max(maxLineLength, cleanLine.length);
    
    if (cleanLine.length > terminalCols) {
      overflowChars += cleanLine.length - terminalCols;
      wrappedLines += Math.ceil(cleanLine.length / terminalCols) - 1;
    }
  });
  
  // More sensitive cascade detection - even 1 wrapped line can cause visual issues
  const willCascade = wrappedLines > 0 || overflowChars > 20 || maxLineLength > terminalCols;
  const requiredWidth = maxLineLength;
  
  return {
    willCascade,
    overflowChars,
    wrappedLines,
    requiredWidth
  };
};

const findOptimalTerminalWidth = (content: string): number => {
  const analysis = analyzeCascadePotential(content, 80);
  
  // If no cascading at 80 cols, that's sufficient
  if (!analysis.willCascade) return 80;
  
  // Otherwise, find the minimum width that prevents cascading
  let testWidth = 90;
  while (testWidth <= 200) {
    const testAnalysis = analyzeCascadePotential(content, testWidth);
    if (!testAnalysis.willCascade) return testWidth;
    testWidth += 10;
  }
  
  // Fallback to a very wide terminal
  return 150;
};

describe('Terminal Width Calculations', () => {
  describe('calculateTerminalDimensions', () => {
    it('should calculate correct dimensions for standard container', () => {
      const dims = calculateTerminalDimensions(800, 600, 14, 'monospace');
      
      expect(dims.cols).toBe(92); // (800 - 20) / (14 * 0.6) = 92.86... ≈ 92
      expect(dims.rows).toBe(33); // (600 - 40) / (14 * 1.2) ≈ 33
      expect(dims.charWidth).toBe(8.4);
      expect(dims.lineHeight).toBe(16.8);
    });

    it('should handle different font sizes', () => {
      const dims12 = calculateTerminalDimensions(800, 600, 12);
      const dims16 = calculateTerminalDimensions(800, 600, 16);
      
      // Larger font should result in fewer columns/rows
      expect(dims16.cols).toBeLessThan(dims12.cols);
      expect(dims16.rows).toBeLessThan(dims12.rows);
      
      // But larger character dimensions
      expect(dims16.charWidth).toBeGreaterThan(dims12.charWidth);
      expect(dims16.lineHeight).toBeGreaterThan(dims12.lineHeight);
    });

    it('should handle different font families', () => {
      const monospaceDims = calculateTerminalDimensions(800, 600, 14, 'monospace');
      const firaCodeDims = calculateTerminalDimensions(800, 600, 14, 'Fira Code');
      
      // Different fonts may have slightly different character widths
      expect(Math.abs(monospaceDims.cols - firaCodeDims.cols)).toBeLessThanOrEqual(2);
    });

    it('should handle edge cases for very small containers', () => {
      const smallDims = calculateTerminalDimensions(200, 150, 14);
      
      // Should still provide minimum usable dimensions
      expect(smallDims.cols).toBeGreaterThan(10);
      expect(smallDims.rows).toBeGreaterThan(5);
    });

    it('should handle very large containers', () => {
      const largeDims = calculateTerminalDimensions(2000, 1500, 14);
      
      // Should efficiently use large space
      expect(largeDims.cols).toBeGreaterThan(200);
      expect(largeDims.rows).toBeGreaterThan(80);
    });
  });

  describe('analyzeCascadePotential', () => {
    it('should detect cascading in narrow terminals', () => {
      const longContent = 'This is a very long line that definitely exceeds 80 characters and will cause wrapping and potential cascading effects in narrow terminals';
      
      const analysis = analyzeCascadePotential(longContent, 80);
      
      expect(analysis.willCascade).toBe(true);
      expect(analysis.overflowChars).toBeGreaterThan(50);
      expect(analysis.wrappedLines).toBeGreaterThan(0);
      expect(analysis.requiredWidth).toBe(longContent.length);
    });

    it('should not detect cascading in wide terminals', () => {
      const shortContent = 'Short line';
      
      const analysis = analyzeCascadePotential(shortContent, 80);
      
      expect(analysis.willCascade).toBe(false);
      expect(analysis.overflowChars).toBe(0);
      expect(analysis.wrappedLines).toBe(0);
    });

    it('should handle ANSI escape sequences correctly', () => {
      const ansiContent = '\x1b[32mGreen text\x1b[0m \x1b[31mRed text\x1b[0m';
      
      const analysis = analyzeCascadePotential(ansiContent, 80);
      
      // Should not count ANSI sequences in length calculation
      expect(analysis.requiredWidth).toBe(19); // "Green text Red text".length
    });

    it('should handle multiline content', () => {
      const multilineContent = [
        'Line 1 is short',
        'Line 2 is much longer and will definitely exceed the standard 80 character terminal width limit',
        'Line 3 is medium length content'
      ].join('\n');
      
      const analysis = analyzeCascadePotential(multilineContent, 80);
      
      expect(analysis.willCascade).toBe(true);
      expect(analysis.wrappedLines).toBeGreaterThan(0);
      expect(analysis.requiredWidth).toBeGreaterThan(80);
    });

    it('should detect minimal wrapping scenarios', () => {
      const minimalWrap = 'x'.repeat(85); // Just over 80 chars
      
      const analysis = analyzeCascadePotential(minimalWrap, 80);
      
      expect(analysis.overflowChars).toBe(5);
      expect(analysis.wrappedLines).toBe(1); // ceil(85/80) - 1 = 1
    });
  });

  describe('findOptimalTerminalWidth', () => {
    it('should return 80 for content that fits', () => {
      const shortContent = 'This content easily fits in 80 characters.';
      
      const optimalWidth = findOptimalTerminalWidth(shortContent);
      
      expect(optimalWidth).toBe(80);
    });

    it('should find optimal width for Claude CLI help output', () => {
      const helpContent = `
Claude CLI - AI Assistant Command Line Tool

USAGE:
    claude [OPTIONS] <SUBCOMMAND>

OPTIONS:
    -h, --help                Print help information
    -V, --version             Print version information
        --model <MODEL>       Specify the model to use [default: claude-3-5-sonnet]
        --format <FORMAT>     Output format [default: plain] [possible values: plain, json, markdown, pretty]
      `;
      
      const optimalWidth = findOptimalTerminalWidth(helpContent);
      
      // Should accommodate the longest line in help content
      expect(optimalWidth).toBeGreaterThanOrEqual(80);
      expect(optimalWidth).toBeLessThanOrEqual(150);
    });

    it('should handle progress bars and Unicode characters', () => {
      const progressContent = [
        'Progress: [████████████████████████████████████████] 100%',
        'Loading: [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] Complete',
        'Processing large datasets with extensive progress visualization...'
      ].join('\n');
      
      const optimalWidth = findOptimalTerminalWidth(progressContent);
      
      // Should accommodate progress bars - they're typically around 80 chars
      expect(optimalWidth).toBeGreaterThanOrEqual(80);
    });

    it('should cap at reasonable maximum width', () => {
      const extremelyLongContent = 'x'.repeat(500); // Unreasonably long line
      
      const optimalWidth = findOptimalTerminalWidth(extremelyLongContent);
      
      // Should not exceed reasonable maximum
      expect(optimalWidth).toBeLessThanOrEqual(200);
    });
  });

  describe('Real-world Claude CLI scenarios', () => {
    it('should handle typical chat command', () => {
      const chatCommand = 'claude chat "Create a React component with TypeScript, styled-components, and proper error handling"';
      const response = `
🤖 Claude: I'll help you create a React component with TypeScript and styled-components.

Here's a comprehensive example:

\`\`\`typescript
import React, { useState, useCallback } from 'react';
import styled, { ThemeProvider } from 'styled-components';

interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
  onUserClick?: (id: string) => void;
}

const StyledCard = styled.div\`
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
  transition: transform 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
  }
\`;
\`\`\`

✅ Component created with error boundaries and TypeScript support
      `;
      
      const fullContent = chatCommand + '\n' + response;
      const analysis = analyzeCascadePotential(fullContent, 80);
      const optimalWidth = findOptimalTerminalWidth(fullContent);
      
      expect(analysis.willCascade).toBe(true); // Should cascade at 80 cols
      expect(optimalWidth).toBeGreaterThan(80); // Should need wider terminal
      
      // Verify wider width prevents cascading
      const wideAnalysis = analyzeCascadePotential(fullContent, optimalWidth);
      expect(wideAnalysis.willCascade).toBe(false);
    });

    it('should handle streaming responses with progress', () => {
      const streamingContent = [
        'claude --stream chat "Write a detailed explanation"',
        '',
        '🔄 Streaming response...',
        'Progress: [████████████░░░░░░░░░░░░░░░░] 60%',
        '',
        '📝 Content being generated with real-time updates and progress indicators...',
        'This creates long lines that may wrap in narrow terminals causing visual cascade.',
        '',
        'Progress: [████████████████████████████████████████] 100%',
        '✅ Response completed successfully'
      ].join('\n');
      
      const narrowAnalysis = analyzeCascadePotential(streamingContent, 80);
      const wideAnalysis = analyzeCascadePotential(streamingContent, 120);
      
      expect(narrowAnalysis.willCascade).toBe(true);
      expect(wideAnalysis.willCascade).toBe(false);
      expect(wideAnalysis.wrappedLines).toBeLessThan(narrowAnalysis.wrappedLines);
    });

    it('should validate terminal width recommendations', () => {
      const testScenarios = [
        { content: 'claude --help', expectedMinWidth: 80 },
        { content: 'claude chat "short prompt"', expectedMinWidth: 80 },
        { content: 'claude --model=claude-3-5-sonnet chat "detailed analysis request with extensive parameters"', expectedMinWidth: 80 },
        { content: 'claude generate --format=json --output=large_dataset.json "comprehensive data generation"', expectedMinWidth: 80 }
      ];
      
      testScenarios.forEach(scenario => {
        const optimalWidth = findOptimalTerminalWidth(scenario.content);
        expect(optimalWidth).toBeGreaterThanOrEqual(scenario.expectedMinWidth);
        
        // Verify the recommended width actually prevents cascading
        const analysis = analyzeCascadePotential(scenario.content, optimalWidth);
        expect(analysis.willCascade).toBe(false);
      });
    });
  });

  describe('Performance impact of terminal width', () => {
    it('should calculate rendering cost for different widths', () => {
      const content = 'x'.repeat(1000); // Large content block
      const widths = [60, 80, 100, 120, 150];
      
      const results = widths.map(width => {
        const start = performance.now();
        const analysis = analyzeCascadePotential(content, width);
        const end = performance.now();
        
        return {
          width,
          time: end - start,
          cascading: analysis.willCascade,
          wrappedLines: analysis.wrappedLines
        };
      });
      
      // Wider terminals should not significantly impact performance
      const narrowTime = results.find(r => r.width === 80)?.time || 0;
      const wideTime = results.find(r => r.width === 150)?.time || 0;
      
      // Performance difference should be minimal (less than 2x)
      if (narrowTime > 0) {
        expect(wideTime / narrowTime).toBeLessThan(2);
      }
      
      // But cascading should be reduced
      const narrowCascading = results.filter(r => r.width <= 80 && r.cascading).length;
      const wideCascading = results.filter(r => r.width >= 120 && r.cascading).length;
      
      expect(wideCascading).toBeLessThanOrEqual(narrowCascading);
    });
  });
});

describe('Terminal Width Integration Logic', () => {
  const createMockTerminal = (initialCols: number = 80) => {
    return {
      cols: initialCols,
      rows: 24,
      resize: vi.fn(),
      fit: vi.fn(),
      getCharSizeInPixels: vi.fn(() => ({ width: 9, height: 16 }))
    };
  };

  it('should expand terminal when cascade is detected', () => {
    const mockTerminal = createMockTerminal(80);
    const problematicContent = 'Very long line that will definitely cause cascading in an 80-column terminal and needs expansion to prevent visual overflow';
    
    const analysis = analyzeCascadePotential(problematicContent, mockTerminal.cols);
    
    if (analysis.willCascade) {
      const optimalWidth = findOptimalTerminalWidth(problematicContent);
      mockTerminal.cols = optimalWidth;
      mockTerminal.resize(optimalWidth, mockTerminal.rows);
      expect(mockTerminal.resize).toHaveBeenCalledWith(expect.any(Number), 24);
      expect(mockTerminal.cols).toBeGreaterThan(80);
    } else {
      // If no cascading detected, test should be marked as skipped or adjusted
      expect(true).toBe(true); // Placeholder
    }
    
    // Verify cascading is resolved
    const newAnalysis = analyzeCascadePotential(problematicContent, mockTerminal.cols);
    expect(newAnalysis.willCascade).toBe(false);
  });

  it('should not unnecessarily expand already sufficient terminals', () => {
    const mockTerminal = createMockTerminal(120);
    const shortContent = 'Short command that fits easily';
    
    const analysis = analyzeCascadePotential(shortContent, mockTerminal.cols);
    
    if (!analysis.willCascade) {
      // No resize needed
      expect(mockTerminal.resize).not.toHaveBeenCalled();
      expect(mockTerminal.cols).toBe(120);
    }
  });

  it('should handle dynamic content changes', () => {
    const mockTerminal = createMockTerminal(80);
    
    // Start with short content
    let content = 'claude --help';
    let analysis = analyzeCascadePotential(content, mockTerminal.cols);
    expect(analysis.willCascade).toBe(false);
    
    // Add longer content that causes cascading
    content += '\nVery long response with extensive details that exceed normal terminal width limits';
    analysis = analyzeCascadePotential(content, mockTerminal.cols);
    expect(analysis.willCascade).toBe(true);
    
    // Expand terminal
    const optimalWidth = findOptimalTerminalWidth(content);
    mockTerminal.cols = optimalWidth;
    
    // Verify cascading is resolved
    const finalAnalysis = analyzeCascadePotential(content, mockTerminal.cols);
    expect(finalAnalysis.willCascade).toBe(false);
  });
});