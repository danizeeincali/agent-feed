/**
 * Terminal Width Calculator Utility
 * 
 * Provides functions for calculating optimal terminal dimensions,
 * detecting cascade potential, and preventing visual overflow.
 */

export interface TerminalDimensions {
  cols: number;
  rows: number;
  width: number;
  height: number;
  charWidth: number;
  lineHeight: number;
}

export interface CascadeAnalysis {
  willCascade: boolean;
  overflowChars: number;
  wrappedLines: number;
  requiredWidth: number;
  confidence: number; // 0-1, how confident we are about cascading
}

export interface OptimalWidthConfig {
  minWidth: number;
  maxWidth: number;
  preferredWidth: number;
  performanceThreshold: number;
}

/**
 * Calculate terminal dimensions based on container size and font metrics
 */
export const calculateTerminalDimensions = (
  containerWidth: number,
  containerHeight: number,
  fontSize: number = 14,
  fontFamily: string = 'monospace'
): TerminalDimensions => {
  // Font-specific character width ratios
  const charWidthRatio = fontFamily.includes('Fira Code') ? 0.6 : 
                        fontFamily.includes('Cascadia Code') ? 0.55 : 
                        fontFamily.includes('Consolas') ? 0.58 : 0.6;
  const lineHeightRatio = 1.2;
  
  const charWidth = fontSize * charWidthRatio;
  const lineHeight = fontSize * lineHeightRatio;
  
  // Account for padding and potential scrollbars
  const usableWidth = containerWidth - 20; // 10px padding each side
  const usableHeight = containerHeight - 40; // 20px padding top/bottom
  
  const cols = Math.max(20, Math.floor(usableWidth / charWidth));
  const rows = Math.max(5, Math.floor(usableHeight / lineHeight));
  
  return {
    cols,
    rows,
    width: usableWidth,
    height: usableHeight,
    charWidth,
    lineHeight
  };
};

/**
 * Analyze content for cascade potential in a given terminal width
 */
export const analyzeCascadePotential = (
  content: string,
  terminalCols: number,
  options: { strict?: boolean } = {}
): CascadeAnalysis => {
  const { strict = false } = options;
  const lines = content.split('\n');
  let overflowChars = 0;
  let wrappedLines = 0;
  let maxLineLength = 0;
  let longLines = 0;
  
  lines.forEach(line => {
    // Remove ANSI escape sequences for accurate length calculation
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    maxLineLength = Math.max(maxLineLength, cleanLine.length);
    
    if (cleanLine.length > terminalCols) {
      overflowChars += cleanLine.length - terminalCols;
      wrappedLines += Math.ceil(cleanLine.length / terminalCols) - 1;
      longLines++;
    }
  });
  
  // Calculate confidence based on multiple factors
  let confidence = 0;
  if (wrappedLines > 0) confidence += 0.3;
  if (overflowChars > 50) confidence += 0.3;
  if (longLines > 2) confidence += 0.2;
  if (maxLineLength > terminalCols * 1.2) confidence += 0.2; // 20% over limit
  
  // Cascade detection logic
  let willCascade = false;
  if (strict) {
    // Strict mode: any wrapping is considered cascading
    willCascade = wrappedLines > 0 || maxLineLength > terminalCols;
  } else {
    // Normal mode: significant wrapping indicates cascading
    willCascade = wrappedLines > 1 || overflowChars > 30 || 
                  (longLines > 1 && maxLineLength > terminalCols * 1.1);
  }
  
  return {
    willCascade,
    overflowChars,
    wrappedLines,
    requiredWidth: maxLineLength,
    confidence: Math.min(1, confidence)
  };
};

/**
 * Find optimal terminal width for given content
 */
export const findOptimalTerminalWidth = (
  content: string,
  config: Partial<OptimalWidthConfig> = {}
): number => {
  const {
    minWidth = 80,
    maxWidth = 200,
    preferredWidth = 120,
    performanceThreshold = 0.8
  } = config;
  
  // Quick check: if content fits in minimum width, use it
  const minAnalysis = analyzeCascadePotential(content, minWidth);
  if (!minAnalysis.willCascade) return minWidth;
  
  // If content fits in preferred width, use it
  const prefAnalysis = analyzeCascadePotential(content, preferredWidth);
  if (!prefAnalysis.willCascade) return preferredWidth;
  
  // Binary search for optimal width
  let low = minWidth;
  let high = maxWidth;
  let optimal = maxWidth;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const analysis = analyzeCascadePotential(content, mid);
    
    if (!analysis.willCascade) {
      optimal = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  
  return Math.min(optimal, maxWidth);
};

/**
 * Calculate performance impact of terminal width expansion
 */
export const calculatePerformanceImpact = (
  currentWidth: number,
  targetWidth: number,
  contentSize: number
): { impactRatio: number; recommendation: string } => {
  const widthRatio = targetWidth / currentWidth;
  const sizeMultiplier = Math.log(contentSize / 1000 + 1); // Logarithmic scale
  const impactRatio = widthRatio * sizeMultiplier;
  
  let recommendation = 'safe';
  if (impactRatio > 2) recommendation = 'caution';
  if (impactRatio > 3) recommendation = 'expensive';
  if (impactRatio > 5) recommendation = 'avoid';
  
  return { impactRatio, recommendation };
};

/**
 * Smart terminal width recommendation for Claude CLI
 */
export const recommendTerminalWidth = (
  command: string,
  expectedOutput: string = '',
  viewport: { width: number; height: number }
): {
  recommendedCols: number;
  recommendedRows: number;
  reasoning: string;
  confidence: number;
} => {
  const fullContent = command + '\n' + expectedOutput;
  const analysis = analyzeCascadePotential(fullContent, 80); // Test against standard
  
  // Base recommendations for different command types
  let baseWidth = 80;
  let reasoning = 'Standard terminal width';
  let confidence = 0.7;
  
  if (command.includes('--help')) {
    baseWidth = 100;
    reasoning = 'Help output typically needs wider display';
    confidence = 0.9;
  } else if (command.includes('--format=table') || command.includes('--format=pretty')) {
    baseWidth = 120;
    reasoning = 'Formatted output benefits from wider terminals';
    confidence = 0.8;
  } else if (command.includes('--stream')) {
    baseWidth = 110;
    reasoning = 'Streaming output with progress bars needs extra width';
    confidence = 0.85;
  } else if (command.length > 100) {
    baseWidth = 90;
    reasoning = 'Long commands suggest complex output';
    confidence = 0.7;
  }
  
  // Adjust based on cascade analysis
  if (analysis.willCascade) {
    const optimalWidth = findOptimalTerminalWidth(fullContent);
    baseWidth = Math.max(baseWidth, optimalWidth);
    reasoning += ' (adjusted for cascade prevention)';
    confidence = Math.min(confidence + 0.1, 1.0);
  }
  
  // Consider viewport constraints
  const maxPossibleCols = Math.floor(viewport.width / 9) - 5; // Approx char width with margin
  const finalCols = Math.min(baseWidth, maxPossibleCols);
  
  if (finalCols < baseWidth) {
    reasoning += ' (constrained by viewport)';
    confidence *= 0.8;
  }
  
  // Calculate rows based on typical terminal aspect ratio
  const recommendedRows = Math.max(24, Math.floor(finalCols / 3));
  
  return {
    recommendedCols: finalCols,
    recommendedRows: Math.min(recommendedRows, Math.floor(viewport.height / 20)),
    reasoning,
    confidence
  };
};

/**
 * Real-time cascade detection for terminal output
 */
export const detectRealTimeCascade = (
  terminalElement: HTMLElement,
  threshold: number = 0.1
): {
  cascadeDetected: boolean;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
} => {
  const rect = terminalElement.getBoundingClientRect();
  const hasHorizontalScroll = terminalElement.scrollWidth > terminalElement.clientWidth;
  const hasVerticalScroll = terminalElement.scrollHeight > terminalElement.clientHeight;
  
  const overflowRatio = (terminalElement.scrollWidth - terminalElement.clientWidth) / terminalElement.clientWidth;
  
  let cascadeDetected = hasHorizontalScroll || overflowRatio > threshold;
  let severity: 'low' | 'medium' | 'high' = 'low';
  let suggestedAction = 'No action needed';
  
  if (overflowRatio > 0.1) {
    severity = 'medium';
    suggestedAction = 'Consider expanding terminal width by 20-30%';
  }
  
  if (overflowRatio > 0.3) {
    severity = 'high';
    suggestedAction = 'Expand terminal width significantly or enable horizontal scrolling';
  }
  
  if (hasVerticalScroll && hasHorizontalScroll) {
    severity = 'high';
    suggestedAction = 'Critical: Both horizontal and vertical scrolling detected';
  }
  
  return {
    cascadeDetected,
    severity,
    suggestedAction
  };
};