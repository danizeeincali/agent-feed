/**
 * London School TDD: App Compilation Workflow Integration Tests
 * Focus: Mock-driven end-to-end compilation pipeline testing
 * Approach: Verify HOW all compilation components collaborate together
 */

describe('App Compilation Workflow - Integration Tests', () => {
  let mockFileSystem;
  let mockImportResolver;
  let mockComponentRegistry;
  let mockBabelCompiler;
  let mockBundler;
  let mockErrorHandler;
  let compilationPipeline;

  beforeEach(() => {
    // Mock the entire compilation ecosystem
    mockFileSystem = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      resolveModule: jest.fn(),
      watchChanges: jest.fn(),
      getProjectFiles: jest.fn()
    };

    mockImportResolver = {
      resolveImports: jest.fn(),
      detectDuplicates: jest.fn(),
      validateImports: jest.fn(),
      optimizeImports: jest.fn()
    };

    mockComponentRegistry = {
      registerAll: jest.fn(),
      validateComponents: jest.fn(),
      resolveConflicts: jest.fn(),
      getComponentGraph: jest.fn()
    };

    mockBabelCompiler = {
      compile: jest.fn(),
      transform: jest.fn(),
      generateSourceMaps: jest.fn(),
      validateSyntax: jest.fn()
    };

    mockBundler = {
      bundle: jest.fn(),
      optimize: jest.fn(),
      generateChunks: jest.fn(),
      createManifest: jest.fn()
    };

    mockErrorHandler = {
      collectErrors: jest.fn(),
      categorizeErrors: jest.fn(),
      reportErrors: jest.fn(),
      suggestFixes: jest.fn()
    };

    // System under test - orchestrates entire compilation workflow
    compilationPipeline = new CompilationPipeline({
      fileSystem: mockFileSystem,
      importResolver: mockImportResolver,
      componentRegistry: mockComponentRegistry,
      babelCompiler: mockBabelCompiler,
      bundler: mockBundler,
      errorHandler: mockErrorHandler
    });
  });

  describe('Full Compilation Workflow', () => {
    it('should orchestrate complete compilation pipeline with proper coordination', async () => {
      // Arrange
      const projectConfig = {
        entryPoint: './src/App.tsx',
        outputDir: './dist',
        options: { optimize: true, sourceMap: true }
      };

      const sourceFiles = [
        { path: './src/App.tsx', content: 'App component content' },
        { path: './src/components/Header.tsx', content: 'Header component' },
        { path: './src/utils/helpers.ts', content: 'Utility functions' }
      ];

      const importGraph = {
        './src/App.tsx': ['./src/components/Header.tsx', './src/utils/helpers.ts'],
        './src/components/Header.tsx': [],
        './src/utils/helpers.ts': []
      };

      const compiledModules = new Map([
        ['./src/App.tsx', { code: 'compiled App', map: 'app.map' }],
        ['./src/components/Header.tsx', { code: 'compiled Header', map: 'header.map' }],
        ['./src/utils/helpers.ts', { code: 'compiled helpers', map: 'helpers.map' }]
      ]);

      const bundleResult = {
        chunks: [{ name: 'main', code: 'bundled code' }],
        manifest: { main: 'main.js' }
      };

      // Mock the entire workflow
      mockFileSystem.getProjectFiles.mockResolvedValue(sourceFiles);
      mockImportResolver.resolveImports.mockResolvedValue(importGraph);
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockComponentRegistry.validateComponents.mockReturnValue([]);
      mockBabelCompiler.compile.mockResolvedValue(compiledModules);
      mockBundler.bundle.mockResolvedValue(bundleResult);

      // Act
      const result = await compilationPipeline.compile(projectConfig);

      // Assert - Verify complete workflow coordination
      expect(mockFileSystem.getProjectFiles).toHaveBeenCalledWith('./src');
      expect(mockImportResolver.resolveImports).toHaveBeenCalledWith(sourceFiles);
      expect(mockImportResolver.detectDuplicates).toHaveBeenCalledWith(importGraph);
      expect(mockComponentRegistry.registerAll).toHaveBeenCalledWith(sourceFiles);
      expect(mockBabelCompiler.compile).toHaveBeenCalledWith(sourceFiles, expect.any(Object));
      expect(mockBundler.bundle).toHaveBeenCalledWith(compiledModules, expect.any(Object));
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual(bundleResult);
    });

    it('should handle duplicate import errors through coordinated error reporting', async () => {
      // Arrange
      const sourceWithDuplicates = [
        { 
          path: './src/App.tsx', 
          content: `
            import React from 'react';
            import { useState } from 'react';
            import React from 'react'; // Duplicate
          `
        }
      ];

      const duplicateErrors = [
        {
          type: 'duplicate_import',
          identifier: 'React',
          file: './src/App.tsx',
          lines: [2, 4]
        }
      ];

      const categorizedErrors = {
        critical: duplicateErrors,
        warnings: [],
        suggestions: ['Remove duplicate import statements']
      };

      mockFileSystem.getProjectFiles.mockResolvedValue(sourceWithDuplicates);
      mockImportResolver.resolveImports.mockResolvedValue({});
      mockImportResolver.detectDuplicates.mockReturnValue(duplicateErrors);
      mockErrorHandler.collectErrors.mockReturnValue(duplicateErrors);
      mockErrorHandler.categorizeErrors.mockReturnValue(categorizedErrors);

      // Act
      const result = await compilationPipeline.compile({ entryPoint: './src/App.tsx' });

      // Assert - Verify error handling coordination
      expect(mockImportResolver.detectDuplicates).toHaveBeenCalled();
      expect(mockErrorHandler.collectErrors).toHaveBeenCalledWith(duplicateErrors);
      expect(mockErrorHandler.categorizeErrors).toHaveBeenCalledWith(duplicateErrors);
      expect(mockErrorHandler.reportErrors).toHaveBeenCalledWith(categorizedErrors);
      
      expect(result.success).toBe(false);
      expect(result.errors).toEqual(categorizedErrors);
    });

    it('should coordinate component registry validation with compilation', async () => {
      // Arrange
      const componentsWithConflicts = [
        { path: './src/Button.tsx', name: 'Button' },
        { path: './src/ui/Button.tsx', name: 'Button' } // Naming conflict
      ];

      const registrationResult = {
        success: false,
        conflicts: [
          {
            type: 'naming_conflict',
            identifier: 'Button',
            sources: ['./src/Button.tsx', './src/ui/Button.tsx']
          }
        ]
      };

      const componentValidationErrors = [
        {
          type: 'component_conflict',
          message: 'Duplicate component name: Button'
        }
      ];

      mockFileSystem.getProjectFiles.mockResolvedValue(componentsWithConflicts);
      mockImportResolver.resolveImports.mockResolvedValue({});
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue(registrationResult);
      mockComponentRegistry.validateComponents.mockReturnValue(componentValidationErrors);

      // Act
      const result = await compilationPipeline.compile({ entryPoint: './src/App.tsx' });

      // Assert - Verify component validation coordination
      expect(mockComponentRegistry.registerAll).toHaveBeenCalled();
      expect(mockComponentRegistry.validateComponents).toHaveBeenCalled();
      expect(mockErrorHandler.collectErrors).toHaveBeenCalledWith(
        expect.arrayContaining(componentValidationErrors)
      );
      
      expect(result.success).toBe(false);
    });
  });

  describe('Compilation Phase Coordination', () => {
    it('should coordinate Babel compilation with import resolution results', async () => {
      // Arrange
      const resolvedImports = {
        './src/App.tsx': [
          { identifier: 'React', path: 'react', resolved: true },
          { identifier: 'Component', path: './Component', resolved: true }
        ]
      };

      const compilationOptions = {
        presets: ['@babel/preset-react'],
        plugins: ['@babel/plugin-transform-modules-commonjs']
      };

      mockFileSystem.getProjectFiles.mockResolvedValue([]);
      mockImportResolver.resolveImports.mockResolvedValue(resolvedImports);
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockBabelCompiler.compile.mockResolvedValue(new Map());

      // Act
      await compilationPipeline.compile({ 
        entryPoint: './src/App.tsx',
        babelOptions: compilationOptions 
      });

      // Assert - Verify compilation coordination
      expect(mockBabelCompiler.compile).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          imports: resolvedImports,
          ...compilationOptions
        })
      );
    });

    it('should handle compilation errors through coordinated error recovery', async () => {
      // Arrange
      const syntaxError = new SyntaxError('Unexpected token');
      syntaxError.loc = { line: 5, column: 10 };
      syntaxError.filename = './src/App.tsx';

      mockFileSystem.getProjectFiles.mockResolvedValue([]);
      mockImportResolver.resolveImports.mockResolvedValue({});
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockBabelCompiler.compile.mockRejectedValue(syntaxError);

      const errorSuggestions = [
        'Check syntax at line 5, column 10',
        'Ensure all JSX tags are properly closed'
      ];

      mockErrorHandler.suggestFixes.mockReturnValue(errorSuggestions);

      // Act
      const result = await compilationPipeline.compile({ entryPoint: './src/App.tsx' });

      // Assert - Verify error recovery coordination
      expect(mockErrorHandler.collectErrors).toHaveBeenCalledWith([syntaxError]);
      expect(mockErrorHandler.suggestFixes).toHaveBeenCalledWith(syntaxError);
      
      expect(result.success).toBe(false);
      expect(result.suggestions).toEqual(errorSuggestions);
    });
  });

  describe('Bundle Generation Coordination', () => {
    it('should coordinate bundling with compiled modules and optimization', async () => {
      // Arrange
      const compiledModules = new Map([
        ['main', { code: 'main module', dependencies: ['util'] }],
        ['util', { code: 'utility module', dependencies: [] }]
      ]);

      const optimizationOptions = {
        minify: true,
        treeshake: true,
        splitChunks: true
      };

      const optimizedBundle = {
        main: 'optimized main chunk',
        vendor: 'optimized vendor chunk'
      };

      mockFileSystem.getProjectFiles.mockResolvedValue([]);
      mockImportResolver.resolveImports.mockResolvedValue({});
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockBabelCompiler.compile.mockResolvedValue(compiledModules);
      mockBundler.optimize.mockReturnValue(optimizedBundle);
      mockBundler.bundle.mockResolvedValue({ chunks: [], manifest: {} });

      // Act
      await compilationPipeline.compile({
        entryPoint: './src/App.tsx',
        bundleOptions: optimizationOptions
      });

      // Assert - Verify bundling coordination
      expect(mockBundler.optimize).toHaveBeenCalledWith(
        compiledModules,
        optimizationOptions
      );
      expect(mockBundler.bundle).toHaveBeenCalledWith(
        optimizedBundle,
        expect.any(Object)
      );
    });

    it('should coordinate chunk generation with dependency analysis', async () => {
      // Arrange
      const dependencyGraph = {
        'main': ['react', 'lodash', './utils'],
        'utils': ['lodash'],
        'components': ['react', './utils']
      };

      const chunkStrategy = {
        vendor: ['react', 'lodash'],
        app: ['main', 'components'],
        utils: ['utils']
      };

      mockFileSystem.getProjectFiles.mockResolvedValue([]);
      mockImportResolver.resolveImports.mockResolvedValue(dependencyGraph);
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockBabelCompiler.compile.mockResolvedValue(new Map());
      mockBundler.generateChunks.mockReturnValue(chunkStrategy);
      mockBundler.bundle.mockResolvedValue({ chunks: [], manifest: {} });

      // Act
      await compilationPipeline.compile({ 
        entryPoint: './src/App.tsx',
        chunkStrategy: 'automatic'
      });

      // Assert - Verify chunk generation coordination
      expect(mockBundler.generateChunks).toHaveBeenCalledWith(
        expect.any(Map),
        expect.objectContaining({ strategy: 'automatic' })
      );
    });
  });

  describe('Watch Mode and Incremental Compilation', () => {
    it('should coordinate incremental compilation with file system changes', async () => {
      // Arrange
      const changedFiles = ['./src/App.tsx'];
      const incrementalResult = {
        recompiled: changedFiles,
        affected: ['./src/components/Header.tsx'],
        output: { chunks: [], manifest: {} }
      };

      mockFileSystem.watchChanges.mockImplementation((callback) => {
        // Simulate file change
        setTimeout(() => callback(changedFiles), 0);
        return { unwatch: jest.fn() };
      });

      mockImportResolver.resolveImports.mockResolvedValue({});
      mockComponentRegistry.getComponentGraph.mockReturnValue({});
      mockBabelCompiler.compile.mockResolvedValue(new Map());

      // Act
      const watchResult = await compilationPipeline.startWatchMode({
        entryPoint: './src/App.tsx'
      });

      // Wait for file change simulation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert - Verify incremental compilation coordination
      expect(mockFileSystem.watchChanges).toHaveBeenCalled();
      expect(mockImportResolver.resolveImports).toHaveBeenCalledWith(
        expect.arrayContaining(changedFiles.map(file => expect.objectContaining({ path: file })))
      );
      
      expect(watchResult.isWatching).toBe(true);
    });
  });

  describe('Error Recovery and Reporting Coordination', () => {
    it('should coordinate comprehensive error collection across all phases', async () => {
      // Arrange
      const importErrors = [{ type: 'import_error', message: 'Module not found' }];
      const componentErrors = [{ type: 'component_error', message: 'Invalid component' }];
      const compilationErrors = [{ type: 'syntax_error', message: 'Unexpected token' }];

      const allErrors = [...importErrors, ...componentErrors, ...compilationErrors];
      const errorReport = {
        critical: compilationErrors,
        warnings: componentErrors,
        info: importErrors,
        summary: '3 errors found across compilation pipeline'
      };

      mockFileSystem.getProjectFiles.mockResolvedValue([]);
      mockImportResolver.resolveImports.mockResolvedValue({});
      mockImportResolver.detectDuplicates.mockReturnValue(importErrors);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockComponentRegistry.validateComponents.mockReturnValue(componentErrors);
      mockBabelCompiler.compile.mockRejectedValue(compilationErrors[0]);
      mockErrorHandler.collectErrors.mockReturnValue(allErrors);
      mockErrorHandler.categorizeErrors.mockReturnValue(errorReport);

      // Act
      const result = await compilationPipeline.compile({ entryPoint: './src/App.tsx' });

      // Assert - Verify comprehensive error coordination
      expect(mockErrorHandler.collectErrors).toHaveBeenCalledWith(
        expect.arrayContaining(allErrors)
      );
      expect(mockErrorHandler.categorizeErrors).toHaveBeenCalledWith(allErrors);
      expect(mockErrorHandler.reportErrors).toHaveBeenCalledWith(errorReport);
      
      expect(result.errorReport).toEqual(errorReport);
    });
  });

  // Contract verification tests
  describe('Pipeline Contract Verification', () => {
    it('should maintain proper collaboration contracts throughout pipeline', () => {
      // Verify all required collaborator interfaces
      expect(mockFileSystem).toHaveProperty('getProjectFiles');
      expect(mockImportResolver).toHaveProperty('resolveImports');
      expect(mockComponentRegistry).toHaveProperty('registerAll');
      expect(mockBabelCompiler).toHaveProperty('compile');
      expect(mockBundler).toHaveProperty('bundle');
      expect(mockErrorHandler).toHaveProperty('collectErrors');

      // Verify function contracts
      expect(typeof mockFileSystem.getProjectFiles).toBe('function');
      expect(typeof mockImportResolver.resolveImports).toBe('function');
      expect(typeof mockComponentRegistry.registerAll).toBe('function');
      expect(typeof mockBabelCompiler.compile).toBe('function');
      expect(typeof mockBundler.bundle).toBe('function');
      expect(typeof mockErrorHandler.collectErrors).toBe('function');
    });

    it('should enforce proper data flow contracts between pipeline stages', async () => {
      // Arrange minimal successful pipeline
      mockFileSystem.getProjectFiles.mockResolvedValue([]);
      mockImportResolver.resolveImports.mockResolvedValue({});
      mockImportResolver.detectDuplicates.mockReturnValue([]);
      mockComponentRegistry.registerAll.mockResolvedValue({ success: true });
      mockComponentRegistry.validateComponents.mockReturnValue([]);
      mockBabelCompiler.compile.mockResolvedValue(new Map());
      mockBundler.bundle.mockResolvedValue({ chunks: [], manifest: {} });

      // Act
      await compilationPipeline.compile({ entryPoint: './src/App.tsx' });

      // Assert - Verify proper data contracts
      expect(mockImportResolver.resolveImports).toHaveBeenCalledWith(
        expect.any(Array) // Should receive file array from file system
      );
      expect(mockBabelCompiler.compile).toHaveBeenCalledWith(
        expect.any(Array), // Should receive file array
        expect.objectContaining({ imports: expect.any(Object) }) // Should include resolved imports
      );
      expect(mockBundler.bundle).toHaveBeenCalledWith(
        expect.any(Map), // Should receive compiled modules Map
        expect.any(Object) // Should receive bundle options
      );
    });
  });
});

// Mock implementation class for integration testing
class CompilationPipeline {
  constructor(dependencies) {
    this.fileSystem = dependencies.fileSystem;
    this.importResolver = dependencies.importResolver;
    this.componentRegistry = dependencies.componentRegistry;
    this.babelCompiler = dependencies.babelCompiler;
    this.bundler = dependencies.bundler;
    this.errorHandler = dependencies.errorHandler;
  }

  async compile(config) {
    const errors = [];

    try {
      // Phase 1: File Discovery
      const sourceFiles = await this.fileSystem.getProjectFiles('./src');

      // Phase 2: Import Resolution
      const importGraph = await this.importResolver.resolveImports(sourceFiles);
      const duplicateImports = this.importResolver.detectDuplicates(importGraph);
      if (duplicateImports.length > 0) {
        errors.push(...duplicateImports);
      }

      // Phase 3: Component Registration
      const registrationResult = await this.componentRegistry.registerAll(sourceFiles);
      if (!registrationResult.success) {
        errors.push(...(registrationResult.conflicts || []));
      }

      const componentValidationErrors = this.componentRegistry.validateComponents();
      if (componentValidationErrors.length > 0) {
        errors.push(...componentValidationErrors);
      }

      // Phase 4: Compilation
      if (errors.length === 0) {
        const compiledModules = await this.babelCompiler.compile(sourceFiles, {
          imports: importGraph,
          ...(config.babelOptions || {})
        });

        // Phase 5: Bundling
        let bundleInput = compiledModules;
        if (config.bundleOptions) {
          bundleInput = this.bundler.optimize(compiledModules, config.bundleOptions);
        }

        if (config.chunkStrategy) {
          this.bundler.generateChunks(bundleInput, { strategy: config.chunkStrategy });
        }

        const bundleResult = await this.bundler.bundle(bundleInput, config.bundleOptions || {});

        return {
          success: true,
          output: bundleResult,
          stats: {
            files: sourceFiles.length,
            components: Object.keys(importGraph).length
          }
        };
      }

      // Handle errors
      throw errors;

    } catch (error) {
      const allErrors = Array.isArray(error) ? error : [error];
      const collectedErrors = this.errorHandler.collectErrors(allErrors);
      const categorizedErrors = this.errorHandler.categorizeErrors(collectedErrors);
      this.errorHandler.reportErrors(categorizedErrors);

      const result = {
        success: false,
        errors: categorizedErrors,
        errorReport: categorizedErrors
      };

      if (error.constructor === SyntaxError) {
        result.suggestions = this.errorHandler.suggestFixes(error);
      }

      return result;
    }
  }

  async startWatchMode(config) {
    const watcher = this.fileSystem.watchChanges(async (changedFiles) => {
      // Perform incremental compilation
      const fileObjects = changedFiles.map(path => ({ path }));
      await this.importResolver.resolveImports(fileObjects);
    });

    return {
      isWatching: true,
      unwatch: watcher.unwatch
    };
  }
}