/**
 * Human-readable descriptions for Claude Code tools
 * Used in Agent Manager to explain what each tool does
 */

export const TOOL_DESCRIPTIONS: Record<string, string> = {
  // Core File Tools
  'Read': 'Read files from the filesystem to access and analyze code, documentation, and data',
  'Write': 'Create and modify files to implement features, fix bugs, and update documentation',
  'Edit': 'Make precise changes to existing files using exact string replacement',
  'MultiEdit': 'Perform multiple simultaneous edits across different files efficiently',
  'NotebookEdit': 'Edit Jupyter notebook cells for data science and analysis work',
  'LS': 'List directory contents to explore project structure and file organization',

  // Search Tools
  'Grep': 'Search file contents using powerful regex patterns to find code and text',
  'Glob': 'Find files by name patterns across the entire codebase',

  // Execution Tools
  'Bash': 'Execute terminal commands for git operations, package management, and system tasks',
  'BashOutput': 'Monitor output from background shell processes',
  'KillShell': 'Terminate running background shell processes',

  // Web Tools
  'WebFetch': 'Fetch and analyze web content from URLs',
  'WebSearch': 'Search the web for current information and documentation',

  // Agent Tools
  'Task': 'Launch specialized AI agents to handle complex, multi-step tasks autonomously',
  'SlashCommand': 'Execute custom slash commands defined in project configuration',

  // Planning & Organization
  'TodoWrite': 'Track task progress and manage todo lists during development',
  'ExitPlanMode': 'Exit planning mode and begin code implementation',

  // MCP Tools (Model Context Protocol)
  'mcp__ide__getDiagnostics': 'Get language diagnostics from VS Code IDE',
  'mcp__ide__executeCode': 'Execute Python code in Jupyter kernel',

  // MCP Flow Nexus Tools
  'mcp__flow-nexus__*': 'Access Flow Nexus distributed computing and swarm coordination',
  'mcp__flow-nexus__swarm_init': 'Initialize multi-agent swarm with specified topology',
  'mcp__flow-nexus__agent_spawn': 'Create specialized AI agent in swarm',
  'mcp__flow-nexus__task_orchestrate': 'Orchestrate complex tasks across swarm agents',
  'mcp__flow-nexus__sandbox_create': 'Create code execution sandboxes with custom environments',
  'mcp__flow-nexus__sandbox_execute': 'Execute code in isolated sandbox environments',
  'mcp__flow-nexus__neural_train': 'Train neural networks with custom configurations',
  'mcp__flow-nexus__neural_predict': 'Run inference on trained neural models',
  'mcp__flow-nexus__workflow_create': 'Create event-driven workflows with automation',
  'mcp__flow-nexus__seraphina_chat': 'Seek guidance from Queen Seraphina AI advisor',

  // MCP ruv-swarm Tools
  'mcp__ruv-swarm__*': 'Access ruv-swarm distributed agent coordination',
  'mcp__ruv-swarm__swarm_init': 'Initialize swarm with mesh, hierarchical, ring, or star topology',
  'mcp__ruv-swarm__agent_spawn': 'Spawn specialized agents (researcher, coder, analyst, optimizer)',
  'mcp__ruv-swarm__task_orchestrate': 'Orchestrate tasks across distributed agent swarm',
  'mcp__ruv-swarm__daa_agent_create': 'Create decentralized autonomous agent with learning capabilities',
  'mcp__ruv-swarm__daa_workflow_execute': 'Execute autonomous workflows with DAA coordination',
  'mcp__ruv-swarm__neural_train': 'Train neural agents with cognitive patterns',
  'mcp__ruv-swarm__neural_patterns': 'Access convergent, divergent, lateral, and systems thinking patterns',

  // MCP Firecrawl Tools
  'mcp__firecrawl__*': 'Access Firecrawl web scraping and crawling capabilities',
  'mcp__firecrawl__scrape': 'Scrape web pages and extract structured data',
  'mcp__firecrawl__crawl': 'Crawl entire websites and extract content',
  'mcp__firecrawl__map': 'Map website structure and page relationships',

  // MCP Claude Flow Tools
  'mcp__claude-flow__*': 'Access Claude Flow swarm coordination and memory',
  'mcp__claude-flow__swarm_init': 'Initialize Claude Flow swarm for coordination',
  'mcp__claude-flow__agent_spawn': 'Spawn Claude Flow agents',
  'mcp__claude-flow__task_orchestrate': 'Orchestrate tasks with Claude Flow',
  'mcp__claude-flow__memory_usage': 'Access cross-agent memory sharing',

  // List MCP Resources
  'ListMcpResourcesTool': 'List available resources from configured MCP servers',
  'ReadMcpResourceTool': 'Read specific resource from MCP server by URI',

  // Generic/Fallback
  'default': 'Tool for agent operations and automation'
};

/**
 * Get human-readable description for a tool
 * Returns specific description or falls back to generic if not found
 */
export function getToolDescription(toolName: string): string {
  // Handle wildcard patterns (e.g., "mcp__firecrawl__*")
  if (toolName.includes('*')) {
    return TOOL_DESCRIPTIONS[toolName] || TOOL_DESCRIPTIONS['default'];
  }

  // Check for exact match
  if (TOOL_DESCRIPTIONS[toolName]) {
    return TOOL_DESCRIPTIONS[toolName];
  }

  // Check for wildcard parent (e.g., "mcp__flow-nexus__swarm_init" -> "mcp__flow-nexus__*")
  const wildcardKey = toolName.replace(/[^_]+$/, '*');
  if (TOOL_DESCRIPTIONS[wildcardKey]) {
    return TOOL_DESCRIPTIONS[wildcardKey];
  }

  // Fallback to default
  return TOOL_DESCRIPTIONS['default'];
}
