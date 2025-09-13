/**
 * Agent Data Readiness Service
 * Provides standardized data readiness API for agents
 * Ensures no mock data is ever served
 */

class AgentDataReadinessService {
  constructor() {
    this.registeredAgents = new Map();
    this.dataProviders = new Map();
  }

  /**
   * Register an agent with its data provider function
   * @param {string} agentId - Unique agent identifier
   * @param {Function} dataProvider - Function that returns agent data
   * @param {Object} options - Additional configuration
   */
  registerAgent(agentId, dataProvider, options = {}) {
    if (!agentId || typeof agentId !== 'string') {
      throw new Error('Agent ID must be a non-empty string');
    }

    if (!dataProvider || typeof dataProvider !== 'function') {
      throw new Error('Data provider must be a function');
    }

    this.registeredAgents.set(agentId, {
      id: agentId,
      dataProvider,
      options: {
        timeout: options.timeout || 5000,
        retries: options.retries || 0,
        ...options
      },
      lastCheck: null,
      lastStatus: null
    });

    console.log(`[AgentDataService] Registered agent: ${agentId}`);
  }

  /**
   * Get data readiness status for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object>} Data readiness response
   */
  async getDataReadiness(agentId) {
    const agent = this.registeredAgents.get(agentId);
    
    if (!agent) {
      return {
        hasData: false,
        data: null,
        message: `Agent '${agentId}' not found or not registered`
      };
    }

    try {
      // Execute data provider with timeout
      const result = await this.executeWithTimeout(
        agent.dataProvider,
        agent.options.timeout
      );

      // Update agent status
      agent.lastCheck = new Date().toISOString();
      agent.lastStatus = 'success';

      // Validate and format response
      return this.formatDataResponse(result);

    } catch (error) {
      console.error(`[AgentDataService] Error checking data for ${agentId}:`, error.message);
      
      agent.lastCheck = new Date().toISOString();
      agent.lastStatus = 'error';

      return {
        hasData: false,
        data: null,
        message: `Failed to check data readiness: ${error.message}`
      };
    }
  }

  /**
   * Execute function with timeout
   * @param {Function} fn - Function to execute
   * @param {number} timeout - Timeout in milliseconds
   */
  async executeWithTimeout(fn, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  /**
   * Format and validate data response
   * @param {*} result - Raw result from data provider
   * @returns {Object} Formatted response
   */
  formatDataResponse(result) {
    // Handle null/undefined
    if (result === null || result === undefined) {
      return {
        hasData: false,
        data: null,
        message: 'No data available'
      };
    }

    // Handle boolean result
    if (typeof result === 'boolean') {
      return {
        hasData: result,
        data: null,
        message: result ? 'Data is available' : 'No data available'
      };
    }

    // Handle object with explicit structure
    if (typeof result === 'object' && result.hasData !== undefined) {
      return {
        hasData: Boolean(result.hasData),
        data: result.data || null,
        message: result.message || (result.hasData ? 'Data available' : 'No data available')
      };
    }

    // Handle arrays
    if (Array.isArray(result)) {
      const hasData = result.length > 0;
      return {
        hasData,
        data: hasData ? result : null,
        message: hasData ? `${result.length} items available` : 'No data available'
      };
    }

    // Handle other objects
    if (typeof result === 'object') {
      const keys = Object.keys(result);
      const hasData = keys.length > 0;
      return {
        hasData,
        data: hasData ? result : null,
        message: hasData ? `Data available with ${keys.length} properties` : 'No data available'
      };
    }

    // Handle primitive values
    const hasData = result !== '' && result !== 0;
    return {
      hasData,
      data: hasData ? result : null,
      message: hasData ? 'Data available' : 'No data available'
    };
  }

  /**
   * Get list of all registered agents
   * @returns {Array} List of agent information
   */
  getRegisteredAgents() {
    return Array.from(this.registeredAgents.values()).map(agent => ({
      id: agent.id,
      lastCheck: agent.lastCheck,
      lastStatus: agent.lastStatus,
      options: agent.options
    }));
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent identifier
   */
  unregisterAgent(agentId) {
    const removed = this.registeredAgents.delete(agentId);
    if (removed) {
      console.log(`[AgentDataService] Unregistered agent: ${agentId}`);
    }
    return removed;
  }

  /**
   * Health check for all registered agents
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const agents = Array.from(this.registeredAgents.keys());
    const results = {};

    for (const agentId of agents) {
      try {
        const status = await this.getDataReadiness(agentId);
        results[agentId] = {
          healthy: true,
          hasData: status.hasData,
          message: status.message
        };
      } catch (error) {
        results[agentId] = {
          healthy: false,
          hasData: false,
          message: error.message
        };
      }
    }

    return {
      totalAgents: agents.length,
      healthyAgents: Object.values(results).filter(r => r.healthy).length,
      agents: results,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const agentDataService = new AgentDataReadinessService();

export default agentDataService;