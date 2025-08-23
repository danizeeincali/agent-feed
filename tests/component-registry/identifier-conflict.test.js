/**
 * London School TDD: Component Registry Identifier Conflict Tests
 * Focus: Mock-driven testing of component registration and conflict detection
 * Approach: Verify HOW component registry collaborates with naming resolver
 */

describe('Component Registry - Identifier Conflict Detection', () => {
  let mockComponentRegistry;
  let mockNamingResolver;
  let mockConflictDetector;
  let mockScopeAnalyzer;
  let componentManager;

  beforeEach(() => {
    // Mock all collaborators following London School principles
    mockComponentRegistry = {
      register: jest.fn(),
      lookup: jest.fn(),
      unregister: jest.fn(),
      getAllRegistered: jest.fn(),
      isRegistered: jest.fn()
    };

    mockNamingResolver = {
      resolveIdentifier: jest.fn(),
      generateAlternativeName: jest.fn(),
      validateName: jest.fn(),
      normalizeIdentifier: jest.fn()
    };

    mockConflictDetector = {
      detectNamingConflicts: jest.fn(),
      analyzeConflictSeverity: jest.fn(),
      suggestResolutions: jest.fn(),
      reportConflict: jest.fn()
    };

    mockScopeAnalyzer = {
      analyzeScope: jest.fn(),
      determineVisibility: jest.fn(),
      checkShadowing: jest.fn(),
      validateScope: jest.fn()
    };

    // System under test
    componentManager = new ComponentManager(
      mockComponentRegistry,
      mockNamingResolver,
      mockConflictDetector,
      mockScopeAnalyzer
    );
  });

  describe('Component Registration Workflow', () => {
    it('should coordinate component registration with conflict detection', async () => {
      // Arrange
      const componentDefinition = {
        name: 'Button',
        path: './components/Button.tsx',
        type: 'functional',
        exports: ['default']
      };

      mockComponentRegistry.isRegistered.mockReturnValue(false);
      mockNamingResolver.validateName.mockReturnValue({ valid: true });
      mockConflictDetector.detectNamingConflicts.mockReturnValue([]);
      mockComponentRegistry.register.mockResolvedValue({ success: true });

      // Act
      const result = await componentManager.registerComponent(componentDefinition);

      // Assert - Verify coordination sequence
      expect(mockComponentRegistry.isRegistered).toHaveBeenCalledWith('Button');
      expect(mockNamingResolver.validateName).toHaveBeenCalledWith('Button');
      expect(mockConflictDetector.detectNamingConflicts).toHaveBeenCalledWith(
        componentDefinition,
        expect.any(Array)
      );
      expect(mockComponentRegistry.register).toHaveBeenCalledWith(componentDefinition);
      expect(result.success).toBe(true);
    });

    it('should detect and report naming conflicts during registration', async () => {
      // Arrange
      const newComponent = {
        name: 'Header',
        path: './components/Header.tsx',
        type: 'functional'
      };

      const existingComponent = {
        name: 'Header',
        path: './layout/Header.tsx',
        type: 'class'
      };

      const conflict = {
        type: 'naming_conflict',
        identifier: 'Header',
        existing: existingComponent,
        new: newComponent,
        severity: 'high'
      };

      mockComponentRegistry.isRegistered.mockReturnValue(true);
      mockComponentRegistry.lookup.mockReturnValue(existingComponent);
      mockConflictDetector.detectNamingConflicts.mockReturnValue([conflict]);
      mockConflictDetector.analyzeConflictSeverity.mockReturnValue('high');

      // Act
      const result = await componentManager.registerComponent(newComponent);

      // Assert - Verify conflict detection workflow
      expect(mockConflictDetector.detectNamingConflicts).toHaveBeenCalled();
      expect(mockConflictDetector.analyzeConflictSeverity).toHaveBeenCalledWith(conflict);
      expect(mockConflictDetector.reportConflict).toHaveBeenCalledWith(conflict);
      expect(result.success).toBe(false);
      expect(result.conflicts).toContain(conflict);
    });

    it('should resolve conflicts through naming resolver coordination', async () => {
      // Arrange
      const conflictingComponent = {
        name: 'Button',
        path: './forms/Button.tsx'
      };

      const alternativeName = 'FormButton';
      const resolution = {
        originalName: 'Button',
        resolvedName: 'FormButton',
        strategy: 'prefix_with_context'
      };

      mockComponentRegistry.isRegistered.mockReturnValue(true);
      mockConflictDetector.detectNamingConflicts.mockReturnValue([
        { type: 'naming_conflict', identifier: 'Button' }
      ]);
      mockNamingResolver.generateAlternativeName.mockReturnValue(alternativeName);
      mockNamingResolver.resolveIdentifier.mockReturnValue(resolution);

      // Act
      const result = await componentManager.registerComponent(conflictingComponent);

      // Assert - Verify resolution coordination
      expect(mockNamingResolver.generateAlternativeName).toHaveBeenCalledWith(
        'Button',
        expect.objectContaining({ context: 'forms' })
      );
      expect(mockNamingResolver.resolveIdentifier).toHaveBeenCalledWith(
        conflictingComponent,
        alternativeName
      );
      expect(result.resolvedName).toBe('FormButton');
    });
  });

  describe('Scope Analysis Integration', () => {
    it('should coordinate scope analysis with component visibility', async () => {
      // Arrange
      const component = {
        name: 'Modal',
        path: './ui/Modal.tsx',
        scope: 'ui'
      };

      const scopeAnalysis = {
        scope: 'ui',
        visibility: 'public',
        conflicts: [],
        shadowing: false
      };

      mockScopeAnalyzer.analyzeScope.mockReturnValue(scopeAnalysis);
      mockScopeAnalyzer.determineVisibility.mockReturnValue('public');
      mockComponentRegistry.isRegistered.mockReturnValue(false);

      // Act
      await componentManager.registerComponent(component);

      // Assert - Verify scope analysis coordination
      expect(mockScopeAnalyzer.analyzeScope).toHaveBeenCalledWith(component);
      expect(mockScopeAnalyzer.determineVisibility).toHaveBeenCalledWith(
        component,
        scopeAnalysis
      );
    });

    it('should detect shadowing conflicts through scope analyzer', async () => {
      // Arrange
      const shadowingComponent = {
        name: 'Input',
        path: './forms/components/Input.tsx',
        scope: 'forms.components'
      };

      const shadowingConflict = {
        type: 'shadowing',
        identifier: 'Input',
        shadowingScope: 'forms.components',
        shadowedScope: 'ui.controls',
        severity: 'medium'
      };

      mockScopeAnalyzer.checkShadowing.mockReturnValue(shadowingConflict);
      mockConflictDetector.analyzeConflictSeverity.mockReturnValue('medium');

      // Act
      const result = await componentManager.registerComponent(shadowingComponent);

      // Assert
      expect(mockScopeAnalyzer.checkShadowing).toHaveBeenCalledWith(shadowingComponent);
      expect(mockConflictDetector.reportConflict).toHaveBeenCalledWith(shadowingConflict);
      expect(result.warnings).toContain(shadowingConflict);
    });
  });

  describe('Bulk Registration Operations', () => {
    it('should coordinate bulk registration with batch conflict detection', async () => {
      // Arrange
      const components = [
        { name: 'ComponentA', path: './a.tsx' },
        { name: 'ComponentB', path: './b.tsx' },
        { name: 'ComponentC', path: './c.tsx' }
      ];

      mockComponentRegistry.getAllRegistered.mockReturnValue([]);
      mockConflictDetector.detectNamingConflicts.mockReturnValue([]);
      mockComponentRegistry.register.mockResolvedValue({ success: true });

      // Act
      const results = await componentManager.registerBatch(components);

      // Assert - Verify batch processing coordination
      expect(mockComponentRegistry.getAllRegistered).toHaveBeenCalled();
      expect(mockConflictDetector.detectNamingConflicts).toHaveBeenCalledTimes(3);
      expect(mockComponentRegistry.register).toHaveBeenCalledTimes(3);
      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle batch conflicts through coordinated resolution', async () => {
      // Arrange
      const conflictingBatch = [
        { name: 'Card', path: './ui/Card.tsx' },
        { name: 'Card', path: './layout/Card.tsx' }
      ];

      const batchConflicts = [
        {
          type: 'batch_naming_conflict',
          identifier: 'Card',
          components: conflictingBatch,
          severity: 'high'
        }
      ];

      mockConflictDetector.detectNamingConflicts.mockReturnValue(batchConflicts);
      mockNamingResolver.generateAlternativeName
        .mockReturnValueOnce('UICard')
        .mockReturnValueOnce('LayoutCard');

      // Act
      const results = await componentManager.registerBatch(conflictingBatch);

      // Assert
      expect(mockConflictDetector.reportConflict).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'batch_naming_conflict' })
      );
      expect(mockNamingResolver.generateAlternativeName).toHaveBeenCalledTimes(2);
      expect(results.some(r => r.resolvedName === 'UICard')).toBe(true);
      expect(results.some(r => r.resolvedName === 'LayoutCard')).toBe(true);
    });
  });

  describe('Component Lookup and Resolution', () => {
    it('should coordinate component lookup with registry and resolver', async () => {
      // Arrange
      const lookupQuery = {
        identifier: 'Button',
        context: 'forms',
        exactMatch: false
      };

      const registryResults = [
        { name: 'Button', path: './ui/Button.tsx' },
        { name: 'FormButton', path: './forms/Button.tsx' }
      ];

      const resolvedComponent = { name: 'FormButton', path: './forms/Button.tsx' };

      mockComponentRegistry.lookup.mockReturnValue(registryResults);
      mockNamingResolver.resolveIdentifier.mockReturnValue(resolvedComponent);

      // Act
      const result = await componentManager.lookupComponent(lookupQuery);

      // Assert - Verify lookup coordination
      expect(mockComponentRegistry.lookup).toHaveBeenCalledWith('Button');
      expect(mockNamingResolver.resolveIdentifier).toHaveBeenCalledWith(
        lookupQuery,
        registryResults
      );
      expect(result).toBe(resolvedComponent);
    });

    it('should handle ambiguous lookups through conflict detector', async () => {
      // Arrange
      const ambiguousQuery = { identifier: 'Input' };
      const ambiguousResults = [
        { name: 'Input', path: './forms/Input.tsx' },
        { name: 'Input', path: './ui/Input.tsx' }
      ];

      const ambiguityConflict = {
        type: 'ambiguous_lookup',
        identifier: 'Input',
        candidates: ambiguousResults,
        severity: 'medium'
      };

      mockComponentRegistry.lookup.mockReturnValue(ambiguousResults);
      mockConflictDetector.detectNamingConflicts.mockReturnValue([ambiguityConflict]);
      mockConflictDetector.suggestResolutions.mockReturnValue([
        'Use qualified import: import { Input } from "./forms/Input"',
        'Rename one component to avoid ambiguity'
      ]);

      // Act
      const result = await componentManager.lookupComponent(ambiguousQuery);

      // Assert
      expect(mockConflictDetector.detectNamingConflicts).toHaveBeenCalled();
      expect(mockConflictDetector.suggestResolutions).toHaveBeenCalledWith(ambiguityConflict);
      expect(result.ambiguous).toBe(true);
      expect(result.suggestions).toHaveLength(2);
    });
  });

  describe('Contract and Behavior Verification', () => {
    it('should maintain registry contract throughout operations', async () => {
      // Arrange
      const component = { name: 'Test', path: './test.tsx' };
      mockComponentRegistry.isRegistered.mockReturnValue(false);
      mockComponentRegistry.register.mockResolvedValue({ success: true });
      mockConflictDetector.detectNamingConflicts.mockReturnValue([]);

      // Act
      await componentManager.registerComponent(component);

      // Assert - Verify contract compliance
      expect(mockComponentRegistry.isRegistered).toHaveBeenCalledWith(
        expect.any(String)
      );
      expect(mockComponentRegistry.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.any(String) })
      );
    });

    it('should enforce proper collaboration order in registration workflow', async () => {
      // Arrange
      const component = { name: 'OrderTest', path: './order.tsx' };
      mockComponentRegistry.isRegistered.mockReturnValue(false);
      mockNamingResolver.validateName.mockReturnValue({ valid: true });
      mockConflictDetector.detectNamingConflicts.mockReturnValue([]);

      // Act
      await componentManager.registerComponent(component);

      // Assert - Verify call order (London School emphasis)
      const calls = jest.getAllMockCalls();
      
      const isRegisteredCall = calls.find(call => 
        call[0] === 'mockComponentRegistry.isRegistered'
      );
      const validateNameCall = calls.find(call => 
        call[0] === 'mockNamingResolver.validateName'
      );
      const detectConflictsCall = calls.find(call => 
        call[0] === 'mockConflictDetector.detectNamingConflicts'
      );
      const registerCall = calls.find(call => 
        call[0] === 'mockComponentRegistry.register'
      );

      // Verify proper sequence
      expect(calls.indexOf(isRegisteredCall)).toBeLessThan(calls.indexOf(validateNameCall));
      expect(calls.indexOf(validateNameCall)).toBeLessThan(calls.indexOf(detectConflictsCall));
      expect(calls.indexOf(detectConflictsCall)).toBeLessThan(calls.indexOf(registerCall));
    });

    it('should verify all collaborator contracts are satisfied', () => {
      // Assert contract definitions
      expect(mockComponentRegistry).toHaveProperty('register');
      expect(mockComponentRegistry).toHaveProperty('lookup');
      expect(mockNamingResolver).toHaveProperty('resolveIdentifier');
      expect(mockNamingResolver).toHaveProperty('generateAlternativeName');
      expect(mockConflictDetector).toHaveProperty('detectNamingConflicts');
      expect(mockScopeAnalyzer).toHaveProperty('analyzeScope');

      // Verify function contracts
      expect(typeof mockComponentRegistry.register).toBe('function');
      expect(typeof mockNamingResolver.resolveIdentifier).toBe('function');
      expect(typeof mockConflictDetector.detectNamingConflicts).toBe('function');
    });
  });
});

// Mock implementation class for testing
class ComponentManager {
  constructor(componentRegistry, namingResolver, conflictDetector, scopeAnalyzer) {
    this.componentRegistry = componentRegistry;
    this.namingResolver = namingResolver;
    this.conflictDetector = conflictDetector;
    this.scopeAnalyzer = scopeAnalyzer;
  }

  async registerComponent(componentDefinition) {
    // Check if already registered
    const isRegistered = this.componentRegistry.isRegistered(componentDefinition.name);
    if (isRegistered) {
      const existingComponent = this.componentRegistry.lookup(componentDefinition.name);
      const conflicts = this.conflictDetector.detectNamingConflicts(
        componentDefinition,
        [existingComponent]
      );

      if (conflicts.length > 0) {
        for (const conflict of conflicts) {
          const severity = this.conflictDetector.analyzeConflictSeverity(conflict);
          this.conflictDetector.reportConflict({ ...conflict, severity });
        }

        // Try to resolve conflicts
        const alternativeName = this.namingResolver.generateAlternativeName(
          componentDefinition.name,
          { context: this.extractContext(componentDefinition.path) }
        );
        
        const resolution = this.namingResolver.resolveIdentifier(
          componentDefinition,
          alternativeName
        );

        return {
          success: false,
          conflicts,
          resolvedName: resolution.resolvedName
        };
      }
    }

    // Validate name
    const nameValidation = this.namingResolver.validateName(componentDefinition.name);
    if (!nameValidation.valid) {
      return { success: false, errors: nameValidation.errors };
    }

    // Analyze scope
    const scopeAnalysis = this.scopeAnalyzer.analyzeScope(componentDefinition);
    const visibility = this.scopeAnalyzer.determineVisibility(componentDefinition, scopeAnalysis);
    
    // Check for shadowing
    const shadowingConflict = this.scopeAnalyzer.checkShadowing(componentDefinition);
    const warnings = [];
    if (shadowingConflict) {
      this.conflictDetector.analyzeConflictSeverity(shadowingConflict);
      this.conflictDetector.reportConflict(shadowingConflict);
      warnings.push(shadowingConflict);
    }

    // Detect conflicts with all registered components
    const allRegistered = this.componentRegistry.getAllRegistered();
    const conflicts = this.conflictDetector.detectNamingConflicts(
      componentDefinition,
      allRegistered
    );

    if (conflicts.length === 0) {
      const registrationResult = await this.componentRegistry.register({
        ...componentDefinition,
        visibility,
        scope: scopeAnalysis.scope
      });
      
      return { 
        success: registrationResult.success,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    }

    return { success: false, conflicts };
  }

  async registerBatch(components) {
    const allRegistered = this.componentRegistry.getAllRegistered();
    const results = [];

    for (const component of components) {
      const conflicts = this.conflictDetector.detectNamingConflicts(component, allRegistered);
      
      if (conflicts.length > 0) {
        // Handle batch conflicts
        conflicts.forEach(conflict => this.conflictDetector.reportConflict(conflict));
        
        const alternativeName = this.namingResolver.generateAlternativeName(
          component.name,
          { context: this.extractContext(component.path) }
        );
        
        results.push({
          originalName: component.name,
          resolvedName: alternativeName,
          success: true
        });
      } else {
        const registrationResult = await this.componentRegistry.register(component);
        results.push(registrationResult);
      }
    }

    return results;
  }

  async lookupComponent(query) {
    const registryResults = this.componentRegistry.lookup(query.identifier);
    
    if (registryResults.length > 1) {
      const ambiguityConflict = {
        type: 'ambiguous_lookup',
        identifier: query.identifier,
        candidates: registryResults,
        severity: 'medium'
      };
      
      const conflicts = this.conflictDetector.detectNamingConflicts(query, registryResults);
      const suggestions = this.conflictDetector.suggestResolutions(ambiguityConflict);
      
      return {
        ambiguous: true,
        candidates: registryResults,
        suggestions
      };
    }

    if (registryResults.length === 1) {
      return this.namingResolver.resolveIdentifier(query, registryResults);
    }

    return null;
  }

  extractContext(path) {
    const parts = path.split('/');
    return parts[parts.length - 2] || 'default';
  }
}