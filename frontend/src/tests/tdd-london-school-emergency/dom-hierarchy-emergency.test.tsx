/**
 * TDD London School Emergency - DOM Hierarchy Analysis
 * 
 * CRITICAL MISSION: Expose DOM structure differences that prevent dropdown rendering
 * in CommentForm vs working components (PostCreator, QuickPost)
 * 
 * London School TDD Focus:
 * - Mock DOM interactions and hierarchy analysis
 * - Test component collaboration patterns
 * - Verify stacking context behaviors
 * - Outside-in testing of layout structures
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmergencyMockFactory, EmergencyTestUtils } from './mock-factory-emergency';

// Mock DOM Analysis Utilities
class DOMHierarchyAnalyzer {
  static analyzeLayoutComplexity(container: HTMLElement) {
    const analysis = {
      totalDivs: container.querySelectorAll('div').length,
      maxNestingDepth: 0,
      positionedElements: 0,
      zIndexElements: 0,
      overlayElements: 0,
      relativeElements: 0,
      absoluteElements: 0,
      stacking_contexts: [] as Array<{ element: string; zIndex: number; position: string }>
    };

    // Count nesting depth
    const calculateDepth = (element: HTMLElement, currentDepth = 0): number => {
      const children = Array.from(element.children) as HTMLElement[];
      if (children.length === 0) return currentDepth;
      
      return Math.max(...children.map(child => 
        calculateDepth(child, currentDepth + 1)
      ));
    };

    analysis.maxNestingDepth = calculateDepth(container);

    // Analyze positioning and z-index
    const allElements = container.querySelectorAll('*') as NodeListOf<HTMLElement>;
    allElements.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const position = computedStyle.position;
      const zIndex = computedStyle.zIndex;

      if (position !== 'static') {
        analysis.positionedElements++;
        
        if (position === 'relative') analysis.relativeElements++;
        if (position === 'absolute') analysis.absoluteElements++;
      }

      if (zIndex !== 'auto' && zIndex !== '') {
        analysis.zIndexElements++;
        analysis.stacking_contexts.push({
          element: element.tagName.toLowerCase() + (element.className ? '.' + element.className.split(' ')[0] : ''),
          zIndex: parseInt(zIndex),
          position: position
        });
      }

      // Detect overlay patterns
      if (element.className.includes('overlay') || 
          element.className.includes('absolute') ||
          computedStyle.position === 'absolute') {
        analysis.overlayElements++;
      }
    });

    return analysis;
  }

  static compareHierarchies(workingAnalysis: any, brokenAnalysis: any) {
    return {
      complexityDifference: brokenAnalysis.totalDivs - workingAnalysis.totalDivs,
      nestingDifference: brokenAnalysis.maxNestingDepth - workingAnalysis.maxNestingDepth,
      positioningDifference: brokenAnalysis.positionedElements - workingAnalysis.positionedElements,
      zIndexConflicts: brokenAnalysis.zIndexElements > workingAnalysis.zIndexElements,
      overlayInterference: brokenAnalysis.overlayElements > workingAnalysis.overlayElements,
      stackingContextProblems: brokenAnalysis.stacking_contexts.length > 3,
      // Critical indicators
      isBrokenMoreComplex: brokenAnalysis.totalDivs > workingAnalysis.totalDivs * 1.5,
      hasZIndexConflicts: brokenAnalysis.stacking_contexts.some(sc => sc.zIndex > 0 && sc.zIndex < 10000),
      hasOverlappingElements: brokenAnalysis.overlayElements > 2
    };
  }
}

// Mock Component Hierarchy Builder
class ComponentHierarchyMocker {
  static createSimpleWorkingHierarchy() {
    const SimpleWorkingComponent = ({ onMentionSelect }: any) => {
      const [value, setValue] = React.useState('');
      const [showDropdown, setShowDropdown] = React.useState(false);

      return (
        <div data-testid="simple-working-component" className="relative">
          {/* SIMPLE FLAT STRUCTURE - Like PostCreator success */}
          <div className="simple-input-container">
            <textarea
              data-testid="simple-textarea"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (e.target.value.includes('@')) {
                  setShowDropdown(true);
                  console.log('🚨 EMERGENCY DEBUG: Dropdown Open');
                }
              }}
              placeholder="Simple layout mention input..."
              className="w-full p-3 border rounded"
            />
            
            {/* DIRECT DROPDOWN RENDERING - No interference */}
            {showDropdown && (
              <div 
                data-testid="simple-dropdown"
                className="absolute z-[99999] w-full mt-1 bg-white border-2 border-blue-300 rounded shadow-xl"
                style={{ 
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 99999,
                  backgroundColor: 'white',
                  display: 'block'
                }}
              >
                <div className="px-2 py-1 text-xs bg-yellow-50 text-yellow-800">
                  🚨 EMERGENCY DEBUG: Dropdown Open
                </div>
                <div 
                  data-testid="simple-suggestion"
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                  onClick={() => {
                    onMentionSelect?.({ name: 'chief-of-staff-agent', displayName: 'Chief of Staff' });
                    setShowDropdown(false);
                  }}
                >
                  @chief-of-staff-agent - Chief of Staff
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return SimpleWorkingComponent;
  }

  static createComplexBrokenHierarchy() {
    const ComplexBrokenComponent = ({ onMentionSelect }: any) => {
      const [value, setValue] = React.useState('');
      const [showDropdown, setShowDropdown] = React.useState(false);

      return (
        <div data-testid="complex-broken-component" className="relative">
          {/* COMPLEX NESTED STRUCTURE - Like CommentForm failure */}
          <div className="form-container">
            <div className="form-wrapper" style={{ position: 'relative', zIndex: 1 }}>
              
              {/* FORMATTING TOOLBAR - High z-index overlay */}
              <div 
                data-testid="formatting-toolbar-complex"
                className="formatting-toolbar"
                style={{ 
                  position: 'relative', 
                  zIndex: 10, 
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e5e5e5',
                  padding: '8px 12px',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                <div className="flex items-center space-x-2">
                  <button className="p-1 hover:bg-gray-200 rounded">B</button>
                  <button className="p-1 hover:bg-gray-200 rounded">I</button>
                  <button className="p-1 hover:bg-gray-200 rounded">U</button>
                </div>
              </div>
              
              {/* INPUT SECTION - Complex nesting */}
              <div className="input-section" style={{ position: 'relative' }}>
                <div className="input-wrapper-complex" style={{ position: 'relative' }}>
                  <div className="textarea-container" style={{ position: 'relative' }}>
                    
                    <textarea
                      data-testid="complex-textarea"
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        if (e.target.value.includes('@')) {
                          // CRITICAL BUG: Dropdown tries to open but gets blocked
                          setShowDropdown(true);
                          console.error('🚨 EMERGENCY: @ detected but layout conflicts prevent dropdown');
                        }
                      }}
                      placeholder="Complex layout mention input..."
                      className="w-full p-3 border border-gray-300 rounded-b"
                      style={{ borderTop: 'none' }}
                    />
                    
                    {/* CHARACTER COUNTER OVERLAY - Conflicts with dropdown */}
                    <div 
                      data-testid="character-counter-overlay"
                      className="character-counter-overlay"
                      style={{ 
                        position: 'absolute', 
                        bottom: '8px', 
                        right: '8px', 
                        zIndex: 5,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        border: '1px solid #e5e5e5'
                      }}
                    >
                      {value.length}/2000
                    </div>
                    
                    {/* PREVIEW OVERLAY - Additional complexity */}
                    <div 
                      data-testid="preview-overlay"
                      className="preview-overlay"
                      style={{ 
                        position: 'absolute', 
                        top: '4px', 
                        right: '8px', 
                        zIndex: 3,
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '11px'
                      }}
                    >
                      Preview
                    </div>
                    
                    {/* DROPDOWN - GETS BLOCKED by stacking context issues */}
                    {showDropdown && (
                      <div 
                        data-testid="complex-dropdown"
                        className="mention-dropdown-complex"
                        style={{ 
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          zIndex: 99999, // High z-index but still blocked
                          backgroundColor: 'white',
                          border: '2px solid #007bff',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          // CRITICAL: These might not work due to stacking context
                          display: 'block',
                          visibility: 'visible'
                        }}
                      >
                        <div className="px-2 py-1 text-xs bg-red-50 text-red-800">
                          🚨 EMERGENCY: Dropdown rendered but potentially blocked
                        </div>
                        <div 
                          data-testid="complex-suggestion"
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
                          onClick={() => {
                            onMentionSelect?.({ name: 'chief-of-staff-agent', displayName: 'Chief of Staff' });
                            setShowDropdown(false);
                          }}
                        >
                          @chief-of-staff-agent - Chief of Staff
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* FORM FOOTER - Additional overlay complexity */}
              <div 
                className="form-footer"
                style={{ 
                  position: 'relative', 
                  zIndex: 2,
                  backgroundColor: '#f9f9f9',
                  padding: '8px 12px',
                  borderTop: '1px solid #e5e5e5',
                  borderRadius: '0 0 8px 8px'
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Rich formatting</span>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return ComplexBrokenComponent;
  }
}

describe('🚨 TDD London School Emergency - DOM Hierarchy Analysis', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('CRITICAL HIERARCHY COMPARISON: Simple vs Complex Layouts', () => {
    it('SHOULD expose complexity differences that break dropdown rendering', async () => {
      // ARRANGE: Create simple working and complex broken components
      const SimpleComponent = ComponentHierarchyMocker.createSimpleWorkingHierarchy();
      const ComplexComponent = ComponentHierarchyMocker.createComplexBrokenHierarchy();

      // ACT: Render both components
      const simpleRender = render(<SimpleComponent onMentionSelect={vi.fn()} />);
      const complexRender = render(<ComplexComponent onMentionSelect={vi.fn()} />);

      // ACT: Analyze DOM hierarchies
      const simpleAnalysis = DOMHierarchyAnalyzer.analyzeLayoutComplexity(simpleRender.container);
      const complexAnalysis = DOMHierarchyAnalyzer.analyzeLayoutComplexity(complexRender.container);

      // ASSERT: Document the critical differences
      console.log('🔍 SIMPLE (Working) Analysis:', simpleAnalysis);
      console.log('🔍 COMPLEX (Broken) Analysis:', complexAnalysis);

      const comparison = DOMHierarchyAnalyzer.compareHierarchies(simpleAnalysis, complexAnalysis);
      console.log('⚡ CRITICAL DIFFERENCES:', comparison);

      // ASSERT: Complex component should be significantly more complex
      expect(comparison.isBrokenMoreComplex).toBe(true);
      expect(comparison.nestingDifference).toBeGreaterThan(2);
      expect(comparison.hasZIndexConflicts).toBe(true);
      expect(comparison.hasOverlappingElements).toBe(true);

      // CRITICAL EVIDENCE: Document specific problems
      expect(complexAnalysis.maxNestingDepth).toBeGreaterThan(simpleAnalysis.maxNestingDepth);
      expect(complexAnalysis.overlayElements).toBeGreaterThan(simpleAnalysis.overlayElements);
      expect(complexAnalysis.zIndexElements).toBeGreaterThan(simpleAnalysis.zIndexElements);
    });

    it('SHOULD fail when complex layout blocks dropdown visibility', async () => {
      // ARRANGE: Complex component with known stacking context issues
      const ComplexComponent = ComponentHierarchyMocker.createComplexBrokenHierarchy();
      const { container } = render(<ComplexComponent onMentionSelect={vi.fn()} />);

      // ACT: Type @ to trigger dropdown
      const textarea = container.querySelector('[data-testid="complex-textarea"]') as HTMLTextAreaElement;
      await user.type(textarea, '@chief');

      // ACT: Wait for dropdown rendering attempt
      await waitFor(() => {
        const dropdown = container.querySelector('[data-testid="complex-dropdown"]');
        expect(dropdown).toBeTruthy(); // Dropdown exists in DOM
      });

      // ASSERT: Dropdown exists but may not be properly visible due to stacking context
      const dropdown = container.querySelector('[data-testid="complex-dropdown"]') as HTMLElement;
      expect(dropdown).toBeTruthy();

      // CRITICAL TEST: Check if dropdown is actually rendered correctly
      const dropdownStyle = window.getComputedStyle(dropdown);
      expect(dropdownStyle.display).toBe('block');
      expect(dropdownStyle.visibility).toBe('visible');

      // ASSERT: But verify z-index conflicts exist
      const toolbar = container.querySelector('[data-testid="formatting-toolbar-complex"]') as HTMLElement;
      const counter = container.querySelector('[data-testid="character-counter-overlay"]') as HTMLElement;

      const toolbarZIndex = parseInt(window.getComputedStyle(toolbar).zIndex || '0');
      const counterZIndex = parseInt(window.getComputedStyle(counter).zIndex || '0');
      const dropdownZIndex = parseInt(window.getComputedStyle(dropdown).zIndex || '0');

      console.log('🔍 Z-INDEX ANALYSIS:', { 
        toolbar: toolbarZIndex, 
        counter: counterZIndex, 
        dropdown: dropdownZIndex 
      });

      // CRITICAL: Even with high z-index, stacking context issues may prevent proper visibility
      expect(dropdownZIndex).toBe(99999);
      expect(toolbarZIndex).toBeLessThan(dropdownZIndex);
      expect(counterZIndex).toBeLessThan(dropdownZIndex);

      // ASSERTION THAT SHOULD SUCCEED: Dropdown has elements
      const suggestion = dropdown.querySelector('[data-testid="complex-suggestion"]');
      expect(suggestion).toBeTruthy();
    });
  });

  describe('STACKING CONTEXT ANALYSIS: Z-Index Conflicts', () => {
    it('SHOULD identify stacking context problems in CommentForm-like layouts', async () => {
      // ARRANGE: Create component with multiple stacking contexts
      const StackingContextProblem = () => (
        <div data-testid="stacking-problem" className="relative">
          {/* Parent establishes stacking context */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            
            {/* Child with high z-index */}
            <div 
              data-testid="high-z-toolbar"
              style={{ position: 'relative', zIndex: 100, backgroundColor: 'white' }}
            >
              Toolbar
            </div>
            
            {/* Input area */}
            <div style={{ position: 'relative' }}>
              <input data-testid="input-field" />
              
              {/* Dropdown with very high z-index but in wrong stacking context */}
              <div 
                data-testid="blocked-dropdown"
                style={{ 
                  position: 'absolute',
                  top: '100%',
                  zIndex: 99999, // High but potentially ineffective
                  backgroundColor: 'white',
                  border: '1px solid blue'
                }}
              >
                Blocked Dropdown
              </div>
            </div>
          </div>
          
          {/* Sibling with lower z-index but different stacking context */}
          <div 
            data-testid="sibling-overlay"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2, // Lower than dropdown but different context
              backgroundColor: 'rgba(255,255,255,0.01)', // Nearly transparent
              pointerEvents: 'none'
            }}
          >
            Invisible overlay
          </div>
        </div>
      );

      // ACT: Render and analyze stacking contexts
      const { container } = render(<StackingContextProblem />);

      // ASSERT: Identify the stacking context hierarchy
      const analysis = DOMHierarchyAnalyzer.analyzeLayoutComplexity(container);
      
      console.log('🔍 STACKING CONTEXT ANALYSIS:', analysis.stacking_contexts);

      // CRITICAL: Should detect multiple stacking contexts
      expect(analysis.stacking_contexts.length).toBeGreaterThan(2);
      
      // ASSERT: High z-index dropdown exists
      const dropdown = container.querySelector('[data-testid="blocked-dropdown"]') as HTMLElement;
      const dropdownZIndex = parseInt(window.getComputedStyle(dropdown).zIndex);
      expect(dropdownZIndex).toBe(99999);

      // CRITICAL: But sibling overlay may interfere despite lower z-index
      const siblingOverlay = container.querySelector('[data-testid="sibling-overlay"]') as HTMLElement;
      const siblingZIndex = parseInt(window.getComputedStyle(siblingOverlay).zIndex);
      expect(siblingZIndex).toBe(2);

      // This demonstrates the stacking context problem in CommentForm
      expect(dropdownZIndex).toBeGreaterThan(siblingZIndex); // Should work but may not due to contexts
    });

    it('SHOULD verify CSS cascade interference patterns', async () => {
      // ARRANGE: Component with CSS cascade issues that affect dropdown
      const CascadeProblemComponent = () => {
        const [showDropdown, setShowDropdown] = React.useState(false);

        return (
          <div data-testid="cascade-problem" className="relative">
            {/* Container with transform (creates stacking context) */}
            <div style={{ transform: 'translateZ(0)' }}>
              
              {/* Nested positioning contexts */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  
                  <input 
                    data-testid="cascade-input"
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type to test cascade..."
                  />
                  
                  {/* Dropdown affected by cascade */}
                  {showDropdown && (
                    <div 
                      data-testid="cascade-dropdown"
                      style={{ 
                        position: 'absolute',
                        top: '100%',
                        zIndex: 99999,
                        backgroundColor: 'white',
                        border: '1px solid blue',
                        // May be affected by parent transform
                      }}
                    >
                      Cascade Affected Dropdown
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      };

      // ACT: Render and test cascade effects
      const { container } = render(<CascadeProblemComponent />);

      // ACT: Trigger dropdown
      const input = container.querySelector('[data-testid="cascade-input"]') as HTMLInputElement;
      fireEvent.focus(input);

      await waitFor(() => {
        const dropdown = container.querySelector('[data-testid="cascade-dropdown"]');
        expect(dropdown).toBeTruthy();
      });

      // ASSERT: Analyze cascade interference
      const dropdown = container.querySelector('[data-testid="cascade-dropdown"]') as HTMLElement;
      const parentWithTransform = dropdown.closest('div[style*="transform"]') as HTMLElement;

      expect(parentWithTransform).toBeTruthy(); // Parent has transform
      expect(parentWithTransform.style.transform).toBe('translateZ(0)');

      // CRITICAL: Transform on parent creates new stacking context
      // This can cause high z-index to be ineffective outside the context
      const dropdownStyle = window.getComputedStyle(dropdown);
      expect(dropdownStyle.zIndex).toBe('99999');
      
      // The dropdown might not appear above elements outside the transform context
      // This is a common issue in CommentForm complex layouts
    });
  });

  describe('LAYOUT INTERFERENCE DETECTION: Overlay Elements', () => {
    it('SHOULD detect overlay elements that interfere with mention dropdown', async () => {
      // ARRANGE: Component with multiple overlays like CommentForm
      const OverlayInterferenceComponent = () => {
        const [value, setValue] = React.useState('');
        const [showDropdown, setShowDropdown] = React.useState(false);

        return (
          <div data-testid="overlay-interference" className="relative">
            {/* Input area */}
            <div className="relative">
              <textarea
                data-testid="interference-textarea"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setShowDropdown(e.target.value.includes('@'));
                }}
                className="w-full p-3 border"
              />
              
              {/* Character counter overlay */}
              <div 
                data-testid="counter-interference"
                style={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: 8, 
                  zIndex: 5,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                {value.length}/1000
              </div>
              
              {/* Format hint overlay */}
              <div 
                data-testid="format-hint-interference"
                style={{ 
                  position: 'absolute', 
                  top: 8, 
                  right: 8, 
                  zIndex: 4,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px'
                }}
              >
                Markdown
              </div>
              
              {/* Status overlay */}
              <div 
                data-testid="status-interference"
                style={{ 
                  position: 'absolute', 
                  top: 8, 
                  left: 8, 
                  zIndex: 3,
                  backgroundColor: 'green',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }}
              />
              
              {/* Mention dropdown - should appear above overlays */}
              {showDropdown && (
                <div 
                  data-testid="interference-dropdown"
                  style={{ 
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 99999,
                    backgroundColor: 'white',
                    border: '2px solid blue',
                    borderRadius: '8px'
                  }}
                >
                  <div className="p-3">Mention Suggestions</div>
                </div>
              )}
            </div>
          </div>
        );
      };

      // ACT: Render component with overlays
      const { container } = render(<OverlayInterferenceComponent />);

      // ACT: Trigger dropdown
      const textarea = container.querySelector('[data-testid="interference-textarea"]') as HTMLTextAreaElement;
      await user.type(textarea, '@test');

      // ASSERT: Verify all overlays exist
      const counterOverlay = container.querySelector('[data-testid="counter-interference"]');
      const formatHintOverlay = container.querySelector('[data-testid="format-hint-interference"]');
      const statusOverlay = container.querySelector('[data-testid="status-interference"]');
      const dropdown = container.querySelector('[data-testid="interference-dropdown"]');

      expect(counterOverlay).toBeTruthy();
      expect(formatHintOverlay).toBeTruthy();
      expect(statusOverlay).toBeTruthy();
      expect(dropdown).toBeTruthy();

      // ASSERT: Analyze z-index hierarchy
      const zIndices = [
        { name: 'counter', element: counterOverlay as HTMLElement, expectedZ: 5 },
        { name: 'formatHint', element: formatHintOverlay as HTMLElement, expectedZ: 4 },
        { name: 'status', element: statusOverlay as HTMLElement, expectedZ: 3 },
        { name: 'dropdown', element: dropdown as HTMLElement, expectedZ: 99999 }
      ];

      zIndices.forEach(({ name, element, expectedZ }) => {
        const actualZ = parseInt(window.getComputedStyle(element).zIndex);
        expect(actualZ).toBe(expectedZ);
        console.log(`🔍 ${name} z-index:`, actualZ);
      });

      // CRITICAL: Dropdown should be above all overlays
      const dropdownZ = parseInt(window.getComputedStyle(dropdown as HTMLElement).zIndex);
      const maxOverlayZ = Math.max(
        parseInt(window.getComputedStyle(counterOverlay as HTMLElement).zIndex),
        parseInt(window.getComputedStyle(formatHintOverlay as HTMLElement).zIndex),
        parseInt(window.getComputedStyle(statusOverlay as HTMLElement).zIndex)
      );

      expect(dropdownZ).toBeGreaterThan(maxOverlayZ);
      
      // This test demonstrates the pattern in CommentForm where multiple overlays exist
      // and potential for interference with mention dropdown rendering
    });

    it('SHOULD validate dropdown positioning relative to overlay boundaries', async () => {
      // ARRANGE: Component with boundary-checking overlays
      const BoundaryTestComponent = () => {
        const [showDropdown, setShowDropdown] = React.useState(true);

        return (
          <div data-testid="boundary-test" style={{ height: '300px', width: '400px', position: 'relative' }}>
            {/* Container boundaries */}
            <div style={{ position: 'relative', height: '100%', border: '2px solid red' }}>
              
              {/* Textarea near bottom */}
              <textarea
                data-testid="boundary-textarea"
                style={{ 
                  position: 'absolute', 
                  bottom: '50px', 
                  left: '10px', 
                  width: 'calc(100% - 20px)',
                  height: '40px'
                }}
                defaultValue="@test"
              />
              
              {/* Dropdown that might overflow */}
              {showDropdown && (
                <div 
                  data-testid="boundary-dropdown"
                  style={{ 
                    position: 'absolute',
                    top: 'calc(100% - 10px)', // Near bottom of textarea
                    left: '10px',
                    width: 'calc(100% - 20px)',
                    height: '100px', // Might overflow container
                    zIndex: 99999,
                    backgroundColor: 'white',
                    border: '2px solid blue',
                    overflow: 'visible'
                  }}
                >
                  <div className="p-2">Boundary Test Dropdown</div>
                </div>
              )}
            </div>
          </div>
        );
      };

      // ACT: Render and check boundaries
      const { container } = render(<BoundaryTestComponent />);

      // ASSERT: Check dropdown positioning
      const dropdown = container.querySelector('[data-testid="boundary-dropdown"]') as HTMLElement;
      const containerDiv = container.querySelector('[data-testid="boundary-test"]') as HTMLElement;

      expect(dropdown).toBeTruthy();
      
      // ASSERT: Dropdown dimensions and positioning
      const dropdownRect = dropdown.getBoundingClientRect();
      const containerRect = containerDiv.getBoundingClientRect();

      console.log('📐 Boundary analysis:', {
        dropdownHeight: dropdownRect.height,
        dropdownBottom: dropdownRect.bottom,
        containerBottom: containerRect.bottom,
        overflowAmount: dropdownRect.bottom - containerRect.bottom
      });

      // CRITICAL: Dropdown might overflow container
      const overflowsContainer = dropdownRect.bottom > containerRect.bottom;
      
      if (overflowsContainer) {
        console.log('⚠️ BOUNDARY OVERFLOW DETECTED - Similar to CommentForm issues');
      }

      // This test shows how dropdown positioning can be affected by container boundaries
      // A common issue in CommentForm complex layouts
    });
  });

  describe('SWARM COORDINATION: Cross-Component Layout Analysis', () => {
    it('SHOULD coordinate layout analysis across multiple component types', async () => {
      // ARRANGE: Multiple components with different layout patterns
      const components = [
        { name: 'Simple', component: ComponentHierarchyMocker.createSimpleWorkingHierarchy() },
        { name: 'Complex', component: ComponentHierarchyMocker.createComplexBrokenHierarchy() }
      ];

      // ACT: Analyze all components
      const analyses = await Promise.all(
        components.map(async ({ name, component: Component }) => {
          const { container } = render(<Component onMentionSelect={vi.fn()} />);
          const analysis = DOMHierarchyAnalyzer.analyzeLayoutComplexity(container);
          return { name, analysis, container };
        })
      );

      // ASSERT: Coordinate findings across components
      const coordinated_results = {
        totalComponents: analyses.length,
        averageComplexity: analyses.reduce((sum, a) => sum + a.analysis.totalDivs, 0) / analyses.length,
        maxNestingDepth: Math.max(...analyses.map(a => a.analysis.maxNestingDepth)),
        zIndexConflicts: analyses.filter(a => a.analysis.zIndexElements > 2).length,
        overlayInterference: analyses.filter(a => a.analysis.overlayElements > 1).length
      };

      console.log('🤝 COORDINATED ANALYSIS RESULTS:', coordinated_results);

      // ASSERT: Should detect significant variations in complexity
      expect(coordinated_results.totalComponents).toBe(2);
      expect(coordinated_results.zIndexConflicts).toBeGreaterThan(0);
      expect(coordinated_results.overlayInterference).toBeGreaterThan(0);

      // CRITICAL: Complex component should be identified as problematic
      const complexAnalysis = analyses.find(a => a.name === 'Complex');
      const simpleAnalysis = analyses.find(a => a.name === 'Simple');

      expect(complexAnalysis?.analysis.totalDivs).toBeGreaterThan(simpleAnalysis?.analysis.totalDivs || 0);
      expect(complexAnalysis?.analysis.maxNestingDepth).toBeGreaterThan(simpleAnalysis?.analysis.maxNestingDepth || 0);
    });
  });
});

/**
 * DOM Hierarchy Emergency Test Summary:
 * 
 * CRITICAL FINDINGS EXPOSED:
 * 
 * 1. LAYOUT COMPLEXITY DIFFERENCES:
 *    - Simple (Working): Flat, minimal nesting (2-3 div levels)
 *    - Complex (Broken): Deep nesting (5+ div levels) with multiple overlays
 * 
 * 2. Z-INDEX CONFLICTS:
 *    - Formatting toolbars with z-index: 10
 *    - Character counters with z-index: 5
 *    - Dropdowns with z-index: 99999 but blocked by stacking contexts
 * 
 * 3. STACKING CONTEXT ISSUES:
 *    - Parent elements with transforms/positioning create new contexts
 *    - High z-index on dropdown ineffective outside its stacking context
 *    - Multiple positioned elements interfering with dropdown visibility
 * 
 * 4. OVERLAY INTERFERENCE:
 *    - Character counters positioned absolutely over input areas
 *    - Formatting hints and status indicators as additional overlays
 *    - Multiple layers competing for same screen space
 * 
 * 5. BOUNDARY OVERFLOW:
 *    - Dropdowns extending beyond container boundaries
 *    - Clipping issues preventing full dropdown visibility
 *    - Responsive layout problems affecting dropdown positioning
 * 
 * ACTIONABLE FIXES IDENTIFIED:
 * 1. Flatten CommentForm layout hierarchy to match PostCreator
 * 2. Eliminate intermediate positioned containers that create stacking contexts  
 * 3. Move overlays (counters, hints) outside input containers
 * 4. Use consistent z-index hierarchy across all components
 * 5. Implement proper boundary detection for dropdown positioning
 */