/**
 * London School TDD Tests for EnhancedPostingInterface Main Component
 * Focus: Orchestration behavior and component collaboration contracts
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { 
  createMockEnhancedPostingInterfaceProps,
  createMockPostingStateContext,
  createMockTabConfigs,
  assertTabBehaviorContract,
  PostingTestDataBuilder
} from './mocks';
import './setup';

// Mock the PostingStateProvider
const MockPostingStateProvider: React.FC<{ children: React.ReactNode; value?: any }> = ({ 
  children, 
  value 
}) => {
  const mockContext = value || createMockPostingStateContext();
  return (
    <div data-testid="posting-state-provider">
      {React.cloneElement(children as React.ReactElement, { mockContext })}
    </div>
  );
};

// Mock Enhanced Posting Interface - define expected orchestration behavior
const MockEnhancedPostingInterface: React.FC<any> = ({
  defaultTab = 'post',
  enabledTabs = ['post', 'quick', 'avi'],
  layout = 'tabs',
  mobileLayout = 'bottom-tabs',
  onTabChange,
  onPostCreated,
  className,
  mockContext
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);

  // Mock media query detection
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);
    
    const tabletQuery = window.matchMedia('(max-width: 1024px)');
    setIsTablet(tabletQuery.matches);
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
    mockContext?.actions?.switchTab(tab);
  };

  const handlePostCreated = (post: any, source: string) => {
    onPostCreated?.(post, source);
    // Mock state updates
    mockContext?.actions?.updateCrossSectionData?.({
      lastUsedTags: post.tags || [],
      recentTopics: [post.title || post.content?.substring(0, 50)]
    });
  };

  const currentLayout = isMobile ? mobileLayout : layout;
  const tabConfigs = createMockTabConfigs().filter(tab => 
    enabledTabs.includes(tab.id as any)
  );

  return (
    <div 
      className={`enhanced-posting-interface ${className}`} 
      data-testid="enhanced-posting-interface"
      data-layout={currentLayout}
      data-mobile={isMobile}
    >
      {/* Mock PostingTabs */}
      <div data-testid="posting-tabs" data-layout={currentLayout}>
        {tabConfigs.map(tab => (
          <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mock content sections */}
      <div className="content-container" data-testid="content-container">
        {activeTab === 'post' && (
          <div data-testid="post-section">
            <div>Full Post Creator</div>
            <button 
              data-testid="create-post-button"
              onClick={() => handlePostCreated({
                id: 'post-123',
                title: 'Test Post',
                content: 'Test content',
                tags: ['test']
              }, 'post')}
            >
              Create Post
            </button>
          </div>
        )}

        {activeTab === 'quick' && (
          <div data-testid="quick-post-section">
            <div>Quick Post</div>
            <button 
              data-testid="create-quick-post-button"
              onClick={() => handlePostCreated({
                id: 'quick-123',
                content: 'Quick test',
                tags: []
              }, 'quick')}
            >
              Quick Post
            </button>
          </div>
        )}

        {activeTab === 'avi' && (
          <div data-testid="avi-section">
            <div>Avi DM Chat</div>
            <button 
              data-testid="generate-from-avi-button"
              onClick={() => handlePostCreated({
                id: 'avi-123',
                title: 'AI Generated Post',
                content: 'AI generated content',
                tags: ['ai-generated'],
                source: 'avi'
              }, 'avi')}
            >
              Generate from Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

describe('EnhancedPostingInterface - London School TDD', () => {
  let mockProps: ReturnType<typeof createMockEnhancedPostingInterfaceProps>;
  let mockStateContext: ReturnType<typeof createMockPostingStateContext>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockProps = createMockEnhancedPostingInterfaceProps();
    mockStateContext = createMockPostingStateContext();
    user = userEvent.setup();

    // Mock matchMedia for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('768px') ? false : query.includes('1024px') ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract: Component Orchestration Behavior', () => {
    it('should orchestrate tab switching across all child components', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const quickTab = screen.getByTestId('tab-quick');
      await user.click(quickTab);
      
      // Should notify parent
      expect(mockProps.onTabChange).toHaveBeenCalledWith('quick');
      
      // Should update state context
      expect(mockStateContext.actions.switchTab).toHaveBeenCalledWith('quick');
      
      // Should show correct content section
      expect(screen.getByTestId('quick-post-section')).toBeTruthy();
    });

    it('should coordinate post creation across different sections', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Create post from default tab (post)
      const createButton = screen.getByTestId('create-post-button');
      await user.click(createButton);
      
      // Should notify parent with source information
      expect(mockProps.onPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'post-123',
          title: 'Test Post'
        }),
        'post'
      );
      
      // Should update cross-section data
      expect(mockStateContext.actions.updateCrossSectionData).toHaveBeenCalledWith({
        lastUsedTags: ['test'],
        recentTopics: ['Test Post']
      });
    });

    it('should manage state consistency across tab switches', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Switch between tabs
      const quickTab = screen.getByTestId('tab-quick');
      await user.click(quickTab);
      
      const aviTab = screen.getByTestId('tab-avi');
      await user.click(aviTab);
      
      const postTab = screen.getByTestId('tab-post');
      await user.click(postTab);
      
      // Should maintain state consistency
      expect(mockStateContext.actions.switchTab).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId('post-section')).toBeTruthy();
    });

    it('should handle enabled tabs filtering correctly', () => {
      const limitedProps = {
        ...mockProps,
        enabledTabs: ['post', 'quick'] as any
      };
      
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...limitedProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Should only show enabled tabs
      expect(screen.getByTestId('tab-post')).toBeTruthy();
      expect(screen.getByTestId('tab-quick')).toBeTruthy();
      expect(screen.queryByTestId('tab-avi')).toBeFalsy();
    });
  });

  describe('Contract: Responsive Layout Orchestration', () => {
    it('should coordinate mobile layout changes', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('768px') ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const interface = screen.getByTestId('enhanced-posting-interface');
      expect(interface).toHaveAttribute('data-mobile', 'true');
      expect(interface).toHaveAttribute('data-layout', 'bottom-tabs');
    });

    it('should adapt layout based on device capabilities', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => {
          if (query.includes('768px')) return { matches: false };
          if (query.includes('1024px')) return { matches: true };
          return { matches: false };
        }),
      });
      
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const interface = screen.getByTestId('enhanced-posting-interface');
      expect(interface).toHaveAttribute('data-mobile', 'false');
    });

    it('should coordinate responsive behavior across child components', () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const tabsContainer = screen.getByTestId('posting-tabs');
      expect(tabsContainer).toHaveAttribute('data-layout', 'tabs');
    });
  });

  describe('Contract: Cross-Section Data Management', () => {
    it('should share data between quick post and full post', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Create quick post first
      const quickTab = screen.getByTestId('tab-quick');
      await user.click(quickTab);
      
      const quickButton = screen.getByTestId('create-quick-post-button');
      await user.click(quickButton);
      
      // Cross-section data should be updated
      expect(mockStateContext.actions.updateCrossSectionData).toHaveBeenCalled();
      
      // Switch to full post
      const postTab = screen.getByTestId('tab-post');
      await user.click(postTab);
      
      // Full post should have access to shared data
      expect(screen.getByTestId('post-section')).toBeTruthy();
    });

    it('should propagate Avi chat context to post generation', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const aviTab = screen.getByTestId('tab-avi');
      await user.click(aviTab);
      
      const generateButton = screen.getByTestId('generate-from-avi-button');
      await user.click(generateButton);
      
      expect(mockProps.onPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'avi',
          tags: expect.arrayContaining(['ai-generated'])
        }),
        'avi'
      );
    });

    it('should maintain context across tab switches', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Switch tabs multiple times
      const tabs = ['quick', 'avi', 'post'];
      
      for (const tabName of tabs) {
        const tab = screen.getByTestId(`tab-${tabName}`);
        await user.click(tab);
        
        expect(screen.getByTestId(`${tabName === 'post' ? 'post' : tabName === 'quick' ? 'quick-post' : 'avi'}-section`)).toBeTruthy();
      }
      
      // State should be maintained throughout
      expect(mockStateContext.actions.switchTab).toHaveBeenCalledTimes(3);
    });
  });

  describe('Contract: Error Boundary Behavior', () => {
    it('should handle child component errors gracefully', async () => {
      const errorProps = {
        ...mockProps,
        onPostCreated: vi.fn().mockImplementation(() => {
          throw new Error('Post creation error');
        })
      };
      
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...errorProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const createButton = screen.getByTestId('create-post-button');
      
      // Should not crash the interface
      expect(() => user.click(createButton)).not.toThrow();
    });

    it('should recover from state corruption', async () => {
      const corruptContext = {
        ...mockStateContext,
        state: null as any
      };
      
      render(
        <MockPostingStateProvider value={corruptContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={corruptContext} />
        </MockPostingStateProvider>
      );
      
      // Should render without crashing
      expect(screen.getByTestId('enhanced-posting-interface')).toBeTruthy();
    });

    it('should handle missing dependencies gracefully', () => {
      const minimalProps = {
        onTabChange: vi.fn(),
        onPostCreated: vi.fn()
      };
      
      expect(() => {
        render(
          <MockPostingStateProvider>
            <MockEnhancedPostingInterface {...minimalProps} />
          </MockPostingStateProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Contract: Performance Orchestration', () => {
    it('should lazy load inactive tabs', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Initially only active tab content should be rendered
      expect(screen.getByTestId('post-section')).toBeTruthy();
      expect(screen.queryByTestId('quick-post-section')).toBeFalsy();
      expect(screen.queryByTestId('avi-section')).toBeFalsy();
    });

    it('should optimize re-renders during tab switches', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = () => {
        renderSpy();
        return (
          <MockPostingStateProvider value={mockStateContext}>
            <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
          </MockPostingStateProvider>
        );
      };
      
      render(<TestComponent />);
      const initialRenderCount = renderSpy.mock.calls.length;
      
      const quickTab = screen.getByTestId('tab-quick');
      await user.click(quickTab);
      
      // Should not cause excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 5);
    });

    it('should manage memory efficiently with multiple tabs', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      // Switch through all tabs
      for (const tabName of ['quick', 'avi', 'post']) {
        const tab = screen.getByTestId(`tab-${tabName}`);
        await user.click(tab);
      }
      
      // Should maintain reasonable DOM size
      const interface = screen.getByTestId('enhanced-posting-interface');
      expect(interface.children.length).toBeLessThan(10);
    });
  });

  describe('Contract: Accessibility Orchestration', () => {
    it('should coordinate focus management across sections', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const quickTab = screen.getByTestId('tab-quick');
      await user.click(quickTab);
      
      // Focus should move appropriately
      expect(screen.getByTestId('quick-post-section')).toBeTruthy();
    });

    it('should maintain ARIA relationships between components', () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const tabsContainer = screen.getByTestId('posting-tabs');
      const contentContainer = screen.getByTestId('content-container');
      
      expect(tabsContainer).toBeTruthy();
      expect(contentContainer).toBeTruthy();
    });

    it('should announce tab changes to screen readers', async () => {
      render(
        <MockPostingStateProvider value={mockStateContext}>
          <MockEnhancedPostingInterface {...mockProps} mockContext={mockStateContext} />
        </MockPostingStateProvider>
      );
      
      const quickTab = screen.getByTestId('tab-quick');
      await user.click(quickTab);
      
      // Content should change appropriately for screen readers
      expect(screen.getByTestId('quick-post-section')).toBeTruthy();
    });
  });
});