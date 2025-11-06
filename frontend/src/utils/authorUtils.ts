// Known agent IDs - do NOT lookup in user_settings
const KNOWN_AGENTS = [
  'avi', 'lambda-vi',
  'anonymous', 'user-agent', 'system', // System-level identifiers used by backend
  'get-to-know-you-agent',
  'personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'
];

// Agent display name mappings
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'avi': 'Λvi',
  'lambda-vi': 'Λvi',
  'anonymous': 'Λvi', // CRITICAL: Backend uses 'anonymous' for Avi comments
  'user-agent': 'System',
  'system': 'Λvi', // Legacy 'system' agent posts now display as Λvi
  'get-to-know-you-agent': 'Get-to-Know-You',
  'personal-todos-agent': 'Personal Todos',
  'agent-ideas-agent': 'Agent Ideas',
  'link-logger-agent': 'Link Logger'
};

export function isAgentId(id: string): boolean {
  return KNOWN_AGENTS.includes(id);
}

export function getAgentDisplayName(agentId: string): string {
  return AGENT_DISPLAY_NAMES[agentId] || agentId;
}
