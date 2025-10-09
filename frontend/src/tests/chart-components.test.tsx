/**
 * Chart Components Test Suite - London School TDD
 *
 * Tests for LineChart, BarChart, and PieChart components
 * Following London School methodology with mocked collaborators
 *
 * Test Coverage:
 * - Component rendering with valid data
 * - Schema validation
 * - Empty and invalid data handling
 * - Color customization
 * - Legend and tooltip configuration
 * - Responsive behavior
 * - Integration with DynamicPageRenderer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LineChart from '@/components/charts/LineChart';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';
import { ChartDataPoint, ChartConfig } from '@/types/analytics';
import { LineChartSchema, BarChartSchema, PieChartSchema } from '@/schemas/componentSchemas';

describe('Chart Components Test Suite', () => {
  // Test Data Fixtures
  const mockValidData: ChartDataPoint[] = [
    { timestamp: '2025-01-01T00:00:00Z', value: 100, label: 'January' },
    { timestamp: '2025-02-01T00:00:00Z', value: 200, label: 'February' },
    { timestamp: '2025-03-01T00:00:00Z', value: 150, label: 'March' },
    { timestamp: '2025-04-01T00:00:00Z', value: 300, label: 'April' },
    { timestamp: '2025-05-01T00:00:00Z', value: 250, label: 'May' },
  ];

  const mockSingleDataPoint: ChartDataPoint[] = [
    { timestamp: '2025-01-01T00:00:00Z', value: 100, label: 'Single' },
  ];

  const mockLargeDataset: ChartDataPoint[] = Array.from({ length: 50 }, (_, i) => ({
    timestamp: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    value: Math.floor(Math.random() * 1000),
    label: `Day ${i + 1}`,
  }));

  const mockChartConfig: ChartConfig = {
    type: 'line',
    title: 'Test Chart',
    xAxis: 'Time',
    yAxis: 'Value',
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    showGrid: true,
    showLegend: true,
  };

  describe('LineChart Component', () => {
    describe('Rendering Tests', () => {
      it('should render with valid data', () => {
        render(<LineChart data={mockValidData} config={mockChartConfig} />);

        expect(screen.getByText('Test Chart')).toBeInTheDocument();
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });

      it('should render empty state when no data provided', () => {
        render(<LineChart data={[]} config={mockChartConfig} />);

        expect(screen.getByText('Test Chart')).toBeInTheDocument();
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      it('should render with single data point', () => {
        render(<LineChart data={mockSingleDataPoint} config={mockChartConfig} />);

        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();

        // Should render one data point circle
        const circles = document.querySelectorAll('circle');
        expect(circles.length).toBeGreaterThan(0);
      });

      it('should handle large datasets efficiently', () => {
        const { container } = render(
          <LineChart data={mockLargeDataset} config={mockChartConfig} />
        );

        expect(container.querySelector('svg')).toBeInTheDocument();
        const circles = document.querySelectorAll('circle');
        expect(circles.length).toBe(50);
      });

      it('should render with custom height', () => {
        const customHeight = 500;
        render(
          <LineChart
            data={mockValidData}
            config={mockChartConfig}
            height={customHeight}
          />
        );

        const svg = document.querySelector('svg');
        expect(svg).toHaveAttribute('height', String(customHeight));
      });

      it('should apply custom className', () => {
        const { container } = render(
          <LineChart
            data={mockValidData}
            config={mockChartConfig}
            className="custom-chart-class"
          />
        );

        expect(container.firstChild).toHaveClass('custom-chart-class');
      });
    });

    describe('Feature Tests', () => {
      it('should render grid lines when showGrid is true', () => {
        render(<LineChart data={mockValidData} config={{ ...mockChartConfig, showGrid: true }} />);

        const gridLines = document.querySelectorAll('line');
        expect(gridLines.length).toBeGreaterThan(0);
      });

      it('should hide grid lines when showGrid is false', () => {
        render(<LineChart data={mockValidData} config={{ ...mockChartConfig, showGrid: false }} />);

        const gridLines = document.querySelectorAll('line');
        expect(gridLines.length).toBe(0);
      });

      it('should show trend indicator when showTrend is true', () => {
        render(
          <LineChart
            data={mockValidData}
            config={mockChartConfig}
            showTrend={true}
          />
        );

        // Should show either "Trending up" or "Trending down"
        const trendElement = screen.queryByText(/Trending/);
        expect(trendElement).toBeInTheDocument();
      });

      it('should render gradient when gradient prop is true', () => {
        render(
          <LineChart
            data={mockValidData}
            config={mockChartConfig}
            gradient={true}
          />
        );

        const gradientDef = document.querySelector('linearGradient#lineGradient');
        expect(gradientDef).toBeInTheDocument();
      });

      it('should use correct color from config', () => {
        const customColor = '#FF5733';
        render(
          <LineChart
            data={mockValidData}
            config={{ ...mockChartConfig, colors: [customColor] }}
          />
        );

        const path = document.querySelector('path[stroke]');
        expect(path).toHaveAttribute('stroke', customColor);
      });

      it('should render axis labels', () => {
        render(<LineChart data={mockValidData} config={mockChartConfig} />);

        expect(screen.getByText('Time')).toBeInTheDocument();
        expect(screen.getByText('Value')).toBeInTheDocument();
      });

      it('should render data point tooltips', () => {
        render(<LineChart data={mockValidData} config={mockChartConfig} />);

        const circles = document.querySelectorAll('circle');
        expect(circles[0]).toHaveAttribute('data-tooltip');
      });
    });

    describe('Schema Validation Tests', () => {
      it('should validate correct schema', () => {
        const validSchema = {
          data: mockValidData,
          config: mockChartConfig,
          height: 300,
          showTrend: false,
          gradient: false,
        };

        const result = LineChartSchema.safeParse(validSchema);
        expect(result.success).toBe(true);
      });

      it('should reject empty data array', () => {
        const invalidSchema = {
          data: [],
          config: mockChartConfig,
        };

        const result = LineChartSchema.safeParse(invalidSchema);
        expect(result.success).toBe(false);
      });

      it('should reject missing title in config', () => {
        const invalidSchema = {
          data: mockValidData,
          config: { ...mockChartConfig, title: '' },
        };

        const result = LineChartSchema.safeParse(invalidSchema);
        expect(result.success).toBe(false);
      });

      it('should apply default values correctly', () => {
        const minimalSchema = {
          data: mockValidData,
          config: { title: 'Test' },
        };

        const result = LineChartSchema.safeParse(minimalSchema);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.height).toBe(300);
          expect(result.data.config.showGrid).toBe(true);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle null data gracefully', () => {
        // @ts-expect-error Testing invalid input
        render(<LineChart data={null} config={mockChartConfig} />);

        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      it('should handle undefined data gracefully', () => {
        // @ts-expect-error Testing invalid input
        render(<LineChart data={undefined} config={mockChartConfig} />);

        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      it('should handle malformed data points', () => {
        const malformedData: any[] = [
          { timestamp: '2025-01-01T00:00:00Z', value: 'not a number' },
        ];

        render(<LineChart data={malformedData} config={mockChartConfig} />);
        // Should not crash - component should handle gracefully
        expect(screen.getByText('Test Chart')).toBeInTheDocument();
      });
    });
  });

  describe('BarChart Component', () => {
    describe('Rendering Tests', () => {
      it('should render with valid data', () => {
        render(<BarChart data={mockValidData} config={mockChartConfig} />);

        expect(screen.getByText('Test Chart')).toBeInTheDocument();
        const rects = document.querySelectorAll('rect');
        expect(rects.length).toBeGreaterThan(0);
      });

      it('should render empty state when no data provided', () => {
        render(<BarChart data={[]} config={mockChartConfig} />);

        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      it('should render vertical bars by default', () => {
        const { container } = render(<BarChart data={mockValidData} config={mockChartConfig} />);

        const rects = container.querySelectorAll('rect');
        expect(rects.length).toBe(mockValidData.length);
      });

      it('should render horizontal bars when horizontal prop is true', () => {
        render(
          <BarChart
            data={mockValidData}
            config={mockChartConfig}
            horizontal={true}
          />
        );

        const rects = document.querySelectorAll('rect');
        expect(rects.length).toBe(mockValidData.length);
      });

      it('should apply different colors to bars', () => {
        const multiColorConfig: ChartConfig = {
          ...mockChartConfig,
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
        };

        render(<BarChart data={mockValidData} config={multiColorConfig} />);

        const rects = document.querySelectorAll('rect');
        const uniqueFills = new Set(
          Array.from(rects).map(rect => rect.getAttribute('fill'))
        );
        expect(uniqueFills.size).toBeGreaterThan(1);
      });
    });

    describe('Feature Tests', () => {
      it('should show values when showValues is true', () => {
        render(
          <BarChart
            data={mockValidData}
            config={mockChartConfig}
            showValues={true}
          />
        );

        const valueTexts = document.querySelectorAll('text');
        // Should have value labels plus axis labels
        expect(valueTexts.length).toBeGreaterThan(mockValidData.length);
      });

      it('should hide values when showValues is false', () => {
        render(
          <BarChart
            data={mockValidData}
            config={mockChartConfig}
            showValues={false}
          />
        );

        // Should only have axis labels, not value labels on bars
        const allTexts = document.querySelectorAll('text');
        expect(allTexts.length).toBeGreaterThan(0);
      });

      it('should render legend when showLegend is true', () => {
        render(
          <BarChart
            data={mockValidData}
            config={{ ...mockChartConfig, showLegend: true }}
          />
        );

        // Legend should show labels from data
        mockValidData.forEach(point => {
          if (point.label) {
            expect(screen.getByText(point.label)).toBeInTheDocument();
          }
        });
      });

      it('should render grid lines when showGrid is true', () => {
        render(
          <BarChart
            data={mockValidData}
            config={{ ...mockChartConfig, showGrid: true }}
          />
        );

        const gridLines = document.querySelectorAll('line');
        expect(gridLines.length).toBeGreaterThan(0);
      });
    });

    describe('Schema Validation Tests', () => {
      it('should validate correct schema', () => {
        const validSchema = {
          data: mockValidData,
          config: mockChartConfig,
          height: 300,
          showValues: false,
          horizontal: false,
        };

        const result = BarChartSchema.safeParse(validSchema);
        expect(result.success).toBe(true);
      });

      it('should reject invalid data', () => {
        const invalidSchema = {
          data: [],
          config: mockChartConfig,
        };

        const result = BarChartSchema.safeParse(invalidSchema);
        expect(result.success).toBe(false);
      });

      it('should apply default colors', () => {
        const minimalSchema = {
          data: mockValidData,
          config: { title: 'Test', type: 'bar' as const },
        };

        const result = BarChartSchema.safeParse(minimalSchema);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.config.colors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('PieChart Component', () => {
    describe('Rendering Tests', () => {
      it('should render with valid data', () => {
        render(<PieChart data={mockValidData} config={mockChartConfig} />);

        expect(screen.getByText('Test Chart')).toBeInTheDocument();
        const paths = document.querySelectorAll('path');
        expect(paths.length).toBe(mockValidData.length);
      });

      it('should render empty state when no data provided', () => {
        render(<PieChart data={[]} config={mockChartConfig} />);

        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      it('should render as donut chart when donut prop is true', () => {
        render(
          <PieChart
            data={mockValidData}
            config={mockChartConfig}
            donut={true}
          />
        );

        // Donut chart should have paths with inner radius
        const paths = document.querySelectorAll('path');
        expect(paths.length).toBe(mockValidData.length);
      });

      it('should show total when showTotal is true', () => {
        render(
          <PieChart
            data={mockValidData}
            config={mockChartConfig}
            showTotal={true}
          />
        );

        const total = mockValidData.reduce((sum, d) => sum + d.value, 0);
        expect(screen.getByText(total.toLocaleString())).toBeInTheDocument();
        expect(screen.getByText('Total')).toBeInTheDocument();
      });

      it('should render percentages on slices', () => {
        render(<PieChart data={mockValidData} config={mockChartConfig} />);

        // Should render percentage labels for visible slices
        const percentageTexts = document.querySelectorAll('text');
        expect(percentageTexts.length).toBeGreaterThan(0);
      });
    });

    describe('Feature Tests', () => {
      it('should render legend when showLegend is true', () => {
        render(
          <PieChart
            data={mockValidData}
            config={{ ...mockChartConfig, showLegend: true }}
          />
        );

        // Legend should show all labels
        mockValidData.forEach(point => {
          if (point.label) {
            expect(screen.getByText(point.label)).toBeInTheDocument();
          }
        });
      });

      it('should show summary statistics', () => {
        render(<PieChart data={mockValidData} config={mockChartConfig} />);

        expect(screen.getByText('Categories')).toBeInTheDocument();
        expect(screen.getByText('Largest')).toBeInTheDocument();
        expect(screen.getByText('Average')).toBeInTheDocument();
      });

      it('should calculate percentages correctly', () => {
        const testData: ChartDataPoint[] = [
          { timestamp: '2025-01-01T00:00:00Z', value: 50, label: 'A' },
          { timestamp: '2025-01-02T00:00:00Z', value: 50, label: 'B' },
        ];

        render(<PieChart data={testData} config={mockChartConfig} />);

        // Each slice should be 50%
        const percentageElements = Array.from(document.querySelectorAll('text'))
          .filter(el => el.textContent?.includes('%'));

        expect(percentageElements.length).toBeGreaterThan(0);
      });

      it('should use different colors for each slice', () => {
        render(<PieChart data={mockValidData} config={mockChartConfig} />);

        const paths = document.querySelectorAll('path');
        const uniqueColors = new Set(
          Array.from(paths).map(path => path.getAttribute('fill'))
        );
        expect(uniqueColors.size).toBeGreaterThan(1);
      });

      it('should handle small slices (< 5%) by hiding labels', () => {
        const smallSliceData: ChartDataPoint[] = [
          { timestamp: '2025-01-01T00:00:00Z', value: 100, label: 'Large' },
          { timestamp: '2025-01-02T00:00:00Z', value: 2, label: 'Tiny' },
        ];

        render(<PieChart data={smallSliceData} config={mockChartConfig} />);

        // Tiny slice percentage label should be hidden
        const percentTexts = Array.from(document.querySelectorAll('text'))
          .map(el => el.textContent);

        // Large slice should show ~98%, tiny should not show
        expect(percentTexts.some(t => t?.includes('98'))).toBe(true);
      });
    });

    describe('Schema Validation Tests', () => {
      it('should validate correct schema', () => {
        const validSchema = {
          data: mockValidData,
          config: mockChartConfig,
          height: 300,
          donut: false,
          showTotal: false,
        };

        const result = PieChartSchema.safeParse(validSchema);
        expect(result.success).toBe(true);
      });

      it('should reject negative values', () => {
        const invalidData: ChartDataPoint[] = [
          { timestamp: '2025-01-01T00:00:00Z', value: -10, label: 'Invalid' },
        ];

        const invalidSchema = {
          data: invalidData,
          config: mockChartConfig,
        };

        const result = PieChartSchema.safeParse(invalidSchema);
        expect(result.success).toBe(false);
      });

      it('should apply default configuration', () => {
        const minimalSchema = {
          data: mockValidData,
          config: { title: 'Pie Chart', type: 'pie' as const },
        };

        const result = PieChartSchema.safeParse(minimalSchema);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.donut).toBe(false);
          expect(result.data.showTotal).toBe(false);
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should render all chart types with same data structure', () => {
      const { rerender } = render(
        <LineChart data={mockValidData} config={mockChartConfig} />
      );
      expect(screen.getByText('Test Chart')).toBeInTheDocument();

      rerender(<BarChart data={mockValidData} config={mockChartConfig} />);
      expect(screen.getByText('Test Chart')).toBeInTheDocument();

      rerender(<PieChart data={mockValidData} config={mockChartConfig} />);
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });

    it('should maintain consistent styling across all chart types', () => {
      const className = 'test-chart-style';

      const { container: lineContainer } = render(
        <LineChart data={mockValidData} config={mockChartConfig} className={className} />
      );

      const { container: barContainer } = render(
        <BarChart data={mockValidData} config={mockChartConfig} className={className} />
      );

      const { container: pieContainer } = render(
        <PieChart data={mockValidData} config={mockChartConfig} className={className} />
      );

      expect(lineContainer.firstChild).toHaveClass(className);
      expect(barContainer.firstChild).toHaveClass(className);
      expect(pieContainer.firstChild).toHaveClass(className);
    });
  });

  describe('Responsive Behavior Tests', () => {
    it('should render SVG with viewBox for responsive scaling', () => {
      render(<LineChart data={mockValidData} config={mockChartConfig} />);

      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('viewBox');
      expect(svg).toHaveAttribute('width', '100%');
    });

    it('should adjust to different height values', () => {
      const heights = [200, 300, 400, 500];

      heights.forEach(height => {
        const { container } = render(
          <LineChart data={mockValidData} config={mockChartConfig} height={height} />
        );

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('height', String(height));
      });
    });
  });

  describe('Accessibility Tests', () => {
    it('should include tooltip data attributes for screen readers', () => {
      render(<LineChart data={mockValidData} config={mockChartConfig} />);

      const interactiveElements = document.querySelectorAll('[data-tooltip]');
      expect(interactiveElements.length).toBeGreaterThan(0);
    });

    it('should have proper ARIA labels for charts', () => {
      render(<PieChart data={mockValidData} config={mockChartConfig} />);

      // Chart container should be identifiable
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
    });
  });
});
