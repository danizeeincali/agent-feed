import React, { useState, useEffect } from 'react';

// Simple, working Agents page that directly fetches and displays agents
export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/agents');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats
      const agentsList = data.agents || data.data || [];
      setAgents(agentsList);
      setError(null);
    } catch (err) {
      console.error('Error fetching agents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>Agent Dashboard</h1>
        <p>Loading agents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <h1>Agent Dashboard</h1>
        <div style={{ color: 'red' }}>Error: {error}</div>
        <button onClick={fetchAgents} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Agent Dashboard</h1>

      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <strong>Total Agents: {agents.length}</strong>
      </div>

      {agents.length === 0 ? (
        <p>No agents found</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {agents.map((agent) => (
            <div
              key={agent.id || agent.name}
              style={{
                padding: '1rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: agent.avatar_color || '#4338ca',
                    marginRight: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {(agent.name || agent.display_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{agent.display_name || agent.name}</h3>
                  <span style={{
                    fontSize: '0.875rem',
                    color: agent.status === 'active' ? 'green' : 'gray'
                  }}>
                    {agent.status || 'unknown'}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.875rem', color: '#666', margin: '0.5rem 0' }}>
                {agent.description || 'No description available'}
              </p>

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong style={{ fontSize: '0.75rem' }}>Capabilities:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {agent.capabilities.slice(0, 3).map((cap, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.125rem 0.5rem',
                          background: '#e5e7eb',
                          borderRadius: '4px'
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>
                        +{agent.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}