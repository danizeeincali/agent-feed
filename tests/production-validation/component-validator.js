/**
 * Component Validation Helper
 * Validates React components for production readiness
 */

const fs = require('fs').promises;

class ComponentValidator {
  constructor() {
    this.issues = [];
    this.warnings = [];
  }

  async validateComponent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Reset counters
      this.issues = [];
      this.warnings = [];

      // Check for React imports
      if (!content.includes('import React') && !content.includes('from \'react\'')) {
        this.issues.push('Missing React import');
      }

      // Check for proper exports
      if (!content.includes('export default') && !content.includes('export {')) {
        this.issues.push('Missing proper export statement');
      }

      // Check for debug statements (should not be in production)
      if (content.includes('console.log') || content.includes('console.error')) {
        this.warnings.push('Contains console statements - should be removed for production');
      }

      // Check for TODO comments (should not be in production)
      if (content.includes('TODO') || content.includes('FIXME')) {
        this.warnings.push('Contains TODO/FIXME comments - should be resolved for production');
      }

      // Check for proper TypeScript (if .tsx file)
      if (filePath.endsWith('.tsx')) {
        if (!content.includes('React.FC') && !content.includes(': React.') && !content.includes('interface ') && !content.includes('type ')) {
          this.warnings.push('TypeScript file should have proper type definitions');
        }
      }

      // Check for accessibility
      if (!content.includes('aria-') && !content.includes('data-testid')) {
        this.warnings.push('Consider adding accessibility attributes or test IDs');
      }

      // Check for error boundaries or error handling
      if (content.includes('useEffect') && !content.includes('catch') && !content.includes('try')) {
        this.warnings.push('Consider adding error handling for async operations');
      }

      // NEW: More lenient validation for production components
      const hasValidReactSyntax = content.includes('React') && 
                                content.includes('export') &&
                                !content.includes('CRITICAL_ERROR') && // Only fail on critical errors
                                !content.includes('SYNTAX_ERROR');

      return {
        isValid: this.issues.length === 0 && hasValidReactSyntax,
        issues: this.issues,
        warnings: this.warnings,
        score: this.calculateScore()
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Failed to read component: ${error.message}`],
        warnings: [],
        score: 0
      };
    }
  }

  calculateScore() {
    const baseScore = 100;
    const issuesPenalty = this.issues.length * 20;
    const warningsPenalty = this.warnings.length * 5;
    return Math.max(0, baseScore - issuesPenalty - warningsPenalty);
  }
}

module.exports = { ComponentValidator };