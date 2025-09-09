/**
 * 🎯 COMMENT MENTION VERIFICATION: Confirm CommentForm @ mentions work
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../components/CommentForm';

describe('✅ CommentForm @ Mentions Verification', () => {
  it('should show mention dropdown when typing @', async () => {
    const user = userEvent.setup();
    
    render(<CommentForm postId="test-post" />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.type(textarea, '@');
    
    // Should show the mention debug dropdown
    await waitFor(() => {
      expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show agent suggestions in dropdown', async () => {
    const user = userEvent.setup();
    
    render(<CommentForm postId="test-post" />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.type(textarea, '@');
    
    // Should show agents in dropdown
    await waitFor(() => {
      const dropdown = screen.getByTestId('mention-debug-dropdown');
      expect(dropdown).toBeInTheDocument();
      
      // Check for some agent names (these are from MentionService)
      expect(screen.getByText('Chief of Staff')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should allow selecting agents from dropdown', async () => {
    const user = userEvent.setup();
    
    render(<CommentForm postId="test-post" />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.type(textarea, '@');
    
    // Wait for dropdown and select agent
    await waitFor(async () => {
      const chiefOfStaff = screen.getByText('Chief of Staff');
      await user.click(chiefOfStaff);
      
      // Should insert mention in textarea
      expect(textarea).toHaveValue('@chief-of-staff-agent ');
    }, { timeout: 3000 });
  });

  it('should work in reply mode', async () => {
    const user = userEvent.setup();
    
    render(<CommentForm postId="test-post" parentId="parent-comment" />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.type(textarea, 'Reply with @');
    
    // Should show dropdown for reply too
    await waitFor(() => {
      expect(screen.getByTestId('mention-debug-dropdown')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should have correct mention context', () => {
    render(<CommentForm postId="test-post" />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('data-mention-context', 'comment');
  });
});