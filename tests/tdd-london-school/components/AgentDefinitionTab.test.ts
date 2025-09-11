/**
 * AgentDefinitionTab TDD London School Tests
 * Red-Green-Refactor implementation with behavior verification
 * Tests markdown parsing, content rendering, and user interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentDefinitionTab } from '../../../frontend/src/components/AgentDefinitionTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';
import { jest } from '@jest/globals';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock URL for download functionality
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.assign(URL, {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

// Mock DOM createElement and manipulation for download
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
Object.assign(document.body, {
  appendChild: mockAppendChild,
  removeChild: mockRemoveChild,
});

describe('AgentDefinitionTab - London School TDD', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Real agent data structure based on API contracts
    mockAgent = {
      id: 'test-agent-001',
      name: 'Test Agent',
      display_name: 'Test Agent Display',
      description: 'A test agent for TDD validation',
      status: 'active',
      capabilities: ['markdown-processing', 'content-analysis'],
      stats: {
        tasksCompleted: 150,
        successRate: 96.5,
        averageResponseTime: 1.2,
        uptime: 99.1,
        todayTasks: 8,
        weeklyTasks: 42,
        satisfaction: 4.7
      },
      configuration: {
        profile: {
          name: 'Test Agent',
          description: 'A test agent',
          specialization: 'Testing and Validation',
          avatar: '🧪'
        },
        behavior: {
          responseStyle: 'technical',
          proactivity: 'high',
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
      recentActivities: [],
      recentPosts: [],
      // Critical: Real markdown definition content
      definition: `# Test Agent Definition

This is the comprehensive definition document for the Test Agent.

## Overview

The Test Agent is designed for validation and testing scenarios.

### Key Features

- **Markdown Processing**: Advanced markdown parsing capabilities
- **Content Analysis**: Deep content understanding
- **Real-time Validation**: Live testing and verification

## Usage Examples

\`\`\`javascript
const agent = new TestAgent({
  mode: 'validation',
  strict: true
});
\`\`\`

### Configuration

1. Set up the agent environment
2. Configure validation parameters
3. Run validation tests

## Links and References

Visit our [documentation](https://docs.example.com) for more details.

## Limitations

- Context window limitations
- Rate limiting considerations`,
      createdAt: '2024-01-01T00:00:00Z',
      lastActiveAt: '2024-01-15T12:00:00Z',
      version: '1.0.0',
      tags: ['testing', 'validation']
    };

    // Reset all mocks
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  describe('RED PHASE - Failing Tests', () => {
    test('SHOULD render definition content with proper markdown parsing', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Test expects proper markdown rendering
      expect(screen.getByTestId('definition-content')).toBeInTheDocument();
      expect(screen.getByTestId('markdown-rendered')).toBeInTheDocument();
      
      // FAILING: Should parse headers correctly
      expect(screen.getByText('Test Agent Definition')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Key Features')).toBeInTheDocument();
      
      // FAILING: Should render code blocks
      expect(screen.getByText(/const agent = new TestAgent/)).toBeInTheDocument();
      
      // FAILING: Should render links with external link icons
      expect(screen.getByText('documentation')).toBeInTheDocument();
      const linkElement = screen.getByText('documentation').closest('a');
      expect(linkElement).toHaveAttribute('href', 'https://docs.example.com');
      expect(linkElement).toHaveAttribute('target', '_blank');
    });

    test('SHOULD generate table of contents from markdown headers', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Should render table of contents
      expect(screen.getByTestId('table-of-contents')).toBeInTheDocument();
      
      // FAILING: Should include all headers in TOC
      const tocLinks = screen.getAllByRole('link', { name: /overview|key features|usage examples|configuration|links and references|limitations/i });
      expect(tocLinks).toHaveLength(6); // All major headers
      
      // FAILING: TOC links should have proper href attributes
      const overviewLink = screen.getByRole('link', { name: /overview/i });
      expect(overviewLink).toHaveAttribute('href', '#overview');
    });

    test('SHOULD provide copy functionality for definition content', async () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Copy button should be present
      const copyButton = screen.getByRole('button', { name: /copy/i });
      expect(copyButton).toBeInTheDocument();
      
      // FAILING: Clicking copy should call clipboard API
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(mockAgent.definition);
      });
      
      // FAILING: Button text should change to "Copied!"
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    test('SHOULD provide download functionality for definition content', async () => {
      // Mock DOM elements for download test
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Download button should be present
      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toBeInTheDocument();
      
      // FAILING: Clicking download should trigger file download
      await user.click(downloadButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/markdown'
        })
      );
      
      expect(mockAnchor.download).toBe('test-agent-001-definition.md');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
    });

    test('SHOULD toggle between rendered and source view modes', async () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Should start in rendered mode
      expect(screen.getByTestId('markdown-rendered')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-source')).not.toBeInTheDocument();
      
      // FAILING: Should have view mode toggle buttons
      const sourceButton = screen.getByRole('button', { name: /source/i });
      const renderedButton = screen.getByRole('button', { name: /rendered/i });
      
      expect(sourceButton).toBeInTheDocument();
      expect(renderedButton).toBeInTheDocument();
      
      // FAILING: Clicking source should show raw markdown
      await user.click(sourceButton);
      
      expect(screen.getByTestId('markdown-source')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-rendered')).not.toBeInTheDocument();
      
      // FAILING: Source view should show raw markdown content
      expect(screen.getByText(mockAgent.definition!)).toBeInTheDocument();
    });

    test('SHOULD display definition metadata correctly', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Should display word count
      const wordCount = mockAgent.definition!.split(/\s+/).length;
      expect(screen.getByText(`${wordCount} words`)).toBeInTheDocument();
      
      // FAILING: Should display character count
      const charCount = mockAgent.definition!.length;
      expect(screen.getByText(`${charCount} characters`)).toBeInTheDocument();
      
      // FAILING: Should display section count
      const sectionCount = (mockAgent.definition!.match(/^#{1,6}\s+/gm) || []).length;
      expect(screen.getByText(`${sectionCount} sections`)).toBeInTheDocument();
      
      // FAILING: Should display format
      expect(screen.getByText('Markdown (.md)')).toBeInTheDocument();
    });

    test('SHOULD handle agent with no definition gracefully', () => {
      const agentWithoutDefinition = { ...mockAgent, definition: undefined };
      render(<AgentDefinitionTab agent={agentWithoutDefinition} />);
      
      // FAILING: Should show no definition message
      expect(screen.getByText('No Definition Available')).toBeInTheDocument();
      expect(screen.getByText("This agent doesn't have a markdown definition document.")).toBeInTheDocument();
      
      // FAILING: Should not show definition content
      expect(screen.queryByTestId('definition-content')).not.toBeInTheDocument();
    });

    test('SHOULD properly parse and render various markdown elements', () => {
      const complexMarkdown = `# Main Header

## Secondary Header

### Tertiary Header

This is a paragraph with **bold text** and *italic text*.

- Bullet point 1
- Bullet point 2
- Bullet point 3

1. Numbered item 1
2. Numbered item 2
3. Numbered item 3

\`inline code\` in a sentence.

\`\`\`javascript
const code = 'block';
console.log(code);
\`\`\`

[External link](https://example.com)

> This is a blockquote

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;

      const complexAgent = { ...mockAgent, definition: complexMarkdown };
      render(<AgentDefinitionTab agent={complexAgent} />);
      
      // FAILING: Should render headers with proper hierarchy
      expect(screen.getByText('Main Header')).toBeInTheDocument();
      expect(screen.getByText('Secondary Header')).toBeInTheDocument();
      expect(screen.getByText('Tertiary Header')).toBeInTheDocument();
      
      // FAILING: Should render lists
      expect(screen.getByText('Bullet point 1')).toBeInTheDocument();
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('Numbered item 1')).toBeInTheDocument();
      
      // FAILING: Should render inline code
      expect(screen.getByText('inline code')).toBeInTheDocument();
      
      // FAILING: Should render code blocks with language indication
      expect(screen.getByText(/Code \(javascript\)/)).toBeInTheDocument();
      
      // FAILING: Should render external links
      const externalLink = screen.getByText('External link').closest('a');
      expect(externalLink).toHaveAttribute('href', 'https://example.com');
      expect(externalLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Behavior Verification - London School Contracts', () => {
    test('SHOULD verify component interaction contracts', () => {
      const { rerender } = render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Component should handle agent prop changes
      const updatedAgent = {
        ...mockAgent,
        definition: '# Updated Definition\n\nThis is updated content.'
      };
      
      rerender(<AgentDefinitionTab agent={updatedAgent} />);
      
      expect(screen.getByText('Updated Definition')).toBeInTheDocument();
      expect(screen.getByText('This is updated content.')).toBeInTheDocument();
    });

    test('SHOULD verify copy interaction behavior', async () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const copyButton = screen.getByRole('button', { name: /copy/i });
      
      // FAILING: Should track copy interaction state
      expect(copyButton).toHaveTextContent('Copy');
      
      await user.click(copyButton);
      
      // FAILING: Should show feedback state
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Copied!');
      });
      
      // FAILING: Should reset after timeout
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Copy');
      }, { timeout: 3000 });
    });

    test('SHOULD verify view mode interaction contracts', async () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const sourceButton = screen.getByRole('button', { name: /source/i });
      const renderedButton = screen.getByRole('button', { name: /rendered/i });
      
      // FAILING: Should maintain exclusive view mode state
      expect(renderedButton).toHaveClass(/default/); // Active state
      expect(sourceButton).toHaveClass(/ghost/); // Inactive state
      
      await user.click(sourceButton);
      
      expect(sourceButton).toHaveClass(/default/); // Now active
      expect(renderedButton).toHaveClass(/ghost/); // Now inactive
    });
  });

  describe('Real Data Integration Contracts', () => {
    test('SHOULD handle real agent data structure correctly', () => {
      // Test with actual API data structure
      const realApiAgent = {
        ...mockAgent,
        system_prompt: 'System prompt content',
        avatar_color: '#FF6B6B',
        performance_metrics: {
          success_rate: 98.5,
          average_response_time: 850,
          total_tokens_used: 125000,
          error_count: 3
        }
      };

      render(<AgentDefinitionTab agent={realApiAgent} />);
      
      // FAILING: Should extract definition from system_prompt if definition not available
      expect(screen.getByTestId('definition-content')).toBeInTheDocument();
    });

    test('SHOULD verify zero mock data contamination', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // FAILING: Should use only real agent data, no hardcoded mock strings
      const content = screen.getByTestId('definition-content');
      
      // Check for mock data patterns
      expect(content.textContent).not.toMatch(/lorem ipsum/i);
      expect(content.textContent).not.toMatch(/placeholder/i);
      expect(content.textContent).not.toMatch(/sample.*data/i);
      expect(content.textContent).not.toMatch(/test.*mock/i);
      
      // Should contain actual agent data
      expect(content.textContent).toContain('Test Agent Definition');
      expect(content.textContent).toContain(mockAgent.name);
    });
  });
});