/**
 * AgentFileSystemTab TDD Tests
 * Testing the workspace file browser and preview functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AgentFileSystemTab from '../../../src/components/AgentFileSystemTab';
import type { UnifiedAgentData } from '../../../src/components/UnifiedAgentPage';

// Test data factory
const createMockAgent = (overrides: Partial<UnifiedAgentData> = {}): UnifiedAgentData => ({
  id: 'test-agent-1',
  name: 'Test Agent',
  description: 'Test agent description',
  status: 'active',
  capabilities: ['file-management', 'code-analysis'],
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
      specialization: 'File Management',
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
    rootPath: '/workspace/test-agent',
    totalSize: '156.8 MB',
    fileCount: 847,
    lastModified: '2024-01-15T14:30:00Z',
    structure: [
      {
        id: 'file-1',
        name: 'README.md',
        path: '/README.md',
        type: 'file',
        size: 2048,
        lastModified: '2024-01-15T10:00:00Z',
        extension: 'md',
        mimeType: 'text/markdown',
        isReadable: true,
        isExecutable: false
      },
      {
        id: 'dir-1',
        name: 'src',
        path: '/src',
        type: 'directory',
        size: 45672960,
        lastModified: '2024-01-14T16:45:00Z',
        children: [
          {
            id: 'file-2',
            name: 'index.ts',
            path: '/src/index.ts',
            type: 'file',
            size: 4096,
            lastModified: '2024-01-14T16:45:00Z',
            extension: 'ts',
            mimeType: 'text/typescript',
            isReadable: true,
            isExecutable: false
          },
          {
            id: 'file-3',
            name: 'config.json',
            path: '/src/config.json',
            type: 'file',
            size: 1024,
            lastModified: '2024-01-13T09:30:00Z',
            extension: 'json',
            mimeType: 'application/json',
            isReadable: true,
            isExecutable: false
          },
          {
            id: 'dir-2',
            name: 'components',
            path: '/src/components',
            type: 'directory',
            size: 20480000,
            lastModified: '2024-01-14T15:00:00Z',
            children: [
              {
                id: 'file-4',
                name: 'Button.tsx',
                path: '/src/components/Button.tsx',
                type: 'file',
                size: 8192,
                lastModified: '2024-01-14T15:00:00Z',
                extension: 'tsx',
                mimeType: 'text/typescript-jsx',
                isReadable: true,
                isExecutable: false
              }
            ]
          }
        ]
      },
      {
        id: 'dir-3',
        name: 'docs',
        path: '/docs',
        type: 'directory',
        size: 10485760,
        lastModified: '2024-01-12T11:20:00Z',
        children: [
          {
            id: 'file-5',
            name: 'api.md',
            path: '/docs/api.md',
            type: 'file',
            size: 16384,
            lastModified: '2024-01-12T11:20:00Z',
            extension: 'md',
            mimeType: 'text/markdown',
            isReadable: true,
            isExecutable: false
          }
        ]
      },
      {
        id: 'file-6',
        name: 'package.json',
        path: '/package.json',
        type: 'file',
        size: 2048,
        lastModified: '2024-01-10T14:15:00Z',
        extension: 'json',
        mimeType: 'application/json',
        isReadable: true,
        isExecutable: false
      },
      {
        id: 'file-7',
        name: 'binary-file.bin',
        path: '/binary-file.bin',
        type: 'file',
        size: 1048576,
        lastModified: '2024-01-08T09:00:00Z',
        extension: 'bin',
        mimeType: 'application/octet-stream',
        isReadable: false,
        isExecutable: true
      }
    ]
  },
  pages: [],
  profile: null,
  ...overrides
});

describe('AgentFileSystemTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the component with workspace structure', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('agent-filesystem-tab')).toBeInTheDocument();
      expect(screen.getByText('Workspace')).toBeInTheDocument();
    });

    it('should display workspace summary information', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('workspace-summary')).toBeInTheDocument();
      expect(screen.getByText(agent.workspace!.totalSize!)).toBeInTheDocument();
      expect(screen.getByText(`${agent.workspace!.fileCount} files`)).toBeInTheDocument();
    });

    it('should show empty state when no workspace available', () => {
      const agent = createMockAgent({ workspace: null });
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('empty-workspace-state')).toBeInTheDocument();
      expect(screen.getByText(/No workspace configured/i)).toBeInTheDocument();
    });

    it('should show loading state when workspace is loading', () => {
      const agent = createMockAgent({ workspace: undefined });
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('workspace-loading')).toBeInTheDocument();
    });
  });

  describe('File Tree Navigation', () => {
    it('should render file tree structure', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    it('should expand and collapse directories', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const srcDirectory = screen.getByTestId('directory-dir-1');
      expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
      
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        expect(screen.getByText('index.ts')).toBeInTheDocument();
        expect(screen.getByText('config.json')).toBeInTheDocument();
      });
    });

    it('should show different icons for different file types', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('file-icon-md')).toBeInTheDocument();
      expect(screen.getByTestId('directory-icon')).toBeInTheDocument();
    });

    it('should display file sizes and modification dates', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('file-size-file-1')).toBeInTheDocument();
      expect(screen.getByTestId('file-modified-file-1')).toBeInTheDocument();
    });

    it('should support nested directory navigation', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      // Expand src directory
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        expect(screen.getByText('components')).toBeInTheDocument();
      });
      
      // Expand components directory
      const componentsDirectory = screen.getByTestId('directory-dir-2');
      fireEvent.click(componentsDirectory);
      
      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument();
      });
    });
  });

  describe('File Preview', () => {
    it('should open file preview on file click', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const readmeFile = screen.getByTestId('file-file-1');
      fireEvent.click(readmeFile);
      
      await waitFor(() => {
        expect(screen.getByTestId('file-preview-modal')).toBeInTheDocument();
      });
    });

    it('should fetch and display file content', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('# Test Agent\n\nThis is a test readme file.')
      });

      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const readmeFile = screen.getByTestId('file-file-1');
      fireEvent.click(readmeFile);
      
      await waitFor(() => {
        expect(screen.getByText(/This is a test readme file/i)).toBeInTheDocument();
      });
    });

    it('should handle different file types appropriately', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      // Click on JSON file
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        const configFile = screen.getByTestId('file-file-3');
        fireEvent.click(configFile);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('json-syntax-highlighter')).toBeInTheDocument();
      });
    });

    it('should show binary file message for non-readable files', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const binaryFile = screen.getByTestId('file-file-7');
      fireEvent.click(binaryFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Binary file - cannot preview/i)).toBeInTheDocument();
      });
    });

    it('should support syntax highlighting for code files', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('const message = "Hello World";')
      });

      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      // Expand src and click TypeScript file
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        const tsFile = screen.getByTestId('file-file-2');
        fireEvent.click(tsFile);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
      });
    });

    it('should handle file loading errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to load file'));

      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const readmeFile = screen.getByTestId('file-file-1');
      fireEvent.click(readmeFile);
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load file content/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter files by name', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const searchInput = screen.getByTestId('file-search');
      fireEvent.change(searchInput, { target: { value: 'config' } });
      
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
        expect(screen.getByText('config.json')).toBeInTheDocument();
      });
    });

    it('should filter by file extension', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const extensionFilter = screen.getByTestId('extension-filter');
      fireEvent.change(extensionFilter, { target: { value: '.md' } });
      
      expect(screen.getByText('README.md')).toBeInTheDocument();
      expect(screen.queryByText('package.json')).not.toBeInTheDocument();
    });

    it('should filter by file type', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const typeFilter = screen.getByTestId('type-filter');
      fireEvent.change(typeFilter, { target: { value: 'directory' } });
      
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('docs')).toBeInTheDocument();
      expect(screen.queryByText('README.md')).not.toBeInTheDocument();
    });

    it('should clear all filters', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const searchInput = screen.getByTestId('file-search');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const clearButton = screen.getByTestId('clear-filters');
      fireEvent.click(clearButton);
      
      expect(searchInput).toHaveValue('');
    });
  });

  describe('File Operations', () => {
    it('should provide download functionality for files', async () => {
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      global.URL.createObjectURL = mockCreateObjectURL;
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test content']))
      });

      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const downloadButton = screen.getByTestId('download-file-1');
      fireEvent.click(downloadButton);
      
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });

    it('should copy file path to clipboard', async () => {
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const copyPathButton = screen.getByTestId('copy-path-file-1');
      fireEvent.click(copyPathButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('/README.md');
      });
    });

    it('should show file information modal', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const infoButton = screen.getByTestId('info-file-1');
      fireEvent.click(infoButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('file-info-modal')).toBeInTheDocument();
      });
    });

    it('should open file in external editor', () => {
      const mockOpen = vi.fn();
      global.open = mockOpen;

      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const openButton = screen.getByTestId('open-external-file-1');
      fireEvent.click(openButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('/README.md'),
        '_blank'
      );
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should show current path in breadcrumbs', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('breadcrumb-navigation')).toBeInTheDocument();
      expect(screen.getByText('workspace')).toBeInTheDocument();
    });

    it('should update breadcrumbs when navigating directories', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        expect(screen.getByText('src')).toBeInTheDocument();
      });
    });

    it('should allow navigation via breadcrumb clicks', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      // Navigate to nested directory
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        const componentsDirectory = screen.getByTestId('directory-dir-2');
        fireEvent.click(componentsDirectory);
      });
      
      // Click breadcrumb to go back
      const srcBreadcrumb = screen.getByTestId('breadcrumb-src');
      fireEvent.click(srcBreadcrumb);
      
      await waitFor(() => {
        expect(screen.queryByText('Button.tsx')).not.toBeInTheDocument();
      });
    });
  });

  describe('View Modes', () => {
    it('should switch between tree and list view', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      
      const listViewButton = screen.getByTestId('list-view-toggle');
      fireEvent.click(listViewButton);
      
      expect(screen.getByTestId('file-list')).toBeInTheDocument();
      expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
    });

    it('should show grid view for directories', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const gridViewButton = screen.getByTestId('grid-view-toggle');
      fireEvent.click(gridViewButton);
      
      expect(screen.getByTestId('file-grid')).toBeInTheDocument();
    });

    it('should remember view preference', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const listViewButton = screen.getByTestId('list-view-toggle');
      fireEvent.click(listViewButton);
      
      // Rerender component
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByTestId('file-list')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed workspace data', () => {
      const agent = createMockAgent({
        workspace: { structure: null } as any
      });
      
      expect(() => render(<AgentFileSystemTab agent={agent} />)).not.toThrow();
      expect(screen.getByTestId('workspace-error')).toBeInTheDocument();
    });

    it('should handle missing file permissions', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const restrictedFile = screen.getByTestId('file-file-7');
      expect(restrictedFile).toHaveClass('restricted-file');
    });

    it('should handle workspace loading failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Workspace unavailable'));
      
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Workspace temporarily unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      expect(screen.getByLabelText(/file tree/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/search files/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const treeItems = screen.getAllByRole('treeitem');
      treeItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex');
      });
    });

    it('should announce directory expansion', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/expanded/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should virtualize large file lists', () => {
      const largeWorkspace = {
        ...createMockAgent().workspace!,
        structure: Array.from({ length: 10000 }, (_, i) => ({
          id: `file-${i}`,
          name: `file-${i}.txt`,
          path: `/file-${i}.txt`,
          type: 'file',
          size: 1024,
          lastModified: '2024-01-01T00:00:00Z',
          extension: 'txt',
          mimeType: 'text/plain',
          isReadable: true,
          isExecutable: false
        }))
      };
      
      const agent = createMockAgent({ workspace: largeWorkspace });
      
      const start = performance.now();
      render(<AgentFileSystemTab agent={agent} />);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1000);
    });

    it('should lazy load directory contents', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      // Initially, nested files should not be in DOM
      expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
      
      const srcDirectory = screen.getByTestId('directory-dir-1');
      fireEvent.click(srcDirectory);
      
      // Files should be loaded after expansion
      await waitFor(() => {
        expect(screen.getByText('index.ts')).toBeInTheDocument();
      });
    });

    it('should debounce search input', async () => {
      const agent = createMockAgent();
      render(<AgentFileSystemTab agent={agent} />);
      
      const searchInput = screen.getByTestId('file-search');
      
      fireEvent.change(searchInput, { target: { value: 'c' } });
      fireEvent.change(searchInput, { target: { value: 'co' } });
      fireEvent.change(searchInput, { target: { value: 'con' } });
      
      // Should debounce and only search once
      await waitFor(() => {
        expect(screen.getByTestId('search-results')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
});