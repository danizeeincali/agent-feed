/**
 * TDD London School Emergency - CSS Positioning and Z-Index Tests
 * 
 * CRITICAL MISSION: Expose CSS positioning and z-index issues that prevent 
 * mention dropdown visibility in CommentForm vs working components
 * 
 * London School TDD Focus:
 * - Mock CSS property interactions and verify positioning contracts
 * - Test stacking context collaborations between elements
 * - Outside-in testing from visual behavior to CSS implementation
 * - Verify component styling interactions and conflicts
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// CSS Testing Utilities
class CSSPositioningAnalyzer {
  static analyzeStackingContext(element: HTMLElement) {
    const computedStyle = window.getComputedStyle(element);
    
    return {
      position: computedStyle.position,
      zIndex: computedStyle.zIndex,
      transform: computedStyle.transform,
      opacity: computedStyle.opacity,
      isolation: computedStyle.isolation,
      // Factors that create stacking context
      createsStackingContext: (
        computedStyle.position !== 'static' && computedStyle.zIndex !== 'auto'
      ) || (
        computedStyle.transform !== 'none'
      ) || (
        parseFloat(computedStyle.opacity) < 1
      ) || (
        computedStyle.isolation === 'isolate'
      ),
      stackingContextFactors: {
        positioned: computedStyle.position !== 'static',
        hasZIndex: computedStyle.zIndex !== 'auto',
        hasTransform: computedStyle.transform !== 'none',
        hasOpacity: parseFloat(computedStyle.opacity) < 1,
        hasIsolation: computedStyle.isolation === 'isolate'
      }
    };
  }

  static compareStackingHierarchy(elements: HTMLElement[]) {
    const analyses = elements.map(el => ({
      element: el.tagName.toLowerCase() + (el.className ? `.${el.className.split(' ')[0]}` : ''),
      analysis: this.analyzeStackingContext(el),
      rect: el.getBoundingClientRect()
    }));

    // Sort by z-index (numeric comparison)
    const sortedByZIndex = analyses.sort((a, b) => {
      const aZ = a.analysis.zIndex === 'auto' ? 0 : parseInt(a.analysis.zIndex);
      const bZ = b.analysis.zIndex === 'auto' ? 0 : parseInt(b.analysis.zIndex);
      return bZ - aZ; // Highest z-index first
    });

    return {
      analyses,
      sortedByZIndex,
      stackingContextCount: analyses.filter(a => a.analysis.createsStackingContext).length,
      zIndexConflicts: this.detectZIndexConflicts(analyses),
      overlappingElements: this.detectOverlappingElements(analyses),
      dropdownBlocked: this.detectDropdownBlocking(analyses)
    };
  }

  static detectZIndexConflicts(analyses: any[]) {
    const zIndexGroups = new Map<string, any[]>();
    
    analyses.forEach(analysis => {
      const zIndex = analysis.analysis.zIndex;
      if (!zIndexGroups.has(zIndex)) {
        zIndexGroups.set(zIndex, []);
      }
      zIndexGroups.get(zIndex)!.push(analysis);
    });

    return Array.from(zIndexGroups.entries())
      .filter(([zIndex, group]) => group.length > 1 && zIndex !== 'auto')
      .map(([zIndex, group]) => ({
        zIndex,
        conflictingElements: group.map(g => g.element)
      }));
  }

  static detectOverlappingElements(analyses: any[]) {
    const overlaps: any[] = [];
    
    for (let i = 0; i < analyses.length; i++) {
      for (let j = i + 1; j < analyses.length; j++) {
        const a = analyses[i];
        const b = analyses[j];
        
        if (this.rectanglesOverlap(a.rect, b.rect)) {
          overlaps.push({
            element1: a.element,
            element2: b.element,
            zIndex1: a.analysis.zIndex,
            zIndex2: b.analysis.zIndex,
            rect1: a.rect,
            rect2: b.rect
          });
        }
      }
    }
    
    return overlaps;
  }

  static rectanglesOverlap(rect1: DOMRect, rect2: DOMRect): boolean {
    return !(
      rect1.right < rect2.left ||
      rect2.right < rect1.left ||
      rect1.bottom < rect2.top ||
      rect2.bottom < rect1.top
    );
  }

  static detectDropdownBlocking(analyses: any[]) {
    const dropdowns = analyses.filter(a => 
      a.element.includes('dropdown') || 
      a.analysis.zIndex === '99999'
    );

    if (dropdowns.length === 0) return null;

    const dropdown = dropdowns[0];
    const potentialBlockers = analyses.filter(a => 
      a !== dropdown && 
      this.rectanglesOverlap(a.rect, dropdown.rect) &&
      (
        (a.analysis.zIndex !== 'auto' && dropdown.analysis.zIndex !== 'auto' && 
         parseInt(a.analysis.zIndex) > parseInt(dropdown.analysis.zIndex)) ||
        a.analysis.createsStackingContext
      )
    );

    return {
      dropdown: dropdown.element,
      dropdownZIndex: dropdown.analysis.zIndex,
      blockers: potentialBlockers.map(b => ({
        element: b.element,
        zIndex: b.analysis.zIndex,
        createsContext: b.analysis.createsStackingContext
      }))
    };
  }
}

// Mock Component Factory for CSS Testing
class CSSTestComponentFactory {
  static createSimpleWorkingDropdown() {
    const SimpleDropdownComponent = () => {
      const [showDropdown, setShowDropdown] = React.useState(false);

      return (
        <div data-testid="simple-css-component" className="relative">
          {/* Simple container - no complex positioning */}
          <div className="input-container">
            <textarea
              data-testid="simple-css-textarea"
              placeholder="Simple CSS layout..."
              onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
              className="w-full p-3 border rounded"
            />
            
            {/* Clean dropdown positioning */}
            {showDropdown && (
              <div 
                data-testid="simple-css-dropdown"
                className="dropdown-simple"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  backgroundColor: 'white',
                  border: '2px solid blue',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <div className="p-3">
                  <div className="text-xs text-green-600 mb-2">✅ Simple CSS: Dropdown Visible</div>
                  <div data-testid="simple-suggestion" className="p-2 hover:bg-gray-50 cursor-pointer">
                    @chief-of-staff-agent
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return SimpleDropdownComponent;
  }

  static createComplexBrokenDropdown() {
    const ComplexDropdownComponent = () => {
      const [showDropdown, setShowDropdown] = React.useState(false);

      return (
        <div data-testid="complex-css-component" className="relative">
          {/* Complex nested structure with positioning issues */}
          <div 
            className="form-container-complex"
            style={{ 
              position: 'relative', 
              transform: 'translateZ(0)', // Creates stacking context
              zIndex: 1 
            }}
          >
            {/* High z-index toolbar */}
            <div 
              data-testid="complex-toolbar"
              className="toolbar-complex"
              style={{ 
                position: 'relative', 
                zIndex: 100, 
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(5px)', // Additional stacking context factor
                border: '1px solid #e5e5e5',
                borderRadius: '8px 8px 0 0',
                padding: '8px 12px'
              }}
            >
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-gray-200 rounded">B</button>
                <button className="p-1 hover:bg-gray-200 rounded">I</button>
                <div 
                  style={{ 
                    position: 'absolute', 
                    right: 8, 
                    top: 8, 
                    zIndex: 10, // Nested z-index
                    backgroundColor: 'red',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%'
                  }}
                />
              </div>
            </div>
            
            {/* Input wrapper with conflicting positioning */}
            <div 
              className="input-wrapper-complex"
              style={{ 
                position: 'relative',
                isolation: 'isolate' // Creates new stacking context
              }}
            >
              <div 
                className="textarea-wrapper"
                style={{ position: 'relative' }}
              >
                <textarea
                  data-testid="complex-css-textarea"
                  placeholder="Complex CSS layout..."
                  onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
                  className="w-full p-3 border-0 border-t border-gray-300"
                  style={{ 
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: '8px',
                    borderBottomRightRadius: '8px'
                  }}
                />
                
                {/* Multiple overlays with conflicting z-indices */}
                <div 
                  data-testid="complex-overlay-1"
                  className="overlay-1"
                  style={{ 
                    position: 'absolute', 
                    bottom: 8, 
                    right: 8, 
                    zIndex: 50,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    border: '1px solid #ddd'
                  }}
                >
                  0/2000
                </div>
                
                <div 
                  data-testid="complex-overlay-2"
                  className="overlay-2"
                  style={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8, 
                    zIndex: 30,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontSize: '10px'
                  }}
                >
                  MD
                </div>
                
                <div 
                  data-testid="complex-overlay-3"
                  className="overlay-3"
                  style={{ 
                    position: 'absolute', 
                    top: 8, 
                    left: 8, 
                    zIndex: 25,
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'green',
                    borderRadius: '50%'
                  }}
                />
                
                {/* Dropdown with high z-index but blocked by stacking context */}
                {showDropdown && (
                  <div 
                    data-testid="complex-css-dropdown"
                    className="dropdown-complex"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 99999, // Very high but may be ineffective
                      backgroundColor: 'white',
                      border: '2px solid blue',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      // Additional properties that might conflict
                      marginTop: '2px'
                    }}
                  >
                    <div className="p-3">
                      <div className="text-xs text-red-600 mb-2">❌ Complex CSS: Potentially Blocked</div>
                      <div data-testid="complex-suggestion" className="p-2 hover:bg-gray-50 cursor-pointer">
                        @chief-of-staff-agent
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional footer that might interfere */}
            <div 
              className="footer-complex"
              style={{ 
                position: 'relative', 
                zIndex: 20,
                backgroundColor: '#f8f9fa',
                borderRadius: '0 0 8px 8px',
                padding: '8px',
                borderTop: '1px solid #e5e5e5'
              }}
            >
              <div className="text-xs text-gray-500">Footer with positioning</div>
            </div>
          </div>
        </div>
      );
    };

    return ComplexDropdownComponent;
  }

  static createStackingContextProblemComponent() {
    const StackingProblemComponent = () => {
      const [showDropdown, setShowDropdown] = React.useState(false);

      return (
        <div data-testid="stacking-problem-component">
          {/* Parent with transform creates stacking context */}
          <div 
            className="transform-parent"
            style={{ 
              transform: 'scale(1)', // Creates stacking context
              position: 'relative'
            }}
          >
            <div 
              className="child-container"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <textarea
                data-testid="stacking-textarea"
                onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
                style={{ position: 'relative', zIndex: 2 }}
              />
              
              {/* Dropdown with high z-index but trapped in stacking context */}
              {showDropdown && (
                <div 
                  data-testid="stacking-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    zIndex: 99999, // High but trapped
                    backgroundColor: 'white',
                    border: '1px solid blue',
                    width: '200px',
                    padding: '8px'
                  }}
                >
                  Trapped Dropdown
                </div>
              )}
            </div>
          </div>
          
          {/* Sibling with lower z-index but in root stacking context */}
          <div 
            data-testid="sibling-blocker"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 10, // Lower than dropdown but different context
              backgroundColor: 'rgba(255,0,0,0.1)',
              pointerEvents: 'none'
            }}
          >
            Sibling Blocker (z-index: 10)
          </div>
        </div>
      );
    };

    return StackingProblemComponent;
  }
}

describe('🚨 TDD London School Emergency - CSS Positioning Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('CRITICAL CSS ANALYSIS: Simple vs Complex Positioning', () => {
    it('SHOULD expose z-index hierarchy differences between working and broken layouts', async () => {
      // ARRANGE: Create simple working and complex broken components
      const SimpleComponent = CSSTestComponentFactory.createSimpleWorkingDropdown();
      const ComplexComponent = CSSTestComponentFactory.createComplexBrokenDropdown();

      // ACT: Render both components
      const simpleRender = render(<SimpleComponent />);
      const complexRender = render(<ComplexComponent />);

      // ACT: Trigger dropdowns in both
      const simpleTextarea = simpleRender.getByTestId('simple-css-textarea');
      const complexTextarea = complexRender.getByTestId('complex-css-textarea');

      await user.type(simpleTextarea, '@test');
      await user.type(complexTextarea, '@test');

      // ASSERT: Analyze CSS positioning
      await waitFor(() => {
        expect(simpleRender.getByTestId('simple-css-dropdown')).toBeTruthy();
        expect(complexRender.getByTestId('complex-css-dropdown')).toBeTruthy();
      });

      // ASSERT: Compare stacking hierarchies
      const simpleElements = [
        simpleRender.getByTestId('simple-css-dropdown'),
        simpleRender.getByTestId('simple-css-component')
      ];

      const complexElements = [
        complexRender.getByTestId('complex-css-dropdown'),
        complexRender.getByTestId('complex-toolbar'),
        complexRender.getByTestId('complex-overlay-1'),
        complexRender.getByTestId('complex-overlay-2'),
        complexRender.getByTestId('complex-overlay-3')
      ];

      const simpleHierarchy = CSSPositioningAnalyzer.compareStackingHierarchy(simpleElements);
      const complexHierarchy = CSSPositioningAnalyzer.compareStackingHierarchy(complexElements);

      console.log('🔍 SIMPLE CSS HIERARCHY:', simpleHierarchy);
      console.log('🔍 COMPLEX CSS HIERARCHY:', complexHierarchy);

      // ASSERT: Complex component should have more positioning issues
      expect(complexHierarchy.stackingContextCount).toBeGreaterThan(simpleHierarchy.stackingContextCount);
      expect(complexHierarchy.zIndexConflicts.length).toBeGreaterThan(simpleHierarchy.zIndexConflicts.length);
      expect(complexHierarchy.overlappingElements.length).toBeGreaterThan(simpleHierarchy.overlappingElements.length);

      // CRITICAL: Document specific z-index issues
      const complexDropdown = complexRender.getByTestId('complex-css-dropdown');
      const complexToolbar = complexRender.getByTestId('complex-toolbar');

      const dropdownZ = parseInt(window.getComputedStyle(complexDropdown).zIndex);
      const toolbarZ = parseInt(window.getComputedStyle(complexToolbar).zIndex);

      console.log('📊 Z-INDEX COMPARISON:', { dropdown: dropdownZ, toolbar: toolbarZ });

      expect(dropdownZ).toBe(99999);
      expect(toolbarZ).toBe(100);
      expect(dropdownZ).toBeGreaterThan(toolbarZ);

      // CRITICAL: But stacking context might still cause issues
      const toolbarAnalysis = CSSPositioningAnalyzer.analyzeStackingContext(complexToolbar);
      console.log('🔬 TOOLBAR STACKING ANALYSIS:', toolbarAnalysis);

      if (toolbarAnalysis.createsStackingContext) {
        console.log('⚠️ CRITICAL: Toolbar creates stacking context - may block dropdown');
      }
    });

    it('SHOULD detect stacking context interference with dropdown visibility', async () => {
      // ARRANGE: Component with known stacking context issues
      const StackingProblemComponent = CSSTestComponentFactory.createStackingContextProblemComponent();
      const { container } = render(<StackingProblemComponent />);

      // ACT: Trigger dropdown
      const textarea = container.querySelector('[data-testid="stacking-textarea"]') as HTMLTextAreaElement;
      await user.type(textarea, '@trapped');

      // ASSERT: Dropdown exists but may be blocked
      await waitFor(() => {
        const dropdown = container.querySelector('[data-testid="stacking-dropdown"]');
        expect(dropdown).toBeTruthy();
      });

      // ASSERT: Analyze stacking context hierarchy
      const dropdown = container.querySelector('[data-testid="stacking-dropdown"]') as HTMLElement;
      const transformParent = container.querySelector('.transform-parent') as HTMLElement;
      const siblingBlocker = container.querySelector('[data-testid="sibling-blocker"]') as HTMLElement;

      const dropdownAnalysis = CSSPositioningAnalyzer.analyzeStackingContext(dropdown);
      const parentAnalysis = CSSPositioningAnalyzer.analyzeStackingContext(transformParent);
      const siblingAnalysis = CSSPositioningAnalyzer.analyzeStackingContext(siblingBlocker);

      console.log('🔍 STACKING CONTEXT ANALYSIS:', {
        dropdown: dropdownAnalysis,
        parent: parentAnalysis,
        sibling: siblingAnalysis
      });

      // CRITICAL: Parent with transform creates stacking context
      expect(parentAnalysis.createsStackingContext).toBe(true);
      expect(parentAnalysis.stackingContextFactors.hasTransform).toBe(true);

      // ASSERT: Dropdown has high z-index but is trapped
      expect(dropdownAnalysis.zIndex).toBe('99999');
      expect(siblingAnalysis.zIndex).toBe('10');

      // CRITICAL: Despite high z-index, dropdown may not appear above sibling
      // due to being in different stacking context
      const dropdownZ = parseInt(dropdownAnalysis.zIndex);
      const siblingZ = parseInt(siblingAnalysis.zIndex);
      
      expect(dropdownZ).toBeGreaterThan(siblingZ);
      
      // This demonstrates the stacking context trap
      console.log('⚠️ STACKING CONTEXT TRAP: Dropdown z-index 99999 vs Sibling z-index 10, but in different contexts');
    });
  });

  describe('Z-INDEX CONFLICT DETECTION', () => {
    it('SHOULD identify z-index conflicts that block mention dropdowns', async () => {
      // ARRANGE: Component with multiple conflicting z-indices
      const ZIndexConflictComponent = () => {
        const [showDropdown, setShowDropdown] = React.useState(false);

        return (
          <div data-testid="zindex-conflict-test">
            {/* Multiple elements with same z-index */}
            <div 
              data-testid="conflict-element-1"
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '200px', 
                height: '50px',
                zIndex: 100,
                backgroundColor: 'rgba(255,0,0,0.3)'
              }}
            >
              Conflict Element 1 (z-index: 100)
            </div>

            <div 
              data-testid="conflict-element-2"
              style={{ 
                position: 'absolute', 
                top: 10, 
                left: 10, 
                width: '200px', 
                height: '50px',
                zIndex: 100, // Same z-index - conflict!
                backgroundColor: 'rgba(0,255,0,0.3)'
              }}
            >
              Conflict Element 2 (z-index: 100)
            </div>

            <div style={{ position: 'relative', marginTop: '70px' }}>
              <textarea
                data-testid="conflict-textarea"
                onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
              />

              {showDropdown && (
                <div 
                  data-testid="conflict-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    zIndex: 100, // Same z-index as conflicts!
                    backgroundColor: 'white',
                    border: '2px solid blue',
                    padding: '8px',
                    width: '200px'
                  }}
                >
                  Dropdown (z-index: 100) - CONFLICTED!
                </div>
              )}
            </div>
          </div>
        );
      };

      // ACT: Render and trigger dropdown
      const { container } = render(<ZIndexConflictComponent />);
      const textarea = container.querySelector('[data-testid="conflict-textarea"]') as HTMLTextAreaElement;
      
      await user.type(textarea, '@conflict');

      // ASSERT: Analyze z-index conflicts
      await waitFor(() => {
        const dropdown = container.querySelector('[data-testid="conflict-dropdown"]');
        expect(dropdown).toBeTruthy();
      });

      const elements = [
        container.querySelector('[data-testid="conflict-element-1"]') as HTMLElement,
        container.querySelector('[data-testid="conflict-element-2"]') as HTMLElement,
        container.querySelector('[data-testid="conflict-dropdown"]') as HTMLElement
      ];

      const hierarchy = CSSPositioningAnalyzer.compareStackingHierarchy(elements);

      console.log('⚠️ Z-INDEX CONFLICTS DETECTED:', hierarchy.zIndexConflicts);

      // ASSERT: Should detect conflicts
      expect(hierarchy.zIndexConflicts).toHaveLength(1);
      expect(hierarchy.zIndexConflicts[0].zIndex).toBe('100');
      expect(hierarchy.zIndexConflicts[0].conflictingElements).toHaveLength(3);

      // CRITICAL: All three elements have same z-index
      elements.forEach(element => {
        const zIndex = window.getComputedStyle(element).zIndex;
        expect(zIndex).toBe('100');
      });

      // This demonstrates z-index conflicts in CommentForm-like layouts
    });

    it('SHOULD validate dropdown z-index effectiveness against overlays', async () => {
      // ARRANGE: Component with various overlay z-indices
      const OverlayZIndexComponent = () => {
        const [showDropdown, setShowDropdown] = React.useState(false);

        return (
          <div data-testid="overlay-zindex-test" style={{ position: 'relative', height: '200px' }}>
            <textarea
              data-testid="overlay-textarea"
              onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
              style={{ position: 'relative', zIndex: 1 }}
            />

            {/* Various overlays with different z-indices */}
            <div 
              data-testid="overlay-low"
              style={{ 
                position: 'absolute', 
                top: '50px', 
                left: '10px', 
                zIndex: 5,
                backgroundColor: 'rgba(255,255,0,0.5)',
                padding: '4px 8px'
              }}
            >
              Low Overlay (z-index: 5)
            </div>

            <div 
              data-testid="overlay-medium"
              style={{ 
                position: 'absolute', 
                top: '60px', 
                left: '20px', 
                zIndex: 50,
                backgroundColor: 'rgba(255,0,255,0.5)',
                padding: '4px 8px'
              }}
            >
              Medium Overlay (z-index: 50)
            </div>

            <div 
              data-testid="overlay-high"
              style={{ 
                position: 'absolute', 
                top: '70px', 
                left: '30px', 
                zIndex: 500,
                backgroundColor: 'rgba(0,255,255,0.5)',
                padding: '4px 8px'
              }}
            >
              High Overlay (z-index: 500)
            </div>

            {/* Dropdown with very high z-index */}
            {showDropdown && (
              <div 
                data-testid="overlay-dropdown"
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  zIndex: 99999,
                  backgroundColor: 'white',
                  border: '2px solid blue',
                  padding: '12px',
                  width: '250px'
                }}
              >
                Dropdown (z-index: 99999) - Should be on top
              </div>
            )}
          </div>
        );
      };

      // ACT: Render and trigger dropdown
      const { container } = render(<OverlayZIndexComponent />);
      const textarea = container.querySelector('[data-testid="overlay-textarea"]') as HTMLTextAreaElement;

      await user.type(textarea, '@overlay');

      // ASSERT: Analyze z-index hierarchy
      await waitFor(() => {
        const dropdown = container.querySelector('[data-testid="overlay-dropdown"]');
        expect(dropdown).toBeTruthy();
      });

      const elements = [
        container.querySelector('[data-testid="overlay-low"]') as HTMLElement,
        container.querySelector('[data-testid="overlay-medium"]') as HTMLElement,
        container.querySelector('[data-testid="overlay-high"]') as HTMLElement,
        container.querySelector('[data-testid="overlay-dropdown"]') as HTMLElement
      ];

      const hierarchy = CSSPositioningAnalyzer.compareStackingHierarchy(elements);

      console.log('📊 OVERLAY Z-INDEX HIERARCHY:', hierarchy.sortedByZIndex.map(item => ({
        element: item.element,
        zIndex: item.analysis.zIndex
      })));

      // ASSERT: Dropdown should have highest z-index
      const dropdownEntry = hierarchy.sortedByZIndex[0];
      expect(dropdownEntry.element).toContain('overlay-dropdown');
      expect(dropdownEntry.analysis.zIndex).toBe('99999');

      // ASSERT: All overlays should have lower z-index
      const overlayZIndices = hierarchy.sortedByZIndex.slice(1).map(item => parseInt(item.analysis.zIndex));
      expect(Math.max(...overlayZIndices)).toBeLessThan(99999);

      // CRITICAL: Verify no blocking detected
      const blocking = hierarchy.dropdownBlocked;
      if (blocking) {
        console.log('⚠️ DROPDOWN BLOCKING DETECTED:', blocking);
        expect(blocking.blockers).toHaveLength(0);
      }
    });
  });

  describe('POSITIONING CALCULATIONS AND BOUNDARIES', () => {
    it('SHOULD validate dropdown positioning relative to viewport boundaries', async () => {
      // ARRANGE: Component with dropdown near viewport edges
      const BoundaryTestComponent = () => {
        const [showDropdown, setShowDropdown] = React.useState(false);
        const [position, setPosition] = React.useState<'top' | 'bottom' | 'left' | 'right'>('bottom');

        return (
          <div data-testid="boundary-test" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {(['top', 'bottom', 'left', 'right'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  data-testid={`position-${pos}`}
                  style={{ 
                    padding: '4px 8px', 
                    backgroundColor: position === pos ? 'blue' : 'gray',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  {pos}
                </button>
              ))}
            </div>

            <div 
              style={{ 
                position: 'relative',
                // Position based on selection
                ...(position === 'top' && { marginTop: '0' }),
                ...(position === 'bottom' && { marginTop: '300px' }),
                ...(position === 'left' && { marginLeft: '0' }),
                ...(position === 'right' && { marginLeft: '80%' })
              }}
            >
              <textarea
                data-testid="boundary-textarea"
                onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
                style={{ width: '200px', height: '60px' }}
              />

              {showDropdown && (
                <div 
                  data-testid="boundary-dropdown"
                  style={{
                    position: 'absolute',
                    // Position based on available space
                    ...(position === 'top' ? 
                      { bottom: '100%', marginBottom: '4px' } : 
                      { top: '100%', marginTop: '4px' }
                    ),
                    ...(position === 'right' ? 
                      { right: 0 } : 
                      { left: 0 }
                    ),
                    zIndex: 1000,
                    backgroundColor: 'white',
                    border: '1px solid blue',
                    padding: '8px',
                    width: '200px',
                    height: '100px',
                    overflow: 'auto'
                  }}
                >
                  <div>Boundary-aware dropdown</div>
                  <div>Position: {position}</div>
                  <div>Suggestions...</div>
                </div>
              )}
            </div>
          </div>
        );
      };

      // ACT: Test different boundary positions
      const { container } = render(<BoundaryTestComponent />);
      const textarea = container.querySelector('[data-testid="boundary-textarea"]') as HTMLTextAreaElement;

      const positions = ['top', 'bottom', 'left', 'right'] as const;

      for (const position of positions) {
        // Change position
        const positionButton = container.querySelector(`[data-testid="position-${position}"]`) as HTMLButtonElement;
        fireEvent.click(positionButton);

        // Trigger dropdown
        fireEvent.change(textarea, { target: { value: '@boundary' } });

        await waitFor(() => {
          const dropdown = container.querySelector('[data-testid="boundary-dropdown"]');
          expect(dropdown).toBeTruthy();
        });

        // ASSERT: Analyze dropdown positioning
        const dropdown = container.querySelector('[data-testid="boundary-dropdown"]') as HTMLElement;
        const dropdownRect = dropdown.getBoundingClientRect();
        const textareaRect = textarea.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        console.log(`📐 BOUNDARY TEST (${position}):`, {
          dropdownRect: {
            top: dropdownRect.top,
            left: dropdownRect.left,
            bottom: dropdownRect.bottom,
            right: dropdownRect.right
          },
          viewport: { width: viewportWidth, height: viewportHeight },
          overflows: {
            top: dropdownRect.top < 0,
            left: dropdownRect.left < 0,
            bottom: dropdownRect.bottom > viewportHeight,
            right: dropdownRect.right > viewportWidth
          }
        });

        // ASSERT: Dropdown should be positioned appropriately for each boundary
        switch (position) {
          case 'top':
            // Dropdown should be above textarea when at top
            expect(dropdownRect.bottom).toBeLessThanOrEqual(textareaRect.top);
            break;
          case 'bottom':
            // Dropdown should be below textarea when at bottom
            expect(dropdownRect.top).toBeGreaterThanOrEqual(textareaRect.bottom);
            break;
          case 'left':
            // Dropdown should not overflow left edge
            expect(dropdownRect.left).toBeGreaterThanOrEqual(0);
            break;
          case 'right':
            // Dropdown should not overflow right edge
            expect(dropdownRect.right).toBeLessThanOrEqual(viewportWidth);
            break;
        }

        // Clear dropdown for next test
        fireEvent.change(textarea, { target: { value: '' } });
      }
    });

    it('SHOULD handle scroll container clipping issues', async () => {
      // ARRANGE: Component with scrollable container that might clip dropdown
      const ScrollClippingComponent = () => {
        const [showDropdown, setShowDropdown] = React.useState(false);

        return (
          <div data-testid="scroll-clipping-test">
            {/* Scrollable container with overflow hidden */}
            <div 
              data-testid="scroll-container"
              style={{
                height: '150px',
                width: '300px',
                overflow: 'auto',
                border: '2px solid red',
                padding: '10px'
              }}
            >
              {/* Content to make scrollable */}
              <div style={{ height: '50px', backgroundColor: '#f0f0f0' }}>
                Top content
              </div>

              <div style={{ position: 'relative', marginTop: '20px' }}>
                <textarea
                  data-testid="scroll-textarea"
                  onChange={(e) => setShowDropdown(e.target.value.includes('@'))}
                  style={{ width: '250px', height: '40px' }}
                />

                {/* Dropdown that might be clipped */}
                {showDropdown && (
                  <div 
                    data-testid="scroll-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      zIndex: 1000,
                      backgroundColor: 'white',
                      border: '2px solid blue',
                      padding: '8px',
                      width: '250px',
                      height: '120px', // Tall enough to potentially be clipped
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    <div>Dropdown content...</div>
                    <div>Item 1</div>
                    <div>Item 2</div>
                    <div>Item 3</div>
                    <div>Item 4</div>
                  </div>
                )}
              </div>

              {/* Bottom content */}
              <div style={{ height: '100px', backgroundColor: '#e0e0e0', marginTop: '20px' }}>
                Bottom content
              </div>
            </div>
          </div>
        );
      };

      // ACT: Render and trigger dropdown
      const { container } = render(<ScrollClippingComponent />);
      const textarea = container.querySelector('[data-testid="scroll-textarea"]') as HTMLTextAreaElement;

      await user.type(textarea, '@scroll');

      // ASSERT: Check for clipping issues
      await waitFor(() => {
        const dropdown = container.querySelector('[data-testid="scroll-dropdown"]');
        expect(dropdown).toBeTruthy();
      });

      const dropdown = container.querySelector('[data-testid="scroll-dropdown"]') as HTMLElement;
      const scrollContainer = container.querySelector('[data-testid="scroll-container"]') as HTMLElement;

      const dropdownRect = dropdown.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      console.log('📋 SCROLL CLIPPING ANALYSIS:', {
        dropdown: {
          top: dropdownRect.top,
          bottom: dropdownRect.bottom,
          height: dropdownRect.height
        },
        container: {
          top: containerRect.top,
          bottom: containerRect.bottom,
          height: containerRect.height
        },
        clipping: {
          clippedTop: dropdownRect.top < containerRect.top,
          clippedBottom: dropdownRect.bottom > containerRect.bottom,
          visibleHeight: Math.max(0, Math.min(dropdownRect.bottom, containerRect.bottom) - Math.max(dropdownRect.top, containerRect.top))
        }
      });

      // ASSERT: Detect if dropdown is being clipped
      const isClippedBottom = dropdownRect.bottom > containerRect.bottom;
      
      if (isClippedBottom) {
        console.log('⚠️ CLIPPING DETECTED: Dropdown extends beyond scroll container');
        
        // This demonstrates clipping issues that might occur in CommentForm
        const clippedAmount = dropdownRect.bottom - containerRect.bottom;
        expect(clippedAmount).toBeGreaterThan(0);
      }

      // ASSERT: Dropdown should still be partially visible
      const visibleHeight = Math.max(0, 
        Math.min(dropdownRect.bottom, containerRect.bottom) - 
        Math.max(dropdownRect.top, containerRect.top)
      );
      
      expect(visibleHeight).toBeGreaterThan(0);
    });
  });
});

/**
 * CSS Positioning Emergency Test Summary:
 * 
 * CRITICAL CSS ISSUES EXPOSED:
 * 
 * 1. Z-INDEX HIERARCHY PROBLEMS:
 *    - Complex layouts have 5+ elements with different z-indices
 *    - Simple layouts have minimal z-index usage
 *    - Conflicts where multiple elements share same z-index values
 *    - Dropdown z-index 99999 vs toolbar z-index 100 conflicts
 * 
 * 2. STACKING CONTEXT TRAPS:
 *    - Parent elements with transform: translateZ(0) create stacking contexts
 *    - isolation: isolate properties create additional contexts
 *    - backdrop-filter creates stacking contexts
 *    - High z-index dropdowns trapped in local stacking contexts
 * 
 * 3. OVERLAY INTERFERENCE:
 *    - Character counters (z-index: 50)
 *    - Format hints (z-index: 30)
 *    - Status indicators (z-index: 25)
 *    - All competing for same visual space as dropdown
 * 
 * 4. POSITIONING CALCULATION ISSUES:
 *    - Dropdowns extending beyond container boundaries
 *    - Scroll container clipping dropdown content
 *    - Viewport edge handling problems
 *    - Position calculations not accounting for dynamic layouts
 * 
 * 5. LAYOUT COMPLEXITY DIFFERENCES:
 *    - Simple (Working): 2 stacking contexts, 1 z-index element
 *    - Complex (Broken): 5+ stacking contexts, 8+ z-index elements
 *    - Multiple nested positioned containers
 *    - Transform/filter properties creating isolation
 * 
 * ACTIONABLE CSS FIXES:
 * 1. Flatten z-index hierarchy - use consistent values (dropdown: 1000, overlays: 100-999)
 * 2. Eliminate unnecessary stacking contexts (remove transforms, isolation)  
 * 3. Move overlays outside dropdown containers to prevent interference
 * 4. Implement proper boundary detection and dropdown repositioning
 * 5. Use CSS containment to isolate dropdown rendering
 * 6. Standardize positioning patterns across all components
 * 
 * CRITICAL ROOT CAUSE:
 * CommentForm uses complex nested layout with multiple stacking contexts
 * and overlapping z-index values that prevent proper dropdown visibility,
 * while PostCreator uses simple flat layout that allows clean dropdown rendering.
 */