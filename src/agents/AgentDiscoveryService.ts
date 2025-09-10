/**
 * Agent Discovery Service - TDD Implementation
 * Discovers and parses agent definitions from filesystem
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { AgentDefinition, AgentFrontmatter, AgentParseError } from '../types/AgentTypes';

export class AgentDiscoveryService {
  private readonly agentDirectory: string;
  private cache: Map<string, AgentDefinition> = new Map();
  private lastScanTime: Date | null = null;

  constructor(agentDirectory: string = '/workspaces/agent-feed/prod/.claude/agents') {
    this.agentDirectory = agentDirectory;
  }

  /**
   * Discovers all agent files in the configured directory
   * @returns Promise<AgentDefinition[]> Array of parsed agent definitions
   */
  async discoverAgents(): Promise<AgentDefinition[]> {
    try {
      const files = await this.getAgentFiles();
      const agents: AgentDefinition[] = [];

      for (const file of files) {
        try {
          const agent = await this.parseAgentFile(file);
          if (agent) {
            agents.push(agent);
            this.cache.set(agent.name, agent);
          }
        } catch (error) {
          console.warn(`Failed to parse agent file ${file}:`, error);
        }
      }

      this.lastScanTime = new Date();
      return agents;
    } catch (error) {
      throw new AgentParseError(`Failed to discover agents: ${error.message}`);
    }
  }

  /**
   * Get a specific agent by name
   * @param name Agent name
   * @returns Promise<AgentDefinition | null>
   */
  async getAgent(name: string): Promise<AgentDefinition | null> {
    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    // Try to load from filesystem
    const filePath = path.join(this.agentDirectory, `${name}.md`);
    try {
      const agent = await this.parseAgentFile(filePath);
      if (agent) {
        this.cache.set(name, agent);
      }
      return agent;
    } catch {
      return null;
    }
  }

  /**
   * Get all agent files from directory
   * @returns Promise<string[]> Array of file paths
   */
  private async getAgentFiles(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.agentDirectory, { withFileTypes: true });
      return entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
        .map(entry => path.join(this.agentDirectory, entry.name));
    } catch (error) {
      throw new Error(`Cannot read agent directory: ${error.message}`);
    }
  }

  /**
   * Parse a single agent file
   * @param filePath Path to agent markdown file
   * @returns Promise<AgentDefinition | null>
   */
  private async parseAgentFile(filePath: string): Promise<AgentDefinition | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseAgentContent(content, filePath);
    } catch (error) {
      throw new AgentParseError(`Failed to read agent file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse agent content from markdown with frontmatter
   * @param content Markdown content
   * @param filePath Original file path
   * @returns AgentDefinition | null
   */
  private parseAgentContent(content: string, filePath: string): AgentDefinition | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontmatterMatch) {
      throw new AgentParseError(`No frontmatter found in ${filePath}`);
    }

    const [, frontmatterYaml, body] = frontmatterMatch;
    
    try {
      const frontmatter = this.parseFrontmatter(frontmatterYaml);
      
      return {
        ...frontmatter,
        body: body.trim(),
        filePath,
        lastModified: new Date(),
        workspaceDirectory: `/workspaces/agent-feed/prod/agent_workspace/${frontmatter.name}/`
      };
    } catch (error) {
      throw new AgentParseError(`Invalid frontmatter in ${filePath}: ${error.message}`);
    }
  }

  /**
   * Parse YAML frontmatter into typed object
   * @param yamlContent YAML string
   * @returns AgentFrontmatter
   */
  private parseFrontmatter(yamlContent: string): AgentFrontmatter {
    const lines = yamlContent.split('\n');
    const frontmatter: Partial<AgentFrontmatter> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      switch (key) {
        case 'name':
          frontmatter.name = value;
          break;
        case 'description':
          frontmatter.description = value;
          break;
        case 'tools':
          frontmatter.tools = this.parseToolsList(value);
          break;
        case 'model':
          frontmatter.model = value as 'haiku' | 'sonnet' | 'opus';
          break;
        case 'color':
          frontmatter.color = value.replace(/"/g, '');
          break;
        case 'proactive':
          frontmatter.proactive = value === 'true';
          break;
        case 'priority':
          frontmatter.priority = value as 'P0' | 'P1' | 'P2' | 'P3';
          break;
        case 'usage':
          frontmatter.usage = value;
          break;
      }
    }

    // Validate required fields
    if (!frontmatter.name || !frontmatter.description) {
      throw new Error('Missing required fields: name and description');
    }

    return frontmatter as AgentFrontmatter;
  }

  /**
   * Parse tools list from YAML array format
   * @param toolsString String representation of tools array
   * @returns string[]
   */
  private parseToolsList(toolsString: string): string[] {
    // Remove brackets and split by comma
    const cleaned = toolsString.replace(/[\[\]]/g, '').trim();
    if (!cleaned) return [];
    
    return cleaned.split(',').map(tool => tool.trim());
  }

  /**
   * Check if cache needs refresh
   * @returns boolean
   */
  needsRefresh(): boolean {
    if (!this.lastScanTime) return true;
    
    const cacheAge = Date.now() - this.lastScanTime.getTime();
    return cacheAge > 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Clear cache and force rescan
   */
  clearCache(): void {
    this.cache.clear();
    this.lastScanTime = null;
  }
}