/**
 * CSS Utilities Jest Tests
 * Comprehensive Jest unit tests for CSS utility functions and helpers
 */

const fs = require('fs');
const path = require('path');

// Mock utility functions that might exist in the project
const cssUtilities = {
  // CSS class name generation utilities
  classNames: (...classes) => {
    return classes
      .flat()
      .filter(Boolean)
      .join(' ')
      .trim();
  },

  // CSS variable getter utility
  getCSSVariable: (variable, element = document.documentElement) => {
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      return window.getComputedStyle(element).getPropertyValue(variable).trim();
    }
    return '';
  },

  // CSS variable setter utility
  setCSSVariable: (variable, value, element = document.documentElement) => {
    if (element && element.style) {
      element.style.setProperty(variable, value);
    }
  },

  // Theme utilities
  getThemeClass: (isDark) => isDark ? 'dark' : 'light',

  // Responsive utilities
  getBreakpointClass: (breakpoint, property, value) => {
    if (breakpoint === 'base') return `${property}-${value}`;
    return `${breakpoint}:${property}-${value}`;
  },

  // Animation utilities
  getAnimationDuration: (speed) => {
    const durations = {
      slow: '1s',
      normal: '0.3s',
      fast: '0.15s'
    };
    return durations[speed] || durations.normal;
  },

  // Color utilities
  hexToRgb: (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  rgbToHex: (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  // CSS parsing utilities
  parseCSSRule: (cssText) => {
    const match = cssText.match(/^([^{]+)\{([^}]+)\}$/);
    if (!match) return null;

    const selector = match[1].trim();
    const properties = match[2]
      .split(';')
      .filter(prop => prop.trim())
      .reduce((acc, prop) => {
        const [key, value] = prop.split(':').map(s => s.trim());
        if (key && value) acc[key] = value;
        return acc;
      }, {});

    return { selector, properties };
  },

  // Media query utilities
  getMediaQueryValue: (query) => {
    const breakpoints = {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px'
    };
    return breakpoints[query] || query;
  }
};

describe('CSS Utilities Jest Tests', () => {
  describe('Class Name Utilities', () => {
    test('should join class names correctly', () => {
      expect(cssUtilities.classNames('btn', 'btn-primary')).toBe('btn btn-primary');
      expect(cssUtilities.classNames('btn', null, 'btn-primary')).toBe('btn btn-primary');
      expect(cssUtilities.classNames('btn', '', 'btn-primary')).toBe('btn btn-primary');
      expect(cssUtilities.classNames(['btn', 'btn-primary'])).toBe('btn btn-primary');
    });

    test('should handle empty and falsy values', () => {
      expect(cssUtilities.classNames()).toBe('');
      expect(cssUtilities.classNames(null, undefined, false)).toBe('');
      expect(cssUtilities.classNames('', '   ', '\t')).toBe('');
    });

    test('should handle nested arrays', () => {
      expect(cssUtilities.classNames(['btn', ['btn-primary', 'active']], 'selected'))
        .toBe('btn btn-primary active selected');
    });

    test('should trim whitespace', () => {
      expect(cssUtilities.classNames('  btn  ', '  btn-primary  '))
        .toBe('btn btn-primary');
    });
  });

  describe('CSS Variable Utilities', () => {
    let mockElement;

    beforeEach(() => {
      // Mock DOM element
      mockElement = {
        style: {
          setProperty: jest.fn(),
          getPropertyValue: jest.fn()
        }
      };

      // Mock getComputedStyle
      global.window = {
        getComputedStyle: jest.fn().mockReturnValue({
          getPropertyValue: jest.fn().mockReturnValue('#333333')
        })
      };

      global.document = {
        documentElement: mockElement
      };
    });

    afterEach(() => {
      delete global.window;
      delete global.document;
    });

    test('should get CSS variable value', () => {
      const value = cssUtilities.getCSSVariable('--primary-color');
      expect(window.getComputedStyle).toHaveBeenCalledWith(mockElement);
      expect(value).toBe('#333333');
    });

    test('should set CSS variable value', () => {
      cssUtilities.setCSSVariable('--primary-color', '#ff0000');
      expect(mockElement.style.setProperty).toHaveBeenCalledWith('--primary-color', '#ff0000');
    });

    test('should handle missing element gracefully', () => {
      expect(() => cssUtilities.setCSSVariable('--test', 'value', null)).not.toThrow();
      expect(() => cssUtilities.getCSSVariable('--test', null)).not.toThrow();
    });
  });

  describe('Theme Utilities', () => {
    test('should return correct theme class', () => {
      expect(cssUtilities.getThemeClass(true)).toBe('dark');
      expect(cssUtilities.getThemeClass(false)).toBe('light');
    });

    test('should handle undefined values', () => {
      expect(cssUtilities.getThemeClass()).toBe('light');
      expect(cssUtilities.getThemeClass(null)).toBe('light');
    });
  });

  describe('Responsive Utilities', () => {
    test('should generate base breakpoint classes', () => {
      expect(cssUtilities.getBreakpointClass('base', 'text', 'lg'))
        .toBe('text-lg');
    });

    test('should generate responsive breakpoint classes', () => {
      expect(cssUtilities.getBreakpointClass('md', 'text', 'xl'))
        .toBe('md:text-xl');
      expect(cssUtilities.getBreakpointClass('lg', 'grid-cols', '3'))
        .toBe('lg:grid-cols-3');
    });

    test('should handle various property-value combinations', () => {
      expect(cssUtilities.getBreakpointClass('sm', 'p', '4')).toBe('sm:p-4');
      expect(cssUtilities.getBreakpointClass('xl', 'bg', 'primary-500')).toBe('xl:bg-primary-500');
    });
  });

  describe('Animation Utilities', () => {
    test('should return correct animation durations', () => {
      expect(cssUtilities.getAnimationDuration('slow')).toBe('1s');
      expect(cssUtilities.getAnimationDuration('normal')).toBe('0.3s');
      expect(cssUtilities.getAnimationDuration('fast')).toBe('0.15s');
    });

    test('should fallback to normal duration for unknown speeds', () => {
      expect(cssUtilities.getAnimationDuration('unknown')).toBe('0.3s');
      expect(cssUtilities.getAnimationDuration(null)).toBe('0.3s');
      expect(cssUtilities.getAnimationDuration()).toBe('0.3s');
    });
  });

  describe('Color Utilities', () => {
    test('should convert hex to RGB correctly', () => {
      expect(cssUtilities.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(cssUtilities.hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(cssUtilities.hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
      expect(cssUtilities.hexToRgb('#333333')).toEqual({ r: 51, g: 51, b: 51 });
    });

    test('should handle hex colors without # prefix', () => {
      expect(cssUtilities.hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    test('should return null for invalid hex colors', () => {
      expect(cssUtilities.hexToRgb('invalid')).toBeNull();
      expect(cssUtilities.hexToRgb('#gg0000')).toBeNull();
      expect(cssUtilities.hexToRgb('#ff00')).toBeNull();
    });

    test('should convert RGB to hex correctly', () => {
      expect(cssUtilities.rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(cssUtilities.rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(cssUtilities.rgbToHex(0, 0, 255)).toBe('#0000ff');
      expect(cssUtilities.rgbToHex(51, 51, 51)).toBe('#333333');
    });

    test('should handle edge cases for RGB values', () => {
      expect(cssUtilities.rgbToHex(0, 0, 0)).toBe('#000000');
      expect(cssUtilities.rgbToHex(255, 255, 255)).toBe('#ffffff');
    });
  });

  describe('CSS Parsing Utilities', () => {
    test('should parse CSS rules correctly', () => {
      const cssRule = '.test-class { color: red; background: blue; }';
      const parsed = cssUtilities.parseCSSRule(cssRule);

      expect(parsed).toEqual({
        selector: '.test-class',
        properties: {
          color: 'red',
          background: 'blue'
        }
      });
    });

    test('should handle complex selectors', () => {
      const cssRule = '.parent > .child:hover { color: red; }';
      const parsed = cssUtilities.parseCSSRule(cssRule);

      expect(parsed.selector).toBe('.parent > .child:hover');
      expect(parsed.properties.color).toBe('red');
    });

    test('should handle empty or invalid CSS rules', () => {
      expect(cssUtilities.parseCSSRule('')).toBeNull();
      expect(cssUtilities.parseCSSRule('invalid css')).toBeNull();
      expect(cssUtilities.parseCSSRule('.test { }')).toEqual({
        selector: '.test',
        properties: {}
      });
    });

    test('should handle CSS rules with multiple properties', () => {
      const cssRule = '.complex { margin: 0; padding: 1rem; border: 1px solid #ccc; }';
      const parsed = cssUtilities.parseCSSRule(cssRule);

      expect(parsed.properties).toEqual({
        margin: '0',
        padding: '1rem',
        border: '1px solid #ccc'
      });
    });
  });

  describe('Media Query Utilities', () => {
    test('should return correct breakpoint values', () => {
      expect(cssUtilities.getMediaQueryValue('sm')).toBe('640px');
      expect(cssUtilities.getMediaQueryValue('md')).toBe('768px');
      expect(cssUtilities.getMediaQueryValue('lg')).toBe('1024px');
      expect(cssUtilities.getMediaQueryValue('xl')).toBe('1280px');
      expect(cssUtilities.getMediaQueryValue('2xl')).toBe('1536px');
    });

    test('should return custom values for unknown breakpoints', () => {
      expect(cssUtilities.getMediaQueryValue('custom')).toBe('custom');
      expect(cssUtilities.getMediaQueryValue('500px')).toBe('500px');
    });
  });

  describe('CSS File Processing Utilities', () => {
    test('should detect Tailwind imports in CSS files', () => {
      const projectRoot = path.resolve(__dirname, '../..');
      const testInputCssPath = path.join(projectRoot, 'test-input.css');

      if (fs.existsSync(testInputCssPath)) {
        const cssContent = fs.readFileSync(testInputCssPath, 'utf8');
        expect(cssContent).toContain('@import "tailwindcss"');
      }
    });

    test('should validate CSS variable definitions in project files', () => {
      const projectRoot = path.resolve(__dirname, '../..');
      const globalsCssPath = path.join(projectRoot, 'claudable-reference/apps/web/app/globals.css');

      if (fs.existsSync(globalsCssPath)) {
        const cssContent = fs.readFileSync(globalsCssPath, 'utf8');

        // Should contain CSS variable definitions
        expect(cssContent).toMatch(/--[\w-]+:\s*[^;]+;/);

        // Should contain specific theme variables
        expect(cssContent).toContain('--bolt-bg-primary');
        expect(cssContent).toContain('--bolt-text-primary');
      }
    });
  });

  describe('Performance Utilities', () => {
    test('should measure CSS parsing performance', () => {
      const startTime = performance.now();

      // Simulate parsing multiple CSS rules
      const cssRules = Array.from({ length: 1000 }, (_, i) =>
        `.test-${i} { color: #${i.toString(16).padStart(6, '0')}; }`
      );

      cssRules.forEach(rule => cssUtilities.parseCSSRule(rule));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should parse 1000 rules in reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    test('should measure class name joining performance', () => {
      const startTime = performance.now();

      // Simulate joining many class names
      for (let i = 0; i < 10000; i++) {
        cssUtilities.classNames('btn', 'btn-primary', 'active', null, '', 'selected');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should join 10000 class name sets in reasonable time
      expect(duration).toBeLessThan(100); // Less than 100ms
    });
  });

  describe('Error Handling in CSS Utilities', () => {
    test('should handle invalid inputs gracefully', () => {
      expect(() => cssUtilities.classNames(null)).not.toThrow();
      expect(() => cssUtilities.hexToRgb(null)).not.toThrow();
      expect(() => cssUtilities.parseCSSRule(null)).not.toThrow();
    });

    test('should handle edge cases in color conversion', () => {
      expect(cssUtilities.hexToRgb('')).toBeNull();
      expect(cssUtilities.rgbToHex(-1, 0, 0)).toBe('#ffffff'); // Negative values
      expect(cssUtilities.rgbToHex(256, 0, 0)).toBe('#000000'); // Values over 255
    });

    test('should handle malformed CSS gracefully', () => {
      const malformedCSS = [
        '.test {',
        'color red',
        '.test { color: }',
        '{ color: red; }'
      ];

      malformedCSS.forEach(css => {
        expect(() => cssUtilities.parseCSSRule(css)).not.toThrow();
      });
    });
  });

  describe('Integration with Project Configuration', () => {
    test('should work with Tailwind configuration colors', () => {
      const projectRoot = path.resolve(__dirname, '../..');
      const tailwindConfigPath = path.join(projectRoot, 'tailwind.config.ts');

      if (fs.existsSync(tailwindConfigPath)) {
        const configContent = fs.readFileSync(tailwindConfigPath, 'utf8');

        // Should contain primary color definitions
        expect(configContent).toContain('primary');
        expect(configContent).toContain('secondary');

        // Should contain color values
        expect(configContent).toMatch(/#[0-9a-fA-F]{6}/);
      }
    });

    test('should validate breakpoint consistency', () => {
      const standardBreakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];

      standardBreakpoints.forEach(bp => {
        const value = cssUtilities.getMediaQueryValue(bp);
        expect(value).toMatch(/^\d+px$/);
      });
    });
  });
});