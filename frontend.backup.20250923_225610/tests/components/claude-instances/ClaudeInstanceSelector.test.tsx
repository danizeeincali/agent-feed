/**
 * Tests for ClaudeInstanceSelector Component
 * TDD approach - tests written first
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ClaudeInstanceSelector } from '../../../src/components/claude-instances/ClaudeInstanceSelector';
import { CLAUDE_INSTANCE_TYPES } from '../../../src/types/claude-instances';

const mockInstanceTypes = [
  {
    id: 'claude-default',
    name: 'Claude Default',
    command: 'claude',
    description: 'Start Claude with default settings',
    available: true,
    configured: true,
    enabled: true
  },
  {
    id: 'claude-continue',
    name: 'Claude Continue Session',
    command: 'claude -c',
    description: 'Continue previous Claude session',
    available: true,
    configured: true,
    enabled: true
  },
  {
    id: 'claude-prod',
    name: 'Production Claude',
    command: 'cd prod && claude',
    description: 'Start Claude in production environment',
    available: false,
    configured: true,
    enabled: true
  }
];

const defaultProps = {
  instances: mockInstanceTypes,
  isOpen: true,
  onSelect: vi.fn(),
  onClose: vi.fn()
};

describe('ClaudeInstanceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render selector modal when open', () => {
    render(<ClaudeInstanceSelector {...defaultProps} />);
    
    expect(screen.getByText('Select Claude Instance')).toBeInTheDocument();
    expect(screen.getByText('Choose an instance type to start')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(<ClaudeInstanceSelector {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Select Claude Instance')).not.toBeInTheDocument();
  });

  it('should display all available instance types', () => {
    render(<ClaudeInstanceSelector {...defaultProps} />);
    
    mockInstanceTypes.forEach(instance => {
      expect(screen.getByText(instance.name)).toBeInTheDocument();
      expect(screen.getByText(instance.description)).toBeInTheDocument();
    });
  });

  it('should show correct status indicators', () => {
    render(<ClaudeInstanceSelector {...defaultProps} />);
    
    // Available and configured instances should show "Ready"
    expect(screen.getAllByText('Ready')).toHaveLength(2);
    
    // Unavailable instance should show "Not available"
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('should highlight selected instance', () => {
    render(<ClaudeInstanceSelector {...defaultProps} selectedInstance="claude-default" />);
    
    const selectedButton = screen.getByRole('button', { name: /Claude Default/ });
    expect(selectedButton).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('should call onSelect when instance is selected', async () => {
    const onSelect = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onSelect={onSelect} />);
    
    const instance = screen.getByRole('button', { name: /Claude Default/ });
    await userEvent.click(instance);
    
    expect(onSelect).toHaveBeenCalledWith('claude-default');
  });

  it('should prevent selection of unavailable instances', async () => {
    const onSelect = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onSelect={onSelect} />);
    
    const unavailableInstance = screen.getByRole('button', { name: /Production Claude/ });
    expect(unavailableInstance).toBeDisabled();
    
    await userEvent.click(unavailableInstance);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /Close/ });
    await userEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });
    await userEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onClose={onClose} />);
    
    const overlay = screen.getByTestId('modal-overlay');
    await userEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle keyboard navigation', async () => {
    const onClose = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onClose={onClose} />);
    
    // ESC key should close modal
    fireEvent.keyDown(document, { key: 'Escape', keyCode: 27 });
    expect(onClose).toHaveBeenCalled();
  });

  it('should display instance commands', () => {
    render(<ClaudeInstanceSelector {...defaultProps} />);
    
    mockInstanceTypes.forEach(instance => {
      expect(screen.getByText(instance.command)).toBeInTheDocument();
    });
  });

  it('should show loading state when instances are being fetched', () => {
    render(
      <ClaudeInstanceSelector 
        {...defaultProps} 
        instances={[]} 
        isLoading={true} 
      />
    );
    
    expect(screen.getByText('Loading instances...')).toBeInTheDocument();
  });

  it('should show empty state when no instances available', () => {
    render(<ClaudeInstanceSelector {...defaultProps} instances={[]} />);
    
    expect(screen.getByText('No Claude instances available')).toBeInTheDocument();
  });

  it('should apply proper accessibility attributes', () => {
    render(<ClaudeInstanceSelector {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
    
    const title = screen.getByText('Select Claude Instance');
    expect(title).toHaveAttribute('id');
  });

  it('should focus first instance button when modal opens', async () => {
    render(<ClaudeInstanceSelector {...defaultProps} />);
    
    await waitFor(() => {
      const firstInstance = screen.getByRole('button', { name: /Claude Default/ });
      expect(firstInstance).toHaveFocus();
    });
  });

  it('should display model information when available', () => {
    const instancesWithModels = [
      {
        ...mockInstanceTypes[0],
        models: [
          { id: 'claude-4', name: 'Claude 4', capabilities: ['text', 'image'] },
          { id: 'claude-3', name: 'Claude 3', capabilities: ['text'] }
        ]
      }
    ];
    
    render(<ClaudeInstanceSelector {...defaultProps} instances={instancesWithModels} />);
    
    expect(screen.getByText('Claude 4')).toBeInTheDocument();
    expect(screen.getByText('Claude 3')).toBeInTheDocument();
  });
});

// Integration tests with user interactions
describe('ClaudeInstanceSelector Integration', () => {
  it('should complete full selection workflow', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    
    render(
      <ClaudeInstanceSelector 
        {...defaultProps}
        onSelect={onSelect}
        onClose={onClose}
      />
    );
    
    // Select an instance
    const instance = screen.getByRole('button', { name: /Claude Default/ });
    await userEvent.click(instance);
    
    expect(onSelect).toHaveBeenCalledWith('claude-default');
  });

  it('should handle rapid selections correctly', async () => {
    const onSelect = vi.fn();
    render(<ClaudeInstanceSelector {...defaultProps} onSelect={onSelect} />);
    
    const instance1 = screen.getByRole('button', { name: /Claude Default/ });
    const instance2 = screen.getByRole('button', { name: /Claude Continue Session/ });
    
    await userEvent.click(instance1);
    await userEvent.click(instance2);
    
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, 'claude-default');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'claude-continue');
  });
});
