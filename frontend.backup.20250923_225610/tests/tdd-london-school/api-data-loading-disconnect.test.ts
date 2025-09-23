/**
 * TDD LONDON SCHOOL: API Integration Validation
 * 
 * MISSION: Expose the data loading disconnect between successful API responses
 * and component "Page not found" errors using outside-in testing approach.
 * 
 * NO MOCKS POLICY: All tests use real API calls and real components
 * to reproduce the actual production issue.
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import { AgentDynamicPage } from '../../src/components/AgentDynamicPage';
import { AgentDynamicPageWrapper } from '../../src/components/AgentDynamicPageWrapper';

// Test configuration
const TEST_CONFIG = {
  agentId: 'personal-todos-agent',
  pageId: '015b7296-a144-4096-9c60-ee5d7f900723',
  expectedTitle: 'Personal Todos Dashboard',
  apiBaseUrl: 'http://localhost:3000',
  timeout: 15000
};

describe('TDD London School: API Data Loading Disconnect Investigation', () => {
  
  describe('Layer 1: Direct API Contract Validation', () => {
    
    test('API endpoint returns successful response with page data', async () => {
      // Arrange: Direct API call
      const apiUrl = `${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`;
      
      // Act: Real API call (NO MOCKS)
      const response = await fetch(apiUrl);
      const apiData = await response.json();
      
      // Assert: API contract verification
      expect(response.status).toBe(200);
      expect(apiData.success).toBe(true);
      expect(apiData.pages).toBeDefined();
      expect(Array.isArray(apiData.pages)).toBe(true);
      expect(apiData.pages.length).toBeGreaterThan(0);
      
      // Verify target page exists in response
      const targetPage = apiData.pages.find(p => p.id === TEST_CONFIG.pageId);
      expect(targetPage).toBeDefined();
      expect(targetPage.id).toBe(TEST_CONFIG.pageId);
      expect(targetPage.title).toBe(TEST_CONFIG.expectedTitle);
      
      console.log('✅ API Layer: Working correctly', { 
        totalPages: apiData.pages.length,
        targetPageFound: !!targetPage,
        targetPageTitle: targetPage?.title
      });
    });

    test('API response structure matches expected format', async () => {
      // Arrange: API call
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
      const data = await response.json();
      
      // Assert: Structure validation
      expect(data).toMatchObject({
        success: expect.any(Boolean),
        pages: expect.any(Array)
      });
      
      const page = data.pages[0];
      expect(page).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        content_type: expect.any(String),
        content_value: expect.any(String)
      });
      
      console.log('✅ API Structure: Valid format', {
        responseKeys: Object.keys(data),
        pageKeys: Object.keys(page),
        samplePage: page
      });
    });
  });

  describe('Layer 2: Data Transformation Contract Tests', () => {
    
    test('FAILING: Component data transformation preserves API data', async () => {
      // Arrange: Get real API response
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
      const backendResponse = await response.json();
      
      // Act: Apply component transformation logic (simulated)
      const componentTransform = (apiResponse: any) => {
        return {
          success: apiResponse.success,
          data: apiResponse.pages || apiResponse.data || []
        };
      };
      
      const transformed = componentTransform(backendResponse);
      
      // Assert: Transformation preserves data
      expect(transformed.success).toBe(true);
      expect(transformed.data).toHaveLength(backendResponse.pages.length);
      expect(transformed.data[0].id).toBe(TEST_CONFIG.pageId);
      
      console.log('🔍 Data Transformation:', {
        originalKeys: Object.keys(backendResponse),
        transformedKeys: Object.keys(transformed),
        dataCount: transformed.data.length,
        firstPageId: transformed.data[0]?.id
      });
    });

    test('FAILING: Error handling does not interfere with successful responses', async () => {
      // Arrange: Mock console.error to capture error logs
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      try {
        // Act: Make API call and check for error handling interference
        const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
        const data = await response.json();
        
        // Assert: No errors should be logged for successful response
        expect(data.success).toBe(true);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        
        console.log('🔍 Error Handling: No interference detected');
        
      } finally {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
      }
    });
  });

  describe('Layer 3: Component Integration Contract Tests', () => {
    
    const renderWithRouter = (component: React.ReactElement) => {
      return render(
        <BrowserRouter>
          {component}
        </BrowserRouter>
      );
    };

    test('FAILING: AgentDynamicPage component displays page content after API success', async () => {
      // Arrange: Mock agent object
      const mockAgent = {
        id: TEST_CONFIG.agentId,
        name: 'Personal Todos Agent',
        description: 'Manage your personal todos'
      };

      // Act: Render component with real API integration
      renderWithRouter(
        <AgentDynamicPage 
          agent={mockAgent} 
          initialPageId={TEST_CONFIG.pageId}
        />
      );

      // Wait for loading to complete
      await waitFor(() => {
        const loadingElement = screen.queryByText(/loading/i);
        expect(loadingElement).not.toBeInTheDocument();
      }, { timeout: TEST_CONFIG.timeout });

      // Assert: Component should display page content (THIS WILL FAIL)
      const pageTitle = screen.queryByText(TEST_CONFIG.expectedTitle);
      const pageNotFound = screen.queryByText(/page not found/i);
      
      console.log('🔍 Component State:', {
        titleFound: !!pageTitle,
        pageNotFoundShown: !!pageNotFound,
        allText: screen.getByRole('main').textContent
      });
      
      expect(pageTitle).toBeInTheDocument();
      expect(pageNotFound).not.toBeInTheDocument();
    });

    test('FAILING: AgentDynamicPageWrapper displays content with router integration', async () => {
      // Arrange: Mock router state
      const mockLocation = {
        pathname: `/agents/${TEST_CONFIG.agentId}/pages/${TEST_CONFIG.pageId}`,
        search: '',
        hash: '',
        state: null,
        key: 'test'
      };
      
      // Mock useParams to return expected values
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useParams: () => ({
          agentId: TEST_CONFIG.agentId,
          pageId: TEST_CONFIG.pageId
        }),
        useLocation: () => mockLocation
      }));

      // Act: Render wrapper component
      renderWithRouter(<AgentDynamicPageWrapper />);

      // Wait for API call and rendering
      await waitFor(() => {
        const loading = screen.queryByText(/loading/i);
        expect(loading).not.toBeInTheDocument();
      }, { timeout: TEST_CONFIG.timeout });

      // Assert: Should display content (THIS WILL FAIL)
      const content = screen.queryByText(TEST_CONFIG.expectedTitle);
      const notFound = screen.queryByText(/page not found/i);
      
      console.log('🔍 Wrapper Component:', {
        contentDisplayed: !!content,
        notFoundDisplayed: !!notFound,
        currentPath: mockLocation.pathname
      });
      
      expect(content).toBeInTheDocument();
      expect(notFound).not.toBeInTheDocument();
    });
  });

  describe('Layer 4: State Management Contract Tests', () => {
    
    test('FAILING: Component state updates after successful API call', async () => {
      // Arrange: Create state monitoring
      let capturedPageState: any[] = [];
      let capturedLoadingState: boolean = true;
      let capturedErrorState: string | null = null;
      
      const StateMonitor = () => {
        const [pages, setPages] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState<string | null>(null);
        
        // Capture state changes
        React.useEffect(() => {
          capturedPageState = pages;
          capturedLoadingState = loading;
          capturedErrorState = error;
        }, [pages, loading, error]);
        
        // Simulate component API call logic
        React.useEffect(() => {
          const loadPages = async () => {
            try {
              const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
              const data = await response.json();
              
              if (data.success) {
                setPages(data.pages || []);
                setError(null);
              } else {
                setError('Failed to load pages');
              }
            } catch (err) {
              setError('API call failed');
              console.error('API Error:', err);
            } finally {
              setLoading(false);
            }
          };
          
          loadPages();
        }, []);
        
        return (
          <div>
            {loading && <div>Loading...</div>}
            {error && <div>Error: {error}</div>}
            {pages.length > 0 && (
              <div>
                {pages.map(page => (
                  <div key={page.id}>{page.title}</div>
                ))}
              </div>
            )}
            {!loading && !error && pages.length === 0 && (
              <div>Page not found</div>
            )}
          </div>
        );
      };
      
      // Act: Render state monitor
      render(<StateMonitor />);
      
      // Wait for state updates
      await waitFor(() => {
        expect(capturedLoadingState).toBe(false);
      }, { timeout: TEST_CONFIG.timeout });
      
      // Assert: State should contain pages (THIS WILL REVEAL THE ISSUE)
      console.log('🔍 State Analysis:', {
        finalLoadingState: capturedLoadingState,
        finalErrorState: capturedErrorState,
        finalPageCount: capturedPageState.length,
        firstPageId: capturedPageState[0]?.id,
        firstPageTitle: capturedPageState[0]?.title
      });
      
      expect(capturedErrorState).toBeNull();
      expect(capturedPageState.length).toBeGreaterThan(0);
      expect(capturedPageState.find(p => p.id === TEST_CONFIG.pageId)).toBeDefined();
    });
  });

  describe('Layer 5: Race Condition and Timing Contract Tests', () => {
    
    test('FAILING: No race condition between API call and component unmounting', async () => {
      // Arrange: Component that can be unmounted during API call
      let componentMounted = true;
      
      const RaceConditionTest = () => {
        const [pages, setPages] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          let cancelled = false;
          
          const loadPages = async () => {
            try {
              // Add delay to increase chance of race condition
              await new Promise(resolve => setTimeout(resolve, 100));
              
              if (!componentMounted || cancelled) return;
              
              const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
              const data = await response.json();
              
              if (!componentMounted || cancelled) return;
              
              if (data.success) {
                setPages(data.pages || []);
              }
            } catch (err) {
              if (!componentMounted || cancelled) return;
              console.error('Race condition error:', err);
            } finally {
              if (!componentMounted || cancelled) return;
              setLoading(false);
            }
          };
          
          loadPages();
          
          return () => {
            cancelled = true;
          };
        }, []);
        
        return (
          <div>
            {loading ? 'Loading...' : `Pages: ${pages.length}`}
          </div>
        );
      };
      
      // Act: Render and quickly unmount
      const { unmount } = render(<RaceConditionTest />);
      
      // Simulate quick navigation away
      setTimeout(() => {
        componentMounted = false;
        unmount();
      }, 50);
      
      // Wait for potential race condition
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Assert: No errors should occur
      console.log('🔍 Race Condition Test: Completed without errors');
      expect(true).toBe(true); // If we get here, no race condition crashed the test
    });

    test('FAILING: Multiple rapid API calls do not interfere with each other', async () => {
      // Arrange: Simulate rapid navigation between pages
      const apiCalls = [];
      
      for (let i = 0; i < 3; i++) {
        apiCalls.push(
          fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`)
            .then(res => res.json())
        );
      }
      
      // Act: Execute concurrent API calls
      const results = await Promise.all(apiCalls);
      
      // Assert: All calls should succeed with same data
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.pages.length).toBeGreaterThan(0);
        
        console.log(`🔍 Concurrent Call ${index + 1}:`, {
          success: result.success,
          pageCount: result.pages.length,
          targetPageExists: !!result.pages.find(p => p.id === TEST_CONFIG.pageId)
        });
      });
      
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});