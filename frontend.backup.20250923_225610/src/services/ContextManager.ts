/**
 * Context Manager - Handles project context and file system integration
 * 
 * Manages project state, file watching, git integration, and context serialization
 * for Claude Code communication. Provides intelligent context selection and
 * real-time updates when project files change.
 */

import {
  ProjectContext,
  FileContext,
  GitContext,
  FileTreeNode,
  ActiveFile,
  GitChange,
  GitCommit,
  RemoteInfo,
  PackageInfo,
  EnvironmentInfo,
  UserPreferences,
  BuildInfo,
  Disposable
} from '../types/claude-integration';

import { apiService } from './api';

/**
 * File system watcher interface
 */
interface FileWatcher extends Disposable {
  watch(path: string, callback: (event: FileWatchEvent) => void): void;
  unwatch(path: string): void;
}

interface FileWatchEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
  stats?: {
    size: number;
    lastModified: string;
  };
}

/**
 * Git watcher interface
 */
interface GitWatcher extends Disposable {
  watch(repoPath: string, callback: (event: GitWatchEvent) => void): void;
  getCurrentBranch(repoPath: string): Promise<string>;
  getRecentCommits(repoPath: string, count: number): Promise<GitCommit[]>;
  getChanges(repoPath: string): Promise<{ staged: GitChange[]; unstaged: GitChange[] }>;
  getRemoteInfo(repoPath: string): Promise<RemoteInfo>;
}

interface GitWatchEvent {
  type: 'branch_changed' | 'commit' | 'stage' | 'unstage' | 'remote_update';
  data: any;
}

/**
 * Context Manager - Core class for project context management
 */
export class ContextManager implements Disposable {
  private projectContext: ProjectContext | null = null;
  private fileWatcher: FileWatcher | null = null;
  private gitWatcher: GitWatcher | null = null;
  private contextUpdateCallbacks: Set<(context: ProjectContext) => void> = new Set();
  private isWatching: boolean = false;
  private contextCache: Map<string, any> = new Map();
  private relevantFileExtensions: Set<string> = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.h',
    '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala',
    '.html', '.css', '.scss', '.less', '.vue', '.svelte',
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini',
    '.md', '.txt', '.doc', '.docx', '.pdf',
    '.sql', '.graphql', '.proto'
  ]);

  constructor() {
    this.initializeWatchers();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeWatchers(): void {
    // Initialize file watcher (would use fs.watch or chokidar in real implementation)
    this.fileWatcher = this.createFileWatcher();
    
    // Initialize git watcher (would use git hooks or polling in real implementation)
    this.gitWatcher = this.createGitWatcher();
  }

  private createFileWatcher(): FileWatcher {
    return {
      watch: (path: string, callback: (event: FileWatchEvent) => void) => {
        // Mock implementation - in real app would use chokidar or fs.watch
        console.log(`Watching files at ${path}`);
      },
      unwatch: (path: string) => {
        console.log(`Stopped watching ${path}`);
      },
      dispose: () => {
        console.log('File watcher disposed');
      }
    };
  }

  private createGitWatcher(): GitWatcher {
    return {
      watch: (repoPath: string, callback: (event: GitWatchEvent) => void) => {
        console.log(`Watching git repo at ${repoPath}`);
      },
      getCurrentBranch: async (repoPath: string) => {
        // Mock implementation - would use git commands
        return 'main';
      },
      getRecentCommits: async (repoPath: string, count: number) => {
        // Mock implementation
        return [];
      },
      getChanges: async (repoPath: string) => {
        // Mock implementation
        return { staged: [], unstaged: [] };
      },
      getRemoteInfo: async (repoPath: string) => {
        // Mock implementation
        return {
          name: 'origin',
          url: 'https://github.com/user/repo.git',
          branch: 'main',
          ahead: 0,
          behind: 0
        };
      },
      dispose: () => {
        console.log('Git watcher disposed');
      }
    };
  }

  // ============================================================================
  // CORE CONTEXT METHODS
  // ============================================================================

  /**
   * Initialize context for a project
   */
  async initializeContext(projectPath: string): Promise<ProjectContext> {
    try {
      // Get basic project info
      const projectName = this.extractProjectName(projectPath);
      
      // Build file tree
      const fileTree = await this.buildFileTree(projectPath);
      
      // Get git context
      const gitContext = await this.getGitContext(projectPath);
      
      // Get dependencies
      const dependencies = await this.getDependencies(projectPath);
      
      // Get environment info
      const environmentInfo = await this.getEnvironmentInfo();
      
      // Get user preferences (from settings or defaults)
      const userPreferences = await this.getUserPreferences();
      
      // Build context
      this.projectContext = {
        projectName,
        projectPath,
        currentBranch: gitContext?.currentBranch || 'unknown',
        fileTree,
        recentChanges: gitContext ? [...gitContext.stagedChanges, ...gitContext.unstagedChanges] : [],
        activeFiles: [],
        dependencies,
        environmentInfo,
        userPreferences,
        buildInfo: await this.getBuildInfo(projectPath)
      };
      
      // Start watching for changes
      this.startWatching(projectPath);
      
      // Cache the context
      this.contextCache.set('current', this.projectContext);
      
      this.notifyContextUpdate();
      return this.projectContext;
      
    } catch (error) {
      console.error('Failed to initialize context:', error);
      throw error;
    }
  }

  /**
   * Update project context
   */
  async updateContext(updates: Partial<ProjectContext>): Promise<void> {
    if (!this.projectContext) {
      throw new Error('Context not initialized');
    }
    
    this.projectContext = {
      ...this.projectContext,
      ...updates
    };
    
    this.contextCache.set('current', this.projectContext);
    this.notifyContextUpdate();
  }

  /**
   * Get current project context
   */
  async getProjectContext(): Promise<ProjectContext> {
    if (!this.projectContext) {
      throw new Error('Context not initialized');
    }
    
    return { ...this.projectContext };
  }

  /**
   * Serialize context for Claude Code
   */
  async serializeContext(): Promise<string> {
    if (!this.projectContext) {
      return JSON.stringify({});
    }
    
    // Create a optimized version of context for Claude
    const optimizedContext = {
      projectName: this.projectContext.projectName,
      projectPath: this.projectContext.projectPath,
      currentBranch: this.projectContext.currentBranch,
      
      // Limit file tree depth and size
      fileTree: this.optimizeFileTree(this.projectContext.fileTree),
      
      // Only recent changes (last 10)
      recentChanges: this.projectContext.recentChanges.slice(0, 10),
      
      // Active files with content preview
      activeFiles: await this.getActiveFilesWithContent(),
      
      // Key dependencies only
      dependencies: this.projectContext.dependencies.filter(dep => 
        dep.type === 'dependency' && this.isImportantDependency(dep.name)
      ),
      
      // Essential environment info
      environmentInfo: {
        nodeVersion: this.projectContext.environmentInfo.nodeVersion,
        operatingSystem: this.projectContext.environmentInfo.operatingSystem,
        workspaceType: this.projectContext.environmentInfo.workspaceType
      },
      
      // Build status
      buildInfo: this.projectContext.buildInfo
    };
    
    return JSON.stringify(optimizedContext, null, 2);
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  /**
   * Add active file
   */
  addActiveFile(file: ActiveFile): void {
    if (!this.projectContext) return;
    
    const existingIndex = this.projectContext.activeFiles.findIndex(
      f => f.path === file.path
    );
    
    if (existingIndex >= 0) {
      this.projectContext.activeFiles[existingIndex] = file;
    } else {
      this.projectContext.activeFiles.push(file);
    }
    
    // Limit active files to prevent context overflow
    if (this.projectContext.activeFiles.length > 10) {
      this.projectContext.activeFiles = this.projectContext.activeFiles
        .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())
        .slice(0, 10);
    }
    
    this.notifyContextUpdate();
  }

  /**
   * Remove active file
   */
  removeActiveFile(filePath: string): void {
    if (!this.projectContext) return;
    
    this.projectContext.activeFiles = this.projectContext.activeFiles.filter(
      f => f.path !== filePath
    );
    
    this.notifyContextUpdate();
  }

  /**
   * Get relevant files based on query
   */
  async getRelevantFiles(query: string, limit: number = 5): Promise<FileContext[]> {
    if (!this.projectContext) {
      return [];
    }
    
    const relevantFiles: FileContext[] = [];
    
    // Search through file tree for matches
    const searchFiles = (nodes: FileTreeNode[], currentPath: string = '') => {
      for (const node of nodes) {
        const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        
        if (node.type === 'file' && this.isRelevantFile(node.name)) {
          // Simple relevance scoring
          const score = this.calculateRelevanceScore(node.name, fullPath, query);
          
          if (score > 0) {
            relevantFiles.push({
              path: fullPath,
              content: '', // Would load actual content
              language: this.detectLanguage(node.name),
              lastModified: node.lastModified || new Date().toISOString(),
              size: node.size || 0,
              encoding: 'utf-8',
              importance: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low'
            });
          }
        }
        
        if (node.children) {
          searchFiles(node.children, fullPath);
        }
      }
    };
    
    searchFiles(this.projectContext.fileTree);
    
    // Sort by relevance and return top results
    return relevantFiles
      .sort((a, b) => {
        const scoreA = this.calculateRelevanceScore(a.path, a.path, query);
        const scoreB = this.calculateRelevanceScore(b.path, b.path, query);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Update file context when files change
   */
  async updateFileContext(filePath: string): Promise<void> {
    if (!this.projectContext) return;
    
    try {
      // Update file tree if needed
      await this.refreshFileTree();
      
      // Update active file if it's currently open
      const activeFile = this.projectContext.activeFiles.find(f => f.path === filePath);
      if (activeFile) {
        activeFile.lastAccessed = new Date().toISOString();
      }
      
      this.notifyContextUpdate();
      
    } catch (error) {
      console.error('Failed to update file context:', error);
    }
  }

  // ============================================================================
  // GIT OPERATIONS
  // ============================================================================

  /**
   * Update Git context
   */
  async updateGitContext(gitInfo: GitContext): Promise<void> {
    if (!this.projectContext) return;
    
    this.projectContext.currentBranch = gitInfo.currentBranch;
    this.projectContext.recentChanges = [
      ...gitInfo.stagedChanges,
      ...gitInfo.unstagedChanges
    ];
    
    this.notifyContextUpdate();
  }

  /**
   * Get Git context for project
   */
  private async getGitContext(projectPath: string): Promise<GitContext | null> {
    if (!this.gitWatcher) return null;
    
    try {
      const currentBranch = await this.gitWatcher.getCurrentBranch(projectPath);
      const recentCommits = await this.gitWatcher.getRecentCommits(projectPath, 5);
      const changes = await this.gitWatcher.getChanges(projectPath);
      const remoteInfo = await this.gitWatcher.getRemoteInfo(projectPath);
      
      return {
        currentBranch,
        recentCommits,
        stagedChanges: changes.staged,
        unstagedChanges: changes.unstaged,
        remoteInfo,
        workingDirectory: projectPath
      };
    } catch (error) {
      console.error('Failed to get git context:', error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private extractProjectName(projectPath: string): string {
    return projectPath.split('/').pop() || 'unknown-project';
  }

  private async buildFileTree(projectPath: string): Promise<FileTreeNode[]> {
    // Mock implementation - would use fs.readdir recursively
    return [
      {
        name: 'src',
        path: 'src',
        type: 'directory',
        children: [
          {
            name: 'index.ts',
            path: 'src/index.ts',
            type: 'file',
            size: 1024,
            lastModified: new Date().toISOString(),
            gitStatus: 'clean'
          }
        ]
      }
    ];
  }

  private async getDependencies(projectPath: string): Promise<PackageInfo[]> {
    // Mock implementation - would read package.json
    return [
      {
        name: 'react',
        version: '^18.2.0',
        type: 'dependency',
        description: 'React library'
      }
    ];
  }

  private async getEnvironmentInfo(): Promise<EnvironmentInfo> {
    return {
      nodeVersion: process.version,
      operatingSystem: process.platform,
      architecture: process.arch,
      availableMemory: 8192, // Mock value
      cpuCount: 4, // Mock value
      workspaceType: 'local'
    };
  }

  private async getUserPreferences(): Promise<UserPreferences> {
    // Would load from settings or localStorage
    return {
      theme: 'auto',
      fontSize: 14,
      indentSize: 2,
      preferredLanguage: 'typescript',
      autoSave: true,
      showLineNumbers: true
    };
  }

  private async getBuildInfo(projectPath: string): Promise<BuildInfo> {
    // Mock implementation - would check build status
    return {
      buildStatus: 'success',
      lastBuildTime: new Date().toISOString(),
      testResults: {
        passed: 15,
        failed: 0,
        total: 15
      },
      lintResults: {
        errors: 0,
        warnings: 2
      }
    };
  }

  private optimizeFileTree(fileTree: FileTreeNode[]): FileTreeNode[] {
    // Limit depth and filter out unimportant files
    const optimizeNode = (node: FileTreeNode, depth: number): FileTreeNode | null => {
      if (depth > 3) return null; // Limit depth
      
      if (node.type === 'file' && !this.isRelevantFile(node.name)) {
        return null;
      }
      
      const optimized: FileTreeNode = {
        name: node.name,
        path: node.path,
        type: node.type,
        size: node.size,
        gitStatus: node.gitStatus
      };
      
      if (node.children) {
        const filteredChildren = node.children
          .map(child => optimizeNode(child, depth + 1))
          .filter(child => child !== null) as FileTreeNode[];
        
        if (filteredChildren.length > 0) {
          optimized.children = filteredChildren;
        }
      }
      
      return optimized;
    };
    
    return fileTree
      .map(node => optimizeNode(node, 0))
      .filter(node => node !== null) as FileTreeNode[];
  }

  private async getActiveFilesWithContent(): Promise<ActiveFile[]> {
    if (!this.projectContext) return [];
    
    // In real implementation, would load file contents
    return this.projectContext.activeFiles.map(file => ({
      ...file,
      // Add file content preview for small files
    }));
  }

  private isImportantDependency(name: string): boolean {
    const importantDeps = ['react', 'vue', 'angular', 'express', 'next', 'nuxt', 'typescript'];
    return importantDeps.some(dep => name.includes(dep));
  }

  private isRelevantFile(fileName: string): boolean {
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    return this.relevantFileExtensions.has(ext) && !fileName.startsWith('.');
  }

  private detectLanguage(fileName: string): string {
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.md': 'markdown'
    };
    
    return langMap[ext] || 'text';
  }

  private calculateRelevanceScore(fileName: string, filePath: string, query: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerFileName = fileName.toLowerCase();
    const lowerFilePath = filePath.toLowerCase();
    
    let score = 0;
    
    // Exact match in filename
    if (lowerFileName.includes(lowerQuery)) {
      score += 0.8;
    }
    
    // Match in path
    if (lowerFilePath.includes(lowerQuery)) {
      score += 0.4;
    }
    
    // Boost for common important files
    if (lowerFileName.includes('index') || lowerFileName.includes('main')) {
      score += 0.2;
    }
    
    // Boost for TypeScript/JavaScript files
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || 
        fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  private async refreshFileTree(): Promise<void> {
    if (!this.projectContext) return;
    
    // In real implementation, would rebuild file tree
    console.log('Refreshing file tree...');
  }

  private startWatching(projectPath: string): void {
    if (this.isWatching || !this.fileWatcher || !this.gitWatcher) {
      return;
    }
    
    // Start file watching
    this.fileWatcher.watch(projectPath, (event) => {
      this.handleFileEvent(event);
    });
    
    // Start git watching
    this.gitWatcher.watch(projectPath, (event) => {
      this.handleGitEvent(event);
    });
    
    this.isWatching = true;
  }

  private handleFileEvent(event: FileWatchEvent): void {
    console.log('File event:', event);
    
    // Update context based on file changes
    this.updateFileContext(event.path);
  }

  private handleGitEvent(event: GitWatchEvent): void {
    console.log('Git event:', event);
    
    // Update context based on git changes
    if (this.projectContext) {
      // Would update git-related context
      this.notifyContextUpdate();
    }
  }

  private notifyContextUpdate(): void {
    if (this.projectContext) {
      this.contextUpdateCallbacks.forEach(callback => {
        try {
          callback(this.projectContext!);
        } catch (error) {
          console.error('Error in context update callback:', error);
        }
      });
    }
  }

  // ============================================================================
  // PUBLIC EVENT METHODS
  // ============================================================================

  /**
   * Register context update callback
   */
  onContextUpdate(callback: (context: ProjectContext) => void): void {
    this.contextUpdateCallbacks.add(callback);
  }

  /**
   * Remove context update callback
   */
  offContextUpdate(callback: (context: ProjectContext) => void): void {
    this.contextUpdateCallbacks.delete(callback);
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    this.isWatching = false;
    
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }
    
    if (this.gitWatcher) {
      this.gitWatcher.dispose();
      this.gitWatcher = null;
    }
    
    this.contextUpdateCallbacks.clear();
    this.contextCache.clear();
    this.projectContext = null;
  }
}

export default ContextManager;
