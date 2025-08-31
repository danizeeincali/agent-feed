/**
 * Edge case test data for Claude response parsing
 * Covers unusual, malformed, and boundary condition inputs
 */

export const EDGE_CASE_RESPONSES = {
  // Empty and minimal responses
  empty: {
    input: '',
    expected: { text: '', html: '', hasContent: false }
  },

  whitespaceOnly: {
    input: '   \n\n\t\t   \n   ',
    expected: { text: '   \n\n\t\t   \n   ', html: '   \n\n\t\t   \n   ', hasContent: true }
  },

  singleCharacter: {
    input: 'A',
    expected: { text: 'A', html: 'A', hasContent: true }
  },

  // Malformed ANSI sequences
  incompleteEscape: {
    input: 'Text with \u001b[ incomplete escape sequence',
    expected: { text: 'Text with  incomplete escape sequence', html: 'Text with  incomplete escape sequence', hasAnsi: false }
  },

  invalidColorCode: {
    input: '\u001b[999mInvalid color code\u001b[0m',
    expected: { text: 'Invalid color code', html: 'Invalid color code', hasAnsi: false }
  },

  unclosedAnsi: {
    input: '\u001b[32mThis color is never closed',
    expected: { text: 'This color is never closed', html: '<span class="ansi-green">This color is never closed</span>', hasAnsi: true }
  },

  multipleResets: {
    input: '\u001b[32mGreen\u001b[0m\u001b[0m\u001b[0m text',
    expected: { text: 'Green text', html: '<span class="ansi-green">Green</span> text', hasAnsi: true }
  },

  emptyAnsiCode: {
    input: '\u001b[mEmpty code\u001b[0m',
    expected: { text: 'Empty code', html: 'Empty code', hasAnsi: false }
  },

  // Boundary conditions
  veryLongLine: {
    input: 'A'.repeat(100000) + '\u001b[32mEnd\u001b[0m',
    expected: { 
      text: 'A'.repeat(100000) + 'End',
      html: 'A'.repeat(100000) + '<span class="ansi-green">End</span>',
      hasAnsi: true,
      length: 100003
    }
  },

  manyLines: {
    input: Array(10000).fill('Line').map((line, i) => `${line} ${i + 1}`).join('\n'),
    expected: { 
      lineCount: 10000,
      hasContent: true,
      containsText: 'Line 1',
      endsWithText: 'Line 10000'
    }
  },

  deepNesting: {
    input: '\u001b[1m'.repeat(100) + 'Deep nesting' + '\u001b[0m'.repeat(100),
    expected: { 
      text: 'Deep nesting',
      html: '<strong>'.repeat(100) + 'Deep nesting' + '</span>'.repeat(100),
      hasAnsi: true,
      complexity: 'high'
    }
  },

  // Unicode and special characters
  unicodeEmojis: {
    input: '\u001b[32m🎉 Success! 🚀\u001b[0m \u001b[31m❌ Error 💥\u001b[0m',
    expected: { 
      text: '🎉 Success! 🚀 ❌ Error 💥',
      html: '<span class="ansi-green">🎉 Success! 🚀</span> <span class="ansi-red">❌ Error 💥</span>',
      hasAnsi: true,
      hasEmojis: true
    }
  },

  unicodeText: {
    input: '\u001b[36mHëllö Wørld! 你好世界 مرحبا بالعالم\u001b[0m',
    expected: { 
      text: 'Hëllö Wørld! 你好世界 مرحبا بالعالم',
      html: '<span class="ansi-cyan">Hëllö Wørld! 你好世界 مرحبا بالعالم</span>',
      hasAnsi: true,
      hasUnicode: true
    }
  },

  zeroWidthCharacters: {
    input: 'Text\u200Bwith\u200Czero\u200Dwidth\uFEFFcharacters',
    expected: { 
      text: 'Textwithzerowidthcharacters',
      html: 'Textwithzerowidthcharacters',
      hasZeroWidth: true
    }
  },

  // Control characters
  controlCharacters: {
    input: 'Text\u0000with\u0001control\u0002chars\u0003',
    expected: { 
      text: 'Textwithcontrolchars',
      html: 'Textwithcontrolchars',
      hasControlChars: true
    }
  },

  bellCharacter: {
    input: 'Alert\u0007 sound',
    expected: { text: 'Alert sound', html: 'Alert sound' }
  },

  backspaceCharacters: {
    input: 'Hello\b\b\b\b\bWorld',
    expected: { text: 'World', html: 'World' }
  },

  // Mixed line endings
  mixedLineEndings: {
    input: 'Line 1\nLine 2\r\nLine 3\rLine 4',
    expected: { 
      text: 'Line 1\nLine 2\nLine 3\nLine 4',
      html: 'Line 1\nLine 2\nLine 3\nLine 4',
      lineCount: 4
    }
  },

  // Extended ANSI codes
  eightBitColors: {
    input: '\u001b[38;5;196mBright Red\u001b[0m \u001b[48;5;21mBlue Background\u001b[0m',
    expected: { 
      text: 'Bright Red Blue Background',
      html: '<span style="color: rgb(255,0,95)">Bright Red</span> <span style="background-color: rgb(0,0,255)">Blue Background</span>',
      hasExtendedColors: true
    }
  },

  twentyFourBitColors: {
    input: '\u001b[38;2;255;165;0mOrange\u001b[0m \u001b[48;2;128;0;128mPurple BG\u001b[0m',
    expected: { 
      text: 'Orange Purple BG',
      html: '<span style="color: rgb(255,165,0)">Orange</span> <span style="background-color: rgb(128,0,128)">Purple BG</span>',
      hasTrueColors: true
    }
  },

  // Cursor movement and screen control
  cursorMovement: {
    input: '\u001b[2J\u001b[H\u001b[32mCleared screen\u001b[0m\u001b[K',
    expected: { 
      text: 'Cleared screen',
      html: '<span class="ansi-green">Cleared screen</span>',
      hasCursorControls: true
    }
  },

  scrollingRegion: {
    input: '\u001b[1;10r\u001b[32mScrolling region text\u001b[0m',
    expected: { 
      text: 'Scrolling region text',
      html: '<span class="ansi-green">Scrolling region text</span>',
      hasScrollControl: true
    }
  },

  // Hyperlinks (OSC 8)
  hyperlinks: {
    input: '\u001b]8;;https://example.com\u001b\\Link text\u001b]8;;\u001b\\',
    expected: { 
      text: 'Link text',
      html: '<a href="https://example.com">Link text</a>',
      hasHyperlinks: true
    }
  },

  // Title sequences
  titleSequence: {
    input: '\u001b]0;Window Title\u001b\\Content text',
    expected: { 
      text: 'Content text',
      html: 'Content text',
      hasTitle: true,
      title: 'Window Title'
    }
  },

  // Complex formatting combinations
  nestedFormatting: {
    input: '\u001b[1m\u001b[4m\u001b[32mBold underlined green\u001b[0m normal \u001b[31m\u001b[3mItalic red\u001b[0m',
    expected: { 
      text: 'Bold underlined green normal Italic red',
      html: '<strong><u><span class="ansi-green">Bold underlined green</span></u></strong> normal <span class="ansi-red"><em>Italic red</em></span>',
      hasNestedFormatting: true
    }
  },

  overlappingReset: {
    input: '\u001b[1m\u001b[32mBold green\u001b[22m not bold\u001b[0m normal',
    expected: { 
      text: 'Bold green not bold normal',
      html: '<strong><span class="ansi-green">Bold green</span></strong><span class="ansi-green"> not bold</span> normal',
      hasPartialReset: true
    }
  },

  // Performance stress cases
  manyColorChanges: {
    input: Array(1000).fill(null).map((_, i) => 
      `\u001b[3${i % 6 + 1}mColor${i}\u001b[0m`
    ).join(' '),
    expected: { 
      hasAnsi: true,
      colorCount: 1000,
      performanceTest: true
    }
  },

  rapidToggling: {
    input: Array(500).fill('\u001b[1mB\u001b[22m\u001b[1mO\u001b[22m\u001b[1mL\u001b[22m\u001b[1mD\u001b[22m ').join(''),
    expected: { 
      text: 'BOLD '.repeat(500),
      hasRapidToggling: true,
      performanceTest: true
    }
  },

  // Real-world edge cases from Claude responses
  codeBlockWithAnsi: {
    input: '\u001b[36mCode:\u001b[0m\n\u001b[90m```javascript\u001b[0m\n\u001b[35mconst\u001b[0m \u001b[33mfunc\u001b[0m \u001b[90m=\u001b[0m \u001b[90m(\u001b[0m\u001b[90m)\u001b[0m \u001b[90m=>\u001b[0m \u001b[90m{\u001b[0m\n  \u001b[35mreturn\u001b[0m \u001b[32m\'Hello\'\u001b[0m\u001b[90m;\u001b[0m\n\u001b[90m}\u001b[0m\u001b[90m;\u001b[0m\n\u001b[90m```\u001b[0m',
    expected: { 
      text: 'Code:\n```javascript\nconst func = () => {\n  return \'Hello\';\n};\n```',
      html: '<span class="ansi-cyan">Code:</span>\n<span class="ansi-bright-black">```javascript</span>\n<span class="ansi-magenta">const</span> <span class="ansi-yellow">func</span> <span class="ansi-bright-black">=</span> <span class="ansi-bright-black">(</span><span class="ansi-bright-black">)</span> <span class="ansi-bright-black">=></span> <span class="ansi-bright-black">{</span>\n  <span class="ansi-magenta">return</span> <span class="ansi-green">\'Hello\'</span><span class="ansi-bright-black">;</span>\n<span class="ansi-bright-black">}</span><span class="ansi-bright-black">;</span>\n<span class="ansi-bright-black">```</span>',
      hasCodeBlock: true
    }
  },

  errorWithStackTrace: {
    input: '\u001b[31mError:\u001b[0m Something went wrong\n\u001b[90mStack trace:\u001b[0m\n\u001b[90m  at function1 (file1.js:10:5)\u001b[0m\n\u001b[90m  at function2 (file2.js:20:10)\u001b[0m\n\u001b[90m  at main (index.js:30:15)\u001b[0m',
    expected: { 
      text: 'Error: Something went wrong\nStack trace:\n  at function1 (file1.js:10:5)\n  at function2 (file2.js:20:10)\n  at main (index.js:30:15)',
      hasError: true,
      hasStackTrace: true,
      lineCount: 5
    }
  },

  progressBarWithPercentage: {
    input: '\u001b[36mProcessing...\u001b[0m\n\u001b[90m[\u001b[0m\u001b[32m████████████████████\u001b[0m\u001b[90m]\u001b[0m \u001b[32m100%\u001b[0m \u001b[90m(2.5s)\u001b[0m\n\u001b[32m✓\u001b[0m \u001b[36mComplete!\u001b[0m',
    expected: { 
      text: 'Processing...\n[████████████████████] 100% (2.5s)\n✓ Complete!',
      hasProgressBar: true,
      hasPercentage: true,
      hasSuccess: true
    }
  },

  // Pathological cases that could cause issues
  nullBytes: {
    input: 'Text\u0000with\u0000null\u0000bytes',
    expected: { text: 'Textwithullbytes', html: 'Textwithullbytes' }
  },

  extremelyLongAnsiSequence: {
    input: '\u001b[' + '1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20'.repeat(100) + 'm' + 'Text' + '\u001b[0m',
    expected: { 
      text: 'Text',
      html: 'Text',
      hasComplexAnsi: true
    }
  },

  recursiveEscapeSequences: {
    input: '\u001b[\u001b[32m31mNested escapes\u001b[0m',
    expected: { 
      text: '31mNested escapes',
      html: '<span class="ansi-green">31mNested escapes</span>',
      hasNestedEscapes: true
    }
  },

  binaryData: {
    input: 'Text\xFF\xFE\x00\x01Binary\x80\x81Data',
    expected: { 
      text: 'TextBinaryData',
      html: 'TextBinaryData',
      hasBinaryData: true
    }
  },
};

// Generate additional stress test cases
export const STRESS_TEST_CASES = {
  generateLargeResponse: (size = 10000) => {
    const colors = [31, 32, 33, 34, 35, 36];
    const styles = [1, 3, 4];
    let result = '';
    
    for (let i = 0; i < size; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const style = Math.random() > 0.7 ? styles[Math.floor(Math.random() * styles.length)] : null;
      
      const ansiStart = style ? `\u001b[${style};${color}m` : `\u001b[${color}m`;
      result += `${ansiStart}Line ${i + 1}: Some content here\u001b[0m\n`;
      
      if (i % 100 === 0) {
        result += '\u001b[32m✓ Checkpoint reached\u001b[0m\n';
      }
    }
    
    return {
      input: result,
      expected: {
        lineCount: size + Math.floor(size / 100),
        hasAnsi: true,
        performanceTest: true,
        size: 'large'
      }
    };
  },

  generateMalformedSequence: (count = 1000) => {
    const malformations = [
      () => '\u001b[999m',  // Invalid color
      () => '\u001b[',       // Incomplete
      () => '\u001b[;m',     // Empty parameter
      () => '\u001b[1;2;3;4;5;6;7;8;9;10;11;12;13;14;15m', // Too many params
      () => '\u001b[1' + 'x'.repeat(100) + 'm', // Invalid characters
    ];
    
    let result = '';
    for (let i = 0; i < count; i++) {
      const malform = malformations[Math.floor(Math.random() * malformations.length)];
      result += malform() + `Text ${i} `;
      
      if (Math.random() > 0.8) {
        result += '\u001b[0m'; // Occasional valid reset
      }
    }
    
    return {
      input: result,
      expected: {
        malformedCount: count,
        performanceTest: true,
        errorRecovery: true
      }
    };
  },
};

export default EDGE_CASE_RESPONSES;