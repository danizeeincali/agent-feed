/**
 * Unified Mention Service
 * Provides consistent @mention functionality across all components
 */

export interface MentionSuggestion {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  avatar?: string;
  type?: string;
}

export interface MentionConfig {
  maxSuggestions?: number;
  debounceMs?: number;
  allowCustomAgents?: boolean;
  filterByType?: string[];
}

class MentionServiceImpl {
  private static instance: MentionServiceImpl;
  private cache: Map<string, MentionSuggestion[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Mock agent data - in production this would come from API
  // CRITICAL FIX: Remove readonly to allow emergency recovery
  private agents: MentionSuggestion[] = [
    {
      id: 'chief-of-staff',
      name: 'chief-of-staff-agent',
      displayName: 'Chief of Staff',
      description: 'Strategic coordination and planning',
      type: 'coordinator'
    },
    {
      id: 'personal-todos',
      name: 'personal-todos-agent',
      displayName: 'Personal Todos',
      description: 'Task and project management',
      type: 'planner'
    },
    {
      id: 'meeting-prep',
      name: 'meeting-prep-agent',
      displayName: 'Meeting Prep',
      description: 'Meeting preparation and coordination',
      type: 'coordinator'
    },
    {
      id: 'impact-filter',
      name: 'impact-filter-agent',
      displayName: 'Impact Filter',
      description: 'Business impact analysis',
      type: 'analyst'
    },
    {
      id: 'goal-analyst',
      name: 'goal-analyst-agent',
      displayName: 'Goal Analyst',
      description: 'Goal tracking and analysis',
      type: 'analyst'
    },
    {
      id: 'opportunity-scout',
      name: 'opportunity-scout-agent',
      displayName: 'Opportunity Scout',
      description: 'Market opportunity identification',
      type: 'researcher'
    },
    {
      id: 'code-reviewer',
      name: 'code-reviewer-agent',
      displayName: 'Code Reviewer',
      description: 'Code quality and security analysis',
      type: 'reviewer'
    },
    {
      id: 'bug-hunter',
      name: 'bug-hunter-agent',
      displayName: 'Bug Hunter',
      description: 'Issue detection and debugging',
      type: 'tester'
    },
    {
      id: 'tech-reviewer',
      name: 'TechReviewer',
      displayName: 'Tech Reviewer',
      description: 'Technical analysis and review',
      type: 'reviewer'
    },
    {
      id: 'system-validator',
      name: 'SystemValidator',
      displayName: 'System Validator',
      description: 'System validation and testing',
      type: 'validator'
    },
    {
      id: 'code-auditor',
      name: 'CodeAuditor',
      displayName: 'Code Auditor',
      description: 'Code audit and compliance',
      type: 'auditor'
    },
    {
      id: 'quality-assurance',
      name: 'QualityAssurance',
      displayName: 'Quality Assurance',
      description: 'Quality assurance and testing',
      type: 'tester'
    },
    {
      id: 'performance-analyst',
      name: 'PerformanceAnalyst',
      displayName: 'Performance Analyst',
      description: 'Performance analysis and optimization',
      type: 'analyst'
    }
  ];

  constructor() {
    console.log('🔄 MentionServiceImpl constructor called');
    console.log('🔍 Constructor: agents array initialized:', {
      hasAgents: !!this.agents,
      isArray: Array.isArray(this.agents),
      length: this.agents ? this.agents.length : 'UNDEFINED',
      firstAgent: this.agents?.[0]?.displayName || 'NONE'
    });
    
    // CRITICAL FIX: Ensure agents array is never undefined
    if (!this.agents || !Array.isArray(this.agents) || this.agents.length === 0) {
      console.error('🚨 CONSTRUCTOR CRITICAL: Agents array is invalid, reinitializing...');
      this.agents = this.getDefaultAgents();
      console.log('✅ CONSTRUCTOR: Agents reinitialized with', this.agents.length, 'agents');
    }
  }
  
  private getDefaultAgents(): MentionSuggestion[] {
    return [
      {
        id: 'chief-of-staff',
        name: 'chief-of-staff-agent',
        displayName: 'Chief of Staff',
        description: 'Strategic coordination and planning',
        type: 'coordinator'
      },
      {
        id: 'personal-todos',
        name: 'personal-todos-agent',
        displayName: 'Personal Todos',
        description: 'Task and project management',
        type: 'planner'
      },
      {
        id: 'meeting-prep',
        name: 'meeting-prep-agent',
        displayName: 'Meeting Prep',
        description: 'Meeting preparation and coordination',
        type: 'coordinator'
      },
      {
        id: 'code-reviewer',
        name: 'code-reviewer-agent',
        displayName: 'Code Reviewer',
        description: 'Code quality and security analysis',
        type: 'reviewer'
      },
      {
        id: 'bug-hunter',
        name: 'bug-hunter-agent',
        displayName: 'Bug Hunter',
        description: 'Issue detection and debugging',
        type: 'tester'
      }
    ];
  }

  public static getInstance(): MentionServiceImpl {
    if (!MentionServiceImpl.instance) {
      console.log('🔄 Creating new MentionService instance');
      MentionServiceImpl.instance = new MentionServiceImpl();
      console.log('✅ MentionService instance created, agents length:', MentionServiceImpl.instance.agents?.length || 'UNDEFINED');
    }
    return MentionServiceImpl.instance;
  }

  /**
   * Search for mention suggestions based on query
   */
  public async searchMentions(
    query: string = '',
    config: MentionConfig = {}
  ): Promise<MentionSuggestion[]> {
    // CRITICAL FIX: Validate and sanitize query parameter
    const sanitizedQuery = typeof query === 'string' ? query : '';
    console.log('🔄 EMERGENCY DEBUG MentionService: searchMentions called', {
      originalQuery: query,
      queryType: typeof query,
      sanitizedQuery,
      config,
      totalAgents: this.agents ? this.agents.length : 'UNDEFINED'
    });

    // CRITICAL FIX: Validate agents array exists first
    if (!this.agents || !Array.isArray(this.agents) || this.agents.length === 0) {
      console.error('🚨 CRITICAL: MentionService.agents is invalid:', {
        hasAgents: !!this.agents,
        isArray: Array.isArray(this.agents),
        length: this.agents ? this.agents.length : 'N/A'
      });

      // EMERGENCY RECOVERY: Try to reinitialize agents
      console.log('🚨 EMERGENCY RECOVERY: Attempting to reinitialize agents...');
      try {
        this.agents = this.getDefaultAgents();
        console.log('✅ EMERGENCY RECOVERY: Agents reinitialized with', this.agents.length, 'agents');
      } catch (recoveryError) {
        console.error('🚨 EMERGENCY RECOVERY FAILED:', recoveryError);
        // Return fallback agents instead of empty array
        return [{
          id: 'fallback-agent',
          name: 'emergency-agent',
          displayName: 'Emergency Agent',
          description: 'Fallback agent when service fails',
          type: 'fallback'
        }];
      }

      // Verify recovery worked
      if (!this.agents || !Array.isArray(this.agents) || this.agents.length === 0) {
        console.error('🚨 EMERGENCY RECOVERY FAILED: Agents still invalid after recovery attempt');
        // Return fallback agents instead of empty array
        return [{
          id: 'fallback-agent',
          name: 'emergency-agent',
          displayName: 'Emergency Agent',
          description: 'Fallback agent when service fails',
          type: 'fallback'
        }];
      }
    }
    
    const {
      maxSuggestions = 8,
      filterByType = [],
      allowCustomAgents = false
    } = config;

    // CRITICAL FIX: Handle empty query FIRST - always return all agents for empty queries
    if (!sanitizedQuery || sanitizedQuery.trim() === '') {
      console.log('🚨 CRITICAL FIX: Empty query detected, returning all agents');
      const emptyQueryResults = this.agents.slice(0, maxSuggestions);
      console.log('🚨 CRITICAL FIX: Empty query results:', emptyQueryResults.length, emptyQueryResults.map(r => r.displayName));
      
      // Cache empty query results
      const cacheKey = `${sanitizedQuery}-${JSON.stringify(filterByType)}-${maxSuggestions}`;
      this.cache.set(cacheKey, emptyQueryResults);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return emptyQueryResults;
    }

    // Check cache for non-empty queries
    const cacheKey = `${sanitizedQuery}-${JSON.stringify(filterByType)}-${maxSuggestions}`;
    if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey);
      console.log('📋 Cache hit for query:', query, 'results:', cachedResult ? cachedResult.length : 'UNDEFINED');
      return cachedResult || [];
    }

    // Filter agents
    let filteredAgents = [...this.agents]; // Create a copy to avoid mutations

    // Filter by type if specified
    if (filterByType.length > 0) {
      filteredAgents = filteredAgents.filter(agent => 
        filterByType.includes(agent.type || '')
      );
    }

    // Search by query (we know sanitizedQuery is not empty at this point)
    const lowercaseQuery = sanitizedQuery.toLowerCase();
    filteredAgents = filteredAgents.filter(agent =>
      agent.name.toLowerCase().includes(lowercaseQuery) ||
      agent.displayName.toLowerCase().includes(lowercaseQuery) ||
      (agent.description && agent.description.toLowerCase().includes(lowercaseQuery))
    );

    // Sort by relevance (exact matches first, then partial matches)
    filteredAgents.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().startsWith(lowercaseQuery);
      const bNameMatch = b.name.toLowerCase().startsWith(lowercaseQuery);
      const aDisplayMatch = a.displayName.toLowerCase().startsWith(lowercaseQuery);
      const bDisplayMatch = b.displayName.toLowerCase().startsWith(lowercaseQuery);

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      if (aDisplayMatch && !bDisplayMatch) return -1;
      if (!aDisplayMatch && bDisplayMatch) return 1;

      return a.displayName.localeCompare(b.displayName);
    });

    // Limit results
    const results = filteredAgents.slice(0, maxSuggestions);

    // EMERGENCY FALLBACK: If search returns no results, provide some agents
    let finalResults = results;
    if (results.length === 0) {
      console.log('🚨 EMERGENCY: Search returned no results for query:', sanitizedQuery, '- providing fallback agents');
      finalResults = this.agents.slice(0, Math.min(3, maxSuggestions));
    }

    // Cache results
    this.cache.set(cacheKey, finalResults);
    this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

    console.log('✅ EMERGENCY DEBUG MentionService: returning results', { 
      originalQuery: query,
      sanitizedQuery, 
      count: finalResults.length, 
      maxSuggestions,
      results: finalResults.map(r => ({ id: r.id, name: r.name, displayName: r.displayName, type: r.type }))
    });
    
    return finalResults;
  }

  /**
   * Get all available agents
   */
  public getAllAgents(): MentionSuggestion[] {
    console.log('📋 EMERGENCY DEBUG MentionService: getAllAgents called', {
      hasAgents: !!this.agents,
      agentsLength: this.agents ? this.agents.length : 'N/A',
      isArray: Array.isArray(this.agents)
    });
    
    if (!this.agents || !Array.isArray(this.agents)) {
      console.error('🚨 CRITICAL: getAllAgents - agents is invalid:', this.agents);
      return [];
    }
    
    return [...this.agents];
  }

  /**
   * Get agent by ID
   */
  public getAgentById(id: string): MentionSuggestion | null {
    return this.agents.find(agent => agent.id === id) || null;
  }

  /**
   * Get agents by type
   */
  public getAgentsByType(type: string): MentionSuggestion[] {
    return this.agents.filter(agent => agent.type === type);
  }

  /**
   * Extract mentions from text content
   */
  public extractMentions(content: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9-_]+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map(match => match.slice(1)) : [];
  }

  /**
   * Validate mention name
   */
  public validateMention(name: string): boolean {
    return this.agents.some(agent => agent.name === name);
  }

  /**
   * Get quick mention suggestions for specific contexts
   */
  public getQuickMentions(context: 'post' | 'comment' | 'quick-post' = 'post'): MentionSuggestion[] {
    console.log('📋 EMERGENCY DEBUG MentionService: getQuickMentions called', { 
      context, 
      totalAgents: this.agents ? this.agents.length : 'UNDEFINED',
      agentsArray: this.agents,
      thisContext: this
    });
    
    // CRITICAL CHECK: Ensure agents array exists
    if (!this.agents) {
      console.error('🚨 CRITICAL ERROR: MentionService.agents is undefined!');
      return [];
    }
    
    if (!Array.isArray(this.agents)) {
      console.error('🚨 CRITICAL ERROR: MentionService.agents is not an array:', typeof this.agents);
      return [];
    }
    
    if (this.agents.length === 0) {
      console.error('🚨 CRITICAL ERROR: MentionService.agents is empty array!');
      return [];
    }
    
    console.log('✅ AGENTS VALIDATION: Found', this.agents.length, 'agents');
    
    // EMERGENCY FIX: Always return some results
    let results: MentionSuggestion[] = [];
    
    switch (context) {
      case 'comment':
        results = this.agents.filter(agent => 
          ['reviewer', 'analyst', 'tester'].includes(agent.type || '')
        ).slice(0, 5);
        
        // EMERGENCY FALLBACK: If no matching agents, return first 5
        if (results.length === 0) {
          console.log('🚨 EMERGENCY: No comment agents found, using first 5 agents');
          results = this.agents.slice(0, 5);
        }
        break;
      
      case 'quick-post':
        results = this.agents.filter(agent => 
          ['coordinator', 'planner', 'reviewer'].includes(agent.type || '')
        ).slice(0, 5);
        
        // EMERGENCY FALLBACK: If no matching agents, return first 5
        if (results.length === 0) {
          console.log('🚨 EMERGENCY: No quick-post agents found, using first 5 agents');
          results = this.agents.slice(0, 5);
        }
        break;
      
      case 'post':
      default:
        results = this.agents.slice(0, 6);
        break;
    }
    
    console.log('📋 EMERGENCY DEBUG MentionService: getQuickMentions results', { 
      context, 
      count: results.length, 
      totalAgents: this.agents.length,
      results: results.map(r => ({ id: r.id, name: r.name, displayName: r.displayName, type: r.type }))
    });
    
    // EMERGENCY VALIDATION: Never return empty array
    if (results.length === 0) {
      console.error('🚨 CRITICAL: MentionService returning empty results! Something is wrong.');
      // Return hardcoded emergency agents
      results = [
        {
          id: 'emergency-1',
          name: 'emergency-agent',
          displayName: 'Emergency Agent',
          description: 'Emergency fallback when service fails'
        }
      ];
    }
    
    return results;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
}

// Export singleton instance
export const MentionService = MentionServiceImpl.getInstance();

// Auto-clean cache every 10 minutes
setInterval(() => {
  (MentionService as any).cleanCache();
}, 10 * 60 * 1000);

export default MentionService;