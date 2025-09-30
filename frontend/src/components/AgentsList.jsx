/**
 * AgentsList - Enhanced agents listing component
 * Phase 2: Enhanced UI with shadcn/ui components, real-time updates, and improved UX
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAgentRealTime } from '../hooks/useAgentRealTime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Zap,
  Clock,
  Users,
  Activity,
  Settings,
  Eye,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import '../styles/mobile-responsive.css';

const AgentsList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Real-time agent data
  const { 
    agents, 
    loading, 
    error, 
    isConnected, 
    lastUpdated, 
    refresh 
  } = useAgentRealTime({
    enableRealTime: true,
    pollingInterval: 30000,
    reconnectAttempts: 3
  });

  // UI State management
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'grid');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name');
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Manual refresh handler
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Update URL search params
   */
  const updateSearchParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agents.filter(agent => {
      const matchesSearch = !searchTerm || 
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
        agent.category === selectedCategory;
      
      const matchesStatus = selectedStatus === 'all' || 
        agent.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort agents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [agents, searchTerm, selectedCategory, selectedStatus, sortBy]);

  // Get unique categories and statuses for filters
  const categories = useMemo(() => {
    const cats = [...new Set(agents.map(agent => agent.category))].filter(Boolean);
    return cats.sort();
  }, [agents]);

  const statuses = useMemo(() => {
    const stats = [...new Set(agents.map(agent => agent.status))].filter(Boolean);
    return stats.sort();
  }, [agents]);

  // Real-time connection status indicator
  const connectionStatus = isConnected ? 'Connected' : 'Offline';

  // Update search params when filters change
  useEffect(() => {
    updateSearchParams({
      search: searchTerm,
      category: selectedCategory,
      status: selectedStatus,
      view: viewMode,
      sort: sortBy
    });
  }, [searchTerm, selectedCategory, selectedStatus, viewMode, sortBy]);

  /**
   * Handle agent card click
   */
  const handleAgentClick = (agent) => {
    navigate(`/agents/${agent.slug}`);
  };

  /**
   * Get status badge variant
   */
  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'idle':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'maintenance':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Zap className="w-3 h-3" />;
      case 'idle':
        return <Clock className="w-3 h-3" />;
      case 'error':
        return <Activity className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  /**
   * Format file size
   */
  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading agents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 mobile-spacing">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-600 mt-1">
            {filteredAndSortedAgents.length} of {agents.length} agents
            {lastUpdated && (
              <span className="text-sm text-gray-500 ml-2">
                Last updated: {lastUpdated.toLocaleTimeString()}
                {isConnected && <span className="text-green-600 ml-2">• Live</span>}
                {!isConnected && <span className="text-orange-600 ml-2">• Polling</span>}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RotateCcw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          
          <div className="flex items-center bg-white rounded-lg border">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search agents by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="category">Sort by Category</option>
            <option value="updated">Sort by Updated</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Connection Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">
            Failed to fetch agents from API: {error}
          </p>
          <p className="text-red-500 text-xs mt-1">
            Showing cached data. Click refresh to retry.
          </p>
        </div>
      )}

      {/* Agents Grid/List */}
      {filteredAndSortedAgents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No agents found</h3>
          <p className="text-gray-600 mt-2">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your filters to see more agents.'
              : 'No agents are currently available.'}
          </p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        )}>
          {filteredAndSortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              viewMode={viewMode}
              onClick={() => handleAgentClick(agent)}
              formatSize={formatSize}
              getStatusVariant={getStatusVariant}
              getStatusIcon={getStatusIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Individual Agent Card Component
 */
const AgentCard = ({
  agent,
  viewMode,
  onClick,
  formatSize,
  getStatusVariant,
  getStatusIcon
}) => {
  if (viewMode === 'list') {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex-shrink-0">
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  agent.isActive ? 'bg-green-100' : 'bg-gray-100'
                )}>
                  <Zap className={cn(
                    'w-6 h-6',
                    agent.isActive ? 'text-green-600' : 'text-gray-400'
                  )} />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate" data-testid="agent-name">
                    {agent.name}
                  </h3>
                  <Badge variant={getStatusVariant(agent.status)} className="flex items-center gap-1">
                    {getStatusIcon(agent.status)}
                    {agent.status}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm truncate mb-2">
                  {agent.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span data-testid="agent-category">{agent.category}</span>
                  <span>v{agent.version}</span>
                  <span>{agent.metadata?.fileCount || 0} files</span>
                  <span>{formatSize(agent.size)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1" onClick={onClick} data-testid="agent-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            agent.isActive ? 'bg-green-100' : 'bg-gray-100'
          )}>
            <Zap className={cn(
              'w-5 h-5',
              agent.isActive ? 'text-green-600' : 'text-gray-400'
            )} />
          </div>
          
          <Badge variant={getStatusVariant(agent.status)} className="flex items-center gap-1">
            {getStatusIcon(agent.status)}
            {agent.status}
          </Badge>
        </div>
        
        <div>
          <CardTitle className="text-lg" data-testid="agent-name">{agent.name}</CardTitle>
          <CardDescription className="text-sm mt-1">
            {agent.description}
          </CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Category and Version */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600" data-testid="agent-category">{agent.category}</span>
          <span className="text-gray-500">v{agent.version}</span>
        </div>
        
        {/* Capabilities */}
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              Capabilities
            </h4>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.slice(0, 3).map((capability, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {capability}
                </Badge>
              ))}
              {agent.capabilities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{agent.capabilities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Tags */}
        {agent.tags && agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
            {agent.tags.length > 3 && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                +{agent.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="flex items-center gap-3">
            <span>{agent.metadata?.fileCount || 0} files</span>
            <span>{formatSize(agent.size)}</span>
          </div>
          {agent.metadata?.lastActive && (
            <span>
              {new Date(agent.metadata.lastActive).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentsList;