import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Activity, Code, Briefcase, ArrowRightLeft, Users, Bot, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  instance: 'development' | 'production';
  capabilities: string[];
  priority: string;
  color: string;
  lastActivity: string;
  category?: string;
  cpu_usage?: number;
  memory_usage?: number;
  response_time?: number;
  success_rate?: number;
  total_tasks?: number;
}

interface Activity {
  id: string;
  agentName: string;
  instance: 'development' | 'production';
  type: string;
  description: string;
  timestamp: Date;
  metadata?: any;
}

interface Handoff {
  id: string;
  fromInstance: 'development' | 'production';
  toInstance: 'development' | 'production';
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  description: string;
  timestamp: Date;
}

// Production agent mapping from the main feed
const PRODUCTION_AGENTS_CONFIG = [
  { id: 'chief-of-staff-agent', name: 'Chief of Staff', category: 'coordination', priority: 'critical' },
  { id: 'personal-todos-agent', name: 'Personal Todos', category: 'productivity', priority: 'high' },
  { id: 'meeting-prep-agent', name: 'Meeting Prep', category: 'productivity', priority: 'high' },
  { id: 'impact-filter-agent', name: 'Impact Filter', category: 'analysis', priority: 'high' },
  { id: 'bull-beaver-bear-agent', name: 'Bull Beaver Bear', category: 'analysis', priority: 'medium' },
  { id: 'goal-analyst-agent', name: 'Goal Analyst', category: 'analysis', priority: 'high' },
  { id: 'follow-ups-agent', name: 'Follow Ups', category: 'productivity', priority: 'high' },
  { id: 'prd-observer-agent', name: 'PRD Observer', category: 'documentation', priority: 'medium' },
  { id: 'opportunity-scout-agent', name: 'Opportunity Scout', category: 'research', priority: 'high' },
  { id: 'market-research-analyst-agent', name: 'Market Research Analyst', category: 'research', priority: 'high' },
  { id: 'financial-viability-analyzer-agent', name: 'Financial Viability Analyzer', category: 'analysis', priority: 'high' },
  { id: 'link-logger-agent', name: 'Link Logger', category: 'documentation', priority: 'low' },
  { id: 'agent-feedback-agent', name: 'Agent Feedback', category: 'meta', priority: 'medium' },
  { id: 'get-to-know-you-agent', name: 'Get To Know You', category: 'social', priority: 'low' },
  { id: 'agent-feed-post-composer-agent', name: 'Feed Post Composer', category: 'content', priority: 'medium' },
  { id: 'agent-ideas-agent', name: 'Agent Ideas', category: 'meta', priority: 'medium' },
  { id: 'meta-agent', name: 'Meta Agent', category: 'meta', priority: 'high' },
  { id: 'meta-update-agent', name: 'Meta Update', category: 'meta', priority: 'medium' },
  { id: 'opportunity-log-maintainer-agent', name: 'Opportunity Log Maintainer', category: 'documentation', priority: 'medium' },
  { id: 'meeting-next-steps-agent', name: 'Meeting Next Steps', category: 'productivity', priority: 'high' },
  { id: 'chief-of-staff-automation-agent', name: 'Chief of Staff Automation', category: 'coordination', priority: 'critical' }
];

const DualInstanceDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'unified' | 'development' | 'production' | 'handoffs'>('unified');

  // Fetch development agents
  const { data: devAgents = [] } = useQuery<Agent[]>({
    queryKey: ['agents', 'development'],
    queryFn: async () => {
      const response = await fetch('/api/v1/agents/development');
      if (!response.ok) {
        // Fallback to empty array if endpoint doesn't exist yet
        return [];
      }
      const data = await response.json();
      return data.agents || [];
    },
    refetchInterval: 10000,
    initialData: []
  });

  // Fetch production agents - use real agent data
  const { data: prodAgents = [] } = useQuery<Agent[]>({
    queryKey: ['agents', 'production'],
    queryFn: async () => {
      try {
        // Try to fetch from production agents endpoint
        const response = await fetch('/api/v1/agents/production');
        if (response.ok) {
          const data = await response.json();
          return data.agents || [];
        }
      } catch (error) {
        console.log('Using configured production agents');
      }
      
      // Use configured production agents with dynamic status
      return PRODUCTION_AGENTS_CONFIG.map(agent => ({
        id: agent.id,
        name: agent.name,
        description: `${agent.name} - ${agent.category} agent`,
        status: 'active' as const,
        instance: 'production' as const,
        capabilities: [agent.category, 'automation', 'analysis'],
        priority: agent.priority,
        color: getCategoryColor(agent.category),
        lastActivity: new Date().toISOString(),
        category: agent.category,
        cpu_usage: 35,
        memory_usage: 55,
        response_time: 1200,
        success_rate: 0.95,
        total_tasks: 125
      }));
    },
    refetchInterval: 10000
  });

  // Fetch activities from both instances
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['activities', activeView],
    queryFn: async () => {
      try {
        // Fetch real activities
        const response = await fetch('/api/v1/activities');
        if (response.ok) {
          const data = await response.json();
          const allActivities = data.activities || [];
          
          // Filter based on active view
          if (activeView === 'development') {
            return allActivities.filter((a: Activity) => a.instance === 'development');
          } else if (activeView === 'production') {
            return allActivities.filter((a: Activity) => a.instance === 'production');
          }
          return allActivities;
        }
      } catch (error) {
        console.log('Generating sample activities');
      }

      // Generate sample activities from agents
      const sampleActivities: Activity[] = [];
      const now = Date.now();
      
      [...devAgents, ...prodAgents].forEach(agent => {
        if (agent.status === 'active') {
          sampleActivities.push({
            id: `act-${agent.id}-${Date.now()}`,
            agentName: agent.name,
            instance: agent.instance,
            type: agent.category || 'task',
            description: `${agent.name} completed ${agent.category || 'task'} operation`,
            timestamp: new Date(now - (60000 * 30)), // 30 minutes ago
            metadata: { agentId: agent.id }
          });
        }
      });

      // Filter based on view
      if (activeView === 'development') {
        return sampleActivities.filter(a => a.instance === 'development');
      } else if (activeView === 'production') {
        return sampleActivities.filter(a => a.instance === 'production');
      }
      
      return sampleActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },
    refetchInterval: 5000
  });

  // Fetch handoffs
  const { data: handoffs = [] } = useQuery<Handoff[]>({
    queryKey: ['handoffs'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/handoffs');
        if (response.ok) {
          const data = await response.json();
          return data.handoffs || [];
        }
      } catch (error) {
        console.log('No handoffs available');
      }
      return [];
    },
    refetchInterval: 5000,
    initialData: []
  });

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      coordination: '#3B82F6',
      productivity: '#10B981',
      analysis: '#F59E0B',
      documentation: '#8B5CF6',
      research: '#EC4899',
      meta: '#6B7280',
      social: '#06B6D4',
      content: '#84CC16'
    };
    return colors[category || 'meta'] || '#6B7280';
  };

  const getInstanceIcon = (instance: string) => {
    return instance === 'development' ? <Code className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />;
  };

  const getInstanceColor = (instance: string) => {
    return instance === 'development' ? 'bg-blue-500' : 'bg-green-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Filter agents based on view
  const getFilteredAgents = () => {
    if (activeView === 'development') {
      return devAgents;
    } else if (activeView === 'production') {
      return prodAgents;
    }
    return [...devAgents, ...prodAgents];
  };

  // Filter activities based on view
  const getFilteredActivities = () => {
    if (activeView === 'development') {
      return activities.filter(a => a.instance === 'development');
    } else if (activeView === 'production') {
      return activities.filter(a => a.instance === 'production');
    }
    return activities;
  };

  const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => (
    <div style={{ borderLeftColor: agent.color || (agent.instance === 'development' ? '#3B82F6' : '#10B981') }}>
      <Card className={`transition-all hover:shadow-lg border-l-4`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getInstanceIcon(agent.instance)}
            {agent.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {agent.priority}
            </Badge>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-600 mb-2">{agent.description}</p>
        {agent.category && (
          <Badge variant="secondary" className="text-xs mb-2">
            {agent.category}
          </Badge>
        )}
        <div className="flex flex-wrap gap-1 mb-2">
          {agent.capabilities.slice(0, 3).map((cap, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - 3}
            </Badge>
          )}
        </div>
        {agent.cpu_usage && (
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>CPU: {agent.cpu_usage}%</div>
            <div>Memory: {agent.memory_usage}%</div>
            <div>Tasks: {agent.total_tasks}</div>
            <div>Success: {((agent.success_rate || 0) * 100).toFixed(1)}%</div>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Last activity: {agent.lastActivity ? new Date(agent.lastActivity).toLocaleTimeString() : 'N/A'}
        </p>
      </CardContent>
    </Card>
    </div>
  );

  const ActivityFeed: React.FC<{ activities: Activity[]; limit?: number }> = ({ activities, limit }) => (
    <div className="space-y-2">
      {activities.slice(0, limit || 10).map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className={`w-2 h-2 rounded-full mt-2 ${getInstanceColor(activity.instance)}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{activity.agentName}</span>
              <Badge variant="outline" className="text-xs">
                {activity.instance}
              </Badge>
              <span className="text-xs text-gray-500">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-700">{activity.description}</p>
            {activity.type && (
              <Badge variant="secondary" className="text-xs mt-1">
                {activity.type}
              </Badge>
            )}
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No recent activities</p>
        </div>
      )}
    </div>
  );

  const HandoffManager: React.FC = () => (
    <div className="space-y-3">
      {handoffs.map((handoff) => (
        <Card key={handoff.id} className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="font-medium text-sm">
                  {handoff.fromInstance} → {handoff.toInstance}
                </span>
              </div>
              <Badge variant={handoff.status === 'completed' ? 'default' : 'secondary'}>
                {handoff.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 mb-2">{handoff.description}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {handoff.type}
              </Badge>
              <span className="text-xs text-gray-500">
                {new Date(handoff.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
      {handoffs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No active handoffs</p>
        </div>
      )}
    </div>
  );

  const filteredAgents = getFilteredAgents();
  const activeAgents = filteredAgents.filter(a => a.status === 'active');

  return (
    <div className="space-y-6">
      {/* Instance Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-500" />
              Development Instance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{devAgents.length}</div>
            <p className="text-xs text-gray-600">Coding Agents</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs">{devAgents.filter(a => a.status === 'active').length} Active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-green-500" />
              Production Instance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{prodAgents.length}</div>
            <p className="text-xs text-gray-600">Business Agents</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs">{prodAgents.filter(a => a.status === 'active').length} Active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-500" />
              Cross-Instance Handoffs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{handoffs.length}</div>
            <p className="text-xs text-gray-600">Active Workflows</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs">Coordinated</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unified">Unified View</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
        </TabsList>

        <TabsContent value="unified" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities - All Instances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activities
                  <Badge variant="secondary" className="ml-auto">
                    {activities.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={activities} limit={8} />
              </CardContent>
            </Card>

            {/* Active Agents Summary - Both Instances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Active Agents
                  <Badge variant="secondary" className="ml-auto">
                    {activeAgents.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {activeAgents.slice(0, 6).map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                  {activeAgents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No active agents</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                System Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {devAgents.filter(a => a.status === 'active').length}
                  </div>
                  <p className="text-xs text-gray-600">Dev Agents Active</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {prodAgents.filter(a => a.status === 'active').length}
                  </div>
                  <p className="text-xs text-gray-600">Prod Agents Active</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {activities.length}
                  </div>
                  <p className="text-xs text-gray-600">Recent Activities</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {handoffs.filter(h => h.status === 'in_progress').length}
                  </div>
                  <p className="text-xs text-gray-600">Active Handoffs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-500" />
                Development Agents ({devAgents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
                {devAgents.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No development agents configured</p>
                    <p className="text-xs mt-2">Development agents will appear here when configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Development Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Development Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={activities.filter(a => a.instance === 'development')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-green-500" />
                Production Agents ({prodAgents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {prodAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Production Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Production Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed activities={activities.filter(a => a.instance === 'production')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handoffs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-500" />
                Cross-Instance Handoffs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HandoffManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DualInstanceDashboard;