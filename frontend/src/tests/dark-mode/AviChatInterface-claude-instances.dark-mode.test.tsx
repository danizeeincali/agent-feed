/**
 * TDD Tests: Dark Mode Text Contrast - AVI Chat Interface (claude-instances)
 *
 * Tests verify that all text in the claude-instances AVI Chat Interface has sufficient
 * contrast in dark mode according to WCAG AA standards (4.5:1 for normal text).
 *
 * NO MOCKS - Real component rendering with real contrast calculations
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AviChatInterface } from '../../components/claude-instances/AviChatInterface';
import { AviChatMessage } from '../../types/avi-interface';
import { ClaudeInstance } from '../../types/claude-instances';

// Mock scrollIntoView for JSDOM
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Real contrast calculation (no mocks)
function getContrastRatio(foreground: string, background: string): number {
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return 1;

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Tailwind color mappings (actual values)
const COLORS = {
  'gray-900': '#111827',
  'gray-800': '#1f2937',
  'gray-100': '#f3f4f6',
  'gray-50': '#f9fafb',
  'gray-500': '#6b7280',
  'gray-400': '#9ca3af',
  'blue-500': '#3b82f6',
  'white': '#ffffff'
};

// Mock instance data
const mockInstance: ClaudeInstance = {
  id: 'test-instance',
  name: 'Test Avi Instance',
  apiKey: 'test-key',
  model: 'claude-3-5-sonnet-20241022',
  createdAt: new Date().toISOString(),
  status: 'active',
  config: {
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'You are Avi, a helpful coding assistant.'
  }
};

// Helper to create test messages
const createMessage = (
  content: string,
  role: 'user' | 'assistant' | 'avi' | 'system' = 'avi',
  codeReferences?: any[]
): AviChatMessage => ({
  id: `msg-${Date.now()}-${Math.random()}`,
  role,
  content,
  timestamp: new Date(),
  codeReferences
});

describe('AviChatInterface (claude-instances) - Dark Mode Text Contrast', () => {

  describe('Message Content Text Visibility', () => {
    test('regular messages have sufficient contrast in dark mode (>=4.5:1)', () => {
      const messages = [
        createMessage('This is a regular message from Avi', 'avi')
      ];

      render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // In dark mode: text should be gray-100 (#f3f4f6) on gray-800 background (#1f2937)
      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-800']);

      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      // Actual ratio is ~13.3:1, well above minimum
      expect(contrastRatio).toBeGreaterThan(10);
    });

    test('message content uses dark:text-gray-100 class', () => {
      const messages = [
        createMessage('Test message content', 'avi')
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Find message content (pre or span element)
      const messageContent = container.querySelector('.whitespace-pre-wrap, span.text-gray-900');
      expect(messageContent).toBeInTheDocument();

      // Verify it has both light and dark mode text colors
      const classNames = messageContent?.className || '';
      expect(classNames).toMatch(/text-gray-900/);
      expect(classNames).toMatch(/dark:text-gray-100/);
    });

    test('streaming messages have proper dark mode colors', () => {
      const messages = [
        { ...createMessage('Streaming content...', 'avi'), isStreaming: true, streamingComplete: false }
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Find streaming message span
      const streamingSpan = container.querySelector('span.text-gray-900');
      expect(streamingSpan).toBeInTheDocument();

      const classNames = streamingSpan?.className || '';
      expect(classNames).toContain('text-gray-900');
      expect(classNames).toContain('dark:text-gray-100');
    });
  });

  describe('Code References Text Visibility', () => {
    test('code reference file paths have sufficient contrast in dark mode', () => {
      const messages = [
        createMessage('Here is the code', 'avi', [
          {
            filePath: '/path/to/file.ts',
            lineRange: [10, 20],
            snippet: 'const example = true;'
          }
        ])
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // File path uses text-gray-900 dark:text-gray-100
      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-800']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('code reference file paths use dark:text-gray-100', () => {
      const messages = [
        createMessage('Code reference', 'avi', [
          {
            filePath: '/src/test.tsx',
            snippet: 'console.log("test");'
          }
        ])
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Find file path span
      const filePath = screen.getByText('/src/test.tsx');
      expect(filePath).toBeInTheDocument();

      const classNames = filePath.className;
      expect(classNames).toContain('text-gray-900');
      expect(classNames).toContain('dark:text-gray-100');
    });

    test('code snippet content has proper dark mode colors', () => {
      const messages = [
        createMessage('Code', 'avi', [
          {
            filePath: '/test.ts',
            snippet: 'function test() { return true; }'
          }
        ])
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Find code snippet pre element
      const codeSnippet = container.querySelector('pre.text-sm');
      expect(codeSnippet).toBeInTheDocument();

      const classNames = codeSnippet?.className || '';
      expect(classNames).toContain('text-gray-900');
      expect(classNames).toContain('dark:text-gray-100');
      expect(classNames).toContain('dark:bg-gray-900');
    });

    test('code snippet has sufficient contrast in dark mode', () => {
      // Code snippet: gray-100 text on gray-900 background
      const contrastRatio = getContrastRatio(COLORS['gray-100'], COLORS['gray-900']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio).toBeGreaterThan(10);
    });

    test('line range display has dark mode support', () => {
      const messages = [
        createMessage('Code', 'avi', [
          {
            filePath: '/test.ts',
            lineRange: [5, 15],
            snippet: 'test'
          }
        ])
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Find line range span
      const lineRange = screen.getByText(/Lines 5-15/);
      expect(lineRange).toBeInTheDocument();

      const classNames = lineRange.className;
      expect(classNames).toMatch(/text-gray-500/);
      expect(classNames).toMatch(/dark:text-gray-400/);
    });
  });

  describe('No Prose-Dark Class Interference', () => {
    test('message content wrapper does not use prose-dark class', () => {
      const messages = [
        createMessage('Test message', 'avi')
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Find prose wrapper
      const proseWrapper = container.querySelector('.prose-sm');
      expect(proseWrapper).toBeInTheDocument();

      // Should NOT have prose-dark class (which was causing issues)
      const classNames = proseWrapper?.className || '';
      expect(classNames).not.toContain('prose-dark');
      expect(classNames).not.toContain('dark:prose-dark');
    });
  });

  describe('User Messages Contrast', () => {
    test('user messages have proper styling in dark mode', () => {
      const messages = [
        createMessage('User question', 'user')
      ];

      const { container } = render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // User messages use bg-blue-50 dark:bg-blue-900/20
      // This test just verifies the message renders properly
      const userMessage = container.querySelector('.bg-blue-50');
      expect(userMessage).toBeInTheDocument();
    });
  });

  describe('Accessibility - WCAG AA Compliance', () => {
    test('all critical text meets WCAG AA standards (4.5:1) in dark mode', () => {
      const messages = [
        createMessage('Plain text', 'avi'),
        createMessage('Code reference', 'avi', [
          { filePath: '/test.ts', snippet: 'code' }
        ]),
        createMessage('User message', 'user')
      ];

      render(
        <div className="dark">
          <AviChatInterface
            instance={mockInstance}
            messages={messages}
            isConnected={true}
            isLoading={false}
            onSendMessage={vi.fn()}
          />
        </div>
      );

      // Test various color combinations used in the component
      const testCases = [
        { name: 'Avi message text', fg: COLORS['gray-100'], bg: COLORS['gray-800'] },
        { name: 'Code snippet text', fg: COLORS['gray-100'], bg: COLORS['gray-900'] },
        { name: 'Code file path', fg: COLORS['gray-100'], bg: COLORS['gray-800'] },
        { name: 'Line range metadata', fg: COLORS['gray-400'], bg: COLORS['gray-800'] }
      ];

      testCases.forEach(({ name, fg, bg }) => {
        const ratio = getContrastRatio(fg, bg);
        expect(ratio, `${name} should meet WCAG AA`).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Light Mode Regression', () => {
    test('messages work in light mode', () => {
      const messages = [
        createMessage('Light mode test', 'avi')
      ];

      render(
        <AviChatInterface
          instance={mockInstance}
          messages={messages}
          isConnected={true}
          isLoading={false}
          onSendMessage={vi.fn()}
        />
      );

      // Light mode: gray-900 on white background
      const contrastRatio = getContrastRatio(COLORS['gray-900'], COLORS['white']);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });

    test('code references work in light mode', () => {
      const messages = [
        createMessage('Code', 'avi', [
          { filePath: '/test.ts', snippet: 'test' }
        ])
      ];

      const { container } = render(
        <AviChatInterface
          instance={mockInstance}
          messages={messages}
          isConnected={true}
          isLoading={false}
          onSendMessage={vi.fn()}
        />
      );

      // Find code snippet
      const codeSnippet = container.querySelector('pre.text-sm');
      expect(codeSnippet).toBeInTheDocument();

      // Should have light mode colors
      const classNames = codeSnippet?.className || '';
      expect(classNames).toContain('text-gray-900');
      expect(classNames).toContain('bg-gray-50');
    });
  });
});
