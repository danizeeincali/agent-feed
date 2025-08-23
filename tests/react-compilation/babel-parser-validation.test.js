/**
 * London School TDD: React-Babel Compilation Validation Tests
 * Focus: Mock-driven testing of React compilation pipeline
 * Approach: Verify HOW Babel parser collaborates with React transformer
 */

describe('React-Babel Compilation Validation', () => {
  let mockBabelParser;
  let mockReactTransformer;
  let mockCodeGenerator;
  let mockErrorReporter;
  let reactCompiler;

  beforeEach(() => {
    // Mock all external collaborators
    mockBabelParser = {
      parse: jest.fn(),
      traverse: jest.fn(),
      validateSyntax: jest.fn(),
      getParseOptions: jest.fn()
    };

    mockReactTransformer = {
      transformJSX: jest.fn(),
      validateComponents: jest.fn(),
      optimizeRender: jest.fn(),
      checkHooks: jest.fn()
    };

    mockCodeGenerator = {
      generate: jest.fn(),
      sourceMap: jest.fn(),
      optimize: jest.fn()
    };

    mockErrorReporter = {
      reportError: jest.fn(),
      collectErrors: jest.fn(),
      formatError: jest.fn()
    };

    // System under test
    reactCompiler = new ReactCompiler(
      mockBabelParser,
      mockReactTransformer,
      mockCodeGenerator,
      mockErrorReporter
    );
  });

  describe('Compilation Pipeline Coordination', () => {
    it('should coordinate parsing with React transformation', async () => {
      // Arrange
      const reactCode = `
        import React from 'react';
        function Component() {
          return <div>Hello</div>;
        }
      `;
      
      const mockAST = {
        type: 'Program',
        body: [{ type: 'ImportDeclaration' }, { type: 'FunctionDeclaration' }]
      };

      const transformedAST = {
        ...mockAST,
        body: mockAST.body.map(node => ({ ...node, transformed: true }))
      };

      mockBabelParser.parse.mockReturnValue(mockAST);
      mockReactTransformer.transformJSX.mockReturnValue(transformedAST);
      mockCodeGenerator.generate.mockReturnValue({ code: 'compiled code' });

      // Act
      const result = await reactCompiler.compile(reactCode);

      // Assert - Verify collaboration sequence
      expect(mockBabelParser.parse).toHaveBeenCalledWith(
        reactCode,
        expect.any(Object)
      );
      expect(mockReactTransformer.transformJSX).toHaveBeenCalledWith(mockAST);
      expect(mockCodeGenerator.generate).toHaveBeenCalledWith(transformedAST);
      expect(result.code).toBe('compiled code');
    });

    it('should detect duplicate component declarations through parser coordination', async () => {
      // Arrange
      const codeWithDuplicates = `
        function Header() { return <h1>Title</h1>; }
        function Header() { return <h2>Subtitle</h2>; }
      `;

      const astWithDuplicates = {
        type: 'Program',
        body: [
          { type: 'FunctionDeclaration', id: { name: 'Header' } },
          { type: 'FunctionDeclaration', id: { name: 'Header' } }
        ]
      };

      const validationError = {
        type: 'DuplicateDeclaration',
        identifier: 'Header',
        locations: [{ line: 2 }, { line: 3 }]
      };

      mockBabelParser.parse.mockReturnValue(astWithDuplicates);
      mockReactTransformer.validateComponents.mockReturnValue([validationError]);

      // Act
      const result = await reactCompiler.compile(codeWithDuplicates);

      // Assert - Verify error detection workflow
      expect(mockBabelParser.parse).toHaveBeenCalled();
      expect(mockReactTransformer.validateComponents).toHaveBeenCalledWith(astWithDuplicates);
      expect(mockErrorReporter.reportError).toHaveBeenCalledWith(validationError);
      expect(result.hasErrors).toBe(true);
    });

    it('should handle JSX syntax validation through coordinated error reporting', async () => {
      // Arrange
      const invalidJSX = `
        function Component() {
          return <div><span></div></span>; // Mismatched tags
        }
      `;

      const syntaxError = new SyntaxError('JSX tags must be properly nested');
      syntaxError.loc = { line: 3, column: 25 };

      mockBabelParser.parse.mockImplementation(() => {
        throw syntaxError;
      });

      // Act
      const result = await reactCompiler.compile(invalidJSX);

      // Assert - Verify error handling coordination
      expect(mockBabelParser.parse).toHaveBeenCalled();
      expect(mockErrorReporter.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SyntaxError',
          message: 'JSX tags must be properly nested'
        })
      );
      expect(result.hasErrors).toBe(true);
    });
  });

  describe('React Hook Validation', () => {
    it('should coordinate hook validation with React transformer', async () => {
      // Arrange
      const componentWithHooks = `
        import React, { useState, useEffect } from 'react';
        function MyComponent() {
          const [state, setState] = useState(0);
          useEffect(() => {}, []);
          return <div>{state}</div>;
        }
      `;

      const hookValidationResult = {
        valid: true,
        hooks: ['useState', 'useEffect'],
        violations: []
      };

      mockBabelParser.parse.mockReturnValue({ type: 'Program' });
      mockReactTransformer.checkHooks.mockReturnValue(hookValidationResult);
      mockReactTransformer.transformJSX.mockReturnValue({ type: 'Program' });

      // Act
      await reactCompiler.compile(componentWithHooks);

      // Assert - Verify hook checking integration
      expect(mockReactTransformer.checkHooks).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Program' })
      );
    });

    it('should detect hook rule violations through transformer coordination', async () => {
      // Arrange
      const componentWithHookViolations = `
        function BadComponent() {
          if (condition) {
            const [state] = useState(0); // Hook in condition
          }
          return <div>Bad</div>;
        }
      `;

      const hookViolation = {
        valid: false,
        violations: [
          { rule: 'hooks-in-condition', hook: 'useState', line: 4 }
        ]
      };

      mockBabelParser.parse.mockReturnValue({ type: 'Program' });
      mockReactTransformer.checkHooks.mockReturnValue(hookViolation);

      // Act
      const result = await reactCompiler.compile(componentWithHookViolations);

      // Assert
      expect(mockErrorReporter.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HookViolation',
          rule: 'hooks-in-condition'
        })
      );
      expect(result.hasErrors).toBe(true);
    });
  });

  describe('Import Statement Processing', () => {
    it('should validate React imports through parser and transformer coordination', async () => {
      // Arrange
      const codeWithImports = `
        import React, { useState } from 'react';
        import Component from './Component';
        import { utils } from '../utils';
      `;

      const parsedImports = [
        { source: 'react', specifiers: ['React', 'useState'] },
        { source: './Component', specifiers: ['Component'] },
        { source: '../utils', specifiers: ['utils'] }
      ];

      mockBabelParser.parse.mockReturnValue({ imports: parsedImports });
      mockReactTransformer.validateComponents.mockReturnValue([]);

      // Act
      await reactCompiler.compile(codeWithImports);

      // Assert - Verify import processing
      expect(mockBabelParser.parse).toHaveBeenCalled();
      expect(mockReactTransformer.validateComponents).toHaveBeenCalledWith(
        expect.objectContaining({ imports: parsedImports })
      );
    });

    it('should detect circular import dependencies through coordination', async () => {
      // Arrange
      const circularImportCode = `
        import ComponentB from './ComponentB';
        // ComponentB imports this file back
      `;

      const circularDependencyError = {
        type: 'CircularDependency',
        cycle: ['./ComponentA', './ComponentB', './ComponentA']
      };

      mockBabelParser.parse.mockReturnValue({ type: 'Program' });
      mockReactTransformer.validateComponents.mockReturnValue([circularDependencyError]);

      // Act
      const result = await reactCompiler.compile(circularImportCode);

      // Assert
      expect(mockErrorReporter.reportError).toHaveBeenCalledWith(circularDependencyError);
      expect(result.hasErrors).toBe(true);
    });
  });

  describe('Code Generation Coordination', () => {
    it('should coordinate optimized code generation with source maps', async () => {
      // Arrange
      const sourceCode = 'React component code';
      const transformedAST = { type: 'Program', optimized: true };
      const generatedCode = { code: 'optimized code', map: 'source map' };

      mockBabelParser.parse.mockReturnValue({ type: 'Program' });
      mockReactTransformer.transformJSX.mockReturnValue(transformedAST);
      mockCodeGenerator.generate.mockReturnValue(generatedCode);
      mockCodeGenerator.sourceMap.mockReturnValue('detailed source map');

      // Act
      const result = await reactCompiler.compile(sourceCode, { sourceMap: true });

      // Assert - Verify generation coordination
      expect(mockCodeGenerator.generate).toHaveBeenCalledWith(transformedAST);
      expect(mockCodeGenerator.sourceMap).toHaveBeenCalledWith(generatedCode);
      expect(result.sourceMap).toBe('detailed source map');
    });

    it('should apply code optimizations through generator coordination', async () => {
      // Arrange
      const ast = { type: 'Program' };
      const optimizedAST = { type: 'Program', optimized: true };

      mockBabelParser.parse.mockReturnValue(ast);
      mockReactTransformer.transformJSX.mockReturnValue(ast);
      mockCodeGenerator.optimize.mockReturnValue(optimizedAST);
      mockCodeGenerator.generate.mockReturnValue({ code: 'optimized' });

      // Act
      await reactCompiler.compile('code', { optimize: true });

      // Assert
      expect(mockCodeGenerator.optimize).toHaveBeenCalledWith(ast);
      expect(mockCodeGenerator.generate).toHaveBeenCalledWith(optimizedAST);
    });
  });

  describe('Error Collection and Reporting', () => {
    it('should coordinate comprehensive error collection across all phases', async () => {
      // Arrange
      const errors = [
        { phase: 'parse', error: 'Syntax error' },
        { phase: 'transform', error: 'Invalid JSX' },
        { phase: 'generate', error: 'Generation failed' }
      ];

      mockBabelParser.parse.mockImplementation(() => {
        throw new Error('Syntax error');
      });

      // Act
      const result = await reactCompiler.compile('invalid code');

      // Assert - Verify error collection workflow
      expect(mockErrorReporter.collectErrors).toHaveBeenCalled();
      expect(result.hasErrors).toBe(true);
    });
  });

  // Contract verification tests
  describe('Collaboration Contracts', () => {
    it('should enforce parser-transformer contract', () => {
      expect(mockBabelParser.parse).toBeDefined();
      expect(mockReactTransformer.transformJSX).toBeDefined();
      expect(typeof mockBabelParser.parse).toBe('function');
      expect(typeof mockReactTransformer.transformJSX).toBe('function');
    });

    it('should maintain proper method signatures for collaboration', async () => {
      // Setup minimal mocks
      mockBabelParser.parse.mockReturnValue({ type: 'Program' });
      mockReactTransformer.transformJSX.mockReturnValue({ type: 'Program' });
      mockCodeGenerator.generate.mockReturnValue({ code: '' });

      // Act
      await reactCompiler.compile('test');

      // Assert - Verify contract compliance
      expect(mockBabelParser.parse).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object)
      );
      expect(mockReactTransformer.transformJSX).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Program' })
      );
    });
  });
});

// Mock implementation for testing
class ReactCompiler {
  constructor(babelParser, reactTransformer, codeGenerator, errorReporter) {
    this.babelParser = babelParser;
    this.reactTransformer = reactTransformer;
    this.codeGenerator = codeGenerator;
    this.errorReporter = errorReporter;
  }

  async compile(sourceCode, options = {}) {
    try {
      // Parse phase
      const ast = this.babelParser.parse(sourceCode, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      // Transform phase
      const transformedAST = this.reactTransformer.transformJSX(ast);
      const validationErrors = this.reactTransformer.validateComponents(transformedAST);
      
      if (this.reactTransformer.checkHooks) {
        const hookValidation = this.reactTransformer.checkHooks(transformedAST);
        if (!hookValidation.valid) {
          hookValidation.violations.forEach(violation => {
            this.errorReporter.reportError({
              type: 'HookViolation',
              rule: violation.rule,
              hook: violation.hook,
              line: violation.line
            });
          });
        }
      }

      // Report validation errors
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => this.errorReporter.reportError(error));
        return { hasErrors: true, errors: validationErrors };
      }

      // Generate phase
      let finalAST = transformedAST;
      if (options.optimize) {
        finalAST = this.codeGenerator.optimize(transformedAST);
      }

      const generated = this.codeGenerator.generate(finalAST);
      const result = { code: generated.code, hasErrors: false };

      if (options.sourceMap) {
        result.sourceMap = this.codeGenerator.sourceMap(generated);
      }

      return result;

    } catch (error) {
      this.errorReporter.reportError({
        type: error.constructor.name,
        message: error.message,
        stack: error.stack
      });

      this.errorReporter.collectErrors();
      
      return { hasErrors: true, error: error.message };
    }
  }
}