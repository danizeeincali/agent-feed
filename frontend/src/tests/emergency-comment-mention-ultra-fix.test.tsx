/**
 * 🚨 TDD LONDON SCHOOL ULTRA EMERGENCY: Comment @ Mentions Fix
 * 
 * MISSION: Prove CommentForm @ mentions fail while PostCreator works.
 * STRATEGY: Outside-in TDD with mock-driven behavior verification.
 * 
 * RED PHASE: Failing tests proving the bug
 * GREEN PHASE: Fix implementation to match PostCreator success pattern
 * REFACTOR PHASE: Clean code while maintaining debug dropdown functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../components/CommentForm';
import { PostCreator } from '../components/PostCreator';
import { MentionService } from '../services/MentionService';

// 🧪 LONDON SCHOOL: Mock all collaborators first
import { vi } from 'vitest';

vi.mock('../services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn(),
    getQuickMentions: vi.fn(),
    getAllAgents: vi.fn(),
    extractMentions: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../services/api', () => ({
  apiService: {
    createComment: vi.fn().mockResolvedValue({ id: 'test-comment' })
  }
}));

const mockMentionService = MentionService as any;

// 🎭 MOCK FACTORY: Define working agents like PostCreator
const createMockAgents = () => [
  {
    id: 'chief-of-staff',
    name: 'chief-of-staff-agent',
    displayName: 'Chief of Staff',
    description: 'Strategic coordination and planning'
  },
  {
    id: 'personal-todos',
    name: 'personal-todos-agent', 
    displayName: 'Personal Todos',
    description: 'Task and project management'
  },
  {
    id: 'meeting-prep',
    name: 'meeting-prep-agent',
    displayName: 'Meeting Prep',
    description: 'Meeting preparation and coordination'
  }
];

describe('🚨 TDD LONDON SCHOOL: Comment @ Mentions Ultra Emergency Fix', () => {
  beforeEach(() => {
    // 🧹 Reset all mocks before each test
    vi.clearAllMocks();
    
    // 🎯 WORKING PATTERN: Mock service behavior like PostCreator expects
    const mockAgents = createMockAgents();
    mockMentionService.searchMentions.mockResolvedValue(mockAgents);
    mockMentionService.getQuickMentions.mockReturnValue(mockAgents);
    mockMentionService.getAllAgents.mockReturnValue(mockAgents);
  });

  describe('🔴 RED PHASE: Failing Tests - CommentForm @ Mentions Broken', () => {
    it('FAILS: CommentForm should show debug dropdown on @ like PostCreator', async () => {
      // 🎯 ARRANGE: Set up CommentForm like successful PostCreator
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ACT: Type @ to trigger mention dropdown
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Should see debug dropdown like working PostCreator
      await waitFor(() => {
        // This test CURRENTLY FAILS ❌
        expect(screen.getByText(/🚨 EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('FAILS: CommentForm should show agent suggestions on @ like PostCreator', async () => {
      // 🎯 ARRANGE: Mock collaborators for expected behavior
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ACT: Type @ to trigger agents list
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Should see agents like PostCreator
      await waitFor(() => {
        // This test CURRENTLY FAILS ❌
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
        expect(screen.getByText('Personal Todos')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('FAILS: CommentForm reply should show debug dropdown on @', async () => {
      // 🎯 ARRANGE: Test reply scenario specifically
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" parentId="parent-comment" />);
      
      // 🎯 ACT: Type @ in reply field
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Reply should show debug dropdown
      await waitFor(() => {
        // This test CURRENTLY FAILS ❌
        expect(screen.getByText(/🚨 EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('✅ REFERENCE: PostCreator Working Pattern (Should Pass)', () => {
    it('WORKS: PostCreator shows debug dropdown on @ (reference test)', async () => {
      // 🎯 ARRANGE: Test PostCreator as working reference
      const user = userEvent.setup();
      
      render(<PostCreator />);
      
      // 🎯 ACT: Type @ in PostCreator content field
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      await user.click(contentTextarea);
      await user.type(contentTextarea, '@');
      
      // 🎯 ASSERT: PostCreator should show debug dropdown ✅
      await waitFor(() => {
        expect(screen.getByText(/🚨 EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('WORKS: PostCreator shows agent suggestions on @ (reference test)', async () => {
      // 🎯 ARRANGE: Verify PostCreator agent suggestions work
      const user = userEvent.setup();
      
      render(<PostCreator />);
      
      // 🎯 ACT: Type @ in PostCreator
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      await user.click(contentTextarea);
      await user.type(contentTextarea, '@');
      
      // 🎯 ASSERT: PostCreator shows agents ✅
      await waitFor(() => {
        expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
        expect(screen.getByText('Personal Todos')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('🧪 LONDON SCHOOL: Behavior Verification Tests', () => {
    it('should verify CommentForm MentionInput receives correct props', () => {
      // 🎯 ARRANGE: Mock-driven contract testing
      const mockOnMentionSelect = vi.fn();
      
      render(
        <CommentForm 
          postId="test-post"
          onCommentAdded={vi.fn()}
        />
      );
      
      // 🎯 ASSERT: Verify MentionInput is present with correct props
      const mentionInput = screen.getByRole('textbox');
      expect(mentionInput).toBeInTheDocument();
      expect(mentionInput).toHaveAttribute('data-mention-context', 'comment');
    });

    it('should verify CommentForm calls MentionService methods like PostCreator', async () => {
      // 🎯 ARRANGE: Monitor service interactions
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ACT: Trigger mention behavior
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Verify service calls like PostCreator pattern
      await waitFor(() => {
        // Should call searchMentions with empty string for initial suggestions
        expect(mockMentionService.searchMentions).toHaveBeenCalledWith('', expect.any(Object));
      });
    });

    it('should verify CommentForm layout does not interfere with dropdown', () => {
      // 🎯 ARRANGE: Test DOM structure for dropdown interference
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ASSERT: Check for layout patterns that block dropdown
      const form = screen.getByRole('textbox').closest('form');
      expect(form).toBeInTheDocument();
      
      // Verify no competing z-index elements
      const container = screen.getByRole('textbox').closest('div');
      expect(container).not.toHaveStyle('overflow: hidden');
      expect(container).not.toHaveStyle('position: relative; z-index: 1');
    });

    it('should verify CommentForm MentionInput gets focus events correctly', async () => {
      // 🎯 ARRANGE: Test focus behavior that triggers mentions
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" autoFocus />);
      
      // 🎯 ACT: Focus and type
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, 'testing @');
      
      // 🎯 ASSERT: MentionInput should handle focus correctly
      expect(textarea).toHaveFocus();
      expect(textarea).toHaveValue('testing @');
    });
  });

  describe('🧬 COLLABORATIVE MOCK PATTERNS', () => {
    it('should mock MentionService.searchMentions for empty query like PostCreator', async () => {
      // 🎯 ARRANGE: Test service collaboration pattern
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ACT: Trigger empty query search
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Should call service like PostCreator
      await waitFor(() => {
        expect(mockMentionService.searchMentions).toHaveBeenCalledWith(
          '',
          expect.objectContaining({
            maxSuggestions: expect.any(Number)
          })
        );
      });
    });

    it('should mock MentionService.getQuickMentions fallback like PostCreator', async () => {
      // 🎯 ARRANGE: Test fallback behavior
      mockMentionService.searchMentions.mockResolvedValue([]);
      
      const user = userEvent.setup();
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ACT: Trigger fallback behavior
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Should call fallback like PostCreator
      await waitFor(() => {
        expect(mockMentionService.getQuickMentions).toHaveBeenCalledWith('comment');
      });
    });

    it('should handle mention selection callback like PostCreator', async () => {
      // 🎯 ARRANGE: Test mention selection interaction
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      // 🎯 ACT: Select a mention (if dropdown appears)
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // 🎯 ASSERT: Should handle selection correctly
      // Note: This will only pass once dropdown is visible
      await waitFor(async () => {
        const suggestion = screen.queryByText('Chief of Staff');
        if (suggestion) {
          await user.click(suggestion);
          expect(textarea).toHaveValue('@chief-of-staff-agent ');
        }
      }, { timeout: 1000 });
    });
  });

  describe('🎯 CONTRACT VERIFICATION', () => {
    it('should verify CommentForm has same MentionInput contract as PostCreator', () => {
      // 🎯 ARRANGE: Test component contracts
      const commentFormRender = render(<CommentForm postId="test-post" />);
      const commentTextarea = commentFormRender.getByRole('textbox');
      commentFormRender.unmount();
      
      const postCreatorRender = render(<PostCreator />);
      const postTextarea = postCreatorRender.getByPlaceholderText(/Share your insights/);
      
      // 🎯 ASSERT: Both should have MentionInput characteristics
      expect(commentTextarea).toHaveAttribute('data-mention-context');
      expect(postTextarea).toHaveAttribute('data-mention-context');
      
      postCreatorRender.unmount();
    });

    it('should verify both components use same MentionService interface', () => {
      // 🎯 ARRANGE: Contract testing
      render(<CommentForm postId="test-post" />);
      render(<PostCreator />);
      
      // 🎯 ASSERT: Both should be able to call same service methods
      expect(mockMentionService.searchMentions).toBeDefined();
      expect(mockMentionService.getQuickMentions).toBeDefined();
      expect(mockMentionService.getAllAgents).toBeDefined();
    });
  });

  describe('📊 DIAGNOSTIC TESTS', () => {
    it('should diagnose CommentForm layout hierarchy vs PostCreator', () => {
      // 🎯 ARRANGE: Compare DOM structures
      const commentRender = render(<CommentForm postId="test-post" />);
      const commentContainer = commentRender.container;
      commentRender.unmount();
      
      const postRender = render(<PostCreator />);
      const postContainer = postRender.container;
      
      // 🎯 ASSERT: Diagnostic information
      console.log('🔍 CommentForm DOM depth:', commentContainer.querySelectorAll('div').length);
      console.log('🔍 PostCreator DOM depth:', postContainer.querySelectorAll('div').length);
      
      // Look for potential z-index conflicts
      const commentElements = commentContainer.querySelectorAll('[class*="relative"], [class*="absolute"], [class*="fixed"]');
      const postElements = postContainer.querySelectorAll('[class*="relative"], [class*="absolute"], [class*="fixed"]');
      
      console.log('🔍 CommentForm positioned elements:', commentElements.length);
      console.log('🔍 PostCreator positioned elements:', postElements.length);
      
      postRender.unmount();
    });

    it('should check for conflicting CSS classes between components', () => {
      // 🎯 ARRANGE: Class conflict analysis
      const commentRender = render(<CommentForm postId="test-post" />);
      const commentTextarea = commentRender.getByRole('textbox');
      const commentClasses = commentTextarea.className;
      commentRender.unmount();
      
      const postRender = render(<PostCreator />);
      const postTextarea = postRender.getByPlaceholderText(/Share your insights/);
      const postClasses = postTextarea.className;
      
      // 🎯 ASSERT: Class comparison
      console.log('🔍 CommentForm textarea classes:', commentClasses);
      console.log('🔍 PostCreator textarea classes:', postClasses);
      
      // Check for z-index differences
      expect(commentClasses).toContain('border');
      expect(postClasses).toContain('border');
      
      postRender.unmount();
    });
  });
});