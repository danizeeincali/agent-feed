// Known agent IDs - do NOT lookup in user_settings
const KNOWN_AGENTS = [
  'avi', 'lambda-vi', 'get-to-know-you-agent', 'system',
  'personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'
];

// Agent display name mappings
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'avi': 'Λvi',
  'lambda-vi': 'Λvi',
  'get-to-know-you-agent': 'Get-to-Know-You',
  'system': 'System Guide',
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
