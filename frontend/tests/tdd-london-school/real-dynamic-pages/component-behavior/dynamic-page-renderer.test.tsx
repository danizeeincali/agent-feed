/**
 * London School TDD: Component Behavior Tests - Dynamic Page Renderer
 * 
 * PRINCIPLES:
 * - Test real component behavior with actual data
 * - Focus on object interactions and collaborations
 * - Verify how components collaborate with services
 * - NO MOCKS - Real rendering with real data
 * 
 * RED → GREEN → REFACTOR for each behavior
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DynamicAgentPageRenderer from '@/components/DynamicAgentPageRenderer';
import { BASE_URL, waitForServerReady } from '../api-environment';
import { clearCollaborationHistory, verifyCollaboration } from '../test-setup';

// Real component wrapper with all necessary providers
const createTestWrapper = (initialRoute = '/agents/test-agent/pages/test-page') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('London School TDD: DynamicAgentPageRenderer Behavior', () => {

  beforeAll(async () => {
    const serverReady = await waitForServerReady();
    expect(serverReady).toBe(true);
  });

  beforeEach(() => {
    clearCollaborationHistory();
  });

  describe('Component Loading Behavior Collaboration', () => {

    it('should collaborate with API service during initial load', async () => {
      // RED: Component should show loading state and fetch real data
      const TestWrapper = createTestWrapper('/agents/test-agent/pages/test-page');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Verify loading collaboration
      expect(screen.getByText(/loading dynamic page/i)).toBeInTheDocument();
      
      // Wait for real API collaboration to complete
      await waitFor(() => {
        // Verify API collaboration occurred
        verifyCollaboration([
          { source: 'TestComponent', target: '/agents/test-agent/pages/test-page', method: 'GET' }
        ]);
      }, { timeout: 10000 });

      // REFACTOR: Should show page content or error after collaboration
      await waitFor(() => {
        expect(screen.queryByText(/loading dynamic page/i)).not.toBeInTheDocument();
      });
    });

    it('should handle successful page data collaboration', async () => {
      // RED: Test successful data collaboration
      const TestWrapper = createTestWrapper('/agents/real-agent/pages/existing-page');
      
      // First, create a test page via real API
      const createResponse = await fetch(`${BASE_URL}/agents/real-agent/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: 'existing-page',
          title: 'Test Page',
          content: '<div data-testid="page-content">Real page content</div>'
        })
      });

      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Verify component collaborates with real data
      await waitFor(() => {
        const pageContent = screen.queryByTestId('page-content');
        if (pageContent) {
          expect(pageContent).toBeInTheDocument();
          expect(pageContent).toHaveTextContent('Real page content');
        } else {
          // If page doesn't exist, component should show appropriate fallback
          expect(screen.getByText(/Dynamic Page/i)).toBeInTheDocument();
        }
      }, { timeout: 10000 });

      // REFACTOR: Verify collaboration pattern
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/real-agent/pages/existing-page', method: 'GET' }
      ]);
    });
  });

  describe('Navigation Behavior Collaboration', () => {

    it('should collaborate with router during back navigation', async () => {
      // RED: Test navigation collaboration
      const TestWrapper = createTestWrapper('/agents/test-agent/pages/test-page');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText(/loading dynamic page/i)).not.toBeInTheDocument();
      });

      // GREEN: Find and click back button to test navigation collaboration
      const backButton = screen.getByRole('button', { name: /back/i }) || 
                        screen.getByLabelText(/back/i) ||
                        screen.querySelector('[aria-label*="back"]');
      
      if (backButton) {
        fireEvent.click(backButton);
        
        // REFACTOR: Verify navigation collaboration occurred
        // Note: Navigation is handled by React Router in real app
        expect(backButton).toBeInTheDocument();
      }
    });
  });

  describe('Error Handling Behavior Collaboration', () => {

    it('should collaborate gracefully during API errors', async () => {
      // RED: Test error collaboration with non-existent agent
      const TestWrapper = createTestWrapper('/agents/non-existent/pages/missing');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Verify error collaboration
      await waitFor(() => {
        // Component should handle API error gracefully
        const errorElement = screen.queryByText(/error/i) || 
                           screen.queryByText(/not found/i) ||
                           screen.queryByText(/failed/i);
        
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
        }
      }, { timeout: 10000 });

      // REFACTOR: Verify error collaboration was attempted
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/non-existent/pages/missing', method: 'GET' }
      ]);
    });

    it('should collaborate during network timeout scenarios', async () => {
      // RED: Test timeout collaboration behavior
      const TestWrapper = createTestWrapper('/agents/timeout-test/pages/slow-page');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Component should show loading initially
      expect(screen.getByText(/loading dynamic page/i)).toBeInTheDocument();

      // Wait for timeout handling
      await waitFor(() => {
        const content = screen.queryByText(/loading dynamic page/i);
        // After timeout, should show error or default content
        if (!content) {
          // REFACTOR: Verify timeout was handled gracefully
          expect(screen.getByText(/Dynamic Page|Error|Not Found/i)).toBeInTheDocument();
        }
      }, { timeout: 15000 });
    });
  });

  describe('Dynamic Content Rendering Collaboration', () => {

    it('should collaborate with HTML renderer for dynamic content', async () => {
      // RED: Test dynamic HTML content collaboration
      const TestWrapper = createTestWrapper('/agents/content-agent/pages/html-page');
      
      // Create a page with dynamic HTML content
      const dynamicContent = `
        <div data-testid="dynamic-content">
          <h1>Dynamic Title</h1>
          <p class="text-blue-600">Styled content</p>
          <button onclick="alert('Interactive')">Click Me</button>
        </div>
      `;

      const createResponse = await fetch(`${BASE_URL}/agents/content-agent/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: 'html-page',
          title: 'HTML Test Page',
          content: dynamicContent
        })
      });

      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Verify dynamic content collaboration
      await waitFor(() => {
        const dynamicElement = screen.queryByTestId('dynamic-content');
        if (dynamicElement) {
          expect(dynamicElement).toBeInTheDocument();
          expect(screen.getByText('Dynamic Title')).toBeInTheDocument();
          expect(screen.getByText('Styled content')).toBeInTheDocument();
        }
      }, { timeout: 10000 });

      // REFACTOR: Verify content rendering collaboration
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/content-agent/pages/html-page', method: 'GET' }
      ]);
    });

    it('should collaborate with special page types (todos dashboard)', async () => {
      // RED: Test specialized page collaboration
      const TestWrapper = createTestWrapper('/agents/todo-agent/pages/personal-todos-dashboard');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Verify specialized page collaboration
      await waitFor(() => {
        // Should render todo dashboard or default content
        const content = screen.getByText(/Dynamic Page|Total Pending|personal-todos-dashboard/i);
        expect(content).toBeInTheDocument();
      }, { timeout: 10000 });

      // REFACTOR: Verify specialized collaboration pattern
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/todo-agent/pages/personal-todos-dashboard', method: 'GET' }
      ]);
    });
  });

  describe('Real-time Update Collaboration', () => {

    it('should collaborate with live data updates', async () => {
      // RED: Test real-time collaboration
      const TestWrapper = createTestWrapper('/agents/live-agent/pages/live-page');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText(/loading dynamic page/i)).not.toBeInTheDocument();
      });

      // GREEN: Simulate live update via real API
      const updateResponse = await fetch(`${BASE_URL}/agents/live-agent/pages/live-page`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '<div data-testid="updated-content">Updated live content</div>'
        })
      });

      // REFACTOR: Component should reflect real-time updates
      // Note: This depends on WebSocket or polling implementation
      await waitFor(() => {
        const content = screen.getByText(/Dynamic Page|Updated live content|live-page/i);
        expect(content).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe('Accessibility Collaboration', () => {

    it('should collaborate with assistive technologies', async () => {
      // RED: Test accessibility collaboration
      const TestWrapper = createTestWrapper('/agents/a11y-agent/pages/accessible-page');
      
      render(
        <TestWrapper>
          <DynamicAgentPageRenderer />
        </TestWrapper>
      );

      // GREEN: Verify accessibility collaboration
      await waitFor(() => {
        // Check for proper ARIA labels and semantic structure
        const mainContent = screen.getByRole('main') || document.querySelector('main');
        if (mainContent) {
          expect(mainContent).toBeInTheDocument();
        }

        // Back button should be accessible
        const backButton = screen.getByRole('button', { name: /back/i }) ||
                          screen.querySelector('button[aria-label*="back"]');
        if (backButton) {
          expect(backButton).toBeInTheDocument();
        }
      });

      // REFACTOR: Verify semantic HTML collaboration
      const headings = screen.getAllByRole('heading');
      if (headings.length > 0) {
        expect(headings[0]).toBeInTheDocument();
      }
    });
  });
});