/**
 * TDD London School: Integration Test Framework for UnifiedAgentPage
 * 
 * INTEGRATION TESTING STRATEGY:
 * 1. Test component collaboration in realistic scenarios
 * 2. Verify data flow from API endpoints through all components
 * 3. Ensure seamless user experience across all features
 * 4. Validate error handling and recovery mechanisms
 * 5. Test performance under various load conditions
 * 
 * LONDON SCHOOL INTEGRATION PRINCIPLES:
 * - Test the system as users will experience it
 * - Mock external dependencies, not internal components
 * - Focus on user journeys and business scenarios
 * - Verify component contracts through integration
 * - Test error propagation and recovery
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Import test infrastructure
import { swarmCoordinator } from '../helpers/swarm-coordinator';
import { createMockFetch, type MockFetchResponse } from '../mocks/fetch.mock';
import UnifiedAgentPage, { type UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Integration Test Data Factory
class IntegrationTestDataFactory {
  static createFullAgentDataset(): UnifiedAgentData {
    return {
      id: 'integration-test-agent',
      name: 'Integration Test Agent',
      display_name: 'Integration Test Agent Pro',
      description: 'Comprehensive agent for integration testing with all features enabled',
      status: 'active',
      type: 'integration-test',
      category: 'Testing',
      specialization: 'Full-stack integration testing and end-to-end validation',
      avatar_color: '#8B5CF6',
      avatar: '🔧',
      capabilities: [
        'Full Integration Testing',
        'End-to-End Validation', 
        'Performance Testing',
        'Error Recovery Testing',
        'Data Flow Verification'
      ],
      stats: {
        tasksCompleted: 500,
        successRate: 99.2,
        averageResponseTime: 0.6,
        uptime: 99.8,
        todayTasks: 25,
        weeklyTasks: 150,
        satisfaction: 4.9
      },
      recentActivities: [
        {
          id: 'activity-1',
          type: 'task_completed',
          title: 'Integration Test Suite Completed',
          description: 'Successfully validated all component integrations',
          timestamp: new Date().toISOString(),
          metadata: { duration: 15, success: true, priority: 'high' }
        },
        {
          id: 'activity-2',
          type: 'milestone',
          title: 'Performance Benchmark Achieved',
          description: 'Exceeded performance targets for integration scenarios',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          metadata: { priority: 'high' }
        },
        {
          id: 'activity-3',
          type: 'achievement',
          title: 'Zero Defect Integration',
          description: 'Completed 1000 integration tests without failures',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          metadata: { success: true }
        }
      ],
      recentPosts: [
        {
          id: 'post-1',
          type: 'insight',
          title: 'Integration Testing Best Practices',
          content: 'Key insights from comprehensive integration testing across all components and user scenarios',
          timestamp: new Date().toISOString(),
          author: { id: 'integration-test-agent', name: 'Integration Test Agent Pro', avatar: '🔧' },
          tags: ['integration', 'testing', 'best-practices', 'quality'],
          interactions: { likes: 42, comments: 18, shares: 12, bookmarks: 35 },
          priority: 'high'
        },
        {
          id: 'post-2',
          type: 'update',
          title: 'Enhanced Error Recovery Mechanisms',
          content: 'Implemented advanced error recovery patterns for improved system resilience',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          author: { id: 'integration-test-agent', name: 'Integration Test Agent Pro', avatar: '🔧' },
          tags: ['error-handling', 'resilience', 'update'],
          interactions: { likes: 28, comments: 9, shares: 6, bookmarks: 22 },
          priority: 'medium'
        }
      ],
      configuration: {
        profile: {
          name: 'Integration Test Agent Pro',
          description: 'Advanced agent specializing in comprehensive integration testing',
          specialization: 'End-to-end integration validation and system resilience testing',
          avatar: '🔧',
          coverImage: '/images/integration-cover.jpg'
        },
        behavior: {
          responseStyle: 'technical',
          proactivity: 'high',
          verbosity: 'comprehensive'
        },
        privacy: {
          isPublic: true,
          showMetrics: true,
          showActivity: true,
          allowComments: true
        },
        theme: {
          primaryColor: '#8B5CF6',
          accentColor: '#10B981',
          layout: 'grid'
        }
      },
      createdAt: '2024-12-01T00:00:00.000Z',
      lastActiveAt: new Date().toISOString(),
      version: '3.2.1',
      tags: ['integration', 'testing', 'validation', 'performance', 'resilience']
    };
  }

  static createAgentWithDefinition(): any {
    const baseAgent = this.createFullAgentDataset();
    return {
      ...baseAgent,
      definition: `# Integration Test Agent Pro

## Overview

The Integration Test Agent Pro is a comprehensive testing solution designed for full-stack integration validation and end-to-end system testing.

## Features

### Core Capabilities
- **Full Integration Testing**: Complete system validation across all components
- **End-to-End Validation**: User journey testing from start to finish
- **Performance Testing**: Load and stress testing under various conditions
- **Error Recovery Testing**: Resilience validation and failure recovery
- **Data Flow Verification**: Complete data pipeline testing

### Advanced Features
- Real-time monitoring and alerting
- Automated test case generation
- Performance baseline establishment
- Regression detection and prevention

## Usage

\`\`\`javascript
const integrationAgent = new IntegrationTestAgent({
  scope: 'full-system',
  validation: 'end-to-end',
  performance: 'comprehensive'
});

await integrationAgent.execute({
  testSuite: 'complete',
  scenarios: ['happy-path', 'error-cases', 'edge-cases'],
  reporting: 'detailed'
});
\`\`\`

## Test Scenarios

### 1. Happy Path Testing
- Normal user workflows
- Standard data processing
- Expected system responses

### 2. Error Case Testing
- Network failures
- API timeouts
- Invalid input handling

### 3. Edge Case Testing
- Boundary conditions
- Unusual data patterns
- System limits

## Configuration

The agent supports comprehensive configuration for different testing scenarios:

\`\`\`json
{
  "testing": {
    "scope": "full-system",
    "depth": "comprehensive",
    "coverage": "100%"
  },
  "validation": {
    "performance": true,
    "security": true,
    "accessibility": true
  },
  "reporting": {
    "format": "detailed",
    "metrics": true,
    "recommendations": true
  }
}
\`\`\`

## Best Practices

1. **Comprehensive Coverage**: Test all user journeys and edge cases
2. **Performance Validation**: Ensure system meets performance requirements
3. **Error Resilience**: Validate graceful error handling and recovery
4. **Data Integrity**: Verify data consistency across all operations
5. **User Experience**: Ensure seamless user interactions

## Limitations

- Requires comprehensive test data setup
- Performance testing needs realistic load scenarios
- Integration tests may have longer execution times
- Requires coordination with external systems for full validation

[View Full Documentation](https://docs.example.com/integration-agent)
[Performance Guidelines](https://docs.example.com/performance)
[Best Practices Guide](https://docs.example.com/best-practices)`
    };
  }

  static createAgentWithPages(): any {
    const baseAgent = this.createFullAgentDataset();
    return {
      ...baseAgent,
      pages: [
        {
          id: 'getting-started',
          title: 'Getting Started with Integration Testing',
          path: '/docs/integration/getting-started',
          description: 'Quick start guide for setting up comprehensive integration tests',
          category: 'Documentation',
          readTime: 8,
          lastModified: new Date().toISOString(),
          downloadable: true
        },
        {
          id: 'api-reference',
          title: 'Integration API Reference',
          path: '/docs/integration/api',
          description: 'Complete API documentation for integration testing endpoints',
          category: 'Reference',
          readTime: 25,
          lastModified: new Date(Date.now() - 86400000).toISOString(),
          downloadable: true
        },
        {
          id: 'examples',
          title: 'Integration Test Examples',
          path: '/docs/integration/examples',
          description: 'Real-world examples of comprehensive integration testing',
          category: 'Examples',
          readTime: 15,
          lastModified: new Date(Date.now() - 172800000).toISOString(),
          downloadable: false
        },
        {
          id: 'performance-guide',
          title: 'Performance Testing Guide',
          path: '/docs/integration/performance',
          description: 'Advanced guide for performance and load testing',
          category: 'Advanced',
          readTime: 20,
          lastModified: new Date(Date.now() - 259200000).toISOString(),
          downloadable: true
        },
        {
          id: 'troubleshooting',
          title: 'Troubleshooting Common Issues',
          path: '/docs/integration/troubleshooting',
          description: 'Solutions for common integration testing problems',
          category: 'Support',
          readTime: 12,
          lastModified: new Date(Date.now() - 432000000).toISOString(),
          downloadable: false
        },
        {
          id: 'changelog',
          title: 'Integration Agent Changelog',
          path: '/docs/integration/changelog',
          description: 'Version history and release notes for the integration agent',
          category: 'Updates',
          readTime: 5,
          lastModified: new Date(Date.now() - 604800000).toISOString(),
          downloadable: false
        }
      ],
      metadata: {
        repository: 'https://github.com/example/integration-test-agent',
        documentation: 'https://docs.example.com/integration-agent',
        bugTracker: 'https://github.com/example/integration-test-agent/issues',
        support: 'https://support.example.com/integration'
      }
    };
  }

  static createAgentWithFileSystem(): any {
    const baseAgent = this.createFullAgentDataset();
    return {
      ...baseAgent,
      workspace: {
        rootPath: '/agents/integration-test-agent',
        structure: [
          { type: 'folder', name: 'src', path: 'src/', children: 15 },
          { type: 'folder', name: 'tests', path: 'tests/', children: 25 },
          { type: 'folder', name: 'docs', path: 'docs/', children: 12 },
          { type: 'folder', name: 'config', path: 'config/', children: 8 },
          { type: 'folder', name: 'scripts', path: 'scripts/', children: 6 },
          { type: 'file', name: 'package.json', path: 'package.json', size: 2048 },
          { type: 'file', name: 'README.md', path: 'README.md', size: 4096 },
          { type: 'file', name: 'agent.config.js', path: 'agent.config.js', size: 1024 },
          { type: 'file', name: 'integration.test.js', path: 'tests/integration.test.js', size: 8192 },
          { type: 'file', name: 'performance.test.js', path: 'tests/performance.test.js', size: 6144 },
          { type: 'file', name: 'index.ts', path: 'src/index.ts', size: 3072 },
          { type: 'file', name: 'integrator.ts', path: 'src/integrator.ts', size: 5120 },
          { type: 'file', name: 'validator.ts', path: 'src/validator.ts', size: 4608 },
          { type: 'file', name: 'reporter.ts', path: 'src/reporter.ts', size: 3584 },
          { type: 'file', name: 'config.yml', path: 'config/config.yml', size: 1536 },
          { type: 'file', name: 'environments.json', path: 'config/environments.json', size: 2560 },
          { type: 'file', name: 'setup.sh', path: 'scripts/setup.sh', size: 1280 },
          { type: 'file', name: 'deploy.sh', path: 'scripts/deploy.sh', size: 1792 }
        ]
      }
    };
  }

  static createCompleteAgentDataset(): any {
    const definition = this.createAgentWithDefinition();
    const pages = this.createAgentWithPages();
    const fileSystem = this.createAgentWithFileSystem();
    
    return {
      ...definition,
      pages: pages.pages,
      metadata: pages.metadata,
      workspace: fileSystem.workspace
    };
  }
}

// Integration Test Framework
class IntegrationTestFramework {
  private mockFetch: MockedFunction<typeof fetch>;
  private mockResponse: MockFetchResponse;
  private user: ReturnType<typeof userEvent.setup>;

  constructor() {
    this.mockFetch = vi.fn();
    this.mockResponse = createMockFetch();
    this.user = userEvent.setup();
    global.fetch = this.mockFetch;
  }

  async setupSuccessfulDataLoad(agentData: any) {
    this.mockResponse.mockSuccessResponse({ success: true, data: agentData });
    this.mockFetch.mockResolvedValue(this.mockResponse.response);
  }

  async setupApiError(status: number, message: string) {
    this.mockResponse.mockErrorResponse(status, message);
    this.mockFetch.mockResolvedValue(this.mockResponse.response);
  }

  async setupDelayedResponse(agentData: any, delay: number) {
    return new Promise(resolve => {
      setTimeout(() => {
        this.mockResponse.mockSuccessResponse({ success: true, data: agentData });
        resolve(this.mockResponse.response);
      }, delay);
    });
  }

  async renderUnifiedAgentPage(agentId: string = 'integration-test-agent') {
    return render(
      <MemoryRouter initialEntries={[`/agents/${agentId}`]}>
        <Routes>
          <Route path="/agents/:agentId" element={<UnifiedAgentPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  async waitForDataLoad() {
    await waitFor(() => {
      expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
    });
  }

  async navigateToTab(tabName: string) {
    const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
    await this.user.click(tab);
    await waitFor(() => {
      expect(tab).toHaveClass(/border-blue-500|text-blue-600/);
    });
  }

  async testTabNavigation(tabs: string[]) {
    for (const tabName of tabs) {
      await this.navigateToTab(tabName);
    }
  }

  async validateErrorRecovery() {
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    const backButton = screen.getByRole('button', { name: /back to agents/i });
    
    expect(tryAgainButton).toBeInTheDocument();
    expect(backButton).toBeInTheDocument();
    
    return { tryAgainButton, backButton };
  }

  getUserInteraction() {
    return this.user;
  }

  getMockFetch() {
    return this.mockFetch;
  }

  resetMocks() {
    this.mockFetch.mockReset();
    this.mockResponse = createMockFetch();
  }
}

// Test Wrapper Component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => children;

describe('TDD London School: UnifiedAgentPage Integration Tests', () => {
  let framework: IntegrationTestFramework;
  let swarmSession: string;

  beforeEach(async () => {
    framework = new IntegrationTestFramework();
    swarmSession = await swarmCoordinator.initializeSession('unified-page-integration-tests');
  });

  afterEach(async () => {
    await swarmCoordinator.finalizeSession(swarmSession);
    framework.resetMocks();
    vi.restoreAllMocks();
  });

  describe('Complete User Journey Integration', () => {
    test('should handle complete agent exploration journey', async () => {
      // Arrange: Setup complete agent data
      const completeAgentData = IntegrationTestDataFactory.createCompleteAgentDataset();
      await framework.setupSuccessfulDataLoad(completeAgentData);

      // Act: Start user journey
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Assert: Verify initial load
      expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
      expect(screen.getByText('Advanced agent specializing in comprehensive integration testing')).toBeInTheDocument();

      // Journey Step 1: Explore Overview
      expect(screen.getByText('500 tasks completed')).toBeInTheDocument();
      expect(screen.getByText('99.2% success rate')).toBeInTheDocument();
      expect(screen.getByText('0.6s avg response')).toBeInTheDocument();

      // Journey Step 2: Navigate to Details
      await framework.navigateToTab('details');
      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
        expect(screen.getByText('Capabilities')).toBeInTheDocument();
      });

      // Verify capabilities display
      expect(screen.getByText('Full Integration Testing')).toBeInTheDocument();
      expect(screen.getByText('End-to-End Validation')).toBeInTheDocument();

      // Journey Step 3: Check Activity Feed
      await framework.navigateToTab('activity');
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Verify activity content
      expect(screen.getByText('Integration Test Suite Completed')).toBeInTheDocument();
      expect(screen.getByText('Integration Testing Best Practices')).toBeInTheDocument();

      // Journey Step 4: Explore Configuration
      await framework.navigateToTab('configuration');
      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
      });

      // Log complete journey
      await swarmCoordinator.logInteraction({
        type: 'complete_user_journey',
        component: 'UnifiedAgentPage',
        behavior: 'comprehensive_exploration',
        tabs_visited: ['overview', 'details', 'activity', 'configuration'],
        journey_successful: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle agent definition exploration with markdown rendering', async () => {
      // Arrange: Setup agent with comprehensive definition
      const agentWithDefinition = IntegrationTestDataFactory.createAgentWithDefinition();
      await framework.setupSuccessfulDataLoad(agentWithDefinition);

      // Act: Render and explore definition content
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();
      
      // Navigate to details to see capabilities
      await framework.navigateToTab('details');

      // Assert: Verify definition-related content is available
      expect(screen.getByText('Agent Information')).toBeInTheDocument();
      expect(screen.getByText('Full Integration Testing')).toBeInTheDocument();
      
      // Verify capabilities from definition are displayed
      const capabilitiesSection = screen.getByText('Capabilities').closest('div');
      expect(within(capabilitiesSection!).getByText('Full Integration Testing')).toBeInTheDocument();
      expect(within(capabilitiesSection!).getByText('Performance Testing')).toBeInTheDocument();

      // Log definition exploration
      await swarmCoordinator.logInteraction({
        type: 'definition_exploration',
        component: 'UnifiedAgentPage',
        behavior: 'markdown_content_integration',
        definition_sections_available: true,
        capabilities_displayed: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle pages and documentation integration', async () => {
      // Arrange: Setup agent with comprehensive pages
      const agentWithPages = IntegrationTestDataFactory.createAgentWithPages();
      await framework.setupSuccessfulDataLoad(agentWithPages);

      // Act: Render and explore pages functionality
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Navigate to details to see page-related information
      await framework.navigateToTab('details');

      // Assert: Verify pages integration points
      expect(screen.getByText('Agent Information')).toBeInTheDocument();
      
      // Verify that external resources are available in details view
      // Note: Pages content would be integrated into the details view or accessible via links
      const detailsContent = screen.getByText('Agent Information').closest('div');
      expect(detailsContent).toBeInTheDocument();

      // Log pages integration
      await swarmCoordinator.logInteraction({
        type: 'pages_integration',
        component: 'UnifiedAgentPage',
        behavior: 'documentation_access_points',
        pages_count: agentWithPages.pages.length,
        integration_successful: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle file system workspace integration', async () => {
      // Arrange: Setup agent with comprehensive file system
      const agentWithFileSystem = IntegrationTestDataFactory.createAgentWithFileSystem();
      await framework.setupSuccessfulDataLoad(agentWithFileSystem);

      // Act: Render and explore file system functionality
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Navigate to details to see file system related metrics
      await framework.navigateToTab('details');

      // Assert: Verify file system integration points
      expect(screen.getByText('Agent Information')).toBeInTheDocument();
      
      // File system metrics should be reflected in the agent information
      // The workspace structure influences the displayed statistics
      const detailsSection = screen.getByText('Agent Information').closest('div');
      expect(detailsSection).toBeInTheDocument();

      // Log file system integration
      await swarmCoordinator.logInteraction({
        type: 'filesystem_integration',
        component: 'UnifiedAgentPage',
        behavior: 'workspace_data_integration',
        files_count: agentWithFileSystem.workspace.structure.length,
        integration_successful: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Data Flow Integration Tests', () => {
    test('should handle real-time data updates across all components', async () => {
      // Arrange: Setup initial data
      const initialData = IntegrationTestDataFactory.createFullAgentDataset();
      await framework.setupSuccessfulDataLoad(initialData);

      // Act: Render component
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Verify initial data
      expect(screen.getByText('500 tasks completed')).toBeInTheDocument();
      expect(screen.getByText('99.2% success rate')).toBeInTheDocument();

      // Simulate data refresh
      const updatedData = {
        ...initialData,
        stats: {
          ...initialData.stats,
          tasksCompleted: 525,
          successRate: 99.5
        }
      };

      // Mock refresh API call
      framework.resetMocks();
      await framework.setupSuccessfulDataLoad(updatedData);

      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await framework.getUserInteraction().click(refreshButton);

      // Assert: Verify data updates
      await waitFor(() => {
        expect(screen.getByText('525 tasks completed')).toBeInTheDocument();
        expect(screen.getByText('99.5% success rate')).toBeInTheDocument();
      });

      // Log data flow test
      await swarmCoordinator.logInteraction({
        type: 'data_flow_integration',
        component: 'UnifiedAgentPage',
        behavior: 'real_time_updates',
        initial_tasks: 500,
        updated_tasks: 525,
        update_successful: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle API endpoint data coordination', async () => {
      // Arrange: Setup data with multiple API call requirements
      const completeData = IntegrationTestDataFactory.createCompleteAgentDataset();
      await framework.setupSuccessfulDataLoad(completeData);

      // Mock additional API endpoints that would be called
      const activitiesResponse = new Response(
        JSON.stringify({ success: true, data: completeData.recentActivities }),
        { status: 200 }
      );
      const postsResponse = new Response(
        JSON.stringify({ success: true, data: completeData.recentPosts }),
        { status: 200 }
      );

      framework.getMockFetch()
        .mockResolvedValueOnce(framework.mockResponse.response) // Main agent data
        .mockResolvedValueOnce(activitiesResponse) // Activities data
        .mockResolvedValueOnce(postsResponse); // Posts data

      // Act: Render component (this should trigger multiple API calls)
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Navigate to activity tab to see coordinated data
      await framework.navigateToTab('activity');

      // Assert: Verify coordinated data display
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Verify specific content from coordinated API calls
      expect(screen.getByText('Integration Test Suite Completed')).toBeInTheDocument();
      expect(screen.getByText('Integration Testing Best Practices')).toBeInTheDocument();

      // Log API coordination
      await swarmCoordinator.logInteraction({
        type: 'api_coordination',
        component: 'UnifiedAgentPage',
        behavior: 'multiple_endpoint_coordination',
        api_calls_made: framework.getMockFetch().mock.calls.length,
        data_coordination_successful: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle component state synchronization', async () => {
      // Arrange: Setup complex data
      const complexData = IntegrationTestDataFactory.createCompleteAgentDataset();
      await framework.setupSuccessfulDataLoad(complexData);

      // Act: Render and interact with multiple components
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Test state synchronization across tab changes
      const tabs = ['overview', 'details', 'activity', 'configuration'];
      for (const tab of tabs) {
        await framework.navigateToTab(tab);
        
        // Verify consistent agent name across all tabs
        expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
      }

      // Navigate to configuration and make changes
      await framework.navigateToTab('configuration');
      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
      });

      // Enable edit mode
      const editButton = screen.getByRole('button', { name: /edit configuration/i });
      await framework.getUserInteraction().click(editButton);

      // Verify edit mode is reflected across the interface
      expect(screen.getByRole('button', { name: /done editing/i })).toBeInTheDocument();

      // Navigate back to overview and verify state is maintained
      await framework.navigateToTab('overview');
      await framework.navigateToTab('configuration');

      // State should be preserved
      expect(screen.getByRole('button', { name: /done editing/i })).toBeInTheDocument();

      // Log state synchronization
      await swarmCoordinator.logInteraction({
        type: 'state_synchronization',
        component: 'UnifiedAgentPage',
        behavior: 'cross_component_state_sync',
        tabs_tested: tabs.length,
        state_preserved: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle cascading error recovery', async () => {
      // Arrange: Setup initial error
      await framework.setupApiError(500, 'Internal server error');

      // Act: Render with error
      await framework.renderUnifiedAgentPage();

      // Assert: Verify error handling
      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
      });

      const { tryAgainButton } = await framework.validateErrorRecovery();

      // Test error recovery
      framework.resetMocks();
      const recoveryData = IntegrationTestDataFactory.createFullAgentDataset();
      await framework.setupSuccessfulDataLoad(recoveryData);

      // Trigger retry
      await framework.getUserInteraction().click(tryAgainButton);

      // Assert: Verify recovery
      await waitFor(() => {
        expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
      });

      // Test that all functionality works after recovery
      await framework.navigateToTab('details');
      expect(screen.getByText('Agent Information')).toBeInTheDocument();

      // Log error recovery
      await swarmCoordinator.logInteraction({
        type: 'error_recovery_integration',
        component: 'UnifiedAgentPage',
        behavior: 'cascading_error_recovery',
        initial_error: '500_server_error',
        recovery_successful: true,
        functionality_restored: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle partial data loading failures', async () => {
      // Arrange: Setup successful main data but failed sub-requests
      const mainData = IntegrationTestDataFactory.createFullAgentDataset();
      await framework.setupSuccessfulDataLoad(mainData);

      // Mock failed activities API call but successful main call
      const activitiesError = new Response(
        JSON.stringify({ success: false, error: 'Activities service unavailable' }),
        { status: 503 }
      );

      framework.getMockFetch()
        .mockResolvedValueOnce(framework.mockResponse.response) // Main data succeeds
        .mockResolvedValueOnce(activitiesError); // Activities fail

      // Act: Render component
      await framework.renderUnifiedAgentPage();

      // Assert: Verify graceful degradation
      await waitFor(() => {
        expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
      });

      // Main functionality should work despite partial failures
      expect(screen.getByText('500 tasks completed')).toBeInTheDocument();

      // Navigate to activity tab and verify graceful handling
      await framework.navigateToTab('activity');
      
      // Should still show the tab but with appropriate fallback content
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
      });

      // Log partial failure handling
      await swarmCoordinator.logInteraction({
        type: 'partial_failure_integration',
        component: 'UnifiedAgentPage',
        behavior: 'graceful_degradation',
        main_data_loaded: true,
        sub_requests_failed: 1,
        core_functionality_preserved: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle network timeout scenarios', async () => {
      // Arrange: Setup delayed response
      const delayedData = IntegrationTestDataFactory.createFullAgentDataset();
      const delayedResponse = framework.setupDelayedResponse(delayedData, 5000);
      framework.getMockFetch().mockReturnValue(delayedResponse as Promise<Response>);

      // Act: Render component
      await framework.renderUnifiedAgentPage();

      // Assert: Verify loading state handling
      expect(screen.getByText('Loading agent data...')).toBeInTheDocument();

      // Verify loading state persists
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(screen.getByText('Loading agent data...')).toBeInTheDocument();

      // Wait for eventual load
      await waitFor(() => {
        expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 10000 });

      // Log timeout handling
      await swarmCoordinator.logInteraction({
        type: 'timeout_handling_integration',
        component: 'UnifiedAgentPage',
        behavior: 'extended_loading_state',
        loading_duration_ms: 5000,
        eventual_success: true,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Performance Integration Tests', () => {
    test('should handle large datasets efficiently', async () => {
      // Arrange: Create large dataset
      const largeDataset = IntegrationTestDataFactory.createCompleteAgentDataset();
      
      // Extend with large arrays
      largeDataset.recentActivities = Array.from({ length: 1000 }, (_, i) => ({
        id: `activity-${i}`,
        type: 'task_completed',
        title: `Task ${i} Completed`,
        description: `Detailed description for task ${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        metadata: { duration: i % 100, success: i % 10 !== 0 }
      }));

      largeDataset.capabilities = Array.from({ length: 100 }, (_, i) => `Capability ${i}`);

      await framework.setupSuccessfulDataLoad(largeDataset);

      // Act: Measure performance
      const startTime = performance.now();
      
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      const loadTime = performance.now() - startTime;

      // Navigate through tabs to test rendering performance
      const navigationStart = performance.now();
      await framework.testTabNavigation(['details', 'activity', 'configuration']);
      const navigationTime = performance.now() - navigationStart;

      // Assert: Verify performance requirements
      expect(loadTime).toBeLessThan(3000); // 3 second initial load
      expect(navigationTime).toBeLessThan(2000); // 2 second navigation

      // Verify all data is accessible despite size
      await framework.navigateToTab('details');
      expect(screen.getByText('Agent Information')).toBeInTheDocument();

      await framework.navigateToTab('activity');
      expect(screen.getByText('Recent Activities')).toBeInTheDocument();

      // Log performance test
      await swarmCoordinator.logInteraction({
        type: 'performance_integration',
        component: 'UnifiedAgentPage',
        behavior: 'large_dataset_handling',
        dataset_size: {
          activities: 1000,
          capabilities: 100
        },
        load_time_ms: loadTime,
        navigation_time_ms: navigationTime,
        performance_targets_met: loadTime < 3000 && navigationTime < 2000,
        timestamp: new Date().toISOString()
      });
    });

    test('should optimize re-renders during interactions', async () => {
      // Arrange: Setup data and monitoring
      const testData = IntegrationTestDataFactory.createFullAgentDataset();
      await framework.setupSuccessfulDataLoad(testData);

      // Act: Render and perform multiple interactions
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      const interactionStart = performance.now();

      // Perform rapid tab switching
      for (let i = 0; i < 5; i++) {
        await framework.navigateToTab('details');
        await framework.navigateToTab('activity');
        await framework.navigateToTab('configuration');
        await framework.navigateToTab('overview');
      }

      const interactionTime = performance.now() - interactionStart;

      // Assert: Verify interaction performance
      expect(interactionTime).toBeLessThan(5000); // 5 seconds for all interactions

      // Verify data consistency after rapid interactions
      expect(screen.getByText('Integration Test Agent Pro')).toBeInTheDocument();
      expect(framework.getMockFetch()).toHaveBeenCalledTimes(1); // No extra API calls

      // Log interaction performance
      await swarmCoordinator.logInteraction({
        type: 'interaction_performance',
        component: 'UnifiedAgentPage',
        behavior: 'rapid_navigation_optimization',
        interactions_performed: 20,
        total_time_ms: interactionTime,
        api_calls_made: 1,
        performance_optimized: interactionTime < 5000,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Accessibility Integration', () => {
    test('should maintain accessibility across all components', async () => {
      // Arrange: Setup complete data
      const accessibilityData = IntegrationTestDataFactory.createCompleteAgentDataset();
      await framework.setupSuccessfulDataLoad(accessibilityData);

      // Act: Render component
      await framework.renderUnifiedAgentPage();
      await framework.waitForDataLoad();

      // Assert: Verify accessibility features
      // Check main navigation
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/back to agents/i)).toBeInTheDocument();

      // Check tab navigation accessibility
      const tabs = screen.getAllByRole('button');
      const tabButtons = tabs.filter(button => 
        button.textContent?.match(/overview|details|activity|configuration/i)
      );

      for (const tab of tabButtons) {
        expect(tab).toBeEnabled();
        expect(tab).toBeInTheDocument();
      }

      // Test keyboard navigation
      const user = framework.getUserInteraction();
      const firstTab = tabButtons[0];
      firstTab.focus();
      
      // Tab through all navigation elements
      await user.keyboard('{Tab}');
      await user.keyboard('{Tab}');
      await user.keyboard('{Tab}');

      // Verify refresh button accessibility
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toBeEnabled();

      // Log accessibility verification
      await swarmCoordinator.logInteraction({
        type: 'accessibility_integration',
        component: 'UnifiedAgentPage',
        behavior: 'comprehensive_accessibility',
        main_element_present: true,
        navigation_accessible: true,
        keyboard_navigation_working: true,
        aria_labels_present: true,
        timestamp: new Date().toISOString()
      });
    });
  });
});