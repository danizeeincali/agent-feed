/**
 * Setup file for CSS compilation tests
 */

// Increase timeout for longer-running CSS compilation tests
jest.setTimeout(120000);

// Mock console.warn to capture CSS warnings during tests
const originalWarn = console.warn;
console.warn = jest.fn((...args) => {
  // Still log warnings but capture them
  originalWarn(...args);
});

// Setup global test environment
beforeAll(() => {
  // Ensure we're in the correct working directory
  process.chdir(__dirname.replace('/tests', ''));
});

afterAll(() => {
  // Restore console.warn
  console.warn = originalWarn;
});

// Global CSS test utilities
global.CSS_TEST_UTILS = {
  // Helper to check if CSS contains specific rules
  containsRule: (css, selector) => {
    const regex = new RegExp(`${selector}\\s*\\{[^}]*\\}`, 'g');
    return regex.test(css);
  },

  // Helper to extract CSS rules
  extractRules: (css, selector) => {
    const regex = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g');
    const matches = [];
    let match;
    while ((match = regex.exec(css)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  },

  // Helper to count occurrences of a pattern
  countOccurrences: (css, pattern) => {
    const regex = new RegExp(pattern, 'g');
    const matches = css.match(regex);
    return matches ? matches.length : 0;
  }
};