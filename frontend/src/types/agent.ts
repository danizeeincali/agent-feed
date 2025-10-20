export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: 1 | 2;
  visibility: 'public' | 'protected';
  icon?: string;
  icon_type?: 'svg' | 'emoji';
  icon_emoji?: string;
  posts_as_self?: boolean;
  show_in_default_feed?: boolean;
  status?: string;
  priority?: string;
  tools?: string[];
  color?: string;
  avatar_url?: string | null;
}

export interface AgentListResponse {
  success: boolean;
  data: Agent[];
  metadata: {
    total: number;
    tier1: number;
    tier2: number;
    protected: number;
    filtered: number;
    appliedTier: string;
  };
  timestamp: string;
  source: string;
}

export type TierFilter = '1' | '2' | 'all';

export interface AgentFilterState {
  currentTier: TierFilter;
  tierCounts: {
    tier1: number;
    tier2: number;
    total: number;
  };
}
