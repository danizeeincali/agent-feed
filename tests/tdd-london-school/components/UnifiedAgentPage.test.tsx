/**
 * London School TDD: Component Tests for UnifiedAgentPage
 * Focus: Behavior verification and interaction testing
 * 
 * Testing Philosophy:
 * - Test how components collaborate, not what they contain
 * - Use mocks to define contracts between components
 * - Verify interactions and collaborations
 * - Focus on user behavior outcomes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import UnifiedAgentPage, { type UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';
import { swarmCoordinator, type SwarmContract } from '../helpers/swarm-coordinator';
import { createMockFetch, type MockFetchResponse } from '../mocks/fetch.mock';

// Component collaboration contract
const UNIFIED_AGENT_PAGE_CONTRACT: SwarmContract = {
  name: 'UnifiedAgentPageComponent',
  version: '1.0.0',
  interactions: [
    {
      method: 'RENDER',
      endpoint: '/agents/:agentId',
      expectedBehaviors: [
        'displays_loading_state',
        'fetches_agent_data_on_mount',
        'displays_agent_information',
        'provides_tab_navigation',
        'handles_error_states',
        'allows_configuration_editing'
      ]
    }
  ],
  collaborators: ['Router', 'API', 'ErrorBoundary', 'LoadingSpinner']
};

// Mock data factories following London School principles
const createMockUnifiedAgentData = (overrides: Partial<UnifiedAgentData> = {}): UnifiedAgentData => ({
  id: 'test-agent',
  name: 'Test Agent',
  display_name: 'Test Agent Display',
  description: 'A test agent for behavior verification',
  status: 'active',
  type: 'test-agent',
  category: 'testing',
  specialization: 'Test automation and verification',
  avatar_color: '#3B82F6',
  avatar: '🤖',
  capabilities: ['test', 'mock', 'verify'],
  stats: {
    tasksCompleted: 100,
    successRate: 95,
    averageResponseTime: 1.5,
    uptime: 99,
    todayTasks: 10,
    weeklyTasks: 50,
    satisfaction: 4.5
  },
  recentActivities: [
    {
      id: '1',
      type: 'task_completed',
      title: 'Test Task',
      description: 'Completed test task',
      timestamp: new Date().toISOString()
    }
  ],
  recentPosts: [
    {
      id: '1',
      type: 'insight',
      title: 'Test Post',
      content: 'Test post content',
      timestamp: new Date().toISOString(),
      author: { id: 'test-agent', name: 'Test Agent', avatar: '🤖' },
      tags: ['test'],
      interactions: { likes: 5, comments: 2, shares: 1, bookmarks: 3 },
      priority: 'medium'
    }
  ],
  configuration: {
    profile: {
      name: 'Test Agent',
      description: 'A test agent',
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
  createdAt: '2025-01-01T00:00:00.000Z',
  lastActiveAt: new Date().toISOString(),
  version: '1.0.0',
  tags: ['test', 'mock']
});

// Test wrapper component
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

describe('UnifiedAgentPage Component (London School)', () => {
  let mockFetch: MockedFunction<typeof fetch>;
  let mockResponse: MockFetchResponse;
  let swarmSession: string;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    // Initialize swarm coordination
    swarmSession = await swarmCoordinator.initializeSession('unified-agent-page-tests');
    await swarmCoordinator.registerContract(UNIFIED_AGENT_PAGE_CONTRACT);
    
    // Setup user interaction
    user = userEvent.setup();
    
    // Setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    mockResponse = createMockFetch();
  });

  afterEach(async () => {
    await swarmCoordinator.finalizeSession(swarmSession);
    vi.restoreAllMocks();
  });

  describe('Component Loading and Initial Behavior', () => {
    test('should display loading state while fetching agent data', async () => {
      // Arrange: Setup delayed API response to test loading state
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      
      // Create a delayed promise to ensure loading state is visible
      const delayedFetch = new Promise(resolve => {
        setTimeout(() => resolve(mockResponse.response), 100);
      });
      mockFetch.mockReturnValue(delayedFetch as Promise<Response>);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify loading state behavior
      expect(screen.getByText('Loading agent data...')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent');

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading agent data...')).not.toBeInTheDocument();
      });
    });

    test('should fetch agent data on component mount', async () => {
      // Arrange: Setup successful API response
      const mockData = createMockUnifiedAgentData({ id: 'mount-test-agent' });
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component with specific agent ID
      render(
        <TestWrapper agentId="mount-test-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify API call behavior
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/mount-test-agent');

      // Wait for data to load and verify display
      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Log successful interaction for swarm coordination
      await swarmCoordinator.logInteraction({
        type: 'component_mount',
        component: 'UnifiedAgentPage',
        behavior: 'fetches_agent_data_on_mount',
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should handle missing agent ID gracefully', async () => {
      // Act: Render component without agent ID
      render(
        <MemoryRouter initialEntries={['/agents/']}>
          <Routes>
            <Route path="/agents/:agentId?" element={<UnifiedAgentPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Assert: Verify graceful handling
      // Component should not crash and should handle undefined agentId
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Verify no API call is made without agent ID
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error State Handling', () => {
    test('should display error state when agent data fetch fails', async () => {
      // Arrange: Setup API error response
      const errorMessage = 'Agent not found';
      mockResponse.mockErrorResponse(404, errorMessage);
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component
      render(
        <TestWrapper agentId="non-existent-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify error state behavior
      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
        expect(screen.getByText(/Agent "non-existent-agent" could not be found/)).toBeInTheDocument();
      });

      // Verify error recovery options are available
      expect(screen.getByRole('button', { name: /back to agents/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      // Log error handling for swarm coordination
      await swarmCoordinator.logInteraction({
        type: 'error_handling',
        component: 'UnifiedAgentPage',
        error: errorMessage,
        recovery_options: ['back_to_agents', 'try_again'],
        timestamp: new Date().toISOString()
      });
    });

    test('should provide retry functionality on error', async () => {
      // Arrange: Setup initial error then success
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockErrorResponse(500, 'Server error');
      mockFetch.mockResolvedValueOnce(mockResponse.response);
      
      // Setup success response for retry
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValueOnce(mockResponse.response);

      // Act: Render component and trigger error
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Error Loading Agent')).toBeInTheDocument();
      });

      // Act: Click try again
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Assert: Verify retry behavior
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Wait for successful retry
      await waitFor(() => {
        expect(screen.queryByText('Error Loading Agent')).not.toBeInTheDocument();
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation Behavior', () => {
    beforeEach(async () => {
      // Setup successful data for tab tests
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);
    });

    test('should display all navigation tabs correctly', async () => {
      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Assert: Verify all tabs are present
      const expectedTabs = ['Overview', 'Details', 'Activity', 'Configuration'];
      for (const tabName of expectedTabs) {
        expect(screen.getByRole('button', { name: new RegExp(tabName, 'i') })).toBeInTheDocument();
      }

      // Verify default tab is active
      const overviewTab = screen.getByRole('button', { name: /overview/i });
      expect(overviewTab).toHaveClass(/border-blue-500|text-blue-600/);
    });

    test('should switch tabs when clicked', async () => {
      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Act: Click on Details tab
      const detailsTab = screen.getByRole('button', { name: /details/i });
      await user.click(detailsTab);

      // Assert: Verify tab switching behavior
      expect(detailsTab).toHaveClass(/border-blue-500|text-blue-600/);
      
      // Verify details content is displayed
      await waitFor(() => {
        expect(screen.getByText('Agent Information')).toBeInTheDocument();
        expect(screen.getByText('Capabilities')).toBeInTheDocument();
      });

      // Act: Click on Activity tab
      const activityTab = screen.getByRole('button', { name: /activity/i });
      await user.click(activityTab);

      // Assert: Verify activity content
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
        expect(screen.getByText('Posts & Updates')).toBeInTheDocument();
      });

      // Log navigation behavior for swarm coordination
      await swarmCoordinator.logInteraction({
        type: 'tab_navigation',
        component: 'UnifiedAgentPage',
        tabs_tested: ['overview', 'details', 'activity'],
        success: true,
        timestamp: new Date().toISOString()
      });
    });

    test('should display configuration tab with edit functionality', async () => {
      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Wait for load
      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Act: Navigate to configuration tab
      const configTab = screen.getByRole('button', { name: /configuration/i });
      await user.click(configTab);

      // Assert: Verify configuration content
      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        expect(screen.getByText('Privacy & Visibility')).toBeInTheDocument();
      });

      // Act: Click edit configuration
      const editButton = screen.getByRole('button', { name: /edit configuration/i });
      await user.click(editButton);

      // Assert: Verify edit mode activation
      expect(screen.getByRole('button', { name: /done editing/i })).toBeInTheDocument();
      
      // Verify form inputs are now editable
      const nameInput = screen.getByDisplayValue('Test Agent');
      expect(nameInput).toBeEnabled();
    });
  });

  describe('Agent Information Display', () => {
    test('should display comprehensive agent information', async () => {
      // Arrange: Create detailed mock data
      const detailedMockData = createMockUnifiedAgentData({
        name: 'Comprehensive Test Agent',
        display_name: 'Comprehensive Agent',
        description: 'Detailed agent for comprehensive testing',
        specialization: 'Advanced testing and verification',
        capabilities: ['advanced-testing', 'comprehensive-analysis', 'detailed-reporting'],
        stats: {
          tasksCompleted: 1337,
          successRate: 97.5,
          averageResponseTime: 0.8,
          uptime: 99.9,
          todayTasks: 15,
          weeklyTasks: 89,
          satisfaction: 4.9
        }
      });

      mockResponse.mockSuccessResponse({ success: true, data: detailedMockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify comprehensive information display
      await waitFor(() => {
        expect(screen.getByText('Comprehensive Agent')).toBeInTheDocument();
        expect(screen.getByText('Advanced testing and verification')).toBeInTheDocument();
        expect(screen.getByText('1,337 tasks completed')).toBeInTheDocument();
        expect(screen.getByText('97.5% success rate')).toBeInTheDocument();
        expect(screen.getByText('0.8s avg response')).toBeInTheDocument();
      });

      // Verify capabilities are displayed
      expect(screen.getByText('advanced-testing')).toBeInTheDocument();
      expect(screen.getByText('comprehensive-analysis')).toBeInTheDocument();
      expect(screen.getByText('detailed-reporting')).toBeInTheDocument();

      // Verify status display
      const statusElement = screen.getByText(/active/i);
      expect(statusElement).toBeInTheDocument();
    });

    test('should handle agent data with missing optional fields', async () => {
      // Arrange: Create minimal mock data
      const minimalMockData: UnifiedAgentData = {
        id: 'minimal-agent',
        name: 'Minimal Agent',
        description: 'Basic agent',
        status: 'active',
        capabilities: [],
        stats: {
          tasksCompleted: 0,
          successRate: 0,
          averageResponseTime: 0,
          uptime: 0,
          todayTasks: 0,
          weeklyTasks: 0
        },
        recentActivities: [],
        recentPosts: [],
        configuration: {
          profile: {
            name: 'Minimal Agent',
            description: 'Basic agent',
            specialization: 'General',
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

      mockResponse.mockSuccessResponse({ success: true, data: minimalMockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render component
      render(
        <TestWrapper agentId="minimal-agent">
          <UnifiedAgentPage />
        </TestWrapper>
      );

      // Assert: Verify graceful handling of missing data
      await waitFor(() => {
        expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
        expect(screen.getByText('Basic agent')).toBeInTheDocument();
      });

      // Verify fallback values are used appropriately
      expect(screen.getByText('0 tasks completed')).toBeInTheDocument();
      expect(screen.getByText('0% success rate')).toBeInTheDocument();

      // Should not crash with empty arrays
      expect(screen.queryByText('No capabilities specified')).toBeInTheDocument();
    });
  });

  describe('User Interaction and Configuration', () => {
    test('should allow editing agent configuration', async () => {
      // Arrange: Setup mock data
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Act: Render and navigate to configuration
      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Navigate to configuration tab
      const configTab = screen.getByRole('button', { name: /configuration/i });
      await user.click(configTab);

      await waitFor(() => {
        expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
      });

      // Enable edit mode
      const editButton = screen.getByRole('button', { name: /edit configuration/i });
      await user.click(editButton);

      // Assert: Verify edit mode functionality
      expect(screen.getByRole('button', { name: /done editing/i })).toBeInTheDocument();

      // Test name editing
      const nameInput = screen.getByDisplayValue('Test Agent');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Test Agent');

      // Verify unsaved changes indicator
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    test('should handle navigation with unsaved changes', async () => {
      // This test verifies the unsaved changes warning behavior
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      // Setup window.confirm mock
      const mockConfirm = vi.fn().mockReturnValue(false); // User cancels navigation
      Object.defineProperty(window, 'confirm', { value: mockConfirm });

      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Make configuration changes
      const configTab = screen.getByRole('button', { name: /configuration/i });
      await user.click(configTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit configuration/i })).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /edit configuration/i });
      await user.click(editButton);

      const nameInput = screen.getByDisplayValue('Test Agent');
      await user.clear(nameInput);
      await user.type(nameInput, 'Modified Agent');

      // Try to navigate away
      const backButton = screen.getByLabelText(/back to agents/i);
      await user.click(backButton);

      // Assert: Verify confirmation dialog
      expect(mockConfirm).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to leave?');
    });
  });

  describe('Responsive Design and Accessibility', () => {
    test('should be accessible with proper ARIA labels', async () => {
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Verify accessibility features
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/back to agents/i)).toBeInTheDocument();
      
      // Verify tab navigation accessibility
      const tabs = screen.getAllByRole('button');
      const tabButtons = tabs.filter(button => 
        button.textContent?.match(/overview|details|activity|configuration/i)
      );
      
      for (const tab of tabButtons) {
        expect(tab).toBeInTheDocument();
        expect(tab).toBeEnabled();
      }
    });

    test('should handle different screen sizes gracefully', async () => {
      // This test would typically involve viewport manipulation
      // For now, we verify that responsive classes are present
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Verify responsive grid classes are present in the DOM
      const container = document.querySelector('.max-w-7xl');
      expect(container).toBeInTheDocument();

      // Verify responsive grid layouts exist
      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Real-time Updates and Refresh', () => {
    test('should provide refresh functionality', async () => {
      const mockData = createMockUnifiedAgentData();
      mockResponse.mockSuccessResponse({ success: true, data: mockData });
      mockFetch.mockResolvedValue(mockResponse.response);

      render(
        <TestWrapper>
          <UnifiedAgentPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Display')).toBeInTheDocument();
      });

      // Clear the initial fetch call
      mockFetch.mockClear();

      // Act: Click refresh button
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // Assert: Verify refresh behavior
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/agents/test-agent');

      // Log refresh behavior for swarm coordination
      await swarmCoordinator.logInteraction({
        type: 'refresh_action',
        component: 'UnifiedAgentPage',
        trigger: 'user_click',
        success: true,
        timestamp: new Date().toISOString()
      });
    });
  });
});