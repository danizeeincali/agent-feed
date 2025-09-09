/**
 * SPARC Integration Test - Mention + Post Creation Workflow
 * Priority: P1 (Critical - End-to-end user workflow)
 * Features: mention-system, post-creation, api-integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostCreator } from '@/components/PostCreator';
import { BulletproofSocialMediaFeed } from '@/components/BulletproofSocialMediaFeed';
import { testDataFactory } from '../utilities/TestDataFactory';
import { APITestClient } from '../utilities/APITestClient';
import { TestCategory, TestPriority, FeatureTag } from '../config/sparc-regression-config';

// Test metadata
const TEST_METADATA = {
  category: TestCategory.INTEGRATION,
  priority: TestPriority.P1,
  features: [FeatureTag.MENTION_SYSTEM, FeatureTag.POST_CREATION, FeatureTag.API_INTEGRATION],
  description: 'Integration test for complete mention + post creation workflow',
  estimatedDuration: 240, // seconds
};

// Test wrapper with all required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Mention + Post Creation - SPARC Integration Tests', () => {
  let apiClient: APITestClient;
  let testData: ReturnType<typeof testDataFactory.generateTestScenarios>;
  let mockOnPostCreated: jest.Mock;

  beforeEach(async () => {
    // Reset test environment
    testDataFactory.reset();
    apiClient = new APITestClient();
    mockOnPostCreated = jest.fn();
    
    // Generate test scenarios
    testData = testDataFactory.generateTestScenarios();
    
    // Setup API mocks
    apiClient.setMockResponse('GET', '/api/v1/agents', {
      success: true,
      data: testData.performanceScenarios.manyAgents.slice(0, 10),
      status: 200,
    });
    
    apiClient.setMockResponse('POST', '/api/v1/agent-posts', {
      success: true,
      data: testData.postCreationScenarios.postWithMentions,
      status: 201,
    });
    
    // Mock global fetch
    global.fetch = jest.fn().mockImplementation(async (url, config) => {
      const response = await apiClient.request({
        method: (config?.method as any) || 'GET',
        url: url as string,
        data: config?.body ? JSON.parse(config.body as string) : undefined,
        headers: config?.headers as any,
      });
      
      return {
        ok: response.success,
        status: response.status,
        json: async () => response.success ? response.data : { error: response.error },
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    apiClient.reset();
  });

  describe('P1 - Complete Workflow Integration', () => {
    test('REGRESSION: Full mention + post creation workflow works end-to-end', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <div>
            <PostCreator onPostCreated={mockOnPostCreated} />
            <BulletproofSocialMediaFeed />
          </div>
        </TestWrapper>
      );

      // Step 1: Fill basic post information
      const titleInput = screen.getByLabelText(/title/i);
      const hookInput = screen.getByLabelText(/hook/i);
      
      await user.type(titleInput, 'Integration Test Post');
      await user.type(hookInput, 'Testing complete workflow');

      // Step 2: Add content with mentions
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentTextarea, 'Hello @');

      // Step 3: Wait for mention dropdown and select agent
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
      });

      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Select first agent
      await user.click(suggestions[0]);

      // Step 4: Continue with more content
      await user.type(contentTextarea, ', this is a test post with mentions.');

      // Step 5: Submit the post
      const submitButton = screen.getByTestId('submit-post');
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      // Step 6: Verify API integration
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', 
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: expect.stringContaining('Integration Test Post'),
          })
        );
      });

      // Step 7: Verify callback was triggered
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Integration Test Post',
          })
        );
      });

      // Step 8: Verify form reset after successful submission
      expect(titleInput).toHaveValue('');
      expect(hookInput).toHaveValue('');
      expect(contentTextarea).toHaveValue('');
    });

    test('REGRESSION: Multiple mentions in single post work correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Multi-mention Test');

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Add first mention
      await user.type(contentTextarea, 'Calling @');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      let suggestions = screen.getAllByRole('option');
      await user.click(suggestions[0]);

      // Add second mention  
      await user.type(contentTextarea, ' and @');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      suggestions = screen.getAllByRole('option');
      await user.click(suggestions[1]);

      // Complete the content
      await user.type(contentTextarea, ' for collaboration');

      // Submit
      await user.click(screen.getByTestId('submit-post'));

      // Verify submission includes both mentions
      await waitFor(() => {
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        
        expect(requestBody.content).toMatch(/@[\w-]+ and @[\w-]+ for collaboration/);
        expect(requestBody.metadata.agentMentions).toHaveLength(2);
      });
    });

    test('REGRESSION: Mention dropdown positioning works with scrolled content', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Add lots of content to create scrolling
      const longContent = 'Lorem ipsum dolor sit amet.\n'.repeat(20);
      await user.type(contentTextarea, longContent);

      // Add mention at the end
      await user.type(contentTextarea, '\nMentioning @');

      // Verify dropdown appears and is positioned correctly
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
        
        // Check dropdown is visible (not clipped)
        const rect = dropdown.getBoundingClientRect();
        expect(rect.height).toBeGreaterThan(0);
        expect(rect.width).toBeGreaterThan(0);
      });
    });
  });

  describe('P1 - Error Recovery Integration', () => {
    test('REGRESSION: Mention system recovers from API failure during post creation', async () => {
      const user = userEvent.setup();
      
      // Setup API to fail initially, then succeed
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(async (url, config) => {
        callCount++;
        
        if (callCount === 1) {
          // First call (mention search) fails
          throw new Error('Network error');
        }
        
        // Subsequent calls succeed
        const response = await apiClient.request({
          method: (config?.method as any) || 'GET',
          url: url as string,
          data: config?.body ? JSON.parse(config.body as string) : undefined,
        });
        
        return {
          ok: response.success,
          status: response.status,
          json: async () => response.success ? response.data : { error: response.error },
        };
      });
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Try to trigger mention (will fail)
      await user.type(contentTextarea, '@');
      
      // Should still show dropdown with fallback suggestions
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
      });

      // Should have some fallback suggestions
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Select a fallback suggestion
      await user.click(suggestions[0]);

      // Complete and submit post  
      await user.type(screen.getByLabelText(/title/i), 'Error Recovery Test');
      await user.type(contentTextarea, ' content');
      
      await user.click(screen.getByTestId('submit-post'));

      // Post submission should succeed even if mention API failed
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalled();
      });
    });

    test('REGRESSION: Post creation fails gracefully with mention data intact', async () => {
      const user = userEvent.setup();
      
      // Setup post creation to fail
      apiClient.setMockResponse('POST', '/api/v1/agent-posts', {
        success: false,
        error: 'Server Error',
        status: 500,
      });
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Create post with mention
      await user.type(screen.getByLabelText(/title/i), 'Test Post');
      
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentTextarea, 'Hello @');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      const suggestions = screen.getAllByRole('option');
      await user.click(suggestions[0]);
      
      await user.type(contentTextarea, ' how are you?');

      // Submit (will fail)
      await user.click(screen.getByTestId('submit-post'));

      // Verify form data is preserved after failure
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue('Test Post');
        expect(contentTextarea.value).toMatch(/Hello @[\w-]+ how are you\?/);
      });

      // Verify callback was not called on failure
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });
  });

  describe('P2 - Performance Integration', () => {
    test('REGRESSION: Large number of mentions does not degrade performance', async () => {
      const user = userEvent.setup();
      
      // Setup many agents for mention suggestions
      apiClient.setMockResponse('GET', '/api/v1/mentions/search', {
        success: true,
        data: testData.performanceScenarios.manyAgents.slice(0, 100),
        status: 200,
      });
      
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Trigger mention dropdown
      await user.type(contentTextarea, '@');
      
      // Measure time to show dropdown
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      const dropdownTime = performance.now() - startTime;
      
      // Verify performance is acceptable (<2 seconds even with 100 agents)
      expect(dropdownTime).toBeLessThan(2000);
      
      // Verify all suggestions are rendered
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeLessThanOrEqual(100);
    });

    test('REGRESSION: Rapid typing does not cause mention dropdown flicker', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Type @ and query rapidly
      await user.type(contentTextarea, '@test', { delay: 10 }); // Very fast typing
      
      // Give time for debounced search
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Dropdown should be stable and showing results
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toBeVisible();
      });
      
      // Should not flicker - dropdown should remain stable
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('P2 - Accessibility Integration', () => {
    test('REGRESSION: Complete workflow maintains focus and ARIA states', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/title/i);
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Start workflow with keyboard navigation
      titleInput.focus();
      await user.keyboard('Test Post{Tab}');
      
      // Should move to hook field
      expect(screen.getByLabelText(/hook/i)).toHaveFocus();
      
      await user.keyboard('Test hook{Tab}');
      
      // Should move to content field
      expect(contentTextarea).toHaveFocus();
      
      // Add mention via keyboard
      await user.keyboard('Hello @');
      
      // Verify ARIA attributes are correct when dropdown opens
      await waitFor(() => {
        expect(contentTextarea).toHaveAttribute('aria-expanded', 'true');
        expect(contentTextarea).toHaveAttribute('aria-haspopup', 'listbox');
      });
      
      // Navigate and select mention via keyboard
      await user.keyboard('{ArrowDown}{Enter}');
      
      // Focus should return to textarea
      expect(contentTextarea).toHaveFocus();
      
      // ARIA state should reset
      expect(contentTextarea).toHaveAttribute('aria-expanded', 'false');
    });
  });
});

// Export test metadata for reporting
export { TEST_METADATA };