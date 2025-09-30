import React, { useMemo } from 'react';
import { Search, Bot, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Agent } from '../types/api';

interface AgentListSidebarProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onSelectAgent: (agent: Agent) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  loading?: boolean;
  className?: string;
}

interface AgentListItemProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * AgentListSidebar - Displays searchable list of agents in master-detail layout
 * Features:
 * - Sticky search bar
 * - Compact agent cards with avatars and status
 * - Selected state highlighting
 * - Empty and loading states
 * - Responsive design (fixed width 320px)
 */
const AgentListSidebar: React.FC<AgentListSidebarProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  searchTerm,
  onSearchChange,
  loading = false,
  className = '',
}) => {
  // Filter agents based on search term (client-side filtering)
  const filteredAgents = useMemo(() => {
    if (!searchTerm) return agents;

    const term = searchTerm.toLowerCase();
    return agents.filter((agent) => {
      const name = agent.name || '';
      const displayName = agent.display_name || '';
      const description = agent.description || '';
      const slug = agent.slug || '';

      return (
        name.toLowerCase().includes(term) ||
        displayName.toLowerCase().includes(term) ||
        description.toLowerCase().includes(term) ||
        slug.toLowerCase().includes(term)
      );
    });
  }, [agents, searchTerm]);

  return (
    <div
      className={`w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full ${className}`}
      data-testid="agent-list-sidebar"
    >
      {/* Search Header - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Agents</h2>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            data-testid="agent-search-input"
            aria-label="Search agents"
          />
        </div>

        {/* Results Count */}
        <div className="mt-2 text-xs text-gray-500">
          {filteredAgents.length} of {agents.length} agents
        </div>
      </div>

      {/* Agent List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingState />
        ) : filteredAgents.length === 0 ? (
          <EmptyState hasSearch={searchTerm.length > 0} />
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAgents.map((agent) => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                onClick={() => onSelectAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * AgentListItem - Individual agent card in sidebar
 * Memoized to prevent unnecessary re-renders
 */
const AgentListItem: React.FC<AgentListItemProps> = React.memo(
  ({ agent, isSelected, onClick }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'inactive':
          return 'bg-yellow-100 text-yellow-800';
        case 'error':
          return 'bg-red-100 text-red-800';
        case 'maintenance':
          return 'bg-blue-100 text-blue-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'active':
          return <CheckCircle className="w-3 h-3" />;
        case 'inactive':
          return <Clock className="w-3 h-3" />;
        case 'error':
          return <AlertCircle className="w-3 h-3" />;
        case 'maintenance':
          return <Clock className="w-3 h-3" />;
        default:
          return <Clock className="w-3 h-3" />;
      }
    };

    const getStatusDot = (status: string) => {
      switch (status) {
        case 'active':
          return 'bg-green-500';
        case 'inactive':
          return 'bg-yellow-500';
        case 'error':
          return 'bg-red-500';
        case 'maintenance':
          return 'bg-blue-500';
        default:
          return 'bg-gray-500';
      }
    };

    return (
      <button
        onClick={onClick}
        className={`
          w-full p-3 text-left transition-all hover:bg-gray-50
          ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}
        `}
        data-testid="agent-list-item"
        data-agent-id={agent.id}
        aria-label={`Select ${agent.display_name || agent.name}`}
        aria-selected={isSelected}
      >
        <div className="flex items-start gap-3">
          {/* Avatar with Agent Color */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative"
            style={{ backgroundColor: agent.avatar_color || '#6B7280' }}
          >
            <Bot className="w-5 h-5 text-white" />
            {/* Status Dot Indicator */}
            <div
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusDot(
                agent.status
              )}`}
              title={agent.status}
            />
          </div>

          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <h3 className="font-medium text-sm text-gray-900 truncate mb-1">
              {agent.display_name || agent.name}
            </h3>

            {/* Description - Truncated to 2 lines */}
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {agent.description || `Agent ${agent.id} - No description available`}
            </p>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  agent.status
                )}`}
              >
                {getStatusIcon(agent.status)}
                {agent.status}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these specific props change (performance optimization)
    return (
      prevProps.agent.id === nextProps.agent.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.agent.status === nextProps.agent.status &&
      prevProps.agent.name === nextProps.agent.name &&
      prevProps.agent.display_name === nextProps.agent.display_name &&
      prevProps.agent.description === nextProps.agent.description
    );
  }
);

AgentListItem.displayName = 'AgentListItem';

/**
 * LoadingState - Skeleton loaders for agent items
 */
const LoadingState: React.FC = () => {
  return (
    <div className="divide-y divide-gray-100" data-testid="loading-state">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-3 animate-pulse">
          <div className="flex items-start gap-3">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
            {/* Content skeleton */}
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * EmptyState - No agents or search results found
 */
const EmptyState: React.FC<{ hasSearch: boolean }> = ({ hasSearch }) => {
  return (
    <div className="flex items-center justify-center h-64 p-6" data-testid="empty-state">
      <div className="text-center">
        <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {hasSearch ? 'No agents found' : 'No agents available'}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          {hasSearch
            ? 'No agents match your search criteria. Try adjusting your search term.'
            : 'No agents have been created yet. Create an agent to get started.'}
        </p>
      </div>
    </div>
  );
};

export default AgentListSidebar;
