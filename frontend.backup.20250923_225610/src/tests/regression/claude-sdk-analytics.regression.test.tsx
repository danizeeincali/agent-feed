/**
 * Regression Tests for Claude SDK Analytics Integration
 * Ensures existing functionality continues to work after changes
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockClaudeCodeAPI, setupMockScenario } from '@/tests/mocks/claude-code-sdk.mock';
import { AviDirectChatSDK } from '@/components/posting-interface/AviDirectChatSDK';
import TokenCostAnalytics from '@/components/TokenCostAnalytics';
import { CostTrackingService } from '@/services/cost-tracking/CostTrackingService';

// Test setup utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
    mutations: { retry: false }
  }
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Claude SDK Analytics Regression Tests', () => {
  let costTrackingService: CostTrackingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClaudeCodeAPI.reset();

    // Mock fetch to use our mock API
    (global.fetch as any).mockImplementation((url: string, options?: RequestInit) => {
      return mockClaudeCodeAPI.mockFetch(url, options);
    });

    costTrackingService = new CostTrackingService({
      budgetLimits: { daily: 10, weekly: 50, monthly: 200 },
      alertThresholds: { warning: 80, critical: 95 },
      enableRealTimeTracking: true,
      enableAuditing: false,
      storageKey: 'regression-test-cost-tracking'
    });
  });

  afterEach(() => {
    cleanup();
    costTrackingService.destroy();
    mockClaudeCodeAPI.reset();
  });

  describe('AviDirectChatSDK Regression Tests', () => {
    it('should maintain backward compatibility with existing message handling', async () => {
      setupMockScenario('successfulTextMessage');

      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      // Test that basic functionality still works
      const messageInput = screen.getByPlaceholder('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      expect(messageInput).toBeInTheDocument();
      expect(sendButton).toBeInTheDocument();

      // Send a message
      await userEvent.type(messageInput, 'Test message for regression');
      await userEvent.click(sendButton);

      // Should show the response
      await waitFor(() => {
        expect(screen.getByText(/I understand your request/i)).toBeInTheDocument();
      });

      // Should track usage
      expect(mockClaudeCodeAPI.getCallCount('streaming-chat')).toBe(1);
    });

    it('should preserve error handling behavior', async () => {
      setupMockScenario('networkError');

      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      const messageInput = screen.getByPlaceholder('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(messageInput, 'Test error scenario');
      await userEvent.click(sendButton);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/Network request failed/i)).toBeInTheDocument();
      });

      // Error indicator should be visible
      expect(screen.getByTestId('avi-chat-sdk')).toHaveTextContent('Connection error');
    });

    it('should maintain image handling functionality', async () => {
      setupMockScenario('successfulImageProcessing');

      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      // Mock file input
      const fileInput = screen.getByDisplayValue('') as HTMLInputElement;
      const file = new File(['test image'], 'test.png', { type: 'image/png' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should show selected image
      await waitFor(() => {
        expect(screen.getByText('test.png')).toBeInTheDocument();
      });

      // Send message with image
      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      // Should process image
      await waitFor(() => {
        expect(screen.getByText(/screenshot showing a code editor/i)).toBeInTheDocument();
      });
    });

    it('should preserve streaming ticker integration', async () => {
      setupMockScenario('successfulTextMessage');

      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      // Should show streaming ticker
      expect(screen.getByText(/Real-time progress/i)).toBeInTheDocument();

      // Send message to activate streaming
      const messageInput = screen.getByPlaceholder('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(messageInput, 'Test streaming');
      await userEvent.click(sendButton);

      // Streaming ticker should be active during processing
      await waitFor(() => {
        const ticker = screen.getByText(/Real-time progress/i).closest('div');
        expect(ticker).toBeInTheDocument();
      });
    });
  });

  describe('TokenCostAnalytics Regression Tests', () => {
    it('should maintain disabled state behavior', () => {
      render(
        <TestWrapper>
          <TokenCostAnalytics />
        </TestWrapper>
      );

      // Should show disabled state banner
      expect(screen.getByTestId('token-cost-analytics-disabled')).toBeInTheDocument();
      expect(screen.getByText('Token Cost Analytics - Coming Soon')).toBeInTheDocument();

      // Should show graceful degradation message
      expect(screen.getByText(/SPARC Implementation/i)).toBeInTheDocument();
    });

    it('should preserve placeholder layout structure', () => {
      render(
        <TestWrapper>
          <TokenCostAnalytics />
        </TestWrapper>
      );

      // Should show placeholder layout
      expect(screen.getByTestId('token-cost-analytics-placeholder')).toBeInTheDocument();

      // Should have main header
      expect(screen.getByText('Token Cost Analytics')).toBeInTheDocument();

      // Should show time range selector
      expect(screen.getByText('1h')).toBeInTheDocument();
      expect(screen.getByText('1d')).toBeInTheDocument();
      expect(screen.getByText('7d')).toBeInTheDocument();
      expect(screen.getByText('30d')).toBeInTheDocument();
    });

    it('should maintain export functionality structure', () => {
      render(
        <TestWrapper>
          <TokenCostAnalytics enableExport={true} />
        </TestWrapper>
      );

      // Export button should be present
      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();

      // Should handle export click
      fireEvent.click(exportButton);
      // Since this is disabled mode, it won't actually export but should not error
    });

    it('should preserve budget alert structure', () => {
      render(
        <TestWrapper>
          <TokenCostAnalytics showBudgetAlerts={true} />
        </TestWrapper>
      );

      // Should show budget cards structure
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Total Tokens')).toBeInTheDocument();
      expect(screen.getByText('Avg Cost/Token')).toBeInTheDocument();
    });
  });

  describe('Cost Tracking Service Regression Tests', () => {
    it('should maintain API compatibility for token tracking', async () => {
      // Test that the service API hasn't changed
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 100,
        requestType: 'chat',
        component: 'RegressionTest'
      });

      const metrics = costTrackingService.getCostMetrics();
      expect(metrics.totalTokensUsed).toBe(100);
      expect(metrics.totalCost).toBeGreaterThan(0);
    });

    it('should preserve event system behavior', async () => {
      const eventCallback = vi.fn();
      costTrackingService.on('usage-tracked', eventCallback);

      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 150,
        requestType: 'chat',
        component: 'EventTest'
      });

      expect(eventCallback).toHaveBeenCalledOnce();
      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          tokensUsed: 150,
          provider: 'claude'
        })
      );
    });

    it('should maintain storage compatibility', () => {
      const config = costTrackingService.getConfig();
      expect(config.budgetLimits).toBeDefined();
      expect(config.alertThresholds).toBeDefined();
      expect(config.enableRealTimeTracking).toBe(true);
    });

    it('should preserve budget alert thresholds', async () => {
      const alertCallback = vi.fn();
      costTrackingService.on('budget-alerts', alertCallback);

      // Trigger budget alert
      await costTrackingService.trackTokenUsage({
        provider: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        tokensUsed: 2800000, // High usage to trigger alert
        requestType: 'chat',
        component: 'BudgetTest'
      });

      expect(alertCallback).toHaveBeenCalled();
    });
  });

  describe('Integration Regression Tests', () => {
    it('should maintain end-to-end flow from chat to analytics', async () => {
      setupMockScenario('successfulTextMessage');

      // Render chat component
      const { rerender } = render(
        <TestWrapper>
          <AviDirectChatSDK onMessageSent={(message) => {
            // Simulate cost tracking
            costTrackingService.trackTokenUsage({
              provider: 'claude',
              model: 'claude-3-5-sonnet-20241022',
              tokensUsed: 80,
              requestType: 'chat',
              component: 'AviDirectChatSDK'
            });
          }} />
        </TestWrapper>
      );

      // Send message
      const messageInput = screen.getByPlaceholder('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await userEvent.type(messageInput, 'Integration test message');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/I understand your request/i)).toBeInTheDocument();
      });

      // Switch to analytics view
      rerender(
        <TestWrapper>
          <TokenCostAnalytics />
        </TestWrapper>
      );

      // Analytics should show (even in disabled state)
      expect(screen.getByTestId('token-cost-analytics-disabled')).toBeInTheDocument();
      expect(screen.getByText('Token Cost Analytics - Coming Soon')).toBeInTheDocument();
    });

    it('should preserve API response format', async () => {
      setupMockScenario('successfulTextMessage');

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test API format' })
      });

      const data = await response.json();

      // Verify response structure hasn't changed
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('responses');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('claudeCode');
      expect(data).toHaveProperty('toolsEnabled');

      // New properties should be added without breaking existing ones
      expect(data).toHaveProperty('usage');
      expect(data).toHaveProperty('model');
      expect(data.usage).toHaveProperty('total_tokens');
    });

    it('should maintain error response structure', async () => {
      setupMockScenario('serverError');

      const response = await fetch('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test error' })
      });

      const data = await response.json();

      // Error structure should be preserved
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain rendering performance for chat component', async () => {
      setupMockScenario('successfulTextMessage');

      const startTime = performance.now();

      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(100);
    });

    it('should maintain cost tracking performance', async () => {
      const startTime = performance.now();

      // Track multiple usage events
      const promises = Array.from({ length: 50 }, (_, i) =>
        costTrackingService.trackTokenUsage({
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          requestType: 'chat',
          component: 'PerformanceTest',
          metadata: { index: i }
        })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(100);

      // All events should be tracked
      const usage = costTrackingService.getUsageData({ component: 'PerformanceTest' });
      expect(usage).toHaveLength(50);
    });

    it('should maintain metrics calculation performance', () => {
      const startTime = performance.now();

      // Calculate metrics multiple times
      for (let i = 0; i < 10; i++) {
        const metrics = costTrackingService.getCostMetrics();
        expect(metrics).toBeDefined();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be fast
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Data Compatibility Regression Tests', () => {
    it('should handle legacy data format gracefully', () => {
      // Test with old data format
      const legacyData = {
        usageData: [{
          id: 'legacy-1',
          timestamp: new Date().toISOString(),
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          tokensUsed: 100,
          estimatedCost: 0.003,
          requestType: 'chat'
          // Missing newer fields like sessionId, metadata
        }]
      };

      // Mock localStorage with legacy data
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(legacyData)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      // Should handle legacy data without errors
      const legacyService = new CostTrackingService({
        budgetLimits: { daily: 10, weekly: 50, monthly: 200 },
        alertThresholds: { warning: 80, critical: 95 },
        enableRealTimeTracking: true,
        enableAuditing: false,
        storageKey: 'legacy-test'
      });

      const usage = legacyService.getUsageData();
      expect(usage).toHaveLength(1);
      expect(usage[0].id).toBe('legacy-1');

      legacyService.destroy();
    });

    it('should preserve configuration schema compatibility', () => {
      const config = {
        budgetLimits: { daily: 15, weekly: 75, monthly: 300 },
        alertThresholds: { warning: 85, critical: 98 },
        enableRealTimeTracking: false,
        enableAuditing: true,
        storageKey: 'compatibility-test'
      };

      const compatibilityService = new CostTrackingService(config);
      const retrievedConfig = compatibilityService.getConfig();

      expect(retrievedConfig).toEqual(config);
      compatibilityService.destroy();
    });
  });

  describe('Visual Regression Tests', () => {
    it('should maintain CSS classes and structure for chat component', () => {
      render(
        <TestWrapper>
          <AviDirectChatSDK />
        </TestWrapper>
      );

      // Verify main container structure
      const chatContainer = screen.getByTestId('avi-chat-sdk');
      expect(chatContainer).toHaveClass('flex', 'flex-col', 'h-full', 'bg-white');

      // Verify header structure
      const header = chatContainer.querySelector('.border-b.border-gray-200');
      expect(header).toBeInTheDocument();

      // Verify greeting structure
      const greeting = screen.getByTestId('avi-greeting');
      expect(greeting).toBeInTheDocument();
    });

    it('should maintain analytics component structure', () => {
      render(
        <TestWrapper>
          <TokenCostAnalytics />
        </TestWrapper>
      );

      // Verify disabled state structure
      const disabledBanner = screen.getByText('Token Cost Analytics - Coming Soon')
        .closest('.bg-amber-50');
      expect(disabledBanner).toBeInTheDocument();

      // Verify placeholder structure
      const placeholder = screen.getByTestId('token-cost-analytics-placeholder');
      expect(placeholder).toBeInTheDocument();
    });
  });
});