import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle, Bot } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Agent, ApiResponse } from '../types/api';
import { useRoute } from './RouteWrapper';
import { createApiService } from '../services/apiServiceIsolated';
import AgentListSidebar from './AgentListSidebar';
import WorkingAgentProfile from './WorkingAgentProfile';
import { generateSlug } from '@/utils/slugify';
import { useAgentTierFilter } from '../hooks/useAgentTierFilter';
import { AgentTierToggle } from './agents/AgentTierToggle';
import { AgentTierBadge } from './agents/AgentTierBadge';
import { AgentIcon } from './agents/AgentIcon';
import { ProtectionBadge } from './agents/ProtectionBadge';

interface IsolatedRealAgentManagerProps {
  className?: string;
}

/**
 * IsolatedRealAgentManager - Route-isolated version with proper cleanup
 * Prevents conflicts with other routes through API service isolation
 */
const IsolatedRealAgentManager: React.FC<IsolatedRealAgentManagerProps> = ({ className = '' }) => {
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { routeKey, registerCleanup } = useRoute();
  const { agentSlug } = useParams<{ agentSlug?: string }>();
  const navigate = useNavigate();

  // Create isolated API service for this route
  const [apiService] = useState(() => createApiService(routeKey));

  // Tier filtering hook with localStorage persistence
  const { currentTier, setCurrentTier, showTier1, showTier2 } = useAgentTierFilter();

  // Real data loading with cleanup
  const loadAgents = useCallback(async () => {
    try {
      setError(null);
      // Always fetch ALL agents for client-side filtering
      const response: any = await apiService.getAgents({ tier: 'all' });
      if (!apiService.getStatus().isDestroyed) {
        // Handle actual API response format: {success: true, agents: [...], totalAgents: 3}
        const agentsData = response.agents || response.data || [];
        setAllAgents(agentsData);
        console.log(`✅ Loaded ${agentsData.length} total agents`);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !apiService.getStatus().isDestroyed) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
        console.error('❌ Error loading agents:', err);
      }
    } finally {
      if (!apiService.getStatus().isDestroyed) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [apiService]); // Remove currentTier from dependencies

  // Client-side filtering
  const displayedAgents = useMemo(() => {
    if (currentTier === 'all') return allAgents;
    const tierNum = Number(currentTier);
    return allAgents.filter(a => a.tier === tierNum);
  }, [allAgents, currentTier]);

  // Tier counts from ALL agents
  const tierCounts = useMemo(() => ({
    tier1: allAgents.filter(a => a.tier === 1).length,
    tier2: allAgents.filter(a => a.tier === 2).length,
    total: allAgents.length
  }), [allAgents]);

  // Sync selected agent with URL
  useEffect(() => {
    if (agentSlug && displayedAgents.length > 0) {
      const agent = displayedAgents.find(a => a.slug === agentSlug);
      if (agent) {
        setSelectedAgentId(agent.id);
      }
    } else if (!agentSlug && displayedAgents.length > 0 && !selectedAgentId) {
      // Auto-select first agent if no slug in URL
      const firstAgent = displayedAgents[0];
      setSelectedAgentId(firstAgent.id);
      // UPDATED: Use agent.slug if available, otherwise generate from agent.name
      const slug = firstAgent.slug || generateSlug(firstAgent.name);
      navigate(`/agents/${slug}`, { replace: true });
    }
  }, [agentSlug, displayedAgents, selectedAgentId, navigate]);

  // Component lifecycle effect - runs ONLY on mount/unmount or route change
  // Does NOT run when tier changes (loadAgents removed from dependencies)
  useEffect(() => {
    console.log(`🚀 IsolatedRealAgentManager mounted for route: ${routeKey}`);

    // Initial load
    loadAgents();

    // Listen for real-time agent updates
    const handleAgentsUpdate = (updatedAgent: Agent) => {
      if (apiService.getStatus().isDestroyed) return;

      setAllAgents(current => {
        const index = current.findIndex(agent => agent.id === updatedAgent.id);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = updatedAgent;
          return updated;
        } else {
          return [updatedAgent, ...current];
        }
      });
    };

    apiService.on('agents_updated', handleAgentsUpdate);

    // Register cleanup function - ONLY runs on route change or unmount
    const cleanup = () => {
      console.log(`🧹 Cleaning up IsolatedRealAgentManager for ${routeKey}`);
      apiService.destroy();
      setAllAgents([]);
      setError(null);
      setLoading(false);
    };

    registerCleanup(cleanup);

    return cleanup;
  }, [routeKey, apiService, registerCleanup]);
  // ✅ loadAgents intentionally removed from dependencies to prevent cleanup on tier change
  // ✅ Tier change effect removed - client-side filtering handles tier changes instantly

  // Real agent operations with error handling
  const handleRefresh = async () => {
    if (apiService.getStatus().isDestroyed) return;
    setRefreshing(true);
    await loadAgents();
  };

  // Selection handler
  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    // UPDATED: Use agent.slug if available, otherwise generate from agent.name
    const slug = agent.slug || generateSlug(agent.name);
    navigate(`/agents/${slug}`);
  };

  // Check if service is destroyed
  if (apiService.getStatus().isDestroyed) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Route Disconnected</h3>
          <p className="text-gray-500 dark:text-gray-400">This component has been cleaned up.</p>
        </div>
      </div>
    );
  }

  // Get selected agent details (from displayed agents)
  const selectedAgent = displayedAgents.find(agent => agent.id === selectedAgentId);

  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="flex items-center justify-center w-full">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <span className="text-gray-600 dark:text-gray-400">Loading isolated agent data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" data-testid="isolated-agent-manager">
      {/* Sidebar */}
      <AgentListSidebar
        agents={displayedAgents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        loading={false}
        tierFilterEnabled={true}
        currentTier={currentTier}
        onTierChange={setCurrentTier}
        tierCounts={tierCounts}
        renderAgentBadges={(agent) => (
          <>
            <AgentTierBadge tier={agent.tier || 1} variant="compact" />
            {agent.visibility === 'protected' && (
              <ProtectionBadge
                isProtected={true}
                protectionReason="System agent - protected from modification"
              />
            )}
          </>
        )}
        renderAgentIcon={(agent) => (
          <AgentIcon
            agent={{
              name: agent.name,
              icon: agent.icon,
              icon_type: agent.icon_type,
              icon_emoji: agent.icon_emoji,
              tier: agent.tier
            }}
            size="md"
          />
        )}
      />

      {/* Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        {/* Header with Refresh */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Agent Manager</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Route: {routeKey} | API Status: {apiService.getStatus().isDestroyed ? 'Destroyed' : 'Active'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Tier toggle */}
              <AgentTierToggle
                currentTier={currentTier}
                onTierChange={setCurrentTier}
                tierCounts={tierCounts}
                loading={loading || refreshing}
              />

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors text-gray-900 dark:text-gray-100"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700 text-xl leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Content Area */}
        {selectedAgent ? (
          <WorkingAgentProfile />
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center py-12 px-6">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                {displayedAgents.length === 0 ? 'No agents available' : 'Select an agent'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {displayedAgents.length === 0
                  ? 'No agents match the current filter.'
                  : 'Choose an agent from the sidebar to view details and manage their configuration.'}
              </p>
            </div>
          </div>
        )}

        {/* Debug Status Bar */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
              Isolated API Service ({routeKey}) - {apiService.getStatus().activeRequests} active requests
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IsolatedRealAgentManager;