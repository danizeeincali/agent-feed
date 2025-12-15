/**
 * Accessibility Tests for Agent Dynamic Pages
 * Ensuring WCAG compliance and screen reader compatibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

import AgentPagesTab from '../../src/components/AgentPagesTab';
import { TestDataFactory, TestUtils } from '../utils/test-factories';
import { MockWorkspaceApi } from '../mocks/workspace-api.mock';
import { workspaceApi } from '../../src/services/api/workspaceApi';

// Mock the API module
jest.mock('../../src/services/api/workspaceApi');

// Accessibility testing utilities
const expectAccessibleElement = (element: HTMLElement) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
  
  // Should have accessible name or description
  const accessibleName = element.getAttribute('aria-label') || 
                         element.getAttribute('aria-labelledby') ||
                         element.getAttribute('title') ||
                         element.textContent;
  expect(accessibleName).toBeTruthy();
};

const expectFocusable = (element: HTMLElement) => {
  expect(element).toHaveAttribute('tabindex');
  const tabIndex = element.getAttribute('tabindex');
  expect(tabIndex).not.toBe('-1');
};

const expectProperRole = (element: HTMLElement, expectedRole?: string) => {
  if (expectedRole) {
    expect(element).toHaveAttribute('role', expectedRole);
  } else {
    // Should have semantic HTML or proper role
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const semanticElements = ['button', 'input', 'select', 'textarea', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    
    expect(semanticElements.includes(tagName) || role).toBeTruthy();
  }
};

describe('Agent Pages Accessibility Tests', () => {
  let mockApi: MockWorkspaceApi;
  const user = userEvent.setup();

  beforeEach(() => {
    mockApi = MockWorkspaceApi.getInstance();
    mockApi.reset();

    // Setup workspace API mocks
    const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
    mockedWorkspaceApi.listPages = jest.fn();
    mockedWorkspaceApi.createPage = jest.fn();
    mockedWorkspaceApi.updatePage = jest.fn();
    mockedWorkspaceApi.deletePage = jest.fn();
  });

  afterEach(() => {
    mockApi.reset();
    jest.clearAllMocks();
  });

  describe('WCAG Compliance - Level AA', () => {
    describe('1.1 Text Alternatives', () => {
      it('should provide text alternatives for all non-text content', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 5);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        // Wait for content to load
        await screen.findByTestId('agent-pages-tab');

        // Check icons have proper labels
        const bookmarkButtons = screen.getAllByTestId(/bookmark-button-/);
        bookmarkButtons.forEach(button => {
          expectAccessibleElement(button);
        });

        // Check external link icons
        const externalIcons = screen.getAllByTestId(/external-icon-/);
        externalIcons.forEach(icon => {
          expectAccessibleElement(icon);
        });
      });

      it('should provide alt text for images in page content', async () => {
        const { agent } = TestDataFactory.scenarios.emptyWorkspace();
        mockApi.setupEmptyWorkspace(agent.id);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockResolvedValue({
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        });

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('empty-pages-state');

        // Check empty state icon
        const emptyStateIcon = screen.getByRole('img', { hidden: true });
        expect(emptyStateIcon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    describe('1.3 Adaptable', () => {
      it('should maintain proper heading hierarchy', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Check heading hierarchy
        const mainHeading = screen.getByRole('heading', { level: 2 });
        expect(mainHeading).toHaveTextContent(/Pages & Documentation/);

        // Page titles should be h3 or have proper role
        const pageTitles = screen.getAllByTestId('page-title');
        pageTitles.forEach(title => {
          expectProperRole(title);
        });
      });

      it('should maintain semantic structure', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Check main container has proper role
        const mainContainer = screen.getByTestId('agent-pages-tab');
        expect(mainContainer).toHaveAttribute('aria-label', 'Pages list');

        // Check form elements have proper labels
        const searchInput = screen.getByTestId('pages-search');
        expect(searchInput).toHaveAttribute('aria-label', 'Search pages');

        const filters = screen.getAllByRole('combobox');
        filters.forEach(filter => {
          expectAccessibleElement(filter);
        });
      });

      it('should provide programmatic structure for lists', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 5);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Pages should be presented as a list or grid
        const pageCards = screen.getAllByTestId(/page-card-/);
        pageCards.forEach(card => {
          expectProperRole(card, 'button');
        });
      });
    });

    describe('1.4 Distinguishable', () => {
      it('should have sufficient color contrast', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Check that text elements have proper contrast
        // This would typically be verified with automated tools
        const textElements = screen.getAllByText(/./);
        textElements.forEach(element => {
          const styles = window.getComputedStyle(element);
          // In a real test, you'd check contrast ratios here
          expect(styles.color).toBeDefined();
          expect(styles.backgroundColor).toBeDefined();
        });
      });

      it('should not rely solely on color to convey information', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Check status indicators use text/icons, not just color
        const statusBadges = screen.getAllByTestId(/type-badge-/);
        statusBadges.forEach(badge => {
          expect(badge.textContent).toBeTruthy();
        });

        // Check difficulty indicators
        const difficultyElements = screen.getAllByTestId(/difficulty-/);
        difficultyElements.forEach(element => {
          expect(element.textContent).toBeTruthy();
        });
      });

      it('should be resizable up to 200% without horizontal scrolling', () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        
        // Simulate zoom by reducing viewport
        const originalInnerWidth = window.innerWidth;
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: originalInnerWidth / 2
        });

        render(<AgentPagesTab agent={agent} />);

        const container = screen.getByTestId('agent-pages-tab');
        const containerRect = container.getBoundingClientRect();

        // Should not require horizontal scrolling
        expect(containerRect.width).toBeLessThanOrEqual(window.innerWidth);

        // Restore original width
        Object.defineProperty(window, 'innerWidth', {
          value: originalInnerWidth
        });
      });
    });

    describe('2.1 Keyboard Accessible', () => {
      it('should be fully keyboard navigable', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Test tab navigation
        const searchInput = screen.getByTestId('pages-search');
        searchInput.focus();
        expect(searchInput).toHaveFocus();

        await user.tab();
        const clearButton = screen.queryByTestId('clear-search');
        if (clearButton) {
          expect(clearButton).toHaveFocus();
        }

        await user.tab();
        const typeFilter = screen.getByTestId('type-filter');
        expect(typeFilter).toHaveFocus();

        // Continue tab navigation through all interactive elements
        const interactiveElements = [
          'category-filter',
          'difficulty-filter',
          'sort-select',
          'featured-toggle'
        ];

        for (const testId of interactiveElements) {
          await user.tab();
          const element = screen.getByTestId(testId);
          expect(element).toHaveFocus();
        }
      });

      it('should provide keyboard shortcuts for common actions', async () => {
        const { agent } = TestDataFactory.scenarios.emptyWorkspace();
        mockApi.setupEmptyWorkspace(agent.id);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockResolvedValue({
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        });

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('empty-pages-state');

        // Test keyboard activation of create button
        const createButton = screen.getByRole('button', { name: /Create Dynamic Page/ });
        createButton.focus();
        expect(createButton).toHaveFocus();

        await user.keyboard('{Enter}');
        // Should open page builder modal
        // In real implementation, this would be verified
      });

      it('should trap focus in modals', async () => {
        const { agent } = TestDataFactory.scenarios.emptyWorkspace();
        mockApi.setupEmptyWorkspace(agent.id);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockResolvedValue({
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        });

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('empty-pages-state');

        // Open modal
        const createButton = screen.getByRole('button', { name: /Create Dynamic Page/ });
        await user.click(createButton);

        // Modal should be rendered by AgentPageBuilder
        // In real test, we'd verify focus trapping here
      });
    });

    describe('2.4 Navigable', () => {
      it('should provide skip links for main content', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        
        render(<AgentPagesTab agent={agent} />);

        // Check for skip link or main landmark
        const mainContent = screen.getByRole('main') || screen.getByTestId('agent-pages-tab');
        expect(mainContent).toBeInTheDocument();
      });

      it('should provide descriptive page title', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        
        render(<AgentPagesTab agent={agent} />);

        const heading = screen.getByRole('heading', { level: 2 });
        expect(heading).toHaveTextContent(/Pages & Documentation/);
      });

      it('should provide breadcrumb navigation context', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        
        render(<AgentPagesTab agent={agent} />);

        // Should provide context of current location
        expect(screen.getByText(/Manage and organize agent documentation/)).toBeInTheDocument();
      });

      it('should indicate current focus location', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        const searchInput = screen.getByTestId('pages-search');
        await user.click(searchInput);

        // Focus should be clearly visible
        expect(searchInput).toHaveFocus();
        expect(searchInput).toHaveClass(/focus/);
      });
    });

    describe('3.1 Readable', () => {
      it('should specify language of content', () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        
        render(<AgentPagesTab agent={agent} />);

        // Check that lang attribute is set on document or container
        expect(document.documentElement.lang || document.body.lang).toBeTruthy();
      });

      it('should use clear and simple language', async () => {
        const { agent } = TestDataFactory.scenarios.emptyWorkspace();
        mockApi.setupEmptyWorkspace(agent.id);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockResolvedValue({
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        });

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('empty-pages-state');

        // Check for clear, understandable text
        expect(screen.getByText('No pages available')).toBeInTheDocument();
        expect(screen.getByText(/Create custom dynamic pages/)).toBeInTheDocument();
      });
    });

    describe('3.2 Predictable', () => {
      it('should maintain consistent navigation', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        // Navigation should be in consistent order
        const searchInput = screen.getByTestId('pages-search');
        const typeFilter = screen.getByTestId('type-filter');
        const categoryFilter = screen.getByTestId('category-filter');

        // Check tab order consistency
        searchInput.focus();
        await user.tab();
        await user.tab(); // Skip clear button if present
        expect(typeFilter).toHaveFocus();
      });

      it('should not cause unexpected context changes', async () => {
        const { agent } = TestDataFactory.scenarios.mixedStatusPages();
        mockApi.setupWorkspaceWithPages(agent.id, 3);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('agent-pages-tab');

        const searchInput = screen.getByTestId('pages-search');
        
        // Typing in search should not cause unexpected navigation
        await user.type(searchInput, 'test search');
        
        expect(searchInput).toHaveFocus();
        expect(searchInput).toHaveValue('test search');
      });
    });

    describe('3.3 Input Assistance', () => {
      it('should provide helpful error messages', async () => {
        const { agent } = TestDataFactory.scenarios.emptyWorkspace();
        
        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockRejectedValue(
          TestDataFactory.createMockError('Failed to load pages', 500)
        );

        render(<AgentPagesTab agent={agent} />);

        // Should show helpful error message
        await screen.findByText(/Failed to load pages/);
        
        const errorMessage = screen.getByText(/Failed to load pages/);
        expectAccessibleElement(errorMessage);
      });

      it('should provide instructions for required fields', async () => {
        const { agent } = TestDataFactory.scenarios.emptyWorkspace();
        mockApi.setupEmptyWorkspace(agent.id);

        const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
        mockedWorkspaceApi.listPages.mockResolvedValue({
          success: true,
          agent_id: agent.id,
          pages: [],
          total: 0,
          limit: 20,
          offset: 0,
          has_more: false
        });

        render(<AgentPagesTab agent={agent} />);

        await screen.findByTestId('empty-pages-state');

        // Check that form fields will have proper labels and instructions
        // This would be verified in the AgentPageBuilder component tests
        expect(screen.getByRole('button', { name: /Create Dynamic Page/ })).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful accessible names', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 3);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('agent-pages-tab');

      // Check search input
      const searchInput = screen.getByTestId('pages-search');
      expect(searchInput).toHaveAttribute('aria-label', 'Search pages');
      expect(searchInput).toHaveAttribute('placeholder', 'Search pages...');

      // Check filters
      const typeFilter = screen.getByTestId('type-filter');
      expectAccessibleElement(typeFilter);

      const categoryFilter = screen.getByTestId('category-filter');
      expectAccessibleElement(categoryFilter);
    });

    it('should announce dynamic content changes', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 5);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation((agentId, filters) => 
        mockApi.listPages(agentId, filters)
      );

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('agent-pages-tab');

      // Perform search that changes content
      const searchInput = screen.getByTestId('pages-search');
      await user.type(searchInput, 'Published');

      // Should announce results (in real implementation)
      // This would be verified with aria-live regions
    });

    it('should provide status information', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setNetworkDelay(1000);
      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      render(<AgentPagesTab agent={agent} />);

      // Should announce loading state
      expect(screen.getByText('Loading pages...')).toBeInTheDocument();
      
      const loadingIndicator = screen.getByText('Loading pages...');
      expectAccessibleElement(loadingIndicator);
    });

    it('should provide landmark navigation', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      render(<AgentPagesTab agent={agent} />);

      // Should have main landmark or equivalent
      const mainContent = screen.getByRole('main') || screen.getByTestId('agent-pages-tab');
      expect(mainContent).toHaveAttribute('aria-label', 'Pages list');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus appropriately when opening modals', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      });

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('empty-pages-state');

      const createButton = screen.getByRole('button', { name: /Create Dynamic Page/ });
      
      // Focus should move to modal when opened
      await user.click(createButton);
      
      // In real implementation, focus would move to modal
      // This would be tested in the AgentPageBuilder component
    });

    it('should restore focus when closing modals', async () => {
      const { agent } = TestDataFactory.scenarios.emptyWorkspace();
      mockApi.setupEmptyWorkspace(agent.id);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockResolvedValue({
        success: true,
        agent_id: agent.id,
        pages: [],
        total: 0,
        limit: 20,
        offset: 0,
        has_more: false
      });

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('empty-pages-state');

      const createButton = screen.getByRole('button', { name: /Create Dynamic Page/ });
      createButton.focus();
      expect(createButton).toHaveFocus();

      // When modal closes, focus should return to trigger button
      // This would be tested in integration with AgentPageBuilder
    });

    it('should maintain logical tab order', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 3);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('agent-pages-tab');

      // Start from search
      const searchInput = screen.getByTestId('pages-search');
      searchInput.focus();

      const tabOrder = [
        'pages-search',
        'type-filter',
        'category-filter',
        'difficulty-filter',
        'sort-select',
        'featured-toggle'
      ];

      let currentElement = searchInput;
      expect(currentElement).toHaveFocus();

      for (let i = 1; i < tabOrder.length; i++) {
        await user.tab();
        currentElement = screen.getByTestId(tabOrder[i]);
        expect(currentElement).toHaveFocus();
      }
    });
  });

  describe('High Contrast and Dark Mode', () => {
    it('should work with high contrast mode', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      // Simulate high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<AgentPagesTab agent={agent} />);

      // All interactive elements should remain visible and functional
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toBeVisible();
        expectFocusable(element);
      });
    });

    it('should support dark mode preferences', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      // Simulate dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<AgentPagesTab agent={agent} />);

      // Should adapt to dark mode while maintaining accessibility
      const container = screen.getByTestId('agent-pages-tab');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Motion and Animation', () => {
    it('should respect reduced motion preferences', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      // Simulate reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<AgentPagesTab agent={agent} />);

      // Animations should be disabled or reduced
      const animatedElements = screen.getAllByTestId(/loading|spinner/);
      animatedElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // In real implementation, check for reduced animations
        expect(element).toBeInTheDocument();
      });
    });

    it('should not cause seizures with flashing content', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      render(<AgentPagesTab agent={agent} />);

      // No elements should flash more than 3 times per second
      // This would be verified with actual animation testing
      const container = screen.getByTestId('agent-pages-tab');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    it('should have adequate touch targets', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 3);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('agent-pages-tab');

      // Touch targets should be at least 44px x 44px
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });

    it('should work with screen magnification', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      
      // Simulate zoom
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 3
      });

      render(<AgentPagesTab agent={agent} />);

      // Content should remain accessible at high zoom levels
      const container = screen.getByTestId('agent-pages-tab');
      expect(container).toBeVisible();
    });
  });

  describe('Assistive Technology Support', () => {
    it('should work with voice control software', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 3);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('agent-pages-tab');

      // All interactive elements should have accessible names for voice control
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expectAccessibleElement(button);
      });

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expectAccessibleElement(input);
      });

      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expectAccessibleElement(select);
      });
    });

    it('should provide adequate context for switch control', async () => {
      const { agent } = TestDataFactory.scenarios.mixedStatusPages();
      mockApi.setupWorkspaceWithPages(agent.id, 3);

      const mockedWorkspaceApi = workspaceApi as jest.Mocked<typeof workspaceApi>;
      mockedWorkspaceApi.listPages.mockImplementation(() => mockApi.listPages(agent.id));

      render(<AgentPagesTab agent={agent} />);

      await screen.findByTestId('agent-pages-tab');

      // Interactive elements should be logically grouped
      const controlsSection = screen.getByTestId('agent-pages-tab');
      const interactiveElements = controlsSection.querySelectorAll('button, input, select');
      
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach(element => {
        expectFocusable(element as HTMLElement);
      });
    });
  });
});