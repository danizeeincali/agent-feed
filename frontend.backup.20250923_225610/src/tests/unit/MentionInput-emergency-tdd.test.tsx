/**
 * 🚨 EMERGENCY TDD TEST SUITE FOR MENTIONINPUT REACT COMPONENT BUG
 * 
 * DISCOVERY: MentionService works perfectly (all tests pass)
 * BUG LOCATION: React component integration - useEffect suggestion fetching
 * 
 * Evidence: "Query: '' | MentionQuery: {"query":"","startIndex":0} | Suggestions: 0"
 * Root Cause: MentionInput component not properly calling MentionService or handling async results
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { MentionInput } from '../../components/MentionInput';
import { MentionService } from '../../services/MentionService';

// Mock console methods to reduce noise during testing
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Mock console to avoid spam during tests
  console.log = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('🚨 EMERGENCY TDD: MentionInput Component Bug', () => {
  beforeEach(() => {
    // Clear any cached data before each test
    MentionService.clearCache();
  });

  describe('CRITICAL BUG: @ Mention Detection vs Suggestion Loading', () => {
    test('❌ FAILING TEST: Should show suggestions when user types @', async () => {
      console.log('🧪 TDD TEST: Testing @ mention detection and suggestion loading');
      
      const mockOnChange = vi.fn();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          placeholder="Type @ to mention agents..."
        />
      );
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      
      // SIMULATE USER TYPING @
      console.log('🧪 TDD: Simulating user typing @');
      
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });
      
      // Wait for debouncing and async effects
      await waitFor(
        async () => {
          const dropdown = screen.queryByRole('listbox');
          console.log('🧪 TDD: Dropdown found:', !!dropdown);
          
          if (dropdown) {
            const options = screen.queryAllByRole('option');
            console.log('🧪 TDD: Options found:', options.length);
            
            // This should show suggestions, but currently shows 0
            expect(dropdown).toBeInTheDocument();
            expect(options.length).toBeGreaterThan(0); // 🚨 THIS WILL FAIL
          } else {
            throw new Error('Dropdown not found');
          }
        },
        { timeout: 2000 }
      );
    });

    test('❌ FAILING TEST: Should call MentionService.searchMentions with empty string', async () => {
      console.log('🧪 TDD TEST: Testing if component calls MentionService correctly');
      
      // Spy on MentionService methods
      const searchMentionsSpy = vi.spyOn(MentionService, 'searchMentions');
      const getQuickMentionsSpy = vi.spyOn(MentionService, 'getQuickMentions');
      const getAllAgentsSpy = vi.spyOn(MentionService, 'getAllAgents');
      
      const mockOnChange = vi.fn();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          placeholder="Type @ to mention agents..."
        />
      );
      
      const textarea = screen.getByRole('textbox');
      
      // SIMULATE USER TYPING @
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });
      
      // Wait for effects to trigger
      await waitFor(async () => {
        // The component should call one of these methods
        const totalCalls = 
          searchMentionsSpy.mock.calls.length +
          getQuickMentionsSpy.mock.calls.length +
          getAllAgentsSpy.mock.calls.length;
        
        console.log('🧪 TDD: Service method calls:', {
          searchMentions: searchMentionsSpy.mock.calls.length,
          getQuickMentions: getQuickMentionsSpy.mock.calls.length,
          getAllAgents: getAllAgentsSpy.mock.calls.length,
          totalCalls
        });
        
        expect(totalCalls).toBeGreaterThan(0); // 🚨 THIS MIGHT FAIL
      }, { timeout: 2000 });
      
      // Check what the component actually called
      if (searchMentionsSpy.mock.calls.length > 0) {
        console.log('🧪 TDD: searchMentions called with:', searchMentionsSpy.mock.calls);
        const lastCall = searchMentionsSpy.mock.calls[searchMentionsSpy.mock.calls.length - 1];
        expect(lastCall[0]).toBe(''); // Should call with empty string for @ 
      }
      
      // Cleanup
      searchMentionsSpy.mockRestore();
      getQuickMentionsSpy.mockRestore();
      getAllAgentsSpy.mockRestore();
    });

    test('🔍 DEBUG TEST: Analyze component state during @ typing', async () => {
      console.log('🧪 TDD DEBUG: Analyzing component state during @ typing');
      
      let componentProps: any = {};
      
      const TestWrapper = () => {
        const [value, setValue] = React.useState('');
        
        componentProps.value = value;
        
        return (
          <MentionInput
            value={value}
            onChange={(newValue) => {
              console.log('🧪 TDD: onChange called with:', newValue);
              setValue(newValue);
              componentProps.value = newValue;
            }}
            placeholder="Type @ to mention agents..."
          />
        );
      };
      
      render(<TestWrapper />);
      
      const textarea = screen.getByRole('textbox');
      
      // Step 1: Type @
      console.log('🧪 TDD: Step 1 - Typing @');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });
      
      console.log('🧪 TDD: After @, component value:', componentProps.value);
      
      // Step 2: Wait and check for dropdown
      console.log('🧪 TDD: Step 2 - Waiting for dropdown');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for debounce
      
      const dropdown = screen.queryByRole('listbox');
      console.log('🧪 TDD: Dropdown present after delay:', !!dropdown);
      
      if (dropdown) {
        const debugText = dropdown.textContent;
        console.log('🧪 TDD: Dropdown content:', debugText);
        
        // Look for our debug text
        expect(dropdown).toBeInTheDocument();
        expect(debugText).toContain('EMERGENCY DEBUG');
        
        // Parse the debug info
        const suggestionsMatch = debugText?.match(/Suggestions: (\d+)/);
        const suggestionsCount = suggestionsMatch ? parseInt(suggestionsMatch[1]) : -1;
        
        console.log('🧪 TDD: Suggestions count from debug:', suggestionsCount);
        expect(suggestionsCount).toBeGreaterThan(0); // 🚨 THIS WILL LIKELY FAIL
      }
    });

    test('🔍 DEBUG TEST: Direct MentionService call vs Component integration', async () => {
      console.log('🧪 TDD DEBUG: Comparing direct service call vs component');
      
      // Direct service call (we know this works)
      const directResult = await MentionService.searchMentions('');
      console.log('🧪 TDD: Direct MentionService.searchMentions(""):', directResult.length);
      
      const quickResult = MentionService.getQuickMentions('post');
      console.log('🧪 TDD: Direct MentionService.getQuickMentions("post"):', quickResult.length);
      
      // Both should return agents
      expect(directResult.length).toBeGreaterThan(0);
      expect(quickResult.length).toBeGreaterThan(0);
      
      // Now test component integration
      const mockOnChange = vi.fn();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          placeholder="Type @ to mention agents..."
        />
      );
      
      const textarea = screen.getByRole('textbox');
      
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });
      
      // Wait longer for component to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dropdown = screen.queryByRole('listbox');
      console.log('🧪 TDD: Component dropdown found:', !!dropdown);
      
      if (dropdown) {
        const options = screen.queryAllByRole('option');
        console.log('🧪 TDD: Component options found:', options.length);
        console.log('🧪 TDD: Dropdown debug content:', dropdown.textContent);
        
        // Compare: Direct service works, component might not
        expect(directResult.length).toBeGreaterThan(0); // ✅ This passes
        expect(options.length).toEqual(directResult.length); // 🚨 This might fail
      } else {
        console.error('🚨 TDD ERROR: Component dropdown not found, but service works!');
        expect(dropdown).toBeInTheDocument(); // This will fail and show the issue
      }
    });
  });

  describe('CRITICAL BUG: useEffect Dependencies and Async Handling', () => {
    test('🔍 DEBUG TEST: useEffect dependency array analysis', async () => {
      console.log('🧪 TDD DEBUG: Testing useEffect behavior with different dependencies');
      
      const mockOnChange = vi.fn();
      
      const { rerender } = render(
        <MentionInput
          value="@"
          onChange={mockOnChange}
          placeholder="Type @ to mention agents..."
        />
      );
      
      // Wait for initial render effects
      await new Promise(resolve => setTimeout(resolve, 300));
      
      let dropdown = screen.queryByRole('listbox');
      console.log('🧪 TDD: Initial dropdown:', !!dropdown);
      
      // Re-render with same value to test effect re-triggering
      rerender(
        <MentionInput
          value="@"
          onChange={mockOnChange}
          placeholder="Type @ to mention agents..."
        />
      );
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      dropdown = screen.queryByRole('listbox');
      console.log('🧪 TDD: After re-render dropdown:', !!dropdown);
      
      // The dropdown should appear on both renders
      expect(dropdown).toBeInTheDocument();
    });

    test('❌ FAILING TEST: Component should handle async MentionService calls', async () => {
      console.log('🧪 TDD TEST: Testing async handling in component');
      
      // Create a slow version of searchMentions to test async handling
      const originalSearchMentions = MentionService.searchMentions;
      
      // Mock with delay to simulate async behavior
      const mockSearchMentions = vi.fn().mockImplementation(async (query: string) => {
        console.log('🧪 TDD: Mock searchMentions called with:', query);
        await new Promise(resolve => setTimeout(resolve, 100));
        return originalSearchMentions.call(MentionService, query);
      });
      
      MentionService.searchMentions = mockSearchMentions;
      
      const mockOnChange = vi.fn();
      
      render(
        <MentionInput
          value=""
          onChange={mockOnChange}
          placeholder="Type @ to mention agents..."
        />
      );
      
      const textarea = screen.getByRole('textbox');
      
      await act(async () => {
        fireEvent.change(textarea, { target: { value: '@' } });
      });
      
      // Should show loading state first
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox');
        if (dropdown) {
          expect(dropdown.textContent).toContain('Loading agents...');
        }
      });
      
      // Then should show results
      await waitFor(() => {
        const dropdown = screen.queryByRole('listbox');
        const options = screen.queryAllByRole('option');
        
        console.log('🧪 TDD: Final async state - dropdown:', !!dropdown, 'options:', options.length);
        
        expect(dropdown).toBeInTheDocument();
        expect(options.length).toBeGreaterThan(0); // 🚨 THIS MIGHT FAIL
      }, { timeout: 2000 });
      
      // Verify mock was called correctly
      expect(mockSearchMentions).toHaveBeenCalledWith('');
      
      // Restore
      MentionService.searchMentions = originalSearchMentions;
    });
  });
});

/**
 * 🚨 EMERGENCY TDD SUMMARY - COMPONENT LEVEL
 * 
 * HYPOTHESIS: MentionService works, React component integration broken
 * 
 * EXPECTED FAILURES:
 * 1. Component shows 0 suggestions despite service returning agents
 * 2. useEffect might not be triggering properly
 * 3. Async handling might be broken
 * 4. Component might not call MentionService methods correctly
 * 
 * ROOT CAUSE CANDIDATES:
 * 1. useEffect dependency array missing critical dependencies
 * 2. debouncedQuery not triggering service calls properly
 * 3. isDropdownOpen condition preventing service calls
 * 4. Async/await handling in useEffect broken
 * 5. State updates not triggering properly
 * 
 * INVESTIGATION TARGETS:
 * - Line 249-387 in MentionInput.tsx (useEffect for fetching suggestions)
 * - debouncedQuery behavior with empty strings
 * - isDropdownOpen state management
 * - setSuggestions state updates
 */