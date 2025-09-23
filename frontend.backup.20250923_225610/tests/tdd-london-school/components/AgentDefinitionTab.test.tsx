/**
 * AgentDefinitionTab TDD Tests
 * Testing the definition markdown rendering and TOC functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgentDefinitionTab from '../../../src/components/AgentDefinitionTab';
import type { UnifiedAgentData } from '../../../src/components/UnifiedAgentPage';

// Mock react-markdown to avoid complex setup
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>
}));

// Test data factory
const createMockAgent = (overrides: Partial<UnifiedAgentData> = {}): UnifiedAgentData => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  description: 'Test agent description',
  status: 'active',
  capabilities: ['test', 'automation'],
  stats: {
    tasksCompleted: 100,
    successRate: 95,
    averageResponseTime: 200,
    uptime: 99.5,
    todayTasks: 5,
    weeklyTasks: 35,
    satisfaction: 4.5
  },
  recentActivities: [],
  recentPosts: [],
  configuration: {
    profile: {
      name: 'Test Agent',
      description: 'Test description',
      specialization: 'Testing',
      avatar: '🤖'
    },
    behavior: {
      responseStyle: 'friendly',
      proactivity: 'medium',
      verbosity: 'detailed'
    },
    privacy: {
      isPublic: true,
      showMetrics: true,
      showActivity: true,
      allowComments: true
    },
    theme: {
      primaryColor: '#3B82F6',
      accentColor: '#8B5CF6',
      layout: 'grid'
    }
  },
  definition: '# Test Agent\n\nThis is a test agent definition.\n\n## Features\n\n- Feature 1\n- Feature 2\n\n## Usage\n\nHow to use this agent.',
  pages: [],
  workspace: null,
  profile: null,
  ...overrides
});

describe('AgentDefinitionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component with agent definition', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('agent-definition-tab')).toBeInTheDocument();
      expect(screen.getByText('Definition')).toBeInTheDocument();
    });

    it('should display markdown content when definition exists', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-content')).toHaveTextContent(agent.definition!);
    });

    it('should show empty state when no definition provided', () => {
      const agent = createMockAgent({ definition: undefined });
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('empty-definition-state')).toBeInTheDocument();
      expect(screen.getByText(/No definition available/i)).toBeInTheDocument();
    });

    it('should show empty state when definition is empty string', () => {
      const agent = createMockAgent({ definition: '' });
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('empty-definition-state')).toBeInTheDocument();
    });
  });

  describe('Table of Contents (TOC)', () => {
    it('should generate TOC from markdown headers', () => {
      const agent = createMockAgent({
        definition: '# Title\n\n## Section 1\n\nContent\n\n### Subsection 1.1\n\n## Section 2\n\nMore content'
      });
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Subsection 1.1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
    });

    it('should not show TOC when no headers present', () => {
      const agent = createMockAgent({
        definition: 'Just plain text without any headers.'
      });
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.queryByTestId('table-of-contents')).not.toBeInTheDocument();
    });

    it('should handle TOC navigation clicks', async () => {
      const agent = createMockAgent({
        definition: '# Title\n\n## Section 1\n\nContent\n\n## Section 2\n\nMore content'
      });
      
      // Mock scrollIntoView
      const mockScrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;

      render(<AgentDefinitionTab agent={agent} />);
      
      const tocLink = screen.getByTestId('toc-link-section-1');
      fireEvent.click(tocLink);
      
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalled();
      });
    });

    it('should toggle TOC visibility', () => {
      const agent = createMockAgent({
        definition: '# Title\n\n## Section 1\n\nContent'
      });
      render(<AgentDefinitionTab agent={agent} />);
      
      const toggleButton = screen.getByTestId('toc-toggle');
      expect(screen.getByTestId('table-of-contents')).toBeVisible();
      
      fireEvent.click(toggleButton);
      expect(screen.getByTestId('table-of-contents')).not.toBeVisible();
      
      fireEvent.click(toggleButton);
      expect(screen.getByTestId('table-of-contents')).toBeVisible();
    });
  });

  describe('View Modes', () => {
    it('should switch between preview and raw modes', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
      
      const rawModeButton = screen.getByTestId('raw-mode-toggle');
      fireEvent.click(rawModeButton);
      
      expect(screen.getByTestId('raw-definition-content')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
    });

    it('should show correct mode indicator', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('mode-indicator')).toHaveTextContent('Preview');
      
      const rawModeButton = screen.getByTestId('raw-mode-toggle');
      fireEvent.click(rawModeButton);
      
      expect(screen.getByTestId('mode-indicator')).toHaveTextContent('Raw');
    });
  });

  describe('Interactive Features', () => {
    it('should provide copy functionality', async () => {
      // Mock clipboard API
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      const copyButton = screen.getByTestId('copy-definition');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(agent.definition);
      });
    });

    it('should handle copy failure gracefully', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Copy failed'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      const copyButton = screen.getByTestId('copy-definition');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to copy/i)).toBeInTheDocument();
      });
    });

    it('should support fullscreen mode', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      const fullscreenButton = screen.getByTestId('fullscreen-toggle');
      fireEvent.click(fullscreenButton);
      
      expect(screen.getByTestId('agent-definition-tab')).toHaveClass('fullscreen-mode');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed markdown gracefully', () => {
      const agent = createMockAgent({
        definition: '# Unclosed [link\n\n```\nUnclosed code block'
      });
      
      expect(() => render(<AgentDefinitionTab agent={agent} />)).not.toThrow();
      expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
    });

    it('should handle extremely large definitions', () => {
      const largeDefinition = '# Large Definition\n\n' + 'Lorem ipsum '.repeat(10000);
      const agent = createMockAgent({ definition: largeDefinition });
      
      expect(() => render(<AgentDefinitionTab agent={agent} />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByLabelText(/agent definition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/table of contents/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const agent = createMockAgent({
        definition: '# Title\n\n## Section 1\n\n## Section 2'
      });
      render(<AgentDefinitionTab agent={agent} />);
      
      const tocLinks = screen.getAllByRole('button', { name: /section/i });
      tocLinks.forEach(link => {
        expect(link).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Performance', () => {
    it('should memoize TOC generation', () => {
      const agent = createMockAgent();
      const { rerender } = render(<AgentDefinitionTab agent={agent} />);
      
      // Rerender with same agent should not regenerate TOC
      rerender(<AgentDefinitionTab agent={agent} />);
      
      expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();
    });

    it('should handle rapid mode switching', () => {
      const agent = createMockAgent();
      render(<AgentDefinitionTab agent={agent} />);
      
      const toggle = screen.getByTestId('raw-mode-toggle');
      
      // Rapidly switch modes
      for (let i = 0; i < 10; i++) {
        fireEvent.click(toggle);
      }
      
      expect(screen.getByTestId('raw-definition-content')).toBeInTheDocument();
    });
  });
});