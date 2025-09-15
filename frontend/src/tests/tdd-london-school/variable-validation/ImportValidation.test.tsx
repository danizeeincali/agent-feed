/**
 * TDD Import Validation Tests
 * Tests that all imported variables and components are available and working
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import EnhancedAviDMWithClaudeCode from '../../../components/claude-manager/EnhancedAviDMWithClaudeCode';

// Mock dependencies that might not be available in test environment
global.fetch = vi.fn();

// Mock StreamingTickerWorking component
vi.mock('../../../StreamingTickerWorking', () => {
  return function MockStreamingTickerWorking(props: any) {
    return (
      <div data-testid="streaming-ticker-working">
        MockStreamingTickerWorking - enabled: {props.enabled?.toString()},
        demo: {props.demo?.toString()},
        userId: {props.userId},
        maxMessages: {props.maxMessages}
      </div>
    );
  };
});

describe('Import Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Test response' })
    } as Response);
  });

  describe('TDD RED: Missing React Imports', () => {
    it('should fail if React is not imported', () => {
      // RED: Component should require React import to work
      expect(() => render(<EnhancedAviDMWithClaudeCode />)).not.toThrow();

      // Component should render React elements
      const componentElement = screen.getByText('Avi DM - Interactive Control');
      expect(componentElement).toBeInTheDocument();
    });

    it('should fail if useState is not imported from React', () => {
      // RED: Component uses useState, should fail if not imported
      render(<EnhancedAviDMWithClaudeCode />);

      // Test that state functionality works (requires useState)
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Should be able to change input (requires useState for claudeMessage)
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: 'state test' } });
      expect((messageInput as HTMLInputElement).value).toBe('state test');
    });
  });

  describe('TDD RED: Missing UI Component Imports', () => {
    it('should fail if Tabs components are not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Should render Tabs, TabsContent, TabsList, TabsTrigger
      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toBeInTheDocument();

      const aviDmTab = screen.getByRole('tab', { name: /avi chat/i });
      expect(aviDmTab).toBeInTheDocument();

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      expect(claudeCodeTab).toBeInTheDocument();

      const activityTab = screen.getByRole('tab', { name: /live activity/i });
      expect(activityTab).toBeInTheDocument();
    });

    it('should fail if Card components are not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Should render Card, CardContent, CardHeader, CardTitle
      const cardTitles = screen.getAllByText(/Avi DM Chat Interface|Claude Code Interface|Live Activity Ticker|System Status/);
      expect(cardTitles.length).toBeGreaterThan(0);

      // Cards should be properly structured
      cardTitles.forEach(title => {
        expect(title).toBeInTheDocument();
      });
    });

    it('should fail if Badge component is not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Should render Badge components
      const onlineBadge = screen.getByText('Online');
      expect(onlineBadge).toBeInTheDocument();

      // Navigate to Claude Code tab to see more badges
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const toolModeBadge = screen.getByText('Tool');
      expect(toolModeBadge).toBeInTheDocument();
    });

    it('should fail if Button component is not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Should render Button components
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeInTheDocument();

      // Buttons should be interactive
      fireEvent.click(toolModeButton);
      expect(screen.getByText('Chat Mode')).toBeInTheDocument();
    });

    it('should fail if Alert components are not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Should render Alert, AlertDescription
      const alertMessage = screen.getByText(/Original Avi DM functionality/);
      expect(alertMessage).toBeInTheDocument();

      // Alert should be properly structured
      expect(alertMessage.closest('[role="alert"]')).toBeInTheDocument();
    });
  });

  describe('TDD RED: Missing Icon Imports', () => {
    it('should fail if Lucide React icons are not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Icons should render without errors (they render as SVGs)
      // We test indirectly by ensuring the component doesn't crash
      const header = screen.getByText('Avi DM - Interactive Control');
      expect(header).toBeInTheDocument();

      // Navigate to different tabs to test all icon usage
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const activityTab = screen.getByText('Live Activity');
      fireEvent.click(activityTab);

      // If icons weren't imported, component would crash
      expect(screen.getByText('Live Activity Ticker')).toBeInTheDocument();
    });

    it('should fail if specific icons are not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test icon usage in buttons
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton).toBeInTheDocument();

      // Should contain SVG elements (icons)
      const svgElements = toolModeButton.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);

      // Toggle to test different icon
      fireEvent.click(toolModeButton);
      const chatModeButton = screen.getByText('Chat Mode');
      const chatSvgElements = chatModeButton.querySelectorAll('svg');
      expect(chatSvgElements.length).toBeGreaterThan(0);
    });
  });

  describe('TDD RED: Missing Utility Imports', () => {
    it('should fail if cn utility is not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // cn utility should be used for className generation
      // Test that elements have proper classes (requires cn to work)
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton.className).toContain('flex items-center space-x-2');

      // Toggle to test conditional classes
      fireEvent.click(toolModeButton);
      const chatModeButton = screen.getByText('Chat Mode');
      expect(chatModeButton.className).toBeDefined();
    });

    it('should fail if StreamingTickerWorking is not imported', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const activityTab = screen.getByText('Live Activity');
      fireEvent.click(activityTab);

      // Should render StreamingTickerWorking component
      const streamingTicker = screen.getByTestId('streaming-ticker-working');
      expect(streamingTicker).toBeInTheDocument();

      // Should pass correct props to StreamingTickerWorking
      expect(streamingTicker).toHaveTextContent('enabled: true');
      expect(streamingTicker).toHaveTextContent('demo: true');
      expect(streamingTicker).toHaveTextContent('userId: agent-feed-user');
      expect(streamingTicker).toHaveTextContent('maxMessages: 5');
    });
  });

  describe('TDD GREEN: All Imports Working Correctly', () => {
    it('should have all React imports working', () => {
      // Component should render without import errors
      expect(() => render(<EnhancedAviDMWithClaudeCode />)).not.toThrow();

      // React functionality should work
      const component = screen.getByText('Avi DM - Interactive Control');
      expect(component).toBeInTheDocument();

      // useState should work for all state variables
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      fireEvent.change(messageInput, { target: { value: 'react test' } });
      expect((messageInput as HTMLInputElement).value).toBe('react test');
    });

    it('should have all UI component imports working', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Test Tabs functionality
      const tabsList = screen.getByRole('tablist');
      expect(tabsList).toBeInTheDocument();

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test Card components
      const claudeCodeInterface = screen.getByText('Claude Code Interface');
      expect(claudeCodeInterface).toBeInTheDocument();

      // Test Button components
      const sendButton = screen.getByText('Send');
      expect(sendButton).toBeInTheDocument();
      expect(sendButton.tagName.toLowerCase()).toBe('button');

      // Test Badge components
      const toolBadge = screen.getByText('Tool');
      expect(toolBadge).toBeInTheDocument();

      // Test Alert components
      const aviDmTab = screen.getByText('Avi Chat');
      fireEvent.click(aviDmTab);
      const alertText = screen.getByText(/Original Avi DM functionality/);
      expect(alertText).toBeInTheDocument();
    });

    it('should have all icon imports working', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Component should render without icon import errors
      const header = screen.getByText('Avi DM - Interactive Control');
      expect(header).toBeInTheDocument();

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Icons should render in buttons
      const toolModeButton = screen.getByText('Tool Mode');
      const svgIcons = toolModeButton.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);

      // Icon should have proper attributes
      svgIcons.forEach(svg => {
        expect(svg).toBeInTheDocument();
        expect(svg.tagName.toLowerCase()).toBe('svg');
      });

      // Test different icons when toggling
      fireEvent.click(toolModeButton);
      const chatModeButton = screen.getByText('Chat Mode');
      const chatIcons = chatModeButton.querySelectorAll('svg');
      expect(chatIcons.length).toBeGreaterThan(0);
    });

    it('should have utility imports working correctly', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // cn utility should work for className generation
      const toolModeButton = screen.getByText('Tool Mode');
      expect(toolModeButton.className).toContain('flex');
      expect(toolModeButton.className).toContain('items-center');

      // Test conditional className with cn utility
      fireEvent.click(toolModeButton);
      const chatModeButton = screen.getByText('Chat Mode');
      expect(chatModeButton.className).toBeDefined();
      expect(chatModeButton.className.length).toBeGreaterThan(0);
    });

    it('should have StreamingTickerWorking import working', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      const activityTab = screen.getByText('Live Activity');
      fireEvent.click(activityTab);

      // StreamingTickerWorking should render with correct props
      const streamingTicker = screen.getByTestId('streaming-ticker-working');
      expect(streamingTicker).toBeInTheDocument();

      // Props should be passed correctly
      expect(streamingTicker.textContent).toMatch(/enabled: true/);
      expect(streamingTicker.textContent).toMatch(/demo: true/);
      expect(streamingTicker.textContent).toMatch(/userId: agent-feed-user/);
      expect(streamingTicker.textContent).toMatch(/maxMessages: 5/);
    });
  });

  describe('TDD GREEN: Import Integration Tests', () => {
    it('should have all imports working together without conflicts', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Test that all imported components work together
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Multiple imported UI components should work together
      const messageInput = screen.getByPlaceholderText(/Enter command/i);
      const sendButton = screen.getByText('Send');
      const toolModeButton = screen.getByText('Tool Mode');

      // All should be functional
      fireEvent.change(messageInput, { target: { value: 'integration test' } });
      fireEvent.click(toolModeButton);

      expect((messageInput as HTMLInputElement).value).toBe('integration test');
      expect(screen.getByText('Chat Mode')).toBeInTheDocument();
      expect(sendButton).toBeInTheDocument();

      // Switch to activity tab to test StreamingTickerWorking integration
      const activityTab = screen.getByText('Live Activity');
      fireEvent.click(activityTab);

      const streamingTicker = screen.getByTestId('streaming-ticker-working');
      expect(streamingTicker).toBeInTheDocument();
    });

    it('should handle import dependencies correctly', () => {
      // Test that components with dependencies work
      render(<EnhancedAviDMWithClaudeCode />);

      // Tabs component should handle TabsList, TabsTrigger, TabsContent
      const tabs = [
        screen.getByText('Avi Chat'),
        screen.getByText('Claude Code'),
        screen.getByText('Live Activity')
      ];

      tabs.forEach(tab => {
        fireEvent.click(tab);
        expect(tab.closest('[role="tab"]')).toHaveAttribute('data-state', 'active');
      });

      // Card components should handle CardHeader, CardTitle, CardContent
      const cardTitles = screen.getAllByText(/Interface|Ticker|Status/);
      expect(cardTitles.length).toBeGreaterThan(0);
    });
  });

  describe('TDD REFACTOR: Import Optimization', () => {
    it('should use imports efficiently', () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // All imports should be used (no unused imports)
      // Component should render all UI components
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Test that imported components are all utilized
      expect(screen.getByRole('tablist')).toBeInTheDocument(); // Tabs
      expect(screen.getByText('Claude Code Interface')).toBeInTheDocument(); // Card
      expect(screen.getByText('Send')).toBeInTheDocument(); // Button
      expect(screen.getByText('Tool')).toBeInTheDocument(); // Badge

      const activityTab = screen.getByText('Live Activity');
      fireEvent.click(activityTab);
      expect(screen.getByTestId('streaming-ticker-working')).toBeInTheDocument();

      const aviDmTab = screen.getByText('Avi Chat');
      fireEvent.click(aviDmTab);
      expect(screen.getByText(/Original Avi DM functionality/)).toBeInTheDocument(); // Alert
    });

    it('should avoid import conflicts', () => {
      // Test that imports don't conflict with each other
      render(<EnhancedAviDMWithClaudeCode />);

      // Multiple components with similar names should work
      const claudeCodeTab = screen.getByText('Claude Code');
      fireEvent.click(claudeCodeTab);

      // Multiple Button components should work
      const toolModeButton = screen.getByText('Tool Mode');
      const sendButton = screen.getByText('Send');

      expect(toolModeButton).toBeInTheDocument();
      expect(sendButton).toBeInTheDocument();

      // Both should be functional
      fireEvent.click(toolModeButton);
      expect(screen.getByText('Chat Mode')).toBeInTheDocument();
    });
  });
});