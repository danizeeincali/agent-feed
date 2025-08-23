/**
 * Terminal utility functions and helpers
 */

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

/**
 * Predefined terminal themes
 */
export const terminalThemes: Record<string, TerminalTheme> = {
  dark: {
    background: '#1e1e1e',
    foreground: '#ffffff',
    cursor: '#ffffff',
    selection: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#e74c3c',
    green: '#2ecc71',
    yellow: '#f1c40f',
    blue: '#3498db',
    magenta: '#9b59b6',
    cyan: '#1abc9c',
    white: '#ecf0f1',
    brightBlack: '#34495e',
    brightRed: '#c0392b',
    brightGreen: '#27ae60',
    brightYellow: '#f39c12',
    brightBlue: '#2980b9',
    brightMagenta: '#8e44ad',
    brightCyan: '#16a085',
    brightWhite: '#ffffff'
  },
  light: {
    background: '#ffffff',
    foreground: '#2c3e50',
    cursor: '#2c3e50',
    selection: 'rgba(52, 73, 94, 0.3)',
    black: '#2c3e50',
    red: '#e74c3c',
    green: '#27ae60',
    yellow: '#f39c12',
    blue: '#3498db',
    magenta: '#9b59b6',
    cyan: '#1abc9c',
    white: '#ecf0f1',
    brightBlack: '#7f8c8d',
    brightRed: '#c0392b',
    brightGreen: '#2ecc71',
    brightYellow: '#f1c40f',
    brightBlue: '#2980b9',
    brightMagenta: '#8e44ad',
    brightCyan: '#16a085',
    brightWhite: '#ffffff'
  },
  solarizedDark: {
    background: '#002b36',
    foreground: '#839496',
    cursor: '#839496',
    selection: 'rgba(131, 148, 150, 0.3)',
    black: '#073642',
    red: '#dc322f',
    green: '#859900',
    yellow: '#b58900',
    blue: '#268bd2',
    magenta: '#d33682',
    cyan: '#2aa198',
    white: '#eee8d5',
    brightBlack: '#586e75',
    brightRed: '#cb4b16',
    brightGreen: '#93a1a1',
    brightYellow: '#839496',
    brightBlue: '#657b83',
    brightMagenta: '#6c71c4',
    brightCyan: '#93a1a1',
    brightWhite: '#fdf6e3'
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selection: 'rgba(255, 255, 255, 0.3)',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
    brightBlack: '#75715e',
    brightRed: '#f92672',
    brightGreen: '#a6e22e',
    brightYellow: '#f4bf75',
    brightBlue: '#66d9ef',
    brightMagenta: '#ae81ff',
    brightCyan: '#a1efe4',
    brightWhite: '#f9f8f5'
  }
};

/**
 * Terminal keyboard shortcuts and key codes
 */
export const terminalKeys = {
  // Control sequences
  CTRL_C: '\x03',
  CTRL_D: '\x04',
  CTRL_Z: '\x1a',
  CTRL_L: '\x0c',
  
  // Navigation
  UP_ARROW: '\x1b[A',
  DOWN_ARROW: '\x1b[B',
  RIGHT_ARROW: '\x1b[C',
  LEFT_ARROW: '\x1b[D',
  HOME: '\x1b[H',
  END: '\x1b[F',
  PAGE_UP: '\x1b[5~',
  PAGE_DOWN: '\x1b[6~',
  
  // Special keys
  TAB: '\t',
  ENTER: '\r',
  BACKSPACE: '\x7f',
  DELETE: '\x1b[3~',
  ESCAPE: '\x1b',
  
  // Function keys
  F1: '\x1b[11~',
  F2: '\x1b[12~',
  F3: '\x1b[13~',
  F4: '\x1b[14~',
  F5: '\x1b[15~',
  F6: '\x1b[17~',
  F7: '\x1b[18~',
  F8: '\x1b[19~',
  F9: '\x1b[20~',
  F10: '\x1b[21~',
  F11: '\x1b[23~',
  F12: '\x1b[24~'
};

/**
 * Convert keyboard event to terminal input
 */
export const keyboardEventToTerminalInput = (event: KeyboardEvent): string | null => {
  const { key, ctrlKey, altKey, shiftKey, metaKey } = event;
  
  // Handle control sequences
  if (ctrlKey && !altKey && !metaKey) {
    switch (key.toLowerCase()) {
      case 'c': return terminalKeys.CTRL_C;
      case 'd': return terminalKeys.CTRL_D;
      case 'z': return terminalKeys.CTRL_Z;
      case 'l': return terminalKeys.CTRL_L;
    }
  }
  
  // Handle navigation keys
  switch (key) {
    case 'ArrowUp': return terminalKeys.UP_ARROW;
    case 'ArrowDown': return terminalKeys.DOWN_ARROW;
    case 'ArrowRight': return terminalKeys.RIGHT_ARROW;
    case 'ArrowLeft': return terminalKeys.LEFT_ARROW;
    case 'Home': return terminalKeys.HOME;
    case 'End': return terminalKeys.END;
    case 'PageUp': return terminalKeys.PAGE_UP;
    case 'PageDown': return terminalKeys.PAGE_DOWN;
    case 'Tab': return terminalKeys.TAB;
    case 'Enter': return terminalKeys.ENTER;
    case 'Backspace': return terminalKeys.BACKSPACE;
    case 'Delete': return terminalKeys.DELETE;
    case 'Escape': return terminalKeys.ESCAPE;
  }
  
  // Handle function keys
  if (key.startsWith('F') && key.length <= 3) {
    const fKeyMap: Record<string, string> = {
      F1: terminalKeys.F1,
      F2: terminalKeys.F2,
      F3: terminalKeys.F3,
      F4: terminalKeys.F4,
      F5: terminalKeys.F5,
      F6: terminalKeys.F6,
      F7: terminalKeys.F7,
      F8: terminalKeys.F8,
      F9: terminalKeys.F9,
      F10: terminalKeys.F10,
      F11: terminalKeys.F11,
      F12: terminalKeys.F12
    };
    return fKeyMap[key] || null;
  }
  
  // Handle printable characters
  if (key.length === 1) {
    return key;
  }
  
  return null;
};

/**
 * Format terminal output for display
 */
export const formatTerminalOutput = (data: string): string => {
  // Handle common terminal escape sequences
  return data
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\r/g, '\n')    // Convert CR to LF
    .replace(/\x1b\[K/g, '')  // Clear line
    .replace(/\x1b\[2J/g, ''); // Clear screen
};

/**
 * Parse ANSI color codes
 */
export const parseAnsiColors = (text: string): { text: string; colors: Array<{ start: number; end: number; color: string; }> } => {
  const colorMap: Record<string, string> = {
    '30': 'black',
    '31': 'red',
    '32': 'green',
    '33': 'yellow',
    '34': 'blue',
    '35': 'magenta',
    '36': 'cyan',
    '37': 'white',
    '90': 'brightBlack',
    '91': 'brightRed',
    '92': 'brightGreen',
    '93': 'brightYellow',
    '94': 'brightBlue',
    '95': 'brightMagenta',
    '96': 'brightCyan',
    '97': 'brightWhite'
  };
  
  const colors: Array<{ start: number; end: number; color: string; }> = [];
  let cleanText = '';
  let currentPosition = 0;
  
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  let match;
  let lastIndex = 0;
  
  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the escape sequence
    cleanText += text.substring(lastIndex, match.index);
    
    const codes = match[1].split(';').filter(code => code !== '');
    for (const code of codes) {
      if (colorMap[code]) {
        colors.push({
          start: currentPosition,
          end: -1, // Will be set when color is reset
          color: colorMap[code]
        });
      } else if (code === '0' || code === '') {
        // Reset - close all open colors
        colors.forEach(colorEntry => {
          if (colorEntry.end === -1) {
            colorEntry.end = currentPosition;
          }
        });
      }
    }
    
    lastIndex = ansiRegex.lastIndex;
  }
  
  // Add remaining text
  cleanText += text.substring(lastIndex);
  
  // Close any remaining open colors
  colors.forEach(colorEntry => {
    if (colorEntry.end === -1) {
      colorEntry.end = cleanText.length;
    }
  });
  
  return { text: cleanText, colors };
};

/**
 * Validate WebSocket URL
 */
export const validateWebSocketUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'ws:' || parsedUrl.protocol === 'wss:';
  } catch {
    return false;
  }
};

/**
 * Get optimal terminal dimensions for container
 */
export const getOptimalTerminalDimensions = (
  containerWidth: number,
  containerHeight: number,
  fontSize: number,
  fontFamily: string = 'monospace'
): { cols: number; rows: number } => {
  // Create a temporary element to measure character dimensions
  const tempElement = document.createElement('div');
  tempElement.style.position = 'absolute';
  tempElement.style.visibility = 'hidden';
  tempElement.style.fontSize = `${fontSize}px`;
  tempElement.style.fontFamily = fontFamily;
  tempElement.textContent = 'M'; // Use 'M' as it's typically the widest character
  
  document.body.appendChild(tempElement);
  
  const charWidth = tempElement.offsetWidth;
  const charHeight = tempElement.offsetHeight;
  
  document.body.removeChild(tempElement);
  
  const cols = Math.floor(containerWidth / charWidth);
  const rows = Math.floor(containerHeight / charHeight);
  
  return {
    cols: Math.max(1, cols),
    rows: Math.max(1, rows)
  };
};

/**
 * Terminal command history management
 */
export class TerminalHistory {
  private history: string[] = [];
  private currentIndex = -1;
  private maxSize = 1000;
  
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }
  
  add(command: string): void {
    if (command.trim() === '') return;
    
    // Remove duplicate if it exists
    const existingIndex = this.history.indexOf(command);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }
    
    // Add to end
    this.history.push(command);
    
    // Trim if too large
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
    
    this.currentIndex = this.history.length;
  }
  
  getPrevious(): string | null {
    if (this.history.length === 0) return null;
    
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    return this.history[this.currentIndex];
  }
  
  getNext(): string | null {
    if (this.history.length === 0) return null;
    
    this.currentIndex = Math.min(this.history.length - 1, this.currentIndex + 1);
    return this.currentIndex < this.history.length ? this.history[this.currentIndex] : '';
  }
  
  reset(): void {
    this.currentIndex = this.history.length;
  }
  
  getAll(): string[] {
    return [...this.history];
  }
  
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}