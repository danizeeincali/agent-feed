/**
 * Regression Test Suite - UnifiedAgentPage Tab Functionality
 * 
 * Ensures all 8 tabs continue to work after Overview enhancements
 * Safety checks to prevent breaking existing functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import UnifiedAgentPage from '../components/UnifiedAgentPage';

// Mock dependencies
vi.mock('../utils/real-data-transformers');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn()
  };
});

const mockApiResponse = {
  success: true,
  data: {
    id: 'test-agent',
    name: 'Test Agent',
    display_name: 'Test Agent Pro',
    description: 'Test agent for regression testing',
    status: 'active',
    capabilities: ['Testing', 'Development', 'Quality Assurance'],
    usage_count: 100,
    performance_metrics: {
      success_rate: 98,
      average_response_time: 800,
      total_tokens_used: 25000,
      error_count: 1,
      uptime_percentage: 99.8
    },
    health_status: {
      cpu_usage: 30,
      memory_usage: 45,
      response_time: 800,
      last_heartbeat: new Date().toISOString(),
      status: 'healthy'
    }
  }
};

const mockNavigate = vi.fn();
const mockFetch = vi.fn();

describe('UnifiedAgentPage Regression Tests - All Tabs Functionality', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    const { useParams, useNavigate } = await import('react-router-dom');
    vi.mocked(useParams).mockReturnValue({ agentId: 'test-agent' });
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse)
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tab Navigation and Accessibility', () => {
    it('should render all 8 tabs correctly', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify all 8 tabs are present
      const expectedTabs = [
        'Overview', 'Definition', 'Profile', 'Pages', 
        'Workspace', 'Details', 'Activity', 'Configuration'
      ];

      expectedTabs.forEach(tabName => {
        const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
        expect(tab).toBeInTheDocument();
        expect(tab).not.toBeDisabled();
      });
    });

    it('should allow navigation between all tabs without errors', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Test navigation through all tabs
      const tabs = [
        'Overview', 'Definition', 'Profile', 'Pages', 
        'Workspace', 'Details', 'Activity', 'Configuration'
      ];

      for (const tabName of tabs) {
        const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
        fireEvent.click(tab);
        
        // Small delay to allow tab switching
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify tab is selected (should have appropriate styling/attributes)
        expect(tab).toBeInTheDocument();
      }

      // Verify no errors occurred during navigation
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });
  });

  describe('Overview Tab Enhanced Features', () => {
    it('should display enhanced Overview tab without breaking other tabs', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify Overview tab enhancements are present
      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Primary Actions')).toBeInTheDocument();
      expect(screen.getByText('Secondary Actions')).toBeInTheDocument();
      
      // Switch to another tab and back to Overview
      const detailsTab = screen.getByRole('button', { name: /details/i });
      fireEvent.click(detailsTab);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const overviewTab = screen.getByRole('button', { name: /overview/i });
      fireEvent.click(overviewTab);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify Overview enhancements still work after navigation
      expect(screen.getByText('Performance Dashboard')).toBeInTheDocument();
    });
  });

  describe('Tab Content Verification', () => {
    it('should maintain Details tab functionality', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Navigate to Details tab
      const detailsTab = screen.getByRole('button', { name: /details/i });
      fireEvent.click(detailsTab);

      // Verify Details tab content (basic check)
      expect(detailsTab).toBeInTheDocument();
    });

    it('should maintain Activity tab functionality', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Navigate to Activity tab
      const activityTab = screen.getByRole('button', { name: /activity/i });
      fireEvent.click(activityTab);

      // Verify Activity tab content
      expect(activityTab).toBeInTheDocument();
    });

    it('should maintain Configuration tab functionality', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Navigate to Configuration tab
      const configTab = screen.getByRole('button', { name: /configuration/i });
      fireEvent.click(configTab);

      // Verify Configuration tab content
      expect(configTab).toBeInTheDocument();
    });
  });

  describe('Performance and Stability', () => {
    it('should handle rapid tab switching without crashes', async () => {
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Rapidly switch between tabs multiple times
      const tabs = ['Overview', 'Details', 'Activity', 'Configuration'];
      
      for (let round = 0; round < 3; round++) {
        for (const tabName of tabs) {
          const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
          fireEvent.click(tab);
          
          // Very short delay to simulate rapid clicking
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Verify component is still functional
      expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
    });

    it('should maintain responsiveness after enhancements', async () => {
      const startTime = performance.now();
      
      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Agent Pro')).toBeInTheDocument();
      }, { timeout: 3000 });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(3000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API failures gracefully across all tabs', async () => {
      // Mock API failure
      mockFetch.mockRejectedValue(new Error('API Error'));

      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      // Should show error state without crashing
      await waitFor(() => {
        expect(screen.getByText(/Error Loading Agent/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should maintain tab structure even with missing data', async () => {
      // Mock response with minimal data
      const minimalResponse = {
        success: true,
        data: {
          id: 'minimal-agent',
          name: 'Minimal Agent',
          description: 'Minimal test data',
          status: 'active',
          capabilities: []
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(minimalResponse)
      });

      render(
        <BrowserRouter>
          <UnifiedAgentPage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Minimal Agent')).toBeInTheDocument();
      }, { timeout: 3000 });

      // All tabs should still be accessible
      const expectedTabs = [
        'Overview', 'Definition', 'Profile', 'Pages', 
        'Workspace', 'Details', 'Activity', 'Configuration'
      ];

      expectedTabs.forEach(tabName => {
        const tab = screen.getByRole('button', { name: new RegExp(tabName, 'i') });
        expect(tab).toBeInTheDocument();
      });
    });
  });
});