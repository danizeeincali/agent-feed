/**
 * SPARC Regression Test - PostCreator Component
 * Priority: P1 (Critical - Post creation workflow)
 * Features: post-creation, mention-system, ui-components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { PostCreator } from '@/components/PostCreator';
import { testDataFactory } from '../../utilities/TestDataFactory';
import { apiTestClient } from '../../utilities/APITestClient';
import { TestCategory, TestPriority, FeatureTag } from '../../config/sparc-regression-config';

// Test metadata
const TEST_METADATA = {
  category: TestCategory.UNIT,
  priority: TestPriority.P1,
  features: [FeatureTag.POST_CREATION, FeatureTag.MENTION_SYSTEM, FeatureTag.UI_COMPONENTS],
  description: 'PostCreator component workflow and integration regression tests',
  estimatedDuration: 180, // seconds
};

// Mock fetch globally for API calls
global.fetch = jest.fn();

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('PostCreator - SPARC Regression Tests', () => {
  let mockOnPostCreated: jest.Mock;
  let testData: ReturnType<typeof testDataFactory.generateTestScenarios>;

  beforeEach(() => {
    // Reset test data and API client
    testDataFactory.reset();
    apiTestClient.reset();
    
    // Create fresh mock functions
    mockOnPostCreated = jest.fn();
    
    // Generate test scenarios
    testData = testDataFactory.generateTestScenarios();
    
    // Setup default fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: testData.postCreationScenarios.validPost,
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('P1 - Core Post Creation Workflow', () => {
    test('REGRESSION: Complete post creation workflow succeeds', async () => {
      const user = userEvent.setup();
      const validPost = testData.postCreationScenarios.validPost;
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Fill in title
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, validPost.title);

      // Fill in hook
      const hookInput = screen.getByLabelText(/hook/i);
      await user.type(hookInput, validPost.metadata.hook || '');

      // Fill in content
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentTextarea, validPost.content);

      // Submit post
      const submitButton = screen.getByTestId('submit-post');
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      // Verify API was called correctly
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining(validPost.title),
        });
      });

      // Verify onPostCreated was called
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith(validPost);
      });
    });

    test('REGRESSION: Form validation prevents submission with missing required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const submitButton = screen.getByTestId('submit-post');
      
      // Try to submit without filling required fields
      expect(submitButton).toBeDisabled();
      
      // Fill only title (content still missing)
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Title');
      
      // Should still be disabled
      expect(submitButton).toBeDisabled();
      
      // Fill content
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentTextarea, 'Test content');
      
      // Now should be enabled
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    test('REGRESSION: Character limits are enforced', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/title/i);
      const hookInput = screen.getByLabelText(/hook/i);
      
      // Try to exceed title limit (200 chars)
      const longTitle = 'a'.repeat(250);
      await user.type(titleInput, longTitle);
      
      // Verify title is limited
      expect(titleInput).toHaveValue(longTitle.substring(0, 200));
      
      // Try to exceed hook limit (300 chars)
      const longHook = 'b'.repeat(350);
      await user.type(hookInput, longHook);
      
      // Verify hook is limited
      expect(hookInput).toHaveValue(longHook.substring(0, 300));
    });

    test('REGRESSION: Template application works correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Open template library
      const templateButton = screen.getByTestId('toggle-template-library');
      await user.click(templateButton);

      // Verify templates are shown
      await waitFor(() => {
        expect(screen.getByTestId('template-library-container')).toBeInTheDocument();
      });

      // Select status update template
      const statusTemplate = screen.getByText('Status Update');
      await user.click(statusTemplate);

      // Verify template was applied
      const titleInput = screen.getByLabelText(/title/i);
      const hookInput = screen.getByLabelText(/hook/i);
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);

      expect(titleInput).toHaveValue('Weekly Progress Report');
      expect(hookInput).toHaveValue('Key achievements and upcoming priorities');
      expect(contentTextarea.value).toContain('## Completed This Week');
    });
  });

  describe('P1 - Mention System Integration', () => {
    test('REGRESSION: Mention system works in PostCreator content field', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Type @ to trigger mention dropdown
      await user.type(contentTextarea, 'Hello @');
      
      // Wait for mention dropdown to appear
      await waitFor(() => {
        const dropdown = screen.getByTestId('mention-debug-dropdown');
        expect(dropdown).toBeInTheDocument();
      });

      // Select first agent
      const suggestions = screen.getAllByRole('option');
      expect(suggestions.length).toBeGreaterThan(0);
      
      await user.click(suggestions[0]);

      // Verify mention was inserted
      expect(contentTextarea.value).toMatch(/Hello @[\w-]+ /);
    });

    test('REGRESSION: Multiple mentions can be added to content', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Add first mention
      await user.type(contentTextarea, 'Hello @');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      const firstSuggestions = screen.getAllByRole('option');
      await user.click(firstSuggestions[0]);

      // Add second mention
      await user.type(contentTextarea, 'and @');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      const secondSuggestions = screen.getAllByRole('option');
      await user.click(secondSuggestions[1]); // Select different agent

      // Verify both mentions are in content
      const mentionPattern = /@[\w-]+/g;
      const mentions = contentTextarea.value.match(mentionPattern);
      expect(mentions).toHaveLength(2);
    });

    test('REGRESSION: Mentioned agents are tracked for submission', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Fill required fields first
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Post');

      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      // Add mention
      await user.type(contentTextarea, 'Hello @');
      
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      });
      
      const suggestions = screen.getAllByRole('option');
      await user.click(suggestions[0]);

      // Submit post
      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);

      // Verify mentioned agents are included in submission
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v1/agent-posts', 
          expect.objectContaining({
            body: expect.stringContaining('agentMentions'),
          })
        );
      });
    });
  });

  describe('P1 - Draft System Integration', () => {
    test('REGRESSION: Auto-save creates drafts', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Start typing to trigger auto-save
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Draft Post Title');

      // Wait for auto-save delay (3 seconds in component)
      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    test('REGRESSION: Manual save creates draft', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Add content
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Manual Draft');

      // Click save draft button
      const saveDraftButton = screen.getByText(/save draft/i);
      await user.click(saveDraftButton);

      // Verify draft saved indicator appears
      await waitFor(() => {
        expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('P2 - Error Handling', () => {
    test('REGRESSION: API failure shows error state', async () => {
      const user = userEvent.setup();
      
      // Mock API failure
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Fill and submit form
      const titleInput = screen.getByLabelText(/title/i);
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      await user.type(titleInput, 'Test Post');
      await user.type(contentTextarea, 'Test content');

      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);

      // Verify form doesn't reset on error (preserves user work)
      await waitFor(() => {
        expect(titleInput).toHaveValue('Test Post');
        expect(contentTextarea).toHaveValue('Test content');
      });

      // Should not call onPostCreated on error
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    test('REGRESSION: Network timeout handled gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock timeout
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Fill and submit form
      const titleInput = screen.getByLabelText(/title/i);
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      await user.type(titleInput, 'Test Post');
      await user.type(contentTextarea, 'Test content');

      const submitButton = screen.getByTestId('submit-post');
      await user.click(submitButton);

      // Verify submit button shows loading state
      expect(submitButton).toHaveTextContent(/publishing/i);

      // Wait for timeout and error handling
      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/publish post/i);
      }, { timeout: 200 });
    });
  });

  describe('P2 - Accessibility & UX', () => {
    test('REGRESSION: Keyboard shortcuts work correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      await user.type(titleInput, 'Test Post');
      await user.type(contentTextarea, 'Test content');

      // Test Cmd+Enter shortcut for submit
      await user.keyboard('{Meta>}{Enter}{/Meta}');

      // Verify submission was triggered
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('REGRESSION: Preview mode works correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PostCreator onPostCreated={mockOnPostCreated} />
        </TestWrapper>
      );

      // Add content
      const titleInput = screen.getByLabelText(/title/i);
      const hookInput = screen.getByLabelText(/hook/i);
      const contentTextarea = screen.getByPlaceholderText(/share your insights/i);
      
      await user.type(titleInput, 'Preview Test');
      await user.type(hookInput, 'Test hook');
      await user.type(contentTextarea, 'Test content');

      // Toggle preview
      const previewButton = screen.getByTitle(/toggle preview/i);
      await user.click(previewButton);

      // Verify preview shows content
      expect(screen.getByText('Preview Test')).toBeInTheDocument();
      expect(screen.getByText('Test hook')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });
});

// Export test metadata for reporting
export { TEST_METADATA };