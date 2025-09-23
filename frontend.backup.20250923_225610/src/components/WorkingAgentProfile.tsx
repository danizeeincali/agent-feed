import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Bot, 
  Activity,
  TrendingUp,
  Brain,
  FileText,
  Settings,
  Plus,
  Eye
} from 'lucide-react';
import RealDynamicPagesTab from './RealDynamicPagesTab';
import PageManager from './PageManager';

interface AgentData {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status: string;
  capabilities?: string[];
}

const WorkingAgentProfile: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'activities' | 'performance' | 'capabilities'>('overview');

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!agentId) return;

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/agents');
        const data = await response.json();
        
        if (data.success && data.agents) {
          const agent = data.agents.find((a: any) => a.id === agentId);
          if (agent) {
            setAgentData(agent);
          } else {
            setError(`Agent "${agentId}" not found`);
          }
        } else {
          setError('Failed to load agent data');
        }
      } catch (err) {
        setError('Error loading agent profile');
        console.error('Error fetching agent:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agentData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/agents')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Agent Not Found</h2>
          <p className="text-gray-500">{error || `Agent "${agentId}" not found`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/agents')}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {agentData.display_name || agentData.name}
              </h1>
              <p className="text-gray-600">{agentData.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  agentData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {agentData.status}
                </span>
                <span className="text-xs text-gray-500">ID: {agentData.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'pages', name: 'Dynamic Pages', icon: FileText },
            { id: 'activities', name: 'Activities', icon: Activity },
            { id: 'performance', name: 'Performance', icon: TrendingUp },
            { id: 'capabilities', name: 'Capabilities', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="text-gray-600 mt-1">{agentData.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Status</h4>
                <p className="text-gray-600 mt-1 capitalize">{agentData.status}</p>
              </div>
              
              {agentData.capabilities && agentData.capabilities.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900">Capabilities</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agentData.capabilities.map((capability, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-800 border border-blue-200"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

{activeTab === 'pages' && (
          <RealDynamicPagesTab agentId={agentId!} />
        )}

        {activeTab === 'activities' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
            <div className="text-center py-8 text-gray-500">
              <Activity className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No recent activities to display</p>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>Performance metrics will be available once agent is active</p>
            </div>
          </div>
        )}

        {activeTab === 'capabilities' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Capabilities & Skills</h3>
            {agentData.capabilities && agentData.capabilities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agentData.capabilities.map((capability, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{capability}</h4>
                    <p className="text-sm text-gray-600">
                      {capability} functionality for agent operations
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No capabilities information available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingAgentProfile;