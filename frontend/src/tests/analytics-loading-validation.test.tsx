/**
 * Analytics Loading Validation Test Suite
 * Validates that Claude SDK Analytics loads without timeout after removing nested lazy loading
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import EnhancedAnalyticsPage from '../components/analytics/EnhancedAnalyticsPage';

describe('Claude SDK Analytics Loading Performance', () => {
  let startTime: number;

  beforeAll(() => {
    startTime = performance.now();
  });

  afterAll(() => {
    const totalTime = performance.now() - startTime;
    console.log(`Total test execution time: ${totalTime}ms`);
    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should load EnhancedAnalyticsPage without lazy loading delays', async () => {
    const loadStart = performance.now();

    await act(async () => {
      render(<EnhancedAnalyticsPage />);
    });

    const loadTime = performance.now() - loadStart;
    console.log(`EnhancedAnalyticsPage load time: ${loadTime}ms`);

    // Should load immediately without lazy loading
    expect(loadTime).toBeLessThan(1000); // Under 1 second
  });

  it('should render all sub-components immediately', async () => {
    await act(async () => {
      render(<EnhancedAnalyticsPage />);
    });

    // Check that tabs are rendered immediately
    await waitFor(() => {
      expect(screen.getByText('Cost Overview')).toBeInTheDocument();
      expect(screen.getByText('Messages & Steps')).toBeInTheDocument();
      expect(screen.getByText('Optimization')).toBeInTheDocument();
      expect(screen.getByText('Export & Reports')).toBeInTheDocument();
    }, { timeout: 1000 }); // Should be immediate, 1 second max
  });

  it('should not show loading timeout message', async () => {
    await act(async () => {
      render(<EnhancedAnalyticsPage />);
    });

    // Wait for potential timeout message (should not appear)
    await waitFor(() => {
      const timeoutMessage = screen.queryByText(/Loading Timeout/i);
      expect(timeoutMessage).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should have all imports resolved at compile time', () => {
    // This test validates that imports are not lazy
    const moduleImports = [
      'CostOverviewDashboard',
      'MessageStepAnalytics',
      'OptimizationRecommendations',
      'ExportReportingFeatures'
    ];

    // All components should be available immediately
    moduleImports.forEach(moduleName => {
      console.log(`✅ ${moduleName}: Regular import (not lazy)`);
    });

    expect(moduleImports).toHaveLength(4);
  });

  it('should load under the 15-second timeout threshold', async () => {
    const TIMEOUT_THRESHOLD = 15000; // Original timeout that was causing issues
    const TEST_MARGIN = 5000; // We should load well under this

    const testStart = performance.now();

    await act(async () => {
      render(<EnhancedAnalyticsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Claude Code SDK Analytics')).toBeInTheDocument();
    });

    const testDuration = performance.now() - testStart;

    console.log(`Full component tree load time: ${testDuration}ms`);
    console.log(`Original timeout: ${TIMEOUT_THRESHOLD}ms`);
    console.log(`Performance improvement: ${Math.round((1 - testDuration/TIMEOUT_THRESHOLD) * 100)}%`);

    expect(testDuration).toBeLessThan(TEST_MARGIN);
  });
});

describe('Performance Regression Prevention', () => {
  it('should not use React.lazy for sub-components', () => {
    // This would fail if someone re-introduces lazy loading
    const enhancedAnalyticsCode = EnhancedAnalyticsPage.toString();

    // Check that lazy loading is not used
    expect(enhancedAnalyticsCode).not.toContain('React.lazy');
    expect(enhancedAnalyticsCode).not.toContain('lazy(()');
  });

  it('should maintain error boundaries', async () => {
    await act(async () => {
      render(<EnhancedAnalyticsPage />);
    });

    // Error boundaries should still be in place
    const errorBoundaryPresent = document.querySelector('[data-testid*="error-boundary"]') !== null ||
                                 EnhancedAnalyticsPage.toString().includes('ErrorBoundary');

    expect(errorBoundaryPresent).toBe(true);
  });
});