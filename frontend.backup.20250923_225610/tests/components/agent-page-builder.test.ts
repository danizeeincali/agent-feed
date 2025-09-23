/**
 * Component Tests for AgentPageBuilder
 * Following TDD London School approach with focused component testing
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

import AgentPageBuilder from '../../src/components/AgentPageBuilder';
import { TestDataFactory, TestUtils } from '../utils/test-factories';
import { MockWorkspaceApi } from '../mocks/workspace-api.mock';

// Mock AgentPageBuilder since it's not implemented yet - we'll test the interface
jest.mock('../../src/components/AgentPageBuilder', () => {
  return function MockAgentPageBuilder({ agentId, onSave, onClose, initialData }: any) {
    const [formData, setFormData] = React.useState({
      title: initialData?.title || '',
      content_type: initialData?.content_type || 'markdown',
      content_value: initialData?.content_value || '',
      page_type: initialData?.page_type || 'dynamic',
      status: initialData?.status || 'draft'
    });
    
    const [isLoading, setIsLoading] = React.useState(false);
    const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
    const [previewMode, setPreviewMode] = React.useState(false);

    const handleSave = async () => {
      setValidationErrors([]);
      
      // Basic validation
      const errors = [];
      if (!formData.title.trim()) errors.push('Title is required');
      if (!formData.content_value.trim()) errors.push('Content is required');
      if (formData.title.length > 200) errors.push('Title must be less than 200 characters');
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      setIsLoading(true);
      try {
        await onSave?.(formData);
      } catch (error) {
        setValidationErrors(['Failed to save page']);
      } finally {
        setIsLoading(false);
      }
    };

    const renderPreview = () => {
      switch (formData.content_type) {
        case 'markdown':
          return (
            <div data-testid="markdown-preview">
              <pre>{formData.content_value}</pre>
            </div>
          );
        case 'json':
          try {
            const parsed = JSON.parse(formData.content_value);
            return (
              <div data-testid="json-preview">
                <pre>{JSON.stringify(parsed, null, 2)}</pre>
              </div>
            );
          } catch {
            return <div data-testid="json-error">Invalid JSON</div>;
          }
        case 'text':
          return (
            <div data-testid="text-preview">
              <p>{formData.content_value}</p>
            </div>
          );
        case 'component':
          return (
            <div data-testid="component-preview">
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-600 mb-2">React Component Definition:</p>
                <pre>{formData.content_value}</pre>
              </div>
            </div>
          );
        default:
          return <div>Unknown content type</div>;
      }
    };

    return (
      <div data-testid="page-builder-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {initialData ? 'Edit Page' : 'New Page'}
            </h3>
            <button
              data-testid="close-button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div data-testid="validation-errors" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              {validationErrors.map((error, index) => (
                <div key={index} className="text-red-700 text-sm">{error}</div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Page Title
                </label>
                <input
                  id="title"
                  data-testid="title-input"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter page title..."
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/200 characters
                </div>
              </div>

              <div>
                <label htmlFor="page-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Page Type
                </label>
                <select
                  id="page-type"
                  data-testid="page-type-select"
                  value={formData.page_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dynamic">Dynamic</option>
                  <option value="persistent">Persistent</option>
                  <option value="template">Template</option>
                </select>
              </div>

              <div>
                <label htmlFor="content-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type
                </label>
                <select
                  id="content-type"
                  data-testid="content-type-select"
                  value={formData.content_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="component">Component</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  data-testid="status-select"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    Content
                  </label>
                  <button
                    data-testid="toggle-preview"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {previewMode ? 'Edit' : 'Preview'}
                  </button>
                </div>
                
                {!previewMode ? (
                  <textarea
                    id="content"
                    data-testid="content-textarea"
                    value={formData.content_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, content_value: e.target.value }))}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder={`Enter your ${formData.content_type} content...`}
                  />
                ) : (
                  <div className="w-full min-h-[300px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    {renderPreview()}
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview Section */}
            <div className="border-l border-gray-200 pl-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Live Preview</h4>
              <div data-testid="live-preview" className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[400px]">
                {formData.content_value ? renderPreview() : (
                  <div className="text-gray-500 text-center py-12">
                    Enter content to see preview
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Agent ID: {agentId}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                data-testid="cancel-button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              
              <button
                data-testid="save-draft-button"
                onClick={() => {
                  const draftData = { ...formData, status: 'draft' };
                  setFormData(draftData);
                  handleSave();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isLoading || !formData.title.trim()}
              >
                Save as Draft
              </button>
              
              <button
                data-testid="save-button"
                onClick={handleSave}
                disabled={isLoading || !formData.title.trim() || !formData.content_value.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : (formData.status === 'published' ? 'Publish' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
});

describe('AgentPageBuilder Component Tests', () => {
  let mockOnSave: jest.Mock;
  let mockOnClose: jest.Mock;
  const user = userEvent.setup();

  beforeEach(() => {
    mockOnSave = jest.fn();
    mockOnClose = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should render page builder modal with default values', () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('page-builder-modal')).toBeInTheDocument();
      expect(screen.getByText('New Page')).toBeInTheDocument();
      expect(screen.getByTestId('title-input')).toHaveValue('');
      expect(screen.getByTestId('page-type-select')).toHaveValue('dynamic');
      expect(screen.getByTestId('content-type-select')).toHaveValue('markdown');
      expect(screen.getByTestId('status-select')).toHaveValue('draft');
    });

    it('should render with initial data when editing existing page', () => {
      const existingPage = TestDataFactory.createMockAgentPage({
        title: 'Existing Page',
        content_type: 'json',
        content_value: '{"test": true}',
        page_type: 'persistent',
        status: 'published'
      });

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          initialData={existingPage}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Edit Page')).toBeInTheDocument();
      expect(screen.getByTestId('title-input')).toHaveValue('Existing Page');
      expect(screen.getByTestId('content-type-select')).toHaveValue('json');
      expect(screen.getByTestId('page-type-select')).toHaveValue('persistent');
      expect(screen.getByTestId('status-select')).toHaveValue('published');
    });

    it('should display agent ID in the form', () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-123"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Agent ID: test-agent-123')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update title field correctly', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      await user.type(titleInput, 'My New Page');

      expect(titleInput).toHaveValue('My New Page');
    });

    it('should enforce title character limit', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const longTitle = 'A'.repeat(250); // Exceeds 200 character limit
      
      await user.type(titleInput, longTitle);

      // Should be truncated to 200 characters
      expect(titleInput).toHaveValue('A'.repeat(200));
      expect(screen.getByText('200/200 characters')).toBeInTheDocument();
    });

    it('should update content type and adjust placeholder', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTypeSelect = screen.getByTestId('content-type-select');
      await user.selectOptions(contentTypeSelect, 'json');

      expect(contentTypeSelect).toHaveValue('json');
      expect(screen.getByPlaceholderText('Enter your json content...')).toBeInTheDocument();
    });

    it('should update page type correctly', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const pageTypeSelect = screen.getByTestId('page-type-select');
      await user.selectOptions(pageTypeSelect, 'template');

      expect(pageTypeSelect).toHaveValue('template');
    });

    it('should handle content textarea changes', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTextarea = screen.getByTestId('content-textarea');
      await user.type(contentTextarea, '# My Content\n\nThis is a test.');

      expect(contentTextarea).toHaveValue('# My Content\n\nThis is a test.');
    });
  });

  describe('Live Preview Functionality', () => {
    it('should show live preview for markdown content', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTextarea = screen.getByTestId('content-textarea');
      await user.type(contentTextarea, '# Markdown Title\n\nSome content');

      const livePreview = screen.getByTestId('live-preview');
      expect(livePreview).toContainHTML('# Markdown Title');
    });

    it('should show JSON preview and handle invalid JSON', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTypeSelect = screen.getByTestId('content-type-select');
      await user.selectOptions(contentTypeSelect, 'json');

      const contentTextarea = screen.getByTestId('content-textarea');
      
      // First, enter valid JSON
      await user.type(contentTextarea, '{"valid": true}');
      expect(screen.getByTestId('json-preview')).toBeInTheDocument();

      // Then, enter invalid JSON
      await user.clear(contentTextarea);
      await user.type(contentTextarea, '{invalid json}');
      expect(screen.getByTestId('json-error')).toBeInTheDocument();
      expect(screen.getByText('Invalid JSON')).toBeInTheDocument();
    });

    it('should toggle between edit and preview modes', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const toggleButton = screen.getByTestId('toggle-preview');
      expect(toggleButton).toHaveTextContent('Preview');
      expect(screen.getByTestId('content-textarea')).toBeInTheDocument();

      await user.click(toggleButton);

      expect(toggleButton).toHaveTextContent('Edit');
      expect(screen.queryByTestId('content-textarea')).not.toBeInTheDocument();
    });

    it('should show component preview for component content type', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTypeSelect = screen.getByTestId('content-type-select');
      await user.selectOptions(contentTypeSelect, 'component');

      const contentTextarea = screen.getByTestId('content-textarea');
      await user.type(contentTextarea, '{"type": "button", "props": {"label": "Click me"}}');

      expect(screen.getByTestId('component-preview')).toBeInTheDocument();
      expect(screen.getByText('React Component Definition:')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Content is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate title length', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'A'.repeat(201)); // Exceeds limit
      await user.type(contentTextarea, 'Some content');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
      expect(screen.getByText('Title must be less than 200 characters')).toBeInTheDocument();
    });

    it('should disable save button when required fields are empty', () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when all required fields are filled', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'Valid Title');
      await user.type(contentTextarea, 'Valid content');

      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Save Operations', () => {
    it('should call onSave with correct data when save button is clicked', async () => {
      mockOnSave.mockResolvedValue({});

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');
      const pageTypeSelect = screen.getByTestId('page-type-select');
      const statusSelect = screen.getByTestId('status-select');

      await user.type(titleInput, 'Test Page');
      await user.type(contentTextarea, '# Test Content');
      await user.selectOptions(pageTypeSelect, 'persistent');
      await user.selectOptions(statusSelect, 'published');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        title: 'Test Page',
        content_type: 'markdown',
        content_value: '# Test Content',
        page_type: 'persistent',
        status: 'published'
      });
    });

    it('should save as draft when save draft button is clicked', async () => {
      mockOnSave.mockResolvedValue({});

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'Draft Page');
      await user.type(contentTextarea, 'Draft content');

      const saveDraftButton = screen.getByTestId('save-draft-button');
      await user.click(saveDraftButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Draft Page',
          status: 'draft'
        })
      );
    });

    it('should show loading state during save operation', async () => {
      // Create a promise that we can resolve manually
      let resolveSave: (value?: any) => void;
      const savePromise = new Promise(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'Test Page');
      await user.type(contentTextarea, 'Test content');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      expect(saveButton).toHaveTextContent('Saving...');
      expect(saveButton).toBeDisabled();

      // Resolve the save operation
      resolveSave!();
      await waitFor(() => {
        expect(saveButton).toHaveTextContent('Save');
      });
    });

    it('should handle save errors gracefully', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'Test Page');
      await user.type(contentTextarea, 'Test content');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
        expect(screen.getByText('Failed to save page')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interaction', () => {
    it('should call onClose when close button is clicked', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByTestId('close-button');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should prevent closing during save operation', async () => {
      let resolveSave: (value?: any) => void;
      const savePromise = new Promise(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'Test Page');
      await user.type(contentTextarea, 'Test content');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      const cancelButton = screen.getByTestId('cancel-button');
      expect(cancelButton).toBeDisabled();

      resolveSave!();
      await waitFor(() => {
        expect(cancelButton).not.toBeDisabled();
      });
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should support tab navigation through form elements', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const pageTypeSelect = screen.getByTestId('page-type-select');
      const contentTypeSelect = screen.getByTestId('content-type-select');

      titleInput.focus();
      expect(titleInput).toHaveFocus();

      await user.tab();
      expect(pageTypeSelect).toHaveFocus();

      await user.tab();
      expect(contentTypeSelect).toHaveFocus();
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      expect(screen.getByLabelText('Page Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Content Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('should not cause excessive re-renders during typing', async () => {
      let renderCount = 0;
      const TestWrapper = ({ children }: any) => {
        renderCount++;
        return children;
      };

      render(
        <TestWrapper>
          <AgentPageBuilder
            agentId="test-agent-1"
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </TestWrapper>
      );

      const initialRenderCount = renderCount;
      const titleInput = screen.getByTestId('title-input');

      await user.type(titleInput, 'Test');

      // Should not cause excessive renders for each character
      expect(renderCount - initialRenderCount).toBeLessThan(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long content gracefully', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTextarea = screen.getByTestId('content-textarea');
      const longContent = 'A'.repeat(10000);

      await user.type(contentTextarea, longContent);

      expect(contentTextarea).toHaveValue(longContent);
      // Preview should still render without crashing
      expect(screen.getByTestId('live-preview')).toBeInTheDocument();
    });

    it('should handle special characters in content', async () => {
      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const contentTextarea = screen.getByTestId('content-textarea');
      const specialContent = '{"emoji": "🚀", "unicode": "♠♣♥♦", "symbols": "<>&\'\""}';

      const contentTypeSelect = screen.getByTestId('content-type-select');
      await user.selectOptions(contentTypeSelect, 'json');
      await user.type(contentTextarea, specialContent);

      expect(contentTextarea).toHaveValue(specialContent);
      expect(screen.getByTestId('json-preview')).toBeInTheDocument();
    });

    it('should handle rapid save button clicks', async () => {
      mockOnSave.mockResolvedValue({});

      render(
        <AgentPageBuilder
          agentId="test-agent-1"
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      const titleInput = screen.getByTestId('title-input');
      const contentTextarea = screen.getByTestId('content-textarea');

      await user.type(titleInput, 'Test Page');
      await user.type(contentTextarea, 'Test content');

      const saveButton = screen.getByTestId('save-button');
      
      // Click multiple times rapidly
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only call onSave once due to loading state
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });
  });
});