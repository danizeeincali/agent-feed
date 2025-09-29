/**
 * Frontend Agent API Client Service
 * Handles all API calls related to agents, including WebSocket connections
 */

import axios from 'axios';

// Use relative URL to leverage Vite proxy - this will automatically route to the API server
const API_BASE_URL = '/api/agents';

class AgentApiService {
  constructor() {
    this.wsConnection = null;
    this.wsEventHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Create axios instance with common configuration
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add request/response interceptors for error handling
    this.setupInterceptors();
  }

  setupInterceptors() {
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const message = error.response?.data?.message || error.message;
        console.error(`❌ API Error: ${error.response?.status} ${message}`);
        return Promise.reject({
          ...error,
          message: message,
          status: error.response?.status
        });
      }
    );
  }

  /**
   * Get all agents with optional filtering
   */
  async getAgents(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      
      const response = await this.apiClient.get(`/?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError('Failed to fetch agents', error);
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(id) {
    try {
      const response = await this.apiClient.get(`/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(`Failed to fetch agent ${id}`, error);
    }
  }

  /**
   * Get agent status
   */
  async getAgentStatus(id) {
    try {
      const response = await this.apiClient.get(`/${id}/status`);
      return response.data;
    } catch (error) {
      throw this.handleError(`Failed to fetch agent status for ${id}`, error);
    }
  }

  /**
   * Get all agent statuses
   */
  async getAllAgentStatuses() {
    try {
      const response = await this.apiClient.get('/status/all');
      return response.data;
    } catch (error) {
      throw this.handleError('Failed to fetch all agent statuses', error);
    }
  }

  /**
   * Get agent metrics
   */
  async getAgentMetrics() {
    try {
      const response = await this.apiClient.get('/metrics');
      return response.data;
    } catch (error) {
      throw this.handleError('Failed to fetch agent metrics', error);
    }
  }

  /**
   * Get agent categories
   */
  async getAgentCategories() {
    try {
      const response = await this.apiClient.get('/categories');
      return response.data;
    } catch (error) {
      throw this.handleError('Failed to fetch agent categories', error);
    }
  }

  /**
   * Trigger agent discovery scan
   */
  async scanAgents() {
    try {
      const response = await this.apiClient.post('/scan');
      return response.data;
    } catch (error) {
      throw this.handleError('Failed to scan agents', error);
    }
  }

  /**
   * Get agent files
   */
  async getAgentFiles(id) {
    try {
      const response = await this.apiClient.get(`/${id}/files`);
      return response.data;
    } catch (error) {
      throw this.handleError(`Failed to fetch agent files for ${id}`, error);
    }
  }

  /**
   * Search agents
   */
  async searchAgents(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        q: query
      });
      
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      
      const response = await this.apiClient.get(`/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(`Failed to search agents with query: ${query}`, error);
    }
  }

  /**
   * Check agent service health
   */
  async checkHealth() {
    try {
      const response = await this.apiClient.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError('Failed to check agent service health', error);
    }
  }

  /**
   * WebSocket Connection Management
   */
  
  /**
   * Connect to agent status WebSocket
   */
  connectToAgentStatus() {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      console.log('🔄 WebSocket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Use relative WebSocket URL to leverage Vite proxy
        const wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
                      '//' + window.location.host + '/terminal';
        console.log(`🔗 Connecting to agent status WebSocket: ${wsUrl}`);
        
        this.wsConnection = new WebSocket(wsUrl);

        this.wsConnection.onopen = () => {
          console.log('✅ Agent status WebSocket connected');
          this.reconnectAttempts = 0;
          
          // Subscribe to agent status updates
          this.wsConnection.send(JSON.stringify({
            type: 'subscribe_agent_status'
          }));
          
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.wsConnection.onclose = (event) => {
          console.log(`🔌 Agent status WebSocket closed: ${event.code} ${event.reason}`);
          this.handleWebSocketReconnect();
        };

        this.wsConnection.onerror = (error) => {
          console.error('❌ Agent status WebSocket error:', error);
          reject(error);
        };
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from agent status WebSocket
   */
  disconnectFromAgentStatus() {
    if (this.wsConnection) {
      console.log('🔌 Disconnecting from agent status WebSocket');
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  handleWebSocketReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connectToAgentStatus().catch(error => {
          console.error('❌ WebSocket reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
      this.emit('connection-failed');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleWebSocketMessage(data) {
    console.log('📨 WebSocket message received:', data.type);
    
    switch (data.type) {
      case 'agents-initial':
        this.emit('agents-loaded', {
          agents: data.agents,
          statuses: data.statuses
        });
        break;
        
      case 'agents-update':
        this.emit('agents-updated', data.agents);
        break;
        
      case 'agent-status':
        this.emit('agent-status-updated', {
          agentId: data.agentId,
          status: data.status
        });
        break;
        
      default:
        console.log('🤔 Unknown WebSocket message type:', data.type);
    }
  }

  /**
   * WebSocket Event Handling
   */
  
  /**
   * Add event listener
   */
  on(event, handler) {
    if (!this.wsEventHandlers.has(event)) {
      this.wsEventHandlers.set(event, new Set());
    }
    this.wsEventHandlers.get(event).add(handler);
  }

  /**
   * Remove event listener
   */
  off(event, handler) {
    if (this.wsEventHandlers.has(event)) {
      this.wsEventHandlers.get(event).delete(handler);
    }
  }

  /**
   * Emit event to handlers
   */
  emit(event, data) {
    if (this.wsEventHandlers.has(event)) {
      this.wsEventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Error handling utility
   */
  handleError(message, error) {
    const errorDetails = {
      message: message,
      originalError: error.message,
      status: error.status,
      timestamp: new Date().toISOString()
    };
    
    console.error('❌ Agent API Error:', errorDetails);
    return errorDetails;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.disconnectFromAgentStatus();
    this.wsEventHandlers.clear();
  }
}

// Create and export singleton instance
export const agentApi = new AgentApiService();
export default agentApi;