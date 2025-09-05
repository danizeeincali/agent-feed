/**
 * Unit Tests for BusinessImpactAnalyzer
 * TDD London School - Mock-Driven Testing
 */

const { BusinessImpactAnalyzer } = require('../../src/posting-intelligence/core-framework');
const { MockDataFactory } = require('../mocks/posting-intelligence-mocks');
const { TestUtils } = require('../utils/test-setup');

describe('BusinessImpactAnalyzer', () => {
  let analyzer;
  let mockContent;
  let mockUserData;

  beforeEach(() => {
    analyzer = new BusinessImpactAnalyzer();
    mockContent = { text: 'Sample business content with revenue and efficiency improvements' };
    mockUserData = MockDataFactory.createValidRequest().userData;
  });

  describe('initialization', () => {
    it('should initialize with proper impact factors', () => {
      // Act
      const newAnalyzer = new BusinessImpactAnalyzer();

      // Assert
      expect(newAnalyzer.impactFactors).toEqual({
        revenue: 0.3,
        efficiency: 0.25,
        strategic: 0.2,
        risk: 0.15,
        innovation: 0.1
      });
    });
  });

  describe('analyzeBusinessImpact', () => {
    it('should analyze all impact factors', async () => {
      // Act
      const result = await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      // Assert
      expect(result).toMatchObject({
        score: expect.any(Number),
        factors: {
          revenue: expect.any(Number),
          efficiency: expect.any(Number),
          strategic: expect.any(Number),
          risk: expect.any(Number),
          innovation: expect.any(Number)
        },
        improvements: expect.any(Array),
        reasoning: expect.any(Array)
      });
    });

    it('should calculate weighted score correctly', async () => {
      // Arrange - Mock individual analyzers with known values
      jest.spyOn(analyzer, 'analyzeRevenueImpact').mockReturnValue(0.8);
      jest.spyOn(analyzer, 'analyzeEfficiencyImpact').mockReturnValue(0.6);
      jest.spyOn(analyzer, 'analyzeStrategicImpact').mockReturnValue(0.7);
      jest.spyOn(analyzer, 'analyzeRiskImpact').mockReturnValue(0.5);
      jest.spyOn(analyzer, 'analyzeInnovationImpact').mockReturnValue(0.4);

      // Act
      const result = await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      // Assert - Calculate expected weighted score
      const expectedScore = (0.8 * 0.3) + (0.6 * 0.25) + (0.7 * 0.2) + (0.5 * 0.15) + (0.4 * 0.1);
      expect(result.score).toBeCloseTo(expectedScore, 2);
    });

    it('should generate improvements for low impact factors', async () => {
      // Arrange - Mock low impact scores
      jest.spyOn(analyzer, 'analyzeRevenueImpact').mockReturnValue(0.3);
      jest.spyOn(analyzer, 'analyzeEfficiencyImpact').mockReturnValue(0.4);
      jest.spyOn(analyzer, 'analyzeStrategicImpact').mockReturnValue(0.3);

      // Act
      const result = await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      // Assert
      expect(result.improvements).toContain('Consider adding more revenue-focused language and metrics');
      expect(result.improvements).toContain('Highlight efficiency gains and process improvements');
      expect(result.improvements).toContain('Connect to broader strategic objectives and goals');
    });

    it('should generate reasoning for all factors', async () => {
      // Act
      const result = await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      // Assert
      expect(result.reasoning).toHaveLength(5);
      result.reasoning.forEach(reason => {
        expect(reason).toMatch(/^(revenue|efficiency|strategic|risk|innovation): (High|Medium|Low) impact \(\d+\.\d%\)$/);
      });
    });
  });

  describe('analyzeRevenueImpact', () => {
    it('should detect revenue keywords in content', () => {
      // Arrange
      const revenueContent = { text: 'This will increase revenue and drive sales growth for customers' };
      const userData = { impact_score: 8 };

      // Act
      const result = analyzer.analyzeRevenueImpact(revenueContent, userData);

      // Assert
      expect(result).toBeGreaterThan(0.5); // Should detect revenue keywords
    });

    it('should incorporate impact score multiplier', () => {
      // Arrange
      const content = { text: 'revenue sales customer' };
      const highImpactUser = { impact_score: 10 };
      const lowImpactUser = { impact_score: 1 };

      // Act
      const highImpactResult = analyzer.analyzeRevenueImpact(content, highImpactUser);
      const lowImpactResult = analyzer.analyzeRevenueImpact(content, lowImpactUser);

      // Assert
      expect(highImpactResult).toBeGreaterThan(lowImpactResult);
    });

    it('should handle content without revenue keywords', () => {
      // Arrange
      const nonRevenueContent = { text: 'This is about technical documentation and processes' };
      const userData = { impact_score: 5 };

      // Act
      const result = analyzer.analyzeRevenueImpact(nonRevenueContent, userData);

      // Assert
      expect(result).toBeLessThan(0.5);
    });
  });

  describe('analyzeEfficiencyImpact', () => {
    it('should detect efficiency keywords', () => {
      // Arrange
      const efficiencyContent = { text: 'Automate processes to optimize and streamline workflows' };
      const userData = { priority: 'P1' };

      // Act
      const result = analyzer.analyzeEfficiencyImpact(efficiencyContent, userData);

      // Assert
      expect(result).toBeGreaterThan(0.5);
    });

    it('should apply priority multiplier correctly', () => {
      // Arrange
      const content = { text: 'optimize improve automate' };
      const p1User = { priority: 'P1' };
      const p3User = { priority: 'P3' };

      // Act
      const p1Result = analyzer.analyzeEfficiencyImpact(content, p1User);
      const p3Result = analyzer.analyzeEfficiencyImpact(content, p3User);

      // Assert
      expect(p1Result).toBeGreaterThan(p3Result);
    });
  });

  describe('analyzeStrategicImpact', () => {
    it('should detect strategic keywords', () => {
      // Arrange
      const strategicContent = { text: 'Strategic vision and transformation goals for the future' };

      // Act
      const result = analyzer.analyzeStrategicImpact(strategicContent, mockUserData);

      // Assert
      expect(result).toBeGreaterThan(0.5);
    });

    it('should return low score for non-strategic content', () => {
      // Arrange
      const tacticalContent = { text: 'Complete this task by tomorrow' };

      // Act
      const result = analyzer.analyzeStrategicImpact(tacticalContent, mockUserData);

      // Assert
      expect(result).toBeLessThan(0.3);
    });
  });

  describe('analyzeRiskImpact', () => {
    it('should detect risk-related keywords', () => {
      // Arrange
      const riskContent = { text: 'Address security risks and compliance issues' };

      // Act
      const result = analyzer.analyzeRiskImpact(riskContent, mockUserData);

      // Assert
      expect(result).toBeGreaterThan(0.3);
    });

    it('should handle content without risk keywords', () => {
      // Arrange
      const safeContent = { text: 'Regular meeting about project status' };

      // Act
      const result = analyzer.analyzeRiskImpact(safeContent, mockUserData);

      // Assert
      expect(result).toBeLessThan(0.2);
    });
  });

  describe('analyzeInnovationImpact', () => {
    it('should detect innovation keywords', () => {
      // Arrange
      const innovativeContent = { text: 'Breakthrough innovation and creative new solutions' };

      // Act
      const result = analyzer.analyzeInnovationImpact(innovativeContent, mockUserData);

      // Assert
      expect(result).toBeGreaterThan(0.4);
    });

    it('should return low score for routine content', () => {
      // Arrange
      const routineContent = { text: 'Standard procedure and regular maintenance' };

      // Act
      const result = analyzer.analyzeInnovationImpact(routineContent, mockUserData);

      // Assert
      expect(result).toBeLessThan(0.2);
    });
  });

  describe('generateImprovements', () => {
    it('should generate revenue improvement for low revenue factor', () => {
      // Arrange
      const factors = { revenue: 0.3, efficiency: 0.8, strategic: 0.7 };

      // Act
      const improvements = analyzer.generateImprovements(factors);

      // Assert
      expect(improvements).toContain('Consider adding more revenue-focused language and metrics');
    });

    it('should generate efficiency improvement for low efficiency factor', () => {
      // Arrange
      const factors = { revenue: 0.8, efficiency: 0.3, strategic: 0.7 };

      // Act
      const improvements = analyzer.generateImprovements(factors);

      // Assert
      expect(improvements).toContain('Highlight efficiency gains and process improvements');
    });

    it('should generate strategic improvement for low strategic factor', () => {
      // Arrange
      const factors = { revenue: 0.8, efficiency: 0.8, strategic: 0.3 };

      // Act
      const improvements = analyzer.generateImprovements(factors);

      // Assert
      expect(improvements).toContain('Connect to broader strategic objectives and goals');
    });

    it('should return empty array for high factors', () => {
      // Arrange
      const factors = { revenue: 0.8, efficiency: 0.8, strategic: 0.8 };

      // Act
      const improvements = analyzer.generateImprovements(factors);

      // Assert
      expect(improvements).toHaveLength(0);
    });
  });

  describe('generateReasoning', () => {
    it('should categorize high impact factors correctly', () => {
      // Arrange
      const factors = {
        revenue: 0.8,
        efficiency: 0.9,
        strategic: 0.6,
        risk: 0.3,
        innovation: 0.2
      };

      // Act
      const reasoning = analyzer.generateReasoning(factors);

      // Assert
      expect(reasoning).toContain('revenue: High impact (80.0%)');
      expect(reasoning).toContain('efficiency: High impact (90.0%)');
      expect(reasoning).toContain('strategic: Medium impact (60.0%)');
      expect(reasoning).toContain('risk: Low impact (30.0%)');
      expect(reasoning).toContain('innovation: Low impact (20.0%)');
    });

    it('should format percentages correctly', () => {
      // Arrange
      const factors = { revenue: 0.755 };

      // Act
      const reasoning = analyzer.generateReasoning(factors);

      // Assert
      expect(reasoning[0]).toBe('revenue: High impact (75.5%)');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle empty content', async () => {
      // Arrange
      const emptyContent = { text: '' };

      // Act
      const result = await analyzer.analyzeBusinessImpact(emptyContent, mockUserData);

      // Assert
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.factors).toBeDefined();
    });

    it('should handle missing user data fields', async () => {
      // Arrange
      const incompleteUserData = { title: 'Basic task' };

      // Act
      const result = await analyzer.analyzeBusinessImpact(mockContent, incompleteUserData);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should complete analysis within time limit', async () => {
      // Arrange
      const startTime = performance.now();

      // Act
      await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(processingTime).toBeLessThan(50); // 50ms limit
    });

    it('should handle very long content efficiently', async () => {
      // Arrange
      const longContent = { text: 'revenue '.repeat(1000) + 'efficiency '.repeat(1000) };
      const startTime = performance.now();

      // Act
      const result = await analyzer.analyzeBusinessImpact(longContent, mockUserData);

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(100); // Should still be fast
    });
  });

  describe('London School behavior verification', () => {
    it('should call all individual analysis methods', async () => {
      // Arrange - Spy on individual methods
      const revenueSpyGUI: jest.fn() = jest.spyOn(analyzer, 'analyzeRevenueImpact');
      const efficiencySpy = jest.spyOn(analyzer, 'analyzeEfficiencyImpact');
      const strategicSpy = jest.spyOn(analyzer, 'analyzeStrategicImpact');
      const riskSpy = jest.spyOn(analyzer, 'analyzeRiskImpact');
      const innovationSpy = jest.spyOn(analyzer, 'analyzeInnovationImpact');

      // Act
      await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      // Assert - Verify all methods were called
      expect(revenueSpy).toHaveBeenCalledWith(mockContent, mockUserData);
      expect(efficiencySpy).toHaveBeenCalledWith(mockContent, mockUserData);
      expect(strategicSpy).toHaveBeenCalledWith(mockContent, mockUserData);
      expect(riskSpy).toHaveBeenCalledWith(mockContent, mockUserData);
      expect(innovationSpy).toHaveBeenCalledWith(mockContent, mockUserData);
    });

    it('should call improvement generation after factor analysis', async () => {
      // Arrange
      const improvementsSpy = jest.spyOn(analyzer, 'generateImprovements');
      const reasoningSpy = jest.spyOn(analyzer, 'generateReasoning');

      // Act
      await analyzer.analyzeBusinessImpact(mockContent, mockUserData);

      // Assert
      expect(improvementsSpy).toHaveBeenCalledWith(expect.objectContaining({
        revenue: expect.any(Number),
        efficiency: expect.any(Number),
        strategic: expect.any(Number),
        risk: expect.any(Number),
        innovation: expect.any(Number)
      }));
      expect(reasoningSpy).toHaveBeenCalledWith(expect.objectContaining({
        revenue: expect.any(Number),
        efficiency: expect.any(Number),
        strategic: expect.any(Number),
        risk: expect.any(Number),
        innovation: expect.any(Number)
      }));
    });
  });
});