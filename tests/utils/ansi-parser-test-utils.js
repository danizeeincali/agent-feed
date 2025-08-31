/**
 * Utility functions for ANSI parsing tests
 * Provides helpers for testing claudable feature parity
 */

import { performance } from 'perf_hooks';

export class ANSITestUtils {
  /**
   * Parse ANSI escape codes and measure performance
   * @param {string} input - Raw ANSI input
   * @returns {Object} Parsed result with metrics
   */
  static parseWithMetrics(input) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    const result = this.parseANSI(input);
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;
    
    return {
      parsed: result,
      metrics: {
        parseTime: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        inputLength: input.length,
        outputLength: result.text.length,
      },
    };
  }

  /**
   * Core ANSI parsing function (to be implemented)
   * @param {string} input - Raw ANSI input
   * @returns {Object} Parsed output
   */
  static parseANSI(input) {
    // This will be replaced with actual parsing logic
    return {
      html: this.ansiToHtml(input),
      text: this.ansiToText(input),
      structure: this.extractStructure(input),
    };
  }

  /**
   * Convert ANSI to HTML
   * @param {string} input - ANSI input
   * @returns {string} HTML output
   */
  static ansiToHtml(input) {
    let html = input;
    
    // Color mappings
    const colorMap = {
      '\u001b[30m': '<span class="ansi-black">',
      '\u001b[31m': '<span class="ansi-red">',
      '\u001b[32m': '<span class="ansi-green">',
      '\u001b[33m': '<span class="ansi-yellow">',
      '\u001b[34m': '<span class="ansi-blue">',
      '\u001b[35m': '<span class="ansi-magenta">',
      '\u001b[36m': '<span class="ansi-cyan">',
      '\u001b[37m': '<span class="ansi-white">',
      '\u001b[90m': '<span class="ansi-bright-black">',
      '\u001b[91m': '<span class="ansi-bright-red">',
      '\u001b[92m': '<span class="ansi-bright-green">',
      '\u001b[93m': '<span class="ansi-bright-yellow">',
      '\u001b[94m': '<span class="ansi-bright-blue">',
      '\u001b[95m': '<span class="ansi-bright-magenta">',
      '\u001b[96m': '<span class="ansi-bright-cyan">',
      '\u001b[97m': '<span class="ansi-bright-white">',
    };
    
    // Style mappings
    const styleMap = {
      '\u001b[1m': '<strong>',
      '\u001b[2m': '<span class="ansi-dim">',
      '\u001b[3m': '<em>',
      '\u001b[4m': '<u>',
      '\u001b[9m': '<s>',
      '\u001b[0m': '</span>',
    };
    
    // Apply color transformations
    Object.entries(colorMap).forEach(([ansi, html]) => {
      html = html.replace(new RegExp(this.escapeRegex(ansi), 'g'), html);
    });
    
    // Apply style transformations
    Object.entries(styleMap).forEach(([ansi, htmlTag]) => {
      html = html.replace(new RegExp(this.escapeRegex(ansi), 'g'), htmlTag);
    });
    
    // Clean up cursor movement and other control sequences
    html = html.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
    
    return html;
  }

  /**
   * Convert ANSI to plain text
   * @param {string} input - ANSI input
   * @returns {string} Plain text output
   */
  static ansiToText(input) {
    // Remove all ANSI escape sequences
    return input.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
  }

  /**
   * Extract structural elements from ANSI output
   * @param {string} input - ANSI input
   * @returns {Object} Structural analysis
   */
  static extractStructure(input) {
    const structure = {
      hasColors: /\u001b\[3[0-7]m/.test(input),
      hasStyles: /\u001b\[[1-9]m/.test(input),
      hasProgress: /[█▓▒░]/.test(input),
      hasTable: /[┌┐└┘├┤┬┴┼─│]/.test(input),
      hasSuccess: /✓/.test(input),
      hasError: /✗|Error:/.test(input),
      hasWarning: /⚠|Warning:/.test(input),
      lineCount: input.split('\n').length,
      complexity: this.calculateComplexity(input),
    };
    
    return structure;
  }

  /**
   * Calculate complexity score for ANSI input
   * @param {string} input - ANSI input
   * @returns {number} Complexity score
   */
  static calculateComplexity(input) {
    let complexity = 0;
    
    // Base complexity from length
    complexity += input.length / 1000;
    
    // ANSI codes add complexity
    const ansiMatches = input.match(/\u001b\[[0-9;]*[A-Za-z]/g);
    complexity += ansiMatches ? ansiMatches.length * 0.5 : 0;
    
    // Special characters add complexity
    const specialChars = input.match(/[█▓▒░┌┐└┘├┤┬┴┼─│✓✗⚠]/g);
    complexity += specialChars ? specialChars.length * 0.3 : 0;
    
    return Math.round(complexity * 100) / 100;
  }

  /**
   * Escape special regex characters
   * @param {string} string - Input string
   * @returns {string} Escaped string
   */
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Compare two parsing results for similarity
   * @param {Object} result1 - First parsing result
   * @param {Object} result2 - Second parsing result
   * @returns {number} Similarity score (0-1)
   */
  static compareSimilarity(result1, result2) {
    const text1 = result1.text || '';
    const text2 = result2.text || '';
    
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  static levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null)
      .map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Generate test data with various ANSI patterns
   * @param {number} complexity - Desired complexity level (1-10)
   * @returns {string} Generated ANSI test data
   */
  static generateTestData(complexity = 5) {
    const colors = ['\u001b[31m', '\u001b[32m', '\u001b[33m', '\u001b[36m'];
    const styles = ['\u001b[1m', '\u001b[4m'];
    const reset = '\u001b[0m';
    
    let output = '';
    
    for (let i = 0; i < complexity; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const style = Math.random() > 0.5 ? styles[Math.floor(Math.random() * styles.length)] : '';
      
      output += `${color}${style}Test line ${i + 1}${reset}\n`;
      
      if (Math.random() > 0.7) {
        output += `${colors[1]}✓ Success message${reset}\n`;
      }
      
      if (Math.random() > 0.8) {
        output += `${colors[0]}Error: Something went wrong${reset}\n`;
      }
    }
    
    return output;
  }

  /**
   * Validate parsing results against expected output
   * @param {Object} actual - Actual parsing result
   * @param {Object} expected - Expected parsing result
   * @returns {Object} Validation result
   */
  static validateParsing(actual, expected) {
    const validation = {
      textMatch: this.compareSimilarity({ text: actual.text }, { text: expected.text }),
      htmlValid: this.isValidHTML(actual.html),
      structureMatch: this.compareStructure(actual.structure, expected.structure),
      performanceOk: this.validatePerformance(actual.metrics),
    };
    
    validation.overallScore = (
      validation.textMatch * 0.4 +
      (validation.htmlValid ? 1 : 0) * 0.3 +
      validation.structureMatch * 0.2 +
      (validation.performanceOk ? 1 : 0) * 0.1
    );
    
    return validation;
  }

  /**
   * Check if HTML is valid
   * @param {string} html - HTML string to validate
   * @returns {boolean} Is valid HTML
   */
  static isValidHTML(html) {
    try {
      // Basic validation - check for unclosed tags
      const openTags = (html.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (html.match(/<\/[^>]*>/g) || []).length;
      const selfClosing = (html.match(/<[^>]*\/>/g) || []).length;
      
      // Allow for some flexibility with self-closing tags
      return Math.abs(openTags - closeTags) <= selfClosing + 2;
    } catch (error) {
      return false;
    }
  }

  /**
   * Compare structural analysis results
   * @param {Object} actual - Actual structure
   * @param {Object} expected - Expected structure
   * @returns {number} Similarity score (0-1)
   */
  static compareStructure(actual, expected) {
    if (!actual || !expected) return 0;
    
    const keys = ['hasColors', 'hasStyles', 'hasProgress', 'hasTable', 'hasSuccess', 'hasError', 'hasWarning'];
    let matches = 0;
    
    keys.forEach(key => {
      if (actual[key] === expected[key]) matches++;
    });
    
    return matches / keys.length;
  }

  /**
   * Validate performance metrics
   * @param {Object} metrics - Performance metrics
   * @returns {boolean} Performance is acceptable
   */
  static validatePerformance(metrics) {
    if (!metrics) return false;
    
    return metrics.parseTime < 1000 && // < 1 second
           metrics.memoryDelta < 100 * 1024 * 1024; // < 100MB
  }
}

export default ANSITestUtils;