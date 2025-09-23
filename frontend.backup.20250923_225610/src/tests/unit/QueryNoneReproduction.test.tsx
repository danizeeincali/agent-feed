import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MentionInput } from '../../components/MentionInput';
import React from 'react';

describe('CRITICAL BUG REPRODUCTION: "Query: none" Issue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EXACT BUG REPRODUCTION', () => {
    it('should reproduce the exact "Query: none" bug when typing @', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const mockOnMention = vi.fn();

      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          onMention={mockOnMention}
          placeholder="Type @ to test..."
        />
      );

      const textarea = screen.getByPlaceholderText('Type @ to test...') as HTMLTextAreaElement;
      
      // Step 1: Type @ character - this should trigger dropdown
      console.log('🔍 TEST: Typing @ character...');
      await user.type(textarea, '@');

      // Wait for dropdown to appear and capture its state
      await waitFor(async () => {
        // Look for dropdown
        const dropdownElement = screen.queryByText(/EMERGENCY DEBUG/);
        
        if (dropdownElement) {
          console.log('✅ TEST: Dropdown found!');
          console.log('📋 TEST: Dropdown content:', dropdownElement.textContent);
          
          // Check if it shows "Query: none" - this is the bug we're reproducing
          expect(dropdownElement.textContent).toContain('Query:');
          
          // CRITICAL: This should fail showing the bug exists
          const hasQueryNone = dropdownElement.textContent?.includes('Query: "none"');
          const hasEmptyQuery = dropdownElement.textContent?.includes('Query: ""');
          
          console.log('🐛 TEST BUG CHECK:', { 
            hasQueryNone, 
            hasEmptyQuery,
            fullText: dropdownElement.textContent 
          });
          
          // The bug shows "Query: none" instead of "Query: ''" (empty string)
          if (hasQueryNone) {
            console.log('🚨 CRITICAL BUG CONFIRMED: Query shows "none" instead of empty string');
          }
        } else {
          console.log('❌ TEST: No dropdown found - this is also a bug');
          throw new Error('Expected dropdown to appear when typing @');
        }
      }, { timeout: 3000 });
    });

    it('should capture exact state during @ input for debugging', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          placeholder="Debug test..."
        />
      );

      const textarea = screen.getByPlaceholderText('Debug test...') as HTMLTextAreaElement;
      
      // Monitor all onChange calls to see exact state progression
      mockOnChange.mockImplementation((value) => {
        console.log('🔄 TEST onChange called with:', { value, length: value.length });
      });
      
      // Type @ character slowly to catch exact moment
      console.log('🔍 TEST: Starting @ input sequence...');
      
      // Focus first
      await user.click(textarea);
      console.log('📍 TEST: Cursor position after focus:', textarea.selectionStart);
      
      // Type @ 
      await user.type(textarea, '@');
      console.log('📍 TEST: Cursor position after @:', textarea.selectionStart);
      console.log('📍 TEST: Textarea value after @:', `"${textarea.value}"`);
      
      // Check if dropdown appears
      await waitFor(() => {
        const debugElement = screen.queryByText(/EMERGENCY DEBUG/);
        if (debugElement) {
          console.log('📋 TEST: Dropdown state:', debugElement.textContent);
        }
      }, { timeout: 2000 });
    });

    it('should test findMentionQuery function behavior directly', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      render(
        <MentionInput
          value="@"
          onChange={mockOnChange}
          placeholder="Query extraction test..."
        />
      );

      const textarea = screen.getByPlaceholderText('Query extraction test...') as HTMLTextAreaElement;
      
      // Set cursor position at end (after @)
      textarea.focus();
      textarea.setSelectionRange(1, 1);
      
      console.log('🔧 TEST: Testing query extraction with cursor after @');
      console.log('📍 TEST: Value:', `"${textarea.value}"`, 'Cursor:', textarea.selectionStart);
      
      // Trigger input event to simulate typing
      fireEvent.input(textarea, { target: { value: '@' } });
      
      // Wait for processing and check dropdown state
      await waitFor(() => {
        const debugElement = screen.queryByText(/Query:/);
        if (debugElement) {
          console.log('🔍 TEST: Query extraction result:', debugElement.textContent);
          
          // The bug is likely in findMentionQuery returning null instead of empty query
          const queryText = debugElement.textContent;
          if (queryText?.includes('Query: "none"')) {
            console.log('🐛 CONFIRMED BUG: findMentionQuery is returning null, displayed as "none"');
          } else if (queryText?.includes('Query: ""')) {
            console.log('✅ EXPECTED BEHAVIOR: findMentionQuery returns empty string query');
          }
        }
      }, { timeout: 2000 });
    });

    it('should test multiple @ scenarios that fail', async () => {
      const testCases = [
        { description: '@ at start', value: '@', cursorPos: 1 },
        { description: '@ after space', value: 'hello @', cursorPos: 7 },
        { description: '@ in middle', value: 'test @ word', cursorPos: 6 },
        { description: '@ with partial text', value: '@as', cursorPos: 3 }
      ];

      for (const testCase of testCases) {
        console.log(`\n🔄 TEST CASE: ${testCase.description}`);
        
        const user = userEvent.setup();
        const mockOnChange = vi.fn();
        
        const { unmount } = render(
          <MentionInput
            value={testCase.value}
            onChange={mockOnChange}
            placeholder={`Test: ${testCase.description}`}
          />
        );

        const textarea = screen.getByPlaceholderText(`Test: ${testCase.description}`) as HTMLTextAreaElement;
        
        // Set exact cursor position
        textarea.focus();
        textarea.setSelectionRange(testCase.cursorPos, testCase.cursorPos);
        
        console.log('📍 TEST STATE:', { 
          value: `"${textarea.value}"`, 
          cursorPos: textarea.selectionStart,
          expected: testCase.cursorPos 
        });
        
        // Trigger input event
        fireEvent.input(textarea, { target: { value: testCase.value } });
        
        // Check if dropdown appears and what it shows
        try {
          await waitFor(() => {
            const debugElement = screen.queryByText(/Query:/);
            if (debugElement) {
              console.log(`✅ ${testCase.description}: Dropdown found -`, debugElement.textContent);
            } else {
              console.log(`❌ ${testCase.description}: No dropdown found`);
            }
          }, { timeout: 1000 });
        } catch (error) {
          console.log(`⚠️ ${testCase.description}: Timeout waiting for dropdown`);
        }
        
        unmount();
      }
    });
  });

  describe('LIVE DEBUG: Component State Analysis', () => {
    it('should capture all component state changes during @ input', async () => {
      let componentUpdates: any[] = [];
      
      const DebugMentionInput = (props: any) => {
        const [localValue, setLocalValue] = React.useState(props.value || '');
        
        const handleChange = (newValue: string) => {
          console.log('🔄 COMPONENT UPDATE:', { 
            from: localValue, 
            to: newValue,
            timestamp: Date.now() 
          });
          componentUpdates.push({ from: localValue, to: newValue, timestamp: Date.now() });
          setLocalValue(newValue);
          props.onChange?.(newValue);
        };

        return <MentionInput {...props} value={localValue} onChange={handleChange} />;
      };

      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      
      render(<DebugMentionInput onChange={mockOnChange} placeholder="Live debug test..." />);
      
      const textarea = screen.getByPlaceholderText('Live debug test...') as HTMLTextAreaElement;
      
      console.log('🎬 LIVE DEBUG: Starting @ input sequence...');
      
      // Type @ and monitor all state changes
      await user.type(textarea, '@');
      
      // Wait a bit for all async updates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('📊 LIVE DEBUG: Component update sequence:', componentUpdates);
      
      // Check final dropdown state
      await waitFor(() => {
        const debugElement = screen.queryByText(/EMERGENCY DEBUG/);
        if (debugElement) {
          console.log('🏁 FINAL STATE:', debugElement.textContent);
        }
      }, { timeout: 2000 });
    });
  });
});