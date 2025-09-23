/**
 * Test to verify EnhancedAnalyticsPage loads without timeout after SPARC fixes
 * This test validates that the 30-second timeout is sufficient for component loading
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import React from 'react';

// Import the components we're testing
import EnhancedAnalyticsPage from '../../components/analytics/EnhancedAnalyticsPage';
import { AnalyticsSuspenseWrapper } from '../../components/analytics/AnalyticsWhiteScreenPrevention';

describe('SPARC Fix: EnhancedAnalyticsPage Timeout Resolution', () => {
  let startTime: number;

  beforeAll(() => {
    startTime = Date.now();
    console.log('🔧 SPARC Fix Test: Starting timeout resolution validation...');
  });

  afterAll(() => {
    const totalTime = Date.now() - startTime;
    console.log(`✅ SPARC Fix Test completed in ${totalTime}ms`);
  });

  it('should load EnhancedAnalyticsPage within 30-second timeout', async () => {
    const loadStartTime = Date.now();
    console.log('⏱️ Testing component load time...');

    await act(async () => {
      const { container } = render(
        <AnalyticsSuspenseWrapper
          componentName="Enhanced Analytics Page"
          timeout={30000}
          fallback={<div data-testid="loading-fallback">Loading Claude SDK Analytics...</div>}
        >
          <EnhancedAnalyticsPage />
        </AnalyticsSuspenseWrapper>
      );

      // Wait for component to load (max 25 seconds to allow buffer)
      await waitFor(
        () => {
          // Check that we don't see timeout message
          const timeoutElement = screen.queryByText(/Loading Timeout/i);
          expect(timeoutElement).not.toBeInTheDocument();

          // Check that we see the analytics content
          const analyticsTitle = screen.queryByText(/Claude Code SDK Analytics/i);
          expect(analyticsTitle).toBeInTheDocument();
        },
        { timeout: 25000 } // 25 seconds to allow for loading
      );
    });

    const loadTime = Date.now() - loadStartTime;
    console.log(`📊 EnhancedAnalyticsPage loaded successfully in ${loadTime}ms`);

    // Verify load time is reasonable (under 30 seconds)
    expect(loadTime).toBeLessThan(30000);
  });

  it('should not show timeout error with 30-second limit', async () => {
    console.log('🚫 Testing timeout prevention...');

    await act(async () => {
      render(
        <AnalyticsSuspenseWrapper
          componentName="Enhanced Analytics Page"
          timeout={30000}
        >
          <EnhancedAnalyticsPage />
        </AnalyticsSuspenseWrapper>
      );

      // Wait 20 seconds - should not timeout
      await new Promise(resolve => setTimeout(resolve, 20000));
    });

    // Should not see timeout message after 20 seconds
    const timeoutMessage = screen.queryByText(/Loading Timeout/i);
    expect(timeoutMessage).not.toBeInTheDocument();

    console.log('✅ No timeout detected within 20 seconds - fix successful!');
  });

  it('should render all sub-components without errors', async () => {
    console.log('🔍 Testing sub-component rendering...');

    await act(async () => {
      render(<EnhancedAnalyticsPage />);
    });

    // Wait for component to fully render
    await waitFor(
      () => {
        // Check for tabs
        expect(screen.getByText('Cost Overview')).toBeInTheDocument();
        expect(screen.getByText('Messages & Steps')).toBeInTheDocument();
        expect(screen.getByText('Optimization')).toBeInTheDocument();
        expect(screen.getByText('Export & Reports')).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    console.log('✅ All sub-components rendered successfully!');
  });

  it('should verify improved loading performance', async () => {
    console.log('⚡ Testing loading performance improvement...');

    const performanceStart = Date.now();

    // Test multiple renders to ensure consistent performance
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        const { unmount } = render(<EnhancedAnalyticsPage />);

        await waitFor(
          () => {
            expect(screen.getByText('Claude Code SDK Analytics')).toBeInTheDocument();
          },
          { timeout: 5000 }
        );

        unmount();
      });
    }

    const averageLoadTime = (Date.now() - performanceStart) / 3;
    console.log(`📈 Average load time over 3 renders: ${averageLoadTime.toFixed(2)}ms`);

    // Should load consistently under 10 seconds per render
    expect(averageLoadTime).toBeLessThan(10000);
  });

  it('should handle error boundaries without timeout issues', async () => {
    console.log('🛡️ Testing error boundary integration...');

    // Test that error boundaries don't interfere with loading
    await act(async () => {
      render(
        <AnalyticsSuspenseWrapper
          componentName="Enhanced Analytics Page"
          timeout={30000}
          fallback={<div>Loading with error boundary...</div>}
        >
          <EnhancedAnalyticsPage />
        </AnalyticsSuspenseWrapper>
      );
    });

    await waitFor(
      () => {
        // Should render successfully with error boundaries
        expect(screen.getByText('Claude Code SDK Analytics')).toBeInTheDocument();

        // Should not show any error states
        const errorElements = screen.queryAllByText(/error/i);
        expect(errorElements.length).toBe(0);
      },
      { timeout: 15000 }
    );

    console.log('✅ Error boundary integration working correctly!');
  });
});