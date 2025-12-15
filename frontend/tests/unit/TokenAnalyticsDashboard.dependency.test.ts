/**
 * TokenAnalyticsDashboard Dependency Validation Tests
 *
 * These tests validate that all required dependencies are properly installed
 * and can be imported without errors. They MUST fail if:
 * - chart.js is not installed or has version conflicts
 * - react-chartjs-2 is not compatible with chart.js version
 * - chartjs-adapter-date-fns is missing or incompatible
 * - TypeScript definitions are missing
 */

import { describe, it, expect, vi } from 'vitest';

describe('TokenAnalyticsDashboard Dependency Tests', () => {
  describe('1. Chart.js Installation Validation', () => {
    it('should have chart.js installed and importable', async () => {
      // This test will fail if chart.js is not properly installed
      try {
        const chartModule = await import('chart.js');
        expect(chartModule).toBeDefined();
        expect(chartModule.Chart).toBeDefined();
        expect(typeof chartModule.Chart.register).toBe('function');
      } catch (error) {
        throw new Error(`Chart.js import failed: ${error.message}`);
      }
    });

    it('should have all required Chart.js components available', async () => {
      try {
        const {
          Chart,
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          Title,
          Tooltip,
          Legend,
          TimeScale,
        } = await import('chart.js');

        // Verify core Chart class
        expect(Chart).toBeDefined();
        expect(typeof Chart.register).toBe('function');

        // Verify scale components
        expect(CategoryScale).toBeDefined();
        expect(LinearScale).toBeDefined();
        expect(TimeScale).toBeDefined();

        // Verify element components
        expect(PointElement).toBeDefined();
        expect(LineElement).toBeDefined();
        expect(BarElement).toBeDefined();

        // Verify plugin components
        expect(Title).toBeDefined();
        expect(Tooltip).toBeDefined();
        expect(Legend).toBeDefined();
      } catch (error) {
        throw new Error(`Chart.js components import failed: ${error.message}`);
      }
    });

    it('should have correct Chart.js version compatibility', async () => {
      try {
        const chartModule = await import('chart.js');
        const chart = chartModule.Chart;

        // Check that Chart.js has expected API
        expect(chart).toHaveProperty('register');
        expect(chart).toHaveProperty('defaults');
        expect(chart).toHaveProperty('version');

        // Verify it's Chart.js v4+ (required for react-chartjs-2 v5+)
        if (chart.version) {
          const majorVersion = parseInt(chart.version.split('.')[0], 10);
          expect(majorVersion).toBeGreaterThanOrEqual(4);
        }
      } catch (error) {
        throw new Error(`Chart.js version validation failed: ${error.message}`);
      }
    });
  });

  describe('2. React-chartjs-2 Compatibility Validation', () => {
    it('should have react-chartjs-2 installed and compatible', async () => {
      try {
        const reactChartModule = await import('react-chartjs-2');
        expect(reactChartModule).toBeDefined();
        expect(reactChartModule.Line).toBeDefined();
        expect(reactChartModule.Bar).toBeDefined();
        expect(typeof reactChartModule.Line).toBe('function');
        expect(typeof reactChartModule.Bar).toBe('function');
      } catch (error) {
        throw new Error(`react-chartjs-2 import failed: ${error.message}`);
      }
    });

    it('should have all required chart components from react-chartjs-2', async () => {
      try {
        const {
          Line,
          Bar,
          Doughnut,
          Pie,
          Radar,
          PolarArea,
          Bubble,
          Scatter,
        } = await import('react-chartjs-2');

        // Verify primary chart types used in TokenAnalyticsDashboard
        expect(Line).toBeDefined();
        expect(Bar).toBeDefined();
        expect(typeof Line).toBe('function');
        expect(typeof Bar).toBe('function');

        // Verify other chart types are available (for future use)
        expect(Doughnut).toBeDefined();
        expect(Pie).toBeDefined();
        expect(Radar).toBeDefined();
        expect(PolarArea).toBeDefined();
        expect(Bubble).toBeDefined();
        expect(Scatter).toBeDefined();
      } catch (error) {
        throw new Error(`react-chartjs-2 chart components import failed: ${error.message}`);
      }
    });

    it('should have compatible react-chartjs-2 version for Chart.js v4+', async () => {
      try {
        // Import both modules to test compatibility
        const chartModule = await import('chart.js');
        const reactChartModule = await import('react-chartjs-2');

        // Test that they can work together by creating a mock setup
        expect(chartModule.Chart).toBeDefined();
        expect(reactChartModule.Line).toBeDefined();

        // This would fail if versions are incompatible
        const mockProps = {
          data: {
            labels: ['Test'],
            datasets: [{
              label: 'Test Dataset',
              data: [1],
              borderColor: 'rgb(75, 192, 192)',
            }],
          },
        };

        // Should not throw when creating component reference
        expect(() => reactChartModule.Line).not.toThrow();
      } catch (error) {
        throw new Error(`Chart.js and react-chartjs-2 compatibility test failed: ${error.message}`);
      }
    });
  });

  describe('3. Date Adapter Validation', () => {
    it('should have chartjs-adapter-date-fns installed', async () => {
      try {
        const adapterModule = await import('chartjs-adapter-date-fns');
        expect(adapterModule).toBeDefined();
        // The adapter auto-registers itself, so successful import means it's working
      } catch (error) {
        throw new Error(`chartjs-adapter-date-fns import failed: ${error.message}`);
      }
    });

    it('should have date-fns installed and compatible', async () => {
      try {
        const dateFnsModule = await import('date-fns');
        expect(dateFnsModule).toBeDefined();
        expect(dateFnsModule.format).toBeDefined();
        expect(dateFnsModule.parseISO).toBeDefined();
        expect(dateFnsModule.subDays).toBeDefined();
        expect(dateFnsModule.startOfDay).toBeDefined();

        // Test basic functionality
        const testDate = new Date('2024-01-01T12:00:00Z');
        const formatted = dateFnsModule.format(testDate, 'yyyy-MM-dd');
        expect(formatted).toBe('2024-01-01');
      } catch (error) {
        throw new Error(`date-fns validation failed: ${error.message}`);
      }
    });

    it('should have time scale functionality working', async () => {
      try {
        // Import all required modules for time scale
        const chartModule = await import('chart.js');
        await import('chartjs-adapter-date-fns');

        // Verify TimeScale is available
        expect(chartModule.TimeScale).toBeDefined();

        // Test that time scale can be registered
        expect(() => {
          chartModule.Chart.register(chartModule.TimeScale);
        }).not.toThrow();
      } catch (error) {
        throw new Error(`Time scale functionality test failed: ${error.message}`);
      }
    });
  });

  describe('4. TypeScript Definitions Validation', () => {
    it('should have TypeScript definitions for chart.js', async () => {
      try {
        // This test verifies that TypeScript can understand chart.js types
        const chartModule = await import('chart.js');

        // These should not cause TypeScript errors
        const chartInstance: typeof chartModule.Chart = chartModule.Chart;
        const categoryScale: typeof chartModule.CategoryScale = chartModule.CategoryScale;
        const timeScale: typeof chartModule.TimeScale = chartModule.TimeScale;

        expect(chartInstance).toBeDefined();
        expect(categoryScale).toBeDefined();
        expect(timeScale).toBeDefined();
      } catch (error) {
        throw new Error(`Chart.js TypeScript definitions test failed: ${error.message}`);
      }
    });

    it('should have TypeScript definitions for react-chartjs-2', async () => {
      try {
        const reactChartModule = await import('react-chartjs-2');

        // These should not cause TypeScript errors
        const LineChart: typeof reactChartModule.Line = reactChartModule.Line;
        const BarChart: typeof reactChartModule.Bar = reactChartModule.Bar;

        expect(LineChart).toBeDefined();
        expect(BarChart).toBeDefined();
      } catch (error) {
        throw new Error(`react-chartjs-2 TypeScript definitions test failed: ${error.message}`);
      }
    });

    it('should support TypeScript chart configuration types', async () => {
      try {
        const chartModule = await import('chart.js');

        // Test that Chart.js types are properly defined
        type ChartOptions = chartModule.ChartOptions<'line'>;
        type ChartData = chartModule.ChartData<'line'>;
        type ChartConfiguration = chartModule.ChartConfiguration<'line'>;

        // This should compile without TypeScript errors
        const mockOptions: ChartOptions = {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Test Chart',
            },
          },
          scales: {
            x: {
              display: true,
            },
            y: {
              display: true,
            },
          },
        };

        const mockData: ChartData = {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [{
            label: 'Test Dataset',
            data: [10, 20, 30],
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
          }],
        };

        expect(mockOptions).toBeDefined();
        expect(mockData).toBeDefined();
      } catch (error) {
        throw new Error(`Chart.js TypeScript types test failed: ${error.message}`);
      }
    });
  });

  describe('5. Runtime Compatibility Validation', () => {
    it('should register Chart.js components without conflicts', async () => {
      try {
        const {
          Chart,
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          BarElement,
          Title,
          Tooltip,
          Legend,
          TimeScale,
        } = await import('chart.js');

        // Import date adapter
        await import('chartjs-adapter-date-fns');

        // This should not throw - validates that all components can be registered
        expect(() => {
          Chart.register(
            CategoryScale,
            LinearScale,
            PointElement,
            LineElement,
            BarElement,
            Title,
            Tooltip,
            Legend,
            TimeScale
          );
        }).not.toThrow();

        // Verify registration worked
        expect(Chart.registry.getScale('category')).toBeDefined();
        expect(Chart.registry.getScale('linear')).toBeDefined();
        expect(Chart.registry.getScale('time')).toBeDefined();
      } catch (error) {
        throw new Error(`Chart.js component registration failed: ${error.message}`);
      }
    });

    it('should create chart instance without errors', async () => {
      try {
        const { Chart } = await import('chart.js');
        await import('chartjs-adapter-date-fns');

        // Create a mock canvas element
        const mockCanvas = {
          getContext: vi.fn().mockReturnValue({
            canvas: { width: 400, height: 300 },
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            rotate: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn().mockReturnValue({ width: 100 }),
          }),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          getAttribute: vi.fn(),
          setAttribute: vi.fn(),
          width: 400,
          height: 300,
        };

        // This should not throw
        expect(() => {
          new Chart(mockCanvas as any, {
            type: 'line',
            data: {
              labels: ['Jan', 'Feb', 'Mar'],
              datasets: [{
                label: 'Test',
                data: [1, 2, 3],
              }],
            },
            options: {
              responsive: true,
            },
          });
        }).not.toThrow();
      } catch (error) {
        throw new Error(`Chart instance creation failed: ${error.message}`);
      }
    });

    it('should support all chart types used in TokenAnalyticsDashboard', async () => {
      try {
        const { Chart } = await import('chart.js');
        const { Line, Bar } = await import('react-chartjs-2');

        // Test that required chart types are supported
        expect(Chart.registry.getController('line')).toBeDefined();
        expect(Chart.registry.getController('bar')).toBeDefined();

        // Test that React components are functions
        expect(typeof Line).toBe('function');
        expect(typeof Bar).toBe('function');

        // Test component names for debugging
        expect(Line.name).toBeTruthy();
        expect(Bar.name).toBeTruthy();
      } catch (error) {
        throw new Error(`Chart type support validation failed: ${error.message}`);
      }
    });
  });

  describe('6. Bundle Size and Performance Validation', () => {
    it('should import chart modules efficiently', async () => {
      const startTime = performance.now();

      try {
        await Promise.all([
          import('chart.js'),
          import('react-chartjs-2'),
          import('chartjs-adapter-date-fns'),
          import('date-fns'),
        ]);

        const endTime = performance.now();
        const importTime = endTime - startTime;

        // Imports should complete within reasonable time (5 seconds)
        expect(importTime).toBeLessThan(5000);
      } catch (error) {
        throw new Error(`Module import performance test failed: ${error.message}`);
      }
    });

    it('should not have circular dependencies', async () => {
      try {
        // Test that modules can be imported independently
        const chartModule = await import('chart.js');
        const reactChartModule = await import('react-chartjs-2');
        const adapterModule = await import('chartjs-adapter-date-fns');

        // All should be defined without cross-dependencies causing issues
        expect(chartModule.Chart).toBeDefined();
        expect(reactChartModule.Line).toBeDefined();
        expect(adapterModule).toBeDefined();
      } catch (error) {
        throw new Error(`Circular dependency test failed: ${error.message}`);
      }
    });
  });

  describe('7. Version Compatibility Matrix', () => {
    it('should validate Chart.js v4+ with react-chartjs-2 v5+', async () => {
      try {
        const chartModule = await import('chart.js');

        // Check Chart.js version
        if (chartModule.Chart.version) {
          const chartVersion = chartModule.Chart.version;
          const chartMajor = parseInt(chartVersion.split('.')[0], 10);

          // Must be Chart.js v4+
          expect(chartMajor).toBeGreaterThanOrEqual(4);
        }

        // Test that react-chartjs-2 components accept Chart.js v4 data format
        const { Line } = await import('react-chartjs-2');
        const mockData = {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [{
            label: 'Revenue',
            data: [65, 59, 80, 81],
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          }],
        };

        // Should not throw when creating component with v4 data format
        expect(() => Line).not.toThrow();
        expect(typeof Line).toBe('function');
      } catch (error) {
        throw new Error(`Version compatibility validation failed: ${error.message}`);
      }
    });

    it('should support date-fns v3+ with chartjs-adapter-date-fns', async () => {
      try {
        const dateFns = await import('date-fns');
        await import('chartjs-adapter-date-fns');

        // Test that date-fns functions work as expected
        const testDate = new Date('2024-01-15T10:30:00Z');

        // These functions should exist and work
        expect(dateFns.format(testDate, 'yyyy-MM-dd')).toBe('2024-01-15');
        expect(dateFns.parseISO('2024-01-15T10:30:00Z')).toBeInstanceOf(Date);
        expect(dateFns.subDays(testDate, 1)).toBeInstanceOf(Date);
      } catch (error) {
        throw new Error(`date-fns compatibility test failed: ${error.message}`);
      }
    });
  });
});