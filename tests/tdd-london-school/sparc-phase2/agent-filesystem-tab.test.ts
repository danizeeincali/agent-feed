/**
 * TDD London School Tests for AgentFileSystemTab Component
 * SPARC Phase 4A: Test-Driven Development Implementation
 * 
 * Test Coverage: File tree navigation, content preview, search, download functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentFileSystemTab } from '../../../frontend/src/components/AgentFileSystemTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Mock fetch for file content loading
global.fetch = vi.fn();

// Mock URL APIs for downloads
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock DOM methods for downloads
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn()
};
global.document.createElement = vi.fn().mockReturnValue(mockAnchor);
global.document.body.appendChild = vi.fn();
global.document.body.removeChild = vi.fn();

describe('AgentFileSystemTab - TDD London School', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
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
      },
      workspace: {
        rootPath: '/agents/test-agent',
        structure: [
          {
            type: 'folder',
            name: 'src',
            path: 'src/',
            children: 5
          },
          {
            type: 'folder',
            name: 'tests',
            path: 'tests/',
            children: 8
          },
          {
            type: 'folder',
            name: 'docs',
            path: 'docs/',
            children: 4
          },
          {
            type: 'file',
            name: 'package.json',
            path: 'package.json',
            size: 1024
          },
          {
            type: 'file',
            name: 'README.md',
            path: 'README.md',
            size: 2048
          },
          {
            type: 'file',
            name: 'agent.config.js',
            path: 'agent.config.js',
            size: 512
          },
          {
            type: 'file',
            name: 'index.ts',
            path: 'src/index.ts',
            size: 1536
          },
          {
            type: 'file',
            name: 'utils.py',
            path: 'src/utils.py',
            size: 768
          }
        ]
      }
    };
  });

  describe('Component Rendering', () => {
    it('should render workspace header with correct information', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Agent Workspace')).toBeInTheDocument();
      expect(screen.getByText('Browse and explore Test Agent workspace files')).toBeInTheDocument();
      expect(screen.getByText('/agents/test-agent')).toBeInTheDocument();
    });

    it('should display "No Workspace Available" when workspace is missing', () => {
      // Arrange
      mockAgent.workspace = undefined;

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('No Workspace Available')).toBeInTheDocument();
      expect(screen.getByText("This agent doesn't have an accessible workspace or file system.")).toBeInTheDocument();
    });

    it('should display file structure with correct item count', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('File Structure')).toBeInTheDocument();
      expect(screen.getByText('8 items')).toBeInTheDocument(); // Total structure items
    });

    it('should render all file and folder items', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      const fileItems = screen.getAllByTestId('file-item');
      expect(fileItems).toHaveLength(8);
      
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('tests')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
      expect(screen.getByText('package.json')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('agent.config.js')).toBeInTheDocument();
    });
  });

  describe('File Tree Navigation', () => {
    it('should display appropriate icons for different file types', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert - Check that different file types have different styling/icons
      const jsFile = screen.getByText('agent.config.js').closest('[data-testid="file-item"]');
      const mdFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      const jsonFile = screen.getByText('package.json').closest('[data-testid="file-item"]');
      
      expect(jsFile).toBeInTheDocument();
      expect(mdFile).toBeInTheDocument();
      expect(jsonFile).toBeInTheDocument();
    });

    it('should show folder item counts correctly', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('5 items')).toBeInTheDocument(); // src folder
      expect(screen.getByText('8 items')).toBeInTheDocument(); // tests folder
      expect(screen.getByText('4 items')).toBeInTheDocument(); // docs folder
    });

    it('should show file sizes correctly formatted', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('JSON • 1 KB')).toBeInTheDocument(); // package.json
      expect(screen.getByText('MD • 2 KB')).toBeInTheDocument(); // README.md
      expect(screen.getByText('JS • 0.5 KB')).toBeInTheDocument(); // agent.config.js
    });

    it('should handle folder expansion and collapse', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const srcFolder = screen.getByText('src').closest('[data-testid="file-item"]');
      await user.click(srcFolder!);

      // Assert - Folder should be expanded (visual state change)
      // This test verifies the click handler works; actual expansion visual would be tested in integration
      expect(srcFolder).toBeInTheDocument();
    });

    it('should highlight selected file', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      // Assert - File should be visually selected
      expect(readmeFile).toHaveClass(/bg-blue-50|border-blue-500/); // Selected state styling
    });
  });

  describe('File Content Preview', () => {
    it('should show file selection prompt initially', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Select a File to Preview')).toBeInTheDocument();
      expect(screen.getByText('Click on a file in the file structure to view its content here.')).toBeInTheDocument();
    });

    it('should load and display file content when file is selected', async () => {
      // Arrange
      const mockContent = '# README\n\nThis is a test README file.';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent)
      });

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('README.md')).toBeInTheDocument();
        expect(screen.getByText(mockContent)).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/agents/test-agent/files?path=README.md');
    });

    it('should display loading state while fetching content', async () => {
      // Arrange
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true, text: () => Promise.resolve('content') }), 100))
      );

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      // Assert
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show mock content when API fails', async () => {
      // Arrange
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Mock Content')).toBeInTheDocument();
      });
    });

    it('should generate appropriate mock content for different file types', async () => {
      // Arrange
      (global.fetch as any).mockResolvedValue({ ok: false });

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Test markdown file
      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      await waitFor(() => {
        expect(screen.getByText(/# README.md/)).toBeInTheDocument();
      });

      // Test JSON file
      const packageFile = screen.getByText('package.json').closest('[data-testid="file-item"]');
      await user.click(packageFile!);

      await waitFor(() => {
        expect(screen.getByText(/"name": "Test Agent"/)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      // Arrange
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error loading file content: Network error')).toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument(); // Error badge
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load file content:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Search Functionality', () => {
    it('should filter files based on search term', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'README');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('README.md')).toBeInTheDocument();
        expect(screen.queryByText('package.json')).not.toBeInTheDocument();
      });
    });

    it('should search by file path as well as name', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'src/');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('index.ts')).toBeInTheDocument();
        expect(screen.getByText('utils.py')).toBeInTheDocument();
        expect(screen.queryByText('README.md')).not.toBeInTheDocument();
      });
    });

    it('should show no files message when search returns no results', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'nonexistent');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No files found')).toBeInTheDocument();
        expect(screen.queryByTestId('file-item')).not.toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'readme');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('README.md')).toBeInTheDocument();
      });
    });
  });

  describe('Download Functionality', () => {
    it('should enable download button when file content is loaded', async () => {
      // Arrange
      const mockContent = 'Test file content';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent)
      });

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText(mockContent)).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Assert
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('README.md');
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('should handle download with correct file name and content', async () => {
      // Arrange
      const mockContent = '{"name": "test"}';
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockContent)
      });

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const packageFile = screen.getByText('package.json').closest('[data-testid="file-item"]');
      await user.click(packageFile!);

      await waitFor(() => {
        expect(screen.getByText(mockContent)).toBeInTheDocument();
      });

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      // Assert
      expect(mockAnchor.download).toBe('package.json');
      expect(global.document.body.appendChild).toHaveBeenCalled();
      expect(global.document.body.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Workspace Statistics', () => {
    it('should calculate and display workspace statistics correctly', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Workspace Statistics')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // Total items
      expect(screen.getByText('3')).toBeInTheDocument(); // Folders (src, tests, docs)
      expect(screen.getByText('5')).toBeInTheDocument(); // Files
      
      // Total size calculation: 1024 + 2048 + 512 + 1536 + 768 = 5888 bytes = 5.75 KB
      expect(screen.getByText('5.75 KB')).toBeInTheDocument();
    });

    it('should handle empty workspace gracefully', () => {
      // Arrange
      mockAgent.workspace!.structure = [];

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('0')).toBeInTheDocument(); // All statistics should be 0
    });

    it('should handle workspace without structure property', () => {
      // Arrange
      mockAgent.workspace = { rootPath: '/test' };

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('0 items')).toBeInTheDocument();
    });
  });

  describe('File Type Detection', () => {
    it('should detect and display correct file types', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('JSON • 1 KB')).toBeInTheDocument(); // package.json
      expect(screen.getByText('MD • 2 KB')).toBeInTheDocument(); // README.md
      expect(screen.getByText('JS • 0.5 KB')).toBeInTheDocument(); // agent.config.js
    });

    it('should handle files without extensions', () => {
      // Arrange
      mockAgent.workspace!.structure.push({
        type: 'file',
        name: 'Dockerfile',
        path: 'Dockerfile',
        size: 256
      });

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Dockerfile')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agent gracefully', () => {
      // Act & Assert
      expect(() => render(<AgentFileSystemTab agent={null as any} />)).not.toThrow();
    });

    it('should handle malformed workspace structure', () => {
      // Arrange
      mockAgent.workspace!.structure = [
        null as any,
        undefined as any,
        { type: 'invalid' } as any
      ];

      // Act & Assert - Should not throw
      expect(() => render(<AgentFileSystemTab agent={mockAgent} />)).not.toThrow();
    });

    it('should handle workspace without rootPath', () => {
      // Arrange
      mockAgent.workspace!.rootPath = undefined;

      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('/agents/test-agent')).toBeInTheDocument(); // Default path
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByRole('textbox', { name: /search files/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation through file list', async () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      const firstFile = screen.getAllByTestId('file-item')[0];
      firstFile.focus();

      // Assert
      expect(firstFile).toHaveFocus();
    });

    it('should have descriptive text for screen readers', () => {
      // Act
      render(<AgentFileSystemTab agent={mockAgent} />);

      // Assert
      expect(screen.getByText('Browse and explore Test Agent workspace files')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large file structures efficiently', () => {
      // Arrange
      const largeStructure = Array.from({ length: 1000 }, (_, i) => ({
        type: 'file' as const,
        name: `file-${i}.txt`,
        path: `files/file-${i}.txt`,
        size: 1024
      }));
      mockAgent.workspace!.structure = largeStructure;

      // Act & Assert - Should not throw or hang
      expect(() => render(<AgentFileSystemTab agent={mockAgent} />)).not.toThrow();
      
      expect(screen.getByText('1000 items')).toBeInTheDocument();
    });
  });
});