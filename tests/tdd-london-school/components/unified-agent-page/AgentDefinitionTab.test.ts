/**
 * TDD London School Tests for AgentDefinitionTab
 * Focus: Behavior verification and contract testing
 * Approach: Mock collaborators to test interactions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedAgentData } from '../../../../frontend/src/components/UnifiedAgentPage';
import AgentDefinitionTab from '../../../../frontend/src/components/AgentDefinitionTab';

// Mock clipboard API using London School approach
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined)
};

// Mock URL.createObjectURL using London School approach  
const mockCreateObjectURL = jest.fn().mockReturnValue('mock-blob-url');
const mockRevokeObjectURL = jest.fn();

// Mock document methods for download behavior
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockCreateElement = jest.fn().mockReturnValue({
  href: '',
  download: '',
  click: mockClick
});

describe('AgentDefinitionTab - London School TDD', () => {
  // Sample agent data for testing behavior
  const mockAgent: UnifiedAgentData = {
    id: 'test-agent-123',
    name: 'Test Agent',
    description: 'A test agent for TDD verification',
    status: 'active',
    capabilities: ['testing', 'verification'],
    stats: {
      tasksCompleted: 100,
      successRate: 95,
      averageResponseTime: 1.2,
      uptime: 99.5,
      todayTasks: 5,
      weeklyTasks: 25,
      satisfaction: 4.8
    },
    recentActivities: [],
    recentPosts: [],
    configuration: {
      profile: {
        name: 'Test Agent',
        description: 'A test agent',
        specialization: 'Testing',
        avatar: '🤖'
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
    definition: `# Test Agent Definition

## Overview
This is a test agent for TDD verification.

## Capabilities
- Testing functionality
- Behavior verification
- Contract validation

## Implementation Details
\`\`\`typescript
interface TestAgent {
  test(): boolean;
}
\`\`\`

## Usage
To use this agent:
1. Initialize the test environment
2. Configure test parameters
3. Execute test suite`
  };

  beforeEach(() => {
    // Setup mocks using London School patterns
    Object.assign(navigator, {
      clipboard: mockClipboard
    });
    
    Object.assign(global.URL, {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL
    });
    
    Object.assign(document, {
      createElement: mockCreateElement,
      body: {
        appendChild: mockAppendChild,
        removeChild: mockRemoveChild
      }
    });

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Verify no unexpected interactions occurred
    expect(mockClipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('mock'));
    expect(mockCreateObjectURL).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'application/malicious' }));
  });

  describe('Component Rendering Behavior', () => {
    it('should render definition tab with correct structure', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // Verify main UI elements are present
      expect(screen.getByText('Agent Definition')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive documentation and specifications')).toBeInTheDocument();
      expect(screen.getByTestId('definition-content')).toBeInTheDocument();
    });

    it('should display metadata correctly', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // Verify metadata calculations
      expect(screen.getByText(/\d+ words/)).toBeInTheDocument();
      expect(screen.getByText(/\d+ characters/)).toBeInTheDocument(); 
      expect(screen.getByText(/\d+ sections/)).toBeInTheDocument();
      expect(screen.getByText('Markdown (.md)')).toBeInTheDocument();
    });

    it('should generate table of contents from markdown headers', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const toc = screen.getByTestId('table-of-contents');
      expect(toc).toBeInTheDocument();
      
      // Verify TOC contains expected sections
      expect(screen.getByText('Test Agent Definition')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Capabilities')).toBeInTheDocument();
      expect(screen.getByText('Implementation Details')).toBeInTheDocument();
      expect(screen.getByText('Usage')).toBeInTheDocument();
    });
  });

  describe('View Mode Toggle Behavior', () => {
    it('should default to rendered view mode', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // Verify rendered view is active by default
      const renderedButton = screen.getByText('Rendered');
      expect(renderedButton.closest('button')).toHaveClass('bg-white');
      
      // Verify rendered content is displayed
      expect(screen.getByTestId('markdown-rendered')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-source')).not.toBeInTheDocument();
    });

    it('should switch to source view when source button clicked', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // Click source view button
      const sourceButton = screen.getByText('Source');
      fireEvent.click(sourceButton);
      
      // Verify source view is now active
      expect(sourceButton.closest('button')).toHaveClass('bg-white');
      expect(screen.getByTestId('markdown-source')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-rendered')).not.toBeInTheDocument();
    });

    it('should switch back to rendered view correctly', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // Switch to source then back to rendered
      fireEvent.click(screen.getByText('Source'));
      fireEvent.click(screen.getByText('Rendered'));
      
      // Verify rendered view is active again
      expect(screen.getByTestId('markdown-rendered')).toBeInTheDocument();
      expect(screen.queryByTestId('markdown-source')).not.toBeInTheDocument();
    });
  });

  describe('Copy Functionality Behavior', () => {
    it('should copy definition content to clipboard when copy button clicked', async () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      // Verify clipboard interaction
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockAgent.definition);
      });
    });

    it('should show copy success feedback', async () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      // Verify success feedback appears
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // Verify feedback disappears after timeout
      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle clipboard API errors gracefully', async () => {
      // Mock clipboard failure
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to copy content:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Download Functionality Behavior', () => {
    it('should initiate download when download button clicked', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);
      
      // Verify download sequence interactions
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/markdown'
        })
      );
      
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockRemoveChild).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
    });

    it('should set correct filename for download', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);
      
      // Verify filename is set correctly based on agent ID
      expect(mockCreateElement().download).toBe(`${mockAgent.id}-definition.md`);
    });
  });

  describe('No Definition State Behavior', () => {
    it('should render empty state when agent has no definition', () => {
      const agentWithoutDefinition = {
        ...mockAgent,
        definition: undefined
      };
      
      render(<AgentDefinitionTab agent={agentWithoutDefinition} />);
      
      expect(screen.getByText('No Definition Available')).toBeInTheDocument();
      expect(screen.getByText('This agent doesn\'t have a markdown definition document.')).toBeInTheDocument();
      expect(screen.queryByTestId('definition-content')).not.toBeInTheDocument();
    });

    it('should render empty state when definition is empty string', () => {
      const agentWithEmptyDefinition = {
        ...mockAgent,
        definition: ''
      };
      
      render(<AgentDefinitionTab agent={agentWithEmptyDefinition} />);
      
      expect(screen.getByText('No Definition Available')).toBeInTheDocument();
    });
  });

  describe('Markdown Parsing Behavior', () => {
    it('should parse markdown headers correctly', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      // Switch to rendered view to see parsed content
      const renderedContent = screen.getByTestId('markdown-rendered');
      
      // Verify headers are parsed (basic check)
      expect(renderedContent.innerHTML).toContain('<h1');
      expect(renderedContent.innerHTML).toContain('<h2');
    });

    it('should parse code blocks correctly', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const renderedContent = screen.getByTestId('markdown-rendered');
      
      // Verify code block is parsed
      expect(renderedContent.innerHTML).toContain('class="code-block"');
      expect(renderedContent.innerHTML).toContain('data-language="typescript"');
    });

    it('should parse lists correctly', () => {
      render(<AgentDefinitionTab agent={mockAgent} />);
      
      const renderedContent = screen.getByTestId('markdown-rendered');
      
      // Verify lists are parsed
      expect(renderedContent.innerHTML).toContain('<li>');
      expect(renderedContent.innerHTML).toContain('<ul>');
    });
  });

  describe('Contract Verification', () => {
    it('should conform to UnifiedAgentData interface contract', () => {
      // Verify component accepts the expected agent prop structure
      expect(() => {
        render(<AgentDefinitionTab agent={mockAgent} />);
      }).not.toThrow();
      
      // Verify component handles all required properties
      expect(screen.getByText('Agent Definition')).toBeInTheDocument();
    });

    it('should handle undefined agent gracefully', () => {
      expect(() => {
        render(<AgentDefinitionTab agent={undefined as any} />);
      }).not.toThrow();
      
      expect(screen.getByText('No Definition Available')).toBeInTheDocument();
    });
  });
});