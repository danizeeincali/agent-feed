import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Terminal FitAddon Unit Tests
 * 
 * Tests for the FitAddon integration and responsive terminal sizing logic
 * without requiring actual DOM manipulation.
 */

interface MockFitAddon {
  fit: () => void;
  proposeDimensions: () => { cols: number; rows: number } | undefined;
  _terminal?: MockTerminal;
}

interface MockTerminal {
  cols: number;
  rows: number;
  element?: HTMLElement;
  _core?: {
    _renderService: {
      dimensions: {
        actualCellWidth: number;
        actualCellHeight: number;
      };
    };
  };
  resize: (cols: number, rows: number) => void;
  onResize: (callback: (size: { cols: number; rows: number }) => void) => void;
}

interface ContainerDimensions {
  width: number;
  height: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

class FitAddonCalculator {
  private charWidth: number;
  private charHeight: number;

  constructor(charWidth: number = 9, charHeight: number = 16) {
    this.charWidth = charWidth;
    this.charHeight = charHeight;
  }

  calculateDimensions(container: ContainerDimensions): { cols: number; rows: number } {
    const availableWidth = container.width - container.paddingLeft - container.paddingRight;
    const availableHeight = container.height - container.paddingTop - container.paddingBottom;

    // Account for scrollbars and borders
    const usableWidth = availableWidth - 20; // 20px for potential scrollbar
    const usableHeight = availableHeight - 10; // 10px for borders

    const cols = Math.max(1, Math.floor(usableWidth / this.charWidth));
    const rows = Math.max(1, Math.floor(usableHeight / this.charHeight));

    return { cols, rows };
  }

  validateFit(
    container: ContainerDimensions,
    terminal: { cols: number; rows: number }
  ): { fits: boolean; overflow: { width: number; height: number } } {
    const requiredWidth = (terminal.cols * this.charWidth) + container.paddingLeft + container.paddingRight;
    const requiredHeight = (terminal.rows * this.charHeight) + container.paddingTop + container.paddingBottom;

    const widthOverflow = Math.max(0, requiredWidth - container.width);
    const heightOverflow = Math.max(0, requiredHeight - container.height);

    return {
      fits: widthOverflow === 0 && heightOverflow === 0,
      overflow: { width: widthOverflow, height: heightOverflow }
    };
  }

  findOptimalFit(container: ContainerDimensions): { cols: number; rows: number; utilization: number } {
    const dimensions = this.calculateDimensions(container);
    
    // Calculate space utilization
    const usedWidth = dimensions.cols * this.charWidth;
    const usedHeight = dimensions.rows * this.charHeight;
    const availableWidth = container.width - container.paddingLeft - container.paddingRight;
    const availableHeight = container.height - container.paddingTop - container.paddingBottom;
    
    const utilization = (usedWidth * usedHeight) / (availableWidth * availableHeight);

    return {
      ...dimensions,
      utilization
    };
  }
}

describe('FitAddon Calculations', () => {
  let calculator: FitAddonCalculator;

  beforeEach(() => {
    calculator = new FitAddonCalculator();
  });

  describe('calculateDimensions', () => {
    it('should calculate correct dimensions for standard container', () => {
      const container: ContainerDimensions = {
        width: 800,
        height: 600,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const dimensions = calculator.calculateDimensions(container);

      // (800 - 10 - 10 - 20) / 9 = 84.4 → 84 cols
      // (600 - 10 - 10 - 10) / 16 = 35.6 → 35 rows
      expect(dimensions.cols).toBe(84);
      expect(dimensions.rows).toBe(35);
    });

    it('should handle very small containers gracefully', () => {
      const smallContainer: ContainerDimensions = {
        width: 100,
        height: 80,
        paddingLeft: 5,
        paddingRight: 5,
        paddingTop: 5,
        paddingBottom: 5
      };

      const dimensions = calculator.calculateDimensions(smallContainer);

      // Should still provide minimum dimensions
      expect(dimensions.cols).toBeGreaterThanOrEqual(1);
      expect(dimensions.rows).toBeGreaterThanOrEqual(1);
      expect(dimensions.cols).toBeLessThanOrEqual(10);
      expect(dimensions.rows).toBeLessThanOrEqual(5);
    });

    it('should maximize space usage in large containers', () => {
      const largeContainer: ContainerDimensions = {
        width: 2000,
        height: 1200,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 20,
        paddingBottom: 20
      };

      const dimensions = calculator.calculateDimensions(largeContainer);

      expect(dimensions.cols).toBeGreaterThan(200);
      expect(dimensions.rows).toBeGreaterThan(70);
    });

    it('should handle different character sizes', () => {
      const wideCharCalculator = new FitAddonCalculator(12, 20); // Larger characters
      const narrowCharCalculator = new FitAddonCalculator(6, 12); // Smaller characters

      const container: ContainerDimensions = {
        width: 800,
        height: 600,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const wideDimensions = wideCharCalculator.calculateDimensions(container);
      const narrowDimensions = narrowCharCalculator.calculateDimensions(container);

      // Smaller characters should allow more columns/rows
      expect(narrowDimensions.cols).toBeGreaterThan(wideDimensions.cols);
      expect(narrowDimensions.rows).toBeGreaterThan(wideDimensions.rows);
    });
  });

  describe('validateFit', () => {
    it('should validate when terminal fits perfectly', () => {
      const container: ContainerDimensions = {
        width: 800,
        height: 600,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const terminal = { cols: 80, rows: 30 };
      const validation = calculator.validateFit(container, terminal);

      expect(validation.fits).toBe(true);
      expect(validation.overflow.width).toBe(0);
      expect(validation.overflow.height).toBe(0);
    });

    it('should detect when terminal is too large', () => {
      const container: ContainerDimensions = {
        width: 400,
        height: 300,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const terminal = { cols: 100, rows: 50 }; // Too large
      const validation = calculator.validateFit(container, terminal);

      expect(validation.fits).toBe(false);
      expect(validation.overflow.width).toBeGreaterThan(0);
      expect(validation.overflow.height).toBeGreaterThan(0);
    });

    it('should calculate exact overflow amounts', () => {
      const container: ContainerDimensions = {
        width: 500,
        height: 400,
        paddingLeft: 5,
        paddingRight: 5,
        paddingTop: 5,
        paddingBottom: 5
      };

      const terminal = { cols: 60, rows: 30 };
      const validation = calculator.validateFit(container, terminal);

      // Required: 60*9 + 5 + 5 = 550 width (overflow: 50)
      // Required: 30*16 + 5 + 5 = 490 height (overflow: 90)
      expect(validation.overflow.width).toBe(50);
      expect(validation.overflow.height).toBe(90);
    });
  });

  describe('findOptimalFit', () => {
    it('should maximize space utilization', () => {
      const container: ContainerDimensions = {
        width: 800,
        height: 600,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const optimal = calculator.findOptimalFit(container);

      // Should use most of the available space
      expect(optimal.utilization).toBeGreaterThan(0.8);
      expect(optimal.utilization).toBeLessThanOrEqual(1.0);
      
      // Dimensions should be reasonable
      expect(optimal.cols).toBeGreaterThan(60);
      expect(optimal.rows).toBeGreaterThan(20);
    });

    it('should prioritize width over height for typical terminal use', () => {
      const wideContainer: ContainerDimensions = {
        width: 1200,
        height: 400,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const tallContainer: ContainerDimensions = {
        width: 400,
        height: 1200,
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10
      };

      const wideOptimal = calculator.findOptimalFit(wideContainer);
      const tallOptimal = calculator.findOptimalFit(tallContainer);

      // Wide container should have significantly more columns
      expect(wideOptimal.cols).toBeGreaterThan(tallOptimal.cols * 2);
    });
  });

  describe('Responsive behavior', () => {
    it('should adapt to viewport changes', () => {
      const viewportSizes = [
        { width: 600, height: 400, name: 'Small' },
        { width: 1000, height: 600, name: 'Medium' },
        { width: 1400, height: 800, name: 'Large' },
        { width: 1920, height: 1080, name: 'XL' }
      ];

      const results = viewportSizes.map(viewport => {
        const container: ContainerDimensions = {
          width: viewport.width,
          height: viewport.height,
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 10,
          paddingBottom: 10
        };

        const optimal = calculator.findOptimalFit(container);
        
        return {
          ...viewport,
          ...optimal
        };
      });

      // Each larger viewport should accommodate more characters
      for (let i = 1; i < results.length; i++) {
        expect(results[i].cols).toBeGreaterThanOrEqual(results[i-1].cols);
        expect(results[i].rows).toBeGreaterThanOrEqual(results[i-1].rows);
      }

      // All should have reasonable utilization
      results.forEach(result => {
        expect(result.utilization).toBeGreaterThan(0.7);
      });
    });

    it('should handle orientation changes', () => {
      const landscape: ContainerDimensions = {
        width: 800, height: 600,
        paddingLeft: 10, paddingRight: 10,
        paddingTop: 10, paddingBottom: 10
      };

      const portrait: ContainerDimensions = {
        width: 600, height: 800,
        paddingLeft: 10, paddingRight: 10,
        paddingTop: 10, paddingBottom: 10
      };

      const landscapeOptimal = calculator.findOptimalFit(landscape);
      const portraitOptimal = calculator.findOptimalFit(portrait);

      // Landscape should have more columns, portrait more rows
      expect(landscapeOptimal.cols).toBeGreaterThan(portraitOptimal.cols);
      expect(portraitOptimal.rows).toBeGreaterThan(landscapeOptimal.rows);

      // Both should have good utilization
      expect(landscapeOptimal.utilization).toBeGreaterThan(0.7);
      expect(portraitOptimal.utilization).toBeGreaterThan(0.7);
    });
  });

  describe('Performance considerations', () => {
    it('should calculate dimensions efficiently', () => {
      const container: ContainerDimensions = {
        width: 1920, height: 1080,
        paddingLeft: 20, paddingRight: 20,
        paddingTop: 20, paddingBottom: 20
      };

      // Measure calculation time for large containers
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        calculator.calculateDimensions(container);
      }
      
      const end = performance.now();
      const avgTime = (end - start) / 1000;

      // Should be very fast (under 1ms per calculation)
      expect(avgTime).toBeLessThan(1);
    });

    it('should handle rapid resize events efficiently', () => {
      const start = performance.now();
      
      // Simulate rapid resize events
      for (let width = 400; width <= 1600; width += 50) {
        for (let height = 300; height <= 1000; height += 50) {
          const container: ContainerDimensions = {
            width, height,
            paddingLeft: 10, paddingRight: 10,
            paddingTop: 10, paddingBottom: 10
          };
          
          calculator.findOptimalFit(container);
        }
      }
      
      const end = performance.now();
      
      // Should handle many calculations quickly (under 100ms total)
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Integration with cascade prevention', () => {
    it('should recommend wider terminals for content that would cascade', () => {
      const standardCalculator = new FitAddonCalculator();
      
      // Simulate detecting content that needs more width
      const contentRequiringWidth = 120; // chars
      
      const narrowContainer: ContainerDimensions = {
        width: 800, height: 600,
        paddingLeft: 10, paddingRight: 10,
        paddingTop: 10, paddingBottom: 10
      };
      
      const wideContainer: ContainerDimensions = {
        width: 1200, height: 600,
        paddingLeft: 10, paddingRight: 10,
        paddingTop: 10, paddingBottom: 10
      };

      const narrowFit = standardCalculator.findOptimalFit(narrowContainer);
      const wideFit = standardCalculator.findOptimalFit(wideContainer);

      // Wide container should accommodate content better
      expect(wideFit.cols).toBeGreaterThanOrEqual(contentRequiringWidth);
      
      if (narrowFit.cols < contentRequiringWidth) {
        // Would need expansion
        expect(wideFit.cols).toBeGreaterThan(narrowFit.cols);
      }
    });

    it('should balance between width expansion and performance', () => {
      const containers = [
        { width: 800, cols: 'standard' },
        { width: 1200, cols: 'expanded' },
        { width: 1600, cols: 'wide' },
        { width: 2000, cols: 'ultra-wide' }
      ].map(c => ({
        ...c,
        container: {
          width: c.width,
          height: 600,
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 10,
          paddingBottom: 10
        }
      }));

      const results = containers.map(c => {
        const optimal = calculator.findOptimalFit(c.container);
        return {
          name: c.cols,
          width: c.width,
          cols: optimal.cols,
          utilization: optimal.utilization
        };
      });

      // Each step should provide diminishing returns
      for (let i = 1; i < results.length; i++) {
        const prev = results[i-1];
        const curr = results[i];
        
        const widthIncrease = (curr.width - prev.width) / prev.width;
        const colsIncrease = (curr.cols - prev.cols) / prev.cols;
        
        // Efficiency should decrease with extreme width (allow some tolerance)
        if (curr.width > 1600 && widthIncrease > 0.1) {
          expect(colsIncrease).toBeLessThan(widthIncrease * 1.1); // Allow 10% tolerance
        }
      }
    });
  });
});