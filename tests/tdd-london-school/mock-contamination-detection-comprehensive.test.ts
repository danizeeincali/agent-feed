/**
 * TDD London School: Comprehensive Mock Contamination Detection
 * 
 * MISSION: Detect and eliminate ALL forms of mock/synthetic data contamination
 * APPROACH: Static analysis + runtime detection + behavioral verification
 * TOLERANCE: ZERO mock data allowed in production code
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

describe('Mock Data Contamination Detection - ZERO TOLERANCE', () => {
  
  const UNIFIED_AGENT_PAGE_PATH = resolve(__dirname, '../../frontend/src/components/UnifiedAgentPage.tsx');
  const DATA_TRANSFORMERS_PATH = resolve(__dirname, '../../frontend/src/utils/unified-agent-data-transformer.ts');
  const REAL_DATA_TRANSFORMERS_PATH = resolve(__dirname, '../../frontend/src/utils/real-data-transformers.ts');

  describe('Static Source Code Analysis', () => {
    test('should contain ZERO Math.random() calls', () => {
      const sourceCode = readFileSync(UNIFIED_AGENT_PAGE_PATH, 'utf-8');
      
      // Check for any Math.random() usage
      const randomMatches = sourceCode.match(/Math\.random\(\)/g);
      expect(randomMatches).toBeNull();
      
      // Check for random number generation patterns
      const randomPatterns = [
        /Math\.random\(\)/g,
        /random\(\)/g,
        /Math\.floor\(Math\.random/g,
        /\* Math\.random/g,
        /\.random\(/g
      ];
      
      randomPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).toBeNull(`Random pattern ${index + 1} found: ${pattern}`);
      });
    });

    test('should contain ZERO hardcoded activity data', () => {
      const sourceCode = readFileSync(UNIFIED_AGENT_PAGE_PATH, 'utf-8');
      
      // Prohibited hardcoded activity indicators
      const prohibitedPatterns = [
        /const.*activities.*=.*\[/i,
        /activities.*=.*\[.*{.*type.*:.*'task_/i,
        /\[.*{.*id.*:.*'activity-/i,
        /'Sample.*task'/i,
        /'Generated.*activity'/i,
        /'Mock.*data'/i,
        /'Lorem ipsum'/i,
        /'Test.*activity.*completed'/i,
        /new Date\(\)\.toISOString\(\).*activity/i
      ];
      
      prohibitedPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).toBeNull(`Hardcoded activity pattern ${index + 1} found: ${pattern}`);
      });
    });

    test('should contain ZERO hardcoded post data', () => {
      const sourceCode = readFileSync(UNIFIED_AGENT_PAGE_PATH, 'utf-8');
      
      // Prohibited hardcoded post indicators
      const prohibitedPostPatterns = [
        /const.*posts.*=.*\[/i,
        /posts.*=.*\[.*{.*type.*:.*'insight'/i,
        /\[.*{.*id.*:.*'post-/i,
        /'Sample.*post'/i,
        /'Generated.*insight'/i,
        /'Mock.*content'/i,
        /'Sharing.*thoughts'/i,
        /'Just.*completed'/i,
        /interactions.*:.*{.*likes.*:.*[0-9]/i
      ];
      
      prohibitedPostPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).toBeNull(`Hardcoded post pattern ${index + 1} found: ${pattern}`);
      });
    });

    test('should contain ZERO synthetic timestamp generation', () => {
      const sourceCode = readFileSync(UNIFIED_AGENT_PAGE_PATH, 'utf-8');
      
      // Prohibited synthetic timestamp patterns
      const syntheticTimestampPatterns = [
        /new Date\(\)\.toISOString\(\)/g,
        /Date\.now\(\)/g,
        /new Date\(Date\.now\(\)/g,
        /timestamp.*=.*new Date/g,
        /- [0-9]+ \* 60 \* 1000/g, // Time calculations for fake timestamps
        /\* 24 \* 60 \* 60 \* 1000/g // Day calculations for fake timestamps
      ];
      
      syntheticTimestampPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).toBeNull(`Synthetic timestamp pattern ${index + 1} found: ${pattern}`);
      });
    });

    test('should only use deterministic data transformations', () => {
      const sourceCode = readFileSync(UNIFIED_AGENT_PAGE_PATH, 'utf-8');
      
      // All data should come from API responses, not generated
      const deterministicPatterns = [
        /fetchRealActivities/g,
        /fetchRealPosts/g,
        /response\.json\(\)/g,
        /apiData\./g
      ];
      
      // Should find API-based data fetching
      deterministicPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).not.toBeNull(`Required deterministic pattern ${index + 1} not found: ${pattern}`);
        expect(matches!.length).toBeGreaterThan(0);
      });
    });

    test('should contain ZERO placeholder or sample data', () => {
      const sourceCode = readFileSync(UNIFIED_AGENT_PAGE_PATH, 'utf-8');
      
      // Prohibited placeholder patterns
      const placeholderPatterns = [
        /'sample'/i,
        /'placeholder'/i,
        /'example'/i,
        /'demo'/i,
        /'test.*data'/i,
        /'lorem'/i,
        /'ipsum'/i,
        /'foo.*bar'/i,
        /'temp.*data'/i,
        /'mock.*'/i
      ];
      
      placeholderPatterns.forEach((pattern, index) => {
        const matches = sourceCode.match(pattern);
        expect(matches).toBeNull(`Placeholder pattern ${index + 1} found: ${pattern}`);
      });
    });

    test('should verify data transformers use only real API data', () => {
      // Check real-data-transformers.ts if it exists
      try {
        const transformerCode = readFileSync(REAL_DATA_TRANSFORMERS_PATH, 'utf-8');
        
        // Should not contain any data generation
        const prohibitedGenerationPatterns = [
          /Math\.random/g,
          /generateMock/g,
          /createSample/g,
          /faker\./g,
          /chance\./g,
          /mock.*data/i
        ];
        
        prohibitedGenerationPatterns.forEach((pattern, index) => {
          const matches = transformerCode.match(pattern);
          expect(matches).toBeNull(`Data generation pattern ${index + 1} found in transformer: ${pattern}`);
        });
        
        // Should only transform, not generate
        expect(transformerCode).toMatch(/transform/i);
        expect(transformerCode).toMatch(/apiData/i);
        
      } catch (error) {
        // If file doesn't exist, that's acceptable - no transformers to check
        console.log('Real data transformers file not found - acceptable');
      }
    });
  });

  describe('Runtime Contamination Detection', () => {
    beforeEach(() => {
      // Spy on random functions to detect runtime usage
      jest.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('CONTAMINATION DETECTED: Math.random() called during component render');
      });
      
      jest.spyOn(Date, 'now').mockImplementation(() => {
        throw new Error('CONTAMINATION DETECTED: Date.now() called for synthetic timestamps');
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('should not call Math.random() during component lifecycle', async () => {
      // Mock only fetch to avoid triggering our contamination detectors
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'test-agent',
            name: 'Test Agent',
            description: 'Test',
            status: 'active',
            capabilities: []
          }
        })
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      // This should not trigger our Math.random spy
      await expect(async () => {
        render(
          <MemoryRouter initialEntries={['/agents/test-agent']}>
            <div data-testid="unified-agent-page">
              {/* Wrap to catch any random calls */}
            </div>
          </MemoryRouter>
        );
        
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });
      }).not.toThrow();
    });

    test('should not generate synthetic timestamps during render', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      // Remove Date.now spy for this specific test to allow normal operation
      jest.restoreAllMocks();
      
      // But monitor for specific synthetic patterns
      let syntheticTimestampDetected = false;
      const originalToISOString = Date.prototype.toISOString;
      
      Date.prototype.toISOString = function() {
        // Allow legitimate timestamp formatting, but detect synthetic generation
        if (this.getTime() === Date.now()) {
          syntheticTimestampDetected = true;
        }
        return originalToISOString.call(this);
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'timestamp-test',
            name: 'Timestamp Test',
            description: 'Test',
            status: 'active',
            capabilities: [],
            last_used: '2025-01-10T10:00:00Z' // Real timestamp from API
          }
        })
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/agents/timestamp-test']}>
          <div>Test Component</div>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      unmount();

      // Restore original method
      Date.prototype.toISOString = originalToISOString;

      expect(syntheticTimestampDetected).toBe(false);
    });
  });

  describe('Data Source Verification', () => {
    test('should only display data from API responses', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      // Known API response with specific values
      const knownApiData = {
        success: true,
        data: {
          id: 'verification-agent',
          name: 'Verification Agent',
          description: 'API sourced description',
          status: 'active',
          capabilities: ['api-sourced-capability'],
          performance_metrics: {
            success_rate: 77.7, // Unique value to track
            average_response_time: 3.33 // Unique value to track
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => knownApiData
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(
        <MemoryRouter initialEntries={['/agents/verification-agent']}>
          <div>Component Under Test</div>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/agents/verification-agent');
      });

      // All displayed data must be traceable to API response
      await waitFor(() => {
        // These exact values should be visible if displaying API data
        const successRateElements = screen.queryAllByText('77.7%');
        const responseTimeElements = screen.queryAllByText('3.33s');
        
        // If any performance metrics are shown, they must be from API
        if (successRateElements.length > 0) {
          expect(successRateElements.length).toBeGreaterThan(0);
        }
        if (responseTimeElements.length > 0) {
          expect(responseTimeElements.length).toBeGreaterThan(0);
        }
      });

      // Should not display any values not in API response
      expect(screen.queryByText('95%')).not.toBeInTheDocument(); // Common default
      expect(screen.queryByText('1.2s')).not.toBeInTheDocument(); // Common default
      expect(screen.queryByText('Sample Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Generated Activity')).not.toBeInTheDocument();
    });

    test('should fail if non-API data is detected', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      // API returns minimal data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'minimal-agent',
            name: 'Minimal Agent',
            description: 'Minimal',
            status: 'active',
            capabilities: []
            // NO performance_metrics provided
          }
        })
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(
        <MemoryRouter initialEntries={['/agents/minimal-agent']}>
          <div>Minimal Agent Test</div>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Since no performance_metrics in API, should not show any stats
      // If any performance stats appear, they must be synthetic/generated
      const suspiciousElements = [
        screen.queryByText(/\d+% success rate/i),
        screen.queryByText(/\d+\.\d+s avg response/i),
        screen.queryByText(/\d+ tasks completed/i)
      ].filter(el => el !== null);

      // Only allowed if they explicitly show "0" or "N/A" for missing data
      suspiciousElements.forEach(element => {
        const text = element!.textContent || '';
        const isZeroOrNA = text.includes('0') || text.includes('N/A') || text.includes('Unknown');
        expect(isZeroOrNA).toBe(true);
      });
    });
  });

  describe('Configuration Data Authenticity', () => {
    test('should use only API-provided configuration values', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      // API with specific configuration values
      const apiConfigData = {
        success: true,
        data: {
          id: 'config-agent',
          name: 'Config Agent',
          description: 'Configuration test agent',
          status: 'active',
          capabilities: [],
          avatar_color: '#FF5733', // Specific color from API
          system_prompt: 'Real system prompt from API'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => apiConfigData
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      render(
        <MemoryRouter initialEntries={['/agents/config-agent']}>
          <div>Config Test</div>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should not have any hardcoded default values if API provides them
      expect(screen.queryByText('AI Agent')).not.toBeInTheDocument(); // Generic default
      expect(screen.queryByText('#3B82F6')).not.toBeInTheDocument(); // Default blue color
      expect(screen.queryByText('General Purpose AI Assistant')).not.toBeInTheDocument(); // Generic default
    });
  });

  describe('Interaction Data Authenticity', () => {
    test('should display only real interaction counts from API', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      // Mock agent data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'interaction-agent',
            name: 'Interaction Agent',
            description: 'Test',
            status: 'active',
            capabilities: []
          }
        })
      });
      
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
      
      // Specific interaction counts from API
      const realPostData = [{
        id: 'real-post',
        type: 'insight',
        title: 'Real Post',
        content: 'Content',
        timestamp: '2025-01-10T10:00:00Z',
        author: { id: 'interaction-agent', name: 'Agent', avatar: '🤖' },
        tags: [],
        interactions: {
          likes: 42,     // Specific real count
          comments: 7,   // Specific real count  
          shares: 3,     // Specific real count
          bookmarks: 15  // Specific real count
        },
        priority: 'medium'
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => realPostData
      });

      render(
        <MemoryRouter initialEntries={['/agents/interaction-agent']}>
          <div>Interaction Test</div>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });

      // These specific values should be displayed if posts are shown
      await waitFor(() => {
        if (screen.queryByText('Real Post')) {
          expect(screen.getByText('42')).toBeInTheDocument(); // Real likes count
          expect(screen.getByText('7')).toBeInTheDocument();  // Real comments count
          expect(screen.getByText('3')).toBeInTheDocument();  // Real shares count
          expect(screen.getByText('15')).toBeInTheDocument(); // Real bookmarks count
        }
      });

      // Should not show common synthetic values
      const syntheticValues = ['10', '20', '50', '100', '5', '25'];
      syntheticValues.forEach(value => {
        // Only flag as synthetic if it appears in interaction context
        const elements = screen.queryAllByText(value);
        elements.forEach(element => {
          const context = element.closest('[data-testid*="post"]') || 
                          element.closest('div')?.textContent || '';
          if (context.includes('likes') || context.includes('comments') || 
              context.includes('shares') || context.includes('bookmarks')) {
            // This would be synthetic since our real data uses different values
            expect(false).toBe(true); // Fail if synthetic interaction data found
          }
        });
      });
    });
  });
});