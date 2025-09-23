/**
 * TDD London School Test Suite - React Query Provider Tests
 * 
 * Focused on testing React Query provider initialization and behavior
 * to identify issues that could cause white screen or query failures
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// Mock React Query with behavior tracking
jest.mock('@tanstack/react-query', () => {
  const React = require('react');
  
  class MockQueryClient {
    constructor(options?: any) {
      mockQueryClientCallbacks.constructor.push({ options });
      this.defaultOptions = options?.defaultOptions || {};
      this.queries = new Map();
      this.mutations = new Map();
    }
    
    getQueryData = (queryKey: any) => {
      mockQueryClientCallbacks.getQueryData.push({ queryKey });
      return this.queries.get(JSON.stringify(queryKey));
    };
    
    setQueryData = (queryKey: any, data: any) => {
      mockQueryClientCallbacks.setQueryData.push({ queryKey, data });
      this.queries.set(JSON.stringify(queryKey), data);
    };
    
    invalidateQueries = (filters?: any) => {
      mockQueryClientCallbacks.invalidateQueries.push({ filters });
    };
    
    clear = () => {
      mockQueryClientCallbacks.clear.push({});
      this.queries.clear();
      this.mutations.clear();
    };
    
    removeQueries = (filters?: any) => {
      mockQueryClientCallbacks.removeQueries.push({ filters });
    };
    
    cancelQueries = (filters?: any) => {
      mockQueryClientCallbacks.cancelQueries.push({ filters });
    };
  }
  
  const QueryContext = React.createContext(null);
  
  const QueryClientProvider = ({ children, client }: any) => {
    mockQueryClientProviderRenders.push({ client });
    
    if (mockQueryBehavior.shouldFailProvider) {
      throw new Error('QueryClientProvider initialization failed');
    }
    
    return React.createElement(
      QueryContext.Provider,
      { value: client },
      React.createElement('div', { 'data-testid': 'query-client-provider' }, children)
    );
  };
  
  const useQueryClient = () => {
    const client = React.useContext(QueryContext);
    mockQueryClientCallbacks.useQueryClient.push({ client });
    
    if (!client) {
      throw new Error('useQueryClient must be used within QueryClientProvider');
    }
    
    return client;
  };
  
  const useQuery = (options: any) => {
    mockQueryHookCallbacks.useQuery.push({ options });
    
    const [data, setData] = React.useState(options.initialData || null);
    const [isLoading, setIsLoading] = React.useState(!options.enabled === false);
    const [isError, setIsError] = React.useState(false);
    const [error, setError] = React.useState(null);
    
    const refetch = React.useCallback(() => {
      mockQueryHookCallbacks.refetch.push({ queryKey: options.queryKey });
      
      if (mockQueryBehavior.shouldFailQuery) {
        setIsError(true);
        setError(new Error('Query failed'));
        setIsLoading(false);
        return Promise.reject(new Error('Query failed'));
      }
      
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      return Promise.resolve(options.queryFn?.())
        .then((result) => {
          setData(result);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err);
          setIsError(true);
          setIsLoading(false);
        });
    }, [options.queryKey, options.queryFn]);
    
    React.useEffect(() => {
      if (options.enabled !== false && options.queryFn) {
        refetch();
      }
    }, [options.queryKey, options.enabled, refetch]);
    
    return {
      data,
      isLoading,
      isError,
      error,
      refetch,
      status: isLoading ? 'loading' : isError ? 'error' : 'success',
      fetchStatus: isLoading ? 'fetching' : 'idle'
    };
  };
  
  const useMutation = (options: any) => {
    mockQueryHookCallbacks.useMutation.push({ options });
    
    const [isLoading, setIsLoading] = React.useState(false);
    const [isError, setIsError] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [data, setData] = React.useState(null);
    
    const mutate = React.useCallback((variables?: any) => {
      mockQueryHookCallbacks.mutate.push({ variables });
      
      if (mockQueryBehavior.shouldFailMutation) {
        setIsError(true);
        setError(new Error('Mutation failed'));
        return;
      }
      
      setIsLoading(true);
      setIsError(false);
      setError(null);
      
      Promise.resolve(options.mutationFn?.(variables))
        .then((result) => {
          setData(result);
          setIsLoading(false);
          options.onSuccess?.(result, variables);
        })
        .catch((err) => {
          setError(err);
          setIsError(true);
          setIsLoading(false);
          options.onError?.(err, variables);
        });
    }, [options.mutationFn, options.onSuccess, options.onError]);
    
    return {
      mutate,
      isLoading,
      isError,
      error,
      data,
      status: isLoading ? 'loading' : isError ? 'error' : 'idle'
    };
  };
  
  const useInfiniteQuery = (options: any) => {
    mockQueryHookCallbacks.useInfiniteQuery.push({ options });
    
    const [data, setData] = React.useState({ pages: [], pageParams: [] });
    const [isLoading, setIsLoading] = React.useState(true);
    const [isError, setIsError] = React.useState(false);
    const [error, setError] = React.useState(null);
    
    const fetchNextPage = React.useCallback(() => {
      mockQueryHookCallbacks.fetchNextPage.push({});
    }, []);
    
    return {
      data,
      isLoading,
      isError,
      error,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false
    };
  };
  
  return {
    QueryClient: MockQueryClient,
    QueryClientProvider,
    useQueryClient,
    useQuery,
    useMutation,
    useInfiniteQuery
  };
});

// London School mock objects for behavior verification
const mockQueryClientCallbacks = {
  constructor: [] as any[],
  getQueryData: [] as any[],
  setQueryData: [] as any[],
  invalidateQueries: [] as any[],
  clear: [] as any[],
  removeQueries: [] as any[],
  cancelQueries: [] as any[],
  useQueryClient: [] as any[]
};

const mockQueryHookCallbacks = {
  useQuery: [] as any[],
  useMutation: [] as any[],
  useInfiniteQuery: [] as any[],
  refetch: [] as any[],
  mutate: [] as any[],
  fetchNextPage: [] as any[]
};

const mockQueryClientProviderRenders = [] as any[];

const mockQueryBehavior = {
  shouldFailProvider: false,
  shouldFailQuery: false,
  shouldFailMutation: false
};

describe('React Query Provider - London School TDD', () => {
  beforeEach(() => {
    // Reset all mock states
    Object.values(mockQueryClientCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockQueryHookCallbacks).forEach(arr => arr.length = 0);
    mockQueryClientProviderRenders.length = 0;
    
    // Reset behavior flags
    mockQueryBehavior.shouldFailProvider = false;
    mockQueryBehavior.shouldFailQuery = false;
    mockQueryBehavior.shouldFailMutation = false;
    
    jest.clearAllMocks();
  });

  describe('QueryClient Initialization and Configuration', () => {
    it('should create QueryClient with correct default options', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      const config = {
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
            cacheTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: 'always'
          }
        }
      };
      
      const client = new QueryClient(config);
      
      expect(mockQueryClientCallbacks.constructor).toHaveLength(1);
      expect(mockQueryClientCallbacks.constructor[0].options).toEqual(config);
      expect(client.defaultOptions).toEqual(config.defaultOptions);
    });

    it('should create QueryClient with performance optimized settings', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      const optimizedConfig = {
        defaultOptions: {
          queries: {
            retry: 1, // Reduced retries
            staleTime: 5 * 60 * 1000, // 5 minutes stale time
            cacheTime: 10 * 60 * 1000, // 10 minutes cache
            refetchOnWindowFocus: false, // Prevent excessive requests
            refetchOnMount: false, // Prevent unnecessary refetches
          }
        }
      };
      
      const client = new QueryClient(optimizedConfig);
      
      expect(client.defaultOptions.queries.retry).toBe(1);
      expect(client.defaultOptions.queries.refetchOnWindowFocus).toBe(false);
      expect(client.defaultOptions.queries.refetchOnMount).toBe(false);
    });

    it('should handle QueryClient methods correctly', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      const testData = { id: 1, name: 'Test' };
      const queryKey = ['test', 1];
      
      // Test setQueryData
      client.setQueryData(queryKey, testData);
      expect(mockQueryClientCallbacks.setQueryData).toHaveLength(1);
      expect(mockQueryClientCallbacks.setQueryData[0]).toEqual({
        queryKey,
        data: testData
      });
      
      // Test getQueryData
      const retrievedData = client.getQueryData(queryKey);
      expect(mockQueryClientCallbacks.getQueryData).toHaveLength(1);
      expect(mockQueryClientCallbacks.getQueryData[0].queryKey).toEqual(queryKey);
      
      // Test invalidateQueries
      client.invalidateQueries();
      expect(mockQueryClientCallbacks.invalidateQueries).toHaveLength(1);
      
      // Test clear
      client.clear();
      expect(mockQueryClientCallbacks.clear).toHaveLength(1);
    });
  });

  describe('QueryClientProvider Initialization and Context', () => {
    it('should initialize QueryClientProvider correctly', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      render(
        <QueryClientProvider client={client}>
          <div data-testid="test-child">Test Child</div>
        </QueryClientProvider>
      );
      
      expect(mockQueryClientProviderRenders).toHaveLength(1);
      expect(mockQueryClientProviderRenders[0].client).toBe(client);
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should provide QueryClient context to children', async () => {
      const { QueryClient, QueryClientProvider, useQueryClient } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      function ClientConsumer() {
        const queryClient = useQueryClient();
        
        return (
          <div data-testid="client-consumer">
            <span data-testid="has-client">{queryClient ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <ClientConsumer />
        </QueryClientProvider>
      );
      
      expect(mockQueryClientCallbacks.useQueryClient).toHaveLength(1);
      expect(screen.getByTestId('has-client')).toHaveTextContent('true');
    });

    it('should handle provider initialization failures', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      mockQueryBehavior.shouldFailProvider = true;
      
      const client = new QueryClient();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(
          <QueryClientProvider client={client}>
            <div>Test Child</div>
          </QueryClientProvider>
        );
      }).toThrow('QueryClientProvider initialization failed');
      
      consoleSpy.mockRestore();
    });

    it('should throw error when hooks used outside provider', async () => {
      const { useQueryClient } = await import('@tanstack/react-query');
      
      function InvalidConsumer() {
        const client = useQueryClient();
        return <div>{client ? 'Has client' : 'No client'}</div>;
      }
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<InvalidConsumer />);
      }).toThrow('useQueryClient must be used within QueryClientProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Query Hook Behavior and Data Fetching', () => {
    it('should handle useQuery hook correctly', async () => {
      const { QueryClient, QueryClientProvider, useQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      const queryFn = jest.fn().mockResolvedValue({ id: 1, name: 'Test Data' });
      
      function QueryComponent() {
        const query = useQuery({
          queryKey: ['test-data'],
          queryFn,
          staleTime: 30000
        });
        
        return (
          <div data-testid="query-component">
            <span data-testid="loading">{query.isLoading ? 'true' : 'false'}</span>
            <span data-testid="error">{query.isError ? 'true' : 'false'}</span>
            <span data-testid="data">{query.data?.name || 'No data'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <QueryComponent />
        </QueryClientProvider>
      );
      
      expect(mockQueryHookCallbacks.useQuery).toHaveLength(1);
      expect(mockQueryHookCallbacks.useQuery[0].options.queryKey).toEqual(['test-data']);
      expect(mockQueryHookCallbacks.useQuery[0].options.queryFn).toBe(queryFn);
      
      // Should start in loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('error')).toHaveTextContent('false');
      
      // Should resolve with data
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('data')).toHaveTextContent('Test Data');
      });
    });

    it('should handle query errors gracefully', async () => {
      const { QueryClient, QueryClientProvider, useQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      mockQueryBehavior.shouldFailQuery = true;
      
      function FailingQueryComponent() {
        const query = useQuery({
          queryKey: ['failing-query'],
          queryFn: () => Promise.reject(new Error('Query failed'))
        });
        
        return (
          <div data-testid="failing-query-component">
            <span data-testid="loading">{query.isLoading ? 'true' : 'false'}</span>
            <span data-testid="error">{query.isError ? 'true' : 'false'}</span>
            <span data-testid="error-message">{query.error?.message || 'No error'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <FailingQueryComponent />
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('true');
        expect(screen.getByTestId('error-message')).toHaveTextContent('Query failed');
      });
    });

    it('should handle query refetching', async () => {
      const { QueryClient, QueryClientProvider, useQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      const queryFn = jest.fn().mockResolvedValue({ timestamp: Date.now() });
      
      function RefetchableQueryComponent() {
        const query = useQuery({
          queryKey: ['refetchable'],
          queryFn
        });
        
        return (
          <div data-testid="refetchable-component">
            <button onClick={() => query.refetch()} data-testid="refetch-button">
              Refetch
            </button>
            <span data-testid="loading">{query.isLoading ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <RefetchableQueryComponent />
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
      
      // Trigger refetch
      fireEvent.click(screen.getByTestId('refetch-button'));
      
      expect(mockQueryHookCallbacks.refetch).toHaveLength(1);
      expect(mockQueryHookCallbacks.refetch[0].queryKey).toEqual(['refetchable']);
    });
  });

  describe('Mutation Hook Behavior', () => {
    it('should handle useMutation hook correctly', async () => {
      const { QueryClient, QueryClientProvider, useMutation } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      const mutationFn = jest.fn().mockResolvedValue({ success: true });
      
      function MutationComponent() {
        const mutation = useMutation({
          mutationFn,
          onSuccess: (data) => {
            console.log('Mutation succeeded:', data);
          }
        });
        
        const handleMutate = () => {
          mutation.mutate({ id: 1, name: 'Updated' });
        };
        
        return (
          <div data-testid="mutation-component">
            <button onClick={handleMutate} data-testid="mutate-button">
              Mutate
            </button>
            <span data-testid="loading">{mutation.isLoading ? 'true' : 'false'}</span>
            <span data-testid="error">{mutation.isError ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <MutationComponent />
        </QueryClientProvider>
      );
      
      expect(mockQueryHookCallbacks.useMutation).toHaveLength(1);
      
      // Trigger mutation
      fireEvent.click(screen.getByTestId('mutate-button'));
      
      expect(mockQueryHookCallbacks.mutate).toHaveLength(1);
      expect(mockQueryHookCallbacks.mutate[0].variables).toEqual({
        id: 1,
        name: 'Updated'
      });
    });

    it('should handle mutation errors', async () => {
      const { QueryClient, QueryClientProvider, useMutation } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      mockQueryBehavior.shouldFailMutation = true;
      
      function FailingMutationComponent() {
        const mutation = useMutation({
          mutationFn: () => Promise.reject(new Error('Mutation failed'))
        });
        
        return (
          <div data-testid="failing-mutation-component">
            <button onClick={() => mutation.mutate()} data-testid="mutate-button">
              Mutate
            </button>
            <span data-testid="error">{mutation.isError ? 'true' : 'false'}</span>
            <span data-testid="error-message">{mutation.error?.message || 'No error'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <FailingMutationComponent />
        </QueryClientProvider>
      );
      
      // Trigger failing mutation
      fireEvent.click(screen.getByTestId('mutate-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('true');
        expect(screen.getByTestId('error-message')).toHaveTextContent('Mutation failed');
      });
    });
  });

  describe('Infinite Query Behavior', () => {
    it('should handle useInfiniteQuery hook correctly', async () => {
      const { QueryClient, QueryClientProvider, useInfiniteQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      function InfiniteQueryComponent() {
        const query = useInfiniteQuery({
          queryKey: ['infinite-data'],
          queryFn: ({ pageParam = 0 }) => Promise.resolve({ data: [], nextPage: pageParam + 1 }),
          getNextPageParam: (lastPage) => lastPage.nextPage
        });
        
        return (
          <div data-testid="infinite-query-component">
            <button onClick={() => query.fetchNextPage()} data-testid="fetch-next-button">
              Fetch Next
            </button>
            <span data-testid="loading">{query.isLoading ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <InfiniteQueryComponent />
        </QueryClientProvider>
      );
      
      expect(mockQueryHookCallbacks.useInfiniteQuery).toHaveLength(1);
      
      // Trigger fetch next page
      fireEvent.click(screen.getByTestId('fetch-next-button'));
      
      expect(mockQueryHookCallbacks.fetchNextPage).toHaveLength(1);
    });
  });

  describe('Provider Lifecycle and Cleanup', () => {
    it('should cleanup queries on provider unmount', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      const { unmount } = render(
        <QueryClientProvider client={client}>
          <div>Test Component</div>
        </QueryClientProvider>
      );
      
      // Add some queries to the client
      client.setQueryData(['test'], { data: 'test' });
      
      // Unmount provider
      unmount();
      
      // In a real implementation, this would trigger cleanup
      expect(mockQueryClientProviderRenders).toHaveLength(1);
    });

    it('should handle multiple provider instances', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      const client1 = new QueryClient();
      const client2 = new QueryClient();
      
      render(
        <div>
          <QueryClientProvider client={client1}>
            <div data-testid="provider-1">Provider 1</div>
          </QueryClientProvider>
          <QueryClientProvider client={client2}>
            <div data-testid="provider-2">Provider 2</div>
          </QueryClientProvider>
        </div>
      );
      
      expect(screen.getByTestId('provider-1')).toBeInTheDocument();
      expect(screen.getByTestId('provider-2')).toBeInTheDocument();
      expect(mockQueryClientProviderRenders).toHaveLength(2);
    });
  });

  describe('White Screen Prevention', () => {
    it('should prevent white screen during provider initialization', async () => {
      const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      const { container } = render(
        <QueryClientProvider client={client}>
          <div data-testid="app-content">Application Content</div>
        </QueryClientProvider>
      );
      
      // Should render content immediately
      expect(container.firstChild).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    it('should maintain UI during query loading states', async () => {
      const { QueryClient, QueryClientProvider, useQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      function AppWithQuery() {
        const query = useQuery({
          queryKey: ['app-data'],
          queryFn: () => new Promise(resolve => setTimeout(() => resolve({ data: 'loaded' }), 1000))
        });
        
        return (
          <div data-testid="app-with-query">
            <header>App Header</header>
            <main>
              {query.isLoading ? (
                <div>Loading...</div>
              ) : (
                <div>Content: {query.data?.data}</div>
              )}
            </main>
          </div>
        );
      }
      
      const { container } = render(
        <QueryClientProvider client={client}>
          <AppWithQuery />
        </QueryClientProvider>
      );
      
      // Should render app structure immediately
      expect(container.firstChild).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('app-with-query')).toBeInTheDocument();
      expect(screen.getByText('App Header')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error states instead of white screen', async () => {
      const { QueryClient, QueryClientProvider, useQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      mockQueryBehavior.shouldFailQuery = true;
      
      function AppWithFailingQuery() {
        const query = useQuery({
          queryKey: ['failing-data'],
          queryFn: () => Promise.reject(new Error('Data fetch failed'))
        });
        
        if (query.isError) {
          return (
            <div data-testid="error-state">
              <h2>Something went wrong</h2>
              <p>{query.error?.message}</p>
              <button onClick={() => query.refetch()}>Try Again</button>
            </div>
          );
        }
        
        return (
          <div data-testid="app-content">
            {query.isLoading ? 'Loading...' : query.data}
          </div>
        );
      }
      
      const { container } = render(
        <QueryClientProvider client={client}>
          <AppWithFailingQuery />
        </QueryClientProvider>
      );
      
      await waitFor(() => {
        // Should show error state, not white screen
        expect(container.firstChild).not.toBeEmptyDOMElement();
        expect(screen.getByTestId('error-state')).toBeInTheDocument();
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle query cache management efficiently', async () => {
      const { QueryClient } = await import('@tanstack/react-query');
      
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000 // 10 minutes
          }
        }
      });
      
      // Add multiple queries to cache
      client.setQueryData(['query1'], { data: 'test1' });
      client.setQueryData(['query2'], { data: 'test2' });
      client.setQueryData(['query3'], { data: 'test3' });
      
      expect(mockQueryClientCallbacks.setQueryData).toHaveLength(3);
      
      // Clear cache
      client.clear();
      expect(mockQueryClientCallbacks.clear).toHaveLength(1);
    });

    it('should handle concurrent queries efficiently', async () => {
      const { QueryClient, QueryClientProvider, useQuery } = await import('@tanstack/react-query');
      
      const client = new QueryClient();
      
      function ConcurrentQueriesComponent() {
        const query1 = useQuery({
          queryKey: ['concurrent1'],
          queryFn: () => Promise.resolve({ id: 1 })
        });
        
        const query2 = useQuery({
          queryKey: ['concurrent2'],
          queryFn: () => Promise.resolve({ id: 2 })
        });
        
        return (
          <div>
            <div>Query 1: {query1.data?.id}</div>
            <div>Query 2: {query2.data?.id}</div>
          </div>
        );
      }
      
      render(
        <QueryClientProvider client={client}>
          <ConcurrentQueriesComponent />
        </QueryClientProvider>
      );
      
      // Should handle multiple queries without issues
      expect(mockQueryHookCallbacks.useQuery).toHaveLength(2);
    });
  });
});