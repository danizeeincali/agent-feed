/**
 * Agent File Service
 * Reads and parses agent markdown files from the .claude directory
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

class AgentFileService {
  constructor() {
    this.agentsPath = path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'prod', '.claude', 'agents');
    this.cache = new Map();
    this.lastScan = null;
    this.scanInterval = 30000; // 30 seconds
  }

  /**
   * Get all agent files from the .claude/agents directory
   */
  async getAgentsFromFiles() {
    try {
      // Check if cache is still valid
      if (this.lastScan && Date.now() - this.lastScan < this.scanInterval && this.cache.size > 0) {
        return Array.from(this.cache.values());
      }

      const agents = await this.scanAgentFiles();
      this.lastScan = Date.now();
      
      console.log(`✅ Loaded ${agents.length} agents from markdown files`);
      return agents;
    } catch (error) {
      console.error('❌ Error reading agent files:', error);
      throw new Error(`Failed to read agent files: ${error.message}`);
    }
  }

  /**
   * Scan and parse all agent markdown files
   */
  async scanAgentFiles() {
    const agents = [];
    this.cache.clear();

    // Check if agents directory exists
    if (!fs.existsSync(this.agentsPath)) {
      console.warn(`⚠️ Agents directory not found: ${this.agentsPath}`);
      return agents;
    }

    const files = fs.readdirSync(this.agentsPath)
      .filter(file => file.endsWith('.md'))
      .sort();

    console.log(`📁 Found ${files.length} agent files in ${this.agentsPath}`);

    for (const file of files) {
      try {
        const agent = await this.parseAgentFile(file);
        if (agent) {
          agents.push(agent);
          this.cache.set(agent.id, agent);
        }
      } catch (error) {
        console.error(`❌ Error parsing agent file ${file}:`, error);
      }
    }

    return agents;
  }

  /**
   * Parse individual agent markdown file
   */
  async parseAgentFile(filename) {
    const filePath = path.join(this.agentsPath, filename);
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content } = matter(fileContent);

      // Extract agent ID from filename (remove .md extension)
      const id = filename.replace('.md', '');

      // Parse frontmatter and create agent object
      const agent = {
        id: id,
        name: frontmatter.name || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        display_name: frontmatter.displayName || frontmatter.name || id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: frontmatter.description || 'No description available',
        system_prompt: this.extractSystemPrompt(content),
        avatar_color: frontmatter.color || '#6B7280',
        capabilities: this.parseCapabilities(frontmatter.tools, frontmatter.capabilities),
        status: this.determineStatus(frontmatter),
        model: frontmatter.model || 'sonnet',
        priority: frontmatter.priority || 'P3',
        proactive: frontmatter.proactive || false,
        usage: frontmatter.usage || 'User agent',
        created_at: this.getFileStats(filePath).birthtime || new Date().toISOString(),
        updated_at: this.getFileStats(filePath).mtime || new Date().toISOString(),
        last_used: new Date().toISOString(),
        usage_count: Math.floor(Math.random() * 100) + 1, // Placeholder
        performance_metrics: this.generatePerformanceMetrics(frontmatter.priority),
        health_status: this.generateHealthStatus()
      };

      return agent;
    } catch (error) {
      console.error(`❌ Error parsing ${filename}:`, error);
      return null;
    }
  }

  /**
   * Extract system prompt from markdown content
   */
  extractSystemPrompt(content) {
    // Look for Purpose or System sections
    const purposeMatch = content.match(/## Purpose\s*\n\n([\s\S]*?)(?=\n##|$)/i);
    if (purposeMatch) {
      return purposeMatch[1].trim().substring(0, 500);
    }

    // Fallback to first paragraph
    const firstParagraph = content.split('\n\n')[0];
    return firstParagraph ? firstParagraph.trim().substring(0, 500) : 'Agent system prompt not available';
  }

  /**
   * Parse capabilities from tools and capabilities fields
   */
  parseCapabilities(tools, capabilities) {
    const caps = [];
    
    if (Array.isArray(tools)) {
      caps.push(...tools.map(tool => tool.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()));
    } else if (typeof tools === 'string') {
      // Parse tools string like "[Read, Write, Edit]"
      const toolsArray = tools.replace(/[\[\]]/g, '').split(',').map(t => t.trim());
      caps.push(...toolsArray.map(tool => tool.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase()));
    }

    if (Array.isArray(capabilities)) {
      caps.push(...capabilities);
    }

    return caps.length > 0 ? caps : ['general-purpose'];
  }

  /**
   * Determine agent status based on frontmatter
   */
  determineStatus(frontmatter) {
    if (frontmatter.status) return frontmatter.status;
    if (frontmatter.proactive) return 'active';
    if (frontmatter.priority === 'P1') return 'active';
    return 'idle';
  }

  /**
   * Generate performance metrics based on priority
   */
  generatePerformanceMetrics(priority = 'P3') {
    const baseRate = priority === 'P1' ? 95 : priority === 'P2' ? 85 : 75;
    return {
      success_rate: baseRate + Math.random() * 10,
      average_response_time: Math.floor(Math.random() * 300) + 100,
      total_tokens_used: Math.floor(Math.random() * 50000) + 10000,
      error_count: Math.floor(Math.random() * 10),
      validations_completed: Math.floor(Math.random() * 200) + 50,
      uptime_percentage: 95 + Math.random() * 4.5
    };
  }

  /**
   * Generate health status
   */
  generateHealthStatus() {
    return {
      cpu_usage: Math.random() * 60 + 20,
      memory_usage: Math.random() * 80 + 30,
      response_time: Math.floor(Math.random() * 400) + 100,
      last_heartbeat: new Date().toISOString(),
      status: 'healthy',
      active_tasks: Math.floor(Math.random() * 5)
    };
  }

  /**
   * Get file statistics
   */
  getFileStats(filePath) {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      return { birthtime: new Date(), mtime: new Date() };
    }
  }

  /**
   * Get specific agent by ID
   */
  async getAgentById(id) {
    const agents = await this.getAgentsFromFiles();
    return agents.find(agent => agent.id === id);
  }

  /**
   * Clear cache - useful for testing
   */
  clearCache() {
    this.cache.clear();
    this.lastScan = null;
  }

  /**
   * Get agent files directory path
   */
  getAgentsPath() {
    return this.agentsPath;
  }

  /**
   * Check if agents directory exists
   */
  isAgentsDirectoryAvailable() {
    return fs.existsSync(this.agentsPath);
  }
}

// Create and export singleton instance
export const agentFileService = new AgentFileService();
export default agentFileService;