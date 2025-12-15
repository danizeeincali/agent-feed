/**
 * Unit Tests for ContentTemplateEngine
 * TDD London School - Mock-Driven Testing
 */

const { ContentTemplateEngine } = require('../../src/posting-intelligence/core-framework');

describe('ContentTemplateEngine', () => {
  let engine;
  let mockUserData;
  let mockContext;

  beforeEach(() => {
    engine = new ContentTemplateEngine();
    mockUserData = {
      title: 'Complete project documentation',
      business_context: 'Important for product launch',
      completion_criteria: 'All sections documented with examples',
      priority: 'P2',
      impact_score: 7
    };
    mockContext = {
      businessContext: 'Product launch preparation'
    };
  });

  describe('initialization', () => {
    it('should load core templates on initialization', () => {
      // Arrange & Act
      const newEngine = new ContentTemplateEngine();

      // Assert - Verify templates are loaded
      expect(newEngine.templates.has('personal-todos')).toBe(true);
      expect(newEngine.templates.has('meeting-prep')).toBe(true);
      expect(newEngine.templates.has('meeting-next-steps')).toBe(true);
      expect(newEngine.templates.has('follow-ups')).toBe(true);
      expect(newEngine.templates.has('agent-ideas')).toBe(true);
    });

    it('should define proper template structure', () => {
      // Act
      const personalTodosTemplate = engine.templates.get('personal-todos');

      // Assert
      expect(personalTodosTemplate).toMatchObject({
        structure: 'context + task + impact + next_steps',
        tone: 'professional-personal',
        elements: expect.arrayContaining([
          'task_description',
          'business_context',
          'completion_criteria',
          'priority_reasoning'
        ])
      });
    });
  });

  describe('composeContent', () => {
    it('should compose content for valid agent type', async () => {
      // Arrange
      const agentType = 'personal-todos';

      // Act
      const result = await engine.composeContent(agentType, mockUserData, mockContext);

      // Assert
      expect(result.composition).toMatchObject({
        agentType: 'personal-todos',
        structure: 'context + task + impact + next_steps',
        tone: 'professional-personal',
        elements: expect.any(Object),
        generatedAt: expect.any(Number)
      });
      expect(result.text).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.estimatedReadTime).toBeGreaterThan(0);
    });

    it('should throw error for unknown agent type', async () => {
      // Arrange
      const invalidAgentType = 'unknown-type';

      // Act & Assert
      await expect(
        engine.composeContent(invalidAgentType, mockUserData, mockContext)
      ).rejects.toThrow('No template found for agent type: unknown-type');
    });

    it('should populate elements correctly', async () => {
      // Arrange
      const agentType = 'personal-todos';
      mockUserData.title = 'Complete documentation';
      mockUserData.business_context = 'Product launch preparation';

      // Act
      const result = await engine.composeContent(agentType, mockUserData, mockContext);

      // Assert
      expect(result.composition.elements.task_description).toEqual('Complete project documentation');
      expect(result.composition.elements.business_context).toEqual('Important for product launch');
    });

    it('should handle missing user data gracefully', async () => {
      // Arrange
      const agentType = 'personal-todos';
      const incompleteUserData = { title: 'Basic task' };

      // Act
      const result = await engine.composeContent(agentType, incompleteUserData, mockContext);

      // Assert - Should provide defaults
      expect(result.composition.elements.task_description).toEqual('Basic task');
      expect(result.composition.elements.business_context).toBeDefined();
    });
  });

  describe('populateElements', () => {
    it('should populate all required elements', async () => {
      // Arrange
      const elements = ['task_description', 'business_context', 'completion_criteria'];
      mockUserData.title = 'Test task';
      mockUserData.business_context = 'Test context';
      mockUserData.completion_criteria = 'Test criteria';

      // Act
      const result = await engine.populateElements(elements, mockUserData, mockContext);

      // Assert
      expect(result).toMatchObject({
        task_description: 'Test task',
        business_context: 'Test context',
        completion_criteria: 'Test criteria'
      });
    });

    it('should handle empty elements array', async () => {
      // Arrange
      const elements = [];

      // Act
      const result = await engine.populateElements(elements, mockUserData, mockContext);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('extractElementData', () => {
    it('should extract task description from userData', async () => {
      // Arrange
      mockUserData.title = 'Complete project analysis';

      // Act
      const result = await engine.extractElementData('task_description', mockUserData, mockContext);

      // Assert
      expect(result).toEqual('Complete project analysis');
    });

    it('should generate priority reasoning based on impact', async () => {
      // Arrange
      mockUserData.priority = 'P1';
      mockUserData.impact_score = 9;

      // Act
      const result = await engine.extractElementData('priority_reasoning', mockUserData, mockContext);

      // Assert
      expect(result).toContain('Critical priority');
      expect(result).toContain('high impact (9/10)');
    });

    it('should extract meeting purpose from context', async () => {
      // Arrange
      mockContext.agenda = { purpose: 'Quarterly review meeting' };

      // Act
      const result = await engine.extractElementData('meeting_purpose', mockUserData, mockContext);

      // Assert
      expect(result).toEqual('Quarterly review meeting');
    });

    it('should provide fallback for unknown elements', async () => {
      // Arrange
      const unknownElement = 'unknown_element';

      // Act
      const result = await engine.extractElementData(unknownElement, mockUserData, mockContext);

      // Assert
      expect(result).toEqual('unknown_element content');
    });
  });

  describe('generatePriorityReasoning', () => {
    it('should generate reasoning for P1 priority', () => {
      // Arrange
      const userData = { priority: 'P1', impact_score: 8 };

      // Act
      const result = engine.generatePriorityReasoning(userData);

      // Assert
      expect(result).toEqual('Critical priority due to high impact (8/10) and urgent timeline');
    });

    it('should generate reasoning for P3 priority', () => {
      // Arrange
      const userData = { priority: 'P3', impact_score: 5 };

      // Act
      const result = engine.generatePriorityReasoning(userData);

      // Assert
      expect(result).toEqual('Standard priority balancing impact (5/10) with resource availability');
    });

    it('should handle missing priority with default', () => {
      // Arrange
      const userData = { impact_score: 6 };

      // Act
      const result = engine.generatePriorityReasoning(userData);

      // Assert
      expect(result).toEqual('Standard priority balancing impact (6/10) with resource availability');
    });
  });

  describe('assembleContent', () => {
    it('should assemble task structure correctly', () => {
      // Arrange
      const composition = {
        structure: 'context + task + impact + next_steps',
        elements: {
          task_description: 'Complete documentation',
          business_context: 'Product launch',
          priority_reasoning: 'High priority task',
          completion_criteria: 'All sections complete'
        },
        tone: 'professional-personal'
      };

      // Act
      const result = engine.assembleContent(composition);

      // Assert
      expect(result).toMatchObject({
        text: expect.stringContaining('Task Context**: Product launch'),
        composition,
        assemblyMethod: 'context + task + impact + next_steps',
        wordCount: expect.any(Number),
        estimatedReadTime: expect.any(Number)
      });
      expect(result.text).toContain('**Task**: Complete documentation');
      expect(result.text).toContain('**Priority Reasoning**: High priority task');
    });

    it('should assemble meeting prep structure correctly', () => {
      // Arrange
      const composition = {
        structure: 'agenda + objectives + preparation + outcomes',
        elements: {
          meeting_purpose: 'Quarterly review',
          key_topics: ['Budget review', 'Team updates', 'Strategic planning'],
          expected_outcomes: 'Approved budget and timeline'
        }
      };

      // Act
      const result = engine.assembleContent(composition);

      // Assert
      expect(result.text).toContain('**Meeting Purpose**: Quarterly review');
      expect(result.text).toContain('• Budget review');
      expect(result.text).toContain('• Team updates');
      expect(result.text).toContain('**Expected Outcomes**: Approved budget and timeline');
    });

    it('should calculate word count and read time accurately', () => {
      // Arrange
      const composition = {
        structure: 'context + task + impact + next_steps',
        elements: {
          task_description: 'This is a test task description with multiple words',
          business_context: 'Important business context information',
          priority_reasoning: 'High priority reasoning',
          completion_criteria: 'Success criteria defined'
        }
      };

      // Act
      const result = engine.assembleContent(composition);

      // Assert
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.estimatedReadTime).toBeGreaterThan(0);
      expect(result.estimatedReadTime).toEqual(
        Math.ceil(result.wordCount / 200) // 200 words per minute
      );
    });

    it('should handle unknown structure with default assembly', () => {
      // Arrange
      const composition = {
        structure: 'unknown_structure',
        elements: {
          element1: 'Value 1',
          element2: 'Value 2'
        }
      };

      // Act
      const result = engine.assembleContent(composition);

      // Assert
      expect(result.text).toContain('**ELEMENT1**: Value 1');
      expect(result.text).toContain('**ELEMENT2**: Value 2');
    });
  });

  describe('template-specific assembly methods', () => {
    it('should assemble follow-up structure with arrays', () => {
      // Arrange
      const elements = {
        current_status: 'In Progress',
        progress_made: 'Completed initial phase',
        challenges: ['Resource constraints', 'Timeline issues'],
        next_steps: ['Review requirements', 'Update timeline']
      };

      // Act
      const result = engine.assembleFollowUpStructure(elements);

      // Assert
      expect(result).toContain('**Current Status**: In Progress');
      expect(result).toContain('• Resource constraints');
      expect(result).toContain('• Timeline issues');
      expect(result).toContain('• Review requirements');
      expect(result).toContain('• Update timeline');
    });

    it('should assemble idea structure correctly', () => {
      // Arrange
      const elements = {
        problem_statement: 'Manual process is inefficient',
        proposed_solution: 'Automated workflow system',
        value_proposition: 'Save 20 hours per week',
        implementation_plan: 'Phase 1: Analysis, Phase 2: Development'
      };

      // Act
      const result = engine.assembleIdeaStructure(elements);

      // Assert
      expect(result).toContain('**Problem**: Manual process is inefficient');
      expect(result).toContain('**Proposed Solution**: Automated workflow system');
      expect(result).toContain('**Value Proposition**: Save 20 hours per week');
      expect(result).toContain('**Implementation Plan**: Phase 1: Analysis, Phase 2: Development');
    });
  });

  describe('performance and validation', () => {
    it('should complete content composition within time limit', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      await engine.composeContent('personal-todos', mockUserData, mockContext);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(processingTime).toBeLessThan(100); // 100ms limit
    });

    it('should handle concurrent composition requests', async () => {
      // Arrange
      const requests = Array.from({ length: 5 }, (_, i) => (
        engine.composeContent('personal-todos', {
          ...mockUserData,
          title: `Task ${i + 1}`
        }, mockContext)
      ));

      // Act
      const results = await Promise.all(requests);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.composition.elements.task_description).toEqual(`Task ${index + 1}`);
      });
    });
  });
});