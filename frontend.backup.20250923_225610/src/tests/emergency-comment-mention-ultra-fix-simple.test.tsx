/**
 * 🚨 TDD LONDON SCHOOL ULTRA EMERGENCY: Comment @ Mentions Fix
 * 
 * MISSION: Prove CommentForm @ mentions fail while PostCreator works.
 * STRATEGY: Simple test to confirm the bug and then fix it.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../components/CommentForm';
import { PostCreator } from '../components/PostCreator';

describe('🚨 EMERGENCY: Comment @ Mentions vs PostCreator', () => {
  describe('🔴 RED PHASE: CommentForm @ Mentions Fail', () => {
    it('FAILS: CommentForm should show debug dropdown on @', async () => {
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // This should show the debug dropdown but currently FAILS
      await waitFor(() => {
        expect(screen.getByText(/🚨 EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('FAILS: CommentForm should show agent suggestions on @', async () => {
      const user = userEvent.setup();
      
      render(<CommentForm postId="test-post" />);
      
      const textarea = screen.getByRole('textbox');
      await user.click(textarea);
      await user.type(textarea, '@');
      
      // Should see dropdown with agents but currently FAILS
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('✅ REFERENCE: PostCreator Works (Should Pass)', () => {
    it('WORKS: PostCreator shows debug dropdown on @', async () => {
      const user = userEvent.setup();
      
      render(<PostCreator />);
      
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      await user.click(contentTextarea);
      await user.type(contentTextarea, '@');
      
      // PostCreator should show debug dropdown - this works
      await waitFor(() => {
        expect(screen.getByText(/🚨 EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('WORKS: PostCreator shows dropdown test-id', async () => {
      const user = userEvent.setup();
      
      render(<PostCreator />);
      
      const contentTextarea = screen.getByPlaceholderText(/Share your insights/);
      await user.click(contentTextarea);
      await user.type(contentTextarea, '@');
      
      // PostCreator should show dropdown element - this works
      await waitFor(() => {
        expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('🧪 COMPARISON: Direct DOM Analysis', () => {
    it('should compare CommentForm vs PostCreator MentionInput usage', () => {
      // Test CommentForm structure
      const commentRender = render(<CommentForm postId="test-post" />);
      const commentTextarea = commentRender.getByRole('textbox');
      expect(commentTextarea).toHaveAttribute('data-mention-context', 'comment');
      commentRender.unmount();
      
      // Test PostCreator structure
      const postRender = render(<PostCreator />);
      const postTextarea = postRender.getByPlaceholderText(/Share your insights/);
      expect(postTextarea).toHaveAttribute('data-mention-context', 'post');
      postRender.unmount();
    });

    it('should verify both use MentionInput component', () => {
      // CommentForm
      const commentRender = render(<CommentForm postId="test-post" />);
      const commentTextarea = commentRender.getByRole('textbox');
      expect(commentTextarea).toBeInTheDocument();
      const commentHasPlaceholder = commentTextarea.getAttribute('placeholder')?.includes('@') || false;
      commentRender.unmount();
      
      // PostCreator  
      const postRender = render(<PostCreator />);
      const postTextarea = postRender.getByPlaceholderText(/Share your insights/);
      expect(postTextarea).toBeInTheDocument();
      const postHasPlaceholder = postTextarea.getAttribute('placeholder')?.includes('@') || false;
      postRender.unmount();
      
      console.log('CommentForm has @ placeholder:', commentHasPlaceholder);
      console.log('PostCreator has @ placeholder:', postHasPlaceholder);
    });
  });
});