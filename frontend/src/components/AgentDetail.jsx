/**
 * AgentDetail - Main agent detail page with tab navigation
 * Phase 2: Enhanced agent detail view with comprehensive information display
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ArrowLeft,
  Zap,
  Clock,
  Activity,
  Settings,
  FileText,
  User,
  FolderOpen,
  Globe,
  RotateCcw,
  ExternalLink,
  Download,
  Heart,
  Star,
  Share2
} from 'lucide-react';
import { cn } from '../lib/utils';
import '../styles/mobile-responsive.css';

// Import sub-components for different tabs
import AgentDefinition from './AgentDefinition';
import AgentProfile from './AgentProfile';  
import AgentPages from './AgentPages';
import AgentFileSystem from './AgentFileSystem';

const AgentDetail = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Fetch agent details from API
   */
  const fetchAgentDetail = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAgent(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch agent details:', err);
      setError(err.message);
      
      // Fallback to mock data for development
      setAgent({
        id: agentId,
        name: `${agentId.charAt(0).toUpperCase() + agentId.slice(1).replace(/-/g, ' ')}`,
        description: 'Advanced AI agent with specialized capabilities for complex task automation and intelligent decision making.',
        category: 'Development',
        status: 'active',
        version: '2.1.0',
        capabilities: ['Code Generation', 'Testing', 'Documentation', 'Analysis'],
        tags: ['ai', 'automation', 'intelligent'],
        metadata: {
          fileCount: 24,
          languages: ['TypeScript', 'Python', 'JavaScript'],
          lastActive: new Date().toISOString(),
          author: 'SPARC Team',
          license: 'MIT',
          repository: 'https://github.com/sparc/agents',
          documentation: 'https://docs.sparc.ai/agents'
        },
        size: 5242880,
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        definition: `# ${agentId.charAt(0).toUpperCase() + agentId.slice(1).replace(/-/g, ' ')} Agent\n\nThis agent specializes in automated task execution with advanced AI capabilities.\n\n## Features\n\n- Intelligent task analysis\n- Automated execution\n- Real-time monitoring\n- Comprehensive reporting\n\n## Usage\n\n\`\`\`javascript\nconst agent = new Agent('${agentId}');\nawait agent.execute(task);\n\`\`\``,
        profile: {
          purpose: 'Automate complex workflows with intelligent decision-making capabilities',
          strengths: ['Pattern Recognition', 'Process Optimization', 'Quality Assurance'],
          useCases: ['CI/CD Pipeline', 'Code Review', 'Testing Automation'],
          limitations: ['Requires clear task definitions', 'Limited to programmatic tasks']
        },
        pages: [
          { id: 'getting-started', title: 'Getting Started', path: '/docs/getting-started' },
          { id: 'api-reference', title: 'API Reference', path: '/docs/api' },
          { id: 'examples', title: 'Examples', path: '/docs/examples' },
          { id: 'changelog', title: 'Changelog', path: '/docs/changelog' }
        ],
        workspace: {
          rootPath: `/agents/${agentId}`,
          structure: [
            { type: 'folder', name: 'src', path: 'src/', children: 5 },
            { type: 'folder', name: 'tests', path: 'tests/', children: 8 },
            { type: 'folder', name: 'docs', path: 'docs/', children: 4 },
            { type: 'file', name: 'package.json', path: 'package.json', size: 1024 },
            { type: 'file', name: 'README.md', path: 'README.md', size: 2048 },
            { type: 'file', name: 'agent.config.js', path: 'agent.config.js', size: 512 }
          ]
        }
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load agent details on mount
  useEffect(() => {
    if (agentId) {
      fetchAgentDetail();
    }
  }, [agentId]);

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    navigate('/agents');
  };

  /**
   * Manual refresh
   */
  const handleRefresh = () => {
    fetchAgentDetail();
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
        return <Zap className="w-4 h-4" />;
      case 'idle':
        return <Clock className="w-4 h-4" />;
      case 'error':
        return <Activity className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading agent details...</span>
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Failed to Load Agent</span>
          </div>
          <p className="text-red-600 text-sm mb-4">
            Could not fetch details for agent "{agentId}": {error}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
            <Button onClick={handleRefresh}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
            <p className="text-gray-600">{agent.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Heart className="w-4 h-4 mr-2" />
            Favorite
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RotateCcw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Agent Overview Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent Icon and Basic Info */}
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-16 h-16 rounded-xl flex items-center justify-center',
                agent.isActive ? 'bg-green-100' : 'bg-gray-100'
              )}>
                <Zap className={cn(
                  'w-8 h-8',
                  agent.isActive ? 'text-green-600' : 'text-gray-400'
                )} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={getStatusVariant(agent.status)} className="flex items-center gap-1">
                    {getStatusIcon(agent.status)}
                    {agent.status}
                  </Badge>
                  <Badge variant="outline">v{agent.version}</Badge>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="font-medium">Category:</span> {agent.category}</p>
                  <p><span className="font-medium">Size:</span> {formatSize(agent.size)}</p>
                  <p><span className="font-medium">Files:</span> {agent.metadata?.fileCount || 0}</p>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Capabilities</h3>
              <div className="flex flex-wrap gap-2" data-testid="agent-capabilities">
                {agent.capabilities?.map((capability, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Information</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <div>
                  <span className="font-medium">Created:</span><br />
                  {formatDate(agent.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span><br />
                  {formatDate(agent.updatedAt)}
                </div>
                {agent.metadata?.lastActive && (
                  <div>
                    <span className="font-medium">Last Active:</span><br />
                    {formatDate(agent.metadata.lastActive)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {agent.tags && agent.tags.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {agent.tags.map((tag, index) => (
                  <span key={index} className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Connection Warning</span>
          </div>
          <p className="text-yellow-600 text-sm mt-1">
            Some data may be cached due to API connection issues: {error}
          </p>
        </div>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Definition
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="filesystem" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Workspace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AgentDefinition agent={agent} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <AgentProfile agent={agent} />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <AgentPages agent={agent} />
        </TabsContent>

        <TabsContent value="filesystem" className="mt-6">
          <AgentFileSystem agent={agent} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgentDetail;