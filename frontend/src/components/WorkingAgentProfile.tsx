import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Bot,
  FileText,
  Code
} from 'lucide-react';
import RealDynamicPagesTab from './RealDynamicPagesTab';
import { getToolDescription } from '../constants/toolDescriptions';

interface AgentData {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  status: string;
  capabilities?: string[];
  tools?: string[];
}

const WorkingAgentProfile: React.FC = () => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const navigate = useNavigate();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages'>('overview');

  useEffect(() => {
    const fetchAgentData = async () => {
      // UPDATED: Use agentSlug directly for API call - backend accepts slugs
      if (!agentSlug) return;

      try {
        setLoading(true);
        setError(null);

        // API endpoint accepts slugs: /api/agents/:slug
        const response = await fetch(`/api/agents/${agentSlug}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError(`Agent "${agentSlug}" not found`);
          } else {
            setError('Failed to load agent data');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success && data.data) {
          setAgentData(data.data);
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
  }, [agentSlug]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
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
          <User className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Agent Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400">{error || `Agent "${agentSlug}" not found`}</p>
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
            className="p-2 text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {agentData.display_name || agentData.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{agentData.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  agentData.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                }`}>
                  {agentData.status}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">ID: {agentData.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: User },
            { id: 'pages', name: 'Dynamic Pages', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
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
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agent Information</h3>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Description</h4>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{agentData.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Status</h4>
                <p className="text-gray-600 dark:text-gray-400 mt-1 capitalize">{agentData.status}</p>
              </div>

              {/* Tools Section */}
              {agentData.tools && agentData.tools.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Available Tools</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {agentData.tools.map((tool, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                        <div className="flex items-start gap-2">
                          <Code className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1">{tool}</h5>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {getToolDescription(tool)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {agentData.capabilities && agentData.capabilities.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Capabilities</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agentData.capabilities.map((capability, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                      >
                        {capability}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Agent ID</h4>
                <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono text-sm">{agentData.id}</p>
              </div>
            </div>
          </div>
        )}

        {/* CRITICAL FIX: Pass agent NAME for pages tab - dynamic pages are stored with agent name as key, not numeric ID */}
        {activeTab === 'pages' && (
          <RealDynamicPagesTab agentId={agentData?.name || agentSlug!} />
        )}
      </div>
    </div>
  );
};

export default WorkingAgentProfile;