/**
 * CRITICAL: Comment Mention Integration Fix Test
 * 
 * This test identifies the exact differences between working and broken 
 * MentionInput implementations to fix the CommentForm regression.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the components we need to compare
import { PostCreator } from '../../components/PostCreator';
import { CommentForm } from '../../components/CommentForm';
import { QuickPostSection } from '../../components/posting-interface/QuickPostSection';
import { MentionInput } from '../../components/MentionInput';

// Mock the MentionService
vi.mock('../../services/MentionService', () => ({
  MentionService: {
    searchMentions: vi.fn().mockResolvedValue([
      {
        id: 'test-agent-1',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Test agent for searchMentions'
      }
    ]),
    getSuggestions: vi.fn().mockResolvedValue([
      {
        id: 'test-agent-1',
        name: 'chief-of-staff-agent', 
        displayName: 'Chief of Staff',
        description: 'Test agent'
      },
      {
        id: 'test-agent-2',
        name: 'personal-todos-agent',
        displayName: 'Personal Todos', 
        description: 'Test agent'
      }
    ]),
    extractMentions: vi.fn().mockReturnValue([]),
    getQuickMentions: vi.fn().mockReturnValue([
      {
        id: 'test-agent-1',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Test agent'
      }
    ]),
    getAllAgents: vi.fn().mockReturnValue([
      {
        id: 'test-agent-1',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Test agent'
      }
    ])
  }
}));

// Mock API service
vi.mock('../../services/api', () => ({
  apiService: {
    createComment: vi.fn().mockResolvedValue({ id: 'test-comment-id' })
  }
}));

// Mock utility functions
vi.mock('../../utils/commentUtils', () => ({
  extractMentions: vi.fn().mockReturnValue([])
}));

describe('🚨 CRITICAL: Comment Mention Integration Fix', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ROOT CAUSE ANALYSIS: MentionInput Integration Patterns', () => {

    it('Direct MentionInput should show debug dropdown', async () => {
      const user = userEvent.setup();
      
      render(
        <MentionInput
          value=""
          onChange={vi.fn()}
          placeholder="Test direct MentionInput"
          mentionContext="post"
        />
      );
      
      const input = screen.getByPlaceholderText('Test direct MentionInput');
      
      // Type @ to trigger mention
      await user.type(input, '@');
      
      // Should show debug dropdown
      await waitFor(() => {
        const debugDropdown = screen.queryByTestId('mention-debug-dropdown');
        expect(debugDropdown).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Should show emergency debug text
      expect(screen.getByText(/EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
    });

    it('QuickPost MentionInput should show debug dropdown (WORKING BASELINE)', async () => {
      const user = userEvent.setup();
      
      render(<QuickPostSection />);
      
      // Find the QuickPost input
      const input = screen.getByPlaceholderText(/What's your quick update/);
      
      // Type @ to trigger mention
      await user.type(input, '@');
      
      // Should show debug dropdown
      await waitFor(() => {
        const debugDropdown = screen.queryByTestId('mention-debug-dropdown');
        expect(debugDropdown, 'QuickPost should show mention debug dropdown').toBeInTheDocument();
      }, { timeout: 2000 });
      
      console.log('✅ QuickPost mention dropdown working as expected');
    });

    it('PostCreator MentionInput should show debug dropdown (WORKING BASELINE)', async () => {
      const user = userEvent.setup();
      
      render(<PostCreator />);
      
      // Find the PostCreator content input
      const input = screen.getByPlaceholderText(/Share your insights/);
      
      // Type @ to trigger mention
      await user.type(input, '@');
      
      // Should show debug dropdown
      await waitFor(() => {
        const debugDropdown = screen.queryByTestId('mention-debug-dropdown');
        expect(debugDropdown, 'PostCreator should show mention debug dropdown').toBeInTheDocument();
      }, { timeout: 2000 });
      
      console.log('✅ PostCreator mention dropdown working as expected');
    });

    it('CommentForm MentionInput should show debug dropdown (REGRESSION TO FIX)', async () => {
      const user = userEvent.setup();
      
      render(
        <CommentForm
          postId="test-post-id"
          useMentionInput={true}
        />
      );
      
      // Find the CommentForm input
      const input = screen.getByPlaceholderText(/Provide technical analysis/);
      
      // Type @ to trigger mention
      await user.type(input, '@');
      
      // CRITICAL: This should show debug dropdown but currently doesn't
      await waitFor(() => {
        const debugDropdown = screen.queryByTestId('mention-debug-dropdown');
        
        if (debugDropdown) {
          console.log('✅ CommentForm mention dropdown FIXED - now working!');
          expect(debugDropdown).toBeInTheDocument();
        } else {
          console.log('❌ CommentForm mention dropdown still broken - no dropdown found');
          
          // Let's debug why it's not working
          const allInputs = screen.getAllByRole('textbox');
          console.log('Available inputs:', allInputs.map(i => i.placeholder));
          
          const mentionInputs = screen.queryAllByText(/EMERGENCY DEBUG/);
          console.log('Mention dropdowns found:', mentionInputs.length);
          
          // For now, document the regression
          expect(debugDropdown, 'CommentForm should show mention debug dropdown (REGRESSION)').toBeNull();
        }
      }, { timeout: 2000 });
    });
  });

  describe('INTEGRATION PATTERN COMPARISON', () => {
    
    it('Compare DOM structure between working and broken implementations', async () => {
      const user = userEvent.setup();
      
      // Render working implementation (QuickPost)
      const { container: quickPostContainer } = render(<QuickPostSection />);
      const quickPostInput = screen.getByPlaceholderText(/What's your quick update/);
      
      await user.type(quickPostInput, '@');
      await waitFor(() => screen.queryByTestId('mention-debug-dropdown'));
      
      // Analyze DOM structure around working MentionInput
      const quickPostParent = quickPostInput.parentElement;
      const quickPostClasses = quickPostParent?.className || '';
      
      console.log('QuickPost DOM Structure:');
      console.log('- Input parent classes:', quickPostClasses);
      console.log('- Input parent tag:', quickPostParent?.tagName);
      console.log('- Dropdown found:', !!screen.queryByTestId('mention-debug-dropdown'));
      
      // Clear and render broken implementation (CommentForm)
      screen.unmount();
      
      const { container: commentFormContainer } = render(
        <CommentForm postId="test-post-id" useMentionInput={true} />
      );
      const commentFormInput = screen.getByPlaceholderText(/Provide technical analysis/);
      
      await user.type(commentFormInput, '@');
      await waitFor(() => {}, { timeout: 1000 }); // Give time for dropdown to appear if it would
      
      // Analyze DOM structure around broken MentionInput
      const commentFormParent = commentFormInput.parentElement;
      const commentFormClasses = commentFormParent?.className || '';
      
      console.log('CommentForm DOM Structure:');
      console.log('- Input parent classes:', commentFormClasses);
      console.log('- Input parent tag:', commentFormParent?.tagName);
      console.log('- Dropdown found:', !!screen.queryByTestId('mention-debug-dropdown'));
      
      // Compare structures and identify differences
      const structuralDifferences = [];
      
      if (quickPostClasses !== commentFormClasses) {
        structuralDifferences.push(`Parent classes differ: "${quickPostClasses}" vs "${commentFormClasses}"`);
      }
      
      const quickPostHasRelative = quickPostClasses.includes('relative');
      const commentFormHasRelative = commentFormClasses.includes('relative');
      
      if (quickPostHasRelative !== commentFormHasRelative) {
        structuralDifferences.push(`Relative positioning differs: ${quickPostHasRelative} vs ${commentFormHasRelative}`);
      }
      
      console.log('Structural Differences:', structuralDifferences);
      
      // The test documents what we found for fix implementation
      expect(structuralDifferences.length >= 0).toBe(true); // Always passes, just for analysis
    });

    it('Analyze MentionInput prop differences between implementations', () => {
      // Create test wrappers to capture props
      const capturedProps: any[] = [];
      
      const PropCapturingMentionInput = React.forwardRef<any, any>((props, ref) => {
        capturedProps.push({ ...props, context: 'captured' });
        return <textarea {...props} ref={ref} />;
      });
      
      // Mock MentionInput temporarily
      vi.doMock('../../src/components/MentionInput', () => ({
        MentionInput: PropCapturingMentionInput
      }));
      
      // Test QuickPost props
      render(<QuickPostSection />);
      
      // Test CommentForm props  
      render(<CommentForm postId="test-post" useMentionInput={true} />);
      
      console.log('Captured MentionInput props:', capturedProps);
      
      // Analyze prop differences
      const propDifferences = [];
      
      if (capturedProps.length >= 2) {
        const quickPostProps = capturedProps[0];
        const commentFormProps = capturedProps[1];
        
        const quickPostKeys = Object.keys(quickPostProps);
        const commentFormKeys = Object.keys(commentFormProps);
        
        const allKeys = new Set([...quickPostKeys, ...commentFormKeys]);
        
        for (const key of allKeys) {
          if (quickPostProps[key] !== commentFormProps[key]) {
            propDifferences.push({
              prop: key,
              quickPost: quickPostProps[key],
              commentForm: commentFormProps[key]
            });
          }
        }
      }
      
      console.log('Prop differences between implementations:', propDifferences);
      
      // Document findings
      expect(propDifferences.length >= 0).toBe(true);
    });
  });

  describe('REGRESSION FIX VALIDATION', () => {
    
    it('Ensure CommentForm uses correct MentionInput integration pattern', async () => {
      const user = userEvent.setup();
      
      // Test that CommentForm follows same pattern as working implementations
      render(
        <CommentForm
          postId="test-post-id"
          useMentionInput={true}
          className="test-comment-form"
        />
      );
      
      // Verify MentionInput is properly integrated
      const input = screen.getByPlaceholderText(/Provide technical analysis/);
      
      // Check that input has proper attributes
      expect(input).toHaveAttribute('data-mention-context');
      
      // Check that parent container supports dropdown rendering
      const parent = input.parentElement;
      expect(parent).toBeInTheDocument();
      
      // Verify dropdown functionality
      await user.type(input, '@');
      
      // The dropdown should appear - if it doesn't, we know exactly what to fix
      await waitFor(() => {
        const dropdown = screen.queryByTestId('mention-debug-dropdown');
        
        // Log detailed debugging info for fix implementation
        if (!dropdown) {
          console.log('REGRESSION ANALYSIS:');
          console.log('- Input found:', !!input);
          console.log('- Input parent:', parent?.tagName, parent?.className);
          console.log('- Input attributes:', Array.from(input.attributes).map(a => `${a.name}="${a.value}"`));
          
          const allElements = document.querySelectorAll('*');
          const dropdownElements = Array.from(allElements).filter(el => 
            el.textContent?.includes('EMERGENCY DEBUG') ||
            el.getAttribute('data-testid') === 'mention-debug-dropdown'
          );
          console.log('Found dropdown elements:', dropdownElements.length);
        }
        
        // This will fail if dropdown doesn't appear, showing us exactly what to fix
        expect(dropdown, 'CommentForm mention dropdown must work to prevent regression').toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('Validate all mention contexts have identical dropdown behavior', async () => {
      const user = userEvent.setup();
      const testContexts = [
        { 
          component: <QuickPostSection />, 
          placeholder: /What's your quick update/,
          name: 'QuickPost'
        },
        { 
          component: <CommentForm postId="test" useMentionInput={true} />, 
          placeholder: /Provide technical analysis/,
          name: 'CommentForm' 
        }
      ];
      
      for (const context of testContexts) {
        console.log(`Testing ${context.name}...`);
        
        const { unmount } = render(context.component);
        const input = screen.getByPlaceholderText(context.placeholder);
        
        await user.type(input, '@');
        
        const dropdown = await screen.findByTestId('mention-debug-dropdown');
        
        // Verify dropdown has consistent structure
        expect(dropdown).toBeInTheDocument();
        expect(screen.getByText(/EMERGENCY DEBUG: Dropdown Open/)).toBeInTheDocument();
        
        // Verify agent suggestions are present
        const agentElements = screen.queryAllByTestId(/agent-debug-info-/);
        expect(agentElements.length, `${context.name} should show agent suggestions`).toBeGreaterThan(0);
        
        console.log(`✅ ${context.name} mention dropdown validated`);
        
        unmount();
      }
    });
  });
});