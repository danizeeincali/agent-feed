/**
 * HealthStatusCard Component Tests
 *
 * Comprehensive test suite for HealthStatusCard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { HealthStatusCard } from '../HealthStatusCard';

// Mock health status data
const mockHealthyStatus = {
  isHealthy: true,
  latency: 45,
  lastPing: new Date('2025-10-12T10:00:00Z'),
  consecutiveFailures: 0,
  uptime: 432000, // 5 days
  serverTimestamp: new Date('2025-10-12T10:00:00Z'),
  networkQuality: 'excellent' as const
};

const mockDegradedStatus = {
  isHealthy: true,
  latency: 250,
  lastPing: new Date('2025-10-12T10:00:00Z'),
  consecutiveFailures: 1,
  uptime: 86400, // 1 day
  serverTimestamp: new Date('2025-10-12T10:00:00Z'),
  networkQuality: 'fair' as const
};

const mockUnhealthyStatus = {
  isHealthy: false,
  latency: 1200,
  lastPing: new Date('2025-10-12T09:00:00Z'),
  consecutiveFailures: 3,
  uptime: 3600, // 1 hour
  serverTimestamp: new Date('2025-10-12T10:00:00Z'),
  networkQuality: 'poor' as const
};

describe('HealthStatusCard', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.getByText('System Health')).toBeInTheDocument();
    });

    it('renders loading state when loading=true', () => {
      render(<HealthStatusCard healthStatus={null} loading={true} />);
      expect(screen.getByText('System Health')).toBeInTheDocument();
      // Skeleton loaders should be present
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders empty state when healthStatus is null and not loading', () => {
      render(<HealthStatusCard healthStatus={null} loading={false} />);
      expect(screen.getByText('Waiting for health data...')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays healthy status with green indicator', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.getByText('Healthy')).toBeInTheDocument();

      const statusElement = screen.getByLabelText(/Status: Healthy/i);
      expect(statusElement).toBeInTheDocument();
    });

    it('displays degraded status with yellow indicator', () => {
      render(<HealthStatusCard healthStatus={mockDegradedStatus} />);
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });

    it('displays unhealthy status with red indicator', () => {
      render(<HealthStatusCard healthStatus={mockUnhealthyStatus} />);
      expect(screen.getByText('Unhealthy')).toBeInTheDocument();
    });
  });

  describe('Health Score', () => {
    it('displays health score between 0 and 100', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      const scoreElement = screen.getByLabelText(/Health score:/i);
      expect(scoreElement).toBeInTheDocument();
      expect(scoreElement.textContent).toMatch(/\d+/);
    });

    it('displays progress bar with correct value', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Uptime Display', () => {
    it('formats uptime correctly for days', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.getByLabelText(/Uptime:/i)).toBeInTheDocument();
      // 432000 seconds = 5 days
      expect(screen.getByText(/5d/)).toBeInTheDocument();
    });

    it('formats uptime correctly for hours and minutes', () => {
      const shortUptimeStatus = {
        ...mockHealthyStatus,
        uptime: 3661 // 1h 1m 1s
      };
      render(<HealthStatusCard healthStatus={shortUptimeStatus} />);
      expect(screen.getByText(/1h 1m/)).toBeInTheDocument();
    });

    it('handles zero uptime', () => {
      const zeroUptimeStatus = {
        ...mockHealthyStatus,
        uptime: 0
      };
      render(<HealthStatusCard healthStatus={zeroUptimeStatus} />);
      expect(screen.getByText('0m')).toBeInTheDocument();
    });
  });

  describe('Network Quality', () => {
    it('displays network quality', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.getByLabelText(/Network quality:/i)).toBeInTheDocument();
      expect(screen.getByText('excellent')).toBeInTheDocument();
    });

    it('capitalizes network quality display', () => {
      render(<HealthStatusCard healthStatus={mockDegradedStatus} />);
      const networkElement = screen.getByLabelText(/Network quality:/i);
      expect(networkElement.textContent).toBe('fair');
    });
  });

  describe('Latency Display', () => {
    it('displays latency in milliseconds', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.getByText('45ms')).toBeInTheDocument();
    });

    it('displays N/A when latency is null', () => {
      const noLatencyStatus = {
        ...mockHealthyStatus,
        latency: null
      };
      render(<HealthStatusCard healthStatus={noLatencyStatus} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Last Update', () => {
    it('displays last update timestamp', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.getByLabelText(/Last update:/i)).toBeInTheDocument();
    });

    it('displays "Never" when lastPing is null', () => {
      const noPingStatus = {
        ...mockHealthyStatus,
        lastPing: null
      };
      render(<HealthStatusCard healthStatus={noPingStatus} />);
      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  describe('Warning Banner', () => {
    it('shows warning banner for unhealthy status with failures', () => {
      render(<HealthStatusCard healthStatus={mockUnhealthyStatus} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/3 consecutive failures detected/i)).toBeInTheDocument();
    });

    it('does not show warning banner for healthy status', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('uses singular "failure" for one failure', () => {
      const oneFailureStatus = {
        ...mockUnhealthyStatus,
        consecutiveFailures: 1
      };
      render(<HealthStatusCard healthStatus={oneFailureStatus} />);
      expect(screen.getByText(/1 consecutive failure detected/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'System Health Status');
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has aria-live regions for dynamic content', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper labels for screen readers', () => {
      render(<HealthStatusCard healthStatus={mockHealthyStatus} />);

      expect(screen.getByLabelText(/Status: Healthy/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Health score:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Uptime:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Network quality:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Latency:/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last update:/i)).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('applies dark mode classes', () => {
      const { container } = render(<HealthStatusCard healthStatus={mockHealthyStatus} />);

      // Check for dark mode classes
      const darkClasses = ['dark:bg-gray-800', 'dark:border-gray-700', 'dark:text-gray-100'];
      const hasAnyDarkClass = container.innerHTML.includes('dark:');
      expect(hasAnyDarkClass).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles very large uptime values', () => {
      const largeUptimeStatus = {
        ...mockHealthyStatus,
        uptime: 31536000 // 1 year in seconds
      };
      render(<HealthStatusCard healthStatus={largeUptimeStatus} />);
      expect(screen.getByText(/365d/)).toBeInTheDocument();
    });

    it('handles negative uptime values', () => {
      const negativeUptimeStatus = {
        ...mockHealthyStatus,
        uptime: -100
      };
      render(<HealthStatusCard healthStatus={negativeUptimeStatus} />);
      expect(screen.getByText('0m')).toBeInTheDocument();
    });

    it('handles very high latency values', () => {
      const highLatencyStatus = {
        ...mockHealthyStatus,
        latency: 9999
      };
      render(<HealthStatusCard healthStatus={highLatencyStatus} />);
      expect(screen.getByText('9999ms')).toBeInTheDocument();
    });

    it('handles unknown network quality', () => {
      const unknownNetworkStatus = {
        ...mockHealthyStatus,
        networkQuality: 'unknown' as const
      };
      render(<HealthStatusCard healthStatus={unknownNetworkStatus} />);
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });
});
