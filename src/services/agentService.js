/**
 * Production Agent Discovery and Management Service
 * Handles scanning, metadata parsing, and status monitoring of production agents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgentService extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.agentStatuses = new Map();
    this.scanInterval = null;
    this.statusCheckInterval = null;
    this.isInitialized = false;
    
    // Production agent directories
    this.agentDirectories = [
      process.env.AGENTS_DIR || path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'prod/.claude/agents'),
      process.env.WORKSPACE_DIR || path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'prod/agent_workspace')
    ];
    
    // Agent status tracking
    this.agentMetrics = new Map();
    this.lastActivity = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Agent Discovery Service...');
      await this.scanAgents();
      this.startStatusMonitoring();
      this.isInitialized = true;
      console.log('✅ Agent Discovery Service initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Agent Discovery Service:', error);
      throw error;
    }
  }

  /**
   * Scan all agent directories for production agents
   */
  async scanAgents() {
    const discoveredAgents = new Map();
    
    for (const directory of this.agentDirectories) {
      if (fs.existsSync(directory)) {
        await this.scanDirectory(directory, discoveredAgents);
      } else {
        console.warn(`⚠️ Agent directory not found: ${directory}`);
      }
    }
    
    // Update agents map
    this.agents.clear();
    discoveredAgents.forEach((agent, id) => {
      this.agents.set(id, agent);
      if (!this.agentStatuses.has(id)) {
        this.agentStatuses.set(id, {
          status: 'inactive',
          lastSeen: null,
          uptime: 0,
          processId: null,
          memoryUsage: 0,
          cpuUsage: 0
        });
      }
    });
    
    console.log(`📊 Discovered ${this.agents.size} production agents`);
    this.emit('agents-updated', Array.from(this.agents.values()));
  }

  /**
   * Scan a specific directory for agents
   */
  async scanDirectory(directory, discoveredAgents) {
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const agentPath = path.join(directory, entry.name);
          const agent = await this.parseAgentDirectory(agentPath, entry.name);
          if (agent) {
            discoveredAgents.set(agent.id, agent);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const agentPath = path.join(directory, entry.name);
          const agent = await this.parseAgentFile(agentPath);
          if (agent) {
            discoveredAgents.set(agent.id, agent);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning directory ${directory}:`, error);
    }
  }

  /**
   * Parse agent directory structure
   */
  async parseAgentDirectory(agentPath, agentName) {
    try {
      const configFiles = ['agent.json', 'config.json', 'claude.json'];
      let config = null;
      
      // Look for configuration files
      for (const configFile of configFiles) {
        const configPath = path.join(agentPath, configFile);
        if (fs.existsSync(configPath)) {
          const configContent = fs.readFileSync(configPath, 'utf8');
          config = JSON.parse(configContent);
          break;
        }
      }
      
      // Look for README or description files
      let description = '';
      const descriptionFiles = ['README.md', 'description.md', 'agent.md'];
      for (const descFile of descriptionFiles) {
        const descPath = path.join(agentPath, descFile);
        if (fs.existsSync(descPath)) {
          description = fs.readFileSync(descPath, 'utf8');
          break;
        }
      }
      
      // Get directory stats
      const stats = fs.statSync(agentPath);
      
      const agent = {
        id: agentName,
        name: config?.name || agentName,
        description: this.extractDescription(description),
        type: config?.type || 'production',
        category: config?.category || this.inferCategory(agentName),
        version: config?.version || '1.0.0',
        path: agentPath,
        config: config || {},
        capabilities: config?.capabilities || this.inferCapabilities(agentPath),
        tags: config?.tags || this.generateTags(agentName, description),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        size: await this.calculateDirectorySize(agentPath),
        files: await this.getAgentFiles(agentPath),
        isActive: false,
        metadata: {
          hasConfig: !!config,
          hasDocumentation: !!description,
          fileCount: 0,
          languages: this.detectLanguages(agentPath)
        }
      };
      
      agent.metadata.fileCount = agent.files.length;
      
      return agent;
    } catch (error) {
      console.error(`❌ Error parsing agent directory ${agentPath}:`, error);
      return null;
    }
  }

  /**
   * Parse individual agent markdown files
   */
  async parseAgentFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath, '.md');
      
      const metadata = this.parseMarkdownMetadata(content);
      
      const agent = {
        id: fileName,
        name: metadata.name || fileName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: this.extractDescription(content),
        type: 'production',
        category: metadata.category || this.inferCategory(fileName),
        version: metadata.version || '1.0.0',
        path: filePath,
        config: metadata,
        capabilities: metadata.capabilities || this.inferCapabilities(filePath),
        tags: metadata.tags || this.generateTags(fileName, content),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        size: stats.size,
        files: [{ name: path.basename(filePath), size: stats.size, type: 'markdown' }],
        isActive: false,
        metadata: {
          hasConfig: !!metadata.name,
          hasDocumentation: true,
          fileCount: 1,
          languages: ['markdown']
        }
      };
      
      return agent;
    } catch (error) {
      console.error(`❌ Error parsing agent file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract description from markdown content
   */
  extractDescription(content) {
    if (!content) return '';
    
    // Look for description in various formats
    const descriptionPatterns = [
      /^#\s+(.+?)$/m,  // First heading
      /^>\s*(.+?)$/m,  // Blockquote
      /^Description:\s*(.+?)$/m,  // Description: label
      /^(.+?)(?:\n\n|\n#)/  // First paragraph
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = content.match(pattern);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    // Fallback: first 200 characters
    return content.substring(0, 200).trim() + (content.length > 200 ? '...' : '');
  }

  /**
   * Parse markdown metadata from frontmatter or content
   */
  parseMarkdownMetadata(content) {
    const metadata = {};
    
    // Try frontmatter first
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          const [, key, value] = match;
          try {
            metadata[key] = JSON.parse(value);
          } catch {
            metadata[key] = value.trim();
          }
        }
      }
    }
    
    // Extract capabilities from content
    const capabilitiesMatch = content.match(/capabilities?\s*:?\s*([\s\S]*?)(?:\n\n|\n#|$)/i);
    if (capabilitiesMatch) {
      const capText = capabilitiesMatch[1];
      const capabilities = capText.split(/[,\n-]/).map(cap => cap.trim()).filter(Boolean);
      metadata.capabilities = capabilities;
    }
    
    return metadata;
  }

  /**
   * Infer agent category from name or path
   */
  inferCategory(agentName) {
    const categoryMap = {
      'feedback': 'Communication',
      'ideas': 'Creativity',
      'meeting': 'Productivity',
      'todos': 'Task Management',
      'logger': 'Monitoring',
      'prep': 'Productivity',
      'follow': 'Communication',
      'meta': 'System',
      'update': 'Maintenance',
      'know': 'Social'
    };
    
    const name = agentName.toLowerCase();
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (name.includes(keyword)) {
        return category;
      }
    }
    
    return 'General';
  }

  /**
   * Infer capabilities from agent path and content
   */
  inferCapabilities(agentPath) {
    const capabilities = new Set();
    
    // Check for common capability indicators
    if (agentPath.includes('api') || agentPath.includes('service')) {
      capabilities.add('API Integration');
    }
    if (agentPath.includes('data') || agentPath.includes('database')) {
      capabilities.add('Data Processing');
    }
    if (agentPath.includes('ui') || agentPath.includes('frontend')) {
      capabilities.add('User Interface');
    }
    if (agentPath.includes('test')) {
      capabilities.add('Testing');
    }
    if (agentPath.includes('monitor')) {
      capabilities.add('Monitoring');
    }
    
    return Array.from(capabilities);
  }

  /**
   * Generate tags from agent name and content
   */
  generateTags(agentName, content = '') {
    const tags = new Set();
    
    // Add name-based tags
    const nameWords = agentName.toLowerCase().split(/[-_\s]+/);
    nameWords.forEach(word => {
      if (word.length > 2) {
        tags.add(word);
      }
    });
    
    // Add content-based tags
    const commonTags = ['api', 'data', 'ui', 'test', 'monitor', 'service', 'tool', 'assistant'];
    commonTags.forEach(tag => {
      if (content.toLowerCase().includes(tag)) {
        tags.add(tag);
      }
    });
    
    return Array.from(tags);
  }

  /**
   * Calculate directory size recursively
   */
  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
        } else if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error calculating directory size for ${dirPath}:`, error);
    }
    
    return totalSize;
  }

  /**
   * Get list of files in agent directory
   */
  async getAgentFiles(dirPath) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          files.push({
            name: entry.name,
            size: stats.size,
            type: path.extname(entry.name).substring(1) || 'file',
            lastModified: stats.mtime
          });
        }
      }
    } catch (error) {
      console.error(`Error getting files for ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Detect programming languages in agent directory
   */
  detectLanguages(dirPath) {
    const languages = new Set();
    const extensionMap = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.py': 'Python',
      '.json': 'JSON',
      '.md': 'Markdown',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.sh': 'Shell',
      '.html': 'HTML',
      '.css': 'CSS'
    };
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensionMap[ext]) {
            languages.add(extensionMap[ext]);
          }
        }
      }
    } catch (error) {
      console.error(`Error detecting languages for ${dirPath}:`, error);
    }
    
    return Array.from(languages);
  }

  /**
   * Start monitoring agent status
   */
  startStatusMonitoring() {
    // Scan for new agents every 30 seconds
    this.scanInterval = setInterval(() => {
      this.scanAgents();
    }, 30000);
    
    // Update agent status every 10 seconds
    this.statusCheckInterval = setInterval(() => {
      this.updateAgentStatuses();
    }, 10000);
    
    console.log('📊 Started agent status monitoring');
  }

  /**
   * Update agent statuses
   */
  updateAgentStatuses() {
    for (const [agentId, agent] of this.agents) {
      const currentStatus = this.agentStatuses.get(agentId);
      
      // Check if agent is active (simplified check)
      const isActive = this.checkAgentActivity(agent);
      
      const newStatus = {
        ...currentStatus,
        status: isActive ? 'active' : 'inactive',
        lastSeen: isActive ? new Date() : currentStatus.lastSeen,
        uptime: isActive ? (currentStatus.uptime || 0) + 10 : 0
      };
      
      this.agentStatuses.set(agentId, newStatus);
      agent.isActive = isActive;
    }
    
    this.emit('status-updated', this.getAgentStatuses());
  }

  /**
   * Check if agent is currently active (simplified)
   */
  checkAgentActivity(agent) {
    try {
      // Check if agent files have been recently modified
      const stats = fs.statSync(agent.path);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return stats.mtime > fiveMinutesAgo;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all agents
   */
  getAgents(filters = {}) {
    let agents = Array.from(this.agents.values());
    
    // Apply filters
    if (filters.category) {
      agents = agents.filter(agent => agent.category === filters.category);
    }
    
    if (filters.status) {
      agents = agents.filter(agent => {
        const status = this.agentStatuses.get(agent.id);
        return status?.status === filters.status;
      });
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      agents = agents.filter(agent => 
        agent.name.toLowerCase().includes(searchTerm) ||
        agent.description.toLowerCase().includes(searchTerm) ||
        agent.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort agents
    const sortBy = filters.sortBy || 'name';
    agents.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'status':
          const aStatus = this.agentStatuses.get(a.id)?.status || 'inactive';
          const bStatus = this.agentStatuses.get(b.id)?.status || 'inactive';
          return aStatus.localeCompare(bStatus);
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
    return this.agents.get(id);
  }

  /**
   * Get agent status
   */
  getAgentStatus(id) {
    return this.agentStatuses.get(id);
  }

  /**
   * Get all agent statuses
   */
  getAgentStatuses() {
    const statuses = {};
    this.agentStatuses.forEach((status, id) => {
      statuses[id] = status;
    });
    return statuses;
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics() {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agentStatuses.values())
      .filter(status => status.status === 'active').length;
    
    const categories = {};
    this.agents.forEach(agent => {
      categories[agent.category] = (categories[agent.category] || 0) + 1;
    });
    
    return {
      total: totalAgents,
      active: activeAgents,
      inactive: totalAgents - activeAgents,
      categories,
      lastUpdate: new Date()
    };
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    
    console.log('🛑 Agent monitoring stopped');
  }
}

// Singleton instance
export const agentService = new AgentService();
export default agentService;