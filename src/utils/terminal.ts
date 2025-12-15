/**
 * Terminal Utility Functions
 * Helper functions for terminal text processing and ANSI handling
 */

/**
 * Strip ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  // ANSI escape code regex pattern
  const ansiRegex = /\x1b\[[0-9;]*m/g;
  return text.replace(ansiRegex, '');
}

/**
 * Format text with ANSI color codes
 */
export function colorText(text: string, color: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'): string {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  };
  
  const reset = '\x1b[0m';
  return `${colors[color]}${text}${reset}`;
}

/**
 * Format text with ANSI style codes
 */
export function styleText(text: string, style: 'bold' | 'dim' | 'italic' | 'underline'): string {
  const styles = {
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m'
  };
  
  const reset = '\x1b[0m';
  return `${styles[style]}${text}${reset}`;
}

/**
 * Clear terminal screen
 */
export function clearScreen(): string {
  return '\x1b[2J\x1b[H';
}

/**
 * Move cursor to position
 */
export function moveCursor(row: number, col: number): string {
  return `\x1b[${row};${col}H`;
}

/**
 * Hide cursor
 */
export function hideCursor(): string {
  return '\x1b[?25l';
}

/**
 * Show cursor
 */
export function showCursor(): string {
  return '\x1b[?25h';
}

/**
 * Get terminal width
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Get terminal height
 */
export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

/**
 * Word wrap text to fit terminal width
 */
export function wrapText(text: string, width?: number): string {
  const terminalWidth = width || getTerminalWidth();
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length > terminalWidth) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        // Word is longer than terminal width, split it
        lines.push(word.slice(0, terminalWidth));
        currentLine = word.slice(terminalWidth) + ' ';
      }
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n');
}

/**
 * Truncate text to fit within specified length
 */
export function truncateText(text: string, maxLength: number, ellipsis = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Pad text to specified width
 */
export function padText(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  if (text.length >= width) {
    return text;
  }
  
  const padding = width - text.length;
  
  switch (align) {
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    
    case 'right':
      return ' '.repeat(padding) + text;
    
    default: // left
      return text + ' '.repeat(padding);
  }
}

/**
 * Create a horizontal line
 */
export function createHorizontalLine(char = '-', width?: number): string {
  const lineWidth = width || getTerminalWidth();
  return char.repeat(lineWidth);
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  
  if (seconds < 60) {
    return ms > 0 ? `${seconds}.${Math.floor(ms / 100)}s` : `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Create a progress bar
 */
export function createProgressBar(
  current: number, 
  total: number, 
  width = 20, 
  filled = '█', 
  empty = '░'
): string {
  const percentage = Math.min(current / total, 1);
  const filledWidth = Math.floor(percentage * width);
  const emptyWidth = width - filledWidth;
  
  const bar = filled.repeat(filledWidth) + empty.repeat(emptyWidth);
  const percent = (percentage * 100).toFixed(1);
  
  return `[${bar}] ${percent}%`;
}

/**
 * Create a spinner animation frame
 */
export function getSpinnerFrame(frameIndex: number): string {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  return frames[frameIndex % frames.length];
}

/**
 * Check if running in TTY (interactive terminal)
 */
export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY);
}

/**
 * Get terminal info
 */
export function getTerminalInfo(): {
  isTTY: boolean;
  width: number;
  height: number;
  colorDepth: number;
} {
  return {
    isTTY: isTTY(),
    width: getTerminalWidth(),
    height: getTerminalHeight(),
    colorDepth: process.stdout.getColorDepth ? process.stdout.getColorDepth() : 1
  };
}