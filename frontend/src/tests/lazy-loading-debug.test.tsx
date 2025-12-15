/**
 * Debug test specifically for lazy loading issue
 */

import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Test direct import vs lazy import
const DirectEnhancedAnalyticsPage = React.lazy(() => import('../components/analytics/EnhancedAnalyticsPage'));

describe('Lazy Loading Debug Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be able to lazy load EnhancedAnalyticsPage directly', async () => {
    const TestComponent = () => (
      <Suspense fallback={<div data-testid="loading">Loading...</div>}>
        <DirectEnhancedAnalyticsPage />
      </Suspense>
    );

    render(<TestComponent />);

    // Initially should show loading
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for component to load
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // Should have some content from EnhancedAnalyticsPage
    expect(
      screen.queryByText(/Claude Code SDK Analytics/i) ||
      screen.queryByText(/Cost Overview/i) ||
      screen.queryByText(/Analytics/i)
    ).toBeTruthy();
  });

  it('should test if the component export is correct', async () => {
    // Try to import the component directly
    const { default: EnhancedAnalyticsPage } = await import('../components/analytics/EnhancedAnalyticsPage');
    expect(EnhancedAnalyticsPage).toBeDefined();
    expect(typeof EnhancedAnalyticsPage).toBe('function');
  });

  it('should render EnhancedAnalyticsPage directly without lazy loading', async () => {
    const { default: EnhancedAnalyticsPage } = await import('../components/analytics/EnhancedAnalyticsPage');

    render(<EnhancedAnalyticsPage />);

    // Should render content immediately
    await waitFor(() => {
      expect(screen.getByText(/Claude Code SDK Analytics/i)).toBeInTheDocument();
    });
  });
});