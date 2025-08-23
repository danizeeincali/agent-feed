/**
 * London School TDD: Mock Utilities for React Compiler and Import System
 * Focus: Reusable mock factories and contract definitions
 * Approach: Provide consistent mock implementations for test collaboration
 */

// Mock Factory for Import Resolution System
export function createImportResolverMock() {
  return {
    parseImportStatements: jest.fn(),
    extractImportIdentifiers: jest.fn(),
    normalizeImportPaths: jest.fn(),
    resolveImports: jest.fn(),
    detectDuplicates: jest.fn(),
    validateImports: jest.fn(),
    optimizeImports: jest.fn()
  };
}

// Mock Factory for React Babel Compiler
export function createBabelCompilerMock() {
  return {
    parse: jest.fn(),
    traverse: jest.fn(),
    transformJSX: jest.fn(),
    validateComponents: jest.fn(),
    validateSyntax: jest.fn(),
    checkHooks: jest.fn(),
    compile: jest.fn(),
    transform: jest.fn(),
    generateSourceMaps: jest.fn(),
    getParseOptions: jest.fn()
  };
}

// Mock Factory for Component Registry
export function createComponentRegistryMock() {
  return {
    register: jest.fn(),
    registerAll: jest.fn(),
    lookup: jest.fn(),
    unregister: jest.fn(),
    getAllRegistered: jest.fn(),
    isRegistered: jest.fn(),
    validateComponents: jest.fn(),
    resolveConflicts: jest.fn(),
    getComponentGraph: jest.fn()
  };
}

// Mock Factory for File System Operations
export function createFileSystemMock() {
  return {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    resolveModule: jest.fn(),
    resolveModulePath: jest.fn(),
    watchChanges: jest.fn(),
    getProjectFiles: jest.fn(),
    getFileStats: jest.fn()
  };
}

// Mock Factory for Error Handling System
export function createErrorHandlerMock() {
  return {
    reportError: jest.fn(),
    collectErrors: jest.fn(),
    categorizeErrors: jest.fn(),
    formatError: jest.fn(),
    suggestFixes: jest.fn(),
    reportErrors: jest.fn()
  };
}

// Mock Factory for Code Generator/Bundler
export function createBundlerMock() {
  return {
    bundle: jest.fn(),
    optimize: jest.fn(),
    generateChunks: jest.fn(),
    createManifest: jest.fn(),
    generate: jest.fn(),
    sourceMap: jest.fn()
  };
}

// Mock Factory for Naming and Conflict Resolution
export function createNamingResolverMock() {
  return {
    resolveIdentifier: jest.fn(),
    generateAlternativeName: jest.fn(),
    validateName: jest.fn(),
    normalizeIdentifier: jest.fn()
  };
}

// Mock Factory for Duplicate Detection
export function createDuplicateDetectorMock() {
  return {
    detectDuplicateIdentifiers: jest.fn(),
    detectNamingConflicts: jest.fn(),
    reportConflicts: jest.fn(),
    suggestResolutions: jest.fn(),
    analyzeConflictSeverity: jest.fn(),
    reportConflict: jest.fn()
  };
}

// Mock Factory for AST Analysis
export function createASTAnalyzerMock() {
  return {
    parseAST: jest.fn(),
    traverseImports: jest.fn(),
    extractMetadata: jest.fn()
  };
}

// Mock Factory for Scope Analysis
export function createScopeAnalyzerMock() {
  return {
    analyzeScope: jest.fn(),
    determineVisibility: jest.fn(),
    checkShadowing: jest.fn(),
    validateScope: jest.fn()
  };
}

// Contract Definitions for Mock Validation
export const IMPORT_RESOLVER_CONTRACT = {
  parseImportStatements: {
    input: 'string',
    output: 'Array<ImportStatement>'
  },
  extractImportIdentifiers: {
    input: 'Array<ASTNode>',
    output: 'Array<ImportIdentifier>'
  },
  resolveImports: {
    input: 'Array<SourceFile>',
    output: 'ImportGraph'
  },
  detectDuplicates: {
    input: 'ImportGraph',
    output: 'Array<ConflictReport>'
  }
};

export const BABEL_COMPILER_CONTRACT = {
  parse: {
    input: ['string', 'ParserOptions'],
    output: 'AST'
  },
  transformJSX: {
    input: 'AST',
    output: 'TransformedAST'
  },
  compile: {
    input: ['Array<SourceFile>', 'CompilerOptions'],
    output: 'Map<string, CompiledModule>'
  },
  validateComponents: {
    input: 'AST',
    output: 'Array<ValidationError>'
  }
};

export const COMPONENT_REGISTRY_CONTRACT = {
  register: {
    input: 'ComponentDefinition',
    output: 'RegistrationResult'
  },
  registerAll: {
    input: 'Array<ComponentDefinition>',
    output: 'BatchRegistrationResult'
  },
  lookup: {
    input: 'string',
    output: 'Array<ComponentDefinition> | ComponentDefinition | null'
  },
  validateComponents: {
    input: 'void | AST',
    output: 'Array<ValidationError>'
  }
};

// Helper function to verify mock contracts
export function verifyMockContract(mock, contract, mockName) {
  const missingMethods = [];
  const invalidMethods = [];

  Object.keys(contract).forEach(methodName => {
    if (!mock.hasOwnProperty(methodName)) {
      missingMethods.push(methodName);
    } else if (typeof mock[methodName] !== 'function') {
      invalidMethods.push(methodName);
    }
  });

  if (missingMethods.length > 0 || invalidMethods.length > 0) {
    throw new Error(`Mock contract violation for ${mockName}:
      Missing methods: ${missingMethods.join(', ')}
      Invalid methods: ${invalidMethods.join(', ')}`);
  }

  return true;
}

// Helper to create coordinated mock behavior
export function createCoordinatedMockBehavior() {
  return {
    // Simulate successful import resolution workflow
    setupSuccessfulImportWorkflow: (mocks) => {
      mocks.importResolver.parseImportStatements.mockResolvedValue([]);
      mocks.importResolver.detectDuplicates.mockReturnValue([]);
      mocks.componentRegistry.registerAll.mockResolvedValue({ success: true });
      mocks.babelCompiler.compile.mockResolvedValue(new Map());
      return mocks;
    },

    // Simulate duplicate import detection workflow
    setupDuplicateImportWorkflow: (mocks, duplicates) => {
      mocks.importResolver.parseImportStatements.mockResolvedValue(duplicates);
      mocks.importResolver.detectDuplicates.mockReturnValue([
        { type: 'duplicate_import', identifier: 'React' }
      ]);
      mocks.errorHandler.collectErrors.mockReturnValue([]);
      return mocks;
    },

    // Simulate component conflict resolution workflow
    setupComponentConflictWorkflow: (mocks, conflicts) => {
      mocks.componentRegistry.registerAll.mockResolvedValue({
        success: false,
        conflicts
      });
      mocks.namingResolver.generateAlternativeName.mockReturnValue('ResolvedName');
      mocks.conflictDetector.suggestResolutions.mockReturnValue(['Rename component']);
      return mocks;
    },

    // Simulate compilation error workflow
    setupCompilationErrorWorkflow: (mocks, error) => {
      mocks.babelCompiler.compile.mockRejectedValue(error);
      mocks.errorHandler.collectErrors.mockReturnValue([error]);
      mocks.errorHandler.categorizeErrors.mockReturnValue({
        critical: [error],
        warnings: [],
        info: []
      });
      return mocks;
    }
  };
}

// Mock data generators for testing
export const MockDataGenerators = {
  // Generate mock import statements
  createImportStatements: (count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      identifier: `Component${i}`,
      path: `./components/Component${i}.tsx`,
      type: i % 2 === 0 ? 'default' : 'named',
      line: i + 1
    }));
  },

  // Generate mock component definitions
  createComponentDefinitions: (count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      name: `Component${i}`,
      path: `./src/components/Component${i}.tsx`,
      type: i % 2 === 0 ? 'functional' : 'class',
      exports: ['default'],
      dependencies: [`react${i > 0 ? `, ./Component${i-1}` : ''}`]
    }));
  },

  // Generate mock AST nodes
  createASTNodes: (type = 'Program', count = 1) => {
    return Array.from({ length: count }, (_, i) => ({
      type,
      body: [],
      sourceType: 'module',
      start: i * 100,
      end: (i + 1) * 100
    }));
  },

  // Generate mock errors
  createErrorSet: () => ({
    syntaxErrors: [
      { type: 'SyntaxError', message: 'Unexpected token', line: 5 }
    ],
    importErrors: [
      { type: 'ImportError', message: 'Module not found', path: './missing' }
    ],
    componentErrors: [
      { type: 'ComponentError', message: 'Duplicate component name' }
    ]
  })
};

// Jest custom matchers for London School testing
export const customMatchers = {
  // Verify that mock was called before another mock
  toHaveBeenCalledBefore: (received, other) => {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;
    
    const receivedFirst = Math.min(...receivedCalls);
    const otherFirst = Math.min(...otherCalls);
    
    const pass = receivedFirst < otherFirst;
    
    return {
      message: () => 
        `Expected ${received.getMockName()} to be called before ${other.getMockName()}`,
      pass
    };
  },

  // Verify mock interaction pattern
  toFollowInteractionPattern: (received, pattern) => {
    const calls = jest.getAllMockCalls();
    const actualPattern = calls
      .filter(call => pattern.includes(call[0]))
      .map(call => call[0]);
    
    const pass = JSON.stringify(actualPattern) === JSON.stringify(pattern);
    
    return {
      message: () => 
        `Expected interaction pattern ${JSON.stringify(pattern)}, got ${JSON.stringify(actualPattern)}`,
      pass
    };
  }
};

// Setup function for London School test environment
export function setupLondonSchoolTestEnvironment() {
  // Extend Jest with custom matchers
  expect.extend(customMatchers);

  // Mock console methods to avoid noise during testing
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
  };

  return {
    restoreConsole: () => {
      global.console = originalConsole;
    }
  };
}

// Default export with all utilities
export default {
  createImportResolverMock,
  createBabelCompilerMock,
  createComponentRegistryMock,
  createFileSystemMock,
  createErrorHandlerMock,
  createBundlerMock,
  createNamingResolverMock,
  createDuplicateDetectorMock,
  createASTAnalyzerMock,
  createScopeAnalyzerMock,
  verifyMockContract,
  createCoordinatedMockBehavior,
  MockDataGenerators,
  setupLondonSchoolTestEnvironment,
  IMPORT_RESOLVER_CONTRACT,
  BABEL_COMPILER_CONTRACT,
  COMPONENT_REGISTRY_CONTRACT
};