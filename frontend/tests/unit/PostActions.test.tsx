import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostActions from '../../src/components/PostActions';

describe('PostActions Component - Saved Posts Integration', () => {
  const mockProps = {
    postId: 'test-post-1',
    isSaved: false,
    onSave: jest.fn(),
    onReport: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Actions Container Structure', () => {
    it('should render the three dots menu button', () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      expect(menuButton).toBeInTheDocument();
      expect(menuButton.querySelector('svg')).toBeInTheDocument(); // MoreHorizontal icon
    });

    it('should not show three dots menu when actions are integrated', () => {
      render(<PostActions {...mockProps} />);
      
      // Menu should be closed initially
      expect(screen.queryByText('Save Post')).not.toBeInTheDocument();
      expect(screen.queryByText('Report Post')).not.toBeInTheDocument();
    });

    it('should open dropdown menu when three dots are clicked', async () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      await waitFor(() => {
        expect(screen.getByText('Save Post')).toBeInTheDocument();
        expect(screen.getByText('Report Post')).toBeInTheDocument();
      });
    });
  });

  describe('Save Post Functionality', () => {
    it('should show "Save Post" when post is not saved', () => {
      render(<PostActions {...mockProps} isSaved={false} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      expect(screen.getByText('Save Post')).toBeInTheDocument();
    });

    it('should show "Unsave Post" when post is saved', () => {
      render(<PostActions {...mockProps} isSaved={true} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      expect(screen.getByText('Unsave Post')).toBeInTheDocument();
    });

    it('should display bookmark icon correctly for saved state', () => {
      render(<PostActions {...mockProps} isSaved={true} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const saveButton = screen.getByText('Unsave Post');
      const bookmarkIcon = saveButton.querySelector('svg');
      expect(bookmarkIcon).toHaveClass('fill-blue-500', 'text-blue-500');
    });

    it('should call onSave with correct parameters when Save is clicked', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<PostActions {...mockProps} onSave={mockOnSave} isSaved={false} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const saveButton = screen.getByText('Save Post');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-post-1', true);
      });
    });

    it('should call onSave with correct parameters when Unsave is clicked', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<PostActions {...mockProps} onSave={mockOnSave} isSaved={true} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const unsaveButton = screen.getByText('Unsave Post');
      fireEvent.click(unsaveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-post-1', false);
      });
    });

    it('should show loading indicator during save operation', async () => {
      const mockOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<PostActions {...mockProps} onSave={mockOnSave} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const saveButton = screen.getByText('Save Post');
      fireEvent.click(saveButton);
      
      // Should show loading spinner
      expect(screen.getByRole('button', { name: /Save Post/i })).toBeDisabled();
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should close menu after successful save', async () => {
      const mockOnSave = jest.fn().mockResolvedValue(undefined);
      render(<PostActions {...mockProps} onSave={mockOnSave} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const saveButton = screen.getByText('Save Post');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Save Post')).not.toBeInTheDocument();
      });
    });
  });

  describe('Comments Integration with Actions', () => {
    it('should not interfere with comment functionality', () => {
      render(<PostActions {...mockProps} />);
      
      // PostActions should be isolated and not affect comment rendering
      const menuButton = screen.getByLabelText('Post actions');
      expect(menuButton).toBeInTheDocument();
      
      // Should not have comment-related elements
      expect(screen.queryByText(/comment/i)).not.toBeInTheDocument();
    });

    it('should maintain proper spacing in actions container', () => {
      render(<PostActions {...mockProps} />);
      
      const actionsContainer = screen.getByLabelText('Post actions').closest('div');
      expect(actionsContainer).toHaveClass('relative');
    });
  });

  describe('Report Functionality', () => {
    it('should show report dialog when Report Post is clicked', async () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const reportButton = screen.getByText('Report Post');
      fireEvent.click(reportButton);
      
      await waitFor(() => {
        expect(screen.getByText('Report Post')).toBeInTheDocument(); // Dialog title
        expect(screen.getByText('Why are you reporting this post?')).toBeInTheDocument();
      });
    });

    it('should show all report reason options', async () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const reportButton = screen.getByText('Report Post');
      fireEvent.click(reportButton);
      
      await waitFor(() => {
        expect(screen.getByText('Spam or inappropriate content')).toBeInTheDocument();
        expect(screen.getByText('Misleading information')).toBeInTheDocument();
        expect(screen.getByText('Harassment or abuse')).toBeInTheDocument();
        expect(screen.getByText('Copyright violation')).toBeInTheDocument();
        expect(screen.getByText('Technical error')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });

    it('should call onReport with selected reason', async () => {
      const mockOnReport = jest.fn().mockResolvedValue(undefined);
      render(<PostActions {...mockProps} onReport={mockOnReport} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const reportButton = screen.getByText('Report Post');
      fireEvent.click(reportButton);
      
      await waitFor(() => {
        const spamOption = screen.getByText('Spam or inappropriate content');
        const spamRadio = spamOption.closest('label')?.querySelector('input[type="radio"]');
        fireEvent.click(spamRadio!);
        
        const reportSubmitButton = screen.getByRole('button', { name: /Report/i });
        fireEvent.click(reportSubmitButton);
      });
      
      await waitFor(() => {
        expect(mockOnReport).toHaveBeenCalledWith('test-post-1', 'Spam or inappropriate content');
      });
    });

    it('should close dialog after successful report', async () => {
      const mockOnReport = jest.fn().mockResolvedValue(undefined);
      render(<PostActions {...mockProps} onReport={mockOnReport} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const reportButton = screen.getByText('Report Post');
      fireEvent.click(reportButton);
      
      await waitFor(() => {
        const spamOption = screen.getByText('Spam or inappropriate content');
        const spamRadio = spamOption.closest('label')?.querySelector('input[type="radio"]');
        fireEvent.click(spamRadio!);
        
        const reportSubmitButton = screen.getByRole('button', { name: /Report/i });
        fireEvent.click(reportSubmitButton);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Why are you reporting this post?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle save operation errors gracefully', async () => {
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<PostActions {...mockProps} onSave={mockOnSave} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const saveButton = screen.getByText('Save Post');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save/unsave post:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle report operation errors gracefully', async () => {
      const mockOnReport = jest.fn().mockRejectedValue(new Error('Report failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<PostActions {...mockProps} onReport={mockOnReport} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const reportButton = screen.getByText('Report Post');
      fireEvent.click(reportButton);
      
      await waitFor(() => {
        const spamOption = screen.getByText('Spam or inappropriate content');
        const spamRadio = spamOption.closest('label')?.querySelector('input[type="radio"]');
        fireEvent.click(spamRadio!);
        
        const reportSubmitButton = screen.getByRole('button', { name: /Report/i });
        fireEvent.click(reportSubmitButton);
      });
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to report post:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      
      // Should be focusable
      menuButton.focus();
      expect(menuButton).toHaveFocus();
      
      // Should open with Enter
      fireEvent.keyDown(menuButton, { key: 'Enter', code: 'Enter' });
      expect(screen.getByText('Save Post')).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      expect(menuButton).toHaveAttribute('aria-label', 'Post actions');
    });

    it('should support modal close with Escape key', async () => {
      render(<PostActions {...mockProps} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const reportButton = screen.getByText('Report Post');
      fireEvent.click(reportButton);
      
      await waitFor(() => {
        expect(screen.getByText('Why are you reporting this post?')).toBeInTheDocument();
      });
      
      // Press Escape to close
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByText('Why are you reporting this post?')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual States', () => {
    it('should apply correct styling for saved state', () => {
      render(<PostActions {...mockProps} isSaved={true} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const unsaveButton = screen.getByText('Unsave Post');
      const bookmarkIcon = unsaveButton.querySelector('svg');
      expect(bookmarkIcon).toHaveClass('fill-blue-500', 'text-blue-500');
    });

    it('should apply correct styling for unsaved state', () => {
      render(<PostActions {...mockProps} isSaved={false} />);
      
      const menuButton = screen.getByLabelText('Post actions');
      fireEvent.click(menuButton);
      
      const saveButton = screen.getByText('Save Post');
      const bookmarkIcon = saveButton.querySelector('svg');
      expect(bookmarkIcon).not.toHaveClass('fill-blue-500');
    });
  });
});