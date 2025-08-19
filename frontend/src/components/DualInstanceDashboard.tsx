import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Activity, Code, Briefcase, ArrowRightLeft, AlertCircle } from 'lucide-react';

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

const DualInstanceDashboard: React.FC = () => {
  const [devAgents, setDevAgents] = useState<Agent[]>([]);
  const [prodAgents, setProdAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [activeView, setActiveView] = useState<'unified' | 'development' | 'production'>('unified');

  useEffect(() => {
    fetchAgentData();
    fetchActivities();
    fetchHandoffs();
    
    // Setup real-time updates
    const interval = setInterval(() => {
      fetchActivities();
      fetchHandoffs();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAgentData = async () => {
    try {
      // Fetch development agents (using demo endpoints for now)
      const devResponse = await fetch('/api/v1/demo/dev/agents');
      if (devResponse.ok) {
        const devData = await devResponse.json();
        setDevAgents(devData.agents || []);
      }

      // Fetch production agents (using demo endpoints for now)
      const prodResponse = await fetch('/api/v1/demo/prod/agents');
      if (prodResponse.ok) {
        const prodData = await prodResponse.json();
        setProdAgents(prodData.agents || []);
      }
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      // Use demo endpoint for combined activities
      const response = await fetch('/api/v1/demo/activities');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const fetchHandoffs = async () => {
    try {
      const response = await fetch('/api/v1/demo/handoff/status');
      if (response.ok) {
        const data = await response.json();
        setHandoffs(data.handoffs || []);
      }
    } catch (error) {
      console.error('Failed to fetch handoffs:', error);
    }
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

  const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => (
    <Card className={`transition-all hover:shadow-lg border-l-4 ${
      agent.instance === 'development' ? 'border-l-blue-500' : 'border-l-green-500'
    }`}>
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
        <div className="flex flex-wrap gap-1 mb-2">
          {agent.capabilities.slice(0, 3).map((cap, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {cap}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - 3}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Last activity: {agent.lastActivity ? new Date(agent.lastActivity).toLocaleTimeString() : 'N/A'}
        </p>
      </CardContent>
    </Card>
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
              <span className="text-xs">Port 8080-8089</span>
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
              <span className="text-xs">Port 8090-8119</span>
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
            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={activities} limit={8} />
              </CardContent>
            </Card>

            {/* Active Agents Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {[...devAgents.slice(0, 3), ...prodAgents.slice(0, 3)].map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
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
              </div>
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