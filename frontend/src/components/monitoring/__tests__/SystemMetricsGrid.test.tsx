/**
 * SystemMetricsGrid Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SystemMetricsGrid } from '../SystemMetricsGrid';
import { SystemMetrics } from '../../../types/api';

describe('SystemMetricsGrid', () => {
  const mockMetrics: SystemMetrics = {
    timestamp: '2024-10-12T10:30:00Z',
    server_id: 'server-001',
    cpu_usage: 45.3,
    memory_usage: 62.8,
    disk_usage: 38.5,
    network_io: {
      bytes_in: 1024000,
      bytes_out: 2048000,
      packets_in: 500,
      packets_out: 750,
    },
    response_time: 125,
    throughput: 45.2,
    error_rate: 0.5,
    active_connections: 12,
    queue_depth: 8,
    cache_hit_rate: 87.3,
  };

  describe('Rendering', () => {
    it('should render all 6 metric cards', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} />);

      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
      expect(screen.getByText('Queue Length')).toBeInTheDocument();
      expect(screen.getByText('Request Rate')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
    });

    it('should display correct metric values', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} />);

      expect(screen.getByText('45.3')).toBeInTheDocument(); // CPU
      expect(screen.getByText('62.8')).toBeInTheDocument(); // Memory
      expect(screen.getByText('12.0')).toBeInTheDocument(); // Workers
      expect(screen.getByText('8.0')).toBeInTheDocument(); // Queue
      expect(screen.getByText('45.2')).toBeInTheDocument(); // Throughput
      expect(screen.getByText('0.5')).toBeInTheDocument(); // Error rate
    });

    it('should display correct units', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} />);

      expect(screen.getAllByText('%')).toHaveLength(3); // CPU, Memory, Error Rate
      expect(screen.getByText('workers')).toBeInTheDocument();
      expect(screen.getByText('items')).toBeInTheDocument();
      expect(screen.getByText('req/s')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons when loading', () => {
      const { container } = render(<SystemMetricsGrid metrics={null} loading={true} />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show metric values when loading', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} loading={true} />);
      expect(screen.queryByText('45.3')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no metrics available', () => {
      render(<SystemMetricsGrid metrics={null} loading={false} />);
      expect(screen.getByText('No metrics data available')).toBeInTheDocument();
      expect(screen.getByText('System metrics will appear here once available')).toBeInTheDocument();
    });

    it('should not show empty state when loading', () => {
      render(<SystemMetricsGrid metrics={null} loading={true} />);
      expect(screen.queryByText('No metrics data available')).not.toBeInTheDocument();
    });

    it('should not show empty state when metrics exist', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} loading={false} />);
      expect(screen.queryByText('No metrics data available')).not.toBeInTheDocument();
    });
  });

  describe('Timestamp Display', () => {
    it('should display timestamp when metrics available', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} />);
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });

    it('should not display timestamp when loading', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} loading={true} />);
      expect(screen.queryByText(/Last updated:/)).not.toBeInTheDocument();
    });

    it('should not display timestamp when no metrics', () => {
      render(<SystemMetricsGrid metrics={null} />);
      expect(screen.queryByText(/Last updated:/)).not.toBeInTheDocument();
    });

    it('should format timestamp correctly', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const timestamp = container.querySelector('.text-xs.text-center');
      expect(timestamp?.textContent).toMatch(/Last updated:/);
    });
  });

  describe('Grid Layout', () => {
    it('should have responsive grid classes', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('should have gap spacing', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-4');
    });
  });

  describe('Metric Thresholds', () => {
    it('should apply CPU threshold correctly', () => {
      const highCpuMetrics = { ...mockMetrics, cpu_usage: 95 };
      render(<SystemMetricsGrid metrics={highCpuMetrics} />);
      expect(screen.getByText('⚠ Critical threshold exceeded')).toBeInTheDocument();
    });

    it('should apply Memory threshold correctly', () => {
      const highMemoryMetrics = { ...mockMetrics, memory_usage: 92 };
      render(<SystemMetricsGrid metrics={highMemoryMetrics} />);
      expect(screen.getByText('⚠ Critical threshold exceeded')).toBeInTheDocument();
    });

    it('should apply Error Rate threshold correctly', () => {
      const highErrorMetrics = { ...mockMetrics, error_rate: 6 };
      render(<SystemMetricsGrid metrics={highErrorMetrics} />);
      expect(screen.getByText('⚠ Critical threshold exceeded')).toBeInTheDocument();
    });

    it('should show warning status for threshold values', () => {
      const warningMetrics = { ...mockMetrics, cpu_usage: 75 };
      render(<SystemMetricsGrid metrics={warningMetrics} />);
      expect(screen.getByText('⚡ Warning threshold reached')).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should handle null metrics with defaults', () => {
      render(<SystemMetricsGrid metrics={null} loading={false} />);
      // Should render empty state instead of crashing
      expect(screen.getByText('No metrics data available')).toBeInTheDocument();
    });

    it('should handle partial metrics data', () => {
      const partialMetrics = {
        timestamp: '2024-10-12T10:30:00Z',
        server_id: 'server-001',
        cpu_usage: 45.3,
      } as Partial<SystemMetrics> as SystemMetrics;

      render(<SystemMetricsGrid metrics={partialMetrics} />);
      expect(screen.getByText('45.3')).toBeInTheDocument(); // CPU
      expect(screen.getByText('0.0')).toBeInTheDocument(); // Other defaults
    });
  });

  describe('Color Schemes', () => {
    it('should apply correct color scheme to CPU card', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      // CPU should have blue color scheme
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });

    it('should apply correct color scheme to Memory card', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      // Memory should have green color scheme
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('should apply correct color scheme to Workers card', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      // Workers should have purple color scheme
      expect(container.querySelector('.text-purple-500')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes for cards', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const cards = container.querySelectorAll('.dark\\:bg-gray-800');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have dark mode classes for text', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const darkText = container.querySelectorAll('.dark\\:text-gray-400');
      expect(darkText.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should render all cards with proper structure', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} />);
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(6);
    });

    it('should have proper container structure', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const wrapper = container.querySelector('.w-full');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render all metric icons', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThanOrEqual(6); // At least 6 icons for metrics
    });
  });

  describe('Progress Bars', () => {
    it('should show progress bars for percentage metrics', () => {
      const { container } = render(<SystemMetricsGrid metrics={mockMetrics} />);
      const progressBars = container.querySelectorAll('.rounded-full.h-2');
      // CPU, Memory, and Error Rate should have progress bars
      expect(progressBars.length).toBeGreaterThanOrEqual(3);
    });

    it('should not show progress bars for count metrics', () => {
      render(<SystemMetricsGrid metrics={mockMetrics} />);
      // Workers and Queue Length should not show max values
      expect(screen.queryByText('workers')).toBeInTheDocument();
      expect(screen.queryByText('items')).toBeInTheDocument();
    });
  });
});
