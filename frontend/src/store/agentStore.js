/**
 * Simple Agent Store
 * Lightweight state management for agents without Redux
 */

class AgentStore {
  constructor() {
    this.subscribers = new Set();
    this.state = {
      agents: [],
      statuses: {},
      metrics: null,
      categories: [],
      loading: false,
      error: null,
      filters: {
        category: '',
        status: '',
        sortBy: 'name'
      },
      searchQuery: '',
      lastUpdate: null
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  notify() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error in store subscriber:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state
   */
  setState(updates) {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: new Date()
    };
    this.notify();
  }

  /**
   * Set agents
   */
  setAgents(agents) {
    this.setState({
      agents: agents || [],
      loading: false,
      error: null
    });
  }

  /**
   * Set agent statuses
   */
  setAgentStatuses(statuses) {
    this.setState({
      statuses: statuses || {}
    });
  }

  /**
   * Update single agent status
   */
  updateAgentStatus(agentId, status) {
    this.setState({
      statuses: {
        ...this.state.statuses,
        [agentId]: status
      }
    });
  }

  /**
   * Set metrics
   */
  setMetrics(metrics) {
    this.setState({
      metrics: metrics
    });
  }

  /**
   * Set categories
   */
  setCategories(categories) {
    this.setState({
      categories: categories || []
    });
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.setState({
      loading: !!loading
    });
  }

  /**
   * Set error state
   */
  setError(error) {
    this.setState({
      error: error,
      loading: false
    });
  }

  /**
   * Clear error
   */
  clearError() {
    this.setState({
      error: null
    });
  }

  /**
   * Update filters
   */
  updateFilters(filterUpdates) {
    this.setState({
      filters: {
        ...this.state.filters,
        ...filterUpdates
      }
    });
  }

  /**
   * Set search query
   */
  setSearchQuery(query) {
    this.setState({
      searchQuery: query || ''
    });
  }

  /**
   * Reset filters
   */
  resetFilters() {
    this.setState({
      filters: {
        category: '',
        status: '',
        sortBy: 'name'
      },
      searchQuery: ''
    });
  }

  /**
   * Get filtered agents
   */
  getFilteredAgents() {
    let { agents, filters, searchQuery } = this.state;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      agents = agents.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.category.toLowerCase().includes(query) ||
        (agent.tags && agent.tags.some(tag => 
          tag.toLowerCase().includes(query)
        ))
      );
    }

    // Apply category filter
    if (filters.category) {
      agents = agents.filter(agent => agent.category === filters.category);
    }

    // Apply status filter
    if (filters.status) {
      const { statuses } = this.state;
      agents = agents.filter(agent => {
        const status = statuses[agent.id];
        return status?.status === filters.status;
      });
    }

    // Apply sorting
    agents = [...agents].sort((a, b) => {
      const { statuses } = this.state;
      
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        
        case 'status':
          const aStatus = statuses[a.id]?.status || 'inactive';
          const bStatus = statuses[b.id]?.status || 'inactive';
          if (aStatus !== bStatus) {
            return aStatus === 'active' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        
        case 'category':
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        
        case 'size':
          return (b.size || 0) - (a.size || 0);
        
        default:
          return 0;
      }
    });

    return agents;
  }

  /**
   * Get agent by ID
   */
  getAgent(id) {
    return this.state.agents.find(agent => agent.id === id);
  }

  /**
   * Get agent status by ID
   */
  getAgentStatus(id) {
    return this.state.statuses[id];
  }

  /**
   * Get active agents count
   */
  getActiveAgentsCount() {
    return this.state.agents.filter(agent => {
      const status = this.state.statuses[agent.id];
      return status?.status === 'active';
    }).length;
  }

  /**
   * Get status distribution
   */
  getStatusDistribution() {
    const distribution = { active: 0, inactive: 0, error: 0 };
    
    this.state.agents.forEach(agent => {
      const status = this.state.statuses[agent.id]?.status || 'inactive';
      distribution[status] = (distribution[status] || 0) + 1;
    });
    
    return {
      ...distribution,
      total: this.state.agents.length
    };
  }
}

// Create singleton instance
export const agentStore = new AgentStore();

/**
 * React Hook for using the agent store
 */
import { useState, useEffect } from 'react';

export function useAgentStore() {
  const [state, setState] = useState(agentStore.getState());

  useEffect(() => {
    const unsubscribe = agentStore.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    // State
    ...state,
    
    // Derived state
    filteredAgents: agentStore.getFilteredAgents(),
    activeAgentsCount: agentStore.getActiveAgentsCount(),
    statusDistribution: agentStore.getStatusDistribution(),
    
    // Actions
    setAgents: agentStore.setAgents.bind(agentStore),
    setAgentStatuses: agentStore.setAgentStatuses.bind(agentStore),
    updateAgentStatus: agentStore.updateAgentStatus.bind(agentStore),
    setMetrics: agentStore.setMetrics.bind(agentStore),
    setCategories: agentStore.setCategories.bind(agentStore),
    setLoading: agentStore.setLoading.bind(agentStore),
    setError: agentStore.setError.bind(agentStore),
    clearError: agentStore.clearError.bind(agentStore),
    updateFilters: agentStore.updateFilters.bind(agentStore),
    setSearchQuery: agentStore.setSearchQuery.bind(agentStore),
    resetFilters: agentStore.resetFilters.bind(agentStore),
    getAgent: agentStore.getAgent.bind(agentStore),
    getAgentStatus: agentStore.getAgentStatus.bind(agentStore)
  };
}

export default agentStore;