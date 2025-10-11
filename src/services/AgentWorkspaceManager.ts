/**
 * Agent Workspace Manager - TDD Implementation
 * Manages agent workspaces and file operations
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { AgentWorkspace, AgentLog, AgentWorkspaceError } from '../types/AgentTypes';

export class AgentWorkspaceManager {
  private readonly baseWorkspaceDir: string;
  private workspaceCache: Map<string, AgentWorkspace> = new Map();

  constructor(baseWorkspaceDir: string = process.env.WORKSPACE_DIR || path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'prod/agent_workspace')) {
    this.baseWorkspaceDir = baseWorkspaceDir;
  }

  /**
   * Create workspace for an agent
   * @param agentName Name of the agent
   * @returns Promise<AgentWorkspace>
   */
  async createWorkspace(agentName: string): Promise<AgentWorkspace> {
    try {
      const workspaceDir = path.join(this.baseWorkspaceDir, agentName);
      
      // Create workspace directory structure
      await fs.mkdir(workspaceDir, { recursive: true });
      await fs.mkdir(path.join(workspaceDir, 'logs'), { recursive: true });
      await fs.mkdir(path.join(workspaceDir, 'files'), { recursive: true });
      await fs.mkdir(path.join(workspaceDir, 'temp'), { recursive: true });

      // Create initial README
      const readmeContent = `# ${agentName} Workspace

This workspace is automatically managed for the ${agentName} agent.

## Directory Structure
- \`logs/\` - Agent execution logs
- \`files/\` - Agent working files
- \`temp/\` - Temporary files (automatically cleaned)

Created: ${new Date().toISOString()}
`;

      await fs.writeFile(path.join(workspaceDir, 'README.md'), readmeContent);

      const workspace: AgentWorkspace = {
        name: agentName,
        directory: workspaceDir,
        files: ['README.md'],
        logs: [],
        lastActivity: new Date()
      };

      this.workspaceCache.set(agentName, workspace);
      return workspace;
    } catch (error) {
      throw new AgentWorkspaceError(
        `Failed to create workspace for ${agentName}: ${error.message}`,
        agentName
      );
    }
  }

  /**
   * Get workspace for an agent
   * @param agentName Name of the agent
   * @returns Promise<AgentWorkspace | null>
   */
  async getWorkspace(agentName: string): Promise<AgentWorkspace | null> {
    // Check cache first
    if (this.workspaceCache.has(agentName)) {
      return this.workspaceCache.get(agentName)!;
    }

    try {
      const workspaceDir = path.join(this.baseWorkspaceDir, agentName);
      const stats = await fs.stat(workspaceDir);
      
      if (!stats.isDirectory()) {
        return null;
      }

      // Load workspace from filesystem
      const workspace = await this.loadWorkspace(agentName, workspaceDir);
      this.workspaceCache.set(agentName, workspace);
      return workspace;
    } catch {
      return null;
    }
  }

  /**
   * List all agent workspaces
   * @returns Promise<AgentWorkspace[]>
   */
  async listWorkspaces(): Promise<AgentWorkspace[]> {
    try {
      const entries = await fs.readdir(this.baseWorkspaceDir, { withFileTypes: true });
      const workspaces: AgentWorkspace[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const workspace = await this.getWorkspace(entry.name);
          if (workspace) {
            workspaces.push(workspace);
          }
        }
      }

      return workspaces;
    } catch (error) {
      throw new AgentWorkspaceError(`Failed to list workspaces: ${error.message}`);
    }
  }

  /**
   * Write file to agent workspace
   * @param agentName Name of the agent
   * @param relativePath Relative path within workspace
   * @param content File content
   * @returns Promise<string> Full path to written file
   */
  async writeFile(agentName: string, relativePath: string, content: string): Promise<string> {
    try {
      const workspace = await this.ensureWorkspace(agentName);
      const fullPath = path.join(workspace.directory, 'files', relativePath);
      
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');

      // Update workspace
      await this.updateWorkspaceActivity(agentName);

      return fullPath;
    } catch (error) {
      throw new AgentWorkspaceError(
        `Failed to write file ${relativePath} for ${agentName}: ${error.message}`,
        agentName
      );
    }
  }

  /**
   * Read file from agent workspace
   * @param agentName Name of the agent
   * @param relativePath Relative path within workspace
   * @returns Promise<string> File content
   */
  async readFile(agentName: string, relativePath: string): Promise<string> {
    try {
      const workspace = await this.getWorkspace(agentName);
      if (!workspace) {
        throw new Error(`Workspace not found for ${agentName}`);
      }

      const fullPath = path.join(workspace.directory, 'files', relativePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new AgentWorkspaceError(
        `Failed to read file ${relativePath} for ${agentName}: ${error.message}`,
        agentName
      );
    }
  }

  /**
   * Log message to agent workspace
   * @param agentName Name of the agent
   * @param level Log level
   * @param message Log message
   * @param context Optional context data
   */
  async log(
    agentName: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const workspace = await this.ensureWorkspace(agentName);
      
      const logEntry: AgentLog = {
        timestamp: new Date(),
        level,
        message,
        context
      };

      // Write to log file
      const logFileName = `${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = path.join(workspace.directory, 'logs', logFileName);
      
      const logLine = `[${logEntry.timestamp.toISOString()}] ${level.toUpperCase()}: ${message}${
        context ? ` | Context: ${JSON.stringify(context)}` : ''
      }\n`;

      await fs.appendFile(logFilePath, logLine);

      // Update workspace
      workspace.logs.push(logEntry);
      await this.updateWorkspaceActivity(agentName);
    } catch (error) {
      console.error(`Failed to log for ${agentName}:`, error);
    }
  }

  /**
   * Clean temporary files from workspace
   * @param agentName Name of the agent
   * @param olderThanHours Delete files older than specified hours
   */
  async cleanTempFiles(agentName: string, olderThanHours: number = 24): Promise<void> {
    try {
      const workspace = await this.getWorkspace(agentName);
      if (!workspace) return;

      const tempDir = path.join(workspace.directory, 'temp');
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

      try {
        const entries = await fs.readdir(tempDir, { withFileTypes: true });
        
        for (const entry of entries) {
          const filePath = path.join(tempDir, entry.name);
          const stats = await fs.stat(filePath);
          
          if (stats.mtimeMs < cutoffTime) {
            if (entry.isDirectory()) {
              await fs.rmdir(filePath, { recursive: true });
            } else {
              await fs.unlink(filePath);
            }
          }
        }
      } catch {
        // Temp directory doesn't exist or is empty
      }
    } catch (error) {
      console.warn(`Failed to clean temp files for ${agentName}:`, error);
    }
  }

  /**
   * Delete workspace entirely
   * @param agentName Name of the agent
   */
  async deleteWorkspace(agentName: string): Promise<void> {
    try {
      const workspace = await this.getWorkspace(agentName);
      if (!workspace) return;

      await fs.rmdir(workspace.directory, { recursive: true });
      this.workspaceCache.delete(agentName);
    } catch (error) {
      throw new AgentWorkspaceError(
        `Failed to delete workspace for ${agentName}: ${error.message}`,
        agentName
      );
    }
  }

  /**
   * Ensure workspace exists, create if not
   * @param agentName Name of the agent
   * @returns Promise<AgentWorkspace>
   */
  private async ensureWorkspace(agentName: string): Promise<AgentWorkspace> {
    let workspace = await this.getWorkspace(agentName);
    if (!workspace) {
      workspace = await this.createWorkspace(agentName);
    }
    return workspace;
  }

  /**
   * Load workspace from filesystem
   * @param agentName Name of the agent
   * @param workspaceDir Workspace directory path
   * @returns Promise<AgentWorkspace>
   */
  private async loadWorkspace(agentName: string, workspaceDir: string): Promise<AgentWorkspace> {
    const files: string[] = [];
    const logs: AgentLog[] = [];
    let lastActivity = new Date(0);

    try {
      // Scan files directory
      const filesDir = path.join(workspaceDir, 'files');
      try {
        const fileEntries = await fs.readdir(filesDir, { recursive: true });
        files.push(...fileEntries.filter(f => typeof f === 'string'));
      } catch {
        // Files directory doesn't exist
      }

      // Load recent logs
      const logsDir = path.join(workspaceDir, 'logs');
      try {
        const logFiles = await fs.readdir(logsDir);
        for (const logFile of logFiles.slice(-5)) { // Last 5 log files
          try {
            const logContent = await fs.readFile(path.join(logsDir, logFile), 'utf-8');
            const logLines = logContent.split('\n').filter(line => line.trim());
            
            for (const line of logLines.slice(-10)) { // Last 10 entries per file
              const logEntry = this.parseLogLine(line);
              if (logEntry) {
                logs.push(logEntry);
                if (logEntry.timestamp > lastActivity) {
                  lastActivity = logEntry.timestamp;
                }
              }
            }
          } catch {
            // Skip problematic log files
          }
        }
      } catch {
        // Logs directory doesn't exist
      }

      // Get workspace directory mtime if no log activity
      if (lastActivity.getTime() === 0) {
        const stats = await fs.stat(workspaceDir);
        lastActivity = stats.mtime;
      }
    } catch {
      // Use defaults if scanning fails
    }

    return {
      name: agentName,
      directory: workspaceDir,
      files,
      logs: logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      lastActivity
    };
  }

  /**
   * Parse log line into AgentLog object
   * @param line Log line string
   * @returns AgentLog | null
   */
  private parseLogLine(line: string): AgentLog | null {
    const match = line.match(/^\[([^\]]+)\] (\w+): (.+?)(?:\s\|\sContext:\s(.+))?$/);
    if (!match) return null;

    const [, timestamp, level, message, contextJson] = match;
    
    try {
      return {
        timestamp: new Date(timestamp),
        level: level.toLowerCase() as AgentLog['level'],
        message,
        context: contextJson ? JSON.parse(contextJson) : undefined
      };
    } catch {
      return null;
    }
  }

  /**
   * Update workspace activity timestamp
   * @param agentName Name of the agent
   */
  private async updateWorkspaceActivity(agentName: string): Promise<void> {
    const workspace = this.workspaceCache.get(agentName);
    if (workspace) {
      workspace.lastActivity = new Date();
    }
  }
}