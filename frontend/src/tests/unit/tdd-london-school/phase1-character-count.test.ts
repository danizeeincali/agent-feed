/**
 * TDD London School Phase 1: Character Count Display and Validation
 * 
 * Focus: Behavior-driven validation with real-time feedback
 * Contract verification for input constraints and user experience
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CharacterCounter } from '../../src/components/CharacterCounter';
import { PostCreator } from '../../src/components/PostCreator';
import { ValidationService } from '../../src/services/ValidationService';

// Mock dependencies using London School approach
const mockValidationService = {
  validatePostLength: jest.fn(),
  getCharacterLimits: jest.fn(),
  checkContentRules: jest.fn(),
  formatValidationMessage: jest.fn()
};

const mockApiService = {
  createPost: jest.fn(),
  validatePostContent: jest.fn()
};

const mockDebounce = jest.fn((callback, delay) => callback);

jest.mock('../../src/services/ValidationService', () => ({
  ValidationService: jest.fn().mockImplementation(() => mockValidationService)
}));

jest.mock('../../src/services/api', () => ({
  apiService: mockApiService
}));

jest.mock('../../src/hooks/useDebounce', () => ({
  useDebounce: mockDebounce
}));

describe('TDD London School: Character Count Display and Validation', () => {
  const mockCharacterLimits = {
    title: { min: 5, max: 100, warning: 80 },
    content: { min: 10, max: 2000, warning: 1800 },
    tags: { maxPerTag: 20, maxTags: 10 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockValidationService.getCharacterLimits.mockReturnValue(mockCharacterLimits);
    mockValidationService.validatePostLength.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
    
    mockApiService.validatePostContent.mockResolvedValue({
      success: true,
      valid: true
    });
  });

  describe('Contract Definition: Character Counter Behavior', () => {
    it('should define contract for character counting component', () => {
      // FAIL: CharacterCounter component doesn't exist yet
      render(<CharacterCounter 
        text=""
        maxLength={100}
        showCount={true}
      />);
      
      expect(screen.getByTestId('character-counter')).toBeInTheDocument();
      expect(screen.getByTestId('character-count')).toHaveTextContent('0/100');
    });

    it('should update count in real-time as user types', async () => {
      const user = userEvent.setup();
      
      render(<CharacterCounter 
        text=""
        maxLength={100}
        onCountChange={jest.fn()}
      />);
      
      const textArea = screen.getByTestId('character-counter-input');
      await user.type(textArea, 'Hello World');
      
      expect(screen.getByTestId('character-count')).toHaveTextContent('11/100');
    });

    it('should show warning when approaching limit', async () => {
      const mockOnWarning = jest.fn();
      
      render(<CharacterCounter 
        text="A".repeat(85) // 85 characters, approaching 100 limit
        maxLength={100}
        warningThreshold={80}
        onWarning={mockOnWarning}
      />);
      
      expect(screen.getByTestId('character-counter')).toHaveClass('warning-state');
      expect(mockOnWarning).toHaveBeenCalledWith({
        current: 85,
        max: 100,
        remaining: 15,
        percentage: 0.85
      });
    });

    it('should show error when limit exceeded', async () => {
      const mockOnError = jest.fn();
      
      render(<CharacterCounter 
        text="A".repeat(105) // Exceeds 100 limit
        maxLength={100}
        onError={mockOnError}
      />);
      
      expect(screen.getByTestId('character-counter')).toHaveClass('error-state');
      expect(mockOnError).toHaveBeenCalledWith({
        current: 105,
        max: 100,
        exceeded: 5
      });
    });
  });

  describe('Outside-in TDD: Post Creation Workflow', () => {
    it('should integrate character counter in post creation form', () => {
      // FAIL: Integration doesn't exist yet
      const mockOnCreate = jest.fn();
      
      render(<PostCreator onPostCreated={mockOnCreate} />);
      
      // Should have character counters for title and content
      expect(screen.getByTestId('title-character-counter')).toBeInTheDocument();
      expect(screen.getByTestId('content-character-counter')).toBeInTheDocument();
      
      // Should show initial counts
      expect(screen.getByTestId('title-count')).toHaveTextContent('0/100');
      expect(screen.getByTestId('content-count')).toHaveTextContent('0/2000');
    });

    it('should prevent submission when character limits exceeded', async () => {
      const user = userEvent.setup();
      const mockOnCreate = jest.fn();
      
      render(<PostCreator onPostCreated={mockOnCreate} />);
      
      // Enter text exceeding title limit
      const titleInput = screen.getByTestId('post-title-input');
      await user.type(titleInput, 'A'.repeat(105)); // Exceeds 100 limit
      
      const submitButton = screen.getByTestId('create-post-submit');
      expect(submitButton).toBeDisabled();
      
      // Should show error message
      expect(screen.getByText('Title exceeds maximum length')).toBeInTheDocument();
    });

    it('should collaborate with validation service for complex rules', async () => {
      const user = userEvent.setup();
      
      mockValidationService.validatePostLength.mockReturnValue({
        isValid: false,
        errors: ['Content too short - minimum 10 characters required']
      });
      
      render(<PostCreator onPostCreated={jest.fn()} />);
      
      const contentInput = screen.getByTestId('post-content-input');
      await user.type(contentInput, 'Short'); // Only 5 characters
      
      // Should call validation service
      expect(mockValidationService.validatePostLength).toHaveBeenCalledWith(
        'Short',
        mockCharacterLimits.content
      );
      
      // Should show validation error
      expect(screen.getByText('Content too short - minimum 10 characters required')).toBeInTheDocument();
    });
  });

  describe('Mock Verification: Validation Patterns', () => {
    it('should verify real-time validation sequence', async () => {
      const user = userEvent.setup();
      const mockOnValidate = jest.fn();
      
      render(<CharacterCounter 
        text=""
        maxLength={100}
        onValidate={mockOnValidate}
        realTimeValidation={true}
      />);
      
      const input = screen.getByTestId('character-counter-input');
      await user.type(input, 'Test content');
      
      // Should trigger validation for each keystroke (debounced)
      expect(mockOnValidate).toHaveBeenCalled();
      expect(mockValidationService.validatePostLength).toHaveBeenCalled();
    });

    it('should collaborate with debounced validation service', async () => {
      const user = userEvent.setup();
      let debouncedCallback: Function;
      
      mockDebounce.mockImplementation((callback, delay) => {
        debouncedCallback = callback;
        return callback;
      });
      
      render(<CharacterCounter 
        text=""
        maxLength={100}
        debounceMs={300}
      />);
      
      const input = screen.getByTestId('character-counter-input');
      await user.type(input, 'Test');
      
      // Should use debounced validation
      expect(mockDebounce).toHaveBeenCalledWith(expect.any(Function), 300);
    });

    it('should track validation metrics', () => {
      const mockMetricsTracker = {
        trackValidation: jest.fn(),
        trackCharacterInput: jest.fn(),
        trackLimitWarning: jest.fn()
      };
      
      render(<CharacterCounter 
        text="Warning threshold text that is getting long"
        maxLength={100}
        warningThreshold={80}
        metricsTracker={mockMetricsTracker}
      />);
      
      expect(mockMetricsTracker.trackValidation).toHaveBeenCalledWith({
        component: 'CharacterCounter',
        action: 'warning_displayed',
        threshold: 80,
        currentLength: expect.any(Number)
      });
    });
  });

  describe('Integration: Validation Service Collaboration', () => {
    it('should use validation service for business rules', () => {
      const validationService = new ValidationService();
      
      validationService.validatePostLength('test content', mockCharacterLimits.content);
      
      expect(mockValidationService.validatePostLength).toHaveBeenCalledWith(
        'test content',
        mockCharacterLimits.content
      );
    });

    it('should get character limits from validation service', () => {
      const validationService = new ValidationService();
      
      const limits = validationService.getCharacterLimits();
      
      expect(mockValidationService.getCharacterLimits).toHaveBeenCalled();
      expect(limits).toEqual(mockCharacterLimits);
    });

    it('should check content rules beyond character count', () => {
      const validationService = new ValidationService();
      
      validationService.checkContentRules('test content with @mentions and #tags');
      
      expect(mockValidationService.checkContentRules).toHaveBeenCalledWith(
        'test content with @mentions and #tags'
      );
    });

    it('should format validation messages appropriately', () => {
      mockValidationService.formatValidationMessage.mockReturnValue(
        'Content must be between 10 and 2000 characters'
      );
      
      const validationService = new ValidationService();
      
      const message = validationService.formatValidationMessage({
        type: 'length',
        current: 5,
        min: 10,
        max: 2000
      });
      
      expect(message).toBe('Content must be between 10 and 2000 characters');
    });
  });

  describe('Edge Cases and User Experience', () => {
    it('should handle paste operations correctly', async () => {
      const user = userEvent.setup();
      const longText = 'A'.repeat(150); // Exceeds 100 limit
      
      render(<CharacterCounter 
        text=""
        maxLength={100}
        onError={jest.fn()}
      />);
      
      const input = screen.getByTestId('character-counter-input');
      await user.click(input);
      await user.paste(longText);
      
      // Should immediately show error state
      expect(screen.getByTestId('character-counter')).toHaveClass('error-state');
      expect(screen.getByTestId('character-count')).toHaveTextContent('150/100');
    });

    it('should handle unicode characters correctly', () => {
      const unicodeText = '🤖👋🏻💻🚀✨'; // 5 emoji characters
      
      render(<CharacterCounter 
        text={unicodeText}
        maxLength={100}
      />);
      
      // Should count emoji as single characters
      expect(screen.getByTestId('character-count')).toHaveTextContent('5/100');
    });

    it('should provide accessibility features', () => {
      render(<CharacterCounter 
        text="Test content"
        maxLength={100}
        ariaLabel="Post content character counter"
      />);
      
      const counter = screen.getByTestId('character-counter');
      expect(counter).toHaveAttribute('aria-label', 'Post content character counter');
      expect(counter).toHaveAttribute('role', 'status');
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });

    it('should handle rapid typing without performance issues', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = jest.fn();
      
      render(<CharacterCounter 
        text=""
        maxLength={100}
        onUpdate={mockOnUpdate}
      />);
      
      const input = screen.getByTestId('character-counter-input');
      
      // Simulate rapid typing
      const rapidText = 'The quick brown fox jumps over the lazy dog';
      await user.type(input, rapidText);
      
      // Should handle all updates efficiently
      expect(mockOnUpdate).toHaveBeenCalledTimes(rapidText.length);
      expect(screen.getByTestId('character-count')).toHaveTextContent(`${rapidText.length}/100`);
    });

    it('should maintain count accuracy during complex edits', async () => {
      const user = userEvent.setup();
      
      render(<CharacterCounter 
        text="Initial content"
        maxLength={100}
      />);
      
      const input = screen.getByTestId('character-counter-input');
      
      // Select middle text and replace
      await user.click(input);
      await user.keyboard('{Control>}a{/Control}'); // Select all
      await user.type(input, 'Replaced content');
      
      expect(screen.getByTestId('character-count')).toHaveTextContent('17/100');
    });
  });
});