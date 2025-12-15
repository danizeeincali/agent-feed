/**
 * Agent Markdown Parser Service
 * 
 * Parses agent markdown files and extracts YAML frontmatter configuration,
 * with special handling for page_config data used by the frontend routing system.
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

class AgentMarkdownParserService {
  constructor() {
    this.agentsDirectory = process.env.AGENTS_DIR || path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'prod/.claude/agents');
    this.configCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = new Map();
  }

  /**
   * Parse a single agent markdown file
   * @param {string} filePath - Path to the markdown file
   * @returns {Promise<Object>} Parsed agent configuration
   */
  async parseAgentFile(filePath) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(fileContent);
      
      const config = {
        // Basic agent info from frontmatter
        name: parsed.data.name || null,
        description: parsed.data.description || null,
        tools: parsed.data.tools || [],
        model: parsed.data.model || 'sonnet',
        color: parsed.data.color || '#374151',
        proactive: parsed.data.proactive || false,
        priority: parsed.data.priority || 'P3',
        usage: parsed.data.usage || null,
        
        // Page configuration for frontend routing
        page_config: parsed.data.page_config || null,
        
        // Content and metadata
        content: parsed.content,
        filePath: filePath,
        fileName: path.basename(filePath),
        lastModified: null
      };

      // Get file stats for lastModified
      try {
        const stats = await fs.stat(filePath);
        config.lastModified = stats.mtime;
      } catch (error) {
        console.warn(`Could not get file stats for ${filePath}:`, error.message);
      }

      return config;
    } catch (error) {
      console.error(`Error parsing agent file ${filePath}:`, error.message);
      throw new Error(`Failed to parse agent markdown file: ${error.message}`);
    }
  }

  /**
   * Get all agent configurations from the agents directory
   * @param {boolean} useCache - Whether to use cached results
   * @returns {Promise<Object>} Map of agent name to configuration
   */
  async getAllAgentConfigs(useCache = true) {
    try {
      const now = Date.now();
      
      // Check if we have a valid cache
      if (useCache && this.configCache.size > 0) {
        const lastUpdate = this.lastCacheUpdate.get('all') || 0;
        if (now - lastUpdate < this.cacheTimeout) {
          return Object.fromEntries(this.configCache);
        }
      }

      // Read all markdown files from agents directory
      const files = await fs.readdir(this.agentsDirectory);
      const markdownFiles = files.filter(file => file.endsWith('.md'));
      
      const configs = new Map();
      
      // Parse each agent file
      await Promise.all(markdownFiles.map(async (file) => {
        try {
          const filePath = path.join(this.agentsDirectory, file);
          const config = await this.parseAgentFile(filePath);
          
          if (config.name) {
            configs.set(config.name, config);
          } else {
            console.warn(`Agent file ${file} has no name in frontmatter`);
          }
        } catch (error) {
          console.error(`Error processing agent file ${file}:`, error.message);
        }
      }));

      // Update cache
      this.configCache = configs;
      this.lastCacheUpdate.set('all', now);
      
      return Object.fromEntries(configs);
    } catch (error) {
      console.error('Error reading agents directory:', error.message);
      throw new Error(`Failed to read agent configurations: ${error.message}`);
    }
  }

  /**
   * Get a specific agent's configuration
   * @param {string} agentName - Name of the agent
   * @param {boolean} useCache - Whether to use cached results
   * @returns {Promise<Object|null>} Agent configuration or null if not found
   */
  async getAgentConfig(agentName, useCache = true) {
    try {
      const allConfigs = await this.getAllAgentConfigs(useCache);
      return allConfigs[agentName] || null;
    } catch (error) {
      console.error(`Error getting config for agent ${agentName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all agents that have page_config defined
   * @param {boolean} useCache - Whether to use cached results
   * @returns {Promise<Object>} Map of agent name to page configuration
   */
  async getAgentsWithPageConfigs(useCache = true) {
    try {
      const allConfigs = await this.getAllAgentConfigs(useCache);
      const agentsWithPages = {};
      
      Object.entries(allConfigs).forEach(([name, config]) => {
        if (config.page_config) {
          agentsWithPages[name] = {
            name: config.name,
            page_config: config.page_config,
            description: config.description,
            color: config.color,
            lastModified: config.lastModified
          };
        }
      });
      
      return agentsWithPages;
    } catch (error) {
      console.error('Error getting agents with page configs:', error.message);
      throw error;
    }
  }

  /**
   * Extract page routing information for frontend
   * @param {boolean} useCache - Whether to use cached results
   * @returns {Promise<Array>} Array of page route configurations
   */
  async getPageRoutes(useCache = true) {
    try {
      const agentsWithPages = await this.getAgentsWithPageConfigs(useCache);
      const routes = [];
      
      Object.entries(agentsWithPages).forEach(([name, config]) => {
        if (config.page_config) {
          const pageConfig = config.page_config;
          routes.push({
            agentName: name,
            route: pageConfig.route || `/agents/${name}`,
            component: pageConfig.component || 'DefaultAgentPage',
            dataEndpoint: pageConfig.data_endpoint || `/api/agents/${name}/data`,
            title: pageConfig.title || config.description || name,
            description: config.description,
            color: config.color,
            lastModified: config.lastModified
          });
        }
      });
      
      return routes.sort((a, b) => a.route.localeCompare(b.route));
    } catch (error) {
      console.error('Error extracting page routes:', error.message);
      throw error;
    }
  }

  /**
   * Get summary statistics about agent configurations
   * @param {boolean} useCache - Whether to use cached results
   * @returns {Promise<Object>} Statistics object
   */
  async getStats(useCache = true) {
    try {
      const allConfigs = await this.getAllAgentConfigs(useCache);
      const agentsWithPages = await this.getAgentsWithPageConfigs(useCache);
      
      const stats = {
        totalAgents: Object.keys(allConfigs).length,
        agentsWithPageConfigs: Object.keys(agentsWithPages).length,
        agentsWithoutPageConfigs: Object.keys(allConfigs).length - Object.keys(agentsWithPages).length,
        modelDistribution: {},
        priorityDistribution: {},
        proactiveCount: 0,
        totalTools: new Set()
      };
      
      Object.values(allConfigs).forEach(config => {
        // Model distribution
        stats.modelDistribution[config.model] = (stats.modelDistribution[config.model] || 0) + 1;
        
        // Priority distribution
        stats.priorityDistribution[config.priority] = (stats.priorityDistribution[config.priority] || 0) + 1;
        
        // Proactive count
        if (config.proactive) {
          stats.proactiveCount++;
        }
        
        // Unique tools
        config.tools.forEach(tool => stats.totalTools.add(tool));
      });
      
      stats.uniqueToolsCount = stats.totalTools.size;
      stats.totalTools = Array.from(stats.totalTools).sort();
      
      return stats;
    } catch (error) {
      console.error('Error generating agent stats:', error.message);
      throw error;
    }
  }

  /**
   * Clear the configuration cache
   */
  clearCache() {
    this.configCache.clear();
    this.lastCacheUpdate.clear();
  }

  /**
   * Check if agents directory exists and is readable
   * @returns {Promise<boolean>} Whether the directory is accessible
   */
  async checkDirectoryAccess() {
    try {
      await fs.access(this.agentsDirectory, fs.constants.R_OK);
      return true;
    } catch (error) {
      console.error(`Cannot access agents directory ${this.agentsDirectory}:`, error.message);
      return false;
    }
  }
}

export default AgentMarkdownParserService;