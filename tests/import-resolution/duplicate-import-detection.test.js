/**
 * London School TDD: Import Resolution Duplicate Detection Tests
 * Focus: Mock-driven testing of import statement validation
 * Approach: Verify HOW import parser collaborates with duplicate detector
 */

describe('Import Resolution - Duplicate Detection', () => {
  let mockImportParser;
  let mockDuplicateDetector;
  let mockFileSystem;
  let mockASTAnalyzer;
  let importResolver;

  beforeEach(() => {
    // Mock collaborators following London School approach
    mockImportParser = {
      parseImportStatements: jest.fn(),
      extractImportIdentifiers: jest.fn(),
      normalizeImportPaths: jest.fn()
    };

    mockDuplicateDetector = {
      detectDuplicateIdentifiers: jest.fn(),
      reportConflicts: jest.fn(),
      suggestResolutions: jest.fn()
    };

    mockFileSystem = {
      readFile: jest.fn(),
      resolveModulePath: jest.fn(),
      getFileStats: jest.fn()
    };

    mockASTAnalyzer = {
      parseAST: jest.fn(),
      traverseImports: jest.fn(),
      extractMetadata: jest.fn()
    };

    // System under test - receives all dependencies
    importResolver = new ImportResolver(
      mockImportParser,
      mockDuplicateDetector,
      mockFileSystem,
      mockASTAnalyzer
    );
  });

  describe('Import Statement Processing', () => {
    it('should coordinate with parser to extract import identifiers', async () => {
      // Arrange
      const sourceCode = `
        import React from 'react';
        import { useState } from 'react';
        import Component from './Component';
      `;
      
      const expectedImports = [
        { identifier: 'React', path: 'react', type: 'default' },
        { identifier: 'useState', path: 'react', type: 'named' },
        { identifier: 'Component', path: './Component', type: 'default' }
      ];

      mockImportParser.parseImportStatements.mockResolvedValue(expectedImports);
      mockDuplicateDetector.detectDuplicateIdentifiers.mockReturnValue([]);

      // Act
      await importResolver.processImports(sourceCode);

      // Assert - Verify interactions (London School focus)
      expect(mockImportParser.parseImportStatements).toHaveBeenCalledWith(sourceCode);
      expect(mockDuplicateDetector.detectDuplicateIdentifiers).toHaveBeenCalledWith(expectedImports);
    });

    it('should detect duplicate named imports from same module', async () => {
      // Arrange
      const conflictingImports = [
        { identifier: 'useState', path: 'react', type: 'named' },
        { identifier: 'useState', path: 'react', type: 'named' }
      ];

      const duplicateReport = {
        conflicts: [{ identifier: 'useState', sources: ['react', 'react'] }],
        suggestions: ['Merge import statements']
      };

      mockImportParser.parseImportStatements.mockResolvedValue(conflictingImports);
      mockDuplicateDetector.detectDuplicateIdentifiers.mockReturnValue([duplicateReport]);

      // Act
      const result = await importResolver.processImports('source code');

      // Assert - Verify collaboration sequence
      expect(mockImportParser.parseImportStatements).toHaveBeenCalledFirst();
      expect(mockDuplicateDetector.detectDuplicateIdentifiers).toHaveBeenCalledAfter(
        mockImportParser.parseImportStatements
      );
      expect(mockDuplicateDetector.reportConflicts).toHaveBeenCalledWith(duplicateReport);
      expect(result.hasConflicts).toBe(true);
    });

    it('should handle default import naming conflicts', async () => {
      // Arrange
      const conflictingDefaults = [
        { identifier: 'Component', path: './ComponentA', type: 'default' },
        { identifier: 'Component', path: './ComponentB', type: 'default' }
      ];

      mockImportParser.parseImportStatements.mockResolvedValue(conflictingDefaults);
      mockDuplicateDetector.detectDuplicateIdentifiers.mockReturnValue([
        { identifier: 'Component', type: 'naming_conflict' }
      ]);
      mockDuplicateDetector.suggestResolutions.mockReturnValue([
        'Rename one import: import ComponentA from "./ComponentA"',
        'Use namespace import: import * as CompB from "./ComponentB"'
      ]);

      // Act
      await importResolver.processImports('source with conflicts');

      // Assert - Verify resolution coordination
      expect(mockDuplicateDetector.suggestResolutions).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'Component' })
      );
    });
  });

  describe('File System Integration', () => {
    it('should coordinate file reading with import parsing', async () => {
      // Arrange
      const filePath = '/src/App.tsx';
      const fileContent = 'import React from "react";';
      
      mockFileSystem.readFile.mockResolvedValue(fileContent);
      mockImportParser.parseImportStatements.mockResolvedValue([]);

      // Act
      await importResolver.analyzeFile(filePath);

      // Assert - Verify proper coordination
      expect(mockFileSystem.readFile).toHaveBeenCalledWith(filePath);
      expect(mockImportParser.parseImportStatements).toHaveBeenCalledWith(fileContent);
    });

    it('should resolve relative import paths through file system', async () => {
      // Arrange
      const relativePath = './components/Header';
      const resolvedPath = '/src/components/Header.tsx';
      
      mockFileSystem.resolveModulePath.mockResolvedValue(resolvedPath);
      mockImportParser.normalizeImportPaths.mockReturnValue([resolvedPath]);

      // Act
      await importResolver.resolveImportPath(relativePath);

      // Assert
      expect(mockFileSystem.resolveModulePath).toHaveBeenCalledWith(relativePath);
      expect(mockImportParser.normalizeImportPaths).toHaveBeenCalledWith([resolvedPath]);
    });
  });

  describe('AST Analysis Coordination', () => {
    it('should coordinate AST parsing with import extraction', async () => {
      // Arrange
      const sourceCode = 'React component code';
      const mockAST = { type: 'Program', body: [] };
      const importNodes = [{ type: 'ImportDeclaration' }];

      mockASTAnalyzer.parseAST.mockReturnValue(mockAST);
      mockASTAnalyzer.traverseImports.mockReturnValue(importNodes);
      mockImportParser.extractImportIdentifiers.mockReturnValue([]);

      // Act
      await importResolver.analyzeImportStructure(sourceCode);

      // Assert - Verify orchestration sequence
      expect(mockASTAnalyzer.parseAST).toHaveBeenCalledWith(sourceCode);
      expect(mockASTAnalyzer.traverseImports).toHaveBeenCalledWith(mockAST);
      expect(mockImportParser.extractImportIdentifiers).toHaveBeenCalledWith(importNodes);
    });

    it('should handle malformed import statements through error coordination', async () => {
      // Arrange
      mockASTAnalyzer.parseAST.mockImplementation(() => {
        throw new SyntaxError('Unexpected token');
      });

      // Act & Assert
      await expect(importResolver.analyzeImportStructure('malformed code'))
        .rejects.toThrow('Unexpected token');

      // Verify error handling coordination
      expect(mockASTAnalyzer.parseAST).toHaveBeenCalled();
      // Other collaborators should not be called after parsing failure
      expect(mockImportParser.extractImportIdentifiers).not.toHaveBeenCalled();
    });
  });

  describe('Contract Verification', () => {
    it('should satisfy import resolver contract', () => {
      // Verify that our mocks implement the expected contracts
      expect(mockImportParser).toHaveProperty('parseImportStatements');
      expect(mockImportParser).toHaveProperty('extractImportIdentifiers');
      expect(mockDuplicateDetector).toHaveProperty('detectDuplicateIdentifiers');
      expect(mockFileSystem).toHaveProperty('readFile');
      expect(mockASTAnalyzer).toHaveProperty('parseAST');
    });

    it('should enforce collaboration order in import processing workflow', async () => {
      // Arrange
      const sourceCode = 'test code';
      mockImportParser.parseImportStatements.mockResolvedValue([]);
      mockDuplicateDetector.detectDuplicateIdentifiers.mockReturnValue([]);

      // Act
      await importResolver.processImports(sourceCode);

      // Assert - Verify call order (London School emphasis on interactions)
      const calls = jest.getAllMockCalls();
      const parseCall = calls.find(call => 
        call[0] === 'mockImportParser.parseImportStatements'
      );
      const detectCall = calls.find(call => 
        call[0] === 'mockDuplicateDetector.detectDuplicateIdentifiers'
      );

      expect(parseCall).toBeDefined();
      expect(detectCall).toBeDefined();
      // Parse should happen before duplicate detection
      expect(calls.indexOf(parseCall)).toBeLessThan(calls.indexOf(detectCall));
    });
  });
});

// Mock implementation helper for tests
class ImportResolver {
  constructor(importParser, duplicateDetector, fileSystem, astAnalyzer) {
    this.importParser = importParser;
    this.duplicateDetector = duplicateDetector;
    this.fileSystem = fileSystem;
    this.astAnalyzer = astAnalyzer;
  }

  async processImports(sourceCode) {
    const imports = await this.importParser.parseImportStatements(sourceCode);
    const conflicts = this.duplicateDetector.detectDuplicateIdentifiers(imports);
    
    if (conflicts.length > 0) {
      conflicts.forEach(conflict => 
        this.duplicateDetector.reportConflicts(conflict)
      );
      return { hasConflicts: true, conflicts };
    }

    return { hasConflicts: false, imports };
  }

  async analyzeFile(filePath) {
    const content = await this.fileSystem.readFile(filePath);
    return this.importParser.parseImportStatements(content);
  }

  async resolveImportPath(relativePath) {
    const resolved = await this.fileSystem.resolveModulePath(relativePath);
    return this.importParser.normalizeImportPaths([resolved]);
  }

  async analyzeImportStructure(sourceCode) {
    const ast = this.astAnalyzer.parseAST(sourceCode);
    const importNodes = this.astAnalyzer.traverseImports(ast);
    return this.importParser.extractImportIdentifiers(importNodes);
  }
}