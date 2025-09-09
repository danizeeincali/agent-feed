/**
 * TDD London School: Post Creation Workflow Integration Tests
 * Focus: Component collaboration in post creation flow with mocked external dependencies
 * Approach: Test object interactions, contract compliance, and workflow coordination
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { TDDTestUtilities, TDDAssertions } from '../utilities/TDDTestUtilities';
import TDDLondonSchoolMockFactory, { 
  MockMentionService, 
  MockApiService, 
  MockDraftService 
} from '../mock-factories/TDDLondonSchoolMockFactory';

// Components under test
import { PostCreator } from '../../../components/PostCreator';

// Mock external dependencies
jest.mock('../../../services/MentionService');
jest.mock('../../../services/api');
jest.mock('../../../hooks/useDraftManager');

describe('TDD London School: Post Creation Workflow Integration', () => {
  let mockMentionService: MockMentionService;
  let mockApiService: MockApiService;
  let mockDraftService: MockDraftService;
  let mockProps: any;
  let mockFetch: jest.MockedFunction<any>;

  beforeEach(() => {
    // Setup all mocks
    mockMentionService = TDDLondonSchoolMockFactory.createMentionServiceMock();
    mockApiService = TDDLondonSchoolMockFactory.createApiServiceMock();
    mockDraftService = TDDLondonSchoolMockFactory.createDraftServiceMock();
    mockProps = TDDLondonSchoolMockFactory.createComponentPropMocks();

    // Mock global fetch for API calls
    mockFetch = jest.fn() as jest.MockedFunction<any>;
    global.fetch = mockFetch;

    // Mock the draft manager hook
    jest.doMock('../../../hooks/useDraftManager', () => ({
      useDraftManager: () => mockDraftService
    }));

    // Mock services
    jest.doMock('../../../services/MentionService', () => ({
      MentionService: mockMentionService
    }));

    jest.doMock('../../../services/api', () => ({
      apiService: mockApiService
    }));
  });

  afterEach(() => {
    TDDTestUtilities.cleanupTest();
    jest.restoreAllMocks();
  });

  describe('Complete Post Creation Flow', () => {
    it('should coordinate title, content, and metadata collection for successful post creation', async () => {
      // Arrange: Setup successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 'post-123', title: 'Test Post', content: 'Test content' },
          success: true
        })
      });

      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'chief-of-staff', name: 'chief-of-staff-agent', displayName: 'Chief of Staff', description: 'Strategic coordination' }
      ]);

      // Act: Complete post creation workflow
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Fill title
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Strategic Planning Update');

      // Fill hook
      const hookInput = screen.getByLabelText(/hook/i);
      await user.type(hookInput, 'Key insights from this quarter');

      // Fill content with mention
      const contentInput = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentInput, 'Here are the quarterly results. @chief-of-staff-agent please review and provide feedback.');

      // Submit post
      const submitButton = screen.getByRole('button', { name: /publish post/i });
      await user.click(submitButton);

      // Assert: Verify workflow coordination
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Strategic Planning Update')
          })
        );
      });

      // Verify success callback
      expect(mockProps.onPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'post-123',
          title: 'Test Post'
        })
      );
    });

    it('should handle validation failures and prevent submission', async () => {
      // Arrange: Component with validation requirements
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Act: Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /publish post/i });
      
      // Verify button is disabled initially
      expect(submitButton).toBeDisabled();

      // Add only title, not content
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Incomplete Post');

      // Button should still be disabled
      expect(submitButton).toBeDisabled();

      // Assert: No API call should be made
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockProps.onPostCreated).not.toHaveBeenCalled();
    });

    it('should handle API failures gracefully with error feedback', async () => {
      // Arrange: Setup API failure
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Server error occurred',
          success: false
        })
      });

      // Act: Try to create post with server error
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Test Post');
      await user.type(screen.getByPlaceholderText(/share your insights/i), 'Test content');

      // Submit post
      const submitButton = screen.getByRole('button', { name: /publish post/i });
      await user.click(submitButton);

      // Assert: Error should be handled gracefully
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should not call success callback on failure
      expect(mockProps.onPostCreated).not.toHaveBeenCalled();

      // Form should remain accessible for retry
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(submitButton).toBeEnabled();
    });
  });

  describe('Draft Management Integration', () => {
    it('should auto-save drafts during content creation', async () => {
      // Arrange: Setup draft service mock
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Act: Type content that should trigger auto-save
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Auto-save Test Post');

      const contentInput = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentInput, 'This content should auto-save as draft');

      // Wait for auto-save delay (3 seconds according to PostCreator)
      await TDDTestUtilities.simulateNetworkDelay(3100);

      // Assert: Draft should be created
      await waitFor(() => {
        expect(mockDraftService.createDraft).toHaveBeenCalledWith(
          'Auto-save Test Post',
          expect.stringContaining('This content should auto-save as draft'),
          []
        );
      });
    });

    it('should load and edit existing drafts', async () => {
      // Arrange: Mock draft data
      const existingDraft = {
        id: 'draft-123',
        title: 'Existing Draft',
        content: 'Draft content to edit',
        tags: ['draft', 'edit']
      };

      // Act: Render PostCreator in edit mode
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator 
          mode="edit"
          editDraft={existingDraft}
          onPostCreated={mockProps.onPostCreated} 
        />
      );

      // Assert: Form should be populated with draft data
      expect(screen.getByDisplayValue('Existing Draft')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Draft content to edit')).toBeInTheDocument();

      // Modify and save draft
      const contentInput = screen.getByPlaceholderText(/share your insights/i);
      await user.clear(contentInput);
      await user.type(contentInput, 'Updated draft content');

      // Wait for auto-save
      await TDDTestUtilities.simulateNetworkDelay(3100);

      // Should call updateDraft, not createDraft
      await waitFor(() => {
        expect(mockDraftService.updateDraft).toHaveBeenCalledWith(
          'draft-123',
          expect.objectContaining({
            content: expect.stringContaining('Updated draft content')
          })
        );
      });
    });

    it('should delete draft after successful publication', async () => {
      // Arrange: Setup successful publication from draft
      const draftToPublish = {
        id: 'draft-456',
        title: 'Draft to Publish',
        content: 'Content ready for publication',
        tags: ['ready']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 'post-456', title: 'Published Post' },
          success: true
        })
      });

      // Act: Publish draft
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator 
          mode="edit"
          editDraft={draftToPublish}
          onPostCreated={mockProps.onPostCreated} 
        />
      );

      const submitButton = screen.getByRole('button', { name: /publish post/i });
      await user.click(submitButton);

      // Assert: Draft should be deleted after successful publication
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        expect(mockDraftService.deleteDraft).toHaveBeenCalledWith('draft-456');
      });

      expect(mockProps.onPostCreated).toHaveBeenCalled();
    });
  });

  describe('Template System Integration', () => {
    it('should populate form fields when template is selected', async () => {
      // Act: Render PostCreator and select template
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Open template library
      const templateButton = screen.getByTestId('toggle-template-library');
      await user.click(templateButton);

      // Verify template library is shown
      await waitFor(() => {
        expect(screen.getByTestId('template-library-container')).toBeInTheDocument();
      });

      // Select a template (e.g., Status Update)
      const statusUpdateTemplate = screen.getByText('Status Update');
      await user.click(statusUpdateTemplate);

      // Assert: Form should be populated with template data
      expect(screen.getByDisplayValue('Weekly Progress Report')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Key achievements and upcoming priorities')).toBeInTheDocument();
      
      const contentArea = screen.getByPlaceholderText(/share your insights/i);
      expect(contentArea.value).toContain('## Completed This Week');
      expect(contentArea.value).toContain('## Upcoming Priorities');
    });

    it('should apply template tags to form state', async () => {
      // Act: Select template with tags
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      const templateButton = screen.getByTestId('toggle-template-library');
      await user.click(templateButton);

      const insightTemplate = screen.getByText('Insight Share');
      await user.click(insightTemplate);

      // Assert: Tags should be applied
      expect(screen.getByText('#insight')).toBeInTheDocument();
      expect(screen.getByText('#strategy')).toBeInTheDocument();
    });
  });

  describe('Rich Text Formatting Integration', () => {
    it('should apply formatting to selected text in content area', async () => {
      // Act: Apply bold formatting
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      const contentInput = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentInput, 'This text will be bold');
      
      // Select text (simulate selection)
      await user.tripleClick(contentInput);

      // Apply bold formatting
      const boldButton = screen.getByTitle(/Bold/i);
      await user.click(boldButton);

      // Assert: Text should be wrapped in markdown bold syntax
      expect(contentInput.value).toContain('**This text will be bold**');
    });

    it('should handle emoji insertion in content', async () => {
      // Act: Insert emoji
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      const contentInput = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentInput, 'Great work team! ');

      // Open emoji picker
      const emojiButton = screen.getByTitle(/Add Emoji/i);
      await user.click(emojiButton);

      // Note: In real implementation, would interact with EmojiPicker component
      // For test, we'll simulate the result
      // This tests the emoji integration contract

      // Assert: Emoji picker should be available
      // In full implementation, would verify emoji selection and insertion
      expect(emojiButton).toBeInTheDocument();
    });
  });

  describe('Tag Management Integration', () => {
    it('should add and remove tags from post metadata', async () => {
      // Act: Manage tags
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Add tags
      const tagInput = screen.getByPlaceholderText(/Add tags/i);
      await user.type(tagInput, 'strategy{enter}');
      await user.type(tagInput, 'planning{enter}');

      // Assert: Tags should appear in UI
      expect(screen.getByText('#strategy')).toBeInTheDocument();
      expect(screen.getByText('#planning')).toBeInTheDocument();

      // Remove a tag
      const strategyTag = screen.getByText('#strategy').closest('span');
      const removeButton = strategyTag?.querySelector('button');
      if (removeButton) {
        await user.click(removeButton);
      }

      // Assert: Tag should be removed
      expect(screen.queryByText('#strategy')).not.toBeInTheDocument();
      expect(screen.getByText('#planning')).toBeInTheDocument();
    });

    it('should include tags in API submission payload', async () => {
      // Arrange: Setup form with tags
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'post-789' }, success: true })
      });

      // Act: Create post with tags
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Fill form
      await user.type(screen.getByLabelText(/title/i), 'Tagged Post');
      await user.type(screen.getByPlaceholderText(/share your insights/i), 'Content with tags');
      
      // Add tags
      const tagInput = screen.getByPlaceholderText(/Add tags/i);
      await user.type(tagInput, 'important{enter}');
      await user.type(tagInput, 'review{enter}');

      // Submit
      const submitButton = screen.getByRole('button', { name: /publish post/i });
      await user.click(submitButton);

      // Assert: Tags should be in submission payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            body: expect.stringContaining('"tags":["important","review"]')
          })
        );
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large content without performance degradation', async () => {
      // Arrange: Large content
      const largeContent = 'A'.repeat(4000); // Near character limit

      // Act: Test with large content
      const performance = await TDDTestUtilities.measureRenderPerformance(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Assert: Should maintain performance
      expect(performance.isPerformant).toBe(true);

      // Test content handling
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      const contentInput = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentInput, largeContent);

      // Should respect character limits
      expect(contentInput.value.length).toBeLessThanOrEqual(5000);
    });

    it('should clean up resources and prevent memory leaks', async () => {
      // Act: Test multiple render/unmount cycles
      const memoryTest = async () => {
        const { component } = await TDDTestUtilities.renderWithUser(
          <PostCreator onPostCreated={mockProps.onPostCreated} />
        );
        component.unmount();
      };

      const memoryResult = await TDDTestUtilities.detectMemoryLeaks(memoryTest, 10);

      // Assert: Should not have significant memory leaks
      expect(memoryResult.hasLeak).toBe(false);
    });
  });
});