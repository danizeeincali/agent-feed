/**
 * TDD Tests for Component Rendering with Mock API
 * Tests that all components render properly with mock data
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Setup mock API before importing components
import { setupMockApi } from '../../src/services/mockApiService';

// Import components to test
import SocialMediaFeed from '../../src/components/SocialMediaFeed';
import AgentManager from '../../src/components/AgentManager';
import SystemAnalytics from '../../src/components/SystemAnalytics';
import BulletproofSettings from '../../src/components/BulletproofSettings';

// Mock the WebSocket context
jest.mock('../../src/context/WebSocketContext', () => ({
  useWebSocketContext: () => ({
    isConnected: true,
    onlineUsers: [],
    sendMessage: jest.fn(),
    lastMessage: null,
    connectionState: 'Connected'
  })
}));

// Setup wrapper with necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Component Rendering with Mock API', () => {
  beforeAll(() => {
    // Setup mock API before all tests
    setupMockApi();
  });

  beforeEach(() => {
    // Clear any existing fetch mocks
    jest.clearAllMocks();
  });

  describe('SocialMediaFeed Component', () => {
    test('should render without "Error connecting to AgentLink API"', async () => {
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should not show the AgentLink API error
      expect(screen.queryByText(/Error connecting to AgentLink API/i)).not.toBeInTheDocument();
      
      // Should show some content
      expect(screen.getByText(/Social Feed/i) || screen.getByText(/Posts/i) || screen.getByText(/Agent/i)).toBeInTheDocument();
    });

    test('should display mock posts after loading', async () => {
      render(
        <TestWrapper>
          <SocialMediaFeed />
        </TestWrapper>
      );

      // Wait for posts to load
      await waitFor(() => {
        // Should show some posts or post-related content
        const postElements = screen.queryAllByText(/Agent Update/i);
        expect(postElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('AgentManager Component', () => {
    test('should render agent content instead of empty navigation', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show agent-related content
      expect(
        screen.getByText(/Agent/i) || 
        screen.getByText(/DataAnalyzer/i) || 
        screen.getByText(/ContentCreator/i) ||
        screen.getByText(/Manage/i)
      ).toBeInTheDocument();
    });

    test('should not show API connection errors', async () => {
      render(
        <TestWrapper>
          <AgentManager />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('SystemAnalytics Component', () => {
    test('should render analytics content instead of empty navigation', async () => {
      render(
        <TestWrapper>
          <SystemAnalytics />
        </TestWrapper>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should show analytics-related content
      expect(
        screen.getByText(/Analytics/i) || 
        screen.getByText(/Performance/i) || 
        screen.getByText(/Metrics/i) ||
        screen.getByText(/CPU/i) ||
        screen.getByText(/Memory/i)
      ).toBeInTheDocument();
    });
  });

  describe('Settings Component', () => {
    test('should render settings content', async () => {
      render(
        <TestWrapper>
          <BulletproofSettings />
        </TestWrapper>
      );

      // Should show settings-related content
      expect(
        screen.getByText(/Settings/i) || 
        screen.getByText(/Configuration/i) || 
        screen.getByText(/Preferences/i)
      ).toBeInTheDocument();
    });
  });

  describe('API Mock Integration', () => {
    test('should intercept and respond to API calls', async () => {
      // Test that our mock API is properly intercepting calls
      const response = await fetch('/api/v1/agent-posts');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should return mock agents', async () => {
      const response = await fetch('/api/v1/claude-live/prod/agents');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.agents)).toBe(true);
      expect(data.agents.length).toBeGreaterThan(0);
      
      // Check that agents have expected properties
      const agent = data.agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
    });

    test('should return mock activities', async () => {
      const response = await fetch('/api/v1/claude-live/prod/activities');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.activities)).toBe(true);
      expect(data.activities.length).toBeGreaterThan(0);
    });

    test('should return mock analytics', async () => {
      const response = await fetch('/api/v1/analytics/performance?range=24h');
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.metrics)).toBe(true);
      expect(data).toHaveProperty('summary');
    });
  });
});

// Additional integration test
describe('Full Application Integration', () => {
  test('all main routes should render without critical errors', async () => {
    const components = [
      { Component: SocialMediaFeed, name: 'SocialMediaFeed' },
      { Component: AgentManager, name: 'AgentManager' },
      { Component: SystemAnalytics, name: 'SystemAnalytics' },
      { Component: BulletproofSettings, name: 'BulletproofSettings' }
    ];

    for (const { Component, name } of components) {
      const { unmount } = render(
        <TestWrapper>
          <Component />
        </TestWrapper>
      );

      // Wait a moment for any async operations
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      }, { timeout: 1000 });

      // Should not have any unhandled errors
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Error/i)).not.toBeInTheDocument();

      console.log(`✅ ${name} rendered successfully`);
      unmount();
    }
  });
});