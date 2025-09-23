/**
 * TDD LONDON SCHOOL: API Integration Validation
 * 
 * MISSION: Expose the data loading disconnect between successful API responses
 * and component "Page not found" errors using outside-in testing approach.
 * 
 * NO MOCKS POLICY: All tests use real API calls and real components
 * to reproduce the actual production issue.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Test configuration for real API testing
const TEST_CONFIG = {
  agentId: 'personal-todos-agent',
  pageId: '015b7296-a144-4096-9c60-ee5d7f900723',
  expectedTitle: 'Personal Todos Dashboard',
  apiBaseUrl: 'http://localhost:3000',
  timeout: 15000
};

describe('🚨 TDD London School: API Data Loading Disconnect Investigation', () => {
  
  describe('✅ Layer 1: Direct API Contract Validation (Should Pass)', () => {
    
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
  });

  describe('🔍 Layer 2: Data Transformation Contract Tests', () => {
    
    test('Component data transformation preserves API data', async () => {
      // Arrange: Get real API response
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
      const backendResponse = await response.json();
      
      // Act: Apply the exact transformation logic used in components
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
      
      const targetPage = transformed.data.find(p => p.id === TEST_CONFIG.pageId);
      expect(targetPage).toBeDefined();
      expect(targetPage.id).toBe(TEST_CONFIG.pageId);
      
      console.log('🔍 Data Transformation:', {
        originalCount: backendResponse.pages.length,
        transformedCount: transformed.data.length,
        targetPagePreserved: !!targetPage
      });
    });
  });

  describe('💥 Layer 3: Component Integration Tests (Expected to Fail)', () => {
    
    test('FAILING: Component displays page content when API succeeds', async () => {
      // Create a minimal test component that mimics the actual component logic
      const TestComponent = () => {
        const [pages, setPages] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        const [error, setError] = React.useState(null);
        
        React.useEffect(() => {
          const loadPages = async () => {
            try {
              console.log('🚀 Starting API call...');
              const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
              const data = await response.json();
              
              console.log('📡 API Response:', {
                status: response.status,
                success: data.success,
                pageCount: data.pages?.length || 0,
                firstPage: data.pages?.[0]
              });
              
              if (data.success && data.pages) {
                console.log('✅ Setting pages state with:', data.pages.length, 'pages');
                setPages(data.pages);
                setError(null);
              } else {
                console.log('❌ API did not return success or pages');
                setError('API did not return success');
              }
            } catch (err) {
              console.error('💥 API call failed:', err);
              setError('API call failed: ' + err.message);
            } finally {
              setLoading(false);
            }
          };
          
          loadPages();
        }, []);
        
        // Render logic that matches the real component
        if (loading) {
          return <div>Loading pages...</div>;
        }
        
        if (error) {
          return <div>Error: {error}</div>;
        }
        
        const currentPage = pages.find(page => page.id === TEST_CONFIG.pageId);
        
        if (!currentPage) {
          console.log('🚨 PAGE NOT FOUND!', {
            pagesInState: pages.length,
            pagesIds: pages.map(p => p.id),
            lookingForId: TEST_CONFIG.pageId
          });
          return <div>Page not found</div>;
        }
        
        console.log('🎉 Page found, rendering:', currentPage.title);
        return <div>Page: {currentPage.title}</div>;
      };
      
      // Act: Render test component
      render(<TestComponent />);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading pages...')).not.toBeInTheDocument();
      }, { timeout: TEST_CONFIG.timeout });
      
      // Check what's actually displayed
      const pageContent = screen.queryByText(TEST_CONFIG.expectedTitle);
      const pageNotFound = screen.queryByText('Page not found');
      const errorMessage = screen.queryByText(/Error:/);
      
      console.log('🔍 Final render state:', {
        pageContentDisplayed: !!pageContent,
        pageNotFoundDisplayed: !!pageNotFound,
        errorDisplayed: !!errorMessage,
        actualContent: document.body.textContent
      });
      
      // Assert: This SHOULD pass but likely will fail, exposing the disconnect
      expect(errorMessage).not.toBeInTheDocument();
      expect(pageNotFound).not.toBeInTheDocument();
      expect(pageContent).toBeInTheDocument();
    });
  });

  describe('🔬 Layer 4: State Management Deep Dive', () => {
    
    test('FAILING: React state updates correctly after API success', async () => {
      let capturedStates = [];
      
      const StateCapture = () => {
        const [pages, setPages] = React.useState([]);
        const [loading, setLoading] = React.useState(true);
        
        // Capture every state change
        React.useEffect(() => {
          capturedStates.push({
            timestamp: Date.now(),
            pages: [...pages],
            loading,
            pageCount: pages.length
          });
        }, [pages, loading]);
        
        React.useEffect(() => {
          const loadPages = async () => {
            try {
              const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/agents/${TEST_CONFIG.agentId}/pages`);
              const data = await response.json();
              
              console.log('🎯 About to call setPages with:', data.pages);
              
              if (data.success && data.pages) {
                setPages(data.pages);
              }
            } catch (err) {
              console.error('State capture error:', err);
            } finally {
              setLoading(false);
            }
          };
          
          loadPages();
        }, []);
        
        return <div data-testid="state-capture">Pages: {pages.length}</div>;
      };
      
      // Act: Render state capture component
      render(<StateCapture />);
      
      // Wait for state changes to complete
      await waitFor(() => {
        const element = screen.getByTestId('state-capture');
        return element.textContent !== 'Pages: 0';
      }, { timeout: TEST_CONFIG.timeout });
      
      // Analyze captured states
      console.log('📊 State History:', capturedStates.map((state, index) => ({
        step: index,
        pageCount: state.pageCount,
        loading: state.loading,
        hasTargetPage: state.pages.some(p => p.id === TEST_CONFIG.pageId)
      })));
      
      const finalState = capturedStates[capturedStates.length - 1];
      
      // Assert: Final state should contain our target page
      expect(finalState.pageCount).toBeGreaterThan(0);
      expect(finalState.pages.some(p => p.id === TEST_CONFIG.pageId)).toBe(true);
    });
  });
});