/**
 * TDD London School: Mention System Behavior Tests
 * Focus: Object collaboration and behavior verification for @ mention system
 * Approach: Mock all dependencies, test object interactions and contracts
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { TDDTestUtilities, TDDAssertions } from '../utilities/TDDTestUtilities';
import TDDLondonSchoolMockFactory, { MockMentionService } from '../mock-factories/TDDLondonSchoolMockFactory';

// Components under test
import { PostCreator } from '../../../components/PostCreator';
import { CommentForm } from '../../../components/CommentForm';
import { MentionInput } from '../../../components/MentionInput';

// Mock all external dependencies - London School approach
jest.mock('../../../services/MentionService', () => ({
  MentionService: TDDLondonSchoolMockFactory.createMentionServiceMock()
}));

jest.mock('../../../services/api', () => ({
  apiService: TDDLondonSchoolMockFactory.createApiServiceMock()
}));

describe('TDD London School: Mention System Behavior', () => {
  let mockMentionService: MockMentionService;
  let mockProps: any;
  
  beforeEach(() => {
    // Reset all mocks for test isolation
    mockMentionService = TDDLondonSchoolMockFactory.createMentionServiceMock();
    mockProps = TDDLondonSchoolMockFactory.createComponentPropMocks();
    
    // Replace the imported service with our mock
    jest.doMock('../../../services/MentionService', () => ({
      MentionService: mockMentionService
    }));
  });

  afterEach(() => {
    TDDTestUtilities.cleanupTest();
  });

  describe('MentionInput Component Behavior', () => {
    it('should trigger searchMentions when @ is typed (empty query behavior)', async () => {
      // Arrange: Mock returns expected agent list
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'test-agent', name: 'test-agent', displayName: 'Test Agent', description: 'Test' }
      ]);

      // Act: Render component and trigger mention
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '@');

      // Assert: Verify collaboration with MentionService
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      });

      // Verify dropdown appears with suggestions
      await TDDAssertions.mentionSystemBehavior.dropdownAppears();
      TDDAssertions.mentionSystemBehavior.dropdownContainsSuggestions();
    });

    it('should pass query to searchMentions when typing after @ (filtered query behavior)', async () => {
      // Arrange: Mock returns filtered results
      const filteredResults = [
        { id: 'chief-of-staff', name: 'chief-of-staff-agent', displayName: 'Chief of Staff', description: 'Strategic coordination' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(filteredResults);

      // Act: Type @ followed by query
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '@chief');

      // Assert: Verify service called with correct query
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalledWith('chief', expect.any(Object));
      });
    });

    it('should call onMentionSelect callback when mention is selected', async () => {
      // Arrange: Setup mock with selectable mention
      const testMention = { 
        id: 'test-agent', 
        name: 'test-agent', 
        displayName: 'Test Agent', 
        description: 'Test agent for collaboration testing' 
      };
      mockMentionService.searchMentions.mockResolvedValue([testMention]);

      // Act: Trigger mention selection
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await TDDTestUtilities.triggerMentionSystem(input, user);
      await TDDTestUtilities.selectMentionByKeyboard(user, 0);

      // Assert: Verify callback collaboration
      expect(mockProps.onMentionSelect).toHaveBeenCalledWith(testMention);
      expect(mockProps.onChange).toHaveBeenCalledWith('@test-agent ');
    });

    it('should handle MentionService failures gracefully (error boundary behavior)', async () => {
      // Arrange: Mock service to throw error
      mockMentionService.searchMentions.mockRejectedValue(new Error('Service unavailable'));

      // Act: Try to trigger mention system
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '@');

      // Assert: Component should handle error gracefully
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalled();
      });

      // Should not crash and should provide fallback behavior
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('@');
    });
  });

  describe('PostCreator Mention Integration Behavior', () => {
    it('should coordinate between PostCreator, MentionInput and MentionService', async () => {
      // Arrange: Setup complete collaboration chain
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'chief-of-staff', name: 'chief-of-staff-agent', displayName: 'Chief of Staff', description: 'Strategic coordination' }
      ]);

      // Act: Render PostCreator and interact with mention system
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator 
          onPostCreated={mockProps.onPostCreated}
          className="test-post-creator"
        />
      );

      // Focus on content area (MentionInput within PostCreator)
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test Post');

      const contentArea = screen.getByPlaceholderText(/share your insights/i);
      await TDDTestUtilities.triggerMentionSystem(contentArea, user);
      await TDDTestUtilities.selectMentionByKeyboard(user, 0);

      // Assert: Verify collaboration sequence
      TDDTestUtilities.verifyComponentCollaboration(
        { searchMentions: mockMentionService.searchMentions },
        [
          { service: 'searchMentions', method: 'searchMentions', times: 1 }
        ]
      );

      // Verify mention appears in content
      expect(contentArea).toHaveValue('@chief-of-staff-agent ');
    });

    it('should include mentioned agents in form submission metadata', async () => {
      // Arrange: Mock API service
      const mockApiService = TDDLondonSchoolMockFactory.createApiServiceMock();
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'chief-of-staff', name: 'chief-of-staff-agent', displayName: 'Chief of Staff', description: 'Strategic coordination' }
      ]);

      // Mock the API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'post-123' }, success: true })
      });

      // Act: Create post with mention
      const { user } = await TDDTestUtilities.renderWithUser(
        <PostCreator onPostCreated={mockProps.onPostCreated} />
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Test Post with Mention');
      
      const contentArea = screen.getByPlaceholderText(/share your insights/i);
      await user.type(contentArea, 'Hello @chief-of-staff-agent, need your input');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /publish post/i });
      await user.click(submitButton);

      // Assert: Verify API called with mention data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('chief-of-staff-agent')
          })
        );
      });
    });
  });

  describe('CommentForm Mention Integration Behavior', () => {
    it('should coordinate CommentForm, MentionInput and API service for comment creation', async () => {
      // Arrange: Setup mocks for comment workflow
      const mockApiService = TDDLondonSchoolMockFactory.createApiServiceMock();
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'code-reviewer', name: 'code-reviewer-agent', displayName: 'Code Reviewer', description: 'Code analysis' }
      ]);

      // Act: Render CommentForm and create comment with mention
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentForm 
          postId="test-post-1"
          onCommentAdded={mockProps.onCommentAdded}
          currentUser="test-user"
        />
      );

      const commentInput = screen.getByRole('textbox');
      await user.type(commentInput, 'Great analysis! @code-reviewer-agent what do you think?');
      
      // Submit comment
      const submitButton = screen.getByRole('button', { name: /submit analysis|post analysis/i });
      await user.click(submitButton);

      // Assert: Verify service collaboration
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalled();
        expect(mockProps.onCommentAdded).toHaveBeenCalled();
      });
    });

    it('should handle nested comment replies with mentions', async () => {
      // Arrange: Setup for reply comment
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'bug-hunter', name: 'bug-hunter-agent', displayName: 'Bug Hunter', description: 'Issue detection' }
      ]);

      // Act: Create reply comment with mention
      const { user } = await TDDTestUtilities.renderWithUser(
        <CommentForm 
          postId="test-post-1"
          parentId="parent-comment-1"
          onCommentAdded={mockProps.onCommentAdded}
          currentUser="test-user"
        />
      );

      const replyInput = screen.getByRole('textbox');
      await user.type(replyInput, '@bug-hunter-agent can you validate this?');
      
      const submitButton = screen.getByRole('button', { name: /submit analysis/i });
      await user.click(submitButton);

      // Assert: Verify reply structure and mention handling
      await waitFor(() => {
        expect(mockProps.onCommentAdded).toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Component Mention Consistency Behavior', () => {
    it('should ensure mention behavior is identical across PostCreator and CommentForm', async () => {
      // Arrange: Setup identical mock responses
      const standardMentions = [
        { id: 'test-agent', name: 'test-agent', displayName: 'Test Agent', description: 'Consistent behavior test' }
      ];
      mockMentionService.searchMentions.mockResolvedValue(standardMentions);

      // Act & Assert: Test cross-component consistency
      const components = [
        <PostCreator onPostCreated={mockProps.onPostCreated} />,
        <CommentForm postId="test" onCommentAdded={mockProps.onCommentAdded} />
      ];

      const results = await TDDTestUtilities.verifyCrossComponentConsistency(
        components,
        'mention-dropdown'
      );

      // All components should show same mention behavior
      expect(results.every(r => r.hasDropdown)).toBe(true);
      expect(results.every(r => r.suggestionCount > 0)).toBe(true);
    });

    it('should maintain mention state isolation between components', async () => {
      // Arrange: Render multiple components simultaneously
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'isolated-agent', name: 'isolated-agent', displayName: 'Isolated Agent', description: 'State isolation test' }
      ]);

      // Act: Render multiple components with mentions
      const { user } = await TDDTestUtilities.renderWithUser(
        <div>
          <PostCreator onPostCreated={mockProps.onPostCreated} />
          <CommentForm postId="test" onCommentAdded={mockProps.onCommentAdded} />
        </div>
      );

      // Interact with first component
      const postCreatorInput = screen.getAllByRole('textbox')[1]; // Content area
      await user.type(postCreatorInput, '@isolated');

      // Interact with second component  
      const commentFormInput = screen.getAllByRole('textbox')[2]; // Comment input
      await user.type(commentFormInput, '@different');

      // Assert: Each component maintains independent state
      expect(postCreatorInput).toHaveValue('@isolated');
      expect(commentFormInput).toHaveValue('@different');
    });
  });

  describe('Mention System Error Recovery Behavior', () => {
    it('should recover gracefully when MentionService is unavailable', async () => {
      // Arrange: Simulate service failure
      mockMentionService.searchMentions.mockRejectedValue(new Error('Network failure'));
      mockMentionService.getQuickMentions.mockReturnValue([
        { id: 'fallback-agent', name: 'fallback-agent', displayName: 'Fallback Agent', description: 'Error recovery' }
      ]);

      // Act: Try to use mention system during failure
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '@');

      // Assert: Should fallback to alternative data source
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalled();
        // Component should attempt fallback
        expect(mockMentionService.getQuickMentions).toHaveBeenCalled();
      });
    });

    it('should handle malformed mention data without crashing', async () => {
      // Arrange: Return malformed data
      mockMentionService.searchMentions.mockResolvedValue([
        null, // Invalid mention
        { id: 'valid-agent', name: 'valid-agent', displayName: 'Valid Agent' }, // Valid mention
        undefined // Another invalid mention
      ]);

      // Act: Try to use mention system with bad data
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      const input = screen.getByRole('textbox');
      await user.type(input, '@');

      // Assert: Should filter out invalid data and continue working
      await waitFor(() => {
        const dropdown = screen.queryByTestId('mention-debug-dropdown');
        if (dropdown) {
          const suggestions = screen.getAllByRole('option');
          // Should only show valid mentions
          expect(suggestions.length).toBe(1);
          expect(suggestions[0]).toHaveTextContent('Valid Agent');
        }
      });
    });
  });

  describe('Mention System Performance Behavior', () => {
    it('should debounce search requests to prevent excessive API calls', async () => {
      // Arrange: Setup debounced mock
      mockMentionService.searchMentions.mockResolvedValue([
        { id: 'perf-agent', name: 'perf-agent', displayName: 'Performance Agent', description: 'Performance testing' }
      ]);

      // Act: Type rapidly to trigger debouncing
      const { user } = await TDDTestUtilities.renderWithUser(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
          debounceMs={100}
        />
      );

      const input = screen.getByRole('textbox');
      
      // Type quickly
      await user.type(input, '@perf', { delay: 10 });

      // Wait for debounce
      await TDDTestUtilities.simulateNetworkDelay(150);

      // Assert: Should only call service once due to debouncing
      expect(mockMentionService.searchMentions).toHaveBeenCalledTimes(1);
      expect(mockMentionService.searchMentions).toHaveBeenCalledWith('perf', expect.any(Object));
    });

    it('should render within performance thresholds', async () => {
      // Arrange: Large mention dataset
      const largeMentionList = Array.from({ length: 100 }, (_, i) => ({
        id: `agent-${i}`,
        name: `agent-${i}`,
        displayName: `Agent ${i}`,
        description: `Agent number ${i}`
      }));
      mockMentionService.searchMentions.mockResolvedValue(largeMentionList);

      // Act: Measure render performance
      const performance = await TDDTestUtilities.measureRenderPerformance(
        <MentionInput 
          value=""
          onChange={mockProps.onChange}
          onMentionSelect={mockProps.onMentionSelect}
        />
      );

      // Assert: Should render within acceptable time
      expect(performance.isPerformant).toBe(true);
      expect(performance.renderTime).toBeLessThan(100); // 100ms threshold
    });
  });
});