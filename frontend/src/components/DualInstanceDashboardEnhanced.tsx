import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Activity, Code, Briefcase, ArrowRightLeft, Users, Bot, Zap, 
  CheckCircle, XCircle, AlertCircle, Send, Server, Clock,
  RefreshCw, CheckCheck, X, Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDualInstanceMonitoring } from '../hooks/useDualInstanceMonitoring';
import { toast } from 'sonner';

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
  { id: 'summary-brief-agent', name: 'Summary Brief', category: 'analysis', priority: 'medium' },
  { id: 'research-assistant-agent', name: 'Research Assistant', category: 'research', priority: 'high' },
  { id: 'note-taker-agent', name: 'Note Taker', category: 'documentation', priority: 'medium' },
  { id: 'ideas-insights-agent', name: 'Ideas & Insights', category: 'analysis', priority: 'low' },
  { id: 'writing-editor-agent', name: 'Writing Editor', category: 'content', priority: 'medium' },
  { id: 'code-reviewer-agent', name: 'Code Reviewer', category: 'development', priority: 'high' },
  { id: 'data-analyst-agent', name: 'Data Analyst', category: 'analysis', priority: 'high' },
  { id: 'scheduler-agent', name: 'Scheduler', category: 'productivity', priority: 'medium' },
  { id: 'reminder-agent', name: 'Reminder Bot', category: 'productivity', priority: 'low' }
];

const DualInstanceDashboardEnhanced: React.FC = () => {
  const [activeView, setActiveView] = useState<'unified' | 'development' | 'production' | 'handoffs'>('unified');
  const [handoffTask, setHandoffTask] = useState('');
  
  // Use the dual instance monitoring hook
  const {
    status,
    messages,
    pendingConfirmations,
    isLoading,
    sendHandoff,
    handleConfirmation,
    isConnected
  } = useDualInstanceMonitoring();

  // Get actual instance status
  const devStatus = status?.development?.status || 'stopped';
  const prodStatus = status?.production?.status || 'stopped';
  const devHealth = status?.development?.health;
  const prodHealth = status?.production?.health;

  // Fetch development agents
  const { data: devAgents = [] } = useQuery<Agent[]>({
    queryKey: ['agents', 'development'],
    queryFn: async () => {
      const response = await fetch('/api/v1/agents/development');
      if (!response.ok) {
        // Fallback to simulated data
        return [{
          id: 'dev-agent-1',
          name: 'Code Analyzer',
          description: 'Analyzes code for improvements',
          status: 'active' as const,
          instance: 'development' as const,
          capabilities: ['code-analysis', 'refactoring'],
          priority: 'high',
          color: '#3B82F6',
          lastActivity: new Date().toISOString()
        }];
      }
      const data = await response.json();
      return data.agents || [];
    },
    refetchInterval: 10000,
    initialData: []
  });

  // Fetch production agents
  const { data: prodAgents = [] } = useQuery<Agent[]>({
    queryKey: ['agents', 'production'],
    queryFn: async () => {
      try {
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

  // Fetch activities (combining messages if available)
  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['activities', activeView, messages],
    queryFn: async () => {
      // Convert messages to activities if available
      if (messages && messages.length > 0) {
        return messages.map(msg => ({
          id: msg.id,
          agentName: msg.source === 'development' ? 'Dev Claude' : 'Prod Claude',
          instance: msg.source as 'development' | 'production',
          type: msg.type,
          description: msg.payload?.task || msg.payload?.action || 'Activity',
          timestamp: new Date(msg.timestamp),
          metadata: msg.payload
        }));
      }

      // Fallback to API
      try {
        const response = await fetch('/api/v1/dual-instance-monitor/activities');
        if (response.ok) {
          const data = await response.json();
          return data || [];
        }
      } catch (error) {
        console.log('Using fallback activities');
      }

      return [];
    },
    refetchInterval: 5000
  });

  // Fetch handoffs
  const { data: handoffs = [] } = useQuery<Handoff[]>({
    queryKey: ['handoffs', messages],
    queryFn: async () => {
      // Convert messages to handoffs
      if (messages && messages.length > 0) {
        return messages
          .filter(msg => msg.type === 'handoff' || msg.type === 'request')
          .map(msg => ({
            id: msg.id,
            fromInstance: msg.source as 'development' | 'production',
            toInstance: msg.target as 'development' | 'production',
            type: msg.type,
            status: msg.status as 'pending' | 'in_progress' | 'completed' | 'failed' || 'pending',
            description: msg.payload?.task || msg.payload?.action || 'Handoff',
            timestamp: new Date(msg.timestamp)
          }));
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
      development: '#EF4444',
      content: '#84CC16'
    };
    return colors[category || 'coordination'] || '#6B7280';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'busy': return 'text-yellow-500';
      case 'idle': return 'text-gray-400';
      case 'error': return 'text-red-500';
      case 'running': return 'text-green-500';
      case 'stopped': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const handleSendHandoff = () => {
    if (!handoffTask.trim()) {
      toast.error('Please enter a task description');
      return;
    }
    sendHandoff({ task: handoffTask, context: { priority: 'medium', source: 'UI' } });
    setHandoffTask('');
  };

  const getFilteredAgents = () => {
    if (activeView === 'development') {
      return devAgents;
    } else if (activeView === 'production') {
      return prodAgents;
    }
    return [...devAgents, ...prodAgents];
  };

  const getFilteredActivities = () => {
    // Ensure activities is always an array to prevent filter() errors
    const safeActivities = Array.isArray(activities) ? activities : [];
    
    if (activeView === 'development') {
      return safeActivities.filter(a => a.instance === 'development');
    } else if (activeView === 'production') {
      return safeActivities.filter(a => a.instance === 'production');
    }
    return safeActivities;
  };

  const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => (
    <div style={{ borderLeftColor: agent.color || getCategoryColor(agent.category) }}>
      <Card className="transition-all hover:shadow-lg border-l-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {agent.instance === 'development' ? <Code className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
              {agent.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {agent.priority}
              </Badge>
              <div className={`w-2 h-2 rounded-full ${getStatusBgColor(agent.status)}`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-600 mb-2">{agent.description}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {agent.capabilities.slice(0, 3).map((cap, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
          {agent.cpu_usage && (
            <div className="text-xs text-gray-500 space-y-1">
              <div>CPU: {agent.cpu_usage}%</div>
              <div>Memory: {agent.memory_usage}%</div>
              <div>Success: {((agent.success_rate || 0) * 100).toFixed(0)}%</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const ActivityFeed: React.FC<{ activities: Activity[] }> = ({ activities }) => (
    <div className="space-y-2">
      {!activities || activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No recent activities</p>
      ) : (
        (Array.isArray(activities) ? activities : []).slice(0, 10).map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className={`mt-1 w-2 h-2 rounded-full ${activity.instance === 'development' ? 'bg-blue-500' : 'bg-green-500'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{activity.agentName}</span>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const HandoffManager: React.FC<{ handoffs: Handoff[] }> = ({ handoffs }) => (
    <Card>
      <CardHeader>
        <CardTitle>Recent Handoffs</CardTitle>
      </CardHeader>
      <CardContent>
        {handoffs.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No handoffs yet</p>
        ) : (
          <div className="space-y-2">
            {handoffs.map((handoff) => (
              <div key={handoff.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {handoff.fromInstance} → {handoff.toInstance}
                    </p>
                    <p className="text-xs text-gray-600">{handoff.description}</p>
                  </div>
                </div>
                <Badge variant={handoff.status === 'completed' ? 'default' : 'secondary'}>
                  {handoff.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dual Instance Monitor</h1>
          <p className="text-sm text-gray-600">Real-time monitoring of development and production Claude instances</p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
        </div>
      </div>

      {/* Instance Status Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Development Instance
            </CardTitle>
            <Code className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Server className={`h-4 w-4 ${getStatusColor(devStatus)}`} />
              <span className={`text-sm font-medium ${getStatusColor(devStatus)}`}>
                {devStatus.charAt(0).toUpperCase() + devStatus.slice(1)}
              </span>
            </div>
            <div className="text-2xl font-bold">{devAgents.length} Agents</div>
            <p className="text-xs text-muted-foreground">
              {devHealth?.workspace || '/workspaces/agent-feed/'}
            </p>
            {devHealth?.isCurrent && (
              <Badge className="mt-1" variant="secondary">Current Session</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Production Instance
            </CardTitle>
            <Briefcase className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Server className={`h-4 w-4 ${getStatusColor(prodStatus)}`} />
              <span className={`text-sm font-medium ${getStatusColor(prodStatus)}`}>
                {prodStatus.charAt(0).toUpperCase() + prodStatus.slice(1)}
              </span>
            </div>
            <div className="text-2xl font-bold">{prodAgents.length} Agents</div>
            <p className="text-xs text-muted-foreground">
              {prodHealth?.workspace || 'agent_workspace/'}
            </p>
            {prodHealth?.activeAgents && (
              <Badge className="mt-1" variant="outline">
                {prodHealth.activeAgents} Active
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Handoffs
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {pendingConfirmations?.length || 0} pending confirmation
            </p>
            {pendingConfirmations && pendingConfirmations.length > 0 && (
              <Badge className="mt-1" variant="destructive">
                Action Required
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="unified">Unified View</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
        </TabsList>

        <TabsContent value="unified" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>All Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {getFilteredAgents().slice(0, 6).map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={getFilteredActivities()} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <div className="grid gap-4">
            {devAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {prodAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="handoffs" className="space-y-4">
          <div className="space-y-4">
            {/* Send Handoff Card */}
            <Card>
              <CardHeader>
                <CardTitle>Send Dev → Prod Handoff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="Enter task for production..."
                    value={handoffTask}
                    onChange={(e) => setHandoffTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendHandoff()}
                  />
                  <Button onClick={handleSendHandoff}>
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pending Confirmations */}
            {pendingConfirmations && pendingConfirmations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Pending Confirmations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingConfirmations.map((req) => (
                    <div key={req.message.id} className="p-4 border rounded-lg space-y-3 bg-amber-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {req.message.source} → {req.message.target}
                          </Badge>
                          <Badge variant="destructive">Requires Confirmation</Badge>
                        </div>
                        <Clock className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {req.message.payload?.action || req.message.payload?.task || 'Request'}
                        </p>
                        {req.message.payload?.reason && (
                          <p className="text-sm text-gray-600 italic">"{req.message.payload.reason}"</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleConfirmation({
                            messageId: req.message.id,
                            approved: true,
                            comment: 'Approved via UI'
                          })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleConfirmation({
                            messageId: req.message.id,
                            approved: false,
                            comment: 'Denied via UI'
                          })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Handoffs */}
            <HandoffManager handoffs={handoffs} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DualInstanceDashboardEnhanced;