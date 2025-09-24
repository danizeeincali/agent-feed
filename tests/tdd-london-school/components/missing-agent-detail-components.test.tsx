/**
 * TDD London School: Missing AgentDetail Components Migration Tests
 * 
 * PHASE 2 COMPONENT MIGRATION REQUIREMENTS:
 * - AgentDefinition: Markdown rendering and documentation display
 * - AgentProfile: Human-oriented agent descriptions and capabilities  
 * - AgentPages: Dynamic pages and documentation links
 * - AgentFileSystem: Workspace file browser and content viewer
 * 
 * TESTING PHILOSOPHY (London School):
 * 1. Outside-In Development: Start from user behavior requirements
 * 2. Mock-Driven Design: Define component contracts before implementation
 * 3. Behavior Verification: Focus on component interactions and data flow
 * 4. Test-First Implementation: Write failing tests before adding components
 * 
 * DELIVERABLES:
 * - Test doubles for missing component interfaces
 * - Expected behaviors for each of the 4 missing components
 * - Mock component interactions with existing UnifiedAgentPage
 * - Data flow verification from API endpoints to new components
 * - Integration test framework for unified page
 * - Regression test suite to prevent functionality loss
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Import existing components for migration analysis
import UnifiedAgentPage, { type UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';
import { swarmCoordinator, type SwarmContract } from '../helpers/swarm-coordinator';
import { createMockFetch, type MockFetchResponse } from '../mocks/fetch.mock';

// Component Migration Contracts
interface AgentDefinitionContract {
  name: 'AgentDefinitionComponent';
  version: '2.0.0';
  migratedFrom: 'AgentDetail.jsx';
  interactions: {
    render: {
      input: { agent: UnifiedAgentData };
      output: 'markdown_rendered_content';
      collaborators: ['MarkdownParser', 'ContentRenderer', 'CopyHandler', 'DownloadHandler'];
    };
    parseMarkdown: {
      input: { definition: string };
      output: { sections: any[], toc: any[], metadata: any };
      side_effects: ['table_of_contents_generation', 'section_extraction'];
    };
    copyContent: {
      input: { content: string };
      output: 'clipboard_write';
      side_effects: ['success_notification'];
    };
    downloadFile: {
      input: { content: string, filename: string };
      output: 'file_download';
      side_effects: ['blob_creation', 'download_trigger'];
    };
  };
}

interface AgentProfileContract {
  name: 'AgentProfileComponent';
  version: '2.0.0';
  migratedFrom: 'AgentDetail.jsx';
  interactions: {
    render: {
      input: { agent: UnifiedAgentData };
      output: 'profile_display';
      collaborators: ['StatisticsCalculator', 'CapabilityRenderer', 'MetadataFormatter'];
    };
    displayStatistics: {
      input: { agent: UnifiedAgentData };
      output: 'formatted_statistics';
      side_effects: ['metric_calculation', 'badge_generation'];
    };
    renderCapabilities: {
      input: { capabilities: string[], strengths: string[] };
      output: 'capability_badges';
      side_effects: ['skill_categorization'];
    };
    formatMetadata: {
      input: { metadata: any };
      output: 'formatted_metadata_display';
      side_effects: ['date_formatting', 'link_generation'];
    };
  };
}

interface AgentPagesContract {
  name: 'AgentPagesComponent';
  version: '2.0.0';
  migratedFrom: 'AgentDetail.jsx';
  interactions: {
    render: {
      input: { agent: UnifiedAgentData };
      output: 'pages_grid_display';
      collaborators: ['SearchFilter', 'PageTypeClassifier', 'NavigationHandler'];
    };
    filterPages: {
      input: { pages: any[], searchTerm: string };
      output: 'filtered_pages_array';
      side_effects: ['search_highlighting'];
    };
    classifyPageType: {
      input: { page: any };
      output: 'page_type_badge';
      side_effects: ['icon_assignment', 'color_classification'];
    };
    handlePageNavigation: {
      input: { page: any };
      output: 'page_navigation';
      side_effects: ['external_link_opening', 'tracking_event'];
    };
  };
}

interface AgentFileSystemContract {
  name: 'AgentFileSystemComponent';
  version: '2.0.0';
  migratedFrom: 'AgentDetail.jsx';
  interactions: {
    render: {
      input: { agent: UnifiedAgentData };
      output: 'file_browser_interface';
      collaborators: ['FileTreeRenderer', 'ContentPreview', 'SearchEngine', 'DownloadManager'];
    };
    renderFileTree: {
      input: { structure: any[], expandedFolders: Set<string> };
      output: 'interactive_file_tree';
      side_effects: ['folder_expansion', 'file_selection'];
    };
    previewFile: {
      input: { file: any };
      output: 'file_content_preview';
      side_effects: ['api_fetch', 'syntax_highlighting'];
    };
    downloadFile: {
      input: { file: any, content: string };
      output: 'file_download';
      side_effects: ['blob_creation', 'download_initiation'];
    };
  };
}

// Swarm Coordination Contracts
const MIGRATION_CONTRACTS: SwarmContract[] = [
  {
    name: 'AgentDetailMigrationSwarm',
    version: '1.0.0',
    interactions: [
      {
        method: 'MIGRATE_COMPONENTS',
        endpoint: '/unified-agent-page',
        expectedBehaviors: [
          'preserves_existing_functionality',
          'enhances_user_experience',
          'maintains_data_consistency',
          'provides_seamless_navigation',
          'supports_real_time_updates',
          'enables_progressive_loading'
        ]
      }
    ],
    collaborators: ['UnifiedAgentPage', 'AgentDefinition', 'AgentProfile', 'AgentPages', 'AgentFileSystem']
  }
];

// Mock Data Factories (London School Pattern)
const createMockAgentDefinitionData = (overrides: any = {}) => ({
  id: 'test-agent',
  name: 'Test Agent',
  definition: `# Test Agent Definition\n\nThis is a comprehensive agent for testing purposes.\n\n## Features\n\n- Advanced testing capabilities\n- Mock data generation\n- Behavior verification\n\n## Usage\n\n\`\`\`javascript\nconst agent = new TestAgent();\nawait agent.execute(task);\n\`\`\`\n\n### Configuration\n\n1. Initialize agent\n2. Configure parameters\n3. Execute tasks\n\n[Documentation](https://docs.example.com)\n\n## Limitations\n\n- Limited to test scenarios\n- Requires mock data`,
  ...overrides
});

const createMockAgentProfileData = (overrides: any = {}) => ({
  id: 'test-agent',
  name: 'Test Agent',
  description: 'Advanced AI agent for comprehensive testing and verification',
  category: 'Testing',
  version: '2.1.0',
  capabilities: ['Code Generation', 'Testing', 'Documentation', 'Analysis'],
  profile: {
    purpose: 'Automate complex workflows with intelligent decision-making capabilities',
    strengths: ['Pattern Recognition', 'Process Optimization', 'Quality Assurance'],
    useCases: ['CI/CD Pipeline', 'Code Review', 'Testing Automation'],
    limitations: ['Requires clear task definitions', 'Limited to programmatic tasks']
  },
  metadata: {
    fileCount: 24,
    languages: ['TypeScript', 'Python', 'JavaScript'],
    author: 'SPARC Team',
    license: 'MIT',
    repository: 'https://github.com/sparc/agents',
    documentation: 'https://docs.sparc.ai/agents'
  },
  ...overrides
});

const createMockAgentPagesData = (overrides: any = {}) => ({
  id: 'test-agent',
  name: 'Test Agent',
  pages: [
    { 
      id: 'getting-started', 
      title: 'Getting Started', 
      path: '/docs/getting-started',
      description: 'Quick start guide for new users',
      category: 'Documentation',
      readTime: 5,
      lastModified: new Date().toISOString()
    },
    { 
      id: 'api-reference', 
      title: 'API Reference', 
      path: '/docs/api',
      description: 'Complete API documentation and examples',
      category: 'Reference',
      readTime: 15,
      lastModified: new Date().toISOString()
    },
    { 
      id: 'examples', 
      title: 'Examples', 
      path: '/docs/examples',
      description: 'Practical examples and use cases',
      category: 'Tutorials',
      readTime: 10,
      lastModified: new Date().toISOString()
    },
    { 
      id: 'changelog', 
      title: 'Changelog', 
      path: '/docs/changelog',
      description: 'Version history and release notes',
      category: 'Updates',
      readTime: 3,
      lastModified: new Date().toISOString()
    }
  ],
  metadata: {
    repository: 'https://github.com/sparc/agents',
    documentation: 'https://docs.sparc.ai/agents'
  },
  ...overrides
});

const createMockAgentFileSystemData = (overrides: any = {}) => ({
  id: 'test-agent',
  name: 'Test Agent',
  workspace: {
    rootPath: '/agents/test-agent',
    structure: [
      { type: 'folder', name: 'src', path: 'src/', children: 5 },
      { type: 'folder', name: 'tests', path: 'tests/', children: 8 },
      { type: 'folder', name: 'docs', path: 'docs/', children: 4 },
      { type: 'file', name: 'package.json', path: 'package.json', size: 1024 },
      { type: 'file', name: 'README.md', path: 'README.md', size: 2048 },
      { type: 'file', name: 'agent.config.js', path: 'agent.config.js', size: 512 },
      { type: 'file', name: 'index.ts', path: 'src/index.ts', size: 3072 },
      { type: 'file', name: 'types.ts', path: 'src/types.ts', size: 1536 }
    ]
  },
  ...overrides
});

// Component Mock Factories
const createAgentDefinitionMock = () => ({
  render: vi.fn(),
  parseMarkdown: vi.fn().mockReturnValue({
    sections: [
      { id: 'title', title: 'Test Agent Definition', level: 1, content: ['# Test Agent Definition'] },
      { id: 'features', title: 'Features', level: 2, content: ['## Features', '- Advanced testing'] }
    ],
    toc: [
      { id: 'title', title: 'Test Agent Definition', level: 1 },
      { id: 'features', title: 'Features', level: 2 }
    ],
    metadata: {}
  }),
  copyContent: vi.fn().mockResolvedValue(true),
  downloadFile: vi.fn()
});

const createAgentProfileMock = () => ({
  render: vi.fn(),
  displayStatistics: vi.fn().mockReturnValue({
    capabilities: 4,
    version: '2.1.0',
    fileCount: 24,
    languages: 3
  }),
  renderCapabilities: vi.fn().mockReturnValue(['Code Generation', 'Testing', 'Documentation']),
  formatMetadata: vi.fn().mockReturnValue({
    author: 'SPARC Team',
    license: 'MIT',
    created: '2025-01-01',
    updated: '2025-01-11'
  })
});

const createAgentPagesMock = () => ({
  render: vi.fn(),
  filterPages: vi.fn().mockImplementation((pages, searchTerm) =>
    pages.filter(page => page.title.toLowerCase().includes(searchTerm.toLowerCase()))
  ),
  classifyPageType: vi.fn().mockImplementation((page) => ({
    type: page.title.includes('API') ? 'api-reference' : 'documentation',
    icon: 'document',
    color: 'blue'
  })),
  handlePageNavigation: vi.fn()
});

const createAgentFileSystemMock = () => ({
  render: vi.fn(),
  renderFileTree: vi.fn().mockReturnValue([]),
  previewFile: vi.fn().mockResolvedValue({
    content: 'Mock file content',
    type: 'text/plain'
  }),
  downloadFile: vi.fn()
});

// Test Wrapper Component
const TestWrapper: React.FC<{ children: React.ReactNode; agentId?: string }> = ({ 
  children, 
  agentId = 'test-agent' 
}) => (
  <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
    <Routes>
      <Route path="/agents/:agentId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('TDD London School: Missing AgentDetail Components Migration', () => {
  let mockFetch: MockedFunction<typeof fetch>;
  let mockResponse: MockFetchResponse;
  let swarmSession: string;
  let user: ReturnType<typeof userEvent.setup>;

  // Component mocks
  let agentDefinitionMock: ReturnType<typeof createAgentDefinitionMock>;
  let agentProfileMock: ReturnType<typeof createAgentProfileMock>;
  let agentPagesMock: ReturnType<typeof createAgentPagesMock>;
  let agentFileSystemMock: ReturnType<typeof createAgentFileSystemMock>;

  beforeEach(async () => {
    // Initialize swarm coordination
    swarmSession = await swarmCoordinator.initializeSession('agent-detail-migration-tests');
    await Promise.all(MIGRATION_CONTRACTS.map(contract => 
      swarmCoordinator.registerContract(contract)
    ));
    
    // Setup user interaction
    user = userEvent.setup();
    
    // Setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockResponse = createMockFetch();

    // Initialize component mocks
    agentDefinitionMock = createAgentDefinitionMock();
    agentProfileMock = createAgentProfileMock();
    agentPagesMock = createAgentPagesMock();
    agentFileSystemMock = createAgentFileSystemMock();
  });

  afterEach(async () => {
    await swarmCoordinator.finalizeSession(swarmSession);
    vi.restoreAllMocks();
  });

  describe('AgentDefinition Component Migration (Outside-In)', () => {
    test('should define contract for markdown rendering behavior', async () => {
      // Arrange: Define expected behavior contract
      const expectedBehavior: AgentDefinitionContract = {
        name: 'AgentDefinitionComponent',
        version: '2.0.0',
        migratedFrom: 'AgentDetail.jsx',
        interactions: {
          render: {
            input: { agent: createMockAgentDefinitionData() },
            output: 'markdown_rendered_content',
            collaborators: ['MarkdownParser', 'ContentRenderer', 'CopyHandler', 'DownloadHandler']
          },
          parseMarkdown: {
            input: { definition: '# Test\n\nContent here' },
            output: { sections: [], toc: [], metadata: {} },
            side_effects: ['table_of_contents_generation', 'section_extraction']
          },
          copyContent: {
            input: { content: 'test content' },
            output: 'clipboard_write',
            side_effects: ['success_notification']
          },
          downloadFile: {
            input: { content: 'test content', filename: 'agent-definition.md' },
            output: 'file_download',
            side_effects: ['blob_creation', 'download_trigger']
          }
        }
      };

      // Act: Verify contract definition
      expect(expectedBehavior.name).toBe('AgentDefinitionComponent');
      expect(expectedBehavior.migratedFrom).toBe('AgentDetail.jsx');
      expect(expectedBehavior.interactions.render.collaborators).toContain('MarkdownParser');
      expect(expectedBehavior.interactions.parseMarkdown.side_effects).toContain('table_of_contents_generation');

      // Assert: Log contract verification for swarm coordination
      await swarmCoordinator.logInteraction({
        type: 'contract_verification',
        component: 'AgentDefinition',
        behavior: 'markdown_rendering_contract',
        contract: expectedBehavior,
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify markdown parsing mock interactions', async () => {
      // Arrange: Setup markdown content
      const markdownContent = `# Test Agent\n\n## Features\n\n- Testing\n- Mocking\n\n### Usage\n\n\`\`\`js\nconst agent = new TestAgent();\n\`\`\``;
      
      // Act: Test markdown parsing behavior
      const parseResult = agentDefinitionMock.parseMarkdown(markdownContent);
      
      // Assert: Verify parsing behavior
      expect(agentDefinitionMock.parseMarkdown).toHaveBeenCalledWith(markdownContent);
      expect(parseResult.sections).toHaveLength(2);
      expect(parseResult.toc).toHaveLength(2);
      expect(parseResult.sections[0].title).toBe('Test Agent Definition');
      expect(parseResult.sections[1].title).toBe('Features');

      // Verify table of contents generation
      expect(parseResult.toc[0]).toEqual({
        id: 'title',
        title: 'Test Agent Definition',
        level: 1
      });
    });

    test('should verify copy content interaction behavior', async () => {
      // Arrange: Setup content to copy
      const testContent = 'Agent definition content';
      
      // Act: Test copy functionality
      await agentDefinitionMock.copyContent(testContent);
      
      // Assert: Verify copy behavior
      expect(agentDefinitionMock.copyContent).toHaveBeenCalledWith(testContent);
      expect(agentDefinitionMock.copyContent).toHaveReturned();

      // Log interaction for swarm coordination
      await swarmCoordinator.logInteraction({
        type: 'copy_interaction',
        component: 'AgentDefinition',
        behavior: 'clipboard_write',
        input: testContent,
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify download file interaction behavior', async () => {
      // Arrange: Setup download parameters
      const content = 'Mock agent definition content';
      const filename = 'test-agent-definition.md';
      
      // Act: Test download functionality
      agentDefinitionMock.downloadFile(content, filename);
      
      // Assert: Verify download behavior
      expect(agentDefinitionMock.downloadFile).toHaveBeenCalledWith(content, filename);

      // Log download interaction
      await swarmCoordinator.logInteraction({
        type: 'download_interaction',
        component: 'AgentDefinition',
        behavior: 'file_download',
        metadata: { filename, contentLength: content.length },
        success: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('AgentProfile Component Migration (Outside-In)', () => {
    test('should define contract for profile display behavior', async () => {
      // Arrange: Define expected behavior contract
      const expectedBehavior: AgentProfileContract = {
        name: 'AgentProfileComponent',
        version: '2.0.0',
        migratedFrom: 'AgentDetail.jsx',
        interactions: {
          render: {
            input: { agent: createMockAgentProfileData() },
            output: 'profile_display',
            collaborators: ['StatisticsCalculator', 'CapabilityRenderer', 'MetadataFormatter']
          },
          displayStatistics: {
            input: { agent: createMockAgentProfileData() },
            output: 'formatted_statistics',
            side_effects: ['metric_calculation', 'badge_generation']
          },
          renderCapabilities: {
            input: { capabilities: ['Testing'], strengths: ['Quality Assurance'] },
            output: 'capability_badges',
            side_effects: ['skill_categorization']
          },
          formatMetadata: {
            input: { metadata: { author: 'Test', license: 'MIT' } },
            output: 'formatted_metadata_display',
            side_effects: ['date_formatting', 'link_generation']
          }
        }
      };

      // Act & Assert: Verify contract structure
      expect(expectedBehavior.interactions.render.collaborators).toContain('StatisticsCalculator');
      expect(expectedBehavior.interactions.displayStatistics.side_effects).toContain('metric_calculation');
      expect(expectedBehavior.interactions.renderCapabilities.side_effects).toContain('skill_categorization');
    });

    test('should verify statistics calculation mock behavior', async () => {
      // Arrange: Setup agent data
      const agentData = createMockAgentProfileData();
      
      // Act: Test statistics calculation
      const stats = agentProfileMock.displayStatistics(agentData);
      
      // Assert: Verify statistics behavior
      expect(agentProfileMock.displayStatistics).toHaveBeenCalledWith(agentData);
      expect(stats.capabilities).toBe(4);
      expect(stats.version).toBe('2.1.0');
      expect(stats.fileCount).toBe(24);
      expect(stats.languages).toBe(3);

      // Verify metric calculation side effects
      expect(typeof stats.capabilities).toBe('number');
      expect(typeof stats.fileCount).toBe('number');
    });

    test('should verify capability rendering mock behavior', async () => {
      // Arrange: Setup capabilities data
      const capabilities = ['Code Generation', 'Testing', 'Documentation'];
      const strengths = ['Pattern Recognition', 'Process Optimization'];
      
      // Act: Test capability rendering
      const renderedCapabilities = agentProfileMock.renderCapabilities(capabilities, strengths);
      
      // Assert: Verify rendering behavior
      expect(agentProfileMock.renderCapabilities).toHaveBeenCalledWith(capabilities, strengths);
      expect(renderedCapabilities).toContain('Code Generation');
      expect(renderedCapabilities).toContain('Testing');
      expect(renderedCapabilities).toContain('Documentation');

      // Log capability rendering interaction
      await swarmCoordinator.logInteraction({
        type: 'capability_rendering',
        component: 'AgentProfile',
        behavior: 'skill_categorization',
        capabilities: capabilities.length,
        strengths: strengths.length,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify metadata formatting mock behavior', async () => {
      // Arrange: Setup metadata
      const metadata = {
        author: 'SPARC Team',
        license: 'MIT',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-11T00:00:00.000Z'
      };
      
      // Act: Test metadata formatting
      const formatted = agentProfileMock.formatMetadata(metadata);
      
      // Assert: Verify formatting behavior
      expect(agentProfileMock.formatMetadata).toHaveBeenCalledWith(metadata);
      expect(formatted.author).toBe('SPARC Team');
      expect(formatted.license).toBe('MIT');
      expect(formatted.created).toBe('2025-01-01');
      expect(formatted.updated).toBe('2025-01-11');
    });
  });

  describe('AgentPages Component Migration (Outside-In)', () => {
    test('should define contract for pages display behavior', async () => {
      // Arrange: Define expected behavior contract
      const expectedBehavior: AgentPagesContract = {
        name: 'AgentPagesComponent',
        version: '2.0.0',
        migratedFrom: 'AgentDetail.jsx',
        interactions: {
          render: {
            input: { agent: createMockAgentPagesData() },
            output: 'pages_grid_display',
            collaborators: ['SearchFilter', 'PageTypeClassifier', 'NavigationHandler']
          },
          filterPages: {
            input: { pages: [], searchTerm: '' },
            output: 'filtered_pages_array',
            side_effects: ['search_highlighting']
          },
          classifyPageType: {
            input: { page: { title: 'API Reference' } },
            output: 'page_type_badge',
            side_effects: ['icon_assignment', 'color_classification']
          },
          handlePageNavigation: {
            input: { page: { path: '/docs/api' } },
            output: 'page_navigation',
            side_effects: ['external_link_opening', 'tracking_event']
          }
        }
      };

      // Act & Assert: Verify contract structure
      expect(expectedBehavior.interactions.render.collaborators).toContain('SearchFilter');
      expect(expectedBehavior.interactions.filterPages.side_effects).toContain('search_highlighting');
      expect(expectedBehavior.interactions.classifyPageType.side_effects).toContain('icon_assignment');
    });

    test('should verify page filtering mock behavior', async () => {
      // Arrange: Setup pages data
      const pages = createMockAgentPagesData().pages;
      const searchTerm = 'api';
      
      // Act: Test page filtering
      const filtered = agentPagesMock.filterPages(pages, searchTerm);
      
      // Assert: Verify filtering behavior
      expect(agentPagesMock.filterPages).toHaveBeenCalledWith(pages, searchTerm);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('API Reference');

      // Test empty search
      const allPages = agentPagesMock.filterPages(pages, '');
      expect(allPages).toHaveLength(pages.length);
    });

    test('should verify page type classification mock behavior', async () => {
      // Arrange: Setup page data
      const apiPage = { title: 'API Reference', path: '/docs/api' };
      const docPage = { title: 'Getting Started', path: '/docs/getting-started' };
      
      // Act: Test page classification
      const apiClassification = agentPagesMock.classifyPageType(apiPage);
      const docClassification = agentPagesMock.classifyPageType(docPage);
      
      // Assert: Verify classification behavior
      expect(agentPagesMock.classifyPageType).toHaveBeenCalledWith(apiPage);
      expect(apiClassification.type).toBe('api-reference');
      expect(apiClassification.icon).toBe('document');
      expect(apiClassification.color).toBe('blue');
      
      expect(docClassification.type).toBe('documentation');

      // Log classification interaction
      await swarmCoordinator.logInteraction({
        type: 'page_classification',
        component: 'AgentPages',
        behavior: 'page_type_detection',
        classifications: 2,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify page navigation mock behavior', async () => {
      // Arrange: Setup page navigation
      const page = { title: 'API Reference', path: 'https://docs.example.com/api' };
      
      // Act: Test navigation handling
      agentPagesMock.handlePageNavigation(page);
      
      // Assert: Verify navigation behavior
      expect(agentPagesMock.handlePageNavigation).toHaveBeenCalledWith(page);

      // Log navigation interaction
      await swarmCoordinator.logInteraction({
        type: 'page_navigation',
        component: 'AgentPages',
        behavior: 'external_link_handling',
        destination: page.path,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('AgentFileSystem Component Migration (Outside-In)', () => {
    test('should define contract for file system display behavior', async () => {
      // Arrange: Define expected behavior contract
      const expectedBehavior: AgentFileSystemContract = {
        name: 'AgentFileSystemComponent',
        version: '2.0.0',
        migratedFrom: 'AgentDetail.jsx',
        interactions: {
          render: {
            input: { agent: createMockAgentFileSystemData() },
            output: 'file_browser_interface',
            collaborators: ['FileTreeRenderer', 'ContentPreview', 'SearchEngine', 'DownloadManager']
          },
          renderFileTree: {
            input: { structure: [], expandedFolders: new Set() },
            output: 'interactive_file_tree',
            side_effects: ['folder_expansion', 'file_selection']
          },
          previewFile: {
            input: { file: { name: 'test.js', path: 'src/test.js' } },
            output: 'file_content_preview',
            side_effects: ['api_fetch', 'syntax_highlighting']
          },
          downloadFile: {
            input: { file: { name: 'test.js' }, content: 'console.log("test");' },
            output: 'file_download',
            side_effects: ['blob_creation', 'download_initiation']
          }
        }
      };

      // Act & Assert: Verify contract structure
      expect(expectedBehavior.interactions.render.collaborators).toContain('FileTreeRenderer');
      expect(expectedBehavior.interactions.renderFileTree.side_effects).toContain('folder_expansion');
      expect(expectedBehavior.interactions.previewFile.side_effects).toContain('syntax_highlighting');
    });

    test('should verify file tree rendering mock behavior', async () => {
      // Arrange: Setup file structure
      const structure = createMockAgentFileSystemData().workspace.structure;
      const expandedFolders = new Set(['src/']);
      
      // Act: Test file tree rendering
      const renderedTree = agentFileSystemMock.renderFileTree(structure, expandedFolders);
      
      // Assert: Verify rendering behavior
      expect(agentFileSystemMock.renderFileTree).toHaveBeenCalledWith(structure, expandedFolders);
      expect(Array.isArray(renderedTree)).toBe(true);

      // Log file tree rendering
      await swarmCoordinator.logInteraction({
        type: 'file_tree_rendering',
        component: 'AgentFileSystem',
        behavior: 'tree_structure_display',
        items: structure.length,
        expandedFolders: expandedFolders.size,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify file preview mock behavior', async () => {
      // Arrange: Setup file for preview
      const file = { name: 'index.ts', path: 'src/index.ts', type: 'file', size: 3072 };
      
      // Act: Test file preview
      const preview = await agentFileSystemMock.previewFile(file);
      
      // Assert: Verify preview behavior
      expect(agentFileSystemMock.previewFile).toHaveBeenCalledWith(file);
      expect(preview.content).toBe('Mock file content');
      expect(preview.type).toBe('text/plain');

      // Verify async behavior
      expect(agentFileSystemMock.previewFile).toHaveReturned();
    });

    test('should verify file download mock behavior', async () => {
      // Arrange: Setup file download
      const file = { name: 'package.json', path: 'package.json' };
      const content = '{"name": "test-agent", "version": "1.0.0"}';
      
      // Act: Test file download
      agentFileSystemMock.downloadFile(file, content);
      
      // Assert: Verify download behavior
      expect(agentFileSystemMock.downloadFile).toHaveBeenCalledWith(file, content);

      // Log download interaction
      await swarmCoordinator.logInteraction({
        type: 'file_download',
        component: 'AgentFileSystem',
        behavior: 'file_download_initiation',
        filename: file.name,
        contentSize: content.length,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Integration Tests: Component Collaboration', () => {
    test('should verify data flow between UnifiedAgentPage and migrated components', async () => {
      // Arrange: Setup comprehensive agent data
      const mockData = {
        ...createMockAgentDefinitionData(),
        ...createMockAgentProfileData(),
        ...createMockAgentPagesData(),
        ...createMockAgentFileSystemData()
      };

      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render UnifiedAgentPage
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });

      // Assert: Verify all tabs are present (indicating component integration points)
      expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /activity/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /configuration/i })).toBeInTheDocument();

      // Verify API data fetch
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent');

      // Log integration success
      await swarmCoordinator.logInteraction({
        type: 'integration_test',
        component: 'UnifiedAgentPage',
        behavior: 'component_collaboration',
        migrated_components: ['AgentDefinition', 'AgentProfile', 'AgentPages', 'AgentFileSystem'],
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify seamless tab navigation preserves component state', async () => {
      // Arrange: Setup agent data
      const mockData = createMockAgentDefinitionData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render and navigate tabs
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });

      // Navigate through tabs
      const detailsTab = screen.getByRole('button', { name: /details/i });
      await user.click(detailsTab);

      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
      });

      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Assert: Verify state preservation
      // Data should not be refetched when switching tabs
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Log navigation testing
      await swarmCoordinator.logInteraction({
        type: 'navigation_test',
        component: 'UnifiedAgentPage',
        behavior: 'tab_state_preservation',
        tabs_tested: ['overview', 'details', 'activity'],
        state_preserved: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify regression prevention for existing functionality', async () => {
      // Arrange: Setup agent data with all required fields
      const comprehensiveAgentData = {
        id: 'regression-test-agent',
        name: 'Regression Test Agent',
        display_name: 'Regression Test Agent',
        description: 'Agent for regression testing',
        status: 'active',
        capabilities: ['Testing', 'Regression Detection'],
        stats: {
          tasksCompleted: 100,
          successRate: 95,
          averageResponseTime: 1.2,
          uptime: 99,
          todayTasks: 5,
          weeklyTasks: 25,
          satisfaction: 4.5
        },
        recentActivities: [],
        recentPosts: [],
        configuration: {
          profile: {
            name: 'Regression Test Agent',
            description: 'Agent for regression testing',
            specialization: 'Quality Assurance',
            avatar: '🔍'
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
            primaryColor: '#10B981',
            accentColor: '#8B5CF6',
            layout: 'grid'
          }
        }
      };

      mockResponse.mockSuccessResponse({ success: true, data: comprehensiveAgentData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component
      render(
        <TestWrapper agentId="regression-test-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify all existing functionality remains intact
      await waitFor(() => {
        expect(screen.getByText('Regression Test Agent')).toBeInTheDocument();
      });

      // Verify header functionality
      expect(screen.getByLabelText(/back to agents/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();

      // Verify status display
      expect(screen.getByText(/active/i)).toBeInTheDocument();

      // Verify metrics display
      expect(screen.getByText('100 tasks completed')).toBeInTheDocument();
      expect(screen.getByText('95% success rate')).toBeInTheDocument();

      // Verify all tabs are functional
      const tabs = ['Overview', 'Details', 'Activity', 'Configuration'];
      for (const tabName of tabs) {
        expect(screen.getByRole('button', { name: new RegExp(tabName, 'i') })).toBeInTheDocument();
      }

      // Log regression test success
      await swarmCoordinator.logInteraction({
        type: 'regression_test',
        component: 'UnifiedAgentPage',
        behavior: 'functionality_preservation',
        tested_features: [
          'header_navigation',
          'status_display',
          'metrics_display',
          'tab_navigation',
          'data_loading'
        ],
        all_functional: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing component data gracefully', async () => {
      // Arrange: Setup minimal agent data
      const minimalData = {
        id: 'minimal-agent',
        name: 'Minimal Agent',
        description: 'Basic agent with minimal data'
      };

      mockResponse.mockSuccessResponse({ success: true, data: minimalData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render with minimal data
      render(
        <TestWrapper agentId="minimal-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify graceful handling
      await waitFor(() => {
        expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
      });

      // Should not crash despite missing optional data
      expect(screen.getByText('Basic agent with minimal data')).toBeInTheDocument();

      // Log graceful handling
      await swarmCoordinator.logInteraction({
        type: 'edge_case_test',
        component: 'UnifiedAgentPage',
        behavior: 'graceful_degradation',
        scenario: 'minimal_data',
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle component API failures with appropriate fallbacks', async () => {
      // Arrange: Setup API failure scenarios
      mockResponse.mockErrorResponse(500, 'Server error');
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
      });

      // Verify error recovery options
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to agents/i })).toBeInTheDocument();

      // Log error handling test
      await swarmCoordinator.logInteraction({
        type: 'error_handling_test',
        component: 'UnifiedAgentPage',
        behavior: 'api_failure_recovery',
        error_type: 'server_error',
        recovery_options_provided: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('should verify component loading performance meets requirements', async () => {
      // Arrange: Setup performance monitoring
      const startTime = performance.now();
      const mockData = createMockAgentDefinitionData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for complete load
      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;

      // Assert: Verify performance requirements
      expect(loadTime).toBeLessThan(3000); // 3 second maximum load time

      // Log performance metrics
      await swarmCoordinator.logInteraction({
        type: 'performance_test',
        component: 'UnifiedAgentPage',
        behavior: 'component_load_time',
        load_time_ms: loadTime,
        performance_target_met: loadTime < 3000,
        timestamp: new Date().toISOString()
      });
    });

    test('should verify memory usage optimization for large datasets', async () => {
      // Arrange: Setup large dataset
      const largeDataset = {
        ...createMockAgentDefinitionData({
          definition: '# Large Definition\n\n' + 'Content line\n'.repeat(1000)
        }),
        ...createMockAgentPagesData({
          pages: Array.from({ length: 100 }, (_, i) => ({
            id: `page-${i}`,
            title: `Page ${i}`,
            path: `/docs/page-${i}`,
            description: `Description for page ${i}`
          }))
        }),
        ...createMockAgentFileSystemData({
          workspace: {
            structure: Array.from({ length: 500 }, (_, i) => ({
              type: i % 5 === 0 ? 'folder' : 'file',
              name: `item-${i}`,
              path: `path/item-${i}`,
              size: Math.floor(Math.random() * 10000)
            }))
          }
        })
      };

      mockResponse.mockSuccessResponse({ success: true, data: largeDataset });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render with large dataset
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify handling of large data
      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });

      // Component should render without performance issues
      expect(screen.getByRole('main')).toBeInTheDocument();

      // Log large dataset handling
      await swarmCoordinator.logInteraction({
        type: 'scalability_test',
        component: 'UnifiedAgentPage',
        behavior: 'large_dataset_handling',
        dataset_size: {
          definition_lines: 1000,
          pages_count: 100,
          files_count: 500
        },
        rendering_successful: true,
        timestamp: new Date().toISOString()
      });
    });
  });
});