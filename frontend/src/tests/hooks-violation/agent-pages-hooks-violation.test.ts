/**
 * TDD London School: Emergency Hooks Violation Detection Test
 * Target: AgentPagesTab persistent "Rendered more hooks than during the previous render" error
 * 
 * FOCUSED TEST: Expose the exact hooks violation occurring when Pages tab is clicked
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Create a minimal mock for AgentPagesTab to isolate the hooks issue
const MockAgentPagesTab = ({ agent }: { agent: any }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // This is the CRITICAL LINE causing the violation
  // useDebounced is called, but the import/usage might be conditional
  const { useDebounced } = await import('../../../hooks/useDebounced');
  const debouncedSearchTerm = useDebounced(searchTerm, 300);
  
  return (
    <div data-testid="agent-pages-tab">
      <input 
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <div data-testid="debounced-value">{debouncedSearchTerm}</div>
    </div>
  );
};

describe('AgentPagesTab Hooks Violation - Minimal Test', () => {
  let hookCallCounts: number[] = [];
  let renderCount = 0;

  beforeEach(() => {
    hookCallCounts = [];
    renderCount = 0;
    vi.clearAllMocks();
  });

  it('FAIL: Detects hooks violation with dynamic import', async () => {
    console.log('=== TESTING DYNAMIC IMPORT HOOKS VIOLATION ===');
    
    const mockAgent = { id: 'test', name: 'Test Agent' };
    
    try {
      // This should fail if hooks are called conditionally due to dynamic import
      const { rerender } = render(<MockAgentPagesTab agent={mockAgent} />);
      console.log('First render successful');
      
      rerender(<MockAgentPagesTab agent={mockAgent} />);
      console.log('Second render successful - NO VIOLATION DETECTED');
      
      expect(true).toBe(false); // Force failure - we expected a violation
    } catch (error: any) {
      console.log('HOOKS VIOLATION DETECTED:', error.message);
      
      // Check if it's the expected hooks violation
      if (error.message.includes('Rendered more hooks') || 
          error.message.includes('hooks than during the previous render')) {
        console.log('✓ Successfully exposed the hooks violation!');
        expect(error.message).toContain('hooks');
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
  });

  it('FAIL: Detects conditional hooks execution', () => {
    console.log('=== TESTING CONDITIONAL HOOKS ===');
    
    // Create a component that conditionally calls hooks
    const ConditionalHooksComponent = ({ shouldUseHook }: { shouldUseHook: boolean }) => {
      const [state1] = React.useState('always');
      
      // VIOLATION: Conditional hook usage
      if (shouldUseHook) {
        const [state2] = React.useState('conditional');
        return <div>{state1} - {state2}</div>;
      }
      
      return <div>{state1}</div>;
    };
    
    try {
      const { rerender } = render(<ConditionalHooksComponent shouldUseHook={true} />);
      console.log('First render with hook: success');
      
      // This should cause hooks violation - fewer hooks on second render
      rerender(<ConditionalHooksComponent shouldUseHook={false} />);
      console.log('Second render without hook: success - NO VIOLATION?');
      
      expect(true).toBe(false); // Force failure
    } catch (error: any) {
      console.log('HOOKS VIOLATION DETECTED:', error.message);
      expect(error.message).toContain('hooks');
    }
  });
});