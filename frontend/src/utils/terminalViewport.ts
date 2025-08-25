/**
 * Terminal Viewport Width Correlation for Cascade Prevention
 * 
 * This module provides functions to calculate optimal terminal dimensions
 * based on viewport width to prevent Claude CLI output cascading.
 * 
 * Key Insights from NLD Pattern Analysis:
 * - Claude CLI output typically 120+ characters wide
 * - Terminal cascading occurs when content width > viewport width
 * - ANSI escape sequences don't contribute to visual width
 * - Font size affects character width calculations
 */

export interface TerminalDimensions {
  cols: number;
  rows: number;
  charWidth: number;
  effectiveWidth: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  isNarrow: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large';
}

/**
 * Get current viewport information with breakpoint classification
 */
export function getViewportInfo(): ViewportInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  let breakpoint: ViewportInfo['breakpoint'];
  if (width < 768) breakpoint = 'mobile';
  else if (width < 1024) breakpoint = 'tablet'; 
  else if (width < 1440) breakpoint = 'desktop';
  else breakpoint = 'large';
  
  return {
    width,
    height,
    devicePixelRatio,
    isNarrow: width < 1024,
    breakpoint
  };
}

/**
 * Calculate character width in pixels based on font size and family
 */
export function calculateCharWidth(fontSize: number = 14, fontFamily: string = 'monospace'): number {
  // Create temporary element to measure character width
  const measureElement = document.createElement('span');
  measureElement.style.position = 'absolute';
  measureElement.style.visibility = 'hidden';
  measureElement.style.fontSize = `${fontSize}px`;
  measureElement.style.fontFamily = fontFamily;
  measureElement.style.whiteSpace = 'pre';
  measureElement.textContent = 'M'; // Use 'M' as it's typically the widest character
  
  document.body.appendChild(measureElement);
  const charWidth = measureElement.getBoundingClientRect().width;
  document.body.removeChild(measureElement);
  
  // Fallback calculation if measurement fails
  return charWidth || (fontSize * 0.6);
}

/**
 * Calculate optimal terminal columns to prevent Claude CLI cascading
 * 
 * @param viewportWidth - Current viewport width in pixels
 * @param fontSize - Terminal font size in pixels
 * @param fontFamily - Terminal font family
 * @param reserveRatio - Percentage of viewport to reserve for UI elements (0.0-1.0)
 * @returns Optimal number of columns
 */
export function calculateOptimalCols(
  viewportWidth: number, 
  fontSize: number = 14,
  fontFamily: string = '"Fira Code", "Cascadia Code", "Consolas", monospace',
  reserveRatio: number = 0.2
): number {
  const charWidth = calculateCharWidth(fontSize, fontFamily);
  const usableWidth = viewportWidth * (1 - reserveRatio);
  const calculatedCols = Math.floor(usableWidth / charWidth);
  
  // Apply minimum and maximum bounds
  const minCols = 40;  // Absolute minimum for usability
  const maxCols = 200; // Reasonable maximum to prevent excessive width
  
  return Math.max(minCols, Math.min(maxCols, calculatedCols));
}

/**
 * Calculate optimal terminal rows based on viewport height
 */
export function calculateOptimalRows(
  viewportHeight: number,
  fontSize: number = 14,
  reserveHeight: number = 200 // Reserve for headers, footers, etc.
): number {
  const lineHeight = fontSize * 1.2; // Typical line-height for terminals
  const usableHeight = viewportHeight - reserveHeight;
  const calculatedRows = Math.floor(usableHeight / lineHeight);
  
  // Apply bounds
  const minRows = 12;  // Minimum for usability
  const maxRows = 50;  // Reasonable maximum
  
  return Math.max(minRows, Math.min(maxRows, calculatedRows));
}

/**
 * Get responsive terminal dimensions for current viewport
 */
export function getResponsiveTerminalDimensions(
  fontSize: number = 14,
  fontFamily: string = '"Fira Code", "Cascadia Code", "Consolas", monospace'
): TerminalDimensions {
  const viewport = getViewportInfo();
  const charWidth = calculateCharWidth(fontSize, fontFamily);
  
  // Calculate optimal dimensions
  const cols = calculateOptimalCols(viewport.width, fontSize, fontFamily);
  const rows = calculateOptimalRows(viewport.height, fontSize);
  const effectiveWidth = cols * charWidth;
  
  return {
    cols,
    rows,
    charWidth,
    effectiveWidth
  };
}

/**
 * Validate if terminal dimensions can handle Claude CLI without cascading
 * 
 * @param cols - Number of terminal columns
 * @param claudeOutputWidth - Expected Claude CLI output width (default: 120 chars)
 * @returns Validation result with recommendations
 */
export function validateClaudeCliSupport(
  cols: number, 
  claudeOutputWidth: number = 120
): {
  canHandle: boolean;
  cascadeRisk: 'low' | 'medium' | 'high';
  recommendation: string;
  overflow: number;
} {
  const overflow = claudeOutputWidth - cols;
  let cascadeRisk: 'low' | 'medium' | 'high';
  let recommendation: string;
  
  if (overflow <= 0) {
    cascadeRisk = 'low';
    recommendation = 'Terminal width is sufficient for Claude CLI output';
  } else if (overflow <= 20) {
    cascadeRisk = 'medium';
    recommendation = 'Minor overflow may cause occasional line wrapping';
  } else {
    cascadeRisk = 'high';
    recommendation = 'High risk of cascading. Consider increasing viewport width or reducing font size';
  }
  
  return {
    canHandle: overflow <= 0,
    cascadeRisk,
    recommendation,
    overflow
  };
}

/**
 * Strip ANSI escape sequences for accurate width calculation
 */
export function stripANSI(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Calculate visual width of text (excluding ANSI sequences)
 */
export function getVisualWidth(text: string): number {
  return stripANSI(text).length;
}

/**
 * Responsive breakpoint configurations for terminal sizing
 */
export const TERMINAL_BREAKPOINTS = {
  mobile: {
    minWidth: 0,
    maxWidth: 767,
    defaultCols: 60,
    defaultRows: 20,
    fontSize: 12,
    canHandleClaudeCLI: false
  },
  tablet: {
    minWidth: 768,
    maxWidth: 1023, 
    defaultCols: 100,
    defaultRows: 24,
    fontSize: 13,
    canHandleClaudeCLI: false
  },
  desktop: {
    minWidth: 1024,
    maxWidth: 1439,
    defaultCols: 130,
    defaultRows: 30,
    fontSize: 14,
    canHandleClaudeCLI: true
  },
  large: {
    minWidth: 1440,
    maxWidth: Infinity,
    defaultCols: 160,
    defaultRows: 35,
    fontSize: 14,
    canHandleClaudeCLI: true
  }
} as const;

/**
 * Get terminal configuration for current breakpoint
 */
export function getBreakpointConfig(viewportWidth?: number) {
  const width = viewportWidth ?? window.innerWidth;
  
  for (const [name, config] of Object.entries(TERMINAL_BREAKPOINTS)) {
    if (width >= config.minWidth && width <= config.maxWidth) {
      return { name, ...config };
    }
  }
  
  return { name: 'desktop', ...TERMINAL_BREAKPOINTS.desktop };
}

/**
 * Create a ResizeObserver for responsive terminal updates
 */
export function createTerminalResizeObserver(
  callback: (dimensions: TerminalDimensions) => void,
  fontSize: number = 14,
  fontFamily: string = '"Fira Code", "Cascadia Code", "Consolas", monospace'
): ResizeObserver {
  return new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { inlineSize: width, blockSize: height } = entry.contentBoxSize[0];
      
      // Recalculate dimensions based on new size
      const charWidth = calculateCharWidth(fontSize, fontFamily);
      const cols = Math.floor(width / charWidth);
      const rows = Math.floor(height / (fontSize * 1.2));
      
      callback({
        cols: Math.max(40, cols),
        rows: Math.max(12, rows),
        charWidth,
        effectiveWidth: cols * charWidth
      });
    }
  });
}

/**
 * Debug function to log viewport-cascade correlation analysis
 */
export function debugViewportCorrelation(): void {
  const viewport = getViewportInfo();
  const dimensions = getResponsiveTerminalDimensions();
  const validation = validateClaudeCliSupport(dimensions.cols);
  
  console.group('🔍 Terminal Viewport-Cascade Correlation Analysis');
  console.log('📐 Viewport:', viewport);
  console.log('📊 Terminal Dimensions:', dimensions);
  console.log('✅ Claude CLI Validation:', validation);
  console.log('💡 Breakpoint Config:', getBreakpointConfig());
  console.groupEnd();
}