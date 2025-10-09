/**
 * Contrast Ratio Calculator for Accessibility Testing
 * Implements WCAG 2.1 contrast ratio calculations
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  meetsWCAG_AA_Normal: boolean;
  meetsWCAG_AA_Large: boolean;
  meetsWCAG_AAA_Normal: boolean;
  meetsWCAG_AAA_Large: boolean;
  grade: 'AAA' | 'AA' | 'Fail';
}

/**
 * Calculate the contrast ratio between two colors
 *
 * @param foreground - Foreground color (text) in rgb() format or hex
 * @param background - Background color in rgb() format or hex
 * @returns Contrast ratio (1:1 to 21:1)
 *
 * @example
 * ```typescript
 * const ratio = calculateContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
 * console.log(ratio); // 21
 * ```
 */
export function calculateContrastRatio(foreground: string, background: string): number {
  const fgLuminance = getRelativeLuminance(foreground);
  const bgLuminance = getRelativeLuminance(background);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 specification
 *
 * @param color - Color in rgb() format or hex
 * @returns Relative luminance (0 to 1)
 */
export function getRelativeLuminance(color: string): number {
  const rgb = parseColor(color);

  // Convert to sRGB
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  // Apply gamma correction
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse color string to RGB object
 * Supports rgb(), rgba(), and hex formats
 *
 * @param color - Color string
 * @returns RGB object
 */
export function parseColor(color: string): RGB {
  // Handle rgb() and rgba() formats
  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Handle hex formats (#RGB or #RRGGBB)
  const hexMatch = color.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }
  }

  throw new Error(`Invalid color format: ${color}. Supported formats: rgb(), rgba(), #RGB, #RRGGBB`);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 *
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns true if meets WCAG AA
 */
export function meetsWCAG_AA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standards
 *
 * @param ratio - Contrast ratio
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns true if meets WCAG AAA
 */
export function meetsWCAG_AAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
}

/**
 * Get comprehensive contrast analysis
 *
 * @param foreground - Foreground color
 * @param background - Background color
 * @returns Complete contrast analysis result
 */
export function analyzeContrast(foreground: string, background: string): ContrastResult {
  const ratio = calculateContrastRatio(foreground, background);

  const meetsWCAG_AA_Normal = ratio >= 4.5;
  const meetsWCAG_AA_Large = ratio >= 3.0;
  const meetsWCAG_AAA_Normal = ratio >= 7.0;
  const meetsWCAG_AAA_Large = ratio >= 4.5;

  let grade: 'AAA' | 'AA' | 'Fail';
  if (meetsWCAG_AAA_Normal) {
    grade = 'AAA';
  } else if (meetsWCAG_AA_Normal) {
    grade = 'AA';
  } else {
    grade = 'Fail';
  }

  return {
    ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
    meetsWCAG_AA_Normal,
    meetsWCAG_AA_Large,
    meetsWCAG_AAA_Normal,
    meetsWCAG_AAA_Large,
    grade,
  };
}

/**
 * Get contrast ratio from computed styles of an element
 *
 * @param element - DOM element to analyze
 * @returns Contrast ratio
 */
export function getElementContrastRatio(element: Element): number {
  const computedStyle = window.getComputedStyle(element);
  const foreground = computedStyle.color;
  const background = computedStyle.backgroundColor;

  // If background is transparent, traverse up the DOM to find actual background
  const actualBackground = background === 'rgba(0, 0, 0, 0)' || background === 'transparent'
    ? getActualBackgroundColor(element)
    : background;

  return calculateContrastRatio(foreground, actualBackground);
}

/**
 * Traverse DOM tree to find actual background color
 *
 * @param element - Starting element
 * @returns Background color (defaults to white if not found)
 */
function getActualBackgroundColor(element: Element): string {
  let current: Element | null = element.parentElement;

  while (current) {
    const bg = window.getComputedStyle(current).backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    current = current.parentElement;
  }

  // Default to white background
  return 'rgb(255, 255, 255)';
}

/**
 * Format contrast ratio for display
 *
 * @param ratio - Contrast ratio
 * @returns Formatted string (e.g., "4.5:1")
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Tailwind CSS color to RGB mapping
 * Used for testing Tailwind color classes
 */
export const TAILWIND_COLORS: Record<string, string> = {
  // Gray scale
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  'gray-950': '#030712',

  // Blue
  'blue-300': '#93c5fd',
  'blue-400': '#60a5fa',
  'blue-600': '#2563eb',
  'blue-800': '#1e40af',

  // Red
  'red-200': '#fecaca',
  'red-300': '#fca5a5',
  'red-400': '#f87171',
  'red-600': '#dc2626',
  'red-700': '#b91c1c',
  'red-800': '#991b1b',

  // White and black
  'white': '#ffffff',
  'black': '#000000',
};

/**
 * Get RGB value from Tailwind color class
 *
 * @param colorClass - Tailwind color class (e.g., 'gray-900')
 * @returns Hex color value
 */
export function getTailwindColor(colorClass: string): string {
  return TAILWIND_COLORS[colorClass] || '#000000';
}

/**
 * Convert computed RGB to hex for comparison
 *
 * @param rgb - RGB color string
 * @returns Hex color string
 */
export function rgbToHex(rgb: string): string {
  const parsed = parseColor(rgb);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}`;
}
