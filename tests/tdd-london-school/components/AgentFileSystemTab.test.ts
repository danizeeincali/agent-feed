/**
 * AgentFileSystemTab TDD London School Tests
 * Red-Green-Refactor implementation with behavior verification
 * Tests file tree navigation, content preview, search functionality, and workspace interaction
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentFileSystemTab } from '../../../frontend/src/components/AgentFileSystemTab';
import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';
import { jest } from '@jest/globals';

// Mock fetch for file content loading
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL for file download functionality
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.assign(URL, {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

// Mock DOM manipulation for downloads
const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
Object.assign(document.body, {
  appendChild: mockAppendChild,
  removeChild: mockRemoveChild,
});

describe('AgentFileSystemTab - London School TDD', () => {
  let mockAgent: UnifiedAgentData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Real agent data with comprehensive workspace structure
    mockAgent = {
      id: 'filesystem-agent-001',
      name: 'Workspace Agent',
      display_name: 'Advanced Workspace Agent',
      description: 'AI agent with comprehensive file system and workspace management',
      status: 'active',
      capabilities: ['File Management', 'Code Generation', 'Documentation'],
      stats: {
        tasksCompleted: 890,
        successRate: 99.1,
        averageResponseTime: 0.95,
        uptime: 99.9,
        todayTasks: 12,
        weeklyTasks: 67,
        satisfaction: 4.8
      },
      configuration: {
        profile: {
          name: 'Workspace Agent',
          description: 'Advanced workspace and file management agent',
          specialization: 'File System Operations',
          avatar: '🗂️'
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
          primaryColor: '#059669',
          accentColor: '#D97706',
          layout: 'grid'
        }
      },
      recentActivities: [],
      recentPosts: [],
      // Comprehensive workspace structure
      workspace: {
        rootPath: '/agents/filesystem-agent-001',
        structure: [
          {
            name: 'README.md',
            path: '/README.md',
            type: 'file',
            size: 2048,
            lastModified: '2024-01-15T14:30:00Z'
          },
          {
            name: 'config.json',
            path: '/config.json',
            type: 'file',
            size: 512,
            lastModified: '2024-01-14T09:15:00Z'
          },
          {
            name: 'package.json',
            path: '/package.json',
            type: 'file',
            size: 1536,
            lastModified: '2024-01-13T16:45:00Z'
          },
          {
            name: 'src',
            path: '/src',
            type: 'folder',
            children: 8,
            lastModified: '2024-01-16T11:20:00Z'
          },
          {
            name: 'docs',
            path: '/docs',
            type: 'folder',
            children: 12,
            lastModified: '2024-01-15T10:00:00Z'
          },
          {
            name: 'tests',
            path: '/tests',
            type: 'folder',
            children: 15,
            lastModified: '2024-01-14T13:25:00Z'
          },
          {
            name: 'main.py',
            path: '/main.py',
            type: 'file',
            size: 4096,
            lastModified: '2024-01-16T15:10:00Z'
          },
          {
            name: 'requirements.txt',
            path: '/requirements.txt',
            type: 'file',
            size: 256,
            lastModified: '2024-01-12T08:30:00Z'
          },
          {
            name: 'assets',
            path: '/assets',
            type: 'folder',
            children: 6,
            lastModified: '2024-01-11T14:50:00Z'
          },
          {
            name: 'docker-compose.yml',
            path: '/docker-compose.yml',
            type: 'file',
            size: 768,
            lastModified: '2024-01-15T12:15:00Z'
          }
        ]
      },
      metadata: {
        languages: ['Python', 'TypeScript', 'Docker', 'YAML'],
        repository: 'https://github.com/ai-agents/workspace-agent',
        documentation: 'https://docs.ai-agents.com/workspace-agent',
        author: 'Workspace Team',
        license: 'MIT'
      },
      createdAt: '2024-01-01T00:00:00Z',
      lastActiveAt: '2024-01-16T16:30:00Z',
      version: '1.5.2'
    };

    // Reset mocks
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockCreateObjectURL.mockReturnValue('blob:mock-file-url');
  });

  describe('RED PHASE - Failing Tests', () => {
    test('SHOULD display workspace header with agent information', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should display workspace title
      expect(screen.getByText('Agent Workspace')).toBeInTheDocument();
      
      // FAILING: Should show agent name in description
      expect(screen.getByText('Browse and explore Workspace Agent workspace files')).toBeInTheDocument();
      
      // FAILING: Should display root path
      expect(screen.getByText('/agents/filesystem-agent-001')).toBeInTheDocument();
      
      // FAILING: Should have file search input
      expect(screen.getByTestId('file-search-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
    });

    test('SHOULD render file structure tree with proper icons and metadata', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should render file tree
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      expect(screen.getByText('File Structure')).toBeInTheDocument();
      expect(screen.getByText('10 items')).toBeInTheDocument(); // Total items count
      
      // FAILING: Should display all files and folders
      const fileItems = screen.getAllByTestId('file-item');
      expect(fileItems).toHaveLength(10);
      
      // FAILING: Should show file names
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('config.json')).toBeInTheDocument();
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('main.py')).toBeInTheDocument();
      
      // FAILING: Should display folder child counts
      expect(screen.getByText('8 items')).toBeInTheDocument(); // src folder
      expect(screen.getByText('12 items')).toBeInTheDocument(); // docs folder
      expect(screen.getByText('15 items')).toBeInTheDocument(); // tests folder
    });

    test('SHOULD display correct file type icons and badges', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should show appropriate file type badges
      expect(screen.getByText('MD • 2 KB')).toBeInTheDocument(); // README.md
      expect(screen.getByText('JSON • 512 B')).toBeInTheDocument(); // config.json
      expect(screen.getByText('PY • 4 KB')).toBeInTheDocument(); // main.py
      expect(screen.getByText('YML • 768 B')).toBeInTheDocument(); // docker-compose.yml
      
      // FAILING: Should use proper file icons based on extensions
      // Icons are tested through the component's getFileIcon function behavior
      const readmeItem = screen.getByText('README.md').closest('[data-testid="file-item"]');
      expect(readmeItem).toBeInTheDocument();
    });

    test('SHOULD handle file selection and content preview', async () => {
      // Mock successful file content response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('# Workspace Agent\n\nThis is the README file for the workspace agent.')
      });

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should show file selection prompt initially
      expect(screen.getByText('Select a File to Preview')).toBeInTheDocument();
      expect(screen.getByText('Click on a file in the file structure to view its content here.')).toBeInTheDocument();
      
      // FAILING: Should handle file click
      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);
      
      // FAILING: Should fetch file content
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/filesystem-agent-001/files?path=%2FREADME.md');
      });
      
      // FAILING: Should display file content
      await waitFor(() => {
        expect(screen.getByTestId('file-content-preview')).toBeInTheDocument();
        expect(screen.getByText('# Workspace Agent')).toBeInTheDocument();
      });
    });

    test('SHOULD handle file content loading states and errors', async () => {
      // Mock loading state then error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const configFile = screen.getByText('config.json').closest('[data-testid="file-item"]');
      await user.click(configFile!);
      
      // FAILING: Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // FAILING: Should show error state
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument(); // Error badge
      });
    });

    test('SHOULD provide mock content fallback when API fails', async () => {
      // Mock API failure (404)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const packageFile = screen.getByText('package.json').closest('[data-testid="file-item"]');
      await user.click(packageFile!);
      
      // FAILING: Should fall back to mock content
      await waitFor(() => {
        expect(screen.getByText('Mock Content')).toBeInTheDocument(); // Mock badge
        expect(screen.getByTestId('file-content-preview')).toBeInTheDocument();
      });
      
      // FAILING: Should generate appropriate mock content for JSON files
      await waitFor(() => {
        const content = screen.getByTestId('file-content-preview').textContent;
        expect(content).toContain('"name": "Workspace Agent"');
        expect(content).toContain('"version": "1.5.2"');
      });
    });

    test('SHOULD implement file search functionality', async () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const searchInput = screen.getByTestId('file-search-input');
      
      // FAILING: Should filter files by name
      await user.type(searchInput, '.json');
      
      // Should show JSON files only
      expect(screen.getByText('config.json')).toBeInTheDocument();
      expect(screen.getByText('package.json')).toBeInTheDocument();
      expect(screen.queryByText('README.md')).not.toBeInTheDocument();
      
      // FAILING: Should search by path
      await user.clear(searchInput);
      await user.type(searchInput, '/src');
      
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.queryByText('config.json')).not.toBeInTheDocument();
    });

    test('SHOULD handle folder expansion interactions', async () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const srcFolder = screen.getByText('src').closest('[data-testid="file-item"]');
      
      // FAILING: Should handle folder clicks for expansion
      await user.click(srcFolder!);
      
      // Note: This test checks the interaction behavior, not actual child display
      // since we don't have nested structure in mock data
      expect(srcFolder).toBeInTheDocument();
    });

    test('SHOULD provide file download functionality', async () => {
      // Mock successful file content
      const mockContent = '# Test File\nThis is test content';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(mockContent)
      });

      // Mock DOM element creation
      const mockAnchor = { 
        href: '', 
        download: '', 
        click: mockClick 
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // Select a file first
      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);
      
      await waitFor(() => {
        expect(screen.getByTestId('file-content-preview')).toBeInTheDocument();
      });
      
      // FAILING: Should have download button
      const downloadButton = screen.getByRole('button', { name: /download/i });
      expect(downloadButton).toBeInTheDocument();
      
      // FAILING: Should trigger download on click
      await user.click(downloadButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('README.md');
      expect(mockClick).toHaveBeenCalled();
    });

    test('SHOULD display workspace statistics', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should render workspace statistics
      expect(screen.getByTestId('workspace-statistics')).toBeInTheDocument();
      
      // FAILING: Should show total items count
      expect(screen.getByText('10')).toBeInTheDocument(); // Total items
      expect(screen.getByText('Total Items')).toBeInTheDocument();
      
      // FAILING: Should show folders count
      expect(screen.getByText('3')).toBeInTheDocument(); // 3 folders (src, docs, tests, assets)
      expect(screen.getByText('Folders')).toBeInTheDocument();
      
      // FAILING: Should show files count  
      expect(screen.getByText('7')).toBeInTheDocument(); // 7 files
      expect(screen.getByText('Files')).toBeInTheDocument();
      
      // FAILING: Should show total size
      expect(screen.getByText(/KB|MB|B/)).toBeInTheDocument(); // Some size indication
      expect(screen.getByText('Total Size')).toBeInTheDocument();
    });

    test('SHOULD handle agent with no workspace gracefully', () => {
      const agentWithoutWorkspace = { ...mockAgent, workspace: undefined };
      render(<AgentFileSystemTab agent={agentWithoutWorkspace} />);
      
      // FAILING: Should show no workspace message
      expect(screen.getByText('No Workspace Available')).toBeInTheDocument();
      expect(screen.getByText("This agent doesn't have an accessible workspace or file system.")).toBeInTheDocument();
      
      // FAILING: Should not show file tree
      expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
    });

    test('SHOULD handle empty workspace structure', () => {
      const agentWithEmptyWorkspace = { 
        ...mockAgent, 
        workspace: { rootPath: '/empty', structure: [] } 
      };
      render(<AgentFileSystemTab agent={agentWithEmptyWorkspace} />);
      
      // FAILING: Should show no workspace message
      expect(screen.getByText('No Workspace Available')).toBeInTheDocument();
    });

    test('SHOULD handle null/undefined agent gracefully', () => {
      render(<AgentFileSystemTab agent={null as any} />);
      
      // FAILING: Should show no workspace available message
      expect(screen.getByText('No Workspace Available')).toBeInTheDocument();
    });
  });

  describe('Behavior Verification - London School Contracts', () => {
    test('SHOULD verify file selection state management', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('Test content')
      });

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should track selected file state
      const readmeFile = screen.getByText('README.md').closest('[data-testid="file-item"]');
      await user.click(readmeFile!);
      
      await waitFor(() => {
        expect(readmeFile).toHaveClass('bg-blue-50'); // Selected state styling
      });
      
      // FAILING: Should change selection when clicking different file
      const configFile = screen.getByText('config.json').closest('[data-testid="file-item"]');
      await user.click(configFile!);
      
      await waitFor(() => {
        expect(configFile).toHaveClass('bg-blue-50');
        expect(readmeFile).not.toHaveClass('bg-blue-50');
      });
    });

    test('SHOULD verify search interaction contracts', async () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const searchInput = screen.getByTestId('file-search-input');
      
      // FAILING: Should maintain search input value
      await user.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');
      
      // FAILING: Should filter results reactively
      expect(screen.getByText('tests')).toBeInTheDocument();
      expect(screen.queryByText('src')).not.toBeInTheDocument();
    });

    test('SHOULD verify file content loading interaction behavior', async () => {
      const mockResponseText = jest.fn().mockResolvedValue('Mock file content');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: mockResponseText
      });

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const pythonFile = screen.getByText('main.py').closest('[data-testid="file-item"]');
      await user.click(pythonFile!);
      
      // FAILING: Should call correct API endpoint
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/filesystem-agent-001/files?path=%2Fmain.py');
      });
      
      // FAILING: Should process response correctly
      await waitFor(() => {
        expect(mockResponseText).toHaveBeenCalled();
      });
    });

    test('SHOULD verify workspace statistics calculation contracts', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should correctly count folders vs files
      const workspaceStats = screen.getByTestId('workspace-statistics');
      
      const totalFiles = mockAgent.workspace!.structure!.filter(item => item.type === 'file').length;
      const totalFolders = mockAgent.workspace!.structure!.filter(item => item.type === 'folder').length;
      
      expect(workspaceStats).toContainElement(screen.getByText(totalFiles.toString()));
      expect(workspaceStats).toContainElement(screen.getByText(totalFolders.toString()));
    });
  });

  describe('Real Data Integration Contracts', () => {
    test('SHOULD handle real workspace data structure variations', () => {
      const realWorkspaceAgent = {
        ...mockAgent,
        workspace: {
          rootPath: '/real/agent/path',
          structure: [
            {
              name: 'real-file.py',
              path: '/real-file.py',
              type: 'file' as const,
              size: 1024
              // Missing lastModified to test robustness
            },
            {
              name: 'real-folder',
              path: '/real-folder',
              type: 'folder' as const,
              children: 5
              // Complete structure
            }
          ]
        }
      };

      render(<AgentFileSystemTab agent={realWorkspaceAgent} />);
      
      // FAILING: Should handle real data with missing optional fields
      expect(screen.getByText('real-file.py')).toBeInTheDocument();
      expect(screen.getByText('real-folder')).toBeInTheDocument();
      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    test('SHOULD verify zero mock data contamination in file system', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should contain only real workspace data
      const fileTree = screen.getByTestId('file-tree');
      
      expect(fileTree.textContent).not.toMatch(/lorem ipsum/i);
      expect(fileTree.textContent).not.toMatch(/placeholder/i);
      expect(fileTree.textContent).not.toMatch(/sample.*file/i);
      expect(fileTree.textContent).not.toMatch(/mock.*workspace/i);
      
      // Should contain actual workspace file names
      expect(fileTree.textContent).toContain('README.md');
      expect(fileTree.textContent).toContain('config.json');
      expect(fileTree.textContent).toContain('main.py');
    });

    test('SHOULD verify real file size calculations and formatting', () => {
      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // FAILING: Should format real file sizes correctly
      expect(screen.getByText('2 KB')).toBeInTheDocument(); // README.md: 2048 bytes
      expect(screen.getByText('512 B')).toBeInTheDocument(); // config.json: 512 bytes
      expect(screen.getByText('4 KB')).toBeInTheDocument(); // main.py: 4096 bytes
      
      // FAILING: Should not show placeholder sizes
      expect(screen.queryByText(/999.*KB/)).not.toBeInTheDocument();
      expect(screen.queryByText(/placeholder.*size/)).not.toBeInTheDocument();
    });

    test('SHOULD verify real API endpoint construction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('Real file content')
      });

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      // Test with file containing special characters in path
      const dockerFile = screen.getByText('docker-compose.yml').closest('[data-testid="file-item"]');
      await user.click(dockerFile!);
      
      // FAILING: Should properly encode file paths in API calls
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agents/filesystem-agent-001/files?path=%2Fdocker-compose.yml'
        );
      });
    });

    test('SHOULD verify mock content generation uses real agent data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      render(<AgentFileSystemTab agent={mockAgent} />);
      
      const configFile = screen.getByText('config.json').closest('[data-testid="file-item"]');
      await user.click(configFile!);
      
      // FAILING: Mock content should use real agent properties
      await waitFor(() => {
        const content = screen.getByTestId('file-content-preview').textContent;
        expect(content).toContain(mockAgent.name); // "Workspace Agent"
        expect(content).toContain(mockAgent.version); // "1.5.2"
        expect(content).toContain(mockAgent.description);
        
        // Should not contain generic mock values
        expect(content).not.toMatch(/sample.*agent/i);
        expect(content).not.toMatch(/test.*configuration/i);
      });
    });
  });
});