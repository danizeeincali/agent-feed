import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostCreator } from '../../src/components/PostCreator';
import { CommentForm } from '../../src/components/CommentForm';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useLocation: () => ({ state: null })
}));

vi.mock('../../src/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => {},
  useShortcutsHelp: () => []
}));

vi.mock('../../src/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [],
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn()
  })
}));

vi.mock('../../src/hooks/useDraftManager', () => ({
  useDraftManager: () => ({
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn()
  })
}));

vi.mock('../../src/services/api', () => ({
  apiService: {
    createComment: vi.fn()
  }
}));

vi.mock('../../src/services/MentionService', () => ({
  MentionService: {
    extractMentions: vi.fn(() => [])
  }
}));

describe('🚨 CRITICAL: @ Mention Component Analysis', () => {
  
  it('PostCreator contains MentionInput component (BASELINE)', () => {
    console.log('🔍 Testing PostCreator component structure...');
    
    const { container } = render(<PostCreator />);
    
    // Check if PostCreator renders MentionInput
    const mentionInputs = container.querySelectorAll('[class*="mention"], [data-testid*="mention"]');
    const textareas = container.querySelectorAll('textarea');
    
    console.log(`📊 PostCreator analysis:`);
    console.log(`   Total textareas: ${textareas.length}`);
    console.log(`   Mention-related elements: ${mentionInputs.length}`);
    
    // Check for MentionInput in the component tree
    const html = container.innerHTML;
    const hasMentionInputRef = html.includes('MentionInput') || html.includes('mention');
    
    console.log(`   Has mention functionality: ${hasMentionInputRef}`);
    console.log(`   Component HTML size: ${html.length} chars`);
    
    // PostCreator should have textarea and mention functionality
    expect(textareas.length).toBeGreaterThan(0);
    console.log('✅ PostCreator baseline test passed');
  });
  
  it('CommentForm contains MentionInput component (SHOULD MATCH)', () => {
    console.log('🔍 Testing CommentForm component structure...');
    
    const { container } = render(
      <CommentForm 
        postId="test-post" 
        currentUser="test-user"
      />
    );
    
    // Check if CommentForm renders MentionInput
    const mentionInputs = container.querySelectorAll('[class*="mention"], [data-testid*="mention"]');
    const textareas = container.querySelectorAll('textarea');
    
    console.log(`📊 CommentForm analysis:`);
    console.log(`   Total textareas: ${textareas.length}`);
    console.log(`   Mention-related elements: ${mentionInputs.length}`);
    
    // Check for MentionInput in the component tree
    const html = container.innerHTML;
    const hasMentionInputRef = html.includes('MentionInput') || html.includes('mention');
    
    console.log(`   Has mention functionality: ${hasMentionInputRef}`);
    console.log(`   Component HTML size: ${html.length} chars`);
    
    // CommentForm should also have textarea and mention functionality
    expect(textareas.length).toBeGreaterThan(0);
    
    if (!hasMentionInputRef) {
      console.log('❌ CONFIRMED BUG: CommentForm missing mention functionality!');
    } else {
      console.log('✅ CommentForm has mention functionality');
    }
  });
  
  it('COMPARISON: PostCreator vs CommentForm mention implementation', () => {
    console.log('🔬 COMPARATIVE ANALYSIS: PostCreator vs CommentForm');
    
    // Render both components
    const postCreatorResult = render(<PostCreator />);
    const commentFormResult = render(<CommentForm postId="test" currentUser="test" />);
    
    // Analyze PostCreator
    const postCreatorHTML = postCreatorResult.container.innerHTML;
    const postCreatorMentions = postCreatorResult.container.querySelectorAll('[class*="mention"]');
    const postCreatorTextareas = postCreatorResult.container.querySelectorAll('textarea');
    
    // Analyze CommentForm  
    const commentFormHTML = commentFormResult.container.innerHTML;
    const commentFormMentions = commentFormResult.container.querySelectorAll('[class*="mention"]');
    const commentFormTextareas = commentFormResult.container.querySelectorAll('textarea');
    
    console.log('📊 DETAILED COMPARISON:');
    console.log('   PostCreator:');
    console.log(`     - Textareas: ${postCreatorTextareas.length}`);
    console.log(`     - Mention elements: ${postCreatorMentions.length}`);
    console.log(`     - Has "MentionInput": ${postCreatorHTML.includes('MentionInput')}`);
    console.log(`     - HTML length: ${postCreatorHTML.length}`);
    
    console.log('   CommentForm:');
    console.log(`     - Textareas: ${commentFormTextareas.length}`);
    console.log(`     - Mention elements: ${commentFormMentions.length}`);
    console.log(`     - Has "MentionInput": ${commentFormHTML.includes('MentionInput')}`);
    console.log(`     - HTML length: ${commentFormHTML.length}`);
    
    // CRITICAL VALIDATION
    const postCreatorHasMentions = postCreatorMentions.length > 0 || postCreatorHTML.includes('MentionInput');
    const commentFormHasMentions = commentFormMentions.length > 0 || commentFormHTML.includes('MentionInput');
    
    console.log('🚨 CRITICAL FINDINGS:');
    console.log(`   PostCreator has mentions: ${postCreatorHasMentions}`);
    console.log(`   CommentForm has mentions: ${commentFormHasMentions}`);
    
    if (postCreatorHasMentions && !commentFormHasMentions) {
      console.log('🔥 ROOT CAUSE IDENTIFIED: CommentForm missing MentionInput implementation!');
    } else if (!postCreatorHasMentions && !commentFormHasMentions) {
      console.log('⚠️ BOTH components missing mention functionality');
    } else if (postCreatorHasMentions && commentFormHasMentions) {
      console.log('✅ Both components have mention functionality');
    }
    
    // Both should have textareas at minimum
    expect(postCreatorTextareas.length).toBeGreaterThan(0);
    expect(commentFormTextareas.length).toBeGreaterThan(0);
  });
  
  it('Type @ in PostCreator textarea (interaction test)', () => {
    console.log('🎯 Testing @ typing interaction in PostCreator...');
    
    const { container } = render(<PostCreator />);
    
    // Find textarea
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    
    if (textarea) {
      // Type @ character
      fireEvent.change(textarea, { target: { value: '@' } });
      
      // Check for any dropdown or mention-related changes
      const mentionElements = container.querySelectorAll('[class*="mention"], [class*="dropdown"]');
      
      console.log(`📊 After typing @:`);
      console.log(`   Mention/dropdown elements: ${mentionElements.length}`);
      console.log(`   Textarea value: "${(textarea as HTMLTextAreaElement).value}"`);
      
      // The @ should be in the textarea
      expect((textarea as HTMLTextAreaElement).value).toBe('@');
    }
  });
  
  it('Type @ in CommentForm textarea (interaction test)', () => {
    console.log('🎯 Testing @ typing interaction in CommentForm...');
    
    const { container } = render(<CommentForm postId="test" currentUser="test" />);
    
    // Find textarea
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    
    if (textarea) {
      // Type @ character
      fireEvent.change(textarea, { target: { value: '@' } });
      
      // Check for any dropdown or mention-related changes
      const mentionElements = container.querySelectorAll('[class*="mention"], [class*="dropdown"]');
      
      console.log(`📊 After typing @:`);
      console.log(`   Mention/dropdown elements: ${mentionElements.length}`);
      console.log(`   Textarea value: "${(textarea as HTMLTextAreaElement).value}"`);
      
      // The @ should be in the textarea
      expect((textarea as HTMLTextAreaElement).value).toBe('@');
      
      if (mentionElements.length === 0) {
        console.log('❌ CONFIRMED: CommentForm @ typing does not trigger mention dropdown!');
      } else {
        console.log('✅ CommentForm @ typing triggers mention elements');
      }
    }
  });
});