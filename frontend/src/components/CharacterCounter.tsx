/**
 * CharacterCounter Component - TDD London School Implementation
 * 
 * Real-time character counting with validation and user feedback
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { ValidationService } from '../services/ValidationService';

interface CharacterCounterProps {
  text: string;
  maxLength: number;
  minLength?: number;
  warningThreshold?: number;
  showCount?: boolean;
  realTimeValidation?: boolean;
  debounceMs?: number;
  ariaLabel?: string;
  onCountChange?: (count: number) => void;
  onValidate?: (isValid: boolean) => void;
  onWarning?: (data: { current: number; max: number; remaining: number; percentage: number }) => void;
  onError?: (data: { current: number; max: number; exceeded: number }) => void;
  onUpdate?: (text: string) => void;
  metricsTracker?: {
    trackValidation: (data: any) => void;
    trackCharacterInput: (data: any) => void;
    trackLimitWarning: (data: any) => void;
  };
  className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  text,
  maxLength,
  minLength = 0,
  warningThreshold,
  showCount = true,
  realTimeValidation = false,
  debounceMs = 300,
  ariaLabel,
  onCountChange,
  onValidate,
  onWarning,
  onError,
  onUpdate,
  metricsTracker,
  className = ''
}) => {
  const [currentText, setCurrentText] = useState(text);
  const [validationState, setValidationState] = useState<'valid' | 'warning' | 'error'>('valid');
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [validationService] = useState(() => new ValidationService());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Calculate current state
  const currentCount = currentText.length;
  const isOverLimit = currentCount > maxLength;
  const isUnderMinimum = currentCount < minLength;
  const warningThreshold_calculated = warningThreshold || Math.floor(maxLength * 0.8);
  const isApproachingLimit = currentCount >= warningThreshold_calculated && !isOverLimit;
  const remaining = maxLength - currentCount;
  const percentage = currentCount / maxLength;

  // Update validation state
  useEffect(() => {
    let newState: 'valid' | 'warning' | 'error' = 'valid';
    let message = '';

    if (isOverLimit) {
      newState = 'error';
      message = `Exceeds maximum length by ${currentCount - maxLength} characters`;
      onError?.({ current: currentCount, max: maxLength, exceeded: currentCount - maxLength });
    } else if (isUnderMinimum && currentCount > 0) {
      newState = 'error';
      message = `Minimum ${minLength} characters required`;
    } else if (isApproachingLimit) {
      newState = 'warning';
      message = `Approaching character limit (${remaining} remaining)`;
      onWarning?.({ current: currentCount, max: maxLength, remaining, percentage });
      
      // Track warning metrics
      metricsTracker?.trackLimitWarning({
        component: 'CharacterCounter',
        action: 'warning_displayed',
        threshold: warningThreshold_calculated,
        currentLength: currentCount
      });
    }

    setValidationState(newState);
    setValidationMessage(message);

    // Notify validation status
    onValidate?.(newState !== 'error');
    onCountChange?.(currentCount);
  }, [currentCount, maxLength, minLength, isOverLimit, isUnderMinimum, isApproachingLimit, 
      warningThreshold_calculated, remaining, percentage, onError, onWarning, onValidate, 
      onCountChange, metricsTracker]);

  // Handle text changes with debouncing
  const handleTextChange = useCallback((newText: string) => {
    setCurrentText(newText);
    
    // Track character input
    metricsTracker?.trackCharacterInput({
      component: 'CharacterCounter',
      action: 'character_typed',
      length: newText.length
    });
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up debounced validation
    if (realTimeValidation) {
      debounceTimerRef.current = setTimeout(() => {
        const validationResult = validationService.validatePostLength(newText, {
          min: minLength,
          max: maxLength,
          warning: warningThreshold_calculated
        });

        metricsTracker?.trackValidation({
          component: 'CharacterCounter',
          action: 'real_time_validation',
          result: validationResult
        });

        onUpdate?.(newText);
      }, debounceMs);
    } else {
      onUpdate?.(newText);
    }
  }, [minLength, maxLength, warningThreshold_calculated, realTimeValidation, debounceMs, 
      validationService, metricsTracker, onUpdate]);

  // Handle input events
  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleTextChange(event.target.value);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle paste events for accurate counting
    const pastedText = event.clipboardData.getData('text');
    const newText = currentText + pastedText;
    handleTextChange(newText);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Get styling classes based on state
  const getCounterClasses = () => {
    const baseClasses = 'character-counter flex items-center justify-between p-2 text-sm';
    
    switch (validationState) {
      case 'error':
        return `${baseClasses} error-state text-red-600 bg-red-50 border border-red-200 rounded`;
      case 'warning':
        return `${baseClasses} warning-state text-orange-600 bg-orange-50 border border-orange-200 rounded`;
      default:
        return `${baseClasses} text-gray-600 bg-gray-50 border border-gray-200 rounded`;
    }
  };

  const getInputClasses = () => {
    const baseClasses = 'w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
    
    switch (validationState) {
      case 'error':
        return `${baseClasses} border-red-300 bg-red-50`;
      case 'warning':
        return `${baseClasses} border-orange-300 bg-orange-50`;
      default:
        return `${baseClasses} border-gray-300`;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={currentText}
          onChange={handleInputChange}
          onPaste={handlePaste}
          className={getInputClasses()}
          placeholder="Type your message..."
          rows={3}
          data-testid="character-counter-input"
        />
      </div>

      {/* Character Counter Display */}
      <div
        className={getCounterClasses()}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        data-testid="character-counter"
      >
        <div className="flex items-center space-x-2">
          {validationState === 'error' && <AlertCircle className="h-4 w-4" />}
          {validationState === 'valid' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {validationMessage && (
            <span className="text-xs">{validationMessage}</span>
          )}
        </div>

        {showCount && (
          <div className="flex items-center space-x-2">
            <span 
              className={`font-medium ${
                isOverLimit ? 'text-red-600' : 
                isApproachingLimit ? 'text-orange-600' : 
                'text-gray-600'
              }`}
              data-testid="character-count"
            >
              {currentCount}/{maxLength}
            </span>
            
            {/* Progress bar */}
            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isOverLimit ? 'bg-red-500' :
                  isApproachingLimit ? 'bg-orange-400' :
                  'bg-green-400'
                }`}
                style={{ width: `${Math.min(percentage * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterCounter;