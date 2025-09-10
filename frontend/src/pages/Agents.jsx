/**
 * Agents Page - Simplified version that works with production agents
 */
import React, { useState, useEffect } from 'react';
import './Agents.css';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/agents');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAgents(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setError(err.message);
        // Fallback to mock data for development
        setAgents([
          {
            id: 'personal-todos',
            name: 'Personal Todos Agent',
            status: 'active',
            priority: 'P0',
            description: 'Task management with Fibonacci priority system',
            type: 'user_facing'
          },
          {
            id: 'meeting-prep',
            name: 'Meeting Prep Agent',
            status: 'active',
            priority: 'P1',
            description: 'Meeting preparation and agenda creation',
            type: 'user_facing'
          },
          {
            id: 'get-to-know-you',
            name: 'Get To Know You Agent',
            status: 'active',
            priority: 'P0',
            description: 'User onboarding and personalization',
            type: 'user_facing'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="agents-page">
        <div className="agents-container">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Loading production agents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agents-page">
      <div className="agents-container">
        <header className="agents-header">
          <div>
            <h1 className="agents-title">Production Agents</h1>
            <p className="agents-subtitle">
              {agents.length} agents discovered from /prod/.claude/agents/
            </p>
          </div>
        </header>

        {error && (
          <div className="agents-error">
            <p><strong>Warning:</strong> Could not connect to agent API</p>
            <p>Using fallback data. Error: {error}</p>
          </div>
        )}

        <div className="agents-content">
          <div className="agents-main">
            {agents.length === 0 ? (
              <div className="agents-empty">
                <p>No agents found</p>
                <p>Make sure agents are configured in /prod/.claude/agents/</p>
              </div>
            ) : (
              <div className="agents-grid" data-testid="agent-list" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AgentCard = ({ agent }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'idle': return '#6b7280';
      case 'offline': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'P0': return '#ef4444';
      case 'P1': return '#f59e0b';
      case 'P2': return '#10b981';
      case 'P3': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <div className="agent-card" data-testid="agent-card" style={{
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      <div className="agent-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {agent.name || agent.id}
        </h3>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          {agent.status && (
            <span style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500',
              backgroundColor: getStatusColor(agent.status) + '20',
              color: getStatusColor(agent.status),
              border: `1px solid ${getStatusColor(agent.status)}40`
            }}>
              {agent.status}
            </span>
          )}
          {agent.priority && (
            <span style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '500',
              backgroundColor: getPriorityColor(agent.priority) + '20',
              color: getPriorityColor(agent.priority),
              border: `1px solid ${getPriorityColor(agent.priority)}40`
            }}>
              {agent.priority}
            </span>
          )}
        </div>
      </div>
      
      <p style={{
        margin: 0,
        color: '#6b7280',
        fontSize: '0.875rem',
        lineHeight: '1.5'
      }}>
        {agent.description || 'No description available'}
      </p>

      {agent.type && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)'
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            fontWeight: '500'
          }}>
            Type: {agent.type === 'user_facing' ? 'User-Facing' : 'System Agent'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Agents;