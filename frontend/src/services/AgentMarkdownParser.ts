// Simple markdown parser for agent page configs
export class AgentMarkdownParser {
  static parseAgentConfig(markdownContent: string) {
    // Extract YAML frontmatter between ---
    const frontmatterMatch = markdownContent.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');
    
    let config: any = {};
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (trimmed === 'page_config:') {
        currentSection = 'page_config';
        config.page_config = {};
        continue;
      }
      
      if (currentSection === 'page_config' && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        config.page_config[key.trim()] = value;
      } else if (trimmed.includes(':') && !currentSection) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim().replace(/['"]/g, '');
        config[key.trim()] = value;
      }
    }
    
    return config;
  }

  static async loadAgentConfigs(): Promise<Record<string, any>> {
    // In a real implementation, this would fetch from API
    // For now, return mock data structure
    return {
      'personal-todos-agent': {
        name: 'personal-todos-agent',
        page_config: {
          route: '/agents/personal-todos-agent',
          component: 'PersonalTodosPage',
          data_endpoint: '/api/agents/personal-todos-agent/data',
          layout: 'single'
        }
      }
    };
  }
}