import React from 'react';
import { useParams } from 'react-router-dom';

const SimpleAgentProfile: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Simple Agent Profile</h1>
      <p>Agent ID: {agentId}</p>
      <p>This is a minimal test component to check if routing works.</p>
    </div>
  );
};

export default SimpleAgentProfile;