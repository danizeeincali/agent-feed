/**
 * TDD London School Tests for AgentDefinitionTab Component
 * SPARC Phase 4A: Test-Driven Development Implementation
 * 
 * Test Coverage: Markdown rendering, table of contents, view toggle, copy/download functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentDefinitionTab } from '../../../frontend/src/components/AgentDefinitionTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn()
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('AgentDefinitionTab - TDD London School', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockClipboard.writeText.mockClear();
    
    mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      display_name: 'Test Agent',
      description: 'Test agent description',
      status: 'active',
      capabilities: ['testing'],
      stats: {
        tasksCompleted: 10,
        successRate: 95,
        averageResponseTime: 1.2,
        uptime: 99.5,
        todayTasks: 5,
        weeklyTasks: 25,
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
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render markdown content with proper structure when definition exists', () => {
      // Arrange
      const markdownContent = `# Test Agent\n\nThis is a test agent.\n\n## Features\n\n- Feature 1\n- Feature 2\n\n### Code Example\n\n\`\`\`javascript\nconst agent = new Agent();\n\`\`\``;
      mockAgent = { ...mockAgent, definition: markdownContent };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByTestId('definition-content')).toBeInTheDocument();
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('This is a test agent.')).toBeInTheDocument();
      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    it('should display "No Definition Available" when definition is missing', () => {
      // Arrange
      mockAgent = { ...mockAgent, definition: undefined };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('No Definition Available')).toBeInTheDocument();
      expect(screen.getByText("This agent doesn't have a markdown definition document.")).toBeInTheDocument();
    });

    it('should render section count badge when sections exist', () => {
      // Arrange
      const markdownWithSections = `# Title\n\n## Section 1\n\nContent 1\n\n## Section 2\n\nContent 2`;
      mockAgent = { ...mockAgent, definition: markdownWithSections };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('3 sections')).toBeInTheDocument();
      expect(screen.getByText('Markdown Definition')).toBeInTheDocument();
    });
  });

  describe('Table of Contents Generation', () => {
    it('should generate table of contents from markdown headers', () => {
      // Arrange
      const markdownWithHeaders = `# Main Title\n\n## Section 1\n\nContent\n\n### Subsection 1.1\n\nMore content\n\n## Section 2\n\nFinal content`;
      mockAgent = { ...mockAgent, definition: markdownWithHeaders };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      const toc = screen.getByTestId('table-of-contents');
      expect(toc).toBeInTheDocument();
      expect(screen.getByText('Main Title')).toBeInTheDocument();
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Subsection 1.1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
    });

    it('should not render table of contents when no headers exist', () => {
      // Arrange
      const markdownWithoutHeaders = 'Just plain text content without any headers.';
      mockAgent = { ...mockAgent, definition: markdownWithoutHeaders };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.queryByTestId('table-of-contents')).not.toBeInTheDocument();
    });

    it('should create proper navigation links in table of contents', () => {
      // Arrange
      const markdownWithHeaders = `# Introduction\n\n## Getting Started\n\n### Installation`;
      mockAgent = { ...mockAgent, definition: markdownWithHeaders };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      const introLink = screen.getByRole('link', { name: 'Introduction' });
      const gettingStartedLink = screen.getByRole('link', { name: 'Getting Started' });
      const installationLink = screen.getByRole('link', { name: 'Installation' });
      
      expect(introLink).toHaveAttribute('href', '#introduction');
      expect(gettingStartedLink).toHaveAttribute('href', '#getting-started');
      expect(installationLink).toHaveAttribute('href', '#installation');
    });
  });

  describe('View Toggle Functionality', () => {
    it('should toggle between rendered and source view', async () => {
      // Arrange
      const markdownContent = `# Test\n\nContent here`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act - Initially should show rendered view
      expect(screen.getByTestId('markdown-rendered')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-source')).not.toBeInTheDocument();

      // Switch to source view
      const sourceButton = screen.getByRole('button', { name: /source/i });
      await user.click(sourceButton);

      // Assert
      expect(screen.getByTestId('markdown-source')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-rendered')).not.toBeInTheDocument();
    });

    it('should maintain view state when switching between views', async () => {
      // Arrange
      const markdownContent = `# Test\n\nContent here`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act - Switch to source and back to rendered
      const sourceButton = screen.getByRole('button', { name: /source/i });
      const renderedButton = screen.getByRole('button', { name: /rendered/i });
      
      await user.click(sourceButton);
      await user.click(renderedButton);

      // Assert
      expect(screen.getByTestId('markdown-rendered')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-source')).not.toBeInTheDocument();
    });

    it('should show raw markdown content in source view', async () => {
      // Arrange
      const markdownContent = `# Test Title\n\n**Bold text** and *italic text*`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const sourceButton = screen.getByRole('button', { name: /source/i });
      await user.click(sourceButton);

      // Assert
      const sourceContent = screen.getByTestId('markdown-source');
      expect(sourceContent).toHaveTextContent('# Test Title');
      expect(sourceContent).toHaveTextContent('**Bold text** and *italic text*');
    });
  });

  describe('Copy Functionality', () => {
    it('should copy content to clipboard when copy button is clicked', async () => {
      // Arrange
      const markdownContent = `# Test\n\nContent to copy`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Assert
      expect(mockClipboard.writeText).toHaveBeenCalledWith(markdownContent);
    });

    it('should show success feedback after successful copy', async () => {
      // Arrange
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should reset copy feedback after timeout', async () => {
      // Arrange
      vi.useFakeTimers();
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Assert
      expect(screen.getByText('Copied!')).toBeInTheDocument();
      
      // Fast-forward time
      vi.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe('Download Functionality', () => {
    it('should trigger download when download button is clicked', async () => {
      // Arrange
      const markdownContent = `# Test Agent\n\nContent for download`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation();
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation();
      
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Assert
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('should use correct filename for download', async () => {
      // Arrange
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      const mockAnchor = { 
        href: '', 
        download: '', 
        click: vi.fn() 
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation();
      vi.spyOn(document.body, 'removeChild').mockImplementation();
      
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Assert
      expect(mockAnchor.download).toBe('test-agent-definition.md');
      expect(mockAnchor.click).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });
  });

  describe('Markdown Content Rendering', () => {
    it('should render headers with appropriate styling', () => {
      // Arrange
      const markdownWithHeaders = `# H1 Title\n\n## H2 Title\n\n### H3 Title`;
      mockAgent = { ...mockAgent, definition: markdownWithHeaders };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('H1 Title')).toBeInTheDocument();
      expect(screen.getByText('H2 Title')).toBeInTheDocument();
      expect(screen.getByText('H3 Title')).toBeInTheDocument();
    });

    it('should render code blocks with syntax highlighting indicators', () => {
      // Arrange
      const markdownWithCode = `# Test\n\n\`\`\`javascript\nconst test = true;\n\`\`\``;
      mockAgent = { ...mockAgent, definition: markdownWithCode };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Code (javascript)')).toBeInTheDocument();
    });

    it('should render inline code with proper styling', () => {
      // Arrange
      const markdownWithInlineCode = `# Test\n\nUse \`console.log()\` for debugging.`;
      mockAgent = { ...mockAgent, definition: markdownWithInlineCode };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('console.log()')).toBeInTheDocument();
    });

    it('should render links with external link indicators', () => {
      // Arrange
      const markdownWithLinks = `# Test\n\n[Documentation](https://example.com) link`;
      mockAgent = { ...mockAgent, definition: markdownWithLinks };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      const link = screen.getByRole('link', { name: /documentation/i });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render lists with proper bullet points', () => {
      // Arrange
      const markdownWithList = `# Test\n\n- Item 1\n- Item 2\n- Item 3`;
      mockAgent = { ...mockAgent, definition: markdownWithList };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('Definition Metadata', () => {
    it('should display word count correctly', () => {
      // Arrange
      const markdownContent = `# Test\n\nThis has five words total.`;
      mockAgent = { ...mockAgent, definition: markdownContent };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('7 words')).toBeInTheDocument(); // Including "Test", "This", "has", "five", "words", "total"
    });

    it('should display character count correctly', () => {
      // Arrange
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText(`${markdownContent.length} characters`)).toBeInTheDocument();
    });

    it('should display format as Markdown', () => {
      // Arrange
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Markdown (.md)')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty definition gracefully', () => {
      // Arrange
      mockAgent = { ...mockAgent, definition: '' };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('No Definition Available')).toBeInTheDocument();
    });

    it('should handle malformed markdown gracefully', () => {
      // Arrange
      const malformedMarkdown = `# Unclosed [link\n\n**Unclosed bold\n\n\`\`\`\nUnclosed code block`;
      mockAgent = { ...mockAgent, definition: malformedMarkdown };

      // Act & Assert - Should not throw
      expect(() => render(<AgentDefinitionTab agent={mockAgent} />)).not.toThrow();
    });

    it('should handle clipboard API failure gracefully', async () => {
      // Arrange
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard failed'));
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy content:', expect.any(Error));
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      // Arrange
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };

      // Act
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Assert
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rendered/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /source/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      // Arrange
      const markdownContent = `# Test\n\nContent`;
      mockAgent = { ...mockAgent, definition: markdownContent };
      render(<AgentDefinitionTab agent={mockAgent} />);

      // Act
      const copyButton = screen.getByRole('button', { name: /copy/i });
      copyButton.focus();

      // Assert
      expect(copyButton).toHaveFocus();
      
      // Tab to next button
      await user.tab();
      expect(screen.getByRole('button', { name: /download/i })).toHaveFocus();
    });
  });
});