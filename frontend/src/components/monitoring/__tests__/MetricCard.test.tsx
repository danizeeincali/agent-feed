/**
 * MetricCard Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Cpu } from 'lucide-react';
import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  const defaultProps = {
    title: 'CPU Usage',
    icon: Cpu,
    value: 45.5,
    unit: '%',
    max: 100,
  };

  describe('Rendering', () => {
    it('should render title correctly', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    });

    it('should render value with correct precision', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('45.5')).toBeInTheDocument();
    });

    it('should render unit', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('%')).toBeInTheDocument();
    });

    it('should render max value in progress bar', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      const { container } = render(<MetricCard {...defaultProps} loading={true} />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should not show value when loading', () => {
      render(<MetricCard {...defaultProps} loading={true} />);
      expect(screen.queryByText('45.5')).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar when max is provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const progressBar = container.querySelector('[style*="width"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not render progress bar when max is undefined', () => {
      const propsWithoutMax = { ...defaultProps, max: undefined };
      const { container } = render(<MetricCard {...propsWithoutMax} />);
      const progressBar = container.querySelector('.rounded-full.h-2');
      expect(progressBar).not.toBeInTheDocument();
    });

    it('should calculate percentage correctly', () => {
      const { container } = render(<MetricCard {...defaultProps} value={50} max={100} />);
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should cap percentage at 100%', () => {
      const { container } = render(<MetricCard {...defaultProps} value={150} max={100} />);
      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Threshold Colors', () => {
    const threshold = { warning: 70, critical: 90 };

    it('should show green status for normal values', () => {
      render(<MetricCard {...defaultProps} value={50} threshold={threshold} />);
      expect(screen.getByText('✓ Normal operation')).toBeInTheDocument();
    });

    it('should show yellow status for warning values', () => {
      render(<MetricCard {...defaultProps} value={75} threshold={threshold} />);
      expect(screen.getByText('⚡ Warning threshold reached')).toBeInTheDocument();
    });

    it('should show red status for critical values', () => {
      render(<MetricCard {...defaultProps} value={95} threshold={threshold} />);
      expect(screen.getByText('⚠ Critical threshold exceeded')).toBeInTheDocument();
    });

    it('should not show threshold message when no threshold provided', () => {
      render(<MetricCard {...defaultProps} />);
      expect(screen.queryByText(/Normal operation|Warning|Critical/)).not.toBeInTheDocument();
    });
  });

  describe('Color Schemes', () => {
    it('should apply blue color scheme', () => {
      const { container } = render(<MetricCard {...defaultProps} colorScheme="blue" />);
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });

    it('should apply green color scheme', () => {
      const { container } = render(<MetricCard {...defaultProps} colorScheme="green" />);
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('should apply red color scheme', () => {
      const { container } = render(<MetricCard {...defaultProps} colorScheme="red" />);
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('should default to blue when no scheme provided', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });
  });

  describe('Value Formatting', () => {
    it('should format numbers with 1 decimal place', () => {
      render(<MetricCard {...defaultProps} value={45.567} />);
      expect(screen.getByText('45.6')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
      render(<MetricCard {...defaultProps} value={0} />);
      expect(screen.getByText('0.0')).toBeInTheDocument();
    });

    it('should handle integer values', () => {
      render(<MetricCard {...defaultProps} value={45} />);
      expect(screen.getByText('45.0')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.querySelector('.dark\\:bg-gray-800');
      expect(card).toBeInTheDocument();
    });

    it('should have dark mode border classes', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const card = container.querySelector('.dark\\:border-gray-700');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<MetricCard {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('CPU Usage');
    });

    it('should render icon with proper accessibility', () => {
      const { container } = render(<MetricCard {...defaultProps} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });
});
